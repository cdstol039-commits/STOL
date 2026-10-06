import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Users,
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Layers,
  Calendar,
  FileSpreadsheet,
  Upload,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  ArrowDownRight,
  Info,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Tag,
  Download,
  RotateCcw,
} from 'lucide-react';
import {
  MONTH_LABELS,
  MonthKey,
  SupervisorObservation,
  AUDITOR_NAMES,
  SupervisorRecord,
  MonthData,
} from '../../data/supervisorsData';
import { generateSupervisorTemplateWorkbook } from '../../utils/supervisorExcelParser';

interface SupervisorDetailSectionProps {
  observations: SupervisorObservation[];
  supervisorsData: Record<MonthKey, MonthData>;
  onOpenUploadModal: () => void;
  activeFileName?: string | null;
  onResetDefaultData?: () => void;
  isCustomDataActive?: boolean;
}

const formatPct = (x: number | null | undefined): string => {
  if (x == null || isNaN(x)) return '–';
  return (x * 100).toFixed(1) + '%';
};

const getSupervisorWeekTotal = (s: SupervisorRecord, i: number): number | null => {
  if (!s || !s.op) return null;
  const op = s.op[i];
  if (op == null) return null;
  const rh = s.rh?.[i] ?? 0;
  const sg = s.sg?.[i] ?? 0;
  return op + rh + sg;
};

