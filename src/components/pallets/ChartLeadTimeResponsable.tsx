import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  Zap,
  MapPin,
  TrendingDown,
  Award,
  Layers,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { PalletObservation } from '../../types/pallets';

interface ChartLeadTimeResponsableProps {
  records: PalletObservation[];
}

interface AreaLeadTimeSummary {
  area: string;
  totalRegularizados: number;
  promedioDias: number;
  d0Count: number; // Mismo día (0 días)
  d1Count: number; // 1 día
  d2Count: number; // 2 días
  d3PlusCount: number; // 3+ días
  pctMismoDia: number;
  eficienciaRanking: number;
}

export const ChartLeadTimeResponsable: React.FC<ChartLeadTimeResponsableProps> = ({ records }) => {
  const [activeTab, setActiveTab] = useState<'distribucion' | 'areas'>('distribucion');

  // Filtrar estrictamente a los PALLETS REGULARIZADOS como solicitó el usuario
  const regularizedRecords = useMemo(() => {
    return records.filter((r) => r.estado !== 'PENDIENTE');
  }, [records]);

  const totalRegularizados = regularizedRecords.length;

  // 1. ¿Cuánto se demoran y qué cantidad? (Distribución global de tiempos de regularización)
  const timeDistribution = useMemo(() => {
    let d0 = 0; // Mismo día
    let d1 = 0; // 1 día
    let d2 = 0; // 2 días
    let d3plus = 0; // 3+ días
    let sumDias = 0;

    regularizedRecords.forEach((r) => {
      const dias = typeof r.leadTimeDias === 'number' && !isNaN(r.leadTimeDias) ? Math.max(0, r.leadTimeDias) : 0;
      sumDias += dias;
      if (dias <= 0) d0 += 1;
      else if (dias === 1) d1 += 1;
      else if (dias === 2) d2 += 1;
      else d3plus += 1;
    });

    const avg = totalRegularizados > 0 ? sumDias / totalRegularizados : 0;

    return {
      promedioGeneral: avg,
      d0: {
        label: 'Mismo Día (0 días)',
        count: d0,
        pct: totalRegularizados > 0 ? (d0 / totalRegularizados) * 100 : 0,
        color: 'from-emerald-500 to-teal-600',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        desc: 'Resolución inmediata (< 24 horas)',
      },
      d1: {
        label: '1 Día (24 horas)',
        count: d1,
        pct: totalRegularizados > 0 ? (d1 / totalRegularizados) * 100 : 0,
        color: 'from-blue-500 to-indigo-600',
        badge: 'bg-blue-100 text-blue-800 border-blue-300',
        desc: 'Resolución estándar en piso',
      },
      d2: {
        label: '2 Días (48 horas)',
        count: d2,
        pct: totalRegularizados > 0 ? (d2 / totalRegularizados) * 100 : 0,
        color: 'from-amber-500 to-orange-500',
        badge: 'bg-amber-100 text-amber-800 border-amber-300',
        desc: 'Atención con demora moderada',
      },
      d3plus: {
        label: '3+ Días (72+ horas)',
        count: d3plus,
        pct: totalRegularizados > 0 ? (d3plus / totalRegularizados) * 100 : 0,
        color: 'from-rose-500 to-red-600',
        badge: 'bg-rose-100 text-rose-800 border-rose-300',
        desc: 'Regularización tardía o crítica',
      },
    };
  }, [regularizedRecords, totalRegularizados]);

  // 2. ¿Y qué áreas? (Desglose de tiempos y cantidades por área)
  const areasSummary: AreaLeadTimeSummary[] = useMemo(() => {
    const map = new Map<string, {
      total: number;
      sumDias: number;
      d0: number;
      d1: number;
      d2: number;
      d3plus: number;
    }>();

    regularizedRecords.forEach((r) => {
      const area = (r.area || 'DESPACHO').toUpperCase().trim();
      const dias = typeof r.leadTimeDias === 'number' && !isNaN(r.leadTimeDias) ? Math.max(0, r.leadTimeDias) : 0;

      if (!map.has(area)) {
        map.set(area, { total: 0, sumDias: 0, d0: 0, d1: 0, d2: 0, d3plus: 0 });
      }

      const item = map.get(area)!;
      item.total += 1;
      item.sumDias += dias;
      if (dias <= 0) item.d0 += 1;
      else if (dias === 1) item.d1 += 1;
      else if (dias === 2) item.d2 += 1;
      else item.d3plus += 1;
    });

    const list = Array.from(map.entries()).map(([area, data]) => {
      const avg = data.total > 0 ? data.sumDias / data.total : 0;
      const pctMismoDia = data.total > 0 ? (data.d0 / data.total) * 100 : 0;

      return {
        area,
        totalRegularizados: data.total,
        promedioDias: avg,
        d0Count: data.d0,
        d1Count: data.d1,
        d2Count: data.d2,
        d3PlusCount: data.d3plus,
        pctMismoDia,
        eficienciaRanking: 0,
      };
    });

    // Ordenar primero por menor tiempo promedio (más rápido), luego por volumen
    list.sort((a, b) => a.promedioDias - b.promedioDias || b.totalRegularizados - a.totalRegularizados);
    list.forEach((item, idx) => {
      item.eficienciaRanking = idx + 1;
    });

    return list;
  }, [regularizedRecords]);

  const fastestArea = areasSummary[0] || null;

  return (
    <div className="bg-white border-2 border-[#CBD5E1] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between pb-2.5 mb-3 border-b-2 border-[#E2E8F0] gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-xs font-black text-xs">
              3
            </div>
            <div>
              <h3 className="text-xs font-black text-[#0F172A] uppercase tracking-wide">
                LEAD TIME DE PALLETS REGULARIZADOS
              </h3>
              <p className="text-[11px] text-[#64748B] font-semibold">
                Tiempos de regularización: cuánto demoran, cantidad de pallets y qué áreas corresponden
              </p>
            </div>
          </div>

          {/* Selector de Vista: Distribución vs Por Área */}
          <div className="flex items-center gap-1 bg-[#F1F5F9] p-0.5 rounded-lg border border-[#CBD5E1]">
            <button
              onClick={() => setActiveTab('distribucion')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black transition-all cursor-pointer ${
                activeTab === 'distribucion'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>Tiempos y Cantidad</span>
            </button>
            <button
              onClick={() => setActiveTab('areas')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black transition-all cursor-pointer ${
                activeTab === 'areas'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <MapPin className="w-3 h-3 text-blue-400" />
              <span>Desglose por Áreas</span>
            </button>
          </div>
        </div>

        {/* Resumen Superior de Indicadores */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
          <div className="py-1 px-2 rounded-lg bg-slate-900 text-white shadow-2xs">
            <div className="text-[9px] uppercase font-bold text-slate-300">Total Regularizados</div>
            <div className="text-base font-black text-white">{totalRegularizados}</div>
          </div>
          <div className="py-1 px-2 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900">
            <div className="text-[9px] uppercase font-black text-emerald-700 flex items-center justify-center gap-1">
              <Zap className="w-2.5 h-2.5 text-emerald-600" />
              Tiempo Promedio
            </div>
            <div className="text-base font-black text-emerald-800">
              {timeDistribution.promedioGeneral.toFixed(1)} <span className="text-[10px] font-bold">días</span>
            </div>
          </div>
          <div className="py-1 px-2 rounded-lg bg-blue-50 border border-blue-300 text-blue-900">
            <div className="text-[9px] uppercase font-black text-blue-700 flex items-center justify-center gap-1">
              <Award className="w-2.5 h-2.5 text-blue-600" />
              Área Más Rápida
            </div>
            <div className="text-base font-black text-blue-800 truncate" title={fastestArea?.area}>
              {fastestArea ? fastestArea.area : 'N/A'}
              <span className="text-[10px] font-bold block">
                {fastestArea ? `(${fastestArea.promedioDias.toFixed(1)}d prom.)` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* VISTA 1: ¿CUÁNTO SE DEMORAN Y LA CANTIDAD? */}
        {activeTab === 'distribucion' && (
          <div className="space-y-3">
            {totalRegularizados === 0 ? (
              <div className="bg-[#F8FAFC] p-8 rounded-xl border border-[#CBD5E1] text-center space-y-1">
                <p className="text-xs font-black text-slate-700">
                  No hay pallets regularizados con los filtros seleccionados
                </p>
                <p className="text-[11px] text-slate-500">
                  Si tiene el filtro de Estatus en "Pendientes", cámbielo a "Todos" o "Regularizadas" para ver las métricas de Lead Time.
                </p>
              </div>
            ) : (
              <>
                {/* Gráfico Visual de Distribución de Tiempos */}
                <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#CBD5E1] space-y-2.5">
                  <div className="flex justify-between items-center text-[10.5px] font-black text-slate-700 pb-1.5 border-b border-slate-200">
                    <span>Rango de Demora en Regularizar</span>
                    <span>Cantidad y Porcentaje</span>
                  </div>

                  {[timeDistribution.d0, timeDistribution.d1, timeDistribution.d2, timeDistribution.d3plus].map((item) => (
                    <div key={item.label} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-black text-[#0F172A]">{item.label}</span>
                          <span className="text-[10px] text-[#64748B] block font-medium">{item.desc}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-[#0F172A]">{item.count} pallets</span>
                          <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-black border ${item.badge}`}>
                            {item.pct.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Barra de Progreso */}
                      <div className="w-full bg-slate-100 h-3 rounded-md overflow-hidden p-0.5 border border-slate-200">
                        <div
                          style={{ width: `${Math.max(item.count > 0 ? 6 : 0, item.pct)}%` }}
                          className={`h-full rounded-xs bg-gradient-to-r ${item.color} flex items-center justify-end pr-1 text-[8.5px] text-white font-black transition-all duration-300`}
                        >
                          {item.pct >= 12 && `${item.pct.toFixed(0)}%`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Resumen rápido de áreas para esta vista */}
                <div className="bg-emerald-50/50 border border-emerald-200 p-2.5 rounded-xl flex items-center justify-between text-[11px]">
                  <span className="font-bold text-emerald-900">
                    {timeDistribution.d0.count + timeDistribution.d1.count} de {totalRegularizados} pallets (
                    {totalRegularizados > 0
                      ? (((timeDistribution.d0.count + timeDistribution.d1.count) / totalRegularizados) * 100).toFixed(0)
                      : 0}
                    %) se regularizaron en 24 horas o menos.
                  </span>
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                    Alta Eficiencia
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* VISTA 2: ¿Y QUÉ ÁREAS? (DESGLOSE POR ÁREA) */}
        {activeTab === 'areas' && (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] font-black uppercase">
                    <th className="py-2 px-3 border-r border-slate-700">Área</th>
                    <th className="py-2 px-2 text-center border-r border-slate-700">Cant. Reg.</th>
                    <th className="py-2 px-2 text-center border-r border-slate-700 text-emerald-300">0 días</th>
                    <th className="py-2 px-2 text-center border-r border-slate-700 text-blue-300">1 día</th>
                    <th className="py-2 px-2 text-center border-r border-slate-700 text-amber-300">2+ días</th>
                    <th className="py-2 px-3 text-center bg-teal-900 text-teal-200">Tiempo Prom.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px] font-semibold">
                  {areasSummary.map((item) => (
                    <tr key={item.area} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-black text-slate-800 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-700">
                          #{item.eficienciaRanking}
                        </span>
                        {item.area}
                      </td>
                      <td className="py-2 px-2 text-center font-black text-slate-900">
                        {item.totalRegularizados}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-emerald-700 bg-emerald-50/50">
                        {item.d0Count}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-blue-700 bg-blue-50/50">
                        {item.d1Count}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-amber-800 bg-amber-50/50">
                        {item.d2Count + item.d3PlusCount}
                      </td>
                      <td className="py-2 px-3 text-center font-black text-teal-900 bg-teal-50">
                        {item.promedioDias.toFixed(1)} días
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Ranking visual por área */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {areasSummary.map((item) => (
                <div key={item.area} className="bg-[#F8FAFC] p-2.5 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-black text-[#0F172A]">{item.area}</span>
                    <span className="text-[10px] font-black text-emerald-700">
                      {item.promedioDias.toFixed(1)} días prom.
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[9.5px] text-[#64748B]">
                    <span>{item.totalRegularizados} pallets</span>
                    <span>•</span>
                    <span>{item.pctMismoDia.toFixed(0)}% el mismo día</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-2.5 pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[10px] text-[#64748B]">
        <span>Solo considera pallets con estatus REGULARIZADA</span>
        <span className="font-bold text-[#0F172A]">
          {timeDistribution.d0.pct.toFixed(0)}% cerrados el mismo día
        </span>
      </div>
    </div>
  );
};
