export type PeriodGranularity = 'all' | 'day' | 'week' | 'month' | 'quarter';

export interface PeriodSelection {
  granularity: PeriodGranularity;
  value: string;
}