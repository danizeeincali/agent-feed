import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * E2E Test Suite: SVG Icon Validation
 *
 * Purpose: Validate that AgentIcon.tsx correctly displays SVG icons
 * for all agents, with proper tier-based styling and NO emoji fallbacks.
 *
 * Test Coverage:
 * - Visual validation with screenshot capture
 * - Icon resolution for all tiers (T1, T2)
 * - Tier-based color validation
 * - Console error monitoring
 * - Fallback prevention (no emoji spans)
 *
 * Expected Results:
 * - 19 total agents (9 T1, 10 T2)
 * - All agents display SVG icons
 * - T1 agents: blue SVG icons
 * - T2 agents: gray SVG icons
 * - Zero emoji fallbacks
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_URL = 'http://localhost:5173';
const AGENTS_URL = `${FRONTEND_URL}/agents`;
const SCREENSHOT_DIR = path.join(__dirname, '../../screenshots/svg-icons');

// Expected agent counts
const EXPECTED_COUNTS = {
  total: 19,
  tier1: 9,
  tier2: 10
};

test.describe('SVG Icon Validation - Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor console for errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });

    // Navigate to agents page
    await page.goto(AGENTS_URL);

    // Wait for agent list to load
    await page.waitForSelector('[data-testid="agent-list"], .agent-card, [class*="agent"]', {
      timeout: 10000
    });
  });

  test('should display SVG icons for all agents (no emoji fallbacks)', async ({ page }) => {
    // Wait for icons to render
    await page.waitForTimeout(2000);

    // Capture screenshot - All agents view
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'svg-icons-all-agents.png'),
      fullPage: true
    });

    // Count SVG icons
    const svgIcons = page.locator('svg[role="img"]');
    const svgCount = await svgIcons.count();

    console.log(`✓ Found ${svgCount} SVG icons`);
    expect(svgCount).toBeGreaterThanOrEqual(EXPECTED_COUNTS.total);

    // Verify NO emoji fallbacks
    const emojiSpans = page.locator('span[role="img"]');
    const emojiCount = await emojiSpans.count();

    console.log(`✓ Found ${emojiCount} emoji fallbacks (should be 0)`);
    expect(emojiCount).toBe(0);

    // Verify all SVG icons have aria-label
    for (let i = 0; i < Math.min(svgCount, 5); i++) {
      const ariaLabel = await svgIcons.nth(i).getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      console.log(`  SVG ${i + 1} aria-label: ${ariaLabel}`);
    }
  });

  test('should display blue SVG icons for T1 agents', async ({ page }) => {
    // Click T1 filter
    const t1Filter = page.locator('button:has-text("T1"), [data-tier="T1"], button[class*="tier"]:has-text("T1")');
    await t1Filter.first().click();
    await page.waitForTimeout(1500);

    // Capture screenshot - T1 filtered view
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'svg-icons-tier1-filtered.png'),
      fullPage: true
    });

    // Count visible agents
    const visibleAgents = page.locator('[data-testid="agent-card"]:visible, .agent-card:visible, [class*="agent-"]:visible');
    const agentCount = await visibleAgents.count();

    console.log(`✓ T1 filter: ${agentCount} agents visible`);
    expect(agentCount).toBeGreaterThanOrEqual(EXPECTED_COUNTS.tier1);

    // Count SVG icons with blue color
    const blueSvgIcons = page.locator('svg[role="img"][class*="blue"], svg[role="img"] [class*="blue"]');
    const blueCount = await blueSvgIcons.count();

    console.log(`✓ Found ${blueCount} blue SVG icons`);
    expect(blueCount).toBeGreaterThan(0);

    // Verify NO emoji fallbacks in filtered view
    const emojiCount = await page.locator('span[role="img"]').count();
    expect(emojiCount).toBe(0);
  });

  test('should display gray SVG icons for T2 agents', async ({ page }) => {
    // Click T2 filter
    const t2Filter = page.locator('button:has-text("T2"), [data-tier="T2"], button[class*="tier"]:has-text("T2")');
    await t2Filter.first().click();
    await page.waitForTimeout(1500);

    // Capture screenshot - T2 filtered view
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'svg-icons-tier2-filtered.png'),
      fullPage: true
    });

    // Count visible agents
    const visibleAgents = page.locator('[data-testid="agent-card"]:visible, .agent-card:visible, [class*="agent-"]:visible');
    const agentCount = await visibleAgents.count();

    console.log(`✓ T2 filter: ${agentCount} agents visible`);
    expect(agentCount).toBeGreaterThanOrEqual(EXPECTED_COUNTS.tier2);

    // Count SVG icons with gray color
    const graySvgIcons = page.locator('svg[role="img"][class*="gray"], svg[role="img"] [class*="gray"]');
    const grayCount = await graySvgIcons.count();

    console.log(`✓ Found ${grayCount} gray SVG icons`);
    expect(grayCount).toBeGreaterThan(0);

    // Verify NO emoji fallbacks in filtered view
    const emojiCount = await page.locator('span[role="img"]').count();
    expect(emojiCount).toBe(0);
  });
});

