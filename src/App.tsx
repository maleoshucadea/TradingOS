import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';

import { DashboardView } from './components/dashboard/DashboardView';
import { StrategyBuilderView } from './components/strategy/StrategyBuilderView';
import { MarketsView } from './components/markets/MarketsView';
import { FundamentalsView } from './components/fundamentals/FundamentalsView';
import { TechnicalAnalysisView } from './components/technical/TechnicalAnalysisView';
import { RiskManagementView } from './components/risk/RiskManagementView';
import { TradesView } from './components/trades/TradesView';
import { JournalView } from './components/journal/JournalView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SettingsView } from './components/settings/SettingsView';
import { ConnectionsView } from './components/connectivity/ConnectionsView';

import {
  ActiveNavModule,
  AppMode,
  Strategy,
  InstrumentQuote,
  MarketSessionInfo,
  TradeDecision,
  JournalEntry,
  AnalyticsSummary,
} from './types';
import { api } from './lib/api';
import {
  INITIAL_STRATEGIES,
  INITIAL_RULES,
  INITIAL_INSTRUMENTS,
  INITIAL_SESSIONS,
  INITIAL_DECISIONS,
  INITIAL_JOURNAL,
  INITIAL_ANALYTICS,
} from './data/initialData';

export default function App() {
  const [activeModule, setActiveModule] = useState<ActiveNavModule>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mod = params.get('module') as ActiveNavModule;
      const validModules: ActiveNavModule[] = [
        'dashboard',
        'strategy-builder',
        'markets',
        'fundamentals',
        'technical-analysis',
        'risk-management',
        'trades',
        'journal',
        'analytics',
        'settings',
        'connectivity',
      ];
      if (mod && validModules.includes(mod)) {
        return mod;
      }
      if (window.location.pathname.includes('/broker') || window.location.pathname.includes('/connectivity') || params.has('oauth_success') || params.has('oauth_error')) {
        return 'connectivity';
      }
    }
    return 'strategy-builder';
  });
  const [mode, setMode] = useState<AppMode>('ANALYSIS');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Data states
  const [strategies, setStrategies] = useState<Strategy[]>(INITIAL_STRATEGIES);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(
    INITIAL_STRATEGIES[0]?.id || null
  );
  const [instruments, setInstruments] = useState<InstrumentQuote[]>(INITIAL_INSTRUMENTS);
  const [sessions, setSessions] = useState<MarketSessionInfo[]>(INITIAL_SESSIONS);
  const [decisions, setDecisions] = useState<TradeDecision[]>(INITIAL_DECISIONS);
  const [journal, setJournal] = useState<JournalEntry[]>(INITIAL_JOURNAL);
  const [analytics, setAnalytics] = useState<Record<'DEMO' | 'BACKTEST' | 'LIVE', AnalyticsSummary>>(
    INITIAL_ANALYTICS
  );

  // Online / offline listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch initial data from API
  const refreshAllData = async () => {
    try {
      const [strats, mkts, sess, decs, jrnl, anlt] = await Promise.all([
        api.getStrategies(),
        api.getMarkets(),
        api.getSessions(),
        api.getDecisions(),
        api.getJournal(),
        api.getAnalytics(),
      ]);
      setStrategies(strats);
      if (!selectedStrategyId && strats.length > 0) {
        setSelectedStrategyId(strats[0].id);
      }
      setInstruments(mkts);
      setSessions(sess);
      setDecisions(decs);
      setJournal(jrnl);
      setAnalytics(anlt);
    } catch (err) {
      console.warn('API sync fallback active', err);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  const handleResetData = () => {
    localStorage.clear();
    setStrategies(INITIAL_STRATEGIES);
    setSelectedStrategyId(INITIAL_STRATEGIES[0].id);
    setJournal(INITIAL_JOURNAL);
    setDecisions(INITIAL_DECISIONS);
    refreshAllData();
  };

  return (
    <div className="min-h-[100dvh] bg-[#070a0c] text-gray-100 flex flex-col font-sans selection:bg-[#c6f135] selection:text-black">
      {/* Top Bar Header */}
      <Header
        mode={mode}
        onModeChange={setMode}
        sessions={sessions}
        isOnline={isOnline}
      />

      {/* Main App Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto overflow-hidden">
        {/* Desktop Sidebar Navigation */}
        <Sidebar
          activeModule={activeModule}
          onSelectModule={setActiveModule}
          strategyCount={strategies.length}
        />

        {/* Content View Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 h-[calc(100dvh-50px)] pb-24 lg:pb-8">
          {activeModule === 'dashboard' && (
            <DashboardView
              strategies={strategies}
              instruments={instruments}
              decisions={decisions}
              journal={journal}
              analytics={analytics}
              mode={mode}
              onNavigate={setActiveModule}
              onSelectStrategy={(id) => {
                setSelectedStrategyId(id);
                setActiveModule('strategy-builder');
              }}
            />
          )}

          {activeModule === 'connectivity' && <ConnectionsView />}

          {activeModule === 'strategy-builder' && (
            <StrategyBuilderView
              strategies={strategies}
              selectedStrategyId={selectedStrategyId}
              onSelectStrategy={setSelectedStrategyId}
              onRefreshStrategies={refreshAllData}
            />
          )}

          {activeModule === 'markets' && (
            <MarketsView
              instruments={instruments}
              sessions={sessions}
              onSelectMarketForStrategy={(symbol) => {
                const found = strategies.find((s) => s.market === symbol);
                if (found) {
                  setSelectedStrategyId(found.id);
                  setActiveModule('strategy-builder');
                }
              }}
            />
          )}

          {activeModule === 'fundamentals' && <FundamentalsView />}

          {activeModule === 'technical-analysis' && <TechnicalAnalysisView />}

          {activeModule === 'risk-management' && <RiskManagementView />}

          {activeModule === 'trades' && <TradesView decisions={decisions} />}

          {activeModule === 'journal' && (
            <JournalView entries={journal} onRefresh={refreshAllData} />
          )}

          {activeModule === 'analytics' && (
            <AnalyticsView analytics={analytics} currentMode={mode} />
          )}

          {activeModule === 'settings' && (
            <SettingsView
              onResetData={handleResetData}
              onNavigate={setActiveModule}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        strategyCount={strategies.length}
      />
    </div>
  );
}
