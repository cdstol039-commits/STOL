import { PocketAuditRecord, PocketInventoryItem } from '../types';

const DB_NAME = 'stol_audit_db';
const DB_VERSION = 1;
const STORE_NAME = 'audit_store';

export interface AuditStorageMeta {
  fileName: string;
  updatedAt: string;
  totalRecords: number;
  uploadedBy?: string;
  sourceMode?: 'pre_publish' | 'published';
  isUserUploaded?: boolean;
}

export interface InventoryStorageMeta {
  fileName: string;
  updatedAt: string;
  totalItems: number;
  updatedBy?: string;
  sourceMode?: 'pre_publish' | 'published';
  isUserUploaded?: boolean;
}

export interface StoredAuditPayload {
  key: string;
  records: PocketAuditRecord[];
  meta: AuditStorageMeta;
}

export interface StoredInventoryPayload {
  key: string;
  inventory: PocketInventoryItem[];
  meta: InventoryStorageMeta;
}

export interface FleetStorageMeta {
  fileName: string;
  updatedAt: string;
  totalEquipos: number;
  totalIncidencias: number;
  updatedBy?: string;
  sourceMode?: 'pre_publish' | 'published';
  isUserUploaded?: boolean;
}

export interface StoredFleetPayload {
  key: string;
  data: any;
  meta: FleetStorageMeta;
}

// 1. IndexedDB Helper
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 2. Save Audit Data to IndexedDB + LocalStorage (Dual-layer persistence for today, tomorrow, and future days)
export async function persistLatestAuditData(
  records: PocketAuditRecord[],
  fileName: string,
  updatedAt?: string,
  uploadedBy: string = 'Usuario Autorizado',
  sourceMode: 'pre_publish' | 'published' = 'pre_publish',
  isUserUploaded: boolean = true
): Promise<AuditStorageMeta> {
  const effectiveDate = updatedAt || new Date().toISOString();
  const meta: AuditStorageMeta = {
    fileName: fileName || 'Auditoria_Pockets_Actualizada.xlsx',
    updatedAt: effectiveDate,
    totalRecords: records.length,
    uploadedBy,
    sourceMode,
    isUserUploaded,
  };

  // Layer 1: LocalStorage (Fast synchronous cache)
  try {
    localStorage.setItem('stol_pockets_records_v4', JSON.stringify(records));
    localStorage.setItem('stol_pockets_records_v3', JSON.stringify(records));
    localStorage.setItem('stol_audit_meta_v4', JSON.stringify(meta));
    localStorage.setItem('stol_latest_filename', meta.fileName);
    localStorage.setItem('stol_latest_updated_at', effectiveDate);
    localStorage.setItem('stol_audit_is_user_uploaded', isUserUploaded ? 'true' : 'false');
  } catch (err) {
    console.warn('LocalStorage limit exceeded, relying on IndexedDB:', err);
  }

  // Layer 2: IndexedDB (Durable, large-capacity storage that never expires across days or container updates)
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const payload: StoredAuditPayload = {
        key: 'latest_audit_records',
        records,
        meta,
      };
      const req = store.put(payload);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not persist to IndexedDB:', err);
  }

  return meta;
}

// 3. Retrieve Latest Audit Data from IndexedDB (or fallback to LocalStorage)
export async function getLatestAuditData(): Promise<{
  records: PocketAuditRecord[];
  meta: AuditStorageMeta | null;
} | null> {
  // Try IndexedDB first (most reliable and complete across days and reloads)
  try {
    const db = await openDatabase();
    const idbResult = await new Promise<StoredAuditPayload | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('latest_audit_records');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });

    if (idbResult && Array.isArray(idbResult.records) && idbResult.records.length > 0) {
      return {
        records: idbResult.records,
        meta: idbResult.meta || null,
      };
    }
  } catch (err) {
    // IndexedDB not ready or error, fallback to localStorage
  }

  // Fallback to LocalStorage v4 or v3
  try {
    const rawMeta = localStorage.getItem('stol_audit_meta_v4');
    const rawRecords = localStorage.getItem('stol_pockets_records_v4') || localStorage.getItem('stol_pockets_records_v3');
    const rawIsUser = localStorage.getItem('stol_audit_is_user_uploaded');
    if (rawRecords) {
      const parsedRecords = JSON.parse(rawRecords);
      let meta: AuditStorageMeta | null = rawMeta ? JSON.parse(rawMeta) : null;
      if (!meta && rawRecords) {
        meta = {
          fileName: localStorage.getItem('stol_latest_filename') || 'Auditoria_Pockets_Actualizada.xlsx',
          updatedAt: localStorage.getItem('stol_latest_updated_at') || new Date().toISOString(),
          totalRecords: parsedRecords.length,
          isUserUploaded: rawIsUser === 'true',
        };
      } else if (meta && rawIsUser !== null) {
        meta.isUserUploaded = rawIsUser === 'true';
      }
      if (Array.isArray(parsedRecords) && parsedRecords.length > 0) {
        return {
          records: parsedRecords,
          meta,
        };
      }
    }
  } catch (err) {
    console.error('Error reading audit data from localStorage:', err);
  }

  return null;
}

