import React from 'react';
import { CalendarDays } from 'lucide-react';
import { PeriodGranularity, PeriodSelection } from '../../types/period';
import { defaultPeriodValue } from '../../utils/period';

interface GlobalPeriodFilterProps {
  value: PeriodSelection;
  onChange: (value: PeriodSelection) => void;
}

const options: { id: PeriodGranularity; label: string }[] = [
  { id: 'all', label: 'Todo' },
  { id: 'day', label: 'Día' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'quarter', label: 'Trimestre' },
];

const inputType: Record<Exclude<PeriodGranularity, 'all'>, string> = {
  day: 'date',
  week: 'week',
  month: 'month',
  quarter: 'text',
};

export const GlobalPeriodFilter: React.FC<GlobalPeriodFilterProps> = ({ value, onChange }) => {
  const selectGranularity = (granularity: PeriodGranularity) => {
    onChange({
      granularity,
      value: granularity === 'all' ? '' : defaultPeriodValue(granularity),
    });
  };

  return (
    <section aria-label="Periodo de análisis" className="mb-4 flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
        <CalendarDays className="h-4 w-4 text-[#1F6F8B]" />
        <span>Periodo</span>
      </div>
      <div role="group" aria-label="Granularidad del periodo" className="inline-flex overflow-hidden rounded-md border border-slate-300 bg-white">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={value.granularity === option.id}
            onClick={() => selectGranularity(option.id)}
            className={`px-3 py-1.5 text-xs font-bold transition-colors ${
              value.granularity === option.id
                ? 'bg-[#1A1A2E] text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {value.granularity !== 'all' && value.granularity !== 'quarter' && (
        <input
          aria-label={`Seleccionar ${value.granularity}`}
          type={inputType[value.granularity]}
          value={value.value}
          onChange={(event) => onChange({ ...value, value: event.target.value })}
          className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800"
        />
      )}
      {value.granularity === 'quarter' && (
        <div className="flex items-center gap-1.5">
          <select
            aria-label="Seleccionar trimestre"
            value={value.value.split('-')[1] || 'Q1'}
            onChange={(event) => onChange({ ...value, value: `${value.value.split('-')[0] || new Date().getFullYear()}-${event.target.value}` })}
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800"
          >
            <option value="Q1">T1 · Ene-Mar</option>
            <option value="Q2">T2 · Abr-Jun</option>
            <option value="Q3">T3 · Jul-Set</option>
            <option value="Q4">T4 · Oct-Dic</option>
          </select>
          <input
            aria-label="Seleccionar año del trimestre"
            type="number"
            min="2020"
            max="2100"
            value={value.value.split('-')[0] || new Date().getFullYear()}
            onChange={(event) => onChange({ ...value, value: `${event.target.value}-${value.value.split('-')[1] || 'Q1'}` })}
            className="h-8 w-20 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800"
          />
        </div>
      )}
    </section>
  );
};