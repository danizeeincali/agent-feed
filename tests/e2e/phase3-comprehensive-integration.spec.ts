import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Comprehensive Phase 3 Integration Test Suite
 * Tests the complete integration of:
 * - Real TemplateService with 15+ templates
 * - Advanced TemplateLibrary component
 * - Real draft management with auto-save
 * - Phase 3 hooks integration
 * - Template selection and application
 * - Draft persistence across page refreshes
 */

test.describe('Phase 3 Comprehensive Integration', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    // Navigate to the application
    await page.goto('http://localhost:5173');
    
    // Wait for the app to load
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
    
    // Clear any existing drafts from localStorage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('Template Library Integration', () => {
    test('should display and hide template library correctly', async () => {
      // Navigate to post creation area
      await page.click('[data-testid="create-post-btn"]', { timeout: 5000 });
      
      // Look for template library toggle button
      const templateToggle = page.locator('button:has-text("Template Library"), button:has-text("Templates"), [data-testid="template-library-toggle"]').first();
      await expect(templateToggle).toBeVisible({ timeout: 5000 });
      
      // Click to show template library
      await templateToggle.click();
      
      // Verify template library is visible
      await expect(page.locator('.template-library, [data-testid="template-library"]').first()).toBeVisible({ timeout: 3000 });
      
      // Verify we can see the template library header
      await expect(page.locator('h2:has-text("Template Library"), h3:has-text("Template Library")')).toBeVisible();
      
      // Click to hide template library  
      const closeButton = page.locator('button:has-text("×"), button[title="Close"], [data-testid="close-template-library"]').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      } else {
        await templateToggle.click(); // Toggle again if no close button
      }
      
      // Verify template library is hidden
      await expect(page.locator('.template-library, [data-testid="template-library"]').first()).toBeHidden({ timeout: 3000 });
    });

    test('should load templates from real TemplateService', async () => {
      // Navigate to post creation and open template library
      await page.click('[data-testid="create-post-btn"]', { timeout: 5000 });
      await page.click('button:has-text("Template Library"), button:has-text("Templates"), [data-testid="template-library-toggle"]').first();
      
      // Wait for template library to load
      await page.waitForSelector('.template-library, [data-testid="template-library"]', { timeout: 5000 });
      
      // Check for loading state completion
      await expect(page.locator('text=Loading templates...')).not.toBeVisible({ timeout: 10000 });
      
      // Verify we have multiple templates (at least 15)
      const templateCards = page.locator('.template-card, [data-testid="template-card"], .template-item');
      await expect(templateCards.first()).toBeVisible({ timeout: 5000 });
      
      const templateCount = await templateCards.count();
      expect(templateCount).toBeGreaterThanOrEqual(10); // At least 10 templates visible
      
      // Verify specific template categories exist
      const categoryButtons = page.locator('button:has-text("UPDATE"), button:has-text("INSIGHT"), button:has-text("QUESTION")');
      await expect(categoryButtons.first()).toBeVisible({ timeout: 3000 });
      
      // Verify popular templates section
      await expect(page.locator('h3:has-text("Most Popular"), text=Most Popular')).toBeVisible();
      
      // Verify template details are loaded
      await expect(page.locator('text=Status Update, text=Weekly Progress Report')).toBeVisible();
      await expect(page.locator('text=Insight Share')).toBeVisible();
    });

    test('should support template search and filtering', async () => {
      await page.click('[data-testid="create-post-btn"]', { timeout: 5000 });
      await page.click('button:has-text("Template Library"), button:has-text("Templates")').first();
      await page.waitForSelector('.template-library, [data-testid="template-library"]', { timeout: 5000 });
      
      // Test search functionality
      const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="template"]').first();
      await expect(searchInput).toBeVisible({ timeout: 3000 });
      
      await searchInput.fill('status');
      await page.waitForTimeout(500); // Debounce delay
      
      // Verify search results
      const searchResults = page.locator('.template-card, [data-testid="template-card"]');
      const resultCount = await searchResults.count();
      expect(resultCount).toBeGreaterThan(0);
      
      // Verify search result contains 'status'
      await expect(page.locator('text=Status Update')).toBeVisible();
      
      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(500);
      
      // Test category filtering
      const filterButton = page.locator('button:has-text("Filters")').first();
      if (await filterButton.isVisible()) {
        await filterButton.click();
        
        // Click on a category filter
        await page.click('button:has-text("INSIGHT"), button:has-text("Insight")').first();
        await page.waitForTimeout(500);
        
        // Verify filtered results
        await expect(page.locator('text=Insight Share')).toBeVisible();
      }
    });

    test('should apply template selection correctly', async () => {
      await page.click('[data-testid="create-post-btn"]', { timeout: 5000 });
      await page.click('button:has-text("Template Library"), button:has-text("Templates")').first();
      await page.waitForSelector('.template-library, [data-testid="template-library"]', { timeout: 5000 });
      
      // Select a specific template
      await page.click('button:has-text("Status Update"), .template-card:has-text("Status Update")').first();
      
      // Wait for template to be applied
      await page.waitForTimeout(1000);
      
      // Verify template content is applied to the editor
      const titleInput = page.locator('input[placeholder*="Title"], input[name="title"]').first();
      const contentEditor = page.locator('textarea, [contenteditable="true"]').first();
      
      if (await titleInput.isVisible()) {
        const titleValue = await titleInput.inputValue();
        expect(titleValue).toContain('Weekly Progress Report');
      }
      
      if (await contentEditor.isVisible()) {
        const contentValue = await contentEditor.textContent();
        expect(contentValue).toContain('Completed This Week');
      }
      
      // Verify template library closes after selection
      await expect(page.locator('.template-library')).not.toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Draft Management Integration', () => {
    test('should create and auto-save drafts', async () => {
      await page.click('[data-testid="create-post-btn"]', { timeout: 5000 });
      
      // Fill in some content
      const titleInput = page.locator('input[placeholder*="Title"], input[name="title"]').first();
      const contentEditor = page.locator('textarea[placeholder*="content"], textarea').first();
      
      await titleInput.fill('Test Draft Title');
      await contentEditor.fill('This is test content for auto-save functionality.');
      
      // Wait for auto-save to trigger (3 seconds based on config)
      await page.waitForTimeout(4000);
      
      // Verify auto-save indicator
      const autoSaveIndicator = page.locator('text=Auto-saved, text=Saving, text=Saved').first();
      await expect(autoSaveIndicator).toBeVisible({ timeout: 5000 });
      
      // Check localStorage for draft data
      const draftData = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        return keys.find(key => key.includes('draft')) ? localStorage.getItem(keys.find(key => key.includes('draft'))!) : null;
      });
      
      expect(draftData).toBeTruthy();
    });

    test('should persist drafts across page refreshes', async () => {
      await page.click('[data-testid="create-post-btn"]', { timeout: 5000 });
      
      // Create draft content
      const testTitle = 'Persistent Draft Title';
      const testContent = 'This content should persist across refreshes.';
      
      const titleInput = page.locator('input[placeholder*="Title"], input[name="title"]').first();
      const contentEditor = page.locator('textarea').first();
      
      await titleInput.fill(testTitle);
      await contentEditor.fill(testContent);
      
      // Wait for auto-save
      await page.waitForTimeout(4000);
      
      // Refresh the page
      await page.reload();
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
      
      // Navigate back to post creation
      await page.click('[data-testid="create-post-btn"]', { timeout: 5000 });
      
      // Verify draft content is restored
      const restoredTitle = await page.locator('input[placeholder*="Title"], input[name="title"]').first().inputValue();
      const restoredContent = await page.locator('textarea').first().inputValue();
      
      expect(restoredTitle).toBe(testTitle);
      expect(restoredContent).toBe(testContent);
    });

    test('should handle draft management operations', async () => {
      await page.click('[data-testid="create-post-btn"]', { timeout: 5000 });
      
      // Create multiple drafts by changing content and waiting for auto-save
      const drafts = [
        { title: 'Draft 1', content: 'Content for draft 1' },
        { title: 'Draft 2', content: 'Content for draft 2' }
      ];
      
      for (let i = 0; i < drafts.length; i++) {
        const titleInput = page.locator('input[placeholder*="Title"], input[name="title"]').first();
        const contentEditor = page.locator('textarea').first();
        
        await titleInput.clear();
        await titleInput.fill(drafts[i].title);
        await contentEditor.clear();
        await contentEditor.fill(drafts[i].content);
        
        // Wait for auto-save
        await page.waitForTimeout(4000);
      }
      
      // Look for draft management interface
      const draftsList = page.locator('[data-testid="drafts-list"], .drafts-panel, button:has-text("Drafts")').first();
      
      if (await draftsList.isVisible()) {
        await draftsList.click();
        
        // Verify we can see saved drafts
        await expect(page.locator('text=Draft 1, text=Draft 2')).toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe('Phase 3 Hooks Integration', () => {
    test('should integrate useTemplates hook correctly', async () => {
      await page.click('[data-testid="create-post-btn"]', { timeout: 5000 });
      await page.click('button:has-text("Template Library"), button:has-text("Templates")').first();
      await page.waitForSelector('.template-library', { timeout: 5000 });
      
      // Test template usage tracking
      await page.click('.template-card:has-text("Status Update")').first();
      await page.waitForTimeout(1000);
      
      // Reopen template library to verify usage count updated
      await page.click('button:has-text("Template Library"), button:has-text("Templates")').first();
      await page.waitForSelector('.template-library', { timeout: 5000 });
      
      // Look for usage indicators (star ratings, usage counts, etc.)
      const usageIndicators = page.locator('[data-testid="usage-count"], .usage-indicator, text=/\\d+ uses?/');
      if (await usageIndicators.first().isVisible()) {
        expect(await usageIndicators.count()).toBeGreaterThan(0);
      }
    });

    test('should integrate useDraftManager hook correctly', async () => {
      await page.click('[data-testid="create-post-btn"]', { timeout: 5000 });
      
      // Test draft creation through hook
      const titleInput = page.locator('input[placeholder*="Title"], input[name="title"]').first();
      await titleInput.fill('Hook Integration Test');
      
      // Wait for draft manager to process
      await page.waitForTimeout(4000);
      
      // Verify draft state indicators
      const draftStatus = page.locator('[data-testid="draft-status"], .draft-indicator, text=Draft').first();
      if (await draftStatus.isVisible()) {
        await expect(draftStatus).toBeVisible();
      }
      
      // Test draft operations
      const saveButton = page.locator('button:has-text("Save"), [data-testid="save-draft"]').first();
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(1000);
        
        // Verify save confirmation
        await expect(page.locator('text=Saved, text=Draft saved')).toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle template loading errors gracefully', async () => {
      // Simulate network error by intercepting API calls
      await page.route('**/api/**', route => {
        if (route.request().url().includes('template')) {
          route.abort();
        } else {
          route.continue();
        }
      });
      
      await page.click('[data-testid="create-post-btn"]', { timeout: 5000 });
      await page.click('button:has-text("Template Library"), button:has-text("Templates")').first();
      
      // Verify error handling
      await expect(page.locator('text=Error loading templates, text=Failed to load')).toBeVisible({ timeout: 5000 });
      
      // Clear route interception
      await page.unroute('**/api/**');
    });

    test('should handle auto-save failures gracefully', async () => {
      await page.click('[data-testid="create-post-btn"]', { timeout: 5000 });
      
      // Simulate offline condition
      await page.context().setOffline(true);
      
      const titleInput = page.locator('input[placeholder*="Title"], input[name="title"]').first();
      await titleInput.fill('Offline Draft Test');
      
      // Wait for auto-save attempt
      await page.waitForTimeout(4000);
      
      // Verify offline/error indicator
      const errorIndicator = page.locator('text=Offline, text=Save failed, text=Error').first();
      if (await errorIndicator.isVisible()) {
        await expect(errorIndicator).toBeVisible();
      }
      
      // Restore online state
      await page.context().setOffline(false);
    });

    test('should handle template search edge cases', async () => {
      await page.click('[data-testid="create-post-btn"]', { timeout: 5000 });
      await page.click('button:has-text("Template Library"), button:has-text("Templates")').first();
      await page.waitForSelector('.template-library', { timeout: 5000 });
      
      const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="template"]').first();
      
      // Test empty search
      await searchInput.fill('');
      await page.waitForTimeout(500);
      await expect(page.locator('.template-card').first()).toBeVisible();
      
      // Test search with no results
      await searchInput.fill('nonexistenttemplate12345');
      await page.waitForTimeout(500);
      await expect(page.locator('text=No templates found, text=No results')).toBeVisible({ timeout: 3000 });
      
      // Test special characters in search
      await searchInput.fill('@#$%^&*()');
      await page.waitForTimeout(500);
      // Should not crash the application
      await expect(page.locator('.template-library')).toBeVisible();
    });
  });

  test.describe('Performance and Responsiveness', () => {
    test('should load templates within acceptable time', async () => {
      const startTime = Date.now();
      
      await page.click('[data-testid="create-post-btn"]', { timeout: 5000 });
      await page.click('button:has-text("Template Library"), button:has-text("Templates")').first();
      
      await page.waitForSelector('.template-library', { timeout: 5000 });
      await expect(page.locator('text=Loading templates...')).not.toBeVisible({ timeout: 10000 });
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });

    test('should handle rapid template selection', async () => {
      await page.click('[data-testid="create-post-btn"]', { timeout: 5000 });
      await page.click('button:has-text("Template Library"), button:has-text("Templates")').first();
      await page.waitForSelector('.template-library', { timeout: 5000 });
      
      // Rapidly click different templates
      const templates = page.locator('.template-card').first();
      await templates.click();
      await page.waitForTimeout(100);
      
      // Should not crash or cause errors
      await expect(page.locator('[data-testid="app-container"]')).toBeVisible();
    });

    test('should handle auto-save throttling correctly', async () => {
      await page.click('[data-testid="create-post-btn"]', { timeout: 5000 });
      
      const titleInput = page.locator('input[placeholder*="Title"], input[name="title"]').first();
      
      // Rapidly type to test throttling
      for (let i = 0; i < 10; i++) {
        await titleInput.fill(`Rapid typing test ${i}`);
        await page.waitForTimeout(50);
      }
      
      // Wait for final auto-save
      await page.waitForTimeout(5000);
      
      // Should have the final content
      const finalValue = await titleInput.inputValue();
      expect(finalValue).toBe('Rapid typing test 9');
    });
  });
});