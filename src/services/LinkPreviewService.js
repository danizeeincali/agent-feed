/**
 * Link Preview Service
 * Fetches and caches webpage metadata for link previews
 */

import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { databaseService } from '../database/DatabaseService.js';

/**
 * YouTube metadata service for extracting real video information
 */
class YouTubeMetadataService {
  constructor() {
    this.oembedEndpoint = 'https://www.youtube.com/oembed';
    this.cache = new Map();
    this.maxCacheSize = 100;
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
    this.userAgent = 'Mozilla/5.0 (compatible; AgentFeed LinkPreview/1.0)';
  }

  /**
   * Extract YouTube video ID from URL
   */
  extractVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * Get YouTube metadata using oEmbed API (Enhanced)
   */
  async getYouTubeMetadata(url) {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    // Check cache first
    const cacheKey = videoId;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      console.log(`📺 Using cached YouTube metadata for: ${videoId}`);
      return cached.data;
    }

    try {
      // Use YouTube oEmbed API with better parameters
      const oembedUrl = `${this.oembedEndpoint}?url=${encodeURIComponent(url)}&format=json&maxwidth=1280&maxheight=720`;
      
      const response = await fetch(oembedUrl, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`YouTube oEmbed API error: ${response.status}`);
      }

      const oembedData = await response.json();
      
      // Extract metadata from oEmbed response
      const metadata = {
        title: oembedData.title || `YouTube Video ${videoId}`,
        description: this.generateVideoDescription(oembedData),
        author: oembedData.author_name || 'YouTube Creator',
        channelUrl: oembedData.author_url,
        thumbnail: oembedData.thumbnail_url,
        thumbnailWidth: oembedData.thumbnail_width,
        thumbnailHeight: oembedData.thumbnail_height,
        duration: this.parseDuration(oembedData.duration),
        videoId,
        site_name: oembedData.provider_name || 'YouTube',
        type: 'video',
        html: oembedData.html
      };

      // Cache the result
      this.cacheMetadata(cacheKey, metadata);
      
      console.log(`📺 Fetched YouTube metadata for: ${metadata.title}`);
      return metadata;
      
    } catch (error) {
      console.warn('YouTube oEmbed API failed, using fallback:', error.message);
      
      // Fallback to enhanced scraping
      return this.getYouTubeFallbackMetadata(url, videoId);
    }
  }

  /**
   * Generate meaningful video description from oEmbed data
   */
  generateVideoDescription(oembedData) {
    const parts = [];
    
    if (oembedData.author_name) {
      parts.push(`Video by ${oembedData.author_name}`);
    }
    
    if (oembedData.width && oembedData.height) {
      parts.push(`${oembedData.width}x${oembedData.height}`);
    }
    
    return parts.length > 0 
      ? parts.join(' • ') 
      : 'Watch this video on YouTube';
  }

  /**
   * Parse duration from various formats
   */
  parseDuration(duration) {
    if (!duration) return null;
    
    // Handle ISO 8601 format (PT1H2M3S)
    if (typeof duration === 'string' && duration.startsWith('PT')) {
      const matches = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (matches) {
        const hours = parseInt(matches[1] || '0');
        const minutes = parseInt(matches[2] || '0');
        const seconds = parseInt(matches[3] || '0');
        return hours * 3600 + minutes * 60 + seconds;
      }
    }
    
    // Handle numeric seconds
    if (typeof duration === 'number') {
      return duration;
    }
    
    return null;
  }

  /**
   * Fallback metadata extraction when oEmbed fails
   */
  async getYouTubeFallbackMetadata(url, videoId) {
    return {
      title: `YouTube Video`,
      description: 'Video content from YouTube',
      author: 'YouTube Creator',
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      videoId,
      site_name: 'YouTube',
      type: 'video',
      fallback: true
    };
  }

  /**
   * Cache metadata with size limit
   */
  cacheMetadata(key, data) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache() {
    const now = Date.now();
    let cleared = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheExpiry) {
        this.cache.delete(key);
        cleared++;
      }
    }
    
    if (cleared > 0) {
      console.log(`🗑️ Cleared ${cleared} expired YouTube metadata cache entries`);
    }
    
    return cleared;
  }
}

