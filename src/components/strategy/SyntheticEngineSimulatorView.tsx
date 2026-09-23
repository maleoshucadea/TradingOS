import React, { useState, useEffect } from 'react';
import {
  Activity,
  Play,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  Shield,
  Clock,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Zap,
  Database,
  BarChart3,
  Calendar,
  Filter,
  Check,
  Info,
  Sliders,
  DollarSign,
  RefreshCw,
  Wifi,
} from 'lucide-react';
import { HistoricalEvaluationReport, RealBacktestReport } from '../../lib/engine/types';
import { api } from '../../lib/api';

interface SyntheticEngineSimulatorViewProps {
  strategyId: string;
}

export const SyntheticEngineSimulatorView: React.FC<SyntheticEngineSimulatorViewProps> = ({
  strategyId,
}) => {
  // Mode selection: SCENARIO (fixtures) vs REAL_BACKTEST (Deriv historical data)
  const [activeMode, setActiveMode] = useState<'SCENARIO' | 'REAL_BACKTEST'>('SCENARIO');

  // Scenario Mode State
  const [selectedScenario, setSelectedScenario] = useState<
    'BULLISH' | 'BEARISH' | 'DYNAMIC' | 'INVALIDATION'
  >('BULLISH');
  const [scenarioReport, setScenarioReport] = useState<HistoricalEvaluationReport | null>(null);

  // Real Backtest State
  const [realSymbol, setRealSymbol] = useState('BOOM1000');
  const [customSymbol, setCustomSymbol] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [riskPercent, setRiskPercent] = useState('1.0');
  const [realReport, setRealReport] = useState<RealBacktestReport | null>(null);
  const [realError, setRealError] = useState<{ category: string; message: string } | null>(null);
  const [fallbackProgress, setFallbackProgress] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  // Run Scenario Simulation
  const runSimulation = async (scenario: 'BULLISH' | 'BEARISH' | 'DYNAMIC' | 'INVALIDATION') => {
    setLoading(true);
    try {
      const res = await api.simulateStrategy(strategyId, scenario);
      setScenarioReport(res);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Run Real Historical Backtest
  const runRealBacktest = async () => {
    setLoading(true);
    setRealError(null);
    setFallbackProgress(null);
    try {
      const targetSymbol = customSymbol.trim() ? customSymbol.trim().toUpperCase() : realSymbol;
      const res = await api.runRealBacktest(
        strategyId,
        {
          symbol: targetSymbol,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate + 'T23:59:59.999Z').toISOString(),
          riskParams: {
            riskPerTradePercent: parseFloat(riskPercent) || 1.0,
          },
        },
        (statusMsg: string) => {
          setFallbackProgress(statusMsg);
        }
      );
      setRealReport(res);
      setFallbackProgress(null);
    } catch (err: any) {
      console.error('Real backtest error:', err);
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
          ? err
          : err?.message || (err?.type ? `WebSocket ${err.type} event` : JSON.stringify(err));
      setRealError({
        category: err.category || 'DATA',
        message: msg || 'Backtest failed. Verify symbol and date range.',
      });
      setFallbackProgress(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeMode === 'SCENARIO') {
      runSimulation(selectedScenario);
    }
  }, [strategyId, selectedScenario, activeMode]);

  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const getStateBadgeColor = (state: string) => {
    switch (state) {
      case 'TRADE_ACTIVE':
      case 'ENTRY_TRIGGERED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'TRAILING_STRUCTURE':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'H4_FIB_FROZEN':
      case 'WAITING_FOR_M15_CHOCH':
      case 'M15_CONFIRMATION_COMPLETE':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';
      case 'WAITING_FOR_H4_50':
      case 'H4_FIB_ACTIVE':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'INVALIDATED':
      case 'RESET_REQUIRED':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      default:
        return 'bg-gray-800 text-gray-300 border-gray-700';
    }
  };

  const report = activeMode === 'SCENARIO' ? scenarioReport : realReport;

  return (
    <div className="space-y-4">
      {/* Top Banner: Mode Selector & Title */}
      <div className="p-4 rounded-lg bg-[#0d1216] border border-[#1d2731]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded bg-[#c6f135]/10 text-[#c6f135] border border-[#c6f135]/30">
                <Activity className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-white tracking-wide">
                SYNTHETIC STRUCTURE + FIBONACCI ENGINE
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#15202b] text-[#00f5ff] border border-[#00f5ff]/30">
                H4 → M15
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1c192c] text-[#a78bfa] border border-[#a78bfa]/30">
                READ-ONLY
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Deterministic multi-timeframe state machine: H4 50% candle-close activation & lock, M15 CHoCH → BOS sequence, 50% touch entry, and monotonic structural trailing.
            </p>
          </div>

          {/* Primary Mode Selector: Scenario vs Real Backtest */}
          <div className="flex items-center p-1 rounded-lg bg-[#080d11] border border-[#1f2b37] self-start lg:self-auto">
            <button
              onClick={() => setActiveMode('SCENARIO')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded transition-all ${
                activeMode === 'SCENARIO'
                  ? 'bg-[#182430] text-[#00f5ff] border border-[#00f5ff]/40 shadow-[0_0_10px_rgba(0,245,255,0.2)]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>SCENARIO SIMULATION</span>
            </button>
            <button
              onClick={() => setActiveMode('REAL_BACKTEST')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded transition-all ${
                activeMode === 'REAL_BACKTEST'
                  ? 'bg-[#c6f135] text-black font-extrabold shadow-[0_0_12px_rgba(198,241,53,0.35)]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>REAL HISTORICAL BACKTEST</span>
            </button>
          </div>
        </div>

        {/* Sub-Controls: Scenario Mode */}
        {activeMode === 'SCENARIO' && (
          <div className="mt-4 pt-3 border-t border-[#182430] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-gray-400 uppercase">FIXTURE SCENARIOS:</span>
              {[
                { id: 'BULLISH', label: 'Bullish Complete Setup' },
                { id: 'BEARISH', label: 'Bearish Complete Setup' },
                { id: 'DYNAMIC', label: 'Dynamic Fib Extension' },
                { id: 'INVALIDATION', label: 'M15 Invalidation Reset' },
              ].map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => setSelectedScenario(sc.id as any)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                    selectedScenario === sc.id
                      ? 'bg-[#c6f135] text-black font-bold shadow-[0_0_12px_rgba(198,241,53,0.3)]'
                      : 'bg-[#141b22] text-gray-400 hover:text-white border border-[#212d38]'
                  }`}
                >
                  {sc.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#101b22] text-gray-400 border border-[#1b2b36]">
                DATA: Generated Fixtures (Deterministic)
              </span>
              <button
                onClick={() => runSimulation(selectedScenario)}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1 text-xs font-bold rounded bg-[#18232c] text-[#c6f135] border border-[#c6f135]/50 hover:bg-[#202f3c]"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'SIMULATING...' : 'RERUN'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Sub-Controls: Real Historical Backtest Mode */}
        {activeMode === 'REAL_BACKTEST' && (
          <div className="mt-4 pt-3 border-t border-[#182430] space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Instrument Selection */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">
                  Deriv Instrument
                </label>
                <select
                  value={realSymbol}
                  onChange={(e) => {
                    setRealSymbol(e.target.value);
                    setCustomSymbol('');
                  }}
                  className="w-full bg-[#141b22] border border-[#212d38] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#c6f135]"
                >
                  <option value="BOOM1000">Boom 1000 Index (BOOM1000)</option>
                  <option value="BOOM500">Boom 500 Index (BOOM500)</option>
                  <option value="CRASH1000">Crash 1000 Index (CRASH1000)</option>
                  <option value="CRASH500">Crash 500 Index (CRASH500)</option>
                  <option value="R_25">Volatility 25 Index (R_25)</option>
                  <option value="R_50">Volatility 50 Index (R_50)</option>
                  <option value="R_75">Volatility 75 Index (R_75)</option>
                  <option value="R_100">Volatility 100 Index (R_100)</option>
                  <option value="frxEURUSD">EUR/USD Forex Major</option>
                  <option value="CUSTOM">Custom Symbol...</option>
                </select>
                {realSymbol === 'CUSTOM' && (
                  <input
                    type="text"
                    placeholder="e.g. CRASH300, R_10"
                    value={customSymbol}
                    onChange={(e) => setCustomSymbol(e.target.value)}
                    className="w-full mt-1.5 bg-[#141b22] border border-[#212d38] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#c6f135]"
                  />
                )}
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">
                  Start Date (UTC)
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#141b22] border border-[#212d38] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#c6f135]"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">
                  End Date (UTC)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-[#141b22] border border-[#212d38] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#c6f135]"
                />
              </div>

              {/* Quick Range & Action */}
              <div className="flex flex-col justify-between">
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">
                  Quick Range & Risk %
                </label>
                <div className="flex items-center gap-1 mb-1.5">
                  {[7, 14, 30, 60].map((d) => (
                    <button
                      key={d}
                      onClick={() => setQuickRange(d)}
                      className="px-2 py-0.5 text-[10px] font-mono rounded bg-[#15202b] text-gray-300 hover:text-[#c6f135] border border-[#21303d]"
                    >
                      {d}D
                    </button>
                  ))}
                  <div className="flex items-center gap-0.5 ml-auto">
                    <span className="text-[10px] text-gray-400">Risk:</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0.25"
                      max="5.0"
                      value={riskPercent}
                      onChange={(e) => setRiskPercent(e.target.value)}
                      className="w-12 bg-[#141b22] border border-[#212d38] rounded px-1 py-0.5 text-[10px] text-white text-center focus:outline-none focus:border-[#c6f135]"
                    />
                    <span className="text-[10px] text-gray-400">%</span>
                  </div>
                </div>
                <button
                  onClick={runRealBacktest}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded bg-[#c6f135] text-black hover:bg-[#b0d92e] transition-all font-mono"
                >
                  <Play className={`w-3.5 h-3.5 fill-black ${loading ? 'animate-spin' : ''}`} />
                  <span>{loading ? 'DOWNLOADING & BACKTESTING...' : 'RUN REAL BACKTEST'}</span>
                </button>
              </div>
            </div>

            {/* Real-time Fallback Progress Banner */}
            {loading && fallbackProgress && (
              <div className="p-3 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2.5 animate-pulse">
                <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin flex-shrink-0" />
                <div>
                  <div className="font-bold text-cyan-400 text-[11px] tracking-wide uppercase flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5" /> Historical Data: Browser → Deriv
                  </div>
                  <div className="text-[11px] font-mono text-cyan-200 mt-0.5">{fallbackProgress}</div>
                </div>
              </div>
            )}

            {/* Error Banner if Backtest Failed */}
            {realError && (
              <div className="p-3 rounded bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">
                    Backtest Failed [{realError.category}]
                  </div>
                  <div className="text-[11px] text-rose-200 mt-0.5">{realError.message}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Real Data Quality Banner (if Real Report Loaded) */}
        {activeMode === 'REAL_BACKTEST' && realReport && (
          <div className="mt-4 pt-3 border-t border-[#182430] grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded bg-[#10171d] border border-[#1b2632]">
              <span className="text-gray-400 text-[10px] uppercase block">Data Source</span>
              <span className="font-bold text-[#c6f135] flex items-center gap-1 font-mono text-[11px]">
                <Check className="w-3 h-3 text-[#c6f135]" />
                {realReport.dataSource === 'REAL_DERIV_BROWSER_WS'
                  ? 'Historical Data: Browser → Deriv'
                  : 'Historical Data: Direct Server'}
              </span>
            </div>
            <div className="p-2 rounded bg-[#10171d] border border-[#1b2632]">
              <span className="text-gray-400 text-[10px] uppercase block">Candles Evaluated</span>
              <span className="font-mono text-white font-bold">
                {realReport.totalH4CandlesProcessed} H4 / {realReport.totalM15CandlesProcessed} M15
              </span>
            </div>
            <div className="p-2 rounded bg-[#10171d] border border-[#1b2632]">
              <span className="text-gray-400 text-[10px] uppercase block">H4 Quality Status</span>
              <span
                className={`font-mono text-[11px] font-bold px-1.5 py-0.2 rounded border ${
                  realReport.h4DataQuality.status === 'EXCELLENT'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                }`}
              >
                {realReport.h4DataQuality.status} ({realReport.h4DataQuality.gapsDetected.length} gaps)
              </span>
            </div>
            <div className="p-2 rounded bg-[#10171d] border border-[#1b2632]">
              <span className="text-gray-400 text-[10px] uppercase block">M15 Quality Status</span>
              <span
                className={`font-mono text-[11px] font-bold px-1.5 py-0.2 rounded border ${
                  realReport.m15DataQuality.status === 'EXCELLENT'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                }`}
              >
                {realReport.m15DataQuality.status} ({realReport.m15DataQuality.incompleteCountRemoved} forming filtered)
              </span>
            </div>
          </div>
        )}

        {/* Live State Machine Status Bar */}
        {report && (
          <div className="mt-4 pt-3 border-t border-[#182430] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-bold text-[11px]">STATE MACHINE STATUS:</span>
              <span
                className={`px-2.5 py-0.5 rounded font-mono text-[11px] font-bold border ${getStateBadgeColor(
                  report.currentState
                )}`}
              >
                {report.currentState}
              </span>
            </div>
            <div className="text-gray-400 text-xs truncate max-w-2xl font-mono">
              <span className="text-gray-500">Explanation:</span> {report.latestExplanation}
            </div>
          </div>
        )}
      </div>

      {/* Real Backtest KPI Performance Dashboard */}
      {activeMode === 'REAL_BACKTEST' && realReport && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
          <div className="p-3 rounded-lg bg-[#0d1216] border border-[#1b2632]">
            <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Trades</span>
            <span className="text-lg font-bold font-mono text-white">
              {realReport.metrics.totalTrades}
            </span>
            <span className="text-[10px] text-gray-500 block">
              {realReport.metrics.winningTrades}W - {realReport.metrics.losingTrades}L
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#0d1216] border border-[#1b2632]">
            <span className="text-[10px] font-bold text-gray-400 uppercase block">Win Rate</span>
            <span
              className={`text-lg font-bold font-mono ${
                realReport.metrics.winRatePercent >= 50 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {realReport.metrics.winRatePercent}%
            </span>
            <span className="text-[10px] text-gray-500 block">Closed positions</span>
          </div>

          <div className="p-3 rounded-lg bg-[#0d1216] border border-[#1b2632]">
            <span className="text-[10px] font-bold text-gray-400 uppercase block">Net R-Multiple</span>
            <span
              className={`text-lg font-bold font-mono ${
                realReport.metrics.netRMultiple >= 0 ? 'text-[#c6f135]' : 'text-rose-400'
              }`}
            >
              {realReport.metrics.netRMultiple > 0 ? '+' : ''}
              {realReport.metrics.netRMultiple} R
            </span>
            <span className="text-[10px] text-gray-500 block">Sum of all trades</span>
          </div>

          <div className="p-3 rounded-lg bg-[#0d1216] border border-[#1b2632]">
            <span className="text-[10px] font-bold text-gray-400 uppercase block">Avg R / Trade</span>
            <span
              className={`text-lg font-bold font-mono ${
                realReport.metrics.avgRMultiple >= 0 ? 'text-white' : 'text-rose-400'
              }`}
            >
              {realReport.metrics.avgRMultiple > 0 ? '+' : ''}
              {realReport.metrics.avgRMultiple} R
            </span>
            <span className="text-[10px] text-gray-500 block">Expectancy per setup</span>
          </div>

          <div className="p-3 rounded-lg bg-[#0d1216] border border-[#1b2632]">
            <span className="text-[10px] font-bold text-gray-400 uppercase block">Max Drawdown</span>
            <span className="text-lg font-bold font-mono text-rose-400">
              -{realReport.metrics.maxDrawdownRMultiple} R
            </span>
            <span className="text-[10px] text-gray-500 block">Peak-to-trough (R)</span>
          </div>

          <div className="p-3 rounded-lg bg-[#0d1216] border border-[#1b2632]">
            <span className="text-[10px] font-bold text-gray-400 uppercase block">Profit Factor</span>
            <span className="text-lg font-bold font-mono text-[#00f5ff]">
              {realReport.metrics.profitFactor !== null ? realReport.metrics.profitFactor : 'N/A'}
            </span>
            <span className="text-[10px] text-gray-500 block">Gross Profit / Gross Loss</span>
          </div>
        </div>
      )}

      {/* Grid: Structural Primitives & State Inspect */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: H4 Structure & Fibonacci */}
          <div className="p-3.5 rounded-lg bg-[#0d1216] border border-[#1b2632] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#c6f135]" />
                1. H4 STRUCTURE & FIBONACCI
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#15202b] text-[#00f5ff] border border-[#00f5ff]/30">
                HTF: H4
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[#162029]">
                <span className="text-gray-400">Confirmed Trend</span>
                <span className="font-bold font-mono text-[#c6f135]">
                  {report.h4StructureSummary.currentTrend}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#162029]">
                <span className="text-gray-400">Confirmed Swings</span>
                <span className="font-mono text-gray-200">
                  {report.h4StructureSummary.swingCount} points
                </span>
              </div>
              {report.h4FibSummary && (
                <>
                  <div className="flex justify-between py-1 border-b border-[#162029]">
                    <span className="text-gray-400">H4 Fib 0% (Origin)</span>
                    <span className="font-mono text-white">
                      {report.h4FibSummary.originZeroLevel}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#162029]">
                    <span className="text-gray-400">H4 Fib 50% (Retracement)</span>
                    <span className="font-mono text-[#00f5ff] font-bold">
                      {report.h4FibSummary.fiftyPercentLevel}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#162029]">
                    <span className="text-gray-400">H4 Fib 100% (Endpoint)</span>
                    <span className="font-mono text-white">
                      {report.h4FibSummary.endpointHundredLevel}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-400">Fib Status</span>
                    <span
                      className={`font-bold font-mono text-[10px] px-1.5 py-0.2 rounded border ${
                        report.h4FibSummary.isFrozen
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      }`}
                    >
                      {report.h4FibSummary.isFrozen ? 'FROZEN / LOCKED' : 'DYNAMIC EXTENSION'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Card 2: M15 Confirmation Sequence */}
          <div className="p-3.5 rounded-lg bg-[#0d1216] border border-[#1b2632] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#00f5ff]" />
                2. M15 CHOCH → BOS CONFIRMATION
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1c192c] text-[#a78bfa] border border-[#a78bfa]/30">
                LTF: M15
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[#162029]">
                <span className="text-gray-400">Sequence Stage</span>
                <span className="font-bold font-mono text-cyan-400">
                  {report.currentState.includes('M15') || report.currentState.includes('ENTRY')
                    ? 'ACTIVE'
                    : 'AWAITING H4'}
                </span>
              </div>
              {report.m15FibSummary && (
                <>
                  <div className="flex justify-between py-1 border-b border-[#162029]">
                    <span className="text-gray-400">M15 Fib 0% (SL Level)</span>
                    <span className="font-mono text-rose-400 font-bold">
                      {report.m15FibSummary.originZeroLevel}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#162029]">
                    <span className="text-gray-400">M15 Fib 50% (Entry Level)</span>
                    <span className="font-mono text-[#c6f135] font-bold">
                      {report.m15FibSummary.fiftyPercentLevel}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#162029]">
                    <span className="text-gray-400">M15 Fib 100% (High/Low)</span>
                    <span className="font-mono text-white">
                      {report.m15FibSummary.endpointHundredLevel}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-400">Risk Distance</span>
                    <span className="font-mono text-gray-200">
                      {Math.abs(
                        report.m15FibSummary.fiftyPercentLevel -
                          report.m15FibSummary.originZeroLevel
                      ).toFixed(2)}{' '}
                      pts
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Card 3: Execution & Trailing Stop Safety */}
          <div className="p-3.5 rounded-lg bg-[#0d1216] border border-[#1b2632] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#c6f135]" />
                3. TRADE MANAGEMENT & SAFETY
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#15202b] text-emerald-400 border border-emerald-500/30">
                STRICT MONOTONIC
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[#162029]">
                <span className="text-gray-400">Total Positions</span>
                <span className="font-mono text-white font-bold">
                  {report.positionsOpened} Opened / {report.positionsClosed} Closed
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#162029]">
                <span className="text-gray-400">Trailing Stop Rule</span>
                <span className="font-mono text-gray-200">Confirmed H4 Swings</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#162029]">
                <span className="text-gray-400">Primary Exit Trigger</span>
                <span className="font-mono text-[#00f5ff]">Opposing H4 CHoCH</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Fixed RR Target</span>
                <span className="font-mono text-amber-400">None (Structural Exit)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simulated / Real Positions Table */}
      {report && report.positions && report.positions.length > 0 && (
        <div className="p-4 rounded-lg bg-[#0d1216] border border-[#1d2731] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase">
              <BarChart3 className="w-3.5 h-3.5 text-[#c6f135]" />
              {activeMode === 'REAL_BACKTEST' ? 'Historical Trades Taken' : 'Simulated Positions'} ({report.positions.length})
            </h3>
            <span className="text-[10px] font-mono text-gray-400">
              {activeMode === 'REAL_BACKTEST' ? 'Real Market Walk-Forward' : 'Deterministic Setup Execution'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[11px] text-gray-400 bg-[#121920] border-b border-[#1d2b38]">
                <tr>
                  <th className="py-2 px-3">Position ID</th>
                  <th className="py-2 px-3">Direction</th>
                  <th className="py-2 px-3">Entry Price</th>
                  <th className="py-2 px-3">Initial SL</th>
                  <th className="py-2 px-3">Current / Final SL</th>
                  <th className="py-2 px-3">Exit Price</th>
                  <th className="py-2 px-3">Exit Reason</th>
                  <th className="py-2 px-3 text-right">PnL (R)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#15202b]">
                {report.positions.map((pos) => {
                  const isWin = (pos.pnlRMultiple || 0) > 0;
                  return (
                    <tr key={pos.id} className="hover:bg-[#121921]/50">
                      <td className="py-2 px-3 text-gray-300 font-bold">{pos.id}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            pos.direction === 'BUY'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {pos.direction}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-white font-bold">{pos.entryPrice}</td>
                      <td className="py-2 px-3 text-gray-400">{pos.initialStopLoss}</td>
                      <td className="py-2 px-3 text-cyan-400 font-bold">
                        {pos.currentStopLoss}
                        {pos.trailingEvents.length > 0 && (
                          <span className="ml-1 text-[10px] text-gray-500">
                            ({pos.trailingEvents.length} trails)
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-white">{pos.exitPrice ?? '-'}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            pos.exitReason === 'OPPOSITE_4H_CHOCH'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                              : pos.exitReason === 'TRAILING_SL'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                              : 'bg-gray-800 text-gray-300'
                          }`}
                        >
                          {pos.exitReason ?? 'ACTIVE'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span
                          className={`font-bold font-mono ${
                            isWin ? 'text-[#c6f135]' : 'text-rose-400'
                          }`}
                        >
                          {(pos.pnlRMultiple || 0) > 0 ? '+' : ''}
                          {pos.pnlRMultiple?.toFixed(2) ?? '0.00'} R
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* State Transitions Audit Log */}
      {report && report.stateTransitions && report.stateTransitions.length > 0 && (
        <div className="p-4 rounded-lg bg-[#0d1216] border border-[#1d2731] space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase">
              <Clock className="w-3.5 h-3.5 text-[#00f5ff]" />
              State Machine Transitions & Structural Audit Log
            </h3>
            <span className="text-[10px] font-mono text-gray-400">
              {report.stateTransitions.length} chronological transition events
            </span>
          </div>

          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {report.stateTransitions.map((st, idx) => (
              <div
                key={idx}
                className="p-2 rounded bg-[#10171d] border border-[#18232c] flex items-start gap-2.5 text-xs font-mono"
              >
                <span className="text-[10px] text-gray-500 flex-shrink-0 mt-0.5">
                  {st.timeUtc.slice(11, 19)}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[10px] text-gray-400">{st.from}</span>
                  <ArrowRight className="w-3 h-3 text-gray-600" />
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getStateBadgeColor(
                      st.to
                    )}`}
                  >
                    {st.to}
                  </span>
                </div>
                <div className="text-gray-300 text-[11px] truncate flex-1">{st.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
