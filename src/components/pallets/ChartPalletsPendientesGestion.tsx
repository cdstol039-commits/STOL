import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Truck,
  Layers,
  MapPin,
  Sparkles,
  Search,
  Eye,
  Percent,
  Hash,
  X,
  ChevronRight,
  ArrowRight,
  ArrowUpRight,
  HelpCircle,
  Package,
} from 'lucide-react';
import { PalletObservation } from '../../types/pallets';
import { PalletFilterState } from './PalletFilterBar';

interface ChartPalletsPendientesGestionProps {
  allRecords: PalletObservation[];
  filteredRecords: PalletObservation[];
  filters: PalletFilterState;
  onFilterChange?: (filters: PalletFilterState) => void;
}

type ViewMode = 'both' | 'count' | 'percentage';

interface PendingCategoryGroup {
  id: 'DESPACHADOS' | 'ACCIONABLES' | 'FALTA_MOVER';
  title: string;
  shortLabel: string;
  description: string;
  count: number;
  pct: number;
  pallets: PalletObservation[];
  color: string;
  gradient: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  icon: React.ReactNode;
}

export const ChartPalletsPendientesGestion: React.FC<ChartPalletsPendientesGestionProps> = ({
  allRecords,
  filteredRecords,
  filters,
  onFilterChange,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('both');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [modalSearch, setModalSearch] = useState<string>('');

  // 1. Filtrar registros de pallets pendientes
  // Si el usuario tenía seleccionado filtro estado === 'REGULARIZADA', tomamos los pendientes de allRecords respetando filtros temporales/área para que este gráfico siempre provea el informe de pendientes
  const pendingRecords = useMemo(() => {
    let pool = filteredRecords.filter((r) => r.estado === 'PENDIENTE');

    if (pool.length === 0 && filters.estado === 'REGULARIZADA') {
      pool = allRecords.filter((r) => {
        if (r.estado !== 'PENDIENTE') return false;
        if (filters.mes !== 'TODOS' && r.mes !== filters.mes) return false;
        if (filters.semana !== 'TODAS' && r.semana !== filters.semana) return false;
        if (filters.area !== 'TODAS' && (r.area || '').toUpperCase().trim() !== filters.area.toUpperCase().trim()) return false;
        return true;
      });
    }

    return pool;
  }, [filteredRecords, allRecords, filters.estado, filters.mes, filters.semana, filters.area]);

  const totalPendientes = pendingRecords.length;

  // 2. Clasificación en las 3 situaciones operativas solicitadas (Estrictamente SIN usar '-')
  const categories: PendingCategoryGroup[] = useMemo(() => {
    const despachados: PalletObservation[] = [];
    const accionables: PalletObservation[] = [];
    const faltaMover: PalletObservation[] = [];

    pendingRecords.forEach((r) => {
      const sub = String(r.subMotivo || '').toLowerCase().trim();

      // Caso 1: Fueron despachados sin levantar la observación
      if (sub.includes('despachad') || sub.includes('salio') || sub.includes('enviad')) {
        despachados.push(r);
      }
      // Caso 2: Falta mover lógicamente / En drop sin ubicar físicamente
      else if (sub.includes('drop') || sub.includes('mover') || sub.includes('logica') || sub.includes('fisica') || sub.includes('zona fisica')) {
        faltaMover.push(r);
      }
      // Caso 3: Los que vienen con '-' o vacíos -> Aún pueden ser levantados en piso (SIN colocar '-')
      else {
        accionables.push(r);
      }
    });

    const calcPct = (count: number) => (totalPendientes > 0 ? (count / totalPendientes) * 100 : 0);

    return [
      {
        id: 'DESPACHADOS',
        title: 'Fueron despachados sin levantar la observación',
        shortLabel: 'Despachados sin Subsanar',
        description: 'Mercadería que ya salió a transporte sin corregir la observación (no subsanable en CD)',
        count: despachados.length,
        pct: Number(calcPct(despachados.length).toFixed(1)),
        pallets: despachados,
        color: '#E11D48',
        gradient: 'from-rose-600 via-rose-700 to-red-800',
        badgeBg: 'bg-rose-100',
        badgeText: 'text-rose-900',
        borderColor: 'border-rose-400',
        icon: <Truck className="w-4 h-4 text-rose-200" />,
      },
      {
        id: 'ACCIONABLES',
        title: 'Aún pueden ser levantados en piso',
        shortLabel: 'Subsanables en Piso',
        description: 'Pallets en zona operativa que aún están a tiempo de ser regularizados por el supervisor',
        count: accionables.length,
        pct: Number(calcPct(accionables.length).toFixed(1)),
        pallets: accionables,
        color: '#059669',
        gradient: 'from-emerald-600 via-emerald-700 to-teal-800',
        badgeBg: 'bg-emerald-100',
        badgeText: 'text-emerald-900',
        borderColor: 'border-emerald-400',
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-200" />,
      },
      {
        id: 'FALTA_MOVER',
        title: 'Falta mover lógicamente / En drop sin ubicar físicamente',
        shortLabel: 'Falta Mover Lógicamente',
        description: 'Pallets ubicados lógicamente en el drop pero no dejados en la zona física correspondiente',
        count: faltaMover.length,
        pct: Number(calcPct(faltaMover.length).toFixed(1)),
        pallets: faltaMover,
        color: '#D97706',
        gradient: 'from-amber-500 via-amber-600 to-orange-700',
        badgeBg: 'bg-amber-100',
        badgeText: 'text-amber-900',
        borderColor: 'border-amber-400',
        icon: <Package className="w-4 h-4 text-amber-200" />,
      },
    ];
  }, [pendingRecords, totalPendientes]);

  // Desglose por Área para los pallets pendientes (como en la referencia)
  const areasDistribution = useMemo(() => {
    const map = new Map<string, number>();
    pendingRecords.forEach((r) => {
      const area = (r.area || r.responsablePendiente || 'DESPACHO').toUpperCase().trim();
      map.set(area, (map.get(area) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([area, count]) => ({
        area,
        count,
        pct: totalPendientes > 0 ? (count / totalPendientes) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [pendingRecords, totalPendientes]);

  // Pallets para el modal de inspección
  const inspectedPallets = useMemo(() => {
    let pool = pendingRecords;
    if (selectedCategoryId) {
      const cat = categories.find((c) => c.id === selectedCategoryId);
      if (cat) pool = cat.pallets;
    }

    if (modalSearch.trim()) {
      const q = modalSearch.toLowerCase().trim();
      pool = pool.filter(
        (r) =>
          r.palletId.toLowerCase().includes(q) ||
          r.area.toLowerCase().includes(q) ||
          r.responsable.toLowerCase().includes(q) ||
          r.observacion.toLowerCase().includes(q) ||
          (r.subMotivo && r.subMotivo.toLowerCase().includes(q))
      );
    }

    return pool;
  }, [pendingRecords, selectedCategoryId, categories, modalSearch]);

  const renderMetric = (count: number, pct: number, unit = 'pallets') => {
    if (viewMode === 'count') return <span className="font-black tabular-nums">{count} <span className="text-xs font-bold text-slate-500">{unit}</span></span>;
    if (viewMode === 'percentage') return <span className="font-black tabular-nums">{pct.toFixed(1)}%</span>;
    return (
      <span className="font-black tabular-nums flex items-baseline gap-1.5 flex-wrap">
        <span>{count}</span>
        <span className="text-xs font-bold text-slate-500">({pct.toFixed(1)}%)</span>
      </span>
    );
  };

  // Coordenadas para Donut Chart SVG (Referencia Imagen 1 y 2)
  const donutSlices = useMemo(() => {
    if (totalPendientes === 0) return [];
    let cumulativeAngle = 0;
    return categories.map((cat) => {
      const sliceAngle = (cat.count / totalPendientes) * 360;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + sliceAngle;
      cumulativeAngle += sliceAngle;
      return {
        ...cat,
        startAngle,
        endAngle,
      };
    });
  }, [categories, totalPendientes]);

  // Helper para generar el path SVG de cada arco del Donut
  const getDonutArc = (startAngle: number, endAngle: number, radius = 68, hole = 44) => {
    const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
      const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
      return {
        x: centerX + r * Math.cos(angleInRadians),
        y: centerY + r * Math.sin(angleInRadians),
      };
    };

    const cx = 100;
    const cy = 100;
    // Si el ángulo es exactamente 360, recortar levemente para evitar artefacto SVG
    const effectiveEnd = endAngle - startAngle >= 359.9 ? startAngle + 359.99 : endAngle;

    const startOuter = polarToCartesian(cx, cy, radius, effectiveEnd);
    const endOuter = polarToCartesian(cx, cy, radius, startAngle);
    const startInner = polarToCartesian(cx, cy, hole, effectiveEnd);
    const endInner = polarToCartesian(cx, cy, hole, startAngle);

    const largeArcFlag = effectiveEnd - startAngle <= 180 ? '0' : '1';

    return [
      `M ${startOuter.x} ${startOuter.y}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
      `L ${endInner.x} ${endInner.y}`,
      `A ${hole} ${hole} 0 ${largeArcFlag} 1 ${startInner.x} ${startInner.y}`,
      'Z',
    ].join(' ');
  };

  return (
    <div id="chart-pallets-pendientes-gestion" className="w-full bg-white border-2 border-slate-300 rounded-2xl p-4 sm:p-6 shadow-md space-y-5 font-sans">
      {/* 1. Header Ejecutivo inspirado en las referencias */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b-2 border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-600 via-rose-700 to-red-800 text-white flex items-center justify-center font-black shadow-md border border-rose-500">
            <ShieldAlert className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-wide">
                PALLETS PENDIENTES: GESTIÓN OPERATIVA Y CAUSAS
              </h2>
              <span className="bg-rose-700 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                Total Pendientes: {totalPendientes} Pallets
              </span>
              {filters.area !== 'TODAS' && (
                <span className="bg-blue-100 text-blue-900 border border-blue-300 text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                  <MapPin className="w-3 h-3 text-blue-600" />
                  {filters.area}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Identificación clara de mercadería despachada, pallets aún subsanables en piso e inconsistencias de drop
            </p>
          </div>
        </div>

        {/* Selector de Modo de Visualización: [Ambos (# y %)] [# Cantidad] [% Porcentaje] */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-300 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode('both')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'both' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Ambos (# y %)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('count')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'count' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Hash className="w-3.5 h-3.5 text-blue-400" />
            <span>Cantidad (#)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('percentage')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'percentage' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Percent className="w-3.5 h-3.5 text-emerald-400" />
            <span>Porcentaje (%)</span>
          </button>
        </div>
      </div>

      {totalPendientes === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 space-y-2">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
          <h3 className="text-sm font-black text-slate-800 uppercase">
            No hay pallets pendientes con los filtros actuales
          </h3>
          <p className="text-xs text-slate-500">
            Todos los pallets de este periodo se encuentran regularizados o el filtro no contiene pendientes.
          </p>
        </div>
      ) : (
        <>
          {/* 2. Tres Tarjetas Principales (Las 3 Situaciones Operativas) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                onClick={() => {
                  setSelectedCategoryId(cat.id);
                  setShowDetailModal(true);
                }}
                className={`bg-gradient-to-br ${cat.gradient} text-white rounded-2xl p-5 shadow-md border-2 ${cat.borderColor} relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg flex flex-col justify-between`}
              >
                <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none -mr-6 -mt-6" />

                <div>
                  <div className="flex items-center justify-between z-10 relative">
                    <span className="text-[11px] font-black uppercase tracking-wider text-white/90 flex items-center gap-1.5">
                      <span className="p-1 rounded-lg bg-white/20 text-white">{cat.icon}</span>
                      {cat.shortLabel}
                    </span>
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-white/25 text-white backdrop-blur-xs border border-white/30">
                      {cat.pct.toFixed(1)}%
                    </span>
                  </div>

                  <div className="my-3 z-10 relative">
                    <div className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
                      {viewMode === 'percentage' ? `${cat.pct.toFixed(1)}%` : cat.count}
                      {viewMode === 'both' && (
                        <span className="text-xl sm:text-2xl font-bold text-white/80 ml-2">
                          ({cat.pct.toFixed(1)}%)
                        </span>
                      )}
                      {viewMode === 'count' && (
                        <span className="text-xs font-bold text-white/80 ml-2">pallets</span>
                      )}
                    </div>
                    <p className="text-xs text-white/90 font-medium mt-1 leading-snug">
                      {cat.title}
                    </p>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-white/20 text-[11px] font-extrabold text-white flex items-center justify-between z-10 relative mt-2">
                  <span className="text-[10px] text-white/80 font-normal">Clic para auditar</span>
                  <span className="bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-full font-black text-[10.5px] flex items-center gap-1">
                    Ver {cat.count} pallets <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* 3. Panel Visual Inspirado en las Referencias: Donut Chart + Barras Horizontales y Áreas */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 sm:p-5">
            {/* Donut Chart (Referencia Imagen 1 y 2) - 5 Columnas */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-black uppercase text-slate-800 tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Distribución Porcentual (Donut)
              </span>

              {/* Gráfico Donut SVG con Centro Informativo */}
              <div className="relative w-48 h-48 my-1 flex items-center justify-center">
                <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                  {donutSlices.map((slice) => (
                    <path
                      key={slice.id}
                      d={getDonutArc(slice.startAngle, slice.endAngle)}
                      fill={slice.color}
                      className="transition-all duration-300 hover:opacity-85 cursor-pointer"
                      onClick={() => {
                        setSelectedCategoryId(slice.id);
                        setShowDetailModal(true);
                      }}
                    >
                      <title>{`${slice.title}: ${slice.count} pallets (${slice.pct}%)`}</title>
                    </path>
                  ))}
                </svg>

                {/* Texto Central del Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
                    {totalPendientes}
                  </span>
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider mt-0.5">
                    Pendientes
                  </span>
                  <span className="text-[9.5px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-md mt-1 border border-rose-200">
                    100% Parque
                  </span>
                </div>
              </div>

              {/* Leyenda del Donut */}
              <div className="w-full space-y-1.5 mt-3 pt-3 border-t border-slate-100 text-xs">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCategoryId(c.id);
                      setShowDetailModal(true);
                    }}
                    className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="text-slate-800 font-bold text-[11px] truncate max-w-[170px]">
                        {c.shortLabel}
                      </span>
                    </div>
                    <span className="font-black text-slate-900 text-xs">
                      {renderMetric(c.count, c.pct)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Barras Horizontales y Desglose por Área (Referencia Imagen 1 y 2) - 7 Columnas */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-4 p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                  <span>Proporción por Causa Operativa</span>
                  <span className="text-[11px] text-slate-400 font-medium">100% de la carga pendiente</span>
                </h3>

                {/* Barras Horizontales con ranking */}
                <div className="space-y-3">
                  {categories.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCategoryId(c.id);
                        setShowDetailModal(true);
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50/50 transition-all cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-slate-900 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.title}
                        </span>
                        <span className="font-black" style={{ color: c.color }}>
                          {renderMetric(c.count, c.pct)}
                        </span>
                      </div>

                      {/* Barra de progreso */}
                      <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 shadow-inner"
                          style={{
                            width: `${c.pct}%`,
                            backgroundColor: c.color,
                          }}
                        />
                      </div>

                      <p className="text-[10.5px] text-slate-500 font-medium leading-tight">
                        {c.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ranking por Área Responsable */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider block mb-2">
                  Concentración de Pendientes por Área:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {areasDistribution.map((a) => (
                    <div key={a.area} className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between">
                      <span className="text-[10.5px] font-black text-slate-800 truncate" title={a.area}>
                        {a.area}
                      </span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-base font-black text-rose-700">{a.count}</span>
                        <span className="text-[10px] font-bold text-slate-500">({a.pct.toFixed(0)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Botón inferior para Inspección Completa de Pallets Pendientes */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-500 font-medium">
              Audita cada LPN, área, supervisor y causa de los pallets pendientes
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryId(null);
                setShowDetailModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-900 to-rose-950 hover:from-slate-800 hover:to-rose-900 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer"
            >
              <Eye className="w-4 h-4 text-amber-400" />
              <span>Ver Matriz de Pallets Pendientes ({totalPendientes})</span>
            </button>
          </div>
        </>
      )}

      {/* 5. Modal de Inspección Detallada de Pallets Pendientes */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-400/30">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-wide">
                    Detalle de Pallets Pendientes de Regularización
                  </h3>
                  <p className="text-xs text-slate-300 font-medium">
                    {selectedCategoryId
                      ? `Filtrado por: «${categories.find((c) => c.id === selectedCategoryId)?.title}»`
                      : 'Todas las situaciones operativas'} • {inspectedPallets.length} pallets
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Filters */}
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-slate-700 uppercase text-[10.5px]">Situación:</span>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId(null)}
                  className={`px-3 py-1 rounded-lg font-black transition-all cursor-pointer ${
                    selectedCategoryId === null
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Todos ({pendingRecords.length})
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(c.id)}
                    className={`px-3 py-1 rounded-lg font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedCategoryId === c.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : `${c.badgeBg} ${c.badgeText} border border-slate-300 hover:brightness-95`
                    }`}
                  >
                    <span>{c.shortLabel}</span>
                    <span className="bg-white/50 px-1 rounded-full text-[10px] font-black">
                      {c.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Input búsqueda */}
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar pallet, área, supervisor..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-rose-600 font-medium"
                />
              </div>
            </div>

            {/* Modal Table Content */}
            <div className="flex-1 overflow-y-auto p-4 max-h-[500px] scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead className="bg-slate-900 text-white font-black sticky top-0 z-10 shadow-xs text-[10.5px] uppercase">
                  <tr>
                    <th className="p-2.5 w-10 text-center">#</th>
                    <th className="p-2.5">N° Pallet (LPN)</th>
                    <th className="p-2.5">Fecha Reporte</th>
                    <th className="p-2.5">Área Operativa</th>
                    <th className="p-2.5">Supervisor</th>
                    <th className="p-2.5">Motivo Observación</th>
                    <th className="p-2.5">Situación Operativa</th>
                    <th className="p-2.5 text-center">Lead Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                  {inspectedPallets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 italic font-semibold">
                        No se encontraron registros con los criterios seleccionados.
                      </td>
                    </tr>
                  ) : (
                    inspectedPallets.map((r, idx) => {
                      const sub = String(r.subMotivo || '').toLowerCase().trim();
                      let statusBadge = (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 font-black px-2.5 py-0.5 rounded-full text-[10.5px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          Aún Puede Levantarse
                        </span>
                      );

                      if (sub.includes('despachad') || sub.includes('salio') || sub.includes('enviad')) {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-900 border border-rose-300 font-black px-2.5 py-0.5 rounded-full text-[10.5px]">
                            <Truck className="w-3 h-3 text-rose-700" />
                            Despachado sin Levantar
                          </span>
                        );
                      } else if (sub.includes('drop') || sub.includes('mover') || sub.includes('logica') || sub.includes('fisica')) {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 font-black px-2.5 py-0.5 rounded-full text-[10.5px]">
                            <Package className="w-3 h-3 text-amber-700" />
                            Falta Mover Lógicamente
                          </span>
                        );
                      }

                      return (
                        <tr key={r.id || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-2.5 font-mono font-black text-slate-950 text-xs">
                            {r.palletId}
                          </td>
                          <td className="p-2.5 whitespace-nowrap text-slate-600 font-semibold">
                            {r.fecha}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-black text-[10.5px] border border-slate-300">
                              {r.area}
                            </span>
                          </td>
                          <td className="p-2.5 whitespace-nowrap font-bold text-slate-900">
                            {r.responsable}
                          </td>
                          <td className="p-2.5 text-slate-700 max-w-[200px] truncate" title={r.observacion}>
                            {r.observacion}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">{statusBadge}</td>
                          <td className="p-2.5 text-center font-black text-rose-700">
                            {r.leadTimeDias || 1} d
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>
                Mostrando <strong className="text-slate-900">{inspectedPallets.length}</strong> de {pendingRecords.length} pallets pendientes
              </span>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-1.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 cursor-pointer shadow-2xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
