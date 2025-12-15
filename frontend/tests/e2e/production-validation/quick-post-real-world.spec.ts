import { test, expect, Page } from '@playwright/test';
import { join } from 'path';
import Database from 'better-sqlite3';

const SCREENSHOTS_DIR = join(__dirname, '../../screenshots/production-validation');
const DB_PATH = '/workspaces/agent-feed/database.db';

// Helper to generate text of specific length
function generateText(length: number, prefix: string = ''): string {
  const base = prefix || 'Test character ';
  let text = base;
  while (text.length < length) {
    text += base;
  }
  return text.substring(0, length);
}

// Helper to verify database
function verifyDatabase(postContent: string): any {
  const db = new Database(DB_PATH, { readonly: true });
  const post = db.prepare('SELECT * FROM agent_posts WHERE content = ? ORDER BY created_at DESC LIMIT 1').get(postContent);
  db.close();
  return post;
}

test.describe('Quick Post - Real-World Production Validation (ZERO MOCKS)', () => {
  let networkRequests: any[] = [];
  let networkResponses: any[] = [];

  test.beforeEach(async ({ page }) => {
    // Capture all network activity
    networkRequests = [];
    networkResponses = [];

    page.on('request', request => {
      if (request.url().includes('/api/')) {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData(),
          headers: request.headers()
        });
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/')) {
        response.json().then(body => {
          networkResponses.push({
            url: response.url(),
            status: response.status(),
            body: body
          });
        }).catch(() => {
          networkResponses.push({
            url: response.url(),
            status: response.status(),
            body: null
          });
        });
      }
    });
  });

  test('Step 1: Navigate to Feed and Verify Initial State', async ({ page }) => {
    console.log('\n=== STEP 1: NAVIGATE TO FEED ===');

    // Navigate to the application
    await page.goto('http://localhost:5173');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Verify Quick Post interface is visible
    const quickPostTab = page.locator('[role="tab"]').filter({ hasText: 'Quick Post' });
    await expect(quickPostTab).toBeVisible();
    console.log('✓ Quick Post tab visible');

    // Verify only 2 tabs exist (Quick Post, Avi DM)
    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(2);
    const tabTexts = await tabs.allTextContents();
    console.log('✓ Tabs found:', tabTexts);
    expect(tabTexts).toEqual(expect.arrayContaining(['Quick Post', 'Avi DM']));

    // Verify textarea is visible
    const textarea = page.locator('textarea[placeholder*="What\'s happening"]');
    await expect(textarea).toBeVisible();
    console.log('✓ Quick Post textarea visible');

    // Screenshot: initial state
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '01-initial-state.png'),
      fullPage: true
    });
    console.log('✓ Screenshot saved: 01-initial-state.png');
  });

  test('Step 2: Type Test Post and Verify Character Counter', async ({ page }) => {
    console.log('\n=== STEP 2: TYPE TEST POST ===');

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    const textarea = page.locator('textarea[placeholder*="What\'s happening"]');
    const testPost = "This is a test post from the simplified Quick Post interface! I'm testing the 10,000 character limit increase and the new progressive character counter. This post should save to the real database.";

    // Click and type in textarea
    await textarea.click();
    await textarea.fill(testPost);
    console.log(`✓ Typed ${testPost.length} characters`);

    // Verify textarea shows correct number of rows
    const rows = await textarea.getAttribute('rows');
    expect(rows).toBe('6');
    console.log('✓ Textarea has 6 rows');

    // Verify character counter is HIDDEN (under 9,500 chars)
    const characterCounter = page.locator('text=/\\d+\\/10,000/');
    await expect(characterCounter).not.toBeVisible();
    console.log('✓ Character counter is HIDDEN (under 9,500 chars)');

    // Screenshot: post typed
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '02-post-typed.png'),
      fullPage: true
    });
    console.log('✓ Screenshot saved: 02-post-typed.png');
  });

  test('Step 3: Submit Post and Verify Submission State', async ({ page }) => {
    console.log('\n=== STEP 3: SUBMIT POST ===');

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    const textarea = page.locator('textarea[placeholder*="What\'s happening"]');
    const testPost = "This is a test post from the simplified Quick Post interface! I'm testing the 10,000 character limit increase and the new progressive character counter. This post should save to the real database.";

    await textarea.fill(testPost);

    // Find and click the Quick Post button
    const quickPostButton = page.locator('button').filter({ hasText: 'Quick Post' });
    await expect(quickPostButton).toBeVisible();
    await expect(quickPostButton).toBeEnabled();
    console.log('✓ Quick Post button is enabled');

    // Capture screenshot before clicking
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '03a-before-submit.png'),
      fullPage: true
    });

    // Click the button and capture submitting state
    await quickPostButton.click();

    // Try to capture "Posting..." state (may be very brief)
    try {
      const postingButton = page.locator('button').filter({ hasText: 'Posting...' });
      await expect(postingButton).toBeVisible({ timeout: 500 });
      await page.screenshot({
        path: join(SCREENSHOTS_DIR, '03b-submitting-state.png'),
        fullPage: true
      });
      console.log('✓ Screenshot saved: 03b-submitting-state.png (Posting... state)');
    } catch {
      console.log('⚠ Posting state was too fast to capture');
    }

    // Wait for submission to complete
    await page.waitForTimeout(1000);

    // Screenshot after submission
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '03c-after-submit.png'),
      fullPage: true
    });
    console.log('✓ Screenshot saved: 03c-after-submit.png');
  });

  test('Step 4: Verify Post Appears in Feed', async ({ page }) => {
    console.log('\n=== STEP 4: VERIFY POST IN FEED ===');

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    const textarea = page.locator('textarea[placeholder*="What\'s happening"]');
    const testPost = `Test post at ${new Date().toISOString()} - This should appear in the feed!`;

    await textarea.fill(testPost);
    const quickPostButton = page.locator('button').filter({ hasText: 'Quick Post' });
    await quickPostButton.click();

    // Wait for post to appear
    await page.waitForTimeout(2000);

    // Look for the post in the feed
    const postInFeed = page.locator(`text="${testPost}"`).first();
    await expect(postInFeed).toBeVisible({ timeout: 5000 });
    console.log('✓ Post appears in feed');

    // Verify timestamp exists
    const feedItem = postInFeed.locator('xpath=ancestor::div[contains(@class, "border") or contains(@class, "rounded")]').first();
    const timestamp = feedItem.locator('text=/\\d+[smhd]|just now|yesterday/i').first();
    await expect(timestamp).toBeVisible();
    console.log('✓ Post has timestamp');

    // Screenshot: post in feed
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '04-post-in-feed.png'),
      fullPage: true
    });
    console.log('✓ Screenshot saved: 04-post-in-feed.png');
  });

  test('Step 5: Check Network Tab and API Calls', async ({ page }) => {
    console.log('\n=== STEP 5: NETWORK ANALYSIS ===');

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    const textarea = page.locator('textarea[placeholder*="What\'s happening"]');
    const testPost = `Network test post ${Date.now()}`;

    // Clear previous network logs
    networkRequests = [];
    networkResponses = [];

    await textarea.fill(testPost);
    const quickPostButton = page.locator('button').filter({ hasText: 'Quick Post' });
    await quickPostButton.click();

    // Wait for network request
    await page.waitForTimeout(2000);

    // Find POST request to /api/v1/agent-posts
    const postRequest = networkRequests.find(req =>
      req.url.includes('/api/v1/agent-posts') && req.method === 'POST'
    );

    expect(postRequest).toBeDefined();
    console.log('✓ POST request found:', postRequest?.url);

    // Verify request payload
    if (postRequest?.postData) {
      const payload = JSON.parse(postRequest.postData);
      console.log('✓ Request payload:', payload);
      expect(payload.content).toBe(testPost);
    }

    // Find response
    const postResponse = networkResponses.find(res =>
      res.url.includes('/api/v1/agent-posts') && res.status === 201
    );

    expect(postResponse).toBeDefined();
    console.log('✓ Response status:', postResponse?.status);
    console.log('✓ Response body:', postResponse?.body);

    // Verify response contains post ID
    expect(postResponse?.body?.id).toBeDefined();
    console.log('✓ Post ID:', postResponse?.body?.id);

    // Screenshot network tab simulation
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '05-network-activity.png'),
      fullPage: true
    });
    console.log('✓ Screenshot saved: 05-network-activity.png');

    // Save network logs to file
    const fs = require('fs');
    const networkLog = {
      requests: networkRequests,
      responses: networkResponses,
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(
      join(SCREENSHOTS_DIR, '05-network-log.json'),
      JSON.stringify(networkLog, null, 2)
    );
    console.log('✓ Network log saved: 05-network-log.json');
  });

  test('Step 6: Test Long Post (5000+ chars)', async ({ page }) => {
    console.log('\n=== STEP 6: LONG POST TEST ===');

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    const textarea = page.locator('textarea[placeholder*="What\'s happening"]');
    const longPost = generateText(5000, 'This is a long post to test the 10,000 character limit. ');

    await textarea.fill(longPost);
    console.log(`✓ Typed ${longPost.length} characters`);

    // Verify counter is still HIDDEN (under 9,500)
    const characterCounter = page.locator('text=/\\d+\\/10,000/');
    await expect(characterCounter).not.toBeVisible();
    console.log('✓ Character counter HIDDEN at 5,000 chars');

    // Screenshot
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '06-long-post-5000.png'),
      fullPage: true
    });
    console.log('✓ Screenshot saved: 06-long-post-5000.png');

    // Submit the post
    const quickPostButton = page.locator('button').filter({ hasText: 'Quick Post' });
    await quickPostButton.click();
    await page.waitForTimeout(2000);

    // Verify post was created
    const postInFeed = page.locator(`text="${longPost.substring(0, 50)}"`).first();
    await expect(postInFeed).toBeVisible({ timeout: 5000 });
    console.log('✓ Long post appears in feed');

    // Screenshot with post
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '06-long-post-in-feed.png'),
      fullPage: true
    });
  });

  test('Step 7: Test Character Counter Thresholds', async ({ page }) => {
    console.log('\n=== STEP 7: CHARACTER COUNTER THRESHOLDS ===');

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    const textarea = page.locator('textarea[placeholder*="What\'s happening"]');
    const characterCounter = page.locator('text=/\\d+\\/10,000/');

    // Test 9,500 characters - counter should appear in GRAY
    console.log('\nTesting 9,500 characters (GRAY)...');
    const text9500 = generateText(9500);
    await textarea.fill(text9500);
    await page.waitForTimeout(500);

    await expect(characterCounter).toBeVisible();
    const counter9500 = page.locator('text="9500/10,000"');
    await expect(counter9500).toBeVisible();

    // Check color - should be gray (default text color)
    const counterElement9500 = await counter9500.elementHandle();
    const color9500 = await counterElement9500?.evaluate(el =>
      window.getComputedStyle(el).color
    );
    console.log('✓ Counter visible at 9,500 chars, color:', color9500);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '07a-counter-9500-gray.png'),
      fullPage: true
    });
    console.log('✓ Screenshot saved: 07a-counter-9500-gray.png');

    // Test 9,700 characters - counter should turn ORANGE
    console.log('\nTesting 9,700 characters (ORANGE)...');
    const text9700 = generateText(9700);
    await textarea.fill(text9700);
    await page.waitForTimeout(500);

    const counter9700 = page.locator('text="9700/10,000"');
    await expect(counter9700).toBeVisible();

    const counterElement9700 = await counter9700.elementHandle();
    const color9700 = await counterElement9700?.evaluate(el =>
      window.getComputedStyle(el).color
    );
    console.log('✓ Counter at 9,700 chars, color:', color9700);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '07b-counter-9700-orange.png'),
      fullPage: true
    });
    console.log('✓ Screenshot saved: 07b-counter-9700-orange.png');

    // Test 9,900 characters - counter should turn RED
    console.log('\nTesting 9,900 characters (RED)...');
    const text9900 = generateText(9900);
    await textarea.fill(text9900);
    await page.waitForTimeout(500);

    const counter9900 = page.locator('text="9900/10,000"');
    await expect(counter9900).toBeVisible();

    const counterElement9900 = await counter9900.elementHandle();
    const color9900 = await counterElement9900?.evaluate(el =>
      window.getComputedStyle(el).color
    );
    console.log('✓ Counter at 9,900 chars, color:', color9900);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '07c-counter-9900-red.png'),
      fullPage: true
    });
    console.log('✓ Screenshot saved: 07c-counter-9900-red.png');
  });

  test('Step 8: Verify Database Storage (ZERO MOCKS)', async ({ page }) => {
    console.log('\n=== STEP 8: DATABASE VERIFICATION ===');

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    const textarea = page.locator('textarea[placeholder*="What\'s happening"]');
    const uniquePost = `Database test post ${Date.now()} - PRODUCTION VALIDATION`;

    await textarea.fill(uniquePost);
    const quickPostButton = page.locator('button').filter({ hasText: 'Quick Post' });
    await quickPostButton.click();

    // Wait for submission
    await page.waitForTimeout(2000);

    // Query the REAL database
    console.log('\nQuerying database at:', DB_PATH);
    const dbPost = verifyDatabase(uniquePost);

    expect(dbPost).toBeDefined();
    console.log('✓ Post found in database:', {
      id: dbPost.id,
      content: dbPost.content.substring(0, 100) + '...',
      created_at: dbPost.created_at,
      agent_id: dbPost.agent_id
    });

    // Verify it's the real SQLite database
    const db = new Database(DB_PATH, { readonly: true });
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='agent_posts'").get();
    console.log('✓ Database schema:', tableInfo);

    const postCount = db.prepare('SELECT COUNT(*) as count FROM agent_posts').get();
    console.log('✓ Total posts in database:', postCount);

    db.close();

    // Screenshot
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '08-database-verified.png'),
      fullPage: true
    });
    console.log('✓ Screenshot saved: 08-database-verified.png');
  });

  test('FINAL: Complete Integration Test', async ({ page }) => {
    console.log('\n=== FINAL INTEGRATION TEST ===');
    console.log('Testing complete workflow with real browser, real API, real database\n');

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Step 1: Verify UI
    const quickPostTab = page.locator('[role="tab"]').filter({ hasText: 'Quick Post' });
    await expect(quickPostTab).toBeVisible();
    console.log('✓ UI loaded');

    // Step 2: Type and submit
    const textarea = page.locator('textarea[placeholder*="What\'s happening"]');
    const finalPost = `FINAL VALIDATION POST ${new Date().toISOString()} - This post validates: 10k limit, progressive counter, real API, real database, zero mocks!`;
    await textarea.fill(finalPost);
    console.log('✓ Content typed');

    // Clear network logs
    networkRequests = [];
    networkResponses = [];

    // Step 3: Submit
    const quickPostButton = page.locator('button').filter({ hasText: 'Quick Post' });
    await quickPostButton.click();
    await page.waitForTimeout(2000);
    console.log('✓ Post submitted');

    // Step 4: Verify API call
    const apiRequest = networkRequests.find(req =>
      req.url.includes('/api/v1/agent-posts') && req.method === 'POST'
    );
    expect(apiRequest).toBeDefined();
    console.log('✓ API request verified');

    // Step 5: Verify response
    const apiResponse = networkResponses.find(res =>
      res.url.includes('/api/v1/agent-posts') && res.status === 201
    );
    expect(apiResponse).toBeDefined();
    expect(apiResponse?.body?.id).toBeDefined();
    console.log('✓ API response verified, Post ID:', apiResponse?.body?.id);

    // Step 6: Verify database
    const dbPost = verifyDatabase(finalPost);
    expect(dbPost).toBeDefined();
    expect(dbPost.content).toBe(finalPost);
    console.log('✓ Database verified');

    // Step 7: Verify feed
    const postInFeed = page.locator(`text="${finalPost}"`).first();
    await expect(postInFeed).toBeVisible({ timeout: 5000 });
    console.log('✓ Feed verified');

    // Final screenshot
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '09-final-integration.png'),
      fullPage: true
    });
    console.log('✓ Final screenshot saved');

    console.log('\n=== VALIDATION COMPLETE ===');
    console.log('✓ All tests passed with ZERO MOCKS');
    console.log('✓ Real browser interaction');
    console.log('✓ Real API calls');
    console.log('✓ Real database storage');
    console.log('✓ Real feed rendering');
  });
});
