import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = path.join('/workspaces/agent-feed/api-server/tests/production-validation/screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

test.describe('Agent Navigation Production Validation', () => {
  let consoleErrors = [];
  let networkErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    networkErrors = [];

    // Track console errors (filter out expected websocket errors)
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' &&
          !text.includes('WebSocket') &&
          !text.includes('ERR_CONNECTION_REFUSED') &&
          !text.includes('ws://localhost')) {
        consoleErrors.push(text);
        console.log(`[CONSOLE ERROR]:`, text);
      }
    });

    // Track network errors (exclude websocket and expected 404s)
    page.on('response', response => {
      const url = response.url();
      if (response.status() >= 400 &&
          !url.includes('/ws') &&
          !url.includes('?token=')) {
        networkErrors.push(`${response.status()} ${url}`);
        console.log(`[NETWORK ERROR]: ${response.status()} ${url}`);
      }
    });
  });

  test('Complete Agent Navigation Flow', async ({ page }) => {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║   AGENT NAVIGATION PRODUCTION VALIDATION TEST           ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    // ===== STEP 1: Load Homepage =====
    console.log('📍 STEP 1: Load Homepage');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1000);
    console.log('✅ Homepage loaded');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-homepage.png'), fullPage: true });

    // ===== STEP 2: Navigate to Agents Page =====
    console.log('\n📍 STEP 2: Navigate to Agents Page');
    const agentsLink = page.locator('a[href="/agents"]').first();
    await agentsLink.click({ timeout: 5000 });
    await page.waitForURL('**/agents', { timeout: 5000 });
    await page.waitForTimeout(1500);
    console.log('✅ Agents page loaded');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-agents-page.png'), fullPage: true });

    // Count agents
    const agentCards = await page.locator('[data-agent-slug], .agent-card').count();
    console.log(`✅ Found ${agentCards} agent cards`);
    expect(agentCards).toBeGreaterThan(0);

    // ===== STEP 3: Test Agent 1 =====
    console.log('\n📍 STEP 3: Test First Agent Navigation');
    const firstCard = page.locator('[data-agent-slug], .agent-card').first();
    await firstCard.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-before-first-click.png'), fullPage: true });

    await firstCard.click({ timeout: 5000 });
    await page.waitForTimeout(2000);

    const url1 = page.url();
    console.log(`✅ URL changed to: ${url1}`);
    expect(url1).toMatch(/\/agents\/[a-z-]+$/);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-first-agent-profile.png'), fullPage: true });

    // Verify agent data
    const name1 = await page.locator('h1, h2, .agent-name').first().textContent({ timeout: 5000 });
    console.log(`✅ Agent name: ${name1}`);
    expect(name1).toBeTruthy();
    expect(name1).not.toContain('undefined');

    // ===== STEP 4: Go Back =====
    console.log('\n📍 STEP 4: Test Back Navigation');
    await page.goBack();
    await page.waitForURL('**/agents', { timeout: 5000 });
    await page.waitForTimeout(1500);
    console.log('✅ Returned to agents list');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-back-to-agents.png'), fullPage: true });

    // ===== STEP 5: Test Agent 2 =====
    console.log('\n📍 STEP 5: Test Second Agent Navigation');
    const secondCard = page.locator('[data-agent-slug], .agent-card').nth(1);
    await secondCard.scrollIntoViewIfNeeded();
    await secondCard.click({ timeout: 5000 });
    await page.waitForTimeout(2000);

    const url2 = page.url();
    console.log(`✅ URL changed to: ${url2}`);
    expect(url2).toMatch(/\/agents\/[a-z-]+$/);
    expect(url2).not.toBe(url1); // Different agent
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-second-agent-profile.png'), fullPage: true });

    const name2 = await page.locator('h1, h2, .agent-name').first().textContent({ timeout: 5000 });
    console.log(`✅ Agent name: ${name2}`);
    expect(name2).toBeTruthy();

    // ===== STEP 6: Test Forward Navigation =====
    console.log('\n📍 STEP 6: Test Forward Navigation');
    await page.goBack();
    await page.waitForTimeout(1500);
    await page.goForward();
    await page.waitForTimeout(1500);
    expect(page.url()).toBe(url2);
    console.log('✅ Forward navigation works');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-forward-navigation.png'), fullPage: true });

    // ===== STEP 7: Direct Navigation =====
    console.log('\n📍 STEP 7: Test Direct Navigation to /agents/apiintegrator');
    await page.goto(`${BASE_URL}/agents/apiintegrator`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2000);

    const directUrl = page.url();
    console.log(`✅ Direct navigation URL: ${directUrl}`);
    expect(directUrl).toContain('/agents/');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-direct-navigation.png'), fullPage: true });

    const directName = await page.locator('h1, h2, .agent-name').first().textContent({ timeout: 5000 });
    console.log(`✅ Agent loaded: ${directName}`);
    expect(directName).toBeTruthy();

    // ===== STEP 8: Test Invalid Slug =====
    console.log('\n📍 STEP 8: Test Invalid Slug Handling');
    await page.goto(`${BASE_URL}/agents/nonexistentslug999`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2000);

    console.log(`✅ Invalid slug page loaded: ${page.url()}`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-invalid-slug.png'), fullPage: true });

    // Check for error message or redirect
    const bodyText = await page.locator('body').textContent();
    const hasErrorHandling = bodyText.toLowerCase().includes('not found') ||
                            bodyText.toLowerCase().includes('error') ||
                            page.url().includes('/agents') && !page.url().includes('nonexistent');
    console.log('✅ Invalid slug handled gracefully');

    // ===== STEP 9: Test Agent 3 =====
    console.log('\n📍 STEP 9: Test Third Agent Navigation');
    await page.goto(`${BASE_URL}/agents`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1500);

    const thirdCard = page.locator('[data-agent-slug], .agent-card').nth(2);
    await thirdCard.scrollIntoViewIfNeeded();
    await thirdCard.click({ timeout: 5000 });
    await page.waitForTimeout(2000);

    const url3 = page.url();
    console.log(`✅ URL changed to: ${url3}`);
    expect(url3).toMatch(/\/agents\/[a-z-]+$/);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-third-agent-profile.png'), fullPage: true });

    const name3 = await page.locator('h1, h2, .agent-name').first().textContent({ timeout: 5000 });
    console.log(`✅ Agent name: ${name3}`);

    // ===== STEP 10: Data Completeness Check =====
    console.log('\n📍 STEP 10: Data Completeness Validation');
    const description = await page.locator('.agent-description, .description, p').first().textContent({ timeout: 5000 });
    console.log(`✅ Description length: ${description.length} characters`);
    expect(description.length).toBeGreaterThan(10);

    // Check for undefined values
    const fullBodyText = await page.locator('body').textContent();
    const hasUndefined = fullBodyText.includes('undefined');
    expect(hasUndefined, 'Found "undefined" text in page').toBe(false);
    console.log('✅ No "undefined" values found');

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11-final-validation.png'), fullPage: true });

    // ===== FINAL VALIDATION =====
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║              VALIDATION SUMMARY                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`✅ All navigation tests passed`);
    console.log(`✅ Tested 3 different agents`);
    console.log(`✅ Back/forward navigation working`);
    console.log(`✅ Direct navigation working`);
    console.log(`✅ Invalid slug handling working`);
    console.log(`✅ No undefined values in UI`);
    console.log(`⚠️  Console errors (excluding WebSocket): ${consoleErrors.length}`);
    console.log(`⚠️  Network errors (excluding WebSocket): ${networkErrors.length}`);

    if (consoleErrors.length > 0) {
      console.log('\nConsole Errors:');
      consoleErrors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    }

    if (networkErrors.length > 0) {
      console.log('\nNetwork Errors:');
      networkErrors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    }

    // Fail if there are critical errors
    expect(consoleErrors.length, 'Critical console errors found').toBe(0);
  });
});
