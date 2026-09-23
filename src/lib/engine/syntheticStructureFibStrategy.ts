/**
 * TradingOS — Strategy Engine Core: Synthetic Structure + Fibonacci Strategy
 * Implements the deterministic state machine for H4 -> M15 structural continuation.
 *
 * Sequence:
 * H4 STRUCTURE -> H4 IMPULSIVE MOVE -> H4 DYNAMIC FIBONACCI -> H4 50% CLOSE -> FREEZE H4 FIB
 * -> M15 CHoCH -> M15 BOS -> M15 FIBONACCI -> M15 50% ENTRY -> TRADE -> H4 STRUCTURAL TRAILING -> EXIT
 */

import {
  Candle,
  SwingPoint,
  TrendDirection,
  StructureEvent,
  FibonacciLevels,
  SyntheticStrategyState,
  SyntheticFibConfig,
  TradeSignal,
  SimulatedPosition,
  ExitReason,
} from './types';
import { MarketStructureEngine } from './marketStructure';

export interface StateTransitionLog {
  timeUtc: string;
  from: SyntheticStrategyState;
  to: SyntheticStrategyState;
  reason: string;
}

export class SyntheticStructureFibStrategy {
  public config: SyntheticFibConfig;
  public state: SyntheticStrategyState = 'NO_SETUP';
  public direction: 'BUY' | 'SELL' | null = null;

  // H4 Setup Data
  public h4Swings: SwingPoint[] = [];
  public h4Trend: TrendDirection = 'UNDEFINED';
  public h4Fib: FibonacciLevels | null = null;
  public h4ImpulseOrigin: SwingPoint | null = null;
  public h4ImpulseEnd: SwingPoint | null = null;

  // M15 Setup Data
  public m15Swings: SwingPoint[] = [];
  public m15ChochConfirmed: boolean = false;
  public m15ChochEvent: StructureEvent | null = null;
  public m15ChochOriginSwing: SwingPoint | null = null;
  public m15BosConfirmed: boolean = false;
  public m15BosEvent: StructureEvent | null = null;
  public m15Fib: FibonacciLevels | null = null;

  // Active Trade Data
  public activePosition: SimulatedPosition | null = null;
  public closedPositions: SimulatedPosition[] = [];
  public transitionLogs: StateTransitionLog[] = [];
  public latestExplanation: string = 'Strategy initialized. Waiting for H4 confirmed market structure.';

  constructor(config: SyntheticFibConfig) {
    this.config = config;
  }

  private logTransition(to: SyntheticStrategyState, reason: string, timeUtc: string) {
    const from = this.state;
    this.state = to;
    this.latestExplanation = reason;
    this.transitionLogs.push({
      timeUtc,
      from,
      to,
      reason,
    });
  }

  /**
   * Resets the strategy back to NO_SETUP to search for a fresh H4 opportunity.
   */
  public resetSetup(reason: string, timeUtc: string) {
    this.direction = null;
    this.h4Fib = null;
    this.h4ImpulseOrigin = null;
    this.h4ImpulseEnd = null;
    this.m15ChochConfirmed = false;
    this.m15ChochEvent = null;
    this.m15ChochOriginSwing = null;
    this.m15BosConfirmed = false;
    this.m15BosEvent = null;
    this.m15Fib = null;
    this.logTransition('NO_SETUP', reason, timeUtc);
  }

