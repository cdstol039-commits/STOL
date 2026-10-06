import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar,
  Layers,
  MapPin,
  Filter,
  Search,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  X,
  Check,
} from 'lucide-react';
import { PalletObservation, normalizeSemana, normalizeMes, formatToDDMMYYYY } from '../../types/pallets';

export interface PalletFilterState {
  mes: string; // 'TODOS' or single value
  meses?: string[]; // multi-select checkbox list
  semana: string; // 'TODAS' or single value
  semanas?: string[]; // multi-select checkbox list
  fecha: string; // 'TODAS' or single value
  fechas?: string[]; // multi-select checkbox list
  area: string; // 'TODAS' or single value
  areas?: string[]; // multi-select checkbox list
  estado: 'TODOS' | 'PENDIENTE' | 'REGULARIZADA';
  searchQuery: string;
}

interface PalletFilterBarProps {
  filters: PalletFilterState;
  onFilterChange: (filters: PalletFilterState) => void;
  allRecords: PalletObservation[];
  filteredCount: number;
  pendingCount: number;
  regularizedCount: number;
}

export interface PalletCheckboxDropdownProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  allLabel: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  accentColor?: string;
}

export const PalletCheckboxDropdown: React.FC<PalletCheckboxDropdownProps> = ({
  id,
  label,
  icon,
  allLabel,
  options,
  selected,
  onChange,
  accentColor = '#2563EB',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter out '-' or empty strictly
  const validOptions = useMemo(() => {
    return options.filter((opt) => {
      if (!opt) return false;
      const str = String(opt).trim();
      return str !== '' && str !== '-' && str !== '--' && str !== 'SIN ASIGNAR';
    });
  }, [options]);

  const filteredOptions = useMemo(() => {
    if (!searchFilter.trim()) return validOptions;
    return validOptions.filter((opt) =>
      opt.toLowerCase().includes(searchFilter.toLowerCase().trim())
    );
  }, [validOptions, searchFilter]);

  const isAllSelected = selected.length === 0 || selected.includes('TODOS') || selected.includes('TODAS');

  const handleToggleAll = () => {
    onChange([]); // Empty array means all selected
  };

  const handleToggleOption = (opt: string) => {
    if (isAllSelected) {
      onChange([opt]);
      return;
    }

    if (selected.includes(opt)) {
      const remaining = selected.filter((item) => item !== opt);
      onChange(remaining);
    } else {
      onChange([...selected, opt]);
    }
  };

  // Label to show on button trigger
  let triggerText = allLabel;
  if (!isAllSelected) {
    if (selected.length === 1) {
      triggerText = selected[0];
    } else if (selected.length === 2) {
      triggerText = `${selected[0]}, ${selected[1]}`;
    } else {
      triggerText = `${selected[0]}, ${selected[1]} (+${selected.length - 2})`;
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-[11px] font-black uppercase text-[#475569] mb-1 flex items-center gap-1">
        {icon}
        <span>{label}</span>
      </label>

      <button
        id={`pallet-filter-${id}`}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer ${
          !isAllSelected
            ? 'bg-blue-50/80 border-blue-600 text-blue-950 ring-2 ring-blue-600/20 shadow-xs'
            : 'bg-[#F8FAFC] hover:bg-white border-[#CBD5E1] text-[#0F172A]'
        }`}
      >
        <span className="font-black truncate max-w-[170px] text-left">
          {triggerText}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {!isAllSelected && (
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-2xs">
              {selected.length}
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 sm:w-72 bg-white border-2 border-slate-300 rounded-xl shadow-2xl z-50 py-1 text-xs max-h-80 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
          {/* Header of dropdown */}
          <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between text-[11px] font-black text-slate-800 uppercase bg-slate-50">
            <span>Marcar {label}</span>
            {!isAllSelected && (
              <button
                type="button"
                onClick={handleToggleAll}
                className="text-blue-600 hover:text-blue-800 text-[10.5px] font-black cursor-pointer hover:underline"
              >
                Limpiar (Todos)
              </button>
            )}
          </div>

          {/* Search box if many options */}
          {validOptions.length > 5 && (
            <div className="p-2 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder={`Buscar ${label.toLowerCase()}...`}
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 text-[11.5px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* List of checkbox options */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100 py-1">
            {/* Option: Todos / Todas */}
            <label className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer font-black text-slate-900 bg-slate-50/30">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleToggleAll}
                className="w-4 h-4 rounded text-blue-600 accent-blue-600 focus:ring-0 cursor-pointer"
              />
              <span className="flex-1">{allLabel}</span>
              {isAllSelected && <Check className="w-3.5 h-3.5 text-blue-600 font-bold" />}
            </label>

            {/* Individual Checkbox Options */}
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-slate-400 text-xs italic">
                No se encontraron opciones
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = !isAllSelected && selected.includes(opt);
                return (
                  <label
                    key={opt}
                    className={`flex items-center gap-2.5 px-3 py-1.5 hover:bg-blue-50/60 cursor-pointer transition-colors ${
                      isChecked ? 'bg-blue-50/90 font-black text-blue-900' : 'text-slate-700 font-semibold'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleOption(opt)}
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <span className="truncate flex-1">{opt}</span>
                    {isChecked && <Check className="w-3.5 h-3.5 text-blue-600 font-bold" />}
                  </label>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-500 flex justify-between items-center">
            <span>{validOptions.length} opciones disponibles</span>
            {!isAllSelected && (
              <span className="font-bold text-blue-700">{selected.length} seleccionados</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const PalletFilterBar: React.FC<PalletFilterBarProps> = ({
  filters,
  onFilterChange,
  allRecords,
  filteredCount,
  pendingCount,
  regularizedCount,
}) => {
  // Cascading Available Months (ignora '-')
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((r) => {
      const raw = String(r.mes || '').trim();
      if (!raw || raw === '-' || raw === '--') return;
      const norm = normalizeMes(raw);
      if (norm && norm !== '-' && norm !== '--') set.add(norm);
    });
    return Array.from(set).sort();
  }, [allRecords]);

  // Selected Months parsed
  const selectedMonths = useMemo(() => {
    if (filters.meses && filters.meses.length > 0) {
      return filters.meses.filter((m) => m && m !== 'TODOS');
    }
    return filters.mes && filters.mes !== 'TODOS' ? [filters.mes] : [];
  }, [filters.meses, filters.mes]);

  // Cascading Available Weeks (ignora '-')
  const availableWeeks = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((r) => {
      if (selectedMonths.length > 0 && !selectedMonths.includes(normalizeMes(r.mes))) {
        return;
      }
      const raw = String(r.semana || '').trim();
      if (!raw || raw === '-' || raw === '--') return;
      const norm = normalizeSemana(raw);
      if (norm && norm !== '-' && norm !== '--') set.add(norm);
    });
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
      return numB - numA;
    });
  }, [allRecords, selectedMonths]);

  // Selected Weeks parsed
  const selectedWeeks = useMemo(() => {
    if (filters.semanas && filters.semanas.length > 0) {
      return filters.semanas.filter((s) => s && s !== 'TODAS');
    }
    return filters.semana && filters.semana !== 'TODAS' ? [filters.semana] : [];
  }, [filters.semanas, filters.semana]);

  // Cascading Available Dates (ignora '-')
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((r) => {
      if (selectedMonths.length > 0 && !selectedMonths.includes(normalizeMes(r.mes))) {
        return;
      }
      if (selectedWeeks.length > 0 && !selectedWeeks.includes(normalizeSemana(r.semana))) {
        return;
      }
      const raw = String(r.fecha || '').trim();
      if (!raw || raw === '-' || raw === '--') return;
      const formatted = formatToDDMMYYYY(raw).trim();
      if (formatted && formatted !== '-' && formatted !== '--') {
        set.add(formatted);
      }
    });

    return Array.from(set).sort((a, b) => {
      const partsA = a.split('/');
      const partsB = b.split('/');
      if (partsA.length === 3 && partsB.length === 3) {
        return (
          new Date(parseInt(partsB[2], 10), parseInt(partsB[1], 10) - 1, parseInt(partsB[0], 10)).getTime() -
          new Date(parseInt(partsA[2], 10), parseInt(partsA[1], 10) - 1, parseInt(partsA[0], 10)).getTime()
        );
      }
      return b.localeCompare(a);
    });
  }, [allRecords, selectedMonths, selectedWeeks]);

  // Selected Dates parsed
  const selectedDates = useMemo(() => {
    if (filters.fechas && filters.fechas.length > 0) {
      return filters.fechas.filter((f) => f && f !== 'TODAS');
    }
    return filters.fecha && filters.fecha !== 'TODAS' ? [filters.fecha] : [];
  }, [filters.fechas, filters.fecha]);

  // Cascading Available Areas (ignora '-')
  const availableAreas = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((r) => {
      if (selectedMonths.length > 0 && !selectedMonths.includes(normalizeMes(r.mes))) return;
      if (selectedWeeks.length > 0 && !selectedWeeks.includes(normalizeSemana(r.semana))) return;
      const recDate = formatToDDMMYYYY(r.fecha);
      if (selectedDates.length > 0 && !selectedDates.includes(recDate) && !selectedDates.includes(r.fecha)) return;
      const rawArea = String(r.area || '').toUpperCase().trim();
      if (!rawArea || rawArea === '-' || rawArea === '--' || rawArea === 'SIN ASIGNAR') return;
      set.add(rawArea);
    });
    return Array.from(set).sort();
  }, [allRecords, selectedMonths, selectedWeeks, selectedDates]);

  // Selected Areas parsed
  const selectedAreas = useMemo(() => {
    if (filters.areas && filters.areas.length > 0) {
      return filters.areas.filter((a) => a && a !== 'TODAS');
    }
    return filters.area && filters.area !== 'TODAS' ? [filters.area] : [];
  }, [filters.areas, filters.area]);

  // Handlers for marking filters
  const handleMonthsChange = (newMonths: string[]) => {
    onFilterChange({
      ...filters,
      meses: newMonths,
      mes: newMonths.length === 1 ? newMonths[0] : (newMonths.length === 0 ? 'TODOS' : newMonths[0]),
      semanas: [],
      semana: 'TODAS',
      fechas: [],
      fecha: 'TODAS',
    });
  };

  const handleWeeksChange = (newWeeks: string[]) => {
    onFilterChange({
      ...filters,
      semanas: newWeeks,
      semana: newWeeks.length === 1 ? newWeeks[0] : (newWeeks.length === 0 ? 'TODAS' : newWeeks[0]),
      fechas: [],
      fecha: 'TODAS',
    });
  };

  const handleDatesChange = (newDates: string[]) => {
    onFilterChange({
      ...filters,
      fechas: newDates,
      fecha: newDates.length === 1 ? newDates[0] : (newDates.length === 0 ? 'TODAS' : newDates[0]),
    });
  };

  const handleAreasChange = (newAreas: string[]) => {
    onFilterChange({
      ...filters,
      areas: newAreas,
      area: newAreas.length === 1 ? newAreas[0] : (newAreas.length === 0 ? 'TODAS' : newAreas[0]),
    });
  };

  const handleReset = () => {
    onFilterChange({
      mes: 'TODOS',
      meses: [],
      semana: 'TODAS',
      semanas: [],
      fecha: 'TODAS',
      fechas: [],
      area: 'TODAS',
      areas: [],
      estado: 'TODOS',
      searchQuery: '',
    });
  };

  const isFiltered =
    selectedMonths.length > 0 ||
    selectedWeeks.length > 0 ||
    selectedDates.length > 0 ||
    selectedAreas.length > 0 ||
    filters.estado !== 'TODOS' ||
    filters.searchQuery !== '';

  return (
    <div className="bg-white border-2 border-[#CBD5E1] rounded-2xl shadow-sm p-4 mb-4">
      {/* Top row: Section title & quick status pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#2563EB]/10 text-[#2563EB]">
            <Filter className="w-4 h-4 font-bold" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#0F172A]">
              Filtros Operativos de Pallets
            </h4>
            <p className="text-[11px] text-[#64748B]">
              Filtros con casillas para marcar: Mes → Semana → Fecha → Área
            </p>
          </div>
        </div>

        {/* Quick state filters */}
        <div className="flex items-center gap-1.5 bg-[#F1F5F9] p-1 rounded-xl border border-[#CBD5E1]">
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, estado: 'TODOS' })}
            className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
              filters.estado === 'TODOS'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            Todos ({filteredCount})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, estado: 'REGULARIZADA' })}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
              filters.estado === 'REGULARIZADA'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 hover:bg-emerald-100/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Regularizadas ({regularizedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, estado: 'PENDIENTE' })}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
              filters.estado === 'PENDIENTE'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-700 hover:bg-rose-100/60'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Pendientes ({pendingCount})</span>
          </button>
        </div>
      </div>

      {/* Inputs row: Casillas de marcar para MES -> SEMANA -> FECHA -> AREA -> BUSCADOR -> RESET */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        {/* 1. MES (Para marcar con casillas) */}
        <PalletCheckboxDropdown
          id="meses"
          label="Mes"
          icon={<Calendar className="w-3.5 h-3.5 text-[#D97706]" />}
          allLabel="Todos los Meses"
          options={availableMonths}
          selected={selectedMonths}
          onChange={handleMonthsChange}
          accentColor="#D97706"
        />

        {/* 2. SEMANA (Para marcar con casillas) */}
        <PalletCheckboxDropdown
          id="semanas"
          label="Semana"
          icon={<Layers className="w-3.5 h-3.5 text-[#7C3AED]" />}
          allLabel="Todas las Semanas"
          options={availableWeeks}
          selected={selectedWeeks}
          onChange={handleWeeksChange}
          accentColor="#7C3AED"
        />

        {/* 3. FECHA REPORTE (Para marcar con casillas) */}
        <PalletCheckboxDropdown
          id="fechas"
          label="Fecha Reporte"
          icon={<Calendar className="w-3.5 h-3.5 text-[#2563EB]" />}
          allLabel="Todas las Fechas"
          options={availableDates}
          selected={selectedDates}
          onChange={handleDatesChange}
          accentColor="#2563EB"
        />

        {/* 4. AREA (Para marcar con casillas) */}
        <PalletCheckboxDropdown
          id="areas"
          label="Área"
          icon={<MapPin className="w-3.5 h-3.5 text-[#059669]" />}
          allLabel="Todas las Áreas"
          options={availableAreas}
          selected={selectedAreas}
          onChange={handleAreasChange}
          accentColor="#059669"
        />

        {/* 5. BUSCADOR GENERAL */}
        <div>
          <label className="block text-[11px] font-black uppercase text-[#475569] mb-1 flex items-center gap-1">
            <Search className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Búsqueda</span>
          </label>
          <input
            type="text"
            placeholder="LPN, motivo, resp..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            className="w-full bg-[#F8FAFC] hover:bg-white focus:bg-white border-2 border-[#CBD5E1] focus:border-[#2563EB] rounded-xl px-2.5 py-2 text-xs font-bold text-[#0F172A] outline-none transition-all"
          />
        </div>

        {/* 6. RESET BUTTON */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleReset}
            disabled={!isFiltered}
            className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              isFiltered
                ? 'bg-rose-50 text-rose-700 border-2 border-rose-300 hover:bg-rose-100 shadow-2xs'
                : 'bg-[#F1F5F9] text-[#94A3B8] border-2 border-[#E2E8F0] cursor-not-allowed'
            }`}
            title="Restablecer filtros de Pallets"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpiar Filtros</span>
          </button>
        </div>
      </div>
    </div>
  );
};
