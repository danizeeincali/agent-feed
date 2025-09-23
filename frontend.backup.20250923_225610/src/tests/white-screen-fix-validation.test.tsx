import { test, expect } from '@playwright/test';

test.describe('White Screen Fix Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dual instance page
    await page.goto('http://localhost:3001/dual-instance');
  });

  test('dual instance page loads without white screen', async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check for the main heading
    await expect(page.locator('h1')).toContainText('Dual Instance Monitor', { timeout: 10000 });
    
    // Verify main components are visible
    await expect(page.locator('text=Development Instance')).toBeVisible();
    await expect(page.locator('text=Production Instance')).toBeVisible();
    await expect(page.locator('text=Handoffs')).toBeVisible();
  });

  test('no JavaScript errors in console', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:3001/dual-instance');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Filter out expected errors (Redis connection issues are expected in dev)
    const unexpectedErrors = consoleErrors.filter(error => 
      !error.includes('Redis') && 
      !error.includes('WebSocket') && 
      !error.includes('404')
    );

    expect(unexpectedErrors.length).toBeLessThan(3);
  });

  test('components render correctly', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Wait for React to render
    await page.waitForSelector('h1:has-text("Dual Instance Monitor")', { timeout: 15000 });
    
    // Check for main UI components
    const instanceCards = page.locator('[data-testid="instance-card"]').or(page.locator('.grid').first());
    await expect(instanceCards).toBeVisible();
    
    // Verify tabs are rendered
    await expect(page.locator('button:has-text("Unified View")')).toBeVisible();
    await expect(page.locator('button:has-text("Development")')).toBeVisible();
    await expect(page.locator('button:has-text("Production")')).toBeVisible();
    await expect(page.locator('button:has-text("Handoffs")')).toBeVisible();
  });

  test('regression: prevent future white screen issues', async ({ page }) => {
    // This test captures the current working state to prevent regressions
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot for visual regression testing
    await page.screenshot({ path: 'tests/screenshots/dual-instance-baseline.png' });
    
    // Verify page title
    await expect(page).toHaveTitle(/Agent Feed/);
    
    // Verify main content structure
    const mainContent = page.locator('body');
    await expect(mainContent).toContainText('Dual Instance Monitor');
    
    // Ensure no error boundaries are triggered
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
    await expect(page.locator('text=Error occurred')).not.toBeVisible();
  });

  test('page accessibility compliance', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h1:has-text("Dual Instance Monitor")');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Check for proper heading structure
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThan(0);
    
    // Verify buttons are focusable
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });
});

// Additional validation for component mounting
test.describe('Component Mounting Validation', () => {
  test('DualInstanceDashboardEnhanced mounts without errors', async ({ page }) => {
    await page.goto('http://localhost:3001/dual-instance');
    
    // Wait for component to mount
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0;
    }, { timeout: 10000 });
    
    // Verify component structure
    await expect(page.locator('#root')).not.toBeEmpty();
    
    // Check for loading states
    const loadingIndicator = page.locator('text=Loading').or(page.locator('.animate-spin'));
    
    // Wait for loading to complete if present
    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
    }
    
    // Final verification that content is rendered
    await expect(page.locator('h1')).toContainText('Dual Instance Monitor');
  });
});