import React, { useState } from 'react';
import { Timer, AlertOctagon } from 'lucide-react';

export interface LeadTimeBucket {
  range: string;
  count: number;
  pct: number;
  color: string;
  status: 'Inmediato' | 'Aceptable' | 'Demorado' | 'Crítico';
}

interface PalletLeadTimeChartProps {
  buckets: LeadTimeBucket[];
}

export const PalletLeadTimeChart: React.FC<PalletLeadTimeChartProps> = ({ buckets }) => {
  const [hoveredRange, setHoveredRange] = useState<string | null>(null);

  const maxCount = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <div className="bg-white border border-[#E2E4E7] rounded-xl p-4 shadow-2xs flex flex-col justify-between">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E2E4E7]">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-[#1F6F8B]/10 text-[#1F6F8B]">
            <Timer className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs sm:text-[13px] font-black text-[#1A1A2E] uppercase tracking-wide">
            6. Antigüedad y Lead Time de Observación (LEAD OBS)
          </h3>
        </div>
        <span className="text-[10px] font-bold text-[#7A8FA6] bg-[#F4F6F7] px-2 py-0.5 rounded border border-[#E2E4E7]">
          Tiempo en Piso
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-2">
        {buckets.map((b) => {
          const isHovered = hoveredRange === b.range;
          return (
            <div
              key={b.range}
              className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                isHovered ? 'shadow-xs scale-102 bg-white border-[#1F6F8B]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
              }`}
              onMouseEnter={() => setHoveredRange(b.range)}
              onMouseLeave={() => setHoveredRange(null)}
            >
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${b.color} mb-1.5`} />
              <div className="text-[11px] font-bold text-[#7A8FA6] uppercase">{b.range}</div>
              <div className="text-xl font-black text-[#1A1A2E] my-0.5">{b.count}</div>
              <div className="text-[10px] font-extrabold text-[#7A8FA6]">{b.pct.toFixed(0)}%</div>
              <span
                className={`inline-block text-[9px] font-black px-1.5 py-0.2 rounded-full mt-1 border ${
                  b.status === 'Inmediato'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : b.status === 'Aceptable'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : b.status === 'Demorado'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {b.status}
              </span>
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-[#7A8FA6] pt-1.5 border-t border-[#E2E4E7] flex justify-between">
        <span>Permanencia del pallet observado</span>
        <span>Meta: 100% resuelto en &lt;48h</span>
      </div>
    </div>
  );
};
