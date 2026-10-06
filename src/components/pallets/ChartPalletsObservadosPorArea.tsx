import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calendar,
  Layers,
  BarChart3,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Eye,
  X,
  Search,
  SlidersHorizontal,
  Sparkles,
  Info,
  RotateCcw,
} from 'lucide-react';
import { PalletObservation, formatToDDMMYYYY } from '../../types/pallets';

interface ChartPalletsObservadosPorAreaProps {
  allRecords: PalletObservation[];
}

export type PendingCategoryType = 'DESPACHADO' | 'FALTA_MOVER' | 'POR_LEVANTAR';

export interface PendingCategoryClassification {
  type: PendingCategoryType;
  label: string;
  shortLabel: string;
  badgeClass: string;
  borderClass: string;
  color: string;
}

export function classifyPendingSubmotivo(subMotivo?: string | null): PendingCategoryClassification {
  const norm = String(subMotivo || '').toLowerCase().trim();
  if (norm.includes('despachad') || norm.includes('salio') || norm.includes('enviad')) {
    return {
      type: 'DESPACHADO',
      label: 'Fueron despachados sin levantar la observación',
      shortLabel: 'Despachados sin Subsanar',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
      borderClass: 'border-rose-400',
      color: '#E11D48',
    };
  }
  if (norm.includes('drop') || norm.includes('mover') || norm.includes('logica') || norm.includes('fisica') || norm.includes('zona')) {
    return {
      type: 'FALTA_MOVER',
      label: 'Falta mover lógicamente / En drop sin ubicar físicamente',
      shortLabel: 'Falta Mover Lógicamente',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      borderClass: 'border-amber-400',
      color: '#D97706',
    };
  }
  // '_' o '-' o vacío -> Aún están por levantar la observación
  return {
    type: 'POR_LEVANTAR',
    label: 'Aún por levantar la observación (en piso)',
    shortLabel: 'Por Levantar Observación',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    borderClass: 'border-emerald-400',
    color: '#059669',
  };
}

interface ColumnBucket {
  key: string;
  fecha: string;
  area: string;
  pendientes: number;
  regularizadas: number;
  total: number;
  despachadosCount: number;
  faltaMoverCount: number;
  porLevantarCount: number;
  items: PalletObservation[];
}

interface DateGroup {
  fecha: string;
  columns: ColumnBucket[];
}

function getDayOfWeekName(dateStr: string): string {
  const parts = dateStr.split('/').map(Number);
  if (parts.length === 3) {
    const d = new Date(parts[2], parts[1] - 1, parts[0]);
    if (!isNaN(d.getTime())) {
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      return days[d.getDay()];
    }
  }
  return '';
}

