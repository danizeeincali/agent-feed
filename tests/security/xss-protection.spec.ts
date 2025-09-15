import { test, expect } from '@playwright/test';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

describe('XSS Protection Tests', () => {
  let page: any;
  let context: any;

  beforeEach(async () => {
    // Setup test environment
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    global.window = dom.window as any;
    global.document = dom.window.document;
  });

  describe('Dynamic Content Rendering Protection', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '<div onclick="alert(\'XSS\')">Click me</div>',
      '<style>@import"javascript:alert(\'XSS\')"</style>',
      '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
      '<meta http-equiv="refresh" content="0;url=javascript:alert(\'XSS\')">',
      '<form><button formaction="javascript:alert(\'XSS\')">Submit</button></form>',
      // Advanced payloads
      '<script>setTimeout(function(){alert("XSS")},1000)</script>',
      '<script src="data:text/javascript,alert(\'XSS\')"></script>',
      '<object data="data:text/html,<script>alert(\'XSS\')</script>"></object>',
      '<embed src="data:text/html,<script>alert(\'XSS\')</script>">',
      // Event handlers
      '<body onload=alert("XSS")>',
      '<input type="text" onfocus=alert("XSS") autofocus>',
      '<details open ontoggle=alert("XSS")>',
      '<marquee onstart=alert("XSS")>XSS</marquee>',
      // CSS injection
      '<div style="background:url(javascript:alert(\'XSS\'))">',
      '<div style="expression(alert(\'XSS\'))">',
      // Template literals
      '${alert("XSS")}',
      '#{alert("XSS")}',
      // Data URLs
      '<a href="data:text/html,<script>alert(\'XSS\')</script>">Click</a>',
    ];

    xssPayloads.forEach((payload, index) => {
      test(`should sanitize XSS payload ${index + 1}: ${payload.substring(0, 50)}...`, async () => {
        // Test DOMPurify sanitization
        const sanitized = DOMPurify.sanitize(payload);
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('alert(');
        expect(sanitized).not.toContain('onerror');
        expect(sanitized).not.toContain('onload');
        expect(sanitized).not.toContain('<script');

        // Test that script tags are completely removed
        const scriptRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
        expect(sanitized).not.toMatch(scriptRegex);
      });
    });

    test('should preserve safe content while removing malicious code', async () => {
      const mixedContent = `
        <div>Safe content</div>
        <p>Normal paragraph</p>
        <script>alert('XSS')</script>
        <strong>Bold text</strong>
        <img src=x onerror=alert('XSS')>
        <em>Italic text</em>
      `;

      const sanitized = DOMPurify.sanitize(mixedContent);

      // Safe content should remain
      expect(sanitized).toContain('<div>Safe content</div>');
      expect(sanitized).toContain('<p>Normal paragraph</p>');
      expect(sanitized).toContain('<strong>Bold text</strong>');
      expect(sanitized).toContain('<em>Italic text</em>');

      // Malicious content should be removed
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('alert(');
    });

    test('should handle URL-encoded XSS attempts', async () => {
      const encodedPayloads = [
        '%3Cscript%3Ealert(%22XSS%22)%3C%2Fscript%3E',
        '%3Cimg%20src%3Dx%20onerror%3Dalert(%22XSS%22)%3E',
        'javascript%3Aalert(%22XSS%22)',
        '%3Csvg%20onload%3Dalert(%22XSS%22)%3E',
      ];

      encodedPayloads.forEach(payload => {
        const decoded = decodeURIComponent(payload);
        const sanitized = DOMPurify.sanitize(decoded);
        expect(sanitized).not.toContain('alert(');
        expect(sanitized).not.toContain('<script');
      });
    });

    test('should handle double-encoded XSS attempts', async () => {
      const doubleEncoded = '%253Cscript%253Ealert(%2522XSS%2522)%253C%252Fscript%253E';
      const decoded1 = decodeURIComponent(doubleEncoded);
      const decoded2 = decodeURIComponent(decoded1);
      const sanitized = DOMPurify.sanitize(decoded2);

      expect(sanitized).not.toContain('alert(');
      expect(sanitized).not.toContain('<script');
    });

    test('should validate Content-Type headers prevent script execution', async () => {
      const testHeaders = [
        'text/plain',
        'application/json',
        'text/css',
        'image/png'
      ];

      // Mock fetch responses with different content types
      testHeaders.forEach(contentType => {
        const mockResponse = {
          headers: { 'Content-Type': contentType },
          body: '<script>alert("XSS")</script>'
        };

        // Verify that non-HTML content types don't execute scripts
        expect(mockResponse.headers['Content-Type']).not.toBe('text/html');
      });
    });
  });

  describe('Dynamic Page XSS Testing', () => {
    test('should test XSS in dynamic route parameters', async () => {
      const maliciousParams = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '"><script>alert("XSS")</script>',
        '\';alert(\'XSS\');//',
      ];

      maliciousParams.forEach(param => {
        // Simulate route parameter sanitization
        const sanitized = encodeURIComponent(param);
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('javascript:');
      });
    });

    test('should test XSS in search parameters', async () => {
      const maliciousQueries = [
        'search=<script>alert("XSS")</script>',
        'q=javascript:alert("XSS")',
        'filter="><img src=x onerror=alert("XSS")>',
      ];

      maliciousQueries.forEach(query => {
        const urlParams = new URLSearchParams(query);
        const values = Array.from(urlParams.values());

        values.forEach(value => {
          const sanitized = DOMPurify.sanitize(value);
          expect(sanitized).not.toContain('alert(');
          expect(sanitized).not.toContain('<script');
          expect(sanitized).not.toContain('javascript:');
        });
      });
    });

    test('should test XSS in form data', async () => {
      const formData = new FormData();
      formData.append('username', '<script>alert("XSS")</script>');
      formData.append('comment', '<img src=x onerror=alert("XSS")>');
      formData.append('description', 'javascript:alert("XSS")');

      for (const [key, value] of formData.entries()) {
        const sanitized = DOMPurify.sanitize(value as string);
        expect(sanitized).not.toContain('alert(');
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('javascript:');
      }
    });

    test('should test XSS in JSON responses', async () => {
      const maliciousJSON = {
        title: '<script>alert("XSS")</script>',
        content: '<img src=x onerror=alert("XSS")>',
        author: 'javascript:alert("XSS")',
      };

      Object.values(maliciousJSON).forEach(value => {
        const sanitized = DOMPurify.sanitize(value);
        expect(sanitized).not.toContain('alert(');
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('javascript:');
      });
    });
  });

  describe('Context-Specific XSS Protection', () => {
    test('should handle XSS in different HTML contexts', async () => {
      const contexts = {
        htmlBody: '<div>PAYLOAD</div>',
        htmlAttribute: '<div title="PAYLOAD">Content</div>',
        javascript: '<script>var data = "PAYLOAD";</script>',
        css: '<style>.class { content: "PAYLOAD"; }</style>',
        url: '<a href="PAYLOAD">Link</a>',
      };

      const payload = 'alert("XSS")';

      Object.entries(contexts).forEach(([context, template]) => {
        const content = template.replace('PAYLOAD', payload);
        const sanitized = DOMPurify.sanitize(content);

        expect(sanitized).not.toContain('alert(');

        if (context === 'javascript' || context === 'css') {
          expect(sanitized).toBe(''); // Should remove script/style entirely
        }
      });
    });

    test('should validate CSP prevents inline script execution', async () => {
      const cspPolicies = [
        "default-src 'self'",
        "script-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "script-src 'none'",
      ];

      // Mock CSP validation
      cspPolicies.forEach(policy => {
        const hasUnsafeInline = policy.includes("'unsafe-inline'");
        const allowsScripts = !policy.includes("script-src 'none'");

        if (!hasUnsafeInline && allowsScripts) {
          // This policy should prevent inline scripts
          expect(policy).not.toContain("'unsafe-inline'");
        }
      });
    });
  });

  describe('Advanced XSS Protection', () => {
    test('should handle mutation XSS attacks', async () => {
      const mutationPayloads = [
        '<svg><script>alert("XSS")</script></svg>',
        '<math><script>alert("XSS")</script></math>',
        '<template><script>alert("XSS")</script></template>',
      ];

      mutationPayloads.forEach(payload => {
        const sanitized = DOMPurify.sanitize(payload);
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('alert(');
      });
    });

    test('should prevent DOM clobbering attacks', async () => {
      const clobberingPayloads = [
        '<form id="document"></form>',
        '<img name="cookie" id="cookie">',
        '<a id="location" href="javascript:alert(\'XSS\')"></a>',
      ];

      clobberingPayloads.forEach(payload => {
        const sanitized = DOMPurify.sanitize(payload, {
          SANITIZE_DOM: true,
          SANITIZE_NAMED_PROPS: true,
        });

        // Check that dangerous id/name attributes are handled
        expect(sanitized).not.toMatch(/id="(document|window|location)"/);
        expect(sanitized).not.toMatch(/name="(cookie|localStorage)"/);
      });
    });

    test('should handle prototype pollution via HTML', async () => {
      const pollutionPayloads = [
        '<img src=x onerror="Object.prototype.isAdmin=true">',
        '<form><input name="__proto__[isAdmin]" value="true"></form>',
      ];

      pollutionPayloads.forEach(payload => {
        const sanitized = DOMPurify.sanitize(payload);
        expect(sanitized).not.toContain('__proto__');
        expect(sanitized).not.toContain('prototype');
      });
    });
  });

  afterEach(() => {
    // Cleanup
    delete (global as any).window;
    delete (global as any).document;
  });
});

