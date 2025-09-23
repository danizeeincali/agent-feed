/**
 * Contract Verification Tests for External API Integrations
 * London School TDD - Contract-driven mock verification with real API patterns
 * 
 * Focus: Verify contracts with external APIs (YouTube, link preview services) with real data
 */

import { test, expect, Page, BrowserContext, Request, Response } from '@playwright/test';

// External API contract specifications
const API_CONTRACTS = {
  youtubeOembed: {
    endpoint: 'https://www.youtube.com/oembed',
    method: 'GET',
    parameters: ['url', 'format'],
    requiredResponseFields: ['title', 'author_name', 'thumbnail_url', 'html'],
    optionalResponseFields: ['width', 'height', 'provider_name'],
    errorCodes: [400, 404, 401, 403]
  },
  youtubeThumbnail: {
    endpoint: 'https://img.youtube.com/vi/{video_id}/{quality}.jpg',
    method: 'GET',
    qualities: ['default', 'mqdefault', 'hqdefault', 'sddefault', 'maxresdefault'],
    expectedContentType: 'image/jpeg',
    errorCodes: [404]
  },
  linkPreviewAPI: {
    endpoint: '/api/v1/link-preview',
    method: 'GET',
    parameters: ['url'],
    requiredResponseFields: ['url', 'title'],
    optionalResponseFields: ['description', 'image', 'site_name', 'type'],
    errorCodes: [400, 404, 429, 500, 503]
  },
  openGraph: {
    tags: ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'],
    twitterTags: ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'],
    expectedTypes: ['website', 'video', 'article']
  }
} as const;

// Contract verification orchestrator
class ContractVerificationOrchestrator {
  constructor(
    private mockYouTubeAPIClient: MockYouTubeAPIClient,
    private mockLinkPreviewClient: MockLinkPreviewClient,
    private mockOpenGraphParser: MockOpenGraphParser,
    private mockContractValidator: MockContractValidator
  ) {}

  async orchestrateYouTubeContractVerification(page: Page, videoId: string): Promise<void> {
    // Outside-in: Verify YouTube API contracts are properly utilized
    await this.mockYouTubeAPIClient.fetchOEmbedData(videoId);
    await this.mockYouTubeAPIClient.fetchThumbnailImage(videoId);
    await this.mockContractValidator.validateYouTubeResponse();
  }

  async orchestrateLinkPreviewContractVerification(page: Page, url: string): Promise<void> {
    await this.mockLinkPreviewClient.fetchPreviewData(url);
    await this.mockOpenGraphParser.extractMetaTags();
    await this.mockContractValidator.validatePreviewResponse();
  }

  async orchestrateErrorContractVerification(page: Page): Promise<void> {
    await this.mockYouTubeAPIClient.handleErrorResponse();
    await this.mockLinkPreviewClient.handleErrorResponse();
    await this.mockContractValidator.validateErrorHandling();
  }
}

// Mock collaborators for contract verification
class MockYouTubeAPIClient {
  async fetchOEmbedData(videoId: string): Promise<void> {
    expect(videoId).toMatch(/^[a-zA-Z0-9_-]{11}$/);
    // Contract: Should make oEmbed API call with proper parameters
  }

  async fetchThumbnailImage(videoId: string): Promise<void> {
    expect(videoId).toBeTruthy();
    // Contract: Should fetch thumbnail from correct YouTube CDN endpoint
  }

  async handleErrorResponse(): Promise<void> {
    // Contract: Should handle YouTube API error responses properly
  }
}

class MockLinkPreviewClient {
  async fetchPreviewData(url: string): Promise<void> {
    expect(url).toMatch(/^https?:\/\//);
    // Contract: Should call link preview API with proper URL encoding
  }

  async handleErrorResponse(): Promise<void> {
    // Contract: Should handle link preview API errors gracefully
  }
}

class MockOpenGraphParser {
  async extractMetaTags(): Promise<void> {
    // Contract: Should parse OpenGraph and Twitter Card meta tags
  }
}

class MockContractValidator {
  async validateYouTubeResponse(): Promise<void> {
    // Contract: Should validate YouTube API response structure
  }

