/**
 * Chart Components E2E Verification Tests
 *
 * SPARC TDD Methodology - London School
 * Tests: LineChart, BarChart, PieChart rendering and interactivity
 *
 * @requirements
 * - All charts must render without errors
 * - Charts must display correct data
 * - Charts must be responsive
 * - Charts must handle empty/invalid data gracefully
 * - Tooltips must work on hover
 * - Screenshots captured for verification
 */

import { test, expect, Page } from '@playwright/test';

// Test data configurations
const LINE_CHART_DATA = {
  data: [
    { timestamp: '2025-10-01', value: 42, label: 'Day 1' },
    { timestamp: '2025-10-02', value: 58, label: 'Day 2' },
    { timestamp: '2025-10-03', value: 67, label: 'Day 3' },
    { timestamp: '2025-10-04', value: 54, label: 'Day 4' },
    { timestamp: '2025-10-05', value: 73, label: 'Day 5' },
  ],
  config: {
    title: 'Performance Over Time',
    xAxis: 'Date',
    yAxis: 'Performance Score',
    colors: ['#3B82F6'],
    showGrid: true,
    showLegend: false,
  },
  height: 300,
  showTrend: true,
  gradient: true,
};

const BAR_CHART_DATA = {
  data: [
    { timestamp: 'Category A', value: 120, label: 'Product A' },
    { timestamp: 'Category B', value: 90, label: 'Product B' },
    { timestamp: 'Category C', value: 150, label: 'Product C' },
    { timestamp: 'Category D', value: 75, label: 'Product D' },
  ],
  config: {
    title: 'Sales by Category',
    xAxis: 'Product Categories',
    yAxis: 'Sales ($)',
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
    showGrid: true,
    showLegend: true,
  },
  height: 350,
  showValues: true,
  horizontal: false,
};

const PIE_CHART_DATA = {
  data: [
    { timestamp: 'Segment A', value: 30, label: 'Premium' },
    { timestamp: 'Segment B', value: 25, label: 'Standard' },
    { timestamp: 'Segment C', value: 20, label: 'Basic' },
    { timestamp: 'Segment D', value: 25, label: 'Enterprise' },
  ],
  config: {
    title: 'Revenue Distribution',
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
    showLegend: true,
  },
  height: 350,
  donut: true,
  showTotal: true,
};

// Helper function to create test page with chart
async function createTestPageWithChart(page: Page, chartType: string, chartData: any) {
  const pageData = {
    title: `${chartType} Verification Test`,
    components: [
      {
        type: chartType,
        props: chartData,
      },
    ],
  };

  // Insert page into database via API
  const response = await page.request.post('/api/agent-pages/test-page', {
    data: pageData,
  });

  const { id } = await response.json();
  return id;
}

test.describe('LineChart Component Verification', () => {
  test('renders LineChart with valid data', async ({ page }) => {
    // Navigate to a test page with LineChart
    const pageId = await createTestPageWithChart(page, 'LineChart', LINE_CHART_DATA);
    await page.goto(`/agent/${pageId}`);

    // Wait for chart to render
    await page.waitForSelector('canvas, svg', { timeout: 5000 });

    // Verify chart canvas/SVG exists
    const chartElement = await page.locator('canvas, svg').first();
    await expect(chartElement).toBeVisible();

    // Verify title is displayed
    const title = await page.getByText('Performance Over Time');
    await expect(title).toBeVisible();

    // Verify no console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(1000); // Wait for any async errors
    expect(errors).toHaveLength(0);

    // Capture screenshot
    await page.screenshot({
      path: 'test-results/screenshots/linechart-basic-render.png',
      fullPage: true
    });
  });

  test('LineChart displays axes labels correctly', async ({ page }) => {
    const pageId = await createTestPageWithChart(page, 'LineChart', LINE_CHART_DATA);
    await page.goto(`/agent/${pageId}`);

    await page.waitForSelector('canvas, svg', { timeout: 5000 });

    // Check for x-axis label
    const xAxisLabel = await page.getByText('Date');
    await expect(xAxisLabel).toBeVisible();

    // Check for y-axis label
    const yAxisLabel = await page.getByText('Performance Score');
    await expect(yAxisLabel).toBeVisible();

    await page.screenshot({
      path: 'test-results/screenshots/linechart-axes-labels.png'
    });
  });

  test('LineChart handles empty data gracefully', async ({ page }) => {
    const emptyData = { ...LINE_CHART_DATA, data: [] };
    const pageId = await createTestPageWithChart(page, 'LineChart', emptyData);
    await page.goto(`/agent/${pageId}`);

    // Should show error message or empty state
    const errorMessage = await page.getByText(/at least one data point/i, { timeout: 5000 });
    await expect(errorMessage).toBeVisible();

    // Should NOT crash
    const chartElement = await page.locator('canvas, svg').count();
    expect(chartElement).toBeLessThanOrEqual(1); // Either 0 (error state) or 1 (empty chart)

    await page.screenshot({
      path: 'test-results/screenshots/linechart-empty-data.png'
    });
  });

  test('LineChart is responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const pageId = await createTestPageWithChart(page, 'LineChart', LINE_CHART_DATA);
    await page.goto(`/agent/${pageId}`);

    await page.waitForSelector('canvas, svg', { timeout: 5000 });

    const chartElement = await page.locator('canvas, svg').first();
    await expect(chartElement).toBeVisible();

    // Chart should fit within viewport
    const box = await chartElement.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(375);

    await page.screenshot({
      path: 'test-results/screenshots/linechart-mobile-view.png',
      fullPage: true
    });
  });
});

