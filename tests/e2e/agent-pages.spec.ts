/**
 * End-to-End Tests for Agent Pages - Playwright Implementation
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Agent Feed - Agent Pages E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Navigate to the agent feed application
    await page.goto('/');
    
    // Wait for the application to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Agent Discovery and Listing', () => {
    test('should display agent feed homepage with navigation', async () => {
      // Verify homepage loads
      await expect(page).toHaveTitle(/Agent Feed/);
      
      // Check for main navigation
      const nav = page.locator('nav');
      await expect(nav).toBeVisible();
      
      // Check for agents link
      const agentsLink = page.locator('a[href*="agents"]');
      await expect(agentsLink).toBeVisible();
    });

    test('should navigate to agents listing page', async () => {
      // Navigate to agents page
      await page.click('text=Agents');
      
      // Verify agents page loads
      await expect(page).toHaveURL(/.*agents.*/);
      await expect(page.locator('h1')).toContainText('Agents');
      
      // Check for agent cards/list
      const agentsList = page.locator('[data-testid="agents-list"]');
      await expect(agentsList).toBeVisible();
    });

    test('should display agent cards with basic information', async () => {
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      // Wait for agents to load
      await page.waitForSelector('[data-testid="agent-card"]', { timeout: 10000 });
      
      const agentCards = page.locator('[data-testid="agent-card"]');
      const cardCount = await agentCards.count();
      
      expect(cardCount).toBeGreaterThan(0);
      
      // Check first agent card has required elements
      const firstCard = agentCards.first();
      await expect(firstCard.locator('[data-testid="agent-name"]')).toBeVisible();
      await expect(firstCard.locator('[data-testid="agent-description"]')).toBeVisible();
      await expect(firstCard.locator('[data-testid="agent-model"]')).toBeVisible();
      await expect(firstCard.locator('[data-testid="agent-tools"]')).toBeVisible();
    });

    test('should support agent filtering by model', async () => {
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      // Wait for agents to load
      await page.waitForSelector('[data-testid="agent-card"]');
      
      // Use model filter
      const modelFilter = page.locator('[data-testid="model-filter"]');
      await modelFilter.selectOption('sonnet');
      
      // Wait for filtered results
      await page.waitForTimeout(1000);
      
      // Verify filtered agents are displayed
      const agentCards = page.locator('[data-testid="agent-card"]');
      const visibleCards = await agentCards.count();
      
      if (visibleCards > 0) {
        // Check that visible agents have sonnet model
        for (let i = 0; i < visibleCards; i++) {
          const modelBadge = agentCards.nth(i).locator('[data-testid="agent-model"]');
          await expect(modelBadge).toContainText('sonnet');
        }
      }
    });

    test('should support agent search functionality', async () => {
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      // Wait for search input
      const searchInput = page.locator('[data-testid="agent-search"]');
      await expect(searchInput).toBeVisible();
      
      // Perform search
      await searchInput.fill('test');
      await searchInput.press('Enter');
      
      // Wait for search results
      await page.waitForTimeout(1000);
      
      // Verify search results
      const agentCards = page.locator('[data-testid="agent-card"]');
      const cardCount = await agentCards.count();
      
      // Either show matching results or "no results" message
      if (cardCount === 0) {
        await expect(page.locator('text=No agents found')).toBeVisible();
      } else {
        // Results should contain search term
        const firstCard = agentCards.first();
        const cardText = await firstCard.textContent();
        expect(cardText?.toLowerCase()).toContain('test');
      }
    });
  });

  test.describe('Individual Agent Pages', () => {
    test('should navigate to individual agent page', async () => {
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      // Wait for agent cards and click first one
      await page.waitForSelector('[data-testid="agent-card"]');
      const firstCard = page.locator('[data-testid="agent-card"]').first();
      
      // Get agent name for verification
      const agentName = await firstCard.locator('[data-testid="agent-name"]').textContent();
      
      // Click on agent card
      await firstCard.click();
      
      // Verify navigation to agent page
      await expect(page).toHaveURL(/.*agents\/.*/, { timeout: 10000 });
      
      // Verify agent page content
      await expect(page.locator('h1')).toContainText(agentName || '');
    });

    test('should display complete agent information', async () => {
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      // Navigate to first agent
      await page.waitForSelector('[data-testid="agent-card"]');
      await page.locator('[data-testid="agent-card"]').first().click();
      
      // Wait for agent page to load
      await page.waitForLoadState('networkidle');
      
      // Check for all required sections
      await expect(page.locator('[data-testid="agent-description"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-tools-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-configuration"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-usage"]')).toBeVisible();
      
      // Check for agent body/documentation
      await expect(page.locator('[data-testid="agent-body"]')).toBeVisible();
    });

    test('should display agent metrics if available', async () => {
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      // Navigate to first agent
      await page.waitForSelector('[data-testid="agent-card"]');
      await page.locator('[data-testid="agent-card"]').first().click();
      await page.waitForLoadState('networkidle');
      
      // Check for metrics section (may not exist for all agents)
      const metricsSection = page.locator('[data-testid="agent-metrics"]');
      const metricsVisible = await metricsSection.isVisible();
      
      if (metricsVisible) {
        await expect(metricsSection.locator('[data-testid="total-invocations"]')).toBeVisible();
        await expect(metricsSection.locator('[data-testid="success-rate"]')).toBeVisible();
        await expect(metricsSection.locator('[data-testid="average-response-time"]')).toBeVisible();
      }
    });

    test('should display workspace information', async () => {
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      // Navigate to first agent
      await page.waitForSelector('[data-testid="agent-card"]');
      await page.locator('[data-testid="agent-card"]').first().click();
      await page.waitForLoadState('networkidle');
      
      // Check for workspace section
      const workspaceSection = page.locator('[data-testid="agent-workspace"]');
      
      if (await workspaceSection.isVisible()) {
        await expect(workspaceSection.locator('[data-testid="workspace-directory"]')).toBeVisible();
        await expect(workspaceSection.locator('[data-testid="workspace-files"]')).toBeVisible();
      }
    });

    test('should handle non-existent agent gracefully', async () => {
      // Navigate to non-existent agent
      await page.goto('/agents/non-existent-agent');
      
      // Should show 404 or appropriate error message
      await expect(page.locator('text=Agent not found')).toBeVisible({ timeout: 10000 });
      
      // Should provide navigation back
      const backLink = page.locator('a[href="/agents"]');
      await expect(backLink).toBeVisible();
    });
  });

  test.describe('Agent Management Interface', () => {
    test('should display sync button and allow agent refresh', async () => {
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      // Check for sync button (admin/management feature)
      const syncButton = page.locator('[data-testid="sync-agents-button"]');
      
      if (await syncButton.isVisible()) {
        const initialCount = await page.locator('[data-testid="agent-card"]').count();
        
        // Click sync button
        await syncButton.click();
        
        // Wait for sync operation
        await page.waitForTimeout(2000);
        
        // Verify page updated
        const newCount = await page.locator('[data-testid="agent-card"]').count();
        expect(newCount).toBeGreaterThanOrEqual(initialCount);
      }
    });

    test('should display agent health status', async () => {
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      // Check for health indicators on agent cards
      const agentCards = page.locator('[data-testid="agent-card"]');
      
      if (await agentCards.count() > 0) {
        const firstCard = agentCards.first();
        const healthIndicator = firstCard.locator('[data-testid="agent-health"]');
        
        // Health indicator might be present
        if (await healthIndicator.isVisible()) {
          const healthText = await healthIndicator.textContent();
          expect(['healthy', 'warning', 'error']).toContain(healthText?.toLowerCase() || '');
        }
      }
    });
  });

  test.describe('Responsive Design and Performance', () => {
    test('should be responsive on mobile devices', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      // Check mobile navigation
      const mobileNav = page.locator('[data-testid="mobile-nav"]');
      if (await mobileNav.isVisible()) {
        await expect(mobileNav).toBeVisible();
      }
      
      // Check responsive agent cards
      const agentCards = page.locator('[data-testid="agent-card"]');
      
      if (await agentCards.count() > 0) {
        const firstCard = agentCards.first();
        const cardRect = await firstCard.boundingBox();
        
        // Card should fit mobile screen
        expect(cardRect?.width).toBeLessThanOrEqual(375);
      }
    });

    test('should load within performance budget', async () => {
      const startTime = Date.now();
      
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Page should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
      
      // Check for agent cards to ensure content loaded
      await page.waitForSelector('[data-testid="agent-card"]', { timeout: 2000 });
    });

    test('should handle large numbers of agents efficiently', async () => {
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      // Check for pagination or virtual scrolling if many agents
      const agentCards = page.locator('[data-testid="agent-card"]');
      const cardCount = await agentCards.count();
      
      if (cardCount > 20) {
        // Should have pagination
        const pagination = page.locator('[data-testid="pagination"]');
        await expect(pagination).toBeVisible();
        
        // Test pagination
        const nextButton = pagination.locator('button:has-text("Next")');
        if (await nextButton.isEnabled()) {
          await nextButton.click();
          await page.waitForLoadState('networkidle');
          
          // Should load next page
          await expect(page.locator('[data-testid="agent-card"]')).toHaveCount(cardCount);
        }
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should meet accessibility standards', async () => {
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      // Check for proper heading structure
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
      
      // Check for proper ARIA labels
      const searchInput = page.locator('[data-testid="agent-search"]');
      if (await searchInput.isVisible()) {
        const ariaLabel = await searchInput.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
      }
      
      // Check keyboard navigation
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });

    test('should support keyboard navigation', async () => {
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      // Navigate with keyboard
      await page.keyboard.press('Tab'); // Focus first interactive element
      
      // Continue tabbing to agent cards
      let tabCount = 0;
      while (tabCount < 10) {
        await page.keyboard.press('Tab');
        tabCount++;
        
        const focusedElement = await page.evaluate(() => {
          const focused = document.activeElement;
          return focused ? {
            tagName: focused.tagName,
            className: focused.className,
            testId: focused.getAttribute('data-testid')
          } : null;
        });
        
        if (focusedElement?.testId === 'agent-card') {
          // Can activate with Enter or Space
          await page.keyboard.press('Enter');
          
          // Should navigate to agent page
          await expect(page).toHaveURL(/.*agents\/.*/);
          break;
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Simulate network failure
      await page.route('**/api/agents**', route => route.abort());
      
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      // Should show error message
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
      
      // Should provide retry option
      const retryButton = page.locator('[data-testid="retry-button"]');
      await expect(retryButton).toBeVisible();
    });

    test('should handle empty agent list gracefully', async () => {
      // Mock empty response
      await page.route('**/api/agents**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [], message: 'No agents found' })
        });
      });
      
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      // Should show empty state
      const emptyState = page.locator('[data-testid="empty-state"]');
      await expect(emptyState).toBeVisible();
      
      // Should suggest next steps
      await expect(page.locator('text=No agents found')).toBeVisible();
    });

    test('should handle API errors gracefully', async () => {
      // Mock API error
      await page.route('**/api/agents**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'Internal server error' })
        });
      });
      
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      // Should show appropriate error
      await expect(page.locator('text=Error loading agents')).toBeVisible({ timeout: 10000 });
    });
  });
});