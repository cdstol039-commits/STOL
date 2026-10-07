import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  X,
  ShieldCheck,
  Info,
  Download,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  Users,
  Check,
} from 'lucide-react';
import {
  SupervisorObservation,
  MonthKey,
  MonthData,
} from '../../data/supervisorsData';
import {
  parseSupervisorExcelWorkbook,
  generateSupervisorTemplateWorkbook,
  ParsedSupervisorWorkbookResult,
} from '../../utils/supervisorExcelParser';

interface SupervisorExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (
    observations: SupervisorObservation[],
    supervisorsData: Record<MonthKey, MonthData>,
    fileName: string,
    stats: ParsedSupervisorWorkbookResult['stats']
  ) => void;
}

export const SupervisorExcelUploadModal: React.FC<SupervisorExcelUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedSupervisorWorkbookResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showFormatGuide, setShowFormatGuide] = useState(false);
  const [guideTab, setGuideTab] = useState<'consol' | 'rrhh' | 'sig'>('consol');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Descarga de la plantilla Excel oficial multi-hoja con CONSOLIDADO, RRHH y SIG
  const handleDownloadTemplate = () => {
    const wb = generateSupervisorTemplateWorkbook();
    XLSX.writeFile(wb, 'PLANTILLA_CONSOLIDADO_OPERACIONES_RRHH_SIG_2026.xlsx');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsLoading(true);
    setErrorMsg(null);
    setParsedResult(null);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const result = parseSupervisorExcelWorkbook(buffer, selectedFile.name);

      if (result.observations.length === 0 && result.stats.monthsCount === 0) {
        throw new Error(
          'No se pudieron identificar datos de supervisores en las hojas del archivo. Verifique que contenga las hojas CONSOLIDADO, RRHH o SIG.'
        );
      }

      setParsedResult(result);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al procesar el archivo Excel.');
      setParsedResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmUpload = () => {
    if (!file || !parsedResult) return;
    try {
      localStorage.setItem('stol_supervisors_data_v2', JSON.stringify(parsedResult.supervisorsData));
      localStorage.setItem('stol_supervisor_observations_custom_v2', JSON.stringify(parsedResult.observations));
      localStorage.setItem('stol_supervisor_excel_filename_v2', file.name);
      localStorage.setItem('stol_supervisor_excel_date_v2', new Date().toISOString());
    } catch (e) {
      console.error(e);
    }
    onUploadSuccess(parsedResult.observations, parsedResult.supervisorsData, file.name, parsedResult.stats);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full border-2 border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wide">
                Carga Consolidada de Supervisores (Un Solo Excel)
              </h2>
              <p className="text-xs text-slate-300">
                Importa las calificaciones sin modificarlas y vincula RRHH/SIG por fecha
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-slate-800 text-xs">
          {/* Banner de Descarga de Plantilla Oficial Multi-hoja */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5 max-w-md">
              <div className="flex items-center gap-1.5 text-blue-900 font-black text-xs uppercase tracking-wide">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span>Estructura Oficial en 3 Hojas</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                Descarga la plantilla con las hojas <strong>CONSOLIDADO_OPERACIONES</strong>, <strong>RRHH</strong> y <strong>SIG</strong>. Las notas del consolidado se importan tal como están.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer border border-blue-800 shrink-0"
                title="Descargar libro Excel con las 3 hojas oficiales"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar Plantilla (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFormatGuide(!showFormatGuide)}
                className="flex items-center gap-1 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-300 cursor-pointer shrink-0"
              >
                <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>{showFormatGuide ? 'Ocultar Guía' : 'Ver Formato'}</span>
                {showFormatGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Guía Desplegable de Especificación de Columnas */}
          {showFormatGuide && (
            <div className="bg-slate-50 border border-slate-300 rounded-2xl p-4 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-black text-slate-900 uppercase text-xs">
                  Especificación de Hojas del Excel
                </span>
                <div className="flex items-center gap-1 bg-slate-200 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setGuideTab('consol')}
                    className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                      guideTab === 'consol' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    1. Consolidado (60/20/20)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuideTab('rrhh')}
                    className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                      guideTab === 'rrhh' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    2. RRHH
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuideTab('sig')}
                    className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                      guideTab === 'sig' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    3. SIG
                  </button>
                </div>
              </div>

              {/* Pestaña Guía 1: Consolidado */}
              {guideTab === 'consol' && (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-600">
                    <strong>Hoja CONSOLIDADO_OPERACIONES:</strong> La aplicación conserva las notas consignadas en <strong>VALOR OP</strong>, <strong>VALOR RRHH</strong>, <strong>VALOR SIG</strong> y <strong>VALOR TOTAL</strong>; no vuelve a calcularlas.
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white text-[10px] font-black uppercase">
                          <th className="py-1.5 px-2.5 border-r border-slate-700">Columna</th>
                          <th className="py-1.5 px-2.5 border-r border-slate-700">Obligatorio</th>
                          <th className="py-1.5 px-2.5 border-r border-slate-700">Ejemplo / Formato</th>
                          <th className="py-1.5 px-2.5">Función</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        <tr>
                          <td className="py-1 px-2 font-bold text-blue-700 border-r border-slate-100">SUPERVISOR</td>
                          <td className="py-1 px-2 text-rose-600 font-bold border-r border-slate-100">Sí</td>
                          <td className="py-1 px-2 border-r border-slate-100">Pedro Oliva, Liz Minaya...</td>
                          <td className="py-1 px-2">Supervisor operativo a evaluar.</td>
                        </tr>
                        <tr className="bg-slate-50/50">
                          <td className="py-1 px-2 font-bold text-blue-700 border-r border-slate-100">VALOR OP 60%</td>
                          <td className="py-1 px-2 text-rose-600 font-bold border-r border-slate-100">Sí</td>
                          <td className="py-1 px-2 border-r border-slate-100 font-mono">49.85 o 0.4985</td>
                          <td className="py-1 px-2">Calificación del pilar operaciones (ponderación 60%).</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-2 font-bold text-blue-700 border-r border-slate-100">VALOR RRHH 20%</td>
                          <td className="py-1 px-2 text-rose-600 font-bold border-r border-slate-100">Sí</td>
                          <td className="py-1 px-2 border-r border-slate-100 font-mono">12.60 o 0.1260</td>
                          <td className="py-1 px-2">Valor ponderado registrado en el consolidado.</td>
                        </tr>
                        <tr className="bg-slate-50/50">
                          <td className="py-1 px-2 font-bold text-blue-700 border-r border-slate-100">VALOR SIG 20%</td>
                          <td className="py-1 px-2 text-rose-600 font-bold border-r border-slate-100">Sí</td>
                          <td className="py-1 px-2 border-r border-slate-100 font-mono">16.00 o 0.1600</td>
                          <td className="py-1 px-2">Valor ponderado registrado en el consolidado.</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-2 font-bold text-blue-700 border-r border-slate-100">SEMANA y MES</td>
                          <td className="py-1 px-2 text-rose-600 font-bold border-r border-slate-100">Sí</td>
                          <td className="py-1 px-2 border-r border-slate-100 font-mono">38, SET</td>
                          <td className="py-1 px-2">Semana del año y código de 3 letras del mes.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Pestaña Guía 2: RRHH */}
              {guideTab === 'rrhh' && (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-600">
                    <strong>Hoja RRHH:</strong> Se vinculan las observaciones con la evaluación por fecha, área, proceso y objetivo. No requiere columna de supervisor. Auditor: <strong>Karla Bolívar</strong>.
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white text-[10px] font-black uppercase">
                          <th className="py-1.5 px-2.5 border-r border-slate-700">Columna</th>
                          <th className="py-1.5 px-2.5 border-r border-slate-700">Obligatorio</th>
                          <th className="py-1.5 px-2.5 border-r border-slate-700">Ejemplo</th>
                          <th className="py-1.5 px-2.5">Descripción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        <tr>
                          <td className="py-1 px-2 font-bold text-blue-700 border-r border-slate-100">FECHA / AREA / PROCESO / OBJETIVO</td>
                          <td className="py-1 px-2 text-rose-600 font-bold border-r border-slate-100">Sí</td>
                          <td className="py-1 px-2 border-r border-slate-100">18/09/2026 / Almacenamiento / Control de Inventario</td>
                          <td className="py-1 px-2">Campos que relacionan la observación con la fila evaluada en Operaciones.</td>
                        </tr>
                        <tr className="bg-slate-50/50">
                          <td className="py-1 px-2 font-bold text-blue-700 border-r border-slate-100">OBSERVACION</td>
                          <td className="py-1 px-2 text-rose-600 font-bold border-r border-slate-100">Sí</td>
                          <td className="py-1 px-2 border-r border-slate-100 italic">"4 tardanzas turno noche..."</td>
                          <td className="py-1 px-2">El motivo del descuento extraído para el detalle.</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-2 font-bold text-blue-700 border-r border-slate-100">OBJETIVO / PROCESO</td>
                          <td className="py-1 px-2 text-rose-600 font-bold border-r border-slate-100">Sí</td>
                          <td className="py-1 px-2 border-r border-slate-100">Asistencia y Puntualidad</td>
                          <td className="py-1 px-2">Criterio o estándar evaluado.</td>
                        </tr>
                        <tr className="bg-slate-50/50">
                          <td className="py-1 px-2 font-bold text-blue-700 border-r border-slate-100">AUDITOR</td>
                          <td className="py-1 px-2 text-slate-500 border-r border-slate-100">Opcional</td>
                          <td className="py-1 px-2 border-r border-slate-100">Karla Bolivar</td>
                          <td className="py-1 px-2">Auditor evaluador.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Pestaña Guía 3: SIG */}
              {guideTab === 'sig' && (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-600">
                    <strong>Hoja SIG:</strong> Se vinculan las observaciones con la evaluación por fecha, área, proceso y objetivo. No requiere columna de supervisor. Auditor: <strong>Makley Villanueva</strong>.
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white text-[10px] font-black uppercase">
                          <th className="py-1.5 px-2.5 border-r border-slate-700">Columna</th>
                          <th className="py-1.5 px-2.5 border-r border-slate-700">Obligatorio</th>
                          <th className="py-1.5 px-2.5 border-r border-slate-700">Ejemplo</th>
                          <th className="py-1.5 px-2.5">Descripción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        <tr>
                          <td className="py-1 px-2 font-bold text-blue-700 border-r border-slate-100">FECHA / AREA / PROCESO / OBJETIVO</td>
                          <td className="py-1 px-2 text-rose-600 font-bold border-r border-slate-100">Sí</td>
                          <td className="py-1 px-2 border-r border-slate-100">18/09/2026 / Recepción / Recepción de Mercadería</td>
                          <td className="py-1 px-2">Campos que relacionan la observación con la fila evaluada en Operaciones.</td>
                        </tr>
                        <tr className="bg-slate-50/50">
                          <td className="py-1 px-2 font-bold text-blue-700 border-r border-slate-100">OBSERVACION</td>
                          <td className="py-1 px-2 text-rose-600 font-bold border-r border-slate-100">Sí</td>
                          <td className="py-1 px-2 border-r border-slate-100 italic">"Falta firma charla 5 min..."</td>
                          <td className="py-1 px-2">Hallazgo de seguridad o incumplimiento SST.</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-2 font-bold text-blue-700 border-r border-slate-100">AUDITOR</td>
                          <td className="py-1 px-2 text-slate-500 border-r border-slate-100">Opcional</td>
                          <td className="py-1 px-2 border-r border-slate-100">Makley Villanueva</td>
                          <td className="py-1 px-2">Auditor SIG / SST.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Zona Drag & Drop */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50 hover:bg-blue-50/40 transition-all group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 mx-auto flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-black text-slate-800">
              {file ? file.name : 'Haz clic o arrastra tu archivo Excel aquí'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Un solo archivo con hojas: <strong>CONSOLIDADO</strong>, <strong>RRHH</strong> y <strong>SIG</strong>
            </p>
          </div>

          {/* Estado de carga */}
          {isLoading && (
            <div className="p-3 bg-blue-50 text-blue-800 rounded-xl flex items-center gap-2 font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
              <span>Analizando hojas de cálculo (Consolidado, RRHH y SIG)...</span>
            </div>
          )}

          {/* Errores */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Error en la lectura del archivo</p>
                <p className="text-[11px] mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Éxito de Parseo Multi-hoja */}
          {parsedResult && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-black text-xs">
                      ¡Excel procesado con éxito! Listo para actualizar todos los desgloses
                    </p>
                    <p className="text-[11px] text-emerald-700">
                      Hojas detectadas: {parsedResult.stats.detectedSheets.join(', ')}
                    </p>
                  </div>
                </div>
                <span className="bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded-md font-bold text-[10px]">
                  Listo para aplicar
                </span>
              </div>

              {/* Métricas del libro procesado */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Meses Actualizados</p>
                  <p className="text-base font-black text-slate-800">
                    {parsedResult.stats.monthsCount > 0 ? parsedResult.stats.monthsCount : 'Todo 2026'}
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Observaciones RRHH</p>
                  <p className="text-base font-black text-blue-700">
                    {parsedResult.stats.rhObsCount}
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Observaciones SIG</p>
                  <p className="text-base font-black text-emerald-700">
                    {parsedResult.stats.sigObsCount}
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Observaciones Operaciones</p>
                  <p className="text-base font-black text-amber-700">
                    {parsedResult.stats.opObsCount}
                  </p>
                </div>
              </div>

              {/* Vista Previa de Primeros Registros de Observaciones */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 font-black text-slate-700 uppercase text-[10px] flex items-center justify-between">
                  <span>Muestra de observaciones extraídas para el detalle</span>
                  <span className="text-slate-500 font-normal">
                    Total: {parsedResult.observations.length}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto bg-white">
                  {parsedResult.observations.slice(0, 5).map((obs, idx) => (
                    <div key={idx} className="p-2.5 hover:bg-slate-50 text-[11px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-slate-900">{obs.supervisor}</span>
                        <span
                          className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                            obs.componente === 'Operaciones'
                              ? 'bg-amber-100 text-amber-900'
                              : obs.componente === 'RRHH'
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {obs.componente}
                        </span>
                      </div>
                      <p className="text-slate-600 line-clamp-2 mt-0.5 italic">
                        "{obs.observacion}"
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                        <span>Criterio: {obs.criterio}</span>
                        <span>Auditor: {obs.auditor}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Nota de Ayuda */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2 text-slate-500 text-[11px]">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-black text-slate-700">Regla de importación:</span> Las notas se conservan como aparecen en el Consolidado de Operaciones. Las observaciones de <strong>RRHH</strong> y <strong>SIG</strong> solo se incluyen cuando su fecha también figura en ese consolidado.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-200 font-bold text-xs cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmUpload}
            disabled={!parsedResult || isLoading}
            className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shadow-sm ${
              parsedResult && !isLoading
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer hover:shadow-md'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirmar y Actualizar Todos los Desgloses</span>
          </button>
        </div>
      </div>
    </div>
  );
};