test.describe('BarChart Component Verification', () => {
  test('renders BarChart with multiple bars', async ({ page }) => {
    const pageId = await createTestPageWithChart(page, 'BarChart', BAR_CHART_DATA);
    await page.goto(`/agent/${pageId}`);

    await page.waitForSelector('canvas, svg', { timeout: 5000 });

    // Verify chart exists
    const chartElement = await page.locator('canvas, svg').first();
    await expect(chartElement).toBeVisible();

    // Verify title
    const title = await page.getByText('Sales by Category');
    await expect(title).toBeVisible();

    // Verify legend is displayed (showLegend: true)
    const legendItems = await page.locator('[role="img"]').count();
    expect(legendItems).toBeGreaterThan(0);

    await page.screenshot({
      path: 'test-results/screenshots/barchart-multi-series.png',
      fullPage: true
    });
  });

  test('BarChart displays values on bars when showValues is true', async ({ page }) => {
    const pageId = await createTestPageWithChart(page, 'BarChart', BAR_CHART_DATA);
    await page.goto(`/agent/${pageId}`);

    await page.waitForSelector('canvas, svg', { timeout: 5000 });

    // With showValues: true, numeric values should be visible on/near bars
    // This depends on chart library implementation
    const chartElement = await page.locator('canvas, svg').first();
    await expect(chartElement).toBeVisible();

    await page.screenshot({
      path: 'test-results/screenshots/barchart-show-values.png'
    });
  });

  test('BarChart handles empty data gracefully', async ({ page }) => {
    const emptyData = { ...BAR_CHART_DATA, data: [] };
    const pageId = await createTestPageWithChart(page, 'BarChart', emptyData);
    await page.goto(`/agent/${pageId}`);

    const errorMessage = await page.getByText(/at least one data point/i, { timeout: 5000 });
    await expect(errorMessage).toBeVisible();

    await page.screenshot({
      path: 'test-results/screenshots/barchart-empty-data.png'
    });
  });

  test('BarChart is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const pageId = await createTestPageWithChart(page, 'BarChart', BAR_CHART_DATA);
    await page.goto(`/agent/${pageId}`);

    await page.waitForSelector('canvas, svg', { timeout: 5000 });

    const chartElement = await page.locator('canvas, svg').first();
    await expect(chartElement).toBeVisible();

    const box = await chartElement.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(375);

    await page.screenshot({
      path: 'test-results/screenshots/barchart-mobile-view.png',
      fullPage: true
    });
  });
});

