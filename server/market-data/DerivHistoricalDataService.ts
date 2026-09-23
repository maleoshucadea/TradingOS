/**
 * TradingOS — Real Historical Market Data Service
 * Connects to Deriv Historical Market Data API (WebSocket ticks_history),
 * paginates, normalizes, validates OHLC, detects gaps, and filters incomplete candles.
 * Strictly READ-ONLY. No live execution or order capability.
 */

import { Candle, DataQualityReport, DerivRawCandle, Timeframe } from '../../src/lib/engine/types';
import { CandleEngine } from '../../src/lib/engine/candleEngine';

export interface HistoricalCandlesRequest {
  symbol: string;
  timeframe: Timeframe;
  startTime: number; // Unix ms
  endTime: number;   // Unix ms
  bypassCache?: boolean;
}

export interface HistoricalCandlesResult {
  symbol: string;
  timeframe: Timeframe;
  candles: Candle[];
  quality: DataQualityReport;
  fromCache: boolean;
}

export interface IDerivTransport {
  queryCandles(
    symbol: string,
    granularity: number,
    startEpoch: number,
    endEpoch: number,
    count: number
  ): Promise<DerivRawCandle[]>;
}

interface CacheEntry {
  result: HistoricalCandlesResult;
  timestamp: number;
}

export interface DerivPartialDataTransportErrorDetails {
  symbol: string;
  timeframe: Timeframe;
  requestedRange: { start: string; end: string };
  completedChunks: number;
  completedCandles: number;
  failedChunk: { start: string; end: string; index: number };
  originalError: string;
}

export class DerivPartialDataTransportError extends Error {
  public readonly code = 'DERIV_PARTIAL_DATA_TRANSPORT_ERROR';
  public readonly details: DerivPartialDataTransportErrorDetails;

  constructor(details: DerivPartialDataTransportErrorDetails) {
    super(
      `DERIV_PARTIAL_DATA_TRANSPORT_ERROR: Failed to complete historical candle pagination for ${details.symbol} (${details.timeframe}). Completed ${details.completedChunks} chunk(s) (${details.completedCandles} candles), but chunk #${details.failedChunk.index} failed: ${details.originalError}`
    );
    this.name = 'DerivPartialDataTransportError';
    this.details = details;
  }
}

export class DerivHistoricalDataService {
  private static instance: DerivHistoricalDataService | null = null;
  private transport: IDerivTransport;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes for historical bars
  private readonly MAX_CACHE_ENTRIES = 60;
  private readonly MAX_REQUEST_DAYS = 90; // Prevent indefinite data download

  constructor(customTransport?: IDerivTransport) {
    this.transport = customTransport || new DefaultDerivWsTransport();
  }

  public static getInstance(customTransport?: IDerivTransport): DerivHistoricalDataService {
    if (!DerivHistoricalDataService.instance || customTransport) {
      DerivHistoricalDataService.instance = new DerivHistoricalDataService(customTransport);
    }
    return DerivHistoricalDataService.instance;
  }

  /**
   * Normalizes common user-entered symbol representations into Deriv API symbols
   */
  public static normalizeSymbol(rawSymbol: string): string {
    const cleaned = rawSymbol.trim().toUpperCase().replace(/[\s\-_]/g, '');

    const symbolMap: Record<string, string> = {
      BOOM1000: 'BOOM1000',
      BOOM500: 'BOOM500',
      BOOM300: 'BOOM300',
      CRASH1000: 'CRASH1000',
      CRASH500: 'CRASH500',
      CRASH300: 'CRASH300',
      VOLATILITY10: 'R_10',
      VOLATILITY25: 'R_25',
      VOLATILITY50: 'R_50',
      VOLATILITY75: 'R_75',
      VOLATILITY100: 'R_100',
      VOL10: 'R_10',
      VOL25: 'R_25',
      VOL50: 'R_50',
      VOL75: 'R_75',
      VOL100: 'R_100',
      R10: 'R_10',
      R25: 'R_25',
      R50: 'R_50',
      R75: 'R_75',
      R100: 'R_100',
      EURUSD: 'frxEURUSD',
      GBPUSD: 'frxGBPUSD',
      USDJPY: 'frxUSDJPY',
      BTCUSD: 'cryBTCUSD',
      SYNTHETICVOL25: 'R_25',
    };

    if (symbolMap[cleaned]) {
      return symbolMap[cleaned];
    }

    // Direct match with underscore formats like R_25
    if (rawSymbol.toUpperCase().startsWith('R_')) {
      return rawSymbol.toUpperCase();
    }
    if (rawSymbol.startsWith('frx') || rawSymbol.startsWith('cry')) {
      return rawSymbol;
    }

    return rawSymbol.toUpperCase();
  }

