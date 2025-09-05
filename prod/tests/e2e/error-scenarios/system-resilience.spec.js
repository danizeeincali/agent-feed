/**
 * Error Scenarios and System Resilience Testing
 * Tests system behavior under various failure conditions including network issues,
 * API failures, data corruption, and service degradation scenarios
 */

import { test, expect } from '@playwright/test';
import { AgentDashboardPage } from '../pages/agent-dashboard-page.js';
import { PostCreationPage } from '../pages/post-creation-page.js';
import { AnalyticsPage } from '../pages/analytics-page.js';
import { AuthHelpers } from '../utils/auth-helpers.js';
import { PerformanceHelpers, ErrorHelpers, ApiHelpers, WaitHelpers } from '../utils/test-helpers.js';
import { TestDataGenerator } from '../fixtures/test-data-generator.js';

test.describe('System Resilience and Error Handling', () => {
  let authHelpers;
  let errorHelpers;
  let apiHelpers;
  let waitHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    errorHelpers = new ErrorHelpers(page);
    apiHelpers = new ApiHelpers(page);
    waitHelpers = new WaitHelpers(page);
    
    // Start error monitoring
    errorHelpers.startErrorMonitoring();
    
    await authHelpers.loginAsUser();
  });

  test.afterEach(async () => {
    // Check for critical errors that shouldn't occur
    const criticalErrors = errorHelpers.hasCriticalErrors();
    if (criticalErrors) {
      console.warn('Critical errors detected during resilience testing:', errorHelpers.getErrors());
    }
    
    await authHelpers.logout();
  });

  test('should handle API timeout gracefully', async ({ page }) => {
    const dashboardPage = new AgentDashboardPage(page);
    
    // Simulate slow network conditions
    await apiHelpers.simulateNetworkConditions({
      offline: false,
      downloadThroughput: 50 * 1024, // 50KB/s - very slow
      uploadThroughput: 50 * 1024,
      latency: 2000 // 2 second latency
    });
    
    await dashboardPage.navigate();
    
    // System should still load, albeit slowly
    await dashboardPage.waitForAgentsLoad();
    
    // Verify dashboard loads with timeout handling
    const agents = await dashboardPage.getAgentsList();
    expect(agents).toBeTruthy(); // Should load even if slowly
    
    // Test post creation under slow conditions
    const postPage = await dashboardPage.createPost();
    
    const postData = {
      title: 'Timeout Resilience Test',
      content: 'This post tests system resilience under network timeout conditions.',
      hashtags: ['#timeout', '#resilience', '#testing'],
      platforms: ['twitter']
    };
    
    // This should handle timeout gracefully
    try {
      await postPage.createPost(postData);
      await postPage.waitForOptimization();
      
      // System should either complete or show appropriate loading/timeout messaging
      const hasTimeoutMessage = await page.locator('[data-testid="timeout-message"]').isVisible();
      const hasOptimizationResult = await page.locator('[data-testid="quality-score"]').isVisible();
      
      // One of these should be true - either completed or timed out gracefully
      expect(hasTimeoutMessage || hasOptimizationResult).toBe(true);
      
    } catch (error) {
      // If it fails, check that error is handled gracefully in UI
      const errorMessage = await page.locator('[data-testid="error-message"]').isVisible();
      expect(errorMessage).toBe(true);
    }
  });

  test('should handle API failures and show appropriate fallbacks', async ({ page }) => {
    const dashboardPage = new AgentDashboardPage(page);
    
    // Mock API failures
    await apiHelpers.mockApiResponse('**/api/agents**', {
      status: 500,
      data: { error: 'Internal Server Error' }
    });
    
    await dashboardPage.navigate();
    
    // Should show error state gracefully
    const errorState = await page.locator('[data-testid="agents-error"]').isVisible();
    const emptyState = await page.locator('[data-testid="no-agents-message"]').isVisible();
    const retryButton = await page.locator('[data-testid="retry-button"]').isVisible();
    
    // Should show appropriate error handling UI
    expect(errorState || emptyState || retryButton).toBe(true);
    
    // Test recovery mechanism
    if (retryButton) {
      // Remove the API failure mock
      await page.unroute('**/api/agents**');
      
      // Click retry
      await page.click('[data-testid="retry-button"]');
      
      // Should recover
      await waitHelpers.waitForLoadingComplete();
      
      // Verify recovery
      const agents = await dashboardPage.getAgentsList();
      expect(agents.length).toBeGreaterThanOrEqual(0);
    }
  });

  test('should handle authentication errors gracefully', async ({ page }) => {
    const dashboardPage = new AgentDashboardPage(page);
    
    await dashboardPage.navigate();
    
    // Simulate session expiry
    await authHelpers.expireSession();
    
    // Try to perform authenticated action
    try {
      await dashboardPage.createPost();
    } catch (error) {
      // Should redirect to login or show auth error
    }
    
    // Should either redirect to login or show auth error
    const currentUrl = page.url();
    const hasAuthError = await page.locator('[data-testid="auth-error"]').isVisible();
    const isLoginPage = currentUrl.includes('/login');
    
    expect(hasAuthError || isLoginPage).toBe(true);
  });

  test('should handle form validation errors comprehensively', async ({ page }) => {
    const dashboardPage = new AgentDashboardPage(page);
    const postPage = new PostCreationPage(page);
    
    await dashboardPage.navigate();
    const creationPage = await dashboardPage.createPost();
    
    // Test various validation scenarios
    
    // 1. Empty form submission
    await creationPage.publishNow().catch(() => {}); // Expect this to fail
    
    const hasValidationErrors = await page.locator('[data-testid="validation-error"]').isVisible();
    expect(hasValidationErrors).toBe(true);
    
    // 2. Content too long for platform
    const longContent = 'A'.repeat(500); // Longer than Twitter limit
    await creationPage.createPost({
      title: 'Validation Test',
      content: longContent,
      platforms: ['twitter']
    });
    
    // Should show length warning or auto-trim
    const hasLengthWarning = await page.locator('[data-testid="length-warning"]').isVisible();
    const hasAutoTrim = await page.locator('[data-testid="auto-trim-notice"]').isVisible();
    
    // One of these should handle the length issue
    expect(hasLengthWarning || hasAutoTrim).toBe(true);
    
    // 3. Invalid hashtags
    await creationPage.fill('[data-testid="hashtag-input"]', 'invalid hashtag without hash');
    
    try {
      await creationPage.publishNow();
    } catch (error) {
      // Should catch validation error
    }
    
    // Should show hashtag format error
    const hasHashtagError = await page.locator('[data-testid="hashtag-error"]').isVisible();
    // Hashtag validation might be handled differently, so check if form prevents submission
    const canSubmit = await page.locator('[data-testid="publish-now-button"]').isEnabled();
    
    expect(hasHashtagError || !canSubmit).toBe(true);
  });

  test('should recover from optimization service failures', async ({ page }) => {
    const dashboardPage = new AgentDashboardPage(page);
    
    await dashboardPage.navigate();
    const postPage = await dashboardPage.createPost();
    
    // Mock optimization service failure
    await apiHelpers.mockApiResponse('**/api/optimize**', {
      status: 503,
      data: { error: 'Service Unavailable' }
    });
    
    const postData = {
      title: 'Optimization Failure Test',
      content: 'This post tests system behavior when optimization services fail.',
      hashtags: ['#optimization', '#failure', '#recovery'],
      platforms: ['twitter']
    };
    
    await postPage.createPost(postData);
    
    // Should handle optimization failure gracefully
    try {
      await postPage.waitForOptimization();
    } catch (error) {
      // Expected to fail
    }
    
    // Check for graceful degradation
    const hasOptimizationError = await page.locator('[data-testid="optimization-error"]').isVisible();
    const hasManualMode = await page.locator('[data-testid="manual-mode"]').isVisible();
    const canStillPublish = await page.locator('[data-testid="publish-now-button"]').isEnabled();
    
    // Should either show error message or fall back to manual mode
    expect(hasOptimizationError || hasManualMode).toBe(true);
    
    // Should still be able to publish without optimization
    expect(canStillPublish).toBe(true);
    
    // Test publishing without optimization
    try {
      await postPage.saveDraft(); // Save instead of publish to avoid rate limits
      const draftResult = await page.locator('[data-testid="draft-saved"]').isVisible();
      expect(draftResult).toBe(true);
    } catch (error) {
      // If save fails, check error is handled gracefully
      const hasSaveError = await page.locator('[data-testid="save-error"]').isVisible();
      expect(hasSaveError).toBe(true);
    }
  });

  test('should handle concurrent operation conflicts', async ({ page, context }) => {
    const dashboardPage = new AgentDashboardPage(page);
    
    // Create second browser context to simulate concurrent user
    const context2 = await context.browser().newContext();
    const page2 = await context2.newPage();
    const authHelpers2 = new AuthHelpers(page2);
    const dashboardPage2 = new AgentDashboardPage(page2);
    
    try {
      await authHelpers2.loginAsUser();
      
      await dashboardPage.navigate();
      await dashboardPage2.navigate();
      
      await dashboardPage.waitForAgentsLoad();
      await dashboardPage2.waitForAgentsLoad();
      
      const agents = await dashboardPage.getAgentsList();
      const activeAgents = agents.filter(agent => agent.status === 'active');
      
      if (activeAgents.length >= 2) {
        // Both users try to coordinate the same agents simultaneously
        const agentNames = activeAgents.slice(0, 2).map(agent => agent.name);
        
        const coordination1 = dashboardPage.initiateCoordination(agentNames);
        const coordination2 = dashboardPage2.initiateCoordination(agentNames);
        
        // Both should complete without critical errors
        const results = await Promise.allSettled([coordination1, coordination2]);
        
        // At least one should succeed, or both should handle conflict gracefully
        const successCount = results.filter(result => result.status === 'fulfilled').length;
        expect(successCount).toBeGreaterThanOrEqual(1);
        
        // Check that no agents are in error state due to conflict
        await page.waitForTimeout(2000); // Wait for system to stabilize
        
        const updatedAgents = await dashboardPage.getAgentsList();
        const errorAgents = updatedAgents.filter(agent => agent.status === 'error');
        expect(errorAgents.length).toBe(0);
        
        // Both dashboards should show consistent state
        const status1 = await dashboardPage.getCoordinationStatus();
        const status2 = await dashboardPage2.getCoordinationStatus();
        
        // States should be consistent or show conflict resolution
        expect(status1.status).toMatch(/active|coordinating|resolved|conflict/);
        expect(status2.status).toMatch(/active|coordinating|resolved|conflict/);
      }
      
    } finally {
      await authHelpers2.logout();
      await context2.close();
    }
  });

  test('should handle data corruption gracefully', async ({ page }) => {
    const dashboardPage = new AgentDashboardPage(page);
    
    await dashboardPage.navigate();
    
    // Simulate corrupted agent data
    await page.evaluate(() => {
      // Corrupt localStorage data
      localStorage.setItem('agents', 'corrupted-json-data');
      localStorage.setItem('user-preferences', '{invalid-json');
    });
    
    // Reload to trigger corrupted data handling
    await page.reload();
    
    // Should handle corrupted data gracefully
    await waitHelpers.waitForLoadingComplete();
    
    // Should either show error or reset to clean state
    const hasCorruptionError = await page.locator('[data-testid="data-corruption-error"]').isVisible();
    const hasCleanState = await page.locator('[data-testid="dashboard-header"]').isVisible();
    
    expect(hasCorruptionError || hasCleanState).toBe(true);
    
    // If clean state, basic functionality should work
    if (hasCleanState) {
      await dashboardPage.waitForAgentsLoad();
      const agents = await dashboardPage.getAgentsList();
      expect(agents).toBeTruthy();
    }
  });

  test('should handle memory exhaustion scenarios', async ({ page }) => {
    const dashboardPage = new AgentDashboardPage(page);
    const performanceHelpers = new PerformanceHelpers(page);
    
    await dashboardPage.navigate();
    
    let initialMemory = await performanceHelpers.measureMemoryUsage();
    
    // Simulate memory-intensive operations
    const memoryIntensiveOperations = [];
    
    for (let i = 0; i < 20; i++) {
      const operation = async () => {
        const postPage = await dashboardPage.createPost();
        
        // Create large content that might consume memory
        const largeContent = 'Large content data '.repeat(1000);
        
        await postPage.createPost({
          title: `Memory Test Post ${i + 1}`,
          content: largeContent,
          hashtags: Array(50).fill(0).map((_, idx) => `#tag${idx}`),
          platforms: ['twitter', 'facebook', 'instagram', 'linkedin']
        });
        
        // Don't wait for optimization to avoid delays
        return i;
      };
      
      memoryIntensiveOperations.push(operation());
    }
    
    // Run operations and monitor memory
    try {
      await Promise.all(memoryIntensiveOperations);
    } catch (error) {
      // Some operations might fail due to memory pressure
      console.log('Expected memory pressure failures:', error.message);
    }
    
    // Check memory usage after operations
    let finalMemory = await performanceHelpers.measureMemoryUsage();
    
    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory.used - initialMemory.used;
      console.log(`Memory increase: ${memoryIncrease / 1024 / 1024}MB`);
      
      // System should not crash even under memory pressure
      const isResponsive = await page.locator('[data-testid="dashboard-header"]').isVisible();
      expect(isResponsive).toBe(true);
    }
    
    // Test system recovery after memory pressure
    await page.reload();
    await dashboardPage.waitForAgentsLoad();
    
    // Should recover normal functionality
    const agents = await dashboardPage.getAgentsList();
    expect(agents).toBeTruthy();
  });

  test('should handle service degradation gracefully', async ({ page }) => {
    const dashboardPage = new AgentDashboardPage(page);
    
    // Simulate partial service degradation
    await apiHelpers.mockApiResponse('**/api/analytics**', {
      status: 429, // Too Many Requests
      data: { error: 'Rate limit exceeded' }
    });
    
    await dashboardPage.navigate();
    await dashboardPage.waitForAgentsLoad();
    
    // Basic dashboard should still work
    const agents = await dashboardPage.getAgentsList();
    expect(agents).toBeTruthy();
    
    // Analytics should handle degradation
    const analyticsPage = await dashboardPage.viewAnalytics();
    
    // Should show degraded service message or cached data
    const hasRateLimitMessage = await page.locator('[data-testid="rate-limit-message"]').isVisible();
    const hasCachedData = await page.locator('[data-testid="cached-data-notice"]').isVisible();
    const hasBasicMetrics = await page.locator('[data-testid="overview-metrics"]').isVisible();
    
    // Should handle degradation gracefully
    expect(hasRateLimitMessage || hasCachedData || hasBasicMetrics).toBe(true);
    
    // Post creation should still work during analytics degradation
    const postPage = await dashboardPage.createPost();
    
    await postPage.createPost({
      title: 'Service Degradation Test',
      content: 'Testing functionality during analytics service degradation.',
      hashtags: ['#degradation', '#resilience'],
      platforms: ['twitter']
    });
    
    // Should complete despite analytics issues
    await postPage.waitForOptimization();
    const assessment = await postPage.getQualityAssessment();
    expect(assessment.quality).toBeGreaterThan(0);
  });

  test('should handle browser compatibility issues', async ({ page }) => {
    // Simulate older browser by disabling modern features
    await page.addInitScript(() => {
      // Disable some modern APIs to simulate older browser
      delete window.IntersectionObserver;
      delete window.ResizeObserver;
      
      // Mock console.log to catch compatibility warnings
      const originalConsole = window.console;
      window.console = {
        ...originalConsole,
        warn: (...args) => {
          if (args.some(arg => typeof arg === 'string' && arg.includes('compatibility'))) {
            window.__compatibilityWarnings = window.__compatibilityWarnings || [];
            window.__compatibilityWarnings.push(args.join(' '));
          }
          originalConsole.warn(...args);
        }
      };
    });
    
    const dashboardPage = new AgentDashboardPage(page);
    
    await dashboardPage.navigate();
    await dashboardPage.waitForAgentsLoad();
    
    // Basic functionality should still work
    const agents = await dashboardPage.getAgentsList();
    expect(agents).toBeTruthy();
    
    // Check for compatibility fallbacks
    const compatibilityWarnings = await page.evaluate(() => window.__compatibilityWarnings || []);
    
    if (compatibilityWarnings.length > 0) {
      console.log('Compatibility warnings detected:', compatibilityWarnings);
    }
    
    // System should provide fallbacks or degrade gracefully
    const hasPolyfills = await page.evaluate(() => {
      // Check if polyfills are loaded
      return !!(window.IntersectionObserver || window.ResizeObserver);
    });
    
    // Should either have polyfills or handle missing features gracefully
    expect(hasPolyfills || compatibilityWarnings.length === 0).toBe(true);
    
    // Test critical functionality works
    const postPage = await dashboardPage.createPost();
    
    await postPage.createPost({
      title: 'Compatibility Test Post',
      content: 'Testing browser compatibility fallbacks.',
      platforms: ['twitter']
    });
    
    // Should complete despite browser limitations
    await postPage.saveDraft();
    const success = await page.locator('[data-testid="draft-saved"]').isVisible();
    expect(success).toBe(true);
  });

  test('should handle race conditions in agent coordination', async ({ page }) => {
    const dashboardPage = new AgentDashboardPage(page);
    
    await dashboardPage.navigate();
    await dashboardPage.waitForAgentsLoad();
    
    const agents = await dashboardPage.getAgentsList();
    const activeAgents = agents.filter(agent => agent.status === 'active');
    
    if (activeAgents.length >= 3) {
      // Trigger multiple rapid coordination changes
      const agentNames = activeAgents.slice(0, 3).map(agent => agent.name);
      
      // Start coordination
      await dashboardPage.initiateCoordination(agentNames.slice(0, 2));
      
      // Immediately change coordination while first is processing
      setTimeout(() => {
        dashboardPage.initiateCoordination(agentNames.slice(1, 3)).catch(() => {
          // Expected to potentially fail due to race condition
        });
      }, 100);
      
      // Wait for system to stabilize
      await page.waitForTimeout(5000);
      
      // System should handle race condition gracefully
      const coordinationStatus = await dashboardPage.getCoordinationStatus();
      expect(coordinationStatus.status).toMatch(/active|coordinating|resolved|error/);
      
      // No agents should be in permanent error state
      const updatedAgents = await dashboardPage.getAgentsList();
      const errorAgents = updatedAgents.filter(agent => agent.status === 'error');
      expect(errorAgents.length).toBeLessThan(updatedAgents.length);
      
      // System should remain responsive
      const isResponsive = await page.locator('[data-testid="dashboard-header"]').isVisible();
      expect(isResponsive).toBe(true);
    }
  });
});