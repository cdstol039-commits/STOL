import React, { useState, useEffect, useRef, useMemo } from 'react';
import Chart from 'chart.js/auto';
import * as XLSX from 'xlsx';
import {
  Users,
  Award,
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  BarChart3,
  Info,
  Download,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  ChevronRight,
  BarChart,
  AlertTriangle,
  FileSpreadsheet,
  Search,
  Upload,
  RotateCcw,
  CheckCircle2,
  Camera,
} from 'lucide-react';
import {
  SUPERVISORS_DATA,
  MONTH_LABELS,
  MonthKey,
  MonthData,
  SupervisorRecord,
  AUDITOR_NAMES,
  isAuditorName,
  GeneralSupervisorScore,
  QUARTERS,
  QuarterKey,
  QuarterDefinition,
  SupervisorObservation,
  INITIAL_SUPERVISOR_OBSERVATIONS,
} from '../../data/supervisorsData';
import { SupervisorDetailSection } from './SupervisorDetailSection';
import { SupervisorExcelUploadModal } from './SupervisorExcelUploadModal';
import { ErrorBoundary } from '../common/ErrorBoundary';
import {
  ParsedSupervisorWorkbookResult,
  generateSupervisorTemplateWorkbook,
} from '../../utils/supervisorExcelParser';

const PALETTE = ['#1f6feb', '#2da44e', '#d9480f', '#8250df', '#bf8700', '#cf222e', '#0891b2', '#4f46e5'];

const formatPct = (x: number | null | undefined): string => {
  if (x == null || isNaN(x)) return '–';
  return (x * 100).toFixed(1) + '%';
};

