import React from 'react';
import { Smartphone, PackageCheck, FileText, GraduationCap, BarChart3, Database, ShieldCheck, Award } from 'lucide-react';
import { ForkliftIcon } from './icons/ForkliftIcon';

export type TabId = 'pockets' | 'pallets' | 'montacargas' | 'supervisores' | 'reportes' | 'registros' | 'roles';

interface NavigationTabsProps {
  activeTab: TabId;
  onChangeTab: (tab: TabId) => void;
  pocketsCount: number;
  palletsCount?: number;
  memosCount?: number;
  inductionsCount?: number;
  fleetCount?: number;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onChangeTab,
  pocketsCount,
  palletsCount = 142,
  memosCount,
  inductionsCount,
  fleetCount = 19,
}) => {
  const tabs = [
    {
      id: 'pockets' as TabId,
      label: 'Control de Pockets',
      icon: Smartphone,
      count: pocketsCount,
      accentColor: 'from-blue-600 to-indigo-600',
      activeText: 'text-blue-700',
      activeBorder: 'border-blue-600',
      activeBadge: 'bg-blue-600 text-white',
      desc: 'Indicadores de uso y registro',
    },
    {
      id: 'pallets' as TabId,
      label: 'Control de Pallets',
      icon: PackageCheck,
      count: palletsCount,
      accentColor: 'from-emerald-600 to-teal-700',
      activeText: 'text-emerald-700',
      activeBorder: 'border-emerald-600',
      activeBadge: 'bg-emerald-600 text-white',
      desc: 'Seguimiento y regularización',
    },
    {
      id: 'montacargas' as TabId,
      label: 'Horómetros de Montacargas',
      icon: ForkliftIcon,
      count: fleetCount,
      accentColor: 'from-amber-500 to-orange-600',
      activeText: 'text-amber-800',
      activeBorder: 'border-amber-500',
      activeBadge: 'bg-amber-500 text-slate-900',
      desc: 'Flota, horómetros e inoperatividades',
    },
    {
      id: 'supervisores' as TabId,
      label: 'Desempeño Supervisores',
      icon: Award,
      accentColor: 'from-blue-600 to-indigo-700',
      activeText: 'text-blue-700',
      activeBorder: 'border-blue-600',
      activeBadge: 'bg-blue-600 text-white',
      desc: 'Evaluación mensual 2026',
    },
    {
      id: 'reportes' as TabId,
      label: 'Reportes Específicos',
      icon: BarChart3,
      accentColor: 'from-purple-600 to-indigo-700',
      activeText: 'text-purple-700',
      activeBorder: 'border-purple-600',
      activeBadge: 'bg-purple-600 text-white',
      desc: 'Consolidado ejecutivo',
    },
    {
      id: 'registros' as TabId,
      label: 'Base de Registros',
      icon: Database,
      accentColor: 'from-slate-700 to-slate-900',
      activeText: 'text-slate-900',
      activeBorder: 'border-slate-800',
      activeBadge: 'bg-slate-800 text-white',
      desc: 'Auditoría detallada',
    },
    {
      id: 'roles' as TabId,
      label: 'Roles y Permisos',
      icon: ShieldCheck,
      accentColor: 'from-amber-600 to-yellow-600',
      activeText: 'text-amber-700',
      activeBorder: 'border-amber-600',
      activeBadge: 'bg-amber-600 text-white',
      desc: 'Visualización y seguridad',
    }
  ];

  return (
    <nav id="nav-process-tabs" className="bg-[#1A1A2E] border-b border-slate-700 shadow-md">
      <div className="max-w-[1700px] mx-auto px-4 flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id}`}
              onClick={() => onChangeTab(tab.id)}
              className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-white text-slate-900 shadow-md ring-1 ring-black/5 font-black'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className={`p-1.5 rounded-md transition-all ${
                isActive 
                  ? `bg-gradient-to-br ${tab.accentColor} text-white shadow-xs` 
                  : 'bg-white/10 text-slate-400 group-hover:text-white group-hover:bg-white/20'
              }`}>
                <Icon className="w-3.5 h-3.5" />
              </div>

              <span>{tab.label}</span>

              {typeof tab.count === 'number' && (
                <span className={`text-[10.5px] font-black px-2 py-0.5 rounded-full transition-all tabular-nums ${
                  isActive 
                    ? tab.activeBadge 
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {tab.count}
                </span>
              )}

              {/* Active bottom accent bar */}
              {isActive && (
                <span className={`absolute bottom-0 left-3 right-3 h-1 bg-gradient-to-r ${tab.accentColor} rounded-full`} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