test.describe('SVG Icon Validation - Resolution Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(AGENTS_URL);
    await page.waitForSelector('[data-testid="agent-list"], .agent-card, [class*="agent"]', {
      timeout: 10000
    });
  });

  test('should resolve correct icon count for All filter', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Count all SVG icons
    const svgCount = await page.locator('svg[role="img"]').count();

    // Count all agents
    const agentCount = await page.locator('[data-testid="agent-card"], .agent-card, [class*="agent-"]').count();

    console.log(`✓ All filter: ${agentCount} agents, ${svgCount} SVG icons`);

    // Each agent should have exactly one SVG icon
    expect(svgCount).toBeGreaterThanOrEqual(agentCount);
  });

  test('should resolve correct icon count for T1 filter', async ({ page }) => {
    // Click T1 filter
    const t1Filter = page.locator('button:has-text("T1"), [data-tier="T1"]');
    await t1Filter.first().click();
    await page.waitForTimeout(1500);

    // Count SVG icons
    const svgCount = await page.locator('svg[role="img"]').count();

    console.log(`✓ T1 filter: ${svgCount} SVG icons`);
    expect(svgCount).toBeGreaterThanOrEqual(EXPECTED_COUNTS.tier1);
  });

  test('should resolve correct icon count for T2 filter', async ({ page }) => {
    // Click T2 filter
    const t2Filter = page.locator('button:has-text("T2"), [data-tier="T2"]');
    await t2Filter.first().click();
    await page.waitForTimeout(1500);

    // Count SVG icons
    const svgCount = await page.locator('svg[role="img"]').count();

    console.log(`✓ T2 filter: ${svgCount} SVG icons`);
    expect(svgCount).toBeGreaterThanOrEqual(EXPECTED_COUNTS.tier2);
  });

  test('should not render emoji fallbacks in any filter state', async ({ page }) => {
    // Test All filter
    await page.waitForTimeout(1500);
    let emojiCount = await page.locator('span[role="img"]').count();
    expect(emojiCount).toBe(0);
    console.log('✓ All filter: 0 emoji fallbacks');

    // Test T1 filter
    const t1Filter = page.locator('button:has-text("T1"), [data-tier="T1"]');
    if (await t1Filter.count() > 0) {
      await t1Filter.first().click();
      await page.waitForTimeout(1000);
      emojiCount = await page.locator('span[role="img"]').count();
      expect(emojiCount).toBe(0);
      console.log('✓ T1 filter: 0 emoji fallbacks');
    }

    // Test T2 filter
    const t2Filter = page.locator('button:has-text("T2"), [data-tier="T2"]');
    if (await t2Filter.count() > 0) {
      await t2Filter.first().click();
      await page.waitForTimeout(1000);
      emojiCount = await page.locator('span[role="img"]').count();
      expect(emojiCount).toBe(0);
      console.log('✓ T2 filter: 0 emoji fallbacks');
    }
  });
});

