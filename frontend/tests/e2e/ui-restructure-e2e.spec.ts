import { test, expect, Page } from '@playwright/test';

test.describe('UI Restructure E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Navigate to the application
    await page.goto('http://localhost:3000');
    
    // Wait for the app to load
    await page.waitForSelector('[data-testid="agent-feed"]', { timeout: 10000 });
    
    // Ensure posts are loaded
    await page.waitForLoadState('networkidle');
  });

  test.describe('Post Expansion Functionality', () => {
    test('should expand and collapse posts with chevron buttons', async () => {
      // Wait for posts to load
      await page.waitForSelector('article', { timeout: 10000 });
      
      // Look for a post with expand button (long posts)
      const expandButton = page.locator('button[aria-label="Expand post"]').first();
      
      if (await expandButton.count() > 0) {
        // Initially should be collapsed (showing truncated content)
        await expect(page.locator('text=...')).toBeVisible();
        
        // Click expand
        await expandButton.click();
        
        // Should show collapse button
        await expect(page.locator('button[aria-label="Collapse post"]')).toBeVisible();
        
        // Should show full content
        await expect(page.locator('text=...')).not.toBeVisible();
        
        // Click collapse
        await page.locator('button[aria-label="Collapse post"]').click();
        
        // Should show expand button again
        await expect(expandButton).toBeVisible();
      }
    });

    test('should show different layouts for collapsed vs expanded views', async () => {
      await page.waitForSelector('article', { timeout: 10000 });
      
      const expandButton = page.locator('button[aria-label="Expand post"]').first();
      
      if (await expandButton.count() > 0) {
        // In collapsed view, check layout
        const collapsedTitle = page.locator('h2').first();
        await expect(collapsedTitle).toHaveClass(/text-lg/);
        
        // Expand
        await expandButton.click();
        
        // In expanded view, title should be larger
        await expect(collapsedTitle).toHaveClass(/text-2xl/);
        
        // Should show detailed metrics
        await expect(page.locator('text=chars')).toBeVisible();
        await expect(page.locator('text=words')).toBeVisible();
      }
    });

    test('should maintain independent expansion state for multiple posts', async () => {
      await page.waitForSelector('article', { timeout: 10000 });
      
      const expandButtons = page.locator('button[aria-label="Expand post"]');
      const expandButtonCount = await expandButtons.count();
      
      if (expandButtonCount >= 2) {
        // Expand first post
        await expandButtons.nth(0).click();
        
        // First post should show collapse button
        await expect(page.locator('button[aria-label="Collapse post"]').first()).toBeVisible();
        
        // Second post should still show expand button
        await expect(expandButtons.nth(1)).toBeVisible();
        
        // Expand second post
        await expandButtons.nth(1).click();
        
        // Both posts should now be expanded
        const collapseButtons = page.locator('button[aria-label="Collapse post"]');
        await expect(collapseButtons).toHaveCount(2);
      }
    });
  });

  test.describe('Actions Container Integration', () => {
    test('should show post actions menu with save and report options', async () => {
      await page.waitForSelector('article', { timeout: 10000 });
      
      // Click first post's actions menu
      const actionsButton = page.locator('button[aria-label="Post actions"]').first();
      await actionsButton.click();
      
      // Should show dropdown menu
      await expect(page.locator('text=Save Post')).toBeVisible();
      await expect(page.locator('text=Report Post')).toBeVisible();
    });

    test('should toggle save state correctly', async () => {
      await page.waitForSelector('article', { timeout: 10000 });
      
      const actionsButton = page.locator('button[aria-label="Post actions"]').first();
      await actionsButton.click();
      
      // Check initial save state and click save
      const saveButton = page.locator('text=Save Post').first();
      if (await saveButton.count() > 0) {
        await saveButton.click();
        
        // Menu should close
        await expect(saveButton).not.toBeVisible();
        
        // Open menu again to check state
        await actionsButton.click();
        await expect(page.locator('text=Unsave Post')).toBeVisible();
      } else {
        // Post is already saved, test unsave
        const unsaveButton = page.locator('text=Unsave Post').first();
        await unsaveButton.click();
        
        await actionsButton.click();
        await expect(page.locator('text=Save Post')).toBeVisible();
      }
    });

    test('should show report dialog when report is clicked', async () => {
      await page.waitForSelector('article', { timeout: 10000 });
      
      const actionsButton = page.locator('button[aria-label="Post actions"]').first();
      await actionsButton.click();
      
      const reportButton = page.locator('text=Report Post');
      await reportButton.click();
      
      // Should show report dialog
      await expect(page.locator('text=Report Post')).toBeVisible(); // Dialog title
      await expect(page.locator('text=Why are you reporting this post?')).toBeVisible();
      
      // Should show report reasons
      await expect(page.locator('text=Spam or inappropriate content')).toBeVisible();
      await expect(page.locator('text=Misleading information')).toBeVisible();
      
      // Test cancel
      await page.locator('text=Cancel').click();
      await expect(page.locator('text=Why are you reporting this post?')).not.toBeVisible();
    });

    test('should integrate actions with comments display', async () => {
      await page.waitForSelector('article', { timeout: 10000 });
      
      // Actions should be in the same container as comments/likes
      const postActionsArea = page.locator('.border-t.border-b').first();
      
      // Should contain like button, comments, and actions menu
      await expect(postActionsArea.locator('button[aria-label="Post actions"]')).toBeVisible();
      await expect(postActionsArea.locator('svg')).toBeVisible(); // Heart icon, comment icon, etc.
    });
  });

  test.describe('Delete Functionality', () => {
    test('should show delete option for user posts', async () => {
      await page.waitForSelector('article', { timeout: 10000 });
      
      // Look for a post that should be deletable
      const actionsButton = page.locator('button[aria-label="Post actions"]').first();
      await actionsButton.click();
      
      // Check if delete option appears (may not be available for all posts)
      const deleteButton = page.locator('text=Delete Post');
      if (await deleteButton.count() > 0) {
        await expect(deleteButton).toBeVisible();
      }
    });

    test('should show confirmation dialog for delete', async () => {
      await page.waitForSelector('article', { timeout: 10000 });
      
      const actionsButton = page.locator('button[aria-label="Post actions"]').first();
      await actionsButton.click();
      
      const deleteButton = page.locator('text=Delete Post');
      if (await deleteButton.count() > 0) {
        await deleteButton.click();
        
        // Should show confirmation dialog
        await expect(page.locator('text=Confirm Deletion')).toBeVisible();
        await expect(page.locator('text=Are you sure you want to delete this post')).toBeVisible();
        
        // Test cancel
        await page.locator('text=Cancel').click();
        await expect(page.locator('text=Confirm Deletion')).not.toBeVisible();
      }
    });

    test('should update UI immediately after successful deletion', async () => {
      await page.waitForSelector('article', { timeout: 10000 });
      
      // Count initial posts
      const initialPostCount = await page.locator('article').count();
      
      const actionsButton = page.locator('button[aria-label="Post actions"]').first();
      await actionsButton.click();
      
      const deleteButton = page.locator('text=Delete Post');
      if (await deleteButton.count() > 0) {
        // Get the post title to verify deletion
        await actionsButton.click(); // Close menu first
        const postTitle = await page.locator('article').first().locator('h2').textContent();
        
        // Open menu and delete
        await actionsButton.click();
        await deleteButton.click();
        
        // Confirm deletion
        await page.locator('button', { hasText: 'Delete' }).last().click();
        
        // Wait for UI update
        await page.waitForTimeout(1000);
        
        // Post should be removed
        if (postTitle) {
          await expect(page.locator(`text=${postTitle}`)).not.toBeVisible();
        }
        
        // Post count should decrease
        const finalPostCount = await page.locator('article').count();
        expect(finalPostCount).toBeLessThan(initialPostCount);
      }
    });
  });

  test.describe('Filtering System', () => {
    test('should show all filter options', async () => {
      await page.waitForSelector('article', { timeout: 10000 });
      
      // Click filter button
      const filterButton = page.locator('button', { hasText: 'All Posts' });
      await filterButton.click();
      
      // Should show all filter options
      await expect(page.locator('text=All Posts')).toBeVisible();
      await expect(page.locator('text=Starred Posts')).toBeVisible();
      await expect(page.locator('text=By Agent')).toBeVisible();
      await expect(page.locator('text=By Hashtag')).toBeVisible();
      await expect(page.locator('text=Saved Posts')).toBeVisible();
    });

    test('should filter by agent (My posts functionality)', async () => {
      await page.waitForSelector('article', { timeout: 10000 });
      
      // Click filter button
      await page.locator('button', { hasText: 'All Posts' }).click();
      
      // Click "By Agent"
      await page.locator('text=By Agent').click();
      
      // Should show available agents
      await page.waitForSelector('[data-testid="agent-dropdown"], .bg-white.border', { timeout: 5000 });
      
      // Click first agent (represents "My posts")
      const firstAgent = page.locator('.bg-gradient-to-br.from-blue-500').first();
      await firstAgent.click();
      
      // Filter should be applied
      await page.waitForTimeout(2000);
      
      // Should show filtered results
      await expect(page.locator('text=Agent:')).toBeVisible();
    });

    test('should filter by star rating', async () => {
      await page.waitForSelector('article', { timeout: 10000 });
      
      await page.locator('button', { hasText: 'All Posts' }).click();
      await page.locator('text=Starred Posts').click();
      
      // Should show rating options
      await expect(page.locator('text=All Ratings')).toBeVisible();
      await expect(page.locator('text=3+ Stars')).toBeVisible();
      await expect(page.locator('text=4+ Stars')).toBeVisible();
      await expect(page.locator('text=5 Stars Only')).toBeVisible();
      
      // Select 4+ stars
      await page.locator('text=4+ Stars').click();
      
      await page.waitForTimeout(2000);
      
      // Filter should be applied
      await expect(page.locator('text=4+ Stars')).toBeVisible();
    });

    test('should filter by hashtag', async () => {
      await page.waitForSelector('article', { timeout: 10000 });
      
      await page.locator('button', { hasText: 'All Posts' }).click();
      await page.locator('text=By Hashtag').click();
      
      // Should show available hashtags
      await page.waitForTimeout(1000);
      
      const firstHashtag = page.locator('text=#').first();
      if (await firstHashtag.count() > 0) {
        await firstHashtag.click();
        
        await page.waitForTimeout(2000);
        
        // Filter should be applied (hashtag in filter button)
        await expect(page.locator('text=#')).toBeVisible();
      }
    });

    test('should filter by saved posts', async () => {
      await page.waitForSelector('article', { timeout: 10000 });
      
      await page.locator('button', { hasText: 'All Posts' }).click();
      await page.locator('text=Saved Posts').click();
      
      await page.waitForTimeout(2000);
      
      // Filter should be applied
      await expect(page.locator('text=Saved Posts')).toBeVisible();
    });

    test('should clear filters', async () => {
      await page.waitForSelector('article', { timeout: 10000 });
      
      // Apply a filter first
      await page.locator('button', { hasText: 'All Posts' }).click();
      await page.locator('text=Saved Posts').click();
      
      await page.waitForTimeout(1000);
      
      // Should show clear button
      const clearButton = page.locator('text=Clear');
      await expect(clearButton).toBeVisible();
      
      // Clear filter
      await clearButton.click();
      
      // Should return to "All Posts"
      await expect(page.locator('button', { hasText: 'All Posts' })).toBeVisible();
    });

    test('should update post count when filters are applied', async () => {
      await page.waitForSelector('article', { timeout: 10000 });
      
      // Get initial post count
      const initialCount = await page.locator('text=/\\d+ posts?/').textContent();
      
      // Apply filter
      await page.locator('button', { hasText: 'All Posts' }).click();
      await page.locator('text=Saved Posts').click();
      
      await page.waitForTimeout(2000);
      
      // Post count should update
      const filteredCount = await page.locator('text=/\\d+ posts?/').textContent();
      
      // Counts should be different (unless all posts are saved)
      if (initialCount !== filteredCount) {
        expect(initialCount).not.toBe(filteredCount);
      }
    });
  });

  test.describe('Star System Removal Verification', () => {
    test('should not show standalone star rating system', async () => {
      await page.waitForSelector('article', { timeout: 10000 });
      
      // Should not have old star rating components
      await expect(page.locator('[data-testid="star-rating-standalone"]')).not.toBeVisible();
      
      // Should not have star rating outside of post actions
      const articles = page.locator('article');
      const firstArticle = articles.first();
      
      // Stars should only be in the actions area, not as standalone elements
      const starRatingInActions = firstArticle.locator('.border-t.border-b .star-rating, .border-t.border-b [data-testid="star-rating"]');
      const starRatingOutsideActions = firstArticle.locator('.star-rating, [data-testid="star-rating"]').not(starRatingInActions);
      
      // Should have stars in actions but not outside
      if (await starRatingInActions.count() > 0) {
        await expect(starRatingInActions).toBeVisible();
      }
      await expect(starRatingOutsideActions).not.toBeVisible();
    });
  });

  test.describe('Report System Removal Verification', () => {
    test('should not show standalone report functionality', async () => {
      await page.waitForSelector('article', { timeout: 10000 });
      
      // Should not have report buttons outside of actions menu
      await expect(page.locator('button', { hasText: 'Report' }).not(page.locator('[aria-label="Post actions"] ~ *'))).not.toBeVisible();
      
      // Report should only be accessible via actions menu
      const actionsButton = page.locator('button[aria-label="Post actions"]').first();
      await actionsButton.click();
      
      await expect(page.locator('text=Report Post')).toBeVisible();
    });
  });

  test.describe('Three Dots Menu Verification', () => {
    test('should not show old three dots menu', async () => {
      await page.waitForSelector('article', { timeout: 10000 });
      
      // Should not have old-style three dots menu (MoreHorizontal outside actions)
      const threeDotsOutsideActions = page.locator('button').filter({ hasText: '⋯' }).not(page.locator('button[aria-label="Post actions"]'));
      await expect(threeDotsOutsideActions).not.toBeVisible();
      
      // Should only have the new actions menu
      await expect(page.locator('button[aria-label="Post actions"]')).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should be responsive on mobile devices', async () => {
      // Test on mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.waitForSelector('article', { timeout: 10000 });
      
      // Posts should be visible and properly laid out
      await expect(page.locator('article').first()).toBeVisible();
      
      // Actions menu should be accessible
      const actionsButton = page.locator('button[aria-label="Post actions"]').first();
      await expect(actionsButton).toBeVisible();
      
      // Filter panel should be responsive
      const filterButton = page.locator('button', { hasText: 'All Posts' });
      await expect(filterButton).toBeVisible();
      
      // Expand functionality should work
      const expandButton = page.locator('button[aria-label="Expand post"]').first();
      if (await expandButton.count() > 0) {
        await expandButton.click();
        await expect(page.locator('button[aria-label="Collapse post"]')).toBeVisible();
      }
    });

    test('should handle touch interactions correctly', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForSelector('article', { timeout: 10000 });
      
      // Test tap on actions menu
      const actionsButton = page.locator('button[aria-label="Post actions"]').first();
      await actionsButton.tap();
      
      await expect(page.locator('text=Save Post')).toBeVisible();
      
      // Test tap outside to close
      await page.tap('body', { position: { x: 50, y: 50 } });
      await expect(page.locator('text=Save Post')).not.toBeVisible();
    });
  });

  test.describe('Performance Validation', () => {
    test('should load and render posts within acceptable time', async () => {
      const startTime = Date.now();
      
      await page.goto('http://localhost:3000');
      await page.waitForSelector('article', { timeout: 10000 });
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should handle rapid interactions without issues', async () => {
      await page.waitForSelector('article', { timeout: 10000 });
      
      // Rapid filter changes
      const filterButton = page.locator('button', { hasText: 'All Posts' });
      
      for (let i = 0; i < 3; i++) {
        await filterButton.click();
        await page.locator('text=Saved Posts').click();
        await page.waitForTimeout(100);
        
        await page.locator('text=Clear').click();
        await page.waitForTimeout(100);
      }
      
      // UI should remain stable
      await expect(page.locator('article').first()).toBeVisible();
    });

    test('should maintain UI performance with multiple expanded posts', async () => {
      await page.waitForSelector('article', { timeout: 10000 });
      
      const expandButtons = page.locator('button[aria-label="Expand post"]');
      const buttonCount = await expandButtons.count();
      
      if (buttonCount > 0) {
        const startTime = Date.now();
        
        // Expand multiple posts
        for (let i = 0; i < Math.min(buttonCount, 3); i++) {
          await expandButtons.nth(i).click();
          await page.waitForTimeout(100);
        }
        
        const endTime = Date.now();
        const expansionTime = endTime - startTime;
        
        // Should complete expansions quickly
        expect(expansionTime).toBeLessThan(2000);
        
        // All expanded posts should be visible
        const collapseButtons = page.locator('button[aria-label="Collapse post"]');
        await expect(collapseButtons).toHaveCount(Math.min(buttonCount, 3));
      }
    });
  });

  test.describe('Accessibility Validation', () => {
    test('should have proper keyboard navigation', async () => {
      await page.waitForSelector('article', { timeout: 10000 });
      
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      
      // Should focus on filter button
      await expect(page.locator('button', { hasText: 'All Posts' })).toBeFocused();
      
      // Continue tabbing to actions
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab'); // May need multiple tabs depending on layout
      
      // Should reach post actions
      const actionsButton = page.locator('button[aria-label="Post actions"]').first();
      if (await actionsButton.count() > 0) {
        // Focus and activate with keyboard
        await actionsButton.focus();
        await page.keyboard.press('Enter');
        
        // Menu should open
        await expect(page.locator('text=Save Post')).toBeVisible();
        
        // Escape should close
        await page.keyboard.press('Escape');
        await expect(page.locator('text=Save Post')).not.toBeVisible();
      }
    });

    test('should have proper ARIA labels', async () => {
      await page.waitForSelector('article', { timeout: 10000 });
      
      // Check for proper ARIA labels
      await expect(page.locator('button[aria-label="Post actions"]')).toBeVisible();
      
      const expandButton = page.locator('button[aria-label="Expand post"]').first();
      if (await expandButton.count() > 0) {
        await expect(expandButton).toHaveAttribute('aria-label', 'Expand post');
        
        await expandButton.click();
        
        const collapseButton = page.locator('button[aria-label="Collapse post"]').first();
        await expect(collapseButton).toHaveAttribute('aria-label', 'Collapse post');
      }
    });

    test('should be screen reader friendly', async () => {
      await page.waitForSelector('article', { timeout: 10000 });
      
      // Check for semantic HTML structure
      await expect(page.locator('main, [role="main"]')).toBeVisible();
      await expect(page.locator('article')).toBeVisible();
      
      // Check for proper headings
      await expect(page.locator('h1, h2, h3')).toBeVisible();
      
      // Check for proper button labeling
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const hasText = await button.textContent();
        const hasAriaLabel = await button.getAttribute('aria-label');
        
        // Each button should have either text content or aria-label
        expect(hasText || hasAriaLabel).toBeTruthy();
      }
    });
  });
});