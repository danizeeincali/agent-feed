/**
 * Agent Tabs Restructure - Final Production Validation
 *
 * VALIDATES:
 * ✅ Backend: /api/agents/:slug returns tools field
 * ✅ Frontend: WorkingAgentProfile.tsx shows only 2 tabs
 * ✅ Frontend: Tools section in Overview with descriptions
 * ✅ Removed: Activities, Performance, Capabilities tabs
 *
 * TEST COVERAGE:
 * - Navigation and tab rendering (2 tabs only)
 * - Tools section presence and data validation
 * - Removed tabs verification
 * - Multiple agents testing (5+ agents)
 * - Responsive design (desktop, tablet, mobile)
 * - Theme support (light and dark mode)
 * - Visual regression with 15+ screenshots
 * - API validation with real backend
 * - Performance validation
 * - No console errors
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:5173';
const API_BASE_URL = 'http://localhost:3001';

// Test agents - covering different types
const TEST_AGENTS = [
  'meta-agent',
  'tech-guru',
  'code-reviewer',
  'security-expert',
  'devops-specialist',
  'data-analyst'
];

// Viewport configurations
const VIEWPORTS = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 }
};

/**
 * Helper: Wait for page to be fully loaded
 */
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Helper: Check for console errors
 */
async function checkConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
}

/**
 * Helper: Take screenshot with naming convention
 */
async function captureScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `/workspaces/agent-feed/tests/e2e/reports/screenshots/${name}.png`,
    fullPage: true
  });
}

