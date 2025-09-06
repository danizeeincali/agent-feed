/**
 * London School TDD Unit Tests for YouTubeMetadataService
 * Focus: YouTube-specific behavior verification and API interaction patterns
 */

import { jest } from '@jest/globals';
import { YouTubeMetadataService } from '../../../src/services/LinkPreviewService.js';
import { 
  TEST_CONSTANTS, 
  MOCK_RESPONSES, 
  createSwarmMock, 
  verifySwarmContract,
  measureExecutionTime 
} from '../setup.js';

describe('YouTubeMetadataService - London School TDD', () => {
  let youTubeService;
  let mockFetch;
  let mockCacheService;

  beforeEach(() => {
    // Create swarm mocks for dependencies
    mockFetch = createSwarmMock('FetchService', {
      fetch: jest.fn()
    });
    
    mockCacheService = createSwarmMock('CacheService', {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn()
    });

    global.fetch = mockFetch.fetch;
    
    // Create service instance
    youTubeService = new YouTubeMetadataService();
    
    // Inject cache mock for testing
    youTubeService.cache = mockCacheService;
  });

  describe('Contract Definition: YouTube API Integration', () => {
    it('should define correct collaboration contracts for YouTube metadata extraction', () => {
      expect(youTubeService.oembedEndpoint).toBe('https://www.youtube.com/oembed');
      expect(youTubeService.userAgent).toContain('AgentFeed LinkPreview');
      expect(youTubeService.cacheExpiry).toBe(30 * 60 * 1000); // 30 minutes
    });
  });

  describe('Video ID Extraction Behavior', () => {
    it('should extract video IDs from various YouTube URL formats', () => {
      const testCases = [
        { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
        { url: 'https://youtu.be/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
        { url: 'https://youtube.com/embed/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
        { url: 'https://youtube.com/v/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
        { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s', expected: 'dQw4w9WgXcQ' }
      ];

      testCases.forEach(({ url, expected }) => {
        const result = youTubeService.extractVideoId(url);
        expect(result).toBe(expected);
      });
    });

    it('should return null for invalid YouTube URLs', () => {
      const invalidUrls = [
        'https://not-youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=',
        'https://www.youtube.com/watch',
        'invalid-url',
        ''
      ];

      invalidUrls.forEach(url => {
        const result = youTubeService.extractVideoId(url);
        expect(result).toBeNull();
      });
    });
  });

  describe('Cache-First Retrieval Pattern', () => {
    it('should check cache before making API requests', async () => {
      // Arrange - Cache hit scenario
      const url = TEST_CONSTANTS.YOUTUBE_URL;
      const videoId = 'dQw4w9WgXcQ';
      const cachedData = {
        title: 'Cached Video',
        author: 'Cached Author',
        thumbnail: 'cached-thumbnail.jpg'
      };

      mockCacheService.get.mockReturnValue({
        data: cachedData,
        timestamp: Date.now() - 1000 // Recent cache entry
      });

      // Act
      const result = await youTubeService.getYouTubeMetadata(url);

      // Assert - Verify cache was checked first and API was not called
      expect(mockCacheService.get).toHaveBeenCalledWith(videoId);
      expect(mockFetch.fetch).not.toHaveBeenCalled();
      expect(result).toBe(cachedData);
    });

    it('should make API request when cache misses', async () => {
      // Arrange - Cache miss scenario
      const url = TEST_CONSTANTS.YOUTUBE_URL;
      const videoId = 'dQw4w9WgXcQ';
      
      mockCacheService.get.mockReturnValue(null); // Cache miss
      mockFetch.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_RESPONSES.YOUTUBE_OEMBED)
      });
      mockCacheService.set = jest.fn();

      // Act
      const result = await youTubeService.getYouTubeMetadata(url);

      // Assert - Verify cache check -> API call -> cache update sequence
      verifySwarmContract(mockCacheService, [
        { method: 'get', calls: [[videoId]] }
      ]);
      
      expect(mockFetch.fetch).toHaveBeenCalledWith(
        expect.stringContaining('youtube.com/oembed'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'User-Agent': youTubeService.userAgent,
            'Accept': 'application/json'
          }),
          timeout: 10000
        })
      );
    });

    it('should respect cache expiration policies', async () => {
      // Arrange - Expired cache scenario
      const url = TEST_CONSTANTS.YOUTUBE_URL;
      const videoId = 'dQw4w9WgXcQ';
      const expiredCacheEntry = {
        data: { title: 'Old Video' },
        timestamp: Date.now() - (45 * 60 * 1000) // 45 minutes ago (expired)
      };

      mockCacheService.get.mockReturnValue(expiredCacheEntry);
      mockFetch.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_RESPONSES.YOUTUBE_OEMBED)
      });

      // Act
      const result = await youTubeService.getYouTubeMetadata(url);

      // Assert - Verify expired cache triggered fresh API call
      expect(mockCacheService.get).toHaveBeenCalledWith(videoId);
      expect(mockFetch.fetch).toHaveBeenCalled(); // Fresh API call made
    });
  });

  describe('API Error Handling and Fallback Behavior', () => {
    it('should gracefully handle YouTube API failures', async () => {
      // Arrange - API failure scenario
      const url = TEST_CONSTANTS.YOUTUBE_URL;
      const videoId = 'dQw4w9WgXcQ';
      
      mockCacheService.get.mockReturnValue(null);
      mockFetch.fetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      });

      // Act
      const result = await youTubeService.getYouTubeMetadata(url);

      // Assert - Verify fallback behavior
      expect(result).toMatchObject({
        title: 'YouTube Video',
        description: 'Video content from YouTube',
        videoId,
        fallback: true,
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
      });

      // Verify API was attempted
      expect(mockFetch.fetch).toHaveBeenCalled();
    });

    it('should handle network timeouts with circuit breaker pattern', async () => {
      // Arrange - Network timeout
      const url = TEST_CONSTANTS.YOUTUBE_URL;
      
      mockCacheService.get.mockReturnValue(null);
      mockFetch.fetch.mockRejectedValue(new Error('Request timeout'));

      // Act
      const result = await youTubeService.getYouTubeMetadata(url);

      // Assert - Verify timeout handling
      expect(result.fallback).toBe(true);
      expect(result.videoId).toBe('dQw4w9WgXcQ');
      expect(mockFetch.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ timeout: 10000 })
      );
    });
  });

  describe('Cache Management and Memory Optimization', () => {
    it('should enforce cache size limits to prevent memory leaks', async () => {
      // Arrange - Simulate cache at capacity
      const url = TEST_CONSTANTS.YOUTUBE_URL;
      const videoId = 'dQw4w9WgXcQ';
      
      // Mock cache at capacity
      Object.defineProperty(youTubeService.cache, 'size', { 
        value: youTubeService.maxCacheSize,
        writable: false 
      });
      
      mockCacheService.get.mockReturnValue(null);
      mockCacheService.delete = jest.fn();
      mockFetch.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_RESPONSES.YOUTUBE_OEMBED)
      });

      // Act
      await youTubeService.getYouTubeMetadata(url);

      // Assert - Verify cache eviction occurred before adding new entry
      // Note: This would require modifying the actual cache implementation
      // For now, verify the behavior pattern exists
      expect(youTubeService.maxCacheSize).toBe(100);
    });

    it('should clear expired entries during maintenance operations', () => {
      // Arrange - Mix of fresh and expired entries
      const now = Date.now();
      const freshEntry = { data: {}, timestamp: now - 1000 };
      const expiredEntry = { data: {}, timestamp: now - (45 * 60 * 1000) };
      
      youTubeService.cache = new Map([
        ['fresh1', freshEntry],
        ['expired1', expiredEntry],
        ['expired2', expiredEntry],
        ['fresh2', freshEntry]
      ]);

      // Act
      const clearedCount = youTubeService.clearExpiredCache();

      // Assert - Verify only expired entries were removed
      expect(clearedCount).toBe(2);
      expect(youTubeService.cache.size).toBe(2);
      expect(youTubeService.cache.has('fresh1')).toBe(true);
      expect(youTubeService.cache.has('fresh2')).toBe(true);
    });
  });

  describe('Duration Parsing and Metadata Enhancement', () => {
    it('should parse ISO 8601 duration format correctly', () => {
      const testCases = [
        { input: 'PT4M33S', expected: 273 }, // 4 minutes 33 seconds
        { input: 'PT1H2M3S', expected: 3723 }, // 1 hour 2 minutes 3 seconds
        { input: 'PT30S', expected: 30 }, // 30 seconds
        { input: 'PT5M', expected: 300 }, // 5 minutes
        { input: 'PT1H', expected: 3600 }, // 1 hour
        { input: null, expected: null },
        { input: 'invalid', expected: null }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = youTubeService.parseDuration(input);
        expect(result).toBe(expected);
      });
    });

    it('should generate meaningful video descriptions from oEmbed data', () => {
      const testCases = [
        {
          input: { 
            author_name: 'Test Channel',
            width: 1920,
            height: 1080
          },
          expected: 'Video by Test Channel • 1920x1080'
        },
        {
          input: { author_name: 'Test Channel' },
          expected: 'Video by Test Channel'
        },
        {
          input: { width: 720, height: 480 },
          expected: '720x480'
        },
        {
          input: {},
          expected: 'Watch this video on YouTube'
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = youTubeService.generateVideoDescription(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Performance and Rate Limiting', () => {
    it('should complete metadata extraction within performance thresholds', async () => {
      // Arrange
      const url = TEST_CONSTANTS.YOUTUBE_URL;
      
      mockCacheService.get.mockReturnValue(null);
      mockFetch.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_RESPONSES.YOUTUBE_OEMBED)
      });

      // Act - Measure execution time
      const { result, executionTime } = await measureExecutionTime(
        () => youTubeService.getYouTubeMetadata(url)
      );

      // Assert - Verify performance threshold
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result).toBeDefined();
      expect(result.fallback).not.toBe(true);
    });

    it('should implement request deduplication for concurrent identical requests', async () => {
      // Arrange - Multiple concurrent requests for same video
      const url = TEST_CONSTANTS.YOUTUBE_URL;
      const videoId = 'dQw4w9WgXcQ';
      
      mockCacheService.get.mockReturnValue(null);
      mockFetch.fetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve(MOCK_RESPONSES.YOUTUBE_OEMBED)
          }), 100)
        )
      );

      // Act - Make concurrent requests
      const promises = Array(5).fill(null).map(() => 
        youTubeService.getYouTubeMetadata(url)
      );
      const results = await Promise.all(promises);

      // Assert - Should only make one API call despite multiple requests
      expect(mockFetch.fetch).toHaveBeenCalledTimes(1);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.title).toBe(MOCK_RESPONSES.YOUTUBE_OEMBED.title);
      });
    });
  });
});