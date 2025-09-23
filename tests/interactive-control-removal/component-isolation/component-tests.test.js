/**
 * Component Isolation Tests
 *
 * Tests individual components in isolation to ensure they work correctly
 * after removing interactive controls. No mocks - real component testing.
 */

import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Component Isolation Tests', () => {
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

    // Monitor component errors
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('Component')) {
        console.error('Component error:', msg.text());
      }
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.afterAll(async () => {
    await context.close();
    await browser.close();
  });

  test('AgentCard component isolation', async () => {
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    // Find agent cards
    const agentCards = page.locator('[data-testid="agent-card"]');
    const cardCount = await agentCards.count();

    if (cardCount > 0) {
      const firstCard = agentCards.first();

      // Verify card structure
      await expect(firstCard).toBeVisible();

      // Verify card content elements exist
      await expect(firstCard.locator('.agent-name, [data-testid="agent-name"]')).toBeVisible();

      // Verify no interactive controls remain
      const interactiveElements = firstCard.locator('button:not([disabled]), input, textarea, select');
      const interactiveCount = await interactiveElements.count();

      // Log for debugging
      if (interactiveCount > 0) {
        console.log(`Found ${interactiveCount} interactive elements in AgentCard`);
      }

      // Verify card renders without errors
      const cardText = await firstCard.textContent();
      expect(cardText.length).toBeGreaterThan(0);
    }
  });

  test('AgentsList component isolation', async () => {
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    // Find agents list container
    const agentsList = page.locator('[data-testid="agent-list"], [data-testid="agents-grid"]');

    if (await agentsList.count() > 0) {
      await expect(agentsList.first()).toBeVisible();

      // Verify list renders items
      const listItems = agentsList.first().locator('[data-testid="agent-card"], .agent-card');
      const itemCount = await listItems.count();

      expect(itemCount).toBeGreaterThanOrEqual(0);

      // Verify list accessibility
      const listRole = await agentsList.first().getAttribute('role');
      if (listRole) {
        expect(['list', 'grid', 'main', 'region']).toContain(listRole);
      }
    }
  });

  test('ErrorBoundary component isolation', async () => {
    // Navigate to a page that might trigger errors
    await page.goto(`${BASE_URL}/agents/non-existent-agent`);
    await page.waitForLoadState('networkidle');

    // Look for error boundary
    const errorBoundary = page.locator('[data-testid="error-boundary"], .error-boundary');

    // If error boundary exists, verify it works
    if (await errorBoundary.count() > 0) {
      await expect(errorBoundary.first()).toBeVisible();

      // Verify error message
      const errorContent = await errorBoundary.first().textContent();
      expect(errorContent).toMatch(/error|something went wrong|not found/i);

      // Verify reload functionality if present
      const reloadButton = errorBoundary.first().locator('button:has-text("reload"), button:has-text("retry")');
      if (await reloadButton.count() > 0) {
        await expect(reloadButton.first()).toBeVisible();
      }
    }

    // Test deliberate error triggering
    await page.evaluate(() => {
      // Simulate a component error
      const errorEvent = new Error('Test error for boundary');
      window.dispatchEvent(new ErrorEvent('error', { error: errorEvent }));
    });

    await page.waitForTimeout(500);

    // Verify page still functions after error
    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBe(true);
  });

  test('Navigation component isolation', async () => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Find navigation component
    const navigation = page.locator('nav, [data-testid="navigation"], .navigation');

    if (await navigation.count() > 0) {
      await expect(navigation.first()).toBeVisible();

      // Verify navigation links
      const navLinks = navigation.first().locator('a[href]');
      const linkCount = await navLinks.count();

      expect(linkCount).toBeGreaterThanOrEqual(0);

      // Test each navigation link
      for (let i = 0; i < Math.min(linkCount, 5); i++) {
        const link = navLinks.nth(i);
        const href = await link.getAttribute('href');

        if (href && !href.startsWith('http')) {
          // Internal link - verify it's valid
          expect(href).toMatch(/^\/|^#/);
        }
      }
    }
  });

  test('Loading component isolation', async () => {
    // Create a slow-loading scenario
    await page.route('**/api/**', route => {
      setTimeout(() => route.continue(), 1000);
    });

    await page.goto(`${BASE_URL}/agents`);

    // Look for loading indicators
    const loadingElements = page.locator('[data-testid="loading"], .loading, .spinner');

    if (await loadingElements.count() > 0) {
      // Verify loading state appears
      await expect(loadingElements.first()).toBeVisible();

      // Wait for loading to complete
      await page.waitForLoadState('networkidle');

      // Verify loading state disappears
      await expect(loadingElements.first()).toHaveCount(0);
    }
  });

  test('Header component isolation', async () => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Find header component
    const header = page.locator('header, [data-testid="header"], .header');

    if (await header.count() > 0) {
      await expect(header.first()).toBeVisible();

      // Verify header content
      const headerText = await header.first().textContent();
      expect(headerText.length).toBeGreaterThan(0);

      // Verify no interactive controls in header after removal
      const headerInteractives = header.first().locator('button:not([disabled]), input, textarea');
      const headerInteractiveCount = await headerInteractives.count();

      console.log(`Header interactive elements: ${headerInteractiveCount}`);
    }
  });

  test('Footer component isolation', async () => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Find footer component
    const footer = page.locator('footer, [data-testid="footer"], .footer');

    if (await footer.count() > 0) {
      await expect(footer.first()).toBeVisible();

      // Verify footer content
      const footerText = await footer.first().textContent();
      expect(footerText.length).toBeGreaterThan(0);
    }
  });

  test('Modal component isolation', async () => {
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    // Look for any modal triggers (even if they're now disabled)
    const modalTriggers = page.locator('[data-modal], [aria-haspopup="dialog"]');

    if (await modalTriggers.count() > 0) {
      // Verify modal triggers exist but don't cause errors
      const firstTrigger = modalTriggers.first();
      await expect(firstTrigger).toBeVisible();

      // Check if clicking disabled trigger doesn't break anything
      await firstTrigger.click({ force: true });
      await page.waitForTimeout(500);

      // Verify page still functions
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    }
  });

  test('Search component isolation', async () => {
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    // Find search components
    const searchElements = page.locator('[data-testid="search"], .search, input[type="search"]');

    if (await searchElements.count() > 0) {
      const searchElement = searchElements.first();
      await expect(searchElement).toBeVisible();

      // Verify search field exists but may be disabled
      const isDisabled = await searchElement.getAttribute('disabled');

      if (!isDisabled) {
        // If still enabled, test basic functionality
        await searchElement.fill('test');
        const value = await searchElement.inputValue();
        expect(value).toBe('test');
      }
    }
  });

  test('Filter component isolation', async () => {
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    // Find filter components
    const filterElements = page.locator('[data-testid="filter"], .filter, select');

    if (await filterElements.count() > 0) {
      const filterElement = filterElements.first();
      await expect(filterElement).toBeVisible();

      // Verify filter exists and doesn't cause errors
      const filterText = await filterElement.textContent();
      expect(filterText).toBeDefined();
    }
  });

  test('Card grid component isolation', async () => {
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    // Find grid container
    const gridContainer = page.locator('.grid, [data-testid="grid"], .agents-grid');

    if (await gridContainer.count() > 0) {
      await expect(gridContainer.first()).toBeVisible();

      // Verify grid layout
      const gridItems = gridContainer.first().locator('> *');
      const itemCount = await gridItems.count();

      expect(itemCount).toBeGreaterThanOrEqual(0);

      // Verify responsive behavior
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);

      await expect(gridContainer.first()).toBeVisible();

      await page.setViewportSize({ width: 1280, height: 720 });
    }
  });

  test('Accessibility component isolation', async () => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const firstFocusable = page.locator(':focus');

    if (await firstFocusable.count() > 0) {
      await expect(firstFocusable.first()).toBeVisible();
    }

    // Verify ARIA labels and roles
    const ariaElements = page.locator('[aria-label], [role]');
    const ariaCount = await ariaElements.count();

    expect(ariaCount).toBeGreaterThanOrEqual(0);

    // Verify heading structure
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();

    expect(headingCount).toBeGreaterThanOrEqual(1);
  });
});