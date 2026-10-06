import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { PalletObservation, PalletStatus, normalizeSemana, normalizeMes, formatToDDMMYYYY } from '../../types/pallets';

interface PalletUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (records: PalletObservation[], fileName: string) => void;
}

export const PalletUploadModal: React.FC<PalletUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRecords, setParsedRecords] = useState<PalletObservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = wb.SheetNames[0];
      const ws = wb.Sheets[firstSheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const rawSheetArray: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      if (rawRows.length === 0) {
        throw new Error('El archivo seleccionado no contiene registros en la primera hoja.');
      }

      // Regla de negocio: Solo considerar filas que al menos tengan completadas las columnas A hasta E
      let discardedCount = 0;
      const validRecords: PalletObservation[] = [];

      rawRows.forEach((row, idx) => {
        // Validación física por columnas de hoja A..E (índices 0, 1, 2, 3, 4)
        const sheetRow = rawSheetArray[idx + 1] || [];
        const colA = String(sheetRow[0] !== undefined ? sheetRow[0] : '').trim();
        const colB = String(sheetRow[1] !== undefined ? sheetRow[1] : '').trim();
        const colC = String(sheetRow[2] !== undefined ? sheetRow[2] : '').trim();
        const colD = String(sheetRow[3] !== undefined ? sheetRow[3] : '').trim();
        const colE = String(sheetRow[4] !== undefined ? sheetRow[4] : '').trim();

        // 1. FECHA REPORTE (Col A)
        const rawFecha = String(
          row['FECHA REPORTE'] ||
          row['FECHA_REPORTE'] ||
          row['Fecha Reporte'] ||
          row['FECHA REGISTRO'] ||
          row['FECHA_REGISTRO'] ||
          row['Fecha Observación'] ||
          row['Fecha'] ||
          row['FECHA'] ||
          colA
        ).trim();

        // 2. MES (Col B)
        const rawMes = String(row['MES'] || row['Mes'] || colB).trim();

        // 3. SEMANA (Col C)
        const rawSemana = String(row['SEMANA'] || row['Semana'] || row['semana'] || colC).trim();

        // 4. RESPONSALE / RESPONSABLE (Col D)
        const rawResponsable = String(
          row['RESPONSALE'] ||
          row['Responsale'] ||
          row['RESPONSABLE'] ||
          row['Responsable / Supervisor'] ||
          row['Responsable'] ||
          row['Supervisor'] ||
          colD
        ).trim();

        // 5. CARGO (Col E)
        const rawCargo = String(row['CARGO'] || row['Cargo'] || colE).trim();

        // Validar que las columnas A hasta E estén completadas (no vacías)
        const isBlank = (s: string) => !s || s === '-' || s === '--';
        const hasColsAtoEInArray = colA !== '' && colB !== '' && colC !== '' && colD !== '' && colE !== '' &&
          !(colA === '-' && colB === '-' && colC === '-');
        const hasColsAtoEInRow = Boolean(rawFecha) && Boolean(rawMes) && Boolean(rawSemana) && Boolean(rawResponsable) && Boolean(rawCargo);

        if (!hasColsAtoEInArray && !hasColsAtoEInRow) {
          discardedCount += 1;
          return;
        }

        // 6. AREA (Col F)
        const area = String(
          row['AREA'] || row['Área'] || row['Area'] || sheetRow[5] || 'CROSS DOCKING'
        ).toUpperCase().trim();

        // 7. N°PALLET (Col G)
        const palletId = String(
          row['N°PALLET'] ||
          row['N° PALLET'] ||
          row['PALLET'] ||
          row['ID Pallet (LPN)'] ||
          row['ID_PALLET'] ||
          row['LPN'] ||
          sheetRow[6] ||
          `PL9540028${10000 + idx}`
        ).trim();

        // 8. OBSERVACION (Col H)
        const observacion = String(
          row['OBSERVACION'] ||
          row['Observacion'] ||
          row['Motivo de Observación'] ||
          row['Motivo'] ||
          sheetRow[7] ||
          'Observación operativa'
        ).trim();

        // 9. SUB-MOTIVO (Col I)
        const rawSub = String(
          row['SUB-MOTIVO'] ||
          row['SUB MOTIVO'] ||
          row['Sub-motivo'] ||
          row['Submotivo'] ||
          sheetRow[8] ||
          '-'
        ).trim();
        const subMotivo = rawSub === '' ? '-' : rawSub;

        // 10. FECHA LEV.OBS / FECHA REGULARIZADA (Col J)
        const rawFechaReg =
          row['FECHA LEV.OBS'] ||
          row['FECHA LEV. OBS'] ||
          row['FECHA LEV OBS'] ||
          row['FECHA REGULARIZADA'] ||
          row['Fecha Regularización'] ||
          row['FECHA_REGULARIZADA'] ||
          sheetRow[9];

        // 11. ESTATUS (Col K)
        const rawEstatus = String(
          row['ESTATUS'] || row['Estatus'] || row['Estado'] || row['Estado Regularización'] || sheetRow[10] || ''
        ).toUpperCase().trim();

        const fecha = formatToDDMMYYYY(rawFecha) || new Date().toLocaleDateString('es-ES');
        const mes = normalizeMes(rawMes || (fecha.includes('/09/') || fecha.includes('09') ? 'SETIEMBRE' : 'AGOSTO'));
        const semana = normalizeSemana(rawSemana);
        const responsable = rawResponsable || 'SUPERVISOR DE TURNO';
        const cargo = rawCargo || 'SUPERVISOR';

        const isPendiente = rawEstatus.includes('PEND') ||
          (rawEstatus === '' && !rawFechaReg && (subMotivo !== '-' && subMotivo !== ''));
        const estado: PalletStatus = isPendiente ? 'PENDIENTE' : 'REGULARIZADA';

        const fechaReg = isPendiente ? null : (formatToDDMMYYYY(rawFechaReg) || fecha);

        // 12. lead time (Col L)
        const rawLeadTime = row['lead time'] || row['LEAD TIME'] || row['Lead Time'] || row['LEAD_TIME'] || sheetRow[11];
        let leadTimeDias = 0;
        if (rawLeadTime !== undefined && rawLeadTime !== null && String(rawLeadTime).trim() !== '-' && String(rawLeadTime).trim() !== '') {
          const parsedLt = Number(rawLeadTime);
          leadTimeDias = isNaN(parsedLt) ? (isPendiente ? 1 : 0) : Math.max(0, parsedLt);
        } else {
          leadTimeDias = isPendiente ? 1 : 0;
        }

        // 13. RESPONSABLE PENDIENTE (Col M)
        const rawRespPend = String(
          row['RESPONSABLE PENDIENTE'] || row['RESPONSABLE_PENDIENTE'] || row['Responsable Pendiente'] || sheetRow[12] || (isPendiente ? area : '-')
        ).trim();
        const responsablePendiente = rawRespPend === '' ? '-' : rawRespPend;

        const horaEmpaquetado = fecha;
        const estadoEmpaque = 'Entregado';

        // 14. EVIDENCIA COMPARTIDA (opcional si viene en el Excel)
        const rawEvidencia = String(
          row['EVIDENCIA'] ||
          row['COMPARTIO EVIDENCIA'] ||
          row['COMPARTIÓ EVIDENCIA'] ||
          row['EVIDENCIA COMPARTIDA'] ||
          row['EVIDENCIA_COMPARTIDA'] ||
          row['FOTO'] ||
          row['FOTO EVIDENCIA'] ||
          ''
        ).toUpperCase().trim();
        let evidenciaCompartida: boolean | undefined = undefined;
        if (rawEvidencia) {
          if (rawEvidencia.includes('SI') || rawEvidencia.includes('SÍ') || rawEvidencia.includes('CON') || rawEvidencia.includes('TRUE') || rawEvidencia.includes('ADJUNT')) {
            evidenciaCompartida = true;
          } else if (rawEvidencia.includes('NO') || rawEvidencia.includes('SIN') || rawEvidencia.includes('FALSE') || rawEvidencia.includes('PEND')) {
            evidenciaCompartida = false;
          }
        }

        validRecords.push({
          id: `plt-upload-${Date.now()}-${idx}`,
          palletId,
          fecha,
          mes,
          semana,
          responsable,
          cargo,
          area,
          horaEmpaquetado,
          estadoEmpaque,
          observacion,
          subMotivo,
          fechaRegularizacion: fechaReg,
          estado,
          leadTimeDias,
          responsablePendiente,
          evidenciaCompartida,
        });
      });

      if (validRecords.length === 0) {
        throw new Error('No se encontraron registros con las columnas A hasta E completadas.');
      }

      setParsedRecords(validRecords);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error procesando el archivo Excel.');
      setParsedRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmUpload = () => {
    if (!file || parsedRecords.length === 0) return;
    setIsSuccess(true);
    setTimeout(() => {
      onUploadSuccess(parsedRecords, file.name);
      onClose();
      setIsSuccess(false);
      setFile(null);
      setParsedRecords([]);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#E2E4E7] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E4E7] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#1F6F8B]/10 text-[#1F6F8B]">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#1A1A2E] uppercase tracking-wide">
                Cargar / Actualizar Data de Pallets
              </h3>
              <p className="text-xs text-[#7A8FA6]">
                Sube el Excel o CSV generado por el script de extracción o WMS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#7A8FA6] hover:text-[#1A1A2E] p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload drop area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#CBD5E1] hover:border-[#1F6F8B] bg-[#F8FAFC] hover:bg-[#F1F5F9] rounded-xl p-6 text-center cursor-pointer transition-all"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <FileSpreadsheet className="w-10 h-10 text-[#1F6F8B] mx-auto mb-2" />
          <p className="text-xs font-bold text-[#1A1A2E]">
            {file ? file.name : 'Haz clic para seleccionar el archivo Excel o arrástralo aquí'}
          </p>
          <p className="text-[11px] text-[#7A8FA6] mt-1">
            Formatos admitidos: .xlsx, .xls, .csv (Exportación WMS / extract_data.py)
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-4 text-xs font-bold text-[#1F6F8B]">
            Procesando y validando filas del archivo...
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Preview */}
        {parsedRecords.length > 0 && !isLoading && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800 mb-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Archivo verificado correctamente
              </span>
              <span className="bg-emerald-600 text-white text-[11px] px-2 py-0.5 rounded-full">
                {parsedRecords.length} registros listos
              </span>
            </div>
            <p className="text-[11px] text-emerald-700">
              Al confirmar, los {parsedRecords.length} registros actualizarán inmediatamente todos los gráficos, indicadores y tablas de la pestaña de Pallets Observados.
            </p>
          </div>
        )}

        {/* Footer buttons */}
        <div className="mt-6 pt-3 border-t border-[#E2E4E7] flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#E2E4E7] hover:bg-[#d0d3d7] text-[#1A1A2E] font-bold rounded-lg text-xs"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmUpload}
            disabled={parsedRecords.length === 0 || isLoading}
            className="px-5 py-2 bg-[#E0A23A] hover:bg-[#c98e2e] text-[#1A1A2E] font-black rounded-lg text-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isSuccess ? '¡Actualizado!' : 'Confirmar y Actualizar Dashboard'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
