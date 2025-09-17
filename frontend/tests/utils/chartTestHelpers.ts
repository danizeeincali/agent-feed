/**
 * Chart Testing Utilities
 *
 * Helper functions and utilities for testing Chart.js and react-chartjs-2 components
 * Provides mock implementations and validation functions
 */

import { vi } from 'vitest';

// Chart.js mock factory
export const createChartJsMock = () => {
  const mockChart = {
    register: vi.fn(),
    getChart: vi.fn(),
    destroy: vi.fn(),
    update: vi.fn(),
    render: vi.fn(),
    resize: vi.fn(),
    defaults: {
      font: {
        family: 'Helvetica Neue',
        size: 12,
      },
      color: '#666',
      elements: {
        point: { radius: 3 },
        line: { tension: 0.1 },
      },
    },
    helpers: {
      color: vi.fn(),
    },
  };

  return {
    Chart: mockChart,
    CategoryScale: { id: 'category' },
    LinearScale: { id: 'linear' },
    PointElement: { id: 'point' },
    LineElement: { id: 'line' },
    BarElement: { id: 'bar' },
    Title: { id: 'title' },
    Tooltip: { id: 'tooltip' },
    Legend: { id: 'legend' },
    TimeScale: { id: 'time' },
  };
};

// React-chartjs-2 mock factory
export const createReactChartJsMock = () => ({
  Line: vi.fn().mockImplementation(({ data, options, ...props }) => {
    return (
      <div
        data-testid="mock-line-chart"
        data-chart-data={JSON.stringify(data)}
        data-chart-options={JSON.stringify(options)}
        {...props}
      >
        <canvas data-testid="line-chart-canvas" />
        {data?.datasets?.map((dataset: any, index: number) => (
          <div key={index} data-testid={`line-dataset-${index}`}>
            {dataset.label}
          </div>
        ))}
      </div>
    );
  }),

  Bar: vi.fn().mockImplementation(({ data, options, ...props }) => {
    return (
      <div
        data-testid="mock-bar-chart"
        data-chart-data={JSON.stringify(data)}
        data-chart-options={JSON.stringify(options)}
        {...props}
      >
        <canvas data-testid="bar-chart-canvas" />
        {data?.datasets?.map((dataset: any, index: number) => (
          <div key={index} data-testid={`bar-dataset-${index}`}>
            {dataset.label}
          </div>
        ))}
      </div>
    );
  }),

  Doughnut: vi.fn().mockImplementation(({ data, options, ...props }) => {
    return (
      <div
        data-testid="mock-doughnut-chart"
        data-chart-data={JSON.stringify(data)}
        data-chart-options={JSON.stringify(options)}
        {...props}
      >
        <canvas data-testid="doughnut-chart-canvas" />
      </div>
    );
  }),

  Pie: vi.fn().mockImplementation(({ data, options, ...props }) => {
    return (
      <div
        data-testid="mock-pie-chart"
        data-chart-data={JSON.stringify(data)}
        data-chart-options={JSON.stringify(options)}
        {...props}
      >
        <canvas data-testid="pie-chart-canvas" />
      </div>
    );
  }),
});

// Chart data validation helpers
export const validateChartData = (chartElement: HTMLElement) => {
  const dataAttr = chartElement.getAttribute('data-chart-data');
  if (!dataAttr) {
    throw new Error('Chart element missing data-chart-data attribute');
  }

  try {
    const data = JSON.parse(dataAttr);
    return {
      isValid: true,
      data,
      hasLabels: Array.isArray(data.labels),
      hasDatasets: Array.isArray(data.datasets),
      datasetCount: data.datasets?.length || 0,
      labelCount: data.labels?.length || 0,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message,
    };
  }
};

export const validateChartOptions = (chartElement: HTMLElement) => {
  const optionsAttr = chartElement.getAttribute('data-chart-options');
  if (!optionsAttr) {
    return { isValid: true, options: {} }; // Options are optional
  }

  try {
    const options = JSON.parse(optionsAttr);
    return {
      isValid: true,
      options,
      hasScales: !!options.scales,
      hasPlugins: !!options.plugins,
      isResponsive: options.responsive !== false,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message,
    };
  }
};

// Chart interaction helpers
export const getChartDatasetValues = (chartElement: HTMLElement, datasetIndex: number = 0) => {
  const validation = validateChartData(chartElement);
  if (!validation.isValid || !validation.data) {
    throw new Error('Invalid chart data');
  }

  const dataset = validation.data.datasets[datasetIndex];
  if (!dataset) {
    throw new Error(`Dataset at index ${datasetIndex} not found`);
  }

  return {
    label: dataset.label,
    data: dataset.data,
    backgroundColor: dataset.backgroundColor,
    borderColor: dataset.borderColor,
    dataCount: dataset.data?.length || 0,
  };
};

export const getChartLabels = (chartElement: HTMLElement) => {
  const validation = validateChartData(chartElement);
  if (!validation.isValid || !validation.data) {
    throw new Error('Invalid chart data');
  }

  return validation.data.labels || [];
};

// Mock data generators
export const generateMockTimeSeriesData = (
  pointCount: number = 24,
  baseValue: number = 1000,
  variation: number = 200
) => {
  const now = new Date();
  const labels = Array.from({ length: pointCount }, (_, i) => {
    const time = new Date(now.getTime() - (pointCount - i - 1) * 60 * 60 * 1000);
    return time.toISOString();
  });

  const data = Array.from({ length: pointCount }, () => {
    return baseValue + Math.random() * variation - variation / 2;
  });

  return { labels, data };
};

