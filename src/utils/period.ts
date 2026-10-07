import { PeriodSelection } from '../types/period';

export const dateKeyFromValue = (value: unknown): string | null => {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'number' && value >= 20000 && value <= 80000) {
    return new Date((Math.floor(value) - 25569) * 86400000).toISOString().slice(0, 10);
  }

  const text = String(value ?? '').trim();
  const iso = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;

  const local = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (local) return `${local[3]}-${local[2].padStart(2, '0')}-${local[1].padStart(2, '0')}`;

  if (/^\d+(\.\d+)?$/.test(text)) {
    const serial = Number(text);
    if (serial >= 20000 && serial <= 80000) {
      return new Date((Math.floor(serial) - 25569) * 86400000).toISOString().slice(0, 10);
    }
  }

  return null;
};

const isoWeekKey = (dateKey: string): string => {
  const date = new Date(`${dateKey}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const year = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
};

export const matchesPeriod = (value: unknown, period: PeriodSelection): boolean => {
  if (period.granularity === 'all') return true;
  const dateKey = dateKeyFromValue(value);
  if (!dateKey || !period.value) return false;

  if (period.granularity === 'day') return dateKey === period.value;
  if (period.granularity === 'week') return isoWeekKey(dateKey) === period.value;
  if (period.granularity === 'month') return dateKey.slice(0, 7) === period.value;

  const [year, quarter] = period.value.split('-Q');
  const month = Number(dateKey.slice(5, 7));
  return dateKey.startsWith(`${year}-`) && Math.ceil(month / 3) === Number(quarter);
};

export const defaultPeriodValue = (granularity: Exclude<PeriodSelection['granularity'], 'all'>): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (granularity === 'day') return `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (granularity === 'month') return `${year}-${String(month).padStart(2, '0')}`;
  if (granularity === 'quarter') return `${year}-Q${Math.ceil(month / 3)}`;
  return isoWeekKey(`${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
};