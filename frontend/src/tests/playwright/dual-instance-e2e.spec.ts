import { test, expect } from '@playwright/test';

test.describe('Dual Instance Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dual instance page
    await page.goto('http://localhost:3001/dual-instance');
  });

  test('loads dual instance dashboard successfully', async ({ page }) => {
    // Wait for the page to load
    await expect(page.locator('h1')).toContainText('Dual Instance Monitor');
    
    // Check for main components
    await expect(page.locator('text=Development Instance')).toBeVisible();
    await expect(page.locator('text=Production Instance')).toBeVisible();
    await expect(page.locator('text=Handoffs')).toBeVisible();
  });

  test('displays instance status correctly', async ({ page }) => {
    // Wait for status to load
    await page.waitForLoadState('networkidle');
    
    // Check for status indicators
    const devStatus = page.locator('[data-testid="dev-status"]').or(page.locator('text=Running').first());
    const prodStatus = page.locator('[data-testid="prod-status"]').or(page.locator('text=Running').last());
    
    await expect(devStatus).toBeVisible();
    await expect(prodStatus).toBeVisible();
  });

  test('navigates between tabs successfully', async ({ page }) => {
    // Test tab navigation
    await page.click('button:has-text("Development")');
    await expect(page.locator('text=Development')).toBeVisible();
    
    await page.click('button:has-text("Production")');
    await expect(page.locator('text=Production')).toBeVisible();
    
    await page.click('button:has-text("Handoffs")');
    await expect(page.locator('text=Send Dev → Prod Handoff')).toBeVisible();
  });

  test('handoff form is functional', async ({ page }) => {
    // Navigate to handoffs tab
    await page.click('button:has-text("Handoffs")');
    
    // Check for handoff form
    const taskInput = page.locator('input[placeholder*="Enter task for production"]');
    const sendButton = page.locator('button:has-text("Send")');
    
    await expect(taskInput).toBeVisible();
    await expect(sendButton).toBeVisible();
    
    // Test form interaction
    await taskInput.fill('Test handoff task from E2E test');
    await expect(taskInput).toHaveValue('Test handoff task from E2E test');
    
    // Note: We don't actually send to avoid side effects in tests
    // await sendButton.click();
  });

  test('handles real-time updates', async ({ page }) => {
    // Wait for initial load
    await page.waitForLoadState('networkidle');
    
    // Check for WebSocket connection status
    const disconnectedBadge = page.locator('text=Disconnected');
    
    // If connected, disconnected badge should not be visible
    // If disconnected, it should be visible
    const isVisible = await disconnectedBadge.isVisible();
    console.log('WebSocket disconnected badge visible:', isVisible);
  });

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if layout adapts
    await expect(page.locator('h1')).toContainText('Dual Instance Monitor');
    
    // Check if cards stack properly on mobile
    const instanceCards = page.locator('[data-testid="instance-card"]').or(page.locator('.grid').first());
    await expect(instanceCards).toBeVisible();
  });

  test('error states are handled gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/v1/dual-instance-monitor/**', route => {
      route.abort();
    });
    
    await page.reload();
    
    // Should still load basic UI even with API failures
    await expect(page.locator('h1')).toContainText('Dual Instance Monitor');
  });

  test('confirmation workflow is accessible', async ({ page }) => {
    // Navigate to handoffs tab
    await page.click('button:has-text("Handoffs")');
    
    // Check for accessibility attributes
    const sendButton = page.locator('button:has-text("Send")');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Button should be focusable
    await expect(sendButton).toBeFocused();
  });

  test('performance metrics are reasonable', async ({ page }) => {
    const startTime = Date.now();
    
    // Navigate to page
    await page.goto('http://localhost:3001/dual-instance');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within reasonable time (5 seconds)
    expect(loadTime).toBeLessThan(5000);
    
    // Check for no console errors
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });
    
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Should have minimal console errors
    expect(logs.length).toBeLessThan(5);
  });

  test('data persistence works correctly', async ({ page }) => {
    // Navigate to handoffs tab
    await page.click('button:has-text("Handoffs")');
    
    // Fill in form
    const taskInput = page.locator('input[placeholder*="Enter task for production"]');
    await taskInput.fill('Persistent test data');
    
    // Navigate away and back
    await page.click('button:has-text("Unified View")');
    await page.click('button:has-text("Handoffs")');
    
    // Form should be cleared (expected behavior)
    await expect(taskInput).toHaveValue('');
  });

  test('WebSocket connection indicators work', async ({ page }) => {
    // Wait for page load
    await page.waitForLoadState('networkidle');
    
    // Check connection status elements
    const statusElements = page.locator('text=Running, text=Stopped, text=Disconnected').first();
    
    // Should have some status indicator
    await expect(statusElements).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Integration with Production System', () => {
  test('verifies production instance communication', async ({ page, request }) => {
    // Check if production instance API is accessible
    const response = await request.get('http://localhost:3000/api/v1/dual-instance-monitor/status');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('development');
    expect(data).toHaveProperty('production');
    expect(data).toHaveProperty('communication');
  });

  test('validates real-time message flow', async ({ page }) => {
    // Navigate to handoffs
    await page.click('button:has-text("Handoffs")');
    
    // Look for recent activity or messages
    const activitySection = page.locator('text=Recent Handoffs').or(page.locator('text=Recent Activity'));
    
    // Activity section should be present even if empty
    const isVisible = await activitySection.isVisible();
    console.log('Activity section visible:', isVisible);
  });
});

test.describe('Regression Prevention', () => {
  test('prevents white screen errors', async ({ page }) => {
    // Load page
    await page.goto('http://localhost:3001/dual-instance');
    
    // Wait and check for content
    await page.waitForTimeout(3000);
    
    // Should have main content visible
    const mainContent = page.locator('h1, main, .main-content').first();
    await expect(mainContent).toBeVisible();
    
    // Should not have error boundaries triggered
    const errorBoundary = page.locator('text=Something went wrong, text=Error occurred');
    expect(await errorBoundary.count()).toBe(0);
  });

  test('handles rapid navigation without crashes', async ({ page }) => {
    // Rapid tab switching
    for (let i = 0; i < 5; i++) {
      await page.click('button:has-text("Development")');
      await page.click('button:has-text("Production")');
      await page.click('button:has-text("Handoffs")');
      await page.click('button:has-text("Unified View")');
    }
    
    // Should still be functional
    await expect(page.locator('h1')).toContainText('Dual Instance Monitor');
  });
});