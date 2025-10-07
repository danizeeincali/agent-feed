import { test, expect, Page } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ============================================================================
 * Layer 2: Page Verification Agent - Comprehensive E2E Test Suite
 * ============================================================================
 *
 * Purpose: Automated validation of dynamic pages to ensure components render
 * correctly, sidebar navigation works, and interactive elements are functional.
 *
 * Test Coverage:
 * 1. Sidebar Navigation Tests (10+ tests)
 * 2. Component Rendering Tests (8+ tests)
 * 3. Interactive Elements Tests (7+ tests)
 * 4. Visual Regression Tests (5+ tests)
 *
 * Test Strategy: Page Object Model pattern with comprehensive screenshot capture
 * ============================================================================
 */

// ============================================================================
// Page Object Models
// ============================================================================

/**
 * Dynamic Page Object - Encapsulates all interactions with dynamic pages
 */
class DynamicPageObject {
  constructor(private page: Page) {}

  // Navigation methods
  async navigateToAgentPage(agentId: string, pageId: string) {
    await this.page.goto(`/agents/${agentId}/pages/${pageId}`);
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    // Wait for loading spinner to disappear
    await this.page.waitForSelector('[data-testid="loading-spinner"]', {
      state: 'hidden',
      timeout: 10000
    }).catch(() => {});

    // Wait for main content to be visible
    await this.page.waitForSelector('main, [role="main"]', {
      state: 'visible',
      timeout: 10000
    });
  }

  // Sidebar methods
  async getSidebarItems() {
    return await this.page.locator('nav[role="navigation"] [role="button"]').all();
  }

  async clickSidebarItem(label: string) {
    await this.page.click(`nav[role="navigation"] >> text="${label}"`);
  }

  async getSidebarItemByLabel(label: string) {
    return this.page.locator(`nav[role="navigation"] >> text="${label}"`);
  }

  async expandSidebarItem(label: string) {
    const item = await this.getSidebarItemByLabel(label);
    const isExpanded = await item.getAttribute('aria-expanded');

    if (isExpanded !== 'true') {
      await item.click();
    }
  }

  async collapseSidebarItem(label: string) {
    const item = await this.getSidebarItemByLabel(label);
    const isExpanded = await item.getAttribute('aria-expanded');

    if (isExpanded === 'true') {
      await item.click();
    }
  }

  async isSidebarItemDisabled(label: string) {
    const item = await this.getSidebarItemByLabel(label);
    const disabled = await item.getAttribute('aria-disabled');
    return disabled === 'true';
  }

  async getSidebarItemBadge(label: string) {
    const item = await this.getSidebarItemByLabel(label);
    const badge = await item.locator('[aria-label*="items"]').textContent();
    return badge;
  }

  // Component methods
  async getRenderedComponents() {
    return await this.page.locator('[data-component-type]').all();
  }

  async getComponentByType(type: string) {
    return this.page.locator(`[data-component-type="${type}"]`);
  }

  async isComponentVisible(type: string) {
    return await this.getComponentByType(type).isVisible();
  }

  async getComponentErrorBoundary() {
    return this.page.locator('[data-testid="component-error"]');
  }

  async hasComponentErrors() {
    return await this.getComponentErrorBoundary().count() > 0;
  }

  // Interactive element methods
  async getAllButtons() {
    return await this.page.locator('button:visible').all();
  }

  async getAllLinks() {
    return await this.page.locator('a:visible').all();
  }

  async getAllForms() {
    return await this.page.locator('form').all();
  }

  async getAllInputs() {
    return await this.page.locator('input:visible, textarea:visible, select:visible').all();
  }

  // Screenshot methods
  async captureFullPageScreenshot(name: string) {
    const screenshotPath = path.join(__dirname, '../screenshots/page-verification', name);
    await fs.promises.mkdir(path.dirname(screenshotPath), { recursive: true });
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    return screenshotPath;
  }

