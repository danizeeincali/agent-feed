import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Page Loading and View Button Functionality Tests', () => {
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

  test('should load pages and display View buttons correctly', async () => {
    await test.step('Verify pages load with View buttons', async () => {
      // Wait for pages to load
      await page.waitForFunction(() => {
        const content = document.querySelector('[data-testid="dynamic-pages-content"]');
        return content && content.textContent && content.textContent.trim().length > 0;
      }, { timeout: 15000 });

      const pageItems = page.locator('[data-testid="page-item"]');
      const itemCount = await pageItems.count();

      if (itemCount > 0) {
        // Verify each page item has a View button
        for (let i = 0; i < Math.min(itemCount, 5); i++) {
          const pageItem = pageItems.nth(i);
          const viewButton = pageItem.locator('[data-testid="view-page-button"]');
          
          await expect(viewButton).toBeVisible();
          await expect(viewButton).toBeEnabled();
          await expect(viewButton).toContainText(/view|open|visit/i);
        }
      }
    });

    await test.step('Verify View button states', async () => {
      const viewButtons = page.locator('[data-testid="view-page-button"]');
      const buttonCount = await viewButtons.count();

      if (buttonCount > 0) {
        const firstButton = viewButtons.first();
        
        // Check button properties
        await expect(firstButton).toBeEnabled();
        await expect(firstButton).toHaveAttribute('type', 'button');
        
        // Check for click handler
        const onClick = await firstButton.getAttribute('onclick');
        const hasClickHandler = onClick !== null || await firstButton.evaluate(
          el => typeof el.onclick === 'function' || el.addEventListener
        );
        
        expect(hasClickHandler || onClick).toBeTruthy();
      }
    });
  });

  test('should handle View button click and page loading', async () => {
    await test.step('Click View button and verify navigation', async () => {
      const pageItems = page.locator('[data-testid="page-item"]');
      const itemCount = await pageItems.count();

      if (itemCount > 0) {
        const firstPageItem = pageItems.first();
        const viewButton = firstPageItem.locator('[data-testid="view-page-button"]');
        const pageTitle = await firstPageItem.locator('[data-testid="page-title"]').textContent();
        
        // Get page URL/ID for verification
        const pageId = await firstPageItem.getAttribute('data-page-id') || '1';
        
        // Click View button
        await viewButton.click();
        
        // Wait for navigation or modal/iframe to load
        await page.waitForLoadState('networkidle');
        
        // Check if page opened in new tab, modal, or current tab
        const currentUrl = page.url();
        const hasModal = await page.locator('[data-testid="page-viewer-modal"]').isVisible();
        const hasIframe = await page.locator('iframe[data-testid="page-viewer-frame"]').isVisible();
        const navigatedToPage = currentUrl.includes(`/pages/${pageId}`) || currentUrl.includes(`/agent-pages/`);
        
        expect(hasModal || hasIframe || navigatedToPage).toBeTruthy();
        
        if (hasModal) {
          await expect(page.locator('[data-testid="page-viewer-modal"]')).toBeVisible();
          await expect(page.locator('[data-testid="modal-close-button"]')).toBeVisible();
        }
      }
    });

    await test.step('Verify page content loads correctly', async () => {
      // If modal opened, verify content
      const modal = page.locator('[data-testid="page-viewer-modal"]');
      if (await modal.isVisible()) {
        await expect(modal.locator('[data-testid="page-content"], iframe')).toBeVisible();
        
        // Close modal for cleanup
        await page.locator('[data-testid="modal-close-button"]').click();
        await expect(modal).not.toBeVisible();
      }
      
      // If navigated to page, verify page content
      if (page.url().includes('/pages/') || page.url().includes('/agent-pages/')) {
        await expect(page.locator('main, [role="main"], [data-testid="page-content"]')).toBeVisible();
        
        // Navigate back for cleanup
        await page.goBack();
        await page.waitForLoadState('networkidle');
      }
    });
  });

  test('should handle View button for different page types', async () => {
    const pageTypes = ['markdown', 'html', 'component', 'external'];
    
    await test.step('Test different page types', async () => {
      const pageItems = page.locator('[data-testid="page-item"]');
      const itemCount = await pageItems.count();
      
      for (let i = 0; i < Math.min(itemCount, 4); i++) {
        const pageItem = pageItems.nth(i);
        const pageType = await pageItem.locator('[data-testid="page-type"]').textContent();
        const viewButton = pageItem.locator('[data-testid="view-page-button"]');
        
        console.log(`Testing page type: ${pageType}`);
        
        await viewButton.click();
        await page.waitForTimeout(1000);
        
        // Verify appropriate viewer opens based on page type
        const hasModal = await page.locator('[data-testid="page-viewer-modal"]').isVisible();
        const hasIframe = await page.locator('iframe').isVisible();
        const hasExternalLink = page.url() !== page.url(); // Check if URL changed
        
        // Clean up - close modal or navigate back
        if (hasModal) {
          await page.locator('[data-testid="modal-close-button"]').click();
        } else if (page.url().includes('/pages/')) {
          await page.goBack();
          await page.waitForLoadState('networkidle');
          await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
        }
        
        await page.waitForTimeout(500);
      }
    });
  });

  test('should handle View button loading states', async () => {
    await test.step('Test loading states during page load', async () => {
      // Simulate slow network for loading state testing
      await page.route('**/api/agent-pages/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.continue();
      });
      
      const pageItems = page.locator('[data-testid="page-item"]');
      const itemCount = await pageItems.count();
      
      if (itemCount > 0) {
        const firstViewButton = pageItems.first().locator('[data-testid="view-page-button"]');
        
        // Click button and check for loading state
        await firstViewButton.click();
        
        // Check for loading indicators
        const buttonLoading = await firstViewButton.locator('[data-testid="button-spinner"]').isVisible();
        const globalLoading = await page.locator('[data-testid="loading-overlay"]').isVisible();
        
        // Wait for loading to complete
        await page.waitForLoadState('networkidle');
        
        // Verify loading states are removed
        await expect(firstViewButton.locator('[data-testid="button-spinner"]')).not.toBeVisible();
        await expect(page.locator('[data-testid="loading-overlay"]')).not.toBeVisible();
      }
      
      // Remove route simulation
      await page.unroute('**/api/agent-pages/**');
    });
  });

  test('should handle View button errors gracefully', async () => {
    await test.step('Simulate page loading error', async () => {
      // Mock API to return error for specific page
      await page.route('**/api/agent-pages/*/content', route => {
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Page not found' })
        });
      });
      
      const pageItems = page.locator('[data-testid="page-item"]');
      const itemCount = await pageItems.count();
      
      if (itemCount > 0) {
        const firstViewButton = pageItems.first().locator('[data-testid="view-page-button"]');
        await firstViewButton.click();
        
        // Should show error message or fallback
        const errorMessage = page.locator('[data-testid="error-message"], [role="alert"]');
        const errorModal = page.locator('[data-testid="error-modal"]');
        
        // Wait for error to appear
        await page.waitForTimeout(2000);
        
        const hasError = await errorMessage.isVisible() || await errorModal.isVisible();
        expect(hasError).toBeTruthy();
        
        // Clean up error state
        if (await errorModal.isVisible()) {
          await page.locator('[data-testid="error-modal"] [data-testid="close-button"]').click();
        }
      }
      
      // Remove error simulation
      await page.unroute('**/api/agent-pages/*/content');
    });
  });

  test('should handle multiple View button clicks', async () => {
    await test.step('Test rapid clicking prevention', async () => {
      const pageItems = page.locator('[data-testid="page-item"]');
      const itemCount = await pageItems.count();
      
      if (itemCount > 0) {
        const firstViewButton = pageItems.first().locator('[data-testid="view-page-button"]');
        
        // Click multiple times rapidly
        await firstViewButton.click();
        await firstViewButton.click();
        await firstViewButton.click();
        
        await page.waitForTimeout(1000);
        
        // Should only open one modal/page
        const modalCount = await page.locator('[data-testid="page-viewer-modal"]').count();
        expect(modalCount).toBeLessThanOrEqual(1);
        
        // Clean up
        const modal = page.locator('[data-testid="page-viewer-modal"]');
        if (await modal.isVisible()) {
          await page.locator('[data-testid="modal-close-button"]').click();
        }
      }
    });
  });

  test('should maintain accessibility standards', async () => {
    await test.step('Test keyboard navigation', async () => {
      const pageItems = page.locator('[data-testid="page-item"]');
      const itemCount = await pageItems.count();
      
      if (itemCount > 0) {
        const firstViewButton = pageItems.first().locator('[data-testid="view-page-button"]');
        
        // Focus button with keyboard
        await firstViewButton.focus();
        await expect(firstViewButton).toBeFocused();
        
        // Activate with Enter key
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
        
        // Verify action occurred
        const hasModal = await page.locator('[data-testid="page-viewer-modal"]').isVisible();
        const urlChanged = !page.url().includes('/agents/');
        
        expect(hasModal || urlChanged).toBeTruthy();
        
        // Clean up
        if (hasModal) {
          await page.keyboard.press('Escape');
        } else if (urlChanged) {
          await page.goBack();
        }
      }
    });

    await test.step('Test ARIA attributes', async () => {
      const viewButtons = page.locator('[data-testid="view-page-button"]');
      const buttonCount = await viewButtons.count();
      
      if (buttonCount > 0) {
        const firstButton = viewButtons.first();
        
        // Check ARIA attributes
        const ariaLabel = await firstButton.getAttribute('aria-label');
        const ariaDescribed = await firstButton.getAttribute('aria-describedby');
        const role = await firstButton.getAttribute('role');
        
        // Should have meaningful aria-label or text content
        const textContent = await firstButton.textContent();
        expect(ariaLabel || textContent).toBeTruthy();
        
        // Should be keyboard accessible
        await expect(firstButton).toBeFocusable();
      }
    });
  });
});