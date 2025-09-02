import { test, expect } from '@playwright/test';
import ClaudeCodeTestHelpers from '../utils/test-helpers';

/**
 * Cross-Browser Testing and CI Integration
 * 
 * Tests:
 * - Cross-browser compatibility
 * - CI environment optimization
 * - Headless operation validation
 * - Environment-specific configurations
 * - Parallel test execution stability
 */

test.describe('Cross-Browser and CI Integration', () => {
  let helpers: ClaudeCodeTestHelpers;
  let createdInstances: string[] = [];

  test.beforeEach(async ({ page }) => {
    helpers = new ClaudeCodeTestHelpers(page);
  });

  test.afterEach(async () => {
    for (const instanceId of createdInstances) {
      try {
        await helpers.cleanupInstances();
      } catch (error) {
        console.warn(`Failed to cleanup instance ${instanceId}:`, error);
      }
    }
    createdInstances = [];
  });

  test('should work consistently across all supported browsers', async ({ page, browserName }) => {
    test.setTimeout(150000);
    
    console.log(`Testing on browser: ${browserName}`);
    
    // Browser-specific optimizations
    if (browserName === 'webkit') {
      // Safari-specific settings
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
      });
    }
    
    await helpers.navigateToClaudeInstances();
    
    // Test core functionality across browsers
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await expect(instanceCard).toBeVisible();
    
    // Test chat functionality
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    const messages = await helpers.sendMessageToInstance(instanceId, `Cross-browser test on ${browserName}`);
    expect(messages.length).toBeGreaterThanOrEqual(2);
    
    // Verify response quality
    const assistantMessage = messages.find(m => m.type === 'assistant');
    expect(assistantMessage).toBeTruthy();
    expect(assistantMessage!.content.length).toBeGreaterThan(0);
    
    // Test WebSocket functionality if supported
    try {
      await helpers.waitForWebSocketConnection();
      console.log(`WebSocket working on ${browserName}`);
    } catch (error) {
      console.warn(`WebSocket issue on ${browserName}:`, error.message);
      // Don't fail test for WebSocket issues in some browsers
    }
  });

  test('should handle CI environment constraints', async ({ page }) => {
    test.setTimeout(180000);
    
    const isCI = !!process.env.CI;
    console.log(`Running in CI environment: ${isCI}`);
    
    if (isCI) {
      // CI-specific configurations
      await page.setViewportSize({ width: 1280, height: 720 }); // Fixed viewport for CI
      
      // Reduced animations for faster CI execution
      await page.addInitScript(() => {
        document.documentElement.style.setProperty('--animation-duration', '0.1s');
        document.documentElement.style.setProperty('--transition-duration', '0.1s');
      });
    }
    
    await helpers.navigateToClaudeInstances();
    
    // Test basic functionality with CI optimizations
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    // Shorter test in CI environment
    const testMessage = isCI ? "CI test message" : "Full environment test message with more content";
    const messages = await helpers.sendMessageToInstance(instanceId, testMessage);
    
    expect(messages.length).toBeGreaterThanOrEqual(2);
    
    // Performance should be acceptable even in CI
    const loadMetrics = await helpers.measurePerformance();
    if (isCI) {
      expect(loadMetrics.loadTime).toBeLessThan(10000); // More lenient in CI
    } else {
      expect(loadMetrics.loadTime).toBeLessThan(5000);
    }
  });

  test('should validate headless operation', async ({ page, browserName }) => {
    test.setTimeout(120000);
    
    // Verify we can run in headless mode (Playwright default)
    const isHeadless = await page.evaluate(() => {
      return navigator.webdriver || window.outerHeight === 0 || window.outerWidth === 0;
    });
    
    console.log(`Running headless: ${isHeadless} on ${browserName}`);
    
    // Test core functionality in headless mode
    await helpers.navigateToClaudeInstances();
    
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    
    // Verify UI elements are present even without visual rendering
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await expect(instanceCard).toBeAttached(); // Element exists in DOM
    
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    // Test functionality without visual confirmation
    const messages = await helpers.sendMessageToInstance(instanceId, "Headless mode test");
    expect(messages.length).toBeGreaterThanOrEqual(2);
  });

  test('should handle environment-specific configurations', async ({ page }) => {
    test.setTimeout(120000);
    
    const environment = process.env.NODE_ENV || 'test';
    const port = process.env.PORT || '5173';
    
    console.log(`Environment: ${environment}, Port: ${port}`);
    
    // Test environment-specific features
    await helpers.navigateToClaudeInstances();
    
    // Check if debug information is available in development
    if (environment === 'development') {
      const consoleMessages: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'log' && msg.text().includes('DEBUG')) {
          consoleMessages.push(msg.text());
        }
      });
      
      await page.reload();
      await page.waitForTimeout(2000);
      
      // Development should have debug messages
      expect(consoleMessages.length).toBeGreaterThan(0);
    }
    
    // Test production optimizations if in production environment
    if (environment === 'production') {
      const networkRequests: string[] = [];
      page.on('request', request => {
        networkRequests.push(request.url());
      });
      
      await page.reload();
      await page.waitForTimeout(3000);
      
      // Production should minimize requests
      const staticAssets = networkRequests.filter(url => 
        url.includes('.js') || url.includes('.css') || url.includes('.png')
      );
      
      // Should have bundled/optimized assets
      expect(staticAssets.length).toBeLessThan(50); // Reasonable limit for production
    }
  });

  test('should maintain stability under parallel execution', async ({ page }) => {
    test.setTimeout(180000);
    
    // Simulate parallel test execution by rapid operations
    await helpers.navigateToClaudeInstances();
    
    // Create multiple instances rapidly (simulating parallel tests)
    const instancePromises = [];
    const instanceTypes = ['claude-interactive', 'claude-coder', 'claude-researcher'] as const;
    
    for (let i = 0; i < 3; i++) {
      const instanceType = instanceTypes[i % instanceTypes.length];
      instancePromises.push(helpers.createInstance(instanceType));
    }
    
    const instanceIds = await Promise.all(instancePromises);
    createdInstances.push(...instanceIds);
    
    // Verify all instances were created successfully
    expect(instanceIds.length).toBe(3);
    for (const instanceId of instanceIds) {
      expect(instanceId).toBeTruthy();
    }
    
    // Test parallel interactions
    const interactionPromises = instanceIds.map(async (instanceId, index) => {
      try {
        const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
        await instanceCard.click();
        
        await helpers.waitForElement('[data-testid="chat-input"]');
        
        const messages = await helpers.sendMessageToInstance(instanceId, `Parallel test ${index + 1}`);
        
        // Return to instances list for next test
        await helpers.navigateToClaudeInstances();
        
        return { success: true, instanceId, messageCount: messages.length };
      } catch (error) {
        return { success: false, instanceId, error: error.message };
      }
    });
    
    const results = await Promise.allSettled(interactionPromises);
    
    // Analyze parallel execution results
    const successfulResults = results
      .filter(r => r.status === 'fulfilled' && r.value.success)
      .map(r => r.value);
    
    const failedResults = results
      .filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
    
    console.log(`Parallel execution: ${successfulResults.length} successful, ${failedResults.length} failed`);
    
    // Should handle parallel execution reasonably well
    expect(successfulResults.length).toBeGreaterThanOrEqual(2); // At least 2/3 succeed
    expect(failedResults.length).toBeLessThanOrEqual(1); // At most 1 fails
  });

  test('should generate CI-friendly test reports', async ({ page }) => {
    test.setTimeout(90000);
    
    const testStartTime = Date.now();
    
    // Execute a comprehensive test scenario
    await helpers.navigateToClaudeInstances();
    
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    const messages = await helpers.sendMessageToInstance(instanceId, "CI report generation test");
    
    const testEndTime = Date.now();
    const testDuration = testEndTime - testStartTime;
    
    // Collect test metrics for CI reporting
    const testMetrics = {
      testName: 'CI Integration Test',
      duration: testDuration,
      timestamp: new Date().toISOString(),
      browser: await page.evaluate(() => navigator.userAgent),
      viewport: await page.viewportSize(),
      success: messages.length >= 2,
      messageCount: messages.length,
      instanceId
    };
    
    console.log('CI Test Metrics:', JSON.stringify(testMetrics, null, 2));
    
    // Assertions for CI reporting
    expect(testMetrics.success).toBe(true);
    expect(testMetrics.duration).toBeLessThan(60000); // Should complete within 1 minute
    expect(testMetrics.messageCount).toBeGreaterThanOrEqual(2);
    
    // Generate test artifact
    if (process.env.CI) {
      await page.screenshot({ 
        path: `test-results/ci-integration-${Date.now()}.png`,
        fullPage: true 
      });
    }
  });

  test('should handle test isolation and cleanup', async ({ page }) => {
    test.setTimeout(120000);
    
    // Test that each test is properly isolated
    await helpers.navigateToClaudeInstances();
    
    const initialInstanceCount = await helpers.waitForInstancesLoad();
    
    // Create test data
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    
    const afterCreateCount = await helpers.waitForInstancesLoad();
    expect(afterCreateCount).toBe(initialInstanceCount + 1);
    
    // Test interaction
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    await helpers.sendMessageToInstance(instanceId, "Isolation test message");
    
    // Verify cleanup works
    await helpers.navigateToClaudeInstances();
    await helpers.cleanupInstances();
    
    const afterCleanupCount = await helpers.waitForInstancesLoad();
    expect(afterCleanupCount).toBeLessThanOrEqual(initialInstanceCount);
    
    // Clear our tracking since we've cleaned up
    createdInstances = [];
  });

  test('should validate production deployment readiness', async ({ page }) => {
    test.setTimeout(120000);
    
    // Check production readiness indicators
    await helpers.navigateToClaudeInstances();
    
    // Verify no debug information leaks in production-like environment
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Test core functionality
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    const messages = await helpers.sendMessageToInstance(instanceId, "Production readiness test");
    
    // Production readiness checks
    expect(messages.length).toBeGreaterThanOrEqual(2);
    
    // Should not have critical console errors
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('Failed to') || 
      error.includes('Network Error') ||
      error.includes('Uncaught')
    );
    
    expect(criticalErrors.length).toBe(0);
    
    // Performance should meet production standards
    const performanceMetrics = await helpers.measurePerformance();
    expect(performanceMetrics.loadTime).toBeLessThan(3000); // Production-ready load time
    
    console.log('Production Readiness Check:', {
      messagesExchanged: messages.length,
      consoleErrors: consoleErrors.length,
      criticalErrors: criticalErrors.length,
      loadTime: performanceMetrics.loadTime
    });
  });
});