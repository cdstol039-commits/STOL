import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Download,
  Search,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PocketAuditRecord, AppUser } from '../../types';
import { formatDisplayDate } from '../../utils/normalizer';

interface PocketRecordsTableProps {
  records: PocketAuditRecord[];
  currentUser: AppUser;
  onAddRecord: (record: PocketAuditRecord) => void;
  onDeleteRecord: (id: string) => void;
  onOpenAccessKeyModal?: () => void;
}

export const PocketRecordsTable: React.FC<PocketRecordsTableProps> = ({
  records,
  currentUser,
  onAddRecord,
  onDeleteRecord,
  onOpenAccessKeyModal,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState('ALL');

  // New record form state
  const [area, setArea] = useState('DESPACHO');
  const [semana, setSemana] = useState('Semana 38');
  const [mes, setMes] = useState('SEPTIEMBRE');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [auditorName, setAuditorName] = useState(currentUser.name || 'Auditor');
  const [totalAsignados, setTotalAsignados] = useState(4);
  const [pocketsRegistrados, setPocketsRegistrados] = useState(4);
  const [pocketsEnUso, setPocketsEnUso] = useState(3);
  const [pocketsSinUso, setPocketsSinUso] = useState(1);
  const [motivoNoUso, setMotivoNoUso] = useState('PERSONAL EN OTRA ACTIVIDAD');
  const [observaciones, setObservaciones] = useState('');

  // Distinct areas
  const distinctAreas = Array.from(new Set(records.map((r) => r.area))).filter(Boolean).sort();

  const filtered = records.filter((r) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      !searchTerm ||
      r.area.toLowerCase().includes(q) ||
      r.semana.toLowerCase().includes(q) ||
      (r.motivoNoUso && r.motivoNoUso.toLowerCase().includes(q)) ||
      r.auditor.toLowerCase().includes(q);

    const matchArea = selectedArea === 'ALL' || r.area === selectedArea;

    return matchSearch && matchArea;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRec: PocketAuditRecord = {
      id: `rec-${Date.now()}`,
      fecha: formatDisplayDate(fecha, mes) || fecha,
      mes: mes.toUpperCase().trim(),
      semana,
      area,
      totalAsignados,
      pocketsRegistrados,
      pocketsEnUso,
      pocketsSinUso,
      motivoNoUso: pocketsSinUso > 0 ? motivoNoUso : '',
      auditor: auditorName.trim() || currentUser.name,
      turno: 'Turno Mañana',
      observaciones,
    };
    onAddRecord(newRec);
    setShowAddModal(false);
  };

  const handleExportExcel = () => {
    const data = filtered.map((r) => ({
      'ID': r.id,
      'Fecha': formatDisplayDate(r.fecha),
      'Mes': r.mes,
      'Semana': r.semana,
      'Área': r.area,
      'Total Asignados': r.totalAsignados,
      'Pockets Registrados': r.pocketsRegistrados,
      'En Uso': r.pocketsEnUso,
      'Sin Uso': r.pocketsSinUso,
      '% Cumplimiento': r.pctCumplimientoRegistro || 100,
      'Motivo No Uso': r.motivoNoUso || 'Ninguno',
      'Auditor': r.auditor,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial_Pockets');
    XLSX.writeFile(wb, 'Historial_Completo_Pockets.xlsx');
  };

  return (
    <div className="bg-white border-2 border-slate-300 rounded-2xl shadow-sm p-4 space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md">
            <Smartphone className="w-5 h-5 font-black" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              Base Central de Registros — Pockets
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Historial detallado de auditorías en piso ({filtered.length} registros filtrados)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Area select filter */}
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-slate-800 font-bold outline-none focus:border-blue-600"
          >
            <option value="ALL">Todas las Áreas</option>
            {distinctAreas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar en registros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 focus:border-blue-600 rounded-xl text-slate-900 font-semibold w-48 outline-none transition-all"
            />
          </div>

          {/* Export Excel */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            title="Descargar matriz en Excel"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          {/* Add record button */}
          <button
            onClick={() => {
              if (!currentUser.canEdit && onOpenAccessKeyModal) {
                onOpenAccessKeyModal();
              } else if (currentUser.canEdit) {
                setShowAddModal(true);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer ${
              currentUser.canEdit
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
            }`}
            title={currentUser.canEdit ? 'Registrar nueva auditoría manual' : 'Desbloquear con clave para agregar registro'}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{currentUser.canEdit ? 'Nuevo Registro' : 'Desbloquear'}</span>
          </button>
        </div>
      </div>

      {/* Table with Unified Dark Header and Formatted Dates */}
      <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] text-white text-[10.5px] uppercase tracking-wider font-black select-none">
            <tr>
              <th className="py-2.5 px-3 border-r border-[#334155]">Fecha / Mes</th>
              <th className="py-2.5 px-3 border-r border-[#334155]">Semana</th>
              <th className="py-2.5 px-3 border-r border-[#334155]">Área Operativa</th>
              <th className="py-2.5 px-3 border-r border-[#334155] text-center">Asignados</th>
              <th className="py-2.5 px-3 border-r border-[#334155] text-center">En Uso (Col G)</th>
              <th className="py-2.5 px-3 border-r border-[#334155] text-center">Sin Uso (Col H)</th>
              <th className="py-2.5 px-3 border-r border-[#334155] text-center">% Cumpl. (Col L)</th>
              <th className="py-2.5 px-3 border-r border-[#334155]">Motivo No Uso</th>
              <th className="py-2.5 px-3 border-r border-[#334155]">Auditor</th>
              {currentUser.canEdit && <th className="py-2.5 px-3 text-center">Acción</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-400 italic bg-slate-50 font-bold">
                  No se encontraron registros con los criterios actuales.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const displayDate = formatDisplayDate(r.fecha, r.mes) || r.fecha;
                const pctReg = r.pctCumplimientoRegistro !== undefined
                  ? r.pctCumplimientoRegistro
                  : (r.totalAsignados > 0 ? Math.round(((r.pocketsRegistrados || r.totalAsignados) / r.totalAsignados) * 100) : 100);

                return (
                  <tr key={r.id} className="hover:bg-blue-50/50 transition-colors font-sans">
                    <td className="p-2.5 border-r border-slate-100">
                      <span className="font-black text-slate-900 block">{displayDate}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">{r.mes}</span>
                    </td>
                    <td className="p-2.5 border-r border-slate-100 font-black text-blue-700">
                      {r.semana}
                    </td>
                    <td className="p-2.5 border-r border-slate-100">
                      <span className="font-bold text-slate-900 px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 text-[11px]">
                        {r.area}
                      </span>
                    </td>
                    <td className="p-2.5 border-r border-slate-100 text-center font-black text-slate-900 tabular-nums">
                      {r.totalAsignados}
                    </td>
                    <td className="p-2.5 border-r border-slate-100 text-center text-blue-700 font-black tabular-nums">
                      {r.pocketsEnUso}
                    </td>
                    <td className="p-2.5 border-r border-slate-100 text-center text-amber-600 font-black tabular-nums">
                      {r.pocketsSinUso}
                    </td>
                    <td className="p-2.5 border-r border-slate-100 text-center font-black">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black tabular-nums ${
                          pctReg >= 90
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : pctReg >= 75
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {pctReg}%
                      </span>
                    </td>
                    <td className="p-2.5 border-r border-slate-100">
                      {r.motivoNoUso ? (
                        <span className="inline-block bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md text-[10.5px] font-bold">
                          {r.motivoNoUso}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Ninguno (100% Uso)</span>
                      )}
                    </td>
                    <td className="p-2.5 border-r border-slate-100 text-slate-600 font-medium">
                      {r.auditor}
                    </td>
                    {currentUser.canEdit && (
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => onDeleteRecord(r.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                          title="Eliminar registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Manual Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-300 w-full max-w-lg overflow-hidden">
            <div className="bg-gradient-to-r from-[#1A1A2E] to-[#1E293B] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-wide">
                Registrar Auditoría Manual de Pockets
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full p-2 border-2 border-slate-200 rounded-xl bg-slate-50 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Semana</label>
                  <input
                    type="text"
                    required
                    value={semana}
                    onChange={(e) => setSemana(e.target.value)}
                    className="w-full p-2 border-2 border-slate-200 rounded-xl bg-slate-50 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Área Operativa</label>
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full p-2 border-2 border-slate-200 rounded-xl bg-slate-50 font-semibold"
                  >
                    <option value="DESPACHO">DESPACHO</option>
                    <option value="PICKING">PICKING</option>
                    <option value="CROSS DOCKING">CROSS DOCKING</option>
                    <option value="RECEPCION">RECEPCIÓN</option>
                    <option value="ALMACEN">ALMACÉN</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Auditor</label>
                  <input
                    type="text"
                    required
                    value={auditorName}
                    onChange={(e) => setAuditorName(e.target.value)}
                    className="w-full p-2 border-2 border-slate-200 rounded-xl bg-slate-50 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">Asignados</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={totalAsignados}
                    onChange={(e) => setTotalAsignados(Number(e.target.value))}
                    className="w-full p-2 border-2 border-slate-200 rounded-xl bg-slate-50 font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">Registrados</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={pocketsRegistrados}
                    onChange={(e) => setPocketsRegistrados(Number(e.target.value))}
                    className="w-full p-2 border-2 border-slate-200 rounded-xl bg-slate-50 font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">En Uso</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={pocketsEnUso}
                    onChange={(e) => setPocketsEnUso(Number(e.target.value))}
                    className="w-full p-2 border-2 border-slate-200 rounded-xl bg-slate-50 font-bold text-center text-blue-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">Sin Uso</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={pocketsSinUso}
                    onChange={(e) => setPocketsSinUso(Number(e.target.value))}
                    className="w-full p-2 border-2 border-slate-200 rounded-xl bg-slate-50 font-bold text-center text-amber-600"
                  />
                </div>
              </div>

              {pocketsSinUso > 0 && (
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Motivo de No Uso
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Motivo de inactividad..."
                    value={motivoNoUso}
                    onChange={(e) => setMotivoNoUso(e.target.value)}
                    className="w-full p-2 border-2 border-slate-200 rounded-xl bg-slate-50 font-semibold"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl font-black shadow-md cursor-pointer hover:bg-slate-800"
                >
                  Guardar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
