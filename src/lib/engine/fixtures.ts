/**
 * TradingOS — Strategy Engine Core: Deterministic Test Fixtures
 * Generates synthetic multi-timeframe candle datasets for walk-forward verification.
 */

import { Candle } from './types';
import { CandleEngine } from './candleEngine';

export class SyntheticFixtures {
  /**
   * Bullish Complete Setup Fixture:
   * H4: Confirms HL at 98, breaks out to HH at 120, retraces with candle close <= 50% (108 <= 109.0), freezes Fib.
   * M15: Confirms bullish CHoCH, later BOS, retraces to 50% touch -> BUY at 109.75, initial SL at 107.0.
   * Later H4 creates confirmed HL at 115, trailing stop advances, then opposite CHoCH closes trade at 114 (+1.55 R).
   */
  public static createBullishCompleteFixture(): {
    h4Candles: Candle[];
    m15Candles: Candle[];
  } {
    const baseTime = 1700000000000;
    const h4Ms = CandleEngine.getTimeframeDurationMs('H4');
    const m15Ms = CandleEngine.getTimeframeDurationMs('M15');

    const h4Candles: Candle[] = [];
    const m15Candles: Candle[] = [];

    const h4Data = [
      { o: 106, h: 108, l: 105, c: 107 }, // 0: Prelude
      { o: 107, h: 107.5, l: 102, c: 104 }, // 1: Prelude
      { o: 102, h: 104, l: 101, c: 103 }, // 2
      { o: 103, h: 103, l: 98, c: 100 },  // 3: Swing Low (98)
      { o: 100, h: 106, l: 99, c: 105 },  // 4
      { o: 105, h: 112, l: 104, c: 110 }, // 5
      { o: 110, h: 120, l: 109, c: 119 }, // 6: Swing High (120)
      { o: 119, h: 119, l: 111, c: 112 }, // 7
      { o: 112, h: 113, l: 108.5, c: 110 }, // 8: Wick only, close 110 > 109
      { o: 110, h: 111, l: 107, c: 108 },  // 9: Close 108 <= 109 -> H4 50% ACTIVATION & FREEZE!
      { o: 108, h: 122, l: 108, c: 121 },  // 10
      { o: 121, h: 124, l: 118, c: 123 },  // 11
      { o: 123, h: 125, l: 117, c: 122 },  // 12
      { o: 122, h: 123, l: 115, c: 118 },  // 13: Swing Low at 115!
      { o: 118, h: 125, l: 118, c: 124 },  // 14
      { o: 124, h: 129, l: 120, c: 128 },  // 15: Confirms HL 115
      { o: 128, h: 128, l: 113, c: 114 },  // 16: Close 114 < 115 -> OPPOSITE_4H_CHOCH (+1.55 R)!
    ];

    for (let i = 0; i < h4Data.length; i++) {
      const d = h4Data[i];
      h4Candles.push(
        CandleEngine.createCandle(baseTime + i * h4Ms, d.o, d.h, d.l, d.c)
      );
    }

    const m15StartTime = baseTime + 9 * h4Ms;
    const m15Data = [
      { o: 108.5, h: 109.0, l: 108.0, c: 108.5 }, // 0
      { o: 108.5, h: 109.0, l: 108.2, c: 108.4 }, // 1
      { o: 108.4, h: 109.5, l: 108.0, c: 108.8 }, // 2: Swing High at 109.5!
      { o: 108.4, h: 108.6, l: 107.5, c: 107.8 }, // 3
      { o: 107.8, h: 107.8, l: 107.0, c: 107.2 }, // 4: Swing Low at 107.0
      { o: 107.2, h: 107.5, l: 107.1, c: 107.4 }, // 5
      { o: 107.4, h: 108.0, l: 107.3, c: 107.9 }, // 6: Confirms 107.0
      { o: 107.9, h: 111.0, l: 107.8, c: 110.5 }, // 7: Closes above 109.5 -> CHoCH!
      { o: 110.5, h: 110.5, l: 109.5, c: 109.8 }, // 8
      { o: 109.8, h: 110.0, l: 109.5, c: 109.9 }, // 9
      { o: 109.9, h: 112.5, l: 109.9, c: 112.2 }, // 10: Closes above 111.0 -> BOS! M15 Fib: 0%=107.0, 100%=112.5, 50%=109.75
      { o: 112.2, h: 112.2, l: 109.5, c: 110.2 }, // 11: Low dips to 109.5 <= 109.75 -> TOUCH ENTRY AT 109.75!
      { o: 110.2, h: 118.0, l: 110.0, c: 117.5 }, // 12
    ];

    for (let i = 0; i < m15Data.length; i++) {
      const d = m15Data[i];
      m15Candles.push(
        CandleEngine.createCandle(m15StartTime + i * m15Ms, d.o, d.h, d.l, d.c)
      );
    }

    return { h4Candles, m15Candles };
  }

