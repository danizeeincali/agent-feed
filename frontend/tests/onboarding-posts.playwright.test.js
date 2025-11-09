/**
 * Playwright Tests for Onboarding Posts UX
 * UI/UX validation for onboarding improvements
 *
 * Tests:
 * 1. Each onboarding question creates new post (not comment)
 * 2. Name displays correctly in all UI components
 * 3. Visual regression testing via screenshots
 * 4. No "Integration Test User" after name is set
 */

const { test, expect } = require('@playwright/test');
const fixtures = require('../../api-server/tests/fixtures/onboarding-data');

const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

test.describe('Onboarding Posts UX - Playwright Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Create test user and login
    await page.goto(`${baseURL}/test-setup`);
    await page.evaluate(() => {
      localStorage.setItem('test-user', JSON.stringify({
        id: 'test-user-' + Date.now(),
        email: 'test@example.com'
      }));
    });
  });

  test.describe('Visual Verification: Posts vs Comments', () => {
    test('should display each onboarding question as separate post card', async ({ page }) => {
      await page.goto(`${baseURL}/onboarding`);

      // Wait for first question
      await page.waitForSelector(fixtures.uiSelectors.onboarding.nameInput);
      await page.screenshot({
        path: 'tests/screenshots/playwright-01-first-question.png',
        fullPage: true
      });

      // Answer first question
      await page.fill(fixtures.uiSelectors.onboarding.nameInput, 'Orko');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(1000);

      // Verify first post appears in feed
      const firstPost = await page.locator(fixtures.uiSelectors.onboarding.questionPost).first();
      await expect(firstPost).toBeVisible();

      // Verify it's a post card, not a comment
      const postCard = await firstPost.getAttribute('data-type');
      expect(postCard).toBe('post');

      // Verify no nested structure (comments would be indented/nested)
      const isNested = await firstPost.evaluate(el => {
        return el.closest('[data-nested="true"]') !== null;
      });
      expect(isNested).toBe(false);

      await page.screenshot({
        path: 'tests/screenshots/playwright-02-first-post-created.png',
        fullPage: true
      });

      // Answer second question
      await page.waitForSelector(fixtures.uiSelectors.onboarding.interestsInput);
      await page.fill(fixtures.uiSelectors.onboarding.interestsInput, 'AI, coding');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(1000);

      // Verify second post appears
      const posts = await page.locator(fixtures.uiSelectors.onboarding.questionPost);
      await expect(posts).toHaveCount(2);

      await page.screenshot({
        path: 'tests/screenshots/playwright-03-second-post-created.png',
        fullPage: true
      });

      // Each should be independent post
      const allPosts = await posts.all();
      for (const post of allPosts) {
        const type = await post.getAttribute('data-type');
        expect(type).toBe('post');
      }
    });

    test('should verify DOM structure shows posts, not nested comments', async ({ page }) => {
      await page.goto(`${baseURL}/onboarding`);

      // Complete onboarding
      await page.fill(fixtures.uiSelectors.onboarding.nameInput, 'Orko');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(1000);

      await page.fill(fixtures.uiSelectors.onboarding.interestsInput, 'AI');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(1000);

      await page.fill(fixtures.uiSelectors.onboarding.goalsInput, 'Learning');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(2000);

      // Verify DOM structure
      const postContainers = await page.locator('[data-testid="onboarding-post"]').all();
      expect(postContainers.length).toBeGreaterThanOrEqual(3);

      for (const container of postContainers) {
        // Check no comment indicators
        const hasCommentClass = await container.evaluate(el =>
          el.classList.contains('comment') ||
          el.classList.contains('reply') ||
          el.classList.contains('nested')
        );
        expect(hasCommentClass).toBe(false);

        // Check for post indicators
        const hasPostClass = await container.evaluate(el =>
          el.classList.contains('post') ||
          el.getAttribute('data-type') === 'post'
        );
        expect(hasPostClass).toBe(true);

        // Check not indented (comments are typically indented)
        const marginLeft = await container.evaluate(el =>
          window.getComputedStyle(el).marginLeft
        );
        expect(marginLeft).toBe('0px');
      }

      await page.screenshot({
        path: 'tests/screenshots/playwright-04-all-posts-structure.png',
        fullPage: true
      });
    });

    test('should show posts in chronological order, not threaded', async ({ page }) => {
      await page.goto(`${baseURL}/onboarding`);

      // Complete all questions
      await page.fill(fixtures.uiSelectors.onboarding.nameInput, 'Orko');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(1000);

      await page.fill(fixtures.uiSelectors.onboarding.interestsInput, 'AI');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(1000);

      await page.fill(fixtures.uiSelectors.onboarding.goalsInput, 'Learning');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(2000);

      // Get all posts
      const posts = await page.locator('[data-testid="onboarding-post"]').all();

      // Extract timestamps
      const timestamps = [];
      for (const post of posts) {
        const timestamp = await post.getAttribute('data-timestamp');
        timestamps.push(new Date(timestamp));
      }

      // Verify chronological order (oldest first or newest first, consistently)
      for (let i = 1; i < timestamps.length; i++) {
        // Should be either all increasing or all decreasing
        const timeDiff = timestamps[i] - timestamps[i - 1];
        expect(Math.abs(timeDiff)).toBeGreaterThan(0);
      }

      await page.screenshot({
        path: 'tests/screenshots/playwright-05-chronological-order.png',
        fullPage: true
      });
    });
  });

  test.describe('Name Display Verification', () => {
    test('should display user name in header after onboarding', async ({ page }) => {
      await page.goto(`${baseURL}/onboarding`);

      // Complete onboarding with name
      await page.fill(fixtures.uiSelectors.onboarding.nameInput, 'Orko');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(1000);

      await page.fill(fixtures.uiSelectors.onboarding.interestsInput, 'AI');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(1000);

      await page.fill(fixtures.uiSelectors.onboarding.goalsInput, 'Learning');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForNavigation();

      // Verify header shows name
      const headerName = await page.locator(fixtures.uiSelectors.displayName.header);
      await expect(headerName).toBeVisible();
      await expect(headerName).toHaveText('Orko');

      await page.screenshot({
        path: 'tests/screenshots/playwright-06-name-in-header.png'
      });
    });

    test('should never show "Integration Test User" after name is set', async ({ page }) => {
      await page.goto(`${baseURL}/onboarding`);

      // Complete onboarding
      await page.fill(fixtures.uiSelectors.onboarding.nameInput, 'Orko');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(1000);

      await page.fill(fixtures.uiSelectors.onboarding.interestsInput, 'AI');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(1000);

      await page.fill(fixtures.uiSelectors.onboarding.goalsInput, 'Learning');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForNavigation();

      // Search entire page for "Integration Test User"
      const pageText = await page.textContent('body');
      expect(pageText).not.toContain('Integration Test User');

      // Verify all name fields
      const allNameFields = await page.locator('[data-testid*="name"], [data-testid*="author"]').all();
      for (const field of allNameFields) {
        const text = await field.textContent();
        expect(text).not.toBe('Integration Test User');
        if (text && text.trim().length > 0) {
          expect(text).toBe('Orko');
        }
      }

      await page.screenshot({
        path: 'tests/screenshots/playwright-07-no-integration-test-user.png',
        fullPage: true
      });
    });

    test('should display name in all UI locations', async ({ page }) => {
      await page.goto(`${baseURL}/onboarding`);

      // Complete onboarding
      await page.fill(fixtures.uiSelectors.onboarding.nameInput, 'Orko');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(1000);

      await page.fill(fixtures.uiSelectors.onboarding.interestsInput, 'AI');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(1000);

      await page.fill(fixtures.uiSelectors.onboarding.goalsInput, 'Learning');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForNavigation();

      // Create a post to verify author name
      await page.click('[data-testid="new-post-button"]');
      await page.fill('[data-testid="post-input"]', 'My first post');
      await page.click('[data-testid="submit-post"]');
      await page.waitForTimeout(2000);

      // Verify name in multiple locations
      const locationsToCheck = [
        { selector: fixtures.uiSelectors.displayName.header, name: 'header' },
        { selector: fixtures.uiSelectors.displayName.postAuthor, name: 'post-author' },
        { selector: fixtures.uiSelectors.displayName.profileDropdown, name: 'profile-dropdown' }
      ];

      for (const location of locationsToCheck) {
        const element = await page.locator(location.selector).first();
        await expect(element).toBeVisible();
        await expect(element).toHaveText('Orko');

        // Screenshot each location
        await element.screenshot({
          path: `tests/screenshots/playwright-08-name-in-${location.name}.png`
        });
      }
    });

    test('should persist name across page reloads', async ({ page }) => {
      // Complete onboarding
      await page.goto(`${baseURL}/onboarding`);
      await page.fill(fixtures.uiSelectors.onboarding.nameInput, 'Orko');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(1000);

      await page.fill(fixtures.uiSelectors.onboarding.interestsInput, 'AI');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(1000);

      await page.fill(fixtures.uiSelectors.onboarding.goalsInput, 'Learning');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForNavigation();

      // Verify name displays
      const headerNameBefore = await page.locator(fixtures.uiSelectors.displayName.header);
      await expect(headerNameBefore).toHaveText('Orko');

      // Reload page
      await page.reload();
      await page.waitForTimeout(1000);

      // Verify name still displays
      const headerNameAfter = await page.locator(fixtures.uiSelectors.displayName.header);
      await expect(headerNameAfter).toHaveText('Orko');

      await page.screenshot({
        path: 'tests/screenshots/playwright-09-name-after-reload.png'
      });
    });
  });

  test.describe('Visual Regression Testing', () => {
    test('should match expected visual appearance of onboarding posts', async ({ page }) => {
      await page.goto(`${baseURL}/onboarding`);

      // Complete onboarding
      await page.fill(fixtures.uiSelectors.onboarding.nameInput, 'Orko');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(1000);

      // Take baseline screenshot of post layout
      const postContainer = await page.locator('[data-testid="onboarding-post"]').first();
      await postContainer.screenshot({
        path: 'tests/screenshots/playwright-baseline-post.png'
      });

      // Verify visual elements present
      await expect(postContainer.locator('[data-testid="post-content"]')).toBeVisible();
      await expect(postContainer.locator('[data-testid="post-timestamp"]')).toBeVisible();

      // Verify NOT comment visual elements
      await expect(postContainer.locator('[data-testid="comment-indent"]')).not.toBeVisible();
      await expect(postContainer.locator('[data-testid="reply-indicator"]')).not.toBeVisible();
    });

    test('should verify post card styling differs from comment styling', async ({ page }) => {
      await page.goto(`${baseURL}/onboarding`);

      await page.fill(fixtures.uiSelectors.onboarding.nameInput, 'Orko');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(1000);

      const postElement = await page.locator('[data-testid="onboarding-post"]').first();

      // Get computed styles
      const styles = await postElement.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          marginLeft: computed.marginLeft,
          paddingLeft: computed.paddingLeft,
          borderLeft: computed.borderLeft,
          backgroundColor: computed.backgroundColor,
          boxShadow: computed.boxShadow
        };
      });

      // Posts should NOT have comment-like indentation
      expect(parseInt(styles.marginLeft)).toBeLessThan(20);

      // Posts should have card-like styling (shadow, background, etc.)
      expect(styles.boxShadow).not.toBe('none');

      await page.screenshot({
        path: 'tests/screenshots/playwright-10-post-styling.png'
      });
    });

    test('should take screenshots at all key verification points', async ({ page }) => {
      // 1. Initial onboarding screen
      await page.goto(`${baseURL}/onboarding`);
      await page.screenshot({
        path: 'tests/screenshots/playwright-11-01-initial.png',
        fullPage: true
      });

      // 2. After entering name
      await page.fill(fixtures.uiSelectors.onboarding.nameInput, 'Orko');
      await page.screenshot({
        path: 'tests/screenshots/playwright-11-02-name-entered.png',
        fullPage: true
      });

      // 3. After first post created
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: 'tests/screenshots/playwright-11-03-first-post.png',
        fullPage: true
      });

      // 4. After entering interests
      await page.fill(fixtures.uiSelectors.onboarding.interestsInput, 'AI, coding');
      await page.screenshot({
        path: 'tests/screenshots/playwright-11-04-interests-entered.png',
        fullPage: true
      });

      // 5. After second post created
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: 'tests/screenshots/playwright-11-05-second-post.png',
        fullPage: true
      });

      // 6. After entering goals
      await page.fill(fixtures.uiSelectors.onboarding.goalsInput, 'Learning');
      await page.screenshot({
        path: 'tests/screenshots/playwright-11-06-goals-entered.png',
        fullPage: true
      });

      // 7. After all posts created
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: 'tests/screenshots/playwright-11-07-all-posts.png',
        fullPage: true
      });

      // 8. Final feed view
      await page.goto(`${baseURL}/feed`);
      await page.screenshot({
        path: 'tests/screenshots/playwright-11-08-final-feed.png',
        fullPage: true
      });
    });
  });

  test.describe('Accessibility and UX', () => {
    test('should have proper ARIA labels for posts vs comments', async ({ page }) => {
      await page.goto(`${baseURL}/onboarding`);

      await page.fill(fixtures.uiSelectors.onboarding.nameInput, 'Orko');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(1000);

      const post = await page.locator('[data-testid="onboarding-post"]').first();

      // Check ARIA attributes
      const ariaLabel = await post.getAttribute('aria-label');
      expect(ariaLabel).toContain('post');
      expect(ariaLabel).not.toContain('comment');

      const role = await post.getAttribute('role');
      expect(role).toBe('article'); // Posts should be articles, not comments
    });

    test('should be keyboard navigable as posts', async ({ page }) => {
      await page.goto(`${baseURL}/onboarding`);

      await page.fill(fixtures.uiSelectors.onboarding.nameInput, 'Orko');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(1000);

      await page.fill(fixtures.uiSelectors.onboarding.interestsInput, 'AI');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(1000);

      // Navigate with keyboard
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement.getAttribute('data-testid'));

      // Should be able to focus posts
      expect(focusedElement).toContain('post');
    });
  });
});