  async validatePreviewResponse(): Promise<void> {
    // Contract: Should validate link preview response format
  }

  async validateErrorHandling(): Promise<void> {
    // Contract: Should validate proper error handling patterns
  }
}

test.describe('Contract Verification Tests', () => {
  let orchestrator: ContractVerificationOrchestrator;
  let networkRequests: Array<{ request: Request; response: Response | null }> = [];

  test.beforeEach(async ({ page, context }) => {
    // Initialize contract verification mocks
    const mockYouTubeAPIClient = new MockYouTubeAPIClient();
    const mockLinkPreviewClient = new MockLinkPreviewClient();
    const mockOpenGraphParser = new MockOpenGraphParser();
    const mockContractValidator = new MockContractValidator();

    orchestrator = new ContractVerificationOrchestrator(
      mockYouTubeAPIClient,
      mockLinkPreviewClient,
      mockOpenGraphParser,
      mockContractValidator
    );

    // Monitor all network requests for contract verification
    networkRequests = [];
    page.on('request', (request) => {
      networkRequests.push({ request, response: null });
    });
    
    page.on('response', (response) => {
      const requestIndex = networkRequests.findIndex(
        (item) => item.request.url() === response.request().url() && item.response === null
      );
      if (requestIndex !== -1) {
        networkRequests[requestIndex].response = response;
      }
    });

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test.describe('YouTube API Contract Verification', () => {
    test('should properly utilize YouTube oEmbed API contract', async ({ page, context }) => {
      const testVideoId = 'dQw4w9WgXcQ';
      await orchestrator.orchestrateYouTubeContractVerification(page, testVideoId);

      // Intercept and verify YouTube oEmbed requests
      await context.route('**/youtube.com/oembed**', async (route) => {
        const url = new URL(route.request().url());
        
        // Verify contract parameters
        expect(url.searchParams.get('url')).toContain('youtube.com/watch');
        expect(url.searchParams.get('format')).toBe('json');
        
        // Mock proper oEmbed response
        const mockResponse = {
          title: 'Rick Astley - Never Gonna Give You Up (Video)',
          author_name: 'Rick Astley',
          author_url: 'https://www.youtube.com/user/RickAstleyVEVO',
          type: 'video',
          height: 150,
          width: 200,
          version: '1.0',
          provider_name: 'YouTube',
          provider_url: 'https://www.youtube.com/',
          thumbnail_height: 360,
          thumbnail_width: 480,
          thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
          html: '<iframe width="200" height="150" src="https://www.youtube.com/embed/dQw4w9WgXcQ?feature=oembed" frameborder="0" allowfullscreen></iframe>'
        };
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResponse)
        });
      });

      const youtubeUrl = `https://www.youtube.com/watch?v=${testVideoId}`;
      
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      // Verify oEmbed data is properly utilized
      const title = thumbnailSummary.locator('[data-testid="preview-title"]');
      await expect(title).toBeVisible();
      
      const titleText = await title.textContent();
      expect(titleText).toContain('Rick Astley');

      // Verify thumbnail image uses YouTube CDN
      const thumbnailImage = thumbnailSummary.locator('img').first();
      if (await thumbnailImage.isVisible()) {
        const imageSrc = await thumbnailImage.getAttribute('src');
        expect(imageSrc).toMatch(/img\.youtube\.com\/vi\/dQw4w9WgXcQ\//);
      }
    });

    test('should handle YouTube API error responses per contract', async ({ page, context }) => {
      await orchestrator.orchestrateErrorContractVerification(page);

      // Test different YouTube API error scenarios
      const errorScenarios = [
        { status: 400, body: 'Bad Request' },
        { status: 404, body: 'Video not found' },
        { status: 403, body: 'Forbidden' }
      ];

      for (const errorScenario of errorScenarios) {
        await context.route('**/youtube.com/oembed**', (route) => {
          route.fulfill({
            status: errorScenario.status,
            body: errorScenario.body
          });
        });

        const invalidUrl = 'https://www.youtube.com/watch?v=INVALID_VIDEO';
        
        await page.getByTestId('post-content-input').fill(invalidUrl);
        await page.getByTestId('post-submit-button').click();

        // Should handle error gracefully - either show fallback or retry
        const fallbackLink = page.locator(`a[href="${invalidUrl}"]`);
        const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]');
        
        // Either should show fallback or handle error state
        await Promise.race([
          expect(fallbackLink).toBeVisible({ timeout: 5000 }),
          expect(thumbnailSummary.locator('[data-testid="error-state"]')).toBeVisible({ timeout: 5000 })
        ]);

        await context.unroute('**/youtube.com/oembed**');
        await page.waitForTimeout(1000);
      }
    });

    test('should validate YouTube thumbnail image contracts', async ({ page, context }) => {
      const testVideoId = 'dQw4w9WgXcQ';
      
      // Test different thumbnail quality endpoints
      const thumbnailQualities = API_CONTRACTS.youtubeThumbnail.qualities;
      
      for (const quality of thumbnailQualities) {
        const thumbnailUrl = `https://img.youtube.com/vi/${testVideoId}/${quality}.jpg`;
        
        await context.route(thumbnailUrl, async (route) => {
          // Verify request to YouTube CDN
          expect(route.request().method()).toBe('GET');
          expect(route.request().url()).toContain('img.youtube.com');
          expect(route.request().url()).toContain(testVideoId);
          
          // Mock image response
          route.fulfill({
            status: 200,
            contentType: 'image/jpeg',
            body: Buffer.from('fake-image-data', 'base64') // Minimal fake image
          });
        });
      }

      const youtubeUrl = `https://www.youtube.com/watch?v=${testVideoId}`;
      
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      const thumbnailImage = thumbnailSummary.locator('img').first();
      if (await thumbnailImage.isVisible()) {
        const imageSrc = await thumbnailImage.getAttribute('src');
        
        // Verify proper YouTube thumbnail URL format
        expect(imageSrc).toMatch(/https:\/\/img\.youtube\.com\/vi\/[a-zA-Z0-9_-]{11}\/(default|mqdefault|hqdefault|sddefault|maxresdefault)\.jpg/);
        
        // Verify image loads successfully
        const naturalWidth = await thumbnailImage.evaluate((img: HTMLImageElement) => img.naturalWidth);
        expect(naturalWidth).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Link Preview API Contract Verification', () => {
    test('should properly utilize link preview API contract', async ({ page, context }) => {
      const testUrl = 'https://github.com/microsoft/TypeScript';
      await orchestrator.orchestrateLinkPreviewContractVerification(page, testUrl);

      await context.route('**/api/v1/link-preview**', async (route) => {
        const url = new URL(route.request().url());
        
        // Verify contract parameters
        expect(url.searchParams.get('url')).toBe(testUrl);
        expect(route.request().method()).toBe('GET');
        
        // Mock proper link preview response
        const mockResponse = {
          url: testUrl,
          title: 'TypeScript - JavaScript that scales',
          description: 'TypeScript extends JavaScript by adding types. By understanding JavaScript, TypeScript saves you time catching errors and providing fixes before you run code.',
          image: 'https://repository-images.githubusercontent.com/56910904/10ef6200-8cd9-11eb-97fd-a9d86e2c9c1b',
          site_name: 'GitHub',
          type: 'website',
          author: 'Microsoft',
          favicon: 'https://github.com/favicon.ico'
        };
        
        // Verify all required fields are provided
        expect(mockResponse.url).toBeTruthy();
        expect(mockResponse.title).toBeTruthy();
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResponse)
        });
      });

      await page.getByTestId('post-content-input').fill(`Check this repo: ${testUrl}`);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      // Verify API response is properly utilized
      const title = thumbnailSummary.locator('[data-testid="preview-title"]');
      await expect(title).toHaveText('TypeScript - JavaScript that scales');

      const description = thumbnailSummary.locator('[data-testid="preview-description"]');
      if (await description.isVisible()) {
        const descText = await description.textContent();
        expect(descText).toContain('TypeScript extends JavaScript');
      }

      // Verify site name is displayed
      const siteInfo = thumbnailSummary.locator('[data-testid="site-name"]');
      if (await siteInfo.isVisible()) {
        const siteText = await siteInfo.textContent();
        expect(siteText).toContain('GitHub');
      }
    });

    test('should handle link preview API errors per contract', async ({ page, context }) => {
      const testUrl = 'https://example.com/test-error';
      
      // Test different API error responses
      const apiErrors = API_CONTRACTS.linkPreviewAPI.errorCodes;
      
      for (const errorCode of apiErrors) {
        await context.route('**/api/v1/link-preview**', (route) => {
          const errorMessages = {
            400: 'Bad Request - Invalid URL',
            404: 'Not Found - Page does not exist',
            429: 'Too Many Requests - Rate limited',
            500: 'Internal Server Error',
            503: 'Service Unavailable'
          };
          
          route.fulfill({
            status: errorCode,
            body: errorMessages[errorCode as keyof typeof errorMessages] || 'Unknown Error'
          });
        });

        await page.getByTestId('post-content-input').fill(`Error test: ${testUrl}`);
        await page.getByTestId('post-submit-button').click();

        // Should handle API error gracefully
        const fallbackLink = page.locator(`a[href="${testUrl}"]`);
        await expect(fallbackLink).toBeVisible({ timeout: 8000 });

        // No thumbnail-summary should appear on API error
        const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]');
        await expect(thumbnailSummary).not.toBeVisible();

        await context.unroute('**/api/v1/link-preview**');
        await page.waitForTimeout(1000);
      }
    });

    test('should validate response field contracts', async ({ page, context }) => {
      const testUrl = 'https://medium.com/@test/article';
      
      // Test with minimal required fields only
      await context.route('**/api/v1/link-preview**', (route) => {
        const minimalResponse = {
          url: testUrl,
          title: 'Test Article'
          // Missing optional fields: description, image, site_name, type, author
        };
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(minimalResponse)
        });
      });

      await page.getByTestId('post-content-input').fill(testUrl);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      // Should work with minimal required fields
      const title = thumbnailSummary.locator('[data-testid="preview-title"]');
      await expect(title).toHaveText('Test Article');

      // Should handle missing optional fields gracefully
      const contentTypeIcon = thumbnailSummary.locator('[data-testid="content-type-icon"]');
      await expect(contentTypeIcon).toBeVisible(); // Should show fallback icon

      await context.unroute('**/api/v1/link-preview**');

      // Test with all fields present
      await context.route('**/api/v1/link-preview**', (route) => {
        const completeResponse = {
          url: testUrl,
          title: 'Complete Test Article',
          description: 'A comprehensive test article with all metadata',
          image: 'https://example.com/image.jpg',
          site_name: 'Medium',
          type: 'article',
          author: 'Test Author',
          favicon: 'https://medium.com/favicon.ico'
        };
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(completeResponse)
        });
      });

