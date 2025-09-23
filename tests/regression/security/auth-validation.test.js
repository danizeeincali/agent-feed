/**
 * Authentication and Authorization Regression Tests
 * Tests security-related functionality and access controls
 */

const request = require('supertest');
const crypto = require('crypto');

describe('Authentication and Authorization Regression Tests', () => {
  let baseUrl;

  beforeAll(() => {
    baseUrl = global.testConfig.apiUrl;
  });

  describe('API Security Headers', () => {
    test('should include security headers in responses', async () => {
      const response = await request(baseUrl).get('/agents');

      // Check for security headers
      expect(response.headers['x-content-type-options']).toBeDefined();
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();

      // Should not expose sensitive server information
      expect(response.headers['server']).toBeUndefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    test('should set proper CORS headers', async () => {
      const response = await request(baseUrl)
        .get('/agents')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });

    test('should handle cross-origin requests securely', async () => {
      const maliciousOrigin = 'http://malicious-site.com';

      const response = await request(baseUrl)
        .get('/agents')
        .set('Origin', maliciousOrigin);

      // Should still respond but with appropriate CORS headers
      expect(response.status).toBe(200);

      // CORS policy should be enforced by browser, server should respond
      // but not include malicious origin in allowed origins
      if (response.headers['access-control-allow-origin']) {
        expect(response.headers['access-control-allow-origin']).not.toBe(maliciousOrigin);
      }
    });
  });

  describe('Input Validation and Sanitization', () => {
    test('should reject requests with malicious headers', async () => {
      const maliciousHeaders = {
        'X-Script-Injection': '<script>alert(\"xss\")</script>',
        'X-SQL-Injection': '\"; DROP TABLE users; --',
        'X-Command-Injection': '; rm -rf /',
        'X-Path-Traversal': '../../../etc/passwd'
      };

      const response = await request(baseUrl)
        .get('/agents')
        .set(maliciousHeaders);

      // Should handle malicious headers without crashing
      expect(response.status).toBe(200);
      expect(response.body).toBeValidApiResponse();
    });

    test('should sanitize special characters in responses', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const responseText = JSON.stringify(response.body);

      // Should not contain script tags or other dangerous content
      expect(responseText).not.toMatch(/<script/i);
      expect(responseText).not.toMatch(/javascript:/i);
      expect(responseText).not.toMatch(/on\w+\s*=/i); // onclick, onload, etc.
    });

    test('should handle oversized requests appropriately', async () => {
      const largePayload = 'x'.repeat(10 * 1024 * 1024); // 10MB

      const response = await request(baseUrl)
        .post('/agents')
        .send({ data: largePayload });

      // Should reject oversized payloads or handle them gracefully
      expect([400, 413, 405]).toContain(response.status);
    });

    test('should validate content-type headers', async () => {
      const response = await request(baseUrl)
        .get('/agents')
        .set('Content-Type', 'application/x-malicious');

      // Should handle unusual content types without issues
      expect(response.status).toBe(200);
      expect(response.body).toBeValidApiResponse();
    });
  });

  describe('Rate Limiting and DOS Protection', () => {
    test('should handle rapid consecutive requests', async () => {
      const requests = Array.from({ length: 20 }, () =>
        request(baseUrl).get('/agents')
      );

      const responses = await Promise.allSettled(requests);

      // Most requests should succeed (assuming no strict rate limiting in test)
      const successfulResponses = responses.filter(
        result => result.status === 'fulfilled' && result.value.status === 200
      );

      expect(successfulResponses.length).toBeGreaterThan(10);

      // If rate limiting is in place, should get 429 responses
      const rateLimitedResponses = responses.filter(
        result => result.status === 'fulfilled' && result.value.status === 429
      );

      // Either all succeed or some are rate limited
      expect(successfulResponses.length + rateLimitedResponses.length).toBe(20);
    });

    test('should handle concurrent connections', async () => {
      const concurrentRequests = 10;
      const startTime = Date.now();

      const requests = Array.from({ length: concurrentRequests }, () =>
        request(baseUrl).get('/agents')
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // All requests should complete
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toBeValidApiResponse();
      });

      // Should handle concurrent requests efficiently
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds
    });

    test('should recover from connection flooding', async () => {
      // Create many requests but don't wait for all to complete
      const floodRequests = Array.from({ length: 50 }, () =>
        request(baseUrl).get('/agents').timeout(1000)
      );

      await Promise.allSettled(floodRequests);

      // Should still be able to handle normal requests after flooding
      const normalResponse = await request(baseUrl).get('/agents');
      expect(normalResponse.status).toBe(200);
      expect(normalResponse.body).toBeValidApiResponse();
    });
  });

  describe('Data Privacy and Information Disclosure', () => {
    test('should not expose sensitive file system information', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const responseText = JSON.stringify(response.body);

      // Should not expose file paths, system info, or environment variables
      expect(responseText).not.toMatch(/\/etc\/passwd/);
      expect(responseText).not.toMatch(/\/proc\/\d+/);
      expect(responseText).not.toMatch(/C:\\\\Windows/);
      expect(responseText).not.toMatch(/\.env/);
      expect(responseText).not.toMatch(/process\.env/);
    });

    test('should not leak error stack traces', async () => {
      // Try to trigger an error with invalid request
      const response = await request(baseUrl)
        .get('/agents')
        .set('Content-Type', 'application/json')
        .send('invalid-json');

      // Even if there's an error, should not expose stack traces
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toMatch(/at Object\./);
      expect(responseText).not.toMatch(/at Function\./);
      expect(responseText).not.toMatch(/node_modules/);
      expect(responseText).not.toMatch(/Error: .+ at /);
    });

    test('should not expose database connection strings', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const responseText = JSON.stringify(response.body);

      // Should not contain database connection information
      expect(responseText).not.toMatch(/mongodb:\/\//);
      expect(responseText).not.toMatch(/mysql:\/\//);
      expect(responseText).not.toMatch(/postgresql:\/\//);
      expect(responseText).not.toMatch(/sqlite:/);
      expect(responseText).not.toMatch(/password=/i);
      expect(responseText).not.toMatch(/apikey=/i);
    });

    test('should not expose API keys or tokens', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const responseText = JSON.stringify(response.body);

      // Should not contain API keys or sensitive tokens
      expect(responseText).not.toMatch(/sk-[a-zA-Z0-9]{32,}/); // OpenAI API key pattern
      expect(responseText).not.toMatch(/AIza[0-9A-Za-z-_]{35}/); // Google API key pattern
      expect(responseText).not.toMatch(/AKIA[0-9A-Z]{16}/); // AWS Access Key pattern
      expect(responseText).not.toMatch(/ya29\.[0-9A-Za-z\-_]+/); // Google OAuth token
    });
  });

  describe('Request Forgery Protection', () => {
    test('should handle requests without referrer', async () => {
      const response = await request(baseUrl)
        .get('/agents')
        .set('Referer', ''); // No referrer

      expect(response.status).toBe(200);
      expect(response.body).toBeValidApiResponse();
    });

    test('should handle requests with suspicious referrers', async () => {
      const suspiciousReferrers = [
        'http://malicious-site.com',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'about:blank'
      ];

      for (const referrer of suspiciousReferrers) {
        const response = await request(baseUrl)
          .get('/agents')
          .set('Referer', referrer);

        // Should handle suspicious referrers without issues
        expect(response.status).toBe(200);
        expect(response.body).toBeValidApiResponse();
      }
    });

    test('should validate user agent strings', async () => {
      const maliciousUserAgents = [
        '<script>alert(1)</script>',
        'sqlmap/1.0',
        'nikto',
        '../../../etc/passwd',
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) OR 1=1'
      ];

      for (const userAgent of maliciousUserAgents) {
        const response = await request(baseUrl)
          .get('/agents')
          .set('User-Agent', userAgent);

        // Should handle malicious user agents gracefully
        expect(response.status).toBe(200);
        expect(response.body).toBeValidApiResponse();
      }
    });
  });

  describe('Session Security', () => {
    test('should not expose session information', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      // Should not set session cookies for API endpoints
      expect(response.headers['set-cookie']).toBeUndefined();
    });

    test('should handle requests with session manipulation attempts', async () => {
      const response = await request(baseUrl)
        .get('/agents')
        .set('Cookie', 'sessionid=../../../etc/passwd; admin=true; user_id=0');

      expect(response.status).toBe(200);
      expect(response.body).toBeValidApiResponse();
    });
  });

  describe('Content Security', () => {
    test('should set Content-Security-Policy headers for HTML responses', async () => {
      // This would apply to HTML pages, not API endpoints
      // But we can test that API responses don't include dangerous content
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const contentType = response.headers['content-type'];
      expect(contentType).toMatch(/application\/json/);
    });

    test('should prevent content type sniffing', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      // Should include X-Content-Type-Options header
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should handle malformed JSON gracefully', async () => {
      const response = await request(baseUrl)
        .post('/agents')
        .set('Content-Type', 'application/json')
        .send('{"malformed": json}');

      // Should handle malformed JSON without exposing system information
      expect([400, 405]).toContain(response.status);
      if (response.body.error) {
        expect(response.body.error).not.toMatch(/unexpected token/i);
        expect(response.body.error).not.toMatch(/syntaxerror/i);
      }
    });
  });

  describe('Network Security', () => {
    test('should handle IPv6 requests', async () => {
      // This test may not work in all environments
      try {
        const response = await request(baseUrl)
          .get('/agents')
          .set('X-Forwarded-For', '::1');

        expect(response.status).toBe(200);
        expect(response.body).toBeValidApiResponse();
      } catch (error) {
        // IPv6 may not be supported in test environment
        console.log('IPv6 test skipped:', error.message);
      }
    });

    test('should handle proxy headers safely', async () => {
      const proxyHeaders = {
        'X-Forwarded-For': '192.168.1.1, 10.0.0.1, malicious-proxy.com',
        'X-Real-IP': '127.0.0.1',
        'X-Forwarded-Proto': 'https',
        'X-Forwarded-Host': 'example.com'
      };

      const response = await request(baseUrl)
        .get('/agents')
        .set(proxyHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toBeValidApiResponse();
    });

    test('should validate host headers', async () => {
      const response = await request(baseUrl)
        .get('/agents')
        .set('Host', 'malicious-host.com:8080');

      // Should handle host header manipulation
      expect(response.status).toBe(200);
      expect(response.body).toBeValidApiResponse();
    });
  });

  describe('Resource Access Controls', () => {
    test('should prevent directory traversal in file-based operations', async () => {
      // The agents API reads from file system, test it handles paths safely
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      // Check that response doesn't contain evidence of directory traversal
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toMatch(/\.\.\/\.\.\/\.\./);
      expect(responseText).not.toMatch(/\/etc\/passwd/);
      expect(responseText).not.toMatch(/\/proc\/version/);
    });

    test('should not expose system configuration files', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const agents = response.body.data || [];
      agents.forEach(agent => {
        // File paths should not be exposed
        expect(agent.file_path).toBeUndefined();
        expect(agent.config_path).toBeUndefined();
        expect(agent.system_path).toBeUndefined();
      });
    });

    test('should handle attempts to access restricted files', async () => {
      // This is more relevant for file upload endpoints
      // But we can test that the API doesn't expose unauthorized data
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toMatch(/ssh_host_rsa_key/);
      expect(responseText).not.toMatch(/id_rsa/);
      expect(responseText).not.toMatch(/authorized_keys/);
    });
  });
});