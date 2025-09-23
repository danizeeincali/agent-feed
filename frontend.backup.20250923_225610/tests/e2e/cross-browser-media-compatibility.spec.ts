/**
 * Cross-Browser Media Compatibility Tests
 * 
 * Tests media functionality (videos, thumbnails, images) across different
 * browsers and devices with focus on compatibility and fallback behavior.
 */

import { test, expect, Page, BrowserContext, devices } from '@playwright/test';

// Test media URLs for cross-browser validation
const MEDIA_TEST_URLS = {
  images: {
    jpeg: 'https://via.placeholder.com/640x480.jpg/09f/fff',
    png: 'https://via.placeholder.com/640x480.png/f90/fff',
    webp: 'https://via.placeholder.com/640x480.webp/0f9/fff',
    svg: 'https://via.placeholder.com/640x480.svg/90f/fff',
    gif: 'https://via.placeholder.com/640x480.gif/f09/fff'
  },
  youtube: {
    standard: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    short: 'https://youtu.be/dQw4w9WgXcQ',
    embed: 'https://youtube.com/embed/dQw4w9WgXcQ',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg'
  },
  external: {
    unsplash: 'https://images.unsplash.com/photo-1518906966719-1d1a2ee5f3bc?w=640&h=480',
    github: 'https://github.com/microsoft/vscode/raw/main/resources/linux/code.png'
  }
};

