import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { NormalizedQuote } from '../../types/connectivity';
import { api } from '../../lib/api';

interface LiveQuoteProbeProps {
  providerId: string;
  isProviderConnected: boolean;
}

export const LiveQuoteProbe: React.FC<LiveQuoteProbeProps> = ({
  providerId,
  isProviderConnected,
}) => {
  const [symbolInput, setSymbolInput] = useState('EURUSD');
  const [activeSymbol, setActiveSymbol] = useState('EURUSD');
  const [quote, setQuote] = useState<NormalizedQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

  const quickSymbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD', 'US30'];

  const fetchQuote = async (symbol: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const q = await api.getProviderQuote(providerId, symbol);
      setQuote(q);
      setActiveSymbol(symbol);
      setLastFetchTime(new Date());
    } catch (err: any) {
      setError(err.message || `Failed to fetch quote for ${symbol}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isProviderConnected) {
      fetchQuote('EURUSD');
    }
  }, [isProviderConnected, providerId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbolInput.trim()) {
      fetchQuote(symbolInput.trim().toUpperCase());
    }
  };

  return (
    <div className="bg-[#0b1014] border border-[#1b252f] rounded-lg p-4 font-mono text-xs space-y-3">
      {/* Header & Quick Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#1b252f]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#c6f135]" />
          <span className="font-bold text-white tracking-wide">LIVE MARKET TICK PROBE</span>
        </div>

        {/* Quick Symbols */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 sm:pb-0">
          {quickSymbols.map((sym) => (
            <button
              key={sym}
              onClick={() => {
                setSymbolInput(sym);
                fetchQuote(sym);
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                activeSymbol === sym
                  ? 'bg-[#c6f135] text-black'
                  : 'bg-[#141b21] text-gray-400 hover:text-gray-200 hover:bg-[#1a232b]'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {/* Symbol Search Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={symbolInput}
            onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
            placeholder="Search broker symbol (e.g. EURUSD, NAS100, ETHUSD)..."
            className="w-full bg-[#070b0e] border border-[#1a242d] rounded px-3 py-1.5 pl-8 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#c6f135]"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="px-3 py-1.5 rounded bg-[#162028] hover:bg-[#1f2c38] text-white border border-[#232f3b] text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Probe Tick</span>
        </button>
      </form>

      {/* Quote Display Panel */}
      {error ? (
        <div className="p-3 bg-rose-950/20 border border-rose-900/30 rounded text-rose-300 text-[11px]">
          {error}
        </div>
      ) : quote ? (
        <div className="bg-[#070b0e] border border-[#162028] rounded p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{quote.symbol}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#162028] text-[#00f5ff] font-semibold">
                Spread: {quote.spread} pts
              </span>
            </div>
            <div className="text-[10px] text-gray-400">
              {lastFetchTime ? lastFetchTime.toLocaleTimeString() : quote.timeUtc}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="bg-[#0c1216] border border-[#19242d] p-2 rounded">
              <div className="text-[10px] text-gray-400">BID PRICE</div>
              <div className="text-sm font-bold text-gray-200 mt-0.5">{quote.bid}</div>
            </div>

            <div className="bg-[#0c1216] border border-[#19242d] p-2 rounded">
              <div className="text-[10px] text-gray-400">ASK PRICE</div>
              <div className="text-sm font-bold text-[#c6f135] mt-0.5">{quote.ask}</div>
            </div>

            <div className="bg-[#0c1216] border border-[#19242d] p-2 rounded">
              <div className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                <span>24H HIGH</span>
                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="text-xs font-semibold text-gray-300 mt-0.5">
                {quote.high24h ? quote.high24h : '-'}
              </div>
            </div>

            <div className="bg-[#0c1216] border border-[#19242d] p-2 rounded">
              <div className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                <span>24H LOW</span>
                <ArrowDownRight className="w-3 h-3 text-rose-400" />
              </div>
              <div className="text-xs font-semibold text-gray-300 mt-0.5">
                {quote.low24h ? quote.low24h : '-'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-gray-400 text-[11px]">
          Enter a symbol and click Probe Tick to test the market data pipe.
        </div>
      )}
    </div>
  );
};
