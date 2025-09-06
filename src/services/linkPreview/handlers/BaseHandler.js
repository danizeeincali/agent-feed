/**
 * Base Handler for Link Preview System
 * Provides common functionality and enforces consistent interface for all platform handlers
 */

import { MetricsCollector } from '../metrics/MetricsCollector.js';
import { CacheStrategy } from '../strategies/CacheStrategy.js';
import { ErrorHandlingStrategy } from '../strategies/ErrorHandlingStrategy.js';

/**
 * Platform enumeration
 */
export const Platform = {
  LINKEDIN: 'linkedin',
  TWITTER: 'twitter',
  X: 'x',
  YOUTUBE: 'youtube',
  INSTAGRAM: 'instagram',
  FACEBOOK: 'facebook',
  GENERIC: 'generic'
};

/**
 * Content type enumeration
 */
export const ContentType = {
  ARTICLE: 'article',
  VIDEO: 'video',
  IMAGE: 'image',
  SOCIAL: 'social',
  PROFILE: 'profile',
  WEBSITE: 'website'
};

/**
 * Base class for all platform-specific link preview handlers
 * Implements template method pattern for consistent processing flow
 */
export class BaseHandler {
  constructor(options = {}) {
    this.platform = this.constructor.platform || Platform.GENERIC;
    this.priority = this.constructor.priority || 0;
    this.config = options.config || {};
    this.metricsCollector = options.metricsCollector || new MetricsCollector();
    this.errorHandler = options.errorHandler || new ErrorHandlingStrategy();
    this.userAgent = options.userAgent || 'AgentFeed/1.0 LinkPreview (+https://agent-feed.com/bot)';
    this.timeout = options.timeout || 15000;
  }

  /**
   * Main extraction method - Template method pattern
   * @param {string} url - URL to extract preview from
   * @returns {Promise<PreviewResult>} - Extracted preview data
   */
  async extract(url) {
    const startTime = Date.now();
    const correlationId = this.generateCorrelationId();
    
    try {
      // Step 1: Validate and normalize URL
      const validatedUrl = await this.validateUrl(url);
      this.logInfo(correlationId, 'URL validated', { url: validatedUrl });

      // Step 2: Check cache before processing
      const cached = await this.checkCache(validatedUrl);
      if (cached && !this.isCacheStale(cached)) {
        this.metricsCollector.recordCacheHit(this.platform, 'memory');
        this.logInfo(correlationId, 'Cache hit', { url: validatedUrl });
        return cached;
      }

      // Step 3: Perform actual extraction
      this.logInfo(correlationId, 'Starting extraction', { platform: this.platform });
      const result = await this.performExtraction(validatedUrl, correlationId);

      // Step 4: Post-process and validate result
      const processedResult = await this.postProcessResult(result, validatedUrl);

      // Step 5: Cache the result
      await this.cacheResult(validatedUrl, processedResult);

      // Step 6: Record metrics
      const responseTime = Date.now() - startTime;
      this.metricsCollector.recordPreviewFetch(this.platform, responseTime, true);
      
      this.logInfo(correlationId, 'Extraction completed', { 
        responseTime, 
        platform: this.platform 
      });

      return processedResult;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.metricsCollector.recordPreviewFetch(this.platform, responseTime, false);
      
      this.logError(correlationId, 'Extraction failed', error, { url });
      
      return this.handleExtractionError(error, url, correlationId);
    }
  }