// 4. Inventory Persistence (Dual-layer persistence for Section 2: Inventario de Pockets)
export async function persistLatestInventory(
  inventory: PocketInventoryItem[],
  fileName: string = 'Inventario_Pockets_Actualizado.xlsx',
  updatedAt?: string,
  updatedBy: string = 'Usuario Autorizado',
  sourceMode: 'pre_publish' | 'published' = 'pre_publish',
  isUserUploaded: boolean = true
): Promise<InventoryStorageMeta> {
  const effectiveDate = updatedAt || new Date().toISOString();
  const meta: InventoryStorageMeta = {
    fileName: fileName || 'Inventario_Pockets_Actualizado.xlsx',
    updatedAt: effectiveDate,
    totalItems: inventory.length,
    updatedBy,
    sourceMode,
    isUserUploaded,
  };

  // Layer 1: LocalStorage
  try {
    localStorage.setItem('stol_pocket_inventory_v2', JSON.stringify(inventory));
    localStorage.setItem('stol_pocket_inventory_v1', JSON.stringify(inventory));
    localStorage.setItem('stol_inventory_meta_v2', JSON.stringify(meta));
    localStorage.setItem('stol_inventory_filename', meta.fileName);
    localStorage.setItem('stol_inventory_updated_at', effectiveDate);
    localStorage.setItem('stol_inventory_is_user_uploaded', isUserUploaded ? 'true' : 'false');
  } catch (e) {
    console.warn('LocalStorage limit for inventory, relying on IndexedDB:', e);
  }

  // Layer 2: IndexedDB
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const payload: StoredInventoryPayload = {
        key: 'latest_inventory',
        inventory,
        meta,
      };
      const req = store.put(payload);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Could not persist inventory to IndexedDB:', e);
  }

  return meta;
}

// 5. Retrieve Latest Inventory Data from IndexedDB (or fallback to LocalStorage)
export async function getLatestInventoryData(): Promise<{
  inventory: PocketInventoryItem[];
  meta: InventoryStorageMeta | null;
} | null> {
  // Try IndexedDB first
  try {
    const db = await openDatabase();
    const idbResult = await new Promise<StoredInventoryPayload | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('latest_inventory');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });

    if (idbResult && Array.isArray(idbResult.inventory) && idbResult.inventory.length > 0) {
      return {
        inventory: idbResult.inventory,
        meta: idbResult.meta || null,
      };
    }
  } catch (err) {
    // Fallback to localStorage
  }

  // Fallback to LocalStorage
  try {
    const rawMeta = localStorage.getItem('stol_inventory_meta_v2');
    const rawInventory = localStorage.getItem('stol_pocket_inventory_v2') || localStorage.getItem('stol_pocket_inventory_v1');
    const rawIsUser = localStorage.getItem('stol_inventory_is_user_uploaded');
    if (rawInventory) {
      const parsedInventory = JSON.parse(rawInventory);
      let meta: InventoryStorageMeta | null = rawMeta ? JSON.parse(rawMeta) : null;
      if (!meta && rawInventory) {
        meta = {
          fileName: localStorage.getItem('stol_inventory_filename') || 'Inventario_Pockets_Actualizado.xlsx',
          updatedAt: localStorage.getItem('stol_inventory_updated_at') || new Date().toISOString(),
          totalItems: parsedInventory.length,
          isUserUploaded: rawIsUser === 'true',
        };
      } else if (meta && rawIsUser !== null) {
        meta.isUserUploaded = rawIsUser === 'true';
      }
      if (Array.isArray(parsedInventory) && parsedInventory.length > 0) {
        return {
          inventory: parsedInventory,
          meta,
        };
      }
    }
  } catch (err) {
    console.error('Error reading inventory data from localStorage:', err);
  }

  return null;
}

