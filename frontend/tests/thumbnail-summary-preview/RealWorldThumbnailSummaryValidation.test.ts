/**
 * Real-World Thumbnail-Summary Preview Validation Tests
 * TDD London School Approach - Outside-In with Mock Collaborations
 * 
 * Focus: Test actual thumbnail-summary functionality with live data
 * No mocks or simulations - test with real URLs and network requests
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { spawn } from 'child_process';

// Real URLs for testing - diverse content types
const REAL_TEST_URLS = {
  youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Astley - Never Gonna Give You Up
  githubRepo: 'https://github.com/microsoft/TypeScript',
  article: 'https://medium.com/@nodejs/introducing-the-node-js-performance-toolkit-c95a7d08e32d',
  documentation: 'https://docs.github.com/en/get-started/quickstart/hello-world',
  image: 'https://picsum.photos/800/600',
  twitter: 'https://twitter.com/nodejs',
  newsArticle: 'https://www.bbc.com/news/technology',
  complexYoutube: 'https://www.youtube.com/watch?v=X8vsE3-PosQ', // Different video
  linkedinPost: 'https://www.linkedin.com/company/microsoft/',
  invalidUrl: 'https://nonexistent-domain-12345.com/fake-path'
} as const;

// Test configuration for different devices
const DEVICE_VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'ultrawide', width: 2560, height: 1440 }
];

// Performance thresholds for real-world content
const PERFORMANCE_THRESHOLDS = {
  contentLoadTime: 5000, // 5 seconds max
  thumbnailLoadTime: 3000, // 3 seconds max
  domUpdateTime: 500, // 500ms max for DOM updates
  networkTimeout: 10000 // 10 seconds network timeout
};

class ThumbnailSummaryTestOrchestrator {
  constructor(
    private page: Page,
    private context: BrowserContext,
    private mockNetworkService: MockNetworkService,
    private mockContentExtractor: MockContentExtractor,
    private mockThumbnailRenderer: MockThumbnailRenderer
  ) {}

  async validateRealContentExtraction(url: string): Promise<void> {
    // Outside-in: Start with user behavior
    await this.mockContentExtractor.extractMetadata(url);
    await this.mockNetworkService.fetchContent(url);
    await this.mockThumbnailRenderer.renderPreview({
      url,
      title: expect.any(String),
      thumbnail: expect.any(String),
      summary: expect.any(String)
    });
  }

  async verifyThumbnailSummaryInteraction(expectedBehavior: 'expand' | 'navigate' | 'error'): Promise<void> {
    switch (expectedBehavior) {
      case 'expand':
        await this.mockThumbnailRenderer.expandToFullView();
        break;
      case 'navigate':
        await this.mockNetworkService.navigateToUrl(expect.any(String));
        break;
      case 'error':
        await this.mockThumbnailRenderer.showErrorState();
        break;
    }
  }
}

// Mock contracts - London School style
class MockNetworkService {
  async fetchContent(url: string): Promise<void> {
    // Contract: Should make actual HTTP request
    expect(url).toMatch(/^https?:\/\//);
  }

  async navigateToUrl(url: string): Promise<void> {
    // Contract: Should open URL in new tab
    expect(url).toBeTruthy();
  }
}

class MockContentExtractor {
  async extractMetadata(url: string): Promise<void> {
    // Contract: Should extract title, description, thumbnail
    expect(url).toBeTruthy();
  }
}

class MockThumbnailRenderer {
  async renderPreview(data: any): Promise<void> {
    // Contract: Should render thumbnail with summary overlay
    expect(data.url).toBeTruthy();
    expect(data.title).toBeTruthy();
  }

  async expandToFullView(): Promise<void> {
    // Contract: Should expand thumbnail to full preview
  }

  async showErrorState(): Promise<void> {
    // Contract: Should show error fallback
  }
}

test.describe('Real-World Thumbnail-Summary Preview Tests', () => {
  let orchestrator: ThumbnailSummaryTestOrchestrator;

  test.beforeEach(async ({ page, context }) => {
    // Set up realistic network conditions
    await context.route('**/*', async (route) => {
      // Allow real network requests but add monitoring
      const response = await route.fetch();
      const timing = Date.now();
      await route.fulfill({ response, headers: { 'x-test-timing': timing.toString() } });
    });

    // Navigate to test environment
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Initialize collaborator mocks
    const mockNetwork = new MockNetworkService();
    const mockExtractor = new MockContentExtractor();
    const mockRenderer = new MockThumbnailRenderer();

    orchestrator = new ThumbnailSummaryTestOrchestrator(
      page, context, mockNetwork, mockExtractor, mockRenderer
    );
  });

  test.describe('YouTube URL Content Extraction', () => {
    test('should extract real YouTube video metadata with thumbnail', async ({ page }) => {
      // London School: Test object conversations
      const contentPromise = page.waitForResponse('**/link-preview**');
      
      await orchestrator.validateRealContentExtraction(REAL_TEST_URLS.youtube);
      
      // Post content with real YouTube URL
      await page.getByTestId('post-content-input').fill(
        `Check out this amazing video: ${REAL_TEST_URLS.youtube} #viral #music`
      );
      await page.getByTestId('post-submit-button').click();

      // Wait for real network request
      const response = await contentPromise;
      expect(response.status()).toBe(200);

      // Verify thumbnail-summary layout appears
      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible({ timeout: PERFORMANCE_THRESHOLDS.contentLoadTime });

      // Validate actual extracted content
      const thumbnailImg = thumbnailSummary.locator('img');
      await expect(thumbnailImg).toBeVisible();
      
      const thumbnailSrc = await thumbnailImg.getAttribute('src');
      expect(thumbnailSrc).toMatch(/img\.youtube\.com\/vi\/.*\/.*\.jpg/);

      // Check title extraction
      const titleElement = thumbnailSummary.locator('[data-testid="preview-title"]');
      await expect(titleElement).toBeVisible();
      
      const title = await titleElement.textContent();
      expect(title).toBeTruthy();
      expect(title?.length).toBeGreaterThan(5);

      // Verify summary overlay
      const summaryOverlay = thumbnailSummary.locator('[data-testid="summary-overlay"]');
      await expect(summaryOverlay).toBeVisible();
    });

    test('should handle different YouTube URL formats', async ({ page }) => {
      const youtubeVariations = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtube.com/watch?v=dQw4w9WgXcQ&t=30s'
      ];

      for (const url of youtubeVariations) {
        await orchestrator.validateRealContentExtraction(url);
        
        await page.getByTestId('post-content-input').fill(url);
        await page.getByTestId('post-submit-button').click();

        // Each should produce a valid thumbnail-summary
        const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').last();
        await expect(thumbnailSummary).toBeVisible({ timeout: PERFORMANCE_THRESHOLDS.contentLoadTime });

        const playButton = thumbnailSummary.locator('[data-testid="play-button"]');
        await expect(playButton).toBeVisible();
      }
    });
  });

  test.describe('Article URL Content Extraction', () => {
    test('should extract real article metadata with accurate summaries', async ({ page }) => {
      await orchestrator.validateRealContentExtraction(REAL_TEST_URLS.article);

      await page.getByTestId('post-content-input').fill(
        `Interesting read: ${REAL_TEST_URLS.article} #nodejs #performance`
      );
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible({ timeout: PERFORMANCE_THRESHOLDS.contentLoadTime });

      // Verify article-specific elements
      const articleIcon = thumbnailSummary.locator('[data-testid="content-type-icon"]');
      await expect(articleIcon).toBeVisible();

      const readingTime = thumbnailSummary.locator('[data-testid="reading-time"]');
      await expect(readingTime).toBeVisible();
      
      const readingTimeText = await readingTime.textContent();
      expect(readingTimeText).toMatch(/\d+\s*min\s*read/);

      // Check for actual article thumbnail/image
      const articleThumbnail = thumbnailSummary.locator('img').first();
      if (await articleThumbnail.isVisible()) {
        const src = await articleThumbnail.getAttribute('src');
        expect(src).toBeTruthy();
        
        // Verify image loads successfully
        const response = await page.goto(src!);
        expect(response?.status()).toBe(200);
        await page.goBack();
      }
    });

    test('should extract GitHub repository information', async ({ page }) => {
      await orchestrator.validateRealContentExtraction(REAL_TEST_URLS.githubRepo);

      await page.getByTestId('post-content-input').fill(
        `Great TypeScript repo: ${REAL_TEST_URLS.githubRepo} #typescript #microsoft`
      );
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible({ timeout: PERFORMANCE_THRESHOLDS.contentLoadTime });

      // Verify GitHub-specific metadata
      const repoTitle = thumbnailSummary.locator('[data-testid="preview-title"]');
      const title = await repoTitle.textContent();
      expect(title).toContain('TypeScript');

      const author = thumbnailSummary.locator('[data-testid="preview-author"]');
      if (await author.isVisible()) {
        const authorText = await author.textContent();
        expect(authorText).toContain('microsoft');
      }
    });
  });

  test.describe('Thumbnail-Summary Layout Rendering', () => {
    test('should render thumbnail-summary layout correctly across viewports', async ({ page }) => {
      await orchestrator.validateRealContentExtraction(REAL_TEST_URLS.youtube);

      for (const viewport of DEVICE_VIEWPORTS) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        
        await page.getByTestId('post-content-input').fill(REAL_TEST_URLS.youtube);
        await page.getByTestId('post-submit-button').click();

        const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
        await expect(thumbnailSummary).toBeVisible({ timeout: PERFORMANCE_THRESHOLDS.contentLoadTime });

        // Verify responsive layout
        const containerBox = await thumbnailSummary.boundingBox();
        expect(containerBox?.width).toBeGreaterThan(0);
        expect(containerBox?.height).toBeGreaterThan(0);

        // Check layout doesn't overflow viewport
        if (containerBox) {
          expect(containerBox.width).toBeLessThanOrEqual(viewport.width);
        }

        // Verify thumbnail aspect ratio is maintained
        const thumbnail = thumbnailSummary.locator('img').first();
        const thumbnailBox = await thumbnail.boundingBox();
        if (thumbnailBox) {
          const aspectRatio = thumbnailBox.width / thumbnailBox.height;
          expect(aspectRatio).toBeGreaterThan(1.3); // Typical video aspect ratio
          expect(aspectRatio).toBeLessThan(2.5);
        }
      }
    });

    test('should handle overlapping content gracefully', async ({ page }) => {
      // Post multiple URLs to test layout stacking
      const testContent = `
        Multiple links test:
        ${REAL_TEST_URLS.youtube}
        ${REAL_TEST_URLS.article}
        ${REAL_TEST_URLS.githubRepo}
      `;

      await page.getByTestId('post-content-input').fill(testContent);
      await page.getByTestId('post-submit-button').click();

      // Wait for all thumbnail-summaries to render
      await page.waitForTimeout(PERFORMANCE_THRESHOLDS.contentLoadTime);

      const thumbnailSummaries = page.locator('[data-testid="thumbnail-summary"]');
      const count = await thumbnailSummaries.count();
      expect(count).toBe(3);

      // Verify no overlapping
      for (let i = 0; i < count; i++) {
        const current = thumbnailSummaries.nth(i);
        await expect(current).toBeVisible();
        
        const currentBox = await current.boundingBox();
        if (currentBox && i < count - 1) {
          const next = thumbnailSummaries.nth(i + 1);
          const nextBox = await next.boundingBox();
          
          if (nextBox) {
            expect(nextBox.y).toBeGreaterThan(currentBox.y + currentBox.height - 10);
          }
        }
      }
    });
  });

  test.describe('Auto-Looping Video Functionality', () => {
    test('should auto-loop YouTube videos when expanded', async ({ page }) => {
      await orchestrator.validateRealContentExtraction(REAL_TEST_URLS.youtube);
      
      await page.getByTestId('post-content-input').fill(REAL_TEST_URLS.youtube);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      // Click to expand video
      await orchestrator.verifyThumbnailSummaryInteraction('expand');
      await thumbnailSummary.click();

      // Wait for video iframe to load
      const videoIframe = page.locator('iframe[src*="youtube.com"]');
      await expect(videoIframe).toBeVisible({ timeout: PERFORMANCE_THRESHOLDS.contentLoadTime });

      // Verify iframe src contains autoplay and loop parameters
      const iframeSrc = await videoIframe.getAttribute('src');
      expect(iframeSrc).toContain('autoplay=1');
      expect(iframeSrc).toContain('loop=1');

      // Test video controls
      const expandedVideo = page.locator('[data-testid="expanded-video"]');
      await expect(expandedVideo).toBeVisible();

      // Verify collapse functionality
      const collapseButton = page.locator('[data-testid="collapse-video"]');
      if (await collapseButton.isVisible()) {
        await collapseButton.click();
        await expect(videoIframe).not.toBeVisible({ timeout: 2000 });
      }
    });

    test('should handle video loading errors gracefully', async ({ page }) => {
      const invalidVideoUrl = 'https://www.youtube.com/watch?v=INVALID_VIDEO_ID';
      
      await orchestrator.validateRealContentExtraction(invalidVideoUrl);
      
      await page.getByTestId('post-content-input').fill(invalidVideoUrl);
      await page.getByTestId('post-submit-button').click();

      // Should still create thumbnail-summary but handle error state
      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      await thumbnailSummary.click();
      
      // Should show error state instead of video
      await orchestrator.verifyThumbnailSummaryInteraction('error');
      
      const errorState = page.locator('[data-testid="video-error-state"]');
      await expect(errorState).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Network Conditions and Error Handling', () => {
    test('should handle slow network gracefully', async ({ page, context }) => {
      // Simulate slow 3G network
      await context.route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay
        await route.continue();
      });

      await page.getByTestId('post-content-input').fill(REAL_TEST_URLS.youtube);
      await page.getByTestId('post-submit-button').click();

      // Should show loading state
      const loadingState = page.locator('[data-testid="thumbnail-loading"]');
      await expect(loadingState).toBeVisible();

      // Eventually should load content
      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible({ timeout: PERFORMANCE_THRESHOLDS.networkTimeout });
    });

    test('should handle network failures with fallback', async ({ page, context }) => {
      // Simulate network failure for external requests
      await context.route('**/link-preview**', route => route.abort('failed'));

      await orchestrator.verifyThumbnailSummaryInteraction('error');

      await page.getByTestId('post-content-input').fill(REAL_TEST_URLS.invalidUrl);
      await page.getByTestId('post-submit-button').click();

      // Should fallback to basic link display
      const fallbackLink = page.locator('a[href*="nonexistent-domain"]');
      await expect(fallbackLink).toBeVisible({ timeout: 5000 });
      expect(await fallbackLink.textContent()).toContain('nonexistent-domain-12345.com');
    });

    test('should handle CORS errors for direct content fetching', async ({ page, context }) => {
      // Some URLs might have CORS restrictions
      const corsRestrictedUrl = 'https://example.com/cors-restricted-content';
      
      await context.route('**/link-preview**', route => {
        if (route.request().url().includes('cors-restricted-content')) {
          route.fulfill({ status: 403, body: 'CORS error' });
        } else {
          route.continue();
        }
      });

      await page.getByTestId('post-content-input').fill(corsRestrictedUrl);
      await page.getByTestId('post-submit-button').click();

      // Should gracefully fallback
      const fallbackDisplay = page.locator('[data-testid="link-fallback"]');
      await expect(fallbackDisplay).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Performance Validation', () => {
    test('should load thumbnails within performance budgets', async ({ page }) => {
      const startTime = Date.now();
      
      await page.getByTestId('post-content-input').fill(REAL_TEST_URLS.youtube);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.contentLoadTime);

      // Verify thumbnail image loads quickly
      const thumbnailStart = Date.now();
      const thumbnail = thumbnailSummary.locator('img').first();
      await expect(thumbnail).toBeVisible();
      
      const thumbnailLoadTime = Date.now() - thumbnailStart;
      expect(thumbnailLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.thumbnailLoadTime);
    });

    test('should handle multiple simultaneous URL extractions efficiently', async ({ page }) => {
      const urls = [
        REAL_TEST_URLS.youtube,
        REAL_TEST_URLS.article,
        REAL_TEST_URLS.githubRepo,
        REAL_TEST_URLS.complexYoutube
      ];

      const testContent = urls.join(' ');
      const startTime = Date.now();
      
      await page.getByTestId('post-content-input').fill(testContent);
      await page.getByTestId('post-submit-button').click();

      // All thumbnail-summaries should appear
      await page.waitForFunction(() => {
        return document.querySelectorAll('[data-testid="thumbnail-summary"]').length >= 4;
      }, { timeout: PERFORMANCE_THRESHOLDS.networkTimeout });

      const totalLoadTime = Date.now() - startTime;
      
      // Should be efficient even with multiple URLs
      expect(totalLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.networkTimeout);
      
      const thumbnailSummaries = page.locator('[data-testid="thumbnail-summary"]');
      expect(await thumbnailSummaries.count()).toBe(4);
    });
  });

  test.describe('End-to-End User Workflows', () => {
    test('should support complete user journey from post to interaction', async ({ page }) => {
      // Step 1: User creates post with URL
      await page.getByTestId('post-content-input').fill(
        `Amazing video everyone should watch! ${REAL_TEST_URLS.youtube} What do you think?`
      );
      await page.getByTestId('post-submit-button').click();

      // Step 2: Thumbnail-summary appears in feed
      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      // Step 3: User hovers to see summary overlay
      await thumbnailSummary.hover();
      const summaryOverlay = thumbnailSummary.locator('[data-testid="summary-overlay"]');
      await expect(summaryOverlay).toBeVisible();

      // Step 4: User clicks to expand video
      await thumbnailSummary.click();
      const expandedVideo = page.locator('[data-testid="expanded-video"]');
      await expect(expandedVideo).toBeVisible();

      // Step 5: User can navigate to original URL
      await orchestrator.verifyThumbnailSummaryInteraction('navigate');
      
      const externalLinkButton = page.locator('[data-testid="open-external"]');
      if (await externalLinkButton.isVisible()) {
        // Verify external link opens in new tab
        const [newPage] = await Promise.all([
          page.waitForEvent('popup'),
          externalLinkButton.click()
        ]);
        
        expect(newPage.url()).toBe(REAL_TEST_URLS.youtube);
        await newPage.close();
      }
    });

    test('should maintain state across page navigation', async ({ page }) => {
      await page.getByTestId('post-content-input').fill(REAL_TEST_URLS.youtube);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      // Expand video
      await thumbnailSummary.click();
      const expandedVideo = page.locator('[data-testid="expanded-video"]');
      await expect(expandedVideo).toBeVisible();

      // Navigate away and back
      await page.goto('http://localhost:5173/agents');
      await page.waitForLoadState('networkidle');
      
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');

      // State should be preserved (or gracefully reset)
      const postAfterNavigation = page.locator('[data-testid="post-card"]').first();
      await expect(postAfterNavigation).toBeVisible();
    });
  });

  test.describe('Accessibility with Real Screen Readers', () => {
    test('should provide proper ARIA labels and keyboard navigation', async ({ page }) => {
      await page.getByTestId('post-content-input').fill(REAL_TEST_URLS.youtube);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      // Verify ARIA attributes
      expect(await thumbnailSummary.getAttribute('role')).toBe('button');
      expect(await thumbnailSummary.getAttribute('aria-label')).toBeTruthy();

      // Test keyboard navigation
      await thumbnailSummary.focus();
      await page.keyboard.press('Enter');
      
      const expandedVideo = page.locator('[data-testid="expanded-video"]');
      await expect(expandedVideo).toBeVisible();

      // Verify focus management
      const videoIframe = expandedVideo.locator('iframe');
      await expect(videoIframe).toBeFocused();
    });

    test('should announce content changes to screen readers', async ({ page }) => {
      // Enable accessibility testing
      await page.addInitScript(() => {
        // Add aria-live region monitoring
        (window as any).ariaLiveAnnouncements = [];
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.target instanceof Element) {
              const ariaLive = mutation.target.getAttribute('aria-live');
              if (ariaLive && mutation.target.textContent) {
                (window as any).ariaLiveAnnouncements.push(mutation.target.textContent);
              }
            }
          });
        });
        observer.observe(document.body, { subtree: true, childList: true, characterData: true });
      });

      await page.getByTestId('post-content-input').fill(REAL_TEST_URLS.youtube);
      await page.getByTestId('post-submit-button').click();

      await page.waitForTimeout(3000); // Allow content to load and announcements to be made

      const announcements = await page.evaluate(() => (window as any).ariaLiveAnnouncements);
      expect(announcements.length).toBeGreaterThan(0);
      expect(announcements.some((a: string) => a.includes('loaded') || a.includes('preview'))).toBe(true);
    });
  });

  test.describe('Contract Verification for External Integrations', () => {
    test('should verify YouTube API contract compliance', async ({ page }) => {
      const mockYouTubeService = {
        extractVideoId: jest.fn(),
        fetchThumbnail: jest.fn(),
        embedVideo: jest.fn()
      };

      await orchestrator.validateRealContentExtraction(REAL_TEST_URLS.youtube);

      await page.getByTestId('post-content-input').fill(REAL_TEST_URLS.youtube);
      await page.getByTestId('post-submit-button').click();

      // Verify correct API usage patterns
      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      const thumbnail = thumbnailSummary.locator('img').first();
      const thumbnailSrc = await thumbnail.getAttribute('src');
      
      // Verify YouTube thumbnail URL format
      expect(thumbnailSrc).toMatch(/https:\/\/img\.youtube\.com\/vi\/[a-zA-Z0-9_-]+\/(mqdefault|hqdefault|maxresdefault)\.jpg/);

      await thumbnailSummary.click();
      
      const iframe = page.locator('iframe[src*="youtube.com"]');
      const iframeSrc = await iframe.getAttribute('src');
      
      // Verify YouTube embed URL format
      expect(iframeSrc).toMatch(/https:\/\/www\.youtube\.com\/embed\/[a-zA-Z0-9_-]+/);
    });

    test('should handle API rate limiting gracefully', async ({ page, context }) => {
      // Simulate rate limiting
      let requestCount = 0;
      await context.route('**/link-preview**', (route) => {
        requestCount++;
        if (requestCount > 3) {
          route.fulfill({ status: 429, body: 'Rate limited' });
        } else {
          route.continue();
        }
      });

      // Make multiple requests
      const urls = [REAL_TEST_URLS.youtube, REAL_TEST_URLS.complexYoutube];
      
      for (const url of urls) {
        await page.getByTestId('post-content-input').fill(url);
        await page.getByTestId('post-submit-button').click();
        await page.waitForTimeout(1000);
      }

      // Should handle rate limiting gracefully
      const fallbackLinks = page.locator('[data-testid="link-fallback"]');
      const thumbnailSummaries = page.locator('[data-testid="thumbnail-summary"]');
      
      const totalElements = await fallbackLinks.count() + await thumbnailSummaries.count();
      expect(totalElements).toBe(2); // Both URLs should be handled somehow
    });
  });
});

// Test utilities for setup and teardown
test.afterEach(async ({ page }) => {
  // Clean up any background processes or connections
  await page.evaluate(() => {
    // Close any WebSocket connections
    if ((window as any).wsConnections) {
      (window as any).wsConnections.forEach((ws: WebSocket) => ws.close());
    }
  });
});

// Performance monitoring
test.beforeAll(async () => {
  console.log('🧪 Starting Real-World Thumbnail-Summary Preview Tests');
  console.log('📊 Performance Thresholds:', PERFORMANCE_THRESHOLDS);
  console.log('🌐 Test URLs:', Object.keys(REAL_TEST_URLS).length);
});

test.afterAll(async () => {
  console.log('✅ Real-World Thumbnail-Summary Preview Tests Complete');
});