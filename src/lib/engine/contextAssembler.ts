/**
 * TradingOS — Strategy Engine Core: Context Assembler
 * Assembles multi-timeframe candle datasets, quotes, and account state into a coherent
 * execution context for strategies and evaluation engines.
 */

import { Candle } from './types';
import { Timeframe } from '../../types';
import { CandleEngine } from './candleEngine';

export interface MultiTimeframeContext {
  market: string;
  timestamp: number;
  timestampUtc: string;
  candles: Record<Timeframe, Candle[]>;
  currentCandle: Record<Timeframe, Candle | null>;
}

export class ContextAssembler {
  /**
   * Builds multi-timeframe context strictly up to given timestamp (no lookahead)
   */
  public static assembleContext(
    market: string,
    timestamp: number,
    dataset: {
      H4: Candle[];
      M15: Candle[];
      [key: string]: Candle[];
    }
  ): MultiTimeframeContext {
    const candles: Record<Timeframe, Candle[]> = {
      M1: [],
      M5: [],
      M15: CandleEngine.getVisibleCandles(dataset.M15 || [], timestamp),
      M30: [],
      H1: [],
      H4: CandleEngine.getVisibleCandles(dataset.H4 || [], timestamp),
      D1: [],
      W1: [],
    };

    const currentCandle: Record<Timeframe, Candle | null> = {
      M1: null,
      M5: null,
      M15: candles.M15[candles.M15.length - 1] || null,
      M30: null,
      H1: null,
      H4: candles.H4[candles.H4.length - 1] || null,
      D1: null,
      W1: null,
    };

    return {
      market,
      timestamp,
      timestampUtc: new Date(timestamp).toISOString(),
      candles,
      currentCandle,
    };
  }
}
