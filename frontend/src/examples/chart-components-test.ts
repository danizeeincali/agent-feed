/**
 * Chart Components Test Suite
 * Demonstrates how page-builder-agent would use LineChart, BarChart, and PieChart
 */

import { ComponentSchemas } from '../schemas/componentSchemas';

/**
 * Test data generators
 */
export const generateTestData = {
  lineChart: () => ({
    data: [
      { timestamp: '2025-10-01T00:00:00Z', value: 1200, label: 'Mon' },
      { timestamp: '2025-10-02T00:00:00Z', value: 1350, label: 'Tue' },
      { timestamp: '2025-10-03T00:00:00Z', value: 1180, label: 'Wed' },
      { timestamp: '2025-10-04T00:00:00Z', value: 1520, label: 'Thu' },
      { timestamp: '2025-10-05T00:00:00Z', value: 1680, label: 'Fri' },
      { timestamp: '2025-10-06T00:00:00Z', value: 1750, label: 'Sat' },
      { timestamp: '2025-10-07T00:00:00Z', value: 1920, label: 'Sun' },
    ],
    config: {
      title: 'Weekly User Activity',
      xAxis: 'Day',
      yAxis: 'Active Users',
      colors: ['#3B82F6'],
      showGrid: true,
      showLegend: false,
    },
    height: 300,
    showTrend: true,
    gradient: true,
  }),

  barChart: () => ({
    data: [
      { timestamp: 'product-a', value: 450, label: 'Product A' },
      { timestamp: 'product-b', value: 320, label: 'Product B' },
      { timestamp: 'product-c', value: 580, label: 'Product C' },
      { timestamp: 'product-d', value: 210, label: 'Product D' },
      { timestamp: 'product-e', value: 390, label: 'Product E' },
    ],
    config: {
      title: 'Product Sales by Category',
      xAxis: 'Products',
      yAxis: 'Units Sold',
      colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
      showGrid: true,
      showLegend: true,
    },
    height: 350,
    showValues: true,
    horizontal: false,
  }),

  pieChart: () => ({
    data: [
      { timestamp: 'mobile', value: 45000, label: 'Mobile' },
      { timestamp: 'desktop', value: 35000, label: 'Desktop' },
      { timestamp: 'tablet', value: 15000, label: 'Tablet' },
      { timestamp: 'other', value: 5000, label: 'Other' },
    ],
    config: {
      title: 'Traffic Sources Distribution',
      colors: ['#EC4899', '#3B82F6', '#10B981', '#F59E0B'],
      showLegend: true,
    },
    height: 400,
    donut: true,
    showTotal: true,
  }),
};

/**
 * Test validation function
 */
export function validateChartComponent(type: string, props: any): {
  valid: boolean;
  errors?: any[];
  data?: any;
} {
  try {
    const schema = ComponentSchemas[type as keyof typeof ComponentSchemas];
    if (!schema) {
      return {
        valid: false,
        errors: [`Unknown component type: ${type}`],
      };
    }

    const validated = schema.parse(props);
    return {
      valid: true,
      data: validated,
    };
  } catch (error: any) {
    return {
      valid: false,
      errors: error.errors || [error.message],
    };
  }
}

/**
 * Example 1: Basic LineChart Usage
 */
export const lineChartExample = {
  type: 'LineChart',
  props: generateTestData.lineChart(),
};

/**
 * Example 2: Horizontal BarChart
 */
export const barChartHorizontalExample = {
  type: 'BarChart',
  props: {
    data: [
      { timestamp: 'team-alpha', value: 95, label: 'Team Alpha' },
      { timestamp: 'team-beta', value: 87, label: 'Team Beta' },
      { timestamp: 'team-gamma', value: 92, label: 'Team Gamma' },
      { timestamp: 'team-delta', value: 78, label: 'Team Delta' },
      { timestamp: 'team-epsilon', value: 88, label: 'Team Epsilon' },
    ],
    config: {
      title: 'Team Performance Scores',
      xAxis: 'Score',
      yAxis: 'Teams',
      colors: ['#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#3B82F6'],
      showGrid: true,
      showLegend: false,
    },
    height: 300,
    showValues: true,
    horizontal: true,
  },
};

