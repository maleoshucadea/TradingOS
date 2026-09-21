import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Plus,
  Copy,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  Settings,
  ChevronDown,
  ChevronUp,
  Filter,
  Save,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  Code2,
} from 'lucide-react';
import {
  Strategy,
  GenericStrategyRule,
  RuleCategory,
  RuleSource,
  RuleOperator,
  StrategyCondition,
  RuleEvaluationReport,
  StrategyStatus,
  AssetClass,
} from '../../types';
import {
  STRATEGY_LANGUAGE_FIELDS,
  OPERATOR_LABELS,
  OPERATOR_SYMBOLS,
  formatConditionString,
  validateCondition,
} from '../../lib/strategyLanguage';
import { api } from '../../lib/api';

interface StrategyBuilderViewProps {
  strategies: Strategy[];
  selectedStrategyId: string | null;
  onSelectStrategy: (id: string) => void;
  onRefreshStrategies: () => void;
}

export const StrategyBuilderView: React.FC<StrategyBuilderViewProps> = ({
  strategies,
  selectedStrategyId,
  onSelectStrategy,
  onRefreshStrategies,
}) => {
  // Current active strategy
  const activeStrategy =
    strategies.find((s) => s.id === selectedStrategyId) || strategies[0] || null;

  // Rules list state
  const [rules, setRules] = useState<GenericStrategyRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);

  // Tabs for strategy details: 6 configuration sections + rules engine + evaluation report
  const [activeTab, setActiveTab] = useState<
    'RULES' | 'MARKET_CONTEXT' | 'FUNDAMENTALS' | 'TECHNICAL' | 'ENTRY' | 'EXIT' | 'RISK'
  >('RULES');

  // Filter rules by category
  const [categoryFilter, setCategoryFilter] = useState<RuleCategory | 'ALL'>('ALL');

  // Rule editor modal state
  const [editingRule, setEditingRule] = useState<GenericStrategyRule | null>(null);
  const [isCreatingNewRule, setIsCreatingNewRule] = useState(false);

  // Strategy editor modal state
  const [isCreatingStrategy, setIsCreatingStrategy] = useState(false);
  const [newStrategyForm, setNewStrategyForm] = useState({
    name: '',
    description: '',
    market: 'EURUSD',
    assetClass: 'FOREX' as AssetClass,
    status: 'TESTING' as StrategyStatus,
  });

  // Strategy Evaluation Report Modal State
  const [evaluationReport, setEvaluationReport] = useState<RuleEvaluationReport | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  // Load rules for active strategy
  useEffect(() => {
    if (activeStrategy) {
      setLoadingRules(true);
      api
        .getRules(activeStrategy.id)
        .then((data) => setRules(data))
        .finally(() => setLoadingRules(false));
    }
  }, [activeStrategy?.id]);

  const handleDuplicate = async (id: string) => {
    await api.duplicateStrategy(id);
    onRefreshStrategies();
  };

  const handleDeleteStrategy = async (id: string) => {
    if (confirm('Are you sure you want to delete this strategy?')) {
      await api.deleteStrategy(id);
      onRefreshStrategies();
    }
  };

  const handleCreateStrategySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStrategyForm.name.trim()) return;
    const created = await api.createStrategy({
      name: newStrategyForm.name,
      description: newStrategyForm.description || 'Systematic rule-based model',
      market: newStrategyForm.market.toUpperCase(),
      assetClass: newStrategyForm.assetClass,
      status: newStrategyForm.status,
      tags: [newStrategyForm.assetClass, 'Rule-Based'],
    });
    setIsCreatingStrategy(false);
    onRefreshStrategies();
    onSelectStrategy(created.id);
  };

  const handleToggleRule = async (rule: GenericStrategyRule) => {
    if (!activeStrategy) return;
    const updated = await api.updateRule(activeStrategy.id, rule.id, {
      enabled: !rule.enabled,
    });
    setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!activeStrategy) return;
    await api.deleteRule(activeStrategy.id, ruleId);
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
  };

  const handleRunEvaluation = async () => {
    if (!activeStrategy) return;
    setEvaluating(true);
    try {
      const report = await api.evaluateStrategy(activeStrategy.id);
      setEvaluationReport(report);
    } finally {
      setEvaluating(false);
    }
  };

  // Filtered rules
  const displayedRules = rules.filter(
    (r) => categoryFilter === 'ALL' || r.category === categoryFilter
  );

  return (
    <div className="space-y-4 pb-16 font-mono">
      {/* Strategy Selector Header & Actions */}
      <div className="p-3 bg-[#0d1216] rounded border border-[#1b252f] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[#c6f135]/10 text-[#c6f135] border border-[#c6f135]/30">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-semibold">STRATEGY ARSENAL</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#162029] text-[#c6f135] border border-[#23313d]">
                {strategies.length} MODELS
              </span>
            </div>
            {activeStrategy ? (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-bold text-white tracking-wide">
                  {activeStrategy.name}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#16212b] text-[#00f5ff] border border-[#202e3c]">
                  {activeStrategy.market}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#192215] text-[#c6f135] border border-[#2d421d]">
                  {activeStrategy.status}
                </span>
              </div>
            ) : (
              <span className="text-xs text-gray-500">No strategy selected</span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Strategy Switcher Dropdown */}
          <select
            value={activeStrategy?.id || ''}
            onChange={(e) => onSelectStrategy(e.target.value)}
            className="bg-[#12181f] text-gray-200 border border-[#202c38] rounded px-2.5 py-1 text-xs focus:outline-none focus:border-[#c6f135]"
          >
            {strategies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.market})
              </option>
            ))}
          </select>

          {/* Evaluate Button */}
          <button
            id="evaluate-strategy-btn"
            onClick={handleRunEvaluation}
            disabled={evaluating}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded bg-[#c6f135] text-black hover:bg-[#b5dc30] active:scale-95 transition-all shadow-[0_0_12px_rgba(198,241,53,0.25)]"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            <span>{evaluating ? 'TESTING...' : 'EVALUATE ENGINE'}</span>
          </button>

          {/* Duplicate Button */}
          {activeStrategy && (
            <button
              onClick={() => handleDuplicate(activeStrategy.id)}
              className="p-1.5 rounded bg-[#131b22] text-gray-300 border border-[#212d38] hover:text-white hover:bg-[#1a2530]"
              title="Duplicate Strategy"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}

          {/* New Strategy Button */}
          <button
            onClick={() => setIsCreatingStrategy(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-[#141d24] text-gray-200 border border-[#23313d] hover:border-[#c6f135]/60 hover:text-white"
          >
            <Plus className="w-3.5 h-3.5 text-[#c6f135]" />
            <span className="hidden sm:inline">NEW STRATEGY</span>
          </button>
        </div>
      </div>

      {/* Tabs Row: Generic Strategy Rules vs 6 Configuration Domains */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-[#1b252f] text-xs">
        {[
          { id: 'RULES', label: 'STRATEGY LANGUAGE RULES', count: rules.length, highlight: true },
          { id: 'MARKET_CONTEXT', label: '1. MARKET CONTEXT' },
          { id: 'FUNDAMENTALS', label: '2. FUNDAMENTALS' },
          { id: 'TECHNICAL', label: '3. TECHNICAL' },
          { id: 'ENTRY', label: '4. ENTRY' },
          { id: 'EXIT', label: '5. EXIT' },
          { id: 'RISK', label: '6. RISK MANAGEMENT' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-t text-xs whitespace-nowrap transition-all border-t border-x ${
              activeTab === tab.id
                ? 'bg-[#10171d] text-[#c6f135] border-[#22313e] font-bold border-b-2 border-b-transparent'
                : 'bg-transparent text-gray-400 border-transparent hover:text-gray-200 hover:bg-[#0d1216]'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="text-[10px] px-1 py-0.2 rounded bg-[#1b2631] text-gray-300">
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content 1: Strategy Rules & Strategy Language Manager */}
      {activeTab === 'RULES' && (
        <div className="space-y-3">
          {/* Rules Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-[#0d1216] rounded border border-[#1b252f] text-xs">
            <div className="flex items-center gap-2 overflow-x-auto">
              <Filter className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="text-gray-500 text-[11px] shrink-0">CATEGORY:</span>
              {[
                'ALL',
                'MARKET_CONTEXT',
                'FUNDAMENTALS',
                'TECHNICAL_ANALYSIS',
                'ENTRY',
                'EXIT',
                'RISK_MANAGEMENT',
              ].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat as any)}
                  className={`px-2 py-0.5 rounded text-[10px] shrink-0 transition-colors ${
                    categoryFilter === cat
                      ? 'bg-[#c6f135]/20 text-[#c6f135] font-bold border border-[#c6f135]/40'
                      : 'text-gray-400 hover:text-gray-200 bg-[#12181f] border border-[#1b252f]'
                  }`}
                >
                  {cat.replace('_', ' ')}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setEditingRule(null);
                setIsCreatingNewRule(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded bg-[#18232c] text-[#c6f135] border border-[#c6f135]/40 hover:bg-[#202f3c] shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD RULE</span>
            </button>
          </div>

          {/* Rules List */}
          <div className="space-y-2">
            {loadingRules ? (
              <div className="p-8 text-center text-xs text-gray-500">
                Loading strategy language rules...
              </div>
            ) : displayedRules.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500 border border-dashed border-[#1f2c38] rounded">
                No rules defined for this filter. Click "Add Rule" to configure a Strategy Language condition.
              </div>
            ) : (
              displayedRules.map((rule) => {
                const conditionStr = rule.condition
                  ? formatConditionString(rule.condition)
                  : rule.description || 'Manual condition';

                const categoryColors: Record<RuleCategory, { text: string; bg: string }> = {
                  MARKET_CONTEXT: { text: 'text-[#00f5ff]', bg: 'bg-[#00f5ff]/10' },
                  FUNDAMENTALS: { text: 'text-amber-400', bg: 'bg-amber-400/10' },
                  TECHNICAL_ANALYSIS: { text: 'text-[#c6f135]', bg: 'bg-[#c6f135]/10' },
                  ENTRY: { text: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                  EXIT: { text: 'text-purple-400', bg: 'bg-purple-400/10' },
                  RISK_MANAGEMENT: { text: 'text-rose-400', bg: 'bg-rose-400/10' },
                };

                const catStyle = categoryColors[rule.category];

                return (
                  <div
                    key={rule.id}
                    className={`p-3 rounded border transition-all ${
                      rule.enabled
                        ? 'bg-[#0d1216] border-[#1b252f] hover:border-[#2a3a49]'
                        : 'bg-[#0a0e11] border-[#151c22] opacity-60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded border border-transparent ${catStyle.bg} ${catStyle.text}`}
                          >
                            {rule.category}
                          </span>
                          <span className="text-xs font-bold text-white">{rule.name}</span>
                          <span className="text-[10px] text-gray-500">
                            Priority: P{rule.priority}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            Group: {rule.group}
                          </span>
                        </div>

                        {/* Strategy Language Condition Expression AST */}
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#090d10] border border-[#162028] text-xs font-mono text-[#00f5ff]">
                            <Code2 className="w-3.5 h-3.5 text-gray-500" />
                            <span>{conditionStr}</span>
                          </div>
                          {rule.condition && (
                            <span className="text-[9px] text-gray-500">
                              (AST: {rule.condition.source}.{rule.condition.field})
                            </span>
                          )}
                        </div>

                        {rule.description && (
                          <p className="text-[11px] text-gray-400">{rule.description}</p>
                        )}
                      </div>

                      {/* Rule Controls */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          onClick={() => handleToggleRule(rule)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                            rule.enabled
                              ? 'bg-[#c6f135]/20 text-[#c6f135] border border-[#c6f135]/40'
                              : 'bg-gray-800 text-gray-400 border border-gray-700'
                          }`}
                        >
                          {rule.enabled ? 'ACTIVE' : 'DISABLED'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingRule(rule);
                            setIsCreatingNewRule(false);
                          }}
                          className="p-1 rounded text-gray-400 hover:text-white bg-[#141b21] border border-[#1f2933]"
                          title="Edit Rule"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1 rounded text-gray-500 hover:text-rose-400 bg-[#141b21] border border-[#1f2933]"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab Content 2-7: Strategy Configuration Domain Areas */}
      {activeStrategy && activeTab !== 'RULES' && (
        <StrategyConfigPanel
          strategy={activeStrategy}
          activeTab={activeTab}
          onUpdate={async (newConfig) => {
            await api.updateConfiguration(activeStrategy.id, newConfig);
            onRefreshStrategies();
          }}
        />
      )}

      {/* MODAL 1: Rule Creator & Strategy Language AST Condition Editor */}
      {(isCreatingNewRule || editingRule) && activeStrategy && (
        <RuleEditorModal
          strategyId={activeStrategy.id}
          existingRule={editingRule}
          onClose={() => {
            setIsCreatingNewRule(false);
            setEditingRule(null);
          }}
          onSave={async (ruleData) => {
            if (editingRule) {
              const updated = await api.updateRule(
                activeStrategy.id,
                editingRule.id,
                ruleData
              );
              setRules((prev) => prev.map((r) => (r.id === editingRule.id ? updated : r)));
            } else {
              const created = await api.createRule(activeStrategy.id, ruleData);
              setRules((prev) => [...prev, created]);
            }
            setIsCreatingNewRule(false);
            setEditingRule(null);
          }}
        />
      )}

      {/* MODAL 2: Create Strategy Modal */}
      {isCreatingStrategy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreateStrategySubmit}
            className="w-full max-w-md bg-[#0e1419] border border-[#1f2b37] rounded-lg p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#1f2b37]">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#c6f135]" />
                <span className="text-sm font-bold text-white">NEW TRADING STRATEGY</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingStrategy(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">Strategy Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Asian Range Sweep & Expansion"
                  value={newStrategyForm.name}
                  onChange={(e) =>
                    setNewStrategyForm({ ...newStrategyForm, name: e.target.value })
                  }
                  className="w-full bg-[#121921] border border-[#202d3b] rounded px-3 py-2 text-white focus:outline-none focus:border-[#c6f135]"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Systematic edge logic and theoretical execution premises..."
                  value={newStrategyForm.description}
                  onChange={(e) =>
                    setNewStrategyForm({ ...newStrategyForm, description: e.target.value })
                  }
                  className="w-full bg-[#121921] border border-[#202d3b] rounded px-3 py-2 text-white focus:outline-none focus:border-[#c6f135]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-400 mb-1">Primary Market Symbol</label>
                  <input
                    type="text"
                    required
                    placeholder="EURUSD"
                    value={newStrategyForm.market}
                    onChange={(e) =>
                      setNewStrategyForm({ ...newStrategyForm, market: e.target.value })
                    }
                    className="w-full bg-[#121921] border border-[#202d3b] rounded px-3 py-2 text-white uppercase focus:outline-none focus:border-[#c6f135]"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Asset Class</label>
                  <select
                    value={newStrategyForm.assetClass}
                    onChange={(e) =>
                      setNewStrategyForm({
                        ...newStrategyForm,
                        assetClass: e.target.value as AssetClass,
                      })
                    }
                    className="w-full bg-[#121921] border border-[#202d3b] rounded px-3 py-2 text-white focus:outline-none focus:border-[#c6f135]"
                  >
                    <option value="FOREX">FOREX</option>
                    <option value="INDICES">INDICES</option>
                    <option value="COMMODITIES">COMMODITIES</option>
                    <option value="CRYPTO">CRYPTO</option>
                    <option value="STOCKS">STOCKS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Initial Status</label>
                <select
                  value={newStrategyForm.status}
                  onChange={(e) =>
                    setNewStrategyForm({
                      ...newStrategyForm,
                      status: e.target.value as StrategyStatus,
                    })
                  }
                  className="w-full bg-[#121921] border border-[#202d3b] rounded px-3 py-2 text-white focus:outline-none focus:border-[#c6f135]"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="TESTING">TESTING</option>
                  <option value="DEMO">DEMO</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1f2b37]">
              <button
                type="button"
                onClick={() => setIsCreatingStrategy(false)}
                className="px-3 py-1.5 rounded bg-[#162029] text-gray-400 hover:text-white text-xs"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-[#c6f135] text-black font-bold text-xs hover:bg-[#b5dc30]"
              >
                CREATE MODEL
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: Rule Evaluation Report Modal */}
      {evaluationReport && (
        <EvaluationReportModal
          report={evaluationReport}
          onClose={() => setEvaluationReport(null)}
        />
      )}
    </div>
  );
};

/**
 * Strategy Configuration Domain Panel (Areas 1-6)
 */
const StrategyConfigPanel: React.FC<{
  strategy: Strategy;
  activeTab: 'MARKET_CONTEXT' | 'FUNDAMENTALS' | 'TECHNICAL' | 'ENTRY' | 'EXIT' | 'RISK';
  onUpdate: (config: any) => Promise<void>;
}> = ({ strategy, activeTab, onUpdate }) => {
  const [config, setConfig] = useState(strategy.configuration);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setConfig(strategy.configuration);
  }, [strategy.configuration]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(config);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 rounded bg-[#0d1216] border border-[#1b252f] space-y-4 text-xs font-mono">
      <div className="flex items-center justify-between pb-3 border-b border-[#1b252f]">
        <div>
          <span className="text-gray-400 font-semibold uppercase">CONFIG AREA: </span>
          <span className="text-white font-bold">{activeTab.replace('_', ' ')}</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded bg-[#c6f135] text-black hover:bg-[#b6dd30]"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? 'SAVING...' : 'SAVE CONFIG'}</span>
        </button>
      </div>

      {activeTab === 'MARKET_CONTEXT' && (
        <div className="space-y-3">
          <div>
            <label className="block text-gray-400 mb-1">Target Instruments (comma separated)</label>
            <input
              type="text"
              value={config.marketContext.instruments.join(', ')}
              onChange={(e) =>
                setConfig({
                  ...config,
                  marketContext: {
                    ...config.marketContext,
                    instruments: e.target.value.split(',').map((s) => s.trim().toUpperCase()),
                  },
                })
              }
              className="w-full bg-[#12181f] border border-[#202c38] rounded px-3 py-2 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 mb-1">Execution Timeframes</label>
              <input
                type="text"
                value={config.marketContext.timeframes.join(', ')}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    marketContext: {
                      ...config.marketContext,
                      timeframes: e.target.value.split(',').map((s) => s.trim()) as any,
                    },
                  })
                }
                className="w-full bg-[#12181f] border border-[#202c38] rounded px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Allowed Trading Sessions</label>
              <input
                type="text"
                value={config.marketContext.sessions.join(', ')}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    marketContext: {
                      ...config.marketContext,
                      sessions: e.target.value.split(',').map((s) => s.trim().toUpperCase()) as any,
                    },
                  })
                }
                className="w-full bg-[#12181f] border border-[#202c38] rounded px-3 py-2 text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Market Context Notes</label>
            <textarea
              rows={3}
              value={config.marketContext.notes}
              onChange={(e) =>
                setConfig({
                  ...config,
                  marketContext: { ...config.marketContext, notes: e.target.value },
                })
              }
              className="w-full bg-[#12181f] border border-[#202c38] rounded px-3 py-2 text-white"
            />
          </div>
        </div>
      )}

      {activeTab === 'FUNDAMENTALS' && (
        <div className="space-y-3">
          <div>
            <label className="block text-gray-400 mb-1">Fundamental Framework Summary</label>
            <input
              type="text"
              value={config.fundamentals.summary}
              onChange={(e) =>
                setConfig({
                  ...config,
                  fundamentals: { ...config.fundamentals, summary: e.target.value },
                })
              }
              className="w-full bg-[#12181f] border border-[#202c38] rounded px-3 py-2 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 mb-1">Central Bank Stance Bias</label>
              <select
                value={config.fundamentals.macroFactors?.centralBankStance || 'NEUTRAL'}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    fundamentals: {
                      ...config.fundamentals,
                      macroFactors: {
                        ...config.fundamentals.macroFactors,
                        centralBankStance: e.target.value as any,
                      },
                    },
                  })
                }
                className="w-full bg-[#12181f] border border-[#202c38] rounded px-3 py-2 text-white"
              >
                <option value="HAWKISH">HAWKISH</option>
                <option value="NEUTRAL">NEUTRAL</option>
                <option value="DOVISH">DOVISH</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Sentiment Target Score (0-100)</label>
              <input
                type="number"
                value={config.fundamentals.macroFactors?.sentimentScore || 50}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    fundamentals: {
                      ...config.fundamentals,
                      macroFactors: {
                        ...config.fundamentals.macroFactors,
                        sentimentScore: Number(e.target.value),
                      },
                    },
                  })
                }
                className="w-full bg-[#12181f] border border-[#202c38] rounded px-3 py-2 text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Macro Factors & Calendar Buffer Notes</label>
            <textarea
              rows={3}
              value={config.fundamentals.notes}
              onChange={(e) =>
                setConfig({
                  ...config,
                  fundamentals: { ...config.fundamentals, notes: e.target.value },
                })
              }
              className="w-full bg-[#12181f] border border-[#202c38] rounded px-3 py-2 text-white"
            />
          </div>
        </div>
      )}

      {activeTab === 'TECHNICAL' && (
        <div className="space-y-3">
          <div>
            <label className="block text-gray-400 mb-1">Technical Logic Overview</label>
            <input
              type="text"
              value={config.technicalAnalysis.summary}
              onChange={(e) =>
                setConfig({
                  ...config,
                  technicalAnalysis: { ...config.technicalAnalysis, summary: e.target.value },
                })
              }
              className="w-full bg-[#12181f] border border-[#202c38] rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Technical Frameworks (comma separated)</label>
            <input
              type="text"
              value={config.technicalAnalysis.frameworks.join(', ')}
              onChange={(e) =>
                setConfig({
                  ...config,
                  technicalAnalysis: {
                    ...config.technicalAnalysis,
                    frameworks: e.target.value.split(',').map((s) => s.trim()),
                  },
                })
              }
              className="w-full bg-[#12181f] border border-[#202c38] rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Timeframe Alignment & Confluence Notes</label>
            <textarea
              rows={3}
              value={config.technicalAnalysis.notes}
              onChange={(e) =>
                setConfig({
                  ...config,
                  technicalAnalysis: { ...config.technicalAnalysis, notes: e.target.value },
                })
              }
              className="w-full bg-[#12181f] border border-[#202c38] rounded px-3 py-2 text-white"
            />
          </div>
        </div>
      )}

      {activeTab === 'ENTRY' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 mb-1">Direction Bias</label>
              <select
                value={config.entryLogic.directionBias}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    entryLogic: { ...config.entryLogic, directionBias: e.target.value as any },
                  })
                }
                className="w-full bg-[#12181f] border border-[#202c38] rounded px-3 py-2 text-white"
              >
                <option value="LONG">LONG ONLY</option>
                <option value="SHORT">SHORT ONLY</option>
                <option value="BOTH">BIDIRECTIONAL (BOTH)</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Confirmation Mode</label>
              <select
                value={config.entryLogic.confirmationRequirement}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    entryLogic: {
                      ...config.entryLogic,
                      confirmationRequirement: e.target.value as any,
                    },
                  })
                }
                className="w-full bg-[#12181f] border border-[#202c38] rounded px-3 py-2 text-white"
              >
                <option value="ALL_CONDITIONS">ALL CONDITIONS MANDATORY (AND)</option>
                <option value="WEIGHTED_SCORE">WEIGHTED SCORE THRESHOLD</option>
                <option value="ANY_PRIMARY">ANY PRIMARY CONDITION (OR)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Specific Execution Trigger Event</label>
            <input
              type="text"
              value={config.entryLogic.triggerEvent}
              onChange={(e) =>
                setConfig({
                  ...config,
                  entryLogic: { ...config.entryLogic, triggerEvent: e.target.value },
                })
              }
              placeholder="e.g. M15 close above Asian high with volume surge"
              className="w-full bg-[#12181f] border border-[#202c38] rounded px-3 py-2 text-white"
            />
          </div>
        </div>
      )}

      {activeTab === 'EXIT' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 mb-1">Target Model</label>
              <select
                value={config.exitLogic.targetType}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    exitLogic: { ...config.exitLogic, targetType: e.target.value as any },
                  })
                }
                className="w-full bg-[#12181f] border border-[#202c38] rounded px-3 py-2 text-white"
              >
                <option value="FIXED_RR">FIXED REWARD/RISK</option>
                <option value="DYNAMIC_STRUCTURE">DYNAMIC STRUCTURE (SWING / LIQUIDITY)</option>
                <option value="ATR_TARGET">ATR MULTIPLE TARGET</option>
                <option value="TRAILING_STOP">TRAILING STOP ONLY</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Stop Loss Model</label>
              <select
                value={config.exitLogic.stopType}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    exitLogic: { ...config.exitLogic, stopType: e.target.value as any },
                  })
                }
                className="w-full bg-[#12181f] border border-[#202c38] rounded px-3 py-2 text-white"
              >
                <option value="STRUCTURE_INVALIDATION">SWING STRUCTURE INVALIDATION</option>
                <option value="ATR_TRAILING">ATR TRAILING STOP</option>
                <option value="VOLATILITY_FIXED">FIXED POINT/PIP VOLATILITY</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Exit Management Rules</label>
            <textarea
              rows={3}
              value={config.exitLogic.summary}
              onChange={(e) =>
                setConfig({
                  ...config,
                  exitLogic: { ...config.exitLogic, summary: e.target.value },
                })
              }
              className="w-full bg-[#12181f] border border-[#202c38] rounded px-3 py-2 text-white"
            />
          </div>
        </div>
      )}

      {activeTab === 'RISK' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-gray-400 mb-1">Risk Per Trade (%)</label>
              <input
                type="number"
                step="0.1"
                value={config.riskManagement.riskPerTradePercent}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    riskManagement: {
                      ...config.riskManagement,
                      riskPerTradePercent: Number(e.target.value),
                    },
                  })
                }
                className="w-full bg-[#12181f] border border-[#202c38] rounded px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Max Daily Loss (%)</label>
              <input
                type="number"
                step="0.1"
                value={config.riskManagement.maxDailyLossPercent}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    riskManagement: {
                      ...config.riskManagement,
                      maxDailyLossPercent: Number(e.target.value),
                    },
                  })
                }
                className="w-full bg-[#12181f] border border-[#202c38] rounded px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Max Drawdown Limit (%)</label>
              <input
                type="number"
                step="0.1"
                value={config.riskManagement.maxDrawdownLimitPercent}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    riskManagement: {
                      ...config.riskManagement,
                      maxDrawdownLimitPercent: Number(e.target.value),
                    },
                  })
                }
                className="w-full bg-[#12181f] border border-[#202c38] rounded px-3 py-2 text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Stop Loss Sizing Rule</label>
            <input
              type="text"
              value={config.riskManagement.stopLossRule}
              onChange={(e) =>
                setConfig({
                  ...config,
                  riskManagement: { ...config.riskManagement, stopLossRule: e.target.value },
                })
              }
              className="w-full bg-[#12181f] border border-[#202c38] rounded px-3 py-2 text-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * MODAL: Rule Editor with Structured Strategy Language AST Builder
 */
const RuleEditorModal: React.FC<{
  strategyId: string;
  existingRule: GenericStrategyRule | null;
  onClose: () => void;
  onSave: (ruleData: Partial<GenericStrategyRule>) => Promise<void>;
}> = ({ existingRule, onClose, onSave }) => {
  const [category, setCategory] = useState<RuleCategory>(
    existingRule?.category || 'TECHNICAL_ANALYSIS'
  );
  const [name, setName] = useState(existingRule?.name || '');
  const [description, setDescription] = useState(existingRule?.description || '');
  const [priority, setPriority] = useState(existingRule?.priority || 5);
  const [group, setGroup] = useState(existingRule?.group || 'General');

  // Condition AST state
  const [source, setSource] = useState<RuleSource>(
    existingRule?.condition?.source || 'TECHNICAL'
  );
  const [field, setField] = useState(
    existingRule?.condition?.field || 'rsi.m15_value'
  );
  const [operator, setOperator] = useState<RuleOperator>(
    existingRule?.condition?.operator || 'LESS_THAN'
  );
  const [valueType, setValueType] = useState<'LITERAL' | 'FIELD_REF'>(
    existingRule?.condition?.value.type || 'LITERAL'
  );
  const [literalValue, setLiteralValue] = useState<string>(
    existingRule?.condition?.value.type === 'LITERAL'
      ? String(existingRule.condition.value.value)
      : '45'
  );
  const [targetSource, setTargetSource] = useState<RuleSource>(
    existingRule?.condition?.value.type === 'FIELD_REF'
      ? existingRule.condition.value.source
      : 'TECHNICAL'
  );
  const [targetField, setTargetField] = useState<string>(
    existingRule?.condition?.value.type === 'FIELD_REF'
      ? existingRule.condition.value.field
      : 'ema.50'
  );

  // Available fields for selected source
  const availableFields = STRATEGY_LANGUAGE_FIELDS.filter((f) => f.source === source);
  const currentFieldDef = availableFields.find((f) => f.field === field) || availableFields[0];

  // Target comparison fields for FIELD_REF mode
  const targetAvailableFields = STRATEGY_LANGUAGE_FIELDS.filter((f) => f.source === targetSource);

  // Build transient condition object for validation & preview
  const transientCondition: StrategyCondition = {
    id: existingRule?.condition?.id || `cond-${Date.now()}`,
    source,
    field: currentFieldDef?.field || field,
    operator,
    value:
      valueType === 'FIELD_REF'
        ? {
            type: 'FIELD_REF',
            source: targetSource,
            field: targetField,
          }
        : {
            type: 'LITERAL',
            value: isNaN(Number(literalValue)) ? literalValue : Number(literalValue),
          },
    version: 'v1',
  };

  const validation = validateCondition(transientCondition);
  const astPreviewString = formatConditionString(transientCondition);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await onSave({
      category,
      name,
      description,
      priority,
      group,
      enabled: existingRule?.enabled ?? true,
      logicalOperator: 'AND',
      condition: transientCondition,
      parameters: {},
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 font-mono">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-[#0e1419] border border-[#1f2b37] rounded-lg p-5 shadow-2xl space-y-4 max-h-[90dvh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#1f2b37]">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-[#c6f135]" />
            <span className="text-sm font-bold text-white">
              {existingRule ? 'EDIT STRATEGY RULE' : 'CREATE STRATEGY RULE (AST)'}
            </span>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {/* Basic metadata */}
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-gray-400 mb-1">Rule Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as RuleCategory)}
                className="w-full bg-[#121921] border border-[#202d3b] rounded px-2.5 py-1.5 text-white"
              >
                <option value="MARKET_CONTEXT">MARKET_CONTEXT</option>
                <option value="FUNDAMENTALS">FUNDAMENTALS</option>
                <option value="TECHNICAL_ANALYSIS">TECHNICAL_ANALYSIS</option>
                <option value="ENTRY">ENTRY</option>
                <option value="EXIT">EXIT</option>
                <option value="RISK_MANAGEMENT">RISK_MANAGEMENT</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Priority (1 highest - 10 lowest)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full bg-[#121921] border border-[#202d3b] rounded px-2.5 py-1.5 text-white"
              >
              </input>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 mb-1">Rule Name</label>
            <input
              type="text"
              required
              placeholder="e.g. M15 RSI Oversold Pullback Trigger"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#121921] border border-[#202d3b] rounded px-3 py-1.5 text-white focus:outline-none focus:border-[#c6f135]"
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-1">Logical Group</label>
            <input
              type="text"
              placeholder="e.g. Timing / Risk / Structure"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="w-full bg-[#121921] border border-[#202d3b] rounded px-3 py-1.5 text-white focus:outline-none focus:border-[#c6f135]"
            />
          </div>

          {/* STRATEGY LANGUAGE SECTION */}
          <div className="p-3 bg-[#0a0e11] rounded border border-[#1b2632] space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#c6f135] border-b border-[#1b2632] pb-1.5">
              <span>STRATEGY LANGUAGE (CONDITION AST)</span>
              <span className="text-gray-500 font-normal">v1.0 Specification</span>
            </div>

            {/* Left-hand side: Source & Field */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">Condition Source</label>
                <select
                  value={source}
                  onChange={(e) => {
                    const newSource = e.target.value as RuleSource;
                    setSource(newSource);
                    const fields = STRATEGY_LANGUAGE_FIELDS.filter((f) => f.source === newSource);
                    if (fields.length > 0) setField(fields[0].field);
                  }}
                  className="w-full bg-[#121921] border border-[#202d3b] rounded px-2 py-1 text-white text-[11px]"
                >
                  <option value="MARKET">MARKET</option>
                  <option value="TECHNICAL">TECHNICAL</option>
                  <option value="FUNDAMENTAL">FUNDAMENTAL</option>
                  <option value="ACCOUNT">ACCOUNT</option>
                  <option value="POSITION">POSITION</option>
                  <option value="STRATEGY_CONTEXT">STRATEGY_CONTEXT</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 mb-1">Source Field</label>
                <select
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                  className="w-full bg-[#121921] border border-[#202d3b] rounded px-2 py-1 text-white text-[11px]"
                >
                  {availableFields.map((f) => (
                    <option key={f.field} value={f.field}>
                      {f.name} ({f.field})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {currentFieldDef && (
              <div className="text-[10px] text-gray-400 bg-[#12181e] p-1.5 rounded border border-[#19232c]">
                <span>Type: </span>
                <strong className="text-white">{currentFieldDef.dataType}</strong>
                {currentFieldDef.unit && (
                  <>
                    <span className="text-gray-600 mx-1">|</span>
                    <span>Unit: </span>
                    <strong className="text-[#00f5ff]">{currentFieldDef.unit}</strong>
                  </>
                )}
                <div className="mt-0.5 text-gray-400">{currentFieldDef.description}</div>
              </div>
            )}

            {/* Operator */}
            <div>
              <label className="block text-[10px] text-gray-400 mb-1">Comparison Operator</label>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value as RuleOperator)}
                className="w-full bg-[#121921] border border-[#202d3b] rounded px-2.5 py-1 text-white text-[11px]"
              >
                {(Object.keys(OPERATOR_LABELS) as RuleOperator[]).map((op) => (
                  <option key={op} value={op}>
                    {OPERATOR_LABELS[op]}
                  </option>
                ))}
              </select>
            </div>

            {/* Right-hand side: Value (Literal or Field Comparison) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-gray-400">Target Value</label>
                <div className="flex items-center gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setValueType('LITERAL')}
                    className={`px-1.5 py-0.2 rounded ${
                      valueType === 'LITERAL'
                        ? 'bg-[#c6f135]/20 text-[#c6f135]'
                        : 'text-gray-500'
                    }`}
                  >
                    Constant Literal
                  </button>
                  <button
                    type="button"
                    onClick={() => setValueType('FIELD_REF')}
                    className={`px-1.5 py-0.2 rounded ${
                      valueType === 'FIELD_REF'
                        ? 'bg-[#00f5ff]/20 text-[#00f5ff]'
                        : 'text-gray-500'
                    }`}
                  >
                    Compare to Field
                  </button>
                </div>
              </div>

              {valueType === 'LITERAL' ? (
                currentFieldDef?.options ? (
                  <select
                    value={literalValue}
                    onChange={(e) => setLiteralValue(e.target.value)}
                    className="w-full bg-[#121921] border border-[#202d3b] rounded px-2.5 py-1 text-white text-[11px]"
                  >
                    {currentFieldDef.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder={`e.g. ${currentFieldDef?.example ?? 50}`}
                    value={literalValue}
                    onChange={(e) => setLiteralValue(e.target.value)}
                    className="w-full bg-[#121921] border border-[#202d3b] rounded px-2.5 py-1 text-white text-[11px]"
                  />
                )
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={targetSource}
                    onChange={(e) => setTargetSource(e.target.value as RuleSource)}
                    className="bg-[#121921] border border-[#202d3b] rounded px-2 py-1 text-white text-[10px]"
                  >
                    <option value="TECHNICAL">TECHNICAL</option>
                    <option value="MARKET">MARKET</option>
                    <option value="FUNDAMENTAL">FUNDAMENTAL</option>
                    <option value="ACCOUNT">ACCOUNT</option>
                  </select>
                  <select
                    value={targetField}
                    onChange={(e) => setTargetField(e.target.value)}
                    className="bg-[#121921] border border-[#202d3b] rounded px-2 py-1 text-white text-[10px]"
                  >
                    {targetAvailableFields.map((f) => (
                      <option key={f.field} value={f.field}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Syntax preview & Validation Banner */}
            <div className="p-2 rounded bg-[#070a0c] border border-[#172029]">
              <div className="text-[9px] text-gray-500 uppercase tracking-wider">
                STRATEGY LANGUAGE AST PREVIEW:
              </div>
              <div className="mt-1 text-xs text-[#c6f135] font-bold break-all">
                {astPreviewString}
              </div>
              {!validation.valid && (
                <div className="mt-1 text-[10px] text-rose-400">
                  ⚠️ {validation.errors.join('; ')}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-gray-400 mb-1">Detailed Explanation / Intent</label>
            <textarea
              rows={2}
              placeholder="Why this rule exists in trading system edge..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#121921] border border-[#202d3b] rounded px-3 py-1.5 text-white focus:outline-none focus:border-[#c6f135]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1f2b37]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-[#162029] text-gray-400 hover:text-white text-xs"
          >
            CANCEL
          </button>
          <button
            type="submit"
            disabled={!validation.valid}
            className={`px-4 py-1.5 rounded font-bold text-xs ${
              validation.valid
                ? 'bg-[#c6f135] text-black hover:bg-[#b5dc30]'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            SAVE RULE
          </button>
        </div>
      </form>
    </div>
  );
};

/**
 * MODAL: Rule Evaluation Report Modal (Section 13)
 */
const EvaluationReportModal: React.FC<{
  report: RuleEvaluationReport;
  onClose: () => void;
}> = ({ report, onClose }) => {
  const isQualified = report.overallDecision === 'QUALIFIED';
  const isRiskBlocked = report.overallDecision === 'RESTRICTED_BY_RISK';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 font-mono">
      <div className="w-full max-w-2xl bg-[#0e1419] border border-[#1f2b37] rounded-lg p-5 shadow-2xl space-y-4 max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#1f2b37]">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-[#c6f135]" />
            <span className="text-sm font-bold text-white">
              STRATEGY RULE EVALUATION REPORT
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {/* Overall Decision Banner */}
        <div
          className={`p-3.5 rounded border text-xs ${
            isQualified
              ? 'bg-[#c6f135]/10 border-[#c6f135]/40 text-[#c6f135]'
              : isRiskBlocked
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-400'
              : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold">
              {isQualified ? (
                <CheckCircle2 className="w-5 h-5 text-[#c6f135]" />
              ) : isRiskBlocked ? (
                <Shield className="w-5 h-5 text-rose-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400" />
              )}
              <span>DECISION: {report.overallDecision}</span>
            </div>
            <span className="text-[10px] text-gray-400">
              {new Date(report.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-300 leading-relaxed">
            {report.decisionExplanation}
          </p>
        </div>

        {/* Category Breakdown Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {report.categories.map((cat) => (
            <div
              key={cat.category}
              className="p-2 rounded bg-[#10161c] border border-[#1a242e] flex items-center justify-between"
            >
              <div>
                <div className="text-[10px] text-gray-400">{cat.category.replace('_', ' ')}</div>
                <div className="font-bold text-white">
                  {cat.passCount} / {cat.totalCount} Passed
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  cat.status === 'PASS'
                    ? 'bg-[#c6f135]/20 text-[#c6f135]'
                    : cat.status === 'WARNING'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {cat.status}
              </span>
            </div>
          ))}
        </div>

        {/* Individual Evaluated Rules with Explainability */}
        <div className="space-y-2 text-xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            EXPLAINABLE RULE VERIFICATION
          </div>
          <div className="space-y-1.5">
            {report.results.map((res) => (
              <div
                key={res.ruleId}
                className="p-2.5 rounded bg-[#0b0f12] border border-[#162029] space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        res.status === 'PASS'
                          ? 'bg-[#c6f135]/20 text-[#c6f135]'
                          : res.status === 'FAIL'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {res.status}
                    </span>
                    <span className="font-bold text-white text-[11px]">{res.ruleName}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {res.category}
                  </span>
                </div>

                <div className="text-[10px] text-[#00f5ff] font-mono">
                  {res.conditionString}
                </div>

                <div className="text-[10px] text-gray-400">
                  <strong className="text-gray-300">Reason: </strong>
                  {res.explainableReason} (Evaluated: {res.evaluatedSourceValue} vs Target: {res.targetComparisonValue})
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-[#1f2b37]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#162029] text-gray-200 hover:text-white text-xs font-bold"
          >
            CLOSE REPORT
          </button>
        </div>
      </div>
    </div>
  );
};
