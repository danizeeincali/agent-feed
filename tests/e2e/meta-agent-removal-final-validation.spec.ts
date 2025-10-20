import { test, expect } from '@playwright/test';

/**
 * Meta Agent Removal - Final E2E Validation
 *
 * Purpose: Validate complete removal of meta-agent and meta-update-agent
 * Expected State:
 * - Total agents: 17 (down from 19)
 * - Tier 1: 8 agents
 * - Tier 2: 9 agents
 * - Meta agents: REMOVED
 * - Specialist agents: 6 present (all Tier 2)
 */

test.describe('Meta Agent Removal - Final Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should display exactly 17 agents after meta agent removal', async ({ page }) => {
    console.log('📊 Testing: Total agent count = 17');

    await page.goto('http://localhost:5173/agents');

    // Wait for agent list to load
    await page.waitForSelector('[data-testid="agent-list-item"], .agent-card, [class*="agent"]', {
      timeout: 10000
    });

    // Additional wait for dynamic content
    await page.waitForTimeout(1000);

    // Try multiple selectors to find agent cards
    const agentSelectors = [
      '[data-testid="agent-list-item"]',
      '.agent-card',
      '[class*="AgentCard"]',
      '[class*="agent-item"]'
    ];

    let agentCount = 0;
    for (const selector of agentSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        agentCount = count;
        console.log(`✅ Found ${count} agents using selector: ${selector}`);
        break;
      }
    }

    // Validate count
    expect(agentCount).toBe(17);
    console.log(`✅ Agent count validation passed: ${agentCount} agents`);

    // Take screenshot
    await page.screenshot({
      path: 'screenshots/meta-removal-17-agents.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved: screenshots/meta-removal-17-agents.png');
  });

  test('should show correct tier counts (T1=8, T2=9)', async ({ page }) => {
    console.log('📊 Testing: Tier distribution (T1=8, T2=9)');

    await page.goto('http://localhost:5173/agents');
    await page.waitForTimeout(1500);

    // Try to find tier filter buttons
    const tierFilterSelectors = [
      '[data-testid="tier-filter-1"]',
      'button:has-text("Tier 1")',
      'button:has-text("T1")',
      '[aria-label*="Tier 1"]'
    ];

    let tier1Button = null;
    for (const selector of tierFilterSelectors) {
      const button = page.locator(selector).first();
      if (await button.count() > 0) {
        tier1Button = button;
        console.log(`✅ Found Tier 1 filter using: ${selector}`);
        break;
      }
    }

    if (tier1Button) {
      // Test Tier 1 count
      await tier1Button.click();
      await page.waitForTimeout(1000);

      const t1Count = await page.locator('[data-testid="agent-list-item"], .agent-card, [class*="agent"]').count();
      console.log(`📊 Tier 1 count: ${t1Count}`);
      expect(t1Count).toBe(8);

      // Test Tier 2 count
      const tier2Button = page.locator('[data-testid="tier-filter-2"], button:has-text("Tier 2"), button:has-text("T2")').first();
      await tier2Button.click();
      await page.waitForTimeout(1000);

      const t2Count = await page.locator('[data-testid="agent-list-item"], .agent-card, [class*="agent"]').count();
      console.log(`📊 Tier 2 count: ${t2Count}`);
      expect(t2Count).toBe(9);

      // Take screenshot
      await page.screenshot({
        path: 'screenshots/meta-removal-tier-counts.png',
        fullPage: true
      });
      console.log('📸 Screenshot saved: screenshots/meta-removal-tier-counts.png');
    } else {
      console.log('⚠️ Tier filters not found, verifying via API');

      // Verify via API as fallback
      const response = await page.request.get('http://localhost:3001/api/agents');
      const data = await response.json();

      expect(data.total).toBe(17);
      expect(data.tier1).toBe(8);
      expect(data.tier2).toBe(9);
      console.log('✅ API validation passed:', data);
    }
  });

  test('should NOT display meta-agent or meta-update-agent', async ({ page }) => {
    console.log('🔍 Testing: Meta agents are absent');

    await page.goto('http://localhost:5173/agents');
    await page.waitForTimeout(1500);

    // Get page content
    const pageContent = await page.content();

    // Check for meta-agent references
    const hasMetaAgent = pageContent.toLowerCase().includes('meta-agent');
    const hasMetaUpdate = pageContent.toLowerCase().includes('meta-update-agent');

    expect(hasMetaAgent).toBe(false);
    expect(hasMetaUpdate).toBe(false);

    console.log('✅ Meta-agent: NOT FOUND (correct)');
    console.log('✅ Meta-update-agent: NOT FOUND (correct)');

    // Also check via text search
    const metaAgentVisible = await page.locator('text=meta-agent').count();
    const metaUpdateVisible = await page.locator('text=meta-update-agent').count();

    expect(metaAgentVisible).toBe(0);
    expect(metaUpdateVisible).toBe(0);

    console.log('✅ Visual verification: No meta agents displayed');
  });

  test('should display all 6 specialist agents', async ({ page }) => {
    console.log('🔍 Testing: All 6 specialist agents present');

    await page.goto('http://localhost:5173/agents');
    await page.waitForTimeout(1500);

    const specialists = [
      'agent-architect-agent',
      'agent-maintenance-agent',
      'skills-architect-agent',
      'skills-maintenance-agent',
      'learning-optimizer-agent',
      'system-architect-agent'
    ];

    // Try to filter to Tier 2
    const tier2Button = page.locator('[data-testid="tier-filter-2"], button:has-text("Tier 2"), button:has-text("T2")').first();
    if (await tier2Button.count() > 0) {
      await tier2Button.click();
      await page.waitForTimeout(1000);
      console.log('✅ Filtered to Tier 2');
    }

    // Check each specialist
    let foundCount = 0;
    for (const specialist of specialists) {
      const pageContent = await page.content();
      const isPresent = pageContent.includes(specialist);

      if (isPresent) {
        foundCount++;
        console.log(`✅ Found: ${specialist}`);
      } else {
        console.log(`❌ Missing: ${specialist}`);
      }

      expect(isPresent).toBe(true);
    }

    expect(foundCount).toBe(6);
    console.log(`✅ All ${foundCount}/6 specialist agents present`);

    // Take screenshot
    await page.screenshot({
      path: 'screenshots/meta-removal-specialists.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved: screenshots/meta-removal-specialists.png');
  });

  test('should verify API returns correct counts', async ({ page }) => {
    console.log('🔍 Testing: API endpoint validation');

    // Test with tier=all parameter to get all agents
    const response = await page.request.get('http://localhost:3001/api/agents?tier=all');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    console.log('📊 API Response:', {
      success: data.success,
      dataLength: data.data?.length || 0,
      metadata: data.metadata
    });

    // Validate response structure
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.metadata).toBeDefined();

    // Validate metadata counts
    expect(data.metadata.total).toBe(17);
    expect(data.metadata.tier1).toBe(8);
    expect(data.metadata.tier2).toBe(9);

    console.log('✅ Metadata validation passed:', {
      total: data.metadata.total,
      tier1: data.metadata.tier1,
      tier2: data.metadata.tier2
    });

    // Validate data array length
    expect(data.data.length).toBe(17);
    console.log(`✅ Data array contains ${data.data.length} agents`);

    // Verify agents array
    const agentSlugs = data.data.map((a: any) => a.slug || a.name);

    // Check meta agents are NOT in the list
    expect(agentSlugs).not.toContain('meta-agent');
    expect(agentSlugs).not.toContain('meta-update-agent');

    console.log('✅ Meta agents confirmed absent from API response');

    // Check specialist agents ARE in the list
    const specialists = [
      'agent-architect-agent',
      'agent-maintenance-agent',
      'skills-architect-agent',
      'skills-maintenance-agent',
      'learning-optimizer-agent',
      'system-architect-agent'
    ];

    for (const specialist of specialists) {
      const found = agentSlugs.includes(specialist);
      expect(found).toBe(true);
      if (found) {
        console.log(`  ✅ Found: ${specialist}`);
      }
    }

    console.log('✅ All 6 specialist agents confirmed in API response');

    // Test default behavior (should return Tier 1 only)
    const defaultResponse = await page.request.get('http://localhost:3001/api/agents');
    const defaultData = await defaultResponse.json();

    expect(defaultData.data.length).toBe(8);
    expect(defaultData.metadata.appliedTier).toBe('1');
    console.log('✅ Default API behavior validated (Tier 1 only: 8 agents)');

    // Test Tier 2 filtering
    const tier2Response = await page.request.get('http://localhost:3001/api/agents?tier=2');
    const tier2Data = await tier2Response.json();

    expect(tier2Data.data.length).toBe(9);
    expect(tier2Data.metadata.appliedTier).toBe('2');
    console.log('✅ Tier 2 filtering validated (9 agents)');
  });

  test('should maintain UI layout and functionality', async ({ page }) => {
    console.log('🔍 Testing: UI layout integrity');

    await page.goto('http://localhost:5173/agents');
    await page.waitForTimeout(1500);

    // Check for agent list container
    const agentList = page.locator('[data-testid="agent-list"], [class*="agent-list"], main');
    expect(await agentList.count()).toBeGreaterThan(0);
    console.log('✅ Agent list container present');

    // Check for tier filters
    const tierFilters = page.locator('button:has-text("Tier"), [data-testid*="tier-filter"]');
    if (await tierFilters.count() > 0) {
      console.log(`✅ Found ${await tierFilters.count()} tier filter(s)`);
    }

    // Take full page screenshot
    await page.screenshot({
      path: 'screenshots/meta-removal-ui-layout.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved: screenshots/meta-removal-ui-layout.png');

    console.log('✅ UI layout validation complete');
  });
});
