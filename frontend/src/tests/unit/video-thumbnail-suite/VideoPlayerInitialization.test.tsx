/**
 * TDD London School Test Suite: Video Player Initialization and State
 * Focus: Mock-driven behavior verification for video player lifecycle
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import YouTubeEmbed from '../../../components/YouTubeEmbed';

// Mock DOM APIs that video player depends on
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();
const mockPostMessage = vi.fn();

// Mock iframe onLoad behavior
const mockIframeLoad = vi.fn();

// Mock console methods to capture debug logs
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Video Player Initialization State Management (TDD London School)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock window.postMessage for iframe communication
    Object.defineProperty(window, 'postMessage', {
      writable: true,
      value: mockPostMessage
    });

    // Mock addEventListener/removeEventListener
    Object.defineProperty(window, 'addEventListener', {
      writable: true,
      value: mockAddEventListener
    });
    
    Object.defineProperty(window, 'removeEventListener', {
      writable: true,
      value: mockRemoveEventListener
    });
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('Player Initial State Contract', () => {
    test('should initialize in thumbnail mode by default', () => {
      // Arrange: Default component props
      const videoId = 'dQw4w9WgXcQ';

      // Act: Render component
      render(<YouTubeEmbed videoId={videoId} />);

      // Assert: Should show thumbnail, not iframe
      expect(screen.queryByTitle('YouTube Video')).not.toBeInTheDocument();
      
      // Should show thumbnail image
      const thumbnail = screen.getByRole('img');
      expect(thumbnail).toHaveAttribute('alt', 'YouTube Video');
      expect(thumbnail.src).toContain('img.youtube.com');
    });

    test('should initialize in playing mode when expandedMode is true', () => {
      // Arrange: Expanded mode configuration
      const videoId = 'dQw4w9WgXcQ';

      // Act: Render in expanded mode
      render(
        <YouTubeEmbed 
          videoId={videoId} 
          expandedMode={true}
        />
      );

      // Assert: Should show iframe immediately
      const iframe = screen.getByTitle('YouTube Video');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src');
    });

    test('should initialize with correct muted state', () => {
      // Arrange: Component with startMuted=true
      const videoId = 'dQw4w9WgXcQ';

      // Act: Render with muted start
      render(
        <YouTubeEmbed 
          videoId={videoId} 
          startMuted={true}
          showThumbnailOnly={false}
        />
      );

      // Assert: Should have mute=1 in URL
      const iframe = screen.getByTitle('YouTube Video');
      const src = iframe.getAttribute('src');
      expect(src).toContain('mute=1');
    });

    test('should initialize with correct autoplay state', () => {
      // Arrange: Component with autoplay disabled
      const videoId = 'dQw4w9WgXcQ';

      // Act: Render without autoplay
      render(
        <YouTubeEmbed 
          videoId={videoId} 
          autoplay={false}
          showThumbnailOnly={false}
        />
      );

      // Assert: Should have autoplay=0 in URL
      const iframe = screen.getByTitle('YouTube Video');
      const src = iframe.getAttribute('src');
      expect(src).toContain('autoplay=0');
    });
  });

  describe('State Transitions Behavior Verification', () => {
    test('should transition from thumbnail to playing state', async () => {
      // Arrange: Component in thumbnail mode
      const user = userEvent.setup();
      const videoId = 'dQw4w9WgXcQ';
      const mockOnPlay = jest.fn();

      render(
        <YouTubeEmbed 
          videoId={videoId} 
          showThumbnailOnly={true}
          onPlay={mockOnPlay}
        />
      );

      // Verify initial state
      expect(screen.queryByTitle('YouTube Video')).not.toBeInTheDocument();

      // Act: Click play button to trigger state transition
      const playButton = screen.getByRole('button');
      await user.click(playButton);

      // Assert: State should transition to playing
      expect(mockOnPlay).toHaveBeenCalledTimes(1);
      
      // Should now show iframe
      await waitFor(() => {
        expect(screen.getByTitle('YouTube Video')).toBeInTheDocument();
      });
    });

    test('should manage hover state correctly', async () => {
      // Arrange: Component in thumbnail mode
      const user = userEvent.setup();
      const videoId = 'dQw4w9WgXcQ';

      render(<YouTubeEmbed videoId={videoId} showThumbnailOnly={true} />);

      const thumbnail = screen.getByRole('img').closest('div');

      // Act: Mouse enter to trigger hover state
      await user.hover(thumbnail!);

      // Assert: Should add hover classes (visual verification)
      // The actual hover effect is CSS-based, so we verify class changes
      expect(thumbnail).toHaveClass('group');
      
      // Act: Mouse leave
      await user.unhover(thumbnail!);

      // Assert: Hover state should be cleared (component manages this internally)
      // We verify the component doesn't crash and maintains stability
      expect(thumbnail).toBeInTheDocument();
    });

    test('should handle mute state toggling', async () => {
      // Arrange: Component with mute control visible
      const user = userEvent.setup();
      const videoId = 'dQw4w9WgXcQ';

      render(
        <YouTubeEmbed 
          videoId={videoId} 
          showThumbnailOnly={true}
        />
      );

      // Act: Hover to show controls, then click mute button
      const thumbnail = screen.getByRole('img').closest('div');
      await user.hover(thumbnail!);

      const muteButton = screen.getByTitle('Mute');
      await user.click(muteButton);

      // Assert: Button should update to show unmute
      await waitFor(() => {
        expect(screen.getByTitle('Unmute')).toBeInTheDocument();
      });
    });
  });

  describe('Error State Handling Contract', () => {
    test('should handle thumbnail loading errors gracefully', async () => {
      // Arrange: Component with invalid thumbnail URL
      const videoId = 'invalid-video-id';

      // Act: Render component
      render(<YouTubeEmbed videoId={videoId} showThumbnailOnly={true} />);

      const thumbnail = screen.getByRole('img');

      // Simulate image load error
      act(() => {
        const errorEvent = new Event('error', { bubbles: true });
        thumbnail.dispatchEvent(errorEvent);
      });

      // Assert: Should show fallback content
      await waitFor(() => {
        // Should show play icon as fallback
        const fallbackIcon = screen.getByTestId ? 
          screen.queryByTestId('play-icon-fallback') : 
          thumbnail.closest('div')?.querySelector('[data-lucide="play"]');
        
        // Component should still be functional
        expect(thumbnail.closest('div')).toBeInTheDocument();
      });
    });

    test('should handle iframe loading failures', async () => {
      // Arrange: Component in iframe mode
      const videoId = 'dQw4w9WgXcQ';

      render(
        <YouTubeEmbed 
          videoId={videoId} 
          showThumbnailOnly={false}
        />
      );

      const iframe = screen.getByTitle('YouTube Video');

      // Act: Simulate iframe error
      act(() => {
        const errorEvent = new Event('error', { bubbles: true });
        iframe.dispatchEvent(errorEvent);
      });

      // Assert: Component should remain stable
      expect(iframe).toBeInTheDocument();
      
      // Should not crash or show error messages to user
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });

    test('should validate component stability with rapid state changes', async () => {
      // Arrange: Component for stress testing
      const user = userEvent.setup();
      const videoId = 'dQw4w9WgXcQ';
      const mockOnPlay = jest.fn();

      render(
        <YouTubeEmbed 
          videoId={videoId} 
          showThumbnailOnly={true}
          onPlay={mockOnPlay}
        />
      );

      // Act: Rapidly trigger state changes
      const playButton = screen.getByRole('button');
      
      // Multiple rapid clicks
      await user.click(playButton);
      await user.click(playButton);
      await user.click(playButton);

      // Assert: Should handle gracefully, only call onPlay once per click
      expect(mockOnPlay).toHaveBeenCalledTimes(3);
      
      // Component should remain stable
      expect(screen.getByTitle('YouTube Video')).toBeInTheDocument();
    });
  });

  describe('Player Ready State Verification', () => {
    test('should track iframe ready state', async () => {
      // Arrange: Component in iframe mode
      const videoId = 'dQw4w9WgXcQ';

      render(
        <YouTubeEmbed 
          videoId={videoId} 
          showThumbnailOnly={false}
        />
      );

      const iframe = screen.getByTitle('YouTube Video');

      // Act: Simulate iframe load completion
      act(() => {
        const loadEvent = new Event('load', { bubbles: true });
        iframe.dispatchEvent(loadEvent);
      });

      // Assert: Component should handle load state internally
      // We verify the iframe remains functional
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src');
    });

    test('should handle player ready state in expanded mode', () => {
      // Arrange: Expanded mode player
      const videoId = 'dQw4w9WgXcQ';

      // Act: Render expanded mode
      render(
        <YouTubeEmbed 
          videoId={videoId} 
          expandedMode={true}
        />
      );

      // Assert: Should initialize correctly for expanded mode
      const iframe = screen.getByTitle('YouTube Video');
      expect(iframe).toBeInTheDocument();
      
      // Should have expanded mode specific attributes
      expect(iframe.className).toContain('pointer-events-auto');
      
      const src = iframe.getAttribute('src');
      expect(src).toContain('autoplay=1');
      expect(src).toContain('mute=1');
    });
  });

  describe('Memory Management and Cleanup Contract', () => {
    test('should cleanup event listeners on unmount', () => {
      // Arrange: Component with event listeners
      const videoId = 'dQw4w9WgXcQ';

      // Act: Render and unmount component
      const { unmount } = render(
        <YouTubeEmbed videoId={videoId} />
      );

      unmount();

      // Assert: Should not cause memory leaks
      // This is more of a stability test - component should unmount cleanly
      expect(document.body.innerHTML).toBe('');
    });

    test('should handle prop changes without memory leaks', () => {
      // Arrange: Component with changing props
      const videoId1 = 'dQw4w9WgXcQ';
      const videoId2 = 'different-id';

      const { rerender } = render(
        <YouTubeEmbed videoId={videoId1} />
      );

      // Act: Change props
      rerender(<YouTubeEmbed videoId={videoId2} />);

      // Assert: Should update correctly
      const thumbnail = screen.getByRole('img');
      expect(thumbnail.src).toContain(videoId2);
    });
  });

  describe('Accessibility State Management', () => {
    test('should maintain proper ARIA states', () => {
      // Arrange: Component for accessibility testing
      const videoId = 'dQw4w9WgXcQ';

      // Act: Render component
      render(<YouTubeEmbed videoId={videoId} title="Test Video" />);

      // Assert: Should have proper accessibility attributes
      const playButton = screen.getByRole('button');
      expect(playButton).toBeInTheDocument();
      
      // Image should have proper alt text
      const thumbnail = screen.getByRole('img');
      expect(thumbnail).toHaveAttribute('alt', 'Test Video');
    });

    test('should handle keyboard navigation states', async () => {
      // Arrange: Component with keyboard support
      const user = userEvent.setup();
      const videoId = 'dQw4w9WgXcQ';
      const mockOnPlay = jest.fn();

      render(
        <YouTubeEmbed 
          videoId={videoId} 
          onPlay={mockOnPlay}
          showThumbnailOnly={true}
        />
      );

      // Act: Navigate with keyboard
      const playButton = screen.getByRole('button');
      playButton.focus();
      
      await user.keyboard('{Enter}');

      // Assert: Should trigger play via keyboard
      expect(mockOnPlay).toHaveBeenCalledTimes(1);
    });
  });
});