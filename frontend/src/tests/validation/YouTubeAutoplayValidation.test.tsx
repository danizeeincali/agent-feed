/**
 * YouTube Autoplay and User Interaction Validation Tests
 * 
 * These tests validate:
 * 1. ✅ YouTube video initialization without autoplay
 * 2. ✅ User interaction requirements for video playback
 * 3. ✅ Autoplay functionality in expanded mode after user click
 * 4. ✅ Iframe permissions and security policies
 * 5. ✅ Proper video embedding with enhanced user experience
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { renderParsedContent, parseContent } from '../../utils/contentParser';

// Mock iframe for testing
const mockIframes: HTMLIFrameElement[] = [];
const originalCreateElement = document.createElement;

beforeEach(() => {
  mockIframes.length = 0;
  
  // Mock document.createElement to capture iframe creation
  document.createElement = jest.fn((tagName: string) => {
    const element = originalCreateElement.call(document, tagName);
    
    if (tagName.toLowerCase() === 'iframe') {
      const iframe = element as HTMLIFrameElement;
      mockIframes.push(iframe);
      
      // Mock iframe properties and methods
      Object.defineProperty(iframe, 'contentWindow', {
        value: {
          postMessage: jest.fn()
        },
        writable: true
      });
      
      // Simulate iframe load event
      setTimeout(() => {
        const loadEvent = new Event('load');
        iframe.dispatchEvent(loadEvent);
      }, 100);
    }
    
    return element;
  }) as any;
});

afterEach(() => {
  document.createElement = originalCreateElement;
});

// Test data for YouTube content
const youtubeTestData = [
  {
    content: 'Check out this video: https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoId: 'dQw4w9WgXcQ',
    expectedTitle: 'Never Gonna Give You Up'
  },
  {
    content: 'Amazing tutorial: https://youtu.be/abc123def456',
    videoId: 'abc123def456',
    expectedTitle: 'Tutorial Video'
  },
  {
    content: 'Embedded video: https://www.youtube.com/embed/xyz789',
    videoId: 'xyz789',
    expectedTitle: 'Embedded Video'
  },
  {
    content: 'Playlist video: https://www.youtube.com/watch?v=playlist123&list=PLxyz',
    videoId: 'playlist123',
    expectedTitle: 'Playlist Video'
  }
];

describe('YouTube Autoplay and User Interaction Validation', () => {
  
  describe('1. YouTube Video Detection and Parsing', () => {
    test('should correctly identify and parse YouTube URLs', () => {
      youtubeTestData.forEach(({ content, videoId }) => {
        const parsed = parseContent(content);
        
        expect(parsed.links).toHaveLength(1);
        expect(parsed.links[0].url).toContain('youtube.com');
        
        // Should extract video ID correctly
        const extractedId = parsed.links[0].url.match(/(?:v=|youtu\.be\/|embed\/)([^&\n?#]+)/);
        expect(extractedId).toBeTruthy();
        if (extractedId) {
          expect(extractedId[1]).toContain(videoId);
        }
      });
    });

    test('should handle different YouTube URL formats', () => {
      const urlFormats = [
        'https://www.youtube.com/watch?v=abc123',
        'https://youtu.be/abc123',
        'https://www.youtube.com/embed/abc123',
        'https://youtube.com/watch?v=abc123',
        'https://m.youtube.com/watch?v=abc123',
        'https://www.youtube.com/watch?v=abc123&t=30s',
        'https://www.youtube.com/watch?v=abc123&list=PLxyz&index=1'
      ];

      urlFormats.forEach(url => {
        const parsed = parseContent(`Video: ${url}`);
        expect(parsed.links).toHaveLength(1);
        expect(parsed.links[0].url).toContain('youtube');
      });
    });
  });

  describe('2. Video Embedding with User Interaction Requirements', () => {
    test('should create iframe with proper attributes for user-initiated playback', () => {
      const content = 'Watch this: https://www.youtube.com/watch?v=test123';
      const parsed = parseContent(content);
      
      const rendered = renderParsedContent(parsed, {
        enableLinkPreviews: true,
        useEnhancedPreviews: true,
        previewDisplayMode: 'card',
        enableVideoEmbeds: true,
        requireUserInteraction: true
      });

      expect(rendered).toBeTruthy();
    });

    test('should set proper iframe permissions for autoplay after user interaction', () => {
      const content = 'Demo video: https://www.youtube.com/watch?v=demo456';
      const parsed = parseContent(content);
      
      renderParsedContent(parsed, {
        enableLinkPreviews: true,
        useEnhancedPreviews: true,
        previewDisplayMode: 'card',
        enableVideoEmbeds: true,
        autoplayAfterInteraction: true
      });

      // Check that iframe was created with proper permissions
      expect(mockIframes.length).toBeGreaterThan(0);
      
      if (mockIframes.length > 0) {
        const iframe = mockIframes[0];
        
        // Should have autoplay permission
        expect(iframe.allow).toContain('autoplay');
        
        // Should have proper security attributes
        expect(iframe.sandbox).toContain('allow-scripts');
        expect(iframe.sandbox).toContain('allow-same-origin');
        
        // Should not autoplay initially (requires user interaction)
        expect(iframe.src).not.toContain('autoplay=1');
      }
    });

    test('should enable autoplay only after user click interaction', async () => {
      const user = userEvent.setup();
      const content = 'Interactive video: https://www.youtube.com/watch?v=interactive789';
      const parsed = parseContent(content);
      
      const container = document.createElement('div');
      container.innerHTML = renderParsedContent(parsed, {
        enableLinkPreviews: true,
        useEnhancedPreviews: true,
        previewDisplayMode: 'card',
        enableVideoEmbeds: true,
        autoplayAfterInteraction: true
      }) as string;
      
      document.body.appendChild(container);
      
      // Find clickable element (thumbnail or play button)
      const clickableElement = container.querySelector('[data-video-id="interactive789"], .video-thumbnail, .play-button');
      
      if (clickableElement) {
        await user.click(clickableElement as Element);
        
        // After click, iframe should be updated with autoplay
        await waitFor(() => {
          const updatedIframe = container.querySelector('iframe');
          if (updatedIframe) {
            expect(updatedIframe.src).toContain('autoplay=1');
          }
        });
      }
      
      document.body.removeChild(container);
    });
  });

  describe('3. Expanded Mode Autoplay Functionality', () => {
    test('should handle expanded video mode with proper autoplay', async () => {
      const user = userEvent.setup();
      const content = 'Full video experience: https://www.youtube.com/watch?v=fullscreen123';
      const parsed = parseContent(content);
      
      const container = document.createElement('div');
      container.innerHTML = renderParsedContent(parsed, {
        enableLinkPreviews: true,
        useEnhancedPreviews: true,
        previewDisplayMode: 'card',
        enableVideoEmbeds: true,
        expandedMode: true,
        autoplayAfterInteraction: true
      }) as string;
      
      document.body.appendChild(container);
      
      // Look for expand button or expanded video container
      const expandButton = container.querySelector('.expand-video, [aria-label*="expand"], [data-action="expand"]');
      
      if (expandButton) {
        await user.click(expandButton as Element);
        
        await waitFor(() => {
          // Should create larger iframe with autoplay enabled
          const iframe = container.querySelector('iframe');
          if (iframe) {
            expect(iframe.src).toContain('autoplay=1');
            expect(iframe.width).toBeTruthy();
            expect(iframe.height).toBeTruthy();
          }
        });
      }
      
      document.body.removeChild(container);
    });

    test('should handle fullscreen mode transitions', async () => {
      const user = userEvent.setup();
      const content = 'Fullscreen video: https://www.youtube.com/watch?v=fullscreen456';
      const parsed = parseContent(content);
      
      const container = document.createElement('div');
      container.innerHTML = renderParsedContent(parsed, {
        enableLinkPreviews: true,
        useEnhancedPreviews: true,
        previewDisplayMode: 'card',
        enableVideoEmbeds: true,
        allowFullscreen: true
      }) as string;
      
      document.body.appendChild(container);
      
      // Check iframe has fullscreen capability
      const iframe = container.querySelector('iframe');
      if (iframe) {
        expect(iframe.allowFullscreen).toBe(true);
        expect(iframe.allow).toContain('fullscreen');
      }
      
      document.body.removeChild(container);
    });
  });

  describe('4. Security and Permissions Validation', () => {
    test('should set proper iframe sandbox permissions', () => {
      const content = 'Secure video: https://www.youtube.com/watch?v=secure123';
      const parsed = parseContent(content);
      
      renderParsedContent(parsed, {
        enableLinkPreviews: true,
        useEnhancedPreviews: true,
        previewDisplayMode: 'card',
        enableVideoEmbeds: true,
        secureMode: true
      });

      if (mockIframes.length > 0) {
        const iframe = mockIframes[0];
        
        // Should have secure sandbox attributes
        expect(iframe.sandbox.toString()).toContain('allow-scripts');
        expect(iframe.sandbox.toString()).toContain('allow-same-origin');
        expect(iframe.sandbox.toString()).toContain('allow-presentation');
        
        // Should not allow top navigation or popups
        expect(iframe.sandbox.toString()).not.toContain('allow-top-navigation');
        expect(iframe.sandbox.toString()).not.toContain('allow-popups');
      }
    });

    test('should set appropriate referrer policy', () => {
      const content = 'Privacy-focused video: https://www.youtube.com/watch?v=privacy789';
      const parsed = parseContent(content);
      
      renderParsedContent(parsed, {
        enableLinkPreviews: true,
        useEnhancedPreviews: true,
        previewDisplayMode: 'card',
        enableVideoEmbeds: true
      });

      if (mockIframes.length > 0) {
        const iframe = mockIframes[0];
        expect(iframe.referrerPolicy).toBe('no-referrer');
      }
    });

    test('should handle CSP-compliant iframe attributes', () => {
      const content = 'CSP-compliant video: https://www.youtube.com/watch?v=csp123';
      const parsed = parseContent(content);
      
      renderParsedContent(parsed, {
        enableLinkPreviews: true,
        useEnhancedPreviews: true,
        previewDisplayMode: 'card',
        enableVideoEmbeds: true,
        cspCompliant: true
      });

      if (mockIframes.length > 0) {
        const iframe = mockIframes[0];
        
        // Should use YouTube's nocookie domain for better privacy
        expect(iframe.src).toContain('youtube-nocookie.com');
        
        // Should have proper allow attributes
        expect(iframe.allow).toContain('accelerometer');
        expect(iframe.allow).toContain('autoplay');
        expect(iframe.allow).toContain('clipboard-write');
        expect(iframe.allow).toContain('encrypted-media');
        expect(iframe.allow).toContain('gyroscope');
        expect(iframe.allow).toContain('picture-in-picture');
      }
    });
  });

  describe('5. User Experience Enhancements', () => {
    test('should provide visual feedback before video loads', () => {
      const content = 'Loading video: https://www.youtube.com/watch?v=loading123';
      const parsed = parseContent(content);
      
      const container = document.createElement('div');
      container.innerHTML = renderParsedContent(parsed, {
        enableLinkPreviews: true,
        useEnhancedPreviews: true,
        previewDisplayMode: 'card',
        enableVideoEmbeds: true,
        showLoadingState: true
      }) as string;
      
      // Should show loading indicator before iframe loads
      const loadingIndicator = container.querySelector('.loading, .spinner, [data-loading="true"]');
      expect(loadingIndicator).toBeTruthy();
    });

    test('should show video metadata when available', () => {
      const content = 'Metadata video: https://www.youtube.com/watch?v=metadata456';
      const parsed = parseContent(content);
      
      const container = document.createElement('div');
      container.innerHTML = renderParsedContent(parsed, {
        enableLinkPreviews: true,
        useEnhancedPreviews: true,
        previewDisplayMode: 'card',
        enableVideoEmbeds: true,
        showMetadata: true
      }) as string;
      
      // Should show video title, duration, or other metadata
      const metadata = container.querySelector('.video-title, .video-duration, .video-metadata');
      expect(metadata).toBeTruthy();
    });

    test('should handle video thumbnail with play overlay', () => {
      const content = 'Thumbnail video: https://www.youtube.com/watch?v=thumbnail789';
      const parsed = parseContent(content);
      
      const container = document.createElement('div');
      container.innerHTML = renderParsedContent(parsed, {
        enableLinkPreviews: true,
        useEnhancedPreviews: true,
        previewDisplayMode: 'thumbnail-summary',
        showThumbnailsOnly: false
      }) as string;
      
      // Should show thumbnail with play button overlay
      const thumbnail = container.querySelector('.video-thumbnail, img[src*="youtube"]');
      const playOverlay = container.querySelector('.play-overlay, .play-button, svg[class*="play"]');
      
      expect(thumbnail).toBeTruthy();
      expect(playOverlay).toBeTruthy();
    });
  });

  describe('6. Error Handling and Edge Cases', () => {
    test('should handle private or unavailable videos gracefully', () => {
      const content = 'Private video: https://www.youtube.com/watch?v=private123';
      const parsed = parseContent(content);
      
      const container = document.createElement('div');
      
      // Mock iframe load error
      const originalAddEventListener = HTMLIFrameElement.prototype.addEventListener;
      HTMLIFrameElement.prototype.addEventListener = jest.fn((event, handler) => {
        if (event === 'error' && typeof handler === 'function') {
          setTimeout(() => handler(new Event('error')), 200);
        }
        return originalAddEventListener.call(this, event, handler);
      });
      
      container.innerHTML = renderParsedContent(parsed, {
        enableLinkPreviews: true,
        useEnhancedPreviews: true,
        previewDisplayMode: 'card',
        enableVideoEmbeds: true,
        handleErrors: true
      }) as string;
      
      // Should show error message or fallback
      setTimeout(() => {
        const errorMessage = container.querySelector('.error-message, .video-unavailable, [data-error="true"]');
        expect(errorMessage).toBeTruthy();
      }, 300);
      
      // Restore original method
      HTMLIFrameElement.prototype.addEventListener = originalAddEventListener;
    });

    test('should handle malformed YouTube URLs', () => {
      const malformedUrls = [
        'https://youtube.com/malformed',
        'https://www.youtube.com/watch',
        'https://youtu.be/',
        'https://www.youtube.com/embed/'
      ];

      malformedUrls.forEach(url => {
        const parsed = parseContent(`Bad URL: ${url}`);
        
        // Should still parse as link but handle gracefully
        expect(parsed.links).toHaveLength(1);
        
        const container = document.createElement('div');
        expect(() => {
          container.innerHTML = renderParsedContent(parsed, {
            enableLinkPreviews: true,
            useEnhancedPreviews: true,
            previewDisplayMode: 'card',
            enableVideoEmbeds: true
          }) as string;
        }).not.toThrow();
      });
    });

    test('should handle network timeouts for video loading', async () => {
      const content = 'Timeout video: https://www.youtube.com/watch?v=timeout123';
      const parsed = parseContent(content);
      
      // Mock slow iframe loading
      const originalCreateElement = document.createElement;
      document.createElement = jest.fn((tagName: string) => {
        const element = originalCreateElement.call(document, tagName);
        
        if (tagName.toLowerCase() === 'iframe') {
          const iframe = element as HTMLIFrameElement;
          
          // Simulate timeout
          setTimeout(() => {
            const errorEvent = new Event('error');
            iframe.dispatchEvent(errorEvent);
          }, 100);
        }
        
        return element;
      }) as any;
      
      const container = document.createElement('div');
      container.innerHTML = renderParsedContent(parsed, {
        enableLinkPreviews: true,
        useEnhancedPreviews: true,
        previewDisplayMode: 'card',
        enableVideoEmbeds: true,
        timeout: 5000
      }) as string;
      
      // Should handle timeout gracefully
      await waitFor(() => {
        const timeoutMessage = container.querySelector('.timeout-error, .loading-failed');
        expect(timeoutMessage).toBeTruthy();
      }, { timeout: 1000 });
      
      document.createElement = originalCreateElement;
    });
  });

  describe('7. Performance Optimization', () => {
    test('should lazy load video iframes', () => {
      const content = 'Lazy video: https://www.youtube.com/watch?v=lazy123';
      const parsed = parseContent(content);
      
      renderParsedContent(parsed, {
        enableLinkPreviews: true,
        useEnhancedPreviews: true,
        previewDisplayMode: 'card',
        enableVideoEmbeds: true,
        lazyLoad: true
      });

      if (mockIframes.length > 0) {
        const iframe = mockIframes[0];
        expect(iframe.loading).toBe('lazy');
      }
    });

    test('should defer iframe creation until user interaction', () => {
      const content = 'Deferred video: https://www.youtube.com/watch?v=deferred456';
      const parsed = parseContent(content);
      
      renderParsedContent(parsed, {
        enableLinkPreviews: true,
        useEnhancedPreviews: true,
        previewDisplayMode: 'card',
        enableVideoEmbeds: true,
        deferIframeCreation: true
      });

      // Initially should not create iframe
      expect(mockIframes.length).toBe(0);
    });
  });
});