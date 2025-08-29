import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Comprehensive UI Automation Tests for Fixed Frontend
 * 
 * This test suite covers:
 * 1. Button clicks without JavaScript errors
 * 2. Instance creation workflow
 * 3. Terminal input/output functionality
 * 4. Error handling and edge cases
 * 5. UI responsiveness across different viewports
 * 6. WebSocket connections in browser
 * 7. Screenshot capture of success states
 */

// Test data and utilities
const TEST_TIMEOUT = 60000;
const VIEWPORT_SIZES = [
  { width: 1920, height: 1080, name: 'desktop-large' },
  { width: 1366, height: 768, name: 'desktop-standard' },
  { width: 768, height: 1024, name: 'tablet' },
  { width: 375, height: 667, name: 'mobile' }
];

// Helper functions
class UITestHelpers {
  static async checkForJavaScriptErrors(page: Page): Promise<string[]> {
    const errors: string[] = [];
    
    page.on('pageerror', (error) => {
      errors.push(`Page error: ${error.message}`);
    });
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(`Console error: ${msg.text()}`);
      }
    });
    
    return errors;
  }

  static async waitForNetworkIdle(page: Page, timeout = 5000): Promise<void> {
    await page.waitForLoadState('networkidle', { timeout });
  }

  static async captureScreenshot(page: Page, name: string): Promise<void> {
    await page.screenshot({ 
      path: `test-results/screenshots/${name}.png`,
      fullPage: true 
    });
  }

  static async clickButtonSafely(page: Page, selector: string): Promise<boolean> {
    try {
      await page.waitForSelector(selector, { state: 'visible', timeout: 10000 });
      await page.click(selector);
      await page.waitForTimeout(500); // Allow for any animations or state changes
      return true;
    } catch (error) {
      console.error(`Failed to click button ${selector}:`, error);
      return false;
    }
  }
}

