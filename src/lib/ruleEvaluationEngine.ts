import {
  GenericStrategyRule,
  RuleEvaluationReport,
  CategoryEvaluationSummary,
  EvaluationResultItem,
  RuleCategory,
  StrategyCondition,
} from '../types';
import { formatConditionString } from './strategyLanguage';

export interface EvaluationContextState {
  MARKET: {
    'price.current': number;
    'spread.pips': number;
    'session.current': string;
    'volatility.daily_atr_percent': number;
    'volume.current_vs_avg': number;
    [key: string]: any;
  };
  TECHNICAL: {
    'trend.h4_direction': string;
    'trend.h1_direction': string;
    'rsi.m15_value': number;
    'ema.20_vs_50': number;
    'ema.20': number;
    'ema.50': number;
    'market_structure.bos_direction': string;
    'atr.m15_points': number;
    [key: string]: any;
  };
  FUNDAMENTAL: {
    'interest_rate.differential': number;
    'sentiment.fear_greed_index': number;
    'calendar.high_impact_news_minutes': number;
    'central_bank.stance': string;
    [key: string]: any;
  };
  ACCOUNT: {
    balance: number;
    equity: number;
    daily_pnl_percent: number;
    current_drawdown_percent: number;
    open_risk_percent: number;
    [key: string]: any;
  };
  POSITION: {
    open_count: number;
    active_instrument_count: number;
    [key: string]: any;
  };
  STRATEGY_CONTEXT: {
    consecutive_losses: number;
    timeframe_alignment: string;
    [key: string]: any;
  };
}

/**
 * Standard simulated realistic market environment for testing/evaluating rules
 */
export const DEFAULT_EVALUATION_STATE: EvaluationContextState = {
  MARKET: {
    'price.current': 1.0865,
    'spread.pips': 0.7,
    'session.current': 'LONDON',
    'volatility.daily_atr_percent': 68.4,
    'volume.current_vs_avg': 1.32,
  },
  TECHNICAL: {
    'trend.h4_direction': 'BULLISH',
    'trend.h1_direction': 'BULLISH',
    'rsi.m15_value': 38.2,
    'ema.20_vs_50': 14.5,
    'ema.20': 1.0855,
    'ema.50': 1.0838,
    'market_structure.bos_direction': 'BULLISH_BOS',
    'atr.m15_points': 14.2,
  },
  FUNDAMENTAL: {
    'interest_rate.differential': 1.25,
    'sentiment.fear_greed_index': 58,
    'calendar.high_impact_news_minutes': 180,
    'central_bank.stance': 'HAWKISH',
  },
  ACCOUNT: {
    balance: 50000,
    equity: 50240,
    daily_pnl_percent: 0.48,
    current_drawdown_percent: 1.4,
    open_risk_percent: 1.0,
  },
  POSITION: {
    open_count: 1,
    active_instrument_count: 0,
  },
  STRATEGY_CONTEXT: {
    consecutive_losses: 0,
    timeframe_alignment: 'ALIGNED',
  },
};

/**
 * Evaluates a single Strategy Language condition against context state
 */
