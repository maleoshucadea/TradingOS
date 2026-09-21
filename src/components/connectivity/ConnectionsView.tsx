import React, { useState, useEffect } from 'react';
import {
  Cable,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Settings,
  Shield,
  HelpCircle,
  Activity,
  Terminal,
  Layers,
  Radio,
  ExternalLink,
  Lock,
} from 'lucide-react';
import {
  ProviderSummary,
  ConnectionDiagnosticsReport,
  NormalizedAccount,
  NormalizedPosition,
} from '../../types/connectivity';
import { api } from '../../lib/api';
import { DiagnosticsReportView } from './DiagnosticsReportView';
import { BridgeSetupModal } from './BridgeSetupModal';
import { AccountSummaryView } from './AccountSummaryView';
import { LiveQuoteProbe } from './LiveQuoteProbe';

export const ConnectionsView: React.FC = () => {
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('mt5-primary');
  const [isLoading, setIsLoading] = useState(true);

  // MT5 state
  const [bridgeUrl, setBridgeUrl] = useState('http://127.0.0.1:8001');
  const [bridgeToken, setBridgeToken] = useState('');
  const [isSandboxOverride, setIsSandboxOverride] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Diagnostics & Data
  const [diagReport, setDiagReport] = useState<ConnectionDiagnosticsReport | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [account, setAccount] = useState<NormalizedAccount | null>(null);
  const [positions, setPositions] = useState<NormalizedPosition[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Modals
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const activeProvider = providers.find((p) => p.id === selectedProviderId) || providers[0];

  const loadProviders = async () => {
    setIsLoading(true);
    try {
      const list = await api.getProviders();
      setProviders(list);

      const mt5 = list.find((p) => p.id === 'mt5-primary');
      if (mt5?.config.bridgeUrl) {
        setBridgeUrl(mt5.config.bridgeUrl);
      }
      if (mt5?.account) {
        setAccount(mt5.account);
      }
    } catch (err: any) {
      console.error('Failed to load providers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const runDiagnostics = async () => {
    if (!activeProvider) return;
    setIsDiagnosing(true);
    try {
      const report = await api.testProvider(activeProvider.id);
      setDiagReport(report);

      // If passed, also refresh account and positions
      if (report.overallStatus === 'SUCCESS') {
        setIsLoadingData(true);
        try {
          const acc = await api.getProviderAccount(activeProvider.id);
          setAccount(acc);
          const pos = await api.getProviderPositions(activeProvider.id);
          setPositions(pos);
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoadingData(false);
        }
      }
    } catch (err: any) {
      console.error('Diagnostics failed:', err);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      await api.updateProviderConfig('mt5-primary', {
        bridgeUrl,
        bridgeToken,
        isSandboxOverride,
      });
      setNotification('MT5 configuration saved successfully.');
      setTimeout(() => setNotification(null), 3000);
      await loadProviders();
      // Auto re-run diagnostic probe with new configuration
      runDiagnostics();
    } catch (err: any) {
      setNotification(`Failed to save configuration: ${err.message}`);
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#c6f135]/15 text-[#c6f135] border border-[#c6f135]/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c6f135] animate-pulse" />
            CONNECTED
          </span>
        );
      case 'DISCONNECTED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            DISCONNECTED
          </span>
        );
      case 'ERROR':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            ERROR
          </span>
        );
      case 'UNCONFIGURED':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#172028] text-gray-400 border border-[#232f3b]">
            STANDBY / ARCHITECTURE READY
          </span>
        );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#06090b] text-gray-200 font-mono p-3 sm:p-5 space-y-4 max-w-7xl mx-auto w-full pb-20 lg:pb-8">
      {/* Strict Read-Only Safety Banner */}
      <div className="p-3.5 rounded-lg bg-[#11171d] border-l-4 border-[#c6f135] border-t border-r border-b border-[#1b2530] text-xs flex items-start gap-3 shadow-md">
        <Shield className="w-4 h-4 text-[#c6f135] shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-wider">MILESTONE 1: READ-ONLY CONNECTIVITY FOUNDATION</span>
            <span className="text-[10px] px-2 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
              EXECUTION GATED
            </span>
          </div>
          <p className="text-gray-400 text-[11px] leading-relaxed mt-1">
            Live order execution, position modification, and automated trade entry are completely locked.
            This area validates proof-of-connection telemetry, terminal health verification, broker balance inspection, and real-time market quote feeds.
          </p>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="p-2.5 rounded bg-[#16221c] border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#c6f135]" />
          <span>{notification}</span>
        </div>
      )}

      {/* Provider Selector Tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {providers.map((p) => {
          const isSelected = p.id === selectedProviderId;
          const isConnected = p.status === 'CONNECTED';
          return (
            <button
              key={p.id}
              onClick={() => setSelectedProviderId(p.id)}
              className={`p-3 rounded-lg border text-left transition-all ${
                isSelected
                  ? 'bg-[#0e141a] border-[#c6f135]/60 shadow-lg'
                  : 'bg-[#0a0e12] border-[#162029] hover:bg-[#0d1217] hover:border-[#1e2c38]'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase truncate">
                  {p.type}
                </span>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isConnected ? '#c6f135' : p.status === 'DISCONNECTED' ? '#fbbf24' : '#64748b' }} />
              </div>
              <div className="font-bold text-xs text-white truncate">{p.name}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-gray-400">{p.status}</span>
                {isSelected && <span className="text-[9px] text-[#c6f135] font-semibold">ACTIVE</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Provider Workspace */}
      {activeProvider && activeProvider.type === 'MT5' ? (
        <div className="space-y-4">
          {/* MT5 Status & Quick Action Card */}
          <div className="bg-[#0a0e12] border border-[#18232e] rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#18232e]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-[#141d26] border border-[#233140] text-[#c6f135]">
                  <Cable className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white tracking-wide">{activeProvider.name}</h2>
                    {getStatusBadge(activeProvider.status)}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {activeProvider.statusMessage}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowSetupModal(true)}
                  className="px-3 py-1.5 rounded bg-[#121921] hover:bg-[#18232e] text-gray-300 hover:text-white border border-[#22303e] text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Setup Guide</span>
                </button>

                <button
                  onClick={runDiagnostics}
                  disabled={isDiagnosing}
                  className="px-3.5 py-1.5 rounded bg-[#182417] hover:bg-[#233621] text-[#c6f135] border border-[#c6f135]/40 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>{isDiagnosing ? 'Testing Link...' : 'Test Connection & Diagnostics'}</span>
                </button>
              </div>
            </div>

            {/* Bridge Connection Config Form */}
            <div className="bg-[#070b0e] border border-[#15202a] rounded-lg p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                  Bridge Agent Endpoint Configuration
                </span>
                <span className="text-[10px] text-gray-400">
                  Target: <strong className="text-gray-200">Localhost or Tunnel URL</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-6">
                  <label className="text-[10px] text-gray-400 block mb-1">BRIDGE URL</label>
                  <input
                    type="text"
                    value={bridgeUrl}
                    onChange={(e) => setBridgeUrl(e.target.value)}
                    placeholder="http://127.0.0.1:8001"
                    className="w-full bg-[#0d1318] border border-[#1e2a36] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c6f135]"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="text-[10px] text-gray-400 block mb-1">SECURITY TOKEN (OPTIONAL)</label>
                  <input
                    type="password"
                    value={bridgeToken}
                    onChange={(e) => setBridgeToken(e.target.value)}
                    placeholder="Leave empty for open localhost"
                    className="w-full bg-[#0d1318] border border-[#1e2a36] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c6f135]"
                  />
                </div>

                <div className="sm:col-span-2 flex items-end">
                  <button
                    onClick={handleSaveConfig}
                    disabled={isSavingConfig}
                    className="w-full py-1.5 rounded bg-[#16212b] hover:bg-[#1e2d3b] text-white border border-[#273849] text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {isSavingConfig ? 'Saving...' : 'Apply Config'}
                  </button>
                </div>
              </div>

              {/* Dev Simulation Mode Toggle */}
              <div className="pt-2 border-t border-[#141e26] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sandbox-override"
                    checked={isSandboxOverride}
                    onChange={(e) => setIsSandboxOverride(e.target.checked)}
                    className="rounded bg-[#0d1318] border-gray-700 text-[#c6f135] focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="sandbox-override" className="text-gray-300 cursor-pointer select-none">
                    Enable <strong>Sandbox Simulation Mode</strong> (Allows reviewing full MT5 UI & diagnostics without a running terminal)
                  </label>
                </div>
                <span className="text-[10px] text-gray-400">
                  {isSandboxOverride ? 'SIMULATED TELEMETRY' : 'REAL LOCAL TERMINAL IPC'}
                </span>
              </div>
            </div>
          </div>

          {/* Diagnostics Section */}
          <DiagnosticsReportView
            report={diagReport}
            isRunning={isDiagnosing}
            onRerun={runDiagnostics}
          />

          {/* Account Telemetry & Metrics */}
          <AccountSummaryView account={account} isLoading={isLoadingData} />

          {/* Live Market Quote Probe */}
          <LiveQuoteProbe
            providerId={activeProvider.id}
            isProviderConnected={activeProvider.status === 'CONNECTED' || isSandboxOverride}
          />

          {/* Open Positions Read-Only Table */}
          <div className="bg-[#0a0e12] border border-[#18232e] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#18232e]">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#00f5ff]" />
                <span className="font-bold text-white text-xs tracking-wide">
                  OPEN TERMINAL POSITIONS ({positions.length})
                </span>
              </div>
              <span className="text-[10px] text-rose-300 bg-rose-950/40 border border-rose-900/40 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                <Lock className="w-3 h-3 text-rose-400" />
                READ-ONLY TELEMETRY
              </span>
            </div>

            {positions.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs">
                No open positions detected on the connected MT5 terminal.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#16212b] text-[10px] text-gray-400 uppercase">
                      <th className="pb-2">Ticket</th>
                      <th className="pb-2">Symbol</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2">Volume</th>
                      <th className="pb-2">Open Price</th>
                      <th className="pb-2">Current</th>
                      <th className="pb-2">SL / TP</th>
                      <th className="pb-2 text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#121b22]">
                    {positions.map((p) => (
                      <tr key={p.id} className="hover:bg-[#0e141a]">
                        <td className="py-2.5 text-gray-400">{p.ticket}</td>
                        <td className="py-2.5 font-bold text-white">{p.symbol}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              p.type === 'BUY'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-rose-950 text-rose-300 border border-rose-800'
                            }`}
                          >
                            {p.type}
                          </span>
                        </td>
                        <td className="py-2.5 text-gray-300">{p.volume.toFixed(2)} lots</td>
                        <td className="py-2.5 text-gray-300">{p.openPrice}</td>
                        <td className="py-2.5 text-white font-semibold">{p.currentPrice}</td>
                        <td className="py-2.5 text-gray-400 text-[10px]">
                          {p.sl || '-'} / {p.tp || '-'}
                        </td>
                        <td
                          className={`py-2.5 text-right font-bold ${
                            p.profit >= 0 ? 'text-[#c6f135]' : 'text-rose-400'
                          }`}
                        >
                          {p.profit >= 0 ? `+$${p.profit.toFixed(2)}` : `-$${Math.abs(p.profit).toFixed(2)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : activeProvider ? (
        /* Stub / Architecture-Ready Provider Card */
        <div className="bg-[#0a0e12] border border-[#18232e] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#18232e]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#141d26] border border-[#233140] text-gray-400">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">{activeProvider.name}</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">{activeProvider.statusMessage}</p>
              </div>
            </div>
            {getStatusBadge(activeProvider.status)}
          </div>

          <div className="bg-[#080d11] border border-[#162029] rounded-lg p-4 space-y-3 text-xs">
            <div className="font-bold text-gray-300 text-xs uppercase tracking-wider">
              Normalized Capability Matrix
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
              {Object.entries(activeProvider.capabilities).map(([cap, enabled]) => (
                <div key={cap} className="flex items-center gap-2 p-2 rounded bg-[#0e141a] border border-[#17222c]">
                  {enabled ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#c6f135]" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-gray-600" />
                  )}
                  <span className={enabled ? 'text-gray-200' : 'text-gray-500'}>
                    {cap.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 rounded bg-[#0d141a] border border-[#1b2a37] text-[11px] text-gray-300 space-y-1 mt-2">
              <span className="font-bold text-[#00f5ff]">Architectural Isolation:</span>
              <p className="text-gray-400 leading-relaxed">
                This provider adheres to the normalized <code>ITradingOSProvider</code> interface.
                When this connector is activated in future milestones, the Strategy Builder, Rule Engine, and Risk Pipeline will consume its data without requiring any changes to core logic.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Bridge Setup Guide Modal */}
      <BridgeSetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        bridgeUrl={bridgeUrl}
      />
    </div>
  );
};