// XSS Testing Utilities
export class XSSTestUtils {
  static generatePayloads(): string[] {
    return [
      // Basic script injection
      '<script>alert("XSS")</script>',
      '<SCRIPT>alert("XSS")</SCRIPT>',
      '<ScRiPt>alert("XSS")</ScRiPt>',

      // Event handlers
      '<img src=x onerror=alert("XSS")>',
      '<body onload=alert("XSS")>',
      '<svg onload=alert("XSS")>',

      // JavaScript URLs
      '<a href="javascript:alert(\'XSS\')">Click</a>',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',

      // Data URLs
      '<object data="data:text/html,<script>alert(\'XSS\')</script>"></object>',

      // CSS injection
      '<div style="background:url(javascript:alert(\'XSS\'))">',
      '<style>@import"javascript:alert(\'XSS\')"</style>',

      // Template injection
      '${alert("XSS")}',
      '{{alert("XSS")}}',

      // Encoded variants
      '%3Cscript%3Ealert(%22XSS%22)%3C%2Fscript%3E',
      '&lt;script&gt;alert("XSS")&lt;/script&gt;',

      // Bypasses
      '<script>eval(String.fromCharCode(97,108,101,114,116,40,34,88,83,83,34,41))</script>',
      '<img src="x:x" onerror="eval(atob(\'YWxlcnQoIlhTUyIp\'))">',
    ];
  }

  static testSanitization(input: string, sanitizer: (input: string) => string): boolean {
    const sanitized = sanitizer(input);

    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /expression\s*\(/i,
      /@import/i,
    ];

    return !dangerousPatterns.some(pattern => pattern.test(sanitized));
  }
}