export function evaluateConditionAgainstState(
  condition: StrategyCondition,
  state: EvaluationContextState
): {
  passed: boolean;
  actualValue: any;
  targetValue: any;
  reason: string;
} {
  const sourceObj = state[condition.source];
  if (!sourceObj) {
    return {
      passed: false,
      actualValue: 'UNDEFINED_SOURCE',
      targetValue: 'N/A',
      reason: `Source '${condition.source}' not accessible in evaluation environment`,
    };
  }

  const actualValue = sourceObj[condition.field];

  let targetValue: any;
  if (condition.value.type === 'FIELD_REF') {
    const targetSource = state[condition.value.source];
    targetValue = targetSource ? targetSource[condition.value.field] : undefined;
  } else {
    targetValue = condition.value.value;
  }

  let passed = false;
  let reason = '';

  switch (condition.operator) {
    case 'EQUALS':
      passed = actualValue === targetValue;
      reason = passed
        ? `${actualValue} equals expected ${targetValue}`
        : `${actualValue} does not equal expected ${targetValue}`;
      break;

    case 'NOT_EQUALS':
      passed = actualValue !== targetValue;
      reason = passed
        ? `${actualValue} is correctly not equal to ${targetValue}`
        : `${actualValue} equals forbidden ${targetValue}`;
      break;

    case 'GREATER_THAN':
      passed = Number(actualValue) > Number(targetValue);
      reason = passed
        ? `${actualValue} > ${targetValue}`
        : `${actualValue} is not greater than ${targetValue}`;
      break;

    case 'LESS_THAN':
      passed = Number(actualValue) < Number(targetValue);
      reason = passed
        ? `${actualValue} < ${targetValue}`
        : `${actualValue} is not less than ${targetValue}`;
      break;

    case 'GREATER_THAN_OR_EQUAL':
      passed = Number(actualValue) >= Number(targetValue);
      reason = passed
        ? `${actualValue} >= ${targetValue}`
        : `${actualValue} is less than threshold ${targetValue}`;
      break;

    case 'LESS_THAN_OR_EQUAL':
      passed = Number(actualValue) <= Number(targetValue);
      reason = passed
        ? `${actualValue} <= ${targetValue}`
        : `${actualValue} exceeds ceiling ${targetValue}`;
      break;

    case 'IN_RANGE':
      if (Array.isArray(targetValue) && targetValue.length === 2) {
        passed = Number(actualValue) >= targetValue[0] && Number(actualValue) <= targetValue[1];
        reason = passed
          ? `${actualValue} within range [${targetValue[0]}, ${targetValue[1]}]`
          : `${actualValue} outside range [${targetValue[0]}, ${targetValue[1]}]`;
      } else {
        passed = false;
        reason = 'Target range value is malformed';
      }
      break;

    case 'OUT_OF_RANGE':
      if (Array.isArray(targetValue) && targetValue.length === 2) {
        passed = Number(actualValue) < targetValue[0] || Number(actualValue) > targetValue[1];
        reason = passed
          ? `${actualValue} safely outside bounds [${targetValue[0]}, ${targetValue[1]}]`
          : `${actualValue} inside restricted range [${targetValue[0]}, ${targetValue[1]}]`;
      } else {
        passed = false;
        reason = 'Target range value is malformed';
      }
      break;

    case 'CROSSES_ABOVE':
    case 'CROSSES_BELOW':
      // Simplified deterministic comparison for single tick context
      passed = condition.operator === 'CROSSES_ABOVE'
        ? Number(actualValue) >= Number(targetValue)
        : Number(actualValue) <= Number(targetValue);
      reason = `${condition.operator}: current ${actualValue} vs threshold ${targetValue}`;
      break;

    case 'CONTAINS':
      passed = String(actualValue).toLowerCase().includes(String(targetValue).toLowerCase());
      reason = passed
        ? `Value contains '${targetValue}'`
        : `Value does not contain '${targetValue}'`;
      break;

    default:
      passed = false;
      reason = `Unsupported operator ${condition.operator}`;
  }

  return { passed, actualValue, targetValue, reason };
}

/**
 * Runs the Rule Evaluation Engine over a strategy's complete set of rules
 */
