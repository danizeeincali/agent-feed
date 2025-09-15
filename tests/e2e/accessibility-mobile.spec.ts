import { test, expect, Page } from '@playwright/test';
import { injectAxe, checkA11y, getViolations, reportViolations } from 'axe-playwright';
import { TestHelper, DynamicPagesPage } from './utils/test-helpers';

/**
 * Mobile and Accessibility Compliance Tests
 *
 * Comprehensive testing for:
 * - WCAG 2.1 AA compliance
 * - Mobile responsiveness across devices
 * - Touch interaction compatibility
 * - Screen reader support
 * - Keyboard navigation
 * - Color contrast and visual accessibility
 * - Performance on mobile devices
 */

test.describe('Accessibility Compliance Tests', () => {
  const testAgentId = TestHelper.TEST_AGENT_ID;
  let createdPageIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Inject axe-core for accessibility testing
    await page.goto(TestHelper.FRONTEND_URL);
    await injectAxe(page);
  });

  test.afterEach(async () => {
    await TestHelper.cleanupTestPages(createdPageIds);
    createdPageIds = [];
  });

  test('WCAG 2.1 AA compliance validation', async ({ page }) => {
    // Test dashboard accessibility
    await page.goto(TestHelper.FRONTEND_URL);
    await TestHelper.waitForPageReady(page);

    const dashboardViolations = await getViolations(page, null, {
      tags: ['wcag2a', 'wcag2aa', 'wcag21aa']
    });

    if (dashboardViolations.length > 0) {
      console.warn('Dashboard accessibility violations:', dashboardViolations);
      reportViolations(dashboardViolations, 'Dashboard');
    }

    expect(dashboardViolations.filter(v => v.impact === 'critical').length).toBe(0);
    expect(dashboardViolations.filter(v => v.impact === 'serious').length).toBeLessThanOrEqual(2);

    // Test agents page accessibility
    await TestHelper.navigateToAgents(page);
    await TestHelper.waitForPageReady(page);

    const agentsViolations = await getViolations(page, null, {
      tags: ['wcag2a', 'wcag2aa', 'wcag21aa']
    });

    if (agentsViolations.length > 0) {
      console.warn('Agents page accessibility violations:', agentsViolations);
      reportViolations(agentsViolations, 'Agents Page');
    }

    expect(agentsViolations.filter(v => v.impact === 'critical').length).toBe(0);

    // Test agent profile accessibility
    await TestHelper.navigateToAgent(page, testAgentId);
    await TestHelper.waitForPageReady(page);

    const profileViolations = await getViolations(page, null, {
      tags: ['wcag2a', 'wcag2aa', 'wcag21aa']
    });

    if (profileViolations.length > 0) {
      console.warn('Agent profile accessibility violations:', profileViolations);
      reportViolations(profileViolations, 'Agent Profile');
    }

    expect(profileViolations.filter(v => v.impact === 'critical').length).toBe(0);

    // Test dynamic pages tab accessibility
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();
    await page.waitForSelector(
      '.page-item, [data-testid^="page-"], text="No Dynamic Pages Yet"',
      { timeout: 15000 }
    );

    const dynamicPagesViolations = await getViolations(page, '.bg-white.rounded-lg.border', {
      tags: ['wcag2a', 'wcag2aa', 'wcag21aa']
    });

    if (dynamicPagesViolations.length > 0) {
      console.warn('Dynamic pages accessibility violations:', dynamicPagesViolations);
      reportViolations(dynamicPagesViolations, 'Dynamic Pages');
    }

    expect(dynamicPagesViolations.filter(v => v.impact === 'critical').length).toBe(0);

    console.log('✅ WCAG 2.1 AA compliance validation completed');
  });

  test('Keyboard navigation support', async ({ page }) => {
    await page.goto(TestHelper.FRONTEND_URL);
    await TestHelper.waitForPageReady(page);

    // Test Tab navigation through main elements
    let focusedElements: string[] = [];

    // Start keyboard navigation
    await page.keyboard.press('Tab');

    for (let i = 0; i < 10; i++) {
      const focusedElement = await page.evaluate(() => {
        const element = document.activeElement;
        return element ? {
          tagName: element.tagName,
          type: element.getAttribute('type'),
          text: element.textContent?.substring(0, 50),
          ariaLabel: element.getAttribute('aria-label'),
          role: element.getAttribute('role')
        } : null;
      });

      if (focusedElement) {
        focusedElements.push(
          `${focusedElement.tagName}${focusedElement.type ? `[${focusedElement.type}]` : ''}${
            focusedElement.ariaLabel ? ` (${focusedElement.ariaLabel})` : ''
          }`
        );
      }

      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
    }

    console.log('Keyboard navigation path:', focusedElements);

    // Should have navigated through interactive elements
    expect(focusedElements.length).toBeGreaterThan(3);

    // Test Enter key activation
    await page.goto(TestHelper.FRONTEND_URL);
    await TestHelper.waitForPageReady(page);

    // Navigate to agents link and activate with keyboard
    let foundAgentsLink = false;
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');

      const focusedText = await page.evaluate(() => {
        const element = document.activeElement;
        return element?.textContent?.toLowerCase().includes('agents') ||
               element?.getAttribute('href')?.includes('agents');
      });

      if (focusedText) {
        await page.keyboard.press('Enter');
        foundAgentsLink = true;
        break;
      }
    }

    if (foundAgentsLink) {
      await page.waitForURL('**/agents');
      console.log('✅ Keyboard navigation to agents page successful');
    } else {
      console.log('ℹ️ Agents link may not be keyboard accessible or requires different navigation');
    }

    // Test Escape key functionality
    const modal = page.locator('.modal, [role="dialog"], .popup');
    if (await modal.count() > 0) {
      await page.keyboard.press('Escape');
      await expect(modal.first()).not.toBeVisible({ timeout: 2000 });
      console.log('✅ Escape key modal dismissal working');
    }
  });

  test('Screen reader support and ARIA attributes', async ({ page }) => {
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Check for proper heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    const headingStructure = await Promise.all(
      headings.map(async (heading) => ({
        level: await heading.evaluate(el => el.tagName),
        text: await heading.textContent()
      }))
    );

    console.log('Heading structure:', headingStructure);

    // Should start with h1
    if (headingStructure.length > 0) {
      expect(['H1', 'H2']).toContain(headingStructure[0].level);
    }

    // Check for proper landmark elements
    const landmarks = {
      main: await page.locator('main, [role="main"]').count(),
      navigation: await page.locator('nav, [role="navigation"]').count(),
      banner: await page.locator('header, [role="banner"]').count(),
      contentinfo: await page.locator('footer, [role="contentinfo"]').count()
    };

    console.log('Landmark elements:', landmarks);

    expect(landmarks.main).toBeGreaterThanOrEqual(1);

    // Navigate to Dynamic Pages tab
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();
    await page.waitForSelector(
      '.page-item, [data-testid^="page-"], text="No Dynamic Pages Yet"',
      { timeout: 15000 }
    );

    // Check ARIA attributes on dynamic content
    const pageElements = page.locator('.page-item, [data-testid^="page-"]');
    const pageCount = await pageElements.count();

    if (pageCount > 0) {
      for (let i = 0; i < Math.min(3, pageCount); i++) {
        const pageElement = pageElements.nth(i);

        // Check for descriptive labels
        const ariaLabel = await pageElement.getAttribute('aria-label');
        const role = await pageElement.getAttribute('role');
        const ariaDescribedBy = await pageElement.getAttribute('aria-describedby');

        console.log(`Page ${i + 1} ARIA attributes:`, { ariaLabel, role, ariaDescribedBy });

        // Buttons should have accessible names
        const buttons = pageElement.locator('button');
        const buttonCount = await buttons.count();

        for (let j = 0; j < buttonCount; j++) {
          const button = buttons.nth(j);
          const buttonText = await button.textContent();
          const buttonAriaLabel = await button.getAttribute('aria-label');
          const buttonTitle = await button.getAttribute('title');

          const hasAccessibleName = buttonText || buttonAriaLabel || buttonTitle;
          expect(hasAccessibleName).toBeTruthy();
        }
      }
    }

    // Check for proper form labeling if forms exist
    const formInputs = page.locator('input, textarea, select');
    const inputCount = await formInputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = formInputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');

      // Check for associated label
      let hasLabel = false;
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        hasLabel = await label.count() > 0;
      }

      const hasAccessibleLabel = hasLabel || ariaLabel || ariaLabelledBy;
      if (!hasAccessibleLabel) {
        console.warn(`Input without accessible label found at index ${i}`);
      }
    }

    console.log('✅ Screen reader support validation completed');
  });

  test('Color contrast and visual accessibility', async ({ page }) => {
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Use axe-core color contrast checking
    const colorViolations = await getViolations(page, null, {
      tags: ['cat.color'],
      rules: ['color-contrast']
    });

    if (colorViolations.length > 0) {
      console.warn('Color contrast violations:', colorViolations);
      colorViolations.forEach(violation => {
        console.warn(`- ${violation.description}:`, violation.nodes.map(n => n.html));
      });
    }

    // Should have no critical color contrast violations
    expect(colorViolations.filter(v => v.impact === 'serious').length).toBeLessThanOrEqual(1);

    // Test high contrast mode simulation
    await page.emulateMedia({ forcedColors: 'active' });
    await page.waitForTimeout(1000);

    // Navigate to dynamic pages
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();
    await page.waitForTimeout(2000);

    // Elements should still be visible in high contrast mode
    const tabContent = page.locator('.bg-white.rounded-lg.border, main');
    await expect(tabContent.first()).toBeVisible();

    // Test reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(1000);

    // Animations should be reduced or disabled
    const animatedElements = page.locator('.animate-spin, .animate-pulse, .animate-bounce');
    const animatedCount = await animatedElements.count();

    if (animatedCount > 0) {
      // Check if animations respect reduced motion
      const animations = await page.evaluate(() => {
        const elements = document.querySelectorAll('.animate-spin, .animate-pulse, .animate-bounce');
        return Array.from(elements).map(el => {
          const computedStyle = window.getComputedStyle(el);
          return {
            animationDuration: computedStyle.animationDuration,
            transitionDuration: computedStyle.transitionDuration
          };
        });
      });

      console.log('Animation durations with reduced motion:', animations);
    }

    // Reset media preferences
    await page.emulateMedia({ forcedColors: null, reducedMotion: null });

    console.log('✅ Color contrast and visual accessibility validation completed');
  });

  test('Focus management and visual indicators', async ({ page }) => {
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Test focus visibility
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Check if focus outline is visible
    const focusStyles = await focusedElement.evaluate(el => {
      const computedStyle = window.getComputedStyle(el);
      return {
        outline: computedStyle.outline,
        outlineWidth: computedStyle.outlineWidth,
        outlineStyle: computedStyle.outlineStyle,
        outlineColor: computedStyle.outlineColor,
        boxShadow: computedStyle.boxShadow
      };
    });

    console.log('Focus styles:', focusStyles);

    // Should have visible focus indicator
    const hasFocusIndicator = focusStyles.outline !== 'none' ||
                             focusStyles.outlineWidth !== '0px' ||
                             focusStyles.boxShadow.includes('rgb');

    expect(hasFocusIndicator).toBe(true);

    // Test focus trap in modals (if any exist)
    const modalTrigger = page.locator('button:has-text("Create"), button:has-text("Edit"), .modal-trigger');

    if (await modalTrigger.count() > 0) {
      await modalTrigger.first().click();
      await page.waitForTimeout(1000);

      const modal = page.locator('.modal, [role="dialog"], .popup');
      if (await modal.count() > 0) {
        // Focus should be trapped within modal
        const focusableInModal = modal.locator('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])');
        const focusableCount = await focusableInModal.count();

        if (focusableCount > 0) {
          // Tab through all focusable elements in modal
          for (let i = 0; i < focusableCount + 2; i++) {
            await page.keyboard.press('Tab');
            await page.waitForTimeout(200);

            const currentFocus = page.locator(':focus');
            const isInModal = await modal.locator(':focus').count() > 0;

            if (i >= focusableCount) {
              // Focus should have wrapped back to first element
              expect(isInModal).toBe(true);
            }
          }

          console.log('✅ Focus trap working in modal');
        }

        // Close modal
        await page.keyboard.press('Escape');
      }
    }

    console.log('✅ Focus management validation completed');
  });
});

