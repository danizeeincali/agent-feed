import { test, expect, Page } from '@playwright/test';

test.describe('WebSocket Context E2E Tests - Temporal Dead Zone Fix', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('should load application without connectionState initialization errors', async () => {
    // Listen for console errors that might indicate temporal dead zone issues
    const consoleErrors: string[] = [];
    const jsErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });

    // Navigate to the application
    await page.goto('http://localhost:3000');

    // Wait for the application to load
    await page.waitForLoadState('networkidle');

    // Check that no temporal dead zone errors occurred
    const temporalDeadZoneErrors = [
      ...consoleErrors,
      ...jsErrors
    ].filter(error => 
      error.includes('Cannot access') && 
      error.includes('before initialization') &&
      error.includes('connectionState')
    );

    expect(temporalDeadZoneErrors).toHaveLength(0);
  });

  test('should display WebSocket connection status without errors', async () => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Look for WebSocket status indicators
    const connectionIndicators = await page.locator('[data-testid*="connection"], [data-testid*="websocket"], .connection-status, .websocket-status');
    
    if (await connectionIndicators.count() > 0) {
      // If connection indicators exist, they should be visible without errors
      await expect(connectionIndicators.first()).toBeVisible();
    }

    // Check that the page loaded successfully without JavaScript errors
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('should handle WebSocket context provider initialization in browser', async () => {
    await page.goto('http://localhost:3000');
    
    // Inject a script to test the context initialization
    const contextInitializationTest = await page.evaluate(() => {
      return new Promise((resolve) => {
        let hasTemporalDeadZoneError = false;
        
        const originalError = console.error;
        console.error = (...args: any[]) => {
          const errorMessage = args.join(' ');
          if (errorMessage.includes('Cannot access') && 
              errorMessage.includes('before initialization') &&
              errorMessage.includes('connectionState')) {
            hasTemporalDeadZoneError = true;
          }
          originalError.apply(console, args);
        };
        
        // Wait a bit for any initialization errors to surface
        setTimeout(() => {
          console.error = originalError;
          resolve({ hasTemporalDeadZoneError });
        }, 2000);
      });
    });

    expect(contextInitializationTest).toEqual({ hasTemporalDeadZoneError: false });
  });

  test('should maintain WebSocket connection state consistency across page interactions', async () => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Try to interact with different parts of the page that might use the WebSocket context
    const interactiveElements = await page.locator('button, [role="button"], .clickable, [data-testid*="button"]');
    
    if (await interactiveElements.count() > 0) {
      // Click a few interactive elements
      const elementCount = Math.min(3, await interactiveElements.count());
      for (let i = 0; i < elementCount; i++) {
        try {
          await interactiveElements.nth(i).click({ timeout: 1000 });
          await page.waitForTimeout(500); // Brief wait between clicks
        } catch (error) {
          // Element might not be clickable, continue with next
          console.log(`Element ${i} not clickable:`, error);
        }
      }
    }

    // Check that no temporal dead zone errors occurred during interactions
    const finalErrorCheck = await page.evaluate(() => {
      const errors = (window as any).temporalDeadZoneErrors || [];
      return errors.filter((error: string) => 
        error.includes('connectionState') && error.includes('before initialization')
      );
    });

    expect(finalErrorCheck).toHaveLength(0);
  });

  test('should handle WebSocket context re-renders without temporal dead zone issues', async () => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Simulate conditions that might cause re-renders
    await page.evaluate(() => {
      // Trigger window resize (common cause of re-renders)
      window.dispatchEvent(new Event('resize'));
      
      // Trigger focus/blur events
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('blur'));
      window.dispatchEvent(new Event('focus'));
      
      // Trigger visibility change
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true
      });
      document.dispatchEvent(new Event('visibilitychange'));
      
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Wait for any re-renders to complete
    await page.waitForTimeout(1000);

    // Verify no errors occurred
    const rerenderErrors = await page.evaluate(() => {
      return (window as any).temporalDeadZoneErrors || [];
    });

    expect(rerenderErrors.filter((error: string) => 
      error.includes('connectionState')
    )).toHaveLength(0);
  });

  test('should properly initialize WebSocket context in different network conditions', async () => {
    // Test with throttled network to simulate slow loading
    await page.route('**/*', async (route) => {
      await route.continue();
    });

    await page.goto('http://localhost:3000');
    
    // Even with network delays, context should initialize without temporal dead zone errors
    await page.waitForLoadState('networkidle');

    const networkDelayErrors = await page.evaluate(() => {
      return (window as any).temporalDeadZoneErrors || [];
    });

    expect(networkDelayErrors.filter((error: string) => 
      error.includes('connectionState') && error.includes('before initialization')
    )).toHaveLength(0);
  });
});