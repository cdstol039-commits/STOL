/**
 * Normalization utilities to ensure uniform, consistent data representation
 * across all operational dashboards (Pockets, Pallets, Memos, Montacargas).
 */

export function normalizeWeek(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return '';
  const str = String(raw).trim();
  if (!str) return '';
  
  // Extract number from string like "Semana 39", "semana 39", "39", "SEM 39", "Sem. 39", "W39"
  const digits = str.replace(/[^0-9]/g, '');
  if (digits) {
    const num = parseInt(digits, 10);
    if (num > 0 && num <= 54) {
      return `Semana ${num}`;
    }
  }
  
  return str.toUpperCase();
}

export function extractWeekNumber(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined) return 0;
  const digits = String(raw).replace(/[^0-9]/g, '');
  return parseInt(digits, 10) || 0;
}

export function normalizeMonth(raw: string | null | undefined): string {
  if (!raw) return '';
  const clean = String(raw).trim().toUpperCase();
  if (clean === 'SETIEMBRE') return 'SEPTIEMBRE';
  return clean;
}

export function normalizeArea(raw: string | null | undefined): string {
  if (!raw) return '';
  return String(raw).trim().toUpperCase();
}

export function normalizeDate(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return '';
  
  // Handle numeric Excel date serial (e.g. 45553 or 46288)
  if (typeof raw === 'number' || (!isNaN(Number(raw)) && Number(raw) > 25000 && Number(raw) < 75000)) {
    try {
      const serial = Number(raw);
      const utcDays = Math.floor(serial - 25569);
      const utcValue = utcDays * 86400;
      const dateInfo = new Date(utcValue * 1000);
      return dateInfo.toISOString().split('T')[0];
    } catch {
      // fallback
    }
  }

  const str = String(raw).trim();
  if (!str) return '';

  // If date contains T or time, get YYYY-MM-DD
  if (str.includes('T')) return str.split('T')[0];

  // Match standard YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  return str;
}

/**
 * Convierte cualquier fecha (número serial de Excel, ISO YYYY-MM-DD, 8 dígitos, Date object o string)
 * al formato estándar y legible DD/MM/YYYY para todas las tablas, filtros y dashboards.
 */
export function formatDisplayDate(
  raw: string | number | Date | null | undefined,
  fallbackMonth?: string
): string {
  if (raw === null || raw === undefined || raw === '') return '';

  // 1. Instancia Date nativa
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const d = String(raw.getUTCDate ? raw.getUTCDate() : raw.getDate()).padStart(2, '0');
    const m = String((raw.getUTCMonth ? raw.getUTCMonth() : raw.getMonth()) + 1).padStart(2, '0');
    const y = raw.getUTCFullYear ? raw.getUTCFullYear() : raw.getFullYear();
    return `${d}/${m}/${y}`;
  }

  const str = String(raw).trim();
  if (!str || str === '-' || str === '--') return '';

  const num = Number(str.replace(/,/g, ''));

  // 2. Número serial de Excel (ej: 46288, 45550 o decimales como 45550.5)
  if (!isNaN(num) && num > 25000 && num < 75000) {
    try {
      const utcDays = Math.floor(num - 25569);
      const utcValue = utcDays * 86400;
      const dateInfo = new Date(utcValue * 1000);
      const d = String(dateInfo.getUTCDate()).padStart(2, '0');
      const m = String(dateInfo.getUTCMonth() + 1).padStart(2, '0');
      const y = dateInfo.getUTCFullYear();
      return `${d}/${m}/${y}`;
    } catch {
      // fallback
    }
  }

  // 3. Epoch timestamp en milisegundos (13 dígitos)
  if (!isNaN(num) && num > 1000000000000 && num < 3000000000000) {
    try {
      const dateInfo = new Date(num);
      const d = String(dateInfo.getUTCDate()).padStart(2, '0');
      const m = String(dateInfo.getUTCMonth() + 1).padStart(2, '0');
      const y = dateInfo.getUTCFullYear();
      return `${d}/${m}/${y}`;
    } catch {
      // fallback
    }
  }

  // 4. Epoch timestamp en segundos (10 dígitos)
  if (!isNaN(num) && num > 1000000000 && num < 2500000000) {
    try {
      const dateInfo = new Date(num * 1000);
      const d = String(dateInfo.getUTCDate()).padStart(2, '0');
      const m = String(dateInfo.getUTCMonth() + 1).padStart(2, '0');
      const y = dateInfo.getUTCFullYear();
      return `${d}/${m}/${y}`;
    } catch {
      // fallback
    }
  }

  // 5. Número de 8 dígitos sin separadores (ej: 20260915 o 15092026)
  if (/^\d{8}$/.test(str)) {
    // Si empieza por año 202x
    const yPrefix = parseInt(str.substring(0, 4), 10);
    if (yPrefix >= 2020 && yPrefix <= 2035) {
      const y = str.substring(0, 4);
      const m = str.substring(4, 6);
      const d = str.substring(6, 8);
      return `${d}/${m}/${y}`;
    }
    // Si termina por año 202x
    const ySuffix = parseInt(str.substring(4, 8), 10);
    if (ySuffix >= 2020 && ySuffix <= 2035) {
      const d = str.substring(0, 2);
      const m = str.substring(2, 4);
      const y = str.substring(4, 8);
      return `${d}/${m}/${y}`;
    }
  }

  // 6. Formato ISO YYYY-MM-DD o YYYY/MM/DD (con o sin hora T)
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${d}/${m}/${y}`;
  }

  // 7. Formato DD/MM/YYYY o DD-MM-YYYY o D/M/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${d}/${m}/${y}`;
  }

  // 8. Texto con nombre de mes en español (ej: "15-sep-2026", "15 de septiembre de 2026", "15/Set/2026")
  const MONTH_NAMES_MAP: Record<string, string> = {
    ene: '01', enero: '01',
    feb: '02', febrero: '02',
    mar: '03', marzo: '03',
    abr: '04', abril: '04',
    may: '05', mayo: '05',
    jun: '06', junio: '06',
    jul: '07', julio: '07',
    ago: '08', agosto: '08',
    set: '09', sep: '09', setiembre: '09', septiembre: '09',
    oct: '10', octubre: '10',
    nov: '11', noviembre: '11',
    dic: '12', diciembre: '12',
  };
  const textDateMatch = str.match(/(\d{1,2})[\s/-]+(?:de\s+)?([a-zA-ZáéíóúÁÉÍÓÚ]+)[\s/-]+(?:de\s+)?(\d{2,4})?/i);
  if (textDateMatch) {
    const d = textDateMatch[1].padStart(2, '0');
    const monthKey = textDateMatch[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const m = MONTH_NAMES_MAP[monthKey] || '09';
    let y = textDateMatch[3] || '2026';
    if (y.length === 2) y = `20${y}`;
    return `${d}/${m}/${y}`;
  }

  // 9. Si es únicamente un número de día (ej: 1 al 31) ingresado en la columna de fecha
  if (!isNaN(num) && num >= 1 && num <= 31 && /^\d{1,2}$/.test(str)) {
    const d = String(num).padStart(2, '0');
    let m = '09';
    if (fallbackMonth) {
      const cleanM = fallbackMonth.toLowerCase().trim();
      const matchedM = Object.entries(MONTH_NAMES_MAP).find(([k]) => cleanM.includes(k));
      if (matchedM) m = matchedM[1];
    }
    return `${d}/${m}/2026`;
  }

  return str;
}
