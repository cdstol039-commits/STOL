import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  Clock,
  Calendar,
  Upload,
  Download,
  CheckCircle2,
  FileSpreadsheet,
  BarChart3,
  Flame,
  ChevronDown,
  Layers,
  Wrench,
  Search,
  Activity,
  ShieldAlert,
  TrendingUp,
  Gauge,
  Zap,
  Check,
  Truck,
  Sparkles,
  Lock,
  Unlock,
  Info,
  SlidersHorizontal,
  ChevronRight,
  Camera,
} from 'lucide-react';
import { ForkliftIcon } from '../icons/ForkliftIcon';
import { FleetDashboardData, FleetEquipo, FleetIncidencia } from '../../types/fleet';
import { formatAuditDateTime } from '../../utils/persistence';
import { formatDisplayDate } from '../../utils/normalizer';
import { parseFleetExcelWorkbook, canonicalFleetMonth, cleanHoursValue } from '../../utils/fleetExcelParser';
import { PeriodSelection } from '../../types/period';
import { matchesPeriod } from '../../utils/period';

interface FleetDashboardSectionProps {
  fleetData: FleetDashboardData;
  onUpdateFleetData: (data: FleetDashboardData, fileName: string) => Promise<void>;
  isUnlocked: boolean;
  onOpenAccessKeyModal: () => void;
  onOpenPhotoSummary?: () => void;
  latestFleetFileName?: string | null;
  lastFleetUpdatedAt?: string | null;
  isPublished?: boolean;
  analysisPeriod: PeriodSelection;
}

interface FleetPeriodViewProps {
  fleetData: FleetDashboardData;
  period: PeriodSelection;
  onUpdateData: () => void;
  onOpenPhotoSummary?: () => void;
}

