import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

export interface MotivoPalletStat {
  motivo: string;
  cantidad: number;
  pct: number;
}

interface PalletMotivosChartProps {
  data: MotivoPalletStat[];
}

export const PalletMotivosChart: React.FC<PalletMotivosChartProps> = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxQty = Math.max(1, ...data.map((d) => d.cantidad));

  return (
    <div className="bg-white border border-[#E2E4E7] rounded-xl p-4 shadow-2xs flex flex-col justify-between">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E2E4E7]">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-[#1F6F8B]/10 text-[#1F6F8B]">
            <AlertCircle className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs sm:text-[13px] font-black text-[#1A1A2E] uppercase tracking-wide">
            4. Top Motivos de Observación en Pallets
          </h3>
        </div>
        <span className="text-[10px] font-bold text-[#7A8FA6]">
          Pareto de Incidencias
        </span>
      </div>

      <div className="space-y-2 my-1">
        {data.slice(0, 6).map((item, idx) => {
          const isHovered = hoveredIdx === idx;
          const barWidth = (item.cantidad / maxQty) * 100;
          const isTopProblem = idx < 2;

          return (
            <div
              key={item.motivo}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer border ${
                isHovered ? 'bg-[#F4F6F7] border-[#CBD5E1]' : 'border-transparent hover:bg-[#F8FAFC]'
              }`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5 truncate max-w-[280px]">
                  <span
                    className={`w-4 h-4 rounded text-[10px] font-black flex items-center justify-center ${
                      isTopProblem ? 'bg-rose-500 text-white' : 'bg-[#E2E4E7] text-[#1A1A2E]'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="font-bold text-[#1A1A2E] truncate text-[11px]">
                    {item.motivo}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="text-[#1A1A2E] font-black text-xs">{item.cantidad}</span>
                  <span className="text-[10px] text-[#7A8FA6]">({item.pct.toFixed(1)}%)</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[#E2E4E7] h-2 rounded-full overflow-hidden">
                <div
                  style={{ width: `${barWidth}%` }}
                  className={`h-full rounded-full transition-all duration-300 ${
                    isTopProblem ? 'bg-rose-500' : 'bg-[#1F6F8B]'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-[#7A8FA6] pt-1.5 border-t border-[#E2E4E7] flex justify-between">
        <span>Causas principales</span>
        <span>Color rojo: Top 2 motivos críticos</span>
      </div>
    </div>
  );
};
