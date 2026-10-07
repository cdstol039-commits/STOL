import * as XLSX from 'xlsx';
import {
  MonthKey,
  MonthData,
  SupervisorRecord,
  GeneralSupervisorScore,
  SupervisorObservation,
  AUDITOR_NAMES,
  isAuditorName,
  SUPERVISORS_DATA,
  INITIAL_SUPERVISOR_OBSERVATIONS,
} from '../data/supervisorsData';

export interface ParsedSupervisorWorkbookResult {
  supervisorsData: Record<MonthKey, MonthData>;
  observations: SupervisorObservation[];
  stats: {
    monthsCount: number;
    supervisorsCount: number;
    observationsCount: number;
    opObsCount: number;
    rhObsCount: number;
    sigObsCount: number;
    detectedSheets: string[];
    sheetSummary: {
      hasConsolidado: boolean;
      hasRRHH: boolean;
      hasSIG: boolean;
    };
  };
}

// Normalizador de Mes a MonthKey
export const normalizeMonthKey = (raw: any): MonthKey | null => {
  if (!raw) return null;
  const str = String(raw).toUpperCase().trim();
  if (str.includes('ENE') || str.includes('JAN')) return 'ENE';
  if (str.includes('FEB')) return 'FEB';
  if (str.includes('MAR')) return 'MAR';
  if (str.includes('ABR') || str.includes('APR')) return 'ABR';
  if (str.includes('MAY')) return 'MAY';
  if (str.includes('JUN')) return 'JUN';
  if (str.includes('JUL')) return 'JUL';
  if (str.includes('AGO') || str.includes('AUG')) return 'AGO';
  if (str.includes('SET') || str.includes('SEP')) return 'SET';
  if (str.includes('OCT')) return 'OCT';
  if (str.includes('NOV')) return 'NOV';
  if (str.includes('DIC') || str.includes('DEC')) return 'DIC';

  // Si viene una fecha DD/MM/YYYY o YYYY-MM-DD
  const dateMatch = str.match(/[\/\-](\d{1,2})[\/\-]/);
  if (dateMatch) {
    const monthNum = parseInt(dateMatch[1], 10);
    const monthKeys: MonthKey[] = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SET', 'OCT', 'NOV', 'DIC'];
    if (monthNum >= 1 && monthNum <= 9) return monthKeys[monthNum - 1];
  }

  return null;
};

// Normalizador numérico flexible (porcentajes de 0 a 1 o de 0 a 100)
export const parseScoreVal = (val: any): number | null => {
  if (val === undefined || val === null || val === '' || val === '–' || val === '-') return null;
  let num: number;
  if (typeof val === 'number') {
    num = val;
  } else {
    const clean = String(val).replace('%', '').replace(',', '.').trim();
    num = parseFloat(clean);
  }
  if (isNaN(num)) return null;
  // Si viene como 85.5 (sobre 100) o 49.85 (sobre 60) o 12.6 (sobre 20), convertir a escala 0 a 1
  if (num > 1.05) return num / 100;
  return num;
};

export const normalizeDateKey = (value: any): string | null => {
  if (value === undefined || value === null || value === '') return null;

  if (value instanceof Date && !isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }

  const text = String(value).trim();
  if (/^\d+(\.\d+)?$/.test(text)) {
    const serial = Number(text);
    if (serial >= 20000 && serial <= 80000) {
      const date = new Date((Math.floor(serial) - 25569) * 86400000);
      if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
    }
  }

  const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  const localMatch = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (localMatch) {
    return `${localMatch[3]}-${localMatch[2].padStart(2, '0')}-${localMatch[1].padStart(2, '0')}`;
  }

  return null;
};

const formatDateForDisplay = (value: any, dateKey: string | null): string => {
  if (!dateKey) return String(value ?? '').trim();
  return dateKey.split('-').reverse().join('/');
};

// Limpiador de cadenas de texto de encabezados
export const cleanColName = (key: string): string => {
  return String(key || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const normalizeJoinValue = (value: any): string =>
  cleanColName(String(value ?? ''))
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();

// Helper para obtener valor de fila buscando entre posibles nombres de columnas
export const getRowValue = (row: any, candidates: string[]): any => {
  if (!row || typeof row !== 'object') return '';
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const normCandidate = cleanColName(candidate);
    for (const key of keys) {
      const normKey = cleanColName(key);
      if (normKey === normCandidate || normKey.includes(normCandidate)) {
        const val = row[key];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return val;
        }
      }
    }
  }
  return '';
};

// Helper para detectar si un texto menciona el nombre de algún supervisor
const detectSupervisorInText = (text: string, knownSupervisors: string[]): string | null => {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const sup of knownSupervisors) {
    const parts = sup.toLowerCase().split(' ');
    // Si contiene el apellido o nombre completo
    if (lower.includes(sup.toLowerCase()) || (parts.length > 1 && parts.some((p) => p.length > 3 && lower.includes(p)))) {
      return sup;
    }
  }
  return null;
};

