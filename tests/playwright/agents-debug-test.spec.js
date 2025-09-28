const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Agents Page Debug Test', () => {
  let consoleLogs = [];
  let networkRequests = [];
  let networkResponses = [];
  let errors = [];

  test('Debug agents page loading and API calls', async ({ page }) => {
    // Capture console logs
    page.on('console', (msg) => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      });
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      errors.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });

    // Capture network requests
    page.on('request', (request) => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData(),
        timestamp: new Date().toISOString()
      });
    });

    // Capture network responses
    page.on('response', (response) => {
      networkResponses.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers(),
        timestamp: new Date().toISOString()
      });
    });

    // Navigate to the agents page
    console.log('Navigating to http://localhost:5173/agents');
    await page.goto('http://localhost:5173/agents', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Take initial screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/playwright/agents-initial-state.png',
      fullPage: true
    });

    // Wait for any loading to complete
    await page.waitForTimeout(5000);

    // Check if loading text is present
    const loadingText = await page.locator('text=Loading agents').isVisible();
    console.log('Loading text visible:', loadingText);

    // Check for error messages
    const errorElements = await page.locator('[class*="error"], [class*="Error"], text=/error/i, text=/failed/i').all();
    const errorMessages = [];
    for (const element of errorElements) {
      try {
        const text = await element.textContent();
        if (text) errorMessages.push(text);
      } catch (e) {
        // Element might be stale
      }
    }

    // Take screenshot after waiting
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/playwright/agents-final-state.png',
      fullPage: true
    });

    // Check if /api/agents was called
    const agentsApiCalls = networkRequests.filter(req => req.url.includes('/api/agents'));
    const agentsApiResponses = networkResponses.filter(res => res.url.includes('/api/agents'));

    // Get page content for analysis
    const pageContent = await page.content();
    const pageTitle = await page.title();

    // Try to get any fetch errors from the page
    const fetchErrors = await page.evaluate(() => {
      // Check if there are any global error handlers or stored errors
      if (window.lastFetchError) return window.lastFetchError;
      if (window.console && window.console.errors) return window.console.errors;
      return null;
    });

    // Create comprehensive debug report
    const debugReport = {
      timestamp: new Date().toISOString(),
      pageInfo: {
        url: page.url(),
        title: pageTitle,
        loadingTextVisible: loadingText,
        errorMessages: errorMessages
      },
      consoleLogs: consoleLogs,
      pageErrors: errors,
      networkRequests: networkRequests,
      networkResponses: networkResponses,
      agentsApiCalls: agentsApiCalls,
      agentsApiResponses: agentsApiResponses,
      fetchErrors: fetchErrors,
      pageContentPreview: pageContent.substring(0, 2000) + '...'
    };

    // Save debug report
    const reportPath = '/workspaces/agent-feed/tests/playwright/agents-debug-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(debugReport, null, 2));

    // Log key findings
    console.log('\n=== DEBUG REPORT ===');
    console.log('Page URL:', page.url());
    console.log('Page Title:', pageTitle);
    console.log('Loading text visible:', loadingText);
    console.log('Error messages found:', errorMessages);
    console.log('Console logs count:', consoleLogs.length);
    console.log('Page errors count:', errors.length);
    console.log('Network requests count:', networkRequests.length);
    console.log('API calls to /api/agents:', agentsApiCalls.length);

    if (agentsApiCalls.length > 0) {
      console.log('\n=== API CALLS ===');
      agentsApiCalls.forEach((call, index) => {
        console.log(`Call ${index + 1}:`, call.method, call.url);
      });
    }

    if (agentsApiResponses.length > 0) {
      console.log('\n=== API RESPONSES ===');
      agentsApiResponses.forEach((response, index) => {
        console.log(`Response ${index + 1}:`, response.status, response.statusText, response.url);
      });
    }

    if (consoleLogs.length > 0) {
      console.log('\n=== CONSOLE LOGS ===');
      consoleLogs.forEach((log, index) => {
        console.log(`${log.type}: ${log.text}`);
      });
    }

    if (errors.length > 0) {
      console.log('\n=== PAGE ERRORS ===');
      errors.forEach((error, index) => {
        console.log(`Error ${index + 1}:`, error.message);
      });
    }

    console.log('\n=== FILES CREATED ===');
    console.log('- Screenshots: agents-initial-state.png, agents-final-state.png');
    console.log('- Debug report: agents-debug-report.json');
    console.log('===================\n');

    // Assertions for test validation
    expect(pageTitle).toBeTruthy();

    // The test passes regardless of errors - we're just collecting debug info
  });

  test('Test API endpoint directly', async ({ request }) => {
    console.log('\n=== DIRECT API TEST ===');

    try {
      const response = await request.get('http://localhost:5173/api/agents');
      const status = response.status();
      const statusText = response.statusText();

      console.log('Direct API call status:', status, statusText);

      if (status === 200) {
        const data = await response.json();
        console.log('API response data:', JSON.stringify(data, null, 2));
      } else {
        const errorText = await response.text();
        console.log('API error response:', errorText);
      }
    } catch (error) {
      console.log('Direct API call failed:', error.message);
    }

    console.log('====================\n');
  });

  test('Check if server is running', async ({ request }) => {
    console.log('\n=== SERVER CHECK ===');

    try {
      // Test base URL
      const baseResponse = await request.get('http://localhost:5173/');
      console.log('Base URL status:', baseResponse.status());

      // Test if it's a Next.js app
      const nextResponse = await request.get('http://localhost:5173/_next/static/chunks/pages/_app.js');
      console.log('Next.js check status:', nextResponse.status());

    } catch (error) {
      console.log('Server check failed:', error.message);
    }

    console.log('==================\n');
  });
});