  /**
   * Converts timeframe to Deriv granularity in seconds
   */
  public static timeframeToGranularitySeconds(tf: Timeframe): number {
    switch (tf) {
      case 'M1':
        return 60;
      case 'M5':
        return 300;
      case 'M15':
        return 900;
      case 'M30':
        return 1800;
      case 'H1':
        return 3600;
      case 'H4':
        return 14400;
      case 'D1':
        return 86400;
      case 'W1':
        return 604800;
      default:
        throw new Error(
          `UNSUPPORTED_TIMEFRAME: Timeframe '${tf}' is not supported by the Deriv Historical Data Service.`
        );
    }
  }

  /**
   * Retrieves and validates historical candles from Deriv with caching and pagination
   */
  public async getHistoricalCandles(
    options: HistoricalCandlesRequest
  ): Promise<HistoricalCandlesResult> {
    const symbol = DerivHistoricalDataService.normalizeSymbol(options.symbol);
    const timeframe = options.timeframe;
    const granularitySec = DerivHistoricalDataService.timeframeToGranularitySeconds(timeframe);
    const timeframeMs = CandleEngine.getTimeframeDurationMs(timeframe);

    // 1. Validate Date Range
    const nowMs = Date.now();
    let startTime = Math.min(options.startTime, options.endTime);
    let endTime = Math.max(options.startTime, options.endTime);

    if (startTime >= endTime) {
      throw new Error(
        `INVALID_DATE_RANGE: Start time (${new Date(startTime).toISOString()}) must be strictly before end time (${new Date(endTime).toISOString()}).`
      );
    }

    // Clamp end time to current time
    if (endTime > nowMs) {
      endTime = nowMs;
    }

    const rangeDays = (endTime - startTime) / (24 * 3600 * 1000);
    if (rangeDays > this.MAX_REQUEST_DAYS) {
      throw new Error(
        `DATE_RANGE_TOO_LARGE: Requested historical range (${rangeDays.toFixed(1)} days) exceeds maximum limit of ${this.MAX_REQUEST_DAYS} days.`
      );
    }

    // 2. Check Server Cache
    const cacheKey = `deriv:${symbol}:${timeframe}:${startTime}:${endTime}`;
    if (!options.bypassCache && this.cache.has(cacheKey)) {
      const entry = this.cache.get(cacheKey)!;
      if (nowMs - entry.timestamp < this.CACHE_TTL_MS) {
        return {
          ...entry.result,
          fromCache: true,
        };
      } else {
        this.cache.delete(cacheKey);
      }
    }

    // 3. Pagination & Fetching
    const rawCandles = await this.fetchWithPagination(
      symbol,
      timeframe,
      granularitySec,
      Math.floor(startTime / 1000),
      Math.floor(endTime / 1000)
    );

    if (!rawCandles || rawCandles.length === 0) {
      const errorMsg = `EMPTY_HISTORICAL_DATA: No historical candles returned by Deriv for symbol '${symbol}' (${timeframe}) between ${new Date(startTime).toISOString()} and ${new Date(endTime).toISOString()}. Verify that the instrument is available on Deriv.`;
      throw new Error(errorMsg);
    }

    // 4. Normalization, OHLC validation, Deduplication & Incomplete Candle Filtering
    const normalized = this.processRawCandles(
      rawCandles,
      symbol,
      timeframe,
      timeframeMs,
      startTime,
      endTime,
      nowMs
    );

    // 5. Store in Cache
    this.setCache(cacheKey, normalized);

    return normalized;
  }

