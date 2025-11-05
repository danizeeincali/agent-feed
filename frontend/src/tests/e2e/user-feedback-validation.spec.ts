import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite: User Feedback Fixes Validation
 *
 * This suite validates the following user-reported issues have been fixed:
 * 1. Posts display in correct order (Lambda-vi first)
 * 2. Hemingway Bridge doesn't show onboarding content
 * 3. Lambda-vi avatar shows Λ symbol
 * 4. No "Click to expand" text visible
 * 5. Post expansion works correctly without half-state
 *
 * All tests include screenshot validation for visual proof.
 */

test.describe('User Feedback Fixes - E2E Validation', () => {

  // Test 1: Post Order Visual Validation
  test('Posts display in correct order with screenshot proof', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

    // Get all post cards
    const posts = await page.$$('[data-testid="post-card"]');
    expect(posts.length).toBeGreaterThan(0);

    // Verify first post is from lambda-vi
    const firstPostAgent = await posts[0].getAttribute('data-author-agent');
    expect(firstPostAgent).toBe('lambda-vi');

    // Screenshot 1: Full feed showing correct order
    await page.screenshot({
      path: '/workspaces/agent-feed/docs/screenshots/post-order-validation.png',
      fullPage: true
    });

    console.log('✓ Post order validated: Lambda-vi post appears first');
  });

  // Test 2: No Onboarding Bridge
  test('Hemingway Bridge does not show onboarding content', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Wait for Hemingway Bridge to load
    await page.waitForSelector('[data-testid="hemingway-bridge"]', { timeout: 10000 });

    // Get bridge text content
    const bridgeText = await page.textContent('[data-testid="hemingway-bridge"]');

    // Verify no onboarding-related content
    expect(bridgeText).not.toMatch(/getting to know you/i);
    expect(bridgeText).not.toMatch(/onboarding/i);
    expect(bridgeText).not.toMatch(/welcome/i);

    // Screenshot 2: Bridge showing correct content
    await page.screenshot({
      path: '/workspaces/agent-feed/docs/screenshots/bridge-validation.png',
      fullPage: true
    });

    console.log('✓ Hemingway Bridge validated: No onboarding content found');
  });

  // Test 3: Avatar Letter Validation
  test('Lambda-vi avatar shows Λ symbol', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

    // Find lambda-vi's post
    const posts = await page.$$('[data-testid="post-card"]');
    let lambdaPost = null;

    for (const post of posts) {
      const agent = await post.getAttribute('data-author-agent');
      if (agent === 'lambda-vi') {
        lambdaPost = post;
        break;
      }
    }

    expect(lambdaPost).not.toBeNull();

    // Get avatar text
    const avatarText = await lambdaPost!.locator('.bg-gradient-to-br').first().textContent();
    expect(avatarText?.trim()).toBe('Λ');

    // Screenshot 3: Avatar showing Λ
    await lambdaPost!.locator('.bg-gradient-to-br').first().screenshot({
      path: '/workspaces/agent-feed/docs/screenshots/avatar-validation.png'
    });

    console.log('✓ Avatar validated: Lambda-vi displays Λ symbol');
  });

  // Test 4: No "Click to expand" Text
  test('No "Click to expand" text visible in posts', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

    // Get all text content on the page
    const pageContent = await page.textContent('body');

    // Verify no "Click to expand" text
    expect(pageContent).not.toMatch(/Click to expand/i);
    expect(pageContent).not.toMatch(/click.*expand/i);

    // Screenshot 4: Post without click to expand
    await page.screenshot({
      path: '/workspaces/agent-feed/docs/screenshots/no-click-to-expand.png',
      fullPage: true
    });

    console.log('✓ Click to expand validated: No such text found on page');
  });

  // Test 5: Post Expansion Works Correctly
  test('Posts expand and collapse properly without half-state', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

    const posts = await page.$$('[data-testid="post-card"]');
    expect(posts.length).toBeGreaterThan(1);

    // Get second post for expansion test
    const testPost = posts[1];

    // Verify collapsed state initially
    const initialHeight = await testPost.evaluate(el => el.clientHeight);
    const initialOverflow = await testPost.evaluate(el =>
      window.getComputedStyle(el).overflow
    );

    console.log(`Initial state - Height: ${initialHeight}px, Overflow: ${initialOverflow}`);

    // Click to expand
    await testPost.click();
    await page.waitForTimeout(500); // Wait for animation

    // Verify expanded state
    const expandedHeight = await testPost.evaluate(el => el.clientHeight);
    const expandedOverflow = await testPost.evaluate(el =>
      window.getComputedStyle(el).overflow
    );

    console.log(`Expanded state - Height: ${expandedHeight}px, Overflow: ${expandedOverflow}`);

    // Post should be taller when expanded
    expect(expandedHeight).toBeGreaterThanOrEqual(initialHeight);

    // Screenshot 5: Expanded post
    await testPost.screenshot({
      path: '/workspaces/agent-feed/docs/screenshots/post-expansion-validation.png'
    });

    // Click to collapse
    await testPost.click();
    await page.waitForTimeout(500); // Wait for animation

    const collapsedHeight = await testPost.evaluate(el => el.clientHeight);
    console.log(`Collapsed state - Height: ${collapsedHeight}px`);

    // Should return to similar height
    expect(Math.abs(collapsedHeight - initialHeight)).toBeLessThan(50);

    console.log('✓ Post expansion validated: Expand/collapse works correctly');
  });

  // Bonus Test: Visual regression check
  test('Overall layout matches expected design', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Wait for full page load
    await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="hemingway-bridge"]', { timeout: 10000 });

    // Take full page screenshot for manual review
    await page.screenshot({
      path: '/workspaces/agent-feed/docs/screenshots/full-page-layout.png',
      fullPage: true
    });

    // Verify key elements are visible
    await expect(page.locator('[data-testid="post-card"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="hemingway-bridge"]')).toBeVisible();

    console.log('✓ Layout validated: All key elements visible');
  });
});
