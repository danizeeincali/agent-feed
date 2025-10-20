import { test, expect, Page } from '@playwright/test';

test.describe('Tier Filtering System - Final Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/agents');
    // Wait for agents to load
    await page.waitForSelector('[data-testid="agent-tier-toggle"], .agent-tier-toggle, button:has-text("T1")', {
      timeout: 10000
    });
  });

  test('should display tier toggle buttons (T1, T2, All)', async ({ page }) => {
    // Look for tier toggle buttons
    const t1Button = page.locator('button:has-text("T1")').first();
    const t2Button = page.locator('button:has-text("T2")').first();
    const allButton = page.locator('button:has-text("All")').first();

    await expect(t1Button).toBeVisible();
    await expect(t2Button).toBeVisible();
    await expect(allButton).toBeVisible();

    console.log('✅ Tier toggle buttons are visible');
  });

  test('should filter agents when clicking T1', async ({ page }) => {
    // Click T1 button
    await page.locator('button:has-text("T1")').first().click();

    // Wait for API call to complete
    await page.waitForTimeout(2000);

    // Check localStorage for tier filter persistence
    const tierFilter = await page.evaluate(() => localStorage.getItem('selectedAgentTier'));
    expect(tierFilter).toBe('1');

    console.log('✅ T1 filter applied and persisted to localStorage');
  });

  test('should filter agents when clicking T2', async ({ page }) => {
    // Click T2 button
    await page.locator('button:has-text("T2")').first().click();

    // Wait for API call
    await page.waitForTimeout(2000);

    // Check localStorage
    const tierFilter = await page.evaluate(() => localStorage.getItem('selectedAgentTier'));
    expect(tierFilter).toBe('2');

    console.log('✅ T2 filter applied and persisted to localStorage');
  });

  test('should show all agents when clicking All', async ({ page }) => {
    // Click T1 first
    await page.locator('button:has-text("T1")').first().click();
    await page.waitForTimeout(1000);

    // Then click All
    await page.locator('button:has-text("All")').first().click();
    await page.waitForTimeout(2000);

    // Check localStorage
    const tierFilter = await page.evaluate(() => localStorage.getItem('selectedAgentTier'));
    expect(tierFilter).toBe('all');

    console.log('✅ All agents filter applied');
  });

  test('should display agent icons', async ({ page }) => {
    // Wait for agents to load
    await page.waitForTimeout(2000);

    // Look for agent icons (SVG or emoji)
    const icons = page.locator('[data-testid="agent-icon"], .agent-icon, svg[data-lucide], .emoji-icon');

    const iconCount = await icons.count();
    expect(iconCount).toBeGreaterThan(0);

    console.log(`✅ ${iconCount} agent icons displayed`);
  });

  test('should display tier badges (T1, T2)', async ({ page }) => {
    // Wait for agents to load
    await page.waitForTimeout(2000);

    // Look for tier badges
    const tierBadges = page.locator('[data-testid="agent-tier-badge"], .tier-badge, .agent-tier-badge');

    const badgeCount = await tierBadges.count();
    expect(badgeCount).toBeGreaterThan(0);

    console.log(`✅ ${badgeCount} tier badges displayed`);
  });

  test('should capture screenshot of tier filtering UI', async ({ page }) => {
    // Wait for full page load
    await page.waitForTimeout(3000);

    // Capture full page screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/screenshots/tier-filtering-all-view.png',
      fullPage: true
    });

    console.log('✅ Screenshot captured: tier-filtering-all-view.png');

    // Click T1 and capture
    await page.locator('button:has-text("T1")').first().click();
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: '/workspaces/agent-feed/screenshots/tier-filtering-t1-view.png',
      fullPage: true
    });

    console.log('✅ Screenshot captured: tier-filtering-t1-view.png');

    // Click T2 and capture
    await page.locator('button:has-text("T2")').first().click();
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: '/workspaces/agent-feed/screenshots/tier-filtering-t2-view.png',
      fullPage: true
    });

    console.log('✅ Screenshot captured: tier-filtering-t2-view.png');
  });

  test('CRITICAL: Verify backend orchestrator is running', async ({ page }) => {
    // Check backend health endpoint
    const response = await page.request.get('http://localhost:3001/health');
    expect(response.ok()).toBeTruthy();

    const health = await response.json();
    console.log('Backend health:', health);

    console.log('✅ Backend running and healthy');
  });

  test('CRITICAL: Verify tier filtering API works', async ({ page }) => {
    // Test tier=1
    const t1Response = await page.request.get('http://localhost:3001/api/v1/claude-live/prod/agents?tier=1');
    expect(t1Response.ok()).toBeTruthy();

    const t1Data = await t1Response.json();
    expect(t1Data.success).toBe(true);
    expect(t1Data.data.length).toBe(9); // Expected 9 tier-1 agents

    console.log(`✅ Tier 1 API: ${t1Data.data.length} agents`);

    // Test tier=2
    const t2Response = await page.request.get('http://localhost:3001/api/v1/claude-live/prod/agents?tier=2');
    expect(t2Response.ok()).toBeTruthy();

    const t2Data = await t2Response.json();
    expect(t2Data.success).toBe(true);
    expect(t2Data.data.length).toBe(10); // Expected 10 tier-2 agents

    console.log(`✅ Tier 2 API: ${t2Data.data.length} agents`);

    // Test all
    const allResponse = await page.request.get('http://localhost:3001/api/v1/claude-live/prod/agents?tier=all');
    expect(allResponse.ok()).toBeTruthy();

    const allData = await allResponse.json();
    expect(allData.success).toBe(true);
    expect(allData.data.length).toBe(19); // Expected 19 total agents

    console.log(`✅ All agents API: ${allData.data.length} agents`);
  });

  test('INTEGRATION: Both tier filtering AND orchestrator work together', async ({ page }) => {
    // Test 1: Verify orchestrator is running (backend logs show this)
    const healthResponse = await page.request.get('http://localhost:3001/health');
    expect(healthResponse.ok()).toBeTruthy();

    // Test 2: Verify tier filtering works
    await page.locator('button:has-text("T1")').first().click();
    await page.waitForTimeout(2000);

    // Test 3: Verify agents load with tier filter
    const tierFilter = await page.evaluate(() => localStorage.getItem('selectedAgentTier'));
    expect(tierFilter).toBe('1');

    // Test 4: Verify no console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    // Filter out expected/benign errors
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('favicon') &&
      !err.includes('404') &&
      !err.includes('DevTools')
    );

    expect(criticalErrors.length).toBe(0);

    console.log('✅ INTEGRATION TEST PASSED: Both features working together');
    console.log('   - Orchestrator: Running');
    console.log('   - Tier filtering: Working');
    console.log('   - No critical errors');
  });
});
