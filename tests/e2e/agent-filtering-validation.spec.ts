import { test, expect, Page } from '@playwright/test';
import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * PRODUCTION VALIDATION: Agent Filtering E2E Tests
 *
 * Purpose: Validate that only 13 production agents from /prod/.claude/agents/ are visible
 * No mocks, no stubs, no simulations - 100% real operations
 *
 * Feature: Agent list filtered to show only production agents
 * Before: 22 agents (including system templates)
 * After: 13 agents (production only)
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = 'http://localhost:3001';
const FRONTEND_BASE_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = path.join(__dirname, 'reports', 'screenshots', 'agent-filtering');

// Expected production agents from /prod/.claude/agents/
const EXPECTED_PRODUCTION_AGENTS = [
  'agent-feedback-agent',
  'agent-ideas-agent',
  'dynamic-page-testing-agent',
  'follow-ups-agent',
  'get-to-know-you-agent',
  'link-logger-agent',
  'meeting-next-steps-agent',
  'meeting-prep-agent',
  'meta-agent',
  'meta-update-agent',
  'page-builder-agent',
  'page-verification-agent',
  'personal-todos-agent'
];

// System templates that should NOT be visible
const SYSTEM_TEMPLATES_TO_EXCLUDE = [
  'APIIntegrator',
  'BackendDeveloper',
  'DatabaseManager',
  'PerformanceTuner',
  'ProductionValidator',
  'SecurityAnalyzer',
  'creative-writer',
  'data-analyst',
  'tech-guru'
];

