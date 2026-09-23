import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { z } from 'zod';
import {
  INITIAL_STRATEGIES,
  INITIAL_RULES,
  INITIAL_INSTRUMENTS,
  INITIAL_SESSIONS,
  INITIAL_DECISIONS,
  INITIAL_JOURNAL,
  INITIAL_ANALYTICS,
} from './src/data/initialData';
import { Strategy, GenericStrategyRule, TradeDecision, JournalEntry } from './src/types';
import { evaluateStrategyRules, DEFAULT_EVALUATION_STATE } from './src/lib/ruleEvaluationEngine';
import {
  HistoricalEvaluator,
  DEFAULT_SYNTHETIC_FIB_CONFIG,
  SyntheticFixtures,
} from './src/lib/engine';
import {
  RealBacktestReport,
  SyntheticFibConfig,
} from './src/lib/engine/types';
import {
  DerivHistoricalDataService,
  DerivPartialDataTransportError,
} from './server/market-data/DerivHistoricalDataService';
import { providerManager } from './server/connectivity/ProviderManager';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory Database Store (adheres to relational schema model)
let strategies: Strategy[] = [...INITIAL_STRATEGIES];
let rules: GenericStrategyRule[] = [...INITIAL_RULES];
let instruments = [...INITIAL_INSTRUMENTS];
let sessions = [...INITIAL_SESSIONS];
let decisions: TradeDecision[] = [...INITIAL_DECISIONS];
let journal: JournalEntry[] = [...INITIAL_JOURNAL];
let analytics = { ...INITIAL_ANALYTICS };

// Validation Schemas
const CreateStrategySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  market: z.string().min(2, 'Market symbol required'),
  assetClass: z.enum(['FOREX', 'INDICES', 'COMMODITIES', 'CRYPTO', 'STOCKS', 'SYNTHETIC']),
  status: z.enum(['DRAFT', 'TESTING', 'DEMO', 'ARCHIVED']).default('DRAFT'),
  tags: z.array(z.string()).default([]),
});

const CreateRuleSchema = z.object({
  category: z.enum([
    'MARKET_CONTEXT',
    'FUNDAMENTALS',
    'TECHNICAL_ANALYSIS',
    'ENTRY',
    'EXIT',
    'RISK_MANAGEMENT',
  ]),
  name: z.string().min(2),
  description: z.string().default(''),
  enabled: z.boolean().default(true),
  priority: z.number().min(1).max(10).default(5),
  group: z.string().default('General'),
  logicalOperator: z.enum(['AND', 'OR']).default('AND'),
  condition: z
    .object({
      id: z.string(),
      source: z.enum(['MARKET', 'TECHNICAL', 'FUNDAMENTAL', 'ACCOUNT', 'POSITION', 'STRATEGY_CONTEXT']),
      field: z.string(),
      operator: z.enum([
        'EQUALS',
        'NOT_EQUALS',
        'GREATER_THAN',
        'LESS_THAN',
        'GREATER_THAN_OR_EQUAL',
        'LESS_THAN_OR_EQUAL',
        'CROSSES_ABOVE',
        'CROSSES_BELOW',
        'IN_RANGE',
        'OUT_OF_RANGE',
        'CONTAINS',
      ]),
      value: z.object({
        type: z.enum(['LITERAL', 'FIELD_REF']),
        value: z.any().optional(),
        source: z.any().optional(),
        field: z.string().optional(),
      }),
      version: z.literal('v1'),
    })
    .optional(),
  parameters: z.record(z.string(), z.any()).default({}),
});

// --- API ROUTES ---

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    system: 'TradingOS API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    mode: 'ANALYSIS',
  });
});

// 1. Strategies
app.get('/api/strategies', (req: Request, res: Response) => {
  const enriched = strategies.map((s) => ({
    ...s,
    rulesCount: rules.filter((r) => r.strategyId === s.id).length,
  }));
  res.json(enriched);
});

app.post('/api/strategies', (req: Request, res: Response) => {
  const parseResult = CreateStrategySchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
  }

  const data = parseResult.data;
  const newStrategy: Strategy = {
    id: `strat-${Date.now().toString(36)}`,
    name: data.name,
    description: data.description,
    market: data.market.toUpperCase(),
    assetClass: data.assetClass,
    status: data.status,
    version: '1.0.0',
    tags: data.tags,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    configuration: {
      marketContext: {
        instruments: [data.market.toUpperCase()],
        assetClasses: [data.assetClass],
        timeframes: ['H4', 'M15'],
        sessions: ['LONDON', 'NEW_YORK'],
        notes: '',
      },
      fundamentals: {
        summary: '',
        notes: '',
        macroFactors: {
          interestRates: 'Neutral',
          inflation: 'In target',
          centralBankStance: 'NEUTRAL',
          sentimentScore: 50,
        },
        conditions: [],
      },
      technicalAnalysis: {
        summary: '',
        notes: '',
        frameworks: ['Market Structure', 'Moving Averages'],
        conditions: [],
      },
      entryLogic: {
        directionBias: 'LONG',
        summary: '',
        confirmationRequirement: 'ALL_CONDITIONS',
        triggerEvent: '',
        notes: '',
      },
      exitLogic: {
        summary: '',
        targetType: 'FIXED_RR',
        stopType: 'STRUCTURE_INVALIDATION',
        technicalReversalExit: true,
        notes: '',
      },
      riskManagement: {
        riskPerTradePercent: 1.0,
        maxDailyLossPercent: 2.5,
        maxSimultaneousPositions: 2,
        positionSizingMethod: 'FIXED_PERCENT_EQUITY',
        stopLossRule: 'Beyond swing structure',
        takeProfitRule: '2.0 R Multiple',
        maxDrawdownLimitPercent: 5.0,
        profitProtectionRules: ['Move to BE at 1.5R'],
        notes: '',
      },
    },
  };

  strategies.unshift(newStrategy);
  res.status(201).json(newStrategy);
});

