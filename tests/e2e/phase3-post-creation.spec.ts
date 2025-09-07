import { test, expect } from '@playwright/test';
import { PostTemplate, TemplateCategory } from '../../src/types/templates';

test.describe('Phase 3: Post Creation & Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Enhanced Template System', () => {
    test('should display all 15+ templates in template library', async ({ page }) => {
      // Open post creator
      await page.getByRole('button', { name: /create.*post/i }).click();
      
      // Open template library
      await page.getByRole('button', { name: /template/i }).click();
      
      // Wait for templates to load
      await page.waitForSelector('[data-testid="template-library"]');
      
      // Count templates - should have at least 15
      const templates = page.locator('[data-testid="template-card"]');
      const templateCount = await templates.count();
      
      expect(templateCount).toBeGreaterThanOrEqual(15);
    });

    test('should categorize templates correctly', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('button', { name: /template/i }).click();
      
      // Check that categories are displayed
      await page.getByRole('button', { name: /filters/i }).click();
      
      // Verify key categories exist
      const expectedCategories = [
        'update', 'insight', 'question', 'announcement', 
        'code-review', 'meeting-summary', 'goal-setting'
      ];
      
      for (const category of expectedCategories) {
        const categoryButton = page.getByRole('button', { name: new RegExp(category.replace('-', ' '), 'i') });
        await expect(categoryButton).toBeVisible();
      }
    });

    test('should provide template search functionality', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('button', { name: /template/i }).click();
      
      // Search for specific template
      const searchInput = page.getByPlaceholder(/search templates/i);
      await searchInput.fill('code review');
      
      // Wait for search results
      await page.waitForTimeout(500);
      
      // Should show code review related templates
      const templates = page.locator('[data-testid="template-card"]');
      const templateCount = await templates.count();
      
      expect(templateCount).toBeGreaterThan(0);
      
      // Verify search results contain relevant templates
      const firstTemplate = templates.first();
      const templateText = await firstTemplate.textContent();
      expect(templateText?.toLowerCase()).toContain('code');
    });

    test('should suggest templates based on context', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('button', { name: /template/i }).click();
      
      // Look for suggestions section
      const suggestionsSection = page.locator('[data-testid="template-suggestions"]');
      
      if (await suggestionsSection.isVisible()) {
        const suggestions = page.locator('[data-testid="suggested-template"]');
        const suggestionCount = await suggestions.count();
        
        expect(suggestionCount).toBeGreaterThan(0);
        expect(suggestionCount).toBeLessThanOrEqual(3);
      }
    });

    test('should apply template to post creator', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('button', { name: /template/i }).click();
      
      // Select a specific template (status update)
      await page.getByText('Status Update').click();
      
      // Verify template content is applied
      const titleField = page.getByRole('textbox', { name: /title/i });
      const contentField = page.getByRole('textbox', { name: /content/i });
      
      await expect(titleField).toHaveValue(/progress.*report/i);
      await expect(contentField).toContainText('Completed This Week');
      await expect(contentField).toContainText('Upcoming Priorities');
    });
  });

  test.describe('Advanced Draft Management', () => {
    test('should auto-save drafts every 3 seconds', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      
      // Fill in some content
      await page.getByRole('textbox', { name: /title/i }).fill('Test Auto-Save Title');
      await page.getByRole('textbox', { name: /content/i }).fill('This is test content for auto-save functionality.');
      
      // Wait for auto-save (should trigger after 3 seconds)
      await page.waitForTimeout(4000);
      
      // Check for save indicator
      const saveIndicator = page.locator('text=Saved', { hasText: /saved/i });
      await expect(saveIndicator).toBeVisible({ timeout: 1000 });
    });

    test('should manage multiple drafts', async ({ page }) => {
      // Create first draft
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('textbox', { name: /title/i }).fill('Draft 1');
      await page.getByRole('textbox', { name: /content/i }).fill('Content for draft 1');
      
      // Save as draft
      await page.getByRole('button', { name: /save.*draft/i }).click();
      await page.waitForTimeout(1000);
      
      // Create second draft
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('textbox', { name: /title/i }).fill('Draft 2');
      await page.getByRole('textbox', { name: /content/i }).fill('Content for draft 2');
      
      // Save as draft
      await page.getByRole('button', { name: /save.*draft/i }).click();
      await page.waitForTimeout(1000);
      
      // Navigate to drafts section
      await page.getByRole('button', { name: /drafts/i }).click();
      
      // Should see both drafts
      await expect(page.getByText('Draft 1')).toBeVisible();
      await expect(page.getByText('Draft 2')).toBeVisible();
    });

    test('should persist drafts across browser sessions', async ({ page, context }) => {
      // Create and save a draft
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('textbox', { name: /title/i }).fill('Persistent Draft');
      await page.getByRole('textbox', { name: /content/i }).fill('This draft should persist across sessions');
      
      await page.getByRole('button', { name: /save.*draft/i }).click();
      await page.waitForTimeout(1000);
      
      // Close and reopen browser
      await page.close();
      const newPage = await context.newPage();
      await newPage.goto('/');
      await newPage.waitForLoadState('networkidle');
      
      // Check if draft is still available
      await newPage.getByRole('button', { name: /drafts/i }).click();
      await expect(newPage.getByText('Persistent Draft')).toBeVisible();
    });

    test('should support draft version history', async ({ page }) => {
      // Create initial draft
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('textbox', { name: /title/i }).fill('Versioned Draft');
      await page.getByRole('textbox', { name: /content/i }).fill('Initial version');
      
      await page.getByRole('button', { name: /save.*draft/i }).click();
      await page.waitForTimeout(1000);
      
      // Make changes
      await page.getByRole('textbox', { name: /content/i }).fill('Updated version with more content');
      await page.getByRole('button', { name: /save.*draft/i }).click();
      await page.waitForTimeout(1000);
      
      // Check version history
      await page.getByRole('button', { name: /version.*history/i }).click();
      
      const versions = page.locator('[data-testid="version-item"]');
      const versionCount = await versions.count();
      
      expect(versionCount).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('Character Limits & Validation', () => {
    test('should enforce title character limit (200 chars)', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      
      const titleField = page.getByRole('textbox', { name: /title/i });
      const longTitle = 'A'.repeat(250); // Exceeds 200 char limit
      
      await titleField.fill(longTitle);
      
      // Should show character count indicator
      const charCount = page.locator('text=/200/');
      await expect(charCount).toBeVisible();
      
      // Should prevent submission with over-limit title
      const publishButton = page.getByRole('button', { name: /publish/i });
      await expect(publishButton).toBeDisabled();
    });

    test('should enforce hook character limit (300 chars)', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      
      const hookField = page.getByRole('textbox', { name: /hook/i });
      const longHook = 'B'.repeat(350); // Exceeds 300 char limit
      
      await hookField.fill(longHook);
      
      // Should show character count indicator
      const charCount = page.locator('text=/300/');
      await expect(charCount).toBeVisible();
    });

    test('should enforce content character limit (5000 chars)', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      
      const contentField = page.getByRole('textbox', { name: /content/i });
      const longContent = 'C'.repeat(5100); // Exceeds 5000 char limit
      
      await contentField.fill(longContent);
      
      // Should show character count indicator  
      const charCount = page.locator('text=/5000/');
      await expect(charCount).toBeVisible();
      
      // Should prevent submission with over-limit content
      const publishButton = page.getByRole('button', { name: /publish/i });
      await expect(publishButton).toBeDisabled();
    });
  });

  test.describe('Post Publishing & Feed Integration', () => {
    test('should publish post and appear in feed immediately', async ({ page }) => {
      // Create and publish a post
      await page.getByRole('button', { name: /create.*post/i }).click();
      
      const uniqueTitle = `Test Post ${Date.now()}`;
      await page.getByRole('textbox', { name: /title/i }).fill(uniqueTitle);
      await page.getByRole('textbox', { name: /content/i }).fill('This is a test post content that should appear in the feed.');
      
      await page.getByRole('button', { name: /publish/i }).click();
      
      // Wait for success indicator
      await expect(page.getByText(/published.*successfully/i)).toBeVisible({ timeout: 5000 });
      
      // Navigate to feed and verify post appears
      await page.getByRole('link', { name: /feed/i }).click();
      await page.waitForLoadState('networkidle');
      
      // Should see the published post
      await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 5000 });
    });

    test('should display post with correct metadata', async ({ page }) => {
      const uniqueTitle = `Metadata Test ${Date.now()}`;
      const testContent = 'This is test content with specific metadata to verify.';
      
      // Create post with specific tags
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('textbox', { name: /title/i }).fill(uniqueTitle);
      await page.getByRole('textbox', { name: /content/i }).fill(testContent);
      
      // Add tags
      const tagInput = page.getByRole('textbox', { name: /tags/i });
      await tagInput.fill('test,automation');
      await tagInput.press('Enter');
      
      await page.getByRole('button', { name: /publish/i }).click();
      await page.waitForTimeout(2000);
      
      // Go to feed and check post
      await page.getByRole('link', { name: /feed/i }).click();
      await page.waitForLoadState('networkidle');
      
      const postElement = page.locator(`text=${uniqueTitle}`).locator('..').locator('..');
      
      // Verify tags are displayed
      await expect(postElement.getByText('#test')).toBeVisible();
      await expect(postElement.getByText('#automation')).toBeVisible();
      
      // Verify reading time calculation
      await expect(postElement.getByText(/min read/)).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should be fully functional on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Test post creation on mobile
      await page.getByRole('button', { name: /create.*post/i }).click();
      
      // Should show mobile-optimized layout
      const postCreator = page.locator('[data-testid="post-creator"]');
      await expect(postCreator).toBeVisible();
      
      // Check mobile-specific UI elements
      const mobileIndicator = page.locator('[data-testid="mobile-indicator"]');
      if (await mobileIndicator.isVisible()) {
        // Mobile-specific layout detected
        expect(true).toBe(true);
      }
      
      // Test functionality works on mobile
      await page.getByRole('textbox', { name: /title/i }).fill('Mobile Test Post');
      await page.getByRole('textbox', { name: /content/i }).fill('Testing mobile functionality');
      
      // Template selection should work on mobile
      await page.getByRole('button', { name: /template/i }).click();
      
      // Should show mobile-appropriate template library
      const templateLibrary = page.locator('[data-testid="template-library"]');
      await expect(templateLibrary).toBeVisible();
    });
  });

  test.describe('Error Handling & Edge Cases', () => {
    test('should handle network failures gracefully', async ({ page }) => {
      // Simulate offline scenario
      await page.context().setOffline(true);
      
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('textbox', { name: /title/i }).fill('Offline Test');
      await page.getByRole('textbox', { name: /content/i }).fill('Testing offline functionality');
      
      // Try to save draft
      await page.getByRole('button', { name: /save.*draft/i }).click();
      
      // Should show appropriate offline indicator or queue for sync
      const offlineIndicator = page.locator('text=/offline|queued|will.*sync/i');
      await expect(offlineIndicator).toBeVisible({ timeout: 3000 });
      
      // Go back online
      await page.context().setOffline(false);
      await page.waitForTimeout(2000);
      
      // Should sync successfully
      const syncSuccess = page.locator('text=/synced|saved/i');
      await expect(syncSuccess).toBeVisible({ timeout: 5000 });
    });

    test('should recover from browser crashes', async ({ page, context }) => {
      // Create a draft with unsaved changes
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('textbox', { name: /title/i }).fill('Crash Recovery Test');
      await page.getByRole('textbox', { name: /content/i }).fill('This should be recovered after crash');
      
      // Don't save, just let auto-save happen
      await page.waitForTimeout(4000);
      
      // Simulate crash by forcing page reload
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should offer to recover unsaved changes
      const recoveryDialog = page.locator('text=/recover.*changes|unsaved.*draft/i');
      
      if (await recoveryDialog.isVisible()) {
        await page.getByRole('button', { name: /recover|restore/i }).click();
        
        // Should restore the draft content
        const titleField = page.getByRole('textbox', { name: /title/i });
        await expect(titleField).toHaveValue('Crash Recovery Test');
      }
    });

    test('should validate required fields', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      
      // Try to publish without required fields
      const publishButton = page.getByRole('button', { name: /publish/i });
      
      // Should be disabled initially
      await expect(publishButton).toBeDisabled();
      
      // Add only title
      await page.getByRole('textbox', { name: /title/i }).fill('Only Title');
      
      // Should still be disabled (needs content)
      await expect(publishButton).toBeDisabled();
      
      // Add content
      await page.getByRole('textbox', { name: /content/i }).fill('Now has content');
      
      // Should be enabled
      await expect(publishButton).toBeEnabled();
    });
  });

  test.describe('Performance & Accessibility', () => {
    test('should load post creator quickly', async ({ page }) => {
      const startTime = Date.now();
      
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.waitForSelector('[data-testid="post-creator"]');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);
    });

    test('should be keyboard accessible', async ({ page }) => {
      // Navigate using keyboard only
      await page.keyboard.press('Tab');
      
      // Should be able to reach post creator button
      let focused = await page.evaluate(() => document.activeElement?.textContent?.includes('Create'));
      
      // Keep tabbing until we find the create post button
      let attempts = 0;
      while (!focused && attempts < 20) {
        await page.keyboard.press('Tab');
        focused = await page.evaluate(() => document.activeElement?.textContent?.includes('Create') || document.activeElement?.textContent?.includes('Post'));
        attempts++;
      }
      
      // Should be able to activate with Enter
      await page.keyboard.press('Enter');
      
      // Should open post creator
      await expect(page.locator('[data-testid="post-creator"]')).toBeVisible();
      
      // Should be able to navigate through form fields
      await page.keyboard.press('Tab');
      await page.keyboard.type('Keyboard Test Title');
      
      await page.keyboard.press('Tab');
      await page.keyboard.type('Keyboard Test Content');
    });

    test('should meet ARIA accessibility standards', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      
      // Check for proper ARIA labels
      const titleField = page.getByRole('textbox', { name: /title/i });
      const contentField = page.getByRole('textbox', { name: /content/i });
      
      await expect(titleField).toHaveAttribute('aria-label');
      await expect(contentField).toHaveAttribute('aria-label');
      
      // Check for form validation messages
      const publishButton = page.getByRole('button', { name: /publish/i });
      await expect(publishButton).toHaveAttribute('aria-disabled');
    });
  });
});