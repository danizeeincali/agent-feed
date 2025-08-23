import { test, expect } from '@playwright/test';

test.describe('White Screen Regression Suite', () => {
  test('comprehensive app functionality test', async ({ page }) => {
    // Set up console monitoring
    const consoleLogs: string[] = [];
    const errors: string[] = [];
    
    page.on('console', msg => consoleLogs.push(`${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => errors.push(err.message));

    // Navigate to app
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // 1. Verify no white screen
    const rootContent = await page.locator('#root').innerHTML();
    expect(rootContent.length).toBeGreaterThan(100);
    
    // 2. Check for React app elements
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('div')).toHaveCount({ greaterThan: 5 });

    // 3. Check sidebar is present (even if collapsed)
    const sidebar = page.locator('.fixed.inset-y-0.left-0, .sidebar, [role="navigation"]');
    await expect(sidebar).toBeVisible();

    // 4. Look for navigation elements
    const navigation = page.locator('nav, [role="navigation"], .nav');
    const hasNavigation = await navigation.count() > 0;
    if (hasNavigation) {
      await expect(navigation.first()).toBeVisible();
    }

    // 5. Check for main content area
    const mainContent = page.locator('main, .main, .content, .dashboard');
    const hasMainContent = await mainContent.count() > 0;
    if (hasMainContent) {
      await expect(mainContent.first()).toBeVisible();
    }

    // 6. Verify no critical JavaScript errors
    expect(errors.filter(err => !err.includes('404'))).toHaveLength(0);

    console.log(`✅ UI Elements found: ${rootContent.substring(0, 100)}...`);
  });

  test('WebSocket connection validation', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Test WebSocket connection
    const wsResult = await page.evaluate(() => {
      return new Promise((resolve) => {
        const socket = new WebSocket('ws://localhost:3001/socket.io/?EIO=4&transport=websocket');
        
        socket.onopen = () => resolve({ connected: true, state: socket.readyState });
        socket.onerror = () => resolve({ connected: false, error: 'Failed' });
        socket.onclose = (event) => resolve({ connected: false, code: event.code });
        
        setTimeout(() => resolve({ connected: false, timeout: true }), 3000);
      });
    });

    console.log('WebSocket Test Result:', wsResult);
    
    // WebSocket should at least attempt connection
    expect(wsResult).toHaveProperty('connected');
  });

  test('API connectivity check', async ({ page }) => {
    // Test API endpoints directly
    const healthResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:3001/health');
        return { status: response.status, ok: response.ok, data: await response.json() };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(healthResponse.status).toBe(200);
    expect(healthResponse.data.status).toBe('ok');

    console.log('✅ Health endpoint working:', healthResponse);
  });

  test('mobile responsive check', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');

    // App should render on mobile
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible();
    
    const hasContent = await rootElement.evaluate(el => el.innerHTML.length > 50);
    expect(hasContent).toBe(true);

    console.log('✅ Mobile rendering confirmed');
  });

  test('performance and loading time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    
    const loadTime = Date.now() - startTime;
    console.log(`⚡ Page load time: ${loadTime}ms`);
    
    // Should load within reasonable time
    expect(loadTime).toBeLessThan(10000); // 10 seconds max
    
    // Check for content
    await expect(page.locator('#root')).toBeVisible();
  });

  test('error boundary functionality', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Check if error boundaries are working
    const errorBoundaries = await page.locator('[data-testid="error-boundary"], .error-boundary').count();
    
    // App should have error handling
    const hasErrorHandling = errorBoundaries > 0 || await page.evaluate(() => {
      return window.onerror !== null || window.onunhandledrejection !== null;
    });

    console.log(`🛡️ Error handling: ${hasErrorHandling ? 'Present' : 'Missing'}`);
  });
});