  /**
   * Process a new confirmed H4 candle.
   * Strictly respects walk-forward without lookahead.
   */
  public processH4Candle(
    h4Candles: Candle[],
    currentH4Index: number
  ): {
    state: SyntheticStrategyState;
    explanation: string;
  } {
    const currentCandle = h4Candles[currentH4Index];
    const timeUtc = currentCandle.timeUtc;

    // Detect confirmed swings with configured confirmation bars (no lookahead)
    const swings = MarketStructureEngine.detectConfirmedSwings(
      h4Candles,
      currentH4Index,
      this.config.h4.confirmationBars
    );
    this.h4Swings = swings;

    const trend = MarketStructureEngine.determineTrendDirection(swings);
    this.h4Trend = trend;

    // 1. If we have an active trade, evaluate H4 Structural Trailing and Reversal Exit
    if (this.state === 'TRADE_ACTIVE' || this.state === 'TRAILING_STRUCTURE') {
      this.evaluateTradeManagement(swings, currentCandle);
      return { state: this.state, explanation: this.latestExplanation };
    }

    // 2. If NO_SETUP, attempt to identify H4 Direction & Impulsive Move
    if (this.state === 'NO_SETUP' || this.state === 'RESET_REQUIRED') {
      if (swings.length < 2) {
        return {
          state: this.state,
          explanation: 'Waiting for sufficient confirmed H4 swing points to establish market structure.',
        };
      }

      // Check Bullish Direction & Reversal Confirmation (Section 4 & 5)
      const recentLows = swings.filter((s) => s.type === 'LOW');
      const recentHighs = swings.filter((s) => s.type === 'HIGH');

      const lastLow = recentLows[recentLows.length - 1];
      const lastHigh = recentHighs[recentHighs.length - 1];
      const prevHigh = recentHighs[recentHighs.length - 2];
      const prevLow = recentLows[recentLows.length - 2];

      // Bullish setup search
      if (
        (this.config.direction === 'BOTH' || this.config.direction === 'LONG') &&
        lastLow &&
        lastHigh &&
        (!prevHigh || lastHigh.price >= prevHigh.price) && // BOS or confirmed higher high
        lastHigh.candleIndex > lastLow.candleIndex // High formed after the low
      ) {
        this.direction = 'BUY';
        this.h4ImpulseOrigin = lastLow;
        this.h4ImpulseEnd = lastHigh;

        this.h4Fib = MarketStructureEngine.calculateFibonacci(
          lastLow.price,
          lastHigh.price,
          'BULLISH'
        );

        this.logTransition(
          'H4_FIB_ACTIVE',
          `H4 Bullish structure confirmed (HL: ${lastLow.price} -> HH: ${lastHigh.price}). Dynamic H4 Fib active: 0%=${this.h4Fib.originZeroLevel}, 100%=${this.h4Fib.endpointHundredLevel}, 50%=${this.h4Fib.fiftyPercentLevel}`,
          timeUtc
        );
        this.logTransition(
          'WAITING_FOR_H4_50',
          `Waiting for H4 candle close to confirm 50% retracement level (${this.h4Fib.fiftyPercentLevel}).`,
          timeUtc
        );
        return { state: this.state, explanation: this.latestExplanation };
      }

      // Bearish setup search
      if (
        (this.config.direction === 'BOTH' || this.config.direction === 'SHORT') &&
        lastLow &&
        lastHigh &&
        (!prevLow || lastLow.price <= prevLow.price) && // BOS or confirmed lower low
        lastLow.candleIndex > lastHigh.candleIndex // Low formed after the high
      ) {
        this.direction = 'SELL';
        this.h4ImpulseOrigin = lastHigh;
        this.h4ImpulseEnd = lastLow;

        this.h4Fib = MarketStructureEngine.calculateFibonacci(
          lastHigh.price,
          lastLow.price,
          'BEARISH'
        );

        this.logTransition(
          'H4_FIB_ACTIVE',
          `H4 Bearish structure confirmed (LH: ${lastHigh.price} -> LL: ${lastLow.price}). Dynamic H4 Fib active: 0%=${this.h4Fib.originZeroLevel}, 100%=${this.h4Fib.endpointHundredLevel}, 50%=${this.h4Fib.fiftyPercentLevel}`,
          timeUtc
        );
        this.logTransition(
          'WAITING_FOR_H4_50',
          `Waiting for H4 candle close to confirm 50% retracement level (${this.h4Fib.fiftyPercentLevel}).`,
          timeUtc
        );
        return { state: this.state, explanation: this.latestExplanation };
      }

      return {
        state: this.state,
        explanation: 'No clear H4 impulse breakout identified. Monitoring structure.',
      };
    }

    // 3. If WAITING_FOR_H4_50 (Pre-activation)
    if (this.state === 'WAITING_FOR_H4_50' && this.h4Fib && !this.h4Fib.isFrozen) {
      // Dynamic Extension Check (Section 8):
      // If price breaks beyond the current 100% level without having closed through 50%,
      // dynamically update the 100% endpoint and recalculate 50%.
      if (this.direction === 'BUY') {
        if (currentCandle.high > this.h4Fib.endpointHundredLevel) {
          const oldEnd = this.h4Fib.endpointHundredLevel;
          this.h4Fib.endpointHundredLevel = currentCandle.high;
          this.h4Fib.fiftyPercentLevel = Number(
            ((this.h4Fib.originZeroLevel + this.h4Fib.endpointHundredLevel) / 2).toFixed(5)
          );
          this.latestExplanation = `Dynamic H4 Fib extended: High pushed from ${oldEnd} to ${this.h4Fib.endpointHundredLevel}. New 50%=${this.h4Fib.fiftyPercentLevel}`;
        }

        // Structural Invalidation (breaks origin low 0% before 50% activation)
        if (currentCandle.close < this.h4Fib.originZeroLevel) {
          this.resetSetup(
            `H4 Bullish setup invalidated: Candle close (${currentCandle.close}) broke below impulse origin (${this.h4Fib.originZeroLevel}).`,
            timeUtc
          );
          return { state: this.state, explanation: this.latestExplanation };
        }

        // H4 50% Candle Close Activation Check (Section 9)
        const confirmedByClose = MarketStructureEngine.isFiftyPercentConfirmedByClose(
          currentCandle,
          this.h4Fib
        );

        if (confirmedByClose) {
          this.h4Fib.isFrozen = true;
          this.h4Fib.isDynamic = false;
          this.h4Fib.activatedTime = timeUtc;
          this.h4Fib.frozenAtCandleIndex = currentH4Index;

          this.logTransition(
            'H4_50_CONFIRMED',
            `H4 50% close confirmed at ${currentCandle.close} <= ${this.h4Fib.fiftyPercentLevel}. Retracement verified by candle close.`,
            timeUtc
          );
          this.logTransition(
            'H4_FIB_FROZEN',
            `H4 Fibonacci is now FROZEN: 0%=${this.h4Fib.originZeroLevel}, 50%=${this.h4Fib.fiftyPercentLevel}, 100%=${this.h4Fib.endpointHundredLevel}. Anchors locked.`,
            timeUtc
          );
          this.logTransition(
            'WAITING_FOR_M15_CHOCH',
            `Transitioning to M15 timeframe. Waiting for confirmed ${this.direction} M15 CHoCH.`,
            timeUtc
          );
          return { state: this.state, explanation: this.latestExplanation };
        }
      } else if (this.direction === 'SELL') {
        if (currentCandle.low < this.h4Fib.endpointHundredLevel) {
          const oldEnd = this.h4Fib.endpointHundredLevel;
          this.h4Fib.endpointHundredLevel = currentCandle.low;
          this.h4Fib.fiftyPercentLevel = Number(
            ((this.h4Fib.originZeroLevel + this.h4Fib.endpointHundredLevel) / 2).toFixed(5)
          );
          this.latestExplanation = `Dynamic H4 Fib extended: Low pushed from ${oldEnd} to ${this.h4Fib.endpointHundredLevel}. New 50%=${this.h4Fib.fiftyPercentLevel}`;
        }

        // Structural Invalidation (breaks origin high 0% before 50% activation)
        if (currentCandle.close > this.h4Fib.originZeroLevel) {
          this.resetSetup(
            `H4 Bearish setup invalidated: Candle close (${currentCandle.close}) broke above impulse origin (${this.h4Fib.originZeroLevel}).`,
            timeUtc
          );
          return { state: this.state, explanation: this.latestExplanation };
        }

        // H4 50% Candle Close Activation Check (Section 9)
        const confirmedByClose = MarketStructureEngine.isFiftyPercentConfirmedByClose(
          currentCandle,
          this.h4Fib
        );

        if (confirmedByClose) {
          this.h4Fib.isFrozen = true;
          this.h4Fib.isDynamic = false;
          this.h4Fib.activatedTime = timeUtc;
          this.h4Fib.frozenAtCandleIndex = currentH4Index;

          this.logTransition(
            'H4_50_CONFIRMED',
            `H4 50% close confirmed at ${currentCandle.close} >= ${this.h4Fib.fiftyPercentLevel}. Retracement verified by candle close.`,
            timeUtc
          );
          this.logTransition(
            'H4_FIB_FROZEN',
            `H4 Fibonacci is now FROZEN: 0%=${this.h4Fib.originZeroLevel}, 50%=${this.h4Fib.fiftyPercentLevel}, 100%=${this.h4Fib.endpointHundredLevel}. Anchors locked.`,
            timeUtc
          );
          this.logTransition(
            'WAITING_FOR_M15_CHOCH',
            `Transitioning to M15 timeframe. Waiting for confirmed ${this.direction} M15 CHoCH.`,
            timeUtc
          );
          return { state: this.state, explanation: this.latestExplanation };
        }
      }
    }

    // 4. Post-Activation Invalidation Check (Section 10)
    // If H4 Fib is frozen but M15 entry has not yet triggered:
    // If price violates the frozen H4 impulse origin or creates a new opposing structural leg, reset completely!
    if (this.h4Fib && this.h4Fib.isFrozen) {
      if (this.direction === 'BUY' && currentCandle.close < this.h4Fib.originZeroLevel) {
        this.resetSetup(
          `Post-Activation Invalidation: H4 candle close (${currentCandle.close}) broke below frozen H4 0% (${this.h4Fib.originZeroLevel}). Setup invalidated.`,
          timeUtc
        );
        return { state: this.state, explanation: this.latestExplanation };
      }
      if (this.direction === 'SELL' && currentCandle.close > this.h4Fib.originZeroLevel) {
        this.resetSetup(
          `Post-Activation Invalidation: H4 candle close (${currentCandle.close}) broke above frozen H4 0% (${this.h4Fib.originZeroLevel}). Setup invalidated.`,
          timeUtc
        );
        return { state: this.state, explanation: this.latestExplanation };
      }
    }

    return { state: this.state, explanation: this.latestExplanation };
  }

