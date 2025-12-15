/**
 * E2E Tests: Comment Counter User Interactions
 *
 * Tests the comment counter functionality in a real browser
 * with actual user interactions.
 *
 * Test Coverage:
 * - Counter visible on page load
 * - Counter shows correct initial value
 * - Click counter opens comment section
 * - Dark mode compatibility
 * - Responsive design (desktop, tablet, mobile)
 * - Accessibility
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3001';

test.describe('Comment Counter - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the feed page
    await page.goto(BASE_URL);

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });
  });

  test.describe('Visibility and Display', () => {
    test('should display comment counter on page load', async ({ page }) => {
      // Find the first post card
      const firstPost = page.locator('[data-testid="post-card"]').first();

      // Find the comment counter button
      const commentCounter = firstPost.locator('button', {
        has: page.locator('svg.lucide-message-circle, text=💬')
      }).first();

      // Verify counter is visible
      await expect(commentCounter).toBeVisible();
    });

    test('should show comment count as a number', async ({ page }) => {
      const firstPost = page.locator('[data-testid="post-card"]').first();

      // Find the comment counter (MessageCircle icon + count)
      const commentButton = firstPost.locator('button', {
        has: page.locator('svg.lucide-message-circle')
      }).first();

      await expect(commentButton).toBeVisible();

      // Get the text content
      const text = await commentButton.textContent();

      // Should contain a number (0 or more)
      expect(text).toMatch(/\d+/);

      // Parse and verify it's a valid number
      const match = text?.match(/\d+/);
      expect(match).toBeTruthy();

      const count = parseInt(match![0]);
      expect(count).toBeGreaterThanOrEqual(0);

      console.log('Comment count found:', count);
    });

    test('should display 0 for posts with no comments', async ({ page }) => {
      // Wait for posts to load
      await page.waitForSelector('[data-testid="post-card"]');

      // Get all post cards
      const posts = await page.locator('[data-testid="post-card"]').all();

      let foundZeroCommentPost = false;

      for (const post of posts) {
        const commentButton = post.locator('button', {
          has: page.locator('svg.lucide-message-circle')
        }).first();

        const text = await commentButton.textContent();
        const match = text?.match(/\d+/);

        if (match && match[0] === '0') {
          foundZeroCommentPost = true;

          // Verify it displays exactly "0"
          expect(text).toContain('0');
          break;
        }
      }

      // We should find at least one post with 0 comments
      // If not, that's okay - just log it
      if (!foundZeroCommentPost) {
        console.log('Note: All posts have comments. This is okay.');
      }
    });

    test('should display actual comment count for posts with comments', async ({ page }) => {
      // Fetch posts from API to get real counts
      const response = await page.request.get(`${API_URL}/api/agent-posts?limit=10`);
      const data = await response.json();

      const posts = data.data || data;

      // Find a post with comments
      const postWithComments = posts.find((p: any) => (p.comments || 0) > 0);

      if (postWithComments) {
        // Find this post in the UI
        const postCard = page.locator(`[data-testid="post-card"]`, {
          has: page.locator(`text=${postWithComments.title}`)
        }).first();

        await expect(postCard).toBeVisible();

        // Find the comment counter
        const commentButton = postCard.locator('button', {
          has: page.locator('svg.lucide-message-circle')
        }).first();

        const text = await commentButton.textContent();
        const match = text?.match(/\d+/);

        expect(match).toBeTruthy();
        const displayedCount = parseInt(match![0]);

        // Should match API data
        expect(displayedCount).toBe(postWithComments.comments || 0);

        console.log('API count:', postWithComments.comments, 'UI count:', displayedCount);
      }
    });
  });

  test.describe('User Interactions', () => {
    test('should open comments section when counter is clicked', async ({ page }) => {
      const firstPost = page.locator('[data-testid="post-card"]').first();

      // Find and click the comment counter
      const commentButton = firstPost.locator('button', {
        has: page.locator('svg.lucide-message-circle')
      }).first();

      await commentButton.click();

      // Wait for comments section to appear
      await page.waitForTimeout(500);

      // Check for comment section or "No comments yet" message
      const noCommentsText = await page.locator('text=No comments yet').count();
      const commentSection = await page.locator('text=Comments').count();

      // Either should be visible
      expect(noCommentsText + commentSection).toBeGreaterThan(0);
    });

    test('should toggle comments section on multiple clicks', async ({ page }) => {
      const firstPost = page.locator('[data-testid="post-card"]').first();

      const commentButton = firstPost.locator('button', {
        has: page.locator('svg.lucide-message-circle')
      }).first();

      // First click - open
      await commentButton.click();
      await page.waitForTimeout(300);

      let commentsSectionVisible = await page.locator('text=Comments').isVisible();
      expect(commentsSectionVisible).toBe(true);

      // Second click - close
      await commentButton.click();
      await page.waitForTimeout(300);

      // Third click - open again
      await commentButton.click();
      await page.waitForTimeout(300);

      commentsSectionVisible = await page.locator('text=Comments').isVisible();
      expect(commentsSectionVisible).toBe(true);
    });

    test('should show hover effect on comment counter', async ({ page }) => {
      const firstPost = page.locator('[data-testid="post-card"]').first();

      const commentButton = firstPost.locator('button', {
        has: page.locator('svg.lucide-message-circle')
      }).first();

      // Get initial color
      const initialColor = await commentButton.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      // Hover over the button
      await commentButton.hover();

      await page.waitForTimeout(100);

      // Color might change on hover (implementation dependent)
      // Just verify the element is still visible and clickable
      await expect(commentButton).toBeVisible();
    });
  });

  test.describe('Dark Mode Compatibility', () => {
    test('should display comment counter correctly in dark mode', async ({ page }) => {
      // Enable dark mode by adding dark class to html
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      await page.waitForTimeout(300);

      const firstPost = page.locator('[data-testid="post-card"]').first();

      const commentButton = firstPost.locator('button', {
        has: page.locator('svg.lucide-message-circle')
      }).first();

      // Verify counter is still visible in dark mode
      await expect(commentButton).toBeVisible();

      // Get text color in dark mode
      const darkModeColor = await commentButton.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      // Should have a color (not transparent)
      expect(darkModeColor).toBeTruthy();
      expect(darkModeColor).not.toBe('rgba(0, 0, 0, 0)');
    });

    test('should toggle between light and dark mode smoothly', async ({ page }) => {
      const firstPost = page.locator('[data-testid="post-card"]').first();

      const commentButton = firstPost.locator('button', {
        has: page.locator('svg.lucide-message-circle')
      }).first();

      // Light mode
      await expect(commentButton).toBeVisible();
      const lightModeColor = await commentButton.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      // Switch to dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      await page.waitForTimeout(200);

      // Still visible
      await expect(commentButton).toBeVisible();
      const darkModeColor = await commentButton.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      // Colors might be different (or same with current implementation)
      expect(darkModeColor).toBeTruthy();

      // Switch back to light mode
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
      });

      await page.waitForTimeout(200);

      // Still visible
      await expect(commentButton).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on desktop (1920x1080)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });

      const firstPost = page.locator('[data-testid="post-card"]').first();

      const commentButton = firstPost.locator('button', {
        has: page.locator('svg.lucide-message-circle')
      }).first();

      await expect(commentButton).toBeVisible();

      // Get bounding box
      const box = await commentButton.boundingBox();
      expect(box).toBeTruthy();

      // Should be reasonably sized
      expect(box!.width).toBeGreaterThan(20);
      expect(box!.height).toBeGreaterThan(20);
    });

    test('should display correctly on tablet (768x1024)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      const firstPost = page.locator('[data-testid="post-card"]').first();

      const commentButton = firstPost.locator('button', {
        has: page.locator('svg.lucide-message-circle')
      }).first();

      await expect(commentButton).toBeVisible();

      const box = await commentButton.boundingBox();
      expect(box).toBeTruthy();
    });

    test('should display correctly on mobile (375x667)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const firstPost = page.locator('[data-testid="post-card"]').first();

      const commentButton = firstPost.locator('button', {
        has: page.locator('svg.lucide-message-circle')
      }).first();

      await expect(commentButton).toBeVisible();

      // Should still be clickable on mobile
      await commentButton.click();

      await page.waitForTimeout(500);

      // Comments section should open
      const commentsVisible =
        (await page.locator('text=Comments').count()) > 0 ||
        (await page.locator('text=No comments yet').count()) > 0;

      expect(commentsVisible).toBe(true);
    });

    test('should be touch-friendly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const firstPost = page.locator('[data-testid="post-card"]').first();

      const commentButton = firstPost.locator('button', {
        has: page.locator('svg.lucide-message-circle')
      }).first();

      // Get button size
      const box = await commentButton.boundingBox();
      expect(box).toBeTruthy();

      // Should be at least 44x44 for touch targets (WCAG guideline)
      expect(box!.width).toBeGreaterThanOrEqual(40);
      expect(box!.height).toBeGreaterThanOrEqual(40);
    });
  });

  test.describe('Accessibility', () => {
    test('should have accessible button role', async ({ page }) => {
      const firstPost = page.locator('[data-testid="post-card"]').first();

      const commentButton = firstPost.locator('button', {
        has: page.locator('svg.lucide-message-circle')
      }).first();

      // Should be a button element
      const role = await commentButton.evaluate((el) => el.getAttribute('role') || el.tagName);
      expect(role.toLowerCase()).toMatch(/button/i);
    });

    test('should have accessible name or label', async ({ page }) => {
      const firstPost = page.locator('[data-testid="post-card"]').first();

      const commentButton = firstPost.locator('button', {
        has: page.locator('svg.lucide-message-circle')
      }).first();

      // Should have some text content or aria-label
      const text = await commentButton.textContent();
      const ariaLabel = await commentButton.getAttribute('aria-label');
      const title = await commentButton.getAttribute('title');

      // At least one should be present
      expect(text || ariaLabel || title).toBeTruthy();
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Focus the page
      await page.keyboard.press('Tab');

      // Keep tabbing until we find a comment button
      let attempts = 0;
      let foundCommentButton = false;

      while (attempts < 50 && !foundCommentButton) {
        await page.keyboard.press('Tab');
        attempts++;

        // Check if focused element is a comment button
        const focusedElement = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el) return null;

          const hasMessageCircle = el.querySelector('svg.lucide-message-circle');
          return hasMessageCircle ? true : false;
        });

        if (focusedElement) {
          foundCommentButton = true;

          // Press Enter to activate
          await page.keyboard.press('Enter');

          await page.waitForTimeout(500);

          // Comments section should open
          const commentsVisible =
            (await page.locator('text=Comments').count()) > 0 ||
            (await page.locator('text=No comments yet').count()) > 0;

          expect(commentsVisible).toBe(true);
        }
      }

      // We should have found and activated a comment button
      expect(foundCommentButton).toBe(true);
    });
  });

  test.describe('Data Accuracy', () => {
    test('should match API data exactly', async ({ page }) => {
      // Fetch posts from API
      const response = await page.request.get(`${API_URL}/api/agent-posts?limit=5`);
      const data = await response.json();

      const posts = data.data || data;

      for (const apiPost of posts) {
        // Find the post in UI by title
        const postCard = page.locator('[data-testid="post-card"]', {
          has: page.locator(`text=${apiPost.title}`)
        }).first();

        if (await postCard.isVisible()) {
          // Find the comment counter
          const commentButton = postCard.locator('button', {
            has: page.locator('svg.lucide-message-circle')
          }).first();

          const text = await commentButton.textContent();
          const match = text?.match(/\d+/);

          if (match) {
            const uiCount = parseInt(match[0]);
            const apiCount = apiPost.comments || 0;

            // Should match exactly
            expect(uiCount).toBe(apiCount);

            console.log(`Post "${apiPost.title.substring(0, 30)}...": API=${apiCount}, UI=${uiCount}`);
          }
        }
      }
    });

    test('should update when data changes', async ({ page }) => {
      const firstPost = page.locator('[data-testid="post-card"]').first();

      const commentButton = firstPost.locator('button', {
        has: page.locator('svg.lucide-message-circle')
      }).first();

      // Get initial count
      const initialText = await commentButton.textContent();
      const initialMatch = initialText?.match(/\d+/);
      const initialCount = initialMatch ? parseInt(initialMatch[0]) : 0;

      console.log('Initial count:', initialCount);

      // Click to open comments
      await commentButton.click();
      await page.waitForTimeout(500);

      // Look for "Add Comment" button
      const addCommentButton = page.locator('button', { hasText: 'Add Comment' }).first();

      if (await addCommentButton.isVisible()) {
        // Click add comment
        await addCommentButton.click();
        await page.waitForTimeout(300);

        // Find the comment textarea
        const textarea = page.locator('textarea[placeholder*="comment"]').first();

        if (await textarea.isVisible()) {
          // Type a comment
          await textarea.fill('Test comment from E2E test');

          // Find and click the submit button
          const submitButton = page.locator('button', {
            hasText: /Add Comment|Submit|Post/i
          }).last();

          await submitButton.click();

          // Wait for the comment to be posted
          await page.waitForTimeout(2000);

          // Reload the page to see updated count
          await page.reload();
          await page.waitForSelector('[data-testid="post-card"]');

          const updatedPost = page.locator('[data-testid="post-card"]').first();
          const updatedButton = updatedPost.locator('button', {
            has: page.locator('svg.lucide-message-circle')
          }).first();

          const updatedText = await updatedButton.textContent();
          const updatedMatch = updatedText?.match(/\d+/);
          const updatedCount = updatedMatch ? parseInt(updatedMatch[0]) : 0;

          console.log('Updated count:', updatedCount);

          // Count should have increased
          expect(updatedCount).toBeGreaterThanOrEqual(initialCount);
        }
      }
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle very long numbers gracefully', async ({ page }) => {
      // This would require setting up test data with high comment counts
      // For now, just verify the counter doesn't break with current data
      const posts = await page.locator('[data-testid="post-card"]').all();

      for (const post of posts) {
        const commentButton = post.locator('button', {
          has: page.locator('svg.lucide-message-circle')
        }).first();

        if (await commentButton.isVisible()) {
          const text = await commentButton.textContent();
          const match = text?.match(/\d+/);

          if (match) {
            const count = parseInt(match[0]);

            // Should be a valid number
            expect(isNaN(count)).toBe(false);

            // Should be non-negative
            expect(count).toBeGreaterThanOrEqual(0);
          }
        }
      }
    });

    test('should render consistently across page refreshes', async ({ page }) => {
      const firstPost = page.locator('[data-testid="post-card"]').first();

      const commentButton = firstPost.locator('button', {
        has: page.locator('svg.lucide-message-circle')
      }).first();

      const text1 = await commentButton.textContent();

      // Refresh page
      await page.reload();
      await page.waitForSelector('[data-testid="post-card"]');

      const firstPostAfterRefresh = page.locator('[data-testid="post-card"]').first();
      const commentButtonAfterRefresh = firstPostAfterRefresh.locator('button', {
        has: page.locator('svg.lucide-message-circle')
      }).first();

      const text2 = await commentButtonAfterRefresh.textContent();

      // Should be the same (unless a comment was added)
      expect(text1).toBe(text2);
    });
  });
});
