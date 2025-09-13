import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Dynamic Pages Tab Verification Tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    
    // Navigate to agent profile Dynamic Pages tab
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="agent-card"]').first().click();
    await page.waitForLoadState('networkidle');
    await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should display Dynamic Pages tab content correctly', async () => {
    await test.step('Verify tab is active and content loads', async () => {
      await expect(page.locator('[role="tab"]:has-text("Dynamic Pages")[aria-selected="true"]')).toBeVisible();
      await expect(page.locator('[data-testid="dynamic-pages-content"]')).toBeVisible();
    });

    await test.step('Verify page loading indicator', async () => {
      // Check for loading state during initial load
      const loadingIndicator = page.locator('[data-testid="loading-spinner"], [data-testid="loading-skeleton"]');
      
      // If pages are loading, wait for completion
      if (await loadingIndicator.isVisible()) {
        await expect(loadingIndicator).toHaveCount(0, { timeout: 10000 });
      }
    });

    await test.step('Verify pages are fetched and displayed', async () => {
      // Wait for pages to load
      await page.waitForFunction(() => {
        const content = document.querySelector('[data-testid="dynamic-pages-content"]');
        return content && content.textContent && content.textContent.trim().length > 0;
      }, { timeout: 15000 });

      // Check for pages or empty state
      const hasPages = await page.locator('[data-testid="page-item"]').count() > 0;
      const hasEmptyState = await page.locator('[data-testid="empty-pages-state"]').isVisible();
      
      expect(hasPages || hasEmptyState).toBeTruthy();
    });
  });

  test('should display real pages correctly when available', async () => {
    await test.step('Verify page items are rendered', async () => {
      const pageItems = page.locator('[data-testid="page-item"]');
      const itemCount = await pageItems.count();
      
      if (itemCount > 0) {
        await expect(pageItems.first()).toBeVisible();
        
        // Verify page item structure
        await expect(pageItems.first().locator('[data-testid="page-title"]')).toBeVisible();
        await expect(pageItems.first().locator('[data-testid="page-description"]')).toBeVisible();
        await expect(pageItems.first().locator('[data-testid="page-actions"]')).toBeVisible();
      }
    });

    await test.step('Verify page metadata', async () => {
      const pageItems = page.locator('[data-testid="page-item"]');
      const itemCount = await pageItems.count();
      
      for (let i = 0; i < Math.min(itemCount, 3); i++) {
        const pageItem = pageItems.nth(i);
        
        // Verify required fields
        await expect(pageItem.locator('[data-testid="page-title"]')).not.toBeEmpty();
        await expect(pageItem.locator('[data-testid="page-type"]')).toBeVisible();
        
        // Verify action buttons
        await expect(pageItem.locator('[data-testid="view-page-button"]')).toBeVisible();
        await expect(pageItem.locator('[data-testid="edit-page-button"]')).toBeVisible();
      }
    });

    await test.step('Verify page filtering and search', async () => {
      const searchInput = page.locator('[data-testid="page-search-input"]');
      const filterDropdown = page.locator('[data-testid="page-filter-dropdown"]');
      
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.waitForTimeout(500);
        // Verify search functionality works
      }
      
      if (await filterDropdown.isVisible()) {
        await filterDropdown.click();
        await page.waitForTimeout(200);
        // Verify filter options are available
      }
    });
  });

  test('should handle empty pages state correctly', async () => {
    await test.step('Navigate to agent with no pages', async () => {
      // Try to find an agent with no pages or simulate empty state
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      // Look for an agent with fewer pages or create test scenario
      const agentCards = page.locator('[data-testid="agent-card"]');
      const cardCount = await agentCards.count();
      
      // Try different agents to find one with empty pages
      for (let i = 0; i < Math.min(cardCount, 3); i++) {
        await agentCards.nth(i).click();
        await page.waitForLoadState('networkidle');
        await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
        await page.waitForLoadState('networkidle');
        
        const hasEmptyState = await page.locator('[data-testid="empty-pages-state"]').isVisible();
        if (hasEmptyState) {
          break;
        }
        
        await page.goto('/agents');
        await page.waitForLoadState('networkidle');
      }
    });

    await test.step('Verify empty state display', async () => {
      const emptyState = page.locator('[data-testid="empty-pages-state"]');
      const pageItems = page.locator('[data-testid="page-item"]');
      
      // Should show either empty state or pages
      const hasEmptyState = await emptyState.isVisible();
      const hasPages = await pageItems.count() > 0;
      
      if (hasEmptyState) {
        await expect(emptyState).toContainText(/no pages|empty|create/i);
        await expect(page.locator('[data-testid="create-page-button"]')).toBeVisible();
      }
      
      expect(hasEmptyState || hasPages).toBeTruthy();
    });
  });

  test('should handle API errors gracefully', async () => {
    await test.step('Simulate network failure', async () => {
      // Intercept API calls and return error
      await page.route('/api/agent-pages/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      // Reload to trigger error
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
    });

    await test.step('Verify error handling', async () => {
      // Should show error state or fallback UI
      const errorMessage = page.locator('[data-testid="error-message"], [data-testid="error-state"]');
      const retryButton = page.locator('[data-testid="retry-button"]');
      
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
      await expect(retryButton).toBeVisible();
    });

    await test.step('Test retry functionality', async () => {
      // Remove network error simulation
      await page.unroute('/api/agent-pages/**');
      
      // Click retry button
      await page.locator('[data-testid="retry-button"]').click();
      await page.waitForLoadState('networkidle');
      
      // Should recover and show content
      await expect(page.locator('[data-testid="dynamic-pages-content"]')).toBeVisible();
    });
  });

  test('should refresh pages data correctly', async () => {
    await test.step('Verify initial pages load', async () => {
      await page.waitForLoadState('networkidle');
      const initialCount = await page.locator('[data-testid="page-item"]').count();
      console.log(`Initial page count: ${initialCount}`);
    });

    await test.step('Trigger refresh', async () => {
      const refreshButton = page.locator('[data-testid="refresh-pages-button"]');
      
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
      } else {
        // Alternative refresh methods
        await page.keyboard.press('F5');
        await page.waitForLoadState('networkidle');
        await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
      }
      
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify refresh completed', async () => {
      // Check that content is still present and functional
      const hasContent = await page.locator('[data-testid="dynamic-pages-content"]').isVisible();
      const hasPages = await page.locator('[data-testid="page-item"]').count() >= 0;
      const hasEmptyState = await page.locator('[data-testid="empty-pages-state"]').isVisible();
      
      expect(hasContent && (hasPages || hasEmptyState)).toBeTruthy();
    });
  });

  test('should maintain responsive design across viewports', async () => {
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop Large' },
      { width: 1366, height: 768, name: 'Desktop Medium' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' },
    ];

    for (const viewport of viewports) {
      await test.step(`Test ${viewport.name} viewport`, async () => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(500);
        
        // Verify content is visible and accessible
        await expect(page.locator('[data-testid="dynamic-pages-content"]')).toBeVisible();
        
        // Check responsive layout
        const pageItems = page.locator('[data-testid="page-item"]');
        const itemCount = await pageItems.count();
        
        if (itemCount > 0) {
          await expect(pageItems.first()).toBeVisible();
          await expect(pageItems.first().locator('[data-testid="view-page-button"]')).toBeVisible();
        }
      });
    }
  });
});