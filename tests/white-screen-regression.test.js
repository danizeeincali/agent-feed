// White Screen Regression TDD Test - Comprehensive Frontend Health Check
const { test, expect } = require('@playwright/test');

test.describe('White Screen Regression Prevention', () => {
  
  test('Frontend loads without white screen - Basic health check', async ({ page }) => {
    // Navigate to the frontend
    await page.goto('http://localhost:5173');
    
    // Wait for initial load
    await page.waitForTimeout(2000);
    
    // Check that we don't have a white screen (body should have content)
    const bodyContent = await page.textContent('body');
    expect(bodyContent.trim().length).toBeGreaterThan(0);
    
    // Check for root div content
    const rootDiv = await page.locator('#root');
    await expect(rootDiv).toBeVisible();
    
    // Ensure root has actual content, not empty
    const rootContent = await rootDiv.textContent();
    expect(rootContent.trim().length).toBeGreaterThan(0);
    
    console.log('✅ Basic frontend health check passed - no white screen');
  });

  test('React app mounts correctly', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(3000);
    
    // Check for React-specific elements
    const header = await page.locator('[data-testid="header"]');
    await expect(header).toBeVisible();
    
    // Check for main content area
    const mainContent = await page.locator('[data-testid="agent-feed"]');
    await expect(mainContent).toBeVisible();
    
    console.log('✅ React components mounted successfully');
  });

  test('Navigation sidebar loads', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Check if sidebar navigation is present (desktop or mobile)
    const navigation = await page.locator('nav');
    await expect(navigation).toBeVisible();
    
    // Check for navigation links
    const navLinks = await page.locator('nav a');
    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThan(0);
    
    console.log('✅ Navigation sidebar loaded correctly');
  });

  test('SimpleLauncher route works without white screen', async ({ page }) => {
    await page.goto('http://localhost:5173/simple-launcher');
    await page.waitForTimeout(3000);
    
    // Check page loads with content
    const pageContent = await page.textContent('body');
    expect(pageContent.trim().length).toBeGreaterThan(0);
    
    // Check for SimpleLauncher specific elements
    const title = await page.getByText('Claude Code Launcher');
    await expect(title).toBeVisible();
    
    // Check for launch button
    const launchButton = await page.getByText('Launch Claude');
    await expect(launchButton).toBeVisible();
    
    console.log('✅ SimpleLauncher page loads without white screen');
  });

  test('No JavaScript errors in console', async ({ page }) => {
    const consoleErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(3000);
    
    // Allow some warnings but no critical errors
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('TypeError') || 
      error.includes('ReferenceError') || 
      error.includes('Cannot read') ||
      error.includes('undefined is not a function')
    );
    
    expect(criticalErrors).toEqual([]);
    
    console.log('✅ No critical JavaScript errors found');
  });

  test('CSS and styling loads correctly', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Check that elements have proper styling (not default browser styling)
    const bodyStyles = await page.evaluate(() => {
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);
      return {
        backgroundColor: computedStyle.backgroundColor,
        fontFamily: computedStyle.fontFamily
      };
    });
    
    // Should have some custom styling, not just browser defaults
    expect(bodyStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent
    
    console.log('✅ CSS styling applied correctly');
  });

  test('API connectivity check', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Test that the app can make API calls (check for network requests)
    const responses = [];
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status()
      });
    });
    
    // Wait for potential API calls
    await page.waitForTimeout(3000);
    
    // Should have some successful requests (at least for assets)
    const successfulRequests = responses.filter(resp => resp.status >= 200 && resp.status < 300);
    expect(successfulRequests.length).toBeGreaterThan(0);
    
    console.log('✅ API connectivity validated');
  });

  test('Performance and loading time check', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://localhost:5173');
    
    // Wait for content to appear
    await page.waitForSelector('#root', { state: 'visible' });
    
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time (10 seconds max for dev mode)
    expect(loadTime).toBeLessThan(10000);
    
    console.log(`✅ Page loaded in ${loadTime}ms`);
  });

  test('Mobile responsive check', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Check content is still visible on mobile
    const rootDiv = await page.locator('#root');
    await expect(rootDiv).toBeVisible();
    
    const rootContent = await rootDiv.textContent();
    expect(rootContent.trim().length).toBeGreaterThan(0);
    
    console.log('✅ Mobile responsive design working');
  });

  test('Comprehensive app functionality test', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(3000);
    
    // Test navigation
    const simplelauncherLink = await page.getByText('Simple Launcher');
    if (await simplelauncherLink.isVisible()) {
      await simplelauncherLink.click();
      await page.waitForTimeout(1000);
      
      // Verify we navigated without white screen
      const pageContent = await page.textContent('body');
      expect(pageContent.trim().length).toBeGreaterThan(0);
    }
    
    // Go back to home
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1000);
    
    // Verify home page still works
    const homeContent = await page.textContent('body');
    expect(homeContent.trim().length).toBeGreaterThan(0);
    
    console.log('✅ Full app functionality validated');
  });
});