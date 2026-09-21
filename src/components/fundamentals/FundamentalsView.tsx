import React from 'react';
import { Globe2, Calendar, TrendingUp, AlertCircle, ShieldAlert } from 'lucide-react';

export const FundamentalsView: React.FC = () => {
  return (
    <div className="space-y-4 pb-16 font-mono text-xs">
      <div className="p-3 bg-[#0d1216] rounded border border-[#1b252f] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-white tracking-wider">
            FUNDAMENTAL ANALYSIS ENGINE
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/30">
          MACRO REGIME: DATA-DEPENDENT
        </span>
      </div>

      {/* Central Bank Monetary Policy Divergence Matrix */}
      <div className="p-3 bg-[#0d1216] rounded border border-[#1b252f] space-y-3">
        <div className="text-xs font-bold text-white flex items-center justify-between border-b border-[#1b252f] pb-2">
          <span>CENTRAL BANK POLICY DIVERGENCE & STANCE</span>
          <span className="text-gray-500 text-[10px]">Q3/Q4 PROJECTIONS</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { bank: 'Federal Reserve (Fed)', rate: '5.25 - 5.50%', stance: 'NEUTRAL (PAUSE)', bias: 'Rate cut optionality', color: 'text-amber-400' },
            { bank: 'European Central Bank (ECB)', rate: '3.75%', stance: 'HAWKISH PAUSE', bias: 'Services inflation sticky', color: 'text-[#c6f135]' },
            { bank: 'Bank of England (BoE)', rate: '5.00%', stance: 'GRADUAL EASING', bias: 'Headline CPI near 2%', color: 'text-[#00f5ff]' },
            { bank: 'Bank of Japan (BoJ)', rate: '0.25%', stance: 'HAWKISH HIKING', bias: 'Wage-price spiral normalizing', color: 'text-purple-400' },
          ].map((item) => (
            <div key={item.bank} className="p-2.5 rounded bg-[#10161c] border border-[#1d2731] space-y-1">
              <div className="font-bold text-white text-[11px]">{item.bank}</div>
              <div className="text-gray-400 text-[10px]">Benchmark: <span className="text-white font-semibold">{item.rate}</span></div>
              <div className={`text-[10px] font-bold ${item.color}`}>{item.stance}</div>
              <div className="text-[9px] text-gray-500">{item.bias}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Economic Calendar & Tier-1 Event Gate */}
      <div className="p-3 bg-[#0d1216] rounded border border-[#1b252f] space-y-3">
        <div className="text-xs font-bold text-white flex items-center justify-between border-b border-[#1b252f] pb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#00f5ff]" />
            <span>ECONOMIC CALENDAR & HIGH-IMPACT FILTERS</span>
          </div>
          <span className="text-[10px] text-gray-500">REAL-TIME BUFFER CHECK</span>
        </div>

        <div className="space-y-2">
          {[
            { time: '180m', title: 'US Core PCE Price Index (MoM)', impact: 'HIGH', forecast: '0.2%', previous: '0.2%', currency: 'USD', status: 'GATE ACTIVE' },
            { time: '420m', title: 'Eurozone Flash HICP YoY', impact: 'HIGH', forecast: '2.2%', previous: '2.4%', currency: 'EUR', status: 'CLEAR' },
            { time: '600m', title: 'FOMC Member Williams Speech', impact: 'MEDIUM', forecast: '-', previous: '-', currency: 'USD', status: 'MONITOR' },
          ].map((ev, i) => (
            <div key={i} className="p-2 rounded bg-[#10161c] border border-[#1d2731] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400">
                  {ev.impact}
                </span>
                <div>
                  <div className="text-white font-bold text-xs">{ev.title}</div>
                  <div className="text-[10px] text-gray-500">
                    Currency: {ev.currency} | Forecast: {ev.forecast} | Previous: {ev.previous}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[#00f5ff] font-bold text-xs">In {ev.time}</div>
                <div className="text-[9px] text-gray-400">{ev.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