const FleetPeriodView: React.FC<FleetPeriodViewProps> = ({ fleetData, period, onUpdateData, onOpenPhotoSummary }) => {
  const records = (fleetData.registrosDiarios || []).filter((record) => matchesPeriod(record.fecha, period));
  const incidents = (fleetData.incidencias || []).filter((record) => matchesPeriod(record.fecha, period));
  const totalUsage = records.reduce((sum, record) => sum + (record.horas_usadas || 0), 0);
  const totalDowntime = records.reduce((sum, record) => sum + record.horas_inoperativas, 0);
  const equipmentCount = new Set(records.map((record) => record.codigo)).size;
  const hasDailySource = (fleetData.registrosDiarios || []).length > 0;

  return (
    <div className="space-y-5 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-bold uppercase text-amber-700">Flota · detalle fechado</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A2E]">Horómetros de Montacargas</h1>
          <p className="mt-1 text-sm text-slate-600">Lecturas e incidencias dentro del periodo seleccionado.</p>
        </div>
        <div className="flex items-center gap-2">
          {onOpenPhotoSummary && (
            <button type="button" onClick={onOpenPhotoSummary} title="Abrir resumen fotográfico" className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100">
              <Camera className="h-4 w-4" />
            </button>
          )}
          <button type="button" onClick={onUpdateData} className="rounded-md bg-[#1A1A2E] px-3 py-2 text-xs font-bold text-white hover:bg-slate-700">
            Actualizar datos
          </button>
        </div>
      </header>

      <section aria-label="Resumen de flota del periodo" className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <article className="border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase text-slate-500">Equipos con lectura</p>
          <p className="mt-2 text-2xl font-black tabular-nums text-slate-900">{equipmentCount}</p>
        </article>
        <article className="border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase text-slate-500">Registros fechados</p>
          <p className="mt-2 text-2xl font-black tabular-nums text-slate-900">{records.length}</p>
        </article>
        <article className="border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase text-slate-500">Horas usadas registradas</p>
          <p className="mt-2 text-2xl font-black tabular-nums text-slate-900">{totalUsage.toLocaleString('es-PE', { maximumFractionDigits: 1 })} h</p>
        </article>
        <article className="border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase text-slate-500">Horas inoperativas</p>
          <p className="mt-2 text-2xl font-black tabular-nums text-slate-900">{totalDowntime.toLocaleString('es-PE', { maximumFractionDigits: 1 })} h</p>
        </article>
      </section>

      {!hasDailySource && (
        <p role="status" className="border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          El archivo guardado no conserva el detalle diario de horómetros. Vuelve a cargar el Excel de Flota para calcular este periodo; sus incidencias fechadas sí se muestran abajo.
        </p>
      )}

      <section className="overflow-hidden border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-xs">
            <thead className="bg-[#1A1A2E] text-white">
              <tr>
                <th className="px-3 py-2.5">Fecha</th>
                <th className="px-3 py-2.5">Equipo</th>
                <th className="px-3 py-2.5">Proveedor</th>
                <th className="px-3 py-2.5">Tipo</th>
                <th className="px-3 py-2.5 text-right">Horas usadas</th>
                <th className="px-3 py-2.5 text-right">Horas inoperativas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((record, index) => (
                <tr key={`${record.fecha}-${record.codigo}-${index}`} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-2.5">{formatDisplayDate(record.fecha) || record.fecha}</td>
                  <td className="px-3 py-2.5 font-bold text-slate-900">{record.codigo}</td>
                  <td className="px-3 py-2.5">{record.proveedor}</td>
                  <td className="px-3 py-2.5">{record.tipo}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{record.horas_usadas === null ? 'Sin lectura diaria' : `${record.horas_usadas.toLocaleString('es-PE', { maximumFractionDigits: 1 })} h`}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{record.horas_inoperativas.toLocaleString('es-PE', { maximumFractionDigits: 1 })} h</td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">No hay lecturas de horómetro en el periodo seleccionado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-3 py-2.5">
          <h2 className="text-xs font-black uppercase text-slate-800">Incidencias del periodo · {incidents.length}</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {incidents.map((incident, index) => (
            <article key={`${incident.fecha}-${incident.codigo}-${index}`} className="grid gap-1 px-3 py-2.5 text-xs sm:grid-cols-[110px_140px_1fr_auto] sm:items-center">
              <span className="text-slate-500">{formatDisplayDate(incident.fecha) || incident.fecha}</span>
              <span className="font-bold text-slate-900">{incident.codigo}</span>
              <span className="text-slate-700">{incident.motivo || incident.tipo_mant}</span>
              <span className="font-bold tabular-nums text-amber-800">{incident.horas} h</span>
            </article>
          ))}
          {incidents.length === 0 && <p className="px-3 py-6 text-center text-sm text-slate-500">No hay incidencias fechadas en este periodo.</p>}
        </div>
      </section>
    </div>
  );
};

export const FleetDashboardSection: React.FC<FleetDashboardSectionProps> = ({
  fleetData,
  onUpdateFleetData,
  isUnlocked,
  onOpenAccessKeyModal,
  onOpenPhotoSummary,
  latestFleetFileName = 'DATA_DASHBOARD_EJECUTIVO.xlsx',
  lastFleetUpdatedAt,
  isPublished = false,
  analysisPeriod,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [incidenciaSearch, setIncidenciaSearch] = useState<string>('');
  const [chartTypeFilter, setChartTypeFilter] = useState<'ALL' | 'MONTACARGA' | 'ELEVADOR' | 'EXCESO' | 'INOP'>('ALL');
  const [incidenciaTypeFilter, setIncidenciaTypeFilter] = useState<'ALL' | 'CORRECTIVO' | 'PREVENTIVO'>('ALL');

  // Meses disponibles canónicos, ordenados por calendario.
  const mesesDisponibles = useMemo(() => {
    const raw = fleetData.meses && fleetData.meses.length > 0 ? fleetData.meses : ['Julio', 'Agosto', 'Setiembre'];
    const canonicalSet = new Set<string>();
    raw.forEach((m) => {
      const canon = canonicalFleetMonth(m);
      if (canon) canonicalSet.add(canon);
    });

    const mesesOrdenados = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const ordenados = mesesOrdenados.filter((month) => canonicalSet.has(month));
    return ordenados.length > 0 ? ordenados : ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  }, [fleetData.meses]);

  const [currentMes, setCurrentMes] = useState<string>(() => {
    return mesesDisponibles[mesesDisponibles.length - 1] || 'Setiembre';
  });

  // Asegurar que effectiveMes sea un mes canónico válido existente
  const effectiveMes = useMemo(() => {
    const canonSelected = canonicalFleetMonth(currentMes);
    if (mesesDisponibles.includes(canonSelected)) return canonSelected;
    if (mesesDisponibles.includes(currentMes)) return currentMes;
    return mesesDisponibles[mesesDisponibles.length - 1] || 'Setiembre';
  }, [mesesDisponibles, currentMes]);

  const fmt = (n: number, d: number = 1) => {
    return (n || 0).toLocaleString('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d });
  };

  // KPIs consolidados por equipo para el mes seleccionado (unificando cualquier clave mayúscula/minúscula)
  const eqMes = useMemo(() => {
    const canon = canonicalFleetMonth(effectiveMes);
    return (fleetData.equipos || []).map((e) => {
      let horas_usadas = 0;
      let horas_inoperativas = 0;

      if (e.meses) {
        Object.entries(e.meses).forEach(([rawMonth, stats]) => {
          if (canonicalFleetMonth(rawMonth) === canon) {
            horas_usadas = Math.max(horas_usadas, stats?.horas_usadas || 0);
            const inopVal = cleanHoursValue(stats?.horas_inoperativas || 0);
            horas_inoperativas = Math.max(horas_inoperativas, inopVal);
          }
        });
      }

      return {
        ...e,
        u: { horas_usadas, horas_inoperativas },
      };
    });
  }, [fleetData.equipos, effectiveMes]);

  const totalEquipos = eqMes.length;
  const montacargasTotal = eqMes.filter((e) => e.tipo === 'MONTACARGA').length;
  const elevadoresTotal = eqMes.filter((e) => e.tipo === 'ELEVADOR').length;

  const excesoMont = useMemo(() => {
    return eqMes.filter((e) => e.tipo === 'MONTACARGA' && e.u.horas_usadas > e.limite).length;
  }, [eqMes]);

  const excesoElev = useMemo(() => {
    return eqMes.filter((e) => e.tipo === 'ELEVADOR' && e.u.horas_usadas > e.limite).length;
  }, [eqMes]);

  const totalInop = useMemo(() => {
    return eqMes.reduce((s, e) => s + (e.u.horas_inoperativas || 0), 0);
  }, [eqMes]);

  const totalHorasUsadas = useMemo(() => {
    return eqMes.reduce((s, e) => s + (e.u.horas_usadas || 0), 0);
  }, [eqMes]);

  const disponibilidadPct = useMemo(() => {
    if (totalHorasUsadas + totalInop === 0) return '100.0';
    const totalPosible = totalHorasUsadas + totalInop;
    const pct = (totalHorasUsadas / totalPosible) * 100;
    return pct.toFixed(1);
  }, [totalHorasUsadas, totalInop]);

  const topInoperativo = useMemo(() => {
    return eqMes.reduce((a, b) => {
      const aVal = a ? a.u.horas_inoperativas : -1;
      const bVal = b ? b.u.horas_inoperativas : -1;
      return bVal > aVal ? b : a;
    }, null as any);
  }, [eqMes]);

  // Providers breakdown
  const novaEqs = useMemo(() => eqMes.filter((e) => e.proveedor === 'NOVA'), [eqMes]);
  const dercoEqs = useMemo(() => eqMes.filter((e) => e.proveedor === 'DERCO'), [eqMes]);

  const novaCount = novaEqs.length;
  const dercoCount = dercoEqs.length;

  const novaExcesos = novaEqs.filter((e) => e.u.horas_usadas > e.limite).length;
  const dercoExcesos = dercoEqs.filter((e) => e.u.horas_usadas > e.limite).length;

  const novaInop = novaEqs.reduce((s, e) => s + (e.u.horas_inoperativas || 0), 0);
  const dercoInop = dercoEqs.reduce((s, e) => s + (e.u.horas_inoperativas || 0), 0);

  // Chart data filtered and sorted
  const chartEquipos = useMemo(() => {
    let list = eqMes.filter((e) => e.u.horas_usadas > 0 || e.u.horas_inoperativas > 0);

    if (chartTypeFilter === 'MONTACARGA') {
      list = list.filter((e) => e.tipo === 'MONTACARGA');
    } else if (chartTypeFilter === 'ELEVADOR') {
      list = list.filter((e) => e.tipo === 'ELEVADOR');
    } else if (chartTypeFilter === 'EXCESO') {
      list = list.filter((e) => e.u.horas_usadas > e.limite);
    } else if (chartTypeFilter === 'INOP') {
      list = list.filter((e) => (e.u.horas_inoperativas || 0) > 0);
    }

    return list.sort((a, b) => {
      const pctB = b.limite > 0 ? b.u.horas_usadas / b.limite : 0;
      const pctA = a.limite > 0 ? a.u.horas_usadas / a.limite : 0;
      return pctB - pctA;
    });
  }, [eqMes, chartTypeFilter]);

  // Incidencias del mes
  const incidenciasDelMes = useMemo(() => {
    const canon = canonicalFleetMonth(effectiveMes);
    let list = (fleetData.incidencias || [])
      .filter((i) => canonicalFleetMonth(i.mes) === canon)
      .map((i) => ({
        ...i,
        mes: canon,
        horas: cleanHoursValue(i.horas),
      }));

    if (incidenciaTypeFilter === 'CORRECTIVO') {
      list = list.filter((i) => i.tipo_mant.toUpperCase().includes('CORRECTIVO'));
    } else if (incidenciaTypeFilter === 'PREVENTIVO') {
      list = list.filter((i) => i.tipo_mant.toUpperCase().includes('PREVENTIVO'));
    }

    if (!incidenciaSearch.trim()) return list;
    const q = incidenciaSearch.toLowerCase();
    return list.filter(
      (i) =>
        i.codigo.toLowerCase().includes(q) ||
        i.motivo.toLowerCase().includes(q) ||
        i.tipo_mant.toLowerCase().includes(q) ||
        i.resultado.toLowerCase().includes(q) ||
        i.proveedor.toLowerCase().includes(q)
    );
  }, [fleetData.incidencias, effectiveMes, incidenciaSearch, incidenciaTypeFilter]);

  // Handle upload
  const handleUploadClick = () => {
    if (!isUnlocked) {
      onOpenAccessKeyModal();
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setUploadStatus('Leyendo archivo Excel y procesando horómetros e incidencias...');

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const parsedData = parseFleetExcelWorkbook(wb);

      await onUpdateFleetData(parsedData, file.name);

      if (parsedData.meses.length > 0) {
        setCurrentMes(parsedData.meses[parsedData.meses.length - 1]);
      }
      setUploadStatus(`Flota actualizada exitosamente desde ${file.name}`);
      setTimeout(() => setUploadStatus(''), 4500);
    } catch (err: any) {
      console.error('Error procesando archivo de flota:', err);
      setUploadStatus(`Error al procesar el archivo: ${err.message || 'Estructura no válida'}`);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Download active Excel data currently feeding this dashboard
  const handleDownloadFleetExcel = () => {
    const wb = XLSX.utils.book_new();

    // Hoja 1: Horómetros del mes seleccionado con métricas operativas
    const horometrosData = (fleetData.equipos || []).map((e) => {
      const u = e.meses[effectiveMes] || { horas_usadas: 0, horas_inoperativas: 0 };
      const over = u.horas_usadas > e.limite;
      const conIncidencia = u.horas_inoperativas > 0;
      const pctUso = e.limite > 0 ? (u.horas_usadas / e.limite) * 100 : 0;
      const excesoHoras = Math.max(0, u.horas_usadas - e.limite);

      let estado = 'OPERATIVO';
      if (conIncidencia && over) {
        estado = 'EXCESO + INCIDENCIA';
      } else if (conIncidencia) {
        estado = 'CON INCIDENCIA';
      } else if (over) {
        estado = 'EXCESO HORÓMETRO';
      }

      return {
        'Código Equipo': e.codigo,
        'Proveedor': e.proveedor === 'NOVA' ? 'NOVATRANS' : e.proveedor,
        'Tipo Equipo': e.tipo,
        'Mes': effectiveMes,
        'Límite Contractual (h)': e.limite,
        'Horas Usadas': Number(u.horas_usadas.toFixed(2)),
        '% Consumo': `${pctUso.toFixed(1)}%`,
        'Exceso de Horas': excesoHoras > 0 ? Number(excesoHoras.toFixed(2)) : 0,
        'Horas Inoperativas': Number(u.horas_inoperativas.toFixed(2)),
        'Estado Operativo': estado,
      };
    });

    const wsHorometros = XLSX.utils.json_to_sheet(horometrosData);
    XLSX.utils.book_append_sheet(wb, wsHorometros, `Horometros_${effectiveMes.slice(0, 20)}`);

    // Hoja 2: Bitácora completa de Incidencias registradas
    const incidenciasData = (fleetData.incidencias || []).map((i, idx) => ({
      'N°': idx + 1,
      'Fecha': formatDisplayDate(i.fecha) || i.fecha || '',
      'Mes': i.mes || '',
      'Código Equipo': i.codigo,
      'Proveedor': i.proveedor === 'NOVA' ? 'NOVATRANS' : i.proveedor,
      'Tipo Mantenimiento': i.tipo_mant || '',
      'Resultado': i.resultado || '',
      'Horas Inoperatividad': Number((i.horas || 0).toFixed(2)),
      'Motivo de Parada / Falla': i.motivo || '',
    }));

    const wsIncidencias = XLSX.utils.json_to_sheet(incidenciasData);
    XLSX.utils.book_append_sheet(wb, wsIncidencias, 'Bitacora_Incidencias');

    // Hoja 3: Resumen Ejecutivo del Dashboard
    const resumenData = [
      { 'Indicador / Métrica': 'Mes Auditado', 'Valor': effectiveMes },
      { 'Indicador / Métrica': 'Archivo Fuente Activo', 'Valor': latestFleetFileName || 'DATA_DASHBOARD_EJECUTIVO.xlsx' },
      { 'Indicador / Métrica': 'Última Actualización', 'Valor': formatAuditDateTime(lastFleetUpdatedAt) || 'Pre-cargado' },
      { 'Indicador / Métrica': 'Total Equipos en Flota', 'Valor': totalEquipos },
      { 'Indicador / Métrica': 'Equipos Proveedor NOVATRANS', 'Valor': novaCount },
      { 'Indicador / Métrica': 'Equipos Proveedor DERCO', 'Valor': dercoCount },
      { 'Indicador / Métrica': 'Total Montacargas (Límite 300h)', 'Valor': montacargasTotal },
      { 'Indicador / Métrica': 'Total Elevadores (Límite 375h)', 'Valor': elevadoresTotal },
      { 'Indicador / Métrica': 'Montacargas con Exceso Horómetro (>300h)', 'Valor': excesoMont },
      { 'Indicador / Métrica': 'Elevadores con Exceso Horómetro (>375h)', 'Valor': excesoElev },
      { 'Indicador / Métrica': 'Inoperatividad Total del Mes (horas)', 'Valor': Number(totalInop.toFixed(2)) },
      { 'Indicador / Métrica': 'Disponibilidad Operativa (%)', 'Valor': `${disponibilidadPct}%` },
      { 'Indicador / Métrica': 'Equipo con Mayor Inoperatividad', 'Valor': topInoperativo && topInoperativo.u.horas_inoperativas > 0 ? `${topInoperativo.codigo} (${topInoperativo.u.horas_inoperativas} h)` : 'Sin incidencias críticas' },
      { 'Indicador / Métrica': 'Incidencias del Mes', 'Valor': incidenciasDelMes.length },
    ];

    const wsResumen = XLSX.utils.json_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen_Ejecutivo');

    const safeBaseName = (latestFleetFileName || 'DATA_DASHBOARD_EJECUTIVO').replace(/\.xlsx?$/i, '');
    const finalDownloadName = `${safeBaseName}_Flota_${effectiveMes}.xlsx`;

    XLSX.writeFile(wb, finalDownloadName);
  };

  if (analysisPeriod.granularity !== 'all') {
    return (
      <FleetPeriodView
        fleetData={fleetData}
        period={analysisPeriod}
        onUpdateData={handleUploadClick}
        onOpenPhotoSummary={onOpenPhotoSummary}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. TOP EXECUTIVE HERO BANNER (DARK MIDNIGHT SLATE WITH VIVID ACCENTS) */}
      <div className="bg-gradient-to-r from-[#1A1A2E] via-[#1E293B] to-[#0F172A] rounded-2xl border-2 border-slate-700/80 shadow-xl p-5 md:p-6 text-white relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
          {/* Left Title and Badges */}
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs">
                <ForkliftIcon className="w-3.5 h-3.5 text-amber-400" />
                SECCIÓN EJECUTIVA &middot; FLOTA DE MONTACARGAS Y ELEVADORES STOL
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {totalEquipos} Equipos Auditados
              </span>
              <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                Límites Contractuales: 300h / 375h
              </span>
            </div>

            <h1 className="text-xl md:text-3xl font-black tracking-tight text-white drop-shadow-sm font-sans">
              Control de Operatividad de Flota, Inoperatividades y Horómetros
            </h1>
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed max-w-2xl font-normal">
              Auditoría mensual de consumo de horómetros por equipo, detección inmediata de excesos sobre el límite contractual pactado con proveedores (NOVATRANS y DERCO), y bitácora consolidada de fallas mecánicas e inoperatividades.
            </p>
          </div>

          {/* Right Controls: Month Selector & Action Buttons */}
          <div className="flex flex-col items-start lg:items-end gap-3 w-full lg:w-auto shrink-0">
            {/* Month Selector Pills */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-700/80 shadow-inner w-full lg:w-auto overflow-x-auto">
              <span className="text-[11px] font-black text-slate-400 uppercase px-2 shrink-0 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                MES:
              </span>
              {mesesDisponibles.map((m) => {
                const active = m === effectiveMes;
                return (
                  <button
                    key={m}
                    onClick={() => setCurrentMes(m)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md scale-102 ring-1 ring-amber-300'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
              {/* File Info Chip */}
              <div
                className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-slate-200 shadow-inner"
                title={`Archivo activo: ${latestFleetFileName}. Subido: ${formatAuditDateTime(lastFleetUpdatedAt)}`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-semibold truncate max-w-[150px] text-white">
                  {latestFleetFileName || 'DATA_DASHBOARD_EJECUTIVO.xlsx'}
                </span>
                <span className="text-slate-600">|</span>
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="text-[10.5px] text-slate-300">
                  {formatAuditDateTime(lastFleetUpdatedAt)
                    ? `Act.: ${formatAuditDateTime(lastFleetUpdatedAt)}`
                    : 'Pre-cargado'}
                </span>
              </div>

              {/* Download Excel Button */}
              <button
                onClick={handleDownloadFleetExcel}
                className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg cursor-pointer border border-emerald-400/40"
                title="Descargar la información consolidada en Excel de Horómetros, Inoperatividades y Flota"
              >
                <Download className="w-3.5 h-3.5 text-emerald-200" />
                <span>Descargar Excel</span>
              </button>

              {/* Photo Summary Button */}
              {onOpenPhotoSummary && (
                <button
                  type="button"
                  onClick={onOpenPhotoSummary}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shadow-md hover:shadow-lg cursor-pointer border border-amber-400"
                  title="Descargar o copiar foto resumen de Flota y Horómetros para análisis ejecutivo"
                >
                  <Camera className="w-3.5 h-3.5 text-slate-950 font-black shrink-0" />
                  <span>Foto Resumen</span>
                </button>
              )}

              {/* Upload Excel Button */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls"
                className="hidden"
              />
              <button
                onClick={handleUploadClick}
                disabled={isProcessing}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md ${
                  isUnlocked
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 border border-amber-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600'
                }`}
                title={isUnlocked ? 'Cargar nuevo archivo Excel de Horómetros y Flota' : 'Ingresa la clave corporativa autorizada para habilitar la subida'}
              >
                {isUnlocked ? (
                  <>
                    <Upload className="w-3.5 h-3.5 text-slate-950" />
                    <span>{isProcessing ? 'Procesando...' : '⭱ Actualizar Flota'}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>🔒 Desbloquear Subida</span>
                  </>
                )}
              </button>
            </div>

            {uploadStatus && (
              <div
                className={`text-xs font-bold px-3 py-1 rounded-lg ${
                  uploadStatus.includes('Error')
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {uploadStatus}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. FLEET PROVIDERS CARDS (NOVATRANS vs DERCO) - VIVID 3D PRESENTATION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* NOVATRANS Provider Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border-2 border-blue-500/40 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden group hover:border-blue-400 transition-all">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse"></span>
                <span className="text-[11px] font-black tracking-wider uppercase text-blue-300">
                  PROVEEDOR PRINCIPAL &middot; CONTRATO STOL
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                FLOTA NOVATRANS
              </h2>
              <p className="text-xs text-slate-300">
                Operaciones principales de almacén y despacho
              </p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-400/40 text-blue-300">
              <ForkliftIcon className="w-7 h-7 text-blue-400" />
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-700/80">
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-700/60 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Unidades</div>
              <div className="text-xl font-black font-mono text-white mt-0.5">{novaCount}</div>
              <div className="text-[9.5px] text-blue-300 font-semibold">Equipos</div>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-700/60 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Con Exceso</div>
              <div className={`text-xl font-black font-mono mt-0.5 ${novaExcesos > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {novaExcesos}
              </div>
              <div className="text-[9.5px] text-slate-400 font-medium">Sobre Límite</div>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-700/60 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Inoperatividad</div>
              <div className={`text-xl font-black font-mono mt-0.5 ${novaInop > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {fmt(novaInop, 1)}h
              </div>
              <div className="text-[9.5px] text-slate-400 font-medium">En {effectiveMes}</div>
            </div>
          </div>
        </div>

        {/* DERCO Provider Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 border-2 border-amber-500/40 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden group hover:border-amber-400 transition-all">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="text-[11px] font-black tracking-wider uppercase text-amber-300">
                  PROVEEDOR ESTRATÉGICO &middot; CONTRATO STOL
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                FLOTA DERCO
              </h2>
              <p className="text-xs text-slate-300">
                Equipos de elevación y apoyo para racks altos
              </p>
            </div>
            <div className="p-3 bg-amber-500/20 rounded-xl border border-amber-400/40 text-amber-300">
              <ForkliftIcon className="w-7 h-7 text-amber-400" />
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-700/80">
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-700/60 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Unidades</div>
              <div className="text-xl font-black font-mono text-white mt-0.5">{dercoCount}</div>
              <div className="text-[9.5px] text-amber-300 font-semibold">Equipos</div>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-700/60 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Con Exceso</div>
              <div className={`text-xl font-black font-mono mt-0.5 ${dercoExcesos > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {dercoExcesos}
              </div>
              <div className="text-[9.5px] text-slate-400 font-medium">Sobre Límite</div>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-700/60 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Inoperatividad</div>
              <div className={`text-xl font-black font-mono mt-0.5 ${dercoInop > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {fmt(dercoInop, 1)}h
              </div>
              <div className="text-[9.5px] text-slate-400 font-medium">En {effectiveMes}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SIX VIVID EXECUTIVE GRADIENT KPI CARDS (UNIFIED THEME) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* KPI 1: Total Equipos */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 text-white rounded-2xl p-4 shadow-lg flex flex-col justify-between border-2 border-blue-400/40 relative overflow-hidden group hover:scale-102 transition-all">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-blue-100">
            <span>Flota Total</span>
            <Truck className="w-4 h-4 text-blue-200" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-black font-mono tracking-tight">{totalEquipos}</div>
            <div className="text-[11px] font-bold text-blue-100 mt-0.5">Equipos Activos</div>
          </div>
          <div className="pt-2 border-t border-blue-400/30 text-[10.5px] text-blue-100 font-medium flex items-center justify-between">
            <span>NOVATRANS: {novaCount}</span>
            <span>DERCO: {dercoCount}</span>
          </div>
        </div>

        {/* KPI 2: Exceso Horómetro Montacargas */}
        <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 text-white rounded-2xl p-4 shadow-lg flex flex-col justify-between border-2 border-amber-300/40 relative overflow-hidden group hover:scale-102 transition-all">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-amber-100">
            <span>Exceso Montacargas</span>
            <AlertTriangle className="w-4 h-4 text-amber-200" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-black font-mono tracking-tight">{excesoMont}</div>
            <div className="text-[11px] font-bold text-amber-100 mt-0.5">
              {excesoMont === 1 ? 'Unidad > 300 h' : 'Unidades > 300 h'}
            </div>
          </div>
          <div className="pt-2 border-t border-amber-400/30 text-[10.5px] text-amber-100 font-medium truncate">
            {excesoMont > 0 ? '⚠️ Alerta sobrecosto' : '✅ Consumo dentro de norma'}
          </div>
        </div>

        {/* KPI 3: Exceso Horómetro Elevadores */}
        <div className="bg-gradient-to-br from-orange-600 via-orange-700 to-red-600 text-white rounded-2xl p-4 shadow-lg flex flex-col justify-between border-2 border-orange-400/40 relative overflow-hidden group hover:scale-102 transition-all">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-orange-100">
            <span>Exceso Elevadores</span>
            <Flame className="w-4 h-4 text-orange-200" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-black font-mono tracking-tight">{excesoElev}</div>
            <div className="text-[11px] font-bold text-orange-100 mt-0.5">
              {excesoElev === 1 ? 'Unidad > 375 h' : 'Unidades > 375 h'}
            </div>
          </div>
          <div className="pt-2 border-t border-orange-400/30 text-[10.5px] text-orange-100 font-medium truncate">
            {excesoElev > 0 ? '⚠️ Límite contractual superado' : '✅ Consumo en rango'}
          </div>
        </div>

        {/* KPI 4: Inoperatividad Total */}
        <div className="bg-gradient-to-br from-rose-600 via-red-600 to-rose-800 text-white rounded-2xl p-4 shadow-lg flex flex-col justify-between border-2 border-rose-400/40 relative overflow-hidden group hover:scale-102 transition-all">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-rose-100">
            <span>Inoperatividad</span>
            <Wrench className="w-4 h-4 text-rose-200" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-black font-mono tracking-tight">{fmt(totalInop, 1)}</div>
            <div className="text-[11px] font-bold text-rose-100 mt-0.5">Horas de Parada ({effectiveMes})</div>
          </div>
          <div className="pt-2 border-t border-rose-400/30 text-[10.5px] text-rose-100 font-medium truncate">
            {incidenciasDelMes.length} fallas registradas
          </div>
        </div>

        {/* KPI 5: Equipo Más Crítico */}
        <div className="bg-gradient-to-br from-purple-700 via-indigo-800 to-slate-900 text-white rounded-2xl p-4 shadow-lg flex flex-col justify-between border-2 border-purple-400/40 relative overflow-hidden group hover:scale-102 transition-all">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-purple-200">
            <span>Mayor Parada</span>
            <ShieldAlert className="w-4 h-4 text-purple-300" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-black font-mono tracking-tight truncate">
              {topInoperativo && topInoperativo.u.horas_inoperativas > 0
                ? topInoperativo.codigo
                : 'Ninguno'}
            </div>
            <div className="text-[11px] font-bold text-purple-200 mt-0.5">
              {topInoperativo && topInoperativo.u.horas_inoperativas > 0
                ? `${fmt(topInoperativo.u.horas_inoperativas, 1)} h inoperativo`
                : 'Sin fallas críticas'}
            </div>
          </div>
          <div className="pt-2 border-t border-purple-400/30 text-[10.5px] text-purple-200 font-medium truncate">
            {topInoperativo ? `Proveedor: ${topInoperativo.proveedor}` : 'Flota 100% OK'}
          </div>
        </div>

        {/* KPI 6: Disponibilidad Global */}
        <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 text-white rounded-2xl p-4 shadow-lg flex flex-col justify-between border-2 border-emerald-400/40 relative overflow-hidden group hover:scale-102 transition-all">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-emerald-100">
            <span>Disponibilidad</span>
            <Gauge className="w-4 h-4 text-emerald-200" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-black font-mono tracking-tight">{disponibilidadPct}%</div>
            <div className="text-[11px] font-bold text-emerald-100 mt-0.5">Operatividad Global</div>
          </div>
          <div className="pt-2 border-t border-emerald-400/30 text-[10.5px] text-emerald-100 font-medium truncate">
            {fmt(totalHorasUsadas, 0)} h productivas
          </div>
        </div>
      </div>

      {/* 4. MAIN WORKSPACE: CHART (HORAS VS LÍMITE) & INCIDENCIAS BITÁCORA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Chart Panel (7 cols): Horizontal Bars */}
        <div className="lg:col-span-7 bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Horas Usadas vs. Límite Contractual por Equipo ({effectiveMes})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Línea vertical = límite contractual (300h montacargas / 375h elevadores)
                </p>
              </div>

              {/* Chart Filters */}
              <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  onClick={() => setChartTypeFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chartTypeFilter === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos ({eqMes.length})
                </button>
                <button
                  onClick={() => setChartTypeFilter('MONTACARGA')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chartTypeFilter === 'MONTACARGA'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Montacargas
                </button>
                <button
                  onClick={() => setChartTypeFilter('ELEVADOR')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chartTypeFilter === 'ELEVADOR'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Elevadores
                </button>
                <button
                  onClick={() => setChartTypeFilter('EXCESO')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chartTypeFilter === 'EXCESO'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Exceso ({excesoMont + excesoElev})
                </button>
              </div>
            </div>

            {/* Bars List */}
            <div className="space-y-3.5 max-h-[520px] overflow-y-auto pr-2 mt-4 scrollbar-thin">
              {chartEquipos.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No se encontraron equipos bajo el filtro seleccionado en {effectiveMes}.
                </div>
              ) : (
                chartEquipos.map((e) => {
                  const maxScale = Math.max(e.limite * 1.35, e.u.horas_usadas * 1.05);
                  const pct = Math.min(100, (e.u.horas_usadas / maxScale) * 100);
                  const limitPct = Math.min(100, (e.limite / maxScale) * 100);
                  const over = e.u.horas_usadas > e.limite;
                  const ratioConsumo = e.limite > 0 ? (e.u.horas_usadas / e.limite) * 100 : 0;
                  const excesoHoras = Math.max(0, e.u.horas_usadas - e.limite);

                  const isNova = e.proveedor === 'NOVA';

                  return (
                    <div key={e.codigo} className="group flex flex-col gap-1 text-xs">
                      <div className="flex items-center justify-between text-[11.5px]">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-slate-900 text-xs">
                            {e.codigo}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase ${
                              isNova ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {e.proveedor}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {e.tipo}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {over && (
                            <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.2 rounded border border-red-200">
                              +{fmt(excesoHoras, 1)}h Exceso
                            </span>
                          )}
                          <span className="font-mono font-black text-slate-900">
                            {fmt(e.u.horas_usadas, 1)} / {e.limite} h
                          </span>
                          <span
                            className={`text-[10.5px] font-black px-1.5 py-0.2 rounded ${
                              over
                                ? 'bg-amber-500 text-slate-950 font-black'
                                : ratioConsumo > 80
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {ratioConsumo.toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      {/* Bar Track */}
                      <div className="h-6 bg-slate-100 rounded-lg relative overflow-visible border border-slate-200 p-0.5">
                        <div
                          className={`h-full rounded-md transition-all duration-500 shadow-xs flex items-center justify-end pr-2 text-[10px] font-black text-white ${
                            over
                              ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-600'
                              : ratioConsumo > 80
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-600'
                          }`}
                          style={{ width: `${Math.max(5, pct)}%` }}
                        >
                          {pct > 25 && `${ratioConsumo.toFixed(0)}%`}
                        </div>

                        {/* Limit Line */}
                        <div
                          className="absolute -top-1 -bottom-1 w-[3px] bg-slate-900 z-10 rounded-full shadow-sm"
                          style={{ left: `${limitPct}%` }}
                          title={`Límite contractual: ${e.limite} h`}
                        >
                          <div className="absolute -top-3.5 -left-3 text-[8px] font-black bg-slate-900 text-white px-1 py-0.2 rounded">
                            {e.limite}h
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Chart Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-5 pt-3 border-t border-slate-200 text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-gradient-to-r from-emerald-500 to-teal-600"></span>
              En Rango (&lt;80%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600"></span>
              Uso Óptimo (80%-100%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-gradient-to-r from-amber-500 to-red-600"></span>
              Supera Límite Contractual (&gt;100%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-3 bg-slate-900 rounded-sm"></span>
              Límite Contractual (300h / 375h)
            </span>
          </div>
        </div>

        {/* Right Incidencias Table Panel (5 cols) */}
        <div className="lg:col-span-5 bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/15 rounded-xl border border-amber-500/30">
                  <Wrench className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Bitácora de Incidencias ({effectiveMes})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Fallas mecánicas, mantenimientos y paradas
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-slate-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full">
                {incidenciasDelMes.length} reg.
              </span>
            </div>

            {/* Quick search & filter */}
            <div className="flex gap-2 my-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={incidenciaSearch}
                  onChange={(e) => setIncidenciaSearch(e.target.value)}
                  placeholder="Buscar por equipo, falla, tipo..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[11px] font-bold">
                <button
                  onClick={() => setIncidenciaTypeFilter('ALL')}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    incidenciaTypeFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setIncidenciaTypeFilter('CORRECTIVO')}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    incidenciaTypeFilter === 'CORRECTIVO'
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Correctivo
                </button>
                <button
                  onClick={() => setIncidenciaTypeFilter('PREVENTIVO')}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    incidenciaTypeFilter === 'PREVENTIVO'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Preventivo
                </button>
              </div>
            </div>

            {/* Incidencias Table with Executive High Contrast */}
            <div className="max-h-[460px] overflow-y-auto border border-slate-200 rounded-xl scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-[#1A1A2E] text-white text-[10.5px] uppercase tracking-wider font-black">
                  <tr>
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-2">Equipo</th>
                    <th className="py-2.5 px-2">Tipo / Falla</th>
                    <th className="py-2.5 px-3 text-right">Inop.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {incidenciasDelMes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-xs text-slate-400">
                        No se registraron incidencias en este mes con los filtros actuales.
                      </td>
                    </tr>
                  ) : (
                    incidenciasDelMes.map((r, idx) => {
                      const isCorrectivo = r.tipo_mant.toUpperCase().includes('CORRECTIVO');
                      const isReparado = r.resultado.toUpperCase().includes('REPARADO');

                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 whitespace-nowrap text-[11px] font-mono text-slate-600">
                            {formatDisplayDate(r.fecha) || r.fecha || '—'}
                          </td>
                          <td className="py-2.5 px-2 whitespace-nowrap">
                            <div className="font-mono font-black text-slate-900 text-xs">
                              {r.codigo}
                            </div>
                            <span
                              className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                r.proveedor === 'NOVA'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {r.proveedor}
                            </span>
                          </td>
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                                  isCorrectivo
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                                }`}
                              >
                                {r.tipo_mant}
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                  isReparado
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-amber-100 text-amber-900 border border-amber-200'
                                }`}
                              >
                                {r.resultado}
                              </span>
                            </div>
                            <div
                              className="text-[10.5px] text-slate-600 truncate max-w-[170px] mt-0.5"
                              title={r.motivo}
                            >
                              {r.motivo}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black whitespace-nowrap">
                            <span
                              className={`px-1.5 py-0.5 rounded text-xs ${
                                r.horas > 4
                                  ? 'bg-red-100 text-red-800 font-black'
                                  : 'text-slate-900'
                              }`}
                            >
                              {fmt(r.horas, 1)} h
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total horas inoperativas en bitácora:</span>
            <b className="font-mono text-slate-900 font-black text-sm">
              {fmt(incidenciasDelMes.reduce((s, i) => s + (i.horas || 0), 0), 1)} h
            </b>
          </div>
        </div>
      </div>

      {/* 5. INDIVIDUAL FLEET STATUS BREAKDOWN (DETALLE POR EQUIPO Y PROVEEDOR) */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base md:text-lg font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-500" />
              Detalle Individual de Estatus por Equipo ({effectiveMes})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Estado de horómetro, consumo contractual y paradas agrupado por proveedor logístico
            </p>
          </div>
          <div className="text-xs font-bold text-slate-600 flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Operativo
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500"></span> Exceso
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500"></span> Inoperatividad
          </div>
        </div>

        {/* NOVATRANS Fleet Group */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between bg-blue-50/80 px-4 py-2.5 rounded-xl border border-blue-200 text-blue-950">
            <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wider">
              <span className="w-3 h-3 rounded-full bg-blue-600"></span>
              FLOTA NOVATRANS &middot; {novaEqs.length} Equipos Auditados
            </div>
            <span className="text-xs font-bold text-blue-800">
              Límite 300h (Montacargas) / 375h (Elevadores)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {novaEqs.map((e) => {
              const u = e.meses[effectiveMes] || { horas_usadas: 0, horas_inoperativas: 0 };
              const over = u.horas_usadas > e.limite;
              const conIncidencia = u.horas_inoperativas > 0;
              const pct = Math.min(100, e.limite > 0 ? (u.horas_usadas / e.limite) * 100 : 0);

              let cardBorder = 'border-slate-200 hover:border-blue-400';
              let badgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-300';
              let badgeText = 'OPERATIVO';

              if (conIncidencia && over) {
                cardBorder = 'border-red-300 bg-red-50/30';
                badgeBg = 'bg-red-600 text-white';
                badgeText = 'EXCESO + INOPERATIVO';
              } else if (conIncidencia) {
                cardBorder = 'border-rose-300 bg-rose-50/20';
                badgeBg = 'bg-rose-100 text-rose-800 border-rose-300';
                badgeText = 'CON INCIDENCIA';
              } else if (over) {
                cardBorder = 'border-amber-300 bg-amber-50/20';
                badgeBg = 'bg-amber-500 text-slate-950 font-black';
                badgeText = 'EXCESO HORÓMETRO';
              }

              return (
                <div
                  key={e.codigo}
                  className={`bg-white border-2 rounded-xl p-3.5 shadow-xs transition-all flex flex-col justify-between ${cardBorder}`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1.5 mb-2">
                      <div>
                        <div className="font-mono font-black text-base text-slate-900">
                          {e.codigo}
                        </div>
                        <div className="text-[10px] uppercase font-bold text-slate-500">
                          {e.tipo}
                        </div>
                      </div>
                      <span
                        className={`text-[9.5px] font-black px-2 py-0.5 rounded-full border whitespace-nowrap ${badgeBg}`}
                      >
                        {badgeText}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                      <span>Consumo:</span>
                      <b className="font-mono font-bold text-slate-900">
                        {fmt(u.horas_usadas, 0)} / {e.limite} h ({pct.toFixed(0)}%)
                      </b>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200 mb-2.5">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          over
                            ? 'bg-gradient-to-r from-amber-500 to-red-600'
                            : pct > 80
                            ? 'bg-blue-600'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 font-semibold text-slate-600">
                    <span>Inoperatividad:</span>
                    <b
                      className={`font-mono ${
                        conIncidencia ? 'text-red-600 font-black' : 'text-slate-500'
                      }`}
                    >
                      {fmt(u.horas_inoperativas, 1)} h
                    </b>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DERCO Fleet Group */}
        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-between bg-amber-50/80 px-4 py-2.5 rounded-xl border border-amber-200 text-amber-950">
            <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wider">
              <span className="w-3 h-3 rounded-full bg-amber-600"></span>
              FLOTA DERCO &middot; {dercoEqs.length} Equipos Auditados
            </div>
            <span className="text-xs font-bold text-amber-800">
              Límite 300h (Montacargas) / 375h (Elevadores)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {dercoEqs.map((e) => {
              const u = e.meses[effectiveMes] || { horas_usadas: 0, horas_inoperativas: 0 };
              const over = u.horas_usadas > e.limite;
              const conIncidencia = u.horas_inoperativas > 0;
              const pct = Math.min(100, e.limite > 0 ? (u.horas_usadas / e.limite) * 100 : 0);

              let cardBorder = 'border-slate-200 hover:border-amber-400';
              let badgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-300';
              let badgeText = 'OPERATIVO';

              if (conIncidencia && over) {
                cardBorder = 'border-red-300 bg-red-50/30';
                badgeBg = 'bg-red-600 text-white';
                badgeText = 'EXCESO + INOPERATIVO';
              } else if (conIncidencia) {
                cardBorder = 'border-rose-300 bg-rose-50/20';
                badgeBg = 'bg-rose-100 text-rose-800 border-rose-300';
                badgeText = 'CON INCIDENCIA';
              } else if (over) {
                cardBorder = 'border-amber-300 bg-amber-50/20';
                badgeBg = 'bg-amber-500 text-slate-950 font-black';
                badgeText = 'EXCESO HORÓMETRO';
              }

              return (
                <div
                  key={e.codigo}
                  className={`bg-white border-2 rounded-xl p-3.5 shadow-xs transition-all flex flex-col justify-between ${cardBorder}`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1.5 mb-2">
                      <div>
                        <div className="font-mono font-black text-base text-slate-900">
                          {e.codigo}
                        </div>
                        <div className="text-[10px] uppercase font-bold text-slate-500">
                          {e.tipo}
                        </div>
                      </div>
                      <span
                        className={`text-[9.5px] font-black px-2 py-0.5 rounded-full border whitespace-nowrap ${badgeBg}`}
                      >
                        {badgeText}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                      <span>Consumo:</span>
                      <b className="font-mono font-bold text-slate-900">
                        {fmt(u.horas_usadas, 0)} / {e.limite} h ({pct.toFixed(0)}%)
                      </b>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200 mb-2.5">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          over
                            ? 'bg-gradient-to-r from-amber-500 to-red-600'
                            : pct > 80
                            ? 'bg-amber-600'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 font-semibold text-slate-600">
                    <span>Inoperatividad:</span>
                    <b
                      className={`font-mono ${
                        conIncidencia ? 'text-red-600 font-black' : 'text-slate-500'
                      }`}
                    >
                      {fmt(u.horas_inoperativas, 1)} h
                    </b>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 6. EXECUTIVE FOOTER */}
      <div className="text-center text-xs text-slate-500 font-medium py-3 border-t border-slate-200">
        Plataforma Integral de Auditorías Operacionales STOL &middot; Módulo de Flota de Montacargas y Elevadores (Datos consolidados de Bitácora y Horómetros)
      </div>
    </div>
  );
};
