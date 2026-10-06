import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, X, Smartphone, CheckCircle2, AlertCircle, Download, FileText } from 'lucide-react';
import { PocketInventoryItem, PocketEstado, PocketMantenimiento } from '../../types';

interface InventoryUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (newInventory: PocketInventoryItem[], fileName?: string) => void;
}

export const InventoryUploadModal: React.FC<InventoryUploadModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<PocketInventoryItem[]>([]);
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
      const workbook = XLSX.read(data, { type: 'array' });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Read as 2D array for reliable positional or header mapping
      const matrixRaw: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (!matrixRaw || matrixRaw.length === 0) {
        throw new Error('El archivo cargado no contiene filas de datos.');
      }

      // Find header row
      let headerRowIdx = -1;
      for (let r = 0; r < Math.min(matrixRaw.length, 10); r++) {
        const rowStr = matrixRaw[r].map((c) => String(c).toLowerCase()).join(' ');
        if (
          rowStr.includes('serie') ||
          rowStr.includes('area') ||
          rowStr.includes('área') ||
          rowStr.includes('estado') ||
          rowStr.includes('responsable') ||
          rowStr.includes('mantenimiento')
        ) {
          headerRowIdx = r;
          break;
        }
      }

      if (headerRowIdx === -1) headerRowIdx = 0;

      const headerRow = matrixRaw[headerRowIdx] || [];
      const headerNames = headerRow.map((c) => String(c).toLowerCase().trim());

      const findColIdx = (keywords: string[], fallbackIdx: number) => {
        const idx = headerNames.findIndex((name) => keywords.some((kw) => name.includes(kw)));
        return idx >= 0 ? idx : fallbackIdx;
      };

      const colIdxNumero = findColIdx(['n°', 'no', 'num', 'item'], 0);
      const colIdxSerie = findColIdx(['serie', 'serial', 'codigo', 'pocket'], 1);
      const colIdxArea = findColIdx(['area', 'área', 'zona', 'seccion'], 2);
      const colIdxEstado = findColIdx(['estado', 'condicion', 'status'], 3);
      const colIdxResponsable = findColIdx(['responsable', 'supervisor', 'encargado', 'usuario'], 4);
      const colIdxObservaciones = findColIdx(['observacion', 'observaciones', 'motivo', 'detalle', 'falla'], 5);
      const colIdxMantenimiento = findColIdx(['mantenimiento', 'mant', 'diagnostico', 'reparacion'], 6);

      const items: PocketInventoryItem[] = [];

      for (let r = headerRowIdx + 1; r < matrixRaw.length; r++) {
        const row = matrixRaw[r];
        if (!row || row.length === 0) continue;

        const rawSerie = String(row[colIdxSerie] || '').trim();
        const rawArea = String(row[colIdxArea] || '').trim();

        // Skip rows without at least a serie or area
        if (!rawSerie && !rawArea) continue;

        // Skip potential footer or summary rows
        const rawNumStr = String(row[colIdxNumero] || '').trim();
        if (rawSerie.toLowerCase().includes('total') || rawArea.toLowerCase().includes('total')) continue;

        const numVal = parseInt(rawNumStr.replace(/[^0-9]/g, ''), 10) || (items.length + 1);

        // Normalize Estado
        const rawEstadoStr = String(row[colIdxEstado] || '').toUpperCase().trim();
        let estado: PocketEstado = 'OPERATIVO';
        if (rawEstadoStr.includes('INOP') || rawEstadoStr.includes('FALLA') || rawEstadoStr.includes('MAL')) {
          estado = 'INOPERATIVO';
        }

        // Normalize Mantenimiento
        const rawMantStr = String(row[colIdxMantenimiento] || '').toUpperCase().trim();
        let mantenimiento: PocketMantenimiento = '';
        if (rawMantStr.includes('BAJA')) {
          mantenimiento = 'DADO DE BAJA';
        } else if (rawMantStr.includes('REPAR')) {
          mantenimiento = 'POR REPARAR';
        } else if (estado === 'INOPERATIVO') {
          // If inoperativo and not explicitly specified, default to POR REPARAR unless observation mentions baja
          const obs = String(row[colIdxObservaciones] || '').toUpperCase();
          if (obs.includes('BAJA')) mantenimiento = 'DADO DE BAJA';
          else mantenimiento = 'POR REPARAR';
        }

        const responsable = String(row[colIdxResponsable] || 'SUPERVISOR').toUpperCase().trim();
        const observaciones = String(row[colIdxObservaciones] || '-').trim();

        items.push({
          id: `inv-${Date.now()}-${items.length + 1}`,
          numero: numVal,
          serie: rawSerie || `PKT-${String(items.length + 1).padStart(4, '0')}`,
          area: rawArea.toUpperCase().trim() || 'CROSS DOCKING',
          estado,
          responsable,
          observaciones,
          mantenimiento,
        });
      }

      if (items.length === 0) {
        throw new Error('No se detectaron filas válidas de inventario con serie o área.');
      }

      setParsedRows(items);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al procesar el archivo de inventario');
      setParsedRows([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (parsedRows.length > 0) {
      onImportSuccess(parsedRows, fileName || 'Inventario_Pockets_Actualizado.xlsx');
      onClose();
    }
  };

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        'N°': 1,
        'SERIE DE POCKET': '19115B5367',
        'AREA': 'CROSS DOCKING',
        'ESTADO': 'OPERATIVO',
        'RESPONSABLE': 'MARCO SILVA',
        'OBSERVACIONES': '-',
        'MANTENIMIENTO': '',
      },
      {
        'N°': 2,
        'SERIE DE POCKET': '22097B1FD5',
        'AREA': 'CROSS DOCKING',
        'ESTADO': 'OPERATIVO',
        'RESPONSABLE': 'MARCO SILVA',
        'OBSERVACIONES': '-',
        'MANTENIMIENTO': '',
      },
      {
        'N°': 3,
        'SERIE DE POCKET': '22097B495A',
        'AREA': 'CROSS DOCKING',
        'ESTADO': 'OPERATIVO',
        'RESPONSABLE': 'MARCO SILVA',
        'OBSERVACIONES': '-',
        'MANTENIMIENTO': '',
      },
      {
        'N°': 4,
        'SERIE DE POCKET': '24085B0177',
        'AREA': 'CROSS DOCKING',
        'ESTADO': 'OPERATIVO',
        'RESPONSABLE': 'MARCO SILVA',
        'OBSERVACIONES': '-',
        'MANTENIMIENTO': '',
      },
      {
        'N°': 5,
        'SERIE DE POCKET': '24206B06B7',
        'AREA': 'CROSS DOCKING',
        'ESTADO': 'OPERATIVO',
        'RESPONSABLE': 'MARCO SILVA',
        'OBSERVACIONES': '-',
        'MANTENIMIENTO': '',
      },
      {
        'N°': 6,
        'SERIE DE POCKET': '19159B04D4',
        'AREA': 'CROSS DOCKING',
        'ESTADO': 'OPERATIVO',
        'RESPONSABLE': 'MARCO SILVA',
        'OBSERVACIONES': '-',
        'MANTENIMIENTO': '',
      },
      {
        'N°': 7,
        'SERIE DE POCKET': '22067B2D08',
        'AREA': 'CROSS DOCKING',
        'ESTADO': 'INOPERATIVO',
        'RESPONSABLE': 'MARCO SILVA',
        'OBSERVACIONES': 'FALLA DEL TECLADO',
        'MANTENIMIENTO': 'POR REPARAR',
      },
      {
        'N°': 8,
        'SERIE DE POCKET': '21077B351D',
        'AREA': 'CROSS DOCKING',
        'ESTADO': 'INOPERATIVO',
        'RESPONSABLE': 'MARCO SILVA',
        'OBSERVACIONES': 'FALLO EN EL SISTEMA',
        'MANTENIMIENTO': 'DADO DE BAJA',
      },
      {
        'N°': 9,
        'SERIE DE POCKET': '19169B84E1',
        'AREA': 'CROSS DOCKING',
        'ESTADO': 'INOPERATIVO',
        'RESPONSABLE': 'MARCO SILVA',
        'OBSERVACIONES': 'FALLA EL RECONOCIMIENTO DEL LASER',
        'MANTENIMIENTO': 'POR REPARAR',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario_Pockets');
    XLSX.writeFile(wb, 'Plantilla_Inventario_Pockets_STOL.xlsx');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0B2265] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold font-sans">Cargar Inventario de Pockets (Dotación Física)</h2>
              <p className="text-xs text-blue-200">Actualización exclusiva de la lista y estado de equipos físicos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Instructions banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-emerald-50 border border-emerald-200 rounded p-3 text-xs text-emerald-950 gap-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Formato del archivo:</strong> N°, SERIE DE POCKET, AREA, ESTADO, RESPONSABLE, OBSERVACIONES, MANTENIMIENTO.
              </span>
            </div>
            <button
              onClick={downloadSampleTemplate}
              className="flex items-center gap-1 text-emerald-800 font-bold hover:underline shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Plantilla Excel</span>
            </button>
          </div>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-[#0B2265] bg-blue-50/50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <Upload className="w-8 h-8 text-[#0B2265]" />
              <div className="text-xs text-slate-600">
                <span className="font-bold text-[#0B2265]">Haga clic para seleccionar</span> o arrastre el archivo aquí
              </div>
              <p className="text-[11px] text-slate-400">Compatible con formatos Excel (.xlsx, .xls) y CSV</p>
            </div>
          </div>

          {/* Status & Error Messages */}
          {errorMsg && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 p-3 rounded text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preview of Parsed Rows */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{parsedRows.length} equipos detectados en {fileName}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-normal">
                  Operativos: {parsedRows.filter((p) => p.estado === 'OPERATIVO').length} | Inoperativos: {parsedRows.filter((p) => p.estado === 'INOPERATIVO').length}
                </div>
              </div>

              <div className="border border-slate-200 rounded max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0B2265] text-white sticky top-0 font-semibold">
                    <tr>
                      <th className="p-1.5">N°</th>
                      <th className="p-1.5">Serie de Pocket</th>
                      <th className="p-1.5">Área</th>
                      <th className="p-1.5 text-center">Estado</th>
                      <th className="p-1.5">Responsable</th>
                      <th className="p-1.5">Observaciones</th>
                      <th className="p-1.5 text-center">Mantenimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 10).map((row, i) => (
                      <tr
                        key={i}
                        className={`border-b border-slate-100 ${
                          row.estado === 'INOPERATIVO' ? 'bg-amber-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-1.5 text-slate-500 font-bold">{row.numero}</td>
                        <td className="p-1.5 font-mono font-bold text-slate-900">{row.serie}</td>
                        <td className="p-1.5 font-semibold text-blue-950">{row.area}</td>
                        <td className="p-1.5 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.estado === 'OPERATIVO'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-200 text-amber-950 border border-amber-300'
                            }`}
                          >
                            {row.estado}
                          </span>
                        </td>
                        <td className="p-1.5 text-slate-700">{row.responsable}</td>
                        <td className="p-1.5 text-slate-600 truncate max-w-[140px]">{row.observaciones || '-'}</td>
                        <td className="p-1.5 text-center">
                          {row.mantenimiento === 'POR REPARAR' && (
                            <span className="bg-[#86efac] text-emerald-950 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-400">
                              POR REPARAR
                            </span>
                          )}
                          {row.mantenimiento === 'DADO DE BAJA' && (
                            <span className="bg-[#ef4444] text-white px-2 py-0.5 rounded text-[10px] font-bold">
                              DADO DE BAJA
                            </span>
                          )}
                          {!row.mantenimiento && <span className="text-slate-400">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 10 && (
                <p className="text-[10px] text-slate-500 italic text-right">
                  + {parsedRows.length - 10} equipos adicionales listos para cargar
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            id="btn-confirm-import-inventory"
            onClick={handleConfirmImport}
            disabled={parsedRows.length === 0 || isProcessing}
            className={`flex items-center gap-1.5 px-5 py-2 rounded text-xs font-bold transition-all shadow-xs ${
              parsedRows.length > 0 && !isProcessing
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Cargar y Actualizar Inventario ({parsedRows.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
