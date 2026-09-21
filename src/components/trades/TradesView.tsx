import React from 'react';
import { CheckSquare, ArrowUpRight, ArrowDownRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { TradeDecision } from '../../types';

interface TradesViewProps {
  decisions: TradeDecision[];
  onExecuteSimulated?: (decisionId: string) => void;
}

export const TradesView: React.FC<TradesViewProps> = ({
  decisions,
  onExecuteSimulated,
}) => {
  return (
    <div className="space-y-4 pb-16 font-mono text-xs">
      <div className="p-3 bg-[#0d1216] rounded border border-[#1b252f] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-[#c6f135]" />
          <span className="font-bold text-white tracking-wider">
            TRADE DECISION ENGINE CANDIDATES
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#c6f135]/10 text-[#c6f135] border border-[#c6f135]/30">
          ALL CONDITIONS SYSTEMICALLY AUDITED
        </span>
      </div>

      <div className="space-y-3">
        {decisions.map((dec) => {
          const isBuy = dec.direction === 'BUY';
          return (
            <div
              key={dec.id}
              className="p-3.5 bg-[#0d1216] rounded border border-[#1b252f] space-y-3 hover:border-[#2a3a49] transition-all"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#18222b] pb-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded font-bold text-xs flex items-center gap-1 ${
                      isBuy ? 'bg-[#c6f135]/20 text-[#c6f135]' : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {isBuy ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {dec.direction} {dec.market}
                  </span>
                  <span className="text-white font-bold">{dec.strategyName}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#131b22] text-[#00f5ff] border border-[#1c2834]">
                    Confidence: {dec.confidenceScore}%
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#162028] text-gray-300 border border-[#222e3a]">
                    Status: {dec.status}
                  </span>
                </div>
              </div>

              {/* Pricing & Sizing Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-[#090d10] p-2.5 rounded border border-[#151f28]">
                <div>
                  <span className="text-[10px] text-gray-500">ENTRY</span>
                  <div className="font-bold text-white">{dec.entryPrice}</div>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500">STOP LOSS</span>
                  <div className="font-bold text-rose-400">{dec.stopLossPrice}</div>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500">TAKE PROFIT</span>
                  <div className="font-bold text-[#c6f135]">{dec.takeProfitPrice}</div>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500">R:R RATIO</span>
                  <div className="font-bold text-amber-400">{dec.riskRewardRatio} : 1</div>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500">SIZING</span>
                  <div className="font-bold text-[#00f5ff]">{dec.calculatedPositionSize} Lots</div>
                </div>
              </div>

              {/* Explainable Decision Triggers */}
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                  EXPLAINABLE SYSTEM VERIFICATIONS:
                </span>
                <ul className="space-y-1 text-[11px] text-gray-300">
                  {dec.reasons.map((r, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#c6f135] shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
