import React, { useState } from 'react';
import {
  ClipboardCheck,
  Smartphone,
  PackageCheck,
  FileText,
  GraduationCap,
  BarChart3,
  Database,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Upload,
  Lock,
  Unlock,
  Users,
  PanelLeftClose,
  PanelLeft,
  KeyRound,
  LogOut,
  Award,
  Camera,
  LayoutDashboard,
} from 'lucide-react';
import { StolLogo } from './Header';
import { ForkliftIcon } from './icons/ForkliftIcon';
import { AppUser } from '../types';

export type TabId = 'resumen' | 'pockets' | 'pallets' | 'memos' | 'induccion' | 'montacargas' | 'supervisores' | 'reportes' | 'registros' | 'roles';

interface SidebarProps {
  activeTab: TabId;
  onChangeTab: (tab: TabId) => void;
  pocketsCount: number;
  palletsCount?: number;
  memosCount: number;
  inductionsCount: number;
  fleetCount?: number;
  usersCount: number;
  isUnlocked: boolean;
  currentUser: AppUser;
  onOpenAccessKeyModal: () => void;
  onLockSession: () => void;
  onOpenUploadModal: () => void;
  onOpenPhotoSummaryModal?: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onChangeTab,
  pocketsCount,
  palletsCount = 142,
  memosCount,
  inductionsCount,
  fleetCount = 19,
  usersCount,
  isUnlocked,
  currentUser,
  onOpenAccessKeyModal,
  onLockSession,
  onOpenUploadModal,
  onOpenPhotoSummaryModal,
  collapsed,
  onToggleCollapsed,
}) => {
  // Auditoría dropdown is expanded by default
  const [isAuditoriaOpen, setIsAuditoriaOpen] = useState(true);

  const isAuditoriaActive = activeTab === 'pockets' || activeTab === 'pallets';

  return (
    <aside
      id="sidebar-navigation"
      className={`bg-white border-r border-[#E2E4E7] flex flex-col transition-all duration-300 select-none z-30 shrink-0 ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Sidebar Header with STOL Branding & Collapse Toggle */}
      <div className="p-3.5 border-b border-[#E2E4E7] flex items-center justify-between bg-[#F4F6F7]">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <StolLogo className="h-9" />
          </div>
        ) : (
          <div className="mx-auto">
            <div className="w-8 h-8 rounded bg-[#1A1A2E] text-white font-black text-xs flex items-center justify-center">
              ST
            </div>
          </div>
        )}

        <button
          onClick={onToggleCollapsed}
          className="p-1.5 rounded-md hover:bg-[#E2E4E7] text-[#7A7A7A] hover:text-[#1A1A2E] transition-colors"
          title={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
        >
          {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Access Mode Card (Locked / Unlocked) */}
      <div className="p-3 border-b border-[#E2E4E7] bg-[#F4F6F7]/70">
        {!collapsed ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {isUnlocked ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-[#1F6F8B] bg-[#1F6F8B]/10 px-2 py-0.5 rounded-full border border-[#1F6F8B]/30">
                    <Unlock className="w-3 h-3 text-[#E0A23A]" /> Carga Habilitada
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-[#7A7A7A] bg-[#E2E4E7]/70 px-2 py-0.5 rounded-full border border-[#E2E4E7]">
                    <Lock className="w-3 h-3 text-[#7A7A7A]" /> Solo Visualización
                  </span>
                )}
              </div>

              {isUnlocked ? (
                <button
                  onClick={onLockSession}
                  className="text-[10px] text-[#7A8FA6] hover:text-red-600 font-semibold flex items-center gap-0.5 transition-colors cursor-pointer"
                  title="Bloquear y volver a Solo Lectura"
                >
                  <LogOut className="w-3 h-3" /> Bloquear
                </button>
              ) : null}
            </div>

            {!isUnlocked ? (
              <button
                onClick={onOpenAccessKeyModal}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-[#1A1A2E] hover:bg-[#191827] text-white rounded-md text-xs font-bold transition-all shadow-xs cursor-pointer border border-[#236B7A]/50"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#E0A23A]" />
                <span>Desbloquear Carga</span>
              </button>
            ) : (
              <div className="text-[11px] text-[#7A8FA6] truncate">
                <span className="font-semibold text-[#1A1A2E]">{currentUser.name}</span>
                <span className="block text-[10px] text-[#7A7A7A] truncate">{currentUser.email}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center">
            {isUnlocked ? (
              <button
                onClick={onLockSession}
                title="Carga Habilitada (Clic para bloquear)"
                className="p-1.5 rounded-full bg-[#1F6F8B]/15 text-[#1F6F8B] hover:bg-[#1F6F8B]/25"
              >
                <Unlock className="w-4 h-4 text-[#E0A23A]" />
              </button>
            ) : (
              <button
                onClick={onOpenAccessKeyModal}
                title="Solo Visualización (Clic para desbloquear con clave)"
                className="p-1.5 rounded-full bg-[#E2E4E7] text-[#7A7A7A] hover:bg-[#1A1A2E] hover:text-white transition-colors"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <button
          onClick={() => onChangeTab('resumen')}
          title="Resumen Ejecutivo"
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'resumen'
              ? 'bg-[#1A1A2E] text-white shadow-xs border-l-4 border-[#E0A23A]'
              : 'text-[#1A1A2E] hover:bg-[#F4F6F7]'
          }`}
        >
          <LayoutDashboard className={`w-4 h-4 shrink-0 ${activeTab === 'resumen' ? 'text-[#E0A23A]' : 'text-[#1F6F8B]'}`} />
          {!collapsed && <span>Resumen Ejecutivo</span>}
        </button>

        {/* 1. Pestaña Principal: Desempeño de Supervisores */}
        <div>
          <button
            onClick={() => onChangeTab('supervisores')}
            title="Evaluación de Desempeño de Supervisores 2026"
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'supervisores'
                ? 'bg-[#1A1A2E] text-white shadow-xs border-l-4 border-[#1f6feb]'
                : 'text-[#1A1A2E] hover:bg-[#F4F6F7] hover:text-[#1A1A2E]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Award className={`w-4 h-4 shrink-0 ${activeTab === 'supervisores' ? 'text-amber-400' : 'text-blue-600'}`} />
              {!collapsed && <span>Desempeño Supervisores</span>}
            </div>
            {!collapsed && (
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full shrink-0 ${
                activeTab === 'supervisores' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-900 border border-blue-200'
              }`}>
                2026
              </span>
            )}
          </button>
        </div>

        {/* Section: AUDITORÍA (Collapsible group) */}
        <div>
          <button
            onClick={() => setIsAuditoriaOpen(!isAuditoriaOpen)}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-bold transition-colors cursor-pointer ${
              isAuditoriaActive
                ? 'bg-[#1F6F8B]/10 text-[#1F6F8B]'
                : 'text-[#7A7A7A] hover:bg-[#F4F6F7] hover:text-[#1A1A2E]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ClipboardCheck className={`w-4 h-4 ${isAuditoriaActive ? 'text-[#1F6F8B]' : 'text-[#7A8FA6]'}`} />
              {!collapsed && <span className="uppercase tracking-wider">Auditoría</span>}
            </div>
            {!collapsed && (
              <span className="text-[#A7B5C5]">
                {isAuditoriaOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </span>
            )}
          </button>

          {/* Sub-items of Auditoría: Pockets, Memos, Inducción */}
          {isAuditoriaOpen && (
            <div className={`mt-1 space-y-0.5 ${!collapsed ? 'pl-3 border-l-2 border-[#E2E4E7] ml-3' : ''}`}>
              {/* 1. Pockets */}
              <button
                onClick={() => onChangeTab('pockets')}
                title="Control de Pockets"
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'pockets'
                    ? 'bg-[#1A1A2E] text-white shadow-xs'
                    : 'text-[#7A7A7A] hover:bg-[#F4F6F7] hover:text-[#1A1A2E]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Smartphone className={`w-3.5 h-3.5 ${activeTab === 'pockets' ? 'text-[#E0A23A]' : 'text-[#7A8FA6]'}`} />
                  {!collapsed && <span>Control de Pockets</span>}
                </div>
                {!collapsed && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      activeTab === 'pockets' ? 'bg-[#E0A23A] text-[#191827] font-black' : 'bg-[#E2E4E7] text-[#7A7A7A]'
                    }`}
                  >
                    {pocketsCount}
                  </span>
                )}
              </button>

              {/* 2. Pallets Observados */}
              <button
                onClick={() => onChangeTab('pallets')}
                title="Control de Pallets Observados"
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'pallets'
                    ? 'bg-[#1A1A2E] text-white shadow-xs'
                    : 'text-[#7A7A7A] hover:bg-[#F4F6F7] hover:text-[#1A1A2E]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <PackageCheck className={`w-3.5 h-3.5 ${activeTab === 'pallets' ? 'text-[#E0A23A]' : 'text-[#7A8FA6]'}`} />
                  {!collapsed && <span>Pallets Observados</span>}
                </div>
                {!collapsed && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      activeTab === 'pallets' ? 'bg-[#E0A23A] text-[#191827] font-black' : 'bg-[#E2E4E7] text-[#7A7A7A]'
                    }`}
                  >
                    {palletsCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 2. Pestaña Principal Independiente: Montacargas */}
        <div>
          <button
            onClick={() => onChangeTab('montacargas')}
            title="Montacargas - Horómetros e Inoperatividades"
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'montacargas'
                ? 'bg-[#1A1A2E] text-white shadow-xs border-l-4 border-[#E0A23A]'
                : 'text-[#1A1A2E] hover:bg-[#F4F6F7] hover:text-[#1A1A2E]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ForkliftIcon className={`w-4 h-4 shrink-0 ${activeTab === 'montacargas' ? 'text-[#E0A23A]' : 'text-amber-600'}`} />
              {!collapsed && <span>Horómetros Montacargas</span>}
            </div>
            {!collapsed && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                  activeTab === 'montacargas'
                    ? 'bg-[#E0A23A] text-[#191827] font-black'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                {fleetCount}
              </span>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="pt-2 pb-1">
          <div className="border-t border-[#E2E4E7]" />
        </div>

        {/* Other Sections */}
        {/* Reportes Específicos */}
        <button
          onClick={() => onChangeTab('reportes')}
          title="Reportes Específicos"
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'reportes'
              ? 'bg-[#1A1A2E] text-white shadow-xs'
              : 'text-[#7A7A7A] hover:bg-[#F4F6F7] hover:text-[#1A1A2E]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <BarChart3 className={`w-4 h-4 ${activeTab === 'reportes' ? 'text-[#E0A23A]' : 'text-[#7A8FA6]'}`} />
            {!collapsed && <span>Reportes Específicos</span>}
          </div>
        </button>

        {/* Base de Registros */}
        <button
          onClick={() => onChangeTab('registros')}
          title="Base de Registros"
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'registros'
              ? 'bg-[#1A1A2E] text-white shadow-xs'
              : 'text-[#7A7A7A] hover:bg-[#F4F6F7] hover:text-[#1A1A2E]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Database className={`w-4 h-4 ${activeTab === 'registros' ? 'text-[#E0A23A]' : 'text-[#7A8FA6]'}`} />
            {!collapsed && <span>Base de Registros</span>}
          </div>
        </button>

        {/* Gestión de Roles y Permisos (ONLY accessible when key matched or explicitly enabled) */}
        {isUnlocked && (
          <div className="pt-2">
            <button
              onClick={() => onChangeTab('roles')}
              title="Gestión de Roles y Permisos"
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
                activeTab === 'roles'
                  ? 'bg-[#1F6F8B] text-white border-[#236B7A] shadow-xs'
                  : 'bg-[#1F6F8B]/10 text-[#1F6F8B] hover:bg-[#1F6F8B]/20 border-[#1F6F8B]/25'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#E0A23A]" />
                {!collapsed && <span>Gestión de Roles</span>}
              </div>
              {!collapsed && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#1F6F8B]/25 text-[#1F6F8B]">
                  {usersCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Bottom Quick Action: Upload button */}
      <div className="p-3 border-t border-[#E2E4E7] bg-[#F4F6F7] space-y-2">
        {onOpenPhotoSummaryModal && (
          <button
            onClick={onOpenPhotoSummaryModal}
            className="w-full flex items-center justify-center gap-2 py-2 px-2 rounded-md text-xs font-black transition-all shadow-xs cursor-pointer bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 border border-amber-400"
            title="Descargar Foto Resumen Ejecutivo (diario, semanal, mensual o trimestral)"
          >
            <Camera className="w-3.5 h-3.5 text-slate-950 shrink-0" />
            {!collapsed && <span>Descargar Foto Resumen</span>}
          </button>
        )}

        <button
          onClick={() => {
            if (!isUnlocked) {
              onOpenAccessKeyModal();
            } else {
              onOpenUploadModal();
            }
          }}
          className={`w-full flex items-center justify-center gap-2 py-2 px-2 rounded-md text-xs font-bold transition-all shadow-xs cursor-pointer ${
            isUnlocked
              ? 'bg-[#1F6F8B] hover:bg-[#236B7A] text-white border border-[#236B7A]'
              : 'bg-[#E2E4E7] hover:bg-[#d6d9dd] text-[#1A1A2E] border border-[#E2E4E7]'
          }`}
          title={isUnlocked ? 'Subir archivo Excel o CSV' : 'Desbloquear con clave para cargar archivo'}
        >
          {isUnlocked ? <Upload className="w-3.5 h-3.5 text-[#E0A23A]" /> : <KeyRound className="w-3.5 h-3.5 text-[#1A1A2E]" />}
          {!collapsed && <span>{isUnlocked ? 'Cargar Excel / CSV' : 'Subir Información'}</span>}
        </button>
      </div>
    </aside>
  );
};