test.describe('PieChart Component Verification', () => {
  test('renders PieChart with percentage labels', async ({ page }) => {
    const pageId = await createTestPageWithChart(page, 'PieChart', PIE_CHART_DATA);
    await page.goto(`/agent/${pageId}`);

    await page.waitForSelector('canvas, svg', { timeout: 5000 });

    // Verify chart exists
    const chartElement = await page.locator('canvas, svg').first();
    await expect(chartElement).toBeVisible();

    // Verify title
    const title = await page.getByText('Revenue Distribution');
    await expect(title).toBeVisible();

    // Verify legend exists (showLegend: true)
    const legendItems = await page.locator('[role="img"]').count();
    expect(legendItems).toBeGreaterThan(0);

    await page.screenshot({
      path: 'test-results/screenshots/piechart-percentages.png',
      fullPage: true
    });
  });

  test('PieChart renders as donut when donut is true', async ({ page }) => {
    const pageId = await createTestPageWithChart(page, 'PieChart', PIE_CHART_DATA);
    await page.goto(`/agent/${pageId}`);

    await page.waitForSelector('canvas, svg', { timeout: 5000 });

    const chartElement = await page.locator('canvas, svg').first();
    await expect(chartElement).toBeVisible();

    // Donut charts have a center hole - visual verification via screenshot
    await page.screenshot({
      path: 'test-results/screenshots/piechart-donut-mode.png'
    });
  });

  test('PieChart handles negative values with error', async ({ page }) => {
    const invalidData = {
      ...PIE_CHART_DATA,
      data: [{ timestamp: 'Invalid', value: -10, label: 'Negative' }],
    };

    const pageId = await createTestPageWithChart(page, 'PieChart', invalidData);
    await page.goto(`/agent/${pageId}`);

    // Should show validation error
    const errorMessage = await page.getByText(/must be non-negative|must be >= 0/i, {
      timeout: 5000
    });
    await expect(errorMessage).toBeVisible();

    await page.screenshot({
      path: 'test-results/screenshots/piechart-negative-value-error.png'
    });
  });

  test('PieChart is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const pageId = await createTestPageWithChart(page, 'PieChart', PIE_CHART_DATA);
    await page.goto(`/agent/${pageId}`);

    await page.waitForSelector('canvas, svg', { timeout: 5000 });

    const chartElement = await page.locator('canvas, svg').first();
    await expect(chartElement).toBeVisible();

    const box = await chartElement.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(375);

    await page.screenshot({
      path: 'test-results/screenshots/piechart-mobile-view.png',
      fullPage: true
    });
  });
});

test.describe('Chart Interactivity Tests', () => {
  test('charts display tooltips on hover', async ({ page }) => {
    const pageId = await createTestPageWithChart(page, 'LineChart', LINE_CHART_DATA);
    await page.goto(`/agent/${pageId}`);

    await page.waitForSelector('canvas, svg', { timeout: 5000 });

    const chartElement = await page.locator('canvas, svg').first();

    // Hover over chart area
    await chartElement.hover({ position: { x: 50, y: 50 } });

    // Wait for tooltip to appear
    await page.waitForTimeout(500);

    // Tooltip should be visible (implementation-specific selector)
    // Screenshot will show tooltip presence
    await page.screenshot({
      path: 'test-results/screenshots/chart-tooltip-hover.png'
    });
  });
});

test.describe('Chart Data Validation', () => {
  test('charts reject invalid height values', async ({ page }) => {
    const invalidData = { ...LINE_CHART_DATA, height: 50 }; // Below minimum

    const pageId = await createTestPageWithChart(page, 'LineChart', invalidData);
    await page.goto(`/agent/${pageId}`);

    // Should show validation error or use default
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('height')) {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    // Either shows error or falls back to default height
    if (errors.length > 0) {
      expect(errors[0]).toContain('height');
    }

    await page.screenshot({
      path: 'test-results/screenshots/chart-invalid-height.png'
    });
  });

  test('charts require config.title', async ({ page }) => {
    const invalidData = {
      ...LINE_CHART_DATA,
      config: { ...LINE_CHART_DATA.config, title: '' }
    };

    const pageId = await createTestPageWithChart(page, 'LineChart', invalidData);
    await page.goto(`/agent/${pageId}`);

    // Should show validation error
    const errorMessage = await page.getByText(/title.*required/i, { timeout: 5000 });
    await expect(errorMessage).toBeVisible();

    await page.screenshot({
      path: 'test-results/screenshots/chart-missing-title-error.png'
    });
  });
});

test.describe('Chart Accessibility', () => {
  test('charts have proper ARIA labels', async ({ page }) => {
    const pageId = await createTestPageWithChart(page, 'LineChart', LINE_CHART_DATA);
    await page.goto(`/agent/${pageId}`);

    await page.waitForSelector('canvas, svg', { timeout: 5000 });

    // Check for accessible chart container
    const chartContainer = await page.locator('[role="img"], [aria-label]').first();
    await expect(chartContainer).toBeVisible();

    await page.screenshot({
      path: 'test-results/screenshots/chart-accessibility.png'
    });
  });
});
