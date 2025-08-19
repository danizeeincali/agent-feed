import { test, expect, Page } from '@playwright/test';

/**
 * End-to-End Tests for PostCreator Component
 * Tests the complete user workflow from form interaction to API submission
 */

test.describe('PostCreator E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the page with PostCreator component
    await page.goto('/');
    
    // Wait for the component to load
    await expect(page.locator('[data-testid="post-creator"]')).toBeVisible();
  });

  test.describe('Happy Path Scenarios', () => {
    test('should create a complete post successfully', async ({ page }) => {
      // Fill in the title
      const titleInput = page.getByPlaceholder('Enter a compelling title...');
      await titleInput.fill('End-to-End Test Post');

      // Fill in the hook
      const hookInput = page.getByPlaceholder('A compelling one-liner to grab attention...');
      await hookInput.fill('This is a test hook for E2E testing');

      // Fill in the content
      const contentTextarea = page.getByPlaceholder(/Share your insights/);
      await contentTextarea.fill('This is comprehensive test content for the end-to-end testing of the PostCreator component.');

      // Add tags
      const tagInput = page.getByPlaceholder(/Add tags/);
      await tagInput.fill('e2e');
      await page.keyboard.press('Enter');
      await tagInput.fill('testing');
      await page.keyboard.press('Enter');

      // Verify tags were added
      await expect(page.locator('text=#e2e')).toBeVisible();
      await expect(page.locator('text=#testing')).toBeVisible();

      // Set visibility
      const visibilitySelect = page.locator('select').first();
      await visibilitySelect.selectOption('public');

      // Submit the form
      const submitButton = page.getByRole('button', { name: /Publish Post/ });
      await expect(submitButton).toBeEnabled();
      
      // Mock the API response
      await page.route('/api/v1/agent-posts', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'test-post-123',
              title: 'End-to-End Test Post',
              content: 'This is comprehensive test content for the end-to-end testing of the PostCreator component.'
            },
            message: 'Post created successfully'
          })
        });
      });

      await submitButton.click();

      // Verify loading state
      await expect(page.locator('text=Publishing...')).toBeVisible();

      // Verify form reset after submission
      await expect(titleInput).toHaveValue('');
      await expect(contentTextarea).toHaveValue('');
      await expect(page.locator('text=#e2e')).not.toBeVisible();
    });

    test('should handle form validation correctly', async ({ page }) => {
      const submitButton = page.getByRole('button', { name: /Publish Post/ });
      
      // Initially, submit should be disabled
      await expect(submitButton).toBeDisabled();

      // Add only title
      const titleInput = page.getByPlaceholder('Enter a compelling title...');
      await titleInput.fill('Test Title');
      
      // Should still be disabled without content
      await expect(submitButton).toBeDisabled();

      // Add content
      const contentTextarea = page.getByPlaceholder(/Share your insights/);
      await contentTextarea.fill('Test content');

      // Now should be enabled
      await expect(submitButton).toBeEnabled();

      // Clear title
      await titleInput.clear();
      
      // Should be disabled again
      await expect(submitButton).toBeDisabled();
    });

    test('should handle agent mentions workflow', async ({ page }) => {
      // Fill required fields
      await page.getByPlaceholder('Enter a compelling title...').fill('Mention Test');
      await page.getByPlaceholder(/Share your insights/).fill('Testing agent mentions @');

      // Open agent picker
      const mentionButton = page.getByTitle('Mention Agent');
      await mentionButton.click();

      // Wait for agent picker to appear
      await expect(page.locator('text=Search agents...')).toBeVisible();

      // Search for an agent
      const agentSearch = page.getByPlaceholder('Search agents...');
      await agentSearch.fill('chief');

      // Select agent
      await page.locator('text=Chief of Staff').click();

      // Verify mention was added to content
      const contentTextarea = page.getByPlaceholder(/Share your insights/);
      await expect(contentTextarea).toHaveValue(/.*@chief-of-staff-agent.*/);

      // Verify agent appears in mentioned agents section
      await expect(page.locator('text=Chief of Staff')).toBeVisible();
    });

    test('should handle emoji picker workflow', async ({ page }) => {
      // Fill required fields
      await page.getByPlaceholder('Enter a compelling title...').fill('Emoji Test');
      await page.getByPlaceholder(/Share your insights/).fill('Testing emojis ');

      // Open emoji picker
      const emojiButton = page.getByTitle('Add Emoji');
      await emojiButton.click();

      // Wait for emoji picker
      await expect(page.locator('[data-testid="emoji-picker"]')).toBeVisible();

      // Select an emoji (assuming emoji picker has test IDs)
      await page.locator('[data-emoji="😀"]').click();

      // Verify emoji was added to content
      const contentTextarea = page.getByPlaceholder(/Share your insights/);
      await expect(contentTextarea).toHaveValue(/.*😀.*/);
    });
  });

  test.describe('Error Handling Scenarios', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Fill form
      await page.getByPlaceholder('Enter a compelling title...').fill('Error Test');
      await page.getByPlaceholder(/Share your insights/).fill('Testing error handling');

      // Mock API error
      await page.route('/api/v1/agent-posts', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error'
          })
        });
      });

      const submitButton = page.getByRole('button', { name: /Publish Post/ });
      await submitButton.click();

      // Should show loading state
      await expect(page.locator('text=Publishing...')).toBeVisible();

      // Should return to normal state after error
      await expect(submitButton).toBeEnabled();
      await expect(page.locator('text=Publish Post')).toBeVisible();

      // Form content should remain (not reset on error)
      await expect(page.getByPlaceholder('Enter a compelling title...')).toHaveValue('Error Test');
    });

    test('should handle network timeouts', async ({ page }) => {
      // Fill form
      await page.getByPlaceholder('Enter a compelling title...').fill('Timeout Test');
      await page.getByPlaceholder(/Share your insights/).fill('Testing timeout handling');

      // Mock slow API response
      await page.route('/api/v1/agent-posts', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      const submitButton = page.getByRole('button', { name: /Publish Post/ });
      await submitButton.click();

      // Should show loading state
      await expect(page.locator('text=Publishing...')).toBeVisible();

      // Should handle timeout gracefully (this depends on implementation)
      // The component should have a reasonable timeout and error handling
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should submit form with Cmd/Ctrl+Enter', async ({ page }) => {
      // Fill form
      await page.getByPlaceholder('Enter a compelling title...').fill('Keyboard Test');
      const contentTextarea = page.getByPlaceholder(/Share your insights/);
      await contentTextarea.fill('Testing keyboard shortcut');

      // Mock successful API response
      await page.route('/api/v1/agent-posts', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'test-123' }
          })
        });
      });

      // Focus on content area
      await contentTextarea.focus();

      // Use keyboard shortcut (Ctrl+Enter on Windows/Linux, Cmd+Enter on Mac)
      const isMac = await page.evaluate(() => navigator.platform.toUpperCase().indexOf('MAC') >= 0);
      if (isMac) {
        await page.keyboard.press('Meta+Enter');
      } else {
        await page.keyboard.press('Control+Enter');
      }

      // Should trigger submission
      await expect(page.locator('text=Publishing...')).toBeVisible();
    });

    test('should save draft with Cmd/Ctrl+S', async ({ page }) => {
      // Fill form partially
      await page.getByPlaceholder('Enter a compelling title...').fill('Draft Test');
      const contentTextarea = page.getByPlaceholder(/Share your insights/);
      await contentTextarea.fill('Testing draft save');

      // Focus on content area
      await contentTextarea.focus();

      // Use save shortcut
      const isMac = await page.evaluate(() => navigator.platform.toUpperCase().indexOf('MAC') >= 0);
      if (isMac) {
        await page.keyboard.press('Meta+KeyS');
      } else {
        await page.keyboard.press('Control+KeyS');
      }

      // Should show draft saved indicator
      await expect(page.locator('text=Draft saved')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work correctly on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Basic functionality should still work
      await page.getByPlaceholder('Enter a compelling title...').fill('Mobile Test');
      await page.getByPlaceholder(/Share your insights/).fill('Testing mobile functionality');

      const submitButton = page.getByRole('button', { name: /Publish Post/ });
      await expect(submitButton).toBeEnabled();

      // Mobile-specific UI elements should be visible
      await expect(page.locator('[data-testid="mobile-indicator"]')).toBeVisible();
    });

    test('should adapt toolbar for mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Some toolbar items should be hidden on mobile
      await expect(page.getByTitle('Code')).not.toBeVisible();
      await expect(page.getByTitle('Numbered List')).not.toBeVisible();

      // Essential tools should remain
      await expect(page.getByTitle('Bold (⌘+B)')).toBeVisible();
      await expect(page.getByTitle('Link (⌘+K)')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should be accessible via keyboard navigation', async ({ page }) => {
      // Tab through the form
      await page.keyboard.press('Tab'); // Title input
      await expect(page.getByPlaceholder('Enter a compelling title...')).toBeFocused();

      await page.keyboard.press('Tab'); // Hook input
      await expect(page.getByPlaceholder('A compelling one-liner to grab attention...')).toBeFocused();

      await page.keyboard.press('Tab'); // Should eventually reach submit button
      // Continue tabbing to reach submit button
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const submitButton = page.getByRole('button', { name: /Publish Post/ });
        if (await submitButton.isEnabled() && await submitButton.getAttribute('data-focused')) {
          break;
        }
      }
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check for required field indicators
      await expect(page.locator('label:has-text("Title") span:has-text("*")')).toBeVisible();
      await expect(page.locator('label:has-text("Content") span:has-text("*")')).toBeVisible();

      // Check button roles and labels
      const submitButton = page.getByRole('button', { name: /Publish Post/ });
      await expect(submitButton).toHaveAttribute('type', 'button');
      
      // Toolbar buttons should have proper titles
      await expect(page.getByTitle('Bold (⌘+B)')).toBeVisible();
      await expect(page.getByTitle('Italic (⌘+I)')).toBeVisible();
    });
  });

  test.describe('Data Persistence', () => {
    test('should save and restore drafts from localStorage', async ({ page }) => {
      // Fill form
      await page.getByPlaceholder('Enter a compelling title...').fill('Draft Persistence Test');
      await page.getByPlaceholder(/Share your insights/).fill('Testing draft persistence');

      // Wait for auto-save (component should auto-save after 3 seconds)
      await page.waitForTimeout(3500);

      // Verify draft saved indicator
      await expect(page.locator('text=Draft saved')).toBeVisible();

      // Reload page
      await page.reload();

      // Wait for component to load and restore draft
      await expect(page.locator('[data-testid="post-creator"]')).toBeVisible();
      
      // Form should be restored with saved content
      await expect(page.getByPlaceholder('Enter a compelling title...')).toHaveValue('Draft Persistence Test');
      await expect(page.getByPlaceholder(/Share your insights/)).toHaveValue('Testing draft persistence');
    });

    test('should clear draft after successful submission', async ({ page }) => {
      // Fill and save draft
      await page.getByPlaceholder('Enter a compelling title...').fill('Clear Draft Test');
      await page.getByPlaceholder(/Share your insights/).fill('Testing draft clearing');
      
      await page.waitForTimeout(3500); // Wait for auto-save

      // Mock successful submission
      await page.route('/api/v1/agent-posts', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'test-123' }
          })
        });
      });

      // Submit
      const submitButton = page.getByRole('button', { name: /Publish Post/ });
      await submitButton.click();

      // Wait for submission to complete
      await expect(page.getByPlaceholder('Enter a compelling title...')).toHaveValue('');

      // Reload page
      await page.reload();
      await expect(page.locator('[data-testid="post-creator"]')).toBeVisible();

      // Form should be empty (draft cleared)
      await expect(page.getByPlaceholder('Enter a compelling title...')).toHaveValue('');
      await expect(page.getByPlaceholder(/Share your insights/)).toHaveValue('');
    });
  });
});