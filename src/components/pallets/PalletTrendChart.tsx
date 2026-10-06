import React, { useState } from 'react';
import { TrendingUp, Layers } from 'lucide-react';

export interface TrendPalletPoint {
  label: string;
  total: number;
  regularizados: number;
  pendientes: number;
  pctRegularizacion: number;
}

interface PalletTrendChartProps {
  data: TrendPalletPoint[];
}

export const PalletTrendChart: React.FC<PalletTrendChartProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const width = 580;
  const height = 220;
  const paddingLeft = 45;
  const paddingRight = 45;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxVal = Math.max(10, ...data.map((d) => d.total));
  const roundedMax = Math.ceil(maxVal / 5) * 5;

  const getYCoordQty = (qty: number) => {
    return paddingTop + chartHeight - (Math.min(roundedMax, qty) / roundedMax) * chartHeight;
  };

  const getYCoordPct = (pct: number) => {
    return paddingTop + chartHeight - (Math.min(100, pct) / 100) * chartHeight;
  };

  const getXCoord = (idx: number, count: number) => {
    if (count <= 1) return paddingLeft + chartWidth / 2;
    const step = chartWidth / count;
    return paddingLeft + step * idx + step / 2;
  };

  const barWidth = data.length > 0 ? Math.min(36, Math.max(16, (chartWidth / data.length) * 0.5)) : 24;

  // Connecting path for the % regularización line
  const pathD = data.length > 1
    ? data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getXCoord(i, data.length)} ${getYCoordPct(d.pctRegularizacion)}`).join(' ')
    : '';

  return (
    <div className="bg-white border border-[#E2E4E7] rounded-xl p-4 shadow-2xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-[#E2E4E7]">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-[#1F6F8B]/10 text-[#1F6F8B]">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs sm:text-[13px] font-black text-[#1A1A2E] uppercase tracking-wide">
            1. Tendencia y Evolución Temporal (Observados vs Regularizados)
          </h3>
        </div>

        <div className="flex items-center gap-3 text-[10px] font-bold">
          <div className="flex items-center gap-1.5 bg-emerald-500 text-white px-2.5 py-0.5 rounded-full shadow-xs">
            <span className="w-2 h-2 rounded-full bg-white shadow-xs"></span>
            <span className="font-extrabold tracking-wide">Regularizados</span>
          </div>
          <div className="flex items-center gap-1.5 bg-rose-500 text-white px-2.5 py-0.5 rounded-full shadow-xs">
            <span className="w-2 h-2 rounded-full bg-white shadow-xs"></span>
            <span className="font-extrabold tracking-wide">Pendientes</span>
          </div>
          <div className="flex items-center gap-1.5 bg-indigo-600 text-white px-2.5 py-0.5 rounded-full shadow-xs">
            <span className="w-3 h-1 bg-white rounded-full inline-block"></span>
            <span className="font-extrabold tracking-wide">% Eficacia</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-[200px] select-none">
          <defs>
            <linearGradient id="palletRegGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="50%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <linearGradient id="palletPendGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FB7185" />
              <stop offset="50%" stopColor="#F43F5E" />
              <stop offset="100%" stopColor="#BE123C" />
            </linearGradient>
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#4F46E5" floodOpacity="0.5" />
            </filter>
            <filter id="barShadow" x="-10%" y="-5%" width="120%" height="115%">
              <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const y = paddingTop + chartHeight - (tick / 100) * chartHeight;
            return (
              <g key={`grid-${tick}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#E2E4E7"
                  strokeWidth="0.8"
                  strokeDasharray="2 2"
                />
                {/* Left scale (Quantity) */}
                <text
                  x={paddingLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="#7A8FA6"
                  fontSize="8.5"
                  fontWeight="600"
                >
                  {Math.round((tick / 100) * roundedMax)}
                </text>
                {/* Right scale (%) */}
                <text
                  x={width - paddingRight + 8}
                  y={y + 3.5}
                  textAnchor="start"
                  fill="#7A8FA6"
                  fontSize="8.5"
                  fontWeight="600"
                >
                  {tick}%
                </text>
              </g>
            );
          })}

          {/* Stacked bars for each period */}
          {data.map((d, i) => {
            const cx = getXCoord(i, data.length);
            const bx = cx - barWidth / 2;
            const bottomY = paddingTop + chartHeight;

            const regY = getYCoordQty(d.regularizados);
            const regH = Math.max(0, bottomY - regY);

            const pendY = getYCoordQty(d.regularizados + d.pendientes);
            const pendH = Math.max(0, regY - pendY);

            const isHovered = hoveredIndex === i;

            return (
              <g
                key={`bar-${d.label}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Regularizados (Bottom bar) */}
                <rect
                  x={bx}
                  y={regY}
                  width={barWidth}
                  height={regH}
                  fill="url(#palletRegGrad)"
                  stroke="#059669"
                  strokeWidth="0.5"
                  opacity={isHovered ? 1 : 0.95}
                  rx="3"
                />

                {/* Pendientes (Stacked on top) */}
                <rect
                  x={bx}
                  y={pendY}
                  width={barWidth}
                  height={pendH}
                  fill="url(#palletPendGrad)"
                  stroke="#BE123C"
                  strokeWidth="0.5"
                  opacity={isHovered ? 1 : 0.95}
                  rx="3"
                />

                {/* X axis label */}
                <text
                  x={cx}
                  y={bottomY + 16}
                  textAnchor="middle"
                  fill={isHovered ? '#1E1B4B' : '#64748B'}
                  fontSize="10"
                  fontWeight={isHovered ? '900' : '700'}
                >
                  {d.label}
                </text>
              </g>
            );
          })}

          {/* Trend Line (% Regularización) */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#4F46E5"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#neonGlow)"
            />
          )}

          {/* Point Dots */}
          {data.map((d, i) => {
            const x = getXCoord(i, data.length);
            const y = getYCoordPct(d.pctRegularizacion);
            const isHovered = hoveredIndex === i;

            return (
              <g
                key={`dot-${d.label}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {isHovered && <circle cx={x} cy={y} r="10" fill="#4F46E5" opacity="0.3" />}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 6 : 4}
                  fill="#ffffff"
                  stroke="#4F46E5"
                  strokeWidth="2.5"
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div className="absolute top-2 right-4 bg-[#1A1A2E]/95 text-white text-[11px] px-3 py-1.5 rounded-lg shadow-lg border border-[#236B7A] pointer-events-none z-10">
            <span className="font-bold text-[#E0A23A]">{data[hoveredIndex].label}: </span>
            <span>Total: <strong>{data[hoveredIndex].total}</strong> | </span>
            <span className="text-emerald-400">Reg: {data[hoveredIndex].regularizados} | </span>
            <span className="text-rose-400">Pend: {data[hoveredIndex].pendientes} | </span>
            <span className="text-indigo-300">Eficacia: {data[hoveredIndex].pctRegularizacion.toFixed(1)}%</span>
          </div>
        )}
      </div>

      <div className="text-[10px] text-[#7A8FA6] pt-1 border-t border-[#E2E4E7] flex justify-between">
        <span>Eje X: Periodo de auditoría</span>
        <span>Barras: Pallets observados | Línea azul: % Regularizados</span>
      </div>
    </div>
  );
};