  /**
   * Bearish Complete Setup Fixture:
   * Exact structural mirror of the bullish fixture.
   */
  public static createBearishCompleteFixture(): {
    h4Candles: Candle[];
    m15Candles: Candle[];
  } {
    const baseTime = 1700000000000;
    const h4Ms = CandleEngine.getTimeframeDurationMs('H4');
    const m15Ms = CandleEngine.getTimeframeDurationMs('M15');

    const h4Candles: Candle[] = [];
    const m15Candles: Candle[] = [];

    const h4Data = [
      { o: 174, h: 175, l: 172, c: 173 }, // 0: Prelude
      { o: 173, h: 178, l: 172.5, c: 176 }, // 1: Prelude
      { o: 176, h: 178, l: 175, c: 177 }, // 2
      { o: 177, h: 180, l: 176, c: 179 }, // 3: Swing High (180)
      { o: 179, h: 179, l: 173, c: 174 }, // 4
      { o: 174, h: 174, l: 167, c: 169 }, // 5
      { o: 169, h: 170, l: 160, c: 161 }, // 6: Swing Low (160)
      { o: 161, h: 168, l: 161, c: 167 }, // 7
      { o: 167, h: 170.5, l: 166, c: 169 }, // 8: Wick to 170.5, close 169 < 170
      { o: 169, h: 172, l: 168, c: 171 },  // 9: Close 171 >= 170 -> H4 50% ACTIVATES & FREEZES!
      { o: 171, h: 171.5, l: 158, c: 159 }, // 10
      { o: 159, h: 162, l: 156, c: 157 }, // 11
      { o: 157, h: 163, l: 155, c: 158 }, // 12
      { o: 158, h: 165, l: 157, c: 162 }, // 13: Swing High at 165!
      { o: 162, h: 162, l: 155, c: 156 }, // 14
      { o: 156, h: 160, l: 151, c: 152 }, // 15: Confirms LH 165
      { o: 152, h: 167, l: 152, c: 166 }, // 16: Close 166 > 165 -> OPPOSITE_4H_CHOCH (+2.33 R)!
    ];

    for (let i = 0; i < h4Data.length; i++) {
      const d = h4Data[i];
      h4Candles.push(
        CandleEngine.createCandle(baseTime + i * h4Ms, d.o, d.h, d.l, d.c)
      );
    }

    const m15StartTime = baseTime + 9 * h4Ms;
    const m15Data = [
      { o: 172.5, h: 173.0, l: 172.0, c: 172.5 }, // 0
      { o: 172.5, h: 173.0, l: 172.2, c: 172.4 }, // 1
      { o: 172.4, h: 173.0, l: 172.0, c: 172.2 }, // 2: Swing Low at 172.0!
      { o: 172.2, h: 172.6, l: 172.1, c: 172.5 }, // 3
      { o: 172.5, h: 178.5, l: 172.4, c: 178.0 }, // 4: Swing High at 178.5 (Origin)
      { o: 178.0, h: 178.2, l: 175.0, c: 176.0 }, // 5
      { o: 176.0, h: 176.2, l: 173.0, c: 173.5 }, // 6: Low confirmed
      { o: 173.5, h: 173.5, l: 171.5, c: 171.8 }, // 7: Closes below 172.0 -> Bearish CHoCH!
      { o: 171.8, h: 172.0, l: 171.5, c: 171.9 }, // 8
      { o: 171.9, h: 172.0, l: 171.6, c: 171.8 }, // 9
      { o: 171.8, h: 171.8, l: 171.0, c: 171.2 }, // 10: Closes at 171.2 < 171.8 -> BOS! Fib: 0%=178.5, 100%=171.0, 50%=174.75!
      { o: 171.2, h: 175.0, l: 171.2, c: 174.0 }, // 11: High reaches 175.0 >= 174.75 -> TOUCH ENTRY AT 174.75!
      { o: 174.0, h: 174.2, l: 162.0, c: 163.0 }, // 12
    ];

    for (let i = 0; i < m15Data.length; i++) {
      const d = m15Data[i];
      m15Candles.push(
        CandleEngine.createCandle(m15StartTime + i * m15Ms, d.o, d.h, d.l, d.c)
      );
    }

    return { h4Candles, m15Candles };
  }

  /**
   * Dynamic Fib Fixture:
   * Price retraces toward 50% without closing through it, then extends to a new high (bullish BOS).
   * Verifies that the 100% Fib extends dynamically and 50% recalculates.
   */
  public static createDynamicFibExtensionFixture(): {
    h4Candles: Candle[];
  } {
    const baseTime = 1700000000000;
    const h4Ms = CandleEngine.getTimeframeDurationMs('H4');

    const h4Data = [
      { o: 104, h: 105, l: 103, c: 104 }, // 0: Prelude
      { o: 104, h: 104.5, l: 100, c: 101 }, // 1: Prelude
      { o: 101, h: 101, l: 95, c: 98 },   // 2: Origin Low: 95
      { o: 98, h: 105, l: 97, c: 104 },   // 3
      { o: 104, h: 110, l: 103, c: 109 }, // 4
      { o: 109, h: 115, l: 108, c: 114 }, // 5: Endpoint High: 115 -> initial 50% = 105.0
      { o: 114, h: 114, l: 108, c: 111 }, // 6: Right 1
      { o: 111, h: 112, l: 108, c: 109 }, // 7: Right 2 (confirms 115)
      { o: 109, h: 125, l: 108, c: 124 }, // 8: Extends to new high 125! -> Dynamic Fib updates to 125, new 50% = 110.0!
    ];

    return {
      h4Candles: h4Data.map((d, i) =>
        CandleEngine.createCandle(baseTime + i * h4Ms, d.o, d.h, d.l, d.c)
      ),
    };
  }

