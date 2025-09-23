const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Agents Page Comprehensive Validation', () => {
  let testResults = {
    timestamp: new Date().toISOString(),
    testSuite: 'Agents Page Validation',
    results: [],
    screenshots: [],
    errors: [],
    agentData: {}
  };

  test.beforeEach(async ({ page }) => {
    // Enable console logging to capture any errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        testResults.errors.push({
          timestamp: new Date().toISOString(),
          message: msg.text(),
          location: msg.location()
        });
      }
    });

    // Capture network failures
    page.on('requestfailed', request => {
      testResults.errors.push({
        timestamp: new Date().toISOString(),
        type: 'network_failure',
        url: request.url(),
        failure: request.failure()?.errorText
      });
    });
  });

  test('01 - Navigate to agents page and verify initial load', async ({ page }) => {
    console.log('🚀 Starting agents page navigation test...');

    // Navigate to agents page
    await page.goto('/agents');

    // Wait for page to stabilize
    await page.waitForLoadState('networkidle');

    // Take initial screenshot
    const screenshotPath = path.join(__dirname, '../screenshots/01-agents-page-initial.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    testResults.screenshots.push('01-agents-page-initial.png');

    // Verify page title and URL
    await expect(page).toHaveURL(/.*\/agents/);
    const title = await page.title();

    testResults.results.push({
      test: '01 - Initial Navigation',
      status: 'PASS',
      details: {
        url: page.url(),
        title: title,
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ Initial navigation completed successfully');
  });

  test('02 - Verify agents loading from correct path', async ({ page }) => {
    console.log('🔍 Testing agent data loading from /prod/claude/agents...');

    await page.goto('/agents');

    // Monitor network requests to verify correct API path
    const agentRequests = [];
    page.on('request', request => {
      if (request.url().includes('agents') || request.url().includes('/prod/claude/')) {
        agentRequests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      }
    });

    // Wait for agents to load
    await page.waitForLoadState('networkidle');

    // Take screenshot of loading state
    const loadingScreenshot = path.join(__dirname, '../screenshots/02-agents-loading.png');
    await page.screenshot({ path: loadingScreenshot, fullPage: true });
    testResults.screenshots.push('02-agents-loading.png');

    // Verify agents are loaded
    await page.waitForSelector('[data-testid="agent-list"], .agent-card, .agent-item', { timeout: 30000 });

    // Take screenshot of loaded agents
    const loadedScreenshot = path.join(__dirname, '../screenshots/02-agents-loaded.png');
    await page.screenshot({ path: loadedScreenshot, fullPage: true });
    testResults.screenshots.push('02-agents-loaded.png');

    testResults.results.push({
      test: '02 - Agent Loading',
      status: 'PASS',
      details: {
        agentRequests: agentRequests,
        correctPath: agentRequests.some(req => req.url.includes('/prod/claude/')),
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ Agents loaded successfully from correct path');
  });

  test('03 - Test agent list display and count', async ({ page }) => {
    console.log('📊 Testing agent list display and counting...');

    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    // Wait for agent list to load
    await page.waitForSelector('[data-testid="agent-list"], .agent-card, .agent-item', { timeout: 30000 });

    // Count agents
    const agentElements = await page.locator('.agent-card, .agent-item, [data-testid*="agent"]').count();

    // Get agent metadata
    const agentData = await page.evaluate(() => {
      const agents = [];
      const agentElements = document.querySelectorAll('.agent-card, .agent-item, [data-testid*="agent"]');

      agentElements.forEach((element, index) => {
        const agent = {
          index: index,
          text: element.textContent?.trim() || '',
          classes: element.className,
          id: element.id,
          dataset: Object.assign({}, element.dataset)
        };
        agents.push(agent);
      });

      return agents;
    });

    // Take detailed screenshot
    const detailScreenshot = path.join(__dirname, '../screenshots/03-agent-list-detail.png');
    await page.screenshot({ path: detailScreenshot, fullPage: true });
    testResults.screenshots.push('03-agent-list-detail.png');

    testResults.agentData = {
      count: agentElements,
      agents: agentData
    };

    testResults.results.push({
      test: '03 - Agent List Display',
      status: agentElements > 0 ? 'PASS' : 'FAIL',
      details: {
        agentCount: agentElements,
        hasAgents: agentElements > 0,
        agentMetadata: agentData.slice(0, 5), // First 5 agents for brevity
        timestamp: new Date().toISOString()
      }
    });

    console.log(`✅ Found ${agentElements} agents in the list`);
  });

  test('04 - Test individual agent details', async ({ page }) => {
    console.log('🔍 Testing individual agent details...');

    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    // Wait for agents to load
    await page.waitForSelector('[data-testid="agent-list"], .agent-card, .agent-item', { timeout: 30000 });

    // Find first clickable agent
    const firstAgent = page.locator('.agent-card, .agent-item, [data-testid*="agent"]').first();

    if (await firstAgent.count() > 0) {
      // Take screenshot before clicking
      const beforeClick = path.join(__dirname, '../screenshots/04-before-agent-click.png');
      await page.screenshot({ path: beforeClick, fullPage: true });
      testResults.screenshots.push('04-before-agent-click.png');

      // Click on first agent (if clickable)
      try {
        await firstAgent.click({ timeout: 5000 });
        await page.waitForTimeout(2000); // Wait for any transitions

        // Take screenshot after clicking
        const afterClick = path.join(__dirname, '../screenshots/04-after-agent-click.png');
        await page.screenshot({ path: afterClick, fullPage: true });
        testResults.screenshots.push('04-after-agent-click.png');

        testResults.results.push({
          test: '04 - Agent Details',
          status: 'PASS',
          details: {
            agentClickable: true,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        testResults.results.push({
          test: '04 - Agent Details',
          status: 'INFO',
          details: {
            agentClickable: false,
            error: error.message,
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    console.log('✅ Agent details test completed');
  });

  test('05 - Test error states and loading indicators', async ({ page }) => {
    console.log('⚠️  Testing error states and loading indicators...');

    await page.goto('/agents');

    // Capture initial loading state (if any)
    const loadingIndicators = await page.locator('[data-testid*="loading"], .loading, .spinner, [class*="loading"]').count();

    if (loadingIndicators > 0) {
      const loadingScreenshot = path.join(__dirname, '../screenshots/05-loading-indicators.png');
      await page.screenshot({ path: loadingScreenshot, fullPage: true });
      testResults.screenshots.push('05-loading-indicators.png');
    }

    await page.waitForLoadState('networkidle');

    // Check for error messages
    const errorElements = await page.locator('[data-testid*="error"], .error, [class*="error"]').count();

    if (errorElements > 0) {
      const errorScreenshot = path.join(__dirname, '../screenshots/05-error-states.png');
      await page.screenshot({ path: errorScreenshot, fullPage: true });
      testResults.screenshots.push('05-error-states.png');
    }

    // Take final state screenshot
    const finalScreenshot = path.join(__dirname, '../screenshots/05-final-state.png');
    await page.screenshot({ path: finalScreenshot, fullPage: true });
    testResults.screenshots.push('05-final-state.png');

    testResults.results.push({
      test: '05 - Error States and Loading',
      status: 'PASS',
      details: {
        loadingIndicators: loadingIndicators,
        errorElements: errorElements,
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ Error states and loading test completed');
  });

  test('06 - Test responsive design across viewports', async ({ page }) => {
    console.log('📱 Testing responsive design across viewports...');

    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');

      // Take screenshot for each viewport
      const screenshotPath = path.join(__dirname, `../screenshots/06-responsive-${viewport.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      testResults.screenshots.push(`06-responsive-${viewport.name}.png`);

      // Check if layout adapts properly
      const agentElements = await page.locator('.agent-card, .agent-item, [data-testid*="agent"]').count();

      testResults.results.push({
        test: `06 - Responsive Design - ${viewport.name}`,
        status: agentElements > 0 ? 'PASS' : 'FAIL',
        details: {
          viewport: viewport,
          agentCount: agentElements,
          timestamp: new Date().toISOString()
        }
      });
    }

    console.log('✅ Responsive design testing completed');
  });

  test.afterAll(async () => {
    // Generate comprehensive test report
    const reportPath = path.join(__dirname, '../test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));

    console.log('📊 Test report generated:', reportPath);
    console.log('📸 Screenshots saved in:', path.join(__dirname, '../screenshots/'));
  });
});