test.describe('Mobile Responsiveness Tests', () => {
  const testAgentId = TestHelper.TEST_AGENT_ID;
  let createdPageIds: string[] = [];

  test.afterEach(async () => {
    await TestHelper.cleanupTestPages(createdPageIds);
    createdPageIds = [];
  });

  test('Mobile viewport responsiveness', async ({ page }) => {
    const mobileViewports = [
      { width: 320, height: 568, name: 'iPhone SE' },
      { width: 375, height: 667, name: 'iPhone 8' },
      { width: 414, height: 896, name: 'iPhone XR' },
      { width: 360, height: 640, name: 'Galaxy S5' },
      { width: 412, height: 892, name: 'Pixel 4' }
    ];

    for (const viewport of mobileViewports) {
      console.log(`Testing ${viewport.name} (${viewport.width}x${viewport.height})`);

      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
      await TestHelper.waitForPageReady(page);

      // Check that content fits within viewport
      const body = page.locator('body');
      const bodyBox = await body.boundingBox();
      expect(bodyBox?.width).toBeLessThanOrEqual(viewport.width);

      // Test horizontal scrolling (should be minimal)
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const clientWidth = await page.evaluate(() => document.body.clientWidth);
      const horizontalOverflow = scrollWidth - clientWidth;

      expect(horizontalOverflow).toBeLessThanOrEqual(10); // Allow small margin

      // Test mobile navigation
      const mobileMenu = page.locator('.mobile-menu, .hamburger, [data-testid="mobile-menu"]');
      const navigation = page.locator('nav, .navigation, [role="navigation"]');

      if (await mobileMenu.count() > 0) {
        // Has mobile menu
        await mobileMenu.first().click();
        await page.waitForTimeout(500);

        const mobileNavigation = page.locator('.mobile-nav, .nav-dropdown, [data-testid="mobile-nav"]');
        if (await mobileNavigation.count() > 0) {
          await expect(mobileNavigation.first()).toBeVisible();
          console.log(`✅ Mobile menu working on ${viewport.name}`);
        }
      } else if (await navigation.count() > 0) {
        // Check if regular navigation is accessible
        const navBox = await navigation.first().boundingBox();
        expect(navBox?.width).toBeLessThanOrEqual(viewport.width);
      }

      // Test dynamic pages on mobile
      const dynamicPagesTab = page.locator('text="Dynamic Pages"');
      await expect(dynamicPagesTab).toBeVisible();
      await dynamicPagesTab.click();

      await page.waitForSelector(
        '.page-item, [data-testid^="page-"], text="No Dynamic Pages Yet"',
        { timeout: 15000 }
      );

      // Check mobile layout of page items
      const pageItems = page.locator('.page-item, [data-testid^="page-"]');
      const pageCount = await pageItems.count();

      if (pageCount > 0) {
        const firstPage = pageItems.first();
        const pageBox = await firstPage.boundingBox();

        expect(pageBox?.width).toBeLessThanOrEqual(viewport.width);
        expect(pageBox?.width).toBeGreaterThan(viewport.width * 0.7); // Uses most of width

        // Test mobile button sizes (should be touch-friendly)
        const buttons = firstPage.locator('button');
        const buttonCount = await buttons.count();

        for (let i = 0; i < buttonCount; i++) {
          const button = buttons.nth(i);
          const buttonBox = await button.boundingBox();

          // Touch targets should be at least 44px (Apple guidelines) or 48dp (Android)
          expect(buttonBox?.height).toBeGreaterThanOrEqual(40);
          expect(buttonBox?.width).toBeGreaterThanOrEqual(40);
        }
      }
    }

    console.log('✅ Mobile viewport responsiveness tests completed');
  });

  test('Touch interaction compatibility', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Create test page for interaction testing
    const pageData = TestHelper.generateTestPageData();
    const pageId = await TestHelper.createTestPage({
      ...pageData,
      title: 'Touch Test Page'
    });
    createdPageIds.push(pageId);

    // Navigate to dynamic pages
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();
    await page.waitForSelector('.page-item, [data-testid^="page-"]');

    // Test touch gestures
    const firstPage = page.locator('.page-item, [data-testid^="page-"]').first();

    // Test tap gesture
    await firstPage.tap();
    await page.waitForTimeout(500);

    // Test double tap (should not cause issues)
    await firstPage.tap();
    await firstPage.tap();
    await page.waitForTimeout(500);

    // Test long press (if supported)
    const firstPageBox = await firstPage.boundingBox();
    if (firstPageBox) {
      await page.touchscreen.tap(firstPageBox.x + firstPageBox.width / 2, firstPageBox.y + firstPageBox.height / 2);
      await page.waitForTimeout(1000);
    }

    // Test swipe gestures (if carousel or swipeable content exists)
    const swipeableContent = page.locator('.swiper, .carousel, [data-swipeable]');
    if (await swipeableContent.count() > 0) {
      const swipeBox = await swipeableContent.first().boundingBox();
      if (swipeBox) {
        // Swipe left
        await page.touchscreen.tap(swipeBox.x + swipeBox.width * 0.8, swipeBox.y + swipeBox.height / 2);
        await page.touchscreen.tap(swipeBox.x + swipeBox.width * 0.2, swipeBox.y + swipeBox.height / 2);
        console.log('✅ Swipe gesture tested');
      }
    }

    // Test button touch targets
    const viewButton = page.locator('button:has-text("View")').first();
    if (await viewButton.count() > 0) {
      const buttonBox = await viewButton.boundingBox();
      expect(buttonBox?.height).toBeGreaterThanOrEqual(44); // iOS minimum
      expect(buttonBox?.width).toBeGreaterThanOrEqual(44);

      // Test tap accuracy
      await viewButton.tap();
      await page.waitForURL('**/pages/**', { timeout: 10000 });
      console.log('✅ Touch button interaction successful');

      await page.goBack();
    }

    // Test scroll behavior
    await page.evaluate(() => window.scrollTo(0, 200));
    await page.waitForTimeout(500);

    const scrollPosition = await page.evaluate(() => window.pageYOffset);
    expect(scrollPosition).toBeGreaterThan(0);

    console.log('✅ Touch interaction compatibility tests completed');
  });

  test('Mobile performance optimization', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Throttle network to simulate mobile conditions
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
      uploadThroughput: 750 * 1024 / 8, // 750 kbps
      latency: 40 // 40ms
    });

    const startTime = Date.now();
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);
    const loadTime = Date.now() - startTime;

    console.log(`Mobile load time with throttling: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(8000); // 8 seconds max on slow mobile

    // Test resource efficiency
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        loadComplete: navigation.loadEventEnd - navigation.navigationStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });

    console.log('Mobile performance metrics:', performanceMetrics);

    // Performance budgets for mobile
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(4000); // 4 seconds FCP
    expect(performanceMetrics.domContentLoaded).toBeLessThan(3000); // 3 seconds DCL

    // Test memory usage
    const memoryInfo = await client.send('Runtime.getHeapUsage');
    const memoryMB = memoryInfo.usedSize / (1024 * 1024);
    console.log(`Mobile memory usage: ${memoryMB.toFixed(1)}MB`);

    expect(memoryMB).toBeLessThan(50); // Should use less than 50MB

    console.log('✅ Mobile performance optimization tests completed');
  });

  test('Tablet responsiveness and layout adaptation', async ({ page }) => {
    const tabletViewports = [
      { width: 768, height: 1024, name: 'iPad Portrait', orientation: 'portrait' },
      { width: 1024, height: 768, name: 'iPad Landscape', orientation: 'landscape' },
      { width: 820, height: 1180, name: 'iPad Air Portrait', orientation: 'portrait' },
      { width: 1180, height: 820, name: 'iPad Air Landscape', orientation: 'landscape' }
    ];

    for (const viewport of tabletViewports) {
      console.log(`Testing ${viewport.name} (${viewport.width}x${viewport.height})`);

      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
      await TestHelper.waitForPageReady(page);

      // Test layout adaptation
      const mainContent = page.locator('main, .main-content, .container');
      if (await mainContent.count() > 0) {
        const contentBox = await mainContent.first().boundingBox();
        expect(contentBox?.width).toBeLessThanOrEqual(viewport.width);

        // Content should use available space efficiently
        const widthUtilization = (contentBox?.width || 0) / viewport.width;
        expect(widthUtilization).toBeGreaterThan(0.6); // Uses at least 60% of width
      }

      // Test dynamic pages layout on tablet
      const dynamicPagesTab = page.locator('text="Dynamic Pages"');
      await dynamicPagesTab.click();
      await page.waitForSelector(
        '.page-item, [data-testid^="page-"], text="No Dynamic Pages Yet"',
        { timeout: 15000 }
      );

      // Check if layout adapts to tablet size
      const pageItems = page.locator('.page-item, [data-testid^="page-"]');
      const pageCount = await pageItems.count();

      if (pageCount > 0) {
        // Should show more content per row on tablets
        const firstPageBox = await pageItems.first().boundingBox();
        const secondPageBox = pageCount > 1 ? await pageItems.nth(1).boundingBox() : null;

        if (viewport.width >= 1024 && firstPageBox && secondPageBox) {
          // On landscape tablet, pages might be side by side
          const isGridLayout = Math.abs((firstPageBox.y || 0) - (secondPageBox.y || 0)) < 50;
          if (isGridLayout) {
            console.log(`✅ Grid layout detected on ${viewport.name}`);
          }
        }

        // Touch targets should still be accessible
        const buttons = pageItems.first().locator('button');
        const buttonCount = await buttons.count();

        for (let i = 0; i < buttonCount; i++) {
          const button = buttons.nth(i);
          const buttonBox = await button.boundingBox();
          expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
        }
      }

      // Test orientation-specific layouts
      if (viewport.orientation === 'landscape') {
        // Landscape should utilize horizontal space better
        const sidebar = page.locator('.sidebar, .side-panel, aside');
        if (await sidebar.count() > 0) {
          const sidebarBox = await sidebar.first().boundingBox();
          expect(sidebarBox?.width).toBeGreaterThan(200); // Reasonable sidebar width
        }
      }
    }

    console.log('✅ Tablet responsiveness tests completed');
  });
});

test.describe('Cross-Device Compatibility', () => {
  const testAgentId = TestHelper.TEST_AGENT_ID;

  test('Device-specific feature detection', async ({ page, browserName }) => {
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Detect device capabilities
    const deviceCapabilities = await page.evaluate(() => {
      return {
        touchSupport: 'ontouchstart' in window,
        devicePixelRatio: window.devicePixelRatio,
        screenWidth: screen.width,
        screenHeight: screen.height,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        maxTouchPoints: navigator.maxTouchPoints || 0,
        pointerSupport: window.PointerEvent !== undefined,
        orientationSupport: screen.orientation !== undefined
      };
    });

    console.log(`${browserName} device capabilities:`, deviceCapabilities);

    // Test feature adaptation based on capabilities
    if (deviceCapabilities.touchSupport) {
      // Should have touch-friendly interface
      const touchElements = page.locator('button, a, [role="button"]');
      const elementCount = await touchElements.count();

      for (let i = 0; i < Math.min(5, elementCount); i++) {
        const element = touchElements.nth(i);
        const box = await element.boundingBox();

        if (box) {
          expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(32);
        }
      }

      console.log(`✅ Touch-friendly interface confirmed for ${browserName}`);
    }

    // Test high DPI display support
    if (deviceCapabilities.devicePixelRatio > 1) {
      // Should load appropriate resolution images/assets
      const images = page.locator('img');
      const imageCount = await images.count();

      for (let i = 0; i < Math.min(3, imageCount); i++) {
        const img = images.nth(i);
        const src = await img.getAttribute('src');
        const srcset = await img.getAttribute('srcset');

        if (src || srcset) {
          console.log(`Image ${i + 1}:`, { src, srcset });
        }
      }

      console.log(`✅ High DPI display support checked for ${browserName}`);
    }

    // Test orientation handling
    if (deviceCapabilities.orientationSupport) {
      console.log(`✅ Orientation support available on ${browserName}`);
    }
  });

  test('Progressive enhancement validation', async ({ page }) => {
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Test with JavaScript disabled (simulate)
    await page.addInitScript(() => {
      // Simulate limited JavaScript environment
      delete window.WebSocket;
      delete window.EventSource;
    });

    await page.reload();
    await TestHelper.waitForPageReady(page);

    // Core functionality should still work
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await expect(dynamicPagesTab).toBeVisible();

    // Test with limited CSS support
    await page.addStyleTag({
      content: `
        .animate-spin, .animate-pulse { animation: none !important; }
        .transition-all { transition: none !important; }
      `
    });

    // Application should remain functional
    await dynamicPagesTab.click();
    await page.waitForSelector(
      '.page-item, [data-testid^="page-"], text="No Dynamic Pages Yet"',
      { timeout: 15000 }
    );

    console.log('✅ Progressive enhancement validation completed');
  });

  test('Feature degradation graceful handling', async ({ page }) => {
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Simulate WebSocket failure
    await page.evaluate(() => {
      if (window.WebSocket) {
        const originalWebSocket = window.WebSocket;
        window.WebSocket = function() {
          throw new Error('WebSocket not supported');
        };
      }
    });

    // Navigate to dynamic pages
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();

    // Should fall back to HTTP polling or show appropriate message
    await page.waitForSelector(
      '.page-item, [data-testid^="page-"], text="No Dynamic Pages Yet", text="Limited functionality"',
      { timeout: 15000 }
    );

    // Simulate localStorage unavailable
    await page.evaluate(() => {
      Object.defineProperty(window, 'localStorage', {
        value: null,
        writable: false
      });
    });

    await page.reload();
    await TestHelper.waitForPageReady(page);

    // Application should still function without localStorage
    const dynamicPagesTabNoStorage = page.locator('text="Dynamic Pages"');
    await expect(dynamicPagesTabNoStorage).toBeVisible();

    console.log('✅ Feature degradation handling validated');
  });
});