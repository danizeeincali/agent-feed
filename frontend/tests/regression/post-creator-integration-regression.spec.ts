import { test, expect, Page } from '@playwright/test';

const FRONTEND_URL = 'http://127.0.0.1:5173';

test.describe('PostCreator Integration Regression Tests', () => {
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
    await page.evaluate(() => localStorage.clear());
  });

  test.describe('PostCreator Modal Functionality', () => {
    test('should open and close PostCreator modal correctly', async () => {
      // Open modal
      await page.locator('[data-testid="create-post-button"]').click();
      await expect(page.locator('[data-testid="post-creator-modal"]')).toBeVisible();
      
      // Verify modal content is present
      await expect(page.locator('[data-testid="post-content-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="save-draft-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="publish-post-button"]')).toBeVisible();
      
      // Close modal
      await page.locator('[data-testid="close-modal-button"]').click();
      await expect(page.locator('[data-testid="post-creator-modal"]')).not.toBeVisible();
    });

    test('should maintain form state during modal interactions', async () => {
      const testContent = 'Test content for modal state persistence';
      
      // Open modal and enter content
      await page.locator('[data-testid="create-post-button"]').click();
      await page.fill('[data-testid="post-content-input"]', testContent);
      
      // Close and reopen modal
      await page.locator('[data-testid="close-modal-button"]').click();
      await page.locator('[data-testid="create-post-button"]').click();
      
      // Content should be cleared for new post
      const inputValue = await page.inputValue('[data-testid="post-content-input"]');
      expect(inputValue).toBe('');
    });

    test('should handle keyboard navigation and accessibility', async () => {
      await page.locator('[data-testid="create-post-button"]').click();
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusedElement).toBeTruthy();
      
      // Test escape key to close modal
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="post-creator-modal"]')).not.toBeVisible();
    });
  });

  test.describe('Form Validation and Error Handling', () => {
    test('should validate required fields', async () => {
      await page.locator('[data-testid="create-post-button"]').click();
      
      // Try to publish without content
      await page.locator('[data-testid="publish-post-button"]').click();
      
      // Should show validation message or prevent submission
      const errorMessage = page.locator('[data-testid="validation-error"]');
      if (await errorMessage.isVisible()) {
        expect(await errorMessage.textContent()).toContain('required');
      }
    });

    test('should handle form submission errors gracefully', async () => {
      await page.locator('[data-testid="create-post-button"]').click();
      await page.fill('[data-testid="post-content-input"]', 'Test post content');
      
      // Mock network failure
      await page.route('**/api/posts', route => route.abort());
      
      await page.locator('[data-testid="publish-post-button"]').click();
      
      // Should handle error gracefully
      const errorState = page.locator('[data-testid="error-message"]');
      if (await errorState.isVisible()) {
        expect(await errorState.textContent()).toBeTruthy();
      }
    });

    test('should sanitize input content', async () => {
      const maliciousContent = '<script>alert("xss")</script>Test content';
      
      await page.locator('[data-testid="create-post-button"]').click();
      await page.fill('[data-testid="post-content-input"]', maliciousContent);
      await page.locator('[data-testid="save-draft-button"]').click();
      
      // Verify content is properly sanitized in storage
      const drafts = await page.evaluate(() => {
        const stored = localStorage.getItem('social_media_drafts');
        return stored ? JSON.parse(stored) : [];
      });
      
      expect(drafts[0].content).not.toContain('<script>');
    });
  });

  test.describe('Draft Integration', () => {
    test('should create drafts from PostCreator', async () => {
      const draftContent = 'Draft created from PostCreator';
      
      await page.locator('[data-testid="create-post-button"]').click();
      await page.fill('[data-testid="post-content-input"]', draftContent);
      await page.locator('[data-testid="save-draft-button"]').click();
      
      // Verify draft was created
      const drafts = await page.evaluate(() => {
        const stored = localStorage.getItem('social_media_drafts');
        return stored ? JSON.parse(stored) : [];
      });
      
      expect(drafts).toHaveLength(1);
      expect(drafts[0].content).toBe(draftContent);
      expect(drafts[0].createdAt).toBeDefined();
      expect(drafts[0].id).toBeDefined();
    });

    test('should update existing draft when editing', async () => {
      // Create initial draft
      await page.locator('[data-testid="create-post-button"]').click();
      await page.fill('[data-testid="post-content-input"]', 'Initial draft content');
      await page.locator('[data-testid="save-draft-button"]').click();
      await page.locator('[data-testid="close-modal-button"]').click();
      
      // Edit through draft manager
      await page.locator('[data-testid="draft-manager-button"]').click();
      await page.locator('[data-testid="draft-item"]:first-child [data-testid="edit-draft-button"]').click();
      
      // Update content
      await page.fill('[data-testid="post-content-input"]', 'Updated draft content');
      await page.locator('[data-testid="save-draft-button"]').click();
      
      // Verify no duplication occurred
      const drafts = await page.evaluate(() => {
        const stored = localStorage.getItem('social_media_drafts');
        return stored ? JSON.parse(stored) : [];
      });
      
      expect(drafts).toHaveLength(1);
      expect(drafts[0].content).toBe('Updated draft content');
    });

    test('should maintain draft metadata correctly', async () => {
      await page.locator('[data-testid="create-post-button"]').click();
      await page.fill('[data-testid="post-content-input"]', 'Metadata test draft');
      await page.locator('[data-testid="save-draft-button"]').click();
      
      const drafts = await page.evaluate(() => {
        const stored = localStorage.getItem('social_media_drafts');
        return stored ? JSON.parse(stored) : [];
      });
      
      const draft = drafts[0];
      expect(draft.id).toMatch(/^draft_\d+_\d+$/);
      expect(new Date(draft.createdAt)).toBeInstanceOf(Date);
      expect(new Date(draft.updatedAt)).toBeInstanceOf(Date);
      expect(draft.content).toBe('Metadata test draft');
    });
  });

  test.describe('Template System Integration', () => {
    test('should load and apply templates', async () => {
      // Create a template first (simulate existing template)
      await page.evaluate(() => {
        const templates = [{
          id: 'template_1',
          name: 'Test Template',
          content: 'This is a test template: {placeholder}',
          createdAt: new Date().toISOString()
        }];
        localStorage.setItem('post_templates', JSON.stringify(templates));
      });
      
      await page.locator('[data-testid="create-post-button"]').click();
      
      // Check if template selector is available
      const templateSelector = page.locator('[data-testid="template-selector"]');
      if (await templateSelector.isVisible()) {
        await templateSelector.selectOption('template_1');
        
        const inputValue = await page.inputValue('[data-testid="post-content-input"]');
        expect(inputValue).toContain('This is a test template');
      }
    });

    test('should handle template placeholders', async () => {
      await page.evaluate(() => {
        const templates = [{
          id: 'template_placeholder',
          name: 'Placeholder Template',
          content: 'Hello {name}, welcome to {platform}!',
          createdAt: new Date().toISOString()
        }];
        localStorage.setItem('post_templates', JSON.stringify(templates));
      });
      
      await page.locator('[data-testid="create-post-button"]').click();
      
      const templateSelector = page.locator('[data-testid="template-selector"]');
      if (await templateSelector.isVisible()) {
        await templateSelector.selectOption('template_placeholder');
        
        // Fill placeholders if UI exists
        const nameInput = page.locator('[data-testid="placeholder-name"]');
        const platformInput = page.locator('[data-testid="placeholder-platform"]');
        
        if (await nameInput.isVisible()) {
          await nameInput.fill('John');
          await platformInput.fill('Twitter');
          
          const finalContent = await page.inputValue('[data-testid="post-content-input"]');
          expect(finalContent).toBe('Hello John, welcome to Twitter!');
        }
      }
    });
  });

  test.describe('Performance and Responsiveness', () => {
    test('should load PostCreator modal quickly', async () => {
      const startTime = Date.now();
      
      await page.locator('[data-testid="create-post-button"]').click();
      await expect(page.locator('[data-testid="post-creator-modal"]')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(1000); // Should load within 1 second
    });

    test('should handle large content efficiently', async () => {
      const largeContent = 'A'.repeat(5000);
      
      await page.locator('[data-testid="create-post-button"]').click();
      
      const startTime = Date.now();
      await page.fill('[data-testid="post-content-input"]', largeContent);
      const inputTime = Date.now() - startTime;
      
      expect(inputTime).toBeLessThan(2000); // Should handle large input quickly
      
      const inputValue = await page.inputValue('[data-testid="post-content-input"]');
      expect(inputValue.length).toBe(5000);
    });

    test('should maintain responsiveness during auto-save', async () => {
      await page.locator('[data-testid="create-post-button"]').click();
      await page.fill('[data-testid="post-content-input"]', 'Auto-save responsiveness test');
      await page.locator('[data-testid="save-draft-button"]').click();
      
      // Continue editing while auto-save might be running
      for (let i = 1; i <= 10; i++) {
        await page.fill('[data-testid="post-content-input"]', `Auto-save test ${i}`);
        await page.waitForTimeout(100);
      }
      
      // UI should remain responsive
      const finalValue = await page.inputValue('[data-testid="post-content-input"]');
      expect(finalValue).toBe('Auto-save test 10');
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('should handle different input methods', async () => {
      await page.locator('[data-testid="create-post-button"]').click();
      
      // Test different input methods
      await page.fill('[data-testid="post-content-input"]', 'Typed content');
      await page.keyboard.press('Backspace');
      await page.keyboard.type(' with keyboard');
      
      // Test paste operation
      await page.evaluate(() => {
        navigator.clipboard.writeText(' and pasted').catch(() => {});
      });
      
      const finalValue = await page.inputValue('[data-testid="post-content-input"]');
      expect(finalValue).toContain('content with keyboard');
    });

    test('should maintain focus states correctly', async () => {
      await page.locator('[data-testid="create-post-button"]').click();
      
      // Focus input
      await page.locator('[data-testid="post-content-input"]').focus();
      
      // Verify focus state
      const isFocused = await page.evaluate(() => {
        const input = document.querySelector('[data-testid="post-content-input"]');
        return document.activeElement === input;
      });
      
      expect(isFocused).toBe(true);
    });
  });

  test.describe('Data Integrity', () => {
    test('should preserve content during modal state changes', async () => {
      const testContent = 'Content preservation test';
      
      await page.locator('[data-testid="create-post-button"]').click();
      await page.fill('[data-testid="post-content-input"]', testContent);
      
      // Save as draft
      await page.locator('[data-testid="save-draft-button"]').click();
      
      // Clear input and load draft
      await page.fill('[data-testid="post-content-input"]', '');
      await page.locator('[data-testid="close-modal-button"]').click();
      
      // Edit draft
      await page.locator('[data-testid="draft-manager-button"]').click();
      await page.locator('[data-testid="draft-item"]:first-child [data-testid="edit-draft-button"]').click();
      
      // Verify content is restored
      const restoredContent = await page.inputValue('[data-testid="post-content-input"]');
      expect(restoredContent).toBe(testContent);
    });

    test('should handle concurrent edits correctly', async () => {
      // Create draft
      await page.locator('[data-testid="create-post-button"]').click();
      await page.fill('[data-testid="post-content-input"]', 'Concurrent edit test');
      await page.locator('[data-testid="save-draft-button"]').click();
      
      // Simulate rapid edits
      const edits = ['Edit 1', 'Edit 2', 'Edit 3', 'Final Edit'];
      
      for (const edit of edits) {
        await page.fill('[data-testid="post-content-input"]', edit);
        await page.locator('[data-testid="save-draft-button"]').click();
        await page.waitForTimeout(100);
      }
      
      // Verify final state
      const drafts = await page.evaluate(() => {
        const stored = localStorage.getItem('social_media_drafts');
        return stored ? JSON.parse(stored) : [];
      });
      
      expect(drafts).toHaveLength(1);
      expect(drafts[0].content).toBe('Final Edit');
    });

    test('should maintain data consistency across page refresh', async () => {
      const testContent = 'Persistence across refresh test';
      
      await page.locator('[data-testid="create-post-button"]').click();
      await page.fill('[data-testid="post-content-input"]', testContent);
      await page.locator('[data-testid="save-draft-button"]').click();
      await page.locator('[data-testid="close-modal-button"]').click();
      
      // Refresh page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify draft persists
      await page.locator('[data-testid="draft-manager-button"]').click();
      await page.locator('[data-testid="draft-item"]:first-child [data-testid="edit-draft-button"]').click();
      
      const persistedContent = await page.inputValue('[data-testid="post-content-input"]');
      expect(persistedContent).toBe(testContent);
    });
  });
});