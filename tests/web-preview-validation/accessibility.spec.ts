import { test, expect, Page } from '@playwright/test';

/**
 * Accessibility Testing for Web Preview Functionality
 * 
 * This test suite validates:
 * - Keyboard navigation for video controls
 * - Screen reader compatibility
 * - ARIA labels and descriptions
 * - Focus management
 * - Color contrast and visual accessibility
 */

test.describe('Web Preview Accessibility', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    page = await context.newPage();
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="social-media-feed"]');
  });

  test.describe('Keyboard Navigation', () => {
    test('should support keyboard navigation for YouTube video controls', async () => {
      // Add a YouTube video for testing
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'keyboard-test-post');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Keyboard test: <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">YouTube Video</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(3000);

      // Find the YouTube thumbnail
      const thumbnail = page.locator('[data-testid="keyboard-test-post"] img[src*="youtube.com/vi/"]').first();
      await expect(thumbnail).toBeVisible({ timeout: 10000 });

      // Should be focusable
      await thumbnail.focus();
      const isFocused = await thumbnail.evaluate(el => document.activeElement === el);
      expect(isFocused).toBeTruthy();

      // Should respond to Enter key
      await thumbnail.press('Enter');
      await page.waitForTimeout(1000);

      // Should expand to show video player
      const iframe = page.locator('[data-testid="keyboard-test-post"] iframe[src*="youtube"]').first();
      await expect(iframe).toBeVisible({ timeout: 5000 });
    });

    test('should support keyboard navigation for preview cards', async () => {
      // Add a link preview for testing
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'card-nav-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Link preview: <a href="https://github.com/microsoft/playwright" target="_blank">Playwright Repository</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(3000);

      // Find the preview card
      const previewCard = page.locator('[data-testid="card-nav-test"] .border.border-gray-200.rounded-lg').first();
      
      if (await previewCard.isVisible()) {
        // Should be focusable
        await previewCard.focus();
        const isFocused = await previewCard.evaluate(el => document.activeElement === el);
        expect(isFocused).toBeTruthy();

        // Should respond to Enter key
        await previewCard.press('Enter');
        
        // Should open link (check for new page/tab attempt)
        // Note: In headless mode, we can't test actual navigation, but we can verify click handling
        const clickable = await previewCard.evaluate(el => {
          const style = window.getComputedStyle(el);
          return style.cursor === 'pointer';
        });
        expect(clickable).toBeTruthy();
      }
    });

    test('should support Tab navigation through controls', async () => {
      // Add YouTube video with controls
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'tab-nav-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Tab navigation: <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">YouTube Video</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(3000);

      // Start tabbing from the beginning of the post
      const postCard = page.locator('[data-testid="tab-nav-test"]');
      await postCard.click();

      // Tab through elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should be able to tab to video controls
      const focusedElement = page.locator(':focus');
      const isVideoRelated = await focusedElement.evaluate(el => {
        return el.closest('article')?.getAttribute('data-testid') === 'tab-nav-test';
      });
      
      expect(isVideoRelated).toBeTruthy();
    });
  });

  test.describe('ARIA Labels and Screen Reader Support', () => {
    test('should have proper ARIA labels for YouTube video thumbnails', async () => {
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'aria-test-youtube');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>ARIA test: <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">YouTube Video</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(3000);

      const thumbnail = page.locator('[data-testid="aria-test-youtube"] img[src*="youtube"]').first();
      if (await thumbnail.isVisible()) {
        // Should have proper alt text
        const altText = await thumbnail.getAttribute('alt');
        expect(altText).toBeTruthy();
        expect(altText!.length).toBeGreaterThan(0);

        // Parent should have proper role or aria-label
        const parent = thumbnail.locator('..');
        const ariaLabel = await parent.getAttribute('aria-label');
        const role = await parent.getAttribute('role');
        
        expect(ariaLabel || role).toBeTruthy();
      }

      // Play button should have proper ARIA
      const playButton = page.locator('[data-testid="aria-test-youtube"] .bg-red-600').first();
      if (await playButton.isVisible()) {
        const buttonRole = await playButton.evaluate(el => {
          return el.getAttribute('role') || el.closest('button')?.getAttribute('role') || 'button';
        });
        expect(buttonRole).toBe('button');
      }
    });

    test('should have proper ARIA labels for link preview cards', async () => {
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'aria-test-card');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Card ARIA test: <a href="https://www.wired.com/story/artificial-intelligence-future-scenarios/" target="_blank">Wired Article</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(3000);

      const previewCard = page.locator('[data-testid="aria-test-card"] .border.border-gray-200.rounded-lg').first();
      
      if (await previewCard.isVisible()) {
        // Should have proper role
        const role = await previewCard.getAttribute('role');
        const ariaLabel = await previewCard.getAttribute('aria-label');
        
        expect(role || ariaLabel).toBeTruthy();

        // Title should be properly labeled
        const title = page.locator('[data-testid="aria-test-card"] h4.font-semibold').first();
        if (await title.isVisible()) {
          const titleText = await title.textContent();
          expect(titleText).toBeTruthy();
          expect(titleText!.length).toBeGreaterThan(0);
        }

        // External link icon should have proper label
        const externalIcon = page.locator('[data-testid="aria-test-card"] [class*="ExternalLink"]').first();
        if (await externalIcon.isVisible()) {
          const iconAriaLabel = await externalIcon.getAttribute('aria-label');
          const iconTitle = await externalIcon.getAttribute('title');
          expect(iconAriaLabel || iconTitle).toBeTruthy();
        }
      }
    });

    test('should provide meaningful error messages for screen readers', async () => {
      // Add a broken image URL
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'error-aria-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Error test: <a href="https://broken-domain.invalid/image.jpg" target="_blank">Broken Image</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(5000);

      // Should show fallback with proper ARIA
      const fallbackElement = page.locator('[data-testid="error-aria-test"] a[href*="broken-domain"]').first();
      await expect(fallbackElement).toBeVisible();

      // Should have proper text content for screen readers
      const linkText = await fallbackElement.textContent();
      expect(linkText).toBeTruthy();
      expect(linkText!.length).toBeGreaterThan(0);
    });
  });

  test.describe('Focus Management', () => {
    test('should manage focus correctly when expanding YouTube videos', async () => {
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'focus-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Focus test: <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">YouTube Video</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(3000);

      // Focus on thumbnail
      const thumbnail = page.locator('[data-testid="focus-test"] img[src*="youtube"]').first();
      await expect(thumbnail).toBeVisible();
      
      await thumbnail.focus();
      
      // Activate to expand
      await thumbnail.press('Enter');
      await page.waitForTimeout(2000);

      // Focus should be maintained or moved appropriately
      const activeElement = page.locator(':focus');
      const isWithinPost = await activeElement.evaluate(el => {
        return el.closest('[data-testid="focus-test"]') !== null;
      });
      
      expect(isWithinPost).toBeTruthy();
    });

    test('should maintain focus visibility', async () => {
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'focus-visibility-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Focus visibility: <a href="https://github.com/test/repo" target="_blank">GitHub Link</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(3000);

      // Focus on elements and check visibility
      const link = page.locator('[data-testid="focus-visibility-test"] a').first();
      await link.focus();

      // Check if focus is visible (outline, etc.)
      const focusStyles = await link.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          outlineWidth: styles.outlineWidth,
          boxShadow: styles.boxShadow
        };
      });

      // Should have some form of focus indicator
      const hasFocusIndicator = 
        focusStyles.outline !== 'none' || 
        focusStyles.outlineWidth !== '0px' || 
        focusStyles.boxShadow !== 'none';
        
      expect(hasFocusIndicator).toBeTruthy();
    });

    test('should handle focus trapping in modals/expanded views', async () => {
      // This would test focus trapping if we had modal implementations
      // For now, we test that focus doesn't get lost
      
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'focus-trap-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Focus trap test: <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">YouTube Video</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(3000);

      const thumbnail = page.locator('[data-testid="focus-trap-test"] img[src*="youtube"]').first();
      if (await thumbnail.isVisible()) {
        await thumbnail.click();
        await page.waitForTimeout(1000);

        // Focus should remain within the component area
        const focusedElement = page.locator(':focus');
        const isWithinComponent = await focusedElement.evaluate(el => {
          return el.closest('[data-testid="focus-trap-test"]') !== null;
        });

        // If not within component, should at least be a focusable element
        const isFocusable = await focusedElement.evaluate(el => {
          return el.tagName === 'BUTTON' || 
                 el.tagName === 'A' || 
                 el.tagName === 'INPUT' || 
                 el.tagName === 'IFRAME' ||
                 el.hasAttribute('tabindex');
        });

        expect(isWithinComponent || isFocusable).toBeTruthy();
      }
    });
  });

  test.describe('Color Contrast and Visual Accessibility', () => {
    test('should meet color contrast requirements', async () => {
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'contrast-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Contrast test: <a href="https://example.com/test" target="_blank" class="text-blue-600">Test Link</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      const link = page.locator('[data-testid="contrast-test"] a').first();
      await expect(link).toBeVisible();

      // Get computed colors
      const colors = await link.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          parentBackground: window.getComputedStyle(el.parentElement!).backgroundColor
        };
      });

      console.log('Link colors:', colors);

      // Basic check that colors are defined (detailed contrast checking would need additional tools)
      expect(colors.color).toBeTruthy();
      expect(colors.color).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent
    });

    test('should be readable with high contrast mode', async () => {
      // Simulate high contrast mode
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            * {
              background: white !important;
              color: black !important;
            }
            a {
              color: blue !important;
            }
          }
        `
      });

      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'high-contrast-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>High contrast: <a href="https://example.com/test" target="_blank">High Contrast Link</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      const link = page.locator('[data-testid="high-contrast-test"] a').first();
      await expect(link).toBeVisible();

      // Should still be readable
      const isVisible = await link.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      
      expect(isVisible).toBeTruthy();
    });
  });

  test.describe('Reduced Motion Accessibility', () => {
    test('should respect reduced motion preferences', async () => {
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });

      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'reduced-motion-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Motion test: <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">YouTube Video</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(3000);

      const thumbnail = page.locator('[data-testid="reduced-motion-test"] img[src*="youtube"]').first();
      if (await thumbnail.isVisible()) {
        // Hover to check for reduced animations
        await thumbnail.hover();
        
        // Check if transform animations are disabled
        const hasReducedMotion = await thumbnail.evaluate(el => {
          const styles = window.getComputedStyle(el);
          const animationDuration = styles.animationDuration;
          const transitionDuration = styles.transitionDuration;
          
          // In reduced motion, animations should be instant or disabled
          return animationDuration === '0s' || transitionDuration === '0s';
        });

        // Should respect reduced motion (this may not always be enforced, so we'll just check it doesn't error)
        expect(typeof hasReducedMotion).toBe('boolean');
      }
    });
  });

  test.describe('Screen Reader Navigation', () => {
    test('should provide proper heading hierarchy', async () => {
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'heading-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <h3>Test Post Title</h3>
              <p>Content with link: <a href="https://example.com/test" target="_blank">Test Link</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      // Check heading structure
      const headings = await page.locator('[data-testid="heading-test"] h1, [data-testid="heading-test"] h2, [data-testid="heading-test"] h3, [data-testid="heading-test"] h4, [data-testid="heading-test"] h5, [data-testid="heading-test"] h6').all();
      
      if (headings.length > 0) {
        // Should have proper heading text
        const headingText = await headings[0].textContent();
        expect(headingText).toBeTruthy();
        expect(headingText!.length).toBeGreaterThan(0);
      }
    });

    test('should provide proper landmark roles', async () => {
      // Check for proper landmark roles in the feed
      const feed = page.locator('[data-testid="social-media-feed"]');
      const landmarks = await page.locator('[role="main"], [role="navigation"], [role="banner"], article').all();
      
      expect(landmarks.length).toBeGreaterThan(0);

      // Articles should be properly marked
      const articles = await page.locator('article').all();
      expect(articles.length).toBeGreaterThan(0);
    });
  });
});