class LinkPreviewService {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (compatible; AgentFeed LinkPreview/1.0)';
    this.youtubeService = new YouTubeMetadataService();
  }

  /**
   * Get link preview with caching
   */
  async getLinkPreview(url) {
    try {
      // Validate URL
      const validUrl = this.validateUrl(url);
      if (!validUrl) {
        throw new Error('Invalid URL provided');
      }

      // Handle YouTube URLs specially
      if (this.isYouTubeUrl(validUrl)) {
        return await this.getYouTubePreview(validUrl);
      }

      // Check cache first for non-YouTube URLs
      const cached = await databaseService.db.getCachedLinkPreview(validUrl);
      if (cached) {
        console.log(`📋 Using cached preview for: ${validUrl}`);
        return cached;
      }

      // Fetch fresh preview
      console.log(`🔗 Fetching preview for: ${validUrl}`);
      const preview = await this.fetchLinkPreview(validUrl);

      // Cache the result
      await databaseService.db.cacheLinkPreview(validUrl, preview);

      return preview;
    } catch (error) {
      console.error('Error getting link preview:', error);
      return {
        title: this.extractDomainFromUrl(url),
        description: 'Unable to fetch preview',
        image: null,
        video: null,
        type: 'website',
        error: error.message
      };
    }
  }

  /**
   * Check if URL is a YouTube URL
   */
  isYouTubeUrl(url) {
    return /(?:youtube\.com|youtu\.be)/.test(url);
  }

  /**
   * Get YouTube-specific preview with real metadata
   */
  async getYouTubePreview(url) {
    try {
      // Check cache first
      const cached = await databaseService.db.getCachedLinkPreview(url);
      if (cached && !cached.fallback) {
        console.log(`📺 Using cached YouTube preview for: ${url}`);
        return cached;
      }

      // Direct oEmbed API call (bypassing the failing youtubeService)
      const videoId = this.extractYouTubeVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json&maxwidth=1280&maxheight=720`;
      
      const response = await fetch(oembedUrl, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`YouTube oEmbed API error: ${response.status}`);
      }

      const oembedData = await response.json();
      
      const metadata = {
        title: oembedData.title || 'YouTube Video',
        description: `Video by ${oembedData.author_name || 'Unknown'} on YouTube`,
        thumbnail: oembedData.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        author: oembedData.author_name,
        videoId: videoId,
        channelUrl: oembedData.author_url,
        fallback: false
      };
      
      const preview = {
        title: metadata.title,
        description: metadata.description,
        image: metadata.thumbnail,
        video: url,
        site_name: metadata.author, // Use channel name as site_name
        type: 'video',
        author: metadata.author,
        videoId: metadata.videoId,
        duration: metadata.duration,
        channelUrl: metadata.channelUrl,
        fallback: metadata.fallback || false
      };

      // Cache the result
      await databaseService.db.cacheLinkPreview(url, preview);
      
      console.log(`📺 Successfully fetched YouTube preview: ${preview.title}`);
      return preview;
      
    } catch (error) {
      console.error('Error getting YouTube preview:', error);
      
      // Return enhanced fallback for YouTube
      const videoId = this.extractYouTubeVideoId(url);
      return {
        title: 'YouTube Video',
        description: 'Unable to fetch video details',
        image: videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null,
        video: url,
        site_name: 'YouTube',
        type: 'video',
        videoId,
        error: error.message,
        fallback: true
      };
    }
  }

  /**
   * Extract YouTube video ID from URL
   */
  extractYouTubeVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * Fetch link preview from URL
   */
  async fetchLinkPreview(url) {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 15000,
      follow: 5,
      size: 5 * 1024 * 1024 // 5MB limit for large websites
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      // Handle non-HTML content types
      return this.handleNonHtmlContent(url, contentType, response);
    }

    const html = await response.text();
    return this.parseHtmlPreview(html, url);
  }

  /**
   * Parse HTML for preview data
   */
  parseHtmlPreview(html, url) {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const preview = {
      title: null,
      description: null,
      image: null,
      video: null,
      type: 'website'
    };

    // Extract title (priority: og:title, twitter:title, title tag)
    preview.title = this.getMetaContent(document, 'og:title') ||
                   this.getMetaContent(document, 'twitter:title') ||
                   document.querySelector('title')?.textContent?.trim() ||
                   this.extractDomainFromUrl(url);

    // Extract description (priority: og:description, twitter:description, meta description)
    preview.description = this.getMetaContent(document, 'og:description') ||
                         this.getMetaContent(document, 'twitter:description') ||
                         this.getMetaContent(document, 'description') ||
                         this.extractFirstParagraph(document);

    // Extract image (priority: og:image, twitter:image, first img tag)
    preview.image = this.getMetaContent(document, 'og:image') ||
                   this.getMetaContent(document, 'twitter:image') ||
                   this.getFirstImage(document, url);

    // Extract video
    preview.video = this.getMetaContent(document, 'og:video') ||
                   this.getMetaContent(document, 'twitter:player') ||
                   this.detectVideoEmbed(document);

    // Determine content type
    preview.type = this.determineContentType(document, url);

    // Clean and validate data
    return this.cleanPreviewData(preview);
  }

  /**
   * Handle non-HTML content (images, videos, etc.)
   */
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
   * Get meta content by property or name
   */
  getMetaContent(document, property) {
    const meta = document.querySelector(`meta[property="${property}"]`) ||
                document.querySelector(`meta[name="${property}"]`);
    return meta?.getAttribute('content')?.trim() || null;
  }

  /**
   * Extract first paragraph text
   */
  extractFirstParagraph(document) {
    const paragraph = document.querySelector('p');
    if (paragraph) {
      const text = paragraph.textContent?.trim();
      return text && text.length > 20 ? text.substring(0, 200) + '...' : text;
    }
    return null;
  }

  /**
   * Get first image from document
   */
  getFirstImage(document, baseUrl) {
    const img = document.querySelector('img[src]');
    if (img) {
      const src = img.getAttribute('src');
      return this.resolveUrl(src, baseUrl);
    }
    return null;
  }

  /**
   * Detect video embeds
   */
  detectVideoEmbed(document) {
    // Check for common video embed patterns
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

  /**
   * Enhanced YouTube metadata extraction
   */
  async extractYouTubeMetadata(url) {
    const videoId = this.extractYouTubeId(url);
    if (!videoId) return null;

    try {
      // Try YouTube oEmbed API (no API key required)
      const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await fetch(oEmbedUrl, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 5000
      });

      if (response.ok) {
        const data = await response.json();
        return {
          title: data.title || 'YouTube Video',
          description: `By ${data.author_name || 'YouTube'}`,
          image: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          video: `https://www.youtube.com/watch?v=${videoId}`,
          type: 'video'
        };
      }
    } catch (error) {
      console.warn('YouTube oEmbed API failed:', error);
    }

    // Fallback to basic YouTube data
    return {
      title: `YouTube Video ${videoId}`,
      description: 'Video hosted on YouTube',
      image: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      video: `https://www.youtube.com/watch?v=${videoId}`,
      type: 'video'
    };
  }

  /**
   * Extract YouTube video ID from URL
   */
  extractYouTubeId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        const videoId = match[1];
        if (/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
          return videoId;
        }
      }
    }
    
    return null;
  }

  /**
   * Determine content type based on page analysis
   */
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
   * Clean and validate preview data
   */
  cleanPreviewData(preview) {
    // Trim and limit text fields
    if (preview.title) {
      preview.title = preview.title.substring(0, 200).trim();
    }
    if (preview.description) {
      preview.description = preview.description.substring(0, 500).trim();
    }

    // Validate URLs
    preview.image = this.validateImageUrl(preview.image);
    preview.video = this.validateVideoUrl(preview.video);

    return preview;
  }

  /**
   * Validate URL format
   */
  validateUrl(url) {
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return null;
      }
      return urlObj.href;
    } catch {
      return null;
    }
  }

  /**
   * Validate image URL
   */
  validateImageUrl(url) {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      return urlObj.href;
    } catch {
      return null;
    }
  }

  /**
   * Validate video URL
   */
  validateVideoUrl(url) {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      return urlObj.href;
    } catch {
      return null;
    }
  }

  /**
   * Resolve relative URLs
   */
  resolveUrl(url, baseUrl) {
    if (!url) return null;
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return null;
    }
  }

  /**
   * Extract domain from URL
   */
  extractDomainFromUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'Unknown Website';
    }
  }

  /**
   * Extract filename from URL
   */
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

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache() {
    try {
      // Clear database cache
      const result = await databaseService.db.db.prepare(`
        DELETE FROM link_preview_cache 
        WHERE datetime(cached_at) < datetime('now', '-7 days')
      `).run();
      
      // Clear YouTube service in-memory cache
      const youtubeCacheCleared = this.youtubeService.clearExpiredCache();
      
      console.log(`🗑️ Cleared ${result.changes} expired link preview cache entries and ${youtubeCacheCleared} YouTube cache entries`);
      return result.changes + youtubeCacheCleared;
    } catch (error) {
      console.error('Error clearing expired cache:', error);
      return 0;
    }
  }
}

// Singleton instance
export const linkPreviewService = new LinkPreviewService();
export default linkPreviewService;