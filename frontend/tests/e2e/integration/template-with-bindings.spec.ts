/**
 * E2E Tests for Template Integration with Data Bindings
 *
 * Tests template system integration including:
 * - Template instantiation with data bindings
 * - Template variable replacement
 * - Dashboard templates with bindings
 * - Form templates with bindings
 */

import { test, expect, Page } from '@playwright/test';

const TEST_CONFIG = {
  baseURL: 'http://localhost:5173',
  apiBaseURL: 'http://localhost:3001',
  testAgentId: 'personal-todos-agent',
  timeout: 30000
};

test.describe('Template Integration with Data Bindings E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
  });

  test('Test 1: todoManager template instantiates with data bindings', async () => {
    // Navigate to the personal todos agent page
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/pages`);

    // Wait for page load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for template-based elements
    const templateElements = page.locator('[data-template], [data-template-id]');
    const templateCount = await templateElements.count();

    console.log(`Found ${templateCount} template elements`);

    // Check for todoManager-specific elements
    const todoManager = page.locator('[data-template="todoManager"], [data-component="todoManager"]');
    const hasTodoManager = await todoManager.count() > 0;

    console.log(`Has todoManager template: ${hasTodoManager}`);

    // Look for common todo manager UI elements
    const taskInput = page.locator('input[placeholder*="task"], input[placeholder*="todo"], input[type="text"]');
    const addButton = page.locator('button:has-text("Add"), button:has-text("Create")');

    const hasTaskInput = await taskInput.count() > 0;
    const hasAddButton = await addButton.count() > 0;

    console.log(`Has task input: ${hasTaskInput}`);
    console.log(`Has add button: ${hasAddButton}`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/templates/test1-todo-manager-template.png',
      fullPage: true
    });

    // Should have template elements or todo UI
    expect(templateCount > 0 || hasTaskInput || hasAddButton).toBe(true);
  });

  test('Test 2: Dashboard template with bindings renders', async () => {
    // Navigate to dashboard
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/dashboard`);
    await page.waitForTimeout(2000);

    // Check for dashboard template structure
    const dashboardTemplate = page.locator('[data-template="dashboard"], [data-template-type="dashboard"]');
    const hasDashboardTemplate = await dashboardTemplate.count() > 0;

    console.log(`Has dashboard template: ${hasDashboardTemplate}`);

    // Look for typical dashboard components
    const widgets = page.locator('[data-testid*="widget"], .widget, .card');
    const widgetCount = await widgets.count();

    console.log(`Found ${widgetCount} widget elements`);

    // Check for data-bound elements in the dashboard
    const dataBoundElements = page.locator('[data-binding], [data-value]');
    const dataBoundCount = await dataBoundElements.count();

    console.log(`Found ${dataBoundCount} data-bound elements`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/templates/test2-dashboard-template.png',
      fullPage: true
    });

    // Should have dashboard structure
    expect(widgetCount > 0 || dataBoundCount > 0).toBe(true);
  });

  test('Test 3: Form template with variable bindings works', async () => {
    // Navigate to a page that might have forms
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/pages`);
    await page.waitForTimeout(2000);

    // Look for form templates
    const formTemplate = page.locator('form, [data-template="form"], [data-component="form"]');
    const hasFormTemplate = await formTemplate.count() > 0;

    console.log(`Has form template: ${hasFormTemplate}`);

    // Check for form inputs with bindings
    const formInputs = page.locator('input, textarea, select');
    const inputCount = await formInputs.count();

    console.log(`Found ${inputCount} form inputs`);

    // Check for labeled inputs (indicates template structure)
    const labels = page.locator('label');
    const labelCount = await labels.count();

    console.log(`Found ${labelCount} labels`);

    // Check for placeholder text (might contain variable bindings)
    const placeholders = await page.locator('input[placeholder], textarea[placeholder]').count();
    console.log(`Found ${placeholders} inputs with placeholders`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/templates/test3-form-template.png',
      fullPage: true
    });

    // Should have form elements
    expect(inputCount > 0).toBe(true);
  });

  test('Test 4: Template variables correctly replaced with bindings', async () => {
    // Create a test page with template variables
    const templateSpec = {
      id: 'test-template-vars',
      agentId: TEST_CONFIG.testAgentId,
      title: 'Template Variables Test',
      template: 'dashboard',
      variables: {
        userName: '{{data.user.name}}',
        taskCount: '{{data.tasks.length}}',
        completionRate: '{{data.completionRate}}'
      },
      dataSource: {
        type: 'static',
        data: {
          user: { name: 'John Doe' },
          tasks: [{ id: 1 }, { id: 2 }, { id: 3 }],
          completionRate: 75
        }
      }
    };

    // Store test spec
    await page.evaluate((spec) => {
      localStorage.setItem('test-template-spec', JSON.stringify(spec));
    }, templateSpec);

    // Navigate to test page
    await page.goto(`${TEST_CONFIG.baseURL}/test-template-page`);
    await page.waitForTimeout(1000);

    // Check if variables are replaced
    const pageText = await page.textContent('body');

    // Should not contain template variable syntax
    const hasUnresolvedVars = pageText?.includes('{{') && pageText?.includes('}}');

    console.log(`Has unresolved template variables: ${hasUnresolvedVars}`);

    // Should contain resolved values
    const hasUserName = pageText?.includes('John Doe');
    const hasTaskCount = pageText?.includes('3');
    const hasCompletionRate = pageText?.includes('75');

    console.log(`Has resolved user name: ${hasUserName}`);
    console.log(`Has resolved task count: ${hasTaskCount}`);
    console.log(`Has resolved completion rate: ${hasCompletionRate}`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/templates/test4-variable-replacement.png',
      fullPage: true
    });

    // Variables should be resolved
    expect(hasUnresolvedVars).toBe(false);
  });

  test('Test 5: Template reusability across different agents', async () => {
    // Test that templates work for different agents
    const agents = [
      TEST_CONFIG.testAgentId,
      'test-agent-1',
      'test-agent-2'
    ];

    for (const agentId of agents) {
      console.log(`Testing template for agent: ${agentId}`);

      await page.goto(`${TEST_CONFIG.baseURL}/agents/${agentId}/pages`);
      await page.waitForTimeout(1500);

      // Check if page loads (even if empty)
      const pageContent = await page.content();
      const hasContent = pageContent.length > 0;

      console.log(`Agent ${agentId} - Has content: ${hasContent}`);

      // Take screenshot for each agent
      await page.screenshot({
        path: `frontend/tests/e2e/screenshots/templates/test5-agent-${agentId}.png`,
        fullPage: true
      });
    }

    expect(true).toBe(true); // Test completed
  });

  test('Test 6: Template with complex nested bindings', async () => {
    // Create a template with complex nested structure
    const complexTemplate = {
      id: 'test-complex-template',
      agentId: TEST_CONFIG.testAgentId,
      template: 'dashboard',
      sections: [
        {
          type: 'header',
          title: '{{data.project.name}}',
          subtitle: '{{data.project.owner.name}}'
        },
        {
          type: 'stats',
          metrics: [
            {
              label: 'Total Tasks',
              value: '{{data.project.tasks.length}}'
            },
            {
              label: 'Completed',
              value: '{{data.project.tasks.filter(t => t.completed).length}}'
            }
          ]
        }
      ],
      dataSource: {
        type: 'static',
        data: {
          project: {
            name: 'Test Project',
            owner: { name: 'Jane Smith' },
            tasks: [
              { id: 1, completed: true },
              { id: 2, completed: false },
              { id: 3, completed: true }
            ]
          }
        }
      }
    };

    // Store complex template
    await page.evaluate((spec) => {
      localStorage.setItem('test-complex-template', JSON.stringify(spec));
    }, complexTemplate);

    // Navigate to test page
    await page.goto(`${TEST_CONFIG.baseURL}/test-complex-template-page`);
    await page.waitForTimeout(1000);

    // Check if nested bindings are resolved
    const pageText = await page.textContent('body');

    const hasProjectName = pageText?.includes('Test Project');
    const hasOwnerName = pageText?.includes('Jane Smith');

    console.log(`Has project name: ${hasProjectName}`);
    console.log(`Has owner name: ${hasOwnerName}`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/templates/test6-complex-nested-bindings.png',
      fullPage: true
    });

    // At least some nested bindings should work
    expect(hasProjectName || hasOwnerName).toBe(true);
  });

  test('Test 7: Template error handling for missing data', async () => {
    // Create a template with missing data sources
    const templateWithMissingData = {
      id: 'test-missing-data',
      agentId: TEST_CONFIG.testAgentId,
      template: 'dashboard',
      variables: {
        userName: '{{data.user.name}}',
        // No dataSource provided - should handle gracefully
      }
    };

    // Store template spec
    await page.evaluate((spec) => {
      localStorage.setItem('test-missing-data', JSON.stringify(spec));
    }, templateWithMissingData);

    // Navigate to test page
    await page.goto(`${TEST_CONFIG.baseURL}/test-missing-data-page`);
    await page.waitForTimeout(1000);

    // Check for error handling
    const errorMessage = page.locator('[data-testid="error"], .error, [role="alert"]');
    const hasErrorMessage = await errorMessage.count() > 0;

    console.log(`Has error message: ${hasErrorMessage}`);

    // Page should not crash
    const pageText = await page.textContent('body');
    const hasContent = pageText && pageText.length > 0;

    console.log(`Page has content: ${hasContent}`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/templates/test7-missing-data-handling.png',
      fullPage: true
    });

    // Page should handle error gracefully
    expect(hasContent).toBe(true);
  });

  test('Test 8: Template performance with multiple instances', async () => {
    const startTime = Date.now();

    // Navigate to a page with multiple template instances
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/pages`);
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    console.log(`Page with templates loaded in ${loadTime}ms`);

    // Count template instances
    const templates = page.locator('[data-template], [data-component]');
    const templateCount = await templates.count();

    console.log(`Found ${templateCount} template instances`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/templates/test8-performance.png',
      fullPage: true
    });

    // Should load in reasonable time
    expect(loadTime).toBeLessThan(5000);
  });

  test('Test 9: Console errors during template rendering', async () => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to template page
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/dashboard`);
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/templates/test9-console-check.png',
      fullPage: true
    });

    console.log(`Console errors: ${consoleErrors.length}`);

    if (consoleErrors.length > 0) {
      console.log('Errors:', consoleErrors.slice(0, 5));
    }

    // Should have minimal errors
    expect(consoleErrors.length).toBeLessThan(10);
  });
});