app.get('/api/strategies/:id', (req: Request, res: Response) => {
  const strategy = strategies.find((s) => s.id === req.params.id);
  if (!strategy) {
    return res.status(404).json({ error: 'Strategy not found' });
  }
  const strategyRules = rules.filter((r) => r.strategyId === strategy.id);
  res.json({ ...strategy, rules: strategyRules });
});

app.put('/api/strategies/:id', (req: Request, res: Response) => {
  const idx = strategies.findIndex((s) => s.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Strategy not found' });
  }

  strategies[idx] = {
    ...strategies[idx],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  res.json(strategies[idx]);
});

app.delete('/api/strategies/:id', (req: Request, res: Response) => {
  const initialLength = strategies.length;
  strategies = strategies.filter((s) => s.id !== req.params.id);
  rules = rules.filter((r) => r.strategyId !== req.params.id);

  if (strategies.length === initialLength) {
    return res.status(404).json({ error: 'Strategy not found' });
  }

  res.json({ success: true, message: 'Strategy deleted successfully' });
});

app.post('/api/strategies/:id/duplicate', (req: Request, res: Response) => {
  const existing = strategies.find((s) => s.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Strategy not found' });
  }

  const newId = `strat-${Date.now().toString(36)}`;
  const duplicate: Strategy = {
    ...existing,
    id: newId,
    name: `${existing.name} (Copy)`,
    status: 'DRAFT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Copy existing rules
  const existingRules = rules.filter((r) => r.strategyId === existing.id);
  const clonedRules = existingRules.map((r) => ({
    ...r,
    id: `rule-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    strategyId: newId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  strategies.unshift(duplicate);
  rules.push(...clonedRules);

  res.status(201).json(duplicate);
});

// 2. Strategy Configuration
app.get('/api/strategies/:id/configuration', (req: Request, res: Response) => {
  const strategy = strategies.find((s) => s.id === req.params.id);
  if (!strategy) {
    return res.status(404).json({ error: 'Strategy not found' });
  }
  res.json(strategy.configuration);
});

app.put('/api/strategies/:id/configuration', (req: Request, res: Response) => {
  const idx = strategies.findIndex((s) => s.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Strategy not found' });
  }

  strategies[idx].configuration = {
    ...strategies[idx].configuration,
    ...req.body,
  };
  strategies[idx].updatedAt = new Date().toISOString();

  res.json(strategies[idx].configuration);
});

// 3. Strategy Rules
app.get('/api/strategies/:id/rules', (req: Request, res: Response) => {
  const strategyRules = rules.filter((r) => r.strategyId === req.params.id);
  res.json(strategyRules);
});

app.post('/api/strategies/:id/rules', (req: Request, res: Response) => {
  const strategy = strategies.find((s) => s.id === req.params.id);
  if (!strategy) {
    return res.status(404).json({ error: 'Strategy not found' });
  }

  const parseResult = CreateRuleSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid rule data', details: parseResult.error.flatten() });
  }

  const ruleData = parseResult.data;
  const newRule: GenericStrategyRule = {
    id: `rule-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    strategyId: strategy.id,
    category: ruleData.category,
    name: ruleData.name,
    description: ruleData.description,
    enabled: ruleData.enabled,
    priority: ruleData.priority,
    group: ruleData.group,
    logicalOperator: ruleData.logicalOperator,
    condition: ruleData.condition as any,
    parameters: ruleData.parameters,
    validationStatus: 'VALID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  rules.push(newRule);
  res.status(201).json(newRule);
});

app.put('/api/strategies/:id/rules/:ruleId', (req: Request, res: Response) => {
  const idx = rules.findIndex((r) => r.id === req.params.ruleId && r.strategyId === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Rule not found' });
  }

  rules[idx] = {
    ...rules[idx],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  res.json(rules[idx]);
});

app.delete('/api/strategies/:id/rules/:ruleId', (req: Request, res: Response) => {
  const initialLen = rules.length;
  rules = rules.filter((r) => !(r.id === req.params.ruleId && r.strategyId === req.params.id));

  if (rules.length === initialLen) {
    return res.status(404).json({ error: 'Rule not found' });
  }

  res.json({ success: true, message: 'Rule removed' });
});

// 4. Rule Evaluation Engine API (Section 13)
app.post('/api/strategies/:id/evaluate', (req: Request, res: Response) => {
  const strategy = strategies.find((s) => s.id === req.params.id);
  if (!strategy) {
    return res.status(404).json({ error: 'Strategy not found' });
  }

  const strategyRules = rules.filter((r) => r.strategyId === strategy.id);
  const contextState = req.body.state ? { ...DEFAULT_EVALUATION_STATE, ...req.body.state } : DEFAULT_EVALUATION_STATE;

  const report = evaluateStrategyRules(
    strategy.id,
    strategy.name,
    strategy.market,
    strategyRules,
    contextState
  );

  res.json(report);
});

// Strategy Engine Core Simulation & Walk-Forward API
app.post('/api/strategies/:id/simulate', (req: Request, res: Response) => {
  const strategy = strategies.find((s) => s.id === req.params.id);
  if (!strategy) {
    return res.status(404).json({ error: 'Strategy not found' });
  }

  const scenario = req.body.scenario || 'BULLISH';
  let h4Candles = req.body.h4Candles;
  let m15Candles = req.body.m15Candles;

  if (!h4Candles || !m15Candles) {
    if (scenario === 'BEARISH') {
      const fixture = SyntheticFixtures.createBearishCompleteFixture();
      h4Candles = fixture.h4Candles;
      m15Candles = fixture.m15Candles;
    } else if (scenario === 'DYNAMIC') {
      const fixture = SyntheticFixtures.createDynamicFibExtensionFixture();
      h4Candles = fixture.h4Candles;
      m15Candles = [];
    } else if (scenario === 'INVALIDATION') {
      const fixture = SyntheticFixtures.createM15ChochInvalidationFixture();
      h4Candles = fixture.h4Candles;
      m15Candles = fixture.m15Candles;
    } else {
      const fixture = SyntheticFixtures.createBullishCompleteFixture();
      h4Candles = fixture.h4Candles;
      m15Candles = fixture.m15Candles;
    }
  }

  const report = HistoricalEvaluator.evaluate(
    DEFAULT_SYNTHETIC_FIB_CONFIG,
    h4Candles,
    m15Candles
  );

  res.json(report);
});

// REAL HISTORICAL BACKTEST API — Powered by Deriv Historical Market Data
// Strictly READ-ONLY / No order execution capability
app.post('/api/strategies/:id/backtest', async (req: Request, res: Response) => {
  try {
    const strategy = strategies.find((s) => s.id === req.params.id);
    if (!strategy) {
      return res.status(404).json({
        error: 'STRATEGY_NOT_FOUND',
        message: `Strategy '${req.params.id}' was not found in the TradingOS registry.`,
      });
    }

    const { symbol, startDate, endDate, riskParams, configOverrides } = req.body;
    if (!symbol || typeof symbol !== 'string') {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'A valid trading symbol (e.g. BOOM1000, BOOM500, CRASH1000, CRASH500, R_25) is required.',
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Both startDate and endDate (ISO date strings or epoch timestamps) are required.',
      });
    }

    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();

    if (isNaN(startMs) || isNaN(endMs)) {
      return res.status(400).json({
        error: 'INVALID_DATE_FORMAT',
        message: 'startDate and endDate must be valid dates (e.g. YYYY-MM-DD or ISO 8601 strings).',
      });
    }

    if (startMs >= endMs) {
      return res.status(400).json({
        error: 'INVALID_DATE_RANGE',
        message: `Start date (${new Date(startMs).toISOString()}) must precede end date (${new Date(endMs).toISOString()}).`,
      });
    }

    const historicalService = DerivHistoricalDataService.getInstance();

    const rawH4Candles = req.body.rawH4Candles;
    const rawM15Candles = req.body.rawM15Candles;

    let h4Result;
    let m15Result;

    if (rawH4Candles !== undefined || rawM15Candles !== undefined) {
      // PART E: Defensive server validation of untrusted browser-supplied candles
      if (!Array.isArray(rawH4Candles) || !Array.isArray(rawM15Candles)) {
        return res.status(400).json({
          error: 'INVALID_CANDLE_PAYLOAD',
          category: 'VALIDATION',
          message: 'Both rawH4Candles and rawM15Candles must be supplied as non-empty arrays.',
        });
      }

      if (rawH4Candles.length > 50000 || rawM15Candles.length > 100000) {
        return res.status(400).json({
          error: 'DATASET_TOO_LARGE',
          category: 'VALIDATION',
          message: 'Supplied historical dataset exceeds maximum allowed server capacity.',
        });
      }

      // Check structure of candle items (must have numeric epoch, open, high, low, close)
      for (let i = 0; i < Math.min(rawH4Candles.length, 500); i++) {
        const c = rawH4Candles[i];
        if (!c || typeof c !== 'object' || typeof c.epoch !== 'number' || typeof c.close !== 'number') {
          return res.status(400).json({
            error: 'MALFORMED_CANDLE_DATA',
            category: 'VALIDATION',
            message: 'Malformed candle records in H4 payload. Each record must have numeric epoch, open, high, low, close.',
          });
        }
      }

      for (let i = 0; i < Math.min(rawM15Candles.length, 500); i++) {
        const c = rawM15Candles[i];
        if (!c || typeof c !== 'object' || typeof c.epoch !== 'number' || typeof c.close !== 'number') {
          return res.status(400).json({
            error: 'MALFORMED_CANDLE_DATA',
            category: 'VALIDATION',
            message: 'Malformed candle records in M15 payload. Each record must have numeric epoch, open, high, low, close.',
          });
        }
      }

      // Process externally supplied raw Deriv candles through the exact same validation pipeline
      h4Result = historicalService.processSuppliedRawCandles(
        rawH4Candles,
        symbol,
        'H4',
        startMs,
        endMs
      );
      m15Result = historicalService.processSuppliedRawCandles(
        rawM15Candles,
        symbol,
        'M15',
        startMs,
        endMs
      );
    } else {
      // Concurrently retrieve real H4 and M15 candles from Deriv WebSocket
      [h4Result, m15Result] = await Promise.all([
        historicalService.getHistoricalCandles({
          symbol,
          timeframe: 'H4',
          startTime: startMs,
          endTime: endMs,
        }),
        historicalService.getHistoricalCandles({
          symbol,
          timeframe: 'M15',
          startTime: startMs,
          endTime: endMs,
        }),
      ]);
    }

    // Verify minimum structural candle counts
    if (h4Result.candles.length < 5) {
      return res.status(422).json({
        error: 'INSUFFICIENT_HISTORICAL_DATA',
        message: `Deriv returned only ${h4Result.candles.length} H4 candle(s) for '${symbol}'. At least 5 H4 candles are required to detect market structure. Please expand your historical date range.`,
        h4DataQuality: h4Result.quality,
        m15DataQuality: m15Result.quality,
      });
    }

    if (m15Result.candles.length < 15) {
      return res.status(422).json({
        error: 'INSUFFICIENT_HISTORICAL_DATA',
        message: `Deriv returned only ${m15Result.candles.length} M15 candle(s) for '${symbol}'. At least 15 M15 candles are required to detect execution structure. Please expand your historical date range.`,
        h4DataQuality: h4Result.quality,
        m15DataQuality: m15Result.quality,
      });
    }

    // Merge configuration overrides if provided
    const config: SyntheticFibConfig = {
      ...DEFAULT_SYNTHETIC_FIB_CONFIG,
      ...configOverrides,
      h4: {
        ...DEFAULT_SYNTHETIC_FIB_CONFIG.h4,
        ...(configOverrides?.h4 || {}),
      },
      m15: {
        ...DEFAULT_SYNTHETIC_FIB_CONFIG.m15,
        ...(configOverrides?.m15 || {}),
      },
      risk: {
        ...DEFAULT_SYNTHETIC_FIB_CONFIG.risk,
        ...(configOverrides?.risk || {}),
      },
    };

    // Run existing walk-forward HistoricalEvaluator without lookahead bias
    const evalReport = HistoricalEvaluator.evaluate(
      config,
      h4Result.candles,
      m15Result.candles,
      riskParams
    );

    // Compute detailed performance metrics
    const totalTrades = evalReport.positionsClosed;
    const wins = evalReport.winCount;
    const losses = evalReport.lossCount;
    const winRatePercent = totalTrades > 0 ? Number(((wins / totalTrades) * 100).toFixed(2)) : 0;
    const netRMultiple = Number(evalReport.totalRMultiple.toFixed(2));
    const avgRMultiple = totalTrades > 0 ? Number((netRMultiple / totalTrades).toFixed(2)) : 0;
    const avgWinRMultiple = Number(evalReport.averageWinR.toFixed(2));
    const avgLossRMultiple = Number(evalReport.averageLossR.toFixed(2));
    const maxDrawdownRMultiple = Number(evalReport.maxDrawdownRMultiple.toFixed(2));

    const realReport: RealBacktestReport = {
      ...evalReport,
      dataSource: Array.isArray(rawH4Candles) ? 'REAL_DERIV_BROWSER_WS' : 'REAL_DERIV_HISTORICAL',
      symbol: h4Result.symbol,
      startDate: new Date(startMs).toISOString(),
      endDate: new Date(endMs).toISOString(),
      h4DataQuality: h4Result.quality,
      m15DataQuality: m15Result.quality,
      metrics: {
        totalTrades,
        winningTrades: wins,
        losingTrades: losses,
        winRatePercent,
        netRMultiple,
        avgRMultiple,
        avgWinRMultiple,
        avgLossRMultiple,
        maxDrawdownRMultiple,
        profitFactor: evalReport.profitFactor > 0 ? Number(evalReport.profitFactor.toFixed(2)) : null,
      },
    };

    res.json(realReport);
  } catch (err: any) {
    const isPartialTransportErr =
      err instanceof DerivPartialDataTransportError ||
      err.name === 'DerivPartialDataTransportError' ||
      err.code === 'DERIV_PARTIAL_DATA_TRANSPORT_ERROR';

    const isConnectionErr =
      isPartialTransportErr ||
      err.message?.includes('DERIV_WS_') ||
      err.message?.includes('WebSocket') ||
      err.message?.includes('Connection') ||
      err.message?.includes('ECONNREFUSED') ||
      err.message?.includes('ETIMEDOUT') ||
      err.message?.includes('520');

    const isEmptyDataErr = err.message?.startsWith('EMPTY_HISTORICAL_DATA');

    const isClientErr =
      err.message?.startsWith('INVALID_') ||
      err.message?.startsWith('DATE_RANGE_') ||
      err.message?.startsWith('UNSUPPORTED_') ||
      err.message?.startsWith('INSUFFICIENT_');

    const status = isClientErr ? 400 : isEmptyDataErr ? 404 : 502;
    const category = isClientErr ? 'VALIDATION' : isConnectionErr ? 'CONNECTION' : 'DATA';

    res.status(status).json({
      error: isPartialTransportErr ? 'DERIV_PARTIAL_DATA_TRANSPORT_ERROR' : 'BACKTEST_FAILED',
      category,
      message: err.message || 'An error occurred during real historical backtesting.',
      details: err.details || undefined,
    });
  }
});

app.get('/api/strategies/:id/engine-state', (req: Request, res: Response) => {
  const strategy = strategies.find((s) => s.id === req.params.id);
  if (!strategy) {
    return res.status(404).json({ error: 'Strategy not found' });
  }

  const fixture = SyntheticFixtures.createBullishCompleteFixture();
  const report = HistoricalEvaluator.evaluate(
    DEFAULT_SYNTHETIC_FIB_CONFIG,
    fixture.h4Candles,
    fixture.m15Candles
  );

  res.json(report);
});

// 5. Markets
app.get('/api/markets', (req: Request, res: Response) => {
  res.json(instruments);
});

app.get('/api/markets/sessions', (req: Request, res: Response) => {
  res.json(sessions);
});

// 6. Fundamentals Engine state
app.get('/api/fundamentals', (req: Request, res: Response) => {
  res.json({
    macroRegime: 'Moderating Inflation & Resilient Growth',
    centralBankDivergence: {
      fedStance: 'Paused (Neutral)',
      ecbStance: 'Data Dependent (Neutral-Hawkish)',
      boeStance: 'Gradual Easing (Dovish)',
      bojStance: 'Normalization (Hawkish)',
    },
    yieldCurve: {
      us10y: 4.12,
      us2y: 3.98,
      spread: 0.14,
      status: 'Normal Uninversion',
    },
    sentiment: {
      fearGreedScore: 58,
      regime: 'Neutral-Greed',
    },
    upcomingNews: [
      { event: 'US Core PCE Price Index', impact: 'HIGH', timeRemainingMins: 180, forecast: '0.2%', previous: '0.2%' },
      { event: 'Eurozone Flash CPI YoY', impact: 'HIGH', timeRemainingMins: 420, forecast: '2.2%', previous: '2.4%' },
      { event: 'FOMC Member Speech', impact: 'MEDIUM', timeRemainingMins: 600 },
    ],
  });
});

// 7. Technical Engine state
app.get('/api/technical', (req: Request, res: Response) => {
  res.json({
    activeFrameworks: ['Market Structure (BOS/CHoCH)', 'Order Blocks', 'Exponential Moving Averages', 'ATR Volatility'],
    supportedIndicators: [
      { name: 'RSI', periods: [14], category: 'MOMENTUM' },
      { name: 'EMA', periods: [20, 50, 200], category: 'TREND' },
      { name: 'ATR', periods: [14], category: 'VOLATILITY' },
      { name: 'VWAP', category: 'BENCHMARK' },
    ],
  });
});

// 8. Risk Engine state
app.get('/api/risk', (req: Request, res: Response) => {
  res.json({
    accountEquity: 50240,
    balance: 50000,
    dailyPnL: 240,
    dailyPnLPercent: 0.48,
    openPositions: 1,
    currentDrawdownPercent: 1.4,
    maxDailyLossLimitPercent: 2.5,
    maxDrawdownLimitPercent: 5.0,
    totalOpenRiskExposurePercent: 1.0,
    riskGateStatus: 'PASS',
    exposureByCurrency: {
      USD: 1.0,
      EUR: 1.0,
    },
  });
});

// 9. Trades & Decisions
app.get('/api/trades', (req: Request, res: Response) => {
  res.json(decisions);
});

app.post('/api/trades', (req: Request, res: Response) => {
  const newDecision: TradeDecision = {
    id: `dec-${Date.now().toString(36)}`,
    ...req.body,
    timestamp: new Date().toISOString(),
  };
  decisions.unshift(newDecision);
  res.status(201).json(newDecision);
});

// 10. Journal
app.get('/api/journal', (req: Request, res: Response) => {
  res.json(journal);
});

app.post('/api/journal', (req: Request, res: Response) => {
  const newEntry: JournalEntry = {
    id: `jrn-${Date.now().toString(36)}`,
    ...req.body,
    timestamp: new Date().toISOString(),
  };
  journal.unshift(newEntry);
  res.status(201).json(newEntry);
});

// 11. Analytics
app.get('/api/analytics', (req: Request, res: Response) => {
  res.json(analytics);
});

// 12. CONNECTIVITY & BROKER PROVIDER LAYER (Milestone 1 & 2A: MT5 & Deriv Demo)
const UpdateProviderConfigSchema = z.object({
  bridgeUrl: z.string().url('Must be a valid URL (e.g. http://127.0.0.1:8001)').optional(),
  bridgeToken: z.string().optional(),
  appId: z.string().optional(),
  apiToken: z.string().optional(),
  enabled: z.boolean().optional(),
  isSandboxOverride: z.boolean().optional(),
});

// List all registered connectivity providers
app.get('/api/connectivity/providers', async (req: Request, res: Response) => {
  try {
    const providers = await providerManager.getAllSummaries();
    res.json(providers);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve providers', details: err.message });
  }
});

// Get single provider status
app.get('/api/connectivity/providers/:id/status', async (req: Request, res: Response) => {
  try {
    const provider = providerManager.getProvider(req.params.id);
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    const status = await provider.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: 'Status check failed', details: err.message });
  }
});

// Run full diagnostic connection probe (supports both POST and GET)
app.all('/api/connectivity/providers/:id/test', async (req: Request, res: Response) => {
  try {
    const report = await providerManager.testProvider(req.params.id);
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: 'Diagnostic test failed', details: err.message });
  }
});

