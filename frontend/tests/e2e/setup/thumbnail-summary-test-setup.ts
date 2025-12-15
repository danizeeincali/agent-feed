/**
 * Setup and Teardown Scripts for Thumbnail-Summary E2E Tests
 * 
 * Ensures clean test environment and proper application state
 * for comprehensive real-data testing
 */

import { Browser, BrowserContext, Page, chromium, firefox, webkit } from '@playwright/test';

export interface TestEnvironment {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

export interface TestConfig {
  baseUrl: string;
  timeout: number;
  viewport: { width: number; height: number };
  permissions: string[];
  userAgent?: string;
}

export class ThumbnailSummaryTestSetup {
  private static readonly DEFAULT_CONFIG: TestConfig = {
    baseUrl: 'http://localhost:5173',
    timeout: 30000,
    viewport: { width: 1280, height: 720 },
    permissions: ['autoplay']
  };

  private static readonly API_BASE_URL = 'http://localhost:3000/api/v1';

  /**
   * Setup test environment with clean slate
   */
  static async setupTestEnvironment(
    browserName: 'chromium' | 'firefox' | 'webkit' = 'chromium',
    config: Partial<TestConfig> = {}
  ): Promise<TestEnvironment> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    // Launch browser
    let browser: Browser;
    switch (browserName) {
      case 'firefox':
        browser = await firefox.launch({ headless: false });
        break;
      case 'webkit':
        browser = await webkit.launch({ headless: false });
        break;
      default:
        browser = await chromium.launch({
          headless: false,
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--allow-running-insecure-content',
            '--autoplay-policy=no-user-gesture-required'
          ]
        });
    }

    // Create context with test configuration
    const context = await browser.newContext({
      viewport: finalConfig.viewport,
      permissions: finalConfig.permissions,
      userAgent: finalConfig.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    const page = await context.newPage();

    // Set up error handling
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Browser console error: ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      console.error(`Page error: ${error.message}`);
    });

    // Navigate to application
    await page.goto(finalConfig.baseUrl, { 
      waitUntil: 'networkidle',
      timeout: finalConfig.timeout 
    });

    // Wait for application to be ready
    await page.waitForSelector('[data-testid="social-media-feed"]', { 
      timeout: finalConfig.timeout 
    });

    console.log(`✅ Test environment setup complete for ${browserName}`);