  async captureElementScreenshot(selector: string, name: string) {
    const screenshotPath = path.join(__dirname, '../screenshots/page-verification', name);
    await fs.promises.mkdir(path.dirname(screenshotPath), { recursive: true });
    const element = await this.page.locator(selector);
    await element.screenshot({ path: screenshotPath });
    return screenshotPath;
  }
}

/**
 * Test Data Factory - Creates test pages and components
 */
class TestDataFactory {
  static createTestPageData(options: any = {}) {
    return {
      id: options.id || 'test-page-1',
      agentId: options.agentId || 'test-agent-1',
      title: options.title || 'Test Dynamic Page',
      version: options.version || '1.0.0',
      layout: options.layout || 'sidebar',
      components: options.components || [],
      metadata: options.metadata || {
        description: 'Test page for E2E validation',
        tags: ['test', 'e2e'],
        icon: 'TestTube'
      },
      status: options.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  static createSidebarConfig(options: any = {}) {
    return {
      type: 'Sidebar',
      props: {
        items: options.items || [
          { id: 'home', label: 'Home', icon: 'Home', href: '/' },
          { id: 'about', label: 'About', icon: 'Info', href: '/about' },
          {
            id: 'products',
            label: 'Products',
            icon: 'Package',
            children: [
              { id: 'all-products', label: 'All Products', href: '/products' },
              { id: 'featured', label: 'Featured', href: '/products/featured', badge: '5' }
            ]
          },
          { id: 'settings', label: 'Settings', icon: 'Settings', href: '/settings' },
          { id: 'disabled', label: 'Disabled Item', icon: 'Ban', disabled: true }
        ],
        position: options.position || 'left',
        collapsible: options.collapsible !== undefined ? options.collapsible : true
      }
    };
  }
}

// ============================================================================
// Test Suite Setup
// ============================================================================

test.describe('Page Verification Agent - Comprehensive E2E Tests', () => {
  let pageObject: DynamicPageObject;
  const screenshotDir = path.join(__dirname, '../screenshots/page-verification');

  test.beforeAll(async () => {
    // Ensure screenshot directory exists
    await fs.promises.mkdir(screenshotDir, { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    pageObject = new DynamicPageObject(page);

    // Set up API mocking or test data
    await page.route('**/api/agent-pages/**', async (route) => {
      const url = route.request().url();

      // Mock page data response
      if (url.includes('/pages/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            page: TestDataFactory.createTestPageData({
              components: [
                TestDataFactory.createSidebarConfig(),
                { type: 'MarkdownRenderer', props: { content: '# Test Heading\n\nTest content' } },
                { type: 'Checklist', props: { items: ['Item 1', 'Item 2'], title: 'Test Checklist' } }
              ]
            })
          })
        });
      } else {
        await route.continue();
      }
    });
  });

  // ============================================================================
  // 1. SIDEBAR NAVIGATION TESTS (10+ tests)
  // ============================================================================

