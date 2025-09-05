/**
 * Link Preview Service
 * Fetches and caches webpage metadata for link previews
 */

import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { databaseService } from '../database/DatabaseService.js';

class LinkPreviewService {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (compatible; AgentFeed LinkPreview/1.0)';
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

      // Check cache first
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
      timeout: 10000,
      follow: 3,
      size: 1024 * 1024 // 1MB limit
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
      const result = await databaseService.db.db.prepare(`
        DELETE FROM link_preview_cache 
        WHERE datetime(cached_at) < datetime('now', '-7 days')
      `).run();
      
      console.log(`🗑️ Cleared ${result.changes} expired link preview cache entries`);
      return result.changes;
    } catch (error) {
      console.error('Error clearing expired cache:', error);
      return 0;
    }
  }
}

// Singleton instance
export const linkPreviewService = new LinkPreviewService();
export default linkPreviewService;