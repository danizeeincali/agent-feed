import { test, expect } from '@playwright/test';

test.describe('White Screen Debug Tests', () => {
  test('diagnose white screen issue', async ({ page }) => {
    // Set up console logging
    const consoleLogs: string[] = [];
    const errors: string[] = [];
    
    page.on('console', msg => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
    });
    
    page.on('pageerror', err => {
      errors.push(err.message);
    });

    // Navigate to the app
    console.log('Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Take a screenshot for visual debugging
    await page.screenshot({ path: 'tests/screenshots/white-screen-debug.png', fullPage: true });

    // Check if root element exists
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible();
    
    // Get the HTML content of root
    const rootContent = await rootElement.innerHTML();
    console.log('Root element content:', rootContent.substring(0, 200));

    // Check for React app rendering
    const reactApp = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        hasContent: root && root.innerHTML.length > 0,
        innerHTML: root ? root.innerHTML.substring(0, 500) : null,
        childCount: root ? root.children.length : 0,
        firstChild: root && root.firstElementChild ? root.firstElementChild.tagName : null
      };
    });

    console.log('React App State:', reactApp);

    // Check for JavaScript errors
    if (errors.length > 0) {
      console.error('JavaScript Errors found:', errors);
    }

    // Check console logs
    console.log('Console logs:', consoleLogs);

    // Check network requests
    const failedRequests: string[] = [];
    page.on('requestfailed', request => {
      failedRequests.push(`${request.url()} - ${request.failure()?.errorText}`);
    });

    // Check for specific components
    const checks = {
      hasRoot: await page.locator('#root').count() > 0,
      hasContent: rootContent.length > 50,
      noErrors: errors.length === 0,
      failedRequests: failedRequests
    };

    console.log('Diagnostic Results:', checks);

    // Assertions
    expect(checks.hasRoot).toBe(true);
    expect(checks.noErrors).toBe(true);
    expect(checks.hasContent).toBe(true);
  });

  test('check API connectivity', async ({ page }) => {
    // Test API endpoints
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/health');
        return {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    console.log('API Health Check:', apiResponse);
  });

  test('check WebSocket connectivity', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Check WebSocket connection
    const wsStatus = await page.evaluate(() => {
      return new Promise((resolve) => {
        const ws = new WebSocket('ws://localhost:3001/ws');
        
        ws.onopen = () => resolve({ connected: true, readyState: ws.readyState });
        ws.onerror = (err) => resolve({ connected: false, error: 'Connection failed' });
        
        setTimeout(() => resolve({ connected: false, error: 'Timeout' }), 5000);
      });
    });

    console.log('WebSocket Status:', wsStatus);
  });
});