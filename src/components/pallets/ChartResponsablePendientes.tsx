import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  ShieldAlert,
  MapPin,
  CheckCircle2,
  BarChart3,
  Table,
  HelpCircle,
} from 'lucide-react';
import { PalletObservation } from '../../types/pallets';

interface ChartResponsablePendientesProps {
  records: PalletObservation[];
}

interface ResponsablePendienteGroup {
  responsableArea: string; // Área que NO está levantando la observación (Despacho, Picking, Cross)
  supervisor: string; // Supervisor A CARGO DE LEVANTAR la observación
  subMotivoPrincipal: string;
  totalPendientes: number;
  pctTotal: number;
  leadTime1Count: number;
  leadTime2PlusCount: number;
  palletsIds: string[];
}

export const ChartResponsablePendientes: React.FC<ChartResponsablePendientesProps> = ({ records }) => {
  const [activeView, setActiveView] = useState<'grafico' | 'cuadro'>('grafico');

  // Focus exclusively on PENDIENTE pallets
  const pendingRecords = useMemo(() => {
    return records.filter((r) => r.estado === 'PENDIENTE');
  }, [records]);

  const totalPendientes = pendingRecords.length;

  // Group by RESPONSABLE PENDIENTE (Área que NO está levantando la observación)
  const groupedData: ResponsablePendienteGroup[] = useMemo(() => {
    const map = new Map<string, {
      supervisor: string;
      subMotivos: Map<string, number>;
      total: number;
      lt1: number;
      lt2plus: number;
      palletsIds: string[];
    }>();

    pendingRecords.forEach((r) => {
      const areaResp = r.responsablePendiente || r.area || 'Sin Asignar';
      const supervisor = r.responsable || 'Supervisor a Cargo';
      const subMotivo = r.subMotivo || r.observacion || 'Sin motivo';
      const lt = r.leadTimeDias !== undefined ? r.leadTimeDias : 1;

      if (!map.has(areaResp)) {
        map.set(areaResp, {
          supervisor,
          subMotivos: new Map(),
          total: 0,
          lt1: 0,
          lt2plus: 0,
          palletsIds: [],
        });
      }

      const item = map.get(areaResp)!;
      item.total += 1;
      item.palletsIds.push(r.palletId);
      if (lt >= 2) item.lt2plus += 1;
      else item.lt1 += 1;

      item.subMotivos.set(subMotivo, (item.subMotivos.get(subMotivo) || 0) + 1);
    });

    return Array.from(map.entries()).map(([areaResp, data]) => {
      let topSub = 'Sin motivo';
      let topCount = -1;
      data.subMotivos.forEach((cnt, sub) => {
        if (cnt > topCount) {
          topCount = cnt;
          topSub = sub;
        }
      });

      return {
        responsableArea: areaResp,
        supervisor: data.supervisor,
        subMotivoPrincipal: topSub,
        totalPendientes: data.total,
        pctTotal: totalPendientes > 0 ? (data.total / totalPendientes) * 100 : 0,
        leadTime1Count: data.lt1,
        leadTime2PlusCount: data.lt2plus,
        palletsIds: data.palletsIds,
      };
    }).sort((a, b) => b.totalPendientes - a.totalPendientes);
  }, [pendingRecords, totalPendientes]);

  const colorPalette: Record<string, { bar: string; badge: string }> = {
    Despacho: {
      bar: 'from-purple-500 to-indigo-600',
      badge: 'bg-purple-100 text-purple-800',
    },
    Picking: {
      bar: 'from-amber-500 to-orange-600',
      badge: 'bg-amber-100 text-amber-800',
    },
    Cross: {
      bar: 'from-blue-500 to-sky-600',
      badge: 'bg-blue-100 text-blue-800',
    },
    'CROSS DOCKING': {
      bar: 'from-blue-500 to-sky-600',
      badge: 'bg-blue-100 text-blue-800',
    },
  };

  return (
    <div className="bg-white border-2 border-[#CBD5E1] rounded-2xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-2.5 mb-3 border-b-2 border-[#E2E8F0] gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-600 to-red-700 flex items-center justify-center text-white shadow-xs font-black text-xs">
            5
          </div>
          <div>
            <h3 className="text-xs font-black text-[#0F172A] uppercase tracking-wide">
              ÁREAS OMISAS QUE NO LEVANTAN LA OBSERVACIÓN (RESPONSABLES PENDIENTES)
            </h3>
            <p className="text-[11px] text-[#64748B] font-semibold">
              Identificación del área que retiene el pallet vs Supervisor a cargo de subsanar
            </p>
          </div>
        </div>

        {/* Interactive View Toggle */}
        <div className="flex items-center gap-1 bg-[#F1F5F9] p-0.5 rounded-lg border border-[#CBD5E1]">
          <button
            onClick={() => setActiveView('grafico')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black transition-all cursor-pointer ${
              activeView === 'grafico'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            <BarChart3 className="w-3 h-3 text-blue-400" />
            <span>Gráfico de Barras</span>
          </button>
          <button
            onClick={() => setActiveView('cuadro')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black transition-all cursor-pointer ${
              activeView === 'cuadro'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            <Table className="w-3 h-3 text-emerald-400" />
            <span>Cuadro Detallado</span>
          </button>
        </div>
      </div>

      {/* Explanatory concept helper badge */}
      <div className="mb-3 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between text-[10.5px]">
        <span className="font-bold text-blue-900 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span><strong>Regla Operativa:</strong> Responsable Pendiente = <em>Área que NO levanta la observación</em> | Supervisor = <em>A cargo de la gestión</em></span>
        </span>
        <span className="font-black text-rose-700 bg-white px-2 py-0.5 rounded-full border border-rose-200">
          {totalPendientes} Pallets Retenidos
        </span>
      </div>

      {totalPendientes === 0 ? (
        <div className="p-6 text-center bg-emerald-50 border-2 border-emerald-300 rounded-xl my-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1.5" />
          <h4 className="text-xs font-black text-emerald-900 uppercase">
            ¡Excelente! No hay pallets pendientes
          </h4>
          <p className="text-[11px] text-emerald-700 font-semibold">
            Todas las áreas han levantado sus observaciones conforme a los filtros seleccionados.
          </p>
        </div>
      ) : activeView === 'grafico' ? (
        /* Gráfico de Barras Compacto ("Chatito") */
        <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#CBD5E1] space-y-2">
          {groupedData.map((group) => {
            const theme = colorPalette[group.responsableArea] || {
              bar: 'from-slate-500 to-slate-700',
              badge: 'bg-slate-100 text-slate-800',
            };

            return (
              <div key={group.responsableArea} className="bg-white p-2.5 rounded-lg border border-[#E2E8F0] shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-[11px] font-black">
                  <span className="flex items-center gap-1.5 text-rose-800 uppercase font-black">
                    <UserCheck className="w-3.5 h-3.5 text-rose-600" />
                    Área Omisa: {group.responsableArea}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-rose-700 font-black">{group.totalPendientes} pallets</span>
                    <span className={`px-1.5 py-0.2 rounded-sm text-[10px] font-black ${theme.badge}`}>
                      {group.pctTotal.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Horizontal Bar */}
                <div className="w-full bg-slate-200 h-3.5 rounded-md overflow-hidden shadow-inner">
                  <div
                    style={{ width: `${group.pctTotal}%` }}
                    className={`h-full bg-gradient-to-r ${theme.bar} rounded-md transition-all duration-300 flex items-center justify-end pr-1 text-[8.5px] text-white font-black`}
                  >
                    {group.pctTotal >= 15 && `${group.pctTotal.toFixed(0)}%`}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#475569]">
                  <span className="truncate max-w-[280px]">
                    <strong className="text-[#0F172A]">Causa retenida: </strong> {group.subMotivoPrincipal}
                  </span>
                  <div className="flex items-center gap-2 font-bold shrink-0">
                    <span className="text-slate-600">Supervisor a cargo: <strong>{group.supervisor}</strong></span>
                    <span className="text-amber-800 font-extrabold">1d: {group.leadTime1Count}</span>
                    {group.leadTime2PlusCount > 0 && (
                      <span className="text-rose-700 font-black bg-rose-50 px-1 rounded-sm border border-rose-200">
                        ⚠ 2d+: {group.leadTime2PlusCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Cuadro Detallado de Asignación */
        <div className="overflow-x-auto border border-[#CBD5E1] rounded-lg shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] text-white text-[10.5px] font-black uppercase tracking-wider">
                <th className="py-2 px-2.5 border-r border-[#334155] bg-rose-950/60 text-rose-200">
                  Área Omisa (No Levanta)
                </th>
                <th className="py-2 px-2.5 border-r border-[#334155]">Supervisor (A cargo de subsanar)</th>
                <th className="py-2 px-2.5 border-r border-[#334155]">Sub-Motivo Observado</th>
                <th className="py-2 px-2 text-center border-r border-[#334155] bg-rose-900/60 text-rose-200 w-20">
                  Pallets
                </th>
                <th className="py-2 px-2 text-center border-r border-[#334155] w-20">
                  % Cuota
                </th>
                <th className="py-2 px-2 text-center bg-amber-900/60 text-amber-200 w-28">
                  Antigüedad
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CBD5E1] font-semibold text-[#0F172A] text-[11px]">
              {groupedData.map((row) => (
                <tr key={row.responsableArea} className="bg-white hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-2.5 font-black text-xs text-rose-800 border-r border-[#CBD5E1] uppercase">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-600" />
                      {row.responsableArea}
                    </span>
                  </td>
                  <td className="py-2 px-2.5 font-bold text-[#0F172A] border-r border-[#CBD5E1] truncate max-w-[150px]">
                    {row.supervisor}
                  </td>
                  <td className="py-2 px-2.5 text-xs text-[#0F172A] border-r border-[#CBD5E1] truncate max-w-[240px]">
                    {row.subMotivoPrincipal}
                  </td>
                  <td className="py-2 px-2 text-center font-black text-rose-700 bg-rose-50/50 border-r border-[#CBD5E1]">
                    {row.totalPendientes}
                  </td>
                  <td className="py-2 px-2 text-center font-black text-[#0F172A] border-r border-[#CBD5E1]">
                    {row.pctTotal.toFixed(1)}%
                  </td>
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-[9.5px]">
                      {row.leadTime2PlusCount > 0 && (
                        <span className="px-1 py-0.2 rounded-xs font-black bg-purple-100 text-purple-800">
                          {row.leadTime2PlusCount} de 2d
                        </span>
                      )}
                      {row.leadTime1Count > 0 && (
                        <span className="px-1 py-0.2 rounded-xs font-black bg-amber-100 text-amber-800">
                          {row.leadTime1Count} de 1d
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] text-white font-black text-xs border-t-2 border-[#0F172A]">
                <td colSpan={3} className="py-2 px-2.5 uppercase tracking-wider text-[11px]">
                  Total Pallets Pendientes
                </td>
                <td className="py-2 px-2 text-center text-rose-300 font-black text-xs">
                  {totalPendientes}
                </td>
                <td className="py-2 px-2 text-center text-amber-300 font-black text-xs">
                  100.0%
                </td>
                <td className="py-2 px-2 text-center text-slate-300 text-[10px]">
                  Acción Inmediata
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
