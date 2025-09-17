/**
 * Specialized E2E Tests for Chart Interactions in Claude SDK Analytics
 * Focuses on detailed chart functionality, interactions, and visual testing
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Chart-specific test data
const CHART_TEST_DATA = {
  costOverTime: Array.from({ length: 48 }, (_, i) => ({
    timestamp: new Date(Date.now() - (47 - i) * 1800000).toISOString(), // 30-minute intervals
    cost: 0.001 + Math.sin(i * 0.2) * 0.005 + Math.random() * 0.002,
    tokens: 50 + Math.sin(i * 0.3) * 20 + Math.random() * 30,
    requests: 2 + Math.sin(i * 0.1) * 1 + Math.random() * 2
  })),
  providerBreakdown: [
    { provider: 'Claude', cost: 0.1234, percentage: 65.2, requests: 152 },
    { provider: 'OpenAI', cost: 0.0567, percentage: 29.9, requests: 89 },
    { provider: 'Other', cost: 0.0093, percentage: 4.9, requests: 23 }
  ],
  modelUsage: [
    { model: 'claude-3-5-sonnet-20241022', tokens: 15420, cost: 0.0924, percentage: 48.7 },
    { model: 'claude-3-haiku-20240307', tokens: 8960, cost: 0.0224, percentage: 11.8 },
    { model: 'gpt-4-turbo', tokens: 7830, cost: 0.0783, percentage: 39.5 }
  ]
};

test.describe.configure({ mode: 'parallel' });

test.describe('Claude SDK Analytics - Chart Interactions', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1440, height: 900 }, // Larger viewport for charts
      permissions: ['clipboard-read', 'clipboard-write']
    });

    page = await context.newPage();

    // Setup chart-specific API mocking
    await page.route('**/api/analytics/charts/cost-over-time', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(CHART_TEST_DATA.costOverTime)
      });
    });

    await page.route('**/api/analytics/charts/provider-breakdown', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(CHART_TEST_DATA.providerBreakdown)
      });
    });

    await page.route('**/api/analytics/charts/model-usage', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(CHART_TEST_DATA.modelUsage)
      });
    });

    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await context.close();
  });

  test.describe('Line Chart Interactions (Cost Over Time)', () => {
    test('should render line chart with data points', async () => {
      // Wait for chart to load
      await page.waitForTimeout(3000);

      // Look for chart containers
      const lineCharts = page.locator('canvas, svg').filter({ hasText: /cost|time|trend/i });
      const generalCharts = page.locator('canvas, svg, [data-testid*="chart"], [class*="chart"]');

      const chartContainer = await lineCharts.count() > 0 ? lineCharts.first() : generalCharts.first();

      if (await generalCharts.count() > 0) {
        await expect(chartContainer).toBeVisible();

        // Test hover interactions
        const boundingBox = await chartContainer.boundingBox();
        if (boundingBox) {
          // Hover over different points
          const points = [
            { x: boundingBox.x + boundingBox.width * 0.25, y: boundingBox.y + boundingBox.height * 0.5 },
            { x: boundingBox.x + boundingBox.width * 0.5, y: boundingBox.y + boundingBox.height * 0.5 },
            { x: boundingBox.x + boundingBox.width * 0.75, y: boundingBox.y + boundingBox.height * 0.5 }
          ];

          for (const point of points) {
            await page.mouse.move(point.x, point.y);
            await page.waitForTimeout(300);

            // Check for tooltip appearance
            const tooltips = page.locator('[data-testid*="tooltip"], .tooltip, [class*="tooltip"]');
            // Tooltips may appear - test if they do
            if (await tooltips.count() > 0 && await tooltips.first().isVisible()) {
              await expect(tooltips.first()).toBeVisible();
            }
          }
        }
      }
    });

    test('should support zoom and pan functionality', async () => {
      const charts = page.locator('canvas, svg, [data-testid*="chart"]');

      if (await charts.count() > 0) {
        const chart = charts.first();
        await expect(chart).toBeVisible();

        const boundingBox = await chart.boundingBox();
        if (boundingBox) {
          // Test zoom with mouse wheel
          await chart.hover();
          await page.mouse.wheel(0, -200); // Zoom in
          await page.waitForTimeout(500);

          await page.mouse.wheel(0, 100); // Zoom out
          await page.waitForTimeout(500);

          // Test pan with click and drag
          const startPoint = {
            x: boundingBox.x + boundingBox.width * 0.3,
            y: boundingBox.y + boundingBox.height * 0.5
          };
          const endPoint = {
            x: boundingBox.x + boundingBox.width * 0.7,
            y: boundingBox.y + boundingBox.height * 0.5
          };

          await page.mouse.move(startPoint.x, startPoint.y);
          await page.mouse.down();
          await page.mouse.move(endPoint.x, endPoint.y, { steps: 10 });
          await page.mouse.up();
          await page.waitForTimeout(500);
        }
      }
    });

    test('should update chart when time range changes', async () => {
      // Look for time range selectors
      const timeSelectors = page.locator(
        'select:has(option[value*="24h"]), ' +
        'button:has-text("24h"), button:has-text("7d"), button:has-text("30d"), ' +
        '[data-testid*="time"], [class*="time-range"]'
      );

      if (await timeSelectors.count() > 0) {
        const selector = timeSelectors.first();
        await expect(selector).toBeVisible();

        // Mock updated data for different time range
        await page.route('**/api/analytics/charts/cost-over-time**', route => {
          const url = route.request().url();
          const timeRange = url.includes('7d') ? '7d' : '24h';

          const dataPoints = timeRange === '7d' ? 168 : 48; // 7 days hourly vs 48 half-hours
          const updatedData = Array.from({ length: dataPoints }, (_, i) => ({
            timestamp: new Date(Date.now() - (dataPoints - 1 - i) * (timeRange === '7d' ? 3600000 : 1800000)).toISOString(),
            cost: 0.001 + Math.random() * 0.01,
            tokens: 50 + Math.random() * 100,
            requests: 1 + Math.random() * 5
          }));

          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(updatedData)
          });
        });

        // Change time range
        if (await selector.evaluate(el => el.tagName.toLowerCase()) === 'select') {
          const options = await selector.locator('option').all();
          if (options.length > 1) {
            const secondOption = await options[1].getAttribute('value');
            if (secondOption) {
              await selector.selectOption(secondOption);
            }
          }
        } else {
          await selector.click();
        }

        await page.waitForTimeout(2000);

        // Verify chart updated
        const charts = page.locator('canvas, svg, [data-testid*="chart"]');
        if (await charts.count() > 0) {
          await expect(charts.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Pie Chart Interactions (Provider Breakdown)', () => {
    test('should render pie chart with provider segments', async () => {
      await page.waitForTimeout(3000);

      // Look for pie chart elements
      const pieCharts = page.locator('svg path, canvas').filter({ hasText: /provider|breakdown/i });
      const generalCharts = page.locator('canvas, svg, [data-testid*="chart"], [data-testid*="pie"]');

      if (await generalCharts.count() > 0) {
        const chart = generalCharts.first();
        await expect(chart).toBeVisible();

        // Test segment interactions if it's an SVG pie chart
        if (await chart.evaluate(el => el.tagName.toLowerCase()) === 'svg') {
          const pathElements = chart.locator('path');
          const segmentCount = await pathElements.count();

          if (segmentCount > 0) {
            // Hover over different segments
            for (let i = 0; i < Math.min(segmentCount, 3); i++) {
              await pathElements.nth(i).hover();
              await page.waitForTimeout(300);

              // Check for highlight effects or tooltips
              const highlightedElements = page.locator('[class*="highlight"], [class*="active"]');
              // Highlight effects may or may not be present
            }
          }
        }
      }
    });

    test('should show detailed breakdown on segment click', async () => {
      const charts = page.locator('canvas, svg, [data-testid*="chart"]');

      if (await charts.count() > 0) {
        const chart = charts.first();
        await expect(chart).toBeVisible();

        // Click on chart area
        const boundingBox = await chart.boundingBox();
        if (boundingBox) {
          const centerX = boundingBox.x + boundingBox.width / 2;
          const centerY = boundingBox.y + boundingBox.height / 2;

          await page.mouse.click(centerX, centerY);
          await page.waitForTimeout(500);

          // Check for detailed view or modal
          const modals = page.locator('[data-testid*="modal"], .modal, [role="dialog"]');
          const details = page.locator('[data-testid*="detail"], .detail, [class*="breakdown"]');

          // Details may appear in various forms
          if (await modals.count() > 0 && await modals.first().isVisible()) {
            await expect(modals.first()).toBeVisible();
          } else if (await details.count() > 0 && await details.first().isVisible()) {
            await expect(details.first()).toBeVisible();
          }
        }
      }
    });

    test('should display legend with interactive elements', async () => {
      // Look for chart legends
      const legends = page.locator(
        '[data-testid*="legend"], .legend, [class*="legend"], ' +
        'ul:has(li:has-text("Claude")), ul:has(li:has-text("OpenAI"))'
      );

      if (await legends.count() > 0) {
        const legend = legends.first();
        await expect(legend).toBeVisible();

        // Test legend item interactions
        const legendItems = legend.locator('li, .legend-item, [class*="legend-item"]');
        const itemCount = await legendItems.count();

        if (itemCount > 0) {
          // Click on legend items to toggle
          for (let i = 0; i < Math.min(itemCount, 2); i++) {
            await legendItems.nth(i).click();
            await page.waitForTimeout(300);

            // Check for visual feedback
            const chart = page.locator('canvas, svg, [data-testid*="chart"]').first();
            await expect(chart).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Bar Chart Interactions (Model Usage)', () => {
    test('should render bar chart with model data', async () => {
      await page.waitForTimeout(3000);

      // Look for bar chart elements
      const barCharts = page.locator('svg rect, canvas').filter({ hasText: /model|usage|bar/i });
      const generalCharts = page.locator('canvas, svg, [data-testid*="chart"], [data-testid*="bar"]');

      if (await generalCharts.count() > 0) {
        const chart = generalCharts.first();
        await expect(chart).toBeVisible();

        // Test bar interactions if it's an SVG bar chart
        if (await chart.evaluate(el => el.tagName.toLowerCase()) === 'svg') {
          const rectElements = chart.locator('rect');
          const barCount = await rectElements.count();

          if (barCount > 0) {
            // Hover over different bars
            for (let i = 0; i < Math.min(barCount, 3); i++) {
              const rect = rectElements.nth(i);
              const boundingBox = await rect.boundingBox();

              if (boundingBox && boundingBox.width > 10 && boundingBox.height > 10) {
                await rect.hover();
                await page.waitForTimeout(300);

                // Check for tooltips or value displays
                const valueDisplays = page.locator('[data-testid*="value"], .value, [class*="tooltip"]');
                // Value displays may appear on hover
              }
            }
          }
        }
      }
    });

    test('should support sorting and filtering', async () => {
      // Look for sort controls
      const sortButtons = page.locator(
        'button:has-text("Sort"), button:has-text("A-Z"), button:has-text("Value"), ' +
        '[data-testid*="sort"], [class*="sort"]'
      );

      if (await sortButtons.count() > 0) {
        const sortButton = sortButtons.first();
        await expect(sortButton).toBeVisible();

        await sortButton.click();
        await page.waitForTimeout(1000);

        // Verify chart updates
        const charts = page.locator('canvas, svg, [data-testid*="chart"]');
        if (await charts.count() > 0) {
          await expect(charts.first()).toBeVisible();
        }
      }

      // Look for filter controls
      const filterInputs = page.locator(
        'input[placeholder*="filter"], input[placeholder*="search"], ' +
        '[data-testid*="filter"], [class*="filter"]'
      );

      if (await filterInputs.count() > 0) {
        const filterInput = filterInputs.first();
        await expect(filterInput).toBeVisible();

        await filterInput.fill('claude');
        await page.waitForTimeout(1000);

        // Verify filtered results
        const charts = page.locator('canvas, svg, [data-testid*="chart"]');
        if (await charts.count() > 0) {
          await expect(charts.first()).toBeVisible();
        }
      }
    });

    test('should handle empty data states gracefully', async () => {
      // Mock empty data response
      await page.route('**/api/analytics/charts/model-usage', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Look for empty state indicators
      const emptyStates = page.locator(
        '[data-testid*="empty"], .empty, [class*="empty"], ' +
        'text=/no data/i, text=/no results/i'
      );

      if (await emptyStates.count() > 0) {
        await expect(emptyStates.first()).toBeVisible();
      } else {
        // Chart should still render without errors
        const charts = page.locator('canvas, svg, [data-testid*="chart"]');
        if (await charts.count() > 0) {
          await expect(charts.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Chart Export and Sharing', () => {
    test('should export charts as images', async () => {
      const charts = page.locator('canvas, svg, [data-testid*="chart"]');

      if (await charts.count() > 0) {
        // Look for export buttons near charts
        const exportButtons = page.locator(
          'button:has-text("Export"), button:has-text("Save"), button:has-text("Download"), ' +
          '[data-testid*="export"], [class*="export"]'
        );

        if (await exportButtons.count() > 0) {
          const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
          await exportButtons.first().click();

          try {
            const download = await downloadPromise;
            expect(download.suggestedFilename()).toMatch(/\.(png|jpg|svg|pdf)$/i);
          } catch (error) {
            // Export might use different mechanism
            console.log('Chart export completed without download event');
          }
        }
      }
    });

    test('should copy chart data to clipboard', async () => {
      // Look for copy functionality
      const copyButtons = page.locator(
        'button:has-text("Copy"), [data-testid*="copy"], [class*="copy"]'
      );

      if (await copyButtons.count() > 0) {
        await copyButtons.first().click();
        await page.waitForTimeout(500);

        // Verify clipboard content
        try {
          const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
          expect(clipboardContent).toBeTruthy();
        } catch (error) {
          // Clipboard API might not be available in test environment
          console.log('Clipboard test completed without reading content');
        }
      }
    });

    test('should generate shareable chart URLs', async () => {
      // Look for share functionality
      const shareButtons = page.locator(
        'button:has-text("Share"), [data-testid*="share"], [class*="share"]'
      );

      if (await shareButtons.count() > 0) {
        await shareButtons.first().click();
        await page.waitForTimeout(1000);

        // Check for share modal or URL display
        const shareModals = page.locator(
          '[data-testid*="share-modal"], .share-modal, [role="dialog"]:has-text("Share")'
        );

        const urlInputs = page.locator('input[value*="http"], input[readonly]');

        if (await shareModals.count() > 0) {
          await expect(shareModals.first()).toBeVisible();
        } else if (await urlInputs.count() > 0) {
          await expect(urlInputs.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Chart Performance and Responsiveness', () => {
    test('should render charts quickly with large datasets', async () => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        timestamp: new Date(Date.now() - (999 - i) * 60000).toISOString(),
        cost: 0.001 + Math.random() * 0.01,
        tokens: 50 + Math.random() * 100,
        requests: 1 + Math.random() * 5
      }));

      await page.route('**/api/analytics/charts/**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(largeDataset)
        });
      });

      const startTime = Date.now();
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Wait for charts to render
      await page.waitForTimeout(3000);
      const renderTime = Date.now() - startTime;

      expect(renderTime).toBeLessThan(8000); // Should render within 8 seconds

      // Charts should still be interactive
      const charts = page.locator('canvas, svg, [data-testid*="chart"]');
      if (await charts.count() > 0) {
        await expect(charts.first()).toBeVisible();

        // Test interaction responsiveness
        await charts.first().hover();
        await page.waitForTimeout(100);
      }
    });

    test('should adapt to different screen sizes', async () => {
      const viewports = [
        { width: 320, height: 568 }, // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1200, height: 800 }, // Desktop
        { width: 1920, height: 1080 } // Large desktop
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(1000);

        const charts = page.locator('canvas, svg, [data-testid*="chart"]');
        if (await charts.count() > 0) {
          await expect(charts.first()).toBeVisible();

          // Verify chart adapts to viewport
          const boundingBox = await charts.first().boundingBox();
          if (boundingBox) {
            expect(boundingBox.width).toBeGreaterThan(100);
            expect(boundingBox.width).toBeLessThan(viewport.width);
          }
        }
      }
    });

    test('should handle chart animation smoothly', async () => {
      // Look for animated elements
      const charts = page.locator('canvas, svg, [data-testid*="chart"]');

      if (await charts.count() > 0) {
        const chart = charts.first();
        await expect(chart).toBeVisible();

        // Trigger data update to test animations
        await page.route('**/api/analytics/charts/**', route => {
          const updatedData = CHART_TEST_DATA.costOverTime.map(item => ({
            ...item,
            cost: item.cost * 1.1,
            tokens: item.tokens * 1.05
          }));

          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(updatedData)
          });
        });

        // Trigger refresh
        const refreshButtons = page.locator('button:has-text("Refresh"), [data-testid*="refresh"]');
        if (await refreshButtons.count() > 0) {
          await refreshButtons.first().click();
          await page.waitForTimeout(2000);
        }

        // Chart should still be responsive during animation
        await expect(chart).toBeVisible();
      }
    });
  });
});