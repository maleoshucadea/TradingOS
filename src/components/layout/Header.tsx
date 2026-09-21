import React from 'react';
import { ShieldAlert, Activity, Wifi, WifiOff } from 'lucide-react';
import { AppMode, MarketSessionInfo } from '../../types';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface HeaderProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  sessions: MarketSessionInfo[];
  isOnline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onModeChange,
  sessions,
  isOnline,
}) => {
  const openSessions = sessions.filter((s) => s.status === 'OPEN').map((s) => s.session);
  const sessionText = openSessions.length > 0 ? openSessions.join(' + ') : 'ALL SESSIONS CLOSED';

  const modeColors: Record<AppMode, { bg: string; text: string; border: string }> = {
    ANALYSIS: { bg: 'bg-[#c6f135]/10', text: 'text-[#c6f135]', border: 'border-[#c6f135]/30' },
    BACKTEST: { bg: 'bg-[#00f5ff]/10', text: 'text-[#00f5ff]', border: 'border-[#00f5ff]/30' },
    DEMO: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
    LIVE: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/40' },
  };

  const currentModeStyle = modeColors[mode];

  return (
    <header className="sticky top-0 z-40 bg-[#090c0e]/95 backdrop-blur-md border-b border-[#182026] px-3 sm:px-4 py-2 pt-safe">
      <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
        {/* Brand & Terminal Icon */}
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-[#10171d] border border-[#212d38] flex items-center justify-center text-[#c6f135] font-mono text-xs font-bold shadow-[0_0_8px_rgba(198,241,53,0.15)]">
            T
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs sm:text-sm font-bold tracking-wider text-white">
                TRADING<span className="text-[#c6f135]">OS</span>
              </span>
              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-[#162028] text-gray-400 border border-[#212d38]">
                v1.0
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c6f135] animate-pulse" />
              <span>CORE: ACTIVE</span>
              <span className="text-gray-600">|</span>
              <span className="text-[#00f5ff]">{sessionText}</span>
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Session on mobile */}
          <div className="sm:hidden text-[9px] font-mono text-[#00f5ff] px-1.5 py-0.5 rounded bg-[#00f5ff]/10 border border-[#00f5ff]/20">
            {openSessions[0] || 'MARKET'}
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center rounded border border-[#1b252f] bg-[#0c1115] p-0.5">
            {(['ANALYSIS', 'BACKTEST', 'DEMO', 'LIVE'] as AppMode[]).map((m) => {
              const isActive = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => onModeChange(m)}
                  className={`px-1.5 sm:px-2 py-0.5 text-[10px] font-mono font-semibold transition-all rounded ${
                    isActive
                      ? `${currentModeStyle.bg} ${currentModeStyle.text} border ${currentModeStyle.border}`
                      : 'text-gray-400 hover:text-gray-200 border border-transparent'
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>

          {/* Online/Offline Status */}
          <div
            className="flex items-center justify-center p-1 rounded text-xs font-mono"
            title={isOnline ? 'System Online (API connected)' : 'Offline Cache Mode'}
          >
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-[#c6f135]" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            )}
          </div>

          {/* PWA Install */}
          <PWAInstallButton />
        </div>
      </div>

      {/* Safety Notice Banner if in LIVE or DEMO mode */}
      {mode === 'LIVE' && (
        <div className="mt-1.5 -mx-3 sm:-mx-4 px-3 py-1 bg-rose-500/20 border-y border-rose-500/40 flex items-center justify-between text-[11px] font-mono text-rose-300">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>LIVE EXECUTION MODE ARMED — REAL CAPITAL AT RISK. SAFETY GATES STRICTLY ENFORCED.</span>
          </div>
          <button
            onClick={() => onModeChange('ANALYSIS')}
            className="text-[10px] underline hover:text-white"
          >
            DISARM TO ANALYSIS
          </button>
        </div>
      )}
    </header>
  );
};
