import React, { useState } from 'react';
import { Award, TrendingDown } from 'lucide-react';

export interface LowUtilArea {
  area: string;
  pctMenor: number; // relative share of low utilization, e.g. 33%
  pctUtilizacionReal: number; // e.g. 47%, 71%, 75%
  pocketsSinUso: number;
  totalAsignados?: number;
  pocketsEnUso?: number;
}

interface TopMenorUtilizacionProps {
  data: LowUtilArea[];
  semanaLabel: string;
}

export const TopMenorUtilizacionChart: React.FC<TopMenorUtilizacionProps> = ({
  data,
  semanaLabel,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const weekNumber = semanaLabel.replace(/[^0-9]/g, '') || 'Todas';

  // Check if all areas in filter are 100% optimal
  const hasLowUtilAreas = data.length > 0 && data.some((d) => d.pocketsSinUso > 0 || d.pctUtilizacionReal < 100);

  // SVG dimensions
  const svgWidth = 640;
  const svgHeight = Math.max(160, Math.min(240, 50 + data.length * 42));
  const paddingLeft = 120;
  const paddingRight = 45;
  const paddingTop = 22;
  const paddingBottom = 20;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;
  const slotHeight = data.length > 0 ? chartHeight / data.length : chartHeight;
  const barHeight = Math.min(24, Math.max(14, slotHeight * 0.58));
  const depth = 6;

  return (
    <div id="section-top-menor-utilizacion" className="bg-white border border-[#E2E4E7] rounded-md p-3 shadow-xs flex flex-col justify-between">
      {/* Title & Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[#E2E4E7]">
        <div className="flex items-center gap-1.5">
          <TrendingDown className="w-4 h-4 text-[#E0A23A]" />
          <h3 className="text-xs sm:text-[13px] font-black text-[#1A1A2E] tracking-wide uppercase font-sans">
            TOP DE ÁREAS CON MENOR UTILIZACIÓN
          </h3>
        </div>
        <span className="text-[10px] font-bold text-[#1A1A2E] bg-[#E0A23A]/15 px-2 py-0.5 rounded border border-[#E0A23A]/30">
          {semanaLabel.toUpperCase()}
        </span>
      </div>

      {!hasLowUtilAreas ? (
        <div className="py-8 px-4 text-center bg-[#1F6F8B]/5 rounded border border-[#1F6F8B]/20 flex flex-col items-center justify-center gap-2">
          <Award className="w-8 h-8 text-[#1F6F8B]" />
          <h4 className="font-bold text-sm text-[#1A1A2E]">
            Excelente rendimiento operativo
          </h4>
          <p className="text-xs text-[#7A8FA6] max-w-md">
            Todas las áreas en el periodo seleccionado se encuentran al 100% de utilización de pockets o no presentan incidencias de inactividad.
          </p>
        </div>
      ) : (
        <>
          {/* 3D Horizontal Bar SVG */}
          <div className="relative w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto min-w-[500px] select-none"
            >
              <defs>
                <linearGradient id="hBarGradBlue" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1E40AF" />
                  <stop offset="70%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
                <linearGradient id="hBarGradCrimson" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7F1D1D" />
                  <stop offset="70%" stopColor="#DC2626" />
                  <stop offset="100%" stopColor="#EF4444" />
                </linearGradient>
              </defs>

              {/* Grid lines (0%, 25%, 50%, 75%, 100%) */}
              {[0, 25, 50, 75, 100].map((tick) => {
                const x = paddingLeft + (tick / 100) * chartWidth;
                return (
                  <g key={`vgrid-${tick}`}>
                    <line
                      x1={x}
                      y1={paddingTop}
                      x2={x}
                      y2={paddingTop + chartHeight}
                      stroke="#E2E4E7"
                      strokeWidth="1"
                    />
                    <text
                      x={x}
                      y={paddingTop - 6}
                      textAnchor="middle"
                      fill="#7A8FA6"
                      fontSize="9"
                      fontWeight="500"
                    >
                      {tick}%
                    </text>
                  </g>
                );
              })}

              {/* Left Y axis line */}
              <line
                x1={paddingLeft}
                y1={paddingTop}
                x2={paddingLeft}
                y2={paddingTop + chartHeight}
                stroke="#A7B5C5"
                strokeWidth="1.2"
              />

              {/* Dynamic Horizontal Bars */}
              {data.map((item, idx) => {
                const slotCenterY = paddingTop + (idx + 0.5) * slotHeight;
                const barY = slotCenterY - barHeight / 2;

                // Length proportional to relative share of non-use
                const normalizedPct = Math.max(15, Math.min(100, item.pctMenor > 0 ? item.pctMenor * 2.5 : (100 - item.pctUtilizacionReal)));
                const barW = (normalizedPct / 100) * chartWidth;
                const isHovered = hoveredIdx === idx;

                const isCritical = item.pctUtilizacionReal < 60;
                const gradId = isCritical ? 'hBarGradCrimson' : 'hBarGradBlue';

                return (
                  <g
                    key={item.area}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    {/* Area Label on Y axis */}
                    <text
                      x={paddingLeft - 10}
                      y={barY + barHeight / 2 + 3.5}
                      textAnchor="end"
                      fill={isHovered ? (isCritical ? '#DC2626' : '#2563EB') : '#1E293B'}
                      fontSize="10"
                      fontWeight={isHovered ? 'bold' : '600'}
                      fontFamily="sans-serif"
                    >
                      {item.area}
                    </text>

                    {/* Top 3D Facet */}
                    <polygon
                      points={`
                        ${paddingLeft},${barY}
                        ${paddingLeft + depth},${barY - depth}
                        ${paddingLeft + barW + depth},${barY - depth}
                        ${paddingLeft + barW},${barY}
                      `}
                      fill={isCritical ? '#F87171' : '#93C5FD'}
                      stroke={isCritical ? '#DC2626' : '#2563EB'}
                      strokeWidth="0.5"
                    />

                    {/* Side 3D Facet */}
                    <polygon
                      points={`
                        ${paddingLeft + barW},${barY}
                        ${paddingLeft + barW + depth},${barY - depth}
                        ${paddingLeft + barW + depth},${barY + barHeight - depth}
                        ${paddingLeft + barW},${barY + barHeight}
                      `}
                      fill={isCritical ? '#7F1D1D' : '#172554'}
                      opacity={isHovered ? 1 : 0.85}
                    />

                    {/* Front 3D Bar */}
                    <rect
                      x={paddingLeft}
                      y={barY}
                      width={barW}
                      height={barHeight}
                      fill={`url(#${gradId})`}
                      stroke={isCritical ? '#991B1B' : '#1E40AF'}
                      strokeWidth="0.5"
                      rx="1"
                    />

                    {/* Data tag on right of bar */}
                    <text
                      x={paddingLeft + barW + depth + 6}
                      y={barY + barHeight / 2 + 3.5}
                      fill="#1E293B"
                      fontSize="9.5"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      {item.pctMenor}%
                      {item.pocketsSinUso > 0 && (
                        <tspan fill="#DC2626" fontSize="8.5"> ({item.pocketsSinUso} inact.)</tspan>
                      )}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Details */}
            {hoveredIdx !== null && data[hoveredIdx] && (
              <div className="absolute top-2 right-2 bg-[#1A1A2E]/95 text-white text-[11px] px-3 py-1.5 rounded shadow-lg border border-[#236B7A] pointer-events-none z-10">
                <p className="font-bold text-[#E0A23A]">{data[hoveredIdx].area}</p>
                <p className="text-[#A7B5C5]">
                  Participación menor uso: <strong className="text-[#E0A23A]">{data[hoveredIdx].pctMenor}%</strong>
                </p>
                <p className="text-[#7A8FA6] text-[10px]">
                  Utilización real: <strong className="text-white">{data[hoveredIdx].pctUtilizacionReal}%</strong>
                  {data[hoveredIdx].pocketsSinUso > 0 && ` (${data[hoveredIdx].pocketsSinUso} pockets sin uso)`}
                </p>
              </div>
            )}
          </div>

          {/* Dynamic Summary Table below the chart */}
          <div className="mt-2 border border-[#E2E4E7] rounded-md overflow-x-auto text-[10px] font-sans">
            <table className="w-full border-collapse text-center">
              <thead>
                <tr className="bg-[#F4F6F7] border-b border-[#E2E4E7] text-[#1A1A2E]">
                  <th className="py-1.5 px-2.5 text-left font-bold text-[#7A8FA6] border-r border-[#E2E4E7] w-24">
                    Semana
                  </th>
                  {data.map((item) => (
                    <th
                      key={`th-${item.area}`}
                      className="py-1.5 px-2 font-bold tracking-tight text-[#1A1A2E] border-r border-[#E2E4E7] last:border-r-0"
                    >
                      {item.area}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <td className="py-1.5 px-2.5 text-left font-semibold text-[#1A1A2E] border-r border-[#E2E4E7] flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-xs bg-[#1F6F8B]"></span>
                    <span className="font-bold">{weekNumber}</span>
                  </td>
                  {data.map((item) => (
                    <td
                      key={`td-${item.area}`}
                      className="py-1.5 px-2 font-bold text-[#1A1A2E] border-r border-[#E2E4E7] last:border-r-0"
                    >
                      {item.pctMenor}%
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