// Retrieve normalized account info
app.get('/api/connectivity/providers/:id/account', async (req: Request, res: Response) => {
  try {
    const account = await providerManager.getAccount(req.params.id);
    res.json(account);
  } catch (err: any) {
    res.status(502).json({
      error: 'ACCOUNT_RETRIEVAL_FAILED',
      message: err.message || 'Could not retrieve account information from provider',
    });
  }
});

// Retrieve available symbols
app.get('/api/connectivity/providers/:id/symbols', async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const symbols = await providerManager.getSymbols(req.params.id, search);
    res.json(symbols);
  } catch (err: any) {
    res.status(502).json({ error: 'SYMBOL_RETRIEVAL_FAILED', message: err.message });
  }
});

// Retrieve real market quote
app.get(['/api/connectivity/providers/:id/quote', '/api/connectivity/providers/:id/quotes/:symbol'], async (req: Request, res: Response) => {
  try {
    const symbol = (req.params.symbol || req.query.symbol as string) || 'EURUSD';
    const quote = await providerManager.getQuote(req.params.id, symbol);
    res.json(quote);
  } catch (err: any) {
    res.status(502).json({ error: 'QUOTE_RETRIEVAL_FAILED', message: err.message });
  }
});

// Retrieve read-only open positions
app.get('/api/connectivity/providers/:id/positions', async (req: Request, res: Response) => {
  try {
    const positions = await providerManager.getPositions(req.params.id);
    res.json(positions);
  } catch (err: any) {
    res.status(502).json({ error: 'POSITIONS_RETRIEVAL_FAILED', message: err.message });
  }
});

