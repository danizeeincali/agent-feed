/**
 * Simple Analytics and Settings E2E Test
 * Verifies that the simplified Analytics and Settings pages display content properly
 */

const { test, expect } = require('@playwright/test');

test.describe('Simple Analytics Tests', () => {
  test('should display Analytics with visible content', async ({ page }) => {
    test.setTimeout(60000);
    
    await page.goto('http://localhost:3002/analytics');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    // Check if the title is visible
    await expect(page.locator('h1:has-text("System Analytics")')).toBeVisible();
    
    // Check if subtitle is visible
    await expect(page.locator('text=Monitor performance metrics and system health')).toBeVisible();
    
    // Check if Refresh button is visible
    await expect(page.locator('button:has-text("Refresh Data")')).toBeVisible();
    
    // Wait for metrics to load
    await page.waitForTimeout(2000);
    
    // Check if metric cards are visible
    const metricCards = page.locator('.bg-white.rounded-lg.border');
    await expect(metricCards.first()).toBeVisible();
    
    // Check if specific metrics are visible
    await expect(page.locator('text=CPU Usage')).toBeVisible();
    await expect(page.locator('text=Memory Usage')).toBeVisible();
    await expect(page.locator('text=Active Agents')).toBeVisible();
    
    console.log('✅ All Analytics tests passed!');
  });
});

test.describe('Simple Settings Tests', () => {
  test('should display Settings with visible content', async ({ page }) => {
    test.setTimeout(60000);
    
    await page.goto('http://localhost:3002/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Check if the title is visible
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible();
    
    // Check if subtitle is visible
    await expect(page.locator('text=Manage your account and system preferences')).toBeVisible();
    
    // Check if Save Changes button is visible
    await expect(page.locator('button:has-text("Save Changes")')).toBeVisible();
    
    // Check if sidebar navigation is visible
    await expect(page.locator('button:has-text("User Profile")')).toBeVisible();
    await expect(page.locator('button:has-text("Notifications")')).toBeVisible();
    await expect(page.locator('button:has-text("System")')).toBeVisible();
    await expect(page.locator('button:has-text("Security")')).toBeVisible();
    
    // Test navigation to different sections
    await page.click('button:has-text("Notifications")');
    await expect(page.locator('h3:has-text("Notification Preferences")')).toBeVisible();
    
    await page.click('button:has-text("System")');
    await expect(page.locator('h3:has-text("System Configuration")')).toBeVisible();
    
    console.log('✅ All Settings tests passed!');
  });
});

test.describe('Component Integration Tests', () => {
  test('should navigate between Analytics and Settings', async ({ page }) => {
    await page.goto('http://localhost:3002/');
    await page.waitForLoadState('domcontentloaded');
    
    // Navigate to Analytics
    const analyticsLink = page.locator('a[href="/analytics"], nav a:has-text("Analytics")');
    if (await analyticsLink.isVisible()) {
      await analyticsLink.click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:has-text("System Analytics")')).toBeVisible();
    }
    
    // Navigate to Settings
    const settingsLink = page.locator('a[href="/settings"], nav a:has-text("Settings")');
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:has-text("Settings")')).toBeVisible();
    }
  });
});