/**
 * TradingOS — Core Domain Types & Strategy Language Definitions
 * Version: 1.0 (v1)
 */

export type AppMode = 'ANALYSIS' | 'BACKTEST' | 'DEMO' | 'LIVE';

export type StrategyStatus = 'DRAFT' | 'TESTING' | 'DEMO' | 'ARCHIVED';

export type AssetClass = 'FOREX' | 'INDICES' | 'COMMODITIES' | 'CRYPTO' | 'STOCKS' | 'SYNTHETIC';

export type Timeframe = 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1' | 'W1';

export type MarketSession = 'SYDNEY' | 'TOKYO' | 'LONDON' | 'NEW_YORK';

export type RuleCategory =
  | 'MARKET_CONTEXT'
  | 'FUNDAMENTALS'
  | 'TECHNICAL_ANALYSIS'
  | 'ENTRY'
  | 'EXIT'
  | 'RISK_MANAGEMENT';

export type DirectionBias = 'LONG' | 'SHORT' | 'BOTH' | 'NEUTRAL';

export type RuleOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN_OR_EQUAL'
  | 'CROSSES_ABOVE'
  | 'CROSSES_BELOW'
  | 'IN_RANGE'
  | 'OUT_OF_RANGE'
  | 'CONTAINS';

export type RuleSource =
  | 'MARKET'
  | 'TECHNICAL'
  | 'FUNDAMENTAL'
  | 'ACCOUNT'
  | 'POSITION'
  | 'STRATEGY_CONTEXT';

export interface FieldComparisonValue {
  type: 'FIELD_REF';
  source: RuleSource;
  field: string;
}

export interface LiteralComparisonValue {
  type: 'LITERAL';
  value: number | string | boolean | [number, number];
}

export type ConditionValue = LiteralComparisonValue | FieldComparisonValue;

export interface StrategyCondition {
  id: string;
  source: RuleSource;
  field: string;
  operator: RuleOperator;
  value: ConditionValue;
  version: 'v1';
  description?: string;
}

export interface GenericStrategyRule {
  id: string;
  strategyId: string;
  category: RuleCategory;
  name: string;
  description: string;
  enabled: boolean;
  priority: number; // 1 (highest) - 10 (lowest)
  group: string;
  logicalOperator: 'AND' | 'OR';
  condition?: StrategyCondition;
  parameters: Record<string, any>;
  validationStatus: 'VALID' | 'WARNING' | 'ERROR';
  createdAt: string;
  updatedAt: string;
}

export interface MarketContextConfig {
  instruments: string[];
  assetClasses: AssetClass[];
  timeframes: Timeframe[];
  sessions: MarketSession[];
  notes: string;
}

