export type UserRole = 'admin' | 'uploader' | 'viewer';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleTitle: string;
  department: string;
  canUpload: boolean;
  canEdit: boolean;
  canExport: boolean;
  avatar?: string;
  lastLogin?: string;
  accessCount?: number;
}

export interface PocketAuditRecord {
  id: string;
  fecha: string;
  mes: string;
  semana: string; // e.g. "Semana 38"
  area: string;   // e.g. "ALMACEN", "CROSS DOCKING", "DESPACHO", etc.
  totalAsignados: number;
  pocketsRegistrados: number;
  pocketsEnUso: number;
  pocketsSinUso: number;
  pctCumplimientoRegistro?: number; // Columna L de Excel: % Cumplimiento Registro
  motivoNoUso?: string;
  auditor: string;
  turno?: string;
  observaciones?: string;
}

export interface AreaMetric {
  area: string;
  totalAsignado: number;
  enUso: number;
  sinUso: number;
  registrados: number;
  noRegistrados: number;
  pctCumplimientoRegistro: number;
  pctCumplimientoUso: number;
}

export interface MotivoNoUsoItem {
  motivo: string;
  cantidad: number;
}

export interface MemoRecord {
  id: string;
  codigo: string;
  fecha: string;
  mes: string;
  semana: string;
  area: string;
  auditor: string;
  tipo: 'Observación Leve' | 'No Conformidad Menor' | 'No Conformidad Mayor' | 'Oportunidad de Mejora';
  descripcion: string;
  criticidad: 'Baja' | 'Media' | 'Alta';
  estado: 'Abierto' | 'En Proceso' | 'Subsanado' | 'Cerrado';
  responsable: string;
  fechaCompromiso: string;
}

export interface InductionRecord {
  id: string;
  fecha: string;
  mes: string;
  semana: string;
  area: string;
  colaborador: string;
  dni: string;
  auditor: string;
  tipoInduccion: 'Seguridad Operacional' | 'Manejo de Equipos Pocket' | 'Normativas de Almacén' | 'BPA y BPM';
  calificacion: number; // 0 - 100
  estado: 'Aprobado' | 'En Observación' | 'Reprogramado';
  observaciones?: string;
}

export interface FilterState {
  fechas?: string[]; // Multi-select dates (YYYY-MM-DD), empty means all
  fecha?: string;    // Single date fallback
  meses: string[];   // Multi-select months, empty or ['TODOS'] means all
  semanas: string[]; // Multi-select weeks, empty or ['TODAS'] means all
  areas: string[];   // Multi-select areas, empty or ['TODAS'] means all
  mes: string;       // Fallback / legacy single
  semana: string;    // Fallback / legacy single
  area: string;      // Fallback / legacy single
  searchQuery?: string;
}

export type PocketEstado = 'OPERATIVO' | 'INOPERATIVO';
export type PocketMantenimiento = 'POR REPARAR' | 'DADO DE BAJA' | 'NINGUNO' | '';

export interface PocketInventoryItem {
  id: string;
  numero: number;
  serie: string;
  area: string;
  estado: PocketEstado;
  responsable: string;
  observaciones?: string;
  mantenimiento?: PocketMantenimiento;
}

export interface SupervisorInventoryMetric {
  area: string;
  responsable: string;
  total: number;
  pctDelTotal: number;
  operativos: number;
  pctOperativos: number;
  inoperativos: number;
  pctInoperativos: number;
  porReparar: number;
  dadosDeBaja: number;
}
