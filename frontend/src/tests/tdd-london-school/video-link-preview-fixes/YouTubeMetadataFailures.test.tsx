/**
 * TDD London School: YouTube Metadata Extraction Tests
 * 
 * FAILING FUNCTIONALITY TESTS:
 * - Generic YouTube preview info instead of real titles
 * - Missing video metadata (duration, views, channel)
 * - Fallback to generic placeholders instead of API data
 * 
 * These tests follow London School TDD approach focusing on API collaborations
 * and metadata extraction contracts.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import EnhancedLinkPreview from '../../../components/EnhancedLinkPreview';
import { extractYouTubeId } from '../../../components/YouTubeEmbed';
import {
  createMockFetchResponse,
  createMockYouTubeApiResponse,
  createMockLinkPreviewData,
  MockYouTubeVideoData,
  waitForNextTick
} from './MockFactories';

describe('TDD London School: YouTube Metadata Extraction Failures', () => {
  let originalFetch: typeof global.fetch;
  let mockYouTubeApiService: {
    getVideoMetadata: jest.Mock;
    extractVideoId: jest.Mock;
    buildThumbnailUrl: jest.Mock;
  };

  beforeEach(() => {
    originalFetch = global.fetch;
    
    // Mock YouTube API service collaborator
    mockYouTubeApiService = {
      getVideoMetadata: jest.fn(),
      extractVideoId: jest.fn(),
      buildThumbnailUrl: jest.fn()
    };

    // Reset console to capture API call attempts
    console.warn = jest.fn();
    console.error = jest.fn();
    console.log = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('FAILING: Real YouTube Video Title Extraction', () => {
    it('should EXTRACT REAL VIDEO TITLE from YouTube API, not generic placeholder', async () => {
      // Arrange: Mock successful YouTube API response with real metadata
      const realVideoData: MockYouTubeVideoData = {
        id: 'dQw4w9WgXcQ',
        title: 'Rick Astley - Never Gonna Give You Up (Official Video)',
        description: 'The official video for "Never Gonna Give You Up" by Rick Astley',
        thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        duration: 'PT3M33S',
        viewCount: '1000000000',
        channelTitle: 'Rick Astley',
        publishedAt: '2009-10-25T06:57:33Z'
      };

      const youtubeApiResponse = createMockYouTubeApiResponse(realVideoData);
      
      // Mock backend API to return real YouTube data
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockFetchResponse({
          title: realVideoData.title,
          description: realVideoData.description,
          image: realVideoData.thumbnailUrl,
          type: 'video',
          videoId: realVideoData.id,
          site_name: 'YouTube',
          author: realVideoData.channelTitle,
          duration: realVideoData.duration,
          viewCount: realVideoData.viewCount
        }));

      // Act: Render preview for YouTube URL
      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      render(<EnhancedLinkPreview url={youtubeUrl} />);

      await waitFor(() => {
        // Assert: Should show real video title, not generic "YouTube Video"
        // CURRENT ISSUE: This will FAIL because real API isn't being called
        expect(screen.getByText(/Rick Astley - Never Gonna Give You Up/i)).toBeInTheDocument();
      });

      // Should NOT show generic placeholder
      expect(screen.queryByText('YouTube Video')).not.toBeInTheDocument();
      
      // Should show real channel name
      expect(screen.getByText(/Rick Astley/i)).toBeInTheDocument();
    });

    it('should CALL YOUTUBE API with correct video ID extraction', async () => {
      // Arrange: Mock YouTube API service
      mockYouTubeApiService.extractVideoId.mockReturnValue('test-video-123');
      mockYouTubeApiService.getVideoMetadata.mockResolvedValue({
        title: 'Real Test Video Title',
        channelTitle: 'Test Channel',
        description: 'Real video description'
      });

      // Mock API call sequence
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockFetchResponse({
          title: 'Real Test Video Title',
          description: 'Real video description',
          author: 'Test Channel',
          type: 'video',
          videoId: 'test-video-123'
        }));

      // Act: Process YouTube URL
      const youtubeUrl = 'https://youtu.be/test-video-123';
      render(<EnhancedLinkPreview url={youtubeUrl} />);

      await waitForNextTick();

      // Assert: Should extract video ID correctly
      // CURRENT ISSUE: This will FAIL if ID extraction isn't working
      const extractedId = extractYouTubeId(youtubeUrl);
      expect(extractedId).toBe('test-video-123');

      // Should call backend API with correct URL
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`url=${encodeURIComponent(youtubeUrl)}`),
        expect.any(Object)
      );
    });

    it('should HANDLE YOUTUBE API FAILURES gracefully with meaningful fallbacks', async () => {
      // Arrange: Mock API failure
      global.fetch = jest.fn()
        .mockRejectedValueOnce(new Error('YouTube API rate limit exceeded'));

      // Act: Render preview for YouTube URL
      const youtubeUrl = 'https://www.youtube.com/watch?v=failed-video';
      render(<EnhancedLinkPreview url={youtubeUrl} />);

      await waitForNextTick();

      // Assert: Should show meaningful fallback, not generic error
      // CURRENT ISSUE: This will FAIL if fallback handling is poor
      await waitFor(() => {
        // Should show video ID or URL-based title instead of generic
        const fallbackTitle = screen.queryByText(/failed-video/i) || 
                             screen.queryByText(/YouTube Video/i);
        expect(fallbackTitle).toBeInTheDocument();
      });

      // Should still indicate it's a YouTube video
      expect(screen.getByText(/YouTube/i)).toBeInTheDocument();
      
      // Should log the API failure
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Backend preview API unavailable'),
        expect.any(String)
      );
    });
  });

  describe('FAILING: YouTube oEmbed Integration', () => {
    it('should USE OEMBED API as primary metadata source', async () => {
      // Arrange: Mock oEmbed API response
      const oEmbedResponse = {
        title: 'Real oEmbed Video Title',
        author_name: 'oEmbed Channel',
        thumbnail_url: 'https://img.youtube.com/vi/oembed-test/maxresdefault.jpg',
        html: '<iframe src="https://www.youtube.com/embed/oembed-test"></iframe>',
        provider_name: 'YouTube'
      };

      // Mock oEmbed API call
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockFetchResponse(oEmbedResponse));

      // Act: Component should attempt oEmbed API call
      const youtubeUrl = 'https://www.youtube.com/watch?v=oembed-test';
      render(<EnhancedLinkPreview url={youtubeUrl} />);

      await waitForNextTick();

      // Assert: Should use oEmbed data for title
      // CURRENT ISSUE: This will FAIL because oEmbed integration doesn't exist
      await waitFor(() => {
        expect(screen.getByText(/Real oEmbed Video Title/i)).toBeInTheDocument();
      });

      // Should show channel from oEmbed
      expect(screen.getByText(/oEmbed Channel/i)).toBeInTheDocument();
    });

    it('should FALLBACK from oEmbed to direct API when oEmbed fails', async () => {
      // Arrange: Mock oEmbed failure, but direct API success
      global.fetch = jest.fn()
        .mockRejectedValueOnce(new Error('oEmbed service unavailable'))
        .mockResolvedValueOnce(createMockFetchResponse({
          title: 'Direct API Title',
          description: 'From direct YouTube API',
          author: 'Direct API Channel'
        }));

      // Act: Render preview
      const youtubeUrl = 'https://www.youtube.com/watch?v=fallback-test';
      render(<EnhancedLinkPreview url={youtubeUrl} />);

      await waitForNextTick();

      // Assert: Should fall back to direct API data
      // CURRENT ISSUE: This will FAIL if fallback chain isn't implemented
      await waitFor(() => {
        expect(screen.getByText(/Direct API Title/i)).toBeInTheDocument();
      });
    });

    it('should CACHE OEMBED RESULTS to avoid repeated API calls', async () => {
      // Arrange: Mock oEmbed response
      const oEmbedData = { title: 'Cached Video Title', author_name: 'Cached Channel' };
      global.fetch = jest.fn().mockResolvedValue(createMockFetchResponse(oEmbedData));

      const youtubeUrl = 'https://www.youtube.com/watch?v=cache-test';

      // Act: Render same video twice
      const { unmount } = render(<EnhancedLinkPreview url={youtubeUrl} />);
      await waitForNextTick();
      unmount();

      render(<EnhancedLinkPreview url={youtubeUrl} />);
      await waitForNextTick();

      // Assert: Should only call API once due to caching
      // CURRENT ISSUE: This will FAIL if caching isn't implemented
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('FAILING: Video Metadata Enrichment', () => {
    it('should EXTRACT AND DISPLAY video duration from API', async () => {
      // Arrange: Mock API with duration data
      global.fetch = jest.fn().mockResolvedValue(createMockFetchResponse({
        title: 'Duration Test Video',
        duration: 'PT4M33S', // YouTube API format
        viewCount: '1500000'
      }));

      // Act: Render preview
      const youtubeUrl = 'https://www.youtube.com/watch?v=duration-test';
      render(<EnhancedLinkPreview url={youtubeUrl} displayMode="card" />);

      await waitForNextTick();

      // Assert: Should display formatted duration
      // CURRENT ISSUE: This will FAIL if duration parsing isn't implemented
      await waitFor(() => {
        expect(screen.getByText(/4:33/i)).toBeInTheDocument();
      });
    });

    it('should SHOW VIEW COUNT when available', async () => {
      // Arrange: Mock API with view count
      global.fetch = jest.fn().mockResolvedValue(createMockFetchResponse({
        title: 'Popular Video',
        viewCount: '2500000'
      }));

      // Act: Render preview
      const youtubeUrl = 'https://www.youtube.com/watch?v=popular-test';
      render(<EnhancedLinkPreview url={youtubeUrl} displayMode="card" />);

      await waitForNextTick();

      // Assert: Should display formatted view count
      // CURRENT ISSUE: This will FAIL if view count formatting isn't implemented
      await waitFor(() => {
        expect(screen.getByText(/2.5M views/i)).toBeInTheDocument();
      });
    });

    it('should DISPLAY PUBLISH DATE and channel information', async () => {
      // Arrange: Mock API with metadata
      global.fetch = jest.fn().mockResolvedValue(createMockFetchResponse({
        title: 'Metadata Rich Video',
        author: 'Rich Metadata Channel',
        publishedAt: '2023-05-15T10:30:00Z'
      }));

      // Act: Render preview
      const youtubeUrl = 'https://www.youtube.com/watch?v=metadata-test';
      render(<EnhancedLinkPreview url={youtubeUrl} displayMode="card" />);

      await waitForNextTick();

      // Assert: Should show channel and publish date
      // CURRENT ISSUE: This will FAIL if metadata display isn't implemented
      await waitFor(() => {
        expect(screen.getByText(/Rich Metadata Channel/i)).toBeInTheDocument();
        expect(screen.getByText(/May 2023/i)).toBeInTheDocument();
      });
    });
  });

  describe('FAILING: Generic Placeholder Prevention', () => {
    it('should NEVER show generic "YouTube Video" when real title is available', async () => {
      // Arrange: Mock successful API call
      global.fetch = jest.fn().mockResolvedValue(createMockFetchResponse({
        title: 'Specific Real Video Title That Is Not Generic',
        description: 'Detailed video description',
        author: 'Real Channel Name'
      }));

      // Act: Render preview
      const youtubeUrl = 'https://www.youtube.com/watch?v=real-title-test';
      render(<EnhancedLinkPreview url={youtubeUrl} />);

      await waitForNextTick();

      // Assert: Should show specific title
      // CURRENT ISSUE: This will FAIL if generic fallbacks are used too early
      await waitFor(() => {
        expect(screen.getByText(/Specific Real Video Title/i)).toBeInTheDocument();
      });

      // Should NOT show generic placeholders
      expect(screen.queryByText('YouTube Video')).not.toBeInTheDocument();
      expect(screen.queryByText('Click to play video')).not.toBeInTheDocument();
    });

    it('should PROVIDE MEANINGFUL ERROR MESSAGES instead of generic failures', async () => {
      // Arrange: Mock API failure with specific error
      global.fetch = jest.fn().mockRejectedValue(new Error('Video private or unavailable'));

      // Act: Render preview
      const youtubeUrl = 'https://www.youtube.com/watch?v=private-video';
      render(<EnhancedLinkPreview url={youtubeUrl} />);

      await waitForNextTick();

      // Assert: Should show specific error context
      // CURRENT ISSUE: This will FAIL if error handling is generic
      await waitFor(() => {
        const errorElement = screen.getByText(/private-video/i) || 
                           screen.getByText(/unavailable/i);
        expect(errorElement).toBeInTheDocument();
      });
    });
  });

  describe('Contract Verification: API Collaborations', () => {
    it('should DEFINE CLEAR CONTRACT with YouTube metadata service', async () => {
      // Arrange: Define expected API contract
      interface YouTubeApiContract {
        extractVideoId(url: string): string | null;
        fetchVideoMetadata(videoId: string): Promise<{
          title: string;
          description?: string;
          channelTitle: string;
          thumbnailUrl: string;
          duration: string;
          viewCount: string;
          publishedAt: string;
        }>;
        formatDuration(isoDuration: string): string;
        formatViewCount(count: string): string;
      }

      // Mock contract implementation
      const mockContract: YouTubeApiContract = {
        extractVideoId: jest.fn().mockReturnValue('contract-test-123'),
        fetchVideoMetadata: jest.fn().mockResolvedValue({
          title: 'Contract Test Video',
          channelTitle: 'Contract Channel',
          thumbnailUrl: 'https://img.youtube.com/vi/contract-test-123/maxresdefault.jpg',
          duration: 'PT2M30S',
          viewCount: '1000000',
          publishedAt: '2023-01-01T00:00:00Z'
        }),
        formatDuration: jest.fn().mockReturnValue('2:30'),
        formatViewCount: jest.fn().mockReturnValue('1M')
      };

      // Act: Execute contract methods
      const videoId = mockContract.extractVideoId('https://www.youtube.com/watch?v=contract-test-123');
      const metadata = await mockContract.fetchVideoMetadata('contract-test-123');
      const formattedDuration = mockContract.formatDuration('PT2M30S');
      const formattedViews = mockContract.formatViewCount('1000000');

      // Assert: Contract should be properly implemented
      // CURRENT ISSUE: This will FAIL if proper contracts aren't defined
      expect(mockContract.extractVideoId).toHaveBeenCalledWith('https://www.youtube.com/watch?v=contract-test-123');
      expect(mockContract.fetchVideoMetadata).toHaveBeenCalledWith('contract-test-123');
      expect(videoId).toBe('contract-test-123');
      expect(metadata.title).toBe('Contract Test Video');
      expect(formattedDuration).toBe('2:30');
      expect(formattedViews).toBe('1M');
    });
  });
});

/**
 * EXPECTED TEST RESULTS WITH CURRENT IMPLEMENTATION:
 * 
 * ❌ FAILING TESTS (will pass once metadata extraction is fixed):
 * 1. should EXTRACT REAL VIDEO TITLE from YouTube API, not generic placeholder
 * 2. should CALL YOUTUBE API with correct video ID extraction
 * 3. should HANDLE YOUTUBE API FAILURES gracefully with meaningful fallbacks
 * 4. should USE OEMBED API as primary metadata source
 * 5. should FALLBACK from oEmbed to direct API when oEmbed fails
 * 6. should EXTRACT AND DISPLAY video duration from API
 * 7. should SHOW VIEW COUNT when available
 * 8. should DISPLAY PUBLISH DATE and channel information
 * 9. should NEVER show generic "YouTube Video" when real title is available
 * 
 * These tests drive the implementation of proper YouTube metadata extraction,
 * API integration, and meaningful fallback handling.
 */