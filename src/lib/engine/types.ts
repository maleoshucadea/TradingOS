/**
 * TradingOS — Strategy Engine Core Types
 * Normalized domain models for Candles, Market Structure, Swings, Fibonacci,
 * State Machine, Signals, Risk Gates, and Historical Walk-Forward Evaluation.
 */

import type { Timeframe } from '../../types';
export type { Timeframe };

export interface Candle {
  time: number; // Unix timestamp in seconds or ms
  timeUtc: string; // ISO string for human readability / explainability
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  confirmed: boolean; // True when candle bar has completed and closed
}

export type SwingType = 'HIGH' | 'LOW';

export interface SwingPoint {
  id: string;
  type: SwingType;
  price: number;
  candleIndex: number;
  time: number;
  timeUtc: string;
  confirmedAtIndex: number; // Index of the candle where this swing was confirmed (no lookahead)
  structuralLabel?: 'HH' | 'HL' | 'LH' | 'LL';
}

export type TrendDirection = 'BULLISH' | 'BEARISH' | 'RANGING' | 'UNDEFINED';

export interface StructureEvent {
  id: string;
  type: 'CHOCH' | 'BOS';
  direction: 'BULLISH' | 'BEARISH';
  brokenLevel: number;
  breakingCandleIndex: number;
  breakingPrice: number;
  time: number;
  timeUtc: string;
  swingPointId: string;
  reason: string;
}

export interface ImpulsiveMove {
  direction: 'BULLISH' | 'BEARISH';
  originPrice: number;
  originTime: number;
  originIndex: number;
  originSwingId?: string;
  endpointPrice: number;
  endpointTime: number;
  endpointIndex: number;
  endpointSwingId?: string;
  associatedEventId?: string;
}

export interface FibonacciLevels {
  direction: 'BULLISH' | 'BEARISH';
  originZeroLevel: number; // 0%
  endpointHundredLevel: number; // 100%
  fiftyPercentLevel: number; // 50%
  isDynamic: boolean;
  isFrozen: boolean;
  activatedTime?: string;
  frozenAtCandleIndex?: number;
}

export type SyntheticStrategyState =
  | 'NO_SETUP'
  | 'H4_DIRECTION_IDENTIFIED'
  | 'H4_IMPULSE_IDENTIFIED'
  | 'H4_FIB_ACTIVE'
  | 'WAITING_FOR_H4_50'
  | 'H4_50_CONFIRMED'
  | 'H4_FIB_FROZEN'
  | 'WAITING_FOR_M15_CHOCH'
  | 'M15_CHOCH_CONFIRMED'
  | 'WAITING_FOR_M15_BOS'
  | 'M15_CONFIRMATION_COMPLETE'
  | 'M15_FIB_ACTIVE'
  | 'WAITING_FOR_M15_50_ENTRY'
  | 'ENTRY_TRIGGERED'
  | 'TRADE_ACTIVE'
  | 'TRAILING_STRUCTURE'
  | 'TRADE_CLOSED'
  | 'INVALIDATED'
  | 'RESET_REQUIRED';

export type ExitReason =
  | 'INITIAL_SL'
  | 'TRAILING_SL'
  | 'OPPOSITE_4H_CHOCH'
  | 'MANUAL'
  | 'SYSTEM_EXIT'
  | 'DATA_ERROR';

export type EntryTriggerMode = 'TOUCH' | 'CLOSE' | 'REJECTION';

export interface SyntheticFibConfig {
  name: string;
  direction: 'BOTH' | 'LONG' | 'SHORT';
  higherTimeframe: Timeframe; // 'H4'
  entryTimeframe: Timeframe; // 'M15'
  h4: {
    structureRequired: boolean;
    reversalConfirmation: 'CHoCH_THEN_BOS';
    fibonacciRetracement: number; // 50
    dynamicBeforeActivation: boolean;
    freezeAfterActivation: boolean;
    activationRequiresCandleClose: boolean;
    confirmationBars: number; // Pivot strength (default: 2)
  };
  m15: {
    confirmation: 'CHoCH_THEN_BOS';
    fibonacciRetracement: number; // 50
    entryTrigger: EntryTriggerMode; // 'TOUCH'
    confirmationBars: number; // Pivot strength (default: 2)
  };
  risk: {
    initialStop: 'M15_FIB_0';
    takeProfitMode: 'STRUCTURAL';
    fixedRR: boolean; // false
    riskPerTradePercent: number;
    maxDailyLossPercent: number;
    maxOpenPositions: number;
  };
  management: {
    trailingTimeframe: Timeframe; // 'H4'
    bullishTrailStructure: 'HL';
    bearishTrailStructure: 'LH';
    oppositeStructureExit: 'H4_CHOCH';
  };
}

