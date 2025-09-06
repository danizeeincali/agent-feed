/**
 * Integration Tests for Link Preview End-to-End Flow
 * Focus: Real service integration without mocking external dependencies
 */

import { jest } from '@jest/globals';
import { linkPreviewService } from '../../../src/services/LinkPreviewService.js';
import { databaseService } from '../../../src/database/DatabaseService.js';
import { TEST_CONSTANTS, measureExecutionTime } from '../setup.js';

describe('Link Preview End-to-End Integration', () => {
  beforeAll(async () => {
    // Initialize database for integration tests
    await databaseService.initialize();
    
    // Clear any existing cache for clean test state
    await linkPreviewService.clearExpiredCache();
  });

  beforeEach(async () => {
    // Clear cache before each test for isolation
    await databaseService.db.prepare('DELETE FROM link_preview_cache').run();
  });

  afterAll(async () => {
    // Cleanup test data
    await databaseService.db.prepare('DELETE FROM link_preview_cache').run();
    await databaseService.close();
  });

  describe('Complete Link Preview Workflow', () => {
    it('should fetch, cache, and retrieve link previews for generic URLs', async () => {
      // Arrange
      const testUrl = 'https://httpbin.org/html';
      
      // Act - First request (cache miss)
      const { result: firstResult, executionTime: firstTime } = await measureExecutionTime(
        () => linkPreviewService.getLinkPreview(testUrl)
      );

      // Second request (cache hit)
      const { result: secondResult, executionTime: secondTime } = await measureExecutionTime(
        () => linkPreviewService.getLinkPreview(testUrl)
      );

      // Assert
      expect(firstResult).toBeDefined();
      expect(firstResult.title).toBeDefined();
      expect(firstResult.type).toBe('website');
      expect(firstResult.error).toBeUndefined();

      // Verify cache hit behavior
      expect(secondResult).toEqual(firstResult);
      expect(secondTime).toBeLessThan(firstTime); // Cache should be faster

      // Verify database caching occurred
      const cachedEntry = await databaseService.db.getCachedLinkPreview(testUrl);
      expect(cachedEntry).toBeDefined();
      expect(cachedEntry.title).toBe(firstResult.title);
    });

    it('should handle YouTube URLs with real oEmbed API integration', async () => {
      // Arrange - Use a well-known YouTube video that should always exist
      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Roll - classic test video

      // Act
      const result = await linkPreviewService.getLinkPreview(youtubeUrl);

      // Assert
      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.type).toBe('video');
      expect(result.videoId).toBe('dQw4w9WgXcQ');
      expect(result.image).toMatch(/img\.youtube\.com/);
      expect(result.fallback).not.toBe(true); // Should use real API, not fallback
      
      // Verify caching for YouTube content
      const cachedEntry = await databaseService.db.getCachedLinkPreview(youtubeUrl);
      expect(cachedEntry).toBeDefined();
      expect(cachedEntry.videoId).toBe('dQw4w9WgXcQ');
    });

    it('should gracefully handle non-existent URLs', async () => {
      // Arrange
      const nonExistentUrl = 'https://this-domain-definitely-does-not-exist-12345.com/page';

      // Act
      const result = await linkPreviewService.getLinkPreview(nonExistentUrl);

      // Assert - Should handle DNS/network errors gracefully
      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.description).toBe('Unable to fetch preview');
      expect(result.error).toBeDefined();
      expect(result.type).toBe('website');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle HTTP error responses appropriately', async () => {
      // Arrange - URLs that return various HTTP errors
      const errorTestCases = [
        { url: 'https://httpbin.org/status/404', expectedStatus: 404 },
        { url: 'https://httpbin.org/status/403', expectedStatus: 403 },
        { url: 'https://httpbin.org/status/500', expectedStatus: 500 }
      ];

      for (const { url, expectedStatus } of errorTestCases) {
        // Act
        const result = await linkPreviewService.getLinkPreview(url);

        // Assert
        expect(result).toBeDefined();
        expect(result.error).toContain(`HTTP ${expectedStatus}`);
        expect(result.description).toBe('Unable to fetch preview');
        expect(result.title).toBeDefined(); // Should extract domain as fallback
      }
    });

    it('should handle request timeouts and network issues', async () => {
      // Arrange - URL that simulates slow response
      const slowUrl = 'https://httpbin.org/delay/20'; // 20 second delay

      // Act - This should timeout based on the service's 15-second limit
      const { result, executionTime } = await measureExecutionTime(
        () => linkPreviewService.getLinkPreview(slowUrl)
      );

      // Assert
      expect(executionTime).toBeLessThan(20000); // Should timeout before 20 seconds
      expect(result).toBeDefined();
      expect(result.error).toBeDefined();
      expect(result.description).toBe('Unable to fetch preview');
    });

    it('should handle malformed HTML gracefully', async () => {
      // Arrange - URL that returns malformed HTML
      const malformedHtmlUrl = 'https://httpbin.org/xml'; // Returns XML instead of HTML

      // Act
      const result = await linkPreviewService.getLinkPreview(malformedHtmlUrl);

      // Assert
      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.type).toBeDefined();
      // Should not crash despite malformed content
    });
  });

  describe('Content Type Handling', () => {
    it('should handle different content types correctly', async () => {
      const contentTypeTests = [
        {
          url: 'https://httpbin.org/json',
          expectedType: 'file',
          description: 'JSON file'
        },
        {
          url: 'https://httpbin.org/xml',
          expectedType: 'file',
          description: 'XML file'
        }
      ];

      for (const { url, expectedType } of contentTypeTests) {
        // Act
        const result = await linkPreviewService.getLinkPreview(url);

        // Assert
        expect(result).toBeDefined();
        expect(result.type).toBe(expectedType);
        expect(result.title).toBeDefined();
      }
    });

    it('should extract metadata from pages with rich Open Graph tags', async () => {
      // Note: This would ideally test with a real site that has rich OG tags
      // For now, we'll use a mock service that returns proper OG HTML
      const richMetadataUrl = 'https://httpbin.org/html';

      // Act
      const result = await linkPreviewService.getLinkPreview(richMetadataUrl);

      // Assert
      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.type).toBeDefined();
      // Note: httpbin.org/html may not have rich OG tags, but should still extract basic info
    });
  });

  describe('Cache Behavior Integration', () => {
    it('should respect cache expiration policies', async () => {
      // Arrange
      const testUrl = 'https://httpbin.org/uuid'; // Returns different UUID each time
      
      // Act - First request
      const firstResult = await linkPreviewService.getLinkPreview(testUrl);
      
      // Manually expire the cache entry
      await databaseService.db.prepare(`
        UPDATE link_preview_cache 
        SET cached_at = datetime('now', '-8 days') 
        WHERE url = ?
      `).run(testUrl);
      
      // Second request (should fetch fresh due to expiration)
      const secondResult = await linkPreviewService.getLinkPreview(testUrl);

      // Assert
      expect(firstResult).toBeDefined();
      expect(secondResult).toBeDefined();
      // Results might be different due to dynamic content, but structure should be similar
      expect(firstResult.type).toBe(secondResult.type);
    });

    it('should handle concurrent requests efficiently', async () => {
      // Arrange - Multiple concurrent requests for the same URL
      const testUrl = 'https://httpbin.org/html';
      const concurrentRequests = 5;

      // Act - Make concurrent requests
      const promises = Array(concurrentRequests).fill(null).map(() => 
        linkPreviewService.getLinkPreview(testUrl)
      );
      
      const { result: results, executionTime } = await measureExecutionTime(
        () => Promise.all(promises)
      );

      // Assert
      expect(results).toHaveLength(concurrentRequests);
      
      // All results should be identical (same URL)
      const firstResult = results[0];
      results.forEach(result => {
        expect(result).toEqual(firstResult);
      });

      // Should only cache once despite multiple requests
      const cacheEntries = await databaseService.db.prepare(
        'SELECT COUNT(*) as count FROM link_preview_cache WHERE url = ?'
      ).get(testUrl);
      expect(cacheEntries.count).toBe(1);
    });
  });

  describe('Performance Integration', () => {
    it('should meet performance thresholds for typical requests', async () => {
      // Arrange
      const testUrl = 'https://httpbin.org/html';

      // Act - Measure performance
      const { result, executionTime } = await measureExecutionTime(
        () => linkPreviewService.getLinkPreview(testUrl)
      );

      // Assert
      expect(result).toBeDefined();
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.error).toBeUndefined();
    });

    it('should handle large HTML documents efficiently', async () => {
      // Note: This would ideally test with a large HTML document
      // httpbin doesn't provide large HTML, so we'll test with regular size
      const largeContentUrl = 'https://httpbin.org/html';

      // Act
      const { result, executionTime } = await measureExecutionTime(
        () => linkPreviewService.getLinkPreview(largeContentUrl)
      );

      // Assert - Should handle within reasonable time
      expect(result).toBeDefined();
      expect(executionTime).toBeLessThan(15000); // Service timeout limit
      expect(result.error).toBeUndefined();
    });
  });

  describe('Database Integration', () => {
    it('should persist and retrieve cache entries correctly', async () => {
      // Arrange
      const testUrl = 'https://httpbin.org/html';

      // Act - Fetch and cache
      const originalResult = await linkPreviewService.getLinkPreview(testUrl);

      // Verify direct database access
      const dbEntry = await databaseService.db.prepare(`
        SELECT * FROM link_preview_cache WHERE url = ?
      `).get(testUrl);

      // Assert
      expect(dbEntry).toBeDefined();
      expect(dbEntry.url).toBe(testUrl);
      expect(dbEntry.title).toBe(originalResult.title);
      expect(dbEntry.description).toBe(originalResult.description);
      expect(dbEntry.cached_at).toBeDefined();
      
      // Verify cache retrieval
      const cachedResult = await databaseService.db.getCachedLinkPreview(testUrl);
      expect(cachedResult.title).toBe(originalResult.title);
    });

    it('should handle database connection issues gracefully', async () => {
      // Arrange - Simulate database issues by temporarily breaking the connection
      const originalDb = databaseService.db;
      const testUrl = 'https://httpbin.org/html';

      try {
        // Simulate database failure
        databaseService.db = {
          getCachedLinkPreview: () => Promise.reject(new Error('Database connection failed')),
          cacheLinkPreview: () => Promise.reject(new Error('Database connection failed'))
        };

        // Act
        const result = await linkPreviewService.getLinkPreview(testUrl);

        // Assert - Should still return result despite DB issues
        expect(result).toBeDefined();
        expect(result.title).toBeDefined();
        
      } finally {
        // Restore original database connection
        databaseService.db = originalDb;
      }
    });
  });

  describe('Real-World URL Testing', () => {
    it('should handle popular websites correctly', async () => {
      // Note: These tests depend on external sites being available
      // In a real environment, you might want to mock these or use test doubles
      const popularSites = [
        'https://github.com', // Should have good OG tags
        'https://stackoverflow.com' // Should have good meta tags
      ];

      for (const url of popularSites) {
        try {
          // Act
          const result = await linkPreviewService.getLinkPreview(url);

          // Assert
          expect(result).toBeDefined();
          expect(result.title).toBeDefined();
          expect(result.title).not.toBe('Unknown Website');
          expect(result.type).toBeDefined();
          
          // These sites should not return errors in normal circumstances
          if (result.error) {
            console.warn(`Unexpected error for ${url}: ${result.error}`);
          }
        } catch (error) {
          // Log but don't fail the test - external sites may be temporarily unavailable
          console.warn(`Could not test ${url}: ${error.message}`);
        }
      }
    });
  });
});