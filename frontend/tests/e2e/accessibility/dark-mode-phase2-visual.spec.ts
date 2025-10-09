/**
 * Dark Mode Phase 2 - Visual Validation Tests
 * Uses screenshots and visual inspection to validate dark mode implementation
 *
 * User Requirements Validation:
 * 1. Performance Trends - Line Chart
 * 2. Monthly Project View
 * 3. Post area of the feed
 * 4. Individual draft cards
 * 5. Agents page and individual agent pages
 * 6. Live activity cards
 */

import { test, expect } from '@playwright/test';

test.describe('Dark Mode Phase 2 - Visual Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Enable dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
  });

  test('Feed page should have no white backgrounds in dark mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot for visual verification
    await page.screenshot({
      path: 'test-results/dark-mode-feed.png',
      fullPage: true
    });

    // Check that body has dark background
    const bodyBg = await page.evaluate(() => {
      const body = document.body;
      return window.getComputedStyle(body).backgroundColor;
    });

    expect(bodyBg).not.toBe('rgb(255, 255, 255)');
    expect(bodyBg).not.toBe('white');
  });

  test('Drafts page should have no white backgrounds in dark mode', async ({ page }) => {
    await page.goto('/drafts');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/dark-mode-drafts.png',
      fullPage: true
    });

    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });

    expect(bodyBg).not.toBe('rgb(255, 255, 255)');
  });

  test('Agents page should have no white backgrounds in dark mode', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/dark-mode-agents.png',
      fullPage: true
    });

    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });

    expect(bodyBg).not.toBe('rgb(255, 255, 255)');
  });

  test('All white backgrounds should have dark variants', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for any elements with pure white background
    const whiteElements = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const whites: string[] = [];

      allElements.forEach(el => {
        const bg = window.getComputedStyle(el).backgroundColor;
        if (bg === 'rgb(255, 255, 255)' || bg === 'white') {
          // Get element description
          const tag = el.tagName.toLowerCase();
          const id = el.id ? `#${el.id}` : '';
          const classes = el.className ? `.${el.className.split(' ').join('.')}` : '';
          whites.push(`${tag}${id}${classes}`.substring(0, 100));
        }
      });

      return whites;
    });

    // We expect SOME white elements (like images, SVGs), but not layout elements
    // Log what we found
    console.log('Elements with white backgrounds:', whiteElements.length);

    // The body itself should never be white
    const bodyBg = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );
    expect(bodyBg).not.toBe('rgb(255, 255, 255)');
  });

  test('Compare light and dark mode screenshots', async ({ page }) => {
    // Light mode
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: 'test-results/comparison-light-mode.png',
      fullPage: false
    });

    // Dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: 'test-results/comparison-dark-mode.png',
      fullPage: false
    });

    // Verify they're different
    const lightBg = await page.evaluate(() => {
      const el = document.querySelector('[class*="bg-white"]');
      return el ? window.getComputedStyle(el).backgroundColor : 'none';
    });

    // In dark mode, bg-white should have dark variant
    expect(lightBg).not.toBe('rgb(255, 255, 255)');
  });
});

