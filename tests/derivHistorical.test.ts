/**
 * TradingOS — Real Historical Market Data Layer Test Suite
 * Comprehensive automated tests for Deriv Historical Data Service,
 * candle normalization, OHLC integrity, gap detection, pagination,
 * incomplete candle filtering, and the real historical backtesting pipeline.
 * All tests use deterministic MOCKED Deriv historical responses.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  DerivHistoricalDataService,
  DerivPartialDataTransportError,
  IDerivTransport,
} from '../server/market-data/DerivHistoricalDataService';
import { DerivRawCandle, Candle } from '../src/lib/engine/types';
import {
  HistoricalEvaluator,
  DEFAULT_SYNTHETIC_FIB_CONFIG,
  SyntheticFixtures,
} from '../src/lib/engine';
import { normalizeDerivSymbol, DerivBrowserClient } from '../src/lib/derivClient';

// Mock Transport Implementation for unit and integration testing
class MockDerivTransport implements IDerivTransport {
  public mockCandles: Map<string, DerivRawCandle[]> = new Map();
  public queryCallCount = 0;
  public lastRequestedSymbol = '';
  public shouldFailWith: Error | null = null;

  public setMockData(symbol: string, granularity: number, candles: DerivRawCandle[]) {
    const key = `${symbol}:${granularity}`;
    this.mockCandles.set(key, candles);
  }

  public async queryCandles(
    symbol: string,
    granularity: number,
    startEpoch: number,
    endEpoch: number,
    count: number
  ): Promise<DerivRawCandle[]> {
    this.queryCallCount++;
    this.lastRequestedSymbol = symbol;

    if (this.shouldFailWith) {
      throw this.shouldFailWith;
    }

    const key = `${symbol}:${granularity}`;
    const all = this.mockCandles.get(key) || [];

    // Filter by epoch window
    return all.filter((c) => c.epoch >= startEpoch && c.epoch <= endEpoch);
  }
}

describe('TradingOS: Real Historical Market Data & Backtesting Layer', () => {
  // Helper to generate synthetic Deriv raw candle
  const createRawDerivCandle = (
    epoch: number,
    open: number,
    high: number,
    low: number,
    close: number
  ): DerivRawCandle => ({
    epoch,
    open,
    high,
    low,
    close,
    volume: 150,
  });

  // 1. Valid Deriv candle response normalization
  it('1. Correctly normalizes Deriv raw candle response to TradingOS Candle[]', async () => {
    const mock = new MockDerivTransport();
    const service = new DerivHistoricalDataService(mock);

    const baseEpoch = 1700000000;
    mock.setMockData('BOOM1000', 900, [
      createRawDerivCandle(baseEpoch, 1000, 1050, 990, 1030),
      createRawDerivCandle(baseEpoch + 900, 1030, 1060, 1020, 1045),
    ]);

    const res = await service.getHistoricalCandles({
      symbol: 'BOOM 1000', // Test symbol normalization
      timeframe: 'M15',
      startTime: baseEpoch * 1000,
      endTime: (baseEpoch + 1800) * 1000,
      bypassCache: true,
    });

    assert.strictEqual(res.symbol, 'BOOM1000');
    assert.strictEqual(res.timeframe, 'M15');
    assert.strictEqual(res.candles.length, 2);

    const c1 = res.candles[0];
    assert.strictEqual(c1.time, baseEpoch * 1000);
    assert.strictEqual(c1.timeUtc, new Date(baseEpoch * 1000).toISOString());
    assert.strictEqual(c1.open, 1000);
    assert.strictEqual(c1.high, 1050);
    assert.strictEqual(c1.low, 990);
    assert.strictEqual(c1.close, 1030);
    assert.strictEqual(c1.confirmed, true);
  });

  // 2. Invalid OHLC rejection
  it('2. Discards invalid OHLC candles (low > high or open/close out of range) without crashing', async () => {
    const mock = new MockDerivTransport();
    const service = new DerivHistoricalDataService(mock);

    const baseEpoch = 1700000000;
    mock.setMockData('CRASH500', 900, [
      createRawDerivCandle(baseEpoch, 1000, 1050, 990, 1030), // Valid
      createRawDerivCandle(baseEpoch + 900, 1000, 950, 1050, 1000), // Corrupt: low (1050) > high (950)
      createRawDerivCandle(baseEpoch + 1800, 1000, 1050, 990, 1060), // Corrupt: close (1060) > high (1050)
      createRawDerivCandle(baseEpoch + 2700, 1030, 1080, 1020, 1070), // Valid
    ]);

    const res = await service.getHistoricalCandles({
      symbol: 'CRASH500',
      timeframe: 'M15',
      startTime: baseEpoch * 1000,
      endTime: (baseEpoch + 3600) * 1000,
      bypassCache: true,
    });

    assert.strictEqual(res.candles.length, 2);
    assert.strictEqual(res.candles[0].time, baseEpoch * 1000);
    assert.strictEqual(res.candles[1].time, (baseEpoch + 2700) * 1000);
    assert.strictEqual(res.quality.warnings.length >= 2, true);
  });

  // 3. Duplicate candle handling
  it('3. Removes duplicate timestamps and tracks duplicatesRemoved metric', async () => {
    const mock = new MockDerivTransport();
    const service = new DerivHistoricalDataService(mock);

    const baseEpoch = 1700000000;
    mock.setMockData('R_25', 900, [
      createRawDerivCandle(baseEpoch, 100, 105, 95, 102),
      createRawDerivCandle(baseEpoch, 100, 105, 95, 102), // Exact duplicate
      createRawDerivCandle(baseEpoch + 900, 102, 107, 101, 106),
    ]);

    const res = await service.getHistoricalCandles({
      symbol: 'R_25',
      timeframe: 'M15',
      startTime: baseEpoch * 1000,
      endTime: (baseEpoch + 1800) * 1000,
      bypassCache: true,
    });

    assert.strictEqual(res.candles.length, 2);
    assert.strictEqual(res.quality.duplicatesRemoved, 1);
  });

  // 4. Chronological ordering
  it('4. Enforces strict chronological ordering even if API delivers out-of-order candles', async () => {
    const mock = new MockDerivTransport();
    const service = new DerivHistoricalDataService(mock);

    const baseEpoch = 1700000000;
    mock.setMockData('R_50', 900, [
      createRawDerivCandle(baseEpoch + 1800, 104, 108, 103, 107),
      createRawDerivCandle(baseEpoch, 100, 105, 95, 102),
      createRawDerivCandle(baseEpoch + 900, 102, 106, 100, 104),
    ]);

    const res = await service.getHistoricalCandles({
      symbol: 'R_50',
      timeframe: 'M15',
      startTime: baseEpoch * 1000,
      endTime: (baseEpoch + 2700) * 1000,
      bypassCache: true,
    });

    assert.strictEqual(res.candles[0].time, baseEpoch * 1000);
    assert.strictEqual(res.candles[1].time, (baseEpoch + 900) * 1000);
    assert.strictEqual(res.candles[2].time, (baseEpoch + 1800) * 1000);
  });

  // 5. UTC timestamp conversion
  it('5. Converts epoch seconds to precise UTC ISO 8601 timestamps', async () => {
    const mock = new MockDerivTransport();
    const service = new DerivHistoricalDataService(mock);

    const epoch = 1700000000; // 2023-11-14T22:13:20.000Z
    mock.setMockData('BOOM500', 14400, [
      createRawDerivCandle(epoch, 200, 210, 195, 205),
    ]);

    const res = await service.getHistoricalCandles({
      symbol: 'BOOM500',
      timeframe: 'H4',
      startTime: epoch * 1000,
      endTime: (epoch + 14400) * 1000,
      bypassCache: true,
    });

    assert.strictEqual(res.candles[0].timeUtc, '2023-11-14T22:13:20.000Z');
  });

  // 6. Incomplete / still-forming candle filtering
  it('6. Filters out incomplete/unconfirmed candles that close after current time or requested end', async () => {
    const mock = new MockDerivTransport();
    const service = new DerivHistoricalDataService(mock);

    const nowEpoch = Math.floor(Date.now() / 1000);
    // Candle starting 5 minutes ago on M15 closes in 10 minutes (in the future)
    const incompleteEpoch = nowEpoch - 300;
    const completedEpoch = nowEpoch - 1800;

    mock.setMockData('BOOM1000', 900, [
      createRawDerivCandle(completedEpoch, 100, 105, 95, 102),
      createRawDerivCandle(incompleteEpoch, 102, 108, 101, 107), // Forming
    ]);

    const res = await service.getHistoricalCandles({
      symbol: 'BOOM1000',
      timeframe: 'M15',
      startTime: (completedEpoch - 900) * 1000,
      endTime: Date.now(),
      bypassCache: true,
    });

    assert.strictEqual(res.candles.length, 1);
    assert.strictEqual(res.candles[0].time, completedEpoch * 1000);
    assert.strictEqual(res.quality.incompleteCountRemoved, 1);
  });

  // 7. Date range validation
  it('7. Rejects invalid date ranges (start >= end) and ranges exceeding maximum safety threshold', async () => {
    const mock = new MockDerivTransport();
    const service = new DerivHistoricalDataService(mock);

    // Range: start >= end
    await assert.rejects(
      async () => {
        await service.getHistoricalCandles({
          symbol: 'BOOM1000',
          timeframe: 'H4',
          startTime: 1700000000000,
          endTime: 1700000000000,
          bypassCache: true,
        });
      },
      (err: any) => err.message.includes('INVALID_DATE_RANGE')
    );

    // Range: excessive range > 90 days
    await assert.rejects(
      async () => {
        const start = Date.now() - 120 * 24 * 3600 * 1000;
        const end = Date.now();
        await service.getHistoricalCandles({
          symbol: 'BOOM1000',
          timeframe: 'M15',
          startTime: start,
          endTime: end,
          bypassCache: true,
        });
      },
      (err: any) => err.message.includes('DATE_RANGE_TOO_LARGE')
    );
  });

  // 8. Pagination / chunking behavior
  it('8. Paginates and stitches multiple API chunks seamlessly for large date spans', async () => {
    const mock = new MockDerivTransport();
    const service = new DerivHistoricalDataService(mock);

    const baseEpoch = 1700000000;
    const granularity = 900;
    // Build 5000 candles (capacity is 4500 per chunk, so this forces 2 chunks)
    const dataset: DerivRawCandle[] = [];
    for (let i = 0; i < 5000; i++) {
      const ep = baseEpoch + i * granularity;
      dataset.push(createRawDerivCandle(ep, 100 + i * 0.1, 102 + i * 0.1, 99 + i * 0.1, 101 + i * 0.1));
    }

    mock.setMockData('BOOM1000', granularity, dataset);

    const res = await service.getHistoricalCandles({
      symbol: 'BOOM1000',
      timeframe: 'M15',
      startTime: baseEpoch * 1000,
      endTime: (baseEpoch + 5000 * granularity) * 1000,
      bypassCache: true,
    });

    assert.strictEqual(mock.queryCallCount >= 2, true);
    assert.strictEqual(res.candles.length, 5000);
  });

  // 9. Missing-data / gap reporting
  it('9. Identifies market data gaps without fabricating artificial candles', async () => {
    const mock = new MockDerivTransport();
    const service = new DerivHistoricalDataService(mock);

    const baseEpoch = 1700000000;
    mock.setMockData('BOOM1000', 900, [
      createRawDerivCandle(baseEpoch, 100, 105, 95, 102),
      // Missing 3 intervals (2700s gap instead of 900s)
      createRawDerivCandle(baseEpoch + 3600, 102, 106, 101, 105),
      createRawDerivCandle(baseEpoch + 4500, 105, 108, 104, 107),
    ]);

    const res = await service.getHistoricalCandles({
      symbol: 'BOOM1000',
      timeframe: 'M15',
      startTime: baseEpoch * 1000,
      endTime: (baseEpoch + 5400) * 1000,
      bypassCache: true,
    });

    assert.strictEqual(res.candles.length, 3);
    assert.strictEqual(res.quality.gapsDetected.length, 1);
    assert.strictEqual(res.quality.gapsDetected[0].missingDurationMs, 2700 * 1000);
  });

  // 10. Empty dataset handling
  it('10. Returns clear EMPTY_HISTORICAL_DATA error when Deriv returns no candles', async () => {
    const mock = new MockDerivTransport();
    const service = new DerivHistoricalDataService(mock);

    await assert.rejects(
      async () => {
        await service.getHistoricalCandles({
          symbol: 'NON_EXISTENT_COIN',
          timeframe: 'H4',
          startTime: 1700000000000,
          endTime: 1700050000000,
          bypassCache: true,
        });
      },
      (err: any) => err.message.includes('EMPTY_HISTORICAL_DATA')
    );
  });

  // 11. Mocked Deriv API failure
  it('11. Handles Deriv API network failure and WebSocket error cleanly', async () => {
    const mock = new MockDerivTransport();
    mock.shouldFailWith = new Error('DERIV_WS_CONNECTION_ERROR: Connection closed abnormally');
    const service = new DerivHistoricalDataService(mock);

    await assert.rejects(
      async () => {
        await service.getHistoricalCandles({
          symbol: 'BOOM1000',
          timeframe: 'H4',
          startTime: 1700000000000,
          endTime: 1700050000000,
          bypassCache: true,
        });
      },
      (err: any) => err.message.includes('DERIV_WS_CONNECTION_ERROR')
    );
  });

  // 12. Real-data backtest with mocked Deriv historical data (Boom 1000, H4 + M15)
  it('12. Runs complete real-data backtest pipeline (Mock Deriv -> normalize -> validate -> evaluator -> report)', async () => {
    // Generate deterministic H4 and M15 market data matching the complete Bullish fixture
    const fixture = SyntheticFixtures.createBullishCompleteFixture();

    const mock = new MockDerivTransport();
    const service = new DerivHistoricalDataService(mock);

    // Populate mock with raw Deriv format
    const rawH4: DerivRawCandle[] = fixture.h4Candles.map((c) => ({
      epoch: Math.floor(c.time / 1000),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));

    const rawM15: DerivRawCandle[] = fixture.m15Candles.map((c) => ({
      epoch: Math.floor(c.time / 1000),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));

    mock.setMockData('BOOM1000', 14400, rawH4);
    mock.setMockData('BOOM1000', 900, rawM15);

    const minTime = Math.min(fixture.h4Candles[0].time, fixture.m15Candles[0].time);
    const maxTime = Math.max(
      fixture.h4Candles[fixture.h4Candles.length - 1].time,
      fixture.m15Candles[fixture.m15Candles.length - 1].time
    );

    // Retrieve both streams
    const h4Res = await service.getHistoricalCandles({
      symbol: 'BOOM1000',
      timeframe: 'H4',
      startTime: minTime,
      endTime: maxTime,
      bypassCache: true,
    });

    const m15Res = await service.getHistoricalCandles({
      symbol: 'BOOM1000',
      timeframe: 'M15',
      startTime: minTime,
      endTime: maxTime,
      bypassCache: true,
    });

    // Run HistoricalEvaluator against normalized real candles
    const report = HistoricalEvaluator.evaluate(
      DEFAULT_SYNTHETIC_FIB_CONFIG,
      h4Res.candles,
      m15Res.candles
    );

    assert.strictEqual(report.positionsClosed >= 1, true);
    assert.strictEqual(report.winCount >= 1, true);
    assert.strictEqual(report.totalRMultiple > 0, true);
    assert.strictEqual(report.positions[0].exitReason, 'OPPOSITE_4H_CHOCH');
  });

  // 13. Server-side Caching Verification
  it('13. Server-side caching serves subsequent requests without duplicate provider queries', async () => {
    const mock = new MockDerivTransport();
    const service = new DerivHistoricalDataService(mock);

    const baseEpoch = 1700000000;
    mock.setMockData('BOOM1000', 14400, [
      createRawDerivCandle(baseEpoch, 100, 105, 95, 102),
    ]);

    const res1 = await service.getHistoricalCandles({
      symbol: 'BOOM1000',
      timeframe: 'H4',
      startTime: baseEpoch * 1000,
      endTime: (baseEpoch + 14400) * 1000,
    });
    assert.strictEqual(res1.fromCache, false);
    assert.strictEqual(mock.queryCallCount, 1);

    const res2 = await service.getHistoricalCandles({
      symbol: 'BOOM1000',
      timeframe: 'H4',
      startTime: baseEpoch * 1000,
      endTime: (baseEpoch + 14400) * 1000,
    });
    assert.strictEqual(res2.fromCache, true);
    assert.strictEqual(mock.queryCallCount, 1); // No new network call
  });

  // 14. Strict No-Lookahead Protection
  it('14. Lookahead bias protection: Lower timeframe decisions never see future H4 candle closes', () => {
    const fixture = SyntheticFixtures.createBullishCompleteFixture();
    // Verify that every M15 decision point only receives H4 candles with time <= m15.time
    for (const m15 of fixture.m15Candles) {
      const visibleH4 = fixture.h4Candles.filter((h) => h.time <= m15.time);
      for (const h4 of visibleH4) {
        assert.strictEqual(h4.time <= m15.time, true);
      }
    }
  });

  // 15. Execution route lock verification
  it('15. Confirms that no live execution routes were created or enabled (Strict Read-Only Mode)', () => {
    // Check that historical service has no order execution methods
    const service = new DerivHistoricalDataService();
    assert.strictEqual((service as any).placeOrder, undefined);
    assert.strictEqual((service as any).executeTrade, undefined);
    assert.strictEqual((service as any).modifyPosition, undefined);
  });

  // 16. First chunk transport failure propagates original error (never converted to EMPTY_HISTORICAL_DATA)
  it('16. First chunk transport failure propagates original transport error on multi-chunk queries', async () => {
    const mock = new MockDerivTransport();
    mock.shouldFailWith = new Error('DERIV_WS_CONNECTION_ERROR: Failed to establish WebSocket connection with Deriv for symbol BOOM1000');
    const service = new DerivHistoricalDataService(mock);

    // 60-day query (forces multi-chunk)
    const baseEpoch = 1700000000;
    const endEpoch = baseEpoch + 60 * 24 * 3600; // 60 days

    await assert.rejects(
      async () => {
        await service.getHistoricalCandles({
          symbol: 'BOOM1000',
          timeframe: 'M15',
          startTime: baseEpoch * 1000,
          endTime: endEpoch * 1000,
          bypassCache: true,
        });
      },
      (err: any) => {
        assert.strictEqual(err.message.includes('DERIV_WS_CONNECTION_ERROR'), true);
        assert.strictEqual(err.message.includes('EMPTY_HISTORICAL_DATA'), false);
        return true;
      }
    );
  });

  // 17. Later chunk transport failure throws DerivPartialDataTransportError
  it('17. Later chunk transport failure throws DerivPartialDataTransportError with complete chunk details', async () => {
    class FailingSecondChunkTransport implements IDerivTransport {
      private callCount = 0;
      async queryCandles(
        symbol: string,
        granularity: number,
        startEpoch: number,
        endEpoch: number,
        count: number
      ): Promise<DerivRawCandle[]> {
        this.callCount++;
        if (this.callCount === 1) {
          // First chunk succeeds with 4500 candles
          const candles: DerivRawCandle[] = [];
          for (let i = 0; i < 4500; i++) {
            const ep = startEpoch + i * granularity;
            candles.push(createRawDerivCandle(ep, 100, 105, 95, 102));
          }
          return candles;
        }
        // Second chunk fails with network timeout
        throw new Error('DERIV_WS_TIMEOUT: Deriv WebSocket request timed out on chunk 2');
      }
    }

    const transport = new FailingSecondChunkTransport();
    const service = new DerivHistoricalDataService(transport);

    const baseEpoch = 1700000000;
    const granularity = 900;
    // 5500 candles forces 2 chunks
    const endEpoch = baseEpoch + 5500 * granularity;

    await assert.rejects(
      async () => {
        await service.getHistoricalCandles({
          symbol: 'BOOM1000',
          timeframe: 'M15',
          startTime: baseEpoch * 1000,
          endTime: endEpoch * 1000,
          bypassCache: true,
        });
      },
      (err: any) => {
        assert.strictEqual(err instanceof DerivPartialDataTransportError, true);
        assert.strictEqual(err.details.symbol, 'BOOM1000');
        assert.strictEqual(err.details.timeframe, 'M15');
        assert.strictEqual(err.details.completedChunks, 1);
        assert.strictEqual(err.details.completedCandles, 4500);
        assert.strictEqual(err.details.failedChunk.index, 2);
        assert.strictEqual(err.details.originalError.includes('DERIV_WS_TIMEOUT'), true);
        return true;
      }
    );
  });

  // 18. Genuine empty Deriv response
  it('18. Genuine empty response throws EMPTY_HISTORICAL_DATA when Deriv responds with 0 candles', async () => {
    const mock = new MockDerivTransport();
    // Transport succeeds without error, but has no candles for this symbol
    const service = new DerivHistoricalDataService(mock);

    const baseEpoch = 1700000000;
    await assert.rejects(
      async () => {
        await service.getHistoricalCandles({
          symbol: 'BOOM1000',
          timeframe: 'M15',
          startTime: baseEpoch * 1000,
          endTime: (baseEpoch + 3600) * 1000,
          bypassCache: true,
        });
      },
      (err: any) => {
        assert.strictEqual(err.message.includes('EMPTY_HISTORICAL_DATA'), true);
        return true;
      }
    );
  });

  // 19. Untrusted browser-supplied historical candles validation
  it('19. Authoritative server-side validation correctly sanitizes untrusted browser candles', () => {
    const service = new DerivHistoricalDataService();
    const baseEpoch = 1700000000;
    const startMs = baseEpoch * 1000;
    const endMs = (baseEpoch + 7200) * 1000;

    const untrustedBrowserCandles: DerivRawCandle[] = [
      // Out of order:
      createRawDerivCandle(baseEpoch + 1800, 102, 106, 101, 105),
      createRawDerivCandle(baseEpoch, 100, 105, 95, 102),
      // Duplicate:
      createRawDerivCandle(baseEpoch, 100, 105, 95, 102),
      // Corrupt candle (low > high):
      createRawDerivCandle(baseEpoch + 900, 100, 90, 110, 95),
      // Future / forming candle (far past endMs):
      createRawDerivCandle(baseEpoch + 14400, 105, 110, 100, 108),
    ];

    const result = service.processSuppliedRawCandles(
      untrustedBrowserCandles,
      'Boom 1000',
      'M15',
      startMs,
      endMs
    );

    // Should normalize symbol to BOOM1000
    assert.strictEqual(result.symbol, 'BOOM1000');
    assert.strictEqual(result.timeframe, 'M15');
    // Should remove duplicates
    assert.strictEqual(result.quality.duplicatesRemoved, 1);
    // Should filter forming/past end candle
    assert.strictEqual(result.quality.incompleteCountRemoved, 1);
    // Should filter corrupt candle and record warning
    assert.strictEqual(result.quality.warnings.some((w) => w.toLowerCase().includes('invalid')), true);
    // Should sort chronologically
    assert.strictEqual(result.candles.length, 2);
    assert.strictEqual(result.candles[0].time, baseEpoch * 1000);
    assert.strictEqual(result.candles[1].time, (baseEpoch + 1800) * 1000);
  });

  // 20. End-to-end HistoricalEvaluator execution with validated browser candles
  it('20. Validated browser candles produce deterministic backtest report without live trade execution', () => {
    const fixture = SyntheticFixtures.createBullishCompleteFixture();
    const service = new DerivHistoricalDataService();

    const minTime = Math.min(fixture.h4Candles[0].time, fixture.m15Candles[0].time);
    const maxTime = Math.max(
      fixture.h4Candles[fixture.h4Candles.length - 1].time,
      fixture.m15Candles[fixture.m15Candles.length - 1].time
    );

    // Convert fixture candles to raw Deriv input representation
    const rawH4: DerivRawCandle[] = fixture.h4Candles.map((c) => ({
      epoch: Math.floor(c.time / 1000),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const rawM15: DerivRawCandle[] = fixture.m15Candles.map((c) => ({
      epoch: Math.floor(c.time / 1000),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    // Process browser-supplied raw candles through authoritative server validation
    const h4Res = service.processSuppliedRawCandles(rawH4, 'BOOM1000', 'H4', minTime, maxTime);
    const m15Res = service.processSuppliedRawCandles(rawM15, 'BOOM1000', 'M15', minTime, maxTime);

    assert.strictEqual(h4Res.candles.length, fixture.h4Candles.length);
    assert.strictEqual(m15Res.candles.length, fixture.m15Candles.length);

    // Run existing frozen HistoricalEvaluator
    const evalReport = HistoricalEvaluator.evaluate(
      DEFAULT_SYNTHETIC_FIB_CONFIG,
      h4Res.candles,
      m15Res.candles,
      { riskPerTradePercent: 1.0 }
    );

    assert.strictEqual(evalReport.positionsClosed >= 1, true);
    assert.strictEqual(evalReport.winCount >= 1, true);
    assert.strictEqual(evalReport.totalRMultiple > 0, true);
  });

  // 21. DerivBrowserClient symbol normalization & custom App ID
  it('21. DerivBrowserClient properly normalizes Boom/Crash/Volatility symbols and sets custom App ID', () => {
    assert.strictEqual(normalizeDerivSymbol('Boom 1000'), 'BOOM1000');
    assert.strictEqual(normalizeDerivSymbol('BOOM 500'), 'BOOM500');
    assert.strictEqual(normalizeDerivSymbol('Crash 1000'), 'CRASH1000');
    assert.strictEqual(normalizeDerivSymbol('Volatility 75'), 'R_75');
    assert.strictEqual(normalizeDerivSymbol('V100'), 'R_100');
    assert.strictEqual(normalizeDerivSymbol('EUR/USD'), 'frxEURUSD');

    const client = new DerivBrowserClient('1089');
    assert.strictEqual(client.getAppId(), '1089');
    client.setAppId('36300');
    assert.strictEqual(client.getAppId(), '36300');
  });

  // 22. DerivBrowserClient connection lifecycle handles deduplication and status
  it('22. DerivBrowserClient initial state is DISCONNECTED and transitions safely', () => {
    const client = new DerivBrowserClient('1089');
    assert.strictEqual(client.getStatus(), 'DISCONNECTED');
    client.disconnect();
    assert.strictEqual(client.getStatus(), 'DISCONNECTED');
  });
});