// Update provider configuration (bridge URL, token, sandbox mode)
app.post('/api/connectivity/providers/:id/config', async (req: Request, res: Response) => {
  const parseResult = UpdateProviderConfigSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid configuration data', details: parseResult.error.flatten() });
  }

  try {
    const updated = await providerManager.updateConfig(req.params.id, parseResult.data);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update configuration', details: err.message });
  }
});

// Disconnect provider session
app.post('/api/connectivity/providers/:id/disconnect', async (req: Request, res: Response) => {
  try {
    await providerManager.disconnect(req.params.id);
    res.json({ success: true, message: `Provider ${req.params.id} disconnected` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to disconnect provider', details: err.message });
  }
});

// --- DERIV OAUTH 2.0 PKCE & SESSION ENDPOINTS ---

// Deriv OAuth PKCE: Generate authorization URL
app.get('/api/connectivity/deriv/auth-url', (req: Request, res: Response) => {
  try {
    const deriv = providerManager.getDerivProvider();
    if (!deriv) {
      return res.status(404).json({ error: 'Deriv provider not found' });
    }

    const requestedRedirect = (req.query.redirectUri as string) || undefined;
    const auth = deriv.initiateOAuth(requestedRedirect);
    res.json({
      authUrl: auth.authUrl,
      state: auth.state,
      redirectUri: auth.redirectUri,
    });
  } catch (err: any) {
    res.status(400).json({ error: 'Failed to initiate Deriv OAuth flow', details: err.message });
  }
});

// Deriv OAuth PKCE: Exchange authorization code for token
app.post('/api/connectivity/deriv/exchange-code', async (req: Request, res: Response) => {
  try {
    const { code, state, redirectUri } = req.body;
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state parameter' });
    }

    const deriv = providerManager.getDerivProvider();
    if (!deriv) {
      return res.status(404).json({ error: 'Deriv provider not found' });
    }

    const account = await deriv.handleOAuthCallback(code, state, redirectUri);
    res.json({ success: true, account });
  } catch (err: any) {
    res.status(400).json({ error: 'OAuth exchange failed', details: err.message });
  }
});

// Deriv Direct Token Authentication (for direct Demo tokens or manual token entry)
app.post('/api/connectivity/deriv/token', async (req: Request, res: Response) => {
  try {
    const { token, accountId } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Missing token parameter' });
    }

    const deriv = providerManager.getDerivProvider();
    if (!deriv) {
      return res.status(404).json({ error: 'Deriv provider not found' });
    }

    const account = await deriv.handleDirectToken(token, accountId);
    res.json({ success: true, account });
  } catch (err: any) {
    res.status(400).json({ error: 'Token verification failed', details: err.message });
  }
});

