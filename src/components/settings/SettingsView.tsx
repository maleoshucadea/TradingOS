import React from 'react';
import { Settings, Shield, Database, Smartphone, RotateCcw } from 'lucide-react';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface SettingsViewProps {
  onResetData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onResetData }) => {
  return (
    <div className="space-y-4 pb-16 font-mono text-xs">
      <div className="p-3 bg-[#0d1216] rounded border border-[#1b252f] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-300" />
          <span className="font-bold text-white tracking-wider">
            SYSTEM ARCHITECTURE & PREFERENCES
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#162029] text-[#c6f135] border border-[#223342]">
          STAGE: STRATEGY LANGUAGE ACTIVE
        </span>
      </div>

      {/* Safety & Execution Policy */}
      <div className="p-3 bg-[#0d1216] rounded border border-[#1b252f] space-y-3">
        <div className="text-xs font-bold text-white flex items-center gap-2 border-b border-[#1b252f] pb-2">
          <Shield className="w-4 h-4 text-[#c6f135]" />
          <span>EXECUTION SAFETY POLICIES</span>
        </div>
        <div className="space-y-2 text-gray-300">
          <div className="flex items-center justify-between p-2 rounded bg-[#10161c]">
            <div>
              <div className="font-bold text-white">Analysis & Execution Separation</div>
              <div className="text-[10px] text-gray-400">Analysis never triggers trades directly</div>
            </div>
            <span className="text-[#c6f135] font-bold">ENFORCED</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-[#10161c]">
            <div>
              <div className="font-bold text-white">Accidental Order Prevention</div>
              <div className="text-[10px] text-gray-400">Live trading requires explicit multi-step confirmation</div>
            </div>
            <span className="text-[#c6f135] font-bold">LOCKED</span>
          </div>
        </div>
      </div>

      {/* Mobile PWA & Offline Status */}
      <div className="p-3 bg-[#0d1216] rounded border border-[#1b252f] space-y-3">
        <div className="text-xs font-bold text-white flex items-center gap-2 border-b border-[#1b252f] pb-2">
          <Smartphone className="w-4 h-4 text-[#00f5ff]" />
          <span>PROGRESSIVE WEB APP (PWA) DEPLOYMENT</span>
        </div>
        <div className="p-3 bg-[#10161c] rounded space-y-2">
          <p className="text-gray-300 text-[11px] leading-relaxed">
            TradingOS is compiled as a mobile-first Progressive Web App (PWA) with responsive layouts optimized for touch interaction (iPhone 402x874 baseline).
          </p>
          <div className="flex items-center gap-3 pt-1">
            <PWAInstallButton />
          </div>
        </div>
      </div>

      {/* Storage & Reset */}
      <div className="p-3 bg-[#0d1216] rounded border border-[#1b252f] space-y-3">
        <div className="text-xs font-bold text-white flex items-center gap-2 border-b border-[#1b252f] pb-2">
          <Database className="w-4 h-4 text-amber-400" />
          <span>DATA PERSISTENCE & SEED RECOVERY</span>
        </div>
        <div className="flex items-center justify-between p-2 rounded bg-[#10161c]">
          <div>
            <div className="font-bold text-white">Reset Strategy Seed Data</div>
            <div className="text-[10px] text-gray-400">Restore factory default strategies & rules</div>
          </div>
          <button
            onClick={() => {
              if (confirm('Reset all strategies and rules to default seed state?')) {
                onResetData();
              }
            }}
            className="flex items-center gap-1 px-3 py-1 rounded bg-[#1f2832] text-amber-400 border border-amber-400/30 hover:bg-[#273340]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>
        </div>
      </div>
    </div>
  );
};