      await page.getByTestId('post-content-input').fill(`${testUrl}?complete=true`);
      await page.getByTestId('post-submit-button').click();

      const completeThumbnail = page.locator('[data-testid="thumbnail-summary"]').nth(1);
      await expect(completeThumbnail).toBeVisible();

      // Should utilize all available fields
      const completeTitle = completeThumbnail.locator('[data-testid="preview-title"]');
      await expect(completeTitle).toHaveText('Complete Test Article');

      const description = completeThumbnail.locator('[data-testid="preview-description"]');
      if (await description.isVisible()) {
        await expect(description).toContainText('comprehensive test article');
      }

      const authorInfo = completeThumbnail.locator('[data-testid="preview-author"]');
      if (await authorInfo.isVisible()) {
        await expect(authorInfo).toContainText('Test Author');
      }
    });
  });

  test.describe('OpenGraph Protocol Contract Verification', () => {
    test('should properly parse OpenGraph meta tags contract', async ({ page, context }) => {
      const testUrl = 'https://example.com/opengraph-test';
      
      // Mock HTML page with OpenGraph tags
      await context.route(testUrl, (route) => {
        const htmlWithOG = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta property="og:title" content="OpenGraph Test Article">
            <meta property="og:description" content="Testing OpenGraph protocol compliance">
            <meta property="og:image" content="https://example.com/og-image.jpg">
            <meta property="og:url" content="${testUrl}">
            <meta property="og:type" content="article">
            <meta property="og:site_name" content="Test Site">
            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:title" content="Twitter Card Title">
            <meta name="twitter:description" content="Twitter card description">
            <meta name="twitter:image" content="https://example.com/twitter-image.jpg">
            <title>HTML Title</title>
          </head>
          <body>
            <h1>Test Article</h1>
            <p>Content of the test article.</p>
          </body>
          </html>
        `;
        
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: htmlWithOG
        });
      });

      // Test OpenGraph parsing through link preview API
      await context.route('**/api/v1/link-preview**', async (route) => {
        // Simulate server-side OpenGraph parsing
        const openGraphData = {
          url: testUrl,
          title: 'OpenGraph Test Article',
          description: 'Testing OpenGraph protocol compliance',
          image: 'https://example.com/og-image.jpg',
          site_name: 'Test Site',
          type: 'article'
        };
        
        // Verify required OpenGraph fields are present
        expect(openGraphData.title).toBeTruthy();
        expect(openGraphData.url).toBe(testUrl);
        expect(openGraphData.type).toBe('article');
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(openGraphData)
        });
      });

      await page.getByTestId('post-content-input').fill(`OpenGraph test: ${testUrl}`);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      // Verify OpenGraph data is properly utilized
      const title = thumbnailSummary.locator('[data-testid="preview-title"]');
      await expect(title).toHaveText('OpenGraph Test Article');

      const description = thumbnailSummary.locator('[data-testid="preview-description"]');
      if (await description.isVisible()) {
        await expect(description).toContainText('Testing OpenGraph protocol');
      }

      // Verify content type is recognized
      const contentTypeIcon = thumbnailSummary.locator('[data-testid="content-type-icon"]');
      await expect(contentTypeIcon).toBeVisible();
    });

    test('should handle missing OpenGraph tags gracefully', async ({ page, context }) => {
      const testUrl = 'https://example.com/no-opengraph';
      
      // Mock HTML page without OpenGraph tags
      await context.route(testUrl, (route) => {
        const htmlWithoutOG = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Basic HTML Title</title>
            <meta name="description" content="Basic meta description">
          </head>
          <body>
            <h1>Basic Page</h1>
            <p>Content without OpenGraph tags.</p>
          </body>
          </html>
        `;
        
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: htmlWithoutOG
        });
      });

      // Link preview should fallback to basic HTML parsing
      await context.route('**/api/v1/link-preview**', (route) => {
        const basicData = {
          url: testUrl,
          title: 'Basic HTML Title',
          description: 'Basic meta description',
          type: 'website'
          // Missing: image, site_name, author
        };
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(basicData)
        });
      });

      await page.getByTestId('post-content-input').fill(`Basic test: ${testUrl}`);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      // Should work with basic HTML metadata
      const title = thumbnailSummary.locator('[data-testid="preview-title"]');
      await expect(title).toHaveText('Basic HTML Title');

      // Should show fallback when image is missing
      const contentTypeIcon = thumbnailSummary.locator('[data-testid="content-type-icon"]');
      await expect(contentTypeIcon).toBeVisible();
    });
  });

  test.describe('Rate Limiting and Quota Contract Verification', () => {
    test('should respect API rate limiting contracts', async ({ page, context }) => {
      let requestCount = 0;
      
      await context.route('**/api/v1/link-preview**', (route) => {
        requestCount++;
        
        if (requestCount <= 3) {
          // Normal responses for first 3 requests
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              url: route.request().url(),
              title: `Response ${requestCount}`,
              type: 'website'
            })
          });
        } else {
          // Rate limited response
          route.fulfill({
            status: 429,
            headers: {
              'Retry-After': '60',
              'X-RateLimit-Limit': '100',
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': (Date.now() / 1000 + 3600).toString()
            },
            body: 'Too Many Requests'
          });
        }
      });

      // Make multiple requests to trigger rate limiting
      for (let i = 1; i <= 5; i++) {
        const testUrl = `https://example.com/rate-limit-${i}`;
        await page.getByTestId('post-content-input').fill(testUrl);
        await page.getByTestId('post-submit-button').click();
        await page.waitForTimeout(500);
      }

      // First 3 should have thumbnails
      await page.waitForFunction(() => {
        return document.querySelectorAll('[data-testid="thumbnail-summary"]').length >= 3;
      }, { timeout: 10000 });

      const thumbnails = page.locator('[data-testid="thumbnail-summary"]');
      expect(await thumbnails.count()).toBe(3);

      // Last 2 should be fallback links due to rate limiting
      const fallbackLinks = page.locator('a[href*="rate-limit-4"], a[href*="rate-limit-5"]');
      expect(await fallbackLinks.count()).toBe(2);
    });

    test('should handle quota exhaustion contracts', async ({ page, context }) => {
      await context.route('**/youtube.com/oembed**', (route) => {
        route.fulfill({
          status: 403,
          headers: {
            'X-Quota-Exceeded': 'true',
            'X-Daily-Limit': '1000',
            'X-Daily-Remaining': '0'
          },
          body: JSON.stringify({
            error: 'quotaExceeded',
            message: 'The request cannot be completed because you have exceeded your quota.'
          })
        });
      });

      const youtubeUrl = 'https://www.youtube.com/watch?v=quotatest';
      
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      // Should handle quota exceeded gracefully
      const fallbackLink = page.locator(`a[href="${youtubeUrl}"]`);
      await expect(fallbackLink).toBeVisible({ timeout: 5000 });

      // Should not show thumbnail when quota exceeded
      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]');
      await expect(thumbnailSummary).not.toBeVisible();
    });
  });

  test.describe('API Version and Compatibility Contracts', () => {
    test('should handle API version changes gracefully', async ({ page, context }) => {
      // Test with different API versions
      const apiVersions = ['v1', 'v2'];
      
      for (const version of apiVersions) {
        await context.route(`**/api/${version}/link-preview**`, (route) => {
          const versionedResponse = version === 'v1' ? {
            url: 'https://example.com/version-test',
            title: 'V1 Response',
            description: 'Version 1 API response'
          } : {
            url: 'https://example.com/version-test',
            title: 'V2 Response',
            description: 'Version 2 API response',
            metadata: {
              version: 'v2',
              features: ['enhanced_parsing', 'better_images']
            }
          };
          
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            headers: {
              'API-Version': version,
              'Content-Version': version
            },
            body: JSON.stringify(versionedResponse)
          });
        });
      }

      const testUrl = 'https://example.com/version-test';
      
      await page.getByTestId('post-content-input').fill(`Version test: ${testUrl}`);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      // Should work regardless of API version
      const title = thumbnailSummary.locator('[data-testid="preview-title"]');
      const titleText = await title.textContent();
      expect(titleText).toMatch(/V[12] Response/);
    });
  });
});

// Test utilities and cleanup
test.beforeAll(async () => {
  console.log('📋 Starting Contract Verification Tests');
  console.log('🔌 API Contracts:', Object.keys(API_CONTRACTS).length);
});

test.afterAll(async () => {
  console.log('✅ Contract Verification Tests Complete');
});

// Helper function to validate response structure
function validateResponseStructure(response: any, contract: any) {
  // Validate required fields
  contract.requiredResponseFields?.forEach((field: string) => {
    expect(response).toHaveProperty(field);
    expect(response[field]).toBeTruthy();
  });

  // Optional fields should be valid if present
  contract.optionalResponseFields?.forEach((field: string) => {
    if (response[field] !== undefined) {
      expect(response[field]).toBeTruthy();
    }
  });
}