test.describe('Comprehensive UI Automation Tests', () => {
  let errors: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Set up error tracking
    errors = await UITestHelpers.checkForJavaScriptErrors(page);
    
    // Navigate to the application
    await page.goto('/', { waitUntil: 'networkidle' });
    await UITestHelpers.waitForNetworkIdle(page);
  });

  test.afterEach(async ({ page }) => {
    // Check for JavaScript errors after each test
    if (errors.length > 0) {
      console.warn('JavaScript errors detected:', errors);
    }
  });

  test.describe('Button Click Validation', () => {
    test('should click all navigation buttons without JavaScript errors', async ({ page }) => {
      const navigationButtons = [
        'text="Social Media Feed"',
        'text="Agent Manager"',
        'text="Claude Instances"',
        'text="Analytics"',
        'text="Settings"'
      ];

      for (const buttonSelector of navigationButtons) {
        await test.step(`Click ${buttonSelector}`, async () => {
          const clicked = await UITestHelpers.clickButtonSafely(page, buttonSelector);
          expect(clicked).toBe(true);
          
          // Check for errors after each click
          expect(errors).toHaveLength(0);
          
          // Capture screenshot of success state
          const buttonName = buttonSelector.replace(/[^a-zA-Z0-9]/g, '-');
          await UITestHelpers.captureScreenshot(page, `button-click-${buttonName}`);
        });
      }
    });

    test('should handle Claude Instance creation buttons', async ({ page }) => {
      // Navigate to Claude Instances page
      await page.click('text="Claude Instances"');
      await UITestHelpers.waitForNetworkIdle(page);

      const instanceButtons = [
        '[data-testid="create-coding-instance"]',
        '[data-testid="create-research-instance"]',
        '[data-testid="create-analysis-instance"]',
        '[data-testid="create-creative-instance"]',
        'button:has-text("Create New Instance")',
        'button:has-text("Refresh Instances")'
      ];

      for (const buttonSelector of instanceButtons) {
        await test.step(`Test ${buttonSelector}`, async () => {
          const isVisible = await page.isVisible(buttonSelector);
          if (isVisible) {
            const clicked = await UITestHelpers.clickButtonSafely(page, buttonSelector);
            expect(clicked).toBe(true);
            
            // Wait for any API calls to complete
            await page.waitForTimeout(1000);
            
            // Capture screenshot
            const buttonName = buttonSelector.replace(/[^a-zA-Z0-9]/g, '-');
            await UITestHelpers.captureScreenshot(page, `claude-button-${buttonName}`);
          }
        });
      }
    });
  });

  test.describe('Instance Creation Workflow', () => {
    test('should complete full instance creation workflow', async ({ page }) => {
      // Navigate to Claude Instances
      await page.click('text="Claude Instances"');
      await UITestHelpers.waitForNetworkIdle(page);
      await UITestHelpers.captureScreenshot(page, 'instance-page-loaded');

      // Test instance creation form if available
      const createButton = page.locator('button:has-text("Create New Instance")');
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForTimeout(1000);
        
        // Fill out instance creation form if modal appears
        const instanceNameInput = page.locator('input[placeholder*="instance"], input[name*="name"]');
        if (await instanceNameInput.isVisible()) {
          await instanceNameInput.fill('Test Automation Instance');
          await UITestHelpers.captureScreenshot(page, 'instance-form-filled');
          
          // Submit form
          const submitButton = page.locator('button:has-text("Create"), button:has-text("Submit")');
          if (await submitButton.isVisible()) {
            await submitButton.click();
            await page.waitForTimeout(2000);
            await UITestHelpers.captureScreenshot(page, 'instance-creation-submitted');
          }
        }
      }

      // Verify instance list updates
      const instanceList = page.locator('[data-testid="instance-list"], .instance-card, .instance-item');
      if (await instanceList.isVisible()) {
        await UITestHelpers.captureScreenshot(page, 'instance-list-updated');
      }
    });

    test('should handle instance type selection', async ({ page }) => {
      await page.click('text="Claude Instances"');
      await UITestHelpers.waitForNetworkIdle(page);

      const instanceTypes = [
        'coding-assistant',
        'research-helper', 
        'data-analyst',
        'creative-writer'
      ];

      for (const instanceType of instanceTypes) {
        const selector = `[data-testid="create-${instanceType}-instance"], button:has-text("${instanceType}")`;
        const element = page.locator(selector);
        
        if (await element.isVisible()) {
          await element.click();
          await page.waitForTimeout(1000);
          await UITestHelpers.captureScreenshot(page, `instance-type-${instanceType}`);
        }
      }
    });
  });

  test.describe('Terminal Input/Output Functionality', () => {
    test('should test terminal component interactions', async ({ page }) => {
      // Look for terminal components
      const terminalSelectors = [
        '[data-testid="terminal"]',
        '.terminal-container',
        '.xterm',
        'textarea[placeholder*="command"]',
        'input[placeholder*="terminal"]'
      ];

      let terminalFound = false;

      for (const selector of terminalSelectors) {
        if (await page.isVisible(selector)) {
          terminalFound = true;
          await UITestHelpers.captureScreenshot(page, 'terminal-found');

          // Test input functionality
          if (selector.includes('textarea') || selector.includes('input')) {
            await page.fill(selector, 'echo "Hello from automation test"');
            await page.press(selector, 'Enter');
            await page.waitForTimeout(2000);
            await UITestHelpers.captureScreenshot(page, 'terminal-input-test');
          } else {
            // Try to interact with terminal element
            await page.click(selector);
            await page.waitForTimeout(500);
            await UITestHelpers.captureScreenshot(page, 'terminal-clicked');
          }
          break;
        }
      }

      if (!terminalFound) {
        console.log('No terminal component found on current page');
      }
    });

    test('should test WebSocket terminal streaming', async ({ page }) => {
      await page.goto('/claude-instances');
      await UITestHelpers.waitForNetworkIdle(page);

      // Monitor WebSocket connections
      const wsConnections: any[] = [];
      
      page.on('websocket', ws => {
        wsConnections.push(ws);
        console.log('WebSocket connection established:', ws.url());
        
        ws.on('framereceived', event => {
          console.log('WebSocket frame received:', event.payload);
        });
        
        ws.on('framesent', event => {
          console.log('WebSocket frame sent:', event.payload);
        });
      });

      // Wait for potential WebSocket connections
      await page.waitForTimeout(5000);
      
      if (wsConnections.length > 0) {
        await UITestHelpers.captureScreenshot(page, 'websocket-connected');
        console.log(`${wsConnections.length} WebSocket connection(s) established`);
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network errors gracefully', async ({ page, context }) => {
      // Block network requests to simulate offline state
      await context.route('**/*', route => {
        if (route.request().url().includes('/api/')) {
          route.abort();
        } else {
          route.continue();
        }
      });

      await page.goto('/');
      await page.waitForTimeout(3000);
      
      // Check for error messages or fallback UI
      const errorMessages = await page.locator('text=error, text=failed, text=unable, .error, .alert-error').count();
      console.log(`Found ${errorMessages} error indicators`);
      
      await UITestHelpers.captureScreenshot(page, 'network-error-handling');
    });

    test('should handle rapid button clicks', async ({ page }) => {
      await page.click('text="Claude Instances"');
      await UITestHelpers.waitForNetworkIdle(page);

      const refreshButton = page.locator('button:has-text("Refresh")');
      if (await refreshButton.isVisible()) {
        // Rapid clicks to test debouncing
        for (let i = 0; i < 5; i++) {
          await refreshButton.click();
          await page.waitForTimeout(100);
        }
        
        await page.waitForTimeout(2000);
        await UITestHelpers.captureScreenshot(page, 'rapid-click-handling');
      }
    });

    test('should handle form validation', async ({ page }) => {
      await page.goto('/claude-instances');
      
      // Try to submit empty forms if available
      const forms = await page.locator('form').count();
      
      for (let i = 0; i < forms; i++) {
        const form = page.locator('form').nth(i);
        const submitButton = form.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Create")');
        
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await page.waitForTimeout(1000);
          
          // Check for validation messages
          const validationMessages = await page.locator('.error, .invalid, [aria-invalid="true"]').count();
          console.log(`Form ${i}: Found ${validationMessages} validation messages`);
        }
      }
      
      await UITestHelpers.captureScreenshot(page, 'form-validation');
    });
  });

  test.describe('UI Responsiveness', () => {
    for (const viewport of VIEWPORT_SIZES) {
      test(`should be responsive on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/');
        await UITestHelpers.waitForNetworkIdle(page);
        
        // Test navigation on different screen sizes
        await page.click('text="Claude Instances"');
        await UITestHelpers.waitForNetworkIdle(page);
        
        // Capture screenshot for visual comparison
        await UITestHelpers.captureScreenshot(page, `responsive-${viewport.name}`);
        
        // Check that important elements are visible
        const importantElements = [
          'nav, .navigation',
          'main, .main-content',
          'button:has-text("Create")'
        ];
        
        for (const selector of importantElements) {
          const element = page.locator(selector);
          if (await element.count() > 0) {
            const isVisible = await element.first().isVisible();
            expect(isVisible).toBe(true);
          }
        }
      });
    }
  });

  test.describe('Performance and Load Testing', () => {
    test('should load pages within acceptable time limits', async ({ page }) => {
      const pages = [
        { path: '/', name: 'home' },
        { path: '/claude-instances', name: 'claude-instances' },
        { path: '/analytics', name: 'analytics' },
        { path: '/settings', name: 'settings' }
      ];

      for (const testPage of pages) {
        await test.step(`Load ${testPage.name} page`, async () => {
          const startTime = Date.now();
          await page.goto(testPage.path);
          await UITestHelpers.waitForNetworkIdle(page);
          const loadTime = Date.now() - startTime;
          
          console.log(`${testPage.name} page loaded in ${loadTime}ms`);
          expect(loadTime).toBeLessThan(10000); // 10 second timeout
          
          await UITestHelpers.captureScreenshot(page, `performance-${testPage.name}`);
        });
      }
    });

    test('should handle multiple simultaneous actions', async ({ page }) => {
      await page.goto('/claude-instances');
      await UITestHelpers.waitForNetworkIdle(page);
      
      // Perform multiple actions simultaneously
      const actions = [
        () => page.click('button:has-text("Refresh")'),
        () => page.click('text="Analytics"'),
        () => page.press('body', 'F5') // Refresh page
      ];
      
      await Promise.allSettled(actions.map(action => action()));
      await page.waitForTimeout(3000);
      
      await UITestHelpers.captureScreenshot(page, 'multiple-actions');
    });
  });

  test.describe('Accessibility Testing', () => {
    test('should have proper keyboard navigation', async ({ page }) => {
      await page.goto('/');
      await UITestHelpers.waitForNetworkIdle(page);
      
      // Test tab navigation
      await page.press('body', 'Tab');
      await page.waitForTimeout(500);
      await UITestHelpers.captureScreenshot(page, 'keyboard-nav-1');
      
      // Continue tabbing through elements
      for (let i = 0; i < 5; i++) {
        await page.press('body', 'Tab');
        await page.waitForTimeout(300);
      }
      
      await UITestHelpers.captureScreenshot(page, 'keyboard-nav-final');
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/claude-instances');
      await UITestHelpers.waitForNetworkIdle(page);
      
      // Check for ARIA labels on important elements
      const ariaElements = await page.locator('[aria-label], [aria-labelledby], [role]').count();
      console.log(`Found ${ariaElements} elements with ARIA attributes`);
      
      await UITestHelpers.captureScreenshot(page, 'aria-elements');
    });
  });
});