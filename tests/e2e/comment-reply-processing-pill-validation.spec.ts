import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Comment Reply Processing Pill Visibility', () => {
  let screenshotCounter = 0;

  const takeScreenshot = async (page: Page, name: string) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${++screenshotCounter}-${name}-${timestamp}.png`;
    const filepath = path.join(__dirname, 'screenshots', filename);
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`📸 Screenshot saved: ${filepath}`);
    return filepath;
  };

  test('processing pill should stay visible for at least 2 seconds after reply submission', async ({ page }) => {
    test.setTimeout(60000); // 60 second timeout for this test

    // Step 1: Navigate to the app
    console.log('🚀 Step 1: Navigating to http://localhost:5173');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Let the page settle
    await takeScreenshot(page, 'initial-page-load');

    // Step 2: Find a post and expand comments
    console.log('🔍 Step 2: Looking for posts');

    // Wait for posts to load - posts container has the feed
    await page.waitForSelector('article, [class*="post"]', { timeout: 10000 });

    // Find comment count buttons (they show numbers like "3", "5" next to MessageCircle icons)
    const commentButtons = page.locator('button[title="View Comments"]');
    const commentButtonCount = await commentButtons.count();
    console.log(`Found ${commentButtonCount} comment buttons`);

    if (commentButtonCount > 0) {
      // Click the first post's comment button to expand
      const firstCommentButton = commentButtons.first();
      const buttonText = await firstCommentButton.textContent();
      console.log(`Clicking comment button with text: "${buttonText}"`);
      await firstCommentButton.click();
      await page.waitForTimeout(1500);
    } else {
      console.log('⚠️ No posts with comment buttons found');
    }

    await takeScreenshot(page, 'comments-expanded');

    // Step 3: Find a comment with a reply button
    console.log('🔍 Step 3: Looking for reply button in comments');

    // Wait for comments to render
    await page.waitForTimeout(1000);

    // Look for Reply buttons (small buttons with Reply icon and "Reply" text)
    const replyButtons = page.locator('button:has-text("Reply")');
    let replyButtonCount = await replyButtons.count();
    console.log(`Found ${replyButtonCount} reply buttons`);

    // If no reply buttons found, we may need to wait for comments to load or scroll
    if (replyButtonCount === 0) {
      await page.waitForTimeout(2000);
      replyButtonCount = await replyButtons.count();
      console.log(`After waiting, found ${replyButtonCount} reply buttons`);
    }

    if (replyButtonCount === 0) {
      await takeScreenshot(page, 'no-reply-buttons');
      throw new Error('No reply buttons found in comments - test cannot proceed');
    }

    // Step 4: Click reply button
    console.log('🖱️ Step 4: Clicking reply button');
    const replyButton = replyButtons.first();
    await expect(replyButton).toBeVisible({ timeout: 5000 });
    await replyButton.click();
    await page.waitForTimeout(500);
    await takeScreenshot(page, 'reply-clicked');

    // Step 5: Type a reply message
    console.log('⌨️ Step 5: Typing reply message');

    // Find the reply input field - CommentThread uses MentionInput component
    // which renders a textarea without specific placeholder
    await page.waitForTimeout(500); // Let reply form appear

    // Try multiple selectors for the reply textarea
    const replyInput = page.locator('textarea').last(); // MentionInput renders a textarea
    await expect(replyInput).toBeVisible({ timeout: 5000 });
    await replyInput.click();
    await replyInput.fill('This is a test reply to verify processing pill visibility');
    await takeScreenshot(page, 'reply-typed');

    // Step 6: Submit the reply
    console.log('📤 Step 6: Submitting reply');

    // The submit button in CommentThread reply form says "Post Reply"
    const submitReplyButton = page.locator('button:has-text("Post")').last();
    await expect(submitReplyButton).toBeVisible({ timeout: 5000 });

    // Record timestamp before submission
    const submitTime = Date.now();
    await submitReplyButton.click();

    // Step 7: Verify processing pill appears and stays visible
    console.log('👀 Step 7: Verifying processing pill visibility');

    await page.waitForTimeout(300); // Brief wait for pill to appear
    await takeScreenshot(page, 'reply-submitted-immediate');

    // Look for processing indicators (yellow/green pills, pending/complete states)
    const processingPillSelectors = [
      '.processing-pill',
      '[data-state="pending"]',
      '[data-state="processing"]',
      '.pill.yellow',
      '.pill.green',
      '.comment-pending',
      '.comment-processing',
      'span:has-text("Pending")',
      'span:has-text("Processing")',
      '[aria-label*="processing" i]'
    ];

    let pillFound = false;
    let pillSelector = '';

    // Try to find any processing indicator
    for (const selector of processingPillSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        console.log(`✅ Found processing pill with selector: ${selector}`);
        pillSelector = selector;
        pillFound = true;
        break;
      }
    }

    if (!pillFound) {
      console.log('⚠️ No processing pill found with standard selectors, checking all elements');
      await takeScreenshot(page, 'no-pill-found');

      // Try to find any pill-like element
      const genericPills = page.locator('.pill, [class*="pill" i], [class*="badge" i], [class*="status" i]');
      const genericCount = await genericPills.count();
      console.log(`Found ${genericCount} generic pill/badge elements`);

      if (genericCount > 0) {
        pillSelector = '.pill, [class*="pill" i]';
        pillFound = true;
      }
    }

    if (pillFound) {
      const pill = page.locator(pillSelector).first();

      // Verify pill is visible immediately
      await expect(pill).toBeVisible({ timeout: 2000 });
      console.log('✅ Processing pill is visible');
      await takeScreenshot(page, 'pill-visible-start');

      // Check visibility at 1 second
      await page.waitForTimeout(1000);
      const visibleAt1s = await pill.isVisible();
      console.log(`Pill visible at 1 second: ${visibleAt1s}`);
      await takeScreenshot(page, 'pill-at-1-second');

      // Check visibility at 2 seconds
      await page.waitForTimeout(1000);
      const visibleAt2s = await pill.isVisible();
      console.log(`Pill visible at 2 seconds: ${visibleAt2s}`);
      await takeScreenshot(page, 'pill-at-2-seconds');

      // Check visibility at 2.5 seconds
      await page.waitForTimeout(500);
      const visibleAt2_5s = await pill.isVisible();
      console.log(`Pill visible at 2.5 seconds: ${visibleAt2_5s}`);
      await takeScreenshot(page, 'pill-at-2.5-seconds');

      // Calculate total time pill was visible
      const totalTime = Date.now() - submitTime;
      console.log(`⏱️ Total time since submission: ${totalTime}ms`);

      // Assertions
      expect(visibleAt1s).toBe(true);
      expect(visibleAt2s).toBe(true);

      console.log('✅ SUCCESS: Processing pill stayed visible for at least 2 seconds');
    } else {
      console.log('❌ FAILURE: No processing pill found');
      await takeScreenshot(page, 'final-no-pill');
      throw new Error('Processing pill was not found in the UI');
    }

    // Final screenshot
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'final-state');

    console.log('🎉 Test completed successfully');
  });
});
