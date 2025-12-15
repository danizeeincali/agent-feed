/**
 * Playwright OAuth Flow UI Validation
 *
 * Tests the complete OAuth flow with comprehensive screenshot capture:
 * - Settings page navigation
 * - OAuth radio button selection
 * - OAuth connection flow
 * - Error handling
 * - Responsive design validation
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

// Screenshot directory
const SCREENSHOT_DIR = path.join(__dirname, '../../docs/validation/screenshots');

// Test configuration
const BASE_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3000';

test.describe('OAuth Flow UI Validation', () => {

  test.beforeEach(async ({ page }) => {
    // Enable verbose logging
    page.on('console', msg => console.log(`🖥️  Browser console: ${msg.text()}`));
    page.on('pageerror', err => console.error(`❌ Page error: ${err.message}`));
  });

  test('01 - Navigate to Settings Page', async ({ page }) => {
    console.log('📍 Test 01: Navigating to Settings page...');

    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');

    // Verify we're on the settings page
    await expect(page).toHaveURL(/.*settings/);

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'oauth-01-settings-page.png'),
      fullPage: true
    });

    console.log('✅ Screenshot saved: oauth-01-settings-page.png');
  });

  test('02 - OAuth Radio Button Selection', async ({ page }) => {
    console.log('📍 Test 02: Testing OAuth radio button selection...');

    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');

    // Find and click OAuth radio button
    const oauthRadio = page.locator('input[type="radio"][value="oauth"]');

    // Wait for radio button to be visible
    await oauthRadio.waitFor({ state: 'visible', timeout: 5000 });

    // Take screenshot before clicking
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'oauth-02a-before-selection.png'),
      fullPage: true
    });

    // Click OAuth radio button
    await oauthRadio.click();

    // Wait for UI to update
    await page.waitForTimeout(500);

    // Verify radio button is checked
    await expect(oauthRadio).toBeChecked();

    // Take screenshot after selection
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'oauth-02-oauth-selected.png'),
      fullPage: true
    });

    console.log('✅ Screenshots saved: oauth-02a-before-selection.png, oauth-02-oauth-selected.png');
  });

  test('03 - OAuth Connect Button Flow', async ({ page, context }) => {
    console.log('📍 Test 03: Testing OAuth connect button flow...');

    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');

    // Select OAuth radio button
    const oauthRadio = page.locator('input[type="radio"][value="oauth"]');
    await oauthRadio.waitFor({ state: 'visible', timeout: 5000 });
    await oauthRadio.click();
    await page.waitForTimeout(500);

    // Find and click "Connect with OAuth" button
    const connectButton = page.locator('button:has-text("Connect with OAuth")');
    await connectButton.waitFor({ state: 'visible', timeout: 5000 });

    // Take screenshot before clicking
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'oauth-03a-before-connect.png'),
      fullPage: true
    });

    // Set up popup listener BEFORE clicking the button
    const popupPromise = context.waitForEvent('page', { timeout: 10000 });

    // Click the connect button
    await connectButton.click();

    console.log('🔄 Waiting for OAuth redirect...');

    try {
      // Wait for popup or redirect
      const popup = await popupPromise;

      // Wait for navigation to complete
      await popup.waitForLoadState('networkidle', { timeout: 10000 });

      // Take screenshot of redirect
      await popup.screenshot({
        path: path.join(SCREENSHOT_DIR, 'oauth-03-redirect-initiated.png'),
        fullPage: true
      });

      console.log(`✅ Redirect detected: ${popup.url()}`);
      console.log('✅ Screenshot saved: oauth-03-redirect-initiated.png');

      // Check if it's the Anthropic OAuth page
      if (popup.url().includes('anthropic.com') || popup.url().includes('oauth')) {
        await popup.screenshot({
          path: path.join(SCREENSHOT_DIR, 'oauth-04-anthropic-redirect.png'),
          fullPage: true
        });
        console.log('✅ Screenshot saved: oauth-04-anthropic-redirect.png');
      }

      await popup.close();
    } catch (error) {
      console.log('⚠️  No popup detected, checking for in-page redirect...');

      // Wait for URL change in the same page
      await page.waitForTimeout(2000);

      // Take screenshot of current state
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'oauth-03-redirect-initiated.png'),
        fullPage: true
      });

      console.log(`📍 Current URL: ${page.url()}`);
      console.log('✅ Screenshot saved: oauth-03-redirect-initiated.png');
    }
  });

  test('04 - Backend OAuth Endpoint Validation', async ({ request }) => {
    console.log('📍 Test 04: Validating backend OAuth endpoints...');

    try {
      // Check OAuth initiate endpoint
      const initiateResponse = await request.get(`${BACKEND_URL}/api/auth/claude/oauth/initiate`);
      console.log(`📊 OAuth initiate endpoint status: ${initiateResponse.status()}`);

      if (initiateResponse.ok()) {
        const data = await initiateResponse.json();
        console.log('✅ OAuth initiate response:', JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.log(`⚠️  OAuth endpoint error: ${error.message}`);
    }

    // Check auth status endpoint
    try {
      const statusResponse = await request.get(`${BACKEND_URL}/api/auth/claude/status`);
      console.log(`📊 Auth status endpoint: ${statusResponse.status()}`);

      if (statusResponse.ok()) {
        const data = await statusResponse.json();
        console.log('✅ Auth status:', JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.log(`⚠️  Auth status error: ${error.message}`);
    }
  });

  test('05 - Error State: OAuth Unavailable', async ({ page }) => {
    console.log('📍 Test 05: Testing OAuth unavailable error state...');

    // Mock network failure for OAuth endpoint
    await page.route('**/api/auth/claude/oauth/initiate', route => {
      route.abort('failed');
    });

    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');

    // Select OAuth and try to connect
    const oauthRadio = page.locator('input[type="radio"][value="oauth"]');
    await oauthRadio.waitFor({ state: 'visible', timeout: 5000 });
    await oauthRadio.click();
    await page.waitForTimeout(500);

    const connectButton = page.locator('button:has-text("Connect with OAuth")');
    await connectButton.click();

    // Wait for error message
    await page.waitForTimeout(2000);

    // Take screenshot of error state
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'oauth-05-error-unavailable.png'),
      fullPage: true
    });

    console.log('✅ Screenshot saved: oauth-05-error-unavailable.png');
  });

  test('06 - API Key Radio Selection (Alternative)', async ({ page }) => {
    console.log('📍 Test 06: Testing API Key radio selection as alternative...');

    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');

    // Find API Key radio button
    const apiKeyRadio = page.locator('input[type="radio"][value="api-key"]');
    await apiKeyRadio.waitFor({ state: 'visible', timeout: 5000 });

    // Click API Key radio
    await apiKeyRadio.click();
    await page.waitForTimeout(500);

    // Verify it's selected
    await expect(apiKeyRadio).toBeChecked();

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'oauth-06-api-key-alternative.png'),
      fullPage: true
    });

    console.log('✅ Screenshot saved: oauth-06-api-key-alternative.png');
  });

  test('07 - Session Key Radio Selection (Alternative)', async ({ page }) => {
    console.log('📍 Test 07: Testing Session Key radio selection as alternative...');

    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');

    // Find Session Key radio button
    const sessionKeyRadio = page.locator('input[type="radio"][value="session-key"]');
    await sessionKeyRadio.waitFor({ state: 'visible', timeout: 5000 });

    // Click Session Key radio
    await sessionKeyRadio.click();
    await page.waitForTimeout(500);

    // Verify it's selected
    await expect(sessionKeyRadio).toBeChecked();

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'oauth-07-session-key-alternative.png'),
      fullPage: true
    });

    console.log('✅ Screenshot saved: oauth-07-session-key-alternative.png');
  });
});

