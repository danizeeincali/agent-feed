const { test, expect } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');

const RESULTS_DIR = '/workspaces/agent-feed/tests/playwright/ui-validation/results';

test.describe('Network and API Analysis', () => {
  let networkLogs = [];
  let consoleErrors = [];

  test.beforeAll(async () => {
    await fs.mkdir(RESULTS_DIR, { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Reset logs for each test
    networkLogs = [];
    consoleErrors = [];

    // Capture all network requests
    page.on('request', request => {
      networkLogs.push({
        type: 'request',
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        timestamp: new Date().toISOString()
      });
    });

    // Capture all network responses
    page.on('response', response => {
      networkLogs.push({
        type: 'response',
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        timestamp: new Date().toISOString()
      });
    });

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location(),
          timestamp: new Date().toISOString()
        });
      }
    });
  });

  test('Backend API connectivity test', async ({ request }) => {
    console.log('🔍 Testing backend API connectivity...');

    const backendTests = [
      { url: 'http://localhost:5173/api/agents', name: 'Agents API' },
      { url: 'http://localhost:5173/health', name: 'Health Check' },
      { url: 'http://localhost:5173/api/status', name: 'Status API' }
    ];

    const results = [];

    for (const test of backendTests) {
      try {
        console.log(`Testing ${test.name} at ${test.url}...`);
        const response = await request.get(test.url);
        const data = await response.text();

        results.push({
          name: test.name,
          url: test.url,
          status: response.status(),
          success: response.ok(),
          data: data.substring(0, 500) // Truncate for readability
        });

        console.log(`✅ ${test.name}: ${response.status()}`);
      } catch (error) {
        results.push({
          name: test.name,
          url: test.url,
          error: error.message
        });
        console.log(`❌ ${test.name}: ${error.message}`);
      }
    }

    // Save backend test results
    await fs.writeFile(
      path.join(RESULTS_DIR, 'backend-api-tests.json'),
      JSON.stringify(results, null, 2)
    );
  });

  test('Frontend page load analysis', async ({ page }) => {
    console.log('🔍 Analyzing frontend page load behavior...');

    const pagesToTest = [
      { url: 'http://localhost:3000/', name: 'Root Page' },
      { url: 'http://localhost:3000/agents', name: 'Agents Page' }
    ];

    const pageResults = [];

    for (const pageTest of pagesToTest) {
      console.log(`Testing ${pageTest.name} at ${pageTest.url}...`);

      const startTime = Date.now();
      let pageError = null;

      try {
        const response = await page.goto(pageTest.url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });

        const loadTime = Date.now() - startTime;
        const title = await page.title();
        const url = page.url();

        pageResults.push({
          name: pageTest.name,
          url: pageTest.url,
          finalUrl: url,
          status: response?.status(),
          title: title,
          loadTime: loadTime,
          networkRequests: networkLogs.length,
          consoleErrors: consoleErrors.length,
          error: null
        });

        console.log(`📊 ${pageTest.name}: ${response?.status()} (${loadTime}ms)`);

      } catch (error) {
        pageError = error.message;
        pageResults.push({
          name: pageTest.name,
          url: pageTest.url,
          error: pageError,
          networkRequests: networkLogs.length,
          consoleErrors: consoleErrors.length
        });

        console.log(`❌ ${pageTest.name}: ${pageError}`);
      }

      // Reset logs for next page
      networkLogs = [];
      consoleErrors = [];
    }

    // Save frontend test results
    await fs.writeFile(
      path.join(RESULTS_DIR, 'frontend-page-analysis.json'),
      JSON.stringify(pageResults, null, 2)
    );
  });

  test('API proxy analysis', async ({ page }) => {
    console.log('🔍 Testing frontend API proxy functionality...');

    // Try to access backend API through frontend proxy
    const proxyTests = [
      'http://localhost:3000/api/agents',
      'http://localhost:3000/api/status'
    ];

    const proxyResults = [];

    for (const proxyUrl of proxyTests) {
      try {
        console.log(`Testing proxy: ${proxyUrl}`);

        await page.goto('http://localhost:3000/', { timeout: 5000 });

        const response = await page.evaluate(async (url) => {
          try {
            const res = await fetch(url);
            return {
              status: res.status,
              ok: res.ok,
              text: await res.text()
            };
          } catch (error) {
            return { error: error.message };
          }
        }, proxyUrl);

        proxyResults.push({
          url: proxyUrl,
          ...response
        });

        console.log(`📡 Proxy ${proxyUrl}: ${response.status || 'Error'}`);

      } catch (error) {
        proxyResults.push({
          url: proxyUrl,
          error: error.message
        });
        console.log(`❌ Proxy ${proxyUrl}: ${error.message}`);
      }
    }

    // Save proxy test results
    await fs.writeFile(
      path.join(RESULTS_DIR, 'api-proxy-analysis.json'),
      JSON.stringify(proxyResults, null, 2)
    );
  });

  test.afterEach(async () => {
    // Save network logs and console errors for each test
    const testResults = {
      networkLogs: networkLogs,
      consoleErrors: consoleErrors,
      timestamp: new Date().toISOString()
    };

    const filename = `network-logs-${Date.now()}.json`;
    await fs.writeFile(
      path.join(RESULTS_DIR, filename),
      JSON.stringify(testResults, null, 2)
    );
  });
});