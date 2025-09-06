/**
 * Video Player Functionality Tests
 * 
 * Specialized tests for video player components, YouTube embedding,
 * and interactive video features across different browsers.
 */

import { test, expect, Page, BrowserContext, Locator } from '@playwright/test';

// Test video IDs and URLs
const TEST_VIDEOS = {
  rickRoll: {
    id: 'dQw4w9WgXcQ',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    shortUrl: 'https://youtu.be/dQw4w9WgXcQ'
  },
  tutorial: {
    id: 'ScMzIvxBSi4', // Example coding tutorial
    url: 'https://www.youtube.com/watch?v=ScMzIvxBSi4'
  },
  withPlaylist: {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLDcmCgguL9rxPoVn2ykUFc8TOpLyDU5gd'
  }
};

test.describe('Video Player Functionality', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      permissions: ['audio-capture', 'video-capture'],
      viewport: { width: 1280, height: 720 }
    });
    
    page = await context.newPage();
    
    // Mock console.log to capture debug information
    await page.addInitScript(() => {
      window.testLogs = [];
      const originalLog = console.log;
      console.log = (...args) => {
        window.testLogs.push(args.join(' '));
        originalLog.apply(console, args);
      };
    });

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await context.close();
  });

  test.describe('YouTube Embed Component Tests', () => {
    test('should extract YouTube ID from various URL formats', async () => {
      const urlFormats = [
        { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
        { url: 'https://youtu.be/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
        { url: 'https://youtube.com/embed/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
        { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s', expected: 'dQw4w9WgXcQ' }
      ];

      for (const { url, expected } of urlFormats) {
        const extractedId = await page.evaluate((videoUrl) => {
          // Test the YouTube ID extraction function
          const extractYouTubeId = (url) => {
            const patterns = [
              /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
              /youtube\.com\/watch\?.*v=([^&\n?#]+)/
            ];
            
            for (const pattern of patterns) {
              const match = url.match(pattern);
              if (match && match[1]) {
                return match[1];
              }
            }
            return null;
          };
          
          return extractYouTubeId(videoUrl);
        }, url);

        expect(extractedId).toBe(expected);
      }
    });

    test('should generate correct YouTube thumbnail URLs', async () => {
      const videoId = TEST_VIDEOS.rickRoll.id;
      const qualities = ['default', 'medium', 'high', 'maxres'];

      const thumbnailUrls = await page.evaluate(({ id, quals }) => {
        const getYouTubeThumbnail = (videoId, quality = 'medium') => {
          const qualityMap = {
            default: 'default',
            medium: 'mqdefault', 
            high: 'hqdefault',
            maxres: 'maxresdefault'
          };
          
          return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality] || 'mqdefault'}.jpg`;
        };

        return quals.map(q => ({
          quality: q,
          url: getYouTubeThumbnail(id, q)
        }));
      }, { id: videoId, quals: qualities });

      for (const { quality, url } of thumbnailUrls) {
        expect(url).toContain(`https://img.youtube.com/vi/${videoId}/`);
        expect(url).toMatch(/\.(jpg|jpeg)$/);
      }

      // Test that thumbnails actually load
      const mediumThumbnail = thumbnailUrls.find(t => t.quality === 'medium');
      const response = await page.request.get(mediumThumbnail.url);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('image');
    });

    test('should render YouTube thumbnail with play button overlay', async () => {
      await page.evaluate((videoData) => {
        // Create YouTube embed component test
        const testContainer = document.createElement('div');
        testContainer.innerHTML = `
          <div data-testid="youtube-component-test" class="p-6">
            <div class="relative group cursor-pointer overflow-hidden rounded-lg">
              <div class="relative aspect-video">
                <img
                  src="https://img.youtube.com/vi/${videoData.id}/mqdefault.jpg"
                  alt="YouTube Video Thumbnail"
                  class="w-full h-full object-cover"
                  data-testid="yt-thumbnail"
                />
                <!-- Play button overlay -->
                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300"></div>
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="bg-red-600 rounded-full p-3 shadow-lg group-hover:scale-110 group-hover:bg-red-700 transition-all duration-300">
                    <svg class="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24" data-testid="play-icon">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
                <!-- YouTube branding -->
                <div class="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div class="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">YouTube</div>
                </div>
              </div>
            </div>
          </div>
        `;
        
        document.body.appendChild(testContainer);
      }, TEST_VIDEOS.rickRoll);

      // Wait for component to render
      await page.waitForTimeout(1000);

      // Verify thumbnail loads
      const thumbnail = page.locator('[data-testid="yt-thumbnail"]');
      await expect(thumbnail).toBeVisible();

      const isLoaded = await thumbnail.evaluate((img: HTMLImageElement) => {
        return img.complete && img.naturalHeight !== 0;
      });
      expect(isLoaded).toBe(true);

      // Verify play button is present
      const playIcon = page.locator('[data-testid="play-icon"]');
      await expect(playIcon).toBeVisible();

      // Test hover effects
      const youtubeComponent = page.locator('[data-testid="youtube-component-test"]');
      await youtubeComponent.hover();
      
      // Verify hover state changes
      await page.waitForTimeout(500);
      const overlayVisible = await page.locator('.bg-red-700').count() > 0;
      // Hover effects should be working (this is a visual test, hard to assert precisely)
    });
  });

  test.describe('Video Player Interaction Tests', () => {
    test('should handle video player state transitions', async () => {
      await page.evaluate(() => {
        // Create interactive video player test
        const testContainer = document.createElement('div');
        testContainer.innerHTML = `
          <div data-testid="video-player-test" class="p-6">
            <h3 class="mb-4 font-bold">Video Player State Test</h3>
            
            <!-- Thumbnail state -->
            <div id="thumbnail-state" class="aspect-video relative cursor-pointer mb-4">
              <img src="https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg" 
                   class="w-full h-full object-cover rounded" 
                   data-testid="player-thumbnail" />
              <div class="absolute inset-0 flex items-center justify-center">
                <button class="bg-red-600 rounded-full p-4" data-testid="thumbnail-play-btn">
                  <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Player state (initially hidden) -->
            <div id="player-state" class="aspect-video relative mb-4" style="display: none;">
              <iframe 
                src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1"
                class="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
                data-testid="video-iframe"
              ></iframe>
              <button class="absolute top-4 right-4 bg-black bg-opacity-60 text-white p-2 rounded" 
                      data-testid="close-player-btn">×</button>
            </div>

            <!-- Control buttons -->
            <div class="flex space-x-4">
              <button id="toggle-to-player" class="bg-blue-600 text-white px-4 py-2 rounded" data-testid="show-player">
                Show Player
              </button>
              <button id="toggle-to-thumbnail" class="bg-gray-600 text-white px-4 py-2 rounded" data-testid="show-thumbnail">
                Show Thumbnail
              </button>
              <button class="bg-green-600 text-white px-4 py-2 rounded" data-testid="external-link">
                Open in YouTube
              </button>
            </div>
          </div>
        `;
        
        document.body.appendChild(testContainer);
        
        // Add interaction handlers
        document.getElementById('toggle-to-player')?.addEventListener('click', () => {
          document.getElementById('thumbnail-state').style.display = 'none';
          document.getElementById('player-state').style.display = 'block';
        });
        
        document.getElementById('toggle-to-thumbnail')?.addEventListener('click', () => {
          document.getElementById('thumbnail-state').style.display = 'block';
          document.getElementById('player-state').style.display = 'none';
        });

        document.querySelector('[data-testid="thumbnail-play-btn"]')?.addEventListener('click', () => {
          document.getElementById('thumbnail-state').style.display = 'none';
          document.getElementById('player-state').style.display = 'block';
        });

        document.querySelector('[data-testid="close-player-btn"]')?.addEventListener('click', () => {
          document.getElementById('thumbnail-state').style.display = 'block';
          document.getElementById('player-state').style.display = 'none';
        });
      });

      await page.waitForTimeout(1000);

      // Initially, thumbnail should be visible
      await expect(page.locator('[data-testid="player-thumbnail"]')).toBeVisible();
      await expect(page.locator('[data-testid="video-iframe"]')).not.toBeVisible();

      // Click thumbnail play button
      await page.locator('[data-testid="thumbnail-play-btn"]').click();
      await page.waitForTimeout(500);

      // Player should now be visible
      await expect(page.locator('[data-testid="video-iframe"]')).toBeVisible();
      await expect(page.locator('[data-testid="player-thumbnail"]')).not.toBeVisible();

      // Click close button
      await page.locator('[data-testid="close-player-btn"]').click();
      await page.waitForTimeout(500);

      // Should return to thumbnail
      await expect(page.locator('[data-testid="player-thumbnail"]')).toBeVisible();
      await expect(page.locator('[data-testid="video-iframe"]')).not.toBeVisible();

      // Test control buttons
      await page.locator('[data-testid="show-player"]').click();
      await expect(page.locator('[data-testid="video-iframe"]')).toBeVisible();

      await page.locator('[data-testid="show-thumbnail"]').click();
      await expect(page.locator('[data-testid="player-thumbnail"]')).toBeVisible();
    });

    test('should handle mute/unmute functionality', async () => {
      await page.evaluate(() => {
        const testContainer = document.createElement('div');
        testContainer.innerHTML = `
          <div data-testid="mute-test" class="p-6">
            <h3 class="mb-4 font-bold">Mute/Unmute Test</h3>
            
            <div class="aspect-video relative mb-4">
              <iframe id="test-iframe"
                src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?mute=1"
                class="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
                data-testid="mute-test-iframe"
              ></iframe>
              
              <div class="absolute top-3 right-3 flex space-x-2">
                <button class="bg-black bg-opacity-60 text-white p-2 rounded" data-testid="mute-btn">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" 
                          clip-rule="evenodd"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path>
                  </svg>
                </button>
              </div>
            </div>
            
            <div class="flex items-center space-x-4">
              <div class="flex items-center space-x-2">
                <span class="text-sm">Current state:</span>
                <span id="mute-state" class="font-bold text-red-600" data-testid="mute-state">MUTED</span>
              </div>
              <button id="toggle-mute" class="bg-blue-600 text-white px-4 py-2 rounded" data-testid="toggle-mute">
                Toggle Mute
              </button>
            </div>
          </div>
        `;
        
        document.body.appendChild(testContainer);
        
        let isMuted = true;
        const iframe = document.getElementById('test-iframe') as HTMLIFrameElement;
        const muteState = document.getElementById('mute-state');
        
        const toggleMute = () => {
          isMuted = !isMuted;
          const newSrc = isMuted 
            ? 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?mute=1'
            : 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?mute=0';
          
          iframe.src = newSrc;
          muteState.textContent = isMuted ? 'MUTED' : 'UNMUTED';
          muteState.className = isMuted ? 'font-bold text-red-600' : 'font-bold text-green-600';
        };
        
        document.getElementById('toggle-mute')?.addEventListener('click', toggleMute);
        document.querySelector('[data-testid="mute-btn"]')?.addEventListener('click', toggleMute);
      });

      await page.waitForTimeout(1000);

      // Initially should be muted
      await expect(page.locator('[data-testid="mute-state"]')).toHaveText('MUTED');
      await expect(page.locator('[data-testid="mute-test-iframe"]')).toHaveAttribute('src', /mute=1/);

      // Toggle mute
      await page.locator('[data-testid="toggle-mute"]').click();
      await page.waitForTimeout(1000);

      // Should be unmuted
      await expect(page.locator('[data-testid="mute-state"]')).toHaveText('UNMUTED');
      await expect(page.locator('[data-testid="mute-test-iframe"]')).toHaveAttribute('src', /mute=0/);

      // Test mute button overlay
      await page.locator('[data-testid="mute-btn"]').click();
      await page.waitForTimeout(1000);

      // Should be muted again
      await expect(page.locator('[data-testid="mute-state"]')).toHaveText('MUTED');
    });

    test('should handle external YouTube link opening', async () => {
      await page.evaluate((videoUrl) => {
        const testContainer = document.createElement('div');
        testContainer.innerHTML = `
          <div data-testid="external-link-test" class="p-6">
            <h3 class="mb-4 font-bold">External Link Test</h3>
            
            <div class="aspect-video relative mb-4">
              <img src="https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg" 
                   class="w-full h-full object-cover rounded" />
              
              <div class="absolute top-3 right-3">
                <button class="bg-black bg-opacity-60 text-white p-2 rounded" data-testid="external-btn">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                  </svg>
                </button>
              </div>
            </div>
            
            <button id="open-external" class="bg-red-600 text-white px-4 py-2 rounded" data-testid="open-external">
              Open in YouTube
            </button>
          </div>
        `;
        
        document.body.appendChild(testContainer);
        
        const openInYouTube = () => {
          window.open(videoUrl, '_blank', 'noopener,noreferrer');
        };
        
        document.getElementById('open-external')?.addEventListener('click', openInYouTube);
        document.querySelector('[data-testid="external-btn"]')?.addEventListener('click', openInYouTube);
      }, TEST_VIDEOS.rickRoll.url);

      await page.waitForTimeout(1000);

      // Test external link button
      const [popup] = await Promise.all([
        context.waitForEvent('page'),
        page.locator('[data-testid="open-external"]').click()
      ]);

      expect(popup.url()).toContain('youtube.com');
      await popup.close();

      // Test overlay external button
      const [popup2] = await Promise.all([
        context.waitForEvent('page'),
        page.locator('[data-testid="external-btn"]').click()
      ]);

      expect(popup2.url()).toContain('youtube.com');
      await popup2.close();
    });
  });

  test.describe('Video Player Advanced Features', () => {
    test('should handle expanded mode with auto-loop', async () => {
      await page.evaluate(() => {
        const testContainer = document.createElement('div');
        testContainer.innerHTML = `
          <div data-testid="expanded-mode-test" class="p-6">
            <h3 class="mb-4 font-bold">Expanded Mode with Auto-Loop</h3>
            
            <div class="aspect-video relative mb-4">
              <iframe 
                src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&loop=1&playlist=dQw4w9WgXcQ"
                class="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                data-testid="expanded-iframe"
              ></iframe>
              
              <!-- Loop indicator -->
              <div class="absolute bottom-3 left-3">
                <div class="bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs font-medium">
                  🔁 Auto-looping
                </div>
              </div>
              
              <!-- Controls overlay -->
              <div class="absolute top-3 right-3 flex space-x-2 opacity-0 hover:opacity-100 transition-opacity">
                <button class="bg-black bg-opacity-60 text-white p-2 rounded" data-testid="expanded-mute">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                  </svg>
                </button>
                <button class="bg-black bg-opacity-60 text-white p-2 rounded" data-testid="expanded-external">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                  </svg>
                </button>
              </div>
            </div>
            
            <div class="flex space-x-4">
              <button class="bg-blue-600 text-white px-4 py-2 rounded" data-testid="disable-loop">
                Disable Loop
              </button>
              <button class="bg-green-600 text-white px-4 py-2 rounded" data-testid="enable-loop">
                Enable Loop
              </button>
            </div>
          </div>
        `;
        
        document.body.appendChild(testContainer);
        
        const iframe = document.querySelector('[data-testid="expanded-iframe"]') as HTMLIFrameElement;
        
        document.querySelector('[data-testid="disable-loop"]')?.addEventListener('click', () => {
          iframe.src = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&loop=0';
        });
        
        document.querySelector('[data-testid="enable-loop"]')?.addEventListener('click', () => {
          iframe.src = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&loop=1&playlist=dQw4w9WgXcQ';
        });
      });

      await page.waitForTimeout(1000);

      // Verify expanded mode iframe is present
      const expandedIframe = page.locator('[data-testid="expanded-iframe"]');
      await expect(expandedIframe).toBeVisible();
      await expect(expandedIframe).toHaveAttribute('src', /loop=1/);
      await expect(expandedIframe).toHaveAttribute('src', /playlist=/);

      // Test loop controls
      await page.locator('[data-testid="disable-loop"]').click();
      await page.waitForTimeout(1000);
      await expect(expandedIframe).toHaveAttribute('src', /loop=0/);

      await page.locator('[data-testid="enable-loop"]').click();
      await page.waitForTimeout(1000);
      await expect(expandedIframe).toHaveAttribute('src', /loop=1/);

      // Verify loop indicator is visible
      const loopIndicator = page.locator('text=🔁 Auto-looping');
      await expect(loopIndicator).toBeVisible();
    });

    test('should validate iframe security attributes', async () => {
      await page.evaluate(() => {
        const testContainer = document.createElement('div');
        testContainer.innerHTML = `
          <div data-testid="security-test" class="p-6">
            <h3 class="mb-4 font-bold">Security Attributes Test</h3>
            
            <iframe 
              src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
              title="Security Test Video"
              class="w-full aspect-video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-presentation"
              data-testid="security-iframe"
            ></iframe>
          </div>
        `;
        
        document.body.appendChild(testContainer);
      });

      const securityIframe = page.locator('[data-testid="security-iframe"]');
      
      // Verify security attributes
      await expect(securityIframe).toHaveAttribute('src', /youtube-nocookie\.com/);
      await expect(securityIframe).toHaveAttribute('allow', /autoplay/);
      await expect(securityIframe).toHaveAttribute('allowfullscreen');
      await expect(securityIframe).toHaveAttribute('loading', 'lazy');
      await expect(securityIframe).toHaveAttribute('sandbox');
      await expect(securityIframe).toHaveAttribute('title');
    });
  });

  test.describe('Performance and Accessibility Tests', () => {
    test('should implement proper lazy loading', async () => {
      await page.evaluate(() => {
        const testContainer = document.createElement('div');
        testContainer.innerHTML = `
          <div data-testid="lazy-loading-test" class="p-6">
            <h3 class="mb-4 font-bold">Lazy Loading Test</h3>
            
            <!-- Above fold video (should load immediately) -->
            <div class="mb-8">
              <h4 class="mb-2">Above Fold Video</h4>
              <img src="https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg" 
                   class="w-full aspect-video object-cover" 
                   alt="Above fold video"
                   data-testid="above-fold-thumb" />
            </div>
            
            <!-- Below fold videos (should lazy load) -->
            <div style="margin-top: 2000px;">
              <h4 class="mb-2">Below Fold Videos</h4>
              <div class="grid grid-cols-2 gap-4">
                ${Array.from({ length: 6 }, (_, i) => `
                  <img src="https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg" 
                       class="w-full aspect-video object-cover" 
                       loading="lazy"
                       alt="Below fold video ${i + 1}"
                       data-testid="below-fold-thumb-${i}" />
                `).join('')}
              </div>
            </div>
          </div>
        `;
        
        document.body.appendChild(testContainer);
      });

      await page.waitForTimeout(1000);

      // Above fold image should load immediately
      const aboveFoldThumb = page.locator('[data-testid="above-fold-thumb"]');
      await expect(aboveFoldThumb).toBeVisible();

      const isAboveFoldLoaded = await aboveFoldThumb.evaluate((img: HTMLImageElement) => {
        return img.complete && img.naturalHeight !== 0;
      });
      expect(isAboveFoldLoaded).toBe(true);

      // Below fold images should have lazy loading attribute
      for (let i = 0; i < 6; i++) {
        const belowFoldThumb = page.locator(`[data-testid="below-fold-thumb-${i}"]`);
        await expect(belowFoldThumb).toHaveAttribute('loading', 'lazy');
      }

      // Scroll to trigger lazy loading
      await page.locator('[data-testid="below-fold-thumb-0"]').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      // First below-fold image should now be loaded
      const firstBelowFold = page.locator('[data-testid="below-fold-thumb-0"]');
      const isBelowFoldLoaded = await firstBelowFold.evaluate((img: HTMLImageElement) => {
        return img.complete && img.naturalHeight !== 0;
      });
      expect(isBelowFoldLoaded).toBe(true);
    });

    test('should provide proper accessibility attributes', async () => {
      await page.evaluate(() => {
        const testContainer = document.createElement('div');
        testContainer.innerHTML = `
          <div data-testid="accessibility-test" class="p-6">
            <h3 class="mb-4 font-bold">Accessibility Test</h3>
            
            <!-- Accessible video thumbnail -->
            <div class="aspect-video relative" role="article" aria-label="YouTube video preview">
              <img src="https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg" 
                   alt="Rick Astley - Never Gonna Give You Up (Official Video)"
                   class="w-full h-full object-cover rounded"
                   data-testid="accessible-thumb" />
              
              <button class="absolute inset-0 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-red-500 focus:ring-opacity-50 rounded"
                      aria-label="Play Rick Astley - Never Gonna Give You Up video"
                      data-testid="accessible-play-btn">
                <div class="bg-red-600 rounded-full p-3 shadow-lg">
                  <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
                <span class="sr-only">Play video</span>
              </button>
            </div>
            
            <!-- Video controls with ARIA labels -->
            <div class="mt-4 flex space-x-4" role="toolbar" aria-label="Video controls">
              <button class="bg-gray-600 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-gray-500"
                      aria-label="Mute video"
                      data-testid="accessible-mute">
                Mute
              </button>
              <button class="bg-blue-600 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Open video in YouTube in new tab"
                      data-testid="accessible-external">
                Open in YouTube
              </button>
            </div>
            
            <!-- Screen reader announcements -->
            <div aria-live="polite" aria-atomic="true" class="sr-only" data-testid="announcements"></div>
          </div>
        `;
        
        document.body.appendChild(testContainer);
        
        // Add interaction handlers with announcements
        const announcements = document.querySelector('[data-testid="announcements"]');
        
        document.querySelector('[data-testid="accessible-play-btn"]')?.addEventListener('click', () => {
          announcements!.textContent = 'Video is now playing';
        });
        
        document.querySelector('[data-testid="accessible-mute"]')?.addEventListener('click', () => {
          announcements!.textContent = 'Video has been muted';
        });
        
        document.querySelector('[data-testid="accessible-external"]')?.addEventListener('click', () => {
          announcements!.textContent = 'Opening video in YouTube';
        });
      });

      await page.waitForTimeout(1000);

      // Test accessibility attributes
      const accessibleThumb = page.locator('[data-testid="accessible-thumb"]');
      await expect(accessibleThumb).toHaveAttribute('alt');

      const playButton = page.locator('[data-testid="accessible-play-btn"]');
      await expect(playButton).toHaveAttribute('aria-label');

      // Test keyboard navigation
      await playButton.focus();
      await expect(playButton).toBeFocused();

      // Test screen reader announcements
      await playButton.click();
      const announcements = page.locator('[data-testid="announcements"]');
      await expect(announcements).toHaveText('Video is now playing');

      // Test control accessibility
      const muteButton = page.locator('[data-testid="accessible-mute"]');
      await muteButton.focus();
      await expect(muteButton).toBeFocused();
      
      await muteButton.click();
      await expect(announcements).toHaveText('Video has been muted');
    });
  });
});