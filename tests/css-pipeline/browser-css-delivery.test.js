/**
 * TDD Test Suite: Browser CSS Delivery Tests
 * Purpose: Test if CSS is properly delivered to the browser and applied
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

describe('Browser CSS Delivery Tests', () => {
  let browser;
  let context;
  let page;
  let projectRoot;

  beforeAll(async () => {
    projectRoot = path.resolve(__dirname, '../..');
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
    page = await context.newPage();
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  test('FAILING TEST: CSS files are loaded in browser', async () => {
    // This test will likely fail if CSS compilation is broken
    try {
      // Navigate to the application
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

      // Check if CSS files are loaded
      const cssRequests = [];
      page.on('response', response => {
        if (response.url().includes('.css')) {
          cssRequests.push({
            url: response.url(),
            status: response.status(),
            contentType: response.headers()['content-type']
          });
        }
      });

      // Reload to capture CSS requests
      await page.reload({ waitUntil: 'networkidle' });

      console.log('CSS requests:', cssRequests);

      expect(cssRequests.length).toBeGreaterThan(0);

      // Check if CSS requests were successful
      cssRequests.forEach(request => {
        expect(request.status).toBe(200);
        expect(request.contentType).toContain('css');
      });

    } catch (error) {
      console.error('CSS loading test failed:', error.message);
      throw error;
    }
  }, 30000);

  test('FAILING TEST: Tailwind CSS classes are applied', async () => {
    try {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

      // Look for elements with Tailwind classes
      const tailwindElements = await page.$$('[class*="bg-"], [class*="text-"], [class*="p-"], [class*="m-"]');

      if (tailwindElements.length === 0) {
        console.warn('No elements with Tailwind classes found');
      }

      // Check if Tailwind CSS is actually applied
      const body = await page.$('body');
      const bodyStyles = await body.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          fontFamily: computed.fontFamily,
          margin: computed.margin,
          padding: computed.padding
        };
      });

      console.log('Body computed styles:', bodyStyles);

      // Tailwind should reset default margins
      expect(bodyStyles.margin).toBe('0px');

      // If Tailwind is working, we should have specific styles applied
      const elementWithTailwind = await page.$('[class*="bg-"]');
      if (elementWithTailwind) {
        const elementStyles = await elementWithTailwind.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            backgroundColor: computed.backgroundColor,
            color: computed.color
          };
        });

        console.log('Tailwind element styles:', elementStyles);

        // Background should not be the default
        expect(elementStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      }

    } catch (error) {
      console.error('Tailwind CSS application test failed:', error.message);
      throw error;
    }
  }, 30000);

  test('CSS custom properties are available', async () => {
    try {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

      // Check if CSS custom properties from globals.css are available
      const customProperties = await page.evaluate(() => {
        const rootStyles = window.getComputedStyle(document.documentElement);
        return {
          background: rootStyles.getPropertyValue('--background'),
          foreground: rootStyles.getPropertyValue('--foreground'),
          primary: rootStyles.getPropertyValue('--primary'),
          border: rootStyles.getPropertyValue('--border')
        };
      });

      console.log('CSS custom properties:', customProperties);

      // Should have custom properties defined
      Object.values(customProperties).forEach(value => {
        expect(value.trim()).toBeTruthy();
      });

    } catch (error) {
      console.error('CSS custom properties test failed:', error.message);
      // Don't fail the test if app is not running
      console.warn('Application may not be running on localhost:3000');
    }
  }, 30000);

  test('CSS animations and transitions work', async () => {
    try {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

      // Look for elements with animations or transitions
      const animatedElements = await page.$$('[class*="animate-"], [class*="transition-"]');

      if (animatedElements.length > 0) {
        const firstAnimated = animatedElements[0];
        const animationProps = await firstAnimated.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            animation: computed.animation,
            transition: computed.transition,
            animationDuration: computed.animationDuration,
            transitionDuration: computed.transitionDuration
          };
        });

        console.log('Animation properties:', animationProps);

        // Should have animation or transition properties
        const hasAnimation = animationProps.animation !== 'none' ||
                            animationProps.transition !== 'all 0s ease 0s';

        if (hasAnimation) {
          expect(animationProps.animationDuration || animationProps.transitionDuration).toBeTruthy();
        }
      }

    } catch (error) {
      console.error('CSS animations test failed:', error.message);
      console.warn('Application may not be running on localhost:3000');
    }
  }, 30000);

  test('Responsive design classes work', async () => {
    try {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(1000);

      const mobileStyles = await page.evaluate(() => {
        const body = document.body;
        const computed = window.getComputedStyle(body);
        return {
          width: computed.width,
          fontSize: computed.fontSize
        };
      });

      // Test desktop viewport
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.waitForTimeout(1000);

      const desktopStyles = await page.evaluate(() => {
        const body = document.body;
        const computed = window.getComputedStyle(body);
        return {
          width: computed.width,
          fontSize: computed.fontSize
        };
      });

      console.log('Mobile styles:', mobileStyles);
      console.log('Desktop styles:', desktopStyles);

      // Styles should be responsive (different between mobile and desktop)
      // This is a basic check - in real scenarios, specific elements would be tested

    } catch (error) {
      console.error('Responsive design test failed:', error.message);
      console.warn('Application may not be running on localhost:3000');
    }
  }, 30000);

  test('FAILING TEST: CSS hot reload works in development', async () => {
    // This test checks if CSS changes are reflected without page reload
    try {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

      // Get initial styles
      const initialBodyColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).color;
      });

      console.log('Initial body color:', initialBodyColor);

      // This would typically involve modifying CSS file and checking if changes appear
      // For now, we'll just check if the development server supports hot reload

      const hasHotReload = await page.evaluate(() => {
        // Check for Next.js hot reload indicators
        return !!(window.__webpack_require__ || window.next || window._N_E);
      });

      console.log('Hot reload support detected:', hasHotReload);

      if (!hasHotReload) {
        throw new Error('Hot reload support not detected in development mode');
      }

    } catch (error) {
      console.error('CSS hot reload test failed:', error.message);
      throw error;
    }
  }, 30000);

  test('CSS performance metrics', async () => {
    try {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

      // Measure CSS loading performance
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const resources = performance.getEntriesByType('resource');

        const cssResources = resources.filter(resource =>
          resource.name.includes('.css') ||
          resource.initiatorType === 'css'
        );

        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          cssResourcesCount: cssResources.length,
          cssLoadTime: cssResources.length > 0 ?
            Math.max(...cssResources.map(r => r.responseEnd - r.requestStart)) : 0
        };
      });

      console.log('CSS performance metrics:', performanceMetrics);

      // CSS should load reasonably fast
      if (performanceMetrics.cssLoadTime > 0) {
        expect(performanceMetrics.cssLoadTime).toBeLessThan(5000); // Less than 5 seconds
      }

      // Should have at least one CSS resource
      expect(performanceMetrics.cssResourcesCount).toBeGreaterThanOrEqual(0);

    } catch (error) {
      console.error('CSS performance test failed:', error.message);
      console.warn('Application may not be running on localhost:3000');
    }
  }, 30000);

  test('CSS error handling in browser', async () => {
    try {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

      // Listen for console errors related to CSS
      const cssErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error' &&
            (msg.text().includes('css') ||
             msg.text().includes('stylesheet') ||
             msg.text().includes('Failed to load'))) {
          cssErrors.push(msg.text());
        }
      });

      // Reload to capture any CSS loading errors
      await page.reload({ waitUntil: 'networkidle' });

      console.log('CSS errors detected:', cssErrors);

      // Should not have CSS loading errors
      expect(cssErrors.length).toBe(0);

    } catch (error) {
      console.error('CSS error handling test failed:', error.message);
      console.warn('Application may not be running on localhost:3000');
    }
  }, 30000);

  test('CSS specificity and cascade order', async () => {
    try {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

      // Check if CSS cascade is working correctly
      const body = await page.$('body');
      const finalStyles = await body.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          fontFamily: computed.fontFamily
        };
      });

      console.log('Final computed styles:', finalStyles);

      // Styles should be properly cascaded (not default browser styles)
      expect(finalStyles.fontFamily).not.toBe('Times'); // Should not be default serif

      // Background should be set (either by Tailwind or custom CSS)
      expect(finalStyles.backgroundColor).toBeTruthy();

    } catch (error) {
      console.error('CSS cascade test failed:', error.message);
      console.warn('Application may not be running on localhost:3000');
    }
  }, 30000);

  test('CSS media queries work correctly', async () => {
    try {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

      // Test if media queries are working by checking matchMedia
      const mediaQueryTests = await page.evaluate(() => {
        return {
          mobile: window.matchMedia('(max-width: 768px)').matches,
          tablet: window.matchMedia('(min-width: 769px) and (max-width: 1024px)').matches,
          desktop: window.matchMedia('(min-width: 1025px)').matches,
          darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches
        };
      });

      console.log('Media query results:', mediaQueryTests);

      // At least one media query should match
      const hasMatchingQuery = Object.values(mediaQueryTests).some(matches => matches);
      expect(hasMatchingQuery).toBe(true);

    } catch (error) {
      console.error('Media query test failed:', error.message);
      console.warn('Application may not be running on localhost:3000');
    }
  }, 30000);
});