import React from 'react';
import { Package, CheckCircle2, AlertTriangle, Clock, TrendingUp, AlertOctagon } from 'lucide-react';

interface PalletKpiCardsVividProps {
  totalPallets: number;
  regularizadosCount: number;
  regularizadosPct: number;
  pendientesCount: number;
  pendientesPct: number;
  leadTimePromedio: number;
  leadTime2DiasCount: number;
}

export const PalletKpiCardsVivid: React.FC<PalletKpiCardsVividProps> = ({
  totalPallets,
  regularizadosCount,
  regularizadosPct,
  pendientesCount,
  pendientesPct,
  leadTimePromedio,
  leadTime2DiasCount,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
      {/* 1. TOTAL PALLETS OBSERVADOS (Vivid Royal Blue) */}
      <div className="bg-gradient-to-br from-[#1E40AF] to-[#1E3A8A] text-white rounded-2xl p-4 shadow-md border-2 border-[#3B82F6]/50 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none -mr-8 -mt-8" />
        <div className="flex items-center justify-between z-10">
          <span className="text-[11px] font-black uppercase tracking-wider text-blue-200">
            Total Pallets Observados
          </span>
          <div className="p-2 rounded-xl bg-white/15 text-white backdrop-blur-xs">
            <Package className="w-5 h-5" />
          </div>
        </div>
        <div className="my-2 z-10">
          <div className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            {totalPallets}
          </div>
          <p className="text-[11px] text-blue-200 font-semibold mt-0.5">
            Volumen auditado acumulado
          </p>
        </div>
        <div className="pt-2 border-t border-white/20 text-[10px] font-extrabold text-blue-200 flex justify-between z-10">
          <span>Cross Docking & Picking</span>
          <span className="text-white bg-white/20 px-2 py-0.5 rounded-full font-black">100% Base</span>
        </div>
      </div>

      {/* 2. REGULARIZADAS (Vivid Emerald Green) */}
      <div className="bg-gradient-to-br from-[#059669] to-[#047857] text-white rounded-2xl p-4 shadow-md border-2 border-emerald-400 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none -mr-8 -mt-8" />
        <div className="flex items-center justify-between z-10">
          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-100">
            Pallets Regularizados
          </span>
          <div className="p-2 rounded-xl bg-white/20 text-white backdrop-blur-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          </div>
        </div>
        <div className="my-2 z-10">
          <div className="flex items-baseline gap-2">
            <div className="text-3xl sm:text-4xl font-black text-white">
              {regularizadosCount}
            </div>
            <span className="text-sm font-black bg-white text-emerald-800 px-2 py-0.5 rounded-lg shadow-xs">
              {regularizadosPct.toFixed(1)}%
            </span>
          </div>
          <p className="text-[11px] text-emerald-100 font-semibold mt-0.5">
            Observaciones levantadas
          </p>
        </div>
        <div className="pt-2 border-t border-white/20 text-[10px] font-extrabold text-emerald-100 flex justify-between z-10">
          <span>Eficacia de cierre</span>
          <span className="text-white font-black bg-emerald-700/80 px-2 py-0.5 rounded-full">
            {regularizadosPct >= 80 ? '✓ Meta Superada' : 'En seguimiento'}
          </span>
        </div>
      </div>

      {/* 3. PENDIENTES (Vivid Crimson / Alert Red) */}
      <div className="bg-gradient-to-br from-[#DC2626] to-[#B91C1C] text-white rounded-2xl p-4 shadow-md border-2 border-rose-400 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/15 rounded-full blur-xl pointer-events-none -mr-8 -mt-8" />
        <div className="flex items-center justify-between z-10">
          <span className="text-[11px] font-black uppercase tracking-wider text-rose-100">
            Pallets Pendientes
          </span>
          <div className="p-2 rounded-xl bg-white/20 text-white backdrop-blur-xs animate-pulse">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="my-2 z-10">
          <div className="flex items-baseline gap-2">
            <div className="text-3xl sm:text-4xl font-black text-white">
              {pendientesCount}
            </div>
            <span className="text-sm font-black bg-white text-rose-800 px-2 py-0.5 rounded-lg shadow-xs">
              {pendientesPct.toFixed(1)}%
            </span>
          </div>
          <p className="text-[11px] text-rose-100 font-semibold mt-0.5">
            Pendientes de regularización
          </p>
        </div>
        <div className="pt-2 border-t border-white/20 text-[10px] font-extrabold text-rose-100 flex justify-between z-10">
          <span>Requiere acción inmediata</span>
          <span className="text-white font-black bg-rose-800/80 px-2 py-0.5 rounded-full">
            Alerta en piso
          </span>
        </div>
      </div>

      {/* 4. LEAD TIME RESPONSABLE / ANTIGÜEDAD (Vivid Amber / Purple) */}
      <div className="bg-gradient-to-br from-[#D97706] to-[#B45309] text-white rounded-2xl p-4 shadow-md border-2 border-amber-400 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none -mr-8 -mt-8" />
        <div className="flex items-center justify-between z-10">
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-100">
            Lead Time Promedio
          </span>
          <div className="p-2 rounded-xl bg-white/20 text-white backdrop-blur-xs">
            <Clock className="w-5 h-5 text-amber-200" />
          </div>
        </div>
        <div className="my-2 z-10">
          <div className="flex items-baseline gap-2">
            <div className="text-3xl sm:text-4xl font-black text-white">
              {leadTimePromedio.toFixed(1)}
            </div>
            <span className="text-sm font-bold text-amber-100">días en piso</span>
          </div>
          <p className="text-[11px] text-amber-100 font-semibold mt-0.5">
            {leadTime2DiasCount} pallets con &gt;= 2 días
          </p>
        </div>
        <div className="pt-2 border-t border-white/20 text-[10px] font-extrabold text-amber-100 flex justify-between z-10">
          <span>Tiempo de permanencia</span>
          <span className="text-white font-black bg-amber-800/80 px-2 py-0.5 rounded-full">
            Meta: &lt; 1 día
          </span>
        </div>
      </div>
    </div>
  );
};
