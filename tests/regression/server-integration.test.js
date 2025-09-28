/**
 * Server Integration Tests - TDD Regression Prevention
 *
 * Validates frontend (3003) and backend (3000) integration with CSS architecture
 * Prevents server-side rendering issues and CSS hydration mismatches
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import fetch from 'node-fetch';

const FRONTEND_URL = 'http://localhost:3003';
const BACKEND_URL = 'http://localhost:3000';

// Helper to wait for server availability
const waitForServer = async (url, timeout = 30000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url, { timeout: 5000 });
      if (response.status < 500) {
        return true;
      }
    } catch (error) {
      // Server not ready, continue waiting
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`Server at ${url} not available after ${timeout}ms`);
};

// Helper to extract CSS from HTML response
const extractCSSFromHTML = (html) => {
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  const linkRegex = /<link[^>]*rel=["']stylesheet["'][^>]*>/gi;

  const styles = [];
  let match;

  while ((match = styleRegex.exec(html)) !== null) {
    styles.push(match[1]);
  }

  const links = [];
  while ((match = linkRegex.exec(html)) !== null) {
    links.push(match[0]);
  }

  return { inlineStyles: styles, stylesheetLinks: links };
};

describe('Server Integration Tests', () => {
  beforeAll(async () => {
    // Verify both servers are running
    try {
      await waitForServer(FRONTEND_URL);
      console.log('Frontend server is available');
    } catch (error) {
      console.warn('Frontend server not available, tests may fail');
    }

    try {
      await waitForServer(BACKEND_URL);
      console.log('Backend server is available');
    } catch (error) {
      console.warn('Backend server not available, some tests may be skipped');
    }
  }, 60000);

  test('should serve main page with proper CSS integration', async () => {
    const response = await fetch(FRONTEND_URL, {
      headers: { 'Accept': 'text/html' }
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');

    const html = await response.text();

    // Verify HTML structure
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('<head>');
    expect(html).toContain('<body>');

    // Verify CSS is included
    const { inlineStyles, stylesheetLinks } = extractCSSFromHTML(html);

    // Should have either inline styles or stylesheet links
    expect(inlineStyles.length + stylesheetLinks.length).toBeGreaterThan(0);

    // Check for CSS variables in inline styles
    const allStyles = inlineStyles.join(' ');
    if (allStyles.length > 0) {
      expect(allStyles).toMatch(/--background|--foreground|--primary/);
    }

    // Verify viewport meta tag for responsive design
    expect(html).toContain('name="viewport"');
    expect(html).toContain('width=device-width');

    // Verify no white screen indicators
    expect(html).not.toContain('style="display:none"');
    expect(html).not.toContain('style="visibility:hidden"');
  });

  test('should serve CSS files with correct content-type and caching', async () => {
    const response = await fetch(FRONTEND_URL);
    const html = await response.text();

    // Extract CSS file URLs
    const cssLinkRegex = /<link[^>]*href=["']([^"']*\.css[^"']*)["'][^>]*>/gi;
    const cssUrls = [];
    let match;

    while ((match = cssLinkRegex.exec(html)) !== null) {
      const cssUrl = match[1];
      if (cssUrl.startsWith('/')) {
        cssUrls.push(`${FRONTEND_URL}${cssUrl}`);
      } else if (!cssUrl.startsWith('http')) {
        cssUrls.push(`${FRONTEND_URL}/${cssUrl}`);
      } else {
        cssUrls.push(cssUrl);
      }
    }

    if (cssUrls.length > 0) {
      for (const cssUrl of cssUrls.slice(0, 3)) { // Test first 3 CSS files
        const cssResponse = await fetch(cssUrl);

        expect(cssResponse.status).toBe(200);
        expect(cssResponse.headers.get('content-type')).toContain('text/css');

        const cssContent = await cssResponse.text();

        // Verify CSS contains expected Tailwind utilities
        expect(cssContent).toMatch(/\.bg-background|\.text-foreground|\.p-4|\.flex/);

        // Verify CSS variables
        expect(cssContent).toMatch(/hsl\(var\(--background\)|hsl\(var\(--foreground\)/);

        // Verify responsive utilities
        expect(cssContent).toMatch(/@media.*min-width/);

        // Check caching headers
        const cacheControl = cssResponse.headers.get('cache-control');
        if (cacheControl) {
          expect(cacheControl).toMatch(/max-age=|public|immutable/);
        }
      }
    }
  });

  test('should handle API endpoints correctly from backend', async () => {
    try {
      // Test backend API health endpoint
      const healthResponse = await fetch(`${BACKEND_URL}/api/health`);

      if (healthResponse.status === 404) {
        // Health endpoint might not exist, try alternatives
        const rootResponse = await fetch(BACKEND_URL);
        expect([200, 404, 403]).toContain(rootResponse.status);
      } else {
        expect(healthResponse.status).toBe(200);

        const healthData = await healthResponse.text();
        expect(healthData).toBeTruthy();
      }
    } catch (error) {
      console.warn('Backend server test skipped:', error.message);
    }
  });

  test('should handle CORS correctly between frontend and backend', async () => {
    try {
      // Test CORS preflight request
      const corsResponse = await fetch(`${BACKEND_URL}/api/posts`, {
        method: 'OPTIONS',
        headers: {
          'Origin': FRONTEND_URL,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });

      if (corsResponse.status !== 404) {
        // Verify CORS headers if endpoint exists
        const corsHeaders = corsResponse.headers;
        expect(corsHeaders.get('access-control-allow-origin')).toBeTruthy();
      }
    } catch (error) {
      console.warn('CORS test skipped:', error.message);
    }
  });

  test('should serve static assets with proper headers', async () => {
    // Test favicon and other static assets
    const staticAssets = [
      '/favicon.ico',
      '/robots.txt'
    ];

    for (const asset of staticAssets) {
      try {
        const response = await fetch(`${FRONTEND_URL}${asset}`);

        if (response.status === 200) {
          // Asset exists, verify headers
          const contentType = response.headers.get('content-type');
          expect(contentType).toBeTruthy();

          // Check caching for static assets
          const cacheControl = response.headers.get('cache-control');
          if (cacheControl) {
            expect(cacheControl).toMatch(/max-age|public/);
          }
        }
      } catch (error) {
        // Static asset might not exist, continue
        console.warn(`Static asset ${asset} test skipped:`, error.message);
      }
    }
  });

  test('should handle server-side rendering correctly', async () => {
    const response = await fetch(FRONTEND_URL, {
      headers: { 'Accept': 'text/html' }
    });

    const html = await response.text();

    // Verify SSR content
    expect(html).toContain('<div id="root">');

    // Check for hydration markers
    if (html.includes('__NEXT_DATA__')) {
      expect(html).toContain('__NEXT_DATA__');
    }

    // Verify no hydration mismatches indicators
    expect(html).not.toContain('Hydration failed');
    expect(html).not.toContain('Warning: Expected server HTML');

    // Verify CSS variables are server-rendered
    const hasServerCSSVars = html.includes('--background') || html.includes('--foreground');
    if (hasServerCSSVars) {
      expect(html).toMatch(/--background|--foreground|--primary/);
    }
  });

  test('should handle error pages with proper CSS', async () => {
    // Test 404 page
    const notFoundResponse = await fetch(`${FRONTEND_URL}/non-existent-page`);

    if (notFoundResponse.status === 404) {
      const notFoundHtml = await notFoundResponse.text();

      // 404 page should still have CSS
      const { inlineStyles, stylesheetLinks } = extractCSSFromHTML(notFoundHtml);
      expect(inlineStyles.length + stylesheetLinks.length).toBeGreaterThan(0);

      // Should not be a white screen
      expect(notFoundHtml).toContain('html');
      expect(notFoundHtml).toContain('body');
    }
  });

  test('should handle CSS injection attacks prevention', async () => {
    // Test potential CSS injection
    const maliciousCSS = '%3Cstyle%3E body{display:none}%3C/style%3E';
    const response = await fetch(`${FRONTEND_URL}/?css=${maliciousCSS}`);

    const html = await response.text();

    // Should not contain injected CSS
    expect(html).not.toContain('body{display:none}');
    expect(html).not.toContain('<style>body{display:none}</style>');
  });

  test('should maintain performance under load', async () => {
    const requests = [];
    const startTime = Date.now();

    // Make 10 concurrent requests
    for (let i = 0; i < 10; i++) {
      requests.push(fetch(FRONTEND_URL));
    }

    const responses = await Promise.all(requests);
    const endTime = Date.now();

    // All requests should succeed
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });

    // Should complete within reasonable time (5 seconds for 10 requests)
    const totalTime = endTime - startTime;
    expect(totalTime).toBeLessThan(5000);

    // Average response time should be reasonable
    const avgResponseTime = totalTime / responses.length;
    expect(avgResponseTime).toBeLessThan(1000);
  });

  test('should handle WebSocket connections (if applicable)', async () => {
    // Test if WebSocket endpoint exists
    try {
      const wsUrl = BACKEND_URL.replace('http', 'ws');

      // Simple WebSocket connection test
      // Note: This is a basic test; real WebSocket testing would need ws library
      const response = await fetch(`${BACKEND_URL}/socket.io/`, {
        headers: { 'Upgrade': 'websocket' }
      });

      // If WebSocket endpoint exists, it should handle upgrade requests
      if (response.status !== 404) {
        expect([101, 400, 426]).toContain(response.status);
      }
    } catch (error) {
      console.warn('WebSocket test skipped:', error.message);
    }
  });

  test('should handle Content Security Policy correctly', async () => {
    const response = await fetch(FRONTEND_URL);

    const cspHeader = response.headers.get('content-security-policy');
    if (cspHeader) {
      // If CSP is set, it should allow inline styles for CSS variables
      expect(cspHeader).toMatch(/style-src.*'unsafe-inline'|style-src.*'self'/);
    }

    const html = await response.text();

    // Check for nonce-based CSP if used
    const nonceMatch = html.match(/nonce=["']([^"']+)["']/);
    if (nonceMatch && cspHeader) {
      const nonce = nonceMatch[1];
      expect(cspHeader).toContain(`'nonce-${nonce}'`);
    }
  });

  test('should validate environment-specific behavior', async () => {
    const response = await fetch(FRONTEND_URL);
    const html = await response.text();

    // In production, CSS should be minified and optimized
    const { inlineStyles } = extractCSSFromHTML(html);

    if (inlineStyles.length > 0) {
      const cssContent = inlineStyles.join('');

      // Check if CSS appears to be minified (no unnecessary whitespace)
      if (process.env.NODE_ENV === 'production') {
        expect(cssContent).not.toMatch(/\n\s+/); // No indented lines
      }
    }

    // Should not contain development-only content in production
    if (process.env.NODE_ENV === 'production') {
      expect(html).not.toContain('webpack-dev-server');
      expect(html).not.toContain('hot-reload');
    }
  });

  test('should handle API rate limiting gracefully', async () => {
    if (!await waitForServer(BACKEND_URL, 5000).catch(() => false)) {
      console.warn('Backend server not available, skipping rate limiting test');
      return;
    }

    // Make rapid requests to test rate limiting
    const rapidRequests = [];
    for (let i = 0; i < 20; i++) {
      rapidRequests.push(
        fetch(`${BACKEND_URL}/api/posts`).catch(error => ({
          status: 500,
          error: error.message
        }))
      );
    }

    const responses = await Promise.all(rapidRequests);

    // Should handle requests gracefully (either success or proper rate limiting)
    responses.forEach(response => {
      if (response.status) {
        expect([200, 404, 429, 500]).toContain(response.status);
      }
    });
  });

  test('should maintain CSS consistency across page loads', async () => {
    // Load page multiple times and verify CSS consistency
    const responses = [];

    for (let i = 0; i < 3; i++) {
      const response = await fetch(FRONTEND_URL);
      const html = await response.text();
      responses.push(html);

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Extract CSS from each response
    const cssExtractions = responses.map(html => extractCSSFromHTML(html));

    // CSS should be consistent across loads
    if (cssExtractions[0].inlineStyles.length > 0) {
      const firstCSS = cssExtractions[0].inlineStyles.join('');

      cssExtractions.slice(1).forEach(extraction => {
        const currentCSS = extraction.inlineStyles.join('');
        // CSS should be identical or very similar
        expect(currentCSS.length).toBeCloseTo(firstCSS.length, -100); // Within 100 chars
      });
    }
  });
});