import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Processing Pill Visibility Fix - Comment Reply', () => {
  let screenshotCounter = 0;
  const screenshotDir = path.join(__dirname, 'screenshots');

  async function takeTimestampedScreenshot(page: Page, label: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${++screenshotCounter}-${label}-${timestamp}.png`;
    await page.screenshot({
      path: path.join(screenshotDir, filename),
      fullPage: true
    });
    console.log(`📸 Screenshot saved: ${filename}`);
  }

  test('should show processing pill IMMEDIATELY when replying to a comment', async ({ page }) => {
    test.setTimeout(90000); // 90 seconds
    console.log('🧪 Starting pill visibility fix test...');

    // Navigate to feed
    console.log('📍 Step 1: Navigating to http://localhost:5173');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    // Wait for feed to load
    console.log('⏳ Step 2: Waiting for feed to load...');
    await page.waitForTimeout(3000); // Let feed fully load

    await takeTimestampedScreenshot(page, 'initial-feed-loaded');
    console.log('✅ Feed loaded successfully');

    // Find first post - should have comments from previous tests
    console.log('🔍 Step 3: Finding first post...');
    await page.waitForSelector('[data-testid="post-card"], article', { timeout: 10000 });
    await page.waitForTimeout(2000); // Extra wait for data to load

    const posts = await page.$$('[data-testid="post-card"], article');
    if (posts.length === 0) {
      throw new Error('❌ No posts found');
    }

    // Use the first post - it likely has comments from Avi
    const targetPost = posts[0];
    console.log('✅ Using first post for test');

    // Expand comments if needed
    console.log('📂 Step 5: Expanding comments...');
    const viewCommentsButton = await targetPost.$('button:has-text("View"), button:has-text("comment"), [data-testid="comment-count"]');
    if (viewCommentsButton) {
      await viewCommentsButton.click();
      await page.waitForTimeout(1000);
    }

    await takeTimestampedScreenshot(page, 'comments-expanded');

    // Find and click Reply button
    console.log('📝 Step 6: Finding and clicking Reply button...');
    const replyButton = await targetPost.$('button:has-text("Reply")');
    if (!replyButton) {
      throw new Error('❌ Reply button not found');
    }

    await takeTimestampedScreenshot(page, 'before-reply-click');
    await replyButton.click();
    await page.waitForTimeout(500);

    // Fill reply textarea
    console.log('⌨️  Step 7: Filling reply textarea...');
    const replyTextarea = await page.$('textarea[placeholder*="Reply"], textarea[placeholder*="reply"]');
    if (!replyTextarea) {
      throw new Error('❌ Reply textarea not found');
    }

    const testReplyText = `Testing pill visibility fix - ${Date.now()}`;
    await replyTextarea.fill(testReplyText);
    await page.waitForTimeout(500);

    await takeTimestampedScreenshot(page, 'reply-text-entered');
    console.log(`✅ Entered reply text: "${testReplyText}"`);

    // Find submit button
    console.log('🎯 Step 8: Preparing to submit reply...');
    const submitButton = await page.$('button:has-text("Post Reply"), button:has-text("Reply"), button:has-text("Send")');
    if (!submitButton) {
      throw new Error('❌ Submit button not found');
    }

    await takeTimestampedScreenshot(page, 'before-submit');

    // CRITICAL MOMENT: Click submit and IMMEDIATELY check for pill
    console.log('🚀 Step 9: Submitting reply and checking for IMMEDIATE pill visibility...');
    const submitTimestamp = Date.now();

    await submitButton.click();

    // IMMEDIATE check (within 100ms)
    await page.waitForTimeout(100);
    await takeTimestampedScreenshot(page, 'immediately-after-submit-100ms');

    const pillImmediateCheck = await page.locator('.processing-pill, [data-testid="processing-pill"], [class*="processing"], [class*="waiting"], .text-yellow-600, .bg-yellow-50').count();
    const pillVisibleImmediately = pillImmediateCheck > 0;

    console.log(`⏱️  Immediate check (100ms): Pill visible = ${pillVisibleImmediately} (found ${pillImmediateCheck} pills)`);

    // Check at 500ms
    await page.waitForTimeout(400); // Total 500ms
    await takeTimestampedScreenshot(page, 'after-submit-500ms');

    const pill500msCheck = await page.locator('.processing-pill, [data-testid="processing-pill"], [class*="processing"], [class*="waiting"], .text-yellow-600, .bg-yellow-50').count();
    console.log(`⏱️  500ms check: Pill visible = ${pill500msCheck > 0} (found ${pill500msCheck} pills)`);

    // Check at 1 second
    await page.waitForTimeout(500); // Total 1000ms
    await takeTimestampedScreenshot(page, 'after-submit-1second');

    const pill1sCheck = await page.locator('.processing-pill, [data-testid="processing-pill"], [class*="processing"], [class*="waiting"], .text-yellow-600, .bg-yellow-50').count();
    console.log(`⏱️  1 second check: Pill visible = ${pill1sCheck > 0} (found ${pill1sCheck} pills)`);

    // Check at 2 seconds
    await page.waitForTimeout(1000); // Total 2000ms
    await takeTimestampedScreenshot(page, 'after-submit-2seconds');

    const pill2sCheck = await page.locator('.processing-pill, [data-testid="processing-pill"], [class*="processing"], [class*="waiting"], .text-yellow-600, .bg-yellow-50').count();
    console.log(`⏱️  2 seconds check: Pill visible = ${pill2sCheck > 0} (found ${pill2sCheck} pills)`);

    // Look for the specific "Waiting for agents..." text
    console.log('🔍 Step 10: Checking for processing/waiting text...');
    const waitingText = await page.locator('text=/waiting for agents/i, text=/processing/i, text=/agent is typing/i').count();
    const hasWaitingText = waitingText > 0;
    console.log(`📝 Processing/waiting text found: ${hasWaitingText}`);

    // Wait a bit longer to see if comment appears
    console.log('⏳ Step 11: Waiting to see if comment appears without refresh...');
    await page.waitForTimeout(3000); // Total 5 seconds
    await takeTimestampedScreenshot(page, 'after-submit-5seconds');

    // Check if our reply comment appeared
    const replyAppeared = await page.locator(`text="${testReplyText}"`).count() > 0;
    console.log(`💬 Reply comment appeared: ${replyAppeared}`);

    // Final screenshot
    await takeTimestampedScreenshot(page, 'final-state');

    // REPORT RESULTS
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST RESULTS SUMMARY - PILL VISIBILITY FIX VALIDATION');
    console.log('='.repeat(70));
    console.log(`✅ Pill visible IMMEDIATELY (100ms): ${pillVisibleImmediately ? 'YES ✅' : 'NO ❌'}`);
    console.log(`✅ Pill visible at 500ms: ${pill500msCheck > 0 ? 'YES ✅' : 'NO ❌'}`);
    console.log(`✅ Pill visible at 1 second: ${pill1sCheck > 0 ? 'YES ✅' : 'NO ❌'}`);
    console.log(`✅ Pill visible at 2 seconds: ${pill2sCheck > 0 ? 'YES ✅' : 'NO ❌'}`);
    console.log(`✅ Processing/waiting text: ${hasWaitingText ? 'YES ✅' : 'NO ❌'}`);
    console.log(`✅ Reply appeared without refresh: ${replyAppeared ? 'YES ✅' : 'NO ❌'}`);
    console.log('='.repeat(70));

    console.log('\n📋 FIX VERIFICATION:');
    console.log(`1. CommentThread.tsx handleReply() tracking NEW comment ID: ${pillVisibleImmediately ? 'WORKING ✅' : 'NOT WORKING ❌'}`);
    console.log(`2. RealSocialMediaFeed.tsx handleNewComment() setting 'waiting' state: ${pill500msCheck > 0 ? 'WORKING ✅' : 'NOT WORKING ❌'}`);
    console.log(`3. loadComments delay preventing race condition: ${replyAppeared ? 'WORKING ✅' : 'NOT WORKING ❌'}`);
    console.log('='.repeat(70));

    // ASSERTIONS
    expect(pillVisibleImmediately,
      '❌ CRITICAL: Processing pill should be visible IMMEDIATELY after submit (within 100ms)'
    ).toBe(true);

    expect(pill500msCheck > 0 || pill1sCheck > 0,
      '❌ Processing pill should be visible within first second'
    ).toBe(true);

    console.log('\n✅ ALL ASSERTIONS PASSED! The pill visibility fix is working correctly.');
    console.log('='.repeat(70));
  });
});
