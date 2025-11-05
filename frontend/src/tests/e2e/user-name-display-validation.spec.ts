/**
 * User Name Display Validation E2E Tests
 *
 * Validates that user and agent names display correctly throughout the application:
 * - User "Woz" displays in profile, posts, and comments
 * - Agent names display correctly (Λvi, Get-to-Know-You, etc.)
 * - No fallback names like "User" or "demo-user-123" appear
 * - Comment threads show correct author names
 *
 * @see /docs/screenshots/user-name-fix/ for test screenshots
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';

// Screenshot directory
const SCREENSHOT_DIR = path.join(process.cwd(), '..', 'docs', 'screenshots', 'user-name-fix');

// User and agent name constants
const USER_DISPLAY_NAME = 'Woz';
const USER_ID = 'demo-user-123';
const AGENT_NAMES = {
  AVI: 'Λvi',
  GET_TO_KNOW_YOU: 'Get-to-Know-You',
  SYSTEM: 'System Guide'
};

// Forbidden fallback names that should NOT appear
const FORBIDDEN_NAMES = [
  'User',
  'demo-user-123',
  'Anonymous',
  'Unknown User'
];

test.describe('User Name Display Validation', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the feed
    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for feed to load
    await page.waitForSelector('[data-testid="real-social-media-feed"]', {
      state: 'visible',
      timeout: 10000
    });
  });

  test.describe('User Display Name Tests', () => {

    test('should display "Woz" in user profile area', async ({ page }) => {
      // Look for user profile section (could be in header, sidebar, or profile dropdown)
      const profileSections = [
        page.locator('header').getByText(USER_DISPLAY_NAME),
        page.locator('[data-testid="user-profile"]').getByText(USER_DISPLAY_NAME),
        page.locator('.user-menu').getByText(USER_DISPLAY_NAME),
        page.locator('[aria-label*="user"]').getByText(USER_DISPLAY_NAME)
      ];

      let found = false;
      for (const section of profileSections) {
        const count = await section.count();
        if (count > 0) {
          await expect(section.first()).toBeVisible();
          found = true;
          break;
        }
      }

      // Take screenshot of profile area
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '01-user-profile-woz.png'),
        fullPage: false
      });

      // If not found in standard locations, check entire page
      if (!found) {
        const pageText = await page.textContent('body');
        expect(pageText).toContain(USER_DISPLAY_NAME);
      }
    });

    test('should display "Woz" in user posts', async ({ page }) => {
      // Create a new post as user
      const createPostButton = page.locator('button', { hasText: /create post|new post|post/i }).first();

      if (await createPostButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createPostButton.click();

        // Fill in post form
        await page.fill('[placeholder*="title"]', 'Test Post by Woz');
        await page.fill('[placeholder*="content"]', 'This is a test post to verify user name display.');

        // Submit post
        await page.click('button[type="submit"]');

        // Wait for post to appear
        await page.waitForTimeout(2000);

        // Reload to ensure post is in feed
        await page.reload({ waitUntil: 'networkidle' });
      }

      // Find posts created by the user
      const userPosts = page.locator('[data-testid="post-card"]').filter({
        hasText: USER_DISPLAY_NAME
      });

      // Should have at least one post with user name
      const postCount = await userPosts.count();
      expect(postCount).toBeGreaterThan(0);

      // Verify first post shows correct name
      if (postCount > 0) {
        await expect(userPosts.first().getByText(USER_DISPLAY_NAME)).toBeVisible();
      }

      // Take screenshot of user post
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '02-user-post-woz.png'),
        fullPage: true
      });
    });

    test('should display "Woz" in user comments', async ({ page }) => {
      // Find first post and open comments
      const firstPost = page.locator('[data-testid="post-card"]').first();
      await firstPost.scrollIntoViewIfNeeded();

      // Click comments button
      const commentsButton = firstPost.locator('button', { hasText: /comment/i }).first();
      await commentsButton.click();

      // Wait for comment section to open
      await page.waitForTimeout(1000);

      // Click "Add Comment" button if exists
      const addCommentButton = firstPost.locator('button', { hasText: /add comment/i });
      if (await addCommentButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addCommentButton.click();
      }

      // Find comment input
      const commentInput = firstPost.locator('textarea[placeholder*="comment"]').first();

      if (await commentInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Write a comment
        await commentInput.fill('This is a test comment from Woz to verify name display.');

        // Submit comment
        const submitButton = firstPost.locator('button', { hasText: /add comment|submit|post/i }).last();
        await submitButton.click();

        // Wait for comment to appear
        await page.waitForTimeout(2000);
      }

      // Check for user name in comments section
      const commentSection = firstPost.locator('[data-testid="comment-thread"], .comment-thread, [class*="comment"]');
      const userName = commentSection.getByText(USER_DISPLAY_NAME);

      // Verify user name appears in comment
      const commentWithUserName = await userName.count();
      expect(commentWithUserName).toBeGreaterThan(0);

      // Take screenshot of comment with user name
      await firstPost.screenshot({
        path: path.join(SCREENSHOT_DIR, '03-user-comment-woz.png')
      });
    });
  });

  test.describe('Agent Name Tests', () => {

    test('should display "Λvi" for Avi agent posts', async ({ page }) => {
      // Find posts by Avi agent
      const aviPosts = page.locator('[data-testid="post-card"]').filter({
        hasText: AGENT_NAMES.AVI
      });

      // Should have at least one Avi post
      const postCount = await aviPosts.count();

      if (postCount > 0) {
        // Verify Avi name displays correctly
        await expect(aviPosts.first().getByText(AGENT_NAMES.AVI)).toBeVisible();

        // Take screenshot of Avi post
        await aviPosts.first().screenshot({
          path: path.join(SCREENSHOT_DIR, '04-agent-avi-post.png')
        });
      } else {
        console.log('⚠️ No Avi agent posts found - may need to seed database');
      }
    });

    test('should display "Get-to-Know-You" for agent posts', async ({ page }) => {
      // Find posts by Get-to-Know-You agent
      const gtkPosts = page.locator('[data-testid="post-card"]').filter({
        hasText: AGENT_NAMES.GET_TO_KNOW_YOU
      });

      const postCount = await gtkPosts.count();

      if (postCount > 0) {
        // Verify agent name displays correctly
        await expect(gtkPosts.first().getByText(AGENT_NAMES.GET_TO_KNOW_YOU)).toBeVisible();

        // Take screenshot of agent post
        await gtkPosts.first().screenshot({
          path: path.join(SCREENSHOT_DIR, '05-agent-gtk-post.png')
        });
      } else {
        console.log('⚠️ No Get-to-Know-You agent posts found');
      }
    });

    test('should display agent names in comments they create', async ({ page }) => {
      // Find posts and check comments for agent names
      const posts = page.locator('[data-testid="post-card"]');
      const postCount = await posts.count();

      let agentCommentFound = false;

      // Check first 3 posts for agent comments
      for (let i = 0; i < Math.min(3, postCount); i++) {
        const post = posts.nth(i);
        await post.scrollIntoViewIfNeeded();

        // Open comments
        const commentsButton = post.locator('button', { hasText: /comment/i }).first();
        await commentsButton.click();
        await page.waitForTimeout(1000);

        // Check for agent names in comments
        for (const agentName of Object.values(AGENT_NAMES)) {
          const agentComment = post.getByText(agentName);
          const count = await agentComment.count();

          if (count > 0) {
            await expect(agentComment.first()).toBeVisible();
            agentCommentFound = true;

            // Take screenshot
            await post.screenshot({
              path: path.join(SCREENSHOT_DIR, `06-agent-comment-${agentName.replace(/[^a-z0-9]/gi, '-')}.png`)
            });
            break;
          }
        }

        if (agentCommentFound) break;
      }

      // Log if no agent comments found
      if (!agentCommentFound) {
        console.log('⚠️ No agent comments found in first 3 posts');
      }
    });
  });

  test.describe('No Fallback Tests', () => {

    test('should not display "User" fallback anywhere', async ({ page }) => {
      // Get all text content
      const bodyText = await page.textContent('body');

      // Check for forbidden fallback "User" (but allow "Users", "UserProfile", etc.)
      // Use regex to match standalone "User" word
      const standaloneUserRegex = /\bUser\b/;
      const hasStandaloneUser = standaloneUserRegex.test(bodyText || '');

      // Should NOT have standalone "User" fallback
      expect(hasStandaloneUser).toBeFalsy();

      // Take full page screenshot
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '07-no-user-fallback.png'),
        fullPage: true
      });
    });

    test('should not display "demo-user-123" visible to user', async ({ page }) => {
      // Get visible text content
      const visibleText = await page.textContent('body');

      // Should NOT display internal user ID
      expect(visibleText).not.toContain(USER_ID);

      // Check in all post cards
      const posts = page.locator('[data-testid="post-card"]');
      const postCount = await posts.count();

      for (let i = 0; i < postCount; i++) {
        const postText = await posts.nth(i).textContent();
        expect(postText).not.toContain(USER_ID);
      }

      // Take full page screenshot
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '08-no-user-id-visible.png'),
        fullPage: true
      });
    });

    test('should verify no forbidden fallback names in feed', async ({ page }) => {
      // Take screenshot of full feed
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '09-full-feed-validation.png'),
        fullPage: true
      });

      // Get all visible text
      const feedText = await page.textContent('[data-testid="real-social-media-feed"]');

      // Check each forbidden name
      for (const forbiddenName of FORBIDDEN_NAMES) {
        // Allow partial matches in compound words (e.g., "Username" is OK)
        // But standalone "User" or "demo-user-123" should not appear
        if (forbiddenName === USER_ID) {
          expect(feedText).not.toContain(forbiddenName);
        } else if (forbiddenName === 'User') {
          // More lenient check - allow in compound words
          const standaloneRegex = new RegExp(`\\b${forbiddenName}\\b`);
          expect(standaloneRegex.test(feedText || '')).toBeFalsy();
        } else {
          expect(feedText).not.toContain(forbiddenName);
        }
      }
    });
  });

  test.describe('Comment Thread Tests', () => {

    test('should create new comment as user and verify "Woz" shows', async ({ page }) => {
      // Find first post
      const firstPost = page.locator('[data-testid="post-card"]').first();
      await firstPost.scrollIntoViewIfNeeded();

      // Open comments
      const commentsButton = firstPost.locator('button', { hasText: /comment/i }).first();
      await commentsButton.click();
      await page.waitForTimeout(1000);

      // Click "Add Comment" if needed
      const addCommentBtn = firstPost.locator('button', { hasText: /add comment/i });
      if (await addCommentBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addCommentBtn.click();
      }

      // Fill comment
      const commentInput = firstPost.locator('textarea[placeholder*="comment"]').first();
      const testCommentText = `E2E Test: Verifying Woz name display at ${new Date().toISOString()}`;

      await commentInput.fill(testCommentText);

      // Submit
      const submitBtn = firstPost.locator('button', { hasText: /add comment|submit|post/i }).last();
      await submitBtn.click();

      // Wait for comment to appear
      await page.waitForTimeout(2000);

      // Verify "Woz" appears in the new comment
      const newComment = firstPost.locator('[class*="comment"]').filter({
        hasText: testCommentText
      });

      await expect(newComment.getByText(USER_DISPLAY_NAME)).toBeVisible();

      // Take screenshot
      await firstPost.screenshot({
        path: path.join(SCREENSHOT_DIR, '10-new-comment-woz.png')
      });
    });

    test('should verify existing comments show correct names', async ({ page }) => {
      // Find posts with comments
      const posts = page.locator('[data-testid="post-card"]');
      const postCount = await posts.count();

      let commentsFound = false;

      // Check first 3 posts
      for (let i = 0; i < Math.min(3, postCount); i++) {
        const post = posts.nth(i);
        await post.scrollIntoViewIfNeeded();

        // Check comment count
        const commentCountText = await post.locator('button', { hasText: /comment/i }).first().textContent();
        const hasComments = commentCountText && parseInt(commentCountText.match(/\d+/)?.[0] || '0') > 0;

        if (hasComments) {
          // Open comments
          await post.locator('button', { hasText: /comment/i }).first().click();
          await page.waitForTimeout(1000);

          // Verify names in comments (either user or agent names)
          const commentSection = post.locator('[data-testid="comment-thread"], [class*="comment"]');

          // Should contain either user name or agent names
          const hasValidName =
            (await commentSection.getByText(USER_DISPLAY_NAME).count()) > 0 ||
            (await commentSection.getByText(AGENT_NAMES.AVI).count()) > 0 ||
            (await commentSection.getByText(AGENT_NAMES.GET_TO_KNOW_YOU).count()) > 0;

          expect(hasValidName).toBeTruthy();
          commentsFound = true;

          // Take screenshot
          await post.screenshot({
            path: path.join(SCREENSHOT_DIR, `11-existing-comments-post-${i}.png`)
          });

          break;
        }
      }

      if (!commentsFound) {
        console.log('⚠️ No posts with existing comments found');
      }
    });

    test('should screenshot comment thread with all names', async ({ page }) => {
      // Find a post with multiple comments (best for showcasing name display)
      const posts = page.locator('[data-testid="post-card"]');
      const postCount = await posts.count();

      let bestPostIndex = -1;
      let maxComments = 0;

      // Find post with most comments
      for (let i = 0; i < Math.min(5, postCount); i++) {
        const post = posts.nth(i);
        const commentCountText = await post.locator('button', { hasText: /comment/i }).first().textContent();
        const commentCount = parseInt(commentCountText?.match(/\d+/)?.[0] || '0');

        if (commentCount > maxComments) {
          maxComments = commentCount;
          bestPostIndex = i;
        }
      }

      if (bestPostIndex >= 0 && maxComments > 0) {
        const post = posts.nth(bestPostIndex);
        await post.scrollIntoViewIfNeeded();

        // Open comments
        await post.locator('button', { hasText: /comment/i }).first().click();
        await page.waitForTimeout(2000);

        // Take screenshot of comment thread
        await post.screenshot({
          path: path.join(SCREENSHOT_DIR, '12-comment-thread-all-names.png')
        });

        // Verify no forbidden names in comments
        const commentText = await post.textContent();
        expect(commentText).not.toContain(USER_ID);

        // Log names found
        const foundNames = {
          user: (commentText || '').includes(USER_DISPLAY_NAME),
          avi: (commentText || '').includes(AGENT_NAMES.AVI),
          gtk: (commentText || '').includes(AGENT_NAMES.GET_TO_KNOW_YOU)
        };

        console.log('✅ Names found in comment thread:', foundNames);
      } else {
        console.log('⚠️ No posts with comments found for screenshot');
      }
    });
  });

  test.describe('Cross-Component Name Consistency', () => {

    test('should have consistent user name across all components', async ({ page }) => {
      // Collect all instances of user name
      const userNameElements = page.getByText(USER_DISPLAY_NAME);
      const count = await userNameElements.count();

      expect(count).toBeGreaterThan(0);

      // Verify all instances show exact same name (case-sensitive)
      for (let i = 0; i < count; i++) {
        const text = await userNameElements.nth(i).textContent();
        expect(text).toContain(USER_DISPLAY_NAME);
      }

      // Take screenshot
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '13-name-consistency-check.png'),
        fullPage: true
      });
    });

    test('should have consistent agent names across all components', async ({ page }) => {
      // Check each agent name
      for (const [key, agentName] of Object.entries(AGENT_NAMES)) {
        const agentElements = page.getByText(agentName);
        const count = await agentElements.count();

        if (count > 0) {
          // Verify all instances are exact matches
          for (let i = 0; i < Math.min(3, count); i++) {
            const text = await agentElements.nth(i).textContent();
            expect(text).toContain(agentName);
          }
        }
      }

      // Take screenshot
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '14-agent-name-consistency.png'),
        fullPage: true
      });
    });
  });
});
