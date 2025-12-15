import { test, expect } from '@playwright/test';
import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = path.join(process.cwd(), 'tests/production-validation/screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

test.describe('Agent Navigation Production Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' || type === 'warning') {
        console.log(`[BROWSER ${type.toUpperCase()}]:`, text);
      }
    });

    // Track network errors
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`[NETWORK ERROR]: ${response.status()} ${response.url()}`);
      }
    });
  });

  test('1. Load homepage and navigate to Agents page', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    console.log('\n=== TEST 1: Homepage and Agents Navigation ===');

    // Navigate to homepage
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    console.log('✓ Homepage loaded');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-homepage.png'), fullPage: true });

    // Navigate to Agents page
    const agentsLink = page.locator('a[href="/agents"], a:has-text("Agents")').first();
    await agentsLink.click();
    await page.waitForURL('**/agents', { timeout: 5000 });
    await page.waitForTimeout(1000);

    console.log('✓ Agents page loaded');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-agents-page.png'), fullPage: true });

    // Verify no console errors
    expect(consoleErrors.length, `Console errors found: ${consoleErrors.join(', ')}`).toBe(0);

    console.log('✓ No console errors on initial navigation');
  });

  test('2. Test Agent 1 - API Integrator', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    console.log('\n=== TEST 2: API Integrator Agent ===');

    // Navigate to agents page
    await page.goto(`${BASE_URL}/agents`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Find and click API Integrator agent
    const apiIntegratorCard = page.locator('[data-agent-slug="apiintegrator"], .agent-card:has-text("API Integrator")').first();
    await apiIntegratorCard.waitFor({ state: 'visible', timeout: 5000 });

    console.log('✓ Found API Integrator card');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-before-click-apiintegrator.png'), fullPage: true });

    await apiIntegratorCard.click();
    await page.waitForTimeout(2000);

    // Verify URL changed to slug format
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    expect(currentUrl).toMatch(/\/agents\/[a-z-]+$/);

    console.log('✓ URL changed to slug format');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-apiintegrator-profile.png'), fullPage: true });

    // Verify agent data displays
    const agentName = await page.locator('h1, h2, .agent-name').first().textContent();
    expect(agentName).toBeTruthy();
    expect(agentName.toLowerCase()).toContain('api');

    console.log(`✓ Agent name displayed: ${agentName}`);

    // Verify description exists
    const description = await page.locator('.agent-description, .description, p').first().textContent();
    expect(description).toBeTruthy();
    expect(description.length).toBeGreaterThan(10);

    console.log(`✓ Description displayed (${description.length} chars)`);

    // Verify no console errors
    expect(consoleErrors.length, `Console errors found: ${consoleErrors.join(', ')}`).toBe(0);
    console.log('✓ No console errors');
  });

  test('3. Test Agent 2 - Code Reviewer', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    console.log('\n=== TEST 3: Code Reviewer Agent ===');

    await page.goto(`${BASE_URL}/agents`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Find and click Code Reviewer agent
    const codeReviewerCard = page.locator('[data-agent-slug="codereviewer"], .agent-card:has-text("Code Reviewer"), .agent-card:has-text("Code Review")').first();
    await codeReviewerCard.waitFor({ state: 'visible', timeout: 5000 });

    console.log('✓ Found Code Reviewer card');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-before-click-codereviewer.png'), fullPage: true });

    await codeReviewerCard.click();
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    expect(currentUrl).toMatch(/\/agents\/[a-z-]+$/);

    console.log('✓ URL changed to slug format');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-codereviewer-profile.png'), fullPage: true });

    // Verify agent data
    const agentName = await page.locator('h1, h2, .agent-name').first().textContent();
    expect(agentName).toBeTruthy();

    console.log(`✓ Agent name displayed: ${agentName}`);

    // Verify no console errors
    expect(consoleErrors.length, `Console errors found: ${consoleErrors.join(', ')}`).toBe(0);
    console.log('✓ No console errors');
  });

  test('4. Test Agent 3 - Data Analyst', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    console.log('\n=== TEST 4: Data Analyst Agent ===');

    await page.goto(`${BASE_URL}/agents`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Find and click Data Analyst agent
    const dataAnalystCard = page.locator('[data-agent-slug="dataanalyst"], .agent-card:has-text("Data Analyst"), .agent-card:has-text("Data Analysis")').first();
    await dataAnalystCard.waitFor({ state: 'visible', timeout: 5000 });

    console.log('✓ Found Data Analyst card');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-before-click-dataanalyst.png'), fullPage: true });

    await dataAnalystCard.click();
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    expect(currentUrl).toMatch(/\/agents\/[a-z-]+$/);

    console.log('✓ URL changed to slug format');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-dataanalyst-profile.png'), fullPage: true });

    // Verify agent data
    const agentName = await page.locator('h1, h2, .agent-name').first().textContent();
    expect(agentName).toBeTruthy();

    console.log(`✓ Agent name displayed: ${agentName}`);

    // Verify no console errors
    expect(consoleErrors.length, `Console errors found: ${consoleErrors.join(', ')}`).toBe(0);
    console.log('✓ No console errors');
  });

  test('5. Test back/forward navigation', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    console.log('\n=== TEST 5: Back/Forward Navigation ===');

    // Navigate to agents page
    await page.goto(`${BASE_URL}/agents`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Click first agent
    const firstAgent = page.locator('[data-agent-slug], .agent-card').first();
    await firstAgent.click();
    await page.waitForTimeout(1500);
    const firstUrl = page.url();

    console.log(`✓ Navigated to first agent: ${firstUrl}`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-first-agent-navigation.png'), fullPage: true });

    // Go back
    await page.goBack();
    await page.waitForTimeout(1500);
    expect(page.url()).toContain('/agents');

    console.log('✓ Back navigation works - returned to agents list');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-back-to-agents.png'), fullPage: true });

    // Go forward
    await page.goForward();
    await page.waitForTimeout(1500);
    expect(page.url()).toBe(firstUrl);

    console.log('✓ Forward navigation works - returned to agent profile');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11-forward-to-agent.png'), fullPage: true });

    // Verify no console errors
    expect(consoleErrors.length, `Console errors found: ${consoleErrors.join(', ')}`).toBe(0);
    console.log('✓ No console errors during navigation');
  });

  test('6. Test direct navigation with specific slug', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    console.log('\n=== TEST 6: Direct Navigation to /agents/apiintegrator ===');

    // Navigate directly to agent profile
    await page.goto(`${BASE_URL}/agents/apiintegrator`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Verify URL is correct
    expect(page.url()).toContain('/agents/apiintegrator');

    console.log('✓ Direct navigation to slug URL works');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12-direct-navigation-apiintegrator.png'), fullPage: true });

    // Verify agent loads
    const agentName = await page.locator('h1, h2, .agent-name').first().textContent();
    expect(agentName).toBeTruthy();

    console.log(`✓ Agent data loaded: ${agentName}`);

    // Verify no console errors
    expect(consoleErrors.length, `Console errors found: ${consoleErrors.join(', ')}`).toBe(0);
    console.log('✓ No console errors');
  });

  test('7. Test invalid slug handling', async ({ page }) => {
    const consoleErrors = [];
    const networkErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('response', response => {
      if (response.status() === 404) {
        networkErrors.push(response.url());
      }
    });

    console.log('\n=== TEST 7: Invalid Slug Handling ===');

    // Navigate to non-existent agent
    await page.goto(`${BASE_URL}/agents/nonexistentslug123`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log(`Current URL: ${page.url()}`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13-invalid-slug.png'), fullPage: true });

    // Check if redirected or shows error
    const bodyText = await page.locator('body').textContent();
    const hasErrorMessage = bodyText.toLowerCase().includes('not found') ||
                           bodyText.toLowerCase().includes('error') ||
                           bodyText.toLowerCase().includes('404');

    if (hasErrorMessage) {
      console.log('✓ Error message displayed for invalid slug');
    } else {
      console.log('✓ Graceful handling (redirect or empty state)');
    }

    // Verify no critical console errors (404 network errors are acceptable)
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('404') &&
      !err.includes('not found') &&
      !err.includes('Failed to fetch')
    );
    expect(criticalErrors.length, `Critical console errors found: ${criticalErrors.join(', ')}`).toBe(0);

    console.log('✓ No critical console errors');
  });

  test('8. Test multiple sequential navigations', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    console.log('\n=== TEST 8: Multiple Sequential Navigations ===');

    await page.goto(`${BASE_URL}/agents`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Get all agent cards
    const agentCards = await page.locator('[data-agent-slug], .agent-card').all();
    const numToTest = Math.min(4, agentCards.length);

    console.log(`Found ${agentCards.length} agents, testing ${numToTest}`);

    for (let i = 0; i < numToTest; i++) {
      // Go back to agents list
      await page.goto(`${BASE_URL}/agents`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      // Click agent
      const cards = await page.locator('[data-agent-slug], .agent-card').all();
      await cards[i].click();
      await page.waitForTimeout(1500);

      const url = page.url();
      console.log(`✓ Agent ${i + 1}: ${url}`);

      // Verify data loads
      const agentName = await page.locator('h1, h2, .agent-name').first().textContent();
      expect(agentName).toBeTruthy();

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `14-sequential-agent-${i + 1}.png`),
        fullPage: true
      });
    }

    // Verify no console errors
    expect(consoleErrors.length, `Console errors found: ${consoleErrors.join(', ')}`).toBe(0);
    console.log('✓ No console errors during sequential navigation');
  });

  test('9. Verify agent profile data completeness', async ({ page }) => {
    console.log('\n=== TEST 9: Agent Profile Data Completeness ===');

    await page.goto(`${BASE_URL}/agents`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Click first agent
    const firstAgent = page.locator('[data-agent-slug], .agent-card').first();
    await firstAgent.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '15-data-completeness-check.png'), fullPage: true });

    // Check for required elements
    const checks = {
      name: false,
      description: false,
      hasContent: false
    };

    // Check name
    const nameElement = await page.locator('h1, h2, .agent-name, [class*="name"]').first();
    const nameText = await nameElement.textContent();
    checks.name = nameText && nameText.trim().length > 0 && nameText !== 'undefined';
    console.log(`✓ Name check: ${checks.name} - "${nameText}"`);

    // Check description
    const descElement = await page.locator('.agent-description, .description, p, [class*="desc"]').first();
    const descText = await descElement.textContent();
    checks.description = descText && descText.trim().length > 10 && !descText.includes('undefined');
    console.log(`✓ Description check: ${checks.description} - ${descText.length} chars`);

    // Check for any content
    const bodyText = await page.locator('body').textContent();
    checks.hasContent = bodyText.length > 100;
    console.log(`✓ Content check: ${checks.hasContent} - ${bodyText.length} chars`);

    // Verify no "undefined" text visible
    const hasUndefined = bodyText.includes('undefined');
    expect(hasUndefined, 'Found "undefined" text in page content').toBe(false);
    console.log('✓ No "undefined" values visible');

    // All checks should pass
    expect(checks.name).toBe(true);
    expect(checks.description).toBe(true);
    expect(checks.hasContent).toBe(true);
  });
});
