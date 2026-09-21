import React, { useState } from 'react';
import { PieChart, TrendingUp, BarChart3, ShieldCheck } from 'lucide-react';
import { AnalyticsSummary, AppMode } from '../../types';

interface AnalyticsViewProps {
  analytics: Record<'DEMO' | 'BACKTEST' | 'LIVE', AnalyticsSummary>;
  currentMode: AppMode;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ analytics, currentMode }) => {
  const [selectedMode, setSelectedMode] = useState<'DEMO' | 'BACKTEST' | 'LIVE'>(
    currentMode === 'LIVE' ? 'LIVE' : currentMode === 'BACKTEST' ? 'BACKTEST' : 'DEMO'
  );

  const data = analytics[selectedMode];

  return (
    <div className="space-y-4 pb-16 font-mono text-xs">
      <div className="p-3 bg-[#0d1216] rounded border border-[#1b252f] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-purple-400" />
          <span className="font-bold text-white tracking-wider">
            QUANTITATIVE PERFORMANCE & METRICS
          </span>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center rounded border border-[#1c2630] bg-[#0c1115] p-0.5">
          {(['DEMO', 'BACKTEST', 'LIVE'] as ('DEMO' | 'BACKTEST' | 'LIVE')[]).map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMode(m)}
              className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                selectedMode === m
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {m} DATA
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: 'WIN RATE', value: data.totalTrades > 0 ? `${data.winRate}%` : 'N/A', color: 'text-[#c6f135]' },
          { label: 'PROFIT FACTOR', value: data.profitFactor > 0 ? data.profitFactor.toFixed(2) : 'N/A', color: 'text-[#00f5ff]' },
          { label: 'EXPECTANCY', value: data.expectancyR > 0 ? `+${data.expectancyR}R` : 'N/A', color: 'text-amber-400' },
          { label: 'MAX DRAWDOWN', value: data.maxDrawdownPercent > 0 ? `-${data.maxDrawdownPercent}%` : '0%', color: 'text-rose-400' },
        ].map((item) => (
          <div key={item.label} className="p-3 bg-[#0d1216] rounded border border-[#1b252f] space-y-1">
            <div className="text-[10px] text-gray-400">{item.label}</div>
            <div className={`text-lg font-bold ${item.color}`}>{item.value}</div>
            <div className="text-[9px] text-gray-500">Origin: {selectedMode} sample</div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-[#0d1216] rounded border border-[#1b252f] space-y-3">
        <div className="font-bold text-white border-b border-[#1b252f] pb-2">
          STRATEGY ATTRIBUTION BREAKDOWN
        </div>
        <div className="space-y-2">
          {[
            { name: 'London Breakout & Liquidity Sweep', trades: 18, winRate: '66.7%', profitFactor: '2.40', netR: '+14.2R' },
            { name: 'US Indices Momentum Pullback', trades: 14, winRate: '57.1%', profitFactor: '1.92', netR: '+8.5R' },
          ].map((strat) => (
            <div key={strat.name} className="p-2.5 rounded bg-[#10161c] border border-[#1d2731] flex items-center justify-between">
              <div>
                <div className="font-bold text-white">{strat.name}</div>
                <div className="text-[10px] text-gray-400">{strat.trades} Trades Evaluated</div>
              </div>
              <div className="text-right">
                <div className="text-[#c6f135] font-bold">{strat.netR}</div>
                <div className="text-[10px] text-gray-400">Win: {strat.winRate} | PF: {strat.profitFactor}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
