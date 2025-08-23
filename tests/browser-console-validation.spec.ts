import { test, expect, ConsoleMessage } from '@playwright/test';

/**
 * Browser Console Error Detection Suite
 * Validates no JavaScript errors appear in browser console
 */

// No webServer config needed - we'll connect to already running server
test.use({
  baseURL: 'http://localhost:3000'
});

test.describe('Browser Console Validation', () => {
  let consoleErrors: ConsoleMessage[] = [];
  let consoleWarnings: ConsoleMessage[] = [];
  
  test.beforeEach(async ({ page }) => {
    // Reset collections
    consoleErrors = [];
    consoleWarnings = [];
    
    // Capture all console messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg);
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg);
      }
    });
    
    // Capture uncaught exceptions
    page.on('pageerror', (error) => {
      console.error('Page error:', error.message);
    });
  });
  
  test('should load without console errors', async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:3000');
    
    // Wait for app to stabilize
    await page.waitForTimeout(2000);
    
    // Check for any console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors detected:');
      for (const error of consoleErrors) {
        console.log(`  - ${error.text()}`);
      }
    }
    
    // Assert no errors
    expect(consoleErrors).toHaveLength(0);
  });
  
  test('should not have React development warnings', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(1000);
    
    // Filter out expected dev warnings
    const criticalWarnings = consoleWarnings.filter(warning => {
      const text = warning.text();
      return !text.includes('ReactDOM.render') && // Expected in React 18
             !text.includes('DevTools') &&
             !text.includes('Source map');
    });
    
    if (criticalWarnings.length > 0) {
      console.log('Critical warnings detected:');
      for (const warning of criticalWarnings) {
        console.log(`  - ${warning.text()}`);
      }
    }
    
    expect(criticalWarnings).toHaveLength(0);
  });
  
  test('should handle SimpleLauncher navigation without errors', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Click on Simple Launcher navigation
    await page.click('text=Simple Launcher');
    
    // Wait for component to load
    await page.waitForSelector('.simple-launcher-container', { timeout: 5000 });
    
    // Verify no new console errors
    expect(consoleErrors).toHaveLength(0);
  });
  
  test('should handle API calls without errors', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('text=Simple Launcher');
    
    // Wait for status check
    await page.waitForTimeout(1000);
    
    // Check for fetch errors
    const fetchErrors = consoleErrors.filter(error => 
      error.text().includes('fetch') || 
      error.text().includes('Failed to fetch') ||
      error.text().includes('NetworkError')
    );
    
    expect(fetchErrors).toHaveLength(0);
  });
  
  test('should not have undefined component errors', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Check for common React errors
    const componentErrors = consoleErrors.filter(error => {
      const text = error.text();
      return text.includes('Cannot read properties of undefined') ||
             text.includes('Cannot read property') ||
             text.includes('is not a function') ||
             text.includes('is not defined');
    });
    
    expect(componentErrors).toHaveLength(0);
  });
  
  test('should load all JavaScript bundles successfully', async ({ page }) => {
    const failedRequests: string[] = [];
    
    page.on('requestfailed', request => {
      if (request.url().includes('.js') || request.url().includes('.jsx')) {
        failedRequests.push(request.url());
      }
    });
    
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    
    if (failedRequests.length > 0) {
      console.log('Failed to load JavaScript files:');
      failedRequests.forEach(url => console.log(`  - ${url}`));
    }
    
    expect(failedRequests).toHaveLength(0);
  });
  
  test('should not have module resolution errors', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    const moduleErrors = consoleErrors.filter(error => {
      const text = error.text();
      return text.includes('Module not found') ||
             text.includes('Cannot resolve') ||
             text.includes('Failed to resolve import');
    });
    
    expect(moduleErrors).toHaveLength(0);
  });
  
  test('should handle state updates without errors', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('text=Simple Launcher');
    
    // Trigger state updates by interacting with the component
    const launchButton = page.locator('button:has-text("Launch")');
    if (await launchButton.isVisible()) {
      await launchButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Check for React state update errors
    const stateErrors = consoleErrors.filter(error => {
      const text = error.text();
      return text.includes('setState') ||
             text.includes('Cannot update') ||
             text.includes('memory leak');
    });
    
    expect(stateErrors).toHaveLength(0);
  });
  
  test('should not have CORS errors', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('text=Simple Launcher');
    await page.waitForTimeout(2000);
    
    const corsErrors = consoleErrors.filter(error => {
      const text = error.text();
      return text.includes('CORS') ||
             text.includes('Cross-Origin') ||
             text.includes('blocked by CORS policy');
    });
    
    if (corsErrors.length > 0) {
      console.log('CORS errors detected - API server may need CORS headers');
    }
    
    expect(corsErrors).toHaveLength(0);
  });
  
  test('should track all console output for debugging', async ({ page }) => {
    const allMessages: { type: string; text: string }[] = [];
    
    page.on('console', msg => {
      allMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });
    
    await page.goto('http://localhost:3000');
    await page.click('text=Simple Launcher');
    await page.waitForTimeout(3000);
    
    // Log all console output for debugging
    console.log('\n=== Complete Console Output ===');
    allMessages.forEach(msg => {
      console.log(`[${msg.type.toUpperCase()}] ${msg.text}`);
    });
    console.log('=== End Console Output ===\n');
    
    // This test always passes but provides diagnostic information
    expect(true).toBe(true);
  });
});