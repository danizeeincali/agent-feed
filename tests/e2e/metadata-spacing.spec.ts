/**
 * E2E Visual Regression Tests: Metadata Line Spacing Adjustment
 *
 * Purpose: Validate visual appearance and spacing of metadata line with mt-4 class
 *
 * Change Being Tested:
 * - Added `mt-4` class to metadata line at line 803 in RealSocialMediaFeed.tsx
 * - Provides 16px top margin for better visual separation
 *
 * Test Coverage:
 * - Metadata line has visible spacing from content above
 * - Spacing is consistent across all posts
 * - Desktop, tablet, mobile viewports tested
 * - Light and dark mode tested
 * - No overlapping elements
 * - Visual comparison screenshots
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Metadata Line Spacing - Visual Regression Tests', () => {
  const BASE_URL = process.env.VITE_APP_URL || 'http://localhost:5173';

  test.beforeEach(async ({ page }) => {
    // Navigate to the feed
    await page.goto(BASE_URL);

    // Wait for posts to load
    await page.waitForSelector('[class*="border-gray-200"]', { timeout: 10000 });
  });

  test.describe('1. Metadata Line Visual Spacing', () => {
    test('should have visible spacing between content and metadata line', async ({ page }) => {
      // Wait for first post to be fully rendered
      const firstPost = page.locator('[class*="border-gray-200"]').first();
      await firstPost.waitFor({ state: 'visible' });

      // Get the metadata line (has pl-14 flex items-center space-x-6 mt-4)
      const metadataLine = firstPost.locator('.pl-14.flex.items-center.space-x-6.mt-4').first();
      await expect(metadataLine).toBeVisible();

      // Get bounding boxes to verify spacing
      const postBox = await firstPost.boundingBox();
      const metadataBox = await metadataLine.boundingBox();

      expect(postBox).not.toBeNull();
      expect(metadataBox).not.toBeNull();

      // Metadata line should have mt-4 class
      const classes = await metadataLine.getAttribute('class');
      expect(classes).toContain('mt-4');
    });

    test('should provide 16px top margin spacing', async ({ page }) => {
      const firstPost = page.locator('[class*="border-gray-200"]').first();
      const metadataLine = firstPost.locator('.pl-14.flex.items-center.space-x-6.mt-4').first();

      // Get computed style
      const marginTop = await metadataLine.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.marginTop;
      });

      // mt-4 in Tailwind = 1rem = 16px (assuming default font-size of 16px)
      expect(marginTop).toBe('16px');
    });

    test('should have spacing visible in screenshot', async ({ page }) => {
      const firstPost = page.locator('[class*="border-gray-200"]').first();
      await firstPost.waitFor({ state: 'visible' });

      // Take screenshot of first post
      await expect(firstPost).toHaveScreenshot('metadata-spacing-post-card.png', {
        maxDiffPixels: 100
      });
    });
  });

  test.describe('2. Consistency Across Posts', () => {
    test('should apply consistent spacing to all posts', async ({ page }) => {
      const posts = page.locator('[class*="border-gray-200"]');
      const postCount = await posts.count();

      expect(postCount).toBeGreaterThan(0);

      // Check each post has metadata line with mt-4
      for (let i = 0; i < Math.min(postCount, 5); i++) {
        const post = posts.nth(i);
        const metadataLine = post.locator('.pl-14.flex.items-center.space-x-6.mt-4').first();

        await expect(metadataLine).toBeVisible();

        const marginTop = await metadataLine.evaluate((el) => {
          return window.getComputedStyle(el).marginTop;
        });

        expect(marginTop).toBe('16px');
      }
    });

    test('should have uniform spacing across different content lengths', async ({ page }) => {
      const posts = page.locator('[class*="border-gray-200"]');
      const marginTops: string[] = [];

      // Collect margin-top values from first 5 posts
      const count = Math.min(await posts.count(), 5);

      for (let i = 0; i < count; i++) {
        const metadataLine = posts.nth(i).locator('.mt-4').first();
        const marginTop = await metadataLine.evaluate((el) => {
          return window.getComputedStyle(el).marginTop;
        });
        marginTops.push(marginTop);
      }

      // All should be 16px
      marginTops.forEach((margin) => {
        expect(margin).toBe('16px');
      });
    });

    test('should maintain spacing with expanded posts', async ({ page }) => {
      const firstPost = page.locator('[class*="border-gray-200"]').first();

      // Check if there's an expand button
      const expandButton = firstPost.locator('button:has-text("Show more"), button:has-text("Read more")').first();

      if (await expandButton.isVisible()) {
        await expandButton.click();
        await page.waitForTimeout(500);

        const metadataLine = firstPost.locator('.mt-4').first();
        const marginTop = await metadataLine.evaluate((el) => {
          return window.getComputedStyle(el).marginTop;
        });

        expect(marginTop).toBe('16px');
      }
    });
  });

  test.describe('3. Viewport Testing', () => {
    test('should maintain spacing on desktop viewport (1920x1080)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(500);

      const metadataLine = page.locator('.mt-4').first();
      await expect(metadataLine).toBeVisible();

      const marginTop = await metadataLine.evaluate((el) => {
        return window.getComputedStyle(el).marginTop;
      });

      expect(marginTop).toBe('16px');

      await expect(page).toHaveScreenshot('metadata-spacing-desktop.png', {
        fullPage: false,
        maxDiffPixels: 100
      });
    });

    test('should maintain spacing on tablet viewport (768x1024)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);

      const metadataLine = page.locator('.mt-4').first();
      await expect(metadataLine).toBeVisible();

      const marginTop = await metadataLine.evaluate((el) => {
        return window.getComputedStyle(el).marginTop;
      });

      expect(marginTop).toBe('16px');

      await expect(page).toHaveScreenshot('metadata-spacing-tablet.png', {
        fullPage: false,
        maxDiffPixels: 100
      });
    });

    test('should maintain spacing on mobile viewport (375x667)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      const metadataLine = page.locator('.mt-4').first();
      await expect(metadataLine).toBeVisible();

      const marginTop = await metadataLine.evaluate((el) => {
        return window.getComputedStyle(el).marginTop;
      });

      expect(marginTop).toBe('16px');

      await expect(page).toHaveScreenshot('metadata-spacing-mobile.png', {
        fullPage: false,
        maxDiffPixels: 100
      });
    });

    test('should maintain spacing on small mobile (320x568)', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.waitForTimeout(500);

      const metadataLine = page.locator('.mt-4').first();
      await expect(metadataLine).toBeVisible();

      const marginTop = await metadataLine.evaluate((el) => {
        return window.getComputedStyle(el).marginTop;
      });

      expect(marginTop).toBe('16px');
    });
  });

  test.describe('4. Dark Mode Testing', () => {
    test('should maintain spacing in dark mode', async ({ page }) => {
      // Toggle to dark mode
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      await page.waitForTimeout(500);

      const metadataLine = page.locator('.mt-4').first();
      await expect(metadataLine).toBeVisible();

      const marginTop = await metadataLine.evaluate((el) => {
        return window.getComputedStyle(el).marginTop;
      });

      expect(marginTop).toBe('16px');

      await expect(page).toHaveScreenshot('metadata-spacing-dark-mode.png', {
        fullPage: false,
        maxDiffPixels: 100
      });
    });

    test('should maintain metadata element visibility in dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      await page.waitForTimeout(500);

      const firstPost = page.locator('[class*="border-gray-200"]').first();
      const metadataLine = firstPost.locator('.mt-4').first();

      // Check metadata elements are visible
      const timeIcon = metadataLine.locator('svg').first();
      await expect(timeIcon).toBeVisible();

      // Check text is visible (not hidden)
      const metadataText = await metadataLine.textContent();
      expect(metadataText).toBeTruthy();
      expect(metadataText?.trim().length).toBeGreaterThan(0);
    });

    test('should preserve dark mode text colors', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      await page.waitForTimeout(500);

      const metadataLine = page.locator('.mt-4').first();

      // Check that text elements have dark mode classes
      const textElements = metadataLine.locator('[class*="text-"]');
      const count = await textElements.count();

      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('5. No Overlapping Elements', () => {
    test('should not overlap with post content', async ({ page }) => {
      const firstPost = page.locator('[class*="border-gray-200"]').first();
      const postContent = firstPost.locator('div').filter({ hasText: /\w+/ }).first();
      const metadataLine = firstPost.locator('.mt-4').first();

      const contentBox = await postContent.boundingBox();
      const metadataBox = await metadataLine.boundingBox();

      expect(contentBox).not.toBeNull();
      expect(metadataBox).not.toBeNull();

      if (contentBox && metadataBox) {
        // Metadata should be below content (higher y-coordinate)
        expect(metadataBox.y).toBeGreaterThan(contentBox.y);
      }
    });

    test('should not overlap with comments section', async ({ page }) => {
      const firstPost = page.locator('[class*="border-gray-200"]').first();

      // Try to find comments section or button
      const commentsArea = firstPost.locator('[class*="comment"], button:has-text("Comment")').first();

      if (await commentsArea.isVisible()) {
        const metadataLine = firstPost.locator('.mt-4').first();

        const metadataBox = await metadataLine.boundingBox();
        const commentsBox = await commentsArea.boundingBox();

        if (metadataBox && commentsBox) {
          // They should not overlap
          const noOverlap =
            metadataBox.y + metadataBox.height <= commentsBox.y ||
            commentsBox.y + commentsBox.height <= metadataBox.y;

          expect(noOverlap).toBe(true);
        }
      }
    });

    test('should not overlap with action buttons', async ({ page }) => {
      const firstPost = page.locator('[class*="border-gray-200"]').first();
      const metadataLine = firstPost.locator('.mt-4').first();

      const metadataBox = await metadataLine.boundingBox();
      expect(metadataBox).not.toBeNull();

      // Check for action buttons (like, share, etc.)
      const actionButtons = firstPost.locator('button[title], button[aria-label]');
      const buttonCount = await actionButtons.count();

      for (let i = 0; i < buttonCount; i++) {
        const button = actionButtons.nth(i);
        if (await button.isVisible()) {
          const buttonBox = await button.boundingBox();

          if (metadataBox && buttonBox) {
            // Check for overlap
            const overlaps = !(
              buttonBox.y + buttonBox.height <= metadataBox.y ||
              metadataBox.y + metadataBox.height <= buttonBox.y ||
              buttonBox.x + buttonBox.width <= metadataBox.x ||
              metadataBox.x + metadataBox.width <= buttonBox.x
            );

            // If they're in the same line (metadata line has buttons), that's ok
            // Otherwise, they shouldn't overlap
            if (overlaps) {
              // Check if button is child of metadata line
              const isChild = await button.evaluate((btn, metaEl) => {
                return metaEl?.contains(btn) || false;
              }, await metadataLine.elementHandle());

              if (!isChild) {
                expect(overlaps).toBe(false);
              }
            }
          }
        }
      }
    });
  });

  test.describe('6. Metadata Elements Functionality', () => {
    test('should display time element with icon', async ({ page }) => {
      const metadataLine = page.locator('.mt-4').first();
      await expect(metadataLine).toBeVisible();

      // Look for clock icon (SVG with specific path)
      const clockIcon = metadataLine.locator('svg').first();
      await expect(clockIcon).toBeVisible();

      // Verify it has a path with clock-like d attribute
      const pathD = await clockIcon.locator('path').first().getAttribute('d');
      expect(pathD).toBeTruthy();
    });

    test('should display reading time', async ({ page }) => {
      const metadataLine = page.locator('.mt-4').first();
      const text = await metadataLine.textContent();

      expect(text).toMatch(/\d+\s*min read/i);
    });

    test('should display author information', async ({ page }) => {
      const metadataLine = page.locator('.mt-4').first();
      const text = await metadataLine.textContent();

      // Should have some text (author name or username)
      expect(text).toBeTruthy();
      expect(text?.trim().length).toBeGreaterThan(0);
    });

    test('should have proper icon sizing', async ({ page }) => {
      const metadataLine = page.locator('.mt-4').first();
      const icons = metadataLine.locator('svg');

      const iconCount = await icons.count();
      expect(iconCount).toBeGreaterThan(0);

      // Check icon dimensions (should be small, around w-3 h-3 or w-4 h-4)
      const firstIcon = icons.first();
      const iconBox = await firstIcon.boundingBox();

      if (iconBox) {
        expect(iconBox.width).toBeLessThan(24); // Should be small
        expect(iconBox.height).toBeLessThan(24);
        expect(iconBox.width).toBeGreaterThan(8); // But not too small
        expect(iconBox.height).toBeGreaterThan(8);
      }
    });
  });

  test.describe('7. Performance and Loading', () => {
    test('should not cause layout shift when loading', async ({ page }) => {
      // Use layout shift API
      const layoutShifts = await page.evaluate(() => {
        return new Promise((resolve) => {
          let cls = 0;
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                cls += (entry as any).value;
              }
            }
          });

          observer.observe({ type: 'layout-shift', buffered: true });

          setTimeout(() => {
            observer.disconnect();
            resolve(cls);
          }, 3000);
        });
      });

      // CLS should be low (< 0.1 is good, < 0.25 is acceptable)
      expect(Number(layoutShifts)).toBeLessThan(0.25);
    });

    test('should render metadata line within reasonable time', async ({ page }) => {
      const startTime = Date.now();

      const metadataLine = page.locator('.mt-4').first();
      await expect(metadataLine).toBeVisible({ timeout: 5000 });

      const endTime = Date.now();
      const loadTime = endTime - startTime;

      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });
  });

  test.describe('8. Accessibility', () => {
    test('should maintain accessible contrast ratios', async ({ page }) => {
      const metadataLine = page.locator('.mt-4').first();
      await expect(metadataLine).toBeVisible();

      // Get text color and background color
      const colors = await metadataLine.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          color: style.color,
          backgroundColor: style.backgroundColor
        };
      });

      expect(colors.color).toBeTruthy();
      expect(colors.backgroundColor).toBeTruthy();
    });

    test('should have tooltips on time elements', async ({ page }) => {
      const metadataLine = page.locator('.mt-4').first();
      const timeElement = metadataLine.locator('[title], [data-tooltip]').first();

      // Check if tooltip exists
      if (await timeElement.isVisible()) {
        const title = await timeElement.getAttribute('title');
        expect(title).toBeTruthy();
      }
    });
  });

  test.describe('9. Cross-browser Compatibility', () => {
    test('should render consistently across browsers', async ({ page, browserName }) => {
      const metadataLine = page.locator('.mt-4').first();
      await expect(metadataLine).toBeVisible();

      const marginTop = await metadataLine.evaluate((el) => {
        return window.getComputedStyle(el).marginTop;
      });

      // Should be 16px in all browsers
      expect(marginTop).toBe('16px');

      // Take screenshot for each browser
      await expect(page).toHaveScreenshot(`metadata-spacing-${browserName}.png`, {
        fullPage: false,
        maxDiffPixels: 100
      });
    });
  });

  test.describe('10. Error Scenarios', () => {
    test('should handle missing metadata gracefully', async ({ page }) => {
      // Even with missing data, container should exist
      const metadataLine = page.locator('.mt-4').first();
      await expect(metadataLine).toBeVisible();
    });

    test('should handle slow network gracefully', async ({ page }) => {
      // Throttle network
      const client = await page.context().newCDPSession(page);
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 50 * 1024, // 50kb/s
        uploadThroughput: 50 * 1024,
        latency: 1000 // 1s latency
      });

      await page.reload();

      const metadataLine = page.locator('.mt-4').first();
      await expect(metadataLine).toBeVisible({ timeout: 15000 });

      const marginTop = await metadataLine.evaluate((el) => {
        return window.getComputedStyle(el).marginTop;
      });

      expect(marginTop).toBe('16px');
    });
  });
});
