export interface SupervisorRecord {
  n: string; // Nombre del supervisor
  t: string; // Supervisor general asignado
  a: number; // Promedio total (0 - 1)
  evaluations?: SupervisorEvaluation[];
  total?: (number | null)[]; // Total semanal exacto importado del consolidado
  op: (number | null)[]; // Operaciones (60%) por semana
  rh: (number | null)[]; // RRHH (20%) por semana
  sg: (number | null)[]; // SIG (20%) por semana
}

export interface SupervisorEvaluation {
  date: string;
  dateKey: string;
  week: number;
  area: string;
  process: string;
  objective: string;
  op: number | null;
  rh: number | null;
  sg: number | null;
  total: number | null;
}

export interface GeneralSupervisorScore {
  n: string; // Nombre del supervisor general
  a: number; // Promedio general (0 - 1)
}

export interface MonthData {
  w: number[]; // Lista de números de semana
  s: SupervisorRecord[]; // Lista de supervisores
  wt: number[]; // Evolución del total promedio por semana
  t: GeneralSupervisorScore[]; // Promedio por supervisor general
  g: number; // Promedio mensual general
}

export type MonthKey = 'ENE' | 'FEB' | 'MAR' | 'ABR' | 'MAY' | 'JUN' | 'JUL' | 'AGO' | 'SET' | 'OCT' | 'NOV' | 'DIC';

export const AUDITOR_NAMES = ['Karla Bolivar', 'Makley Villanueva'] as const;

export const isAuditorName = (name?: string | null): boolean => {
  if (!name) return false;
  const clean = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  return clean.includes('karla') || clean.includes('bolivar') || clean.includes('makley') || clean.includes('villanueva');
};

export type QuarterKey = 'T1' | 'T2' | 'T3' | 'T4';

export interface QuarterDefinition {
  key: QuarterKey;
  label: string;
  shortLabel: string;
  months: MonthKey[];
}

export const QUARTERS: QuarterDefinition[] = [
  { key: 'T1', label: 'Primer Trimestre (Enero – Marzo)', shortLabel: 'T1 (Ene - Mar)', months: ['ENE', 'FEB', 'MAR'] },
  { key: 'T2', label: 'Segundo Trimestre (Abril – Junio)', shortLabel: 'T2 (Abr - Jun)', months: ['ABR', 'MAY', 'JUN'] },
  { key: 'T3', label: 'Tercer Trimestre (Julio – Setiembre)', shortLabel: 'T3 (Jul - Set)', months: ['JUL', 'AGO', 'SET'] },
  { key: 'T4', label: 'Cuarto Trimestre (Octubre – Diciembre)', shortLabel: 'T4 (Oct - Dic)', months: ['OCT', 'NOV', 'DIC'] },
];

export interface SupervisorObservation {
  id: string;
  supervisor: string;
  mes: MonthKey;
  semana?: number;
  componente: 'Operaciones' | 'RRHH' | 'SIG';
  criterio: string;
  descuentoPct: number; // En porcentaje / puntos descontados
  observacion: string;
  auditor: string;
  severidad: 'alta' | 'media' | 'baja';
  accionRequerida?: string;
  estado: 'Pendiente' | 'Levantada' | 'En Proceso';
  fecha?: string;
}

