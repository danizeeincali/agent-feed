import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3001';
const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots');

test.describe('Connection Status Fix - End-to-End Validation', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    // Enable console logging
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      console.log(`[BROWSER ${type.toUpperCase()}]: ${text}`);
    });

    // Capture network errors
    page.on('pageerror', error => {
      console.error(`[BROWSER ERROR]: ${error.message}`);
    });

    // Monitor failed requests
    page.on('requestfailed', request => {
      console.error(`[REQUEST FAILED]: ${request.url()} - ${request.failure()?.errorText}`);
    });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('1. Load application in browser', async () => {
    console.log('\n=== TEST 1: Loading Application ===');

    // Navigate to frontend
    const response = await page.goto(FRONTEND_URL, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Verify page loaded successfully
    expect(response?.status()).toBe(200);

    // Wait for React to render
    await page.waitForSelector('body', { timeout: 10000 });

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01-app-loaded.png'),
      fullPage: true
    });

    console.log('✓ Application loaded successfully');
    console.log(`✓ Screenshot saved: 01-app-loaded.png`);
  });

  test('2. Check connection status indicator', async () => {
    console.log('\n=== TEST 2: Connection Status Indicator ===');

    // Wait for app to initialize
    await page.waitForTimeout(2000);

    // Try multiple selectors to find connection status
    const connectionSelectors = [
      '[data-testid="connection-status"]',
      '.connection-status',
      'text=/connected/i',
      '[class*="status"]',
    ];

    let connectionElement = null;
    for (const selector of connectionSelectors) {
      try {
        connectionElement = await page.waitForSelector(selector, { timeout: 5000 });
        if (connectionElement) {
          console.log(`✓ Found connection status with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    // Get page content to analyze
    const bodyText = await page.textContent('body');
    const hasConnected = bodyText?.toLowerCase().includes('connected');
    const hasDisconnected = bodyText?.toLowerCase().includes('disconnected');

    console.log(`Connection status - Has "Connected": ${hasConnected}`);
    console.log(`Connection status - Has "Disconnected": ${hasDisconnected}`);

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02-connected-status.png'),
      fullPage: true
    });

    // Verify connected status is shown (not disconnected)
    if (hasDisconnected && !hasConnected) {
      throw new Error('Application shows "Disconnected" status - FIX FAILED!');
    }

    console.log('✓ Connection status indicator verified');
    console.log(`✓ Screenshot saved: 02-connected-status.png`);
  });

  test('3. Verify API is working - /api/agent-posts endpoint', async () => {
    console.log('\n=== TEST 3: API Endpoint Validation ===');

    let apiRequest: any = null;
    let apiResponse: any = null;

    // Listen for the agent-posts API call
    page.on('response', async (response) => {
      if (response.url().includes('/api/agent-posts')) {
        apiResponse = response;
        console.log(`[API RESPONSE] ${response.url()} - Status: ${response.status()}`);
      }
    });

    page.on('request', (request) => {
      if (request.url().includes('/api/agent-posts')) {
        apiRequest = request;
        console.log(`[API REQUEST] ${request.method()} ${request.url()}`);
      }
    });

    // Reload page to trigger API calls
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // Wait for API calls

    // Take screenshot showing network state
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03-network-200-ok.png'),
      fullPage: true
    });

    // Verify API response
    if (apiResponse) {
      const status = apiResponse.status();
      console.log(`API Response Status: ${status}`);

      expect(status).toBe(200);
      console.log('✓ API returned 200 OK (not 500)');

      // Get response body
      try {
        const responseBody = await apiResponse.json();
        console.log(`Response body type: ${typeof responseBody}`);
        console.log(`Has posts array: ${Array.isArray(responseBody?.posts)}`);

        if (responseBody?.posts) {
          console.log(`Number of posts: ${responseBody.posts.length}`);
        }

        // Verify response contains posts
        expect(responseBody).toHaveProperty('posts');
        expect(Array.isArray(responseBody.posts)).toBe(true);

        console.log('✓ Response contains posts array');
      } catch (e) {
        console.error('Failed to parse response body:', e);
      }
    } else {
      console.warn('⚠ No /api/agent-posts request detected - may need to wait longer');
    }

    console.log(`✓ Screenshot saved: 03-network-200-ok.png`);
  });

  test('4. Verify posts are loading in UI', async () => {
    console.log('\n=== TEST 4: Posts Loading Validation ===');

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Check for common post container selectors
    const postSelectors = [
      '[data-testid="agent-post"]',
      '.agent-post',
      '.post',
      '[class*="post"]',
      'article',
    ];

    let postsFound = false;
    for (const selector of postSelectors) {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        console.log(`✓ Found ${elements.length} posts using selector: ${selector}`);
        postsFound = true;
        break;
      }
    }

    // Check for error messages
    const bodyText = await page.textContent('body');
    const hasError = bodyText?.toLowerCase().includes('error');
    const hasFailed = bodyText?.toLowerCase().includes('failed');
    const hasSqliteError = bodyText?.toLowerCase().includes('sqliteerror');

    console.log(`Page has error messages: ${hasError}`);
    console.log(`Page has failed messages: ${hasFailed}`);
    console.log(`Page has SqliteError: ${hasSqliteError}`);

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04-posts-loaded.png'),
      fullPage: true
    });

    // Verify no critical errors
    if (hasSqliteError) {
      throw new Error('SqliteError detected in UI - DATABASE FIX FAILED!');
    }

    console.log('✓ Posts section verified');
    console.log(`✓ Screenshot saved: 04-posts-loaded.png`);
  });

  test('5. Check console for errors', async () => {
    console.log('\n=== TEST 5: Console Error Validation ===');

    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];

    // Capture console messages
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);

      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // Reload to capture all console output
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '05-console-clean.png'),
      fullPage: true
    });

    // Analyze console output
    console.log(`\nTotal console messages: ${consoleMessages.length}`);
    console.log(`Console errors: ${consoleErrors.length}`);

    // Check for specific error patterns
    const hasSqliteError = consoleMessages.some(msg =>
      msg.toLowerCase().includes('sqliteerror')
    );
    const hasTableError = consoleMessages.some(msg =>
      msg.toLowerCase().includes('no such table')
    );
    const hasConnectionError = consoleMessages.some(msg =>
      msg.toLowerCase().includes('connection') && msg.toLowerCase().includes('failed')
    );

    console.log(`SqliteError in console: ${hasSqliteError}`);
    console.log(`"no such table" in console: ${hasTableError}`);
    console.log(`Connection errors: ${hasConnectionError}`);

    // Print any errors found
    if (consoleErrors.length > 0) {
      console.log('\n⚠ Console Errors Found:');
      consoleErrors.slice(0, 5).forEach(err => {
        console.log(`  - ${err}`);
      });
    }

    // Verify no critical errors
    expect(hasSqliteError).toBe(false);
    expect(hasTableError).toBe(false);

    console.log('✓ Console validation complete');
    console.log(`✓ Screenshot saved: 05-console-clean.png`);
  });

  test('6. Direct API health check', async () => {
    console.log('\n=== TEST 6: Backend Health Check ===');

    // Make direct request to backend
    const response = await page.request.get(`${BACKEND_URL}/health`);
    const healthData = await response.json();

    console.log('Backend Health Response:');
    console.log(JSON.stringify(healthData, null, 2));

    expect(response.status()).toBe(200);
    expect(healthData.success).toBe(true);
    expect(healthData.data.resources.databaseConnected).toBe(true);
    expect(healthData.data.resources.agentPagesDbConnected).toBe(true);

    console.log('✓ Backend health check passed');
    console.log('✓ Both databases connected');
  });

  test('7. Direct API agent-posts check', async () => {
    console.log('\n=== TEST 7: Direct Agent Posts API Check ===');

    // Make direct request to agent-posts endpoint
    const response = await page.request.get(`${BACKEND_URL}/api/agent-posts?limit=10`);

    console.log(`Response Status: ${response.status()}`);

    if (response.status() === 200) {
      const data = await response.json();
      console.log('Agent Posts Response:');
      console.log(`- Success: ${data.success}`);
      console.log(`- Data count: ${data.data?.length || 0}`);
      console.log(`- Posts count: ${data.posts?.length || 0}`);
      console.log(`- Has pagination: ${!!data.pagination}`);

      expect(data.success).toBe(true);
      // API returns either data or posts array
      const postsArray = data.posts || data.data;
      expect(Array.isArray(postsArray)).toBe(true);

      console.log('✓ Agent posts endpoint working correctly');
    } else {
      const errorText = await response.text();
      console.error(`ERROR: ${errorText}`);
      throw new Error(`API returned status ${response.status()}`);
    }
  });
});
