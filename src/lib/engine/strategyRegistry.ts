/**
 * TradingOS — Strategy Engine Core: Multi-Strategy Registry
 * Enables diverse strategies to coexist without hardcoding a single universal strategy pattern.
 */

import { SyntheticFibConfig, HistoricalEvaluationReport, Candle } from './types';
import { HistoricalEvaluator } from './historicalEvaluator';

export interface StrategyRunner {
  id: string;
  name: string;
  evaluateHistorical: (
    dataset: {
      H4?: Candle[];
      H1?: Candle[];
      M15?: Candle[];
      M5?: Candle[];
      M1?: Candle[];
      [key: string]: Candle[] | undefined;
    }
  ) => HistoricalEvaluationReport | any;
}

export class StrategyRegistry {
  private static runners: Map<string, StrategyRunner> = new Map();

  public static register(runner: StrategyRunner): void {
    this.runners.set(runner.id, runner);
  }

  public static get(id: string): StrategyRunner | undefined {
    return this.runners.get(id);
  }

  public static list(): StrategyRunner[] {
    return Array.from(this.runners.values());
  }

  public static has(id: string): boolean {
    return this.runners.has(id);
  }
}

export const DEFAULT_SYNTHETIC_FIB_CONFIG: SyntheticFibConfig = {
  name: 'Synthetic Structure Fibonacci',
  direction: 'BOTH',
  higherTimeframe: 'H4',
  entryTimeframe: 'M15',
  h4: {
    structureRequired: true,
    reversalConfirmation: 'CHoCH_THEN_BOS',
    fibonacciRetracement: 50,
    dynamicBeforeActivation: true,
    freezeAfterActivation: true,
    activationRequiresCandleClose: true,
    confirmationBars: 2,
  },
  m15: {
    confirmation: 'CHoCH_THEN_BOS',
    fibonacciRetracement: 50,
    entryTrigger: 'TOUCH',
    confirmationBars: 2,
  },
  risk: {
    initialStop: 'M15_FIB_0',
    takeProfitMode: 'STRUCTURAL',
    fixedRR: false,
    riskPerTradePercent: 1.0,
    maxDailyLossPercent: 3.0,
    maxOpenPositions: 2,
  },
  management: {
    trailingTimeframe: 'H4',
    bullishTrailStructure: 'HL',
    bearishTrailStructure: 'LH',
    oppositeStructureExit: 'H4_CHOCH',
  },
};

// Register the Synthetic Structure + Fibonacci runner
StrategyRegistry.register({
  id: 'strat-synthetic-fib-001',
  name: 'Synthetic Structure Fibonacci',
  evaluateHistorical: (dataset) => {
    return HistoricalEvaluator.evaluate(
      DEFAULT_SYNTHETIC_FIB_CONFIG,
      dataset.H4 || [],
      dataset.M15 || []
    );
  },
});
