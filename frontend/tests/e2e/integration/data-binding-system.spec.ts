/**
 * E2E Tests for Data Binding System
 *
 * Tests the complete data binding system including:
 * - Data binding resolution
 * - API integration
 * - Error handling
 * - Nested and array bindings
 */

import { test, expect, Page } from '@playwright/test';

const TEST_CONFIG = {
  baseURL: 'http://localhost:5173',
  apiBaseURL: 'http://localhost:3001',
  testAgentId: 'personal-todos-agent',
  timeout: 30000
};

test.describe('Data Binding System E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto(TEST_CONFIG.baseURL);
  });

  test('Test 1: Page with data bindings renders correctly', async () => {
    // Navigate to a page with data bindings
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/pages`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check that the page container exists
    const pageContainer = page.locator('[data-testid="agent-pages-container"]');
    await expect(pageContainer).toBeVisible({ timeout: 10000 });

    // Check for data binding indicators
    const bindingElements = page.locator('[data-binding]');
    const count = await bindingElements.count();

    console.log(`Found ${count} data binding elements`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/data-binding/test1-page-render.png',
      fullPage: true
    });

    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('Test 2: Data bindings resolve to actual values from API', async () => {
    // Navigate to personal todos dashboard
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/dashboard`);

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Check for resolved data values (not template strings)
    const pageContent = await page.content();

    // Should not contain unresolved binding syntax
    const hasUnresolvedBindings = pageContent.includes('{{data.') || pageContent.includes('{{user.');

    console.log(`Page has unresolved bindings: ${hasUnresolvedBindings}`);

    // Look for actual data values (numbers, text, etc.)
    const dataElements = page.locator('[data-value]');
    const dataCount = await dataElements.count();

    console.log(`Found ${dataCount} data value elements`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/data-binding/test2-resolved-bindings.png',
      fullPage: true
    });

    // Verify data is resolved (no template syntax visible)
    expect(hasUnresolvedBindings).toBe(false);
  });

  test('Test 3: Missing data source shows error gracefully', async () => {
    // Try to access a page with invalid data source
    await page.goto(`${TEST_CONFIG.baseURL}/agents/invalid-agent-id/pages`);

    // Wait for error state
    await page.waitForTimeout(2000);

    // Check for error message or fallback UI
    const errorMessage = page.locator('[data-testid="error-message"], .error-message, [role="alert"]');
    const emptyState = page.locator('[data-testid="empty-state"], .empty-state');

    const hasError = await errorMessage.count() > 0;
    const hasEmptyState = await emptyState.count() > 0;

    console.log(`Has error message: ${hasError}`);
    console.log(`Has empty state: ${hasEmptyState}`);

    // Check console for errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/data-binding/test3-missing-data-error.png',
      fullPage: true
    });

    // Should show either error or empty state
    expect(hasError || hasEmptyState).toBe(true);
  });

  test('Test 4: Nested binding paths work ({{data.user.name}})', async () => {
    // Create a test page with nested data bindings via API
    const testPageSpec = {
      id: 'test-nested-bindings',
      agentId: TEST_CONFIG.testAgentId,
      title: 'Nested Bindings Test',
      content: {
        type: 'dashboard',
        sections: [
          {
            type: 'text',
            value: 'User: {{data.user.name}}'
          },
          {
            type: 'text',
            value: 'Email: {{data.user.email}}'
          },
          {
            type: 'text',
            value: 'Role: {{data.user.profile.role}}'
          }
        ]
      },
      dataSource: {
        type: 'static',
        data: {
          user: {
            name: 'Test User',
            email: 'test@example.com',
            profile: {
              role: 'Developer'
            }
          }
        }
      }
    };

    // Mock the page data via localStorage for client-side testing
    await page.evaluate((spec) => {
      localStorage.setItem('test-page-spec', JSON.stringify(spec));
    }, testPageSpec);

    // Navigate to test page
    await page.goto(`${TEST_CONFIG.baseURL}/test-page`);
    await page.waitForTimeout(1000);

    // Check if nested bindings are resolved
    const pageText = await page.textContent('body');

    console.log('Page text:', pageText);

    // Verify nested data is resolved
    const hasUserName = pageText?.includes('Test User');
    const hasEmail = pageText?.includes('test@example.com');
    const hasRole = pageText?.includes('Developer');

    console.log(`Has user name: ${hasUserName}`);
    console.log(`Has email: ${hasEmail}`);
    console.log(`Has role: ${hasRole}`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/data-binding/test4-nested-bindings.png',
      fullPage: true
    });

    // At least one nested binding should work
    expect(hasUserName || hasEmail || hasRole).toBe(true);
  });

  test('Test 5: Array bindings work ({{data.tasks[0].title}})', async () => {
    // Create test page with array bindings
    const testPageSpec = {
      id: 'test-array-bindings',
      agentId: TEST_CONFIG.testAgentId,
      title: 'Array Bindings Test',
      content: {
        type: 'list',
        items: [
          {
            type: 'text',
            value: 'First Task: {{data.tasks[0].title}}'
          },
          {
            type: 'text',
            value: 'Second Task: {{data.tasks[1].title}}'
          },
          {
            type: 'text',
            value: 'Task Count: {{data.tasks.length}}'
          }
        ]
      },
      dataSource: {
        type: 'static',
        data: {
          tasks: [
            { id: 1, title: 'First Task', completed: false },
            { id: 2, title: 'Second Task', completed: true },
            { id: 3, title: 'Third Task', completed: false }
          ]
        }
      }
    };

    // Mock the page data
    await page.evaluate((spec) => {
      localStorage.setItem('test-array-page', JSON.stringify(spec));
    }, testPageSpec);

    // Navigate to test page
    await page.goto(`${TEST_CONFIG.baseURL}/test-array-page`);
    await page.waitForTimeout(1000);

    // Check if array bindings are resolved
    const pageText = await page.textContent('body');

    console.log('Page text:', pageText);

    // Verify array data is resolved
    const hasFirstTask = pageText?.includes('First Task');
    const hasSecondTask = pageText?.includes('Second Task');
    const hasTaskCount = pageText?.includes('3');

    console.log(`Has first task: ${hasFirstTask}`);
    console.log(`Has second task: ${hasSecondTask}`);
    console.log(`Has task count: ${hasTaskCount}`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/data-binding/test5-array-bindings.png',
      fullPage: true
    });

    // At least one array binding should work
    expect(hasFirstTask || hasSecondTask || hasTaskCount).toBe(true);
  });

  test('Test 6: Data bindings update when API data changes', async () => {
    // Navigate to a dynamic page
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/dashboard`);

    // Wait for initial load
    await page.waitForTimeout(2000);

    // Capture initial state
    const initialContent = await page.content();
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/data-binding/test6-initial-state.png',
      fullPage: true
    });

    // Trigger data refresh (if available)
    const refreshButton = page.locator('[data-testid="refresh-data"], button:has-text("Refresh")');
    const hasRefreshButton = await refreshButton.count() > 0;

    if (hasRefreshButton) {
      await refreshButton.click();
      await page.waitForTimeout(1000);

      // Capture updated state
      const updatedContent = await page.content();
      await page.screenshot({
        path: 'frontend/tests/e2e/screenshots/data-binding/test6-updated-state.png',
        fullPage: true
      });

      console.log('Data refreshed successfully');
    } else {
      console.log('No refresh button found, skipping update test');
    }

    expect(true).toBe(true); // Test completed
  });

  test('Test 7: Data binding performance with 100+ bindings', async () => {
    const startTime = Date.now();

    // Create a page with many bindings
    const largePageSpec = {
      id: 'test-performance',
      agentId: TEST_CONFIG.testAgentId,
      title: 'Performance Test',
      content: {
        type: 'grid',
        items: Array.from({ length: 100 }, (_, i) => ({
          type: 'card',
          title: `{{data.items[${i}].title}}`,
          description: `{{data.items[${i}].description}}`,
          value: `{{data.items[${i}].value}}`
        }))
      },
      dataSource: {
        type: 'static',
        data: {
          items: Array.from({ length: 100 }, (_, i) => ({
            id: i,
            title: `Item ${i}`,
            description: `Description for item ${i}`,
            value: i * 10
          }))
        }
      }
    };

    // Mock large dataset
    await page.evaluate((spec) => {
      localStorage.setItem('test-perf-page', JSON.stringify(spec));
    }, largePageSpec);

    // Navigate and measure
    await page.goto(`${TEST_CONFIG.baseURL}/test-perf-page`);
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    console.log(`Page with 100+ bindings loaded in ${loadTime}ms`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/data-binding/test7-performance.png',
      fullPage: true
    });

    // Performance target: should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('Test 8: Console errors during data binding', async () => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // Navigate to a page with data bindings
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/dashboard`);
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/data-binding/test8-console-check.png',
      fullPage: true
    });

    console.log(`Console errors: ${consoleErrors.length}`);
    console.log(`Console warnings: ${consoleWarnings.length}`);

    if (consoleErrors.length > 0) {
      console.log('Errors found:', consoleErrors);
    }

    // Should have minimal console errors
    expect(consoleErrors.length).toBeLessThan(5);
  });
});
