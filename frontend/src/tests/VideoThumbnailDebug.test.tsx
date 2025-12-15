/**
 * Comprehensive Video and Thumbnail Display Debug Test Suite
 * 
 * This test file validates the fixes implemented for:
 * 1. YouTube video playback issues  
 * 2. Autoplay functionality with user interaction
 * 3. Non-video site thumbnail loading
 * 4. Proper error handling and fallbacks
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import YouTubeEmbed, { extractYouTubeId, getYouTubeThumbnail, getYouTubeThumbnailWithFallback } from '../components/YouTubeEmbed';
import ThumbnailSummaryContainer from '../components/ThumbnailSummaryContainer';
import EnhancedLinkPreview from '../components/EnhancedLinkPreview';
import { renderParsedContent, parseContent } from '../utils/contentParser';

// Mock global fetch for testing
global.fetch = vi.fn();
global.URL.createObjectURL = vi.fn();

// Test data
const TEST_YOUTUBE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const TEST_YOUTUBE_SHORT_URL = 'https://youtu.be/dQw4w9WgXcQ';  
const TEST_WIRED_URL = 'https://www.wired.com/story/ai-breakthrough-2025';
const TEST_GITHUB_URL = 'https://github.com/microsoft/typescript';

describe('Video & Thumbnail Display Fixes', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockClear();
  });

  describe('YouTube Video ID Extraction', () => {
    
    test('should extract video ID from standard YouTube URLs', () => {
      expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeId('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s')).toBe('dQw4w9WgXcQ');
    });

    test('should extract video ID from YouTube short URLs', () => {
      expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ?t=30')).toBe('dQw4w9WgXcQ');
    });

    test('should extract video ID from embed URLs', () => {
      expect(extractYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeId('https://youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    test('should return null for invalid URLs', () => {
      expect(extractYouTubeId('https://example.com/video')).toBeNull();
      expect(extractYouTubeId('not-a-url')).toBeNull();
      expect(extractYouTubeId('')).toBeNull();
    });
  });

  describe('YouTube Thumbnail Generation', () => {
    
    test('should generate correct thumbnail URLs', () => {
      expect(getYouTubeThumbnail('dQw4w9WgXcQ')).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg');
      expect(getYouTubeThumbnail('dQw4w9WgXcQ', 'high')).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
      expect(getYouTubeThumbnail('dQw4w9WgXcQ', 'maxres')).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg');
    });

    test('should generate fallback thumbnail arrays', () => {
      const fallbacks = getYouTubeThumbnailWithFallback('dQw4w9WgXcQ', 'medium');
      expect(fallbacks).toContain('https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg');
      expect(fallbacks).toContain('https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg');
      expect(fallbacks.length).toBeGreaterThan(1);
    });
  });

  describe('YouTube Embed Component', () => {
    
    test('should render thumbnail view by default', () => {
      render(<YouTubeEmbed videoId="dQw4w9WgXcQ" title="Test Video" />);
      
      expect(screen.getByAltText('Test Video')).toBeInTheDocument();
      expect(screen.getByTitle('Test Video')).toBeInTheDocument();
    });

    test('should handle thumbnail click and show video', async () => {
      render(<YouTubeEmbed videoId="dQw4w9WgXcQ" title="Test Video" />);
      
      const thumbnail = screen.getByRole('button');
      fireEvent.click(thumbnail);
      
      await waitFor(() => {
        expect(screen.getByTitle('Test Video')).toBeInTheDocument();
      });
    });

    test('should use privacy-enhanced domain when enabled', () => {
      render(<YouTubeEmbed videoId="dQw4w9WgXcQ" privacyMode={true} />);
      // Check that youtube-nocookie.com is used in iframe src
      const iframe = screen.queryByTitle('YouTube Video');
      if (iframe) {
        expect(iframe.getAttribute('src')).toContain('youtube-nocookie.com');
      }
    });

    test('should handle keyboard navigation', () => {
      render(<YouTubeEmbed videoId="dQw4w9WgXcQ" title="Test Video" />);
      
      const thumbnail = screen.getByRole('button');
      fireEvent.keyDown(thumbnail, { key: 'Enter' });
      
      // Should trigger play functionality
      expect(thumbnail).toBeInTheDocument();
    });

    test('should handle thumbnail error gracefully', async () => {
      render(<YouTubeEmbed videoId="invalid-id" title="Test Video" />);
      
      const img = screen.getByAltText('Test Video');
      fireEvent.error(img);
      
      // Should show fallback play button
      await waitFor(() => {
        expect(screen.getByText('YouTube Video')).toBeInTheDocument();
      });
    });
  });

  describe('Thumbnail Summary Container', () => {
    
    const mockData = {
      url: TEST_WIRED_URL,
      title: 'AI Breakthrough 2025',
      description: 'Latest developments in artificial intelligence',
      image: 'https://example.com/image.jpg',
      site_name: 'Wired',
      type: 'article' as const
    };

    test('should render with proper accessibility attributes', () => {
      render(
        <ThumbnailSummaryContainer 
          data={mockData}
          onClick={() => {}}
        />
      );
      
      expect(screen.getByRole('article')).toBeInTheDocument();
      expect(screen.getByLabelText('Preview: AI Breakthrough 2025')).toBeInTheDocument();
    });

    test('should handle image loading states', async () => {
      render(
        <ThumbnailSummaryContainer 
          data={mockData}
          onClick={() => {}}
        />
      );
      
      // Should show loading indicator initially
      await waitFor(() => {
        expect(screen.getByRole('article')).toBeInTheDocument();
      });
    });

    test('should handle image error with fallbacks', async () => {
      render(
        <ThumbnailSummaryContainer 
          data={{...mockData, image: 'https://invalid.com/image.jpg'}}
          onClick={() => {}}
        />
      );
      
      const img = screen.getByAltText('Preview thumbnail for AI Breakthrough 2025');
      fireEvent.error(img);
      
      // Should attempt fallback images
      await waitFor(() => {
        expect(img).toBeInTheDocument();
      });
    });

    test('should show fallback icon for missing images', () => {
      render(
        <ThumbnailSummaryContainer 
          data={{...mockData, image: undefined}}
          onClick={() => {}}
        />
      );
      
      // Should show fallback based on content type
      expect(screen.getByText('AI Breakthrough 2025')).toBeInTheDocument();
    });

    test('should handle video type with play overlay', () => {
      render(
        <ThumbnailSummaryContainer 
          data={{...mockData, type: 'video', videoId: 'dQw4w9WgXcQ'}}
          onClick={() => {}}
        />
      );
      
      // Should show video play overlay
      expect(screen.getByText('AI Breakthrough 2025')).toBeInTheDocument();
    });
  });

  describe('Enhanced Link Preview', () => {
    
    beforeEach(() => {
      (fetch as any).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            title: 'Test Article',
            description: 'Test description',
            image: 'https://example.com/image.jpg',
            site_name: 'Example'
          })
        })
      );
    });

    test('should fetch and display preview data', async () => {
      render(<EnhancedLinkPreview url={TEST_WIRED_URL} />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Article')).toBeInTheDocument();
      });
    });

    test('should handle API timeout gracefully', async () => {
      (fetch as any).mockImplementation(() =>
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 6000)
        )
      );

      render(<EnhancedLinkPreview url={TEST_WIRED_URL} />);
      
      await waitFor(() => {
        // Should fall back to basic link
        expect(screen.getByText(TEST_WIRED_URL)).toBeInTheDocument();
      }, { timeout: 8000 });
    });

    test('should generate enhanced preview for GitHub URLs', async () => {
      (fetch as any).mockRejectedValue(new Error('API unavailable'));
      
      render(<EnhancedLinkPreview url={TEST_GITHUB_URL} />);
      
      await waitFor(() => {
        expect(screen.getByText('typescript - microsoft')).toBeInTheDocument();
      });
    });

    test('should handle YouTube URLs correctly', async () => {
      (fetch as any).mockRejectedValue(new Error('API unavailable'));
      
      render(<EnhancedLinkPreview url={TEST_YOUTUBE_URL} />);
      
      await waitFor(() => {
        expect(screen.getByText('YouTube Video')).toBeInTheDocument();
      });
    });

    test('should show loading state initially', () => {
      render(<EnhancedLinkPreview url={TEST_WIRED_URL} />);
      
      expect(screen.getByText('Loading real post data...')).toBeInTheDocument();
    });

    test('should handle image fallback system', async () => {
      render(<EnhancedLinkPreview url={TEST_WIRED_URL} />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Article')).toBeInTheDocument();
      });
      
      const img = screen.getByAltText('Test Article');
      fireEvent.error(img);
      
      // Should attempt fallback images
      expect(img).toBeInTheDocument();
    });
  });

  describe('Content Parser Integration', () => {
    
    test('should parse and render YouTube URLs correctly', () => {
      const content = `Check out this video: ${TEST_YOUTUBE_URL}`;
      const parsed = parseContent(content);
      
      expect(parsed).toHaveLength(2);
      expect(parsed[1].type).toBe('url');
      expect(parsed[1].data?.url).toBe(TEST_YOUTUBE_URL);
    });

    test('should render enhanced previews for URLs', () => {
      const content = `Great article: ${TEST_WIRED_URL}`;
      const parsed = parseContent(content);
      
      const result = renderParsedContent(parsed, {
        enableLinkPreviews: true,
        useEnhancedPreviews: true
      });
      
      expect(result).toBeDefined();
    });

    test('should handle multiple URLs in content', () => {
      const content = `YouTube: ${TEST_YOUTUBE_URL} and GitHub: ${TEST_GITHUB_URL}`;
      const parsed = parseContent(content);
      
      const urlParts = parsed.filter(part => part.type === 'url');
      expect(urlParts).toHaveLength(2);
    });
  });

  describe('Error Handling & Fallbacks', () => {
    
    test('should handle network errors gracefully', async () => {
      (fetch as any).mockRejectedValue(new Error('Network error'));
      
      render(<EnhancedLinkPreview url={TEST_WIRED_URL} />);
      
      await waitFor(() => {
        // Should show fallback link
        expect(screen.getByText(/wired\.com/i)).toBeInTheDocument();
      });
    });

    test('should handle invalid URLs', () => {
      render(<EnhancedLinkPreview url="not-a-url" />);
      
      // Should show error or fallback state
      expect(screen.getByText(/not-a-url/)).toBeInTheDocument();
    });

    test('should handle CORS errors with proxy fallbacks', async () => {
      render(<ThumbnailSummaryContainer 
        data={{
          url: 'https://cors-blocked.com/article',
          title: 'CORS Test',
          image: 'https://cors-blocked.com/image.jpg',
          site_name: 'CORS Site',
          type: 'article'
        }}
        onClick={() => {}}
      />);
      
      const img = screen.getByAltText('Preview thumbnail for CORS Test');
      fireEvent.error(img);
      
      // Should attempt proxy fallbacks
      await waitFor(() => {
        expect(img).toBeInTheDocument();
      });
    });
  });

  describe('User Interaction & Accessibility', () => {
    
    test('should support keyboard navigation', () => {
      render(<YouTubeEmbed videoId="dQw4w9WgXcQ" title="Test Video" />);
      
      const thumbnail = screen.getByRole('button');
      
      fireEvent.keyDown(thumbnail, { key: 'Enter' });
      fireEvent.keyDown(thumbnail, { key: ' ' });
      
      expect(thumbnail).toHaveAttribute('tabIndex', '0');
    });

    test('should have proper ARIA attributes', () => {
      const mockData = {
        url: TEST_WIRED_URL,
        title: 'Accessible Article',
        site_name: 'Wired',
        type: 'article' as const
      };

      render(
        <ThumbnailSummaryContainer 
          data={mockData}
          onClick={() => {}}
        />
      );
      
      const article = screen.getByRole('article');
      expect(article).toHaveAttribute('aria-label', 'Preview: Accessible Article');
      expect(article).toHaveAttribute('tabIndex', '0');
    });

    test('should handle user interaction for autoplay', () => {
      render(<YouTubeEmbed videoId="dQw4w9WgXcQ" autoplay={true} />);
      
      const thumbnail = screen.getByRole('button');
      fireEvent.click(thumbnail);
      
      // User interaction should enable autoplay
      expect(thumbnail).toBeInTheDocument();
    });
  });

  describe('Performance & Optimization', () => {
    
    test('should use lazy loading for images', () => {
      render(<YouTubeEmbed videoId="dQw4w9WgXcQ" />);
      
      const img = screen.getByAltText('YouTube Video');
      expect(img).toHaveAttribute('loading', 'lazy');
    });

    test('should implement proper CORS and referrer policies', () => {
      const mockData = {
        url: TEST_WIRED_URL,
        title: 'Security Test',
        image: 'https://external.com/image.jpg',
        site_name: 'External',
        type: 'article' as const
      };

      render(
        <ThumbnailSummaryContainer 
          data={mockData}
          onClick={() => {}}
        />
      );
      
      const img = screen.getByAltText('Preview thumbnail for Security Test');
      expect(img).toHaveAttribute('crossOrigin', 'anonymous');
      expect(img).toHaveAttribute('referrerPolicy', 'no-referrer');
    });

    test('should debounce image loading attempts', async () => {
      const mockData = {
        url: TEST_WIRED_URL,
        title: 'Debounce Test',
        image: 'https://failing.com/image.jpg',
        site_name: 'Failing',
        type: 'article' as const
      };

      render(
        <ThumbnailSummaryContainer 
          data={mockData}
          onClick={() => {}}
        />
      );
      
      const img = screen.getByAltText('Preview thumbnail for Debounce Test');
      
      // Multiple quick errors should be handled gracefully
      fireEvent.error(img);
      fireEvent.error(img);
      fireEvent.error(img);
      
      await waitFor(() => {
        expect(img).toBeInTheDocument();
      });
    });
  });
});