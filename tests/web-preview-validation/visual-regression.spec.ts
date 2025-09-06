import { test, expect, Page } from '@playwright/test';

/**
 * Visual Regression Testing for Web Preview Functionality
 * 
 * This test suite validates:
 * - Visual consistency of preview components
 * - Layout stability across different content
 * - Animation and transition states
 * - Responsive design visual integrity
 */

test.describe('Web Preview Visual Regression', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    page = await context.newPage();
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="social-media-feed"]');
  });

  test.describe('YouTube Thumbnail Rendering', () => {
    test('should render YouTube thumbnail consistently', async () => {
      // Add YouTube content
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'youtube-visual-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Visual test: <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">Never Gonna Give You Up</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(5000);

      // Wait for thumbnail to load
      const thumbnail = page.locator('[data-testid="youtube-visual-test"] img[src*="youtube.com/vi/"]').first();
      await expect(thumbnail).toBeVisible({ timeout: 15000 });

      // Take screenshot of the thumbnail component
      const postCard = page.locator('[data-testid="youtube-visual-test"]');
      await expect(postCard).toHaveScreenshot('youtube-thumbnail-collapsed.png');
    });

    test('should render YouTube expanded view consistently', async () => {
      // Add and expand YouTube content
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'youtube-expanded-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Expanded test: <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">YouTube Video</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(3000);

      // Click to expand
      const thumbnail = page.locator('[data-testid="youtube-expanded-test"] img[src*="youtube"]').first();
      if (await thumbnail.isVisible()) {
        await thumbnail.click();
        await page.waitForTimeout(2000);

        // Take screenshot of expanded view
        const expandedPost = page.locator('[data-testid="youtube-expanded-test"]');
        await expect(expandedPost).toHaveScreenshot('youtube-thumbnail-expanded.png');
      }
    });

    test('should render YouTube thumbnail hover states', async () => {
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'youtube-hover-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Hover test: <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">YouTube Video</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(3000);

      const thumbnail = page.locator('[data-testid="youtube-hover-test"] img[src*="youtube"]').first();
      if (await thumbnail.isVisible()) {
        // Hover state
        await thumbnail.hover();
        await page.waitForTimeout(500);

        const postCard = page.locator('[data-testid="youtube-hover-test"]');
        await expect(postCard).toHaveScreenshot('youtube-thumbnail-hover.png');
      }
    });
  });

  test.describe('Enhanced Link Preview Rendering', () => {
    test('should render article preview cards consistently', async () => {
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'article-preview-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Article preview: <a href="https://www.wired.com/story/artificial-intelligence-future-scenarios/" target="_blank">AI Future Scenarios</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(5000);

      // Take screenshot if preview loads
      const previewCard = page.locator('[data-testid="article-preview-test"] .border.border-gray-200.rounded-lg').first();
      
      if (await previewCard.isVisible({ timeout: 10000 })) {
        await expect(previewCard).toHaveScreenshot('article-preview-card.png');
      } else {
        // Screenshot fallback link if preview doesn't load
        const fallbackLink = page.locator('[data-testid="article-preview-test"] a');
        await expect(fallbackLink).toHaveScreenshot('article-preview-fallback.png');
      }
    });

    test('should render GitHub repository previews consistently', async () => {
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'github-preview-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>GitHub repo: <a href="https://github.com/microsoft/playwright" target="_blank">Playwright</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(5000);

      const previewCard = page.locator('[data-testid="github-preview-test"] .border.border-gray-200.rounded-lg').first();
      
      if (await previewCard.isVisible({ timeout: 10000 })) {
        await expect(previewCard).toHaveScreenshot('github-preview-card.png');
      } else {
        const fallbackLink = page.locator('[data-testid="github-preview-test"] a');
        await expect(fallbackLink).toHaveScreenshot('github-preview-fallback.png');
      }
    });

    test('should render loading states consistently', async () => {
      // Inject loading skeleton manually to ensure consistency
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'loading-state-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Loading state:</p>
              <div class="border border-gray-200 rounded-lg p-4 bg-gray-50 animate-pulse">
                <div class="flex items-center space-x-3">
                  <div class="w-16 h-16 bg-gray-300 rounded"></div>
                  <div class="flex-1">
                    <div class="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div class="h-3 bg-gray-300 rounded w-1/2 mb-2"></div>
                    <div class="h-3 bg-gray-300 rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(1000);

      const loadingCard = page.locator('[data-testid="loading-state-test"] .animate-pulse');
      await expect(loadingCard).toHaveScreenshot('preview-loading-state.png');
    });
  });

  test.describe('Responsive Layout Visual Tests', () => {
    test('should render consistently on mobile viewport', async () => {
      // Switch to mobile
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'mobile-layout-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Mobile layout: <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">YouTube Video</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(3000);

      // Screenshot mobile layout
      const mobilePost = page.locator('[data-testid="mobile-layout-test"]');
      await expect(mobilePost).toHaveScreenshot('mobile-preview-layout.png');
    });

    test('should render consistently on tablet viewport', async () => {
      // Switch to tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'tablet-layout-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Tablet layout: <a href="https://github.com/microsoft/playwright" target="_blank">Repository</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(3000);

      // Screenshot tablet layout
      const tabletPost = page.locator('[data-testid="tablet-layout-test"]');
      await expect(tabletPost).toHaveScreenshot('tablet-preview-layout.png');
    });

    test('should render consistently on desktop viewport', async () => {
      // Ensure desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'desktop-layout-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Desktop layout: <a href="https://www.wired.com/story/test/" target="_blank">Article</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(3000);

      // Screenshot desktop layout
      const desktopPost = page.locator('[data-testid="desktop-layout-test"]');
      await expect(desktopPost).toHaveScreenshot('desktop-preview-layout.png');
    });
  });

  test.describe('Error State Visual Tests', () => {
    test('should render image error states consistently', async () => {
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'error-state-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Error state: <a href="https://broken-domain.invalid/image.jpg" target="_blank">Broken Image</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(5000);

      // Should show error fallback
      const errorPost = page.locator('[data-testid="error-state-test"]');
      await expect(errorPost).toHaveScreenshot('preview-error-state.png');
    });

    test('should render broken YouTube thumbnails consistently', async () => {
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'broken-youtube-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Broken YouTube: <a href="https://www.youtube.com/watch?v=invalid123" target="_blank">Invalid Video</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(5000);

      // Should show YouTube error fallback with red gradient
      const brokenPost = page.locator('[data-testid="broken-youtube-test"]');
      await expect(brokenPost).toHaveScreenshot('youtube-error-state.png');
    });
  });

  test.describe('Animation and Transition States', () => {
    test('should capture hover transition states', async () => {
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'transition-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Transition test: <a href="https://example.com/image.jpg" target="_blank">Image Link</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(3000);

      const previewCard = page.locator('[data-testid="transition-test"] .border.border-gray-200.rounded-lg').first();
      
      if (await previewCard.isVisible()) {
        // Capture normal state
        await expect(previewCard).toHaveScreenshot('preview-normal-state.png');

        // Capture hover state
        await previewCard.hover();
        await page.waitForTimeout(300); // Wait for transition
        await expect(previewCard).toHaveScreenshot('preview-hover-state.png');
      }
    });

    test('should capture expanding animation states', async () => {
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'expand-animation-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Expand animation: <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">YouTube Video</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(3000);

      const thumbnail = page.locator('[data-testid="expand-animation-test"] img[src*="youtube"]').first();
      
      if (await thumbnail.isVisible()) {
        // Capture before expansion
        const postCard = page.locator('[data-testid="expand-animation-test"]');
        await expect(postCard).toHaveScreenshot('youtube-before-expand.png');

        // Click and capture mid-transition (if possible)
        await thumbnail.click();
        await page.waitForTimeout(500); // Capture mid-transition
        await expect(postCard).toHaveScreenshot('youtube-expanding.png');

        // Capture final expanded state
        await page.waitForTimeout(1500);
        await expect(postCard).toHaveScreenshot('youtube-fully-expanded.png');
      }
    });
  });

  test.describe('Content Variety Visual Tests', () => {
    test('should render mixed content consistently', async () => {
      // Add multiple different types of content
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const contentTypes = [
            { id: 'mixed-youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', text: 'YouTube video' },
            { id: 'mixed-github', url: 'https://github.com/microsoft/playwright', text: 'GitHub repo' },
            { id: 'mixed-image', url: 'https://example.com/photo.jpg', text: 'Direct image' },
            { id: 'mixed-article', url: 'https://medium.com/@test/article', text: 'Medium article' }
          ];

          contentTypes.forEach(content => {
            const testPost = document.createElement('article');
            testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-4';
            testPost.setAttribute('data-testid', content.id);
            testPost.innerHTML = `
              <div class="prose prose-sm">
                <p>${content.text}: <a href="${content.url}" target="_blank">${content.url}</a></p>
              </div>
            `;
            feed.appendChild(testPost);
          });
        }
      });

      await page.waitForTimeout(8000);

      // Screenshot the entire mixed content area
      const feed = page.locator('[data-testid="post-list"]');
      await expect(feed).toHaveScreenshot('mixed-content-layout.png', {
        fullPage: true
      });
    });

    test('should render long text content consistently', async () => {
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'long-content-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Long content with multiple URLs and text: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Here's a YouTube video: <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">YouTube Video</a>. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation. And here's a repository: <a href="https://github.com/microsoft/playwright" target="_blank">Playwright</a>. Ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(5000);

      const longContentPost = page.locator('[data-testid="long-content-test"]');
      await expect(longContentPost).toHaveScreenshot('long-content-preview.png');
    });
  });

  test.describe('Dark Mode Visual Tests', () => {
    test('should render previews in dark mode consistently', async () => {
      // Add dark mode styles
      await page.addStyleTag({
        content: `
          .dark {
            background-color: #1a202c;
            color: #ffffff;
          }
          .dark .bg-white {
            background-color: #2d3748 !important;
            color: #ffffff !important;
          }
          .dark .border-gray-200 {
            border-color: #4a5568 !important;
          }
          .dark .text-gray-900 {
            color: #ffffff !important;
          }
          .dark .text-gray-600 {
            color: #cbd5e0 !important;
          }
        `
      });

      // Apply dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'dark-mode-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p class="text-gray-600">Dark mode test: <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank" class="text-blue-400">YouTube Video</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(3000);

      const darkModePost = page.locator('[data-testid="dark-mode-test"]');
      await expect(darkModePost).toHaveScreenshot('dark-mode-preview.png');
    });
  });
});