// Deriv OAuth Callback Ingress (Served directly for both Popup and Mobile browser redirects)
app.get('/auth/deriv/callback', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deriv Authentication - TradingOS</title>
  <style>
    body {
      background-color: #06090b;
      color: #e2e8f0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      text-align: center;
    }
    .card {
      background: #0d141a;
      border: 1px solid #1c2b36;
      border-radius: 12px;
      padding: 28px 24px;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 8px 30px rgba(0,0,0,0.5);
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      background: rgba(198, 241, 53, 0.15);
      border: 1px solid rgba(198, 241, 53, 0.3);
      color: #c6f135;
      font-size: 11px;
      font-weight: bold;
      border-radius: 4px;
      margin-bottom: 16px;
      letter-spacing: 0.05em;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid #1e293b;
      border-top-color: #c6f135;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 16px auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .status { font-size: 13px; color: #94a3b8; line-height: 1.5; margin-top: 12px; word-break: break-word; }
    .error { color: #f87171; }
    .btn {
      display: inline-block;
      margin-top: 20px;
      padding: 10px 18px;
      background: #c6f135;
      color: #000;
      font-weight: bold;
      text-decoration: none;
      border-radius: 6px;
      font-size: 12px;
      border: none;
      cursor: pointer;
    }
    .btn-secondary {
      background: #1e293b;
      color: #e2e8f0;
      border: 1px solid #334155;
      margin-left: 8px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">TRADINGOS • DERIV DEMO</div>
    <div id="spinner" class="spinner"></div>
    <h3 id="title" style="margin: 0; font-size: 16px; font-weight: 700;">Processing Authentication...</h3>
    <div id="status" class="status">Exchanging authorization credentials with Deriv...</div>
    <div id="actionArea"></div>
  </div>

  <script>
    (async function() {
      const urlParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);

      const code = urlParams.get('code') || hashParams.get('code');
      const state = urlParams.get('state') || hashParams.get('state');
      const error = urlParams.get('error') || hashParams.get('error');
      const errorDesc = urlParams.get('error_description') || hashParams.get('error_description');

      const titleEl = document.getElementById('title');
      const statusEl = document.getElementById('status');
      const spinnerEl = document.getElementById('spinner');
      const actionArea = document.getElementById('actionArea');

      if (error) {
        spinnerEl.style.display = 'none';
        titleEl.textContent = 'Authentication Declined';
        titleEl.classList.add('error');
        const displayErr = error + (errorDesc ? ': ' + errorDesc : '');
        statusEl.textContent = 'Deriv returned an authorization error: ' + displayErr;
        
        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage({ type: 'DERIV_AUTH_ERROR', error: displayErr }, '*');
          } catch(e) {}
        }
        
        const encodedErr = encodeURIComponent(displayErr);
        actionArea.innerHTML = '<a class="btn" href="/?module=connectivity&oauth_error=' + encodedErr + '">Return to TradingOS</a>';
        return;
      }

      const token1 = urlParams.get('token1') || hashParams.get('token1');
      const acct1 = urlParams.get('acct1') || hashParams.get('acct1');

      try {
        let authSuccess = false;

        if (code && state) {
          const resp = await fetch('/api/connectivity/deriv/exchange-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, state })
          });
          const data = await resp.json();
          if (!resp.ok) throw new Error(data.details || data.error || 'Token exchange failed');
          authSuccess = true;
        } else if (token1) {
          const resp = await fetch('/api/connectivity/deriv/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token1, accountId: acct1 })
          });
          const data = await resp.json();
          if (!resp.ok) throw new Error(data.details || data.error || 'Token verification failed');
          authSuccess = true;
        } else {
          throw new Error('No authorization code or token found in redirect URL.');
        }

        if (authSuccess) {
          spinnerEl.style.display = 'none';
          titleEl.textContent = 'DERIV DEMO CONNECTED';
          titleEl.style.color = '#c6f135';
          statusEl.textContent = 'Authentication verified successfully. Returning to TradingOS...';

          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ type: 'DERIV_AUTH_SUCCESS', timestamp: Date.now() }, '*');
            setTimeout(() => { window.close(); }, 1200);
          } else {
            actionArea.innerHTML = '<a class="btn" href="/?module=connectivity&oauth_success=1">Return to TradingOS</a>';
            setTimeout(() => { window.location.href = '/?module=connectivity&oauth_success=1'; }, 1500);
          }
        }
      } catch (err) {
        spinnerEl.style.display = 'none';
        titleEl.textContent = 'Connection Error';
        titleEl.classList.add('error');
        statusEl.textContent = err.message || 'Failed to complete Deriv connection.';

        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage({ type: 'DERIV_AUTH_ERROR', error: err.message }, '*');
          } catch(e) {}
        }

        const encodedErr = encodeURIComponent(err.message || 'Connection failed');
        actionArea.innerHTML = '<a class="btn" href="/?module=connectivity&oauth_error=' + encodedErr + '">Return to TradingOS</a>';
      }
    })();
  </script>
