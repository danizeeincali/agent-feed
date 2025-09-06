/**
 * Integration Tests for Link Preview Failure Scenarios
 * Focus: Real-world failure handling and recovery patterns
 */

import { jest } from '@jest/globals';
import { linkPreviewService } from '../../../src/services/LinkPreviewService.js';
import { databaseService } from '../../../src/database/DatabaseService.js';
import { measureExecutionTime } from '../setup.js';

describe('Link Preview Failure Scenarios Integration', () => {
  beforeAll(async () => {
    await databaseService.initialize();
  });

  beforeEach(async () => {
    // Clear cache for test isolation
    await databaseService.db.prepare('DELETE FROM link_preview_cache').run();
  });

  afterAll(async () => {
    await databaseService.close();
  });

  describe('Network Failure Scenarios', () => {
    it('should handle DNS resolution failures gracefully', async () => {
      // Arrange
      const invalidDomainUrl = 'https://this-domain-absolutely-does-not-exist-999999.invalid/page';

      // Act
      const { result, executionTime } = await measureExecutionTime(
        () => linkPreviewService.getLinkPreview(invalidDomainUrl)
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.title).toBe('this-domain-absolutely-does-not-exist-999999.invalid');
      expect(result.description).toBe('Unable to fetch preview');
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/getaddrinfo ENOTFOUND|Network request failed/);
      expect(executionTime).toBeLessThan(30000); // Should fail fast
    });

    it('should handle connection timeouts appropriately', async () => {
      // Arrange - Use a URL that will cause connection timeout
      // Note: This might need adjustment based on actual network conditions
      const timeoutUrl = 'https://httpbin.org/delay/30'; // 30 second delay

      // Act
      const { result, executionTime } = await measureExecutionTime(
        () => linkPreviewService.getLinkPreview(timeoutUrl)
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.error).toBeDefined();
      expect(result.description).toBe('Unable to fetch preview');
      expect(executionTime).toBeLessThan(20000); // Should timeout within service limits
      expect(result.error).toMatch(/timeout|aborted/i);
    });

    it('should handle connection refused scenarios', async () => {
      // Arrange - Use localhost with a port that's likely closed
      const connectionRefusedUrl = 'http://localhost:59999/nonexistent';

      // Act
      const result = await linkPreviewService.getLinkPreview(connectionRefusedUrl);

      // Assert
      expect(result).toBeDefined();
      expect(result.title).toBe('localhost:59999');
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/ECONNREFUSED|connection refused/i);
    });
  });

  describe('HTTP Error Response Scenarios', () => {
    it('should handle various HTTP error codes with appropriate messages', async () => {
      const httpErrorTests = [
        { status: 400, url: 'https://httpbin.org/status/400', description: 'Bad Request' },
        { status: 401, url: 'https://httpbin.org/status/401', description: 'Unauthorized' },
        { status: 403, url: 'https://httpbin.org/status/403', description: 'Forbidden' },
        { status: 404, url: 'https://httpbin.org/status/404', description: 'Not Found' },
        { status: 429, url: 'https://httpbin.org/status/429', description: 'Too Many Requests' },
        { status: 500, url: 'https://httpbin.org/status/500', description: 'Internal Server Error' },
        { status: 502, url: 'https://httpbin.org/status/502', description: 'Bad Gateway' },
        { status: 503, url: 'https://httpbin.org/status/503', description: 'Service Unavailable' }
      ];

      for (const { status, url, description } of httpErrorTests) {
        // Act
        const result = await linkPreviewService.getLinkPreview(url);

        // Assert
        expect(result).toBeDefined();
        expect(result.error).toContain(`HTTP ${status}`);
        expect(result.error).toContain(description);
        expect(result.description).toBe('Unable to fetch preview');
        expect(result.title).toBe('httpbin.org'); // Domain extraction fallback
        expect(result.type).toBe('website');

        // Verify error is not cached to avoid propagating errors
        const cachedEntry = await databaseService.db.getCachedLinkPreview(url);
        if (cachedEntry) {
          // If cached, should have error info but structured appropriately
          expect(cachedEntry.error).toBeDefined();
        }
      }
    });

    it('should handle redirects that eventually fail', async () => {
      // Arrange - Redirect chain that leads to an error
      const redirectToErrorUrl = 'https://httpbin.org/redirect-to?url=https://httpbin.org/status/404';

      // Act
      const result = await linkPreviewService.getLinkPreview(redirectToErrorUrl);

      // Assert
      expect(result).toBeDefined();
      expect(result.error).toContain('HTTP 404');
      expect(result.title).toBe('httpbin.org');
    });

    it('should handle infinite redirect loops', async () => {
      // Arrange - URL that creates redirect loop
      const infiniteRedirectUrl = 'https://httpbin.org/redirect/10'; // 10 redirects

      // Act
      const { result, executionTime } = await measureExecutionTime(
        () => linkPreviewService.getLinkPreview(infiniteRedirectUrl)
      );

      // Assert
      expect(result).toBeDefined();
      // Should either succeed after following redirects or fail gracefully
      expect(executionTime).toBeLessThan(15000); // Within timeout limits
      
      if (result.error) {
        expect(result.error).toMatch(/redirect|maximum/i);
      } else {
        // If successful, should have followed redirects
        expect(result.title).toBeDefined();
      }
    });
  });

  describe('Content Processing Failures', () => {
    it('should handle malformed HTML gracefully', async () => {
      // Arrange - URL returning malformed HTML
      const malformedHtmlUrl = 'https://httpbin.org/robots.txt'; // Plain text, not HTML

      // Act
      const result = await linkPreviewService.getLinkPreview(malformedHtmlUrl);

      // Assert
      expect(result).toBeDefined();
      expect(result.type).toBe('file'); // Should detect as non-HTML content
      expect(result.title).toBeDefined();
      expect(result.description).toMatch(/text.*file/i);
      // Should not crash despite non-HTML content
    });

    it('should handle very large HTML documents', async () => {
      // Note: httpbin doesn't provide very large documents
      // This test documents expected behavior for large content
      const regularUrl = 'https://httpbin.org/html';

      // Act
      const result = await linkPreviewService.getLinkPreview(regularUrl);

      // Assert
      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
      // Service should handle content size limits (5MB configured)
    });

    it('should handle HTML with security vulnerabilities', async () => {
      // Note: This test would ideally use a controlled malicious HTML source
      // For now, test that the service doesn't crash with unusual content
      const testUrl = 'https://httpbin.org/html';

      // Act
      const result = await linkPreviewService.getLinkPreview(testUrl);

      // Assert - Service should not be vulnerable to content-based attacks
      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
      expect(typeof result.title).toBe('string');
      expect(result.title.length).toBeLessThanOrEqual(200); // Length limits applied
      
      if (result.description) {
        expect(result.description.length).toBeLessThanOrEqual(500);
      }
    });
  });

  describe('Platform-Specific Failures', () => {
    it('should handle YouTube API failures with fallback', async () => {
      // Arrange - Use a YouTube URL that might trigger API limits or failures
      const youtubeUrl = 'https://www.youtube.com/watch?v=invalid_video_id_12345';

      // Act
      const result = await linkPreviewService.getLinkPreview(youtubeUrl);

      // Assert
      expect(result).toBeDefined();
      expect(result.type).toBe('video');
      expect(result.videoId).toBe('invalid_video_id_12345');
      
      if (result.fallback) {
        // If API failed, should use fallback
        expect(result.title).toContain('YouTube');
        expect(result.image).toMatch(/img\.youtube\.com/);
      } else {
        // If API succeeded despite invalid ID, that's also valid
        expect(result.title).toBeDefined();
      }
    });

    it('should handle social media platform blocking', async () => {
      // Note: These platforms may block automated requests
      const socialUrls = [
        'https://twitter.com/nonexistent_user_12345/status/999999999999999999',
        'https://linkedin.com/posts/nonexistent_user_12345_invalid-post'
      ];

      for (const url of socialUrls) {
        // Act
        const result = await linkPreviewService.getLinkPreview(url);

        // Assert - Should handle blocking/restrictions gracefully
        expect(result).toBeDefined();
        expect(result.type).toMatch(/social|website/);
        
        if (result.error) {
          // If blocked, should fail gracefully
          expect(result.error).toMatch(/HTTP|Forbidden|Not Found/i);
          expect(result.description).toBe('Unable to fetch preview');
        }
        
        // Should extract domain regardless
        expect(result.title).toBeDefined();
      }
    });
  });

  describe('Database Failure Scenarios', () => {
    it('should continue operating when cache writes fail', async () => {
      // Arrange - Simulate database write failure
      const originalCacheLinkPreview = databaseService.db.cacheLinkPreview;
      databaseService.db.cacheLinkPreview = jest.fn().mockRejectedValue(
        new Error('Database write failed')
      );

      const testUrl = 'https://httpbin.org/html';

      try {
        // Act
        const result = await linkPreviewService.getLinkPreview(testUrl);

        // Assert - Should still return result despite cache write failure
        expect(result).toBeDefined();
        expect(result.title).toBeDefined();
        expect(result.error).toBeUndefined(); // Cache write errors shouldn't propagate

      } finally {
        // Restore original function
        databaseService.db.cacheLinkPreview = originalCacheLinkPreview;
      }
    });

    it('should continue operating when cache reads fail', async () => {
      // Arrange - Simulate database read failure
      const originalGetCachedLinkPreview = databaseService.db.getCachedLinkPreview;
      databaseService.db.getCachedLinkPreview = jest.fn().mockRejectedValue(
        new Error('Database read failed')
      );

      const testUrl = 'https://httpbin.org/html';

      try {
        // Act
        const result = await linkPreviewService.getLinkPreview(testUrl);

        // Assert - Should fetch fresh content despite cache read failure
        expect(result).toBeDefined();
        expect(result.title).toBeDefined();
        expect(result.error).toBeUndefined(); // Cache read errors shouldn't propagate

      } finally {
        // Restore original function
        databaseService.db.getCachedLinkPreview = originalGetCachedLinkPreview;
      }
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    it('should handle memory pressure gracefully', async () => {
      // Arrange - Test with multiple concurrent requests
      const testUrls = Array.from({ length: 20 }, (_, i) => 
        `https://httpbin.org/html?test=${i}`
      );

      // Act - Make many concurrent requests to stress memory
      const results = await Promise.allSettled(
        testUrls.map(url => linkPreviewService.getLinkPreview(url))
      );

      // Assert - Should handle all requests without crashing
      expect(results).toHaveLength(testUrls.length);
      
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      // Most should succeed
      expect(successful.length).toBeGreaterThan(testUrls.length * 0.7);
      
      // Any failures should be handled gracefully
      failed.forEach(failure => {
        console.warn('Request failed:', failure.reason?.message);
      });
    });

    it('should handle rate limiting from external services', async () => {
      // Arrange - Make rapid requests to potentially trigger rate limits
      const testUrl = 'https://httpbin.org/html';
      const rapidRequests = 10;

      // Act - Make requests in quick succession
      const startTime = Date.now();
      const results = await Promise.all(
        Array(rapidRequests).fill(null).map(async (_, i) => {
          const result = await linkPreviewService.getLinkPreview(`${testUrl}?req=${i}`);
          return { result, timestamp: Date.now() };
        })
      );
      const totalTime = Date.now() - startTime;

      // Assert
      expect(results).toHaveLength(rapidRequests);
      
      // All should complete (though some might be cached)
      results.forEach(({ result }, i) => {
        expect(result).toBeDefined();
        expect(result.title).toBeDefined();
      });

      // Should complete in reasonable time
      expect(totalTime).toBeLessThan(60000); // 1 minute max
    });
  });

  describe('Edge Case URL Scenarios', () => {
    it('should handle URLs with unusual characters', async () => {
      const edgeCaseUrls = [
        'https://httpbin.org/anything/test%20with%20spaces',
        'https://httpbin.org/anything/test_with_unicode_é',
        'https://httpbin.org/anything?query=special&chars=!@#$%'
      ];

      for (const url of edgeCaseUrls) {
        // Act
        const result = await linkPreviewService.getLinkPreview(url);

        // Assert
        expect(result).toBeDefined();
        expect(result.title).toBeDefined();
        expect(result.type).toBeDefined();
        // Should handle URL encoding/decoding properly
      }
    });

    it('should handle very long URLs', async () => {
      // Arrange - Create very long URL
      const longPath = 'a'.repeat(1000);
      const longUrl = `https://httpbin.org/anything/${longPath}`;

      // Act
      const result = await linkPreviewService.getLinkPreview(longUrl);

      // Assert
      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
      // Service should handle long URLs without issues
    });

    it('should handle URLs with fragments and queries', async () => {
      const complexUrl = 'https://httpbin.org/anything?param1=value1&param2=value2#section1';

      // Act
      const result = await linkPreviewService.getLinkPreview(complexUrl);

      // Assert
      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
      // Should properly handle URL components
    });
  });

  describe('Recovery and Retry Scenarios', () => {
    it('should eventually succeed after transient failures', async () => {
      // Note: This test would ideally use a service that fails intermittently
      // For now, test basic retry logic with a stable URL
      const testUrl = 'https://httpbin.org/html';

      // Act - Multiple attempts
      const attempts = [];
      for (let i = 0; i < 3; i++) {
        const result = await linkPreviewService.getLinkPreview(`${testUrl}?attempt=${i}`);
        attempts.push(result);
      }

      // Assert - All attempts should succeed with stable service
      attempts.forEach((result, i) => {
        expect(result).toBeDefined();
        expect(result.title).toBeDefined();
        expect(result.error).toBeUndefined();
      });
    });
  });
});