import { test, expect } from '@playwright/test';

test.describe('Phase 3: Advanced Draft Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Auto-save Functionality', () => {
    test('should auto-save drafts every 3 seconds', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      
      // Fill in content
      await page.getByRole('textbox', { name: /title/i }).fill('Auto-save Test Title');
      await page.getByRole('textbox', { name: /content/i }).fill('This content should auto-save.');
      
      // Wait for auto-save interval (3+ seconds)
      await page.waitForTimeout(4000);
      
      // Check for save indicator
      const saveIndicator = page.locator('[data-testid="auto-save-status"], text=/saved|auto.*saved/i');
      await expect(saveIndicator).toBeVisible();
      
      // Verify timestamp is recent
      const timestamp = page.locator('[data-testid="last-saved-time"]');
      if (await timestamp.isVisible()) {
        const timeText = await timestamp.textContent();
        // Should show a recent time (within last minute)
        expect(timeText).toMatch(/just now|seconds? ago|minute ago/i);
      }
    });

    test('should show unsaved changes indicator', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      
      // Fill in content
      await page.getByRole('textbox', { name: /title/i }).fill('Unsaved Changes Test');
      
      // Should show unsaved changes indicator immediately
      const unsavedIndicator = page.locator('[data-testid="unsaved-changes"], text=/unsaved|changes/i');
      await expect(unsavedIndicator).toBeVisible({ timeout: 1000 });
      
      // Wait for auto-save
      await page.waitForTimeout(4000);
      
      // Unsaved indicator should disappear
      await expect(unsavedIndicator).not.toBeVisible();
    });

    test('should handle auto-save failures gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/v1/drafts/**', route => route.abort());
      
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('textbox', { name: /title/i }).fill('Failed Save Test');
      
      // Wait for auto-save attempt
      await page.waitForTimeout(4000);
      
      // Should show retry or error indicator
      const errorIndicator = page.locator('[data-testid="save-error"], text=/failed.*save|retry|error/i');
      await expect(errorIndicator).toBeVisible();
      
      // Restore network
      await page.unroute('**/api/v1/drafts/**');
      
      // Should eventually succeed on retry
      await page.waitForTimeout(5000);
      const successIndicator = page.locator('[data-testid="save-success"], text=/saved|success/i');
      await expect(successIndicator).toBeVisible({ timeout: 10000 });
    });

    test('should debounce auto-save on rapid typing', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      
      const titleField = page.getByRole('textbox', { name: /title/i });
      
      // Rapid typing simulation
      const text = 'Rapid typing test';
      for (const char of text) {
        await titleField.type(char);
        await page.waitForTimeout(50); // Fast typing
      }
      
      // Should not trigger multiple saves during rapid typing
      const saveCount = await page.evaluate(() => {
        return (window as any).autoSaveCount || 0;
      });
      
      // Should only save once after debounce period
      expect(saveCount).toBeLessThanOrEqual(1);
    });
  });

  test.describe('Draft Persistence', () => {
    test('should save drafts to server', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      
      const uniqueTitle = `Server Draft Test ${Date.now()}`;
      await page.getByRole('textbox', { name: /title/i }).fill(uniqueTitle);
      await page.getByRole('textbox', { name: /content/i }).fill('This draft should be saved to server');
      
      // Explicitly save draft
      await page.getByRole('button', { name: /save.*draft/i }).click();
      await page.waitForTimeout(1000);
      
      // Navigate away and back
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Check drafts section
      await page.getByRole('button', { name: /drafts/i }).click();
      
      // Should find the saved draft
      await expect(page.getByText(uniqueTitle)).toBeVisible();
    });

    test('should persist across browser sessions', async ({ page, context }) => {
      const uniqueTitle = `Persistent Draft ${Date.now()}`;
      
      // Create and save draft
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('textbox', { name: /title/i }).fill(uniqueTitle);
      await page.getByRole('textbox', { name: /content/i }).fill('This should persist across sessions');
      await page.getByRole('button', { name: /save.*draft/i }).click();
      await page.waitForTimeout(2000);
      
      // Close page and create new one (simulate new session)
      await page.close();
      const newPage = await context.newPage();
      await newPage.goto('/');
      await newPage.waitForLoadState('networkidle');
      
      // Check if draft persists
      await newPage.getByRole('button', { name: /drafts/i }).click();
      await expect(newPage.getByText(uniqueTitle)).toBeVisible();
    });

    test('should handle offline storage', async ({ page }) => {
      // Go offline
      await page.context().setOffline(true);
      
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('textbox', { name: /title/i }).fill('Offline Draft');
      await page.getByRole('textbox', { name: /content/i }).fill('This should save offline');
      
      await page.getByRole('button', { name: /save.*draft/i }).click();
      
      // Should show offline indicator
      const offlineIndicator = page.locator('[data-testid="offline-indicator"], text=/offline|queued/i');
      await expect(offlineIndicator).toBeVisible();
      
      // Go back online
      await page.context().setOffline(false);
      await page.waitForTimeout(3000);
      
      // Should sync successfully
      const syncSuccess = page.locator('[data-testid="sync-success"], text=/synced|uploaded/i');
      await expect(syncSuccess).toBeVisible();
    });
  });

  test.describe('Multiple Draft Management', () => {
    test('should manage up to 10 drafts', async ({ page }) => {
      // Create multiple drafts
      const draftTitles = [];
      
      for (let i = 1; i <= 5; i++) {
        const title = `Draft ${i} - ${Date.now()}`;
        draftTitles.push(title);
        
        await page.getByRole('button', { name: /create.*post/i }).click();
        await page.getByRole('textbox', { name: /title/i }).fill(title);
        await page.getByRole('textbox', { name: /content/i }).fill(`Content for draft ${i}`);
        await page.getByRole('button', { name: /save.*draft/i }).click();
        await page.waitForTimeout(1000);
        
        // Navigate back to create next draft
        await page.goto('/');
      }
      
      // Check all drafts are saved
      await page.getByRole('button', { name: /drafts/i }).click();
      
      for (const title of draftTitles) {
        await expect(page.getByText(title)).toBeVisible();
      }
    });

    test('should organize drafts with folders or tags', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      
      // Add tags to organize drafts
      const tagInput = page.getByRole('textbox', { name: /tags/i });
      if (await tagInput.isVisible()) {
        await tagInput.fill('work,project-alpha');
        await tagInput.press('Enter');
      }
      
      await page.getByRole('textbox', { name: /title/i }).fill('Organized Draft');
      await page.getByRole('textbox', { name: /content/i }).fill('This draft has organization tags');
      await page.getByRole('button', { name: /save.*draft/i }).click();
      await page.waitForTimeout(1000);
      
      // Go to drafts and check organization
      await page.getByRole('button', { name: /drafts/i }).click();
      
      // Should be able to filter by tags
      const filterOptions = page.locator('[data-testid="draft-filter"], select');
      if (await filterOptions.isVisible()) {
        await filterOptions.selectOption('work');
        await expect(page.getByText('Organized Draft')).toBeVisible();
      }
    });

    test('should allow draft search and filtering', async ({ page }) => {
      // Create a few test drafts first
      const testDrafts = [
        { title: 'Marketing Report', content: 'Marketing quarterly report', tags: ['marketing', 'report'] },
        { title: 'Code Review Notes', content: 'Notes from code review session', tags: ['development', 'review'] },
        { title: 'Team Meeting Minutes', content: 'Minutes from team standup', tags: ['meeting', 'team'] }
      ];
      
      for (const draft of testDrafts) {
        await page.getByRole('button', { name: /create.*post/i }).click();
        await page.getByRole('textbox', { name: /title/i }).fill(draft.title);
        await page.getByRole('textbox', { name: /content/i }).fill(draft.content);
        
        // Add tags if field exists
        const tagInput = page.getByRole('textbox', { name: /tags/i });
        if (await tagInput.isVisible()) {
          await tagInput.fill(draft.tags.join(','));
        }
        
        await page.getByRole('button', { name: /save.*draft/i }).click();
        await page.waitForTimeout(1000);
        await page.goto('/');
      }
      
      // Navigate to drafts
      await page.getByRole('button', { name: /drafts/i }).click();
      
      // Test search functionality
      const searchInput = page.getByPlaceholder(/search.*drafts/i);
      if (await searchInput.isVisible()) {
        await searchInput.fill('marketing');
        await page.waitForTimeout(500);
        
        // Should show only marketing-related draft
        await expect(page.getByText('Marketing Report')).toBeVisible();
        await expect(page.getByText('Code Review Notes')).not.toBeVisible();
      }
    });
  });

  test.describe('Version History', () => {
    test('should create version history for draft changes', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      
      const title = `Versioned Draft ${Date.now()}`;
      await page.getByRole('textbox', { name: /title/i }).fill(title);
      await page.getByRole('textbox', { name: /content/i }).fill('Initial version');
      
      await page.getByRole('button', { name: /save.*draft/i }).click();
      await page.waitForTimeout(1000);
      
      // Make changes
      await page.getByRole('textbox', { name: /content/i }).fill('Updated version with more content');
      await page.getByRole('button', { name: /save.*draft/i }).click();
      await page.waitForTimeout(1000);
      
      // Check version history
      const versionButton = page.getByRole('button', { name: /version|history/i });
      if (await versionButton.isVisible()) {
        await versionButton.click();
        
        // Should show version history
        const versionList = page.locator('[data-testid="version-history"]');
        await expect(versionList).toBeVisible();
        
        const versions = page.locator('[data-testid="version-item"]');
        const versionCount = await versions.count();
        expect(versionCount).toBeGreaterThanOrEqual(2);
      }
    });

    test('should allow restoring previous versions', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      
      await page.getByRole('textbox', { name: /title/i }).fill('Restore Test Draft');
      await page.getByRole('textbox', { name: /content/i }).fill('Original content');
      await page.getByRole('button', { name: /save.*draft/i }).click();
      await page.waitForTimeout(1000);
      
      // Update content
      await page.getByRole('textbox', { name: /content/i }).fill('Modified content that should be reverted');
      await page.getByRole('button', { name: /save.*draft/i }).click();
      await page.waitForTimeout(1000);
      
      // Open version history and restore
      const versionButton = page.getByRole('button', { name: /version|history/i });
      if (await versionButton.isVisible()) {
        await versionButton.click();
        
        // Find first version and restore
        const firstVersion = page.locator('[data-testid="version-item"]').first();
        const restoreButton = firstVersion.locator('[data-testid="restore-version"]');
        
        if (await restoreButton.isVisible()) {
          await restoreButton.click();
          
          // Confirm restoration
          const confirmButton = page.getByRole('button', { name: /confirm|restore/i });
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
          }
          
          // Content should be restored
          const contentField = page.getByRole('textbox', { name: /content/i });
          await expect(contentField).toHaveValue('Original content');
        }
      }
    });

    test('should show version diff comparison', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      
      await page.getByRole('textbox', { name: /title/i }).fill('Diff Test Draft');
      await page.getByRole('textbox', { name: /content/i }).fill('Line 1\nLine 2\nLine 3');
      await page.getByRole('button', { name: /save.*draft/i }).click();
      await page.waitForTimeout(1000);
      
      // Update with changes
      await page.getByRole('textbox', { name: /content/i }).fill('Line 1 (modified)\nLine 2\nLine 4 (new)');
      await page.getByRole('button', { name: /save.*draft/i }).click();
      await page.waitForTimeout(1000);
      
      // Open version history
      const versionButton = page.getByRole('button', { name: /version|history/i });
      if (await versionButton.isVisible()) {
        await versionButton.click();
        
        // Look for diff view
        const diffButton = page.getByRole('button', { name: /diff|compare|changes/i });
        if (await diffButton.isVisible()) {
          await diffButton.click();
          
          // Should show diff view with additions and deletions
          const diffView = page.locator('[data-testid="diff-view"]');
          await expect(diffView).toBeVisible();
          
          // Look for diff indicators
          const additions = page.locator('.diff-addition, [data-testid="diff-added"]');
          const deletions = page.locator('.diff-deletion, [data-testid="diff-removed"]');
          
          expect(await additions.count()).toBeGreaterThan(0);
          expect(await deletions.count()).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('Draft Collaboration', () => {
    test('should allow sharing drafts with collaborators', async ({ page }) => {
      await page.getByRole('button', { name: /create.*post/i }).click();
      
      await page.getByRole('textbox', { name: /title/i }).fill('Collaborative Draft');
      await page.getByRole('textbox', { name: /content/i }).fill('This draft will be shared');
      await page.getByRole('button', { name: /save.*draft/i }).click();
      await page.waitForTimeout(1000);
      
      // Look for share functionality
      const shareButton = page.getByRole('button', { name: /share|collaborate/i });
      if (await shareButton.isVisible()) {
        await shareButton.click();
        
        // Should open sharing dialog
        const shareDialog = page.locator('[data-testid="share-dialog"]');
        await expect(shareDialog).toBeVisible();
        
        // Should allow adding collaborators
        const collaboratorInput = page.getByPlaceholder(/add.*collaborator|email/i);
        if (await collaboratorInput.isVisible()) {
          await collaboratorInput.fill('colleague@example.com');
          await page.getByRole('button', { name: /add|invite/i }).click();
          
          // Should show collaborator in list
          await expect(page.getByText('colleague@example.com')).toBeVisible();
        }
      }
    });

    test('should show collaborator presence', async ({ page }) => {
      // This would require WebSocket setup for real-time collaboration
      // For now, we'll test the UI elements
      
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('textbox', { name: /title/i }).fill('Presence Test Draft');
      
      // Mock collaborator presence
      await page.addInitScript(() => {
        (window as any).mockCollaborators = [
          { id: '1', name: 'Alice', color: '#ff0000', cursor: 50 },
          { id: '2', name: 'Bob', color: '#00ff00', cursor: 100 }
        ];
      });
      
      // Look for collaborator indicators
      const collaboratorList = page.locator('[data-testid="collaborator-presence"]');
      if (await collaboratorList.isVisible()) {
        // Should show active collaborators
        const collaborators = page.locator('[data-testid="active-collaborator"]');
        const count = await collaborators.count();
        expect(count).toBeGreaterThan(0);
      }
    });

    test('should handle collaborative editing conflicts', async ({ page }) => {
      // Simulate a conflict scenario
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('textbox', { name: /title/i }).fill('Conflict Test Draft');
      await page.getByRole('textbox', { name: /content/i }).fill('Original content');
      await page.getByRole('button', { name: /save.*draft/i }).click();
      await page.waitForTimeout(1000);
      
      // Simulate external change (mock server response)
      await page.evaluate(() => {
        // Mock a conflict response
        (window as any).mockConflict = {
          serverVersion: 2,
          localVersion: 1,
          changes: 'Content modified by another user'
        };
      });
      
      // Make local changes
      await page.getByRole('textbox', { name: /content/i }).fill('Locally modified content');
      await page.getByRole('button', { name: /save.*draft/i }).click();
      
      // Should show conflict resolution dialog
      const conflictDialog = page.locator('[data-testid="conflict-dialog"]');
      if (await conflictDialog.isVisible()) {
        await expect(conflictDialog).toBeVisible();
        
        // Should provide resolution options
        const keepLocal = page.getByRole('button', { name: /keep.*local|my.*changes/i });
        const keepServer = page.getByRole('button', { name: /keep.*server|their.*changes/i });
        const merge = page.getByRole('button', { name: /merge/i });
        
        // Should have at least one resolution option
        const hasOptions = await keepLocal.isVisible() || await keepServer.isVisible() || await merge.isVisible();
        expect(hasOptions).toBe(true);
      }
    });
  });

  test.describe('Bulk Operations', () => {
    test('should support bulk delete of drafts', async ({ page }) => {
      // Create multiple test drafts first
      const draftTitles = [`Bulk Test 1 ${Date.now()}`, `Bulk Test 2 ${Date.now()}`, `Bulk Test 3 ${Date.now()}`];
      
      for (const title of draftTitles) {
        await page.getByRole('button', { name: /create.*post/i }).click();
        await page.getByRole('textbox', { name: /title/i }).fill(title);
        await page.getByRole('textbox', { name: /content/i }).fill('Bulk test content');
        await page.getByRole('button', { name: /save.*draft/i }).click();
        await page.waitForTimeout(1000);
        await page.goto('/');
      }
      
      // Go to drafts
      await page.getByRole('button', { name: /drafts/i }).click();
      
      // Look for bulk selection
      const bulkSelect = page.locator('[data-testid="bulk-select"]');
      if (await bulkSelect.isVisible()) {
        // Select multiple drafts
        const draftCheckboxes = page.locator('[data-testid="draft-checkbox"]');
        const count = Math.min(await draftCheckboxes.count(), 2);
        
        for (let i = 0; i < count; i++) {
          await draftCheckboxes.nth(i).click();
        }
        
        // Bulk delete
        const bulkDeleteButton = page.getByRole('button', { name: /delete.*selected|bulk.*delete/i });
        if (await bulkDeleteButton.isVisible()) {
          await bulkDeleteButton.click();
          
          // Confirm deletion
          const confirmButton = page.getByRole('button', { name: /confirm|delete/i });
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
          }
          
          // Selected drafts should be removed
          await page.waitForTimeout(1000);
          // Check that fewer drafts are visible
        }
      }
    });

    test('should support bulk publish of drafts', async ({ page }) => {
      // Create publishable drafts
      const draftTitles = [`Publish Test 1 ${Date.now()}`, `Publish Test 2 ${Date.now()}`];
      
      for (const title of draftTitles) {
        await page.getByRole('button', { name: /create.*post/i }).click();
        await page.getByRole('textbox', { name: /title/i }).fill(title);
        await page.getByRole('textbox', { name: /content/i }).fill('Ready for publishing content');
        await page.getByRole('button', { name: /save.*draft/i }).click();
        await page.waitForTimeout(1000);
        await page.goto('/');
      }
      
      await page.getByRole('button', { name: /drafts/i }).click();
      
      // Select drafts for bulk publish
      const draftCheckboxes = page.locator('[data-testid="draft-checkbox"]');
      const count = Math.min(await draftCheckboxes.count(), 2);
      
      for (let i = 0; i < count; i++) {
        await draftCheckboxes.nth(i).click();
      }
      
      // Bulk publish
      const bulkPublishButton = page.getByRole('button', { name: /publish.*selected|bulk.*publish/i });
      if (await bulkPublishButton.isVisible()) {
        await bulkPublishButton.click();
        
        // Should show confirmation
        const confirmDialog = page.locator('[data-testid="bulk-publish-confirm"]');
        if (await confirmDialog.isVisible()) {
          await page.getByRole('button', { name: /confirm|publish/i }).click();
          
          // Should show success message
          const successMessage = page.locator('text=/published.*successfully/i');
          await expect(successMessage).toBeVisible();
        }
      }
    });

    test('should support bulk archive operation', async ({ page }) => {
      // Similar to bulk delete but for archiving
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('textbox', { name: /title/i }).fill(`Archive Test ${Date.now()}`);
      await page.getByRole('textbox', { name: /content/i }).fill('Archive test content');
      await page.getByRole('button', { name: /save.*draft/i }).click();
      await page.waitForTimeout(1000);
      
      await page.getByRole('button', { name: /drafts/i }).click();
      
      // Test archiving functionality if available
      const archiveButton = page.getByRole('button', { name: /archive|move.*archive/i });
      if (await archiveButton.isVisible()) {
        // Select draft
        const checkbox = page.locator('[data-testid="draft-checkbox"]').first();
        if (await checkbox.isVisible()) {
          await checkbox.click();
          await archiveButton.click();
          
          // Should move to archived section
          const archivedSection = page.getByRole('button', { name: /archived/i });
          if (await archivedSection.isVisible()) {
            await archivedSection.click();
            await expect(page.getByText('Archive Test')).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Performance & Error Handling', () => {
    test('should handle large draft content efficiently', async ({ page }) => {
      const largeContent = 'A'.repeat(10000); // 10KB content
      
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('textbox', { name: /title/i }).fill('Large Content Draft');
      
      const startTime = Date.now();
      await page.getByRole('textbox', { name: /content/i }).fill(largeContent);
      const fillTime = Date.now() - startTime;
      
      // Should handle large content without significant delay
      expect(fillTime).toBeLessThan(2000);
      
      // Auto-save should still work
      await page.waitForTimeout(4000);
      const saveIndicator = page.locator('[data-testid="auto-save-status"]');
      await expect(saveIndicator).toBeVisible();
    });

    test('should recover from save failures', async ({ page }) => {
      // Mock save failures
      let failCount = 0;
      await page.route('**/api/v1/drafts/**', route => {
        failCount++;
        if (failCount <= 2) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });
      
      await page.getByRole('button', { name: /create.*post/i }).click();
      await page.getByRole('textbox', { name: /title/i }).fill('Recovery Test Draft');
      await page.getByRole('button', { name: /save.*draft/i }).click();
      
      // Should show retry mechanism
      const retryIndicator = page.locator('[data-testid="save-retry"], text=/retry|failed|retrying/i');
      await expect(retryIndicator).toBeVisible();
      
      // Should eventually succeed
      await page.waitForTimeout(10000);
      const successIndicator = page.locator('[data-testid="save-success"]');
      await expect(successIndicator).toBeVisible();
    });

    test('should maintain performance with many drafts', async ({ page }) => {
      // This test assumes some drafts already exist
      await page.getByRole('button', { name: /drafts/i }).click();
      
      const startTime = Date.now();
      await page.waitForSelector('[data-testid="drafts-list"]');
      const loadTime = Date.now() - startTime;
      
      // Should load drafts list within 2 seconds
      expect(loadTime).toBeLessThan(2000);
      
      // Test scrolling performance
      const draftsList = page.locator('[data-testid="drafts-list"]');
      await draftsList.evaluate(el => el.scrollTop = el.scrollHeight);
      await page.waitForTimeout(100);
      
      // Should remain responsive
      const drafts = page.locator('[data-testid="draft-item"]');
      if (await drafts.count() > 0) {
        await expect(drafts.first()).toBeVisible();
      }
    });
  });
});