</body>
</html>`);
});

// TradingView Webhook Ingress (Event & Signal Receiver)
app.post('/api/connectivity/tradingview/webhook', (req: Request, res: Response) => {
  const alertPayload = req.body;
  console.log('[TradingView Ingress Alert Received]:', alertPayload);
  res.json({
    status: 'RECEIVED',
    ingress: 'TradingView Webhook',
    timestamp: new Date().toISOString(),
    payloadSummary: alertPayload?.ticker || alertPayload?.action || 'Generic Alert',
    readOnlyNotice: 'Alert logged. Live order execution is strictly disabled.',
  });
});

// cTrader Open API OAuth: Generate official authorization URL
app.get('/api/connectivity/ctrader/auth-url', (req: Request, res: Response) => {
  try {
    const ctrader = providerManager.getCTraderProvider();
    if (!ctrader) {
      return res.status(404).json({ error: 'cTrader provider not found' });
    }

    const requestedRedirect = (req.query.redirectUri as string) || undefined;
    const auth = ctrader.getAuthorizationUrl(requestedRedirect);
    res.json({
      authUrl: auth.authUrl,
      state: auth.state,
      redirectUri: auth.redirectUri,
    });
  } catch (err: any) {
    res.status(400).json({ error: 'Failed to initiate cTrader OAuth flow', details: err.message });
  }
});

// cTrader OAuth: Exchange authorization code server-to-server
app.post('/api/connectivity/ctrader/exchange-code', async (req: Request, res: Response) => {
  try {
    const { code, state, redirectUri } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Missing code parameter' });
    }

    const ctrader = providerManager.getCTraderProvider();
    if (!ctrader) {
      return res.status(404).json({ error: 'cTrader provider not found' });
    }

    const result = await ctrader.exchangeAuthorizationCode(code, state, redirectUri);
    res.json({ success: true, account: result.account, availableAccounts: result.availableAccounts });
  } catch (err: any) {
    res.status(400).json({ error: 'cTrader token exchange failed', details: err.message });
  }
});

// cTrader: Enumerate available accounts for active access token
app.get('/api/connectivity/ctrader/accounts', async (req: Request, res: Response) => {
  try {
    const ctrader = providerManager.getCTraderProvider();
    if (!ctrader) {
      return res.status(404).json({ error: 'cTrader provider not found' });
    }

    const summary = await ctrader.getStatus();
    res.json({
      availableAccounts: summary.availableAccounts || [],
      selectedAccountId: summary.selectedAccountId,
      currentAccount: summary.account,
    });
  } catch (err: any) {
    res.status(400).json({ error: 'Failed to retrieve cTrader accounts', details: err.message });
  }
});

// cTrader: Select active trading account from available accounts
app.post('/api/connectivity/ctrader/select-account', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.body;
    if (!accountId) {
      return res.status(400).json({ error: 'Missing accountId parameter' });
    }

    const ctrader = providerManager.getCTraderProvider();
    if (!ctrader) {
      return res.status(404).json({ error: 'cTrader provider not found' });
    }

    const account = await ctrader.selectAccount(Number(accountId));
    res.json({ success: true, account });
  } catch (err: any) {
    res.status(400).json({ error: 'Failed to switch cTrader account', details: err.message });
  }
});

// cTrader: Disconnect active session
app.post('/api/connectivity/ctrader/disconnect', async (req: Request, res: Response) => {
  try {
    const ctrader = providerManager.getCTraderProvider();
    if (ctrader) {
      await ctrader.disconnect();
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: 'Failed to disconnect cTrader', details: err.message });
  }
});

// cTrader OAuth Callback Ingress (Served directly for both Popup and Mobile browser redirects)
app.get('/auth/ctrader/callback', async (req: Request, res: Response) => {
  const code = (req.query.code as string) || '';
  const state = (req.query.state as string) || '';
  const error = (req.query.error as string) || '';
  const errorDesc = (req.query.error_description as string) || '';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  // Handle OAuth Denial or cTrader error parameter
  if (error) {
    const displayErr = error + (errorDesc ? ': ' + errorDesc : '');
    const encodedErr = encodeURIComponent(displayErr);
    return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>cTrader Authentication - TradingOS</title>
  <style>
    body {
      background-color: #06090b;
      color: #e2e8f0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      text-align: center;
    }
    .card {
      background: #0d141a;
      border: 1px solid #1c2b36;
      border-radius: 12px;
      padding: 28px 24px;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 8px 30px rgba(0,0,0,0.5);
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      font-size: 11px;
      font-weight: bold;
      border-radius: 4px;
      margin-bottom: 16px;
      letter-spacing: 0.05em;
    }
    .status { font-size: 13px; color: #94a3b8; line-height: 1.5; margin-top: 12px; word-break: break-word; }
    .btn {
      display: inline-block;
      margin-top: 20px;
      padding: 10px 18px;
      background: #c6f135;
      color: #000;
      font-weight: bold;
      text-decoration: none;
      border-radius: 6px;
      font-size: 12px;
      border: none;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">TRADINGOS • CTRADER OPEN API</div>
    <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #f87171;">Authorization Declined</h3>
    <div class="status">cTrader returned an error: ${displayErr}</div>
    <div style="margin-top: 20px;">
      <a class="btn" href="/?module=connectivity&provider=ctrader-primary&oauth_error=${encodedErr}">Return to TradingOS</a>
    </div>
  </div>
  <script>
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage({ type: 'CTRADER_AUTH_ERROR', error: ${JSON.stringify(displayErr)} }, '*');
      } catch(e) {}
    }
  </script>
</body>
</html>`);
  }

  // Validate presence of authorization code
  if (!code) {
    return res.status(400).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>cTrader Authentication - TradingOS</title>
  <style>
    body {
      background-color: #06090b;
      color: #e2e8f0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      text-align: center;
    }
    .card {
      background: #0d141a;
      border: 1px solid #1c2b36;
      border-radius: 12px;
      padding: 28px 24px;
      max-width: 440px;
      width: 100%;
    }
    .status { font-size: 13px; color: #f87171; line-height: 1.5; margin-top: 12px; }
    .btn { display: inline-block; margin-top: 20px; padding: 10px 18px; background: #c6f135; color: #000; font-weight: bold; text-decoration: none; border-radius: 6px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #f87171;">Missing Authorization Code</h3>
    <div class="status">The callback request did not contain a valid ?code= query parameter from cTrader.</div>
    <a class="btn" href="/?module=connectivity&provider=ctrader-primary">Return to TradingOS</a>
  </div>
</body>
</html>`);
  }

  // Server-to-server token exchange
  try {
    const ctrader = providerManager.getCTraderProvider();
    if (!ctrader) {
      throw new Error('cTrader provider not registered.');
    }

    const exchangeResult = await ctrader.exchangeAuthorizationCode(code, state);
    const account = exchangeResult.account;
    const accountLabel = account ? account.accountName : 'cTrader Account';
    const balanceLabel = account ? '$' + account.balance.toFixed(2) : 'Active';

    return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>cTrader Authentication - TradingOS</title>
  <style>
    body {
      background-color: #06090b;
      color: #e2e8f0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      text-align: center;
    }
    .card {
      background: #0d141a;
      border: 1px solid #1c2b36;
      border-radius: 12px;
      padding: 28px 24px;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 8px 30px rgba(0,0,0,0.5);
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      background: rgba(198, 241, 53, 0.15);
      border: 1px solid rgba(198, 241, 53, 0.3);
      color: #c6f135;
      font-size: 11px;
      font-weight: bold;
      border-radius: 4px;
      margin-bottom: 16px;
      letter-spacing: 0.05em;
    }
    .status { font-size: 13px; color: #94a3b8; line-height: 1.5; margin-top: 12px; word-break: break-word; }
    .btn {
      display: inline-block;
      margin-top: 20px;
      padding: 10px 18px;
      background: #c6f135;
      color: #000;
      font-weight: bold;
      text-decoration: none;
      border-radius: 6px;
      font-size: 12px;
      border: none;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">TRADINGOS • CTRADER DEMO</div>
    <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #c6f135;">Authentication Successful!</h3>
    <div class="status">
      Connected to <strong>${accountLabel}</strong><br>
      Balance: <strong style="color: #c6f135;">${balanceLabel}</strong> (Read-Only Mode)
    </div>
    <div style="margin-top: 20px;">
      <a class="btn" id="returnBtn" href="/?module=connectivity&provider=ctrader-primary&oauth_success=1">Return to TradingOS</a>
    </div>
  </div>
  <script>
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage({
          type: 'CTRADER_AUTH_SUCCESS',
          account: ${JSON.stringify(account)},
          availableAccounts: ${JSON.stringify(exchangeResult.availableAccounts)}
        }, '*');
        setTimeout(function() { window.close(); }, 1200);
      } catch(e) {}
    } else {
      setTimeout(function() {
        window.location.href = '/?module=connectivity&provider=ctrader-primary&oauth_success=1';
      }, 1500);
    }
  </script>
</body>
</html>`);
  } catch (err: any) {
    const displayErr = err.message || 'Server-to-server token exchange failed';
    const encodedErr = encodeURIComponent(displayErr);
    return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>cTrader Authentication - TradingOS</title>
  <style>
    body {
      background-color: #06090b;
      color: #e2e8f0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      text-align: center;
    }
    .card {
      background: #0d141a;
      border: 1px solid #1c2b36;
      border-radius: 12px;
      padding: 28px 24px;
      max-width: 440px;
      width: 100%;
    }
    .status { font-size: 13px; color: #f87171; line-height: 1.5; margin-top: 12px; word-break: break-word; }
    .btn { display: inline-block; margin-top: 20px; padding: 10px 18px; background: #c6f135; color: #000; font-weight: bold; text-decoration: none; border-radius: 6px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #f87171;">Token Exchange Failed</h3>
    <div class="status">${displayErr}</div>
    <a class="btn" href="/?module=connectivity&provider=ctrader-primary&oauth_error=${encodedErr}">Return to TradingOS</a>
  </div>
  <script>
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage({ type: 'CTRADER_AUTH_ERROR', error: ${JSON.stringify(displayErr)} }, '*');
      } catch(e) {}
    }
  </script>
</body>
</html>`);
  }
});

// STRICT SAFETY BOUNDARY: Hard-block any live order placement, trade execution, or position closure
app.all(['/api/orders*', '/api/trades/execute*', '/api/positions/close*'], (req: Request, res: Response) => {
  res.status(403).json({
    error: 'EXECUTION_BLOCKED_READ_ONLY_MILESTONE',
    message: 'TradingOS is currently in Read-Only Connectivity Mode (MT5, Deriv Demo, & cTrader Demo). Live order execution and position modifications are physically prohibited.',
    tradingAllowed: false,
    timestamp: new Date().toISOString(),
  });
});

// Server Initialization with Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TradingOS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
