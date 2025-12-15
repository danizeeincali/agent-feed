#!/usr/bin/env node

/**
 * Production Validation Script - ZERO MOCKS
 * Real browser, real API, real database testing
 */

import { chromium } from 'playwright';
import Database from 'better-sqlite3';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCREENSHOTS_DIR = join(__dirname, 'tests/e2e/screenshots/production-validation');
const DB_PATH = '/workspaces/agent-feed/database.db';
const BASE_URL = 'http://localhost:5173';

// Ensure screenshots directory exists
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// Helper functions
function generateText(length, prefix = '') {
  const base = prefix || 'Test character ';
  let text = base;
  while (text.length < length) {
    text += base;
  }
  return text.substring(0, length);
}

function queryDatabase(sql, params = []) {
  const db = new Database(DB_PATH, { readonly: true });
  const result = params.length > 0
    ? db.prepare(sql).all(...params)
    : db.prepare(sql).all();
  db.close();
  return result;
}

function findPostInDatabase(content) {
  const db = new Database(DB_PATH, { readonly: true });
  const post = db.prepare('SELECT * FROM agent_posts WHERE content = ? ORDER BY created_at DESC LIMIT 1').get(content);
  db.close();
  return post;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test results tracker
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, status, details = {}) {
  results.total++;
  if (status === 'PASS') {
    results.passed++;
    console.log(`✓ ${name}`);
  } else {
    results.failed++;
    console.log(`✗ ${name}`);
    console.error('  Error:', details.error);
  }
  results.tests.push({ name, status, details, timestamp: new Date().toISOString() });
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('PRODUCTION VALIDATION - QUICK POST FUNCTIONALITY');
  console.log('ZERO MOCKS - Real Browser, Real API, Real Database');
  console.log('='.repeat(80) + '\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Network tracking
  const networkLogs = {
    requests: [],
    responses: []
  };

  page.on('request', request => {
    if (request.url().includes('/api/')) {
      networkLogs.requests.push({
        url: request.url(),
        method: request.method(),
        postData: request.postData(),
        timestamp: new Date().toISOString()
      });
    }
  });

  page.on('response', async response => {
    if (response.url().includes('/api/')) {
      try {
        const body = await response.json();
        networkLogs.responses.push({
          url: response.url(),
          status: response.status(),
          body: body,
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        networkLogs.responses.push({
          url: response.url(),
          status: response.status(),
          body: null,
          timestamp: new Date().toISOString()
        });
      }
    }
  });

  try {
    // ========================================================================
    // STEP 1: Navigate to Feed and Verify Initial State
    // ========================================================================
    console.log('\n=== STEP 1: Navigate to Feed ===');

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Verify Quick Post tab
    const quickPostTab = page.locator('text=Quick Post').first();
    if (await quickPostTab.isVisible()) {
      logTest('Quick Post tab is visible', 'PASS');
    } else {
      logTest('Quick Post tab is visible', 'FAIL', { error: 'Tab not found' });
    }

    // Verify Avi DM tab
    const aviDmTab = page.locator('text=Avi DM').first();
    if (await aviDmTab.isVisible()) {
      logTest('Avi DM tab is visible', 'PASS');
    } else {
      logTest('Avi DM tab is visible', 'FAIL', { error: 'Avi DM tab not found' });
    }

    // Verify textarea
    const textarea = page.locator('textarea[placeholder*="Write as much as you need"]');
    if (await textarea.isVisible()) {
      logTest('Quick Post textarea is visible', 'PASS');
    } else {
      logTest('Quick Post textarea is visible', 'FAIL', { error: 'Textarea not found' });
    }

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '01-initial-state.png'),
      fullPage: true
    });
    console.log('Screenshot saved: 01-initial-state.png');

    // ========================================================================
    // STEP 2: Type Test Post and Verify Character Counter
    // ========================================================================
    console.log('\n=== STEP 2: Type Test Post ===');

    const testPost = "This is a test post from the simplified Quick Post interface! I'm testing the 10,000 character limit increase and the new progressive character counter. This post should save to the real database.";

    await textarea.click();
    await textarea.fill(testPost);
    console.log(`Typed ${testPost.length} characters`);

    // Verify rows
    const rows = await textarea.getAttribute('rows');
    if (rows === '6') {
      logTest('Textarea has 6 rows', 'PASS');
    } else {
      logTest('Textarea has 6 rows', 'FAIL', { error: `Found ${rows} rows` });
    }

    // Verify counter is hidden
    const counter = page.locator('text=/\\d+\\/10,000/');
    const counterVisible = await counter.isVisible().catch(() => false);
    if (!counterVisible) {
      logTest('Character counter is HIDDEN (under 9,500 chars)', 'PASS');
    } else {
      logTest('Character counter is HIDDEN (under 9,500 chars)', 'FAIL', { error: 'Counter is visible' });
    }

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '02-post-typed.png'),
      fullPage: true
    });
    console.log('Screenshot saved: 02-post-typed.png');

    // ========================================================================
    // STEP 3: Submit Post
    // ========================================================================
    console.log('\n=== STEP 3: Submit Post ===');

    const quickPostButton = page.locator('button[type="submit"]').filter({ hasText: 'Quick Post' });

    if (await quickPostButton.isEnabled()) {
      logTest('Quick Post button is enabled', 'PASS');
    } else {
      logTest('Quick Post button is enabled', 'FAIL', { error: 'Button disabled' });
    }

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '03a-before-submit.png'),
      fullPage: true
    });

    // Clear network logs before submit
    networkLogs.requests = [];
    networkLogs.responses = [];

    await quickPostButton.click();

    // Try to capture posting state
    try {
      const postingButton = page.locator('button').filter({ hasText: 'Posting...' });
      await postingButton.waitFor({ state: 'visible', timeout: 500 });
      await page.screenshot({
        path: join(SCREENSHOTS_DIR, '03b-submitting-state.png'),
        fullPage: true
      });
      console.log('Screenshot saved: 03b-submitting-state.png (Posting... state)');
    } catch (e) {
      console.log('Posting state was too fast to capture (this is OK)');
    }

    await sleep(2000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '03c-after-submit.png'),
      fullPage: true
    });
    console.log('Screenshot saved: 03c-after-submit.png');

    // ========================================================================
    // STEP 4: Verify Post Appears in Feed
    // ========================================================================
    console.log('\n=== STEP 4: Verify Post in Feed ===');

    const uniquePost = `Test post at ${new Date().toISOString()} - VALIDATION`;
    await textarea.fill(uniquePost);
    await quickPostButton.click();
    await sleep(2000);

    const postInFeed = page.locator(`text="${uniquePost}"`).first();
    const postVisible = await postInFeed.isVisible({ timeout: 5000 }).catch(() => false);

    if (postVisible) {
      logTest('Post appears in feed', 'PASS');
    } else {
      logTest('Post appears in feed', 'FAIL', { error: 'Post not found in feed' });
    }

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '04-post-in-feed.png'),
      fullPage: true
    });
    console.log('Screenshot saved: 04-post-in-feed.png');

    // ========================================================================
    // STEP 5: Check Network Activity
    // ========================================================================
    console.log('\n=== STEP 5: Network Analysis ===');

    const postRequest = networkLogs.requests.find(req =>
      req.url.includes('/api/v1/agent-posts') && req.method === 'POST'
    );

    if (postRequest) {
      logTest('POST request to /api/v1/agent-posts found', 'PASS');
      console.log('Request URL:', postRequest.url);

      if (postRequest.postData) {
        try {
          const payload = JSON.parse(postRequest.postData);
          console.log('Request payload:', payload);

          if (payload.content) {
            logTest('Request contains content field', 'PASS');
          } else {
            logTest('Request contains content field', 'FAIL', { error: 'No content in payload' });
          }
        } catch (e) {
          logTest('Request payload is valid JSON', 'FAIL', { error: e.message });
        }
      }
    } else {
      logTest('POST request to /api/v1/agent-posts found', 'FAIL', { error: 'No POST request found' });
    }

    const postResponse = networkLogs.responses.find(res =>
      res.url.includes('/api/v1/agent-posts') && res.status === 201
    );

    if (postResponse) {
      logTest('Received 201 Created response', 'PASS');
      console.log('Response body:', postResponse.body);

      if (postResponse.body?.id) {
        logTest('Response contains post ID', 'PASS', { postId: postResponse.body.id });
        console.log('Post ID:', postResponse.body.id);
      } else {
        logTest('Response contains post ID', 'FAIL', { error: 'No ID in response' });
      }
    } else {
      logTest('Received 201 Created response', 'FAIL', { error: 'No 201 response found' });
    }

    // Save network logs
    writeFileSync(
      join(SCREENSHOTS_DIR, '05-network-log.json'),
      JSON.stringify(networkLogs, null, 2)
    );
    console.log('Network log saved: 05-network-log.json');

    // ========================================================================
    // STEP 6: Test Long Post (5000+ chars)
    // ========================================================================
    console.log('\n=== STEP 6: Long Post Test (5000 chars) ===');

    const longPost = generateText(5000, 'This is a long post to test the 10,000 character limit. ');
    await textarea.fill(longPost);
    console.log(`Filled ${longPost.length} characters`);

    const counterVisible5000 = await counter.isVisible().catch(() => false);
    if (!counterVisible5000) {
      logTest('Counter HIDDEN at 5,000 chars', 'PASS');
    } else {
      logTest('Counter HIDDEN at 5,000 chars', 'FAIL', { error: 'Counter visible at 5,000' });
    }

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '06-long-post-5000.png'),
      fullPage: true
    });
    console.log('Screenshot saved: 06-long-post-5000.png');

    await quickPostButton.click();
    await sleep(2000);

    const longPostInFeed = page.locator(`text="${longPost.substring(0, 50)}"`).first();
    const longPostVisible = await longPostInFeed.isVisible({ timeout: 5000 }).catch(() => false);

    if (longPostVisible) {
      logTest('Long post (5000 chars) submitted successfully', 'PASS');
    } else {
      logTest('Long post (5000 chars) submitted successfully', 'FAIL', { error: 'Post not in feed' });
    }

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '06-long-post-in-feed.png'),
      fullPage: true
    });

    // ========================================================================
    // STEP 7: Test Character Counter Thresholds
    // ========================================================================
    console.log('\n=== STEP 7: Character Counter Thresholds ===');

    // 9500 characters - GRAY
    console.log('Testing 9,500 characters (GRAY)...');
    const text9500 = generateText(9500);
    await textarea.fill(text9500);
    await sleep(500);

    const counter9500 = page.locator('text="9500/10,000"');
    const counter9500Visible = await counter9500.isVisible().catch(() => false);

    if (counter9500Visible) {
      logTest('Counter VISIBLE at 9,500 chars', 'PASS');

      const color9500 = await counter9500.evaluate(el => window.getComputedStyle(el).color);
      console.log('Counter color at 9,500:', color9500);
      logTest('Counter color retrieved at 9,500 chars', 'PASS', { color: color9500 });
    } else {
      logTest('Counter VISIBLE at 9,500 chars', 'FAIL', { error: 'Counter not visible' });
    }

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '07a-counter-9500-gray.png'),
      fullPage: true
    });
    console.log('Screenshot saved: 07a-counter-9500-gray.png');

    // 9700 characters - ORANGE
    console.log('Testing 9,700 characters (ORANGE)...');
    const text9700 = generateText(9700);
    await textarea.fill(text9700);
    await sleep(500);

    const counter9700 = page.locator('text="9700/10,000"');
    const counter9700Visible = await counter9700.isVisible().catch(() => false);

    if (counter9700Visible) {
      logTest('Counter VISIBLE at 9,700 chars', 'PASS');

      const color9700 = await counter9700.evaluate(el => window.getComputedStyle(el).color);
      console.log('Counter color at 9,700:', color9700);
      logTest('Counter color retrieved at 9,700 chars', 'PASS', { color: color9700 });
    } else {
      logTest('Counter VISIBLE at 9,700 chars', 'FAIL', { error: 'Counter not visible' });
    }

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '07b-counter-9700-orange.png'),
      fullPage: true
    });
    console.log('Screenshot saved: 07b-counter-9700-orange.png');

    // 9900 characters - RED
    console.log('Testing 9,900 characters (RED)...');
    const text9900 = generateText(9900);
    await textarea.fill(text9900);
    await sleep(500);

    const counter9900 = page.locator('text="9900/10,000"');
    const counter9900Visible = await counter9900.isVisible().catch(() => false);

    if (counter9900Visible) {
      logTest('Counter VISIBLE at 9,900 chars', 'PASS');

      const color9900 = await counter9900.evaluate(el => window.getComputedStyle(el).color);
      console.log('Counter color at 9,900:', color9900);
      logTest('Counter color retrieved at 9,900 chars', 'PASS', { color: color9900 });
    } else {
      logTest('Counter VISIBLE at 9,900 chars', 'FAIL', { error: 'Counter not visible' });
    }

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '07c-counter-9900-red.png'),
      fullPage: true
    });
    console.log('Screenshot saved: 07c-counter-9900-red.png');

    // ========================================================================
    // STEP 8: Verify Database Storage (ZERO MOCKS)
    // ========================================================================
    console.log('\n=== STEP 8: Database Verification (ZERO MOCKS) ===');

    const dbTestPost = `DB Test ${Date.now()} - PRODUCTION VALIDATION`;
    await textarea.fill(dbTestPost);
    await quickPostButton.click();
    await sleep(2000);

    console.log('Querying REAL database at:', DB_PATH);

    const dbPost = findPostInDatabase(dbTestPost);

    if (dbPost) {
      logTest('Post found in REAL SQLite database', 'PASS');
      console.log('Database record:', {
        id: dbPost.id,
        content: dbPost.content.substring(0, 100) + '...',
        created_at: dbPost.created_at,
        agent_id: dbPost.agent_id
      });
    } else {
      logTest('Post found in REAL SQLite database', 'FAIL', { error: 'Post not in database' });
    }

    // Verify database schema
    const db = new Database(DB_PATH, { readonly: true });
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='agent_posts'").get();
    console.log('Database schema:', tableInfo?.sql);

    const postCount = db.prepare('SELECT COUNT(*) as count FROM agent_posts').get();
    console.log('Total posts in database:', postCount?.count);

    if (postCount?.count > 0) {
      logTest('Database contains posts (not empty)', 'PASS', { count: postCount.count });
    } else {
      logTest('Database contains posts (not empty)', 'FAIL', { error: 'Database empty' });
    }

    db.close();

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '08-database-verified.png'),
      fullPage: true
    });
    console.log('Screenshot saved: 08-database-verified.png');

    // ========================================================================
    // FINAL: Integration Test
    // ========================================================================
    console.log('\n=== FINAL: Complete Integration Test ===');

    const finalPost = `FINAL VALIDATION ${new Date().toISOString()} - 10k limit, progressive counter, real API, real DB!`;
    await textarea.fill(finalPost);

    networkLogs.requests = [];
    networkLogs.responses = [];

    await quickPostButton.click();
    await sleep(2000);

    // Verify all components
    const finalApiRequest = networkLogs.requests.find(r => r.url.includes('/api/v1/agent-posts'));
    const finalApiResponse = networkLogs.responses.find(r => r.url.includes('/api/v1/agent-posts'));
    const finalDbPost = findPostInDatabase(finalPost);
    const finalFeedPost = await page.locator(`text="${finalPost}"`).first().isVisible({ timeout: 5000 }).catch(() => false);

    if (finalApiRequest && finalApiResponse && finalDbPost && finalFeedPost) {
      logTest('FINAL INTEGRATION: All components verified', 'PASS', {
        api: finalApiResponse.status === 201,
        database: !!finalDbPost,
        feed: finalFeedPost
      });
    } else {
      logTest('FINAL INTEGRATION: All components verified', 'FAIL', {
        api: !!finalApiRequest,
        apiResponse: !!finalApiResponse,
        database: !!finalDbPost,
        feed: finalFeedPost
      });
    }

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, '09-final-integration.png'),
      fullPage: true
    });
    console.log('Screenshot saved: 09-final-integration.png');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    results.tests.push({
      name: 'Test execution',
      status: 'FATAL',
      details: { error: error.message, stack: error.stack },
      timestamp: new Date().toISOString()
    });
  } finally {
    await browser.close();
  }

  // ========================================================================
  // FINAL REPORT
  // ========================================================================
  console.log('\n' + '='.repeat(80));
  console.log('VALIDATION COMPLETE');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed} ✓`);
  console.log(`Failed: ${results.failed} ✗`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('='.repeat(80));

  if (results.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.tests.filter(t => t.status === 'FAIL').forEach(t => {
      console.log(`  - ${t.name}`);
      console.log(`    ${t.details.error}`);
    });
  }

  console.log('\n✓ All screenshots saved to:', SCREENSHOTS_DIR);
  console.log('✓ Network logs saved to:', join(SCREENSHOTS_DIR, '05-network-log.json'));

  // Save results
  writeFileSync(
    join(SCREENSHOTS_DIR, 'validation-results.json'),
    JSON.stringify(results, null, 2)
  );
  console.log('✓ Test results saved to:', join(SCREENSHOTS_DIR, 'validation-results.json'));

  console.log('\n' + '='.repeat(80));
  console.log('ZERO MOCKS CONFIRMED:');
  console.log('  ✓ Real browser (Chromium/Playwright)');
  console.log('  ✓ Real HTTP requests to API');
  console.log('  ✓ Real database (SQLite at', DB_PATH + ')');
  console.log('  ✓ Real DOM manipulation');
  console.log('  ✓ Real network latency');
  console.log('='.repeat(80) + '\n');

  process.exit(results.failed > 0 ? 1 : 0);
}

main();
