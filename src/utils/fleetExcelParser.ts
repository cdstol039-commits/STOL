import * as XLSX from 'xlsx';
import { FleetDashboardData, FleetEquipo, FleetIncidencia, FleetRegistroDiario } from '../types/fleet';
import { dateKeyFromValue } from './period';

function normKey(s: any): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function optionalNumber(value: any): number | null {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Normaliza cualquier variante de mes (ej: "julio", "JULIO", "Julio", "septiembre", "setiembre", "SETIEMBRE")
 * a un único nombre canónico oficial con mayúscula inicial.
 */
export function canonicalFleetMonth(raw: any): string {
  if (!raw) return '';
  const clean = String(raw).trim().toUpperCase();
  const norm = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (norm.startsWith('ENE')) return 'Enero';
  if (norm.startsWith('FEB')) return 'Febrero';
  if (norm.startsWith('MAR')) return 'Marzo';
  if (norm.startsWith('ABR')) return 'Abril';
  if (norm.startsWith('MAY')) return 'Mayo';
  if (norm.startsWith('JUN')) return 'Junio';
  if (norm.startsWith('JUL')) return 'Julio';
  if (norm.startsWith('AGO')) return 'Agosto';
  if (norm.startsWith('SET') || norm.startsWith('SEP')) return 'Setiembre';
  if (norm.startsWith('OCT')) return 'Octubre';
  if (norm.startsWith('NOV')) return 'Noviembre';
  if (norm.startsWith('DIC')) return 'Diciembre';

  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

/**
 * Parsea las horas de inoperatividad y horómetros conforme a la indicación del usuario:
 * "todos los números son enteros hasta antes del punto... después del punto ya se debe de considerar decimal".
 * - Lo que está antes del punto es la parte entera.
 * - Lo que está después del punto es la parte decimal.
 * - Valores negativos (errores de resta de fechas vacías o fórmulas en Excel) se descartan a 0.
 * - Cifras serializadas como enteros sin punto de 9-10 dígitos (ej: 1758333333 -> 17.58) se normalizan.
 */
export function parseInoperativityHours(raw: any): number {
  if (raw === null || raw === undefined || raw === '') return 0;

  if (typeof raw === 'number') {
    if (isNaN(raw) || !isFinite(raw) || raw <= 0) return 0;
    // Entero de 9 o 10 dígitos sin punto decimal por serialización de Excel (ej: 1758333333 -> 17.58)
    if (raw > 1000000) {
      const scaled = raw / 100000000;
      return Math.max(0, Math.round(scaled * 100) / 100);
    }
    return Math.max(0, Math.round(raw * 100) / 100);
  }

  const str = String(raw).trim();
  if (!str || str.startsWith('-')) return 0;

  // Si tiene punto o coma decimal: entero antes del punto, decimal después del punto
  if (str.includes('.') || str.includes(',')) {
    const cleanStr = str.replace(',', '.');
    const val = parseFloat(cleanStr);
    if (!isNaN(val) && isFinite(val)) {
      return Math.max(0, Math.round(val * 100) / 100);
    }
  }

  const n = parseFloat(str);
  if (isNaN(n) || !isFinite(n) || n <= 0) return 0;

  if (n > 1000000) {
    const scaled = n / 100000000;
    return Math.max(0, Math.round(scaled * 100) / 100);
  }

  return Math.max(0, Math.round(n * 100) / 100);
}

export const cleanHoursValue = parseInoperativityHours;

const ALIASES = {
  BITACORA: {
    'ID INCIDENCIA': 'ID_Incidencia',
    'ID EQUIPO': 'ID_Equipo',
    'PROVEEDOR': 'Proveedor',
    'CODIGO EQUIPO': 'Codigo_Equipo',
    'CODIGO DE EQUIPO': 'Codigo_Equipo',
    'TIPO EQUIPO': 'Tipo_Equipo',
    'TIPO DE EQUIPO': 'Tipo_Equipo',
    'ANIO': 'Anio',
    'ANO': 'Anio',
    'MES': 'Mes',
    'DIA': 'Dia',
    'FECHA REGISTRO': 'Fecha_Registro',
    'FECHA DE REGISTRO': 'Fecha_Registro',
    'FECHA': 'Fecha_Registro',
    'HORA REGISTRO': 'Hora_Registro',
    'HORA DE REGISTRO': 'Hora_Registro',
    'FECHA HORA INICIO': 'Fecha_Hora_Inicio',
    'FECHA HORA INICIAL': 'Fecha_Hora_Inicio',
    'FECHA HORA FIN': 'Fecha_Hora_Fin',
    'FECHA HORA FINAL': 'Fecha_Hora_Fin',
    'HORAS INOPERATIVAS': 'Horas_Inoperativas',
    'HORAS DE INOPERATIVIDAD': 'Horas_Inoperativas',
    'INOPERATIVIDAD': 'Horas_Inoperativas',
    'HORAS INOPERATIVIDAD': 'Horas_Inoperativas',
    'TIPO MANTENIMIENTO': 'Tipo_Mantenimiento',
    'TIPO DE MANTENIMIENTO': 'Tipo_Mantenimiento',
    'RESULTADO': 'Resultado',
    'MOTIVO': 'Motivo',
    'MOTIVO DE PARADA': 'Motivo',
    'MOTIVO DE PARADA DEL EQUIPO': 'Motivo',
  } as Record<string, string>,
  HOROMETROS: {
    'ID REGISTRO': 'ID_Registro',
    'ID EQUIPO': 'ID_Equipo',
    'PROVEEDOR': 'Proveedor',
    'CODIGO EQUIPO': 'Codigo_Equipo',
    'CODIGO DE EQUIPO': 'Codigo_Equipo',
    'TIPO EQUIPO': 'Tipo_Equipo',
    'TIPO DE EQUIPO': 'Tipo_Equipo',
    'ANIO': 'Anio',
    'ANO': 'Anio',
    'MES': 'Mes',
    'DIA': 'Dia',
    'DIAS': 'Dia',
    'FECHA REGISTRO': 'Fecha_Registro',
    'FECHA DE REGISTRO': 'Fecha_Registro',
    'FECHA': 'Fecha_Registro',
    'HORA REGISTRO': 'Hora_Registro',
    'HORA DE REGISTRO': 'Hora_Registro',
    'HOROMETRO MIN': 'Horometro_Min',
    'HOROMETRO INICIO': 'Horometro_Min',
    'HOROMETRO INICIAL': 'Horometro_Min',
    'HOROMETRO MAX': 'Horometro_Max',
    'HOROMETRO FINAL': 'Horometro_Max',
    'HOROMETRO FIN': 'Horometro_Max',
    'HORAS USADAS': 'Horas_Usadas',
    'LIMITE HORAS': 'Limite_Horas',
    'LIMITE DE HORAS': 'Limite_Horas',
    'LECTURA HOROMETRO': 'Lectura_Horometro',
    'HOROMETRO': 'Lectura_Horometro',
    'TIPO SOLICITUD': 'Tipo_Solicitud',
    'TIPO DE SOLICITUD': 'Tipo_Solicitud',
    'SOLICITUD': 'Tipo_Solicitud',
    'AREA TRABAJO': 'Area_Trabajo',
    'AREA DE TRABAJO': 'Area_Trabajo',
    'PREVENCIONISTA': 'Prevencionista',
    'PREVENCIONISTA A CARGO': 'Prevencionista',
    'OPERADOR': 'Operador',
    'NOMBRE DE OPERADOR': 'Operador',
    'DNI': 'DNI',
  } as Record<string, string>,
  DIM_EQUIPOS: {
    'ID EQUIPO': 'ID_Equipo',
    'PROVEEDOR': 'Proveedor',
    'CODIGO EQUIPO': 'Codigo_Equipo',
    'CODIGO DE EQUIPO': 'Codigo_Equipo',
    'TIPO EQUIPO': 'Tipo_Equipo',
    'TIPO DE EQUIPO': 'Tipo_Equipo',
    'LIMITE HORAS': 'Limite_Horas',
    'LIMITE DE HORAS': 'Limite_Horas',
  } as Record<string, string>,
};

function remapRow(row: Record<string, any>, aliasMap: Record<string, string>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k in row) {
    const canon = aliasMap[normKey(k)];
    if (canon) out[canon] = row[k];
  }
  return out;
}

function sheetToObjects(wb: XLSX.WorkBook, name: string, aliasMap: Record<string, string>): any[] {
  const foundSheetName = Object.keys(wb.Sheets).find(
    (s) => normKey(s) === normKey(name) || normKey(s).includes(normKey(name))
  );
  if (!foundSheetName) return [];
  const ws = wb.Sheets[foundSheetName];
  if (!ws) return [];
  const raw: any[] = XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });
  return raw.map((r) => remapRow(r, aliasMap));
}

