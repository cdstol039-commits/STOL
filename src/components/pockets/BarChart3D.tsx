import React, { useState } from 'react';

export interface BarDataPoint {
  area: string;
  value: number; // 0 to 100
  totalAsignado?: number;
  enUso?: number;
}

interface BarChart3DProps {
  id: string;
  title: string;
  data: BarDataPoint[];
  theme: 'crimson' | 'blue';
  legendLabel?: string;
}

export const BarChart3D: React.FC<BarChart3DProps> = ({
  id,
  title,
  data,
  theme,
  legendLabel = 'Total',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // SVG dimensions
  const svgWidth = 720;
  const chartHeight = 175;
  const paddingLeft = 54;
  const paddingRight = 20;
  const paddingTop = 26;
  const chartWidth = svgWidth - paddingLeft - paddingRight;

  // Table directly under bars inside SVG for 100% locked alignment with 3D bars
  const tableTop = paddingTop + chartHeight + 8;
  const row1H = 22;
  const row2H = 22;
  const svgHeight = tableTop + row1H + row2H + 8;

  // Y-axis ticks from 100% down to 0% in steps of 10%
  const yTicks = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0];

  // Palette configs for 3D effect: restored original vibrant crimson and blue colors for charts
  const colors = theme === 'crimson' ? {
    front: '#DC2626',        // Classic Crimson Red
    frontGradStart: '#EF4444',
    frontGradEnd: '#991B1B',
    side: '#7F1D1D',         // Dark Crimson Shadow
    top: '#F87171',          // Highlight
    legend: '#DC2626',
  } : {
    front: '#1D70B8',        // Classic Royal Blue
    frontGradStart: '#3B82F6',
    frontGradEnd: '#1E40AF',
    side: '#172554',         // Dark Navy Blue Shadow
    top: '#93C5FD',          // Highlight
    legend: '#1D70B8',
  };

  const getYCoord = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    return paddingTop + chartHeight - (clamped / 100) * chartHeight;
  };

  // Bar spacing
  const barCount = data.length || 1;
  const slotWidth = chartWidth / barCount;
  const barWidth = Math.min(38, slotWidth * 0.52);
  const depth = 8; // 3D depth offset

  return (
    <div id={id} className="bg-white border border-[#E2E4E7] rounded-md p-3 shadow-xs flex flex-col justify-between">
      {/* Chart Title */}
      <div className="text-center mb-2 px-1">
        <h3 className="text-xs sm:text-sm font-black text-[#1A1A2E] tracking-wide uppercase font-sans">
          {title}
        </h3>
      </div>

      {/* SVG Canvas with 3D Columns */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[580px] select-none"
        >
          <defs>
            {/* Front gradient for 3D cylinder appearance */}
            <linearGradient id={`barGrad-${theme}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.frontGradStart} />
              <stop offset="60%" stopColor={colors.front} />
              <stop offset="100%" stopColor={colors.frontGradEnd} />
            </linearGradient>
            
            {/* Top bevel gradient */}
            <linearGradient id={`topGrad-${theme}`} x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor={colors.top} />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Grid lines and Y-axis labels */}
          {yTicks.map((tick) => {
            const y = getYCoord(tick);
            return (
              <g key={tick}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#E2E4E7"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="#7A8FA6"
                  fontSize="9"
                  fontFamily="sans-serif"
                >
                  {tick}%
                </text>
              </g>
            );
          })}

          {/* Baseline */}
          <line
            x1={paddingLeft}
            y1={paddingTop + chartHeight}
            x2={svgWidth - paddingRight}
            y2={paddingTop + chartHeight}
            stroke="#A7B5C5"
            strokeWidth="1.5"
          />

          {/* 3D Bars */}
          {data.map((item, idx) => {
            const slotCenter = paddingLeft + (idx + 0.5) * slotWidth;
            const barX = slotCenter - barWidth / 2;
            const barY = getYCoord(item.value);
            const barH = Math.max(2, paddingTop + chartHeight - barY);
            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={item.area}
                className="cursor-pointer transition-transform duration-150"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* 1. Side Face (Right facet for 3D depth) */}
                <polygon
                  points={`
                    ${barX + barWidth},${barY}
                    ${barX + barWidth + depth},${barY - depth}
                    ${barX + barWidth + depth},${barY + barH - depth}
                    ${barX + barWidth},${barY + barH}
                  `}
                  fill={colors.side}
                  opacity={isHovered ? 0.95 : 0.85}
                />

                {/* 2. Top Face (Slanted top cap for 3D depth) */}
                <polygon
                  points={`
                    ${barX},${barY}
                    ${barX + depth},${barY - depth}
                    ${barX + barWidth + depth},${barY - depth}
                    ${barX + barWidth},${barY}
                  `}
                  fill={colors.top}
                  stroke={colors.front}
                  strokeWidth="0.5"
                />

                {/* 3. Front Face */}
                <rect
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={barH}
                  fill={`url(#barGrad-${theme})`}
                  stroke={colors.side}
                  strokeWidth="0.5"
                  rx="1"
                />

                {/* Value Label above bar */}
                <text
                  x={barX + barWidth / 2}
                  y={barY - depth - 4}
                  textAnchor="middle"
                  fill="#1A1A2E"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {Math.round(item.value)}%
                </text>
              </g>
            );
          })}
          {/* 4. DATA TABLE DIRECTLY BENEATH AND LOCKED TO EACH BAR */}
          {/* Header Column: Área & Legend */}
          <rect
            x={10}
            y={tableTop}
            width={paddingLeft - 10}
            height={row1H}
            fill="#F4F6F7"
            stroke="#E2E4E7"
            strokeWidth="0.8"
          />
          <text
            x={paddingLeft - 8}
            y={tableTop + 14}
            textAnchor="end"
            fill="#7A8FA6"
            fontSize="9"
            fontWeight="bold"
          >
            Área
          </text>

          <rect
            x={10}
            y={tableTop + row1H}
            width={paddingLeft - 10}
            height={row2H}
            fill="#ffffff"
            stroke="#E2E4E7"
            strokeWidth="0.8"
          />
          <rect
            x={14}
            y={tableTop + row1H + 7}
            width={8}
            height={8}
            fill={colors.legend}
            rx="1.5"
          />
          <text
            x={26}
            y={tableTop + row1H + 14}
            fill="#1A1A2E"
            fontSize="8.5"
            fontWeight="bold"
          >
            {legendLabel}
          </text>

          {/* Area Data Columns: exactly aligned with slotCenter and each bar */}
          {data.map((item, idx) => {
            const slotLeft = paddingLeft + idx * slotWidth;
            const slotCenter = paddingLeft + (idx + 0.5) * slotWidth;
            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={`tbl-${item.area}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Row 1: Area description aligned with bar */}
                <rect
                  x={slotLeft}
                  y={tableTop}
                  width={slotWidth}
                  height={row1H}
                  fill={isHovered ? '#E2E4E7' : '#F4F6F7'}
                  stroke="#E2E4E7"
                  strokeWidth="0.8"
                />
                <text
                  x={slotCenter}
                  y={tableTop + 14}
                  textAnchor="middle"
                  fill={isHovered ? (theme === 'crimson' ? '#DC2626' : '#1D70B8') : '#1E293B'}
                  fontSize={slotWidth < 80 ? '7.5' : '8.5'}
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  {item.area}
                </text>

                {/* Row 2: Percentage value aligned with bar */}
                <rect
                  x={slotLeft}
                  y={tableTop + row1H}
                  width={slotWidth}
                  height={row2H}
                  fill={isHovered ? '#F1F5F9' : '#ffffff'}
                  stroke="#E2E4E7"
                  strokeWidth="0.8"
                />
                <text
                  x={slotCenter}
                  y={tableTop + row1H + 15}
                  textAnchor="middle"
                  fill={isHovered ? (theme === 'crimson' ? '#DC2626' : '#1D70B8') : '#0F172A'}
                  fontSize="9.5"
                  fontWeight="black"
                  fontFamily="sans-serif"
                >
                  {Math.round(item.value)}%
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Details */}
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div className="absolute top-2 right-4 bg-[#1A1A2E]/95 text-white text-xs px-3 py-1.5 rounded shadow-lg border border-[#236B7A] pointer-events-none z-10">
            <div className="font-bold text-white border-b border-[#236B7A] pb-0.5 mb-1">
              Área: {data[hoveredIndex].area}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#A7B5C5]">Cumplimiento:</span>
              <span className="font-bold text-[#E0A23A]">
                {data[hoveredIndex].value.toFixed(1)}%
              </span>
            </div>
            {data[hoveredIndex].totalAsignado !== undefined && (
              <div className="text-[10px] text-[#A7B5C5]">
                Pockets: {data[hoveredIndex].enUso} / {data[hoveredIndex].totalAsignado} asignados
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
