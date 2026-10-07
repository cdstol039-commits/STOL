import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Lock } from 'lucide-react';
import { Header } from './components/Header';
import { Sidebar, TabId } from './components/Sidebar';
import { FilterBar } from './components/FilterBar';
import { PocketsDashboard } from './components/pockets/PocketsDashboard';
import { PocketRecordsTable } from './components/pockets/PocketRecordsTable';
import { MemosDashboard } from './components/memos/MemosDashboard';
import { InductionDashboard } from './components/induction/InductionDashboard';
import { ReportsDashboard } from './components/reports/ReportsDashboard';
import { ExecutiveSummaryDashboard } from './components/reports/ExecutiveSummaryDashboard';
import { GlobalPeriodFilter } from './components/common/GlobalPeriodFilter';
import { RolesDashboard } from './components/roles/RolesDashboard';
import { FleetDashboardSection } from './components/fleet/FleetDashboardSection';
import { DataUploadModal } from './components/upload/DataUploadModal';
import { RoleManagementModal } from './components/roles/RoleManagementModal';
import { AccessKeyModal } from './components/auth/AccessKeyModal';
import {
  INITIAL_POCKET_RECORDS,
  INITIAL_USERS,
  INITIAL_MEMOS,
  INITIAL_INDUCTIONS,
} from './data/initialData';
import { INITIAL_POCKET_INVENTORY } from './data/initialInventory';
import { DEFAULT_FLEET_DATA } from './data/initialFleetData';
import { INITIAL_PALLETS_DATA } from './data/initialPalletsData';
import { InventoryUploadModal } from './components/inventory/InventoryUploadModal';
import { PalletsDashboard } from './components/pallets/PalletsDashboard';
import { SupervisorsDashboard } from './components/supervisors/SupervisorsDashboard';
import {
  ExecutiveSummaryPhotoModal,
  SummaryScopeType,
} from './components/common/ExecutiveSummaryPhotoModal';
import { PocketAuditRecord, AppUser, MemoRecord, InductionRecord, FilterState, PocketInventoryItem } from './types';
import { FleetDashboardData } from './types/fleet';
import { PeriodSelection } from './types/period';
import { PalletObservation } from './types/pallets';
import { syncPasswordFromServer } from './utils/authUtils';
import { formatDisplayDate } from './utils/normalizer';
import { matchesPeriod } from './utils/period';
import {
  getLatestAuditData,
  persistLatestAuditData,
  isTimestampNewer,
  persistLatestInventory,
  getLatestInventoryData,
  formatAuditDateTime,
  persistLatestFleetData,
  getLatestFleetData,
} from './utils/persistence';

