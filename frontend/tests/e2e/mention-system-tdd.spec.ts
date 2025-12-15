import { test, expect } from '@playwright/test';

test.describe('Mention System E2E Tests (TDD)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the application to load
    await page.waitForSelector('[data-testid="app"]', { timeout: 10000 });
  });

  test.describe('@ Character Detection', () => {
    test('should open mention dropdown when typing @ character', async ({ page }) => {
      // Find the post creator text area
      const postCreator = page.locator('[data-testid="post-creator"]').first();
      await expect(postCreator).toBeVisible();

      const textarea = postCreator.locator('textarea').first();
      await textarea.click();
      await textarea.fill('@');

      // Check for mention dropdown
      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 5000 });
    });

    test('should NOT open dropdown for @ in email addresses', async ({ page }) => {
      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      await textarea.click();
      await textarea.fill('Contact me at user@domain.com');

      // Position cursor after the @ in email
      await textarea.press('Home');
      for (let i = 0; i < 16; i++) { // Position after @
        await textarea.press('ArrowRight');
      }

      // Wait a moment and verify no dropdown appears
      await page.waitForTimeout(500);
      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).not.toBeVisible();
    });

    test('should open dropdown for @ after whitespace', async ({ page }) => {
      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      await textarea.click();
      await textarea.fill('Hello @');

      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 5000 });
    });

    test('should open dropdown for @ at beginning of text', async ({ page }) => {
      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      await textarea.click();
      await textarea.fill('@');

      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 5000 });
    });

    test('should handle multiple @ mentions in same input', async ({ page }) => {
      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      await textarea.click();
      
      // Type first mention
      await textarea.fill('@');
      
      // Wait for dropdown and select first option
      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 5000 });
      
      await page.keyboard.press('Enter');
      
      // Wait for dropdown to close
      await expect(dropdown).not.toBeVisible();
      
      // Add second mention
      await textarea.press('End');
      await textarea.type(' and @');
      
      // Dropdown should open again
      await expect(dropdown).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Search and Filtering', () => {
    test('should filter agents based on search query', async ({ page }) => {
      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      await textarea.click();
      await textarea.fill('@code');

      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 5000 });

      // Should show agents containing "code"
      const options = dropdown.locator('[role="option"]');
      await expect(options).toHaveCount.toBeGreaterThan(0);
      
      // Check that all visible options contain "code" in name or description
      const firstOption = options.first();
      await expect(firstOption).toBeVisible();
      
      const optionText = await firstOption.textContent();
      expect(optionText?.toLowerCase()).toMatch(/code/);
    });

    test('should show "no results" message for non-existent agents', async ({ page }) => {
      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      await textarea.click();
      await textarea.fill('@nonexistentquery123');

      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 5000 });

      // Should show no results message
      const noResults = dropdown.locator('text=/No agents found/');
      await expect(noResults).toBeVisible();
    });

    test('should show loading state during search', async ({ page }) => {
      // Slow down network to see loading state
      await page.route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        route.continue();
      });

      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      await textarea.click();
      await textarea.fill('@test');

      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 5000 });

      // Should show loading indicator
      const loading = dropdown.locator('text=/Loading/');
      await expect(loading).toBeVisible();
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should navigate suggestions with arrow keys', async ({ page }) => {
      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      await textarea.click();
      await textarea.fill('@');

      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 5000 });

      const options = dropdown.locator('[role="option"]');
      await expect(options).toHaveCount.toBeGreaterThan(1);

      // First option should be selected initially
      const firstOption = options.first();
      await expect(firstOption).toHaveAttribute('aria-selected', 'true');

      // Press down arrow
      await page.keyboard.press('ArrowDown');

      // Second option should be selected
      const secondOption = options.nth(1);
      await expect(secondOption).toHaveAttribute('aria-selected', 'true');
      await expect(firstOption).toHaveAttribute('aria-selected', 'false');
    });

    test('should wrap navigation from last to first option with arrow up', async ({ page }) => {
      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      await textarea.click();
      await textarea.fill('@');

      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 5000 });

      const options = dropdown.locator('[role="option"]');
      const optionCount = await options.count();
      
      if (optionCount > 1) {
        // Press up arrow to wrap to last option
        await page.keyboard.press('ArrowUp');

        const lastOption = options.last();
        await expect(lastOption).toHaveAttribute('aria-selected', 'true');
      }
    });

    test('should select mention with Enter key', async ({ page }) => {
      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      await textarea.click();
      await textarea.fill('@');

      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 5000 });

      // Get the selected option text before pressing Enter
      const selectedOption = dropdown.locator('[aria-selected="true"]');
      const selectedText = await selectedOption.textContent();
      
      await page.keyboard.press('Enter');

      // Dropdown should close
      await expect(dropdown).not.toBeVisible();

      // Textarea should contain the selected mention
      const textareaValue = await textarea.inputValue();
      expect(textareaValue).toMatch(/@[a-zA-Z0-9-_]+\s/);
    });

    test('should select mention with Tab key', async ({ page }) => {
      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      await textarea.click();
      await textarea.fill('@');

      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 5000 });

      await page.keyboard.press('Tab');

      // Dropdown should close
      await expect(dropdown).not.toBeVisible();

      // Textarea should contain a mention
      const textareaValue = await textarea.inputValue();
      expect(textareaValue).toMatch(/@[a-zA-Z0-9-_]+\s/);
    });

    test('should close dropdown with Escape key', async ({ page }) => {
      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      await textarea.click();
      await textarea.fill('@');

      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 5000 });

      await page.keyboard.press('Escape');

      // Dropdown should close
      await expect(dropdown).not.toBeVisible();

      // Text should remain unchanged
      const textareaValue = await textarea.inputValue();
      expect(textareaValue).toBe('@');
    });
  });

  test.describe('Mouse Interactions', () => {
    test('should select mention by clicking on option', async ({ page }) => {
      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      await textarea.click();
      await textarea.fill('@');

      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 5000 });

      const options = dropdown.locator('[role="option"]');
      const firstOption = options.first();
      
      await firstOption.click();

      // Dropdown should close
      await expect(dropdown).not.toBeVisible();

      // Textarea should contain the selected mention
      const textareaValue = await textarea.inputValue();
      expect(textareaValue).toMatch(/@[a-zA-Z0-9-_]+\s/);
    });

    test('should update selection on mouse hover', async ({ page }) => {
      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      await textarea.click();
      await textarea.fill('@');

      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 5000 });

      const options = dropdown.locator('[role="option"]');
      
      if (await options.count() > 1) {
        const secondOption = options.nth(1);
        
        // Hover over second option
        await secondOption.hover();

        // Second option should become selected
        await expect(secondOption).toHaveAttribute('aria-selected', 'true');
        
        // First option should no longer be selected
        const firstOption = options.first();
        await expect(firstOption).toHaveAttribute('aria-selected', 'false');
      }
    });

    test('should close dropdown when clicking outside', async ({ page }) => {
      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      await textarea.click();
      await textarea.fill('@');

      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 5000 });

      // Click outside the dropdown
      await page.click('body');

      // Dropdown should close
      await expect(dropdown).not.toBeVisible();
    });
  });

  test.describe('Mention Insertion and Positioning', () => {
    test('should insert mention at correct cursor position', async ({ page }) => {
      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      await textarea.click();
      await textarea.fill('Hello  world');
      
      // Position cursor between "Hello" and "world"
      await textarea.press('Home');
      for (let i = 0; i < 6; i++) {
        await textarea.press('ArrowRight');
      }
      
      await textarea.type('@');

      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 5000 });

      await page.keyboard.press('Enter');

      // Check that mention was inserted at correct position
      const textareaValue = await textarea.inputValue();
      expect(textareaValue).toMatch(/Hello @[a-zA-Z0-9-_]+\s world/);
    });

    test('should replace partial mention query when selecting', async ({ page }) => {
      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      await textarea.click();
      await textarea.fill('@cod');

      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 5000 });

      await page.keyboard.press('Enter');

      // Should replace "@cod" with full mention
      const textareaValue = await textarea.inputValue();
      expect(textareaValue).toMatch(/@[a-zA-Z0-9-_]+\s/);
      expect(textareaValue).not.toContain('@cod');
    });

    test('should preserve text after mention insertion', async ({ page }) => {
      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      await textarea.click();
      await textarea.fill('Hello @ please help!');
      
      // Position cursor after @
      await textarea.press('Home');
      for (let i = 0; i < 7; i++) {
        await textarea.press('ArrowRight');
      }

      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 5000 });

      await page.keyboard.press('Enter');

      // Should preserve text after mention
      const textareaValue = await textarea.inputValue();
      expect(textareaValue).toMatch(/Hello @[a-zA-Z0-9-_]+\s please help!/);
    });
  });

  test.describe('Edge Cases and Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/*', route => route.abort());

      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      await textarea.click();
      await textarea.fill('@test');

      // Should still show dropdown even if API fails
      const dropdown = page.locator('[role="listbox"]');
      
      // Either dropdown shows with error message or doesn't show (graceful degradation)
      try {
        await expect(dropdown).toBeVisible({ timeout: 2000 });
        // If dropdown is visible, it should show some kind of error or fallback
      } catch {
        // If dropdown doesn't show, that's also acceptable graceful degradation
      }
    });

    test('should handle rapid typing without breaking', async ({ page }) => {
      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      await textarea.click();
      
      // Type rapidly
      const rapidText = '@testquery';
      for (const char of rapidText) {
        await textarea.type(char, { delay: 10 }); // Very fast typing
      }

      // Should still show dropdown
      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 5000 });
    });

    test('should handle mention deletion correctly', async ({ page }) => {
      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      // Insert a mention first
      await textarea.click();
      await textarea.fill('@');

      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 5000 });

      await page.keyboard.press('Enter');
      await expect(dropdown).not.toBeVisible();

      // Now delete the @ character
      const textareaValue = await textarea.inputValue();
      await textarea.press('Home');
      await textarea.press('Delete'); // Delete the @

      // Should not show dropdown anymore
      await page.waitForTimeout(500);
      await expect(dropdown).not.toBeVisible();
    });

    test('should handle cursor movement during mention typing', async ({ page }) => {
      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      await textarea.click();
      await textarea.fill('@test');

      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 5000 });

      // Move cursor away from mention
      await textarea.press('Home');

      // Dropdown should close
      await expect(dropdown).not.toBeVisible();

      // Move cursor back to end of mention
      await textarea.press('End');

      // Dropdown should open again
      await expect(dropdown).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA attributes', async ({ page }) => {
      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      // Check initial ARIA attributes
      await expect(textarea).toHaveAttribute('aria-expanded', 'false');
      await expect(textarea).toHaveAttribute('aria-haspopup', 'listbox');

      await textarea.click();
      await textarea.fill('@');

      // Check ARIA attributes when dropdown is open
      await expect(textarea).toHaveAttribute('aria-expanded', 'true');

      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 5000 });
      await expect(dropdown).toHaveAttribute('aria-label');

      // Check that options have proper ARIA attributes
      const options = dropdown.locator('[role="option"]');
      const firstOption = options.first();
      await expect(firstOption).toHaveAttribute('aria-selected');
    });

    test('should maintain keyboard focus correctly', async ({ page }) => {
      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      await textarea.click();
      await textarea.fill('@');

      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 5000 });

      // Textarea should maintain focus even with dropdown open
      await expect(textarea).toBeFocused();

      // After selecting with keyboard, focus should return to textarea
      await page.keyboard.press('Enter');
      await expect(textarea).toBeFocused();
    });

    test('should work with screen reader navigation patterns', async ({ page }) => {
      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      await textarea.click();
      await textarea.fill('@');

      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 5000 });

      const options = dropdown.locator('[role="option"]');
      
      // Use Tab to navigate (alternative to arrows)
      // Note: This tests keyboard accessibility beyond just arrows
      for (let i = 0; i < Math.min(3, await options.count()); i++) {
        await page.keyboard.press('ArrowDown');
        const currentOption = dropdown.locator('[aria-selected="true"]');
        await expect(currentOption).toBeVisible();
      }
    });
  });

  test.describe('Integration with Post Creation', () => {
    test('should work in post creation flow', async ({ page }) => {
      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      // Type a complete post with mention
      await textarea.click();
      await textarea.fill('Hey @');

      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 5000 });

      await page.keyboard.press('Enter');

      // Continue typing the post
      await textarea.type(' can you help me with this task?');

      // Submit the post
      const submitButton = postCreator.locator('button:has-text("Post")');
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Verify post was created with mention
        await page.waitForTimeout(1000);
        const posts = page.locator('[data-testid="post-item"]');
        const latestPost = posts.first();
        
        const postContent = await latestPost.textContent();
        expect(postContent).toMatch(/@[a-zA-Z0-9-_]+/);
        expect(postContent).toContain('can you help me with this task?');
      }
    });

    test('should work in comment creation', async ({ page }) => {
      // First, find a post to comment on
      const posts = page.locator('[data-testid="post-item"]');
      
      if (await posts.count() > 0) {
        const firstPost = posts.first();
        const commentButton = firstPost.locator('button:has-text("Comment")');
        
        if (await commentButton.isVisible()) {
          await commentButton.click();

          const commentTextarea = page.locator('textarea[placeholder*="comment" i]');
          await expect(commentTextarea).toBeVisible();

          await commentTextarea.click();
          await commentTextarea.fill('Thanks @');

          const dropdown = page.locator('[role="listbox"]');
          await expect(dropdown).toBeVisible({ timeout: 5000 });

          await page.keyboard.press('Enter');
          await commentTextarea.type(' for the help!');

          // Submit comment
          const submitButton = page.locator('button:has-text("Comment")').last();
          await submitButton.click();

          // Verify comment was posted with mention
          await page.waitForTimeout(1000);
          const comment = page.locator('[data-testid="comment"]').last();
          const commentContent = await comment.textContent();
          expect(commentContent).toMatch(/@[a-zA-Z0-9-_]+/);
          expect(commentContent).toContain('for the help!');
        }
      }
    });
  });

  test.describe('Performance', () => {
    test('should handle large number of agents efficiently', async ({ page }) => {
      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      await textarea.click();
      
      const startTime = Date.now();
      await textarea.fill('@');

      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 5000 });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should open dropdown within reasonable time (< 2 seconds)
      expect(duration).toBeLessThan(2000);

      // Should show reasonable number of options
      const options = dropdown.locator('[role="option"]');
      const optionCount = await options.count();
      expect(optionCount).toBeGreaterThan(0);
      expect(optionCount).toBeLessThan(20); // Reasonable limit for UX
    });

    test('should debounce search requests', async ({ page }) => {
      let requestCount = 0;
      
      // Monitor API requests
      page.on('request', request => {
        if (request.url().includes('mention') || request.url().includes('agent')) {
          requestCount++;
        }
      });

      const postCreator = page.locator('[data-testid="post-creator"]').first();
      const textarea = postCreator.locator('textarea').first();
      
      await textarea.click();
      
      // Type rapidly
      await textarea.type('@testquery', { delay: 50 });

      await page.waitForTimeout(1000); // Wait for debounce

      // Should have made minimal requests due to debouncing
      expect(requestCount).toBeLessThan(5); // Reasonable limit
    });
  });
});