/**
 * Example 3: Donut Chart with Total
 */
export const pieChartDonutExample = {
  type: 'PieChart',
  props: generateTestData.pieChart(),
};

/**
 * Example 4: Complete Dashboard Page
 */
export const dashboardPageExample = {
  id: 'analytics-dashboard-example',
  agentId: 'test-agent',
  title: 'Analytics Dashboard',
  version: 1,
  layout: 'single-column',
  status: 'published',
  specification: {
    components: [
      {
        type: 'header',
        props: {
          title: 'Analytics Dashboard',
          level: 1,
          subtitle: 'Real-time performance metrics and insights',
        },
      },
      {
        type: 'Grid',
        props: { cols: 2 },
        children: [
          {
            type: 'stat',
            props: {
              label: 'Total Users',
              value: '10,847',
              change: 12.5,
              icon: '👥',
            },
          },
          {
            type: 'stat',
            props: {
              label: 'Revenue',
              value: '$54,239',
              change: 8.2,
              icon: '💰',
            },
          },
          {
            type: 'stat',
            props: {
              label: 'Conversion Rate',
              value: '3.24%',
              change: -2.1,
              icon: '📊',
            },
          },
          {
            type: 'stat',
            props: {
              label: 'Active Sessions',
              value: '2,456',
              change: 15.8,
              icon: '⚡',
            },
          },
        ],
      },
      {
        type: 'Grid',
        props: { cols: 2 },
        children: [lineChartExample, barChartHorizontalExample],
      },
      pieChartDonutExample,
    ],
  },
  metadata: {
    description: 'Comprehensive analytics dashboard with charts',
    tags: ['analytics', 'dashboard', 'charts'],
  },
};

/**
 * Example 5: Edge Cases and Error Handling
 */
export const edgeCaseExamples = {
  // Empty data - should show "No data available"
  emptyData: {
    type: 'LineChart',
    props: {
      data: [],
      config: {
        title: 'Empty Chart',
      },
    },
  },

  // Single data point
  singlePoint: {
    type: 'BarChart',
    props: {
      data: [{ timestamp: '2025-10-01', value: 100, label: 'Single' }],
      config: {
        title: 'Single Data Point',
      },
    },
  },

  // Large dataset (performance test)
  largeDataset: {
    type: 'LineChart',
    props: {
      data: Array.from({ length: 100 }, (_, i) => ({
        timestamp: `2025-10-${String(i + 1).padStart(2, '0')}`,
        value: Math.floor(Math.random() * 1000) + 500,
        label: `Day ${i + 1}`,
      })),
      config: {
        title: 'Large Dataset (100 points)',
        showGrid: true,
      },
      height: 400,
    },
  },

  // Custom colors
  customColors: {
    type: 'PieChart',
    props: {
      data: [
        { timestamp: 'red', value: 30, label: 'Red' },
        { timestamp: 'green', value: 45, label: 'Green' },
        { timestamp: 'blue', value: 25, label: 'Blue' },
      ],
      config: {
        title: 'Custom Color Palette',
        colors: ['#FF0000', '#00FF00', '#0000FF'],
        showLegend: true,
      },
      donut: false,
    },
  },

  // Metadata usage
  withMetadata: {
    type: 'LineChart',
    props: {
      data: [
        {
          timestamp: '2025-10-01',
          value: 1200,
          label: 'Day 1',
          metadata: { users: 1200, sessions: 3400, bounceRate: 0.42 },
        },
        {
          timestamp: '2025-10-02',
          value: 1350,
          label: 'Day 2',
          metadata: { users: 1350, sessions: 3750, bounceRate: 0.38 },
        },
      ],
      config: {
        title: 'Engagement with Metadata',
      },
    },
  },
};

/**
 * Validation Tests
 */
