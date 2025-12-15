/**
 * MonitoringCharts Component - Phase 5 Historical Metrics Visualization
 *
 * Production-ready Chart.js integration with:
 * - Time-series line charts for CPU, Memory, Queue, Workers
 * - Dark mode support
 * - Responsive 2x2 grid layout
 * - Loading and empty states
 * - Smooth animations and tooltips
 */

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import type { HistoricalStats, MetricDataPoint } from '../../services/MonitoringApiService';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

// ==================== TYPE DEFINITIONS ====================

interface MonitoringChartsProps {
  data: HistoricalStats | null;
  loading?: boolean;
}

interface ChartDataset {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  tension: number;
  fill: boolean;
  borderWidth: number;
  pointRadius: number;
  pointHoverRadius: number;
}

interface ChartData {
  labels: Date[];
  datasets: ChartDataset[];
}

// ==================== CHART CONFIGURATION ====================

/**
 * Base chart options with dark mode support
 */
const createChartOptions = (
  title: string,
  yAxisLabel: string,
  isDark: boolean = false
): ChartOptions<'line'> => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
      labels: {
        color: isDark ? 'rgba(209, 213, 219, 1)' : 'rgba(55, 65, 81, 1)',
        font: {
          size: 12,
        },
        padding: 10,
        usePointStyle: true,
      },
    },
    title: {
      display: false,
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      titleColor: isDark ? 'rgba(243, 244, 246, 1)' : 'rgba(17, 24, 39, 1)',
      bodyColor: isDark ? 'rgba(209, 213, 219, 1)' : 'rgba(55, 65, 81, 1)',
      borderColor: isDark ? 'rgba(75, 85, 99, 1)' : 'rgba(229, 231, 235, 1)',
      borderWidth: 1,
      padding: 12,
      displayColors: true,
      callbacks: {
        label: (context) => {
          const label = context.dataset.label || '';
          const value = context.parsed.y;
          const formattedValue = typeof value === 'number' ? value.toFixed(2) : value;
          return `${label}: ${formattedValue}${yAxisLabel.includes('%') ? '%' : ''}`;
        },
      },
    },
  },
  scales: {
    x: {
      type: 'time' as const,
      time: {
        displayFormats: {
          minute: 'HH:mm',
          hour: 'HH:mm',
          day: 'MMM dd',
        },
        tooltipFormat: 'MMM dd, HH:mm:ss',
      },
      grid: {
        display: true,
        color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      },
      ticks: {
        color: isDark ? 'rgba(156, 163, 175, 1)' : 'rgba(107, 114, 128, 1)',
        maxRotation: 0,
        autoSkipPadding: 10,
      },
    },
    y: {
      type: 'linear' as const,
      display: true,
      position: 'left' as const,
      title: {
        display: true,
        text: yAxisLabel,
        color: isDark ? 'rgba(209, 213, 219, 1)' : 'rgba(55, 65, 81, 1)',
        font: {
          size: 12,
          weight: 500,
        },
      },
      grid: {
        display: true,
        color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      },
      ticks: {
        color: isDark ? 'rgba(156, 163, 175, 1)' : 'rgba(107, 114, 128, 1)',
        callback: (value) => {
          if (typeof value === 'number') {
            return yAxisLabel.includes('%') ? `${value.toFixed(0)}%` : value.toFixed(0);
          }
          return value;
        },
      },
      beginAtZero: true,
    },
  },
  animation: {
    duration: 750,
    easing: 'easeInOutQuart',
  },
});

// ==================== DATA TRANSFORMATION ====================

/**
 * Transform MetricDataPoint array to Chart.js format
 */
const transformToChartData = (
  dataPoints: MetricDataPoint[],
  label: string,
  borderColor: string,
  backgroundColor: string
): ChartData => {
  if (!dataPoints || dataPoints.length === 0) {
    return {
      labels: [],
      datasets: [],
    };
  }

  const labels = dataPoints.map(point => new Date(point.timestamp));
  const values = dataPoints.map(point => point.value);

  return {
    labels,
    datasets: [
      {
        label,
        data: values,
        borderColor,
        backgroundColor,
        tension: 0.4,
        fill: false,
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
    ],
  };
};

// ==================== LOADING SKELETON ====================

const ChartSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-3">
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
    <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
    <div className="flex justify-center space-x-4">
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
    </div>
  </div>
);

// ==================== EMPTY STATE ====================

