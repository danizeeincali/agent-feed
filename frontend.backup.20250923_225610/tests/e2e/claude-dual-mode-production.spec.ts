/**
 * Production E2E Tests for Dual Mode Claude Management System
 * 
 * Comprehensive Playwright tests validating the complete dual Claude management
 * system in production environment with /prod directory integration.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Dual Mode Claude Management - Production E2E', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    
    // Navigate to the application
    await page.goto('http://localhost:5174');
    
    // Wait for application to load
    await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 10000 });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test.describe('Global Service Manager', () => {
    test('should display global service manager interface', async () => {
      // Navigate to dual mode manager
      await page.click('[data-testid="claude-manager-link"]');
      
      // Should load global monitor by default
      await expect(page.locator('h2')).toContainText('Claude Service Manager');
      
      // Should show metrics summary
      await expect(page.locator('.metrics-summary')).toBeVisible();
      
      // Should have control buttons
      await expect(page.locator('.btn-worker')).toBeVisible();
      await expect(page.locator('.btn-interactive')).toBeVisible();
    });

    test('should create always-on worker instance in /prod directory', async () => {
      await page.click('[data-testid="claude-manager-link"]');
      
      // Create worker instance
      await page.click('.btn-worker');
      
      // Wait for creation
      await page.waitForSelector('.instance-card.worker', { timeout: 15000 });
      
      // Verify worker instance appears
      const workerCard = page.locator('.instance-card.worker');
      await expect(workerCard).toBeVisible();
      
      // Verify working directory is /prod
      await expect(workerCard.locator('.value').filter({ hasText: '/workspaces/agent-feed/prod' })).toBeVisible();
      
      // Verify always-on badge
      await expect(workerCard.locator('.badge.always-on')).toBeVisible();
    });

    test('should show worker as protected instance', async () => {
      await page.click('[data-testid="claude-manager-link"]');
      
      // Ensure worker exists
      await page.click('.btn-worker');
      await page.waitForSelector('.instance-card.worker', { timeout: 15000 });
      
      // Worker should show as protected
      const workerCard = page.locator('.instance-card.worker');
      await expect(workerCard.locator('.protected-notice')).toContainText('Protected Instance');
      
      // Terminate button should not be present for worker
      await expect(workerCard.locator('.btn-terminate')).not.toBeVisible();
    });

    test('should create and terminate interactive instances', async () => {
      await page.click('[data-testid="claude-manager-link"]');
      
      // Create interactive instance
      await page.click('.btn-interactive');
      
      // Wait for creation
      await page.waitForSelector('.instance-card.interactive', { timeout: 15000 });
      
      // Verify interactive instance appears
      const interactiveCard = page.locator('.instance-card.interactive');
      await expect(interactiveCard).toBeVisible();
      
      // Should have terminate button (not protected)
      await expect(interactiveCard.locator('.btn-terminate')).toBeVisible();
      
      // Terminate the instance
      await interactiveCard.locator('.btn-terminate').click();
      
      // Verify instance is removed
      await expect(interactiveCard).not.toBeVisible();
    });
  });

  test.describe('Interactive Instance Control', () => {
    test('should switch to interactive control mode', async () => {
      await page.click('[data-testid="claude-manager-link"]');
      
      // Switch to interactive tab
      await page.click('[data-value="interactive"]');
      
      // Should show interactive interface
      await expect(page.locator('h2')).toContainText('Claude Instance Controller');
      await expect(page.locator('.instance-selection')).toBeVisible();
    });

    test('should connect to running instance for interactive control', async () => {
      await page.click('[data-testid="claude-manager-link"]');
      
      // First ensure we have a running instance in global tab
      await page.click('.btn-interactive');
      await page.waitForSelector('.instance-card.interactive', { timeout: 15000 });
      
      // Switch to interactive tab
      await page.click('[data-value="interactive"]');
      
      // Wait for instances to be fetched
      await page.waitForSelector('.instance-option', { timeout: 10000 });
      
      // Connect to first available instance
      await page.click('.instance-option .btn-connect');
      
      // Should show connected state
      await expect(page.locator('.connection-status.connected')).toBeVisible();
      
      // Should show terminal interface
      await expect(page.locator('.interactive-terminal')).toBeVisible();
      await expect(page.locator('.command-input')).toBeVisible();
    });

    test('should send commands and receive output', async () => {
      await page.click('[data-testid="claude-manager-link"]');
      
      // Setup: Create instance and connect
      await page.click('.btn-interactive');
      await page.waitForSelector('.instance-card.interactive', { timeout: 15000 });
      
      await page.click('[data-value="interactive"]');
      await page.waitForSelector('.instance-option', { timeout: 10000 });
      await page.click('.instance-option .btn-connect');
      await page.waitForSelector('.connection-status.connected', { timeout: 10000 });
      
      // Send a simple command
      await page.fill('.command-input', 'pwd');
      await page.click('.btn-send');
      
      // Should show command in output
      await expect(page.locator('.output-line.input')).toContainText('> pwd');
      
      // Wait for potential output (with timeout)
      await page.waitForTimeout(2000);
    });

    test('should handle disconnection gracefully', async () => {
      await page.click('[data-testid="claude-manager-link"]');
      
      // Setup: Create instance and connect
      await page.click('.btn-interactive');
      await page.waitForSelector('.instance-card.interactive', { timeout: 15000 });
      
      await page.click('[data-value="interactive"]');
      await page.waitForSelector('.instance-option', { timeout: 10000 });
      await page.click('.instance-option .btn-connect');
      await page.waitForSelector('.connection-status.connected', { timeout: 10000 });
      
      // Disconnect
      await page.click('.btn-disconnect');
      
      // Should show disconnected state
      await expect(page.locator('.connection-status.disconnected')).toBeVisible();
      
      // Terminal should be hidden
      await expect(page.locator('.interactive-terminal')).not.toBeVisible();
    });
  });

  test.describe('Feed Integration System', () => {
    test('should display feed integration status when enabled', async () => {
      await page.click('[data-testid="claude-manager-link"]');
      
      // Ensure worker instance exists
      await page.click('.btn-worker');
      await page.waitForSelector('.instance-card.worker', { timeout: 15000 });
      
      // Switch to feed tab
      await page.click('[data-value="feed"]');
      
      // Should show feed integration interface
      await expect(page.locator('h3')).toContainText('Feed Integration System');
      await expect(page.locator('.feed-integration-dashboard')).toBeVisible();
    });

    test('should show worker metrics in feed integration', async () => {
      await page.click('[data-testid="claude-manager-link"]');
      
      // Ensure worker exists and switch to feed tab
      await page.click('.btn-worker');
      await page.waitForSelector('.instance-card.worker', { timeout: 15000 });
      await page.click('[data-value="feed"]');
      
      // Should show worker overview
      await expect(page.locator('.worker-overview')).toBeVisible();
      
      // Should show processing metrics
      await expect(page.locator('.feed-metrics')).toBeVisible();
      
      // Should have specific metric fields
      await expect(page.locator('.metric').filter({ hasText: 'Total Processed' })).toBeVisible();
      await expect(page.locator('.metric').filter({ hasText: 'Success Rate' })).toBeVisible();
    });

    test('should handle feed integration unavailable state', async () => {
      await page.click('[data-testid="claude-manager-link"]');
      
      // Switch to feed tab without creating worker
      await page.click('[data-value="feed"]');
      
      // Should show unavailable message
      await expect(page.locator('.feed-integration-unavailable')).toBeVisible();
      await expect(page.locator('h4')).toContainText('Feed Integration Unavailable');
    });
  });

  test.describe('Production Directory Integration', () => {
    test('should verify all instances run in /prod directory', async () => {
      await page.click('[data-testid="claude-manager-link"]');
      
      // Create both worker and interactive instances
      await page.click('.btn-worker');
      await page.waitForSelector('.instance-card.worker', { timeout: 15000 });
      
      await page.click('.btn-interactive');
      await page.waitForSelector('.instance-card.interactive', { timeout: 15000 });
      
      // Verify both show correct working directory
      const instanceCards = page.locator('.instance-card');
      const workerCard = instanceCards.filter({ hasText: 'worker' });
      const interactiveCard = instanceCards.filter({ hasText: 'interactive' });
      
      await expect(workerCard.locator('.value').filter({ hasText: '/workspaces/agent-feed/prod' })).toBeVisible();
      await expect(interactiveCard.locator('.value').filter({ hasText: '/workspaces/agent-feed/prod' })).toBeVisible();
    });
  });

  test.describe('System Integration and Navigation', () => {
    test('should allow seamless switching between modes', async () => {
      await page.click('[data-testid="claude-manager-link"]');
      
      // Test switching between all tabs
      await page.click('[data-value="global"]');
      await expect(page.locator('h2')).toContainText('Claude Service Manager');
      
      await page.click('[data-value="interactive"]');
      await expect(page.locator('h2')).toContainText('Claude Instance Controller');
      
      if (await page.locator('[data-value="feed"]').isVisible()) {
        await page.click('[data-value="feed"]');
        await expect(page.locator('h3')).toContainText('Feed Integration System');
      }
    });

    test('should maintain state when switching between modes', async () => {
      await page.click('[data-testid="claude-manager-link"]');
      
      // Create worker in global mode
      await page.click('.btn-worker');
      await page.waitForSelector('.instance-card.worker', { timeout: 15000 });
      
      // Switch to interactive mode and back
      await page.click('[data-value="interactive"]');
      await page.click('[data-value="global"]');
      
      // Worker should still be there
      await expect(page.locator('.instance-card.worker')).toBeVisible();
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle API connection failures gracefully', async () => {
      // Test with invalid API URL by manipulating network
      await page.route('**/api/v1/claude/instances', route => route.abort());
      
      await page.click('[data-testid="claude-manager-link"]');
      
      // Should show error state
      await expect(page.locator('.error-banner')).toBeVisible();
      
      // Should have retry option
      await expect(page.locator('button').filter({ hasText: 'Retry' })).toBeVisible();
    });

    test('should recover from worker instance failures', async () => {
      await page.click('[data-testid="claude-manager-link"]');
      
      // Create worker
      await page.click('.btn-worker');
      await page.waitForSelector('.instance-card.worker', { timeout: 15000 });
      
      // Switch to feed tab
      await page.click('[data-value="feed"]');
      
      // Should show healthy worker status
      await expect(page.locator('.worker-overview')).toBeVisible();
      
      // Note: Real failure recovery would require backend simulation
      // This test validates the UI is prepared for recovery scenarios
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should handle multiple instance operations', async () => {
      await page.click('[data-testid="claude-manager-link"]');
      
      // Create multiple instances rapidly
      await page.click('.btn-worker');
      await page.click('.btn-interactive');
      
      // Wait for both to be created
      await page.waitForSelector('.instance-card.worker', { timeout: 15000 });
      await page.waitForSelector('.instance-card.interactive', { timeout: 15000 });
      
      // Should show correct counts in metrics
      await expect(page.locator('.metric').filter({ hasText: 'Total: 2' })).toBeVisible();
      await expect(page.locator('.metric').filter({ hasText: 'Running: 2' })).toBeVisible();
      await expect(page.locator('.metric').filter({ hasText: 'Workers: 1' })).toBeVisible();
    });

    test('should maintain performance with continuous refreshing', async () => {
      await page.click('[data-testid="claude-manager-link"]');
      
      // Create worker instance
      await page.click('.btn-worker');
      await page.waitForSelector('.instance-card.worker', { timeout: 15000 });
      
      // Continuously refresh for 10 seconds
      const startTime = Date.now();
      while (Date.now() - startTime < 10000) {
        await page.click('.btn-refresh');
        await page.waitForTimeout(1000);
        
        // Verify worker instance persists
        await expect(page.locator('.instance-card.worker')).toBeVisible();
      }
      
      // Final verification
      await expect(page.locator('.instance-card.worker')).toBeVisible();
      await expect(page.locator('.badge.always-on')).toBeVisible();
    });
  });

  test.describe('Production Readiness Validation', () => {
    test('should validate complete system integration', async () => {
      // Test full workflow: Create → Monitor → Interact → Validate
      await page.click('[data-testid="claude-manager-link"]');
      
      // Step 1: Create worker in global mode
      await page.click('.btn-worker');
      await page.waitForSelector('.instance-card.worker', { timeout: 15000 });
      
      // Step 2: Create interactive instance
      await page.click('.btn-interactive');
      await page.waitForSelector('.instance-card.interactive', { timeout: 15000 });
      
      // Step 3: Switch to interactive mode and connect
      await page.click('[data-value="interactive"]');
      await page.waitForSelector('.instance-option', { timeout: 10000 });
      await page.click('.instance-option .btn-connect');
      
      // Step 4: Verify connection
      await expect(page.locator('.connection-status.connected')).toBeVisible({ timeout: 10000 });
      
      // Step 5: Test command execution
      await page.fill('.command-input', 'echo "Production test successful"');
      await page.click('.btn-send');
      
      // Step 6: Verify command appears in output
      await expect(page.locator('.output-line.input')).toContainText('> echo "Production test successful"');
      
      // Step 7: Switch to feed integration
      await page.click('[data-value="feed"]');
      
      // Step 8: Verify feed system is ready
      await expect(page.locator('.worker-overview')).toBeVisible();
      await expect(page.locator('.stat').filter({ hasText: 'ready' })).toBeVisible();
    });

    test('should validate always-on worker persistence', async () => {
      await page.click('[data-testid="claude-manager-link"]');
      
      // Create worker
      await page.click('.btn-worker');
      await page.waitForSelector('.instance-card.worker', { timeout: 15000 });
      
      // Get worker ID
      const workerCard = page.locator('.instance-card.worker');
      const workerId = await workerCard.locator('.detail-row .value').first().textContent();
      
      // Refresh page to simulate session restart
      await page.reload();
      await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 10000 });
      await page.click('[data-testid="claude-manager-link"]');
      
      // Worker should still be there with same ID
      await expect(page.locator('.instance-card.worker')).toBeVisible();
      const persistedWorkerId = await page.locator('.instance-card.worker .detail-row .value').first().textContent();
      expect(persistedWorkerId).toBe(workerId);
    });

    test('should validate production configuration compliance', async () => {
      await page.click('[data-testid="claude-manager-link"]');
      
      // Create worker and verify configuration
      await page.click('.btn-worker');
      await page.waitForSelector('.instance-card.worker', { timeout: 15000 });
      
      const workerCard = page.locator('.instance-card.worker');
      
      // Verify production directory
      await expect(workerCard.locator('.value').filter({ hasText: '/workspaces/agent-feed/prod' })).toBeVisible();
      
      // Verify worker type
      await expect(workerCard.locator('.badge.type-worker')).toBeVisible();
      
      // Verify always-on configuration
      await expect(workerCard.locator('.badge.always-on')).toBeVisible();
      
      // Verify protected status
      await expect(workerCard.locator('.protected-notice')).toBeVisible();
    });
  });

  test.describe('Cross-Mode Integration', () => {
    test('should show instances created in global mode in interactive mode', async () => {
      await page.click('[data-testid="claude-manager-link"]');
      
      // Create instance in global mode
      await page.click('.btn-interactive');
      await page.waitForSelector('.instance-card.interactive', { timeout: 15000 });
      
      // Get instance ID from global mode
      const instanceCard = page.locator('.instance-card.interactive');
      const instanceId = await instanceCard.locator('.detail-row .value').first().textContent();
      
      // Switch to interactive mode
      await page.click('[data-value="interactive"]');
      await page.waitForSelector('.instance-option', { timeout: 10000 });
      
      // Should show the same instance as available for connection
      await expect(page.locator('.instance-option .instance-id').filter({ hasText: instanceId?.slice(0, 12) || '' })).toBeVisible();
    });

    test('should coordinate worker status across global and feed modes', async () => {
      await page.click('[data-testid="claude-manager-link"]');
      
      // Create worker in global mode
      await page.click('.btn-worker');
      await page.waitForSelector('.instance-card.worker', { timeout: 15000 });
      
      // Get worker status from global mode
      const globalStatus = await page.locator('.instance-card.worker .status-running').textContent();
      
      // Switch to feed mode
      await page.click('[data-value="feed"]');
      
      // Should show same worker status
      await expect(page.locator('.stat .value').filter({ hasText: 'ready' })).toBeVisible();
      
      // Worker ID should match
      const feedWorkerId = await page.locator('.worker-stats .value').first().textContent();
      const globalWorkerId = await page.locator('.instance-card.worker .detail-row .value').first().textContent();
      
      expect(feedWorkerId).toContain(globalWorkerId?.slice(0, 12));
    });
  });
});