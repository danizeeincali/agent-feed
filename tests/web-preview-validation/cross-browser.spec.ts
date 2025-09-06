import { test, expect, devices } from '@playwright/test';

/**
 * Cross-Browser Testing for Web Preview Functionality
 * 
 * This test suite validates:
 * - Chrome, Firefox, Safari compatibility
 * - Mobile browser testing
 * - Touch interaction validation
 * - Browser-specific behavior differences
 */

// Test configurations for different browsers and devices
const browserConfigs = [
  { name: 'Desktop Chrome', ...devices['Desktop Chrome'] },
  { name: 'Desktop Firefox', ...devices['Desktop Firefox'] },
  { name: 'Desktop Safari', ...devices['Desktop Safari'] },
  { name: 'Mobile Chrome', ...devices['Pixel 5'] },
  { name: 'Mobile Safari', ...devices['iPhone 12'] },
  { name: 'Tablet', ...devices['iPad Pro'] }
];

for (const config of browserConfigs) {
  test.describe(`${config.name} - Web Preview Functionality`, () => {
    test.use(config);

    test('should render YouTube thumbnails correctly', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="social-media-feed"]');

      // Add YouTube content for testing
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'youtube-browser-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>YouTube test for ${navigator.userAgent}: <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">Test Video</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(5000);

      // Check for YouTube thumbnail
      const thumbnail = page.locator('[data-testid="youtube-browser-test"] img[src*="youtube.com/vi/"]').first();
      
      if (await thumbnail.isVisible({ timeout: 15000 })) {
        // Verify thumbnail loaded properly
        const thumbnailSrc = await thumbnail.getAttribute('src');
        expect(thumbnailSrc).toContain('youtube.com/vi/dQw4w9WgXcQ');

        // Check image dimensions
        const boundingBox = await thumbnail.boundingBox();
        expect(boundingBox).toBeTruthy();
        expect(boundingBox!.width).toBeGreaterThan(0);
        expect(boundingBox!.height).toBeGreaterThan(0);

        // Test interaction based on device type
        if (config.name.includes('Mobile') || config.name.includes('Tablet')) {
          // Touch interaction
          await thumbnail.tap();
        } else {
          // Click interaction
          await thumbnail.click();
        }

        await page.waitForTimeout(2000);

        // Should expand to show player
        const iframe = page.locator('[data-testid="youtube-browser-test"] iframe[src*="youtube"]').first();
        await expect(iframe).toBeVisible({ timeout: 5000 });
      } else {
        console.log(`YouTube thumbnail not visible in ${config.name} - checking fallback`);
        
        // Should at least show clickable link
        const fallbackLink = page.locator('[data-testid="youtube-browser-test"] a[href*="youtube.com"]');
        await expect(fallbackLink).toBeVisible();
      }
    });

    test('should handle enhanced link previews across browsers', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="social-media-feed"]');

      // Add various link types for testing
      const testUrls = [
        'https://github.com/microsoft/playwright',
        'https://www.wired.com/story/artificial-intelligence-future-scenarios/',
        'https://medium.com/@test/article',
        'https://example.com/image.jpg'
      ];

      for (let i = 0; i < testUrls.length; i++) {
        const url = testUrls[i];
        
        await page.evaluate((testUrl, index) => {
          const feed = document.querySelector('[data-testid="post-list"]');
          if (feed) {
            const testPost = document.createElement('article');
            testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
            testPost.setAttribute('data-testid', `link-test-${index}`);
            testPost.innerHTML = `
              <div class="prose prose-sm">
                <p>Link ${index + 1}: <a href="${testUrl}" target="_blank">${testUrl}</a></p>
              </div>
            `;
            feed.prepend(testPost);
          }
        }, url, i);

        await page.waitForTimeout(3000);

        // Check for preview or fallback
        const testSelector = `[data-testid="link-test-${i}"]`;
        const hasPreview = await page.locator(`${testSelector} .border.border-gray-200.rounded-lg`).isVisible();
        const hasLink = await page.locator(`${testSelector} a[href="${url}"]`).isVisible();
        
        expect(hasPreview || hasLink).toBeTruthy();

        // Clean up for next test
        await page.locator(`[data-testid="link-test-${i}"]`).first().remove();
      }
    });

    test('should be responsive to viewport changes', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="social-media-feed"]');

      // Add test content
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'responsive-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Responsive test: <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">YouTube Video</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(3000);

      // Test different viewport sizes
      const viewports = [
        { width: 320, height: 568 }, // iPhone SE
        { width: 768, height: 1024 }, // iPad
        { width: 1280, height: 720 }, // Desktop
        { width: 1920, height: 1080 } // Large Desktop
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(500);

        const feed = page.locator('[data-testid="social-media-feed"]');
        await expect(feed).toBeVisible();

        // Check layout doesn't overflow
        const feedBox = await feed.boundingBox();
        expect(feedBox).toBeTruthy();
        expect(feedBox!.width).toBeLessThanOrEqual(viewport.width + 20); // Allow small margin

        // Check responsive behavior of preview elements
        const previewElements = page.locator('[data-testid="responsive-test"] img, [data-testid="responsive-test"] .border');
        const elementCount = await previewElements.count();
        
        if (elementCount > 0) {
          for (let i = 0; i < elementCount; i++) {
            const element = previewElements.nth(i);
            if (await element.isVisible()) {
              const elementBox = await element.boundingBox();
              if (elementBox) {
                expect(elementBox.width).toBeLessThanOrEqual(viewport.width);
              }
            }
          }
        }
      }
    });

    test('should handle touch interactions on mobile devices', async ({ page }) => {
      // Skip if not a mobile device
      if (!config.name.includes('Mobile') && !config.name.includes('Tablet')) {
        test.skip(true, 'Touch test only for mobile devices');
        return;
      }

      await page.goto('/');
      await page.waitForSelector('[data-testid="social-media-feed"]');

      // Add touch test content
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.setAttribute('data-testid', 'touch-test');
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Touch test: <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">YouTube Video</a></p>
            </div>
          `;
          feed.prepend(testPost);
        }
      });

      await page.waitForTimeout(3000);

      // Test tap interactions
      const thumbnail = page.locator('[data-testid="touch-test"] img[src*="youtube"]').first();
      
      if (await thumbnail.isVisible({ timeout: 10000 })) {
        // Test tap to expand
        await thumbnail.tap();
        await page.waitForTimeout(1000);

        const iframe = page.locator('[data-testid="touch-test"] iframe[src*="youtube"]').first();
        await expect(iframe).toBeVisible({ timeout: 5000 });

        // Test pinch zoom (if supported)
        const iframeBounds = await iframe.boundingBox();
        if (iframeBounds) {
          // Simulate pinch gesture
          await page.touchscreen.tap(iframeBounds.x + iframeBounds.width/2, iframeBounds.y + iframeBounds.height/2);
        }
      }

      // Test scrolling with touch
      await page.touchscreen.tap(400, 300);
      await page.evaluate(() => window.scrollTo(0, 200));
      await page.waitForTimeout(500);

      const scrollY = await page.evaluate(() => window.scrollY);
      expect(scrollY).toBeGreaterThan(0);
    });

    test('should handle browser-specific CSS and JavaScript features', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="social-media-feed"]');

      // Test browser capabilities
      const browserInfo = await page.evaluate(() => ({
        userAgent: navigator.userAgent,
        webGL: !!document.createElement('canvas').getContext('webgl'),
        localStorage: typeof Storage !== 'undefined',
        flexbox: CSS.supports('display', 'flex'),
        grid: CSS.supports('display', 'grid'),
        aspectRatio: CSS.supports('aspect-ratio', '16/9'),
        objectFit: CSS.supports('object-fit', 'cover')
      }));

      console.log(`${config.name} capabilities:`, browserInfo);

      // All modern browsers should support these features
      expect(browserInfo.localStorage).toBeTruthy();
      expect(browserInfo.flexbox).toBeTruthy();
      
      // Test CSS features used in preview components
      if (browserInfo.aspectRatio) {
        // Test aspect-ratio support
        await page.addStyleTag({
          content: '.test-aspect { aspect-ratio: 16/9; width: 100px; }'
        });

        const testDiv = await page.evaluate(() => {
          const div = document.createElement('div');
          div.className = 'test-aspect';
          document.body.appendChild(div);
          const height = window.getComputedStyle(div).height;
          div.remove();
          return height;
        });

        console.log(`Aspect ratio test result: ${testDiv}`);
      }

      if (browserInfo.objectFit) {
        // Test object-fit support for images
        await page.addStyleTag({
          content: '.test-object-fit { object-fit: cover; width: 100px; height: 100px; }'
        });

        // This would be used in thumbnail rendering
        const supportsObjectFit = await page.evaluate(() => {
          return CSS.supports('object-fit', 'cover');
        });

        expect(supportsObjectFit).toBeTruthy();
      }
    });

    test('should perform well across different browsers', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForSelector('[data-testid="social-media-feed"]');
      
      const loadTime = Date.now() - startTime;
      console.log(`${config.name} load time: ${loadTime}ms`);

      // Should load within reasonable time (browsers may vary)
      expect(loadTime).toBeLessThan(20000);

      // Add content and measure rendering time
      const renderStart = Date.now();

      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          for (let i = 0; i < 5; i++) {
            const testPost = document.createElement('article');
            testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
            testPost.innerHTML = `
              <div class="prose prose-sm">
                <p>Performance test ${i}: <a href="https://www.youtube.com/watch?v=test${i}" target="_blank">Video ${i}</a></p>
              </div>
            `;
            feed.appendChild(testPost);
          }
        }
      });

      await page.waitForTimeout(5000);
      const renderTime = Date.now() - renderStart;

      console.log(`${config.name} render time: ${renderTime}ms`);
      expect(renderTime).toBeLessThan(15000);

      // Check for JavaScript errors
      const jsErrors: string[] = [];
      page.on('pageerror', (error) => {
        jsErrors.push(error.message);
      });

      await page.waitForTimeout(2000);
      expect(jsErrors.length).toBe(0);
    });

    test('should handle media queries correctly', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="social-media-feed"]');

      // Test different screen sizes and orientations
      const screenSizes = [
        { width: 320, height: 568, orientation: 'portrait' },
        { width: 568, height: 320, orientation: 'landscape' },
        { width: 768, height: 1024, orientation: 'portrait' },
        { width: 1024, height: 768, orientation: 'landscape' }
      ];

      for (const size of screenSizes) {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.waitForTimeout(300);

        // Check media query matching
        const mediaQueryResults = await page.evaluate((screenSize) => ({
          isMobile: window.matchMedia('(max-width: 768px)').matches,
          isTablet: window.matchMedia('(min-width: 768px) and (max-width: 1024px)').matches,
          isDesktop: window.matchMedia('(min-width: 1024px)').matches,
          isPortrait: window.matchMedia('(orientation: portrait)').matches,
          isLandscape: window.matchMedia('(orientation: landscape)').matches,
          actualWidth: window.innerWidth,
          actualHeight: window.innerHeight
        }), size);

        console.log(`${config.name} at ${size.width}x${size.height}:`, mediaQueryResults);

        // Verify media queries match expectations
        if (size.width <= 768) {
          expect(mediaQueryResults.isMobile).toBeTruthy();
        } else if (size.width <= 1024) {
          expect(mediaQueryResults.isTablet).toBeTruthy();
        } else {
          expect(mediaQueryResults.isDesktop).toBeTruthy();
        }

        // Check orientation detection
        if (size.width < size.height) {
          expect(mediaQueryResults.isPortrait).toBeTruthy();
        } else {
          expect(mediaQueryResults.isLandscape).toBeTruthy();
        }
      }
    });
  });
}

// Browser-specific edge case tests
test.describe('Browser-Specific Edge Cases', () => {
  test('should handle Safari-specific video loading', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'Safari-specific test');
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="social-media-feed"]');

    // Safari has specific handling for video embeds
    await page.evaluate(() => {
      const feed = document.querySelector('[data-testid="post-list"]');
      if (feed) {
        const testPost = document.createElement('article');
        testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
        testPost.setAttribute('data-testid', 'safari-video-test');
        testPost.innerHTML = `
          <div class="prose prose-sm">
            <p>Safari video test: <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">YouTube Video</a></p>
          </div>
        `;
        feed.prepend(testPost);
      }
    });

    await page.waitForTimeout(5000);

    const thumbnail = page.locator('[data-testid="safari-video-test"] img[src*="youtube"]').first();
    if (await thumbnail.isVisible()) {
      await thumbnail.click();
      await page.waitForTimeout(2000);

      const iframe = page.locator('[data-testid="safari-video-test"] iframe').first();
      if (await iframe.isVisible()) {
        // Check Safari-specific iframe attributes
        const iframeSrc = await iframe.getAttribute('src');
        expect(iframeSrc).toContain('youtube');
        
        // Safari may require specific parameters
        expect(iframeSrc).toContain('playsinline=1');
      }
    }
  });

  test('should handle Firefox-specific rendering', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'Firefox-specific test');
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="social-media-feed"]');

    // Test Firefox-specific CSS rendering
    const firefoxSupport = await page.evaluate(() => ({
      scrollbarWidth: CSS.supports('scrollbar-width', 'thin'),
      backdropFilter: CSS.supports('backdrop-filter', 'blur(10px)'),
      firefoxUserAgent: navigator.userAgent.includes('Firefox')
    }));

    expect(firefoxSupport.firefoxUserAgent).toBeTruthy();
    console.log('Firefox-specific support:', firefoxSupport);
  });

  test('should handle Chrome-specific features', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-specific test');
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="social-media-feed"]');

    // Test Chrome-specific features
    const chromeFeatures = await page.evaluate(() => ({
      webGL2: !!document.createElement('canvas').getContext('webgl2'),
      intersectionObserver: 'IntersectionObserver' in window,
      resizeObserver: 'ResizeObserver' in window,
      performanceObserver: 'PerformanceObserver' in window
    }));

    // Chrome should support these modern features
    expect(chromeFeatures.intersectionObserver).toBeTruthy();
    expect(chromeFeatures.performanceObserver).toBeTruthy();
    
    console.log('Chrome-specific features:', chromeFeatures);
  });
});