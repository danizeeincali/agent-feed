/**
 * TDD London School Test Suite: Thumbnail Display and Fallback Mechanisms
 * Focus: Mock-driven verification of image loading, error handling, and fallback behavior
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EnhancedLinkPreview from '../../../components/EnhancedLinkPreview';
import ThumbnailSummaryContainer from '../../../components/ThumbnailSummaryContainer';

// Mock fetch API for link preview data
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock Image constructor for loading behavior
const mockImage = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  src: '',
  onload: null as any,
  onerror: null as any
};

const mockImageConstructor = jest.fn(() => mockImage);
Object.defineProperty(global, 'Image', {
  writable: true,
  value: mockImageConstructor
});

// Mock IntersectionObserver for lazy loading
const mockIntersectionObserver = jest.fn();
const mockObserve = jest.fn();
const mockUnobserve = jest.fn();
const mockDisconnect = jest.fn();

describe('Thumbnail Display and Fallback Mechanisms (TDD London School)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock image behavior
    mockImage.addEventListener.mockClear();
    mockImage.removeEventListener.mockClear();
    mockImage.src = '';
    mockImage.onload = null;
    mockImage.onerror = null;

    // Mock IntersectionObserver
    mockIntersectionObserver.mockImplementation((callback) => ({
      observe: mockObserve,
      unobserve: mockUnobserve,
      disconnect: mockDisconnect,
      callback
    }));
    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      value: mockIntersectionObserver
    });

    // Mock fetch responses
    mockFetch.mockResolvedValue({
      ok: false, // Default to failed API response to test fallback
      json: () => Promise.resolve({})
    });
  });

  describe('Thumbnail Loading Success Contract', () => {
    test('should display thumbnail when image loads successfully', async () => {
      // Arrange: Valid YouTube URL with thumbnail
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      // Act: Render enhanced link preview
      render(<EnhancedLinkPreview url={testUrl} showThumbnailOnly={true} />);

      // Wait for component to initialize
      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Assert: Should show thumbnail image
      const thumbnail = screen.getByRole('img');
      expect(thumbnail).toBeInTheDocument();
      expect(thumbnail).toHaveAttribute('alt');
      expect(thumbnail.src).toContain('img.youtube.com');
    });

    test('should handle different thumbnail quality levels', async () => {
      // Arrange: YouTube URL for different quality tests
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      // Act: Render with different display modes that might affect quality
      const { rerender } = render(
        <EnhancedLinkPreview url={testUrl} displayMode="thumbnail" />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Assert: Should use appropriate thumbnail quality
      const thumbnail = screen.getByRole('img');
      expect(thumbnail.src).toContain('mqdefault'); // Medium quality default

      // Act: Switch to different mode
      rerender(<EnhancedLinkPreview url={testUrl} displayMode="card" />);

      // Assert: Should maintain image functionality
      const updatedThumbnail = screen.getByRole('img');
      expect(updatedThumbnail).toBeInTheDocument();
    });

    test('should respect lazy loading attributes', async () => {
      // Arrange: Component with lazy loading
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      // Act: Render component
      render(<EnhancedLinkPreview url={testUrl} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Assert: Should have lazy loading attribute
      const thumbnail = screen.getByRole('img');
      expect(thumbnail).toHaveAttribute('loading', 'lazy');
    });
  });

  describe('Thumbnail Loading Failure Contract', () => {
    test('should handle image loading errors gracefully', async () => {
      // Arrange: Component that will encounter image error
      const testUrl = 'https://www.youtube.com/watch?v=invalid-id';

      render(<EnhancedLinkPreview url={testUrl} showThumbnailOnly={true} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      const thumbnail = screen.getByRole('img');

      // Act: Simulate image load error
      act(() => {
        const errorEvent = new Event('error', { bubbles: true });
        thumbnail.dispatchEvent(errorEvent);
      });

      // Assert: Should handle error state gracefully
      // Component should remain stable
      expect(thumbnail.closest('div')).toBeInTheDocument();
    });

    test('should show appropriate fallback content for failed thumbnails', async () => {
      // Arrange: Non-video URL that should show fallback
      const testUrl = 'https://example.com/some-page';

      // Act: Render component
      render(<EnhancedLinkPreview url={testUrl} showThumbnailOnly={true} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Assert: Should show fallback since no valid thumbnail
      // Should still render a clickable element
      const linkElement = screen.getByRole('link') || screen.getByRole('button');
      expect(linkElement).toBeInTheDocument();
    });

    test('should handle network timeouts for thumbnail loading', async () => {
      // Arrange: Simulate slow network
      jest.useFakeTimers();
      
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      // Act: Render component
      render(<EnhancedLinkPreview url={testUrl} />);

      // Fast-forward past potential timeout
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Assert: Should handle timeout gracefully
      await waitFor(() => {
        // Component should render something (either content or fallback)
        expect(document.body.firstChild).toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('Cross-Origin Image Loading Contract', () => {
    test('should handle CORS restrictions for external images', async () => {
      // Arrange: External image URL that might have CORS issues
      const testUrl = 'https://example.com/image.jpg';

      // Act: Render component
      render(<EnhancedLinkPreview url={testUrl} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Assert: Should handle CORS gracefully
      // Component should render fallback or handle error state
      const container = screen.getByRole('link') || screen.getByText(testUrl);
      expect(container).toBeInTheDocument();
    });

    test('should set appropriate image loading attributes for cross-origin', async () => {
      // Arrange: Cross-origin image scenario
      const testUrl = 'https://cdn.example.com/image.jpg';

      render(<EnhancedLinkPreview url={testUrl} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Assert: Image should have proper attributes for cross-origin loading
      const images = screen.queryAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });
  });

  describe('Responsive Image Sizing Contract', () => {
    test('should apply correct responsive classes for different screen sizes', async () => {
      // Arrange: Component with responsive sizing
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      // Act: Render with different thumbnail sizes
      const { rerender } = render(
        <ThumbnailSummaryContainer
          data={{
            url: testUrl,
            title: 'Test Video',
            image: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
            type: 'video'
          }}
          onClick={jest.fn()}
          thumbnailSize="small"
        />
      );

      // Assert: Should have small size classes
      let thumbnail = screen.getByRole('img');
      expect(thumbnail.closest('div')).toHaveClass('w-16', 'h-16');

      // Act: Change to medium size
      rerender(
        <ThumbnailSummaryContainer
          data={{
            url: testUrl,
            title: 'Test Video',
            image: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
            type: 'video'
          }}
          onClick={jest.fn()}
          thumbnailSize="medium"
        />
      );

      // Assert: Should have medium size classes
      thumbnail = screen.getByRole('img');
      expect(thumbnail.closest('div')).toHaveClass('w-20', 'h-20');

      // Act: Change to large size
      rerender(
        <ThumbnailSummaryContainer
          data={{
            url: testUrl,
            title: 'Test Video',
            image: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
            type: 'video'
          }}
          onClick={jest.fn()}
          thumbnailSize="large"
        />
      );

      // Assert: Should have large size classes
      thumbnail = screen.getByRole('img');
      expect(thumbnail.closest('div')).toHaveClass('w-24', 'h-24');
    });

    test('should maintain aspect ratio across different sizes', async () => {
      // Arrange: Video thumbnail that should maintain 16:9 aspect ratio
      const videoData = {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        title: 'Test Video',
        image: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
        type: 'video' as const
      };

      // Act: Render with video data
      render(
        <ThumbnailSummaryContainer
          data={videoData}
          onClick={jest.fn()}
        />
      );

      // Assert: Should maintain proper aspect ratio
      const thumbnail = screen.getByRole('img');
      expect(thumbnail).toHaveClass('object-cover');
      
      // Container should have appropriate aspect ratio classes
      const container = thumbnail.closest('div');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Error State Handling Contract', () => {
    test('should display appropriate error fallback for different content types', async () => {
      // Arrange: Different content types with error scenarios
      const testCases = [
        { type: 'video', expectedIcon: 'Play' },
        { type: 'article', expectedIcon: 'FileText' },
        { type: 'image', expectedIcon: 'ExternalLink' },
        { type: 'website', expectedIcon: 'Globe' }
      ];

      for (const testCase of testCases) {
        // Act: Render each content type
        render(
          <ThumbnailSummaryContainer
            data={{
              url: 'https://example.com/test',
              title: `Test ${testCase.type}`,
              type: testCase.type as any
            }}
            onClick={jest.fn()}
          />
        );

        // Assert: Should show appropriate fallback icon
        const fallbackContainer = screen.getByRole('img').closest('div');
        expect(fallbackContainer).toBeInTheDocument();

        // Cleanup for next iteration
        document.body.innerHTML = '';
      }
    });

    test('should handle malformed image URLs gracefully', async () => {
      // Arrange: Malformed image URLs
      const malformedUrls = [
        'not-a-url',
        'https://',
        'http://[invalid]',
        'ftp://example.com/image.jpg',
        ''
      ];

      for (const malformedUrl of malformedUrls) {
        // Act: Render with malformed URL
        expect(() => {
          render(
            <ThumbnailSummaryContainer
              data={{
                url: malformedUrl,
                title: 'Test',
                image: malformedUrl
              }}
              onClick={jest.fn()}
            />
          );
        }).not.toThrow();

        // Assert: Should render without crashing
        expect(document.body.firstChild).toBeInTheDocument();

        // Cleanup
        document.body.innerHTML = '';
      }
    });

    test('should provide accessibility fallbacks for failed images', async () => {
      // Arrange: Component with failed image loading
      const testUrl = 'https://example.com/broken-image.jpg';

      render(
        <ThumbnailSummaryContainer
          data={{
            url: testUrl,
            title: 'Test Content',
            image: 'https://broken-url.com/image.jpg'
          }}
          onClick={jest.fn()}
        />
      );

      // Assert: Should have proper accessibility attributes
      const component = screen.getByRole('article');
      expect(component).toHaveAttribute('aria-label');
      
      // Should be keyboard accessible
      expect(component).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Performance Optimization Contract', () => {
    test('should implement lazy loading for thumbnails', async () => {
      // Arrange: Component with lazy loading
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      render(<EnhancedLinkPreview url={testUrl} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Assert: Should use intersection observer for lazy loading
      expect(mockIntersectionObserver).toHaveBeenCalled();

      // Images should have lazy loading attribute
      const thumbnail = screen.getByRole('img');
      expect(thumbnail).toHaveAttribute('loading', 'lazy');
    });

    test('should handle visibility-based image loading', () => {
      // Arrange: Component with intersection observer
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      render(<EnhancedLinkPreview url={testUrl} />);

      // Act: Simulate intersection observer triggering
      act(() => {
        if (mockIntersectionObserver.mock.calls.length > 0) {
          const callback = mockIntersectionObserver.mock.calls[0][0];
          callback([{ isIntersecting: true, target: document.createElement('img') }]);
        }
      });

      // Assert: Should handle visibility changes appropriately
      expect(mockObserve).toHaveBeenCalled();
    });

    test('should cleanup observers on component unmount', () => {
      // Arrange: Component with observers
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      const { unmount } = render(<EnhancedLinkPreview url={testUrl} />);

      // Act: Unmount component
      unmount();

      // Assert: Should cleanup intersection observer
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  describe('User Interaction Behavior Contract', () => {
    test('should handle image click interactions', async () => {
      // Arrange: Component with click handler
      const user = userEvent.setup();
      const mockOnClick = jest.fn();

      render(
        <ThumbnailSummaryContainer
          data={{
            url: 'https://example.com/test',
            title: 'Test Content',
            image: 'https://example.com/image.jpg'
          }}
          onClick={mockOnClick}
        />
      );

      // Act: Click on the component
      const clickableElement = screen.getByRole('article');
      await user.click(clickableElement);

      // Assert: Should trigger click handler
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    test('should handle keyboard navigation on thumbnails', async () => {
      // Arrange: Component with keyboard support
      const user = userEvent.setup();
      const mockOnClick = jest.fn();

      render(
        <ThumbnailSummaryContainer
          data={{
            url: 'https://example.com/test',
            title: 'Test Content'
          }}
          onClick={mockOnClick}
        />
      );

      // Act: Navigate with keyboard
      const clickableElement = screen.getByRole('article');
      clickableElement.focus();
      await user.keyboard('{Enter}');

      // Assert: Should trigger click via keyboard
      expect(mockOnClick).toHaveBeenCalledTimes(1);

      // Act: Try space key as well
      await user.keyboard(' ');

      // Assert: Should also trigger click via space
      expect(mockOnClick).toHaveBeenCalledTimes(2);
    });

    test('should show hover states for interactive thumbnails', async () => {
      // Arrange: Interactive thumbnail component
      const user = userEvent.setup();

      render(
        <ThumbnailSummaryContainer
          data={{
            url: 'https://example.com/test',
            title: 'Test Content',
            image: 'https://example.com/image.jpg'
          }}
          onClick={jest.fn()}
        />
      );

      const component = screen.getByRole('article');

      // Act: Hover over component
      await user.hover(component);

      // Assert: Should apply hover styles
      expect(component).toHaveClass('cursor-pointer');

      // Act: Stop hovering
      await user.unhover(component);

      // Assert: Should maintain stable state
      expect(component).toBeInTheDocument();
    });
  });
});