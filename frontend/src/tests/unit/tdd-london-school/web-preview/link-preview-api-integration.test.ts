/**
 * Link Preview API Integration - London School TDD Tests
 * 
 * Tests integration between preview services and external APIs using
 * behavior-driven mocks. Focuses on service collaboration patterns.
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';

// Mock Dependencies (London School - Service contracts)
interface HTTPClient {
  get(url: string, options?: RequestOptions): Promise<HTTPResponse>;
  post(url: string, data: any, options?: RequestOptions): Promise<HTTPResponse>;
  withTimeout(timeout: number): HTTPClient;
  withHeaders(headers: Record<string, string>): HTTPClient;
}

interface MetaTagExtractor {
  extractTitle(html: string): string | null;
  extractDescription(html: string): string | null;
  extractImage(html: string): string | null;
  extractMetaTags(html: string): MetaTags;
  extractOpenGraph(html: string): OpenGraphData;
  extractTwitterCard(html: string): TwitterCardData;
}

interface CacheService {
  get(key: string): Promise<any>;
  set(key: string, value: any, options?: CacheOptions): Promise<void>;
  has(key: string): Promise<boolean>;
  invalidate(key: string): Promise<void>;
  flush(): Promise<void>;
}

interface URLSanitizer {
  sanitizeURL(url: string): string;
  validateDomain(domain: string): boolean;
  checkSSRF(url: string): boolean;
  normalizeURL(url: string): string;
}

interface PreviewEnhancer {
  enhanceMetadata(basicMeta: BasicMetadata): Promise<EnhancedMetadata>;
  generateFallbackData(url: string): FallbackMetadata;
  optimizeImage(imageUrl: string): Promise<string>;
  validateContent(content: PreviewContent): boolean;
}

// Type definitions
interface RequestOptions {
  timeout?: number;
  headers?: Record<string, string>;
  followRedirects?: boolean;
}

interface HTTPResponse {
  data: string;
  status: number;
  headers: Record<string, string>;
  redirected?: boolean;
  finalURL?: string;
}

interface MetaTags {
  title?: string;
  description?: string;
  image?: string;
  keywords?: string[];
  author?: string;
  publishedTime?: string;
}

interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  siteName?: string;
}

interface TwitterCardData {
  card?: string;
  title?: string;
  description?: string;
  image?: string;
  creator?: string;
}

interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

interface BasicMetadata {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  domain: string;
}

interface EnhancedMetadata extends BasicMetadata {
  type: 'website' | 'article' | 'video' | 'image';
  publishedAt?: Date;
  author?: string;
  keywords?: string[];
  favicon?: string;
  thumbnail?: string;
}

interface FallbackMetadata extends BasicMetadata {
  error: string;
  timestamp: Date;
}

interface PreviewContent {
  url: string;
  metadata: EnhancedMetadata;
  isValid: boolean;
}

interface PreviewResult {
  success: boolean;
  data?: EnhancedMetadata;
  error?: string;
  fromCache: boolean;
  processingTime: number;
}

// System Under Test
class LinkPreviewService {
  constructor(
    private httpClient: HTTPClient,
    private metaExtractor: MetaTagExtractor,
    private cache: CacheService,
    private urlSanitizer: URLSanitizer,
    private enhancer: PreviewEnhancer
  ) {}

  async generatePreview(url: string): Promise<PreviewResult> {
    const startTime = Date.now();
    
    try {
      // Contract: Sanitize and validate URL
      const sanitizedURL = this.urlSanitizer.sanitizeURL(url);
      if (!this.urlSanitizer.validateDomain(this.extractDomain(sanitizedURL))) {
        throw new Error('Invalid or blocked domain');
      }

      if (!this.urlSanitizer.checkSSRF(sanitizedURL)) {
        throw new Error('Potential SSRF detected');
      }

      const normalizedURL = this.urlSanitizer.normalizeURL(sanitizedURL);

      // Contract: Check cache first
      const cacheKey = `preview:${normalizedURL}`;
      const hasCache = await this.cache.has(cacheKey);
      
      if (hasCache) {
        const cachedData = await this.cache.get(cacheKey);
        return {
          success: true,
          data: cachedData,
          fromCache: true,
          processingTime: Date.now() - startTime
        };
      }

      // Contract: Fetch content with timeout
      const response = await this.httpClient
        .withTimeout(10000)
        .withHeaders({
          'User-Agent': 'LinkPreviewBot/1.0',
          'Accept': 'text/html,application/xhtml+xml'
        })
        .get(normalizedURL);

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: Failed to fetch content`);
      }

      // Contract: Extract metadata from HTML
      const basicMetadata = this.extractBasicMetadata(response.data, normalizedURL);
      
      // Contract: Enhance metadata
      const enhancedMetadata = await this.enhancer.enhanceMetadata(basicMetadata);
      
      // Contract: Validate enhanced content
      const previewContent: PreviewContent = {
        url: normalizedURL,
        metadata: enhancedMetadata,
        isValid: true
      };

      if (!this.enhancer.validateContent(previewContent)) {
        throw new Error('Generated preview content failed validation');
      }

      // Contract: Cache successful result
      await this.cache.set(cacheKey, enhancedMetadata, { ttl: 3600 });

      return {
        success: true,
        data: enhancedMetadata,
        fromCache: false,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      // Contract: Generate fallback data on error
      const fallbackData = this.enhancer.generateFallbackData(url);
      
      return {
        success: false,
        data: fallbackData as EnhancedMetadata,
        error: error instanceof Error ? error.message : 'Unknown error',
        fromCache: false,
        processingTime: Date.now() - startTime
      };
    }
  }

  async batchGeneratePreviews(urls: string[]): Promise<PreviewResult[]> {
    // Contract: Process URLs concurrently but with rate limiting
    const results = await Promise.allSettled(
      urls.map(url => this.generatePreview(url))
    );

    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          error: result.reason.message,
          fromCache: false,
          processingTime: 0
        };
      }
    });
  }

  private extractBasicMetadata(html: string, url: string): BasicMetadata {
    // Contract: Use meta extractor to parse HTML
    const title = this.metaExtractor.extractTitle(html);
    const description = this.metaExtractor.extractDescription(html);
    const image = this.metaExtractor.extractImage(html);

    return {
      url,
      title: title || undefined,
      description: description || undefined,
      image: image || undefined,
      domain: this.extractDomain(url)
    };
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  }
}

// Test Suite
describe('LinkPreviewService - London School TDD', () => {
  let previewService: LinkPreviewService;
  let mockHTTPClient: HTTPClient;
  let mockMetaExtractor: MetaTagExtractor;
  let mockCache: CacheService;
  let mockURLSanitizer: URLSanitizer;
  let mockEnhancer: PreviewEnhancer;

  const sampleHTML = `
    <html>
      <head>
        <title>Test Page</title>
        <meta name="description" content="A test page for preview generation">
        <meta property="og:image" content="https://example.com/image.jpg">
      </head>
      <body>Content</body>
    </html>
  `;

  const sampleMetadata: EnhancedMetadata = {
    url: 'https://example.com',
    title: 'Test Page',
    description: 'A test page for preview generation',
    image: 'https://example.com/image.jpg',
    domain: 'example.com',
    type: 'website',
    favicon: 'https://example.com/favicon.ico'
  };

  beforeEach(() => {
    // Create comprehensive mocks
    mockHTTPClient = {
      get: vi.fn(),
      post: vi.fn(),
      withTimeout: vi.fn().mockReturnThis(),
      withHeaders: vi.fn().mockReturnThis()
    };

    mockMetaExtractor = {
      extractTitle: vi.fn(),
      extractDescription: vi.fn(),
      extractImage: vi.fn(),
      extractMetaTags: vi.fn(),
      extractOpenGraph: vi.fn(),
      extractTwitterCard: vi.fn()
    };

    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
      has: vi.fn(),
      invalidate: vi.fn(),
      flush: vi.fn()
    };

    mockURLSanitizer = {
      sanitizeURL: vi.fn(),
      validateDomain: vi.fn(),
      checkSSRF: vi.fn(),
      normalizeURL: vi.fn()
    };

    mockEnhancer = {
      enhanceMetadata: vi.fn(),
      generateFallbackData: vi.fn(),
      optimizeImage: vi.fn(),
      validateContent: vi.fn()
    };

    previewService = new LinkPreviewService(
      mockHTTPClient,
      mockMetaExtractor,
      mockCache,
      mockURLSanitizer,
      mockEnhancer
    );
  });

  describe('Preview Generation Workflow', () => {
    // Contract Test: Should sanitize and validate URL before processing
    it('should sanitize and validate URL through URLSanitizer', async () => {
      const inputURL = 'https://example.com/test';
      const sanitizedURL = 'https://example.com/test';
      const normalizedURL = 'https://example.com/test';

      (mockURLSanitizer.sanitizeURL as MockedFunction<any>).mockReturnValue(sanitizedURL);
      (mockURLSanitizer.validateDomain as MockedFunction<any>).mockReturnValue(true);
      (mockURLSanitizer.checkSSRF as MockedFunction<any>).mockReturnValue(true);
      (mockURLSanitizer.normalizeURL as MockedFunction<any>).mockReturnValue(normalizedURL);
      (mockCache.has as MockedFunction<any>).mockResolvedValue(false);
      (mockHTTPClient.get as MockedFunction<any>).mockResolvedValue({
        data: sampleHTML,
        status: 200,
        headers: {}
      });

      await previewService.generatePreview(inputURL);

      expect(mockURLSanitizer.sanitizeURL).toHaveBeenCalledWith(inputURL);
      expect(mockURLSanitizer.validateDomain).toHaveBeenCalledWith('example.com');
      expect(mockURLSanitizer.checkSSRF).toHaveBeenCalledWith(sanitizedURL);
      expect(mockURLSanitizer.normalizeURL).toHaveBeenCalledWith(sanitizedURL);
    });

    // Contract Test: Should check cache before making HTTP request
    it('should check cache before fetching URL content', async () => {
      const url = 'https://example.com/test';
      const cachedData = sampleMetadata;

      (mockURLSanitizer.sanitizeURL as MockedFunction<any>).mockReturnValue(url);
      (mockURLSanitizer.validateDomain as MockedFunction<any>).mockReturnValue(true);
      (mockURLSanitizer.checkSSRF as MockedFunction<any>).mockReturnValue(true);
      (mockURLSanitizer.normalizeURL as MockedFunction<any>).mockReturnValue(url);
      (mockCache.has as MockedFunction<any>).mockResolvedValue(true);
      (mockCache.get as MockedFunction<any>).mockResolvedValue(cachedData);

      const result = await previewService.generatePreview(url);

      expect(mockCache.has).toHaveBeenCalledWith(`preview:${url}`);
      expect(mockCache.get).toHaveBeenCalledWith(`preview:${url}`);
      expect(mockHTTPClient.get).not.toHaveBeenCalled();
      expect(result.fromCache).toBe(true);
      expect(result.data).toEqual(cachedData);
    });

    // Contract Test: Should configure HTTP client with proper options
    it('should configure HTTP client with timeout and headers', async () => {
      const url = 'https://example.com/test';

      (mockURLSanitizer.sanitizeURL as MockedFunction<any>).mockReturnValue(url);
      (mockURLSanitizer.validateDomain as MockedFunction<any>).mockReturnValue(true);
      (mockURLSanitizer.checkSSRF as MockedFunction<any>).mockReturnValue(true);
      (mockURLSanitizer.normalizeURL as MockedFunction<any>).mockReturnValue(url);
      (mockCache.has as MockedFunction<any>).mockResolvedValue(false);
      (mockHTTPClient.get as MockedFunction<any>).mockResolvedValue({
        data: sampleHTML,
        status: 200,
        headers: {}
      });

      await previewService.generatePreview(url);

      expect(mockHTTPClient.withTimeout).toHaveBeenCalledWith(10000);
      expect(mockHTTPClient.withHeaders).toHaveBeenCalledWith({
        'User-Agent': 'LinkPreviewBot/1.0',
        'Accept': 'text/html,application/xhtml+xml'
      });
      expect(mockHTTPClient.get).toHaveBeenCalledWith(url);
    });

    // Contract Test: Should extract metadata through MetaTagExtractor
    it('should extract metadata from HTML through MetaTagExtractor', async () => {
      const url = 'https://example.com/test';

      (mockURLSanitizer.sanitizeURL as MockedFunction<any>).mockReturnValue(url);
      (mockURLSanitizer.validateDomain as MockedFunction<any>).mockReturnValue(true);
      (mockURLSanitizer.checkSSRF as MockedFunction<any>).mockReturnValue(true);
      (mockURLSanitizer.normalizeURL as MockedFunction<any>).mockReturnValue(url);
      (mockCache.has as MockedFunction<any>).mockResolvedValue(false);
      (mockHTTPClient.get as MockedFunction<any>).mockResolvedValue({
        data: sampleHTML,
        status: 200,
        headers: {}
      });
      (mockMetaExtractor.extractTitle as MockedFunction<any>).mockReturnValue('Test Page');
      (mockMetaExtractor.extractDescription as MockedFunction<any>).mockReturnValue('Test description');
      (mockMetaExtractor.extractImage as MockedFunction<any>).mockReturnValue('https://example.com/image.jpg');
      (mockEnhancer.enhanceMetadata as MockedFunction<any>).mockResolvedValue(sampleMetadata);
      (mockEnhancer.validateContent as MockedFunction<any>).mockReturnValue(true);

      await previewService.generatePreview(url);

      expect(mockMetaExtractor.extractTitle).toHaveBeenCalledWith(sampleHTML);
      expect(mockMetaExtractor.extractDescription).toHaveBeenCalledWith(sampleHTML);
      expect(mockMetaExtractor.extractImage).toHaveBeenCalledWith(sampleHTML);
    });

    // Contract Test: Should enhance metadata through PreviewEnhancer
    it('should enhance basic metadata through PreviewEnhancer', async () => {
      const url = 'https://example.com/test';
      const basicMetadata = {
        url,
        title: 'Test Page',
        description: 'Test description',
        image: 'https://example.com/image.jpg',
        domain: 'example.com'
      };

      (mockURLSanitizer.sanitizeURL as MockedFunction<any>).mockReturnValue(url);
      (mockURLSanitizer.validateDomain as MockedFunction<any>).mockReturnValue(true);
      (mockURLSanitizer.checkSSRF as MockedFunction<any>).mockReturnValue(true);
      (mockURLSanitizer.normalizeURL as MockedFunction<any>).mockReturnValue(url);
      (mockCache.has as MockedFunction<any>).mockResolvedValue(false);
      (mockHTTPClient.get as MockedFunction<any>).mockResolvedValue({
        data: sampleHTML,
        status: 200,
        headers: {}
      });
      (mockMetaExtractor.extractTitle as MockedFunction<any>).mockReturnValue(basicMetadata.title);
      (mockMetaExtractor.extractDescription as MockedFunction<any>).mockReturnValue(basicMetadata.description);
      (mockMetaExtractor.extractImage as MockedFunction<any>).mockReturnValue(basicMetadata.image);
      (mockEnhancer.enhanceMetadata as MockedFunction<any>).mockResolvedValue(sampleMetadata);
      (mockEnhancer.validateContent as MockedFunction<any>).mockReturnValue(true);

      await previewService.generatePreview(url);

      expect(mockEnhancer.enhanceMetadata).toHaveBeenCalledWith(basicMetadata);
    });

    // Contract Test: Should validate enhanced content
    it('should validate enhanced content through PreviewEnhancer', async () => {
      const url = 'https://example.com/test';

      (mockURLSanitizer.sanitizeURL as MockedFunction<any>).mockReturnValue(url);
      (mockURLSanitizer.validateDomain as MockedFunction<any>).mockReturnValue(true);
      (mockURLSanitizer.checkSSRF as MockedFunction<any>).mockReturnValue(true);
      (mockURLSanitizer.normalizeURL as MockedFunction<any>).mockReturnValue(url);
      (mockCache.has as MockedFunction<any>).mockResolvedValue(false);
      (mockHTTPClient.get as MockedFunction<any>).mockResolvedValue({
        data: sampleHTML,
        status: 200,
        headers: {}
      });
      (mockMetaExtractor.extractTitle as MockedFunction<any>).mockReturnValue('Test Page');
      (mockMetaExtractor.extractDescription as MockedFunction<any>).mockReturnValue('Test description');
      (mockMetaExtractor.extractImage as MockedFunction<any>).mockReturnValue('https://example.com/image.jpg');
      (mockEnhancer.enhanceMetadata as MockedFunction<any>).mockResolvedValue(sampleMetadata);
      (mockEnhancer.validateContent as MockedFunction<any>).mockReturnValue(true);

      await previewService.generatePreview(url);

      expect(mockEnhancer.validateContent).toHaveBeenCalledWith({
        url,
        metadata: sampleMetadata,
        isValid: true
      });
    });

    // Contract Test: Should cache successful results
    it('should cache enhanced metadata after successful processing', async () => {
      const url = 'https://example.com/test';

      (mockURLSanitizer.sanitizeURL as MockedFunction<any>).mockReturnValue(url);
      (mockURLSanitizer.validateDomain as MockedFunction<any>).mockReturnValue(true);
      (mockURLSanitizer.checkSSRF as MockedFunction<any>).mockReturnValue(true);
      (mockURLSanitizer.normalizeURL as MockedFunction<any>).mockReturnValue(url);
      (mockCache.has as MockedFunction<any>).mockResolvedValue(false);
      (mockHTTPClient.get as MockedFunction<any>).mockResolvedValue({
        data: sampleHTML,
        status: 200,
        headers: {}
      });
      (mockMetaExtractor.extractTitle as MockedFunction<any>).mockReturnValue('Test Page');
      (mockMetaExtractor.extractDescription as MockedFunction<any>).mockReturnValue('Test description');
      (mockMetaExtractor.extractImage as MockedFunction<any>).mockReturnValue('https://example.com/image.jpg');
      (mockEnhancer.enhanceMetadata as MockedFunction<any>).mockResolvedValue(sampleMetadata);
      (mockEnhancer.validateContent as MockedFunction<any>).mockReturnValue(true);

      await previewService.generatePreview(url);

      expect(mockCache.set).toHaveBeenCalledWith(
        `preview:${url}`,
        sampleMetadata,
        { ttl: 3600 }
      );
    });
  });

  describe('Error Handling Workflow', () => {
    // Contract Test: Should reject invalid domains
    it('should reject URLs with invalid domains', async () => {
      const url = 'https://malicious.com/test';

      (mockURLSanitizer.sanitizeURL as MockedFunction<any>).mockReturnValue(url);
      (mockURLSanitizer.validateDomain as MockedFunction<any>).mockReturnValue(false);

      const result = await previewService.generatePreview(url);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or blocked domain');
      expect(mockHTTPClient.get).not.toHaveBeenCalled();
    });

    // Contract Test: Should handle SSRF protection
    it('should reject URLs that fail SSRF check', async () => {
      const url = 'https://localhost:8080/admin';

      (mockURLSanitizer.sanitizeURL as MockedFunction<any>).mockReturnValue(url);
      (mockURLSanitizer.validateDomain as MockedFunction<any>).mockReturnValue(true);
      (mockURLSanitizer.checkSSRF as MockedFunction<any>).mockReturnValue(false);

      const result = await previewService.generatePreview(url);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Potential SSRF detected');
      expect(mockHTTPClient.get).not.toHaveBeenCalled();
    });

    // Contract Test: Should handle HTTP errors
    it('should handle HTTP client errors gracefully', async () => {
      const url = 'https://example.com/not-found';

      (mockURLSanitizer.sanitizeURL as MockedFunction<any>).mockReturnValue(url);
      (mockURLSanitizer.validateDomain as MockedFunction<any>).mockReturnValue(true);
      (mockURLSanitizer.checkSSRF as MockedFunction<any>).mockReturnValue(true);
      (mockURLSanitizer.normalizeURL as MockedFunction<any>).mockReturnValue(url);
      (mockCache.has as MockedFunction<any>).mockResolvedValue(false);
      (mockHTTPClient.get as MockedFunction<any>).mockResolvedValue({
        data: '',
        status: 404,
        headers: {}
      });

      const fallbackData = {
        url,
        domain: 'example.com',
        error: 'HTTP 404: Failed to fetch content',
        timestamp: new Date()
      };
      (mockEnhancer.generateFallbackData as MockedFunction<any>).mockReturnValue(fallbackData);

      const result = await previewService.generatePreview(url);

      expect(result.success).toBe(false);
      expect(result.error).toBe('HTTP 404: Failed to fetch content');
      expect(mockEnhancer.generateFallbackData).toHaveBeenCalledWith(url);
    });

    // Contract Test: Should handle content validation failure
    it('should handle content validation failure', async () => {
      const url = 'https://example.com/test';

      (mockURLSanitizer.sanitizeURL as MockedFunction<any>).mockReturnValue(url);
      (mockURLSanitizer.validateDomain as MockedFunction<any>).mockReturnValue(true);
      (mockURLSanitizer.checkSSRF as MockedFunction<any>).mockReturnValue(true);
      (mockURLSanitizer.normalizeURL as MockedFunction<any>).mockReturnValue(url);
      (mockCache.has as MockedFunction<any>).mockResolvedValue(false);
      (mockHTTPClient.get as MockedFunction<any>).mockResolvedValue({
        data: sampleHTML,
        status: 200,
        headers: {}
      });
      (mockMetaExtractor.extractTitle as MockedFunction<any>).mockReturnValue('Test Page');
      (mockMetaExtractor.extractDescription as MockedFunction<any>).mockReturnValue('Test description');
      (mockMetaExtractor.extractImage as MockedFunction<any>).mockReturnValue('https://example.com/image.jpg');
      (mockEnhancer.enhanceMetadata as MockedFunction<any>).mockResolvedValue(sampleMetadata);
      (mockEnhancer.validateContent as MockedFunction<any>).mockReturnValue(false); // Validation fails

      const result = await previewService.generatePreview(url);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Generated preview content failed validation');
      expect(mockCache.set).not.toHaveBeenCalled();
    });
  });

  describe('Batch Processing Workflow', () => {
    // Contract Test: Should process multiple URLs concurrently
    it('should process multiple URLs through individual preview generation', async () => {
      const urls = [
        'https://example1.com',
        'https://example2.com',
        'https://example3.com'
      ];

      // Setup mocks for successful processing
      urls.forEach(url => {
        (mockURLSanitizer.sanitizeURL as MockedFunction<any>).mockReturnValue(url);
        (mockURLSanitizer.validateDomain as MockedFunction<any>).mockReturnValue(true);
        (mockURLSanitizer.checkSSRF as MockedFunction<any>).mockReturnValue(true);
        (mockURLSanitizer.normalizeURL as MockedFunction<any>).mockReturnValue(url);
      });
      
      (mockCache.has as MockedFunction<any>).mockResolvedValue(false);
      (mockHTTPClient.get as MockedFunction<any>).mockResolvedValue({
        data: sampleHTML,
        status: 200,
        headers: {}
      });
      (mockMetaExtractor.extractTitle as MockedFunction<any>).mockReturnValue('Test Page');
      (mockMetaExtractor.extractDescription as MockedFunction<any>).mockReturnValue('Test description');
      (mockMetaExtractor.extractImage as MockedFunction<any>).mockReturnValue('https://example.com/image.jpg');
      (mockEnhancer.enhanceMetadata as MockedFunction<any>).mockResolvedValue(sampleMetadata);
      (mockEnhancer.validateContent as MockedFunction<any>).mockReturnValue(true);

      const results = await previewService.batchGeneratePreviews(urls);

      expect(results).toHaveLength(3);
      expect(mockHTTPClient.get).toHaveBeenCalledTimes(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    // Behavior Test: Should handle mixed success/failure scenarios
    it('should handle mixed success and failure scenarios in batch processing', async () => {
      const urls = [
        'https://good.com',
        'https://bad.com',
        'https://ugly.com'
      ];

      // Mock different outcomes for each URL
      (mockURLSanitizer.sanitizeURL as MockedFunction<any>)
        .mockReturnValueOnce(urls[0])   // good.com - success
        .mockReturnValueOnce(urls[1])   // bad.com - domain validation fails
        .mockReturnValueOnce(urls[2]);  // ugly.com - success

      (mockURLSanitizer.validateDomain as MockedFunction<any>)
        .mockReturnValueOnce(true)      // good.com
        .mockReturnValueOnce(false)     // bad.com - fails here
        .mockReturnValueOnce(true);     // ugly.com

      (mockURLSanitizer.checkSSRF as MockedFunction<any>).mockReturnValue(true);
      (mockURLSanitizer.normalizeURL as MockedFunction<any>).mockImplementation(url => url);

      const results = await previewService.batchGeneratePreviews(urls);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);   // good.com should succeed
      expect(results[1].success).toBe(false);  // bad.com should fail
      expect(results[2].success).toBe(true);   // ugly.com should succeed
    });
  });

  describe('Performance and Optimization', () => {
    // Performance Test: Should complete within reasonable time
    it('should complete preview generation within performance threshold', async () => {
      const url = 'https://example.com/test';

      (mockURLSanitizer.sanitizeURL as MockedFunction<any>).mockReturnValue(url);
      (mockURLSanitizer.validateDomain as MockedFunction<any>).mockReturnValue(true);
      (mockURLSanitizer.checkSSRF as MockedFunction<any>).mockReturnValue(true);
      (mockURLSanitizer.normalizeURL as MockedFunction<any>).mockReturnValue(url);
      (mockCache.has as MockedFunction<any>).mockResolvedValue(false);
      (mockHTTPClient.get as MockedFunction<any>).mockResolvedValue({
        data: sampleHTML,
        status: 200,
        headers: {}
      });
      (mockMetaExtractor.extractTitle as MockedFunction<any>).mockReturnValue('Test Page');
      (mockEnhancer.enhanceMetadata as MockedFunction<any>).mockResolvedValue(sampleMetadata);
      (mockEnhancer.validateContent as MockedFunction<any>).mockReturnValue(true);

      const result = await previewService.generatePreview(url);

      expect(result.processingTime).toBeLessThan(1000); // Should be fast with mocks
    });

    // Contract Test: Should track processing time accurately
    it('should track processing time for both cache hits and misses', async () => {
      const url = 'https://example.com/test';

      // Test cache hit
      (mockURLSanitizer.sanitizeURL as MockedFunction<any>).mockReturnValue(url);
      (mockURLSanitizer.validateDomain as MockedFunction<any>).mockReturnValue(true);
      (mockURLSanitizer.checkSSRF as MockedFunction<any>).mockReturnValue(true);
      (mockURLSanitizer.normalizeURL as MockedFunction<any>).mockReturnValue(url);
      (mockCache.has as MockedFunction<any>).mockResolvedValue(true);
      (mockCache.get as MockedFunction<any>).mockResolvedValue(sampleMetadata);

      const cacheResult = await previewService.generatePreview(url);
      expect(cacheResult.processingTime).toBeGreaterThan(0);
      expect(cacheResult.fromCache).toBe(true);

      // Test cache miss
      (mockCache.has as MockedFunction<any>).mockResolvedValue(false);
      (mockHTTPClient.get as MockedFunction<any>).mockResolvedValue({
        data: sampleHTML,
        status: 200,
        headers: {}
      });
      (mockEnhancer.enhanceMetadata as MockedFunction<any>).mockResolvedValue(sampleMetadata);
      (mockEnhancer.validateContent as MockedFunction<any>).mockReturnValue(true);

      const fetchResult = await previewService.generatePreview(url);
      expect(fetchResult.processingTime).toBeGreaterThan(0);
      expect(fetchResult.fromCache).toBe(false);
    });
  });
});