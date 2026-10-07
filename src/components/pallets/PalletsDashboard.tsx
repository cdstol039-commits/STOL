import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  PackageCheck,
  FileSpreadsheet,
  Upload,
  Download,
  Terminal,
  Clock,
  SlidersHorizontal,
  X,
  Table as TableIcon,
  PlusCircle,
  BarChart2,
  Camera,
} from 'lucide-react';
import {
  PalletObservation,
  PalletStatus,
  normalizeSemana,
  normalizeMes,
  formatToDDMMYYYY,
} from '../../types/pallets';
import { formatAuditDateTime } from '../../utils/persistence';
import { PalletKpiCardsVivid } from './PalletKpiCardsVivid';
import { PalletFilterBar, PalletFilterState } from './PalletFilterBar';
import { ChartStatusGeneral } from './ChartStatusGeneral';
import { ChartPalletsRegularizadosEvidencia } from './ChartPalletsRegularizadosEvidencia';
import { ChartPalletsPendientesGestion } from './ChartPalletsPendientesGestion';
import { ChartPalletsObservadosPorArea } from './ChartPalletsObservadosPorArea';
import { PalletRecordsTable } from './PalletRecordsTable';
import { PalletUploadModal } from './PalletUploadModal';
import { PalletExtractionModal } from './PalletExtractionModal';
import { PeriodSelection } from '../../types/period';

interface PalletsDashboardProps {
  allRecords: PalletObservation[];
  isUnlocked: boolean;
  onOpenAccessKeyModal: () => void;
  onUpdateRecords: (records: PalletObservation[], fileName?: string) => void;
  onOpenPhotoSummary?: () => void;
  latestFileName?: string | null;
  lastUpdatedAt?: string | null;
  analysisPeriod: PeriodSelection;
}

