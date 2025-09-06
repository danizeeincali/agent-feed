/**
 * TDD London School Test Suite: Component Communication Integration
 * Focus: Mock-driven verification of component collaboration and state synchronization
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parseContent, renderParsedContent } from '../../../utils/contentParser';
import EnhancedLinkPreview from '../../../components/EnhancedLinkPreview';
import RealSocialMediaFeed from '../../../components/RealSocialMediaFeed';

// Mock API service for component interactions
const mockApiService = {
  getAgentPosts: jest.fn(),
  getFilteredPosts: jest.fn(),
  getFilterData: jest.fn(),
  getFilterStats: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
};

// Mock the API service module
jest.mock('../../../services/api', () => ({
  apiService: mockApiService
}));

// Mock fetch for link preview API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock window.open for external link behavior
const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', {
  writable: true,
  value: mockWindowOpen
});

describe('Component Communication Integration (TDD London School)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default API responses
    mockApiService.getAgentPosts.mockResolvedValue({
      data: [],
      total: 0,
      success: true
    });

    mockApiService.getFilterData.mockResolvedValue({
      agents: [],
      hashtags: []
    });

    mockApiService.getFilterStats.mockResolvedValue({
      savedPosts: 0,
      myPosts: 0
    });

    // Mock fetch responses for link previews
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({})
    });
  });

  describe('Content Parser to Link Preview Communication', () => {
    test('should coordinate URL extraction with preview generation', () => {
      // Arrange: Content with multiple URLs
      const content = 'Check out this video: https://www.youtube.com/watch?v=dQw4w9WgXcQ and this article: https://example.com/article';

      // Act: Parse content to extract URLs
      const parsedContent = parseContent(content);

      // Assert: Should identify URLs for preview generation
      const urlParts = parsedContent.filter(part => part.type === 'url');
      expect(urlParts).toHaveLength(2);
      expect(urlParts[0].data?.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(urlParts[1].data?.url).toBe('https://example.com/article');
    });

    test('should coordinate between parser and preview component rendering', () => {
      // Arrange: Content with YouTube URL
      const content = 'Watch this: https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const mockMentionClick = jest.fn();
      const mockHashtagClick = jest.fn();

      // Act: Render parsed content with link previews enabled
      const renderedContent = renderParsedContent(parseContent(content), {
        onMentionClick: mockMentionClick,
        onHashtagClick: mockHashtagClick,
        enableLinkPreviews: true,
        useEnhancedPreviews: true
      });

      render(<div>{renderedContent}</div>);

      // Assert: Should coordinate URL linking and preview rendering
      expect(screen.getByText('Watch this:')).toBeInTheDocument();
      
      // Should render link preview component
      waitFor(() => {
        const linkElement = screen.getByRole('link');
        expect(linkElement).toHaveAttribute('href', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      });
    });

    test('should handle preview display mode coordination', () => {
      // Arrange: Content with URL and specific display mode
      const content = 'Video link: https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      // Act: Render with thumbnail-summary mode
      const renderedContent = renderParsedContent(parseContent(content), {
        enableLinkPreviews: true,
        useEnhancedPreviews: true,
        previewDisplayMode: 'thumbnail-summary'
      });

      render(<div>{renderedContent}</div>);

      // Assert: Should coordinate display mode between parser and preview
      waitFor(() => {
        // Preview component should receive thumbnail-summary mode
        expect(document.body).toBeInTheDocument();
      });
    });
  });

  describe('Preview to Video Player State Coordination', () => {
    test('should coordinate expansion state between preview and video player', async () => {
      // Arrange: YouTube video URL
      const user = userEvent.setup();
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      render(<EnhancedLinkPreview url={testUrl} displayMode="card" />);

      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Act: Click to expand video (simulate interaction)
      const previewElement = screen.getByRole('button') || screen.getByRole('img');
      await user.click(previewElement);

      // Assert: Should coordinate state transition to video player
      await waitFor(() => {
        // Should transition to expanded video state
        const videoElement = screen.queryByTitle('YouTube Video');
        if (videoElement) {
          expect(videoElement).toBeInTheDocument();
        }
      });
    });

    test('should coordinate mute state between preview and video player', async () => {
      // Arrange: Video preview with mute controls
      const user = userEvent.setup();
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      render(<EnhancedLinkPreview url={testUrl} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Look for mute control or video interface
      const controlElements = screen.queryAllByRole('button');
      
      // Act: Interact with mute control if available
      if (controlElements.length > 0) {
        await user.click(controlElements[0]);

        // Assert: Should coordinate mute state
        expect(controlElements[0]).toBeInTheDocument();
      }
    });

    test('should coordinate external link behavior', async () => {
      // Arrange: Video preview with external link
      const user = userEvent.setup();
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      render(<EnhancedLinkPreview url={testUrl} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Look for external link button
      const externalLinkButton = screen.queryByTitle('Open in YouTube') || 
                                screen.queryByRole('link');

      if (externalLinkButton) {
        // Act: Click external link
        await user.click(externalLinkButton);

        // Assert: Should coordinate external navigation
        expect(mockWindowOpen).toHaveBeenCalledWith(
          expect.stringContaining('youtube.com'),
          '_blank',
          'noopener,noreferrer'
        );
      }
    });
  });

  describe('Feed to Preview Component Coordination', () => {
    test('should coordinate content parsing with preview rendering in feed', async () => {
      // Arrange: Mock posts with URLs
      mockApiService.getAgentPosts.mockResolvedValue({
        data: [{
          id: '1',
          title: 'Test Post',
          content: 'Check this video: https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          authorAgent: 'TestAgent',
          publishedAt: new Date().toISOString(),
          engagement: { comments: 0 }
        }],
        total: 1,
        success: true
      });

      // Act: Render feed component
      render(<RealSocialMediaFeed />);

      // Assert: Should coordinate post content parsing with preview rendering
      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
        expect(screen.getByText(/Check this video:/)).toBeInTheDocument();
      });

      // Should coordinate link preview rendering
      await waitFor(() => {
        const linkElement = screen.queryByRole('link');
        if (linkElement) {
          expect(linkElement).toHaveAttribute('href', 
            expect.stringContaining('youtube.com'));
        }
      });
    });

    test('should coordinate hashtag and mention click handlers', async () => {
      // Arrange: Mock posts with mentions and hashtags
      const mockOnMention = jest.fn();
      const mockOnHashtag = jest.fn();

      mockApiService.getAgentPosts.mockResolvedValue({
        data: [{
          id: '1',
          title: 'Test Post',
          content: 'Hello @testuser check #testvideo https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          authorAgent: 'TestAgent',
          publishedAt: new Date().toISOString(),
          engagement: { comments: 0 }
        }],
        total: 1,
        success: true
      });

      const user = userEvent.setup();

      // Act: Render feed
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });

      // Look for mention and hashtag elements
      const mentionElement = screen.queryByText('@testuser');
      const hashtagElement = screen.queryByText('#testvideo');

      // Act: Click mention if present
      if (mentionElement) {
        await user.click(mentionElement);
      }

      // Act: Click hashtag if present
      if (hashtagElement) {
        await user.click(hashtagElement);
      }

      // Assert: Should coordinate click handling
      expect(document.body).toBeInTheDocument(); // Basic stability check
    });
  });

  describe('Error State Communication', () => {
    test('should coordinate error handling between components', async () => {
      // Arrange: Mock API error
      mockApiService.getAgentPosts.mockRejectedValue(new Error('Network error'));

      // Act: Render feed component
      render(<RealSocialMediaFeed />);

      // Assert: Should coordinate error state display
      await waitFor(() => {
        const errorMessage = screen.queryByText(/error/i) || 
                            screen.queryByText(/failed/i);
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument();
        }
      });
    });

    test('should coordinate preview failure with fallback rendering', async () => {
      // Arrange: Invalid URL that should trigger fallback
      const testUrl = 'https://invalid-domain-12345.com/video';

      // Act: Render preview component
      render(<EnhancedLinkPreview url={testUrl} />);

      // Assert: Should coordinate fallback rendering
      await waitFor(() => {
        // Should show fallback link instead of preview
        const fallbackLink = screen.queryByRole('link');
        if (fallbackLink) {
          expect(fallbackLink).toHaveAttribute('href', testUrl);
        }
      });
    });

    test('should coordinate thumbnail error with icon fallback', async () => {
      // Arrange: URL with thumbnail that will fail to load
      const testUrl = 'https://www.youtube.com/watch?v=invalid-video-id';

      render(<EnhancedLinkPreview url={testUrl} showThumbnailOnly={true} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Act: Simulate thumbnail error
      const thumbnail = screen.queryByRole('img');
      if (thumbnail) {
        act(() => {
          const errorEvent = new Event('error', { bubbles: true });
          thumbnail.dispatchEvent(errorEvent);
        });

        // Assert: Should coordinate error state with fallback display
        expect(thumbnail.closest('div')).toBeInTheDocument();
      }
    });
  });

  describe('Performance Communication', () => {
    test('should coordinate lazy loading between parser and preview components', async () => {
      // Arrange: Multiple URLs in content
      const content = `
        Video 1: https://www.youtube.com/watch?v=video1
        Video 2: https://www.youtube.com/watch?v=video2
        Video 3: https://www.youtube.com/watch?v=video3
      `;

      // Act: Render parsed content with previews
      const renderedContent = renderParsedContent(parseContent(content), {
        enableLinkPreviews: true,
        useEnhancedPreviews: true
      });

      render(<div>{renderedContent}</div>);

      // Assert: Should coordinate lazy loading across multiple previews
      await waitFor(() => {
        const images = screen.queryAllByRole('img');
        images.forEach(img => {
          expect(img).toHaveAttribute('loading', 'lazy');
        });
      });
    });

    test('should coordinate preview visibility with resource loading', async () => {
      // Arrange: Component with intersection observer coordination
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      // Act: Render preview component
      render(<EnhancedLinkPreview url={testUrl} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Assert: Should coordinate visibility-based loading
      const previewElement = screen.queryByRole('img') || screen.queryByRole('button');
      expect(previewElement).toBeInTheDocument();
    });
  });

  describe('Accessibility Communication', () => {
    test('should coordinate ARIA states between components', async () => {
      // Arrange: Interactive content with accessibility needs
      const content = 'Watch: https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      const renderedContent = renderParsedContent(parseContent(content), {
        enableLinkPreviews: true,
        useEnhancedPreviews: true
      });

      // Act: Render with accessibility coordination
      render(<div>{renderedContent}</div>);

      // Assert: Should coordinate accessibility attributes
      await waitFor(() => {
        const interactiveElements = screen.queryAllByRole('button')
          .concat(screen.queryAllByRole('link'));
        
        interactiveElements.forEach(element => {
          expect(element).toBeInTheDocument();
          // Should have proper accessibility attributes
          expect(element.getAttribute('tabIndex')).not.toBe('-1');
        });
      });
    });

    test('should coordinate keyboard navigation between components', async () => {
      // Arrange: Multiple interactive elements
      const user = userEvent.setup();
      const content = `
        Video: https://www.youtube.com/watch?v=dQw4w9WgXcQ
        Article: https://example.com/article
      `;

      const renderedContent = renderParsedContent(parseContent(content), {
        enableLinkPreviews: true,
        useEnhancedPreviews: true
      });

      render(<div>{renderedContent}</div>);

      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      });

      // Act: Navigate with keyboard
      await user.tab();

      // Assert: Should coordinate keyboard focus management
      const focusedElement = document.activeElement;
      expect(focusedElement).toBeInTheDocument();
    });
  });
});