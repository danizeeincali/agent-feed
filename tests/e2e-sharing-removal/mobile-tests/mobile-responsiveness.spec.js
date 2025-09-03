import { test, expect } from '@playwright/test';

test.describe('Mobile Responsiveness Validation', () => {
  const mobileDevices = [
    { name: 'iPhone 12', viewport: { width: 390, height: 844 } },
    { name: 'iPhone SE', viewport: { width: 375, height: 667 } },
    { name: 'Samsung Galaxy S21', viewport: { width: 384, height: 854 } },
    { name: 'iPad Mini', viewport: { width: 768, height: 1024 } },
    { name: 'Small Mobile', viewport: { width: 320, height: 568 } }
  ];

  mobileDevices.forEach(device => {
    test.describe(`${device.name} Tests`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize(device.viewport);
        await page.goto('/');
        await page.waitForSelector('[data-testid="social-feed"]', { timeout: 10000 });
        await page.waitForSelector('.post-item', { timeout: 5000 });
      });

      test('should not display share buttons on mobile', async ({ page }) => {
        // Check for mobile-specific share button selectors
        const mobileShareSelectors = [
          'button[aria-label*="share" i]',
          '.mobile-share-button',
          '.share-action',
          '[data-testid*="share"]',
          '.social-share',
          'button:has-text("Share")'
        ];

        for (const selector of mobileShareSelectors) {
          const shareButtons = page.locator(selector);
          await expect(shareButtons).toHaveCount(0, {
            message: `Found mobile share button with selector: ${selector} on ${device.name}`
          });
        }
      });

      test('should display feed correctly on mobile viewport', async ({ page }) => {
        const feedContainer = page.locator('[data-testid="social-feed"]');
        await expect(feedContainer).toBeVisible();

        // Check that posts are properly sized for mobile
        const posts = page.locator('.post-item');
        const firstPost = posts.first();
        
        if (await firstPost.count() > 0) {
          const boundingBox = await firstPost.boundingBox();
          
          if (boundingBox) {
            // Post should not exceed viewport width
            expect(boundingBox.width).toBeLessThanOrEqual(device.viewport.width);
            
            // Post should be reasonably sized for mobile
            expect(boundingBox.width).toBeGreaterThan(device.viewport.width * 0.8);
          }
        }
      });

      test('should handle touch interactions correctly', async ({ page }) => {
        const posts = page.locator('.post-item');
        const firstPost = posts.first();

        if (await firstPost.count() > 0) {
          // Simulate touch tap
          await firstPost.tap();
          
          // Should not cause errors
          const errorMessages = page.locator('.error, [role="alert"]');
          await expect(errorMessages).toHaveCount(0);
        }
      });

      test('should support mobile-specific gestures', async ({ page }) => {
        // Test swipe gesture (if implemented)
        const feedArea = page.locator('[data-testid="social-feed"]');
        
        const boundingBox = await feedArea.boundingBox();
        if (boundingBox) {
          const startX = boundingBox.x + boundingBox.width / 2;
          const startY = boundingBox.y + boundingBox.height / 2;
          const endX = startX;
          const endY = startY - 100; // Swipe up
          
          // Perform swipe gesture
          await page.mouse.move(startX, startY);
          await page.mouse.down();
          await page.mouse.move(endX, endY);
          await page.mouse.up();
          
          // Should not cause crashes
          await page.waitForTimeout(500);
          const isPageFunctional = await page.locator('body').isVisible();
          expect(isPageFunctional).toBeTruthy();
        }
      });

      test('should show mobile-optimized like buttons', async ({ page }) => {
        const likeButtons = page.locator('button[aria-label*="like" i], .like-button');
        
        if (await likeButtons.count() > 0) {
          const firstLikeButton = likeButtons.first();
          
          // Check that like buttons are touch-friendly sized
          const boundingBox = await firstLikeButton.boundingBox();
          if (boundingBox) {
            // Minimum touch target size (44px recommended)
            expect(Math.min(boundingBox.width, boundingBox.height)).toBeGreaterThanOrEqual(32);
          }
          
          // Test touch interaction
          await firstLikeButton.tap();
          await page.waitForTimeout(500);
          
          // Should work without errors
          const errorMessages = page.locator('.error, [role="alert"]');
          await expect(errorMessages).toHaveCount(0);
        }
      });

      test('should display mobile-optimized comment interface', async ({ page }) => {
        const commentButtons = page.locator('button[aria-label*="comment" i], .comment-button');
        
        if (await commentButtons.count() > 0) {
          const firstCommentButton = commentButtons.first();
          
          // Touch-friendly size check
          const boundingBox = await firstCommentButton.boundingBox();
          if (boundingBox) {
            expect(Math.min(boundingBox.width, boundingBox.height)).toBeGreaterThanOrEqual(32);
          }
          
          await firstCommentButton.tap();
          await page.waitForTimeout(1000);
          
          // Check for mobile comment interface
          const commentInput = page.locator('textarea, input[placeholder*="comment" i]');
          if (await commentInput.count() > 0) {
            // Should be properly sized for mobile
            const inputBox = await commentInput.first().boundingBox();
            if (inputBox) {
              expect(inputBox.width).toBeLessThanOrEqual(device.viewport.width * 0.95);
            }
          }
        }
      });

      test('should handle mobile keyboard interactions', async ({ page }) => {
        const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
        
        if (await searchInput.count() > 0) {
          await searchInput.first().tap();
          
          // Mobile keyboard should not break layout
          await page.keyboard.type('mobile test');
          
          const feedContainer = page.locator('[data-testid="social-feed"]');
          await expect(feedContainer).toBeVisible();
        }
      });

      test('should support mobile navigation patterns', async ({ page }) => {
        // Test scroll behavior
        const initialScrollPosition = await page.evaluate(() => window.scrollY);
        
        // Scroll down
        await page.evaluate(() => window.scrollBy(0, 300));
        await page.waitForTimeout(500);
        
        const newScrollPosition = await page.evaluate(() => window.scrollY);
        expect(newScrollPosition).toBeGreaterThan(initialScrollPosition);
        
        // Scroll back up
        await page.evaluate(() => window.scrollBy(0, -200));
        await page.waitForTimeout(500);
        
        // Should still show content correctly
        const posts = page.locator('.post-item');
        await expect(posts.first()).toBeVisible();
      });

      test('should handle orientation changes gracefully', async ({ page }) => {
        const originalPosts = page.locator('.post-item');
        const originalCount = await originalPosts.count();
        
        // Simulate landscape orientation
        if (device.viewport.width < device.viewport.height) {
          await page.setViewportSize({
            width: device.viewport.height,
            height: device.viewport.width
          });
        } else {
          await page.setViewportSize({
            width: device.viewport.width,
            height: device.viewport.height + 100
          });
        }
        
        await page.waitForTimeout(1000);
        
        // Posts should still be visible
        const newPosts = page.locator('.post-item');
        const newCount = await newPosts.count();
        
        expect(newCount).toEqual(originalCount);
        await expect(newPosts.first()).toBeVisible();
      });
    });
  });

  test.describe('Mobile-Specific Share Removal Validation', () => {
    test('should not have mobile share sheet integration', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });
      
      const posts = page.locator('.post-item');
      const firstPost = posts.first();
      
      if (await firstPost.count() > 0) {
        // Long press (common mobile gesture for share)
        await firstPost.tap({ delay: 1000 });
        await page.waitForTimeout(500);
        
        // Should not trigger native share sheet or share modal
        const shareModal = page.locator('[role="dialog"]:has-text("Share")');
        await expect(shareModal).toHaveCount(0);
        
        const shareSheet = page.locator('.share-sheet, .share-menu');
        await expect(shareSheet).toHaveCount(0);
      }
    });

    test('should not respond to mobile share gestures', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12
      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });
      
      // Test various mobile gestures that might trigger share
      const feedArea = page.locator('[data-testid="social-feed"]');
      const boundingBox = await feedArea.boundingBox();
      
      if (boundingBox) {
        const centerX = boundingBox.x + boundingBox.width / 2;
        const centerY = boundingBox.y + boundingBox.height / 2;
        
        // Simulate pinch gesture (might be used for sharing)
        await page.mouse.move(centerX - 50, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX + 50, centerY);
        await page.mouse.up();
        
        // Simulate two-finger tap
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.waitForTimeout(100);
        await page.mouse.up();
        
        // Should not trigger any share functionality
        const shareElements = page.locator('[class*="share"], [data-testid*="share"]');
        await expect(shareElements).toHaveCount(0);
      }
    });
  });

  test.describe('Mobile Performance Tests', () => {
    test('should load efficiently on mobile networks', async ({ page }) => {
      // Simulate slow mobile network
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 100); // Add 100ms delay
      });
      
      await page.setViewportSize({ width: 375, height: 667 });
      
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 10000 });
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time even on slow networks
      expect(loadTime).toBeLessThan(8000); // 8 seconds max for mobile
    });

    test('should handle mobile memory constraints', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 }); // Small mobile device
      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });
      
      // Simulate memory pressure by loading many elements
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('PageDown');
        await page.waitForTimeout(200);
      }
      
      // Page should still be responsive
      const posts = page.locator('.post-item');
      await expect(posts.first()).toBeVisible();
      
      // Interaction should still work
      const likeButtons = page.locator('button[aria-label*="like" i]');
      if (await likeButtons.count() > 0) {
        await likeButtons.first().tap();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Mobile Accessibility Tests', () => {
    test('should support mobile screen readers', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });
      
      // Check for proper mobile accessibility features
      const posts = page.locator('.post-item');
      const firstPost = posts.first();
      
      if (await firstPost.count() > 0) {
        // Should have proper ARIA labels for mobile screen readers
        const interactiveElements = firstPost.locator('button, a, [role="button"]');
        const elementCount = await interactiveElements.count();
        
        for (let i = 0; i < Math.min(elementCount, 5); i++) {
          const element = interactiveElements.nth(i);
          const ariaLabel = await element.getAttribute('aria-label');
          const textContent = await element.textContent();
          
          // Should have some form of accessible label
          expect(ariaLabel || textContent?.trim()).toBeTruthy();
        }
      }
    });

    test('should have mobile-friendly focus indicators', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });
      
      // Test keyboard navigation on mobile (external keyboard support)
      await page.keyboard.press('Tab');
      
      const focusedElement = page.locator(':focus');
      if (await focusedElement.count() > 0) {
        // Focus indicator should be visible and appropriately sized for touch
        const isVisible = await focusedElement.isVisible();
        expect(isVisible).toBeTruthy();
        
        const boundingBox = await focusedElement.boundingBox();
        if (boundingBox) {
          // Should be touch-friendly size
          expect(Math.min(boundingBox.width, boundingBox.height)).toBeGreaterThanOrEqual(32);
        }
      }
    });
  });
});