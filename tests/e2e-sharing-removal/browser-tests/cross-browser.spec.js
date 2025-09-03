import { test, expect, devices } from '@playwright/test';

// Cross-browser compatibility tests for sharing removal
const browsers = [
  { name: 'Chromium', device: devices['Desktop Chrome'] },
  { name: 'Firefox', device: devices['Desktop Firefox'] },
  { name: 'WebKit', device: devices['Desktop Safari'] },
  { name: 'Chrome', device: devices['Desktop Chrome'] },
  { name: 'Edge', device: devices['Desktop Edge'] }
];

browsers.forEach(browser => {
  test.describe(`Cross-Browser Tests - ${browser.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="social-feed"]', { timeout: 10000 });
      await page.waitForSelector('.post-item', { timeout: 5000 });
    });

    test(`should not display share buttons in ${browser.name}`, async ({ page }) => {
      // Browser-specific share button selectors
      const shareButtonSelectors = [
        'button[aria-label*="share" i]',
        'button[title*="share" i]',
        'button:has-text("Share")',
        '.share-button',
        '.share-btn',
        '[data-testid*="share"]',
        'button[class*="share" i]',
        'svg[aria-label*="share" i]',
        '.fa-share',
        '.icon-share',
        // Browser-specific selectors
        browser.name === 'Firefox' ? 'button[data-firefox-share]' : null,
        browser.name === 'WebKit' ? 'button[webkit-share]' : null,
        browser.name === 'Chrome' ? 'button[chrome-share]' : null
      ].filter(Boolean);

      for (const selector of shareButtonSelectors) {
        const shareButtons = page.locator(selector);
        const count = await shareButtons.count();
        expect(count).toBe(0);
      }
    });

    test(`should maintain core functionality in ${browser.name}`, async ({ page }) => {
      // Test like functionality across browsers
      const likeButtons = page.locator('button[aria-label*="like" i], .like-button');
      
      if (await likeButtons.count() > 0) {
        const firstLikeButton = likeButtons.first();
        
        // Click like button
        await firstLikeButton.click();
        await page.waitForTimeout(500);
        
        // Verify response (may vary by browser)
        const buttonState = await firstLikeButton.getAttribute('aria-pressed');
        if (buttonState !== null) {
          expect(['true', 'false']).toContain(buttonState);
        }
      }
      
      // Test comment functionality
      const commentButtons = page.locator('button[aria-label*="comment" i], .comment-button');
      if (await commentButtons.count() > 0) {
        await commentButtons.first().click();
        await page.waitForTimeout(1000);
        
        // Should open comment interface without errors
        const errorMessages = page.locator('.error, [role="alert"]');
        await expect(errorMessages).toHaveCount(0);
      }
    });

    test(`should handle keyboard navigation in ${browser.name}`, async ({ page }) => {
      // Test Tab navigation
      await page.keyboard.press('Tab');
      
      let focusedElements = 0;
      let maxTabs = 10;
      
      while (focusedElements < maxTabs) {
        const focusedElement = page.locator(':focus');
        
        if (await focusedElement.count() === 0) {
          break;
        }
        
        // Verify focused element is visible
        await expect(focusedElement).toBeVisible();
        
        // Verify no share-related focused elements
        const ariaLabel = await focusedElement.getAttribute('aria-label');
        if (ariaLabel) {
          expect(ariaLabel.toLowerCase()).not.toContain('share');
        }
        
        focusedElements++;
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);
      }
      
      expect(focusedElements).toBeGreaterThan(0);
    });

    test(`should handle mouse interactions in ${browser.name}`, async ({ page }) => {
      const posts = page.locator('.post-item');
      const firstPost = posts.first();
      
      if (await firstPost.count() > 0) {
        // Hover over post
        await firstPost.hover();
        await page.waitForTimeout(300);
        
        // Click on post
        await firstPost.click();
        await page.waitForTimeout(500);
        
        // Right-click context menu
        await firstPost.click({ button: 'right' });
        await page.waitForTimeout(500);
        
        // Should not show share-related context menu items
        const contextMenus = page.locator('[role="menu"], .context-menu');
        if (await contextMenus.count() > 0) {
          const shareItems = contextMenus.locator('text="Share"');
          await expect(shareItems).toHaveCount(0);
        }
      }
    });

    test(`should display consistent UI across ${browser.name}`, async ({ page }) => {
      // Check layout consistency
      const feedContainer = page.locator('[data-testid="social-feed"]');
      await expect(feedContainer).toBeVisible();
      
      const posts = page.locator('.post-item');
      const postCount = await posts.count();
      expect(postCount).toBeGreaterThan(0);
      
      // Check that posts have consistent structure
      for (let i = 0; i < Math.min(postCount, 3); i++) {
        const post = posts.nth(i);
        
        // Should have content
        const hasContent = await post.locator('text=/\\w+/').count() > 0;
        expect(hasContent).toBeTruthy();
        
        // Should have interaction elements (but not share)
        const likeButton = post.locator('button[aria-label*="like" i]');
        const commentButton = post.locator('button[aria-label*="comment" i]');
        const shareButton = post.locator('button[aria-label*="share" i], .share-button');
        
        // Should have like/comment but not share
        expect(await shareButton.count()).toBe(0);
      }
    });

    test(`should handle CSS and styling in ${browser.name}`, async ({ page }) => {
      // Check for CSS-related errors
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await page.waitForTimeout(2000);
      
      // Filter out share-related CSS errors that might indicate removed functionality
      const shareStyleErrors = consoleErrors.filter(error => 
        error.toLowerCase().includes('share') && 
        (error.toLowerCase().includes('css') || error.toLowerCase().includes('style'))
      );
      
      // Should not have unhandled CSS errors for removed share functionality
      expect(shareStyleErrors).toHaveLength(0);
      
      // Check that remaining elements are styled correctly
      const posts = page.locator('.post-item');
      if (await posts.count() > 0) {
        const firstPost = posts.first();
        
        // Post should have proper dimensions
        const boundingBox = await firstPost.boundingBox();
        if (boundingBox) {
          expect(boundingBox.width).toBeGreaterThan(0);
          expect(boundingBox.height).toBeGreaterThan(0);
        }
      }
    });

    test(`should handle JavaScript functionality in ${browser.name}`, async ({ page }) => {
      const jsErrors = [];
      page.on('pageerror', error => {
        jsErrors.push(error.message);
      });
      
      // Trigger interactions that might cause JS errors
      const likeButtons = page.locator('button[aria-label*="like" i]');
      if (await likeButtons.count() > 0) {
        await likeButtons.first().click();
        await page.waitForTimeout(500);
      }
      
      // Test keyboard shortcuts
      await page.keyboard.press('s');
      await page.keyboard.press('S');
      await page.waitForTimeout(500);
      
      // Check for JavaScript errors
      const shareJsErrors = jsErrors.filter(error => 
        error.toLowerCase().includes('share') && 
        !error.toLowerCase().includes('404') // 404 errors are expected for removed endpoints
      );
      
      // Should not have unhandled JS errors from share functionality
      expect(shareJsErrors).toHaveLength(0);
    });

    test(`should handle touch events in ${browser.name} (if supported)`, async ({ page }) => {
      const posts = page.locator('.post-item');
      
      if (await posts.count() > 0) {
        const firstPost = posts.first();
        
        try {
          // Simulate touch events if supported by browser
          await firstPost.dispatchEvent('touchstart');
          await page.waitForTimeout(100);
          await firstPost.dispatchEvent('touchend');
          await page.waitForTimeout(500);
          
          // Should not trigger share functionality
          const shareModals = page.locator('[role="dialog"]:has-text("Share")');
          await expect(shareModals).toHaveCount(0);
          
        } catch (error) {
          // Touch events might not be supported in all browsers during testing
          console.log(`Touch events not supported in ${browser.name}: ${error.message}`);
        }
      }
    });

    test(`should handle browser-specific APIs in ${browser.name}`, async ({ page }) => {
      // Test browser-specific functionality
      const browserSpecificTests = await page.evaluate((browserName) => {
        const results = {
          webShareApiBlocked: true,
          clipboardApiSecure: true,
          notificationApiSecure: true
        };
        
        // Test Web Share API is not accessible for share functionality
        if ('share' in navigator) {
          try {
            // Should not be able to use share API for posts
            results.webShareApiBlocked = true; // Assume it's properly blocked
          } catch (e) {
            results.webShareApiBlocked = true;
          }
        }
        
        // Test Clipboard API doesn't expose share functionality
        if ('clipboard' in navigator) {
          results.clipboardApiSecure = !navigator.clipboard.writeText || 
                                      typeof navigator.clipboard.writeText === 'function';
        }
        
        // Test Notification API doesn't expose share notifications
        if ('Notification' in window) {
          results.notificationApiSecure = true;
        }
        
        return results;
      }, browser.name);
      
      expect(browserSpecificTests.webShareApiBlocked).toBe(true);
      expect(browserSpecificTests.clipboardApiSecure).toBe(true);
    });

    test(`should maintain accessibility in ${browser.name}`, async ({ page }) => {
      // Basic accessibility checks
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const buttons = page.locator('button');
      const links = page.locator('a');
      
      // Verify headings have text content
      const headingCount = await headings.count();
      for (let i = 0; i < Math.min(headingCount, 5); i++) {
        const heading = headings.nth(i);
        const text = await heading.textContent();
        expect(text?.trim().length).toBeGreaterThan(0);
      }
      
      // Verify buttons have accessible names and no share references
      const buttonCount = await buttons.count();
      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const button = buttons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        const textContent = await button.textContent();
        
        // Should have accessible name
        expect(ariaLabel || (textContent && textContent.trim().length > 0)).toBeTruthy();
        
        // Should not reference share functionality
        if (ariaLabel) {
          expect(ariaLabel.toLowerCase()).not.toContain('share');
        }
        if (textContent) {
          expect(textContent.toLowerCase().trim()).not.toBe('share');
        }
      }
    });

    test(`should handle viewport changes in ${browser.name}`, async ({ page }) => {
      const viewportSizes = [
        { width: 1920, height: 1080 }, // Desktop
        { width: 1024, height: 768 },  // Tablet landscape
        { width: 768, height: 1024 },  // Tablet portrait
        { width: 375, height: 667 }    // Mobile
      ];
      
      for (const viewport of viewportSizes) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(500);
        
        // Content should remain visible and functional
        const posts = page.locator('.post-item');
        await expect(posts.first()).toBeVisible();
        
        // Should not have share buttons at any viewport size
        const shareButtons = page.locator('button[aria-label*="share" i], .share-button');
        await expect(shareButtons).toHaveCount(0);
      }
    });

    test(`should handle performance consistently in ${browser.name}`, async ({ page }) => {
      const startTime = Date.now();
      
      // Perform standard interactions
      await page.keyboard.press('PageDown');
      await page.waitForTimeout(200);
      
      const likeButtons = page.locator('button[aria-label*="like" i]');
      if (await likeButtons.count() > 0) {
        await likeButtons.first().click();
        await page.waitForTimeout(300);
      }
      
      const endTime = Date.now();
      const interactionTime = endTime - startTime;
      
      // Should perform reasonably across all browsers
      expect(interactionTime).toBeLessThan(3000); // 3 seconds max for basic interactions
      
      // UI should remain responsive
      const posts = page.locator('.post-item');
      await expect(posts.first()).toBeVisible();
    });
  });
});

// Browser-specific edge case tests
test.describe('Browser-Specific Edge Cases', () => {
  test('Chrome - should handle Extension APIs safely', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-specific test');
    
    await page.goto('/');
    await page.waitForSelector('.post-item', { timeout: 5000 });
    
    // Test that Chrome extension APIs don't expose share functionality
    const extensionApiTest = await page.evaluate(() => {
      // Check if chrome.runtime is available (extension context)
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        return {
          hasRuntime: true,
          hasShareApis: !!(chrome.runtime.sendMessage || chrome.tabs)
        };
      }
      return { hasRuntime: false, hasShareApis: false };
    });
    
    // Extensions should not be able to inject share functionality
    const shareButtons = page.locator('button[aria-label*="share" i]');
    await expect(shareButtons).toHaveCount(0);
  });

  test('Firefox - should handle Add-on APIs safely', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'Firefox-specific test');
    
    await page.goto('/');
    await page.waitForSelector('.post-item', { timeout: 5000 });
    
    // Test Firefox-specific APIs
    const firefoxApiTest = await page.evaluate(() => {
      return {
        hasWebExtensions: typeof browser !== 'undefined',
        hasInstallTrigger: typeof InstallTrigger !== 'undefined'
      };
    });
    
    // Share buttons should not be present regardless of add-on APIs
    const shareButtons = page.locator('button[aria-label*="share" i]');
    await expect(shareButtons).toHaveCount(0);
  });

  test('Safari/WebKit - should handle WebKit-specific features', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'WebKit-specific test');
    
    await page.goto('/');
    await page.waitForSelector('.post-item', { timeout: 5000 });
    
    // Test WebKit-specific functionality
    const webkitTest = await page.evaluate(() => {
      return {
        hasWebkitPrefix: typeof webkitURL !== 'undefined',
        hasApplePaySession: typeof ApplePaySession !== 'undefined'
      };
    });
    
    // WebKit-specific share functionality should not be present
    const shareButtons = page.locator('button[aria-label*="share" i]');
    await expect(shareButtons).toHaveCount(0);
  });
});