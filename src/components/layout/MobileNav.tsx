import React, { useState } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Sliders,
  ShieldCheck,
  Menu,
  X,
  Globe2,
  LineChart,
  CheckSquare,
  BookOpen,
  PieChart,
  Settings,
  Cable,
} from 'lucide-react';
import { ActiveNavModule } from '../../types';

interface MobileNavProps {
  activeModule: ActiveNavModule;
  onSelectModule: (module: ActiveNavModule) => void;
  strategyCount: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeModule,
  onSelectModule,
  strategyCount,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const mainTabs: { id: ActiveNavModule; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'markets', label: 'Markets', icon: TrendingUp },
    { id: 'strategy-builder', label: 'Strategy', icon: Sliders },
    { id: 'risk-management', label: 'Risk', icon: ShieldCheck },
  ];

  const secondaryModules: {
    id: ActiveNavModule;
    label: string;
    description: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { id: 'connectivity', label: 'Brokers & MT5', description: 'MetaTrader 5 bridge, diagnostics & telemetry', icon: Cable },
    { id: 'fundamentals', label: 'Fundamentals', description: 'Macro, central banks, CPI & calendar news', icon: Globe2 },
    { id: 'technical-analysis', label: 'Technical Analysis', description: 'Indicators, market structure & frameworks', icon: LineChart },
    { id: 'trades', label: 'Trade Decisions', description: 'Condition-validated trade candidates', icon: CheckSquare },
    { id: 'journal', label: 'Trade Journal', description: 'Trade logs, psychological discipline notes', icon: BookOpen },
    { id: 'analytics', label: 'Analytics & Quant', description: 'Win rate, profit factor & drawdown breakdown', icon: PieChart },
    { id: 'settings', label: 'Settings', description: 'Data providers, safety limits, PWA status', icon: Settings },
  ];

  const isSecondaryActive = secondaryModules.some((m) => m.id === activeModule);

  const handleSelect = (module: ActiveNavModule) => {
    onSelectModule(module);
    setShowMoreMenu(false);
  };

  return (
    <>
      {/* Mobile More Sheet / Drawer */}
      {showMoreMenu && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end"
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            className="bg-[#0e1317] border-t border-[#1d2730] rounded-t-2xl p-4 max-h-[75dvh] overflow-y-auto pb-safe shadow-2xl font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#1d2730]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#c6f135]" />
                <span className="text-xs font-bold text-white tracking-wider">ALL MODULES</span>
              </div>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1 rounded text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              {secondaryModules.map((item) => {
                const Icon = item.icon;
                const isItemActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                      isItemActive
                        ? 'bg-[#162028] border-[#c6f135]/50 text-white'
                        : 'bg-[#10161c] border-[#1d2730] text-gray-300 hover:bg-[#141c23]'
                    }`}
                  >
                    <div
                      className={`p-2 rounded ${
                        isItemActive ? 'bg-[#c6f135]/20 text-[#c6f135]' : 'bg-[#19232c] text-gray-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">{item.label}</div>
                      <div className="text-[10px] text-gray-400 leading-tight mt-0.5">
                        {item.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090c0e]/95 backdrop-blur-md border-t border-[#182026] px-2 py-1 pb-safe select-none">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeModule === tab.id;
            return (
              <button
                key={tab.id}
                id={`mobile-tab-${tab.id}`}
                onClick={() => handleSelect(tab.id)}
                className={`flex flex-col items-center justify-center py-1 px-3 min-w-[60px] min-h-[44px] rounded transition-colors ${
                  isActive ? 'text-[#c6f135]' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#c6f135]' : 'text-gray-400'}`} />
                <span className="text-[10px] font-mono tracking-tight mt-0.5">{tab.label}</span>
              </button>
            );
          })}

          {/* More Toggle */}
          <button
            id="mobile-tab-more"
            onClick={() => setShowMoreMenu(true)}
            className={`flex flex-col items-center justify-center py-1 px-3 min-w-[60px] min-h-[44px] rounded transition-colors ${
              isSecondaryActive ? 'text-[#00f5ff]' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Menu className={`w-5 h-5 ${isSecondaryActive ? 'text-[#00f5ff]' : 'text-gray-400'}`} />
            <span className="text-[10px] font-mono tracking-tight mt-0.5">
              {isSecondaryActive ? 'Active' : 'More'}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};
