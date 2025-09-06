/**
 * Enhanced Link Preview Service
 * Fetches and caches webpage metadata with real image extraction and site-specific handling
 */

import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { databaseService } from '../database/DatabaseService.js';
import { URL } from 'url';

class EnhancedLinkPreviewService {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
    this.timeout = 15000;
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    
    // CORS proxy services for image fetching
    this.corsProxies = [
      'https://images.weserv.nl/?url=',
      'https://api.codetabs.com/v1/proxy/?quest='
    ];
    
    // Security configuration
    this.blockedDomains = new Set([
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '10.0.0.0/8',
      '172.16.0.0/12', 
      '192.168.0.0/16',
      '169.254.169.254' // AWS metadata
    ]);
    
    // Performance monitoring
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      averageResponseTime: 0
    };
    
    // Site-specific handlers
    this.siteHandlers = {
      'github.com': this.handleGitHub.bind(this),
      'wired.com': this.handleNewsArticle.bind(this),
      'techcrunch.com': this.handleNewsArticle.bind(this),
      'arstechnica.com': this.handleNewsArticle.bind(this),
      'medium.com': this.handleMedium.bind(this),
      'dev.to': this.handleDevTo.bind(this),
      'youtube.com': this.handleYouTube.bind(this),
      'youtu.be': this.handleYouTube.bind(this),
      'twitter.com': this.handleTwitter.bind(this),
      'x.com': this.handleTwitter.bind(this),
      'linkedin.com': this.handleLinkedIn.bind(this),
      'flownexus.io': this.handleFlowNexus.bind(this),
      'flow-nexus.com': this.handleFlowNexus.bind(this)
    };
    
    // Rate limiting configuration
    this.rateLimits = new Map(); // domain -> {count, resetTime}
    this.maxRequestsPerDomain = 10;
    this.rateLimitWindow = 60000; // 1 minute
  }

  /**
   * Get link preview with enhanced caching and rate limiting
   */
  async getLinkPreview(url) {
    try {
      // Validate URL
      const validUrl = this.validateUrl(url);
      if (!validUrl) {
        throw new Error('Invalid URL provided');
      }
      
      const domain = new URL(validUrl).hostname;
      
      // Check rate limits
      if (!this.checkRateLimit(domain)) {
        console.warn(`🚫 Rate limit exceeded for domain: ${domain}`);
        return this.createFallbackPreview(validUrl, 'Rate limit exceeded for this domain');
      }

      // Check cache first with TTL validation
      const cached = await this.getCachedPreviewWithValidation(validUrl);
      if (cached) {
        console.log(`📋 Using cached preview for: ${validUrl}`);
        return cached;
      }

      // Fetch fresh preview
      console.log(`🔗 Fetching enhanced preview for: ${validUrl}`);
      const preview = await this.fetchLinkPreview(validUrl);

      // Cache the result with metadata
      await this.cachePreviewWithMetadata(validUrl, preview);

      // Update rate limit counter
      this.updateRateLimit(domain);

      return preview;
    } catch (error) {
      console.error('❌ Error getting enhanced link preview:', error);
      return this.createFallbackPreview(url, error.message);
    }
  }
  
  /**
   * Check rate limits for domain
   */
  checkRateLimit(domain) {
    const now = Date.now();
    const limit = this.rateLimits.get(domain);
    
    if (!limit) {
      return true; // No limit set, allow request
    }
    
    // Reset counter if window has passed
    if (now > limit.resetTime) {
      this.rateLimits.delete(domain);
      return true;
    }
    
    return limit.count < this.maxRequestsPerDomain;
  }
  
  /**
   * Update rate limit counter
   */
  updateRateLimit(domain) {
    const now = Date.now();
    const existing = this.rateLimits.get(domain);
    
    if (!existing || now > existing.resetTime) {
      this.rateLimits.set(domain, {
        count: 1,
        resetTime: now + this.rateLimitWindow
      });
    } else {
      existing.count++;
    }
  }
  
  /**
   * Get cached preview with TTL validation
   */
  async getCachedPreviewWithValidation(url) {
    try {
      const cached = await databaseService.db.getCachedLinkPreview(url);
      if (!cached) return null;
      
      // Check if cache has expired (24 hours default)
      const cacheAge = Date.now() - new Date(cached.cached_at).getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (cacheAge > maxAge) {
        console.log(`🗑️ Cache expired for: ${url}`);
        await databaseService.db.invalidateLinkPreviewCache(url);
        return null;
      }
      
      return cached;
    } catch (error) {
      console.warn('⚠️ Cache validation error:', error.message);
      return null;
    }
  }
  
  /**
   * Cache preview with enhanced metadata
   */
  async cachePreviewWithMetadata(url, preview) {
    try {
      const enhancedPreview = {
        ...preview,
        cached_at: new Date().toISOString(),
        processing_time: Date.now(),
        version: '2.0'
      };
      
      await databaseService.db.cacheLinkPreview(url, enhancedPreview);
      console.log(`💾 Cached preview for: ${url}`);
    } catch (error) {
      console.warn('⚠️ Failed to cache preview:', error.message);
    }
  }

  /**
   * Create fallback preview when fetching fails
   */
  createFallbackPreview(url, error) {
    const domain = this.extractDomainFromUrl(url);
    return {
      title: domain || 'External Link',
      description: 'Unable to fetch preview - ' + error,
      image: this.generateFallbackImage(domain),
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
      video: null,
      type: 'website',
      site_name: domain,
      error: error
    };
  }

  /**
   * Fetch link preview with enhanced handling and site-specific parsers
   */
  async fetchLinkPreview(url) {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    
    // Check if we have a site-specific handler
    const handler = this.siteHandlers[domain];
    if (handler) {
      try {
        console.log(`🎯 Using site-specific handler for: ${domain}`);
        const result = await handler(url, urlObj);
        if (result && result.title) return result;
      } catch (error) {
        console.warn(`Site-specific handler failed for ${domain}, falling back to generic:`, error.message);
      }
    }
    
    // Generic HTML parsing with retry logic
    const response = await this.fetchWithRetry(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Cache-Control': 'no-cache',
        'DNT': '1'
      },
      timeout: this.timeout,
      follow: 5,
      size: this.maxFileSize
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return this.handleNonHtmlContent(url, contentType, response);
    }

    const html = await response.text();
    return await this.parseHtmlPreview(html, url);
  }

  /**
   * Enhanced HTML parsing with comprehensive image extraction and generic site handling
   */
  async parseHtmlPreview(html, url) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const urlObj = new URL(url);

    const preview = {
      title: null,
      description: null,
      image: null,
      video: null,
      type: 'website',
      favicon: null,
      author: null,
      publishedAt: null,
      site_name: null,
      keywords: [],
      language: null,
      canonical: null
    };

    // Extract title with enhanced priority and cleaning
    preview.title = this.getMetaContent(document, 'og:title') ||
                   this.getMetaContent(document, 'twitter:title') ||
                   this.getMetaContent(document, 'apple-mobile-web-app-title') ||
                   this.getMetaContent(document, 'sailthru.title') ||
                   document.querySelector('h1')?.textContent?.trim() ||
                   document.querySelector('title')?.textContent?.trim() ||
                   this.extractDomainFromUrl(url);

    // Extract description with enhanced priority and cleaning
    preview.description = this.getMetaContent(document, 'og:description') ||
                         this.getMetaContent(document, 'twitter:description') ||
                         this.getMetaContent(document, 'description') ||
                         this.getMetaContent(document, 'sailthru.description') ||
                         this.extractArticleExcerpt(document) ||
                         this.extractFirstParagraph(document) ||
                         this.extractContentSummary(document);

    // Enhanced image extraction with multiple fallbacks
    preview.image = await this.extractBestImage(document, url);
    
    // Extract comprehensive metadata
    preview.author = this.getMetaContent(document, 'author') ||
                    this.getMetaContent(document, 'article:author') ||
                    this.getMetaContent(document, 'sailthru.author') ||
                    this.getMetaContent(document, 'twitter:creator') ||
                    this.extractAuthorFromStructuredData(document) ||
                    this.extractAuthorFromByline(document);
    
    preview.publishedAt = this.getMetaContent(document, 'article:published_time') ||
                         this.getMetaContent(document, 'datePublished') ||
                         this.getMetaContent(document, 'sailthru.date') ||
                         this.extractDateFromStructuredData(document) ||
                         this.extractDateFromContent(document);
    
    preview.site_name = this.getMetaContent(document, 'og:site_name') ||
                       this.getMetaContent(document, 'application-name') ||
                       this.getMetaContent(document, 'twitter:site') ||
                       this.extractSiteNameFromTitle(document) ||
                       urlObj.hostname.replace('www.', '');

    // Extract video with enhanced detection
    preview.video = this.getMetaContent(document, 'og:video:url') ||
                   this.getMetaContent(document, 'og:video') ||
                   this.getMetaContent(document, 'twitter:player') ||
                   this.detectVideoEmbed(document);

    // Extract favicon with multiple methods
    preview.favicon = this.extractFavicon(document, url);
    
    // Extract keywords
    preview.keywords = this.extractKeywords(document);
    
    // Extract language
    preview.language = this.extractLanguage(document);
    
    // Extract canonical URL
    preview.canonical = this.extractCanonical(document, url);

    // Determine content type with enhanced detection
    preview.type = this.determineContentType(document, url);

    // Clean and validate data
    return this.cleanPreviewData(preview);
  }

  /**
   * Enhanced image extraction with intelligent fallbacks
   */
  async extractBestImage(document, url) {
    const candidates = [];
    const urlObj = new URL(url);

    // Priority 1: Open Graph and Twitter Card images
    const ogImage = this.getMetaContent(document, 'og:image');
    const twitterImage = this.getMetaContent(document, 'twitter:image');
    const twitterImageSrc = this.getMetaContent(document, 'twitter:image:src');
    
    if (ogImage) candidates.push({ url: ogImage, priority: 10, type: 'og' });
    if (twitterImage) candidates.push({ url: twitterImage, priority: 9, type: 'twitter' });
    if (twitterImageSrc) candidates.push({ url: twitterImageSrc, priority: 9, type: 'twitter-src' });

    // Priority 2: Schema.org structured data
    const structuredImages = this.extractStructuredDataImages(document);
    structuredImages.forEach(img => candidates.push({ url: img, priority: 8, type: 'structured' }));

    // Priority 3: Article/content images
    const contentImages = this.extractContentImages(document, url);
    contentImages.forEach(img => candidates.push({ url: img, priority: 7, type: 'content' }));

    // Priority 4: Site logos and brand images
    const logoImages = this.extractLogoImages(document, url);
    logoImages.forEach(img => candidates.push({ url: img, priority: 6, type: 'logo' }));

    // Priority 5: First meaningful image
    const firstImage = this.getFirstImage(document, url);
    if (firstImage) candidates.push({ url: firstImage, priority: 5, type: 'first' });

    // Sort by priority and validate images
    candidates.sort((a, b) => b.priority - a.priority);
    
    for (const candidate of candidates) {
      const resolvedUrl = this.resolveUrl(candidate.url, url);
      if (resolvedUrl && await this.validateImage(resolvedUrl)) {
        console.log(`🖼️ Selected ${candidate.type} image: ${resolvedUrl}`);
        return resolvedUrl;
      }
    }

    // Fallback: Generate fallback image
    return this.generateFallbackImage(urlObj.hostname);
  }

  /**
   * Extract images from structured data (JSON-LD, microdata)
   */
  extractStructuredDataImages(document) {
    const images = [];
    
    // JSON-LD structured data
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    jsonLdScripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        const extractImages = (obj) => {
          if (typeof obj !== 'object' || !obj) return;
          
          if (obj.image) {
            if (typeof obj.image === 'string') {
              images.push(obj.image);
            } else if (Array.isArray(obj.image)) {
              obj.image.forEach(img => {
                if (typeof img === 'string') images.push(img);
                else if (img.url) images.push(img.url);
              });
            } else if (obj.image.url) {
              images.push(obj.image.url);
            }
          }
          
          // Recursively check nested objects
          Object.values(obj).forEach(value => {
            if (typeof value === 'object') extractImages(value);
          });
        };
        
        extractImages(data);
      } catch (e) {
        // Ignore invalid JSON-LD
      }
    });

    return [...new Set(images)]; // Remove duplicates
  }

  /**
   * Extract images from article content
   */
  extractContentImages(document, url) {
    const images = [];
    const selectors = [
      'article img[src]',
      '.article-content img[src]',
      '.content img[src]',
      '.post-content img[src]',
      '.entry-content img[src]',
      'main img[src]',
      '[class*="content"] img[src]'
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(img => {
        const src = img.getAttribute('src');
        if (src && this.isValidImageSrc(src)) {
          images.push(this.resolveUrl(src, url));
        }
      });
    });

    return [...new Set(images.filter(Boolean))];
  }

  /**
   * Extract logo and brand images
   */
  extractLogoImages(document, url) {
    const images = [];
    const selectors = [
      '[class*="logo"] img[src]',
      '[id*="logo"] img[src]',
      '.brand img[src]',
      '.header img[src]',
      'nav img[src]',
      '[alt*="logo" i] img[src]',
      '[alt*="brand" i] img[src]'
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(img => {
        const src = img.getAttribute('src');
        if (src && this.isValidImageSrc(src)) {
          images.push(this.resolveUrl(src, url));
        }
      });
    });

    return [...new Set(images.filter(Boolean))];
  }

  /**
   * Enhanced favicon extraction
   */
  extractFavicon(document, url) {
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

    // Check various favicon sources
    const faviconSelectors = [
      'link[rel="icon"][href]',
      'link[rel="shortcut icon"][href]',
      'link[rel="apple-touch-icon"][href]',
      'link[rel="apple-touch-icon-precomposed"][href]',
      'link[rel="mask-icon"][href]'
    ];

    for (const selector of faviconSelectors) {
      const link = document.querySelector(selector);
      if (link) {
        const href = link.getAttribute('href');
        if (href) {
          return this.resolveUrl(href, url);
        }
      }
    }

    // Fallback to standard locations
    return `${baseUrl}/favicon.ico`;
  }

  /**
   * Site-specific handlers
   */
  async handleGitHub(url, urlObj) {
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length < 2) return null;

    const [owner, repo] = pathParts;
    
    return {
      title: `${repo} - ${owner}`,
      description: `GitHub repository by ${owner}`,
      image: `https://opengraph.githubassets.com/1/${owner}/${repo}`,
      site_name: 'GitHub',
      type: 'website',
      author: owner,
      favicon: 'https://github.com/favicon.ico'
    };
  }

  async handleYouTube(url, urlObj) {
    let videoId = null;
    
    if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.slice(1);
    } else {
      videoId = urlObj.searchParams.get('v');
    }
    
    if (!videoId) return null;

    try {
      // Use YouTube oEmbed API to get real video metadata
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json&maxwidth=1280&maxheight=720`;
      
      const response = await this.fetchWithRetry(oembedUrl, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      if (!response.ok) {
        console.warn('🎬 YouTube oEmbed API failed, using fallback');
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      console.log('🎬 YouTube oEmbed API success:', {
        title: data.title,
        author: data.author_name,
        thumbnail: data.thumbnail_url
      });

      return {
        title: data.title || 'YouTube Video',
        description: `Video by ${data.author_name || 'Unknown'} on YouTube`,
        image: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        video: url,
        type: 'video',
        site_name: 'YouTube',
        favicon: 'https://www.youtube.com/favicon.ico',
        author: data.author_name,
        width: data.width,
        height: data.height
      };
    } catch (error) {
      console.warn('🎬 YouTube oEmbed failed, using generic fallback:', error.message);
      
      // Fallback to generic data with better thumbnail
      return {
        title: 'YouTube Video',
        description: 'Video content on YouTube',
        image: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        video: url,
        type: 'video',
        site_name: 'YouTube',
        favicon: 'https://www.youtube.com/favicon.ico'
      };
    }
  }

  async handleNewsArticle(url, urlObj) {
    try {
      const response = await this.fetchWithRetry(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 10000
      });
      
      if (!response.ok) return null;
      
      const html = await response.text();
      const dom = new JSDOM(html);
      const document = dom.window.document;

      return {
        title: this.getMetaContent(document, 'og:title') || 
               document.querySelector('h1')?.textContent?.trim(),
        description: this.getMetaContent(document, 'og:description') ||
                    this.getMetaContent(document, 'description'),
        image: this.getMetaContent(document, 'og:image') ||
               this.getMetaContent(document, 'twitter:image'),
        type: 'article',
        site_name: urlObj.hostname.replace('www.', ''),
        author: this.getMetaContent(document, 'author'),
        publishedAt: this.getMetaContent(document, 'article:published_time'),
        favicon: `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`
      };
    } catch (error) {
      console.warn(`Failed to fetch news article ${url}:`, error.message);
      return null;
    }
  }

  async handleMedium(url, urlObj) {
    // Medium has specific patterns for article images
    try {
      const response = await this.fetchWithRetry(url, {
        headers: { 'User-Agent': this.userAgent }
      });
      
      if (!response.ok) return null;
      
      const html = await response.text();
      const dom = new JSDOM(html);
      const document = dom.window.document;

      return {
        title: this.getMetaContent(document, 'og:title'),
        description: this.getMetaContent(document, 'og:description'),
        image: this.getMetaContent(document, 'og:image'),
        type: 'article',
        site_name: 'Medium',
        author: this.getMetaContent(document, 'author'),
        favicon: 'https://medium.com/favicon.ico'
      };
    } catch (error) {
      return null;
    }
  }

  async handleDevTo(url, urlObj) {
    return {
      title: 'Dev.to Article',
      description: 'Developer community article',
      image: 'https://res.cloudinary.com/practicaldev/image/fetch/s--R2_mCACQ--/c_limit%2Cf_auto%2Cfl_progressive%2Cq_auto%2Cw_880/https://dev-to-uploads.s3.amazonaws.com/uploads/logos/resized_logo_UQww2soKuUsjaOGNB38o.png',
      type: 'article',
      site_name: 'DEV Community',
      favicon: 'https://dev.to/favicon.ico'
    };
  }

  /**
   * Twitter/X Handler - Production Ready Implementation
   * Handles Twitter/X posts with oEmbed API and thread detection
   */
  async handleTwitter(url, urlObj) {
    try {
      console.log('🐦 Processing Twitter/X URL:', url);
      
      // Extract tweet ID and username for API calls
      const tweetInfo = this.extractTwitterInfo(url);
      if (!tweetInfo) {
        throw new Error('Could not extract tweet information from URL');
      }
      
      const isXDomain = urlObj.hostname.includes('x.com');
      const siteName = isXDomain ? 'X' : 'Twitter';
      
      // Try Twitter oEmbed API first (most reliable)
      try {
        const oEmbedResult = await this.fetchTwitterOEmbed(url, tweetInfo, siteName);
        if (oEmbedResult) {
          console.log('✅ Twitter oEmbed API success');
          return oEmbedResult;
        }
      } catch (error) {
        console.warn('⚠️ Twitter oEmbed failed, trying web scraping:', error.message);
      }
      
      // Fallback to web scraping (limited due to Twitter's restrictions)
      try {
        const scrapedResult = await this.scrapeTwitterContent(url, tweetInfo, siteName);
        if (scrapedResult) {
          console.log('✅ Twitter web scraping success');
          return scrapedResult;
        }
      } catch (error) {
        console.warn('⚠️ Twitter web scraping failed:', error.message);
      }
      
      // Generate enhanced fallback
      throw new Error('All Twitter extraction methods failed');
      
    } catch (error) {
      console.error('❌ Twitter handler error:', error.message);
      return this.generateTwitterFallback(url, urlObj);
    }
  }
  
  /**
   * Extract tweet information from URL
   */
  extractTwitterInfo(url) {
    // Handle both twitter.com and x.com URLs
    const patterns = [
      /(?:twitter\.com|x\.com)\/([^/]+)\/status\/(\d+)/,
      /(?:twitter\.com|x\.com)\/i\/web\/status\/(\d+)/,
      /(?:twitter\.com|x\.com)\/([^/]+)\/status\/(\d+)\?/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          username: match[1] || null,
          tweetId: match[2] || match[1], // Handle different URL formats
          isThread: url.includes('/status/') && url.includes('?') // Basic thread detection
        };
      }
    }
    
    return null;
  }
  
  /**
   * Fetch Twitter content using oEmbed API
   */
  async fetchTwitterOEmbed(url, tweetInfo, siteName) {
    try {
      // Twitter oEmbed API endpoint
      const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&format=json&omit_script=true&hide_media=false&hide_thread=false`;
      
      const response = await this.fetchWithRetry(oembedUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
          'Referer': 'https://developer.twitter.com/'
        },
        timeout: 10000
      });
      
      if (!response.ok) {
        throw new Error(`Twitter oEmbed API returned ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.html && data.author_name) {
        // Extract additional metadata from HTML content
        const dom = new JSDOM(data.html);
        const tweetText = dom.window.document.querySelector('p')?.textContent?.trim() || '';
        
        return {
          title: `${data.author_name} on ${siteName}`,
          description: this.cleanText(tweetText, 280) || `Tweet by ${data.author_name}`,
          image: this.extractTwitterImage(data.html) || `https://abs.twimg.com/icons/apple-touch-icon-192x192.png`,
          type: 'social',
          site_name: siteName,
          author: data.author_name,
          username: data.author_url?.split('/').pop() || tweetInfo.username,
          tweetId: tweetInfo.tweetId,
          isThread: tweetInfo.isThread,
          favicon: `https://abs.twimg.com/icons/apple-touch-icon-192x192.png`,
          html: data.html,
          width: data.width,
          height: data.height
        };
      }
      
      return null;
    } catch (error) {
      console.warn('Twitter oEmbed API failed:', error.message);
      return null;
    }
  }
  
  /**
   * Scrape Twitter content (limited due to auth requirements)
   */
  async scrapeTwitterContent(url, tweetInfo, siteName) {
    try {
      const response = await this.fetchWithRetry(url, {
        headers: {
          'User-Agent': 'Twitterbot/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        timeout: 10000
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const html = await response.text();
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      // Try to extract metadata from available meta tags
      const title = this.getMetaContent(document, 'og:title') ||
                   this.getMetaContent(document, 'twitter:title') ||
                   `${siteName} Post`;
      
      const description = this.getMetaContent(document, 'og:description') ||
                         this.getMetaContent(document, 'twitter:description') ||
                         this.getMetaContent(document, 'description') ||
                         'Social media post';
      
      const image = this.getMetaContent(document, 'og:image') ||
                   this.getMetaContent(document, 'twitter:image') ||
                   'https://abs.twimg.com/icons/apple-touch-icon-192x192.png';
      
      return {
        title: this.cleanText(title),
        description: this.cleanText(description, 280),
        image: this.resolveUrl(image, url),
        type: 'social',
        site_name: siteName,
        tweetId: tweetInfo.tweetId,
        username: tweetInfo.username,
        isThread: tweetInfo.isThread,
        favicon: 'https://abs.twimg.com/icons/apple-touch-icon-192x192.png'
      };
    } catch (error) {
      console.warn('Twitter web scraping failed:', error.message);
      return null;
    }
  }
  
  /**
   * Extract image from Twitter oEmbed HTML
   */
  extractTwitterImage(html) {
    try {
      const dom = new JSDOM(html);
      const img = dom.window.document.querySelector('img');
      return img?.getAttribute('src') || null;
    } catch {
      return null;
    }
  }
  
  /**
   * Generate enhanced Twitter fallback
   */
  generateTwitterFallback(url, urlObj) {
    const isXDomain = urlObj.hostname.includes('x.com');
    const siteName = isXDomain ? 'X' : 'Twitter';
    const tweetInfo = this.extractTwitterInfo(url);
    
    return {
      title: `${siteName} ${tweetInfo?.isThread ? 'Thread' : 'Post'}`,
      description: `Social media content on ${siteName}${tweetInfo?.username ? ` by @${tweetInfo.username}` : ''}`,
      image: 'https://abs.twimg.com/icons/apple-touch-icon-192x192.png',
      type: 'social',
      site_name: siteName,
      tweetId: tweetInfo?.tweetId || null,
      username: tweetInfo?.username || null,
      isThread: tweetInfo?.isThread || false,
      favicon: 'https://abs.twimg.com/icons/apple-touch-icon-192x192.png',
      error: 'Twitter content requires authentication',
      fallback: true
    };
  }

  /**
   * LinkedIn Handler - Production Ready Implementation
   * Handles LinkedIn posts, articles, and profile links with real metadata extraction
   */
  async handleLinkedIn(url, urlObj) {
    try {
      console.log('🔗 Processing LinkedIn URL:', url);
      
      // Check if it's a specific LinkedIn content type
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const contentType = this.detectLinkedInContentType(pathParts);
      
      // Try LinkedIn oEmbed API first (limited but available for some content)
      if (contentType === 'post' || contentType === 'article') {
        try {
          const oEmbedResult = await this.fetchLinkedInOEmbed(url);
          if (oEmbedResult) {
            console.log('✅ LinkedIn oEmbed API success');
            return oEmbedResult;
          }
        } catch (error) {
          console.warn('⚠️ LinkedIn oEmbed failed, trying web scraping:', error.message);
        }
      }
      
      // Fallback to web scraping with enhanced headers
      const response = await this.fetchWithRetry(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Upgrade-Insecure-Requests': '1',
          'DNT': '1'
        },
        timeout: 15000
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      return this.parseLinkedInContent(html, url, contentType);
      
    } catch (error) {
      console.error('❌ LinkedIn handler error:', error.message);
      
      // Enhanced fallback with content type detection
      return this.generateLinkedInFallback(url, urlObj);
    }
  }
  
  /**
   * Detect LinkedIn content type from URL path
   */
  detectLinkedInContentType(pathParts) {
    if (!pathParts.length) return 'home';
    
    const firstPart = pathParts[0];
    const contentTypeMap = {
      'posts': 'post',
      'pulse': 'article',
      'feed': 'feed',
      'in': 'profile',
      'company': 'company',
      'school': 'school',
      'jobs': 'job',
      'events': 'event'
    };
    
    return contentTypeMap[firstPart] || 'post';
  }
  
  /**
   * Attempt LinkedIn oEmbed API (limited availability)
   */
  async fetchLinkedInOEmbed(url) {
    try {
      // LinkedIn has limited oEmbed support, mainly for public posts
      const oembedUrl = `https://www.linkedin.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      
      const response = await this.fetchWithRetry(oembedUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        },
        timeout: 8000
      });
      
      if (!response.ok) {
        throw new Error(`LinkedIn oEmbed API returned ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.title || data.author_name) {
        return {
          title: data.title || 'LinkedIn Content',
          description: `Professional content by ${data.author_name || 'LinkedIn User'}`,
          image: data.thumbnail_url || 'https://static.licdn.com/aero-v1/sc/h/al2o9zrvru7aqj8e1x2rzsrca',
          type: 'article',
          site_name: 'LinkedIn',
          author: data.author_name,
          favicon: 'https://static.licdn.com/sc/h/1bt1uwq5akv756knzdj4l6cdc',
          width: data.width,
          height: data.height
        };
      }
      
      return null;
    } catch (error) {
      console.warn('LinkedIn oEmbed API failed:', error.message);
      return null;
    }
  }
  
  /**
   * Parse LinkedIn content from HTML
   */
  parseLinkedInContent(html, url, contentType) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Extract title with LinkedIn-specific selectors
    const title = this.getMetaContent(document, 'og:title') ||
                 this.getMetaContent(document, 'twitter:title') ||
                 document.querySelector('h1')?.textContent?.trim() ||
                 document.querySelector('[data-test-id="main-feed-activity-card"] span[dir="ltr"]')?.textContent?.trim() ||
                 'LinkedIn Content';
    
    // Extract description with LinkedIn-specific selectors
    const description = this.getMetaContent(document, 'og:description') ||
                       this.getMetaContent(document, 'twitter:description') ||
                       this.getMetaContent(document, 'description') ||
                       document.querySelector('[data-test-id="main-feed-activity-card"] .feed-shared-text')?.textContent?.trim() ||
                       `Professional ${contentType} content on LinkedIn`;
    
    // Extract image with LinkedIn-specific selectors
    const image = this.getMetaContent(document, 'og:image') ||
                 this.getMetaContent(document, 'twitter:image') ||
                 document.querySelector('[data-test-id="main-feed-activity-card"] img')?.getAttribute('src') ||
                 'https://static.licdn.com/aero-v1/sc/h/al2o9zrvru7aqj8e1x2rzsrca';
    
    // Extract author information
    const author = this.getMetaContent(document, 'article:author') ||
                  document.querySelector('[data-test-id="post-author-name"]')?.textContent?.trim() ||
                  document.querySelector('.feed-shared-actor__name')?.textContent?.trim() ||
                  'LinkedIn User';
    
    // Extract publication date
    const publishedAt = this.getMetaContent(document, 'article:published_time') ||
                       document.querySelector('time')?.getAttribute('datetime') ||
                       null;
    
    return {
      title: this.cleanText(title),
      description: this.cleanText(description, 300),
      image: this.resolveUrl(image, url),
      type: contentType === 'article' ? 'article' : 'social',
      site_name: 'LinkedIn',
      author,
      publishedAt,
      favicon: 'https://static.licdn.com/sc/h/1bt1uwq5akv756knzdj4l6cdc'
    };
  }
  
  /**
   * Generate enhanced LinkedIn fallback
   */
  generateLinkedInFallback(url, urlObj) {
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    const contentType = this.detectLinkedInContentType(pathParts);
    
    const fallbackTitles = {
      'post': 'LinkedIn Post',
      'article': 'LinkedIn Article',
      'profile': 'LinkedIn Profile',
      'company': 'LinkedIn Company Page',
      'job': 'LinkedIn Job Posting',
      'event': 'LinkedIn Event'
    };
    
    return {
      title: fallbackTitles[contentType] || 'LinkedIn Content',
      description: 'Professional social media content on LinkedIn',
      image: 'https://static.licdn.com/aero-v1/sc/h/al2o9zrvru7aqj8e1x2rzsrca',
      type: contentType === 'article' ? 'article' : 'social',
      site_name: 'LinkedIn',
      favicon: 'https://static.licdn.com/sc/h/1bt1uwq5akv756knzdj4l6cdc',
      error: 'Limited access to LinkedIn content',
      fallback: true
    };
  }

  /**
   * Utility methods
   */
  /**
   * Enhanced fetch with retry, timeout, and security measures
   */
  async fetchWithRetry(url, options, retries = 3) {
    this.metrics.totalRequests++;
    const startTime = Date.now();
    
    for (let i = 0; i < retries; i++) {
      try {
        // Enhanced security headers
        const secureOptions = {
          ...options,
          headers: {
            ...options.headers,
            'X-Forwarded-For': '203.0.113.1', // Example public IP
            'X-Real-IP': '203.0.113.1'
          },
          // Ensure reasonable timeout
          timeout: Math.min(options.timeout || this.timeout, 30000),
          // Limit response size
          size: this.maxFileSize,
          // Limit redirects
          follow: 3,
          // Disable compression to prevent zip bombs
          compress: false
        };
        
        const response = await fetch(url, secureOptions);
        
        // Update metrics
        const responseTime = Date.now() - startTime;
        this.updateResponseTimeMetrics(responseTime);
        
        if (response.ok) {
          this.metrics.successfulRequests++;
        } else {
          this.metrics.failedRequests++;
        }
        
        return response;
      } catch (error) {
        console.warn(`⚠️ Fetch attempt ${i + 1}/${retries} failed for ${url}:`, error.message);
        
        if (i === retries - 1) {
          this.metrics.failedRequests++;
          throw error;
        }
        
        // Exponential backoff with jitter
        const delay = (1000 * Math.pow(2, i)) + (Math.random() * 1000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  /**
   * Update response time metrics
   */
  updateResponseTimeMetrics(responseTime) {
    const currentAvg = this.metrics.averageResponseTime;
    const totalRequests = this.metrics.totalRequests;
    
    this.metrics.averageResponseTime = 
      ((currentAvg * (totalRequests - 1)) + responseTime) / totalRequests;
  }

  /**
   * Enhanced image validation with security checks
   */
  async validateImage(imageUrl) {
    try {
      // First validate the URL itself
      if (!this.validateUrl(imageUrl)) {
        return false;
      }
      
      const response = await this.fetchWithRetry(imageUrl, { 
        method: 'HEAD',
        timeout: 8000,
        headers: { 
          'User-Agent': this.userAgent,
          'Accept': 'image/*'
        }
      }, 2); // Only 2 retries for image validation
      
      const contentType = response.headers.get('content-type') || '';
      const contentLength = response.headers.get('content-length');
      const contentSize = contentLength ? parseInt(contentLength) : 0;
      
      // Validate image properties
      const isValidImage = response.ok && 
                          contentType.startsWith('image/') && 
                          contentSize > 0 &&
                          contentSize < 10 * 1024 * 1024; // 10MB limit
      
      // Check for common image formats
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      const isAllowedType = allowedTypes.some(type => contentType.includes(type));
      
      return isValidImage && isAllowedType;
    } catch (error) {
      console.warn(`⚠️ Image validation failed for ${imageUrl}:`, error.message);
      return false;
    }
  }
  
  /**
   * Get comprehensive service metrics
   */
  getMetrics() {
    const successRate = this.metrics.totalRequests > 0 
      ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
      : 0;
    
    return {
      ...this.metrics,
      successRate: parseFloat(successRate.toFixed(2)),
      rateLimitedDomains: this.rateLimits.size,
      blockedDomains: this.blockedDomains.size,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
  }
  
  /**
   * Reset metrics (for testing or monitoring)
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      averageResponseTime: 0
    };
    
    console.log('🔄 Link preview service metrics reset');
  }

  isValidImageSrc(src) {
    if (!src || src.length < 4) return false;
    if (src.startsWith('data:')) return true;
    if (src.includes('placeholder') || src.includes('loading') || src.includes('spinner')) return false;
    return /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(src) || src.startsWith('http');
  }

  generateFallbackImage(domain) {
    if (!domain) return null;
    return `https://logo.clearbit.com/${domain}?size=400&format=png`;
  }

  extractArticleExcerpt(document) {
    const selectors = [
      '.excerpt',
      '.summary',
      '.lead',
      '.article-summary',
      'meta[name="description"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const content = selector.startsWith('meta') ? 
          element.getAttribute('content') : element.textContent;
        if (content && content.trim().length > 20) {
          return content.trim().substring(0, 300) + '...';
        }
      }
    }
    return null;
  }

  extractAuthorFromStructuredData(document) {
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent);
        if (data.author) {
          if (typeof data.author === 'string') return data.author;
          if (data.author.name) return data.author.name;
        }
      } catch (e) {
        continue;
      }
    }
    return null;
  }

  // Reuse existing methods from original service
  getMetaContent(document, property) {
    const meta = document.querySelector(`meta[property="${property}"]`) ||
                document.querySelector(`meta[name="${property}"]`);
    return meta?.getAttribute('content')?.trim() || null;
  }

  extractFirstParagraph(document) {
    const paragraph = document.querySelector('p');
    if (paragraph) {
      const text = paragraph.textContent?.trim();
      return text && text.length > 20 ? text.substring(0, 200) + '...' : text;
    }
    return null;
  }

  getFirstImage(document, baseUrl) {
    const img = document.querySelector('img[src]');
    if (img) {
      const src = img.getAttribute('src');
      return this.resolveUrl(src, baseUrl);
    }
    return null;
  }

  detectVideoEmbed(document) {
    const videoSelectors = [
      'iframe[src*="youtube.com"]',
      'iframe[src*="vimeo.com"]',
      'iframe[src*="twitch.tv"]',
      'video source[src]',
      'video[src]'
    ];

    for (const selector of videoSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.getAttribute('src') || element.getAttribute('data-src');
      }
    }

    return null;
  }

  determineContentType(document, url) {
    // Check for video indicators
    if (this.getMetaContent(document, 'og:type') === 'video' ||
        url.includes('youtube.com') || url.includes('vimeo.com') ||
        document.querySelector('video, iframe[src*="youtube"], iframe[src*="vimeo"]')) {
      return 'video';
    }

    // Check for article indicators
    if (this.getMetaContent(document, 'og:type') === 'article' ||
        document.querySelector('article, .post, .article')) {
      return 'article';
    }

    // Check for social media
    if (url.includes('twitter.com') || url.includes('facebook.com') ||
        url.includes('linkedin.com') || url.includes('instagram.com')) {
      return 'social';
    }

    return 'website';
  }

  /**
   * Enhanced content summary extraction from various content containers
   */
  extractContentSummary(document) {
    const contentSelectors = [
      'article p:first-of-type',
      '.content p:first-of-type',
      '.post-content p:first-of-type',
      '.entry-content p:first-of-type',
      '.article-body p:first-of-type',
      'main p:first-of-type',
      '[role="main"] p:first-of-type'
    ];
    
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim();
        if (text && text.length > 50) {
          return text.length > 300 ? text.substring(0, 297) + '...' : text;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Extract author from byline patterns
   */
  extractAuthorFromByline(document) {
    const bylineSelectors = [
      '.byline',
      '.author-name',
      '.post-author',
      '.article-author',
      '[class*="author"]',
      '[data-author]'
    ];
    
    for (const selector of bylineSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim();
        if (text && text.length < 100) {
          return text.replace(/^by\s+/i, '');
        }
      }
    }
    
    return null;
  }
  
  /**
   * Extract publication date from structured data or content
   */
  extractDateFromStructuredData(document) {
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent);
        if (data.datePublished) return data.datePublished;
        if (data.publishedAt) return data.publishedAt;
        if (data.dateCreated) return data.dateCreated;
      } catch (e) {
        continue;
      }
    }
    
    return null;
  }
  
  /**
   * Extract date from content patterns
   */
  extractDateFromContent(document) {
    const timeElement = document.querySelector('time[datetime]');
    if (timeElement) {
      return timeElement.getAttribute('datetime');
    }
    
    const dateSelectors = [
      '.published-date',
      '.post-date',
      '.article-date',
      '.date'
    ];
    
    for (const selector of dateSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim();
        if (text && this.isValidDateString(text)) {
          return text;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Extract site name from title patterns
   */
  extractSiteNameFromTitle(document) {
    const title = document.querySelector('title')?.textContent;
    if (title) {
      // Look for patterns like "Title | Site Name" or "Title - Site Name"
      const separators = [' | ', ' - ', ' :: ', ' » '];
      for (const sep of separators) {
        if (title.includes(sep)) {
          const parts = title.split(sep);
          if (parts.length >= 2) {
            return parts[parts.length - 1].trim();
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Extract keywords from meta tags and content
   */
  extractKeywords(document) {
    const keywords = [];
    
    // From meta keywords
    const metaKeywords = this.getMetaContent(document, 'keywords');
    if (metaKeywords) {
      keywords.push(...metaKeywords.split(',').map(k => k.trim()));
    }
    
    // From article:tag meta tags
    const articleTags = document.querySelectorAll('meta[property="article:tag"]');
    articleTags.forEach(tag => {
      const content = tag.getAttribute('content');
      if (content) keywords.push(content.trim());
    });
    
    // From hashtags in content
    const contentText = document.body?.textContent || '';
    const hashtags = contentText.match(/#\w+/g);
    if (hashtags) {
      keywords.push(...hashtags.map(h => h.substring(1)));
    }
    
    return [...new Set(keywords)].slice(0, 10); // Remove duplicates and limit
  }
  
  /**
   * Extract language information
   */
  extractLanguage(document) {
    return document.documentElement?.getAttribute('lang') ||
           this.getMetaContent(document, 'language') ||
           this.getMetaContent(document, 'content-language') ||
           null;
  }
  
  /**
   * Extract canonical URL
   */
  extractCanonical(document, fallbackUrl) {
    const canonicalLink = document.querySelector('link[rel="canonical"][href]');
    if (canonicalLink) {
      const href = canonicalLink.getAttribute('href');
      return this.resolveUrl(href, fallbackUrl);
    }
    
    return this.getMetaContent(document, 'og:url') || fallbackUrl;
  }
  
  /**
   * Validate if a string looks like a date
   */
  isValidDateString(str) {
    // Check for common date patterns
    const datePatterns = [
      /\d{4}-\d{2}-\d{2}/, // ISO format
      /\d{1,2}\/\d{1,2}\/\d{4}/, // US format
      /\d{1,2}-\d{1,2}-\d{4}/, // European format
      /\w+ \d{1,2}, \d{4}/ // "January 1, 2024"
    ];
    
    return datePatterns.some(pattern => pattern.test(str));
  }
  
  /**
   * Clean text content removing extra whitespace and special characters
   */
  cleanText(text, maxLength = 500) {
    if (!text) return null;
    
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[\r\n\t]/g, ' ') // Remove line breaks and tabs
      .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '') // Remove non-printable characters
      .trim()
      .substring(0, maxLength);
  }
  
  /**
   * Enhanced preview data cleaning and validation
   */
  cleanPreviewData(preview) {
    // Clean and limit text fields
    if (preview.title) {
      preview.title = this.cleanText(preview.title, 200);
    }
    if (preview.description) {
      preview.description = this.cleanText(preview.description, 500);
    }
    if (preview.author) {
      preview.author = this.cleanText(preview.author, 100);
    }
    if (preview.site_name) {
      preview.site_name = this.cleanText(preview.site_name, 100);
    }

    // Validate URLs
    preview.image = this.validateImageUrl(preview.image);
    preview.video = this.validateVideoUrl(preview.video);
    preview.favicon = this.validateImageUrl(preview.favicon);
    preview.canonical = this.validateUrl(preview.canonical);

    // Validate and clean keywords
    if (Array.isArray(preview.keywords)) {
      preview.keywords = preview.keywords
        .filter(keyword => keyword && typeof keyword === 'string')
        .map(keyword => this.cleanText(keyword, 50))
        .filter(Boolean)
        .slice(0, 10);
    }

    return preview;
  }

  /**
   * Enhanced URL validation with security checks
   */
  validateUrl(url) {
    try {
      const urlObj = new URL(url);
      
      // Only allow HTTP/HTTPS protocols
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        console.warn(`⚠️ Blocked non-HTTP protocol: ${urlObj.protocol}`);
        return null;
      }
      
      // Check against blocked domains
      const hostname = urlObj.hostname.toLowerCase();
      if (this.blockedDomains.has(hostname)) {
        console.warn(`⚠️ Blocked domain: ${hostname}`);
        return null;
      }
      
      // Block private IP ranges (SSRF protection)
      if (this.isPrivateIP(hostname)) {
        console.warn(`⚠️ Blocked private IP: ${hostname}`);
        return null;
      }
      
      // Block suspicious patterns
      if (this.containsSuspiciousPatterns(url)) {
        console.warn(`⚠️ Blocked suspicious URL pattern: ${url}`);
        return null;
      }
      
      return urlObj.href;
    } catch (error) {
      console.warn(`⚠️ Invalid URL format: ${url}`);
      return null;
    }
  }
  
  /**
   * Check if hostname is a private IP address
   */
  isPrivateIP(hostname) {
    // IPv4 private ranges
    const privateIPv4Patterns = [
      /^127\./,                    // 127.0.0.0/8 (localhost)
      /^10\./,                     // 10.0.0.0/8
      /^192\.168\./,               // 192.168.0.0/16
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./  // 172.16.0.0/12
    ];
    
    // Check for localhost variants
    if (hostname === 'localhost' || hostname === '0.0.0.0') {
      return true;
    }
    
    // Check IPv4 private ranges
    if (privateIPv4Patterns.some(pattern => pattern.test(hostname))) {
      return true;
    }
    
    // Check for IPv6 localhost
    if (hostname === '::1' || hostname.startsWith('[::1]')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Check for suspicious URL patterns
   */
  containsSuspiciousPatterns(url) {
    const suspiciousPatterns = [
      /javascript:/i,
      /data:/i,
      /file:/i,
      /ftp:/i,
      /vbscript:/i,
      /@localhost/i,
      /@127\.0\.0\.1/i,
      /\?.*redirect.*=/i,
      /\?.*url.*=/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(url));
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
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      return urlObj.href;
    } catch {
      return null;
    }
  }

  resolveUrl(url, baseUrl) {
    if (!url) return null;
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return null;
    }
  }

  extractDomainFromUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'Unknown Website';
    }
  }

  extractFilenameFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
      return filename || urlObj.hostname;
    } catch {
      return 'File';
    }
  }

  handleNonHtmlContent(url, contentType, response) {
    const preview = {
      title: this.extractFilenameFromUrl(url),
      description: `${contentType} file`,
      image: null,
      video: null,
      type: 'file'
    };

    if (contentType.startsWith('image/')) {
      preview.type = 'image';
      preview.image = url;
      preview.description = 'Image file';
    } else if (contentType.startsWith('video/')) {
      preview.type = 'video';
      preview.video = url;
      preview.description = 'Video file';
    }

    return preview;
  }

  /**
   * Flow Nexus Handler - Site-Specific Implementation
   * Handles Flow Nexus platform with specialized content extraction
   */
  async handleFlowNexus(url, urlObj) {
    try {
      console.log('🌊 Processing Flow Nexus URL:', url);
      
      // Analyze Flow Nexus URL structure
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const contentType = this.detectFlowNexusContentType(pathParts);
      
      // Fetch content with Flow Nexus-specific headers
      const response = await this.fetchWithRetry(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FlowNexusBot/1.0; +https://flownexus.io/bot)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://flownexus.io/',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 12000
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      return this.parseFlowNexusContent(html, url, contentType);
      
    } catch (error) {
      console.error('❌ Flow Nexus handler error:', error.message);
      return this.generateFlowNexusFallback(url, urlObj);
    }
  }
  
  /**
   * Detect Flow Nexus content type from URL structure
   */
  detectFlowNexusContentType(pathParts) {
    if (!pathParts.length) return 'home';
    
    const contentTypeMap = {
      'flows': 'flow',
      'agents': 'agent',
      'workflows': 'workflow',
      'docs': 'documentation',
      'api': 'api-reference',
      'blog': 'article',
      'tutorials': 'tutorial',
      'examples': 'example'
    };
    
    return contentTypeMap[pathParts[0]] || 'page';
  }
  
  /**
   * Parse Flow Nexus content with specialized selectors
   */
  parseFlowNexusContent(html, url, contentType) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Flow Nexus-specific title extraction
    const title = this.getMetaContent(document, 'og:title') ||
                 document.querySelector('.flow-title')?.textContent?.trim() ||
                 document.querySelector('.nexus-header h1')?.textContent?.trim() ||
                 document.querySelector('h1')?.textContent?.trim() ||
                 'Flow Nexus Content';
    
    // Flow Nexus-specific description extraction
    const description = this.getMetaContent(document, 'og:description') ||
                       document.querySelector('.flow-description')?.textContent?.trim() ||
                       document.querySelector('.nexus-summary')?.textContent?.trim() ||
                       this.extractFirstParagraph(document) ||
                       `${this.capitalize(contentType)} content on Flow Nexus platform`;
    
    // Flow Nexus-specific image extraction
    const image = this.getMetaContent(document, 'og:image') ||
                 document.querySelector('.flow-preview img')?.getAttribute('src') ||
                 document.querySelector('.nexus-banner img')?.getAttribute('src') ||
                 'https://flownexus.io/assets/og-image.png';
    
    // Extract Flow Nexus-specific metadata
    const author = document.querySelector('.flow-author')?.textContent?.trim() ||
                  document.querySelector('.created-by')?.textContent?.trim() ||
                  'Flow Nexus';
    
    const tags = this.extractFlowNexusTags(document);
    const complexity = document.querySelector('.complexity-level')?.textContent?.trim();
    const category = document.querySelector('.flow-category')?.textContent?.trim();
    
    return {
      title: this.cleanText(title),
      description: this.cleanText(description, 300),
      image: this.resolveUrl(image, url),
      type: this.mapFlowNexusType(contentType),
      site_name: 'Flow Nexus',
      author,
      favicon: 'https://flownexus.io/favicon.ico',
      contentType,
      tags,
      complexity,
      category,
      keywords: tags
    };
  }
  
  /**
   * Extract Flow Nexus-specific tags
   */
  extractFlowNexusTags(document) {
    const tags = [];
    
    // From tag containers
    document.querySelectorAll('.flow-tags .tag, .nexus-labels .label').forEach(tag => {
      const text = tag.textContent?.trim();
      if (text) tags.push(text);
    });
    
    // From data attributes
    const tagsAttr = document.querySelector('[data-tags]')?.getAttribute('data-tags');
    if (tagsAttr) {
      tags.push(...tagsAttr.split(',').map(t => t.trim()));
    }
    
    return [...new Set(tags)].slice(0, 8); // Remove duplicates and limit
  }
  
  /**
   * Map Flow Nexus content types to standard types
   */
  mapFlowNexusType(contentType) {
    const typeMap = {
      'flow': 'application',
      'agent': 'profile',
      'workflow': 'application',
      'documentation': 'article',
      'tutorial': 'article',
      'example': 'website'
    };
    
    return typeMap[contentType] || 'website';
  }
  
  /**
   * Generate Flow Nexus fallback
   */
  generateFlowNexusFallback(url, urlObj) {
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    const contentType = this.detectFlowNexusContentType(pathParts);
    
    return {
      title: `Flow Nexus ${this.capitalize(contentType)}`,
      description: `${this.capitalize(contentType)} content on the Flow Nexus platform for AI workflow automation`,
      image: 'https://flownexus.io/assets/og-image.png',
      type: this.mapFlowNexusType(contentType),
      site_name: 'Flow Nexus',
      favicon: 'https://flownexus.io/favicon.ico',
      contentType,
      error: 'Unable to access Flow Nexus content',
      fallback: true
    };
  }
  
  /**
   * Capitalize first letter of string
   */
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
  
  /**
   * Clear expired cache with enhanced cleanup
   */
  async clearExpiredCache() {
    try {
      const result = await databaseService.db.db.prepare(`
        DELETE FROM link_preview_cache 
        WHERE datetime(cached_at) < datetime('now', '-7 days')
      `).run();
      
      // Also clear in-memory rate limits that are old
      const now = Date.now();
      for (const [domain, limit] of this.rateLimits.entries()) {
        if (now > limit.resetTime) {
          this.rateLimits.delete(domain);
        }
      }
      
      console.log(`🗑️ Cleared ${result.changes} expired link preview cache entries`);
      console.log(`🗑️ Cleared ${this.rateLimits.size} expired rate limit entries`);
      return result.changes;
    } catch (error) {
      console.error('❌ Error clearing expired cache:', error);
      return 0;
    }
  }
  
  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats() {
    try {
      const stats = await databaseService.db.db.prepare(`
        SELECT 
          COUNT(*) as total_entries,
          COUNT(CASE WHEN datetime(cached_at) > datetime('now', '-1 hour') THEN 1 END) as recent_entries,
          COUNT(CASE WHEN datetime(cached_at) < datetime('now', '-7 days') THEN 1 END) as expired_entries
        FROM link_preview_cache
      `).get();
      
      return {
        ...stats,
        rate_limit_domains: this.rateLimits.size,
        memory_usage: process.memoryUsage().heapUsed / 1024 / 1024 // MB
      };
    } catch (error) {
      console.error('❌ Error getting cache stats:', error);
      return null;
    }
  }
}

/**
 * Comprehensive error handling and logging middleware
 */
class LinkPreviewLogger {
  static logPreviewAttempt(url, method) {
    console.log(`🔍 [${new Date().toISOString()}] Attempting ${method} preview for: ${url}`);
  }
  
  static logPreviewSuccess(url, method, processingTime) {
    console.log(`✅ [${new Date().toISOString()}] ${method} preview successful for: ${url} (${processingTime}ms)`);
  }
  
  static logPreviewError(url, method, error, fallback = false) {
    const level = fallback ? 'WARN' : 'ERROR';
    console.error(`${fallback ? '⚠️' : '❌'} [${new Date().toISOString()}] [${level}] ${method} preview failed for: ${url} - ${error}`);
  }
  
  static logRateLimit(domain, requestCount) {
    console.warn(`🚫 [${new Date().toISOString()}] Rate limit hit for domain: ${domain} (${requestCount} requests)`);
  }
  
  static logCacheOperation(operation, url, success = true) {
    const icon = success ? '💾' : '⚠️';
    console.log(`${icon} [${new Date().toISOString()}] Cache ${operation} for: ${url}`);
  }
}

// Create enhanced instance with comprehensive monitoring
const enhancedLinkPreviewService = new EnhancedLinkPreviewService();

// Add logging middleware
const originalGetLinkPreview = enhancedLinkPreviewService.getLinkPreview.bind(enhancedLinkPreviewService);
enhancedLinkPreviewService.getLinkPreview = async function(url) {
  const startTime = Date.now();
  LinkPreviewLogger.logPreviewAttempt(url, 'Enhanced');
  
  try {
    const result = await originalGetLinkPreview(url);
    const processingTime = Date.now() - startTime;
    
    if (result.error) {
      LinkPreviewLogger.logPreviewError(url, 'Enhanced', result.error, true);
    } else {
      LinkPreviewLogger.logPreviewSuccess(url, 'Enhanced', processingTime);
    }
    
    return result;
  } catch (error) {
    LinkPreviewLogger.logPreviewError(url, 'Enhanced', error.message, false);
    throw error;
  }
};

// Export the enhanced service
export { enhancedLinkPreviewService, LinkPreviewLogger };
export default enhancedLinkPreviewService;