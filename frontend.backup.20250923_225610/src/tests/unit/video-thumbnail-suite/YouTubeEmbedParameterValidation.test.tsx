/**
 * TDD London School Test Suite: YouTube Embed Parameter Validation
 * Focus: Mock-driven behavior verification for video embed parameter handling
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import YouTubeEmbed, { extractYouTubeId, getYouTubeThumbnail } from '../../../components/YouTubeEmbed';

// Mock external dependencies following London School approach
const mockWindowOpen = vi.fn();
const mockOnPlay = vi.fn();

// Mock global window object
Object.defineProperty(window, 'open', {
  writable: true,
  value: mockWindowOpen
});

describe('YouTubeEmbed Parameter Validation (TDD London School)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('YouTube ID Extraction Contract Verification', () => {
    test('should extract video ID from standard youtube.com/watch URLs', () => {
      // Arrange: Standard YouTube URL patterns
      const testUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtube.com/watch?v=dQw4w9WgXcQ&t=30s',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123'
      ];

      testUrls.forEach(url => {
        // Act: Extract video ID
        const videoId = extractYouTubeId(url);

        // Assert: Verify correct ID extraction contract
        expect(videoId).toBe('dQw4w9WgXcQ');
      });
    });

    test('should extract video ID from shortened youtu.be URLs', () => {
      // Arrange: Shortened YouTube URLs
      const testUrls = [
        'https://youtu.be/dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ?t=30s'
      ];

      testUrls.forEach(url => {
        // Act: Extract video ID
        const videoId = extractYouTubeId(url);

        // Assert: Verify extraction behavior
        expect(videoId).toBe('dQw4w9WgXcQ');
      });
    });

    test('should extract video ID from embed URLs', () => {
      // Arrange: Embed URL patterns
      const embedUrls = [
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
        'https://youtube.com/embed/dQw4w9WgXcQ?autoplay=1'
      ];

      embedUrls.forEach(url => {
        // Act: Extract video ID
        const videoId = extractYouTubeId(url);

        // Assert: Verify extraction contract
        expect(videoId).toBe('dQw4w9WgXcQ');
      });
    });

    test('should return null for invalid YouTube URLs', () => {
      // Arrange: Invalid URLs
      const invalidUrls = [
        'https://vimeo.com/123456789',
        'https://example.com/video',
        'not-a-url',
        '',
        'https://youtube.com/invalid'
      ];

      invalidUrls.forEach(url => {
        // Act: Attempt extraction
        const videoId = extractYouTubeId(url);

        // Assert: Should fail gracefully
        expect(videoId).toBeNull();
      });
    });
  });

  describe('Thumbnail URL Generation Contract', () => {
    test('should generate correct thumbnail URLs for different quality levels', () => {
      // Arrange: Video ID and quality levels
      const videoId = 'dQw4w9WgXcQ';
      const qualityMappings = {
        'default': 'default',
        'medium': 'mqdefault',
        'high': 'hqdefault',
        'maxres': 'maxresdefault'
      };

      Object.entries(qualityMappings).forEach(([quality, expected]) => {
        // Act: Generate thumbnail URL
        const thumbnailUrl = getYouTubeThumbnail(videoId, quality);

        // Assert: Verify URL format contract
        expect(thumbnailUrl).toBe(
          `https://img.youtube.com/vi/${videoId}/${expected}.jpg`
        );
      });
    });

    test('should default to medium quality for invalid quality parameter', () => {
      // Arrange: Invalid quality parameter
      const videoId = 'dQw4w9WgXcQ';
      const invalidQualities = ['invalid', '', undefined, null];

      invalidQualities.forEach(quality => {
        // Act: Generate thumbnail with invalid quality
        const thumbnailUrl = getYouTubeThumbnail(videoId, quality as any);

        // Assert: Should default to medium quality
        expect(thumbnailUrl).toBe(
          `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
        );
      });
    });
  });

  describe('Embed Parameter Contract Verification', () => {
    test('should generate correct embed URL with default parameters', () => {
      // Arrange: Mock iframe element to capture src
      const videoId = 'dQw4w9WgXcQ';

      // Act: Render with playing state to show iframe
      render(
        <YouTubeEmbed 
          videoId={videoId} 
          showThumbnailOnly={false}
        />
      );

      // Assert: Verify iframe is rendered (which means parameters validated)
      const iframe = screen.getByTitle('YouTube Video');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src');
      
      const src = iframe.getAttribute('src');
      expect(src).toContain('youtube-nocookie.com'); // Privacy mode default
      expect(src).toContain(videoId);
    });

    test('should respect privacy mode parameter', () => {
      // Arrange: Test both privacy modes
      const videoId = 'dQw4w9WgXcQ';

      // Act: Render with privacy mode disabled
      render(
        <YouTubeEmbed 
          videoId={videoId} 
          privacyMode={false}
          showThumbnailOnly={false}
        />
      );

      // Assert: Should use regular YouTube domain
      const iframe = screen.getByTitle('YouTube Video');
      const src = iframe.getAttribute('src');
      expect(src).toContain('youtube.com');
      expect(src).not.toContain('youtube-nocookie.com');
    });

    test('should validate autoplay parameter behavior', () => {
      // Arrange: Component with autoplay enabled
      const videoId = 'dQw4w9WgXcQ';

      // Act: Render with autoplay
      render(
        <YouTubeEmbed 
          videoId={videoId} 
          autoplay={true}
          showThumbnailOnly={false}
        />
      );

      // Assert: Verify autoplay parameter in URL
      const iframe = screen.getByTitle('YouTube Video');
      const src = iframe.getAttribute('src');
      expect(src).toContain('autoplay=1');
    });

    test('should validate controls parameter behavior', () => {
      // Arrange: Component with controls disabled
      const videoId = 'dQw4w9WgXcQ';

      // Act: Render without controls
      render(
        <YouTubeEmbed 
          videoId={videoId} 
          showControls={false}
          showThumbnailOnly={false}
        />
      );

      // Assert: Verify controls parameter in URL
      const iframe = screen.getByTitle('YouTube Video');
      const src = iframe.getAttribute('src');
      expect(src).toContain('controls=0');
    });

    test('should validate mute parameter behavior', () => {
      // Arrange: Component with start muted
      const videoId = 'dQw4w9WgXcQ';

      // Act: Render with muted start
      render(
        <YouTubeEmbed 
          videoId={videoId} 
          startMuted={true}
          showThumbnailOnly={false}
        />
      );

      // Assert: Verify mute parameter in URL
      const iframe = screen.getByTitle('YouTube Video');
      const src = iframe.getAttribute('src');
      expect(src).toContain('mute=1');
    });

    test('should validate loop parameter behavior', () => {
      // Arrange: Component with loop enabled
      const videoId = 'dQw4w9WgXcQ';

      // Act: Render with loop
      render(
        <YouTubeEmbed 
          videoId={videoId} 
          enableLoop={true}
          showThumbnailOnly={false}
        />
      );

      // Assert: Verify loop and playlist parameters
      const iframe = screen.getByTitle('YouTube Video');
      const src = iframe.getAttribute('src');
      expect(src).toContain('loop=1');
      expect(src).toContain(`playlist=${videoId}`);
    });
  });

  describe('Expanded Mode Parameter Contract', () => {
    test('should enforce expanded mode parameter constraints', () => {
      // Arrange: Component in expanded mode
      const videoId = 'dQw4w9WgXcQ';

      // Act: Render in expanded mode
      render(
        <YouTubeEmbed 
          videoId={videoId} 
          expandedMode={true}
        />
      );

      // Assert: Verify expanded mode parameters
      const iframe = screen.getByTitle('YouTube Video');
      const src = iframe.getAttribute('src');
      
      // Expanded mode should force certain parameters
      expect(src).toContain('autoplay=1'); // Auto-start
      expect(src).toContain('mute=1');     // Start muted
      expect(src).toContain('loop=1');     // Auto-loop
      expect(src).toContain('disablekb=1'); // Disable keyboard
      expect(src).toContain('fs=0');       // Disable fullscreen
    });

    test('should validate iframe attributes for expanded mode', () => {
      // Arrange: Expanded mode component
      const videoId = 'dQw4w9WgXcQ';

      // Act: Render in expanded mode
      render(
        <YouTubeEmbed 
          videoId={videoId} 
          expandedMode={true}
        />
      );

      // Assert: Verify iframe behavior contracts
      const iframe = screen.getByTitle('YouTube Video');
      expect(iframe).not.toHaveAttribute('allowfullscreen'); // Should disable fullscreen
      expect(iframe.className).toContain('pointer-events-auto');
    });
  });

  describe('Parameter Validation Error Handling', () => {
    test('should handle invalid videoId parameter gracefully', () => {
      // Arrange: Invalid video IDs
      const invalidVideoIds = ['', '   ', 'invalid-id', '123', null as any, undefined as any];

      invalidVideoIds.forEach(invalidId => {
        // Act: Render with invalid ID - should not crash
        expect(() => {
          render(<YouTubeEmbed videoId={invalidId} />);
        }).not.toThrow();

        // Cleanup between renders
        document.body.innerHTML = '';
      });
    });

    test('should validate parameter combination constraints', () => {
      // Arrange: Conflicting parameters
      const videoId = 'dQw4w9WgXcQ';

      // Act: Render with conflicting settings
      render(
        <YouTubeEmbed 
          videoId={videoId} 
          showThumbnailOnly={true}
          expandedMode={true} // Conflicting with thumbnail only
        />
      );

      // Assert: expandedMode should take precedence over showThumbnailOnly
      const iframe = screen.queryByTitle('YouTube Video');
      expect(iframe).toBeInTheDocument(); // Should show video, not thumbnail
    });
  });

  describe('External Link Interaction Contract', () => {
    test('should verify external link opening behavior', async () => {
      // Arrange: Component with external link button
      const user = userEvent.setup();
      const videoId = 'dQw4w9WgXcQ';

      render(
        <YouTubeEmbed 
          videoId={videoId} 
          showThumbnailOnly={true}
        />
      );

      // Act: Click external link button
      const externalLinkButton = screen.getByTitle('Open in YouTube');
      await user.click(externalLinkButton);

      // Assert: Verify window.open was called with correct parameters
      expect(mockWindowOpen).toHaveBeenCalledWith(
        `https://www.youtube.com/watch?v=${videoId}`,
        '_blank',
        'noopener,noreferrer'
      );
    });

    test('should verify play callback contract', async () => {
      // Arrange: Component with play callback
      const user = userEvent.setup();
      const videoId = 'dQw4w9WgXcQ';

      render(
        <YouTubeEmbed 
          videoId={videoId} 
          showThumbnailOnly={true}
          onPlay={mockOnPlay}
        />
      );

      // Act: Click play button
      const playButton = screen.getByRole('button');
      await user.click(playButton);

      // Assert: Verify onPlay callback was invoked
      expect(mockOnPlay).toHaveBeenCalledTimes(1);
    });
  });
});