  /**
   * Fetches data in chunks if date range spans more than 4,500 candles.
   * - If the very first chunk fails, immediately rethrows the original transport error.
   * - If a later chunk fails after earlier chunks succeeded, throws DerivPartialDataTransportError
   *   so transport failures are never masked as empty datasets.
   */
  private async fetchWithPagination(
    symbol: string,
    timeframe: Timeframe,
    granularitySec: number,
    startEpoch: number,
    endEpoch: number
  ): Promise<DerivRawCandle[]> {
    const chunkCapacity = 4500;
    const chunkDurationSec = chunkCapacity * granularitySec;

    const allCandles: DerivRawCandle[] = [];
    let currentStart = startEpoch;
    let chunkIndex = 0;

    while (currentStart < endEpoch) {
      const currentEnd = Math.min(currentStart + chunkDurationSec, endEpoch);
      const count = Math.min(
        chunkCapacity,
        Math.ceil((currentEnd - currentStart) / granularitySec) + 10
      );

      try {
        const chunk = await this.transport.queryCandles(
          symbol,
          granularitySec,
          currentStart,
          currentEnd,
          count
        );

        if (chunk && chunk.length > 0) {
          for (const c of chunk) {
            if (c.epoch >= startEpoch && c.epoch <= endEpoch) {
              allCandles.push(c);
            }
          }
        }
      } catch (err: any) {
        // If the first chunk fails, propagate original transport error immediately
        if (chunkIndex === 0) {
          throw err;
        }

        // If a later chunk fails after earlier chunks succeeded, throw DerivPartialDataTransportError
        throw new DerivPartialDataTransportError({
          symbol,
          timeframe,
          requestedRange: {
            start: new Date(startEpoch * 1000).toISOString(),
            end: new Date(endEpoch * 1000).toISOString(),
          },
          completedChunks: chunkIndex,
          completedCandles: allCandles.length,
          failedChunk: {
            start: new Date(currentStart * 1000).toISOString(),
            end: new Date(currentEnd * 1000).toISOString(),
            index: chunkIndex + 1,
          },
          originalError: err.message || String(err),
        });
      }

      chunkIndex++;
      currentStart = currentEnd;
    }

    return allCandles.sort((a, b) => a.epoch - b.epoch);
  }

  /**
   * Processes externally supplied raw Deriv candles through the exact same
   * validation, normalization, incomplete candle filtering, and gap detection pipeline.
   */
  public processSuppliedRawCandles(
    rawList: DerivRawCandle[],
    symbol: string,
    timeframe: Timeframe,
    startMs: number,
    endMs: number
  ): HistoricalCandlesResult {
    const normSymbol = DerivHistoricalDataService.normalizeSymbol(symbol);
    const timeframeMs = CandleEngine.getTimeframeDurationMs(timeframe);
    return this.processRawCandles(
      rawList,
      normSymbol,
      timeframe,
      timeframeMs,
      startMs,
      endMs,
      Date.now()
    );
  }

  /**
   * Processes raw candles:
   * - OHLC integrity check
   * - Filters incomplete / forming candles
   * - Deduplicates
   * - Gathers gap metrics
   */
  private processRawCandles(
    rawList: DerivRawCandle[],
    symbol: string,
    timeframe: Timeframe,
    timeframeMs: number,
    startMs: number,
    endMs: number,
    nowMs: number
  ): HistoricalCandlesResult {
    let incompleteCountRemoved = 0;
    let duplicatesRemoved = 0;
    const validCandles: Candle[] = [];
    const seenTimestamps = new Set<number>();
    const warnings: string[] = [];

    // Sort ascending by epoch
    const sortedRaw = [...rawList].sort((a, b) => a.epoch - b.epoch);

    for (let i = 0; i < sortedRaw.length; i++) {
      const raw = sortedRaw[i];
      const candleTimeMs = raw.epoch * 1000;
      const candleCloseTimeMs = candleTimeMs + timeframeMs;

      // 1. Deduplication
      if (seenTimestamps.has(candleTimeMs)) {
        duplicatesRemoved++;
        continue;
      }
      seenTimestamps.add(candleTimeMs);

      // 2. Filter Incomplete / Still-forming Candles
      // If candle close time is strictly in the future or extends past requested endMs:
      if (candleCloseTimeMs > nowMs || candleTimeMs > endMs) {
        incompleteCountRemoved++;
        continue;
      }

      // 3. Validate OHLC Integrity
      const open = Number(raw.open);
      const high = Number(raw.high);
      const low = Number(raw.low);
      const close = Number(raw.close);

      if (
        isNaN(open) ||
        isNaN(high) ||
        isNaN(low) ||
        isNaN(close) ||
        low > high ||
        open < low ||
        open > high ||
        close < low ||
        close > high
      ) {
        warnings.push(
          `Invalid OHLC at ${new Date(candleTimeMs).toISOString()}: O=${open}, H=${high}, L=${low}, C=${close}. Skipped.`
        );
        continue;
      }

      validCandles.push({
        time: candleTimeMs,
        timeUtc: new Date(candleTimeMs).toISOString(),
        open,
        high,
        low,
        close,
        volume: raw.volume ?? 100,
        confirmed: true,
      });
    }

    if (validCandles.length === 0) {
      throw new Error(
        `INSUFFICIENT_VALID_CANDLES: All ${rawList.length} candles returned for '${symbol}' were filtered out due to validation errors or incomplete formation.`
      );
    }

    // 4. Gap Detection
    const gapsDetected: Array<{ fromUtc: string; toUtc: string; missingDurationMs: number }> = [];
    for (let i = 1; i < validCandles.length; i++) {
      const prev = validCandles[i - 1];
      const curr = validCandles[i];
      const delta = curr.time - prev.time;

      // If gap exceeds 1.5 * expected timeframe duration, record as a market data gap
      if (delta > 1.5 * timeframeMs) {
        const missingDurationMs = delta - timeframeMs;
        gapsDetected.push({
          fromUtc: prev.timeUtc,
          toUtc: curr.timeUtc,
          missingDurationMs,
        });
      }
    }

    if (gapsDetected.length > 0) {
      warnings.push(
        `Detected ${gapsDetected.length} structural market data gap(s). Largest missing interval: ${(
          Math.max(...gapsDetected.map((g) => g.missingDurationMs)) / (3600 * 1000)
        ).toFixed(1)} hours.`
      );
    }

    // 5. Quality Status Assessment
    let status: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'INSUFFICIENT' = 'EXCELLENT';
    if (validCandles.length < (timeframe === 'H4' ? 10 : 25)) {
      status = 'INSUFFICIENT';
      warnings.push(
        `Insufficient candle count (${validCandles.length}) for structural multi-timeframe evaluation.`
      );
    } else if (gapsDetected.length > 3) {
      status = 'WARNING';
    } else if (gapsDetected.length > 0 || warnings.length > 0) {
      status = 'GOOD';
    }

    const quality: DataQualityReport = {
      symbol,
      timeframe,
      totalRetrieved: rawList.length,
      validCount: validCandles.length,
      incompleteCountRemoved,
      duplicatesRemoved,
      gapsDetected,
      firstCandleUtc: validCandles[0]?.timeUtc || null,
      lastCandleUtc: validCandles[validCandles.length - 1]?.timeUtc || null,
      status,
      warnings,
    };

    return {
      symbol,
      timeframe,
      candles: validCandles,
      quality,
      fromCache: false,
    };
  }

