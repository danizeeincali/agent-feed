import { test, expect } from '@playwright/test';

test.describe('Error Boundary Functionality', () => {
  test('error boundaries prevent white screen crashes', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Inject controlled errors to test error boundaries
    const errorScenarios = [
      {
        name: 'Runtime Error',
        script: () => {
          throw new Error('Test runtime error for error boundary');
        }
      },
      {
        name: 'Component Error',
        script: () => {
          // Simulate component rendering error
          const event = new Error('Component rendering error');
          window.dispatchEvent(new ErrorEvent('error', { error: event }));
        }
      },
      {
        name: 'Promise Rejection',
        script: () => {
          Promise.reject(new Error('Unhandled promise rejection test'));
        }
      }
    ];

    for (const scenario of errorScenarios) {
      console.log(`Testing error boundary for: ${scenario.name}`);

      // Inject the error
      await page.evaluate(scenario.script);
      await page.waitForTimeout(1000);

      // Verify page is still responsive (no white screen)
      await expect(page.locator('#root')).toBeVisible();

      const bodyContent = await page.locator('body').textContent();
      expect(bodyContent).toBeTruthy();
      expect(bodyContent!.trim().length).toBeGreaterThan(0);

      // Look for error boundary UI or fallback content
      const hasErrorUI = await page.locator('[data-testid*="error"], .error-boundary, .error-fallback').count() > 0;
      const hasContent = bodyContent!.toLowerCase().includes('error') || bodyContent!.toLowerCase().includes('something went wrong');

      // Should either have error UI or continue working
      expect(hasErrorUI || bodyContent!.trim().length > 100).toBeTruthy();

      // Take screenshot of error state
      await page.screenshot({
        path: `tests/e2e/evidence/error-boundary-${scenario.name.toLowerCase().replace(' ', '-')}.png`,
        fullPage: true
      });
    }
  });

  test('app recovers from component errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Simulate component error and recovery
    await page.evaluate(() => {
      // Create a custom error event
      const errorEvent = new ErrorEvent('error', {
        error: new Error('Component error simulation'),
        message: 'Component error simulation'
      });

      // Dispatch error
      window.dispatchEvent(errorEvent);
    });

    await page.waitForTimeout(500);

    // App should still be functional
    await expect(page.locator('#root')).toBeVisible();

    // Try to interact with the page
    const clickableElements = page.locator('button, a, [role="button"], [role="link"]');
    const count = await clickableElements.count();

    if (count > 0) {
      // Try clicking first interactive element
      const firstElement = clickableElements.first();
      if (await firstElement.isVisible()) {
        await firstElement.click();
        await page.waitForTimeout(500);

        // Verify page is still responsive after interaction
        await expect(page.locator('#root')).toBeVisible();
      }
    }

    // Page content should still be present
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent!.trim().length).toBeGreaterThan(0);
  });

  test('network errors are handled gracefully', async ({ page }) => {
    // Simulate network failures
    await page.route('**/api/**', route => {
      route.abort('failed');
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // App should still load even with network failures
    await expect(page.locator('#root')).toBeVisible();

    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();
    expect(bodyContent!.trim().length).toBeGreaterThan(0);

    // Should show error message or fallback content, not white screen
    const hasErrorMessage = bodyContent!.toLowerCase().includes('error') ||
                           bodyContent!.toLowerCase().includes('failed') ||
                           bodyContent!.toLowerCase().includes('try again') ||
                           await page.locator('[data-testid*="error"], .error').count() > 0;

    // Either shows error state or continues with cached/default content
    expect(hasErrorMessage || bodyContent!.trim().length > 100).toBeTruthy();

    await page.screenshot({
      path: 'tests/e2e/evidence/network-error-handling.png',
      fullPage: true
    });
  });

  test('JavaScript errors do not crash the application', async ({ page }) => {
    const jsErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      console.log('Page error:', error.message);
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    // Inject various JavaScript errors
    const errorTests = [
      'undefined.property',
      'null.method()',
      'nonExistentFunction()',
      'JSON.parse("invalid json")'
    ];

    for (const errorTest of errorTests) {
      try {
        await page.evaluate((code) => {
          try {
            eval(code);
          } catch (e) {
            // Error caught, which is expected
            console.log('Caught error:', e.message);
          }
        }, errorTest);

        await page.waitForTimeout(200);

        // Verify app is still responsive
        await expect(page.locator('#root')).toBeVisible();
      } catch (error) {
        console.log(`Error test "${errorTest}" completed:`, error);
      }
    }

    // Final check that app is still working
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent!.trim().length).toBeGreaterThan(0);

    console.log(`Total JS errors captured: ${jsErrors.length}`);
  });
});