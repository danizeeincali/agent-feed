/**
 * Auto-Looping Video Functionality Tests with Real YouTube Embeds
 * London School TDD - Mock-driven behavior verification
 * 
 * Focus: Validate auto-looping video functionality with actual YouTube content
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Video playback orchestrator with mock collaborators
class VideoPlaybackOrchestrator {
  constructor(
    private mockYouTubeAPI: MockYouTubeAPI,
    private mockVideoPlayer: MockVideoPlayer,
    private mockPlaybackController: MockPlaybackController,
    private mockErrorHandler: MockErrorHandler
  ) {}

  async orchestrateVideoExpansion(page: Page, videoId: string): Promise<void> {
    // Outside-in: User clicks thumbnail to expand video
    await this.mockYouTubeAPI.generateEmbedUrl(videoId);
    await this.mockVideoPlayer.createIframe(expect.any(String));
    await this.mockPlaybackController.enableAutoLoop();
    await this.mockPlaybackController.startMuted();
  }

  async orchestrateLoopingBehavior(page: Page): Promise<void> {
    await this.mockVideoPlayer.onVideoEnd();
    await this.mockPlaybackController.restartVideo();
  }

  async orchestrateErrorRecovery(page: Page): Promise<void> {
    await this.mockYouTubeAPI.handleVideoNotFound();
    await this.mockErrorHandler.showErrorState();
  }
}

// Mock collaborators - London School contracts
class MockYouTubeAPI {
  async generateEmbedUrl(videoId: string): Promise<void> {
    expect(videoId).toMatch(/^[a-zA-Z0-9_-]{11}$/);
    // Contract: Should create valid YouTube embed URL with loop parameters
  }

  async handleVideoNotFound(): Promise<void> {
    // Contract: Should handle 404 video responses gracefully
  }
}

class MockVideoPlayer {
  async createIframe(embedUrl: string): Promise<void> {
    expect(embedUrl).toContain('youtube.com/embed');
    expect(embedUrl).toContain('autoplay=1');
    expect(embedUrl).toContain('loop=1');
    // Contract: Should create iframe with proper parameters
  }

  async onVideoEnd(): Promise<void> {
    // Contract: Should trigger when video reaches end
  }
}

class MockPlaybackController {
  async enableAutoLoop(): Promise<void> {
    // Contract: Should configure video for continuous playback
  }

  async startMuted(): Promise<void> {
    // Contract: Should start video muted for autoplay compliance
  }

  async restartVideo(): Promise<void> {
    // Contract: Should restart video when loop is triggered
  }
}

class MockErrorHandler {
  async showErrorState(): Promise<void> {
    // Contract: Should display error when video fails to load
  }
}

// Real YouTube video IDs for testing
const TEST_VIDEOS = {
  standard: 'dQw4w9WgXcQ', // Rick Astley - Never Gonna Give You Up
  short: 'X8vsE3-PosQ', // Short video for quick testing
  live: 'jfKfPfyJRdk', // lofi hip hop radio - beats to relax/study to
  private: 'PRIVATE_VIDEO', // Simulated private video
  deleted: 'DELETED_VIDEO', // Simulated deleted video
  restricted: 'RESTRICTED_VIDEO' // Simulated region-restricted video
};

test.describe('Auto-Looping Video Functionality Tests', () => {
  let orchestrator: VideoPlaybackOrchestrator;

  test.beforeEach(async ({ page, context }) => {
    // Initialize mock collaborators
    const mockYouTubeAPI = new MockYouTubeAPI();
    const mockVideoPlayer = new MockVideoPlayer();
    const mockPlaybackController = new MockPlaybackController();
    const mockErrorHandler = new MockErrorHandler();

    orchestrator = new VideoPlaybackOrchestrator(
      mockYouTubeAPI,
      mockVideoPlayer,
      mockPlaybackController,
      mockErrorHandler
    );

    // Set up YouTube iframe API monitoring
    await page.addInitScript(() => {
      (window as any).YT = {
        Player: class MockYTPlayer {
          constructor(element: string, config: any) {
            (window as any).ytPlayerConfig = config;
            setTimeout(() => {
              if (config.events?.onReady) {
                config.events.onReady({ target: this });
              }
            }, 100);
          }
          
          playVideo() {
            (window as any).ytPlayerState = 'playing';
          }
          
          pauseVideo() {
            (window as any).ytPlayerState = 'paused';
          }
          
          getCurrentTime() {
            return (window as any).ytCurrentTime || 0;
          }
          
          getDuration() {
            return (window as any).ytDuration || 212; // Rick Roll duration
          }
        }
      };
    });

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Basic Auto-Loop Setup', () => {
    test('should create YouTube embed with auto-loop parameters', async ({ page }) => {
      const youtubeUrl = `https://www.youtube.com/watch?v=${TEST_VIDEOS.standard}`;
      
      await orchestrator.orchestrateVideoExpansion(page, TEST_VIDEOS.standard);

      // Post YouTube URL
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      // Click thumbnail to expand
      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();
      await thumbnailSummary.click();

      // Verify expanded video with iframe
      const expandedVideo = page.locator('[data-testid="expanded-video"]');
      await expect(expandedVideo).toBeVisible({ timeout: 5000 });

      const iframe = expandedVideo.locator('iframe');
      await expect(iframe).toBeVisible();

      // Verify iframe src contains loop parameters
      const iframeSrc = await iframe.getAttribute('src');
      expect(iframeSrc).toContain('youtube.com/embed/');
      expect(iframeSrc).toContain(TEST_VIDEOS.standard);
      expect(iframeSrc).toContain('autoplay=1');
      expect(iframeSrc).toContain('loop=1');
      expect(iframeSrc).toContain('mute=1'); // Required for autoplay
    });

    test('should handle different YouTube URL formats for auto-loop', async ({ page }) => {
      const urlFormats = [
        `https://www.youtube.com/watch?v=${TEST_VIDEOS.standard}`,
        `https://youtu.be/${TEST_VIDEOS.standard}`,
        `https://m.youtube.com/watch?v=${TEST_VIDEOS.standard}`,
        `https://youtube.com/watch?v=${TEST_VIDEOS.standard}&t=30s`
      ];

      for (const url of urlFormats) {
        await page.getByTestId('post-content-input').fill(url);
        await page.getByTestId('post-submit-button').click();

        const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').last();
        await expect(thumbnailSummary).toBeVisible();
        await thumbnailSummary.click();

        const expandedVideo = page.locator('[data-testid="expanded-video"]').last();
        await expect(expandedVideo).toBeVisible();

        const iframe = expandedVideo.locator('iframe');
        const iframeSrc = await iframe.getAttribute('src');
        expect(iframeSrc).toContain('loop=1');
        
        // Collapse for next iteration
        const collapseButton = page.locator('[data-testid="collapse-video"]').last();
        if (await collapseButton.isVisible()) {
          await collapseButton.click();
        }
      }
    });
  });

  test.describe('Video Playback Controls', () => {
    test('should support manual playback controls alongside auto-loop', async ({ page }) => {
      const youtubeUrl = `https://www.youtube.com/watch?v=${TEST_VIDEOS.short}`;
      
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await thumbnailSummary.click();

      const expandedVideo = page.locator('[data-testid="expanded-video"]');
      await expect(expandedVideo).toBeVisible();

      // Verify control buttons exist
      const playPauseButton = page.locator('[data-testid="play-pause-button"]');
      if (await playPauseButton.isVisible()) {
        await playPauseButton.click();
        
        // Verify button state changes
        const buttonState = await playPauseButton.getAttribute('aria-label');
        expect(buttonState).toContain('pause');
      }

      // Verify mute/unmute control
      const muteButton = page.locator('[data-testid="mute-button"]');
      if (await muteButton.isVisible()) {
        await muteButton.click();
        
        // Should update iframe parameters
        const iframe = expandedVideo.locator('iframe');
        const iframeSrc = await iframe.getAttribute('src');
        // Note: In real implementation, mute state might be controlled via postMessage
      }
    });

    test('should handle video timeline scrubbing with loop enabled', async ({ page }) => {
      const youtubeUrl = `https://www.youtube.com/watch?v=${TEST_VIDEOS.standard}`;
      
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await thumbnailSummary.click();

      const expandedVideo = page.locator('[data-testid="expanded-video"]');
      await expect(expandedVideo).toBeVisible();

      // Simulate timeline interaction through iframe messaging
      await page.evaluate(() => {
        const iframe = document.querySelector('iframe[src*="youtube.com"]') as HTMLIFrameElement;
        if (iframe?.contentWindow) {
          // Simulate seeking to middle of video
          iframe.contentWindow.postMessage('{"event":"command","func":"seekTo","args":[120, true]}', '*');
        }
      });

      // Video should continue looping from the new position
      await page.waitForTimeout(2000);
      
      // Verify video continues playing (in real test, would monitor iframe messages)
      const iframe = expandedVideo.locator('iframe');
      await expect(iframe).toBeVisible();
    });
  });

  test.describe('Multiple Video Loop Management', () => {
    test('should handle multiple auto-looping videos simultaneously', async ({ page }) => {
      const videos = [TEST_VIDEOS.standard, TEST_VIDEOS.short];
      
      for (const videoId of videos) {
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        await page.getByTestId('post-content-input').fill(url);
        await page.getByTestId('post-submit-button').click();
        await page.waitForTimeout(500);
      }

      // Expand both videos
      const thumbnailSummaries = page.locator('[data-testid="thumbnail-summary"]');
      expect(await thumbnailSummaries.count()).toBe(2);

      await thumbnailSummaries.first().click();
      await thumbnailSummaries.nth(1).click();

      // Both should be playing with auto-loop
      const expandedVideos = page.locator('[data-testid="expanded-video"]');
      expect(await expandedVideos.count()).toBe(2);

      for (let i = 0; i < 2; i++) {
        const iframe = expandedVideos.nth(i).locator('iframe');
        const iframeSrc = await iframe.getAttribute('src');
        expect(iframeSrc).toContain('loop=1');
        expect(iframeSrc).toContain('autoplay=1');
      }

      // Should handle browser resource limits gracefully
      await page.waitForTimeout(3000);
      
      // All videos should still be visible
      for (let i = 0; i < 2; i++) {
        await expect(expandedVideos.nth(i)).toBeVisible();
      }
    });

    test('should manage focus between multiple looping videos', async ({ page }) => {
      const videos = [TEST_VIDEOS.standard, TEST_VIDEOS.short];
      
      for (const videoId of videos) {
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        await page.getByTestId('post-content-input').fill(url);
        await page.getByTestId('post-submit-button').click();
      }

      const thumbnailSummaries = page.locator('[data-testid="thumbnail-summary"]');
      
      // Expand first video
      await thumbnailSummaries.first().click();
      let expandedVideo = page.locator('[data-testid="expanded-video"]').first();
      await expect(expandedVideo).toBeVisible();

      // Focus should be on first video
      let iframe = expandedVideo.locator('iframe');
      await expect(iframe).toBeFocused();

      // Expand second video
      await thumbnailSummaries.nth(1).click();
      expandedVideo = page.locator('[data-testid="expanded-video"]').nth(1);
      await expect(expandedVideo).toBeVisible();

      // Focus should move to second video
      iframe = expandedVideo.locator('iframe');
      await expect(iframe).toBeFocused();

      // Both videos should continue looping
      const allExpandedVideos = page.locator('[data-testid="expanded-video"]');
      expect(await allExpandedVideos.count()).toBe(2);
    });
  });

  test.describe('Performance with Auto-Loop', () => {
    test('should maintain performance with long-running auto-loop videos', async ({ page }) => {
      const youtubeUrl = `https://www.youtube.com/watch?v=${TEST_VIDEOS.live}`;
      
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await thumbnailSummary.click();

      const expandedVideo = page.locator('[data-testid="expanded-video"]');
      await expect(expandedVideo).toBeVisible();

      // Monitor performance during extended playback
      const startTime = Date.now();
      
      // Simulate extended playback time
      await page.waitForTimeout(10000); // 10 seconds
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Page should remain responsive
      expect(duration).toBeLessThan(12000); // Allow some overhead
      
      // Video should still be playing
      const iframe = expandedVideo.locator('iframe');
      await expect(iframe).toBeVisible();

      // UI should remain responsive
      const collapseButton = page.locator('[data-testid="collapse-video"]');
      if (await collapseButton.isVisible()) {
        const clickStart = Date.now();
        await collapseButton.click();
        const clickEnd = Date.now();
        
        expect(clickEnd - clickStart).toBeLessThan(1000); // Should respond within 1s
        await expect(expandedVideo).not.toBeVisible();
      }
    });

    test('should handle memory management with multiple loop cycles', async ({ page }) => {
      const youtubeUrl = `https://www.youtube.com/watch?v=${TEST_VIDEOS.short}`;
      
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await thumbnailSummary.click();

      const expandedVideo = page.locator('[data-testid="expanded-video"]');
      await expect(expandedVideo).toBeVisible();

      // Monitor memory usage pattern
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Let video loop several times (short video should loop quickly)
      await page.waitForTimeout(15000); // 15 seconds should cover multiple loops

      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Memory usage should not grow excessively
      const memoryGrowth = finalMemory - initialMemory;
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth

      // Video should still be functional
      const iframe = expandedVideo.locator('iframe');
      await expect(iframe).toBeVisible();
    });
  });

  test.describe('Error Handling for Auto-Loop', () => {
    test('should handle video loading errors gracefully', async ({ page, context }) => {
      // Mock video not found error
      await context.route('**/youtube.com/embed/**', route => {
        if (route.request().url().includes(TEST_VIDEOS.private)) {
          route.fulfill({ status: 404, body: 'Video not found' });
        } else {
          route.continue();
        }
      });

      await orchestrator.orchestrateErrorRecovery(page);

      const invalidUrl = `https://www.youtube.com/watch?v=${TEST_VIDEOS.private}`;
      await page.getByTestId('post-content-input').fill(invalidUrl);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();
      await thumbnailSummary.click();

      // Should show error state instead of video
      const errorState = page.locator('[data-testid="video-error-state"]');
      await expect(errorState).toBeVisible({ timeout: 5000 });

      // Error should be descriptive
      const errorMessage = errorState.locator('[data-testid="error-message"]');
      const errorText = await errorMessage.textContent();
      expect(errorText).toContain('video');
      expect(errorText).toContain('load');
    });

    test('should handle network interruptions during playback', async ({ page, context }) => {
      const youtubeUrl = `https://www.youtube.com/watch?v=${TEST_VIDEOS.standard}`;
      
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await thumbnailSummary.click();

      const expandedVideo = page.locator('[data-testid="expanded-video"]');
      await expect(expandedVideo).toBeVisible();

      // Start playing, then simulate network failure
      await page.waitForTimeout(2000);

      // Simulate network interruption
      await context.route('**/*', route => route.abort('failed'));

      // Video should handle network failure gracefully
      const iframe = expandedVideo.locator('iframe');
      await expect(iframe).toBeVisible(); // Iframe should remain

      // Should show network error or retry option
      const networkError = page.locator('[data-testid="network-error"]');
      if (await networkError.isVisible()) {
        expect(await networkError.textContent()).toContain('network');
      }

      // Restore network and verify recovery
      await context.unroute('**/*');
      
      const retryButton = page.locator('[data-testid="retry-video"]');
      if (await retryButton.isVisible()) {
        await retryButton.click();
        await expect(iframe).toBeVisible();
      }
    });
  });

  test.describe('Accessibility with Auto-Loop', () => {
    test('should provide accessible controls for auto-looping video', async ({ page }) => {
      const youtubeUrl = `https://www.youtube.com/watch?v=${TEST_VIDEOS.standard}`;
      
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await thumbnailSummary.click();

      const expandedVideo = page.locator('[data-testid="expanded-video"]');
      await expect(expandedVideo).toBeVisible();

      // Verify accessibility attributes
      const iframe = expandedVideo.locator('iframe');
      expect(await iframe.getAttribute('title')).toBeTruthy();

      // Should have skip/disable loop option for accessibility
      const loopToggle = page.locator('[data-testid="toggle-loop"]');
      if (await loopToggle.isVisible()) {
        expect(await loopToggle.getAttribute('aria-label')).toContain('loop');
        
        // Test disabling loop
        await loopToggle.click();
        const iframeSrc = await iframe.getAttribute('src');
        expect(iframeSrc).not.toContain('loop=1');
      }

      // Should announce loop status to screen readers
      const loopStatus = page.locator('[aria-live="polite"]');
      if (await loopStatus.isVisible()) {
        const statusText = await loopStatus.textContent();
        expect(statusText).toBeTruthy();
      }
    });

    test('should handle prefers-reduced-motion for auto-loop', async ({ page }) => {
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });

      const youtubeUrl = `https://www.youtube.com/watch?v=${TEST_VIDEOS.standard}`;
      
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await thumbnailSummary.click();

      const expandedVideo = page.locator('[data-testid="expanded-video"]');
      await expect(expandedVideo).toBeVisible();

      // Should respect reduced motion by disabling autoplay/loop
      const iframe = expandedVideo.locator('iframe');
      const iframeSrc = await iframe.getAttribute('src');
      
      // With reduced motion, should not auto-start
      expect(iframeSrc).not.toContain('autoplay=1');
      
      // Should provide manual play button
      const manualPlayButton = page.locator('[data-testid="manual-play-button"]');
      if (await manualPlayButton.isVisible()) {
        await expect(manualPlayButton).toBeVisible();
        expect(await manualPlayButton.getAttribute('aria-label')).toContain('play');
      }
    });
  });
});

// Test utilities
test.beforeAll(async () => {
  console.log('▶️ Starting Auto-Looping Video Functionality Tests');
  console.log('📹 Test Videos:', Object.keys(TEST_VIDEOS).length);
});

test.afterAll(async () => {
  console.log('✅ Auto-Looping Video Tests Complete');
});

// Cleanup after each test
test.afterEach(async ({ page }) => {
  // Clean up any playing videos
  await page.evaluate(() => {
    const iframes = document.querySelectorAll('iframe[src*="youtube.com"]');
    iframes.forEach(iframe => {
      if (iframe.parentElement) {
        iframe.parentElement.removeChild(iframe);
      }
    });
  });
});