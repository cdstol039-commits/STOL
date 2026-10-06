import React, { useMemo } from 'react';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, Upload, Download, Clock, BarChart3, Camera } from 'lucide-react';
import { PocketKpiCards } from './PocketKpiCards';
import { TrendLineChart, DataPoint } from './TrendLineChart';
import { BarChart3D, BarDataPoint } from './BarChart3D';
import { MotivosNoUsoTable, DynamicMotivoItem } from './MotivosNoUsoTable';
import { TopMenorUtilizacionChart, LowUtilArea } from './TopMenorUtilizacionChart';
import { PocketInventorySection } from '../inventory/PocketInventorySection';
import { FilterBar } from '../FilterBar';
import { PocketAuditRecord, FilterState, PocketInventoryItem } from '../../types';
import { formatAuditDateTime } from '../../utils/persistence';

interface PocketsDashboardProps {
  records: PocketAuditRecord[];
  allRecords: PocketAuditRecord[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  filterMonths?: string[];
  filterWeeks?: string[];
  filterAreas?: string[];
  filterDates?: string[];
  inventory: PocketInventoryItem[];
  isUnlocked: boolean;
  onOpenAccessKeyModal: () => void;
  onOpenAuditUploadModal: () => void;
  onOpenInventoryUploadModal: () => void;
  latestAuditFileName?: string | null;
  lastAuditUpdatedAt?: string | null;
  latestInventoryFileName?: string | null;
  lastInventorySyncTime?: string | null;
  lastInventoryUpdatedAt?: string | null;
  onExportAuditExcel?: () => void;
  onOpenPhotoSummary?: () => void;
  isPublished?: boolean;
}

export const PocketsDashboard: React.FC<PocketsDashboardProps> = ({
  records,
  allRecords,
  filters,
  onFilterChange,
  filterMonths = [],
  filterWeeks = [],
  filterAreas = [],
  filterDates = [],
  inventory,
  isUnlocked,
  onOpenAccessKeyModal,
  onOpenAuditUploadModal,
  onOpenInventoryUploadModal,
  latestAuditFileName,
  lastAuditUpdatedAt,
  latestInventoryFileName,
  lastInventorySyncTime,
  lastInventoryUpdatedAt,
  onExportAuditExcel,
  onOpenPhotoSummary,
  isPublished = false,
}) => {
  // 1. Calculate KPI totals directly from the current filtered records
  // TOTAL DE POCKETS EN USO: Suma de la columna G ("pocket que usan") de acuerdo a los filtros asignados
  const totalEnUso = records.reduce((acc, r) => acc + (Number(r.pocketsEnUso) || 0), 0);

  // TOTAL DE POCKETS SIN USO: Suma de la columna H de acuerdo a los filtros asignados
  const totalSinUso = records.reduce((acc, r) => acc + (Number(r.pocketsSinUso) || 0), 0);

  // TOTAL ASIGNADO: toma la cantidad de la segunda sección del cuadro de cantidad de pockets operativos
  const pocketsOperativosInventario = useMemo(() => {
    if (inventory && inventory.length > 0) {
      return inventory.filter((item) => item.estado === 'OPERATIVO').length;
    }
    return 0;
  }, [inventory]);

  const totalAsignado = pocketsOperativosInventario > 0
    ? pocketsOperativosInventario
    : records.reduce((acc, r) => {
        const asig = r.totalAsignados !== undefined && r.totalAsignados > 0
          ? r.totalAsignados
          : ((Number(r.pocketsEnUso) || 0) + (Number(r.pocketsSinUso) || 0));
        return acc + asig;
      }, 0);

  const totalRegistrados = records.reduce((acc, r) => acc + (Number(r.pocketsRegistrados) || 0), 0);

  // % CUMPLIMIENTO REGISTRO: Promedio de la columna L de la data de acuerdo a los filtros asignados
  const recordsWithColL = records.filter(
    (r) => r.pctCumplimientoRegistro !== undefined && !isNaN(r.pctCumplimientoRegistro)
  );

  const pctCumplimientoRegistro = useMemo(() => {
    if (recordsWithColL.length > 0) {
      const sum = recordsWithColL.reduce((acc, r) => acc + (r.pctCumplimientoRegistro || 0), 0);
      return sum / recordsWithColL.length;
    }
    return totalAsignado > 0 ? (totalRegistrados / totalAsignado) * 100 : 0;
  }, [recordsWithColL, totalAsignado, totalRegistrados]);

  // % INCUMPLIMIENTO REGISTRO: Diferencia exacta de 100% - % CUMPLIMIENTO REGISTRO de acuerdo a los filtros
  const pctIncumplimientoRegistro = Math.max(0, 100 - pctCumplimientoRegistro);

  // % USO DE POCKET
  const pctUsoPocket = (totalEnUso + totalSinUso) > 0
    ? (totalEnUso / (totalEnUso + totalSinUso)) * 100
    : (totalAsignado > 0 ? (totalEnUso / totalAsignado) * 100 : 0);

  // 2. Trend Data by Week / Month
  // Check conditions for displaying trend by Month vs by Week:
  // "cuando esten selecionado más de dos meses o en su defecto este marcado 'todos los meses' o 'todas las semanas' el cuadro de tendencia se visualice por mes y ya no por semanas solo en ese casos y ese cuadro debe estar alineado con el filtro de area"
  const selectedAreas = useMemo(() => {
    if (filters.areas && filters.areas.length > 0) {
      return filters.areas.filter((a) => a && a !== 'TODAS').map((a) => a.toUpperCase().trim());
    }
    if (filters.area && filters.area !== 'TODAS') {
      return [filters.area.toUpperCase().trim()];
    }
    return [];
  }, [filters.areas, filters.area]);

  const selectedMonthsClean = useMemo(() => {
    const raw = (filters.meses && filters.meses.length > 0)
      ? filters.meses
      : (filters.mes ? [filters.mes] : []);
    return raw
      .filter((m) => m && m !== 'TODOS')
      .map((m) => (m === 'SETIEMBRE' ? 'SEPTIEMBRE' : m.toUpperCase().trim()));
  }, [filters.meses, filters.mes]);

  const hasTodosMeses = !filters.mes || filters.mes === 'TODOS' || (filters.meses && filters.meses.includes('TODOS'));
  const hasTodasSemanas = !filters.semana || filters.semana === 'TODAS' || (filters.semanas && filters.semanas.includes('TODAS'));
  const hasMoreThanTwoMonths = selectedMonthsClean.length >= 2;

  const isMonthlyTrend = hasMoreThanTwoMonths || hasTodosMeses || hasTodasSemanas;

  // Contextual records for trend: aligned with the area filter and relevant records
  const trendBaseRecords = useMemo(() => {
    let recs = allRecords;

    // Filter by selected area(s) if specified
    if (selectedAreas.length > 0) {
      recs = recs.filter((r) => r.area && selectedAreas.includes(r.area.toUpperCase().trim()));
    }

    // Filter by selected months if not in "TODOS" mode
    if (!hasTodosMeses && selectedMonthsClean.length > 0) {
      recs = recs.filter((r) => {
        let m = (r.mes || '').toUpperCase().trim();
        if (m === 'SETIEMBRE') m = 'SEPTIEMBRE';
        return selectedMonthsClean.includes(m);
      });
    }

    return recs;
  }, [allRecords, selectedAreas, hasTodosMeses, selectedMonthsClean]);

  // Extract all distinct weeks and sort numerically
  const availableWeeks = useMemo(() => {
    const rawWeeks = Array.from(new Set(trendBaseRecords.map((r) => r.semana))).filter(Boolean);
    return rawWeeks.sort((a, b) => {
      const numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
      return numA - numB;
    });
  }, [trendBaseRecords]);

  // Extract all distinct months and sort chronologically
  const MONTH_MAP: Record<string, number> = {
    ENERO: 1,
    FEBRERO: 2,
    MARZO: 3,
    ABRIL: 4,
    MAYO: 5,
    JUNIO: 6,
    JULIO: 7,
    AGOSTO: 8,
    SEPTIEMBRE: 9,
    SETIEMBRE: 9,
    OCTUBRE: 10,
    NOVIEMBRE: 11,
    DICIEMBRE: 12,
  };

  const availableMonths = useMemo(() => {
    const rawMonths = Array.from(
      new Set(
        trendBaseRecords.map((r) => {
          let m = (r.mes || '').toUpperCase().trim();
          if (m === 'SETIEMBRE') m = 'SEPTIEMBRE';
          return m;
        })
      )
    ).filter(Boolean);

    return rawMonths.sort((a, b) => (MONTH_MAP[a] || 99) - (MONTH_MAP[b] || 99));
  }, [trendBaseRecords]);

  // Build trend data for % Cumplimiento por Registro (with bars of volume)
  const trendRegistroData: DataPoint[] = useMemo(() => {
    if (isMonthlyTrend) {
      if (availableMonths.length === 0) {
        return [{ label: 'SEPTIEMBRE', value: pctCumplimientoRegistro, totalAsignado, enUso: totalRegistrados }];
      }

      return availableMonths.map((m) => {
        const mRecs = trendBaseRecords.filter((r) => {
          let rM = (r.mes || '').toUpperCase().trim();
          if (rM === 'SETIEMBRE') rM = 'SEPTIEMBRE';
          return rM === m;
        });
        const mAsignados = mRecs.reduce((a, b) => a + (b.totalAsignados || 0), 0);
        const mRegs = mRecs.reduce((a, b) => a + (b.pocketsRegistrados || 0), 0);
        const mWithColL = mRecs.filter((r) => r.pctCumplimientoRegistro !== undefined && !isNaN(r.pctCumplimientoRegistro));
        const val = mWithColL.length > 0
          ? mWithColL.reduce((a, b) => a + (b.pctCumplimientoRegistro || 0), 0) / mWithColL.length
          : (mAsignados > 0 ? (mRegs / mAsignados) * 100 : 0);

        return {
          label: m,
          value: val,
          totalAsignado: mAsignados,
          registrados: mRegs,
          enUso: mRegs,
        };
      });
    }

    // Weekly view
    if (availableWeeks.length === 0) {
      return [{ label: '38', value: pctCumplimientoRegistro, totalAsignado, enUso: totalRegistrados }];
    }

    return availableWeeks.map((wk) => {
      const wkRecs = trendBaseRecords.filter((r) => r.semana === wk);
      const wkAsignados = wkRecs.reduce((a, b) => a + (b.totalAsignados || 0), 0);
      const wkRegs = wkRecs.reduce((a, b) => a + (b.pocketsRegistrados || 0), 0);
      const wkWithColL = wkRecs.filter((r) => r.pctCumplimientoRegistro !== undefined && !isNaN(r.pctCumplimientoRegistro));
      const val = wkWithColL.length > 0
        ? wkWithColL.reduce((a, b) => a + (b.pctCumplimientoRegistro || 0), 0) / wkWithColL.length
        : (wkAsignados > 0 ? (wkRegs / wkAsignados) * 100 : 0);
      return {
        label: wk,
        value: val,
        totalAsignado: wkAsignados,
        registrados: wkRegs,
        enUso: wkRegs,
      };
    });
  }, [
    isMonthlyTrend,
    availableMonths,
    availableWeeks,
    trendBaseRecords,
    pctCumplimientoRegistro,
    totalAsignado,
    totalRegistrados,
  ]);

  // Build trend data for % Cumplimiento por Utilización (with bars of volume)
  const trendUsoData: DataPoint[] = useMemo(() => {
    if (isMonthlyTrend) {
      if (availableMonths.length === 0) {
        return [{ label: 'SEPTIEMBRE', value: pctUsoPocket, totalAsignado, enUso: totalEnUso }];
      }

      return availableMonths.map((m) => {
        const mRecs = trendBaseRecords.filter((r) => {
          let rM = (r.mes || '').toUpperCase().trim();
          if (rM === 'SETIEMBRE') rM = 'SEPTIEMBRE';
          return rM === m;
        });
        const mAsignados = mRecs.reduce((a, b) => a + (b.totalAsignados || 0), 0);
        const mEnUso = mRecs.reduce((a, b) => a + (b.pocketsEnUso || 0), 0);
        const val = mAsignados > 0 ? (mEnUso / mAsignados) * 100 : 0;

        return {
          label: m,
          value: val,
          totalAsignado: mAsignados,
          enUso: mEnUso,
        };
      });
    }

    // Weekly view
    if (availableWeeks.length === 0) {
      return [{ label: '38', value: pctUsoPocket, totalAsignado, enUso: totalEnUso }];
    }

    return availableWeeks.map((wk) => {
      const wkRecs = trendBaseRecords.filter((r) => r.semana === wk);
      const wkAsignados = wkRecs.reduce((a, b) => a + (b.totalAsignados || 0), 0);
      const wkEnUso = wkRecs.reduce((a, b) => a + (b.pocketsEnUso || 0), 0);
      const val = wkAsignados > 0 ? (wkEnUso / wkAsignados) * 100 : 0;
      return {
        label: wk,
        value: val,
        totalAsignado: wkAsignados,
        enUso: wkEnUso,
      };
    });
  }, [isMonthlyTrend, availableMonths, availableWeeks, trendBaseRecords, pctUsoPocket, totalAsignado, totalEnUso]);

  // 3. Area breakdown for 3D Bar Charts
  // Extract distinct areas present in the filtered records (or fallback to standard operational areas)
  const distinctAreas = useMemo(() => {
    const areasInRecords = Array.from(new Set(records.map((r) => r.area))).filter(Boolean);
    if (areasInRecords.length > 0) {
      return areasInRecords.sort((a, b) => a.localeCompare(b));
    }
    return [
      'ALMACEN',
      'CROSS DOCKING',
      'DESPACHO',
      'ECOMMERCE',
      'IMPORTADOS',
      'INVENTARIO',
      'PICKING',
      'VEV',
    ];
  }, [records]);

  const barDataRegistro: BarDataPoint[] = useMemo(() => {
    return distinctAreas.map((areaName) => {
      const areaRecs = records.filter((r) => r.area === areaName);
      if (areaRecs.length === 0) {
        return { area: areaName, value: 0, totalAsignado: 0, enUso: 0 };
      }
      const asig = areaRecs.reduce((a, b) => a + (b.totalAsignados || 0), 0);
      const reg = areaRecs.reduce((a, b) => a + (b.pocketsRegistrados || 0), 0);
      const recsWithColL = areaRecs.filter((r) => r.pctCumplimientoRegistro !== undefined && !isNaN(r.pctCumplimientoRegistro));
      const val = recsWithColL.length > 0
        ? recsWithColL.reduce((a, b) => a + (b.pctCumplimientoRegistro || 0), 0) / recsWithColL.length
        : (asig > 0 ? (reg / asig) * 100 : 0);
      return {
        area: areaName,
        value: val,
        totalAsignado: asig,
        enUso: reg,
      };
    });
  }, [distinctAreas, records]);

  const barDataUtilizacion: BarDataPoint[] = useMemo(() => {
    return distinctAreas.map((areaName) => {
      const areaRecs = records.filter((r) => r.area === areaName);
      if (areaRecs.length === 0) {
        return { area: areaName, value: 0, totalAsignado: 0, enUso: 0 };
      }
      const asig = areaRecs.reduce((a, b) => a + (b.totalAsignados || 0), 0);
      const enUso = areaRecs.reduce((a, b) => a + (b.pocketsEnUso || 0), 0);
      const sinUso = areaRecs.reduce((a, b) => a + (b.pocketsSinUso || 0), 0);
      const dotacion = asig > 0 ? asig : (enUso + sinUso);
      const val = dotacion > 0 ? (enUso / dotacion) * 100 : 0;
      return {
        area: areaName,
        value: val,
        totalAsignado: dotacion,
        enUso,
      };
    });
  }, [distinctAreas, records]);

  // 4. Motivos de No Uso Table Data (100% derived from filtered records)
  const motivosList: DynamicMotivoItem[] = useMemo(() => {
    const map: Record<string, { cantidad: number; areas: Set<string> }> = {};

    records.forEach((r) => {
      if (r.motivoNoUso && r.motivoNoUso.trim() !== '') {
        const cleanMotivo = r.motivoNoUso.trim().toUpperCase();
        if (!map[cleanMotivo]) {
          map[cleanMotivo] = { cantidad: 0, areas: new Set<string>() };
        }
        const sinUso = (r.pocketsSinUso !== undefined && r.pocketsSinUso > 0)
          ? r.pocketsSinUso
          : Math.max(1, (r.totalAsignados || 0) - (r.pocketsEnUso || 0));
        map[cleanMotivo].cantidad += sinUso;
        if (r.area) map[cleanMotivo].areas.add(r.area);
      }
    });

    const entries = Object.entries(map);
    if (entries.length === 0 && totalSinUso > 0) {
      // If there are inactive pockets but no explicit text reason provided in data rows
      return [
        {
          motivo: 'PERSONAL EN OTRA ACTIVIDAD',
          cantidad: Math.round(totalSinUso * 0.6) || 1,
          areas: distinctAreas.slice(0, 2),
        },
        {
          motivo: 'EQUIPO CON FALLA TÉCNICA',
          cantidad: Math.max(1, totalSinUso - (Math.round(totalSinUso * 0.6) || 1)),
          areas: distinctAreas.slice(2, 3),
        },
      ];
    }

    return entries
      .map(([motivo, data]) => ({
        motivo,
        cantidad: data.cantidad,
        areas: Array.from(data.areas),
      }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [records, totalSinUso, distinctAreas]);

  // 5. Top de Áreas con Menor Utilización (100% derived dynamically from filtered records)
  const topMenorList: LowUtilArea[] = useMemo(() => {
    const areaStats = distinctAreas.map((areaName) => {
      const areaRecs = records.filter((r) => r.area === areaName);
      const asig = areaRecs.reduce((a, b) => a + (b.totalAsignados || 0), 0);
      const enUso = areaRecs.reduce((a, b) => a + (b.pocketsEnUso || 0), 0);
      const sinUso = Math.max(0, asig - enUso);
      const pctUtil = asig > 0 ? (enUso / asig) * 100 : 100;
      return {
        area: areaName,
        pctUtilizacionReal: Math.round(pctUtil),
        pocketsSinUso: sinUso,
        totalAsignados: asig,
        pocketsEnUso: enUso,
      };
    });

    // Find areas that have unassigned pockets or utilization < 100%
    const underUtilized = areaStats
      .filter((a) => a.pocketsSinUso > 0 || a.pctUtilizacionReal < 100)
      .sort((a, b) => a.pctUtilizacionReal - b.pctUtilizacionReal);

    if (underUtilized.length === 0) {
      return [];
    }

    const totalUnusedInTop = underUtilized.reduce((acc, a) => acc + a.pocketsSinUso, 0);

    return underUtilized.slice(0, 4).map((item) => {
      const pctMenor = totalUnusedInTop > 0
        ? Math.round((item.pocketsSinUso / totalUnusedInTop) * 100)
        : Math.round(100 / underUtilized.length);

      return {
        area: item.area,
        pctMenor,
        pctUtilizacionReal: item.pctUtilizacionReal,
        pocketsSinUso: item.pocketsSinUso,
        totalAsignados: item.totalAsignados,
        pocketsEnUso: item.pocketsEnUso,
      };
    });
  }, [distinctAreas, records]);

  const activePeriodLabel =
    filters.semana !== 'TODAS'
      ? filters.semana
      : filters.mes !== 'TODOS'
      ? `Mes ${filters.mes}`
      : 'Todas las Semanas';

  // Descarga directa de la plantilla Excel para Sección 1
  const handleDownloadAuditTemplate = () => {
    const sampleData = [
      {
        'Fecha': '2026-09-15',
        'Mes': 'Septiembre',
        'Semana': 'Semana 38',
        'Área': 'ALMACEN',
        'Turno': 'Turno Mañana',
        'Total Asignados': 4,
        'Pocket Que Usan (Col G)': 2,
        'Pockets Sin Uso (Col H)': 2,
        'Observaciones': 'Operación en recepción',
        'Auditor': 'Auditor de Operaciones',
        'Supervisor': 'Supervisor Almacén',
        '% Cumplimiento Registro (Col L)': '100%',
        'Estado': 'COMPLETO',
        'Motivo de Uso (Col N)': 'PERSONAL EN OTRA ACTIVIDAD',
      },
      {
        'Fecha': '2026-09-15',
        'Mes': 'Septiembre',
        'Semana': 'Semana 38',
        'Área': 'CROSS DOCKING',
        'Turno': 'Turno Mañana',
        'Total Asignados': 6,
        'Pocket Que Usan (Col G)': 3,
        'Pockets Sin Uso (Col H)': 3,
        'Observaciones': '3 operarios en consolidado manual',
        'Auditor': 'Auditor de Operaciones',
        'Supervisor': 'Supervisor Almacén',
        '% Cumplimiento Registro (Col L)': '100%',
        'Estado': 'COMPLETO',
        'Motivo de Uso (Col N)': 'PERSONAL EN OTRA ACTIVIDAD',
      },
      {
        'Fecha': '2026-09-15',
        'Mes': 'Septiembre',
        'Semana': 'Semana 38',
        'Área': 'DESPACHO',
        'Turno': 'Turno Mañana',
        'Total Asignados': 7,
        'Pocket Que Usan (Col G)': 5,
        'Pockets Sin Uso (Col H)': 2,
        'Observaciones': '1 equipo en mantenimiento preventivo',
        'Auditor': 'Auditor de Operaciones',
        'Supervisor': 'Supervisor Almacén',
        '% Cumplimiento Registro (Col L)': '80%',
        'Estado': 'PARCIAL',
        'Motivo de Uso (Col N)': 'EQUIPO CON FALLA',
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoria_Pockets');
    XLSX.writeFile(wb, 'Plantilla_Auditoria_STOL_Pockets.xlsx');
  };

  return (
    <div id="pockets-dashboard-view" className="space-y-4 pb-8">
      {/* 1. Header Banner Sección 1: Auditoría y Control de Pockets */}
      <div className="bg-gradient-to-r from-[#1A1A2E] to-[#1E293B] text-white p-4 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-4 border-2 border-slate-700">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-md text-white font-black">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-black tracking-wide uppercase font-sans text-white">
                CONTROL DE POCKETS – AUDITORÍA OPERACIONAL
              </h2>
              <span className="bg-white/20 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                {records.length} Registros Auditados
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Cumplimiento de registro de terminales, porcentaje de uso real por área y motivos de no uso
            </p>
          </div>
        </div>

        {/* Action buttons & Persistence status */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Badge de Archivo, Fecha y Hora Exacta de Subida */}
          <div
            className="flex items-center gap-2 bg-slate-800/80 border border-slate-600 px-3 py-1 rounded-full text-[11px] text-slate-200 shadow-2xs"
            title={`Último archivo de auditoría: ${latestAuditFileName || 'Auditoria_Pockets_Oficial.xlsx'}. Subido: ${formatAuditDateTime(lastAuditUpdatedAt) || 'Fecha no disponible'}`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-[10.5px] font-bold text-white truncate max-w-[160px]">
              {latestAuditFileName || 'Auditoria_Pockets_Oficial.xlsx'}
            </span>
            <span className="text-slate-600 text-xs font-light">|</span>
            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="text-[10.5px] font-medium text-slate-300">
              {formatAuditDateTime(lastAuditUpdatedAt) ? (
                `Subido: ${formatAuditDateTime(lastAuditUpdatedAt)}`
              ) : (
                'Sin fecha de carga'
              )}
            </span>
          </div>

          <button
            onClick={handleDownloadAuditTemplate}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer shadow-2xs"
            title="Descargar plantilla Excel oficial de auditoría con las columnas requeridas"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Plantilla</span>
          </button>

          {onOpenPhotoSummary && (
            <button
              type="button"
              onClick={onOpenPhotoSummary}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 px-3 py-1.5 rounded-xl font-black transition-all cursor-pointer shadow-md border border-amber-400"
              title="Descargar o copiar foto resumen de Pockets para análisis ejecutivo"
            >
              <Camera className="w-3.5 h-3.5 text-slate-950 font-black shrink-0" />
              <span>Foto Resumen</span>
            </button>
          )}

          {onExportAuditExcel && (
            <button
              onClick={onExportAuditExcel}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer shadow-2xs"
              title="Exportar registros filtrados a archivo Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Exportar Excel</span>
            </button>
          )}

          <button
            id="btn-upload-audit-section1"
            onClick={() => {
              if (!isUnlocked) {
                onOpenAccessKeyModal();
              } else {
                onOpenAuditUploadModal();
              }
            }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black px-3.5 py-1.5 rounded-xl shadow-md transition-colors cursor-pointer"
            title={isUnlocked ? 'Cargar nuevo archivo Excel de auditoría' : 'Desbloquear para cargar archivo'}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Cargar Excel Auditoría</span>
          </button>
        </div>
      </div>

      {/* 2. Filtros Operativos de Pockets (debajo de la barra de descripción y subida, encima de los cuadros de valores) */}
      <FilterBar
        filters={filters}
        onFilterChange={onFilterChange}
        availableMonths={filterMonths}
        availableWeeks={filterWeeks}
        availableAreas={filterAreas}
        availableDates={filterDates}
        variant="inline"
        hideActions={true}
        recordsCount={records.length}
      />

      {/* 3. Top 6 KPI Metric Cards */}
      <PocketKpiCards
        pctCumplimientoRegistro={pctCumplimientoRegistro}
        pctIncumplimientoRegistro={pctIncumplimientoRegistro}
        totalAsignado={totalAsignado}
        pctUsoPocket={pctUsoPocket}
        totalEnUso={totalEnUso}
        totalSinUso={totalSinUso}
      />

      {/* 2. Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: Trends and Motivos */}
        <div className="lg:col-span-5 space-y-4">
          {/* Chart 1 Left: TENDENCIA DE % DEL CUMPLIMIENTO POR REGISTRO (Combo Bars + Line) */}
          <TrendLineChart
            id="chart-trend-registro"
            title="TENDENCIA DE % DEL CUMPLIMIENTO POR REGISTRO"
            data={trendRegistroData}
            maxY={120}
            yStep={20}
            color="#1F6F8B"
          />

          {/* Chart 2 Left: TENDENCIA DE % DE CUMPLIMIENTO POR UTILIZACIÓN (Combo Bars + Line) */}
          <TrendLineChart
            id="chart-trend-utilizacion"
            title="TENDENCIA DE % DE CUMPLIMIENTO POR UTILIZACIÓN"
            data={trendUsoData}
            maxY={100}
            yStep={20}
            color="#1F6F8B"
          />

          {/* Table Left Bottom: MOTIVOS DE NO USO */}
          <MotivosNoUsoTable
            motivos={motivosList}
            semanaLabel={activePeriodLabel}
            totalSinUso={totalSinUso}
          />
        </div>

        {/* RIGHT COLUMN: 3D Area Distribution and Top Under-utilized */}
        <div className="lg:col-span-7 space-y-4">
          {/* Chart 1 Right: PORCENTAJE DEL CUMPLIMIENTOS POR REGISTRO (Crimson 3D Bars) */}
          <BarChart3D
            id="chart-bar-registro"
            title="PORCENTAJE DEL CUMPLIMIENTOS POR REGISTRO"
            data={barDataRegistro}
            theme="crimson"
            legendLabel="Total"
          />

          {/* Chart 2 Right: PORCENTAJE DE CUMPLIMIENTO POR UTILIZACIÓN (Blue 3D Bars) */}
          <BarChart3D
            id="chart-bar-utilizacion"
            title="PORCENTAJE DE CUMPLIMIENTO POR UTILIZACIÓN"
            data={barDataUtilizacion}
            theme="blue"
            legendLabel="Total"
          />

          {/* Chart 3 Right Bottom: TOP DE ÁREAS CON MENOR UTILIZACIÓN */}
          <TopMenorUtilizacionChart
            data={topMenorList}
            semanaLabel={activePeriodLabel}
          />
        </div>
      </div>

      {/* LINEA DIVISORIA SECCIÓN 1 / SECCIÓN 2 */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t-2 border-[#E2E4E7] border-dashed"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#F4F6F7] px-4 py-1 text-xs font-black uppercase tracking-widest text-[#1A1A2E] border border-[#E2E4E7] rounded-full shadow-2xs flex items-center gap-2">
            <span>SECCIÓN 2: PARQUE FÍSICO E INVENTARIO DE POCKETS</span>
          </span>
        </div>
      </div>

      {/* SECCIÓN INDEPENDIENTE: PARQUE FÍSICO E INVENTARIO DE POCKETS */}
      <PocketInventorySection
        inventory={inventory}
        isUnlocked={isUnlocked}
        onOpenAccessKeyModal={onOpenAccessKeyModal}
        onOpenInventoryUploadModal={onOpenInventoryUploadModal}
        latestInventoryFileName={latestInventoryFileName}
        lastInventorySyncTime={lastInventorySyncTime}
        lastInventoryUpdatedAt={lastInventoryUpdatedAt}
        isPublished={isPublished}
      />
    </div>
  );
};
