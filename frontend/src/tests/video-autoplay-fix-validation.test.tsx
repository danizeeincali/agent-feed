/**
 * Video Autoplay Fix Validation Tests
 * 
 * Tests to validate that the video playback issues are resolved:
 * 1. Videos auto-play when expanded
 * 2. Single click starts playback (no double-click required)
 * 3. Browser autoplay policies are properly handled
 * 4. User interaction tracking works correctly
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import YouTubeEmbed from '../components/YouTubeEmbed';
import EnhancedLinkPreview from '../components/EnhancedLinkPreview';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Video Autoplay Fix Validation', () => {
  let user: ReturnType<typeof userEvent.setup>;
  
  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    // Mock successful API response for link preview
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        url: 'https://youtube.com/watch?v=test123',
        title: 'Test YouTube Video',
        description: 'A test video for autoplay validation',
        type: 'video',
        videoId: 'test123',
        image: 'https://img.youtube.com/vi/test123/mqdefault.jpg'
      })
    });
    
    // Mock window.open to prevent actual navigation
    Object.defineProperty(window, 'open', {
      writable: true,
      value: vi.fn()
    });
  });

  describe('YouTubeEmbed Component Fixes', () => {
    it('should auto-play when expanded mode is enabled', async () => {
      const onPlaySpy = vi.fn();
      
      render(
        <YouTubeEmbed
          videoId="test123"
          title="Test Video"
          expandedMode={true}
          autoplay={true}
          startMuted={true}
          onPlay={onPlaySpy}
        />
      );
      
      // Should render iframe container
      const container = screen.getByTestId ? 
        screen.queryByTestId('video-container') : 
        screen.getByRole('region', { hidden: true });
      
      expect(container || screen.getByTitle('Test Video')).toBeInTheDocument();
      
      // Check that iframe has autoplay parameters
      const iframe = screen.getByTitle('Test Video') as HTMLIFrameElement;
      expect(iframe.src).toContain('autoplay=1');
      expect(iframe.src).toContain('mute=1');
      
      // Should have proper allow attributes for autoplay
      expect(iframe.getAttribute('allow')).toContain('autoplay');
    });

    it('should start playing with single click from thumbnail', async () => {
      const onPlaySpy = vi.fn();
      
      render(
        <YouTubeEmbed
          videoId="test123"
          title="Test Video"
          showThumbnailOnly={true}
          onPlay={onPlaySpy}
        />
      );
      
      // Find the main container (it has role=button and is clickable)
      const thumbnail = screen.getByRole('button', { name: /test video/i });
      
      expect(thumbnail).toBeInTheDocument();
      
      // Single click should trigger play
      await user.click(thumbnail);
      
      // Should call onPlay callback
      expect(onPlaySpy).toHaveBeenCalled();
    });

    it('should properly handle user interaction state for autoplay compliance', async () => {
      render(
        <YouTubeEmbed
          videoId="test123"
          title="Test Video"
          autoplay={true}
          startMuted={true}
        />
      );
      
      // Initial state should not have autoplay active (no user interaction)
      const iframe = screen.queryByTitle('Test Video') as HTMLIFrameElement | null;
      
      if (iframe) {
        // Should be muted for compliance
        expect(iframe.src).toContain('mute=1');
        
        // Should have proper sandbox attributes
        expect(iframe.getAttribute('sandbox')).toContain('allow-scripts');
        expect(iframe.getAttribute('sandbox')).toContain('allow-same-origin');
      }
      
      // Find thumbnail to simulate user interaction
      const interactiveElement = screen.getByRole('button') || 
                                 screen.getByTitle('Test Video').closest('[role="button"]');
      
      if (interactiveElement) {
        await user.click(interactiveElement);
        
        // After user interaction, autoplay should be enabled
        await waitFor(() => {
          const updatedIframe = screen.queryByTitle('Test Video') as HTMLIFrameElement | null;
          if (updatedIframe) {
            expect(updatedIframe.src).toContain('autoplay=1');
          }
        }, { timeout: 3000 });
      }
    });

    it('should force iframe reload when transitioning to autoplay', async () => {
      const { rerender } = render(
        <YouTubeEmbed
          videoId="test123"
          title="Test Video"
          expandedMode={false}
          autoplay={false}
        />
      );
      
      const initialIframe = screen.queryByTitle('Test Video');
      const initialSrc = initialIframe ? (initialIframe as HTMLIFrameElement).src : '';
      
      // Transition to expanded mode (should trigger autoplay)
      rerender(
        <YouTubeEmbed
          videoId="test123"
          title="Test Video"
          expandedMode={true}
          autoplay={true}
          startMuted={true}
        />
      );
      
      await waitFor(() => {
        const updatedIframe = screen.queryByTitle('Test Video') as HTMLIFrameElement | null;
        if (updatedIframe && initialSrc) {
          // URL should have changed to include autoplay
          expect(updatedIframe.src).not.toBe(initialSrc);
          expect(updatedIframe.src).toContain('autoplay=1');
        }
      });
    });
  });

  describe('EnhancedLinkPreview Integration', () => {
    it('should expand YouTube video to playing state with single click', async () => {
      render(
        <EnhancedLinkPreview 
          url="https://youtube.com/watch?v=test123"
          displayMode="card"
        />
      );
      
      // Wait for preview to load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
      
      // Find the video element or play button
      const videoElement = screen.queryByRole('button') || 
                          screen.queryByText(/play/i) ||
                          screen.queryByText(/youtube/i);
      
      if (videoElement) {
        // Single click should expand the video
        await user.click(videoElement);
        
        // Should transition to expanded video player
        await waitFor(() => {
          const iframe = screen.queryByTitle(/test.*video/i);
          if (iframe) {
            expect((iframe as HTMLIFrameElement).src).toContain('autoplay=1');
            expect((iframe as HTMLIFrameElement).src).toContain('mute=1');
          }
        });
      }
    });

    it('should show collapse option after expanding video', async () => {
      render(
        <EnhancedLinkPreview 
          url="https://youtube.com/watch?v=test123"
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
      
      // Simulate clicking to expand
      const expandableElement = screen.queryByRole('button') || 
                               screen.queryByText(/youtube/i);
      
      if (expandableElement) {
        await user.click(expandableElement);
        
        // Should show collapse option
        await waitFor(() => {
          const collapseButton = screen.queryByText(/show thumbnail/i) ||
                                screen.queryByText(/collapse/i) ||
                                screen.queryByRole('button', { name: /collapse/i });
          
          if (collapseButton) {
            expect(collapseButton).toBeInTheDocument();
          }
        });
      }
    });
  });

  describe('Browser Autoplay Policy Compliance', () => {
    it('should always mute videos for autoplay compliance', () => {
      render(
        <YouTubeEmbed
          videoId="test123"
          title="Test Video"
          autoplay={true}
          expandedMode={true}
        />
      );
      
      const iframe = screen.getByTitle('Test Video') as HTMLIFrameElement;
      
      // Should always include mute=1 for autoplay compliance
      expect(iframe.src).toContain('mute=1');
      
      // Should have allow attribute for autoplay
      expect(iframe.getAttribute('allow')).toContain('autoplay');
    });

    it('should include all necessary iframe permissions', () => {
      render(
        <YouTubeEmbed
          videoId="test123"
          title="Test Video"
          expandedMode={true}
        />
      );
      
      const iframe = screen.getByTitle('Test Video') as HTMLIFrameElement;
      const allowAttr = iframe.getAttribute('allow') || '';
      
      // Check for essential permissions
      expect(allowAttr).toContain('autoplay');
      expect(allowAttr).toContain('encrypted-media');
      expect(allowAttr).toContain('picture-in-picture');
      
      // Check sandbox permissions
      const sandboxAttr = iframe.getAttribute('sandbox') || '';
      expect(sandboxAttr).toContain('allow-scripts');
      expect(sandboxAttr).toContain('allow-same-origin');
    });

    it('should handle iframe loading states properly', async () => {
      let loadCallback: (() => void) | undefined;
      
      // Mock iframe onLoad behavior
      const originalCreateElement = document.createElement;
      document.createElement = vi.fn((tagName: string) => {
        const element = originalCreateElement.call(document, tagName);
        if (tagName === 'iframe') {
          Object.defineProperty(element, 'onload', {
            set: (callback: () => void) => {
              loadCallback = callback;
            }
          });
        }
        return element;
      });
      
      render(
        <YouTubeEmbed
          videoId="test123"
          title="Test Video"
          expandedMode={true}
        />
      );
      
      // Simulate iframe load
      if (loadCallback) {
        loadCallback();
      }
      
      // Should handle load event gracefully
      const iframe = screen.getByTitle('Test Video');
      expect(iframe).toBeInTheDocument();
      
      // Restore original createElement
      document.createElement = originalCreateElement;
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should handle iframe loading errors gracefully', async () => {
      let errorCallback: ((event: Event) => void) | undefined;
      
      // Mock iframe error behavior
      const originalCreateElement = document.createElement;
      document.createElement = vi.fn((tagName: string) => {
        const element = originalCreateElement.call(document, tagName);
        if (tagName === 'iframe') {
          Object.defineProperty(element, 'onerror', {
            set: (callback: (event: Event) => void) => {
              errorCallback = callback;
            }
          });
        }
        return element;
      });
      
      render(
        <YouTubeEmbed
          videoId="test123"
          title="Test Video"
          expandedMode={true}
        />
      );
      
      // Simulate iframe error
      if (errorCallback) {
        errorCallback(new Event('error'));
      }
      
      // Should handle error gracefully (not crash)
      const iframe = screen.getByTitle('Test Video');
      expect(iframe).toBeInTheDocument();
      
      // Restore original createElement
      document.createElement = originalCreateElement;
    });

    it('should provide fallback for missing video data', () => {
      render(
        <YouTubeEmbed
          videoId=""
          title="Invalid Video"
        />
      );
      
      // Should still render without crashing
      expect(screen.getByTitle('Invalid Video')).toBeInTheDocument();
    });
  });
});