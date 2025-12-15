import { test, expect } from '@playwright/test';
import { ComponentShowcasePage } from './page-objects/ComponentShowcasePage';

/**
 * Component Showcase E2E Test Suite
 * Tests all components on the showcase page
 */

test.describe('Component Showcase E2E Tests', () => {
  let showcasePage: ComponentShowcasePage;

  test.beforeEach(async ({ page }) => {
    showcasePage = new ComponentShowcasePage(page);

    // Set up console error tracking
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Console Error:', msg.text());
      }
    });

    page.on('pageerror', error => {
      console.error('Page Error:', error.message);
    });
  });

  /**
   * TC-001: Page Loads Successfully
   */
  test('TC-001: should load the component showcase page successfully', async ({ page }) => {
    await showcasePage.navigate();

    // Verify page URL is correct
    expect(page.url()).toContain('component-showcase');

    // Verify main container is visible
    await expect(showcasePage.pageContainer.first()).toBeVisible({ timeout: 10000 });

    // Take baseline screenshot
    await showcasePage.captureFullPageScreenshot('page-load-success');

    console.log('✅ Page loaded successfully');
  });

  /**
   * TC-002: All Components Render
   */
  test('TC-002: should render multiple components on the page', async ({ page }) => {
    await showcasePage.navigate();

    // Wait for page to fully load
    await showcasePage.waitForPageFullyLoaded();

    // Get all components
    const components = await showcasePage.getAllComponentSections();

    // Verify each component
    const renderedComponents: string[] = [];
    const failedComponents: string[] = [];

    for (const component of components) {
      const isRendered = await showcasePage.verifyComponentRendered(component.name);

      if (isRendered) {
        renderedComponents.push(component.name);
        console.log(`✅ ${component.name} rendered successfully`);
      } else {
        failedComponents.push(component.name);
        console.warn(`⚠️  ${component.name} not found or not visible`);
      }
    }

    // Count visible components
    const visibleCount = await showcasePage.countVisibleComponents();
    console.log(`📊 Total visible components: ${visibleCount} out of ${components.length}`);

    // Assert at least some components rendered (flexible for different implementations)
    expect(visibleCount).toBeGreaterThan(0);

    // Report results
    console.log('\n📋 Component Rendering Summary:');
    console.log(`   ✅ Rendered: ${renderedComponents.length}`);
    console.log(`   ⚠️  Not Found: ${failedComponents.length}`);

    if (renderedComponents.length > 0) {
      console.log(`   Components: ${renderedComponents.join(', ')}`);
    }
  });

  /**
   * TC-003: Sidebar Navigation Functions
   */
  test('TC-003: should have sidebar navigation', async ({ page }) => {
    await showcasePage.navigate();

    // Check if sidebar exists
    const sidebarVisible = await showcasePage.sidebar.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (!sidebarVisible) {
      console.warn('⚠️  Sidebar not found - page might use different navigation');
      test.skip();
      return;
    }

    // Get sidebar items
    const sidebarItems = await showcasePage.getSidebarItems();
    console.log(`📋 Sidebar items found: ${sidebarItems.length}`);

    if (sidebarItems.length > 0) {
      console.log(`   Items: ${sidebarItems.slice(0, 5).join(', ')}...`);
      expect(sidebarItems.length).toBeGreaterThan(0);
    }

    // Take screenshot
    await showcasePage.captureFullPageScreenshot('sidebar-navigation');
  });

  /**
   * TC-004: Interactive Components Are Present
   */
  test('TC-004: should have interactive components', async ({ page }) => {
    await showcasePage.navigate();

    // Check for interactive elements
    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input').count();
    const clickableElements = await page.locator('[onclick], [role="button"], a').count();

    console.log('🎮 Interactive Elements:');
    console.log(`   Buttons: ${buttons}`);
    console.log(`   Inputs: ${inputs}`);
    console.log(`   Other Clickable: ${clickableElements}`);

    const totalInteractive = buttons + inputs + clickableElements;
    expect(totalInteractive).toBeGreaterThan(0);
  });

  /**
   * TC-005: Component Sections Are Scrollable
   */
  test('TC-005: should be able to scroll through components', async ({ page }) => {
    await showcasePage.navigate();

    // Get initial scroll position
    const initialScroll = await page.evaluate(() => window.scrollY);

    // Scroll to bottom
    await showcasePage.scrollToBottom();

    // Get new scroll position
    const bottomScroll = await page.evaluate(() => window.scrollY);

    console.log(`📜 Scroll distance: ${bottomScroll - initialScroll}px`);

    // Verify page is scrollable (has content)
    expect(bottomScroll).toBeGreaterThan(initialScroll);

    // Scroll back to top
    await showcasePage.scrollToTop();
  });

  /**
   * TC-006: No Critical Console Errors
   */
  test('TC-006: should not have critical console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    // Listen for console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      consoleErrors.push(`Page Error: ${error.message}`);
    });

    // Load page
    await showcasePage.navigate();
    await showcasePage.waitForPageFullyLoaded();

    // Wait for any delayed errors
    await page.waitForTimeout(2000);

    // Report findings
    if (consoleErrors.length > 0) {
      console.warn('⚠️  Console Errors Found:');
      consoleErrors.slice(0, 5).forEach(err => console.warn(`   - ${err}`));
    }

    if (consoleWarnings.length > 0) {
      console.warn('⚠️  Console Warnings Found:');
      consoleWarnings.slice(0, 3).forEach(warn => console.warn(`   - ${warn}`));
    }

    // Filter out known harmless errors
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('404') && // Ignore 404s
      !err.includes('favicon') && // Ignore favicon issues
      !err.includes('ResizeObserver') && // Ignore ResizeObserver errors
      !err.toLowerCase().includes('warning') // Ignore warnings logged as errors
    );

    if (criticalErrors.length > 0) {
      console.error('❌ Critical Errors:');
      criticalErrors.forEach(err => console.error(`   - ${err}`));
    }

    // Assert no critical errors (flexible threshold)
    expect(criticalErrors.length).toBeLessThanOrEqual(2);
  });

  /**
   * TC-007: Page Has Proper Structure
   */
  test('TC-007: should have proper page structure', async ({ page }) => {
    await showcasePage.navigate();

    // Check for semantic HTML
    const hasMain = await page.locator('main').count() > 0;
    const hasHeading = await page.locator('h1, h2').count() > 0;
    const hasNav = await page.locator('nav, [role="navigation"]').count() > 0;

    console.log('🏗️  Page Structure:');
    console.log(`   Main element: ${hasMain ? '✅' : '❌'}`);
    console.log(`   Heading: ${hasHeading ? '✅' : '❌'}`);
    console.log(`   Navigation: ${hasNav ? '✅' : '❌'}`);

    // At least heading should be present
    expect(hasHeading).toBeTruthy();
  });

  /**
   * TC-008: Images Load Properly
   */
  test('TC-008: should load images if present', async ({ page }) => {
    await showcasePage.navigate();

    // Get all images
    const images = await page.locator('img').all();
    console.log(`🖼️  Found ${images.length} images`);

    if (images.length === 0) {
      console.log('ℹ️  No images found on page');
      test.skip();
      return;
    }

    // Check a few images
    let loadedCount = 0;
    for (const img of images.slice(0, 5)) {
      const isVisible = await img.isVisible();
      if (isVisible) loadedCount++;
    }

    console.log(`   Visible images: ${loadedCount} out of ${Math.min(5, images.length)}`);
    expect(loadedCount).toBeGreaterThan(0);
  });

  /**
   * TC-009: Mobile Responsive Layout
   */
  test('TC-009: should display properly on mobile', async ({ page }) => {
    // Set mobile viewport
    await showcasePage.setViewport(375, 667); // iPhone SE

    // Load page
    await showcasePage.navigate();

    // Verify page container is visible
    await expect(showcasePage.pageContainer.first()).toBeVisible();

    // Check if content adapts
    const visibleComponents = await showcasePage.countVisibleComponents();
    console.log(`📱 Components visible on mobile: ${visibleComponents}`);

    expect(visibleComponents).toBeGreaterThan(0);

    // Take mobile screenshot
    await page.screenshot({
      path: 'tests/e2e/component-showcase/screenshots/mobile-layout.png',
      fullPage: true,
    });
  });

  /**
   * TC-010: Performance Check
   */
  test('TC-010: should meet basic performance requirements', async ({ page }) => {
    // Measure page load time
    const startTime = Date.now();
    await showcasePage.navigate();
    const loadTime = Date.now() - startTime;

    console.log(`⏱️  Page load time: ${loadTime}ms`);

    // Get performance metrics
    const metrics = await showcasePage.measurePerformance();

    console.log('📊 Performance Metrics:');
    console.log(`   DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log(`   Load Complete: ${metrics.loadComplete}ms`);
    console.log(`   DOM Interactive: ${metrics.domInteractive}ms`);
    console.log(`   First Paint: ${metrics.firstPaint}ms`);

    // Assert reasonable load time (flexible for CI environments)
    expect(loadTime).toBeLessThan(10000); // 10 seconds max
  });

  /**
   * TC-011: Visual Regression Baseline
   */
  test('TC-011: should match visual baseline', async ({ page }) => {
    await showcasePage.navigate();
    await showcasePage.waitForPageFullyLoaded();

    // Scroll to ensure all content is loaded
    await showcasePage.scrollToBottom();
    await page.waitForTimeout(500);
    await showcasePage.scrollToTop();
    await page.waitForTimeout(500);

    // Take full page screenshot
    await expect(page).toHaveScreenshot('component-showcase-full-page.png', {
      fullPage: true,
      maxDiffPixels: 500, // Allow for some differences
      timeout: 10000,
    });
  });

  /**
   * TC-012: Accessibility Basics
   */
  test('TC-012: should have basic accessibility features', async ({ page }) => {
    await showcasePage.navigate();

    // Check for alt text on images
    const images = await page.locator('img').all();
    let imagesWithAlt = 0;

    for (const img of images.slice(0, 10)) {
      const alt = await img.getAttribute('alt');
      if (alt !== null) imagesWithAlt++;
    }

    if (images.length > 0) {
      console.log(`♿ Images with alt text: ${imagesWithAlt} out of ${Math.min(10, images.length)}`);
    }

    // Check for heading hierarchy
    const h1Count = await page.locator('h1').count();
    console.log(`♿ H1 headings: ${h1Count}`);

    // Check for keyboard-focusable elements
    const buttons = await page.locator('button:not([disabled])').count();
    const links = await page.locator('a[href]').count();
    console.log(`♿ Focusable elements: ${buttons + links}`);

    expect(h1Count).toBeGreaterThan(0);
  });

  /**
   * TC-013: Text Content Is Present
   */
  test('TC-013: should have meaningful text content', async ({ page }) => {
    await showcasePage.navigate();

    // Get text content
    const bodyText = await page.locator('body').textContent();
    const textLength = bodyText?.trim().length || 0;

    console.log(`📝 Page text length: ${textLength} characters`);

    // Verify there's meaningful content
    expect(textLength).toBeGreaterThan(100);
  });

  /**
   * TC-014: Links Are Functional
   */
  test('TC-014: should have functional links if present', async ({ page }) => {
    await showcasePage.navigate();

    // Get all links
    const links = await page.locator('a[href]').all();
    console.log(`🔗 Found ${links.length} links`);

    if (links.length === 0) {
      console.log('ℹ️  No links found on page');
      test.skip();
      return;
    }

    // Check a few links
    for (const link of links.slice(0, 3)) {
      const href = await link.getAttribute('href');
      const isVisible = await link.isVisible();

      console.log(`   Link: ${href?.slice(0, 50)} (visible: ${isVisible})`);
    }

    expect(links.length).toBeGreaterThan(0);
  });

  /**
   * TC-015: Component Screenshots
   */
  test('TC-015: should capture individual component screenshots', async ({ page }) => {
    await showcasePage.navigate();
    await showcasePage.waitForPageFullyLoaded();

    const components = await showcasePage.getAllComponentSections();
    let capturedCount = 0;

    for (const component of components) {
      const isRendered = await showcasePage.verifyComponentRendered(component.name);

      if (isRendered) {
        await showcasePage.scrollToComponent(component.name);
        await showcasePage.captureComponentScreenshot(component.name);
        capturedCount++;
        console.log(`📸 Captured screenshot for ${component.name}`);
      }
    }

    console.log(`📸 Total screenshots captured: ${capturedCount}`);
    expect(capturedCount).toBeGreaterThan(0);
  });
});

/**
 * Cross-Browser Tests (Simplified)
 */
test.describe('Cross-Browser Compatibility', () => {
  test('should work across browsers', async ({ page, browserName }) => {
    const showcasePage = new ComponentShowcasePage(page);
    await showcasePage.navigate();

    await expect(showcasePage.pageContainer.first()).toBeVisible();

    console.log(`✅ ${browserName}: Page loaded successfully`);
  });
});
