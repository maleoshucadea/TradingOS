import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Lock, DollarSign, Percent, Calculator } from 'lucide-react';

export const RiskManagementView: React.FC = () => {
  // Calculator interactive state
  const [balance, setBalance] = useState<number>(50000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0);
  const [entryPrice, setEntryPrice] = useState<number>(1.0865);
  const [stopLossPrice, setStopLossPrice] = useState<number>(1.0835);

  const riskDollar = (balance * (riskPercent / 100));
  const stopDistance = Math.abs(entryPrice - stopLossPrice);
  const pipValue = 10; // Standard lot pip value
  const stopPips = stopDistance * 10000;
  const calculatedLotSize = stopPips > 0 ? (riskDollar / (stopPips * pipValue)) : 0;

  return (
    <div className="space-y-4 pb-16 font-mono text-xs">
      {/* Top Gatekeeper Banner */}
      <div className="p-3 bg-[#0d1216] rounded border border-[#1b252f] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#c6f135]" />
          <div>
            <span className="font-bold text-white tracking-wider">RISK ENGINE: GATEKEEPER PASS</span>
            <div className="text-[10px] text-gray-400">Trading allowed. All risk boundaries safely unbreached.</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#c6f135]/20 text-[#c6f135] font-bold border border-[#c6f135]/40">
            CIRCUIT BREAKER ARMED
          </span>
        </div>
      </div>

      {/* Real-time Account Risk Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: 'MAX RISK PER TRADE', limit: '1.0%', current: '1.0%', status: 'PASS' },
          { label: 'DAILY DRAWDOWN LIMIT', limit: '2.5%', current: '0.48%', status: 'PASS' },
          { label: 'TOTAL DRAWDOWN CEILING', limit: '5.0%', current: '1.4%', status: 'PASS' },
          { label: 'MAX CONCURRENT TRADES', limit: '2 Trades', current: '1 Active', status: 'PASS' },
        ].map((item) => (
          <div key={item.label} className="p-3 bg-[#0d1216] rounded border border-[#1b252f] space-y-1">
            <div className="text-[10px] text-gray-400">{item.label}</div>
            <div className="text-sm font-bold text-white">{item.current}</div>
            <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#1a232c]">
              <span className="text-gray-500">Cap: {item.limit}</span>
              <span className="text-[#c6f135] font-bold">{item.status}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Position Sizing & Volatility Calculator */}
      <div className="p-4 bg-[#0d1216] rounded border border-[#1b252f] space-y-4">
        <div className="flex items-center justify-between border-b border-[#1b252f] pb-2">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#00f5ff]" />
            <span className="font-bold text-white">SYSTEMIC POSITION SIZING ENGINE</span>
          </div>
          <span className="text-[10px] text-gray-500">DYNAMIC CAPITAL ALLOCATION</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-gray-400 text-[10px] mb-1">Account Equity ($)</label>
            <input
              type="number"
              value={balance}
              onChange={(e) => setBalance(Number(e.target.value))}
              className="w-full bg-[#12181f] border border-[#202d3b] rounded px-3 py-1.5 text-white font-bold"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-[10px] mb-1">Risk Percentage (%)</label>
            <input
              type="number"
              step="0.1"
              value={riskPercent}
              onChange={(e) => setRiskPercent(Number(e.target.value))}
              className="w-full bg-[#12181f] border border-[#202d3b] rounded px-3 py-1.5 text-white font-bold"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-[10px] mb-1">Entry Price</label>
            <input
              type="number"
              step="0.0001"
              value={entryPrice}
              onChange={(e) => setEntryPrice(Number(e.target.value))}
              className="w-full bg-[#12181f] border border-[#202d3b] rounded px-3 py-1.5 text-white font-bold"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-[10px] mb-1">Stop Loss Price</label>
            <input
              type="number"
              step="0.0001"
              value={stopLossPrice}
              onChange={(e) => setStopLossPrice(Number(e.target.value))}
              className="w-full bg-[#12181f] border border-[#202d3b] rounded px-3 py-1.5 text-white font-bold"
            />
          </div>
        </div>

        {/* Calculated Results Display */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#090d10] p-3 rounded border border-[#162029]">
          <div>
            <span className="text-gray-500 text-[10px]">MONETARY RISK (1R):</span>
            <div className="text-sm font-bold text-rose-400">${riskDollar.toFixed(2)}</div>
          </div>
          <div>
            <span className="text-gray-500 text-[10px]">STOP DISTANCE:</span>
            <div className="text-sm font-bold text-white">{stopPips.toFixed(1)} Pips</div>
          </div>
          <div>
            <span className="text-gray-500 text-[10px]">RECOMMENDED POSITION SIZE:</span>
            <div className="text-sm font-bold text-[#c6f135]">{calculatedLotSize.toFixed(2)} Lots</div>
          </div>
        </div>
      </div>
    </div>
  );
};
