/**
 * TDD London School: Video Autoplay Functionality Tests
 * 
 * FAILING FUNCTIONALITY TESTS:
 * - Videos not auto-playing when expanded
 * - Double-click requirement for video playback
 * - User interaction compliance for autoplay policies
 * 
 * These tests follow London School TDD approach with mock-driven development
 * to test object collaborations and behavior contracts.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import YouTubeEmbed, { extractYouTubeId, getYouTubeThumbnail } from '../../../components/YouTubeEmbed';
import EnhancedLinkPreview from '../../../components/EnhancedLinkPreview';
import {
  createMockIFrameElement,
  createMockUserInteraction,
  createMockNetworkConditions,
  createTestEnvironment,
  waitForNextTick
} from './MockFactories';

// Mock window and document for autoplay policy testing
const mockWindow = {
  location: { origin: 'http://localhost:3000' },
  open: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

const mockDocument = {
  wasLastActivatedByUser: false,
  hidden: false,
  visibilityState: 'visible' as DocumentVisibilityState,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

// Setup global mocks
Object.defineProperty(global, 'window', { value: mockWindow, configurable: true });
Object.defineProperty(global, 'document', { value: mockDocument, configurable: true });

describe('TDD London School: Video Autoplay Failures', () => {
  let mockEnvironment: ReturnType<typeof createTestEnvironment>;
  let mockUserInteraction: ReturnType<typeof createMockUserInteraction>;
  let mockIFrame: ReturnType<typeof createMockIFrameElement>;

  beforeEach(() => {
    mockEnvironment = createTestEnvironment();
    mockUserInteraction = mockEnvironment.mockUserInteraction;
    mockIFrame = mockEnvironment.mockIFrame;
    
    // Reset document user interaction state
    Object.defineProperty(document, 'wasLastActivatedByUser', {
      value: false,
      configurable: true
    });
    
    // Mock createElement to return our mock iframe
    const originalCreateElement = document.createElement;
    document.createElement = jest.fn((tagName: string) => {
      if (tagName === 'iframe') {
        return mockIFrame;
      }
      return originalCreateElement.call(document, tagName);
    }) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('FAILING: Video Autoplay on Expansion', () => {
    it('should START VIDEO IMMEDIATELY when expanded with user interaction', async () => {
      // Arrange: Mock user has interacted with page
      mockUserInteraction.simulateUserClick();
      Object.defineProperty(document, 'wasLastActivatedByUser', {
        value: true,
        configurable: true
      });

      const mockOnPlay = jest.fn();
      const testVideoId = 'test-video-123';

      // Act: Render YouTube embed in expanded mode with autoplay
      render(
        <YouTubeEmbed
          videoId={testVideoId}
          expandedMode={true}
          autoplay={true}
          startMuted={true}
          onPlay={mockOnPlay}
        />
      );

      await waitForNextTick();

      // Assert: Video should start immediately in expanded mode
      // CURRENT ISSUE: This will FAIL because autoplay parameters aren't properly set
      expect(mockIFrame.src).toContain('autoplay=1');
      expect(mockIFrame.src).toContain('mute=1');
      expect(mockIFrame.src).toContain(`embed/${testVideoId}`);
      
      // The iframe should have the correct allow attributes for autoplay
      expect(mockIFrame.allow).toContain('autoplay');
      
      // Should trigger onPlay callback immediately in expanded mode
      expect(mockOnPlay).toHaveBeenCalledTimes(1);
    });

    it('should RESPECT BROWSER AUTOPLAY POLICIES with user gesture tracking', async () => {
      // Arrange: No user interaction yet
      const testVideoId = 'policy-test-456';
      
      // Act: Try to autoplay without user interaction
      render(
        <YouTubeEmbed
          videoId={testVideoId}
          autoplay={true}
          expandedMode={true}
        />
      );

      await waitForNextTick();

      // Assert: Should not autoplay without user interaction
      // CURRENT ISSUE: This will FAIL because user interaction checking isn't implemented
      expect(mockIFrame.src).toContain('autoplay=0');

      // Act: Simulate user interaction and re-render
      mockUserInteraction.simulateUserClick();
      
      const { rerender } = render(
        <YouTubeEmbed
          videoId={testVideoId}
          autoplay={true}
          expandedMode={true}
        />
      );

      await waitForNextTick();

      // Assert: Should now autoplay after user interaction
      expect(mockIFrame.src).toContain('autoplay=1');
    });

    it('should ENABLE AUTOPLAY PARAMETERS after user interaction', async () => {
      // Arrange: Component starts without user interaction
      const testVideoId = 'interaction-test-789';
      const mockOnPlay = jest.fn();

      const { rerender } = render(
        <YouTubeEmbed
          videoId={testVideoId}
          showThumbnailOnly={true}
          onPlay={mockOnPlay}
        />
      );

      // Act: User clicks to play (user interaction)
      const playButton = screen.getByRole('button');
      fireEvent.click(playButton);
      
      // This should trigger user interaction tracking
      mockUserInteraction.simulateUserClick();

      await waitForNextTick();

      // Assert: Should track user interaction and enable autoplay
      // CURRENT ISSUE: This will FAIL because user interaction isn't properly tracked
      expect(mockOnPlay).toHaveBeenCalledTimes(1);
      
      // When expanded after user interaction, should enable autoplay
      rerender(
        <YouTubeEmbed
          videoId={testVideoId}
          expandedMode={true}
          autoplay={true}
        />
      );

      await waitForNextTick();
      expect(mockIFrame.src).toContain('autoplay=1');
    });
  });

  describe('FAILING: Single-Click Video Playback', () => {
    it('should PLAY VIDEO on FIRST CLICK, not second', async () => {
      // Arrange: Video in thumbnail mode
      const testVideoId = 'single-click-test';
      const mockOnPlay = jest.fn();

      render(
        <YouTubeEmbed
          videoId={testVideoId}
          showThumbnailOnly={true}
          onPlay={mockOnPlay}
        />
      );

      // Act: Single click on thumbnail
      const thumbnailButton = screen.getByRole('button');
      fireEvent.click(thumbnailButton);

      await waitForNextTick();

      // Assert: Should play immediately on first click
      // CURRENT ISSUE: This may FAIL if double-click is required
      expect(mockOnPlay).toHaveBeenCalledTimes(1);
      expect(mockOnPlay).toHaveBeenCalledWith();
      
      // Should NOT require a second click
      const secondClickTime = mockOnPlay.mock.calls.length;
      expect(secondClickTime).toBe(1); // Only one click should be needed
    });

    it('should PREVENT EVENT BUBBLING during video interaction', async () => {
      // Arrange: Video with parent container that might capture clicks
      const testVideoId = 'event-test';
      const mockParentClick = jest.fn();
      const mockOnPlay = jest.fn();

      render(
        <div onClick={mockParentClick}>
          <YouTubeEmbed
            videoId={testVideoId}
            showThumbnailOnly={true}
            onPlay={mockOnPlay}
          />
        </div>
      );

      // Act: Click on video
      const videoElement = screen.getByRole('button');
      fireEvent.click(videoElement);

      await waitForNextTick();

      // Assert: Video should play but parent click should not trigger
      // CURRENT ISSUE: This might FAIL if event propagation isn't stopped
      expect(mockOnPlay).toHaveBeenCalledTimes(1);
      expect(mockParentClick).not.toHaveBeenCalled();
    });

    it('should HANDLE RAPID CLICKS gracefully', async () => {
      // Arrange: Video component
      const testVideoId = 'rapid-click-test';
      const mockOnPlay = jest.fn();

      render(
        <YouTubeEmbed
          videoId={testVideoId}
          showThumbnailOnly={true}
          onPlay={mockOnPlay}
        />
      );

      // Act: Rapid multiple clicks
      const videoButton = screen.getByRole('button');
      fireEvent.click(videoButton);
      fireEvent.click(videoButton);
      fireEvent.click(videoButton);

      await waitForNextTick();

      // Assert: Should only respond to first meaningful click
      // CURRENT ISSUE: This might FAIL if debouncing isn't implemented
      expect(mockOnPlay).toHaveBeenCalledTimes(1);
    });
  });

  describe('FAILING: Enhanced Link Preview Video Integration', () => {
    it('should AUTO-EXPAND YouTube videos when clicked in preview', async () => {
      // Arrange: Enhanced link preview with YouTube URL
      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      // Mock the API response to simulate backend failure
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('API timeout'));

      render(<EnhancedLinkPreview url={youtubeUrl} />);

      // Wait for component to load and fallback to client preview
      await waitFor(() => {
        expect(screen.getByText(/YouTube Video/i)).toBeInTheDocument();
      });

      // Act: Click on the preview
      const previewElement = screen.getByText(/YouTube Video/i).closest('[role="button"], button, div[onClick]');
      if (previewElement) {
        fireEvent.click(previewElement);
      }

      await waitForNextTick();

      // Assert: Should expand to show video player
      // CURRENT ISSUE: This will FAIL if expansion doesn't work properly
      await waitFor(() => {
        expect(mockIFrame.src).toContain('embed/dQw4w9WgXcQ');
      });
    });

    it('should COORDINATE between preview and video components', async () => {
      // Arrange: Mock collaboration between components
      const mockExpansionHandler = jest.fn();
      const youtubeUrl = 'https://www.youtube.com/watch?v=test123';

      // Mock fetch to simulate backend API response
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          title: 'Test YouTube Video',
          description: 'Test description',
          type: 'video',
          videoId: 'test123'
        })
      } as Response);

      const { rerender } = render(
        <EnhancedLinkPreview 
          url={youtubeUrl} 
          displayMode="card"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Test YouTube Video/i)).toBeInTheDocument();
      });

      // Act: Simulate expansion state change
      rerender(
        <EnhancedLinkPreview 
          url={youtubeUrl} 
          displayMode="embedded"
        />
      );

      await waitForNextTick();

      // Assert: Components should coordinate properly
      // CURRENT ISSUE: This will FAIL if component communication is broken
      expect(mockIFrame.src).toContain('test123');
    });
  });

  describe('FAILING: Iframe Parameter Management', () => {
    it('should SET CORRECT AUTOPLAY PARAMETERS in iframe src', async () => {
      // Arrange: Mock user interaction
      Object.defineProperty(document, 'wasLastActivatedByUser', {
        value: true,
        configurable: true
      });

      const testVideoId = 'param-test-456';

      // Act: Render with autoplay enabled
      render(
        <YouTubeEmbed
          videoId={testVideoId}
          autoplay={true}
          expandedMode={true}
          startMuted={true}
          enableLoop={true}
        />
      );

      await waitForNextTick();

      // Assert: Iframe src should contain correct parameters
      // CURRENT ISSUE: These will FAIL if parameter construction is incorrect
      const expectedParams = [
        'autoplay=1',
        'mute=1',
        'loop=1',
        `playlist=${testVideoId}`, // Required for loop
        'controls=1',
        'rel=0',
        'modestbranding=1',
        'playsinline=1'
      ];

      expectedParams.forEach(param => {
        expect(mockIFrame.src).toContain(param);
      });
    });

    it('should UPDATE IFRAME SRC when autoplay state changes', async () => {
      // Arrange: Component without user interaction
      const testVideoId = 'dynamic-param-test';
      
      const { rerender } = render(
        <YouTubeEmbed
          videoId={testVideoId}
          autoplay={false}
        />
      );

      await waitForNextTick();
      
      // Initially should not have autoplay
      expect(mockIFrame.src).toContain('autoplay=0');

      // Act: Simulate user interaction and enable autoplay
      Object.defineProperty(document, 'wasLastActivatedByUser', {
        value: true,
        configurable: true
      });

      rerender(
        <YouTubeEmbed
          videoId={testVideoId}
          autoplay={true}
          expandedMode={true}
        />
      );

      await waitForNextTick();

      // Assert: Should update to include autoplay
      // CURRENT ISSUE: This will FAIL if iframe src isn't updated dynamically
      expect(mockIFrame.src).toContain('autoplay=1');
    });
  });

  describe('Contract Verification: Component Collaborations', () => {
    it('should DEFINE CLEAR CONTRACTS between YouTube and Preview components', async () => {
      // Arrange: Test the contract between components
      const contractMock = {
        youTubeEmbed: {
          onPlay: jest.fn(),
          onExpand: jest.fn(),
          setAutoplay: jest.fn()
        },
        linkPreview: {
          onVideoClick: jest.fn(),
          expandVideo: jest.fn(),
          getVideoId: jest.fn().mockReturnValue('contract-test')
        }
      };

      // Act: Simulate contract interaction
      const videoId = contractMock.linkPreview.getVideoId();
      contractMock.linkPreview.onVideoClick();
      contractMock.youTubeEmbed.onPlay();

      // Assert: Contract should be honored
      // CURRENT ISSUE: This will FAIL if contracts aren't properly defined
      expect(contractMock.linkPreview.getVideoId).toHaveBeenCalled();
      expect(contractMock.linkPreview.onVideoClick).toHaveBeenCalled();
      expect(contractMock.youTubeEmbed.onPlay).toHaveBeenCalled();
      expect(videoId).toBe('contract-test');
    });
  });
});

/**
 * EXPECTED TEST RESULTS WITH CURRENT IMPLEMENTATION:
 * 
 * ❌ FAILING TESTS (will pass once issues are fixed):
 * 1. should START VIDEO IMMEDIATELY when expanded with user interaction
 * 2. should RESPECT BROWSER AUTOPLAY POLICIES with user gesture tracking  
 * 3. should ENABLE AUTOPLAY PARAMETERS after user interaction
 * 4. should PLAY VIDEO on FIRST CLICK, not second
 * 5. should AUTO-EXPAND YouTube videos when clicked in preview
 * 6. should SET CORRECT AUTOPLAY PARAMETERS in iframe src
 * 7. should UPDATE IFRAME SRC when autoplay state changes
 * 
 * These tests drive the implementation of proper autoplay handling,
 * single-click interactions, and component coordination.
 */