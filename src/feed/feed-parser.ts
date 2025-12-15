/**
 * FeedParser - Parse RSS/Atom/JSON feeds
 * Phase 3A: Feed Monitoring
 * TDD Implementation
 */

import { XMLParser } from 'fast-xml-parser';
import type { ParsedFeed, ParsedFeedItem, FeedType } from '../types/feed';

export class FeedParser {
  private xmlParser: XMLParser;

  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
      trimValues: true,
    });
  }

  /**
   * Auto-detect feed type and parse
   */
  parse(content: string): ParsedFeed {
    const trimmed = content.trim();

    // Detect feed type
    if (trimmed.startsWith('{')) {
      return this.parseJSON(content);
    } else if (trimmed.includes('<rss')) {
      return this.parseRSS(content);
    } else if (trimmed.includes('<feed') || trimmed.includes('xmlns="http://www.w3.org/2005/Atom"')) {
      return this.parseAtom(content);
    } else {
      throw new Error('Unrecognized feed format');
    }
  }

  /**
   * Parse RSS 2.0 feed
   */
  parseRSS(xmlContent: string): ParsedFeed {
    try {
      const parsed = this.xmlParser.parse(xmlContent);

      if (!parsed.rss || !parsed.rss.channel) {
        throw new Error('Invalid RSS feed structure');
      }

      const channel = parsed.rss.channel;
      const rawItems = Array.isArray(channel.item) ? channel.item : (channel.item ? [channel.item] : []);

      const items: ParsedFeedItem[] = rawItems.map((item: any) => {
        const content = this.extractContent(item.description || item['content:encoded'] || '');
        const guid = item.guid?.['#text'] || item.guid || item.link || this.generateGuid(item);

        return {
          guid,
          title: this.sanitizeText(item.title || ''),
          content: this.sanitizeHtml(content),
          contentSnippet: this.createSnippet(content, 500),
          author: item.author || item['dc:creator'] || undefined,
          link: item.link || '',
          publishedAt: this.parseDate(item.pubDate || item['dc:date']),
        };
      });

      return {
        title: channel.title || '',
        items,
        type: 'rss' as FeedType,
      };
    } catch (error) {
      throw new Error(`Failed to parse RSS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse Atom 1.0 feed
   */
  parseAtom(xmlContent: string): ParsedFeed {
    try {
      const parsed = this.xmlParser.parse(xmlContent);

      if (!parsed.feed) {
        throw new Error('Invalid Atom feed structure');
      }

      const feed = parsed.feed;
      const rawEntries = Array.isArray(feed.entry) ? feed.entry : (feed.entry ? [feed.entry] : []);

      const items: ParsedFeedItem[] = rawEntries.map((entry: any) => {
        const content = this.extractContent(entry.content?.['#text'] || entry.content || entry.summary?.['#text'] || entry.summary || '');
        const link = this.extractAtomLink(entry.link);

        return {
          guid: entry.id || link || this.generateGuid(entry),
          title: this.sanitizeText(entry.title || ''),
          content: this.sanitizeHtml(content),
          contentSnippet: this.createSnippet(content, 500),
          author: entry.author?.name || feed.title,
          link: link || '',
          publishedAt: this.parseDate(entry.published || entry.updated),
        };
      });

      return {
        title: feed.title || '',
        items,
        type: 'atom' as FeedType,
      };
    } catch (error) {
      throw new Error(`Failed to parse Atom: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse JSON Feed
   */
  parseJSON(jsonContent: string): ParsedFeed {
    try {
      const feed = JSON.parse(jsonContent);

      if (!feed.items || !Array.isArray(feed.items)) {
        throw new Error('Invalid JSON Feed structure');
      }

      const items: ParsedFeedItem[] = feed.items.map((item: any) => {
        const content = item.content_html || item.content_text || '';

        return {
          guid: item.id || item.url || this.generateGuid(item),
          title: this.sanitizeText(item.title || ''),
          content: this.sanitizeHtml(content),
          contentSnippet: this.createSnippet(content, 500),
          author: item.author?.name || feed.title,
          link: item.url || '',
          publishedAt: this.parseDate(item.date_published || item.date_modified),
        };
      });

      return {
        title: feed.title || '',
        items,
        type: 'json' as FeedType,
      };
    } catch (error) {
      throw new Error(`Failed to parse JSON Feed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sanitize HTML content (remove XSS vectors)
   */
  sanitizeHtml(html: string): string {
    if (!html) return '';

    // Remove script tags
    let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove event handlers (onclick, onload, etc.)
    sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\son\w+\s*=\s*[^\s>]*/gi, '');

    // Remove javascript: protocol
    sanitized = sanitized.replace(/javascript:/gi, '');

    // Remove data: URLs (can be used for XSS)
    sanitized = sanitized.replace(/data:text\/html/gi, '');

    return sanitized.trim();
  }

  /**
   * Create plain text snippet from HTML
   */
  createSnippet(html: string, maxLength: number): string {
    if (!html) return '';

    // Strip all HTML tags
    let text = html.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    text = this.decodeHtmlEntities(text);

    // Trim whitespace
    text = text.replace(/\s+/g, ' ').trim();

    // Truncate if needed (ensure we don't exceed maxLength including '...')
    if (text.length > maxLength) {
      text = text.substring(0, maxLength - 3) + '...';
    }

    return text;
  }

  /**
   * Sanitize plain text (remove control characters)
   */
  private sanitizeText(text: string): string {
    if (!text) return '';

    // Remove control characters except newlines and tabs
    return text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '').trim();
  }

  /**
   * Extract content from CDATA or plain text
   */
  private extractContent(value: any): string {
    if (typeof value === 'string') {
      return value;
    }

    if (value && typeof value === 'object') {
      return value['#text'] || value.toString();
    }

    return '';
  }

  /**
   * Extract link from Atom entry
   */
  private extractAtomLink(link: any): string {
    if (!link) return '';

    if (typeof link === 'string') {
      return link;
    }

    if (Array.isArray(link)) {
      // Prefer alternate link, fallback to first link
      const alternateLink = link.find((l: any) => l['@_rel'] === 'alternate' || !l['@_rel']);
      return alternateLink?.['@_href'] || link[0]?.['@_href'] || '';
    }

    if (typeof link === 'object') {
      return link['@_href'] || '';
    }

    return '';
  }

  /**
   * Parse various date formats
   */
  private parseDate(dateString: any): Date | undefined {
    if (!dateString) return undefined;

    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  }

  /**
   * Generate unique GUID for item
   */
  private generateGuid(item: any): string {
    const str = JSON.stringify(item);
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return `generated-${hash}`;
  }

  /**
   * Decode HTML entities
   */
  private decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'",
      '&nbsp;': ' ',
    };

    return text.replace(/&[#\w]+;/g, (entity) => {
      return entities[entity] || entity;
    });
  }
}
