/**
 * Standalone Video and Thumbnail Tests
 * 
 * Tests that don't depend on the specific application structure,
 * focusing purely on video and thumbnail functionality validation.
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Standalone Video and Thumbnail Tests', () => {
  test('should validate YouTube URL parsing and thumbnail generation', async ({ page }) => {
    // This test doesn't need the app - it tests the logic directly
    const results = await page.evaluate(() => {
      // YouTube URL extraction function
      const extractYouTubeId = (url: string): string | null => {
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

      // YouTube thumbnail URL generation
      const getYouTubeThumbnail = (videoId: string, quality: string = 'medium'): string => {
        const qualityMap = {
          default: 'default',
          medium: 'mqdefault', 
          high: 'hqdefault',
          maxres: 'maxresdefault'
        };
        
        return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality as keyof typeof qualityMap] || 'mqdefault'}.jpg`;
      };
      
      // Test various YouTube URL formats
      const testUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://youtube.com/embed/dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLtest'
      ];

      return {
        extraction: testUrls.map(url => ({
          url,
          id: extractYouTubeId(url),
          thumbnailMedium: extractYouTubeId(url) ? getYouTubeThumbnail(extractYouTubeId(url)!) : null,
          thumbnailHigh: extractYouTubeId(url) ? getYouTubeThumbnail(extractYouTubeId(url)!, 'high') : null
        })),
        qualities: ['default', 'medium', 'high', 'maxres'].map(quality => ({
          quality,
          url: getYouTubeThumbnail('dQw4w9WgXcQ', quality)
        }))
      };
    });

    // Validate URL extraction
    for (const result of results.extraction) {
      expect(result.id).toBe('dQw4w9WgXcQ');
      expect(result.thumbnailMedium).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg');
      expect(result.thumbnailHigh).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
    }

    // Validate quality mapping
    const expectedQualityUrls = {
      default: 'https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg',
      medium: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
      high: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      maxres: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg'
    };

    for (const result of results.qualities) {
      expect(result.url).toBe(expectedQualityUrls[result.quality as keyof typeof expectedQualityUrls]);
    }

    console.log('✅ YouTube URL parsing and thumbnail generation validated');
  });

  test('should validate image loading and error handling', async ({ page }) => {
    // Create a test page to validate image loading
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Image Loading Test</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .test-container { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
          .image-test { width: 200px; height: 150px; object-fit: cover; margin: 10px; border: 2px solid #eee; }
          .status { font-size: 12px; color: #666; margin-top: 5px; }
          .success { color: green; }
          .error { color: red; }
        </style>
      </head>
      <body>
        <h1>Video and Image Loading Tests</h1>
        
        <div class="test-container">
          <h3>YouTube Thumbnail Loading</h3>
          <img id="youtube-thumb" class="image-test" 
               src="https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg" 
               alt="YouTube Thumbnail" />
          <div id="youtube-status" class="status">Loading...</div>
        </div>

        <div class="test-container">
          <h3>Valid Image Loading</h3>
          <img id="valid-image" class="image-test" 
               src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNDA5NkZGIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5UZXN0IEltYWdlPC90ZXh0Pgo8L3N2Zz4K" 
               alt="Valid Test Image" />
          <div id="valid-status" class="status">Loading...</div>
        </div>

        <div class="test-container">
          <h3>Invalid Image Loading (Should Fail)</h3>
          <img id="invalid-image" class="image-test" 
               src="https://invalid-domain.example/image.jpg" 
               alt="Invalid Image" />
          <div id="invalid-status" class="status">Loading...</div>
        </div>

        <div class="test-container">
          <h3>YouTube Video Embed Structure</h3>
          <div style="width: 400px; height: 225px; border: 1px solid #ccc;">
            <iframe width="100%" height="100%"
                    src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?controls=1&modestbranding=1"
                    title="YouTube video player"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                    id="youtube-embed">
            </iframe>
          </div>
          <div id="embed-status" class="status">Embed loaded</div>
        </div>

        <script>
          // YouTube thumbnail
          const ytThumb = document.getElementById('youtube-thumb');
          const ytStatus = document.getElementById('youtube-status');
          ytThumb.onload = () => {
            ytStatus.textContent = 'YouTube thumbnail loaded successfully ✅';
            ytStatus.className = 'status success';
          };
          ytThumb.onerror = () => {
            ytStatus.textContent = 'YouTube thumbnail failed to load ❌';
            ytStatus.className = 'status error';
          };

          // Valid image
          const validImg = document.getElementById('valid-image');
          const validStatus = document.getElementById('valid-status');
          validImg.onload = () => {
            validStatus.textContent = 'Valid image loaded successfully ✅';
            validStatus.className = 'status success';
          };
          validImg.onerror = () => {
            validStatus.textContent = 'Valid image failed to load ❌';
            validStatus.className = 'status error';
          };

          // Invalid image
          const invalidImg = document.getElementById('invalid-image');
          const invalidStatus = document.getElementById('invalid-status');
          invalidImg.onload = () => {
            invalidStatus.textContent = 'Invalid image unexpectedly loaded ⚠️';
            invalidStatus.className = 'status';
          };
          invalidImg.onerror = () => {
            invalidStatus.textContent = 'Invalid image properly failed to load ✅';
            invalidStatus.className = 'status success';
          };
        </script>
      </body>
      </html>
    `);

    // Wait for images to load/fail
    await page.waitForTimeout(5000);

    // Validate YouTube thumbnail
    const ytStatus = await page.locator('#youtube-status').textContent();
    console.log(`YouTube thumbnail: ${ytStatus}`);
    
    // Validate valid image
    const validStatus = await page.locator('#valid-status').textContent();
    expect(validStatus).toContain('loaded successfully');
    console.log(`Valid image: ${validStatus}`);

    // Validate invalid image properly fails
    const invalidStatus = await page.locator('#invalid-status').textContent();
    expect(invalidStatus).toContain('properly failed to load');
    console.log(`Invalid image: ${invalidStatus}`);

    // Validate YouTube embed
    const embed = page.locator('#youtube-embed');
    await expect(embed).toBeVisible();
    await expect(embed).toHaveAttribute('src', /youtube-nocookie\.com/);
    console.log('✅ YouTube embed structure validated');
  });

  test('should validate responsive video container behavior', async ({ page }) => {
    const viewportSizes = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1280, height: 720, name: 'Desktop' }
    ];

    for (const viewport of viewportSizes) {
      await page.setViewportSize(viewport);
      
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Responsive Video Test - ${viewport.name}</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            .container { max-width: 100%; }
            .video-container { 
              position: relative; 
              width: 100%; 
              height: 0; 
              padding-bottom: 56.25%; /* 16:9 aspect ratio */
              background: #f0f0f0;
              border-radius: 8px;
              overflow: hidden;
            }
            .video-thumbnail {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .play-button {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 60px;
              height: 60px;
              background: rgba(255, 0, 0, 0.8);
              border: none;
              border-radius: 50%;
              color: white;
              font-size: 20px;
              cursor: pointer;
              transition: background 0.3s;
            }
            .play-button:hover {
              background: rgba(255, 0, 0, 1);
            }
            .info { margin-top: 10px; font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Responsive Video Test - ${viewport.name}</h2>
            <p>Viewport: ${viewport.width}x${viewport.height}</p>
            
            <div class="video-container" id="video-container">
              <img class="video-thumbnail" 
                   src="https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg" 
                   alt="Video thumbnail" 
                   id="thumbnail" />
              <button class="play-button" id="play-btn">▶</button>
            </div>
            
            <div class="info">
              <div>Container width: <span id="container-width">-</span>px</div>
              <div>Container height: <span id="container-height">-</span>px</div>
              <div>Aspect ratio: <span id="aspect-ratio">-</span></div>
            </div>
          </div>

          <script>
            const container = document.getElementById('video-container');
            const rect = container.getBoundingClientRect();
            const aspectRatio = (rect.width / rect.height).toFixed(2);
            
            document.getElementById('container-width').textContent = Math.round(rect.width);
            document.getElementById('container-height').textContent = Math.round(rect.height);
            document.getElementById('aspect-ratio').textContent = aspectRatio + ' (target: 1.78)';
          </script>
        </body>
        </html>
      `);

      await page.waitForTimeout(1000);

      // Validate container is responsive
      const container = page.locator('#video-container');
      await expect(container).toBeVisible();

      const containerBox = await container.boundingBox();
      expect(containerBox?.width).toBeGreaterThan(0);
      expect(containerBox?.width).toBeLessThanOrEqual(viewport.width - 40); // Account for padding

      // Validate aspect ratio is maintained (16:9 ≈ 1.78)
      const aspectRatio = containerBox!.width / containerBox!.height;
      expect(aspectRatio).toBeCloseTo(1.78, 1);

      // Validate thumbnail loads
      const thumbnail = page.locator('#thumbnail');
      await expect(thumbnail).toBeVisible();

      // Validate play button
      const playBtn = page.locator('#play-btn');
      await expect(playBtn).toBeVisible();
      await playBtn.click(); // Test interaction

      console.log(`✅ Responsive validation passed for ${viewport.name}: ${Math.round(containerBox!.width)}x${Math.round(containerBox!.height)} (ratio: ${aspectRatio.toFixed(2)})`);
    }
  });

  test('should validate browser media support and APIs', async ({ page }) => {
    const capabilities = await page.evaluate(async () => {
      const results = {
        elements: {
          video: !!document.createElement('video'),
          audio: !!document.createElement('audio'),
          canvas: !!document.createElement('canvas'),
        },
        apis: {
          intersectionObserver: 'IntersectionObserver' in window,
          requestAnimationFrame: 'requestAnimationFrame' in window,
          fetch: 'fetch' in window,
          promises: 'Promise' in window,
          asyncAwait: true, // If this runs, async/await is supported
        },
        media: {
          video: null as any,
          audio: null as any,
        },
        images: {
          webpSupported: false,
          formats: ['jpg', 'png', 'gif', 'svg', 'webp', 'avif']
        }
      };

      // Test video capabilities
      const video = document.createElement('video');
      if (video.canPlayType) {
        results.media.video = {
          mp4: video.canPlayType('video/mp4'),
          webm: video.canPlayType('video/webm'),
          ogg: video.canPlayType('video/ogg'),
        };
      }

      // Test audio capabilities
      const audio = document.createElement('audio');
      if (audio.canPlayType) {
        results.media.audio = {
          mp3: audio.canPlayType('audio/mpeg'),
          ogg: audio.canPlayType('audio/ogg'),
          wav: audio.canPlayType('audio/wav'),
        };
      }

      // Test WebP support
      try {
        const webpSupport = await new Promise<boolean>(resolve => {
          const webP = new Image();
          webP.onload = webP.onerror = () => resolve(webP.height === 2);
          webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
        });
        results.images.webpSupported = webpSupport;
      } catch (e) {
        results.images.webpSupported = false;
      }

      return results;
    });

    // Validate essential capabilities
    expect(capabilities.elements.video).toBe(true);
    expect(capabilities.elements.audio).toBe(true);
    expect(capabilities.elements.canvas).toBe(true);
    expect(capabilities.apis.intersectionObserver).toBe(true);
    expect(capabilities.apis.requestAnimationFrame).toBe(true);
    expect(capabilities.apis.fetch).toBe(true);
    expect(capabilities.apis.promises).toBe(true);

    // Log media capabilities
    console.log('🎭 Browser Media Capabilities:');
    console.log(`  HTML5 Video: ${capabilities.elements.video ? '✅' : '❌'}`);
    console.log(`  HTML5 Audio: ${capabilities.elements.audio ? '✅' : '❌'}`);
    console.log(`  Canvas: ${capabilities.elements.canvas ? '✅' : '❌'}`);
    console.log(`  Intersection Observer: ${capabilities.apis.intersectionObserver ? '✅' : '❌'}`);
    console.log(`  Fetch API: ${capabilities.apis.fetch ? '✅' : '❌'}`);
    console.log(`  WebP Support: ${capabilities.images.webpSupported ? '✅' : '❌'}`);
    
    if (capabilities.media.video) {
      console.log(`  Video Formats:`);
      console.log(`    MP4: ${capabilities.media.video.mp4 || 'Unknown'}`);
      console.log(`    WebM: ${capabilities.media.video.webm || 'Unknown'}`);
      console.log(`    OGG: ${capabilities.media.video.ogg || 'Unknown'}`);
    }
  });

  test('should validate video player interaction patterns', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Video Player Interaction Test</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .player-container { max-width: 640px; margin: 0 auto; }
          .video-wrapper { position: relative; padding-bottom: 56.25%; height: 0; background: #000; border-radius: 8px; overflow: hidden; }
          .video-thumbnail { position: absolute; width: 100%; height: 100%; object-fit: cover; cursor: pointer; }
          .video-iframe { position: absolute; width: 100%; height: 100%; border: 0; }
          .play-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3); transition: opacity 0.3s; }
          .play-button { width: 80px; height: 80px; background: rgba(255,0,0,0.9); border: none; border-radius: 50%; color: white; font-size: 32px; cursor: pointer; transition: all 0.3s; }
          .play-button:hover { background: rgba(255,0,0,1); transform: scale(1.1); }
          .controls { margin-top: 15px; display: flex; gap: 10px; justify-content: center; }
          .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
          .btn-primary { background: #007bff; color: white; }
          .btn-secondary { background: #6c757d; color: white; }
          .btn-danger { background: #dc3545; color: white; }
          .hidden { display: none; }
        </style>
      </head>
      <body>
        <div class="player-container">
          <h2>Interactive Video Player Test</h2>
          
          <div class="video-wrapper">
            <!-- Thumbnail state -->
            <img id="thumbnail" class="video-thumbnail" 
                 src="https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg" 
                 alt="Video thumbnail" />
            <div id="play-overlay" class="play-overlay">
              <button id="main-play-btn" class="play-button">▶</button>
            </div>

            <!-- Player state (hidden initially) -->
            <iframe id="player" class="video-iframe hidden"
                    src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&controls=1"
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen>
            </iframe>
          </div>

          <div class="controls">
            <button id="show-thumbnail" class="btn btn-secondary">Show Thumbnail</button>
            <button id="show-player" class="btn btn-primary">Show Player</button>
            <button id="open-external" class="btn btn-danger">Open in YouTube</button>
          </div>

          <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
            <h4>Test Results:</h4>
            <div id="test-log"></div>
          </div>
        </div>

        <script>
          const thumbnail = document.getElementById('thumbnail');
          const playOverlay = document.getElementById('play-overlay');
          const player = document.getElementById('player');
          const mainPlayBtn = document.getElementById('main-play-btn');
          const showThumbnailBtn = document.getElementById('show-thumbnail');
          const showPlayerBtn = document.getElementById('show-player');
          const openExternalBtn = document.getElementById('open-external');
          const testLog = document.getElementById('test-log');

          function log(message) {
            testLog.innerHTML += '<div>✅ ' + message + '</div>';
          }

          function showThumbnail() {
            thumbnail.classList.remove('hidden');
            playOverlay.classList.remove('hidden');
            player.classList.add('hidden');
            log('Thumbnail view activated');
          }

          function showPlayer() {
            thumbnail.classList.add('hidden');
            playOverlay.classList.add('hidden');
            player.classList.remove('hidden');
            log('Player view activated');
          }

          // Event listeners
          mainPlayBtn.addEventListener('click', () => {
            showPlayer();
            log('Main play button clicked');
          });

          showThumbnailBtn.addEventListener('click', showThumbnail);
          showPlayerBtn.addEventListener('click', showPlayer);

          openExternalBtn.addEventListener('click', () => {
            window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank', 'noopener,noreferrer');
            log('External YouTube link opened');
          });

          // Initialize
          log('Video player interface initialized');
        </script>
      </body>
      </html>
    `);

    await page.waitForTimeout(2000);

    // Test initial state - thumbnail should be visible
    await expect(page.locator('#thumbnail')).toBeVisible();
    await expect(page.locator('#player')).not.toBeVisible();

    // Test main play button
    await page.locator('#main-play-btn').click();
    await page.waitForTimeout(1000);
    
    // Player should now be visible, thumbnail hidden
    await expect(page.locator('#player')).toBeVisible();
    await expect(page.locator('#thumbnail')).not.toBeVisible();

    // Test show thumbnail button
    await page.locator('#show-thumbnail').click();
    await page.waitForTimeout(500);
    
    await expect(page.locator('#thumbnail')).toBeVisible();
    await expect(page.locator('#player')).not.toBeVisible();

    // Test show player button
    await page.locator('#show-player').click();
    await page.waitForTimeout(500);
    
    await expect(page.locator('#player')).toBeVisible();

    // Test external link
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.locator('#open-external').click()
    ]);
    
    expect(popup.url()).toContain('youtube.com');
    await popup.close();

    // Verify test log shows interactions
    const testLog = await page.locator('#test-log').textContent();
    expect(testLog).toContain('Video player interface initialized');
    expect(testLog).toContain('Main play button clicked');
    expect(testLog).toContain('External YouTube link opened');

    console.log('✅ Video player interaction patterns validated');
  });
});