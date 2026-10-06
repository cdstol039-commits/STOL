import React, { useState } from 'react';
import { UserCheck } from 'lucide-react';

export interface ResponsablePalletStat {
  responsable: string;
  total: number;
  regularizados: number;
  pendientes: number;
  pctRegularizacion: number;
}

interface PalletResponsableChartProps {
  data: ResponsablePalletStat[];
}

export const PalletResponsableChart: React.FC<PalletResponsableChartProps> = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxTotal = Math.max(1, ...data.map((d) => d.total));

  return (
    <div className="bg-white border border-[#E2E4E7] rounded-xl p-4 shadow-2xs flex flex-col justify-between">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E2E4E7]">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-[#1F6F8B]/10 text-[#1F6F8B]">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs sm:text-[13px] font-black text-[#1A1A2E] uppercase tracking-wide">
            5. Desempeño por Responsable / Supervisor
          </h3>
        </div>
        <span className="text-[10px] font-bold text-[#7A8FA6]">
          % Eficacia Cierre
        </span>
      </div>

      <div className="space-y-2 my-1">
        {data.slice(0, 6).map((item, idx) => {
          const isHovered = hoveredIdx === idx;
          const isHighPerformer = item.pctRegularizacion >= 70;

          return (
            <div
              key={item.responsable}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer border ${
                isHovered ? 'bg-[#F4F6F7] border-[#CBD5E1]' : 'border-transparent hover:bg-[#F8FAFC]'
              }`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-[#1A1A2E] truncate max-w-[200px]">
                  {item.responsable}
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[11px] font-medium text-[#7A8FA6]">
                    {item.regularizados} / {item.total}
                  </span>
                  <span
                    className={`font-black text-[11px] px-1.5 py-0.5 rounded border ${
                      isHighPerformer
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {item.pctRegularizacion.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[#E2E4E7] h-2 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${item.pctRegularizacion}%` }}
                  className={`h-full rounded-full transition-all duration-300 ${
                    isHighPerformer ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-[#7A8FA6] pt-1.5 border-t border-[#E2E4E7] flex justify-between">
        <span>Gestión de regularización</span>
        <span>Verde: &gt;=70% | Ámbar: &lt;70%</span>
      </div>
    </div>
  );
};