  /**
   * Process a new confirmed M15 candle.
   * Operates only after H4 50% activation has frozen the H4 Fib.
   */
  public processM15Candle(
    m15Candles: Candle[],
    currentM15Index: number
  ): {
    state: SyntheticStrategyState;
    explanation: string;
    signal: TradeSignal | null;
  } {
    const currentCandle = m15Candles[currentM15Index];
    const timeUtc = currentCandle.timeUtc;

    // Detect M15 swings (no lookahead)
    const swings = MarketStructureEngine.detectConfirmedSwings(
      m15Candles,
      currentM15Index,
      this.config.m15.confirmationBars
    );
    this.m15Swings = swings;

    // If trade is active, check SL hits on M15 bars
    if (this.activePosition) {
      this.checkStopLossHit(currentCandle);
      return {
        state: this.state,
        explanation: this.latestExplanation,
        signal: null,
      };
    }

    // Must be in M15 confirmation or entry phase
    if (
      this.state !== 'WAITING_FOR_M15_CHOCH' &&
      this.state !== 'M15_CHOCH_CONFIRMED' &&
      this.state !== 'WAITING_FOR_M15_BOS' &&
      this.state !== 'M15_CONFIRMATION_COMPLETE' &&
      this.state !== 'M15_FIB_ACTIVE' &&
      this.state !== 'WAITING_FOR_M15_50_ENTRY'
    ) {
      return {
        state: this.state,
        explanation: this.latestExplanation,
        signal: null,
      };
    }

    // Step A: Waiting for M15 CHoCH (Section 11, 12)
    if (this.state === 'WAITING_FOR_M15_CHOCH') {
      if (this.direction === 'BUY') {
        // Bullish CHoCH: closed candle above recent confirmed swing high (LH)
        const recentHighs = swings.filter((s) => s.type === 'HIGH');
        const lastHigh = recentHighs[recentHighs.length - 1];

        if (lastHigh && currentCandle.close > lastHigh.price) {
          // Identify origin of impulse that caused this CHoCH (lowest low before this move)
          const lowsBefore = swings.filter(
            (s) => s.type === 'LOW' && s.candleIndex < currentM15Index
          );
          const originLow = lowsBefore[lowsBefore.length - 1];

          this.m15ChochConfirmed = true;
          this.m15ChochOriginSwing = originLow || null;
          this.m15ChochEvent = {
            id: `m15-choch-bull-${currentM15Index}`,
            type: 'CHOCH',
            direction: 'BULLISH',
            brokenLevel: lastHigh.price,
            breakingCandleIndex: currentM15Index,
            breakingPrice: currentCandle.close,
            time: currentCandle.time,
            timeUtc,
            swingPointId: lastHigh.id,
            reason: `Bullish M15 CHoCH confirmed: Candle closed above swing high (${lastHigh.price}) at ${currentCandle.close}`,
          };

          this.logTransition(
            'M15_CHOCH_CONFIRMED',
            `Bullish M15 CHoCH confirmed. Broken level: ${lastHigh.price}. Awaiting subsequent Bullish M15 BOS.`,
            timeUtc
          );
          this.logTransition(
            'WAITING_FOR_M15_BOS',
            'Waiting for subsequent M15 Bullish BOS without opposing structural break.',
            timeUtc
          );
        }
      } else if (this.direction === 'SELL') {
        // Bearish CHoCH: closed candle below recent confirmed swing low (HL)
        const recentLows = swings.filter((s) => s.type === 'LOW');
        const lastLow = recentLows[recentLows.length - 1];

        if (lastLow && currentCandle.close < lastLow.price) {
          const highsBefore = swings.filter(
            (s) => s.type === 'HIGH' && s.candleIndex < currentM15Index
          );
          const originHigh = highsBefore[highsBefore.length - 1];

          this.m15ChochConfirmed = true;
          this.m15ChochOriginSwing = originHigh || null;
          this.m15ChochEvent = {
            id: `m15-choch-bear-${currentM15Index}`,
            type: 'CHOCH',
            direction: 'BEARISH',
            brokenLevel: lastLow.price,
            breakingCandleIndex: currentM15Index,
            breakingPrice: currentCandle.close,
            time: currentCandle.time,
            timeUtc,
            swingPointId: lastLow.id,
            reason: `Bearish M15 CHoCH confirmed: Candle closed below swing low (${lastLow.price}) at ${currentCandle.close}`,
          };

          this.logTransition(
            'M15_CHOCH_CONFIRMED',
            `Bearish M15 CHoCH confirmed. Broken level: ${lastLow.price}. Awaiting subsequent Bearish M15 BOS.`,
            timeUtc
          );
          this.logTransition(
            'WAITING_FOR_M15_BOS',
            'Waiting for subsequent M15 Bearish BOS without opposing structural break.',
            timeUtc
          );
        }
      }

      return {
        state: this.state,
        explanation: this.latestExplanation,
        signal: null,
      };
    }

    // Step B: Waiting for M15 BOS & M15 Invalidation Rule (Section 13, 14)
    if (this.state === 'WAITING_FOR_M15_BOS') {
      // Check M15 Invalidation: opposing CHoCH occurs before BOS
      if (this.direction === 'BUY') {
        // Opposing bearish break: candle closes below recent swing low
        const recentLows = swings.filter((s) => s.type === 'LOW');
        const lastLow = recentLows[recentLows.length - 1];

        if (
          this.m15ChochOriginSwing &&
          currentCandle.close < this.m15ChochOriginSwing.price
        ) {
          // Invalidation! Reset M15 confirmation sequence
          const originPrice = this.m15ChochOriginSwing.price;
          this.m15ChochConfirmed = false;
          this.m15ChochEvent = null;
          this.m15ChochOriginSwing = null;
          this.logTransition(
            'WAITING_FOR_M15_CHOCH',
            `M15 CHoCH sequence invalidated: Price closed below origin swing low (${originPrice}). Opposing structure broke sequence. Restarting M15 confirmation.`,
            timeUtc
          );
          return {
            state: this.state,
            explanation: this.latestExplanation,
            signal: null,
          };
        }

        // Bullish BOS Check: candle breaks above the swing high formed during/after CHoCH or above CHoCH break high
        const confirmedHighsAfterChoch = swings.filter(
          (s) =>
            s.type === 'HIGH' &&
            this.m15ChochEvent &&
            s.candleIndex >= this.m15ChochEvent.breakingCandleIndex
        );
        const lastHigh = confirmedHighsAfterChoch[confirmedHighsAfterChoch.length - 1];
        const targetHigh = lastHigh
          ? lastHigh.price
          : this.m15ChochEvent
          ? Math.max(this.m15ChochEvent.brokenLevel, this.m15ChochEvent.breakingPrice)
          : 0;

        if (
          this.m15ChochEvent &&
          currentM15Index > this.m15ChochEvent.breakingCandleIndex &&
          currentCandle.close > targetHigh
        ) {
          // Confirmed Bullish BOS!
          this.m15BosConfirmed = true;
          this.m15BosEvent = {
            id: `m15-bos-bull-${currentM15Index}`,
            type: 'BOS',
            direction: 'BULLISH',
            brokenLevel: targetHigh,
            breakingCandleIndex: currentM15Index,
            breakingPrice: currentCandle.close,
            time: currentCandle.time,
            timeUtc,
            swingPointId: lastHigh ? lastHigh.id : this.m15ChochEvent.id,
            reason: `Bullish M15 BOS confirmed: Candle closed above structure (${targetHigh}) at ${currentCandle.close}`,
          };

          // Construct M15 Fibonacci (Section 15):
          // 0% = origin of bullish impulse that caused CHoCH
          // 100% = end of bullish impulse that caused BOS
          const originPrice = this.m15ChochOriginSwing
            ? this.m15ChochOriginSwing.price
            : swings.filter((s) => s.type === 'LOW').slice(-1)[0]?.price || currentCandle.low;

          const endpointPrice = currentCandle.high;

          this.m15Fib = MarketStructureEngine.calculateFibonacci(
            originPrice,
            endpointPrice,
            'BULLISH'
          );

          this.logTransition(
            'M15_CONFIRMATION_COMPLETE',
            `M15 Confirmation Complete (CHoCH -> BOS). M15 Fib constructed: 0%=${this.m15Fib.originZeroLevel}, 100%=${this.m15Fib.endpointHundredLevel}, 50%=${this.m15Fib.fiftyPercentLevel}`,
            timeUtc
          );
          this.logTransition(
            'WAITING_FOR_M15_50_ENTRY',
            `Waiting for price to touch/enter M15 50% entry zone (${this.m15Fib.fiftyPercentLevel}). Trigger mode: ${this.config.m15.entryTrigger}`,
            timeUtc
          );
        }
      } else if (this.direction === 'SELL') {
        // Opposing bullish break: candle closes above recent swing high
        if (
          this.m15ChochOriginSwing &&
          currentCandle.close > this.m15ChochOriginSwing.price
        ) {
          // Invalidation! Reset M15 confirmation sequence
          const originPrice = this.m15ChochOriginSwing.price;
          this.m15ChochConfirmed = false;
          this.m15ChochEvent = null;
          this.m15ChochOriginSwing = null;
          this.logTransition(
            'WAITING_FOR_M15_CHOCH',
            `M15 CHoCH sequence invalidated: Price closed above origin swing high (${originPrice}). Opposing structure broke sequence. Restarting M15 confirmation.`,
            timeUtc
          );
          return {
            state: this.state,
            explanation: this.latestExplanation,
            signal: null,
          };
        }

        // Bearish BOS Check: candle breaks below swing low formed during/after CHoCH or below CHoCH break low
        const confirmedLowsAfterChoch = swings.filter(
          (s) =>
            s.type === 'LOW' &&
            this.m15ChochEvent &&
            s.candleIndex >= this.m15ChochEvent.breakingCandleIndex
        );
        const lastLow = confirmedLowsAfterChoch[confirmedLowsAfterChoch.length - 1];
        const targetLow = lastLow
          ? lastLow.price
          : this.m15ChochEvent
          ? Math.min(this.m15ChochEvent.brokenLevel, this.m15ChochEvent.breakingPrice)
          : Infinity;

        if (
          this.m15ChochEvent &&
          currentM15Index > this.m15ChochEvent.breakingCandleIndex &&
          currentCandle.close < targetLow
        ) {
          this.m15BosConfirmed = true;
          this.m15BosEvent = {
            id: `m15-bos-bear-${currentM15Index}`,
            type: 'BOS',
            direction: 'BEARISH',
            brokenLevel: targetLow,
            breakingCandleIndex: currentM15Index,
            breakingPrice: currentCandle.close,
            time: currentCandle.time,
            timeUtc,
            swingPointId: lastLow ? lastLow.id : this.m15ChochEvent.id,
            reason: `Bearish M15 BOS confirmed: Candle closed below structure (${targetLow}) at ${currentCandle.close}`,
          };

          const originPrice = this.m15ChochOriginSwing
            ? this.m15ChochOriginSwing.price
            : swings.filter((s) => s.type === 'HIGH').slice(-1)[0]?.price || currentCandle.high;

          const endpointPrice = currentCandle.low;

          this.m15Fib = MarketStructureEngine.calculateFibonacci(
            originPrice,
            endpointPrice,
            'BEARISH'
          );

          this.logTransition(
            'M15_CONFIRMATION_COMPLETE',
            `M15 Confirmation Complete (CHoCH -> BOS). M15 Fib constructed: 0%=${this.m15Fib.originZeroLevel}, 100%=${this.m15Fib.endpointHundredLevel}, 50%=${this.m15Fib.fiftyPercentLevel}`,
            timeUtc
          );
          this.logTransition(
            'WAITING_FOR_M15_50_ENTRY',
            `Waiting for price to touch/enter M15 50% entry zone (${this.m15Fib.fiftyPercentLevel}). Trigger mode: ${this.config.m15.entryTrigger}`,
            timeUtc
          );
        }
      }

      return {
        state: this.state,
        explanation: this.latestExplanation,
        signal: null,
      };
    }

    // Step C: Waiting for M15 50% Entry (Section 16, 17)
    if (this.state === 'WAITING_FOR_M15_50_ENTRY' && this.m15Fib && this.h4Fib) {
      // Invalidation before entry: if price violates M15 Fib 0% (structural invalidation level)
      if (this.direction === 'BUY' && currentCandle.close < this.m15Fib.originZeroLevel) {
        this.resetSetup(
          `M15 Entry invalidated: Price closed below M15 0% invalidation level (${this.m15Fib.originZeroLevel}) before entry occurred.`,
          timeUtc
        );
        return {
          state: this.state,
          explanation: this.latestExplanation,
          signal: null,
        };
      }
      if (this.direction === 'SELL' && currentCandle.close > this.m15Fib.originZeroLevel) {
        this.resetSetup(
          `M15 Entry invalidated: Price closed above M15 0% invalidation level (${this.m15Fib.originZeroLevel}) before entry occurred.`,
          timeUtc
        );
        return {
          state: this.state,
          explanation: this.latestExplanation,
          signal: null,
        };
      }

      // Check Entry Trigger (Default: TOUCH)
      const isTouched = MarketStructureEngine.isFiftyPercentZoneTouched(
        currentCandle,
        this.m15Fib
      );

      let isTriggered = false;
      if (this.config.m15.entryTrigger === 'TOUCH') {
        isTriggered = isTouched;
      } else if (this.config.m15.entryTrigger === 'CLOSE') {
        isTriggered = MarketStructureEngine.isFiftyPercentConfirmedByClose(
          currentCandle,
          this.m15Fib
        );
      } else if (this.config.m15.entryTrigger === 'REJECTION') {
        // Rejection wick touched 50% and closed back in favor of trend
        isTriggered =
          isTouched &&
          (this.direction === 'BUY'
            ? currentCandle.close > this.m15Fib.fiftyPercentLevel
            : currentCandle.close < this.m15Fib.fiftyPercentLevel);
      }

      if (isTriggered) {
        const entryPrice = this.m15Fib.fiftyPercentLevel;
        const initialStopLoss = this.m15Fib.originZeroLevel; // Section 17: M15 Fib 0%
        const riskDistance = Math.abs(entryPrice - initialStopLoss);

        const tradeDirection: 'BUY' | 'SELL' = this.direction || 'BUY';

        const signal: TradeSignal = {
          id: `signal-${currentCandle.time}`,
          strategyId: 'strat-synthetic-fib-001',
          strategyName: this.config.name,
          market: 'SYNTHETIC_VOL25',
          direction: tradeDirection,
          time: currentCandle.time,
          timeUtc,
          entryPrice,
          initialStopLoss,
          riskDistance,
          triggerMode: this.config.m15.entryTrigger,
          reason: `${tradeDirection} Entry Triggered: Price touched M15 50% level (${entryPrice}) following confirmed H4 50% close and M15 CHoCH->BOS sequence.`,
          h4FibSnapshot: { ...this.h4Fib },
          m15FibSnapshot: { ...this.m15Fib },
        };

        this.logTransition(
          'ENTRY_TRIGGERED',
          signal.reason,
          timeUtc
        );

        // Open Simulated Position
        this.activePosition = {
          id: `pos-${currentCandle.time}`,
          strategyId: 'strat-synthetic-fib-001',
          strategyName: this.config.name,
          market: 'SYNTHETIC_VOL25',
          direction: tradeDirection,
          entryPrice,
          entryTime: currentCandle.time,
          entryTimeUtc: timeUtc,
          initialStopLoss,
          currentStopLoss: initialStopLoss,
          riskDistance,
          status: 'OPEN',
          highestPriceReached: entryPrice,
          lowestPriceReached: entryPrice,
          trailingEvents: [],
        };

        this.logTransition(
          'TRADE_ACTIVE',
          `Simulated trade entered at ${entryPrice}. Initial SL=${initialStopLoss}. Risk distance=${riskDistance.toFixed(5)}. Managing with H4 structure.`,
          timeUtc
        );

        return {
          state: this.state,
          explanation: this.latestExplanation,
          signal,
        };
      }
    }

    return {
      state: this.state,
      explanation: this.latestExplanation,
      signal: null,
    };
  }

