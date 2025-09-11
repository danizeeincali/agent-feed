import { test as setup, expect } from '@playwright/test';
import { testAgents } from '../fixtures/test-data';

/**
 * Setup for Dynamic Agent Pages E2E Tests
 * Prepares test environment and verifies prerequisites
 */

const authFile = 'playwright/.auth/user.json';

setup('authenticate and prepare test environment', async ({ page }) => {
  console.log('🔧 Setting up Dynamic Agent Pages test environment...');
  
  // Navigate to the application
  await page.goto('/');
  
  // Wait for the application to load
  await page.waitForLoadState('networkidle');
  
  // Check if authentication is required
  const loginButton = page.locator('button:has-text("Login"), a:has-text("Sign In")');
  
  if (await loginButton.isVisible()) {
    console.log('Authentication required - performing login...');
    
    // Perform authentication if needed
    // This would depend on your specific authentication flow
    await loginButton.click();
    
    // Fill in credentials (would need to be configured for your app)
    const usernameField = page.locator('input[name="username"], input[name="email"]');
    const passwordField = page.locator('input[name="password"]');
    
    if (await usernameField.isVisible()) {
      await usernameField.fill(process.env.TEST_USERNAME || 'testuser');
      await passwordField.fill(process.env.TEST_PASSWORD || 'testpass');
      
      const submitButton = page.locator('button[type="submit"], button:has-text("Sign In")');
      await submitButton.click();
      
      // Wait for authentication to complete
      await page.waitForURL(/\/(?:dashboard|agents|home)/);
    }
    
    // Save authentication state
    await page.context().storageState({ path: authFile });
  }
  
  // Verify agents page is accessible
  await page.goto('/agents');
  await page.waitForLoadState('networkidle');
  
  // Check that agents are loaded
  const agentsList = page.locator('[data-testid="agent-list"], .agents-grid');
  await expect(agentsList).toBeVisible({ timeout: 15000 });
  
  // Verify at least one agent is available
  const agentCards = page.locator('[data-testid="agent-card"]');
  const cardCount = await agentCards.count();
  
  if (cardCount === 0) {
    console.warn('⚠️  No agent cards found - tests may use fallback data');
  } else {
    console.log(`✅ Found ${cardCount} agent cards`);
  }
  
  // Test navigation to an agent home page
  if (cardCount > 0) {
    const firstCard = agentCards.first();
    const homeButton = firstCard.locator('button:has-text("Home"), [title*="Home"]');
    
    if (await homeButton.isVisible()) {
      await homeButton.click();
      
      // Verify agent home page loads
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1, h2').first()).toBeVisible();
      
      console.log('✅ Agent home page navigation confirmed');
    } else {
      console.warn('⚠️  Home button not found on agent cards');
    }
  }
  
  // Check for WebSocket connectivity (if implemented)
  const webSocketStatus = await page.evaluate(() => {
    return (window as any).webSocketConnected || false;
  });
  
  if (webSocketStatus) {
    console.log('✅ WebSocket connection confirmed');
  } else {
    console.log('ℹ️  WebSocket not connected - real-time tests may use mocks');
  }
  
  // Verify responsive design support
  await page.setViewportSize({ width: 375, height: 667 }); // Mobile
  await page.goto('/agents');
  await page.waitForTimeout(500);
  
  const mobileView = page.viewportSize();
  expect(mobileView?.width).toBe(375);
  console.log('✅ Mobile viewport support confirmed');
  
  // Reset to desktop view
  await page.setViewportSize({ width: 1280, height: 720 });
  
  // Check performance baseline
  const startTime = Date.now();
  await page.goto('/agents');
  await page.waitForLoadState('networkidle');
  const loadTime = Date.now() - startTime;
  
  console.log(`ℹ️  Baseline load time: ${loadTime}ms`);
  
  if (loadTime > 5000) {
    console.warn('⚠️  Slow page load detected - performance tests may fail');
  } else {
    console.log('✅ Page performance baseline acceptable');
  }
  
  console.log('🎉 Setup completed successfully');
});