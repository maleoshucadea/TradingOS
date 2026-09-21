import React from 'react';
import { LineChart, Layers, ArrowUpRight, Activity } from 'lucide-react';

export const TechnicalAnalysisView: React.FC = () => {
  return (
    <div className="space-y-4 pb-16 font-mono text-xs">
      <div className="p-3 bg-[#0d1216] rounded border border-[#1b252f] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LineChart className="w-4 h-4 text-[#c6f135]" />
          <span className="font-bold text-white tracking-wider">TECHNICAL ANALYSIS ENGINE</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#c6f135]/10 text-[#c6f135] border border-[#c6f135]/30">
          SMART MONEY & INDICATOR SUITE
        </span>
      </div>

      {/* Multi-Timeframe Matrix */}
      <div className="p-3 bg-[#0d1216] rounded border border-[#1b252f] space-y-2">
        <div className="text-xs font-bold text-white border-b border-[#1b252f] pb-2 flex items-center justify-between">
          <span>MULTI-TIMEFRAME STRUCTURE ALIGNMENT (EURUSD)</span>
          <span className="text-[#c6f135] font-semibold text-[10px]">BIAS: BULLISH (ALIGNED)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { tf: 'Daily (D1)', trend: 'BULLISH', swing: 'Higher High (1.0889)', ema: 'Above 200 SMA', status: 'CONFIRMED' },
            { tf: 'H4', trend: 'BULLISH', swing: 'BOS Confirmed (1.0850)', ema: 'EMA 20 > EMA 50', status: 'CONFIRMED' },
            { tf: 'H1', trend: 'BULLISH', swing: 'Liquidity Sweep at 1.0821', ema: 'Golden Cross', status: 'CONFIRMED' },
            { tf: 'M15', trend: 'PULLBACK', swing: 'RSI at 38.2 (Discount)', ema: 'Testing 20 EMA', status: 'TIMING TRIGGER' },
          ].map((item) => (
            <div key={item.tf} className="p-2.5 rounded bg-[#10161c] border border-[#1d2731] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{item.tf}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-[#c6f135]/20 text-[#c6f135]">
                  {item.trend}
                </span>
              </div>
              <div className="text-[10px] text-gray-400">{item.swing}</div>
              <div className="text-[10px] text-[#00f5ff]">{item.ema}</div>
              <div className="text-[9px] text-gray-500">{item.status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Modular Framework Recognition */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3 bg-[#0d1216] rounded border border-[#1b252f] space-y-2">
          <div className="text-xs font-bold text-white border-b border-[#1b252f] pb-2">
            MARKET STRUCTURE PATTERNS (ACTIVE)
          </div>
          <div className="space-y-1.5 text-gray-300">
            <div className="p-2 rounded bg-[#10161c] border border-[#1a2530] flex items-center justify-between">
              <div>
                <div className="font-bold text-white">Bullish Break of Structure (BOS)</div>
                <div className="text-[10px] text-gray-400">Broken key swing high 1.0848 on M15</div>
              </div>
              <span className="text-[10px] font-bold text-[#c6f135]">DETECTED</span>
            </div>
            <div className="p-2 rounded bg-[#10161c] border border-[#1a2530] flex items-center justify-between">
              <div>
                <div className="font-bold text-white">Asian Range Low Liquidity Sweep</div>
                <div className="text-[10px] text-gray-400">Wick below 1.0825 with immediate rejection</div>
              </div>
              <span className="text-[10px] font-bold text-[#00f5ff]">VALIDATED</span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-[#0d1216] rounded border border-[#1b252f] space-y-2">
          <div className="text-xs font-bold text-white border-b border-[#1b252f] pb-2">
            INDICATOR STATE ENGINE
          </div>
          <div className="space-y-1.5 text-gray-300">
            <div className="p-2 rounded bg-[#10161c] border border-[#1a2530] flex items-center justify-between">
              <div>
                <div className="font-bold text-white">RSI (14) on M15</div>
                <div className="text-[10px] text-gray-400">Value: 38.2 (Recovering from discount)</div>
              </div>
              <span className="text-[10px] font-mono text-[#c6f135]">PASS</span>
            </div>
            <div className="p-2 rounded bg-[#10161c] border border-[#1a2530] flex items-center justify-between">
              <div>
                <div className="font-bold text-white">ATR (14) Volatility</div>
                <div className="text-[10px] text-gray-400">14.2 Points (Normal volatility band)</div>
              </div>
              <span className="text-[10px] font-mono text-[#00f5ff]">STABLE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
