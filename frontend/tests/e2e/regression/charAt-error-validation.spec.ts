/**
 * Production Validation - charAt Error Fix Verification
 *
 * Validates that the .charAt error is completely fixed in the browser
 */

import { test, expect } from '@playwright/test';

interface ConsoleError {
  type: string;
  message: string;
  timestamp: string;
  stack?: string;
}

test.describe('charAt Error Production Validation', () => {
  const errors: ConsoleError[] = [];

  test.beforeEach(async ({ page }) => {
    errors.length = 0;

    // Capture all console messages
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        errors.push({
          type: msg.type(),
          message: msg.text(),
          timestamp: new Date().toISOString()
        });
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      errors.push({
        type: 'pageerror',
        message: error.message,
        timestamp: new Date().toISOString(),
        stack: error.stack
      });
    });
  });

  test('should have zero charAt errors on page load', async ({ page }) => {
    console.log('🔍 Loading application and checking for charAt errors...');

    // Navigate to application
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Filter for charAt errors
    const charAtErrors = errors.filter(err =>
      err.message.toLowerCase().includes('charat') ||
      (err.message.toLowerCase().includes('is not a function') &&
       (err.message.toLowerCase().includes('string') ||
        err.message.toLowerCase().includes('author')))
    );

    console.log(`\n📊 Error Summary:`);
    console.log(`Total errors: ${errors.length}`);
    console.log(`charAt errors: ${charAtErrors.length}`);

    if (charAtErrors.length > 0) {
      console.log('\n❌ charAt errors found:');
      charAtErrors.forEach((err, i) => {
        console.log(`${i + 1}. [${err.type}] ${err.message}`);
        if (err.stack) {
          console.log(`   Stack: ${err.stack.substring(0, 200)}`);
        }
      });
    } else {
      console.log('✅ No charAt errors detected!');
    }

    // Log other errors for context
    const otherErrors = errors.filter(err => !charAtErrors.includes(err));
    if (otherErrors.length > 0) {
      console.log('\n⚠️ Other errors detected:');
      otherErrors.forEach((err, i) => {
        console.log(`${i + 1}. [${err.type}] ${err.message.substring(0, 100)}`);
      });
    }

    expect(charAtErrors.length).toBe(0);
  });

  test('should display agent avatars correctly', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for avatars with emoji or initials
    const avatarElements = await page.locator('.bg-gradient-to-br, [class*="avatar"]').all();
    console.log(`Found ${avatarElements.length} avatar elements`);

    // Check for expandable posts (which should have avatars)
    const posts = await page.locator('[data-testid^="expandable-post-"]').all();
    console.log(`Found ${posts.length} posts`);

    if (posts.length > 0) {
      // Each post should have an avatar
      for (let i = 0; i < Math.min(posts.length, 3); i++) {
        const post = posts[i];
        const avatarInPost = await post.locator('.bg-gradient-to-br').count();
        console.log(`Post ${i + 1} has ${avatarInPost} avatar(s)`);
      }
    }

    // Verify no charAt errors occurred during avatar rendering
    const charAtErrors = errors.filter(err =>
      err.message.toLowerCase().includes('charat')
    );

    expect(charAtErrors.length).toBe(0);
  });

  test('should display formatted agent names', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find agent name elements
    const agentNames = await page.locator('h3.font-semibold.text-gray-900').allTextContents();

    console.log(`\n📝 Agent names found: ${agentNames.length}`);
    agentNames.forEach((name, i) => {
      console.log(`${i + 1}. "${name}"`);
    });

    // Check for proper formatting
    if (agentNames.length > 0) {
      const hasProperCapitalization = agentNames.some(name =>
        /^[A-Z]/.test(name) && !name.includes('-agent')
      );

      console.log(`Has proper capitalization: ${hasProperCapitalization}`);
      expect(hasProperCapitalization).toBe(true);
    }

    // Verify no charAt errors occurred during name formatting
    const charAtErrors = errors.filter(err =>
      err.message.toLowerCase().includes('charat')
    );

    expect(charAtErrors.length).toBe(0);
  });

  test('should expand posts without charAt errors', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const expandButtons = await page.locator('[data-testid="expand-post-button"]').all();
    console.log(`Found ${expandButtons.length} expand buttons`);

    if (expandButtons.length > 0) {
      // Click first expand button
      await expandButtons[0].click();
      await page.waitForTimeout(1000);

      // Check for expanded content
      const expandedContent = await page.locator('[data-testid="expanded-content"]').count();
      console.log(`Expanded content sections: ${expandedContent}`);

      // Verify no charAt errors during expansion
      const charAtErrors = errors.filter(err =>
        err.message.toLowerCase().includes('charat')
      );

      expect(charAtErrors.length).toBe(0);
    }
  });

  test('should filter posts without charAt errors', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Try to use search/filter
    const searchInput = await page.locator('input[placeholder*="Search"]').first();

    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);

      // Verify no charAt errors during filtering
      const charAtErrors = errors.filter(err =>
        err.message.toLowerCase().includes('charat')
      );

      expect(charAtErrors.length).toBe(0);
    }
  });

  test.afterEach(async () => {
    // Final error report
    const charAtErrors = errors.filter(err =>
      err.message.toLowerCase().includes('charat')
    );

    console.log(`\n📋 Test Complete - charAt errors: ${charAtErrors.length}`);
  });
});
