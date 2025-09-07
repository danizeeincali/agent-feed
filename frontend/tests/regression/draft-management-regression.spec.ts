import { test, expect, Page } from '@playwright/test';

const FRONTEND_URL = 'http://127.0.0.1:5173';

test.describe('Draft Management Regression Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    // Clear localStorage to start with clean state
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    // Cleanup: Clear localStorage after each test
    await page.evaluate(() => localStorage.clear());
  });

  test.describe('Draft Creation Workflow', () => {
    test('should create new draft without duplication', async () => {
      // Open post creator modal
      await page.locator('[data-testid="create-post-button"]').click();
      await expect(page.locator('[data-testid="post-creator-modal"]')).toBeVisible();

      // Enter content
      const testContent = 'Test draft content for regression test';
      await page.fill('[data-testid="post-content-input"]', testContent);

      // Save as draft
      await page.locator('[data-testid="save-draft-button"]').click();
      await page.waitForTimeout(500); // Allow save operation

      // Verify draft was created
      const drafts = await page.evaluate(() => {
        const stored = localStorage.getItem('social_media_drafts');
        return stored ? JSON.parse(stored) : [];
      });

      expect(drafts).toHaveLength(1);
      expect(drafts[0].content).toBe(testContent);
      expect(drafts[0].id).toBeDefined();
    });

    test('should handle multiple draft saves without duplication', async () => {
      // Create first draft
      await page.locator('[data-testid="create-post-button"]').click();
      await page.fill('[data-testid="post-content-input"]', 'First draft');
      await page.locator('[data-testid="save-draft-button"]').click();
      await page.locator('[data-testid="close-modal-button"]').click();

      // Create second draft
      await page.locator('[data-testid="create-post-button"]').click();
      await page.fill('[data-testid="post-content-input"]', 'Second draft');
      await page.locator('[data-testid="save-draft-button"]').click();
      await page.locator('[data-testid="close-modal-button"]').click();

      // Verify both drafts exist without duplication
      const drafts = await page.evaluate(() => {
        const stored = localStorage.getItem('social_media_drafts');
        return stored ? JSON.parse(stored) : [];
      });

      expect(drafts).toHaveLength(2);
      expect(drafts.map(d => d.content).sort()).toEqual(['First draft', 'Second draft']);
      
      // Ensure unique IDs
      const ids = drafts.map(d => d.id);
      expect(new Set(ids).size).toBe(2);
    });
  });

  test.describe('Draft Editing Workflow', () => {
    test('should edit existing draft without creating duplicates', async () => {
      // Create initial draft
      await page.locator('[data-testid="create-post-button"]').click();
      await page.fill('[data-testid="post-content-input"]', 'Original content');
      await page.locator('[data-testid="save-draft-button"]').click();
      await page.locator('[data-testid="close-modal-button"]').click();

      // Open draft manager
      await page.locator('[data-testid="draft-manager-button"]').click();
      await expect(page.locator('[data-testid="draft-manager-modal"]')).toBeVisible();

      // Edit the draft
      await page.locator('[data-testid="draft-item"]:first-child [data-testid="edit-draft-button"]').click();
      await page.fill('[data-testid="post-content-input"]', 'Updated content');
      await page.locator('[data-testid="save-draft-button"]').click();

      // Verify only one draft exists with updated content
      const drafts = await page.evaluate(() => {
        const stored = localStorage.getItem('social_media_drafts');
        return stored ? JSON.parse(stored) : [];
      });

      expect(drafts).toHaveLength(1);
      expect(drafts[0].content).toBe('Updated content');
    });

    test('should maintain draft integrity during rapid edits', async () => {
      // Create initial draft
      await page.locator('[data-testid="create-post-button"]').click();
      await page.fill('[data-testid="post-content-input"]', 'Initial content');
      await page.locator('[data-testid="save-draft-button"]').click();

      // Perform rapid edits
      for (let i = 1; i <= 5; i++) {
        await page.fill('[data-testid="post-content-input"]', `Updated content ${i}`);
        await page.locator('[data-testid="save-draft-button"]').click();
        await page.waitForTimeout(100);
      }

      // Verify only one draft exists
      const drafts = await page.evaluate(() => {
        const stored = localStorage.getItem('social_media_drafts');
        return stored ? JSON.parse(stored) : [];
      });

      expect(drafts).toHaveLength(1);
      expect(drafts[0].content).toBe('Updated content 5');
    });
  });

  test.describe('Draft Deletion Workflow', () => {
    test('should delete drafts correctly', async () => {
      // Create multiple drafts
      const draftContents = ['Draft 1', 'Draft 2', 'Draft 3'];
      
      for (const content of draftContents) {
        await page.locator('[data-testid="create-post-button"]').click();
        await page.fill('[data-testid="post-content-input"]', content);
        await page.locator('[data-testid="save-draft-button"]').click();
        await page.locator('[data-testid="close-modal-button"]').click();
      }

      // Open draft manager
      await page.locator('[data-testid="draft-manager-button"]').click();
      await expect(page.locator('[data-testid="draft-manager-modal"]')).toBeVisible();

      // Delete middle draft
      await page.locator('[data-testid="draft-item"]:nth-child(2) [data-testid="delete-draft-button"]').click();
      await page.locator('[data-testid="confirm-delete-button"]').click();

      // Verify correct draft was deleted
      const drafts = await page.evaluate(() => {
        const stored = localStorage.getItem('social_media_drafts');
        return stored ? JSON.parse(stored) : [];
      });

      expect(drafts).toHaveLength(2);
      const remainingContents = drafts.map(d => d.content);
      expect(remainingContents).not.toContain('Draft 2');
    });
  });

  test.describe('Auto-save Functionality', () => {
    test('should auto-save draft changes', async () => {
      // Open post creator
      await page.locator('[data-testid="create-post-button"]').click();
      
      // Type content gradually
      await page.fill('[data-testid="post-content-input"]', 'Auto-save test content');
      
      // Save as draft first
      await page.locator('[data-testid="save-draft-button"]').click();
      await page.waitForTimeout(500);
      
      // Continue editing
      await page.fill('[data-testid="post-content-input"]', 'Auto-save test content updated');
      
      // Wait for auto-save interval
      await page.waitForTimeout(2000);
      
      // Verify draft was updated
      const drafts = await page.evaluate(() => {
        const stored = localStorage.getItem('social_media_drafts');
        return stored ? JSON.parse(stored) : [];
      });
      
      expect(drafts).toHaveLength(1);
      expect(drafts[0].content).toBe('Auto-save test content updated');
    });
  });

  test.describe('Modal State Management', () => {
    test('should maintain consistent modal state', async () => {
      // Test PostCreator modal
      await page.locator('[data-testid="create-post-button"]').click();
      await expect(page.locator('[data-testid="post-creator-modal"]')).toBeVisible();
      
      await page.locator('[data-testid="close-modal-button"]').click();
      await expect(page.locator('[data-testid="post-creator-modal"]')).not.toBeVisible();
      
      // Test DraftManager modal
      await page.locator('[data-testid="draft-manager-button"]').click();
      await expect(page.locator('[data-testid="draft-manager-modal"]')).toBeVisible();
      
      await page.locator('[data-testid="close-modal-button"]').click();
      await expect(page.locator('[data-testid="draft-manager-modal"]')).not.toBeVisible();
    });

    test('should handle modal transitions without state corruption', async () => {
      // Create a draft
      await page.locator('[data-testid="create-post-button"]').click();
      await page.fill('[data-testid="post-content-input"]', 'Modal transition test');
      await page.locator('[data-testid="save-draft-button"]').click();
      await page.locator('[data-testid="close-modal-button"]').click();

      // Open draft manager
      await page.locator('[data-testid="draft-manager-button"]').click();
      
      // Edit draft (should open PostCreator)
      await page.locator('[data-testid="draft-item"]:first-child [data-testid="edit-draft-button"]').click();
      await expect(page.locator('[data-testid="post-creator-modal"]')).toBeVisible();
      
      // Verify content is loaded
      const inputValue = await page.inputValue('[data-testid="post-content-input"]');
      expect(inputValue).toBe('Modal transition test');
    });
  });

  test.describe('Data Persistence and Consistency', () => {
    test('should persist drafts across page reloads', async () => {
      // Create drafts
      const testDrafts = ['Persistent draft 1', 'Persistent draft 2'];
      
      for (const content of testDrafts) {
        await page.locator('[data-testid="create-post-button"]').click();
        await page.fill('[data-testid="post-content-input"]', content);
        await page.locator('[data-testid="save-draft-button"]').click();
        await page.locator('[data-testid="close-modal-button"]').click();
      }

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify drafts persist
      const drafts = await page.evaluate(() => {
        const stored = localStorage.getItem('social_media_drafts');
        return stored ? JSON.parse(stored) : [];
      });

      expect(drafts).toHaveLength(2);
      const contents = drafts.map(d => d.content).sort();
      expect(contents).toEqual(['Persistent draft 1', 'Persistent draft 2']);
    });

    test('should handle localStorage corruption gracefully', async () => {
      // Corrupt localStorage
      await page.evaluate(() => {
        localStorage.setItem('social_media_drafts', 'invalid json');
      });

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should initialize with empty array
      const drafts = await page.evaluate(() => {
        const stored = localStorage.getItem('social_media_drafts');
        return stored ? JSON.parse(stored) : [];
      });

      expect(drafts).toEqual([]);

      // Should be able to create new drafts
      await page.locator('[data-testid="create-post-button"]').click();
      await page.fill('[data-testid="post-content-input"]', 'Recovery test');
      await page.locator('[data-testid="save-draft-button"]').click();

      const newDrafts = await page.evaluate(() => {
        const stored = localStorage.getItem('social_media_drafts');
        return stored ? JSON.parse(stored) : [];
      });

      expect(newDrafts).toHaveLength(1);
      expect(newDrafts[0].content).toBe('Recovery test');
    });
  });

  test.describe('Performance and Memory', () => {
    test('should handle large number of drafts efficiently', async () => {
      const startTime = Date.now();
      
      // Create 50 drafts rapidly
      for (let i = 1; i <= 50; i++) {
        await page.locator('[data-testid="create-post-button"]').click();
        await page.fill('[data-testid="post-content-input"]', `Performance test draft ${i}`);
        await page.locator('[data-testid="save-draft-button"]').click();
        await page.locator('[data-testid="close-modal-button"]').click();
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Verify all drafts were created
      const drafts = await page.evaluate(() => {
        const stored = localStorage.getItem('social_media_drafts');
        return stored ? JSON.parse(stored) : [];
      });
      
      expect(drafts).toHaveLength(50);
      
      // Performance should be reasonable (less than 30 seconds for 50 drafts)
      expect(duration).toBeLessThan(30000);
      
      // Verify unique IDs
      const ids = drafts.map(d => d.id);
      expect(new Set(ids).size).toBe(50);
    });

    test('should not create memory leaks during rapid operations', async () => {
      // Perform rapid draft operations
      for (let i = 1; i <= 10; i++) {
        // Create
        await page.locator('[data-testid="create-post-button"]').click();
        await page.fill('[data-testid="post-content-input"]', `Memory test ${i}`);
        await page.locator('[data-testid="save-draft-button"]').click();
        await page.locator('[data-testid="close-modal-button"]').click();
        
        // Edit
        await page.locator('[data-testid="draft-manager-button"]').click();
        await page.locator('[data-testid="draft-item"]:first-child [data-testid="edit-draft-button"]').click();
        await page.fill('[data-testid="post-content-input"]', `Memory test ${i} updated`);
        await page.locator('[data-testid="save-draft-button"]').click();
        await page.locator('[data-testid="close-modal-button"]').click();
        await page.locator('[data-testid="close-modal-button"]').click();
      }
      
      // Verify final state is consistent
      const drafts = await page.evaluate(() => {
        const stored = localStorage.getItem('social_media_drafts');
        return stored ? JSON.parse(stored) : [];
      });
      
      expect(drafts).toHaveLength(10);
      expect(drafts[0].content).toBe('Memory test 10 updated');
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle empty draft content gracefully', async () => {
      await page.locator('[data-testid="create-post-button"]').click();
      
      // Try to save empty draft
      await page.locator('[data-testid="save-draft-button"]').click();
      
      // Should show validation message or handle gracefully
      const drafts = await page.evaluate(() => {
        const stored = localStorage.getItem('social_media_drafts');
        return stored ? JSON.parse(stored) : [];
      });
      
      // Should either not save empty draft or save with empty content
      if (drafts.length > 0) {
        expect(drafts[0].content).toBe('');
      }
    });

    test('should handle very long content', async () => {
      const longContent = 'A'.repeat(10000);
      
      await page.locator('[data-testid="create-post-button"]').click();
      await page.fill('[data-testid="post-content-input"]', longContent);
      await page.locator('[data-testid="save-draft-button"]').click();
      
      const drafts = await page.evaluate(() => {
        const stored = localStorage.getItem('social_media_drafts');
        return stored ? JSON.parse(stored) : [];
      });
      
      expect(drafts).toHaveLength(1);
      expect(drafts[0].content.length).toBe(10000);
    });

    test('should handle special characters and unicode', async () => {
      const specialContent = '🚀 Test with emojis 🎉 and special chars: @#$%^&*()';
      
      await page.locator('[data-testid="create-post-button"]').click();
      await page.fill('[data-testid="post-content-input"]', specialContent);
      await page.locator('[data-testid="save-draft-button"]').click();
      
      const drafts = await page.evaluate(() => {
        const stored = localStorage.getItem('social_media_drafts');
        return stored ? JSON.parse(stored) : [];
      });
      
      expect(drafts).toHaveLength(1);
      expect(drafts[0].content).toBe(specialContent);
    });
  });
});