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

  // Si viene una fecha DD/MM/YYYY o YYYY-MM-DD
  const dateMatch = str.match(/[\/\-](\d{1,2})[\/\-]/);
  if (dateMatch) {
    const monthNum = parseInt(dateMatch[1], 10);
    const monthKeys: MonthKey[] = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SET'];
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

// Limpiador de cadenas de texto de encabezados
export const cleanColName = (key: string): string => {
  return String(key || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

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
 * 1. CONSOLIDADO_OPERACIONES (con notas recalculadas al 60%, 20% y 20%)
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
    'SUP_GENERAL',
    'AREA',
    'PROCESO',
    'DESEMPEÑO',
    'VALOR_OP_60',
    'VALOR_RRHH_20',
    'VALOR_SIG_20',
    'VALOR_TOTAL',
    'SEMANA',
    'MES',
    'OBSERVACION',
  ];

  const consolRows = [
    consolHeaders,
    ['18/09/2026', 'Pedro Oliva', 'Aldo Bautista', 'Almacenamiento', 'Control de Inventario', 'Pallets Observados y Regularización', 49.85, 12.60, 16.00, 78.45, 38, 'SET', '12 pallets con más de 72h sin regularizar en buffer.'],
    ['25/09/2026', 'Pedro Oliva', 'Aldo Bautista', 'Almacenamiento', 'Despacho y Flujo', 'Puntualidad en Rampa', 47.03, 12.60, 16.00, 75.63, 39, 'SET', 'Demora de 55 min en consolidación rampa 4.'],
    ['02/10/2026', 'Pedro Oliva', 'Aldo Bautista', 'Almacenamiento', 'Productividad Turno', 'Cumplimiento de Turno', 46.06, 12.60, 16.00, 74.66, 40, 'SET', 'Baja cadencia de rotación pasillo central.'],
    ['18/09/2026', 'Liz Minaya', 'Aldo Bautista', 'Despacho', 'Rotulación y Estiba', 'Etiquetado de Pallets', 52.87, 12.60, 16.00, 81.47, 38, 'SET', 'Pallets en nivel 3 con etiquetas no visibles a radiofrecuencia.'],
    ['25/09/2026', 'Liz Minaya', 'Aldo Bautista', 'Despacho', 'Control de Inventario Cíclico', 'Exactitud de Conteos', 55.14, 12.60, 16.00, 83.74, 39, 'SET', 'Diferencia de 8 cajas en conteo de abarrotes.'],
    ['02/10/2026', 'Liz Minaya', 'Aldo Bautista', 'Despacho', 'Auditoría Pre-despacho', 'Control de Furgones', 53.72, 12.60, 16.00, 82.32, 40, 'SET', 'Faltó checklist de precintado en furgón 18.'],
    ['18/09/2026', 'Jaiter Girón', 'Pedro Morante', 'Recepción', 'Recepción de Mercadería', 'Verificación de Guías', 58.82, 12.60, 16.00, 87.42, 38, 'SET', 'Recepción conforme con pequeña demora en ingreso a WMS.'],
    ['25/09/2026', 'Jaiter Girón', 'Pedro Morante', 'Recepción', 'Descarga y Estiba', 'Inspección de Parihuelas', 58.65, 12.60, 16.00, 87.25, 39, 'SET', '2 parihuelas rajadas detectadas antes de almacenar.'],
    ['02/10/2026', 'Jaiter Girón', 'Pedro Morante', 'Recepción', 'Despacho de Mercadería', 'Firma de Conformidad', 59.74, 12.60, 16.00, 88.34, 40, 'SET', 'Conformidad de precinto sin novedad.'],
    ['18/09/2026', 'Marco Silva', 'Pedro Morante', 'Picking', 'Picking y Clasificación', 'Productividad en Picking', 59.52, 12.60, 16.00, 88.12, 38, 'SET', 'Cumplimiento óptimo de líneas por hora.'],
    ['25/09/2026', 'Marco Silva', 'Pedro Morante', 'Picking', 'Auditoría Previa', 'Tasa de Errores', 51.05, 12.60, 16.00, 79.65, 39, 'SET', '6 pedidos cruzados en zona de auditoría previa.'],
    ['02/10/2026', 'Marco Silva', 'Pedro Morante', 'Picking', 'Orden y Limpieza', '5S en Pasillos de Picking', 45.71, 12.60, 16.00, 74.31, 40, 'SET', 'Cajas vacías acumuladas al pie de estantería.'],
  ];

  const wsConsol = XLSX.utils.aoa_to_sheet(consolRows);
  XLSX.utils.book_append_sheet(wb, wsConsol, 'CONSOLIDADO_OPERACIONES');

  // HOJA 2: RRHH
  const rrhhHeaders = [
    'FECHA',
    'SUPERVISOR',
    'AREA',
    'PROCESOS',
    'OBJETIVO',
    'VALORACION',
    'VALOR_RH_20',
    'OBSERVACION',
    'AUDITOR',
    'SEVERIDAD',
    'ACCION_REQUERIDA',
    'ESTADO',
  ];

  const rrhhRows = [
    rrhhHeaders,
    ['11/09/2026', 'Pedro Oliva', 'Almacenamiento', 'Gestión de Asistencia', 'Asistencia y Puntualidad del Personal a Cargo', 63.0, 12.60, 'Se registraron 4 tardanzas y 1 inasistencia no justificada de operadores de radiofrecuencia durante el turno de noche sin reemplazo oportuno.', 'Karla Bolivar', 'Alta', 'Revisión obligatoria del parte de asistencia a las 22:15h y aplicar medidas disciplinarias según RIT.', 'Pendiente'],
    ['18/09/2026', 'Pedro Oliva', 'Almacenamiento', 'Horas Extras y Descansos', 'Control de Horas Extras y Descanso Médico', 63.0, 12.60, 'Planilla de horas extras enviada con 2 días de retraso fuera del cierre contable semanal.', 'Karla Bolivar', 'Media', 'Establecer reporte preliminar de sobretiempos los días viernes a las 18:00h.', 'En Proceso'],
    ['11/09/2026', 'Liz Minaya', 'Despacho', 'Gestión de Asistencia', 'Gestión de Horas Extras y Descansos', 63.0, 12.60, 'Registro de horas extras ingresado extemporáneamente fuera de la ventana límite de aprobación en el sistema.', 'Karla Bolivar', 'Alta', 'Respetar rol de descansos obligatorios de 12 horas entre turnos sucesivos.', 'Pendiente'],
    ['18/09/2026', 'Liz Minaya', 'Despacho', 'Dotación de Turno', 'Cobertura de Puestos Críticos', 63.0, 12.60, '1 operador de apilador cubriendo funciones sin inducción de seguridad actualizada.', 'Karla Bolivar', 'Media', 'Validar credencial y pase de RRHH antes de permitir operación.', 'Levantada'],
    ['11/09/2026', 'Jaiter Girón', 'Recepción', 'Clima y Comunicación', 'Charlas Motivacionales y Asistencia', 63.0, 12.60, 'Asistencia general con 2 tardanzas leves en ingreso de turno tarde.', 'Karla Bolivar', 'Baja', 'Monitoreo preventivo con jefatura de guardia.', 'Levantada'],
    ['11/09/2026', 'Marco Silva', 'Picking', 'Rotación de Personal', 'Capacitación en Puesto de Trabajo', 63.0, 12.60, '3 operarios nuevos asignados a picking sin haber completado la prueba de velocidad de escaneo.', 'Karla Bolivar', 'Media', 'Completar matriz de polivalencia antes de asignar pedidos urgentes.', 'En Proceso'],
  ];

  const wsRRHH = XLSX.utils.aoa_to_sheet(rrhhRows);
  XLSX.utils.book_append_sheet(wb, wsRRHH, 'RRHH');

  // HOJA 3: SIG
  const sigHeaders = [
    'FECHA',
    'AUDITOR',
    'SUPERVISOR',
    'AREA',
    'PROCESOS',
    'OBJETIVO',
    'VALORACION',
    'VALOR_SIG_20',
    'OBSERVACION',
    'SEVERIDAD',
    'ACCION_REQUERIDA',
    'ESTADO',
  ];

  const sigRows = [
    sigHeaders,
    ['03/09/2026', 'Makley Villanueva', 'Pedro Oliva', 'Almacenamiento', 'Seguridad y Salud en el Trabajo', 'Charlas de Seguridad de 5 Minutos y Registro de ATS', 80.0, 16.00, 'Falta de firmas en el formato de charla de 5 minutos del día martes y formato ATS incompleto en zona de racks pasillo 14.', 'Media', 'Llenado y firma digital inmediata antes del arranque de operaciones.', 'Levantada'],
    ['10/09/2026', 'Makley Villanueva', 'Pedro Oliva', 'Almacenamiento', 'Orden y Limpieza 5S', 'Orden y Limpieza en Pasillos Principales', 80.0, 16.00, 'Parihuelas rotas y film plástico acumulado en pasillos principales obstaculizando el tránsito fluido de montacargas.', 'Media', 'Implementar checklist 5S al cierre de cada ventana horaria.', 'Levantada'],
    ['17/09/2026', 'Makley Villanueva', 'Liz Minaya', 'Despacho', 'Uso de EPP', 'Inspección de Equipos de Protección Personal', 80.0, 16.00, 'Dos estibadores de rampa sin guantes de maniobra reglamentarios durante la carga pesada.', 'Alta', 'Suspensión inmediata de la maniobra hasta la entrega y uso del EPP reglamentario.', 'Levantada'],
    ['24/09/2026', 'Makley Villanueva', 'Liz Minaya', 'Despacho', 'Vías de Evacuación', 'Señalización y Bloqueo de Pasadizos', 80.0, 16.00, 'Pallet de descarte ubicado temporalmente frente a extintor PQS #12 en zona de despacho este.', 'Alta', 'Despeje inmediato y demarcación de franja amarilla libre de obstáculos.', 'Levantada'],
    ['08/09/2026', 'Makley Villanueva', 'Jaiter Girón', 'Recepción', 'Equipos de Emergencia', 'Inspección de Botiquín y Lavaojos', 80.0, 16.00, 'Botiquín de primeros auxilios de recepción con precinto roto y falta de gasas estériles.', 'Baja', 'Reposición inmediata a cargo del tópico médico y precintado nuevo.', 'Levantada'],
    ['15/09/2026', 'Makley Villanueva', 'Marco Silva', 'Picking', 'Ergonomía y Carga Manual', 'Buenas Prácticas de Manipulación de Cargas', 80.0, 16.00, 'Posturas inadecuadas en levantamiento manual de bultos pesados (+25kg) sin ayuda de transpaleta.', 'Media', 'Re-inducción en técnicas de levantamiento seguro y uso obligatorio de transpaleta.', 'En Proceso'],
  ];

  const wsSIG = XLSX.utils.aoa_to_sheet(sigRows);
  XLSX.utils.book_append_sheet(wb, wsSIG, 'SIG');

  // HOJA 4: GUIA_FORMATO
  const guiaRows = [
    ['GUÍA DE ESTRUCTURA Y FÓRMULA OFICIAL – SISTEMA DE EVALUACIÓN DE SUPERVISORES 2026'],
    [''],
    ['REGLA 1: CONSOLIDADO DE OPERACIONES (HOJA 1)'],
    ['- Contiene la evaluación consolidada por supervisor, semana y mes.'],
    ['- Las columnas VALOR_OP_60 (Operaciones 60%), VALOR_RRHH_20 (RRHH 20%) y VALOR_SIG_20 (SIG 20%) ya están recalculadas de acuerdo a la fórmula oficial ponderada.'],
    ['- El VALOR_TOTAL es la suma de los 3 pilares: Total = Operaciones (60%) + RRHH (20%) + SIG (20%).'],
    ['- La meta corporativa es 98% (0.98).'],
    [''],
    ['REGLA 2: HOJA RRHH (HOJA 2)'],
    ['- Contiene el detalle de las observaciones y motivos de nota en el pilar de Recursos Humanos.'],
    ['- Registra faltas de puntualidad, tardanzas, horas extras extemporáneas, descansos médicos y gestión de turnos.'],
    ['- Auditor evaluador principal: Karla Bolívar.'],
    [''],
    ['REGLA 3: HOJA SIG (HOJA 3)'],
    ['- Contiene el detalle de las observaciones y hallazgos del Sistema Integrado de Gestión (Seguridad, Salud en el Trabajo y Medio Ambiente).'],
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
  const supervisorsByAreaMap = new Map<string, string>(); // AREA -> SUPERVISOR
  const supervisorGeneralMap = new Map<string, string>(); // SUPERVISOR -> SUP GENERAL
  const knownSupervisorsSet = new Set<string>();

  // Clonar base de datos previa para preservar meses no incluidos en la carga
  const updatedSupervisorsData: Record<MonthKey, MonthData> = { ...SUPERVISORS_DATA };

  // Estructura intermedia para agrupar datos por Mes -> Supervisor -> Semana
  interface SupWeekData {
    op: number | null;
    rh: number | null;
    sg: number | null;
    total: number | null;
  }
  const monthlySupData = new Map<MonthKey, Map<string, Map<number, SupWeekData>>>();
  const monthlyWeeks = new Map<MonthKey, Set<number>>();
  const monthlySupGeneral = new Map<MonthKey, Map<string, string>>();

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
      const rawFecha = String(getRowValue(row, ['FECHA', 'FEC'])).trim();
      const mesKey = normalizeMonthKey(rawMes) || normalizeMonthKey(rawFecha) || 'SET';
      const rawSemana = getRowValue(row, ['SEMANA', 'SEM', 'WK']);
      const semana = parseInt(String(rawSemana).replace(/\D/g, ''), 10);
      const area = String(getRowValue(row, ['AREA', 'UBICACION', 'ZONA'])).trim();
      const proceso = String(getRowValue(row, ['PROCESOS', 'PROCESO', 'ACTIVIDAD'])).trim();
      const observacion = String(getRowValue(row, ['OBSERVACION', 'OBSERVACIONES', 'HALLAZGO', 'MOTIVO'])).trim();
      const criterio =
        String(getRowValue(row, ['DESEMPENO', 'CRITERIO', 'DESEMPEÑO', 'ESTANDAR'])).trim() || proceso || 'Operaciones';

      if (!AUDITOR_NAMES.some((a) => sup.toLowerCase().includes(a.toLowerCase()))) {
        knownSupervisorsSet.add(sup);
      }

      if (area && sup) {
        supervisorsByAreaMap.set(area.toUpperCase(), sup);
      }
      if (sup && supGeneral) {
        supervisorGeneralMap.set(sup, supGeneral);
      }

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
      let valTotal = parseScoreVal(getRowValue(row, ['VALOR_TOTAL', 'VALOR TOTAL', 'TOTAL', 'NOTA TOTAL']));

      if (valTotal == null && op60 != null) {
        valTotal = (op60 ?? 0) + (rh20 ?? 0.126) + (sg20 ?? 0.16);
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
        if (!monthlySupData.has(mesKey)) monthlySupData.set(mesKey, new Map());
        if (!monthlyWeeks.has(mesKey)) monthlyWeeks.set(mesKey, new Set());
        if (!monthlySupGeneral.has(mesKey)) monthlySupGeneral.set(mesKey, new Map());

        monthlySupGeneral.get(mesKey)!.set(sup, supGeneral);
        const supsInMonth = monthlySupData.get(mesKey)!;
        if (!supsInMonth.has(sup)) supsInMonth.set(sup, new Map());

        weekCols.forEach(({ colKey, weekNum }) => {
          monthlyWeeks.get(mesKey)!.add(weekNum);
          const cellVal = parseScoreVal(row[colKey]);
          supsInMonth.get(sup)!.set(weekNum, {
            op: op60 ?? (cellVal ? Math.min(0.6, cellVal * 0.6) : null),
            rh: rh20 ?? 0.126,
            sg: sg20 ?? 0.16,
            total: cellVal,
          });
        });
      } else if (mesKey && !isNaN(semana) && semana > 0) {
        // Formato vertical fila por semana
        if (!monthlySupData.has(mesKey)) monthlySupData.set(mesKey, new Map());
        if (!monthlyWeeks.has(mesKey)) monthlyWeeks.set(mesKey, new Set());
        if (!monthlySupGeneral.has(mesKey)) monthlySupGeneral.set(mesKey, new Map());

        monthlyWeeks.get(mesKey)!.add(semana);
        monthlySupGeneral.get(mesKey)!.set(sup, supGeneral);

        const supsInMonth = monthlySupData.get(mesKey)!;
        if (!supsInMonth.has(sup)) supsInMonth.set(sup, new Map());
        supsInMonth.get(sup)!.set(semana, {
          op: op60,
          rh: rh20 ?? 0.126,
          sg: sg20 ?? 0.16,
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
        const fecha = String(getRowValue(row, ['FECHA', 'FEC'])).trim();
        const rawMes = getRowValue(row, ['MES', 'PERIODO']);
        const mesKey = normalizeMonthKey(rawMes) || normalizeMonthKey(fecha) || 'SET';
        const rawSemana = getRowValue(row, ['SEMANA', 'SEM', 'WK']);
        const semana = parseInt(String(rawSemana).replace(/\D/g, ''), 10);
        const auditor = String(getRowValue(row, ['AUDITOR', 'EVALUADOR', 'AUDITADO POR'])).trim() || 'Karla Bolivar';
        const severidadRaw = String(getRowValue(row, ['SEVERIDAD', 'PRIORIDAD', 'IMPACTO'])).toLowerCase();
        const accion = String(getRowValue(row, ['ACCION_REQUERIDA', 'ACCION', 'CORRECTIVA', 'RECOMENDACION'])).trim();
        const estado = (String(getRowValue(row, ['ESTADO', 'STATUS'])).trim() as any) || 'Pendiente';

        // Identificar supervisor: explícito, por área mapeada, o detectado en el texto de observación
        let supervisor = String(getRowValue(row, ['SUPERVISOR', 'NOMBRE', 'RESPONSABLE'])).trim();
        if (!supervisor && area) {
          supervisor = supervisorsByAreaMap.get(area.toUpperCase()) || '';
        }
        if (!supervisor) {
          const detected = detectSupervisorInText(observacion, allKnownSups);
          if (detected) supervisor = detected;
        }

        const rhVal = parseScoreVal(getRowValue(row, ['VALOR_RH_20', 'VALOR RH 20%', 'VALOR RH 20', 'VALOR RRHH 20%']));
        const descVal = rhVal != null ? Math.max(0, (0.2 - rhVal) * 100) : 7.4;

        let severidad: 'alta' | 'media' | 'baja' = 'media';
        if (severidadRaw.includes('alta') || descVal > 6) severidad = 'alta';
        else if (severidadRaw.includes('baja') || descVal <= 3) severidad = 'baja';

        const targetSupervisors = supervisor
          ? [supervisor]
          : allKnownSups.length > 0
          ? allKnownSups.slice(0, 2)
          : ['Pedro Oliva', 'Liz Minaya'];

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
        const fecha = String(getRowValue(row, ['FECHA', 'FEC'])).trim();
        const rawMes = getRowValue(row, ['MES', 'PERIODO']);
        const mesKey = normalizeMonthKey(rawMes) || normalizeMonthKey(fecha) || 'SET';
        const rawSemana = getRowValue(row, ['SEMANA', 'SEM', 'WK']);
        const semana = parseInt(String(rawSemana).replace(/\D/g, ''), 10);
        const severidadRaw = String(getRowValue(row, ['SEVERIDAD', 'PRIORIDAD', 'IMPACTO'])).toLowerCase();
        const accion = String(getRowValue(row, ['ACCION_REQUERIDA', 'ACCION', 'CORRECTIVA', 'RECOMENDACION'])).trim();
        const estado = (String(getRowValue(row, ['ESTADO', 'STATUS'])).trim() as any) || 'Levantada';

        let supervisor = String(getRowValue(row, ['SUPERVISOR', 'NOMBRE', 'RESPONSABLE'])).trim();
        if (!supervisor && area) {
          supervisor = supervisorsByAreaMap.get(area.toUpperCase()) || '';
        }
        if (!supervisor) {
          const detected = detectSupervisorInText(observacion, allKnownSups);
          if (detected) supervisor = detected;
        }

        const sigVal = parseScoreVal(getRowValue(row, ['VALOR_SIG_20', 'VALOR SIG 20%', 'VALOR SIG 20', 'SIG 20%']));
        const descVal = sigVal != null ? Math.max(0, (0.2 - sigVal) * 100) : 4.0;

        let severidad: 'alta' | 'media' | 'baja' = 'media';
        if (severidadRaw.includes('alta') || descVal > 5) severidad = 'alta';
        else if (severidadRaw.includes('baja') || descVal <= 2) severidad = 'baja';

        const targetSupervisors = supervisor
          ? [supervisor]
          : allKnownSups.length > 0
          ? allKnownSups.slice(0, 2)
          : ['Pedro Oliva', 'Liz Minaya', 'Jaiter Girón'];

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

    supsInMonth.forEach((weekMap, supName) => {
      const opArray: (number | null)[] = [];
      const rhArray: (number | null)[] = [];
      const sgArray: (number | null)[] = [];
      const totalArray: (number | null)[] = [];

      weekNumbers.forEach((w) => {
        const wData = weekMap.get(w);
        opArray.push(wData ? wData.op : null);
        rhArray.push(wData ? wData.rh : null);
        sgArray.push(wData ? wData.sg : null);
        totalArray.push(wData ? wData.total : null);
      });

      const validTotals = totalArray.filter((v): v is number => v != null);
      const avgTotal =
        validTotals.length > 0 ? validTotals.reduce((a, b) => a + b, 0) / validTotals.length : 0.8;
      const supGeneral =
        monthlySupGeneral.get(mesKey)?.get(supName) || supervisorGeneralMap.get(supName) || 'Aldo Bautista';

      supervisorRecords.push({
        n: supName,
        t: supGeneral,
        a: avgTotal,
        op: opArray,
        rh: rhArray,
        sg: sgArray,
      });
    });

    // Ordenar de mayor a menor calificación
    supervisorRecords.sort((a, b) => b.a - a.a);

    // Promedio total semanal wt
    const wt: number[] = weekNumbers.map((_, i) => {
      const weekVals = supervisorRecords
        .map((s) => {
          const op = s.op[i];
          if (op == null) return null;
          return op + (s.rh[i] ?? 0) + (s.sg[i] ?? 0);
        })
        .filter((v): v is number => v != null);
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
    extractedObservations.length > 0
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