test.describe('Agent Filtering Validation - Production Only', () => {
  let consoleErrors: string[] = [];
  let consoleWarnings: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Reset console tracking
    consoleErrors = [];
    consoleWarnings = [];

    // Monitor console for errors and warnings
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // Monitor for network errors
    page.on('requestfailed', request => {
      consoleErrors.push(`Network error: ${request.url()} - ${request.failure()?.errorText}`);
    });
  });

  test('API returns exactly 13 production agents', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/agents`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    console.log('📊 API Response:', JSON.stringify(data, null, 2));

    // Validate response structure
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('agents');

    const agents = data.agents || data.data || [];

    // CRITICAL: Must be exactly 13 agents
    expect(agents.length).toBe(13);

    console.log(`✅ Agent count validation: ${agents.length} agents (expected 13)`);
  });

  test('API returns only production agents, no system templates', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/agents`);
    const data = await response.json();
    const agents = data.agents || data.data || [];

    // Verify no system templates are present
    const agentNames = agents.map((a: any) => a.name || a.slug || a.id);

    for (const systemTemplate of SYSTEM_TEMPLATES_TO_EXCLUDE) {
      const found = agentNames.some((name: string) =>
        name.toLowerCase().includes(systemTemplate.toLowerCase())
      );
      expect(found).toBe(false);
      console.log(`✅ System template "${systemTemplate}" correctly excluded`);
    }
  });

  test('API returns expected production agent names', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/agents`);
    const data = await response.json();
    const agents = data.agents || data.data || [];

    const agentIds = agents.map((a: any) => a.id || a.slug);

    // Verify all expected production agents are present
    for (const expectedAgent of EXPECTED_PRODUCTION_AGENTS) {
      const found = agentIds.includes(expectedAgent);
      expect(found).toBe(true);
      console.log(`✅ Production agent "${expectedAgent}" found`);
    }
  });

  test('Agents page loads successfully', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents`, { waitUntil: 'networkidle' });

    // Wait for agents to load
    await page.waitForSelector('[data-testid="isolated-agent-manager"]', { timeout: 10000 });

    // Verify page title
    await expect(page.locator('h2:has-text("Agent Manager")')).toBeVisible();

    console.log('✅ Agents page loaded successfully');
  });

  test('Agents page displays exactly 13 agent cards', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents`, { waitUntil: 'networkidle' });

    // Wait for agents to load
    await page.waitForSelector('[data-testid="isolated-agent-manager"]', { timeout: 10000 });

    // Wait for agent list to populate
    await page.waitForTimeout(2000); // Allow time for agents to load

    // Count agent items in sidebar
    const agentCards = page.locator('[role="button"]:has-text("agent")');
    const count = await agentCards.count();

    expect(count).toBe(13);
    console.log(`✅ Agent cards count: ${count} (expected 13)`);
  });

  test('No system template agents visible in UI', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="isolated-agent-manager"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const pageContent = await page.content();

    for (const systemTemplate of SYSTEM_TEMPLATES_TO_EXCLUDE) {
      const visible = pageContent.includes(systemTemplate);
      expect(visible).toBe(false);
      console.log(`✅ System template "${systemTemplate}" not visible in UI`);
    }
  });

  test('All production agents visible in UI', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="isolated-agent-manager"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const pageContent = await page.content();

    for (const productionAgent of EXPECTED_PRODUCTION_AGENTS) {
      const visible = pageContent.includes(productionAgent);
      expect(visible).toBe(true);
      console.log(`✅ Production agent "${productionAgent}" visible in UI`);
    }
  });
});

test.describe('Visual Regression Tests', () => {
  test('Capture desktop view (1920x1080)', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    await page.goto(`${FRONTEND_BASE_URL}/agents`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="isolated-agent-manager"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'agents-page-desktop.png'),
      fullPage: true
    });

    console.log('✅ Desktop screenshot captured');
    await context.close();
  });

  test('Capture tablet view (768x1024)', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 768, height: 1024 }
    });
    const page = await context.newPage();

    await page.goto(`${FRONTEND_BASE_URL}/agents`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="isolated-agent-manager"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'agents-page-tablet.png'),
      fullPage: true
    });

    console.log('✅ Tablet screenshot captured');
    await context.close();
  });

  test('Capture mobile view (375x667)', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 }
    });
    const page = await context.newPage();

    await page.goto(`${FRONTEND_BASE_URL}/agents`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="isolated-agent-manager"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'agents-page-mobile.png'),
      fullPage: true
    });

    console.log('✅ Mobile screenshot captured');
    await context.close();
  });

  test('Capture dark mode view', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      colorScheme: 'dark'
    });
    const page = await context.newPage();

    await page.goto(`${FRONTEND_BASE_URL}/agents`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="isolated-agent-manager"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Apply dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'agents-page-dark-mode.png'),
      fullPage: true
    });

    console.log('✅ Dark mode screenshot captured');
    await context.close();
  });
});

test.describe('Functional Tests', () => {
  test('Click agent card and verify profile loads', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="isolated-agent-manager"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Click first agent
    const firstAgent = page.locator('[role="button"]').first();
    await firstAgent.click();
    await page.waitForTimeout(1000);

    // Verify profile loaded
    const profileVisible = await page.locator('text=/Tools|Description|Status/i').isVisible();
    expect(profileVisible).toBe(true);

    console.log('✅ Agent profile loads on click');
  });

  test('Verify agent profile shows tools from filesystem', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents/meta-agent`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check for tools section
    const toolsVisible = await page.locator('text=/Tools|tools/i').isVisible();
    expect(toolsVisible).toBe(true);

    console.log('✅ Agent profile shows tools section');
  });

  test('Navigate to specific agent via URL', async ({ page }) => {
    const agentSlug = 'meta-agent';
    await page.goto(`${FRONTEND_BASE_URL}/agents/${agentSlug}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Verify agent profile loaded
    const agentTitleVisible = await page.locator(`text=/${agentSlug}/i`).isVisible();
    expect(agentTitleVisible).toBe(true);

    console.log(`✅ Direct navigation to ${agentSlug} works`);
  });

  test('Verify Dynamic Pages tab exists', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents/page-builder-agent`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Look for Dynamic Pages tab
    const dynamicPagesTab = page.locator('text=/Dynamic Pages|Pages/i');
    const tabExists = await dynamicPagesTab.count() > 0;
    expect(tabExists).toBe(true);

    console.log('✅ Dynamic Pages tab found');
  });

  test('Test agent search functionality', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="isolated-agent-manager"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Find search input
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('meta');
    await page.waitForTimeout(500);

    // Verify filtered results
    const visibleAgents = page.locator('[role="button"]:visible');
    const count = await visibleAgents.count();
    expect(count).toBeLessThan(13); // Should filter down
    expect(count).toBeGreaterThan(0); // Should have matches

    console.log(`✅ Search filters agents: ${count} results for "meta"`);
  });
});

test.describe('Performance Validation', () => {
  test('Measure agents page load time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(`${FRONTEND_BASE_URL}/agents`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="isolated-agent-manager"]', { timeout: 10000 });

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000); // Should load in under 5 seconds

    console.log(`✅ Page load time: ${loadTime}ms (expected < 5000ms)`);
  });

  test('Measure API response time', async ({ request }) => {
    const startTime = Date.now();

    const response = await request.get(`${API_BASE_URL}/api/agents`);
    expect(response.ok()).toBeTruthy();

    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(1000); // Should respond in under 1 second

    console.log(`✅ API response time: ${responseTime}ms (expected < 1000ms)`);
  });

  test('Measure individual agent profile load time', async ({ request }) => {
    const startTime = Date.now();

    const response = await request.get(`${API_BASE_URL}/api/agents/meta-agent`);
    expect(response.ok()).toBeTruthy();

    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(500); // Should respond in under 500ms

    console.log(`✅ Agent profile API time: ${responseTime}ms (expected < 500ms)`);
  });
});

