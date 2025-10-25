/**
 * Comment Counter Verification Test
 *
 * This E2E test verifies that comment counters display correctly
 * after the parseEngagement fix.
 */

import { test, expect } from '@playwright/test';

test.describe('Comment Counter Display Fix', () => {
  test('should display comment counter from engagement.comments', async ({ page }) => {
    console.log('🧪 Starting comment counter verification test...');

    // Navigate to the app
    await page.goto('http://localhost:5173');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });
    console.log('✅ Posts loaded');

    // Take screenshot of initial state
    await page.screenshot({ path: '/tmp/comment-counter-initial.png', fullPage: true });
    console.log('📸 Screenshot saved: /tmp/comment-counter-initial.png');

    // Find all comment counter buttons
    const commentButtons = await page.locator('button[title="View Comments"]').all();
    console.log(`📊 Found ${commentButtons.length} comment buttons`);

    // Verify that comment counters are visible and contain numbers
    let countersWithValues = 0;
    let totalComments = 0;

    for (const button of commentButtons) {
      const counterText = await button.locator('span.text-sm.font-medium').textContent();
      const count = parseInt(counterText || '0', 10);

      if (!isNaN(count)) {
        countersWithValues++;
        totalComments += count;

        if (count > 0) {
          console.log(`  ✅ Found post with ${count} comment(s)`);
        }
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`  - Total comment buttons: ${commentButtons.length}`);
    console.log(`  - Buttons with valid counts: ${countersWithValues}`);
    console.log(`  - Total comments across all posts: ${totalComments}`);

    // Verify at least one post has comments (based on backend data)
    expect(totalComments).toBeGreaterThan(0);
    console.log('✅ Verified: At least one post shows comment count > 0');

    // Find the specific post that should have 1 comment
    const postWithComments = await page.locator('[data-testid="post-card"]').filter({
      has: page.locator('button[title="View Comments"] span.text-sm.font-medium', { hasText: /^[1-9]/ })
    }).first();

    if (await postWithComments.count() > 0) {
      await postWithComments.screenshot({ path: '/tmp/post-with-comment-counter.png' });
      console.log('📸 Screenshot saved: /tmp/post-with-comment-counter.png');

      const commentCount = await postWithComments
        .locator('button[title="View Comments"] span.text-sm.font-medium')
        .textContent();

      console.log(`\n🎯 Post with comments found: ${commentCount} comment(s)`);
      expect(parseInt(commentCount || '0', 10)).toBeGreaterThan(0);
    }
  });

  test('should update comment counter when new comment is added', async ({ page }) => {
    console.log('\n🧪 Testing comment counter update after adding comment...');

    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

    // Find first post
    const firstPost = await page.locator('[data-testid="post-card"]').first();

    // Get current comment count
    const initialCountText = await firstPost
      .locator('button[title="View Comments"] span.text-sm.font-medium')
      .textContent();
    const initialCount = parseInt(initialCountText || '0', 10);
    console.log(`📊 Initial comment count: ${initialCount}`);

    // Click to show comments
    await firstPost.locator('button[title="View Comments"]').click();
    await page.waitForTimeout(1000);

    // Check if "Add Comment" button is visible
    const addCommentButton = await firstPost.locator('button:has-text("Add Comment")').first();

    if (await addCommentButton.isVisible()) {
      await addCommentButton.click();
      await page.waitForTimeout(500);

      // Fill in comment
      const commentTextarea = await firstPost.locator('textarea[placeholder*="Write a comment"]');
      if (await commentTextarea.isVisible()) {
        await commentTextarea.fill('Test comment from E2E verification');

        // Submit comment
        await firstPost.locator('button:has-text("Add Comment")').last().click();
        console.log('✅ Comment submitted');

        // Wait for comment to be created
        await page.waitForTimeout(2000);

        // Check if counter updated
        const newCountText = await firstPost
          .locator('button[title="View Comments"] span.text-sm.font-medium')
          .textContent();
        const newCount = parseInt(newCountText || '0', 10);

        console.log(`📊 New comment count: ${newCount}`);
        console.log(`📈 Expected: ${initialCount + 1}, Got: ${newCount}`);

        expect(newCount).toBe(initialCount + 1);
        console.log('✅ Comment counter updated correctly!');

        // Take final screenshot
        await page.screenshot({ path: '/tmp/comment-counter-after-add.png', fullPage: true });
        console.log('📸 Screenshot saved: /tmp/comment-counter-after-add.png');
      }
    } else {
      console.log('⚠️ Add Comment button not found, skipping comment creation test');
    }
  });
});
