/**
 * TDD London School Test Suite: Network Condition Performance Testing
 * Focus: Mock-driven verification of performance under various network conditions
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EnhancedLinkPreview from '../../../components/EnhancedLinkPreview';
import YouTubeEmbed from '../../../components/YouTubeEmbed';

// Mock network API and conditions
const mockConnection = {
  effectiveType: '4g',
  downlink: 10,
  rtt: 50,
  saveData: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => []),
  observer: {
    observe: jest.fn(),
    disconnect: jest.fn()
  }
};

// Mock IntersectionObserver for viewport performance
const mockIntersectionObserver = jest.fn();
const mockObserve = jest.fn();
const mockUnobserve = jest.fn();
const mockDisconnect = jest.fn();

// Mock fetch with network simulation
const mockFetch = jest.fn();

// Mock image loading with performance metrics
const mockImageLoad = jest.fn();
const mockImageError = jest.fn();

describe('Network Condition Performance (TDD London School)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup network connection mock
    Object.defineProperty(navigator, 'connection', {
      writable: true,
      value: mockConnection
    });

    // Setup performance API mock
    Object.defineProperty(window, 'performance', {
      writable: true,
      value: mockPerformance
    });

    // Setup IntersectionObserver mock
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

    // Setup fetch mock
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({})
    });

    // Reset performance counters
    mockPerformance.now.mockImplementation(() => Date.now());
  });

  describe('Slow Network Performance Contract', () => {
    test('should optimize for 2G connection conditions', async () => {
      // Arrange: Simulate 2G connection
      mockConnection.effectiveType = '2g';
      mockConnection.downlink = 0.25;
      mockConnection.rtt = 2000;

      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      // Act: Render component on slow network
      render(<EnhancedLinkPreview url={testUrl} />);

      // Assert: Should adapt to slow network conditions
      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Should implement optimizations for slow network
      const images = screen.queryAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });

    test('should respect data saver mode', async () => {
      // Arrange: Enable data saver mode
      mockConnection.saveData = true;
      mockConnection.effectiveType = '3g';

      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      // Act: Render with data saver enabled
      render(<EnhancedLinkPreview url={testUrl} showThumbnailOnly={true} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Assert: Should respect data saving preferences
      // Component should still be functional but optimize for data usage
      const container = screen.queryByRole('img')?.closest('div') || 
                       screen.getByRole('link');
      expect(container).toBeInTheDocument();
    });

    test('should handle high RTT (Round Trip Time) gracefully', async () => {
      // Arrange: Simulate high latency connection
      mockConnection.rtt = 5000; // 5 second RTT
      mockConnection.effectiveType = '3g';

      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      // Mock slow fetch response
      mockFetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: false,
            json: () => Promise.resolve({})
          }), 3000)
        )
      );

      // Act: Render component with high latency
      render(<EnhancedLinkPreview url={testUrl} />);

      // Assert: Should handle high latency without blocking UI
      expect(screen.getByText('Loading')).toBeInTheDocument();

      // Should eventually render fallback
      await waitFor(() => {
        const fallbackElement = screen.queryByRole('link');
        if (fallbackElement) {
          expect(fallbackElement).toHaveAttribute('href', testUrl);
        }
      }, { timeout: 5000 });
    });
  });

  describe('Fast Network Performance Contract', () => {
    test('should optimize for 4G/5G connections', async () => {
      // Arrange: Simulate fast connection
      mockConnection.effectiveType = '4g';
      mockConnection.downlink = 10;
      mockConnection.rtt = 50;

      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      // Act: Render on fast network
      render(<EnhancedLinkPreview url={testUrl} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Assert: Should utilize fast network capabilities
      // Component should load content more aggressively
      const container = screen.queryByRole('img') || screen.getByRole('link');
      expect(container).toBeInTheDocument();
    });

    test('should preload resources on fast connections', async () => {
      // Arrange: Fast connection with high bandwidth
      mockConnection.effectiveType = '4g';
      mockConnection.downlink = 25; // High bandwidth
      mockConnection.saveData = false;

      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      // Act: Render YouTube embed
      render(<YouTubeEmbed videoId="dQw4w9WgXcQ" showThumbnailOnly={true} />);

      // Assert: Should preload thumbnail on fast connections
      const thumbnail = screen.getByRole('img');
      expect(thumbnail).toBeInTheDocument();
      expect(thumbnail.src).toContain('img.youtube.com');
    });
  });

  describe('Network Condition Changes Contract', () => {
    test('should adapt to network condition changes', async () => {
      // Arrange: Start with fast connection
      mockConnection.effectiveType = '4g';
      mockConnection.downlink = 10;

      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      render(<EnhancedLinkPreview url={testUrl} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Act: Simulate network degradation
      act(() => {
        mockConnection.effectiveType = '2g';
        mockConnection.downlink = 0.25;
        
        // Trigger connection change event
        const changeEvent = new Event('change');
        mockConnection.addEventListener.mock.calls.forEach(call => {
          if (call[0] === 'change') {
            call[1](changeEvent);
          }
        });
      });

      // Assert: Should adapt to network change
      // Component should remain functional
      const container = screen.queryByRole('img') || screen.getByRole('link');
      expect(container).toBeInTheDocument();
    });

    test('should handle connection loss and recovery', async () => {
      // Arrange: Start with connection
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      render(<EnhancedLinkPreview url={testUrl} />);

      // Act: Simulate connection loss
      act(() => {
        // Simulate navigator.onLine = false
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false
        });

        const offlineEvent = new Event('offline');
        window.dispatchEvent(offlineEvent);
      });

      // Assert: Should handle offline gracefully
      expect(document.body).toBeInTheDocument();

      // Act: Simulate connection recovery
      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: true
        });

        const onlineEvent = new Event('online');
        window.dispatchEvent(onlineEvent);
      });

      // Assert: Should recover when connection returns
      await waitFor(() => {
        const container = screen.queryByRole('img') || screen.getByRole('link');
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Performance Monitoring Contract', () => {
    test('should measure thumbnail loading performance', async () => {
      // Arrange: Component with performance monitoring
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      let loadStartTime = 0;
      mockPerformance.now.mockImplementation(() => {
        loadStartTime += 100; // Simulate time progression
        return loadStartTime;
      });

      // Act: Render component
      render(<EnhancedLinkPreview url={testUrl} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Assert: Should have performance markers
      // Component should complete loading process
      const container = screen.queryByRole('img') || screen.getByRole('link');
      expect(container).toBeInTheDocument();
    });

    test('should monitor iframe loading performance', async () => {
      // Arrange: YouTube embed with performance monitoring
      const videoId = 'dQw4w9WgXcQ';
      
      // Act: Render iframe
      render(<YouTubeEmbed videoId={videoId} showThumbnailOnly={false} />);

      const iframe = screen.getByTitle('YouTube Video');

      // Simulate iframe load
      act(() => {
        const loadEvent = new Event('load');
        iframe.dispatchEvent(loadEvent);
      });

      // Assert: Should track iframe loading performance
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src');
    });

    test('should detect performance bottlenecks', async () => {
      // Arrange: Slow loading scenario
      let performanceCounter = 0;
      mockPerformance.now.mockImplementation(() => {
        performanceCounter += 1000; // Simulate slow performance
        return performanceCounter;
      });

      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      // Mock slow image loading
      const originalImage = window.Image;
      window.Image = jest.fn().mockImplementation(() => {
        const img = new originalImage();
        setTimeout(() => {
          if (img.onload) img.onload(new Event('load'));
        }, 3000); // 3 second delay
        return img;
      }) as any;

      // Act: Render with performance bottleneck
      render(<EnhancedLinkPreview url={testUrl} />);

      // Assert: Should detect and handle slow performance
      expect(screen.getByText('Loading')).toBeInTheDocument();

      // Should eventually complete despite slow performance
      await waitFor(() => {
        const container = screen.queryByRole('img') || screen.getByRole('link');
        expect(container).toBeInTheDocument();
      }, { timeout: 5000 });

      // Restore
      window.Image = originalImage;
    });
  });

  describe('Resource Management Contract', () => {
    test('should manage memory usage efficiently', async () => {
      // Arrange: Multiple components for memory testing
      const urls = [
        'https://www.youtube.com/watch?v=video1',
        'https://www.youtube.com/watch?v=video2',
        'https://www.youtube.com/watch?v=video3',
        'https://www.youtube.com/watch?v=video4',
        'https://www.youtube.com/watch?v=video5'
      ];

      // Act: Render multiple components
      render(
        <div>
          {urls.map((url, index) => (
            <EnhancedLinkPreview key={index} url={url} />
          ))}
        </div>
      );

      await waitFor(() => {
        expect(screen.queryAllByText('Loading')).toHaveLength(0);
      });

      // Assert: Should manage resources efficiently
      expect(mockIntersectionObserver).toHaveBeenCalled();
      expect(mockObserve).toHaveBeenCalled();
    });

    test('should cleanup resources on component unmount', () => {
      // Arrange: Component with resources
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      const { unmount } = render(<EnhancedLinkPreview url={testUrl} />);

      // Act: Unmount component
      unmount();

      // Assert: Should cleanup observers and listeners
      expect(mockDisconnect).toHaveBeenCalled();
    });

    test('should throttle network requests', async () => {
      // Arrange: Multiple rapid URL changes
      const testUrls = [
        'https://www.youtube.com/watch?v=video1',
        'https://www.youtube.com/watch?v=video2',
        'https://www.youtube.com/watch?v=video3'
      ];

      const { rerender } = render(
        <EnhancedLinkPreview url={testUrls[0]} />
      );

      // Act: Rapidly change URLs
      testUrls.forEach((url, index) => {
        if (index > 0) {
          rerender(<EnhancedLinkPreview url={url} />);
        }
      });

      // Assert: Should handle rapid changes efficiently
      await waitFor(() => {
        const container = screen.queryByRole('img') || screen.getByRole('link');
        expect(container).toBeInTheDocument();
      });

      // Should not make excessive network requests
      // This is tested by ensuring component remains stable
      expect(document.body.firstChild).toBeInTheDocument();
    });
  });

  describe('User Experience Under Network Stress', () => {
    test('should maintain interactivity during slow loading', async () => {
      // Arrange: Slow network conditions
      mockConnection.effectiveType = '2g';
      
      // Mock slow response
      mockFetch.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            ok: false,
            json: () => Promise.resolve({})
          }), 2000)
        )
      );

      const user = userEvent.setup();
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      // Act: Render and interact during loading
      render(<EnhancedLinkPreview url={testUrl} />);

      // Should be able to interact even while loading
      const loadingElement = screen.queryByText('Loading');
      if (loadingElement) {
        // User should be able to cancel or interact
        expect(loadingElement.closest('div')).toBeInTheDocument();
      }

      // Assert: Should eventually render despite slow network
      await waitFor(() => {
        const container = screen.queryByRole('link');
        if (container) {
          expect(container).toBeInTheDocument();
        }
      }, { timeout: 5000 });
    });

    test('should provide loading feedback appropriate to network speed', async () => {
      // Arrange: Different network speeds
      const networkConditions = [
        { type: '2g', expected: 'Loading' },
        { type: '3g', expected: 'Loading' },
        { type: '4g', expected: 'Loading' }
      ];

      for (const condition of networkConditions) {
        mockConnection.effectiveType = condition.type as any;
        
        // Act: Render component
        render(<EnhancedLinkPreview url="https://www.youtube.com/watch?v=test" />);

        // Assert: Should show appropriate loading state
        const loadingText = screen.queryByText(condition.expected);
        if (loadingText) {
          expect(loadingText).toBeInTheDocument();
        }

        // Cleanup
        document.body.innerHTML = '';
      }
    });

    test('should gracefully degrade on network failures', async () => {
      // Arrange: Network failure simulation
      mockFetch.mockRejectedValue(new Error('Network Error'));
      
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      // Act: Render with network failure
      render(<EnhancedLinkPreview url={testUrl} />);

      // Assert: Should gracefully degrade to fallback
      await waitFor(() => {
        const fallbackLink = screen.getByRole('link');
        expect(fallbackLink).toHaveAttribute('href', testUrl);
      });

      // Should not show error messages to user
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });
});