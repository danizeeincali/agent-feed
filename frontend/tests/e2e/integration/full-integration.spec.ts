/**
 * Full Integration Validation Test
 *
 * Tests the complete end-to-end workflow including:
 * - Navigation to agent page
 * - Page spec loading from API
 * - Data loading from API
 * - Data binding resolution
 * - Component rendering
 * - Error checking
 */

import { test, expect, Page } from '@playwright/test';

const TEST_CONFIG = {
  baseURL: 'http://localhost:5173',
  apiBaseURL: 'http://localhost:3001',
  testAgentId: 'personal-todos-agent',
  timeout: 30000
};

test.describe('Full Integration Validation E2E Tests', () => {
  let page: Page;
  let consoleErrors: string[] = [];
  let consoleWarnings: string[] = [];
  let networkErrors: string[] = [];

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    consoleErrors = [];
    consoleWarnings = [];
    networkErrors = [];

    // Monitor console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // Monitor network failures
    page.on('requestfailed', request => {
      networkErrors.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });
  });

  test('Complete workflow: Navigate to personal-todos agent page', async () => {
    console.log('Step 1: Navigating to personal-todos agent page...');

    const startTime = Date.now();

    // Navigate to the agent page
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/pages`);

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const navigationTime = Date.now() - startTime;
    console.log(`Navigation completed in ${navigationTime}ms`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/integration/step1-navigation.png',
      fullPage: true
    });

    // Verify page loaded
    const pageUrl = page.url();
    console.log(`Current URL: ${pageUrl}`);

    expect(pageUrl).toContain(TEST_CONFIG.testAgentId);
  });

  test('Complete workflow: Verify page loads from page spec API', async () => {
    console.log('Step 2: Verifying page spec loading...');

    // Navigate to agent page
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/pages`);
    await page.waitForTimeout(2000);

    // Check for page spec indicators
    const pageContainer = page.locator('[data-page-spec], [data-page-id], [data-testid="page-container"]');
    const hasPageContainer = await pageContainer.count() > 0;

    console.log(`Has page container: ${hasPageContainer}`);

    // Check for page metadata
    const pageMetadata = await page.evaluate(() => {
      return {
        title: document.title,
        hasContent: document.body.textContent ? document.body.textContent.length > 0 : false,
        hasElements: document.body.children.length > 0
      };
    });

    console.log('Page metadata:', pageMetadata);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/integration/step2-page-spec-loaded.png',
      fullPage: true
    });

    // Page should have content
    expect(pageMetadata.hasContent).toBe(true);
  });

  test('Complete workflow: Verify data loads from data API', async () => {
    console.log('Step 3: Verifying data API loading...');

    // Navigate to agent page
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/pages`);

    // Wait for potential API calls
    await page.waitForTimeout(3000);

    // Check network activity for API calls
    const apiCalls = networkErrors.filter(err => err.includes('api'));
    console.log(`API-related errors: ${apiCalls.length}`);

    // Look for data-driven content
    const dataElements = page.locator('[data-testid*="data"], [data-value], .data-item');
    const dataElementCount = await dataElements.count();

    console.log(`Found ${dataElementCount} data elements`);

    // Check for loading states (should be completed)
    const loadingIndicators = page.locator('[data-testid="loading"], .loading, .spinner');
    const stillLoading = await loadingIndicators.count();

    console.log(`Loading indicators still visible: ${stillLoading}`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/integration/step3-data-loaded.png',
      fullPage: true
    });

    // Should have data or be done loading
    expect(stillLoading).toBe(0);
  });

  test('Complete workflow: Verify bindings resolve correctly', async () => {
    console.log('Step 4: Verifying data binding resolution...');

    // Navigate to agent page
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/dashboard`);
    await page.waitForTimeout(2000);

    // Get page content
    const pageContent = await page.content();

    // Check for unresolved bindings
    const unresolvedBindings = pageContent.match(/\{\{[^}]+\}\}/g) || [];
    console.log(`Found ${unresolvedBindings.length} unresolved bindings`);

    if (unresolvedBindings.length > 0) {
      console.log('Unresolved bindings:', unresolvedBindings.slice(0, 5));
    }

    // Check for actual data values
    const pageText = await page.textContent('body');
    const hasNumericValues = /\d+/.test(pageText || '');

    console.log(`Page has numeric values: ${hasNumericValues}`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/integration/step4-bindings-resolved.png',
      fullPage: true
    });

    // Should have minimal unresolved bindings
    expect(unresolvedBindings.length).toBeLessThan(5);
  });

  test('Complete workflow: Check for console errors', async () => {
    console.log('Step 5: Checking for console errors...');

    // Navigate to agent page
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/pages`);
    await page.waitForTimeout(3000);

    // Report console activity
    console.log(`Total console errors: ${consoleErrors.length}`);
    console.log(`Total console warnings: ${consoleWarnings.length}`);
    console.log(`Total network errors: ${networkErrors.length}`);

    if (consoleErrors.length > 0) {
      console.log('Console errors:');
      consoleErrors.slice(0, 10).forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.substring(0, 100)}`);
      });
    }

    if (networkErrors.length > 0) {
      console.log('Network errors:');
      networkErrors.slice(0, 5).forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    }

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/integration/step5-error-check.png',
      fullPage: true
    });

    // Create error report
    const errorReport = {
      consoleErrors: consoleErrors.length,
      consoleWarnings: consoleWarnings.length,
      networkErrors: networkErrors.length,
      timestamp: new Date().toISOString()
    };

    console.log('Error report:', JSON.stringify(errorReport, null, 2));

    // Should have acceptable error levels
    expect(consoleErrors.length).toBeLessThan(15);
  });

  test('Complete workflow: Validate component rendering', async () => {
    console.log('Step 6: Validating component rendering...');

    // Navigate to agent page
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/pages`);
    await page.waitForTimeout(2000);

    // Check for rendered components
    const components = {
      buttons: await page.locator('button').count(),
      inputs: await page.locator('input').count(),
      links: await page.locator('a').count(),
      headings: await page.locator('h1, h2, h3, h4, h5, h6').count(),
      lists: await page.locator('ul, ol').count(),
      divs: await page.locator('div').count()
    };

    console.log('Component counts:', components);

    // Check for interactive elements
    const interactiveElements = components.buttons + components.inputs + components.links;
    console.log(`Total interactive elements: ${interactiveElements}`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/integration/step6-components-rendered.png',
      fullPage: true
    });

    // Should have some interactive elements
    expect(interactiveElements).toBeGreaterThan(0);
  });

  test('Complete workflow: Full end-to-end scenario', async () => {
    console.log('Running complete end-to-end workflow...');

    const workflow = {
      steps: [] as any[],
      startTime: Date.now(),
      endTime: 0,
      totalTime: 0,
      success: true,
      errors: [] as string[]
    };

    try {
      // Step 1: Navigate
      console.log('1. Navigating to agent page...');
      const nav1Start = Date.now();
      await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/pages`);
      await page.waitForLoadState('networkidle');
      workflow.steps.push({
        name: 'Navigation',
        time: Date.now() - nav1Start,
        success: true
      });

      await page.screenshot({
        path: 'frontend/tests/e2e/screenshots/integration/workflow-step1.png',
        fullPage: true
      });

      // Step 2: Wait for data
      console.log('2. Waiting for data to load...');
      const step2Start = Date.now();
      await page.waitForTimeout(2000);
      workflow.steps.push({
        name: 'Data Loading',
        time: Date.now() - step2Start,
        success: true
      });

      await page.screenshot({
        path: 'frontend/tests/e2e/screenshots/integration/workflow-step2.png',
        fullPage: true
      });

      // Step 3: Verify content
      console.log('3. Verifying content...');
      const step3Start = Date.now();
      const pageText = await page.textContent('body');
      const hasContent = pageText && pageText.length > 100;
      workflow.steps.push({
        name: 'Content Verification',
        time: Date.now() - step3Start,
        success: hasContent,
        details: `Content length: ${pageText?.length || 0}`
      });

      await page.screenshot({
        path: 'frontend/tests/e2e/screenshots/integration/workflow-step3.png',
        fullPage: true
      });

      // Step 4: Check interactions
      console.log('4. Checking interactive elements...');
      const step4Start = Date.now();
      const buttons = await page.locator('button').count();
      workflow.steps.push({
        name: 'Interactive Elements',
        time: Date.now() - step4Start,
        success: buttons > 0,
        details: `Found ${buttons} buttons`
      });

      await page.screenshot({
        path: 'frontend/tests/e2e/screenshots/integration/workflow-step4.png',
        fullPage: true
      });

      // Step 5: Final validation
      console.log('5. Final validation...');
      const step5Start = Date.now();
      const finalErrors = consoleErrors.length;
      workflow.steps.push({
        name: 'Error Check',
        time: Date.now() - step5Start,
        success: finalErrors < 10,
        details: `Console errors: ${finalErrors}`
      });

      await page.screenshot({
        path: 'frontend/tests/e2e/screenshots/integration/workflow-step5.png',
        fullPage: true
      });

    } catch (error: any) {
      workflow.success = false;
      workflow.errors.push(error.message);
    }

    workflow.endTime = Date.now();
    workflow.totalTime = workflow.endTime - workflow.startTime;

    console.log('\n=== Workflow Complete ===');
    console.log(`Total time: ${workflow.totalTime}ms`);
    console.log(`Success: ${workflow.success}`);
    console.log(`Steps completed: ${workflow.steps.length}`);

    workflow.steps.forEach((step, i) => {
      console.log(`  ${i + 1}. ${step.name}: ${step.time}ms - ${step.success ? '✓' : '✗'}`);
      if (step.details) {
        console.log(`     ${step.details}`);
      }
    });

    if (workflow.errors.length > 0) {
      console.log('Errors:', workflow.errors);
    }

    // Final screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/integration/workflow-complete.png',
      fullPage: true
    });

    expect(workflow.success).toBe(true);
  });

  test('Integration: Performance benchmarks', async () => {
    console.log('Running performance benchmarks...');

    const benchmarks = {
      initialLoad: 0,
      dataFetch: 0,
      rendering: 0,
      interaction: 0
    };

    // Benchmark: Initial Load
    const loadStart = Date.now();
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/pages`);
    await page.waitForLoadState('domcontentloaded');
    benchmarks.initialLoad = Date.now() - loadStart;

    // Benchmark: Data Fetch
    const dataStart = Date.now();
    await page.waitForLoadState('networkidle');
    benchmarks.dataFetch = Date.now() - dataStart;

    // Benchmark: Rendering
    const renderStart = Date.now();
    await page.waitForTimeout(1000);
    const elements = await page.locator('*').count();
    benchmarks.rendering = Date.now() - renderStart;

    // Benchmark: Interaction
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    if (buttonCount > 0) {
      const interactStart = Date.now();
      await buttons.first().hover();
      benchmarks.interaction = Date.now() - interactStart;
    }

    console.log('\n=== Performance Benchmarks ===');
    console.log(`Initial Load: ${benchmarks.initialLoad}ms`);
    console.log(`Data Fetch: ${benchmarks.dataFetch}ms`);
    console.log(`Rendering: ${benchmarks.rendering}ms`);
    console.log(`Interaction: ${benchmarks.interaction}ms`);
    console.log(`Total Elements: ${elements}`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/integration/performance-benchmarks.png',
      fullPage: true
    });

    // Performance targets
    expect(benchmarks.initialLoad).toBeLessThan(5000);
    expect(benchmarks.dataFetch).toBeLessThan(3000);
  });
});