export const ChartPalletsObservadosPorArea: React.FC<ChartPalletsObservadosPorAreaProps> = ({
  allRecords,
}) => {
  // 1. Extraer todas las fechas disponibles en allRecords ordenadas cronológicamente
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((r) => {
      const f = formatToDDMMYYYY(r.fecha).trim();
      if (f) {
        set.add(f);
      }
    });

    const list = Array.from(set);
    return list.sort((a, b) => {
      const partsA = a.split('/').map(Number);
      const partsB = b.split('/').map(Number);
      if (partsA.length === 3 && partsB.length === 3) {
        const timeA = new Date(partsA[2], partsA[1] - 1, partsA[0]).getTime();
        const timeB = new Date(partsB[2], partsB[1] - 1, partsB[0]).getTime();
        return timeA - timeB;
      }
      return a.localeCompare(b);
    });
  }, [allRecords]);

  // Los 4 últimos días registrados ordenados
  const last4RegisteredDates = useMemo(() => {
    return availableDates.slice(-4);
  }, [availableDates]);

  // 2. Filtro de fecha PROPIO:
  // "y que por defecto que el grafico figure de los ultimos 4 ultimos dias registrados."
  const [selectedDates, setSelectedDates] = useState<string[]>(() => {
    const set = new Set<string>();
    allRecords.forEach((r) => {
      const f = formatToDDMMYYYY(r.fecha).trim();
      if (f) set.add(f);
    });
    const list = Array.from(set).sort((a, b) => {
      const partsA = a.split('/').map(Number);
      const partsB = b.split('/').map(Number);
      if (partsA.length === 3 && partsB.length === 3) {
        const timeA = new Date(partsA[2], partsA[1] - 1, partsA[0]).getTime();
        const timeB = new Date(partsB[2], partsB[1] - 1, partsB[0]).getTime();
        return timeA - timeB;
      }
      return a.localeCompare(b);
    });
    return list.slice(-4);
  });

  // Asegurar que por defecto figuren los últimos 4 días registrados
  useEffect(() => {
    if (selectedDates.length === 0 && last4RegisteredDates.length > 0) {
      setSelectedDates(last4RegisteredDates);
    }
  }, [last4RegisteredDates, selectedDates.length]);

  // Estado para la búsqueda en vivo en la lista de fechas
  const [dateSearchQuery, setDateSearchQuery] = useState<string>('');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState<boolean>(false);
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar el dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setIsDateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [hoveredColumnKey, setHoveredColumnKey] = useState<string | null>(null);
  const [inspectedBucket, setInspectedBucket] = useState<ColumnBucket | null>(null);
  const [searchModalText, setSearchModalText] = useState<string>('');

  // Metadatos de cada fecha para la lista (Total, Regularizadas, Pendientes y Día)
  const dateMetadataMap = useMemo(() => {
    const map = new Map<string, { total: number; reg: number; pend: number; dayName: string }>();
    availableDates.forEach((date) => {
      const recs = allRecords.filter((r) => {
        const f = formatToDDMMYYYY(r.fecha).trim();
        return f === date || r.fecha.trim() === date;
      });
      const reg = recs.filter((r) => r.estado === 'REGULARIZADA').length;
      const pend = recs.filter((r) => r.estado === 'PENDIENTE').length;
      map.set(date, {
        total: recs.length,
        reg,
        pend,
        dayName: getDayOfWeekName(date),
      });
    });
    return map;
  }, [allRecords, availableDates]);

  // Lista de fechas filtrada por el buscador
  const filteredAvailableDates = useMemo(() => {
    if (!dateSearchQuery.trim()) return availableDates;
    const q = dateSearchQuery.toLowerCase().trim();
    return availableDates.filter((date) => {
      const meta = dateMetadataMap.get(date);
      const dayName = (meta?.dayName || '').toLowerCase();
      return (
        date.toLowerCase().includes(q) ||
        dayName.includes(q) ||
        (q === 'reciente' && last4RegisteredDates.includes(date)) ||
        (q === 'pendiente' && (meta?.pend || 0) > 0) ||
        (q === 'regularizada' && (meta?.reg || 0) > 0)
      );
    });
  }, [availableDates, dateSearchQuery, dateMetadataMap, last4RegisteredDates]);

  // Determinar si los últimos 4 días por defecto están activos exactamente
  const isDefault4Active = useMemo(() => {
    if (selectedDates.length !== last4RegisteredDates.length) return false;
    return last4RegisteredDates.every((d) => selectedDates.includes(d));
  }, [selectedDates, last4RegisteredDates]);

  // Toggle de fecha individual
  const handleToggleDate = (date: string) => {
    if (selectedDates.includes(date)) {
      setSelectedDates(selectedDates.filter((d) => d !== date));
    } else {
      setSelectedDates([...selectedDates, date]);
    }
  };

  // Seleccionar todas las fechas
  const handleSelectAllDates = () => {
    setSelectedDates([...availableDates]);
  };

  // Restablecer a los 4 últimos días registrados (Por Defecto)
  const handleResetToDefaultDates = () => {
    setSelectedDates([...last4RegisteredDates]);
  };

  // Limpiar selección
  const handleClearAllDates = () => {
    setSelectedDates([]);
  };

  // 3. Filtrar registros sujetos ÚNICAMENTE al filtro de fecha de este gráfico
  const activeRecords = useMemo(() => {
    if (selectedDates.length === 0) return [];
    return allRecords.filter((r) => {
      const f = formatToDDMMYYYY(r.fecha).trim();
      return selectedDates.includes(f) || selectedDates.includes(r.fecha.trim());
    });
  }, [allRecords, selectedDates]);

  // 4. Agrupación Jerárquica: Fecha -> Áreas -> Conteos de Pendientes y Regularizadas
  const groupedData: DateGroup[] = useMemo(() => {
    // Ordenar las fechas seleccionadas cronológicamente
    const sortedSelectedDates = [...selectedDates].sort((a, b) => {
      const partsA = a.split('/').map(Number);
      const partsB = b.split('/').map(Number);
      if (partsA.length === 3 && partsB.length === 3) {
        const timeA = new Date(partsA[2], partsA[1] - 1, partsA[0]).getTime();
        const timeB = new Date(partsB[2], partsB[1] - 1, partsB[0]).getTime();
        return timeA - timeB;
      }
      return a.localeCompare(b);
    });

    const groups: DateGroup[] = [];

    sortedSelectedDates.forEach((fecha) => {
      const recsInDate = activeRecords.filter((r) => {
        const f = formatToDDMMYYYY(r.fecha).trim();
        return f === fecha || r.fecha.trim() === fecha;
      });
      if (recsInDate.length === 0) return;

      // Áreas presentes en esa fecha
      // Orden preferente: CROSS DOCKING primero, luego PICKING, luego otras
      const distinctAreas = Array.from(new Set(recsInDate.map((r) => (r.area || 'DESPACHO').toUpperCase().trim())));
      distinctAreas.sort((a, b) => {
        if (a.includes('CROSS')) return -1;
        if (b.includes('CROSS')) return 1;
        return a.localeCompare(b);
      });

      const columns: ColumnBucket[] = distinctAreas.map((area) => {
        const items = recsInDate.filter((r) => (r.area || 'DESPACHO').toUpperCase().trim() === area);
        const pendientesItems = items.filter((r) => r.estado === 'PENDIENTE');
        const regularizadasItems = items.filter((r) => r.estado === 'REGULARIZADA');

        let despachados = 0;
        let faltaMover = 0;
        let porLevantar = 0;

        pendientesItems.forEach((p) => {
          const c = classifyPendingSubmotivo(p.subMotivo);
          if (c.type === 'DESPACHADO') despachados += 1;
          else if (c.type === 'FALTA_MOVER') faltaMover += 1;
          else porLevantar += 1;
        });

        return {
          key: `${fecha}_${area}`,
          fecha,
          area,
          pendientes: pendientesItems.length,
          regularizadas: regularizadasItems.length,
          total: items.length,
          despachadosCount: despachados,
          faltaMoverCount: faltaMover,
          porLevantarCount: porLevantar,
          items,
        };
      });

      groups.push({
        fecha,
        columns,
      });
    });

    return groups;
  }, [activeRecords, selectedDates]);

  // Lista plana de columnas para renderizar en el gráfico
  const flatColumns = useMemo(() => {
    return groupedData.flatMap((g) => g.columns);
  }, [groupedData]);

  // Escala máxima del gráfico (mínimo 8 como en Excel de la imagen de referencia)
  const maxBarValue = useMemo(() => {
    let m = 8;
    flatColumns.forEach((c) => {
      if (c.regularizadas > m) m = c.regularizadas;
      if (c.pendientes > m) m = c.pendientes;
    });
    return Math.ceil(m * 1.15);
  }, [flatColumns]);

  // Totales globales para las tarjetas de resumen
  const globalSummary = useMemo(() => {
    let regTotal = 0;
    let pendTotal = 0;
    let despachadosTotal = 0;
    let faltaMoverTotal = 0;
    let porLevantarTotal = 0;

    flatColumns.forEach((c) => {
      regTotal += c.regularizadas;
      pendTotal += c.pendientes;
      despachadosTotal += c.despachadosCount;
      faltaMoverTotal += c.faltaMoverCount;
      porLevantarTotal += c.porLevantarCount;
    });

    return {
      total: regTotal + pendTotal,
      regTotal,
      pendTotal,
      despachadosTotal,
      faltaMoverTotal,
      porLevantarTotal,
    };
  }, [flatColumns]);

  // Registros para el modal de inspección
  const modalRecords = useMemo(() => {
    if (!inspectedBucket) return [];
    let list = inspectedBucket.items;
    if (searchModalText.trim()) {
      const q = searchModalText.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.palletId.toLowerCase().includes(q) ||
          r.responsable.toLowerCase().includes(q) ||
          r.observacion.toLowerCase().includes(q) ||
          (r.subMotivo && r.subMotivo.toLowerCase().includes(q))
      );
    }
    return list;
  }, [inspectedBucket, searchModalText]);

  // Ticks para el eje Y (0, 1, 2, ..., maxBarValue)
  const yAxisTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = maxBarValue <= 10 ? 1 : Math.ceil(maxBarValue / 8);
    for (let i = maxBarValue; i >= 0; i -= step) {
      ticks.push(i);
    }
    if (ticks[ticks.length - 1] !== 0) ticks.push(0);
    return ticks;
  }, [maxBarValue]);

  return (
    <section
      id="grafico-pallets-observados-area-fecha"
      className="bg-white rounded-2xl border-2 border-slate-300 shadow-md p-4 sm:p-6 space-y-5 relative"
    >
      {/* 1. Header con Título Oficial y Badge de Control Exclusivo */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-2.5 rounded-xl shadow-sm text-white font-black">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black tracking-wide text-slate-900 uppercase">
                PALLETS OBSERVADOS: PENDIENTES Y REGULARIZADAS POR ÁREA
              </h3>
              <span className="bg-blue-100 text-blue-900 text-[10.5px] font-black px-2.5 py-0.5 rounded-full border border-blue-300 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-blue-600" />
                Filtro de Fecha Independiente
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Comparativo de estatus por fecha y área operativa con desglose de la causa de pendientes.
            </p>
          </div>
        </div>

        {/* Controles de Acción Rápida: Dropdown Compacto como los demás filtros del sistema */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Dropdown Compacto de Fechas */}
          <div className="relative" ref={dateDropdownRef}>
            <button
              type="button"
              onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer shadow-xs ${
                !isDefault4Active && selectedDates.length > 0
                  ? 'bg-blue-50 border-blue-600 text-blue-950 ring-2 ring-blue-600/20'
                  : 'bg-[#F8FAFC] hover:bg-white border-[#CBD5E1] text-[#0F172A]'
              }`}
            >
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-black text-slate-700 uppercase text-[11px]">Fechas:</span>
              <span className="font-extrabold text-slate-900 truncate max-w-[150px]">
                {isDefault4Active
                  ? 'Últimos 4 Días'
                  : selectedDates.length === 0
                  ? 'Ninguna'
                  : selectedDates.length === availableDates.length
                  ? 'Todas las Fechas'
                  : `${selectedDates.length} seleccionadas`}
              </span>
              <span className="bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {selectedDates.length}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {/* Popover Flotante (no ocupa espacio en el flujo de la página) */}
            {isDateDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border-2 border-slate-300 p-3 z-50 animate-in fade-in zoom-in-95 space-y-2.5">
                {/* Cabecera del Dropdown */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 uppercase">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Selección de Fechas</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDateDropdownOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Acciones Rápidas */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleResetToDefaultDates}
                    className={`text-[10.5px] font-black px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 border ${
                      isDefault4Active
                        ? 'bg-blue-600 text-white border-blue-700'
                        : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Últimos 4 Días</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAllDates}
                    className="text-[10.5px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg border border-slate-300 transition-colors cursor-pointer"
                  >
                    Marcar Todas
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllDates}
                    className="text-[10.5px] font-bold bg-white hover:bg-rose-50 text-rose-700 px-2 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                  >
                    Limpiar
                  </button>
                </div>

                {/* Buscador dentro del Popover */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={dateSearchQuery}
                    onChange={(e) => setDateSearchQuery(e.target.value)}
                    placeholder="Buscar fecha o día..."
                    className="w-full pl-8 pr-7 py-1.5 bg-slate-50 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  {dateSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setDateSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Lista con scroll dentro del popover */}
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-2xs scrollbar-thin">
                  {filteredAvailableDates.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Sin coincidencias para "{dateSearchQuery}".
                    </div>
                  ) : (
                    filteredAvailableDates.map((date) => {
                      const isSelected = selectedDates.includes(date);
                      const meta = dateMetadataMap.get(date);
                      const isRecent = last4RegisteredDates.includes(date);

                      return (
                        <div
                          key={date}
                          onClick={() => handleToggleDate(date)}
                          className={`px-3 py-2 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors cursor-pointer select-none text-xs ${
                            isSelected ? 'bg-blue-50/70 font-black' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                            />
                            <span className={isSelected ? 'text-blue-900 font-bold' : 'text-slate-800 font-medium'}>
                              {date}
                            </span>
                            {meta?.dayName && (
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-md">
                                {meta.dayName}
                              </span>
                            )}
                            {isRecent && (
                              <span className="text-[9px] font-black text-amber-800 bg-amber-100 px-1 py-0.2 rounded-md">
                                Reciente
                              </span>
                            )}
                          </div>
                          <span className="text-[10.5px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md">
                            {meta?.total || 0} pal.
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Botón de acceso directo: Últimos 4 Días */}
          <button
            type="button"
            onClick={handleResetToDefaultDates}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
              isDefault4Active
                ? 'bg-blue-600 text-white border-blue-700'
                : 'bg-white hover:bg-blue-50 text-blue-700 border-blue-300'
            }`}
            title="Por defecto muestra los 4 días más recientes registrados"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Últimos 4 Días (Por Defecto)</span>
          </button>
        </div>
      </div>

      {/* Indicador de Fechas Activas Compacto (ocupa mínimo espacio) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-extrabold text-slate-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            Fechas en Gráfico ({selectedDates.length}):
          </span>
          {selectedDates.length === 0 ? (
            <span className="text-xs text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
              Ninguna fecha seleccionada
            </span>
          ) : (
            selectedDates.map((d) => (
              <span
                key={d}
                className="bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold pl-2 pr-1 py-0.5 rounded-md flex items-center gap-1 shadow-2xs"
              >
                <span>{d}</span>
                <button
                  type="button"
                  onClick={() => handleToggleDate(d)}
                  className="hover:bg-blue-200 p-0.5 rounded-xs transition-colors cursor-pointer text-blue-700"
                  title={`Quitar ${d}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
        </div>
        {!isDefault4Active && (
          <button
            type="button"
            onClick={handleResetToDefaultDates}
            className="text-[11px] font-black text-blue-600 hover:text-blue-800 underline cursor-pointer"
          >
            Restablecer a últimos 4 días
          </button>
        )}
      </div>

      {/* 3. Tiras de Tarjetas de Resumen KPI y Desglose Operativo de Pendientes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Total Pallets */}
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xs border border-slate-700 flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-slate-300">Total Pallets</span>
          <div className="text-2xl font-black text-white my-1 tabular-nums">
            {globalSummary.total}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">En fechas seleccionadas</span>
        </div>

        {/* Regularizadas (Naranja) */}
        <div className="bg-orange-50 text-orange-950 p-3 rounded-xl shadow-xs border-2 border-orange-300 flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-orange-800 flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#EA580C]" />
            Regularizadas
          </span>
          <div className="text-2xl font-black text-orange-600 my-1 tabular-nums">
            {globalSummary.regTotal}
          </div>
          <span className="text-[10px] text-orange-800 font-bold">
            {globalSummary.total > 0 ? `${((globalSummary.regTotal / globalSummary.total) * 100).toFixed(1)}%` : '0%'}
          </span>
        </div>

        {/* Pendientes (Azul) */}
        <div className="bg-blue-50 text-blue-950 p-3 rounded-xl shadow-xs border-2 border-blue-300 flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-blue-800 flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#2563EB]" />
            Pendientes
          </span>
          <div className="text-2xl font-black text-blue-600 my-1 tabular-nums">
            {globalSummary.pendTotal}
          </div>
          <span className="text-[10px] text-blue-800 font-bold">
            {globalSummary.total > 0 ? `${((globalSummary.pendTotal / globalSummary.total) * 100).toFixed(1)}%` : '0%'}
          </span>
        </div>

        {/* Desglose Pendiente 1: Despachados sin levantar */}
        <div className="bg-rose-50 text-rose-950 p-3 rounded-xl shadow-xs border border-rose-300 flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-rose-800 flex items-center gap-1 truncate" title="Fueron despachados sin levantar la observación">
            <Truck className="w-3 h-3 text-rose-600 shrink-0" />
            Despachados s/lev.
          </span>
          <div className="text-xl font-black text-rose-700 my-1 tabular-nums">
            {globalSummary.despachadosTotal}
          </div>
          <span className="text-[9.5px] text-rose-700 font-medium">Ya en transporte</span>
        </div>

        {/* Desglose Pendiente 2: Falta mover lógicamente */}
        <div className="bg-amber-50 text-amber-950 p-3 rounded-xl shadow-xs border border-amber-300 flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-amber-800 flex items-center gap-1 truncate" title="Falta mover lógicamente / En drop sin ubicar">
            <Package className="w-3 h-3 text-amber-600 shrink-0" />
            Falta mover lóg.
          </span>
          <div className="text-xl font-black text-amber-700 my-1 tabular-nums">
            {globalSummary.faltaMoverTotal}
          </div>
          <span className="text-[9.5px] text-amber-700 font-medium">En drop s/ubicación</span>
        </div>

        {/* Desglose Pendiente 3: Aún por levantar observación ('_') */}
        <div className="bg-emerald-50 text-emerald-950 p-3 rounded-xl shadow-xs border border-emerald-300 flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-emerald-800 flex items-center gap-1 truncate" title="Aún por levantar la observación (sub-motivo '_')">
            <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
            Por levantar ('_')
          </span>
          <div className="text-xl font-black text-emerald-700 my-1 tabular-nums">
            {globalSummary.porLevantarTotal}
          </div>
          <span className="text-[9.5px] text-emerald-700 font-medium">Subsanables en piso</span>
        </div>
      </div>

      {/* 4. ÁREA DEL GRÁFICO (REPRODUCCIÓN EXACTA DEL DISEÑO EXCEL DE LA IMAGEN DE REFERENCIA) */}
      <div className="w-full bg-[#FFFFFF] border-2 border-slate-300 rounded-2xl p-4 sm:p-6 shadow-inner relative overflow-hidden">
        {/* Título Central del Gráfico como en la imagen */}
        <div className="text-center mb-4">
          <h4 className="text-base sm:text-lg font-black text-slate-800 tracking-wider uppercase font-sans">
            PALLETS OBSERVADOS
          </h4>
        </div>

        {flatColumns.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <p className="text-sm font-black text-slate-600 uppercase">
              No hay datos para las fechas seleccionadas
            </p>
            <p className="text-xs text-slate-400">
              Seleccione al menos una fecha con registros en el selector superior.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4 scrollbar-thin">
            <div
              className="mx-auto"
              style={{ minWidth: flatColumns.length > 4 ? `${flatColumns.length * 115 + 140}px` : '100%' }}
            >
              <table className="w-full border-collapse border-2 border-slate-300 bg-white table-fixed">
                {/* 1. Header Fila 1: Fechas (Agrupadas abarcando sus áreas) */}
                <thead>
                  <tr className="bg-slate-900 text-white text-xs font-black border-b border-slate-700">
                    <th className="w-36 min-w-[140px] max-w-[140px] p-2.5 text-left border-r border-slate-700 bg-slate-950 uppercase tracking-wider text-[11px]">
                      Eje / Indicador
                    </th>
                    {groupedData.map((g) => (
                      <th
                        key={g.fecha}
                        colSpan={g.columns.length}
                        className="p-2.5 font-black text-white border-r border-slate-700 text-xs sm:text-sm tracking-wide bg-gradient-to-r from-slate-900 to-indigo-950 text-center"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          <span>{g.fecha}</span>
                          <span className="text-[10px] text-slate-300 font-bold bg-white/10 px-2 py-0.5 rounded-full">
                            {getDayOfWeekName(g.fecha)}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>

                  {/* 2. Header Fila 2: Áreas Operativas bajo cada fecha */}
                  <tr className="bg-slate-100 text-slate-800 text-xs font-black border-b-2 border-slate-400">
                    <th className="w-36 min-w-[140px] max-w-[140px] p-2 text-left border-r border-slate-300 bg-slate-200 uppercase tracking-wider text-[11px] text-slate-700">
                      Área Operativa
                    </th>
                    {flatColumns.map((col) => (
                      <th
                        key={col.key}
                        className="p-2 font-black text-slate-900 text-xs border-r border-slate-300 bg-slate-100 text-center"
                        title={col.area}
                      >
                        <span className="truncate block uppercase">{col.area}</span>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {/* 3. FILA DE BARRAS: Directamente en la misma celda de cada columna (100% alineadas con Fechas y Áreas) */}
                  <tr className="border-b-2 border-slate-400 bg-white">
                    {/* Eje Y de referencia */}
                    <td className="w-36 min-w-[140px] max-w-[140px] p-2 text-left align-bottom border-r-2 border-slate-400 bg-slate-50/80">
                      <div className="h-[300px] flex flex-col justify-between py-2 text-right pr-2 select-none">
                        {yAxisTicks.map((val) => (
                          <div key={val} className="text-[10.5px] font-bold text-slate-500 tabular-nums leading-none">
                            {val}
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Celdas con las Barras de cada columna */}
                    {flatColumns.map((col) => {
                      const isHovered = hoveredColumnKey === col.key;
                      const pendHeightPct = Math.min(100, (col.pendientes / maxBarValue) * 100);
                      const regHeightPct = Math.min(100, (col.regularizadas / maxBarValue) * 100);

                      return (
                        <td
                          key={`bar_${col.key}`}
                          className={`p-2 align-bottom border-r border-slate-300 relative transition-colors cursor-pointer ${
                            isHovered ? 'bg-blue-50/50' : 'bg-slate-50/20'
                          }`}
                          onMouseEnter={() => setHoveredColumnKey(col.key)}
                          onMouseLeave={() => setHoveredColumnKey(null)}
                          onClick={() => setInspectedBucket(col)}
                        >
                          {/* Cuadro Flotante / Tooltip al hacer hover */}
                          {isHovered && (
                            <div className="absolute z-50 bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 bg-slate-900 text-white p-3 rounded-xl shadow-2xl border border-slate-700 whitespace-nowrap animate-in fade-in zoom-in-95 pointer-events-none text-xs">
                              <div className="text-[11px] font-black border-b border-slate-700 pb-1 mb-1.5 flex items-center justify-between gap-3 text-amber-300">
                                <span>{col.fecha}</span>
                                <span className="text-white font-extrabold uppercase">{col.area}</span>
                              </div>
                              <div className="space-y-1 text-[11px]">
                                <div className="flex items-center justify-between gap-4 text-orange-400 font-bold">
                                  <span>Regularizadas:</span>
                                  <span className="font-black text-white">{col.regularizadas}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 text-blue-400 font-bold">
                                  <span>Pendientes:</span>
                                  <span className="font-black text-white">{col.pendientes}</span>
                                </div>
                                {col.pendientes > 0 && (
                                  <div className="pt-1.5 border-t border-slate-800 space-y-0.5 text-[10px]">
                                    {col.despachadosCount > 0 && (
                                      <div className="text-rose-300 flex items-center justify-between gap-2">
                                        <span>• Despachados s/levantar:</span>
                                        <strong>{col.despachadosCount}</strong>
                                      </div>
                                    )}
                                    {col.faltaMoverCount > 0 && (
                                      <div className="text-amber-300 flex items-center justify-between gap-2">
                                        <span>• Falta mover lógicamente:</span>
                                        <strong>{col.faltaMoverCount}</strong>
                                      </div>
                                    )}
                                    {col.porLevantarCount > 0 && (
                                      <div className="text-emerald-300 flex items-center justify-between gap-2">
                                        <span>• Aún por levantar ('_'):</span>
                                        <strong>{col.porLevantarCount}</strong>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="text-[9.5px] text-slate-400 mt-1 pt-1 border-t border-slate-800 text-center">
                                Clic para ver los {col.total} pallets
                              </div>
                            </div>
                          )}

                          {/* Contenedor de Altura Fija de las Barras con Guías Horizontales */}
                          <div className="h-[300px] w-full flex items-end justify-center gap-1.5 sm:gap-2.5 relative">
                            {/* Líneas de cuadrícula punteadas */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                              {yAxisTicks.map((val) => (
                                <div key={val} className="w-full border-b border-slate-200 border-dashed" />
                              ))}
                            </div>

                            {/* Barra 1: PENDIENTE (Azul con efecto 3D) */}
                            <div className="flex flex-col items-center justify-end h-full z-10 w-7 sm:w-9 md:w-10">
                              {col.pendientes > 0 && (
                                <span className="text-[11px] font-black text-blue-700 mb-1 leading-none drop-shadow-2xs">
                                  {col.pendientes}
                                </span>
                              )}
                              <div
                                style={{ height: `${Math.max(col.pendientes > 0 ? 12 : 2, pendHeightPct)}%` }}
                                className={`w-full transition-all rounded-xs relative ${
                                  col.pendientes > 0
                                    ? 'bg-[#3B82F6] hover:bg-[#2563EB] shadow-md border-t border-l border-white/60 before:content-[\'\'] before:absolute before:-top-1.5 before:left-0 before:right-0 before:h-1.5 before:bg-[#60A5FA] before:rounded-t-xs after:content-[\'\'] after:absolute after:top-0 after:-right-1.5 after:bottom-0 after:w-1.5 after:bg-[#1D4ED8]'
                                    : 'h-0.5 bg-slate-300'
                                }`}
                              />
                            </div>

                            {/* Barra 2: REGULARIZADA (Naranja con efecto 3D) */}
                            <div className="flex flex-col items-center justify-end h-full z-10 w-7 sm:w-9 md:w-10">
                              {col.regularizadas > 0 && (
                                <span className="text-[11px] font-black text-orange-700 mb-1 leading-none drop-shadow-2xs">
                                  {col.regularizadas}
                                </span>
                              )}
                              <div
                                style={{ height: `${Math.max(col.regularizadas > 0 ? 12 : 2, regHeightPct)}%` }}
                                className={`w-full transition-all rounded-xs relative ${
                                  col.regularizadas > 0
                                    ? 'bg-[#EA580C] hover:bg-[#C2410C] shadow-md border-t border-l border-white/60 before:content-[\'\'] before:absolute before:-top-1.5 before:left-0 before:right-0 before:h-1.5 before:bg-[#FB923C] before:rounded-t-xs after:content-[\'\'] after:absolute after:top-0 after:-right-1.5 after:bottom-0 after:w-1.5 after:bg-[#9A3412]'
                                    : 'h-0.5 bg-slate-300'
                                }`}
                              />
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* 4. FILA DE PENDIENTE */}
                  <tr className="border-b border-slate-300 hover:bg-blue-50/40 transition-colors">
                    <td className="p-2 text-left font-black text-blue-800 border-r border-slate-300 flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-[#3B82F6] rounded-xs inline-block shrink-0 shadow-2xs" />
                      <span>PENDIENTE</span>
                    </td>
                    {flatColumns.map((col) => (
                      <td
                        key={`pend_${col.key}`}
                        onClick={() => setInspectedBucket(col)}
                        className={`p-2 font-black text-xs sm:text-sm border-r border-slate-300 text-center cursor-pointer ${
                          col.pendientes > 0
                            ? 'text-blue-700 bg-blue-50/70 hover:bg-blue-100'
                            : 'text-slate-300'
                        }`}
                        title={col.pendientes > 0 ? `Pendientes en ${col.area}: ${col.pendientes}` : ''}
                      >
                        {col.pendientes > 0 ? col.pendientes : '-'}
                      </td>
                    ))}
                  </tr>

                  {/* 5. FILA DE REGULARIZADA */}
                  <tr className="border-b border-slate-300 hover:bg-orange-50/40 transition-colors">
                    <td className="p-2 text-left font-black text-orange-800 border-r border-slate-300 flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-[#EA580C] rounded-xs inline-block shrink-0 shadow-2xs" />
                      <span>REGULARIZADA</span>
                    </td>
                    {flatColumns.map((col) => (
                      <td
                        key={`reg_${col.key}`}
                        onClick={() => setInspectedBucket(col)}
                        className={`p-2 font-black text-xs sm:text-sm border-r border-slate-300 text-center cursor-pointer ${
                          col.regularizadas > 0
                            ? 'text-orange-700 bg-orange-50/70 hover:bg-orange-100'
                            : 'text-slate-300'
                        }`}
                        title={col.regularizadas > 0 ? `Regularizadas en ${col.area}: ${col.regularizadas}` : ''}
                      >
                        {col.regularizadas > 0 ? col.regularizadas : '-'}
                      </td>
                    ))}
                  </tr>

                  {/* 6. FILA DE TOTAL */}
                  <tr className="bg-slate-100 font-black text-slate-800">
                    <td className="p-2 text-left border-r border-slate-300 text-xs uppercase">
                      TOTAL PALLETS
                    </td>
                    {flatColumns.map((col) => (
                      <td
                        key={`tot_${col.key}`}
                        className="p-2 text-xs sm:text-sm border-r border-slate-300 text-center font-black"
                      >
                        {col.total}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Leyenda y Notas Operativas al pie del gráfico */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5 text-blue-900 font-bold">
              <span className="w-3.5 h-3.5 bg-[#3B82F6] rounded-xs shadow-2xs border border-blue-400" />
              <span>PENDIENTE (Azul)</span>
            </div>
            <div className="flex items-center gap-1.5 text-orange-900 font-bold">
              <span className="w-3.5 h-3.5 bg-[#EA580C] rounded-xs shadow-2xs border border-orange-400" />
              <span>REGULARIZADA (Naranja)</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            💡 Haga clic en cualquier barra o celda numérica para inspeccionar el listado detallado de pallets.
          </div>
        </div>
      </div>

      {/* 6. MODAL DE INSPECCIÓN DETALLADA DE PALLETS */}
      {inspectedBucket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-300 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-white/10 text-amber-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black uppercase text-white">
                    Detalle de Pallets: {inspectedBucket.fecha} — {inspectedBucket.area}
                  </h4>
                  <p className="text-xs text-slate-300 font-medium">
                    Total: <strong className="text-white">{inspectedBucket.total}</strong> pallets ({inspectedBucket.regularizadas} regularizados, {inspectedBucket.pendientes} pendientes)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInspectedBucket(null);
                  setSearchModalText('');
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchModalText}
                onChange={(e) => setSearchModalText(e.target.value)}
                placeholder="Buscar por ID de pallet, supervisor, observación..."
                className="w-full text-xs bg-transparent border-none outline-none font-semibold text-slate-800 placeholder-slate-400"
              />
              {searchModalText && (
                <button
                  type="button"
                  onClick={() => setSearchModalText('')}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Modal Table Content */}
            <div className="p-4 overflow-y-auto flex-1 scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10.5px] border-b border-slate-300">
                    <th className="p-2.5">N°</th>
                    <th className="p-2.5">ID Pallet</th>
                    <th className="p-2.5">Supervisor</th>
                    <th className="p-2.5">Estatus</th>
                    <th className="p-2.5">Observación</th>
                    <th className="p-2.5">Diagnóstico Sub-Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {modalRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 font-semibold">
                        No se encontraron pallets con el criterio de búsqueda.
                      </td>
                    </tr>
                  ) : (
                    modalRecords.map((r, i) => {
                      const isPend = r.estado === 'PENDIENTE';
                      const pendClass = isPend ? classifyPendingSubmotivo(r.subMotivo) : null;

                      return (
                        <tr key={r.id || i} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 text-slate-400 font-bold">{i + 1}</td>
                          <td className="p-2.5 font-mono font-black text-slate-900">{r.palletId}</td>
                          <td className="p-2.5 text-slate-700 font-bold whitespace-nowrap">{r.responsable}</td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full font-black text-[10.5px] border ${
                                isPend
                                  ? 'bg-blue-100 text-blue-900 border-blue-300'
                                  : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              }`}
                            >
                              {r.estado}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-700 max-w-[220px] truncate" title={r.observacion}>
                            {r.observacion}
                          </td>
                          <td className="p-2.5">
                            {isPend && pendClass ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10.5px] border ${pendClass.badgeClass}`}>
                                <span>{pendClass.shortLabel}</span>
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px] italic">
                                {r.subMotivo || 'Regularizado'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>
                Mostrando <strong className="text-slate-900">{modalRecords.length}</strong> de {inspectedBucket.total} pallets
              </span>
              <button
                type="button"
                onClick={() => {
                  setInspectedBucket(null);
                  setSearchModalText('');
                }}
                className="bg-slate-800 text-white font-bold px-4 py-1.5 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