    return { browser, context, page };
  }

  /**
   * Create test data with real URLs
   */
  static async createTestData(page: Page, testData: {
    posts: Array<{
      title: string;
      content: string;
      authorAgent: string;
      tags?: string[];
    }>;
  }): Promise<string[]> {
    const createdPostIds: string[] = [];

    for (const post of testData.posts) {
      try {
        const response = await page.request.post(`${this.API_BASE_URL}/agent-posts`, {
          data: post
        });

        if (response.ok()) {
          const result = await response.json();
          if (result.data?.id) {
            createdPostIds.push(result.data.id);
          }
          console.log(`✅ Created test post: ${post.title}`);
        } else {
          console.warn(`⚠️  Failed to create post: ${post.title}`);
        }
      } catch (error) {
        console.error(`❌ Error creating post: ${post.title}`, error);
      }
    }

    return createdPostIds;
  }

  /**
   * Wait for link previews to load
   */
  static async waitForLinkPreviewsToLoad(
    page: Page, 
    expectedCount: number = 1, 
    timeout: number = 10000
  ): Promise<void> {
    console.log(`⏳ Waiting for ${expectedCount} link preview(s) to load...`);

    const startTime = Date.now();
    let loadedPreviews = 0;

    while (loadedPreviews < expectedCount && (Date.now() - startTime) < timeout) {
      const previewElements = page.locator('[role="article"]');
      const currentCount = await previewElements.count();
      
      if (currentCount > loadedPreviews) {
        loadedPreviews = currentCount;
        console.log(`📊 Loaded ${loadedPreviews}/${expectedCount} previews`);
      }

      if (loadedPreviews >= expectedCount) {
        break;
      }

      await page.waitForTimeout(1000);
    }

    const finalTime = Date.now() - startTime;
    console.log(`✅ Preview loading complete: ${loadedPreviews}/${expectedCount} in ${finalTime}ms`);
  }

  /**
   * Cleanup test data
   */
  static async cleanupTestData(page: Page, postIds: string[]): Promise<void> {
    console.log(`🧹 Cleaning up ${postIds.length} test posts...`);

    for (const postId of postIds) {
      try {
        const response = await page.request.delete(`${this.API_BASE_URL}/agent-posts/${postId}`);
        
        if (response.ok()) {
          console.log(`✅ Deleted test post: ${postId}`);
        } else {
          console.warn(`⚠️  Failed to delete post: ${postId}`);
        }
      } catch (error) {
        console.error(`❌ Error deleting post: ${postId}`, error);
      }
    }
  }

  /**
   * Check application health
   */
  static async checkApplicationHealth(page: Page): Promise<boolean> {
    try {
      // Check frontend health
      const feedElement = await page.locator('[data-testid="social-media-feed"]').count();
      if (feedElement === 0) {
        console.error('❌ Frontend not ready: feed element not found');
        return false;
      }

      // Check backend API health
      const healthResponse = await page.request.get(`${this.API_BASE_URL}/health`);
      if (!healthResponse.ok()) {
        console.error('❌ Backend API not healthy');
        return false;
      }

      const healthData = await healthResponse.json();
      console.log('✅ Application health check passed:', healthData);
      
      return true;
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return false;
    }
  }

  /**
   * Verify thumbnail-summary functionality is working
   */
  static async verifyThumbnailSummaryFunctionality(page: Page): Promise<boolean> {
    try {
      // Create a test post with a known URL
      const testPost = {
        title: 'Functionality Verification Test',
        content: 'Testing with YouTube URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        authorAgent: 'VerificationAgent',
        tags: ['test', 'verification']
      };

      const [testPostId] = await this.createTestData(page, { posts: [testPost] });
      
      if (!testPostId) {
        console.error('❌ Failed to create verification test post');
        return false;
      }

      // Refresh page to see the post
      await page.reload({ waitUntil: 'networkidle' });

      // Wait for preview to load
      await this.waitForLinkPreviewsToLoad(page, 1, 15000);

      // Check if thumbnail-summary container exists
      const thumbnailSummary = page.locator('[role="article"]').first();
      const isVisible = await thumbnailSummary.isVisible();

      if (!isVisible) {
        console.warn('⚠️  Thumbnail-summary not visible, checking for fallback link...');
        const fallbackLink = page.locator('a[href*="youtube"]').first();
        const hasFallback = await fallbackLink.isVisible();
        
        if (!hasFallback) {
          console.error('❌ Neither thumbnail-summary nor fallback link found');
          return false;
        }
        
        console.log('✅ Fallback link functionality verified');
      } else {
        console.log('✅ Thumbnail-summary functionality verified');
      }

      // Cleanup
      await this.cleanupTestData(page, [testPostId]);

      return true;
    } catch (error) {
      console.error('❌ Functionality verification failed:', error);
      return false;
    }
  }

  /**
   * Setup cross-browser testing environment
   */
  static async setupCrossBrowserTesting(): Promise<{
    chromium: TestEnvironment;
    firefox: TestEnvironment;
    webkit: TestEnvironment;
  }> {
    console.log('🚀 Setting up cross-browser testing environment...');

    const [chromiumEnv, firefoxEnv, webkitEnv] = await Promise.all([
      this.setupTestEnvironment('chromium'),
      this.setupTestEnvironment('firefox'),
      this.setupTestEnvironment('webkit')
    ]);

    console.log('✅ Cross-browser environment setup complete');

    return {
      chromium: chromiumEnv,
      firefox: firefoxEnv,
      webkit: webkitEnv
    };
  }

  /**
   * Cleanup test environment
   */
  static async cleanupTestEnvironment(env: TestEnvironment): Promise<void> {
    try {
      await env.context.close();
      await env.browser.close();
      console.log('✅ Test environment cleaned up');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  /**
   * Take screenshot for debugging
   */
  static async captureDebugScreenshot(
    page: Page, 
    name: string, 
    path: string = './test-results/debug-screenshots'
  ): Promise<void> {
    try {
      await page.screenshot({ 
        path: `${path}/${name}-${Date.now()}.png`,
        fullPage: true 
      });
      console.log(`📸 Debug screenshot saved: ${name}`);
    } catch (error) {
      console.error('❌ Failed to capture screenshot:', error);
    }
  }

  /**
   * Log system information for debugging
   */
  static async logSystemInfo(page: Page): Promise<void> {
    const systemInfo = await page.evaluate(() => ({
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      pixelRatio: window.devicePixelRatio,
      online: navigator.onLine,
      cookiesEnabled: navigator.cookieEnabled,
      language: navigator.language
    }));

    console.log('🔧 System Information:', JSON.stringify(systemInfo, null, 2));
  }
}

export default ThumbnailSummaryTestSetup;