/**
 * London School TDD Unit Tests for LinkPreviewService
 * Focus: Behavior verification through mock interactions
 */

import { jest } from '@jest/globals';
import { LinkPreviewService } from '../../../src/services/LinkPreviewService.js';
import { 
  TEST_CONSTANTS, 
  MOCK_RESPONSES, 
  createSwarmMock, 
  verifySwarmContract,
  verifyInteractionSequence 
} from '../setup.js';

describe('LinkPreviewService - London School TDD', () => {
  let linkPreviewService;
  let mockDatabaseService;
  let mockFetch;
  let mockJSDOM;
  let mockYouTubeService;

  beforeEach(() => {
    // Create swarm mocks for all dependencies
    mockDatabaseService = createSwarmMock('DatabaseService', {
      getCachedLinkPreview: jest.fn(),
      cacheLinkPreview: jest.fn(),
      prepare: jest.fn(() => ({
        run: jest.fn(() => ({ changes: 0 }))
      }))
    });

    mockFetch = createSwarmMock('FetchService', {
      fetch: jest.fn()
    });
    
    mockJSDOM = createSwarmMock('JSDOM', {
      constructor: jest.fn(),
      window: {
        document: {
          querySelector: jest.fn(),
          querySelectorAll: jest.fn()
        }
      }
    });

    mockYouTubeService = createSwarmMock('YouTubeService', {
      extractVideoId: jest.fn(),
      getYouTubeMetadata: jest.fn(),
      clearExpiredCache: jest.fn()
    });

    // Mock the global fetch
    global.fetch = mockFetch.fetch;
    
    // Create service instance with mocked dependencies
    linkPreviewService = new LinkPreviewService();
    
    // Inject mocked dependencies
    linkPreviewService.databaseService = mockDatabaseService;
    linkPreviewService.youtubeService = mockYouTubeService;
  });

  describe('Contract Definition: Basic Link Preview Workflow', () => {
    it('should define correct collaboration contracts for link preview generation', () => {
      // Verify that the service defines expected contracts with its collaborators
      expect(mockDatabaseService._contractDefinition.methods).toContain('getCachedLinkPreview');
      expect(mockDatabaseService._contractDefinition.methods).toContain('cacheLinkPreview');
      expect(mockYouTubeService._contractDefinition.methods).toContain('getYouTubeMetadata');
    });
  });

  describe('Outside-In: Link Preview Generation Flow', () => {
    it('should coordinate with cache service before fetching new previews', async () => {
      // Arrange - Setup behavior expectations
      const url = TEST_CONSTANTS.GENERIC_URL;
      const cachedPreview = null; // Cache miss scenario
      const expectedPreview = {
        title: 'Test Title',
        description: 'Test Description',
        image: 'https://example.com/image.jpg',
        type: 'website'
      };

      mockDatabaseService.getCachedLinkPreview.mockResolvedValue(cachedPreview);
      mockDatabaseService.cacheLinkPreview.mockResolvedValue(true);
      
      mockFetch.fetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(MOCK_RESPONSES.GENERIC_HTML),
        headers: { get: () => 'text/html' }
      });

      // Act - Execute the workflow
      const result = await linkPreviewService.getLinkPreview(url);

      // Assert - Verify collaboration sequence
      verifyInteractionSequence({
        database: mockDatabaseService,
        fetch: mockFetch
      }, [
        { mock: 'database', method: 'getCachedLinkPreview' },
        { mock: 'fetch', method: 'fetch' },
        { mock: 'database', method: 'cacheLinkPreview' }
      ]);

      // Verify the conversation between objects
      expect(mockDatabaseService.getCachedLinkPreview).toHaveBeenCalledWith(url);
      expect(mockFetch.fetch).toHaveBeenCalledWith(url, expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'User-Agent': expect.stringContaining('AgentFeed')
        }),
        timeout: 15000
      }));
      expect(mockDatabaseService.cacheLinkPreview).toHaveBeenCalledWith(url, expect.any(Object));
    });

    it('should skip fetch when cache hit occurs', async () => {
      // Arrange - Cache hit scenario
      const url = TEST_CONSTANTS.GENERIC_URL;
      const cachedPreview = {
        title: 'Cached Title',
        description: 'Cached Description',
        image: 'https://cached.com/image.jpg',
        type: 'website'
      };

      mockDatabaseService.getCachedLinkPreview.mockResolvedValue(cachedPreview);

      // Act
      const result = await linkPreviewService.getLinkPreview(url);

      // Assert - Verify fetch was NOT called (behavior verification)
      expect(mockDatabaseService.getCachedLinkPreview).toHaveBeenCalledWith(url);
      expect(mockFetch.fetch).not.toHaveBeenCalled();
      expect(result).toBe(cachedPreview);
    });
  });

  describe('YouTube Handler Collaboration', () => {
    it('should delegate YouTube URLs to specialized YouTube service', async () => {
      // Arrange
      const youtubeUrl = TEST_CONSTANTS.YOUTUBE_URL;
      const youtubePreview = {
        title: 'YouTube Video',
        description: 'Video by Test Channel',
        type: 'video',
        videoId: 'dQw4w9WgXcQ'
      };

      mockDatabaseService.getCachedLinkPreview.mockResolvedValue(null);
      mockYouTubeService.getYouTubeMetadata.mockResolvedValue(youtubePreview);
      mockDatabaseService.cacheLinkPreview.mockResolvedValue(true);

      // Act
      const result = await linkPreviewService.getLinkPreview(youtubeUrl);

      // Assert - Verify YouTube-specific workflow
      verifySwarmContract(mockYouTubeService, [
        { method: 'getYouTubeMetadata', calls: [[youtubeUrl]] }
      ]);
      
      verifySwarmContract(mockDatabaseService, [
        { method: 'getCachedLinkPreview', calls: [[youtubeUrl]] },
        { method: 'cacheLinkPreview', calls: [[youtubeUrl, expect.any(Object)]] }
      ]);

      // Verify fetch service was NOT used for YouTube
      expect(mockFetch.fetch).not.toHaveBeenCalled();
    });

    it('should handle YouTube service failures gracefully', async () => {
      // Arrange - YouTube service failure scenario
      const youtubeUrl = TEST_CONSTANTS.YOUTUBE_URL;
      const youtubeError = new Error('YouTube API unavailable');

      mockDatabaseService.getCachedLinkPreview.mockResolvedValue(null);
      mockYouTubeService.getYouTubeMetadata.mockRejectedValue(youtubeError);

      // Act
      const result = await linkPreviewService.getLinkPreview(youtubeUrl);

      // Assert - Verify fallback behavior
      expect(result).toMatchObject({
        title: expect.stringContaining('YouTube'),
        type: 'video',
        fallback: true,
        error: youtubeError.message
      });
      
      // Verify error was handled and not propagated
      expect(mockYouTubeService.getYouTubeMetadata).toHaveBeenCalledWith(youtubeUrl);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle network timeouts with appropriate fallback', async () => {
      // Arrange - Network timeout scenario
      const url = TEST_CONSTANTS.GENERIC_URL;
      const timeoutError = new Error('Request timeout');
      
      mockDatabaseService.getCachedLinkPreview.mockResolvedValue(null);
      mockFetch.fetch.mockRejectedValue(timeoutError);

      // Act
      const result = await linkPreviewService.getLinkPreview(url);

      // Assert - Verify graceful degradation
      expect(result).toMatchObject({
        title: 'example.com',
        description: 'Unable to fetch preview',
        type: 'website',
        error: timeoutError.message
      });

      // Verify collaboration attempted before fallback
      expect(mockDatabaseService.getCachedLinkPreview).toHaveBeenCalledWith(url);
      expect(mockFetch.fetch).toHaveBeenCalledWith(url, expect.any(Object));
    });

    it('should handle invalid URLs by returning error preview', async () => {
      // Arrange
      const invalidUrl = TEST_CONSTANTS.INVALID_URL;

      // Act
      const result = await linkPreviewService.getLinkPreview(invalidUrl);

      // Assert - Verify early validation prevents unnecessary calls
      expect(result).toMatchObject({
        title: 'Unknown Website',
        description: 'Unable to fetch preview',
        error: 'Invalid URL provided'
      });

      // Verify no external calls made for invalid URLs
      expect(mockDatabaseService.getCachedLinkPreview).not.toHaveBeenCalled();
      expect(mockFetch.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Cache Management Behavior', () => {
    it('should coordinate cache expiration across all services', async () => {
      // Arrange
      const dbCacheCleared = 5;
      const youtubeCacheCleared = 3;
      
      mockDatabaseService.prepare().run.mockReturnValue({ changes: dbCacheCleared });
      mockYouTubeService.clearExpiredCache.mockReturnValue(youtubeCacheCleared);

      // Act
      const totalCleared = await linkPreviewService.clearExpiredCache();

      // Assert - Verify coordination between cache services
      expect(mockDatabaseService.prepare).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM link_preview_cache')
      );
      expect(mockYouTubeService.clearExpiredCache).toHaveBeenCalled();
      expect(totalCleared).toBe(dbCacheCleared + youtubeCacheCleared);
    });
  });

  describe('Content Type Detection and Routing', () => {
    it('should route different content types to appropriate handlers', async () => {
      // Test data for different content types
      const contentTypeTests = [
        {
          url: 'https://example.com/image.jpg',
          contentType: 'image/jpeg',
          expectedType: 'image'
        },
        {
          url: 'https://example.com/video.mp4', 
          contentType: 'video/mp4',
          expectedType: 'video'
        },
        {
          url: 'https://example.com/document.pdf',
          contentType: 'application/pdf',
          expectedType: 'file'
        }
      ];

      for (const testCase of contentTypeTests) {
        // Arrange
        mockDatabaseService.getCachedLinkPreview.mockResolvedValue(null);
        mockFetch.fetch.mockResolvedValue({
          ok: true,
          headers: { get: () => testCase.contentType },
          text: () => Promise.resolve('')
        });

        // Act
        const result = await linkPreviewService.getLinkPreview(testCase.url);

        // Assert
        expect(result.type).toBe(testCase.expectedType);
        
        // Reset mocks for next iteration
        jest.clearAllMocks();
      }
    });
  });

  describe('URL Validation and Security', () => {
    it('should reject malicious URLs and prevent SSRF attacks', async () => {
      const maliciousUrls = [
        'javascript:alert(1)',
        'file:///etc/passwd',
        'ftp://internal.server.com',
        'data:text/html,<script>alert(1)</script>'
      ];

      for (const maliciousUrl of maliciousUrls) {
        // Act
        const result = await linkPreviewService.getLinkPreview(maliciousUrl);

        // Assert - Verify malicious URLs are rejected
        expect(result).toMatchObject({
          error: 'Invalid URL provided'
        });

        // Verify no external calls made
        expect(mockFetch.fetch).not.toHaveBeenCalled();
      }
    });
  });

  describe('Performance and Resource Management', () => {
    it('should enforce request size limits to prevent DoS', async () => {
      // Arrange - Large response scenario
      const url = TEST_CONSTANTS.GENERIC_URL;
      
      mockDatabaseService.getCachedLinkPreview.mockResolvedValue(null);
      mockFetch.fetch.mockResolvedValue({
        ok: true,
        headers: { get: () => 'text/html' },
        text: () => Promise.resolve(MOCK_RESPONSES.GENERIC_HTML)
      });

      // Act
      await linkPreviewService.getLinkPreview(url);

      // Assert - Verify size limit configuration
      expect(mockFetch.fetch).toHaveBeenCalledWith(url, expect.objectContaining({
        size: 5 * 1024 * 1024 // 5MB limit
      }));
    });

    it('should enforce request timeouts to prevent hanging', async () => {
      // Arrange
      const url = TEST_CONSTANTS.GENERIC_URL;
      
      mockDatabaseService.getCachedLinkPreview.mockResolvedValue(null);

      // Act
      await linkPreviewService.getLinkPreview(url);

      // Assert - Verify timeout configuration
      expect(mockFetch.fetch).toHaveBeenCalledWith(url, expect.objectContaining({
        timeout: 15000
      }));
    });
  });
});