export const INITIAL_SUPERVISOR_OBSERVATIONS: SupervisorObservation[] = [
  // --- PEDRO OLIVA ---
  {
    id: 'OBS-PO-SET-01',
    supervisor: 'Pedro Oliva',
    mes: 'SET',
    semana: 38,
    componente: 'Operaciones',
    criterio: 'Control de Pallets Observados y Tiempos de Regularización',
    descuentoPct: 6.8,
    observacion: 'Se encontraron 12 pallets observados en zona de buffer con más de 72 horas sin levantar en el WMS. Falta de seguimiento con los analistas de inventario.',
    auditor: 'Karla Bolivar',
    severidad: 'alta',
    accionRequerida: 'Priorizar regularización diaria y emitir reporte de bloqueo al inicio de turno.',
    estado: 'Pendiente',
    fecha: '18/09/2026',
  },
  {
    id: 'OBS-PO-SET-02',
    supervisor: 'Pedro Oliva',
    mes: 'SET',
    semana: 39,
    componente: 'Operaciones',
    criterio: 'Puntualidad en Despachos y Cumplimiento de Citas',
    descuentoPct: 5.2,
    observacion: 'Demora de 55 minutos en el inicio de consolidación de la rampa 4 debido a falta de coordinación en la asignación de apiladores.',
    auditor: 'Makley Villanueva',
    severidad: 'media',
    accionRequerida: 'Establecer pre-alerta de equipos 30 minutos antes de la llegada de transporte.',
    estado: 'En Proceso',
    fecha: '25/09/2026',
  },
  {
    id: 'OBS-PO-SET-03',
    supervisor: 'Pedro Oliva',
    mes: 'SET',
    semana: 37,
    componente: 'RRHH',
    criterio: 'Asistencia y Puntualidad del Personal a Cargo',
    descuentoPct: 7.4,
    observacion: 'Se registraron 4 tardanzas y 1 inasistencia no justificada de operadores de radiofrecuencia durante el turno de noche sin reemplazo oportuno.',
    auditor: 'Karla Bolivar',
    severidad: 'alta',
    accionRequerida: 'Revisión obligatoria del parte de asistencia a las 22:15h y aplicar medidas disciplinarias según RIT.',
    estado: 'Pendiente',
    fecha: '11/09/2026',
  },
  {
    id: 'OBS-PO-SET-04',
    supervisor: 'Pedro Oliva',
    mes: 'SET',
    semana: 36,
    componente: 'SIG',
    criterio: 'Charlas de Seguridad de 5 Minutos y Registro de ATS',
    descuentoPct: 4.0,
    observacion: 'Falta de firmas en el formato de charla de 5 minutos del día martes y formato ATS incompleto en zona de racks pasillo 14.',
    auditor: 'Makley Villanueva',
    severidad: 'media',
    accionRequerida: 'Llenado y firma digital inmediata antes del arranque de operaciones.',
    estado: 'Levantada',
    fecha: '03/09/2026',
  },
  {
    id: 'OBS-PO-AGO-01',
    supervisor: 'Pedro Oliva',
    mes: 'AGO',
    semana: 34,
    componente: 'Operaciones',
    criterio: 'Orden y Limpieza de Pasillos de Almacenamiento (5S)',
    descuentoPct: 4.5,
    observacion: 'Parihuelas rotas y film plástico acumulado en pasillos principales que obstaculizaban el tránsito fluido de montacargas.',
    auditor: 'Karla Bolivar',
    severidad: 'media',
    accionRequerida: 'Implementar checklist 5S al cierre de cada ventana horaria.',
    estado: 'Levantada',
    fecha: '20/08/2026',
  },

  // --- LIZ MINAYA ---
  {
    id: 'OBS-LM-SET-01',
    supervisor: 'Liz Minaya',
    mes: 'SET',
    semana: 37,
    componente: 'Operaciones',
    criterio: 'Rotulación y Correcta Identificación de Carga',
    descuentoPct: 4.5,
    observacion: 'Pallets ubicados en racks nivel 3 sin etiquetas de código de barras visibles para lectura con radiofrecuencia (Pocket).',
    auditor: 'Makley Villanueva',
    severidad: 'media',
    accionRequerida: 'Capacitación a operarios de estiba sobre colocación de etiqueta visible a cara externa.',
    estado: 'Levantada',
    fecha: '10/09/2026',
  },
  {
    id: 'OBS-LM-SET-02',
    supervisor: 'Liz Minaya',
    mes: 'SET',
    semana: 39,
    componente: 'Operaciones',
    criterio: 'Exactitud en Conteos Cíclicos de Inventario',
    descuentoPct: 3.8,
    observacion: 'Diferencia de 8 cajas entre el conteo físico del inventario cíclico y lo registrado en el WMS en la familia de abarrotes.',
    auditor: 'Karla Bolivar',
    severidad: 'media',
    accionRequerida: 'Reconteo inmediato con supervisor de inventarios y regularización de kardex.',
    estado: 'En Proceso',
    fecha: '24/09/2026',
  },
  {
    id: 'OBS-LM-SET-03',
    supervisor: 'Liz Minaya',
    mes: 'SET',
    semana: 38,
    componente: 'RRHH',
    criterio: 'Gestión de Horas Extras y Descansos del Personal',
    descuentoPct: 7.4,
    observacion: 'Registro de horas extras ingresado extemporáneamente fuera de la ventana límite de nómina y 2 colaboradores con fatiga acumulada.',
    auditor: 'Karla Bolivar',
    severidad: 'alta',
    accionRequerida: 'Respetar rol de descansos obligatorios de 12 horas entre turnos.',
    estado: 'Pendiente',
    fecha: '17/09/2026',
  },
  {
    id: 'OBS-LM-SET-04',
    supervisor: 'Liz Minaya',
    mes: 'SET',
    semana: 36,
    componente: 'SIG',
    criterio: 'Uso Obligatorio de EPP en Zonas de Riesgo',
    descuentoPct: 4.0,
    observacion: 'Dos operarios auxiliares sin barbiquejo en casco y chaleco reflectivo sucio no reglamentario en zona de muelles.',
    auditor: 'Makley Villanueva',
    severidad: 'baja',
    accionRequerida: 'Reemplazo inmediato de chalecos por parte de almacén de suministros.',
    estado: 'Levantada',
    fecha: '04/09/2026',
  },

  // --- JAITER GIRÓN ---
  {
    id: 'OBS-JG-SET-01',
    supervisor: 'Jaiter Girón',
    mes: 'SET',
    semana: 40,
    componente: 'Operaciones',
    criterio: 'Despacho de Mercadería de Alto Valor y Precintado',
    descuentoPct: 3.9,
    observacion: 'Falta de firma de conformidad de precinto en guía de remisión electrónica de furgón 42. Carga completa pero proceso documental incompleto.',
    auditor: 'Karla Bolivar',
    severidad: 'media',
    accionRequerida: 'Checklist de cierre de contenedor obligatorio antes de dar pase a portería.',
    estado: 'Levantada',
    fecha: '29/09/2026',
  },
  {
    id: 'OBS-JG-SET-02',
    supervisor: 'Jaiter Girón',
    mes: 'SET',
    semana: 38,
    componente: 'RRHH',
    criterio: 'Clima Laboral y Capacitaciones Operativas',
    descuentoPct: 7.4,
    observacion: 'Descuento transversal del componente RRHH por políticas generales de control de asistencia de la sede.',
    auditor: 'Makley Villanueva',
    severidad: 'media',
    accionRequerida: 'Seguimiento de cumplimiento semanal.',
    estado: 'En Proceso',
    fecha: '16/09/2026',
  },
  {
    id: 'OBS-JG-SET-03',
    supervisor: 'Jaiter Girón',
    mes: 'SET',
    semana: 37,
    componente: 'SIG',
    criterio: 'Inspección Pre-Uso de Equipos de Tracción Mecánica',
    descuentoPct: 4.0,
    observacion: 'Transpaleta manual con rueda desgastada no reportada en el checklist diario de seguridad antes de su uso.',
    auditor: 'Karla Bolivar',
    severidad: 'baja',
    accionRequerida: 'Retiro preventivo del equipo y derivación a mantenimiento técnico.',
    estado: 'Levantada',
    fecha: '09/09/2026',
  },

  // --- MARCO SILVA ---
  {
    id: 'OBS-MS-SET-01',
    supervisor: 'Marco Silva',
    mes: 'SET',
    semana: 39,
    componente: 'Operaciones',
    criterio: 'Productividad en Picking y Tasa de Errores',
    descuentoPct: 14.3,
    observacion: 'Caída significativa en ratio de bultos/hora en pasillos 5 al 9. Se detectaron 6 pedidos cruzados en la zona de auditoría previa al despacho.',
    auditor: 'Karla Bolivar',
    severidad: 'alta',
    accionRequerida: 'Reentrenamiento de pickeadores novatos y doble verificación obligatoria por escaneo Pocket.',
    estado: 'Pendiente',
    fecha: '25/09/2026',
  },
  {
    id: 'OBS-MS-SET-02',
    supervisor: 'Marco Silva',
    mes: 'SET',
    semana: 38,
    componente: 'Operaciones',
    criterio: 'Estiba Segura y Retracción de Pallets',
    descuentoPct: 10.1,
    observacion: 'Dos pallets con cajas vencidas por mala base de estiba con riesgo de colapso en altura. Se requirió re-estiba de emergencia.',
    auditor: 'Makley Villanueva',
    severidad: 'alta',
    accionRequerida: 'Supervisión presencial en la formación de bases pesadas antes de elevar pallets.',
    estado: 'Levantada',
    fecha: '19/09/2026',
  },
  {
    id: 'OBS-MS-SET-03',
    supervisor: 'Marco Silva',
    mes: 'SET',
    semana: 37,
    componente: 'RRHH',
    criterio: 'Puntualidad en Relevo de Turnos',
    descuentoPct: 7.4,
    observacion: 'Relevo entre turno tarde y noche con 35 minutos de vacío operativo sin supervisor presente en el punto de encuentro.',
    auditor: 'Karla Bolivar',
    severidad: 'alta',
    accionRequerida: 'Coordinación presencial obligatoria con firma de acta de relevo.',
    estado: 'Pendiente',
    fecha: '11/09/2026',
  },
  {
    id: 'OBS-MS-SET-04',
    supervisor: 'Marco Silva',
    mes: 'SET',
    semana: 36,
    componente: 'SIG',
    criterio: 'Bloqueo y Señalización de Pasillos en Maniobras',
    descuentoPct: 4.0,
    observacion: 'Operador de montacargas trabajando en altura sin conos de seguridad delimitando el radio de caída en el pasillo adyacente.',
    auditor: 'Makley Villanueva',
    severidad: 'alta',
    accionRequerida: 'Uso irrestricto de cinta de seguridad y conos retractables.',
    estado: 'Levantada',
    fecha: '02/09/2026',
  },

  // --- KEVIN TAMARA ---
  {
    id: 'OBS-KT-ABR-01',
    supervisor: 'Kevin Tamara',
    mes: 'ABR',
    semana: 18,
    componente: 'Operaciones',
    criterio: 'Cumplimiento de Metas Diarias y Horarios de Cierre',
    descuentoPct: 26.0,
    observacion: 'Fuerte caída en el cierre operativo semanal (nota OP 34%). 18 despachos quedaron pendientes para el día siguiente por falta de balanceo de líneas.',
    auditor: 'Karla Bolivar',
    severidad: 'alta',
    accionRequerida: 'Intervención de jefatura de operaciones y reestructuración del plan de turnos.',
    estado: 'Pendiente',
    fecha: '29/04/2026',
  },
  {
    id: 'OBS-KT-ABR-02',
    supervisor: 'Kevin Tamara',
    mes: 'ABR',
    semana: 17,
    componente: 'RRHH',
    criterio: 'Presentación y Disciplina del Personal',
    descuentoPct: 7.4,
    observacion: 'Reclamos por trato inadecuado y demoras en asignación de roles operativos.',
    auditor: 'Makley Villanueva',
    severidad: 'media',
    accionRequerida: 'Reunión de retroalimentación con gerencia de RRHH.',
    estado: 'En Proceso',
    fecha: '22/04/2026',
  },
  {
    id: 'OBS-KT-ABR-03',
    supervisor: 'Kevin Tamara',
    mes: 'ABR',
    semana: 16,
    componente: 'SIG',
    criterio: 'Orden en Salidas de Emergencia y Zonas de Evacuación',
    descuentoPct: 4.0,
    observacion: 'Pallets vacíos colocados frente a la puerta de emergencia número 3 del almacén central.',
    auditor: 'Karla Bolivar',
    severidad: 'alta',
    accionRequerida: 'Despeje inmediato de vías de evacuación.',
    estado: 'Levantada',
    fecha: '15/04/2026',
  },

  // --- MARCO SILVA (Ingreso en Mayo 2026 - Jefe: Pedro Morante) ---
  {
    id: 'OBS-MS-MAY-01',
    supervisor: 'Marco Silva',
    mes: 'MAY',
    semana: 19,
    componente: 'Operaciones',
    criterio: 'Planificación de Recursos y Cobertura de Equipos',
    descuentoPct: 14.3,
    observacion: 'Inducción operativa inicial en Mayo: 3 montacargas sin operador asignado en hora punta durante proceso de relevo bajo supervisión de jefatura (Pedro Morante).',
    auditor: 'Karla Bolivar',
    severidad: 'alta',
    accionRequerida: 'Reasignación inmediata de choferes certificados coordinada con Pedro Morante.',
    estado: 'Levantada',
    fecha: '08/05/2026',
  },
  {
    id: 'OBS-MS-MAY-02',
    supervisor: 'Marco Silva',
    mes: 'MAY',
    semana: 20,
    componente: 'SIG',
    criterio: 'Inspección de Equipos de Emergencia y Botiquines',
    descuentoPct: 4.0,
    observacion: 'Falta de insumos básicos en el botiquín de primeros auxilios del sector norte en área de picking.',
    auditor: 'Makley Villanueva',
    severidad: 'baja',
    accionRequerida: 'Reposición coordinada con tópico médico y validación con jefatura.',
    estado: 'Levantada',
    fecha: '15/05/2026',
  },
];

