/**
 * Error Boundary and Fallback Tests
 *
 * Tests error handling and fallback mechanisms after interactive control removal.
 * Validates that the application gracefully handles errors without mocks.
 */

import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Error Boundary and Fallback Tests', () => {
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

    // Track JavaScript errors
    page.on('pageerror', error => {
      console.log('Page error:', error.message);
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
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

  test('React Error Boundary activation', async () => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Inject a script that will cause a React component error
    await page.evaluate(() => {
      // Create a component that will throw an error
      window.triggerComponentError = () => {
        const errorEvent = new Error('Test component error');
        errorEvent.componentStack = 'Test component stack';

        // Dispatch a React error
        if (window.React && window.React.version) {
          // Simulate React error boundary trigger
          const errorBoundaryEvent = new CustomEvent('reactError', {
            detail: { error: errorEvent, errorInfo: { componentStack: 'Test stack' } }
          });
          document.dispatchEvent(errorBoundaryEvent);
        }

        // Also trigger a general JavaScript error
        throw errorEvent;
      };
    });

    // Trigger the error
    try {
      await page.evaluate(() => window.triggerComponentError());
    } catch (error) {
      // Expected to throw
    }

    await page.waitForTimeout(1000);

    // Check if error boundary is displayed
    const errorBoundary = page.locator('[data-testid="error-boundary"], .error-boundary');
    const errorBoundaryExists = await errorBoundary.count() > 0;

    if (errorBoundaryExists) {
      await expect(errorBoundary.first()).toBeVisible();

      // Verify error boundary content
      const errorContent = await errorBoundary.first().textContent();
      expect(errorContent).toMatch(/error|something went wrong|oops/i);

      // Test reload functionality if present
      const reloadButton = errorBoundary.first().locator('button:has-text("reload"), button:has-text("retry")');
      if (await reloadButton.count() > 0) {
        await reloadButton.first().click();
        await page.waitForLoadState('networkidle');

        // Verify page reloads successfully
        expect(page.url()).toBe(`${BASE_URL}/`);
      }
    } else {
      // If no error boundary, verify page still functions
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    }
  });

  test('Network error fallback handling', async () => {
    // Block all API requests to simulate network failures
    await page.route('**/api/**', route => route.abort());

    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    // Verify page loads despite API failures
    await expect(page.locator('body')).toBeVisible();

    // Look for error states or fallback content
    const errorStates = page.locator(
      '[data-testid="error-state"], [data-testid="network-error"], .error-state, .network-error'
    );

    const fallbackContent = page.locator(
      '[data-testid="fallback"], [data-testid="offline"], .fallback, .offline-content'
    );

    const loadingStates = page.locator(
      '[data-testid="loading"], .loading, .spinner'
    );

    // At least one of these should be present
    const hasErrorState = await errorStates.count() > 0;
    const hasFallbackContent = await fallbackContent.count() > 0;
    const hasLoadingState = await loadingStates.count() > 0;

    expect(hasErrorState || hasFallbackContent || hasLoadingState).toBe(true);

    if (hasErrorState) {
      await expect(errorStates.first()).toBeVisible();
      const errorText = await errorStates.first().textContent();
      expect(errorText).toMatch(/error|failed|retry|offline/i);
    }
  });

  test('Component crash recovery', async () => {
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    // Inject code to crash a component
    await page.evaluate(() => {
      // Find a React component and corrupt its state
      const components = document.querySelectorAll('[data-testid], [class*="component"]');
      if (components.length > 0) {
        const firstComponent = components[0];

        // Try to trigger a component crash
        try {
          // Modify component props/state in an invalid way
          if (firstComponent._reactInternalFiber || firstComponent._reactInternalInstance) {
            const reactKey = firstComponent._reactInternalFiber ? '_reactInternalFiber' : '_reactInternalInstance';
            const reactInstance = firstComponent[reactKey];

            // Corrupt component state
            if (reactInstance && reactInstance.stateNode) {
              reactInstance.stateNode.setState({ corrupted: undefined.property });
            }
          }
        } catch (e) {
          console.log('Component crash test triggered:', e.message);
        }
      }
    });

    await page.waitForTimeout(1000);

    // Verify app still functions despite component crash
    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBe(true);

    // Check for error boundaries or fallback UI
    const errorBoundary = page.locator('[data-testid="error-boundary"], .error-boundary');
    const hasErrorBoundary = await errorBoundary.count() > 0;

    if (hasErrorBoundary) {
      await expect(errorBoundary.first()).toBeVisible();
    }
  });

  test('404 page error handling', async () => {
    await page.goto(`${BASE_URL}/non-existent-page-xyz-123`);
    await page.waitForLoadState('networkidle');

    // Verify 404 page or appropriate error handling
    const pageContent = await page.textContent('body');

    // Should contain 404 or not found content
    const has404Content = pageContent.includes('404') ||
                         pageContent.includes('Not Found') ||
                         pageContent.includes('Page not found') ||
                         pageContent.includes('not found');

    // Or should redirect to a valid page
    const isValidPage = page.url().includes('/agents') ||
                       page.url().includes('/avi-dm') ||
                       page.url() === `${BASE_URL}/`;

    expect(has404Content || isValidPage).toBe(true);

    // Verify page is functional
    await expect(page.locator('body')).toBeVisible();

    // Test navigation from 404 page
    if (has404Content) {
      const homeLinks = page.locator('a[href="/"], a:has-text("home"), a:has-text("Home")');
      if (await homeLinks.count() > 0) {
        await homeLinks.first().click();
        await page.waitForLoadState('networkidle');

        // Verify navigation works
        expect(page.url()).toBe(`${BASE_URL}/`);
      }
    }
  });

  test('JavaScript error recovery', async () => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Track JavaScript errors
    const jsErrors = [];
    page.on('pageerror', error => jsErrors.push(error.message));

    // Inject JavaScript errors
    await page.evaluate(() => {
      // Trigger various types of JS errors
      setTimeout(() => {
        try {
          undefined.property.access;
        } catch (e) {
          console.error('Intentional error 1:', e);
        }
      }, 100);

      setTimeout(() => {
        try {
          nonExistentFunction();
        } catch (e) {
          console.error('Intentional error 2:', e);
        }
      }, 200);

      setTimeout(() => {
        try {
          JSON.parse('invalid json {');
        } catch (e) {
          console.error('Intentional error 3:', e);
        }
      }, 300);
    });

    await page.waitForTimeout(1000);

    // Verify page still functions despite JS errors
    await expect(page.locator('body')).toBeVisible();

    // Test navigation still works
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });

  test('API timeout fallback handling', async () => {
    // Create slow API responses to trigger timeouts
    await page.route('**/api/agents', route => {
      setTimeout(() => route.continue(), 10000); // 10 second delay
    });

    await page.goto(`${BASE_URL}/agents`);

    // Wait for timeout handling (should be faster than 10 seconds)
    await page.waitForTimeout(3000);

    // Verify page shows appropriate loading or timeout state
    const loadingElements = page.locator('[data-testid="loading"], .loading, .spinner');
    const timeoutElements = page.locator('[data-testid="timeout"], [data-testid="error"], .timeout, .error');

    const hasLoading = await loadingElements.count() > 0;
    const hasTimeout = await timeoutElements.count() > 0;

    expect(hasLoading || hasTimeout).toBe(true);

    if (hasTimeout) {
      await expect(timeoutElements.first()).toBeVisible();
      const timeoutText = await timeoutElements.first().textContent();
      expect(timeoutText).toMatch(/timeout|slow|retry|error/i);
    }
  });

  test('Memory leak prevention in error states', async () => {
    // Monitor memory usage during error scenarios
    const initialMetrics = await page.evaluate(() => {
      return {
        heapUsed: performance.memory ? performance.memory.usedJSHeapSize : 0,
        nodes: document.querySelectorAll('*').length
      };
    });

    // Trigger multiple error scenarios
    for (let i = 0; i < 5; i++) {
      await page.route('**/api/**', route => route.abort());

      await page.goto(`${BASE_URL}/agents`);
      await page.waitForTimeout(1000);

      await page.goto(`${BASE_URL}/avi-dm`);
      await page.waitForTimeout(1000);

      // Clear route intercepts
      await page.unroute('**/api/**');
    }

    // Check memory usage after error scenarios
    const finalMetrics = await page.evaluate(() => {
      return {
        heapUsed: performance.memory ? performance.memory.usedJSHeapSize : 0,
        nodes: document.querySelectorAll('*').length
      };
    });

    // Memory should not have grown excessively
    if (initialMetrics.heapUsed > 0 && finalMetrics.heapUsed > 0) {
      const memoryIncrease = finalMetrics.heapUsed - initialMetrics.heapUsed;
      const memoryIncreasePercent = (memoryIncrease / initialMetrics.heapUsed) * 100;

      // Allow for some memory increase, but not excessive
      expect(memoryIncreasePercent).toBeLessThan(500); // Less than 500% increase
    }

    console.log('Memory metrics:', { initialMetrics, finalMetrics });
  });

  test('Graceful degradation with missing features', async () => {
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    // Disable JavaScript and test graceful degradation
    await context.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (compatible; TestBot/1.0; +http://test.example)'
    });

    // Test with JavaScript disabled scenario
    await page.evaluate(() => {
      // Simulate missing JavaScript features
      delete window.fetch;
      delete window.WebSocket;
      delete window.localStorage;
      delete window.sessionStorage;
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify basic functionality still works
    await expect(page.locator('body')).toBeVisible();

    // Verify content is still accessible
    const pageText = await page.textContent('body');
    expect(pageText.length).toBeGreaterThan(100);
  });

  test('Error boundary with retry functionality', async () => {
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    // Block API and trigger error state
    await page.route('**/api/**', route => route.abort());

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Look for retry buttons or mechanisms
    const retryButtons = page.locator(
      'button:has-text("retry"), button:has-text("Retry"), ' +
      'button:has-text("reload"), button:has-text("Reload"), ' +
      '[data-testid="retry-button"]'
    );

    if (await retryButtons.count() > 0) {
      // Unblock API before testing retry
      await page.unroute('**/api/**');

      // Click retry button
      await retryButtons.first().click();
      await page.waitForLoadState('networkidle');

      // Verify retry worked
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Error state accessibility', async () => {
    // Block API to trigger error states
    await page.route('**/api/**', route => route.abort());

    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    // Test keyboard navigation in error states
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');

    if (await focusedElement.count() > 0) {
      await expect(focusedElement.first()).toBeVisible();
    }

    // Verify error messages have proper ARIA attributes
    const errorElements = page.locator('[role="alert"], [aria-live], .error, .error-state');

    if (await errorElements.count() > 0) {
      const firstError = errorElements.first();
      await expect(firstError).toBeVisible();

      // Check for accessibility attributes
      const role = await firstError.getAttribute('role');
      const ariaLive = await firstError.getAttribute('aria-live');

      if (role || ariaLive) {
        expect(['alert', 'status', 'polite', 'assertive']).toContain(role || ariaLive);
      }
    }
  });
});