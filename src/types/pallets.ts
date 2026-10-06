export type PalletStatus = 'REGULARIZADA' | 'PENDIENTE' | 'REGULARIZADO';

export interface PalletObservation {
  id: string;
  palletId: string; // N°PALLET (e.g. PL954002812494)
  fecha: string; // FECHA REGISTRO en formato legible DD/MM/YYYY
  mes: string; // MES (e.g. AGOSTO, SETIEMBRE)
  semana: string; // SEMANA normalizada (e.g. "Semana 39")
  responsable: string; // Supervisor/Encargado A CARGO DE LEVANTAR la observación
  cargo?: string; // CARGO (e.g. SUPERVISOR)
  area: string; // AREA (e.g. CROSS DOCKING, PICKING, DESPACHO)
  horaEmpaquetado?: string; // Registro de hora de empaquetado
  estadoEmpaque?: string; // ESTADO (Entregado, Empacado, Enviado, etc.)
  observacion: string; // OBSERVACION (no cumple con la altura, falta de digitalización...)
  subMotivo?: string; // SUB-MOTIVO (fueron despachados sin levantar la observacion...)
  fechaRegularizacion?: string | null; // FECHA REGULARIZADA en formato DD/MM/YYYY
  estado: PalletStatus; // ESTATUS (REGULARIZADA / PENDIENTE)
  leadTimeDias: number; // lead time (0, 1, 2, 3...)
  responsablePendiente?: string; // Área/Actor que NO ESTÁ LEVANTANDO la observación (Picking, Despacho, Cross)
  ubicacion?: string; // Ubicación en drop/bahía si aplica
  accionCorrectiva?: string;
  evidenciaCompartida?: boolean; // Si se adjuntó foto / sustento al regularizar
}

export interface PalletDashboardData {
  records: PalletObservation[];
  fileName?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  isUserUploaded?: boolean;
}

/**
 * Convierte cualquier formato de fecha (números seriales de Excel como 46288, strings ISO, o DD/MM/YYYY)
 * a formato legible 'DD/MM/YYYY'
 */
export function formatToDDMMYYYY(val: any): string {
  if (val === undefined || val === null || val === '') return '';

  // 1. Si es un número serial de Excel (e.g. 46288, 46289)
  const num = Number(val);
  if (!isNaN(num) && num > 25000 && num < 75000) {
    // 25569 es el número de días entre 1/1/1900 y 1/1/1970 (Excel base date)
    const utc_days = Math.floor(num - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    const day = String(date_info.getUTCDate()).padStart(2, '0');
    const month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
    const year = date_info.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }

  const str = String(val).trim();

  // 2. Si es número en string (e.g. "46288")
  if (/^\d{5}$/.test(str)) {
    const parsedNum = parseInt(str, 10);
    if (parsedNum > 25000 && parsedNum < 75000) {
      const utc_days = Math.floor(parsedNum - 25569);
      const utc_value = utc_days * 86400;
      const date_info = new Date(utc_value * 1000);
      const day = String(date_info.getUTCDate()).padStart(2, '0');
      const month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
      const year = date_info.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }
  }

  // 3. Formato ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.split('T')[0].split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  // 4. Formato D/M/YYYY o DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
    const parts = str.split('/');
    return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
  }

  return str;
}

/**
 * Normaliza cualquier formato de semana ("39", "semana 39", "SEMANA 39", "Sem. 39")
 * a un formato único consistente: "Semana 39"
 */
export function normalizeSemana(raw: any): string {
  if (raw === undefined || raw === null) return 'Semana 39';
  const str = String(raw).trim();
  const match = str.match(/\d+/);
  if (match) {
    return `Semana ${parseInt(match[0], 10)}`;
  }
  return str.toUpperCase();
}

/**
 * Normaliza nombres de meses ("SETIEMBRE" y "SEPTIEMBRE" unificados)
 */
export function normalizeMes(raw: any): string {
  if (!raw) return 'SETIEMBRE';
  const str = String(raw).trim().toUpperCase();
  if (str === 'SEPTIEMBRE') return 'SETIEMBRE';
  return str;
}

export type SubMotivoType = 'ACCIONABLE' | 'DESPACHADO' | 'NO_EN_ZONA' | 'OTRO';

export interface SubMotivoInfo {
  type: SubMotivoType;
  label: string;
  isLevantable: boolean;
  colorClass: string;
  badgeClass: string;
  description: string;
}

