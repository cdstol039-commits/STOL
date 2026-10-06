import React, { useState } from 'react';
import {
  GraduationCap,
  Award,
  AlertCircle,
  CheckCircle,
  Plus,
  Users,
  Calendar,
  Search,
  BookOpen,
  CheckCircle2,
  AlertOctagon,
  Camera,
} from 'lucide-react';
import { InductionRecord, AppUser, FilterState } from '../../types';
import { formatDisplayDate } from '../../utils/normalizer';

interface InductionDashboardProps {
  inductions: InductionRecord[];
  currentUser: AppUser;
  filters: FilterState;
  onAddInduction: (ind: InductionRecord) => void;
  onOpenAccessKeyModal?: () => void;
  onOpenPhotoSummary?: () => void;
}

export const InductionDashboard: React.FC<InductionDashboardProps> = ({
  inductions,
  currentUser,
  filters,
  onAddInduction,
  onOpenAccessKeyModal,
  onOpenPhotoSummary,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [colaborador, setColaborador] = useState('');
  const [dni, setDni] = useState('');
  const [area, setArea] = useState('PICKING');
  const [tipoInduccion, setTipoInduccion] = useState<InductionRecord['tipoInduccion']>('Manejo de Equipos Pocket');
  const [calificacion, setCalificacion] = useState(90);
  const [observaciones, setObservaciones] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = inductions.filter((ind) => {
    const indMesUpper = (ind.mes || '').toUpperCase();
    const filterMesUpper = filters.mes.toUpperCase();
    const matchMes =
      filters.mes === 'TODOS' ||
      indMesUpper === filterMesUpper ||
      (indMesUpper.startsWith('SET') && filterMesUpper.startsWith('SEP')) ||
      (indMesUpper.startsWith('SEP') && filterMesUpper.startsWith('SET'));
    const matchSemana = filters.semana === 'TODAS' || ind.semana === filters.semana;
    const matchArea = filters.area === 'TODAS' || ind.area === filters.area;
    const q = searchTerm.toLowerCase();
    const matchSearch =
      !searchTerm ||
      ind.colaborador.toLowerCase().includes(q) ||
      ind.dni.includes(q) ||
      ind.area.toLowerCase().includes(q) ||
      ind.tipoInduccion.toLowerCase().includes(q);
    return matchMes && matchSemana && matchArea && matchSearch;
  });

  const total = filtered.length;
  const aprobados = filtered.filter((i) => i.estado === 'Aprobado').length;
  const avgScore = total > 0 ? Math.round(filtered.reduce((acc, i) => acc + i.calificacion, 0) / total) : 0;
  const enObs = filtered.filter((i) => i.estado === 'En Observación').length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const estado = calificacion >= 75 ? 'Aprobado' : 'En Observación';
    const newInd: InductionRecord = {
      id: `ind-${Date.now()}`,
      fecha: new Date().toISOString().split('T')[0],
      mes: filters.mes !== 'TODOS' ? filters.mes.toUpperCase() : 'SEPTIEMBRE',
      semana: filters.semana !== 'TODAS' ? filters.semana : 'Semana 38',
      area,
      colaborador,
      dni,
      auditor: currentUser.name,
      tipoInduccion,
      calificacion,
      estado,
      observaciones,
    };
    onAddInduction(newInd);
    setShowModal(false);
    setColaborador('');
    setDni('');
    setObservaciones('');
  };

  return (
    <div className="space-y-4 pb-8">
      {/* 1. Executive Presentation Top Banner */}
      <div className="bg-gradient-to-r from-[#1A1A2E] to-[#1E293B] text-white p-4 rounded-2xl shadow-md border-2 border-slate-700 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-teal-500 to-cyan-600 p-2.5 rounded-xl shadow-md text-slate-900 font-black">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-black tracking-wide uppercase font-sans text-white">
                INDUCCIÓN Y CAPACITACIÓN OPERACIONAL DE CAMPO
              </h2>
              <span className="bg-white/20 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                {total} Evaluaciones
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Acreditación en manejo seguro de equipos, control de inventario y buenas prácticas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenPhotoSummary && (
            <button
              type="button"
              onClick={onOpenPhotoSummary}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 border border-amber-400"
              title="Descargar o copiar foto resumen de Inducción para análisis ejecutivo"
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
                ? 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-slate-950'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            }`}
            title={currentUser.canEdit ? 'Registrar nueva evaluación' : 'Desbloquear con clave para evaluar'}
          >
            <Plus className="w-4 h-4 font-black" />
            <span>{currentUser.canEdit ? 'Registrar Evaluación' : 'Desbloquear para Evaluar'}</span>
          </button>
        </div>
      </div>

      {/* 2. Top 4 Vivid KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        {/* KPI 1: COLABORADORES EVALUADOS (Royal Blue) */}
        <div className="bg-gradient-to-br from-[#1E40AF] to-[#1E3A8A] text-white rounded-2xl p-4 shadow-md border-2 border-[#3B82F6]/50 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none -mr-8 -mt-8" />
          <div className="flex items-center justify-between z-10">
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-200">
              Personal Evaluado
            </span>
            <div className="p-2 rounded-xl bg-white/15 text-white backdrop-blur-xs">
              <Users className="w-5 h-5 text-blue-200" />
            </div>
          </div>
          <div className="my-2 z-10">
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
              {total}
            </div>
            <p className="text-[11px] text-blue-200 font-semibold mt-0.5">
              Colaboradores auditados
            </p>
          </div>
          <div className="pt-2 border-t border-white/20 text-[10px] font-extrabold text-blue-200 flex justify-between z-10">
            <span>Cobertura de Piso</span>
            <span className="text-white bg-white/20 px-2 py-0.5 rounded-full font-black">
              100% Auditados
            </span>
          </div>
        </div>

        {/* KPI 2: PROMEDIO GENERAL (Vivid Electric Amber) */}
        <div className="bg-gradient-to-br from-[#D97706] to-[#B45309] text-white rounded-2xl p-4 shadow-md border-2 border-amber-400 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none -mr-8 -mt-8" />
          <div className="flex items-center justify-between z-10">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-100">
              Promedio General
            </span>
            <div className="p-2 rounded-xl bg-white/20 text-white backdrop-blur-xs">
              <Award className="w-5 h-5 text-amber-100" />
            </div>
          </div>
          <div className="my-2 z-10">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl sm:text-4xl font-black text-white tabular-nums">
                {avgScore}
              </div>
              <span className="text-sm font-bold text-amber-200">/ 100 pts</span>
            </div>
            <p className="text-[11px] text-amber-100 font-semibold mt-0.5">
              Rendimiento técnico global
            </p>
          </div>
          <div className="pt-2 border-t border-white/20 text-[10px] font-extrabold text-amber-100 flex justify-between z-10">
            <span>Estándar mínimo</span>
            <span className="text-slate-900 bg-amber-200 px-2 py-0.5 rounded-full font-black">
              {avgScore >= 80 ? '✓ Sobre la Meta' : 'Por Mejorar'}
            </span>
          </div>
        </div>

        {/* KPI 3: APROBADOS (Vivid Emerald Green) */}
        <div className="bg-gradient-to-br from-[#059669] to-[#047857] text-white rounded-2xl p-4 shadow-md border-2 border-emerald-400 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none -mr-8 -mt-8" />
          <div className="flex items-center justify-between z-10">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-100">
              Aprobados / Aptos
            </span>
            <div className="p-2 rounded-xl bg-white/20 text-white backdrop-blur-xs">
              <CheckCircle className="w-5 h-5 text-emerald-100" />
            </div>
          </div>
          <div className="my-2 z-10">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl sm:text-4xl font-black text-white tabular-nums">
                {aprobados}
              </div>
              <span className="text-sm font-black bg-white text-emerald-800 px-2 py-0.5 rounded-lg shadow-xs">
                {total > 0 ? `${((aprobados / total) * 100).toFixed(0)}%` : '0%'}
              </span>
            </div>
            <p className="text-[11px] text-emerald-100 font-semibold mt-0.5">
              Certificados operacionales
            </p>
          </div>
          <div className="pt-2 border-t border-white/20 text-[10px] font-extrabold text-emerald-100 flex justify-between z-10">
            <span>Calificación $\ge$ 75 pts</span>
            <span className="text-white bg-emerald-700/80 px-2 py-0.5 rounded-full font-black">
              Autorizados
            </span>
          </div>
        </div>

        {/* KPI 4: EN OBSERVACIÓN (Vivid Alert Red) */}
        <div className="bg-gradient-to-br from-[#DC2626] to-[#B91C1C] text-white rounded-2xl p-4 shadow-md border-2 border-rose-400 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/15 rounded-full blur-xl pointer-events-none -mr-8 -mt-8" />
          <div className="flex items-center justify-between z-10">
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-100">
              En Observación
            </span>
            <div className="p-2 rounded-xl bg-white/20 text-white backdrop-blur-xs animate-pulse">
              <AlertOctagon className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="my-2 z-10">
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
              {enObs}
            </div>
            <p className="text-[11px] text-rose-100 font-semibold mt-0.5">
              Requieren retroalimentación
            </p>
          </div>
          <div className="pt-2 border-t border-white/20 text-[10px] font-extrabold text-rose-100 flex justify-between z-10">
            <span>Plan de refuerzo</span>
            <span className="text-white bg-rose-900/80 px-2 py-0.5 rounded-full font-black">
              {enObs === 0 ? '✓ Cero Casos' : 'Reinducción'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Data Table Container */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl shadow-sm p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
              Padrón de Calificaciones y Módulos Impartidos
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Registro nominal con DNI, calificación obtenida y estado de habilitación
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar colaborador o DNI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 focus:border-teal-600 rounded-xl text-slate-900 font-semibold w-56 outline-none transition-all"
            />
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] text-white text-[10.5px] uppercase tracking-wider font-black select-none">
              <tr>
                <th className="py-2.5 px-3 border-r border-[#334155]">Fecha / Sem.</th>
                <th className="py-2.5 px-3 border-r border-[#334155]">Colaborador</th>
                <th className="py-2.5 px-3 border-r border-[#334155]">DNI</th>
                <th className="py-2.5 px-3 border-r border-[#334155]">Área</th>
                <th className="py-2.5 px-3 border-r border-[#334155]">Módulo de Inducción</th>
                <th className="py-2.5 px-3 border-r border-[#334155] text-center">Calificación</th>
                <th className="py-2.5 px-3 border-r border-[#334155] text-center">Estado</th>
                <th className="py-2.5 px-3 border-r border-[#334155]">Auditor Responsable</th>
                <th className="py-2.5 px-3">Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 italic bg-slate-50">
                    No se encontraron evaluaciones con los filtros actuales (Semana: {filters.semana}, Área: {filters.area}).
                  </td>
                </tr>
              ) : (
                filtered.map((ind) => {
                  const displayDate = formatDisplayDate(ind.fecha);
                  const isApproved = ind.estado === 'Aprobado';

                  return (
                    <tr key={ind.id} className="hover:bg-teal-50/50 transition-colors font-sans">
                      <td className="p-3 border-r border-slate-100">
                        <span className="font-black text-slate-800 block">{displayDate}</span>
                        <span className="text-[10px] text-teal-700 font-bold">{ind.semana}</span>
                      </td>
                      <td className="p-3 border-r border-slate-100 font-black text-slate-900">
                        {ind.colaborador}
                      </td>
                      <td className="p-3 border-r border-slate-100 font-mono text-[11px] text-slate-600">
                        {ind.dni}
                      </td>
                      <td className="p-3 border-r border-slate-100">
                        <span className="font-bold text-slate-800 px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 text-[11px]">
                          {ind.area}
                        </span>
                      </td>
                      <td className="p-3 border-r border-slate-100 font-medium text-slate-700">
                        {ind.tipoInduccion}
                      </td>
                      <td className="p-3 border-r border-slate-100 text-center">
                        <span
                          className={`font-black tabular-nums text-xs px-2 py-0.5 rounded-lg ${
                            ind.calificacion >= 85
                              ? 'bg-emerald-100 text-emerald-800'
                              : ind.calificacion >= 75
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {ind.calificacion} / 100
                        </span>
                      </td>
                      <td className="p-3 border-r border-slate-100 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                          }`}
                        >
                          {ind.estado}
                        </span>
                      </td>
                      <td className="p-3 border-r border-slate-100 font-bold text-slate-800">
                        {ind.auditor}
                      </td>
                      <td className="p-3 text-slate-600 text-[11px] italic">
                        {ind.observaciones || 'Conforme sin novedades'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Modal para Nueva Evaluación */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-300 w-full max-w-lg overflow-hidden">
            <div className="bg-gradient-to-r from-[#1A1A2E] to-[#1E293B] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-wide">
                Registrar Evaluación de Inducción
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
                  <label className="block font-bold text-slate-800 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Apellidos y Nombres..."
                    value={colaborador}
                    onChange={(e) => setColaborador(e.target.value)}
                    className="w-full p-2 border-2 border-slate-200 rounded-xl bg-slate-50 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">DNI</label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    placeholder="8 dígitos..."
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    className="w-full p-2 border-2 border-slate-200 rounded-xl bg-slate-50 font-mono font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Área</label>
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full p-2 border-2 border-slate-200 rounded-xl bg-slate-50 font-semibold"
                  >
                    <option value="PICKING">PICKING</option>
                    <option value="CROSS DOCKING">CROSS DOCKING</option>
                    <option value="DESPACHO">DESPACHO</option>
                    <option value="RECEPCION">RECEPCIÓN</option>
                    <option value="ALMACEN">ALMACÉN</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Calificación (0 - 100)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={calificacion}
                    onChange={(e) => setCalificacion(Number(e.target.value))}
                    className="w-full p-2 border-2 border-slate-200 rounded-xl bg-slate-50 font-black text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Módulo Evaluado</label>
                <select
                  value={tipoInduccion}
                  onChange={(e) => setTipoInduccion(e.target.value as any)}
                  className="w-full p-2 border-2 border-slate-200 rounded-xl bg-slate-50 font-semibold"
                >
                  <option value="Manejo de Equipos Pocket">Manejo de Equipos Pocket</option>
                  <option value="Procedimiento de Inventario y Drop">
                    Procedimiento de Inventario y Drop
                  </option>
                  <option value="Normas de Seguridad y Altura">
                    Normas de Seguridad y Altura
                  </option>
                  <option value="Calidad de Empaque y Paletizado">
                    Calidad de Empaque y Paletizado
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Observaciones / Recomendaciones
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles adicionales del desempeño..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-slate-50 font-medium"
                />
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
                  Guardar Evaluación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
