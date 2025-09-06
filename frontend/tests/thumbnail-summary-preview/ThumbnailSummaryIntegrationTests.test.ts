/**
 * Thumbnail-Summary Integration Tests with Real Browser Interactions
 * London School TDD - Mock-driven collaboration verification
 * 
 * Focus: Integration between components with real DOM manipulation
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Integration test orchestrator with mock collaborators
class ThumbnailSummaryIntegrationOrchestrator {
  constructor(
    private mockContentParser: MockContentParser,
    private mockLinkPreview: MockLinkPreview,
    private mockThumbnailContainer: MockThumbnailContainer,
    private mockYouTubeEmbed: MockYouTubeEmbed,
    private mockApiService: MockApiService
  ) {}

  async orchestrateContentParsingWorkflow(page: Page, content: string): Promise<void> {
    // Outside-in: User posts content with URLs
    await this.mockContentParser.parseContent(content);
    await this.mockLinkPreview.extractPreviewData(expect.any(String));
    await this.mockThumbnailContainer.renderThumbnailSummary(expect.any(Object));
  }

  async orchestrateVideoPlaybackWorkflow(page: Page): Promise<void> {
    await this.mockThumbnailContainer.handleClick();
    await this.mockYouTubeEmbed.expandToFullView();
    await this.mockYouTubeEmbed.enableAutoLoop();
  }

  async orchestrateErrorHandlingWorkflow(page: Page): Promise<void> {
    await this.mockApiService.simulateNetworkError();
    await this.mockLinkPreview.showFallbackState();
  }
}

// Mock collaborators - London School contracts
class MockContentParser {
  async parseContent(content: string): Promise<void> {
    expect(content).toBeTruthy();
    // Contract: Should identify URLs and create parsed content structure
  }
}

class MockLinkPreview {
  async extractPreviewData(url: string): Promise<void> {
    expect(url).toMatch(/^https?:\/\//);
    // Contract: Should fetch metadata and return structured data
  }

  async showFallbackState(): Promise<void> {
    // Contract: Should display basic link when preview fails
  }
}

class MockThumbnailContainer {
  async renderThumbnailSummary(data: any): Promise<void> {
    expect(data).toHaveProperty('url');
    expect(data).toHaveProperty('title');
    // Contract: Should render thumbnail with overlay
  }

  async handleClick(): Promise<void> {
    // Contract: Should handle user interaction
  }
}

class MockYouTubeEmbed {
  async expandToFullView(): Promise<void> {
    // Contract: Should expand thumbnail to full video
  }

  async enableAutoLoop(): Promise<void> {
    // Contract: Should configure video for auto-looping
  }
}

class MockApiService {
  async simulateNetworkError(): Promise<void> {
    // Contract: Should handle API failures gracefully
  }
}

test.describe('Thumbnail-Summary Integration Tests', () => {
  let orchestrator: ThumbnailSummaryIntegrationOrchestrator;

  test.beforeEach(async ({ page, context }) => {
    // Initialize mock collaborators
    const mockContentParser = new MockContentParser();
    const mockLinkPreview = new MockLinkPreview();
    const mockThumbnailContainer = new MockThumbnailContainer();
    const mockYouTubeEmbed = new MockYouTubeEmbed();
    const mockApiService = new MockApiService();

    orchestrator = new ThumbnailSummaryIntegrationOrchestrator(
      mockContentParser,
      mockLinkPreview, 
      mockThumbnailContainer,
      mockYouTubeEmbed,
      mockApiService
    );

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Content Parser to Link Preview Integration', () => {
    test('should integrate content parsing with enhanced link preview generation', async ({ page }) => {
      const testContent = 'Check this out: https://www.youtube.com/watch?v=dQw4w9WgXcQ Amazing video!';
      
      await orchestrator.orchestrateContentParsingWorkflow(page, testContent);

      // Post content and verify integration chain
      await page.getByTestId('post-content-input').fill(testContent);
      await page.getByTestId('post-submit-button').click();

      // Verify content parser extracted URL correctly
      const postContent = page.locator('[data-testid="parsed-content"]').first();
      await expect(postContent).toBeVisible();

      // Verify URL was converted to thumbnail-summary
      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible({ timeout: 5000 });

      // Verify enhanced preview data was integrated
      const previewTitle = thumbnailSummary.locator('[data-testid="preview-title"]');
      await expect(previewTitle).toBeVisible();

      const previewThumbnail = thumbnailSummary.locator('img').first();
      await expect(previewThumbnail).toBeVisible();

      // Verify YouTube-specific integration
      const playButton = thumbnailSummary.locator('[data-testid="play-button"]');
      await expect(playButton).toBeVisible();
    });

    test('should handle multiple URLs in single post content', async ({ page }) => {
      const multiUrlContent = `
        Multiple interesting links:
        1. https://www.youtube.com/watch?v=dQw4w9WgXcQ
        2. https://github.com/microsoft/TypeScript
        3. https://medium.com/@test/article-title
      `;

      await orchestrator.orchestrateContentParsingWorkflow(page, multiUrlContent);

      await page.getByTestId('post-content-input').fill(multiUrlContent);
      await page.getByTestId('post-submit-button').click();

      // Should create thumbnail-summary for each URL
      await page.waitForFunction(() => {
        return document.querySelectorAll('[data-testid="thumbnail-summary"]').length >= 3;
      }, { timeout: 10000 });

      const thumbnailSummaries = page.locator('[data-testid="thumbnail-summary"]');
      expect(await thumbnailSummaries.count()).toBe(3);

      // Verify each has appropriate content type
      for (let i = 0; i < 3; i++) {
        const summary = thumbnailSummaries.nth(i);
        await expect(summary).toBeVisible();
        
        const contentType = summary.locator('[data-testid="content-type-icon"]');
        await expect(contentType).toBeVisible();
      }
    });
  });

  test.describe('Thumbnail Container to YouTube Embed Integration', () => {
    test('should seamlessly transition from thumbnail to embedded video', async ({ page }) => {
      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      // Verify initial thumbnail state
      const thumbnail = thumbnailSummary.locator('img').first();
      await expect(thumbnail).toBeVisible();
      
      const thumbnailSrc = await thumbnail.getAttribute('src');
      expect(thumbnailSrc).toContain('youtube.com');

      // Test integration: Click thumbnail to expand
      await orchestrator.orchestrateVideoPlaybackWorkflow(page);
      await thumbnailSummary.click();

      // Verify transition to embedded video
      const expandedVideo = page.locator('[data-testid="expanded-video"]');
      await expect(expandedVideo).toBeVisible({ timeout: 5000 });

      const videoIframe = expandedVideo.locator('iframe');
      await expect(videoIframe).toBeVisible();

      const iframeSrc = await videoIframe.getAttribute('src');
      expect(iframeSrc).toContain('youtube.com/embed');
      expect(iframeSrc).toContain('autoplay=1');
      expect(iframeSrc).toContain('loop=1');

      // Test reverse transition
      const collapseButton = page.locator('[data-testid="collapse-video"]');
      if (await collapseButton.isVisible()) {
        await collapseButton.click();
        await expect(thumbnailSummary).toBeVisible();
        await expect(expandedVideo).not.toBeVisible();
      }
    });

    test('should maintain video state during DOM updates', async ({ page }) => {
      const youtubeUrl = 'https://www.youtube.com/watch?v=X8vsE3-PosQ';
      
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await thumbnailSummary.click();

      const expandedVideo = page.locator('[data-testid="expanded-video"]');
      await expect(expandedVideo).toBeVisible();

      // Simulate DOM update (new post created)
      await page.getByTestId('post-content-input').fill('New post content');
      await page.getByTestId('post-submit-button').click();

      // Video state should be maintained
      await expect(expandedVideo).toBeVisible();
      
      const videoIframe = expandedVideo.locator('iframe');
      await expect(videoIframe).toBeVisible();
    });
  });

  test.describe('Error Handling Integration', () => {
    test('should integrate error handling across all components', async ({ page, context }) => {
      // Simulate network failure for link preview API
      await context.route('**/link-preview**', route => route.abort('failed'));

      await orchestrator.orchestrateErrorHandlingWorkflow(page);

      const testUrl = 'https://www.youtube.com/watch?v=INVALID_ID';
      await page.getByTestId('post-content-input').fill(testUrl);
      await page.getByTestId('post-submit-button').click();

      // Content parser should still work
      const postContent = page.locator('[data-testid="parsed-content"]').first();
      await expect(postContent).toBeVisible();

      // Should fallback to basic link display
      const fallbackLink = page.locator('a[href*="youtube.com"]');
      await expect(fallbackLink).toBeVisible({ timeout: 5000 });
      
      // No thumbnail-summary should appear
      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]');
      await expect(thumbnailSummary).not.toBeVisible();
    });

    test('should handle partial integration failures gracefully', async ({ page, context }) => {
      // Allow content parsing but fail thumbnail generation
      let requestCount = 0;
      await context.route('**/link-preview**', (route) => {
        requestCount++;
        if (requestCount === 1) {
          route.fulfill({ 
            status: 200, 
            body: JSON.stringify({ 
              url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              title: 'Test Video',
              type: 'video',
              image: 'invalid-image-url'
            })
          });
        } else {
          route.abort('failed');
        }
      });

      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      // Should create thumbnail-summary with error handling for image
      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      // Should show title even with broken image
      const title = thumbnailSummary.locator('[data-testid="preview-title"]');
      await expect(title).toHaveText('Test Video');

      // Image error should be handled gracefully
      const fallbackIcon = thumbnailSummary.locator('[data-testid="content-type-icon"]');
      await expect(fallbackIcon).toBeVisible();
    });
  });

  test.describe('Real-time Updates Integration', () => {
    test('should integrate real-time updates with thumbnail-summary rendering', async ({ page, context }) => {
      // Set up WebSocket mock for real-time updates
      await page.evaluateOnNewDocument(() => {
        (window as any).WebSocket = class MockWebSocket {
          onmessage: ((event: any) => void) | null = null;
          
          constructor(url: string) {
            setTimeout(() => {
              if (this.onmessage) {
                this.onmessage({
                  data: JSON.stringify({
                    type: 'new_post',
                    data: {
                      id: 'realtime-post',
                      content: 'Real-time post: https://www.youtube.com/watch?v=realtime123',
                      authorAgent: 'TestAgent'
                    }
                  })
                });
              }
            }, 2000);
          }
          
          close() {}
          send() {}
        };
      });

      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');

      // Wait for real-time update
      const realtimePost = page.locator('[data-testid="post-card"]').filter({ hasText: 'Real-time post' });
      await expect(realtimePost).toBeVisible({ timeout: 10000 });

      // Thumbnail-summary should be created for real-time post
      const realtimeThumbnail = realtimePost.locator('[data-testid="thumbnail-summary"]');
      await expect(realtimeThumbnail).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Performance Integration', () => {
    test('should maintain performance with multiple integrated components', async ({ page }) => {
      // Create multiple posts with different URL types
      const urls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://github.com/microsoft/TypeScript',
        'https://medium.com/@test/performance-article',
        'https://docs.github.com/en/get-started',
        'https://www.youtube.com/watch?v=X8vsE3-PosQ'
      ];

      const startTime = Date.now();

      for (const url of urls) {
        await page.getByTestId('post-content-input').fill(url);
        await page.getByTestId('post-submit-button').click();
        await page.waitForTimeout(500); // Small delay between posts
      }

      // All thumbnail-summaries should render
      await page.waitForFunction(() => {
        return document.querySelectorAll('[data-testid="thumbnail-summary"]').length >= 5;
      }, { timeout: 15000 });

      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(15000); // Should complete within 15 seconds

      // Verify all components integrated successfully
      const thumbnailSummaries = page.locator('[data-testid="thumbnail-summary"]');
      expect(await thumbnailSummaries.count()).toBe(5);

      // Test interaction with multiple components
      const firstYouTubeVideo = thumbnailSummaries.first();
      await firstYouTubeVideo.click();

      const expandedVideo = page.locator('[data-testid="expanded-video"]');
      await expect(expandedVideo).toBeVisible();

      // Other thumbnail-summaries should remain functional
      const secondVideo = thumbnailSummaries.nth(4); // Second YouTube video
      await secondVideo.click();

      // Should handle multiple video expansions gracefully
      const expandedVideos = page.locator('[data-testid="expanded-video"]');
      const expandedCount = await expandedVideos.count();
      expect(expandedCount).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Mobile Integration', () => {
    test('should integrate properly on mobile viewports', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      // Verify mobile-responsive layout
      const containerBox = await thumbnailSummary.boundingBox();
      expect(containerBox?.width).toBeLessThanOrEqual(375);

      // Touch interaction should work
      await thumbnailSummary.tap();
      
      const expandedVideo = page.locator('[data-testid="expanded-video"]');
      await expect(expandedVideo).toBeVisible();

      // Video should be mobile-optimized
      const videoIframe = expandedVideo.locator('iframe');
      const videoBox = await videoIframe.boundingBox();
      expect(videoBox?.width).toBeLessThanOrEqual(375);
    });
  });

  test.describe('Accessibility Integration', () => {
    test('should maintain accessibility across integrated components', async ({ page }) => {
      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      // Verify ARIA attributes are properly integrated
      expect(await thumbnailSummary.getAttribute('role')).toBe('button');
      expect(await thumbnailSummary.getAttribute('aria-label')).toBeTruthy();

      // Keyboard navigation integration
      await thumbnailSummary.focus();
      await page.keyboard.press('Enter');

      const expandedVideo = page.locator('[data-testid="expanded-video"]');
      await expect(expandedVideo).toBeVisible();

      // Focus should move to video iframe
      const videoIframe = expandedVideo.locator('iframe');
      await expect(videoIframe).toBeFocused();

      // Screen reader announcements should work
      const liveRegion = page.locator('[aria-live="polite"]');
      if (await liveRegion.isVisible()) {
        const announcement = await liveRegion.textContent();
        expect(announcement).toBeTruthy();
      }
    });
  });
});

// Integration test utilities
test.beforeAll(async () => {
  console.log('🔗 Starting Thumbnail-Summary Integration Tests');
});

test.afterAll(async () => {
  console.log('✅ Thumbnail-Summary Integration Tests Complete');
});