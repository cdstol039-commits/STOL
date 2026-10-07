// Tipos para el Dashboard Ejecutivo de Flota (Montacargas y Elevadores STOL)
export interface FleetMesData {
  horas_usadas: number;
  horas_inoperativas: number;
}

export interface FleetEquipo {
  codigo: string;
  proveedor: 'DERCO' | 'NOVA' | string;
  tipo: 'MONTACARGA' | 'ELEVADOR' | 'BACKUP' | string;
  limite: number;
  meses: Record<string, FleetMesData>;
}

export interface FleetIncidencia {
  fecha: string;
  mes: string;
  proveedor: 'DERCO' | 'NOVA' | string;
  codigo: string;
  tipo_mant: string;
  resultado: string;
  horas: number;
  motivo: string;
}

export interface FleetRegistroDiario {
  fecha: string;
  codigo: string;
  proveedor: string;
  tipo: string;
  horas_usadas: number | null;
  horas_inoperativas: number;
}

export interface FleetDashboardData {
  equipos: FleetEquipo[];
  incidencias: FleetIncidencia[];
  meses: string[];
  registrosDiarios?: FleetRegistroDiario[];
}