const EmptyChart: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex flex-col items-center justify-center h-full text-center py-12">
    <svg
      className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
    <p className="text-gray-500 dark:text-gray-400 text-sm">
      No historical data available for {title}
    </p>
  </div>
);

// ==================== CHART CARD COMPONENT ====================

interface ChartCardProps {
  title: string;
  chartData: ChartData;
  options: ChartOptions<'line'>;
  loading?: boolean;
  isEmpty: boolean;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  chartData,
  options,
  loading,
  isEmpty,
}) => (
  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-300">
        {title}
      </h3>
    </div>
    <div className="p-4">
      <div className="h-[300px]">
        {loading ? (
          <ChartSkeleton />
        ) : isEmpty ? (
          <EmptyChart title={title} />
        ) : (
          <Line data={chartData} options={options} />
        )}
      </div>
    </div>
  </div>
);

// ==================== MAIN COMPONENT ====================

export const MonitoringCharts: React.FC<MonitoringChartsProps> = ({
  data,
  loading = false,
}) => {
  // Detect dark mode from document class
  const isDark = useMemo(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  }, []);

  // Transform data for each chart
  const cpuData = useMemo(() => {
    if (!data?.cpuHistory) return { labels: [], datasets: [] };
    return transformToChartData(
      data.cpuHistory,
      'CPU Usage',
      'rgb(59, 130, 246)', // Blue
      'rgba(59, 130, 246, 0.1)'
    );
  }, [data?.cpuHistory]);

  const memoryData = useMemo(() => {
    if (!data?.memoryHistory) return { labels: [], datasets: [] };
    return transformToChartData(
      data.memoryHistory,
      'Memory Usage',
      'rgb(34, 197, 94)', // Green
      'rgba(34, 197, 94, 0.1)'
    );
  }, [data?.memoryHistory]);

  const queueData = useMemo(() => {
    if (!data?.requestHistory) return { labels: [], datasets: [] };
    return transformToChartData(
      data.requestHistory,
      'Queue Depth',
      'rgb(249, 115, 22)', // Orange
      'rgba(249, 115, 22, 0.1)'
    );
  }, [data?.requestHistory]);

  const workersData = useMemo(() => {
    if (!data?.errorHistory) return { labels: [], datasets: [] };
    return transformToChartData(
      data.errorHistory,
      'Active Workers',
      'rgb(168, 85, 247)', // Purple
      'rgba(168, 85, 247, 0.1)'
    );
  }, [data?.errorHistory]);

  // Chart options
  const cpuOptions = useMemo(
    () => createChartOptions('CPU Usage', 'Usage (%)', isDark),
    [isDark]
  );

  const memoryOptions = useMemo(
    () => createChartOptions('Memory Usage', 'Usage (%)', isDark),
    [isDark]
  );

  const queueOptions = useMemo(
    () => createChartOptions('Queue Depth', 'Depth', isDark),
    [isDark]
  );

  const workersOptions = useMemo(
    () => createChartOptions('Active Workers', 'Workers', isDark),
    [isDark]
  );

  // Check if data is empty
  const isEmpty = !data || (
    (!data.cpuHistory || data.cpuHistory.length === 0) &&
    (!data.memoryHistory || data.memoryHistory.length === 0) &&
    (!data.requestHistory || data.requestHistory.length === 0) &&
    (!data.errorHistory || data.errorHistory.length === 0)
  );

  if (!loading && isEmpty) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <svg
            className="w-20 h-20 text-gray-300 dark:text-gray-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-300 mb-2">
            No Historical Data Available
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
            Historical metrics will appear here once the monitoring system collects data.
            Check back in a few minutes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartCard
        title="CPU Usage (%)"
        chartData={cpuData}
        options={cpuOptions}
        loading={loading}
        isEmpty={!data?.cpuHistory || data.cpuHistory.length === 0}
      />

      <ChartCard
        title="Memory Usage (%)"
        chartData={memoryData}
        options={memoryOptions}
        loading={loading}
        isEmpty={!data?.memoryHistory || data.memoryHistory.length === 0}
      />

      <ChartCard
        title="Queue Depth"
        chartData={queueData}
        options={queueOptions}
        loading={loading}
        isEmpty={!data?.requestHistory || data.requestHistory.length === 0}
      />

      <ChartCard
        title="Active Workers"
        chartData={workersData}
        options={workersOptions}
        loading={loading}
        isEmpty={!data?.errorHistory || data.errorHistory.length === 0}
      />
    </div>
  );
};

export default MonitoringCharts;