const formatDelta = (delta: number | null | undefined): string => {
  if (delta == null || isNaN(delta)) return '–';
  const val = delta * 100;
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(1)} pts`;
};

const getSupervisorWeekTotal = (s: SupervisorRecord, i: number): number | null => {
  const op = s.op[i];
  if (op == null) return null;
  const rh = s.rh[i] ?? 0;
  const sg = s.sg[i] ?? 0;
  return op + rh + sg;
};

export type TableViewMode = 'total' | 'op' | 'rh' | 'sg';
export type DashboardViewMode = 'mensual' | 'trimestral' | 'detalle';

interface QuarterlySupervisorRow {
  name: string;
  generalSupervisor: string;
  m1Score: number | null;
  m2Score: number | null;
  m3Score: number | null;
  quarterAverage: number;
  growth: number | null;
  trend: 'up' | 'down' | 'neutral';
}

export interface SupervisorsDashboardProps {
  onOpenPhotoSummary?: () => void;
}

export const SupervisorsDashboard: React.FC<SupervisorsDashboardProps> = ({ onOpenPhotoSummary }) => {
  const [activeView, setActiveView] = useState<DashboardViewMode>('mensual');
  const [selectedMonth, setSelectedMonth] = useState<MonthKey>('SET');
  const [selectedQuarter, setSelectedQuarter] = useState<QuarterKey>('T3');
  const [tableViewMode, setTableViewMode] = useState<TableViewMode>('total');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Base de datos de supervisores (cargada desde Excel o valores por defecto 2026)
  const [supervisorsData, setSupervisorsData] = useState<Record<MonthKey, MonthData>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('stol_supervisors_data_v2');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            Object.values(parsed).forEach((mData: any) => {
              if (mData?.t) {
                mData.t = mData.t.filter((item: any) => !isAuditorName(item?.n));
              }
            });
            return parsed;
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
    return SUPERVISORS_DATA;
  });

  // Observaciones cargadas en sesión o persistidas en localStorage
  const [observations, setObservations] = useState<SupervisorObservation[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('stol_supervisor_observations_custom_v2');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {
          console.error(e);
        }
      }
    }
    return INITIAL_SUPERVISOR_OBSERVATIONS;
  });

  const [activeFileName, setActiveFileName] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('stol_supervisor_excel_filename_v2') || null;
    }
    return null;
  });

  const [uploadStats, setUploadStats] = useState<ParsedSupervisorWorkbookResult['stats'] | null>(null);

  const handleResetDefaultData = () => {
    try {
      localStorage.removeItem('stol_supervisors_data_v2');
      localStorage.removeItem('stol_supervisor_observations_custom_v2');
      localStorage.removeItem('stol_supervisor_excel_filename_v2');
      localStorage.removeItem('stol_supervisor_excel_date_v2');
    } catch (e) {
      console.error(e);
    }
    setSupervisorsData(SUPERVISORS_DATA);
    setObservations(INITIAL_SUPERVISOR_OBSERVATIONS);
    setActiveFileName(null);
    setUploadStats(null);
  };

  const handleUploadSuccess = (
    newObs: SupervisorObservation[],
    updatedData: Record<MonthKey, MonthData>,
    fileName: string,
    stats?: ParsedSupervisorWorkbookResult['stats']
  ) => {
    const sanitizedData = { ...updatedData };
    Object.values(sanitizedData).forEach((mData: any) => {
      if (mData?.t) {
        mData.t = mData.t.filter((item: any) => !isAuditorName(item?.n));
      }
    });

    setObservations(newObs);
    setSupervisorsData(sanitizedData);
    setActiveFileName(fileName);
    if (stats) setUploadStats(stats);
    setActiveView('detalle');
  };

  // Canvas refs para Vista Mensual
  const c1Ref = useRef<HTMLCanvasElement | null>(null);
  const c2Ref = useRef<HTMLCanvasElement | null>(null);
  const c3Ref = useRef<HTMLCanvasElement | null>(null);
  const c4Ref = useRef<HTMLCanvasElement | null>(null);
  const c5Ref = useRef<HTMLCanvasElement | null>(null);
  const c6Ref = useRef<HTMLCanvasElement | null>(null);

  // Canvas refs para Vista Trimestral
  const qChartSupervisorCompRef = useRef<HTMLCanvasElement | null>(null);
  const qChartTeamEvolutionRef = useRef<HTMLCanvasElement | null>(null);
  const qChartGeneralSupervisorRef = useRef<HTMLCanvasElement | null>(null);
  const qChartQuartersTrendRef = useRef<HTMLCanvasElement | null>(null);

  const activeCharts = useRef<Chart[]>([]);

  // 1. Datos del mes seleccionado (EXCLUYENDO AUDITORES: Karla Bolivar y Makley Villanueva)
  const rawData: MonthData = supervisorsData[selectedMonth] || Object.values(supervisorsData)[0];

  // Supervisores operativos evaluados
  const operationalSupervisors = useMemo(() => {
    return rawData.s
      .filter((s) => !AUDITOR_NAMES.includes(s.n as any))
      .sort((a, b) => b.a - a.a);
  }, [rawData]);

  // Supervisores generales reales (excluyendo estrictamente a Karla Bolivar y Makley Villanueva)
  const operationalGeneralScores = useMemo(() => {
    const fromT = (rawData.t || []).filter((t) => !isAuditorName(t.n) && !t.n.toLowerCase().includes('karla') && !t.n.toLowerCase().includes('makley'));
    if (fromT.length > 0) return fromT;

    // Cálculo dinámico de respaldo desde los supervisores operativos
    const aldoSups = operationalSupervisors.filter((s) => s.t.toLowerCase().includes('aldo'));
    const pedroSups = operationalSupervisors.filter(
      (s) => s.t.toLowerCase().includes('morante') || s.t.toLowerCase().includes('pedro')
    );

    const res: GeneralSupervisorScore[] = [];
    if (aldoSups.length > 0) {
      res.push({
        n: 'Aldo Bautista',
        a: aldoSups.reduce((acc, s) => acc + s.a, 0) / aldoSups.length,
      });
    }
    if (pedroSups.length > 0) {
      res.push({
        n: 'Pedro Morante',
        a: pedroSups.reduce((acc, s) => acc + s.a, 0) / pedroSups.length,
      });
    }
    return res;
  }, [rawData, operationalSupervisors]);

  // Promedio operativo mensual (excluyendo auditores)
  const operationalGeneralAverage = useMemo(() => {
    if (operationalSupervisors.length === 0) return rawData.g;
    const sum = operationalSupervisors.reduce((acc, s) => acc + s.a, 0);
    return sum / operationalSupervisors.length;
  }, [operationalSupervisors, rawData.g]);

  // Evolución semanal operativa
  const operationalWeeklyTotals = useMemo(() => {
    return rawData.w.map((_, i) => {
      const validTotals = operationalSupervisors
        .map((s) => getSupervisorWeekTotal(s, i))
        .filter((v): v is number => v != null);
      return validTotals.length > 0
        ? validTotals.reduce((a, b) => a + b, 0) / validTotals.length
        : rawData.wt[i];
    });
  }, [rawData.w, operationalSupervisors, rawData.wt]);

  const weekLabels = rawData.w.map((w) => `Sem ${w}`);
  const bestSupervisor = operationalSupervisors[0];
  const lowestSupervisor = operationalSupervisors[operationalSupervisors.length - 1];
  const gapVsTarget = (operationalGeneralAverage - 0.98) * 100;

  // 2. Datos analíticos trimestrales (EXCLUYENDO AUDITORES)
  const quarterlyData = useMemo(() => {
    const quarter = QUARTERS.find((q) => q.key === selectedQuarter) || QUARTERS[0];
    const [m1Key, m2Key, m3Key] = quarter.months;
    const m1Data = supervisorsData[m1Key] || { w: [], s: [], wt: [], t: [], g: 0.8 };
    const m2Data = supervisorsData[m2Key] || { w: [], s: [], wt: [], t: [], g: 0.8 };
    const m3Data = supervisorsData[m3Key] || { w: [], s: [], wt: [], t: [], g: 0.8 };

    // Supervisores operativos distintos presentes en este trimestre
    const supsMap = new Map<string, string>();
    quarter.months.forEach((mKey) => {
      if (supervisorsData[mKey]?.s) {
        supervisorsData[mKey].s.forEach((s) => {
          if (!AUDITOR_NAMES.includes(s.n as any)) {
            supsMap.set(s.n, s.t);
          }
        });
      }
    });

    const list: QuarterlySupervisorRow[] = [];
    supsMap.forEach((generalSupervisor, name) => {
      const s1 = m1Data.s?.find((s) => s.n === name);
      const s2 = m2Data.s?.find((s) => s.n === name);
      const s3 = m3Data.s?.find((s) => s.n === name);

      const m1Score = s1 ? s1.a : null;
      const m2Score = s2 ? s2.a : null;
      const m3Score = s3 ? s3.a : null;

      const available = [m1Score, m2Score, m3Score].filter((v): v is number => v != null);
      const quarterAverage = available.length > 0 ? available.reduce((a, b) => a + b, 0) / available.length : 0;

      let growth: number | null = null;
      if (m1Score != null && m3Score != null) {
        growth = m3Score - m1Score;
      } else if (m1Score != null && m2Score != null) {
        growth = m2Score - m1Score;
      } else if (m2Score != null && m3Score != null) {
        growth = m3Score - m2Score;
      }

      let trend: 'up' | 'down' | 'neutral' = 'neutral';
      if (growth != null) {
        if (growth > 0.005) trend = 'up';
        else if (growth < -0.005) trend = 'down';
      }

      list.push({
        name,
        generalSupervisor,
        m1Score,
        m2Score,
        m3Score,
        quarterAverage,
        growth,
        trend,
      });
    });

    list.sort((a, b) => b.quarterAverage - a.quarterAverage);

    // Promedio operativo mensual de cada mes del trimestre
    const getMonthOpAvg = (mKey: MonthKey): number => {
      const sups = (supervisorsData[mKey]?.s || []).filter((s) => !AUDITOR_NAMES.includes(s.n as any));
      return sups.length > 0 ? sups.reduce((acc, s) => acc + s.a, 0) / sups.length : 0;
    };

    const m1Avg = getMonthOpAvg(m1Key);
    const m2Avg = getMonthOpAvg(m2Key);
    const m3Avg = getMonthOpAvg(m3Key);
    const quarterTeamAvg = (m1Avg + m2Avg + m3Avg) / 3;
    const teamGrowth = m3Avg - m1Avg;

    const bestQuarterSupervisor = list[0];
    const listWithGrowth = list.filter((r) => r.growth != null);
    const highestGrowthSupervisor = listWithGrowth.length > 0
      ? [...listWithGrowth].sort((a, b) => (b.growth ?? 0) - (a.growth ?? 0))[0]
      : null;

    // Desempeño trimestral de supervisores generales (Aldo Bautista vs Pedro Morante)
    const generalSupsMap = new Map<string, { m1: number | null; m2: number | null; m3: number | null }>();
    ['Aldo Bautista', 'Pedro Morante'].forEach((gName) => {
      const g1 = m1Data.t?.find((t) => t.n === gName)?.a ?? null;
      const g2 = m2Data.t?.find((t) => t.n === gName)?.a ?? null;
      const g3 = m3Data.t?.find((t) => t.n === gName)?.a ?? null;
      generalSupsMap.set(gName, { m1: g1, m2: g2, m3: g3 });
    });

    // Comparativa de todos los trimestres (T1, T2, T3)
    const allQuartersAverages = QUARTERS.map((q) => {
      const qAvgs = q.months.map((m) => getMonthOpAvg(m));
      const avg = qAvgs.reduce((a, b) => a + b, 0) / qAvgs.length;
      return {
        key: q.key,
        label: q.shortLabel,
        avg,
      };
    });

    return {
      quarter,
      m1Key,
      m2Key,
      m3Key,
      m1Label: MONTH_LABELS[m1Key] || m1Key,
      m2Label: MONTH_LABELS[m2Key] || m2Key,
      m3Label: MONTH_LABELS[m3Key] || m3Key,
      list,
      m1Avg,
      m2Avg,
      m3Avg,
      quarterTeamAvg,
      teamGrowth,
      bestSupervisor: bestQuarterSupervisor,
      bestQuarterSupervisor,
      highestGrowthSupervisor,
      generalSupsMap,
      allQuartersAverages,
    };
  }, [selectedQuarter, supervisorsData]);

  // Exportar Excel Completo (Mensual y Trimestral)
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Hoja Comparativa Trimestral
    const qRows: any[] = [];
    qRows.push(['EVALUACIÓN DE DESEMPEÑO – COMPARATIVA TRIMESTRAL 2026']);
    qRows.push(['Nota:', 'Excluyendo Auditores (Karla Bolívar y Makley Villanueva)', 'Meta ERU: 98%']);
    qRows.push([]);

    QUARTERS.forEach((q) => {
      qRows.push([`TRIMESTRE: ${q.label.toUpperCase()}`]);
      const [m1, m2, m3] = q.months;
      qRows.push([
        '#',
        'Supervisor',
        'Sup. General',
        `${MONTH_LABELS[m1]} (%)`,
        `${MONTH_LABELS[m2]} (%)`,
        `${MONTH_LABELS[m3]} (%)`,
        'Promedio Trimestral (%)',
        'Avance (pts)',
        'Tendencia',
      ]);

      const supsInQ = new Map<string, string>();
      q.months.forEach((mKey) => {
        (supervisorsData[mKey]?.s || []).forEach((s) => {
          if (!AUDITOR_NAMES.includes(s.n as any)) supsInQ.set(s.n, s.t);
        });
      });

      let idx = 1;
      supsInQ.forEach((gSup, name) => {
        const s1 = supervisorsData[m1]?.s.find((s) => s.n === name)?.a;
        const s2 = supervisorsData[m2]?.s.find((s) => s.n === name)?.a;
        const s3 = supervisorsData[m3]?.s.find((s) => s.n === name)?.a;
        const av = [s1, s2, s3].filter((v): v is number => v != null);
        const qAvg = av.length > 0 ? av.reduce((a, b) => a + b, 0) / av.length : 0;
        const delta = s1 != null && s3 != null ? (s3 - s1) * 100 : null;

        qRows.push([
          idx++,
          name,
          gSup,
          s1 != null ? Number((s1 * 100).toFixed(2)) : '',
          s2 != null ? Number((s2 * 100).toFixed(2)) : '',
          s3 != null ? Number((s3 * 100).toFixed(2)) : '',
          Number((qAvg * 100).toFixed(2)),
          delta != null ? Number(delta.toFixed(2)) : '',
          delta != null ? (delta > 0.5 ? 'Crecimiento' : delta < -0.5 ? 'Descenso' : 'Estable') : '–',
        ]);
      });

      qRows.push([]);
    });

    const wsTrimestral = XLSX.utils.aoa_to_sheet(qRows);
    XLSX.utils.book_append_sheet(wb, wsTrimestral, 'Resumen_Trimestral');

    // 2. Hojas de Detalle Mensual
    (Object.keys(supervisorsData) as MonthKey[]).forEach((mKey) => {
      const mData = supervisorsData[mKey];
      if (!mData) return;
      const opSups = mData.s.filter((s) => !AUDITOR_NAMES.includes(s.n as any));
      const mRows: any[] = [];
      mRows.push([`EVALUACIÓN DE DESEMPEÑO – MES ${mKey} (${(MONTH_LABELS[mKey] || mKey).toUpperCase()})`]);
      mRows.push(['Supervisores Operativos (Auditores Excluidos)', 'Meta ERU: 98%']);
      mRows.push([]);

      const headers = ['#', 'Supervisor', 'Sup. General', 'Total Promedio (%)'];
      mData.w.forEach((w) => headers.push(`Sem ${w} Total (%)`, `Sem ${w} OP (60%)`, `Sem ${w} RRHH (20%)`, `Sem ${w} SIG (20%)`));
      mRows.push(headers);

      opSups.forEach((s, i) => {
        const row: any[] = [i + 1, s.n, s.t, Number((s.a * 100).toFixed(2))];
        mData.w.forEach((_, wIdx) => {
          const wt = getSupervisorWeekTotal(s, wIdx);
          row.push(wt != null ? Number((wt * 100).toFixed(2)) : '');
          row.push(s.op[wIdx] != null ? Number((s.op[wIdx]! * 100).toFixed(2)) : '');
          row.push(s.rh[wIdx] != null ? Number((s.rh[wIdx]! * 100).toFixed(2)) : '');
          row.push(s.sg[wIdx] != null ? Number((s.sg[wIdx]! * 100).toFixed(2)) : '');
        });
        mRows.push(row);
      });

      const wsMonth = XLSX.utils.aoa_to_sheet(mRows);
      XLSX.utils.book_append_sheet(wb, wsMonth, `Mes_${mKey}`);
    });

    XLSX.writeFile(wb, `Desempeno_Supervisores_2026_Trimestral_y_Mensual.xlsx`);
  };

  // Renderizado reactivo de gráficos Chart.js
  useEffect(() => {
    // Destruir gráficos anteriores para evitar superposiciones
    activeCharts.current.forEach((c) => c.destroy());
    activeCharts.current = [];

    const metaLine = (count: number) => ({
      type: 'line' as const,
      label: 'Meta 98%',
      data: Array(count).fill(0.98),
      borderColor: '#d9480f',
      borderDash: [6, 4],
      pointRadius: 0,
      borderWidth: 2,
    });

    const tooltipConfig = {
      plugins: {
        legend: {
          labels: {
            color: '#1b2430',
            boxWidth: 12,
            font: { size: 11, weight: 'bold' as const },
          },
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const label = context.dataset.label || '';
              const val = context.parsed?.y;
              return `${label}: ${formatPct(val)}`;
            },
          },
        },
      },
    };

    if (activeView === 'mensual') {
      // 1. Chart c1: Promedio % por supervisor (excluyendo Karla y Makley)
      if (c1Ref.current) {
        const c1 = new Chart(c1Ref.current, {
          type: 'bar',
          data: {
            labels: operationalSupervisors.map((s) => s.n),
            datasets: [
              {
                label: 'Promedio Operativo %',
                data: operationalSupervisors.map((s) => s.a),
                backgroundColor: '#1f6feb',
                borderRadius: 6,
              },
              metaLine(operationalSupervisors.length),
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            ...tooltipConfig,
            scales: {
              x: {
                ticks: { color: '#64748b', font: { size: 10, weight: 'bold' } },
                grid: { display: false },
              },
              y: {
                min: 0,
                max: 1.05,
                ticks: {
                  color: '#64748b',
                  callback: (v: any) => (v * 100).toFixed(0) + '%',
                  font: { size: 10 },
                },
                grid: { color: '#e2e8f0' },
              },
            },
          },
        });
        activeCharts.current.push(c1);
      }

      // 2. Chart c6: Promedio % por supervisor general (solo Aldo Bautista y Pedro Morante)
      if (c6Ref.current) {
        const c6 = new Chart(c6Ref.current, {
          type: 'bar',
          data: {
            labels: operationalGeneralScores.map((s) => s.n),
            datasets: [
              {
                label: 'Promedio Sup. General %',
                data: operationalGeneralScores.map((s) => s.a),
                backgroundColor: '#2da44e',
                borderRadius: 6,
              },
              metaLine(operationalGeneralScores.length),
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            ...tooltipConfig,
            scales: {
              x: {
                ticks: { color: '#64748b', font: { size: 11, weight: 'bold' } },
                grid: { display: false },
              },
              y: {
                min: 0,
                max: 1.05,
                ticks: {
                  color: '#64748b',
                  callback: (v: any) => (v * 100).toFixed(0) + '%',
                  font: { size: 10 },
                },
                grid: { color: '#e2e8f0' },
              },
            },
          },
        });
        activeCharts.current.push(c6);
      }

      // Helper para componentes (Operaciones, RRHH, SIG)
      const makeGroupedBarChart = (canvas: HTMLCanvasElement | null, key: 'op' | 'rh' | 'sg', maxVal: number) => {
        if (!canvas) return;
        const datasets = operationalSupervisors.map((s, idx) => ({
          label: s.n,
          data: s[key],
          backgroundColor: PALETTE[idx % PALETTE.length],
          borderRadius: 4,
        }));

        const chart = new Chart(canvas, {
          type: 'bar',
          data: { labels: weekLabels, datasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            ...tooltipConfig,
            scales: {
              x: {
                ticks: { color: '#64748b', font: { size: 10, weight: 'bold' } },
                grid: { display: false },
              },
              y: {
                min: 0,
                max: maxVal,
                ticks: {
                  color: '#64748b',
                  callback: (v: any) => (v * 100).toFixed(0) + '%',
                  font: { size: 10 },
                },
                grid: { color: '#e2e8f0' },
              },
            },
          },
        });
        activeCharts.current.push(chart);
      };

      // 3. Operaciones 60%
      makeGroupedBarChart(c2Ref.current, 'op', 0.65);
      // 4. RRHH 20%
      makeGroupedBarChart(c3Ref.current, 'rh', 0.25);
      // 5. SIG 20%
      makeGroupedBarChart(c4Ref.current, 'sg', 0.25);

      // 6. Evolución del total semanal operativo
      if (c5Ref.current) {
        const c5 = new Chart(c5Ref.current, {
          type: 'line',
          data: {
            labels: weekLabels,
            datasets: [
              {
                label: 'Promedio Operativo Semanal',
                data: operationalWeeklyTotals,
                borderColor: '#1f6feb',
                backgroundColor: 'rgba(31, 111, 235, 0.12)',
                fill: true,
                tension: 0.28,
                borderWidth: 3,
                pointBackgroundColor: '#1f6feb',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
              },
              metaLine(weekLabels.length),
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            ...tooltipConfig,
            scales: {
              x: {
                ticks: { color: '#64748b', font: { size: 11, weight: 'bold' } },
                grid: { display: false },
              },
              y: {
                min: 0.5,
                max: 1.02,
                ticks: {
                  color: '#64748b',
                  callback: (v: any) => (v * 100).toFixed(0) + '%',
                  font: { size: 10 },
                },
                grid: { color: '#e2e8f0' },
              },
            },
          },
        });
        activeCharts.current.push(c5);
      }
    } else {
      // === VISTA TRIMESTRAL: Gráficos de Comparación y Avance ===

      // 1. Gráfico de Comparativa Mes a Mes por Supervisor (Barras agrupadas de los 3 meses)
      if (qChartSupervisorCompRef.current) {
        const qChart1 = new Chart(qChartSupervisorCompRef.current, {
          type: 'bar',
          data: {
            labels: quarterlyData.list.map((r) => r.name),
            datasets: [
              {
                label: quarterlyData.m1Label,
                data: quarterlyData.list.map((r) => r.m1Score),
                backgroundColor: '#3b82f6',
                borderRadius: 4,
              },
              {
                label: quarterlyData.m2Label,
                data: quarterlyData.list.map((r) => r.m2Score),
                backgroundColor: '#6366f1',
                borderRadius: 4,
              },
              {
                label: quarterlyData.m3Label,
                data: quarterlyData.list.map((r) => r.m3Score),
                backgroundColor: '#0ea5e9',
                borderRadius: 4,
              },
              metaLine(quarterlyData.list.length),
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            ...tooltipConfig,
            scales: {
              x: {
                ticks: { color: '#1e293b', font: { size: 11, weight: 'bold' } },
                grid: { display: false },
              },
              y: {
                min: 0.5,
                max: 1.05,
                ticks: {
                  color: '#64748b',
                  callback: (v: any) => (v * 100).toFixed(0) + '%',
                  font: { size: 10 },
                },
                grid: { color: '#e2e8f0' },
              },
            },
          },
        });
        activeCharts.current.push(qChart1);
      }

      // 2. Gráfico de Evolución Mensual del Equipo en el Trimestre
      if (qChartTeamEvolutionRef.current) {
        const qChart2 = new Chart(qChartTeamEvolutionRef.current, {
          type: 'line',
          data: {
            labels: [quarterlyData.m1Label, quarterlyData.m2Label, quarterlyData.m3Label],
            datasets: [
              {
                label: 'Promedio Operativo del Equipo',
                data: [quarterlyData.m1Avg, quarterlyData.m2Avg, quarterlyData.m3Avg],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                fill: true,
                tension: 0.25,
                borderWidth: 3,
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8,
              },
              metaLine(3),
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            ...tooltipConfig,
            scales: {
              x: {
                ticks: { color: '#1e293b', font: { size: 11, weight: 'bold' } },
                grid: { display: false },
              },
              y: {
                min: 0.7,
                max: 1.02,
                ticks: {
                  color: '#64748b',
                  callback: (v: any) => (v * 100).toFixed(0) + '%',
                  font: { size: 10 },
                },
                grid: { color: '#e2e8f0' },
              },
            },
          },
        });
        activeCharts.current.push(qChart2);
      }

      // 3. Comparativa por Supervisor General en el Trimestre (Aldo Bautista vs Pedro Morante)
      if (qChartGeneralSupervisorRef.current) {
        const aldoData = quarterlyData.generalSupsMap.get('Aldo Bautista');
        const pedroData = quarterlyData.generalSupsMap.get('Pedro Morante');

        const qChart3 = new Chart(qChartGeneralSupervisorRef.current, {
          type: 'bar',
          data: {
            labels: [quarterlyData.m1Label, quarterlyData.m2Label, quarterlyData.m3Label],
            datasets: [
              {
                label: 'Aldo Bautista',
                data: [aldoData?.m1 ?? null, aldoData?.m2 ?? null, aldoData?.m3 ?? null],
                backgroundColor: '#2563eb',
                borderRadius: 4,
              },
              {
                label: 'Pedro Morante',
                data: [pedroData?.m1 ?? null, pedroData?.m2 ?? null, pedroData?.m3 ?? null],
                backgroundColor: '#10b981',
                borderRadius: 4,
              },
              metaLine(3),
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            ...tooltipConfig,
            scales: {
              x: {
                ticks: { color: '#1e293b', font: { size: 11, weight: 'bold' } },
                grid: { display: false },
              },
              y: {
                min: 0.7,
                max: 1.02,
                ticks: {
                  color: '#64748b',
                  callback: (v: any) => (v * 100).toFixed(0) + '%',
                  font: { size: 10 },
                },
                grid: { color: '#e2e8f0' },
              },
            },
          },
        });
        activeCharts.current.push(qChart3);
      }

      // 4. Comparativa Intertrimestral (T1 vs T2 vs T3)
      if (qChartQuartersTrendRef.current) {
        const qChart4 = new Chart(qChartQuartersTrendRef.current, {
          type: 'bar',
          data: {
            labels: quarterlyData.allQuartersAverages.map((q) => q.label),
            datasets: [
              {
                label: 'Promedio General del Trimestre',
                data: quarterlyData.allQuartersAverages.map((q) => q.avg),
                backgroundColor: ['#3b82f6', '#8b5cf6', '#0ea5e9'],
                borderRadius: 6,
              },
              metaLine(quarterlyData.allQuartersAverages.length),
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            ...tooltipConfig,
            scales: {
              x: {
                ticks: { color: '#1e293b', font: { size: 11, weight: 'bold' } },
                grid: { display: false },
              },
              y: {
                min: 0.7,
                max: 1.02,
                ticks: {
                  color: '#64748b',
                  callback: (v: any) => (v * 100).toFixed(0) + '%',
                  font: { size: 10 },
                },
                grid: { color: '#e2e8f0' },
              },
            },
          },
        });
        activeCharts.current.push(qChart4);
      }
    }

    return () => {
      activeCharts.current.forEach((c) => c.destroy());
      activeCharts.current = [];
    };
  }, [activeView, selectedMonth, selectedQuarter, operationalSupervisors, quarterlyData]);

  // Descarga de la plantilla Excel oficial multi-hoja
  const handleDownloadTemplate = () => {
    const wb = generateSupervisorTemplateWorkbook();
    XLSX.writeFile(wb, 'PLANTILLA_CONSOLIDADO_OPERACIONES_RRHH_SIG_2026.xlsx');
  };

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-200">
      {/* 1. Header Principal y Navegación de Vistas */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white flex items-center justify-center font-black shadow-md border border-slate-700">
              <Users className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black uppercase text-slate-900 tracking-wide font-sans">
                  Evaluación de Desempeño – Supervisores 2026
                </h1>
                <span className="bg-blue-100 text-blue-900 text-xs font-black px-2.5 py-0.5 rounded-full border border-blue-300">
                  Año 2026
                </span>
                <span className="bg-amber-100 text-amber-900 text-xs font-black px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  Meta ERU: 98%
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Seguimiento de cumplimiento operativo y auditoría de gestión · 2026
              </p>
            </div>
          </div>

          {/* Botones de Acción Superior: Descarga de Plantilla, Carga de Excel Maestro y Exportación */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black transition-all border border-slate-300 cursor-pointer shadow-2xs"
              title="Descargar plantilla Excel modelo con las 3 hojas oficiales (Consolidado 60/20/20, RRHH y SIG)"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>Plantilla Excel (.xlsx)</span>
            </button>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer border border-blue-950"
              title="Cargar un solo archivo Excel para actualizar todas las vistas simultáneamente"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-300" />
              <span>Cargar Excel Consolidado (Actualiza Todo)</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer border border-emerald-900"
              title="Descargar libro Excel con hojas de desglose mensual y comparativa trimestral"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Excel Completo</span>
            </button>

            {onOpenPhotoSummary && (
              <button
                type="button"
                onClick={onOpenPhotoSummary}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer border border-amber-600"
                title="Descargar o copiar foto resumen de supervisores para análisis ejecutivo (diario, semanal, mensual o trimestral)"
              >
                <Camera className="w-4 h-4 text-slate-950" />
                <span>Foto Resumen</span>
              </button>
            )}
          </div>
        </div>

        {/* Notificación informativa: Exclusión de auditores de los resultados generales */}
        <div className="flex items-center justify-between bg-amber-50/80 border border-amber-300/80 rounded-xl px-3.5 py-2 text-xs text-amber-900 flex-wrap gap-2">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Filtro de Auditores Activo:</strong> Se excluyen automáticamente de los resultados generales a{' '}
              <span className="underline decoration-amber-500 font-black">Karla Bolívar</span> y{' '}
              <span className="underline decoration-amber-500 font-black">Makley Villanueva</span> por ser Auditores. Los promedios y rankings corresponden exclusivamente a <strong>Supervisores Operativos</strong>.
            </span>
          </div>
          <span className="bg-amber-200/80 text-amber-950 font-black text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider">
            Solo Supervisores
          </span>
        </div>

        {/* Notificación de Archivo Excel Activo */}
        {activeFileName && (
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl px-3.5 py-2.5 text-xs text-blue-950 flex-wrap gap-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Todos los desgloses sincronizados con Excel:</strong> <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-blue-300 text-blue-900">{activeFileName}</span>
                {uploadStats ? ` (${uploadStats.monthsCount > 0 ? `${uploadStats.monthsCount} mes(es) actualizado(s), ` : ''}${uploadStats.observationsCount} observaciones extraídas de RRHH, SIG y Operaciones)` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-950 font-black text-[10px] px-2 py-0.5 rounded-md uppercase border border-emerald-300">
                Datos Personalizados Activos
              </span>
              <button
                type="button"
                onClick={handleResetDefaultData}
                className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-rose-700 border border-slate-300 hover:border-rose-300 rounded-lg text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                title="Restablecer base de datos a los valores originales predeterminados de 2026"
              >
                <RotateCcw className="w-3 h-3 text-rose-600" />
                <span>Restablecer Datos Originales 2026</span>
              </button>
            </div>
          </div>
        )}

        {/* Pestañas de Cambio de Sección: Mensual vs Trimestral vs Detalle y Observaciones */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-3 flex-wrap gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveView('mensual')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeView === 'mensual'
                  ? 'bg-[#1A1A2E] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Análisis Mensual Detallado</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('trimestral')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeView === 'trimestral'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-white" />
              <span>Comparativa Trimestral de Avance</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeView === 'trimestral' ? 'bg-white text-blue-900' : 'bg-blue-100 text-blue-900'
              }`}>
                T1 · T2 · T3
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('detalle')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeView === 'detalle'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 ${activeView === 'detalle' ? 'text-amber-300' : 'text-amber-500'}`} />
              <span>Detalle de Nota & Observaciones</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeView === 'detalle' ? 'bg-white text-indigo-900' : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}>
                ¿Por qué esa nota?
              </span>
            </button>
          </div>

          {/* Filtros Contextuales según la pestaña activa */}
          {activeView === 'mensual' && (
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-300 shadow-2xs">
              <Calendar className="w-4 h-4 text-blue-600 ml-1.5 shrink-0" />
              <span className="text-xs font-black uppercase text-slate-700">Mes:</span>
              <select
                id="select-mes-supervisor"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value as MonthKey)}
                className="bg-white text-slate-900 font-black text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
              >
                {(Object.keys(supervisorsData) as MonthKey[]).map((m) => (
                  <option key={m} value={m}>
                    {m} — {MONTH_LABELS[m] || m}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeView === 'trimestral' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black uppercase text-slate-600 mr-1 flex items-center gap-1">
                <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                Trimestre:
              </span>
              {QUARTERS.map((q) => (
                <button
                  key={q.key}
                  onClick={() => setSelectedQuarter(q.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    selectedQuarter === q.key
                      ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-300'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                  }`}
                >
                  {q.shortLabel}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          SECCIÓN 1: VISTA TRIMESTRAL (COMPARATIVA DE AVANCE ENTRE MESES)
          ========================================================================= */}
      {activeView === 'trimestral' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Banner de Identificación del Trimestre */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm flex flex-wrap items-center justify-between gap-4 border border-blue-950">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-400 text-slate-950 text-xs font-black px-2.5 py-0.5 rounded-md uppercase">
                  {quarterlyData.quarter.key}
                </span>
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wide">
                  {quarterlyData.quarter.label}
                </h2>
              </div>
              <p className="text-xs text-blue-200 font-medium mt-1">
                Evaluando meses de {quarterlyData.m1Label}, {quarterlyData.m2Label} y {quarterlyData.m3Label} · Comparación de avance supervisor por supervisor
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-white/10 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/20 text-xs">
                <span className="text-blue-200 mr-1.5">Avance del Equipo:</span>
                <span className={`font-black ${quarterlyData.teamGrowth >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {formatDelta(quarterlyData.teamGrowth)}
                </span>
              </div>
            </div>
          </div>

          {/* Tarjetas KPI Trimestrales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Promedio Trimestral del Equipo */}
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Promedio Trimestral</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 my-1 tabular-nums">
                {formatPct(quarterlyData.quarterTeamAvg)}
              </div>
              <div className="text-xs font-semibold flex items-center gap-1.5">
                <span className={quarterlyData.quarterTeamAvg >= 0.98 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                  Brecha vs 98%: {formatDelta(quarterlyData.quarterTeamAvg - 0.98)}
                </span>
              </div>
            </div>

            {/* 2. Avance Global en el Trimestre (Mes 3 vs Mes 1) */}
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avance del Trimestre</span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                  quarterlyData.teamGrowth >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {quarterlyData.teamGrowth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                </div>
              </div>
              <div className={`text-3xl font-black my-1 tabular-nums ${
                quarterlyData.teamGrowth >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {formatDelta(quarterlyData.teamGrowth)}
              </div>
              <div className="text-xs text-slate-600 font-medium">
                De {formatPct(quarterlyData.m1Avg)} ({quarterlyData.m1Key}) a {formatPct(quarterlyData.m3Avg)} ({quarterlyData.m3Key})
              </div>
            </div>

            {/* 3. Supervisor con Mayor Avance */}
            <div className="bg-emerald-50/60 border-2 border-emerald-300 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Mayor Crecimiento</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-950 my-1 truncate" title={quarterlyData.highestGrowthSupervisor?.name}>
                {quarterlyData.highestGrowthSupervisor?.name || '–'}
              </div>
              <div className="text-xs font-extrabold text-emerald-700 flex items-center gap-1">
                <span>Incremento: <strong>{formatDelta(quarterlyData.highestGrowthSupervisor?.growth)}</strong></span>
              </div>
            </div>

            {/* 4. Mejor Supervisor del Trimestre */}
            <div className="bg-indigo-50/60 border-2 border-indigo-300 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Mejor Supervisor Q</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-indigo-950 my-1 truncate" title={quarterlyData.bestSupervisor?.name}>
                {quarterlyData.bestSupervisor?.name || '–'}
              </div>
              <div className="text-xs font-extrabold text-indigo-800 flex items-center gap-1">
                <span>Promedio Q: <strong>{formatPct(quarterlyData.bestSupervisor?.quarterAverage)}</strong></span>
              </div>
            </div>
          </div>

          {/* Gráficos Analíticos Trimestrales */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gráfico 1: Comparativa Mes a Mes por Supervisor */}
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
                <h3 className="text-xs sm:text-sm font-black uppercase text-slate-900 tracking-wide flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  Comparativa Mes a Mes por Supervisor ({quarterlyData.quarter.shortLabel})
                </h3>
                <span className="text-[10.5px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  {quarterlyData.m1Key} vs {quarterlyData.m2Key} vs {quarterlyData.m3Key}
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 font-medium">
                Compara las barras de cada mes por cada supervisor para ver la progresión directa.
              </p>
              <div className="relative h-72 sm:h-80 w-full">
                <canvas ref={qChartSupervisorCompRef} />
              </div>
            </div>

            {/* Gráfico 2: Trayectoria de Evolución Mensual del Equipo */}
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
                <h3 className="text-xs sm:text-sm font-black uppercase text-slate-900 tracking-wide flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Trayectoria de Avance del Equipo ({quarterlyData.quarter.shortLabel})
                </h3>
                <span className="text-[10.5px] font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Evolución Mensual
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 font-medium">
                Tendencia global mes a mes del equipo de supervisores operativos en el trimestre.
              </p>
              <div className="relative h-72 sm:h-80 w-full">
                <canvas ref={qChartTeamEvolutionRef} />
              </div>
            </div>

            {/* Gráfico 3: Desempeño por Supervisor General en el Trimestre */}
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
                <h3 className="text-xs sm:text-sm font-black uppercase text-slate-900 tracking-wide flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-700" />
                  Desempeño por Supervisor General ({quarterlyData.quarter.shortLabel})
                </h3>
                <span className="text-[10.5px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  Aldo Bautista vs Pedro Morante
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 font-medium">
                Comparativa de supervisores generales a lo largo de los 3 meses del trimestre.
              </p>
              <div className="relative h-64 sm:h-72 w-full">
                <canvas ref={qChartGeneralSupervisorRef} />
              </div>
            </div>

            {/* Gráfico 4: Comparativa Intertrimestral (T1 vs T2 vs T3) */}
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
                <h3 className="text-xs sm:text-sm font-black uppercase text-slate-900 tracking-wide flex items-center gap-2">
                  <BarChart className="w-4 h-4 text-purple-600" />
                  Evolución entre Trimestres (T1 vs T2 vs T3 2026)
                </h3>
                <span className="text-[10.5px] font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                  Año 2026
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 font-medium">
                Comparación del avance entre los distintos trimestres del año para medir consolidación.
              </p>
              <div className="relative h-64 sm:h-72 w-full">
                <canvas ref={qChartQuartersTrendRef} />
              </div>
            </div>
          </div>

          {/* Tabla Comparativa Trimestral Detallada */}
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <h3 className="text-sm font-black uppercase text-slate-900 tracking-wide">
                  Tabla Comparativa de Avance por Supervisor — {quarterlyData.quarter.label}
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-bold bg-slate-100 px-3 py-1 rounded-full">
                {quarterlyData.list.length} Supervisores Operativos Evaluados
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white text-[11px] font-black uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-10 text-center border-r border-slate-700">#</th>
                    <th className="py-2.5 px-3 border-r border-slate-700">Supervisor</th>
                    <th className="py-2.5 px-3 border-r border-slate-700">Sup. General</th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-700 w-28 bg-slate-800">
                      {quarterlyData.m1Label}
                    </th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-700 w-28 bg-slate-800">
                      {quarterlyData.m2Label}
                    </th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-700 w-28 bg-slate-800">
                      {quarterlyData.m3Label}
                    </th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-700 w-32 bg-blue-950 font-black">
                      Promedio Q
                    </th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-700 w-32">Avance ({quarterlyData.m3Key} vs {quarterlyData.m1Key})</th>
                    <th className="py-2.5 px-3 text-center w-28">Diagnóstico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                  {quarterlyData.list.map((r, idx) => {
                    const isTop = idx === 0;
                    return (
                      <tr
                        key={r.name}
                        className={`hover:bg-blue-50/50 transition-colors ${
                          isTop ? 'bg-emerald-50/20 font-bold' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-bold text-slate-500 border-r border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-black text-slate-900 border-r border-slate-200 flex items-center gap-2">
                          <span>{r.name}</span>
                          {isTop && (
                            <span className="bg-emerald-100 text-emerald-800 text-[9.5px] font-black px-1.5 py-0.2 rounded-md border border-emerald-300">
                              1° Q
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 border-r border-slate-200">
                          {r.generalSupervisor}
                        </td>
                        <td className="py-2.5 px-3 text-center border-r border-slate-200 tabular-nums">
                          {r.m1Score != null ? (
                            <span className="font-bold text-slate-800">{formatPct(r.m1Score)}</span>
                          ) : (
                            <span className="text-slate-300 font-normal">–</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center border-r border-slate-200 tabular-nums">
                          {r.m2Score != null ? (
                            <span className="font-bold text-slate-800">{formatPct(r.m2Score)}</span>
                          ) : (
                            <span className="text-slate-300 font-normal">–</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center border-r border-slate-200 tabular-nums">
                          {r.m3Score != null ? (
                            <span className="font-bold text-slate-800">{formatPct(r.m3Score)}</span>
                          ) : (
                            <span className="text-slate-300 font-normal">–</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center border-r border-slate-200 font-black text-slate-900 bg-slate-50">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md ${
                              r.quarterAverage >= 0.88
                                ? 'bg-emerald-100 text-emerald-900 font-black'
                                : r.quarterAverage >= 0.82
                                ? 'bg-blue-100 text-blue-900 font-black'
                                : 'bg-amber-100 text-amber-900 font-black'
                            }`}
                          >
                            {formatPct(r.quarterAverage)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center border-r border-slate-200 tabular-nums">
                          {r.growth != null ? (
                            <span
                              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-black text-xs ${
                                r.growth > 0
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : r.growth < 0
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {r.growth > 0 ? (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              ) : r.growth < 0 ? (
                                <ArrowDownRight className="w-3.5 h-3.5" />
                              ) : (
                                <Minus className="w-3.5 h-3.5" />
                              )}
                              {formatDelta(r.growth)}
                            </span>
                          ) : (
                            <span className="text-slate-400">–</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {r.trend === 'up' && (
                            <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                              Crecimiento
                            </span>
                          )}
                          {r.trend === 'down' && (
                            <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                              Descenso
                            </span>
                          )}
                          {r.trend === 'neutral' && (
                            <span className="text-[10px] font-black uppercase text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              Estable
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Fila Resumen General del Trimestre */}
                <tfoot>
                  <tr className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-700">
                    <td className="py-2.5 px-3 text-center text-slate-400 border-r border-slate-800">–</td>
                    <td className="py-2.5 px-3 text-white border-r border-slate-800 uppercase tracking-wide">
                      Promedio General del Equipo
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 border-r border-slate-800">TODOS</td>
                    <td className="py-2.5 px-3 text-center border-r border-slate-800 tabular-nums">
                      {formatPct(quarterlyData.m1Avg)}
                    </td>
                    <td className="py-2.5 px-3 text-center border-r border-slate-800 tabular-nums">
                      {formatPct(quarterlyData.m2Avg)}
                    </td>
                    <td className="py-2.5 px-3 text-center border-r border-slate-800 tabular-nums">
                      {formatPct(quarterlyData.m3Avg)}
                    </td>
                    <td className="py-2.5 px-3 text-center border-r border-slate-800 bg-slate-800">
                      <span className="inline-block px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black">
                        {formatPct(quarterlyData.quarterTeamAvg)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center border-r border-slate-800 tabular-nums">
                      <span className={`font-black ${quarterlyData.teamGrowth >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {formatDelta(quarterlyData.teamGrowth)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-300 font-bold">
                      {quarterlyData.teamGrowth >= 0 ? 'Positivo' : 'Descendente'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECCIÓN 2: VISTA MENSUAL DETALLADA (EXCLUYENDO AUDITORES)
          ========================================================================= */}
      {activeView === 'mensual' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Tarjetas KPI de Resumen Ejecutivo Mensual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Promedio General Operativo */}
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Promedio Operativo</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 my-1 tabular-nums">
                {formatPct(operationalGeneralAverage)}
              </div>
              <div className="text-xs font-semibold flex items-center gap-1.5">
                <span className={gapVsTarget >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                  Brecha vs meta 98%: {gapVsTarget >= 0 ? '+' : ''}{gapVsTarget.toFixed(1)} pts
                </span>
              </div>
            </div>

            {/* Mejor Supervisor Operativo */}
            <div className="bg-emerald-50/60 border-2 border-emerald-300 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Mejor Supervisor</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-950 my-1 truncate" title={bestSupervisor?.n}>
                {bestSupervisor?.n || '–'}
              </div>
              <div className="text-xs font-extrabold text-emerald-700 flex items-center gap-1">
                <span>Cumplimiento: <strong>{formatPct(bestSupervisor?.a)}</strong></span>
              </div>
            </div>

            {/* Menor Puntaje Operativo */}
            <div className="bg-amber-50/60 border-2 border-amber-300 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Menor Puntaje</span>
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-950 my-1 truncate" title={lowestSupervisor?.n}>
                {lowestSupervisor?.n || '–'}
              </div>
              <div className="text-xs font-extrabold text-amber-700 flex items-center gap-1">
                <span>Cumplimiento: <strong>{formatPct(lowestSupervisor?.a)}</strong></span>
              </div>
            </div>

            {/* Supervisores Operativos Evaluados */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm flex flex-col justify-between border-2 border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Supervisores Operativos</span>
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-white my-1 tabular-nums">
                {operationalSupervisors.length}
              </div>
              <div className="text-xs text-slate-300 font-medium">
                {rawData.w.length} semanas ({weekLabels.join(', ')})
              </div>
            </div>
          </div>

          {/* Cuadrícula de 6 Gráficos Analíticos Mensuales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gráfico 1: Promedio % por supervisor (excluyendo Karla y Makley) */}
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
                <h2 className="text-xs sm:text-sm font-black uppercase text-slate-900 tracking-wide flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  Promedio % por Supervisor Operativo (Meta 98%)
                </h2>
                <span className="text-[10.5px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {MONTH_LABELS[selectedMonth]}
                </span>
              </div>
              <div className="relative h-64 sm:h-72 w-full">
                <canvas ref={c1Ref} />
              </div>
            </div>

            {/* Gráfico 2: Promedio % por supervisor general (Aldo Bautista y Pedro Morante) */}
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
                <h2 className="text-xs sm:text-sm font-black uppercase text-slate-900 tracking-wide flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  Promedio % por Supervisor General (Meta 98%)
                </h2>
                <span className="text-[10.5px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  Aldo Bautista & Pedro Morante
                </span>
              </div>
              <div className="relative h-64 sm:h-72 w-full">
                <canvas ref={c6Ref} />
              </div>
            </div>

            {/* Gráfico 3: Operaciones (60%) por semana */}
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
                <h2 className="text-xs sm:text-sm font-black uppercase text-slate-900 tracking-wide flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Operaciones (60%) por Semana
                </h2>
                <span className="text-[10.5px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  Peso 60%
                </span>
              </div>
              <div className="relative h-64 sm:h-72 w-full">
                <canvas ref={c2Ref} />
              </div>
            </div>

            {/* Gráfico 4: RRHH (20%) por semana */}
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
                <h2 className="text-xs sm:text-sm font-black uppercase text-slate-900 tracking-wide flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  RRHH (20%) por Semana
                </h2>
                <span className="text-[10.5px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                  Peso 20%
                </span>
              </div>
              <div className="relative h-64 sm:h-72 w-full">
                <canvas ref={c3Ref} />
              </div>
            </div>

            {/* Gráfico 5: SIG (20%) por semana */}
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
                <h2 className="text-xs sm:text-sm font-black uppercase text-slate-900 tracking-wide flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-600" />
                  SIG (20%) por Semana
                </h2>
                <span className="text-[10.5px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Peso 20%
                </span>
              </div>
              <div className="relative h-64 sm:h-72 w-full">
                <canvas ref={c4Ref} />
              </div>
            </div>

            {/* Gráfico 6: Evolución del total semanal operativo */}
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
                <h2 className="text-xs sm:text-sm font-black uppercase text-slate-900 tracking-wide flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Evolución Operativa por Semana
                </h2>
                <span className="text-[10.5px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Tendencia
                </span>
              </div>
              <div className="relative h-64 sm:h-72 w-full">
                <canvas ref={c5Ref} />
              </div>
            </div>
          </div>

          {/* Tabla de Detalle Mensual por Supervisor */}
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <h2 className="text-sm font-black uppercase text-slate-900 tracking-wide">
                  Detalle por Supervisor Operativo — {MONTH_LABELS[selectedMonth]} 2026
                </h2>
              </div>

              {/* Toggle de Modo de la Tabla */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setTableViewMode('total')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      tableViewMode === 'total'
                        ? 'bg-blue-600 text-white shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Total Semanal
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableViewMode('op')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      tableViewMode === 'op'
                        ? 'bg-blue-600 text-white shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Operaciones (60%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableViewMode('rh')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      tableViewMode === 'rh'
                        ? 'bg-blue-600 text-white shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    RRHH (20%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableViewMode('sg')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      tableViewMode === 'sg'
                        ? 'bg-blue-600 text-white shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    SIG (20%)
                  </button>
                </div>

                <span className="text-xs text-slate-500 font-bold bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  {operationalSupervisors.length} Supervisores Operativos
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white text-[11px] font-black uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-10 text-center border-r border-slate-700">#</th>
                    <th className="py-2.5 px-3 border-r border-slate-700">Supervisor</th>
                    <th className="py-2.5 px-3 border-r border-slate-700">Sup. General</th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-700 bg-slate-800 w-28">Total Promedio</th>
                    {rawData.w.map((w) => (
                      <th key={w} className="py-2.5 px-3 text-center border-r border-slate-700 w-24">
                        {tableViewMode === 'total' && `Sem ${w} Total`}
                        {tableViewMode === 'op' && `Sem ${w} OP 60%`}
                        {tableViewMode === 'rh' && `Sem ${w} RRHH 20%`}
                        {tableViewMode === 'sg' && `Sem ${w} SIG 20%`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                  {operationalSupervisors.map((s, idx) => {
                    const isTop = idx === 0;
                    return (
                      <tr
                        key={s.n}
                        className={`hover:bg-blue-50/50 transition-colors ${
                          isTop ? 'bg-emerald-50/20 font-bold' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-bold text-slate-500 border-r border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-black text-slate-900 border-r border-slate-200 flex items-center gap-2">
                          <span>{s.n}</span>
                          {isTop && (
                            <span className="bg-emerald-100 text-emerald-800 text-[9.5px] font-black px-1.5 py-0.2 rounded-md border border-emerald-300">
                              1°
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 border-r border-slate-200">
                          {s.t}
                        </td>
                        <td className="py-2.5 px-3 text-center border-r border-slate-200 font-black text-slate-900 bg-slate-50">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md ${
                              s.a >= 0.88
                                ? 'bg-emerald-100 text-emerald-900 font-black'
                                : s.a >= 0.82
                                ? 'bg-blue-100 text-blue-900 font-black'
                                : 'bg-amber-100 text-amber-900 font-black'
                            }`}
                          >
                            {formatPct(s.a)}
                          </span>
                        </td>
                        {rawData.w.map((_, i) => {
                          if (tableViewMode === 'total') {
                            const wt = getSupervisorWeekTotal(s, i);
                            return (
                              <td key={i} className="py-2.5 px-3 text-center border-r border-slate-200 tabular-nums">
                                {wt != null ? (
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-md font-bold ${
                                      wt >= 0.88
                                        ? 'bg-emerald-50 text-emerald-800 font-black'
                                        : wt >= 0.82
                                        ? 'bg-blue-50 text-blue-800'
                                        : 'bg-amber-50 text-amber-900'
                                    }`}
                                  >
                                    {formatPct(wt)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-normal">–</span>
                                )}
                              </td>
                            );
                          }
                          if (tableViewMode === 'op') {
                            const v = s.op[i];
                            return (
                              <td key={i} className="py-2.5 px-3 text-center border-r border-slate-200 tabular-nums">
                                {v != null ? (
                                  <span className={v >= 0.58 ? 'font-black text-emerald-700' : 'text-slate-700'}>
                                    {formatPct(v)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-normal">–</span>
                                )}
                              </td>
                            );
                          }
                          if (tableViewMode === 'rh') {
                            const v = s.rh[i];
                            return (
                              <td key={i} className="py-2.5 px-3 text-center border-r border-slate-200 tabular-nums">
                                {v != null ? (
                                  <span className="text-slate-800 font-bold">{formatPct(v)}</span>
                                ) : (
                                  <span className="text-slate-300 font-normal">–</span>
                                )}
                              </td>
                            );
                          }
                          const v = s.sg[i];
                          return (
                            <td key={i} className="py-2.5 px-3 text-center border-r border-slate-200 tabular-nums">
                              {v != null ? (
                                <span className="text-slate-800 font-bold">{formatPct(v)}</span>
                              ) : (
                                <span className="text-slate-300 font-normal">–</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
                {/* Fila Resumen: Promedio Operativo Mensual y Semanal */}
                <tfoot>
                  <tr className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-700">
                    <td className="py-2.5 px-3 text-center text-slate-400 border-r border-slate-800">–</td>
                    <td className="py-2.5 px-3 text-white border-r border-slate-800 uppercase tracking-wide">
                      Promedio Operativo Mensual
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 border-r border-slate-800">TODOS</td>
                    <td className="py-2.5 px-3 text-center border-r border-slate-800 bg-slate-800">
                      <span className="inline-block px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black">
                        {formatPct(operationalGeneralAverage)}
                      </span>
                    </td>
                    {rawData.w.map((_, i) => (
                      <td key={i} className="py-2.5 px-3 text-center border-r border-slate-800 tabular-nums">
                        {tableViewMode === 'total' && operationalWeeklyTotals[i] != null ? (
                          <span className="text-amber-300 font-black">
                            {formatPct(operationalWeeklyTotals[i])}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold">
                            {tableViewMode === 'op' && '60%'}
                            {tableViewMode === 'rh' && '20%'}
                            {tableViewMode === 'sg' && '20%'}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECCIÓN 3: VISTA DE DETALLE & OBSERVACIONES POR SUPERVISOR ("¿Por qué esa nota?")
          ========================================================================= */}
      {activeView === 'detalle' && (
        <ErrorBoundary fallbackTitle="Error al cargar la sección de Detalle y Observaciones">
          <SupervisorDetailSection
            observations={observations}
            supervisorsData={supervisorsData}
            onOpenUploadModal={() => setIsUploadModalOpen(true)}
            activeFileName={activeFileName}
            onResetDefaultData={handleResetDefaultData}
            isCustomDataActive={!!activeFileName}
          />
        </ErrorBoundary>
      )}

      {/* Modal de Carga de Archivo Excel con Observaciones y Calificaciones */}
      <SupervisorExcelUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Nota Informativa y Metodológica (Pie de página general) */}
      <div className="bg-slate-100 border border-slate-300 rounded-xl p-3.5 text-xs text-slate-600 flex items-start gap-2.5 leading-relaxed">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-black text-slate-800 uppercase mr-1">Metodología y Alcance:</span>
          Cada valor representa el promedio ponderado de <strong>VALOR TOTAL</strong> (Operaciones 60%, RRHH 20% y SIG 20%). Conforme a las directrices de auditoría operacional, <strong>Karla Bolívar</strong> y <strong>Makley Villanueva</strong> participan como Auditores de campo y no son considerados en las métricas de supervisión operativa general. Meta ERU del 98% establecida en la serie oficial de desempeño.
        </div>
      </div>
    </div>
  );
};