  private setCache(key: string, result: HistoricalCandlesResult): void {
    if (this.cache.size >= this.MAX_CACHE_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  public clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Default WebSocket transport for live Deriv historical queries
 */
export class DefaultDerivWsTransport implements IDerivTransport {
  private appId: string;

  constructor(appId: string = '1089') {
    this.appId = (process.env.DERIV_APP_ID || appId).trim();
  }

  public async queryCandles(
    symbol: string,
    granularity: number,
    startEpoch: number,
    endEpoch: number,
    count: number = 5000
  ): Promise<DerivRawCandle[]> {
    const WebSocketClass = (globalThis as any).WebSocket;
    if (!WebSocketClass) {
      throw new Error('WebSocket is not supported in this runtime environment.');
    }

    return new Promise<DerivRawCandle[]>((resolve, reject) => {
      let ws: any = null;
      let timer: NodeJS.Timeout;

      const cleanup = () => {
        clearTimeout(timer);
        try {
          ws?.close();
        } catch {}
      };

      try {
        const wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${this.appId}`;
        ws = new WebSocketClass(wsUrl);

        timer = setTimeout(() => {
          cleanup();
          reject(
            new Error(
              `DERIV_WS_TIMEOUT: Deriv WebSocket ticks_history request timed out for '${symbol}' (${granularity}s).`
            )
          );
        }, 12000);

        ws.onopen = () => {
          const reqPayload = {
            ticks_history: symbol,
            style: 'candles',
            granularity,
            start: startEpoch,
            end: endEpoch,
            count: Math.min(5000, count),
            adjust_start_time: 1,
          };
          ws.send(JSON.stringify(reqPayload));
        };

        ws.onmessage = (event: any) => {
          cleanup();
          try {
            const data = JSON.parse(event.data);
            if (data.error) {
              return reject(
                new Error(
                  `DERIV_API_ERROR: [${data.error.code || 'UNKNOWN'}] ${data.error.message || 'Error querying historical candles'}`
                )
              );
            }

            if (data.msg_type === 'candles' && Array.isArray(data.candles)) {
              return resolve(data.candles as DerivRawCandle[]);
            }

            if (data.candles && Array.isArray(data.candles)) {
              return resolve(data.candles as DerivRawCandle[]);
            }

            // If empty or no candles key
            return resolve([]);
          } catch (err: any) {
            reject(
              new Error(`DERIV_RESPONSE_PARSE_ERROR: Failed to parse Deriv candles response: ${err.message}`)
            );
          }
        };

        ws.onerror = (err: any) => {
          cleanup();
          reject(
            new Error(
              `DERIV_WS_CONNECTION_ERROR: Failed to establish WebSocket connection with Deriv for symbol '${symbol}'.`
            )
          );
        };
      } catch (err: any) {
        cleanup();
        reject(err);
      }
    });
  }
}