  /**
   * Frozen Fib Post-Activation Invalidation Fixture:
   * H4 50% activates & freezes. Then a breakdown invalidates the H4 structure before M15 confirmation.
   * Verifies Fib remains frozen and setup resets rather than chasing the move.
   */
  public static createFrozenFibInvalidationFixture(): {
    h4Candles: Candle[];
    m15Candles: Candle[];
  } {
    const baseTime = 1700000000000;
    const h4Ms = CandleEngine.getTimeframeDurationMs('H4');

    const h4Data = [
      { o: 104, h: 105, l: 103, c: 104 }, // 0
      { o: 104, h: 104.5, l: 100, c: 101 }, // 1
      { o: 101, h: 101, l: 95, c: 98 },   // 2: Origin Low: 95
      { o: 98, h: 105, l: 97, c: 104 },   // 3
      { o: 104, h: 110, l: 103, c: 109 }, // 4
      { o: 109, h: 115, l: 108, c: 114 }, // 5: High: 115 -> 50% = 105.0
      { o: 114, h: 114, l: 108, c: 111 }, // 6
      { o: 111, h: 112, l: 106, c: 107 }, // 7: Confirms 115
      { o: 107, h: 108, l: 103, c: 104 }, // 8: Closes at 104 (<= 105) -> H4 50% ACTIVATES & FREEZES!
      { o: 104, h: 104, l: 90, c: 92 },   // 9: Breakdown closing below 95 (origin 0%) -> Post-activation invalidation!
    ];

    return {
      h4Candles: h4Data.map((d, i) =>
        CandleEngine.createCandle(baseTime + i * h4Ms, d.o, d.h, d.l, d.c)
      ),
      m15Candles: [],
    };
  }

  /**
   * M15 CHoCH Opposing Invalidation Fixture:
   * M15 CHoCH confirms, but opposing CHoCH occurs before BOS.
   * Verifies that the sequence cancels and returns to WAITING_FOR_M15_CHOCH without entering a trade.
   */
  public static createM15ChochInvalidationFixture(): {
    h4Candles: Candle[];
    m15Candles: Candle[];
  } {
    const baseTime = 1700000000000;
    const h4Ms = CandleEngine.getTimeframeDurationMs('H4');
    const m15Ms = CandleEngine.getTimeframeDurationMs('M15');

    const h4Data = [
      { o: 106, h: 108, l: 105, c: 107 }, // 0
      { o: 107, h: 107.5, l: 102, c: 104 }, // 1
      { o: 102, h: 104, l: 101, c: 103 }, // 2
      { o: 103, h: 103, l: 95, c: 98 },   // 3: Swing Low 95
      { o: 98, h: 105, l: 97, c: 104 },   // 4
      { o: 104, h: 112, l: 103, c: 110 }, // 5
      { o: 110, h: 120, l: 109, c: 119 }, // 6: Swing High 120
      { o: 119, h: 119, l: 111, c: 112 }, // 7
      { o: 112, h: 113, l: 108.5, c: 110 }, // 8: Confirms 120! Fib: 95 -> 120, 50% = 107.5
      { o: 110, h: 111, l: 106, c: 107 },  // 9: Close 107 <= 107.5 -> activates & freezes!
    ];

    const m15StartTime = baseTime + 9 * h4Ms;
    const m15Data = [
      { o: 110, h: 111, l: 109, c: 110 },
      { o: 110, h: 110.5, l: 108, c: 108.5 },
      { o: 108.5, h: 109.5, l: 107.5, c: 107.8 }, // Swing High at 109.5
      { o: 107.8, h: 108.0, l: 107.0, c: 107.2 }, // Origin Low at 107.0
      { o: 107.2, h: 107.5, l: 107.1, c: 107.3 }, // confirm low
      { o: 107.3, h: 110.2, l: 107.2, c: 110.0 }, // Closes above 109.5 -> CHoCH!
      { o: 110.0, h: 110.0, l: 105.0, c: 106.0 }, // Opposing breakdown below 107.0!
    ];

    return {
      h4Candles: h4Data.map((d, i) =>
        CandleEngine.createCandle(baseTime + i * h4Ms, d.o, d.h, d.l, d.c)
      ),
      m15Candles: m15Data.map((d, i) =>
        CandleEngine.createCandle(m15StartTime + i * m15Ms, d.o, d.h, d.l, d.c)
      ),
    };
  }
}
