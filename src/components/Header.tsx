import React from 'react';
import { Lock, Unlock, FileSpreadsheet, RotateCcw, KeyRound, ShieldCheck, LogOut, Clock, Camera } from 'lucide-react';
import { AppUser } from '../types';
import { formatAuditDateTime } from '../utils/persistence';

interface HeaderProps {
  currentUser: AppUser;
  isUnlocked: boolean;
  onOpenAccessKeyModal: () => void;
  onOpenUploadModal?: () => void;
  onOpenRoleModal?: () => void;
  onLockSession?: () => void;
  onResetData?: () => void;
  onOpenPhotoSummaryModal?: () => void;
  activeViewTitle: string;
  activeTab?: string;
  lastSyncTime?: string | null;
  lastAuditUpdatedAt?: string | null;
  latestFileName?: string | null;
  isPublished?: boolean;
}

export const StolLogo: React.FC<{ className?: string }> = ({ className = 'h-10' }) => {
  return (
    <div className={`flex items-center gap-1.5 select-none ${className}`}>
      <div className="flex flex-col items-center bg-white/95 px-2.5 py-1 rounded shadow-xs border border-slate-200">
        <div className="flex items-center gap-1">
          <span className="text-xl font-black tracking-tight text-slate-800 font-sans">ST</span>
          <div className="relative flex items-center justify-center">
            <span className="text-xl font-black text-slate-800">O</span>
            <div className="absolute -top-0.5 w-3 h-1 border-t-2 border-emerald-600 rounded-t-full"></div>
          </div>
          <span className="text-xl font-black tracking-tight text-slate-800 font-sans">L</span>
        </div>
        <span className="text-[6.5px] font-bold tracking-widest text-slate-500 uppercase -mt-0.5">
          ALMACENES Y DEPÓSITOS
        </span>
      </div>
    </div>
  );
};

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  isUnlocked,
  onOpenAccessKeyModal,
  onOpenUploadModal,
  onOpenRoleModal,
  onLockSession,
  onResetData,
  onOpenPhotoSummaryModal,
  activeViewTitle,
  activeTab = 'pockets',
  lastSyncTime,
  lastAuditUpdatedAt,
  latestFileName,
  isPublished = false,
}) => {
  const getHeaderTitle = () => {
    if (activeTab === 'pockets') {
      return 'INDICADOR DE CUMPLIMIENTO — USO DE POCKETS';
    }
    if (activeTab === 'montacargas') {
      return 'Operatividad de flota, inoperatividad y consumo de horómetros';
    }
    if (activeTab === 'supervisores') {
      return 'EVALUACIÓN DE DESEMPEÑO – SUPERVISORES 2026';
    }
    return activeViewTitle.toUpperCase();
  };

  return (
    <header className="w-full bg-[#1A1A2E] text-white shadow-sm border-b border-[#236B7A]/40 sticky top-0 z-20">
      <div className="px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Branding & Dynamic Breadcrumb */}
        <div className="flex items-center gap-3">
          <StolLogo />
          <div className="hidden sm:block border-l border-[#7A8FA6]/30 pl-3">
            <h1 className="text-sm md:text-base font-black tracking-wider uppercase drop-shadow-xs font-sans text-white">
              {getHeaderTitle()}
            </h1>
            <p className="text-[11px] text-[#A7B5C5] font-medium">
              SISTEMA INTEGRADO DE AUDITORÍAS OPERACIONALES | <span className="text-[#E0A23A] font-semibold">{activeViewTitle}</span>
            </p>
          </div>
        </div>

        {/* Right: Clean Access Mode Pill, Sync Status, Upload Button & Reset */}
        <div className="flex items-center gap-2 text-xs">
          {/* Environment Mode Badge (Pre-Publicación vs Publicado) */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold border ${
              isPublished
                ? 'bg-[#191827] border-[#1F6F8B] text-[#A7B5C5]'
                : 'bg-[#191827] border-[#236B7A]/60 text-[#A7B5C5]'
            }`}
            title={
              isPublished
                ? 'Modo Publicado: Los datos se conservan permanentemente para hoy y próximos días tanto en servidor como en su navegador.'
                : 'Modo Pre-Publicación (Producción): Los datos que suba aquí se conservan para trabajar en producción y quedan listos para la publicación.'
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${isPublished ? 'bg-[#E0A23A]' : 'bg-[#1F6F8B] animate-pulse'}`}
            ></span>
            <span>{isPublished ? 'Modo: Publicado' : 'Modo: Pre-Publicación'}</span>
          </div>

          {/* Latest Hosted File Badge */}
          {latestFileName && (
            <div
              className="hidden lg:flex items-center gap-1.5 bg-[#191827] border border-[#236B7A] px-2.5 py-1 rounded-full text-[#A7B5C5]"
              title={`Último archivo conservado permanentemente: ${latestFileName}. Fecha y hora de carga: ${formatAuditDateTime(lastAuditUpdatedAt || lastSyncTime)}`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#E0A23A] shrink-0" />
              <span className="text-[10.5px] font-semibold text-white truncate max-w-[170px]">
                {latestFileName}
              </span>
              {(lastAuditUpdatedAt || lastSyncTime) && (
                <span className="text-[10px] text-[#A7B5C5] font-normal">
                  ({formatAuditDateTime(lastAuditUpdatedAt || lastSyncTime)})
                </span>
              )}
            </div>
          )}

          {/* Live shared network status indicator */}
          {lastSyncTime && (
            <div
              className="hidden md:flex items-center gap-1.5 bg-[#191827] border border-[#1F6F8B]/50 px-2 py-1 rounded-full text-[#A7B5C5]"
              title="Sincronizado en red: los cambios subidos se actualizan para todos los usuarios automáticamente"
            >
              <span className="w-2 h-2 rounded-full bg-[#1F6F8B] animate-pulse"></span>
              <span className="text-[10px] font-medium text-[#A7B5C5]">Red: {lastSyncTime}</span>
            </div>
          )}
          {/* Botón Descargar Foto Resumen Ejecutivo */}
          {onOpenPhotoSummaryModal && (
            <button
              type="button"
              onClick={onOpenPhotoSummaryModal}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black px-3 py-1.5 rounded-full text-xs shadow-md transition-all cursor-pointer transform hover:scale-102 border border-amber-400"
              title="Descargar o copiar foto resumen de los números y KPIs más relevantes para análisis (diario, semanal, mensual o trimestral)"
            >
              <Camera className="w-3.5 h-3.5 text-slate-950 font-black shrink-0" />
              <span>Foto Resumen</span>
            </button>
          )}

          {/* Status badge */}
          {isUnlocked ? (
            <div className="flex items-center gap-2 bg-[#191827] border border-[#1F6F8B] px-2.5 py-1 rounded-full text-[#A7B5C5]">
              <Unlock className="w-3.5 h-3.5 text-[#E0A23A]" />
              <span className="font-semibold text-white">{currentUser.name}</span>
              <span className="hidden md:inline text-[10px] bg-[#1F6F8B]/40 text-[#A7B5C5] px-1.5 py-0.2 rounded-full font-bold">
                Carga Activa
              </span>
              {onLockSession && (
                <button
                  onClick={onLockSession}
                  className="ml-1 text-[#A7B5C5] hover:text-white p-0.5 rounded cursor-pointer"
                  title="Bloquear sesión (volver a Solo Visualización)"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAccessKeyModal}
              className="flex items-center gap-1.5 bg-[#191827] hover:bg-[#236B7A]/40 border border-[#236B7A] px-2.5 py-1 rounded-full text-[#A7B5C5] hover:text-white transition-colors cursor-pointer"
              title="Portal en solo lectura. Clic para ingresar clave y habilitar carga."
            >
              <Lock className="w-3.5 h-3.5 text-[#E0A23A]" />
              <span className="font-semibold text-white">Solo Visualización</span>
              <span className="text-[10px] bg-[#E0A23A]/20 text-[#E0A23A] font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                <KeyRound className="w-2.5 h-2.5" /> Clave
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
