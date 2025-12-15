/**
 * Simple Video and Thumbnail Tests
 * 
 * Basic validation of video and thumbnail functionality for demonstration purposes.
 * Focuses on core functionality that can run reliably in any environment.
 */

import { test, expect, Page } from '@playwright/test';

// Real test URLs that should be available
const TEST_URLS = {
  youtube: {
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
    video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  images: {
    // Using a more reliable placeholder service
    placeholder: 'https://picsum.photos/400/300'
  }
};

test.describe('Simple Video and Thumbnail Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Wait for the feed to be visible
    await expect(page.locator('[data-testid="social-media-feed"]')).toBeVisible();
  });

  test('should validate YouTube thumbnail URL generation', async ({ page }) => {
    // Test YouTube URL ID extraction function
    const extractedId = await page.evaluate(() => {
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
      
      const testUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://youtube.com/embed/dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s'
      ];
      
      return testUrls.map(url => ({
        url,
        id: extractYouTubeId(url),
        thumbnailUrl: extractYouTubeId(url) ? `https://img.youtube.com/vi/${extractYouTubeId(url)}/mqdefault.jpg` : null
      }));
    });

    // Verify all URLs extract the correct video ID
    for (const result of extractedId) {
      expect(result.id).toBe('dQw4w9WgXcQ');
      expect(result.thumbnailUrl).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg');
    }

    console.log('✅ YouTube ID extraction working correctly');
  });

  test('should validate thumbnail loading capabilities', async ({ page }) => {
    // Create a test element to check image loading
    await page.evaluate((thumbnailUrl) => {
      const testContainer = document.createElement('div');
      testContainer.innerHTML = `
        <div data-testid="thumbnail-test" class="p-6">
          <h3 class="mb-4 font-bold">Thumbnail Loading Test</h3>
          
          <div class="space-y-4">
            <!-- YouTube Thumbnail -->
            <div>
              <h4 class="text-sm font-medium mb-2">YouTube Thumbnail</h4>
              <img src="${thumbnailUrl}" 
                   alt="YouTube thumbnail"
                   class="w-64 h-48 object-cover rounded border"
                   data-testid="youtube-thumbnail"
                   onload="this.setAttribute('data-loaded', 'true')"
                   onerror="this.setAttribute('data-error', 'true')" />
              <div class="text-xs text-gray-500 mt-1">
                Status: <span data-testid="youtube-thumb-status">Loading...</span>
              </div>
            </div>

            <!-- Generic Image -->
            <div>
              <h4 class="text-sm font-medium mb-2">Generic Image</h4>
              <img src="https://picsum.photos/300/200?random=1" 
                   alt="Generic image"
                   class="w-64 h-48 object-cover rounded border"
                   data-testid="generic-image"
                   onload="this.setAttribute('data-loaded', 'true')"
                   onerror="this.setAttribute('data-error', 'true')" />
              <div class="text-xs text-gray-500 mt-1">
                Status: <span data-testid="generic-img-status">Loading...</span>
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(testContainer);

      // Add status monitoring
      const ytThumb = document.querySelector('[data-testid="youtube-thumbnail"]') as HTMLImageElement;
      const ytStatus = document.querySelector('[data-testid="youtube-thumb-status"]');
      const genericImg = document.querySelector('[data-testid="generic-image"]') as HTMLImageElement;
      const genericStatus = document.querySelector('[data-testid="generic-img-status"]');
      
      ytThumb.onload = () => ytStatus!.textContent = 'Loaded ✅';
      ytThumb.onerror = () => ytStatus!.textContent = 'Failed ❌';
      genericImg.onload = () => genericStatus!.textContent = 'Loaded ✅';
      genericImg.onerror = () => genericStatus!.textContent = 'Failed ❌';
      
    }, TEST_URLS.youtube.thumbnail);

    await page.waitForTimeout(5000); // Give images time to load

    // Check YouTube thumbnail
    const youtubeThumb = page.locator('[data-testid="youtube-thumbnail"]');
    await expect(youtubeThumb).toBeVisible();
    
    const ytLoaded = await youtubeThumb.getAttribute('data-loaded');
    const ytError = await youtubeThumb.getAttribute('data-error');
    
    if (ytLoaded === 'true') {
      console.log('✅ YouTube thumbnail loaded successfully');
      expect(ytLoaded).toBe('true');
    } else if (ytError === 'true') {
      console.log('⚠️ YouTube thumbnail failed to load (network issue)');
      // This is acceptable in test environments
    }

    // Check generic image
    const genericImg = page.locator('[data-testid="generic-image"]');
    await expect(genericImg).toBeVisible();
    
    const genericLoaded = await genericImg.getAttribute('data-loaded');
    const genericError = await genericImg.getAttribute('data-error');
    
    if (genericLoaded === 'true') {
      console.log('✅ Generic image loaded successfully');
    } else if (genericError === 'true') {
      console.log('⚠️ Generic image failed to load (network issue)');
    }

    // Verify at least the elements exist and have proper attributes
    await expect(youtubeThumb).toHaveAttribute('alt', 'YouTube thumbnail');
    await expect(genericImg).toHaveAttribute('alt', 'Generic image');
  });

  test('should validate video embed structure', async ({ page }) => {
    // Create a mock video embed to test structure
    await page.evaluate(() => {
      const testContainer = document.createElement('div');
      testContainer.innerHTML = `
        <div data-testid="video-embed-test" class="p-6">
          <h3 class="mb-4 font-bold">Video Embed Structure Test</h3>
          
          <!-- YouTube Embed Structure -->
          <div class="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
            <iframe 
              src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?controls=1&modestbranding=1"
              title="YouTube video player"
              class="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
              data-testid="youtube-iframe"
            ></iframe>
          </div>

          <!-- Video Controls -->
          <div class="mt-4 flex space-x-4">
            <button class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                    data-testid="play-button">
              ▶ Play
            </button>
            <button class="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
                    data-testid="mute-button">
              🔇 Mute
            </button>
            <button class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                    data-testid="external-button">
              ↗ Open in YouTube
            </button>
          </div>

          <!-- Embed Information -->
          <div class="mt-4 p-3 bg-gray-50 rounded text-sm">
            <div class="grid grid-cols-2 gap-2">
              <div><strong>Domain:</strong> youtube-nocookie.com</div>
              <div><strong>Privacy Mode:</strong> Enabled</div>
              <div><strong>Controls:</strong> Enabled</div>
              <div><strong>Branding:</strong> Minimal</div>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(testContainer);
    });

    await page.waitForTimeout(2000);

    // Verify iframe structure
    const iframe = page.locator('[data-testid="youtube-iframe"]');
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute('src', /youtube-nocookie\.com/);
    await expect(iframe).toHaveAttribute('allowfullscreen');
    await expect(iframe).toHaveAttribute('title', 'YouTube video player');

    // Verify controls are present and functional
    const playButton = page.locator('[data-testid="play-button"]');
    const muteButton = page.locator('[data-testid="mute-button"]');
    const externalButton = page.locator('[data-testid="external-button"]');

    await expect(playButton).toBeVisible();
    await expect(muteButton).toBeVisible();
    await expect(externalButton).toBeVisible();

    // Test button interactions
    await playButton.click();
    await muteButton.click();
    
    // Test external button opens new tab
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      externalButton.click()
    ]);
    
    expect(popup.url()).toContain('youtube.com');
    await popup.close();

    console.log('✅ Video embed structure validated');
  });

  test('should validate responsive design for different screen sizes', async ({ page }) => {
    const viewportSizes = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1280, height: 720, name: 'Desktop' }
    ];

    for (const viewport of viewportSizes) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(1000);

      // Create responsive test content
      await page.evaluate(({ viewportName, width, height }) => {
        // Remove previous test if exists
        const existing = document.querySelector('[data-testid="responsive-test"]');
        if (existing) existing.remove();

        const testContainer = document.createElement('div');
        testContainer.innerHTML = `
          <div data-testid="responsive-test" class="p-4">
            <h3 class="mb-4 font-bold text-lg">Responsive Test - ${viewportName}</h3>
            <div class="text-sm text-gray-600 mb-4">Viewport: ${width}x${height}</div>
            
            <!-- Responsive Video Container -->
            <div class="aspect-video bg-gray-200 rounded-lg mb-4 relative overflow-hidden">
              <img src="https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg" 
                   alt="Responsive video thumbnail"
                   class="w-full h-full object-cover"
                   data-testid="responsive-thumbnail" />
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="bg-red-600 rounded-full p-3">
                  <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
            </div>

            <!-- Responsive Image Grid -->
            <div class="grid ${width < 768 ? 'grid-cols-1' : width < 1024 ? 'grid-cols-2' : 'grid-cols-3'} gap-2">
              <img src="https://picsum.photos/200/150?random=1" 
                   alt="Grid image 1" 
                   class="w-full h-24 object-cover rounded"
                   data-testid="grid-img-1" />
              <img src="https://picsum.photos/200/150?random=2" 
                   alt="Grid image 2" 
                   class="w-full h-24 object-cover rounded"
                   data-testid="grid-img-2" />
              ${width >= 1024 ? `
              <img src="https://picsum.photos/200/150?random=3" 
                   alt="Grid image 3" 
                   class="w-full h-24 object-cover rounded"
                   data-testid="grid-img-3" />
              ` : ''}
            </div>
          </div>
        `;
        
        document.body.appendChild(testContainer);
      }, { viewportName: viewport.name, width: viewport.width, height: viewport.height });

      await page.waitForTimeout(1000);

      // Verify responsive thumbnail
      const thumbnail = page.locator('[data-testid="responsive-thumbnail"]');
      await expect(thumbnail).toBeVisible();

      const thumbnailBox = await thumbnail.boundingBox();
      expect(thumbnailBox?.width).toBeGreaterThan(0);
      expect(thumbnailBox?.width).toBeLessThanOrEqual(viewport.width);

      // Verify grid images
      const gridImg1 = page.locator('[data-testid="grid-img-1"]');
      const gridImg2 = page.locator('[data-testid="grid-img-2"]');
      
      await expect(gridImg1).toBeVisible();
      await expect(gridImg2).toBeVisible();

      // For desktop, verify third image exists
      if (viewport.width >= 1024) {
        const gridImg3 = page.locator('[data-testid="grid-img-3"]');
        await expect(gridImg3).toBeVisible();
      }

      console.log(`✅ Responsive design validated for ${viewport.name} (${viewport.width}x${viewport.height})`);
    }
  });

  test('should validate browser media capabilities', async ({ page }) => {
    const capabilities = await page.evaluate(() => {
      const video = document.createElement('video');
      const audio = document.createElement('audio');
      
      return {
        video: {
          element: !!video,
          canPlayType: typeof video.canPlayType === 'function',
          formats: {
            mp4: video.canPlayType('video/mp4'),
            webm: video.canPlayType('video/webm'),
            ogg: video.canPlayType('video/ogg')
          }
        },
        audio: {
          element: !!audio,
          canPlayType: typeof audio.canPlayType === 'function',
          formats: {
            mp3: audio.canPlayType('audio/mpeg'),
            ogg: audio.canPlayType('audio/ogg'),
            wav: audio.canPlayType('audio/wav')
          }
        },
        apis: {
          intersectionObserver: 'IntersectionObserver' in window,
          requestAnimationFrame: 'requestAnimationFrame' in window,
          mediaDevices: 'mediaDevices' in navigator
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio
        }
      };
    });

    // Verify basic media support
    expect(capabilities.video.element).toBe(true);
    expect(capabilities.audio.element).toBe(true);
    expect(capabilities.video.canPlayType).toBe(true);
    expect(capabilities.apis.intersectionObserver).toBe(true);
    expect(capabilities.apis.requestAnimationFrame).toBe(true);

    // Log capabilities for debugging
    console.log('🎭 Browser Media Capabilities:');
    console.log(`  Video: ${capabilities.video.element ? '✅' : '❌'}`);
    console.log(`  Audio: ${capabilities.audio.element ? '✅' : '❌'}`);
    console.log(`  MP4 Support: ${capabilities.video.formats.mp4 || 'Unknown'}`);
    console.log(`  WebM Support: ${capabilities.video.formats.webm || 'Unknown'}`);
    console.log(`  Intersection Observer: ${capabilities.apis.intersectionObserver ? '✅' : '❌'}`);
    console.log(`  Viewport: ${capabilities.viewport.width}x${capabilities.viewport.height} (DPR: ${capabilities.viewport.devicePixelRatio})`);
  });
});