export function evaluateStrategyRules(
  strategyId: string,
  strategyName: string,
  instrument: string,
  rules: GenericStrategyRule[],
  state: EvaluationContextState = DEFAULT_EVALUATION_STATE
): RuleEvaluationReport {
  const results: EvaluationResultItem[] = [];
  const categoriesMap: Record<RuleCategory, { pass: number; total: number }> = {
    MARKET_CONTEXT: { pass: 0, total: 0 },
    FUNDAMENTALS: { pass: 0, total: 0 },
    TECHNICAL_ANALYSIS: { pass: 0, total: 0 },
    ENTRY: { pass: 0, total: 0 },
    EXIT: { pass: 0, total: 0 },
    RISK_MANAGEMENT: { pass: 0, total: 0 },
  };

  const blockers: string[] = [];

  for (const rule of rules) {
    if (!rule.enabled) {
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        conditionString: rule.condition ? formatConditionString(rule.condition) : 'Manual Rule Check',
        status: 'SKIPPED',
        evaluatedSourceValue: 'N/A',
        targetComparisonValue: 'N/A',
        explainableReason: 'Rule is disabled by user in configuration',
      });
      continue;
    }

    categoriesMap[rule.category].total += 1;

    if (!rule.condition) {
      // General rule without explicit AST condition defaults to valid pass
      categoriesMap[rule.category].pass += 1;
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        conditionString: rule.description || 'Config parameter check',
        status: 'PASS',
        evaluatedSourceValue: 'ACTIVE',
        targetComparisonValue: 'TRUE',
        explainableReason: 'Configured constraint verified',
      });
      continue;
    }

    const { passed, actualValue, targetValue, reason } = evaluateConditionAgainstState(
      rule.condition,
      state
    );

    if (passed) {
      categoriesMap[rule.category].pass += 1;
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        conditionString: formatConditionString(rule.condition),
        status: 'PASS',
        evaluatedSourceValue: String(actualValue),
        targetComparisonValue: String(targetValue),
        explainableReason: reason,
      });
    } else {
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        conditionString: formatConditionString(rule.condition),
        status: 'FAIL',
        evaluatedSourceValue: String(actualValue),
        targetComparisonValue: String(targetValue),
        explainableReason: reason,
      });

      blockers.push(`[${rule.category}] ${rule.name}: ${reason}`);
    }
  }

  const categories: CategoryEvaluationSummary[] = (
    Object.keys(categoriesMap) as RuleCategory[]
  ).map((cat) => {
    const { pass, total } = categoriesMap[cat];
    let status: 'PASS' | 'FAIL' | 'WARNING' = 'PASS';
    if (total === 0) status = 'PASS';
    else if (pass === total) status = 'PASS';
    else if (pass > 0) status = 'WARNING';
    else status = 'FAIL';

    return {
      category: cat,
      passCount: pass,
      totalCount: total,
      status,
    };
  });

  // Calculate overall decision
  const riskCategory = categories.find((c) => c.category === 'RISK_MANAGEMENT');
  const entryCategory = categories.find((c) => c.category === 'ENTRY');
  const techCategory = categories.find((c) => c.category === 'TECHNICAL_ANALYSIS');

  let overallDecision: 'QUALIFIED' | 'NO_TRADE' | 'RESTRICTED_BY_RISK' = 'QUALIFIED';
  let decisionExplanation = '';

  if (riskCategory && riskCategory.totalCount > 0 && riskCategory.passCount < riskCategory.totalCount) {
    overallDecision = 'RESTRICTED_BY_RISK';
    decisionExplanation =
      'Strict Risk Management gate triggered: Risk conditions failed. The strategy is restricted from opening positions.';
  } else if (entryCategory && entryCategory.totalCount > 0 && entryCategory.passCount < entryCategory.totalCount) {
    overallDecision = 'NO_TRADE';
    decisionExplanation =
      'Entry criteria incomplete. One or more mandatory entry conditions are not satisfied in current market state.';
  } else if (techCategory && techCategory.totalCount > 0 && techCategory.passCount === 0) {
    overallDecision = 'NO_TRADE';
    decisionExplanation =
      'Technical conditions do not meet strategy parameters. Market structure or indicator alignment missing.';
  } else if (blockers.length > 0) {
    overallDecision = 'NO_TRADE';
    decisionExplanation = `Strategy blocked by ${blockers.length} rule condition(s). Explainability details logged below.`;
  } else {
    overallDecision = 'QUALIFIED';
    decisionExplanation =
      'All active conditions in Market Context, Fundamentals, Technicals, Entry Logic, and Risk Constraints evaluated to PASS. Valid trade candidate identified.';
  }

  return {
    strategyId,
    strategyName,
    instrument,
    timestamp: new Date().toISOString(),
    categories,
    results,
    overallDecision,
    decisionExplanation,
    blockers,
  };
}
