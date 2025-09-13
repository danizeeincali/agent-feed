import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Agent Profile Navigation Tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    
    // Navigate to agents page
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should navigate to agent profile successfully', async () => {
    await test.step('Click on first agent', async () => {
      const firstAgent = page.locator('[data-testid="agent-card"]').first();
      await expect(firstAgent).toBeVisible();
      await firstAgent.click();
    });

    await test.step('Verify agent profile page loads', async () => {
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="agent-profile"]')).toBeVisible();
      await expect(page.locator('h1')).toContainText(/Agent|Profile/);
    });

    await test.step('Verify profile tabs are present', async () => {
      const tabs = page.locator('[role="tablist"] [role="tab"]');
      await expect(tabs).toHaveCount(4); // Overview, Posts, Dynamic Pages, Settings
      
      // Check specific tabs
      await expect(page.locator('[role="tab"]:has-text("Overview")')).toBeVisible();
      await expect(page.locator('[role="tab"]:has-text("Posts")')).toBeVisible();
      await expect(page.locator('[role="tab"]:has-text("Dynamic Pages")')).toBeVisible();
      await expect(page.locator('[role="tab"]:has-text("Settings")')).toBeVisible();
    });

    await test.step('Navigate to Dynamic Pages tab', async () => {
      await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
      await page.waitForLoadState('networkidle');
      
      // Verify tab is active
      await expect(page.locator('[role="tab"]:has-text("Dynamic Pages")[aria-selected="true"]')).toBeVisible();
    });
  });

  test('should handle direct navigation to agent profile', async () => {
    await test.step('Navigate directly to agent profile via URL', async () => {
      await page.goto('/agents/1'); // Assuming agent ID 1 exists
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify profile loads correctly', async () => {
      await expect(page.locator('[data-testid="agent-profile"]')).toBeVisible();
      await expect(page.url()).toContain('/agents/1');
    });

    await test.step('Verify all tabs are functional', async () => {
      const tabs = ['Overview', 'Posts', 'Dynamic Pages', 'Settings'];
      
      for (const tabName of tabs) {
        await page.locator(`[role="tab"]:has-text("${tabName}")`).click();
        await page.waitForTimeout(500); // Small delay for tab switching
        await expect(page.locator(`[role="tab"]:has-text("${tabName}")[aria-selected="true"]`)).toBeVisible();
      }
    });
  });

  test('should handle navigation back to agents list', async () => {
    await test.step('Navigate to agent profile', async () => {
      await page.locator('[data-testid="agent-card"]').first().click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Click back button or breadcrumb', async () => {
      // Try multiple back navigation options
      const backButton = page.locator('[data-testid="back-button"]');
      const breadcrumb = page.locator('[data-testid="breadcrumb-agents"]');
      
      if (await backButton.isVisible()) {
        await backButton.click();
      } else if (await breadcrumb.isVisible()) {
        await breadcrumb.click();
      } else {
        await page.goBack();
      }
    });

    await test.step('Verify return to agents list', async () => {
      await page.waitForLoadState('networkidle');
      await expect(page.url()).toContain('/agents');
      await expect(page.locator('[data-testid="agent-card"]')).toHaveCount(3, { timeout: 10000 });
    });
  });

  test('should handle invalid agent ID gracefully', async () => {
    await test.step('Navigate to non-existent agent', async () => {
      await page.goto('/agents/999999');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify error handling', async () => {
      // Should show 404 or redirect to agents list
      const isNotFound = await page.locator('text=404').isVisible();
      const isRedirected = page.url().includes('/agents') && !page.url().includes('/agents/999999');
      
      expect(isNotFound || isRedirected).toBeTruthy();
    });
  });

  test('should preserve tab state during navigation', async () => {
    await test.step('Navigate to agent and select Dynamic Pages tab', async () => {
      await page.locator('[data-testid="agent-card"]').first().click();
      await page.waitForLoadState('networkidle');
      await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
      await page.waitForTimeout(500);
    });

    await test.step('Navigate away and back', async () => {
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      await page.locator('[data-testid="agent-card"]').first().click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify tab state is preserved or defaults correctly', async () => {
      // Should either preserve Dynamic Pages tab or default to Overview
      const dynamicPagesActive = await page.locator('[role="tab"]:has-text("Dynamic Pages")[aria-selected="true"]').isVisible();
      const overviewActive = await page.locator('[role="tab"]:has-text("Overview")[aria-selected="true"]').isVisible();
      
      expect(dynamicPagesActive || overviewActive).toBeTruthy();
    });
  });
});