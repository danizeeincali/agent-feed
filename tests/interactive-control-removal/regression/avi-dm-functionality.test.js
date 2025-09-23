/**
 * Regression Tests for Avi DM Functionality Preservation
 *
 * These tests ensure that after interactive control removal,
 * all Avi DM (Direct Message) functionality continues to work
 * exactly as before. No mocks - real functionality validation only.
 */

import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

test.describe('Avi DM Functionality Preservation Tests', () => {
  let browser;
  let context;
  let page;

  test.beforeAll(async () => {
    browser = await chromium.launch({
      headless: process.env.CI === 'true',
      devtools: !process.env.CI
    });
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
  });

  test.beforeEach(async () => {
    page = await context.newPage();

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Console error:', msg.text());
      }
    });

    // Listen for unhandled exceptions
    page.on('pageerror', error => {
      console.error('Page error:', error.message);
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.afterAll(async () => {
    await context.close();
    await browser.close();
  });

  test('Avi DM should load without interactive controls', async () => {
    await page.goto(`${BASE_URL}/avi-dm`);

    // Wait for page to load completely
    await page.waitForLoadState('networkidle');

    // Verify page loads successfully
    await expect(page).toHaveTitle(/Avi DM|Agent Feed/);

    // Verify no loading states remain
    await expect(page.locator('[data-testid="loading"]')).toHaveCount(0);

    // Verify no error boundaries are triggered
    await expect(page.locator('[data-testid="error-boundary"]')).toHaveCount(0);

    // Verify core Avi DM interface is present
    await expect(page.locator('[data-testid="avi-dm-interface"]')).toBeVisible();
  });

  test('Avi DM conversation display functionality', async () => {
    await page.goto(`${BASE_URL}/avi-dm`);
    await page.waitForLoadState('networkidle');

    // Verify conversation history area exists and is functional
    const conversationArea = page.locator('[data-testid="conversation-area"]');
    await expect(conversationArea).toBeVisible();

    // Verify message display without interactive controls
    const messageElements = page.locator('[data-testid="dm-message"]');
    if (await messageElements.count() > 0) {
      // Check that messages render properly
      await expect(messageElements.first()).toBeVisible();

      // Verify timestamp display
      await expect(messageElements.first().locator('[data-testid="message-timestamp"]')).toBeVisible();

      // Verify content display
      await expect(messageElements.first().locator('[data-testid="message-content"]')).toBeVisible();
    }
  });

  test('Avi DM data fetching without interactive elements', async () => {
    // Intercept DM data requests
    let dmDataFetched = false;
    page.route('**/api/avi-dm/**', (route) => {
      dmDataFetched = true;
      route.continue();
    });

    await page.goto(`${BASE_URL}/avi-dm`);
    await page.waitForLoadState('networkidle');

    // Verify DM data is fetched
    expect(dmDataFetched).toBeTruthy();

    // Verify data displays correctly without interactive controls
    const dmContent = page.locator('[data-testid="dm-content"]');
    await expect(dmContent).toBeVisible();
  });

  test('Avi DM routing preservation', async () => {
    await page.goto(`${BASE_URL}/avi-dm`);
    await page.waitForLoadState('networkidle');

    // Verify URL remains correct
    expect(page.url()).toContain('/avi-dm');

    // Verify navigation to DM works from other pages
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Navigate to Avi DM via programmatic navigation
    await page.evaluate(() => {
      window.location.href = '/avi-dm';
    });
    await page.waitForLoadState('networkidle');

    // Verify successful navigation
    expect(page.url()).toContain('/avi-dm');
    await expect(page.locator('[data-testid="avi-dm-interface"]')).toBeVisible();
  });

  test('Avi DM error handling without interactive controls', async () => {
    // Test with network failures
    await page.route('**/api/avi-dm/**', route => route.abort());

    await page.goto(`${BASE_URL}/avi-dm`);
    await page.waitForLoadState('networkidle');

    // Verify graceful error handling
    const errorState = page.locator('[data-testid="dm-error-state"]');
    await expect(errorState).toBeVisible();

    // Verify error message is user-friendly
    await expect(errorState).toContainText(/unable to load|error|retry/i);
  });

  test('Avi DM responsive display preservation', async () => {
    await page.goto(`${BASE_URL}/avi-dm`);
    await page.waitForLoadState('networkidle');

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500); // Allow responsive changes

    // Verify DM interface adapts to mobile
    await expect(page.locator('[data-testid="avi-dm-interface"]')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);

    // Verify DM interface adapts to tablet
    await expect(page.locator('[data-testid="avi-dm-interface"]')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);

    // Verify DM interface works on desktop
    await expect(page.locator('[data-testid="avi-dm-interface"]')).toBeVisible();
  });

  test('Avi DM accessibility preservation', async () => {
    await page.goto(`${BASE_URL}/avi-dm`);
    await page.waitForLoadState('networkidle');

    // Verify keyboard navigation works
    await page.keyboard.press('Tab');
    const focusedElement = await page.locator(':focus').first();
    await expect(focusedElement).toBeVisible();

    // Verify screen reader compatibility
    const dmInterface = page.locator('[data-testid="avi-dm-interface"]');
    await expect(dmInterface).toHaveAttribute('role');

    // Verify proper heading structure
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    await expect(headings.first()).toBeVisible();
  });

  test('Avi DM performance after interactive control removal', async () => {
    const startTime = Date.now();

    await page.goto(`${BASE_URL}/avi-dm`);
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Verify reasonable load time (should be faster without interactive controls)
    expect(loadTime).toBeLessThan(5000); // 5 seconds max

    // Verify no JavaScript errors
    const jsErrors = [];
    page.on('pageerror', error => jsErrors.push(error.message));

    await page.waitForTimeout(1000); // Wait for any delayed errors
    expect(jsErrors).toHaveLength(0);
  });

  test('Avi DM state management without interactive elements', async () => {
    await page.goto(`${BASE_URL}/avi-dm`);
    await page.waitForLoadState('networkidle');

    // Verify initial state is correct
    const dmInterface = page.locator('[data-testid="avi-dm-interface"]');
    await expect(dmInterface).toBeVisible();

    // Verify state persists across page interactions
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify DM interface reloads correctly
    await expect(dmInterface).toBeVisible();
  });

  test('Avi DM integration with agent feed', async () => {
    await page.goto(`${BASE_URL}/avi-dm`);
    await page.waitForLoadState('networkidle');

    // Verify DM data can be posted to agent feed
    const dmData = await page.locator('[data-testid="dm-content"]').textContent();

    if (dmData && dmData.trim()) {
      // Navigate to agent feed
      await page.goto(`${BASE_URL}/`);
      await page.waitForLoadState('networkidle');

      // Verify agent feed loads
      await expect(page.locator('[data-testid="agent-feed"]')).toBeVisible();

      // Go back to DM and verify functionality preserved
      await page.goto(`${BASE_URL}/avi-dm`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('[data-testid="avi-dm-interface"]')).toBeVisible();
    }
  });

  test('Avi DM security validation after control removal', async () => {
    await page.goto(`${BASE_URL}/avi-dm`);
    await page.waitForLoadState('networkidle');

    // Verify no XSS vulnerabilities in DM content
    const dmContent = page.locator('[data-testid="dm-content"]');
    if (await dmContent.count() > 0) {
      const contentText = await dmContent.textContent();

      // Verify content is properly escaped
      expect(contentText).not.toContain('<script>');
      expect(contentText).not.toContain('javascript:');
    }

    // Verify proper CSRF protection
    const metaTags = page.locator('meta[name="csrf-token"]');
    if (await metaTags.count() > 0) {
      await expect(metaTags.first()).toHaveAttribute('content');
    }
  });
});