// 6. Comparison Helper: Is dateA strictly newer than dateB?
export function isTimestampNewer(dateA?: string | null, dateB?: string | null): boolean {
  if (!dateA) return false;
  if (!dateB) return true;
  const timeA = new Date(dateA).getTime();
  const timeB = new Date(dateB).getTime();
  if (isNaN(timeA)) return false;
  if (isNaN(timeB)) return true;
  return timeA > timeB;
}

// 7. Formatter Helper: Displays both Date (DD/MM/YYYY) and Time (HH:MM:SS) for file upload indicators
export function formatAuditDateTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return String(dateStr);
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  } catch {
    return String(dateStr || '');
  }
}

// 8. Fleet Dashboard Data persistence
export async function persistLatestFleetData(
  fleetData: any,
  fileName: string = 'DATA_DASHBOARD_EJECUTIVO.xlsx',
  updatedBy: string = 'Sistema STOL',
  sourceMode: 'pre_publish' | 'published' = 'pre_publish',
  isUserUploaded: boolean = true,
  customTimestamp?: string
): Promise<FleetStorageMeta> {
  const meta: FleetStorageMeta = {
    fileName,
    updatedAt: customTimestamp || new Date().toISOString(),
    totalEquipos: fleetData?.equipos?.length || 0,
    totalIncidencias: fleetData?.incidencias?.length || 0,
    updatedBy,
    sourceMode,
    isUserUploaded,
  };

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const payload: StoredFleetPayload = {
        key: 'latest_fleet_data',
        data: fleetData,
        meta,
      };
      const req = store.put(payload);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not persist fleet data to IndexedDB:', err);
  }

  try {
    localStorage.setItem('stol_fleet_data_v1', JSON.stringify(fleetData));
    localStorage.setItem('stol_fleet_meta_v1', JSON.stringify(meta));
    localStorage.setItem('stol_fleet_filename', meta.fileName);
    localStorage.setItem('stol_fleet_updated_at', meta.updatedAt);
    localStorage.setItem('stol_fleet_is_user_uploaded', String(isUserUploaded));
  } catch (err) {
    console.warn('Could not persist fleet data to localStorage:', err);
  }

  return meta;
}

export async function getLatestFleetData(): Promise<{
  data: any;
  meta: FleetStorageMeta | null;
} | null> {
  try {
    const db = await openDatabase();
    const idbResult = await new Promise<StoredFleetPayload | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('latest_fleet_data');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (idbResult && idbResult.data) {
      return {
        data: idbResult.data,
        meta: idbResult.meta || null,
      };
    }
  } catch (err) {
    // Fallback
  }

  try {
    const rawData = localStorage.getItem('stol_fleet_data_v1');
    const rawMeta = localStorage.getItem('stol_fleet_meta_v1');
    if (rawData) {
      const parsedData = JSON.parse(rawData);
      let meta: FleetStorageMeta | null = rawMeta ? JSON.parse(rawMeta) : null;
      if (!meta && parsedData) {
        meta = {
          fileName: localStorage.getItem('stol_fleet_filename') || 'DATA_DASHBOARD_EJECUTIVO.xlsx',
          updatedAt: localStorage.getItem('stol_fleet_updated_at') || new Date().toISOString(),
          totalEquipos: parsedData?.equipos?.length || 0,
          totalIncidencias: parsedData?.incidencias?.length || 0,
          isUserUploaded: localStorage.getItem('stol_fleet_is_user_uploaded') === 'true',
        };
      }
      return { data: parsedData, meta };
    }
  } catch (err) {
    console.error('Error reading fleet data from localStorage:', err);
  }

  return null;
}