export default function App() {
  const isPublished = typeof window !== 'undefined' && (
    window.location.hostname.includes('ais-pre-') ||
    process.env.NODE_ENV === 'production'
  );

  // 1. Storage persistence for records (reads from v4 dual-layer or v3 cache)
  const [pocketRecords, setPocketRecords] = useState<PocketAuditRecord[]>(() => {
    const savedV4 = localStorage.getItem('stol_pockets_records_v4');
    const savedV3 = localStorage.getItem('stol_pockets_records_v3');
    const saved = savedV4 || savedV3;
    if (saved) {
      try {
        const parsed: PocketAuditRecord[] = JSON.parse(saved);
        return parsed.map((r) => ({
          ...r,
          fecha: formatDisplayDate(r.fecha, r.mes) || r.fecha,
          mes: r.mes ? r.mes.toUpperCase().trim() : 'SEPTIEMBRE',
        }));
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_POCKET_RECORDS.map((r) => ({
      ...r,
      fecha: formatDisplayDate(r.fecha, r.mes) || r.fecha,
    }));
  });

  // Independent Inventory state for Section 2 (reads from v2 dual-layer or v1 cache)
  const [pocketInventory, setPocketInventory] = useState<PocketInventoryItem[]>(() => {
    const savedV2 = localStorage.getItem('stol_pocket_inventory_v2');
    const savedV1 = localStorage.getItem('stol_pocket_inventory_v1');
    const saved = savedV2 || savedV1;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_POCKET_INVENTORY;
  });

  const [lastAuditUpdatedAt, setLastAuditUpdatedAt] = useState<string | null>(() => {
    return localStorage.getItem('stol_latest_updated_at') || null;
  });
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    const saved = localStorage.getItem('stol_latest_updated_at');
    return saved ? formatAuditDateTime(saved) : null;
  });
  const [latestFileName, setLatestFileName] = useState<string>(() => {
    return localStorage.getItem('stol_latest_filename') || 'Auditoria_Pockets_Oficial.xlsx';
  });

  const [lastInventoryUpdatedAt, setLastInventoryUpdatedAt] = useState<string | null>(() => {
    return localStorage.getItem('stol_inventory_updated_at') || null;
  });
  const [latestInventoryFileName, setLatestInventoryFileName] = useState<string | null>(() => {
    return localStorage.getItem('stol_inventory_filename') || 'Inventario_Pockets_Actualizado.xlsx';
  });
  const [lastInventorySyncTime, setLastInventorySyncTime] = useState<string | null>(() => {
    const saved = localStorage.getItem('stol_inventory_updated_at');
    return saved ? formatAuditDateTime(saved) : null;
  });

  // Fleet state variables
  const [fleetData, setFleetData] = useState<FleetDashboardData>(() => {
    try {
      const saved = localStorage.getItem('stol_fleet_data_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.equipos && parsed.equipos.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_FLEET_DATA;
  });
  const [latestFleetFileName, setLatestFleetFileName] = useState<string | null>(() => {
    return localStorage.getItem('stol_fleet_filename') || 'DATA_DASHBOARD_EJECUTIVO.xlsx';
  });
  const [lastFleetUpdatedAt, setLastFleetUpdatedAt] = useState<string | null>(() => {
    return localStorage.getItem('stol_fleet_updated_at') || null;
  });

  // Pallets Observados state
  const [palletRecords, setPalletRecords] = useState<PalletObservation[]>(() => {
    try {
      const saved = localStorage.getItem('stol_pallets_records_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_PALLETS_DATA;
  });
  const [latestPalletFileName, setLatestPalletFileName] = useState<string | null>(() => {
    return localStorage.getItem('stol_pallets_filename') || 'CONTROL_PALLETS_OBSERVADOS.xlsx';
  });
  const [lastPalletUpdatedAt, setLastPalletUpdatedAt] = useState<string | null>(() => {
    return localStorage.getItem('stol_pallets_updated_at') || null;
  });

  const [users, setUsers] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem('stol_users_v3');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  // 2. Default state: Initially strictly READ-ONLY (Solo Visualización) for everyone!
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    const saved = sessionStorage.getItem('stol_is_unlocked_v3');
    return saved === 'true';
  });

  const [currentUser, setCurrentUser] = useState<AppUser>(() => {
    const saved = localStorage.getItem('stol_current_user_v3');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      id: 'viewer-guest',
      name: 'Usuario Visitante',
      email: 'consulta@stol.com',
      role: 'viewer',
      roleTitle: 'Solo Visualización',
      department: 'Operaciones Generales',
      canUpload: false,
      canEdit: false,
      canExport: true,
    };
  });

  const [memos, setMemos] = useState<MemoRecord[]>(() => {
    const saved = localStorage.getItem('stol_memos_v3');
    if (saved) {
      try {
        const parsed: MemoRecord[] = JSON.parse(saved);
        return parsed.map((m) => ({ ...m, mes: m.mes ? m.mes.toUpperCase().trim() : 'SEPTIEMBRE' }));
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_MEMOS;
  });

  const [inductions, setInductions] = useState<InductionRecord[]>(() => {
    const saved = localStorage.getItem('stol_inductions_v3');
    if (saved) {
      try {
        const parsed: InductionRecord[] = JSON.parse(saved);
        return parsed.map((i) => ({ ...i, mes: i.mes ? i.mes.toUpperCase().trim() : 'SEPTIEMBRE' }));
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_INDUCTIONS;
  });

  // 3. Navigation & Layout State
  const [activeTab, setActiveTab] = useState<TabId>('resumen');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 4. Main Filters State (Defaults to: Todos los Meses, Todas las Semanas, Todas las Áreas)
  const [filters, setFilters] = useState<FilterState>({
    meses: [],
    semanas: [],
    areas: [],
    mes: 'TODOS',
    semana: 'TODAS',
    area: 'TODAS',
    searchQuery: '',
  });
  const [analysisPeriod, setAnalysisPeriod] = useState<PeriodSelection>({ granularity: 'all', value: '' });
  const handleAnalysisPeriodChange = (period: PeriodSelection) => {
    setAnalysisPeriod(period);
    setFilters((current) => ({
      ...current,
      meses: [],
      mes: 'TODOS',
      semanas: [],
      semana: 'TODAS',
      fechas: [],
      fecha: undefined,
    }));
  };

  // 5. Modals State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isInventoryUploadModalOpen, setIsInventoryUploadModalOpen] = useState(false);
  const [isAccessKeyModalOpen, setIsAccessKeyModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isPhotoSummaryModalOpen, setIsPhotoSummaryModalOpen] = useState(false);
  const [photoSummaryScope, setPhotoSummaryScope] = useState<SummaryScopeType>('todas');

  const handleOpenPhotoSummary = useCallback((scope?: SummaryScopeType) => {
    if (scope) {
      setPhotoSummaryScope(scope);
    } else {
      const mapTabToScope: Record<string, SummaryScopeType> = {
        pockets: 'pockets',
        pallets: 'pallets',
        supervisores: 'supervisores',
        montacargas: 'montacargas',
        memos: 'memos',
        induccion: 'induccion',
        reportes: 'todas',
        resumen: 'todas',
        registros: 'pockets',
      };
      setPhotoSummaryScope(mapTabToScope[activeTab] || 'todas');
    }
    setIsPhotoSummaryModalOpen(true);
  }, [activeTab]);

  const isDataInitializedRef = useRef(false);

  // Server sync helper function for audit records (conserves ONLY the single latest file across environments)
  const syncToServer = useCallback(
    async (
      recordsToSync: PocketAuditRecord[],
      fileName?: string,
      timestamp?: string,
      isUserUploaded: boolean = true
    ) => {
      try {
        const effectiveName = fileName || latestFileName || 'Auditoria_Pockets_Actualizada.xlsx';
        const effectiveTs = timestamp || new Date().toISOString();
        const res = await fetch('/api/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            records: recordsToSync,
            fileName: effectiveName,
            user: currentUser.name || 'Usuario Autorizado',
            source: 'excel_upload',
            isUserUploaded,
            updatedAt: effectiveTs,
            sourceMode: isPublished ? 'published' : 'pre_publish',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setLastSyncTime(formatAuditDateTime(effectiveTs));
          setLastAuditUpdatedAt(effectiveTs);
          localStorage.setItem('stol_latest_updated_at', effectiveTs);
          if (data && data.fileName) {
            setLatestFileName(data.fileName);
            localStorage.setItem('stol_latest_filename', data.fileName);
          }
        }
      } catch (e) {
        console.error('Error sincronizando al servidor:', e);
      }
    },
    [currentUser.name, isPublished, latestFileName]
  );

  // Server sync helper function for inventory items (conserves ONLY the single latest file across environments)
  const syncInventoryToServer = useCallback(
    async (
      inventoryToSync: PocketInventoryItem[],
      fileName?: string,
      timestamp?: string,
      isUserUploaded: boolean = true
    ) => {
      try {
        const effectiveName = fileName || latestInventoryFileName || 'Inventario_Pockets_Actualizado.xlsx';
        const effectiveTs = timestamp || new Date().toISOString();
        const res = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inventory: inventoryToSync,
            fileName: effectiveName,
            user: currentUser.name || 'Usuario Autorizado',
            source: 'excel_inventory_upload',
            isUserUploaded,
            updatedAt: effectiveTs,
            sourceMode: isPublished ? 'published' : 'pre_publish',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setLastInventorySyncTime(formatAuditDateTime(effectiveTs));
          setLastInventoryUpdatedAt(effectiveTs);
          localStorage.setItem('stol_inventory_updated_at', effectiveTs);
          if (data && data.fileName) {
            setLatestInventoryFileName(data.fileName);
            localStorage.setItem('stol_inventory_filename', data.fileName);
          }
        }
      } catch (e) {
        console.error('Error sincronizando inventario al servidor:', e);
      }
    },
    [currentUser.name, isPublished, latestInventoryFileName]
  );

  // Server sync helper for fleet dashboard data
  const syncFleetToServer = useCallback(
    async (
      dataToSync: FleetDashboardData,
      fileName?: string,
      timestamp?: string,
      isUserUploaded: boolean = true
    ) => {
      try {
        const effectiveName = fileName || latestFleetFileName || 'DATA_DASHBOARD_EJECUTIVO.xlsx';
        const effectiveTs = timestamp || new Date().toISOString();
        const res = await fetch('/api/fleet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: dataToSync,
            fileName: effectiveName,
            user: currentUser.name || 'Usuario Autorizado',
            source: 'excel_fleet_upload',
            isUserUploaded,
            updatedAt: effectiveTs,
            sourceMode: isPublished ? 'published' : 'pre_publish',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setLastFleetUpdatedAt(effectiveTs);
          localStorage.setItem('stol_fleet_updated_at', effectiveTs);
          if (data && data.fileName) {
            setLatestFleetFileName(data.fileName);
            localStorage.setItem('stol_fleet_filename', data.fileName);
          }
        }
      } catch (e) {
        console.error('Error sincronizando flota al servidor:', e);
      }
    },
    [currentUser.name, isPublished, latestFleetFileName]
  );

  const handleUpdateFleetData = useCallback(
    async (newData: FleetDashboardData, fileName: string) => {
      const nowIso = new Date().toISOString();
      setFleetData(newData);
      setLatestFleetFileName(fileName);
      setLastFleetUpdatedAt(nowIso);

      await persistLatestFleetData(
        newData,
        fileName,
        currentUser.name || 'Usuario Autorizado',
        isPublished ? 'published' : 'pre_publish',
        true,
        nowIso
      );

      await syncFleetToServer(newData, fileName, nowIso, true);
    },
    [currentUser.name, isPublished, syncFleetToServer]
  );

  const syncPalletsToServer = useCallback(
    async (records: PalletObservation[], fileName?: string, isUserUploaded: boolean = true) => {
      try {
        const effectiveFileName = fileName || latestPalletFileName || 'CONTROL_PALLETS_OBSERVADOS.xlsx';
        const nowIso = new Date().toISOString();
        const res = await fetch('/api/pallets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            records,
            fileName: effectiveFileName,
            user: currentUser.name || 'Usuario Autorizado',
            source: 'excel_pallets_upload',
            isUserUploaded,
            updatedAt: nowIso,
            sourceMode: isPublished ? 'published' : 'pre_publish',
          }),
        });
        if (res.ok) {
          localStorage.setItem('stol_pallets_filename', effectiveFileName);
          localStorage.setItem('stol_pallets_updated_at', nowIso);
          setLatestPalletFileName(effectiveFileName);
          setLastPalletUpdatedAt(nowIso);
        }
      } catch (err) {
        console.error('Error syncing pallets data to server:', err);
      }
    },
    [currentUser.name, isPublished, latestPalletFileName]
  );

  const handleUpdatePalletRecords = useCallback(
    (records: PalletObservation[], fileName?: string) => {
      setPalletRecords(records);
      const effectiveFileName = fileName || latestPalletFileName || 'CONTROL_PALLETS_OBSERVADOS.xlsx';
      setLatestPalletFileName(effectiveFileName);
      const nowIso = new Date().toISOString();
      setLastPalletUpdatedAt(nowIso);
      localStorage.setItem('stol_pallets_records_v1', JSON.stringify(records));
      localStorage.setItem('stol_pallets_filename', effectiveFileName);
      localStorage.setItem('stol_pallets_updated_at', nowIso);
      syncPalletsToServer(records, effectiveFileName, true);
    },
    [latestPalletFileName, syncPalletsToServer]
  );

  // Sync to Storage v3 only after data initialization has completed
  useEffect(() => {
    if (!isDataInitializedRef.current) return;
    localStorage.setItem('stol_pockets_records_v3', JSON.stringify(pocketRecords));
  }, [pocketRecords]);

  useEffect(() => {
    if (!isDataInitializedRef.current) return;
    localStorage.setItem('stol_pallets_records_v1', JSON.stringify(palletRecords));
  }, [palletRecords]);

  useEffect(() => {
    if (!isDataInitializedRef.current) return;
    localStorage.setItem('stol_pocket_inventory_v1', JSON.stringify(pocketInventory));
  }, [pocketInventory]);

  useEffect(() => {
    localStorage.setItem('stol_users_v3', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('stol_current_user_v3', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    sessionStorage.setItem('stol_is_unlocked_v3', isUnlocked ? 'true' : 'false');
  }, [isUnlocked]);

  useEffect(() => {
    localStorage.setItem('stol_memos_v3', JSON.stringify(memos));
  }, [memos]);

  useEffect(() => {
    localStorage.setItem('stol_inductions_v3', JSON.stringify(inductions));
  }, [inductions]);

  // Real-time synchronization: dual-layer persistence (IndexedDB + server) ensuring the latest uploaded file
  // is strictly preserved in both pre-publication (work) and published modes across days, refreshes, and redeploys.
  useEffect(() => {
    let isMounted = true;

    const fetchSharedData = async () => {
      // 1. Password synchronization: ensure modified password is in sync across tabs and refreshes
      syncPasswordFromServer().catch(() => {});

      // 2. Audit records: compare local stored version (IndexedDB/localStorage) vs server hosted version
      try {
        const localData = await getLatestAuditData();
        const localRecords = localData?.records || [];
        const localMeta = localData?.meta;
        const localHasData = localRecords.length > 0;
        const localIsUserUploaded = Boolean(localMeta?.isUserUploaded);
        const localTime = localMeta?.updatedAt || localStorage.getItem('stol_latest_updated_at') || null;

        let serverRecords: PocketAuditRecord[] | null = null;
        let serverFileName: string | null = null;
        let serverUpdatedAt: string | null = null;
        let serverUploadedBy: string | null = null;
        let serverIsUserUploaded = false;

        const res = await fetch(`/api/records?latest=true&t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.records) && data.records.length > 0) {
            serverRecords = data.records;
            serverFileName = data.fileName;
            serverUpdatedAt = data.updatedAt;
            serverUploadedBy = data.updatedBy;
            serverIsUserUploaded = Boolean(data.isUserUploaded || data.source === 'excel_upload');
          }
        }

        // Fallback to static hosted file if dynamic API is not ready or during static export
        if (!serverRecords) {
          try {
            const staticRes = await fetch(`/data/shared_audit_data.json?t=${Date.now()}`, {
              cache: 'no-store',
            });
            if (staticRes.ok) {
              const staticData = await staticRes.json();
              if (staticData && Array.isArray(staticData.records) && staticData.records.length > 0) {
                serverRecords = staticData.records;
                serverFileName = staticData.fileName;
                serverUpdatedAt = staticData.updatedAt;
                serverUploadedBy = staticData.updatedBy;
                serverIsUserUploaded = Boolean(staticData.isUserUploaded || staticData.source === 'excel_upload');
              }
            }
          } catch (e) {
            // Ignore static fallback error
          }
        }

        const serverHasData = Array.isArray(serverRecords) && serverRecords.length > 0;

        let finalRecords: PocketAuditRecord[] | null = null;
        let finalFileName: string = latestFileName;
        let finalUpdatedAt: string | null = null;
        let finalUploadedBy: string = 'Usuario Autorizado';
        let needSyncToServer = false;
        let needSaveLocal = false;

        if (localIsUserUploaded && !serverIsUserUploaded) {
          // USER UPLOAD WINS! Never allow an un-uploaded template seed to overwrite user's data
          finalRecords = localRecords;
          finalFileName = localMeta?.fileName || latestFileName;
          finalUpdatedAt = localTime;
          finalUploadedBy = localMeta?.uploadedBy || 'Usuario Autorizado';
          needSyncToServer = true;
        } else if (!localIsUserUploaded && serverIsUserUploaded) {
          // Server has genuine user upload from another session / published link
          finalRecords = serverRecords!;
          finalFileName = serverFileName || 'Auditoria_Pockets_Actualizada.xlsx';
          finalUpdatedAt = serverUpdatedAt;
          finalUploadedBy = serverUploadedBy || 'Usuario Autorizado';
          needSaveLocal = true;
        } else if (localIsUserUploaded && serverIsUserUploaded) {
          // Both are genuine user uploads! Whichever is newer wins!
          if (isTimestampNewer(serverUpdatedAt, localTime)) {
            finalRecords = serverRecords!;
            finalFileName = serverFileName || latestFileName;
            finalUpdatedAt = serverUpdatedAt;
            finalUploadedBy = serverUploadedBy || 'Usuario Autorizado';
            needSaveLocal = true;
          } else {
            finalRecords = localRecords;
            finalFileName = localMeta?.fileName || latestFileName;
            finalUpdatedAt = localTime;
            finalUploadedBy = localMeta?.uploadedBy || 'Usuario Autorizado';
            if (isTimestampNewer(localTime, serverUpdatedAt)) {
              needSyncToServer = true;
            }
          }
        } else if (serverHasData && (!localHasData || isTimestampNewer(serverUpdatedAt, localTime))) {
          finalRecords = serverRecords!;
          finalFileName = serverFileName || latestFileName;
          finalUpdatedAt = serverUpdatedAt;
          finalUploadedBy = serverUploadedBy || 'Usuario Autorizado';
          needSaveLocal = true;
        } else if (localHasData) {
          finalRecords = localRecords;
          finalFileName = localMeta?.fileName || latestFileName;
          finalUpdatedAt = localTime;
          finalUploadedBy = localMeta?.uploadedBy || 'Usuario Autorizado';
        }

        if (finalRecords && finalRecords.length > 0) {
          const normalizedRecords = finalRecords.map((r) => ({
            ...r,
            fecha: formatDisplayDate(r.fecha, r.mes) || r.fecha,
            mes: r.mes ? r.mes.toUpperCase().trim() : 'SEPTIEMBRE',
          }));

          if (needSaveLocal) {
            await persistLatestAuditData(
              normalizedRecords,
              finalFileName,
              finalUpdatedAt || undefined,
              finalUploadedBy,
              isPublished ? 'published' : 'pre_publish',
              serverIsUserUploaded || localIsUserUploaded
            );
          }

          if (needSyncToServer) {
            syncToServer(normalizedRecords, finalFileName, finalUpdatedAt || undefined, true);
          }

          if (isMounted) {
            setPocketRecords(normalizedRecords);
            setLatestFileName(finalFileName);
            if (finalUpdatedAt) {
              setLastAuditUpdatedAt(finalUpdatedAt);
              setLastSyncTime(formatAuditDateTime(finalUpdatedAt));
              localStorage.setItem('stol_latest_updated_at', finalUpdatedAt);
            }
          }
        }
      } catch (err) {
        console.error('Error synchronizing audit records:', err);
      }

      // 3. Pocket Inventory synchronization (Section 2)
      try {
        const localInvData = await getLatestInventoryData();
        const localInvItems = localInvData?.inventory || [];
        const localInvMeta = localInvData?.meta;
        const localInvHasData = localInvItems.length > 0;
        const localInvIsUserUploaded = Boolean(localInvMeta?.isUserUploaded);
        const localInvTime = localInvMeta?.updatedAt || localStorage.getItem('stol_inventory_updated_at') || null;

        let serverInventory: PocketInventoryItem[] | null = null;
        let serverInvFileName: string | null = null;
        let serverInvUpdatedAt: string | null = null;
        let serverInvUploadedBy: string | null = null;
        let serverInvIsUserUploaded = false;

        const resInv = await fetch(`/api/inventory?latest=true&t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (resInv.ok) {
          const invData = await resInv.json();
          if (invData && Array.isArray(invData.inventory) && invData.inventory.length > 0) {
            serverInventory = invData.inventory;
            serverInvFileName = invData.fileName;
            serverInvUpdatedAt = invData.updatedAt;
            serverInvUploadedBy = invData.updatedBy;
            serverInvIsUserUploaded = Boolean(invData.isUserUploaded || invData.source === 'excel_inventory_upload');
          }
        }

        if (!serverInventory) {
          try {
            const staticInvRes = await fetch(`/data/shared_inventory_data.json?t=${Date.now()}`, {
              cache: 'no-store',
            });
            if (staticInvRes.ok) {
              const staticInvData = await staticInvRes.json();
              if (staticInvData && Array.isArray(staticInvData.inventory) && staticInvData.inventory.length > 0) {
                serverInventory = staticInvData.inventory;
                serverInvFileName = staticInvData.fileName;
                serverInvUpdatedAt = staticInvData.updatedAt;
                serverInvUploadedBy = staticInvData.updatedBy;
                serverInvIsUserUploaded = Boolean(staticInvData.isUserUploaded || staticInvData.source === 'excel_inventory_upload');
              }
            }
          } catch (e) {}
        }

        const serverHasInv = Array.isArray(serverInventory) && serverInventory.length > 0;

        let finalInventory: PocketInventoryItem[] | null = null;
        let finalInvFileName: string | null = latestInventoryFileName;
        let finalInvUpdatedAt: string | null = null;
        let finalInvUploadedBy: string = 'Usuario Autorizado';
        let needSyncInvToServer = false;
        let needSaveInvLocal = false;

        if (localInvIsUserUploaded && !serverInvIsUserUploaded) {
          // User uploaded inventory wins!
          finalInventory = localInvItems;
          finalInvFileName = localInvMeta?.fileName || latestInventoryFileName;
          finalInvUpdatedAt = localInvTime;
          finalInvUploadedBy = localInvMeta?.updatedBy || 'Usuario Autorizado';
          needSyncInvToServer = true;
        } else if (!localInvIsUserUploaded && serverInvIsUserUploaded) {
          finalInventory = serverInventory!;
          finalInvFileName = serverInvFileName || 'Inventario_Pockets_Actualizado.xlsx';
          finalInvUpdatedAt = serverInvUpdatedAt;
          finalInvUploadedBy = serverInvUploadedBy || 'Usuario Autorizado';
          needSaveInvLocal = true;
        } else if (localInvIsUserUploaded && serverInvIsUserUploaded) {
          if (isTimestampNewer(serverInvUpdatedAt, localInvTime)) {
            finalInventory = serverInventory!;
            finalInvFileName = serverInvFileName || latestInventoryFileName;
            finalInvUpdatedAt = serverInvUpdatedAt;
            finalInvUploadedBy = serverInvUploadedBy || 'Usuario Autorizado';
            needSaveInvLocal = true;
          } else {
            finalInventory = localInvItems;
            finalInvFileName = localInvMeta?.fileName || latestInventoryFileName;
            finalInvUpdatedAt = localInvTime;
            finalInvUploadedBy = localInvMeta?.updatedBy || 'Usuario Autorizado';
            if (isTimestampNewer(localInvTime, serverInvUpdatedAt)) {
              needSyncInvToServer = true;
            }
          }
        } else if (serverHasInv && (!localInvHasData || isTimestampNewer(serverInvUpdatedAt, localInvTime))) {
          finalInventory = serverInventory!;
          finalInvFileName = serverInvFileName || latestInventoryFileName;
          finalInvUpdatedAt = serverInvUpdatedAt;
          finalInvUploadedBy = serverInvUploadedBy || 'Usuario Autorizado';
          needSaveInvLocal = true;
        } else if (localInvHasData) {
          finalInventory = localInvItems;
          finalInvFileName = localInvMeta?.fileName || latestInventoryFileName;
          finalInvUpdatedAt = localInvTime;
          finalInvUploadedBy = localInvMeta?.updatedBy || 'Usuario Autorizado';
        }

        if (finalInventory && finalInventory.length > 0) {
          if (needSaveInvLocal) {
            await persistLatestInventory(
              finalInventory,
              finalInvFileName || 'Inventario_Pockets_Actualizado.xlsx',
              finalInvUpdatedAt || undefined,
              finalInvUploadedBy,
              isPublished ? 'published' : 'pre_publish',
              serverInvIsUserUploaded || localInvIsUserUploaded
            );
          }

          if (needSyncInvToServer) {
            syncInventoryToServer(finalInventory, finalInvFileName || undefined, finalInvUpdatedAt || undefined, true);
          }

          if (isMounted) {
            setPocketInventory(finalInventory);
            if (finalInvFileName) {
              setLatestInventoryFileName(finalInvFileName);
            }
            if (finalInvUpdatedAt) {
              setLastInventoryUpdatedAt(finalInvUpdatedAt);
              setLastInventorySyncTime(formatAuditDateTime(finalInvUpdatedAt));
              localStorage.setItem('stol_inventory_updated_at', finalInvUpdatedAt);
            }
          }
        }

        // ==========================================
        // 3. FLEET DATA SYNC (MONTACARGAS & ELEVADORES)
        // ==========================================
        try {
          const fleetRes = await fetch('/api/fleet');
          if (fleetRes.ok) {
            const fleetServerData = await fleetRes.json();
            if (fleetServerData && fleetServerData.data && fleetServerData.data.equipos) {
              const serverFleet = fleetServerData.data as FleetDashboardData;
              const serverFleetUpdated = fleetServerData.updatedAt;
              const serverFleetFileName = fleetServerData.fileName;

              const localFleetRecord = await getLatestFleetData();
              const localFleetTime = localFleetRecord?.meta?.updatedAt || localStorage.getItem('stol_fleet_updated_at');

              if (!localFleetTime || isTimestampNewer(serverFleetUpdated, localFleetTime)) {
                if (isMounted) {
                  setFleetData(serverFleet);
                  if (serverFleetFileName) setLatestFleetFileName(serverFleetFileName);
                  if (serverFleetUpdated) setLastFleetUpdatedAt(serverFleetUpdated);
                }
                await persistLatestFleetData(
                  serverFleet,
                  serverFleetFileName || 'DATA_DASHBOARD_EJECUTIVO.xlsx',
                  fleetServerData.updatedBy || 'Usuario Autorizado',
                  isPublished ? 'published' : 'pre_publish',
                  fleetServerData.isUserUploaded || false,
                  serverFleetUpdated || undefined
                );
              }
            }
          }
        } catch (e) {
          console.error('Error fetching shared fleet data:', e);
        }

        // 4. PALLETS DATA SYNC
        try {
          const palletRes = await fetch('/api/pallets');
          if (palletRes.ok) {
            const palletServerData = await palletRes.json();
            if (palletServerData && Array.isArray(palletServerData.records) && palletServerData.records.length > 0) {
              const serverPallets = palletServerData.records as PalletObservation[];
              const serverPalletUpdated = palletServerData.updatedAt;
              const serverPalletFileName = palletServerData.fileName;
              const localPalletTime = localStorage.getItem('stol_pallets_updated_at');

              if (!localPalletTime || isTimestampNewer(serverPalletUpdated, localPalletTime)) {
                if (isMounted) {
                  setPalletRecords(serverPallets);
                  if (serverPalletFileName) setLatestPalletFileName(serverPalletFileName);
                  if (serverPalletUpdated) setLastPalletUpdatedAt(serverPalletUpdated);
                }
                localStorage.setItem('stol_pallets_records_v1', JSON.stringify(serverPallets));
                if (serverPalletFileName) localStorage.setItem('stol_pallets_filename', serverPalletFileName);
                if (serverPalletUpdated) localStorage.setItem('stol_pallets_updated_at', serverPalletUpdated);
              }
            }
          }
        } catch (e) {
          console.error('Error fetching shared pallets data:', e);
        }
      } catch (err) {
        console.error('Error synchronizing inventory items:', err);
      } finally {
        isDataInitializedRef.current = true;
      }
    };

    fetchSharedData();
    const interval = setInterval(fetchSharedData, 6000);

    const handleFocus = () => fetchSharedData();
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isPublished, latestFileName, latestInventoryFileName, latestFleetFileName, latestPalletFileName, syncInventoryToServer, syncToServer, syncFleetToServer, syncPalletsToServer]);

  // If locked, effective permissions are strictly viewer mode
  const effectiveUser: AppUser = useMemo(() => {
    if (!isUnlocked) {
      return {
        ...currentUser,
        role: 'viewer',
        roleTitle: 'Solo Visualización',
        canUpload: false,
        canEdit: false,
      };
    }
    return currentUser;
  }, [currentUser, isUnlocked]);

  // Filter options derived strictly from pocket records (Pockets Tab)
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    pocketRecords.forEach((r) => {
      if (r.mes && r.mes.trim() !== '' && r.mes.trim() !== '-' && r.mes.trim() !== '--') {
        let m = r.mes.toUpperCase().trim();
        if (m === 'SETIEMBRE') m = 'SEPTIEMBRE';
        monthSet.add(m);
      }
    });
    const monthOrder: Record<string, number> = {
      ENERO: 1,
      FEBRERO: 2,
      MARZO: 3,
      ABRIL: 4,
      MAYO: 5,
      JUNIO: 6,
      JULIO: 7,
      AGOSTO: 8,
      SEPTIEMBRE: 9,
      SETIEMBRE: 9,
      OCTUBRE: 10,
      NOVIEMBRE: 11,
      DICIEMBRE: 12,
    };
    return Array.from(monthSet).sort((a, b) => (monthOrder[b] || 0) - (monthOrder[a] || 0));
  }, [pocketRecords]);

  // Available weeks contextually derived based on multi-selected months for Pockets
  const availableWeeks = useMemo(() => {
    const selectedMonths = (filters.meses && filters.meses.length > 0)
      ? filters.meses.filter((m) => m !== 'TODOS').map((m) => m === 'SETIEMBRE' ? 'SEPTIEMBRE' : m.toUpperCase().trim())
      : (filters.mes && filters.mes !== 'TODOS' ? [filters.mes === 'SETIEMBRE' ? 'SEPTIEMBRE' : filters.mes.toUpperCase().trim()] : []);

    const scope = selectedMonths.length === 0
      ? pocketRecords
      : pocketRecords.filter((r) => {
          let m = (r.mes || '').toUpperCase().trim();
          if (m === 'SETIEMBRE') m = 'SEPTIEMBRE';
          return selectedMonths.includes(m);
        });

    const weeks = Array.from(new Set(scope.map((r) => r.semana)))
      .filter(Boolean)
      .filter((w) => w && w.trim() !== '-' && w.trim() !== '--');
    return weeks.sort((a, b) => {
      const numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
      return numB - numA;
    });
  }, [pocketRecords, filters.meses, filters.mes]);

  const availableAreas = useMemo(() => {
    const areas = Array.from(new Set(pocketRecords.map((r) => r.area)))
      .filter(Boolean)
      .filter((a) => a && a.trim() !== '-' && a.trim() !== '--');
    return areas.sort();
  }, [pocketRecords]);

  const availableDates = useMemo(() => {
    const dates = Array.from(
      new Set(
        pocketRecords.map((r) => {
          const formatted = formatDisplayDate(r.fecha);
          return formatted || r.fecha;
        })
      )
    )
      .filter(Boolean)
      .filter((d) => d && d.trim() !== '-' && d.trim() !== '--');

    // Ordenar de mayor a menor (fechas más recientes primero)
    return dates.sort((a, b) => {
      const partsA = a.split('/').map(Number);
      const partsB = b.split('/').map(Number);
      if (partsA.length === 3 && partsB.length === 3) {
        const timeA = new Date(partsA[2], partsA[1] - 1, partsA[0]).getTime();
        const timeB = new Date(partsB[2], partsB[1] - 1, partsB[0]).getTime();
        return timeB - timeA;
      }
      return b.localeCompare(a);
    });
  }, [pocketRecords]);

  // Filtered pocket records supporting multiple months, multiple weeks, multiple dates, and multiple areas
  const filteredPocketRecords = useMemo(() => {
    return pocketRecords.filter((rec) => {
      let recMesUpper = (rec.mes || '').toUpperCase().trim();
      if (recMesUpper === 'SETIEMBRE') recMesUpper = 'SEPTIEMBRE';

      const selectedMonths = (filters.meses && filters.meses.length > 0)
        ? filters.meses.filter((m) => m !== 'TODOS').map((m) => m === 'SETIEMBRE' ? 'SEPTIEMBRE' : m.toUpperCase().trim())
        : (filters.mes && filters.mes !== 'TODOS' ? [filters.mes === 'SETIEMBRE' ? 'SEPTIEMBRE' : filters.mes.toUpperCase().trim()] : []);

      const matchMes = selectedMonths.length === 0 || selectedMonths.includes(recMesUpper);

      const selectedWeeks = (filters.semanas && filters.semanas.length > 0)
        ? filters.semanas.filter((s) => s !== 'TODAS')
        : (filters.semana && filters.semana !== 'TODAS' ? [filters.semana] : []);

      const matchSemana = selectedWeeks.length === 0 || selectedWeeks.includes(rec.semana);

      // Filtro de fecha para Pockets
      const selectedDates = (filters.fechas && filters.fechas.length > 0)
        ? filters.fechas.filter((f) => f !== 'TODAS')
        : (filters.fecha && filters.fecha !== 'TODAS' ? [filters.fecha] : []);

      const normRecFecha = formatDisplayDate(rec.fecha) || rec.fecha;
      const matchFecha = selectedDates.length === 0 || selectedDates.some((f) => {
        const normF = formatDisplayDate(f) || f;
        return normRecFecha === normF || rec.fecha === f;
      });

      const selectedAreas = (filters.areas && filters.areas.length > 0)
        ? filters.areas.filter((a) => a !== 'TODAS').map((a) => a.toUpperCase().trim())
        : (filters.area && filters.area !== 'TODAS' ? [filters.area.toUpperCase().trim()] : []);

      const recAreaUpper = (rec.area || '').toUpperCase().trim();
      const matchArea = selectedAreas.length === 0 || selectedAreas.includes(recAreaUpper);

      const matchQuery =
        !filters.searchQuery ||
        rec.area.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        (rec.motivoNoUso && rec.motivoNoUso.toLowerCase().includes(filters.searchQuery.toLowerCase())) ||
        rec.auditor.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        (rec.observaciones && rec.observaciones.toLowerCase().includes(filters.searchQuery.toLowerCase()));

      return matchMes && matchSemana && matchFecha && matchArea && matchQuery;
    });
  }, [pocketRecords, filters]);

  const periodPocketRecords = useMemo(
    () => pocketRecords.filter((record) => matchesPeriod(record.fecha, analysisPeriod)),
    [pocketRecords, analysisPeriod]
  );
  const periodFilteredPocketRecords = useMemo(
    () => filteredPocketRecords.filter((record) => matchesPeriod(record.fecha, analysisPeriod)),
    [filteredPocketRecords, analysisPeriod]
  );
  const periodPalletRecords = useMemo(
    () => palletRecords.filter((record) => matchesPeriod(record.fecha, analysisPeriod)),
    [palletRecords, analysisPeriod]
  );
  const periodMemos = useMemo(
    () => memos.filter((record) => matchesPeriod(record.fecha, analysisPeriod)),
    [memos, analysisPeriod]
  );
  const periodInductions = useMemo(
    () => inductions.filter((record) => matchesPeriod(record.fecha, analysisPeriod)),
    [inductions, analysisPeriod]
  );

  // Handle password unlock
  const handleUnlockSuccess = (authenticatedUser: AppUser) => {
    setIsUnlocked(true);
    setCurrentUser(authenticatedUser);

    // Update or add user to users directory
    setUsers((prev) => {
      const exists = prev.some((u) => u.email.toLowerCase() === authenticatedUser.email.toLowerCase());
      if (exists) {
        return prev.map((u) =>
          u.email.toLowerCase() === authenticatedUser.email.toLowerCase()
            ? { ...u, lastLogin: authenticatedUser.lastLogin, accessCount: (u.accessCount || 0) + 1 }
            : u
        );
      }
      return [authenticatedUser, ...prev];
    });
  };

  const handleRegisterUserFromKey = (newUser: AppUser) => {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.email.toLowerCase() === newUser.email.toLowerCase());
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newUser;
        return copy;
      }
      return [newUser, ...prev];
    });
  };

  const handleLockSession = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem('stol_is_unlocked_v3');
    if (activeTab === 'roles') {
      setActiveTab('pockets');
    }
  };

  // Massive upload handler for audit data (dual-layer persistence for today, tomorrow, and future days)
  const handleImportSuccess = async (newRecords: PocketAuditRecord[], fileName?: string) => {
    const updated = newRecords;
    const effectiveFileName = fileName || 'Auditoria_Pockets_Actualizada.xlsx';
    const nowIso = new Date().toISOString();

    setPocketRecords(updated);
    setLatestFileName(effectiveFileName);
    setLastAuditUpdatedAt(nowIso);
    setLastSyncTime(formatAuditDateTime(nowIso));
    localStorage.setItem('stol_latest_filename', effectiveFileName);
    localStorage.setItem('stol_latest_updated_at', nowIso);

    // 1. Dual-layer local persistence (survives container restarts, day transitions, and offline)
    await persistLatestAuditData(
      updated,
      effectiveFileName,
      nowIso,
      effectiveUser.name || 'Usuario Autorizado',
      isPublished ? 'published' : 'pre_publish',
      true
    );

    // 2. Server persistence (writes to data_store/, public/data/ and dist/data/ for publishing)
    await syncToServer(updated, effectiveFileName, nowIso, true);

    // Default to Todos los Meses, Todas las Semanas y Todas las Áreas
    setFilters({
      meses: [],
      semanas: [],
      areas: [],
      mes: 'TODOS',
      semana: 'TODAS',
      area: 'TODAS',
      searchQuery: '',
    });
  };

  // Inventory upload handler (dual-layer persistence for Section 2: Inventario de Pockets)
  const handleInventoryImportSuccess = async (newInventory: PocketInventoryItem[], fileName?: string) => {
    const effectiveFileName = fileName || 'Inventario_Pockets_Actualizado.xlsx';
    const nowIso = new Date().toISOString();

    setPocketInventory(newInventory);
    setLatestInventoryFileName(effectiveFileName);
    setLastInventoryUpdatedAt(nowIso);
    setLastInventorySyncTime(formatAuditDateTime(nowIso));
    localStorage.setItem('stol_inventory_filename', effectiveFileName);
    localStorage.setItem('stol_inventory_updated_at', nowIso);

    // 1. Dual-layer local persistence (survives container restarts, day transitions, and offline)
    await persistLatestInventory(
      newInventory,
      effectiveFileName,
      nowIso,
      effectiveUser.name || 'Usuario Autorizado',
      isPublished ? 'published' : 'pre_publish',
      true
    );

    // 2. Server persistence (writes to data_store/, public/data/ and dist/data/ for publishing)
    await syncInventoryToServer(newInventory, effectiveFileName, nowIso, true);
  };

  const handleAddPocketRecord = async (newRec: PocketAuditRecord) => {
    const formattedRec: PocketAuditRecord = {
      ...newRec,
      fecha: formatDisplayDate(newRec.fecha, newRec.mes) || newRec.fecha,
      mes: newRec.mes ? newRec.mes.toUpperCase().trim() : 'SEPTIEMBRE',
    };
    const updated = [formattedRec, ...pocketRecords];
    const nowIso = new Date().toISOString();
    setPocketRecords(updated);
    await persistLatestAuditData(
      updated,
      latestFileName,
      nowIso,
      effectiveUser.name || 'Usuario Autorizado',
      isPublished ? 'published' : 'pre_publish',
      true
    );
    await syncToServer(updated, latestFileName, nowIso, true);
  };

  const handleDeletePocketRecord = async (id: string) => {
    const updated = pocketRecords.filter((r) => r.id !== id);
    const nowIso = new Date().toISOString();
    setPocketRecords(updated);
    await persistLatestAuditData(
      updated,
      latestFileName,
      nowIso,
      effectiveUser.name || 'Usuario Autorizado',
      isPublished ? 'published' : 'pre_publish',
      true
    );
    await syncToServer(updated, latestFileName, nowIso, true);
  };

  const handleAddMemo = (memo: MemoRecord) => {
    setMemos((prev) => [memo, ...prev]);
  };

  const handleAddInduction = (ind: InductionRecord) => {
    setInductions((prev) => [ind, ...prev]);
  };

  // Export current filtered view to Excel (Includes Col G, Col H, and Col L)
  const handleExportExcel = () => {
    const exportData = filteredPocketRecords.map((r) => {
      const pctCumpl = r.pctCumplimientoRegistro !== undefined
        ? `${r.pctCumplimientoRegistro}%`
        : (r.totalAsignados > 0 ? `${Math.round(((r.pocketsRegistrados || r.totalAsignados) / r.totalAsignados) * 100)}%` : '100%');

      return {
        Fecha: r.fecha,
        Mes: r.mes,
        Semana: r.semana,
        Área: r.area,
        Turno: r.turno || 'Mañana',
        'Total Asignados': r.totalAsignados,
        'Pocket Que Usan (Col G)': r.pocketsEnUso,
        'Pockets Sin Uso (Col H)': r.pocketsSinUso,
        'Motivo No Uso': r.motivoNoUso || '—',
        Auditor: r.auditor,
        Observaciones: r.observaciones || '',
        '% Cumplimiento Registro (Col L)': pctCumpl,
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pockets_Auditoria');
    XLSX.writeFile(wb, `Auditoria_Pockets_${filters.semana}_${filters.mes}.xlsx`);
  };

  // Reset to default general view
  const handleResetData = () => {
    if (window.confirm('¿Desea restablecer todos los filtros a Todos los Meses, Todas las Semanas y Todas las Áreas?')) {
      setFilters({
        meses: [],
        semanas: [],
        areas: [],
        mes: 'TODOS',
        semana: 'TODAS',
        area: 'TODAS',
        searchQuery: '',
      });
    }
  };

  // Friendly title for the breadcrumb
  const activeViewTitle =
    activeTab === 'resumen'
      ? 'Resumen Ejecutivo'
      : activeTab === 'pockets'
      ? 'Control de Pockets'
      : activeTab === 'pallets'
      ? 'Control de Pallets Observados – Seguimiento y Regularización'
      : activeTab === 'montacargas'
      ? 'Horómetros e Inoperatividades de Montacargas'
      : activeTab === 'supervisores'
      ? 'Evaluación de Desempeño – Supervisores 2026'
      : activeTab === 'reportes'
      ? 'Reportes Específicos'
      : activeTab === 'registros'
      ? 'Base de Registros'
      : 'Gestión de Roles';

  return (
    <div className="min-h-screen bg-[#F4F6F7] text-[#1A1A2E] flex font-sans selection:bg-[#E0A23A]/20 selection:text-[#1A1A2E]">
      {/* 1. Dynamic Side Navigation Bar (Auditoría: Pockets, Pallets, Memos, Inducción, Montacargas) */}
      <Sidebar
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        pocketsCount={pocketRecords.length}
        palletsCount={palletRecords.length}
        memosCount={memos.length}
        inductionsCount={inductions.length}
        fleetCount={fleetData.equipos ? fleetData.equipos.length : 19}
        usersCount={users.length}
        isUnlocked={isUnlocked}
        currentUser={currentUser}
        onOpenAccessKeyModal={() => setIsAccessKeyModalOpen(true)}
        onLockSession={handleLockSession}
        onOpenUploadModal={() => {
          if (!isUnlocked) {
            setIsAccessKeyModalOpen(true);
          } else {
            setIsUploadModalOpen(true);
          }
        }}
        onOpenPhotoSummaryModal={() => handleOpenPhotoSummary()}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Header Banner (Clean & Non-saturated) */}
        <Header
          currentUser={effectiveUser}
          isUnlocked={isUnlocked}
          onOpenAccessKeyModal={() => setIsAccessKeyModalOpen(true)}
          onLockSession={handleLockSession}
          onOpenUploadModal={() => {
            if (!isUnlocked) {
              setIsAccessKeyModalOpen(true);
            } else {
              setIsUploadModalOpen(true);
            }
          }}
          onOpenPhotoSummaryModal={() => handleOpenPhotoSummary()}
          onResetData={handleResetData}
          activeViewTitle={activeViewTitle}
          activeTab={activeTab}
          lastSyncTime={lastSyncTime}
          lastAuditUpdatedAt={lastAuditUpdatedAt}
          latestFileName={latestFileName}
          isPublished={isPublished}
        />

        {/* Active Content Body */}
        <main className="flex-1 p-4 max-w-[1700px] w-full mx-auto">
          {activeTab !== 'roles' && (
            <GlobalPeriodFilter value={analysisPeriod} onChange={handleAnalysisPeriodChange} />
          )}

          {activeTab === 'resumen' && (
            <ExecutiveSummaryDashboard
              pocketRecords={periodPocketRecords}
              palletRecords={periodPalletRecords}
              fleetData={fleetData}
              analysisPeriod={analysisPeriod}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'pockets' && (
            <PocketsDashboard
              records={periodFilteredPocketRecords}
              allRecords={periodPocketRecords}
              filters={filters}
              onFilterChange={setFilters}
              filterMonths={availableMonths}
              filterWeeks={availableWeeks}
              filterAreas={availableAreas}
              filterDates={availableDates}
              inventory={pocketInventory}
              isUnlocked={isUnlocked}
              onOpenAccessKeyModal={() => setIsAccessKeyModalOpen(true)}
              onOpenAuditUploadModal={() => {
                if (!isUnlocked) {
                  setIsAccessKeyModalOpen(true);
                } else {
                  setIsUploadModalOpen(true);
                }
              }}
              onOpenInventoryUploadModal={() => {
                if (!isUnlocked) {
                  setIsAccessKeyModalOpen(true);
                } else {
                  setIsInventoryUploadModalOpen(true);
                }
              }}
              latestAuditFileName={latestFileName}
              lastAuditUpdatedAt={lastAuditUpdatedAt}
              latestInventoryFileName={latestInventoryFileName}
              lastInventorySyncTime={lastInventorySyncTime}
              lastInventoryUpdatedAt={lastInventoryUpdatedAt}
              onExportAuditExcel={handleExportExcel}
              onOpenPhotoSummary={() => handleOpenPhotoSummary('pockets')}
              isPublished={isPublished}
            />
          )}

          {activeTab === 'pallets' && (
            <PalletsDashboard
              allRecords={periodPalletRecords}
              analysisPeriod={analysisPeriod}
              isUnlocked={isUnlocked}
              onOpenAccessKeyModal={() => setIsAccessKeyModalOpen(true)}
              onUpdateRecords={handleUpdatePalletRecords}
              onOpenPhotoSummary={() => handleOpenPhotoSummary('pallets')}
              latestFileName={latestPalletFileName}
              lastUpdatedAt={lastPalletUpdatedAt}
            />
          )}

          {activeTab === 'montacargas' && (
            <div id="montacargas-dashboard-view">
              <FleetDashboardSection
                fleetData={fleetData}
                onUpdateFleetData={handleUpdateFleetData}
                isUnlocked={isUnlocked}
                onOpenAccessKeyModal={() => setIsAccessKeyModalOpen(true)}
                onOpenPhotoSummary={() => handleOpenPhotoSummary('montacargas')}
                latestFleetFileName={latestFleetFileName}
                lastFleetUpdatedAt={lastFleetUpdatedAt}
                isPublished={isPublished}
                analysisPeriod={analysisPeriod}
              />
            </div>
          )}

          {activeTab === 'supervisores' && (
            <div id="supervisores-dashboard-view">
              <SupervisorsDashboard
                analysisPeriod={analysisPeriod}
                onOpenPhotoSummary={() => handleOpenPhotoSummary('supervisores')}
              />
            </div>
          )}

          {activeTab === 'reportes' && (
            <ReportsDashboard
              pocketRecords={periodPocketRecords}
              palletRecords={periodPalletRecords}
              memos={periodMemos}
              inductions={periodInductions}
              filters={filters}
              onOpenPhotoSummary={() => handleOpenPhotoSummary('todas')}
            />
          )}

          {activeTab === 'registros' && (
            <PocketRecordsTable
              records={periodFilteredPocketRecords}
              currentUser={effectiveUser}
              onAddRecord={handleAddPocketRecord}
              onDeleteRecord={handleDeletePocketRecord}
              onOpenAccessKeyModal={() => setIsAccessKeyModalOpen(true)}
            />
          )}

          {activeTab === 'roles' && (
            isUnlocked ? (
              <RolesDashboard
                users={users}
                currentUser={effectiveUser}
                onSelectCurrentUser={setCurrentUser}
                onUpdateUsers={setUsers}
              />
            ) : (
              <div className="bg-white border-2 border-slate-300 rounded-2xl p-8 max-w-xl mx-auto my-12 shadow-xl text-center space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center mx-auto shadow-md">
                  <Lock className="w-8 h-8 font-black" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide">
                    Módulo de Roles y Seguridad Protegido
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    Para visualizar y gestionar los usuarios, roles y permisos de carga, ingrese con la contraseña corporativa autorizada.
                  </p>
                </div>

                <button
                  onClick={() => setIsAccessKeyModalOpen(true)}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl shadow-md transition-all cursor-pointer text-xs"
                >
                  ⚡ Desbloquear Módulo de Roles
                </button>
              </div>
            )
          )}
        </main>
      </div>

      {/* 3. Modals */}
      <AccessKeyModal
        isOpen={isAccessKeyModalOpen}
        onClose={() => setIsAccessKeyModalOpen(false)}
        users={users}
        onSuccess={handleUnlockSuccess}
        onRegisterUser={handleRegisterUserFromKey}
      />

      <DataUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      <InventoryUploadModal
        isOpen={isInventoryUploadModalOpen}
        onClose={() => setIsInventoryUploadModalOpen(false)}
        onImportSuccess={handleInventoryImportSuccess}
      />

      <RoleManagementModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        users={users}
        currentUser={effectiveUser}
        onSelectCurrentUser={setCurrentUser}
        onUpdateUsers={setUsers}
      />

      <ExecutiveSummaryPhotoModal
        isOpen={isPhotoSummaryModalOpen}
        onClose={() => setIsPhotoSummaryModalOpen(false)}
        initialScope={photoSummaryScope}
        pocketRecords={pocketRecords}
        pocketInventory={pocketInventory}
        palletRecords={palletRecords}
        fleetData={fleetData}
        memos={memos}
        inductions={inductions}
        currentUser={effectiveUser}
      />
    </div>
  );
}
