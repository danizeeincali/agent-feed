/**
 * URL Detection Service Unit Tests
 * TDD: RED Phase - These tests will FAIL until service is implemented
 */

const {
  extractURLs,
  extractContext,
  matchProactiveAgents,
  determinePriority
} = require('../../api-server/services/url-detection-service.cjs');

describe('URL Detection Service', () => {

  test('UT-URL-001: Extract single URL from content', () => {
    const content = 'Check this: https://example.com for info';
    const urls = extractURLs(content);

    expect(urls).toHaveLength(1);
    expect(urls[0]).toBe('https://example.com');
  });

  test('UT-URL-002: Extract multiple URLs from content', () => {
    const content = 'See https://a.com and https://b.com also http://c.com';
    const urls = extractURLs(content);

    expect(urls).toHaveLength(3);
    expect(urls).toContain('https://a.com');
    expect(urls).toContain('https://b.com');
    expect(urls).toContain('http://c.com');
  });

  test('UT-URL-003: Extract no URLs from plain text', () => {
    const content = 'This is just plain text without any links';
    const urls = extractURLs(content);

    expect(urls).toHaveLength(0);
  });

  test('UT-URL-004: Handle null or empty content', () => {
    expect(extractURLs(null)).toHaveLength(0);
    expect(extractURLs('')).toHaveLength(0);
    expect(extractURLs(undefined)).toHaveLength(0);
  });

  test('UT-URL-005: Match link-logger-agent for any URL', () => {
    const url = 'https://linkedin.com/article';
    const content = 'Save this link for me';

    const matches = matchProactiveAgents(url, content);

    expect(matches).toContain('link-logger-agent');
  });

  test('UT-URL-006: Match follow-ups-agent for follow-up keywords', () => {
    const url = 'https://example.com';
    const content = 'Follow up on this article later';

    const matches = matchProactiveAgents(url, content);

    expect(matches).toContain('link-logger-agent');
    expect(matches).toContain('follow-ups-agent');
  });

  test('UT-URL-007: Match personal-todos-agent for todo keywords', () => {
    const url = 'https://example.com';
    const content = 'TODO: Read this article';

    const matches = matchProactiveAgents(url, content);

    expect(matches).toContain('link-logger-agent');
    expect(matches).toContain('personal-todos-agent');
  });

  test('UT-URL-008: Extract context around URL (100 chars before/after)', () => {
    const content = 'Can you save this link for me? https://example.com I think it will be useful';
    const url = 'https://example.com';

    const context = extractContext(content, url);

    expect(context).toContain('save this link');
    expect(context).toContain('useful');
  });

  test('UT-URL-009: Extract context from long content', () => {
    const longBefore = 'a'.repeat(200);
    const longAfter = 'b'.repeat(200);
    const url = 'https://example.com';
    const content = `${longBefore}${url}${longAfter}`;

    const context = extractContext(content, url);

    // Context should be limited to ~200 chars total (100 before + 100 after)
    expect(context.length).toBeLessThan(250);
    expect(context).toContain(url);
  });

  test('UT-URL-010: Handle missing URL in extractContext', () => {
    const content = 'Some content without the URL';
    const url = 'https://nothere.com';

    const context = extractContext(content, url);

    expect(context).toBe('');
  });

  test('UT-URL-011: Determine priority P0 for urgent keywords', () => {
    const priority = determinePriority('link-logger-agent', 'URGENT: Read this now');
    expect(priority).toBe('P0');
  });

  test('UT-URL-012: Determine priority P1 for important keywords', () => {
    const priority = determinePriority('link-logger-agent', 'Important article to review');
    expect(priority).toBe('P1');
  });

  test('UT-URL-013: Determine priority P2 for normal content', () => {
    const priority = determinePriority('link-logger-agent', 'Check this link');
    expect(priority).toBe('P2');
  });

  test('UT-URL-014: Extract URLs with query parameters', () => {
    const content = 'Visit https://example.com/page?id=123&ref=twitter';
    const urls = extractURLs(content);

    expect(urls).toHaveLength(1);
    expect(urls[0]).toBe('https://example.com/page?id=123&ref=twitter');
  });

  test('UT-URL-015: Extract URLs with fragments', () => {
    const content = 'See https://example.com/page#section';
    const urls = extractURLs(content);

    expect(urls).toHaveLength(1);
    expect(urls[0]).toBe('https://example.com/page#section');
  });
});
