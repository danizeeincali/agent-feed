/**
 * Cache Strategy for Link Preview System
 * Defines caching behavior and TTL strategies for different platforms
 */

import { Platform } from '../handlers/BaseHandler.js';

/**
 * Cache strategy configuration class
 */
export class CacheStrategy {
  constructor(options = {}) {
    this.ttl = options.ttl || 3600; // Default 1 hour TTL in seconds
    this.refreshThreshold = options.refreshThreshold || 0.8; // Refresh when 80% of TTL elapsed
    this.maxStaleTime = options.maxStaleTime || this.ttl * 2; // Max time to serve stale data
    this.minTTL = options.minTTL || 300; // Minimum 5 minutes
    this.maxTTL = options.maxTTL || 86400; // Maximum 24 hours
  }

  /**
   * Check if cached data should be refreshed
   * @param {Date} lastUpdated - When the data was last updated
   * @returns {boolean} - Whether to refresh the data
   */
  shouldRefresh(lastUpdated) {
    if (!lastUpdated) return true;
    
    const age = Date.now() - new Date(lastUpdated).getTime();
    const refreshThresholdTime = this.ttl * 1000 * this.refreshThreshold;
    
    return age > refreshThresholdTime;
  }

  /**
   * Check if cached data is expired
   * @param {Date} lastUpdated - When the data was last updated
   * @returns {boolean} - Whether the data is expired
   */
  isExpired(lastUpdated) {
    if (!lastUpdated) return true;
    
    const age = Date.now() - new Date(lastUpdated).getTime();
    return age > (this.ttl * 1000);
  }

  /**
   * Check if cached data is too stale to serve
   * @param {Date} lastUpdated - When the data was last updated
   * @returns {boolean} - Whether the data is too stale
   */
  isTooStale(lastUpdated) {
    if (!lastUpdated) return true;
    
    const age = Date.now() - new Date(lastUpdated).getTime();
    return age > (this.maxStaleTime * 1000);
  }

  /**
   * Get cache key for a URL
   * @param {string} url - URL to generate key for
   * @param {string} platform - Platform identifier
   * @returns {string} - Cache key
   */
  getCacheKey(url, platform = Platform.GENERIC) {
    // Normalize URL for consistent caching
    const normalizedUrl = this.normalizeUrl(url);
    return `preview:${platform}:${this.hashUrl(normalizedUrl)}`;
  }

