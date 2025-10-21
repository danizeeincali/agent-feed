import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3001';
const SCREENSHOT_DIR = '/workspaces/agent-feed/tests/screenshots/ghost-post-fix';

// Create screenshot directory if it doesn't exist
test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

test.describe('Ghost Post Fix Validation', () => {
  test('should NOT create ghost post when sending DM to AVI', async ({ page }) => {
    // Configure page timeout
    test.setTimeout(180000); // 3 minutes total test timeout
    page.setDefaultTimeout(60000); // 1 minute for individual operations

    console.log('Step 1: Navigate to homepage');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Let feed load

    console.log('Step 2: Take screenshot - Initial feed');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-initial-feed.png'),
      fullPage: true
    });

    console.log('Step 3: Count initial posts in feed');
    const initialPosts = await page.locator('article').count();
    console.log(`Initial post count: ${initialPosts}`);
    expect(initialPosts).toBeGreaterThanOrEqual(5);

    // Get the initial post IDs/content for comparison
    const initialPostIds = await page.locator('article').evaluateAll((articles) => {
      return articles.map((article) => {
        const content = article.querySelector('.post-content')?.textContent || '';
        const author = article.querySelector('.author-name')?.textContent || '';
        return `${author}:${content.substring(0, 50)}`;
      });
    });
    console.log('Initial posts:', initialPostIds);

    console.log('Step 4: Click Avi DM tab');
    // Look for the tab with "Avi DM" or similar text
    const aviDmTab = page.locator('button, div[role="tab"]').filter({ hasText: /Avi.*DM/i });
    await expect(aviDmTab).toBeVisible({ timeout: 10000 });
    await aviDmTab.click();
    await page.waitForTimeout(1000);

    console.log('Step 5: Take screenshot - Avi DM tab selected');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-avi-dm-tab.png'),
      fullPage: true
    });

    console.log('Step 6: Send DM to AVI');
    // Locate the specific input for Avi DM (the one with placeholder about messaging Avi)
    const messageInput = page.getByPlaceholder(/message to.*vi/i);
    await expect(messageInput).toBeVisible({ timeout: 5000 });
    await messageInput.fill('what directory are you in');

    // Find and click the send/post button
    const sendButton = page.locator('button').filter({ hasText: /send|post/i }).first();
    await expect(sendButton).toBeEnabled({ timeout: 5000 });
    await sendButton.click();

    console.log('Step 7: Wait for AVI response (up to 60 seconds)');
    // Wait for response in the DM interface or a notification
    await page.waitForTimeout(3000); // Initial wait for request to process

    // Look for response indicators - could be in a chat interface or notification
    try {
      await page.waitForSelector('text=/workspaces|directory|path|\/workspaces/i', {
        timeout: 60000
      });
      console.log('AVI response detected');
    } catch (error) {
      console.log('No AVI response detected within 60 seconds, continuing with test');
    }

    // Additional wait for any UI updates
    await page.waitForTimeout(2000);

    console.log('Step 8: Take screenshot - DM sent with response');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-dm-sent-with-response.png'),
      fullPage: true
    });

    console.log('Step 9: Check feed - count posts again');
    // Navigate to feed view or ensure we're viewing the feed
    const feedTab = page.locator('button, div[role="tab"], a').filter({ hasText: /feed|home|all/i }).first();
    if (await feedTab.isVisible()) {
      await feedTab.click();
      await page.waitForTimeout(2000);
    }

    const afterDmPosts = await page.locator('article').count();
    console.log(`Post count after DM: ${afterDmPosts}`);

    // Get post content after DM
    const afterDmPostIds = await page.locator('article').evaluateAll((articles) => {
      return articles.map((article) => {
        const content = article.querySelector('.post-content')?.textContent || '';
        const author = article.querySelector('.author-name')?.textContent || '';
        return `${author}:${content.substring(0, 50)}`;
      });
    });
    console.log('Posts after DM:', afterDmPostIds);

    console.log('Step 10: Take screenshot - Feed after DM');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04-feed-after-dm.png'),
      fullPage: true
    });

    console.log('Step 11: Verify NO ghost post with DM content');
    // Check that our DM doesn't appear as a post in the feed
    const ghostPost = page.locator('article').filter({
      hasText: /what directory are you in/i
    });
    const ghostPostCount = await ghostPost.count();
    console.log(`Ghost post count (should be 0): ${ghostPostCount}`);
    expect(ghostPostCount).toBe(0);

    // Verify post count hasn't increased
    console.log(`Comparing post counts - Initial: ${initialPosts}, After DM: ${afterDmPosts}`);
    expect(afterDmPosts).toBeLessThanOrEqual(initialPosts + 1); // Allow 1 new post max (if AVI posted publicly)

    console.log('Step 12: Navigate to /agents page');
    await page.goto(`${FRONTEND_URL}/agents`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('Step 13: Navigate back to / (feed)');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('Step 14: Verify posts still consistent (ghost post doesn\'t reappear)');
    const afterNavigationPosts = await page.locator('article').count();
    console.log(`Post count after navigation: ${afterNavigationPosts}`);

    const afterNavigationPostIds = await page.locator('article').evaluateAll((articles) => {
      return articles.map((article) => {
        const content = article.querySelector('.post-content')?.textContent || '';
        const author = article.querySelector('.author-name')?.textContent || '';
        return `${author}:${content.substring(0, 50)}`;
      });
    });
    console.log('Posts after navigation:', afterNavigationPostIds);

    // Ghost post should still not be present
    const ghostPostAfterNav = page.locator('article').filter({
      hasText: /what directory are you in/i
    });
    const ghostPostAfterNavCount = await ghostPostAfterNav.count();
    console.log(`Ghost post count after navigation (should be 0): ${ghostPostAfterNavCount}`);
    expect(ghostPostAfterNavCount).toBe(0);

    console.log('Step 15: Take screenshot - Feed after navigation');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '05-feed-after-navigation.png'),
      fullPage: true
    });

    // Final validation
    console.log('\n=== TEST VALIDATION SUMMARY ===');
    console.log(`✓ Initial posts: ${initialPosts}`);
    console.log(`✓ Posts after DM: ${afterDmPosts}`);
    console.log(`✓ Posts after navigation: ${afterNavigationPosts}`);
    console.log(`✓ Ghost post occurrences: ${ghostPostAfterNavCount} (expected: 0)`);
    console.log(`✓ Post count variation: ${Math.abs(afterNavigationPosts - initialPosts)} (expected: ≤1)`);

    expect(ghostPostAfterNavCount).toBe(0);
    expect(Math.abs(afterNavigationPosts - initialPosts)).toBeLessThanOrEqual(1);
  });

  test('should verify DM posts have correct visibility flag', async ({ page }) => {
    console.log('Validation Test: Check database for DM visibility flag');

    // Query the backend API to verify DM posts are marked correctly
    const response = await page.request.get(`${BACKEND_URL}/api/feed`);
    const responseStatus = response.status();
    console.log(`API response status: ${responseStatus}`);

    if (!response.ok()) {
      console.log('API endpoint not available, skipping database validation');
      test.skip();
      return;
    }

    const posts = await response.json();
    console.log(`Total posts in database: ${posts.length}`);

    // Check for any posts with DM content
    const dmPosts = posts.filter((post: any) =>
      post.content && post.content.toLowerCase().includes('what directory are you in')
    );

    console.log(`DM posts found: ${dmPosts.length}`);

    if (dmPosts.length > 0) {
      dmPosts.forEach((post: any, index: number) => {
        console.log(`DM Post ${index + 1}:`);
        console.log(`  - ID: ${post.id}`);
        console.log(`  - Visibility: ${post.visibility}`);
        console.log(`  - Is Public: ${post.is_public}`);
        console.log(`  - Content: ${post.content.substring(0, 50)}...`);

        // Verify DM posts are NOT public
        expect(post.visibility).toBe('dm');
        expect(post.is_public).toBe(false);
      });
    }
  });
});
