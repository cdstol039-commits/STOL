import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { MotivoNoUsoItem } from '../../types';

export interface DynamicMotivoItem extends MotivoNoUsoItem {
  areas?: string[];
  porcentaje?: number;
}

interface MotivosNoUsoTableProps {
  motivos: DynamicMotivoItem[];
  semanaLabel: string;
  totalSinUso?: number;
}

export const MotivosNoUsoTable: React.FC<MotivosNoUsoTableProps> = ({
  motivos,
  semanaLabel,
  totalSinUso = 0,
}) => {
  const totalGeneral = motivos.reduce((acc, m) => acc + m.cantidad, 0);

  return (
    <div id="section-motivos-no-uso" className="flex flex-col gap-2">
      {/* Title Badge with Active Count */}
      <div className="flex items-center justify-between">
        <div className="bg-[#1A1A2E] text-white px-4 py-1.5 rounded-md shadow-xs flex items-center gap-2 border border-[#236B7A]/40">
          <AlertTriangle className="w-3.5 h-3.5 text-[#E0A23A]" />
          <h3 className="text-xs sm:text-sm font-black tracking-wide uppercase font-sans">
            MOTIVOS DE NO USO
          </h3>
        </div>
        <div className="text-[11px] font-bold text-[#1A1A2E] bg-[#E0A23A]/15 px-2.5 py-1 rounded-md border border-[#E0A23A]/30">
          <span>{semanaLabel.toUpperCase()}</span>
          {totalGeneral > 0 && (
            <span className="ml-1.5 text-[#191827] font-extrabold">({totalGeneral} inactivos)</span>
          )}
        </div>
      </div>

      {/* Styled Data Table with Progress and Badges */}
      <div className="border border-[#CBD5E1] rounded-md overflow-hidden shadow-xs bg-white">
        <table className="w-full border-collapse text-xs font-sans">
          <thead>
            <tr className="bg-[#1E293B] text-white text-[11px]">
              <th className="py-2 px-3 text-left font-extrabold tracking-wide uppercase border-r border-[#334155]">
                Motivos de No Uso y Áreas Incurridas
              </th>
              <th className="py-2 px-3 text-center font-extrabold tracking-wide uppercase w-28 border-r border-[#334155]">
                Distribución
              </th>
              <th className="py-2 px-3 text-right font-extrabold tracking-wide uppercase w-20">
                Cantidad
              </th>
            </tr>
          </thead>
          <tbody>
            {motivos.length === 0 || totalGeneral === 0 ? (
              <tr>
                <td colSpan={3} className="py-6 text-center text-[#64748B] bg-[#F8FAFC]">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-6 h-6 text-[#10B981]" />
                    <span className="font-bold text-xs text-[#1E293B]">
                      Sin motivos de inactividad registrados
                    </span>
                    <span className="text-[11px] text-[#64748B]">
                      Todos los pockets asignados se encuentran en operación o registrados.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              motivos.map((item, index) => {
                const pct = totalGeneral > 0 ? (item.cantidad / totalGeneral) * 100 : 0;
                const isEven = index % 2 === 0;
                return (
                  <tr
                    key={`${item.motivo}-${index}`}
                    className={`border-b border-[#E2E8F0] transition-colors ${
                      isEven ? 'bg-[#F8FAFC]' : 'bg-white'
                    } hover:bg-[#F1F5F9]`}
                  >
                    {/* Motivo Name & Area Tags directly underneath */}
                    <td className="py-2.5 px-3 text-[#1E293B] font-semibold text-[11px] border-r border-[#E2E8F0]">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#DC2626] shrink-0"></span>
                        <span className="font-black text-[#1E293B] uppercase tracking-wide text-xs">
                          {item.motivo}
                        </span>
                      </div>

                      {/* Areas incurring in this motivo shown directly underneath */}
                      {item.areas && item.areas.length > 0 && (
                        <div className="mt-1.5 pl-4">
                          <span className="text-[10px] font-bold text-[#64748B] block mb-1">
                            Áreas que incurren en este motivo:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {item.areas.map((a) => (
                              <span
                                key={a}
                                className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] shadow-2xs inline-flex items-center gap-1"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]"></span>
                                {a}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Progress distribution bar */}
                    <td className="py-2 px-3 text-center border-r border-[#E2E8F0] align-middle">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${pct >= 40 ? 'bg-[#DC2626]' : 'bg-[#2563EB]'}`}
                            style={{ width: `${Math.min(100, Math.max(8, pct))}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-[#64748B] w-9 text-right">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </td>

                    {/* Quantity Badge */}
                    <td className="py-2 px-3 text-right align-middle">
                      <span className="inline-block px-2.5 py-1 rounded text-xs font-black bg-[#1E293B] text-white shadow-2xs">
                        {item.cantidad}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="bg-[#1E293B] text-white font-black text-xs">
              <td className="py-2 px-3 border-r border-[#334155] uppercase">
                Total general inactivos
              </td>
              <td className="py-2 px-3 text-center border-r border-[#334155] text-[11px] text-[#94A3B8]">
                100% de incidencias
              </td>
              <td className="py-2 px-3 text-right text-[13px] text-[#F87171]">
                {totalGeneral}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
