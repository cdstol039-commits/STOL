import React, { useState } from 'react';
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  ShieldAlert,
  Calendar,
  AlertOctagon,
  Download,
  Search,
  Camera,
} from 'lucide-react';
import { MemoRecord, AppUser, FilterState } from '../../types';
import { formatDisplayDate } from '../../utils/normalizer';

interface MemosDashboardProps {
  memos: MemoRecord[];
  currentUser: AppUser;
  filters: FilterState;
  onAddMemo: (memo: MemoRecord) => void;
  onOpenAccessKeyModal?: () => void;
  onOpenPhotoSummary?: () => void;
}

export const MemosDashboard: React.FC<MemosDashboardProps> = ({
  memos,
  currentUser,
  filters,
  onAddMemo,
  onOpenAccessKeyModal,
  onOpenPhotoSummary,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [tipo, setTipo] = useState<MemoRecord['tipo']>('No Conformidad Menor');
  const [area, setArea] = useState('DESPACHO');
  const [descripcion, setDescripcion] = useState('');
  const [criticidad, setCriticidad] = useState<MemoRecord['criticidad']>('Media');
  const [responsable, setResponsable] = useState('');
  const [fechaCompromiso, setFechaCompromiso] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter memos according to main filters
  const filteredMemos = memos.filter((m) => {
    const memoMesUpper = (m.mes || '').toUpperCase();
    const filterMesUpper = filters.mes.toUpperCase();
    const matchMes =
      filters.mes === 'TODOS' ||
      memoMesUpper === filterMesUpper ||
      (memoMesUpper.startsWith('SET') && filterMesUpper.startsWith('SEP')) ||
      (memoMesUpper.startsWith('SEP') && filterMesUpper.startsWith('SET'));
    const matchSemana = filters.semana === 'TODAS' || m.semana === filters.semana;
    const matchArea = filters.area === 'TODAS' || m.area === filters.area;
    const q = searchTerm.toLowerCase();
    const matchSearch =
      !searchTerm ||
      m.codigo.toLowerCase().includes(q) ||
      m.descripcion.toLowerCase().includes(q) ||
      m.responsable.toLowerCase().includes(q) ||
      m.area.toLowerCase().includes(q);
    return matchMes && matchSemana && matchArea && matchSearch;
  });

  const total = filteredMemos.length;
  const abiertos = filteredMemos.filter((m) => m.estado === 'Abierto' || m.estado === 'En Proceso').length;
  const subsanados = filteredMemos.filter((m) => m.estado === 'Subsanado' || m.estado === 'Cerrado').length;
  const altaCriticidad = filteredMemos.filter((m) => m.criticidad === 'Alta').length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newMemo: MemoRecord = {
      id: `memo-${Date.now()}`,
      codigo: `AUD-MEM-2026-${Math.floor(100 + Math.random() * 900)}`,
      fecha: new Date().toISOString().split('T')[0],
      mes: filters.mes !== 'TODOS' ? filters.mes.toUpperCase() : 'SEPTIEMBRE',
      semana: filters.semana !== 'TODAS' ? filters.semana : 'Semana 38',
      area,
      auditor: currentUser.name,
      tipo,
      descripcion,
      criticidad,
      estado: 'Abierto',
      responsable: responsable || 'Supervisor de Área',
      fechaCompromiso: fechaCompromiso || '2026-09-30',
    };
    onAddMemo(newMemo);
    setShowModal(false);
    setDescripcion('');
    setResponsable('');
  };

  return (
    <div className="space-y-4 pb-8">
      {/* 1. Executive Presentation Top Banner */}
      <div className="bg-gradient-to-r from-[#1A1A2E] to-[#1E293B] text-white p-4 rounded-2xl shadow-md border-2 border-slate-700 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 rounded-xl shadow-md text-slate-900 font-black">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-black tracking-wide uppercase font-sans text-white">
                MEMOS Y HALLAZGOS DE AUDITORÍA OPERATIVA
              </h2>
              <span className="bg-white/20 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                {total} Memos Activos
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Seguimiento riguroso a desviaciones, planes de acción y compromisos en piso
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenPhotoSummary && (
            <button
              type="button"
              onClick={onOpenPhotoSummary}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 border border-amber-400"
              title="Descargar o copiar foto resumen de Memos para análisis ejecutivo"
            >
              <Camera className="w-4 h-4 text-slate-950 font-black shrink-0" />
              <span>Foto Resumen</span>
            </button>
          )}

          <button
            onClick={() => {
            if (!currentUser.canEdit && onOpenAccessKeyModal) {
              onOpenAccessKeyModal();
            } else if (currentUser.canEdit) {
              setShowModal(true);
            }
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer ${
            currentUser.canEdit
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
          }`}
          title={currentUser.canEdit ? 'Emitir nuevo memo de auditoría' : 'Desbloquear con clave para emitir memo'}
        >
          <Plus className="w-4 h-4 font-black" />
          <span>{currentUser.canEdit ? 'Emitir Nuevo Memo' : 'Desbloquear para Emitir Memo'}</span>
        </button>
        </div>
      </div>

      {/* 2. Top 4 Vivid KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        {/* KPI 1: TOTAL MEMOS (Vivid Royal Blue) */}
        <div className="bg-gradient-to-br from-[#1E40AF] to-[#1E3A8A] text-white rounded-2xl p-4 shadow-md border-2 border-[#3B82F6]/50 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none -mr-8 -mt-8" />
          <div className="flex items-center justify-between z-10">
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-200">
              Total Memos
            </span>
            <div className="p-2 rounded-xl bg-white/15 text-white backdrop-blur-xs">
              <FileText className="w-5 h-5 text-blue-200" />
            </div>
          </div>
          <div className="my-2 z-10">
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
              {total}
            </div>
            <p className="text-[11px] text-blue-200 font-semibold mt-0.5">
              Hallazgos registrados
            </p>
          </div>
          <div className="pt-2 border-t border-white/20 text-[10px] font-extrabold text-blue-200 flex justify-between z-10">
            <span>Período Auditado</span>
            <span className="text-white bg-white/20 px-2 py-0.5 rounded-full font-black">
              {filters.semana}
            </span>
          </div>
        </div>

        {/* KPI 2: EN PROCESO / ABIERTOS (Vivid Electric Amber) */}
        <div className="bg-gradient-to-br from-[#D97706] to-[#B45309] text-white rounded-2xl p-4 shadow-md border-2 border-amber-400 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none -mr-8 -mt-8" />
          <div className="flex items-center justify-between z-10">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-100">
              Abiertos / En Trámite
            </span>
            <div className="p-2 rounded-xl bg-white/20 text-white backdrop-blur-xs">
              <Clock className="w-5 h-5 text-amber-100" />
            </div>
          </div>
          <div className="my-2 z-10">
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
              {abiertos}
            </div>
            <p className="text-[11px] text-amber-100 font-semibold mt-0.5">
              En proceso de subsanación
            </p>
          </div>
          <div className="pt-2 border-t border-white/20 text-[10px] font-extrabold text-amber-100 flex justify-between z-10">
            <span>Estatus operativo</span>
            <span className="text-slate-900 bg-amber-200 px-2 py-0.5 rounded-full font-black">
              {total > 0 ? `${((abiertos / total) * 100).toFixed(0)}% del total` : 'Sin casos'}
            </span>
          </div>
        </div>

        {/* KPI 3: SUBSANADOS / CERRADOS (Vivid Emerald Green) */}
        <div className="bg-gradient-to-br from-[#059669] to-[#047857] text-white rounded-2xl p-4 shadow-md border-2 border-emerald-400 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none -mr-8 -mt-8" />
          <div className="flex items-center justify-between z-10">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-100">
              Subsanados / Cerrados
            </span>
            <div className="p-2 rounded-xl bg-white/20 text-white backdrop-blur-xs">
              <CheckCircle className="w-5 h-5 text-emerald-100" />
            </div>
          </div>
          <div className="my-2 z-10">
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
              {subsanados}
            </div>
            <p className="text-[11px] text-emerald-100 font-semibold mt-0.5">
              Compromisos cumplidos
            </p>
          </div>
          <div className="pt-2 border-t border-white/20 text-[10px] font-extrabold text-emerald-100 flex justify-between z-10">
            <span>Eficacia de cierre</span>
            <span className="text-white bg-emerald-700/80 px-2 py-0.5 rounded-full font-black">
              {total > 0 ? `${((subsanados / total) * 100).toFixed(0)}% Eficacia` : 'Al día'}
            </span>
          </div>
        </div>

        {/* KPI 4: ALTA CRITICIDAD (Vivid Alert Red) */}
        <div className="bg-gradient-to-br from-[#DC2626] to-[#B91C1C] text-white rounded-2xl p-4 shadow-md border-2 border-rose-400 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/15 rounded-full blur-xl pointer-events-none -mr-8 -mt-8" />
          <div className="flex items-center justify-between z-10">
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-100">
              Alta Criticidad
            </span>
            <div className="p-2 rounded-xl bg-white/20 text-white backdrop-blur-xs animate-pulse">
              <AlertOctagon className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="my-2 z-10">
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
              {altaCriticidad}
            </div>
            <p className="text-[11px] text-rose-100 font-semibold mt-0.5">
              Riesgo operacional elevado
            </p>
          </div>
          <div className="pt-2 border-t border-white/20 text-[10px] font-extrabold text-rose-100 flex justify-between z-10">
            <span>Prioridad</span>
            <span className="text-white bg-rose-900/80 px-2 py-0.5 rounded-full font-black">
              {altaCriticidad === 0 ? '✓ Ninguno' : 'Atención Inmediata'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Data Table Container */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl shadow-sm p-4 space-y-4">
        {/* Search and Sub-filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
              Matriz de Compromisos y Planes de Acción
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Detalle por área, supervisor a cargo y fecha de levantamiento
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar en memos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 focus:border-blue-600 rounded-xl text-slate-900 font-semibold w-56 outline-none transition-all"
            />
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] text-white text-[10.5px] uppercase tracking-wider font-black select-none">
              <tr>
                <th className="py-2.5 px-3 border-r border-[#334155]">Código / Fecha</th>
                <th className="py-2.5 px-3 border-r border-[#334155]">Semana</th>
                <th className="py-2.5 px-3 border-r border-[#334155]">Área</th>
                <th className="py-2.5 px-3 border-r border-[#334155]">Tipo de Hallazgo</th>
                <th className="py-2.5 px-3 border-r border-[#334155]">Descripción del Incumplimiento</th>
                <th className="py-2.5 px-3 border-r border-[#334155] text-center">Criticidad</th>
                <th className="py-2.5 px-3 border-r border-[#334155] text-center">Estado</th>
                <th className="py-2.5 px-3 border-r border-[#334155]">Supervisor Responsable</th>
                <th className="py-2.5 px-3">Compromiso / Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredMemos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 italic bg-slate-50">
                    No hay memos registrados con los filtros actuales (Semana: {filters.semana}, Área: {filters.area}).
                  </td>
                </tr>
              ) : (
                filteredMemos.map((m) => {
                  const displayDate = formatDisplayDate(m.fecha);
                  const displayCompromiso = formatDisplayDate(m.fechaCompromiso);
                  const isHighCriticidad = m.criticidad === 'Alta';
                  const isSubsanado = m.estado === 'Subsanado' || m.estado === 'Cerrado';

                  return (
                    <tr key={m.id} className="hover:bg-blue-50/50 transition-colors font-sans">
                      <td className="p-3 border-r border-slate-100">
                        <span className="font-black text-blue-700 block">{m.codigo}</span>
                        <span className="text-[10px] text-slate-500 font-semibold">{displayDate}</span>
                      </td>
                      <td className="p-3 border-r border-slate-100 font-bold text-slate-800">
                        {m.semana}
                      </td>
                      <td className="p-3 border-r border-slate-100">
                        <span className="font-black text-slate-900 px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 text-[11px]">
                          {m.area}
                        </span>
                      </td>
                      <td className="p-3 border-r border-slate-100">
                        <span className="font-semibold text-slate-700">{m.tipo}</span>
                      </td>
                      <td className="p-3 border-r border-slate-100 max-w-xs text-slate-800">
                        <p className="line-clamp-2 text-[11px] leading-relaxed font-medium">
                          {m.descripcion}
                        </p>
                      </td>
                      <td className="p-3 border-r border-slate-100 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            isHighCriticidad
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : m.criticidad === 'Media'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {m.criticidad}
                        </span>
                      </td>
                      <td className="p-3 border-r border-slate-100 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black ${
                            isSubsanado
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                          }`}
                        >
                          {m.estado}
                        </span>
                      </td>
                      <td className="p-3 border-r border-slate-100 font-bold text-slate-800">
                        {m.responsable}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-black text-[11px]">{displayCompromiso}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Modal de Emisión de Memo */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-300 w-full max-w-lg overflow-hidden">
            <div className="bg-gradient-to-r from-[#1A1A2E] to-[#1E293B] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-wide">
                Registrar Nuevo Memo de Auditoría
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Área Observada</label>
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
                  <label className="block font-bold text-slate-800 mb-1">Criticidad</label>
                  <select
                    value={criticidad}
                    onChange={(e) => setCriticidad(e.target.value as any)}
                    className="w-full p-2 border-2 border-slate-200 rounded-xl bg-slate-50 font-semibold"
                  >
                    <option value="Baja">Baja</option>
                    <option value="Media">Media</option>
                    <option value="Alta">Alta (Crítica)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Tipo de Hallazgo</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as any)}
                  className="w-full p-2 border-2 border-slate-200 rounded-xl bg-slate-50 font-semibold"
                >
                  <option value="No Conformidad Menor">No Conformidad Menor</option>
                  <option value="No Conformidad Mayor">No Conformidad Mayor</option>
                  <option value="Observación de Seguridad">Observación de Seguridad</option>
                  <option value="Oportunidad de Mejora">Oportunidad de Mejora</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Descripción del Incumplimiento
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detalle de la desviación observada en piso..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-slate-50 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Supervisor A Cargo
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre del supervisor..."
                    value={responsable}
                    onChange={(e) => setResponsable(e.target.value)}
                    className="w-full p-2 border-2 border-slate-200 rounded-xl bg-slate-50 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Fecha Compromiso
                  </label>
                  <input
                    type="date"
                    required
                    value={fechaCompromiso}
                    onChange={(e) => setFechaCompromiso(e.target.value)}
                    className="w-full p-2 border-2 border-slate-200 rounded-xl bg-slate-50 font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl font-black shadow-md cursor-pointer hover:bg-slate-800"
                >
                  Guardar Memo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
