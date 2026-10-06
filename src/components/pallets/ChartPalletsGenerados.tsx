import React, { useState, useMemo } from 'react';
import { Calendar, Layers, BarChart3, TrendingUp, Sparkles, MapPin, Table } from 'lucide-react';
import { PalletObservation } from '../../types/pallets';

interface ChartPalletsGeneradosProps {
  records: PalletObservation[];
}

interface DayAreaSummary {
  fecha: string;
  shortFecha: string;
  totalDia: number;
  areas: Record<string, number>;
}

export const ChartPalletsGenerados: React.FC<ChartPalletsGeneradosProps> = ({ records }) => {
  const [chartStyle, setChartStyle] = useState<'stacked' | 'grouped'>('stacked');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // 1. Extraer todas las áreas únicas y definir paleta de colores fija y profesional
  const areaColors: Record<string, { bg: string; gradient: string; text: string; badge: string; border: string }> = {
    'CROSS DOCKING': {
      bg: 'bg-emerald-500',
      gradient: 'from-emerald-500 to-teal-600',
      text: 'text-emerald-700',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      border: 'border-emerald-500',
    },
    'PICKING': {
      bg: 'bg-blue-600',
      gradient: 'from-blue-600 to-indigo-600',
      text: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-800 border-blue-300',
      border: 'border-blue-500',
    },
    'DESPACHO': {
      bg: 'bg-purple-600',
      gradient: 'from-purple-600 to-violet-600',
      text: 'text-purple-700',
      badge: 'bg-purple-100 text-purple-800 border-purple-300',
      border: 'border-purple-500',
    },
    'RECEPCION': {
      bg: 'bg-amber-500',
      gradient: 'from-amber-500 to-orange-500',
      text: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      border: 'border-amber-500',
    },
    'ALMACEN': {
      bg: 'bg-rose-500',
      gradient: 'from-rose-500 to-pink-600',
      text: 'text-rose-700',
      badge: 'bg-rose-100 text-rose-800 border-rose-300',
      border: 'border-rose-500',
    },
  };

  const defaultColor = {
    bg: 'bg-slate-600',
    gradient: 'from-slate-600 to-slate-800',
    text: 'text-slate-700',
    badge: 'bg-slate-100 text-slate-800 border-slate-300',
    border: 'border-slate-500',
  };

  // 2. Agrupación por Día y por Área
  const { dailyData, allAreas, grandTotal, maxDayTotal, peakDay, topArea } = useMemo(() => {
    const dayMap = new Map<string, Record<string, number>>();
    const areaSet = new Set<string>();
    const areaTotals: Record<string, number> = {};

    records.forEach((r) => {
      const fecha = r.fecha || 'Sin Fecha';
      const area = (r.area || 'DESPACHO').toUpperCase().trim();
      areaSet.add(area);
      areaTotals[area] = (areaTotals[area] || 0) + 1;

      if (!dayMap.has(fecha)) {
        dayMap.set(fecha, {});
      }
      const dayAreas = dayMap.get(fecha)!;
      dayAreas[area] = (dayAreas[area] || 0) + 1;
    });

    const areasList = Array.from(areaSet).sort((a, b) => (areaTotals[b] || 0) - (areaTotals[a] || 0));

    // Ordenar fechas cronológicamente
    const dayEntries = Array.from(dayMap.entries()).sort((a, b) => {
      const partsA = a[0].split('/');
      const partsB = b[0].split('/');
      if (partsA.length === 3 && partsB.length === 3) {
        const dA = new Date(parseInt(partsA[2], 10), parseInt(partsA[1], 10) - 1, parseInt(partsA[0], 10)).getTime();
        const dB = new Date(parseInt(partsB[2], 10), parseInt(partsB[1], 10) - 1, parseInt(partsB[0], 10)).getTime();
        return dA - dB;
      }
      return a[0].localeCompare(b[0]);
    });

    let maxTot = 0;
    let peak = { fecha: 'N/A', total: 0 };

    const dailySummary: DayAreaSummary[] = dayEntries.map(([fecha, areas]) => {
      const totalDia = Object.values(areas).reduce((sum, val) => sum + val, 0);
      if (totalDia > maxTot) {
        maxTot = totalDia;
        peak = { fecha, total: totalDia };
      }

      const parts = fecha.split('/');
      const shortFecha = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : fecha;

      return {
        fecha,
        shortFecha,
        totalDia,
        areas,
      };
    });

    let maxAreaCount = 0;
    let topAreaName = 'N/A';
    Object.entries(areaTotals).forEach(([a, count]) => {
      if (count > maxAreaCount) {
        maxAreaCount = count;
        topAreaName = a;
      }
    });

    return {
      dailyData: dailySummary,
      allAreas: areasList,
      grandTotal: records.length,
      maxDayTotal: Math.max(1, maxTot),
      peakDay: peak,
      topArea: { name: topAreaName, count: maxAreaCount },
    };
  }, [records]);

  return (
    <div className="bg-white border-2 border-[#CBD5E1] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
      <div>
        {/* Header con Controles */}
        <div className="flex flex-wrap items-center justify-between pb-2.5 mb-3 border-b-2 border-[#E2E8F0] gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-xs font-black text-xs">
              2
            </div>
            <div>
              <h3 className="text-xs font-black text-[#0F172A] uppercase tracking-wide">
                PALLETS REPORTADOS POR DÍA Y POR ÁREA
              </h3>
              <p className="text-[11px] text-[#64748B] font-semibold">
                Monitoreo diario de incidencias reportadas clasificado por área de origen
              </p>
            </div>
          </div>

          {/* Selector de Tipo de Vista (Apilada / Agrupada) */}
          <div className="flex items-center gap-1 bg-[#F1F5F9] p-0.5 rounded-lg border border-[#CBD5E1]">
            <button
              onClick={() => setChartStyle('stacked')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black transition-all cursor-pointer ${
                chartStyle === 'stacked'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Layers className="w-3 h-3 text-amber-400" />
              <span>Barras Apiladas</span>
            </button>
            <button
              onClick={() => setChartStyle('grouped')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black transition-all cursor-pointer ${
                chartStyle === 'grouped'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <BarChart3 className="w-3 h-3 text-blue-400" />
              <span>Columnas por Área</span>
            </button>
          </div>
        </div>

        {/* Mini KPI Cards de Alto Impacto */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
          <div className="py-1 px-2 rounded-lg bg-slate-900 text-white shadow-2xs">
            <div className="text-[9px] uppercase font-bold text-slate-300">Total Reportados</div>
            <div className="text-base font-black text-white">{grandTotal}</div>
          </div>
          <div className="py-1 px-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-900">
            <div className="text-[9px] uppercase font-black text-amber-700 flex items-center justify-center gap-1">
              <TrendingUp className="w-2.5 h-2.5 text-amber-600" />
              Día Pico
            </div>
            <div className="text-base font-black text-amber-800">
              {peakDay.total} <span className="text-[10px] font-bold">({peakDay.fecha})</span>
            </div>
          </div>
          <div className="py-1 px-2 rounded-lg bg-blue-50 border border-blue-300 text-blue-900">
            <div className="text-[9px] uppercase font-black text-blue-700 flex items-center justify-center gap-1">
              <MapPin className="w-2.5 h-2.5 text-blue-600" />
              Área Principal
            </div>
            <div className="text-base font-black text-blue-800">
              {topArea.count} <span className="text-[10px] font-bold">({topArea.name})</span>
            </div>
          </div>
        </div>

        {/* Leyenda interactiva de Áreas con colores ejecutivos */}
        <div className="flex flex-wrap items-center gap-2 mb-3 bg-white p-2 rounded-xl border border-slate-200">
          <span className="text-[10px] font-black text-[#64748B] uppercase tracking-wider">Áreas:</span>
          {allAreas.map((area) => {
            const theme = areaColors[area] || defaultColor;
            const areaTotal = dailyData.reduce((sum, d) => sum + (d.areas[area] || 0), 0);
            return (
              <div
                key={area}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10.5px] font-black border ${theme.badge}`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${theme.bg} shadow-xs`} />
                <span>{area}:</span>
                <span className="font-extrabold">{areaTotal}</span>
                <span className="text-[9px] opacity-75">
                  ({grandTotal > 0 ? ((areaTotal / grandTotal) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            );
          })}
        </div>

        {/* GRÁFICO VISUAL PRINCIPAL */}
        <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#CBD5E1]">
          {dailyData.length === 0 ? (
            <div className="py-12 text-center text-[#64748B] font-bold text-xs">
              No hay datos para mostrar en este período
            </div>
          ) : (
            <div>
              {/* Contenedor de Barras Verticales por Día */}
              <div className="h-52 pt-6 pb-2 border-b border-slate-200 flex items-end justify-around gap-2 px-2">
                {dailyData.map((d) => {
                  const isDaySelected = selectedDay === d.fecha;
                  const totalBarHeightPct = Math.max(12, (d.totalDia / maxDayTotal) * 100);

                  return (
                    <div
                      key={d.fecha}
                      onClick={() => setSelectedDay(isDaySelected ? null : d.fecha)}
                      className={`flex-1 flex flex-col items-center justify-end h-full transition-all group relative cursor-pointer ${
                        isDaySelected ? 'scale-105' : ''
                      }`}
                    >
                      {/* Tooltip con desglose completo */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-16 z-30 bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-xl pointer-events-none whitespace-nowrap border border-white/20">
                        <div className="font-black border-b border-white/20 pb-1 mb-1 text-amber-300">
                          {d.fecha} – Total: {d.totalDia} pallets
                        </div>
                        {allAreas.map((a) => {
                          const cnt = d.areas[a] || 0;
                          if (cnt === 0) return null;
                          return (
                            <div key={a} className="flex justify-between gap-3 text-[9.5px]">
                              <span>{a}:</span>
                              <strong>{cnt} ({((cnt / d.totalDia) * 100).toFixed(0)}%)</strong>
                            </div>
                          );
                        })}
                      </div>

                      {/* Etiqueta de Total del Día arriba de la columna */}
                      <div className="text-center mb-1.5">
                        <span className="bg-slate-900 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                          {d.totalDia}
                        </span>
                      </div>

                      {/* Renderizado de Barra: Apilada vs Agrupada */}
                      {chartStyle === 'stacked' ? (
                        /* Barra Apilada Vertical */
                        <div
                          style={{ height: `${totalBarHeightPct}%` }}
                          className={`w-full max-w-[44px] rounded-t-lg overflow-hidden flex flex-col-reverse shadow-xs border border-slate-300 transition-all ${
                            isDaySelected ? 'ring-2 ring-blue-500' : ''
                          }`}
                        >
                          {allAreas.map((area) => {
                            const count = d.areas[area] || 0;
                            if (count === 0) return null;
                            const segmentPct = (count / d.totalDia) * 100;
                            const theme = areaColors[area] || defaultColor;

                            return (
                              <div
                                key={area}
                                style={{ height: `${segmentPct}%` }}
                                className={`w-full bg-gradient-to-t ${theme.gradient} transition-all relative flex items-center justify-center text-[9px] text-white font-black hover:brightness-110`}
                                title={`${area}: ${count} pallets`}
                              >
                                {segmentPct >= 18 && count}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        /* Barras Agrupadas por Área */
                        <div className="w-full flex items-end justify-center gap-0.5 h-full">
                          {allAreas.map((area) => {
                            const count = d.areas[area] || 0;
                            const barHeight = count > 0 ? Math.max(10, (count / maxDayTotal) * 100) : 4;
                            const theme = areaColors[area] || defaultColor;

                            return (
                              <div
                                key={area}
                                style={{ height: `${barHeight}%` }}
                                className={`flex-1 max-w-[12px] rounded-t-sm transition-all bg-gradient-to-t ${theme.gradient} ${
                                  count === 0 ? 'opacity-20' : 'shadow-2xs'
                                }`}
                                title={`${area}: ${count} pallets`}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Eje X: Fechas */}
              <div className="flex items-start justify-around gap-2 px-2 pt-2">
                {dailyData.map((d) => (
                  <div key={d.fecha} className="flex-1 text-center">
                    <span className="text-[11px] font-black text-[#0F172A] block uppercase">
                      {d.shortFecha}
                    </span>
                    <span className="text-[9px] font-bold text-[#64748B]">
                      {d.totalDia} pal.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. Matriz de Cruce Ejecutiva (Área x Día) */}
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] font-black uppercase">
                <th className="py-1.5 px-3 border-r border-slate-700">Área Operativa</th>
                {dailyData.map((d) => (
                  <th key={d.fecha} className="py-1.5 px-2 text-center border-r border-slate-700">
                    {d.shortFecha}
                  </th>
                ))}
                <th className="py-1.5 px-3 text-center bg-blue-900 text-blue-200">Total Área</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[11px] font-semibold">
              {allAreas.map((area) => {
                const theme = areaColors[area] || defaultColor;
                const totalArea = dailyData.reduce((sum, d) => sum + (d.areas[area] || 0), 0);

                return (
                  <tr key={area} className="hover:bg-slate-50 transition-colors">
                    <td className="py-1.5 px-3 font-black text-slate-800 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${theme.bg}`} />
                      {area}
                    </td>
                    {dailyData.map((d) => {
                      const val = d.areas[area] || 0;
                      return (
                        <td
                          key={d.fecha}
                          className={`py-1.5 px-2 text-center font-bold ${
                            val > 0 ? 'text-slate-900 bg-blue-50/40' : 'text-slate-300'
                          }`}
                        >
                          {val > 0 ? val : '–'}
                        </td>
                      );
                    })}
                    <td className="py-1.5 px-3 text-center font-black text-blue-900 bg-blue-50">
                      {totalArea}
                    </td>
                  </tr>
                );
              })}
              {/* Fila de Totales Diarios */}
              <tr className="bg-slate-100 font-black text-slate-900 text-[11px]">
                <td className="py-1.5 px-3 uppercase">Total Día</td>
                {dailyData.map((d) => (
                  <td key={d.fecha} className="py-1.5 px-2 text-center text-blue-800">
                    {d.totalDia}
                  </td>
                ))}
                <td className="py-1.5 px-3 text-center text-white bg-slate-900">
                  {grandTotal}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-2.5 pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[10px] text-[#64748B]">
        <span>Pase el cursor sobre las columnas para ver el detalle de cada día</span>
        <span className="font-bold text-[#0F172A]">Concentración Máxima: {peakDay.fecha} ({peakDay.total} pallets)</span>
      </div>
    </div>
  );
};
