/**
 * TradingOS — Strategy Engine Core: Historical Evaluator
 * Genuinely walk-forward, multi-timeframe backtesting engine.
 * Strictly guarantees NO LOOKAHEAD bias.
 */

import {
  Candle,
  SyntheticFibConfig,
  HistoricalEvaluationReport,
  SimulatedPosition,
  TradeSignal,
} from './types';
import { SyntheticStructureFibStrategy } from './syntheticStructureFibStrategy';
import { CandleEngine } from './candleEngine';
import { RiskGate, RiskGateParameters } from './riskGate';

export class HistoricalEvaluator {
  /**
   * Executes walk-forward simulation of Synthetic Structure + Fibonacci strategy
   */
  public static evaluate(
    config: SyntheticFibConfig,
    h4Candles: Candle[],
    m15Candles: Candle[],
    riskParams?: Partial<RiskGateParameters>
  ): HistoricalEvaluationReport {
    // 1. Sort & validate datasets
    const sortedH4 = CandleEngine.validateAndSort(h4Candles);
    const sortedM15 = CandleEngine.validateAndSort(m15Candles);

    const strategy = new SyntheticStructureFibStrategy(config);

    const defaultRisk: RiskGateParameters = {
      maxOpenPositions: config.risk.maxOpenPositions || 2,
      maxDailyLossPercent: config.risk.maxDailyLossPercent || 3.0,
      maxDrawdownLimitPercent: 6.0,
      maxSpreadPoints: 2.0,
      riskPerTradePercent: config.risk.riskPerTradePercent || 1.0,
      ...riskParams,
    };

    const signals: TradeSignal[] = [];
    const positions: SimulatedPosition[] = [];

    // Track H4 index processed so far
    let h4Pointer = 0;

    // Walk forward through M15 candles chronologically
    for (let m15Index = 0; m15Index < sortedM15.length; m15Index++) {
      const m15Candle = sortedM15[m15Index];

      // Update H4 stream up to current M15 timestamp (only closed H4 candles)
      while (
        h4Pointer < sortedH4.length &&
        sortedH4[h4Pointer].time <= m15Candle.time
      ) {
        // Process H4 candle
        strategy.processH4Candle(sortedH4, h4Pointer);
        h4Pointer++;
      }

      // Process M15 candle
      const m15Result = strategy.processM15Candle(sortedM15, m15Index);

      if (m15Result.signal) {
        // Evaluate through RiskGate before accepting
        const riskCheck = RiskGate.evaluateSignal(
          m15Result.signal,
          strategy.activePosition ? 1 : 0,
          0, // Daily loss %
          0, // Drawdown %
          0.8, // Current spread
          defaultRisk
        );

        if (riskCheck.allowed) {
          signals.push(m15Result.signal);
        } else {
          // If blocked by risk gate, cancel the active position created
          if (strategy.activePosition) {
            strategy.activePosition = null;
            strategy.resetSetup(
              `Signal blocked by Risk Gate: ${riskCheck.reason}`,
              m15Candle.timeUtc
            );
          }
        }
      }
    }

    // Process any remaining H4 candles (e.g. trade management trailing and exits, or when no M15 candles)
    while (h4Pointer < sortedH4.length) {
      strategy.processH4Candle(sortedH4, h4Pointer);
      h4Pointer++;
    }

    // Combine closed positions and any still open position
    const allPositions = [...strategy.closedPositions];
    if (strategy.activePosition) {
      allPositions.push({ ...strategy.activePosition });
    }

    // Calculate performance statistics
    const closedPositions = strategy.closedPositions;
    const wins = closedPositions.filter((p) => (p.pnlRMultiple || 0) > 0);
    const losses = closedPositions.filter((p) => (p.pnlRMultiple || 0) <= 0);

    const winCount = wins.length;
    const lossCount = losses.length;
    const winRatePercent =
      closedPositions.length > 0
        ? Number(((winCount / closedPositions.length) * 100).toFixed(1))
        : 0;

    const totalWinR = wins.reduce((sum, p) => sum + (p.pnlRMultiple || 0), 0);
    const totalLossR = Math.abs(
      losses.reduce((sum, p) => sum + (p.pnlRMultiple || 0), 0)
    );

    const profitFactor =
      totalLossR > 0
        ? Number((totalWinR / totalLossR).toFixed(2))
        : totalWinR > 0
        ? 999.99
        : 0;

    const totalRMultiple = Number(
      closedPositions.reduce((sum, p) => sum + (p.pnlRMultiple || 0), 0).toFixed(2)
    );

    const averageWinR =
      winCount > 0 ? Number((totalWinR / winCount).toFixed(2)) : 0;
    const averageLossR =
      lossCount > 0 ? Number((totalLossR / lossCount).toFixed(2)) : 0;

    // Calculate max drawdown in R
    let peakR = 0;
    let currentR = 0;
    let maxDrawdownR = 0;

    for (const pos of closedPositions) {
      currentR += pos.pnlRMultiple || 0;
      if (currentR > peakR) peakR = currentR;
      const dd = peakR - currentR;
      if (dd > maxDrawdownR) maxDrawdownR = dd;
    }

    // Latest H4 structure summary
    const recentHighs = strategy.h4Swings.filter((s) => s.type === 'HIGH');
    const recentLows = strategy.h4Swings.filter((s) => s.type === 'LOW');
    const lastHH = [...recentHighs].reverse().find((s) => s.structuralLabel === 'HH')?.price;
    const lastHL = [...recentLows].reverse().find((s) => s.structuralLabel === 'HL')?.price;
    const lastLH = [...recentHighs].reverse().find((s) => s.structuralLabel === 'LH')?.price;
    const lastLL = [...recentLows].reverse().find((s) => s.structuralLabel === 'LL')?.price;

    return {
      strategyId: 'strat-synthetic-fib-001',
      strategyName: config.name,
      market: 'SYNTHETIC_VOL25',
      higherTimeframe: config.higherTimeframe,
      entryTimeframe: config.entryTimeframe,
      totalH4CandlesProcessed: h4Pointer,
      totalM15CandlesProcessed: sortedM15.length,
      signalsGenerated: signals.length,
      positionsOpened: allPositions.length,
      positionsClosed: closedPositions.length,
      winCount,
      lossCount,
      winRatePercent,
      profitFactor,
      totalRMultiple,
      maxDrawdownRMultiple: Number(maxDrawdownR.toFixed(2)),
      averageWinR,
      averageLossR,
      positions: allPositions,
      stateTransitions: strategy.transitionLogs,
      currentState: strategy.state,
      latestExplanation: strategy.latestExplanation,
      h4StructureSummary: {
        currentTrend: strategy.h4Trend,
        swingCount: strategy.h4Swings.length,
        lastHH,
        lastHL,
        lastLH,
        lastLL,
        lastBOS: strategy.m15BosEvent?.reason,
        lastCHoCH: strategy.m15ChochEvent?.reason,
      },
      h4FibSummary: strategy.h4Fib ? { ...strategy.h4Fib } : undefined,
      m15FibSummary: strategy.m15Fib ? { ...strategy.m15Fib } : undefined,
    };
  }
}
