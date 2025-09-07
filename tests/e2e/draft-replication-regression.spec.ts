/**
 * Draft Replication Regression Tests
 * Phase 1 SPARC - End-to-end validation of draft editing workflow
 * 
 * These tests validate that draft editing updates existing drafts
 * instead of creating new ones (preventing replication bug)
 */

import { test, expect, type Page } from '@playwright/test';

test.describe('Draft Replication Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to application and clear any existing drafts
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('agent-feed-drafts');
    });
  });

  async function createTestDraft(page: Page, title: string, content: string) {
    // Go to drafts page and create a new draft
    await page.goto('/drafts');
    await page.click('[data-testid="create-new-draft"], button:has-text("New Draft")');
    
    // Wait for modal to appear
    await page.waitForSelector('[data-testid="post-creator-modal"], [role="dialog"]');
    
    // Fill in draft details
    await page.fill('input[placeholder*="title"], input[name="title"]', title);
    await page.fill('textarea[placeholder*="content"], textarea[name="content"]', content);
    
    // Save draft
    await page.click('button:has-text("Save Draft")');
    await page.waitForTimeout(1000); // Wait for save to complete
    
    // Close modal
    await page.press('Escape');
    await page.waitForTimeout(500);
    
    return { title, content };
  }

  async function getDraftCount(page: Page): Promise<number> {
    await page.goto('/drafts');
    await page.waitForTimeout(1000);
    
    // Count draft cards or table rows
    const draftCards = await page.$$('[data-testid*="draft-"], .draft-card, tbody tr');
    return draftCards.length;
  }

  test('CRITICAL: Editing a draft should update it, not create a duplicate', async ({ page }) => {
    // Arrange - Create initial draft
    const originalTitle = 'Original Draft Title';
    const originalContent = 'Original draft content for testing';
    await createTestDraft(page, originalTitle, originalContent);
    
    // Verify initial state
    await page.goto('/drafts');
    const initialCount = await getDraftCount(page);
    expect(initialCount).toBe(1);
    
    // Act - Edit the draft
    await page.click('button:has-text("Edit"), [data-testid*="edit-draft"]', { timeout: 5000 });
    await page.waitForSelector('[role="dialog"], [data-testid="post-creator-modal"]');
    
    // Modify the draft
    const modifiedTitle = 'Modified Draft Title - Updated';
    const modifiedContent = 'Modified draft content - this should update the existing draft';
    
    await page.fill('input[placeholder*="title"], input[name="title"]', modifiedTitle);
    await page.fill('textarea[placeholder*="content"], textarea[name="content"]', modifiedContent);
    
    // Save the changes
    await page.click('button:has-text("Save Draft")');
    await page.waitForTimeout(2000); // Wait for save operation
    
    // Close modal
    await page.press('Escape');
    await page.waitForTimeout(500);
    
    // Assert - Verify no duplicate was created
    const finalCount = await getDraftCount(page);
    expect(finalCount).toBe(1); // Still only 1 draft
    
    // Verify the draft was updated with new content
    await page.waitForSelector('text=' + modifiedTitle.substring(0, 15), { timeout: 5000 });
    await expect(page.locator('text=' + modifiedTitle)).toBeVisible();
  });

  test('Auto-save should update existing draft, not create new ones', async ({ page }) => {
    // Arrange - Create initial draft
    await createTestDraft(page, 'Auto-save Test', 'Initial content');
    const initialCount = await getDraftCount(page);
    
    // Act - Open for editing and trigger auto-save
    await page.goto('/drafts');
    await page.click('button:has-text("Edit")');
    await page.waitForSelector('[role="dialog"]');
    
    // Clear and slowly type new content to trigger auto-save
    await page.fill('textarea[placeholder*="content"], textarea[name="content"]', '');
    const newContent = 'Auto-save content that should update existing draft not create new one';
    
    // Type slowly to trigger auto-save
    for (let i = 0; i < newContent.length; i += 5) {
      const chunk = newContent.substring(i, i + 5);
      await page.type('textarea[placeholder*="content"], textarea[name="content"]', chunk);
      await page.waitForTimeout(500);
    }
    
    // Wait for auto-save indicator or timeout
    await page.waitForTimeout(4000); // Auto-save usually triggers after 3 seconds
    
    // Close modal without explicit save
    await page.press('Escape');
    await page.waitForTimeout(500);
    
    // Assert - No duplicate drafts
    const finalCount = await getDraftCount(page);
    expect(finalCount).toBe(initialCount);
  });

  test('Multiple edits of same draft should not create duplicates', async ({ page }) => {
    // Arrange
    await createTestDraft(page, 'Multiple Edits Test', 'Original content');
    const initialCount = await getDraftCount(page);
    
    // Act - Edit the draft multiple times
    for (let i = 1; i <= 3; i++) {
      await page.goto('/drafts');
      await page.click('button:has-text("Edit")');
      await page.waitForSelector('[role="dialog"]');
      
      const updatedTitle = `Multiple Edits Test - Version ${i}`;
      await page.fill('input[placeholder*="title"], input[name="title"]', updatedTitle);
      
      await page.click('button:has-text("Save Draft")');
      await page.waitForTimeout(1000);
      
      await page.press('Escape');
      await page.waitForTimeout(500);
      
      // Verify count remains the same
      const currentCount = await getDraftCount(page);
      expect(currentCount).toBe(initialCount);
    }
    
    // Final verification
    const finalCount = await getDraftCount(page);
    expect(finalCount).toBe(1);
  });

  test('Draft editing via keyboard shortcuts should not create duplicates', async ({ page }) => {
    // Arrange
    await createTestDraft(page, 'Keyboard Shortcut Test', 'Original content');
    const initialCount = await getDraftCount(page);
    
    // Act - Edit using keyboard shortcuts
    await page.goto('/drafts');
    await page.click('button:has-text("Edit")');
    await page.waitForSelector('[role="dialog"]');
    
    await page.fill('input[placeholder*="title"], input[name="title"]', 'Saved via Cmd+S');
    
    // Use Cmd+S to save (or Ctrl+S on Windows/Linux)
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+s`);
    await page.waitForTimeout(1000);
    
    await page.press('Escape');
    
    // Assert
    const finalCount = await getDraftCount(page);
    expect(finalCount).toBe(initialCount);
  });

  test('Rapid saves should be debounced and not create duplicates', async ({ page }) => {
    // Arrange
    await createTestDraft(page, 'Rapid Save Test', 'Original content');
    const initialCount = await getDraftCount(page);
    
    // Act - Rapid saves
    await page.goto('/drafts');
    await page.click('button:has-text("Edit")');
    await page.waitForSelector('[role="dialog"]');
    
    // Rapidly click save multiple times
    await page.fill('input[placeholder*="title"], input[name="title"]', 'Rapid Save Test - Final');
    
    for (let i = 0; i < 5; i++) {
      await page.click('button:has-text("Save Draft")');
      await page.waitForTimeout(200); // Small delay between clicks
    }
    
    await page.waitForTimeout(2000); // Wait for all saves to process
    await page.press('Escape');
    
    // Assert
    const finalCount = await getDraftCount(page);
    expect(finalCount).toBe(initialCount);
  });

  test('REGRESSION: Modal re-opening should maintain edit context', async ({ page }) => {
    // Arrange
    await createTestDraft(page, 'Modal Re-open Test', 'Original content');
    const initialCount = await getDraftCount(page);
    
    // Act - Open, close, and re-open draft editing
    await page.goto('/drafts');
    
    // First edit session - close without saving
    await page.click('button:has-text("Edit")');
    await page.waitForSelector('[role="dialog"]');
    await page.fill('input[placeholder*="title"], input[name="title"]', 'Unsaved changes');
    await page.press('Escape');
    
    // Second edit session - save changes
    await page.click('button:has-text("Edit")');
    await page.waitForSelector('[role="dialog"]');
    
    // Verify original content is still there (unsaved changes were discarded)
    const titleValue = await page.inputValue('input[placeholder*="title"], input[name="title"]');
    expect(titleValue).toBe('Modal Re-open Test'); // Original title
    
    // Make and save new changes
    await page.fill('input[placeholder*="title"], input[name="title"]', 'Modal Re-open Test - Final Save');
    await page.click('button:has-text("Save Draft")');
    await page.waitForTimeout(1000);
    await page.press('Escape');
    
    // Assert - No duplicates created
    const finalCount = await getDraftCount(page);
    expect(finalCount).toBe(initialCount);
  });

  test('EDGE CASE: Concurrent modal sessions should not interfere', async ({ page, context }) => {
    // This test simulates the edge case of multiple tabs editing the same draft
    await createTestDraft(page, 'Concurrent Test', 'Original content');
    
    // Open second tab
    const page2 = await context.newPage();
    
    // Both tabs navigate to drafts
    await page.goto('/drafts');
    await page2.goto('/drafts');
    
    const initialCount = await getDraftCount(page);
    
    // Both tabs try to edit the same draft
    await page.click('button:has-text("Edit")');
    await page2.click('button:has-text("Edit")');
    
    await page.waitForSelector('[role="dialog"]');
    await page2.waitForSelector('[role="dialog"]');
    
    // Both make different changes
    await page.fill('input[placeholder*="title"], input[name="title"]', 'Changed by Tab 1');
    await page2.fill('input[placeholder*="title"], input[name="title"]', 'Changed by Tab 2');
    
    // Both save
    await page.click('button:has-text("Save Draft")');
    await page2.click('button:has-text("Save Draft")');
    
    await page.waitForTimeout(2000);
    
    // Close both modals
    await page.press('Escape');
    await page2.press('Escape');
    
    // Assert - Still only one draft (last save wins)
    const finalCount = await getDraftCount(page);
    expect(finalCount).toBe(initialCount);
    
    await page2.close();
  });

  test('PERFORMANCE: Large content editing should not timeout or duplicate', async ({ page }) => {
    // Create draft with large content
    const largeContent = 'This is a test of large content editing. '.repeat(500); // ~20KB content
    await createTestDraft(page, 'Large Content Test', largeContent);
    
    const initialCount = await getDraftCount(page);
    
    // Edit with even larger content
    await page.goto('/drafts');
    await page.click('button:has-text("Edit")');
    await page.waitForSelector('[role="dialog"]');
    
    const extraLargeContent = 'Modified large content for performance testing. '.repeat(1000); // ~40KB
    await page.fill('textarea[placeholder*="content"], textarea[name="content"]', extraLargeContent);
    
    // Save should not timeout
    await page.click('button:has-text("Save Draft")');
    await page.waitForTimeout(5000); // Allow extra time for large content
    
    await page.press('Escape');
    
    // Assert - No duplicates even with large content
    const finalCount = await getDraftCount(page);
    expect(finalCount).toBe(initialCount);
  });
});

/**
 * Integration Tests - Draft Service Behavior
 */
test.describe('Draft Service Integration - Replication Prevention', () => {
  test('DraftService.updateDraft should be called for existing drafts', async ({ page }) => {
    // Setup service method tracking
    await page.addInitScript(() => {
      window.draftServiceCalls = {
        createDraft: 0,
        updateDraft: 0
      };
      
      // Mock or track draft service calls
      const originalCreateDraft = window.draftService?.createDraft;
      const originalUpdateDraft = window.draftService?.updateDraft;
      
      if (originalCreateDraft) {
        window.draftService.createDraft = (...args) => {
          window.draftServiceCalls.createDraft++;
          return originalCreateDraft.apply(window.draftService, args);
        };
      }
      
      if (originalUpdateDraft) {
        window.draftService.updateDraft = (...args) => {
          window.draftServiceCalls.updateDraft++;
          return originalUpdateDraft.apply(window.draftService, args);
        };
      }
    });
    
    await createTestDraft(page, 'Service Method Test', 'Original content');
    
    // Edit the draft
    await page.goto('/drafts');
    await page.click('button:has-text("Edit")');
    await page.waitForSelector('[role="dialog"]');
    await page.fill('input[placeholder*="title"], input[name="title"]', 'Service Method Test - Updated');
    await page.click('button:has-text("Save Draft")');
    await page.waitForTimeout(1000);
    
    // Check which methods were called
    const calls = await page.evaluate(() => window.draftServiceCalls);
    
    // For editing, updateDraft should be called, not createDraft
    expect(calls.updateDraft).toBeGreaterThan(0);
    // createDraft should only have been called during initial creation
  });
});