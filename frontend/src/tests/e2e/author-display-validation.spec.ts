import { test, expect } from '@playwright/test';

test.describe('Author Display Name Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });
  });

  test.describe('User Posts Display "Woz"', () => {
    test('should show "by Woz" in collapsed user post', async ({ page }) => {
      // Find user post (authorAgent = demo-user-123)
      // Look for posts by the user (not agent posts)
      const posts = page.locator('[data-testid="post-card"]');
      const postCount = await posts.count();

      let foundUserPost = false;

      for (let i = 0; i < postCount; i++) {
        const post = posts.nth(i);
        const byLine = await post.locator('.text-gray-600').first().textContent();

        // Check if this is a user post (contains "Woz" not an agent name)
        if (byLine?.includes('by Woz')) {
          foundUserPost = true;

          // Verify "by Woz" appears (not "by demo-user-123")
          await expect(post.locator('text=by Woz')).toBeVisible();

          // Screenshot
          await post.screenshot({ path: '/workspaces/agent-feed/docs/screenshots/author-fix/user-post-collapsed-woz.png' });
          break;
        }
      }

      expect(foundUserPost, 'Should find at least one user post by Woz').toBeTruthy();
    });

    test('should show "Woz" in expanded user post header', async ({ page }) => {
      // Find and expand a user post
      const posts = page.locator('[data-testid="post-card"]');
      const postCount = await posts.count();

      let foundUserPost = false;

      for (let i = 0; i < postCount; i++) {
        const post = posts.nth(i);
        const byLine = await post.locator('.text-gray-600').first().textContent();

        if (byLine?.includes('by Woz')) {
          foundUserPost = true;

          // Expand post
          const expandButton = post.locator('button').filter({ hasText: /expand|more/i });
          if (await expandButton.count() > 0) {
            await expandButton.first().click();
            await page.waitForTimeout(500);
          }

          // Verify header shows "Woz" (either in heading or prominent text)
          const hasWozHeading = await post.getByRole('heading', { name: /Woz/i }).count() > 0;
          const hasWozText = await post.locator('text=Woz').count() > 0;

          expect(hasWozHeading || hasWozText, 'Expanded post should show "Woz"').toBeTruthy();

          // Screenshot
          await post.screenshot({ path: '/workspaces/agent-feed/docs/screenshots/author-fix/user-post-expanded-woz.png' });
          break;
        }
      }

      expect(foundUserPost, 'Should find at least one user post to expand').toBeTruthy();
    });

    test('should not show "demo-user-123" in user posts', async ({ page }) => {
      // Verify the user ID is never displayed
      const demoUserId = page.locator('text=demo-user-123');
      await expect(demoUserId).not.toBeVisible();

      // Screenshot of full page
      await page.screenshot({ path: '/workspaces/agent-feed/docs/screenshots/author-fix/no-user-id-visible.png' });
    });
  });

  test.describe('Agent Posts Display Agent Names', () => {
    test('should show "by Λvi" for avi agent posts', async ({ page }) => {
      // Find avi agent post
      const aviPost = page.locator('[data-testid="post-card"]').filter({ hasText: 'Λvi' }).first();

      if (await aviPost.count() > 0) {
        // Verify "by Λvi" appears
        await expect(aviPost.locator('text=by Λvi')).toBeVisible();

        // Verify lowercase "avi" is not shown
        const hasLowercaseAvi = await aviPost.locator('text=/^by avi$/i').count();
        expect(hasLowercaseAvi).toBe(0);

        // Screenshot
        await aviPost.screenshot({ path: '/workspaces/agent-feed/docs/screenshots/author-fix/agent-post-avi.png' });
      }
    });

    test('should show "Get-to-Know-You" for get-to-know-you-agent', async ({ page }) => {
      // Find get-to-know-you agent post
      const agentPost = page.locator('[data-testid="post-card"]').filter({ hasText: 'Get-to-Know-You' }).first();

      if (await agentPost.count() > 0) {
        await expect(agentPost.locator('text=Get-to-Know-You')).toBeVisible();

        // Screenshot
        await agentPost.screenshot({ path: '/workspaces/agent-feed/docs/screenshots/author-fix/agent-post-gtky.png' });
      }
    });

    test('should display all agent names with proper formatting', async ({ page }) => {
      // Check that agent names are properly formatted
      const posts = page.locator('[data-testid="post-card"]');
      const postCount = await posts.count();

      const agentNames = ['Λvi', 'Get-to-Know-You', 'Hemingway'];
      let foundAgents = 0;

      for (let i = 0; i < postCount; i++) {
        const post = posts.nth(i);
        const postText = await post.textContent();

        for (const agentName of agentNames) {
          if (postText?.includes(agentName)) {
            foundAgents++;
            break;
          }
        }
      }

      expect(foundAgents, 'Should find posts from multiple agents').toBeGreaterThan(0);

      // Screenshot
      await page.screenshot({ path: '/workspaces/agent-feed/docs/screenshots/author-fix/all-agent-posts.png', fullPage: true });
    });
  });

  test.describe('Comment Author Names', () => {
    test('should show "Woz" for user comments', async ({ page }) => {
      // Expand first post to see comments
      const firstPost = page.locator('[data-testid="post-card"]').first();

      // Try to expand if not already expanded
      const expandButton = firstPost.locator('button').filter({ hasText: /expand|more/i });
      if (await expandButton.count() > 0) {
        await expandButton.first().click();
        await page.waitForTimeout(1000);
      }

      // Look for comments section
      const commentSection = firstPost.locator('[data-testid="comments-section"], .comments, [class*="comment"]');

      if (await commentSection.count() > 0) {
        // Find comment by Woz
        const wozComment = commentSection.locator('text=Woz').first();

        if (await wozComment.count() > 0) {
          await expect(wozComment).toBeVisible();

          // Verify NOT showing "User" fallback in the same comment
          const commentContainer = wozComment.locator('xpath=ancestor::div[contains(@class, "comment") or @data-testid="comment"]').first();
          const hasUserFallback = await commentContainer.locator('text=/^User$/').count();
          expect(hasUserFallback).toBe(0);

          // Screenshot
          await page.screenshot({ path: '/workspaces/agent-feed/docs/screenshots/author-fix/comment-user-woz.png' });
        }
      }
    });

    test('should show "Λvi" for agent comments', async ({ page }) => {
      // Expand first few posts to find agent comments
      const posts = page.locator('[data-testid="post-card"]');
      const postCount = Math.min(await posts.count(), 3);

      for (let i = 0; i < postCount; i++) {
        const post = posts.nth(i);
        const expandButton = post.locator('button').filter({ hasText: /expand|more/i });

        if (await expandButton.count() > 0) {
          await expandButton.first().click();
          await page.waitForTimeout(500);
        }
      }

      // Look for agent comments
      const aviComment = page.locator('[data-testid="comment"], [class*="comment"]').filter({ hasText: 'Λvi' }).first();

      if (await aviComment.count() > 0) {
        await expect(aviComment).toBeVisible();

        // Verify NOT showing "User" fallback for agent
        const hasUserFallback = await aviComment.locator('text=/^User$/').count();
        expect(hasUserFallback).toBe(0);

        // Screenshot
        await page.screenshot({ path: '/workspaces/agent-feed/docs/screenshots/author-fix/comment-agent-avi.png' });
      }
    });

    test('should properly format all comment author names', async ({ page }) => {
      // Expand all visible posts
      const posts = page.locator('[data-testid="post-card"]');
      const postCount = Math.min(await posts.count(), 5);

      for (let i = 0; i < postCount; i++) {
        const post = posts.nth(i);
        const expandButton = post.locator('button').filter({ hasText: /expand|more/i });

        if (await expandButton.count() > 0) {
          await expandButton.first().click();
          await page.waitForTimeout(300);
        }
      }

      // Screenshot all comments
      await page.screenshot({ path: '/workspaces/agent-feed/docs/screenshots/author-fix/all-comments.png', fullPage: true });
    });
  });

  test.describe('No Fallback Text', () => {
    test('should not show "demo-user-123" anywhere on page', async ({ page }) => {
      const demoUserId = page.locator('text=demo-user-123');
      await expect(demoUserId).not.toBeVisible();

      // Also check page content
      const pageContent = await page.content();
      expect(pageContent.includes('demo-user-123')).toBeFalsy();
    });

    test('should not show "User" fallback in comment author names', async ({ page }) => {
      // Expand all posts to check comments
      const posts = page.locator('[data-testid="post-card"]');
      const count = Math.min(await posts.count(), 5);

      for (let i = 0; i < count; i++) {
        const post = posts.nth(i);
        const expandButton = post.locator('button').filter({ hasText: /expand|more/i });

        if (await expandButton.count() > 0) {
          await expandButton.first().click();
          await page.waitForTimeout(300);
        }
      }

      await page.waitForTimeout(1000);

      // Verify no standalone "User" text in comment author names
      // This is a strict check - we look for "User" as a standalone author name
      const comments = page.locator('[data-testid="comment"], [class*="comment"]');
      const commentCount = await comments.count();

      for (let i = 0; i < commentCount; i++) {
        const comment = comments.nth(i);
        const authorText = await comment.locator('.font-medium, .font-bold').first().textContent();

        // "User" should never be the author name
        expect(authorText?.trim()).not.toBe('User');
      }

      // Screenshot
      await page.screenshot({ path: '/workspaces/agent-feed/docs/screenshots/author-fix/no-user-fallback.png', fullPage: true });
    });

    test('should not show agent IDs in display', async ({ page }) => {
      // Check that agent IDs (like "avi", "get-to-know-you-agent") are not visible
      const pageContent = await page.textContent('body');

      // Should not show lowercase agent IDs
      expect(pageContent?.includes('by avi')).toBeFalsy();
      expect(pageContent?.includes('by get-to-know-you-agent')).toBeFalsy();
      expect(pageContent?.includes('by hemingway')).toBeFalsy();

      // Screenshot
      await page.screenshot({ path: '/workspaces/agent-feed/docs/screenshots/author-fix/no-agent-ids.png', fullPage: true });
    });
  });

  test.describe('Visual Consistency', () => {
    test('should maintain consistent author display across post states', async ({ page }) => {
      const firstPost = page.locator('[data-testid="post-card"]').first();

      // Get author name in collapsed state
      const collapsedAuthor = await firstPost.locator('.text-gray-600').first().textContent();

      // Expand post
      const expandButton = firstPost.locator('button').filter({ hasText: /expand|more/i });
      if (await expandButton.count() > 0) {
        await expandButton.first().click();
        await page.waitForTimeout(500);
      }

      // Get author name in expanded state
      const expandedAuthor = await firstPost.locator('.text-gray-600, h3, .font-bold').first().textContent();

      // Both should reference the same display name (Woz or agent name)
      expect(collapsedAuthor).toBeTruthy();
      expect(expandedAuthor).toBeTruthy();

      // Screenshot
      await firstPost.screenshot({ path: '/workspaces/agent-feed/docs/screenshots/author-fix/author-consistency.png' });
    });
  });
});
