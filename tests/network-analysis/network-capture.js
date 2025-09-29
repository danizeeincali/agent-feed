import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function captureNetworkAnalysis() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000 // Slow down for better observation
  });

  const context = await browser.newContext({
    // Enable DevTools
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // Arrays to store network data
  const networkRequests = [];
  const failedRequests = [];
  const consoleErrors = [];

  // Listen to all network requests
  page.on('request', request => {
    networkRequests.push({
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      timestamp: new Date().toISOString()
    });
    console.log(`→ REQUEST: ${request.method()} ${request.url()}`);
  });

  // Listen to network responses
  page.on('response', response => {
    const request = response.request();
    const responseData = {
      url: response.url(),
      status: response.status(),
      statusText: response.statusText(),
      headers: response.headers(),
      method: request.method(),
      timestamp: new Date().toISOString()
    };

    console.log(`← RESPONSE: ${response.status()} ${response.url()}`);

    // Capture failed requests (4xx, 5xx)
    if (response.status() >= 400) {
      failedRequests.push({
        ...responseData,
        requestHeaders: request.headers(),
        failureReason: `HTTP ${response.status()} ${response.statusText()}`
      });
      console.log(`❌ FAILED REQUEST: ${response.status()} ${response.url()}`);
    }
  });

  // Listen to request failures (network errors)
  page.on('requestfailed', request => {
    const failureData = {
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      failureText: request.failure()?.errorText || 'Unknown error',
      timestamp: new Date().toISOString()
    };

    failedRequests.push(failureData);
    console.log(`❌ REQUEST FAILED: ${request.url()} - ${failureData.failureText}`);
  });

  // Listen to console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const error = {
        text: msg.text(),
        type: msg.type(),
        location: msg.location(),
        timestamp: new Date().toISOString()
      };
      consoleErrors.push(error);
      console.log(`❌ CONSOLE ERROR: ${msg.text()}`);
    }
  });

  try {
    console.log('🚀 Navigating to http://localhost:3000/agents');

    // Navigate to the agents page
    await page.goto('http://localhost:3000/agents', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('📄 Page loaded, waiting for interactions...');

    // Wait a bit for any delayed requests
    await page.waitForTimeout(5000);

    // Take screenshot of the page
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/network-analysis/agents-page-screenshot.png',
      fullPage: true
    });

    // Open DevTools programmatically (this won't work in headless mode)
    await page.evaluate(() => {
      // Try to trigger any lazy-loaded content
      window.scrollTo(0, document.body.scrollHeight);
    });

    await page.waitForTimeout(3000);

    // Try to interact with any buttons or elements that might trigger network requests
    const agentElements = await page.$$('[data-testid="agent-card"], .agent-card, button');
    if (agentElements.length > 0) {
      console.log(`🔍 Found ${agentElements.length} interactive elements, clicking first one...`);
      try {
        await agentElements[0].click();
        await page.waitForTimeout(2000);
      } catch (e) {
        console.log('⚠️  Could not click element:', e.message);
      }
    }

    // Final screenshot after interactions
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/network-analysis/agents-page-after-interaction.png',
      fullPage: true
    });

  } catch (error) {
    console.error('❌ Error during page navigation:', error);

    // Take screenshot of error state
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/network-analysis/error-state-screenshot.png',
      fullPage: true
    });
  }

  // Compile all data
  const analysisData = {
    timestamp: new Date().toISOString(),
    targetUrl: 'http://localhost:3000/agents',
    summary: {
      totalRequests: networkRequests.length,
      failedRequests: failedRequests.length,
      consoleErrors: consoleErrors.length
    },
    networkRequests,
    failedRequests,
    consoleErrors,
    analysis: {
      portAnalysis: {
        requests3000: networkRequests.filter(req => req.url.includes(':3000')).length,
        requests3001: networkRequests.filter(req => req.url.includes(':3001')).length,
        otherPorts: networkRequests.filter(req => !req.url.includes(':3000') && !req.url.includes(':3001')).length
      },
      corsIssues: failedRequests.filter(req =>
        req.failureReason?.toLowerCase().includes('cors') ||
        req.failureText?.toLowerCase().includes('cors')
      ),
      apiRoutes: networkRequests.filter(req => req.url.includes('/api/')),
      staticAssets: networkRequests.filter(req =>
        req.url.includes('.js') || req.url.includes('.css') || req.url.includes('.png') || req.url.includes('.ico')
      )
    }
  };

  // Save the analysis data
  fs.writeFileSync(
    '/workspaces/agent-feed/tests/network-analysis/request-details.json',
    JSON.stringify(analysisData, null, 2)
  );

  console.log('✅ Network analysis complete!');
  console.log(`📊 Total requests: ${networkRequests.length}`);
  console.log(`❌ Failed requests: ${failedRequests.length}`);
  console.log(`🚨 Console errors: ${consoleErrors.length}`);

  if (failedRequests.length > 0) {
    console.log('\n❌ FAILED REQUESTS SUMMARY:');
    failedRequests.forEach(req => {
      console.log(`  - ${req.method || 'GET'} ${req.url} → ${req.failureReason || req.failureText}`);
    });
  }

  if (consoleErrors.length > 0) {
    console.log('\n🚨 CONSOLE ERRORS SUMMARY:');
    consoleErrors.forEach(error => {
      console.log(`  - ${error.text}`);
    });
  }

  // Keep browser open for manual inspection
  console.log('\n🔍 Browser will stay open for manual DevTools inspection...');
  console.log('Press Ctrl+C to close when done inspecting.');

  // Wait for manual inspection
  await new Promise(resolve => {
    process.on('SIGINT', () => {
      console.log('\n👋 Closing browser...');
      resolve();
    });
  });

  await browser.close();
}

// Run the analysis
captureNetworkAnalysis().catch(console.error);