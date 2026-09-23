/**
 * TradingOS — Strategy Engine Core: Candle Engine
 * Manages multi-timeframe candle streams, validation, indexing, and walk-forward feeding.
 * Strictly guarantees no lookahead bias.
 */

import { Candle } from './types';
import { Timeframe } from '../../types';

export class CandleEngine {
  /**
   * Sorts candles chronologically and validates OHLC integrity
   */
  public static validateAndSort(candles: Candle[]): Candle[] {
    const sorted = [...candles].sort((a, b) => a.time - b.time);

    for (let i = 0; i < sorted.length; i++) {
      const c = sorted[i];
      if (c.low > c.high) {
        throw new Error(
          `Invalid candle at index ${i} (${c.timeUtc}): low (${c.low}) cannot exceed high (${c.high})`
        );
      }
      if (c.open < c.low || c.open > c.high) {
        throw new Error(
          `Invalid candle at index ${i} (${c.timeUtc}): open (${c.open}) outside [low, high]`
        );
      }
      if (c.close < c.low || c.close > c.high) {
        throw new Error(
          `Invalid candle at index ${i} (${c.timeUtc}): close (${c.close}) outside [low, high]`
        );
      }
    }

    return sorted;
  }

  /**
   * Slices candle dataset up to a specific timestamp T, ensuring candles with
   * timestamp > T are completely hidden (strict lookahead prevention).
   */
  public static getVisibleCandles(allCandles: Candle[], currentTimestamp: number): Candle[] {
    return allCandles.filter((c) => c.time <= currentTimestamp);
  }

  /**
   * Returns timeframe duration in milliseconds
   */
  public static getTimeframeDurationMs(timeframe: Timeframe): number {
    switch (timeframe) {
      case 'M1':
        return 60 * 1000;
      case 'M5':
        return 5 * 60 * 1000;
      case 'M15':
        return 15 * 60 * 1000;
      case 'M30':
        return 30 * 60 * 1000;
      case 'H1':
        return 60 * 60 * 1000;
      case 'H4':
        return 4 * 60 * 60 * 1000;
      case 'D1':
        return 24 * 60 * 60 * 1000;
      case 'W1':
        return 7 * 24 * 60 * 60 * 1000;
      default:
        return 60 * 1000;
    }
  }

  /**
   * Helper to build a clean synthetic candle
   */
  public static createCandle(
    timeMs: number,
    open: number,
    high: number,
    low: number,
    close: number,
    volume: number = 100
  ): Candle {
    return {
      time: timeMs,
      timeUtc: new Date(timeMs).toISOString(),
      open,
      high,
      low,
      close,
      volume,
      confirmed: true,
    };
  }
}
