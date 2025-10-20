/**
 * Visual Regression Testing for Agent Tabs Restructure
 *
 * Captures comprehensive screenshots for visual validation:
 * - Before/After comparison
 * - Different viewports (desktop, tablet, mobile)
 * - Different themes (light, dark)
 * - Different agents
 * - Tab states
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

// Screenshot configuration
const SCREENSHOT_DIR = '/workspaces/agent-feed/tests/e2e/reports/screenshots';

test.describe('Visual Regression - Agent Tabs Restructure', () => {

  test('VR-001: Agent list page - Desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-agent-list-desktop-light.png`,
      fullPage: true
    });
  });

  test('VR-002: Agent list page - Dark mode', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-agent-list-desktop-dark.png`,
      fullPage: true
    });
  });

  test('VR-003: Agent profile - 2 tabs visible', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    const firstAgent = page.locator('[data-testid^="agent-card-"], .agent-card').first();
    await firstAgent.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-agent-profile-2-tabs-desktop.png`,
      fullPage: true
    });
  });

  test('VR-004: Overview tab - Tools section', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    const firstAgent = page.locator('[data-testid^="agent-card-"], .agent-card').first();
    await firstAgent.click();
    await page.waitForLoadState('networkidle');

    // Click Overview tab
    const overviewTab = page.locator('nav button:has-text("Overview")');
    await overviewTab.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-overview-tab-tools-section.png`,
      fullPage: true
    });
  });

  test('VR-005: Dynamic Pages tab', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    const firstAgent = page.locator('[data-testid^="agent-card-"], .agent-card').first();
    await firstAgent.click();
    await page.waitForLoadState('networkidle');

    // Click Dynamic Pages tab
    const dynamicPagesTab = page.locator('nav button:has-text("Dynamic Pages")');
    await dynamicPagesTab.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-dynamic-pages-tab.png`,
      fullPage: true
    });
  });

  test('VR-006: Tablet viewport - Agent profile', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    const firstAgent = page.locator('[data-testid^="agent-card-"], .agent-card').first();
    await firstAgent.click();
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-agent-profile-tablet.png`,
      fullPage: true
    });
  });

  test('VR-007: Mobile viewport - Agent profile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    const firstAgent = page.locator('[data-testid^="agent-card-"], .agent-card').first();
    await firstAgent.click();
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07-agent-profile-mobile.png`,
      fullPage: true
    });
  });

  test('VR-008: Dark mode - Agent profile with tabs', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    const firstAgent = page.locator('[data-testid^="agent-card-"], .agent-card').first();
    await firstAgent.click();
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08-agent-profile-dark-mode.png`,
      fullPage: true
    });
  });

  test('VR-009: Meta-agent profile', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${BASE_URL}/agents/meta-agent`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09-meta-agent-profile.png`,
      fullPage: true
    });
  });

  test('VR-010: Tech-guru profile', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${BASE_URL}/agents/tech-guru`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/10-tech-guru-profile.png`,
      fullPage: true
    });
  });

  test('VR-011: Tab navigation sequence', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    const firstAgent = page.locator('[data-testid^="agent-card-"], .agent-card').first();
    await firstAgent.click();
    await page.waitForLoadState('networkidle');

    // Overview tab
    const overviewTab = page.locator('nav button:has-text("Overview")');
    await overviewTab.click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/11a-tab-sequence-overview.png`,
      fullPage: true
    });

    // Dynamic Pages tab
    const dynamicPagesTab = page.locator('nav button:has-text("Dynamic Pages")');
    await dynamicPagesTab.click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/11b-tab-sequence-dynamic-pages.png`,
      fullPage: true
    });

    // Back to Overview
    await overviewTab.click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/11c-tab-sequence-back-to-overview.png`,
      fullPage: true
    });
  });

  test('VR-012: Tools section closeup', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    const firstAgent = page.locator('[data-testid^="agent-card-"], .agent-card').first();
    await firstAgent.click();
    await page.waitForLoadState('networkidle');

    // Wait for tools section
    await page.waitForSelector('h3:has-text("Tools"), h4:has-text("Tools")', { timeout: 10000 });

    // Scroll to tools section
    const toolsSection = page.locator('h3:has-text("Tools"), h4:has-text("Tools")').first();
    await toolsSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/12-tools-section-closeup.png`,
      fullPage: false
    });
  });

  test('VR-013: Tab count verification visual', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    const firstAgent = page.locator('[data-testid^="agent-card-"], .agent-card').first();
    await firstAgent.click();
    await page.waitForLoadState('networkidle');

    // Highlight the tabs navigation area
    await page.evaluate(() => {
      const nav = document.querySelector('nav');
      if (nav) {
        nav.style.outline = '3px solid red';
        nav.style.outlineOffset = '5px';
      }
    });

    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/13-tab-count-highlighted.png`,
      fullPage: false,
      clip: { x: 0, y: 0, width: 1920, height: 400 }
    });
  });

  test('VR-014: Multiple agents comparison', async ({ page }) => {
    const agents = ['meta-agent', 'tech-guru', 'code-reviewer'];

    for (let i = 0; i < agents.length; i++) {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(`${BASE_URL}/agents/${agents[i]}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/14${String.fromCharCode(97 + i)}-agent-${agents[i]}.png`,
        fullPage: true
      });
    }
  });

  test('VR-015: Responsive breakpoints', async ({ page }) => {
    const breakpoints = [
      { name: 'mobile-sm', width: 320, height: 568 },
      { name: 'mobile-md', width: 375, height: 667 },
      { name: 'mobile-lg', width: 414, height: 896 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop-sm', width: 1024, height: 768 },
      { name: 'desktop-md', width: 1440, height: 900 },
      { name: 'desktop-lg', width: 1920, height: 1080 }
    ];

    for (const bp of breakpoints) {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(`${BASE_URL}/agents`);
      await page.waitForLoadState('networkidle');

      const firstAgent = page.locator('[data-testid^="agent-card-"], .agent-card').first();
      await firstAgent.click();
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/15-breakpoint-${bp.name}-${bp.width}x${bp.height}.png`,
        fullPage: true
      });
    }
  });

});