export interface TradeSignal {
  id: string;
  strategyId: string;
  strategyName: string;
  market: string;
  direction: 'BUY' | 'SELL';
  time: number;
  timeUtc: string;
  entryPrice: number;
  initialStopLoss: number;
  riskDistance: number;
  triggerMode: EntryTriggerMode;
  reason: string;
  h4FibSnapshot: FibonacciLevels;
  m15FibSnapshot: FibonacciLevels;
}

export interface SimulatedPosition {
  id: string;
  strategyId: string;
  strategyName: string;
  market: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  entryTime: number;
  entryTimeUtc: string;
  currentStopLoss: number;
  initialStopLoss: number;
  riskDistance: number;
  status: 'OPEN' | 'CLOSED';
  exitPrice?: number;
  exitTime?: number;
  exitTimeUtc?: string;
  exitReason?: ExitReason;
  pnlPoints?: number;
  pnlRMultiple?: number;
  highestPriceReached?: number;
  lowestPriceReached?: number;
  trailingEvents: {
    time: number;
    timeUtc: string;
    newStop: number;
    structurePointPrice: number;
    reason: string;
  }[];
}

export interface HistoricalEvaluationReport {
  strategyId: string;
  strategyName: string;
  market: string;
  higherTimeframe: Timeframe;
  entryTimeframe: Timeframe;
  totalH4CandlesProcessed: number;
  totalM15CandlesProcessed: number;
  signalsGenerated: number;
  positionsOpened: number;
  positionsClosed: number;
  winCount: number;
  lossCount: number;
  winRatePercent: number;
  profitFactor: number;
  totalRMultiple: number;
  maxDrawdownRMultiple: number;
  averageWinR: number;
  averageLossR: number;
  positions: SimulatedPosition[];
  stateTransitions: {
    timeUtc: string;
    from: SyntheticStrategyState;
    to: SyntheticStrategyState;
    reason: string;
  }[];
  currentState: SyntheticStrategyState;
  latestExplanation: string;
  h4StructureSummary: {
    currentTrend: TrendDirection;
    swingCount: number;
    lastHH?: number;
    lastHL?: number;
    lastLH?: number;
    lastLL?: number;
    lastBOS?: string;
    lastCHoCH?: string;
  };
  h4FibSummary?: FibonacciLevels;
  m15FibSummary?: FibonacciLevels;
}

export interface DataQualityReport {
  symbol: string;
  timeframe: Timeframe;
  totalRetrieved: number;
  validCount: number;
  incompleteCountRemoved: number;
  duplicatesRemoved: number;
  gapsDetected: Array<{ fromUtc: string; toUtc: string; missingDurationMs: number }>;
  firstCandleUtc: string | null;
  lastCandleUtc: string | null;
  status: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'INSUFFICIENT';
  warnings: string[];
}

export interface RealBacktestReport extends HistoricalEvaluationReport {
  dataSource: 'REAL_DERIV_HISTORICAL' | 'REAL_DERIV_BROWSER_WS';
  symbol: string;
  startDate: string;
  endDate: string;
  h4DataQuality: DataQualityReport;
  m15DataQuality: DataQualityReport;
  metrics: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRatePercent: number;
    netRMultiple: number;
    avgRMultiple: number;
    avgWinRMultiple: number;
    avgLossRMultiple: number;
    maxDrawdownRMultiple: number;
    profitFactor: number | null;
  };
}

export interface DerivRawCandle {
  epoch: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}
