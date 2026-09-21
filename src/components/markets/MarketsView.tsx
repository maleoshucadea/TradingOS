import React, { useState } from 'react';
import {
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { InstrumentQuote, MarketSessionInfo, AssetClass } from '../../types';

interface MarketsViewProps {
  instruments: InstrumentQuote[];
  sessions: MarketSessionInfo[];
  onSelectMarketForStrategy?: (symbol: string) => void;
}

export const MarketsView: React.FC<MarketsViewProps> = ({
  instruments,
  sessions,
  onSelectMarketForStrategy,
}) => {
  const [assetFilter, setAssetFilter] = useState<AssetClass | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = instruments.filter((inst) => {
    const matchesAsset = assetFilter === 'ALL' || inst.assetClass === assetFilter;
    const matchesSearch =
      inst.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAsset && matchesSearch;
  });

  return (
    <div className="space-y-4 pb-16 font-mono text-xs">
      {/* Sessions Bar */}
      <div className="p-3 bg-[#0d1216] rounded border border-[#1b252f] space-y-2">
        <div className="flex items-center justify-between text-gray-400">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#00f5ff]" />
            <span className="font-bold text-white tracking-wider">GLOBAL MARKET SESSIONS</span>
          </div>
          <span className="text-[10px]">UTC SYNCHRONIZED</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {sessions.map((sess) => {
            const isOpen = sess.status === 'OPEN';
            return (
              <div
                key={sess.session}
                className={`p-2 rounded border flex flex-col justify-between ${
                  isOpen
                    ? 'bg-[#101920] border-[#00f5ff]/40 text-white'
                    : 'bg-[#090c0e] border-[#151c22] text-gray-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{sess.session}</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded ${
                      isOpen
                        ? 'bg-[#00f5ff]/20 text-[#00f5ff] font-bold'
                        : 'bg-gray-800 text-gray-500'
                    }`}
                  >
                    {sess.status}
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-gray-400">
                  {sess.openUtc} - {sess.closeUtc} UTC
                </div>
                {sess.overlapWith && isOpen && (
                  <div className="mt-1 text-[9px] text-[#c6f135]">
                    ★ Overlap with {sess.overlapWith}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-2.5 bg-[#0d1216] rounded border border-[#1b252f] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          {['ALL', 'FOREX', 'INDICES', 'COMMODITIES', 'CRYPTO'].map((cat) => (
            <button
              key={cat}
              onClick={() => setAssetFilter(cat as any)}
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                assetFilter === cat
                  ? 'bg-[#00f5ff]/20 text-[#00f5ff] border border-[#00f5ff]/40'
                  : 'bg-[#12181f] text-gray-400 hover:text-white border border-[#1c2630]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2 top-2" />
          <input
            type="text"
            placeholder="Search instrument..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-48 bg-[#12181f] border border-[#1c2630] rounded pl-7 pr-2 py-1 text-white text-xs focus:outline-none focus:border-[#00f5ff]"
          />
        </div>
      </div>

      {/* Instruments Table / Grid */}
      <div className="space-y-2">
        {filtered.map((inst) => {
          const isPositive = inst.change24h >= 0;
          return (
            <div
              key={inst.symbol}
              className="p-3 bg-[#0d1216] rounded border border-[#1b252f] hover:border-[#2b3a4a] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-[#131b22] border border-[#1e2a36] text-[#00f5ff] font-bold">
                  {inst.symbol.substring(0, 3)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{inst.symbol}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#17202a] text-gray-400">
                      {inst.assetClass}
                    </span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-[#121d15] text-[#c6f135] border border-[#1f3724]">
                      {inst.dataSourceType}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{inst.name}</div>
                </div>
              </div>

              {/* Quotes & Metrics */}
              <div className="grid grid-cols-3 sm:flex sm:items-center gap-3 text-right">
                <div>
                  <div className="text-[10px] text-gray-500">PRICE</div>
                  <div className="text-xs font-bold text-white">
                    {inst.price.toFixed(inst.price < 10 ? 4 : 2)}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-gray-500">24H CHG</div>
                  <div
                    className={`text-xs font-bold flex items-center justify-end ${
                      isPositive ? 'text-[#c6f135]' : 'text-rose-400'
                    }`}
                  >
                    {isPositive ? '+' : ''}
                    {inst.changePercent24h.toFixed(2)}%
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-gray-500">SPREAD / ATR</div>
                  <div className="text-xs text-gray-300">
                    {inst.spread} / {inst.atr14}
                  </div>
                </div>

                {onSelectMarketForStrategy && (
                  <button
                    onClick={() => onSelectMarketForStrategy(inst.symbol)}
                    className="col-span-3 sm:col-span-1 px-2.5 py-1 rounded bg-[#162029] text-[#c6f135] border border-[#23313d] hover:bg-[#1e2d3b] text-[11px] font-bold"
                  >
                    SELECT
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
