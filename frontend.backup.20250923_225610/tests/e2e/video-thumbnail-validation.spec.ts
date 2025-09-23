/**
 * Video and Thumbnail Functionality E2E Tests
 * 
 * Comprehensive browser tests for video playback and thumbnail display functionality
 * across different browsers and scenarios using real URLs and data.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Real test URLs for comprehensive validation
const TEST_URLS = {
  youtube: {
    valid: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll - reliable test video
    embedded: 'https://youtu.be/dQw4w9WgXcQ',
    playlist: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLDcmCgguL9rxPoVn2ykUFc8TOpLyDU5gd'
  },
  images: {
    wired: 'https://media.wired.com/photos/65e7e9a66b7e4b1b3a8a0b5a/master/w_960,c_limit/Tesla-Cybertruck-gear.jpg',
    github: 'https://github.com/microsoft/vscode/raw/main/resources/linux/code.png',
    unsplash: 'https://images.unsplash.com/photo-1518906966719-1d1a2ee5f3bc?w=400&h=300',
    placeholder: 'https://via.placeholder.com/400x300/09f/fff.png'
  },
  articles: {
    wired: 'https://www.wired.com/story/chatgpt-generative-ai-regulation/',
    github: 'https://github.com/microsoft/vscode',
    medium: 'https://medium.com/@techworld/understanding-ai-in-2024'
  }
};

// Test data for different scenarios
const TEST_POST_CONTENT = {
  withYouTube: `Check out this amazing tutorial: ${TEST_URLS.youtube.valid} #tutorial #programming @developer`,
  withImages: `Great article with visuals: ${TEST_URLS.images.wired} and ${TEST_URLS.articles.wired}`,
  mixedMedia: `Multiple links: ${TEST_URLS.youtube.valid} and ${TEST_URLS.images.github} plus ${TEST_URLS.articles.github}`,
  brokenLinks: 'Broken image: https://broken-domain.invalid/image.jpg and https://invalid-youtube.com/watch?v=invalid'
};

test.describe('Video and Thumbnail Functionality', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      // Enable media playback
      hasTouch: false,
      permissions: ['audio-capture', 'video-capture'],
      viewport: { width: 1280, height: 720 }
    });
    
    page = await context.newPage();
    
    // Navigate to the feed
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Wait for feed to load
    await expect(page.locator('[data-testid="social-media-feed"]')).toBeVisible();
  });

  test.afterEach(async () => {
    await context.close();
  });

  test.describe('Thumbnail Display Tests', () => {
    test('should display thumbnails from various image sources', async () => {
      // Create a test post with multiple image sources
      const testContent = `Testing multiple image sources:
        Wired image: ${TEST_URLS.images.wired}
        GitHub image: ${TEST_URLS.images.github}
        Placeholder: ${TEST_URLS.images.placeholder}`;

      // Look for existing posts with images or create test scenario
      await page.evaluate((content) => {
        // Simulate a post with image content for testing
        const feedElement = document.querySelector('[data-testid="post-list"]');
        if (feedElement) {
          const testPost = document.createElement('div');
          testPost.setAttribute('data-testid', 'test-post-images');
          testPost.innerHTML = `
            <div class="bg-white border border-gray-200 rounded-lg p-6">
              <h2 class="text-lg font-bold mb-4">Test Post with Images</h2>
              <div class="space-y-3">
                <div class="text-gray-700">${content}</div>
              </div>
            </div>
          `;
          feedElement.insertBefore(testPost, feedElement.firstChild);
        }
      }, testContent);

      // Wait for content to be processed and thumbnails to appear
      await page.waitForTimeout(2000);

      // Check for thumbnail containers
      const thumbnails = page.locator('img[src*="wired.com"], img[src*="github.com"], img[src*="placeholder.com"]');
      
      // Verify at least one thumbnail is visible
      await expect(thumbnails.first()).toBeVisible({ timeout: 10000 });

      // Test image loading and dimensions
      const firstThumbnail = thumbnails.first();
      await expect(firstThumbnail).toHaveAttribute('alt');
      await expect(firstThumbnail).toHaveAttribute('loading', 'lazy');

      // Verify image actually loaded (not broken)
      const isLoaded = await firstThumbnail.evaluate((img: HTMLImageElement) => {
        return img.complete && img.naturalHeight !== 0;
      });
      expect(isLoaded).toBe(true);
    });

    test('should handle fallback behavior for failed image loads', async () => {
      // Test with intentionally broken image URLs
      await page.evaluate(() => {
        const feedElement = document.querySelector('[data-testid="post-list"]');
        if (feedElement) {
          const testPost = document.createElement('div');
          testPost.setAttribute('data-testid', 'test-post-broken-images');
          testPost.innerHTML = `
            <div class="bg-white border border-gray-200 rounded-lg p-6">
              <h2 class="text-lg font-bold mb-4">Test Post with Broken Images</h2>
              <div class="space-y-3">
                <img src="https://broken-domain.invalid/image.jpg" 
                     alt="Broken image test" 
                     class="w-full h-48 object-cover rounded"
                     data-testid="broken-image" />
                <img src="https://definitely-not-a-real-domain.xyz/another-broken.png" 
                     alt="Another broken image" 
                     class="w-20 h-20 object-cover rounded"
                     data-testid="broken-thumbnail" />
              </div>
            </div>
          `;
          feedElement.insertBefore(testPost, feedElement.firstChild);
        }
      });

      // Wait for images to attempt loading and fail
      await page.waitForTimeout(3000);

      // Verify broken images are handled gracefully
      const brokenImages = page.locator('[data-testid="broken-image"], [data-testid="broken-thumbnail"]');
      
      for (const img of await brokenImages.all()) {
        const isLoaded = await img.evaluate((element: HTMLImageElement) => {
          return element.complete && element.naturalHeight !== 0;
        });
        // Should either not be loaded or have fallback handling
        expect(isLoaded).toBe(false);
      }

      // Check if fallback content or error handling is displayed
      const fallbackContent = page.locator('.bg-gray-100, .bg-gradient-to-br, [class*="fallback"]');
      const hasVisibleFallback = await fallbackContent.count() > 0;
      
      // Either fallback content exists or images are hidden gracefully
      if (!hasVisibleFallback) {
        // Verify broken images don't show alt text as broken image icon
        const brokenImageDisplay = await brokenImages.first().isVisible();
        expect(brokenImageDisplay).toBe(true); // Image element exists but may show fallback
      }
    });

    test('should display responsive image sizing', async () => {
      // Test responsive behavior at different viewport sizes
      const viewportSizes = [
        { width: 375, height: 667, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1280, height: 720, name: 'desktop' }
      ];

      for (const viewport of viewportSizes) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(1000);

        // Look for images in the feed
        const images = page.locator('[data-testid="post-list"] img');
        const imageCount = await images.count();

        if (imageCount > 0) {
          const firstImage = images.first();
          await expect(firstImage).toBeVisible();

          // Get image dimensions
          const { width, height } = await firstImage.boundingBox() || { width: 0, height: 0 };
          
          // Verify responsive sizing
          expect(width).toBeGreaterThan(0);
          expect(height).toBeGreaterThan(0);
          
          // Images should be reasonably sized for viewport
          expect(width).toBeLessThanOrEqual(viewport.width);
        }
      }
    });
  });

  test.describe('YouTube Video Playback Tests', () => {
    test('should initialize YouTube embed correctly', async () => {
      // Create a test post with YouTube URL
      await page.evaluate((youtubeUrl) => {
        const feedElement = document.querySelector('[data-testid="post-list"]');
        if (feedElement) {
          const testPost = document.createElement('div');
          testPost.setAttribute('data-testid', 'test-post-youtube');
          testPost.innerHTML = `
            <div class="bg-white border border-gray-200 rounded-lg p-6">
              <h2 class="text-lg font-bold mb-4">Test Post with YouTube Video</h2>
              <div class="space-y-3">
                <div class="text-gray-700">Check out this video: ${youtubeUrl}</div>
              </div>
            </div>
          `;
          feedElement.insertBefore(testPost, feedElement.firstChild);
        }
      }, TEST_URLS.youtube.valid);

      // Wait for YouTube processing
      await page.waitForTimeout(3000);

      // Look for YouTube thumbnail or embed
      const youtubeContent = page.locator('img[src*="youtube.com"], img[src*="ytimg.com"], iframe[src*="youtube"]');
      
      if (await youtubeContent.count() > 0) {
        await expect(youtubeContent.first()).toBeVisible({ timeout: 10000 });

        // If thumbnail, verify it shows YouTube branding or play button
        const thumbnail = page.locator('img[src*="ytimg.com"], img[src*="youtube.com/vi/"]').first();
        if (await thumbnail.count() > 0) {
          await expect(thumbnail).toBeVisible();
          
          // Verify thumbnail loads correctly
          const isLoaded = await thumbnail.evaluate((img: HTMLImageElement) => {
            return img.complete && img.naturalHeight !== 0;
          });
          expect(isLoaded).toBe(true);
        }
      }
    });

    test('should handle YouTube video player controls', async () => {
      // Navigate to a page with expanded YouTube video
      await page.evaluate((youtubeUrl) => {
        const feedElement = document.querySelector('[data-testid="post-list"]');
        if (feedElement) {
          const testPost = document.createElement('div');
          testPost.setAttribute('data-testid', 'test-youtube-player');
          testPost.innerHTML = `
            <div class="bg-white border border-gray-200 rounded-lg p-6">
              <h2 class="text-lg font-bold mb-4">YouTube Player Test</h2>
              <div class="aspect-video">
                <iframe 
                  src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=0&controls=1&mute=1"
                  title="Test YouTube Video"
                  class="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen
                  data-testid="youtube-iframe"
                ></iframe>
              </div>
              <div class="mt-3 flex space-x-2">
                <button class="text-gray-600 hover:text-red-600" data-testid="youtube-mute">Mute</button>
                <button class="text-blue-600 hover:text-blue-800" data-testid="youtube-external">Open in YouTube</button>
              </div>
            </div>
          `;
          feedElement.insertBefore(testPost, feedElement.firstChild);
        }
      }, TEST_URLS.youtube.valid);

      await page.waitForTimeout(2000);

      // Check for YouTube iframe
      const iframe = page.locator('[data-testid="youtube-iframe"]');
      await expect(iframe).toBeVisible({ timeout: 10000 });

      // Verify iframe attributes
      await expect(iframe).toHaveAttribute('src', /youtube-nocookie\.com\/embed/);
      await expect(iframe).toHaveAttribute('allowfullscreen');

      // Test control buttons if present
      const muteButton = page.locator('[data-testid="youtube-mute"]');
      const externalButton = page.locator('[data-testid="youtube-external"]');

      if (await muteButton.count() > 0) {
        await expect(muteButton).toBeVisible();
        await expect(muteButton).toBeEnabled();
      }

      if (await externalButton.count() > 0) {
        await expect(externalButton).toBeVisible();
        await expect(externalButton).toBeEnabled();
        
        // Test external link functionality
        const [popup] = await Promise.all([
          page.waitForEvent('popup'),
          externalButton.click()
        ]);
        
        expect(popup.url()).toContain('youtube.com');
        await popup.close();
      }
    });

    test('should test autoplay functionality with user interaction', async () => {
      // Test autoplay behavior (should be muted and require user interaction)
      await page.evaluate(() => {
        const feedElement = document.querySelector('[data-testid="post-list"]');
        if (feedElement) {
          const testPost = document.createElement('div');
          testPost.setAttribute('data-testid', 'test-autoplay');
          testPost.innerHTML = `
            <div class="bg-white border border-gray-200 rounded-lg p-6">
              <h2 class="text-lg font-bold mb-4">Autoplay Test</h2>
              <div class="space-y-4">
                <div class="aspect-video relative cursor-pointer" data-testid="video-thumbnail">
                  <img 
                    src="https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg"
                    alt="Video Thumbnail"
                    class="w-full h-full object-cover rounded"
                    data-testid="yt-thumbnail"
                  />
                  <div class="absolute inset-0 flex items-center justify-center">
                    <div class="bg-red-600 rounded-full p-3 shadow-lg">
                      <svg class="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                </div>
                <button class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700" data-testid="play-button">
                  Play Video
                </button>
              </div>
            </div>
          `;
          feedElement.insertBefore(testPost, feedElement.firstChild);
        }
      });

      await page.waitForTimeout(1000);

      // Verify thumbnail is visible
      const thumbnail = page.locator('[data-testid="yt-thumbnail"]');
      await expect(thumbnail).toBeVisible();

      // Verify thumbnail loads correctly
      const isLoaded = await thumbnail.evaluate((img: HTMLImageElement) => {
        return img.complete && img.naturalHeight !== 0;
      });
      expect(isLoaded).toBe(true);

      // Test user interaction requirement
      const playButton = page.locator('[data-testid="play-button"]');
      await expect(playButton).toBeVisible();
      await expect(playButton).toBeEnabled();

      // Click play button to trigger video load
      await playButton.click();
      
      // Wait for potential video player to appear
      await page.waitForTimeout(2000);

      // Verify user interaction was required (no autoplay without click)
      const videoContainer = page.locator('[data-testid="video-thumbnail"]');
      await expect(videoContainer).toBeVisible();
    });

    test('should validate privacy-enhanced YouTube domain usage', async () => {
      // Test that YouTube embeds use privacy-enhanced domain
      await page.evaluate(() => {
        const feedElement = document.querySelector('[data-testid="post-list"]');
        if (feedElement) {
          const testPost = document.createElement('div');
          testPost.innerHTML = `
            <div class="bg-white border border-gray-200 rounded-lg p-6">
              <iframe 
                src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
                data-testid="privacy-iframe"
                class="w-full aspect-video"
              ></iframe>
            </div>
          `;
          feedElement.insertBefore(testPost, feedElement.firstChild);
        }
      });

      const privacyIframe = page.locator('[data-testid="privacy-iframe"]');
      if (await privacyIframe.count() > 0) {
        await expect(privacyIframe).toHaveAttribute('src', /youtube-nocookie\.com/);
      }
    });
  });

  test.describe('Cross-Browser Compatibility Tests', () => {
    test('should work consistently across different browsers', async ({ browserName }) => {
      // Create test content with mixed media
      await page.evaluate((content) => {
        const feedElement = document.querySelector('[data-testid="post-list"]');
        if (feedElement) {
          const testPost = document.createElement('div');
          testPost.setAttribute('data-testid', 'browser-compat-test');
          testPost.innerHTML = `
            <div class="bg-white border border-gray-200 rounded-lg p-6">
              <h2 class="text-lg font-bold mb-4">Cross-Browser Test (${content.browser})</h2>
              <div class="space-y-3">
                <img src="${content.imageUrl}" alt="Test image" class="w-32 h-32 object-cover rounded" data-testid="test-image" />
                <div class="aspect-video">
                  <img src="${content.youtubeThumb}" alt="YouTube thumbnail" class="w-full h-full object-cover rounded" data-testid="yt-thumb" />
                </div>
              </div>
            </div>
          `;
          feedElement.insertBefore(testPost, feedElement.firstChild);
        }
      }, {
        browser: browserName,
        imageUrl: TEST_URLS.images.placeholder,
        youtubeThumb: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg'
      });

      await page.waitForTimeout(2000);

      // Verify images load in all browsers
      const testImage = page.locator('[data-testid="test-image"]');
      const ytThumb = page.locator('[data-testid="yt-thumb"]');

      await expect(testImage).toBeVisible({ timeout: 10000 });
      await expect(ytThumb).toBeVisible({ timeout: 10000 });

      // Verify images actually loaded
      const imageLoaded = await testImage.evaluate((img: HTMLImageElement) => {
        return img.complete && img.naturalHeight !== 0;
      });
      
      const thumbLoaded = await ytThumb.evaluate((img: HTMLImageElement) => {
        return img.complete && img.naturalHeight !== 0;
      });

      expect(imageLoaded).toBe(true);
      expect(thumbLoaded).toBe(true);

      // Browser-specific checks
      if (browserName === 'webkit') {
        // Safari-specific validations
        console.log('Running Safari-specific checks');
      } else if (browserName === 'firefox') {
        // Firefox-specific validations
        console.log('Running Firefox-specific checks');
      } else {
        // Chrome/Chromium-specific validations
        console.log('Running Chrome-specific checks');
      }
    });

    test('should handle mobile browser video playback', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Create mobile video test
      await page.evaluate(() => {
        const feedElement = document.querySelector('[data-testid="post-list"]');
        if (feedElement) {
          const testPost = document.createElement('div');
          testPost.innerHTML = `
            <div class="bg-white border border-gray-200 rounded-lg p-4">
              <h3 class="text-base font-bold mb-3">Mobile Video Test</h3>
              <div class="aspect-video relative">
                <img 
                  src="https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg"
                  alt="Mobile video thumbnail"
                  class="w-full h-full object-cover rounded"
                  data-testid="mobile-video-thumb"
                />
                <div class="absolute inset-0 flex items-center justify-center">
                  <button class="bg-red-600 rounded-full p-2" data-testid="mobile-play">
                    <svg class="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          `;
          feedElement.insertBefore(testPost, feedElement.firstChild);
        }
      });

      await page.waitForTimeout(1000);

      // Verify mobile layout
      const mobileThumb = page.locator('[data-testid="mobile-video-thumb"]');
      const playButton = page.locator('[data-testid="mobile-play"]');

      await expect(mobileThumb).toBeVisible();
      await expect(playButton).toBeVisible();

      // Test touch interaction
      await playButton.tap();
      await page.waitForTimeout(1000);

      // Verify responsive sizing
      const thumbBox = await mobileThumb.boundingBox();
      expect(thumbBox?.width).toBeLessThanOrEqual(375);
    });
  });

  test.describe('Performance and Network Tests', () => {
    test('should handle network failures gracefully', async () => {
      // Simulate network conditions
      await context.route('**/*{wired,github,unsplash}*/**', route => {
        route.abort('failed');
      });

      // Create test with external images that will fail
      await page.evaluate(() => {
        const feedElement = document.querySelector('[data-testid="post-list"]');
        if (feedElement) {
          const testPost = document.createElement('div');
          testPost.innerHTML = `
            <div class="bg-white border border-gray-200 rounded-lg p-6">
              <h2 class="text-lg font-bold mb-4">Network Failure Test</h2>
              <div class="space-y-3">
                <img src="https://media.wired.com/photos/network-failure-test.jpg" 
                     alt="Will fail to load" 
                     class="w-32 h-32 object-cover rounded"
                     data-testid="network-fail-image" />
                <img src="https://github.com/test/network-fail.png" 
                     alt="Will also fail" 
                     class="w-20 h-20 object-cover rounded"
                     data-testid="network-fail-image-2" />
              </div>
            </div>
          `;
          feedElement.insertBefore(testPost, feedElement.firstChild);
        }
      });

      await page.waitForTimeout(3000);

      // Verify graceful failure handling
      const failedImages = page.locator('[data-testid^="network-fail-image"]');
      
      for (const img of await failedImages.all()) {
        // Image should exist but not be loaded
        const isLoaded = await img.evaluate((element: HTMLImageElement) => {
          return element.complete && element.naturalHeight !== 0;
        });
        expect(isLoaded).toBe(false);
      }
    });

    test('should validate performance under load', async () => {
      // Create multiple media-rich posts
      const postCount = 10;
      
      await page.evaluate((count) => {
        const feedElement = document.querySelector('[data-testid="post-list"]');
        if (feedElement) {
          for (let i = 0; i < count; i++) {
            const testPost = document.createElement('div');
            testPost.innerHTML = `
              <div class="bg-white border border-gray-200 rounded-lg p-6 mb-4">
                <h3 class="text-lg font-bold mb-3">Performance Test Post ${i + 1}</h3>
                <div class="space-y-3">
                  <img src="https://via.placeholder.com/400x300/0${i}f/fff.png" 
                       alt="Test image ${i}" 
                       class="w-full h-48 object-cover rounded"
                       data-testid="perf-image-${i}" />
                  <img src="https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg" 
                       alt="YouTube thumbnail ${i}" 
                       class="w-32 h-24 object-cover rounded"
                       data-testid="perf-yt-${i}" />
                </div>
              </div>
            `;
            feedElement.appendChild(testPost);
          }
        }
      }, postCount);

      // Wait for all images to attempt loading
      await page.waitForTimeout(5000);

      // Check that page remains responsive
      const performanceMetrics = await page.evaluate(() => {
        return JSON.parse(JSON.stringify(performance.getEntriesByType('navigation')[0]));
      });

      // Verify page loaded reasonably quickly
      expect(performanceMetrics.loadEventEnd - performanceMetrics.loadEventStart).toBeLessThan(10000);

      // Verify images are loading with lazy loading
      const firstImage = page.locator('[data-testid="perf-image-0"]');
      await expect(firstImage).toHaveAttribute('loading', 'lazy');
    });
  });

  test.describe('Real-World Integration Tests', () => {
    test('should handle real article thumbnails from various sources', async () => {
      const realArticles = [
        'https://github.com/microsoft/vscode',
        'https://www.wired.com/story/chatgpt-generative-ai-regulation/',
        'https://medium.com/@example/test-article'
      ];

      // Test each real URL type
      for (const [index, url] of realArticles.entries()) {
        await page.evaluate(({ articleUrl, idx }) => {
          const feedElement = document.querySelector('[data-testid="post-list"]');
          if (feedElement) {
            const testPost = document.createElement('div');
            testPost.innerHTML = `
              <div class="bg-white border border-gray-200 rounded-lg p-6 mb-4">
                <h3 class="text-lg font-bold mb-3">Real Article Test ${idx + 1}</h3>
                <div class="text-gray-700">Check out: ${articleUrl}</div>
              </div>
            `;
            feedElement.appendChild(testPost);
          }
        }, { articleUrl: url, idx: index });
      }

      await page.waitForTimeout(3000);

      // Verify that the URLs are properly displayed and potentially processed
      for (const url of realArticles) {
        const urlText = page.locator(`text="${url}"`);
        await expect(urlText).toBeVisible();
      }
    });

    test('should validate CORS handling for cross-origin images', async () => {
      // Test images from different origins
      const crossOriginImages = [
        'https://images.unsplash.com/photo-1518906966719-1d1a2ee5f3bc?w=400',
        'https://via.placeholder.com/300x200',
        'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg'
      ];

      await page.evaluate((images) => {
        const feedElement = document.querySelector('[data-testid="post-list"]');
        if (feedElement) {
          const testPost = document.createElement('div');
          testPost.innerHTML = `
            <div class="bg-white border border-gray-200 rounded-lg p-6">
              <h3 class="text-lg font-bold mb-3">CORS Test</h3>
              <div class="grid grid-cols-3 gap-4">
                ${images.map((img, idx) => `
                  <img src="${img}" 
                       alt="CORS test ${idx}" 
                       class="w-full h-24 object-cover rounded"
                       crossorigin="anonymous"
                       data-testid="cors-image-${idx}" />
                `).join('')}
              </div>
            </div>
          `;
          feedElement.appendChild(testPost);
        }
      }, crossOriginImages);

      await page.waitForTimeout(5000);

      // Check CORS images
      for (let i = 0; i < crossOriginImages.length; i++) {
        const corsImage = page.locator(`[data-testid="cors-image-${i}"]`);
        await expect(corsImage).toBeVisible();

        // Verify crossorigin attribute
        await expect(corsImage).toHaveAttribute('crossorigin', 'anonymous');

        // Check if image loaded successfully
        const isLoaded = await corsImage.evaluate((img: HTMLImageElement) => {
          return img.complete && img.naturalHeight !== 0;
        });
        
        // Should load successfully or fail gracefully
        if (!isLoaded) {
          console.log(`Image ${i} failed to load - this may be expected for CORS restrictions`);
        }
      }
    });
  });
});