export const generateMockDailyData = (
  dayCount: number = 30,
  baseValue: number = 5000,
  variation: number = 1000
) => {
  const today = new Date();
  const labels = Array.from({ length: dayCount }, (_, i) => {
    const date = new Date(today.getTime() - (dayCount - i - 1) * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
  });

  const data = Array.from({ length: dayCount }, () => {
    return Math.floor(baseValue + Math.random() * variation - variation / 2);
  });

  return { labels, data };
};

export const createMockChartData = (type: 'line' | 'bar' = 'line') => {
  const timeData = generateMockTimeSeriesData();
  const costData = timeData.data.map(tokens => tokens * 0.01); // 1 cent per 100 tokens

  if (type === 'line') {
    return {
      labels: timeData.labels,
      datasets: [
        {
          label: 'Tokens',
          data: timeData.data,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.1,
        },
        {
          label: 'Cost',
          data: costData,
          borderColor: 'rgb(168, 85, 247)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          yAxisID: 'y1',
        },
      ],
    };
  }

  const dailyData = generateMockDailyData();
  const requestData = dailyData.data.map(tokens => Math.floor(tokens / 100)); // 100 tokens per request

  return {
    labels: dailyData.labels,
    datasets: [
      {
        label: 'Daily Tokens',
        data: dailyData.data,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
      },
      {
        label: 'Daily Requests',
        data: requestData,
        backgroundColor: 'rgba(168, 85, 247, 0.8)',
        yAxisID: 'y1',
      },
    ],
  };
};

// Chart performance testing helpers
export const measureChartRenderTime = async (renderFunction: () => Promise<void>) => {
  const startTime = performance.now();
  await renderFunction();
  const endTime = performance.now();
  return endTime - startTime;
};

export const validateChartPerformance = (renderTime: number, maxTime: number = 1000) => {
  return {
    renderTime,
    maxTime,
    isWithinLimit: renderTime <= maxTime,
    performanceRatio: renderTime / maxTime,
  };
};

// Browser-specific chart testing helpers
export const simulateChartInteraction = (chartElement: HTMLElement, interaction: string) => {
  const canvas = chartElement.querySelector('canvas');
  if (!canvas) {
    throw new Error('Chart canvas not found');
  }

  switch (interaction) {
    case 'hover':
      canvas.dispatchEvent(new MouseEvent('mousemove', {
        clientX: 100,
        clientY: 100,
        bubbles: true,
      }));
      break;
    case 'click':
      canvas.dispatchEvent(new MouseEvent('click', {
        clientX: 100,
        clientY: 100,
        bubbles: true,
      }));
      break;
    case 'resize':
      canvas.dispatchEvent(new Event('resize', { bubbles: true }));
      break;
    default:
      throw new Error(`Unknown interaction type: ${interaction}`);
  }
};

// Chart accessibility testing helpers
export const validateChartAccessibility = (chartElement: HTMLElement) => {
  const canvas = chartElement.querySelector('canvas');
  if (!canvas) {
    return { isAccessible: false, issues: ['Canvas element not found'] };
  }

  const issues: string[] = [];

  // Check for aria-label or aria-labelledby
  if (!canvas.getAttribute('aria-label') && !canvas.getAttribute('aria-labelledby')) {
    issues.push('Canvas missing aria-label or aria-labelledby');
  }

  // Check for role
  if (!canvas.getAttribute('role')) {
    issues.push('Canvas missing role attribute');
  }

  // Check for tabindex for keyboard navigation
  const tabindex = canvas.getAttribute('tabindex');
  if (!tabindex || parseInt(tabindex) < 0) {
    issues.push('Canvas not keyboard accessible (missing or negative tabindex)');
  }

  return {
    isAccessible: issues.length === 0,
    issues,
  };
};

// Error simulation helpers
export const simulateChartError = (errorType: 'dataError' | 'renderError' | 'networkError') => {
  switch (errorType) {
    case 'dataError':
      return {
        data: {
          labels: null, // Invalid data
          datasets: undefined,
        },
      };
    case 'renderError':
      // Mock Chart.js to throw on render
      const chartMock = createChartJsMock();
      chartMock.Chart.register = vi.fn().mockImplementation(() => {
        throw new Error('Chart registration failed');
      });
      return chartMock;
    case 'networkError':
      return new Error('Failed to fetch chart data');
    default:
      throw new Error(`Unknown error type: ${errorType}`);
  }
};

// Test data fixtures
export const chartTestFixtures = {
  validLineData: createMockChartData('line'),
  validBarData: createMockChartData('bar'),
  emptyData: { labels: [], datasets: [] },
  invalidData: { labels: null, datasets: undefined },
  largeDataset: {
    labels: Array.from({ length: 1000 }, (_, i) => `Point ${i}`),
    datasets: [{
      label: 'Large Dataset',
      data: Array.from({ length: 1000 }, () => Math.random() * 1000),
    }],
  },
};

// Integration test helpers
export const createIntegrationTestMocks = () => {
  const chartJsMock = createChartJsMock();
  const reactChartJsMock = createReactChartJsMock();

  return {
    ...chartJsMock,
    ...reactChartJsMock,
    dateAdapter: {},
  };
};

export default {
  createChartJsMock,
  createReactChartJsMock,
  validateChartData,
  validateChartOptions,
  getChartDatasetValues,
  getChartLabels,
  generateMockTimeSeriesData,
  generateMockDailyData,
  createMockChartData,
  measureChartRenderTime,
  validateChartPerformance,
  simulateChartInteraction,
  validateChartAccessibility,
  simulateChartError,
  chartTestFixtures,
  createIntegrationTestMocks,
};