  /**
   * Normalize URL for caching (remove tracking params, etc.)
   * @param {string} url - Original URL
   * @returns {string} - Normalized URL
   */
  normalizeUrl(url) {
    try {
      const urlObj = new URL(url);
      
      // Remove common tracking parameters
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'msclkid', 'twclid',
        '_hsenc', '_hsmi', 'hsCtaTracking',
        'ref', 'referrer', 'source',
        'mc_cid', 'mc_eid'
      ];
      
      trackingParams.forEach(param => {
        urlObj.searchParams.delete(param);
      });
      
      // Sort remaining parameters for consistency
      urlObj.searchParams.sort();
      
      return urlObj.href;
    } catch {
      return url;
    }
  }

  /**
   * Create a hash of the URL for shorter cache keys
   * @param {string} url - URL to hash
   * @returns {string} - URL hash
   */
  hashUrl(url) {
    // Simple hash function for URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * Platform-specific cache strategies
 */
export class PlatformCacheStrategies {
  static getStrategy(platform) {
    const strategies = {
      [Platform.LINKEDIN]: new CacheStrategy({
        ttl: 4 * 60 * 60,        // 4 hours - professional content is stable
        refreshThreshold: 0.75,   // Refresh after 3 hours
        maxStaleTime: 8 * 60 * 60 // Serve stale for up to 8 hours
      }),
      
      [Platform.TWITTER]: new CacheStrategy({
        ttl: 30 * 60,            // 30 minutes - social content changes rapidly
        refreshThreshold: 0.9,    // Refresh after 27 minutes
        maxStaleTime: 2 * 60 * 60 // Serve stale for up to 2 hours
      }),
      
      [Platform.X]: new CacheStrategy({
        ttl: 30 * 60,            // 30 minutes - same as Twitter
        refreshThreshold: 0.9,
        maxStaleTime: 2 * 60 * 60
      }),
      
      [Platform.YOUTUBE]: new CacheStrategy({
        ttl: 2 * 60 * 60,        // 2 hours - video metadata is fairly stable
        refreshThreshold: 0.8,
        maxStaleTime: 6 * 60 * 60 // Serve stale for up to 6 hours
      }),
      
      [Platform.INSTAGRAM]: new CacheStrategy({
        ttl: 60 * 60,            // 1 hour - visual content moderately stable
        refreshThreshold: 0.85,
        maxStaleTime: 4 * 60 * 60
      }),
      
      [Platform.FACEBOOK]: new CacheStrategy({
        ttl: 60 * 60,            // 1 hour - social content
        refreshThreshold: 0.85,
        maxStaleTime: 4 * 60 * 60
      }),
      
      [Platform.GENERIC]: new CacheStrategy({
        ttl: 60 * 60,            // 1 hour - default for unknown content
        refreshThreshold: 0.8,
        maxStaleTime: 4 * 60 * 60
      })
    };
    
    return strategies[platform] || strategies[Platform.GENERIC];
  }

  /**
   * Get adaptive strategy based on content type and URL patterns
   * @param {string} url - URL to analyze
   * @param {string} contentType - Content type
   * @returns {CacheStrategy} - Adaptive cache strategy
   */
  static getAdaptiveStrategy(url, contentType = 'website') {
    // News websites - shorter TTL
    if (this.isNewsWebsite(url)) {
      return new CacheStrategy({
        ttl: 15 * 60,           // 15 minutes
        refreshThreshold: 0.95,
        maxStaleTime: 60 * 60
      });
    }
    
    // Blog posts - longer TTL
    if (contentType === 'article' || this.isBlogPost(url)) {
      return new CacheStrategy({
        ttl: 4 * 60 * 60,       // 4 hours
        refreshThreshold: 0.7,
        maxStaleTime: 12 * 60 * 60
      });
    }
    
    // E-commerce - medium TTL
    if (this.isEcommerce(url)) {
      return new CacheStrategy({
        ttl: 30 * 60,           // 30 minutes
        refreshThreshold: 0.8,
        maxStaleTime: 2 * 60 * 60
      });
    }
    
    // Static/documentation sites - longer TTL
    if (this.isDocumentationSite(url)) {
      return new CacheStrategy({
        ttl: 6 * 60 * 60,       // 6 hours
        refreshThreshold: 0.6,
        maxStaleTime: 24 * 60 * 60
      });
    }
    
    // Default strategy
    return this.getStrategy(Platform.GENERIC);
  }

  /**
   * Check if URL is a news website
   * @param {string} url - URL to check
   * @returns {boolean} - Whether it's a news site
   */
  static isNewsWebsite(url) {
    const newsPatterns = [
      /cnn\.com/i, /bbc\.com/i, /reuters\.com/i, /ap\.org/i,
      /nytimes\.com/i, /washingtonpost\.com/i, /wsj\.com/i,
      /techcrunch\.com/i, /theverge\.com/i, /engadget\.com/i,
      /news/i, /breaking/i, /latest/i
    ];
    
    return newsPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Check if URL is a blog post
   * @param {string} url - URL to check
   * @returns {boolean} - Whether it's a blog post
   */
  static isBlogPost(url) {
    const blogPatterns = [
      /blog/i, /post/i, /article/i, /medium\.com/i,
      /wordpress\.com/i, /blogspot\.com/i, /substack\.com/i,
      /\/\d{4}\/\d{2}\/\d{2}\//,  // Date-based URLs
      /\/posts?\//i, /\/articles?\//i
    ];
    
    return blogPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Check if URL is an e-commerce site
   * @param {string} url - URL to check
   * @returns {boolean} - Whether it's e-commerce
   */
  static isEcommerce(url) {
    const ecommercePatterns = [
      /amazon\.com/i, /ebay\.com/i, /shopify\.com/i,
      /etsy\.com/i, /alibaba\.com/i, /walmart\.com/i,
      /shop/i, /store/i, /product/i, /cart/i, /buy/i
    ];
    
    return ecommercePatterns.some(pattern => pattern.test(url));
  }

  /**
   * Check if URL is a documentation site
   * @param {string} url - URL to check
   * @returns {boolean} - Whether it's a documentation site
   */
  static isDocumentationSite(url) {
    const docPatterns = [
      /docs/i, /documentation/i, /api/i, /reference/i,
      /guide/i, /tutorial/i, /manual/i, /wiki/i,
      /readthedocs\.io/i, /github\.io/i, /gitbook\.io/i
    ];
    
    return docPatterns.some(pattern => pattern.test(url));
  }
}

/**
 * Cache key manager for different cache tiers
 */
export class CacheKeyManager {
  constructor() {
    this.keyPrefixes = {
      memory: 'mem',
      redis: 'redis',
      database: 'db'
    };
  }

  /**
   * Generate cache key for specific tier
   * @param {string} tier - Cache tier (memory, redis, database)
   * @param {string} url - URL
   * @param {string} platform - Platform identifier
   * @returns {string} - Tier-specific cache key
   */
  getTierKey(tier, url, platform) {
    const strategy = PlatformCacheStrategies.getStrategy(platform);
    const baseKey = strategy.getCacheKey(url, platform);
    
    return `${this.keyPrefixes[tier]}:${baseKey}`;
  }

  /**
   * Generate keys for all cache tiers
   * @param {string} url - URL
   * @param {string} platform - Platform identifier
   * @returns {Object} - Keys for all tiers
   */
  getAllTierKeys(url, platform) {
    return {
      memory: this.getTierKey('memory', url, platform),
      redis: this.getTierKey('redis', url, platform),
      database: this.getTierKey('database', url, platform)
    };
  }

  /**
   * Extract platform and URL from cache key
   * @param {string} key - Cache key to parse
   * @returns {Object|null} - Parsed key components or null
   */
  parseKey(key) {
    const parts = key.split(':');
    if (parts.length >= 4) {
      return {
        tier: parts[0],
        type: parts[1], // Should be 'preview'
        platform: parts[2],
        hash: parts[3]
      };
    }
    return null;
  }
}

export default {
  CacheStrategy,
  PlatformCacheStrategies,
  CacheKeyManager
};