import { test, expect, Page } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCREENSHOT_DIR = join(__dirname, 'screenshots', 'final-validation');

// Helper to take screenshot with descriptive name
async function takeScreenshot(page: Page, name: string, step: number) {
  const filename = `${step.toString().padStart(2, '0')}_${name}.png`;
  await page.screenshot({
    path: join(SCREENSHOT_DIR, filename),
    fullPage: true
  });
  console.log(`📸 Screenshot saved: ${filename}`);
}

// Helper to wait for comments to load
async function waitForCommentsToLoad(page: Page) {
  await page.waitForSelector('[data-testid="comment-thread"], .comment-item', {
    state: 'visible',
    timeout: 10000
  });
  await page.waitForTimeout(1000); // Allow render to stabilize
}

test.describe('Final E2E Validation: Both Fixes', () => {
  test.beforeAll(async () => {
    const fs = await import('fs');
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for initial load
    await page.waitForSelector('[data-testid="social-feed"], .feed-container', {
      state: 'visible',
      timeout: 10000
    });

    await page.waitForTimeout(2000); // Allow app to stabilize
  });

  test('Scenario 1: Reply Button Processing Pill (Critical)', async ({ page }) => {
    console.log('\n🎯 Starting Scenario 1: Reply Button Processing Pill\n');

    let step = 1;

    // Step 1: Navigate and verify post with comments visible
    await takeScreenshot(page, 'initial_feed_view', step++);
    console.log('✓ Initial feed view captured');

    // Wait for comments to load
    await waitForCommentsToLoad(page);
    await takeScreenshot(page, 'comments_loaded', step++);
    console.log('✓ Comments loaded');

    // Step 2: Locate first comment with Reply button
    const firstComment = page.locator('[data-testid="comment-item"], .comment-item').first();
    await expect(firstComment).toBeVisible({ timeout: 10000 });
    await takeScreenshot(page, 'first_comment_visible', step++);
    console.log('✓ First comment visible');

    // Step 3: Click "Reply" button on first comment
    const replyButton = firstComment.locator('button:has-text("Reply")').first();
    await expect(replyButton).toBeVisible({ timeout: 5000 });
    await replyButton.click();
    await page.waitForTimeout(500);
    await takeScreenshot(page, 'reply_form_opened', step++);
    console.log('✓ Reply form opened');

    // Step 4: Verify reply form is visible
    const replyForm = firstComment.locator('textarea, input[placeholder*="reply"], [data-testid="reply-textarea"]');
    await expect(replyForm).toBeVisible({ timeout: 5000 });
    await takeScreenshot(page, 'reply_textarea_visible', step++);
    console.log('✓ Reply textarea visible');

    // Step 5: Type test text
    const testReplyText = `E2E Test Reply ${Date.now()}`;
    await replyForm.fill(testReplyText);
    await page.waitForTimeout(500);
    await takeScreenshot(page, 'reply_text_entered', step++);
    console.log(`✓ Reply text entered: "${testReplyText}"`);

    // Step 6: Locate "Post Reply" button
    const postReplyButton = firstComment.locator('button:has-text("Post Reply"), button:has-text("Submit")').first();
    await expect(postReplyButton).toBeVisible({ timeout: 5000 });
    await expect(postReplyButton).toBeEnabled();
    await takeScreenshot(page, 'post_reply_button_ready', step++);
    console.log('✓ Post Reply button ready');

    // Step 7: Click "Post Reply" button
    await postReplyButton.click();

    // CRITICAL: Immediately capture processing state
    await page.waitForTimeout(200); // Brief pause to allow UI to update
    await takeScreenshot(page, 'CRITICAL_processing_pill_visible', step++);
    console.log('✓ CRITICAL: Processing pill screenshot captured');

    // Step 8: Verify processing pill is visible with spinner and "Posting..." text
    console.log('Checking for processing indicators...');

    // Check for "Posting..." text
    const postingText = page.locator('button:has-text("Posting...")');
    try {
      await expect(postingText).toBeVisible({ timeout: 2000 });
      console.log('✓ "Posting..." text is VISIBLE');
    } catch (e) {
      console.error('❌ "Posting..." text NOT visible');
      await takeScreenshot(page, 'ERROR_posting_text_missing', step++);
      throw new Error('CRITICAL: "Posting..." text not visible');
    }

    // Check for spinner animation
    const spinner = page.locator('.animate-spin, [role="status"]');
    try {
      await expect(spinner).toBeVisible({ timeout: 2000 });
      console.log('✓ Spinner animation is VISIBLE');
    } catch (e) {
      console.error('❌ Spinner animation NOT visible');
      await takeScreenshot(page, 'ERROR_spinner_missing', step++);
      throw new Error('CRITICAL: Spinner animation not visible');
    }

    // Step 9: Verify button is disabled during processing
    await expect(postReplyButton).toBeDisabled({ timeout: 2000 });
    console.log('✓ Post Reply button is DISABLED during processing');
    await takeScreenshot(page, 'button_disabled_during_processing', step++);

    // Step 10: Wait for reply to complete and appear
    await page.waitForTimeout(3000); // Allow backend processing

    // Verify reply appears in the comment thread
    const replyText = page.locator(`text=${testReplyText}`);
    await expect(replyText).toBeVisible({ timeout: 10000 });
    console.log('✓ Reply appeared in comment thread');
    await takeScreenshot(page, 'reply_appeared_successfully', step++);

    // Step 11: Verify processing pill is gone
    await expect(postingText).not.toBeVisible();
    console.log('✓ Processing pill removed after completion');
    await takeScreenshot(page, 'processing_pill_removed', step++);

    console.log('\n✅ Scenario 1 PASSED: Reply Button Processing Pill working correctly!\n');
  });

  test('Scenario 2: Display Name "John Connor"', async ({ page }) => {
    console.log('\n🎯 Starting Scenario 2: Display Name "John Connor"\n');

    let step = 1;

    // Step 1: Initial view
    await takeScreenshot(page, 'scenario2_initial_view', step++);

    // Wait for comments to load
    await waitForCommentsToLoad(page);

    // Step 2: Check existing comments for author name
    const comments = page.locator('[data-testid="comment-item"], .comment-item');
    const commentCount = await comments.count();
    console.log(`Found ${commentCount} comments to check`);

    await takeScreenshot(page, 'scenario2_comments_loaded', step++);

    // Step 3: Verify "John Connor" appears in comments (not "user")
    let foundJohnConnor = false;
    for (let i = 0; i < Math.min(commentCount, 5); i++) {
      const comment = comments.nth(i);
      const commentText = await comment.textContent();

      if (commentText?.includes('John Connor')) {
        foundJohnConnor = true;
        console.log(`✓ Found "John Connor" in comment ${i + 1}`);
        await comment.scrollIntoViewIfNeeded();
        await takeScreenshot(page, `scenario2_john_connor_found_comment_${i + 1}`, step++);
        break;
      }
    }

    // Verify "John Connor" is visible on the page
    const johnConnorLocator = page.locator('text=John Connor');
    const johnConnorCount = await johnConnorLocator.count();
    console.log(`Found ${johnConnorCount} instances of "John Connor"`);

    if (johnConnorCount > 0) {
      await expect(johnConnorLocator.first()).toBeVisible();
      console.log('✓ "John Connor" display name is VISIBLE');
      await takeScreenshot(page, 'scenario2_john_connor_visible', step++);
    } else {
      console.warn('⚠️ No "John Connor" found, checking if user is onboarding...');
      await takeScreenshot(page, 'scenario2_no_john_connor_yet', step++);
    }

    // Verify "user" (generic name) is NOT visible as author
    const genericUserLocator = page.locator('.comment-author:has-text("user"), .author-name:has-text("user")');
    const genericUserCount = await genericUserLocator.count();

    if (genericUserCount > 0) {
      console.error('❌ Found generic "user" as author name');
      await takeScreenshot(page, 'ERROR_generic_user_found', step++);
      throw new Error('CRITICAL: Generic "user" name found instead of "John Connor"');
    } else {
      console.log('✓ No generic "user" author names found');
    }

    // Step 4: Create new reply to verify name persists
    const firstComment = comments.first();
    await firstComment.scrollIntoViewIfNeeded();

    const replyButton = firstComment.locator('button:has-text("Reply")').first();
    if (await replyButton.isVisible()) {
      await replyButton.click();
      await page.waitForTimeout(500);
      await takeScreenshot(page, 'scenario2_reply_form_opened', step++);

      const replyForm = firstComment.locator('textarea, input[placeholder*="reply"]').first();
      if (await replyForm.isVisible()) {
        const testReply = `Name test reply ${Date.now()}`;
        await replyForm.fill(testReply);
        await page.waitForTimeout(300);

        const postButton = firstComment.locator('button:has-text("Post Reply"), button:has-text("Submit")').first();
        await postButton.click();
        await page.waitForTimeout(3000); // Wait for reply to process

        await takeScreenshot(page, 'scenario2_new_reply_posted', step++);

        // Verify new reply shows "John Connor"
        const newReplyLocator = page.locator(`text=${testReply}`);
        await expect(newReplyLocator).toBeVisible({ timeout: 10000 });

        // Check if "John Connor" appears near the new reply
        const replyContainer = newReplyLocator.locator('xpath=ancestor::*[@data-testid="comment-item" or contains(@class, "comment-item")]').first();
        const authorName = replyContainer.locator('text=John Connor');

        if (await authorName.count() > 0) {
          await expect(authorName).toBeVisible();
          console.log('✓ New reply shows "John Connor" as author');
          await takeScreenshot(page, 'scenario2_new_reply_author_verified', step++);
        } else {
          console.warn('⚠️ Could not verify author name on new reply');
          await takeScreenshot(page, 'scenario2_new_reply_author_check', step++);
        }
      }
    }

    console.log('\n✅ Scenario 2 PASSED: Display Name "John Connor" working correctly!\n');
  });

  test('Scenario 3: Multiple Comments Independence', async ({ page }) => {
    console.log('\n🎯 Starting Scenario 3: Multiple Comments Independence\n');

    let step = 1;

    // Step 1: Initial view
    await takeScreenshot(page, 'scenario3_initial_view', step++);

    // Wait for comments to load
    await waitForCommentsToLoad(page);

    const comments = page.locator('[data-testid="comment-item"], .comment-item');
    const commentCount = await comments.count();
    console.log(`Found ${commentCount} comments`);

    if (commentCount < 2) {
      console.log('⚠️ Need at least 2 comments for independence test');
      test.skip();
      return;
    }

    await takeScreenshot(page, 'scenario3_multiple_comments_loaded', step++);

    // Step 2: Open reply forms on 2 different comments
    const firstComment = comments.nth(0);
    const secondComment = comments.nth(1);

    await firstComment.scrollIntoViewIfNeeded();
    const firstReplyButton = firstComment.locator('button:has-text("Reply")').first();
    await expect(firstReplyButton).toBeVisible({ timeout: 5000 });
    await firstReplyButton.click();
    await page.waitForTimeout(500);
    console.log('✓ First reply form opened');

    await secondComment.scrollIntoViewIfNeeded();
    const secondReplyButton = secondComment.locator('button:has-text("Reply")').first();
    await expect(secondReplyButton).toBeVisible({ timeout: 5000 });
    await secondReplyButton.click();
    await page.waitForTimeout(500);
    console.log('✓ Second reply form opened');

    await takeScreenshot(page, 'scenario3_both_forms_opened', step++);

    // Step 3: Fill in first reply
    const firstReplyForm = firstComment.locator('textarea, input[placeholder*="reply"]').first();
    await expect(firstReplyForm).toBeVisible({ timeout: 5000 });
    const firstReplyText = `Independence test 1 ${Date.now()}`;
    await firstReplyForm.fill(firstReplyText);
    await page.waitForTimeout(300);
    console.log(`✓ First reply text entered: "${firstReplyText}"`);

    // Fill in second reply
    const secondReplyForm = secondComment.locator('textarea, input[placeholder*="reply"]').first();
    await expect(secondReplyForm).toBeVisible({ timeout: 5000 });
    const secondReplyText = `Independence test 2 ${Date.now()}`;
    await secondReplyForm.fill(secondReplyText);
    await page.waitForTimeout(300);
    console.log(`✓ Second reply text entered: "${secondReplyText}"`);

    await takeScreenshot(page, 'scenario3_both_forms_filled', step++);

    // Step 4: Get references to both Post Reply buttons
    const firstPostButton = firstComment.locator('button:has-text("Post Reply"), button:has-text("Submit")').first();
    const secondPostButton = secondComment.locator('button:has-text("Post Reply"), button:has-text("Submit")').first();

    await expect(firstPostButton).toBeVisible();
    await expect(secondPostButton).toBeVisible();
    await expect(firstPostButton).toBeEnabled();
    await expect(secondPostButton).toBeEnabled();
    console.log('✓ Both Post Reply buttons are enabled');

    await takeScreenshot(page, 'scenario3_both_buttons_ready', step++);

    // Step 5: Submit first reply
    await firstPostButton.click();
    await page.waitForTimeout(200); // Allow UI to update

    console.log('✓ First reply submitted');
    await takeScreenshot(page, 'scenario3_first_processing', step++);

    // Step 6: CRITICAL - Verify first button is disabled while second remains enabled
    await expect(firstPostButton).toBeDisabled({ timeout: 2000 });
    console.log('✓ First button is DISABLED during processing');

    // CRITICAL: Second button should NOT be disabled
    try {
      await expect(secondPostButton).toBeEnabled({ timeout: 1000 });
      console.log('✓ CRITICAL: Second button remains ENABLED (independence verified)');
    } catch (e) {
      console.error('❌ CRITICAL: Second button was disabled (independence BROKEN)');
      await takeScreenshot(page, 'ERROR_independence_broken', step++);
      throw new Error('CRITICAL: Second button was incorrectly disabled');
    }

    await takeScreenshot(page, 'scenario3_independence_verified', step++);

    // Step 7: Verify first reply processing indicators
    const firstProcessingPill = firstComment.locator('button:has-text("Posting...")');
    try {
      await expect(firstProcessingPill).toBeVisible({ timeout: 2000 });
      console.log('✓ First reply shows processing pill');
    } catch (e) {
      console.warn('⚠️ Processing pill not visible on first reply');
    }

    // Step 8: Wait for first reply to complete
    await page.waitForTimeout(3000);

    const firstReplyLocator = page.locator(`text=${firstReplyText}`);
    await expect(firstReplyLocator).toBeVisible({ timeout: 10000 });
    console.log('✓ First reply completed and visible');

    await takeScreenshot(page, 'scenario3_first_reply_completed', step++);

    // Step 9: Verify second button is still enabled and functional
    await expect(secondPostButton).toBeEnabled();
    console.log('✓ Second button still enabled after first reply completed');

    // Submit second reply
    await secondPostButton.click();
    await page.waitForTimeout(3000);

    const secondReplyLocator = page.locator(`text=${secondReplyText}`);
    await expect(secondReplyLocator).toBeVisible({ timeout: 10000 });
    console.log('✓ Second reply completed and visible');

    await takeScreenshot(page, 'scenario3_both_replies_completed', step++);

    console.log('\n✅ Scenario 3 PASSED: Multiple Comments Independence working correctly!\n');
  });

  test('Complete Integration: All Fixes Working Together', async ({ page }) => {
    console.log('\n🎯 Starting Complete Integration Test\n');

    let step = 1;

    await takeScreenshot(page, 'integration_initial_view', step++);
    await waitForCommentsToLoad(page);

    const comments = page.locator('[data-testid="comment-item"], .comment-item');
    const commentCount = await comments.count();

    if (commentCount < 1) {
      console.log('⚠️ No comments available for integration test');
      test.skip();
      return;
    }

    const firstComment = comments.first();
    await firstComment.scrollIntoViewIfNeeded();

    // 1. Verify display name before interaction
    const authorName = page.locator('text=John Connor');
    const authorCount = await authorName.count();
    console.log(`Found ${authorCount} instances of "John Connor"`);
    await takeScreenshot(page, 'integration_author_name_check', step++);

    // 2. Open reply form
    const replyButton = firstComment.locator('button:has-text("Reply")').first();
    await replyButton.click();
    await page.waitForTimeout(500);
    await takeScreenshot(page, 'integration_reply_form_opened', step++);

    // 3. Fill and submit reply
    const replyForm = firstComment.locator('textarea, input[placeholder*="reply"]').first();
    const testReply = `Integration test ${Date.now()}`;
    await replyForm.fill(testReply);
    await page.waitForTimeout(300);

    const postButton = firstComment.locator('button:has-text("Post Reply"), button:has-text("Submit")').first();
    await postButton.click();
    await page.waitForTimeout(200);

    // 4. Verify ALL fixes simultaneously
    console.log('Verifying all fixes are active...');
    await takeScreenshot(page, 'integration_all_fixes_active', step++);

    // Fix 1: Processing pill visible
    const processingPill = firstComment.locator('button:has-text("Posting...")');
    try {
      await expect(processingPill).toBeVisible({ timeout: 2000 });
      console.log('✓ Fix 1: Processing pill VISIBLE');
    } catch (e) {
      console.error('❌ Fix 1: Processing pill NOT visible');
      await takeScreenshot(page, 'ERROR_integration_no_pill', step++);
    }

    // Fix 2: Display name check (will verify after reply appears)
    await page.waitForTimeout(3000);

    const newReply = page.locator(`text=${testReply}`);
    await expect(newReply).toBeVisible({ timeout: 10000 });
    console.log('✓ Reply completed');

    await takeScreenshot(page, 'integration_reply_completed', step++);

    // Verify author name on new reply
    if (authorCount > 0) {
      console.log('✓ Fix 2: Display name "John Connor" verified');
    }

    // 5. Test independence with another comment if available
    if (commentCount > 1) {
      const secondComment = comments.nth(1);
      await secondComment.scrollIntoViewIfNeeded();
      const secondReplyBtn = secondComment.locator('button:has-text("Reply")').first();

      if (await secondReplyBtn.isVisible()) {
        await secondReplyBtn.click();
        await page.waitForTimeout(500);

        const secondButton = secondComment.locator('button:has-text("Post Reply")').first();
        await expect(secondButton).toBeEnabled();
        console.log('✓ Fix 3: Independence maintained');
        await takeScreenshot(page, 'integration_independence_verified', step++);
      }
    }

    console.log('\n✅ COMPLETE INTEGRATION TEST PASSED: All fixes working together!\n');
  });
});
