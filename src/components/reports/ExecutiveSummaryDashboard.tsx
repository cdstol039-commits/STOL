import React from 'react';
import { ArrowRight, Gauge, PackageCheck, Smartphone } from 'lucide-react';
import { ForkliftIcon } from '../icons/ForkliftIcon';
import { PocketAuditRecord } from '../../types';
import { FleetDashboardData } from '../../types/fleet';
import { PalletObservation } from '../../types/pallets';
import { TabId } from '../Sidebar';
import { PeriodSelection } from '../../types/period';
import { matchesPeriod } from '../../utils/period';

interface ExecutiveSummaryDashboardProps {
  pocketRecords: PocketAuditRecord[];
  palletRecords: PalletObservation[];
  fleetData: FleetDashboardData;
  analysisPeriod: PeriodSelection;
  onNavigate: (tab: TabId) => void;
}

const formatNumber = (value: number) =>
  new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 }).format(value);

export const ExecutiveSummaryDashboard: React.FC<ExecutiveSummaryDashboardProps> = ({
  pocketRecords,
  palletRecords,
  fleetData,
  analysisPeriod,
  onNavigate,
}) => {
  const totalAssigned = pocketRecords.reduce((sum, record) => sum + (Number(record.totalAsignados) || 0), 0);
  const totalInUse = pocketRecords.reduce((sum, record) => sum + (Number(record.pocketsEnUso) || 0), 0);
  const pocketUsage = totalAssigned > 0 ? (totalInUse / totalAssigned) * 100 : null;

  const pendingPallets = palletRecords.filter((record) => record.estado === 'PENDIENTE').length;
  const regularizedPallets = palletRecords.filter(
    (record) => record.estado === 'REGULARIZADA' || record.estado === 'REGULARIZADO'
  ).length;
  const palletTotal = pendingPallets + regularizedPallets;
  const palletRegularization = palletTotal > 0 ? (regularizedPallets / palletTotal) * 100 : null;

  const latestFleetMonth = fleetData.meses[fleetData.meses.length - 1];
  const dailyFleetRecords = (fleetData.registrosDiarios || []).filter((record) => matchesPeriod(record.fecha, analysisPeriod));
  const downtimeHours = analysisPeriod.granularity !== 'all'
    ? dailyFleetRecords.length > 0
      ? dailyFleetRecords.reduce((sum, record) => sum + record.horas_inoperativas, 0)
      : null
    : latestFleetMonth
    ? fleetData.equipos.reduce(
        (sum, equipment) => sum + (Number(equipment.meses[latestFleetMonth]?.horas_inoperativas) || 0),
        0
      )
    : null;

  return (
    <div className="space-y-5 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-bold uppercase text-[#1F6F8B]">STOL · Panel de gestión</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A2E]">Resumen Ejecutivo</h1>
          <p className="mt-1 text-sm text-slate-600">Vista consolidada de los indicadores operativos disponibles.</p>
        </div>
      </header>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-700 bg-[#1A1A2E] p-5 text-white">
        <div>
          <p className="text-xs font-bold uppercase text-amber-300">Seguimiento de equipo</p>
          <h2 className="mt-1 text-lg font-black">Desempeño de Supervisores</h2>
          <p className="mt-1 text-sm text-slate-300">Consulta resultados mensuales, trimestrales y detalle por supervisor.</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('supervisores')}
          className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400"
        >
          Abrir desempeño <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      <section aria-label="Indicadores operativos" className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <article className="flex min-h-52 flex-col border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-[#1F6F8B]">
            <Smartphone className="h-4 w-4" />
            <h2 className="text-xs font-bold uppercase">Control de Pockets</h2>
          </div>
          <p className="mt-4 text-3xl font-black tabular-nums text-slate-900">
            {pocketUsage === null ? '—' : `${formatNumber(pocketUsage)}%`}
          </p>
          <p className="mt-1 text-sm text-slate-600">Uso respecto a pockets asignados</p>
          <p className="mt-3 text-xs text-slate-500">
            {formatNumber(totalInUse)} en uso · {formatNumber(totalAssigned)} asignados · {pocketRecords.length} auditorías
          </p>
          <button
            type="button"
            onClick={() => onNavigate('pockets')}
            className="mt-auto flex items-center gap-1 pt-4 text-left text-xs font-bold text-[#1F6F8B] hover:underline"
          >
            Ver detalle <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </article>

        <article className="flex min-h-52 flex-col border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <PackageCheck className="h-4 w-4" />
            <h2 className="text-xs font-bold uppercase">Pallets Observados</h2>
          </div>
          <p className="mt-4 text-3xl font-black tabular-nums text-slate-900">{formatNumber(pendingPallets)}</p>
          <p className="mt-1 text-sm text-slate-600">Pendientes de regularización</p>
          <p className="mt-3 text-xs text-slate-500">
            {palletRegularization === null ? 'Sin registros' : `${formatNumber(palletRegularization)}% regularizados`}
            {' · '}{formatNumber(palletTotal)} observaciones
          </p>
          <button
            type="button"
            onClick={() => onNavigate('pallets')}
            className="mt-auto flex items-center gap-1 pt-4 text-left text-xs font-bold text-emerald-700 hover:underline"
          >
            Ver seguimiento <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </article>

        <article className="flex min-h-52 flex-col border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <ForkliftIcon className="h-4 w-4" />
            <h2 className="text-xs font-bold uppercase">Flota de Montacargas</h2>
          </div>
          <p className="mt-4 text-3xl font-black tabular-nums text-slate-900">
            {downtimeHours === null ? '—' : `${formatNumber(downtimeHours)} h`}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {analysisPeriod.granularity !== 'all' ? 'Horas inoperativas · periodo seleccionado' : latestFleetMonth ? `Horas inoperativas · ${latestFleetMonth}` : 'Sin datos mensuales de flota'}
          </p>
          <p className="mt-3 text-xs text-slate-500">{formatNumber(fleetData.equipos.length)} equipos registrados</p>
          <button
            type="button"
            onClick={() => onNavigate('montacargas')}
            className="mt-auto flex items-center gap-1 pt-4 text-left text-xs font-bold text-amber-700 hover:underline"
          >
            Ver horómetros <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </article>
      </section>

      <button
        type="button"
        onClick={() => onNavigate('reportes')}
        className="flex w-full items-center justify-between border-t border-slate-200 py-4 text-left text-sm font-bold text-slate-700 hover:text-[#1F6F8B]"
      >
        <span className="flex items-center gap-2"><Gauge className="h-4 w-4" /> Reportes y exportaciones</span>
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
};