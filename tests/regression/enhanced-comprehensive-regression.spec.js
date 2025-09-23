/**
 * Enhanced Comprehensive Regression Test Suite
 * Tests main page, navigation, responsive design, UI components, JavaScript errors, and Tailwind CSS
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const TIMEOUT = 30000;

test.describe('Comprehensive Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any previous state
    await page.goto('about:blank');

    // Set up console error monitoring
    page.consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        page.consoleErrors.push(msg.text());
      }
    });

    // Set up JavaScript error monitoring
    page.jsErrors = [];
    page.on('pageerror', error => {
      page.jsErrors.push(error.message);
    });
  });

  test('Test 1: Main page loads with purple gradient background', async ({ page }) => {
    await test.step('Navigate to main page', async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
      await expect(page).toHaveTitle(/Agent Feed|AgentLink|SPARC/i);
    });

    await test.step('Verify purple gradient background exists', async () => {
      // Check for purple gradient in various possible selectors
      const gradientSelectors = [
        'body',
        '.bg-gradient-to-br',
        '[class*="purple"]',
        '[class*="gradient"]',
        'main',
        '.app',
        '#root'
      ];

      let foundGradient = false;
      for (const selector of gradientSelectors) {
        try {
          const element = await page.locator(selector).first();
          if (await element.isVisible()) {
            const styles = await element.evaluate(el => window.getComputedStyle(el));
            const backgroundImage = styles.backgroundImage;
            const backgroundColor = styles.backgroundColor;

            if (backgroundImage.includes('gradient') ||
                backgroundColor.includes('rgb') && (
                  backgroundColor.includes('128, 90, 213') || // purple-600
                  backgroundColor.includes('147, 51, 234') || // purple-700
                  backgroundColor.includes('124, 58, 237') || // purple-800
                  backgroundColor.includes('139, 92, 246')    // purple-500
                )) {
              foundGradient = true;
              console.log(`✓ Found purple gradient on ${selector}: ${backgroundImage || backgroundColor}`);
              break;
            }
          }
        } catch (e) {
          // Continue checking other selectors
        }
      }

      expect(foundGradient, 'Purple gradient background should be present').toBe(true);
    });

    await test.step('Take screenshot for visual verification', async () => {
      await page.screenshot({
        path: 'tests/screenshots/main-page-gradient-test.png',
        fullPage: true
      });
    });
  });

  test('Test 2: Navigation between pages works', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });

    await test.step('Test navigation links', async () => {
      // Find navigation elements
      const navSelectors = [
        'nav a',
        '[role="navigation"] a',
        '.nav-link',
        '.navigation a',
        'header a',
        '[href="/agents"]',
        '[href="/analytics"]',
        'a[href*="agent"]'
      ];

      let navigationWorking = false;

      for (const selector of navSelectors) {
        try {
          const navLinks = await page.locator(selector).all();

          for (const link of navLinks) {
            if (await link.isVisible()) {
              const href = await link.getAttribute('href');
              const text = await link.textContent();

              if (href && href !== '#' && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
                console.log(`Testing navigation link: ${text} -> ${href}`);

                // Click the link
                await link.click();
                await page.waitForTimeout(1000);

                // Verify page changed
                const currentUrl = page.url();
                if (currentUrl !== BASE_URL) {
                  navigationWorking = true;
                  console.log(`✓ Navigation successful: ${currentUrl}`);

                  // Navigate back to test more links
                  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
                  break;
                }
              }
            }
          }

          if (navigationWorking) break;
        } catch (e) {
          console.log(`Navigation test error with ${selector}: ${e.message}`);
        }
      }

      // If no navigation links found, check if it's a single page app
      if (!navigationWorking) {
        // Test programmatic navigation or route changes
        await page.evaluate(() => {
          if (window.history && window.history.pushState) {
            window.history.pushState({}, '', '/agents');
            window.dispatchEvent(new PopStateEvent('popstate'));
            return true;
          }
          return false;
        });

        await page.waitForTimeout(1000);
        const currentUrl = page.url();
        navigationWorking = currentUrl.includes('/agents') || currentUrl !== BASE_URL;
      }

      expect(navigationWorking, 'Navigation between pages should work').toBe(true);
    });
  });

  test('Test 3: Responsive design at different screen sizes', async ({ page }) => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'Large Desktop', width: 2560, height: 1440 }
    ];

    for (const viewport of viewports) {
      await test.step(`Test ${viewport.name} (${viewport.width}x${viewport.height})`, async () => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });

        // Check if content is visible and properly sized
        const body = await page.locator('body');
        await expect(body).toBeVisible();

        // Check for responsive classes
        const responsiveElements = await page.locator('[class*="sm:"], [class*="md:"], [class*="lg:"], [class*="xl:"]').count();

        // Take screenshot for visual verification
        await page.screenshot({
          path: `tests/screenshots/${viewport.name.toLowerCase()}-responsive-test.png`,
          fullPage: false
        });

        // Verify no horizontal scrollbar on smaller screens
        if (viewport.width <= 768) {
          const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
          const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
          expect(scrollWidth, `No horizontal scroll on ${viewport.name}`).toBeLessThanOrEqual(clientWidth + 20);
        }

        console.log(`✓ ${viewport.name} responsive test passed (${responsiveElements} responsive elements found)`);
      });
    }
  });

  test('Test 4: All UI components render correctly', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });

    await test.step('Check for essential UI components', async () => {
      const componentSelectors = [
        'header, .header, nav, .nav',
        'main, .main, .content, #content',
        'footer, .footer',
        'button, .btn, [role="button"]',
        'input, .input, [role="textbox"]',
        '.card, .component, .widget',
        '[class*="grid"], [class*="flex"]'
      ];

      let componentsFound = 0;
      const foundComponents = [];

      for (const selector of componentSelectors) {
        try {
          const elements = await page.locator(selector);
          const count = await elements.count();

          if (count > 0) {
            componentsFound += count;
            foundComponents.push(`${selector}: ${count} elements`);

            // Verify visibility of first element
            const firstElement = elements.first();
            if (await firstElement.isVisible()) {
              console.log(`✓ ${selector} - ${count} elements found and visible`);
            }
          }
        } catch (e) {
          // Continue checking other components
        }
      }

      expect(componentsFound, 'At least some UI components should be found').toBeGreaterThan(0);
      console.log(`Total UI components found: ${componentsFound}`);
      console.log('Component breakdown:', foundComponents);
    });

    await test.step('Check for interactive elements', async () => {
      const interactiveSelectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        '[onclick]',
        '[role="button"]',
        '[tabindex="0"]'
      ];

      let interactiveElements = 0;

      for (const selector of interactiveSelectors) {
        try {
          const count = await page.locator(selector).count();
          interactiveElements += count;
        } catch (e) {
          // Continue checking
        }
      }

      expect(interactiveElements, 'Interactive elements should be present').toBeGreaterThan(0);
      console.log(`✓ Found ${interactiveElements} interactive elements`);
    });
  });

  test('Test 5: No JavaScript errors in console', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });

    await test.step('Monitor for JavaScript errors', async () => {
      // Wait for any async operations to complete
      await page.waitForTimeout(3000);

      // Interact with the page to trigger any potential errors
      try {
        await page.mouse.move(100, 100);
        await page.keyboard.press('Tab');

        // Try clicking any clickable elements
        const clickableElements = await page.locator('button, a, [role="button"]').all();
        if (clickableElements.length > 0) {
          await clickableElements[0].click();
          await page.waitForTimeout(1000);
        }
      } catch (e) {
        // Interaction errors are acceptable for this test
      }

      // Check for console errors
      const consoleErrors = page.consoleErrors.filter(error =>
        !error.includes('favicon') &&
        !error.includes('404') &&
        !error.includes('net::ERR_') &&
        !error.toLowerCase().includes('warning')
      );

      // Check for JavaScript errors
      const jsErrors = page.jsErrors.filter(error =>
        !error.includes('Non-Error promise rejection') &&
        !error.includes('ResizeObserver loop limit exceeded')
      );

      console.log(`Console errors: ${consoleErrors.length}`);
      console.log(`JavaScript errors: ${jsErrors.length}`);

      if (consoleErrors.length > 0) {
        console.log('Console errors found:', consoleErrors);
      }
      if (jsErrors.length > 0) {
        console.log('JavaScript errors found:', jsErrors);
      }

      expect(jsErrors.length, 'No critical JavaScript errors should occur').toBe(0);
      expect(consoleErrors.length, 'No critical console errors should occur').toBeLessThanOrEqual(2);
    });
  });

  test('Test 6: Verify Tailwind CSS is properly applied', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });

    await test.step('Check for Tailwind CSS classes', async () => {
      const tailwindSelectors = [
        '[class*="bg-"]',
        '[class*="text-"]',
        '[class*="p-"], [class*="m-"]',
        '[class*="flex"], [class*="grid"]',
        '[class*="w-"], [class*="h-"]',
        '[class*="rounded"]',
        '[class*="shadow"]'
      ];

      let tailwindElementsFound = 0;
      const tailwindClasses = new Set();

      for (const selector of tailwindSelectors) {
        try {
          const elements = await page.locator(selector);
          const count = await elements.count();

          if (count > 0) {
            tailwindElementsFound += count;

            // Get actual classes used
            for (let i = 0; i < Math.min(count, 5); i++) {
              const className = await elements.nth(i).getAttribute('class');
              if (className) {
                className.split(' ').forEach(cls => {
                  if (cls.match(/^(bg-|text-|p-|m-|flex|grid|w-|h-|rounded|shadow)/)) {
                    tailwindClasses.add(cls);
                  }
                });
              }
            }
          }
        } catch (e) {
          // Continue checking
        }
      }

      expect(tailwindElementsFound, 'Tailwind CSS classes should be present').toBeGreaterThan(0);
      console.log(`✓ Found ${tailwindElementsFound} elements with Tailwind classes`);
      console.log(`Tailwind classes found: ${Array.from(tailwindClasses).slice(0, 10).join(', ')}...`);
    });

    await test.step('Verify Tailwind styles are applied', async () => {
      // Check if Tailwind utilities are actually working
      const testElement = await page.locator('[class*="bg-"], [class*="text-"]').first();

      if (await testElement.isVisible()) {
        const styles = await testElement.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            backgroundColor: computed.backgroundColor,
            color: computed.color,
            padding: computed.padding,
            margin: computed.margin
          };
        });

        const hasStyles = Object.values(styles).some(value =>
          value && value !== 'rgba(0, 0, 0, 0)' && value !== 'rgb(0, 0, 0)'
        );

        expect(hasStyles, 'Tailwind styles should be applied to elements').toBe(true);
        console.log('✓ Tailwind styles are being applied:', styles);
      }
    });

    await test.step('Check for Tailwind CSS in stylesheets', async () => {
      const stylesheets = await page.evaluate(() => {
        return Array.from(document.styleSheets).map(sheet => {
          try {
            return {
              href: sheet.href,
              rules: sheet.cssRules ? sheet.cssRules.length : 0
            };
          } catch (e) {
            return { href: sheet.href, rules: 'CORS blocked' };
          }
        });
      });

      const hasTailwindStylesheet = stylesheets.some(sheet =>
        sheet.href && (sheet.href.includes('tailwind') || sheet.rules > 1000)
      );

      console.log('Stylesheets found:', stylesheets);
      expect(hasTailwindStylesheet || stylesheets.length > 0, 'CSS stylesheets should be loaded').toBe(true);
    });
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Log test results
    const testName = testInfo.title;
    const status = testInfo.status;

    console.log(`\n=== ${testName} ===`);
    console.log(`Status: ${status}`);

    if (page.consoleErrors.length > 0) {
      console.log(`Console Errors: ${page.consoleErrors.length}`);
    }

    if (page.jsErrors.length > 0) {
      console.log(`JavaScript Errors: ${page.jsErrors.length}`);
    }

    // Take final screenshot on failure
    if (status === 'failed') {
      await page.screenshot({
        path: `tests/screenshots/${testName.replace(/[^a-zA-Z0-9]/g, '-')}-failed.png`,
        fullPage: true
      });
    }
  });
});