/**
 * FeedParser Unit Tests
 * Phase 3A: Feed Monitoring
 * TDD London School - Test First!
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { FeedParser } from '../../../src/feed/feed-parser';
import type { ParsedFeedItem } from '../../../src/types/feed';

describe('FeedParser - TDD London School', () => {
  let parser: FeedParser;

  beforeEach(() => {
    parser = new FeedParser();
  });

  describe('RSS 2.0 Parsing', () => {
    it('should parse valid RSS 2.0 feed', () => {
      const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <link>https://example.com</link>
    <description>Test Description</description>
    <item>
      <title>Test Article</title>
      <link>https://example.com/article1</link>
      <description>Article content here</description>
      <pubDate>Wed, 10 Oct 2025 12:00:00 GMT</pubDate>
      <guid>https://example.com/article1</guid>
      <author>John Doe</author>
    </item>
  </channel>
</rss>`;

      const result = parser.parseRSS(rssXml);

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Test Article');
      expect(result.items[0].link).toBe('https://example.com/article1');
      expect(result.items[0].guid).toBe('https://example.com/article1');
      expect(result.items[0].author).toBe('John Doe');
    });

    it('should handle RSS without GUID by using link', () => {
      const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test</title>
    <item>
      <title>Article</title>
      <link>https://example.com/article2</link>
      <description>Content</description>
    </item>
  </channel>
</rss>`;

      const result = parser.parseRSS(rssXml);

      expect(result.items[0].guid).toBe('https://example.com/article2');
    });

    it('should sanitize HTML in content', () => {
      const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test</title>
    <item>
      <title>Article</title>
      <description><![CDATA[<p>Content with <script>alert('xss')</script> tags</p>]]></description>
      <link>https://example.com/article3</link>
    </item>
  </channel>
</rss>`;

      const result = parser.parseRSS(rssXml);

      expect(result.items[0].content).not.toContain('<script>');
      expect(result.items[0].content).toContain('Content with');
    });

    it('should create content snippet from full content', () => {
      const longContent = 'A'.repeat(1000);
      const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test</title>
    <item>
      <title>Article</title>
      <description>${longContent}</description>
      <link>https://example.com/article4</link>
    </item>
  </channel>
</rss>`;

      const result = parser.parseRSS(rssXml);

      expect(result.items[0].contentSnippet).toBeDefined();
      expect(result.items[0].contentSnippet!.length).toBeLessThanOrEqual(500);
    });

    it('should parse pubDate to Date object', () => {
      const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test</title>
    <item>
      <title>Article</title>
      <link>https://example.com/article5</link>
      <pubDate>Wed, 10 Oct 2025 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

      const result = parser.parseRSS(rssXml);

      expect(result.items[0].publishedAt).toBeInstanceOf(Date);
      expect(result.items[0].publishedAt?.getFullYear()).toBe(2025);
    });

    it('should handle multiple items', () => {
      const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test</title>
    <item>
      <title>Article 1</title>
      <link>https://example.com/1</link>
    </item>
    <item>
      <title>Article 2</title>
      <link>https://example.com/2</link>
    </item>
    <item>
      <title>Article 3</title>
      <link>https://example.com/3</link>
    </item>
  </channel>
</rss>`;

      const result = parser.parseRSS(rssXml);

      expect(result.items).toHaveLength(3);
      expect(result.items[0].title).toBe('Article 1');
      expect(result.items[1].title).toBe('Article 2');
      expect(result.items[2].title).toBe('Article 3');
    });

    it('should throw error on invalid XML', () => {
      const invalidXml = 'not xml content';

      expect(() => parser.parseRSS(invalidXml)).toThrow();
    });

    it('should handle missing optional fields gracefully', () => {
      const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test</title>
    <item>
      <title>Minimal Article</title>
      <link>https://example.com/minimal</link>
    </item>
  </channel>
</rss>`;

      const result = parser.parseRSS(rssXml);

      expect(result.items[0].title).toBe('Minimal Article');
      expect(result.items[0].content).toBe('');
      expect(result.items[0].author).toBeUndefined();
    });
  });

  describe('Atom 1.0 Parsing', () => {
    it('should parse valid Atom feed', () => {
      const atomXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test Atom Feed</title>
  <link href="https://example.com"/>
  <entry>
    <id>https://example.com/entry1</id>
    <title>Test Entry</title>
    <link href="https://example.com/entry1"/>
    <content>Entry content here</content>
    <published>2025-10-10T12:00:00Z</published>
    <author>
      <name>Jane Doe</name>
    </author>
  </entry>
</feed>`;

      const result = parser.parseAtom(atomXml);

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Test Entry');
      expect(result.items[0].link).toBe('https://example.com/entry1');
      expect(result.items[0].guid).toBe('https://example.com/entry1');
      expect(result.items[0].author).toBe('Jane Doe');
    });

    it('should handle Atom with summary instead of content', () => {
      const atomXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test</title>
  <entry>
    <id>tag:example.com,2025:entry1</id>
    <title>Entry</title>
    <link href="https://example.com/entry1"/>
    <summary>Summary text</summary>
  </entry>
</feed>`;

      const result = parser.parseAtom(atomXml);

      expect(result.items[0].content).toBe('Summary text');
    });

    it('should parse Atom dates', () => {
      const atomXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test</title>
  <entry>
    <id>1</id>
    <title>Entry</title>
    <published>2025-10-10T12:00:00Z</published>
  </entry>
</feed>`;

      const result = parser.parseAtom(atomXml);

      expect(result.items[0].publishedAt).toBeInstanceOf(Date);
    });

    it('should use updated date if published is missing', () => {
      const atomXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test</title>
  <entry>
    <id>1</id>
    <title>Entry</title>
    <updated>2025-10-10T13:00:00Z</updated>
  </entry>
</feed>`;

      const result = parser.parseAtom(atomXml);

      expect(result.items[0].publishedAt).toBeInstanceOf(Date);
    });
  });

  describe('JSON Feed Parsing', () => {
    it('should parse valid JSON Feed', () => {
      const jsonFeed = JSON.stringify({
        version: 'https://jsonfeed.org/version/1.1',
        title: 'Test JSON Feed',
        home_page_url: 'https://example.com',
        items: [{
          id: 'item-1',
          url: 'https://example.com/item1',
          title: 'JSON Item',
          content_html: '<p>Content here</p>',
          date_published: '2025-10-10T12:00:00Z',
          author: {
            name: 'Bob Smith'
          }
        }]
      });

      const result = parser.parseJSON(jsonFeed);

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('JSON Item');
      expect(result.items[0].guid).toBe('item-1');
      expect(result.items[0].author).toBe('Bob Smith');
    });

    it('should use content_text if content_html is missing', () => {
      const jsonFeed = JSON.stringify({
        version: 'https://jsonfeed.org/version/1.1',
        title: 'Test',
        items: [{
          id: 'item-1',
          title: 'Item',
          content_text: 'Plain text content'
        }]
      });

      const result = parser.parseJSON(jsonFeed);

      expect(result.items[0].content).toBe('Plain text content');
    });

    it('should handle invalid JSON', () => {
      const invalidJson = '{invalid json}';

      expect(() => parser.parseJSON(invalidJson)).toThrow();
    });
  });

  describe('Auto-detection', () => {
    it('should auto-detect RSS feed', () => {
      const rss = `<?xml version="1.0"?><rss version="2.0"><channel><title>Test</title><item><title>Item</title><link>http://example.com/1</link></item></channel></rss>`;

      const result = parser.parse(rss);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Item');
    });

    it('should auto-detect Atom feed', () => {
      const atom = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Test</title><entry><id>1</id><title>Entry</title><link href="http://example.com/1"/></entry></feed>`;

      const result = parser.parse(atom);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Entry');
    });

    it('should auto-detect JSON feed', () => {
      const json = JSON.stringify({
        version: 'https://jsonfeed.org/version/1.1',
        title: 'Test',
        items: [{ id: '1', title: 'Item' }]
      });

      const result = parser.parse(json);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Item');
    });

    it('should throw error on unrecognized format', () => {
      const unknown = 'unknown format';

      expect(() => parser.parse(unknown)).toThrow(/Unrecognized feed format/);
    });
  });

  describe('Content Sanitization', () => {
    it('should remove script tags', () => {
      const content = '<p>Safe content</p><script>alert("xss")</script><p>More safe</p>';

      const sanitized = parser.sanitizeHtml(content);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Safe content');
    });

    it('should remove onclick and other event handlers', () => {
      const content = '<div onclick="alert()">Click me</div>';

      const sanitized = parser.sanitizeHtml(content);

      expect(sanitized).not.toContain('onclick');
      expect(sanitized).toContain('Click me');
    });

    it('should preserve safe HTML tags', () => {
      const content = '<p>Paragraph</p><strong>Bold</strong><em>Italic</em><a href="http://example.com">Link</a>';

      const sanitized = parser.sanitizeHtml(content);

      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('<strong>');
      expect(sanitized).toContain('<em>');
      expect(sanitized).toContain('<a');
    });

    it('should create plain text snippet without HTML', () => {
      const html = '<p>This is <strong>bold</strong> and <em>italic</em> text.</p>';

      const snippet = parser.createSnippet(html, 100);

      expect(snippet).not.toContain('<');
      expect(snippet).toContain('This is bold and italic text');
    });

    it('should truncate snippets to max length', () => {
      const text = 'A'.repeat(1000);

      const snippet = parser.createSnippet(text, 100);

      expect(snippet.length).toBeLessThanOrEqual(103); // 100 + '...'
      expect(snippet.endsWith('...')).toBe(true);
    });
  });
});
