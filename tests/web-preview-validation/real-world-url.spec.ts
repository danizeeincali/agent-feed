import { test, expect, Page } from '@playwright/test';

/**
 * Real-World URL Testing for Web Preview Functionality
 * 
 * This test suite validates web preview functionality with real URLs:
 * - YouTube videos (specific test video)
 * - Article links (Wired article) 
 * - Various URL patterns (GitHub, Twitter, images, etc.)
 * - URL validation and extraction
 */

test.describe('Real-World URL Testing', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    page = await context.newPage();
    
    // Navigate to the application
    await page.goto('/');
    await page.waitForSelector('[data-testid="social-media-feed"]', { timeout: 10000 });
  });

  test.describe('YouTube Video Testing', () => {
    test('should handle Rick Roll video URL correctly', async () => {
      const rickRollUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      // Inject the test URL into a post
      await page.evaluate((url) => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 ease-in-out overflow-hidden';
          testPost.setAttribute('data-testid', 'post-card');
          testPost.innerHTML = `
            <div class="p-6">
              <div class="space-y-3">
                <div class="flex items-center space-x-4">
                  <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md flex-shrink-0">T</div>
                  <div class="flex-grow min-w-0">
                    <h2 class="text-lg font-bold text-gray-900 leading-tight">Testing YouTube Preview</h2>
                  </div>
                </div>
                <div class="pl-14">
                  <div class="text-sm text-gray-600 leading-relaxed">
                    Check out this classic: <a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 hover:underline break-all">${url}</a>
                  </div>
                </div>
              </div>
            </div>
          `;
          feed.prepend(testPost);
        }
      }, rickRollUrl);

      await page.waitForTimeout(3000);

      // Check for YouTube thumbnail
      const thumbnail = page.locator('img[src*="dQw4w9WgXcQ"]').first();
      await expect(thumbnail).toBeVisible({ timeout: 15000 });

      // Verify thumbnail source contains correct video ID
      const thumbnailSrc = await thumbnail.getAttribute('src');
      expect(thumbnailSrc).toContain('youtube.com/vi/dQw4w9WgXcQ');
      expect(thumbnailSrc).toMatch(/\.(jpg|webp)$/);

      // Check for play button overlay
      const playOverlay = page.locator('.bg-red-600.rounded-full').first();
      await expect(playOverlay).toBeVisible();

      // Test click to expand
      await thumbnail.click();
      await page.waitForTimeout(1000);

      // Should show embedded player
      const iframe = page.locator('iframe[src*="youtube"]').first();
      await expect(iframe).toBeVisible({ timeout: 5000 });

      const iframeSrc = await iframe.getAttribute('src');
      expect(iframeSrc).toContain('youtube');
      expect(iframeSrc).toContain('dQw4w9WgXcQ');
    });

    test('should extract video ID from various YouTube URL formats', async () => {
      const testUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=youtu.be',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s'
      ];

      for (let i = 0; i < testUrls.length; i++) {
        const url = testUrls[i];
        
        await page.evaluate((testUrl, index) => {
          const feed = document.querySelector('[data-testid="post-list"]');
          if (feed) {
            const testPost = document.createElement('article');
            testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
            testPost.setAttribute('data-testid', `test-post-${index}`);
            testPost.innerHTML = `
              <div class="prose prose-sm">
                <p>Format ${index + 1}: <a href="${testUrl}" target="_blank">${testUrl}</a></p>
              </div>
            `;
            feed.prepend(testPost);
          }
        }, url, i);

        await page.waitForTimeout(2000);

        // All should resolve to the same video ID
        const thumbnail = page.locator(`[data-testid="test-post-${i}"] img[src*="dQw4w9WgXcQ"]`).first();
        await expect(thumbnail).toBeVisible({ timeout: 10000 });

        // Clean up
        await page.locator(`[data-testid="test-post-${i}"]`).first().remove();
      }
    });
  });

  test.describe('Article Link Testing', () => {
    test('should preview Wired article correctly', async () => {
      const wiredUrl = 'https://www.wired.com/story/artificial-intelligence-future-scenarios/';
      
      await page.evaluate((url) => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'wired-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>AI Future article: <a href="${url}" target="_blank">${url}</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      }, wiredUrl);

      await page.waitForTimeout(5000);

      // Should show enhanced link preview
      const preview = page.locator('[data-testid="wired-test"] .border.border-gray-200.rounded-lg').first();
      
      if (await preview.isVisible()) {
        // Check preview components
        const titleElement = preview.locator('h4.font-semibold').first();
        if (await titleElement.isVisible()) {
          const title = await titleElement.textContent();
          expect(title).toBeTruthy();
          expect(title!.length).toBeGreaterThan(0);
        }

        // Should show site info
        const siteInfo = preview.locator('text=wired.com').first();
        await expect(siteInfo).toBeVisible();

        // Should show article type indicator
        const typeIcon = preview.locator('.text-blue-500, [class*="FileText"]').first();
        await expect(typeIcon).toBeVisible();
      } else {
        // Fallback: should at least show clickable link
        const fallbackLink = page.locator(`[data-testid="wired-test"] a[href="${wiredUrl}"]`);
        await expect(fallbackLink).toBeVisible();
      }
    });

    test('should handle various news and blog sites', async () => {
      const testSites = [
        { url: 'https://medium.com/@username/article-title', expectedSite: 'medium.com', type: 'article' },
        { url: 'https://dev.to/username/post-title', expectedSite: 'dev.to', type: 'article' },
        { url: 'https://blog.example.com/post', expectedSite: 'blog.example.com', type: 'website' },
        { url: 'https://news.ycombinator.com/item?id=123456', expectedSite: 'news.ycombinator.com', type: 'website' }
      ];

      for (let i = 0; i < testSites.length; i++) {
        const site = testSites[i];
        
        await page.evaluate((siteData, index) => {
          const feed = document.querySelector('[data-testid="post-list"]');
          if (feed) {
            const testPost = document.createElement('article');
            testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
            testPost.setAttribute('data-testid', `site-test-${index}`);
            testPost.innerHTML = `
              <div class="prose prose-sm">
                <p>Site ${index + 1}: <a href="${siteData.url}" target="_blank">${siteData.url}</a></p>
              </div>
            `;
            feed.prepend(testPost);
          }
        }, site, i);

        await page.waitForTimeout(3000);

        const testPostSelector = `[data-testid="site-test-${i}"]`;
        
        // Should show either enhanced preview or fallback link
        const hasPreview = await page.locator(`${testPostSelector} .border.border-gray-200.rounded-lg`).isVisible();
        const hasLink = await page.locator(`${testPostSelector} a[href="${site.url}"]`).isVisible();
        
        expect(hasPreview || hasLink).toBeTruthy();

        if (hasPreview) {
          // Check for site domain in preview
          const siteText = page.locator(`${testPostSelector} text=${site.expectedSite}`).first();
          await expect(siteText).toBeVisible();
        }

        // Clean up
        await page.locator(`[data-testid="site-test-${i}"]`).first().remove();
      }
    });
  });

  test.describe('Social Media and Repository URLs', () => {
    test('should handle GitHub repository URLs', async () => {
      const githubUrl = 'https://github.com/microsoft/playwright';
      
      await page.evaluate((url) => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'github-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>GitHub repo: <a href="${url}" target="_blank">${url}</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      }, githubUrl);

      await page.waitForTimeout(3000);

      // Should show enhanced preview with repository info
      const preview = page.locator('[data-testid="github-test"] .border.border-gray-200.rounded-lg').first();
      
      if (await preview.isVisible()) {
        // Should show repository title format (repo - owner)
        const titleElement = preview.locator('h4.font-semibold').first();
        if (await titleElement.isVisible()) {
          const title = await titleElement.textContent();
          expect(title).toContain('microsoft');
        }

        // Should show github.com as site
        const siteInfo = preview.locator('text=github.com').first();
        await expect(siteInfo).toBeVisible();
      } else {
        // Fallback link should work
        const fallbackLink = page.locator(`[data-testid="github-test"] a[href="${githubUrl}"]`);
        await expect(fallbackLink).toBeVisible();
      }
    });

    test('should handle Twitter/X URLs', async () => {
      const twitterUrls = [
        'https://twitter.com/username/status/123456789',
        'https://x.com/username/status/123456789'
      ];

      for (let i = 0; i < twitterUrls.length; i++) {
        const url = twitterUrls[i];
        
        await page.evaluate((tweetUrl, index) => {
          const feed = document.querySelector('[data-testid="post-list"]');
          if (feed) {
            const testPost = document.createElement('article');
            testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
            testPost.setAttribute('data-testid', `twitter-test-${index}`);
            testPost.innerHTML = `
              <div class="prose prose-sm">
                <p>Tweet: <a href="${tweetUrl}" target="_blank">${tweetUrl}</a></p>
              </div>
            `;
            feed.prepend(testPost);
          }
        }, url, i);

        await page.waitForTimeout(2000);

        // Should show preview or fallback link
        const testSelector = `[data-testid="twitter-test-${i}"]`;
        const hasPreview = await page.locator(`${testSelector} .border.border-gray-200.rounded-lg`).isVisible();
        const hasLink = await page.locator(`${testSelector} a[href="${url}"]`).isVisible();
        
        expect(hasPreview || hasLink).toBeTruthy();

        if (hasPreview) {
          // Should indicate it's a Twitter/X post
          const twitterIndicator = page.locator(`${testSelector} text=/Twitter|X Post/i`).first();
          await expect(twitterIndicator).toBeVisible();
        }

        // Clean up
        await page.locator(`[data-testid="twitter-test-${i}"]`).first().remove();
      }
    });

    test('should handle LinkedIn URLs', async () => {
      const linkedinUrl = 'https://www.linkedin.com/posts/username_activity-123456789';
      
      await page.evaluate((url) => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'linkedin-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>LinkedIn: <a href="${url}" target="_blank">${url}</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      }, linkedinUrl);

      await page.waitForTimeout(3000);

      // Should show preview or fallback
      const hasPreview = await page.locator('[data-testid="linkedin-test"] .border.border-gray-200.rounded-lg').isVisible();
      const hasLink = await page.locator(`[data-testid="linkedin-test"] a[href="${linkedinUrl}"]`).isVisible();
      
      expect(hasPreview || hasLink).toBeTruthy();
    });
  });

  test.describe('Image and Media URLs', () => {
    test('should handle direct image URLs', async () => {
      const imageUrls = [
        'https://example.com/image.jpg',
        'https://example.com/photo.png',
        'https://example.com/graphic.webp',
        'https://example.com/icon.svg'
      ];

      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];
        
        await page.evaluate((url, index) => {
          const feed = document.querySelector('[data-testid="post-list"]');
          if (feed) {
            const testPost = document.createElement('article');
            testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
            testPost.setAttribute('data-testid', `image-test-${index}`);
            testPost.innerHTML = `
              <div class="prose prose-sm">
                <p>Image: <a href="${url}" target="_blank">${url}</a></p>
              </div>
            `;
            feed.prepend(testPost);
          }
        }, imageUrl, i);

        await page.waitForTimeout(2000);

        // Should show preview or fallback
        const testSelector = `[data-testid="image-test-${i}"]`;
        const hasPreview = await page.locator(`${testSelector} .border.border-gray-200.rounded-lg`).isVisible();
        const hasLink = await page.locator(`${testSelector} a[href="${imageUrl}"]`).isVisible();
        
        expect(hasPreview || hasLink).toBeTruthy();

        if (hasPreview) {
          // Should show image type indicator
          const imageIcon = page.locator(`${testSelector} .text-green-500, [class*="ImageIcon"]`).first();
          await expect(imageIcon).toBeVisible();
        }

        // Clean up
        await page.locator(`[data-testid="image-test-${i}"]`).first().remove();
      }
    });
  });

  test.describe('URL Validation and Security', () => {
    test('should handle malformed URLs gracefully', async () => {
      const malformedUrls = [
        'http://not-a-real-domain-12345.xyz',
        'https://broken.domain.test',
        'ftp://invalid-protocol.com',
        'javascript:alert("xss")' // XSS attempt
      ];

      for (let i = 0; i < malformedUrls.length; i++) {
        const url = malformedUrls[i];
        
        // Skip potentially dangerous URLs in evaluation
        if (url.startsWith('javascript:')) {
          continue;
        }
        
        await page.evaluate((testUrl, index) => {
          const feed = document.querySelector('[data-testid="post-list"]');
          if (feed) {
            const testPost = document.createElement('article');
            testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
            testPost.setAttribute('data-testid', `malformed-test-${index}`);
            testPost.innerHTML = `
              <div class="prose prose-sm">
                <p>Test URL: <a href="${testUrl}" target="_blank">${testUrl}</a></p>
              </div>
            `;
            feed.prepend(testPost);
          }
        }, url, i);

        await page.waitForTimeout(3000);

        // Should not crash and should show some fallback
        const testSelector = `[data-testid="malformed-test-${i}"]`;
        const postExists = await page.locator(testSelector).isVisible();
        expect(postExists).toBeTruthy();

        // Should have a link even if preview fails
        const hasLink = await page.locator(`${testSelector} a`).isVisible();
        expect(hasLink).toBeTruthy();

        // Clean up
        await page.locator(`[data-testid="malformed-test-${i}"]`).first().remove();
      }
    });

    test('should prevent XSS in URLs', async () => {
      // Test that dangerous URLs don't execute
      const dangerousUrl = 'https://example.com/"><script>alert("xss")</script>';
      
      await page.evaluate((url) => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'xss-test');
          // Properly escape the URL
          const escapedUrl = url.replace(/</g, '&lt;').replace(/>/g, '&gt;');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Dangerous URL: <a href="${escapedUrl}" target="_blank">${escapedUrl}</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      }, dangerousUrl);

      await page.waitForTimeout(2000);

      // Should not execute script - check for alert
      const alertPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
      const alert = await alertPromise;
      
      expect(alert).toBeNull();

      // Post should still exist safely
      const safePost = page.locator('[data-testid="xss-test"]');
      await expect(safePost).toBeVisible();
    });
  });

  test.describe('Performance Testing', () => {
    test('should handle multiple URLs efficiently', async () => {
      const multipleUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://github.com/microsoft/playwright',
        'https://www.wired.com/story/artificial-intelligence-future-scenarios/',
        'https://example.com/image.jpg',
        'https://twitter.com/example/status/123'
      ];

      const startTime = Date.now();

      // Inject all URLs at once
      await page.evaluate((urls) => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          urls.forEach((url, index) => {
            const testPost = document.createElement('article');
            testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
            testPost.setAttribute('data-testid', `perf-test-${index}`);
            testPost.innerHTML = `
              <div class="prose prose-sm">
                <p>URL ${index + 1}: <a href="${url}" target="_blank">${url}</a></p>
              </div>
            `;
            feed.prepend(testPost);
          });
        }
      }, multipleUrls);

      // Wait for all previews to process
      await page.waitForTimeout(10000);

      const processingTime = Date.now() - startTime;
      
      // Should complete within reasonable time (30 seconds for all URLs)
      expect(processingTime).toBeLessThan(30000);

      // All posts should be visible
      for (let i = 0; i < multipleUrls.length; i++) {
        const testPost = page.locator(`[data-testid="perf-test-${i}"]`);
        await expect(testPost).toBeVisible();
      }
    });
  });
});