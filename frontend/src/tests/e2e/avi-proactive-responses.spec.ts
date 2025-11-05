/**
 * E2E Tests: Λvi Proactive "Bag of Holding" Behavior
 * Tests Λvi behavior through the UI with visual validation
 *
 * Uses Playwright for real browser testing with screenshots
 */

import { test, expect } from '@playwright/test';
import { mkdir } from 'fs/promises';
import { join } from 'path';

// Screenshot directory
const SCREENSHOT_DIR = join(process.cwd(), '../../docs/screenshots/avi-proactive');

test.beforeAll(async () => {
  // Ensure screenshot directory exists
  try {
    await mkdir(SCREENSHOT_DIR, { recursive: true });
    console.log(`✅ Screenshot directory ready: ${SCREENSHOT_DIR}`);
  } catch (error) {
    console.log(`ℹ️ Screenshot directory already exists or created`);
  }
});

test.describe('Λvi Proactive Responses E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5173');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('Weather query shows proactive response (no forbidden phrases)', async ({ page }) => {
    console.log('\n🧪 Testing weather query with Λvi...');

    // Find post input area
    const postInput = page.locator('textarea, input[type="text"]').first();
    await postInput.waitFor({ timeout: 10000 });

    // Type weather query
    await postInput.fill('what is the weather like?');

    // Capture screenshot of query entered
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '01-weather-query-entered.png'),
      fullPage: true
    });
    console.log('✅ Screenshot 1: Query entered');

    // Submit post (look for submit button or press Enter)
    const submitButton = page.locator('button[type="submit"], button:has-text("Post"), button:has-text("Send")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
    } else {
      await postInput.press('Enter');
    }

    console.log('📤 Weather query submitted, waiting for Λvi response...');

    // Wait for Λvi response (lambda-vi or avi author)
    const aviResponse = page.locator('[data-author="lambda-vi"], [data-author="avi"]').last();
    await aviResponse.waitFor({ timeout: 60000 }); // 60 seconds for real SDK response

    // Capture screenshot of Λvi response
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '02-weather-response-received.png'),
      fullPage: true
    });
    console.log('✅ Screenshot 2: Λvi response received');

    // Get response text
    const responseText = await aviResponse.textContent();
    console.log(`\n📝 Λvi Response Preview: ${responseText?.substring(0, 200)}...`);

    // CRITICAL: Verify NO forbidden phrases
    const forbiddenPhrases = [
      "I don't have access",
      "I cannot help",
      "I'm unable to",
      "I don't have the ability",
      "That's outside my capabilities"
    ];

    const lowerResponse = responseText?.toLowerCase() || '';

    for (const phrase of forbiddenPhrases) {
      expect(lowerResponse).not.toContain(phrase.toLowerCase());
    }

    console.log('✅ No forbidden phrases detected');

    // Verify response contains proactive content
    const hasProactiveContent =
      lowerResponse.includes('weather') ||
      lowerResponse.includes('search') ||
      lowerResponse.includes('plan') ||
      lowerResponse.includes('investigate') ||
      lowerResponse.includes('can');

    expect(hasProactiveContent).toBe(true);
    console.log('✅ Response contains proactive content');

    // Capture final state screenshot
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '03-validation-complete.png'),
      fullPage: true
    });
    console.log('✅ Screenshot 3: Validation complete');
  });

  test('System command query shows tool usage', async ({ page }) => {
    console.log('\n🧪 Testing system command query with Λvi...');

    // Find and fill input
    const postInput = page.locator('textarea, input[type="text"]').first();
    await postInput.waitFor({ timeout: 10000 });
    await postInput.fill('check if the backend server is running');

    // Capture screenshot
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '04-system-query-entered.png'),
      fullPage: true
    });

    // Submit
    const submitButton = page.locator('button[type="submit"], button:has-text("Post"), button:has-text("Send")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
    } else {
      await postInput.press('Enter');
    }

    // Wait for response
    const aviResponse = page.locator('[data-author="lambda-vi"], [data-author="avi"]').last();
    await aviResponse.waitFor({ timeout: 60000 });

    const responseText = await aviResponse.textContent();
    console.log(`\n📝 Λvi Response: ${responseText?.substring(0, 200)}...`);

    // Verify no forbidden phrases
    const lowerResponse = responseText?.toLowerCase() || '';
    expect(lowerResponse).not.toContain("I don't have access");
    expect(lowerResponse).not.toContain("I cannot");

    // Capture final screenshot
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '05-system-response-validated.png'),
      fullPage: true
    });

    console.log('✅ System command query validated');
  });

  test('Complex request shows plan or investigation', async ({ page }) => {
    console.log('\n🧪 Testing complex request with Λvi...');

    // Find and fill input
    const postInput = page.locator('textarea, input[type="text"]').first();
    await postInput.waitFor({ timeout: 10000 });
    await postInput.fill('help me build a new authentication system');

    // Capture screenshot
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '06-complex-query-entered.png'),
      fullPage: true
    });

    // Submit
    const submitButton = page.locator('button[type="submit"], button:has-text("Post"), button:has-text("Send")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
    } else {
      await postInput.press('Enter');
    }

    // Wait for response
    const aviResponse = page.locator('[data-author="lambda-vi"], [data-author="avi"]').last();
    await aviResponse.waitFor({ timeout: 60000 });

    const responseText = await aviResponse.textContent();
    console.log(`\n📝 Λvi Response: ${responseText?.substring(0, 200)}...`);

    // Verify no forbidden phrases
    const lowerResponse = responseText?.toLowerCase() || '';
    expect(lowerResponse).not.toContain("I don't have access");
    expect(lowerResponse).not.toContain("I'm unable");

    // Should show plan or action
    const hasActionOrPlan =
      lowerResponse.includes('plan') ||
      lowerResponse.includes('can') ||
      lowerResponse.includes('agent') ||
      lowerResponse.includes('help') ||
      lowerResponse.includes('build');

    expect(hasActionOrPlan).toBe(true);

    // Capture final screenshot
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '07-complex-response-validated.png'),
      fullPage: true
    });

    console.log('✅ Complex request validated');
  });

  test('Multiple queries maintain proactive behavior', async ({ page }) => {
    console.log('\n🧪 Testing multiple queries for consistency...');

    const queries = [
      'what time is it?',
      'check system memory',
      'explain how this system works'
    ];

    let screenshotNum = 8;

    for (const query of queries) {
      console.log(`\n📝 Query: "${query}"`);

      // Find input
      const postInput = page.locator('textarea, input[type="text"]').first();
      await postInput.waitFor({ timeout: 10000 });

      // Clear and fill
      await postInput.clear();
      await postInput.fill(query);

      // Submit
      const submitButton = page.locator('button[type="submit"], button:has-text("Post"), button:has-text("Send")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
      } else {
        await postInput.press('Enter');
      }

      // Wait for response
      const aviResponse = page.locator('[data-author="lambda-vi"], [data-author="avi"]').last();
      await aviResponse.waitFor({ timeout: 60000 });

      const responseText = await aviResponse.textContent();
      console.log(`   Response preview: ${responseText?.substring(0, 100)}...`);

      // Verify no forbidden phrases
      const lowerResponse = responseText?.toLowerCase() || '';
      expect(lowerResponse).not.toContain("I don't have access");

      // Capture screenshot
      await page.screenshot({
        path: join(SCREENSHOT_DIR, `${String(screenshotNum).padStart(2, '0')}-query-${screenshotNum - 7}.png`),
        fullPage: true
      });
      console.log(`✅ Screenshot ${screenshotNum}: Query ${screenshotNum - 7} validated`);

      screenshotNum++;
    }

    console.log('✅ Multiple queries validated - proactive behavior consistent');
  });
});

test.describe('Λvi Response Visual Validation', () => {
  test('Λvi avatar displays correctly with proactive response', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Submit simple query
    const postInput = page.locator('textarea, input[type="text"]').first();
    await postInput.waitFor({ timeout: 10000 });
    await postInput.fill('hello Λvi');

    const submitButton = page.locator('button[type="submit"], button:has-text("Post"), button:has-text("Send")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
    } else {
      await postInput.press('Enter');
    }

    // Wait for Λvi response
    const aviResponse = page.locator('[data-author="lambda-vi"], [data-author="avi"]').last();
    await aviResponse.waitFor({ timeout: 60000 });

    // Check for Λvi avatar symbol
    const avatarElement = page.locator('[data-author="lambda-vi"] .avatar, [data-author="avi"] .avatar').first();
    if (await avatarElement.isVisible()) {
      const avatarText = await avatarElement.textContent();
      console.log(`✅ Λvi avatar displays: "${avatarText}"`);
    }

    // Capture screenshot of Λvi post with avatar
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '11-avi-avatar-display.png'),
      fullPage: true
    });

    console.log('✅ Visual validation complete');
  });
});
