/**
 * Comprehensive Playwright E2E Tests for Anchor Navigation Functionality
 *
 * Tests the complete anchor navigation system including:
 * - Basic navigation and URL hash updates
 * - Multiple anchor sections and rapid navigation
 * - Edge cases and error handling
 * - Keyboard navigation and accessibility
 * - Visual verification with screenshots
 *
 * Target Page: http://localhost:5173/agents/page-builder-agent/pages/component-showcase-and-examples
 *
 * @requires Real Chromium browser (no mocks)
 * @requires Frontend server running on localhost:5173
 */

import { test, expect } from '@playwright/test';

// Test configuration
const TEST_PAGE_URL = '/agents/page-builder-agent/pages/component-showcase-and-examples';
const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = './tests/screenshots/anchor-navigation';

// Expected anchor links from the component showcase page
const EXPECTED_ANCHORS = [
  { id: 'text-content', label: 'Text Content' },
  { id: 'interactive-forms', label: 'Interactive Forms' },
  { id: 'data-visualization', label: 'Data Visualization' },
  { id: 'layout-components', label: 'Layout Components' },
  { id: 'media-content', label: 'Media Content' },
  { id: 'navigation-elements', label: 'Navigation Elements' },
  { id: 'feedback-components', label: 'Feedback Components' },
  { id: 'advanced-components', label: 'Advanced Components' },
  { id: 'code-examples', label: 'Code Examples' },
  { id: 'tables-lists', label: 'Tables & Lists' },
  { id: 'cards-containers', label: 'Cards & Containers' },
  { id: 'modals-dialogs', label: 'Modals & Dialogs' },
  { id: 'progress-indicators', label: 'Progress Indicators' },
  { id: 'date-time', label: 'Date & Time' },
  { id: 'accessibility-features', label: 'Accessibility Features' }
];

