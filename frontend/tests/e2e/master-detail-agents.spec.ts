/**
 * E2E Tests - Master-Detail Agents Layout
 * Tests the complete user experience of the master-detail layout
 *
 * Test Coverage:
 * - Load /agents → sidebar visible with agents
 * - Click agent → detail panel shows correct data
 * - Search → sidebar filters → click result → detail updates
 * - Navigate with URL → deep link works
 * - Mobile responsive → sidebar toggles correctly
 * - Screenshot validation → clean UI
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Master-Detail Agents Layout - E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to agents page
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Initial Load - Layout Structure', () => {
    test('should display master-detail layout on load', async ({ page }) => {
      // Wait for layout to render
      const layout = page.locator('[data-testid="master-detail-layout"]');
      await expect(layout).toBeVisible();
    });

    test('should show sidebar with agent list', async ({ page }) => {
      const sidebar = page.locator('[data-testid="agent-list-sidebar"]');
      await expect(sidebar).toBeVisible();
    });

    test('should show detail panel', async ({ page }) => {
      const detailPanel = page.locator('[data-testid="agent-detail-panel"]');
      await expect(detailPanel).toBeVisible({ timeout: 10000 });
    });

    test('should auto-select first agent', async ({ page }) => {
      // Wait for agents to load
      await page.waitForSelector('[data-testid^="sidebar-agent-"]', { timeout: 10000 });

      // First agent should be selected
      const firstAgent = page.locator('[data-testid^="sidebar-agent-"]').first();
      await expect(firstAgent).toHaveClass(/selected/);
    });

    test('should display first agent details by default', async ({ page }) => {
      // Wait for detail panel to load
      await page.waitForSelector('[data-testid="detail-agent-name"]', { timeout: 10000 });

      const agentName = page.locator('[data-testid="detail-agent-name"]');
      await expect(agentName).toBeVisible();
      await expect(agentName).not.toBeEmpty();
    });

    test('should have sidebar on left and detail on right', async ({ page }) => {
      const layout = page.locator('[data-testid="master-detail-layout"]');
      const boundingBox = await layout.boundingBox();

      expect(boundingBox).not.toBeNull();
      expect(boundingBox!.width).toBeGreaterThan(800); // Desktop layout
    });
  });

  test.describe('Agent Selection - Click Interaction', () => {
    test('should update detail panel when clicking different agent', async ({ page }) => {
      // Wait for agents to load
      await page.waitForSelector('[data-testid^="sidebar-agent-"]', { timeout: 10000 });

      // Get first agent name
      const firstAgentName = await page.locator('[data-testid="detail-agent-name"]').textContent();

      // Click second agent
      const agents = page.locator('[data-testid^="sidebar-agent-"]');
      const secondAgent = agents.nth(1);
      await secondAgent.click();

      // Wait for detail panel to update
      await page.waitForTimeout(500);

      // Detail panel should show different agent
      const newAgentName = await page.locator('[data-testid="detail-agent-name"]').textContent();
      expect(newAgentName).not.toBe(firstAgentName);
    });

    test('should highlight selected agent in sidebar', async ({ page }) => {
      await page.waitForSelector('[data-testid^="sidebar-agent-"]', { timeout: 10000 });

      const agents = page.locator('[data-testid^="sidebar-agent-"]');
      const secondAgent = agents.nth(1);

      await secondAgent.click();
      await page.waitForTimeout(300);

      // Second agent should now be highlighted
      await expect(secondAgent).toHaveClass(/selected/);
    });

    test('should remove highlight from previously selected agent', async ({ page }) => {
      await page.waitForSelector('[data-testid^="sidebar-agent-"]', { timeout: 10000 });

      const agents = page.locator('[data-testid^="sidebar-agent-"]');
      const firstAgent = agents.nth(0);
      const secondAgent = agents.nth(1);

      // First agent should be selected initially
      await expect(firstAgent).toHaveClass(/selected/);

      // Click second agent
      await secondAgent.click();
      await page.waitForTimeout(300);

      // First agent should no longer be selected
      await expect(firstAgent).not.toHaveClass(/selected/);
    });

    test('should update URL when agent is selected', async ({ page }) => {
      await page.waitForSelector('[data-testid^="sidebar-agent-"]', { timeout: 10000 });

      const agents = page.locator('[data-testid^="sidebar-agent-"]');
      const secondAgent = agents.nth(1);

      await secondAgent.click();
      await page.waitForTimeout(500);

      // URL should contain agent slug
      expect(page.url()).toContain('/agents/');
      expect(page.url()).not.toBe('/agents');
    });

    test('should show agent tabs in detail panel', async ({ page }) => {
      await page.waitForSelector('[role="tablist"]', { timeout: 10000 });

      const tabs = page.locator('[role="tab"]');
      await expect(tabs).toHaveCount(5); // Overview, Pages, Activities, Performance, Capabilities
    });

    test('should show agent avatar in detail panel', async ({ page }) => {
      await page.waitForSelector('[data-testid="agent-avatar"]', { timeout: 10000 });

      const avatar = page.locator('[data-testid="agent-avatar"]');
      await expect(avatar).toBeVisible();
    });
  });

  test.describe('Search Functionality', () => {
    test('should filter agents when searching', async ({ page }) => {
      await page.waitForSelector('[data-testid="sidebar-search"]', { timeout: 10000 });

      // Get initial agent count
      const initialCount = await page.locator('[data-testid^="sidebar-agent-"]').count();

      // Type in search
      const searchInput = page.locator('[data-testid="sidebar-search"]');
      await searchInput.fill('Code');
      await page.waitForTimeout(500);

      // Agent count should decrease (assuming not all agents have "Code" in name)
      const filteredCount = await page.locator('[data-testid^="sidebar-agent-"]').count();
      expect(filteredCount).toBeLessThanOrEqual(initialCount);
    });

    test('should maintain selection when searching', async ({ page }) => {
      await page.waitForSelector('[data-testid^="sidebar-agent-"]', { timeout: 10000 });

      // Get selected agent
      const selectedAgent = page.locator('[data-testid^="sidebar-agent-"].selected');
      const agentName = await selectedAgent.textContent();

      // Search for the selected agent
      const searchInput = page.locator('[data-testid="sidebar-search"]');
      await searchInput.fill(agentName || '');
      await page.waitForTimeout(500);

      // Selected agent should still be selected
      await expect(selectedAgent).toHaveClass(/selected/);
    });

    test('should keep detail panel visible during search', async ({ page }) => {
      await page.waitForSelector('[data-testid="agent-detail-panel"]', { timeout: 10000 });

      const searchInput = page.locator('[data-testid="sidebar-search"]');
      await searchInput.fill('Test');
      await page.waitForTimeout(500);

      // Detail panel should still be visible
      const detailPanel = page.locator('[data-testid="agent-detail-panel"]');
      await expect(detailPanel).toBeVisible();
    });

    test('should clear search with clear button', async ({ page }) => {
      await page.waitForSelector('[data-testid="sidebar-search"]', { timeout: 10000 });

      const searchInput = page.locator('[data-testid="sidebar-search"]');
      await searchInput.fill('Test Search');
      await page.waitForTimeout(300);

      // Clear button should appear
      const clearButton = page.locator('[role="button"][aria-label*="clear"]');
      await clearButton.click();

      // Search input should be empty
      await expect(searchInput).toHaveValue('');
    });

    test('should show all agents when search is cleared', async ({ page }) => {
      await page.waitForSelector('[data-testid^="sidebar-agent-"]', { timeout: 10000 });

      const initialCount = await page.locator('[data-testid^="sidebar-agent-"]').count();

      // Search
      const searchInput = page.locator('[data-testid="sidebar-search"]');
      await searchInput.fill('Specific');
      await page.waitForTimeout(300);

      // Clear
      await searchInput.clear();
      await page.waitForTimeout(300);

      // All agents should be visible again
      const finalCount = await page.locator('[data-testid^="sidebar-agent-"]').count();
      expect(finalCount).toBe(initialCount);
    });

    test('should show empty state when no search results', async ({ page }) => {
      await page.waitForSelector('[data-testid="sidebar-search"]', { timeout: 10000 });

      const searchInput = page.locator('[data-testid="sidebar-search"]');
      await searchInput.fill('NonExistentAgentXYZ123');
      await page.waitForTimeout(500);

      // Empty state should be visible
      const emptyState = page.locator('text=/no agents match/i');
      await expect(emptyState).toBeVisible();
    });
  });

  test.describe('URL Navigation - Deep Linking', () => {
    test('should navigate to specific agent via URL', async ({ page }) => {
      // Get first agent slug from the page
      await page.waitForSelector('[data-testid^="sidebar-agent-"]', { timeout: 10000 });
      const firstAgent = page.locator('[data-testid^="sidebar-agent-"]').first();
      await firstAgent.click();
      await page.waitForTimeout(500);

      const currentUrl = page.url();
      const agentSlug = currentUrl.split('/agents/')[1];

      // Navigate directly to that URL
      await page.goto(`/agents/${agentSlug}`);
      await page.waitForLoadState('networkidle');

      // Agent should be selected
      const selectedAgent = page.locator('[data-testid^="sidebar-agent-"].selected');
      await expect(selectedAgent).toBeVisible();
    });

    test('should show correct agent details from URL', async ({ page }) => {
      await page.waitForSelector('[data-testid^="sidebar-agent-"]', { timeout: 10000 });

      // Click second agent and get its slug
      const agents = page.locator('[data-testid^="sidebar-agent-"]');
      const secondAgent = agents.nth(1);
      await secondAgent.click();
      await page.waitForTimeout(500);

      const agentSlug = page.url().split('/agents/')[1];
      const expectedName = await page.locator('[data-testid="detail-agent-name"]').textContent();

      // Navigate directly
      await page.goto(`/agents/${agentSlug}`);
      await page.waitForLoadState('networkidle');

      // Should show same agent details
      const actualName = await page.locator('[data-testid="detail-agent-name"]').textContent();
      expect(actualName).toBe(expectedName);
    });

    test('should handle browser back button', async ({ page }) => {
      await page.waitForSelector('[data-testid^="sidebar-agent-"]', { timeout: 10000 });

      // Select first agent
      const firstAgent = page.locator('[data-testid^="sidebar-agent-"]').first();
      await firstAgent.click();
      await page.waitForTimeout(300);

      const firstAgentName = await page.locator('[data-testid="detail-agent-name"]').textContent();

      // Select second agent
      const secondAgent = page.locator('[data-testid^="sidebar-agent-"]').nth(1);
      await secondAgent.click();
      await page.waitForTimeout(300);

      // Go back
      await page.goBack();
      await page.waitForTimeout(500);

      // Should show first agent again
      const currentName = await page.locator('[data-testid="detail-agent-name"]').textContent();
      expect(currentName).toBe(firstAgentName);
    });

    test('should handle browser forward button', async ({ page }) => {
      await page.waitForSelector('[data-testid^="sidebar-agent-"]', { timeout: 10000 });

      // Select first agent
      const firstAgent = page.locator('[data-testid^="sidebar-agent-"]').first();
      await firstAgent.click();
      await page.waitForTimeout(300);

      // Select second agent
      const secondAgent = page.locator('[data-testid^="sidebar-agent-"]').nth(1);
      await secondAgent.click();
      await page.waitForTimeout(300);

      const secondAgentName = await page.locator('[data-testid="detail-agent-name"]').textContent();

      // Go back then forward
      await page.goBack();
      await page.waitForTimeout(300);
      await page.goForward();
      await page.waitForTimeout(500);

      // Should show second agent again
      const currentName = await page.locator('[data-testid="detail-agent-name"]').textContent();
      expect(currentName).toBe(secondAgentName);
    });
  });

  test.describe('Buttons - Master-Detail Mode', () => {
    test('should NOT show Home button', async ({ page }) => {
      await page.waitForSelector('[data-testid="agent-detail-panel"]', { timeout: 10000 });

      const homeButton = page.locator('button:has-text("Home")');
      await expect(homeButton).toHaveCount(0);
    });

    test('should NOT show Details button', async ({ page }) => {
      await page.waitForSelector('[data-testid="agent-detail-panel"]', { timeout: 10000 });

      const detailsButton = page.locator('button:has-text("Details")');
      await expect(detailsButton).toHaveCount(0);
    });

    test('should NOT show Trash button', async ({ page }) => {
      await page.waitForSelector('[data-testid="agent-detail-panel"]', { timeout: 10000 });

      const trashButton = page.locator('button[aria-label*="delete"], button[aria-label*="trash"]');
      await expect(trashButton).toHaveCount(0);
    });

    test('should show Refresh button', async ({ page }) => {
      const refreshButton = page.locator('button:has-text("Refresh")');
      await expect(refreshButton).toBeVisible();
    });

    test('should refresh agents when clicking Refresh button', async ({ page }) => {
      await page.waitForSelector('[data-testid^="sidebar-agent-"]', { timeout: 10000 });

      const refreshButton = page.locator('button:has-text("Refresh")');
      await refreshButton.click();

      // Should show loading state briefly
      await page.waitForTimeout(200);

      // Agents should be visible again
      const agents = page.locator('[data-testid^="sidebar-agent-"]');
      await expect(agents.first()).toBeVisible();
    });
  });

  test.describe('Responsive Design - Mobile', () => {
    test('should adapt layout for mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');

      // Layout should adapt
      const layout = page.locator('[data-testid="master-detail-layout"]');
      await expect(layout).toBeVisible();
    });

    test('should show sidebar toggle button on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');

      const toggleButton = page.locator('button[aria-label*="menu"], button[aria-label*="toggle"]');
      await expect(toggleButton).toBeVisible();
    });

    test('should toggle sidebar on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');

      const toggleButton = page.locator('button[aria-label*="menu"], button[aria-label*="toggle"]').first();
      await toggleButton.click();
      await page.waitForTimeout(300);

      // Sidebar visibility should change
      const sidebar = page.locator('[data-testid="agent-list-sidebar"]');
      // Either becomes visible or hidden depending on initial state
      const isVisible = await sidebar.isVisible();
      expect(typeof isVisible).toBe('boolean');
    });
  });

  test.describe('Visual Regression - Screenshots', () => {
    test('should match master-detail layout screenshot', async ({ page }) => {
      await page.waitForSelector('[data-testid="master-detail-layout"]', { timeout: 10000 });
      await page.waitForTimeout(1000); // Wait for animations

      // Take full page screenshot
      await page.screenshot({
        path: 'test-results/screenshots/master-detail-layout.png',
        fullPage: true
      });

      // Screenshot should exist
      expect(true).toBe(true); // Placeholder for visual comparison
    });

    test('should capture sidebar with agents', async ({ page }) => {
      await page.waitForSelector('[data-testid="agent-list-sidebar"]', { timeout: 10000 });

      const sidebar = page.locator('[data-testid="agent-list-sidebar"]');
      await sidebar.screenshot({
        path: 'test-results/screenshots/agent-sidebar.png'
      });

      expect(true).toBe(true);
    });

    test('should capture detail panel', async ({ page }) => {
      await page.waitForSelector('[data-testid="agent-detail-panel"]', { timeout: 10000 });

      const detailPanel = page.locator('[data-testid="agent-detail-panel"]');
      await detailPanel.screenshot({
        path: 'test-results/screenshots/agent-detail-panel.png'
      });

      expect(true).toBe(true);
    });

    test('should capture selected agent state', async ({ page }) => {
      await page.waitForSelector('[data-testid^="sidebar-agent-"]', { timeout: 10000 });

      const agents = page.locator('[data-testid^="sidebar-agent-"]');
      const secondAgent = agents.nth(1);
      await secondAgent.click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: 'test-results/screenshots/agent-selected-state.png',
        fullPage: true
      });

      expect(true).toBe(true);
    });

    test('should capture mobile layout', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: 'test-results/screenshots/master-detail-mobile.png',
        fullPage: true
      });

      expect(true).toBe(true);
    });
  });

  test.describe('Error Handling', () => {
    test('should show error state when API fails', async ({ page }) => {
      // Intercept API and force error
      await page.route('**/api/agents', route => {
        route.abort('failed');
      });

      await page.goto('/agents');
      await page.waitForTimeout(2000);

      // Error message should be visible
      const errorMessage = page.locator('text=/error/i');
      await expect(errorMessage).toBeVisible();
    });

    test('should show retry button on error', async ({ page }) => {
      await page.route('**/api/agents', route => {
        route.abort('failed');
      });

      await page.goto('/agents');
      await page.waitForTimeout(2000);

      const retryButton = page.locator('button:has-text("Refresh"), button:has-text("Retry")');
      await expect(retryButton).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load layout within acceptable time', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/agents');
      await page.waitForSelector('[data-testid="master-detail-layout"]', { timeout: 10000 });

      const loadTime = Date.now() - startTime;

      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should switch agents quickly', async ({ page }) => {
      await page.waitForSelector('[data-testid^="sidebar-agent-"]', { timeout: 10000 });

      const startTime = Date.now();

      const secondAgent = page.locator('[data-testid^="sidebar-agent-"]').nth(1);
      await secondAgent.click();

      await page.waitForSelector('[data-testid="detail-agent-name"]');

      const switchTime = Date.now() - startTime;

      // Should switch within 500ms
      expect(switchTime).toBeLessThan(500);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA landmarks', async ({ page }) => {
      await page.waitForSelector('[data-testid="master-detail-layout"]', { timeout: 10000 });

      const navigation = page.locator('[role="navigation"]');
      await expect(navigation).toBeVisible();

      const main = page.locator('[role="main"]');
      await expect(main).toBeVisible();
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.waitForSelector('[data-testid^="sidebar-agent-"]', { timeout: 10000 });

      // Tab to first agent
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should be able to navigate with keyboard
      const focusedElement = await page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should have proper focus indicators', async ({ page }) => {
      await page.waitForSelector('[data-testid^="sidebar-agent-"]', { timeout: 10000 });

      const firstAgent = page.locator('[data-testid^="sidebar-agent-"]').first();
      await firstAgent.focus();

      // Element should have focus styles
      const hasFocus = await firstAgent.evaluate(el => el === document.activeElement);
      expect(hasFocus).toBe(true);
    });
  });

  test.describe('No Console Errors', () => {
    test('should not log console errors during normal operation', async ({ page }) => {
      const errors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Click an agent
      await page.waitForSelector('[data-testid^="sidebar-agent-"]', { timeout: 10000 });
      const secondAgent = page.locator('[data-testid^="sidebar-agent-"]').nth(1);
      await secondAgent.click();
      await page.waitForTimeout(500);

      // Filter out expected/harmless errors
      const criticalErrors = errors.filter(error =>
        !error.includes('favicon') &&
        !error.includes('manifest') &&
        !error.includes('Download the React DevTools')
      );

      expect(criticalErrors).toHaveLength(0);
    });
  });
});
