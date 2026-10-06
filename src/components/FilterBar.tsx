import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar,
  CalendarDays,
  Filter,
  MapPin,
  RotateCcw,
  Upload,
  FileSpreadsheet,
  Lock,
  ChevronDown,
  Check,
  X,
  Layers,
  Camera,
} from 'lucide-react';
import { FilterState, AppUser } from '../types';

export interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  availableDates?: string[];
  availableMonths: string[];
  availableWeeks: string[];
  availableAreas: string[];
  currentUser?: AppUser;
  isUnlocked?: boolean;
  onOpenAccessKeyModal?: () => void;
  onOpenUploadModal?: () => void;
  onExportExcel?: () => void;
  onOpenPhotoSummary?: () => void;
  activeTab?: string;
  variant?: 'global' | 'inline';
  hideActions?: boolean;
  recordsCount?: number;
}

export interface MultiSelectProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  allLabel: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export const MultiSelectDropdown: React.FC<MultiSelectProps> = ({
  id,
  label,
  icon,
  allLabel,
  options,
  selected,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter out '-' or '--' or empty from options
  const cleanOptions = useMemo(() => {
    return options.filter((opt) => opt && opt.trim() !== '-' && opt.trim() !== '--');
  }, [options]);

  const isAllSelected = selected.length === 0 || selected.includes('TODOS') || selected.includes('TODAS');

  const toggleAll = () => {
    onChange([]); // empty signifies all
  };

  const toggleOption = (option: string) => {
    if (isAllSelected) {
      onChange([option]);
      return;
    }

    if (selected.includes(option)) {
      const remaining = selected.filter((item) => item !== option);
      onChange(remaining);
    } else {
      onChange([...selected, option]);
    }
  };

  // Trigger label
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
      <button
        id={`btn-filter-${id}`}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer ${
          !isAllSelected
            ? 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-600/20 shadow-xs'
            : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800'
        }`}
      >
        <span className={!isAllSelected ? 'text-blue-600' : 'text-slate-400'}>{icon}</span>
        <span className="text-slate-500 font-bold">{label}:</span>
        <span className="font-black max-w-[140px] truncate text-slate-900">{triggerText}</span>
        {!isAllSelected && (
          <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full ml-0.5">
            {selected.length}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 bg-white border-2 border-slate-300 rounded-xl shadow-2xl z-50 py-1 text-xs max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between text-[11px] font-black text-slate-700 uppercase">
            <span>Filtro Múltiple: {label}</span>
            {!isAllSelected && (
              <button
                onClick={toggleAll}
                className="text-blue-600 hover:underline text-[10px] font-black cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Option: Todos */}
          <label className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleAll}
              className="rounded text-blue-600 focus:ring-0 cursor-pointer accent-blue-600 w-4 h-4"
            />
            <span className="font-black text-slate-900">{allLabel}</span>
          </label>

          {/* Individual options */}
          <div className="py-1">
            {cleanOptions.map((opt: string) => {
              const isChecked = !isAllSelected && selected.includes(opt);
              return (
                <label
                  key={opt}
                  className={`flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50/70 cursor-pointer transition-colors ${
                    isChecked ? 'bg-blue-50 font-black text-blue-900' : 'text-slate-700 font-semibold'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleOption(opt)}
                    className="rounded text-blue-600 focus:ring-0 cursor-pointer accent-blue-600 w-4 h-4"
                  />
                  <span className="truncate">{opt}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  availableDates,
  availableMonths,
  availableWeeks,
  availableAreas,
  currentUser,
  isUnlocked,
  onOpenAccessKeyModal,
  onOpenUploadModal,
  onExportExcel,
  onOpenPhotoSummary,
  activeTab,
  variant = 'global',
  hideActions = false,
  recordsCount,
}) => {
  const selectedMonths = filters.meses && filters.meses.length > 0
    ? filters.meses
    : (filters.mes && filters.mes !== 'TODOS' ? [filters.mes] : []);

  const selectedWeeks = filters.semanas && filters.semanas.length > 0
    ? filters.semanas
    : (filters.semana && filters.semana !== 'TODAS' ? [filters.semana] : []);

  const selectedDates = filters.fechas && filters.fechas.length > 0
    ? filters.fechas
    : (filters.fecha && filters.fecha !== 'TODAS' ? [filters.fecha] : []);

  const selectedAreas = filters.areas && filters.areas.length > 0
    ? filters.areas
    : (filters.area && filters.area !== 'TODAS' ? [filters.area] : []);

  const isFiltered =
    selectedMonths.length > 0 ||
    selectedWeeks.length > 0 ||
    selectedDates.length > 0 ||
    selectedAreas.length > 0;

  const handleReset = () => {
    onFilterChange({
      mes: 'TODOS',
      meses: [],
      semana: 'TODAS',
      semanas: [],
      area: 'TODAS',
      areas: [],
      fechas: [],
      fecha: undefined,
    });
  };

  const handleMonthsChange = (newMonths: string[]) => {
    onFilterChange({
      ...filters,
      meses: newMonths,
      mes: newMonths.length === 1 ? newMonths[0] : (newMonths.length === 0 ? 'TODOS' : newMonths[0]),
      semanas: [],
      semana: 'TODAS',
      fechas: [],
      fecha: undefined,
    });
  };

  const handleWeeksChange = (newWeeks: string[]) => {
    onFilterChange({
      ...filters,
      semanas: newWeeks,
      semana: newWeeks.length === 1 ? newWeeks[0] : (newWeeks.length === 0 ? 'TODOS' : newWeeks[0]),
      fechas: [],
      fecha: undefined,
    });
  };

  const handleDatesChange = (newDates: string[]) => {
    onFilterChange({
      ...filters,
      fechas: newDates,
      fecha: newDates.length === 1 ? newDates[0] : undefined,
    });
  };

  const handleAreasChange = (newAreas: string[]) => {
    onFilterChange({
      ...filters,
      areas: newAreas,
      area: newAreas.length === 1 ? newAreas[0] : (newAreas.length === 0 ? 'TODOS' : newAreas[0]),
    });
  };

  const containerClass =
    variant === 'inline'
      ? 'bg-white border-2 border-slate-200 rounded-2xl p-3.5 shadow-xs mb-1'
      : 'bg-white border-b-2 border-slate-200 px-4 py-2.5 shadow-xs';

  return (
    <div id="filter-bar-container" className={containerClass}>
      <div className="flex flex-wrap items-center justify-between gap-3 max-w-[1700px] mx-auto">
        {/* Left Side: Cascading Filters in ORDER: Mes -> Semana -> Fecha -> Área */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 uppercase tracking-wider mr-1">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Filtros:</span>
          </div>

          {/* 1. Mes */}
          <MultiSelectDropdown
            id="meses"
            label="Mes"
            icon={<Calendar className="w-3.5 h-3.5 text-blue-600" />}
            allLabel="Todos los Meses"
            options={availableMonths}
            selected={selectedMonths}
            onChange={handleMonthsChange}
          />

          {/* 2. Semana */}
          <MultiSelectDropdown
            id="semanas"
            label="Semana"
            icon={<Layers className="w-3.5 h-3.5 text-indigo-600" />}
            allLabel="Todas las Semanas"
            options={availableWeeks}
            selected={selectedWeeks}
            onChange={handleWeeksChange}
          />

          {/* 3. Fecha Registro (Immediately after Semana) */}
          {availableDates && availableDates.length > 0 && (
            <MultiSelectDropdown
              id="fechas"
              label="Fecha"
              icon={<CalendarDays className="w-3.5 h-3.5 text-emerald-600" />}
              allLabel="Todas las Fechas"
              options={availableDates}
              selected={selectedDates}
              onChange={handleDatesChange}
            />
          )}

          {/* 4. Área */}
          <MultiSelectDropdown
            id="areas"
            label="Área"
            icon={<MapPin className="w-3.5 h-3.5 text-amber-600" />}
            allLabel="Todas las Áreas"
            options={availableAreas}
            selected={selectedAreas}
            onChange={handleAreasChange}
          />

          {/* Reset button */}
          {isFiltered && (
            <button
              id="btn-reset-filters"
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              title="Restablecer filtros a todos"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Restablecer</span>
            </button>
          )}

          {recordsCount !== undefined && (
            <span className="hidden sm:inline-flex items-center text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 ml-1">
              {recordsCount} registros filtrados
            </span>
          )}
        </div>

        {/* Right Side: Quick Action Buttons (shown only if not hidden) */}
        {!hideActions && (
          <div className="flex items-center gap-2">
            {onOpenUploadModal && (
              <button
                id="btn-upload-massive-data"
                onClick={() => {
                  if (!isUnlocked && onOpenAccessKeyModal) {
                    onOpenAccessKeyModal();
                  } else {
                    onOpenUploadModal();
                  }
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer ${
                  isUnlocked
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                }`}
                title={isUnlocked ? 'Cargar archivo Excel con datos masivos' : 'Desbloquear para habilitar carga de datos'}
              >
                {isUnlocked ? <Upload className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-amber-600" />}
                <span>{isUnlocked ? 'Cargar Excel Datos' : 'Desbloquear Carga'}</span>
              </button>
            )}

            {onExportExcel && (
              <button
                id="btn-export-current-data"
                onClick={onExportExcel}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer shadow-xs"
                title="Exportar datos actuales filtrados a archivo Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Exportar Excel</span>
              </button>
            )}

            {onOpenPhotoSummary && (
              <button
                onClick={onOpenPhotoSummary}
                className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer border border-amber-400"
                title="Descargar Foto Resumen para análisis de números"
              >
                <Camera className="w-3.5 h-3.5 text-slate-950 font-black shrink-0" />
                <span>Foto Resumen</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