function excelSerialToDate(v: any): Date {
  if (v instanceof Date) return v;
  if (typeof v === 'number') {
    return new Date((Math.floor(v) - 25569) * 86400000);
  }
  return new Date(v);
}

function fmtDateISO(d: Date): string {
  try {
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

export function parseFleetExcelWorkbook(wb: XLSX.WorkBook): FleetDashboardData {
  const bitacora = sheetToObjects(wb, 'BITACORA', ALIASES.BITACORA);
  const horometros = sheetToObjects(wb, 'HOROMETROS', ALIASES.HOROMETROS);
  const dim = sheetToObjects(wb, 'DIM_EQUIPOS', ALIASES.DIM_EQUIPOS);

  if (!dim.length && !horometros.length && !bitacora.length) {
    throw new Error('El archivo no contiene las hojas esperadas (BITACORA, HOROMETROS, DIM_EQUIPOS). Verifique la estructura del archivo Excel.');
  }

  const monthNumber = (month: unknown): number => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months.indexOf(canonicalFleetMonth(month)) + 1;
  };
  const recordDate = (row: Record<string, any>): string | null => {
    const fromDate = dateKeyFromValue(row.Fecha_Registro);
    if (fromDate) return fromDate;
    const year = Number(row.Anio);
    const day = Number(row.Dia);
    const month = monthNumber(row.Mes);
    if (year && month && day) return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return null;
  };

  // Detect unique canonical months from both sheets
  const mesesPresentes = new Set<string>();
  horometros.forEach((r) => {
    const m = canonicalFleetMonth(r.Mes);
    if (m) mesesPresentes.add(m);
  });
  bitacora.forEach((r) => {
    const m = canonicalFleetMonth(r.Mes);
    if (m) mesesPresentes.add(m);
  });

  const ordenCalendario = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  // Ordenar cronológicamente sin duplicados
  let mesesOrden = ordenCalendario.filter((m) => mesesPresentes.has(m));

  // Si los datos originales solo correspondían a Julio, Agosto y Setiembre, aseguramos ese trío exacto
  if (mesesOrden.length === 0) {
    mesesOrden = ['Julio', 'Agosto', 'Setiembre'];
  }

  // Calculate usage from Horometros using canonical month names
  const usageMap: Record<string, { min: number; max: number; explicitUsage: number }> = {};
  const dailyReadingRows: { date: string; code: string; supplier: string; type: string; explicit: number | null; min: number | null; max: number | null; reading: number | null }[] = [];
  horometros.forEach((r) => {
    const cod = String(r.Codigo_Equipo || '').trim();
    const mes = canonicalFleetMonth(r.Mes);
    if (!cod || !mes) return;

    const date = recordDate(r);
    if (date) {
      const min = optionalNumber(r.Horometro_Min);
      const max = optionalNumber(r.Horometro_Max);
      const explicit = optionalNumber(r.Horas_Usadas);
      const reading = optionalNumber(r.Lectura_Horometro);
      dailyReadingRows.push({
        date,
        code: cod,
        supplier: String(r.Proveedor || '').trim().toUpperCase(),
        type: String(r.Tipo_Equipo || '').trim().toUpperCase(),
        explicit: explicit !== null && explicit > 0 ? explicit : null,
        min,
        max,
        reading,
      });
    }

    const key = `${cod}|${mes}`;
    if (!usageMap[key]) {
      usageMap[key] = { min: Infinity, max: -Infinity, explicitUsage: 0 };
    }

    // Si tiene Horas_Usadas explícito en la fila
    const horasUsadas = optionalNumber(r.Horas_Usadas);
    if (horasUsadas !== null && horasUsadas > 0) {
      usageMap[key].explicitUsage = Math.max(usageMap[key].explicitUsage, horasUsadas);
    }

    // Si tiene Lectura_Horometro
    const lectura = optionalNumber(r.Lectura_Horometro);
    if (lectura !== null) {
      usageMap[key].min = Math.min(usageMap[key].min, lectura);
      usageMap[key].max = Math.max(usageMap[key].max, lectura);
    }
  });

  // Calculate inoperativity from Bitacora using canonical month names and cleaned hours
  const inopMap: Record<string, number> = {};
  const dailyInopMap: Record<string, number> = {};
  bitacora.forEach((r) => {
    const cod = String(r.Codigo_Equipo || '').trim();
    const mes = canonicalFleetMonth(r.Mes);
    if (!cod || !mes) return;

    const key = `${cod}|${mes}`;
    const h = cleanHoursValue(r.Horas_Inoperativas);
    inopMap[key] = (inopMap[key] || 0) + h;
    const date = recordDate(r);
    if (date) {
      const dailyKey = `${date}|${cod}`;
      dailyInopMap[dailyKey] = (dailyInopMap[dailyKey] || 0) + h;
    }
  });

  const lastReadingByEquipment = new Map<string, number>();
  const dailyUsageMap = new Map<string, FleetRegistroDiario>();
  dailyReadingRows.sort((a, b) => a.date.localeCompare(b.date) || a.code.localeCompare(b.code));
  dailyReadingRows.forEach((row) => {
    const dailyKey = `${row.date}|${row.code}`;
    const previousReading = lastReadingByEquipment.get(row.code);
    const measuredRange = row.min !== null && row.max !== null && row.max >= row.min ? row.max - row.min : null;
    const readingDelta = row.reading !== null && previousReading !== undefined && row.reading >= previousReading
      ? row.reading - previousReading
      : null;
    const hoursUsed = row.explicit ?? measuredRange ?? readingDelta;
    if (row.reading !== null) lastReadingByEquipment.set(row.code, row.reading);

    const existing = dailyUsageMap.get(dailyKey);
    dailyUsageMap.set(dailyKey, {
      fecha: row.date,
      codigo: row.code,
      proveedor: row.supplier || existing?.proveedor || (row.code.startsWith('NOVATRANS') ? 'NOVA' : 'DERCO'),
      tipo: row.type || existing?.tipo || (row.code.includes('HER') ? 'ELEVADOR' : 'MONTACARGA'),
      horas_usadas: hoursUsed === null ? existing?.horas_usadas ?? null : (existing?.horas_usadas ?? 0) + hoursUsed,
      horas_inoperativas: dailyInopMap[dailyKey] || 0,
    });
  });

  bitacora.forEach((row) => {
    const code = String(row.Codigo_Equipo || '').trim();
    const date = recordDate(row);
    if (!code || !date) return;
    const dailyKey = `${date}|${code}`;
    const existing = dailyUsageMap.get(dailyKey);
    if (existing) {
      existing.horas_inoperativas = dailyInopMap[dailyKey] || 0;
    } else {
      dailyUsageMap.set(dailyKey, {
        fecha: date,
        codigo: code,
        proveedor: String(row.Proveedor || '').trim().toUpperCase(),
        tipo: String(row.Tipo_Equipo || '').trim().toUpperCase(),
        horas_usadas: null,
        horas_inoperativas: dailyInopMap[dailyKey] || 0,
      });
    }
  });

  // Equipment dimension table
  let equiposRows = dim;
  if (!equiposRows || equiposRows.length === 0) {
    const uniqueEquipos = new Map<string, any>();
    [...horometros, ...bitacora].forEach((r) => {
      const cod = String(r.Codigo_Equipo || '').trim();
      if (cod && !uniqueEquipos.has(cod)) {
        uniqueEquipos.set(cod, {
          Codigo_Equipo: cod,
          Proveedor: r.Proveedor || (cod.startsWith('NOVATRANS') ? 'NOVA' : 'DERCO'),
          Tipo_Equipo: r.Tipo_Equipo || (cod.includes('HER') ? 'ELEVADOR' : 'MONTACARGA'),
          Limite_Horas: cod.includes('HER') ? 375 : 300,
        });
      }
    });
    equiposRows = Array.from(uniqueEquipos.values());
  }

  const equipos: FleetEquipo[] = equiposRows.map((row) => {
    const cod = String(row.Codigo_Equipo || '').trim();
    const prov = String(row.Proveedor || (cod.startsWith('NOVATRANS') ? 'NOVA' : 'DERCO')).trim().toUpperCase();
    const tipo = String(row.Tipo_Equipo || (cod.includes('HER') ? 'ELEVADOR' : 'MONTACARGA')).trim().toUpperCase();
    const limite = Number(row.Limite_Horas) || (tipo === 'ELEVADOR' ? 375 : 300);

    const mesesData: Record<string, { horas_usadas: number; horas_inoperativas: number }> = {};
    mesesOrden.forEach((mes) => {
      const key = `${cod}|${mes}`;
      const u = usageMap[key];

      let horasUsadas = 0;
      if (u) {
        if (u.explicitUsage > 0) {
          horasUsadas = u.explicitUsage;
        } else if (u.max > -Infinity && u.min < Infinity && u.max >= u.min) {
          horasUsadas = Math.round((u.max - u.min) * 10) / 10;
        }
      }

      const inop = Math.round((inopMap[key] || 0) * 100) / 100;

      mesesData[mes] = {
        horas_usadas: horasUsadas,
        horas_inoperativas: inop,
      };
    });

    return {
      codigo: cod,
      proveedor: prov,
      tipo,
      limite,
      meses: mesesData,
    };
  });

  const incidencias: FleetIncidencia[] = bitacora
    .slice()
    .sort((a, b) => {
      const da = new Date(a.Fecha_Registro || 0).getTime();
      const db = new Date(b.Fecha_Registro || 0).getTime();
      return da - db;
    })
    .map((r) => {
      let fechaTxt = '';
      try {
        if (r.Fecha_Registro) {
          const fecha = excelSerialToDate(r.Fecha_Registro);
          if (!isNaN(fecha.getTime())) fechaTxt = fmtDateISO(fecha);
        }
      } catch {
        fechaTxt = String(r.Fecha_Registro || '');
      }

      const motivo = String(r.Motivo || '');
      return {
        fecha: fechaTxt,
        mes: canonicalFleetMonth(r.Mes),
        proveedor: String(r.Proveedor || '').trim().toUpperCase(),
        codigo: String(r.Codigo_Equipo || '').trim(),
        tipo_mant: String(r.Tipo_Mantenimiento || 'Correctivo').trim(),
        resultado: String(r.Resultado || 'Reparado').trim(),
        horas: cleanHoursValue(r.Horas_Inoperativas),
        motivo: motivo.length > 200 ? motivo.slice(0, 200) + '...' : motivo,
      };
    });

  return {
    equipos,
    incidencias,
    meses: mesesOrden,
    registrosDiarios: Array.from(dailyUsageMap.values()).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.codigo.localeCompare(b.codigo)),
  };
}
