import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  Calendar,
  Clock,
} from 'lucide-react';
import { PalletObservation, PalletStatus, formatToDDMMYYYY } from '../../types/pallets';

interface PalletRecordsTableProps {
  records: PalletObservation[];
  isUnlocked: boolean;
  onUpdateStatus?: (id: string, newStatus: PalletStatus) => void;
  onOpenAccessKeyModal?: () => void;
}

export const PalletRecordsTable: React.FC<PalletRecordsTableProps> = ({
  records,
  isUnlocked,
  onUpdateStatus,
  onOpenAccessKeyModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDIENTE' | 'REGULARIZADA'>('ALL');
  const [areaFilter, setAreaFilter] = useState<string>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<PalletObservation | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Distinct areas for filter (ignora '-')
  const distinctAreas = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.area)))
      .filter((a) => a && a.trim() !== '-' && a.trim() !== '--')
      .sort();
  }, [records]);

  // Filtered records
  const filtered = useMemo(() => {
    return records.filter((r) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        r.palletId.toLowerCase().includes(q) ||
        r.area.toLowerCase().includes(q) ||
        r.observacion.toLowerCase().includes(q) ||
        (r.subMotivo && r.subMotivo.toLowerCase().includes(q)) ||
        r.responsable.toLowerCase().includes(q) ||
        (r.responsablePendiente && r.responsablePendiente.toLowerCase().includes(q));

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PENDIENTE' && r.estado === 'PENDIENTE') ||
        (statusFilter === 'REGULARIZADA' && r.estado !== 'PENDIENTE');

      const matchArea = areaFilter === 'ALL' || r.area === areaFilter;

      return matchSearch && matchStatus && matchArea;
    });
  }, [records, searchTerm, statusFilter, areaFilter]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Excel Export matching exact 13 columns from user's Excel
  const handleExportExcel = () => {
    const rows = filtered.map((r) => ({
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
    XLSX.writeFile(wb, `Reporte_Pallets_Observados_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleQuickRegularize = (id: string) => {
    if (!isUnlocked && onOpenAccessKeyModal) {
      onOpenAccessKeyModal();
      return;
    }
    if (onUpdateStatus) {
      onUpdateStatus(id, 'REGULARIZADA');
    }
  };

  return (
    <div className="bg-white border-2 border-[#CBD5E1] rounded-2xl shadow-sm overflow-hidden">
      {/* Header bar with filters */}
      <div className="p-4 border-b-2 border-[#CBD5E1] flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#F8FAFC] to-[#F1F5F9]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#2563EB]/15 text-[#2563EB]">
            <Layers className="w-5 h-5 font-bold" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#0F172A] uppercase tracking-wide">
              Matriz Operativa de Pallets Observados
            </h3>
            <p className="text-xs text-[#64748B] font-semibold">
              Mostrando {filtered.length} de {records.length} registros auditados
            </p>
          </div>
        </div>

        {/* Filter inputs & buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar LPN, motivo, área..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-[#CBD5E1] focus:border-[#2563EB] rounded-xl text-[#0F172A] font-semibold w-56 outline-none transition-all"
            />
          </div>

          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="text-xs bg-white border border-[#CBD5E1] rounded-xl px-3 py-1.5 text-[#0F172A] font-black outline-none focus:border-[#2563EB]"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="PENDIENTE">Solo Pendientes</option>
            <option value="REGULARIZADA">Solo Regularizadas</option>
          </select>

          {/* Area selector */}
          <select
            value={areaFilter}
            onChange={(e) => {
              setAreaFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-white border border-[#CBD5E1] rounded-xl px-3 py-1.5 text-[#0F172A] font-black outline-none focus:border-[#2563EB]"
          >
            <option value="ALL">Todas las Áreas</option>
            {distinctAreas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          {/* Export Excel */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-black px-3.5 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Descargar matriz en Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* Table view with VIVID, high-contrast rows */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] text-white text-[10.5px] uppercase tracking-wider font-black select-none">
              <th className="py-2.5 px-3 border-r border-[#334155]">N° Pallet (LPN)</th>
              <th className="py-2.5 px-3 border-r border-[#334155]">Fecha Reporte / Sem.</th>
              <th className="py-2.5 px-3 border-r border-[#334155]">Área Operativa</th>
              <th className="py-2.5 px-3 border-r border-[#334155]">Observación</th>
              <th className="py-2.5 px-3 border-r border-[#334155]">Sub-Motivo</th>
              <th className="py-2.5 px-3 border-r border-[#334155]" title="Responsable a cargo de levantar la observación">
                Responsable (Levanta)
              </th>
              <th className="py-2.5 px-3 border-r border-[#334155] text-center" title="Fecha en que se levantó la observación">
                Fecha Lev. Obs
              </th>
              <th className="py-2.5 px-3 border-r border-[#334155] text-center">Estatus</th>
              <th className="py-2.5 px-3 border-r border-[#334155] text-center">Lead Time</th>
              <th className="py-2.5 px-3 border-r border-[#334155]" title="Responsable / Área pendiente de levantar la observación">
                Resp. Pendiente
              </th>
              <th className="py-2.5 px-3 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#CBD5E1]">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-10 text-center text-[#64748B] bg-[#F8FAFC] font-bold">
                  No se encontraron pallets con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              paginated.map((r, idx) => {
                const isPending = r.estado === 'PENDIENTE';
                const formattedDate = formatToDDMMYYYY(r.fecha);
                const formattedDateLev = r.fechaRegularizacion ? formatToDDMMYYYY(r.fechaRegularizacion) : '—';
                return (
                  <tr
                    key={r.id}
                    className={`transition-colors font-semibold ${
                      isPending
                        ? 'bg-rose-50/70 hover:bg-rose-100/70'
                        : idx % 2 === 0
                        ? 'bg-white hover:bg-slate-50'
                        : 'bg-[#F8FAFC] hover:bg-slate-100'
                    }`}
                  >
                    {/* 1. N° Pallet */}
                    <td className="py-2.5 px-3 font-mono font-black text-[#0F172A] text-xs border-r border-[#CBD5E1]">
                      {r.palletId}
                    </td>

                    {/* 2. Fecha Reporte / Semana */}
                    <td className="py-2.5 px-3 border-r border-[#CBD5E1]">
                      <div className="font-black text-[#0F172A]">{formattedDate}</div>
                      <div className="text-[10px] text-[#64748B] font-bold">{r.semana}</div>
                    </td>

                    {/* 3. Área */}
                    <td className="py-2.5 px-3 border-r border-[#CBD5E1]">
                      <span className="font-black text-[#0F172A] uppercase text-[11px] block">
                        {r.area}
                      </span>
                    </td>

                    {/* 4. Observación */}
                    <td className="py-2.5 px-3 border-r border-[#CBD5E1] max-w-[220px]">
                      <span className="font-bold text-[#0F172A] text-xs truncate block" title={r.observacion}>
                        {r.observacion}
                      </span>
                    </td>

                    {/* 5. Sub-Motivo */}
                    <td className="py-2.5 px-3 border-r border-[#CBD5E1] max-w-[240px]">
                      <span
                        className={`text-xs font-semibold block truncate ${
                          isPending ? 'text-rose-900 font-bold' : 'text-[#475569]'
                        }`}
                        title={r.subMotivo}
                      >
                        {r.subMotivo || '—'}
                      </span>
                    </td>

                    {/* 6. Responsable (Supervisor a cargo de levantar la observación) */}
                    <td className="py-2.5 px-3 border-r border-[#CBD5E1] max-w-[180px]">
                      <span className="font-bold text-[#0F172A] text-[11px] block truncate" title={r.responsable}>
                        {r.responsable}
                      </span>
                    </td>

                    {/* 7. Fecha Lev. Obs */}
                    <td className="py-2.5 px-3 text-center border-r border-[#CBD5E1] text-[11px] font-bold text-slate-700">
                      {formattedDateLev !== '—' ? (
                        <span className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-800 font-mono">
                          {formattedDateLev}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">—</span>
                      )}
                    </td>

                    {/* 8. Estatus (Vivid Badge) */}
                    <td className="py-2.5 px-3 text-center border-r border-[#CBD5E1]">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black shadow-xs ${
                          isPending
                            ? 'bg-rose-600 text-white animate-pulse'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {isPending ? (
                          <AlertTriangle className="w-3 h-3 text-white" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        )}
                        <span>{isPending ? 'PENDIENTE' : 'REGULARIZADA'}</span>
                      </span>
                    </td>

                    {/* 9. Lead Time */}
                    <td className="py-2.5 px-3 text-center border-r border-[#CBD5E1]">
                      <span
                        className={`font-black text-xs px-2.5 py-0.5 rounded-lg border ${
                          r.leadTimeDias >= 2
                            ? 'bg-purple-100 text-purple-900 border-purple-300'
                            : r.leadTimeDias === 1
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-slate-100 text-slate-800 border-slate-300'
                        }`}
                      >
                        {r.leadTimeDias} {r.leadTimeDias === 1 ? 'día' : 'días'}
                      </span>
                    </td>

                    {/* 10. Responsable Pendiente */}
                    <td className="py-2.5 px-3 border-r border-[#CBD5E1]">
                      <span className={`font-black text-xs ${isPending ? 'text-rose-700' : 'text-[#0F172A]'}`}>
                        {r.responsablePendiente || '—'}
                      </span>
                    </td>

                    {/* 11. Quick Action */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedRecord(r)}
                          className="p-1.5 rounded-lg hover:bg-slate-200 text-[#475569] hover:text-[#0F172A] transition-colors"
                          title="Ver detalle completo"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isPending && (
                          <button
                            onClick={() => handleQuickRegularize(r.id)}
                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                            title="Marcar como regularizada"
                          >
                            <Check className="w-4 h-4 font-black" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="p-3 border-t-2 border-[#CBD5E1] flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#F8FAFC] to-[#F1F5F9] text-xs">
        <div className="flex items-center gap-2 text-[#475569] font-bold">
          <span>Mostrar:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1 text-[#0F172A] font-black outline-none"
          >
            <option value={15}>15 filas</option>
            <option value={30}>30 filas</option>
            <option value={50}>50 filas</option>
            <option value={100}>100 filas</option>
          </select>
          <span>
            Página {currentPage} de {totalPages}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] disabled:opacity-40 hover:bg-[#F1F5F9] font-bold cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
            const pageNum = i + 1;
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-7 h-7 rounded-lg text-xs font-black border transition-colors cursor-pointer ${
                  currentPage === pageNum
                    ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                    : 'bg-white border-[#CBD5E1] text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] disabled:opacity-40 hover:bg-[#F1F5F9] font-bold cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Record Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border-2 border-[#CBD5E1] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1] mb-4">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-lg text-[#0F172A]">
                  {selectedRecord.palletId}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                    selectedRecord.estado === 'PENDIENTE'
                      ? 'bg-rose-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {selectedRecord.estado === 'PENDIENTE' ? 'PENDIENTE' : 'REGULARIZADA'}
                </span>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-[#64748B] hover:text-[#0F172A] font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                <div>
                  <span className="text-[#64748B] block font-bold">Fecha Registro:</span>
                  <strong className="text-[#0F172A] font-black">{formatToDDMMYYYY(selectedRecord.fecha)} ({selectedRecord.semana})</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block font-bold">Área Operativa:</span>
                  <strong className="text-[#0F172A] font-black uppercase">{selectedRecord.area}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block font-bold">Supervisor (A cargo de levantar):</span>
                  <strong className="text-[#0F172A] font-black">{selectedRecord.responsable}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block font-bold">Lead Time en Piso:</span>
                  <strong className="text-purple-700 font-black">{selectedRecord.leadTimeDias} días</strong>
                </div>
              </div>

              <div>
                <span className="font-black text-[#0F172A] block mb-1">Observación:</span>
                <p className="p-3 rounded-xl bg-slate-100 border border-slate-300 text-[#0F172A] font-bold">
                  {selectedRecord.observacion}
                </p>
              </div>

              {selectedRecord.subMotivo && (
                <div>
                  <span className="font-black text-rose-700 block mb-1">Sub-Motivo / Detalle Operativo:</span>
                  <p className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 font-bold">
                    {selectedRecord.subMotivo}
                  </p>
                </div>
              )}

              {selectedRecord.responsablePendiente && (
                <div>
                  <span className="font-black text-rose-800 block mb-1">Área Omisa (No levanta la observación):</span>
                  <p className="p-2.5 rounded-xl bg-rose-100 border border-rose-300 text-rose-950 font-black">
                    {selectedRecord.responsablePendiente}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-[#CBD5E1] flex justify-end gap-2">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-[#E2E8F0] hover:bg-[#CBD5E1] text-[#0F172A] font-black rounded-xl text-xs cursor-pointer"
              >
                Cerrar
              </button>
              {selectedRecord.estado === 'PENDIENTE' && (
                <button
                  onClick={() => {
                    handleQuickRegularize(selectedRecord.id);
                    setSelectedRecord(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Marcar como Regularizada</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
