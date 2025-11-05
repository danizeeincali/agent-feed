import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCREENSHOTS_DIR = join(__dirname, '../../../../docs/screenshots/onboarding-fix');
const BASE_URL = 'http://localhost:5173';

test.describe('Onboarding Bridge Removal - Quick Validation', () => {
  test('Test 1: Page loads without onboarding bridge', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check for onboarding keywords
    const welcomeCount = await page.locator('text=/Welcome/i').count();
    const meetAgentsCount = await page.locator('text=/Meet our agents/i').count();
    const priority2Count = await page.locator('text=/Priority 2/i').count();

    console.log(`Welcome: ${welcomeCount}, Meet Agents: ${meetAgentsCount}, Priority 2: ${priority2Count}`);

    expect(welcomeCount).toBe(0);
    expect(meetAgentsCount).toBe(0);
    expect(priority2Count).toBe(0);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, 'bridge-no-onboarding.png'),
      fullPage: true
    });

    console.log('✓ Screenshot saved: bridge-no-onboarding.png');
  });

  test('Test 2: Bridge shows Priority 3+ content only', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const pageContent = await page.content();

    // Should NOT contain Priority 2
    expect(pageContent.toLowerCase()).not.toContain('priority 2');
    expect(pageContent).not.toContain('priority-2');

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, 'engaging-content.png'),
      fullPage: true
    });

    console.log('✓ Screenshot saved: engaging-content.png');
  });

  test('Test 3: No Priority 2 indicator visible', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Comprehensive Priority 2 check
    const priority2Text = await page.locator('text=/priority\\s*2/i').count();
    const priority2Classes = await page.locator('[class*="priority-2"]').count();
    const priority2Attrs = await page.locator('[data-priority="2"]').count();

    console.log(`Priority 2 - Text: ${priority2Text}, Classes: ${priority2Classes}, Attrs: ${priority2Attrs}`);

    expect(priority2Text).toBe(0);
    expect(priority2Classes).toBe(0);
    expect(priority2Attrs).toBe(0);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, 'no-priority-2.png'),
      fullPage: true
    });

    console.log('✓ Screenshot saved: no-priority-2.png');
  });

  test('Test 4: Bridge persists after refresh', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const initialHasOnboarding = (await page.locator('text=/Welcome/i').count()) > 0;
    console.log(`Initial onboarding present: ${initialHasOnboarding}`);

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const postRefreshHasOnboarding = (await page.locator('text=/Welcome/i').count()) > 0;
    console.log(`Post-refresh onboarding present: ${postRefreshHasOnboarding}`);

    expect(initialHasOnboarding).toBe(false);
    expect(postRefreshHasOnboarding).toBe(false);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, 'after-refresh.png'),
      fullPage: true
    });

    console.log('✓ Screenshot saved: after-refresh.png');
  });

  test('Test 5: Full page validation', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check page is loaded
    const body = await page.locator('body').count();
    expect(body).toBe(1);

    // Check no onboarding
    const hasWelcome = (await page.locator('text=/Welcome/i').count()) > 0;
    const hasMeetAgents = (await page.locator('text=/Meet our agents/i').count()) > 0;
    const hasPriority2 = (await page.locator('text=/Priority 2/i').count()) > 0;

    expect(hasWelcome).toBe(false);
    expect(hasMeetAgents).toBe(false);
    expect(hasPriority2).toBe(false);

    const summary = {
      timestamp: new Date().toISOString(),
      pageLoaded: true,
      onboardingDetected: hasWelcome || hasMeetAgents,
      priority2Found: hasPriority2,
      validationPassed: !hasWelcome && !hasMeetAgents && !hasPriority2
    };

    console.log('\n=== VALIDATION SUMMARY ===');
    console.log(JSON.stringify(summary, null, 2));
    console.log('=========================\n');

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, 'full-page-validated.png'),
      fullPage: true
    });

    console.log('✓ Screenshot saved: full-page-validated.png');
    expect(summary.validationPassed).toBe(true);
  });
});
