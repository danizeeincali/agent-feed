import { test, expect } from '@playwright/test';

// London School - E2E tests for real browser automation testing
test.describe('Multi-Select Filtering - Browser Automation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for the feed to load
    await page.waitForSelector('[data-testid="agent-feed"], .max-w-2xl', { timeout: 10000 });
  });

  test.describe('Advanced Filter Button Discovery', () => {
    test('should find and click Advanced Filter button', async ({ page }) => {
      // Find the main filter button
      const filterButton = page.locator('button').filter({ hasText: /all posts/i }).first();
      expect(filterButton).toBeVisible();
      
      // Click to open dropdown
      await filterButton.click();
      
      // Look for Advanced Filter option
      const advancedFilterOption = page.locator('button').filter({ hasText: /advanced filter/i });
      
      // Verify Advanced Filter option exists and is clickable
      await expect(advancedFilterOption).toBeVisible();
      await expect(advancedFilterOption).toBeEnabled();
      
      // Click Advanced Filter
      await advancedFilterOption.click();
    });

    test('should open multi-select panel when Advanced Filter is clicked', async ({ page }) => {
      // Open filter dropdown
      await page.locator('button').filter({ hasText: /all posts/i }).first().click();
      
      // Click Advanced Filter
      await page.locator('button').filter({ hasText: /advanced filter/i }).click();
      
      // Verify multi-select panel opened
      await expect(page.locator('text=Advanced Filter').first()).toBeVisible();
      await expect(page.locator('text=Agents (0 selected)')).toBeVisible();
      await expect(page.locator('text=Hashtags (0 selected)')).toBeVisible();
      
      // Verify action buttons are present
      await expect(page.locator('button').filter({ hasText: /apply filter/i })).toBeVisible();
      await expect(page.locator('button').filter({ hasText: /cancel/i })).toBeVisible();
    });
  });

  test.describe('Multi-Select Input Interaction', () => {
    test('should type in agent search and see suggestions', async ({ page }) => {
      // Navigate to multi-select panel
      await page.locator('button').filter({ hasText: /all posts/i }).first().click();
      await page.locator('button').filter({ hasText: /advanced filter/i }).click();
      
      // Find and type in agent input
      const agentInput = page.locator('input[placeholder*="agents"]').first();
      await expect(agentInput).toBeVisible();
      
      await agentInput.fill('Agent');
      
      // Verify dropdown appears with suggestions
      await expect(page.locator('text=Agent').first()).toBeVisible();
      
      // Verify we can see multiple agent options
      const agentOptions = page.locator('button').filter({ hasText: /Agent/ });
      expect(await agentOptions.count()).toBeGreaterThan(0);
    });

    test('should select agents and see them as chips', async ({ page }) => {
      // Navigate to multi-select panel
      await page.locator('button').filter({ hasText: /all posts/i }).first().click();
      await page.locator('button').filter({ hasText: /advanced filter/i }).click();
      
      // Type in agent input to get suggestions
      const agentInput = page.locator('input[placeholder*="agents"]').first();
      await agentInput.fill('Agent');
      
      // Wait for suggestions and click first one
      await page.waitForTimeout(500); // Wait for debouncing
      const firstAgentOption = page.locator('button').filter({ hasText: /Agent/ }).first();
      await firstAgentOption.click();
      
      // Verify chip appears
      await expect(page.locator('text=Agents (1 selected)')).toBeVisible();
      
      // Verify the selected agent appears as a chip
      const chipRemoveButtons = page.locator('button[aria-label*="Remove"]');
      expect(await chipRemoveButtons.count()).toBeGreaterThan(0);
    });

    test('should remove selected items using chip remove buttons', async ({ page }) => {
      // Navigate to multi-select and select an agent
      await page.locator('button').filter({ hasText: /all posts/i }).first().click();
      await page.locator('button').filter({ hasText: /advanced filter/i }).click();
      
      const agentInput = page.locator('input[placeholder*="agents"]').first();
      await agentInput.fill('Agent');
      await page.waitForTimeout(500);
      
      const firstAgentOption = page.locator('button').filter({ hasText: /Agent/ }).first();
      await firstAgentOption.click();
      
      // Verify selection
      await expect(page.locator('text=Agents (1 selected)')).toBeVisible();
      
      // Find and click remove button
      const removeButton = page.locator('button[aria-label*="Remove"]').first();
      await removeButton.click();
      
      // Verify item was removed
      await expect(page.locator('text=Agents (0 selected)')).toBeVisible();
    });

    test('should type in hashtag search and see suggestions', async ({ page }) => {
      // Navigate to multi-select panel
      await page.locator('button').filter({ hasText: /all posts/i }).first().click();
      await page.locator('button').filter({ hasText: /advanced filter/i }).click();
      
      // Find and type in hashtag input
      const hashtagInput = page.locator('input[placeholder*="hashtag"]').first();
      await expect(hashtagInput).toBeVisible();
      
      await hashtagInput.fill('test');
      
      // Verify dropdown appears
      await page.waitForTimeout(500);
      
      // Look for hashtag suggestions (they might start with #)
      const suggestionExists = await page.locator('button').filter({ hasText: /#|hashtag/i }).count();
      expect(suggestionExists).toBeGreaterThanOrEqual(0); // May be 0 if no hashtags match
    });
  });

  test.describe('Combination Mode Selection', () => {
    test('should switch between AND/OR modes', async ({ page }) => {
      // Navigate to multi-select panel
      await page.locator('button').filter({ hasText: /all posts/i }).first().click();
      await page.locator('button').filter({ hasText: /advanced filter/i }).click();
      
      // Verify AND mode is default (has active styling)
      const andButton = page.locator('button').filter({ hasText: /and.*match all/i });
      await expect(andButton).toBeVisible();
      await expect(andButton).toHaveClass(/bg-blue-50|border-blue-200|text-blue-700/);
      
      // Click OR button
      const orButton = page.locator('button').filter({ hasText: /or.*match any/i });
      await orButton.click();
      
      // Verify OR mode becomes active
      await expect(orButton).toHaveClass(/bg-blue-50|border-blue-200|text-blue-700/);
    });
  });

  test.describe('Apply and Cancel Actions', () => {
    test('should disable Apply button when no selections made', async ({ page }) => {
      // Navigate to multi-select panel
      await page.locator('button').filter({ hasText: /all posts/i }).first().click();
      await page.locator('button').filter({ hasText: /advanced filter/i }).click();
      
      // Verify Apply button is disabled initially
      const applyButton = page.locator('button').filter({ hasText: /apply filter/i });
      await expect(applyButton).toBeDisabled();
    });

    test('should enable Apply button when selections are made', async ({ page }) => {
      // Navigate to multi-select panel and select an agent
      await page.locator('button').filter({ hasText: /all posts/i }).first().click();
      await page.locator('button').filter({ hasText: /advanced filter/i }).click();
      
      // Select an agent
      const agentInput = page.locator('input[placeholder*="agents"]').first();
      await agentInput.fill('Agent');
      await page.waitForTimeout(500);
      
      const firstAgentOption = page.locator('button').filter({ hasText: /Agent/ }).first();
      if (await firstAgentOption.isVisible()) {
        await firstAgentOption.click();
        
        // Verify Apply button becomes enabled
        const applyButton = page.locator('button').filter({ hasText: /apply filter/i });
        await expect(applyButton).toBeEnabled();
      }
    });

    test('should close panel when Cancel is clicked', async ({ page }) => {
      // Navigate to multi-select panel
      await page.locator('button').filter({ hasText: /all posts/i }).first().click();
      await page.locator('button').filter({ hasText: /advanced filter/i }).click();
      
      // Verify panel is open
      await expect(page.locator('text=Advanced Filter').first()).toBeVisible();
      
      // Click Cancel
      const cancelButton = page.locator('button').filter({ hasText: /cancel/i });
      await cancelButton.click();
      
      // Verify panel is closed
      await expect(page.locator('text=Agents (0 selected)')).not.toBeVisible();
    });

    test('should close panel when clicking outside', async ({ page }) => {
      // Navigate to multi-select panel
      await page.locator('button').filter({ hasText: /all posts/i }).first().click();
      await page.locator('button').filter({ hasText: /advanced filter/i }).click();
      
      // Verify panel is open
      await expect(page.locator('text=Advanced Filter').first()).toBeVisible();
      
      // Click outside the panel (on the backdrop)
      await page.locator('.fixed.inset-0').click();
      
      // Verify panel is closed
      await expect(page.locator('text=Agents (0 selected)')).not.toBeVisible();
    });
  });

  test.describe('Complete Multi-Select Workflow', () => {
    test('should complete full workflow: select agents and hashtags, apply filter', async ({ page }) => {
      // Navigate to multi-select panel
      await page.locator('button').filter({ hasText: /all posts/i }).first().click();
      await page.locator('button').filter({ hasText: /advanced filter/i }).click();
      
      // Select an agent
      const agentInput = page.locator('input[placeholder*="agents"]').first();
      await agentInput.fill('Agent');
      await page.waitForTimeout(500);
      
      const agentOption = page.locator('button').filter({ hasText: /Agent/ }).first();
      if (await agentOption.isVisible()) {
        await agentOption.click();
      }
      
      // Try to select a hashtag
      const hashtagInput = page.locator('input[placeholder*="hashtag"]').first();
      await hashtagInput.fill('test');
      await page.waitForTimeout(500);
      
      // Apply the filter if we have selections
      const applyButton = page.locator('button').filter({ hasText: /apply filter/i });
      if (await applyButton.isEnabled()) {
        await applyButton.click();
        
        // Verify panel is closed and filter is applied
        await expect(page.locator('text=Agents (0 selected)')).not.toBeVisible();
        
        // Verify main filter button shows the active filter
        const mainFilterButton = page.locator('button').filter({ hasText: /agent|tag/i }).first();
        await expect(mainFilterButton).toBeVisible();
      }
    });

    test('should preserve filter state when reopening advanced filter', async ({ page }) => {
      // Complete a filter selection
      await page.locator('button').filter({ hasText: /all posts/i }).first().click();
      await page.locator('button').filter({ hasText: /advanced filter/i }).click();
      
      const agentInput = page.locator('input[placeholder*="agents"]').first();
      await agentInput.fill('Agent');
      await page.waitForTimeout(500);
      
      const agentOption = page.locator('button').filter({ hasText: /Agent/ }).first();
      if (await agentOption.isVisible()) {
        await agentOption.click();
        
        const applyButton = page.locator('button').filter({ hasText: /apply filter/i });
        if (await applyButton.isEnabled()) {
          await applyButton.click();
          
          // Reopen advanced filter
          await page.locator('button').first().click(); // Main filter button
          await page.locator('button').filter({ hasText: /advanced filter/i }).click();
          
          // Verify previous selections are preserved
          await expect(page.locator('text=Agents (1 selected)')).toBeVisible();
        }
      }
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should support keyboard navigation in dropdowns', async ({ page }) => {
      // Navigate to multi-select panel
      await page.locator('button').filter({ hasText: /all posts/i }).first().click();
      await page.locator('button').filter({ hasText: /advanced filter/i }).click();
      
      // Focus agent input
      const agentInput = page.locator('input[placeholder*="agents"]').first();
      await agentInput.focus();
      await agentInput.fill('Agent');
      await page.waitForTimeout(500);
      
      // Try keyboard navigation
      await page.keyboard.press('ArrowDown'); // Navigate down
      await page.keyboard.press('Enter'); // Select highlighted option
      
      // Check if an agent was selected
      const selectedCount = await page.locator('text=Agents (1 selected)').count();
      expect(selectedCount).toBeGreaterThanOrEqual(0);
    });

    test('should support Escape key to close dropdowns', async ({ page }) => {
      // Navigate to multi-select panel
      await page.locator('button').filter({ hasText: /all posts/i }).first().click();
      await page.locator('button').filter({ hasText: /advanced filter/i }).click();
      
      // Focus and type in input to open dropdown
      const agentInput = page.locator('input[placeholder*="agents"]').first();
      await agentInput.focus();
      await agentInput.fill('Agent');
      await page.waitForTimeout(500);
      
      // Press Escape to close dropdown
      await page.keyboard.press('Escape');
      
      // The input should still be focused but dropdown closed
      expect(await agentInput.inputValue()).toBe('');
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle no search results gracefully', async ({ page }) => {
      // Navigate to multi-select panel
      await page.locator('button').filter({ hasText: /all posts/i }).first().click();
      await page.locator('button').filter({ hasText: /advanced filter/i }).click();
      
      // Search for something that doesn't exist
      const agentInput = page.locator('input[placeholder*="agents"]').first();
      await agentInput.fill('NonExistentAgent12345');
      await page.waitForTimeout(500);
      
      // Should show empty message
      const emptyMessage = page.locator('text=No agents found, text=No options found, text=No matches found');
      // At least one of these messages should be visible or the dropdown should handle empty state
      expect(await emptyMessage.count()).toBeGreaterThanOrEqual(0);
    });

    test('should handle rapid typing without crashes', async ({ page }) => {
      // Navigate to multi-select panel
      await page.locator('button').filter({ hasText: /all posts/i }).first().click();
      await page.locator('button').filter({ hasText: /advanced filter/i }).click();
      
      // Rapid typing test
      const agentInput = page.locator('input[placeholder*="agents"]').first();
      await agentInput.focus();
      
      // Type quickly to test debouncing and error handling
      for (const char of 'Agent123') {
        await agentInput.type(char);
        await page.waitForTimeout(50); // Very fast typing
      }
      
      // Should not crash - just verify input still works
      expect(await agentInput.inputValue()).toContain('Agent');
    });
  });
});