export const MONTH_LABELS: Record<MonthKey, string> = {
  ENE: 'Enero',
  FEB: 'Febrero',
  MAR: 'Marzo',
  ABR: 'Abril',
  MAY: 'Mayo',
  JUN: 'Junio',
  JUL: 'Julio',
  AGO: 'Agosto',
  SET: 'Setiembre',
  OCT: 'Octubre',
  NOV: 'Noviembre',
  DIC: 'Diciembre',
};

export const SUPERVISORS_DATA: Record<MonthKey, MonthData> = {
  ENE: {
    w: [1, 2, 3, 4, 5],
    s: [
      { n: "Karla Bolivar", t: "Auditoría", a: 0.886, op: [0.6, 0.6, 0.6, 0.6, 0.6], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Makley Villanueva", t: "Auditoría", a: 0.8842, op: [0.6, 0.6, 0.5989, 0.5951, 0.6], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Pedro Oliva", t: "Aldo Bautista", a: 0.8603, op: [0.5918, 0.5765, 0.5771, 0.5749, 0.5711], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Liz Minaya", t: "Aldo Bautista", a: 0.8281, op: [0.5606, 0.564, 0.5629, 0.5571, 0.5567], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Kevin Tamara", t: "Pedro Morante", a: 0.8228, op: [0.5957, 0.56, 0.5633, 0.5027, 0.5187], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Jaiter Girón", t: "Pedro Morante", a: 0.7964, op: [0.5548, 0.5532, 0.5442, 0.5508, 0.5486], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] }
    ],
    wt: [0.8544, 0.8505, 0.8482, 0.8391, 0.8425],
    t: [{ n: "Aldo Bautista", a: 0.8404 }, { n: "Pedro Morante", a: 0.8072 }],
    g: 0.8455
  },
  FEB: {
    w: [6, 7, 8, 9],
    s: [
      { n: "Karla Bolivar", t: "Auditoría", a: 0.886, op: [0.6, 0.6, 0.6, 0.6], rh: [0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16] },
      { n: "Makley Villanueva", t: "Auditoría", a: 0.8849, op: [0.6, 0.6, 0.6, 0.5956], rh: [0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16] },
      { n: "Kevin Tamara", t: "Pedro Morante", a: 0.8194, op: [0.556, 0.5287, 0.4992, 0.524], rh: [0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16] },
      { n: "Pedro Oliva", t: "Aldo Bautista", a: 0.8143, op: [0.5482, 0.5269, 0.5216, 0.5258], rh: [0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16] },
      { n: "Liz Minaya", t: "Aldo Bautista", a: 0.8067, op: [0.5566, 0.5417, 0.5355, 0.5344], rh: [0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16] },
      { n: "Jaiter Girón", t: "Pedro Morante", a: 0.788, op: [0.547, 0.5467, 0.5383, 0.5316], rh: [0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16] }
    ],
    wt: [0.8437, 0.8315, 0.8238, 0.8276],
    t: [{ n: "Aldo Bautista", a: 0.8096 }, { n: "Pedro Morante", a: 0.8009 }],
    g: 0.8321
  },
  MAR: {
    w: [10, 11, 12, 13, 14],
    s: [
      { n: "Karla Bolivar", t: "Auditoría", a: 0.886, op: [0.6, 0.6, 0.6, 0.6, 0.6], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Makley Villanueva", t: "Auditoría", a: 0.886, op: [0.6, 0.6, 0.6, 0.6, 0.6], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Pedro Oliva", t: "Aldo Bautista", a: 0.8405, op: [0.5144, 0.5542, 0.5689, 0.5771, 0.5741], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Jaiter Girón", t: "Pedro Morante", a: 0.8236, op: [0.5055, 0.5494, 0.577, 0.5288, 0.5829], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Liz Minaya", t: "Aldo Bautista", a: 0.7992, op: [0.5147, 0.5719, 0.5353, 0.5086, 0.4934], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Kevin Tamara", t: "Pedro Morante", a: 0.7919, op: [0.5333, 0.5443, 0.48, 0.534, 0.5267], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] }
    ],
    wt: [0.8199, 0.8481, 0.8379, 0.8351, 0.8415],
    t: [{ n: "Aldo Bautista", a: 0.8148 }, { n: "Pedro Morante", a: 0.813 }],
    g: 0.8358
  },
  ABR: {
    w: [14, 15, 16, 17, 18],
    s: [
      { n: "Karla Bolivar", t: "Auditoría", a: 0.886, op: [0.6, 0.6, 0.6, 0.6, 0.6], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Makley Villanueva", t: "Auditoría", a: 0.8842, op: [0.6, 0.594, 0.5988, 0.6, 0.6], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Jaiter Girón", t: "Pedro Morante", a: 0.8347, op: [0.5641, 0.4984, 0.5777, 0.5743, 0.5669], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Pedro Oliva", t: "Aldo Bautista", a: 0.8214, op: [0.561, 0.5346, 0.5652, 0.5136, 0.51], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Liz Minaya", t: "Aldo Bautista", a: 0.771, op: [0.4688, 0.5005, 0.5085, 0.4988, 0.5039], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Kevin Tamara", t: "Pedro Morante", a: 0.7374, op: [0.4457, 0.4211, 0.4591, 0.408, 0.34], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] }
    ],
    wt: [0.8227, 0.8106, 0.8365, 0.8245, 0.822],
    t: [{ n: "Aldo Bautista", a: 0.7901 }, { n: "Pedro Morante", a: 0.8023 }],
    g: 0.8235
  },
  MAY: {
    w: [19, 20, 21, 22],
    s: [
      { n: "Karla Bolivar", t: "Auditoría", a: 0.886, op: [0.6, 0.6, 0.6, 0.6], rh: [0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16] },
      { n: "Makley Villanueva", t: "Auditoría", a: 0.8825, op: [0.5988, 0.5964, 0.5976, 0.5928], rh: [0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16] },
      { n: "Jaiter Girón", t: "Pedro Morante", a: 0.8412, op: [0.5649, 0.5481, 0.5489, 0.572], rh: [0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16] },
      { n: "Pedro Oliva", t: "Aldo Bautista", a: 0.8016, op: [0.5446, 0.4528, 0.5064, 0.5572], rh: [0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16] },
      { n: "Marco Silva", t: "Pedro Morante", a: 0.7764, op: [0.4573, 0.5216, 0.4995, 0.4833], rh: [0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16] },
      { n: "Liz Minaya", t: "Aldo Bautista", a: 0.7544, op: [0.4906, 0.4382, 0.5058, 0.5061], rh: [0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16] }
    ],
    wt: [0.8253, 0.8032, 0.8214, 0.8329],
    t: [{ n: "Aldo Bautista", a: 0.7723 }, { n: "Pedro Morante", a: 0.8136 }],
    g: 0.8207
  },
  JUN: {
    w: [23, 24, 25, 26, 27],
    s: [
      { n: "Karla Bolivar", t: "Auditoría", a: 0.886, op: [0.6, 0.6, 0.6, 0.6, 0.6], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Makley Villanueva", t: "Auditoría", a: 0.886, op: [0.6, 0.6, 0.6, 0.6, 0.6], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Jaiter Girón", t: "Pedro Morante", a: 0.8756, op: [0.5856, 0.5938, 0.5843, 0.5966, 0.6], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Pedro Oliva", t: "Aldo Bautista", a: 0.8489, op: [0.546, 0.5562, 0.5622, 0.5843, 0.5333], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Liz Minaya", t: "Aldo Bautista", a: 0.8316, op: [0.5625, 0.5807, 0.5756, 0.545, 0.5463], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Marco Silva", t: "Pedro Morante", a: 0.7952, op: [0.5169, 0.4728, 0.4995, 0.4957, 0.5181], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] }
    ],
    wt: [0.8532, 0.8592, 0.8594, 0.8555, 0.8489],
    t: [{ n: "Aldo Bautista", a: 0.8382 }, { n: "Pedro Morante", a: 0.8488 }],
    g: 0.8565
  },
  JUL: {
    w: [27, 28, 29, 30, 31],
    s: [
      { n: "Karla Bolivar", t: "Auditoría", a: 0.886, op: [0.6, 0.6, 0.6, 0.6, 0.6], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Makley Villanueva", t: "Auditoría", a: 0.8857, op: [0.6, 0.6, 0.6, 0.5992, 0.599], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Jaiter Girón", t: "Pedro Morante", a: 0.8759, op: [0.5863, 0.5976, 0.5957, 0.5937, 0.5786], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Marco Silva", t: "Pedro Morante", a: 0.8272, op: [0.5962, 0.5977, 0.5741, 0.5385, 0.426], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Pedro Oliva", t: "Aldo Bautista", a: 0.8246, op: [0.5566, 0.5636, 0.5364, 0.5276, 0.4889], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Liz Minaya", t: "Aldo Bautista", a: 0.785, op: [0.5783, 0.5418, 0.5355, 0.483, 0.4749], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] }
    ],
    wt: [0.8669, 0.8611, 0.8521, 0.8347, 0.8074],
    t: [{ n: "Aldo Bautista", a: 0.8 }, { n: "Pedro Morante", a: 0.8597 }],
    g: 0.8464
  },
  AGO: {
    w: [32, 33, 34, 35, 36],
    s: [
      { n: "Karla Bolivar", t: "Auditoría", a: 0.886, op: [0.6, 0.6, 0.6, 0.6, 0.6], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Makley Villanueva", t: "Auditoría", a: 0.886, op: [0.6, 0.6, 0.6, 0.6, 0.6], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Jaiter Girón", t: "Pedro Morante", a: 0.8767, op: [0.598, 0.5912, 0.6, 0.582, 0.57], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Liz Minaya", t: "Aldo Bautista", a: 0.8331, op: [0.5193, 0.5677, 0.5843, 0.5808, 0.4957], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Pedro Oliva", t: "Aldo Bautista", a: 0.8132, op: [0.4996, 0.5273, 0.5242, 0.4927, 0.5242], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Marco Silva", t: "Pedro Morante", a: 0.7187, op: [0.5783, 0.4575, 0.4644, 0.4027, 0.3676], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] }
    ],
    wt: [0.8521, 0.8452, 0.8522, 0.8341, 0.8084],
    t: [{ n: "Aldo Bautista", a: 0.8256 }, { n: "Pedro Morante", a: 0.824 }],
    g: 0.8437
  },
  SET: {
    w: [36, 37, 38, 39, 40],
    s: [
      { n: "Karla Bolivar", t: "Auditoría", a: 0.886, op: [0.6, 0.6, 0.6, 0.6, 0.6], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Makley Villanueva", t: "Auditoría", a: 0.8857, op: [0.6, 0.6, 0.5988, 0.5999, 0.6], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Jaiter Girón", t: "Pedro Morante", a: 0.8724, op: [0.5882, 0.5865, 0.5837, 0.5974, 0.5609], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Marco Silva", t: "Pedro Morante", a: 0.8073, op: [0.5952, 0.5105, 0.499, 0.4571, 0.4533], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Liz Minaya", t: "Aldo Bautista", a: 0.8005, op: [0.5287, 0.5514, 0.5263, 0.5372, 0.5388], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] },
      { n: "Pedro Oliva", t: "Aldo Bautista", a: 0.7711, op: [0.4985, 0.4703, 0.4606, 0.4788, 0.4606], rh: [0.126, 0.126, 0.126, 0.126, 0.126], sg: [0.16, 0.16, 0.16, 0.16, 0.16] }
    ],
    wt: [0.8531, 0.8434, 0.8324, 0.8356, 0.8224],
    t: [{ n: "Aldo Bautista", a: 0.7894 }, { n: "Pedro Morante", a: 0.8507 }],
    g: 0.8396
  },
  OCT: { w: [], s: [], wt: [], t: [], g: 0 },
  NOV: { w: [], s: [], wt: [], t: [], g: 0 },
  DIC: { w: [], s: [], wt: [], t: [], g: 0 },
};
