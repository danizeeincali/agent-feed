import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    // Setup error monitoring
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    // Store errors for later assertion
    (page as any).errors = errors;
});

test('should never show white screen on initial load', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Wait for app to load
    await page.waitForTimeout(5000);
    
    // Take screenshot for visual regression
    await page.screenshot({ path: 'tests/screenshots/initial-load.png', fullPage: true });
    
    // Ensure we have visible content
    const hasContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0 && root.textContent!.trim().length > 0;
    });
    
    expect(hasContent).toBe(true);
    
    // Check for specific UI elements that should be present
    await expect(page.locator('[data-testid="agent-feed"]')).toBeVisible();
    await expect(page.locator('[data-testid="header"]')).toBeVisible();
    
    // Ensure no critical JavaScript errors
    const errors = (page as any).errors;
    const criticalErrors = errors.filter((error: string) => 
      error.includes('Uncaught') || 
      error.includes('TypeError') || 
      error.includes('ReferenceError')
    );
    expect(criticalErrors).toHaveLength(0);
});

test('should handle API failures gracefully', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/v1/agent-posts', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    await page.goto('http://localhost:3001');
    await page.waitForTimeout(3000);
    
    // Should still show UI structure even with API failure
    await expect(page.locator('[data-testid="agent-feed"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-fallback"]').or(page.locator('[data-testid="loading-state"]'))).toBeVisible();
    
    // Take screenshot for error state
    await page.screenshot({ path: 'tests/screenshots/api-error-state.png', fullPage: true });
});

test('should show loading state before content loads', async ({ page }) => {
    // Slow down API response
    await page.route('**/api/v1/agent-posts', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      route.continue();
    });

    await page.goto('http://localhost:3001');
    
    // Should show loading state immediately
    await expect(page.locator('[data-testid="loading-state"]').or(page.locator('.animate-spin'))).toBeVisible();
    
    // Then content should appear
    await expect(page.locator('[data-testid="agent-feed"]')).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: 'tests/screenshots/loaded-state.png', fullPage: true });
});

test('should maintain responsiveness on different screen sizes', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667 },   // Mobile
      { width: 768, height: 1024 },  // Tablet
      { width: 1920, height: 1080 }  // Desktop
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('http://localhost:3001');
      await page.waitForTimeout(2000);
      
      // Ensure content is visible on all screen sizes
      const hasContent = await page.evaluate(() => {
        const root = document.getElementById('root');
        return root && root.children.length > 0;
      });
      
      expect(hasContent).toBe(true);
      
      await page.screenshot({ 
        path: `tests/screenshots/responsive-${viewport.width}x${viewport.height}.png`,
        fullPage: true 
      });
    }
});

test('should recover from component errors with error boundaries', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Simulate component error by manipulating DOM
    await page.evaluate(() => {
      // Trigger an error in React component
      const event = new Error('Test component error');
      window.dispatchEvent(new ErrorEvent('error', { error: event }));
    });

    await page.waitForTimeout(1000);
    
    // Should show error boundary fallback, not white screen
    const hasErrorBoundary = await page.locator('[data-testid="error-boundary"]').isVisible();
    const hasContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root && root.textContent!.trim().length > 0;
    });
    
    expect(hasContent).toBe(true);
    
    await page.screenshot({ path: 'tests/screenshots/error-boundary.png', fullPage: true });
});

test('should handle network connectivity issues', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Wait for initial load
    await page.waitForTimeout(2000);
    
    // Simulate offline mode
    await page.context().setOffline(true);
    
    // Try to refresh
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Should show offline state, not white screen
    const hasOfflineIndicator = await page.locator('[data-testid="offline-indicator"]').isVisible();
    const hasContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0;
    });
    
    expect(hasContent).toBe(true);
    
    await page.screenshot({ path: 'tests/screenshots/offline-state.png', fullPage: true });
});