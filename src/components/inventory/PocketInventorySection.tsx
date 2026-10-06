import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Ban,
  Upload,
  Download,
  Search,
  Users,
  Building2,
  PieChart as PieChartIcon,
  BarChart3,
  FileSpreadsheet,
  Clock,
  Calendar,
  Zap,
} from 'lucide-react';
import { PocketInventoryItem, SupervisorInventoryMetric } from '../../types';
import { formatAuditDateTime } from '../../utils/persistence';

interface PocketInventorySectionProps {
  inventory: PocketInventoryItem[];
  isUnlocked: boolean;
  onOpenAccessKeyModal: () => void;
  onOpenInventoryUploadModal: () => void;
  latestInventoryFileName?: string | null;
  lastInventorySyncTime?: string | null;
  lastInventoryUpdatedAt?: string | null;
  isPublished?: boolean;
}

export const PocketInventorySection: React.FC<PocketInventorySectionProps> = ({
  inventory,
  isUnlocked,
  onOpenAccessKeyModal,
  onOpenInventoryUploadModal,
  latestInventoryFileName,
  lastInventorySyncTime,
  lastInventoryUpdatedAt,
  isPublished = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'OPERATIVO' | 'INOPERATIVO' | 'POR_REPARAR' | 'DADO_DE_BAJA'>('TODOS');
  const [areaFilter, setAreaFilter] = useState('TODAS');

  // 1. Calculations for Point 1: Total, Operativos, Inoperativos (Cant & %)
  const totalCount = inventory.length;
  const operativosCount = inventory.filter((item) => item.estado === 'OPERATIVO').length;
  const inoperativosCount = inventory.filter((item) => item.estado === 'INOPERATIVO').length;

  const pctOperativos = totalCount > 0 ? (operativosCount / totalCount) * 100 : 0;
  const pctInoperativos = totalCount > 0 ? (inoperativosCount / totalCount) * 100 : 0;

  // 2. Calculations for Point 3: De los inoperativos, cuántos por reparar y cuántos dados de baja
  const inoperativosItems = useMemo(
    () => inventory.filter((item) => item.estado === 'INOPERATIVO'),
    [inventory]
  );

  const porRepararCount = inoperativosItems.filter((item) => item.mantenimiento === 'POR REPARAR').length;
  const dadosDeBajaCount = inoperativosItems.filter((item) => item.mantenimiento === 'DADO DE BAJA').length;
  const sinDiagnosticoCount = Math.max(0, inoperativosCount - porRepararCount - dadosDeBajaCount);

  // Percentages relative to inoperativos
  const pctPorRepararDeInop = inoperativosCount > 0 ? (porRepararCount / inoperativosCount) * 100 : 0;
  const pctDadosDeBajaDeInop = inoperativosCount > 0 ? (dadosDeBajaCount / inoperativosCount) * 100 : 0;

  // 3. Calculations for Point 2: Consolidated by Area & Supervisor (% del total)
  const supervisorMetrics: SupervisorInventoryMetric[] = useMemo(() => {
    const map = new Map<string, {
      area: string;
      responsable: string;
      total: number;
      operativos: number;
      inoperativos: number;
      porReparar: number;
      dadosDeBaja: number;
    }>();

    inventory.forEach((item) => {
      const key = `${item.area.toUpperCase()}__${item.responsable.toUpperCase()}`;
      if (!map.has(key)) {
        map.set(key, {
          area: item.area.toUpperCase(),
          responsable: item.responsable.toUpperCase(),
          total: 0,
          operativos: 0,
          inoperativos: 0,
          porReparar: 0,
          dadosDeBaja: 0,
        });
      }
      const entry = map.get(key)!;
      entry.total += 1;
      if (item.estado === 'OPERATIVO') {
        entry.operativos += 1;
      } else {
        entry.inoperativos += 1;
        if (item.mantenimiento === 'POR REPARAR') entry.porReparar += 1;
        if (item.mantenimiento === 'DADO DE BAJA') entry.dadosDeBaja += 1;
      }
    });

    const result: SupervisorInventoryMetric[] = [];
    map.forEach((val) => {
      const pctDelTotal = totalCount > 0 ? (val.total / totalCount) * 100 : 0;
      const pctOperativos = val.total > 0 ? (val.operativos / val.total) * 100 : 0;
      const pctInoperativos = val.total > 0 ? (val.inoperativos / val.total) * 100 : 0;

      result.push({
        area: val.area,
        responsable: val.responsable,
        total: val.total,
        pctDelTotal: Number(pctDelTotal.toFixed(1)),
        operativos: val.operativos,
        pctOperativos: Number(pctOperativos.toFixed(1)),
        inoperativos: val.inoperativos,
        pctInoperativos: Number(pctInoperativos.toFixed(1)),
        porReparar: val.porReparar,
        dadosDeBaja: val.dadosDeBaja,
      });
    });

    return result.sort((a, b) => b.total - a.total);
  }, [inventory, totalCount]);

  // Distinct areas for filter dropdown
  const distinctAreas = useMemo(() => {
    return Array.from(new Set(inventory.map((i) => i.area.toUpperCase()))).sort();
  }, [inventory]);

  // Area badge color helper (diseño dinámico, adaptado al tamaño para evitar que se vea ajustado)
  const getAreaBadgeClass = (areaName: string) => {
    const norm = areaName.toUpperCase().trim();
    if (norm.includes('CONTROL') || norm.includes('RECURSO')) {
      return 'bg-gradient-to-r from-cyan-50 to-sky-100 text-cyan-950 border-2 border-cyan-400 font-black px-3.5 py-1.5 rounded-xl text-xs inline-flex items-center gap-2 shadow-xs tracking-wide leading-normal';
    }
    if (norm.includes('CROSS')) return 'bg-gradient-to-r from-blue-50 to-indigo-100 text-blue-950 border-2 border-blue-400 font-black px-3.5 py-1.5 rounded-xl text-xs inline-flex items-center gap-2 shadow-xs tracking-wide leading-normal';
    if (norm.includes('PICKING')) return 'bg-gradient-to-r from-emerald-50 to-teal-100 text-emerald-950 border-2 border-emerald-400 font-black px-3.5 py-1.5 rounded-xl text-xs inline-flex items-center gap-2 shadow-xs tracking-wide leading-normal';
    if (norm.includes('DESPACHO')) return 'bg-gradient-to-r from-amber-50 to-orange-100 text-amber-950 border-2 border-amber-400 font-black px-3.5 py-1.5 rounded-xl text-xs inline-flex items-center gap-2 shadow-xs tracking-wide leading-normal';
    return 'bg-gradient-to-r from-purple-50 to-fuchsia-100 text-purple-950 border-2 border-purple-400 font-black px-3.5 py-1.5 rounded-xl text-xs inline-flex items-center gap-2 shadow-xs tracking-wide leading-normal';
  };

  // Filtered pocket list for table
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        item.serie.toLowerCase().includes(q) ||
        item.area.toLowerCase().includes(q) ||
        item.responsable.toLowerCase().includes(q) ||
        (item.observaciones && item.observaciones.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (areaFilter !== 'TODAS' && item.area.toUpperCase() !== areaFilter.toUpperCase()) {
        return false;
      }

      if (statusFilter === 'OPERATIVO') return item.estado === 'OPERATIVO';
      if (statusFilter === 'INOPERATIVO') return item.estado === 'INOPERATIVO';
      if (statusFilter === 'POR_REPARAR') return item.mantenimiento === 'POR REPARAR';
      if (statusFilter === 'DADO_DE_BAJA') return item.mantenimiento === 'DADO DE BAJA';

      return true;
    });
  }, [inventory, searchTerm, areaFilter, statusFilter]);

  // Export current inventory view to Excel
  const handleExportInventoryExcel = () => {
    const exportData = filteredInventory.map((item) => ({
      'N°': item.numero,
      'SERIE DE POCKET': item.serie,
      'AREA': item.area,
      'ESTADO': item.estado,
      'RESPONSABLE': item.responsable,
      'OBSERVACIONES': item.observaciones || '-',
      'MANTENIMIENTO': item.mantenimiento || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario_Pockets');
    XLSX.writeFile(wb, `Inventario_Pockets_STOL_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Download official template
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        'N°': 1,
        'SERIE DE POCKET': '19115B5367',
        'AREA': 'CROSS DOCKING',
        'ESTADO': 'OPERATIVO',
        'RESPONSABLE': 'MARCO SILVA',
        'OBSERVACIONES': '-',
        'MANTENIMIENTO': '',
      },
      {
        'N°': 2,
        'SERIE DE POCKET': '22097B1FD5',
        'AREA': 'CROSS DOCKING',
        'ESTADO': 'OPERATIVO',
        'RESPONSABLE': 'MARCO SILVA',
        'OBSERVACIONES': '-',
        'MANTENIMIENTO': '',
      },
      {
        'N°': 7,
        'SERIE DE POCKET': '22067B2D08',
        'AREA': 'CROSS DOCKING',
        'ESTADO': 'INOPERATIVO',
        'RESPONSABLE': 'MARCO SILVA',
        'OBSERVACIONES': 'FALLA DEL TECLADO',
        'MANTENIMIENTO': 'POR REPARAR',
      },
      {
        'N°': 8,
        'SERIE DE POCKET': '21077B351D',
        'AREA': 'CROSS DOCKING',
        'ESTADO': 'INOPERATIVO',
        'RESPONSABLE': 'MARCO SILVA',
        'OBSERVACIONES': 'FALLO EN EL SISTEMA',
        'MANTENIMIENTO': 'DADO DE BAJA',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla_Inventario');
    XLSX.writeFile(wb, 'Plantilla_Inventario_Pockets_STOL.xlsx');
  };

  return (
    <div id="section-pocket-inventory" className="mt-8 pt-6 border-t-2 border-slate-300 space-y-5">
      {/* 1. Header Banner of the Inventory Section (Vivid matching Section 1) */}
      <div className="bg-gradient-to-r from-[#1A1A2E] via-[#1E293B] to-[#0F172A] text-white p-4 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-4 border-2 border-slate-700">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-md text-white font-black">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-black tracking-wide uppercase font-sans text-white">
                SECCIÓN 2: PARQUE FÍSICO E INVENTARIO DE POCKETS (STOL)
              </h2>
              <span className="bg-white/20 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                {totalCount} Equipos Registrados
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Estado de operatividad, asignación por supervisor/área y diagnóstico de mantenimiento
            </p>
          </div>
        </div>

        {/* Action buttons & Persistence status */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Environment Mode Badge */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-bold border bg-slate-800/80 border-slate-600 text-slate-200"
            title={
              isPublished
                ? 'Modo Publicado: El inventario se conserva permanentemente para hoy y próximos días en el servidor y su navegador.'
                : 'Modo Pre-Publicación: El inventario que cargue se conserva para trabajar en producción y queda listo para la publicación.'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${isPublished ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}
            ></span>
            <span>{isPublished ? 'Modo: Publicado' : 'Modo: Pre-Publicación'}</span>
          </div>

          {/* Badge de Archivo, Fecha y Hora Exacta de Subida */}
          <div
            className="flex items-center gap-2 bg-slate-800/80 border border-slate-600 px-3 py-1 rounded-full text-[11px] text-slate-200 shadow-2xs"
            title={`Último archivo de inventario: ${latestInventoryFileName || 'Inventario_Pockets_Actualizado.xlsx'}. Subido: ${formatAuditDateTime(lastInventoryUpdatedAt || lastInventorySyncTime) || 'Fecha no disponible'}`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-[10.5px] font-bold text-white truncate max-w-[160px]">
              {latestInventoryFileName || 'Inventario_Pockets_Actualizado.xlsx'}
            </span>
            <span className="text-slate-600 text-xs font-light">|</span>
            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="text-[10.5px] font-medium text-slate-300">
              {formatAuditDateTime(lastInventoryUpdatedAt || lastInventorySyncTime) ? (
                `Subido: ${formatAuditDateTime(lastInventoryUpdatedAt || lastInventorySyncTime)}`
              ) : (
                'Sin fecha de carga'
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer shadow-2xs"
            title="Descargar plantilla Excel con el formato oficial"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Plantilla</span>
          </button>

          <button
            type="button"
            onClick={handleExportInventoryExcel}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer shadow-2xs"
            title="Exportar inventario filtrado a archivo Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>

          <button
            type="button"
            id="btn-upload-inventory"
            onClick={() => {
              if (!isUnlocked) {
                onOpenAccessKeyModal();
              } else {
                onOpenInventoryUploadModal();
              }
            }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black px-3.5 py-1.5 rounded-xl shadow-md transition-colors cursor-pointer"
            title={isUnlocked ? 'Cargar nuevo archivo Excel de inventario' : 'Desbloquear para cargar archivo'}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Cargar Excel Inventario</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards: Cantidad & Porcentaje con Colores Vivos y Dinámicos (Estilo Sección 1) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Pockets (Royal Blue Gradient) */}
        <div className="bg-gradient-to-br from-[#1E40AF] to-[#1E3A8A] text-white rounded-2xl p-4 shadow-md border-2 border-[#3B82F6]/60 flex flex-col justify-between relative overflow-hidden animate-kpi-entrance kpi-delay-1 hover:-translate-y-1 hover:shadow-lg transition-all cursor-default">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none -mr-6 -mt-6" />
          <div className="flex items-center justify-between z-10">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-blue-200">
              Dotación Total Parque
            </span>
            <div className="p-2 rounded-xl bg-white/15 text-white backdrop-blur-xs">
              <Smartphone className="w-4 h-4 text-blue-200" />
            </div>
          </div>
          <div className="my-2 z-10">
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
              {totalCount}
            </div>
            <p className="text-[11px] text-blue-200 font-semibold mt-0.5">
              Equipos físicos registrados
            </p>
          </div>
          <div className="pt-2 border-t border-white/20 text-[10px] font-extrabold text-blue-200 flex justify-between z-10">
            <span>Parque Activo STOL</span>
            <span className="text-white bg-white/20 px-2 py-0.5 rounded-full font-black">
              100% Dotación
            </span>
          </div>
        </div>

        {/* Card 2: Pockets Operativos (Vivid Emerald Green Gradient) */}
        <div className="bg-gradient-to-br from-[#059669] to-[#047857] text-white rounded-2xl p-4 shadow-md border-2 border-emerald-400 flex flex-col justify-between relative overflow-hidden animate-kpi-entrance kpi-delay-2 hover:-translate-y-1 hover:shadow-lg transition-all cursor-default">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none -mr-6 -mt-6" />
          <div className="flex items-center justify-between z-10">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-emerald-100 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
              Pockets Operativos
            </span>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-white/25 text-white backdrop-blur-xs border border-white/30">
              {pctOperativos.toFixed(1)}%
            </span>
          </div>
          <div className="my-2 z-10">
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
              {operativosCount}
            </div>
            <p className="text-[11px] text-emerald-100 font-semibold mt-0.5">
              Equipos aptos para operación
            </p>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-emerald-950/40 h-2 rounded-full overflow-hidden mb-2 z-10 border border-emerald-400/30">
            <div
              className="bg-emerald-300 h-full rounded-full transition-all duration-500 shadow-xs"
              style={{ width: `${pctOperativos}%` }}
            ></div>
          </div>
          <div className="pt-1.5 border-t border-white/20 text-[10px] font-extrabold text-emerald-100 flex justify-between z-10">
            <span>Disponibilidad en piso</span>
            <span className="text-white bg-emerald-700/80 px-2 py-0.5 rounded-full font-black">
              ✓ Óptimo ({operativosCount}/{totalCount})
            </span>
          </div>
        </div>

        {/* Card 3: Pockets Inoperativos (Vivid Coral / Rose Gradient) */}
        <div className="bg-gradient-to-br from-[#E11D48] to-[#BE123C] text-white rounded-2xl p-4 shadow-md border-2 border-rose-400 flex flex-col justify-between relative overflow-hidden animate-kpi-entrance kpi-delay-3 hover:-translate-y-1 hover:shadow-lg transition-all cursor-default">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none -mr-6 -mt-6" />
          <div className="flex items-center justify-between z-10">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-rose-100 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-200" />
              Pockets Inoperativos
            </span>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-white/25 text-white backdrop-blur-xs border border-white/30">
              {pctInoperativos.toFixed(1)}%
            </span>
          </div>
          <div className="my-2 z-10">
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
              {inoperativosCount}
            </div>
            <p className="text-[11px] text-rose-100 font-semibold mt-0.5">
              Con fallas técnicas o de baja
            </p>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-rose-950/40 h-2 rounded-full overflow-hidden mb-2 z-10 border border-rose-400/30">
            <div
              className="bg-rose-200 h-full rounded-full transition-all duration-500 shadow-xs"
              style={{ width: `${pctInoperativos}%` }}
            ></div>
          </div>
          <div className="pt-1.5 border-t border-white/20 text-[10px] font-extrabold text-rose-100 flex justify-between z-10">
            <span>Requieren gestión</span>
            <span className="text-white bg-rose-800/80 px-2 py-0.5 rounded-full font-black">
              ⚠️ Seguimiento ({inoperativosCount}/{totalCount})
            </span>
          </div>
        </div>

        {/* Card 4: Diagnóstico de Inoperativos (Vivid Indigo Gradient con detalles luminosos) */}
        <div className="bg-gradient-to-br from-[#312E81] via-[#1E1B4B] to-[#0F172A] text-white rounded-2xl p-4 shadow-md border-2 border-indigo-400/80 flex flex-col justify-between relative overflow-hidden animate-kpi-entrance kpi-delay-4 hover:-translate-y-1 hover:shadow-lg transition-all cursor-default">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/20 rounded-full blur-xl pointer-events-none -mr-6 -mt-6" />
          <div className="flex items-center justify-between z-10">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-indigo-200 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-indigo-300" />
              Diagnóstico Mantenimiento
            </span>
            <span className="bg-indigo-500/30 text-indigo-200 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-400/40">
              {inoperativosCount} inoperativos
            </span>
          </div>

          <div className="space-y-2 text-xs my-2 z-10">
            {/* Por reparar */}
            <div className="flex items-center justify-between bg-amber-500/20 border border-amber-300/40 px-3 py-1.5 rounded-xl shadow-2xs backdrop-blur-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="font-black text-amber-200 text-[11px]">POR REPARAR:</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-black text-white text-base">{porRepararCount}</span>
                <span className="text-[10px] text-amber-300 font-bold">({pctPorRepararDeInop.toFixed(0)}%)</span>
              </div>
            </div>

            {/* Dado de baja */}
            <div className="flex items-center justify-between bg-rose-500/20 border border-rose-300/40 px-3 py-1.5 rounded-xl shadow-2xs backdrop-blur-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                <span className="font-black text-rose-200 text-[11px]">DADO DE BAJA:</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-black text-white text-base">{dadosDeBajaCount}</span>
                <span className="text-[10px] text-rose-300 font-bold">({pctDadosDeBajaDeInop.toFixed(0)}%)</span>
              </div>
            </div>

            {sinDiagnosticoCount > 0 && (
              <div className="flex items-center justify-between text-[10px] text-slate-300 px-1 pt-0.5">
                <span>Sin diagnóstico específico:</span>
                <span className="font-black text-white">{sinDiagnosticoCount}</span>
              </div>
            )}
          </div>

          <div className="pt-1.5 border-t border-white/20 text-[10px] font-extrabold text-indigo-200 flex justify-between z-10">
            <span>Prioridad taller</span>
            <span className="text-amber-300 font-black">
              {porRepararCount} equipos recuperables
            </span>
          </div>
        </div>
      </div>

      {/* 3. Middle Section: Consolidated by Area and Supervisor (Colores Dinámicos) */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xs">
              <Users className="w-4 h-4 font-bold" />
            </div>
            <div>
              <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-wide">
                CONSOLIDADO POR ÁREA Y SUPERVISOR
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Pockets asignados bajo su mando, porcentaje del parque total y estado de operatividad
              </p>
            </div>
          </div>
          <span className="text-[11.5px] font-black text-slate-800 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 shadow-2xs">
            {supervisorMetrics.length} Supervisores Registrados
          </span>
        </div>

        {/* Consolidated Table with Vivid Accents */}
        <div className="overflow-x-auto border-2 border-slate-200 rounded-xl shadow-xs">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#1E1B4B] text-white font-black">
              <tr>
                <th className="p-3.5 whitespace-nowrap min-w-[260px]">Área Operativa</th>
                <th className="p-3.5 whitespace-nowrap min-w-[220px]">Supervisor / Responsable</th>
                <th className="p-3.5 text-center whitespace-nowrap min-w-[130px]">Pockets Asignados</th>
                <th className="p-3.5 text-center whitespace-nowrap min-w-[130px]">% del Parque Total</th>
                <th className="p-3.5 text-center whitespace-nowrap min-w-[150px]">Operativos (Cant. / %)</th>
                <th className="p-3.5 text-center whitespace-nowrap min-w-[150px]">Inoperativos (Cant. / %)</th>
                <th className="p-3.5 text-center whitespace-nowrap min-w-[100px]">Por Reparar</th>
                <th className="p-3.5 text-center whitespace-nowrap min-w-[100px]">Dado de Baja</th>
                <th className="p-3.5 min-w-[160px] whitespace-nowrap">Distribución Visual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {supervisorMetrics.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-400 italic">
                    No hay información de supervisores en el inventario.
                  </td>
                </tr>
              ) : (
                supervisorMetrics.map((row, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                    <td className="p-3.5 whitespace-nowrap min-w-[260px]">
                      <span className={getAreaBadgeClass(row.area)}>
                        {row.area}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap font-bold text-slate-900">{row.responsable}</td>
                    <td className="p-3 text-center font-black text-slate-950 text-sm">{row.total}</td>
                    <td className="p-3 text-center font-bold text-slate-800">
                      <span className="inline-block bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-300 font-mono text-[11px] font-black">
                        {row.pctDelTotal}%
                      </span>
                    </td>
                    <td className="p-3 text-center font-black text-emerald-700">
                      <span className="text-sm">{row.operativos}</span>
                      <span className="text-[10px] text-emerald-800 bg-emerald-100 font-bold px-1.5 py-0.5 rounded-full ml-1.5">
                        {row.pctOperativos}%
                      </span>
                    </td>
                    <td className="p-3 text-center font-black text-rose-700">
                      <span className="text-sm">{row.inoperativos}</span>
                      <span className="text-[10px] text-rose-800 bg-rose-100 font-bold px-1.5 py-0.5 rounded-full ml-1.5">
                        {row.pctInoperativos}%
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {row.porReparar > 0 ? (
                        <span className="inline-block bg-amber-100 text-amber-900 font-black px-2.5 py-0.5 rounded-full text-[11px] border border-amber-300 shadow-2xs">
                          {row.porReparar}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {row.dadosDeBaja > 0 ? (
                        <span className="inline-block bg-purple-100 text-purple-900 font-black px-2.5 py-0.5 rounded-full text-[11px] border border-purple-300 shadow-2xs">
                          {row.dadosDeBaja}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex h-3.5 rounded-full overflow-hidden bg-slate-200 border border-slate-300 shadow-inner">
                        <div
                          className="bg-emerald-500 h-full transition-all"
                          style={{ width: `${row.pctOperativos}%` }}
                          title={`Operativos: ${row.operativos} (${row.pctOperativos}%)`}
                        ></div>
                        <div
                          className="bg-rose-500 h-full transition-all"
                          style={{ width: `${row.pctInoperativos}%` }}
                          title={`Inoperativos: ${row.inoperativos} (${row.pctInoperativos}%)`}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Total Footer */}
            {supervisorMetrics.length > 0 && (
              <tfoot className="bg-slate-900 text-white font-black border-t-2 border-slate-800">
                <tr>
                  <td colSpan={2} className="p-3 text-right font-black uppercase text-slate-300 tracking-wider">
                    Total Consolidado Parque:
                  </td>
                  <td className="p-3 text-center font-black text-white text-base">{totalCount}</td>
                  <td className="p-3 text-center font-black text-white">100%</td>
                  <td className="p-3 text-center text-emerald-400 font-black">
                    {operativosCount} ({pctOperativos.toFixed(1)}%)
                  </td>
                  <td className="p-3 text-center text-rose-400 font-black">
                    {inoperativosCount} ({pctInoperativos.toFixed(1)}%)
                  </td>
                  <td className="p-3 text-center text-amber-400 font-black">{porRepararCount}</td>
                  <td className="p-3 text-center text-purple-300 font-black">{dadosDeBajaCount}</td>
                  <td className="p-3 text-[10.5px] text-slate-300 font-bold">
                    <span className="text-emerald-400">■ Op</span> / <span className="text-rose-400">■ Inop</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 4. Bottom Section: Detailed Master Table of Pockets (Colores Vivos) */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xs">
              <Smartphone className="w-4 h-4 font-bold" />
            </div>
            <div>
              <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-wide">
                LISTADO DETALLADO DE EQUIPOS POCKETS (INVENTARIO FÍSICO)
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Detalle por número, serie, área, estado operativo, responsable y diagnóstico técnico
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por serie, área, responsable..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 w-56 focus:outline-none focus:border-blue-600 font-medium"
              />
            </div>

            {/* Area Filter */}
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="TODAS">Todas las Áreas</option>
              {distinctAreas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>

            {/* Status Filter Buttons with Vivid Colors */}
            <div className="flex items-center rounded-xl border border-slate-300 overflow-hidden bg-slate-100 p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => setStatusFilter('TODOS')}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black cursor-pointer transition-colors ${
                  statusFilter === 'TODOS' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({inventory.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('OPERATIVO')}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black cursor-pointer transition-colors ${
                  statusFilter === 'OPERATIVO' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-800 hover:bg-emerald-100/60'
                }`}
              >
                Operativos ({operativosCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('INOPERATIVO')}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black cursor-pointer transition-colors ${
                  statusFilter === 'INOPERATIVO' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-800 hover:bg-rose-100/60'
                }`}
              >
                Inoperativos ({inoperativosCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('POR_REPARAR')}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black cursor-pointer transition-colors ${
                  statusFilter === 'POR_REPARAR' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-amber-800 hover:bg-amber-100/60'
                }`}
              >
                Por Reparar ({porRepararCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('DADO_DE_BAJA')}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black cursor-pointer transition-colors ${
                  statusFilter === 'DADO_DE_BAJA' ? 'bg-purple-700 text-white shadow-xs' : 'text-purple-800 hover:bg-purple-100/60'
                }`}
              >
                Bajas ({dadosDeBajaCount})
              </button>
            </div>
          </div>
        </div>

        {/* Master Table */}
        <div className="overflow-x-auto border-2 border-slate-200 rounded-xl max-h-[520px] shadow-xs">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white font-black sticky top-0 z-10 shadow-xs">
              <tr>
                <th className="p-3 w-12 text-center">N°</th>
                <th className="p-3">SERIE DE POCKET</th>
                <th className="p-3 min-w-[240px]">AREA</th>
                <th className="p-3 text-center">ESTADO</th>
                <th className="p-3">RESPONSABLE</th>
                <th className="p-3">OBSERVACIONES</th>
                <th className="p-3 text-center">MANTENIMIENTO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                    No se encontraron equipos pockets con los criterios de búsqueda seleccionados.
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const isInoperativo = item.estado === 'INOPERATIVO';
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isInoperativo
                          ? 'bg-rose-50/40 hover:bg-rose-50/80'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-2.5 text-center font-bold text-slate-500">{item.numero}</td>
                      <td className="p-2.5 font-mono font-black text-slate-900 tracking-wider text-xs">
                        {item.serie}
                      </td>
                      <td className="p-2.5">
                        <span className={getAreaBadgeClass(item.area)}>
                          {item.area}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`inline-block px-3 py-0.5 rounded-full text-[11px] font-black tracking-wide ${
                            item.estado === 'OPERATIVO'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {item.estado}
                        </span>
                      </td>
                      <td className="p-2.5 font-bold text-slate-900">{item.responsable}</td>
                      <td className="p-2.5 text-slate-700">
                        {item.observaciones && item.observaciones !== '-' ? (
                          <span className={isInoperativo ? 'text-rose-950 font-bold' : 'text-slate-700'}>
                            {item.observaciones}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        {item.mantenimiento === 'POR REPARAR' && (
                          <span className="inline-block bg-amber-100 text-amber-900 font-black px-3 py-1 rounded-full text-[11px] shadow-2xs border border-amber-300">
                            POR REPARAR
                          </span>
                        )}
                        {item.mantenimiento === 'DADO DE BAJA' && (
                          <span className="inline-block bg-purple-100 text-purple-900 font-black px-3 py-1 rounded-full text-[11px] shadow-2xs border border-purple-300">
                            DADO DE BAJA
                          </span>
                        )}
                        {!item.mantenimiento && <span className="text-slate-300">-</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-medium">
          <span>Mostrando <strong className="text-slate-800">{filteredInventory.length}</strong> de {inventory.length} equipos</span>
          <span className="italic text-slate-400">
            Para actualizar este listado use el botón «Cargar Excel Inventario» sin alterar los datos de auditoría de la Sección 1.
          </span>
        </div>
      </div>
    </div>
  );
};