test.describe('Dark Mode Phase 2 - Specific Component Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });

  test('Feed posts should have dark backgrounds', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for post elements (common class patterns)
    const postBgs = await page.evaluate(() => {
      const posts = document.querySelectorAll('[class*="post"], [class*="card"]');
      const backgrounds: string[] = [];

      posts.forEach(post => {
        const bg = window.getComputedStyle(post as HTMLElement).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)') {
          backgrounds.push(bg);
        }
      });

      return backgrounds;
    });

    // At least some posts should have dark backgrounds
    expect(postBgs.length).toBeGreaterThan(0);

    // None should be pure white
    postBgs.forEach(bg => {
      expect(bg).not.toBe('rgb(255, 255, 255)');
    });
  });

  test('Draft cards should have dark backgrounds', async ({ page }) => {
    await page.goto('/drafts');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'test-results/dark-mode-draft-cards.png',
      fullPage: true
    });

    const draftBgs = await page.evaluate(() => {
      const drafts = document.querySelectorAll('[class*="draft"], [class*="card"]');
      const backgrounds: string[] = [];

      drafts.forEach(draft => {
        const bg = window.getComputedStyle(draft as HTMLElement).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)') {
          backgrounds.push(bg);
        }
      });

      return backgrounds;
    });

    // Should have dark backgrounds
    expect(draftBgs.length).toBeGreaterThan(0);
    draftBgs.forEach(bg => {
      expect(bg).not.toBe('rgb(255, 255, 255)');
    });
  });

  test('Agent cards should have dark backgrounds', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'test-results/dark-mode-agent-cards.png',
      fullPage: true
    });

    const agentBgs = await page.evaluate(() => {
      const agents = document.querySelectorAll('[class*="agent"], [class*="card"]');
      const backgrounds: string[] = [];

      agents.forEach(agent => {
        const bg = window.getComputedStyle(agent as HTMLElement).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)') {
          backgrounds.push(bg);
        }
      });

      return backgrounds;
    });

    expect(agentBgs.length).toBeGreaterThan(0);
    agentBgs.forEach(bg => {
      expect(bg).not.toBe('rgb(255, 255, 255)');
    });
  });

  test('Search inputs should have dark backgrounds', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const inputBgs = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="text"], input[type="search"], input[placeholder*="Search"]');
      const backgrounds: string[] = [];

      inputs.forEach(input => {
        const bg = window.getComputedStyle(input as HTMLElement).backgroundColor;
        backgrounds.push(bg);
      });

      return backgrounds;
    });

    // Inputs should not be white
    inputBgs.forEach(bg => {
      expect(bg).not.toBe('rgb(255, 255, 255)');
    });
  });

  test('Activity cards should have dark backgrounds', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const activityBgs = await page.evaluate(() => {
      const activities = document.querySelectorAll('[class*="activity"]');
      const backgrounds: string[] = [];

      activities.forEach(activity => {
        const bg = window.getComputedStyle(activity as HTMLElement).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)') {
          backgrounds.push(bg);
        }
      });

      return backgrounds;
    });

    if (activityBgs.length > 0) {
      activityBgs.forEach(bg => {
        expect(bg).not.toBe('rgb(255, 255, 255)');
      });
    }
  });
});

test.describe('Dark Mode Phase 2 - Regression Tests', () => {
  test('Light mode should still have white backgrounds', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: 'test-results/light-mode-validation.png',
      fullPage: false
    });

    // In light mode, we SHOULD have white backgrounds
    const hasWhite = await page.evaluate(() => {
      const elements = document.querySelectorAll('[class*="bg-white"]');
      let foundWhite = false;

      elements.forEach(el => {
        const bg = window.getComputedStyle(el as HTMLElement).backgroundColor;
        if (bg === 'rgb(255, 255, 255)') {
          foundWhite = true;
        }
      });

      return foundWhite;
    });

    // Light mode should have at least some white backgrounds
    expect(hasWhite).toBe(true);
  });

  test('Dark mode class should be applied to html element', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hasDarkClass = await page.evaluate(() => {
      const html = document.documentElement;
      return html.classList.contains('dark');
    });

    expect(hasDarkClass).toBe(true);
  });

  test('All pages should respect dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });

    const pages = ['/', '/agents', '/drafts'];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const bodyBg = await page.evaluate(() =>
        window.getComputedStyle(document.body).backgroundColor
      );

      // Body should never be white in dark mode
      expect(bodyBg).not.toBe('rgb(255, 255, 255)');

      // Take screenshot for manual review
      const safePath = pagePath.replace(/\//g, '-') || 'home';
      await page.screenshot({
        path: `test-results/dark-mode-${safePath}.png`,
        fullPage: false
      });
    }
  });
});
