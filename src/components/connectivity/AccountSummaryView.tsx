import React from 'react';
import { DollarSign, ShieldAlert, Layers, Percent, Lock } from 'lucide-react';
import { NormalizedAccount } from '../../types/connectivity';

interface AccountSummaryViewProps {
  account: NormalizedAccount | null;
  isLoading: boolean;
}

export const AccountSummaryView: React.FC<AccountSummaryViewProps> = ({
  account,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-[#0b1014] border border-[#1b252f] rounded-lg p-4 font-mono text-xs animate-pulse space-y-3">
        <div className="h-4 bg-gray-800 rounded w-1/3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="h-12 bg-gray-900 rounded" />
          <div className="h-12 bg-gray-900 rounded" />
          <div className="h-12 bg-gray-900 rounded" />
          <div className="h-12 bg-gray-900 rounded" />
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="bg-[#0b1014] border border-[#182026] rounded-lg p-4 font-mono text-xs text-gray-500 text-center py-6">
        No active account loaded. Test the bridge connection to retrieve terminal account telemetry.
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: account.currency || 'USD',
      minimumFractionDigits: 2,
    }).format(val);
  };

  const isRealTerminal = account.dataSourceType === 'REAL_TERMINAL';

  return (
    <div className="bg-[#0b1014] border border-[#1b252f] rounded-lg p-4 font-mono text-xs space-y-4">
      {/* Account ID & Broker Meta */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1b252f]">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">{account.accountName || 'Primary Account'}</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#16212a] text-[#00f5ff] font-semibold border border-[#00f5ff]/20">
              {account.loginMasked}
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                isRealTerminal
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-[#1a232b] text-amber-300 border border-amber-500/30'
              }`}
            >
              {account.dataSourceType.replace('_', ' ')}
            </span>
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {account.broker} • <span className="text-gray-300">{account.server}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right text-[10px] text-gray-400">
            <div>LEVERAGE</div>
            <div className="text-white font-bold">1:{account.leverage}</div>
          </div>
          <div className="px-2.5 py-1 rounded bg-[#161214] border border-rose-900/40 text-rose-300 text-[10px] font-bold flex items-center gap-1">
            <Lock className="w-3 h-3 text-rose-400" />
            <span>READ-ONLY</span>
          </div>
        </div>
      </div>

      {/* Main Account Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-[#070b0e] border border-[#162028] p-2.5 rounded">
          <div className="text-[10px] text-gray-400 flex items-center justify-between">
            <span>BALANCE</span>
            <DollarSign className="w-3 h-3 text-gray-500" />
          </div>
          <div className="text-sm sm:text-base font-bold text-white mt-1">
            {formatCurrency(account.balance)}
          </div>
        </div>

        <div className="bg-[#070b0e] border border-[#162028] p-2.5 rounded">
          <div className="text-[10px] text-gray-400 flex items-center justify-between">
            <span>EQUITY</span>
            <span className={`text-[10px] font-bold ${account.equity >= account.balance ? 'text-[#c6f135]' : 'text-rose-400'}`}>
              {account.equity >= account.balance ? '▲' : '▼'}
            </span>
          </div>
          <div
            className={`text-sm sm:text-base font-bold mt-1 ${
              account.equity >= account.balance ? 'text-[#c6f135]' : 'text-rose-400'
            }`}
          >
            {formatCurrency(account.equity)}
          </div>
        </div>

        <div className="bg-[#070b0e] border border-[#162028] p-2.5 rounded">
          <div className="text-[10px] text-gray-400 flex items-center justify-between">
            <span>MARGIN USED</span>
            <Layers className="w-3 h-3 text-gray-500" />
          </div>
          <div className="text-sm sm:text-base font-bold text-gray-200 mt-1">
            {formatCurrency(account.margin)}
          </div>
        </div>

        <div className="bg-[#070b0e] border border-[#162028] p-2.5 rounded">
          <div className="text-[10px] text-gray-400 flex items-center justify-between">
            <span>FREE MARGIN</span>
            <span className="text-[10px] text-gray-500">{account.currency}</span>
          </div>
          <div className="text-sm sm:text-base font-bold text-[#00f5ff] mt-1">
            {formatCurrency(account.freeMargin)}
          </div>
        </div>
      </div>

      {/* Margin Level & Health */}
      <div className="bg-[#080c0f] border border-[#17222b] p-2.5 rounded flex flex-wrap items-center justify-between gap-3 text-[11px]">
        <div className="flex items-center gap-2">
          <Percent className="w-3.5 h-3.5 text-[#00f5ff]" />
          <span className="text-gray-400">Margin Level:</span>
          <span className="font-bold text-white">
            {account.marginLevel !== null ? `${account.marginLevel.toFixed(1)}%` : 'No open margin'}
          </span>
        </div>

        <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-[#c6f135]" />
          <span>Execution Gate: <strong className="text-white">LOCKED (Proof of Connection Phase)</strong></span>
        </div>
      </div>
    </div>
  );
};