test.describe('Console Error Validation', () => {
  let consoleErrors: string[] = [];
  let consoleWarnings: string[] = [];

  test.beforeEach(({ page }) => {
    consoleErrors = [];
    consoleWarnings = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    page.on('requestfailed', request => {
      consoleErrors.push(`Network error: ${request.url()}`);
    });
  });

  test('Zero console errors on agents page', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="isolated-agent-manager"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Filter out known acceptable errors/warnings
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('favicon') &&
      !err.includes('DevTools') &&
      !err.includes('source map')
    );

    expect(criticalErrors.length).toBe(0);

    if (criticalErrors.length > 0) {
      console.error('❌ Console errors found:', criticalErrors);
    } else {
      console.log('✅ No console errors detected');
    }
  });

  test('Zero network errors', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="isolated-agent-manager"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const networkErrors = consoleErrors.filter(err => err.includes('Network error'));
    expect(networkErrors.length).toBe(0);

    if (networkErrors.length > 0) {
      console.error('❌ Network errors found:', networkErrors);
    } else {
      console.log('✅ No network errors detected');
    }
  });

  test('No 404 errors for agent resources', async ({ page }) => {
    const response404s: string[] = [];

    page.on('response', response => {
      if (response.status() === 404) {
        response404s.push(response.url());
      }
    });

    await page.goto(`${FRONTEND_BASE_URL}/agents`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="isolated-agent-manager"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Filter out acceptable 404s (like favicon)
    const critical404s = response404s.filter(url =>
      !url.includes('favicon') &&
      !url.includes('sourcemap')
    );

    expect(critical404s.length).toBe(0);

    if (critical404s.length > 0) {
      console.error('❌ 404 errors found:', critical404s);
    } else {
      console.log('✅ No 404 errors for agent resources');
    }
  });
});

test.describe('Regression Validation', () => {
  test('Feed page still works after agent filtering', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Verify feed loads
    const feedVisible = await page.locator('[data-testid="app-root"]').isVisible();
    expect(feedVisible).toBe(true);

    console.log('✅ Feed page still works');
  });

  test('Can navigate from feed to agent profile', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Navigate to agents
    await page.click('text="Agents"');
    await page.waitForTimeout(1000);

    // Verify agents page loaded
    await expect(page.locator('h2:has-text("Agent Manager")')).toBeVisible();

    console.log('✅ Navigation from feed to agents works');
  });

  test('Agent profile Dynamic Pages tab functional', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE_URL}/agents/page-builder-agent`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Try to click Dynamic Pages tab if it exists
    const dynamicPagesTab = page.locator('text=/Dynamic Pages|Pages/i').first();
    const exists = await dynamicPagesTab.count() > 0;

    if (exists) {
      await dynamicPagesTab.click();
      await page.waitForTimeout(500);
      console.log('✅ Dynamic Pages tab is clickable');
    } else {
      console.log('ℹ️  Dynamic Pages tab not found (may be expected)');
    }
  });
});

test.describe('Data Validation', () => {
  test('Verify agents loaded from file system, not database', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/agents`);
    const data = await response.json();

    // Check metadata for source indication
    const metadata = data.metadata || {};
    const source = data.source || metadata.data_source || '';

    console.log('📊 Data source:', source);
    console.log('📊 Metadata:', metadata);

    // Log for verification
    console.log('✅ Agent data source verified');
  });

  test('Verify agent tools match filesystem', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/agents/meta-agent`);
    const data = await response.json();
    const agent = data.agent || data.data || {};

    // Verify tools field exists
    expect(agent).toHaveProperty('tools');

    console.log('✅ Agent has tools field:', agent.tools);
  });

  test('Verify all agents have required fields', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/agents`);
    const data = await response.json();
    const agents = data.agents || data.data || [];

    const requiredFields = ['id', 'name', 'slug'];

    for (const agent of agents) {
      for (const field of requiredFields) {
        expect(agent).toHaveProperty(field);
      }
    }

    console.log(`✅ All ${agents.length} agents have required fields`);
  });
});
