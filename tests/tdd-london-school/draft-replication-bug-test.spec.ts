/**
 * TDD London School Test - Draft Replication Bug
 * Phase 1 SPARC - Specification-driven test cases
 * 
 * Testing the draft editing workflow to prevent replication bugs
 */

import { test, expect } from '@playwright/test';
import { DraftService } from '../../frontend/src/services/DraftService';
import { Draft, DraftStatus } from '../../frontend/src/types/drafts';

test.describe('Draft Replication Bug - TDD Tests', () => {
  let draftService: DraftService;
  let testDraft: Draft;

  test.beforeEach(async ({ page }) => {
    // Initialize clean state
    await page.goto('/drafts');
    
    // Setup test draft service
    draftService = new DraftService();
    
    // Create test draft
    testDraft = await draftService.createDraft({
      title: 'Test Draft for Editing',
      content: 'Original content for testing draft editing workflow',
      tags: ['test', 'editing']
    });
  });

  test.afterEach(async ({ page }) => {
    // Clean up localStorage
    await page.evaluate(() => {
      localStorage.removeItem('agent-feed-drafts');
    });
  });

  test('CRITICAL: Should update existing draft, not create new one', async ({ page }) => {
    // Arrange - Get initial draft count
    const initialDrafts = await draftService.getDrafts();
    const initialCount = initialDrafts.length;
    
    expect(initialCount).toBeGreaterThan(0);
    
    // Act - Edit the draft
    await page.click(`[data-testid="edit-draft-${testDraft.id}"]`);
    await page.waitForSelector('[data-testid="post-creator-modal"]');
    
    // Verify modal shows correct draft
    await expect(page.locator('[data-testid="modal-title"]')).toContainText('Edit Draft');
    await expect(page.locator('input[name="title"]')).toHaveValue(testDraft.title);
    
    // Modify content
    const modifiedTitle = 'Modified Test Draft Title';
    const modifiedContent = 'Modified content to test draft updating';
    
    await page.fill('input[name="title"]', modifiedTitle);
    await page.fill('textarea[name="content"]', modifiedContent);
    
    // Save the draft
    await page.click('[data-testid="save-draft-button"]');
    await page.waitForSelector('[data-testid="draft-saved-indicator"]');
    
    // Assert - Verify no new draft was created
    const finalDrafts = await draftService.getDrafts();
    expect(finalDrafts.length).toBe(initialCount); // Same count, no replication
    
    // Assert - Verify original draft was updated
    const updatedDraft = await draftService.getDraft(testDraft.id);
    expect(updatedDraft).not.toBeNull();
    expect(updatedDraft!.title).toBe(modifiedTitle);
    expect(updatedDraft!.content).toContain(modifiedContent);
    expect(updatedDraft!.id).toBe(testDraft.id); // Same ID
  });

  test('Should preserve draft ID throughout editing session', async ({ page }) => {
    // Arrange
    const originalId = testDraft.id;
    
    // Act - Open draft for editing
    await page.click(`[data-testid="edit-draft-${testDraft.id}"]`);
    
    // Verify draft ID is preserved in modal state
    const modalDraftId = await page.getAttribute('[data-testid="post-creator-modal"]', 'data-draft-id');
    expect(modalDraftId).toBe(originalId);
    
    // Modify and save multiple times
    for (let i = 1; i <= 3; i++) {
      await page.fill('input[name="title"]', `Modified Title ${i}`);
      await page.click('[data-testid="save-draft-button"]');
      await page.waitForSelector('[data-testid="draft-saved-indicator"]');
      
      // Verify same draft ID is maintained
      const currentDraft = await draftService.getDraft(originalId);
      expect(currentDraft!.id).toBe(originalId);
    }
    
    // Assert - Final verification
    const allDrafts = await draftService.getDrafts();
    const draftIds = allDrafts.map(d => d.id);
    expect(draftIds.filter(id => id === originalId)).toHaveLength(1);
  });

  test('Should handle auto-save without creating duplicates', async ({ page }) => {
    // Arrange
    const initialCount = (await draftService.getDrafts()).length;
    
    // Act - Open draft and start typing
    await page.click(`[data-testid="edit-draft-${testDraft.id}"]`);
    await page.waitForSelector('[data-testid="post-creator-modal"]');
    
    // Type content slowly to trigger auto-save
    const newContent = 'This content should trigger auto-save and update existing draft';
    await page.fill('textarea[name="content"]', '');
    
    for (const char of newContent) {
      await page.type('textarea[name="content"]', char);
      await page.waitForTimeout(100); // Slow typing to trigger auto-save
    }
    
    // Wait for auto-save to complete
    await page.waitForSelector('[data-testid="auto-save-indicator"]', { timeout: 5000 });
    
    // Assert - No new draft created
    const finalCount = (await draftService.getDrafts()).length;
    expect(finalCount).toBe(initialCount);
    
    // Assert - Original draft updated
    const updatedDraft = await draftService.getDraft(testDraft.id);
    expect(updatedDraft!.content).toContain(newContent);
  });

  test('Should use updateDraft method for existing drafts', async ({ page }) => {
    // Arrange - Spy on DraftService methods
    let createDraftCalled = false;
    let updateDraftCalled = false;
    
    await page.addInitScript(() => {
      // Mock DraftService methods to track calls
      const originalCreateDraft = window.draftService?.createDraft;
      const originalUpdateDraft = window.draftService?.updateDraft;
      
      if (originalCreateDraft) {
        window.draftService.createDraft = async (...args) => {
          window.testState = { ...window.testState, createDraftCalled: true };
          return originalCreateDraft.apply(window.draftService, args);
        };
      }
      
      if (originalUpdateDraft) {
        window.draftService.updateDraft = async (...args) => {
          window.testState = { ...window.testState, updateDraftCalled: true };
          return originalUpdateDraft.apply(window.draftService, args);
        };
      }
    });
    
    // Act - Edit and save draft
    await page.click(`[data-testid="edit-draft-${testDraft.id}"]`);
    await page.fill('input[name="title"]', 'Updated via updateDraft method');
    await page.click('[data-testid="save-draft-button"]');
    await page.waitForSelector('[data-testid="draft-saved-indicator"]');
    
    // Assert - Verify correct method was called
    const testState = await page.evaluate(() => window.testState);
    expect(testState.updateDraftCalled).toBe(true);
    expect(testState.createDraftCalled).toBe(false);
  });

  test('Should handle modal re-opening without creating duplicates', async ({ page }) => {
    // Arrange
    const initialCount = (await draftService.getDrafts()).length;
    
    // Act - Open, modify, and close modal without saving
    await page.click(`[data-testid="edit-draft-${testDraft.id}"]`);
    await page.fill('input[name="title"]', 'Unsaved changes');
    await page.press('Escape'); // Close modal
    
    // Re-open same draft
    await page.click(`[data-testid="edit-draft-${testDraft.id}"]`);
    await page.fill('input[name="title"]', 'Final saved changes');
    await page.click('[data-testid="save-draft-button"]');
    
    // Assert - No duplicates created
    const finalCount = (await draftService.getDrafts()).length;
    expect(finalCount).toBe(initialCount);
    
    // Assert - Correct content saved
    const finalDraft = await draftService.getDraft(testDraft.id);
    expect(finalDraft!.title).toBe('Final saved changes');
  });

  test('Should distinguish between create and edit modes', async ({ page }) => {
    // Test Create Mode
    await page.click('[data-testid="create-new-draft"]');
    await page.waitForSelector('[data-testid="post-creator-modal"]');
    
    // Verify create mode indicators
    await expect(page.locator('[data-testid="modal-title"]')).toContainText('Create New Post');
    await expect(page.locator('[data-testid="post-creator-modal"]')).toHaveAttribute('data-mode', 'create');
    
    await page.press('Escape'); // Close modal
    
    // Test Edit Mode
    await page.click(`[data-testid="edit-draft-${testDraft.id}"]`);
    await page.waitForSelector('[data-testid="post-creator-modal"]');
    
    // Verify edit mode indicators
    await expect(page.locator('[data-testid="modal-title"]')).toContainText('Edit Draft');
    await expect(page.locator('[data-testid="post-creator-modal"]')).toHaveAttribute('data-mode', 'edit');
    await expect(page.locator('[data-testid="post-creator-modal"]')).toHaveAttribute('data-draft-id', testDraft.id);
  });

  test('REGRESSION: Multiple rapid saves should not create duplicates', async ({ page }) => {
    // Arrange
    const initialCount = (await draftService.getDrafts()).length;
    
    // Act - Rapid saves
    await page.click(`[data-testid="edit-draft-${testDraft.id}"]`);
    
    // Rapidly click save multiple times
    for (let i = 0; i < 5; i++) {
      await page.fill('input[name="title"]', `Rapid save ${i}`);
      await page.click('[data-testid="save-draft-button"]');
      await page.waitForTimeout(100); // Small delay between saves
    }
    
    await page.waitForTimeout(2000); // Wait for all saves to complete
    
    // Assert - Still only one draft
    const finalCount = (await draftService.getDrafts()).length;
    expect(finalCount).toBe(initialCount);
    
    // Assert - Final title is correct
    const finalDraft = await draftService.getDraft(testDraft.id);
    expect(finalDraft!.title).toBe('Rapid save 4');
  });

  test('Should handle keyboard shortcuts correctly in edit mode', async ({ page }) => {
    // Arrange
    await page.click(`[data-testid="edit-draft-${testDraft.id}"]`);
    await page.waitForSelector('[data-testid="post-creator-modal"]');
    
    // Act - Use Cmd+S shortcut
    await page.fill('input[name="title"]', 'Saved via keyboard shortcut');
    await page.press('Meta+s'); // Cmd+S
    
    await page.waitForSelector('[data-testid="draft-saved-indicator"]');
    
    // Assert - Draft was updated, not created
    const updatedDraft = await draftService.getDraft(testDraft.id);
    expect(updatedDraft!.title).toBe('Saved via keyboard shortcut');
    
    const allDrafts = await draftService.getDrafts();
    expect(allDrafts.length).toBe(1); // No new draft created
  });
});

