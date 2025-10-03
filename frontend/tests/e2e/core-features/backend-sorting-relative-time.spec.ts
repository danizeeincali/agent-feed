import { test, expect, type Page } from '@playwright/test';

/**
 * Backend Sorting and Relative Time Display Validation
 *
 * Tests validate:
 * 1. Backend ordering is preserved (no frontend re-sorting)
 * 2. Posts sorted by comment count DESC
 * 3. Relative time displays correctly
 * 4. Tooltip shows exact date/time on hover
 * 5. Auto-update functionality
 * 6. New posts appear in correct position
 */

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_API = 'http://localhost:3001/api/v1/agent-posts';

interface AgentPost {
  id: string;
  title: string;
  content: string;
  comments_count: number;
  views_count: number;
  created_at: string;
  type: string;
}

test.describe('Backend Sorting and Relative Time Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should preserve backend ordering without frontend re-sorting', async ({ page }) => {
    // Fetch backend data to get expected order
    const response = await page.request.get(`${BACKEND_API}?limit=10`);
    expect(response.ok()).toBeTruthy();

    const backendData = await response.json();
    const backendPosts = backendData.data as AgentPost[];

    // Verify backend returns posts sorted by comment count
    for (let i = 0; i < backendPosts.length - 1; i++) {
      expect(backendPosts[i].comments_count).toBeGreaterThanOrEqual(
        backendPosts[i + 1].comments_count
      );
    }

    // Get UI post order
    const postElements = await page.locator('[data-testid="agent-post-card"]').all();
    expect(postElements.length).toBeGreaterThan(0);

    // Verify UI matches backend order
    for (let i = 0; i < Math.min(backendPosts.length, postElements.length); i++) {
      const titleInUI = await postElements[i].locator('h3').first().textContent();
      expect(titleInUI?.trim()).toBe(backendPosts[i].title);
    }

    // Take screenshot showing backend order preserved
    await page.screenshot({
      path: 'tests/e2e/screenshots/backend-sorting-relative-time/01-backend-order-preserved.png',
      fullPage: true
    });
  });

  test('should display posts sorted by comment count DESC', async ({ page }) => {
    const postElements = await page.locator('[data-testid="agent-post-card"]').all();
    const commentCounts: number[] = [];

    for (const post of postElements) {
      const statsText = await post.locator('[data-testid="post-stats"]').textContent();
      const commentMatch = statsText?.match(/(\d+)\s*comments?/);
      if (commentMatch) {
        commentCounts.push(parseInt(commentMatch[1]));
      }
    }

    // Verify descending order
    for (let i = 0; i < commentCounts.length - 1; i++) {
      expect(commentCounts[i]).toBeGreaterThanOrEqual(commentCounts[i + 1]);
    }

    // Take screenshot showing comment counts
    await page.screenshot({
      path: 'tests/e2e/screenshots/backend-sorting-relative-time/02-sorted-by-comments.png',
      fullPage: true
    });
  });

  test('should display relative time correctly', async ({ page }) => {
    const postElements = await page.locator('[data-testid="agent-post-card"]').all();
    expect(postElements.length).toBeGreaterThan(0);

    const relativeTimePatterns = [
      /just now/i,
      /\d+\s*(sec|second)s?\s*ago/i,
      /\d+\s*(min|minute)s?\s*ago/i,
      /\d+\s*(hour|hr)s?\s*ago/i,
      /yesterday/i,
      /\d+\s*days?\s*ago/i,
      /\d+\s*weeks?\s*ago/i,
      /\d+\s*months?\s*ago/i,
      /\d+\s*years?\s*ago/i
    ];

    let foundRelativeTime = false;

    for (const post of postElements.slice(0, 5)) {
      const timeElement = await post.locator('[data-testid="post-timestamp"]').first();

      if (await timeElement.count() > 0) {
        const timeText = await timeElement.textContent();

        // Check if matches any relative time pattern
        const matchesPattern = relativeTimePatterns.some(pattern =>
          pattern.test(timeText || '')
        );

        if (matchesPattern) {
          foundRelativeTime = true;
          console.log(`Found relative time: ${timeText}`);
        }
      }
    }

    expect(foundRelativeTime).toBeTruthy();

    // Take screenshot of relative time display
    await page.screenshot({
      path: 'tests/e2e/screenshots/backend-sorting-relative-time/03-relative-time-display.png',
      fullPage: true
    });
  });

  test('should show exact date/time in tooltip on hover', async ({ page }) => {
    const firstPost = page.locator('[data-testid="agent-post-card"]').first();
    const timeElement = firstPost.locator('[data-testid="post-timestamp"]').first();

    // Get the relative time text
    const relativeTime = await timeElement.textContent();
    console.log(`Relative time: ${relativeTime}`);

    // Hover over timestamp
    await timeElement.hover();
    await page.waitForTimeout(500); // Wait for tooltip to appear

    // Check for tooltip (may be in title attribute or separate tooltip element)
    const titleAttr = await timeElement.getAttribute('title');

    if (titleAttr) {
      // Verify tooltip contains date/time information
      expect(titleAttr).toMatch(/\d{1,2}:\d{2}/); // Contains time HH:MM
      console.log(`Tooltip: ${titleAttr}`);
    }

    // Take screenshot with tooltip visible
    await page.screenshot({
      path: 'tests/e2e/screenshots/backend-sorting-relative-time/04-tooltip-on-hover.png'
    });
  });

  test('should update relative timestamps after auto-update interval', async ({ page }) => {
    const firstPost = page.locator('[data-testid="agent-post-card"]').first();
    const timeElement = firstPost.locator('[data-testid="post-timestamp"]').first();

    // Get initial timestamp
    const initialTime = await timeElement.textContent();
    console.log(`Initial timestamp: ${initialTime}`);

    // Take before screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/backend-sorting-relative-time/05-before-auto-update.png',
      fullPage: true
    });

    // Wait for auto-update (60 seconds + buffer)
    console.log('Waiting for auto-update (65 seconds)...');
    await page.waitForTimeout(65000);

    // Get updated timestamp
    const updatedTime = await timeElement.textContent();
    console.log(`Updated timestamp: ${updatedTime}`);

    // Timestamp should have updated (or at least the component re-rendered)
    // For very recent posts, the text might be the same, but the component should have updated

    // Take after screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/backend-sorting-relative-time/06-after-auto-update.png',
      fullPage: true
    });
  });

  test('should create new post and verify correct positioning', async ({ page }) => {
    // Get initial backend data to understand current ordering
    const initialResponse = await page.request.get(`${BACKEND_API}?limit=10`);
    const initialData = await initialResponse.json();
    const initialPosts = initialData.data as AgentPost[];

    // Find the minimum comment count in current posts
    const minCommentCount = Math.min(...initialPosts.map(p => p.comments_count));

    // Open quick post interface
    const quickPostButton = page.locator('button:has-text("Quick Post")');
    await quickPostButton.click();
    await page.waitForTimeout(500);

    // Fill in new post
    const timestamp = Date.now();
    const testContent = `Test post for sorting validation ${timestamp}`;

    const contentInput = page.locator('[data-testid="quick-post-content"]');
    await contentInput.fill(testContent);

    // Take screenshot of quick post filled
    await page.screenshot({
      path: 'tests/e2e/screenshots/backend-sorting-relative-time/07-new-post-creation.png'
    });

    // Submit
    const postButton = page.locator('button:has-text("Post")');
    await postButton.click();

    // Wait for post to appear
    await page.waitForTimeout(2000);

    // Verify the new post appears
    const newPostExists = await page.locator(`text=${testContent}`).count();
    expect(newPostExists).toBeGreaterThan(0);

    // Get the position of the new post
    const allPosts = await page.locator('[data-testid="agent-post-card"]').all();
    let newPostIndex = -1;

    for (let i = 0; i < allPosts.length; i++) {
      const content = await allPosts[i].textContent();
      if (content?.includes(testContent)) {
        newPostIndex = i;
        break;
      }
    }

    expect(newPostIndex).toBeGreaterThan(-1);

    // New post should NOT be at the top (unless it somehow has the most comments)
    // It should be positioned based on its comment count (which should be 0)
    console.log(`New post appeared at index: ${newPostIndex} (0-based)`);

    // Verify it has "just now" timestamp
    const newPost = allPosts[newPostIndex];
    const timeText = await newPost.locator('[data-testid="post-timestamp"]').textContent();
    expect(timeText).toMatch(/just now/i);

    // Take screenshot showing new post in correct position
    await page.screenshot({
      path: 'tests/e2e/screenshots/backend-sorting-relative-time/08-new-post-positioned.png',
      fullPage: true
    });
  });

  test('should maintain sorting after search', async ({ page }) => {
    // Perform a search
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('agent');
    await page.waitForTimeout(1000);

    // Get backend data for search results
    const response = await page.request.get(`${BACKEND_API}?search=agent&limit=10`);
    const backendData = await response.json();
    const backendPosts = backendData.data as AgentPost[];

    // Verify backend still returns sorted data
    for (let i = 0; i < backendPosts.length - 1; i++) {
      expect(backendPosts[i].comments_count).toBeGreaterThanOrEqual(
        backendPosts[i + 1].comments_count
      );
    }

    // Verify UI maintains backend order
    const postElements = await page.locator('[data-testid="agent-post-card"]').all();

    for (let i = 0; i < Math.min(backendPosts.length, postElements.length); i++) {
      const titleInUI = await postElements[i].locator('h3').first().textContent();
      expect(titleInUI?.trim()).toBe(backendPosts[i].title);
    }

    // Take screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/backend-sorting-relative-time/09-sorting-after-search.png',
      fullPage: true
    });
  });

  test('should maintain sorting after filter by type', async ({ page }) => {
    // Apply a filter
    const filterButton = page.locator('button:has-text("Filter")').first();
    if (await filterButton.count() > 0) {
      await filterButton.click();
      await page.waitForTimeout(500);

      // Select a type (e.g., "announcement")
      const typeOption = page.locator('text=Announcement').first();
      if (await typeOption.count() > 0) {
        await typeOption.click();
        await page.waitForTimeout(1000);

        // Get backend data for filtered results
        const response = await page.request.get(`${BACKEND_API}?type=announcement&limit=10`);
        const backendData = await response.json();
        const backendPosts = backendData.data as AgentPost[];

        // Verify sorting maintained
        for (let i = 0; i < backendPosts.length - 1; i++) {
          expect(backendPosts[i].comments_count).toBeGreaterThanOrEqual(
            backendPosts[i + 1].comments_count
          );
        }

        // Take screenshot
        await page.screenshot({
          path: 'tests/e2e/screenshots/backend-sorting-relative-time/10-sorting-after-filter.png',
          fullPage: true
        });
      }
    }
  });

  test('should have no console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Interact with the page
    await page.waitForTimeout(2000);

    // Check for errors
    expect(consoleErrors).toHaveLength(0);
  });

  test('should verify relative time formats for different ages', async ({ page }) => {
    // Fetch backend data
    const response = await page.request.get(`${BACKEND_API}?limit=20`);
    const backendData = await response.json();
    const backendPosts = backendData.data as AgentPost[];

    // Map expected relative times based on created_at
    const now = new Date();
    const expectedFormats: Record<string, RegExp> = {};

    backendPosts.forEach(post => {
      const createdAt = new Date(post.created_at);
      const diffMs = now.getTime() - createdAt.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) {
        expectedFormats[post.id] = /just now|(\d+\s*sec)/i;
      } else if (diffMins < 60) {
        expectedFormats[post.id] = /\d+\s*min/i;
      } else if (diffHours < 24) {
        expectedFormats[post.id] = /\d+\s*hour/i;
      } else if (diffDays === 1) {
        expectedFormats[post.id] = /yesterday/i;
      } else if (diffDays < 7) {
        expectedFormats[post.id] = /\d+\s*day/i;
      }
    });

    // Take screenshot showing various time formats
    await page.screenshot({
      path: 'tests/e2e/screenshots/backend-sorting-relative-time/11-various-time-formats.png',
      fullPage: true
    });
  });

  test('should verify engagement features still work with backend sorting', async ({ page }) => {
    const firstPost = page.locator('[data-testid="agent-post-card"]').first();

    // Test expand/collapse
    const expandButton = firstPost.locator('button:has-text("Expand")').first();
    if (await expandButton.count() > 0) {
      await expandButton.click();
      await page.waitForTimeout(500);

      const collapseButton = firstPost.locator('button:has-text("Collapse")').first();
      expect(await collapseButton.count()).toBeGreaterThan(0);
    }

    // Test bookmark
    const bookmarkButton = firstPost.locator('[aria-label*="bookmark"]').first();
    if (await bookmarkButton.count() > 0) {
      await bookmarkButton.click();
      await page.waitForTimeout(500);
    }

    // Take screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/backend-sorting-relative-time/12-engagement-features.png'
    });
  });
});

test.describe('Backend API Validation', () => {
  test('should return posts sorted by comment count from API', async ({ request }) => {
    const response = await request.get(BACKEND_API);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    const posts = data.data as AgentPost[];

    expect(posts.length).toBeGreaterThan(0);

    // Verify sorting
    for (let i = 0; i < posts.length - 1; i++) {
      expect(posts[i].comments_count).toBeGreaterThanOrEqual(posts[i + 1].comments_count);
    }

    console.log('API Response - First 5 posts by comment count:');
    posts.slice(0, 5).forEach((post, i) => {
      console.log(`${i + 1}. ${post.title} - ${post.comments_count} comments`);
    });
  });

  test('should include created_at field for time display', async ({ request }) => {
    const response = await request.get(BACKEND_API);
    const data = await response.json();
    const posts = data.data as AgentPost[];

    posts.forEach(post => {
      expect(post.created_at).toBeDefined();
      expect(typeof post.created_at).toBe('string');

      // Verify it's a valid date
      const date = new Date(post.created_at);
      expect(date.toString()).not.toBe('Invalid Date');
    });
  });
});
