import React from 'react';
import { Package, CheckCircle2, Clock, AlertTriangle, Timer, ShieldAlert } from 'lucide-react';

interface PalletKpiCardsProps {
  totalPallets: number;
  regularizadosCount: number;
  regularizadosPct: number;
  pendientesCount: number;
  pendientesPct: number;
  enProcesoCount: number;
  enProcesoPct: number;
  leadTimePromedio: number;
  criticosCount: number;
}

export const PalletKpiCards: React.FC<PalletKpiCardsProps> = ({
  totalPallets,
  regularizadosCount,
  regularizadosPct,
  pendientesCount,
  pendientesPct,
  enProcesoCount,
  enProcesoPct,
  leadTimePromedio,
  criticosCount,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Total Pallets Observados */}
      <div className="bg-white border border-[#E2E4E7] rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-[#7A8FA6] uppercase tracking-wider">
            Total Pallets
          </span>
          <div className="p-1.5 rounded-lg bg-[#1F6F8B]/10 text-[#1F6F8B]">
            <Package className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-[#1A1A2E]">{totalPallets}</div>
        <p className="text-[10.5px] text-[#7A8FA6] mt-0.5">
          Total de pallets observados
        </p>
      </div>

      {/* 2. Regularizados */}
      <div className="bg-white border border-[#E2E4E7] rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-[#7A8FA6] uppercase tracking-wider">
            Regularizados
          </span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-emerald-600">{regularizadosCount}</span>
          <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
            {regularizadosPct.toFixed(1)}%
          </span>
        </div>
        <p className="text-[10.5px] text-[#7A8FA6] mt-0.5">
          Conformidad restablecida
        </p>
      </div>

      {/* 3. Pendientes */}
      <div className="bg-white border border-[#E2E4E7] rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-[#7A8FA6] uppercase tracking-wider">
            Pendientes
          </span>
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-rose-600">{pendientesCount}</span>
          <span className="text-xs font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
            {pendientesPct.toFixed(1)}%
          </span>
        </div>
        <p className="text-[10.5px] text-[#7A8FA6] mt-0.5">
          Sin regularizar en piso
        </p>
      </div>

      {/* 4. En Proceso */}
      <div className="bg-white border border-[#E2E4E7] rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-[#7A8FA6] uppercase tracking-wider">
            En Proceso
          </span>
          <div className="p-1.5 rounded-lg bg-[#E0A23A]/15 text-[#b87d22]">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-[#b87d22]">{enProcesoCount}</span>
          <span className="text-xs font-black text-[#b87d22] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
            {enProcesoPct.toFixed(1)}%
          </span>
        </div>
        <p className="text-[10.5px] text-[#7A8FA6] mt-0.5">
          En re-estiba / zunchado
        </p>
      </div>

      {/* 5. Lead Time Promedio (LEAD OBS) */}
      <div className="bg-white border border-[#E2E4E7] rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-[#7A8FA6] uppercase tracking-wider">
            Lead Obs Promedio
          </span>
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600">
            <Timer className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-[#1A1A2E]">{leadTimePromedio.toFixed(1)}</span>
          <span className="text-xs font-bold text-[#7A8FA6]">días</span>
        </div>
        <p className="text-[10.5px] text-[#7A8FA6] mt-0.5">
          Tiempo medio regularización
        </p>
      </div>

      {/* 6. Críticos (> 3 días) */}
      <div className="bg-white border border-[#E2E4E7] rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-[#7A8FA6] uppercase tracking-wider">
            Críticos (&gt;3d)
          </span>
          <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-orange-600">{criticosCount}</div>
        <p className="text-[10.5px] text-[#7A8FA6] mt-0.5">
          Superan lead time estándar
        </p>
      </div>
    </div>
  );
};
