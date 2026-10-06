import React, { useState } from 'react';
import { PieChart, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

interface PalletStatusDistributionProps {
  regularizados: number;
  pendientes: number;
  enProceso: number;
}

export const PalletStatusDistributionChart: React.FC<PalletStatusDistributionProps> = ({
  regularizados,
  pendientes,
  enProceso,
}) => {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  const total = regularizados + pendientes + enProceso;
  const pctReg = total > 0 ? (regularizados / total) * 100 : 0;
  const pctPend = total > 0 ? (pendientes / total) * 100 : 0;
  const pctProc = total > 0 ? (enProceso / total) * 100 : 0;

  // Donut SVG calculations
  const size = 160;
  const center = size / 2;
  const radius = 62;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  const regStroke = (pctReg / 100) * circumference;
  const pendStroke = (pctPend / 100) * circumference;
  const procStroke = (pctProc / 100) * circumference;

  // Offsets
  const offsetReg = 0;
  const offsetPend = -regStroke;
  const offsetProc = -(regStroke + pendStroke);

  return (
    <div className="bg-white border border-[#E2E4E7] rounded-xl p-4 shadow-2xs flex flex-col justify-between">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E2E4E7]">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-[#1F6F8B]/10 text-[#1F6F8B]">
            <PieChart className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs sm:text-[13px] font-black text-[#1A1A2E] uppercase tracking-wide">
            2. Distribución de Estados Operativos
          </h3>
        </div>
        <span className="text-[10px] font-bold text-[#7A8FA6] bg-[#F4F6F7] px-2 py-0.5 rounded-full border border-[#E2E4E7]">
          {total} Total
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
        {/* Donut Graphic */}
        <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
            <defs>
              <filter id="donutGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#0F172A" floodOpacity="0.15" />
              </filter>
            </defs>

            {/* Background ring */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth={strokeWidth}
            />

            {/* Regularizados slice (Vivid Emerald) */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#10B981"
              strokeWidth={hoveredSlice === 'reg' ? strokeWidth + 5 : strokeWidth}
              strokeDasharray={`${regStroke} ${circumference}`}
              strokeDashoffset={offsetReg}
              filter="url(#donutGlow)"
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredSlice('reg')}
              onMouseLeave={() => setHoveredSlice(null)}
            />

            {/* Pendientes slice (Vivid Crimson) */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#EF4444"
              strokeWidth={hoveredSlice === 'pend' ? strokeWidth + 5 : strokeWidth}
              strokeDasharray={`${pendStroke} ${circumference}`}
              strokeDashoffset={offsetPend}
              filter="url(#donutGlow)"
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredSlice('pend')}
              onMouseLeave={() => setHoveredSlice(null)}
            />

            {/* En Proceso slice (Vivid Amber) */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#F59E0B"
              strokeWidth={hoveredSlice === 'proc' ? strokeWidth + 5 : strokeWidth}
              strokeDasharray={`${procStroke} ${circumference}`}
              strokeDashoffset={offsetProc}
              filter="url(#donutGlow)"
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredSlice('proc')}
              onMouseLeave={() => setHoveredSlice(null)}
            />
          </svg>

          {/* Donut Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-black text-[#0F172A] tracking-tight">
              {pctReg.toFixed(0)}%
            </span>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">
              Eficacia
            </span>
          </div>
        </div>

        {/* Legend list with counts */}
        <div className="flex-1 w-full space-y-2">
          {/* Item 1 */}
          <div
            className={`p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
              hoveredSlice === 'reg' ? 'bg-emerald-50 border-emerald-400 shadow-xs scale-101' : 'bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50'
            }`}
            onMouseEnter={() => setHoveredSlice('reg')}
            onMouseLeave={() => setHoveredSlice(null)}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#10B981] shadow-2xs"></span>
              <span className="text-xs font-extrabold text-emerald-950">Regularizados</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white bg-emerald-600 px-2 py-0.5 rounded-md shadow-2xs">
                {regularizados}
              </span>
              <span className="text-[11px] font-bold text-emerald-700">({pctReg.toFixed(1)}%)</span>
            </div>
          </div>

          {/* Item 2 */}
          <div
            className={`p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
              hoveredSlice === 'pend' ? 'bg-rose-50 border-rose-400 shadow-xs scale-101' : 'bg-rose-50/40 border-rose-200 hover:bg-rose-50'
            }`}
            onMouseEnter={() => setHoveredSlice('pend')}
            onMouseLeave={() => setHoveredSlice(null)}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#EF4444] shadow-2xs"></span>
              <span className="text-xs font-extrabold text-rose-950">Pendientes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white bg-rose-600 px-2 py-0.5 rounded-md shadow-2xs">
                {pendientes}
              </span>
              <span className="text-[11px] font-bold text-rose-700">({pctPend.toFixed(1)}%)</span>
            </div>
          </div>

          {/* Item 3 */}
          <div
            className={`p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
              hoveredSlice === 'proc' ? 'bg-amber-50 border-amber-400 shadow-xs scale-101' : 'bg-amber-50/40 border-amber-200 hover:bg-amber-50'
            }`}
            onMouseEnter={() => setHoveredSlice('proc')}
            onMouseLeave={() => setHoveredSlice(null)}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#F59E0B] shadow-2xs"></span>
              <span className="text-xs font-extrabold text-amber-950">En Proceso</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white bg-amber-600 px-2 py-0.5 rounded-md shadow-2xs">
                {enProceso}
              </span>
              <span className="text-[11px] font-bold text-amber-700">({pctProc.toFixed(1)}%)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-[10px] text-[#7A8FA6] pt-1 border-t border-[#E2E4E7] flex justify-between">
        <span>Estado en tiempo real</span>
        <span>Ratio regularizado meta: &gt;80%</span>
      </div>
    </div>
  );
};
