import { test, expect } from '@playwright/test';
import { InstanceManagerPage } from './page-objects/InstanceManagerPage';
import { mockAPIResponses, mockInstances, apiEndpoints, performanceThresholds, testScenarios } from './fixtures/test-data';

/**
 * Test Suite: Instance Listing and Loading Validation
 * 
 * Validates that:
 * 1. Instance listing loads successfully without "Failed to fetch instances" error
 * 2. Loading states are handled correctly
 * 3. Error states are displayed appropriately
 * 4. Empty states work as expected
 * 5. UI remains responsive during loading
 */
test.describe('Instance Listing and Loading Validation', () => {
  let instancePage: InstanceManagerPage;

  test.beforeEach(async ({ page }) => {
    instancePage = new InstanceManagerPage(page);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup any test-specific mocks
    await page.unrouteAll();
  });

  test.describe('Successful Instance Loading', () => {
    test('should load instances successfully without "Failed to fetch instances" error', async ({ page }) => {
      // Mock successful API response
      await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
      
      // Navigate to instances page
      await instancePage.navigate();
      
      // Verify no error message is displayed
      await expect(instancePage.errorMessage).not.toBeVisible();
      
      // Verify instances are loaded
      const instanceCount = await instancePage.getInstanceCount();
      expect(instanceCount).toBeGreaterThan(0);
      
      // Verify specific instances are displayed
      const instanceNames = await instancePage.getInstanceNames();
      expect(instanceNames).toContain('Test Instance 1');
      expect(instanceNames).toContain('Test Instance 2');
      
      // Verify status indicators are present
      const statuses = await instancePage.getInstanceStatuses();
      expect(statuses.filter(s => s.includes('running'))).toHaveLength(2);
      expect(statuses.filter(s => s.includes('stopped'))).toHaveLength(1);
    });

    test('should display loading indicator initially', async ({ page }) => {
      // Delay API response to test loading state
      await page.route(apiEndpoints.instances.list, async route => {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockAPIResponses.instancesList)
        });
      });
      
      // Navigate to instances page
      const navigation = instancePage.navigate();
      
      // Check loading indicator appears immediately
      await expect(instancePage.loadingIndicator).toBeVisible();
      
      // Wait for navigation to complete
      await navigation;
      
      // Loading should disappear after instances load
      await expect(instancePage.loadingIndicator).not.toBeVisible();
      
      // Instances should be visible
      await expect(instancePage.instanceCards.first()).toBeVisible();
    });

    test('should handle empty instance list gracefully', async ({ page }) => {
      // Mock empty response
      await instancePage.mockInstancesAPI({
        success: true,
        data: []
      });
      
      await instancePage.navigate();
      
      // Should show empty state, not error
      await expect(instancePage.emptyState).toBeVisible();
      await expect(instancePage.errorMessage).not.toBeVisible();
      
      // Empty state should contain helpful message
      const emptyStateText = await instancePage.emptyState.textContent();
      expect(emptyStateText).toContain('No instances');
    });

    test('should refresh instances successfully', async ({ page }) => {
      // Initial mock response
      await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
      
      await instancePage.navigate();
      
      // Verify initial load
      let instanceCount = await instancePage.getInstanceCount();
      expect(instanceCount).toBe(3);
      
      // Mock updated response with more instances
      const updatedInstances = [...mockInstances, {
        id: 'new-instance',
        name: 'New Test Instance',
        type: 'claude-3-haiku' as const,
        status: 'running' as const,
        pid: 54321,
        port: 3003
      }];
      
      await instancePage.mockInstancesAPI({
        success: true,
        data: updatedInstances
      });
      
      // Refresh instances
      await instancePage.refreshInstances();
      
      // Verify updated count
      instanceCount = await instancePage.getInstanceCount();
      expect(instanceCount).toBe(4);
      
      // Verify new instance appears
      const instanceNames = await instancePage.getInstanceNames();
      expect(instanceNames).toContain('New Test Instance');
    });
  });

  test.describe('Error Handling', () => {
    test('should display appropriate error for network failure', async ({ page }) => {
      // Mock network failure
      await instancePage.mockNetworkError();
      
      await instancePage.navigate();
      
      // Should display error message
      await expect(instancePage.errorMessage).toBeVisible();
      
      // Error message should be meaningful
      const errorText = await instancePage.getErrorMessage();
      expect(errorText).toMatch(/failed to fetch|network error|connection failed/i);
      
      // Should not display loading or instances
      await expect(instancePage.loadingIndicator).not.toBeVisible();
      await expect(instancePage.instanceCards.first()).not.toBeVisible();
    });

    test('should display appropriate error for server error', async ({ page }) => {
      // Mock server error (500)
      await instancePage.mockServerError();
      
      await instancePage.navigate();
      
      // Should display error message
      await expect(instancePage.errorMessage).toBeVisible();
      
      // Error message should indicate server problem
      const errorText = await instancePage.getErrorMessage();
      expect(errorText).toMatch(/server error|internal error|500/i);
    });

    test('should allow retry after error', async ({ page }) => {
      // Initially mock network failure
      await instancePage.mockNetworkError();
      
      await instancePage.navigate();
      
      // Verify error state
      await expect(instancePage.errorMessage).toBeVisible();
      
      // Change mock to success
      await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
      
      // Retry by refreshing
      await instancePage.refreshInstances();
      
      // Should now show instances
      await expect(instancePage.errorMessage).not.toBeVisible();
      const instanceCount = await instancePage.getInstanceCount();
      expect(instanceCount).toBeGreaterThan(0);
    });

    test('should handle malformed API response gracefully', async ({ page }) => {
      // Mock malformed response
      await page.route(apiEndpoints.instances.list, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: '{ invalid json'
        });
      });
      
      await instancePage.navigate();
      
      // Should display error for malformed response
      await expect(instancePage.errorMessage).toBeVisible();
      
      const errorText = await instancePage.getErrorMessage();
      expect(errorText).toMatch(/parse error|invalid response/i);
    });
  });

  test.describe('Performance and Responsiveness', () => {
    test('should load page within performance threshold', async ({ page }) => {
      await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
      
      const loadTime = await instancePage.measurePageLoadTime();
      
      expect(loadTime).toBeLessThan(performanceThresholds.pageLoad);
      console.log(`Page load time: ${loadTime}ms`);
    });

    test('should remain responsive during instance loading', async ({ page }) => {
      // Mock slow API response
      await page.route(apiEndpoints.instances.list, async route => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockAPIResponses.instancesList)
        });
      });
      
      // Start navigation
      const navigation = instancePage.navigate();
      
      // UI should be responsive while loading
      await expect(instancePage.createInstanceButton).toBeEnabled();
      await expect(instancePage.refreshButton).toBeEnabled();
      
      // Complete navigation
      await navigation;
    });

    test('should handle rapid successive refreshes', async ({ page }) => {
      await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
      
      await instancePage.navigate();
      
      // Perform multiple rapid refreshes
      for (let i = 0; i < 5; i++) {
        await instancePage.refreshButton.click();
        await page.waitForTimeout(100); // Small delay between clicks
      }
      
      // Should eventually settle and show instances
      await instancePage.waitForInstancesToLoad();
      const instanceCount = await instancePage.getInstanceCount();
      expect(instanceCount).toBeGreaterThan(0);
    });
  });

  test.describe('UI State Management', () => {
    test('should maintain UI state during loading', async ({ page }) => {
      await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
      
      await instancePage.navigate();
      
      // UI elements should be in correct initial state
      await expect(instancePage.createInstanceButton).toBeVisible();
      await expect(instancePage.refreshButton).toBeVisible();
      await expect(instancePage.instancesContainer).toBeVisible();
    });

    test('should update UI state appropriately for different scenarios', async ({ page }) => {
      // Test empty state
      await instancePage.mockInstancesAPI({ success: true, data: [] });
      await instancePage.navigate();
      await expect(instancePage.emptyState).toBeVisible();
      await expect(instancePage.instanceCards.first()).not.toBeVisible();
      
      // Test error state
      await instancePage.mockNetworkError();
      await instancePage.refreshInstances();
      await expect(instancePage.errorMessage).toBeVisible();
      await expect(instancePage.emptyState).not.toBeVisible();
      
      // Test normal state
      await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
      await instancePage.refreshInstances();
      await expect(instancePage.errorMessage).not.toBeVisible();
      await expect(instancePage.emptyState).not.toBeVisible();
      await expect(instancePage.instanceCards.first()).toBeVisible();
    });

    test('should preserve user interactions during state changes', async ({ page }) => {
      await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
      await instancePage.navigate();
      
      // User starts to create instance
      await instancePage.openCreateInstanceModal();
      await expect(instancePage.createModal).toBeVisible();
      
      // Background refresh occurs
      await instancePage.refreshInstances();
      
      // Modal should remain open
      await expect(instancePage.createModal).toBeVisible();
    });
  });

  test.describe('Accessibility and Usability', () => {
    test('should have proper ARIA labels and roles', async ({ page }) => {
      await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
      await instancePage.navigate();
      
      // Check for proper accessibility attributes
      await expect(instancePage.instancesContainer).toHaveAttribute('role');
      await expect(instancePage.createInstanceButton).toHaveAttribute('aria-label');
      await expect(instancePage.refreshButton).toHaveAttribute('aria-label');
      
      // Status indicators should have proper labels
      const runningIndicators = page.locator('[data-status="running"]');
      for (let i = 0; i < await runningIndicators.count(); i++) {
        const indicator = runningIndicators.nth(i);
        await expect(indicator).toHaveAttribute('aria-label');
      }
    });

    test('should be keyboard navigable', async ({ page }) => {
      await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
      await instancePage.navigate();
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      await expect(instancePage.createInstanceButton).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(instancePage.refreshButton).toBeFocused();
      
      // Should be able to activate buttons with keyboard
      await page.keyboard.press('Enter');
      // Refresh should have been triggered
    });

    test('should display meaningful status information', async ({ page }) => {
      await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
      await instancePage.navigate();
      
      // Each instance should have clear status information
      const instanceCards = instancePage.instanceCards;
      const count = await instanceCards.count();
      
      for (let i = 0; i < count; i++) {
        const card = instanceCards.nth(i);
        
        // Should have name
        await expect(card.locator('[data-testid="instance-name"]')).toBeVisible();
        
        // Should have status
        await expect(card.locator('[data-testid="instance-status"]')).toBeVisible();
        
        // Should have actions
        await expect(card.locator('[data-testid="instance-actions"]')).toBeVisible();
      }
    });
  });

  test.describe('Cross-browser Compatibility', () => {
    test('should work consistently across browsers', async ({ page, browserName }) => {
      await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
      await instancePage.navigate();
      
      // Core functionality should work the same
      const instanceCount = await instancePage.getInstanceCount();
      expect(instanceCount).toBe(3);
      
      const instanceNames = await instancePage.getInstanceNames();
      expect(instanceNames).toHaveLength(3);
      
      // Log browser-specific information
      console.log(`Browser: ${browserName}, Instances loaded: ${instanceCount}`);
    });
  });
});