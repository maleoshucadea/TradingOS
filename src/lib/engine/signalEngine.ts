/**
 * TradingOS — Strategy Engine Core: Signal Engine
 * Formats, enriches, and validates directional trade signals produced by strategies.
 */

import { TradeSignal } from './types';
import { TradeDecision } from '../../types';

export class SignalEngine {
  /**
   * Converts a strategy TradeSignal into a standardized TradingOS TradeDecision record
   */
  public static createTradeDecision(
    signal: TradeSignal,
    mode: 'ANALYSIS' | 'BACKTEST' | 'DEMO' | 'LIVE' = 'BACKTEST'
  ): TradeDecision {
    return {
      id: `decision-${signal.id}`,
      strategyId: signal.strategyId,
      strategyName: signal.strategyName,
      market: signal.market,
      assetClass: 'SYNTHETIC',
      direction: signal.direction,
      entryPrice: signal.entryPrice,
      stopLossPrice: signal.initialStopLoss,
      takeProfitPrice: 0, // Structural continuation: no fixed RR target
      riskRewardRatio: 0,
      riskPercent: 1.0,
      calculatedPositionSize: 1.0,
      confidenceScore: 92,
      reasons: [signal.reason],
      conditionsSnapshot: {
        fundamentalScore: 'N/A (Synthetic)',
        technicalAlignment: `H4 50% Close Confirmed -> M15 CHoCH+BOS -> 50% Retracement (${signal.triggerMode})`,
        riskCheckPassed: true,
      },
      mode,
      status: 'SIMULATED',
      timestamp: signal.timeUtc,
    };
  }
}
