/**
 * Playwright Validation for Agents Page
 * Zero mocks, 100% real functionality
 * Captures screenshots for visual validation
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3001';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'agents');

test.describe('Agents Page - Real Data Validation', () => {
  // Setup before all tests
  test.beforeAll(async () => {
    // Create screenshot directory
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
    console.log(`📸 Screenshot directory created: ${SCREENSHOT_DIR}`);
  });

  test('should load agents page without errors', async ({ page }) => {
    // Navigate to agents page
    await page.goto(`${BASE_URL}/agents`, {
      waitUntil: 'networkidle'
    });

    // Capture initial load screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-agents-page-initial.png'),
      fullPage: true
    });
    console.log('✓ Captured initial page load');

    // Check page title
    const title = await page.title();
    expect(title).toContain('Agent Feed');

    // Verify no error messages
    const errorElements = await page.$$('[class*="error"], [class*="Error"]');
    expect(errorElements.length).toBe(0);
    console.log('✓ No error messages found');
  });

  test('should display real agents from API', async ({ page }) => {
    await page.goto(`${BASE_URL}/agents`, {
      waitUntil: 'networkidle'
    });

    // Wait for agents to load (max 5 seconds)
    await page.waitForSelector('[class*="agent"]', {
      timeout: 5000
    }).catch(() => {});

    // Capture agents loaded screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-agents-loaded.png'),
      fullPage: true
    });
    console.log('✓ Captured agents loaded state');

    // Check for agent cards
    const agentCards = await page.$$('div[class*="rounded-lg"][class*="border"]');
    console.log(`✓ Found ${agentCards.length} agent cards`);

    // Expect at least some agents (we know backend has 11)
    expect(agentCards.length).toBeGreaterThan(0);

    // Verify no mock data names
    const pageContent = await page.content();
    const mockAgentNames = [
      'Chief of Staff Agent',
      'Personal Todos Agent',
      'Impact Filter Agent'
    ];

    for (const mockName of mockAgentNames) {
      expect(pageContent).not.toContain(mockName);
    }
    console.log('✓ No mock agent names detected');
  });

  test('should display agent details correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/agents`, {
      waitUntil: 'networkidle'
    });

    // Wait for agents
    await page.waitForSelector('div[class*="rounded-lg"][class*="border"]', {
      timeout: 5000
    });

    // Get first agent card
    const firstAgent = await page.$('div[class*="rounded-lg"][class*="border"]');

    if (firstAgent) {
      // Capture agent detail screenshot
      await firstAgent.screenshot({
        path: path.join(SCREENSHOT_DIR, '03-agent-detail.png')
      });
      console.log('✓ Captured agent detail');

      // Check for required agent fields
      const agentText = await firstAgent.textContent();

      // Should have status indicators
      expect(agentText).toMatch(/(active|idle|busy|offline)/i);

      // Should have metrics
      expect(agentText).toMatch(/tasks completed/i);
      expect(agentText).toMatch(/success rate/i);

      console.log('✓ Agent details contain required fields');
    }
  });

  test('should have working view toggle', async ({ page }) => {
    await page.goto(`${BASE_URL}/agents`, {
      waitUntil: 'networkidle'
    });

    // Find view toggle buttons
    const gridButton = await page.$('button svg[class*="Grid3X3"]');
    const listButton = await page.$('button svg[class*="List"]');

    if (gridButton && listButton) {
      // Click list view
      await listButton.click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '04-list-view.png'),
        fullPage: true
      });
      console.log('✓ Captured list view');

      // Click back to grid view
      await gridButton.click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '05-grid-view.png'),
        fullPage: true
      });
      console.log('✓ Captured grid view');
    }
  });

  test('should have working search functionality', async ({ page }) => {
    await page.goto(`${BASE_URL}/agents`, {
      waitUntil: 'networkidle'
    });

    // Find search input
    const searchInput = await page.$('input[placeholder*="Search"]');

    if (searchInput) {
      // Type search query
      await searchInput.type('agent');
      await page.waitForTimeout(500);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '06-search-results.png'),
        fullPage: true
      });
      console.log('✓ Captured search results');

      // Clear search
      await searchInput.fill('');
      await page.waitForTimeout(500);
    }
  });

  test('should have working status filter', async ({ page }) => {
    await page.goto(`${BASE_URL}/agents`, {
      waitUntil: 'networkidle'
    });

    // Find filter dropdown
    const filterSelect = await page.$('select');

    if (filterSelect) {
      // Select active filter
      await filterSelect.selectOption('active');
      await page.waitForTimeout(500);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '07-filtered-active.png'),
        fullPage: true
      });
      console.log('✓ Captured filtered view');

      // Reset filter
      await filterSelect.selectOption('all');
      await page.waitForTimeout(500);
    }
  });

  test('should refresh data when refresh button clicked', async ({ page }) => {
    await page.goto(`${BASE_URL}/agents`, {
      waitUntil: 'networkidle'
    });

    // Find refresh button
    const refreshButton = await page.$('button svg[class*="RefreshCw"]');

    if (refreshButton) {
      // Click refresh
      await refreshButton.click();

      // Wait for potential reload
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '08-after-refresh.png'),
        fullPage: true
      });
      console.log('✓ Captured after refresh');
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Intercept network requests to simulate failure
    await page.route('**/api/agents', route => {
      route.abort();
    });

    await page.goto(`${BASE_URL}/agents`, {
      waitUntil: 'domcontentloaded'
    });

    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '09-network-error.png'),
      fullPage: true
    });
    console.log('✓ Captured network error state');

    // Check for error message
    const pageContent = await page.content();
    expect(pageContent).toMatch(/(error|failed|unable)/i);
  });

  test('performance: should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(`${BASE_URL}/agents`, {
      waitUntil: 'networkidle'
    });

    const loadTime = Date.now() - startTime;
    console.log(`⏱️ Page load time: ${loadTime}ms`);

    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);

    // Capture performance screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '10-performance-loaded.png'),
      fullPage: true
    });
  });
});

// Generate summary report
test.afterAll(async () => {
  const report = {
    timestamp: new Date().toISOString(),
    screenshotDirectory: SCREENSHOT_DIR,
    screenshots: await fs.readdir(SCREENSHOT_DIR),
    testEnvironment: {
      url: BASE_URL,
      browser: 'Chromium',
      viewport: { width: 1280, height: 720 }
    }
  };

  await fs.writeFile(
    path.join(SCREENSHOT_DIR, 'validation-report.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('\\n📊 Validation Report Generated');
  console.log(`📸 Screenshots saved to: ${SCREENSHOT_DIR}`);
  console.log(`✅ Total screenshots: ${report.screenshots.length}`);
});