import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Sliders,
  Globe2,
  LineChart,
  ShieldCheck,
  CheckSquare,
  BookOpen,
  PieChart,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { ActiveNavModule } from '../../types';

interface SidebarProps {
  activeModule: ActiveNavModule;
  onSelectModule: (module: ActiveNavModule) => void;
  strategyCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  strategyCount,
}) => {
  const navItems: {
    id: ActiveNavModule;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: string | number;
    section?: string;
  }[] = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard, section: 'OVERVIEW' },
    { id: 'markets', label: 'Markets & Assets', icon: TrendingUp },
    { id: 'strategy-builder', label: 'Strategy Builder', icon: Sliders, badge: strategyCount, section: 'RESEARCH & LOGIC' },
    { id: 'fundamentals', label: 'Fundamentals Engine', icon: Globe2 },
    { id: 'technical-analysis', label: 'Technical Analysis', icon: LineChart },
    { id: 'risk-management', label: 'Risk Engine', icon: ShieldCheck, section: 'DECISION & EXECUTION' },
    { id: 'trades', label: 'Trade Decisions', icon: CheckSquare },
    { id: 'journal', label: 'Trade Journal', icon: BookOpen, section: 'PERFORMANCE' },
    { id: 'analytics', label: 'Analytics & Quant', icon: PieChart },
    { id: 'settings', label: 'Settings & Config', icon: Settings, section: 'SYSTEM' },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-[#090c0e] border-r border-[#182026] select-none shrink-0 h-[calc(100dvh-50px)]">
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          const showSection = item.section && (idx === 0 || navItems[idx - 1]?.section !== item.section);

          return (
            <React.Fragment key={item.id}>
              {showSection && (
                <div className="pt-3 pb-1 px-3 text-[10px] font-mono font-bold tracking-wider text-gray-500 uppercase">
                  {item.section}
                </div>
              )}
              <button
                id={`nav-${item.id}`}
                onClick={() => onSelectModule(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-mono font-medium transition-colors ${
                  isActive
                    ? 'bg-[#141b21] text-[#c6f135] border-l-2 border-[#c6f135] shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#0f1418]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#c6f135]' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1c262f] text-gray-300">
                    {item.badge}
                  </span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Terminal Architecture Status Footer */}
      <div className="p-3 border-t border-[#182026] bg-[#0c1013] text-[10px] font-mono text-gray-400 space-y-1">
        <div className="flex justify-between items-center text-gray-400">
          <span>PIPELINE</span>
          <span className="text-[#c6f135] font-semibold">STAGE 1/8</span>
        </div>
        <div className="w-full bg-[#162028] h-1 rounded overflow-hidden">
          <div className="bg-[#c6f135] h-full w-[25%]" />
        </div>
        <p className="text-[9px] text-gray-400 truncate">Strategy Language & Rules Active</p>
      </div>
    </aside>
  );
};