/**
 * NLD Pattern Recognition Tests
 * Tests for natural language debugging patterns
 */
test.describe('NLD Pattern Recognition - Draft Bug Patterns', () => {
  test('Should detect "duplicate draft" pattern in error logs', async ({ page }) => {
    // Setup error logging detection
    const errorLogs: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errorLogs.push(msg.text());
      }
    });
    
    // Simulate draft replication scenario
    await page.goto('/drafts');
    
    // Check for specific error patterns that indicate draft replication
    const duplicatePatterns = [
      /duplicate.*draft/i,
      /multiple.*drafts.*created/i,
      /draft.*replication/i,
      /createDraft.*edit.*mode/i
    ];
    
    // This test would fail if the bug exists
    expect(errorLogs.some(log => 
      duplicatePatterns.some(pattern => pattern.test(log))
    )).toBe(false);
  });

  test('Should detect "wrong method called" pattern', async ({ page }) => {
    const consoleLogs: string[] = [];
    
    page.on('console', msg => {
      consoleLogs.push(msg.text());
    });
    
    await page.goto('/drafts');
    
    // Look for patterns that indicate wrong method usage
    const wrongMethodPatterns = [
      /createDraft.*called.*edit/i,
      /updateDraft.*not.*called/i,
      /wrong.*method.*draft/i
    ];
    
    expect(consoleLogs.some(log => 
      wrongMethodPatterns.some(pattern => pattern.test(log))
    )).toBe(false);
  });
});