export function runValidationTests() {
  const tests = [
    {
      name: 'Valid LineChart',
      component: lineChartExample,
      shouldPass: true,
    },
    {
      name: 'Valid BarChart',
      component: barChartHorizontalExample,
      shouldPass: true,
    },
    {
      name: 'Valid PieChart',
      component: pieChartDonutExample,
      shouldPass: true,
    },
    {
      name: 'Missing Title',
      component: {
        type: 'LineChart',
        props: {
          data: [{ timestamp: '2025-10-01', value: 100 }],
          config: {},
        },
      },
      shouldPass: false,
    },
    {
      name: 'Empty Data Array',
      component: {
        type: 'BarChart',
        props: {
          data: [],
          config: { title: 'Test' },
        },
      },
      shouldPass: false,
    },
    {
      name: 'Negative Value in PieChart',
      component: {
        type: 'PieChart',
        props: {
          data: [
            { timestamp: 'a', value: 100 },
            { timestamp: 'b', value: -50 },
          ],
          config: { title: 'Test' },
        },
      },
      shouldPass: false,
    },
    {
      name: 'Invalid Height',
      component: {
        type: 'LineChart',
        props: {
          data: [{ timestamp: '2025-10-01', value: 100 }],
          config: { title: 'Test' },
          height: 50,
        },
      },
      shouldPass: false,
    },
  ];

  const results = tests.map((test) => {
    const result = validateChartComponent(test.component.type, test.component.props);
    const passed = result.valid === test.shouldPass;

    return {
      ...test,
      passed,
      result,
    };
  });

  return results;
}

/**
 * Usage Examples for Page Builder Agent
 */
export const pageBuilderExamples = {
  // Example 1: Simple revenue tracking page
  revenueTracking: {
    title: 'Revenue Tracking',
    components: [
      {
        type: 'header',
        props: { title: 'Monthly Revenue', level: 1 },
      },
      {
        type: 'LineChart',
        props: {
          data: [
            { timestamp: '2025-01', value: 45000, label: 'January' },
            { timestamp: '2025-02', value: 52000, label: 'February' },
            { timestamp: '2025-03', value: 48000, label: 'March' },
            { timestamp: '2025-04', value: 61000, label: 'April' },
            { timestamp: '2025-05', value: 58000, label: 'May' },
            { timestamp: '2025-06', value: 67000, label: 'June' },
          ],
          config: {
            title: 'Revenue Trend',
            xAxis: 'Month',
            yAxis: 'Revenue ($)',
            colors: ['#10B981'],
            showGrid: true,
          },
          height: 400,
          showTrend: true,
          gradient: true,
        },
      },
    ],
  },

  // Example 2: Product comparison page
  productComparison: {
    title: 'Product Performance',
    components: [
      {
        type: 'header',
        props: { title: 'Product Comparison', level: 1 },
      },
      {
        type: 'BarChart',
        props: {
          data: [
            { timestamp: 'product-1', value: 4500, label: 'Premium Plan' },
            { timestamp: 'product-2', value: 8200, label: 'Basic Plan' },
            { timestamp: 'product-3', value: 3100, label: 'Enterprise' },
            { timestamp: 'product-4', value: 6700, label: 'Starter' },
          ],
          config: {
            title: 'Sales by Product',
            xAxis: 'Products',
            yAxis: 'Units Sold',
            colors: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'],
            showGrid: true,
            showLegend: true,
          },
          showValues: true,
        },
      },
    ],
  },

  // Example 3: Market share analysis
  marketShare: {
    title: 'Market Share Analysis',
    components: [
      {
        type: 'header',
        props: { title: 'Market Share Distribution', level: 1 },
      },
      {
        type: 'PieChart',
        props: {
          data: [
            { timestamp: 'company-a', value: 35, label: 'Company A' },
            { timestamp: 'company-b', value: 28, label: 'Company B' },
            { timestamp: 'company-c', value: 18, label: 'Company C' },
            { timestamp: 'company-d', value: 12, label: 'Company D' },
            { timestamp: 'others', value: 7, label: 'Others' },
          ],
          config: {
            title: 'Market Share %',
            colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
            showLegend: true,
          },
          height: 450,
          donut: true,
          showTotal: true,
        },
      },
    ],
  },
};

/**
 * Export all for testing
 */
export default {
  generateTestData,
  validateChartComponent,
  examples: {
    lineChartExample,
    barChartHorizontalExample,
    pieChartDonutExample,
    dashboardPageExample,
    edgeCaseExamples,
    pageBuilderExamples,
  },
  runValidationTests,
};
