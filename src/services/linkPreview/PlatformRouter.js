/**
 * Platform Router for Link Preview System
 * Detects platform from URL and routes to appropriate handler
 */

import { Platform } from './handlers/BaseHandler.js';

/**
 * URL pattern matching for platform detection
 */
const PLATFORM_PATTERNS = {
  [Platform.LINKEDIN]: [
    /(?:www\.)?linkedin\.com/i,
    /(?:www\.)?linkedin\.com\/posts\//i,
    /(?:www\.)?linkedin\.com\/in\//i,
    /(?:www\.)?linkedin\.com\/company\//i,
    /(?:www\.)?linkedin\.com\/pulse\//i
  ],
  
  [Platform.TWITTER]: [
    /(?:www\.)?twitter\.com/i,
    /(?:mobile\.)?twitter\.com/i,
    /(?:www\.)?twitter\.com\/\w+\/status\//i
  ],
  
  [Platform.X]: [
    /(?:www\.)?x\.com/i,
    /(?:mobile\.)?x\.com/i,
    /(?:www\.)?x\.com\/\w+\/status\//i
  ],
  
  [Platform.YOUTUBE]: [
    /(?:www\.)?youtube\.com/i,
    /(?:www\.)?youtu\.be/i,
    /(?:m\.)?youtube\.com/i,
    /(?:www\.)?youtube\.com\/watch\?v=/i,
    /(?:www\.)?youtube\.com\/embed\//i,
    /(?:www\.)?youtube\.com\/v\//i,
    /(?:www\.)?youtube\.com\/shorts\//i
  ],
  
  [Platform.INSTAGRAM]: [
    /(?:www\.)?instagram\.com/i,
    /(?:www\.)?instagram\.com\/p\//i,
    /(?:www\.)?instagram\.com\/reel\//i,
    /(?:www\.)?instagram\.com\/tv\//i
  ],
  
  [Platform.FACEBOOK]: [
    /(?:www\.)?facebook\.com/i,
    /(?:m\.)?facebook\.com/i,
    /(?:www\.)?fb\.com/i,
    /(?:www\.)?facebook\.com\/\w+\/posts\//i,
    /(?:www\.)?facebook\.com\/photo/i
  ]
};

/**
 * Platform detection confidence levels
 */
const CONFIDENCE_LEVELS = {
  HIGH: 0.9,      // Specific URL patterns (e.g., /posts/, /status/)
  MEDIUM: 0.7,    // Domain match with context
  LOW: 0.5,       // Basic domain match
  NONE: 0.0       // No match
};

/**
 * Platform Router Class
 * Manages platform detection and handler routing
 */
