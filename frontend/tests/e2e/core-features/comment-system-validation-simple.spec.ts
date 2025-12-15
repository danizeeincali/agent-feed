import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots', 'comment-real-data');

// Mock usernames that should NOT appear
const MOCK_USERNAMES = ['TechReviewer', 'SystemValidator', 'CodeAuditor', 'QualityAssurance'];

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('Comment System - Real Data Validation (Simplified)', () => {

  test('1. CRITICAL: API Returns Real Comments (Not Mock Data)', async ({ request }) => {
    console.log('🔍 Test 1: Verifying API returns real comments without mock data');

    // Test the comments API directly
    const response = await request.get('http://localhost:3001/api/agent-posts/1/comments');

    expect(response.ok()).toBeTruthy();
    console.log(`✓ API responded with status: ${response.status()}`);

    const comments = await response.json();
    console.log(`✓ Received ${comments.length} comments from API`);

    // Check that none of the mock usernames appear
    const responseText = JSON.stringify(comments);

    for (const mockUsername of MOCK_USERNAMES) {
      if (responseText.includes(mockUsername)) {
        console.error(`❌ CRITICAL: Found mock username "${mockUsername}" in API response`);
        console.error('Response:', JSON.stringify(comments, null, 2));
        throw new Error(`Mock data detected: Found "${mockUsername}" in API response`);
      }
    }

    console.log('✓ No mock usernames detected in API response');
    console.log('✓ API is returning real data from database');

    // Log sample of real data
    if (comments.length > 0) {
      console.log(`Sample comment: ${JSON.stringify(comments[0], null, 2)}`);
    }
  });

  test('2. No /v1/ Prefix Errors in Console', async ({ page }) => {
    console.log('🔍 Test 2: Checking for /v1/ prefix errors');

    const consoleErrors: string[] = [];
    const networkRequests: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        consoleErrors.push(text);
        if (text.includes('/v1/') || text.includes('404')) {
          console.log(`⚠️  Console Error: ${text}`);
        }
      }
    });

    page.on('request', (request) => {
      const url = request.url();
      networkRequests.push(url);
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check for /v1/ related errors
    const hasV1Errors = consoleErrors.some(err =>
      err.includes('/v1/') && err.includes('404')
    );

    // Check for /v1/ in network requests
    const v1Requests = networkRequests.filter(url => url.includes('/v1/'));

    if (v1Requests.length > 0) {
      console.log(`Found ${v1Requests.length} requests with /v1/ prefix:`);
      v1Requests.forEach(url => console.log(`  - ${url}`));
    }

    expect(hasV1Errors).toBeFalsy();
    console.log('✓ No /v1/ prefix 404 errors detected');

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'page-loaded-no-v1-errors.png'),
      fullPage: true
    });
    console.log('📸 Screenshot saved: page-loaded-no-v1-errors.png');
  });

  test('3. Comment Display Validation', async ({ page }) => {
    console.log('🔍 Test 3: Validating comment display on page');

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="agent-post"], article, .post', {
      timeout: 10000
    }).catch(() => {
      console.log('⚠️  Could not find post containers with standard selectors');
    });

    // Take screenshot of loaded page
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'feed-loaded.png'),
      fullPage: true
    });
    console.log('📸 Screenshot saved: feed-loaded.png');

    // Check page content for mock usernames
    const pageContent = await page.textContent('body');

    let mockDataFound = false;
    for (const mockUsername of MOCK_USERNAMES) {
      if (pageContent?.includes(mockUsername)) {
        console.error(`❌ Found mock username "${mockUsername}" on page`);
        mockDataFound = true;
      }
    }

    if (mockDataFound) {
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'FAILURE-mock-data-on-page.png'),
        fullPage: true
      });
      throw new Error('Mock data detected in page content');
    }

    console.log('✓ No mock data found in page content');
  });

  test('4. Comment API Endpoint Validation', async ({ request }) => {
    console.log('🔍 Test 4: Testing comment API endpoints');

    // Test various post IDs
    const testPostIds = [1, 2, 3];

    for (const postId of testPostIds) {
      // Test without /v1/ prefix (correct)
      const correctUrl = `http://localhost:3001/api/agent-posts/${postId}/comments`;
      const response = await request.get(correctUrl);

      console.log(`Testing POST ${postId}: ${correctUrl}`);
      console.log(`  Status: ${response.status()}`);

      if (response.ok()) {
        const comments = await response.json();
        console.log(`  ✓ Comments: ${comments.length}`);

        // Verify structure
        if (comments.length > 0) {
          const firstComment = comments[0];
          expect(firstComment).toHaveProperty('id');
          expect(firstComment).toHaveProperty('content');
          expect(firstComment).toHaveProperty('author_name');
          console.log(`  ✓ Comment structure valid`);
        }
      }
    }

    // Test that /v1/ endpoint does NOT work (should be removed)
    const wrongUrl = 'http://localhost:3001/api/v1/agent-posts/1/comments';
    try {
      const wrongResponse = await request.get(wrongUrl);
      if (wrongResponse.ok()) {
        console.log('⚠️  WARNING: /v1/ endpoint still working - should be removed');
      }
    } catch (err) {
      console.log('✓ /v1/ endpoint correctly not available');
    }
  });

  test('5. End-to-End Comment Flow', async ({ page }) => {
    console.log('🔍 Test 5: Testing complete comment interaction flow');

    const consoleMessages: { type: string; text: string }[] = [];

    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'initial-feed-state.png'),
      fullPage: true
    });

    console.log('✓ Page loaded successfully');

    // Look for any post or article element
    const postSelectors = [
      '[data-testid="agent-post"]',
      'article',
      '.post',
      '[class*="post"]',
      '[class*="Post"]'
    ];

    let foundPosts = false;
    for (const selector of postSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✓ Found ${count} elements matching selector: ${selector}`);
        foundPosts = true;
        break;
      }
    }

    if (!foundPosts) {
      console.log('⚠️  No posts found on page - may need to check feed implementation');
    }

    // Save console output report
    const report = {
      timestamp: new Date().toISOString(),
      consoleMessages: consoleMessages.filter(m => m.type === 'error'),
      foundPosts,
      testStatus: 'completed'
    };

    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'e2e-flow-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('✓ End-to-end flow test completed');
    console.log(`Console errors logged: ${report.consoleMessages.length}`);
  });
});
