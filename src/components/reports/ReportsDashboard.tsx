import React from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Download,
  BarChart2,
  Smartphone,
  PackageCheck,
  FileText,
  GraduationCap,
  Sparkles,
  Layers,
  CheckCircle2,
  Camera,
} from 'lucide-react';
import { PocketAuditRecord, MemoRecord, InductionRecord, FilterState } from '../../types';
import { PalletObservation, formatToDDMMYYYY } from '../../types/pallets';
import { formatDisplayDate } from '../../utils/normalizer';

interface ReportsDashboardProps {
  pocketRecords: PocketAuditRecord[];
  palletRecords?: PalletObservation[];
  memos: MemoRecord[];
  inductions: InductionRecord[];
  filters: FilterState;
  onOpenPhotoSummary?: () => void;
}

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({
  pocketRecords,
  palletRecords = [],
  memos,
  inductions,
  filters,
  onOpenPhotoSummary,
}) => {
  // Export consolidated pockets report
  const exportPocketsExcel = () => {
    const data = pocketRecords.map((r) => ({
      'ID Registro': r.id,
      'Fecha': formatDisplayDate(r.fecha),
      'Mes': r.mes,
      'Semana': r.semana,
      'Área': r.area,
      'Total Pockets Asignados': r.totalAsignados,
      'Pockets Registrados': r.pocketsRegistrados,
      '% Cumplimiento Registro': `${((r.pocketsRegistrados / (r.totalAsignados || 1)) * 100).toFixed(1)}%`,
      'Pockets En Uso': r.pocketsEnUso,
      '% Cumplimiento Utilización': `${((r.pocketsEnUso / (r.totalAsignados || 1)) * 100).toFixed(1)}%`,
      'Pockets Sin Uso': r.pocketsSinUso,
      'Motivo No Uso': r.motivoNoUso || 'N/A',
      'Auditor': r.auditor,
      'Turno': r.turno || 'Turno Mañana',
      'Observaciones': r.observaciones || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte_Pockets');
    XLSX.writeFile(wb, `Reporte_Auditoria_Pockets_${filters.semana}_${filters.mes}.xlsx`);
  };

  // Export pallets report
  const exportPalletsExcel = () => {
    const data = palletRecords.map((p) => ({
      'N° PALLET (LPN)': p.palletId,
      'FECHA REGISTRO': formatToDDMMYYYY(p.fecha),
      'MES': p.mes,
      'SEMANA': p.semana,
      'AREA': p.area,
      'RESPONSABLE (LEVANTA OBS)': p.responsable,
      'CARGO': p.cargo || 'SUPERVISOR',
      'OBSERVACION': p.observacion,
      'SUB-MOTIVO': p.subMotivo || '',
      'ESTATUS': p.estado,
      'FECHA REGULARIZADA': p.fechaRegularizacion ? formatToDDMMYYYY(p.fechaRegularizacion) : '',
      'LEAD TIME (DIAS)': p.leadTimeDias,
      'RESPONSABLE PENDIENTE': p.responsablePendiente || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Control_Pallets');
    XLSX.writeFile(wb, `Reporte_Control_Pallets_${filters.semana}_${filters.mes}.xlsx`);
  };

  // Export memos report
  const exportMemosExcel = () => {
    const data = memos.map((m) => ({
      'Código': m.codigo,
      'Fecha': formatDisplayDate(m.fecha),
      'Mes': m.mes,
      'Semana': m.semana,
      'Área': m.area,
      'Tipo de Hallazgo': m.tipo,
      'Descripción': m.descripcion,
      'Criticidad': m.criticidad,
      'Estado': m.estado,
      'Supervisor Responsable': m.responsable,
      'Fecha Compromiso': formatDisplayDate(m.fechaCompromiso),
      'Auditor': m.auditor,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte_Memos');
    XLSX.writeFile(wb, `Reporte_Auditoria_Memos_${filters.mes}.xlsx`);
  };

  // Export inductions report
  const exportInductionsExcel = () => {
    const data = inductions.map((i) => ({
      'Fecha': formatDisplayDate(i.fecha),
      'Mes': i.mes,
      'Semana': i.semana,
      'Área': i.area,
      'Colaborador': i.colaborador,
      'DNI': i.dni,
      'Módulo de Inducción': i.tipoInduccion,
      'Calificación': `${i.calificacion} pts`,
      'Estado': i.estado,
      'Auditor': i.auditor,
      'Observaciones': i.observaciones || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte_Inducciones');
    XLSX.writeFile(wb, `Reporte_Induccion_Campo_${filters.mes}.xlsx`);
  };

  // Export complete consolidated workbook (All sheets)
  const exportAllMasterWorkbook = () => {
    const wb = XLSX.utils.book_new();

    const dataPockets = pocketRecords.map((r) => ({
      'Semana': r.semana,
      'Mes': r.mes,
      'Fecha': formatDisplayDate(r.fecha),
      'Área': r.area,
      'Asignados': r.totalAsignados,
      'En Uso': r.pocketsEnUso,
      'Sin Uso': r.pocketsSinUso,
      '% Cumplimiento': `${((r.pocketsRegistrados / (r.totalAsignados || 1)) * 100).toFixed(1)}%`,
      'Motivo No Uso': r.motivoNoUso || 'N/A',
      'Auditor': r.auditor,
    }));
    const wsPockets = XLSX.utils.json_to_sheet(dataPockets);
    XLSX.utils.book_append_sheet(wb, wsPockets, 'Pockets');

    if (palletRecords.length > 0) {
      const dataPallets = palletRecords.map((p) => ({
        'N° Pallet': p.palletId,
        'Fecha': formatToDDMMYYYY(p.fecha),
        'Semana': p.semana,
        'Área': p.area,
        'Estatus': p.estado,
        'Lead Time': p.leadTimeDias,
        'Responsable': p.responsable,
        'Área Omisa': p.responsablePendiente || '',
        'Observación': p.observacion,
      }));
      const wsPallets = XLSX.utils.json_to_sheet(dataPallets);
      XLSX.utils.book_append_sheet(wb, wsPallets, 'Pallets');
    }

    const dataMemos = memos.map((m) => ({
      'Código': m.codigo,
      'Fecha': formatDisplayDate(m.fecha),
      'Área': m.area,
      'Tipo': m.tipo,
      'Criticidad': m.criticidad,
      'Estado': m.estado,
      'Responsable': m.responsable,
      'Fecha Compromiso': formatDisplayDate(m.fechaCompromiso),
    }));
    const wsMemos = XLSX.utils.json_to_sheet(dataMemos);
    XLSX.utils.book_append_sheet(wb, wsMemos, 'Memos');

    const dataInductions = inductions.map((i) => ({
      'Fecha': formatDisplayDate(i.fecha),
      'Colaborador': i.colaborador,
      'DNI': i.dni,
      'Área': i.area,
      'Módulo': i.tipoInduccion,
      'Calificación': i.calificacion,
      'Estado': i.estado,
    }));
    const wsInd = XLSX.utils.json_to_sheet(dataInductions);
    XLSX.utils.book_append_sheet(wb, wsInd, 'Inducciones');

    XLSX.writeFile(wb, `CUADERNO_MAESTRO_AUDITORIA_STOL_${filters.mes}_${filters.semana}.xlsx`);
  };

  return (
    <div className="space-y-4 pb-8">
      {/* 1. Executive Presentation Top Banner */}
      <div className="bg-gradient-to-r from-[#1A1A2E] to-[#1E293B] text-white p-4 rounded-2xl shadow-md border-2 border-slate-700 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2.5 rounded-xl shadow-md text-white font-black">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-black tracking-wide uppercase font-sans text-white">
                CENTRO DE REPORTES Y DESCARGAS OFICIALES
              </h2>
              <span className="bg-white/20 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                Exportación Directa Excel
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Consolidación de auditorías operativas listas para comités directivos y jefaturas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenPhotoSummary && (
            <button
              onClick={onOpenPhotoSummary}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer text-xs border border-amber-400"
              title="Descargar Foto Resumen Integral para comités directivos"
            >
              <Camera className="w-4 h-4 text-slate-950 font-black" />
              <span>Descargar Foto Resumen Ejecutivo</span>
            </button>
          )}

          <button
            onClick={exportAllMasterWorkbook}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-black px-4 py-2.5 rounded-xl border border-white/20 shadow-md transition-all cursor-pointer text-xs"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Descargar Cuaderno Integral Completo (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* 2. Volume Snapshot for Presentations */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white border-2 border-blue-200 rounded-2xl p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-500">
              Registros Pockets
            </span>
            <div className="text-2xl font-black text-blue-700 tabular-nums">
              {pocketRecords.length}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
            <Smartphone className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border-2 border-emerald-200 rounded-2xl p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-500">
              Control de Pallets
            </span>
            <div className="text-2xl font-black text-emerald-700 tabular-nums">
              {palletRecords.length}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
            <PackageCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border-2 border-amber-200 rounded-2xl p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-500">
              Memos Emitidos
            </span>
            <div className="text-2xl font-black text-amber-700 tabular-nums">
              {memos.length}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border-2 border-teal-200 rounded-2xl p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-500">
              Inducciones
            </span>
            <div className="text-2xl font-black text-teal-700 tabular-nums">
              {inductions.length}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Pockets */}
        <div className="bg-white border-2 border-slate-300 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="bg-gradient-to-r from-[#1E40AF] to-[#1E3A8A] text-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black tracking-wider uppercase text-blue-200">
                Auditoría Terminales
              </span>
              <Smartphone className="w-5 h-5 text-blue-200" />
            </div>
            <h3 className="text-base font-black text-white mt-1">
              Reporte Control de Pockets
            </h3>
            <p className="text-[11px] text-blue-100 mt-0.5">
              Cumplimiento, porcentaje de uso, motivos de inactividad por área.
            </p>
          </div>
          <div className="p-4 space-y-3">
            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Registros disponibles:</span>
                <span className="font-bold text-slate-900">{pocketRecords.length} filas</span>
              </div>
              <div className="flex justify-between">
                <span>Filtro activo:</span>
                <span className="font-bold text-blue-700">{filters.semana} ({filters.mes})</span>
              </div>
            </div>
            <button
              onClick={exportPocketsExcel}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Reporte Pockets (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Card 2: Pallets */}
        <div className="bg-white border-2 border-slate-300 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="bg-gradient-to-r from-[#059669] to-[#047857] text-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black tracking-wider uppercase text-emerald-200">
                Seguimiento & Regularización
              </span>
              <PackageCheck className="w-5 h-5 text-emerald-200" />
            </div>
            <h3 className="text-base font-black text-white mt-1">
              Reporte Control de Pallets
            </h3>
            <p className="text-[11px] text-emerald-100 mt-0.5">
              Estado de regularizaciones, lead times, submotivos y áreas responsables.
            </p>
          </div>
          <div className="p-4 space-y-3">
            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Pallets registrados:</span>
                <span className="font-bold text-slate-900">{palletRecords.length} pallets</span>
              </div>
              <div className="flex justify-between">
                <span>Campos clave:</span>
                <span className="font-bold text-emerald-700">LPN, Submotivos, Lead Time</span>
              </div>
            </div>
            <button
              onClick={exportPalletsExcel}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Reporte Pallets (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Card 3: Memos */}
        <div className="bg-white border-2 border-slate-300 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="bg-gradient-to-r from-[#D97706] to-[#B45309] text-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black tracking-wider uppercase text-amber-200">
                Planes de Acción
              </span>
              <FileText className="w-5 h-5 text-amber-200" />
            </div>
            <h3 className="text-base font-black text-white mt-1">
              Reporte Memos de Auditoría
            </h3>
            <p className="text-[11px] text-amber-100 mt-0.5">
              No conformidades, criticidades, compromisos y supervisores asignados.
            </p>
          </div>
          <div className="p-4 space-y-3">
            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Total de memos:</span>
                <span className="font-bold text-slate-900">{memos.length} hallazgos</span>
              </div>
              <div className="flex justify-between">
                <span>Compromisos:</span>
                <span className="font-bold text-amber-700">Fechas de levantamiento</span>
              </div>
            </div>
            <button
              onClick={exportMemosExcel}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Reporte Memos (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Card 4: Inducción */}
        <div className="bg-white border-2 border-slate-300 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="bg-gradient-to-r from-[#0D9488] to-[#0F766E] text-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black tracking-wider uppercase text-teal-200">
                Capacitación de Campo
              </span>
              <GraduationCap className="w-5 h-5 text-teal-200" />
            </div>
            <h3 className="text-base font-black text-white mt-1">
              Reporte de Inducciones
            </h3>
            <p className="text-[11px] text-teal-100 mt-0.5">
              Padrón nominal de personal evaluado, módulos y notas obtenidas.
            </p>
          </div>
          <div className="p-4 space-y-3">
            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Personal auditado:</span>
                <span className="font-bold text-slate-900">{inductions.length} evaluaciones</span>
              </div>
              <div className="flex justify-between">
                <span>Estado:</span>
                <span className="font-bold text-teal-700">Aprobados vs Observados</span>
              </div>
            </div>
            <button
              onClick={exportInductionsExcel}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Inducciones (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Card 5: Cuaderno Maestro Integral */}
        <div className="md:col-span-2 bg-white border-2 border-slate-400 rounded-2xl overflow-hidden shadow-md flex flex-col justify-between">
          <div className="bg-gradient-to-r from-[#1A1A2E] via-[#0F172A] to-[#1E293B] text-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black tracking-wider uppercase text-amber-400">
                ★ Libro Completo Multi-Hoja
              </span>
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-base font-black text-white mt-1">
              Cuaderno Maestro Integral STOL
            </h3>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Genera un único archivo Excel con hojas separadas para Pockets, Pallets, Memos e Inducciones.
            </p>
          </div>
          <div className="p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-slate-800">4 Hojas integradas con formato corporativo</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Ideal para respaldos semanales y auditorías de gerencia general.
              </p>
            </div>
            <button
              onClick={exportAllMasterWorkbook}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl font-black text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Descargar Cuaderno Maestro (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
