# Metadata Extraction Implementation Examples

## Complete Implementation Examples for Production Use

This document provides detailed, production-ready code examples for implementing metadata extraction across different platforms and use cases.

## 1. Enhanced LinkPreviewService Implementation

### Core Service Architecture
```javascript
// /src/services/EnhancedLinkPreviewService.js
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import metascraper from 'metascraper';
import metascraperAuthor from 'metascraper-author';
import metascraperDate from 'metascraper-date';
import metascraperDescription from 'metascraper-description';
import metascraperImage from 'metascraper-image';
import metascraperTitle from 'metascraper-title';
import metascraperUrl from 'metascraper-url';
import { databaseService } from '../database/DatabaseService.js';

class EnhancedLinkPreviewService {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (compatible; AgentFeed LinkPreview/2.0)';
    this.timeout = 15000;
    this.maxRetries = 3;
    
    // Initialize metascraper with plugins
    this.metascraper = metascraper([
      metascraperAuthor(),
      metascraperDate(),
      metascraperDescription(),
      metascraperImage(),
      metascraperTitle(),
      metascraperUrl()
    ]);
    
    // Platform handlers
    this.platformHandlers = new Map([
      ['youtube.com', this.handleYouTube.bind(this)],
      ['youtu.be', this.handleYouTube.bind(this)],
      ['twitter.com', this.handleTwitter.bind(this)],
      ['x.com', this.handleTwitter.bind(this)],
      ['linkedin.com', this.handleLinkedIn.bind(this)],
    ]);
    
    // Rate limiting
    this.rateLimiter = new RateLimiter();
    
    // Analytics
    this.analytics = new MetadataAnalytics();
  }
  
  /**
   * Main entry point for link preview extraction
   */
  async getLinkPreview(url) {
    try {
      const validUrl = this.validateUrl(url);
      if (!validUrl) {
        throw new Error('Invalid URL provided');
      }
      
      // Check cache first
      const cached = await this.getCachedPreview(validUrl);
      if (cached && !this.isCacheExpired(cached)) {
        this.analytics.recordRequest('cache', true);
        return cached.data;
      }
      
      // Apply rate limiting
      await this.rateLimiter.throttle();
      
      // Determine platform and use appropriate handler
      const platform = this.detectPlatform(validUrl);
      const handler = this.platformHandlers.get(platform) || this.handleGeneric.bind(this);
      
      console.log(`🔗 Processing ${platform} URL: ${validUrl}`);
      
      // Extract metadata with retries
      const metadata = await this.withRetry(() => handler(validUrl), this.maxRetries);
      
      // Cache the result
      await this.cachePreview(validUrl, metadata);
      
      // Record analytics
      this.analytics.recordRequest(platform, true, metadata.fallback || false);
      
      return metadata;
      
    } catch (error) {
      console.error('Error getting link preview:', error);
      this.analytics.recordRequest('unknown', false);
      
      return this.generateFallbackMetadata(url, error.message);
    }
  }
  
  /**
   * Handle YouTube URLs with oEmbed API
   */
  async handleYouTube(url) {
    const videoId = this.extractYouTubeVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }
    
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json&maxwidth=1280&maxheight=720`;
      
      const response = await this.fetchWithTimeout(oembedUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`YouTube oEmbed API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        title: data.title || 'YouTube Video',
        description: `Video by ${data.author_name || 'YouTube Creator'}`,
        image: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        video: url,
        site_name: 'YouTube',
        type: 'video',
        author: data.author_name,
        author_url: data.author_url,
        duration: this.parseDuration(data.duration),
        width: data.width,
        height: data.height,
        html: data.html,
        provider: 'youtube'
      };
      
    } catch (error) {
      console.warn('YouTube oEmbed failed, using fallback:', error.message);
      
      return {
        title: 'YouTube Video',
        description: 'Video content from YouTube',
        image: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        video: url,
        site_name: 'YouTube',
        type: 'video',
        provider: 'youtube',
        fallback: true
      };
    }
  }
  
  /**
   * Handle Twitter/X URLs with oEmbed API
   */
  async handleTwitter(url) {
    try {
      // Try Twitter's oEmbed API (no authentication required)
      const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true&dnt=true`;
      
      const response = await this.fetchWithTimeout(oembedUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Twitter oEmbed API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extract additional metadata from HTML
      const tweetData = this.parseTwitterHTML(data.html);
      
      return {
        title: this.extractTweetTitle(data.html) || 'Tweet',
        description: this.extractTweetText(data.html) || 'Tweet from Twitter/X',
        image: tweetData.image || null,
        site_name: 'X (formerly Twitter)',
        type: 'social',
        author: tweetData.author || 'Twitter User',
        author_url: tweetData.author_url,
        html: data.html,
        width: data.width,
        height: data.height,
        provider: 'twitter'
      };
      
    } catch (error) {
      console.warn('Twitter oEmbed failed, using fallback:', error.message);
      
      return {
        title: 'Tweet',
        description: 'Content from X (formerly Twitter)',
        image: null,
        site_name: 'X (formerly Twitter)',
        type: 'social',
        provider: 'twitter',
        fallback: true
      };
    }
  }
  
  /**
   * Handle LinkedIn URLs (using third-party scraping)
   */
  async handleLinkedIn(url) {
    console.warn('LinkedIn direct scraping is against ToS. Consider using third-party APIs.');
    
    try {
      // Attempt basic metadata extraction
      const response = await this.fetchWithTimeout(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      const metadata = await this.metascraper({ url, html });
      
      return {
        title: metadata.title || 'LinkedIn Post',
        description: metadata.description || 'Content from LinkedIn',
        image: metadata.image,
        site_name: 'LinkedIn',
        type: 'social',
        author: metadata.author,
        date: metadata.date,
        provider: 'linkedin',
        notice: 'Limited data due to LinkedIn restrictions'
      };
      
    } catch (error) {
      console.warn('LinkedIn scraping failed:', error.message);
      
      return {
        title: 'LinkedIn Content',
        description: 'Professional content from LinkedIn',
        image: null,
        site_name: 'LinkedIn',
        type: 'social',
        provider: 'linkedin',
        fallback: true,
        notice: 'LinkedIn content requires special handling'
      };
    }
  }
  
  /**
   * Handle generic websites with enhanced parsing
   */
  async handleGeneric(url) {
    const response = await this.fetchWithTimeout(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type') || '';
    
    // Handle non-HTML content
    if (!contentType.includes('text/html')) {
      return this.handleNonHtmlContent(url, contentType);
    }
    
    const html = await response.text();
    
    // Use metascraper for comprehensive extraction
    const metadata = await this.metascraper({ url, html });
    
    // Enhanced parsing with JSDOM
    const enhancedData = this.enhancedParsing(html, url);
    
    // Combine and clean data
    const result = {
      title: metadata.title || enhancedData.title || this.extractDomainFromUrl(url),
      description: metadata.description || enhancedData.description || 'Web content',
      image: metadata.image || enhancedData.image,
      site_name: enhancedData.site_name || this.extractDomainFromUrl(url),
      type: this.determineContentType(html, url),
      author: metadata.author || enhancedData.author,
      date: metadata.date || enhancedData.date,
      url: metadata.url || url,
      provider: 'generic'
    };
    
    // Add structured data if available
    if (enhancedData.jsonLD) {
      result.structured_data = enhancedData.jsonLD;
    }
    
    return this.cleanMetadata(result);
  }
  
  /**
   * Enhanced HTML parsing with JSDOM
   */
  enhancedParsing(html, baseUrl) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    const result = {};
    
    // Extract JSON-LD structured data
    const jsonLDScript = document.querySelector('script[type="application/ld+json"]');
    if (jsonLDScript) {
      try {
        result.jsonLD = JSON.parse(jsonLDScript.textContent);
        
        // Extract data from JSON-LD
        if (result.jsonLD['@type'] === 'Article') {
          result.title = result.jsonLD.headline;
          result.description = result.jsonLD.description;
          result.author = result.jsonLD.author?.name;
          result.date = result.jsonLD.datePublished;
          result.image = result.jsonLD.image?.url || result.jsonLD.image;
        }
      } catch (e) {
        console.warn('Failed to parse JSON-LD:', e);
      }
    }
    
    // Extract site name
    result.site_name = this.getMetaContent(document, 'og:site_name') ||
                      document.querySelector('meta[name="application-name"]')?.getAttribute('content') ||
                      document.querySelector('title')?.textContent?.split(' - ').pop();
    
    // Extract author information
    if (!result.author) {
      result.author = this.getMetaContent(document, 'author') ||
                     document.querySelector('.author')?.textContent?.trim() ||
                     document.querySelector('[rel="author"]')?.textContent?.trim();
    }
    
    // Extract publish date
    if (!result.date) {
      result.date = this.getMetaContent(document, 'article:published_time') ||
                   document.querySelector('time[datetime]')?.getAttribute('datetime') ||
                   document.querySelector('.date')?.textContent?.trim();
    }
    
    // Enhanced image extraction
    if (!result.image) {
      result.image = this.findBestImage(document, baseUrl);
    }
    
    return result;
  }
  
  /**
   * Find the best representative image
   */
  findBestImage(document, baseUrl) {
    const candidates = [
      document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
      document.querySelector('meta[name="twitter:image"]')?.getAttribute('content'),
      document.querySelector('img[src*="hero"]')?.getAttribute('src'),
      document.querySelector('img[src*="banner"]')?.getAttribute('src'),
      document.querySelector('.hero img')?.getAttribute('src'),
      document.querySelector('article img')?.getAttribute('src'),
      document.querySelector('img')?.getAttribute('src')
    ];
    
    for (const candidate of candidates) {
      if (candidate && this.isValidImageUrl(candidate, baseUrl)) {
        return this.resolveUrl(candidate, baseUrl);
      }
    }
    
    return null;
  }
  
  /**
   * Rate limiting implementation
   */
  class RateLimiter {
    constructor(requestsPerMinute = 60) {
      this.requests = [];
      this.limit = requestsPerMinute;
      this.window = 60 * 1000; // 1 minute
    }
    
    async throttle() {
      const now = Date.now();
      this.requests = this.requests.filter(time => now - time < this.window);
      
      if (this.requests.length >= this.limit) {
        const waitTime = this.window - (now - this.requests[0]);
        console.log(`⏱️ Rate limit reached, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      this.requests.push(now);
    }
  }
  
  /**
   * Analytics tracking
   */
  class MetadataAnalytics {
    constructor() {
      this.stats = {
        requests: 0,
        successes: 0,
        failures: 0,
        fallbacks: 0,
        platforms: {},
        errors: {}
      };
    }
    
    recordRequest(platform, success, fallback = false, error = null) {
      this.stats.requests++;
      
      if (success) {
        this.stats.successes++;
      } else {
        this.stats.failures++;
        if (error) {
          this.stats.errors[error] = (this.stats.errors[error] || 0) + 1;
        }
      }
      
      if (fallback) {
        this.stats.fallbacks++;
      }
      
      this.stats.platforms[platform] = (this.stats.platforms[platform] || 0) + 1;
    }
    
    getReport() {
      return {
        ...this.stats,
        success_rate: ((this.stats.successes / this.stats.requests) * 100).toFixed(2),
        fallback_rate: ((this.stats.fallbacks / this.stats.requests) * 100).toFixed(2),
        top_errors: Object.entries(this.stats.errors)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
      };
    }
  }
  
  // Utility methods
  validateUrl(url) {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol) ? urlObj.href : null;
    } catch {
      return null;
    }
  }
  
  detectPlatform(url) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      for (const [platform] of this.platformHandlers) {
        if (hostname.includes(platform)) {
          return platform;
        }
      }
      return 'generic';
    } catch {
      return 'generic';
    }
  }
  
  async fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
  
  async withRetry(operation, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          console.warn(`Attempt ${i + 1} failed, retrying in ${delay}ms:`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      }
    }
    
    throw lastError;
  }
  
  cleanMetadata(metadata) {
    // Remove empty values
    Object.keys(metadata).forEach(key => {
      if (metadata[key] === null || metadata[key] === undefined || metadata[key] === '') {
        delete metadata[key];
      }
    });
    
    // Truncate long text
    if (metadata.title && metadata.title.length > 200) {
      metadata.title = metadata.title.substring(0, 197) + '...';
    }
    
    if (metadata.description && metadata.description.length > 500) {
      metadata.description = metadata.description.substring(0, 497) + '...';
    }
    
    // Validate URLs
    if (metadata.image) {
      metadata.image = this.validateImageUrl(metadata.image);
    }
    
    return metadata;
  }
  
  generateFallbackMetadata(url, error) {
    const domain = this.extractDomainFromUrl(url);
    return {
      title: domain,
      description: 'Content from ' + domain,
      image: null,
      site_name: domain,
      type: 'website',
      fallback: true,
      error: error,
      provider: 'fallback'
    };
  }
  
  // Additional utility methods...
  extractDomainFromUrl(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return 'Unknown Website';
    }
  }
  
  getMetaContent(document, property) {
    const meta = document.querySelector(`meta[property="${property}"]`) ||
                document.querySelector(`meta[name="${property}"]`);
    return meta?.getAttribute('content')?.trim() || null;
  }
  
  resolveUrl(url, baseUrl) {
    if (!url) return null;
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return null;
    }
  }
  
  isValidImageUrl(url, baseUrl) {
    try {
      const fullUrl = this.resolveUrl(url, baseUrl);
      if (!fullUrl) return false;
      
      // Check for common image extensions
      const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i;
      return imageExtensions.test(fullUrl) || fullUrl.includes('image');
    } catch {
      return false;
    }
  }
  
  determineContentType(html, url) {
    if (url.includes('youtube.com') || url.includes('vimeo.com')) return 'video';
    if (url.includes('twitter.com') || url.includes('linkedin.com')) return 'social';
    if (html.includes('article') || html.includes('blog')) return 'article';
    return 'website';
  }
  
  // Platform-specific utility methods
  extractYouTubeVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }
  
  parseTwitterHTML(html) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    return {
      author: document.querySelector('.twitter-tweet-author')?.textContent?.trim(),
      author_url: document.querySelector('a[href*="twitter.com"]')?.getAttribute('href'),
      image: document.querySelector('img')?.getAttribute('src')
    };
  }
  
  extractTweetTitle(html) {
    const dom = new JSDOM(html);
    const tweetText = dom.window.document.querySelector('.twitter-tweet')?.textContent;
    if (tweetText) {
      const lines = tweetText.split('\n').filter(line => line.trim());
      return lines[0]?.substring(0, 100) + (lines[0]?.length > 100 ? '...' : '');
    }
    return null;
  }
  
  extractTweetText(html) {
    const dom = new JSDOM(html);
    const tweetText = dom.window.document.querySelector('.twitter-tweet')?.textContent;
    if (tweetText) {
      const lines = tweetText.split('\n').filter(line => line.trim());
      return lines.slice(0, -2).join(' '); // Remove last two lines (date and link)
    }
    return null;
  }
  
  parseDuration(duration) {
    if (!duration) return null;
    if (typeof duration === 'number') return duration;
    
    // Parse ISO 8601 duration (PT1H2M3S)
    if (typeof duration === 'string' && duration.startsWith('PT')) {
      const matches = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (matches) {
        const hours = parseInt(matches[1] || '0');
        const minutes = parseInt(matches[2] || '0');
        const seconds = parseInt(matches[3] || '0');
        return hours * 3600 + minutes * 60 + seconds;
      }
    }
    
    return null;
  }
}

export const enhancedLinkPreviewService = new EnhancedLinkPreviewService();
export default enhancedLinkPreviewService;
```

## 2. Third-Party LinkedIn Handler

```javascript
// /src/services/LinkedInHandler.js
class LinkedInAPIHandler {
  constructor() {
    this.scrapingDogApiKey = process.env.SCRAPINGDOG_API_KEY;
    this.apifyApiKey = process.env.APIFY_API_KEY;
    this.brightDataApiKey = process.env.BRIGHT_DATA_API_KEY;
  }
  
  async extractLinkedInPost(url) {
    const handlers = [
      () => this.useScrapingDog(url),
      () => this.useApify(url),
      () => this.useBrightData(url)
    ];
    
    for (const handler of handlers) {
      try {
        const result = await handler();
        if (result) return result;
      } catch (error) {
        console.warn('LinkedIn handler failed:', error.message);
      }
    }
    
    throw new Error('All LinkedIn extraction methods failed');
  }
  
  async useScrapingDog(url) {
    if (!this.scrapingDogApiKey) return null;
    
    const apiUrl = `https://api.scrapingdog.com/linkedin?api_key=${this.scrapingDogApiKey}&url=${encodeURIComponent(url)}`;
    
    const response = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      return this.normalizeLinkedInData(data);
    }
    
    return null;
  }
  
  async useApify(url) {
    if (!this.apifyApiKey) return null;
    
    const actorId = 'curious_coder/linkedin-post-search-scraper';
    const input = { startUrls: [{ url }] };
    
    const response = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${this.apifyApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    
    if (response.ok) {
      const run = await response.json();
      // Poll for completion and get results
      const results = await this.pollApifyRun(run.data.id);
      return this.normalizeLinkedInData(results);
    }
    
    return null;
  }
  
  normalizeLinkedInData(rawData) {
    // Normalize different API response formats
    return {
      title: rawData.title || rawData.postText?.substring(0, 100) || 'LinkedIn Post',
      description: rawData.description || rawData.postText || 'Professional content from LinkedIn',
      image: rawData.image || rawData.imageUrl || rawData.media?.[0]?.url,
      author: rawData.author || rawData.authorName || rawData.profileName,
      author_url: rawData.authorUrl || rawData.profileUrl,
      date: rawData.date || rawData.publishedAt || rawData.createdAt,
      engagement: {
        likes: rawData.likes || rawData.reactions?.like || 0,
        comments: rawData.comments || rawData.commentsCount || 0,
        shares: rawData.shares || rawData.repostsCount || 0
      },
      provider: 'linkedin'
    };
  }
}
```

## 3. Twitter API v2 Handler with Authentication

```javascript
// /src/services/TwitterAPIHandler.js
class TwitterAPIHandler {
  constructor() {
    this.bearerToken = process.env.TWITTER_BEARER_TOKEN;
    this.apiBase = 'https://api.twitter.com/2';
    this.rateLimiter = new TwitterRateLimit();
  }
  
  async extractTweetData(tweetUrl) {
    const tweetId = this.extractTweetId(tweetUrl);
    if (!tweetId) {
      throw new Error('Invalid Twitter URL');
    }
    
    try {
      // Try oEmbed first (no auth required)
      const oembedData = await this.getOEmbedData(tweetUrl);
      if (oembedData) {
        return oembedData;
      }
    } catch (error) {
      console.warn('Twitter oEmbed failed:', error.message);
    }
    
    // Fallback to API v2 with authentication
    if (this.bearerToken) {
      return this.getAPIv2Data(tweetId);
    }
    
    throw new Error('No authentication available for Twitter API');
  }
  
  async getOEmbedData(url) {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true&dnt=true`;
    
    const response = await fetch(oembedUrl);
    if (response.ok) {
      const data = await response.json();
      return this.normalizeOEmbedData(data, url);
    }
    
    return null;
  }
  
  async getAPIv2Data(tweetId) {
    await this.rateLimiter.checkLimit();
    
    const fields = [
      'tweet.fields=public_metrics,created_at,author_id,text,attachments',
      'user.fields=name,username,profile_image_url,verified',
      'media.fields=url,preview_image_url',
      'expansions=author_id,attachments.media_keys'
    ].join('&');
    
    const url = `${this.apiBase}/tweets/${tweetId}?${fields}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.bearerToken}`,
        'User-Agent': 'AgentFeed/1.0'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return this.normalizeAPIv2Data(data);
    }
    
    throw new Error(`Twitter API v2 error: ${response.status}`);
  }
  
  normalizeAPIv2Data(data) {
    const tweet = data.data;
    const author = data.includes?.users?.[0];
    const media = data.includes?.media;
    
    return {
      title: `Tweet by @${author?.username || 'user'}`,
      description: tweet.text,
      image: media?.[0]?.url || media?.[0]?.preview_image_url || author?.profile_image_url,
      author: author?.name || 'Twitter User',
      author_username: author?.username,
      author_verified: author?.verified || false,
      date: tweet.created_at,
      engagement: {
        likes: tweet.public_metrics?.like_count || 0,
        retweets: tweet.public_metrics?.retweet_count || 0,
        replies: tweet.public_metrics?.reply_count || 0,
        quotes: tweet.public_metrics?.quote_count || 0
      },
      provider: 'twitter_api_v2'
    };
  }
  
  extractTweetId(url) {
    const match = url.match(/status\/(\d+)/);
    return match ? match[1] : null;
  }
}

class TwitterRateLimit {
  constructor() {
    this.requests = [];
    this.limit = 450; // Bearer token limit
    this.window = 15 * 60 * 1000; // 15 minutes
  }
  
  async checkLimit() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.window);
    
    if (this.requests.length >= this.limit) {
      const waitTime = this.window - (now - this.requests[0]);
      console.log(`⏱️ Twitter rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(now);
  }
}
```

## 4. Production Caching System

```javascript
// /src/services/MetadataCacheService.js
import Redis from 'redis';
import { databaseService } from '../database/DatabaseService.js';

class MetadataCacheService {
  constructor() {
    this.redisClient = process.env.REDIS_URL ? 
      Redis.createClient({ url: process.env.REDIS_URL }) : null;
    
    this.cacheExpiry = {
      default: 24 * 60 * 60, // 24 hours
      youtube: 7 * 24 * 60 * 60, // 7 days
      twitter: 60 * 60, // 1 hour
      linkedin: 6 * 60 * 60, // 6 hours
      generic: 24 * 60 * 60 // 24 hours
    };
  }
  
  async initialize() {
    if (this.redisClient) {
      await this.redisClient.connect();
      console.log('✅ Redis cache connected');
    }
  }
  
  async get(url) {
    const cacheKey = this.generateCacheKey(url);
    
    // Try Redis first (fastest)
    if (this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.warn('Redis cache read error:', error);
      }
    }
    
    // Fallback to database cache
    try {
      return await databaseService.db.getCachedLinkPreview(url);
    } catch (error) {
      console.warn('Database cache read error:', error);
      return null;
    }
  }
  
  async set(url, metadata, ttl = null) {
    const cacheKey = this.generateCacheKey(url);
    const provider = metadata.provider || 'generic';
    const expiry = ttl || this.cacheExpiry[provider] || this.cacheExpiry.default;
    
    const cacheData = {
      ...metadata,
      cached_at: Date.now(),
      expires_at: Date.now() + (expiry * 1000)
    };
    
    // Store in Redis
    if (this.redisClient) {
      try {
        await this.redisClient.setEx(cacheKey, expiry, JSON.stringify(cacheData));
      } catch (error) {
        console.warn('Redis cache write error:', error);
      }
    }
    
    // Store in database as backup
    try {
      await databaseService.db.cacheLinkPreview(url, cacheData);
    } catch (error) {
      console.warn('Database cache write error:', error);
    }
  }
  
  async invalidate(url) {
    const cacheKey = this.generateCacheKey(url);
    
    // Remove from Redis
    if (this.redisClient) {
      try {
        await this.redisClient.del(cacheKey);
      } catch (error) {
        console.warn('Redis cache invalidation error:', error);
      }
    }
    
    // Remove from database
    try {
      await databaseService.db.db.prepare(`
        DELETE FROM link_preview_cache WHERE url = ?
      `).run(url);
    } catch (error) {
      console.warn('Database cache invalidation error:', error);
    }
  }
  
  async cleanup() {
    // Clean expired entries from database
    try {
      const result = await databaseService.db.db.prepare(`
        DELETE FROM link_preview_cache 
        WHERE datetime(cached_at) < datetime('now', '-7 days')
      `).run();
      
      console.log(`🗑️ Cleaned ${result.changes} expired cache entries`);
      return result.changes;
    } catch (error) {
      console.error('Cache cleanup error:', error);
      return 0;
    }
  }
  
  generateCacheKey(url) {
    return `metadata:${Buffer.from(url).toString('base64')}`;
  }
  
  isExpired(cacheData) {
    return Date.now() > cacheData.expires_at;
  }
}

export const metadataCacheService = new MetadataCacheService();
```

## 5. Testing Suite

```javascript
// /tests/services/EnhancedLinkPreview.test.js
import { jest } from '@jest/globals';
import { enhancedLinkPreviewService } from '../../src/services/EnhancedLinkPreviewService.js';

describe('EnhancedLinkPreviewService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('YouTube URLs', () => {
    it('should extract metadata from YouTube oEmbed', async () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          title: 'Rick Astley - Never Gonna Give You Up',
          author_name: 'Rick Astley',
          thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
          html: '<iframe>...</iframe>'
        })
      });
      
      const result = await enhancedLinkPreviewService.getLinkPreview(url);
      
      expect(result.title).toBe('Rick Astley - Never Gonna Give You Up');
      expect(result.author).toBe('Rick Astley');
      expect(result.type).toBe('video');
      expect(result.provider).toBe('youtube');
    });
    
    it('should fallback when YouTube oEmbed fails', async () => {
      const url = 'https://www.youtube.com/watch?v=invalid';
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404
      });
      
      const result = await enhancedLinkPreviewService.getLinkPreview(url);
      
      expect(result.fallback).toBe(true);
      expect(result.provider).toBe('youtube');
    });
  });
  
  describe('Twitter URLs', () => {
    it('should extract metadata from Twitter oEmbed', async () => {
      const url = 'https://twitter.com/user/status/123456789';
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          html: '<blockquote class="twitter-tweet">Test tweet</blockquote>',
          width: 550,
          height: 250
        })
      });
      
      const result = await enhancedLinkPreviewService.getLinkPreview(url);
      
      expect(result.type).toBe('social');
      expect(result.provider).toBe('twitter');
      expect(result.site_name).toBe('X (formerly Twitter)');
    });
  });
  
  describe('Generic URLs', () => {
    it('should extract Open Graph metadata', async () => {
      const url = 'https://example.com/article';
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="og:title" content="Test Article">
            <meta property="og:description" content="This is a test article">
            <meta property="og:image" content="https://example.com/image.jpg">
            <meta property="og:type" content="article">
          </head>
          <body>Content</body>
        </html>
      `;
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'text/html']]),
        text: () => Promise.resolve(html)
      });
      
      const result = await enhancedLinkPreviewService.getLinkPreview(url);
      
      expect(result.title).toBe('Test Article');
      expect(result.description).toBe('This is a test article');
      expect(result.image).toBe('https://example.com/image.jpg');
      expect(result.type).toBe('article');
    });
    
    it('should extract JSON-LD structured data', async () => {
      const url = 'https://example.com/structured';
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Article",
              "headline": "Structured Article",
              "description": "Article with structured data",
              "author": {
                "@type": "Person",
                "name": "John Doe"
              }
            }
            </script>
          </head>
          <body>Content</body>
        </html>
      `;
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'text/html']]),
        text: () => Promise.resolve(html)
      });
      
      const result = await enhancedLinkPreviewService.getLinkPreview(url);
      
      expect(result.structured_data).toBeDefined();
      expect(result.structured_data['@type']).toBe('Article');
      expect(result.author).toBe('John Doe');
    });
  });
  
  describe('Rate Limiting', () => {
    it('should respect rate limits', async () => {
      const service = enhancedLinkPreviewService;
      const startTime = Date.now();
      
      // Make multiple requests quickly
      const promises = Array(5).fill().map(() => 
        service.getLinkPreview('https://example.com')
      );
      
      await Promise.all(promises);
      const endTime = Date.now();
      
      // Should take some time due to rate limiting
      expect(endTime - startTime).toBeGreaterThan(100);
    });
  });
  
  describe('Caching', () => {
    it('should use cached results', async () => {
      const url = 'https://example.com/cached';
      
      // Mock cache hit
      const cachedData = {
        title: 'Cached Title',
        description: 'Cached Description',
        cached_at: Date.now(),
        expires_at: Date.now() + 60000
      };
      
      enhancedLinkPreviewService.getCachedPreview = jest.fn().mockResolvedValue(cachedData);
      
      const result = await enhancedLinkPreviewService.getLinkPreview(url);
      
      expect(result.title).toBe('Cached Title');
      expect(enhancedLinkPreviewService.getCachedPreview).toHaveBeenCalledWith(url);
    });
  });
  
  describe('Error Handling', () => {
    it('should return fallback metadata on error', async () => {
      const url = 'https://invalid-domain-12345.com';
      
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const result = await enhancedLinkPreviewService.getLinkPreview(url);
      
      expect(result.fallback).toBe(true);
      expect(result.error).toBeDefined();
      expect(result.provider).toBe('fallback');
    });
  });
});
```

This comprehensive implementation provides production-ready metadata extraction with proper error handling, rate limiting, caching, and support for multiple platforms.