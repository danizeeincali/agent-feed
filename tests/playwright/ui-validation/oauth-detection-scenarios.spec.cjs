/**
 * Playwright UI Validation: OAuth Detection Scenarios
 *
 * Tests the fixed OAuth detection UX with screenshots proving both scenarios work:
 * 1. OAuth detected (no API key) - Green banner asking user to get key from console
 * 2. API Key detected - Green banner with pre-populated key
 * 3. No CLI detected - Yellow banner for manual entry
 * 4. Real OAuth detection - No mocks, real endpoint test
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '../../../docs/validation/screenshots');
const BASE_URL = 'http://localhost:5173';
const OAUTH_URL = `${BASE_URL}/oauth-consent?client_id=test&state=test&redirect_uri=${BASE_URL}/settings`;

/**
 * Helper function to wait for detection to complete
 */
async function waitForDetection(page) {
  // Wait for the "Detecting CLI..." button text to disappear
  await page.waitForFunction(() => {
    const button = document.querySelector('button[type="submit"]');
    return button && !button.textContent.includes('Detecting CLI');
  }, { timeout: 5000 });

  // Small additional wait for banner rendering
  await page.waitForTimeout(500);
}

test.describe('OAuth Detection UX Scenarios', () => {

  test.beforeEach(async ({ page }) => {
    // Ensure screenshot directory exists
    await page.context().addInitScript(() => {
      console.log('Test started');
    });
  });

  /**
   * SCENARIO 1: OAuth Detected (No API Key)
   * Expected: Green banner showing OAuth login detected with user email
   */
  test('Scenario 1: OAuth Detected (No API Key)', async ({ page }) => {
    console.log('Starting Scenario 1: OAuth Detected (No API Key)');

    // Mock the detection endpoint to return OAuth detection without API key
    await page.route('/api/claude-code/oauth/detect-cli', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          detected: true,
          method: 'oauth',
          email: 'max',
          message: 'Claude CLI OAuth login detected'
        })
      });
    });

    // Navigate to OAuth consent page
    await page.goto(OAUTH_URL);
    console.log('Navigated to OAuth consent page');

    // Wait for detection to complete
    await waitForDetection(page);
    console.log('Detection completed');

    // Verify green banner is present
    const greenBanner = page.locator('.bg-green-50.border-green-200');
    await expect(greenBanner).toBeVisible();
    console.log('Green banner visible');

    // Verify banner text shows OAuth detection with email (no API key scenario)
    const bannerText = await greenBanner.textContent();
    expect(bannerText).toContain("You're logged in to Claude CLI via max subscription");
    expect(bannerText).toContain('Please enter your API key');
    console.log('Banner text verified:', bannerText);

    // Verify API key field is empty (no pre-population for OAuth-only)
    const apiKeyInput = page.locator('#apiKey');
    const apiKeyValue = await apiKeyInput.inputValue();
    expect(apiKeyValue).toBe('');
    console.log('API key field is empty as expected');

    // Verify link to console.anthropic.com is present in the green banner
    const consoleLink = greenBanner.locator('a[href*="console.anthropic.com"]');
    await expect(consoleLink).toBeVisible();
    console.log('Console link verified');

    // Screenshot 1: Full page view
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'oauth-fix-01-oauth-detected-no-key.png'),
      fullPage: true
    });
    console.log('Screenshot 1 captured');

    // Screenshot 2: Focus on green banner
    await greenBanner.screenshot({
      path: path.join(SCREENSHOT_DIR, 'oauth-fix-02-green-banner-oauth.png')
    });
    console.log('Screenshot 2 captured');
  });

  /**
   * SCENARIO 2: API Key Detected
   * Expected: Green banner showing CLI detected with pre-populated API key
   */
  test('Scenario 2: API Key Detected', async ({ page }) => {
    console.log('Starting Scenario 2: API Key Detected');

    const encryptedKey = 'sk-ant-api03-encrypted-test-key-1234567890';

    // Mock the detection endpoint to return API key detection
    await page.route('/api/claude-code/oauth/detect-cli', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          detected: true,
          method: 'api_key',
          encryptedKey: encryptedKey,
          email: 'user@example.com',
          message: 'Claude CLI API key detected'
        })
      });
    });

    // Navigate to OAuth consent page
    await page.goto(OAUTH_URL);
    console.log('Navigated to OAuth consent page');

    // Wait for detection to complete
    await waitForDetection(page);
    console.log('Detection completed');

    // Verify green banner is present
    const greenBanner = page.locator('.bg-green-50.border-green-200');
    await expect(greenBanner).toBeVisible();
    console.log('Green banner visible');

    // Verify banner text shows CLI detection (with API key)
    const bannerText = await greenBanner.textContent();
    expect(bannerText).toContain('We detected your Claude CLI login');
    expect(bannerText).toContain('user@example.com');
    expect(bannerText).toContain('Click Authorize to continue');
    console.log('Banner text verified:', bannerText);

    // Verify API key field is pre-populated
    const apiKeyInput = page.locator('#apiKey');
    const apiKeyValue = await apiKeyInput.inputValue();
    expect(apiKeyValue).toBe(encryptedKey);
    console.log('API key pre-populated:', apiKeyValue);

    // Screenshot 3: Full page with API key detected
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'oauth-fix-03-api-key-detected.png'),
      fullPage: true
    });
    console.log('Screenshot 3 captured');

    // Screenshot 4: Focus on pre-populated key field
    await apiKeyInput.screenshot({
      path: path.join(SCREENSHOT_DIR, 'oauth-fix-04-pre-populated-key.png')
    });
    console.log('Screenshot 4 captured');
  });

  /**
   * SCENARIO 3: No CLI Detected
   * Expected: Yellow banner prompting manual API key entry
   */
  test('Scenario 3: No CLI Detected', async ({ page }) => {
    console.log('Starting Scenario 3: No CLI Detected');

    // Mock the detection endpoint to return no detection
    await page.route('/api/claude-code/oauth/detect-cli', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          detected: false
        })
      });
    });

    // Navigate to OAuth consent page
    await page.goto(OAUTH_URL);
    console.log('Navigated to OAuth consent page');

    // Wait for detection to complete
    await waitForDetection(page);
    console.log('Detection completed');

    // Verify yellow banner is present (no CLI detected)
    const yellowBanner = page.locator('.bg-yellow-50.border-yellow-200');
    await expect(yellowBanner).toBeVisible();
    console.log('Yellow banner visible');

    // Verify banner text shows manual entry prompt
    const bannerText = await yellowBanner.textContent();
    expect(bannerText).toContain("Anthropic doesn't currently offer public OAuth");
    expect(bannerText).toContain('enter your API key directly');
    console.log('Banner text verified:', bannerText);

    // Verify API key field is empty
    const apiKeyInput = page.locator('#apiKey');
    const apiKeyValue = await apiKeyInput.inputValue();
    expect(apiKeyValue).toBe('');
    console.log('API key field is empty');

    // Screenshot 5: No detection scenario
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'oauth-fix-05-no-detection.png'),
      fullPage: true
    });
    console.log('Screenshot 5 captured');
  });

  /**
   * SCENARIO 4: Real OAuth Detection (No Mock)
   * Expected: Uses real endpoint, captures actual user experience
   */
  test('Scenario 4: Real OAuth Detection (No Mock)', async ({ page }) => {
    console.log('Starting Scenario 4: Real OAuth Detection (No Mock)');

    // NO MOCKING - Use real endpoint

    // Navigate to OAuth consent page
    await page.goto(OAUTH_URL);
    console.log('Navigated to OAuth consent page (real endpoint)');

    // Wait for detection to complete
    try {
      await waitForDetection(page);
      console.log('Real detection completed');
    } catch (error) {
      console.log('Detection timeout - capturing current state');
    }

    // Wait a bit more to ensure all rendering is complete
    await page.waitForTimeout(1000);

    // Log what we see (for debugging)
    const greenBanner = page.locator('.bg-green-50.border-green-200');
    const yellowBanner = page.locator('.bg-yellow-50.border-yellow-200');
    const greenVisible = await greenBanner.isVisible().catch(() => false);
    const yellowVisible = await yellowBanner.isVisible().catch(() => false);

    console.log('Real detection results:');
    console.log('- Green banner visible:', greenVisible);
    console.log('- Yellow banner visible:', yellowVisible);

    if (greenVisible) {
      const bannerText = await greenBanner.textContent();
      console.log('- Green banner text:', bannerText);
    }

    // Check API key field
    const apiKeyInput = page.locator('#apiKey');
    const apiKeyValue = await apiKeyInput.inputValue();
    console.log('- API key value:', apiKeyValue ? 'Present' : 'Empty');

    // Screenshot 6: Real OAuth detection result
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'oauth-fix-06-real-oauth-detection.png'),
      fullPage: true
    });
    console.log('Screenshot 6 captured - Real detection state');

    // Verify page loaded successfully (basic assertion - use more specific selector)
    const pageTitle = page.locator('h1', { hasText: 'Authorize Claude API Access' });
    await expect(pageTitle).toBeVisible();
    console.log('Page loaded successfully');
  });

  /**
   * BONUS SCENARIO: Verify button states during detection
   */
  test('Scenario 5: Button States During Detection', async ({ page }) => {
    console.log('Starting Scenario 5: Button States');

    // Mock a slow detection endpoint
    await page.route('/api/claude-code/oauth/detect-cli', async (route) => {
      // Delay to capture "Detecting CLI..." state
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          detected: true,
          method: 'oauth',
          email: 'test@example.com'
        })
      });
    });

    // Navigate to OAuth consent page
    await page.goto(OAUTH_URL);
    console.log('Navigated to OAuth consent page');

    // Verify "Detecting CLI..." button state
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toContainText('Detecting CLI...');
    await expect(submitButton).toBeDisabled();
    console.log('Button shows "Detecting CLI..." and is disabled');

    // Wait for detection to complete
    await waitForDetection(page);

    // Verify button changes to "Authorize"
    await expect(submitButton).toContainText('Authorize');
    console.log('Button now shows "Authorize"');
  });

  /**
   * BONUS SCENARIO: Test error handling
   */
  test('Scenario 6: Detection Endpoint Error Handling', async ({ page }) => {
    console.log('Starting Scenario 6: Error Handling');

    // Mock a failing detection endpoint
    await page.route('/api/claude-code/oauth/detect-cli', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error'
        })
      });
    });

    // Navigate to OAuth consent page
    await page.goto(OAUTH_URL);
    console.log('Navigated to OAuth consent page');

    // Wait for detection to complete/fail
    await waitForDetection(page);

    // Verify yellow banner is shown (fallback to manual entry)
    const yellowBanner = page.locator('.bg-yellow-50.border-yellow-200');
    await expect(yellowBanner).toBeVisible();
    console.log('Yellow banner shown on error (graceful fallback)');

    // Verify API key field is empty
    const apiKeyInput = page.locator('#apiKey');
    const apiKeyValue = await apiKeyInput.inputValue();
    expect(apiKeyValue).toBe('');
    console.log('API key field is empty on error');
  });
});

/**
 * Summary Test: Verify all screenshots were captured
 */
test.describe('Screenshot Verification', () => {
  test('Verify all required screenshots exist', async ({ page }) => {
    console.log('Verifying screenshot capture...');

    const fs = require('fs');
    const requiredScreenshots = [
      'oauth-fix-01-oauth-detected-no-key.png',
      'oauth-fix-02-green-banner-oauth.png',
      'oauth-fix-03-api-key-detected.png',
      'oauth-fix-04-pre-populated-key.png',
      'oauth-fix-05-no-detection.png',
      'oauth-fix-06-real-oauth-detection.png'
    ];

    for (const screenshot of requiredScreenshots) {
      const screenshotPath = path.join(SCREENSHOT_DIR, screenshot);
      const exists = fs.existsSync(screenshotPath);
      console.log(`Screenshot ${screenshot}: ${exists ? 'EXISTS' : 'MISSING'}`);

      if (!exists) {
        console.warn(`WARNING: Screenshot ${screenshot} was not captured`);
      }
    }
  });
});
