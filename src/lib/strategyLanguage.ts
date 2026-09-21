import { RuleSource, RuleOperator, StrategyCondition } from '../types';

export interface FieldDefinition {
  source: RuleSource;
  field: string;
  name: string;
  dataType: 'number' | 'string' | 'boolean';
  unit?: string;
  description: string;
  example: string | number;
  options?: string[];
}

export const STRATEGY_LANGUAGE_FIELDS: FieldDefinition[] = [
  // MARKET source
  {
    source: 'MARKET',
    field: 'price.current',
    name: 'Current Market Price',
    dataType: 'number',
    description: 'Current real-time / bar close price of active instrument',
    example: 1.0850,
  },
  {
    source: 'MARKET',
    field: 'spread.pips',
    name: 'Bid-Ask Spread',
    dataType: 'number',
    unit: 'pips',
    description: 'Current broker spread in pips/points',
    example: 0.8,
  },
  {
    source: 'MARKET',
    field: 'session.current',
    name: 'Active Market Session',
    dataType: 'string',
    description: 'Current trading session',
    example: 'LONDON',
    options: ['SYDNEY', 'TOKYO', 'LONDON', 'NEW_YORK', 'OVERLAP_LONDON_NY'],
  },
  {
    source: 'MARKET',
    field: 'volatility.daily_atr_percent',
    name: 'Daily ATR Volatility',
    dataType: 'number',
    unit: '%',
    description: 'Current daily range as percentage of average 14-day ATR',
    example: 74.5,
  },
  {
    source: 'MARKET',
    field: 'volume.current_vs_avg',
    name: 'Relative Volume Ratio',
    dataType: 'number',
    unit: 'x',
    description: 'Current bar volume divided by 20-period moving average',
    example: 1.45,
  },

  // TECHNICAL source
  {
    source: 'TECHNICAL',
    field: 'trend.h4_direction',
    name: 'H4 Trend Direction',
    dataType: 'string',
    description: 'Market structure higher-timeframe trend direction',
    example: 'BULLISH',
    options: ['BULLISH', 'BEARISH', 'RANGING'],
  },
  {
    source: 'TECHNICAL',
    field: 'trend.h1_direction',
    name: 'H1 Trend Direction',
    dataType: 'string',
    description: 'Intermediate trend direction on 1-hour timeframe',
    example: 'BULLISH',
    options: ['BULLISH', 'BEARISH', 'RANGING'],
  },
  {
    source: 'TECHNICAL',
    field: 'rsi.m15_value',
    name: 'RSI (14) on M15',
    dataType: 'number',
    unit: '0-100',
    description: 'Relative Strength Index on execution timeframe',
    example: 28.5,
  },
  {
    source: 'TECHNICAL',
    field: 'ema.20_vs_50',
    name: 'EMA 20 vs 50 Distance',
    dataType: 'number',
    unit: 'points',
    description: 'Distance between 20 Exponential Moving Average and 50 EMA',
    example: 12.4,
  },
  {
    source: 'TECHNICAL',
    field: 'ema.20',
    name: 'EMA 20 Value',
    dataType: 'number',
    description: 'Exponential Moving Average 20 value',
    example: 1.0840,
  },
  {
    source: 'TECHNICAL',
    field: 'ema.50',
    name: 'EMA 50 Value',
    dataType: 'number',
    description: 'Exponential Moving Average 50 value',
    example: 1.0825,
  },
  {
    source: 'TECHNICAL',
    field: 'market_structure.bos_direction',
    name: 'Break of Structure (BOS)',
    dataType: 'string',
    description: 'Recent structural swing break direction',
    example: 'BULLISH_BOS',
    options: ['BULLISH_BOS', 'BEARISH_BOS', 'NONE'],
  },
  {
    source: 'TECHNICAL',
    field: 'atr.m15_points',
    name: 'ATR (14) on M15',
    dataType: 'number',
    unit: 'points',
    description: 'Average True Range on M15 timeframe',
    example: 18.0,
  },

  // FUNDAMENTAL source
  {
    source: 'FUNDAMENTAL',
    field: 'interest_rate.differential',
    name: 'Central Bank Rate Spread',
    dataType: 'number',
    unit: '%',
    description: 'Net interest rate differential between base and quote currency',
    example: 1.25,
  },
  {
    source: 'FUNDAMENTAL',
    field: 'sentiment.fear_greed_index',
    name: 'Sentiment Fear & Greed Index',
    dataType: 'number',
    unit: '0-100',
    description: 'Aggregate macro and retail positioning sentiment score',
    example: 64,
  },
  {
    source: 'FUNDAMENTAL',
    field: 'calendar.high_impact_news_minutes',
    name: 'Minutes Until High-Impact News',
    dataType: 'number',
    unit: 'min',
    description: 'Minutes remaining until tier-1 macro announcement (CPI, NFP, Fed)',
    example: 120,
  },
  {
    source: 'FUNDAMENTAL',
    field: 'central_bank.stance',
    name: 'Central Bank Monetary Stance',
    dataType: 'string',
    description: 'Dominant monetary policy policy bias',
    example: 'HAWKISH',
    options: ['HAWKISH', 'NEUTRAL', 'DOVISH'],
  },

  // ACCOUNT source
  {
    source: 'ACCOUNT',
    field: 'balance',
    name: 'Account Balance',
    dataType: 'number',
    unit: '$',
    description: 'Current cash balance of account',
    example: 50000,
  },
  {
    source: 'ACCOUNT',
    field: 'equity',
    name: 'Account Equity',
    dataType: 'number',
    unit: '$',
    description: 'Total balance + floating unrealized P&L',
    example: 50420,
  },
  {
    source: 'ACCOUNT',
    field: 'daily_pnl_percent',
    name: 'Daily P&L Percentage',
    dataType: 'number',
    unit: '%',
    description: 'Closed + open net profit/loss for the active trading day',
    example: -0.8,
  },
  {
    source: 'ACCOUNT',
    field: 'current_drawdown_percent',
    name: 'Current Drawdown from High Watermark',
    dataType: 'number',
    unit: '%',
    description: 'Percentage drawdown from peak equity',
    example: 2.1,
  },
  {
    source: 'ACCOUNT',
    field: 'open_risk_percent',
    name: 'Total Open Risk Exposure',
    dataType: 'number',
    unit: '%',
    description: 'Combined risk at stop loss across all currently open positions',
    example: 1.5,
  },

  // POSITION source
  {
    source: 'POSITION',
    field: 'open_count',
    name: 'Open Positions Count',
    dataType: 'number',
    description: 'Number of currently active trades in the portfolio',
    example: 1,
  },
  {
    source: 'POSITION',
    field: 'active_instrument_count',
    name: 'Instrument Position Count',
    dataType: 'number',
    description: 'Open positions specifically on this target instrument',
    example: 0,
  },

  // STRATEGY_CONTEXT source
  {
    source: 'STRATEGY_CONTEXT',
    field: 'consecutive_losses',
    name: 'Consecutive Strategy Losses',
    dataType: 'number',
    description: 'Count of back-to-back losing trades under this strategy',
    example: 1,
  },
  {
    source: 'STRATEGY_CONTEXT',
    field: 'timeframe_alignment',
    name: 'Multi-Timeframe Alignment',
    dataType: 'string',
    description: 'Whether H4, H1, and M15 trends are in agreement',
    example: 'ALIGNED',
    options: ['ALIGNED', 'CONFLICTING', 'MIXED'],
  },
];