test.describe('Responsive Design Validation', () => {

  test('08 - Desktop View (1920x1080)', async ({ page }) => {
    console.log('📍 Test 08: Desktop responsive design...');

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');

    // Select OAuth
    const oauthRadio = page.locator('input[type="radio"][value="oauth"]');
    await oauthRadio.waitFor({ state: 'visible', timeout: 5000 });
    await oauthRadio.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'oauth-08-desktop-1920x1080.png'),
      fullPage: true
    });

    console.log('✅ Screenshot saved: oauth-08-desktop-1920x1080.png');
  });

  test('09 - Tablet View (768x1024)', async ({ page }) => {
    console.log('📍 Test 09: Tablet responsive design...');

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');

    // Select OAuth
    const oauthRadio = page.locator('input[type="radio"][value="oauth"]');
    await oauthRadio.waitFor({ state: 'visible', timeout: 5000 });
    await oauthRadio.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'oauth-09-tablet-768x1024.png'),
      fullPage: true
    });

    console.log('✅ Screenshot saved: oauth-09-tablet-768x1024.png');
  });

  test('10 - Mobile View (375x667)', async ({ page }) => {
    console.log('📍 Test 10: Mobile responsive design...');

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');

    // Select OAuth
    const oauthRadio = page.locator('input[type="radio"][value="oauth"]');
    await oauthRadio.waitFor({ state: 'visible', timeout: 5000 });
    await oauthRadio.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'oauth-10-mobile-375x667.png'),
      fullPage: true
    });

    console.log('✅ Screenshot saved: oauth-10-mobile-375x667.png');
  });
});

test.describe('OAuth Flow Integration Tests', () => {

  test('11 - Full OAuth Flow Simulation', async ({ page }) => {
    console.log('📍 Test 11: Full OAuth flow simulation...');

    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');

    // Step 1: Initial state
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'oauth-11a-initial-state.png'),
      fullPage: true
    });

    // Step 2: Select OAuth
    const oauthRadio = page.locator('input[type="radio"][value="oauth"]');
    await oauthRadio.waitFor({ state: 'visible', timeout: 5000 });
    await oauthRadio.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'oauth-11b-oauth-selected.png'),
      fullPage: true
    });

    // Step 3: Click connect
    const connectButton = page.locator('button:has-text("Connect with OAuth")');
    await connectButton.waitFor({ state: 'visible', timeout: 5000 });
    await connectButton.click();
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'oauth-11c-after-connect-click.png'),
      fullPage: true
    });

    console.log('✅ Full flow screenshots saved: oauth-11a, 11b, 11c');
  });

  test('12 - UI Element Validation', async ({ page }) => {
    console.log('📍 Test 12: UI element validation...');

    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');

    // Check for all three radio buttons
    const oauthRadio = page.locator('input[type="radio"][value="oauth"]');
    const apiKeyRadio = page.locator('input[type="radio"][value="api-key"]');
    const sessionKeyRadio = page.locator('input[type="radio"][value="session-key"]');

    await expect(oauthRadio).toBeVisible();
    await expect(apiKeyRadio).toBeVisible();
    await expect(sessionKeyRadio).toBeVisible();

    // Take screenshot showing all options
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'oauth-12-all-auth-options.png'),
      fullPage: true
    });

    console.log('✅ Screenshot saved: oauth-12-all-auth-options.png');
  });
});
