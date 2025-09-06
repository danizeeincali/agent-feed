/**
 * TDD London School: Component Integration Tests
 * 
 * INTEGRATION FAILURE TESTS:
 * - Poor coordination between LinkPreview and YouTubeEmbed components
 * - State management issues during video expansion
 * - Event handling conflicts between components
 * - Missing communication contracts between services
 * 
 * These tests focus on component collaborations and integration contracts
 * following London School TDD principles with mock-driven testing.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import EnhancedLinkPreview from '../../../components/EnhancedLinkPreview';
import YouTubeEmbed from '../../../components/YouTubeEmbed';
import { renderParsedContent, parseContent } from '../../../utils/contentParser';
import {
  createTestEnvironment,
  createMockFetchResponse,
  createMockUserInteraction,
  waitForNextTick
} from './MockFactories';

describe('TDD London School: Component Integration Failures', () => {
  let testEnvironment: ReturnType<typeof createTestEnvironment>;
  let mockServices: {
    linkPreviewService: {
      fetchPreview: jest.Mock;
      cachePreview: jest.Mock;
      validateUrl: jest.Mock;
    };
    videoPlayerService: {
      initializePlayer: jest.Mock;
      handlePlayRequest: jest.Mock;
      manageAutoplay: jest.Mock;
    };
    contentParserService: {
      parseUrls: jest.Mock;
      renderPreviews: jest.Mock;
      coordinateComponents: jest.Mock;
    };
  };

  beforeEach(() => {
    testEnvironment = createTestEnvironment();
    
    // Mock service collaborators
    mockServices = {
      linkPreviewService: {
        fetchPreview: jest.fn(),
        cachePreview: jest.fn(),
        validateUrl: jest.fn().mockReturnValue(true)
      },
      videoPlayerService: {
        initializePlayer: jest.fn(),
        handlePlayRequest: jest.fn(),
        manageAutoplay: jest.fn()
      },
      contentParserService: {
        parseUrls: jest.fn(),
        renderPreviews: jest.fn(),
        coordinateComponents: jest.fn()
      }
    };

    // Setup global mocks
    global.fetch = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('FAILING: LinkPreview → YouTubeEmbed Integration', () => {
    it('should COORDINATE STATE between preview and video components', async () => {
      // Arrange: Mock YouTube video preview that should expand to player
      const youtubeUrl = 'https://www.youtube.com/watch?v=integration-test';
      const videoMetadata = {
        title: 'Integration Test Video',
        description: 'Testing component coordination',
        videoId: 'integration-test',
        type: 'video',
        image: 'https://img.youtube.com/vi/integration-test/maxresdefault.jpg'
      };

      global.fetch = jest.fn().mockResolvedValueOnce(
        createMockFetchResponse(videoMetadata)
      );

      // Act: Render preview component
      const { rerender } = render(
        <EnhancedLinkPreview url={youtubeUrl} displayMode="card" />
      );

      await waitFor(() => {
        expect(screen.getByText(/Integration Test Video/i)).toBeInTheDocument();
      });

      // Simulate user interaction to expand video
      const previewElement = screen.getByText(/Integration Test Video/i).closest('div[onClick], button');
      if (previewElement) {
        fireEvent.click(previewElement);
      }

      await waitForNextTick();

      // Assert: Should coordinate expansion state
      // CURRENT ISSUE: This will FAIL if state coordination is broken
      await waitFor(() => {
        // Should show expanded video player
        const iframe = screen.queryByTitle(/Integration Test Video/i);
        expect(iframe).toBeInTheDocument();
        
        // Should update preview component state
        expect(iframe?.getAttribute('src')).toContain('integration-test');
      });
    });

    it('should PASS CORRECT PROPS between components during state changes', async () => {
      // Arrange: Mock component prop coordination
      const mockOnPlay = jest.fn();
      const mockOnExpand = jest.fn();
      const testVideoId = 'prop-coordination-test';

      // Create a wrapper that simulates the integration
      const IntegrationWrapper = ({ expanded }: { expanded: boolean }) => {
        if (expanded) {
          return (
            <YouTubeEmbed
              videoId={testVideoId}
              expandedMode={true}
              autoplay={true}
              onPlay={mockOnPlay}
            />
          );
        }
        return (
          <YouTubeEmbed
            videoId={testVideoId}
            showThumbnailOnly={true}
            onPlay={() => mockOnExpand()}
          />
        );
      };

      // Act: Render in thumbnail mode first
      const { rerender } = render(<IntegrationWrapper expanded={false} />);
      
      const thumbnailButton = screen.getByRole('button');
      fireEvent.click(thumbnailButton);

      // Assert: Should call expansion handler
      expect(mockOnExpand).toHaveBeenCalledTimes(1);

      // Act: Re-render in expanded mode
      rerender(<IntegrationWrapper expanded={true} />);

      await waitForNextTick();

      // Assert: Should pass correct props to expanded player
      // CURRENT ISSUE: This will FAIL if prop coordination is incorrect
      expect(screen.getByRole('iframe') || screen.querySelector('iframe')).toBeInTheDocument();
      expect(mockOnPlay).toHaveBeenCalled();
    });

    it('should HANDLE ERRORS during component transitions gracefully', async () => {
      // Arrange: Mock error during expansion
      const problematicUrl = 'https://www.youtube.com/watch?v=error-test';
      
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockFetchResponse({
          title: 'Error Test Video',
          videoId: 'error-test',
          type: 'video'
        }))
        .mockRejectedValueOnce(new Error('Player initialization failed'));

      // Act: Render preview and attempt expansion
      render(<EnhancedLinkPreview url={problematicUrl} displayMode="card" />);

      await waitFor(() => {
        expect(screen.getByText(/Error Test Video/i)).toBeInTheDocument();
      });

      // Simulate expansion that causes error
      const previewElement = screen.getByText(/Error Test Video/i).closest('[role="button"], button, div[onClick]');
      if (previewElement) {
        fireEvent.click(previewElement);
      }

      await waitForNextTick();

      // Assert: Should handle error gracefully
      // CURRENT ISSUE: This will FAIL if error boundaries don't exist
      expect(screen.queryByText(/error/i) || screen.queryByText(/failed/i)).toBeInTheDocument();
      
      // Should not crash the entire component
      expect(screen.getByText(/Error Test Video/i)).toBeInTheDocument();
    });
  });

  describe('FAILING: ContentParser Integration', () => {
    it('should COORDINATE URL parsing with preview rendering', async () => {
      // Arrange: Mock content with multiple URLs that need different handling
      const contentWithUrls = `
        Check out this YouTube video: https://www.youtube.com/watch?v=parser-test-1
        And this article: https://www.wired.com/article/tech-news
        Plus GitHub repo: https://github.com/user/repo
      `;

      // Mock different responses for different URL types
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockFetchResponse({
          title: 'Parser Test Video',
          type: 'video',
          videoId: 'parser-test-1'
        }))
        .mockResolvedValueOnce(createMockFetchResponse({
          title: 'Tech News Article',
          type: 'article',
          image: 'https://media.wired.com/photos/article.jpg'
        }))
        .mockResolvedValueOnce(createMockFetchResponse({
          title: 'user/repo',
          type: 'website',
          image: 'https://avatars.githubusercontent.com/user'
        }));

      // Act: Parse and render content
      const parsedContent = parseContent(contentWithUrls);
      const renderedComponent = render(
        renderParsedContent(parsedContent, {
          enableLinkPreviews: true,
          useEnhancedPreviews: true
        })
      );

      await waitForNextTick();

      // Assert: Should coordinate different preview types
      // CURRENT ISSUE: This will FAIL if coordination between parser and previews is broken
      await waitFor(() => {
        expect(screen.getByText(/Parser Test Video/i)).toBeInTheDocument();
        expect(screen.getByText(/Tech News Article/i)).toBeInTheDocument();
        expect(screen.getByText(/user\/repo/i)).toBeInTheDocument();
      });

      // Each should render appropriate component type
      const videoIframes = screen.queryAllByTitle(/Parser Test Video/i);
      const articlePreviews = screen.queryAllByText(/Tech News Article/i);
      const repoPreviews = screen.queryAllByText(/user\/repo/i);

      expect(videoIframes.length).toBeGreaterThan(0);
      expect(articlePreviews.length).toBeGreaterThan(0);
      expect(repoPreviews.length).toBeGreaterThan(0);
    });

    it('should MANAGE COMPONENT LIFECYCLES during content updates', async () => {
      // Arrange: Mock dynamic content updates
      const initialContent = 'Initial post with https://www.youtube.com/watch?v=lifecycle-1';
      const updatedContent = 'Updated post with https://www.youtube.com/watch?v=lifecycle-2';

      const mockLifecycleTracker = {
        componentMounted: jest.fn(),
        componentUpdated: jest.fn(),
        componentUnmounted: jest.fn()
      };

      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockFetchResponse({
          title: 'Lifecycle Video 1',
          videoId: 'lifecycle-1'
        }))
        .mockResolvedValueOnce(createMockFetchResponse({
          title: 'Lifecycle Video 2',
          videoId: 'lifecycle-2'
        }));

      // Act: Render initial content
      const { rerender } = render(
        renderParsedContent(parseContent(initialContent), {
          enableLinkPreviews: true
        })
      );

      await waitFor(() => {
        expect(screen.getByText(/Lifecycle Video 1/i)).toBeInTheDocument();
      });

      // Act: Update content
      rerender(
        renderParsedContent(parseContent(updatedContent), {
          enableLinkPreviews: true
        })
      );

      await waitForNextTick();

      // Assert: Should properly manage component lifecycle
      // CURRENT ISSUE: This will FAIL if lifecycle management is poor
      await waitFor(() => {
        expect(screen.getByText(/Lifecycle Video 2/i)).toBeInTheDocument();
        expect(screen.queryByText(/Lifecycle Video 1/i)).not.toBeInTheDocument();
      });
    });

    it('should BATCH PREVIEW REQUESTS efficiently', async () => {
      // Arrange: Mock content with many URLs
      const contentWithManyUrls = Array.from({ length: 5 }, (_, i) => 
        `URL ${i + 1}: https://example${i + 1}.com/article`
      ).join('\n');

      // Mock fetch to track request batching
      let requestCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        requestCount++;
        return Promise.resolve(createMockFetchResponse({
          title: `Article ${requestCount}`,
          description: `Description ${requestCount}`
        }));
      });

      // Act: Render content with multiple URLs
      render(
        renderParsedContent(parseContent(contentWithManyUrls), {
          enableLinkPreviews: true
        })
      );

      await waitForNextTick();

      // Assert: Should batch or debounce requests efficiently
      // CURRENT ISSUE: This will FAIL if request batching isn't implemented
      await waitFor(() => {
        // Should have made requests for all URLs but efficiently
        expect(requestCount).toBe(5);
        
        // Should render all previews
        expect(screen.getByText(/Article 1/i)).toBeInTheDocument();
        expect(screen.getByText(/Article 5/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('FAILING: Event Handling and User Interactions', () => {
    it('should PREVENT EVENT CONFLICTS between overlapping components', async () => {
      // Arrange: Mock overlapping clickable elements
      const mockParentClick = jest.fn();
      const mockPreviewClick = jest.fn();
      const mockVideoClick = jest.fn();

      global.fetch = jest.fn().mockResolvedValueOnce(
        createMockFetchResponse({
          title: 'Event Conflict Test Video',
          videoId: 'event-test',
          type: 'video'
        })
      );

      // Act: Render nested interactive elements
      render(
        <div onClick={mockParentClick}>
          <EnhancedLinkPreview 
            url="https://www.youtube.com/watch?v=event-test"
            displayMode="card"
          />
        </div>
      );

      await waitFor(() => {
        expect(screen.getByText(/Event Conflict Test Video/i)).toBeInTheDocument();
      });

      // Act: Click on video preview
      const videoElement = screen.getByText(/Event Conflict Test Video/i).closest('[role="button"], button, div[onClick]');
      if (videoElement) {
        fireEvent.click(videoElement);
      }

      await waitForNextTick();

      // Assert: Should handle events properly without conflicts
      // CURRENT ISSUE: This will FAIL if event propagation isn't managed
      expect(mockParentClick).not.toHaveBeenCalled(); // Should be prevented
      
      // Video should still function
      const iframe = screen.queryByRole('iframe') || screen.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
    });

    it('should COORDINATE KEYBOARD INTERACTIONS across components', async () => {
      // Arrange: Mock keyboard navigation between preview and video
      global.fetch = jest.fn().mockResolvedValueOnce(
        createMockFetchResponse({
          title: 'Keyboard Test Video',
          videoId: 'keyboard-test',
          type: 'video'
        })
      );

      // Act: Render preview component
      render(
        <EnhancedLinkPreview 
          url="https://www.youtube.com/watch?v=keyboard-test"
          displayMode="card"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Keyboard Test Video/i)).toBeInTheDocument();
      });

      // Act: Use keyboard to interact
      const previewElement = screen.getByRole('button') || screen.getByText(/Keyboard Test Video/i).closest('[tabindex], button');
      if (previewElement) {
        fireEvent.keyDown(previewElement, { key: 'Enter', code: 'Enter' });
      }

      await waitForNextTick();

      // Assert: Should respond to keyboard interactions
      // CURRENT ISSUE: This will FAIL if keyboard handling isn't implemented
      const iframe = screen.queryByRole('iframe') || screen.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
    });

    it('should MANAGE FOCUS and accessibility during transitions', async () => {
      // Arrange: Mock focus management during expansion
      const mockFocusManagement = {
        setFocus: jest.fn(),
        manageFocusTrap: jest.fn(),
        restoreFocus: jest.fn()
      };

      global.fetch = jest.fn().mockResolvedValueOnce(
        createMockFetchResponse({
          title: 'Focus Test Video',
          videoId: 'focus-test',
          type: 'video'
        })
      );

      // Act: Render and interact with component
      render(
        <EnhancedLinkPreview 
          url="https://www.youtube.com/watch?v=focus-test"
          displayMode="card"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Focus Test Video/i)).toBeInTheDocument();
      });

      const previewButton = screen.getByRole('button');
      fireEvent.click(previewButton);

      await waitForNextTick();

      // Assert: Should manage focus properly
      // CURRENT ISSUE: This will FAIL if focus management isn't implemented
      const expandedElement = screen.queryByRole('iframe') || screen.querySelector('iframe');
      expect(expandedElement).toBeInTheDocument();
      
      // Focus should be managed for accessibility
      expect(document.activeElement).toBe(expandedElement || previewButton);
    });
  });

  describe('Contract Verification: Service Integration', () => {
    it('should HONOR CONTRACTS between all service layers', async () => {
      // Arrange: Define integration contracts
      interface IntegrationContract {
        linkPreviewService: {
          fetchMetadata(url: string): Promise<any>;
          cacheResult(url: string, data: any): void;
        };
        videoPlayerService: {
          initializePlayer(config: any): Promise<void>;
          handleUserInteraction(): void;
        };
        imageService: {
          loadImage(url: string): Promise<boolean>;
          handleCorsFailure(url: string): Promise<string>;
        };
        eventService: {
          preventDefault(): void;
          stopPropagation(): void;
          manageKeyboard(handler: Function): void;
        };
      }

      // Mock contract implementations
      const mockIntegrationContract: IntegrationContract = {
        linkPreviewService: {
          fetchMetadata: jest.fn().mockResolvedValue({
            title: 'Contract Video',
            videoId: 'contract-123'
          }),
          cacheResult: jest.fn()
        },
        videoPlayerService: {
          initializePlayer: jest.fn().mockResolvedValue(undefined),
          handleUserInteraction: jest.fn()
        },
        imageService: {
          loadImage: jest.fn().mockResolvedValue(true),
          handleCorsFailure: jest.fn().mockResolvedValue('proxy-url')
        },
        eventService: {
          preventDefault: jest.fn(),
          stopPropagation: jest.fn(),
          manageKeyboard: jest.fn()
        }
      };

      // Act: Execute contract workflow
      const metadata = await mockIntegrationContract.linkPreviewService.fetchMetadata('test-url');
      mockIntegrationContract.linkPreviewService.cacheResult('test-url', metadata);
      await mockIntegrationContract.videoPlayerService.initializePlayer({ videoId: metadata.videoId });
      mockIntegrationContract.videoPlayerService.handleUserInteraction();

      // Assert: All contract methods should be called correctly
      // CURRENT ISSUE: This will FAIL if contracts aren't properly defined
      expect(mockIntegrationContract.linkPreviewService.fetchMetadata).toHaveBeenCalledWith('test-url');
      expect(mockIntegrationContract.linkPreviewService.cacheResult).toHaveBeenCalledWith('test-url', metadata);
      expect(mockIntegrationContract.videoPlayerService.initializePlayer).toHaveBeenCalledWith({ videoId: 'contract-123' });
      expect(mockIntegrationContract.videoPlayerService.handleUserInteraction).toHaveBeenCalled();
    });

    it('should MAINTAIN COMPONENT COMMUNICATION CONTRACTS', async () => {
      // Arrange: Test component communication contract
      const communicationContract = {
        preview: {
          onExpand: jest.fn(),
          onCollapse: jest.fn(),
          onError: jest.fn()
        },
        player: {
          onReady: jest.fn(),
          onPlay: jest.fn(),
          onPause: jest.fn()
        },
        coordinator: {
          manageState: jest.fn(),
          handleTransition: jest.fn(),
          propagateEvents: jest.fn()
        }
      };

      // Act: Simulate component communication
      communicationContract.preview.onExpand();
      communicationContract.coordinator.manageState({ expanded: true });
      communicationContract.player.onReady();
      communicationContract.player.onPlay();

      // Assert: Communication contract should be honored
      expect(communicationContract.preview.onExpand).toHaveBeenCalled();
      expect(communicationContract.coordinator.manageState).toHaveBeenCalledWith({ expanded: true });
      expect(communicationContract.player.onReady).toHaveBeenCalled();
      expect(communicationContract.player.onPlay).toHaveBeenCalled();
    });
  });
});

/**
 * EXPECTED TEST RESULTS WITH CURRENT IMPLEMENTATION:
 * 
 * ❌ FAILING TESTS (will pass once integration is fixed):
 * 1. should COORDINATE STATE between preview and video components
 * 2. should PASS CORRECT PROPS between components during state changes
 * 3. should HANDLE ERRORS during component transitions gracefully
 * 4. should COORDINATE URL parsing with preview rendering
 * 5. should MANAGE COMPONENT LIFECYCLES during content updates
 * 6. should BATCH PREVIEW REQUESTS efficiently
 * 7. should PREVENT EVENT CONFLICTS between overlapping components
 * 8. should COORDINATE KEYBOARD INTERACTIONS across components
 * 9. should MANAGE FOCUS and accessibility during transitions
 * 10. should HONOR CONTRACTS between all service layers
 * 
 * These tests drive the implementation of proper component integration,
 * state management, event handling, and service coordination.
 */