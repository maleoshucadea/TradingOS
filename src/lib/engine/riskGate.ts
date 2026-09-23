/**
 * TradingOS — Strategy Engine Core: Risk Gate
 * Gatekeeper enforcing institutional risk controls before any trade proposal or simulation.
 * The strategy itself NEVER executes directly.
 */

import { TradeSignal } from './types';

export interface RiskGateParameters {
  maxOpenPositions: number;
  maxDailyLossPercent: number;
  maxDrawdownLimitPercent: number;
  maxSpreadPoints: number;
  riskPerTradePercent: number;
}

export interface RiskGateEvaluation {
  allowed: boolean;
  code: 'PERMITTED' | 'BLOCKED_BY_RISK';
  reason: string;
  violations: string[];
}

export class RiskGate {
  public static evaluateSignal(
    signal: TradeSignal,
    currentOpenPositionsCount: number,
    currentDailyLossPercent: number,
    currentDrawdownPercent: number,
    currentSpreadPoints: number,
    params: RiskGateParameters
  ): RiskGateEvaluation {
    const violations: string[] = [];

    // 1. Open positions check
    if (currentOpenPositionsCount >= params.maxOpenPositions) {
      violations.push(
        `Max open positions reached (${currentOpenPositionsCount}/${params.maxOpenPositions})`
      );
    }

    // 2. Daily loss ceiling check
    if (currentDailyLossPercent >= params.maxDailyLossPercent) {
      violations.push(
        `Daily loss limit hit (${currentDailyLossPercent.toFixed(2)}% >= ${params.maxDailyLossPercent.toFixed(2)}%)`
      );
    }

    // 3. Max drawdown ceiling check
    if (currentDrawdownPercent >= params.maxDrawdownLimitPercent) {
      violations.push(
        `Max drawdown ceiling reached (${currentDrawdownPercent.toFixed(2)}% >= ${params.maxDrawdownLimitPercent.toFixed(2)}%)`
      );
    }

    // 4. Spread sanity check
    if (currentSpreadPoints > params.maxSpreadPoints) {
      violations.push(
        `Current spread (${currentSpreadPoints} pts) exceeds allowed maximum (${params.maxSpreadPoints} pts)`
      );
    }

    // 5. Valid risk distance
    if (signal.riskDistance <= 0) {
      violations.push(
        `Invalid risk distance (${signal.riskDistance}). Stop loss cannot equal or invert entry price.`
      );
    }

    if (violations.length > 0) {
      return {
        allowed: false,
        code: 'BLOCKED_BY_RISK',
        reason: `Risk gate blocked signal: ${violations.join('; ')}`,
        violations,
      };
    }

    return {
      allowed: true,
      code: 'PERMITTED',
      reason: 'All risk parameters passed. Signal approved for simulation.',
      violations: [],
    };
  }
}