  /**
   * Evaluates trade management rules on H4 candle:
   * 1. Confirmed H4 Structural Trailing
   * 2. Opposite H4 CHoCH exit condition (Section 22)
   */
  private evaluateTradeManagement(swings: SwingPoint[], currentH4Candle: Candle) {
    if (!this.activePosition) return;

    const pos = this.activePosition;
    const timeUtc = currentH4Candle.timeUtc;

    // Update highest / lowest reached
    if (pos.highestPriceReached === undefined || currentH4Candle.high > pos.highestPriceReached) {
      pos.highestPriceReached = currentH4Candle.high;
    }
    if (pos.lowestPriceReached === undefined || currentH4Candle.low < pos.lowestPriceReached) {
      pos.lowestPriceReached = currentH4Candle.low;
    }

    if (pos.direction === 'BUY') {
      // 1. Check Opposite Bearish H4 CHoCH Exit (Section 22):
      // If a confirmed bearish H4 CHoCH occurs against position -> EXIT IMMEDIATELY
      const confirmedLows = swings.filter((s) => s.type === 'LOW');
      const lastLow = confirmedLows[confirmedLows.length - 1];

      if (lastLow && currentH4Candle.close < lastLow.price) {
        this.closePosition(currentH4Candle.close, currentH4Candle.time, timeUtc, 'OPPOSITE_4H_CHOCH');
        this.resetSetup(
          `Trade closed via OPPOSITE_4H_CHOCH: Confirmed bearish H4 close (${currentH4Candle.close}) below swing low (${lastLow.price}). Bullish structural thesis invalidated.`,
          timeUtc
        );
        return;
      }

      // 2. Trailing behind confirmed H4 Higher Lows (Section 20 & 21):
      // Trail safety: newSL > currentSL only. Never lower SL.
      // Swing must be CONFIRMED (no lookahead).
      const newConfirmedHLs = swings.filter(
        (s) =>
          s.type === 'LOW' &&
          s.candleIndex > (this.h4Fib?.frozenAtCandleIndex || 0) &&
          s.price > pos.currentStopLoss
      );

      if (newConfirmedHLs.length > 0) {
        const latestHL = newConfirmedHLs[newConfirmedHLs.length - 1];
        if (latestHL.price > pos.currentStopLoss) {
          const prevSL = pos.currentStopLoss;
          pos.currentStopLoss = latestHL.price;
          pos.trailingEvents.push({
            time: currentH4Candle.time,
            timeUtc,
            newStop: latestHL.price,
            structurePointPrice: latestHL.price,
            reason: `Advanced SL from ${prevSL} to confirmed H4 Higher Low at ${latestHL.price}`,
          });

          this.logTransition(
            'TRAILING_STRUCTURE',
            `Trailing SL advanced to ${latestHL.price} (confirmed H4 HL). Open risk safely reduced.`,
            timeUtc
          );
        }
      }
    } else if (pos.direction === 'SELL') {
      // 1. Check Opposite Bullish H4 CHoCH Exit (Section 22):
      const confirmedHighs = swings.filter((s) => s.type === 'HIGH');
      const lastHigh = confirmedHighs[confirmedHighs.length - 1];

      if (lastHigh && currentH4Candle.close > lastHigh.price) {
        this.closePosition(currentH4Candle.close, currentH4Candle.time, timeUtc, 'OPPOSITE_4H_CHOCH');
        this.resetSetup(
          `Trade closed via OPPOSITE_4H_CHOCH: Confirmed bullish H4 close (${currentH4Candle.close}) above swing high (${lastHigh.price}). Bearish structural thesis invalidated.`,
          timeUtc
        );
        return;
      }

      // 2. Trailing behind confirmed H4 Lower Highs (Section 20 & 21):
      // Trail safety: newSL < currentSL only. Never raise SL.
      const newConfirmedLHs = swings.filter(
        (s) =>
          s.type === 'HIGH' &&
          s.candleIndex > (this.h4Fib?.frozenAtCandleIndex || 0) &&
          s.price < pos.currentStopLoss
      );

      if (newConfirmedLHs.length > 0) {
        const latestLH = newConfirmedLHs[newConfirmedLHs.length - 1];
        if (latestLH.price < pos.currentStopLoss) {
          const prevSL = pos.currentStopLoss;
          pos.currentStopLoss = latestLH.price;
          pos.trailingEvents.push({
            time: currentH4Candle.time,
            timeUtc,
            newStop: latestLH.price,
            structurePointPrice: latestLH.price,
            reason: `Advanced SL from ${prevSL} to confirmed H4 Lower High at ${latestLH.price}`,
          });

          this.logTransition(
            'TRAILING_STRUCTURE',
            `Trailing SL advanced to ${latestLH.price} (confirmed H4 LH). Open risk safely reduced.`,
            timeUtc
          );
        }
      }
    }
  }

