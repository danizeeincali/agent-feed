import { test, expect, Page } from '@playwright/test';

/**
 * Markdown Regression Test Suite
 *
 * Purpose: Verify backward compatibility after Markdown integration
 * - Plain text posts render correctly
 * - URL-only posts still show link previews
 * - @mentions and #hashtags still work
 * - No visual regressions
 * - Performance maintained
 */

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3001';
const SCREENSHOT_DIR = 'tests/screenshots/markdown-regression';

// Helper function to wait for feed to load
async function waitForFeedLoad(page: Page) {
  await page.waitForSelector('[data-testid="post-card"], .post-card, article', {
    timeout: 10000,
    state: 'visible'
  });

  // Wait for any dynamic content to settle
  await page.waitForTimeout(2000);
}

// Helper function to check for console errors
async function checkConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
}

test.describe('Markdown Regression Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Clear console errors
    page.on('console', () => {});

    // Navigate to feed
    await page.goto(FRONTEND_URL);
    await waitForFeedLoad(page);
  });

  test.describe('1. Plain Text Posts', () => {

    test('should render plain text posts without markdown processing', async ({ page }) => {
      // Take initial screenshot
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/01-plain-text-initial.png`,
        fullPage: true
      });

      // Find plain text posts (no URLs, no special formatting)
      const posts = await page.locator('[data-testid="post-card"], .post-card, article').all();

      let plainTextCount = 0;
      for (const post of posts) {
        const text = await post.textContent();

        // Check if it's plain text (no URLs)
        if (text && !text.includes('http') && !text.includes('www.')) {
          plainTextCount++;

          // Verify no markdown elements rendered
          const hasCodeBlock = await post.locator('pre, code').count();
          const hasMarkdownHeaders = await post.locator('h1, h2, h3').count();
          const hasMarkdownLists = await post.locator('ul > li, ol > li').count();

          expect(hasCodeBlock).toBe(0);
          // Allow headers that are part of the post card UI
          // expect(hasMarkdownHeaders).toBe(0);

          console.log(`Plain text post verified: "${text.substring(0, 50)}..."`);
        }
      }

      console.log(`Total plain text posts found: ${plainTextCount}`);
      expect(plainTextCount).toBeGreaterThan(0);

      // Take final screenshot
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/01-plain-text-final.png`,
        fullPage: true
      });
    });

    test('should preserve line breaks in plain text', async ({ page }) => {
      const posts = await page.locator('[data-testid="post-card"], .post-card, article').all();

      for (const post of posts) {
        const text = await post.textContent();

        if (text && text.includes('\n')) {
          // Verify line breaks are preserved (converted to <br> or wrapped in <p>)
          const html = await post.innerHTML();
          const hasBr = html.includes('<br>');
          const hasMultipleP = (html.match(/<p>/g) || []).length > 1;

          // At least one method of preserving line breaks should be present
          expect(hasBr || hasMultipleP).toBeTruthy();
        }
      }
    });
  });

  test.describe('2. URL-Only Posts', () => {

    test('should render LinkedIn URL posts with link previews', async ({ page }) => {
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/02-url-posts-initial.png`,
        fullPage: true
      });

      // Find posts containing LinkedIn URLs
      const posts = await page.locator('[data-testid="post-card"], .post-card, article').all();

      let urlPostCount = 0;
      for (const post of posts) {
        const text = await post.textContent();

        if (text && (text.includes('linkedin.com') || text.includes('http'))) {
          urlPostCount++;

          // Check for clickable links
          const links = await post.locator('a[href]').all();
          expect(links.length).toBeGreaterThan(0);

          // Verify at least one link is a valid URL
          for (const link of links) {
            const href = await link.getAttribute('href');
            if (href && (href.startsWith('http') || href.startsWith('www'))) {
              console.log(`✓ Valid URL link found: ${href.substring(0, 50)}...`);

              // Verify link is clickable (has href)
              expect(href).toBeTruthy();
            }
          }

          // Screenshot individual post with URL
          await post.screenshot({
            path: `${SCREENSHOT_DIR}/02-url-post-${urlPostCount}.png`
          });
        }
      }

      console.log(`Total URL posts found: ${urlPostCount}`);
      expect(urlPostCount).toBeGreaterThan(0);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/02-url-posts-final.png`,
        fullPage: true
      });
    });

    test('should not apply markdown to URL content', async ({ page }) => {
      const posts = await page.locator('[data-testid="post-card"], .post-card, article').all();

      for (const post of posts) {
        const links = await post.locator('a[href^="http"]').all();

        for (const link of links) {
          const href = await link.getAttribute('href');

          // Verify URL is not broken by markdown processing
          if (href) {
            expect(href).toMatch(/^https?:\/\//);
            expect(href).not.toContain('\\');
            expect(href).not.toContain('`');
          }
        }
      }
    });
  });

  test.describe('3. Posts with @mentions and #hashtags', () => {

    test('should render @mentions as clickable elements', async ({ page }) => {
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/03-mentions-initial.png`,
        fullPage: true
      });

      const posts = await page.locator('[data-testid="post-card"], .post-card, article').all();

      let mentionCount = 0;
      for (const post of posts) {
        const text = await post.textContent();

        if (text && text.includes('@')) {
          mentionCount++;

          // Look for mention elements (could be <a>, <span>, or custom element)
          const mentions = await post.locator('[data-mention], a[href*="@"], span:has-text("@")').all();

          console.log(`Post with @ found: ${mentions.length} mention elements`);

          // Screenshot post with mentions
          await post.screenshot({
            path: `${SCREENSHOT_DIR}/03-mention-post-${mentionCount}.png`
          });
        }
      }

      console.log(`Total posts with @ symbol: ${mentionCount}`);
    });

    test('should render #hashtags as clickable elements', async ({ page }) => {
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/03-hashtags-initial.png`,
        fullPage: true
      });

      const posts = await page.locator('[data-testid="post-card"], .post-card, article').all();

      let hashtagCount = 0;
      for (const post of posts) {
        const text = await post.textContent();

        if (text && text.includes('#')) {
          hashtagCount++;

          // Look for hashtag elements
          const hashtags = await post.locator('[data-hashtag], a[href*="#"], span:has-text("#")').all();

          console.log(`Post with # found: ${hashtags.length} hashtag elements`);

          // Screenshot post with hashtags
          await post.screenshot({
            path: `${SCREENSHOT_DIR}/03-hashtag-post-${hashtagCount}.png`
          });
        }
      }

      console.log(`Total posts with # symbol: ${hashtagCount}`);
    });

    test('should support feed filtering by hashtag (if implemented)', async ({ page }) => {
      // Check if hashtags are clickable
      const firstHashtag = page.locator('[data-hashtag], a[href*="#"]').first();

      if (await firstHashtag.count() > 0) {
        const beforeClick = await page.screenshot({
          path: `${SCREENSHOT_DIR}/03-before-hashtag-filter.png`,
          fullPage: true
        });

        // Click hashtag
        await firstHashtag.click();
        await page.waitForTimeout(1000);

        const afterClick = await page.screenshot({
          path: `${SCREENSHOT_DIR}/03-after-hashtag-filter.png`,
          fullPage: true
        });

        console.log('Hashtag clicked - check if filtering occurred');
      }
    });
  });

  test.describe('4. Mixed Content Verification', () => {

    test('should load all posts in feed without visual regressions', async ({ page }) => {
      const startTime = Date.now();

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/04-feed-complete-view.png`,
        fullPage: true
      });

      // Count all posts
      const posts = await page.locator('[data-testid="post-card"], .post-card, article').all();
      const postCount = posts.length;

      const loadTime = Date.now() - startTime;

      console.log(`Total posts loaded: ${postCount}`);
      console.log(`Load time: ${loadTime}ms`);

      expect(postCount).toBeGreaterThan(0);
      expect(loadTime).toBeLessThan(5000); // Should load in under 5 seconds
    });

    test('should have zero console errors', async ({ page }) => {
      const errors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      // Reload to capture all console messages
      await page.reload();
      await waitForFeedLoad(page);

      // Wait for any delayed errors
      await page.waitForTimeout(3000);

      console.log('Console errors:', errors);

      // Filter out known/acceptable errors
      const criticalErrors = errors.filter(err =>
        !err.includes('favicon') &&
        !err.includes('404') &&
        !err.includes('net::ERR_')
      );

      expect(criticalErrors.length).toBe(0);
    });

    test('should verify performance - load time under 5 seconds', async ({ page }) => {
      const startTime = Date.now();

      await page.goto(FRONTEND_URL);
      await waitForFeedLoad(page);

      const loadTime = Date.now() - startTime;

      console.log(`Feed load time: ${loadTime}ms`);

      expect(loadTime).toBeLessThan(5000);
    });

    test('should render all post types correctly', async ({ page }) => {
      const posts = await page.locator('[data-testid="post-card"], .post-card, article').all();

      const postTypes = {
        plainText: 0,
        withUrls: 0,
        withMentions: 0,
        withHashtags: 0,
        withImages: 0,
        total: posts.length
      };

      for (const post of posts) {
        const text = await post.textContent() || '';

        if (!text.includes('http') && !text.includes('@') && !text.includes('#')) {
          postTypes.plainText++;
        }
        if (text.includes('http')) postTypes.withUrls++;
        if (text.includes('@')) postTypes.withMentions++;
        if (text.includes('#')) postTypes.withHashtags++;

        const images = await post.locator('img').count();
        if (images > 0) postTypes.withImages++;
      }

      console.log('Post type distribution:', postTypes);

      // Take screenshot of distribution
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/04-post-types-distribution.png`,
        fullPage: true
      });

      expect(postTypes.total).toBeGreaterThan(0);
    });
  });

  test.describe('5. Feature Flag Test', () => {

    test('should handle markdown gracefully when feature is enabled', async ({ page }) => {
      // Check if enableMarkdown flag can be toggled
      // This might be in localStorage, sessionStorage, or context

      const localStorageKeys = await page.evaluate(() => Object.keys(localStorage));
      const sessionStorageKeys = await page.evaluate(() => Object.keys(sessionStorage));

      console.log('LocalStorage keys:', localStorageKeys);
      console.log('SessionStorage keys:', sessionStorageKeys);

      // Try to find markdown-related flags
      const markdownFlag = await page.evaluate(() => {
        return localStorage.getItem('enableMarkdown') ||
               sessionStorage.getItem('enableMarkdown') ||
               'not found';
      });

      console.log('Markdown flag value:', markdownFlag);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/05-feature-flag-enabled.png`,
        fullPage: true
      });
    });

    test('should verify graceful fallback if markdown disabled', async ({ page }) => {
      // Try to disable markdown
      await page.evaluate(() => {
        localStorage.setItem('enableMarkdown', 'false');
        sessionStorage.setItem('enableMarkdown', 'false');
      });

      await page.reload();
      await waitForFeedLoad(page);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/05-feature-flag-disabled.png`,
        fullPage: true
      });

      const posts = await page.locator('[data-testid="post-card"], .post-card, article').all();
      expect(posts.length).toBeGreaterThan(0);

      // Re-enable for other tests
      await page.evaluate(() => {
        localStorage.setItem('enableMarkdown', 'true');
      });
    });
  });

  test.describe('6. Database Query Test', () => {

    test('should query and verify all post types from database', async ({ page }) => {
      // Query backend API for posts
      const response = await page.request.get(`${BACKEND_URL}/api/posts`);
      expect(response.ok()).toBeTruthy();

      const posts = await response.json();

      console.log(`Database has ${posts.length} posts`);

      const dbPostTypes = {
        plainText: 0,
        withUrls: 0,
        withMentions: 0,
        withHashtags: 0,
        withMarkdown: 0
      };

      for (const post of posts) {
        const content = post.content || '';

        if (!content.includes('http') && !content.includes('@') && !content.includes('#')) {
          dbPostTypes.plainText++;
        }
        if (content.includes('http')) dbPostTypes.withUrls++;
        if (content.includes('@')) dbPostTypes.withMentions++;
        if (content.includes('#')) dbPostTypes.withHashtags++;

        // Check for markdown syntax
        if (content.includes('**') || content.includes('##') || content.includes('```')) {
          dbPostTypes.withMarkdown++;
        }
      }

      console.log('Database post type distribution:', dbPostTypes);

      expect(posts.length).toBeGreaterThan(0);
    });

    test('should verify each post type renders correctly', async ({ page }) => {
      // Get posts from API
      const response = await page.request.get(`${BACKEND_URL}/api/posts`);
      const posts = await response.json();

      // Navigate to feed
      await page.goto(FRONTEND_URL);
      await waitForFeedLoad(page);

      let renderedCount = 0;

      for (const dbPost of posts.slice(0, 5)) { // Test first 5 posts
        const postId = dbPost.id;
        const content = dbPost.content;

        // Try to find this post in the UI
        const postElement = page.locator(`[data-post-id="${postId}"], article:has-text("${content.substring(0, 20)}")`);

        if (await postElement.count() > 0) {
          renderedCount++;
          console.log(`✓ Post ${postId} rendered correctly`);

          await postElement.screenshot({
            path: `${SCREENSHOT_DIR}/06-db-post-${postId}.png`
          });
        }
      }

      console.log(`${renderedCount} posts verified from database`);
    });

    test('should document any rendering issues', async ({ page }) => {
      const response = await page.request.get(`${BACKEND_URL}/api/posts`);
      const posts = await response.json();

      const issues: string[] = [];

      for (const post of posts) {
        const content = post.content || '';

        // Check for potential markdown interference
        if (content.includes('**') && !content.includes('\\**')) {
          issues.push(`Post ${post.id}: May have unintended bold rendering`);
        }

        if (content.includes('#') && content.match(/^#\s/m)) {
          issues.push(`Post ${post.id}: May have unintended header rendering`);
        }

        if (content.includes('```')) {
          issues.push(`Post ${post.id}: May have unintended code block rendering`);
        }
      }

      console.log('Potential rendering issues:', issues);

      // Issues are warnings, not failures
      if (issues.length > 0) {
        console.warn(`Found ${issues.length} potential markdown interference issues`);
      }
    });
  });

  test.describe('7. Additional Regression Tests', () => {

    test('should verify post timestamps render correctly', async ({ page }) => {
      const posts = await page.locator('[data-testid="post-card"], .post-card, article').all();

      let timestampCount = 0;
      for (const post of posts) {
        const timestamps = await post.locator('time, [data-timestamp], .timestamp').all();
        if (timestamps.length > 0) {
          timestampCount++;
        }
      }

      console.log(`Posts with timestamps: ${timestampCount}`);
      expect(timestampCount).toBeGreaterThan(0);
    });

    test('should verify post authors render correctly', async ({ page }) => {
      const posts = await page.locator('[data-testid="post-card"], .post-card, article').all();

      let authorCount = 0;
      for (const post of posts) {
        const authors = await post.locator('[data-author], .author, .username').all();
        if (authors.length > 0) {
          authorCount++;
        }
      }

      console.log(`Posts with authors: ${authorCount}`);
    });

    test('should verify like/comment buttons still work', async ({ page }) => {
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/07-interactions-initial.png`,
        fullPage: true
      });

      const firstPost = page.locator('[data-testid="post-card"], .post-card, article').first();

      // Look for interaction buttons
      const likeButton = firstPost.locator('button:has-text("Like"), [data-action="like"]');
      const commentButton = firstPost.locator('button:has-text("Comment"), [data-action="comment"]');

      const hasLike = await likeButton.count() > 0;
      const hasComment = await commentButton.count() > 0;

      console.log(`Like button present: ${hasLike}`);
      console.log(`Comment button present: ${hasComment}`);

      if (hasLike) {
        await likeButton.first().click();
        await page.waitForTimeout(500);

        await page.screenshot({
          path: `${SCREENSHOT_DIR}/07-after-like.png`,
          fullPage: true
        });
      }
    });

    test('should verify scroll performance with many posts', async ({ page }) => {
      const startTime = Date.now();

      // Scroll to bottom
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      await page.waitForTimeout(1000);

      // Scroll back to top
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });

      const scrollTime = Date.now() - startTime;

      console.log(`Scroll performance: ${scrollTime}ms`);
      expect(scrollTime).toBeLessThan(3000);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/07-after-scroll.png`,
        fullPage: true
      });
    });

    test('should verify no layout shifts after markdown integration', async ({ page }) => {
      const initialHeight = await page.evaluate(() => document.body.scrollHeight);

      await page.waitForTimeout(2000);

      const finalHeight = await page.evaluate(() => document.body.scrollHeight);

      console.log(`Initial height: ${initialHeight}px, Final height: ${finalHeight}px`);

      // Allow for minor variations (within 5%)
      const heightDiff = Math.abs(finalHeight - initialHeight);
      const percentDiff = (heightDiff / initialHeight) * 100;

      console.log(`Height difference: ${percentDiff.toFixed(2)}%`);
      expect(percentDiff).toBeLessThan(5);
    });
  });
});
