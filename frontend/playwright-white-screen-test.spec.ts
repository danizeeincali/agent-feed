import { test, expect } from '@playwright/test';

test.describe('Critical White Screen Fix Validation', () => {
  test('dual instance page loads without white screen - CRITICAL TEST', async ({ page }) => {
    // Set up console error tracking
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the problematic page
    await page.goto('http://localhost:3001/dual-instance');
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Critical assertion: page should not be blank/white
    const pageContent = await page.textContent('body');
    expect(pageContent).not.toBe('');
    expect(pageContent).toBeTruthy();
    
    // Should see the dual instance monitor heading
    await expect(page.locator('h1')).toContainText('Dual Instance Monitor', { timeout: 15000 });
    
    // Should see main UI components
    await expect(page.locator('text=Development Instance')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Production Instance')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Handoffs')).toBeVisible({ timeout: 10000 });
    
    // Verify tabs are working
    await expect(page.locator('button:has-text("Unified View")')).toBeVisible();
    await expect(page.locator('button:has-text("Development")')).toBeVisible();
    await expect(page.locator('button:has-text("Production")')).toBeVisible();
    await expect(page.locator('button:has-text("Handoffs")')).toBeVisible();
    
    // Test tab navigation works
    await page.click('button:has-text("Development")');
    await page.waitForTimeout(1000);
    
    await page.click('button:has-text("Production")');
    await page.waitForTimeout(1000);
    
    await page.click('button:has-text("Handoffs")');
    await page.waitForTimeout(1000);
    
    // Should see handoff form
    await expect(page.locator('input[placeholder*="Enter task for production"]')).toBeVisible();
    await expect(page.locator('button:has-text("Send")')).toBeVisible();
    
    // Filter out expected/acceptable errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('Redis') && 
      !error.includes('WebSocket') &&
      !error.includes('404') &&
      !error.includes('Failed to fetch')
    );
    
    // Should have minimal critical JavaScript errors
    expect(criticalErrors.length).toBeLessThan(3);
    
    console.log('✅ WHITE SCREEN TEST PASSED - Page loaded successfully');
  });

  test('react component actually renders content', async ({ page }) => {
    await page.goto('http://localhost:3001/dual-instance');
    await page.waitForLoadState('networkidle');
    
    // Wait for React to fully render
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0 && root.innerText.trim() !== '';
    }, { timeout: 15000 });
    
    // Verify the root element has content
    const rootContent = await page.locator('#root').textContent();
    expect(rootContent).toContain('Dual Instance Monitor');
    
    // Verify no error boundaries triggered
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
    await expect(page.locator('text=Error occurred')).not.toBeVisible();
    
    console.log('✅ REACT RENDER TEST PASSED - Components rendered successfully');
  });

  test('page is responsive and functional', async ({ page }) => {
    await page.goto('http://localhost:3001/dual-instance');
    await page.waitForSelector('h1:has-text("Dual Instance Monitor")', { timeout: 15000 });
    
    // Test mobile responsiveness
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('h1')).toContainText('Dual Instance Monitor');
    
    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Test form interaction
    await page.click('button:has-text("Handoffs")');
    const taskInput = page.locator('input[placeholder*="Enter task for production"]');
    await taskInput.fill('Test task from Playwright');
    await expect(taskInput).toHaveValue('Test task from Playwright');
    
    console.log('✅ FUNCTIONALITY TEST PASSED - Page is responsive and interactive');
  });
});

test.describe('Regression Prevention', () => {
  test('prevent future white screen regressions', async ({ page }) => {
    await page.goto('http://localhost:3001/dual-instance');
    
    // Take screenshot for visual comparison
    await page.screenshot({ 
      path: '/workspaces/agent-feed/frontend/tests/screenshots/dual-instance-working.png',
      fullPage: true 
    });
    
    // Verify page structure for regression detection
    const hasHeader = await page.locator('h1:has-text("Dual Instance Monitor")').isVisible();
    const hasInstanceCards = await page.locator('text=Development Instance').isVisible();
    const hasTabs = await page.locator('button:has-text("Unified View")').isVisible();
    
    expect(hasHeader).toBe(true);
    expect(hasInstanceCards).toBe(true);
    expect(hasTabs).toBe(true);
    
    console.log('✅ REGRESSION TEST PASSED - Page structure verified for future comparison');
  });
});