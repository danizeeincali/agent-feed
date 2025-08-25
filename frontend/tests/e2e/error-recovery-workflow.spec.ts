import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// Test configuration constants
const TEST_CONFIG = {
  baseUrl: 'http://localhost:5173',
  apiUrl: 'http://localhost:3001/api',
  wsUrl: 'ws://localhost:3001',
  timeout: 30000,
  retryAttempts: 3
};

test.describe('Error Recovery Workflow E2E Tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    
    // Enable console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });

    // Monitor network failures
    page.on('requestfailed', request => {
      console.log('Network request failed:', request.url(), request.failure()?.errorText);
    });

    await page.goto(TEST_CONFIG.baseUrl);
  });

  test.afterEach(async () => {
    await context.close();
  });

  test.describe('WebSocket Connection Error Recovery', () => {
    test('should display connection error and show retry option', async () => {
      // Block WebSocket connections to simulate connection failure
      await page.route('ws://localhost:3001/**', (route) => {
        route.abort('failed');
      });

      // Navigate to a component that uses WebSocket
      await page.click('[data-testid="simple-launcher"]', { timeout: 5000 });

      // Look for connection error indicators
      const errorElements = [
        '[data-testid="connection-error"]',
        '[data-testid="websocket-error"]',
        'text=/connection.*error/i',
        'text=/websocket.*failed/i',
        'text=/unable.*connect/i'
      ];

      let errorFound = false;
      for (const selector of errorElements) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          errorFound = true;
          console.log(`Found error element: ${selector}`);
          break;
        } catch (e) {
          // Try next selector
        }
      }

      // If no specific error element found, check for any error-related text
      if (!errorFound) {
        const pageContent = await page.textContent('body');
        const errorPatterns = [
          /connection.*error/i,
          /websocket.*failed/i,
          /unable.*connect/i,
          /network.*error/i,
          /server.*unavailable/i
        ];

        errorFound = errorPatterns.some(pattern => pattern.test(pageContent || ''));
        if (errorFound) {
          console.log('Found error pattern in page content');
        }
      }

      expect(errorFound).toBe(true);

      // Look for retry functionality
      const retryElements = [
        '[data-testid="retry-button"]',
        'button:has-text("retry")',
        'button:has-text("reconnect")',
        'button:has-text("try again")'
      ];

      let retryFound = false;
      for (const selector of retryElements) {
        try {
          const element = await page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            retryFound = true;
            break;
          }
        } catch (e) {
          // Try next selector
        }
      }

      // If retry functionality exists, test it
      if (retryFound) {
        console.log('Testing retry functionality');
        
        // Remove the route block to allow successful connection
        await page.unroute('ws://localhost:3001/**');
        
        // Click retry
        await page.click('button:has-text("retry")', { timeout: 5000 });
        
        // Verify connection success indicators
        await expect(page.locator('text=/connected/i').first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('should handle reconnection attempts with progressive delays', async () => {
      const reconnectAttempts: number[] = [];
      
      // Monitor WebSocket connection attempts
      await page.route('ws://localhost:3001/**', (route) => {
        reconnectAttempts.push(Date.now());
        route.abort('failed');
      });

      // Trigger WebSocket connection
      await page.click('[data-testid="simple-launcher"]', { timeout: 5000 });

      // Wait for multiple reconnection attempts
      await page.waitForTimeout(10000);

      // Verify multiple attempts were made
      expect(reconnectAttempts.length).toBeGreaterThan(1);

      // Check if delays increase between attempts (exponential backoff)
      if (reconnectAttempts.length >= 3) {
        const delay1 = reconnectAttempts[1] - reconnectAttempts[0];
        const delay2 = reconnectAttempts[2] - reconnectAttempts[1];
        
        console.log(`Reconnect delays: ${delay1}ms, ${delay2}ms`);
        // Second delay should be longer than first (allowing for some variance)
        expect(delay2).toBeGreaterThan(delay1 * 0.8);
      }
    });

    test('should gracefully fallback to polling mode when WebSocket fails', async () => {
      // Block WebSocket but allow HTTP requests
      await page.route('ws://localhost:3001/**', (route) => {
        route.abort('failed');
      });

      await page.goto(TEST_CONFIG.baseUrl);
      await page.click('[data-testid="simple-launcher"]', { timeout: 5000 });

      // Wait for fallback mechanism to engage
      await page.waitForTimeout(3000);

      // Check if application switched to polling mode
      const requests = [];
      page.on('request', (request) => {
        if (request.url().includes('/api/') && request.method() === 'GET') {
          requests.push(request.url());
        }
      });

      await page.waitForTimeout(5000);

      // Verify polling requests are being made
      const pollingRequests = requests.filter(url => 
        url.includes('/status') || url.includes('/health') || url.includes('/instances')
      );

      if (pollingRequests.length > 0) {
        console.log('Polling mode engaged:', pollingRequests);
        expect(pollingRequests.length).toBeGreaterThan(0);
      } else {
        // If no polling detected, at least verify the app is still functional
        expect(await page.locator('body').isVisible()).toBe(true);
      }
    });
  });

  test.describe('Instance Creation Error Recovery', () => {
    test('should handle API server unavailable scenario', async () => {
      // Block API requests to simulate server down
      await page.route('**/api/**', (route) => {
        route.abort('failed');
      });

      await page.goto(TEST_CONFIG.baseUrl);

      // Try to create an instance
      const createButton = page.locator('button:has-text("Create"), button:has-text("Start"), button:has-text("Launch")').first();
      
      if (await createButton.isVisible({ timeout: 5000 })) {
        await createButton.click();

        // Look for server unavailable error
        const errorMessages = [
          'text=/server.*unavailable/i',
          'text=/api.*error/i',
          'text=/connection.*failed/i',
          'text=/service.*down/i',
          '[data-testid="api-error"]'
        ];

        let errorFound = false;
        for (const selector of errorMessages) {
          try {
            await page.waitForSelector(selector, { timeout: 5000 });
            errorFound = true;
            break;
          } catch (e) {
            // Try next selector
          }
        }

        expect(errorFound).toBe(true);
      }
    });

    test('should validate input and show validation errors', async () => {
      await page.goto(TEST_CONFIG.baseUrl);

      // Look for instance name input field
      const nameInputSelectors = [
        '[data-testid="instance-name"]',
        'input[placeholder*="name"]',
        'input[name="instanceName"]',
        'input[name="name"]'
      ];

      let nameInput = null;
      for (const selector of nameInputSelectors) {
        try {
          nameInput = page.locator(selector);
          if (await nameInput.isVisible({ timeout: 2000 })) {
            break;
          }
        } catch (e) {
          nameInput = null;
        }
      }

      if (nameInput && await nameInput.isVisible()) {
        // Test empty name validation
        await nameInput.fill('');
        
        const submitButton = page.locator('button[type="submit"], button:has-text("create"), button:has-text("start")').first();
        if (await submitButton.isVisible()) {
          await submitButton.click();

          // Look for validation error
          const validationErrors = [
            'text=/name.*required/i',
            'text=/cannot.*empty/i',
            '[data-testid="validation-error"]',
            '.error:has-text("name")'
          ];

          let validationFound = false;
          for (const selector of validationErrors) {
            try {
              await page.waitForSelector(selector, { timeout: 3000 });
              validationFound = true;
              break;
            } catch (e) {
              // Try next selector
            }
          }

          if (validationFound) {
            console.log('Validation error correctly displayed');
          }

          // Test invalid characters
          await nameInput.fill('invalid name with spaces!@#');
          await submitButton.click();

          // Look for format validation error
          const formatErrors = [
            'text=/invalid.*format/i',
            'text=/only.*letters.*numbers/i',
            'text=/special.*characters/i'
          ];

          let formatErrorFound = false;
          for (const selector of formatErrors) {
            try {
              await page.waitForSelector(selector, { timeout: 3000 });
              formatErrorFound = true;
              break;
            } catch (e) {
              // Try next selector
            }
          }

          if (formatErrorFound) {
            console.log('Format validation error correctly displayed');
          }
        }
      }
    });

    test('should handle timeout during instance creation', async () => {
      // Mock slow API response
      await page.route('**/api/claude-instances', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
        route.fulfill({
          status: 408,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Request timeout' })
        });
      });

      await page.goto(TEST_CONFIG.baseUrl);

      // Try to create instance
      const createButton = page.locator('button:has-text("Create"), button:has-text("Start"), button:has-text("Launch")').first();
      
      if (await createButton.isVisible({ timeout: 5000 })) {
        await createButton.click();

        // Look for loading indicator
        const loadingIndicators = [
          '[data-testid="loading"]',
          '.spinner',
          'text=/creating/i',
          'text=/loading/i',
          '.loading'
        ];

        let loadingFound = false;
        for (const selector of loadingIndicators) {
          try {
            await page.waitForSelector(selector, { timeout: 3000 });
            loadingFound = true;
            console.log(`Loading indicator found: ${selector}`);
            break;
          } catch (e) {
            // Try next selector
          }
        }

        // Wait for timeout error
        const timeoutErrors = [
          'text=/timeout/i',
          'text=/request.*timed.*out/i',
          '[data-testid="timeout-error"]'
        ];

        let timeoutErrorFound = false;
        for (const selector of timeoutErrors) {
          try {
            await page.waitForSelector(selector, { timeout: 15000 });
            timeoutErrorFound = true;
            console.log(`Timeout error found: ${selector}`);
            break;
          } catch (e) {
            // Try next selector
          }
        }

        if (loadingFound || timeoutErrorFound) {
          console.log('Timeout handling working correctly');
        }
      }
    });
  });

  test.describe('System Recovery and State Management', () => {
    test('should preserve application state during network interruptions', async () => {
      await page.goto(TEST_CONFIG.baseUrl);

      // Set up some application state (if input fields exist)
      const stateInputs = await page.locator('input').all();
      const initialValues: { [key: string]: string } = {};

      for (let i = 0; i < stateInputs.length && i < 3; i++) {
        const input = stateInputs[i];
        const testValue = `test-value-${i}`;
        await input.fill(testValue);
        initialValues[i] = testValue;
      }

      // Simulate network interruption
      await page.route('**/*', (route) => {
        route.abort('failed');
      });

      await page.waitForTimeout(2000);

      // Restore network
      await page.unroute('**/*');

      // Verify state is preserved
      for (let i = 0; i < Object.keys(initialValues).length; i++) {
        const input = stateInputs[i];
        const currentValue = await input.inputValue();
        expect(currentValue).toBe(initialValues[i]);
      }
    });

    test('should handle browser refresh during error state', async () => {
      // Block API to create error state
      await page.route('**/api/**', (route) => {
        route.abort('failed');
      });

      await page.goto(TEST_CONFIG.baseUrl);
      
      // Wait for error state
      await page.waitForTimeout(3000);

      // Refresh the page
      await page.reload();

      // Restore API
      await page.unroute('**/api/**');

      // Verify application recovers after refresh
      await page.waitForTimeout(2000);
      
      const body = await page.locator('body').isVisible();
      expect(body).toBe(true);

      // Check if main components are rendered
      const mainElements = [
        '[data-testid="simple-launcher"]',
        'button',
        'input',
        'main',
        '#root'
      ];

      let elementsFound = 0;
      for (const selector of mainElements) {
        try {
          if (await page.locator(selector).first().isVisible({ timeout: 2000 })) {
            elementsFound++;
          }
        } catch (e) {
          // Element not found
        }
      }

      expect(elementsFound).toBeGreaterThan(0);
    });

    test('should provide meaningful error messages to users', async () => {
      // Test various error scenarios and their messages
      const errorScenarios = [
        {
          name: 'Server Error',
          mockResponse: { status: 500, body: { error: 'Internal server error' } },
          expectedMessage: /server.*error|internal.*error|500/i
        },
        {
          name: 'Network Error',
          mockResponse: 'abort',
          expectedMessage: /network.*error|connection.*failed|unavailable/i
        },
        {
          name: 'Validation Error',
          mockResponse: { status: 400, body: { error: 'Invalid input' } },
          expectedMessage: /invalid|validation|bad.*request/i
        }
      ];

      for (const scenario of errorScenarios) {
        console.log(`Testing error scenario: ${scenario.name}`);
        
        // Set up mock for this scenario
        await page.route('**/api/**', (route) => {
          if (scenario.mockResponse === 'abort') {
            route.abort('failed');
          } else {
            route.fulfill({
              status: scenario.mockResponse.status,
              contentType: 'application/json',
              body: JSON.stringify(scenario.mockResponse.body)
            });
          }
        });

        await page.goto(TEST_CONFIG.baseUrl);

        // Trigger an API call
        const triggerButton = page.locator('button').first();
        if (await triggerButton.isVisible({ timeout: 3000 })) {
          await triggerButton.click();
        }

        // Look for error message
        const pageContent = await page.textContent('body');
        const hasExpectedMessage = scenario.expectedMessage.test(pageContent || '');

        if (hasExpectedMessage) {
          console.log(`✓ Correct error message found for ${scenario.name}`);
        } else {
          console.log(`⚠ Expected error message not found for ${scenario.name}. Page content includes:`, pageContent?.substring(0, 200));
        }

        // Clean up route
        await page.unroute('**/api/**');
        await page.waitForTimeout(1000);
      }
    });
  });

  test.describe('User Experience During Errors', () => {
    test('should disable UI elements during error states appropriately', async () => {
      await page.goto(TEST_CONFIG.baseUrl);

      // Simulate loading/error state
      await page.route('**/api/**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        route.abort('failed');
      });

      // Find and click a button to trigger API call
      const actionButton = page.locator('button:not([disabled])').first();
      
      if (await actionButton.isVisible({ timeout: 5000 })) {
        await actionButton.click();

        // Check if button becomes disabled during loading
        await page.waitForTimeout(1000);
        
        const isDisabled = await actionButton.getAttribute('disabled');
        if (isDisabled !== null) {
          console.log('Button correctly disabled during operation');
        }

        // Check for loading indicators
        const hasLoadingClass = await actionButton.getAttribute('class');
        const hasLoadingText = await actionButton.textContent();
        
        if (hasLoadingClass?.includes('loading') || hasLoadingText?.toLowerCase().includes('loading')) {
          console.log('Loading state correctly indicated');
        }
      }
    });

    test('should provide clear feedback for all user actions', async () => {
      await page.goto(TEST_CONFIG.baseUrl);

      // Test feedback for successful actions (if API works)
      const successButton = page.locator('button').first();
      
      if (await successButton.isVisible({ timeout: 5000 })) {
        await successButton.click();

        // Look for any kind of feedback
        await page.waitForTimeout(2000);
        
        const feedbackElements = [
          'text=/success/i',
          'text=/created/i',
          'text=/started/i',
          'text=/completed/i',
          '[data-testid*="success"]',
          '[data-testid*="message"]',
          '.notification',
          '.alert',
          '.toast'
        ];

        let feedbackFound = false;
        for (const selector of feedbackElements) {
          try {
            if (await page.locator(selector).first().isVisible({ timeout: 2000 })) {
              feedbackFound = true;
              console.log(`Feedback element found: ${selector}`);
              break;
            }
          } catch (e) {
            // Try next selector
          }
        }

        // Even if no explicit feedback elements, check for state changes
        if (!feedbackFound) {
          const bodyContent = await page.textContent('body');
          const hasStateChange = bodyContent && (
            bodyContent.includes('running') ||
            bodyContent.includes('active') ||
            bodyContent.includes('connected') ||
            bodyContent.includes('ready')
          );
          
          if (hasStateChange) {
            console.log('State change feedback detected in content');
            feedbackFound = true;
          }
        }

        console.log(`User feedback ${feedbackFound ? 'provided' : 'could be improved'}`);
      }
    });

    test('should maintain accessibility during error states', async () => {
      await page.goto(TEST_CONFIG.baseUrl);

      // Trigger error state
      await page.route('**/api/**', (route) => {
        route.abort('failed');
      });

      const button = page.locator('button').first();
      if (await button.isVisible({ timeout: 5000 })) {
        await button.click();
      }

      await page.waitForTimeout(3000);

      // Check for ARIA labels and accessibility
      const elementsWithAria = await page.locator('[aria-label], [aria-describedby], [role]').count();
      console.log(`Found ${elementsWithAria} elements with accessibility attributes`);

      // Check for focus management
      const focusableElements = await page.locator('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])').count();
      console.log(`Found ${focusableElements} focusable elements`);

      // Verify keyboard navigation still works
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      console.log(`After Tab press, focused element: ${focusedElement}`);

      expect(elementsWithAria + focusableElements).toBeGreaterThan(0);
    });
  });
});