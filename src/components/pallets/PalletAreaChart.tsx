import React, { useState } from 'react';
import { Building2 } from 'lucide-react';

export interface AreaPalletStat {
  area: string;
  total: number;
  regularizados: number;
  pendientes: number;
  enProceso: number;
}

interface PalletAreaChartProps {
  data: AreaPalletStat[];
}

export const PalletAreaChart: React.FC<PalletAreaChartProps> = ({ data }) => {
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);

  const maxTotal = Math.max(5, ...data.map((d) => d.total));

  return (
    <div className="bg-white border border-[#E2E4E7] rounded-xl p-4 shadow-2xs flex flex-col justify-between">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#E2E4E7]">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-[#1F6F8B]/10 text-[#1F6F8B]">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs sm:text-[13px] font-black text-[#1A1A2E] uppercase tracking-wide">
            3. Pallets Observados por Área Operativa
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-[#7A8FA6]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-emerald-500"></span> Reg.
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-amber-500"></span> Proc.
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-rose-500"></span> Pend.
          </span>
        </div>
      </div>

      <div className="space-y-2.5 my-1">
        {data.map((item) => {
          const isHovered = hoveredArea === item.area;
          const pctWidth = (item.total / maxTotal) * 100;
          const regPct = item.total > 0 ? (item.regularizados / item.total) * 100 : 0;
          const procPct = item.total > 0 ? (item.enProceso / item.total) * 100 : 0;
          const pendPct = item.total > 0 ? (item.pendientes / item.total) * 100 : 0;

          return (
            <div
              key={item.area}
              className={`p-2 rounded-lg transition-colors cursor-pointer border ${
                isHovered ? 'bg-[#F4F6F7] border-[#CBD5E1]' : 'border-transparent hover:bg-[#F8FAFC]'
              }`}
              onMouseEnter={() => setHoveredArea(item.area)}
              onMouseLeave={() => setHoveredArea(null)}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-[#1A1A2E] uppercase tracking-wide">
                  {item.area}
                </span>
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="text-[#1A1A2E] font-black">{item.total}</span>
                  <span className="text-[10px] text-[#7A8FA6]">pallets</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded ml-1 border border-emerald-200">
                    {regPct.toFixed(0)}% reg.
                  </span>
                </div>
              </div>

              {/* Stacked Progress Bar */}
              <div className="w-full bg-[#E2E4E7] h-2.5 rounded-full overflow-hidden flex">
                {item.regularizados > 0 && (
                  <div
                    style={{ width: `${regPct}%` }}
                    className="bg-emerald-500 h-full transition-all duration-300"
                    title={`Regularizados: ${item.regularizados}`}
                  />
                )}
                {item.enProceso > 0 && (
                  <div
                    style={{ width: `${procPct}%` }}
                    className="bg-amber-500 h-full transition-all duration-300"
                    title={`En Proceso: ${item.enProceso}`}
                  />
                )}
                {item.pendientes > 0 && (
                  <div
                    style={{ width: `${pendPct}%` }}
                    className="bg-rose-500 h-full transition-all duration-300"
                    title={`Pendientes: ${item.pendientes}`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-[#7A8FA6] pt-1.5 border-t border-[#E2E4E7] flex justify-between">
        <span>Distribución por área</span>
        <span>Colores indican proporción por estado</span>
      </div>
    </div>
  );
};
