import React, { useState, useMemo } from 'react';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  HelpCircle,
  Eye,
  Percent,
  Hash,
  Sparkles,
  Filter,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Layers,
  MapPin,
  Calendar,
  Clock,
  X,
  Search,
  ArrowRight,
  ShieldCheck,
  PackageCheck,
  Tag,
  Box,
  Truck,
  FileText,
} from 'lucide-react';
import {
  PalletObservation,
  checkEvidenciaCompartida,
  classifyMotivoRegularizado,
} from '../../types/pallets';
import { PalletFilterState } from './PalletFilterBar';

interface ChartPalletsRegularizadosEvidenciaProps {
  allRecords: PalletObservation[];
  filteredRecords: PalletObservation[];
  filters: PalletFilterState;
  onFilterChange?: (filters: PalletFilterState) => void;
}

type ViewMode = 'both' | 'count' | 'percentage';

interface MotivoBreakdownItem {
  motivo: string;
  total: number;
  pctDelTotalReg: number;
  conEvidencia: number;
  pctConEvidencia: number;
  sinEvidencia: number;
  pctSinEvidencia: number;
  pallets: PalletObservation[];
  icon: React.ReactNode;
  accentColor: string;
  bgColor: string;
}

export const ChartPalletsRegularizadosEvidencia: React.FC<ChartPalletsRegularizadosEvidenciaProps> = ({
  allRecords,
  filteredRecords,
  filters,
  onFilterChange,
}) => {
  // Modo de visualización: Ambos (# y %), Solo Cantidad (#), o Solo Porcentaje (%)
  const [viewMode, setViewMode] = useState<ViewMode>('both');
  // Motivo seleccionado para filtrar el listado inferior
  const [selectedMotivo, setSelectedMotivo] = useState<string | null>(null);
  // Filtro de evidencia seleccionado: 'TODOS' | 'CON_EVIDENCIA' | 'SIN_EVIDENCIA'
  const [evidenciaFilter, setEvidenciaFilter] = useState<'TODOS' | 'CON_EVIDENCIA' | 'SIN_EVIDENCIA'>('TODOS');
  // Modal de inspección de pallets
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [detailSearch, setDetailSearch] = useState<string>('');

  // 1. Filtrar registros regulares correspondientes al ámbito activo
  // Si el usuario tenía seleccionado filtro estado === 'PENDIENTE', usamos allRecords con los mismos filtros temporales/área para que este gráfico siempre muestre el análisis de regularizados
  const regularizadosSource = useMemo(() => {
    let pool = filteredRecords.filter((r) => r.estado !== 'PENDIENTE');

    // Si pool está vacío porque el filtro activo es 'PENDIENTE', tomamos de allRecords respetando mes, semana, área
    if (pool.length === 0 && filters.estado === 'PENDIENTE') {
      pool = allRecords.filter((r) => {
        if (r.estado === 'PENDIENTE') return false;
        if (filters.mes !== 'TODOS' && r.mes !== filters.mes) return false;
        if (filters.semana !== 'TODAS' && r.semana !== filters.semana) return false;
        if (filters.area !== 'TODAS' && (r.area || '').toUpperCase().trim() !== filters.area.toUpperCase().trim()) return false;
        return true;
      });
    }

    return pool;
  }, [filteredRecords, allRecords, filters.estado, filters.mes, filters.semana, filters.area]);

  const totalRegularizados = regularizadosSource.length;

  // 2. Conteo de Evidencia Compartida vs Sin Evidencia
  const conEvidenciaList = useMemo(() => {
    return regularizadosSource.filter(checkEvidenciaCompartida);
  }, [regularizadosSource]);

  const sinEvidenciaList = useMemo(() => {
    return regularizadosSource.filter((r) => !checkEvidenciaCompartida(r));
  }, [regularizadosSource]);

  const conEvidenciaCount = conEvidenciaList.length;
  const sinEvidenciaCount = sinEvidenciaList.length;

  const conEvidenciaPct = totalRegularizados > 0 ? (conEvidenciaCount / totalRegularizados) * 100 : 0;
  const sinEvidenciaPct = totalRegularizados > 0 ? (sinEvidenciaCount / totalRegularizados) * 100 : 0;

  // 3. Desglose por Motivo de Observación
  const motivosBreakdown: MotivoBreakdownItem[] = useMemo(() => {
    const map = new Map<string, { total: number; conEv: number; sinEv: number; items: PalletObservation[] }>();

    regularizadosSource.forEach((r) => {
      const motivo = classifyMotivoRegularizado(r.observacion);
      const hasEv = checkEvidenciaCompartida(r);

      if (!map.has(motivo)) {
        map.set(motivo, { total: 0, conEv: 0, sinEv: 0, items: [] });
      }

      const entry = map.get(motivo)!;
      entry.total += 1;
      entry.items.push(r);
      if (hasEv) entry.conEv += 1;
      else entry.sinEv += 1;
    });

    const getMotivoIcon = (motivo: string) => {
      if (motivo.includes('Film')) return <Layers className="w-4 h-4 text-emerald-600" />;
      if (motivo.includes('Altura')) return <Box className="w-4 h-4 text-blue-600" />;
      if (motivo.includes('Rotul') || motivo.includes('Tienda')) return <Tag className="w-4 h-4 text-amber-600" />;
      if (motivo.includes('Inclin') || motivo.includes('Zuncho')) return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      if (motivo.includes('Físico') || motivo.includes('Euro')) return <Truck className="w-4 h-4 text-purple-600" />;
      return <FileText className="w-4 h-4 text-slate-600" />;
    };

    const getMotivoAccent = (motivo: string) => {
      if (motivo.includes('Film')) return { border: 'border-emerald-300', bg: 'bg-emerald-50/70' };
      if (motivo.includes('Altura')) return { border: 'border-blue-300', bg: 'bg-blue-50/70' };
      if (motivo.includes('Rotul') || motivo.includes('Tienda')) return { border: 'border-amber-300', bg: 'bg-amber-50/70' };
      if (motivo.includes('Inclin') || motivo.includes('Zuncho')) return { border: 'border-rose-300', bg: 'bg-rose-50/70' };
      if (motivo.includes('Físico') || motivo.includes('Euro')) return { border: 'border-purple-300', bg: 'bg-purple-50/70' };
      return { border: 'border-slate-300', bg: 'bg-slate-50/70' };
    };

    const rawList: MotivoBreakdownItem[] = [];
    map.forEach((val, key) => {
      const pctDelTotalReg = totalRegularizados > 0 ? (val.total / totalRegularizados) * 100 : 0;
      const pctConEvidencia = val.total > 0 ? (val.conEv / val.total) * 100 : 0;
      const pctSinEvidencia = val.total > 0 ? (val.sinEv / val.total) * 100 : 0;
      const styling = getMotivoAccent(key);

      rawList.push({
        motivo: key,
        total: val.total,
        pctDelTotalReg: Number(pctDelTotalReg.toFixed(1)),
        conEvidencia: val.conEv,
        pctConEvidencia: Number(pctConEvidencia.toFixed(1)),
        sinEvidencia: val.sinEv,
        pctSinEvidencia: Number(pctSinEvidencia.toFixed(1)),
        pallets: val.items,
        icon: getMotivoIcon(key),
        accentColor: styling.border,
        bgColor: styling.bg,
      });
    });

    // 1. Ordenar estrictamente de mayor a menor porcentaje
    rawList.sort((a, b) => b.pctDelTotalReg - a.pctDelTotalReg);

    // 2. Separar las observaciones principales (mayor porcentaje) de las que tienen muy poco porcentaje (< 7.0%)
    // Si ya existe 'Otros Motivos Operativos' o tiene poco porcentaje, se agrupa en 'Otros Motivos'
    const mainList: MotivoBreakdownItem[] = [];
    const minorItems: MotivoBreakdownItem[] = [];

    rawList.forEach((item, idx) => {
      if (item.motivo.includes('Otros Motivos') || item.motivo.toLowerCase().includes('otro')) {
        minorItems.push(item);
      } else if (rawList.length > 3 && (item.pctDelTotalReg < 7.0 || idx >= 5)) {
        // Observación con muy poco porcentaje: agrupar en Otros Motivos
        minorItems.push(item);
      } else {
        mainList.push(item);
      }
    });

    // Asegurar que las observaciones principales estén estrictamente ordenadas de mayor a menor porcentaje
    mainList.sort((a, b) => b.pctDelTotalReg - a.pctDelTotalReg);

    // 3. Si hay observaciones menores, agruparlas en un solo consolidado 'Otros Motivos Operativos' al final
    if (minorItems.length > 0) {
      const otrosTotal = minorItems.reduce((acc, it) => acc + it.total, 0);
      const otrosConEv = minorItems.reduce((acc, it) => acc + it.conEvidencia, 0);
      const otrosSinEv = minorItems.reduce((acc, it) => acc + it.sinEvidencia, 0);
      const otrosPctReg = totalRegularizados > 0 ? (otrosTotal / totalRegularizados) * 100 : 0;
      const otrosPctConEv = otrosTotal > 0 ? (otrosConEv / otrosTotal) * 100 : 0;
      const otrosPctSinEv = otrosTotal > 0 ? (otrosSinEv / otrosTotal) * 100 : 0;
      const allMinorPallets = minorItems.flatMap((it) => it.pallets);

      mainList.push({
        motivo: 'Otros Motivos Operativos',
        total: otrosTotal,
        pctDelTotalReg: Number(otrosPctReg.toFixed(1)),
        conEvidencia: otrosConEv,
        pctConEvidencia: Number(otrosPctConEv.toFixed(1)),
        sinEvidencia: otrosSinEv,
        pctSinEvidencia: Number(otrosPctSinEv.toFixed(1)),
        pallets: allMinorPallets,
        icon: <FileText className="w-4 h-4 text-slate-600" />,
        accentColor: 'border-slate-300',
        bgColor: 'bg-slate-50/80',
      });
    }

    return mainList;
  }, [regularizadosSource, totalRegularizados]);

  // Pallets filtrados para inspección detallada
  const inspectedPallets = useMemo(() => {
    return regularizadosSource.filter((r) => {
      // 1. Filtro de motivo si hay uno activo
      if (selectedMotivo) {
        const itemMotivo = classifyMotivoRegularizado(r.observacion);
        if (selectedMotivo === 'Otros Motivos Operativos') {
          // Verificar si coincide con los motivos agrupados en Otros
          const activeMotivosKeys = motivosBreakdown.map((m) => m.motivo);
          if (activeMotivosKeys.includes(itemMotivo) && itemMotivo !== 'Otros Motivos Operativos') {
            return false;
          }
        } else if (itemMotivo !== selectedMotivo) {
          return false;
        }
      }
      // 2. Filtro de evidencia
      const hasEv = checkEvidenciaCompartida(r);
      if (evidenciaFilter === 'CON_EVIDENCIA' && !hasEv) return false;
      if (evidenciaFilter === 'SIN_EVIDENCIA' && hasEv) return false;

      // 3. Search query
      if (detailSearch.trim()) {
        const q = detailSearch.toLowerCase().trim();
        const match =
          r.palletId.toLowerCase().includes(q) ||
          r.area.toLowerCase().includes(q) ||
          r.responsable.toLowerCase().includes(q) ||
          r.observacion.toLowerCase().includes(q) ||
          (r.subMotivo && r.subMotivo.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [regularizadosSource, selectedMotivo, evidenciaFilter, detailSearch]);

  // Formateador de texto según viewMode
  const renderMetric = (count: number, pct: number, label?: string) => {
    if (viewMode === 'count') {
      return (
        <span className="font-black tabular-nums">
          {count} <span className="text-[11px] font-bold text-slate-500">{label || 'pallets'}</span>
        </span>
      );
    }
    if (viewMode === 'percentage') {
      return (
        <span className="font-black tabular-nums">
          {pct.toFixed(1)}%
        </span>
      );
    }
    // 'both'
    return (
      <span className="font-black tabular-nums flex items-baseline gap-1.5 flex-wrap">
        <span>{count}</span>
        <span className="text-xs font-bold text-slate-600">({pct.toFixed(1)}%)</span>
      </span>
    );
  };

  return (
    <div id="chart-regularizados-evidencia" className="w-full bg-white border-2 border-slate-300 rounded-2xl p-4 sm:p-6 shadow-md space-y-5 font-sans">
      {/* 1. Header Dinámico */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b-2 border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black shadow-md border border-emerald-500">
            <Camera className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-wide">
                PALLETS REGULARIZADOS: CONTROL DE EVIDENCIA Y MOTIVOS
              </h2>
              <span className="bg-emerald-700 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                {totalRegularizados} Pallets Subsanados
              </span>
              {filters.area !== 'TODAS' && (
                <span className="bg-blue-100 text-blue-900 border border-blue-300 text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                  <MapPin className="w-3 h-3 text-blue-600" />
                  {filters.area}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Auditoría de cumplimiento fotográfico y desglose de causas de observación en pallets regularizados
            </p>
          </div>
        </div>

        {/* Selector de Modo de Visualización: [Ambos # y %] [# Cantidad] [% Porcentaje] */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-300 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode('both')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'both'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Mostrar Cantidad y Porcentaje juntos"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Ambos (# y %)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('count')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'count'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Visualizar solo en número de pallets"
          >
            <Hash className="w-3.5 h-3.5 text-blue-400" />
            <span>Cantidad (#)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('percentage')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'percentage'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Visualizar en porcentaje relativo"
          >
            <Percent className="w-3.5 h-3.5 text-emerald-400" />
            <span>Porcentaje (%)</span>
          </button>
        </div>
      </div>

      {totalRegularizados === 0 ? (
        <div className="p-10 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-black text-slate-800 uppercase">
            No hay pallets regularizados con los filtros activos
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Actualmente el filtro de Estatus puede estar en «PENDIENTE» o no hay registros subsanados para este periodo o área.
          </p>
          {filters.estado === 'PENDIENTE' && onFilterChange && (
            <button
              onClick={() => onFilterChange({ ...filters, estado: 'TODOS' })}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Mostrar Todos los Estatus para ver Regularizados
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 2. Top 2 Hero Cards: ¿Compartieron la Evidencia o No? */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Con Evidencia Compartida (Vivid Emerald Green) */}
            <div
              onClick={() => {
                setEvidenciaFilter('CON_EVIDENCIA');
                setSelectedMotivo(null);
                setShowDetailModal(true);
              }}
              className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-2xl p-5 shadow-md border-2 border-emerald-400 relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-8 -mt-8" />
              <div className="flex items-center justify-between z-10 relative">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-100 flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-white/20 text-white">
                    <Camera className="w-4 h-4 text-emerald-200" />
                  </span>
                  Evidencia Compartida
                </span>
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-white/25 text-white backdrop-blur-xs border border-white/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {conEvidenciaPct.toFixed(1)}% del Total
                </span>
              </div>

              <div className="my-3 z-10 relative">
                <div className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
                  {viewMode === 'percentage' ? `${conEvidenciaPct.toFixed(1)}%` : conEvidenciaCount}
                  {viewMode === 'both' && (
                    <span className="text-xl sm:text-2xl font-bold text-emerald-200 ml-2">
                      ({conEvidenciaPct.toFixed(1)}%)
                    </span>
                  )}
                  {viewMode === 'count' && (
                    <span className="text-xs font-bold text-emerald-200 ml-2">pallets certificados</span>
                  )}
                </div>
                <p className="text-xs text-emerald-100 font-semibold mt-1">
                  Regularización respaldada con fotografía o sustento formal adjunto
                </p>
              </div>

              {/* Progress visual */}
              <div className="w-full bg-emerald-950/40 h-2.5 rounded-full overflow-hidden mb-3 z-10 relative border border-emerald-400/30">
                <div
                  className="bg-emerald-300 h-full rounded-full transition-all duration-500 shadow-xs"
                  style={{ width: `${conEvidenciaPct}%` }}
                />
              </div>

              <div className="pt-2 border-t border-white/20 text-[11px] font-extrabold text-emerald-100 flex items-center justify-between z-10 relative">
                <span>Auditoría conforme</span>
                <span className="text-white bg-emerald-900/80 px-2.5 py-0.5 rounded-full font-black flex items-center gap-1 group-hover:bg-emerald-950">
                  Ver {conEvidenciaCount} pallets <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Card 2: Sin Evidencia Compartida (Vivid Amber / Orange) */}
            <div
              onClick={() => {
                setEvidenciaFilter('SIN_EVIDENCIA');
                setSelectedMotivo(null);
                setShowDetailModal(true);
              }}
              className="bg-gradient-to-br from-amber-600 via-amber-700 to-orange-800 text-white rounded-2xl p-5 shadow-md border-2 border-amber-400 relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-8 -mt-8" />
              <div className="flex items-center justify-between z-10 relative">
                <span className="text-xs font-black uppercase tracking-wider text-amber-100 flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-white/20 text-white">
                    <AlertTriangle className="w-4 h-4 text-amber-200" />
                  </span>
                  Sin Evidencia Compartida
                </span>
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-white/25 text-white backdrop-blur-xs border border-white/30 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {sinEvidenciaPct.toFixed(1)}% del Total
                </span>
              </div>

              <div className="my-3 z-10 relative">
                <div className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
                  {viewMode === 'percentage' ? `${sinEvidenciaPct.toFixed(1)}%` : sinEvidenciaCount}
                  {viewMode === 'both' && (
                    <span className="text-xl sm:text-2xl font-bold text-amber-200 ml-2">
                      ({sinEvidenciaPct.toFixed(1)}%)
                    </span>
                  )}
                  {viewMode === 'count' && (
                    <span className="text-xs font-bold text-amber-200 ml-2">pallets pendientes de foto</span>
                  )}
                </div>
                <p className="text-xs text-amber-100 font-semibold mt-1">
                  Subsanado en piso pero sin sustento fotográfico registrado
                </p>
              </div>

              {/* Progress visual */}
              <div className="w-full bg-amber-950/40 h-2.5 rounded-full overflow-hidden mb-3 z-10 relative border border-amber-400/30">
                <div
                  className="bg-amber-300 h-full rounded-full transition-all duration-500 shadow-xs"
                  style={{ width: `${sinEvidenciaPct}%` }}
                />
              </div>

              <div className="pt-2 border-t border-white/20 text-[11px] font-extrabold text-amber-100 flex items-center justify-between z-10 relative">
                <span>Pendiente de respaldo</span>
                <span className="text-white bg-amber-950/80 px-2.5 py-0.5 rounded-full font-black flex items-center gap-1 group-hover:bg-amber-950">
                  Ver {sinEvidenciaCount} pallets <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>

          {/* 3. Barra Visual Segmentada Dinámica: Proporción Global Clara */}
          <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between text-xs font-black text-slate-800">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Balance Global de Regularización ({totalRegularizados} pallets):
              </span>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-800">
                  <span className="w-3 h-3 rounded-full bg-emerald-600 border border-emerald-400 inline-block" />
                  Con Evidencia: <strong>{renderMetric(conEvidenciaCount, conEvidenciaPct)}</strong>
                </span>
                <span className="flex items-center gap-1.5 text-amber-800">
                  <span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-400 inline-block" />
                  Sin Evidencia: <strong>{renderMetric(sinEvidenciaCount, sinEvidenciaPct)}</strong>
                </span>
              </div>
            </div>

            {/* Gran barra horizontal segmentada */}
            <div className="h-6 rounded-xl overflow-hidden flex bg-slate-200 border-2 border-slate-300 shadow-inner">
              <div
                style={{ width: `${conEvidenciaPct}%` }}
                className="bg-gradient-to-r from-emerald-600 to-teal-500 flex items-center justify-center text-white text-[11px] font-black transition-all hover:brightness-110"
                title={`Con Evidencia: ${conEvidenciaCount} pallets (${conEvidenciaPct.toFixed(1)}%)`}
              >
                {conEvidenciaPct >= 12 && (
                  <span className="drop-shadow-xs px-2 truncate">
                    ✔ Con Evidencia ({conEvidenciaPct.toFixed(0)}%)
                  </span>
                )}
              </div>
              <div
                style={{ width: `${sinEvidenciaPct}%` }}
                className="bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 text-[11px] font-black transition-all hover:brightness-110"
                title={`Sin Evidencia: ${sinEvidenciaCount} pallets (${sinEvidenciaPct.toFixed(1)}%)`}
              >
                {sinEvidenciaPct >= 12 && (
                  <span className="drop-shadow-xs px-2 truncate">
                    ⚠️ Sin Evidencia ({sinEvidenciaPct.toFixed(0)}%)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 4. Desglose de Motivos: Súper claro, dinámico y no sobrecargado */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <h3 className="text-xs sm:text-sm font-black uppercase text-slate-900 tracking-wide">
                  MOTIVOS DE OBSERVACIÓN Y SU ESTATUS DE EVIDENCIA
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Haz clic en cualquier motivo para ver el listado exacto de pallets
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {motivosBreakdown.map((item) => {
                const isSelected = selectedMotivo === item.motivo;

                return (
                  <div
                    key={item.motivo}
                    onClick={() => {
                      setSelectedMotivo(item.motivo);
                      setEvidenciaFilter('TODOS');
                      setShowDetailModal(true);
                    }}
                    className={`rounded-2xl border-2 p-4 transition-all cursor-pointer relative flex flex-col justify-between hover:shadow-md ${
                      isSelected
                        ? 'border-blue-600 ring-2 ring-blue-400 bg-blue-50/50'
                        : `${item.accentColor} ${item.bgColor} hover:scale-[1.01]`
                    }`}
                  >
                    <div>
                      {/* Header de la tarjeta del motivo */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-2 rounded-xl bg-white shadow-2xs shrink-0 border border-slate-200">
                            {item.icon}
                          </div>
                          <h4 className="text-xs font-black text-slate-900 leading-snug line-clamp-2">
                            {item.motivo}
                          </h4>
                        </div>
                        <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-slate-900 text-white shrink-0 shadow-2xs">
                          {viewMode === 'percentage'
                            ? `${item.pctDelTotalReg.toFixed(1)}%`
                            : item.total}
                        </span>
                      </div>

                      {/* Métrica principal */}
                      <div className="my-2 flex items-baseline justify-between text-xs">
                        <span className="text-slate-600 font-bold text-[11px]">
                          {viewMode === 'count'
                            ? `${item.total} pallets en total`
                            : viewMode === 'percentage'
                            ? `${item.pctDelTotalReg.toFixed(1)}% del parque regularizado`
                            : `${item.total} pallets (${item.pctDelTotalReg.toFixed(1)}% del total)`}
                        </span>
                      </div>

                      {/* Mini barra segmentada para este motivo */}
                      <div className="h-3 rounded-full overflow-hidden flex bg-slate-200 border border-slate-300 shadow-inner mb-2.5">
                        <div
                          style={{ width: `${item.pctConEvidencia}%` }}
                          className="bg-emerald-600 h-full transition-all"
                          title={`Con Evidencia: ${item.conEvidencia} (${item.pctConEvidencia}%)`}
                        />
                        <div
                          style={{ width: `${item.pctSinEvidencia}%` }}
                          className="bg-amber-500 h-full transition-all"
                          title={`Sin Evidencia: ${item.sinEvidencia} (${item.pctSinEvidencia}%)`}
                        />
                      </div>
                    </div>

                    {/* Desglose inferior de con/sin evidencia */}
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                      <span className="text-emerald-800 font-extrabold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Con Foto: <strong>{renderMetric(item.conEvidencia, item.pctConEvidencia)}</strong>
                      </span>
                      <span className="text-amber-800 font-extrabold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Sin Foto: <strong>{renderMetric(item.sinEvidencia, item.pctSinEvidencia)}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Botón para inspeccionar lista de pallets */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500 font-medium">
              ¿Deseas auditar los números de LPN o supervisores?
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedMotivo(null);
                setEvidenciaFilter('TODOS');
                setShowDetailModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-slate-800 hover:to-indigo-900 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer"
            >
              <Eye className="w-4 h-4 text-amber-400" />
              <span>Ver Matriz Detallada de Pallets Regularizados ({totalRegularizados})</span>
            </button>
          </div>
        </>
      )}

      {/* 6. Modal / Drawer para Inspeccionar Pallets Regularizados */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-wide">
                    Detalle de Pallets Regularizados
                  </h3>
                  <p className="text-xs text-slate-300 font-medium">
                    {selectedMotivo ? `Filtrado por motivo: «${selectedMotivo}»` : 'Todos los motivos'} • {inspectedPallets.length} pallets encontrados
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

            {/* Modal Controls: Filtro de Evidencia y Búsqueda */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-slate-700 uppercase text-[10.5px]">Evidencia:</span>
                <button
                  type="button"
                  onClick={() => setEvidenciaFilter('TODOS')}
                  className={`px-3 py-1 rounded-lg font-black transition-all cursor-pointer ${
                    evidenciaFilter === 'TODOS'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Todos ({regularizadosSource.length})
                </button>
                <button
                  type="button"
                  onClick={() => setEvidenciaFilter('CON_EVIDENCIA')}
                  className={`px-3 py-1 rounded-lg font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    evidenciaFilter === 'CON_EVIDENCIA'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Con Evidencia ({conEvidenciaCount})
                </button>
                <button
                  type="button"
                  onClick={() => setEvidenciaFilter('SIN_EVIDENCIA')}
                  className={`px-3 py-1 rounded-lg font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    evidenciaFilter === 'SIN_EVIDENCIA'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Sin Evidencia ({sinEvidenciaCount})
                </button>
              </div>

              {/* Input de Búsqueda */}
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar pallet, área, supervisor..."
                  value={detailSearch}
                  onChange={(e) => setDetailSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
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
                    <th className="p-2.5">Motivo Original</th>
                    <th className="p-2.5 text-center">¿Evidencia?</th>
                    <th className="p-2.5">Acción / Submotivo</th>
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
                      const hasEv = checkEvidenciaCompartida(r);

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
                          <td className="p-2.5 max-w-[200px] text-slate-700 truncate" title={r.observacion}>
                            {r.observacion}
                          </td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            {hasEv ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 font-black px-2.5 py-0.5 rounded-full text-[10.5px]">
                                <Camera className="w-3 h-3 text-emerald-700" />
                                Sí Compartida
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 font-black px-2.5 py-0.5 rounded-full text-[10.5px]">
                                <Clock className="w-3 h-3 text-amber-700" />
                                Sin Evidencia
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-600 italic text-[11px]">
                            {r.subMotivo && r.subMotivo !== '-' ? r.subMotivo : 'Subsanado en turno'}
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
                Mostrando <strong className="text-slate-900">{inspectedPallets.length}</strong> de {regularizadosSource.length} pallets regularizados
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