/**
 * Genera el archivo Excel modelo oficial con las 3 hojas:
 * 1. CONSOLIDADO_OPERACIONES (con notas ponderadas ingresadas en el archivo)
 * 2. RRHH (con observaciones y motivos de nota)
 * 3. SIG (con observaciones y hallazgos SST)
 * 4. GUIA_FORMATO (con las reglas y especificaciones)
 */
export const generateSupervisorTemplateWorkbook = (): XLSX.WorkBook => {
  const wb = XLSX.utils.book_new();

  // HOJA 1: CONSOLIDADO_OPERACIONES
  const consolHeaders = [
    'FECHA',
    'SUPERVISOR',
    'AREA',
    'PROCESOS',
    'OBETIVO',
    'VALORACION',
    'OBSERVACION',
    'VALOR OP 100%',
    'VALOR OP 60%',
    'VALOR RRHH 20%',
    'VALOR SIG 20%',
    'VALOR TOTAL',
    'SEMANA',
    'NOTA UNITARIA FRANCO',
    'PONDERADO F',
    'SUP GENERAL',
    'NOTA TOTAL FRANCO',
    'MES',
    'AÑO',
  ];

  const consolRows = [
    consolHeaders,
    ['18/09/2026', 'Pedro Oliva', 'Almacenamiento', 'Control de Inventario', 'Pallets Observados y Regularización', 'Bueno', '12 pallets con más de 72h sin regularizar en buffer.', 78.45, 49.85, 12.60, 16.00, 78.45, 38, 80, 49.85, 'Aldo Bautista', 49.85, 'SET', 2026],
    ['25/09/2026', 'Liz Minaya', 'Despacho', 'Control de Inventario Cíclico', 'Exactitud de Conteos', 'Bueno', 'Diferencia de 8 cajas en conteo de abarrotes.', 83.74, 55.14, 12.60, 16.00, 83.74, 39, 83, 55.14, 'Aldo Bautista', 55.14, 'SET', 2026],
    ['18/09/2026', 'Jaiter Girón', 'Recepción', 'Recepción de Mercadería', 'Verificación de Guías', 'Bueno', 'Recepción conforme con pequeña demora en ingreso a WMS.', 87.42, 58.82, 12.60, 16.00, 87.42, 38, 87, 58.82, 'Pedro Morante', 58.82, 'SET', 2026],
  ];

  const wsConsol = XLSX.utils.aoa_to_sheet(consolRows);
  XLSX.utils.book_append_sheet(wb, wsConsol, 'CONSOLIDADO_OPERACIONES');

  // HOJA 2: RRHH
  const rrhhHeaders = [
    'FECHA',
    'AUDITOR',
    'AREA',
    'PROCESOS',
    'OBJETIVO',
    'VALORACION',
    'PONDERADO',
    'VALOR RRHH',
    'OBSERVACIONES',
  ];

  const rrhhRows = [
    rrhhHeaders,
    ['18/09/2026', 'Karla Bolivar', 'Almacenamiento', 'Control de Inventario', 'Pallets Observados y Regularización', 63.0, 7.4, 12.60, 'Se detectó una desviación en la regularización de pallets del área.'],
    ['25/09/2026', 'Karla Bolivar', 'Despacho', 'Control de Inventario Cíclico', 'Exactitud de Conteos', 63.0, 7.4, 12.60, 'Se detectó una diferencia en el conteo cíclico del área.'],
  ];

  const wsRRHH = XLSX.utils.aoa_to_sheet(rrhhRows);
  XLSX.utils.book_append_sheet(wb, wsRRHH, 'RRHH');

  // HOJA 3: SIG
  const sigHeaders = [
    'FECHA',
    'AUDITOR',
    'AREA',
    'PROCESOS',
    'OBJETIVO',
    'VALORACION',
    'PONDERADO',
    'VALOR SIG',
    'OBSERVACIONES',
  ];

  const sigRows = [
    sigHeaders,
    ['18/09/2026', 'Makley Villanueva', 'Recepción', 'Recepción de Mercadería', 'Verificación de Guías', 80.0, 16.0, 16.0, 'Se detectó una demora menor en la revisión de guías de recepción.'],
  ];

  const wsSIG = XLSX.utils.aoa_to_sheet(sigRows);
  XLSX.utils.book_append_sheet(wb, wsSIG, 'SIG');

  // HOJA 4: GUIA_FORMATO
  const guiaRows = [
    ['GUÍA DE ESTRUCTURA Y FÓRMULA OFICIAL – SISTEMA DE EVALUACIÓN DE SUPERVISORES 2026'],
    [''],
    ['REGLA 1: CONSOLIDADO DE OPERACIONES (HOJA 1)'],
    ['- Contiene la evaluación consolidada por supervisor, semana y mes.'],
    ['- La aplicación conserva los valores de VALOR_OP_60, VALOR_RRHH_20, VALOR_SIG_20 y VALOR_TOTAL tal como aparecen en esta hoja.'],
    ['- VALOR_TOTAL es la nota final registrada en el consolidado y no se vuelve a calcular durante la importación.'],
    ['- La meta corporativa es 98% (0.98).'],
    [''],
    ['REGLA 2: HOJA RRHH (HOJA 2)'],
    ['- Contiene el detalle de las observaciones y motivos de nota en el pilar de Recursos Humanos.'],
    ['- Solo se importan observaciones cuya FECHA también aparece en CONSOLIDADO_OPERACIONES.'],
    ['- Registra faltas de puntualidad, tardanzas, horas extras extemporáneas, descansos médicos y gestión de turnos.'],
    ['- Auditor evaluador principal: Karla Bolívar.'],
    [''],
    ['REGLA 3: HOJA SIG (HOJA 3)'],
    ['- Contiene el detalle de las observaciones y hallazgos del Sistema Integrado de Gestión (Seguridad, Salud en el Trabajo y Medio Ambiente).'],
    ['- Solo se importan observaciones cuya FECHA también aparece en CONSOLIDADO_OPERACIONES.'],
    ['- Registra charlas de 5 minutos, formatos ATS, inspección de EPP, orden 5S y vías de emergencia.'],
    ['- Auditor evaluador principal: Makley Villanueva.'],
    [''],
    ['REGLA 4: AUDITORES VS SUPERVISORES OPERATIVOS EVALUADOS'],
    ['- Karla Bolívar y Makley Villanueva son AUDITORES EVALUADORES.'],
    ['- Sus nombres se conservan como auditores y NO se promedian en el ranking general ni en los gráficos de supervisores operativos.'],
    ['- Supervisores Generales de turno: Aldo Bautista y Pedro Morante.'],
  ];

  const wsGuia = XLSX.utils.aoa_to_sheet(guiaRows);
  XLSX.utils.book_append_sheet(wb, wsGuia, 'GUIA_FORMATO');

  return wb;
};

