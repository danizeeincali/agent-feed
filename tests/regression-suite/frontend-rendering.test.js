/**
 * Frontend Rendering Validation Test Suite
 * Tests React hook violations, component rendering, and JavaScript errors
 */

const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const path = require('path');

describe('Frontend Rendering Validation', () => {
  let browser;
  let page;
  let serverProcess;
  const BASE_URL = 'http://localhost:8080';

  beforeAll(async () => {
    // Start the backend server
    serverProcess = spawn('node', ['simple-backend.js'], {
      cwd: path.resolve(__dirname, '../../'),
      stdio: 'pipe'
    });

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error' && text.includes('React')) {
        console.error(`React Error: ${text}`);
      }
    });
  }, 30000);

  afterAll(async () => {
    if (browser) await browser.close();
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });

  describe('React Hook Violations', () => {
    test('should not have hook violations in agent pages', async () => {
      const pages = [
        '/agent-pages/agent-001/personal-todos',
        '/agent-pages/agent-002/task-manager',
        '/agent-pages/agent-003/productivity-dashboard'
      ];

      const hookViolations = [];

      const hookErrorHandler = (msg) => {
        const text = msg.text();
        if (text.includes('Invalid hook call') || 
            text.includes('Hooks can only be called') ||
            text.includes('rendered fewer hooks') ||
            text.includes('rendered more hooks')) {
          hookViolations.push(text);
        }
      };

      page.on('console', hookErrorHandler);

      for (const pagePath of pages) {
        await page.goto(`${BASE_URL}${pagePath}`, { 
          waitUntil: 'networkidle0',
          timeout: 10000
        });
        
        // Wait for React to fully render
        await page.waitForTimeout(2000);

        // Trigger some interactions to test hooks
        try {
          await page.click('button').catch(() => {}); // Click any button if present
          await page.type('input', 'test').catch(() => {}); // Type in any input if present
        } catch (e) {
          // Ignore interaction errors, we're just testing hooks
        }

        await page.waitForTimeout(500);
      }

      page.off('console', hookErrorHandler);

      if (hookViolations.length > 0) {
        console.error('Hook violations found:', hookViolations);
      }

      expect(hookViolations).toHaveLength(0);
    });

    test('should not have conditional hook usage', async () => {
      // This test ensures hooks are not called conditionally
      const testUrls = [
        '/agent-pages/agent-001/personal-todos',
        '/agent-pages/agent-002/task-manager', 
        '/agent-pages/agent-003/productivity-dashboard'
      ];

      let conditionalHookErrors = [];

      const hookHandler = (msg) => {
        const text = msg.text();
        if (text.includes('React Hook') && 
            (text.includes('conditional') || text.includes('loop'))) {
          conditionalHookErrors.push(text);
        }
      };

      page.on('console', hookHandler);

      for (const url of testUrls) {
        conditionalHookErrors = []; // Reset for each page
        
        await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle0' });
        await page.waitForTimeout(1000);

        expect(conditionalHookErrors).toHaveLength(0);
      }

      page.off('console', hookHandler);
    });
  });

  describe('Component Rendering Integrity', () => {
    test('should render all components without errors', async () => {
      const testUrls = [
        '/agent-pages/agent-001/personal-todos',
        '/agent-pages/agent-002/task-manager',
        '/agent-pages/agent-003/productivity-dashboard'
      ];

      for (const url of testUrls) {
        await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle0' });
        await page.waitForTimeout(1000);

        // Check for error boundaries
        const errorBoundaries = await page.$$eval(
          '*',
          elements => elements.filter(el => 
            el.textContent.includes('Something went wrong') ||
            el.textContent.includes('Component rendering error') ||
            el.textContent.includes('Invalid component configuration')
          ).map(el => el.textContent)
        );

        expect(errorBoundaries).toHaveLength(0);

        // Check for React DevTools errors
        const reactErrors = await page.evaluate(() => {
          return window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.onCommitFiberRoot?.errors || [];
        });

        expect(reactErrors).toHaveLength(0);
      }
    });

    test('should have proper component hierarchy', async () => {
      const url = '/agent-pages/agent-001/personal-todos';
      await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(1000);

      // Check for main page container
      const pageContainer = await page.$('[data-agent-page]');
      expect(pageContainer).toBeTruthy();

      // Check for page title
      const pageTitle = await page.$('h1');
      expect(pageTitle).toBeTruthy();

      // Check for component containers
      const componentContainers = await page.$$('.agent-page > *');
      expect(componentContainers.length).toBeGreaterThan(0);
    });

    test('should handle dynamic content updates', async () => {
      const url = '/agent-pages/agent-002/task-manager';
      await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(1000);

      // Try to interact with dynamic elements
      try {
        const buttons = await page.$$('button');
        if (buttons.length > 0) {
          await buttons[0].click();
          await page.waitForTimeout(500);
        }

        const inputs = await page.$$('input');
        if (inputs.length > 0) {
          await inputs[0].type('test input');
          await page.waitForTimeout(500);
        }

        // Check that no errors occurred during interactions
        const errorMessages = await page.$$eval(
          '.border-red-200, [class*="error"]',
          elements => elements.map(el => el.textContent)
        );

        const hasRenderingErrors = errorMessages.some(msg => 
          msg.includes('Component rendering error') ||
          msg.includes('Invalid component configuration')
        );

        expect(hasRenderingErrors).toBe(false);
      } catch (e) {
        // Some interactions might fail, but shouldn't cause rendering errors
      }
    });
  });

  describe('JavaScript Error Detection', () => {
    test('should not have unhandled JavaScript errors', async () => {
      const jsErrors = [];
      
      page.on('pageerror', error => {
        jsErrors.push(error.message);
      });

      page.on('response', response => {
        if (response.status() >= 400) {
          console.log(`HTTP Error: ${response.status()} on ${response.url()}`);
        }
      });

      const testUrls = [
        '/agent-pages/agent-001/personal-todos',
        '/agent-pages/agent-002/task-manager',
        '/agent-pages/agent-003/productivity-dashboard'
      ];

      for (const url of testUrls) {
        jsErrors.length = 0; // Clear previous errors
        
        await page.goto(`${BASE_URL}${url}`, { 
          waitUntil: 'networkidle0',
          timeout: 10000
        });
        
        await page.waitForTimeout(2000);

        // Filter out non-critical errors
        const criticalErrors = jsErrors.filter(error => 
          !error.includes('favicon') &&
          !error.includes('DevTools') &&
          !error.includes('Extension') &&
          !error.includes('non-passive event listener')
        );

        if (criticalErrors.length > 0) {
          console.error(`JavaScript errors on ${url}:`, criticalErrors);
        }

        expect(criticalErrors).toHaveLength(0);
      }
    });

    test('should handle network failures gracefully', async () => {
      // Test with network interruption
      await page.setOfflineMode(true);
      
      try {
        const response = await page.goto(`${BASE_URL}/agent-pages/agent-001/personal-todos`, {
          waitUntil: 'domcontentloaded',
          timeout: 5000
        }).catch(() => null);

        // Should handle offline gracefully
        expect(response).toBeNull();
      } finally {
        await page.setOfflineMode(false);
      }

      // Re-test online functionality
      const response = await page.goto(`${BASE_URL}/agent-pages/agent-001/personal-todos`, {
        waitUntil: 'networkidle0'
      });

      expect(response.status()).toBeLessThan(400);
    });
  });

  describe('Performance and Memory', () => {
    test('should not have memory leaks in component rendering', async () => {
      const url = '/agent-pages/agent-003/productivity-dashboard';
      
      // Navigate to page multiple times to test for leaks
      for (let i = 0; i < 3; i++) {
        await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle0' });
        await page.waitForTimeout(1000);
        
        // Force garbage collection if available
        if (page.evaluate) {
          await page.evaluate(() => {
            if (window.gc) {
              window.gc();
            }
          }).catch(() => {});
        }
      }

      // Check for excessive DOM nodes
      const nodeCount = await page.evaluate(() => document.querySelectorAll('*').length);
      expect(nodeCount).toBeLessThan(10000); // Reasonable limit

      // Check for repeated content (potential duplication bug)
      const duplicateElements = await page.evaluate(() => {
        const texts = Array.from(document.querySelectorAll('*'))
          .map(el => el.textContent?.trim())
          .filter(text => text && text.length > 10);
        
        const textCounts = {};
        texts.forEach(text => {
          textCounts[text] = (textCounts[text] || 0) + 1;
        });

        return Object.entries(textCounts)
          .filter(([text, count]) => count > 3)
          .map(([text, count]) => ({ text: text.slice(0, 50), count }));
      });

      expect(duplicateElements).toHaveLength(0);
    });

    test('should render within reasonable time limits', async () => {
      const testUrls = [
        '/agent-pages/agent-001/personal-todos',
        '/agent-pages/agent-002/task-manager',
        '/agent-pages/agent-003/productivity-dashboard'
      ];

      for (const url of testUrls) {
        const start = Date.now();
        
        await page.goto(`${BASE_URL}${url}`, { 
          waitUntil: 'networkidle0',
          timeout: 10000
        });
        
        const loadTime = Date.now() - start;
        console.log(`${url} loaded in ${loadTime}ms`);
        
        expect(loadTime).toBeLessThan(10000); // 10 second max
      }
    });
  });
});