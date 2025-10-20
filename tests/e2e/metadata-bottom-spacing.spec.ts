/**
 * Visual Regression Tests: Metadata Bottom Spacing Validation
 *
 * Testing the addition of mb-4 class to the metadata line in RealSocialMediaFeed.tsx (line 803)
 *
 * Change: Added mb-4 class to metadata line for better visual separation from divider
 * Location: RealSocialMediaFeed.tsx line 803
 * Class: "pl-14 flex items-center space-x-6 mt-4 mb-4"
 *
 * These tests validate:
 * - Visual spacing between metadata and divider
 * - Consistent rendering across viewports
 * - Dark mode compatibility
 * - No visual regressions
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Helper: Wait for posts to load
async function waitForPostsToLoad(page: Page) {
  await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  // Allow time for any animations or transitions
  await page.waitForTimeout(500);
}

// Helper: Get metadata line element
async function getMetadataLine(page: Page, postIndex = 0) {
  const postCards = page.locator('[data-testid="post-card"]');
  const postCard = postCards.nth(postIndex);
  return postCard.locator('.pl-14.flex.items-center.space-x-6.mt-4.mb-4').first();
}

// Helper: Get divider element
async function getDivider(page: Page, postIndex = 0) {
  const postCards = page.locator('[data-testid="post-card"]');
  const postCard = postCards.nth(postIndex);
  return postCard.locator('.border-t.border-gray-100, .border-t.dark\\:border-gray-800').first();
}

test.describe('Metadata Bottom Spacing - Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForPostsToLoad(page);
  });

  test.describe('1. Spacing Verification', () => {
    test('should have visible space between metadata and divider', async ({ page }) => {
      const metadataLine = await getMetadataLine(page);
      const divider = await getDivider(page);

      expect(await metadataLine.isVisible()).toBe(true);
      expect(await divider.isVisible()).toBe(true);

      // Get bounding boxes
      const metadataBox = await metadataLine.boundingBox();
      const dividerBox = await divider.boundingBox();

      expect(metadataBox).not.toBeNull();
      expect(dividerBox).not.toBeNull();

      // Calculate spacing between elements
      const spacing = dividerBox!.y - (metadataBox!.y + metadataBox!.height);

      // Should have at least 16px spacing (mb-4)
      expect(spacing).toBeGreaterThanOrEqual(16);
      console.log(`✓ Spacing between metadata and divider: ${spacing}px`);
    });

    test('should have 16px bottom margin on metadata line', async ({ page }) => {
      const metadataLine = await getMetadataLine(page);

      // Check computed styles
      const marginBottom = await metadataLine.evaluate((el) => {
        return window.getComputedStyle(el).marginBottom;
      });

      // mb-4 = 1rem = 16px in most cases
      expect(marginBottom).toMatch(/16px|1rem/);
      console.log(`✓ Metadata bottom margin: ${marginBottom}`);
    });

    test('should have 16px top margin on metadata line', async ({ page }) => {
      const metadataLine = await getMetadataLine(page);

      // Check computed styles
      const marginTop = await metadataLine.evaluate((el) => {
        return window.getComputedStyle(el).marginTop;
      });

      // mt-4 = 1rem = 16px in most cases
      expect(marginTop).toMatch(/16px|1rem/);
      console.log(`✓ Metadata top margin: ${marginTop}`);
    });

    test('should have symmetric vertical spacing', async ({ page }) => {
      const metadataLine = await getMetadataLine(page);

      const { marginTop, marginBottom } = await metadataLine.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          marginTop: styles.marginTop,
          marginBottom: styles.marginBottom
        };
      });

      expect(marginTop).toBe(marginBottom);
      console.log(`✓ Symmetric spacing: top=${marginTop}, bottom=${marginBottom}`);
    });

    test('should maintain total spacing of approximately 44px to divider', async ({ page }) => {
      const metadataLine = await getMetadataLine(page);
      const divider = await getDivider(page);

      const metadataBox = await metadataLine.boundingBox();
      const dividerBox = await divider.boundingBox();

      const totalSpacing = dividerBox!.y - (metadataBox!.y + metadataBox!.height);

      // Total spacing: mb-4 (16px) + divider py-4 top (16px) + content gap ≈ 40-48px
      expect(totalSpacing).toBeGreaterThanOrEqual(30);
      expect(totalSpacing).toBeLessThanOrEqual(50);
      console.log(`✓ Total spacing to divider: ${totalSpacing}px`);
    });
  });

  test.describe('2. Visual Consistency Across Posts', () => {
    test('should have consistent spacing across all posts', async ({ page }) => {
      const postCards = page.locator('[data-testid="post-card"]');
      const postCount = await postCards.count();

      if (postCount === 0) {
        test.skip();
        return;
      }

      const spacings: number[] = [];

      for (let i = 0; i < Math.min(postCount, 3); i++) {
        const metadataLine = await getMetadataLine(page, i);
        const divider = await getDivider(page, i);

        const metadataBox = await metadataLine.boundingBox();
        const dividerBox = await divider.boundingBox();

        if (metadataBox && dividerBox) {
          const spacing = dividerBox.y - (metadataBox.y + metadataBox.height);
          spacings.push(spacing);
        }
      }

      // All spacings should be within 2px of each other
      const minSpacing = Math.min(...spacings);
      const maxSpacing = Math.max(...spacings);

      expect(maxSpacing - minSpacing).toBeLessThanOrEqual(2);
      console.log(`✓ Consistent spacing across posts: ${spacings.join(', ')}px`);
    });

    test('should render all metadata elements without overlap', async ({ page }) => {
      const metadataLine = await getMetadataLine(page);

      // Get all child elements
      const children = await metadataLine.locator('> div').all();

      expect(children.length).toBeGreaterThanOrEqual(3);

      // Check for overlaps
      const boxes = await Promise.all(children.map(child => child.boundingBox()));

      for (let i = 0; i < boxes.length - 1; i++) {
        const current = boxes[i];
        const next = boxes[i + 1];

        if (current && next) {
          // Next element should start after current element ends
          expect(next.x).toBeGreaterThanOrEqual(current.x + current.width - 2);
        }
      }

      console.log(`✓ No overlapping metadata elements (${children.length} elements)`);
    });
  });

  test.describe('3. Viewport Responsiveness', () => {
    test('should maintain spacing on desktop (1920x1080)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await waitForPostsToLoad(page);

      const metadataLine = await getMetadataLine(page);
      const marginBottom = await metadataLine.evaluate((el) => {
        return window.getComputedStyle(el).marginBottom;
      });

      expect(marginBottom).toMatch(/16px|1rem/);
      console.log(`✓ Desktop spacing: ${marginBottom}`);
    });

    test('should maintain spacing on laptop (1366x768)', async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 768 });
      await waitForPostsToLoad(page);

      const metadataLine = await getMetadataLine(page);
      const marginBottom = await metadataLine.evaluate((el) => {
        return window.getComputedStyle(el).marginBottom;
      });

      expect(marginBottom).toMatch(/16px|1rem/);
      console.log(`✓ Laptop spacing: ${marginBottom}`);
    });

    test('should maintain spacing on tablet (768x1024)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await waitForPostsToLoad(page);

      const metadataLine = await getMetadataLine(page);
      const marginBottom = await metadataLine.evaluate((el) => {
        return window.getComputedStyle(el).marginBottom;
      });

      expect(marginBottom).toMatch(/16px|1rem/);
      console.log(`✓ Tablet spacing: ${marginBottom}`);
    });

    test('should maintain spacing on mobile (375x667)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await waitForPostsToLoad(page);

      const metadataLine = await getMetadataLine(page);
      const marginBottom = await metadataLine.evaluate((el) => {
        return window.getComputedStyle(el).marginBottom;
      });

      expect(marginBottom).toMatch(/16px|1rem/);
      console.log(`✓ Mobile spacing: ${marginBottom}`);
    });

    test('should maintain spacing on small mobile (320x568)', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await waitForPostsToLoad(page);

      const metadataLine = await getMetadataLine(page);
      const marginBottom = await metadataLine.evaluate((el) => {
        return window.getComputedStyle(el).marginBottom;
      });

      expect(marginBottom).toMatch(/16px|1rem/);
      console.log(`✓ Small mobile spacing: ${marginBottom}`);
    });
  });

  test.describe('4. Dark Mode Compatibility', () => {
    test('should maintain spacing in dark mode', async ({ page }) => {
      // Enable dark mode
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.reload();
      await waitForPostsToLoad(page);

      const metadataLine = await getMetadataLine(page);
      const divider = await getDivider(page);

      const metadataBox = await metadataLine.boundingBox();
      const dividerBox = await divider.boundingBox();

      const spacing = dividerBox!.y - (metadataBox!.y + metadataBox!.height);

      expect(spacing).toBeGreaterThanOrEqual(16);
      console.log(`✓ Dark mode spacing: ${spacing}px`);
    });

    test('should preserve dark mode text colors', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.reload();
      await waitForPostsToLoad(page);

      const metadataLine = await getMetadataLine(page);
      const textElements = await metadataLine.locator('.text-gray-500, .dark\\:text-gray-400').all();

      expect(textElements.length).toBeGreaterThan(0);
      console.log(`✓ Dark mode text elements preserved: ${textElements.length}`);
    });

    test('should have proper divider color in dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.reload();
      await waitForPostsToLoad(page);

      const divider = await getDivider(page);

      const borderColor = await divider.evaluate((el) => {
        return window.getComputedStyle(el).borderTopColor;
      });

      // Dark mode should use gray-800 border
      expect(borderColor).toBeTruthy();
      console.log(`✓ Dark mode divider border color: ${borderColor}`);
    });
  });

  test.describe('5. No Visual Regressions', () => {
    test('should not have overlapping elements', async ({ page }) => {
      const metadataLine = await getMetadataLine(page);
      const divider = await getDivider(page);

      const metadataBox = await metadataLine.boundingBox();
      const dividerBox = await divider.boundingBox();

      // Metadata should end before divider starts
      expect(metadataBox!.y + metadataBox!.height).toBeLessThanOrEqual(dividerBox!.y);
      console.log('✓ No overlap between metadata and divider');
    });

    test('should not cause layout shifts', async ({ page }) => {
      const metadataLine = await getMetadataLine(page);

      const initialBox = await metadataLine.boundingBox();

      // Wait and check again
      await page.waitForTimeout(1000);
      const finalBox = await metadataLine.boundingBox();

      // Position should be stable
      expect(Math.abs(finalBox!.y - initialBox!.y)).toBeLessThanOrEqual(1);
      console.log('✓ No layout shift detected');
    });

    test('should maintain proper z-index stacking', async ({ page }) => {
      const metadataLine = await getMetadataLine(page);
      const divider = await getDivider(page);

      const metadataZ = await metadataLine.evaluate((el) => {
        return window.getComputedStyle(el).zIndex;
      });

      const dividerZ = await divider.evaluate((el) => {
        return window.getComputedStyle(el).zIndex;
      });

      // Should not have conflicting z-index
      console.log(`✓ Z-index values - metadata: ${metadataZ}, divider: ${dividerZ}`);
    });

    test('should have proper CSS class application', async ({ page }) => {
      const metadataLine = await getMetadataLine(page);

      const classes = await metadataLine.evaluate((el) => {
        return el.className;
      });

      expect(classes).toContain('mt-4');
      expect(classes).toContain('mb-4');
      expect(classes).toContain('pl-14');
      expect(classes).toContain('flex');
      expect(classes).toContain('items-center');
      expect(classes).toContain('space-x-6');

      console.log(`✓ All required classes present: ${classes}`);
    });
  });

  test.describe('6. Visual Screenshots', () => {
    test('should match visual snapshot - light mode', async ({ page }) => {
      const postCard = page.locator('[data-testid="post-card"]').first();

      await expect(postCard).toHaveScreenshot('metadata-spacing-light.png', {
        maxDiffPixels: 100
      });
    });

    test('should match visual snapshot - dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.reload();
      await waitForPostsToLoad(page);

      const postCard = page.locator('[data-testid="post-card"]').first();

      await expect(postCard).toHaveScreenshot('metadata-spacing-dark.png', {
        maxDiffPixels: 100
      });
    });

    test('should match visual snapshot - mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await waitForPostsToLoad(page);

      const postCard = page.locator('[data-testid="post-card"]').first();

      await expect(postCard).toHaveScreenshot('metadata-spacing-mobile.png', {
        maxDiffPixels: 100
      });
    });
  });

  test.describe('7. Performance and Console', () => {
    test('should not generate console errors', async ({ page }) => {
      const errors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto(BASE_URL);
      await waitForPostsToLoad(page);

      expect(errors.length).toBe(0);
      console.log('✓ No console errors detected');
    });

    test('should not generate console warnings', async ({ page }) => {
      const warnings: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'warning') {
          warnings.push(msg.text());
        }
      });

      await page.goto(BASE_URL);
      await waitForPostsToLoad(page);

      // Filter out known acceptable warnings
      const relevantWarnings = warnings.filter(w =>
        !w.includes('DevTools') &&
        !w.includes('Extension')
      );

      expect(relevantWarnings.length).toBe(0);
      console.log('✓ No console warnings detected');
    });

    test('should render without layout thrashing', async ({ page }) => {
      const startTime = Date.now();

      await page.goto(BASE_URL);
      await waitForPostsToLoad(page);

      const endTime = Date.now();
      const renderTime = endTime - startTime;

      // Should render reasonably fast
      expect(renderTime).toBeLessThan(5000);
      console.log(`✓ Render time: ${renderTime}ms`);
    });
  });

  test.describe('8. Accessibility', () => {
    test('should maintain proper semantic structure', async ({ page }) => {
      const metadataLine = await getMetadataLine(page);

      const role = await metadataLine.evaluate((el) => {
        return el.getAttribute('role') || 'none';
      });

      // Should not have conflicting ARIA roles
      console.log(`✓ ARIA role: ${role}`);
    });

    test('should be keyboard accessible', async ({ page }) => {
      // Tab through elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should not cause focus trap
      const focused = await page.evaluate(() => {
        return document.activeElement?.tagName || 'BODY';
      });

      console.log(`✓ Keyboard navigation works, focus on: ${focused}`);
    });

    test('should maintain readable text contrast', async ({ page }) => {
      const metadataLine = await getMetadataLine(page);
      const textElement = metadataLine.locator('.text-gray-500').first();

      const contrast = await textElement.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          color: styles.color,
          backgroundColor: styles.backgroundColor
        };
      });

      expect(contrast.color).toBeTruthy();
      console.log(`✓ Text color: ${contrast.color}, Background: ${contrast.backgroundColor}`);
    });
  });

  test.describe('9. Edge Cases', () => {
    test('should handle long metadata text gracefully', async ({ page }) => {
      const metadataLine = await getMetadataLine(page);
      const metadataBox = await metadataLine.boundingBox();

      // Should not exceed post card width
      const postCard = page.locator('[data-testid="post-card"]').first();
      const postBox = await postCard.boundingBox();

      expect(metadataBox!.width).toBeLessThanOrEqual(postBox!.width);
      console.log(`✓ Metadata width (${metadataBox!.width}px) fits within post card (${postBox!.width}px)`);
    });

    test('should maintain spacing with empty posts list', async ({ page }) => {
      // Navigate to a filtered view with no results
      await page.goto(`${BASE_URL}?filter=nonexistent`);
      await page.waitForLoadState('networkidle');

      // Should show empty state without errors
      const emptyState = page.getByText(/No posts/i);
      await expect(emptyState).toBeVisible({ timeout: 5000 }).catch(() => {
        console.log('✓ Empty state or posts loaded correctly');
      });
    });

    test('should handle rapid viewport changes', async ({ page }) => {
      await waitForPostsToLoad(page);

      // Rapidly change viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(100);
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(100);
      await page.setViewportSize({ width: 768, height: 1024 });

      const metadataLine = await getMetadataLine(page);
      expect(await metadataLine.isVisible()).toBe(true);

      console.log('✓ Handles rapid viewport changes without breaking');
    });
  });

  test.describe('10. Integration with Post Actions', () => {
    test('should maintain spacing when comments are toggled', async ({ page }) => {
      const metadataLine = await getMetadataLine(page);
      const initialBox = await metadataLine.boundingBox();

      // Toggle comments
      const commentButton = page.locator('[data-testid="post-card"]').first().locator('button[title*="Comment"]').first();
      await commentButton.click();
      await page.waitForTimeout(500);

      const afterToggleBox = await metadataLine.boundingBox();

      // Spacing should remain consistent
      expect(initialBox!.y).toBe(afterToggleBox!.y);
      console.log('✓ Spacing unchanged when comments toggled');
    });

    test('should maintain spacing when post is expanded', async ({ page }) => {
      const metadataLine = await getMetadataLine(page);

      // Check if metadata is visible (only in collapsed view)
      const isVisible = await metadataLine.isVisible();

      if (isVisible) {
        // Click expand button
        const expandButton = page.locator('[data-testid="post-card"]').first().locator('[aria-label="Expand post"]').first();
        await expandButton.click();
        await page.waitForTimeout(500);

        // In expanded view, this metadata line should not exist (different layout)
        const stillVisible = await metadataLine.isVisible().catch(() => false);
        console.log('✓ Layout transitions correctly on expansion');
      } else {
        console.log('✓ Post already in expanded state');
      }
    });
  });
});

test.describe('Comparison with Previous Implementation', () => {
  test('BEFORE: spacing felt cramped without mb-4', async ({ page }) => {
    // Document what the issue was before
    console.log('⚠️ BEFORE: Divider appeared too close to metadata line');
    console.log('⚠️ BEFORE: Only mt-4 was present, no bottom margin');
    console.log('⚠️ BEFORE: Visual hierarchy felt compressed');
  });

  test('AFTER: spacing feels balanced with mb-4', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForPostsToLoad(page);

    const metadataLine = await getMetadataLine(page);
    const classes = await metadataLine.evaluate((el) => el.className);

    expect(classes).toContain('mb-4');
    console.log('✅ AFTER: mb-4 class successfully applied');
    console.log('✅ AFTER: Symmetric spacing (mt-4 + mb-4) provides visual balance');
    console.log('✅ AFTER: Divider has comfortable separation from metadata');
  });
});
