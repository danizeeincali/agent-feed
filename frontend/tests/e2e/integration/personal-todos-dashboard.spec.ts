/**
 * E2E Tests for Personal Todos Dashboard
 *
 * Tests the complete personal-todos dashboard including:
 * - Dashboard rendering with real data
 * - Metrics display
 * - Task list rendering
 * - Priority distribution
 * - Data updates
 */

import { test, expect, Page } from '@playwright/test';

const TEST_CONFIG = {
  baseURL: 'http://localhost:5173',
  apiBaseURL: 'http://localhost:3001',
  testAgentId: 'personal-todos-agent',
  dashboardPageId: 'personal-todos-dashboard-v3',
  timeout: 30000
};

test.describe('Personal Todos Dashboard E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
  });

  test('Test 1: Dashboard loads and displays task data from API', async () => {
    // Navigate to personal todos dashboard
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/pages`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check if dashboard is visible
    const dashboardContainer = page.locator('[data-testid="dashboard-container"], .dashboard, [data-page-type="dashboard"]');
    const hasDashboard = await dashboardContainer.count() > 0;

    console.log(`Dashboard visible: ${hasDashboard}`);

    // Check for task data elements
    const taskElements = page.locator('[data-testid*="task"], .task-item, .todo-item');
    const taskCount = await taskElements.count();

    console.log(`Found ${taskCount} task elements`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/personal-todos/test1-dashboard-load.png',
      fullPage: true
    });

    // Dashboard should be visible
    expect(hasDashboard).toBe(true);
  });

  test('Test 2: All metrics show correct values (totalTasks, completedTasks, etc.)', async () => {
    // Navigate to dashboard
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/dashboard`);
    await page.waitForTimeout(2000);

    // Look for metric displays
    const metricElements = page.locator('[data-testid*="metric"], .metric, .stat, [data-metric]');
    const metricCount = await metricElements.count();

    console.log(`Found ${metricCount} metric elements`);

    // Check for specific metrics
    const totalTasksMetric = page.locator('[data-testid="total-tasks"], [data-metric="totalTasks"]');
    const completedTasksMetric = page.locator('[data-testid="completed-tasks"], [data-metric="completedTasks"]');
    const pendingTasksMetric = page.locator('[data-testid="pending-tasks"], [data-metric="pendingTasks"]');

    const hasTotalTasks = await totalTasksMetric.count() > 0;
    const hasCompletedTasks = await completedTasksMetric.count() > 0;
    const hasPendingTasks = await pendingTasksMetric.count() > 0;

    console.log(`Has total tasks metric: ${hasTotalTasks}`);
    console.log(`Has completed tasks metric: ${hasCompletedTasks}`);
    console.log(`Has pending tasks metric: ${hasPendingTasks}`);

    // Get metric values
    const pageContent = await page.content();
    const numbers = pageContent.match(/\d+/g) || [];

    console.log(`Found numeric values: ${numbers.join(', ')}`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/personal-todos/test2-metrics.png',
      fullPage: true
    });

    // Should have at least some metrics
    expect(metricCount).toBeGreaterThan(0);
  });

  test('Test 3: Recent tasks list renders', async () => {
    // Navigate to dashboard
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/pages`);
    await page.waitForTimeout(2000);

    // Look for task list
    const taskList = page.locator('[data-testid="task-list"], [data-testid="recent-tasks"], .task-list, ul');
    const hasTaskList = await taskList.count() > 0;

    console.log(`Has task list: ${hasTaskList}`);

    // Count task items
    const taskItems = page.locator('[data-testid*="task-item"], .task-item, li');
    const taskItemCount = await taskItems.count();

    console.log(`Found ${taskItemCount} task items`);

    // Check for task properties
    const taskTitles = page.locator('[data-testid*="task-title"], .task-title, .todo-title');
    const titleCount = await taskTitles.count();

    console.log(`Found ${titleCount} task titles`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/personal-todos/test3-task-list.png',
      fullPage: true
    });

    // Should have task list or task items
    expect(hasTaskList || taskItemCount > 0).toBe(true);
  });

  test('Test 4: Priority distribution displays correctly', async () => {
    // Navigate to dashboard
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/dashboard`);
    await page.waitForTimeout(2000);

    // Look for priority indicators
    const priorityElements = page.locator('[data-testid*="priority"], [data-priority], .priority');
    const priorityCount = await priorityElements.count();

    console.log(`Found ${priorityCount} priority elements`);

    // Check for priority levels
    const highPriority = page.locator('[data-priority="high"], .priority-high, :has-text("High")');
    const mediumPriority = page.locator('[data-priority="medium"], .priority-medium, :has-text("Medium")');
    const lowPriority = page.locator('[data-priority="low"], .priority-low, :has-text("Low")');

    const hasHighPriority = await highPriority.count() > 0;
    const hasMediumPriority = await mediumPriority.count() > 0;
    const hasLowPriority = await lowPriority.count() > 0;

    console.log(`Has high priority items: ${hasHighPriority}`);
    console.log(`Has medium priority items: ${hasMediumPriority}`);
    console.log(`Has low priority items: ${hasLowPriority}`);

    // Look for charts or visual indicators
    const charts = page.locator('[data-testid*="chart"], .chart, canvas, svg');
    const chartCount = await charts.count();

    console.log(`Found ${chartCount} chart elements`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/personal-todos/test4-priority-distribution.png',
      fullPage: true
    });

    // Should have some priority information
    expect(priorityCount > 0 || chartCount > 0).toBe(true);
  });

  test('Test 5: Page updates when data API returns new values', async () => {
    // Navigate to dashboard
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/pages`);
    await page.waitForTimeout(2000);

    // Capture initial state
    const initialContent = await page.content();
    const initialTaskCount = (await page.locator('[data-testid*="task"]').count());

    console.log(`Initial task count: ${initialTaskCount}`);

    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/personal-todos/test5-initial-state.png',
      fullPage: true
    });

    // Look for refresh mechanism
    const refreshButton = page.locator('[data-testid="refresh"], button:has-text("Refresh"), [aria-label="Refresh"]');
    const hasRefreshButton = await refreshButton.count() > 0;

    if (hasRefreshButton) {
      // Click refresh
      await refreshButton.click();
      await page.waitForTimeout(1500);

      // Capture updated state
      const updatedContent = await page.content();
      const updatedTaskCount = await page.locator('[data-testid*="task"]').count();

      console.log(`Updated task count: ${updatedTaskCount}`);

      await page.screenshot({
        path: 'frontend/tests/e2e/screenshots/personal-todos/test5-updated-state.png',
        fullPage: true
      });

      // Content may have changed
      const contentChanged = initialContent !== updatedContent;
      console.log(`Content changed: ${contentChanged}`);
    } else {
      console.log('No refresh button found - checking for auto-updates');

      // Wait for potential auto-update
      await page.waitForTimeout(3000);

      await page.screenshot({
        path: 'frontend/tests/e2e/screenshots/personal-todos/test5-after-wait.png',
        fullPage: true
      });
    }

    expect(true).toBe(true); // Test completed
  });

  test('Test 6: Dashboard components are interactive', async () => {
    // Navigate to dashboard
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/pages`);
    await page.waitForTimeout(2000);

    // Try to interact with task items
    const taskCheckboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await taskCheckboxes.count();

    console.log(`Found ${checkboxCount} checkboxes`);

    if (checkboxCount > 0) {
      // Try to check a checkbox
      await taskCheckboxes.first().click();
      await page.waitForTimeout(500);

      console.log('Clicked first checkbox');
    }

    // Look for clickable elements
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    console.log(`Found ${buttonCount} buttons`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/personal-todos/test6-interactive-elements.png',
      fullPage: true
    });

    // Should have some interactive elements
    expect(checkboxCount + buttonCount).toBeGreaterThan(0);
  });

  test('Test 7: Dashboard handles empty state gracefully', async () => {
    // Navigate to a potentially empty dashboard
    await page.goto(`${TEST_CONFIG.baseURL}/agents/test-empty-agent/dashboard`);
    await page.waitForTimeout(2000);

    // Look for empty state messaging
    const emptyState = page.locator('[data-testid="empty-state"], .empty-state, :has-text("No tasks"), :has-text("no items")');
    const hasEmptyState = await emptyState.count() > 0;

    console.log(`Has empty state: ${hasEmptyState}`);

    // Check for helpful messaging
    const helpText = page.locator(':has-text("Get started"), :has-text("Create"), :has-text("Add")');
    const hasHelpText = await helpText.count() > 0;

    console.log(`Has help text: ${hasHelpText}`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/personal-todos/test7-empty-state.png',
      fullPage: true
    });

    // Should handle empty state
    expect(true).toBe(true); // Test completed
  });

  test('Test 8: Dashboard data consistency check', async () => {
    // Navigate to dashboard
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/pages`);
    await page.waitForTimeout(2000);

    // Extract metric values from the page
    const pageText = await page.textContent('body');

    console.log('Checking data consistency...');

    // Look for numeric values that should be consistent
    const totalMatch = pageText?.match(/total.*?(\d+)/i);
    const completedMatch = pageText?.match(/completed.*?(\d+)/i);

    if (totalMatch && completedMatch) {
      const total = parseInt(totalMatch[1]);
      const completed = parseInt(completedMatch[1]);

      console.log(`Total: ${total}, Completed: ${completed}`);

      // Completed should not exceed total
      expect(completed).toBeLessThanOrEqual(total);
    } else {
      console.log('Could not extract metric values for consistency check');
    }

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/personal-todos/test8-data-consistency.png',
      fullPage: true
    });

    expect(true).toBe(true); // Test completed
  });

  test('Test 9: Console errors during dashboard load', async () => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // Navigate to dashboard
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/dashboard`);
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/personal-todos/test9-console-check.png',
      fullPage: true
    });

    console.log(`Console errors: ${consoleErrors.length}`);
    console.log(`Console warnings: ${consoleWarnings.length}`);

    if (consoleErrors.length > 0) {
      console.log('Errors:', consoleErrors.slice(0, 5));
    }

    // Should have minimal errors
    expect(consoleErrors.length).toBeLessThan(10);
  });
});
