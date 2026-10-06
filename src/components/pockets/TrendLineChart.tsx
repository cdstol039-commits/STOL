import React, { useState } from 'react';

export interface DataPoint {
  label: string; // e.g. "38" or "Semana 38"
  value: number; // e.g. 97.5 (%)
  totalAsignado?: number;
  enUso?: number;
  registrados?: number;
}

interface TrendLineChartProps {
  id: string;
  title: string;
  data: DataPoint[];
  maxY?: number;
  yStep?: number;
  color?: string;
  unit?: string;
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({
  id,
  title,
  data,
  maxY = 120,
  yStep = 20,
  color = '#1F6F8B', // Teal brand
  unit = '%',
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);

  // SVG dimensions
  const width = 480;
  const height = 240;
  const paddingLeft = 45;
  const paddingRight = 45;
  const paddingTop = 26;
  const paddingBottom = 38;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Left Y-axis ticks (% scale)
  const yTicks: number[] = [];
  for (let val = maxY; val >= 0; val -= yStep) {
    yTicks.push(val);
  }

  // Right Y-axis (Pockets volume scale)
  const maxPockets = Math.max(
    10,
    ...data.map((d) => d.totalAsignado || d.enUso || d.registrados || 0)
  );
  const roundedMaxPockets = Math.max(10, Math.ceil(maxPockets / 5) * 5);

  const getYCoordPct = (val: number) => {
    const clamped = Math.max(0, Math.min(maxY, val));
    return paddingTop + chartHeight - (clamped / maxY) * chartHeight;
  };

  const getYCoordPockets = (qty: number) => {
    const clamped = Math.max(0, Math.min(roundedMaxPockets, qty));
    return paddingTop + chartHeight - (clamped / roundedMaxPockets) * chartHeight;
  };

  const getXCoord = (index: number, total: number) => {
    if (total <= 1) {
      return paddingLeft + chartWidth / 2;
    }
    const step = chartWidth / total;
    return paddingLeft + step * index + step / 2;
  };

  const barWidth = data.length <= 1 ? 40 : Math.max(14, Math.min(32, (chartWidth / data.length) * 0.5));

  // Build connecting path for the trend line
  let pathD = '';
  if (data.length > 1) {
    pathD = data
      .map((d, i) => {
        const x = getXCoord(i, data.length);
        const y = getYCoordPct(d.value);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }

  return (
    <div id={id} className="bg-white border border-[#E2E4E7] rounded-md p-3 shadow-xs flex flex-col justify-between">
      {/* Header with Title & Dual Legends */}
      <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5 px-1 border-b border-[#E2E4E7] pb-1">
        <h3 className="text-xs sm:text-[13px] font-black text-[#1A1A2E] tracking-wide uppercase font-sans">
          {title}
        </h3>
        <div className="flex items-center gap-2 text-[10px] font-bold text-[#7A8FA6]">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#CBD5E1] border border-[#94A3B8]"></span>
            <span>Asignados</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#2563EB]"></span>
            <span className="text-[#1E40AF]">Operando</span>
          </div>
          <div className="flex items-center gap-1 text-[#DC2626]">
            <span className="w-3 h-0.5 bg-[#DC2626] inline-block"></span>
            <span>% Cumplimiento</span>
          </div>
        </div>
      </div>

      {/* SVG Container (Combo Bars + Line) */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-[220px] select-none"
        >
          <defs>
            <linearGradient id={`trendBarGrad-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
            <linearGradient id={`trendAreaGrad-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#DC2626" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#DC2626" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines and Left Y-axis labels (%) */}
          {yTicks.map((tick) => {
            const y = getYCoordPct(tick);
            return (
              <g key={`ytick-${tick}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#E2E4E7"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <text
                  x={paddingLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="#7A8FA6"
                  fontSize="9.5"
                  fontFamily="sans-serif"
                  fontWeight="600"
                >
                  {tick}%
                </text>
              </g>
            );
          })}

          {/* Right Y-axis labels (Equipos) */}
          {[roundedMaxPockets, Math.round(roundedMaxPockets / 2), 0].map((qty) => {
            const y = getYCoordPockets(qty);
            return (
              <text
                key={`rqty-${qty}`}
                x={width - paddingRight + 6}
                y={y + 3}
                textAnchor="start"
                fill="#A7B5C5"
                fontSize="9"
                fontFamily="sans-serif"
                fontWeight="500"
              >
                {qty} eq.
              </text>
            );
          })}

          {/* X axis baseline */}
          <line
            x1={paddingLeft}
            y1={paddingTop + chartHeight}
            x2={width - paddingRight}
            y2={paddingTop + chartHeight}
            stroke="#A7B5C5"
            strokeWidth="1.2"
          />

          {/* 1. VOLUME BARS LAYER: Total Asignados & Pockets Efectivos */}
          {data.map((d, index) => {
            const cx = getXCoord(index, data.length);
            const bx = cx - barWidth / 2;
            const bottomY = paddingTop + chartHeight;

            const asig = d.totalAsignado ?? (d.enUso ? Math.round(d.enUso * 1.3) : 10);
            const oper = d.enUso ?? d.registrados ?? Math.round((asig * d.value) / 100);

            const asigY = getYCoordPockets(asig);
            const asigH = Math.max(0, bottomY - asigY);

            const operY = getYCoordPockets(oper);
            const operH = Math.max(0, bottomY - operY);

            const isHovered = hoveredPoint?.label === d.label;

            return (
              <g
                key={`bar-${d.label}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(d)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Asignados (Background Bar) */}
                <rect
                  x={bx}
                  y={asigY}
                  width={barWidth}
                  height={asigH}
                  fill={isHovered ? '#A7B5C5' : '#E2E4E7'}
                  rx="3"
                />

                {/* Operando / Registrados (Foreground Bar) */}
                <rect
                  x={bx}
                  y={operY}
                  width={barWidth}
                  height={operH}
                  fill={`url(#trendBarGrad-${id})`}
                  opacity={isHovered ? 1 : 0.88}
                  rx="3"
                />

                {/* X axis week / month label (shows only the week number if week) */}
                <text
                  x={cx}
                  y={paddingTop + chartHeight + 16}
                  textAnchor="middle"
                  fill={isHovered ? '#1A1A2E' : '#7A7A7A'}
                  fontSize="10"
                  fontWeight={isHovered ? 'bold' : '600'}
                  fontFamily="sans-serif"
                >
                  {/semana|sem/i.test(d.label) ? (d.label.replace(/[^0-9]/g, '') || d.label) : d.label}
                </text>
              </g>
            );
          })}

          {/* 2. CONNECTING TREND LINE */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#DC2626"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
          )}

          {/* 3. POINTS AND VALUE LABELS */}
          {data.map((d, index) => {
            const x = getXCoord(index, data.length);
            const y = getYCoordPct(d.value);
            const isHovered = hoveredPoint?.label === d.label;

            return (
              <g
                key={`point-${d.label}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(d)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Glow on hover */}
                {isHovered && (
                  <circle
                    cx={x}
                    cy={y}
                    r="10"
                    fill="#DC2626"
                    opacity="0.25"
                  />
                )}

                {/* Point circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 5.5 : 4}
                  fill="#0F172A"
                  stroke="#DC2626"
                  strokeWidth="2"
                  className="transition-all"
                />

                {/* Percentage value tag */}
                <g transform={`translate(${x}, ${y - 10})`}>
                  <rect
                    x="-18"
                    y="-9"
                    width="36"
                    height="12"
                    rx="2"
                    fill="#1A1A2E"
                    opacity={isHovered ? 1 : 0.88}
                  />
                  <text
                    x="0"
                    y="-1"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="8"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                  >
                    {d.value.toFixed(1)}%
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Info */}
        {hoveredPoint && (
          <div className="absolute top-2 right-12 bg-[#1A1A2E]/95 text-white text-[11px] px-2.5 py-1 rounded shadow-md pointer-events-none z-10 border border-[#236B7A] flex items-center gap-2">
            <span className="font-bold text-[#E0A23A]">{hoveredPoint.label}:</span>
            <span>Rendimiento: <strong className="text-[#A7B5C5]">{hoveredPoint.value.toFixed(1)}%</strong></span>
            {hoveredPoint.totalAsignado !== undefined && (
              <span className="text-[#7A8FA6]">
                (Pockets: {hoveredPoint.enUso ?? hoveredPoint.registrados ?? Math.round((hoveredPoint.totalAsignado * hoveredPoint.value) / 100)} / {hoveredPoint.totalAsignado})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Axis title footer */}
      <div className="text-center pt-1 border-t border-[#E2E4E7] flex items-center justify-between px-1">
        <span className="text-[10px] text-[#7A8FA6] font-semibold tracking-wider uppercase">
          Eje X: Semanas de Operación
        </span>
        <span className="text-[10px] text-[#A7B5C5]">
          Barras: Volumen Pockets | Línea: % Cumplimiento
        </span>
      </div>
    </div>
  );
};