test.describe('Cross-Browser Media Compatibility', () => {
  
  test.describe('Browser-Specific Image Format Support', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should handle image formats correctly in ${browserName}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await page.goto('http://localhost:5173');
        await page.waitForLoadState('networkidle');

        // Create test with various image formats
        await page.evaluate(({ formats, browserName }) => {
          const testContainer = document.createElement('div');
          testContainer.innerHTML = `
            <div data-testid="image-format-test-${browserName}" class="p-6">
              <h3 class="mb-4 font-bold">Image Format Support Test - ${browserName}</h3>
              <div class="grid grid-cols-3 gap-4">
                ${Object.entries(formats).map(([format, url]) => `
                  <div class="text-center">
                    <h4 class="mb-2 text-sm font-medium uppercase">${format}</h4>
                    <img src="${url}" 
                         alt="${format} test image"
                         class="w-full h-32 object-cover border rounded"
                         data-testid="img-${format}-${browserName}"
                         onerror="this.classList.add('error-state'); this.alt='Failed to load ${format}'" />
                    <div class="mt-2 text-xs" data-testid="status-${format}-${browserName}">Loading...</div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
          
          document.body.appendChild(testContainer);

          // Add load/error handlers
          Object.keys(formats).forEach(format => {
            const img = document.querySelector(`[data-testid="img-${format}-${browserName}"]`) as HTMLImageElement;
            const status = document.querySelector(`[data-testid="status-${format}-${browserName}"]`);
            
            img.onload = () => {
              status!.textContent = 'Loaded ✓';
              status!.className = 'mt-2 text-xs text-green-600';
            };
            
            img.onerror = () => {
              status!.textContent = 'Failed ✗';
              status!.className = 'mt-2 text-xs text-red-600';
            };
          });
        }, { formats: MEDIA_TEST_URLS.images, browserName });

        await page.waitForTimeout(5000);

        // Check each image format
        for (const [format, url] of Object.entries(MEDIA_TEST_URLS.images)) {
          const img = page.locator(`[data-testid="img-${format}-${browserName}"]`);
          const status = page.locator(`[data-testid="status-${format}-${browserName}"]`);
          
          await expect(img).toBeVisible();
          
          // Check if image loaded successfully
          const statusText = await status.textContent();
          const imageLoaded = await img.evaluate((element: HTMLImageElement) => {
            return element.complete && element.naturalHeight !== 0 && !element.classList.contains('error-state');
          });

          if (browserName === 'webkit' && format === 'webp') {
            // Safari may not support WebP in older versions
            console.log(`WebP support in Safari: ${imageLoaded ? 'Supported' : 'Not supported'}`);
          } else {
            expect(imageLoaded).toBe(true);
            expect(statusText).toContain('Loaded ✓');
          }
        }

        await context.close();
      });
    });
  });

  test.describe('YouTube Embed Compatibility', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should handle YouTube embeds in ${browserName}`, async ({ browser }) => {
        const context = await browser.newContext({
          permissions: ['audio-capture', 'video-capture']
        });
        const page = await context.newPage();
        
        await page.goto('http://localhost:5173');
        await page.waitForLoadState('networkidle');

        await page.evaluate(({ urls, browserName }) => {
          const testContainer = document.createElement('div');
          testContainer.innerHTML = `
            <div data-testid="youtube-compat-${browserName}" class="p-6">
              <h3 class="mb-4 font-bold">YouTube Compatibility - ${browserName}</h3>
              
              <!-- YouTube Thumbnail Test -->
              <div class="mb-6">
                <h4 class="mb-2 font-medium">YouTube Thumbnail</h4>
                <img src="${urls.thumbnail}" 
                     alt="YouTube thumbnail"
                     class="w-64 h-48 object-cover rounded border"
                     data-testid="yt-thumb-${browserName}" />
              </div>

              <!-- YouTube Embed Test -->
              <div class="mb-6">
                <h4 class="mb-2 font-medium">YouTube Embed (Privacy Mode)</h4>
                <div class="aspect-video max-w-md">
                  <iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?controls=1&modestbranding=1"
                          title="YouTube video player"
                          class="w-full h-full border rounded"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowfullscreen
                          data-testid="yt-embed-${browserName}">
                  </iframe>
                </div>
              </div>

              <!-- Browser-specific features -->
              <div class="mb-4">
                <h4 class="mb-2 font-medium">Browser Features</h4>
                <div class="text-sm space-y-1" data-testid="browser-features-${browserName}">
                  <div>User Agent: <span class="font-mono text-xs">${navigator.userAgent.substring(0, 50)}...</span></div>
                  <div>Video Support: <span id="video-support-${browserName}">Testing...</span></div>
                  <div>WebP Support: <span id="webp-support-${browserName}">Testing...</span></div>
                </div>
              </div>
            </div>
          `;
          
          document.body.appendChild(testContainer);

          // Test video element support
          const video = document.createElement('video');
          const videoSupport = video.canPlayType && (
            video.canPlayType('video/mp4') ||
            video.canPlayType('video/webm') ||
            video.canPlayType('video/ogg')
          );
          document.getElementById(`video-support-${browserName}`)!.textContent = videoSupport ? 'Supported ✓' : 'Limited ✗';

          // Test WebP support
          const webpTest = new Image();
          webpTest.onload = webpTest.onerror = () => {
            document.getElementById(`webp-support-${browserName}`)!.textContent = 
              (webpTest.height === 2) ? 'Supported ✓' : 'Not supported ✗';
          };
          webpTest.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
          
        }, { urls: MEDIA_TEST_URLS.youtube, browserName });

        await page.waitForTimeout(3000);

        // Verify YouTube thumbnail loads
        const thumbnail = page.locator(`[data-testid="yt-thumb-${browserName}"]`);
        await expect(thumbnail).toBeVisible();
        
        const thumbLoaded = await thumbnail.evaluate((img: HTMLImageElement) => {
          return img.complete && img.naturalHeight !== 0;
        });
        expect(thumbLoaded).toBe(true);

        // Verify YouTube embed is present
        const embed = page.locator(`[data-testid="yt-embed-${browserName}"]`);
        await expect(embed).toBeVisible();
        await expect(embed).toHaveAttribute('src', /youtube-nocookie\.com/);

        // Check browser-specific features
        const features = page.locator(`[data-testid="browser-features-${browserName}"]`);
        await expect(features).toBeVisible();

        await context.close();
      });
    });
  });

  test.describe('Mobile Device Compatibility', () => {
    const mobileDevices = [
      { name: 'iPhone', device: devices['iPhone 13'] },
      { name: 'Android', device: devices['Pixel 5'] },
      { name: 'iPad', device: devices['iPad Pro'] }
    ];

    mobileDevices.forEach(({ name, device }) => {
      test(`should work correctly on ${name}`, async ({ browser }) => {
        const context = await browser.newContext({
          ...device,
          permissions: ['audio-capture', 'video-capture']
        });
        const page = await context.newPage();
        
        await page.goto('http://localhost:5173');
        await page.waitForLoadState('networkidle');

        await page.evaluate(({ deviceName }) => {
          const testContainer = document.createElement('div');
          testContainer.innerHTML = `
            <div data-testid="mobile-test-${deviceName.toLowerCase()}" class="p-4">
              <h3 class="mb-4 text-lg font-bold">Mobile Test - ${deviceName}</h3>
              
              <!-- Mobile-optimized video thumbnail -->
              <div class="mb-6">
                <h4 class="mb-2 text-sm font-medium">Mobile Video Thumbnail</h4>
                <div class="aspect-video bg-black rounded-lg overflow-hidden relative">
                  <img src="https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg" 
                       alt="Mobile video thumbnail"
                       class="w-full h-full object-cover"
                       data-testid="mobile-thumb-${deviceName.toLowerCase()}" />
                  
                  <!-- Touch-friendly play button -->
                  <div class="absolute inset-0 flex items-center justify-center">
                    <button class="bg-red-600 rounded-full p-4 shadow-lg touch-manipulation"
                            data-testid="mobile-play-${deviceName.toLowerCase()}">
                      <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Mobile image gallery -->
              <div class="mb-6">
                <h4 class="mb-2 text-sm font-medium">Mobile Image Gallery</h4>
                <div class="grid grid-cols-2 gap-2">
                  ${['jpeg', 'png'].map((format, index) => `
                    <img src="https://via.placeholder.com/200x150.${format}/666/fff"
                         alt="${format} image"
                         class="w-full h-24 object-cover rounded"
                         data-testid="mobile-img-${format}-${deviceName.toLowerCase()}" />
                  `).join('')}
                </div>
              </div>

              <!-- Device info -->
              <div class="text-xs text-gray-600">
                <div>Screen: ${window.screen.width}x${window.screen.height}</div>
                <div>Viewport: ${window.innerWidth}x${window.innerHeight}</div>
                <div>Touch: ${('ontouchstart' in window) ? 'Supported' : 'Not supported'}</div>
                <div>Device Pixel Ratio: ${window.devicePixelRatio}</div>
              </div>
            </div>
          `;
          
          document.body.appendChild(testContainer);

          // Add touch event handling
          const playButton = document.querySelector(`[data-testid="mobile-play-${deviceName.toLowerCase()}"]`);
          let touched = false;
          
          playButton?.addEventListener('touchstart', () => {
            touched = true;
            playButton.classList.add('bg-red-700', 'scale-110');
          });
          
          playButton?.addEventListener('touchend', () => {
            if (touched) {
              setTimeout(() => {
                playButton.classList.remove('bg-red-700', 'scale-110');
              }, 150);
            }
          });
          
        }, { deviceName: name });

        await page.waitForTimeout(2000);

        // Verify mobile layout
        const mobileThumb = page.locator(`[data-testid="mobile-thumb-${name.toLowerCase()}"]`);
        await expect(mobileThumb).toBeVisible();
        
        const thumbLoaded = await mobileThumb.evaluate((img: HTMLImageElement) => {
          return img.complete && img.naturalHeight !== 0;
        });
        expect(thumbLoaded).toBe(true);

        // Test touch interaction
        const playButton = page.locator(`[data-testid="mobile-play-${name.toLowerCase()}"]`);
        await expect(playButton).toBeVisible();
        
        // Tap the play button
        await playButton.tap();
        await page.waitForTimeout(500);

        // Verify images in mobile gallery
        for (const format of ['jpeg', 'png']) {
          const img = page.locator(`[data-testid="mobile-img-${format}-${name.toLowerCase()}"]`);
          await expect(img).toBeVisible();
          
          const imgBox = await img.boundingBox();
          expect(imgBox?.width).toBeGreaterThan(0);
          expect(imgBox?.height).toBeGreaterThan(0);
        }

        // Test responsive behavior
        const viewport = page.viewportSize();
        expect(viewport?.width).toBeDefined();
        expect(viewport?.height).toBeDefined();

        await context.close();
      });
    });
  });

  test.describe('Network Conditions and Fallbacks', () => {
    test('should handle slow network conditions', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      // Simulate slow network
      await page.route('**/*{jpg,jpeg,png,webp}*', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        route.continue();
      });
      
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');

      await page.evaluate(() => {
        const testContainer = document.createElement('div');
        testContainer.innerHTML = `
          <div data-testid="slow-network-test" class="p-6">
            <h3 class="mb-4 font-bold">Slow Network Test</h3>
            
            <!-- Images with loading states -->
            <div class="grid grid-cols-2 gap-4">
              <div class="relative">
                <img src="https://via.placeholder.com/400x300.jpg/09f/fff" 
                     alt="Slow loading image"
                     class="w-full h-32 object-cover rounded opacity-0 transition-opacity duration-500"
                     data-testid="slow-img-1"
                     onload="this.classList.remove('opacity-0'); this.nextElementSibling.style.display='none'" />
                <div class="absolute inset-0 flex items-center justify-center bg-gray-200 rounded text-sm">
                  Loading...
                </div>
              </div>
              
              <div class="relative">
                <img src="https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg" 
                     alt="YouTube thumbnail"
                     class="w-full h-32 object-cover rounded opacity-0 transition-opacity duration-500"
                     data-testid="slow-yt-thumb"
                     onload="this.classList.remove('opacity-0'); this.nextElementSibling.style.display='none'" />
                <div class="absolute inset-0 flex items-center justify-center bg-gray-200 rounded text-sm">
                  Loading YouTube...
                </div>
              </div>
            </div>
            
            <!-- Loading indicators -->
            <div class="mt-4 text-sm text-gray-600" data-testid="loading-status">
              Images loading slowly...
            </div>
          </div>
        `;
        
        document.body.appendChild(testContainer);
      });

      // Wait for images to load despite slow network
      await page.waitForTimeout(6000);
      
      // Check loading states
      const slowImg = page.locator('[data-testid="slow-img-1"]');
      const ytThumb = page.locator('[data-testid="slow-yt-thumb"]');
      
      // Images should eventually load
      await expect(slowImg).toBeVisible();
      await expect(ytThumb).toBeVisible();
      
      // Check if opacity transition worked (indicates onload fired)
      const img1Opacity = await slowImg.evaluate((el) => window.getComputedStyle(el).opacity);
      const thumbOpacity = await ytThumb.evaluate((el) => window.getComputedStyle(el).opacity);
      
      expect(parseFloat(img1Opacity)).toBeGreaterThan(0);
      expect(parseFloat(thumbOpacity)).toBeGreaterThan(0);

      await context.close();
    });

    test('should handle offline/failed network requests', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      // Block all image requests
      await context.route('**/*{jpg,jpeg,png,gif,webp}*', route => {
        route.abort('failed');
      });
      
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');

      await page.evaluate(() => {
        const testContainer = document.createElement('div');
        testContainer.innerHTML = `
          <div data-testid="offline-test" class="p-6">
            <h3 class="mb-4 font-bold">Offline/Failed Network Test</h3>
            
            <div class="space-y-4">
              <!-- Image with fallback -->
              <div class="relative">
                <img src="https://example.com/will-fail.jpg" 
                     alt="This will fail to load"
                     class="w-32 h-24 object-cover border rounded"
                     data-testid="failed-img"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'" />
                <div class="w-32 h-24 bg-gray-200 border rounded hidden items-center justify-center text-xs text-gray-500">
                  Image failed
                </div>
              </div>

              <!-- YouTube thumbnail with fallback -->
              <div class="relative">
                <img src="https://img.youtube.com/vi/invalid-id/mqdefault.jpg" 
                     alt="YouTube thumbnail fallback test"
                     class="w-48 h-36 object-cover border rounded"
                     data-testid="failed-yt-thumb"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'" />
                <div class="w-48 h-36 bg-red-100 border border-red-200 rounded hidden items-center justify-center text-sm text-red-600">
                  <div class="text-center">
                    <div class="text-2xl mb-1">📹</div>
                    <div>Video unavailable</div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Network status -->
            <div class="mt-4 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              ⚠️ Network requests are being blocked (simulating offline mode)
            </div>
          </div>
        `;
        
        document.body.appendChild(testContainer);
      });

      await page.waitForTimeout(3000);
      
      // Verify fallback behavior
      const failedImg = page.locator('[data-testid="failed-img"]');
      const failedYtThumb = page.locator('[data-testid="failed-yt-thumb"]');
      
      // Images should be hidden due to onerror handler
      const imgDisplay = await failedImg.evaluate(el => window.getComputedStyle(el).display);
      const thumbDisplay = await failedYtThumb.evaluate(el => window.getComputedStyle(el).display);
      
      expect(imgDisplay).toBe('none');
      expect(thumbDisplay).toBe('none');
      
      // Fallback elements should be visible
      const fallbacks = page.locator('text=Image failed, text=Video unavailable');
      await expect(fallbacks.first()).toBeVisible();

      await context.close();
    });
  });

  test.describe('Performance Under Load', () => {
    test('should handle multiple simultaneous media loads', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');

      // Create multiple media elements simultaneously
      await page.evaluate(() => {
        const testContainer = document.createElement('div');
        const mediaCount = 20;
        
        testContainer.innerHTML = `
          <div data-testid="load-test" class="p-6">
            <h3 class="mb-4 font-bold">Performance Load Test</h3>
            <div class="text-sm text-gray-600 mb-4">Loading ${mediaCount} media items simultaneously...</div>
            
            <div class="grid grid-cols-4 gap-2">
              ${Array.from({ length: mediaCount }, (_, i) => `
                <div class="relative">
                  <img src="https://via.placeholder.com/150x100/${(i % 6) + 1}0${(i % 6) + 1}/fff?text=IMG${i + 1}" 
                       alt="Load test image ${i + 1}"
                       class="w-full h-16 object-cover rounded border"
                       data-testid="load-img-${i}"
                       onload="this.setAttribute('data-loaded', 'true')"
                       onerror="this.setAttribute('data-error', 'true')" />
                  <div class="absolute bottom-0 left-0 bg-black bg-opacity-50 text-white text-xs px-1">${i + 1}</div>
                </div>
              `).join('')}
            </div>
            
            <div class="mt-4 text-sm">
              <div>Loaded: <span id="loaded-count">0</span>/${mediaCount}</div>
              <div>Errors: <span id="error-count">0</span></div>
              <div>Load time: <span id="load-time">Measuring...</span></div>
            </div>
          </div>
        `;
        
        document.body.appendChild(testContainer);
        
        // Monitor loading progress
        const startTime = performance.now();
        let loadedCount = 0;
        let errorCount = 0;
        
        const updateCounts = () => {
          const loadedImages = document.querySelectorAll('img[data-loaded="true"]');
          const errorImages = document.querySelectorAll('img[data-error="true"]');
          
          loadedCount = loadedImages.length;
          errorCount = errorImages.length;
          
          document.getElementById('loaded-count')!.textContent = loadedCount.toString();
          document.getElementById('error-count')!.textContent = errorCount.toString();
          
          if (loadedCount + errorCount === mediaCount) {
            const endTime = performance.now();
            document.getElementById('load-time')!.textContent = `${Math.round(endTime - startTime)}ms`;
          }
        };
        
        // Check progress every 100ms
        const progressInterval = setInterval(() => {
          updateCounts();
          if (loadedCount + errorCount === mediaCount) {
            clearInterval(progressInterval);
          }
        }, 100);
      });

      // Wait for all images to load or fail
      await page.waitForTimeout(10000);
      
      // Check final results
      const loadedCount = await page.locator('#loaded-count').textContent();
      const errorCount = await page.locator('#error-count').textContent();
      const loadTime = await page.locator('#load-time').textContent();
      
      console.log(`Performance results: ${loadedCount} loaded, ${errorCount} errors, ${loadTime} total time`);
      
      // Verify reasonable performance
      expect(parseInt(loadedCount || '0')).toBeGreaterThan(15); // At least 75% should load
      expect(loadTime).not.toBe('Measuring...'); // Should have finished measuring
      
      // Check that page remains responsive
      await page.locator('[data-testid="load-test"]').click();
      await expect(page.locator('[data-testid="load-test"]')).toBeVisible();

      await context.close();
    });
  });
});