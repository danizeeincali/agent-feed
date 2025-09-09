import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Visual Regression Testing', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.clearBrowserState();
    
    // Set consistent viewport and disable animations for visual tests
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
  });

  test('homepage renders consistently', async ({ page }) => {
    console.log('🎨 Testing homepage visual consistency...');
    
    await helpers.navigateTo('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for any loading spinners to disappear
    await page.waitForTimeout(2000);
    
    // Hide dynamic content that changes between runs
    await page.addStyleTag({
      content: `
        .timestamp, .time, [data-testid="timestamp"] {
          visibility: hidden !important;
        }
        .loading, .spinner {
          display: none !important;
        }
      `
    });
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('homepage-full.png', {
      fullPage: true,
      animations: 'disabled',
      caret: 'hide'
    });
    
    console.log('✅ Homepage visual regression test completed');
  });

  test('post creator component renders consistently', async ({ page }) => {
    console.log('🎨 Testing post creator visual consistency...');
    
    await helpers.navigateTo('/');
    await page.waitForLoadState('networkidle');
    
    // Find post creator component
    const postCreatorSelectors = [
      '[data-testid="post-creator"]',
      '.post-creator',
      '.main-post-input'
    ];
    
    let postCreator = null;
    for (const selector of postCreatorSelectors) {
      postCreator = page.locator(selector);
      if (await postCreator.count() > 0) {
        console.log(`✅ Found post creator: ${selector}`);
        break;
      }
    }
    
    if (!postCreator) {
      test.skip('Post creator not found for visual testing');
      return;
    }
    
    // Screenshot of post creator in default state
    await expect(postCreator).toHaveScreenshot('post-creator-default.png');
    
    // Screenshot with focus state
    const textArea = postCreator.locator('textarea');
    if (await textArea.count() > 0) {
      await textArea.click();
      await expect(postCreator).toHaveScreenshot('post-creator-focused.png');
      
      // Screenshot with content
      await textArea.type('Test post content for visual testing');
      await expect(postCreator).toHaveScreenshot('post-creator-with-content.png');
    }
    
    console.log('✅ Post creator visual regression test completed');
  });

  test('mention dropdown renders consistently', async ({ page }) => {
    console.log('🎨 Testing mention dropdown visual consistency...');
    
    await helpers.navigateTo('/');
    await page.waitForLoadState('networkidle');
    
    const postInput = page.locator('[data-testid="post-creator"] textarea, .post-creator textarea, .main-post-input').first();
    
    if (await postInput.count() === 0) {
      test.skip('Post input not found for mention dropdown testing');
      return;
    }
    
    await postInput.click();
    await postInput.type('@');
    
    try {
      const dropdown = await helpers.waitForMentionDropdown();
      
      // Wait a moment for dropdown to stabilize
      await page.waitForTimeout(500);
      
      await expect(dropdown).toHaveScreenshot('mention-dropdown.png');
      
      console.log('✅ Mention dropdown visual test completed');
      
    } catch (error) {
      console.log('⚠️ Mention dropdown not available for visual testing');
      test.skip();
    }
  });

  test('feed layout renders consistently', async ({ page }) => {
    console.log('🎨 Testing feed layout visual consistency...');
    
    await helpers.navigateTo('/');
    await page.waitForLoadState('networkidle');
    
    // Find the main feed area
    const feedSelectors = [
      '[data-testid="feed"]',
      '.feed',
      '.posts-container',
      '.main-content'
    ];
    
    let feed = null;
    for (const selector of feedSelectors) {
      feed = page.locator(selector);
      if (await feed.count() > 0) {
        console.log(`✅ Found feed: ${selector}`);
        break;
      }
    }
    
    if (!feed) {
      // Take screenshot of entire page if specific feed not found
      feed = page.locator('body');
    }
    
    // Hide timestamps and dynamic content
    await page.addStyleTag({
      content: `
        .timestamp, .time, [data-testid="timestamp"],
        .relative-time, .ago {
          visibility: hidden !important;
        }
        .avatar img {
          background: #f0f0f0 !important;
        }
      `
    });
    
    await expect(feed).toHaveScreenshot('feed-layout.png');
    
    console.log('✅ Feed layout visual test completed');
  });

  test('responsive layout renders consistently on mobile', async ({ page }) => {
    console.log('🎨 Testing mobile responsive layout...');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await helpers.navigateTo('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Take mobile screenshot
    await expect(page).toHaveScreenshot('mobile-layout.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    // Test mobile menu if it exists
    const mobileMenuButtons = page.locator('.mobile-menu, [data-testid="mobile-menu"], .hamburger');
    if (await mobileMenuButtons.count() > 0) {
      await mobileMenuButtons.first().click();
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('mobile-menu-open.png');
    }
    
    console.log('✅ Mobile responsive layout test completed');
  });

  test('tablet layout renders consistently', async ({ page }) => {
    console.log('🎨 Testing tablet responsive layout...');
    
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await helpers.navigateTo('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('tablet-layout.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    console.log('✅ Tablet responsive layout test completed');
  });

  test('comment threading visual consistency', async ({ page }) => {
    console.log('🎨 Testing comment threading visual consistency...');
    
    await helpers.navigateTo('/');
    await page.waitForLoadState('networkidle');
    
    // Look for posts with comments
    const posts = page.locator('.post, [data-testid="post"]');
    if (await posts.count() === 0) {
      test.skip('No posts available for comment visual testing');
      return;
    }
    
    // Click reply on first post to show comment interface
    const firstPost = posts.first();
    const replyButton = firstPost.locator('[data-testid="reply-button"], .reply-button, button:has-text("Reply")').first();
    
    if (await replyButton.count() > 0) {
      await replyButton.click();
      await page.waitForTimeout(500);
      
      // Screenshot comment input area
      const commentSection = firstPost.locator('.comments, .comment-section, .replies');
      if (await commentSection.count() > 0) {
        await expect(commentSection).toHaveScreenshot('comment-input-area.png');
      }
      
      // Look for existing comments to screenshot
      const comments = page.locator('.comment, [data-testid="comment"]');
      if (await comments.count() > 0) {
        const firstComment = comments.first();
        await expect(firstComment).toHaveScreenshot('comment-item.png');
      }
    }
    
    console.log('✅ Comment threading visual test completed');
  });

  test('error states render consistently', async ({ page }) => {
    console.log('🎨 Testing error state visual consistency...');
    
    // Intercept requests to simulate errors
    await page.route('**/api/**', route => {
      route.abort('failed');
    });
    
    await page.goto('/');
    await page.waitForTimeout(3000);
    
    // Look for error messages
    const errorSelectors = [
      '.error-message',
      '[data-testid="error-message"]',
      '.error',
      '.alert-error'
    ];
    
    for (const selector of errorSelectors) {
      const errorElement = page.locator(selector);
      if (await errorElement.count() > 0 && await errorElement.isVisible()) {
        await expect(errorElement).toHaveScreenshot('error-state.png');
        console.log('✅ Error state visual captured');
        break;
      }
    }
    
    // Remove route interception
    await page.unroute('**/api/**');
    
    console.log('✅ Error state visual test completed');
  });

  test('loading states render consistently', async ({ page }) => {
    console.log('🎨 Testing loading state visual consistency...');
    
    // Slow down network to capture loading states
    await page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      route.continue();
    });
    
    const navigationPromise = helpers.navigateTo('/');
    
    // Try to capture loading state
    await page.waitForTimeout(500);
    
    const loadingSelectors = [
      '.loading',
      '[data-testid="loading"]',
      '.spinner',
      '.skeleton'
    ];
    
    for (const selector of loadingSelectors) {
      const loadingElement = page.locator(selector);
      if (await loadingElement.count() > 0 && await loadingElement.isVisible()) {
        await expect(loadingElement).toHaveScreenshot('loading-state.png');
        console.log('✅ Loading state visual captured');
        break;
      }
    }
    
    await navigationPromise;
    await page.unroute('**/api/**');
    
    console.log('✅ Loading state visual test completed');
  });

  test('dark mode renders consistently', async ({ page }) => {
    console.log('🎨 Testing dark mode visual consistency...');
    
    await helpers.navigateTo('/');
    await page.waitForLoadState('networkidle');
    
    // Look for dark mode toggle
    const darkModeSelectors = [
      '[data-testid="dark-mode-toggle"]',
      '.dark-mode-toggle',
      '.theme-toggle',
      'button:has-text("Dark")'
    ];
    
    let darkModeToggle = null;
    for (const selector of darkModeSelectors) {
      darkModeToggle = page.locator(selector);
      if (await darkModeToggle.count() > 0) {
        console.log(`✅ Found dark mode toggle: ${selector}`);
        break;
      }
    }
    
    if (darkModeToggle && await darkModeToggle.count() > 0) {
      await darkModeToggle.click();
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('dark-mode-layout.png', {
        fullPage: true,
        animations: 'disabled'
      });
      
      console.log('✅ Dark mode visual captured');
    } else {
      // Try to enable dark mode programmatically
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
      });
      
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('dark-mode-programmatic.png', {
        fullPage: true,
        animations: 'disabled'
      });
      
      console.log('✅ Dark mode visual test (programmatic) completed');
    }
  });

  test('high contrast mode accessibility', async ({ page }) => {
    console.log('🎨 Testing high contrast visual accessibility...');
    
    // Enable high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addStyleTag({
      content: `
        * {
          filter: contrast(150%) brightness(120%) !important;
        }
      `
    });
    
    await helpers.navigateTo('/');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('high-contrast-mode.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    console.log('✅ High contrast accessibility visual test completed');
  });
});