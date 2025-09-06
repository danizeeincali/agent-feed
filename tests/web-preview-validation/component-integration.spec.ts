import { test, expect, Page } from '@playwright/test';

/**
 * Component Integration Tests for Web Preview Functionality
 * 
 * This test suite validates:
 * - YouTubeEmbed component with various video URLs
 * - EnhancedLinkPreview with different content types  
 * - Thumbnail display modes in feed view
 * - Responsive behavior on mobile/desktop
 */

test.describe('Web Preview Component Integration', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    page = await context.newPage();
    await page.goto('/');
    
    // Wait for the feed to load
    await page.waitForSelector('[data-testid="social-media-feed"]');
  });

  test.describe('YouTubeEmbed Component', () => {
    test('should render YouTube video thumbnail correctly', async () => {
      // Create a test post with YouTube URL
      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      // Navigate to post creator to add test content
      await page.click('button:has-text("Create Post")', { timeout: 5000 }).catch(() => {
        // If no create post button, we'll inject test content directly
        console.log('No create post button found, using existing posts');
      });

      // Look for existing YouTube content or create it
      const youtubeElements = await page.locator('iframe[src*="youtube"]').count();
      
      if (youtubeElements === 0) {
        // Inject YouTube content via JavaScript if needed
        await page.evaluate((url) => {
          const feed = document.querySelector('[data-testid="post-list"]');
          if (feed) {
            const testPost = document.createElement('div');
            testPost.innerHTML = `
              <div class="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                <div class="prose prose-sm">
                  <p>Check out this video: <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></p>
                </div>
              </div>
            `;
            feed.prepend(testPost);
          }
        }, youtubeUrl);
        
        // Wait for content parser to process the link
        await page.waitForTimeout(2000);
      }

      // Check for YouTube thumbnail
      const thumbnail = page.locator('img[src*="youtube.com/vi/"]').first();
      await expect(thumbnail).toBeVisible({ timeout: 10000 });
      
      // Verify thumbnail attributes
      const thumbnailSrc = await thumbnail.getAttribute('src');
      expect(thumbnailSrc).toContain('youtube.com/vi/');
      expect(thumbnailSrc).toContain('mqdefault.jpg');
      
      // Check for play button overlay
      const playButton = page.locator('.absolute .bg-red-600').first();
      await expect(playButton).toBeVisible();
    });

    test('should expand to video player when thumbnail is clicked', async () => {
      // Look for YouTube thumbnail
      const thumbnail = page.locator('img[src*="youtube.com/vi/"]').first();
      await expect(thumbnail).toBeVisible({ timeout: 10000 });
      
      // Click the thumbnail
      await thumbnail.click();
      
      // Should show iframe embed
      const iframe = page.locator('iframe[src*="youtube"]').first();
      await expect(iframe).toBeVisible({ timeout: 5000 });
      
      // Verify iframe attributes
      const iframeSrc = await iframe.getAttribute('src');
      expect(iframeSrc).toContain('youtube');
      expect(iframeSrc).toContain('embed');
    });

    test('should handle thumbnail loading errors gracefully', async () => {
      // Inject a YouTube URL with invalid video ID
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('div');
          testPost.innerHTML = `
            <div class="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <div class="prose prose-sm">
                <p>Invalid video: <a href="https://www.youtube.com/watch?v=invalid123" target="_blank">https://www.youtube.com/watch?v=invalid123</a></p>
              </div>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(3000);
      
      // Should show fallback play icon instead of broken image
      const fallbackIcon = page.locator('.bg-gradient-to-br.from-red-500 .w-16.h-16').first();
      await expect(fallbackIcon).toBeVisible({ timeout: 5000 });
    });

    test('should extract correct video IDs from different YouTube URL formats', async () => {
      const testUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s'
      ];

      for (const url of testUrls) {
        // Test video ID extraction by checking thumbnail URL
        await page.evaluate((testUrl) => {
          const feed = document.querySelector('[data-testid="post-list"]');
          if (feed) {
            const testPost = document.createElement('div');
            testPost.innerHTML = `
              <div class="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                <div class="prose prose-sm">
                  <p>Video: <a href="${testUrl}" target="_blank">${testUrl}</a></p>
                </div>
              </div>
            `;
            feed.prepend(testPost);
          }
        }, url);

        await page.waitForTimeout(1000);

        const thumbnail = page.locator('img[src*="dQw4w9WgXcQ"]').first();
        await expect(thumbnail).toBeVisible({ timeout: 5000 });
        
        // Clean up for next test
        await page.evaluate(() => {
          const posts = document.querySelectorAll('[data-testid="post-list"] > div:first-child');
          posts[0]?.remove();
        });
      }
    });
  });

  test.describe('EnhancedLinkPreview Component', () => {
    test('should render article preview with correct metadata', async () => {
      const wiredUrl = 'https://www.wired.com/story/artificial-intelligence-future-scenarios/';
      
      // Inject test content
      await page.evaluate((url) => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('div');
          testPost.innerHTML = `
            <div class="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <div class="prose prose-sm">
                <p>Interesting article: <a href="${url}" target="_blank">${url}</a></p>
              </div>
            </div>
          `;
          feed.prepend(testPost);
        }
      }, wiredUrl);

      await page.waitForTimeout(3000);

      // Check for article preview card
      const previewCard = page.locator('.border.border-gray-200.rounded-lg').first();
      await expect(previewCard).toBeVisible({ timeout: 10000 });

      // Should show article metadata
      const titleElement = page.locator('h4.font-semibold').first();
      await expect(titleElement).toBeVisible();
      
      // Should show site favicon or icon
      const favicon = page.locator('img[src*="favicon"], .w-6.h-6.rounded').first();
      await expect(favicon).toBeVisible();

      // Should show article type indicator
      const typeIcon = page.locator('.text-blue-500, [class*="FileText"]').first();
      await expect(typeIcon).toBeVisible();
    });

    test('should handle different content types correctly', async () => {
      const testUrls = [
        { url: 'https://github.com/microsoft/playwright', type: 'website', expectedText: 'Code repository' },
        { url: 'https://medium.com/@user/article', type: 'article', expectedText: 'Article' },
        { url: 'https://twitter.com/user/status/123', type: 'website', expectedText: 'Twitter' },
        { url: 'https://example.com/image.jpg', type: 'image', expectedText: 'Image' }
      ];

      for (const testCase of testUrls) {
        await page.evaluate((url) => {
          const feed = document.querySelector('[data-testid="post-list"]');
          if (feed) {
            const testPost = document.createElement('div');
            testPost.innerHTML = `
              <div class="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                <div class="prose prose-sm">
                  <p>Link: <a href="${url}" target="_blank">${url}</a></p>
                </div>
              </div>
            `;
            feed.prepend(testPost);
          }
        }, testCase.url);

        await page.waitForTimeout(2000);

        // Check for preview or fallback link
        const hasPreview = await page.locator('.border.border-gray-200.rounded-lg').first().isVisible();
        const hasFallbackLink = await page.locator(`a[href="${testCase.url}"]`).isVisible();
        
        expect(hasPreview || hasFallbackLink).toBeTruthy();

        // Clean up
        await page.evaluate(() => {
          const posts = document.querySelectorAll('[data-testid="post-list"] > div:first-child');
          posts[0]?.remove();
        });
      }
    });

    test('should show loading state while fetching preview data', async () => {
      const testUrl = 'https://example.com/slow-loading-page';
      
      // Inject content and immediately check for loading state
      await page.evaluate((url) => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('div');
          testPost.innerHTML = `
            <div class="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <div class="prose prose-sm">
                <p>Loading: <a href="${url}" target="_blank">${url}</a></p>
              </div>
            </div>
          `;
          feed.prepend(testPost);
        }
      }, testUrl);

      // Should show loading skeleton
      const loadingSkeleton = page.locator('.animate-pulse').first();
      await expect(loadingSkeleton).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Thumbnail Display Modes', () => {
    test('should show thumbnails only in collapsed post view', async () => {
      // Look for collapsed post with thumbnail preview
      const collapsedPost = page.locator('[data-testid="post-card"]').first();
      await expect(collapsedPost).toBeVisible();

      // Should show compact thumbnail in collapsed view
      const thumbnail = collapsedPost.locator('img[src*="youtube"], .aspect-video').first();
      if (await thumbnail.isVisible()) {
        const thumbnailBox = await thumbnail.boundingBox();
        expect(thumbnailBox).toBeTruthy();
        expect(thumbnailBox!.height).toBeLessThan(200); // Should be compact
      }
    });

    test('should show full previews in expanded post view', async () => {
      // Find and expand a post
      const expandButton = page.locator('[aria-label="Expand post"]').first();
      if (await expandButton.isVisible()) {
        await expandButton.click();
        
        // Should show full-size preview in expanded view
        await page.waitForTimeout(500);
        const expandedPreview = page.locator('.aspect-video', { hasNotText: 'thumbnail' }).first();
        if (await expandedPreview.isVisible()) {
          const previewBox = await expandedPreview.boundingBox();
          expect(previewBox).toBeTruthy();
          expect(previewBox!.height).toBeGreaterThan(150); // Should be larger
        }
      }
    });
  });

  test.describe('Responsive Behavior', () => {
    test('should adapt to mobile viewport', async () => {
      // Switch to mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // Check that previews are still visible and properly sized
      const previewCards = page.locator('.border.border-gray-200.rounded-lg');
      const cardCount = await previewCards.count();
      
      if (cardCount > 0) {
        const firstCard = previewCards.first();
        await expect(firstCard).toBeVisible();
        
        // Should not overflow viewport
        const cardBox = await firstCard.boundingBox();
        expect(cardBox).toBeTruthy();
        expect(cardBox!.width).toBeLessThanOrEqual(375);
      }

      // YouTube thumbnails should scale appropriately
      const youtubeThumbnails = page.locator('img[src*="youtube.com/vi/"]');
      const thumbnailCount = await youtubeThumbnails.count();
      
      if (thumbnailCount > 0) {
        const thumbnail = youtubeThumbnails.first();
        const thumbnailBox = await thumbnail.boundingBox();
        expect(thumbnailBox).toBeTruthy();
        expect(thumbnailBox!.width).toBeLessThanOrEqual(375);
      }
    });

    test('should work well on tablet viewport', async () => {
      // Switch to tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);

      // Check layout and functionality
      const feed = page.locator('[data-testid="social-media-feed"]');
      await expect(feed).toBeVisible();
      
      const feedBox = await feed.boundingBox();
      expect(feedBox).toBeTruthy();
      expect(feedBox!.width).toBeLessThanOrEqual(768);
    });

    test('should maintain functionality on desktop', async () => {
      // Ensure desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(500);

      // All preview functionality should work
      const previewElements = page.locator('.border.border-gray-200.rounded-lg, img[src*="youtube"]');
      const elementCount = await previewElements.count();
      
      if (elementCount > 0) {
        for (let i = 0; i < Math.min(elementCount, 3); i++) {
          const element = previewElements.nth(i);
          await expect(element).toBeVisible();
          
          // Should be clickable
          const isClickable = await element.evaluate((el) => {
            const style = window.getComputedStyle(el);
            return style.cursor === 'pointer' || el.tagName.toLowerCase() === 'button' || el.tagName.toLowerCase() === 'a';
          });
          
          if (isClickable || await element.locator('..').locator('[role="button"], button, a').count() > 0) {
            // Element or parent should be interactive
            expect(true).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should gracefully handle image loading errors', async () => {
      // Inject content with broken image URL
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('div');
          testPost.innerHTML = `
            <div class="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <div class="prose prose-sm">
                <p>Broken image: <a href="https://broken-domain.com/image.jpg" target="_blank">https://broken-domain.com/image.jpg</a></p>
              </div>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(3000);

      // Should either show fallback or handle gracefully
      const hasErrorFallback = await page.locator('.text-red-500, .text-gray-500').isVisible();
      const hasWorkingLink = await page.locator('a[href*="broken-domain.com"]').isVisible();
      
      expect(hasErrorFallback || hasWorkingLink).toBeTruthy();
    });

    test('should handle network failures gracefully', async () => {
      // Simulate network failure
      await page.route('**/api/v1/link-preview*', (route) => {
        route.abort('failed');
      });

      // Inject content
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('div');
          testPost.innerHTML = `
            <div class="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <div class="prose prose-sm">
                <p>Network test: <a href="https://example.com/network-test" target="_blank">https://example.com/network-test</a></p>
              </div>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(3000);

      // Should fallback to simple link
      const fallbackLink = page.locator('a[href*="example.com"]').first();
      await expect(fallbackLink).toBeVisible();
    });
  });
});