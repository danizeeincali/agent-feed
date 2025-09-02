import { test, expect } from '@playwright/test';
import ClaudeCodeTestHelpers from '../utils/test-helpers';

/**
 * Regression Tests for Existing Functionality
 * 
 * Tests:
 * - Previous functionality still works
 * - Claude Code API integration remains stable
 * - Instance management and cleanup
 * - Error handling and recovery
 * - UI component stability
 */

test.describe('Regression Tests - Existing Functionality', () => {
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

  test('should maintain API endpoint stability', async ({ page }) => {
    test.setTimeout(90000);
    
    // Test core API endpoints that must remain stable
    const apiEndpoints = [
      '/api/claude/instances',
      '/api/v1/agent-posts',
      '/api/v1/claude-live/prod/agents',
      '/api/v1/claude-live/prod/activities'
    ];
    
    for (const endpoint of apiEndpoints) {
      const response = await page.request.get(`http://localhost:8080${endpoint}`);
      
      // API should be reachable and return valid response
      expect(response.status()).toBeLessThan(500);
      
      if (response.ok()) {
        const contentType = response.headers()['content-type'] || '';
        expect(contentType).toContain('application/json');
        
        // Verify JSON structure is valid
        try {
          const data = await response.json();
          expect(data).toBeDefined();
        } catch (error) {
          throw new Error(`Invalid JSON response from ${endpoint}: ${error}`);
        }
      }
    }
  });

  test('should preserve navigation and routing functionality', async ({ page }) => {
    test.setTimeout(120000);
    
    // Test that all main navigation routes still work
    const routes = [
      '/',
      '/claude-instances',
      '/dual-instance',
      '/agents',
      '/workflows',
      '/claude-code',
      '/analytics',
      '/settings'
    ];
    
    for (const route of routes) {
      await page.goto(route, { waitUntil: 'networkidle' });
      
      // Verify page loads without errors
      await page.waitForSelector('main[data-testid="agent-feed"]', { timeout: 10000 });
      
      // Check for error boundaries or crash indicators
      const errorBoundary = page.locator('[data-testid="error-boundary"]');
      const whiteScreen = page.locator('body:has-text("")');
      
      expect(await errorBoundary.count()).toBe(0);
      
      // Verify page has content
      const mainContent = page.locator('main');
      const hasContent = await mainContent.count() > 0;
      expect(hasContent).toBe(true);
    }
  });

  test('should maintain Claude instance CRUD operations', async ({ page }) => {
    test.setTimeout(150000);
    
    await helpers.navigateToClaudeInstances();
    
    // Test Create operation
    const initialCount = await helpers.waitForInstancesLoad();
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    
    // Verify instance was created
    const afterCreateCount = await helpers.waitForInstancesLoad();
    expect(afterCreateCount).toBe(initialCount + 1);
    
    // Test Read operation (instance appears in list)
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await expect(instanceCard).toBeVisible();
    await expect(instanceCard.locator('[data-testid="instance-status"]')).toHaveText('Active');
    
    // Test Update operation (interaction with instance)
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    const messages = await helpers.sendMessageToInstance(instanceId, "Test update operation");
    expect(messages.length).toBeGreaterThanOrEqual(2);
    
    // Return to instances list
    await helpers.navigateToClaudeInstances();
    
    // Test Delete operation
    const deleteButton = instanceCard.locator('[data-testid="delete-instance"]');
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      const confirmButton = page.locator('[data-testid="confirm-delete"]');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      // Verify instance is removed
      await page.waitForFunction(
        (id) => !document.querySelector(`[data-instance-id="${id}"]`),
        instanceId,
        { timeout: 10000 }
      );
      
      createdInstances = createdInstances.filter(id => id !== instanceId);
      
      const afterDeleteCount = await helpers.waitForInstancesLoad();
      expect(afterDeleteCount).toBe(initialCount);
    }
  });

  test('should maintain WebSocket connection stability', async ({ page }) => {
    test.setTimeout(120000);
    
    // Monitor WebSocket events
    const webSocketEvents: string[] = [];
    
    page.on('websocket', ws => {
      webSocketEvents.push('connection_opened');
      
      ws.on('close', () => webSocketEvents.push('connection_closed'));
      ws.on('socketerror', () => webSocketEvents.push('connection_error'));
    });
    
    await helpers.navigateToClaudeInstances();
    
    // Create instance to trigger WebSocket usage
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    // Wait for WebSocket connection
    await helpers.waitForWebSocketConnection();
    
    // Test WebSocket communication
    await helpers.sendMessageToInstance(instanceId, "WebSocket regression test");
    
    // Verify WebSocket connection was established
    expect(webSocketEvents).toContain('connection_opened');
    expect(webSocketEvents).not.toContain('connection_error');
  });

  test('should preserve error handling mechanisms', async ({ page }) => {
    test.setTimeout(90000);
    
    // Test navigation to non-existent route
    await page.goto('/non-existent-route', { waitUntil: 'networkidle' });
    
    // Should show 404 fallback, not crash
    const notFoundFallback = page.locator('[data-testid="not-found-fallback"], .not-found, h1:has-text("404")');
    await expect(notFoundFallback.first()).toBeVisible({ timeout: 10000 });
    
    // Test API error handling
    await page.route('/api/claude/instances', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    await helpers.navigateToClaudeInstances();
    
    // Should handle API error gracefully
    const errorFallback = page.locator('[data-testid="error-fallback"], .error-message');
    // Either show error fallback or loading state, but not crash
    const hasErrorHandling = await errorFallback.count() > 0;
    const hasLoadingState = await page.locator('[data-testid="loading-spinner"]').count() > 0;
    
    expect(hasErrorHandling || hasLoadingState).toBe(true);
    
    // Remove route override
    await page.unroute('/api/claude/instances');
  });

  test('should maintain UI component responsiveness', async ({ page }) => {
    test.setTimeout(120000);
    
    await helpers.navigateToClaudeInstances();
    
    // Test responsive design elements
    const viewports = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 768, height: 1024 },  // Tablet
      { width: 375, height: 667 }    // Mobile
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      
      // Wait for layout adjustment
      await page.waitForTimeout(1000);
      
      // Verify main components are visible and accessible
      const header = page.locator('header[data-testid="header"]');
      const mainContent = page.locator('main[data-testid="agent-feed"]');
      
      await expect(header).toBeVisible();
      await expect(mainContent).toBeVisible();
      
      // Test mobile navigation if applicable
      if (viewport.width <= 768) {
        const menuButton = page.locator('button:has([data-testid="menu-icon"])');
        if (await menuButton.isVisible()) {
          await menuButton.click();
          
          // Sidebar should appear
          const sidebar = page.locator('[data-testid="mobile-sidebar"]');
          // Allow for different sidebar implementations
          const sidebarVisible = await sidebar.isVisible() || 
                                 await page.locator('nav').first().isVisible();
          expect(sidebarVisible).toBe(true);
        }
      }
    }
    
    // Reset to desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should maintain performance characteristics', async ({ page }) => {
    test.setTimeout(120000);
    
    // Measure page load performance
    const startTime = Date.now();
    await helpers.navigateToClaudeInstances();
    const loadTime = Date.now() - startTime;
    
    // Page should load within reasonable time
    expect(loadTime).toBeLessThan(10000); // 10 seconds max
    
    // Measure interaction performance
    const instanceCreationStart = Date.now();
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    const instanceCreationTime = Date.now() - instanceCreationStart;
    
    // Instance creation should be responsive
    expect(instanceCreationTime).toBeLessThan(30000); // 30 seconds max
    
    // Measure message sending performance
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    const messageStart = Date.now();
    await helpers.sendMessageToInstance(instanceId, "Performance test message");
    const messageTime = Date.now() - messageStart;
    
    // Message interaction should be responsive
    expect(messageTime).toBeLessThan(15000); // 15 seconds max for response
  });

  test('should preserve accessibility features', async ({ page }) => {
    test.setTimeout(90000);
    
    await helpers.navigateToClaudeInstances();
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    
    // Focus should be visible on interactive elements
    const focusedElement = await page.locator(':focus').first();
    const isFocusVisible = await focusedElement.count() > 0;
    expect(isFocusVisible).toBe(true);
    
    // Test ARIA labels and roles
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      // At least some buttons should have accessible names
      const accessibleButtons = await buttons.filter({
        has: page.locator('[aria-label], [title]')
      }).or(buttons.filter({
        hasText: /.+/ // Has visible text
      }));
      
      const accessibleCount = await accessibleButtons.count();
      expect(accessibleCount).toBeGreaterThan(0);
    }
    
    // Test color contrast (basic check)
    const backgroundElements = page.locator('body, main, .bg-white, .bg-gray-50');
    for (let i = 0; i < Math.min(await backgroundElements.count(), 3); i++) {
      const element = backgroundElements.nth(i);
      const styles = await element.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color
        };
      });
      
      // Basic check that colors are defined
      expect(styles.backgroundColor).not.toBe('');
      expect(styles.color).not.toBe('');
    }
  });

  test('should handle browser refresh and state persistence', async ({ page }) => {
    test.setTimeout(120000);
    
    // Create an instance
    await helpers.navigateToClaudeInstances();
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    
    // Interact with instance
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    await helpers.sendMessageToInstance(instanceId, "State persistence test");
    
    // Refresh the page
    await page.reload({ waitUntil: 'networkidle' });
    
    // Navigate back to instances
    await helpers.navigateToClaudeInstances();
    
    // Instance should still exist
    const persistedInstanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await expect(persistedInstanceCard).toBeVisible({ timeout: 10000 });
    
    // Instance should still be functional
    await persistedInstanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    const postRefreshMessages = await helpers.sendMessageToInstance(instanceId, "Post-refresh test");
    expect(postRefreshMessages.length).toBeGreaterThanOrEqual(2);
  });
});