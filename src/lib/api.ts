import {
  Strategy,
  GenericStrategyRule,
  InstrumentQuote,
  MarketSessionInfo,
  RuleEvaluationReport,
  TradeDecision,
  JournalEntry,
  AnalyticsSummary,
  StrategyConfiguration,
  ProviderSummary,
  ConnectionDiagnosticsReport,
  NormalizedAccount,
  NormalizedSymbol,
  NormalizedQuote,
  NormalizedPosition,
  ProviderConfig,
} from '../types';
import {
  INITIAL_STRATEGIES,
  INITIAL_RULES,
  INITIAL_INSTRUMENTS,
  INITIAL_SESSIONS,
  INITIAL_DECISIONS,
  INITIAL_JOURNAL,
  INITIAL_ANALYTICS,
} from '../data/initialData';
import { evaluateStrategyRules } from './ruleEvaluationEngine';

// Local Storage Fallback Cache Keys
const STORAGE_KEYS = {
  STRATEGIES: 'tradingos_strategies_v1',
  RULES: 'tradingos_rules_v1',
  JOURNAL: 'tradingos_journal_v1',
  DECISIONS: 'tradingos_decisions_v1',
};

function getLocal<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('Local storage write error:', err);
  }
}

export const api = {
  async getStrategies(): Promise<Strategy[]> {
    try {
      const res = await fetch('/api/strategies');
      if (res.ok) {
        const data = await res.json();
        setLocal(STORAGE_KEYS.STRATEGIES, data);
        return data;
      }
    } catch {
      // Fallback
    }
    return getLocal<Strategy[]>(STORAGE_KEYS.STRATEGIES, INITIAL_STRATEGIES);
  },

  async getStrategy(id: string): Promise<Strategy | null> {
    try {
      const res = await fetch(`/api/strategies/${id}`);
      if (res.ok) return await res.json();
    } catch {}
    const strats = getLocal<Strategy[]>(STORAGE_KEYS.STRATEGIES, INITIAL_STRATEGIES);
    return strats.find((s) => s.id === id) || null;
  },

  async createStrategy(strategyData: Partial<Strategy>): Promise<Strategy> {
    try {
      const res = await fetch('/api/strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(strategyData),
      });
      if (res.ok) {
        const created = await res.json();
        const current = getLocal<Strategy[]>(STORAGE_KEYS.STRATEGIES, INITIAL_STRATEGIES);
        setLocal(STORAGE_KEYS.STRATEGIES, [created, ...current]);
        return created;
      }
    } catch {}

    const newStrat: Strategy = {
      id: `strat-${Date.now().toString(36)}`,
      name: strategyData.name || 'New Trading Strategy',
      description: strategyData.description || 'Structured algorithmic strategy',
      market: (strategyData.market || 'EURUSD').toUpperCase(),
      assetClass: strategyData.assetClass || 'FOREX',
      status: strategyData.status || 'DRAFT',
      version: '1.0.0',
      tags: strategyData.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      configuration: strategyData.configuration || INITIAL_STRATEGIES[0].configuration,
      rulesCount: 0,
    };
    const current = getLocal<Strategy[]>(STORAGE_KEYS.STRATEGIES, INITIAL_STRATEGIES);
    setLocal(STORAGE_KEYS.STRATEGIES, [newStrat, ...current]);
    return newStrat;
  },

  async updateStrategy(id: string, updates: Partial<Strategy>): Promise<Strategy> {
    try {
      const res = await fetch(`/api/strategies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        const current = getLocal<Strategy[]>(STORAGE_KEYS.STRATEGIES, INITIAL_STRATEGIES);
        setLocal(
          STORAGE_KEYS.STRATEGIES,
          current.map((s) => (s.id === id ? updated : s))
        );
        return updated;
      }
    } catch {}

    const current = getLocal<Strategy[]>(STORAGE_KEYS.STRATEGIES, INITIAL_STRATEGIES);
    const updatedList = current.map((s) =>
      s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
    );
    setLocal(STORAGE_KEYS.STRATEGIES, updatedList);
    return updatedList.find((s) => s.id === id)!;
  },

  async deleteStrategy(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/strategies/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const current = getLocal<Strategy[]>(STORAGE_KEYS.STRATEGIES, INITIAL_STRATEGIES);
        setLocal(
          STORAGE_KEYS.STRATEGIES,
          current.filter((s) => s.id !== id)
        );
        return true;
      }
    } catch {}

    const current = getLocal<Strategy[]>(STORAGE_KEYS.STRATEGIES, INITIAL_STRATEGIES);
    setLocal(
      STORAGE_KEYS.STRATEGIES,
      current.filter((s) => s.id !== id)
    );
    return true;
  },

  async duplicateStrategy(id: string): Promise<Strategy> {
    try {
      const res = await fetch(`/api/strategies/${id}/duplicate`, { method: 'POST' });
      if (res.ok) {
        const dup = await res.json();
        const current = getLocal<Strategy[]>(STORAGE_KEYS.STRATEGIES, INITIAL_STRATEGIES);
        setLocal(STORAGE_KEYS.STRATEGIES, [dup, ...current]);
        return dup;
      }
    } catch {}

    const existing = (await this.getStrategy(id)) || INITIAL_STRATEGIES[0];
    const newId = `strat-${Date.now().toString(36)}`;
    const cloned: Strategy = {
      ...existing,
      id: newId,
      name: `${existing.name} (Copy)`,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const current = getLocal<Strategy[]>(STORAGE_KEYS.STRATEGIES, INITIAL_STRATEGIES);
    setLocal(STORAGE_KEYS.STRATEGIES, [cloned, ...current]);
    return cloned;
  },

  async updateConfiguration(id: string, config: StrategyConfiguration): Promise<StrategyConfiguration> {
    try {
      const res = await fetch(`/api/strategies/${id}/configuration`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) return await res.json();
    } catch {}

    const strats = getLocal<Strategy[]>(STORAGE_KEYS.STRATEGIES, INITIAL_STRATEGIES);
    const updated = strats.map((s) =>
      s.id === id ? { ...s, configuration: config, updatedAt: new Date().toISOString() } : s
    );
    setLocal(STORAGE_KEYS.STRATEGIES, updated);
    return config;
  },

  async getRules(strategyId: string): Promise<GenericStrategyRule[]> {
    try {
      const res = await fetch(`/api/strategies/${strategyId}/rules`);
      if (res.ok) return await res.json();
    } catch {}

    const allRules = getLocal<GenericStrategyRule[]>(STORAGE_KEYS.RULES, INITIAL_RULES);
    return allRules.filter((r) => r.strategyId === strategyId);
  },

  async createRule(strategyId: string, ruleData: Partial<GenericStrategyRule>): Promise<GenericStrategyRule> {
    try {
      const res = await fetch(`/api/strategies/${strategyId}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData),
      });
      if (res.ok) {
        const created = await res.json();
        const allRules = getLocal<GenericStrategyRule[]>(STORAGE_KEYS.RULES, INITIAL_RULES);
        setLocal(STORAGE_KEYS.RULES, [...allRules, created]);
        return created;
      }
    } catch {}

    const newRule: GenericStrategyRule = {
      id: `rule-${Date.now().toString(36)}`,
      strategyId,
      category: ruleData.category || 'ENTRY',
      name: ruleData.name || 'New Strategy Rule',
      description: ruleData.description || '',
      enabled: ruleData.enabled ?? true,
      priority: ruleData.priority || 5,
      group: ruleData.group || 'General',
      logicalOperator: ruleData.logicalOperator || 'AND',
      condition: ruleData.condition,
      parameters: ruleData.parameters || {},
      validationStatus: 'VALID',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const allRules = getLocal<GenericStrategyRule[]>(STORAGE_KEYS.RULES, INITIAL_RULES);
    setLocal(STORAGE_KEYS.RULES, [...allRules, newRule]);
    return newRule;
  },

  async updateRule(
    strategyId: string,
    ruleId: string,
    updates: Partial<GenericStrategyRule>
  ): Promise<GenericStrategyRule> {
    try {
      const res = await fetch(`/api/strategies/${strategyId}/rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        const allRules = getLocal<GenericStrategyRule[]>(STORAGE_KEYS.RULES, INITIAL_RULES);
        setLocal(
          STORAGE_KEYS.RULES,
          allRules.map((r) => (r.id === ruleId ? updated : r))
        );
        return updated;
      }
    } catch {}

    const allRules = getLocal<GenericStrategyRule[]>(STORAGE_KEYS.RULES, INITIAL_RULES);
    const updatedList = allRules.map((r) =>
      r.id === ruleId ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
    );
    setLocal(STORAGE_KEYS.RULES, updatedList);
    return updatedList.find((r) => r.id === ruleId)!;
  },

  async deleteRule(strategyId: string, ruleId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/strategies/${strategyId}/rules/${ruleId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const allRules = getLocal<GenericStrategyRule[]>(STORAGE_KEYS.RULES, INITIAL_RULES);
        setLocal(
          STORAGE_KEYS.RULES,
          allRules.filter((r) => r.id !== ruleId)
        );
        return true;
      }
    } catch {}

    const allRules = getLocal<GenericStrategyRule[]>(STORAGE_KEYS.RULES, INITIAL_RULES);
    setLocal(
      STORAGE_KEYS.RULES,
      allRules.filter((r) => r.id !== ruleId)
    );
    return true;
  },

  async evaluateStrategy(strategyId: string, customState?: any): Promise<RuleEvaluationReport> {
    try {
      const res = await fetch(`/api/strategies/${strategyId}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: customState }),
      });
      if (res.ok) return await res.json();
    } catch {}

    const strats = await this.getStrategies();
    const currentStrat = strats.find((s) => s.id === strategyId) || INITIAL_STRATEGIES[0];
    const rules = await this.getRules(strategyId);
    return evaluateStrategyRules(currentStrat.id, currentStrat.name, currentStrat.market, rules);
  },

  async getMarkets(): Promise<InstrumentQuote[]> {
    try {
      const res = await fetch('/api/markets');
      if (res.ok) return await res.json();
    } catch {}
    return INITIAL_INSTRUMENTS;
  },

  async getSessions(): Promise<MarketSessionInfo[]> {
    try {
      const res = await fetch('/api/markets/sessions');
      if (res.ok) return await res.json();
    } catch {}
    return INITIAL_SESSIONS;
  },

  async getDecisions(): Promise<TradeDecision[]> {
    try {
      const res = await fetch('/api/trades');
      if (res.ok) return await res.json();
    } catch {}
    return getLocal<TradeDecision[]>(STORAGE_KEYS.DECISIONS, INITIAL_DECISIONS);
  },

  async getJournal(): Promise<JournalEntry[]> {
    try {
      const res = await fetch('/api/journal');
      if (res.ok) return await res.json();
    } catch {}
    return getLocal<JournalEntry[]>(STORAGE_KEYS.JOURNAL, INITIAL_JOURNAL);
  },

  async addJournalEntry(entry: Partial<JournalEntry>): Promise<JournalEntry> {
    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (res.ok) return await res.json();
    } catch {}

    const newEntry: JournalEntry = {
      id: `jrn-${Date.now().toString(36)}`,
      strategyId: entry.strategyId || 'strat-001',
      strategyName: entry.strategyName || 'Strategy',
      instrument: entry.instrument || 'EURUSD',
      direction: entry.direction || 'BUY',
      entryPrice: entry.entryPrice || 1.085,
      stopLoss: entry.stopLoss || 1.082,
      takeProfit: entry.takeProfit || 1.091,
      result: entry.result || 'OPEN',
      marketConditions: entry.marketConditions || 'Normal volatility',
      technicalSetup: entry.technicalSetup || '',
      fundamentalContext: entry.fundamentalContext || '',
      userNotes: entry.userNotes || '',
      lessonsLearned: entry.lessonsLearned || '',
      disciplineRating: entry.disciplineRating || 5,
      timestamp: new Date().toISOString(),
    };

    const current = getLocal<JournalEntry[]>(STORAGE_KEYS.JOURNAL, INITIAL_JOURNAL);
    setLocal(STORAGE_KEYS.JOURNAL, [newEntry, ...current]);
    return newEntry;
  },

  async getAnalytics(): Promise<Record<'DEMO' | 'BACKTEST' | 'LIVE', AnalyticsSummary>> {
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) return await res.json();
    } catch {}
    return INITIAL_ANALYTICS;
  },

  // ==========================================
  // CONNECTIVITY & BROKER PROVIDER METHODS
  // ==========================================
  async getProviders(): Promise<ProviderSummary[]> {
    try {
      const res = await fetch('/api/connectivity/providers');
      if (res.ok) return await res.json();
    } catch {}

    // Fallback if backend temporarily restarting
    return [
      {
        id: 'mt5-primary',
        type: 'MT5',
        name: 'MetaTrader 5 (Local Desktop)',
        version: '1.0.0',
        status: 'DISCONNECTED',
        statusMessage: 'Local bridge agent waiting for connection on http://127.0.0.1:8001',
        capabilities: {
          readAccount: true,
          readQuotes: true,
          readCandles: true,
          readPositions: true,
          readOrders: true,
          readHistory: true,
          webhooks: false,
          liveExecution: false,
        },
        config: {
          bridgeUrl: 'http://127.0.0.1:8001',
          hasToken: false,
          isLocal: true,
          readOnlyEnforced: true,
        },
      },
      {
        id: 'ctrader-primary',
        type: 'CTRADER',
        name: 'cTrader Open API (Architecture Ready)',
        version: '1.0.0',
        status: 'UNCONFIGURED',
        statusMessage: 'cTrader Open API integration architecture ready.',
        capabilities: {
          readAccount: true,
          readQuotes: true,
          readCandles: true,
          readPositions: true,
          readOrders: true,
          readHistory: true,
          webhooks: true,
          liveExecution: false,
        },
        config: {
          readOnlyEnforced: true,
        },
      },
      {
        id: 'deriv-primary',
        type: 'DERIV',
        name: 'Deriv WebSocket API (Architecture Ready)',
        version: '1.0.0',
        status: 'UNCONFIGURED',
        statusMessage: 'Deriv WebSocket integration architecture ready.',
        capabilities: {
          readAccount: true,
          readQuotes: true,
          readCandles: true,
          readPositions: true,
          readOrders: false,
          readHistory: true,
          webhooks: false,
          liveExecution: false,
        },
        config: {
          readOnlyEnforced: true,
        },
      },
      {
        id: 'tradingview-source',
        type: 'TRADINGVIEW',
        name: 'TradingView (Webhook Ingress & Signal Source)',
        version: '1.0.0',
        status: 'UNCONFIGURED',
        statusMessage: 'TradingView webhook receiver endpoint ready.',
        capabilities: {
          readAccount: false,
          readQuotes: true,
          readCandles: false,
          readPositions: false,
          readOrders: false,
          readHistory: false,
          webhooks: true,
          liveExecution: false,
        },
        config: {
          readOnlyEnforced: true,
        },
      },
    ];
  },

  async testProvider(providerId: string): Promise<ConnectionDiagnosticsReport> {
    try {
      const res = await fetch(`/api/connectivity/providers/${providerId}/test`, {
        method: 'POST',
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Diagnostic probe failed with status ${res.status}`);
    } catch (err: any) {
      return {
        providerId,
        providerType: 'MT5',
        timestamp: new Date().toISOString(),
        overallStatus: 'FAILED',
        steps: [
          {
            id: 'backend_connection',
            name: 'TradingOS API Route Active',
            status: 'FAIL',
            message: err.message || 'Could not communicate with backend',
            timestamp: new Date().toISOString(),
          },
        ],
        summary: 'Connection diagnostic probe failed.',
        troubleshootingNotes: [
          'Verify that the TradingOS server is running.',
          'Start mt5-bridge/bridge.py locally.',
        ],
      };
    }
  },

  async getProviderAccount(providerId: string): Promise<NormalizedAccount> {
    const res = await fetch(`/api/connectivity/providers/${providerId}/account`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Account retrieval failed');
    }
    return await res.json();
  },

  async getProviderSymbols(providerId: string, search?: string): Promise<NormalizedSymbol[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`/api/connectivity/providers/${providerId}/symbols${query}`);
    if (!res.ok) return [];
    return await res.json();
  },

  async getProviderQuote(providerId: string, symbol: string): Promise<NormalizedQuote> {
    const res = await fetch(`/api/connectivity/providers/${providerId}/quote?symbol=${encodeURIComponent(symbol)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Quote for ${symbol} unavailable`);
    }
    return await res.json();
  },

  async getProviderPositions(providerId: string): Promise<NormalizedPosition[]> {
    const res = await fetch(`/api/connectivity/providers/${providerId}/positions`);
    if (!res.ok) return [];
    return await res.json();
  },

  async updateProviderConfig(
    providerId: string,
    config: Partial<ProviderConfig & { isSandboxOverride?: boolean }>
  ): Promise<ProviderSummary> {
    const res = await fetch(`/api/connectivity/providers/${providerId}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Config update failed');
    }
    return await res.json();
  },

  async disconnectProvider(providerId: string): Promise<void> {
    await fetch(`/api/connectivity/providers/${providerId}/disconnect`, {
      method: 'POST',
    });
  },
};
