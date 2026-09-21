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
  Key,
  Globe,
  TrendingUp,
  Server,
  Layers,
  ChevronDown,
  Info,
} from 'lucide-react';
import {
  ProviderSummary,
  NormalizedAccount,
  NormalizedPosition,
  ConnectionDiagnosticsReport,
} from '../../types/connectivity';
import { api } from '../../lib/api';
import { derivBrowserClient, DerivLiveTick } from '../../lib/derivClient';

interface DerivProviderViewProps {
  provider: ProviderSummary;
  onRefresh: () => Promise<void>;
  onNotify: (msg: string) => void;
}

export const DerivProviderView: React.FC<DerivProviderViewProps> = ({
  provider,
  onRefresh,
  onNotify,
}) => {
  const [account, setAccount] = useState<NormalizedAccount | null>(provider.account || null);
  const [positions, setPositions] = useState<NormalizedPosition[]>([]);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagReport, setDiagReport] = useState<ConnectionDiagnosticsReport | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('R_100');
  const [liveTick, setLiveTick] = useState<DerivLiveTick | null>(null);
  const [browserWsStatus, setBrowserWsStatus] = useState<string>('DISCONNECTED');
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showSetupGuidance, setShowSetupGuidance] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [customAppId, setCustomAppId] = useState(provider.config.appId || '1089');
  const [isSubmittingToken, setIsSubmittingToken] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [copiedUri, setCopiedUri] = useState(false);

  // Sync account when provider updates
  useEffect(() => {
    if (provider.account) {
      setAccount(provider.account);
    }
  }, [provider.account]);

  // Handle URL query parameters on return from OAuth (e.g. mobile Safari same-tab redirects)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get('oauth_success');
    const oauthErr = params.get('oauth_error');

    if (oauthSuccess) {
      setOauthError(null);
      onNotify('Deriv DEMO account connected successfully!');
      onRefresh();
      fetchPositions();
      // Clean query parameters from URL without reloading page
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    } else if (oauthErr) {
      const decodedErr = decodeURIComponent(oauthErr);
      setOauthError(decodedErr);
      onNotify(`Deriv OAuth notice: ${decodedErr}`);
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  // Listen for OAuth postMessage callbacks from popup
  useEffect(() => {
    const handleAuthMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'DERIV_AUTH_SUCCESS') {
        setOauthError(null);
        onNotify('Deriv DEMO account authenticated successfully!');
        await onRefresh();
        fetchPositions();
      } else if (event.data && event.data.type === 'DERIV_AUTH_ERROR') {
        const errorMsg = event.data.error || 'Authentication failed';
        setOauthError(errorMsg);
        onNotify(`Deriv OAuth failed: ${errorMsg}`);
      }
    };
    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, []);

  // Browser Direct WebSocket for real-time market data
  useEffect(() => {
    const unsubStatus = derivBrowserClient.subscribeStatus((status) => {
      setBrowserWsStatus(status);
    });

    derivBrowserClient.connect().catch(() => {});

    return () => {
      unsubStatus();
    };
  }, []);

  // Subscribe to live ticks for selected symbol
  useEffect(() => {
    let lastQuote = 0;
    const unsubTick = derivBrowserClient.subscribeTick(selectedSymbol, (tick) => {
      setLiveTick(tick);
      if (lastQuote > 0) {
        if (tick.quote > lastQuote) {
          setPriceFlash('up');
        } else if (tick.quote < lastQuote) {
          setPriceFlash('down');
        }
        setTimeout(() => setPriceFlash(null), 400);
      }
      lastQuote = tick.quote;
    });

    return () => {
      unsubTick();
    };
  }, [selectedSymbol]);

  const fetchPositions = async () => {
    try {
      const pos = await api.getProviderPositions(provider.id);
      setPositions(pos || []);
    } catch (e) {
      console.error('Failed to fetch Deriv positions:', e);
    }
  };

  const handleRunDiagnostics = async () => {
    setIsDiagnosing(true);
    try {
      const report = await api.testProvider(provider.id);
      setDiagReport(report);
      if (report.overallStatus === 'SUCCESS' || report.overallStatus === 'WARNING') {
        try {
          const acc = await api.getProviderAccount(provider.id);
          setAccount(acc);
          await fetchPositions();
        } catch {}
      }
    } catch (err: any) {
      onNotify(`Diagnostics failed: ${err.message}`);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleConnectOAuth = async () => {
    setOauthError(null);
    try {
      onNotify('Initiating Deriv OAuth 2.0 PKCE flow...');
      const clientRedirectUri = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/deriv/callback`
        : undefined;

      const { authUrl } = await api.getDerivAuthUrl(clientRedirectUri);

      // On mobile (e.g. iPhone Safari), directly navigate to prevent popup blocking
      const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = authUrl;
        return;
      }

      // Open Deriv official authorization window directly
      const width = 560;
      const height = 720;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        'DerivOAuthLogin',
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // If popup was blocked by browser, redirect directly
        window.location.href = authUrl;
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to start OAuth flow';
      setOauthError(msg);
      onNotify(`OAuth Error: ${msg}`);
    }
  };

  const handleManualTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;

    setIsSubmittingToken(true);
    try {
      const result = await api.connectDerivWithToken(manualToken.trim());
      setAccount(result.account);
      onNotify('Connected to Deriv DEMO account via API Token.');
      setShowTokenModal(false);
      setManualToken('');
      await onRefresh();
      await fetchPositions();
    } catch (err: any) {
      onNotify(`Token connection error: ${err.message}`);
    } finally {
      setIsSubmittingToken(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await api.disconnectProvider(provider.id);
      setAccount(null);
      setPositions([]);
      setDiagReport(null);
      onNotify('Disconnected from Deriv Demo account.');
      await onRefresh();
    } catch (err: any) {
      onNotify(`Disconnect failed: ${err.message}`);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const isConnected = provider.status === 'CONNECTED' && !!account;
  const isDemo = account?.accountEnvironment === 'DEMO' || account?.server?.toLowerCase().includes('demo') || account?.loginMasked?.startsWith('VRT');

  const symbolsList = [
    { id: 'R_100', name: 'Volatility 100 Index', category: 'Synthetics' },
    { id: 'R_75', name: 'Volatility 75 Index', category: 'Synthetics' },
    { id: 'R_50', name: 'Volatility 50 Index', category: 'Synthetics' },
    { id: 'R_25', name: 'Volatility 25 Index', category: 'Synthetics' },
    { id: 'R_10', name: 'Volatility 10 Index', category: 'Synthetics' },
    { id: '1HZ100V', name: 'Volatility 100 (1s)', category: 'Synthetics' },
    { id: 'frxEURUSD', name: 'EUR/USD Forex', category: 'Forex' },
    { id: 'frxGBPUSD', name: 'GBP/USD Forex', category: 'Forex' },
    { id: 'cryBTCUSD', name: 'BTC/USD Crypto', category: 'Crypto' },
    { id: 'CRASH500', name: 'Crash 500 Index', category: 'Crash/Boom' },
    { id: 'BOOM500', name: 'Boom 500 Index', category: 'Crash/Boom' },
  ];

  return (
    <div className="space-y-4">
      {/* Deriv Demo Master Status Card */}
      <div className="p-4 rounded-lg bg-[#0d141a] border border-[#1b2b36] shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#16222c] pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#141f27] border border-[#223340] flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-[#c6f135]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-bold text-sm tracking-wide">DERIV DEMO CONNECTIVITY</span>
                {isDemo ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    DEMO ENVIRONMENT VERIFIED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                    DERIV DEMO READY
                  </span>
                )}
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  READ-ONLY SAFEGUARD ACTIVE
                </span>
              </div>
              <p className="text-gray-400 text-xs mt-0.5">
                OAuth 2.0 PKCE • WebSocket v3 • Virtual Demo Account Telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isConnected ? (
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition-all flex items-center gap-1.5"
              >
                {isDisconnecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Disconnect
              </button>
            ) : (
              <>
                <button
                  onClick={handleConnectOAuth}
                  className="px-3.5 py-1.5 rounded text-xs font-bold bg-[#c6f135] text-black hover:bg-[#b8e22e] transition-all flex items-center gap-1.5 shadow-md shadow-[#c6f135]/10"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Connect Deriv Demo
                </button>
                <button
                  onClick={() => setShowTokenModal(true)}
                  className="px-2.5 py-1.5 rounded text-xs font-semibold bg-[#16222c] text-gray-300 border border-[#233444] hover:bg-[#1e2d3b] transition-all flex items-center gap-1"
                  title="Connect using Demo API Token"
                >
                  <Key className="w-3.5 h-3.5" />
                  Token
                </button>
              </>
            )}

            <button
              onClick={handleRunDiagnostics}
              disabled={isDiagnosing}
              className="px-3 py-1.5 rounded text-xs font-semibold bg-[#111922] text-gray-200 border border-[#1f2f3d] hover:bg-[#17222c] transition-all flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isDiagnosing ? 'animate-spin text-[#c6f135]' : ''}`} />
              Test Probe
            </button>
          </div>
        </div>

        {/* Account Data Display */}
        {isConnected && account ? (
          <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-2.5 rounded bg-[#090d10] border border-[#152028]">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">ACCOUNT (DEMO)</span>
              <span className="text-sm font-bold text-white mt-0.5 block truncate">
                {account.loginMasked}
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3" /> Virtual Account
              </span>
            </div>

            <div className="p-2.5 rounded bg-[#090d10] border border-[#152028]">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">DEMO BALANCE</span>
              <span className="text-sm font-bold text-[#c6f135] mt-0.5 block">
                ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                <span className="text-xs text-gray-400 font-normal">{account.currency}</span>
              </span>
              <span className="text-[10px] text-gray-400 mt-0.5 block">
                Equity: ${account.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-2.5 rounded bg-[#090d10] border border-[#152028]">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">SERVER / BROKER</span>
              <span className="text-xs font-bold text-gray-200 mt-0.5 block truncate">
                {account.server}
              </span>
              <span className="text-[10px] text-gray-400 mt-0.5 block truncate">
                {account.broker}
              </span>
            </div>

            <div className="p-2.5 rounded bg-[#090d10] border border-[#152028]">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">EXECUTION STATUS</span>
              <span className="text-xs font-bold text-rose-400 mt-0.5 flex items-center gap-1">
                <Lock className="w-3 h-3" /> BLOCKED (READ-ONLY)
              </span>
              <span className="text-[10px] text-gray-500 mt-0.5 block">
                Safe Observation Mode
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-3.5 p-3 rounded bg-[#090d10] border border-[#16222c] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">Deriv Demo Account Awaiting Authentication</span>
                <span className="text-gray-400 text-[11px] leading-relaxed">
                  Authenticate using Deriv’s OAuth 2.0 PKCE flow with read-only permissions, or connect directly using a Deriv Demo API Token.
                </span>
              </div>
            </div>
            <button
              onClick={handleConnectOAuth}
              className="px-3 py-1 rounded bg-[#c6f135]/15 text-[#c6f135] border border-[#c6f135]/30 text-xs font-semibold hover:bg-[#c6f135]/25 whitespace-nowrap self-start sm:self-auto"
            >
              Start OAuth Login
            </button>
          </div>
        )}
      </div>

      {/* Diagnostics Report (if run) */}
      {diagReport && (
        <div className="p-4 rounded-lg bg-[#0d141a] border border-[#1c2c38] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#c6f135]" />
              <span className="font-bold text-xs text-white">DERIV CONNECTION DIAGNOSTICS PROBE</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                diagReport.overallStatus === 'SUCCESS'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : diagReport.overallStatus === 'WARNING'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              {diagReport.overallStatus}
            </span>
          </div>

          <div className="space-y-1.5">
            {diagReport.steps.map((step) => (
              <div
                key={step.id}
                className="p-2.5 rounded bg-[#090d10] border border-[#16222b] flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2">
                  {step.status === 'PASS' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : step.status === 'WARNING' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  ) : step.status === 'SKIPPED' ? (
                    <Info className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold text-gray-200 block">{step.name}</span>
                    <span className="text-[11px] text-gray-400">{step.message}</span>
                    {step.errorDetails && (
                      <span className="text-[10px] text-rose-400 block mt-0.5">{step.errorDetails}</span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-gray-500 uppercase shrink-0">
                  {step.status}
                </span>
              </div>
            ))}
          </div>

          <div className="p-2.5 rounded bg-[#0a1015] border border-[#152028] text-[11px] text-gray-400 leading-relaxed">
            {diagReport.summary}
          </div>
        </div>
      )}

      {/* Real-time Market Data & Live Tick Streamer */}
      <div className="p-4 rounded-lg bg-[#0d141a] border border-[#1b2b36] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#16222c] pb-2.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#00f5ff]" />
            <span className="font-bold text-xs text-white uppercase tracking-wider">
              REAL-TIME DERIV MARKET DATA STREAM
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
              WS: {browserWsStatus}
            </span>
          </div>

          {/* Symbol Quick Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {symbolsList.slice(0, 5).map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSymbol(s.id)}
                className={`px-2 py-1 rounded text-[11px] font-mono whitespace-nowrap transition-all ${
                  selectedSymbol === s.id
                    ? 'bg-[#c6f135] text-black font-bold'
                    : 'bg-[#121a22] text-gray-300 border border-[#1e2b37] hover:bg-[#182430]'
                }`}
              >
                {s.id}
              </button>
            ))}
          </div>
        </div>

        {/* Live Quote Banner */}
        <div className="p-3.5 rounded-lg bg-[#080c0f] border border-[#16232d] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-[#111921] border border-[#1e2b36] flex items-center justify-center font-bold text-xs text-[#c6f135]">
              {selectedSymbol.substring(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm">{selectedSymbol}</span>
                <span className="text-gray-400 text-xs">
                  {symbolsList.find((s) => s.id === selectedSymbol)?.name || 'Deriv Instrument'}
                </span>
              </div>
              <span className="text-[10px] text-gray-500 block">
                Last update: {liveTick?.timeFormatted || 'Streaming active'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">SPOT TICK</span>
              <span
                className={`text-lg font-bold font-mono transition-colors ${
                  priceFlash === 'up'
                    ? 'text-emerald-400 bg-emerald-500/10 px-1 rounded'
                    : priceFlash === 'down'
                    ? 'text-rose-400 bg-rose-500/10 px-1 rounded'
                    : 'text-[#c6f135]'
                }`}
              >
                {liveTick?.quote?.toFixed(4) || '—'}
              </span>
            </div>

            <div className="text-right border-l border-[#192531] pl-3">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">BID / ASK</span>
              <span className="text-xs font-mono text-gray-200 block">
                {liveTick?.bid?.toFixed(4) || '—'} / {liveTick?.ask?.toFixed(4) || '—'}
              </span>
              <span className="text-[10px] text-gray-500 block">
                Spread: {liveTick?.spread?.toFixed(4) || '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Open Positions Table */}
      <div className="p-4 rounded-lg bg-[#0d141a] border border-[#1b2b36] space-y-3">
        <div className="flex items-center justify-between border-b border-[#16222c] pb-2.5">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#c6f135]" />
            <span className="font-bold text-xs text-white uppercase tracking-wider">
              DERIV DEMO OPEN POSITIONS
            </span>
            <span className="text-[10px] px-2 py-0.2 rounded bg-[#16222c] text-gray-400 border border-[#233444]">
              {positions.length} ACTIVE
            </span>
          </div>

          <span className="text-[10px] text-rose-400 font-semibold flex items-center gap-1">
            <Lock className="w-3 h-3" /> Position Modifications Prohibited
          </span>
        </div>

        {positions.length === 0 ? (
          <div className="p-6 rounded-lg bg-[#090d10] border border-[#152028] text-center space-y-1.5">
            <Shield className="w-6 h-6 text-gray-600 mx-auto" />
            <span className="text-xs font-bold text-gray-300 block uppercase tracking-wider">
              NO OPEN POSITIONS
            </span>
            <p className="text-[11px] text-gray-500 max-w-md mx-auto leading-relaxed">
              Your Deriv Demo account currently has 0 open contracts. Under Milestone 2A guidelines, this connection is read-only and no new orders can be opened.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left">
              <thead>
                <tr className="border-b border-[#1b2834] text-gray-400 text-[10px] uppercase">
                  <th className="pb-2">TICKET</th>
                  <th className="pb-2">SYMBOL</th>
                  <th className="pb-2">TYPE</th>
                  <th className="pb-2 text-right">BUY PRICE</th>
                  <th className="pb-2 text-right">CURRENT SPOT</th>
                  <th className="pb-2 text-right">PROFIT</th>
                  <th className="pb-2 text-center">MODE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#152028]">
                {positions.map((p) => (
                  <tr key={p.id} className="hover:bg-[#111922] transition-colors">
                    <td className="py-2.5 font-bold text-gray-300">#{p.ticket}</td>
                    <td className="py-2.5 font-bold text-white">{p.symbol}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          p.type === 'BUY'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {p.type}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-gray-200">{p.openPrice.toFixed(4)}</td>
                    <td className="py-2.5 text-right text-gray-200">{p.currentPrice.toFixed(4)}</td>
                    <td
                      className={`py-2.5 text-right font-bold ${
                        p.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      ${p.profit.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#1a2530] text-gray-400 border border-[#243342]">
                        READ-ONLY
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual API Token Connection Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e141a] border border-[#1e2f3d] rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl font-mono">
            <div className="flex items-center justify-between border-b border-[#1b2a36] pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[#c6f135]" />
                <span className="font-bold text-sm text-white">Connect Deriv Demo API Token</span>
              </div>
              <button
                onClick={() => setShowTokenModal(false)}
                className="text-gray-400 hover:text-white text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualTokenSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-400 mb-1 text-[11px]">
                  DERIV DEMO API TOKEN (Read Scope Only)
                </label>
                <input
                  type="password"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Paste your Deriv Demo API token..."
                  className="w-full px-3 py-2 rounded bg-[#070b0e] border border-[#1b2b38] text-white focus:outline-none focus:border-[#c6f135] text-xs"
                  required
                />
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Generate in Deriv: Settings → API Token → Check only "Read" scope.
                </span>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 text-[11px]">
                  DERIV APP ID (Optional)
                </label>
                <input
                  type="text"
                  value={customAppId}
                  onChange={(e) => setCustomAppId(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#070b0e] border border-[#1b2b38] text-white focus:outline-none focus:border-[#c6f135] text-xs"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Default is 1089 for public demo testing.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTokenModal(false)}
                  className="px-3 py-1.5 rounded bg-[#141d24] text-gray-300 border border-[#21303d] hover:bg-[#1a252f]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingToken || !manualToken.trim()}
                  className="px-4 py-1.5 rounded bg-[#c6f135] text-black font-bold hover:bg-[#b8e22e] disabled:opacity-50"
                >
                  {isSubmittingToken ? 'Verifying...' : 'Connect Demo Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