export const OPERATOR_LABELS: Record<RuleOperator, string> = {
  EQUALS: '== (Equals)',
  NOT_EQUALS: '!= (Not Equals)',
  GREATER_THAN: '> (Greater Than)',
  LESS_THAN: '< (Less Than)',
  GREATER_THAN_OR_EQUAL: '>= (Greater or Equal)',
  LESS_THAN_OR_EQUAL: '<= (Less or Equal)',
  CROSSES_ABOVE: 'Crosses Above',
  CROSSES_BELOW: 'Crosses Below',
  IN_RANGE: 'In Range [min, max]',
  OUT_OF_RANGE: 'Outside Range',
  CONTAINS: 'Contains',
};

export const OPERATOR_SYMBOLS: Record<RuleOperator, string> = {
  EQUALS: '==',
  NOT_EQUALS: '!=',
  GREATER_THAN: '>',
  LESS_THAN: '<',
  GREATER_THAN_OR_EQUAL: '>=',
  LESS_THAN_OR_EQUAL: '<=',
  CROSSES_ABOVE: '↗ crosses above',
  CROSSES_BELOW: '↘ crosses below',
  IN_RANGE: '∈ in range',
  OUT_OF_RANGE: '∉ outside range',
  CONTAINS: '∋ contains',
};

/**
 * Format a structured StrategyCondition into human-readable Strategy Language string
 */
export function formatConditionString(condition: StrategyCondition): string {
  const leftSide = `${condition.source}.${condition.field}`;
  const op = OPERATOR_SYMBOLS[condition.operator] || condition.operator;

  let rightSide = '';
  if (condition.value.type === 'FIELD_REF') {
    rightSide = `${condition.value.source}.${condition.value.field}`;
  } else {
    const val = condition.value.value;
    if (Array.isArray(val)) {
      rightSide = `[${val[0]}, ${val[1]}]`;
    } else if (typeof val === 'string') {
      rightSide = `"${val}"`;
    } else {
      rightSide = String(val);
    }
  }

  return `${leftSide} ${op} ${rightSide}`;
}

/**
 * Validates a condition structurally and semantically
 */
export function validateCondition(condition: StrategyCondition): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!condition.source) errors.push('Source is required');
  if (!condition.field) errors.push('Field is required');
  if (!condition.operator) errors.push('Operator is required');
  if (!condition.value) errors.push('Value is required');

  const fieldDef = STRATEGY_LANGUAGE_FIELDS.find(
    (f) => f.source === condition.source && f.field === condition.field
  );

  if (!fieldDef) {
    errors.push(`Field '${condition.field}' is not registered in source '${condition.source}'`);
  }

  if (condition.value && condition.value.type === 'FIELD_REF') {
    const val = condition.value;
    const targetDef = STRATEGY_LANGUAGE_FIELDS.find(
      (f) => f.source === val.source && f.field === val.field
    );
    if (!targetDef) {
      errors.push(`Target comparison field '${val.field}' not found`);
    } else if (fieldDef && targetDef.dataType !== fieldDef.dataType) {
      errors.push(
        `Type mismatch: comparing ${fieldDef.dataType} (${fieldDef.field}) to ${targetDef.dataType} (${targetDef.field})`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