export function classifySubMotivo(rawSubMotivo?: string | null): SubMotivoInfo {
  const clean = String(rawSubMotivo || '').trim();

  // Caso 1: "-" o vacío -> "Aún pueden ser levantados" (No se ha levantado, aún se puede gestionar)
  if (!clean || clean === '-' || clean === '--' || clean.toLowerCase() === 'sin sub-motivo' || clean.toLowerCase() === 'sin motivo') {
    return {
      type: 'ACCIONABLE',
      label: '-',
      isLevantable: true,
      colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-300',
      badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
      description: 'Aún pueden ser levantados (Pendiente de levantamiento en piso)',
    };
  }

  // Caso 2: "fueron despachados sin levantar la observacion" -> Ya no se puede hacer nada
  if (clean.toLowerCase().includes('despachados sin levantar') || clean.toLowerCase().includes('despachado sin levantar')) {
    return {
      type: 'DESPACHADO',
      label: 'Fueron despachados sin levantar la observación',
      isLevantable: false,
      colorClass: 'text-rose-700 bg-rose-50 border-rose-300',
      badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300',
      description: 'Mercadería ya despachada (No subsanable / Ya no se puede hacer nada)',
    };
  }

  // Caso 3: "Pallet ubicados logicamente en el drop, pero no fueron dejados en la zona fisica correspondiente"
  if (
    clean.toLowerCase().includes('drop') &&
    (clean.toLowerCase().includes('no fueron dejados') || clean.toLowerCase().includes('zona fisica'))
  ) {
    return {
      type: 'NO_EN_ZONA',
      label: 'Pallet en drop pero no dejado en zona física correspondiente',
      isLevantable: false,
      colorClass: 'text-amber-800 bg-amber-50 border-amber-300',
      badgeClass: 'bg-amber-100 text-amber-800 border border-amber-300',
      description: 'No ubicados en zona física correspondiente (No pueden levantarse)',
    };
  }

  // Caso 4: Otros submotivos específicos
  return {
    type: 'OTRO',
    label: clean,
    isLevantable: false,
    colorClass: 'text-blue-700 bg-blue-50 border-blue-300',
    badgeClass: 'bg-blue-100 text-blue-800 border border-blue-300',
    description: clean,
  };
}

/**
 * Determina de forma precisa y dinámica si para un pallet regularizado se compartió evidencia (foto / sustento)
 */
export function checkEvidenciaCompartida(r: PalletObservation): boolean {
  if (r.evidenciaCompartida !== undefined && r.evidenciaCompartida !== null) {
    return Boolean(r.evidenciaCompartida);
  }

  const combined = `${r.observacion || ''} ${r.subMotivo || ''} ${r.accionCorrectiva || ''}`.toLowerCase();

  // Exclusiones explícitas de evidencia
  if (
    combined.includes('sin evidencia') ||
    combined.includes('sin envío de evidencia') ||
    combined.includes('falta evidencia') ||
    combined.includes('sin foto') ||
    combined.includes('no adjuntó') ||
    combined.includes('sin sustento')
  ) {
    return false;
  }

  // Confirmaciones explícitas de evidencia adjunta
  if (
    combined.includes('evidencia adjunta') ||
    combined.includes('evidencia compartida') ||
    combined.includes('foto adjunta') ||
    combined.includes('foto enviada') ||
    combined.includes('con evidencia') ||
    combined.includes('foto de regularización') ||
    combined.includes('sustento fotográfico')
  ) {
    return true;
  }

  // Acciones correctivas concretas de regularización documentada
  const sub = String(r.subMotivo || '').toLowerCase();
  if (
    sub.includes('re-paletizado') ||
    sub.includes('re-etiquetado') ||
    sub.includes('conforme') ||
    sub.includes('alineado y zunchado') ||
    sub.includes('transvase') ||
    sub.includes('aplicación de') ||
    sub.includes('reubicación de rotulado')
  ) {
    return true;
  }

  // Por defecto, si solo dice "Regularizado en turno", "Corregido", o "-" sin foto formal
  return false;
}

/**
 * Agrupa las observaciones de origen de pallets regularizados en categorías claras e intuitivas
 */
export function classifyMotivoRegularizado(observacion?: string | null): string {
  const o = String(observacion || '').toLowerCase().trim();
  if (!o || o === '-' || o === '--') return 'Otros Motivos Operativos';

  if (o.includes('film') || o.includes('emplay') || o.includes('strech') || o.includes('base del euro')) {
    return 'Film Insuficiente en Base / Euro';
  }
  if (o.includes('altura') || o.includes('metro') || o.includes('alto') || o.includes('desborde')) {
    return 'Altura Fuera de Estándar Requerido';
  }
  if (o.includes('rotul') || o.includes('tienda') || o.includes('etiqueta') || o.includes('lpn') || o.includes('identifica')) {
    return 'Rotulación / Identificación de Tienda';
  }
  if (o.includes('inclinad') || o.includes('zuncho') || o.includes('estabil') || o.includes('ladead') || o.includes('caíd')) {
    return 'Inclinación / Falta de Sujeción (Zuncho)';
  }
  if (o.includes('taco') || o.includes('euro') || o.includes('plástico') || o.includes('pallet roto') || o.includes('dañado')) {
    return 'Estado Físico de Pallet / Euro';
  }

  return 'Otros Motivos Operativos';
}