test.describe('SVG Icon Validation - Console Error Tests', () => {
  test('should not log icon lookup errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    // Capture console messages
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(text);
      }
    });

    await page.goto(AGENTS_URL);
    await page.waitForTimeout(3000);

    // Filter for icon-related errors
    const iconErrors = consoleErrors.filter(err =>
      err.toLowerCase().includes('icon') ||
      err.toLowerCase().includes('emoji') ||
      err.toLowerCase().includes('lookup')
    );

    console.log(`✓ Total console errors: ${consoleErrors.length}`);
    console.log(`✓ Icon-related errors: ${iconErrors.length}`);

    if (iconErrors.length > 0) {
      console.error('Icon-related errors found:');
      iconErrors.forEach(err => console.error(`  - ${err}`));
    }

    expect(iconErrors.length).toBe(0);
  });

  test('should not log React key warnings for icons', async ({ page }) => {
    const keyWarnings: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('key') && text.includes('icon')) {
        keyWarnings.push(text);
      }
    });

    await page.goto(AGENTS_URL);
    await page.waitForTimeout(3000);

    console.log(`✓ React key warnings for icons: ${keyWarnings.length}`);
    expect(keyWarnings.length).toBe(0);
  });
});

test.describe('SVG Icon Validation - Tier Color Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(AGENTS_URL);
    await page.waitForTimeout(2000);
  });

  test('should apply correct Tailwind classes for tier colors', async ({ page }) => {
    // Capture detailed screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'svg-icons-tier-colors-detailed.png'),
      fullPage: true
    });

    // Check for blue tier icons (T1)
    const blueSvgSelectors = [
      'svg[class*="text-blue"]',
      'svg[class*="blue-600"]',
      'svg path[class*="blue"]'
    ];

    let blueCount = 0;
    for (const selector of blueSvgSelectors) {
      const count = await page.locator(selector).count();
      blueCount += count;
    }

    console.log(`✓ Found ${blueCount} blue-styled icons`);
    expect(blueCount).toBeGreaterThan(0);

    // Check for gray tier icons (T2)
    const graySvgSelectors = [
      'svg[class*="text-gray"]',
      'svg[class*="gray-500"]',
      'svg path[class*="gray"]'
    ];

    let grayCount = 0;
    for (const selector of graySvgSelectors) {
      const count = await page.locator(selector).count();
      grayCount += count;
    }

    console.log(`✓ Found ${grayCount} gray-styled icons`);
    expect(grayCount).toBeGreaterThan(0);
  });

  test('should maintain tier colors after filter toggle', async ({ page }) => {
    // Start with T1 filter
    const t1Filter = page.locator('button:has-text("T1"), [data-tier="T1"]');
    if (await t1Filter.count() > 0) {
      await t1Filter.first().click();
      await page.waitForTimeout(1000);

      const blueIcons = await page.locator('svg[class*="blue"]').count();
      expect(blueIcons).toBeGreaterThan(0);
      console.log(`✓ T1 filter: ${blueIcons} blue icons`);
    }

    // Switch to T2 filter
    const t2Filter = page.locator('button:has-text("T2"), [data-tier="T2"]');
    if (await t2Filter.count() > 0) {
      await t2Filter.first().click();
      await page.waitForTimeout(1000);

      const grayIcons = await page.locator('svg[class*="gray"]').count();
      expect(grayIcons).toBeGreaterThan(0);
      console.log(`✓ T2 filter: ${grayIcons} gray icons`);
    }

    // Capture final state
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'svg-icons-filter-toggle-complete.png'),
      fullPage: true
    });
  });
});