export class PlatformRouter {
  constructor() {
    this.handlers = new Map();
    this.platformCache = new Map();
    this.maxCacheSize = 1000;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Register a handler for a platform
   * @param {string} platform - Platform identifier
   * @param {BaseHandler} handler - Handler instance
   */
  registerHandler(platform, handler) {
    if (!platform || !handler) {
      throw new Error('Platform and handler are required');
    }
    
    this.handlers.set(platform, handler);
    console.log(`Registered handler for platform: ${platform}`);
  }

  /**
   * Get handler for a platform
   * @param {string} platform - Platform identifier
   * @returns {BaseHandler|null} - Handler instance or null if not found
   */
  getHandler(platform) {
    return this.handlers.get(platform) || null;
  }

  /**
   * Detect platform from URL with confidence scoring
   * @param {string} url - URL to analyze
   * @returns {PlatformDetectionResult} - Detection result with confidence
   */
  detectPlatform(url) {
    if (!url || typeof url !== 'string') {
      return {
        platform: Platform.GENERIC,
        confidence: CONFIDENCE_LEVELS.NONE,
        reason: 'Invalid URL provided'
      };
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(url);
    if (this.platformCache.has(cacheKey)) {
      this.cacheHits++;
      return this.platformCache.get(cacheKey);
    }

    this.cacheMisses++;
    
    try {
      const urlObj = new URL(url);
      const result = this.performPlatformDetection(urlObj);
      
      // Cache the result
      this.cacheDetectionResult(cacheKey, result);
      
      return result;
      
    } catch (error) {
      const fallbackResult = {
        platform: Platform.GENERIC,
        confidence: CONFIDENCE_LEVELS.NONE,
        reason: `URL parsing failed: ${error.message}`
      };
      
      this.cacheDetectionResult(cacheKey, fallbackResult);
      return fallbackResult;
    }
  }

  /**
   * Perform actual platform detection with confidence scoring
   * @param {URL} urlObj - Parsed URL object
   * @returns {PlatformDetectionResult} - Detection result
   */
  performPlatformDetection(urlObj) {
    const hostname = urlObj.hostname.toLowerCase();
    const fullUrl = urlObj.href.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    
    // Check each platform's patterns
    for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
      const matchResult = this.checkPlatformPatterns(patterns, hostname, fullUrl, pathname);
      
      if (matchResult.matches) {
        return {
          platform,
          confidence: matchResult.confidence,
          reason: matchResult.reason,
          matchedPattern: matchResult.pattern
        };
      }
    }
    
    // No platform-specific match found
    return {
      platform: Platform.GENERIC,
      confidence: CONFIDENCE_LEVELS.NONE,
      reason: 'No platform-specific patterns matched'
    };
  }

  /**
   * Check if URL matches platform patterns with confidence scoring
   * @param {RegExp[]} patterns - Array of regex patterns to test
   * @param {string} hostname - URL hostname
   * @param {string} fullUrl - Full URL string
   * @param {string} pathname - URL pathname
   * @returns {Object} - Match result with confidence
   */
  checkPlatformPatterns(patterns, hostname, fullUrl, pathname) {
    for (const pattern of patterns) {
      if (pattern.test(fullUrl)) {
        // Determine confidence based on pattern specificity
        const confidence = this.calculatePatternConfidence(pattern, fullUrl, pathname);
        
        return {
          matches: true,
          confidence,
          reason: `Matched pattern: ${pattern.source}`,
          pattern: pattern.source
        };
      }
    }
    
    return { matches: false };
  }

  /**
   * Calculate confidence level based on pattern specificity
   * @param {RegExp} pattern - Matched regex pattern
   * @param {string} fullUrl - Full URL
   * @param {string} pathname - URL pathname
   * @returns {number} - Confidence level
   */
  calculatePatternConfidence(pattern, fullUrl, pathname) {
    const patternSource = pattern.source.toLowerCase();
    
    // High confidence: specific path patterns
    if (patternSource.includes('status') || 
        patternSource.includes('posts') || 
        patternSource.includes('watch\\?v=') ||
        patternSource.includes('/p/') ||
        patternSource.includes('/reel/') ||
        patternSource.includes('/pulse/')) {
      return CONFIDENCE_LEVELS.HIGH;
    }
    
    // Medium confidence: domain with some context
    if (patternSource.includes('embed') ||
        patternSource.includes('company') ||
        patternSource.includes('/in/') ||
        patternSource.includes('shorts')) {
      return CONFIDENCE_LEVELS.MEDIUM;
    }
    
    // Low confidence: basic domain match
    return CONFIDENCE_LEVELS.LOW;
  }

  /**
   * Get the best handler for a URL
   * @param {string} url - URL to get handler for
   * @returns {BaseHandler|null} - Best matching handler
   */
  getBestHandler(url) {
    const detection = this.detectPlatform(url);
    
    // Always try to get a specific handler first
    const handler = this.getHandler(detection.platform);
    if (handler) {
      return handler;
    }
    
    // Fallback to generic handler
    return this.getHandler(Platform.GENERIC);
  }

  /**
   * Get handler priority (higher number = higher priority)
   * @param {string} platform - Platform identifier
   * @returns {number} - Priority value
   */
  getHandlerPriority(platform) {
    const priorities = {
      [Platform.LINKEDIN]: 100,
      [Platform.TWITTER]: 95,
      [Platform.X]: 95,
      [Platform.YOUTUBE]: 90,
      [Platform.INSTAGRAM]: 85,
      [Platform.FACEBOOK]: 80,
      [Platform.GENERIC]: 1  // Lowest priority - fallback
    };
    
    return priorities[platform] || 0;
  }

  /**
   * Get all registered platforms
   * @returns {string[]} - Array of platform identifiers
   */
  getRegisteredPlatforms() {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get statistics about handler usage
   * @returns {Object} - Usage statistics
   */
  getStatistics() {
    return {
      registeredHandlers: this.handlers.size,
      cacheSize: this.platformCache.size,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      cacheHitRatio: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
    };
  }

  /**
   * Clear the platform detection cache
   */
  clearCache() {
    this.platformCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    console.log('Platform detection cache cleared');
  }

  /**
   * Cache management methods
   */

  generateCacheKey(url) {
    // Use hostname + pathname for caching to avoid query parameter variations
    try {
      const urlObj = new URL(url);
      return `${urlObj.hostname}${urlObj.pathname}`.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  cacheDetectionResult(cacheKey, result) {
    // Implement LRU cache behavior
    if (this.platformCache.size >= this.maxCacheSize) {
      const firstKey = this.platformCache.keys().next().value;
      this.platformCache.delete(firstKey);
    }
    
    this.platformCache.set(cacheKey, result);
  }

  /**
   * Validate handler before registration
   * @param {BaseHandler} handler - Handler to validate
   * @returns {boolean} - Whether handler is valid
   */
  isValidHandler(handler) {
    return handler && 
           typeof handler.extract === 'function' &&
           typeof handler.validateUrl === 'function' &&
           handler.platform;
  }

  /**
   * Normalize Twitter/X URLs for consistent handling
   * @param {string} url - Original URL
   * @returns {string} - Normalized URL
   */
  normalizeTwitterUrl(url) {
    // Convert x.com URLs to twitter.com for handler compatibility
    return url.replace(/x\.com/gi, 'twitter.com')
              .replace(/mobile\.twitter\.com/gi, 'twitter.com');
  }

  /**
   * Get platform-specific URL normalizer
   * @param {string} platform - Platform identifier
   * @returns {Function} - URL normalizer function
   */
  getNormalizer(platform) {
    const normalizers = {
      [Platform.TWITTER]: this.normalizeTwitterUrl,
      [Platform.X]: this.normalizeTwitterUrl,
      // Add other platform normalizers as needed
    };
    
    return normalizers[platform] || ((url) => url);
  }
}

/**
 * Singleton instance for global use
 */
export const platformRouter = new PlatformRouter();

/**
 * Type definitions for TypeScript-like documentation
 * 
 * @typedef {Object} PlatformDetectionResult
 * @property {string} platform - Detected platform identifier
 * @property {number} confidence - Confidence level (0-1)
 * @property {string} reason - Reason for detection result
 * @property {string} [matchedPattern] - Regex pattern that matched (if any)
 */

export default PlatformRouter;