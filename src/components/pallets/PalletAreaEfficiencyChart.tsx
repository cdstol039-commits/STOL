import React, { useState } from 'react';
import { Target, CheckCircle2 } from 'lucide-react';
import { AreaPalletStat } from './PalletAreaChart';

interface PalletAreaEfficiencyProps {
  data: AreaPalletStat[];
}

export const PalletAreaEfficiencyChart: React.FC<PalletAreaEfficiencyProps> = ({ data }) => {
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);

  // Sort by % regularización descending
  const sorted = [...data].sort((a, b) => {
    const pctA = a.total > 0 ? (a.regularizados / a.total) * 100 : 0;
    const pctB = b.total > 0 ? (b.regularizados / b.total) * 100 : 0;
    return pctB - pctA;
  });

  return (
    <div className="bg-white border border-[#E2E4E7] rounded-xl p-4 shadow-2xs flex flex-col justify-between">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E2E4E7]">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-[#1F6F8B]/10 text-[#1F6F8B]">
            <Target className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs sm:text-[13px] font-black text-[#1A1A2E] uppercase tracking-wide">
            7. Eficacia Operativa (% Regularización por Área)
          </h3>
        </div>
        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          Meta Corporativa: 80%
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 my-2">
        {sorted.map((item) => {
          const isHovered = hoveredArea === item.area;
          const pct = item.total > 0 ? (item.regularizados / item.total) * 100 : 0;
          const meetsTarget = pct >= 80;

          return (
            <div
              key={item.area}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                isHovered ? 'shadow-xs bg-white border-[#1F6F8B] scale-102' : 'bg-[#F8FAFC] border-[#E2E8F0]'
              }`}
              onMouseEnter={() => setHoveredArea(item.area)}
              onMouseLeave={() => setHoveredArea(null)}
            >
              <div className="text-[11px] font-bold text-[#1A1A2E] uppercase truncate">
                {item.area}
              </div>
              <div
                className={`text-xl font-black my-1 ${
                  meetsTarget ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {pct.toFixed(0)}%
              </div>
              <div className="text-[10px] text-[#7A8FA6] font-semibold">
                {item.regularizados} / {item.total} resueltos
              </div>
              <div className="w-full bg-[#E2E4E7] h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  style={{ width: `${pct}%` }}
                  className={`h-full rounded-full ${
                    meetsTarget ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-[#7A8FA6] pt-1.5 border-t border-[#E2E4E7] flex justify-between">
        <span>Cumplimiento del cierre de observaciones</span>
        <span>Verde: Cumple meta (&gt;=80%) | Ámbar: Requiere aceleración</span>
      </div>
    </div>
  );
};
