import React from 'react';
import {
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Zap,
  TrendingUp,
  Percent,
  AlertOctagon,
} from 'lucide-react';

interface PocketKpiProps {
  pctCumplimientoRegistro: number;
  pctIncumplimientoRegistro: number;
  totalAsignado: number;
  pctUsoPocket: number;
  totalEnUso: number;
  totalSinUso: number;
}

export const PocketKpiCards: React.FC<PocketKpiProps> = ({
  pctCumplimientoRegistro,
  pctIncumplimientoRegistro,
  totalAsignado,
  pctUsoPocket,
  totalEnUso,
  totalSinUso,
}) => {
  return (
    <section id="pockets-kpi-strip" className="w-full mb-5">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* KPI 1: % CUMPLIMIENTO REGISTRO (Vivid Emerald Green) */}
        <div className="bg-gradient-to-br from-[#059669] to-[#047857] text-white rounded-2xl p-4 shadow-md border-2 border-emerald-400 flex flex-col justify-between relative overflow-hidden animate-kpi-entrance kpi-delay-1 hover:-translate-y-1 hover:shadow-lg transition-all cursor-default">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none -mr-6 -mt-6" />
          <div className="flex items-center justify-between z-10">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-emerald-100">
              % Cumplimiento Registro
            </span>
            <div className="p-2 rounded-xl bg-white/20 text-white backdrop-blur-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-100" />
            </div>
          </div>
          <div className="my-2 z-10">
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
              {pctCumplimientoRegistro.toFixed(1)}%
            </div>
            <p className="text-[11px] text-emerald-100 font-semibold mt-0.5">
              Auditoría de apertura
            </p>
          </div>
          <div className="pt-2 border-t border-white/20 text-[10px] font-extrabold text-emerald-100 flex justify-between z-10">
            <span>Eficacia de control</span>
            <span className="text-white bg-emerald-700/80 px-2 py-0.5 rounded-full font-black">
              {pctCumplimientoRegistro >= 90 ? '✓ Óptimo' : 'Seguimiento'}
            </span>
          </div>
        </div>

        {/* KPI 2: TOTAL ASIGNADO (Royal Blue) */}
        <div className="bg-gradient-to-br from-[#1E40AF] to-[#1E3A8A] text-white rounded-2xl p-4 shadow-md border-2 border-[#3B82F6]/50 flex flex-col justify-between relative overflow-hidden animate-kpi-entrance kpi-delay-2 hover:-translate-y-1 hover:shadow-lg transition-all cursor-default">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none -mr-6 -mt-6" />
          <div className="flex items-center justify-between z-10">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-blue-200">
              Total Asignado
            </span>
            <div className="p-2 rounded-xl bg-white/15 text-white backdrop-blur-xs">
              <Smartphone className="w-4 h-4 text-blue-200" />
            </div>
          </div>
          <div className="my-2 z-10">
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
              {totalAsignado}
            </div>
            <p className="text-[11px] text-blue-200 font-semibold mt-0.5">
              Equipos de piso asignados
            </p>
          </div>
          <div className="pt-2 border-t border-white/20 text-[10px] font-extrabold text-blue-200 flex justify-between z-10">
            <span>Dotación Operativa</span>
            <span className="text-white bg-white/20 px-2 py-0.5 rounded-full font-black">
              100% Base
            </span>
          </div>
        </div>

        {/* KPI 3: TOTAL EN USO (Ocean Cyan / Sky Blue) */}
        <div className="bg-gradient-to-br from-[#0284C7] to-[#0369A1] text-white rounded-2xl p-4 shadow-md border-2 border-cyan-400 flex flex-col justify-between relative overflow-hidden animate-kpi-entrance kpi-delay-3 hover:-translate-y-1 hover:shadow-lg transition-all cursor-default">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none -mr-6 -mt-6" />
          <div className="flex items-center justify-between z-10">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-cyan-100">
              Pockets En Uso
            </span>
            <div className="p-2 rounded-xl bg-white/20 text-white backdrop-blur-xs">
              <Zap className="w-4 h-4 text-cyan-100" />
            </div>
          </div>
          <div className="my-2 z-10">
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
              {totalEnUso}
            </div>
            <p className="text-[11px] text-cyan-100 font-semibold mt-0.5">
              En proceso operativo activo
            </p>
          </div>
          <div className="pt-2 border-t border-white/20 text-[10px] font-extrabold text-cyan-100 flex justify-between z-10">
            <span>Equipos activos</span>
            <span className="text-white bg-cyan-800/80 px-2 py-0.5 rounded-full font-black">
              {totalAsignado > 0 ? `${((totalEnUso / totalAsignado) * 100).toFixed(0)}% Dot.` : 'Operando'}
            </span>
          </div>
        </div>

        {/* KPI 4: TOTAL SIN USO (Vivid Electric Amber) */}
        <div className="bg-gradient-to-br from-[#D97706] to-[#B45309] text-white rounded-2xl p-4 shadow-md border-2 border-amber-400 flex flex-col justify-between relative overflow-hidden animate-kpi-entrance kpi-delay-4 hover:-translate-y-1 hover:shadow-lg transition-all cursor-default">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none -mr-6 -mt-6" />
          <div className="flex items-center justify-between z-10">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-amber-100">
              Pockets Sin Uso
            </span>
            <div className="p-2 rounded-xl bg-white/20 text-white backdrop-blur-xs">
              <AlertTriangle className="w-4 h-4 text-amber-100" />
            </div>
          </div>
          <div className="my-2 z-10">
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
              {totalSinUso}
            </div>
            <p className="text-[11px] text-amber-100 font-semibold mt-0.5">
              En drop o sin operario
            </p>
          </div>
          <div className="pt-2 border-t border-white/20 text-[10px] font-extrabold text-amber-100 flex justify-between z-10">
            <span>Requiere reasignar</span>
            <span className="text-slate-900 bg-amber-200 px-2 py-0.5 rounded-full font-black">
              Revisar
            </span>
          </div>
        </div>

        {/* KPI 5: % INCUMPLIMIENTO REGISTRO (Vivid Alert Red / Crimson) */}
        <div className="bg-gradient-to-br from-[#DC2626] to-[#B91C1C] text-white rounded-2xl p-4 shadow-md border-2 border-rose-400 flex flex-col justify-between relative overflow-hidden animate-kpi-entrance kpi-delay-5 hover:-translate-y-1 hover:shadow-lg transition-all cursor-default">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/15 rounded-full blur-xl pointer-events-none -mr-6 -mt-6" />
          <div className="flex items-center justify-between z-10">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-rose-100">
              % Incumplimiento
            </span>
            <div className="p-2 rounded-xl bg-white/20 text-white backdrop-blur-xs">
              <AlertOctagon className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="my-2 z-10">
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
              {pctIncumplimientoRegistro.toFixed(1)}%
            </div>
            <p className="text-[11px] text-rose-100 font-semibold mt-0.5">
              Desviación del estándar
            </p>
          </div>
          <div className="pt-2 border-t border-white/20 text-[10px] font-extrabold text-rose-100 flex justify-between z-10">
            <span>Brecha operativa</span>
            <span className="text-white bg-rose-900/80 px-2 py-0.5 rounded-full font-black">
              {pctIncumplimientoRegistro <= 10 ? 'Bajo control' : 'Alerta'}
            </span>
          </div>
        </div>

        {/* KPI 6: % USO DE POCKET (Deep Indigo / Violet) */}
        <div className="bg-gradient-to-br from-[#4F46E5] to-[#4338CA] text-white rounded-2xl p-4 shadow-md border-2 border-indigo-400 flex flex-col justify-between relative overflow-hidden animate-kpi-entrance kpi-delay-6 hover:-translate-y-1 hover:shadow-lg transition-all cursor-default">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none -mr-6 -mt-6" />
          <div className="flex items-center justify-between z-10">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-indigo-100">
              % Uso de Pocket
            </span>
            <div className="p-2 rounded-xl bg-white/20 text-white backdrop-blur-xs">
              <TrendingUp className="w-4 h-4 text-indigo-100" />
            </div>
          </div>
          <div className="my-2 z-10">
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
              {pctUsoPocket.toFixed(1)}%
            </div>
            <p className="text-[11px] text-indigo-100 font-semibold mt-0.5">
              Tasa neta de utilización
            </p>
          </div>
          <div className="pt-2 border-t border-white/20 text-[10px] font-extrabold text-indigo-100 flex justify-between z-10">
            <span>Eficiencia flota</span>
            <span className="text-white bg-indigo-900/80 px-2 py-0.5 rounded-full font-black">
              {pctUsoPocket >= 75 ? 'Alta' : 'Moderada'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