  /**
   * Checks if an intrabar price movement hits the current stop loss
   */
  private checkStopLossHit(candle: Candle) {
    if (!this.activePosition) return;

    const pos = this.activePosition;
    const timeUtc = candle.timeUtc;

    if (pos.direction === 'BUY') {
      if (candle.low <= pos.currentStopLoss) {
        const isTrailing = pos.currentStopLoss > pos.initialStopLoss;
        const exitReason: ExitReason = isTrailing ? 'TRAILING_SL' : 'INITIAL_SL';
        this.closePosition(pos.currentStopLoss, candle.time, timeUtc, exitReason);
        this.resetSetup(
          `Trade stopped out at ${pos.currentStopLoss} (${exitReason}). Setup finished.`,
          timeUtc
        );
      }
    } else if (pos.direction === 'SELL') {
      if (candle.high >= pos.currentStopLoss) {
        const isTrailing = pos.currentStopLoss < pos.initialStopLoss;
        const exitReason: ExitReason = isTrailing ? 'TRAILING_SL' : 'INITIAL_SL';
        this.closePosition(pos.currentStopLoss, candle.time, timeUtc, exitReason);
        this.resetSetup(
          `Trade stopped out at ${pos.currentStopLoss} (${exitReason}). Setup finished.`,
          timeUtc
        );
      }
    }
  }

  /**
   * Closes the active position, records deterministic exit metrics and PnL
   */
  private closePosition(
    exitPrice: number,
    exitTime: number,
    exitTimeUtc: string,
    exitReason: ExitReason
  ) {
    if (!this.activePosition) return;

    const pos = this.activePosition;
    pos.status = 'CLOSED';
    pos.exitPrice = exitPrice;
    pos.exitTime = exitTime;
    pos.exitTimeUtc = exitTimeUtc;
    pos.exitReason = exitReason;

    const pnlPoints =
      pos.direction === 'BUY'
        ? exitPrice - pos.entryPrice
        : pos.entryPrice - exitPrice;

    pos.pnlPoints = Number(pnlPoints.toFixed(5));
    pos.pnlRMultiple = Number((pnlPoints / pos.riskDistance).toFixed(2));

    this.closedPositions.push({ ...pos });
    this.activePosition = null;
    this.logTransition(
      'TRADE_CLOSED',
      `Position closed at ${exitPrice} via ${exitReason}. R-Multiple: ${pos.pnlRMultiple}R (${pos.pnlPoints} pts).`,
      exitTimeUtc
    );
  }
}
