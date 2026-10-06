import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Layers,
  MapPin,
  ChevronRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { PalletObservation, classifySubMotivo, SubMotivoInfo } from '../../types/pallets';

interface ChartPalletsPendientesMotivosProps {
  records: PalletObservation[];
}

interface SubMotivoAggItem {
  rawSubMotivo: string;
  info: SubMotivoInfo;
  totalCuenta: number;
  pctTotal: number;
  porArea: Record<string, number>;
  pallets: PalletObservation[];
}

export const ChartPalletsPendientesMotivos: React.FC<ChartPalletsPendientesMotivosProps> = ({ records }) => {
  const [selectedSubMotivo, setSelectedSubMotivo] = useState<string | null>(null);

  // Filtrar estrictamente a los PALLETS PENDIENTES
  const pendingRecords = useMemo(() => {
    return records.filter((r) => r.estado === 'PENDIENTE');
  }, [records]);

  const totalPendientes = pendingRecords.length;

  // Extraer todas las áreas involucradas en pendientes
  const { subMotivosList, allAreas, accionablesCount, despachadosCount, noZonaCount } = useMemo(() => {
    const areaSet = new Set<string>();
    const map = new Map<string, {
      rawSubMotivo: string;
      info: SubMotivoInfo;
      count: number;
      byArea: Record<string, number>;
      items: PalletObservation[];
    }>();

    let accCount = 0;
    let despCount = 0;
    let noZCount = 0;

    pendingRecords.forEach((r) => {
      const area = (r.area || r.responsablePendiente || 'DESPACHO').toUpperCase().trim();
      areaSet.add(area);

      const rawSub = r.subMotivo !== undefined && r.subMotivo !== null ? String(r.subMotivo).trim() : '-';
      const cleanSub = rawSub === '' ? '-' : rawSub;
      const info = classifySubMotivo(cleanSub);

      if (info.type === 'ACCIONABLE') accCount += 1;
      else if (info.type === 'DESPACHADO') despCount += 1;
      else if (info.type === 'NO_EN_ZONA') noZCount += 1;

      // Llave de agrupación por categoría semántica para evitar duplicados por minúsculas
      const groupKey = info.label;

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          rawSubMotivo: cleanSub,
          info,
          count: 0,
          byArea: {},
          items: [],
        });
      }

      const item = map.get(groupKey)!;
      item.count += 1;
      item.byArea[area] = (item.byArea[area] || 0) + 1;
      item.items.push(r);
    });

    const areasList = Array.from(areaSet).sort();

    const list: SubMotivoAggItem[] = Array.from(map.values()).map((val) => ({
      rawSubMotivo: val.rawSubMotivo,
      info: val.info,
      totalCuenta: val.count,
      pctTotal: totalPendientes > 0 ? (val.count / totalPendientes) * 100 : 0,
      porArea: val.byArea,
      pallets: val.items,
    }));

    // Ordenar: primero los accionables ('-'), luego por cantidad descendente
    list.sort((a, b) => {
      if (a.info.type === 'ACCIONABLE' && b.info.type !== 'ACCIONABLE') return -1;
      if (b.info.type === 'ACCIONABLE' && a.info.type !== 'ACCIONABLE') return 1;
      return b.totalCuenta - a.totalCuenta;
    });

    return {
      subMotivosList: list,
      allAreas: areasList,
      accionablesCount: accCount,
      despachadosCount: despCount,
      noZonaCount: noZCount,
    };
  }, [pendingRecords, totalPendientes]);

  return (
    <div className="bg-white border-2 border-[#CBD5E1] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between pb-2.5 mb-3 border-b-2 border-[#E2E8F0] gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-600 to-red-700 flex items-center justify-center text-white shadow-xs font-black text-xs">
              4
            </div>
            <div>
              <h3 className="text-xs font-black text-[#0F172A] uppercase tracking-wide">
                PALLETS PENDIENTES POR SUB-MOTIVOS Y ÁREAS
              </h3>
              <p className="text-[11px] text-[#64748B] font-semibold">
                Diferenciación de sub-motivos: los que están con '-' (aún pueden levantarse) vs despachados y drop
              </p>
            </div>
          </div>

          <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 text-rose-800 border border-rose-300 font-black text-xs shadow-2xs">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>Total Pendientes: {totalPendientes}</span>
          </span>
        </div>

        {/* 1. Micro-Badges de Estatus de Acción Operativa */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
          {/* Tarjeta: Aún pueden ser levantados ('-') */}
          <div className="p-2 rounded-xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Aún Pueden Levantarse ('-')
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-black text-emerald-700">{accionablesCount}</span>
              <span className="text-[10px] font-bold text-emerald-600">
                ({totalPendientes > 0 ? ((accionablesCount / totalPendientes) * 100).toFixed(0) : 0}%) Accionables hoy
              </span>
            </div>
            <p className="text-[9.5px] text-emerald-800 mt-0.5 font-medium">
              Sub-motivo '-' en evaluación. ¡Todavía hay oportunidad física de levantarlos!
            </p>
          </div>

          {/* Tarjeta: Fueron Despachados sin Levantar */}
          <div className="p-2 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-rose-800 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                Despachados sin Levantar
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-black text-rose-700">{despachadosCount}</span>
              <span className="text-[10px] font-bold text-rose-600">
                ({totalPendientes > 0 ? ((despachadosCount / totalPendientes) * 100).toFixed(0) : 0}%) Irrecuperables
              </span>
            </div>
            <p className="text-[9.5px] text-rose-800 mt-0.5 font-medium">
              Fueron despachados sin regularizar. Ya no se puede hacer nada.
            </p>
          </div>

          {/* Tarjeta: Drop pero no en Zona Física */}
          <div className="p-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-amber-800 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Drop No en Zona Física
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-black text-amber-800">{noZonaCount}</span>
              <span className="text-[10px] font-bold text-amber-700">
                ({totalPendientes > 0 ? ((noZonaCount / totalPendientes) * 100).toFixed(0) : 0}%) Inlocalizables
              </span>
            </div>
            <p className="text-[9.5px] text-amber-800 mt-0.5 font-medium">
              Ubicados lógicamente en drop pero no físicos. No pueden ser levantados.
            </p>
          </div>
        </div>

        {/* 2. Visualización Gráfica y Detalle por Sub-Motivo con Áreas */}
        <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#CBD5E1] space-y-2 mb-3">
          <div className="flex justify-between items-center text-[10.5px] font-black text-slate-700 pb-1 border-b border-slate-200">
            <span>Desglose por Sub-Motivo y Áreas Correspondientes</span>
            <span>Cantidad (# y %)</span>
          </div>

          {subMotivosList.length === 0 ? (
            <div className="py-8 text-center space-y-1">
              <p className="text-xs font-black text-slate-700">
                No hay pallets pendientes con los filtros actuales
              </p>
              <p className="text-[11px] text-slate-500">
                Si tiene el filtro de Estatus en "Regularizadas", cámbielo a "Todos" o "Pendientes" para ver los sub-motivos de retención.
              </p>
            </div>
          ) : (
            subMotivosList.map((item) => {
              const isSelected = selectedSubMotivo === item.info.label;

              return (
                <div
                  key={item.info.label}
                  onClick={() => setSelectedSubMotivo(isSelected ? null : item.info.label)}
                  className={`bg-white p-2.5 rounded-xl border transition-all cursor-pointer shadow-2xs space-y-2 ${
                    item.info.type === 'ACCIONABLE'
                      ? 'border-emerald-300 ring-1 ring-emerald-300/50 hover:border-emerald-500'
                      : item.info.type === 'DESPACHADO'
                      ? 'border-rose-200 hover:border-rose-400'
                      : 'border-amber-200 hover:border-amber-400'
                  } ${isSelected ? 'ring-2 ring-blue-500 shadow-md' : ''}`}
                >
                  {/* Encabezado del Sub-motivo */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {item.info.type === 'ACCIONABLE' ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-black text-[10px] tracking-wide flex items-center gap-1 shadow-2xs">
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            AÚN PUEDE LEVANTARSE ('-')
                          </span>
                        ) : item.info.type === 'DESPACHADO' ? (
                          <span className="px-2 py-0.5 rounded-md bg-rose-700 text-white font-black text-[10px] tracking-wide shadow-2xs">
                            DESPACHADOS SIN LEVANTAR
                          </span>
                        ) : item.info.type === 'NO_EN_ZONA' ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-600 text-white font-black text-[10px] tracking-wide shadow-2xs">
                            DROP NO EN ZONA FÍSICA
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-700 text-white font-black text-[10px] tracking-wide">
                            OTRO SUB-MOTIVO
                          </span>
                        )}
                        <span className="text-[11.5px] font-black text-[#0F172A]">
                          "{item.info.label}"
                        </span>
                      </div>
                      <p className="text-[10px] text-[#64748B] mt-0.5 font-medium">
                        {item.info.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-black text-[#0F172A]">
                        {item.totalCuenta} pallets
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-black border ${item.info.badgeClass}`}>
                        {item.pctTotal.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progreso */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-md overflow-hidden border border-slate-200">
                    <div
                      style={{ width: `${Math.max(8, item.pctTotal)}%` }}
                      className={`h-full rounded-xs transition-all duration-300 ${
                        item.info.type === 'ACCIONABLE'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                          : item.info.type === 'DESPACHADO'
                          ? 'bg-gradient-to-r from-rose-500 to-red-600'
                          : 'bg-gradient-to-r from-amber-500 to-orange-500'
                      }`}
                    />
                  </div>

                  {/* Desglose de ÁREAS CORRESPONDIENTES y CANTIDADES */}
                  <div className="pt-1 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[10.5px]">
                    <span className="font-bold text-[#64748B]">Áreas afectadas:</span>
                    {Object.entries(item.porArea).map(([area, cnt]) => (
                      <span
                        key={area}
                        className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300 font-bold text-slate-800 flex items-center gap-1"
                      >
                        <MapPin className="w-2.5 h-2.5 text-blue-600" />
                        <strong>{area}:</strong> {cnt} pallets
                      </span>
                    ))}
                  </div>

                  {/* Despliegue de Pallets Accionables al hacer clic */}
                  {isSelected && (
                    <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-[10px]">
                      <div className="font-black text-slate-700 uppercase tracking-wide flex justify-between">
                        <span>Listado de Pallets ({item.pallets.length} unidades):</span>
                        <span className="text-blue-600 font-semibold">Clic de nuevo para contraer</span>
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                        {item.pallets.map((p) => (
                          <div
                            key={p.id}
                            className="bg-white p-1.5 rounded-md border border-slate-200 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-black text-blue-900">{p.palletId}</span>
                              <span className="text-slate-500 font-medium">({p.fecha})</span>
                              <span className="text-slate-700 font-bold">{p.area}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-600 italic truncate max-w-[150px]">
                                {p.observacion}
                              </span>
                              <span className="font-bold text-rose-700">{p.responsablePendiente || p.area}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 3. Matriz Cruzada de Sub-Motivo vs Área (Tabla Exacta) */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] font-black uppercase">
                <th className="py-2 px-3 border-r border-slate-700">Sub-Motivo Operativo</th>
                <th className="py-2 px-2 text-center border-r border-slate-700">Condición Operativa</th>
                {allAreas.map((area) => (
                  <th key={area} className="py-2 px-2 text-center border-r border-slate-700">
                    {area}
                  </th>
                ))}
                <th className="py-2 px-3 text-center bg-rose-900 text-rose-200">Total Pend.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[11px] font-semibold">
              {subMotivosList.map((row) => (
                <tr key={row.info.label} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3 font-black text-slate-900">
                    "{row.info.label}"
                  </td>
                  <td className="py-2 px-2 text-center">
                    {row.info.type === 'ACCIONABLE' ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Aún se puede levantar
                      </span>
                    ) : row.info.type === 'DESPACHADO' ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                        Despachado (Cerrado)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                        No físico en drop
                      </span>
                    )}
                  </td>
                  {allAreas.map((area) => {
                    const cnt = row.porArea[area] || 0;
                    return (
                      <td
                        key={area}
                        className={`py-2 px-2 text-center font-bold ${
                          cnt > 0 ? 'text-slate-900 bg-rose-50/40' : 'text-slate-300'
                        }`}
                      >
                        {cnt > 0 ? cnt : '–'}
                      </td>
                    );
                  })}
                  <td className="py-2 px-3 text-center font-black text-rose-900 bg-rose-50">
                    {row.totalCuenta}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-2.5 pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[10px] text-[#64748B]">
        <span>Haga clic en cualquier sub-motivo para desplegar los pallets correspondientes</span>
        <span className="font-bold text-emerald-700">
          {accionablesCount} pallets accionables con oportunidad de levantamiento
        </span>
      </div>
    </div>
  );
};
