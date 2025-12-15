import { test, expect } from '@playwright/test';

/**
 * Database-Backed Quick Post Validation
 *
 * This test validates the complete workflow of Quick Post with real database integration:
 * 1. POST endpoint saves to SQLite database
 * 2. GET endpoint retrieves from database (not mock)
 * 3. Posts appear immediately in feed
 * 4. Posts persist after page refresh
 */

test.describe('Database Quick Post Validation - Zero Mocks', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('should create post via API and verify database storage', async ({ page }) => {
    // Create a unique test post via API
    const timestamp = Date.now();
    const testPost = {
      title: `DB Test Post ${timestamp}`,
      content: `This post validates real database integration - ${timestamp}`,
      author_agent: 'playwright-validator'
    };

    // Create post via POST endpoint
    const response = await page.request.post('http://localhost:3001/api/v1/agent-posts', {
      headers: { 'Content-Type': 'application/json' },
      data: testPost
    });

    expect(response.status()).toBe(201);
    const createResult = await response.json();
    expect(createResult.success).toBe(true);
    expect(createResult.data.id).toBeTruthy();

    const postId = createResult.data.id;

    // Verify post appears in GET endpoint (database query)
    const getResponse = await page.request.get('http://localhost:3001/api/v1/agent-posts?limit=10');
    expect(getResponse.status()).toBe(200);

    const getResult = await getResponse.json();
    expect(getResult.success).toBe(true);
    expect(getResult.data).toBeTruthy();
    expect(getResult.meta.total).toBeGreaterThan(0);

    // Verify our new post is in the results (should be first due to DESC order)
    const foundPost = getResult.data.find((p: any) => p.id === postId);
    expect(foundPost).toBeTruthy();
    expect(foundPost.title).toBe(testPost.title);
    expect(foundPost.content).toBe(testPost.content);

    // Verify no mock source indicator
    expect(getResult.meta.source).not.toBe('mock');
  });

  test('should show posts in UI feed from database', async ({ page }) => {
    // Wait for the feed to load
    await page.waitForSelector('[data-testid="agent-feed"], .space-y-6, .feed-container', { timeout: 10000 });

    // Check that posts are visible
    const posts = await page.locator('article, .post-card, [data-testid="post"]').count();
    expect(posts).toBeGreaterThan(0);
  });

  test('should persist posts after page refresh', async ({ page }) => {
    // Get current post count
    const initialResponse = await page.request.get('http://localhost:3001/api/v1/agent-posts?limit=5');
    const initialData = await initialResponse.json();
    const initialTotal = initialData.meta.total;
    const firstPostId = initialData.data[0]?.id;

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Get posts again
    const afterResponse = await page.request.get('http://localhost:3001/api/v1/agent-posts?limit=5');
    const afterData = await afterResponse.json();

    // Verify same total and same first post
    expect(afterData.meta.total).toBe(initialTotal);
    expect(afterData.data[0]?.id).toBe(firstPostId);
  });

  test('should create post through UI and verify immediate appearance', async ({ page }) => {
    // Navigate to Quick Post interface
    await page.goto('http://localhost:5173');

    // Wait for posting interface to load
    await page.waitForSelector('textarea[placeholder*="What"]', { timeout: 10000 });

    // Create unique test content
    const timestamp = Date.now();
    const testContent = `UI Test Post - Database Integration ${timestamp}`;

    // Fill in the quick post textarea
    await page.fill('textarea[placeholder*="What"]', testContent);

    // Get initial post count from API
    const beforeResponse = await page.request.get('http://localhost:3001/api/v1/agent-posts?limit=10');
    const beforeData = await beforeResponse.json();
    const beforeTotal = beforeData.meta.total;

    // Click the post button
    await page.click('button:has-text("Post")');

    // Wait a moment for the post to be created
    await page.waitForTimeout(1000);

    // Verify post count increased
    const afterResponse = await page.request.get('http://localhost:3001/api/v1/agent-posts?limit=10');
    const afterData = await afterResponse.json();

    expect(afterData.meta.total).toBe(beforeTotal + 1);

    // Verify the new post contains our content
    const newPost = afterData.data[0];
    expect(newPost.content).toContain(testContent);
  });

  test('should validate 10,000 character limit enforcement', async ({ page }) => {
    // Create post exceeding limit
    const longContent = 'x'.repeat(10001);

    const response = await page.request.post('http://localhost:3001/api/v1/agent-posts', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        title: 'Too Long',
        content: longContent,
        author_agent: 'test'
      }
    });

    expect(response.status()).toBe(400);
    const result = await response.json();
    expect(result.success).toBe(false);
    expect(result.error).toContain('10,000');
  });

  test('should validate required fields enforcement', async ({ page }) => {
    // Test missing title
    const noTitle = await page.request.post('http://localhost:3001/api/v1/agent-posts', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        content: 'Content without title',
        author_agent: 'test'
      }
    });
    expect(noTitle.status()).toBe(400);

    // Test missing content
    const noContent = await page.request.post('http://localhost:3001/api/v1/agent-posts', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        title: 'Title without content',
        author_agent: 'test'
      }
    });
    expect(noContent.status()).toBe(400);

    // Test missing author
    const noAuthor = await page.request.post('http://localhost:3001/api/v1/agent-posts', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        title: 'Title',
        content: 'Content'
      }
    });
    expect(noAuthor.status()).toBe(400);
  });

  test('should verify database returns posts in DESC order (newest first)', async ({ page }) => {
    // Create two posts in sequence
    const post1 = await page.request.post('http://localhost:3001/api/v1/agent-posts', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        title: 'First Post',
        content: 'Created first',
        author_agent: 'test'
      }
    });
    const result1 = await post1.json();
    const id1 = result1.data.id;

    await page.waitForTimeout(100); // Ensure different timestamps

    const post2 = await page.request.post('http://localhost:3001/api/v1/agent-posts', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        title: 'Second Post',
        content: 'Created second',
        author_agent: 'test'
      }
    });
    const result2 = await post2.json();
    const id2 = result2.data.id;

    // Get posts
    const getResponse = await page.request.get('http://localhost:3001/api/v1/agent-posts?limit=10');
    const getData = await getResponse.json();

    // Find positions
    const pos1 = getData.data.findIndex((p: any) => p.id === id1);
    const pos2 = getData.data.findIndex((p: any) => p.id === id2);

    // Second post should come before first post (lower index = newer)
    expect(pos2).toBeLessThan(pos1);
  });
});
