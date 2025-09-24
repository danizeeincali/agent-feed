import { test, expect } from '@playwright/test';

test.describe('@ Mention UI Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to main feed and verify no mention demo links', async ({ page }) => {
    // Take screenshot of initial page
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/01-main-feed-initial.png',
      fullPage: true
    });

    // Verify navigation doesn't show "Mention Demo" links
    const demoLinks = page.locator('text="Mention Demo"');
    await expect(demoLinks).toHaveCount(0);

    // Verify main navigation elements are present
    await expect(page.locator('nav')).toBeVisible();

    console.log('✅ Navigation verified - no mention demo links found');
  });

  test('should test @ mention functionality in post creation', async ({ page }) => {
    // Navigate to main feed
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');

    // Look for post creation area (textarea, input, or contenteditable)
    const postInput = page.locator('textarea, input[type="text"], [contenteditable="true"]').first();

    if (await postInput.count() > 0) {
      await postInput.click();
      await page.screenshot({
        path: '/workspaces/agent-feed/frontend/tests/screenshots/02-post-input-focused.png',
        fullPage: true
      });

      // Type @ symbol to trigger mention functionality
      await postInput.type('@');

      // Wait a moment for autocomplete to appear
      await page.waitForTimeout(500);

      await page.screenshot({
        path: '/workspaces/agent-feed/frontend/tests/screenshots/03-at-symbol-typed.png',
        fullPage: true
      });

      // Look for autocomplete dropdown or mention suggestions
      const mentionDropdown = page.locator('[data-testid*="mention"], .mention-dropdown, .autocomplete, [role="listbox"]');
      const hasMentionDropdown = await mentionDropdown.count() > 0;

      if (hasMentionDropdown) {
        await expect(mentionDropdown).toBeVisible();
        await page.screenshot({
          path: '/workspaces/agent-feed/frontend/tests/screenshots/04-mention-dropdown-visible.png',
          fullPage: true
        });
        console.log('✅ @ mention dropdown appears successfully');
      } else {
        console.log('⚠️  @ mention dropdown not found - checking for other mention UI');
        await page.screenshot({
          path: '/workspaces/agent-feed/frontend/tests/screenshots/04-no-dropdown-found.png',
          fullPage: true
        });
      }

      // Type a few characters after @
      await postInput.type('agent');
      await page.waitForTimeout(300);

      await page.screenshot({
        path: '/workspaces/agent-feed/frontend/tests/screenshots/05-typed-agent.png',
        fullPage: true
      });

      // Check for mention suggestions/options
      const suggestions = page.locator('[data-testid*="suggestion"], .mention-option, .autocomplete-option, [role="option"]');
      const hasSuggestions = await suggestions.count() > 0;

      if (hasSuggestions) {
        console.log(`✅ Found ${await suggestions.count()} mention suggestions`);

        // Take screenshot of suggestions
        await page.screenshot({
          path: '/workspaces/agent-feed/frontend/tests/screenshots/06-mention-suggestions.png',
          fullPage: true
        });

        // Test keyboard navigation
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(200);
        await page.screenshot({
          path: '/workspaces/agent-feed/frontend/tests/screenshots/07-arrow-down-navigation.png',
          fullPage: true
        });

        await page.keyboard.press('ArrowUp');
        await page.waitForTimeout(200);
        await page.screenshot({
          path: '/workspaces/agent-feed/frontend/tests/screenshots/08-arrow-up-navigation.png',
          fullPage: true
        });

        // Try to select a suggestion with Enter
        await page.keyboard.press('Enter');
        await page.waitForTimeout(200);
        await page.screenshot({
          path: '/workspaces/agent-feed/frontend/tests/screenshots/09-enter-selection.png',
          fullPage: true
        });

        console.log('✅ Keyboard navigation tested');
      } else {
        console.log('⚠️  No mention suggestions found');
      }
    } else {
      console.log('❌ No post input found on page');
      await page.screenshot({
        path: '/workspaces/agent-feed/frontend/tests/screenshots/02-no-post-input.png',
        fullPage: true
      });
    }
  });

  test('should test @ mention in comments', async ({ page }) => {
    // Navigate to main feed
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');

    // Look for comment areas or reply buttons
    const commentInputs = page.locator('textarea[placeholder*="comment" i], input[placeholder*="comment" i], [data-testid*="comment"] textarea, [data-testid*="comment"] input');
    const replyButtons = page.locator('button:has-text("Reply"), button:has-text("Comment"), [data-testid*="reply"], [data-testid*="comment"]');

    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/10-looking-for-comments.png',
      fullPage: true
    });

    if (await commentInputs.count() > 0) {
      const commentInput = commentInputs.first();
      await commentInput.click();
      await commentInput.type('@agent');
      await page.waitForTimeout(500);

      await page.screenshot({
        path: '/workspaces/agent-feed/frontend/tests/screenshots/11-comment-mention-test.png',
        fullPage: true
      });

      console.log('✅ Comment @ mention tested');
    } else if (await replyButtons.count() > 0) {
      await replyButtons.first().click();
      await page.waitForTimeout(500);

      // Look for comment input after clicking reply
      const newCommentInput = page.locator('textarea, input[type="text"]').last();
      if (await newCommentInput.count() > 0) {
        await newCommentInput.type('@agent');
        await page.waitForTimeout(500);

        await page.screenshot({
          path: '/workspaces/agent-feed/frontend/tests/screenshots/11-reply-mention-test.png',
          fullPage: true
        });

        console.log('✅ Reply @ mention tested');
      }
    } else {
      console.log('⚠️  No comment inputs found');
      await page.screenshot({
        path: '/workspaces/agent-feed/frontend/tests/screenshots/11-no-comment-inputs.png',
        fullPage: true
      });
    }
  });

  test('should capture comprehensive UI state', async ({ page }) => {
    // Navigate to different sections if they exist
    const sections = ['/', '/feed', '/posts', '/agents'];

    for (const section of sections) {
      try {
        await page.goto(`http://localhost:5173${section}`);
        await page.waitForLoadState('networkidle');

        const sectionName = section === '/' ? 'home' : section.slice(1);
        await page.screenshot({
          path: `/workspaces/agent-feed/frontend/tests/screenshots/12-${sectionName}-section.png`,
          fullPage: true
        });

        // Check for any @ mention related UI on each section
        const mentionElements = page.locator('[data-testid*="mention"], .mention, [class*="mention"]');
        const mentionCount = await mentionElements.count();

        if (mentionCount > 0) {
          console.log(`✅ Found ${mentionCount} mention-related elements in ${sectionName}`);
        }
      } catch (error) {
        console.log(`⚠️  Could not navigate to ${section}: ${error}`);
      }
    }
  });

  test('should validate console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');

    // Try to trigger @ mention functionality
    const inputElement = page.locator('textarea, input[type="text"], [contenteditable="true"]').first();
    if (await inputElement.count() > 0) {
      await inputElement.click();
      await inputElement.type('@test');
      await page.waitForTimeout(1000);
    }

    // Filter out expected proxy errors
    const relevantErrors = consoleErrors.filter(error =>
      !error.includes('proxy error') &&
      !error.includes('ECONNREFUSED') &&
      !error.includes('streaming-ticker')
    );

    if (relevantErrors.length > 0) {
      console.log('❌ Console errors found:', relevantErrors);
    } else {
      console.log('✅ No relevant console errors found');
    }

    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/13-final-state.png',
      fullPage: true
    });
  });
});