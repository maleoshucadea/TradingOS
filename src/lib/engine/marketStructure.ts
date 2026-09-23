/**
 * TradingOS — Strategy Engine Core: Market Structure Engine
 * Detects swing pivots, structural labels (HH, HL, LH, LL), CHoCH, BOS,
 * and identifies structural impulsive legs.
 *
 * STRICT REQUIREMENT: No lookahead bias.
 * A pivot at index i is confirmed strictly at index i + confirmationBars.
 */

import {
  Candle,
  SwingPoint,
  TrendDirection,
  StructureEvent,
  ImpulsiveMove,
  FibonacciLevels,
} from './types';

export class MarketStructureEngine {
  /**
   * Identifies all confirmed swing highs and lows up to currentIndex
   * confirmationBars: number of bars on left and right (default: 2)
   */
  public static detectConfirmedSwings(
    candles: Candle[],
    currentIndex: number = candles.length - 1,
    confirmationBars: number = 2
  ): SwingPoint[] {
    const swings: SwingPoint[] = [];

    // To confirm a swing at index i, we need candles up to i + confirmationBars
    const maxEvaluableIndex = Math.min(currentIndex, candles.length - 1);

    for (let i = confirmationBars; i <= maxEvaluableIndex - confirmationBars; i++) {
      const current = candles[i];
      let isHigh = true;
      let isLow = true;

      // Check left and right confirmation window
      for (let offset = 1; offset <= confirmationBars; offset++) {
        const left = candles[i - offset];
        const right = candles[i + offset];

        if (left.high > current.high || right.high >= current.high) {
          isHigh = false;
        }
        if (left.low < current.low || right.low <= current.low) {
          isLow = false;
        }
      }

      const confirmedAtIndex = i + confirmationBars;

      // Only include if confirmed at or before currentIndex (NO LOOKAHEAD)
      if (confirmedAtIndex <= maxEvaluableIndex) {
        if (isHigh) {
          swings.push({
            id: `swing-high-${i}-${current.time}`,
            type: 'HIGH',
            price: current.high,
            candleIndex: i,
            time: current.time,
            timeUtc: current.timeUtc,
            confirmedAtIndex,
          });
        }
        if (isLow) {
          swings.push({
            id: `swing-low-${i}-${current.time}`,
            type: 'LOW',
            price: current.low,
            candleIndex: i,
            time: current.time,
            timeUtc: current.timeUtc,
            confirmedAtIndex,
          });
        }
      }
    }

    // Sort by candle index
    swings.sort((a, b) => a.candleIndex - b.candleIndex);

    // Structural labeling: HH, HL, LH, LL
    let lastHigh: SwingPoint | null = null;
    let lastLow: SwingPoint | null = null;

    for (const swing of swings) {
      if (swing.type === 'HIGH') {
        if (lastHigh) {
          swing.structuralLabel = swing.price > lastHigh.price ? 'HH' : 'LH';
        } else {
          swing.structuralLabel = 'HH';
        }
        lastHigh = swing;
      } else {
        if (lastLow) {
          swing.structuralLabel = swing.price > lastLow.price ? 'HL' : 'LL';
        } else {
          swing.structuralLabel = 'LL';
        }
        lastLow = swing;
      }
    }

    return swings;
  }

  /**
   * Determines current confirmed trend direction from confirmed structural labels
   */
  public static determineTrendDirection(swings: SwingPoint[]): TrendDirection {
    if (swings.length < 3) return 'UNDEFINED';

    const recentHighs = swings.filter((s) => s.type === 'HIGH').slice(-2);
    const recentLows = swings.filter((s) => s.type === 'LOW').slice(-2);

    if (recentHighs.length >= 2 && recentLows.length >= 2) {
      const isBullish =
        recentHighs[1].price > recentHighs[0].price &&
        recentLows[1].price > recentLows[0].price;

      const isBearish =
        recentHighs[1].price < recentHighs[0].price &&
        recentLows[1].price < recentLows[0].price;

      if (isBullish) return 'BULLISH';
      if (isBearish) return 'BEARISH';
    }

    // Check latest swing labels
    const latestSwings = swings.slice(-3);
    const hasHH = latestSwings.some((s) => s.structuralLabel === 'HH');
    const hasHL = latestSwings.some((s) => s.structuralLabel === 'HL');
    const hasLH = latestSwings.some((s) => s.structuralLabel === 'LH');
    const hasLL = latestSwings.some((s) => s.structuralLabel === 'LL');

    if (hasHH && hasHL && !hasLL) return 'BULLISH';
    if (hasLH && hasLL && !hasHH) return 'BEARISH';

    return 'RANGING';
  }

