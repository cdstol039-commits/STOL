import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, X, FileSpreadsheet, CheckCircle2, AlertCircle, Download, FileText } from 'lucide-react';
import { PocketAuditRecord } from '../../types';
import { formatDisplayDate } from '../../utils/normalizer';

interface DataUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (newRecords: PocketAuditRecord[], fileName?: string) => void;
}

export const DataUploadModal: React.FC<DataUploadModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<PocketAuditRecord[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processFile = async (file: File) => {
    setErrorMsg(null);
    setFileName(file.name);
    setIsProcessing(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // 1. Read as 2D array of cells (header: 1) for reliable positional mapping (Col G=6, Col H=7, Col L=11)
      const matrixRaw: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (!matrixRaw || matrixRaw.length === 0) {
        throw new Error('El archivo cargado no contiene filas de datos.');
      }

      // Helper to parse percentages (handles 0.975 -> 97.5%, 1 -> 100%, "97.5%" -> 97.5)
      const parsePercent = (val: any): number | undefined => {
        if (val === undefined || val === null || val === '') return undefined;
        if (typeof val === 'number') {
          if (isNaN(val)) return undefined;
          if (val > 0 && val <= 1) {
            return Number((val * 100).toFixed(2));
          }
          return Number(val.toFixed(2));
        }
        const str = String(val).replace('%', '').trim().replace(',', '.');
        const num = parseFloat(str);
        if (isNaN(num)) return undefined;
        if (num > 0 && num <= 1 && String(val).includes('.')) {
          return Number((num * 100).toFixed(2));
        }
        return Number(num.toFixed(2));
      };

      const parseNum = (val: any, fallback = 0): number => {
        if (val === undefined || val === null || val === '') return fallback;
        if (typeof val === 'number') return isNaN(val) ? fallback : val;
        const cleaned = String(val).replace(/[^0-9.-]/g, '').trim();
        const num = Number(cleaned);
        return isNaN(num) ? fallback : num;
      };

      // Detect header row index
      let headerRowIdx = -1;
      for (let r = 0; r < Math.min(matrixRaw.length, 10); r++) {
        const rowStr = matrixRaw[r].map((c) => String(c).toLowerCase()).join(' ');
        if (
          rowStr.includes('area') ||
          rowStr.includes('área') ||
          rowStr.includes('pocket') ||
          rowStr.includes('semana') ||
          rowStr.includes('uso') ||
          rowStr.includes('asignad')
        ) {
          headerRowIdx = r;
          break;
        }
      }

      // If no explicit header found, assume row 0 is header
      if (headerRowIdx === -1) headerRowIdx = 0;

      const headerRow = matrixRaw[headerRowIdx] || [];
      const headerNames = headerRow.map((c) => String(c).toLowerCase().trim().replace(/_/g, ' '));

      // Find column indices by header name or fallback to standard positional letters:
      // Col G is index 6, Col H is index 7, Col L is index 11
      const findColIdx = (keywords: string[], defaultIdx: number) => {
        const idx = headerNames.findIndex((name) => keywords.some((kw) => name.includes(kw)));
        return idx >= 0 ? idx : defaultIdx;
      };

      const colFechaIdx = findColIdx(['fecha', 'date', 'fec', 'dia', 'día', 'jornada'], 0);
      let effectiveFechaIdx = colFechaIdx;
      // If colFechaIdx is 0, but header 0 looks like an item index (#, item, n°, etc.) and col 1 has fecha, use 1
      if (
        effectiveFechaIdx === 0 &&
        headerNames[0] &&
        (headerNames[0] === '#' ||
          headerNames[0] === 'n°' ||
          headerNames[0] === 'nro' ||
          headerNames[0] === 'item' ||
          headerNames[0] === 'id' ||
          headerNames[0] === 'n')
      ) {
        effectiveFechaIdx = 1;
      }
      const colMesIdx = findColIdx(['mes', 'month', 'periodo'], 1);
      const colSemanaIdx = findColIdx(['semana', 'sem', 'week'], 2);
      const colAreaIdx = findColIdx(['area', 'área', 'zona', 'departamento', 'sector'], 3);
      const colTurnoIdx = findColIdx(['turno', 'shift', 'horario'], 4);
      const colAsignadosIdx = findColIdx(['total asignado', 'asignados', 'dotacion', 'total pockets'], 5);
      // Col G (Index 6): "pocket que usan" (TOTAL DE POCKETS EN USO)
      const colEnUsoIdx = findColIdx(['pocket que usan', 'pockets que usan', 'pocket usan', 'en uso', 'uso', 'utilizados'], 6);
      // Col H (Index 7): "pockets sin uso" (TOTAL DE POCKETS SIN USO)
      const colSinUsoIdx = findColIdx(['pockets sin uso', 'pocket sin uso', 'sin uso', 'no uso', 'inactivos'], 7);
      // Col L (Index 11): "% cumplimiento registro" (PROMEDIO % CUMPLIMIENTO REGISTRO)
      const colCumplimientoIdx = findColIdx(['% cumplimiento registro', 'cumplimiento registro', '% cumplimiento', 'cumplimiento reg', '% reg'], 11);
      // Col N (Index 13): "MOTIVOS DE USO / MOTIVO DE NO USO" as explicitly requested
      let colMotivoIdx = 13;
      const detectedMotivoHeaderIdx = headerNames.findIndex(
        (name, i) => i !== colEnUsoIdx && i !== colSinUsoIdx && (
          name.includes('motivo') ||
          name.includes('motivos') ||
          name.includes('causa') ||
          name.includes('razon') ||
          name.includes('justific')
        )
      );
      if (detectedMotivoHeaderIdx >= 0) {
        colMotivoIdx = detectedMotivoHeaderIdx;
      }

      const colAuditorIdx = findColIdx(['auditor', 'responsable', 'usuario'], 9);
      const colObsIdx = findColIdx(['observaciones', 'obs', 'comentarios', 'detalle'], 10);

      const dataRows = matrixRaw.slice(headerRowIdx + 1);

      const converted: PocketAuditRecord[] = dataRows
        .filter((row) => row && row.some((cell: any) => cell !== '' && cell !== null && cell !== undefined))
        .map((row, idx) => {
          const area = String(row[colAreaIdx] || 'ALMACEN').toUpperCase().trim();

          const rawSemana = String(row[colSemanaIdx] || '').trim();
          let formattedSemana = 'Semana 38';
          if (rawSemana) {
            const numMatch = rawSemana.match(/\d+/);
            formattedSemana = numMatch ? `Semana ${numMatch[0]}` : (rawSemana.toLowerCase().startsWith('semana') ? rawSemana : `Semana ${rawSemana}`);
          }

          let rawMes = String(row[colMesIdx] || '').trim().toUpperCase();
          const rawFechaVal = row[effectiveFechaIdx];
          const fecha = formatDisplayDate(rawFechaVal, rawMes) || (rawFechaVal !== undefined && rawFechaVal !== null ? String(rawFechaVal) : new Date().toLocaleDateString('es-PE'));
          if (!rawMes && fecha) {
            const parts = fecha.split(/[-/]/);
            let monthIdx = -1;
            if (parts.length === 3) {
              // Si está en formato DD/MM/YYYY o YYYY-MM-DD
              monthIdx = parts[0].length === 4 ? parseInt(parts[1], 10) - 1 : parseInt(parts[1], 10) - 1;
            }
            const monthNames = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
            if (monthIdx >= 0 && monthIdx < 12) {
              rawMes = monthNames[monthIdx];
            }
          }
          if (rawMes.startsWith('SET')) rawMes = 'SEPTIEMBRE';
          const mes = rawMes || 'SEPTIEMBRE';

          // Columna G: Pockets en uso ("pocket que usan")
          const pocketsEnUso = parseNum(row[colEnUsoIdx], 0);

          // Columna H: Pockets sin uso
          const pocketsSinUso = parseNum(row[colSinUsoIdx], 0);

          // Columna F o cálculo de dotación
          let totalAsignados = parseNum(row[colAsignadosIdx], 0);
          if (totalAsignados <= 0) {
            totalAsignados = pocketsEnUso + pocketsSinUso;
          }

          // Columna L: % Cumplimiento Registro
          const pctCumplimientoRegistro = parsePercent(row[colCumplimientoIdx]);

          let pocketsRegistrados = totalAsignados;
          if (pctCumplimientoRegistro !== undefined && totalAsignados > 0) {
            pocketsRegistrados = Math.round((pctCumplimientoRegistro / 100) * totalAsignados);
          }

          // Columna N (index 13): Motivo de Uso / Motivos de No Uso
          // Priority strictly given to Column N, with fallback to detected header column
          let rawMotivo = '';
          if (row[13] !== undefined && row[13] !== null && String(row[13]).trim() !== '') {
            rawMotivo = String(row[13]).trim();
          } else if (colMotivoIdx >= 0 && row[colMotivoIdx] !== undefined && row[colMotivoIdx] !== null && String(row[colMotivoIdx]).trim() !== '') {
            rawMotivo = String(row[colMotivoIdx]).trim();
          }

          // Filter out dummy/empty placeholders
          if (
            rawMotivo === '-' ||
            rawMotivo === '—' ||
            rawMotivo === '0' ||
            rawMotivo.toUpperCase() === 'N/A' ||
            rawMotivo.toUpperCase() === 'NA' ||
            rawMotivo.toUpperCase() === 'NINGUNO' ||
            rawMotivo.toUpperCase() === 'NINGUNA' ||
            rawMotivo.toUpperCase() === 'NONE' ||
            rawMotivo.toUpperCase() === 'NO APLICA' ||
            rawMotivo.toUpperCase() === 'S/N'
          ) {
            rawMotivo = '';
          }

          const motivoNoUso = rawMotivo ? rawMotivo.toUpperCase().trim() : '';
          const auditor = String(row[colAuditorIdx] || 'Auditor de Campo').trim();
          const turno = String(row[colTurnoIdx] || 'Turno Mañana').trim();
          const observaciones = String(row[colObsIdx] || 'Carga de datos masiva').trim();

          return {
            id: `imp-${Date.now()}-${idx}`,
            fecha,
            mes,
            semana: formattedSemana,
            area,
            totalAsignados,
            pocketsRegistrados,
            pocketsEnUso,
            pocketsSinUso,
            pctCumplimientoRegistro,
            motivoNoUso,
            auditor,
            turno,
            observaciones,
          };
        });

      if (converted.length === 0) {
        throw new Error('No se detectaron filas válidas de auditoría en el archivo.');
      }

      setParsedRows(converted);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al procesar el archivo Excel / CSV. Verifique el formato.');
      setParsedRows([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (parsedRows.length > 0) {
      onImportSuccess(parsedRows, fileName || 'Auditoria_Pockets_Actualizada.xlsx');
      onClose();
    }
  };

  const downloadSampleTemplate = () => {
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
        'Observaciones': '1 equipo en servicio técnico',
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
    XLSX.writeFile(wb, 'Plantilla_Auditoria_STOL_Pockets_ColN.xlsx');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1A1A2E] text-white px-5 py-3.5 flex items-center justify-between border-b border-[#236B7A]/40">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-[#E0A23A]" />
            <div>
              <h2 className="text-base font-bold font-sans">Carga Masiva de Registros de Auditoría</h2>
              <p className="text-xs text-[#A7B5C5]">Sincronización automática de historial (.xlsx, .xls, .csv)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#A7B5C5] hover:text-[#E0A23A] p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Instructions banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-[#1F6F8B]/10 border border-[#1F6F8B]/30 rounded p-3 text-xs text-[#1A1A2E] gap-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1F6F8B] shrink-0" />
              <span>
                <strong>Lectura por columnas:</strong> Columna G (Pocket que usan), Columna H (Pockets sin uso), Columna L (% Cumplimiento registro).
              </span>
            </div>
            <button
              onClick={downloadSampleTemplate}
              className="flex items-center gap-1 text-[#1F6F8B] font-bold hover:text-[#236B7A] hover:underline shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#E0A23A]" />
              <span>Bajar Plantilla Excel</span>
            </button>
          </div>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#1F6F8B] bg-[#1F6F8B]/10 scale-[0.99]'
                : 'border-[#E2E4E7] hover:border-[#1F6F8B] bg-[#F4F6F7] hover:bg-[#E2E4E7]/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center gap-2 text-[#7A8FA6]">
              <div className="p-3 bg-white rounded-full shadow-xs border border-[#E2E4E7] text-[#1F6F8B]">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-[#1A1A2E]">
                Arrastra tu archivo Excel o CSV aquí, o <span className="text-[#1F6F8B] underline">haz clic para examinar</span>
              </p>
              <p className="text-xs text-[#7A7A7A]">
                Soporta archivos de Excel (.xlsx, .xls) y valores separados por comas (.csv)
              </p>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center gap-2 bg-[#191827]/10 border border-[#191827]/30 text-[#191827] text-xs p-3 rounded">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#191827]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preview of Parsed Rows */}
          {parsedRows.length > 0 && (
            <div className="space-y-2 border border-[#E2E4E7] rounded p-3 bg-[#F4F6F7]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1F6F8B]">
                  <CheckCircle2 className="w-4 h-4 text-[#1F6F8B]" />
                  <span>Archivo procesado: {fileName} ({parsedRows.length} registros listos)</span>
                </div>
              </div>

              <div className="max-h-40 overflow-x-auto overflow-y-auto border border-[#E2E4E7] rounded bg-white text-[11px]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#1A1A2E] sticky top-0 text-white border-b border-[#E2E4E7] font-bold">
                    <tr>
                      <th className="p-1.5">Semana</th>
                      <th className="p-1.5">Área</th>
                      <th className="p-1.5 text-center">En Uso (Col G)</th>
                      <th className="p-1.5 text-center">Sin Uso (Col H)</th>
                      <th className="p-1.5 text-center">% Cumpl. (Col L)</th>
                      <th className="p-1.5 text-[#E0A23A] font-extrabold">Motivo (Col N)</th>
                      <th className="p-1.5">Auditor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-[#E2E4E7] hover:bg-[#F4F6F7]">
                        <td className="p-1.5 font-semibold text-[#1A1A2E]">{row.semana}</td>
                        <td className="p-1.5 font-bold text-[#1A1A2E]">{row.area}</td>
                        <td className="p-1.5 text-center text-[#1F6F8B] font-bold">{row.pocketsEnUso}</td>
                        <td className="p-1.5 text-center text-[#E0A23A] font-semibold">{row.pocketsSinUso}</td>
                        <td className="p-1.5 text-center font-bold text-[#1F6F8B]">
                          {row.pctCumplimientoRegistro !== undefined ? `${row.pctCumplimientoRegistro}%` : '—'}
                        </td>
                        <td className="p-1.5 text-[#1A1A2E] font-semibold truncate max-w-[150px]" title={row.motivoNoUso}>
                          {row.motivoNoUso ? (
                            <span className="bg-[#1F6F8B]/15 text-[#1F6F8B] px-1.5 py-0.5 rounded text-[10px] border border-[#1F6F8B]/30 font-bold">
                              {row.motivoNoUso}
                            </span>
                          ) : (
                            <span className="text-[#7A8FA6] italic text-[10px]">Sin motivo</span>
                          )}
                        </td>
                        <td className="p-1.5 text-[#7A8FA6]">{row.auditor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 5 && (
                <p className="text-[10px] text-[#7A8FA6] italic text-right">
                  + {parsedRows.length - 5} registros más listos para sincronizar
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#F4F6F7] px-5 py-3 border-t border-[#E2E4E7] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#1A1A2E] hover:text-black rounded hover:bg-[#E2E4E7] transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            id="btn-confirm-import-data"
            onClick={handleConfirmImport}
            disabled={parsedRows.length === 0 || isProcessing}
            className={`flex items-center gap-1.5 px-5 py-2 rounded text-xs font-bold transition-all shadow-sm ${
              parsedRows.length > 0 && !isProcessing
                ? 'bg-[#E0A23A] hover:bg-[#b87d22] text-[#1A1A2E] cursor-pointer'
                : 'bg-[#E2E4E7] text-[#7A8FA6] cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-[#1A1A2E]" />
            <span>Sincronizar e Integrar Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
