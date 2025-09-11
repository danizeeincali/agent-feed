import { test as teardown } from '@playwright/test';

/**
 * Teardown for Dynamic Agent Pages E2E Tests
 * Cleans up after test execution
 */

teardown('cleanup test environment', async ({ page }) => {
  console.log('🧹 Starting cleanup for Dynamic Agent Pages tests...');
  
  try {
    // Clear any test data that was created
    await page.goto('/');
    
    // Clear localStorage and sessionStorage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Clear any test agents that were created (if applicable)
    const testAgentPattern = /test-agent-\d+/;
    
    await page.evaluate((pattern) => {
      // Clear any test-specific data from window object
      const keys = Object.keys(window);
      keys.forEach(key => {
        if (key.match(pattern) || key.startsWith('test') || key.startsWith('mock')) {
          delete (window as any)[key];
        }
      });
    }, testAgentPattern.source);
    
    // Close any open WebSocket connections
    await page.evaluate(() => {
      if ((window as any).webSocketConnection) {
        (window as any).webSocketConnection.close();
      }
    });
    
    // Reset viewport to standard size
    await page.setViewportSize({ width: 1280, height: 720 });
    
    console.log('✅ Cleanup completed successfully');
    
  } catch (error) {
    console.warn('⚠️  Cleanup encountered issues:', error);
    // Don't fail the entire test suite due to cleanup issues
  }
});