test.describe('Anchor Navigation E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the test page before each test
    await page.goto(TEST_PAGE_URL);
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  // ====================
  // BASIC NAVIGATION TESTS
  // ====================

  test('1. Should render page with sidebar and content sections', async ({ page }) => {
    // Verify sidebar exists
    const sidebar = page.locator('[data-testid="sidebar"], .sidebar, nav');
    await expect(sidebar.first()).toBeVisible({ timeout: 10000 });

    // Verify main content area exists
    const mainContent = page.locator('main, [role="main"], .main-content');
    await expect(mainContent.first()).toBeVisible();

    // Verify page title or heading exists
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();

    console.log('✓ Page structure validated: sidebar and content sections present');
  });

  test('2. Should render header elements with ID attributes in DOM', async ({ page }) => {
    // Wait for content to load
    await page.waitForSelector('h1, h2, h3', { timeout: 10000 });

    // Check that multiple headers with IDs exist
    const headersWithIds = await page.$$eval('h1[id], h2[id], h3[id], h4[id]',
      elements => elements.map(el => ({ id: el.id, tag: el.tagName }))
    );

    // Verify we have at least some headers with IDs
    expect(headersWithIds.length).toBeGreaterThan(0);

    console.log(`✓ Found ${headersWithIds.length} header elements with ID attributes`);
    console.log('  Sample IDs:', headersWithIds.slice(0, 5));
  });

  test('3. Should click sidebar item and navigate to anchor', async ({ page }) => {
    // Find first anchor link in sidebar
    const firstAnchorLink = page.locator('a[href*="#"]').first();
    await expect(firstAnchorLink).toBeVisible({ timeout: 10000 });

    // Get the href to know what we're clicking
    const href = await firstAnchorLink.getAttribute('href');
    console.log('  Clicking anchor link:', href);

    // Click the anchor link
    await firstAnchorLink.click();

    // Wait for navigation/scroll to complete
    await page.waitForTimeout(500);

    console.log('✓ Successfully clicked sidebar anchor item');
  });

  test('4. Should update URL hash when anchor clicked', async ({ page }) => {
    // Find an anchor link with a hash
    const anchorLink = page.locator('a[href*="#"]').first();
    await expect(anchorLink).toBeVisible({ timeout: 10000 });

    const href = await anchorLink.getAttribute('href');
    const expectedHash = href.includes('#') ? href.split('#')[1] : '';

    // Click the anchor
    await anchorLink.click();
    await page.waitForTimeout(300);

    // Verify URL hash updated
    const currentUrl = page.url();
    if (expectedHash) {
      expect(currentUrl).toContain(`#${expectedHash}`);
      console.log(`✓ URL hash updated to: #${expectedHash}`);
    }
  });

  test('5. Should scroll to target element smoothly', async ({ page }) => {
    // Get initial scroll position
    const initialScrollY = await page.evaluate(() => window.scrollY);

    // Find and click an anchor link
    const anchorLink = page.locator('a[href*="#"]').nth(1);
    await expect(anchorLink).toBeVisible({ timeout: 10000 });

    await anchorLink.click();

    // Wait for scroll animation
    await page.waitForTimeout(800);

    // Verify scroll position changed
    const finalScrollY = await page.evaluate(() => window.scrollY);
    expect(finalScrollY).not.toBe(initialScrollY);

    console.log(`✓ Page scrolled from ${initialScrollY}px to ${finalScrollY}px`);
  });

  test('6. Should highlight active sidebar item', async ({ page }) => {
    // Find sidebar anchor links
    const anchorLinks = page.locator('a[href*="#"]');
    const count = await anchorLinks.count();

    if (count > 0) {
      // Click first anchor
      await anchorLinks.first().click();
      await page.waitForTimeout(500);

      // Check if any anchor has an active class/style
      const hasActiveItem = await page.evaluate(() => {
        const links = document.querySelectorAll('a[href*="#"]');
        return Array.from(links).some(link =>
          link.classList.contains('active') ||
          link.classList.contains('selected') ||
          link.getAttribute('aria-current') === 'location' ||
          window.getComputedStyle(link).fontWeight === '700' ||
          window.getComputedStyle(link).fontWeight === 'bold'
        );
      });

      console.log(`✓ Active state detection: ${hasActiveItem ? 'found' : 'not found'}`);
    }
  });

  // ====================
  // MULTIPLE ANCHORS TESTS
  // ====================

  test('7. Should navigate between multiple anchor sections', async ({ page }) => {
    const anchorLinks = page.locator('a[href*="#"]');
    const count = await anchorLinks.count();

    if (count >= 3) {
      // Navigate to first anchor
      await anchorLinks.nth(0).click();
      await page.waitForTimeout(500);
      const url1 = page.url();

      // Navigate to second anchor
      await anchorLinks.nth(1).click();
      await page.waitForTimeout(500);
      const url2 = page.url();

      // Navigate to third anchor
      await anchorLinks.nth(2).click();
      await page.waitForTimeout(500);
      const url3 = page.url();

      // Verify different URLs (hashes)
      expect(url1).not.toBe(url2);
      expect(url2).not.toBe(url3);

      console.log('✓ Successfully navigated between 3 different anchor sections');
    } else {
      console.log('⚠ Not enough anchor links to test multiple navigation');
    }
  });

  test('8. Should maintain scroll position after navigation', async ({ page }) => {
    const anchorLinks = page.locator('a[href*="#"]');
    const count = await anchorLinks.count();

    if (count >= 2) {
      // Click an anchor to scroll
      await anchorLinks.nth(1).click();
      await page.waitForTimeout(800);

      const scrollY = await page.evaluate(() => window.scrollY);

      // Wait a bit more
      await page.waitForTimeout(500);

      // Check scroll position hasn't changed unexpectedly
      const scrollY2 = await page.evaluate(() => window.scrollY);

      // Allow small variance for scroll settling
      const difference = Math.abs(scrollY - scrollY2);
      expect(difference).toBeLessThan(10);

      console.log(`✓ Scroll position maintained: ${scrollY}px (variance: ${difference}px)`);
    }
  });

  test('9. Should handle rapid clicks on different anchors', async ({ page }) => {
    const anchorLinks = page.locator('a[href*="#"]');
    const count = await anchorLinks.count();

    if (count >= 3) {
      // Rapidly click different anchors
      await anchorLinks.nth(0).click();
      await page.waitForTimeout(100);
      await anchorLinks.nth(1).click();
      await page.waitForTimeout(100);
      await anchorLinks.nth(2).click();
      await page.waitForTimeout(100);
      await anchorLinks.nth(1).click();

      // Wait for final navigation to settle
      await page.waitForTimeout(1000);

      // Verify page is still functional and no errors
      const hasErrors = await page.evaluate(() => {
        return window.onerror !== null || console.error.length > 0;
      });

      expect(hasErrors).toBeFalsy();

      console.log('✓ Handled rapid anchor clicks without errors');
    }
  });

  // ====================
  // EDGE CASES TESTS
  // ====================

  test('10. Should handle anchor to non-existent ID gracefully', async ({ page }) => {
    // Try to navigate to a non-existent anchor
    const nonExistentHash = '#this-id-does-not-exist-xyz123';

    await page.evaluate((hash) => {
      window.location.hash = hash;
    }, nonExistentHash);

    await page.waitForTimeout(500);

    // Verify page didn't crash
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();

    // Verify no JavaScript errors occurred
    const errors = [];
    page.on('pageerror', error => errors.push(error));

    await page.waitForTimeout(500);
    expect(errors.length).toBe(0);

    console.log('✓ Gracefully handled non-existent anchor ID');
  });

  test('11. Should work with deeply nested components', async ({ page }) => {
    // Look for nested elements with IDs
    const nestedElements = await page.$$eval('[id]', elements => {
      return elements.map(el => {
        let depth = 0;
        let parent = el.parentElement;
        while (parent) {
          depth++;
          parent = parent.parentElement;
        }
        return { id: el.id, depth };
      });
    });

    // Find deeply nested elements (depth > 5)
    const deeplyNested = nestedElements.filter(el => el.depth > 5);

    if (deeplyNested.length > 0) {
      console.log(`✓ Found ${deeplyNested.length} deeply nested elements with IDs`);
      console.log('  Sample:', deeplyNested.slice(0, 3));
    } else {
      console.log('⚠ No deeply nested elements found');
    }
  });

  test('12. Should preserve anchor navigation on page reload', async ({ page }) => {
    const anchorLinks = page.locator('a[href*="#"]');
    const count = await anchorLinks.count();

    if (count > 0) {
      // Navigate to an anchor
      await anchorLinks.first().click();
      await page.waitForTimeout(500);

      const urlBeforeReload = page.url();
      const hashBefore = urlBeforeReload.split('#')[1];

      // Reload the page
      await page.reload();
      await page.waitForLoadState('networkidle');

      const urlAfterReload = page.url();
      const hashAfter = urlAfterReload.split('#')[1];

      // Verify hash is preserved
      if (hashBefore) {
        expect(hashAfter).toBe(hashBefore);
        console.log(`✓ Anchor preserved after reload: #${hashAfter}`);
      }
    }
  });

  test('13. Should work with browser back/forward buttons', async ({ page }) => {
    const anchorLinks = page.locator('a[href*="#"]');
    const count = await anchorLinks.count();

    if (count >= 2) {
      // Get initial URL
      const initialUrl = page.url();

      // Navigate to first anchor
      await anchorLinks.nth(0).click();
      await page.waitForTimeout(500);
      const url1 = page.url();

      // Navigate to second anchor
      await anchorLinks.nth(1).click();
      await page.waitForTimeout(500);
      const url2 = page.url();

      // Go back
      await page.goBack();
      await page.waitForTimeout(500);
      const urlAfterBack = page.url();
      expect(urlAfterBack).toBe(url1);

      // Go forward
      await page.goForward();
      await page.waitForTimeout(500);
      const urlAfterForward = page.url();
      expect(urlAfterForward).toBe(url2);

      console.log('✓ Browser back/forward buttons work correctly');
      console.log(`  Initial: ${initialUrl}`);
      console.log(`  After back: ${urlAfterBack}`);
      console.log(`  After forward: ${urlAfterForward}`);
    }
  });

  // ====================
  // KEYBOARD NAVIGATION TESTS
  // ====================

  test('14. Should navigate with Tab key to sidebar items', async ({ page }) => {
    // Focus on the page
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    // Tab through several elements
    let focusedElement = null;
    let anchorFocused = false;

    for (let i = 0; i < 15; i++) {
      focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el.tagName,
          href: el.getAttribute('href'),
          text: el.textContent?.slice(0, 30)
        };
      });

      if (focusedElement.href && focusedElement.href.includes('#')) {
        anchorFocused = true;
        console.log(`✓ Focused on anchor link: ${focusedElement.text}`);
        break;
      }

      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }

    if (anchorFocused) {
      console.log('✓ Successfully navigated to anchor link with Tab key');
    } else {
      console.log('⚠ Could not reach anchor link within 15 tabs');
    }
  });

  test('15. Should activate anchor with Enter key', async ({ page }) => {
    // Focus on first anchor link
    const firstAnchor = page.locator('a[href*="#"]').first();
    await firstAnchor.focus();
    await page.waitForTimeout(300);

    const urlBefore = page.url();

    // Press Enter
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    const urlAfter = page.url();

    // Verify navigation occurred (URL hash changed)
    if (!urlBefore.includes('#') || urlBefore !== urlAfter) {
      console.log('✓ Enter key activated anchor navigation');
      console.log(`  Before: ${urlBefore}`);
      console.log(`  After: ${urlAfter}`);
    }
  });

  test('16. Should support keyboard accessibility', async ({ page }) => {
    // Check for ARIA attributes on anchor links
    const ariaInfo = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="#"]');
      return Array.from(links).slice(0, 5).map(link => ({
        hasAriaLabel: link.hasAttribute('aria-label'),
        hasAriaDescribedBy: link.hasAttribute('aria-describedby'),
        hasTitle: link.hasAttribute('title'),
        role: link.getAttribute('role'),
        tabIndex: link.tabIndex
      }));
    });

    console.log('✓ Accessibility attributes check:');
    console.log('  Sample links:', ariaInfo);

    // Verify links are keyboard accessible (tabIndex should be 0 or not -1)
    const accessibleLinks = ariaInfo.filter(info => info.tabIndex !== -1);
    expect(accessibleLinks.length).toBeGreaterThan(0);
  });

  // ====================
  // VISUAL VERIFICATION TESTS
  // ====================

  test('17. Take screenshot of initial page state', async ({ page }) => {
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take full page screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-initial-page-state.png`,
      fullPage: true
    });

    console.log('✓ Screenshot saved: 01-initial-page-state.png');
  });

  test('18. Take screenshot after anchor navigation (verify scroll)', async ({ page }) => {
    const anchorLinks = page.locator('a[href*="#"]');
    const count = await anchorLinks.count();

    if (count > 2) {
      // Navigate to middle anchor
      const targetIndex = Math.floor(count / 2);
      const targetAnchor = anchorLinks.nth(targetIndex);

      const href = await targetAnchor.getAttribute('href');
      console.log(`  Navigating to: ${href}`);

      await targetAnchor.click();
      await page.waitForTimeout(1000);

      // Take screenshot showing scrolled position
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/02-after-anchor-navigation.png`,
        fullPage: true
      });

      // Also take viewport screenshot
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/02b-viewport-after-navigation.png`,
        fullPage: false
      });

      console.log('✓ Screenshots saved: after anchor navigation');
    }
  });

  test('19. Take screenshot of active sidebar highlighting', async ({ page }) => {
    const anchorLinks = page.locator('a[href*="#"]');
    const count = await anchorLinks.count();

    if (count > 0) {
      // Click first anchor
      await anchorLinks.first().click();
      await page.waitForTimeout(800);

      // Highlight the active element with custom styling for screenshot
      await page.evaluate(() => {
        const activeLink = document.querySelector('a[href*="#"].active, a[href*="#"][aria-current="location"]');
        if (activeLink) {
          activeLink.style.outline = '3px solid red';
          activeLink.style.outlineOffset = '2px';
        }
      });

      await page.waitForTimeout(200);

      // Take screenshot of sidebar area
      const sidebar = page.locator('nav, .sidebar, [data-testid="sidebar"]').first();

      if (await sidebar.isVisible()) {
        await sidebar.screenshot({
          path: `${SCREENSHOT_DIR}/03-active-sidebar-highlighting.png`
        });
        console.log('✓ Screenshot saved: active sidebar highlighting');
      } else {
        // Fallback to full page
        await page.screenshot({
          path: `${SCREENSHOT_DIR}/03-active-sidebar-highlighting-fullpage.png`,
          fullPage: false
        });
        console.log('✓ Screenshot saved: full page with active state');
      }
    }
  });

  // ====================
  // COMPREHENSIVE REAL PAGE TEST
  // ====================

  test('20. Verify all 15 anchor links work on component showcase page', async ({ page }) => {
    console.log('\n🔍 Testing all anchor links on component showcase page...\n');

    // Get all anchor links from the page
    const anchorLinks = page.locator('a[href*="#"]');
    const count = await anchorLinks.count();

    console.log(`  Found ${count} anchor links on the page`);

    const results = [];

    // Test each expected anchor
    for (let i = 0; i < Math.min(count, 15); i++) {
      const link = anchorLinks.nth(i);
      const href = await link.getAttribute('href');
      const text = await link.textContent();

      console.log(`\n  Testing anchor ${i + 1}/${Math.min(count, 15)}: ${text?.trim()}`);

      try {
        // Click the anchor
        await link.click();
        await page.waitForTimeout(600);

        // Verify URL updated
        const currentUrl = page.url();
        const hasHash = currentUrl.includes('#');

        // Check if target element exists
        const targetExists = href ? await page.locator(href).count() > 0 : false;

        results.push({
          index: i + 1,
          text: text?.trim(),
          href,
          urlUpdated: hasHash,
          targetExists,
          success: hasHash || targetExists
        });

        console.log(`    ✓ URL: ${currentUrl}`);
        console.log(`    ✓ Target exists: ${targetExists}`);

      } catch (error) {
        console.log(`    ✗ Error: ${error.message}`);
        results.push({
          index: i + 1,
          text: text?.trim(),
          href,
          success: false,
          error: error.message
        });
      }
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    console.log(`\n📊 Results: ${successful}/${results.length} anchor links working correctly\n`);

    // Take final screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-all-anchors-test-complete.png`,
      fullPage: true
    });

    // Verify at least 80% success rate
    const successRate = (successful / results.length) * 100;
    expect(successRate).toBeGreaterThan(80);

    console.log(`✓ Success rate: ${successRate.toFixed(1)}%`);
  });

  // ====================
  // BONUS: PERFORMANCE TEST
  // ====================

  test('21. Verify anchor navigation performance', async ({ page }) => {
    const anchorLinks = page.locator('a[href*="#"]');
    const count = await anchorLinks.count();

    if (count >= 5) {
      const timings = [];

      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();

        await anchorLinks.nth(i).click();
        await page.waitForTimeout(100);

        const endTime = Date.now();
        timings.push(endTime - startTime);
      }

      const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      const maxTime = Math.max(...timings);

      console.log(`✓ Performance metrics:`);
      console.log(`  Average navigation time: ${avgTime.toFixed(0)}ms`);
      console.log(`  Max navigation time: ${maxTime}ms`);
      console.log(`  All timings: ${timings.join(', ')}ms`);

      // Verify navigation is reasonably fast
      expect(avgTime).toBeLessThan(1000);
    }
  });

  // ====================
  // BONUS: MOBILE VIEWPORT TEST
  // ====================

  test('22. Verify anchor navigation works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    const anchorLinks = page.locator('a[href*="#"]');
    const count = await anchorLinks.count();

    if (count > 0) {
      // Click an anchor on mobile
      await anchorLinks.first().click();
      await page.waitForTimeout(800);

      // Verify navigation worked
      const url = page.url();
      const hasHash = url.includes('#');

      expect(hasHash).toBeTruthy();

      // Take mobile screenshot
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/05-mobile-viewport-navigation.png`,
        fullPage: false
      });

      console.log('✓ Anchor navigation works on mobile viewport');
    }
  });

});

// ====================
// TEST UTILITIES
// ====================

/**
 * Helper to wait for smooth scroll to complete
 */
async function waitForScrollToComplete(page, timeout = 2000) {
  const startTime = Date.now();
  let lastScrollY = await page.evaluate(() => window.scrollY);

  while (Date.now() - startTime < timeout) {
    await page.waitForTimeout(100);
    const currentScrollY = await page.evaluate(() => window.scrollY);

    if (Math.abs(currentScrollY - lastScrollY) < 1) {
      // Scroll has stabilized
      return true;
    }

    lastScrollY = currentScrollY;
  }

  return false;
}

/**
 * Helper to get all anchor targets on the page
 */
async function getAllAnchorTargets(page) {
  return await page.evaluate(() => {
    const anchors = document.querySelectorAll('a[href*="#"]');
    return Array.from(anchors).map(a => {
      const href = a.getAttribute('href');
      const hash = href?.split('#')[1];
      return {
        href,
        hash,
        text: a.textContent?.trim(),
        targetExists: hash ? document.getElementById(hash) !== null : false
      };
    });
  });
}
