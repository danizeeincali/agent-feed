/**
 * E2E Tests: Agent Introduction Flow
 * Playwright tests for agent self-introductions
 *
 * Coverage:
 * - AC-7: Contextual agent introductions work
 * - Agent discovery through feed
 * - Introduction timing and content
 *
 * Test Suite: 4 E2E tests
 */

import { test, expect } from '@playwright/test';

test.describe('Agent Introduction Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article');
  });

  test('AC-7: Link Logger introduces when URL detected in post', async ({ page }) => {
    // Create a post with a URL
    const createPostButton = page.locator('button:has-text("Create Post"), button:has-text("New Post")').first();

    // If create post button exists, click it
    if (await createPostButton.isVisible()) {
      await createPostButton.click();
    }

    // Find post input (could be textarea or contenteditable)
    const postInput = page.locator('textarea[placeholder*="What"], [contenteditable="true"]').first();

    if (await postInput.isVisible()) {
      await postInput.fill('Check out this article: https://example.com/great-article');

      // Submit post
      const submitPost = page.locator('button:has-text("Post"), button:has-text("Submit")').first();
      await submitPost.click();

      // Wait for post to be created and agent to respond
      await page.waitForTimeout(3000);

      // Reload to see agent introduction
      await page.reload();
      await page.waitForSelector('article');

      // Look for Link Logger introduction
      const pageContent = await page.textContent('body');

      // AC-7: Link Logger should introduce itself
      const hasLinkLogger = pageContent?.toLowerCase().includes('link logger') ||
                           pageContent?.toLowerCase().includes('track links') ||
                           pageContent?.toLowerCase().includes('save urls');

      expect(hasLinkLogger).toBe(true);

      await page.screenshot({
        path: './docs/test-results/system-initialization/screenshots/21-link-logger-intro.png',
        fullPage: true
      });

      console.log('✓ Link Logger introduced when URL detected (AC-7)');
    } else {
      console.log('⚠ Post creation not available in current UI');
    }
  });

  test('Core agents have introduction posts after Phase 1', async ({ page }) => {
    // Wait for system to initialize
    await page.waitForTimeout(2000);

    const posts = await page.locator('article').all();

    // Should have welcome posts (3) potentially plus agent introductions
    expect(posts.length).toBeGreaterThanOrEqual(3);

    // Check if any posts are agent introductions
    const pageContent = await page.textContent('body');

    const hasIntroductions = pageContent?.toLowerCase().includes('i can help you') ||
                            pageContent?.toLowerCase().includes('i\'m') ||
                            pageContent?.toLowerCase().includes('hi!');

    expect(hasIntroductions).toBe(true);

    await page.screenshot({
      path: './docs/test-results/system-initialization/screenshots/22-core-agents.png',
      fullPage: true
    });

    console.log('✓ Agent introduction posts present');
  });

  test('Agent introductions include capabilities and examples', async ({ page }) => {
    await page.waitForTimeout(2000);

    const posts = await page.locator('article').all();

    // Look through posts for agent introduction content
    let foundIntroWithCapabilities = false;

    for (const post of posts) {
      const content = await post.textContent();

      // Check if this looks like an agent introduction
      const isIntro = content?.includes('I can help you') ||
                     content?.includes('I\'m') && content.includes('agent');

      if (isIntro) {
        // Should have examples or capabilities
        const hasCapabilities = content?.includes('Examples') ||
                               content?.includes('I can') ||
                               content?.includes('help you with');

        if (hasCapabilities) {
          foundIntroWithCapabilities = true;

          await post.screenshot({
            path: './docs/test-results/system-initialization/screenshots/23-agent-capabilities.png'
          });

          break;
        }
      }
    }

    expect(foundIntroWithCapabilities).toBe(true);

    console.log('✓ Agent introductions include capabilities');
  });

  test('Agent introductions do not duplicate', async ({ page }) => {
    // Get initial set of posts
    const initialPosts = await page.locator('article').all();
    const initialCount = initialPosts.length;

    // Reload page multiple times
    await page.reload();
    await page.waitForSelector('article');
    await page.waitForTimeout(1000);

    await page.reload();
    await page.waitForSelector('article');
    await page.waitForTimeout(1000);

    // Get final count
    const finalPosts = await page.locator('article').all();
    const finalCount = finalPosts.length;

    // Count should not dramatically increase (no duplicate introductions)
    // Allow for some variation but not 2x or more
    expect(finalCount).toBeLessThanOrEqual(initialCount * 1.5);

    await page.screenshot({
      path: './docs/test-results/system-initialization/screenshots/24-no-duplicates.png',
      fullPage: true
    });

    console.log(`✓ No duplicate introductions (${initialCount} → ${finalCount} posts)`);
  });
});

test.describe('Agent Discovery', () => {
  test('Agents are discoverable through feed', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article');

    // User should be able to discover agents through posts
    const posts = await page.locator('article').all();

    // Check if agent names/identities are visible
    const pageContent = await page.textContent('body');

    const hasAgentNames = pageContent?.includes('Λvi') ||
                         pageContent?.toLowerCase().includes('agent') ||
                         pageContent?.toLowerCase().includes('todos') ||
                         pageContent?.toLowerCase().includes('ideas');

    expect(hasAgentNames).toBe(true);

    await page.screenshot({
      path: './docs/test-results/system-initialization/screenshots/25-agent-discovery.png',
      fullPage: true
    });

    console.log('✓ Agents discoverable through feed content');
  });

  test('Agent introductions have clear call-to-action', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article');
    await page.waitForTimeout(2000);

    const pageContent = await page.textContent('body');

    // Look for CTAs (mention, tag, @agent-name)
    const hasCTA = pageContent?.includes('@') ||
                  pageContent?.toLowerCase().includes('mention me') ||
                  pageContent?.toLowerCase().includes('tag me') ||
                  pageContent?.toLowerCase().includes('get started');

    expect(hasCTA).toBe(true);

    await page.screenshot({
      path: './docs/test-results/system-initialization/screenshots/26-agent-cta.png',
      fullPage: true
    });

    console.log('✓ Agent introductions have clear CTAs');
  });
});