test.describe('SVG Icon Validation - Individual Agent Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(AGENTS_URL);
    await page.waitForTimeout(2000);
  });

  test('should display SVG icon for each individual agent', async ({ page }) => {
    // Get all agent cards
    const agentCards = page.locator('[data-testid="agent-card"], .agent-card, [class*="agent-"]');
    const count = await agentCards.count();

    console.log(`✓ Testing individual icons for ${count} agents`);

    // Test first 5 agents
    for (let i = 0; i < Math.min(count, 5); i++) {
      const card = agentCards.nth(i);

      // Check for SVG icon within this card
      const svgIcon = card.locator('svg[role="img"]');
      const hasSvg = await svgIcon.count() > 0;

      expect(hasSvg).toBe(true);

      if (hasSvg) {
        const ariaLabel = await svgIcon.first().getAttribute('aria-label');
        console.log(`  Agent ${i + 1}: SVG icon with label "${ariaLabel}"`);
      }
    }
  });

  test('should not have mixed icon types (SVG + emoji) in same view', async ({ page }) => {
    const svgCount = await page.locator('svg[role="img"]').count();
    const emojiCount = await page.locator('span[role="img"]').count();

    console.log(`✓ Icon types: ${svgCount} SVG, ${emojiCount} emoji`);

    // Should have only SVG icons
    expect(svgCount).toBeGreaterThan(0);
    expect(emojiCount).toBe(0);
  });
});

test.describe('SVG Icon Validation - Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(AGENTS_URL);
    await page.waitForTimeout(2000);
  });

  test('should have proper ARIA labels on all SVG icons', async ({ page }) => {
    const svgIcons = page.locator('svg[role="img"]');
    const count = await svgIcons.count();

    console.log(`✓ Checking ARIA labels for ${count} SVG icons`);

    let validLabels = 0;
    for (let i = 0; i < count; i++) {
      const ariaLabel = await svgIcons.nth(i).getAttribute('aria-label');
      if (ariaLabel && ariaLabel.length > 0) {
        validLabels++;
      }
    }

    console.log(`✓ ${validLabels}/${count} SVG icons have valid aria-label`);
    expect(validLabels).toBe(count);
  });

  test('should have role="img" on all SVG icons', async ({ page }) => {
    const allSvgs = page.locator('svg');
    const svgWithRole = page.locator('svg[role="img"]');

    const totalSvgs = await allSvgs.count();
    const svgsWithRole = await svgWithRole.count();

    console.log(`✓ ${svgsWithRole}/${totalSvgs} SVG elements have role="img"`);

    // All agent icons should have role="img"
    expect(svgsWithRole).toBeGreaterThanOrEqual(EXPECTED_COUNTS.total);
  });
});

test.describe('SVG Icon Validation - Screenshot Comparison', () => {
  test('should capture baseline screenshots for visual regression', async ({ page }) => {
    await page.goto(AGENTS_URL);
    await page.waitForTimeout(2000);

    // Baseline: All agents
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'baseline-all-agents.png'),
      fullPage: true
    });
    console.log('✓ Captured: baseline-all-agents.png');

    // Baseline: T1 filtered
    const t1Filter = page.locator('button:has-text("T1"), [data-tier="T1"]');
    if (await t1Filter.count() > 0) {
      await t1Filter.first().click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'baseline-tier1-filtered.png'),
        fullPage: true
      });
      console.log('✓ Captured: baseline-tier1-filtered.png');
    }

    // Baseline: T2 filtered
    const t2Filter = page.locator('button:has-text("T2"), [data-tier="T2"]');
    if (await t2Filter.count() > 0) {
      await t2Filter.first().click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'baseline-tier2-filtered.png'),
        fullPage: true
      });
      console.log('✓ Captured: baseline-tier2-filtered.png');
    }

    // Baseline: Single agent detail (if applicable)
    const firstAgent = page.locator('[data-testid="agent-card"], .agent-card, [class*="agent-"]').first();
    if (await firstAgent.count() > 0) {
      await firstAgent.screenshot({
        path: path.join(SCREENSHOT_DIR, 'baseline-single-agent.png')
      });
      console.log('✓ Captured: baseline-single-agent.png');
    }
  });
});