export const SupervisorDetailSection: React.FC<SupervisorDetailSectionProps> = ({
  observations = [],
  supervisorsData = {},
  onOpenUploadModal,
  activeFileName,
  onResetDefaultData,
  isCustomDataActive,
}) => {
  // =========================================================================
  // 1. ESTADOS LOCALES (Declarados estrictamente primero para evitar TDZ)
  // =========================================================================
  const [selectedMonth, setSelectedMonth] = useState<MonthKey | 'ALL'>('SET');
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('Pedro Oliva');
  const [filterComponente, setFilterComponente] = useState<'ALL' | 'Operaciones' | 'RRHH' | 'SIG'>('ALL');
  const [filterSeveridad, setFilterSeveridad] = useState<'ALL' | 'alta' | 'media' | 'baja'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // =========================================================================
  // 2. LISTA DE SUPERVISORES OPERATIVOS SEGÚN EL MES SELECCIONADO
  // =========================================================================
  const operationalSupervisorsList = useMemo(() => {
    // Si es año completo ('ALL'), listar todos los supervisores que tuvieron actividad en 2026
    if (selectedMonth === 'ALL') {
      const names = new Set<string>();
      Object.values(supervisorsData || {}).forEach((mData) => {
        (mData?.s || []).forEach((s) => {
          if (!AUDITOR_NAMES.includes(s.n as any)) {
            names.add(s.n);
          }
        });
      });

      // Orden predeterminado intuitivo
      const priorityOrder = ['Pedro Oliva', 'Liz Minaya', 'Jaiter Girón', 'Marco Silva', 'Kevin Tamara'];
      return Array.from(names).sort((a, b) => {
        const ia = priorityOrder.indexOf(a);
        const ib = priorityOrder.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b);
      });
    }

    // Para un mes específico: SOLO los supervisores que operaron en ese mes
    const mData = supervisorsData?.[selectedMonth];
    if (!mData || !mData.s) return [];

    return mData.s
      .filter((s) => !AUDITOR_NAMES.includes(s.n as any))
      .filter((s) => {
        // Kevin Tamara finalizó en Abril: en MAY, JUN, JUL, AGO, SET ya NO debe aparecer
        if (['MAY', 'JUN', 'JUL', 'AGO', 'SET'].includes(selectedMonth) && s.n === 'Kevin Tamara') {
          return false;
        }
        // Marco Silva ingresó en Mayo: en ENE, FEB, MAR, ABR no debe aparecer
        if (['ENE', 'FEB', 'MAR', 'ABR'].includes(selectedMonth) && s.n === 'Marco Silva') {
          return false;
        }
        return true;
      })
      .map((s) => s.n);
  }, [supervisorsData, selectedMonth]);

  // Mantener supervisor seleccionado válido cuando cambia el mes o la lista
  useEffect(() => {
    if (operationalSupervisorsList.length > 0 && !operationalSupervisorsList.includes(selectedSupervisor)) {
      // Si el supervisor seleccionado era Kevin Tamara y pasamos a Mayo-Setiembre,
      // cambiar automáticamente a Marco Silva (su reemplazo) o al primero
      if (selectedSupervisor === 'Kevin Tamara' && operationalSupervisorsList.includes('Marco Silva')) {
        setSelectedSupervisor('Marco Silva');
      } else if (selectedSupervisor === 'Marco Silva' && operationalSupervisorsList.includes('Kevin Tamara')) {
        setSelectedSupervisor('Kevin Tamara');
      } else {
        setSelectedSupervisor(operationalSupervisorsList[0]);
      }
    }
  }, [operationalSupervisorsList, selectedSupervisor]);

  // =========================================================================
  // 3. INFORMACIÓN DEL PERIODO Y PROMEDIOS PARA EL SUPERVISOR SELECCIONADO
  // =========================================================================
  const currentMonthData = useMemo(() => {
    const isAll = selectedMonth === 'ALL';

    if (isAll) {
      const allMonthKeys = Object.keys(supervisorsData || {}) as MonthKey[];
      // Meses activos reales del supervisor
      const activeMonths = allMonthKeys.filter((m) => {
        if (selectedSupervisor === 'Kevin Tamara' && ['MAY', 'JUN', 'JUL', 'AGO', 'SET'].includes(m)) {
          return false;
        }
        if (selectedSupervisor === 'Marco Silva' && ['ENE', 'FEB', 'MAR', 'ABR'].includes(m)) {
          return false;
        }
        return supervisorsData[m]?.s?.some((s) => s.n === selectedSupervisor);
      });

      const activeRecords = activeMonths
        .map((m) => ({
          monthKey: m,
          monthLabel: MONTH_LABELS[m] || m,
          data: supervisorsData[m],
          rec: supervisorsData[m]?.s?.find((s) => s.n === selectedSupervisor) || null,
        }))
        .filter((item): item is { monthKey: MonthKey; monthLabel: string; data: MonthData; rec: SupervisorRecord } => item.rec != null);

      // Determinación oficial de Jefe / Supervisor General
      // Pedro Morante es jefe de: Jaiter Girón, Marco Silva y Kevin Tamara
      // Aldo Bautista es jefe de: Pedro Oliva y Liz Minaya
      const generalSupervisor =
        activeRecords[0]?.rec?.t ||
        (['Kevin Tamara', 'Marco Silva', 'Jaiter Girón'].includes(selectedSupervisor)
          ? 'Pedro Morante'
          : 'Aldo Bautista');

      let monthLabel = `Año Completo (${activeMonths.length} meses auditados)`;
      if (selectedSupervisor === 'Kevin Tamara') {
        monthLabel = `Consolidado Activo (Ene – Abr 2026 · ${activeMonths.length} meses)`;
      } else if (selectedSupervisor === 'Marco Silva') {
        monthLabel = `Consolidado Activo (May – Set 2026 · ${activeMonths.length} meses)`;
      }

      return {
        monthKey: 'ALL' as const,
        monthLabel,
        weeks: [],
        record: activeRecords[activeRecords.length - 1]?.rec || null,
        activeMonths,
        activeRecords,
        generalSupervisor,
        isAll: true,
      };
    }

    // Mes individual
    const targetMonth: MonthKey = selectedMonth;
    const mData = supervisorsData?.[targetMonth];
    const sRec = mData?.s?.find((s) => s.n === selectedSupervisor) || null;

    const generalSupervisor =
      sRec?.t ||
      (['Kevin Tamara', 'Marco Silva', 'Jaiter Girón'].includes(selectedSupervisor)
        ? 'Pedro Morante'
        : 'Aldo Bautista');

    return {
      monthKey: targetMonth,
      monthLabel: `${MONTH_LABELS[targetMonth] || targetMonth} 2026`,
      weeks: mData?.w || [],
      record: sRec,
      activeMonths: [targetMonth],
      activeRecords: sRec && mData ? [{ monthKey: targetMonth, monthLabel: MONTH_LABELS[targetMonth], data: mData, rec: sRec }] : [],
      generalSupervisor,
      isAll: false,
    };
  }, [selectedSupervisor, selectedMonth, supervisorsData]);

  // Cálculo de promedios de los 3 pilares para el periodo seleccionado
  const scoreBreakdown = useMemo(() => {
    if (currentMonthData.isAll) {
      const recItems = currentMonthData.activeRecords;
      if (!recItems || recItems.length === 0) {
        return {
          total: 0,
          op: 0,
          rh: 0,
          sg: 0,
          gapTotal: -98,
          gapOp: -60,
          gapRh: -20,
          gapSg: -20,
        };
      }

      const totalAvg = recItems.reduce((acc, item) => acc + item.rec.a, 0) / recItems.length;

      const allOps: number[] = [];
      const allRhs: number[] = [];
      const allSgs: number[] = [];

      recItems.forEach((item) => {
        (item.rec.op || []).forEach((v) => { if (v != null) allOps.push(v); });
        (item.rec.rh || []).forEach((v) => { if (v != null) allRhs.push(v); });
        (item.rec.sg || []).forEach((v) => { if (v != null) allSgs.push(v); });
      });

      const avgOp = allOps.length > 0 ? allOps.reduce((a, b) => a + b, 0) / allOps.length : 0;
      const avgRh = allRhs.length > 0 ? allRhs.reduce((a, b) => a + b, 0) / allRhs.length : 0;
      const avgSg = allSgs.length > 0 ? allSgs.reduce((a, b) => a + b, 0) / allSgs.length : 0;

      return {
        total: totalAvg,
        op: avgOp,
        rh: avgRh,
        sg: avgSg,
        gapTotal: (totalAvg - 0.98) * 100,
        gapOp: (avgOp - 0.60) * 100,
        gapRh: (avgRh - 0.20) * 100,
        gapSg: (avgSg - 0.20) * 100,
      };
    }

    const rec = currentMonthData.record;
    if (!rec) {
      return {
        total: 0,
        op: 0,
        rh: 0,
        sg: 0,
        gapTotal: -98,
        gapOp: -60,
        gapRh: -20,
        gapSg: -20,
      };
    }

    const opValid = (rec.op || []).filter((v): v is number => v != null);
    const rhValid = (rec.rh || []).filter((v): v is number => v != null);
    const sgValid = (rec.sg || []).filter((v): v is number => v != null);

    const avgOp = opValid.length > 0 ? opValid.reduce((a, b) => a + b, 0) / opValid.length : 0;
    const avgRh = rhValid.length > 0 ? rhValid.reduce((a, b) => a + b, 0) / rhValid.length : 0;
    const avgSg = sgValid.length > 0 ? sgValid.reduce((a, b) => a + b, 0) / sgValid.length : 0;

    return {
      total: rec.a,
      op: avgOp,
      rh: avgRh,
      sg: avgSg,
      gapTotal: (rec.a - 0.98) * 100,
      gapOp: (avgOp - 0.60) * 100,
      gapRh: (avgRh - 0.20) * 100,
      gapSg: (avgSg - 0.20) * 100,
    };
  }, [currentMonthData]);

  // =========================================================================
  // 4. FILTRADO SEGURO DE OBSERVACIONES
  // =========================================================================
  const filteredObservations = useMemo(() => {
    return (observations || []).filter((obs) => {
      if (!obs || !obs.supervisor) return false;

      // Filtrar por supervisor
      if (obs.supervisor.toLowerCase().trim() !== (selectedSupervisor || '').toLowerCase().trim()) {
        return false;
      }
      // Filtrar por mes si no es 'ALL'
      if (selectedMonth !== 'ALL' && obs.mes !== selectedMonth) {
        return false;
      }
      // Filtrar por componente
      if (filterComponente !== 'ALL' && obs.componente !== filterComponente) {
        return false;
      }
      // Filtrar por severidad
      if (filterSeveridad !== 'ALL' && obs.severidad !== filterSeveridad) {
        return false;
      }
      // Filtrar por búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${obs.criterio || ''} ${obs.observacion || ''} ${obs.accionRequerida || ''} ${obs.auditor || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [observations, selectedSupervisor, selectedMonth, filterComponente, filterSeveridad, searchQuery]);

  // Conteo de observaciones por severidad para el supervisor seleccionado
  const obsCounts = useMemo(() => {
    const supsObs = (observations || []).filter(
      (o) => o?.supervisor && o.supervisor.toLowerCase().trim() === (selectedSupervisor || '').toLowerCase().trim()
    );
    return {
      total: supsObs.length,
      alta: supsObs.filter((o) => o.severidad === 'alta').length,
      media: supsObs.filter((o) => o.severidad === 'media').length,
      baja: supsObs.filter((o) => o.severidad === 'baja').length,
    };
  }, [observations, selectedSupervisor]);

  // Descarga de plantilla modelo Excel oficial multi-hoja
  const handleDownloadTemplate = () => {
    const wb = generateSupervisorTemplateWorkbook();
    XLSX.writeFile(wb, 'PLANTILLA_CONSOLIDADO_OPERACIONES_RRHH_SIG_2026.xlsx');
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Barra Superior de Control y Selección de Supervisor */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-wide">
                Detalle de Evaluación y Justificación de Nota
              </h2>
              <span className="bg-blue-100 text-blue-900 text-xs font-black px-2.5 py-0.5 rounded-full border border-blue-300">
                Auditoría Operacional
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Consulta por qué cada supervisor obtuvo su calificación y las observaciones cargadas en el archivo Excel.
            </p>
          </div>

          {/* Botones de Descarga de Plantilla y Carga de Archivo Excel */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black transition-all border border-slate-300 cursor-pointer shadow-2xs"
              title="Descargar plantilla Excel modelo con las 3 hojas oficiales (Consolidado 60/20/20, RRHH y SIG)"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>Descargar Plantilla (.xlsx)</span>
            </button>

            <button
              onClick={onOpenUploadModal}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl text-xs font-black transition-all shadow-sm hover:shadow cursor-pointer"
            >
              <Upload className="w-4 h-4 text-amber-300" />
              <span>Cargar Excel (Un Solo Archivo)</span>
            </button>
          </div>
        </div>

        {/* Indicador de archivo activo si existe */}
        {activeFileName && (
          <div className="flex items-center justify-between gap-2 p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-950 flex-wrap">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Datos sincronizados con el Excel consolidado único: <strong>{activeFileName}</strong> ({observations.length} observaciones registradas)
              </span>
            </div>
            {isCustomDataActive && onResetDefaultData && (
              <button
                type="button"
                onClick={onResetDefaultData}
                className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 hover:border-rose-300 rounded-lg text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                title="Restablecer base de datos a los valores originales predeterminados de 2026"
              >
                <RotateCcw className="w-3 h-3 text-rose-600" />
                <span>Restablecer Datos por Defecto</span>
              </button>
            )}
          </div>
        )}

        {/* Botones de Selección de Supervisor Operativo */}
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" />
              Seleccionar Supervisor a Diagnosticar:
            </span>
            <span className="text-[11px] text-slate-500 font-bold">
              {operationalSupervisorsList.length} supervisores disponibles en este periodo
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {operationalSupervisorsList.map((supName) => {
              const isSelected = selectedSupervisor === supName;

              // Obtener nota representativa según el periodo seleccionado
              let score: number | undefined;
              if (selectedMonth === 'ALL') {
                const months = (Object.keys(supervisorsData || {}) as MonthKey[]).filter((m) => {
                  if (supName === 'Kevin Tamara' && ['MAY', 'JUN', 'JUL', 'AGO', 'SET'].includes(m)) return false;
                  if (supName === 'Marco Silva' && ['ENE', 'FEB', 'MAR', 'ABR'].includes(m)) return false;
                  return supervisorsData[m]?.s?.some((s) => s.n === supName);
                });
                const scores = months
                  .map((m) => supervisorsData[m]?.s?.find((s) => s.n === supName)?.a)
                  .filter((v): v is number => v != null);
                score = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined;
              } else {
                score = supervisorsData[selectedMonth]?.s?.find((s) => s.n === supName)?.a;
              }

              return (
                <button
                  key={supName}
                  type="button"
                  onClick={() => setSelectedSupervisor(supName)}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300 scale-102'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                      isSelected ? 'bg-white text-blue-900' : 'bg-slate-300 text-slate-700'
                    }`}
                  >
                    {supName.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <span>{supName}</span>

                  {selectedMonth === 'ALL' && supName === 'Kevin Tamara' && (
                    <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-amber-200 text-amber-950 font-black">
                      Hasta Abr
                    </span>
                  )}
                  {selectedMonth === 'ALL' && supName === 'Marco Silva' && (
                    <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-blue-200 text-blue-950 font-black">
                      Desde May
                    </span>
                  )}

                  {score != null && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                        isSelected
                          ? 'bg-blue-950 text-amber-300'
                          : score >= 0.85
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {formatPct(score)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filtro de Periodo a Evaluar */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-black uppercase text-slate-700">Periodo a Evaluar:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value as MonthKey | 'ALL')}
              className="bg-slate-50 text-slate-900 font-black text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="ALL">
                {selectedSupervisor === 'Kevin Tamara'
                  ? 'Consolidado Activo (Enero – Abril 2026)'
                  : selectedSupervisor === 'Marco Silva'
                  ? 'Consolidado Activo (Mayo – Setiembre 2026)'
                  : 'Todo el Año (Consolidado Enero – Setiembre)'}
              </option>
              {(Object.keys(supervisorsData || {}) as MonthKey[]).map((m) => {
                const isKevinDisabled =
                  selectedSupervisor === 'Kevin Tamara' &&
                  ['MAY', 'JUN', 'JUL', 'AGO', 'SET'].includes(m);
                const isMarcoDisabled =
                  selectedSupervisor === 'Marco Silva' &&
                  ['ENE', 'FEB', 'MAR', 'ABR'].includes(m);
                const isDisabled = isKevinDisabled || isMarcoDisabled;

                return (
                  <option key={m} value={m} disabled={isDisabled}>
                    {m} — {MONTH_LABELS[m] || m} 2026{' '}
                    {isKevinDisabled
                      ? '(No participó — Cese en Mayo)'
                      : isMarcoDisabled
                      ? '(No disponible — Ingresó en Mayo)'
                      : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <span>Supervisor General a Cargo (Jefe):</span>
            <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              {currentMonthData.generalSupervisor}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Tarjeta Diagnóstica Principal: "¿Por qué tiene esta nota?" */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-lg border-2 border-slate-700 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-lg shadow-md">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">
                  Ficha Diagnóstica Oficial
                </span>
                <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-700">
                  {currentMonthData.monthLabel}
                </span>

                {selectedSupervisor === 'Kevin Tamara' && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    Evaluado hasta Abril 2026 · Jefe: Pedro Morante
                  </span>
                )}
                {selectedSupervisor === 'Marco Silva' && (
                  <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    Ingresó en Mayo 2026 (Reemplazo Kevin Tamara) · Jefe: Pedro Morante
                  </span>
                )}
                {selectedSupervisor === 'Jaiter Girón' && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    Jefe: Pedro Morante
                  </span>
                )}
                {(selectedSupervisor === 'Pedro Oliva' || selectedSupervisor === 'Liz Minaya') && (
                  <span className="bg-slate-700 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    Jefe: Aldo Bautista
                  </span>
                )}
              </div>
              <h3 className="text-xl sm:text-2xl font-black uppercase text-white tracking-wide">
                {selectedSupervisor}
              </h3>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 font-semibold uppercase block">
              Calificación Obtenida ({currentMonthData.isAll ? 'Promedio Ponderado' : 'Nota del Mes'})
            </span>
            <div className="flex items-center gap-2 justify-end">
              <span className="text-3xl sm:text-4xl font-black text-amber-400 tabular-nums">
                {formatPct(scoreBreakdown.total)}
              </span>
            </div>
            <span
              className={`text-xs font-bold inline-block px-2 py-0.5 rounded-md mt-1 ${
                scoreBreakdown.gapTotal >= 0
                  ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                  : 'bg-rose-900/60 text-rose-300 border border-rose-700'
              }`}
            >
              Brecha vs Meta (98%): {scoreBreakdown.gapTotal >= 0 ? '+' : ''}
              {scoreBreakdown.gapTotal.toFixed(1)} pts
            </span>
          </div>
        </div>

        {/* Desglose de los 3 Pilares con Explicación de Puntos Perdidos */}
        <div className="space-y-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            ¿Cómo se compone esta nota y dónde se perdieron puntos?
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Pilar 1: Operaciones (60%) */}
            <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-blue-300">1. Operaciones (60%)</span>
                <span className="text-xs font-black text-white bg-blue-900/60 px-2 py-0.5 rounded border border-blue-700">
                  {formatPct(scoreBreakdown.op)} / 60%
                </span>
              </div>
              <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (scoreBreakdown.op / 0.6) * 100)}%` }}
                />
              </div>
              <div className="text-[11px] flex items-center justify-between text-slate-300 pt-1">
                <span>Puntos descontados:</span>
                <span className="font-black text-rose-400">
                  {scoreBreakdown.gapOp.toFixed(1)} pts
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 leading-tight pt-1 border-t border-slate-700">
                Pérdida por regularización tardía de pallets, estiba deficiente o demoras de despacho.
              </p>
            </div>

            {/* Pilar 2: RRHH (20%) */}
            <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-purple-300">2. RRHH (20%)</span>
                <span className="text-xs font-black text-white bg-purple-900/60 px-2 py-0.5 rounded border border-purple-700">
                  {formatPct(scoreBreakdown.rh)} / 20%
                </span>
              </div>
              <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (scoreBreakdown.rh / 0.2) * 100)}%` }}
                />
              </div>
              <div className="text-[11px] flex items-center justify-between text-slate-300 pt-1">
                <span>Puntos descontados:</span>
                <span className="font-black text-rose-400">
                  {scoreBreakdown.gapRh.toFixed(1)} pts
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 leading-tight pt-1 border-t border-slate-700">
                Descuentos por tardanzas del personal, ausencias no justificadas o exceso de HE.
              </p>
            </div>

            {/* Pilar 3: SIG / Seguridad (20%) */}
            <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-amber-300">3. SIG (20%)</span>
                <span className="text-xs font-black text-white bg-amber-900/60 px-2 py-0.5 rounded border border-amber-700">
                  {formatPct(scoreBreakdown.sg)} / 20%
                </span>
              </div>
              <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (scoreBreakdown.sg / 0.2) * 100)}%` }}
                />
              </div>
              <div className="text-[11px] flex items-center justify-between text-slate-300 pt-1">
                <span>Puntos descontados:</span>
                <span className="font-black text-rose-400">
                  {scoreBreakdown.gapSg.toFixed(1)} pts
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 leading-tight pt-1 border-t border-slate-700">
                Falta de charlas de 5 min, EPP incompleto o bloqueo de zonas de seguridad.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Matriz de Evolución: Mes a Mes si es 'ALL', o Semana a Semana si es mes específico */}
      {currentMonthData.isAll ? (
        <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
            <h4 className="text-xs sm:text-sm font-black uppercase text-slate-900 tracking-wide flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Evolución Mensual de {selectedSupervisor} — Periodo Activo 2026
            </h4>
            <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2.5 py-0.5 rounded-md">
              {currentMonthData.activeRecords.length} meses auditados
            </span>
          </div>

          {selectedSupervisor === 'Kevin Tamara' && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Aclaración de Periodo Laboral:</strong> Kevin Tamara fue considerado en la calificación operativa hasta el mes de <strong>Abril 2026 (Semana 18)</strong>. A partir de Mayo 2026 ya no continuó en el cargo de supervisor y en su reemplazo ingresó <strong>Marco Silva</strong>, teniendo a <strong>Pedro Morante</strong> como Jefe de Operaciones.
              </div>
            </div>
          )}

          {selectedSupervisor === 'Marco Silva' && (
            <div className="p-3 bg-blue-50 border border-blue-300 rounded-xl text-xs text-blue-950 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <strong>Aclaración de Periodo Laboral:</strong> Marco Silva asumió la supervisión operativa a partir del mes de <strong>Mayo 2026 (Semana 19)</strong> en reemplazo de Kevin Tamara, bajo la jefatura directa de <strong>Pedro Morante</strong>.
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white text-[11px] font-black uppercase tracking-wider">
                  <th className="py-2.5 px-3 border-r border-slate-700">Mes</th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-700 bg-slate-800 w-32">
                    Nota Mensual
                  </th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-700 w-32">Operaciones (60%)</th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-700 w-32">RRHH (20%)</th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-700 w-32">SIG (20%)</th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-700 w-32">Observaciones</th>
                  <th className="py-2.5 px-3 text-center w-28">Estado Meta (98%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                {currentMonthData.activeRecords.map((item) => {
                  const mOps = (item.rec.op || []).filter((v): v is number => v != null);
                  const mRhs = (item.rec.rh || []).filter((v): v is number => v != null);
                  const mSgs = (item.rec.sg || []).filter((v): v is number => v != null);

                  const avgOp = mOps.length > 0 ? mOps.reduce((a, b) => a + b, 0) / mOps.length : 0;
                  const avgRh = mRhs.length > 0 ? mRhs.reduce((a, b) => a + b, 0) / mRhs.length : 0;
                  const avgSg = mSgs.length > 0 ? mSgs.reduce((a, b) => a + b, 0) / mSgs.length : 0;

                  const mObs = (observations || []).filter(
                    (o) =>
                      o.supervisor &&
                      o.supervisor.toLowerCase().trim() === selectedSupervisor.toLowerCase().trim() &&
                      o.mes === item.monthKey
                  );

                  return (
                    <tr key={item.monthKey} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-2.5 px-3 font-black text-slate-900 border-r border-slate-200">
                        {item.monthKey} — {item.monthLabel}
                        {item.monthKey === 'ABR' && selectedSupervisor === 'Kevin Tamara' && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                            Último Mes Activo
                          </span>
                        )}
                        {item.monthKey === 'MAY' && selectedSupervisor === 'Marco Silva' && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300 font-bold">
                            Mes de Ingreso
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-slate-200 font-black bg-slate-50">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md ${
                            item.rec.a >= 0.88
                              ? 'bg-emerald-100 text-emerald-900'
                              : item.rec.a >= 0.82
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {formatPct(item.rec.a)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-slate-200 tabular-nums">
                        {formatPct(avgOp)}
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-slate-200 tabular-nums">
                        {formatPct(avgRh)}
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-slate-200 tabular-nums">
                        {formatPct(avgSg)}
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-slate-200">
                        {mObs.length > 0 ? (
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-bold text-[10.5px]">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            {mObs.length} {mObs.length === 1 ? 'observación' : 'observaciones'}
                          </span>
                        ) : (
                          <span className="text-emerald-600 text-[10.5px] font-bold">Sin hallazgos</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                            item.rec.a >= 0.98
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.rec.a >= 0.98 ? 'Cumple' : 'Bajo Meta'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        currentMonthData.record && (
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
              <h4 className="text-xs sm:text-sm font-black uppercase text-slate-900 tracking-wide flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Evolución Semanal de {selectedSupervisor} — {currentMonthData.monthLabel}
              </h4>
              <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2.5 py-0.5 rounded-md">
                {currentMonthData.weeks.length} semanas auditadas
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white text-[11px] font-black uppercase tracking-wider">
                    <th className="py-2.5 px-3 border-r border-slate-700">Semana</th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-700 bg-slate-800 w-32">
                      Nota Total
                    </th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-700 w-28">Operaciones (60%)</th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-700 w-28">RRHH (20%)</th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-700 w-28">SIG (20%)</th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-700 w-32">Observaciones</th>
                    <th className="py-2.5 px-3 text-center w-28">Estado Meta (98%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                  {currentMonthData.weeks.map((wNum, idx) => {
                    const s = currentMonthData.record!;
                    const op = s.op?.[idx];
                    const rh = s.rh?.[idx];
                    const sg = s.sg?.[idx];
                    const total = getSupervisorWeekTotal(s, idx);

                    // Observaciones asociadas a esta semana específica
                    const weekObs = (observations || []).filter(
                      (o) =>
                        o.supervisor &&
                        o.supervisor.toLowerCase().trim() === selectedSupervisor.toLowerCase().trim() &&
                        o.mes === currentMonthData.monthKey &&
                        o.semana === wNum
                    );

                    return (
                      <tr key={wNum} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-2.5 px-3 font-black text-slate-900 border-r border-slate-200">
                          Semana {wNum}
                        </td>
                        <td className="py-2.5 px-3 text-center border-r border-slate-200 font-black bg-slate-50">
                          {total != null ? (
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-md ${
                                total >= 0.88
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : total >= 0.82
                                  ? 'bg-blue-100 text-blue-900'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {formatPct(total)}
                            </span>
                          ) : (
                            '–'
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center border-r border-slate-200 tabular-nums">
                          {op != null ? formatPct(op) : '–'}
                        </td>
                        <td className="py-2.5 px-3 text-center border-r border-slate-200 tabular-nums">
                          {rh != null ? formatPct(rh) : '–'}
                        </td>
                        <td className="py-2.5 px-3 text-center border-r border-slate-200 tabular-nums">
                          {sg != null ? formatPct(sg) : '–'}
                        </td>
                        <td className="py-2.5 px-3 text-center border-r border-slate-200">
                          {weekObs.length > 0 ? (
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-bold text-[10.5px]">
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              {weekObs.length} {weekObs.length === 1 ? 'observación' : 'observaciones'}
                            </span>
                          ) : (
                            <span className="text-emerald-600 text-[10.5px] font-bold">Sin hallazgos</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {total != null && (
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                total >= 0.98
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {total >= 0.98 ? 'Cumple' : 'Bajo Meta'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* 4. Lista Detallada de Observaciones y Hallazgos Registrados */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h4 className="text-sm font-black uppercase text-slate-900 tracking-wide">
                Bitácora de Observaciones y Motivos de Descuento
              </h4>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Evidencia auditada registrada en el archivo Excel por Karla Bolívar y Makley Villanueva
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-slate-100 text-slate-700 font-black text-xs px-3 py-1 rounded-full border border-slate-200">
              {filteredObservations.length} de {obsCounts.total} observaciones
            </span>
          </div>
        </div>

        {/* Filtros de la Bitácora de Observaciones */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Buscador */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por criterio, hallazgo, acción o auditor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 text-slate-900 pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-semibold"
            />
          </div>

          {/* Filtro por Componente */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setFilterComponente('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                filterComponente === 'ALL' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterComponente('Operaciones')}
              className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                filterComponente === 'Operaciones' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Operaciones
            </button>
            <button
              onClick={() => setFilterComponente('RRHH')}
              className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                filterComponente === 'RRHH' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              RRHH
            </button>
            <button
              onClick={() => setFilterComponente('SIG')}
              className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                filterComponente === 'SIG' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              SIG
            </button>
          </div>

          {/* Filtro por Severidad */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setFilterSeveridad('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                filterSeveridad === 'ALL' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterSeveridad('alta')}
              className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                filterSeveridad === 'alta' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              Críticas ({obsCounts.alta})
            </button>
            <button
              onClick={() => setFilterSeveridad('media')}
              className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                filterSeveridad === 'media' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              Medias ({obsCounts.media})
            </button>
          </div>
        </div>

        {/* Tarjetas de Observaciones */}
        {filteredObservations.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-sm font-black text-slate-800 uppercase">
              No se encontraron observaciones con los filtros seleccionados
            </p>
            <p className="text-xs text-slate-500">
              Prueba cambiando el componente, la severidad o limpiando el texto de búsqueda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredObservations.map((obs) => {
              const isCritica = obs.severidad === 'alta';
              const descVal = typeof obs.descuentoPct === 'number' ? obs.descuentoPct : Number(obs.descuentoPct || 0);

              return (
                <div
                  key={obs.id || Math.random().toString()}
                  className={`p-4 rounded-2xl border-2 transition-all shadow-2xs space-y-2.5 flex flex-col justify-between ${
                    isCritica
                      ? 'bg-rose-50/40 border-rose-300 hover:border-rose-400'
                      : 'bg-white border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Header de la Observación */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                            obs.componente === 'Operaciones'
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : obs.componente === 'RRHH'
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : 'bg-amber-100 text-amber-900 border border-amber-200'
                          }`}
                        >
                          {obs.componente}
                        </span>

                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                            obs.severidad === 'alta'
                              ? 'bg-rose-100 text-rose-900 border border-rose-300'
                              : obs.severidad === 'media'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          Severidad {obs.severidad || 'media'}
                        </span>
                      </div>

                      <span className="text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200">
                        -{descVal.toFixed(1)} pts
                      </span>
                    </div>

                    {/* Criterio Auditado */}
                    <h5 className="text-xs font-black text-slate-900 leading-snug">
                      {obs.criterio}
                    </h5>

                    {/* Texto de la Observación */}
                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80 italic">
                      "{obs.observacion}"
                    </p>

                    {/* Acción Requerida si existe */}
                    {obs.accionRequerida && (
                      <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-2 text-[11px] text-emerald-950 font-medium">
                        <strong className="text-emerald-800 font-bold block mb-0.5">
                          Acción de Mejora Recomendada:
                        </strong>
                        {obs.accionRequerida}
                      </div>
                    )}
                  </div>

                  {/* Metadata de pie de tarjeta */}
                  <div className="flex items-center justify-between text-[10.5px] text-slate-500 pt-2 border-t border-slate-200/80 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700">Auditor: {obs.auditor || 'Auditoría Interna'}</span>
                      {obs.semana && <span>· Sem {obs.semana}</span>}
                      {obs.fecha && <span>· {obs.fecha}</span>}
                    </div>

                    <span
                      className={`font-black text-[10px] px-2 py-0.5 rounded-full ${
                        obs.estado === 'Levantada'
                          ? 'bg-emerald-100 text-emerald-900'
                          : obs.estado === 'En Proceso'
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-rose-100 text-rose-900'
                      }`}
                    >
                      {obs.estado || 'Pendiente'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
