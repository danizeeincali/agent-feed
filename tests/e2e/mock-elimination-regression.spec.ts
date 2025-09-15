import { test, expect, Page } from '@playwright/test';

/**
 * Mock Elimination Regression Test Suite
 *
 * MISSION: Ensure NO mock responses are used anywhere in the application
 *
 * This test suite specifically hunts for:
 * 1. Mock response patterns in UI
 * 2. setTimeout delays indicating fake responses
 * 3. Hardcoded mock data
 * 4. Test doubles still active in production code
 */

test.describe('Mock Elimination Regression Tests', () => {
  const FRONTEND_URL = 'http://localhost:5173';

  // Comprehensive list of mock patterns to detect and eliminate
  const MOCK_PATTERNS = [
    // Direct mock indicators
    'I received your message',
    'available soon',
    'This is a mock response',
    'mock response',
    'simulated response',
    'fake response',
    'test response',

    // Timing indicators
    'setTimeout',
    'mock_delay',
    'artificial delay',
    'simulated delay',

    // Development artifacts
    'TODO: implement',
    'placeholder response',
    'dummy data',
    'mock data',

    // Common test patterns
    'jest.mock',
    'vi.mock',
    'mockReturnValue',
    'mockImplementation',

    // Generic placeholders
    'lorem ipsum',
    'sample text',
    'example response'
  ];

  const MOCK_ENDPOINTS = [
    '/mock',
    '/fake-',
    '/test-delay',
    '/dummy',
    '/placeholder',
    '/sample-data'
  ];

  let mockDetected = false;
  const detectedMocks: string[] = [];

  test.beforeEach(async ({ page }) => {
    mockDetected = false;
    detectedMocks.length = 0;

    // Comprehensive console monitoring
    page.on('console', msg => {
      const text = msg.text();
      for (const pattern of MOCK_PATTERNS) {
        if (text.toLowerCase().includes(pattern.toLowerCase())) {
          mockDetected = true;
          detectedMocks.push(`CONSOLE: ${text}`);
          console.error(`🚨 MOCK DETECTED in console: ${text}`);
        }
      }
    });

    // Network request monitoring
    page.on('request', request => {
      const url = request.url();
      for (const endpoint of MOCK_ENDPOINTS) {
        if (url.includes(endpoint)) {
          mockDetected = true;
          detectedMocks.push(`NETWORK: ${url}`);
          console.error(`🚨 MOCK ENDPOINT DETECTED: ${url}`);
        }
      }
    });

    // Response content monitoring
    page.on('response', async response => {
      try {
        if (response.url().includes('/api/') && response.status() === 200) {
          const contentType = response.headers()['content-type'];
          if (contentType && contentType.includes('application/json')) {
            const responseBody = await response.text();
            for (const pattern of MOCK_PATTERNS) {
              if (responseBody.toLowerCase().includes(pattern.toLowerCase())) {
                mockDetected = true;
                detectedMocks.push(`API RESPONSE: ${response.url()} - ${pattern}`);
                console.error(`🚨 MOCK PATTERN in API response: ${pattern}`);
              }
            }
          }
        }
      } catch (error) {
        // Ignore response parsing errors
      }
    });
  });

  test.afterEach(async () => {
    if (mockDetected) {
      console.error('🚨 MOCK ELIMINATION REGRESSION FAILURE:');
      detectedMocks.forEach(mock => console.error(`   - ${mock}`));
      expect(mockDetected).toBe(false);
    }
  });

  test('Comprehensive Mock Pattern Detection - All UI Components', async ({ page }) => {
    console.log('🚀 Starting Comprehensive Mock Pattern Detection');

    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');

    // Test 1: Scan initial page content
    let pageContent = await page.content();
    for (const pattern of MOCK_PATTERNS) {
      if (pageContent.toLowerCase().includes(pattern.toLowerCase())) {
        detectedMocks.push(`PAGE CONTENT: ${pattern}`);
        mockDetected = true;
      }
    }

    // Test 2: Navigate through all major tabs/sections
    const tabs = [
      'Dashboard',
      'Agents',
      'Avi DM',
      'Dynamic Pages',
      'Settings'
    ];

    for (const tabName of tabs) {
      const tab = page.locator(`text="${tabName}", [data-tab="${tabName.toLowerCase()}"]`);
      if (await tab.count() > 0 && await tab.first().isVisible()) {
        console.log(`Testing tab: ${tabName}`);
        await tab.first().click();
        await page.waitForTimeout(2000);

        pageContent = await page.content();
        for (const pattern of MOCK_PATTERNS) {
          if (pageContent.toLowerCase().includes(pattern.toLowerCase())) {
            detectedMocks.push(`TAB ${tabName}: ${pattern}`);
            mockDetected = true;
          }
        }
      }
    }

    expect(mockDetected).toBe(false);
    console.log('✅ No mock patterns detected in UI components');
  });

  test('Interactive Message Testing - Various Input Scenarios', async ({ page }) => {
    console.log('🚀 Starting Interactive Message Testing');

    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');

    // Navigate to Avi DM
    const aviDmTab = page.locator('text="Avi DM"');
    if (await aviDmTab.count() > 0) {
      await aviDmTab.click();
      await page.waitForTimeout(3000);

      const messageInput = page.locator('textarea, input[type="text"]');
      if (await messageInput.count() > 0) {

        // Test messages that commonly trigger mock responses
        const testMessages = [
          'hello',
          'hi there',
          'what can you do?',
          'help me',
          'write code',
          'debug this',
          'explain quantum physics',
          'create a function to sort arrays',
          'how do I use React hooks?',
          'what is the weather today?'
        ];

        for (const message of testMessages) {
          console.log(`Testing message: "${message}"`);

          // Clear and send message
          await messageInput.first().fill(message);
          await messageInput.first().press('Enter');

          // Wait for response
          await page.waitForTimeout(5000);

          // Check for mock patterns in response
          const messages = page.locator('.message, .chat-message, [data-testid="message"]');
          const messageCount = await messages.count();

          if (messageCount > 0) {
            for (let i = 0; i < messageCount; i++) {
              const messageText = await messages.nth(i).textContent();
              if (messageText) {
                for (const pattern of MOCK_PATTERNS) {
                  if (messageText.toLowerCase().includes(pattern.toLowerCase())) {
                    detectedMocks.push(`MESSAGE RESPONSE: "${message}" -> ${pattern}`);
                    mockDetected = true;
                  }
                }
              }
            }
          }
        }
      }
    }

    expect(mockDetected).toBe(false);
    console.log('✅ No mock patterns detected in message responses');
  });

  test('JavaScript Code Analysis - Runtime Mock Detection', async ({ page }) => {
    console.log('🚀 Starting JavaScript Runtime Mock Detection');

    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');

    // Inject detection script to scan for mock patterns in JavaScript
    const mockDetectionResults = await page.evaluate((mockPatterns) => {
      const results: string[] = [];

      // Check global variables
      const globalKeys = Object.keys(window);
      globalKeys.forEach(key => {
        if (key.toLowerCase().includes('mock') || key.toLowerCase().includes('fake')) {
          results.push(`GLOBAL VARIABLE: ${key}`);
        }
      });

      // Check localStorage and sessionStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            mockPatterns.forEach((pattern: string) => {
              if (value.toLowerCase().includes(pattern.toLowerCase())) {
                results.push(`LOCALSTORAGE: ${key} -> ${pattern}`);
              }
            });
          }
        }
      }

      // Check all script tags
      const scripts = document.querySelectorAll('script');
      scripts.forEach((script, index) => {
        if (script.innerHTML) {
          mockPatterns.forEach((pattern: string) => {
            if (script.innerHTML.toLowerCase().includes(pattern.toLowerCase())) {
              results.push(`SCRIPT TAG ${index}: ${pattern}`);
            }
          });
        }
      });

      return results;
    }, MOCK_PATTERNS);

    mockDetectionResults.forEach(result => {
      detectedMocks.push(result);
      mockDetected = true;
    });

    expect(mockDetected).toBe(false);
    console.log('✅ No mock patterns detected in JavaScript runtime');
  });

  test('API Response Content Analysis', async ({ page }) => {
    console.log('🚀 Starting API Response Content Analysis');

    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');

    // Track all API responses
    const apiResponses: { url: string; content: string }[] = [];

    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        try {
          const content = await response.text();
          apiResponses.push({
            url: response.url(),
            content: content
          });
        } catch (error) {
          // Ignore parsing errors
        }
      }
    });

    // Navigate to Avi DM and trigger API calls
    const aviDmTab = page.locator('text="Avi DM"');
    if (await aviDmTab.count() > 0) {
      await aviDmTab.click();
      await page.waitForTimeout(3000);

      // Send a message to trigger API calls
      const messageInput = page.locator('textarea, input');
      if (await messageInput.count() > 0) {
        await messageInput.first().fill('api test message');
        await messageInput.first().press('Enter');
        await page.waitForTimeout(5000);
      }
    }

    // Analyze all collected API responses
    apiResponses.forEach(apiResponse => {
      MOCK_PATTERNS.forEach(pattern => {
        if (apiResponse.content.toLowerCase().includes(pattern.toLowerCase())) {
          detectedMocks.push(`API CONTENT ${apiResponse.url}: ${pattern}`);
          mockDetected = true;
        }
      });
    });

    expect(mockDetected).toBe(false);
    console.log(`✅ Analyzed ${apiResponses.length} API responses - no mock patterns detected`);
  });

  test('Error Handling Mock Detection', async ({ page }) => {
    console.log('🚀 Starting Error Handling Mock Detection');

    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');

    // Test error scenarios to ensure they don't use mock responses
    const aviDmTab = page.locator('text="Avi DM"');
    if (await aviDmTab.count() > 0) {
      await aviDmTab.click();
      await page.waitForTimeout(2000);

      // Simulate network error
      await page.route('**/api/**', route => {
        route.abort('failed');
      });

      const messageInput = page.locator('textarea, input');
      if (await messageInput.count() > 0) {
        await messageInput.first().fill('error test message');
        await messageInput.first().press('Enter');
        await page.waitForTimeout(3000);

        // Check error messages for mock patterns
        const errorElements = page.locator(
          '.error, [data-error], .alert-error'
        ).or(page.locator('text="Error"')).or(page.locator('text="Failed"'));

        const errorCount = await errorElements.count();
        for (let i = 0; i < errorCount; i++) {
          const errorText = await errorElements.nth(i).textContent();
          if (errorText) {
            MOCK_PATTERNS.forEach(pattern => {
              if (errorText.toLowerCase().includes(pattern.toLowerCase())) {
                detectedMocks.push(`ERROR MESSAGE: ${pattern}`);
                mockDetected = true;
              }
            });
          }
        }
      }

      // Clear route interception
      await page.unroute('**/api/**');
    }

    expect(mockDetected).toBe(false);
    console.log('✅ No mock patterns detected in error handling');
  });

  test('Component State Mock Detection', async ({ page }) => {
    console.log('🚀 Starting Component State Mock Detection');

    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');

    // Check React DevTools data if available
    const componentStateResults = await page.evaluate(() => {
      const results: string[] = [];

      // Check for common React state mock patterns
      const elements = document.querySelectorAll('*');
      elements.forEach((element, index) => {
        // Check data attributes that might contain mock data
        Array.from(element.attributes).forEach(attr => {
          if (attr.name.includes('mock') || attr.value.includes('mock')) {
            results.push(`ELEMENT ${index} ATTRIBUTE: ${attr.name}=${attr.value}`);
          }
        });
      });

      return results;
    });

    componentStateResults.forEach(result => {
      detectedMocks.push(result);
      mockDetected = true;
    });

    expect(mockDetected).toBe(false);
    console.log('✅ No mock patterns detected in component state');
  });

  test('Performance Timing Mock Detection', async ({ page }) => {
    console.log('🚀 Starting Performance Timing Mock Detection');

    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');

    // Navigate to Avi DM
    const aviDmTab = page.locator('text="Avi DM"');
    if (await aviDmTab.count() > 0) {
      await aviDmTab.click();

      const messageInput = page.locator('textarea, input');
      if (await messageInput.count() > 0) {

        // Send multiple messages and measure response times
        const responseTimes: number[] = [];

        for (let i = 0; i < 3; i++) {
          const startTime = Date.now();

          await messageInput.first().fill(`timing test ${i + 1}`);
          await messageInput.first().press('Enter');

          // Wait for response
          const responseReceived = await page.waitForSelector(
            '.message:not(:has-text("timing test"))',
            { timeout: 15000 }
          ).catch(() => false);

          if (responseReceived) {
            const responseTime = Date.now() - startTime;
            responseTimes.push(responseTime);
            console.log(`Response time ${i + 1}: ${responseTime}ms`);
          }

          await page.waitForTimeout(2000);
        }

        // Analyze response times for mock patterns
        // Mock responses typically have very consistent timing (e.g., always ~2000ms)
        if (responseTimes.length >= 2) {
          const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
          const variance = responseTimes.reduce((acc, time) => acc + Math.pow(time - avgTime, 2), 0) / responseTimes.length;

          // If all responses are suspiciously similar (low variance), might indicate mock
          if (variance < 100 && avgTime > 1500 && avgTime < 3000) {
            detectedMocks.push(`SUSPICIOUS TIMING: Avg ${avgTime}ms, Variance ${variance}`);
            console.warn(`⚠️  Suspicious response timing pattern detected`);
            // Note: This is a warning, not a failure, as real responses could theoretically have consistent timing
          }

          console.log(`Response times: ${responseTimes.join(', ')}ms (avg: ${avgTime.toFixed(0)}ms, variance: ${variance.toFixed(2)})`);
        }
      }
    }

    // Don't fail on timing patterns alone, just report
    console.log('✅ Performance timing analysis completed');
  });
});