export interface FundamentalConditionItem {
  id: string;
  indicator: string;
  expectedState: string;
  importance: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface FundamentalsConfig {
  summary: string;
  notes: string;
  macroFactors: {
    interestRates: string;
    inflation: string;
    centralBankStance: string;
    sentimentScore: number; // 0 - 100
  };
  conditions: FundamentalConditionItem[];
}

export interface TechnicalConditionItem {
  id: string;
  indicator: string;
  timeframe: Timeframe;
  conditionDescription: string;
  weight: number;
}

export interface TechnicalAnalysisConfig {
  summary: string;
  notes: string;
  frameworks: string[];
  conditions: TechnicalConditionItem[];
}

export interface EntryLogicConfig {
  directionBias: DirectionBias;
  summary: string;
  confirmationRequirement: 'ALL_CONDITIONS' | 'MAJORITY' | 'WEIGHTED_SCORE';
  minimumScore?: number;
  triggerEvent: string;
  notes: string;
}

export interface ExitLogicConfig {
  summary: string;
  targetType: 'FIXED_RR' | 'DYNAMIC_STRUCTURE' | 'ATR_TARGET';
  stopType: 'STRUCTURE_INVALIDATION' | 'ATR_TRAILING' | 'FIXED_POINTS';
  timeStopHours?: number;
  technicalReversalExit: boolean;
  notes: string;
}

export interface RiskManagementConfig {
  riskPerTradePercent: number; // e.g. 1.0%
  maxDailyLossPercent: number; // e.g. 3.0%
  maxSimultaneousPositions: number; // e.g. 2
  positionSizingMethod: 'FIXED_PERCENT_EQUITY' | 'FIXED_LOT' | 'VOLATILITY_ADJUSTED' | 'FRACTIONAL_KELLY';
  stopLossRule: string;
  takeProfitRule: string;
  maxDrawdownLimitPercent: number; // e.g. 6.0%
  profitProtectionRules: string[];
  notes: string;
}

export interface StrategyConfiguration {
  marketContext: MarketContextConfig;
  fundamentals: FundamentalsConfig;
  technicalAnalysis: TechnicalAnalysisConfig;
  entryLogic: EntryLogicConfig;
  exitLogic: ExitLogicConfig;
  riskManagement: RiskManagementConfig;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  market: string;
  assetClass: AssetClass;
  status: StrategyStatus;
  version: string;
  tags: string[];
  configuration: StrategyConfiguration;
  rulesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface InstrumentQuote {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  spread: number;
  atr14: number;
  primaryTimeframe: Timeframe;
  activeSession: MarketSession;
  dataSourceType: 'LIVE' | 'DEMO' | 'PLACEHOLDER';
}

export interface MarketSessionInfo {
  session: MarketSession;
  name: string;
  openUtc: string;
  closeUtc: string;
  status: 'OPEN' | 'CLOSED' | 'CLOSING_SOON';
  overlapWith?: MarketSession;
}

export interface EvaluationResultItem {
  ruleId: string;
  ruleName: string;
  category: RuleCategory;
  conditionString: string;
  status: 'PASS' | 'FAIL' | 'SKIPPED';
  evaluatedSourceValue: string | number;
  targetComparisonValue: string | number;
  explainableReason: string;
}

export interface CategoryEvaluationSummary {
  category: RuleCategory;
  passCount: number;
  totalCount: number;
  status: 'PASS' | 'FAIL' | 'WARNING';
}

export interface RuleEvaluationReport {
  strategyId: string;
  strategyName: string;
  instrument: string;
  timestamp: string;
  categories: CategoryEvaluationSummary[];
  results: EvaluationResultItem[];
  overallDecision: 'QUALIFIED' | 'NO_TRADE' | 'RESTRICTED_BY_RISK';
  decisionExplanation: string;
  blockers: string[];
}

export interface TradeDecision {
  id: string;
  strategyId: string;
  strategyName: string;
  market: string;
  assetClass: AssetClass;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  riskRewardRatio: number;
  riskPercent: number;
  calculatedPositionSize: number;
  confidenceScore: number; // 0 - 100
  reasons: string[];
  conditionsSnapshot: {
    fundamentalScore: string;
    technicalAlignment: string;
    riskCheckPassed: boolean;
  };
  mode: AppMode;
  status: 'PROPOSED' | 'APPROVED' | 'DISMISSED' | 'SIMULATED';
  timestamp: string;
}

export interface JournalEntry {
  id: string;
  tradeId?: string;
  strategyId: string;
  strategyName: string;
  instrument: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice?: number;
  stopLoss: number;
  takeProfit: number;
  pnlDollar?: number;
  pnlRMultiple?: number;
  result: 'WIN' | 'LOSS' | 'BREAKEVEN' | 'OPEN';
  marketConditions: string;
  technicalSetup: string;
  fundamentalContext: string;
  userNotes: string;
  lessonsLearned: string;
  disciplineRating: number; // 1 - 5
  timestamp: string;
}

export interface AnalyticsSummary {
  totalTrades: number;
  winRate: number; // e.g. 58.4%
  profitFactor: number; // e.g. 1.85
  expectancyR: number; // e.g. 0.42 R
  avgWinR: number;
  avgLossR: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  mode: AppMode;
}

export type ActiveNavModule =
  | 'dashboard'
  | 'connectivity'
  | 'markets'
  | 'strategy-builder'
  | 'fundamentals'
  | 'technical-analysis'
  | 'risk-management'
  | 'trades'
  | 'journal'
  | 'analytics'
  | 'settings';

export * from './connectivity';
