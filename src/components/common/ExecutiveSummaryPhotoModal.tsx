import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Camera,
  Download,
  ClipboardCheck,
  Package,
  Truck,
  AlertTriangle,
  GraduationCap,
  Users,
  CheckCircle2,
  Award,
} from 'lucide-react';

import type {
  AppUser,
  PocketAuditRecord,
  PocketInventoryItem,
  MemoRecord,
  InductionRecord,
} from '../../types';

import type { PalletObservation } from '../../types/pallets';
import type { FleetDashboardData } from '../../types/fleet';
import {
  AUDITOR_NAMES,
  MONTH_LABELS,
  SUPERVISORS_DATA,
  type MonthKey,
} from '../../data/supervisorsData';

export type SummaryScopeType =
  | 'todas'
  | 'pockets'
  | 'pallets'
  | 'supervisores'
  | 'montacargas'
  | 'memos'
  | 'induccion';

type SummaryPeriod = 'diario' | 'semanal' | 'mensual' | 'trimestral';

const toLocalDate = (value: string): Date | null => {
  const trimmed = String(value || '').trim();
  const dmyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const date = dmyMatch
    ? new Date(Number(dmyMatch[3]), Number(dmyMatch[2]) - 1, Number(dmyMatch[1]))
    : /^\d{4}-\d{2}-\d{2}/.test(trimmed)
      ? new Date(`${trimmed.slice(0, 10)}T00:00:00`)
      : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const getIsoWeek = (date: Date) => {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - (utcDate.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

const MONTH_KEYS: MonthKey[] = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SET'];

interface ExecutiveSummaryPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialScope: SummaryScopeType;
  pocketRecords: PocketAuditRecord[];
  pocketInventory: PocketInventoryItem[];
  palletRecords: PalletObservation[];
  fleetData: FleetDashboardData;
  memos: MemoRecord[];
  inductions: InductionRecord[];
  currentUser: AppUser;
}

const scopeLabels: Record<SummaryScopeType, string> = {
  todas: 'Resumen Ejecutivo',
  pockets: 'Pockets',
  pallets: 'Pallets',
  supervisores: 'Supervisores',
  montacargas: 'Montacargas',
  memos: 'Memos',
  induccion: 'Inducciones',
};

export const ExecutiveSummaryPhotoModal: React.FC<
  ExecutiveSummaryPhotoModalProps
> = ({
  isOpen,
  onClose,
  initialScope,
  pocketRecords,
  pocketInventory,
  palletRecords,
  fleetData,
  memos,
  inductions,
  currentUser,
}) => {
  const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>('mensual');
  const [referenceDate, setReferenceDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

  useEffect(() => {
    if (!isOpen) return;

    const scopedRecords = initialScope === 'pockets'
      ? pocketRecords
      : initialScope === 'pallets'
        ? palletRecords
        : initialScope === 'montacargas'
          ? fleetData.incidencias || []
          : initialScope === 'memos'
            ? memos
            : initialScope === 'induccion'
              ? inductions
              : initialScope === 'todas'
                ? [...pocketRecords, ...palletRecords, ...memos, ...inductions, ...(fleetData.incidencias || [])]
                : [];
    const latestDate = scopedRecords
      .map((record) => toLocalDate(record.fecha))
      .filter((date): date is Date => date != null)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    if (latestDate) {
      setReferenceDate(`${latestDate.getFullYear()}-${String(latestDate.getMonth() + 1).padStart(2, '0')}-${String(latestDate.getDate()).padStart(2, '0')}`);
    }
  }, [isOpen, initialScope]);

  const periodRange = useMemo(() => {
    const reference = toLocalDate(referenceDate) || new Date();
    const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
    const end = new Date(start);

    if (summaryPeriod === 'semanal') {
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      end.setDate(start.getDate() + 7);
    } else if (summaryPeriod === 'mensual') {
      start.setDate(1);
      end.setFullYear(start.getFullYear(), start.getMonth() + 1, 1);
    } else if (summaryPeriod === 'trimestral') {
      start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
      end.setFullYear(start.getFullYear(), start.getMonth() + 3, 1);
    } else {
      end.setDate(end.getDate() + 1);
    }

    const label = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' });
    const rangeLabel = summaryPeriod === 'diario'
      ? label.format(start)
      : `${label.format(start)} - ${label.format(new Date(end.getTime() - 1))}`;
    return { start, end, label: rangeLabel, reference };
  }, [referenceDate, summaryPeriod]);

  const filterByPeriod = <T extends { fecha: string }>(records: T[]) => records.filter((record) => {
    const date = toLocalDate(record.fecha);
    return date != null && date >= periodRange.start && date < periodRange.end;
  });

  const periodPocketRecords = useMemo(() => filterByPeriod(pocketRecords), [pocketRecords, periodRange]);
  const periodPalletRecords = useMemo(() => filterByPeriod(palletRecords), [palletRecords, periodRange]);
  const periodMemos = useMemo(() => filterByPeriod(memos), [memos, periodRange]);
  const periodInductions = useMemo(() => filterByPeriod(inductions), [inductions, periodRange]);
  const periodFleetIncidents = useMemo(() => filterByPeriod(fleetData.incidencias || []), [fleetData.incidencias, periodRange]);
  const periodFleetMonthNames = useMemo(() => {
    const monthNames = [
      ['enero'], ['febrero'], ['marzo'], ['abril'], ['mayo'], ['junio'],
      ['julio'], ['agosto'], ['setiembre', 'septiembre'], ['octubre'], ['noviembre'], ['diciembre'],
    ];
    const referenceMonth = periodRange.reference.getMonth();
    const monthIndexes = summaryPeriod === 'trimestral'
      ? [Math.floor(referenceMonth / 3) * 3, Math.floor(referenceMonth / 3) * 3 + 1, Math.floor(referenceMonth / 3) * 3 + 2]
      : [referenceMonth];
    return monthIndexes.flatMap((index) => monthNames[index] || []);
  }, [periodRange, summaryPeriod]);

  const metrics = useMemo(() => {
    const pocketsAsignados = periodPocketRecords.reduce(
      (sum, r) => sum + Number(r.totalAsignados || 0),
      0
    );

    const pocketsRegistrados = periodPocketRecords.reduce(
      (sum, r) => sum + Number(r.pocketsRegistrados || 0),
      0
    );

    const pocketsEnUso = periodPocketRecords.reduce(
      (sum, r) => sum + Number(r.pocketsEnUso || 0),
      0
    );

    const palletsTotal = periodPalletRecords.length;
    const palletsPendientes = periodPalletRecords.filter(
      (r) => r.estado === 'PENDIENTE'
    ).length;
    const palletsRegularizados = periodPalletRecords.filter(
      (r) =>
        r.estado === 'REGULARIZADA' ||
        r.estado === 'REGULARIZADO'
    ).length;

    const equipos = fleetData.equipos || [];
    const incidencias = periodFleetIncidents;

    const equiposEvaluados = equipos.flatMap((equipo) => {
      const mesesSeleccionados = Object.entries(equipo.meses || {})
        .filter(([month]) => periodFleetMonthNames.includes(month.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')))
        .map(([, monthData]) => monthData);
      if (mesesSeleccionados.length === 0) return [];
      return [{
        operativo: mesesSeleccionados.reduce((sum, month) => sum + Number(month.horas_inoperativas || 0), 0) === 0,
      }];
    });
    const equiposOperativos = equiposEvaluados.filter((equipo) => equipo.operativo).length;

    const memosAbiertos = periodMemos.filter(
      (m) => m.estado === 'Abierto' || m.estado === 'En Proceso'
    ).length;

    const induccionesAprobadas = periodInductions.filter(
      (i) => i.estado === 'Aprobado'
    ).length;

    const cumplimientoPockets =
      pocketsAsignados > 0
        ? Math.round((pocketsRegistrados / pocketsAsignados) * 100)
        : 0;

    const regularizacionPallets =
      palletsTotal > 0
        ? Math.round((palletsRegularizados / palletsTotal) * 100)
        : 0;

    return {
      pocketsAsignados,
      pocketsRegistrados,
      pocketsEnUso,
      cumplimientoPockets,
      palletsTotal,
      palletsPendientes,
      palletsRegularizados,
      regularizacionPallets,
      equiposTotal: equiposEvaluados.length,
      equiposOperativos,
      incidencias: incidencias.length,
      memosTotal: periodMemos.length,
      memosAbiertos,
      induccionesTotal: periodInductions.length,
      induccionesAprobadas,
      inventarioPockets: pocketInventory.length,
    };
  }, [
    periodPocketRecords,
    pocketInventory,
    periodPalletRecords,
    fleetData,
    periodMemos,
    periodInductions,
    periodFleetIncidents,
    periodFleetMonthNames,
  ]);

  const supervisorSummary = useMemo(() => {
    if (initialScope !== 'supervisores') return null;

    if (typeof window === 'undefined') return null;

    try {
      const raw = window.localStorage.getItem('stol_supervisors_data_v2');
      const parsed = raw ? (JSON.parse(raw) as Record<string, any>) : SUPERVISORS_DATA;
      const monthIndex = periodRange.reference.getMonth();
      const quarterStart = Math.floor(monthIndex / 3) * 3;
      const monthIndexes = summaryPeriod === 'trimestral'
        ? [quarterStart, quarterStart + 1, quarterStart + 2]
        : [monthIndex];
      const selectedMonthKeys = monthIndexes
        .map((index) => MONTH_KEYS[index])
        .filter(Boolean);
      const selectedWeek = getIsoWeek(periodRange.reference);
      const months = Object.entries(parsed || {})
        .filter(([monthKey]) => selectedMonthKeys.includes(monthKey as MonthKey))
        .filter(([, monthData]) => monthData && Array.isArray(monthData.s))
        .map(([monthKey, monthData]) => {
          const operational = (monthData.s || []).filter(
            (s: any) => !AUDITOR_NAMES.includes(s?.n)
          );
          const monthlyBest = [...operational].sort((a, b) => Number(b.a) - Number(a.a))[0] ?? null;
          const monthlyAvg = operational.length > 0
            ? operational.reduce((sum: number, s: any) => sum + Number(s.a || 0), 0) / operational.length
            : Number(monthData.g || 0);

          const weekly = (monthData.w || []).map((week: number, idx: number) => {
            const totals = operational
              .map((s: any) => {
                const op = s.op?.[idx];
                if (op == null) return null;
                return Number(op) + Number(s.rh?.[idx] ?? 0) + Number(s.sg?.[idx] ?? 0);
              })
              .filter((value: number | null) => value != null) as number[];

            const total = totals.length > 0 ? totals.reduce((sum, value) => sum + value, 0) / totals.length : 0;
            return { week, total };
          });
            const periodWeekly = summaryPeriod === 'semanal'
              ? weekly.filter((item: { week: number }) => item.week === selectedWeek)
              : weekly;
            const selectedWeekScores = summaryPeriod === 'semanal'
              ? operational
                .map((supervisor: any) => {
                  const weekIndex = (monthData.w || []).indexOf(selectedWeek);
                  const operations = supervisor.op?.[weekIndex];
                  if (weekIndex < 0 || operations == null) return null;
                  return {
                    ...supervisor,
                    a: Number(operations) + Number(supervisor.rh?.[weekIndex] ?? 0) + Number(supervisor.sg?.[weekIndex] ?? 0),
                  };
                })
                .filter(Boolean)
              : [];
            const best = summaryPeriod === 'semanal'
              ? [...selectedWeekScores].sort((a: any, b: any) => b.a - a.a)[0] ?? null
              : monthlyBest;
            const avg = summaryPeriod === 'semanal'
              ? periodWeekly[0]?.total ?? null
              : monthlyAvg;

          return {
            key: monthKey as MonthKey,
            label: MONTH_LABELS[monthKey as MonthKey] || monthKey,
            avg,
            best,
            weekly: periodWeekly,
            supervisors: summaryPeriod === 'semanal' ? selectedWeekScores.length : operational.length,
          };
        })
        .sort((a, b) => {
          const keyOrder = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SET'];
          return keyOrder.indexOf(a.key) - keyOrder.indexOf(b.key);
        });

      const latest = months.at(-1) ?? null;
      const bestOverall = months
        .flatMap((month: any) => month.best ? [{ name: month.best.n, score: Number(month.best.a), month: month.label }] : [])
        .sort((a: any, b: any) => b.score - a.score)[0] ?? null;

      return { months, latest, bestOverall, dailyGranularityAvailable: false };
    } catch (error) {
      console.error('Error leyendo resumen de supervisores', error);
      return null;
    }
  }, [initialScope, isOpen, periodRange, summaryPeriod]);

  const cards = (() => {
    if (initialScope === 'supervisores') {
      if (supervisorSummary && summaryPeriod !== 'diario') {
        const periodAverage = supervisorSummary.months.length > 0
          ? supervisorSummary.months.reduce((sum: number, month: { avg: number | null }) => sum + (month.avg || 0), 0) / supervisorSummary.months.length
          : null;
        return [
          {
            title: 'Periodo evaluado',
            value: supervisorSummary.latest?.avg != null ? periodRange.label : 'Sin datos',
            detail: periodAverage != null && supervisorSummary.latest?.avg != null ? `${(periodAverage * 100).toFixed(1)}% promedio` : 'Sin resultados para este periodo',
            icon: Users,
          },
          {
            title: 'Mejor supervisor',
            value: supervisorSummary.latest?.best?.n || 'Sin datos',
            detail: supervisorSummary.latest?.best ? `${(Number(supervisorSummary.latest.best.a) * 100).toFixed(1)}%` : 'Sin desempeño',
            icon: CheckCircle2,
          },
          {
            title: 'Top general',
            value: supervisorSummary.bestOverall?.name || 'Sin datos',
            detail: supervisorSummary.bestOverall ? `${(supervisorSummary.bestOverall.score * 100).toFixed(1)}%` : 'Sin datos',
            icon: Award,
          },
          {
            title: 'Meta ERU',
            value: '98%',
            detail: 'Objetivo de cumplimiento',
            icon: AlertTriangle,
          },
          {
            title: 'Supervisores',
            value: String(supervisorSummary.latest?.supervisors ?? 0),
            detail: 'Operativos habilitados',
            icon: Users,
          },
          {
            title: 'Semanas',
            value: String(supervisorSummary.latest?.weekly.length ?? 0),
            detail: 'Seguimiento por semana',
            icon: ClipboardCheck,
          },
        ];
      }

      return [
        { title: 'Mes actual', value: 'Sin datos', detail: 'No hay información de supervisores', icon: Users },
        { title: 'Mejor supervisor', value: 'N/D', detail: 'Sin desempeño disponible', icon: CheckCircle2 },
        { title: 'Top general', value: 'N/D', detail: 'Sin ranking disponible', icon: Award },
        { title: 'Meta ERU', value: '98%', detail: 'Objetivo de cumplimiento', icon: AlertTriangle },
        { title: 'Supervisores', value: '0', detail: 'Sin registros activos', icon: Users },
        { title: 'Semanas', value: '0', detail: 'Sin seguimiento disponible', icon: ClipboardCheck },
      ];
    }

    if (initialScope === 'pallets') {
      return [
        { title: 'Total', value: metrics.palletsTotal, detail: 'Pallets registrados', icon: ClipboardCheck },
        { title: 'Pendientes', value: metrics.palletsPendientes, detail: 'Requieren atención', icon: AlertTriangle },
        { title: 'Regularizados', value: metrics.palletsRegularizados, detail: `${metrics.regularizacionPallets}% del total`, icon: CheckCircle2 },
        { title: 'Meta', value: '100%', detail: 'Regularización objetivo', icon: Award },
      ];
    }

    if (initialScope === 'montacargas') {
      const disponibilidad = Math.max(
        0,
        Math.min(
          100,
          Math.round((metrics.equiposOperativos / Math.max(metrics.equiposTotal, 1)) * 100)
        )
      );

      return [
        { title: 'Equipos con datos', value: metrics.equiposTotal, detail: 'Medidos en el periodo', icon: Truck },
        { title: 'Operativos', value: metrics.equiposOperativos, detail: 'Sin horas inoperativas', icon: CheckCircle2 },
        { title: 'Incidencias', value: metrics.incidencias, detail: 'Eventos reportados', icon: AlertTriangle },
        { title: 'Disponibilidad', value: `${disponibilidad}%`, detail: 'Cobertura estimada', icon: Award },
      ];
    }

    if (initialScope === 'memos') {
      return [
        { title: 'Total', value: metrics.memosTotal, detail: 'Memos registrados', icon: ClipboardCheck },
        { title: 'Abiertos', value: metrics.memosAbiertos, detail: 'Requieren seguimiento', icon: AlertTriangle },
        { title: 'Cierre', value: `${metrics.memosTotal > 0 ? Math.max(0, Math.round(((metrics.memosTotal - metrics.memosAbiertos) / metrics.memosTotal) * 100)) : 0}%`, detail: 'Tasa de cierre', icon: CheckCircle2 },
      ];
    }

    if (initialScope === 'induccion') {
      return [
        { title: 'Total', value: metrics.induccionesTotal, detail: 'Inducciones registradas', icon: GraduationCap },
        { title: 'Aprobadas', value: metrics.induccionesAprobadas, detail: 'En proceso completado', icon: CheckCircle2 },
        { title: 'Estado', value: `${metrics.induccionesTotal > 0 ? Math.max(0, Math.round((metrics.induccionesAprobadas / metrics.induccionesTotal) * 100)) : 0}%`, detail: 'Aprobación efectiva', icon: Award },
      ];
    }

    if (initialScope === 'pockets') {
      return [
        { title: 'Pockets', value: metrics.pocketsRegistrados, detail: `${metrics.cumplimientoPockets}% registro`, icon: Package },
        { title: 'Asignados', value: metrics.pocketsAsignados, detail: 'Total de registros', icon: ClipboardCheck },
        { title: 'En uso', value: metrics.pocketsEnUso, detail: 'Pockets activos', icon: Truck },
        { title: 'Inventario', value: metrics.inventarioPockets, detail: 'Items de pocket', icon: Users },
      ];
    }

    return [
      { title: 'Resumen general', value: 'STOL', detail: 'Indicadores operativos', icon: CheckCircle2 },
      { title: 'Pockets', value: metrics.pocketsRegistrados, detail: `${metrics.cumplimientoPockets}% registro`, icon: Package },
      { title: 'Pallets', value: metrics.palletsTotal, detail: `${metrics.palletsPendientes} pendientes`, icon: ClipboardCheck },
      { title: 'Flota', value: metrics.equiposTotal, detail: `${metrics.equiposOperativos} operativos`, icon: Truck },
      { title: 'Memos', value: metrics.memosTotal, detail: `${metrics.memosAbiertos} abiertos`, icon: AlertTriangle },
      { title: 'Inducciones', value: metrics.induccionesTotal, detail: `${metrics.induccionesAprobadas} aprobadas`, icon: GraduationCap },
    ];
  })();

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div
        id="executive-summary-photo"
        className="relative flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#f1f5f9_30%,_#e2e8f0_100%)] shadow-[0_30px_80px_rgba(15,23,42,0.35)] border border-slate-200"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5 text-white">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-3 text-slate-950 shadow-lg shadow-amber-500/25">
              <Camera size={26} />
            </div>

            <div>
              <h2 className="text-xl font-black tracking-wide">
                {scopeLabels[initialScope]}
              </h2>
              <p className="text-sm text-slate-300">
                Gestión Operacional STOL · Resumen Ejecutivo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
            >
              <Download size={17} />
              Imprimir / PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-white/10"
              aria-label="Cerrar"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="overflow-y-auto p-6">
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Indicadores principales
              </p>

              <h3 className="mt-1 text-2xl font-black text-slate-800">
                {initialScope === 'supervisores' ? 'Desempeño de Supervisores' : 'Situación Operacional'}
              </h3>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Responsable</p>
              <p className="font-black text-slate-800">
                {currentUser?.name || 'Usuario'}
              </p>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Periodo del resumen</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{periodRange.label}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-lg border border-slate-300 bg-slate-50 p-1" role="group" aria-label="Granularidad del resumen">
                {(['diario', 'semanal', 'mensual', 'trimestral'] as SummaryPeriod[]).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setSummaryPeriod(period)}
                    aria-pressed={summaryPeriod === period}
                    className={`rounded-md px-3 py-1.5 text-xs font-bold capitalize transition-colors ${summaryPeriod === period ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'}`}
                  >
                    {period}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                Fecha de referencia
                <input
                  type="date"
                  value={referenceDate}
                  onChange={(event) => setReferenceDate(event.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800"
                />
              </label>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.title}
                  className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-[0_10px_25px_rgba(15,23,42,0.08)] transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        {card.title}
                      </p>

                      <p className="mt-3 text-2xl font-black text-slate-900">
                        {card.value}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {card.detail}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 p-3 text-slate-700 shadow-inner">
                      <Icon size={20} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {initialScope === 'montacargas' && (summaryPeriod === 'diario' || summaryPeriod === 'semanal') && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
              Las incidencias se filtran por fecha exacta. La disponibilidad de equipos se informa con el corte mensual disponible, porque la flota no registra disponibilidad diaria ni semanal.
            </p>
          )}

          {/* RESUMEN */}
          {initialScope === 'supervisores' ? summaryPeriod === 'diario' ? (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
              La evaluación de supervisores está registrada por semana y por mes, no por día. Elige semanal, mensual o trimestral para mostrar resultados disponibles.
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {supervisorSummary ? (
                <>
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <CheckCircle2 size={20} className="text-emerald-600" />
                      <h4 className="font-bold text-slate-800">
                        Rendimiento mensual y semanal
                      </h4>
                    </div>

                    <div className="space-y-4">
                      {supervisorSummary.months.slice(-3).map((month) => (
                        <div key={month.key}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-semibold text-slate-700">{month.label}</span>
                            <strong>{(month.avg * 100).toFixed(1)}%</strong>
                          </div>

                          <div className="mb-1 flex justify-between text-xs text-slate-500">
                            <span>Mejor: {month.best?.n || 'Sin datos'}</span>
                            <span>{month.best ? `${(Number(month.best.a) * 100).toFixed(1)}%` : '—'}</span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-indigo-600"
                              style={{ width: `${Math.min(month.avg * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <h4 className="mb-4 font-bold text-slate-800">
                      Evolución por semanas
                    </h4>

                    <div className="space-y-3 text-sm">
                      {(supervisorSummary.latest?.weekly || []).map((item: { week: number; total: number }) => (
                        <div key={`${supervisorSummary.latest?.label}-${item.week}`}>
                          <div className="mb-1 flex justify-between text-xs text-slate-600">
                            <span>Semana {item.week}</span>
                            <strong>{(item.total * 100).toFixed(1)}%</strong>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-amber-500"
                              style={{ width: `${Math.min(item.total * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-slate-600 lg:col-span-2">
                  <p className="text-lg font-bold text-slate-700">Sin datos de supervisores disponibles</p>
                  <p className="mt-2 text-sm">No hay información cargada para construir el resumen del desempeño por mes o semana.</p>
                </div>
              )}
            </div>
          ) : initialScope === 'pockets' ? (
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Package size={20} className="text-emerald-600" />
                  <h4 className="font-bold text-slate-800">Cumplimiento de Pockets</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>Registro de Pockets</span>
                      <strong>{metrics.cumplimientoPockets}%</strong>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(metrics.cumplimientoPockets, 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>Pockets activos</span>
                      <strong>{metrics.pocketsEnUso}</strong>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min((metrics.pocketsEnUso / Math.max(metrics.pocketsAsignados, 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h4 className="mb-4 font-bold text-slate-800">Resumen operativo</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Asignados</p><p className="mt-1 text-xl font-bold">{metrics.pocketsAsignados}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Registrados</p><p className="mt-1 text-xl font-bold">{metrics.pocketsRegistrados}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">En uso</p><p className="mt-1 text-xl font-bold">{metrics.pocketsEnUso}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Inventario</p><p className="mt-1 text-xl font-bold">{metrics.inventarioPockets}</p></div>
                </div>
              </div>
            </div>
          ) : initialScope === 'pallets' ? (
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex items-center gap-2"><ClipboardCheck size={20} className="text-blue-600" /><h4 className="font-bold text-slate-800">Regularización de Pallets</h4></div>
                <div className="space-y-4">
                  <div>
                    <div className="mb-1 flex justify-between text-sm"><span>Regularización</span><strong>{metrics.regularizacionPallets}%</strong></div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(metrics.regularizacionPallets, 100)}%` }} /></div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-sm"><span>Pallets pendientes</span><strong>{metrics.palletsPendientes}</strong></div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min((metrics.palletsPendientes / Math.max(metrics.palletsTotal, 1)) * 100, 100)}%` }} /></div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h4 className="mb-4 font-bold text-slate-800">Resumen de gestión</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Total</p><p className="mt-1 text-xl font-bold">{metrics.palletsTotal}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Regularizados</p><p className="mt-1 text-xl font-bold">{metrics.palletsRegularizados}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Pendientes</p><p className="mt-1 text-xl font-bold">{metrics.palletsPendientes}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Meta</p><p className="mt-1 text-xl font-bold">100%</p></div>
                </div>
              </div>
            </div>
          ) : initialScope === 'montacargas' ? (
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex items-center gap-2"><Truck size={20} className="text-slate-700" /><h4 className="font-bold text-slate-800">Disponibilidad de flota</h4></div>
                <div className="space-y-4">
                  <div>
                    <div className="mb-1 flex justify-between text-sm"><span>Operativos</span><strong>{Math.round((metrics.equiposOperativos / Math.max(metrics.equiposTotal, 1)) * 100)}%</strong></div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-slate-800" style={{ width: `${Math.min((metrics.equiposOperativos / Math.max(metrics.equiposTotal, 1)) * 100, 100)}%` }} /></div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-sm"><span>Incidencias</span><strong>{metrics.incidencias}</strong></div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.min((metrics.incidencias / Math.max(metrics.equiposTotal, 1)) * 100, 100)}%` }} /></div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h4 className="mb-4 font-bold text-slate-800">Resumen de flota</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Total</p><p className="mt-1 text-xl font-bold">{metrics.equiposTotal}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Operativos</p><p className="mt-1 text-xl font-bold">{metrics.equiposOperativos}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Incidencias</p><p className="mt-1 text-xl font-bold">{metrics.incidencias}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Disponibilidad</p><p className="mt-1 text-xl font-bold">{Math.max(0, Math.min(100, Math.round((metrics.equiposOperativos / Math.max(metrics.equiposTotal, 1)) * 100)))}%</p></div>
                </div>
              </div>
            </div>
          ) : initialScope === 'memos' ? (
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex items-center gap-2"><AlertTriangle size={20} className="text-amber-600" /><h4 className="font-bold text-slate-800">Estado de Memos</h4></div>
                <div className="space-y-4">
                  <div>
                    <div className="mb-1 flex justify-between text-sm"><span>Memos abiertos</span><strong>{metrics.memosAbiertos}</strong></div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min((metrics.memosAbiertos / Math.max(metrics.memosTotal, 1)) * 100, 100)}%` }} /></div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h4 className="mb-4 font-bold text-slate-800">Resumen</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Total</p><p className="mt-1 text-xl font-bold">{metrics.memosTotal}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Abiertos</p><p className="mt-1 text-xl font-bold">{metrics.memosAbiertos}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Cierre</p><p className="mt-1 text-xl font-bold">{metrics.memosTotal > 0 ? Math.max(0, Math.round(((metrics.memosTotal - metrics.memosAbiertos) / metrics.memosTotal) * 100)) : 0}%</p></div>
                </div>
              </div>
            </div>
          ) : initialScope === 'induccion' ? (
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex items-center gap-2"><GraduationCap size={20} className="text-violet-600" /><h4 className="font-bold text-slate-800">Inducciones</h4></div>
                <div className="space-y-4">
                  <div>
                    <div className="mb-1 flex justify-between text-sm"><span>Aprobación</span><strong>{metrics.induccionesTotal > 0 ? Math.round((metrics.induccionesAprobadas / metrics.induccionesTotal) * 100) : 0}%</strong></div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(metrics.induccionesTotal > 0 ? (metrics.induccionesAprobadas / metrics.induccionesTotal) * 100 : 0, 100)}%` }} /></div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h4 className="mb-4 font-bold text-slate-800">Resumen</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Total</p><p className="mt-1 text-xl font-bold">{metrics.induccionesTotal}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Aprobadas</p><p className="mt-1 text-xl font-bold">{metrics.induccionesAprobadas}</p></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex items-center gap-2"><CheckCircle2 size={20} /><h4 className="font-bold text-slate-800">Resumen General</h4></div>
                <div className="space-y-4">
                  <div>
                    <div className="mb-1 flex justify-between text-sm"><span>Registro de Pockets</span><strong>{metrics.cumplimientoPockets}%</strong></div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(metrics.cumplimientoPockets, 100)}%` }} /></div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-sm"><span>Regularización de Pallets</span><strong>{metrics.regularizacionPallets}%</strong></div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(metrics.regularizacionPallets, 100)}%` }} /></div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h4 className="mb-4 font-bold text-slate-800">KPI operativos</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Pockets</p><p className="mt-1 text-xl font-bold">{metrics.pocketsEnUso}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Pallets pendientes</p><p className="mt-1 text-xl font-bold">{metrics.palletsPendientes}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Flota operativa</p><p className="mt-1 text-xl font-bold">{metrics.equiposOperativos}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Memos abiertos</p><p className="mt-1 text-xl font-bold">{metrics.memosAbiertos}</p></div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
            <p>
              {initialScope === 'supervisores'
                ? 'Resumen generado a partir del desempeño anual de supervisores, con análisis de los resultados por mes y por semana según la información visible en la pantalla.'
                : `Resumen generado para el periodo ${periodRange.label}, usando únicamente la información de ${scopeLabels[initialScope]}.`}
            </p>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white/90 px-6 py-3 text-xs text-slate-500">
          <span className="font-semibold tracking-[0.14em] text-slate-600 uppercase">STOL · Operaciones</span>
          <span>Resumen Ejecutivo · {new Date().toLocaleDateString('es-PE')}</span>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveSummaryPhotoModal;
