import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Layers,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  MapPin,
  TrendingUp,
  BarChart3,
  LineChart,
  HelpCircle,
} from 'lucide-react';
import {
  PalletObservation,
  normalizeMes,
  normalizeSemana,
  formatToDDMMYYYY,
} from '../../types/pallets';
import { PalletFilterState } from './PalletFilterBar';

interface ChartStatusGeneralProps {
  allRecords: PalletObservation[];
  filteredRecords: PalletObservation[];
  filters: PalletFilterState;
  onFilterChange: (filters: PalletFilterState) => void;
}

export type GranularityLevel = 'mes' | 'semana';

interface BarGroupItem {
  key: string;
  label: string;
  secondaryLabel?: string;
  total: number;
  regularizadas: number;
  pendientes: number;
  pctRegularizada: number;
  pctPendiente: number;
  items: PalletObservation[];
}

export const ChartStatusGeneral: React.FC<ChartStatusGeneralProps> = ({
  allRecords,
  filteredRecords,
  filters,
  onFilterChange,
}) => {
  // Granularidad adaptada a Mes o Semana (sin filtro por fecha en Status General)
  const defaultGranularity: GranularityLevel = useMemo(() => {
    if (filters.mes && filters.mes !== 'TODOS') return 'semana';
    return 'mes';
  }, [filters.mes]);

  const [granularity, setGranularity] = useState<GranularityLevel>(defaultGranularity);
  const [displayMode, setDisplayMode] = useState<'combo' | 'bars' | 'line'>('combo');
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // Sincronizar automáticamente la granularidad cuando cambien los filtros principales
  useEffect(() => {
    setGranularity(defaultGranularity);
  }, [defaultGranularity]);

  // Base de registros a graficar:
  // Aplicamos el filtro de Área, Estatus y Búsqueda, pero respetamos la jerarquía temporal para la vista general
  // IMPORTANTE: Este gráfico de Status General NO tiene filtro por fecha individual
  const chartSourceRecords = useMemo(() => {
    const selectedAreas = (filters.areas && filters.areas.length > 0)
      ? filters.areas.filter(a => a && a !== 'TODAS').map(a => a.toUpperCase().trim())
      : (filters.area && filters.area !== 'TODAS' ? [filters.area.toUpperCase().trim()] : []);

    const selectedMeses = (filters.meses && filters.meses.length > 0)
      ? filters.meses.filter(m => m && m !== 'TODOS').map(normalizeMes)
      : (filters.mes && filters.mes !== 'TODOS' ? [normalizeMes(filters.mes)] : []);

    return allRecords.filter((r) => {
      // 1. Área
      if (selectedAreas.length > 0) {
        const rArea = (r.area || '').toUpperCase().trim();
        if (!selectedAreas.includes(rArea)) return false;
      }

      // 2. Estatus (si el usuario filtró por Pendiente o Regularizada)
      if (filters.estado === 'PENDIENTE' && r.estado !== 'PENDIENTE') return false;
      if (filters.estado === 'REGULARIZADA' && r.estado === 'PENDIENTE') return false;

      // 3. Search query
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        const match =
          r.palletId.toLowerCase().includes(q) ||
          r.area.toLowerCase().includes(q) ||
          r.observacion.toLowerCase().includes(q) ||
          (r.subMotivo && r.subMotivo.toLowerCase().includes(q)) ||
          r.responsable.toLowerCase().includes(q) ||
          (r.responsablePendiente && r.responsablePendiente.toLowerCase().includes(q));
        if (!match) return false;
      }

      // 4. Si la vista actual es 'semana' y hay meses seleccionados, solo registros de esos meses
      if (granularity === 'semana' && selectedMeses.length > 0) {
        if (!selectedMeses.includes(normalizeMes(r.mes))) return false;
      }

      return true;
    });
  }, [allRecords, filters.area, filters.areas, filters.estado, filters.searchQuery, filters.mes, filters.meses, granularity]);

  // Agrupar registros según la granularidad seleccionada (Mes o Semana)
  const barGroups: BarGroupItem[] = useMemo(() => {
    const map = new Map<string, { reg: number; pend: number; items: PalletObservation[]; label: string; secondary?: string }>();

    chartSourceRecords.forEach((r) => {
      let key = '';
      let label = '';
      let secondary = '';

      if (granularity === 'mes') {
        key = normalizeMes(r.mes);
        label = key;
        secondary = 'Mes Operativo';
      } else {
        key = normalizeSemana(r.semana);
        label = key;
        secondary = r.mes ? normalizeMes(r.mes) : '';
      }

      // Ignorar si el key es vacío o '-'
      if (!key || key === '-' || key === '--') return;

      if (!map.has(key)) {
        map.set(key, { reg: 0, pend: 0, items: [], label, secondary });
      }

      const entry = map.get(key)!;
      entry.items.push(r);
      if (r.estado === 'PENDIENTE') {
        entry.pend += 1;
      } else {
        entry.reg += 1;
      }
    });

    const entries = Array.from(map.entries());

    // Ordenamiento según la granularidad
    if (granularity === 'mes') {
      const orderMeses: Record<string, number> = {
        ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6,
        JULIO: 7, AGOSTO: 8, SETIEMBRE: 9, SEPTIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12,
      };
      entries.sort((a, b) => (orderMeses[a[0]] || 99) - (orderMeses[b[0]] || 99));
    } else {
      entries.sort((a, b) => {
        const numA = parseInt(a[0].replace(/[^0-9]/g, ''), 10) || 0;
        const numB = parseInt(b[0].replace(/[^0-9]/g, ''), 10) || 0;
        return numA - numB;
      });
    }

    return entries.map(([key, data]) => {
      const tot = data.reg + data.pend;
      return {
        key,
        label: data.label,
        secondaryLabel: data.secondary,
        total: tot,
        regularizadas: data.reg,
        pendientes: data.pend,
        pctRegularizada: tot > 0 ? (data.reg / tot) * 100 : 0,
        pctPendiente: tot > 0 ? (data.pend / tot) * 100 : 0,
        items: data.items,
      };
    });
  }, [chartSourceRecords, granularity]);

  // Cálculos totales para escala y tarjetas de resumen
  const grandTotal = barGroups.reduce((acc, g) => acc + g.total, 0);
  const grandRegularizadas = barGroups.reduce((acc, g) => acc + g.regularizadas, 0);
  const grandPendientes = barGroups.reduce((acc, g) => acc + g.pendientes, 0);
  const grandPctReg = grandTotal > 0 ? (grandRegularizadas / grandTotal) * 100 : 0;
  const grandPctPend = grandTotal > 0 ? (grandPendientes / grandTotal) * 100 : 0;

  // Altura máxima para escala de las barras
  const maxBarTotal = Math.max(1, ...barGroups.map((g) => g.total));

  // Escala máxima para las barras 3D individuales (estilo último gráfico)
  const maxSingleBarVal = useMemo(() => {
    let m = 5;
    barGroups.forEach((g) => {
      if (g.pendientes > m) m = g.pendientes;
      if (g.regularizadas > m) m = g.regularizadas;
    });
    return Math.ceil(m * 1.15);
  }, [barGroups]);

  // Puntos calculados para el Gráfico de Líneas complementario (conecta la tendencia de efectividad y volumen)
  const lineChartData = useMemo(() => {
    if (barGroups.length === 0) return { path: '', area: '', points: [] };
    const n = barGroups.length;
    const pts: { xPct: number; yPct: number; item: BarGroupItem }[] = [];

    barGroups.forEach((item, i) => {
      // Coordenada X centrada en su columna correspondiente (porcentaje exacto)
      const xPct = Number((((i + 0.5) / n) * 100).toFixed(2));
      // Altura para la línea de efectividad de regularización (de 18% arriba a 82% abajo):
      const yPct = Number((82 - (item.pctRegularizada / 100) * 64).toFixed(2));
      pts.push({ xPct, yPct, item });
    });

    // Algoritmo de curvatura suave Catmull-Rom / Bezier Spline
    let path = '';
    if (pts.length === 1) {
      path = `M ${pts[0].xPct} ${pts[0].yPct}`;
    } else if (pts.length === 2) {
      path = `M ${pts[0].xPct} ${pts[0].yPct} L ${pts[1].xPct} ${pts[1].yPct}`;
    } else {
      path = `M ${pts[0].xPct} ${pts[0].yPct}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i === 0 ? 0 : i - 1];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

        const cp1x = p1.xPct + (p2.xPct - p0.xPct) / 6;
        const cp1y = p1.yPct + (p2.yPct - p0.yPct) / 6;
        const cp2x = p2.xPct - (p3.xPct - p1.xPct) / 6;
        const cp2y = p2.yPct - (p3.yPct - p1.yPct) / 6;

        path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.xPct} ${p2.yPct}`;
      }
    }

    const area = `${path} L ${pts[pts.length - 1].xPct} 86 L ${pts[0].xPct} 86 Z`;

    return { path, area, points: pts };
  }, [barGroups]);

  // Manejar Drill-Down interactivo al hacer clic en una barra
  const handleBarClick = (item: BarGroupItem) => {
    if (granularity === 'mes') {
      onFilterChange({
        ...filters,
        mes: item.key,
        meses: [item.key],
        semana: 'TODAS',
        semanas: [],
      });
      setGranularity('semana');
    } else if (granularity === 'semana') {
      onFilterChange({
        ...filters,
        semana: item.key,
        semanas: [item.key],
      });
    }
  };

  // Reset al nivel superior (Meses)
  const handleResetToMonths = () => {
    onFilterChange({
      ...filters,
      mes: 'TODOS',
      meses: [],
      semana: 'TODAS',
      semanas: [],
    });
    setGranularity('mes');
  };

  // Subir un nivel en el breadcrumb
  const handleStepBackToWeeks = () => {
    onFilterChange({
      ...filters,
      semana: 'TODAS',
      semanas: [],
    });
    setGranularity('semana');
  };

  return (
    <div className="w-full bg-white border-2 border-[#CBD5E1] rounded-2xl p-4 sm:p-6 shadow-md space-y-4">
      {/* 1. Header Ejecutivo del Gráfico */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b-2 border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white flex items-center justify-center font-black text-sm shadow-md border border-slate-700">
            <BarChart3 className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black uppercase text-[#0F172A] tracking-wide font-sans">
                STATUS GENERAL
              </h2>
              <span className="bg-slate-900 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                {grandTotal} Pallets Reportados
              </span>
              {filters.area !== 'TODAS' && (
                <span className="bg-blue-100 text-blue-800 border border-blue-300 text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                  <MapPin className="w-3 h-3 text-blue-600" />
                  Área: {filters.area}
                </span>
              )}
            </div>
            <p className="text-xs text-[#64748B] font-medium mt-0.5">
              Total de pallets reportados en barras segmentadas ampliadas: Pendientes (Azul) vs. Regularizadas (Naranja)
            </p>
          </div>
        </div>

        {/* 2. Selectores Superiores: Granularidad Temporal y Modo de Gráfico (Combo, Barras, Línea) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Modo: [Barras + Línea] [Solo Barras] [Solo Línea] */}
          <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-xl border border-[#CBD5E1] shadow-2xs">
            <button
              type="button"
              onClick={() => setDisplayMode('combo')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                displayMode === 'combo'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
              title="Gráfico Combinado: Barras y Línea de Tendencia con fondo cuadricular"
            >
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Barras + Línea</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('bars')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                displayMode === 'bars'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
              title="Solo Barras Segmentadas"
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Solo Barras</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('line')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                displayMode === 'line'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
              title="Solo Gráfico de Líneas con Cuadrícula"
            >
              <LineChart className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Solo Línea</span>
            </button>
          </div>

          {/* Selector de Granularidad Dinámica: [Por Meses] [Por Semanas] (Sin filtro por fecha) */}
          <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-xl border border-[#CBD5E1] shadow-2xs">
            <button
              type="button"
              onClick={() => setGranularity('mes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                granularity === 'mes'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Por Meses</span>
            </button>
            <button
              type="button"
              onClick={() => setGranularity('semana')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                granularity === 'semana'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Por Semanas</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Barra de Navegación Jerárquica (Breadcrumb Interactivo) y Leyenda */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#F8FAFC] px-3.5 py-2 rounded-xl border border-[#E2E8F0]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs font-black text-[#475569]">
          <span className="text-[#64748B] uppercase tracking-wider text-[10px]">Nivel:</span>
          <button
            type="button"
            onClick={handleResetToMonths}
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              granularity === 'mes' && filters.mes === 'TODOS'
                ? 'bg-blue-600 text-white font-black'
                : 'hover:bg-slate-200 text-[#0F172A]'
            }`}
          >
            Todos los Meses
          </button>

          {filters.mes !== 'TODOS' && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <button
                type="button"
                onClick={handleStepBackToWeeks}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  granularity === 'semana' && filters.semana === 'TODAS'
                    ? 'bg-blue-600 text-white font-black'
                    : 'hover:bg-slate-200 text-[#0F172A]'
                }`}
              >
                {filters.mes}
              </button>
            </>
          )}

          {filters.semana !== 'TODAS' && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-black">
                {filters.semana}
              </span>
            </>
          )}
        </div>

        {/* Leyenda de Colores */}
        <div className="flex items-center gap-4 text-xs font-black">
          <div className="flex items-center gap-1.5 text-orange-800">
            <span className="w-3.5 h-3.5 rounded-xs bg-[#EA580C] shadow-xs border border-orange-700" />
            <span>Regularizadas ({grandRegularizadas})</span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-800">
            <span className="w-3.5 h-3.5 rounded-xs bg-[#1D4ED8] shadow-xs border border-blue-900" />
            <span>Pendientes ({grandPendientes})</span>
          </div>
          {displayMode !== 'bars' && (
            <div className="flex items-center gap-1.5 text-slate-700">
              <span className="w-4 h-1 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full inline-block" />
              <span>Línea Tendencia % Efic.</span>
            </div>
          )}
          <span className="text-[11px] font-bold text-[#64748B] pl-2 border-l border-slate-300">
            Efectividad: <strong className="text-emerald-700">{grandPctReg.toFixed(1)}%</strong>
          </span>
        </div>
      </div>

      {/* 4. ÁREA DEL GRÁFICO DE BARRAS VERTICALES DE ANCHO COMPLETO CON FONDO CUADRICULAR */}
      <div className="w-full bg-[#F8FAFC] p-4 sm:p-6 rounded-2xl border-2 border-[#CBD5E1] shadow-inner relative overflow-hidden">
        {/* Fondo Cuadricular Versátil y Moderno - Minimalista */}
        <div
          className="absolute inset-0 pointer-events-none opacity-15"
          style={{
            backgroundImage: `
              linear-gradient(to right, #94a3b8 1px, transparent 1px),
              linear-gradient(to bottom, #94a3b8 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Líneas Guía Horizontales de Referencia (Eje Y) - Minimalistas */}
        <div className="absolute inset-y-16 left-4 right-4 flex flex-col justify-between pointer-events-none opacity-25">
          {[100, 75, 50, 25, 0].map((lvl) => (
            <div key={lvl} className="w-full flex items-center gap-2 border-b border-dashed border-slate-300 pb-0.5">
              <span className="text-[9px] font-bold text-slate-400 tabular-nums w-8">{lvl}%</span>
            </div>
          ))}
        </div>

        {/* Live Hover Info Strip: Garantiza que toda la información se lea completa y nunca se corte */}
        {(() => {
          const hoveredItem = barGroups.find((g) => g.key === hoveredKey);
          return (
            <div className="mb-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-4 py-2.5 rounded-xl border border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs relative z-20">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-bold text-slate-300">
                  {hoveredItem ? 'Detalle de barra seleccionada:' : 'Resumen visual interactivo:'}
                </span>
                <span className="bg-white/20 text-white font-black px-2.5 py-0.5 rounded-md text-[11px] tracking-wide">
                  {hoveredItem ? hoveredItem.label : `Vista General (${barGroups.length} ${granularity === 'mes' ? 'meses' : granularity === 'semana' ? 'semanas' : 'días'})`}
                </span>
                {hoveredItem?.secondaryLabel && (
                  <span className="text-slate-400 text-[10.5px]">({hoveredItem.secondaryLabel})</span>
                )}
              </div>

              {hoveredItem ? (
                <div className="flex items-center gap-3 text-xs font-black flex-wrap">
                  <span className="bg-slate-800 border border-slate-600 px-2 py-0.5 rounded-md text-white">
                    Total: <strong className="text-amber-300">{hoveredItem.total}</strong> pallets
                  </span>
                  <span className="bg-emerald-950/80 border border-emerald-500/50 px-2 py-0.5 rounded-md text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Regularizadas: {hoveredItem.regularizadas} ({hoveredItem.pctRegularizada.toFixed(1)}%)
                  </span>
                  <span className="bg-rose-950/80 border border-rose-500/50 px-2 py-0.5 rounded-md text-rose-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Pendientes: {hoveredItem.pendientes} ({hoveredItem.pctPendiente.toFixed(1)}%)
                  </span>
                </div>
              ) : (
                <div className="text-[11px] text-slate-300 flex items-center gap-2 font-medium">
                  <span>Pase el cursor sobre cualquier barra para ver el desglose al detalle sin cortes.</span>
                  <span className="text-slate-400 font-bold border-l border-slate-700 pl-2">
                    Efectividad global: <strong className="text-emerald-400 font-black">{grandPctReg.toFixed(1)}%</strong>
                  </span>
                </div>
              )}
            </div>
          );
        })()}

        {barGroups.length === 0 ? (
          <div className="py-24 text-center space-y-2 relative z-20">
            <p className="text-sm font-black text-slate-700 uppercase">
              No hay datos para mostrar con los filtros seleccionados
            </p>
            <p className="text-xs text-slate-500 font-medium">
              Intente cambiar el mes, semana o área en la barra de filtros superior.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-2 scrollbar-thin relative z-20">
            {/* Contenedor Horizontal donde cada columna tiene Barra + Eje de Fecha con espacio holgado y altura considerable */}
            <div
              className="w-full pt-10 pb-2 flex items-end justify-around gap-4 sm:gap-6 md:gap-8 px-4 min-h-[520px] sm:min-h-[560px] relative"
              style={{ minWidth: barGroups.length > 5 ? `${barGroups.length * 115}px` : '100%' }}
            >
              {/* Capa de Gráfico de Líneas de Tendencia Suavizada y Minimalista */}
              {displayMode !== 'bars' && barGroups.length > 0 && (
                <>
                  <svg
                    className="absolute inset-x-4 top-10 pointer-events-none z-20"
                    style={{ height: 'calc(100% - 105px)', width: 'calc(100% - 32px)' }}
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="lineTrendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0284C7" />
                        <stop offset="50%" stopColor="#38BDF8" />
                        <stop offset="100%" stopColor="#10B981" />
                      </linearGradient>
                      <linearGradient id="areaTrendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.14" />
                        <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.01" />
                      </linearGradient>
                    </defs>

                    {/* Área sombreada en modo 'line' */}
                    {displayMode === 'line' && (
                      <path d={lineChartData.area} fill="url(#areaTrendGradient)" />
                    )}

                    {/* Línea de Tendencia Minimalista y Elegante (Sin aspecto tosco) */}
                    <path
                      d={lineChartData.path}
                      fill="none"
                      stroke="url(#lineTrendGradient)"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>

                  {/* Nodos de Tendencia HTML Perfectamente Circulares (Elimina la tosquedad y deformación oval) */}
                  <div
                    className="absolute inset-x-4 top-10 pointer-events-none z-25"
                    style={{ height: 'calc(100% - 105px)', width: 'calc(100% - 32px)' }}
                  >
                    {lineChartData.points.map((pt, i) => {
                      const isHovered = hoveredKey === pt.item.key;
                      return (
                        <div
                          key={i}
                          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto flex flex-col items-center group/node cursor-pointer"
                          style={{ left: `${pt.xPct}%`, top: `${pt.yPct}%` }}
                          onMouseEnter={() => setHoveredKey(pt.item.key)}
                          onMouseLeave={() => setHoveredKey(null)}
                        >
                          {/* Mini Badge Flotante con Porcentaje de Efectividad */}
                          <div
                            className={`mb-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-black tracking-tight border shadow-xs transition-all duration-150 whitespace-nowrap ${
                              isHovered
                                ? 'bg-slate-900 text-amber-300 border-slate-700 scale-110 shadow-md'
                                : 'bg-white/95 text-slate-700 border-slate-300/80 backdrop-blur-xs'
                            }`}
                          >
                            {pt.item.pctRegularizada.toFixed(0)}%
                          </div>

                          {/* Punto Nodo Delicado y Redondo */}
                          <div
                            className={`w-3 h-3 rounded-full border-2 border-white shadow-xs flex items-center justify-center transition-transform duration-150 ${
                              isHovered
                                ? 'scale-135 ring-2 ring-sky-400 bg-sky-600'
                                : 'bg-white ring-1 ring-sky-500/50'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                pt.item.pctRegularizada >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {barGroups.map((item, idx) => {
                // Altura proporcional para las barras 3D individuales estilo último gráfico
                const pendHeightPct = Math.min(100, (item.pendientes / maxSingleBarVal) * 90);
                const regHeightPct = Math.min(100, (item.regularizadas / maxSingleBarVal) * 90);
                const isHovered = hoveredKey === item.key;
                const regPctOfThisBar = item.total > 0 ? (item.regularizadas / item.total) * 100 : 0;
                const pendPctOfThisBar = item.total > 0 ? (item.pendientes / item.total) * 100 : 0;

                const line1 = item.label;
                const line2 = item.secondaryLabel || '';

                return (
                  <div
                    key={item.key}
                    onMouseEnter={() => setHoveredKey(item.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    onClick={() => handleBarClick(item)}
                    className={`flex-1 min-w-[100px] sm:min-w-[120px] md:min-w-[140px] max-w-[180px] flex flex-col items-center justify-end h-full transition-all group relative cursor-pointer ${
                      isHovered ? 'z-30' : 'z-10'
                    }`}
                  >
                    {/* Tooltip Flotante Mejorado */}
                    {isHovered && (
                      <div
                        className={`absolute z-50 pointer-events-none transition-all duration-150 whitespace-nowrap animate-in fade-in zoom-in-95 bg-[#0F172A] text-white p-3 rounded-xl shadow-2xl border border-white/20 bottom-[calc(100%+14px)] ${
                          idx === 0
                            ? 'left-0'
                            : idx === barGroups.length - 1
                            ? 'right-0'
                            : 'left-1/2 -translate-x-1/2'
                        }`}
                      >
                        <div className="text-[11.5px] font-black border-b border-white/20 pb-1.5 mb-1.5 text-amber-300 flex items-center justify-between gap-3">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-400" />
                            {item.label}
                          </span>
                          <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-[10px] font-black">
                            Total: {item.total} pallets
                          </span>
                        </div>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex items-center justify-between gap-5 text-orange-300 font-bold">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-xs bg-[#EA580C]" />
                              Regularizadas:
                            </span>
                            <span className="font-black text-white">
                              {item.regularizadas}{' '}
                              <span className="text-orange-400 font-semibold">
                                ({item.pctRegularizada.toFixed(1)}%)
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-5 text-blue-300 font-bold">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-xs bg-[#3B82F6]" />
                              Pendientes:
                            </span>
                            <span className="font-black text-white">
                              {item.pendientes}{' '}
                              <span className="text-blue-400 font-semibold">
                                ({item.pctPendiente.toFixed(1)}%)
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="text-[9.5px] text-slate-400 mt-1.5 pt-1.5 border-t border-white/10 text-center font-medium">
                          {granularity === 'mes'
                            ? '💡 Clic para ver desglose por semanas'
                            : '💡 Semana operativa'}
                        </div>
                        <div
                          className={`absolute -bottom-1.5 w-3 h-3 bg-[#0F172A] rotate-45 border-r border-b border-white/20 ${
                            idx === 0
                              ? 'left-6'
                              : idx === barGroups.length - 1
                              ? 'right-6'
                              : 'left-1/2 -translate-x-1/2'
                          }`}
                        />
                      </div>
                    )}

                    {/* Total de Pallets Arriba de la Barra con Badge Sólido y Limpio */}
                    <div className="text-center mb-2 transition-transform group-hover:-translate-y-1">
                      <span className="bg-slate-900 text-amber-300 text-xs sm:text-sm font-black px-3 py-1 rounded-xl shadow-md border border-slate-700">
                        {item.total}
                      </span>
                    </div>

                    {/* Barra Vertical Segmentada y Robusta (Formato anterior pero más grande, ancha, alta y con colores vivos) */}
                    <div className="flex items-end justify-center h-[360px] sm:h-[400px] w-full relative px-2">
                      <div
                        style={{ height: `${Math.min(100, Math.max(22, (item.total / maxBarTotal) * 88))}%` }}
                        className={`w-14 sm:w-16 md:w-20 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-end border-2 border-white/90 transition-all duration-200 relative ${
                          isHovered
                            ? 'ring-4 ring-blue-500/50 shadow-2xl scale-105'
                            : 'hover:brightness-105'
                        } ${displayMode === 'line' ? 'opacity-20 hover:opacity-100' : ''}`}
                      >
                        {/* Segmento Superior: REGULARIZADAS (Naranja Vivo) */}
                        {item.regularizadas > 0 && (
                          <div
                            style={{ height: `${regPctOfThisBar}%` }}
                            className="w-full bg-gradient-to-t from-[#EA580C] via-[#F97316] to-[#FB923C] flex flex-col items-center justify-center p-1 text-white relative transition-all border-b border-white/30 select-none shadow-inner"
                            title={`Regularizadas: ${item.regularizadas} (${regPctOfThisBar.toFixed(1)}%)`}
                          >
                            <span className="text-xs sm:text-sm md:text-base font-black tabular-nums drop-shadow-md leading-none">
                              {item.regularizadas}
                            </span>
                            {regPctOfThisBar >= 18 && (
                              <span className="text-[9.5px] sm:text-[10.5px] font-extrabold opacity-95 leading-tight mt-0.5 drop-shadow-xs">
                                {regPctOfThisBar.toFixed(0)}%
                              </span>
                            )}
                          </div>
                        )}

                        {/* Segmento Inferior: PENDIENTES (Azul Royal) */}
                        {item.pendientes > 0 && (
                          <div
                            style={{ height: `${pendPctOfThisBar}%` }}
                            className="w-full bg-gradient-to-t from-[#1D4ED8] via-[#2563EB] to-[#3B82F6] flex flex-col items-center justify-center p-1 text-white relative transition-all select-none shadow-inner"
                            title={`Pendientes: ${item.pendientes} (${pendPctOfThisBar.toFixed(1)}%)`}
                          >
                            <span className="text-xs sm:text-sm md:text-base font-black tabular-nums drop-shadow-md leading-none">
                              {item.pendientes}
                            </span>
                            {pendPctOfThisBar >= 18 && (
                              <span className="text-[9.5px] sm:text-[10.5px] font-extrabold opacity-95 leading-tight mt-0.5 drop-shadow-xs">
                                {pendPctOfThisBar.toFixed(0)}%
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Eje X: Etiqueta Integrada y Físicamente Alineada con la Barra */}
                    <div className="w-full pt-2.5 pb-1 flex flex-col items-center justify-start text-center border-t-2 border-slate-300 mt-1">
                      <div className={`w-full px-1.5 py-1 rounded-lg transition-colors ${isHovered ? 'bg-blue-100 text-blue-900 shadow-2xs' : 'bg-slate-100/80'}`}>
                        <span
                          className={`text-[11px] sm:text-xs font-black block uppercase tracking-tight truncate ${
                            isHovered ? 'text-blue-900 font-extrabold' : 'text-[#0F172A]'
                          }`}
                          title={item.label}
                        >
                          {line1}
                        </span>
                        {line2 && (
                          <span className="text-[10px] text-[#64748B] font-bold block truncate leading-tight mt-0.5">
                            {line2}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-black text-slate-600 mt-1 inline-block bg-slate-200/90 px-2 py-0.5 rounded-md">
                        {item.total} pal.
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 5. DETALLE DE LAS CANTIDADES DEBAJO (Tabla Ejecutiva con Desplazamiento Vertical para no llenar la pantalla) */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <h4 className="text-xs font-black uppercase text-[#0F172A] tracking-wider">
              Detalle de Cantidades por {granularity === 'mes' ? 'Mes' : 'Semana'}
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full border border-slate-300 shadow-2xs">
              ↕ Tabla deslizable ({barGroups.length} {granularity === 'mes' ? 'meses' : 'semanas'})
            </span>
          </div>
        </div>

        {/* Tabla con scroll vertical (max-h-72) y cabecera fija para no saturar la pantalla */}
        <div className="overflow-x-auto max-h-72 overflow-y-auto rounded-xl border-2 border-[#CBD5E1] shadow-2xs scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 shadow-xs">
              <tr className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] text-white text-[10.5px] font-black uppercase tracking-wider">
                <th className="py-2.5 px-3 border-r border-[#334155]">
                  {granularity === 'mes' ? 'Mes Operativo' : 'Semana'}
                </th>
                <th className="py-2.5 px-3 text-center border-r border-[#334155] w-28 bg-slate-800">
                  Total Pallets
                </th>
                <th className="py-2.5 px-3 text-center border-r border-[#334155] w-36 bg-emerald-950/60 text-emerald-300">
                  Regularizadas
                </th>
                <th className="py-2.5 px-3 text-center border-r border-[#334155] w-36 bg-rose-950/60 text-rose-300">
                  Pendientes
                </th>
                <th className="py-2.5 px-3 text-center border-r border-[#334155] w-36">
                  % Cumplimiento
                </th>
                <th className="py-2.5 px-3 text-center w-28">
                  Estatus Visual
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] font-semibold text-[#0F172A] text-xs">
              {barGroups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500 font-bold">
                    Sin registros para mostrar
                  </td>
                </tr>
              ) : (
                barGroups.map((row) => {
                  const is100Pct = row.pctRegularizada >= 100;
                  const hasPendientes = row.pendientes > 0;

                  return (
                    <tr
                      key={row.key}
                      onClick={() => handleBarClick(row)}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                    >
                      {/* Categoría */}
                      <td className="py-2 px-3 border-r border-[#E2E8F0] font-black flex items-center justify-between">
                        <div>
                          <span className="text-[#0F172A] uppercase">{row.label}</span>
                          {row.secondaryLabel && (
                            <span className="text-[10px] text-[#64748B] block font-normal">
                              {row.secondaryLabel}
                            </span>
                          )}
                        </div>
                        {granularity === 'mes' && (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </td>

                      {/* Total Pallets */}
                      <td className="py-2 px-3 text-center border-r border-[#E2E8F0] font-black text-slate-900 bg-slate-50/60">
                        {row.total}
                      </td>

                      {/* Regularizadas */}
                      <td className="py-2 px-3 text-center border-r border-[#E2E8F0] text-emerald-700 bg-emerald-50/30">
                        <span className="font-black text-xs">{row.regularizadas}</span>
                        <span className="text-[10.5px] font-bold text-emerald-600 ml-1.5">
                          ({row.pctRegularizada.toFixed(1)}%)
                        </span>
                      </td>

                      {/* Pendientes */}
                      <td className="py-2 px-3 text-center border-r border-[#E2E8F0] text-rose-700 bg-rose-50/30">
                        <span className="font-black text-xs">{row.pendientes}</span>
                        <span className="text-[10.5px] font-bold text-rose-600 ml-1.5">
                          ({row.pctPendiente.toFixed(1)}%)
                        </span>
                      </td>

                      {/* Barra de Porcentaje */}
                      <td className="py-2 px-3 border-r border-[#E2E8F0]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${row.pctRegularizada}%` }}
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300"
                            />
                          </div>
                          <span className="text-[11px] font-black text-slate-700 w-10 text-right">
                            {row.pctRegularizada.toFixed(0)}%
                          </span>
                        </div>
                      </td>

                      {/* Estatus Visual */}
                      <td className="py-2 px-3 text-center">
                        {is100Pct ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Al 100%
                          </span>
                        ) : hasPendientes ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                            <Clock className="w-3 h-3 text-rose-600" />
                            {row.pendientes} Pend.
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            En proceso
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Fila Total General Acumulado */}
              {barGroups.length > 0 && (
                <tr className="bg-slate-900 text-white font-black text-xs">
                  <td className="py-2.5 px-3 uppercase border-r border-slate-700">
                    Total General
                  </td>
                  <td className="py-2.5 px-3 text-center border-r border-slate-700 text-amber-400 font-extrabold text-sm">
                    {grandTotal}
                  </td>
                  <td className="py-2.5 px-3 text-center border-r border-slate-700 text-emerald-300">
                    {grandRegularizadas} ({grandPctReg.toFixed(1)}%)
                  </td>
                  <td className="py-2.5 px-3 text-center border-r border-slate-700 text-rose-300">
                    {grandPendientes} ({grandPctPend.toFixed(1)}%)
                  </td>
                  <td className="py-2.5 px-3 border-r border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-700 h-2.5 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${grandPctReg}%` }}
                          className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"
                        />
                      </div>
                      <span className="text-[11px] font-black text-emerald-300 w-10 text-right">
                        {grandPctReg.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center text-[10.5px] text-slate-300 font-bold">
                    {grandRegularizadas}/{grandTotal}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
