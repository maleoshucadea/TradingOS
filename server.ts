import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