/**
 * Parsea el libro Excel completo de supervisores, actualizando:
 * 1. La matriz mensual (supervisorsData: semanas, notas semanales, promedios mensuales y por sup general)
 * 2. Las observaciones detalladas extraídas de las hojas RRHH, SIG y Operaciones
 */
export const parseSupervisorExcelWorkbook = (
  buffer: ArrayBuffer,
  fileName: string
): ParsedSupervisorWorkbookResult => {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetNames = wb.SheetNames;

  if (sheetNames.length === 0) {
    throw new Error('El archivo Excel no contiene ninguna hoja de cálculo válida.');
  }

  // 1. Identificar hojas principales
  const consolidadoSheetName =
    sheetNames.find((s) => {
      const up = s.toUpperCase();
      return (
        up.includes('CONSOLID') ||
        up.includes('OPERAC') ||
        up.includes('BASE') ||
        up.includes('GENERAL') ||
        up.includes('SUPERVISOR')
      );
    }) || sheetNames[0];
  const hasConsolidadoSheet = sheetNames.some((s) => {
    const up = s.toUpperCase();
    return up.includes('CONSOLID') || up.includes('OPERAC') || up.includes('BASE') || up.includes('GENERAL') || up.includes('SUPERVISOR');
  });

  const rrhhSheetName = sheetNames.find((s) => {
    const up = s.toUpperCase();
    return up.includes('RRHH') || up.includes('RH') || up.includes('RECURSOS') || up.includes('HUMANO');
  });

  const sigSheetName = sheetNames.find((s) => {
    const up = s.toUpperCase();
    return up.includes('SIG') || up.includes('SEGURIDAD') || up.includes('SST') || up.includes('MEDIO');
  });

  const obsGeneralSheetName = sheetNames.find((s) => {
    const up = s.toUpperCase();
    return (
      (up.includes('OBSERV') || up.includes('HALLAZGO') || up.includes('DETALLE')) &&
      s !== rrhhSheetName &&
      s !== sigSheetName &&
      s !== consolidadoSheetName
    );
  });

  const extractedObservations: SupervisorObservation[] = [];
  const consolidatedDates = new Set<string>();
  const supervisorsByEvaluationMap = new Map<string, Set<string>>();
  const supervisorGeneralMap = new Map<string, string>(); // SUPERVISOR -> SUP GENERAL
  const knownSupervisorsSet = new Set<string>();

  const buildEvaluationKeys = (dateKey: string | null, area: string, process: string, objective: string) => {
    if (!dateKey) return [];
    const normalizedArea = normalizeJoinValue(area);
    const normalizedProcess = normalizeJoinValue(process);
    const normalizedObjective = normalizeJoinValue(objective);
    const keys: string[] = [];

    if (normalizedArea && normalizedProcess && normalizedObjective) {
      keys.push(`${dateKey}|${normalizedArea}|${normalizedProcess}|${normalizedObjective}`);
    }
    if (normalizedArea && normalizedProcess) keys.push(`${dateKey}|${normalizedArea}|${normalizedProcess}`);
    if (normalizedArea && normalizedObjective) keys.push(`${dateKey}|${normalizedArea}|${normalizedObjective}`);
    if (normalizedArea) keys.push(`${dateKey}|${normalizedArea}`);
    return keys;
  };

  const addEvaluationMatch = (dateKey: string | null, area: string, process: string, objective: string, supervisor: string) => {
    buildEvaluationKeys(dateKey, area, process, objective).forEach((key) => {
      if (!supervisorsByEvaluationMap.has(key)) supervisorsByEvaluationMap.set(key, new Set());
      supervisorsByEvaluationMap.get(key)!.add(supervisor);
    });
  };

  const findEvaluationSupervisors = (dateKey: string, area: string, process: string, objective: string) => {
    const keys = buildEvaluationKeys(dateKey, area, process, objective);
    const normalizedArea = normalizeJoinValue(area);
    const normalizedProcess = normalizeJoinValue(process);
    const normalizedObjective = normalizeJoinValue(objective);
    const preferredKey = normalizedArea && normalizedProcess && normalizedObjective
      ? keys[0]
      : normalizedArea && normalizedProcess
      ? keys.find((key) => key.split('|').length === 3)
      : normalizedArea && normalizedObjective
      ? keys.find((key) => key.split('|').length === 3)
      : keys.find((key) => key.split('|').length === 2);
    const matches = preferredKey ? supervisorsByEvaluationMap.get(preferredKey) : undefined;
    return matches ? Array.from(matches) : [];
  };

  // Clonar base de datos previa para preservar meses no incluidos en la carga
  const updatedSupervisorsData: Record<MonthKey, MonthData> = { ...SUPERVISORS_DATA };

  // Estructura intermedia para agrupar datos por Mes -> Supervisor -> Semana
  interface SupWeekData {
    op: number | null;
    rh: number | null;
    sg: number | null;
    total: number | null;
  }
  const monthlySupData = new Map<MonthKey, Map<string, Map<number, SupWeekData[]>>>();
  const monthlyEvaluations = new Map<MonthKey, Map<string, import('../data/supervisorsData').SupervisorRecord['evaluations']>>();
  const monthlyWeeks = new Map<MonthKey, Set<number>>();
  const monthlySupGeneral = new Map<MonthKey, Map<string, string>>();

  const storeWeekData = (month: MonthKey, supervisor: string, supervisorGeneral: string, week: number, data: SupWeekData) => {
    if (!monthlySupData.has(month)) monthlySupData.set(month, new Map());
    if (!monthlyWeeks.has(month)) monthlyWeeks.set(month, new Set());
    if (!monthlySupGeneral.has(month)) monthlySupGeneral.set(month, new Map());
    monthlyWeeks.get(month)!.add(week);
    monthlySupGeneral.get(month)!.set(supervisor, supervisorGeneral);

    const supervisors = monthlySupData.get(month)!;
    if (!supervisors.has(supervisor)) supervisors.set(supervisor, new Map());
    const weeks = supervisors.get(supervisor)!;
    if (!weeks.has(week)) weeks.set(week, []);
    weeks.get(week)!.push(data);
  };

  // 2. PARSEAR HOJA 1: CONSOLIDADO DE OPERACIONES
  const consolSheet = wb.Sheets[consolidadoSheetName];
  if (consolSheet) {
    const consolRows: any[] = XLSX.utils.sheet_to_json(consolSheet, { defval: '' });

    consolRows.forEach((row, idx) => {
      const sup = String(getRowValue(row, ['SUPERVISOR', 'NOMBRE SUPERVISOR', 'RESPONSABLE', 'NOMBRE'])).trim();
      if (!sup || sup.length < 3) return;

      const supGeneral =
        String(getRowValue(row, ['SUP GENERAL', 'SUP_GENERAL', 'SUPERVISOR GENERAL', 'JEFE'])).trim() || 'Aldo Bautista';
      const rawMes = getRowValue(row, ['MES', 'PERIODO']);
      const rawFechaValue = getRowValue(row, ['FECHA', 'FEC']);
      const fechaKey = normalizeDateKey(rawFechaValue);
      const rawFecha = formatDateForDisplay(rawFechaValue, fechaKey);
      if (fechaKey) consolidatedDates.add(fechaKey);
      const mesKey = normalizeMonthKey(rawMes) || normalizeMonthKey(rawFecha) || 'SET';
      const rawSemana = getRowValue(row, ['SEMANA', 'SEM', 'WK']);
      const semana = parseInt(String(rawSemana).replace(/\D/g, ''), 10);
      const area = String(getRowValue(row, ['AREA', 'UBICACION', 'ZONA'])).trim();
      const proceso = String(getRowValue(row, ['PROCESOS', 'PROCESO', 'ACTIVIDAD'])).trim();
      const objetivo = String(getRowValue(row, ['OBETIVO', 'OBJETIVO', 'CRITERIO', 'DESEMPENO', 'DESEMPEÑO', 'ESTANDAR'])).trim();
      const observacion = String(getRowValue(row, ['OBSERVACION', 'OBSERVACIONES', 'HALLAZGO', 'MOTIVO'])).trim();
      const criterio = objetivo || proceso || 'Operaciones';

      if (!AUDITOR_NAMES.some((a) => sup.toLowerCase().includes(a.toLowerCase()))) {
        knownSupervisorsSet.add(sup);
      }

      if (sup && supGeneral) {
        supervisorGeneralMap.set(sup, supGeneral);
      }
      addEvaluationMatch(fechaKey, area, proceso, objetivo || criterio, sup);

      // Valores porcentuales de las columnas del usuario (recalculadas por fórmula):
      // VALOR OP 60%, VALOR RRHH 20%, VALOR SIG 20%, VALOR TOTAL
      const op60 = parseScoreVal(
        getRowValue(row, ['VALOR_OP_60', 'VALOR OP 60%', 'VALOR OP 60', 'OP 60%', 'OP 60', 'OPERACIONES'])
      );
      const rh20 = parseScoreVal(
        getRowValue(row, ['VALOR_RRHH_20', 'VALOR RRHH 20%', 'VALOR RH 20%', 'RRHH 20%', 'RH 20%', 'VALOR_RH_20'])
      );
      const sg20 = parseScoreVal(
        getRowValue(row, ['VALOR_SIG_20', 'VALOR SIG 20%', 'VALOR SIG 20', 'SIG 20%', 'SIG 20', 'VALOR_SIG'])
      );
      const valTotal = parseScoreVal(getRowValue(row, ['VALOR_TOTAL', 'VALOR TOTAL', 'TOTAL', 'NOTA TOTAL']));

      if (fechaKey && !isNaN(semana) && semana > 0) {
        if (!monthlyEvaluations.has(mesKey)) monthlyEvaluations.set(mesKey, new Map());
        const evaluationsBySupervisor = monthlyEvaluations.get(mesKey)!;
        if (!evaluationsBySupervisor.has(sup)) evaluationsBySupervisor.set(sup, []);
        evaluationsBySupervisor.get(sup)!.push({
          date: rawFecha,
          dateKey: fechaKey,
          week: semana,
          area,
          process: proceso,
          objective: objetivo,
          op: op60,
          rh: rh20,
          sg: sg20,
          total: valTotal,
        });
      }

      // Detectar columnas semanales horizontales (ej. SEM 36, SEM 37, SEM_1, SEM_2)
      const weekCols: { colKey: string; weekNum: number }[] = [];
      Object.keys(row).forEach((k) => {
        const norm = cleanColName(k);
        const match = norm.match(/^SEM(?:ANA)?[\s_]*(\d+)$/) || norm.match(/^WK?[\s_]*(\d+)$/);
        if (match) {
          weekCols.push({ colKey: k, weekNum: parseInt(match[1], 10) });
        }
      });

      if (weekCols.length > 0 && mesKey) {
        // Formato horizontal con columnas por semana
        weekCols.forEach(({ colKey, weekNum }) => {
          const cellVal = parseScoreVal(row[colKey]);
          storeWeekData(mesKey, sup, supGeneral, weekNum, {
            op: op60,
            rh: rh20,
            sg: sg20,
            total: cellVal,
          });
        });
      } else if (mesKey && !isNaN(semana) && semana > 0) {
        // Formato vertical fila por semana
        storeWeekData(mesKey, sup, supGeneral, semana, {
          op: op60,
          rh: rh20,
          sg: sg20,
          total: valTotal,
        });
      }

      // Si hay observación en la hoja de operaciones, registrarla como componente 'Operaciones'
      if (
        observacion &&
        observacion.length > 3 &&
        !AUDITOR_NAMES.some((a) => sup.toLowerCase().includes(a.toLowerCase()))
      ) {
        const descVal = op60 != null ? Math.max(0, (0.6 - op60) * 100) : 5.0;
        extractedObservations.push({
          id: `OP-${mesKey}-S${semana || 0}-${idx + 1}`,
          supervisor: sup,
          mes: mesKey,
          semana: !isNaN(semana) ? semana : undefined,
          componente: 'Operaciones',
          criterio: criterio,
          descuentoPct: descVal > 0 ? descVal : 4.0,
          observacion,
          auditor: 'Karla Bolivar',
          severidad: descVal > 8 ? 'alta' : descVal > 4 ? 'media' : 'baja',
          accionRequerida: 'Seguimiento en reunión de inicio de turno.',
          estado: 'Pendiente',
          fecha: rawFecha || new Date().toLocaleDateString('es-PE'),
        });
      }
    });
  }

  const allKnownSups = Array.from(knownSupervisorsSet);

  // 3. PARSEAR HOJA 2: RRHH (OBSERVACIONES Y MOTIVOS DEL PILAR HUMANO)
  if (rrhhSheetName) {
    const rrhhSheet = wb.Sheets[rrhhSheetName];
    if (rrhhSheet) {
      const rrhhRows: any[] = XLSX.utils.sheet_to_json(rrhhSheet, { defval: '' });

      rrhhRows.forEach((row, idx) => {
        const observacion = String(getRowValue(row, ['OBSERVACION', 'OBSERVACIONES', 'HALLAZGO', 'MOTIVO', 'COMENTARIO'])).trim();
        if (!observacion || observacion.length < 3) return;

        const area = String(getRowValue(row, ['AREA', 'UBICACION', 'ZONA'])).trim();
        const proceso = String(getRowValue(row, ['PROCESOS', 'PROCESO', 'ACTIVIDAD'])).trim();
        const objetivo = String(getRowValue(row, ['OBETIVO', 'OBJETIVO', 'CRITERIO', 'INDICADOR'])).trim();
        const fechaValue = getRowValue(row, ['FECHA', 'FEC']);
        const fechaKey = normalizeDateKey(fechaValue);
        const fecha = formatDateForDisplay(fechaValue, fechaKey);
        if (!fechaKey || !consolidatedDates.has(fechaKey)) return;
        const rawMes = getRowValue(row, ['MES', 'PERIODO']);
        const mesKey = normalizeMonthKey(rawMes) || normalizeMonthKey(fecha) || 'SET';
        const rawSemana = getRowValue(row, ['SEMANA', 'SEM', 'WK']);
        const semana = parseInt(String(rawSemana).replace(/\D/g, ''), 10);
        const auditor = String(getRowValue(row, ['AUDITOR', 'EVALUADOR', 'AUDITADO POR'])).trim() || 'Karla Bolivar';
        const severidadRaw = String(getRowValue(row, ['SEVERIDAD', 'PRIORIDAD', 'IMPACTO'])).toLowerCase();
        const accion = String(getRowValue(row, ['ACCION_REQUERIDA', 'ACCION', 'CORRECTIVA', 'RECOMENDACION'])).trim();
        const estado = (String(getRowValue(row, ['ESTADO', 'STATUS'])).trim() as any) || 'Pendiente';

        // Hojas RRHH/SIG no siempre incluyen supervisor; vincular la evaluación por sus campos compartidos.
        let supervisor = String(getRowValue(row, ['SUPERVISOR', 'NOMBRE', 'RESPONSABLE'])).trim();
        if (!supervisor) {
          const detected = detectSupervisorInText(observacion, allKnownSups);
          if (detected) supervisor = detected;
        }
        const matchedSupervisors = supervisor
          ? [supervisor]
          : findEvaluationSupervisors(fechaKey!, area, proceso, objetivo);

        const rhVal = parseScoreVal(getRowValue(row, ['VALOR_RH_20', 'VALOR RRHH', 'VALOR RH 20%', 'VALOR RH 20', 'VALOR RRHH 20%']));
        const descVal = rhVal != null ? Math.max(0, (0.2 - rhVal) * 100) : 7.4;

        let severidad: 'alta' | 'media' | 'baja' = 'media';
        if (severidadRaw.includes('alta') || descVal > 6) severidad = 'alta';
        else if (severidadRaw.includes('baja') || descVal <= 3) severidad = 'baja';

        const targetSupervisors = matchedSupervisors;

        targetSupervisors.forEach((supName) => {
          if (AUDITOR_NAMES.some((a) => supName.toLowerCase().includes(a.toLowerCase()))) return;

          extractedObservations.push({
            id: `RRHH-${mesKey}-S${semana || 0}-${idx + 1}-${supName.slice(0, 3)}`,
            supervisor: supName,
            mes: mesKey,
            semana: !isNaN(semana) ? semana : undefined,
            componente: 'RRHH',
            criterio: objetivo || proceso || 'Asistencia y Personal a Cargo',
            descuentoPct: descVal > 0 ? descVal : 7.4,
            observacion,
            auditor,
            severidad,
            accionRequerida: accion || 'Revisión estricta de asistencia y coordinación de reemplazos con RRHH.',
            estado: estado === 'Levantada' || estado === 'En Proceso' ? estado : 'Pendiente',
            fecha: fecha || new Date().toLocaleDateString('es-PE'),
          });
        });
      });
    }
  }

  // 4. PARSEAR HOJA 3: SIG (OBSERVACIONES Y HALLAZGOS SST Y MEDIO AMBIENTE)
  if (sigSheetName) {
    const sigSheet = wb.Sheets[sigSheetName];
    if (sigSheet) {
      const sigRows: any[] = XLSX.utils.sheet_to_json(sigSheet, { defval: '' });

      sigRows.forEach((row, idx) => {
        const observacion = String(getRowValue(row, ['OBSERVACION', 'OBSERVACIONES', 'HALLAZGO', 'MOTIVO', 'COMENTARIO'])).trim();
        if (!observacion || observacion.length < 3) return;

        const auditor = String(getRowValue(row, ['AUDITOR', 'EVALUADOR', 'AUDITADO POR'])).trim() || 'Makley Villanueva';
        const area = String(getRowValue(row, ['AREA', 'UNIFICACION AREA', 'UBICACION', 'ZONA'])).trim();
        const proceso = String(getRowValue(row, ['PROCESOS', 'PROCESO', 'ACTIVIDAD'])).trim();
        const objetivo = String(getRowValue(row, ['OBETIVO', 'OBJETIVO', 'CRITERIO', 'ESTANDAR'])).trim();
        const fechaValue = getRowValue(row, ['FECHA', 'FEC']);
        const fechaKey = normalizeDateKey(fechaValue);
        const fecha = formatDateForDisplay(fechaValue, fechaKey);
        if (!fechaKey || !consolidatedDates.has(fechaKey)) return;
        const rawMes = getRowValue(row, ['MES', 'PERIODO']);
        const mesKey = normalizeMonthKey(rawMes) || normalizeMonthKey(fecha) || 'SET';
        const rawSemana = getRowValue(row, ['SEMANA', 'SEM', 'WK']);
        const semana = parseInt(String(rawSemana).replace(/\D/g, ''), 10);
        const severidadRaw = String(getRowValue(row, ['SEVERIDAD', 'PRIORIDAD', 'IMPACTO'])).toLowerCase();
        const accion = String(getRowValue(row, ['ACCION_REQUERIDA', 'ACCION', 'CORRECTIVA', 'RECOMENDACION'])).trim();
        const estado = (String(getRowValue(row, ['ESTADO', 'STATUS'])).trim() as any) || 'Levantada';

        let supervisor = String(getRowValue(row, ['SUPERVISOR', 'NOMBRE', 'RESPONSABLE'])).trim();
        if (!supervisor) {
          const detected = detectSupervisorInText(observacion, allKnownSups);
          if (detected) supervisor = detected;
        }
        const matchedSupervisors = supervisor
          ? [supervisor]
          : findEvaluationSupervisors(fechaKey!, area, proceso, objetivo);

        const sigVal = parseScoreVal(getRowValue(row, ['VALOR_SIG_20', 'VALOR SIG', 'VALOR SIG 20%', 'VALOR SIG 20', 'SIG 20%']));
        const descVal = sigVal != null ? Math.max(0, (0.2 - sigVal) * 100) : 4.0;

        let severidad: 'alta' | 'media' | 'baja' = 'media';
        if (severidadRaw.includes('alta') || descVal > 5) severidad = 'alta';
        else if (severidadRaw.includes('baja') || descVal <= 2) severidad = 'baja';

        const targetSupervisors = matchedSupervisors;

        targetSupervisors.forEach((supName) => {
          if (AUDITOR_NAMES.some((a) => supName.toLowerCase().includes(a.toLowerCase()))) return;

          extractedObservations.push({
            id: `SIG-${mesKey}-S${semana || 0}-${idx + 1}-${supName.slice(0, 3)}`,
            supervisor: supName,
            mes: mesKey,
            semana: !isNaN(semana) ? semana : undefined,
            componente: 'SIG',
            criterio: objetivo || proceso || 'Seguridad y Charlas de 5 Minutos',
            descuentoPct: descVal > 0 ? descVal : 4.0,
            observacion,
            auditor,
            severidad,
            accionRequerida: accion || 'Cumplimiento irrestricto de normas de seguridad, llenado de ATS y orden 5S.',
            estado: estado === 'Pendiente' || estado === 'En Proceso' ? estado : 'Levantada',
            fecha: fecha || new Date().toLocaleDateString('es-PE'),
          });
        });
      });
    }
  }

  // 5. PARSEAR HOJA ADICIONAL DE OBSERVACIONES GENERALES SI EXISTE
  if (obsGeneralSheetName) {
    const obsSheet = wb.Sheets[obsGeneralSheetName];
    if (obsSheet) {
      const rawRows: any[] = XLSX.utils.sheet_to_json(obsSheet, { defval: '' });
      rawRows.forEach((row, idx) => {
        const sup = String(getRowValue(row, ['SUPERVISOR', 'NOMBRE', 'RESPONSABLE'])).trim();
        const obs = String(getRowValue(row, ['OBSERVACION', 'HALLAZGO', 'MOTIVO', 'COMENTARIO'])).trim();
        if (!sup || !obs || AUDITOR_NAMES.some((a) => sup.toLowerCase().includes(a.toLowerCase()))) return;

        const rawComp = String(getRowValue(row, ['COMPONENTE', 'AREA', 'PILAR'])).toUpperCase();
        let comp: 'Operaciones' | 'RRHH' | 'SIG' = 'Operaciones';
        if (rawComp.includes('RRHH') || rawComp.includes('HUMANO') || rawComp.includes('PERSONAL')) comp = 'RRHH';
        else if (rawComp.includes('SIG') || rawComp.includes('SEGURIDAD') || rawComp.includes('SST')) comp = 'SIG';

        const rawMes = getRowValue(row, ['MES', 'PERIODO']);
        const mesKey = normalizeMonthKey(rawMes) || 'SET';
        const rawSem = parseInt(String(getRowValue(row, ['SEMANA', 'SEM'])).replace(/\D/g, ''), 10);
        const desc = parseFloat(String(getRowValue(row, ['DESCUENTO', 'PUNTOS', 'PENALIDAD'])).replace(',', '.')) || 4.5;
        const aud = String(getRowValue(row, ['AUDITOR', 'EVALUADOR'])).trim() || 'Karla Bolivar';
        const crit = String(getRowValue(row, ['CRITERIO', 'ITEM', 'DESEMPENO'])).trim() || 'Control de Procesos';

        extractedObservations.push({
          id: `GEN-${mesKey}-${idx + 1}`,
          supervisor: sup,
          mes: mesKey,
          semana: !isNaN(rawSem) ? rawSem : undefined,
          componente: comp,
          criterio: crit,
          descuentoPct: desc > 1 ? desc : desc * 100,
          observacion: obs,
          auditor: aud,
          severidad: desc > 8 ? 'alta' : desc > 4 ? 'media' : 'baja',
          accionRequerida: String(getRowValue(row, ['ACCION', 'CORRECTIVA'])).trim() || undefined,
          estado: 'Pendiente',
          fecha: new Date().toLocaleDateString('es-PE'),
        });
      });
    }
  }

  // 6. RECONSTRUIR MonthData PARA CADA MES DETECTADO EN EL ARCHIVO
  let updatedMonthsCount = 0;
  monthlySupData.forEach((supsInMonth, mesKey) => {
    const weekNumbers = Array.from(monthlyWeeks.get(mesKey) || []).sort((a, b) => a - b);
    if (weekNumbers.length === 0) return;

    updatedMonthsCount++;
    const supervisorRecords: SupervisorRecord[] = [];
    const average = (values: (number | null)[]): number | null => {
      const valid = values.filter((value): value is number => value != null);
      return valid.length > 0 ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
    };

    supsInMonth.forEach((weekMap, supName) => {
      const opArray: (number | null)[] = [];
      const rhArray: (number | null)[] = [];
      const sgArray: (number | null)[] = [];
      const totalArray: (number | null)[] = [];

      weekNumbers.forEach((w) => {
        const weekRows = weekMap.get(w) || [];
        opArray.push(average(weekRows.map((row) => row.op)));
        rhArray.push(average(weekRows.map((row) => row.rh)));
        sgArray.push(average(weekRows.map((row) => row.sg)));
        totalArray.push(average(weekRows.map((row) => row.total)));
      });

      const validTotals = Array.from(weekMap.values())
        .flatMap((weekRows) => weekRows.map((row) => row.total))
        .filter((value): value is number => value != null);
      const avgTotal =
        validTotals.length > 0 ? validTotals.reduce((a, b) => a + b, 0) / validTotals.length : 0.8;
      const supGeneral =
        monthlySupGeneral.get(mesKey)?.get(supName) || supervisorGeneralMap.get(supName) || 'Aldo Bautista';

      supervisorRecords.push({
        n: supName,
        t: supGeneral,
        a: avgTotal,
        evaluations: monthlyEvaluations.get(mesKey)?.get(supName) || [],
        total: totalArray,
        op: opArray,
        rh: rhArray,
        sg: sgArray,
      });
    });

    // Ordenar de mayor a menor calificación
    supervisorRecords.sort((a, b) => b.a - a.a);

    // Promedio total semanal wt
    const wt: number[] = weekNumbers.map((weekNumber) => {
      const weekVals = Array.from(supsInMonth.values())
        .flatMap((weekMap) => (weekMap.get(weekNumber) || []).map((row) => row.total))
        .filter((value): value is number => value != null);
      return weekVals.length > 0 ? weekVals.reduce((a, b) => a + b, 0) / weekVals.length : 0.83;
    });

    // Promedio por Supervisor General (ESTRICTAMENTE Aldo Bautista y Pedro Morante; NUNCA Karla Bolivar ni Makley)
    const generalMap = new Map<string, number[]>();
    supervisorRecords.forEach((s) => {
      if (isAuditorName(s.n) || isAuditorName(s.t)) return;
      if (!s.t || s.t === 'Auditoría') return;
      if (!generalMap.has(s.t)) generalMap.set(s.t, []);
      generalMap.get(s.t)!.push(s.a);
    });

    const generalScores: GeneralSupervisorScore[] = [];
    generalMap.forEach((scores, gName) => {
      if (isAuditorName(gName)) return;
      generalScores.push({
        n: gName,
        a: scores.reduce((a, b) => a + b, 0) / scores.length,
      });
    });

    const validAll = supervisorRecords.map((s) => s.a);
    const monthGeneralAvg =
      validAll.length > 0 ? validAll.reduce((a, b) => a + b, 0) / validAll.length : 0.83;

    updatedSupervisorsData[mesKey] = {
      w: weekNumbers,
      s: supervisorRecords,
      wt,
      t: generalScores,
      g: monthGeneralAvg,
    };
  });

  // Si no se extrajeron observaciones nuevas pero sí la matriz, fusionar con las semillas
  const finalObservations =
    extractedObservations.length > 0 || hasConsolidadoSheet
      ? extractedObservations
      : INITIAL_SUPERVISOR_OBSERVATIONS;

  const opCount = finalObservations.filter((o) => o.componente === 'Operaciones').length;
  const rhCount = finalObservations.filter((o) => o.componente === 'RRHH').length;
  const sigCount = finalObservations.filter((o) => o.componente === 'SIG').length;

  return {
    supervisorsData: updatedSupervisorsData,
    observations: finalObservations,
    stats: {
      monthsCount: updatedMonthsCount,
      supervisorsCount: knownSupervisorsSet.size || 6,
      observationsCount: finalObservations.length,
      opObsCount: opCount,
      rhObsCount: rhCount,
      sigObsCount: sigCount,
      detectedSheets: sheetNames,
      sheetSummary: {
        hasConsolidado: !!consolidadoSheetName,
        hasRRHH: !!rrhhSheetName,
        hasSIG: !!sigSheetName,
      },
    },
  };
};