export const PalletsDashboard: React.FC<PalletsDashboardProps> = ({
  allRecords,
  isUnlocked,
  onOpenAccessKeyModal,
  onUpdateRecords,
  onOpenPhotoSummary,
  latestFileName = 'CONTROL_PALLETS_OBSERVADOS.xlsx',
  lastUpdatedAt,
  analysisPeriod,
}) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isExtractionModalOpen, setIsExtractionModalOpen] = useState(false);
  const [showTable, setShowTable] = useState(false);

  // Independent Filter State strictly tailored to Pallets Data!
  const [palletFilters, setPalletFilters] = useState<PalletFilterState>({
    mes: 'TODOS',
    meses: [],
    semana: 'TODAS',
    semanas: [],
    fecha: 'TODAS',
    fechas: [],
    area: 'TODAS',
    areas: [],
    estado: 'TODOS',
    searchQuery: '',
  });

  useEffect(() => {
    setPalletFilters((current) => ({
      ...current,
      mes: 'TODOS',
      meses: [],
      semana: 'TODAS',
      semanas: [],
      fecha: 'TODAS',
      fechas: [],
    }));
  }, [analysisPeriod]);

  // Apply Independent Filtering strictly tied to the charts and table
  const filteredRecords = useMemo(() => {
    return allRecords.filter((r) => {
      // 1. Fecha Reporte (Normalizado a DD/MM/YYYY)
      const selectedFechas = (palletFilters.fechas && palletFilters.fechas.length > 0)
        ? palletFilters.fechas.filter(f => f && f !== 'TODAS')
        : (palletFilters.fecha && palletFilters.fecha !== 'TODAS' ? [palletFilters.fecha] : []);
      if (selectedFechas.length > 0) {
        const normRFecha = formatToDDMMYYYY(r.fecha).trim();
        const matchesFecha = selectedFechas.some(f => {
          const normF = formatToDDMMYYYY(f).trim();
          return normRFecha === normF || r.fecha.trim() === f.trim();
        });
        if (!matchesFecha) return false;
      }

      // 2. Mes (Normalizado)
      const selectedMeses = (palletFilters.meses && palletFilters.meses.length > 0)
        ? palletFilters.meses.filter(m => m && m !== 'TODOS').map(normalizeMes)
        : (palletFilters.mes && palletFilters.mes !== 'TODOS' ? [normalizeMes(palletFilters.mes)] : []);
      if (selectedMeses.length > 0) {
        if (!selectedMeses.includes(normalizeMes(r.mes))) {
          return false;
        }
      }

      // 3. Semana (Normalizado)
      const selectedSemanas = (palletFilters.semanas && palletFilters.semanas.length > 0)
        ? palletFilters.semanas.filter(s => s && s !== 'TODAS').map(normalizeSemana)
        : (palletFilters.semana && palletFilters.semana !== 'TODAS' ? [normalizeSemana(palletFilters.semana)] : []);
      if (selectedSemanas.length > 0) {
        if (!selectedSemanas.includes(normalizeSemana(r.semana))) {
          return false;
        }
      }

      // 4. Area (Normalizado)
      const selectedAreas = (palletFilters.areas && palletFilters.areas.length > 0)
        ? palletFilters.areas.filter(a => a && a !== 'TODAS').map(a => a.toUpperCase().trim())
        : (palletFilters.area && palletFilters.area !== 'TODAS' ? [palletFilters.area.toUpperCase().trim()] : []);
      if (selectedAreas.length > 0) {
        const rArea = (r.area || '').toUpperCase().trim();
        if (!selectedAreas.includes(rArea)) {
          return false;
        }
      }

      // 5. Estado
      if (palletFilters.estado === 'PENDIENTE' && r.estado !== 'PENDIENTE') {
        return false;
      }
      if (palletFilters.estado === 'REGULARIZADA' && r.estado === 'PENDIENTE') {
        return false;
      }

      // 6. Search
      if (palletFilters.searchQuery.trim()) {
        const q = palletFilters.searchQuery.toLowerCase().trim();
        const match =
          r.palletId.toLowerCase().includes(q) ||
          r.area.toLowerCase().includes(q) ||
          r.observacion.toLowerCase().includes(q) ||
          (r.subMotivo && r.subMotivo.toLowerCase().includes(q)) ||
          r.responsable.toLowerCase().includes(q) ||
          (r.responsablePendiente && r.responsablePendiente.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [allRecords, palletFilters]);

  // KPI Calculations
  const totalPallets = filteredRecords.length;
  const regularizadosCount = filteredRecords.filter((r) => r.estado !== 'PENDIENTE').length;
  const regularizadosPct = totalPallets > 0 ? (regularizadosCount / totalPallets) * 100 : 0;

  const pendientesCount = filteredRecords.filter((r) => r.estado === 'PENDIENTE').length;
  const pendientesPct = totalPallets > 0 ? (pendientesCount / totalPallets) * 100 : 0;

  const leadTimePromedio =
    totalPallets > 0
      ? filteredRecords.reduce((acc, r) => acc + (r.leadTimeDias || 0), 0) / totalPallets
      : 0;

  const leadTime2DiasCount = filteredRecords.filter(
    (r) => r.estado === 'PENDIENTE' && (r.leadTimeDias || 0) >= 2
  ).length;

  const isFiltered =
    palletFilters.mes !== 'TODOS' ||
    palletFilters.semana !== 'TODAS' ||
    palletFilters.fecha !== 'TODAS' ||
    palletFilters.area !== 'TODAS' ||
    palletFilters.estado !== 'TODOS' ||
    palletFilters.searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setPalletFilters({
      mes: 'TODOS',
      semana: 'TODAS',
      fecha: 'TODAS',
      area: 'TODAS',
      estado: 'TODOS',
      searchQuery: '',
    });
  };

  // Handle direct status change in row
  const handleUpdateRecordStatus = (id: string, newStatus: PalletStatus) => {
    const updated = allRecords.map((r) => {
      if (r.id === id) {
        return {
          ...r,
          estado: newStatus,
          fechaRegularizacion:
            newStatus !== 'PENDIENTE'
              ? new Date().toLocaleDateString('es-ES')
              : null,
        };
      }
      return r;
    });
    onUpdateRecords(updated, latestFileName || 'CONTROL_PALLETS_OBSERVADOS.xlsx');
  };

  // Full dataset download (Exact 13 columns from user's Excel)
  const handleDownloadFullExcel = () => {
    const rows = filteredRecords.map((r) => ({
      'FECHA REPORTE': formatToDDMMYYYY(r.fecha),
      'MES': r.mes,
      'SEMANA': r.semana,
      'RESPONSALE': r.responsable,
      'CARGO': r.cargo || 'SUPERVISOR',
      'AREA': r.area,
      'N°PALLET': r.palletId,
      'OBSERVACION': r.observacion,
      'SUB-MOTIVO': r.subMotivo || '-',
      'FECHA LEV.OBS': r.fechaRegularizacion ? formatToDDMMYYYY(r.fechaRegularizacion) : '-',
      'ESTATUS': r.estado === 'PENDIENTE' ? 'PENDIENTE' : 'REGULARIZADA',
      'lead time': r.leadTimeDias,
      'RESPONSABLE PENDIENTE': r.responsablePendiente || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pallets_Observados');
    XLSX.writeFile(wb, `${latestFileName || 'CONTROL_PALLETS_OBSERVADOS'}_Export.xlsx`);
  };

  return (
    <div id="pallets-dashboard-view" className="space-y-4 pb-8">
      {/* 1. Top Header Banner with Live Actions */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white p-5 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-4 border-2 border-[#334155]">
        <div className="flex items-center gap-3.5">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-2xl shadow-md border border-white/20">
            <PackageCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg md:text-xl font-black tracking-wide uppercase font-sans text-white">
                CONTROL DE PALLETS – SEGUIMIENTO Y REGULARIZACIÓN
              </h2>
              <span className="bg-emerald-500 text-white text-xs font-black px-3 py-0.5 rounded-full shadow-xs">
                {totalPallets} Activos
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              Monitoreo ejecutivo de pallets observados, lead time en piso y motivos de regularización
            </p>
          </div>
        </div>

        {/* Action Row */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* File Status Badge */}
          <div
            className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-xl text-white shadow-2xs"
            title={`Fuente de datos: ${latestFileName || 'CONTROL_PALLETS_OBSERVADOS.xlsx'}`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[11px] font-black truncate max-w-[190px]">
              {latestFileName || 'CONTROL_PALLETS_OBSERVADOS.xlsx'}
            </span>
            <span className="text-white/30 text-xs">|</span>
            <Clock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="text-[10.5px] font-bold text-slate-300">
              {formatAuditDateTime(lastUpdatedAt) ? `Actualizado: ${formatAuditDateTime(lastUpdatedAt)}` : 'Data oficial'}
            </span>
          </div>

          {/* Button: Comandos de extracción */}
          <button
            onClick={() => setIsExtractionModalOpen(true)}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer shadow-xs"
            title="Ver script de extracción Python, comandos Shell y SQL"
          >
            <Terminal className="w-4 h-4 text-blue-400" />
            <span>Comandos Extracción</span>
          </button>

          {/* Button: Descargar Excel */}
          <button
            onClick={handleDownloadFullExcel}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer shadow-xs"
            title="Descargar matriz en Excel"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Descargar Excel</span>
          </button>

          {/* Button: Foto Resumen */}
          {onOpenPhotoSummary && (
            <button
              type="button"
              onClick={onOpenPhotoSummary}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 px-3.5 py-1.5 rounded-xl font-black transition-all cursor-pointer shadow-md border border-amber-400"
              title="Descargar o copiar foto resumen de Pallets para análisis ejecutivo"
            >
              <Camera className="w-4 h-4 text-slate-950 font-black shrink-0" />
              <span>Foto Resumen</span>
            </button>
          )}

          {/* Button: Cargar / Actualizar Data */}
          <button
            onClick={() => {
              if (!isUnlocked) {
                onOpenAccessKeyModal();
              } else {
                setIsUploadModalOpen(true);
              }
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-[#0F172A] font-black px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer transform hover:scale-102"
            title={isUnlocked ? 'Subir nuevo Excel para actualizar los datos' : 'Desbloquear sesión para cargar'}
          >
            <Upload className="w-4 h-4" />
            <span>Cargar / Actualizar Data</span>
          </button>
        </div>
      </div>

      {/* 2. Independent Pallet Filter Bar */}
      <PalletFilterBar
        filters={palletFilters}
        onFilterChange={setPalletFilters}
        allRecords={allRecords}
        filteredCount={totalPallets}
        pendingCount={pendientesCount}
        regularizedCount={regularizadosCount}
      />

      {/* 3. Vivid High-Contrast Metric Cards */}
      <PalletKpiCardsVivid
        totalPallets={totalPallets}
        regularizadosCount={regularizadosCount}
        regularizadosPct={regularizadosPct}
        pendientesCount={pendientesCount}
        pendientesPct={pendientesPct}
        leadTimePromedio={leadTimePromedio}
        leadTime2DiasCount={leadTime2DiasCount}
      />

      {/* Dynamic Active Filters Synchronization Bar */}
      {isFiltered && (
        <div className="bg-gradient-to-r from-slate-900 via-[#1E293B] to-slate-900 text-white px-4 py-2.5 rounded-xl border border-blue-400/40 shadow-sm flex flex-wrap items-center justify-between gap-2.5 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-amber-300 flex items-center gap-1.5 uppercase text-[11px] tracking-wide">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              Filtros activos:
            </span>
            {palletFilters.mes !== 'TODOS' && (
              <span className="bg-white/15 px-2 py-0.5 rounded-md font-bold text-[10.5px] flex items-center gap-1">
                Mes: <strong>{palletFilters.mes}</strong>
                <button
                  onClick={() => setPalletFilters({ ...palletFilters, mes: 'TODOS' })}
                  className="ml-1 text-slate-300 hover:text-rose-300 cursor-pointer font-black"
                >
                  ×
                </button>
              </span>
            )}
            {palletFilters.semana !== 'TODAS' && (
              <span className="bg-white/15 px-2 py-0.5 rounded-md font-bold text-[10.5px] flex items-center gap-1">
                Semana: <strong>{palletFilters.semana}</strong>
                <button
                  onClick={() => setPalletFilters({ ...palletFilters, semana: 'TODAS' })}
                  className="ml-1 text-slate-300 hover:text-rose-300 cursor-pointer font-black"
                >
                  ×
                </button>
              </span>
            )}
            {palletFilters.fecha !== 'TODAS' && (
              <span className="bg-white/15 px-2 py-0.5 rounded-md font-bold text-[10.5px] flex items-center gap-1">
                Fecha Reporte: <strong>{palletFilters.fecha}</strong>
                <button
                  onClick={() => setPalletFilters({ ...palletFilters, fecha: 'TODAS' })}
                  className="ml-1 text-slate-300 hover:text-rose-300 cursor-pointer font-black"
                >
                  ×
                </button>
              </span>
            )}
            {palletFilters.area !== 'TODAS' && (
              <span className="bg-white/15 px-2 py-0.5 rounded-md font-bold text-[10.5px] flex items-center gap-1">
                Área: <strong>{palletFilters.area}</strong>
                <button
                  onClick={() => setPalletFilters({ ...palletFilters, area: 'TODAS' })}
                  className="ml-1 text-slate-300 hover:text-rose-300 cursor-pointer font-black"
                >
                  ×
                </button>
              </span>
            )}
            {palletFilters.estado !== 'TODOS' && (
              <span className="bg-white/15 px-2 py-0.5 rounded-md font-bold text-[10.5px] flex items-center gap-1">
                Estatus: <strong>{palletFilters.estado}</strong>
                <button
                  onClick={() => setPalletFilters({ ...palletFilters, estado: 'TODOS' })}
                  className="ml-1 text-slate-300 hover:text-rose-300 cursor-pointer font-black"
                >
                  ×
                </button>
              </span>
            )}
            {palletFilters.searchQuery.trim() && (
              <span className="bg-white/15 px-2 py-0.5 rounded-md font-bold text-[10.5px] flex items-center gap-1">
                Búsqueda: <em>"{palletFilters.searchQuery}"</em>
                <button
                  onClick={() => setPalletFilters({ ...palletFilters, searchQuery: '' })}
                  className="ml-1 text-slate-300 hover:text-rose-300 cursor-pointer font-black"
                >
                  ×
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-[11px] text-slate-300 font-bold">
              Mostrando <strong className="text-white font-black">{totalPallets}</strong> de {allRecords.length} pallets
            </span>
            <button
              onClick={handleResetFilters}
              className="bg-white/15 hover:bg-white/25 text-white font-bold px-2 py-1 rounded-md text-[10.5px] transition-all cursor-pointer flex items-center gap-1"
            >
              <X className="w-3 h-3 text-rose-400" />
              <span>Limpiar filtros</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Primer Gráfico: STATUS GENERAL (Ancho completo, barras verticales segmentadas, dinámico por mes/semana/días) */}
      <ChartStatusGeneral
        allRecords={allRecords}
        filteredRecords={filteredRecords}
        filters={palletFilters}
        onFilterChange={setPalletFilters}
      />

      {/* 5. Segundo Gráfico: PALLETS REGULARIZADOS, EVIDENCIA COMPARTIDA Y MOTIVOS */}
      <ChartPalletsRegularizadosEvidencia
        allRecords={allRecords}
        filteredRecords={filteredRecords}
        filters={palletFilters}
        onFilterChange={setPalletFilters}
      />

      {/* 6. Tercer Gráfico: GESTIÓN DE PALLETS PENDIENTES / OBSERVADOS */}
      <ChartPalletsPendientesGestion
        allRecords={allRecords}
        filteredRecords={filteredRecords}
        filters={palletFilters}
        onFilterChange={setPalletFilters}
      />

      {/* 7. Cuarto Gráfico: PALLETS OBSERVADOS POR ÁREA Y FECHA (Con filtro de fecha independiente y desglose de pendientes) */}
      <ChartPalletsObservadosPorArea
        allRecords={allRecords}
      />

      {/* Toggleable table view to inspect data if desired */}
      <div className="pt-1 flex justify-center">
        <button
          onClick={() => setShowTable(!showTable)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-all cursor-pointer shadow-xs"
        >
          <TableIcon className="w-4 h-4 text-slate-500" />
          <span>{showTable ? 'Ocultar' : 'Ver'} Matriz de Registros de Pallets ({filteredRecords.length})</span>
        </button>
      </div>

      {/* 5. Optional Data Matrix (hidden by default) */}
      {showTable && (
        <div className="animate-in fade-in">
          <PalletRecordsTable
            records={filteredRecords}
            isUnlocked={isUnlocked}
            onUpdateStatus={handleUpdateRecordStatus}
            onOpenAccessKeyModal={onOpenAccessKeyModal}
          />
        </div>
      )}

      {/* 6. Modals */}
      <PalletUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={(newRecords, fileName) => {
          onUpdateRecords(newRecords, fileName);
        }}
      />

      <PalletExtractionModal
        isOpen={isExtractionModalOpen}
        onClose={() => setIsExtractionModalOpen(false)}
      />
    </div>
  );
};
