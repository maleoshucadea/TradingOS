import React from 'react';
import {
  Activity,
  ShieldCheck,
  TrendingUp,
  Sliders,
  CheckSquare,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  BookOpen,
  PieChart,
  Layers,
  ChevronRight,
  Cable,
} from 'lucide-react';
import {
  Strategy,
  InstrumentQuote,
  TradeDecision,
  JournalEntry,
  AnalyticsSummary,
  AppMode,
  ActiveNavModule,
} from '../../types';

interface DashboardViewProps {
  strategies: Strategy[];
  instruments: InstrumentQuote[];
  decisions: TradeDecision[];
  journal: JournalEntry[];
  analytics: Record<'DEMO' | 'BACKTEST' | 'LIVE', AnalyticsSummary>;
  mode: AppMode;
  onNavigate: (module: ActiveNavModule) => void;
  onSelectStrategy: (strategyId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  strategies,
  instruments,
  decisions,
  journal,
  analytics,
  mode,
  onNavigate,
  onSelectStrategy,
}) => {
  const activeStrategies = strategies.filter((s) => s.status !== 'ARCHIVED');
  const currentAnalytics = analytics[mode === 'LIVE' ? 'LIVE' : mode === 'BACKTEST' ? 'BACKTEST' : 'DEMO'];
  const proposedDecisions = decisions.filter((d) => d.status === 'PROPOSED');

  return (
    <div className="space-y-4 pb-12">
      {/* Top Banner with Terminal Status & Data Origin Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#0d1216] rounded border border-[#1b252f] text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#c6f135] animate-pulse" />
          <span className="text-gray-300 font-semibold">COMMAND CENTER</span>
          <span className="text-gray-600">/</span>
          <span className="text-gray-400">STRUCTURED DECISION PIPELINE</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('connectivity')}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] bg-[#141e26] hover:bg-[#1c2934] text-[#c6f135] border border-[#c6f135]/30 font-semibold transition-colors"
          >
            <Cable className="w-3 h-3" />
            <span>MT5 BROKER HUB</span>
          </button>
          <span className="text-[10px] text-gray-500">DATA ORIGIN:</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00f5ff]/10 text-[#00f5ff] border border-[#00f5ff]/30">
            {mode === 'LIVE' ? 'LIVE DATA' : mode === 'BACKTEST' ? 'BACKTEST DATA' : 'DEMO DATA'}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#1a232b] text-gray-400 border border-[#232f3b]">
            SECURE SANDBOX
          </span>
        </div>
      </div>

      {/* Structured Decision Engine Pipeline Progress Bar */}
      <div className="p-3 bg-[#0c1115] rounded border border-[#1b252f]">
        <div className="text-[11px] font-mono text-gray-400 mb-2 flex items-center justify-between">
          <span>OPERATING PIPELINE STAGES</span>
          <span className="text-[#c6f135] font-semibold">FOUNDATION & STRATEGY LANGUAGE ACTIVE</span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 text-[10px] font-mono text-center">
          {[
            { name: 'MARKET', active: true },
            { name: 'FUNDAMENTAL', active: true },
            { name: 'TECHNICAL', active: true },
            { name: 'RULES (v1)', active: true, highlight: true },
            { name: 'RISK GATE', active: true },
            { name: 'DECISION', active: true },
            { name: 'JOURNAL', active: true },
            { name: 'ANALYTICS', active: true },
          ].map((stage, idx) => (
            <div
              key={stage.name}
              className={`py-1.5 px-1 rounded border transition-colors ${
                stage.highlight
                  ? 'bg-[#c6f135]/20 border-[#c6f135] text-[#c6f135] font-bold'
                  : stage.active
                  ? 'bg-[#121920] border-[#22303c] text-gray-200'
                  : 'bg-[#0a0d10] border-[#151c22] text-gray-600'
              }`}
            >
              <div className="text-[8px] text-gray-500">{idx + 1}</div>
              <div className="truncate">{stage.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* Metric 1: Account Equity & Risk */}
        <div className="p-3 rounded bg-[#0d1216] border border-[#1b252f] flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
            <span>EQUITY & RISK</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#c6f135]" />
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-mono font-bold text-white tracking-tight">
              $50,240.00
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono text-[#c6f135]">
              <span>+0.48% today</span>
              <span className="text-gray-500">|</span>
              <span className="text-gray-400">Risk: 1.0%</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Active Strategies */}
        <div className="p-3 rounded bg-[#0d1216] border border-[#1b252f] flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
            <span>STRATEGIES</span>
            <Sliders className="w-3.5 h-3.5 text-[#00f5ff]" />
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-mono font-bold text-white tracking-tight">
              {activeStrategies.length}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono text-gray-400">
              <span className="text-[#00f5ff]">1 Testing</span>
              <span className="text-gray-600">•</span>
              <span>1 Demo</span>
              <span className="text-gray-600">•</span>
              <span>1 Draft</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Win Rate & Expectancy */}
        <div className="p-3 rounded bg-[#0d1216] border border-[#1b252f] flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
            <span>WIN RATE & EXP</span>
            <PieChart className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-mono font-bold text-white tracking-tight">
              {currentAnalytics.winRate > 0 ? `${currentAnalytics.winRate}%` : 'N/A'}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono text-gray-400">
              <span className="text-amber-400">PF: {currentAnalytics.profitFactor}</span>
              <span className="text-gray-500">|</span>
              <span>+{currentAnalytics.expectancyR}R</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Trade Decisions Ready */}
        <div className="p-3 rounded bg-[#0d1216] border border-[#1b252f] flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
            <span>DECISION CANDIDATES</span>
            <CheckSquare className="w-3.5 h-3.5 text-[#c6f135]" />
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-mono font-bold text-[#c6f135] tracking-tight">
              {proposedDecisions.length} READY
            </div>
            <div className="mt-0.5 text-[11px] font-mono text-gray-400 truncate">
              {proposedDecisions[0]?.market || 'Awaiting conditions'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Watchlist & Active Strategy Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Markets Watchlist Panel */}
        <div className="p-3 rounded bg-[#0d1216] border border-[#1b252f] flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-[#1b252f]">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#00f5ff]" />
              <span className="text-xs font-mono font-bold text-white tracking-wider">MARKET WATCHLIST</span>
            </div>
            <button
              onClick={() => onNavigate('markets')}
              className="text-[11px] font-mono text-[#00f5ff] hover:underline flex items-center gap-0.5"
            >
              <span>VIEW ALL</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-[#162028] mt-1">
            {instruments.slice(0, 5).map((inst) => {
              const isPositive = inst.change24h >= 0;
              return (
                <div
                  key={inst.symbol}
                  className="py-2 flex items-center justify-between text-xs font-mono"
                >
                  <div>
                    <div className="font-bold text-white">{inst.symbol}</div>
                    <div className="text-[10px] text-gray-400">{inst.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-semibold">{inst.price.toFixed(inst.price < 10 ? 4 : 2)}</div>
                    <div
                      className={`flex items-center justify-end gap-0.5 text-[10px] font-semibold ${
                        isPositive ? 'text-[#c6f135]' : 'text-rose-400'
                      }`}
                    >
                      {isPositive ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      <span>
                        {isPositive ? '+' : ''}
                        {inst.changePercent24h.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Strategies & Evaluation Engine Status */}
        <div className="lg:col-span-2 p-3 rounded bg-[#0d1216] border border-[#1b252f] flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-[#1b252f]">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#c6f135]" />
              <span className="text-xs font-mono font-bold text-white tracking-wider">
                STRATEGY ARSENAL & EVALUATION
              </span>
            </div>
            <button
              onClick={() => onNavigate('strategy-builder')}
              className="text-[11px] font-mono text-[#c6f135] hover:underline flex items-center gap-0.5"
            >
              <span>BUILDER</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2 mt-2">
            {strategies.map((strat) => {
              const statusColors: Record<string, { text: string; bg: string; border: string }> = {
                DRAFT: { text: 'text-gray-400', bg: 'bg-gray-800/50', border: 'border-gray-700' },
                TESTING: { text: 'text-[#00f5ff]', bg: 'bg-[#00f5ff]/10', border: 'border-[#00f5ff]/30' },
                DEMO: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
                ARCHIVED: { text: 'text-gray-600', bg: 'bg-gray-900', border: 'border-gray-800' },
              };
              const color = statusColors[strat.status] || statusColors.DRAFT;

              return (
                <div
                  key={strat.id}
                  onClick={() => onSelectStrategy(strat.id)}
                  className="p-2.5 rounded bg-[#10161c] border border-[#1d2731] hover:border-[#c6f135]/40 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white">{strat.name}</span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${color.bg} ${color.text} ${color.border}`}
                      >
                        {strat.status}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-gray-400 line-clamp-1">
                      {strat.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
                    <div className="text-right">
                      <div className="text-gray-300 font-semibold">{strat.market}</div>
                      <div className="text-[10px] text-gray-500">
                        {strat.configuration.marketContext.timeframes.join('/')}
                      </div>
                    </div>
                    <div className="px-2 py-1 rounded bg-[#162029] text-[10px] text-[#c6f135] border border-[#23313d]">
                      {strat.rulesCount ?? 6} Rules
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Trade Decisions Queue & Journal Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Trade Decision Engine Queue */}
        <div className="p-3 rounded bg-[#0d1216] border border-[#1b252f]">
          <div className="flex items-center justify-between pb-2 border-b border-[#1b252f]">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#c6f135]" />
              <span className="text-xs font-mono font-bold text-white tracking-wider">
                TRADE DECISION ENGINE CANDIDATES
              </span>
            </div>
            <button
              onClick={() => onNavigate('trades')}
              className="text-[11px] font-mono text-[#c6f135] hover:underline flex items-center gap-0.5"
            >
              <span>EXPLORE</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-2 space-y-2">
            {decisions.slice(0, 2).map((dec) => (
              <div
                key={dec.id}
                className="p-2.5 rounded bg-[#10161c] border border-[#1d2731] text-xs font-mono space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                        dec.direction === 'BUY'
                          ? 'bg-[#c6f135]/20 text-[#c6f135]'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {dec.direction} {dec.market}
                    </span>
                    <span className="text-gray-400 text-[11px]">{dec.strategyName}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#162028] text-[#00f5ff] border border-[#202d38]">
                    Score: {dec.confidenceScore}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1 text-[10px] text-gray-400 bg-[#0a0e11] p-1.5 rounded border border-[#172027]">
                  <div>Entry: <span className="text-white">{dec.entryPrice}</span></div>
                  <div>Stop: <span className="text-rose-400">{dec.stopLossPrice}</span></div>
                  <div>Target: <span className="text-[#c6f135]">{dec.takeProfitPrice}</span></div>
                </div>

                <div className="text-[10px] text-gray-400 line-clamp-1">
                  Primary Trigger: {dec.reasons[0]}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Journal & Psychological Discipline Tracker */}
        <div className="p-3 rounded bg-[#0d1216] border border-[#1b252f]">
          <div className="flex items-center justify-between pb-2 border-b border-[#1b252f]">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-mono font-bold text-white tracking-wider">
                JOURNAL & DISCIPLINE AUDIT
              </span>
            </div>
            <button
              onClick={() => onNavigate('journal')}
              className="text-[11px] font-mono text-amber-400 hover:underline flex items-center gap-0.5"
            >
              <span>LOG</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-2 space-y-2">
            {journal.slice(0, 2).map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded bg-[#10161c] border border-[#1d2731] text-xs font-mono space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{item.instrument}</span>
                    <span className="text-[10px] text-gray-400">{item.strategyName}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      item.result === 'WIN'
                        ? 'bg-[#c6f135]/20 text-[#c6f135]'
                        : item.result === 'LOSS'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-gray-800 text-gray-300'
                    }`}
                  >
                    {item.result} ({item.pnlRMultiple ? `${item.pnlRMultiple}R` : 'N/A'})
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 line-clamp-1 italic">
                  "{item.userNotes}"
                </p>
                <div className="text-[9px] text-gray-500 flex items-center gap-2">
                  <span>Discipline: {'★'.repeat(item.disciplineRating)}</span>
                  <span>•</span>
                  <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