  /**
   * Calculates Fibonacci Retracement levels from an impulsive move
   */
  public static calculateFibonacci(
    originPrice: number,
    endpointPrice: number,
    direction: 'BULLISH' | 'BEARISH'
  ): FibonacciLevels {
    const fiftyPercentLevel = Number(
      ((originPrice + endpointPrice) / 2).toFixed(5)
    );

    return {
      direction,
      originZeroLevel: originPrice, // 0%
      endpointHundredLevel: endpointPrice, // 100%
      fiftyPercentLevel, // 50%
      isDynamic: true,
      isFrozen: false,
    };
  }

  /**
   * Checks whether a candle closes at or through the 50% retracement level.
   * STRICT REQUIREMENT: Candle CLOSE must confirm it. A wick touch is NOT sufficient.
   */
  public static isFiftyPercentConfirmedByClose(
    candle: Candle,
    fib: FibonacciLevels
  ): boolean {
    if (fib.direction === 'BULLISH') {
      // In bullish setup, impulse was upward; retracement is downward.
      // Candle close must retrace down to or below the 50% level
      return candle.close <= fib.fiftyPercentLevel && candle.close >= fib.originZeroLevel;
    } else {
      // In bearish setup, impulse was downward; retracement is upward.
      // Candle close must retrace up to or above the 50% level
      return candle.close >= fib.fiftyPercentLevel && candle.close <= fib.originZeroLevel;
    }
  }

  /**
   * Detects whether candle touches/enters the 50% retracement zone
   */
  public static isFiftyPercentZoneTouched(
    candle: Candle,
    fib: FibonacciLevels
  ): boolean {
    if (fib.direction === 'BULLISH') {
      // Price retracing down into 50%
      return candle.low <= fib.fiftyPercentLevel && candle.high >= fib.fiftyPercentLevel;
    } else {
      // Price retracing up into 50%
      return candle.high >= fib.fiftyPercentLevel && candle.low <= fib.fiftyPercentLevel;
    }
  }

  /**
   * Detects latest confirmed CHoCH and BOS events across candles
   */
  public static evaluateStructuralEvents(
    candles: Candle[],
    swings: SwingPoint[],
    currentTrend: TrendDirection
  ): {
    events: StructureEvent[];
    lastCHoCH?: StructureEvent;
    lastBOS?: StructureEvent;
  } {
    const events: StructureEvent[] = [];

    // Track latest high and low swings that were confirmed before candle i
    for (let i = 1; i < candles.length; i++) {
      const candle = candles[i];
      const confirmedSwingsBefore = swings.filter((s) => s.confirmedAtIndex < i);

      const recentHigh = [...confirmedSwingsBefore]
        .reverse()
        .find((s) => s.type === 'HIGH');
      const recentLow = [...confirmedSwingsBefore]
        .reverse()
        .find((s) => s.type === 'LOW');

      // Bullish break: candle close breaks above recent confirmed high
      if (recentHigh && candle.close > recentHigh.price) {
        // If the prior high was a Lower High (reversal), it is a CHoCH
        // If prior high was a Higher High (continuation), it is a BOS
        const isReversal = recentHigh.structuralLabel === 'LH';
        events.push({
          id: `struct-event-bull-${i}`,
          type: isReversal ? 'CHOCH' : 'BOS',
          direction: 'BULLISH',
          brokenLevel: recentHigh.price,
          breakingCandleIndex: i,
          breakingPrice: candle.close,
          time: candle.time,
          timeUtc: candle.timeUtc,
          swingPointId: recentHigh.id,
          reason: isReversal
            ? `Bullish CHoCH: Candle close (${candle.close}) broke above confirmed Lower High (${recentHigh.price})`
            : `Bullish BOS: Candle close (${candle.close}) broke above confirmed Higher High (${recentHigh.price})`,
        });
      }

      // Bearish break: candle close breaks below recent confirmed low
      if (recentLow && candle.close < recentLow.price) {
        const isReversal = recentLow.structuralLabel === 'HL';
        events.push({
          id: `struct-event-bear-${i}`,
          type: isReversal ? 'CHOCH' : 'BOS',
          direction: 'BEARISH',
          brokenLevel: recentLow.price,
          breakingCandleIndex: i,
          breakingPrice: candle.close,
          time: candle.time,
          timeUtc: candle.timeUtc,
          swingPointId: recentLow.id,
          reason: isReversal
            ? `Bearish CHoCH: Candle close (${candle.close}) broke below confirmed Higher Low (${recentLow.price})`
            : `Bearish BOS: Candle close (${candle.close}) broke below confirmed Lower Low (${recentLow.price})`,
        });
      }
    }

    const lastCHoCH = [...events].reverse().find((e) => e.type === 'CHOCH');
    const lastBOS = [...events].reverse().find((e) => e.type === 'BOS');

    return { events, lastCHoCH, lastBOS };
  }
}