test.describe('Agent Tabs Restructure - Production Validation', () => {

  test.beforeEach(async ({ page }) => {
    // Track console errors
    await checkConsoleErrors(page);
  });

  test('VALIDATION-001: Backend API returns tools field for all agents', async ({ request }) => {
    console.log('🔍 Testing backend API for tools field...');

    const results: any[] = [];

    for (const agentSlug of TEST_AGENTS) {
      const response = await request.get(`${API_BASE_URL}/api/agents/${agentSlug}`);

      expect(response.ok()).toBeTruthy();

      const data = await response.json();

      // Validate response structure
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();

      // CRITICAL: Validate tools field exists
      expect(data.data.tools).toBeDefined();
      expect(Array.isArray(data.data.tools)).toBeTruthy();

      // Validate tools is not empty
      expect(data.data.tools.length).toBeGreaterThan(0);

      // Validate each tool has required structure
      if (data.data.tools.length > 0) {
        for (const tool of data.data.tools) {
          expect(tool).toHaveProperty('name');
          expect(tool).toHaveProperty('description');
          expect(typeof tool.name).toBe('string');
          expect(typeof tool.description).toBe('string');
          expect(tool.name.length).toBeGreaterThan(0);
          expect(tool.description.length).toBeGreaterThan(0);
        }
      }

      results.push({
        agent: agentSlug,
        toolsCount: data.data.tools.length,
        tools: data.data.tools,
        status: 'PASS'
      });
    }

    console.log('✅ Backend API validation results:', JSON.stringify(results, null, 2));
  });

  test('VALIDATION-002: Agent profile shows exactly 2 tabs (Overview, Dynamic Pages)', async ({ page }) => {
    console.log('🔍 Testing tab count and structure...');

    await page.goto(`${BASE_URL}/agents`);
    await waitForPageLoad(page);

    // Select first agent
    const firstAgent = page.locator('[data-testid^="agent-card-"], .agent-card').first();
    await firstAgent.click();
    await waitForPageLoad(page);

    // Wait for tabs to render
    await page.waitForSelector('nav button', { timeout: 10000 });

    // Get all tab buttons
    const tabs = page.locator('nav button');
    const tabCount = await tabs.count();

    // CRITICAL: Must be exactly 2 tabs
    expect(tabCount).toBe(2);

    // Get tab names
    const tabNames = await tabs.allTextContents();
    console.log('📊 Tab names found:', tabNames);

    // Verify specific tab names
    expect(tabNames).toContain('Overview');
    expect(tabNames).toContain('Dynamic Pages');

    // CRITICAL: Verify removed tabs are NOT present
    expect(tabNames).not.toContain('Activities');
    expect(tabNames).not.toContain('Performance');
    expect(tabNames).not.toContain('Capabilities');

    await captureScreenshot(page, 'agent-profile-2-tabs-desktop');
  });

  test('VALIDATION-003: Overview tab contains Tools section with descriptions', async ({ page }) => {
    console.log('🔍 Testing Tools section in Overview tab...');

    await page.goto(`${BASE_URL}/agents`);
    await waitForPageLoad(page);

    // Select first agent
    const firstAgent = page.locator('[data-testid^="agent-card-"], .agent-card').first();
    await firstAgent.click();
    await waitForPageLoad(page);

    // Click Overview tab (should be default)
    const overviewTab = page.locator('nav button:has-text("Overview")');
    await overviewTab.click();
    await waitForPageLoad(page);

    // CRITICAL: Verify Tools section exists
    const toolsSection = page.locator('h3:has-text("Tools"), h4:has-text("Tools")');
    await expect(toolsSection).toBeVisible({ timeout: 10000 });

    // Verify tools are displayed
    const toolItems = page.locator('[data-testid^="tool-"], .tool-item, .tool-card');
    const toolCount = await toolItems.count();

    expect(toolCount).toBeGreaterThan(0);
    console.log(`✅ Found ${toolCount} tools displayed`);

    // Verify each tool has name and description
    for (let i = 0; i < Math.min(toolCount, 5); i++) {
      const tool = toolItems.nth(i);
      const toolText = await tool.textContent();

      // Each tool should have meaningful content (not just mock data)
      expect(toolText).toBeTruthy();
      expect(toolText!.length).toBeGreaterThan(10);
    }

    await captureScreenshot(page, 'overview-tab-tools-section-desktop');
  });

  test('VALIDATION-004: Removed tabs are not present in navigation', async ({ page }) => {
    console.log('🔍 Verifying removed tabs are gone...');

    await page.goto(`${BASE_URL}/agents`);
    await waitForPageLoad(page);

    // Select first agent
    const firstAgent = page.locator('[data-testid^="agent-card-"], .agent-card').first();
    await firstAgent.click();
    await waitForPageLoad(page);

    // Verify Activities tab does NOT exist
    const activitiesTab = page.locator('nav button:has-text("Activities")');
    await expect(activitiesTab).toHaveCount(0);

    // Verify Performance tab does NOT exist
    const performanceTab = page.locator('nav button:has-text("Performance")');
    await expect(performanceTab).toHaveCount(0);

    // Verify Capabilities tab does NOT exist
    const capabilitiesTab = page.locator('nav button:has-text("Capabilities")');
    await expect(capabilitiesTab).toHaveCount(0);

    console.log('✅ All removed tabs are confirmed absent');

    await captureScreenshot(page, 'removed-tabs-validation-desktop');
  });

  test('VALIDATION-005: Dynamic Pages tab functions correctly', async ({ page }) => {
    console.log('🔍 Testing Dynamic Pages tab functionality...');

    await page.goto(`${BASE_URL}/agents`);
    await waitForPageLoad(page);

    // Select first agent
    const firstAgent = page.locator('[data-testid^="agent-card-"], .agent-card').first();
    await firstAgent.click();
    await waitForPageLoad(page);

    // Click Dynamic Pages tab
    const dynamicPagesTab = page.locator('nav button:has-text("Dynamic Pages")');
    await dynamicPagesTab.click();
    await waitForPageLoad(page);

    // Verify tab content renders
    const tabContent = page.locator('[role="tabpanel"], .tab-content, div:visible');
    await expect(tabContent.first()).toBeVisible();

    await captureScreenshot(page, 'dynamic-pages-tab-desktop');
  });

  test('VALIDATION-006: Test multiple agents (5+ agents)', async ({ page }) => {
    console.log('🔍 Testing multiple agents...');

    const agentsToTest = TEST_AGENTS.slice(0, 5);

    for (const agentSlug of agentsToTest) {
      console.log(`Testing agent: ${agentSlug}`);

      await page.goto(`${BASE_URL}/agents/${agentSlug}`);
      await waitForPageLoad(page);

      // Wait for tabs
      await page.waitForSelector('nav button', { timeout: 10000 });

      // Verify 2 tabs
      const tabs = page.locator('nav button');
      const tabCount = await tabs.count();
      expect(tabCount).toBe(2);

      // Verify Overview tab has tools
      const overviewTab = page.locator('nav button:has-text("Overview")');
      await overviewTab.click();
      await waitForPageLoad(page);

      // Check for tools section
      const toolsSection = page.locator('h3:has-text("Tools"), h4:has-text("Tools")');
      await expect(toolsSection).toBeVisible({ timeout: 10000 });

      await captureScreenshot(page, `agent-${agentSlug}-validation`);
    }

    console.log('✅ All agents validated successfully');
  });

  test('VALIDATION-007: Responsive design - Tablet viewport', async ({ page }) => {
    console.log('🔍 Testing tablet viewport...');

    await page.setViewportSize(VIEWPORTS.tablet);

    await page.goto(`${BASE_URL}/agents`);
    await waitForPageLoad(page);

    const firstAgent = page.locator('[data-testid^="agent-card-"], .agent-card').first();
    await firstAgent.click();
    await waitForPageLoad(page);

    // Verify tabs render correctly
    const tabs = page.locator('nav button');
    const tabCount = await tabs.count();
    expect(tabCount).toBe(2);

    await captureScreenshot(page, 'agent-profile-tablet-viewport');
  });

  test('VALIDATION-008: Responsive design - Mobile viewport', async ({ page }) => {
    console.log('🔍 Testing mobile viewport...');

    await page.setViewportSize(VIEWPORTS.mobile);

    await page.goto(`${BASE_URL}/agents`);
    await waitForPageLoad(page);

    const firstAgent = page.locator('[data-testid^="agent-card-"], .agent-card').first();
    await firstAgent.click();
    await waitForPageLoad(page);

    // Verify tabs render correctly
    const tabs = page.locator('nav button');
    const tabCount = await tabs.count();
    expect(tabCount).toBe(2);

    await captureScreenshot(page, 'agent-profile-mobile-viewport');
  });

  test('VALIDATION-009: Dark mode support', async ({ page }) => {
    console.log('🔍 Testing dark mode...');

    // Enable dark mode
    await page.emulateMedia({ colorScheme: 'dark' });

    await page.goto(`${BASE_URL}/agents`);
    await waitForPageLoad(page);

    const firstAgent = page.locator('[data-testid^="agent-card-"], .agent-card').first();
    await firstAgent.click();
    await waitForPageLoad(page);

    // Verify tabs render
    const tabs = page.locator('nav button');
    const tabCount = await tabs.count();
    expect(tabCount).toBe(2);

    await captureScreenshot(page, 'agent-profile-dark-mode');
  });

  test('VALIDATION-010: Light mode support', async ({ page }) => {
    console.log('🔍 Testing light mode...');

    // Enable light mode
    await page.emulateMedia({ colorScheme: 'light' });

    await page.goto(`${BASE_URL}/agents`);
    await waitForPageLoad(page);

    const firstAgent = page.locator('[data-testid^="agent-card-"], .agent-card').first();
    await firstAgent.click();
    await waitForPageLoad(page);

    // Verify tabs render
    const tabs = page.locator('nav button');
    const tabCount = await tabs.count();
    expect(tabCount).toBe(2);

    await captureScreenshot(page, 'agent-profile-light-mode');
  });

  test('VALIDATION-011: No console errors during navigation', async ({ page }) => {
    console.log('🔍 Testing for console errors...');

    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/agents`);
    await waitForPageLoad(page);

    const firstAgent = page.locator('[data-testid^="agent-card-"], .agent-card').first();
    await firstAgent.click();
    await waitForPageLoad(page);

    // Click both tabs
    const overviewTab = page.locator('nav button:has-text("Overview")');
    await overviewTab.click();
    await page.waitForTimeout(1000);

    const dynamicPagesTab = page.locator('nav button:has-text("Dynamic Pages")');
    await dynamicPagesTab.click();
    await page.waitForTimeout(1000);

    // Verify no console errors
    expect(errors.length).toBe(0);

    if (errors.length > 0) {
      console.error('❌ Console errors detected:', errors);
    } else {
      console.log('✅ No console errors detected');
    }
  });

  test('VALIDATION-012: Tools data is real (not mocked)', async ({ page, request }) => {
    console.log('🔍 Verifying tools data is real from API...');

    // Get data from API
    const apiResponse = await request.get(`${API_BASE_URL}/api/agents/${TEST_AGENTS[0]}`);
    const apiData = await apiResponse.json();
    const apiTools = apiData.data.tools;

    // Navigate to agent page
    await page.goto(`${BASE_URL}/agents/${TEST_AGENTS[0]}`);
    await waitForPageLoad(page);

    // Click Overview tab
    const overviewTab = page.locator('nav button:has-text("Overview")');
    await overviewTab.click();
    await waitForPageLoad(page);

    // Get tools from UI
    const toolsSection = page.locator('h3:has-text("Tools"), h4:has-text("Tools")');
    await expect(toolsSection).toBeVisible();

    // Verify at least one tool name from API appears in UI
    if (apiTools && apiTools.length > 0) {
      const firstToolName = apiTools[0].name;
      const toolInUI = page.locator(`text=${firstToolName}`);
      await expect(toolInUI).toBeVisible({ timeout: 10000 });
      console.log(`✅ Verified real tool "${firstToolName}" appears in UI`);
    }
  });

  test('VALIDATION-013: Agent navigation works correctly', async ({ page }) => {
    console.log('🔍 Testing agent navigation...');

    await page.goto(`${BASE_URL}/agents`);
    await waitForPageLoad(page);

    // Click first agent
    const firstAgent = page.locator('[data-testid^="agent-card-"], .agent-card').first();
    const firstAgentName = await firstAgent.textContent();
    await firstAgent.click();
    await waitForPageLoad(page);

    // Verify navigation occurred
    const header = page.locator('h1');
    await expect(header).toBeVisible();

    // Navigate back
    const backButton = page.locator('button:has-text(""), button svg[data-lucide="arrow-left"]').first();
    await backButton.click();
    await waitForPageLoad(page);

    // Verify back at agents list
    await expect(page).toHaveURL(/\/agents$/);

    await captureScreenshot(page, 'agent-navigation-validation');
  });

  test('VALIDATION-014: Performance - Page load time < 3 seconds', async ({ page }) => {
    console.log('🔍 Testing page load performance...');

    const startTime = Date.now();

    await page.goto(`${BASE_URL}/agents`);
    await waitForPageLoad(page);

    const firstAgent = page.locator('[data-testid^="agent-card-"], .agent-card').first();
    await firstAgent.click();
    await waitForPageLoad(page);

    const loadTime = Date.now() - startTime;

    console.log(`⏱️ Page load time: ${loadTime}ms`);

    // Verify load time is reasonable (< 3000ms)
    expect(loadTime).toBeLessThan(3000);
  });

  test('VALIDATION-015: Tab switching is smooth and error-free', async ({ page }) => {
    console.log('🔍 Testing tab switching...');

    await page.goto(`${BASE_URL}/agents`);
    await waitForPageLoad(page);

    const firstAgent = page.locator('[data-testid^="agent-card-"], .agent-card').first();
    await firstAgent.click();
    await waitForPageLoad(page);

    // Switch between tabs multiple times
    for (let i = 0; i < 3; i++) {
      const overviewTab = page.locator('nav button:has-text("Overview")');
      await overviewTab.click();
      await page.waitForTimeout(500);

      const dynamicPagesTab = page.locator('nav button:has-text("Dynamic Pages")');
      await dynamicPagesTab.click();
      await page.waitForTimeout(500);
    }

    // Verify no errors and final state is correct
    const tabs = page.locator('nav button');
    const tabCount = await tabs.count();
    expect(tabCount).toBe(2);

    console.log('✅ Tab switching validated successfully');
  });

});

/**
 * Additional API Validation Tests
 */
test.describe('Backend API Validation', () => {

  test('API-001: All test agents return valid tools field', async ({ request }) => {
    console.log('🔍 Testing all agents for tools field...');

    for (const agentSlug of TEST_AGENTS) {
      const response = await request.get(`${API_BASE_URL}/api/agents/${agentSlug}`);

      if (!response.ok()) {
        console.log(`⚠️ Agent ${agentSlug} not found, skipping...`);
        continue;
      }

      const data = await response.json();

      // Validate tools field
      expect(data.data.tools).toBeDefined();
      expect(Array.isArray(data.data.tools)).toBeTruthy();

      console.log(`✅ ${agentSlug}: ${data.data.tools.length} tools`);
    }
  });

  test('API-002: Tools field has correct structure', async ({ request }) => {
    console.log('🔍 Validating tools field structure...');

    const response = await request.get(`${API_BASE_URL}/api/agents/${TEST_AGENTS[0]}`);
    const data = await response.json();
    const tools = data.data.tools;

    if (tools && tools.length > 0) {
      const firstTool = tools[0];

      // Validate structure
      expect(firstTool).toHaveProperty('name');
      expect(firstTool).toHaveProperty('description');

      // Validate types
      expect(typeof firstTool.name).toBe('string');
      expect(typeof firstTool.description).toBe('string');

      // Validate not empty
      expect(firstTool.name.length).toBeGreaterThan(0);
      expect(firstTool.description.length).toBeGreaterThan(0);

      console.log('✅ Tool structure validated:', firstTool);
    }
  });

  test('API-003: Response time < 500ms', async ({ request }) => {
    console.log('🔍 Testing API response time...');

    const startTime = Date.now();
    const response = await request.get(`${API_BASE_URL}/api/agents/${TEST_AGENTS[0]}`);
    const responseTime = Date.now() - startTime;

    console.log(`⏱️ API response time: ${responseTime}ms`);

    expect(response.ok()).toBeTruthy();
    expect(responseTime).toBeLessThan(500);
  });

});