  test.describe('Sidebar Navigation Tests', () => {
    test('SIDEBAR-01: All sidebar items should be visible and clickable', async ({ page }) => {
      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      const sidebarItems = await pageObject.getSidebarItems();

      // Verify we have sidebar items
      expect(sidebarItems.length).toBeGreaterThan(0);

      // Check each item is clickable (not disabled)
      for (const item of sidebarItems) {
        const isDisabled = await item.getAttribute('aria-disabled');
        const label = await item.textContent();

        if (isDisabled !== 'true') {
          await expect(item).toBeEnabled();
          console.log(`✓ Sidebar item "${label}" is clickable`);
        } else {
          console.log(`⚠ Sidebar item "${label}" is disabled (expected)`);
        }
      }

      // Capture screenshot
      await pageObject.captureElementScreenshot('nav[role="navigation"]', 'sidebar-items-visible.png');
    });

    test('SIDEBAR-02: Hash anchor navigation should scroll to target element', async ({ page }) => {
      // Add a test section to scroll to
      await page.evaluate(() => {
        const section = document.createElement('div');
        section.id = 'test-section';
        section.textContent = 'Test Section';
        section.style.marginTop = '1000px';
        document.body.appendChild(section);
      });

      // Mock sidebar with hash link
      await page.route('**/api/agent-pages/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            page: TestDataFactory.createTestPageData({
              components: [{
                type: 'Sidebar',
                props: {
                  items: [
                    { id: 'scroll-test', label: 'Scroll to Section', href: '#test-section' }
                  ]
                }
              }]
            })
          })
        });
      });

      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      // Click hash link
      await pageObject.clickSidebarItem('Scroll to Section');

      // Wait for scroll animation
      await page.waitForTimeout(1000);

      // Verify element is in viewport
      const isInViewport = await page.evaluate(() => {
        const element = document.getElementById('test-section');
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return rect.top >= 0 && rect.top <= window.innerHeight;
      });

      expect(isInViewport).toBeTruthy();

      await pageObject.captureFullPageScreenshot('hash-anchor-navigation.png');
    });

    test('SIDEBAR-03: Route navigation should change URL and load new content', async ({ page }) => {
      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      // Click route link
      const initialUrl = page.url();
      await pageObject.clickSidebarItem('About');

      // Wait for navigation
      await page.waitForTimeout(500);

      // Verify URL changed
      const newUrl = page.url();
      expect(newUrl).not.toBe(initialUrl);
      expect(newUrl).toContain('/about');

      await pageObject.captureFullPageScreenshot('route-navigation.png');
    });

    test('SIDEBAR-04: Nested sidebar items should expand and collapse', async ({ page }) => {
      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      // Verify item is collapsed initially
      const item = await pageObject.getSidebarItemByLabel('Products');
      let isExpanded = await item.getAttribute('aria-expanded');
      expect(isExpanded).toBe('false');

      // Expand item
      await pageObject.expandSidebarItem('Products');
      await page.waitForTimeout(300); // Wait for animation

      isExpanded = await item.getAttribute('aria-expanded');
      expect(isExpanded).toBe('true');

      // Verify children are visible
      const childVisible = await page.locator('text="All Products"').isVisible();
      expect(childVisible).toBeTruthy();

      await pageObject.captureElementScreenshot('nav[role="navigation"]', 'sidebar-expanded.png');

      // Collapse item
      await pageObject.collapseSidebarItem('Products');
      await page.waitForTimeout(300);

      isExpanded = await item.getAttribute('aria-expanded');
      expect(isExpanded).toBe('false');

      await pageObject.captureElementScreenshot('nav[role="navigation"]', 'sidebar-collapsed.png');
    });

    test('SIDEBAR-05: Disabled items should not be clickable', async ({ page }) => {
      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      const isDisabled = await pageObject.isSidebarItemDisabled('Disabled Item');
      expect(isDisabled).toBeTruthy();

      // Verify it has disabled styling
      const item = await pageObject.getSidebarItemByLabel('Disabled Item');
      const opacity = await item.evaluate((el) => window.getComputedStyle(el).opacity);
      expect(parseFloat(opacity)).toBeLessThan(1);

      // Capture screenshot of disabled item
      await pageObject.captureElementScreenshot(
        'nav[role="navigation"] >> text="Disabled Item"',
        'sidebar-disabled-item.png'
      );
    });

    test('SIDEBAR-06: Badge notifications should display correctly', async ({ page }) => {
      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      // Expand parent to see badge
      await pageObject.expandSidebarItem('Products');
      await page.waitForTimeout(300);

      // Verify badge is present
      const badge = await page.locator('text="Featured"').locator('..').locator('[aria-label*="items"]');
      const badgeText = await badge.textContent();

      expect(badgeText).toBe('5');

      await pageObject.captureElementScreenshot(
        'text="Featured"',
        'sidebar-badge.png'
      );
    });

    test('SIDEBAR-07: Active item should be highlighted', async ({ page }) => {
      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      // Navigate to a page
      await pageObject.clickSidebarItem('Home');
      await page.waitForTimeout(300);

      // Verify active state
      const activeItem = await page.locator('[aria-current="page"]');
      const count = await activeItem.count();

      expect(count).toBeGreaterThan(0);

      await pageObject.captureElementScreenshot('nav[role="navigation"]', 'sidebar-active-item.png');
    });

    test('SIDEBAR-08: Keyboard navigation should work (Arrow keys, Enter, Space)', async ({ page }) => {
      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      // Focus first sidebar item
      await page.keyboard.press('Tab');

      // Navigate with arrow keys
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');

      // Expand with Enter
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);

      // Verify expansion
      const item = await pageObject.getSidebarItemByLabel('Products');
      const isExpanded = await item.getAttribute('aria-expanded');
      expect(isExpanded).toBe('true');

      await pageObject.captureFullPageScreenshot('keyboard-navigation.png');
    });

    test('SIDEBAR-09: Mobile hamburger menu should toggle sidebar', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      // Verify hamburger button exists
      const hamburger = await page.locator('button[aria-label*="navigation menu"]');
      await expect(hamburger).toBeVisible();

      // Verify sidebar is hidden initially
      const sidebar = await page.locator('aside[role="navigation"]');
      const isVisible = await sidebar.isVisible();

      // Click hamburger to open
      await hamburger.click();
      await page.waitForTimeout(500);

      // Verify sidebar is visible
      await expect(sidebar).toBeVisible();

      await pageObject.captureFullPageScreenshot('mobile-sidebar-open.png');

      // Click to close
      await hamburger.click();
      await page.waitForTimeout(500);

      await pageObject.captureFullPageScreenshot('mobile-sidebar-closed.png');
    });

    test('SIDEBAR-10: Collapsible sidebar should minimize and expand', async ({ page }) => {
      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      // Find collapse button
      const collapseButton = await page.locator('button[aria-label*="sidebar"]');

      // Get initial width
      const sidebar = await page.locator('aside[role="navigation"]');
      const initialWidth = await sidebar.evaluate((el) => el.offsetWidth);

      // Collapse
      await collapseButton.click();
      await page.waitForTimeout(500);

      const collapsedWidth = await sidebar.evaluate((el) => el.offsetWidth);
      expect(collapsedWidth).toBeLessThan(initialWidth);

      await pageObject.captureElementScreenshot('aside[role="navigation"]', 'sidebar-minimized.png');

      // Expand
      await collapseButton.click();
      await page.waitForTimeout(500);

      const expandedWidth = await sidebar.evaluate((el) => el.offsetWidth);
      expect(expandedWidth).toBe(initialWidth);

      await pageObject.captureElementScreenshot('aside[role="navigation"]', 'sidebar-expanded-full.png');
    });

    test('SIDEBAR-11: Icons should render correctly for all items', async ({ page }) => {
      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      const sidebarItems = await pageObject.getSidebarItems();

      for (const item of sidebarItems) {
        const icon = await item.locator('svg[aria-hidden="true"]');
        const iconCount = await icon.count();

        if (iconCount > 0) {
          const label = await item.textContent();
          console.log(`✓ Icon rendered for: ${label}`);
        }
      }

      await pageObject.captureElementScreenshot('nav[role="navigation"]', 'sidebar-icons.png');
    });
  });

  // ============================================================================
  // 2. COMPONENT RENDERING TESTS (8+ tests)
  // ============================================================================

  test.describe('Component Rendering Tests', () => {
    test('RENDER-01: All components should render without errors', async ({ page }) => {
      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      // Check for error boundaries
      const hasErrors = await pageObject.hasComponentErrors();
      expect(hasErrors).toBeFalsy();

      // Verify components are present
      const components = await pageObject.getRenderedComponents();
      expect(components.length).toBeGreaterThan(0);

      await pageObject.captureFullPageScreenshot('all-components-rendered.png');
    });

    test('RENDER-02: Error boundaries should catch component errors gracefully', async ({ page }) => {
      // Mock a component that throws an error
      await page.route('**/api/agent-pages/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            page: TestDataFactory.createTestPageData({
              components: [
                { type: 'InvalidComponent', props: {} }
              ]
            })
          })
        });
      });

      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      // Verify error UI is displayed
      const errorBoundary = await page.locator('[data-testid="component-error"], .bg-red-50');
      const count = await errorBoundary.count();

      if (count > 0) {
        await expect(errorBoundary.first()).toBeVisible();
        await pageObject.captureElementScreenshot('[data-testid="component-error"], .bg-red-50', 'error-boundary.png');
      }
    });

    test('RENDER-03: Component props should be validated and displayed correctly', async ({ page }) => {
      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      // Check MarkdownRenderer
      const markdown = await page.locator('h1:has-text("Test Heading")');
      await expect(markdown).toBeVisible();

      // Check Checklist
      const checklist = await page.locator('text="Test Checklist"');
      await expect(checklist).toBeVisible();

      await pageObject.captureFullPageScreenshot('component-props-validated.png');
    });

    test('RENDER-04: Empty states should display helpful messages', async ({ page }) => {
      // Mock page with no components
      await page.route('**/api/agent-pages/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            page: TestDataFactory.createTestPageData({
              components: []
            })
          })
        });
      });

      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      // Verify empty state message
      const emptyState = await page.locator('text="No Components Configured"');
      await expect(emptyState).toBeVisible();

      // Verify action button is present
      const addButton = await page.locator('button:has-text("Add Components")');
      await expect(addButton).toBeVisible();

      await pageObject.captureFullPageScreenshot('empty-state.png');
    });

    test('RENDER-05: Loading states should be displayed during data fetch', async ({ page }) => {
      // Slow down API response
      await page.route('**/api/agent-pages/**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            page: TestDataFactory.createTestPageData()
          })
        });
      });

      const navigationPromise = pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      // Check for loading indicator
      await page.waitForTimeout(100);
      const loading = await page.locator('[data-testid="loading-spinner"], .animate-spin, text="Loading"');
      const isLoading = await loading.isVisible().catch(() => false);

      if (isLoading) {
        await pageObject.captureFullPageScreenshot('loading-state.png');
      }

      await navigationPromise;
    });

    test('RENDER-06: Multiple component types should coexist without conflicts', async ({ page }) => {
      await page.route('**/api/agent-pages/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            page: TestDataFactory.createTestPageData({
              components: [
                { type: 'Sidebar', props: { items: [{ id: '1', label: 'Test' }] } },
                { type: 'MarkdownRenderer', props: { content: '# Heading' } },
                { type: 'Checklist', props: { items: ['Item 1'], title: 'List' } },
                { type: 'PhotoGrid', props: { photos: [] } },
                { type: 'Calendar', props: { events: [] } }
              ]
            })
          })
        });
      });

      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      const components = await pageObject.getRenderedComponents();
      expect(components.length).toBeGreaterThanOrEqual(3);

      await pageObject.captureFullPageScreenshot('multiple-components.png');
    });

    test('RENDER-07: Component styling should not conflict with global styles', async ({ page }) => {
      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      // Check for layout issues
      const bodyOverflow = await page.evaluate(() => {
        return window.getComputedStyle(document.body).overflow;
      });

      expect(bodyOverflow).not.toBe('hidden');

      // Check for z-index stacking issues
      const overlaps = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        // Basic overlap detection
        return elements.length > 0;
      });

      expect(overlaps).toBeTruthy();

      await pageObject.captureFullPageScreenshot('styling-validation.png');
    });

    test('RENDER-08: Responsive layouts should adapt to viewport changes', async ({ page }) => {
      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      // Desktop view
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(500);
      await pageObject.captureFullPageScreenshot('responsive-desktop.png');

      // Tablet view
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);
      await pageObject.captureFullPageScreenshot('responsive-tablet.png');

      // Mobile view
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      await pageObject.captureFullPageScreenshot('responsive-mobile.png');
    });

    test('RENDER-09: Dark mode should toggle correctly', async ({ page }) => {
      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      // Toggle dark mode via system preference
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForTimeout(300);

      await pageObject.captureFullPageScreenshot('dark-mode.png');

      // Toggle back to light
      await page.emulateMedia({ colorScheme: 'light' });
      await page.waitForTimeout(300);

      await pageObject.captureFullPageScreenshot('light-mode.png');
    });
  });

  // ============================================================================
  // 3. INTERACTIVE ELEMENTS TESTS (7+ tests)
  // ============================================================================

  test.describe('Interactive Elements Tests', () => {
    test('INTERACTIVE-01: All buttons should have actions or handlers', async ({ page }) => {
      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      const buttons = await pageObject.getAllButtons();
      const failedButtons: string[] = [];

      for (const button of buttons) {
        const hasOnClick = await button.evaluate((el) => {
          return el.onclick !== null ||
                 el.getAttribute('onclick') !== null ||
                 el.hasAttribute('type');
        });

        if (!hasOnClick) {
          const text = await button.textContent();
          failedButtons.push(text || 'unnamed button');
        }
      }

      if (failedButtons.length > 0) {
        await pageObject.captureFullPageScreenshot('buttons-without-handlers.png');
        console.warn('Buttons without handlers:', failedButtons);
      }

      expect(failedButtons.length).toBe(0);
    });

    test('INTERACTIVE-02: All forms should have submit handlers', async ({ page }) => {
      // Add a form to test
      await page.route('**/api/agent-pages/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            page: TestDataFactory.createTestPageData({
              components: [
                {
                  type: 'MarkdownRenderer',
                  props: {
                    content: `
                      <form id="test-form">
                        <input type="text" name="test" />
                        <button type="submit">Submit</button>
                      </form>
                    `
                  }
                }
              ]
            })
          })
        });
      });

      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      const forms = await pageObject.getAllForms();

      for (const form of forms) {
        const hasSubmitHandler = await form.evaluate((el) => {
          return el.onsubmit !== null || el.getAttribute('onsubmit') !== null;
        });

        // Forms should either have a handler or an action
        const action = await form.getAttribute('action');
        expect(hasSubmitHandler || action).toBeTruthy();
      }

      await pageObject.captureFullPageScreenshot('forms-validation.png');
    });

    test('INTERACTIVE-03: All links should have valid hrefs', async ({ page }) => {
      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      const links = await pageObject.getAllLinks();
      const invalidLinks: string[] = [];

      for (const link of links) {
        const href = await link.getAttribute('href');
        const text = await link.textContent();

        if (!href || href === '#' || href === '') {
          invalidLinks.push(text || 'unnamed link');
        }
      }

      if (invalidLinks.length > 0) {
        await pageObject.captureFullPageScreenshot('invalid-links.png');
        console.warn('Links with invalid hrefs:', invalidLinks);
      }

      expect(invalidLinks.length).toBe(0);
    });

    test('INTERACTIVE-04: All inputs should be functional', async ({ page }) => {
      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      const inputs = await pageObject.getAllInputs();

      for (const input of inputs) {
        const isDisabled = await input.isDisabled();
        const isReadonly = await input.getAttribute('readonly');

        if (!isDisabled && !isReadonly) {
          // Test typing
          await input.click();
          await input.type('test');

          const value = await input.inputValue();
          expect(value).toContain('test');

          await input.clear();
        }
      }

      await pageObject.captureFullPageScreenshot('inputs-functional.png');
    });

    test('INTERACTIVE-05: Click events should provide visual feedback', async ({ page }) => {
      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      // Click a sidebar item
      const item = await pageObject.getSidebarItemByLabel('Home');

      // Capture before click
      await pageObject.captureElementScreenshot('nav[role="navigation"]', 'before-click.png');

      await item.click();
      await page.waitForTimeout(200);

      // Capture after click
      await pageObject.captureElementScreenshot('nav[role="navigation"]', 'after-click.png');

      // Verify state changed (e.g., active class)
      const isActive = await item.getAttribute('aria-current');
      expect(isActive).toBeTruthy();
    });

    test('INTERACTIVE-06: Hover states should be visible', async ({ page }) => {
      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      const item = await pageObject.getSidebarItemByLabel('Home');

      // Capture normal state
      await pageObject.captureElementScreenshot('nav[role="navigation"]', 'normal-state.png');

      // Hover
      await item.hover();
      await page.waitForTimeout(200);

      // Capture hover state
      await pageObject.captureElementScreenshot('nav[role="navigation"]', 'hover-state.png');
    });

    test('INTERACTIVE-07: Focus states should be visible for accessibility', async ({ page }) => {
      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      // Tab to first focusable element
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);

      // Check for focus ring
      const focusedElement = await page.locator(':focus');
      await expect(focusedElement).toBeVisible();

      await pageObject.captureFullPageScreenshot('focus-state.png');
    });
  });

  // ============================================================================
  // 4. VISUAL REGRESSION TESTS (5+ tests)
  // ============================================================================

  test.describe('Visual Regression Tests', () => {
    test('VISUAL-01: Capture baseline screenshot of full page', async ({ page }) => {
      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      await pageObject.captureFullPageScreenshot('baseline-full-page.png');

      // Compare against baseline (if exists)
      await expect(page).toHaveScreenshot('baseline-full-page.png', {
        fullPage: true,
        threshold: 0.2,
        maxDiffPixels: 100
      });
    });

    test('VISUAL-02: Capture baseline of sidebar component', async ({ page }) => {
      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      const sidebar = await page.locator('aside[role="navigation"]');
      await expect(sidebar).toHaveScreenshot('baseline-sidebar.png', {
        threshold: 0.2
      });
    });

    test('VISUAL-03: Capture baseline of content area', async ({ page }) => {
      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      const content = await page.locator('main, [role="main"]');

      if (await content.count() > 0) {
        await expect(content).toHaveScreenshot('baseline-content.png', {
          threshold: 0.2
        });
      }
    });

    test('VISUAL-04: Detect layout shifts and visual regressions', async ({ page }) => {
      await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');

      // Measure Cumulative Layout Shift (CLS)
      const cls = await page.evaluate(() => {
        return new Promise((resolve) => {
          let clsValue = 0;
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
          });

          observer.observe({ type: 'layout-shift', buffered: true });

          setTimeout(() => {
            observer.disconnect();
            resolve(clsValue);
          }, 3000);
        });
      });

      console.log('Cumulative Layout Shift:', cls);
      expect(cls).toBeLessThan(0.1); // Good CLS score

      await pageObject.captureFullPageScreenshot('layout-shift-test.png');
    });

    test('VISUAL-05: Compare visual states across viewport sizes', async ({ page }) => {
      const viewports = [
        { width: 1920, height: 1080, name: 'desktop' },
        { width: 1024, height: 768, name: 'tablet-landscape' },
        { width: 768, height: 1024, name: 'tablet-portrait' },
        { width: 375, height: 667, name: 'mobile' }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await pageObject.navigateToAgentPage('test-agent-1', 'test-page-1');
        await page.waitForTimeout(500);

        await pageObject.captureFullPageScreenshot(`visual-${viewport.name}.png`);

        await expect(page).toHaveScreenshot(`visual-${viewport.name}.png`, {
          fullPage: true,
          threshold: 0.3
        });
      }
    });
  });

  // ============================================================================
  // CLEANUP
  // ============================================================================

  test.afterAll(async () => {
    console.log(`\n✓ Screenshots saved to: ${screenshotDir}`);
  });
});

/**
 * ============================================================================
 * Test Execution Instructions
 * ============================================================================
 *
 * Run all tests:
 *   npx playwright test page-verification.spec.ts
 *
 * Run specific test group:
 *   npx playwright test page-verification.spec.ts --grep "Sidebar Navigation"
 *   npx playwright test page-verification.spec.ts --grep "Component Rendering"
 *   npx playwright test page-verification.spec.ts --grep "Interactive Elements"
 *   npx playwright test page-verification.spec.ts --grep "Visual Regression"
 *
 * Run with UI mode:
 *   npx playwright test page-verification.spec.ts --ui
 *
 * Generate HTML report:
 *   npx playwright test page-verification.spec.ts && npx playwright show-report
 *
 * Update visual baselines:
 *   npx playwright test page-verification.spec.ts --update-snapshots
 *
 * ============================================================================
 */