  /**
   * Validate and normalize URL - must be implemented by subclasses
   * @param {string} url - Raw URL to validate
   * @returns {Promise<string>} - Validated and normalized URL
   * @throws {ValidationError} - If URL is invalid for this platform
   */
  async validateUrl(url) {
    if (!url || typeof url !== 'string') {
      throw new ValidationError('URL must be a non-empty string');
    }

    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new ValidationError('URL must use HTTP or HTTPS protocol');
      }
      return urlObj.href;
    } catch (error) {
      throw new ValidationError(`Invalid URL format: ${error.message}`);
    }
  }

  /**
   * Platform-specific extraction logic - must be implemented by subclasses
   * @param {string} url - Validated URL
   * @param {string} correlationId - Request correlation ID
   * @returns {Promise<PreviewResult>} - Raw extracted data
   */
  async performExtraction(url, correlationId) {
    throw new Error('performExtraction must be implemented by subclass');
  }

  /**
   * Get cache strategy for this handler - can be overridden by subclasses
   * @returns {CacheStrategy} - Cache strategy configuration
   */
  getCacheStrategy() {
    return new CacheStrategy({
      ttl: this.getDefaultTTL(),
      refreshThreshold: 0.8,
      maxStaleTime: this.getDefaultTTL() * 2
    });
  }

  /**
   * Get default TTL for this platform - can be overridden by subclasses
   * @returns {number} - TTL in seconds
   */
  getDefaultTTL() {
    const defaultTTLs = {
      [Platform.LINKEDIN]: 4 * 60 * 60,    // 4 hours - professional content is stable
      [Platform.TWITTER]: 30 * 60,         // 30 minutes - social content changes rapidly
      [Platform.X]: 30 * 60,               // 30 minutes - same as Twitter
      [Platform.YOUTUBE]: 2 * 60 * 60,     // 2 hours - video metadata is fairly stable
      [Platform.INSTAGRAM]: 60 * 60,       // 1 hour - visual content moderately stable
      [Platform.FACEBOOK]: 60 * 60,        // 1 hour - social content
      [Platform.GENERIC]: 60 * 60          // 1 hour - default for unknown content
    };
    
    return defaultTTLs[this.platform] || defaultTTLs[Platform.GENERIC];
  }

  /**
   * Check cache for existing result
   * @param {string} url - URL to check
   * @returns {Promise<PreviewResult|null>} - Cached result or null
   */
  async checkCache(url) {
    // This will be implemented by the CacheManager
    // For now, return null to skip caching
    return null;
  }

  /**
   * Cache the extraction result
   * @param {string} url - URL that was processed
   * @param {PreviewResult} result - Result to cache
   * @returns {Promise<void>}
   */
  async cacheResult(url, result) {
    // This will be implemented by the CacheManager
    // For now, do nothing
  }

  /**
   * Check if cached result is stale
   * @param {PreviewResult} cached - Cached result
   * @returns {boolean} - True if stale
   */
  isCacheStale(cached) {
    if (!cached.caching || !cached.caching.lastUpdated) {
      return true;
    }

    const age = Date.now() - new Date(cached.caching.lastUpdated).getTime();
    const strategy = this.getCacheStrategy();
    
    return age > (strategy.ttl * 1000);
  }

  /**
   * Post-process extraction result
   * @param {PreviewResult} result - Raw extraction result
   * @param {string} url - Original URL
   * @returns {Promise<PreviewResult>} - Processed result
   */
  async postProcessResult(result, url) {
    // Add platform information
    result.platform = this.platform;
    result.url = url;

    // Add caching metadata
    result.caching = {
      ttl: this.getDefaultTTL(),
      lastUpdated: new Date().toISOString(),
      stale: false
    };

    // Add performance metadata
    result.performance = {
      fetchTime: Date.now() - (result._startTime || Date.now()),
      cacheHit: false,
      fallbackUsed: result.fallbackUsed || false
    };

    // Validate and clean data
    return this.validateAndCleanResult(result);
  }

  /**
   * Validate and clean the preview result
   * @param {PreviewResult} result - Result to validate
   * @returns {PreviewResult} - Cleaned result
   */
  validateAndCleanResult(result) {
    // Ensure required fields exist
    result.title = this.cleanText(result.title) || 'Untitled';
    result.description = this.cleanText(result.description) || '';
    result.contentType = result.contentType || ContentType.WEBSITE;

    // Validate URLs
    result.image = this.validateImageUrl(result.image);
    result.video = this.validateVideoUrl(result.video);

    // Clean author information
    if (result.author) {
      result.author.name = this.cleanText(result.author.name);
      result.author.username = this.cleanText(result.author.username);
      result.author.avatar = this.validateImageUrl(result.author.avatar);
    }

    // Limit text field lengths
    result.title = this.truncateText(result.title, 200);
    result.description = this.truncateText(result.description, 500);

    return result;
  }

  /**
   * Handle extraction errors with fallback strategies
   * @param {Error} error - The error that occurred
   * @param {string} url - Original URL
   * @param {string} correlationId - Request correlation ID
   * @returns {PreviewResult} - Fallback result
   */
  async handleExtractionError(error, url, correlationId) {
    this.logError(correlationId, 'Handling extraction error', error, { url });

    // Try to get stale cached data as fallback
    const staleCache = await this.getStaleCache(url);
    if (staleCache) {
      staleCache.caching.stale = true;
      staleCache.error = `Using stale data due to error: ${error.message}`;
      this.metricsCollector.recordCacheHit(this.platform, 'stale');
      return staleCache;
    }

    // Generate minimal fallback preview
    return this.createFallbackPreview(url, error);
  }

  /**
   * Get stale cache data as last resort
   * @param {string} url - URL to check
   * @returns {Promise<PreviewResult|null>} - Stale cache or null
   */
  async getStaleCache(url) {
    // This will be implemented by CacheManager
    return null;
  }

  /**
   * Create minimal fallback preview when all else fails
   * @param {string} url - Original URL
   * @param {Error} error - The error that caused fallback
   * @returns {PreviewResult} - Minimal fallback result
   */
  createFallbackPreview(url, error) {
    const domain = this.extractDomainFromUrl(url);
    
    return {
      title: domain,
      description: 'Unable to fetch preview',
      image: null,
      video: null,
      url: url,
      platform: this.platform,
      contentType: ContentType.WEBSITE,
      error: error.message,
      fallbackUsed: true,
      caching: {
        ttl: 300, // Cache errors for 5 minutes only
        lastUpdated: new Date().toISOString(),
        stale: false
      },
      performance: {
        fetchTime: 0,
        cacheHit: false,
        fallbackUsed: true
      }
    };
  }

  /**
   * Utility methods
   */

  generateCorrelationId() {
    return `${this.platform}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  cleanText(text) {
    if (!text || typeof text !== 'string') return '';
    return text.trim().replace(/\s+/g, ' ');
  }

  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  validateImageUrl(url) {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      return urlObj.href;
    } catch {
      return null;
    }
  }

  validateVideoUrl(url) {
    return this.validateImageUrl(url); // Same validation logic
  }

  extractDomainFromUrl(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return 'Unknown Website';
    }
  }

  logInfo(correlationId, message, data = {}) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      correlationId,
      platform: this.platform,
      message,
      data
    }));
  }

  logError(correlationId, message, error, data = {}) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      correlationId,
      platform: this.platform,
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      data
    }));
  }
}

/**
 * Custom error types
 */
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ExtractionError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'ExtractionError';
    this.cause = cause;
  }
}

export class RateLimitError extends Error {
  constructor(message, retryAfter = null) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Preview result interface definition
 * @typedef {Object} PreviewResult
 * @property {string} title - Preview title
 * @property {string} description - Preview description
 * @property {string|null} image - Preview image URL
 * @property {string|null} video - Preview video URL
 * @property {string} url - Original URL
 * @property {string} platform - Platform identifier
 * @property {string} contentType - Content type (article, video, etc.)
 * @property {Object|null} author - Author information
 * @property {Object|null} metadata - Additional platform-specific metadata
 * @property {Object} caching - Caching metadata
 * @property {Object} performance - Performance metrics
 * @property {string|null} error - Error message if any
 * @property {boolean} fallbackUsed - Whether fallback was used
 */

export default BaseHandler;