const { test, expect } = require('@playwright/test');

test.describe('Agents Page 500 Error Debug', () => {
  let consoleLogs = [];
  let pageErrors = [];

  test('Capture 500 error details from agents page', async ({ page }) => {
    // Capture console logs
    page.on('console', (msg) => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      });
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      pageErrors.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });

    console.log('Testing http://localhost:5173/agents...');

    try {
      // Navigate to the agents page - expect it to fail
      const response = await page.goto('http://localhost:5173/agents', {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });

      console.log('Response status:', response.status());
      console.log('Response status text:', response.statusText());

      // Take screenshot of error page
      await page.screenshot({
        path: '/workspaces/agent-feed/tests/playwright/agents-500-error.png',
        fullPage: true
      });

      // Get page content to see Next.js error details
      const pageContent = await page.content();

      // Save page content for analysis
      require('fs').writeFileSync(
        '/workspaces/agent-feed/tests/playwright/agents-error-content.html',
        pageContent
      );

      // Try to extract error message from page
      const errorElement = await page.locator('pre, code, .error, [class*="error"]').first();
      let errorText = '';
      try {
        errorText = await errorElement.textContent();
      } catch (e) {
        // No specific error element found
      }

      console.log('\n=== ERROR ANALYSIS ===');
      console.log('Page errors count:', pageErrors.length);
      console.log('Console logs count:', consoleLogs.length);
      console.log('Page error text:', errorText.substring(0, 500));

      if (pageErrors.length > 0) {
        console.log('\n=== PAGE ERRORS ===');
        pageErrors.forEach((error, index) => {
          console.log(`Error ${index + 1}:`, error.message);
          if (error.stack) {
            console.log('Stack:', error.stack.substring(0, 300));
          }
        });
      }

      if (consoleLogs.length > 0) {
        console.log('\n=== CONSOLE LOGS ===');
        consoleLogs.forEach((log) => {
          console.log(`${log.type}: ${log.text}`);
        });
      }

    } catch (navigationError) {
      console.log('Navigation failed:', navigationError.message);

      // Still try to take screenshot
      try {
        await page.screenshot({
          path: '/workspaces/agent-feed/tests/playwright/agents-navigation-error.png',
          fullPage: true
        });
      } catch (screenshotError) {
        console.log('Could not take screenshot:', screenshotError.message);
      }
    }

    console.log('=======================\n');
  });

  test('Test API endpoint directly via browser', async ({ page }) => {
    console.log('Testing API endpoint http://localhost:5173/api/agents...');

    try {
      const response = await page.goto('http://localhost:5173/api/agents');
      console.log('API endpoint status:', response.status());

      if (response.status() === 200) {
        const content = await page.content();
        console.log('API response preview:', content.substring(0, 200));
      }
    } catch (error) {
      console.log('API test failed:', error.message);
    }
  });
});