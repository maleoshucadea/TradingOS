import React, { useState, useEffect } from 'react';
import {
  Shield,
  Zap,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Activity,
  Globe,
  TrendingUp,
  Server,
  Layers,
  ChevronDown,
  Copy,
  Check,
  Radio,
  Sliders,
} from 'lucide-react';
import {
  ProviderSummary,
  NormalizedAccount,
  NormalizedPosition,
  ConnectionDiagnosticsReport,
  CTraderAccountOption,
} from '../../types/connectivity';
import { api } from '../../lib/api';

interface CTraderProviderViewProps {
  provider: ProviderSummary;
  onRefresh: () => Promise<void>;
  onNotify: (msg: string) => void;
}

export const CTraderProviderView: React.FC<CTraderProviderViewProps> = ({
  provider,
  onRefresh,
  onNotify,
}) => {
  const [account, setAccount] = useState<NormalizedAccount | null>(provider.account || null);
  const [positions, setPositions] = useState<NormalizedPosition[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<CTraderAccountOption[]>(
    provider.availableAccounts || []
  );
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>(
    provider.selectedAccountId
  );
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagReport, setDiagReport] = useState<ConnectionDiagnosticsReport | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [copiedUri, setCopiedUri] = useState(false);
  const [showConfigHelp, setShowConfigHelp] = useState(false);

  // Sync account and available accounts when provider updates
  useEffect(() => {
    if (provider.account) {
      setAccount(provider.account);
    }
    if (provider.availableAccounts && provider.availableAccounts.length > 0) {
      setAvailableAccounts(provider.availableAccounts);
    }
    if (provider.selectedAccountId) {
      setSelectedAccountId(provider.selectedAccountId);
    }
  }, [provider]);

  // Load live positions if connected
  const fetchPositions = async () => {
    if (provider.status === 'CONNECTED' || account) {
      try {
        const pos = await api.getProviderPositions(provider.id);
        setPositions(pos);
      } catch (e) {
        console.error('Failed to fetch cTrader positions:', e);
      }
    }
  };

  useEffect(() => {
    fetchPositions();
  }, [provider.status, account]);

  // Handle URL query parameters when returning from OAuth redirect
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get('oauth_success');
    const oauthErr = params.get('oauth_error');

    if (oauthSuccess) {
      setOauthError(null);
      onNotify('cTrader account linked successfully! Read-only session active.');
      onRefresh();
      fetchPositions();

      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    } else if (oauthErr) {
      const decodedErr = decodeURIComponent(oauthErr);
      setOauthError(decodedErr);
      onNotify(`cTrader OAuth Error: ${decodedErr}`);

      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  // Listen to postMessage events from OAuth popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;

      if (event.data.type === 'CTRADER_AUTH_SUCCESS') {
        setIsConnecting(false);
        setOauthError(null);
        if (event.data.account) {
          setAccount(event.data.account);
        }
        if (event.data.availableAccounts) {
          setAvailableAccounts(event.data.availableAccounts);
        }
        onNotify('cTrader DEMO connected successfully!');
        onRefresh();
        fetchPositions();
      } else if (event.data.type === 'CTRADER_AUTH_ERROR') {
        setIsConnecting(false);
        const err = event.data.error || 'Authentication failed';
        setOauthError(err);
        onNotify(`cTrader connection error: ${err}`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Initiate official cTrader OAuth flow
  const handleConnectCTrader = async () => {
    setIsConnecting(true);
    setOauthError(null);

    try {
      const targetRedirect = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/ctrader/callback`
        : undefined;

      const { authUrl } = await api.getCTraderAuthUrl(targetRedirect);

      const width = 600;
      const height = 750;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        'ctrader_oauth',
        `width=${width},height=${height},left=${left},top=${top},status=yes,scrollbars=yes`
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // Fallback to same-window navigation if popup is blocked by browser
        window.location.href = authUrl;
      }
    } catch (err: any) {
      setIsConnecting(false);
      setOauthError(err.message || 'Failed to initiate cTrader OAuth');
      onNotify(`Connection failed: ${err.message}`);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect active cTrader session? Live telemetry probe will stop.')) {
      return;
    }
    setIsDisconnecting(true);
    try {
      await api.disconnectCTrader();
      setAccount(null);
      setPositions([]);
      setAvailableAccounts([]);
      await onRefresh();
      onNotify('Disconnected from cTrader Open API.');
    } catch (err: any) {
      onNotify(`Disconnect error: ${err.message}`);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSwitchAccount = async (accountId: number) => {
    setIsSwitchingAccount(true);
    try {
      const res = await api.selectCTraderAccount(accountId);
      setSelectedAccountId(accountId);
      setAccount(res.account);
      onNotify(`Switched to cTrader Account #${accountId}`);
      await onRefresh();
      fetchPositions();
    } catch (err: any) {
      onNotify(`Failed to switch account: ${err.message}`);
    } finally {
      setIsSwitchingAccount(false);
    }
  };

  const runDiagnostics = async () => {
    setIsDiagnosing(true);
    try {
      const report = await api.testProvider(provider.id);
      setDiagReport(report);
      if (report.overallStatus === 'SUCCESS') {
        await onRefresh();
        fetchPositions();
      }
    } catch (err: any) {
      console.error('Diagnostics probe error:', err);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const copyRedirectUri = () => {
    const uri = provider.config.redirectUri || `${window.location.origin}/auth/ctrader/callback`;
    navigator.clipboard.writeText(uri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
    onNotify('Redirect URI copied to clipboard');
  };

  const isConnected = provider.status === 'CONNECTED';
  const hasCredentials = Boolean(provider.config.hasClientId && provider.config.hasClientSecret);
  const effectiveRedirectUri = provider.config.redirectUri || `${typeof window !== 'undefined' ? window.location.origin : 'https://tradingos-1.onrender.com'}/auth/ctrader/callback`;

  return (
    <div className="space-y-4">
      {/* Primary cTrader Hero / Connection Card */}
      <div className="bg-[#0a0e12] border border-[#18232e] rounded-xl p-4 sm:p-5 space-y-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#18232e]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#141d26] border border-[#233140] text-[#c6f135]">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide">{provider.name}</h2>
                {isConnected ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#c6f135]/15 text-[#c6f135] border border-[#c6f135]/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c6f135] animate-pulse" />
                    CONNECTED (DEMO)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    {provider.status}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">{provider.statusMessage}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isConnected ? (
              <button
                onClick={handleConnectCTrader}
                disabled={isConnecting}
                className="px-4 py-2 rounded-lg bg-[#c6f135] text-black font-bold text-xs hover:bg-[#d8ff43] transition-all flex items-center gap-2 shadow-md disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting to cTrader...</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Connect cTrader Account</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="px-3 py-1.5 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-800 text-xs font-semibold hover:bg-rose-900 transition-colors flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            )}

            <button
              onClick={runDiagnostics}
              disabled={isDiagnosing}
              className="px-3 py-2 rounded-lg bg-[#141e27] border border-[#233242] text-gray-300 hover:text-white hover:bg-[#1a2733] text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Activity className={`w-3.5 h-3.5 ${isDiagnosing ? 'animate-spin text-[#c6f135]' : 'text-gray-400'}`} />
              <span>{isDiagnosing ? 'Probing...' : 'Diagnostic Probe'}</span>
            </button>
          </div>
        </div>

        {/* OAuth Error Alert */}
        {oauthError && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="font-bold text-white">OAuth Authorization Error</div>
              <p className="text-[11px] text-rose-200/90">{oauthError}</p>
            </div>
            <button
              onClick={() => setOauthError(null)}
              className="text-gray-400 hover:text-white text-xs ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Account Switcher Bar (If multiple accounts linked to cTrader ID) */}
        {availableAccounts.length > 1 && (
          <div className="p-3 rounded-lg bg-[#0e151c] border border-[#1b2734] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#c6f135]" />
                Select Linked cTrader Account ({availableAccounts.length} available)
              </span>
              {isSwitchingAccount && (
                <span className="text-[10px] text-[#c6f135] flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Synchronizing...
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {availableAccounts.map((acc) => {
                const isCurrent = acc.ctidTraderAccountId === selectedAccountId;
                return (
                  <button
                    key={acc.ctidTraderAccountId}
                    onClick={() => handleSwitchAccount(acc.ctidTraderAccountId)}
                    disabled={isSwitchingAccount || isCurrent}
                    className={`px-3 py-1.5 rounded text-xs flex items-center gap-2 border transition-all ${
                      isCurrent
                        ? 'bg-[#c6f135]/15 border-[#c6f135] text-white font-bold'
                        : 'bg-[#121a22] border-[#22313f] text-gray-400 hover:text-white hover:border-[#324559]'
                    }`}
                  >
                    <span>Account #{acc.ctidTraderAccountId}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                        !acc.isLive
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {!acc.isLive ? 'DEMO' : 'LIVE'}
                    </span>
                    {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-[#c6f135]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Connected Account Telemetry Dashboard */}
        {account && isConnected ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-lg bg-[#0e151c] border border-[#1b2734]">
                <div className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider">
                  Account Balance
                </div>
                <div className="text-lg font-bold text-white mt-1">
                  ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  Currency: <span className="text-gray-200 font-semibold">{account.currency}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0e151c] border border-[#1b2734]">
                <div className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider">
                  Account Equity
                </div>
                <div className="text-lg font-bold text-[#c6f135] mt-1">
                  ${account.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  Free Margin: ${(account.freeMargin || account.balance).toFixed(2)}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0e151c] border border-[#1b2734]">
                <div className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider">
                  Environment
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-[#c6f135]" />
                  <span className="text-sm font-bold text-white">
                    {account.accountEnvironment || 'DEMO'}
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5 truncate">
                  {account.server || 'cTrader Demo Server'}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0e151c] border border-[#1b2734]">
                <div className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider">
                  Execution Safety
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-xs font-bold text-rose-300">READ-ONLY LOCKED</span>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  Orders physically disabled
                </div>
              </div>
            </div>

            {/* Account Metadata Row */}
            <div className="p-3 rounded-lg bg-[#0a1016] border border-[#16222e] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-gray-500">Account ID:</span>{' '}
                  <span className="font-bold text-gray-200">{account.loginMasked}</span>
                </div>
                <div>
                  <span className="text-gray-500">Broker:</span>{' '}
                  <span className="font-bold text-gray-200">{account.broker}</span>
                </div>
                <div>
                  <span className="text-gray-500">Leverage:</span>{' '}
                  <span className="font-bold text-gray-200">1:{account.leverage || 100}</span>
                </div>
              </div>
              <div className="text-[11px] text-gray-500">
                Last Telemetry Sync:{' '}
                <span className="text-gray-300">
                  {new Date(account.updatedAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Unconnected Callout & Setup Instructions */
          <div className="p-4 rounded-lg bg-[#0c1218] border border-[#172330] space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#c6f135]" />
                  cTrader Open API Milestone 1: Read-Only Demo Connection
                </h3>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                  TradingOS connects directly to cTrader using official OAuth 2.0 authorization code exchange and Spotware JSON Open API gateways. All credentials and token exchanges are handled securely on the server.
                </p>
              </div>
              <button
                onClick={() => setShowConfigHelp(!showConfigHelp)}
                className="text-[11px] text-[#c6f135] hover:underline shrink-0"
              >
                {showConfigHelp ? 'Hide Setup Guide' : 'OAuth Configuration Guide'}
              </button>
            </div>

            {showConfigHelp && (
              <div className="p-3 rounded bg-[#070b0e] border border-[#17222c] space-y-2 text-xs text-gray-300">
                <div className="font-bold text-white">How to configure cTrader Open API in Render:</div>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-gray-400">
                  <li>
                    Log in to <a href="https://openapi.ctrader.com" target="_blank" rel="noopener noreferrer" className="text-[#c6f135] underline">Spotware cTrader Open API Portal</a>.
                  </li>
                  <li>
                    Create or open your application and register the exact Redirect URI:
                    <div className="flex items-center gap-2 mt-1 p-1.5 rounded bg-[#101720] border border-[#1d2a37]">
                      <code className="text-[10px] text-white flex-1 truncate">{effectiveRedirectUri}</code>
                      <button
                        onClick={copyRedirectUri}
                        className="px-2 py-0.5 rounded bg-[#1a2633] text-gray-300 hover:text-white text-[10px] flex items-center gap-1"
                      >
                        {copiedUri ? <Check className="w-3 h-3 text-[#c6f135]" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedUri ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </li>
                  <li>
                    In your Render Dashboard, add the environment variables:
                    <ul className="list-disc list-inside mt-1 ml-2 space-y-0.5 text-gray-300">
                      <li><code>CTRADER_CLIENT_ID</code></li>
                      <li><code>CTRADER_CLIENT_SECRET</code> (Kept server-side, never exposed to browser)</li>
                      <li><code>CTRADER_REDIRECT_URI</code> (Optional, defaults to Render domain callback)</li>
                    </ul>
                  </li>
                  <li>Click <strong>Connect cTrader Account</strong> to authenticate and link your demo account.</li>
                </ol>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Positions Table (Strictly Read-Only) */}
      <div className="bg-[#0a0e12] border border-[#18232e] rounded-xl p-4 space-y-3 shadow-lg">
        <div className="flex items-center justify-between pb-2 border-b border-[#18232e]">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#c6f135]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              cTrader Open Positions ({positions.length})
            </h3>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
              READ-ONLY
            </span>
          </div>
          <button
            onClick={fetchPositions}
            className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        {positions.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-500">
            {isConnected ? (
              <div>
                <p>No open positions found on this cTrader DEMO account.</p>
                <p className="text-[10px] text-gray-600 mt-1">Open positions in your cTrader demo terminal will automatically sync here.</p>
              </div>
            ) : (
              <div>
                <p>cTrader account not connected. Click "Connect cTrader Account" above.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#16212b] text-[10px] text-gray-400 uppercase">
                  <th className="pb-2">Ticket</th>
                  <th className="pb-2">Symbol</th>
                  <th className="pb-2">Side</th>
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

      {/* Diagnostics Report View (Rendered when testConnection is run) */}
      {diagReport && (
        <div className="bg-[#0a0e12] border border-[#18232e] rounded-xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-[#18232e]">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#c6f135]" />
              Diagnostic Probe Results
            </h3>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                diagReport.overallStatus === 'SUCCESS'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : diagReport.overallStatus === 'WARNING'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}
            >
              {diagReport.overallStatus}
            </span>
          </div>

          <div className="space-y-2">
            {diagReport.steps.map((step) => (
              <div
                key={step.id}
                className="p-2.5 rounded bg-[#0e141a] border border-[#17222c] flex items-start gap-2.5 text-xs"
              >
                {step.status === 'PASS' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#c6f135] shrink-0 mt-0.5" />
                ) : step.status === 'WARNING' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-0.5">
                  <div className="font-bold text-gray-200">{step.name}</div>
                  <div className="text-[11px] text-gray-400">{step.message}</div>
                  {step.errorDetails && (
                    <div className="text-[10px] text-rose-300 font-mono mt-1">
                      {step.errorDetails}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {diagReport.troubleshootingNotes && diagReport.troubleshootingNotes.length > 0 && (
            <div className="p-3 rounded bg-[#0d141b] border border-[#1b2734] space-y-1 text-xs">
              <div className="font-bold text-gray-300">Troubleshooting Guidance:</div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-gray-400">
                {diagReport.troubleshootingNotes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
