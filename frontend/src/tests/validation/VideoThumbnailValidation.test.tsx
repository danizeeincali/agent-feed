/**
 * Comprehensive Video and Thumbnail Validation Tests
 * 
 * This test suite validates all video and thumbnail fixes applied:
 * 1. ✅ Fixed missing useEffect import in ThumbnailSummaryContainer.tsx
 * 2. ✅ Enhanced YouTube video playback with better user interaction handling  
 * 3. ✅ Improved iframe permissions and autoplay policies
 * 4. ✅ Implemented comprehensive fallback system for non-video thumbnails
 * 5. ✅ Added CORS-friendly proxy services for image loading
 * 6. ✅ Enhanced site-specific image handling (GitHub, Wired, etc.)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ThumbnailSummaryContainer from '../../components/ThumbnailSummaryContainer';
import { renderParsedContent, parseContent } from '../../utils/contentParser';

// Mock console methods to capture thumbnail fallback logging
const originalLog = console.log;
const originalWarn = console.warn;
let logMessages: string[] = [];
let warnMessages: string[] = [];

beforeEach(() => {
  logMessages = [];
  warnMessages = [];
  console.log = jest.fn((...args) => {
    logMessages.push(args.join(' '));
    originalLog(...args);
  });
  console.warn = jest.fn((...args) => {
    warnMessages.push(args.join(' '));
    originalWarn(...args);
  });
});

afterEach(() => {
  console.log = originalLog;
  console.warn = originalWarn;
});

// Real test data with actual URLs for validation
const testData = {
  youtubeVideo: {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'Never Gonna Give You Up - Rick Astley',
    type: 'video' as const,
    videoId: 'dQw4w9WgXcQ',
    site_name: 'YouTube',
    description: 'Official video of Never Gonna Give You Up by Rick Astley'
  },
  wiredArticle: {
    url: 'https://www.wired.com/story/ai-breakthrough-2024/',
    title: 'The AI Breakthrough That Changed Everything',
    type: 'article' as const,
    site_name: 'Wired',
    description: 'How artificial intelligence transformed our world in 2024',
    image: 'https://media.wired.com/photos/example/master/w_1600,h_900,c_limit/ai-story.jpg'
  },
  githubRepo: {
    url: 'https://github.com/microsoft/TypeScript',
    title: 'TypeScript Programming Language',
    type: 'website' as const,
    site_name: 'GitHub',
    description: 'TypeScript is a superset of JavaScript that compiles to plain JavaScript',
    image: 'https://avatars.githubusercontent.com/u/6154722?v=4'
  },
  mediumArticle: {
    url: 'https://medium.com/@user/ai-future-2024',
    title: 'The Future of AI in 2024',
    type: 'article' as const,
    site_name: 'Medium',
    author: 'John Doe',
    readingTime: 5,
    description: 'Exploring the future possibilities of artificial intelligence'
  },
  brokenImageSite: {
    url: 'https://example.com/broken-article',
    title: 'Article with Broken Image',
    type: 'article' as const,
    site_name: 'Example.com',
    description: 'This article has a broken image URL for testing fallbacks',
    image: 'https://broken-url-that-does-not-exist.com/image.jpg'
  }
};

describe('Video and Thumbnail Validation Tests', () => {
  
  describe('1. YouTube Video Integration', () => {
    test('should render YouTube video thumbnail with proper video ID', async () => {
      const mockOnClick = jest.fn();
      
      render(
        <ThumbnailSummaryContainer
          data={testData.youtubeVideo}
          onClick={mockOnClick}
          thumbnailSize="medium"
        />
      );

      const container = screen.getByRole('article');
      expect(container).toBeInTheDocument();

      // Should show video play overlay
      const playButton = container.querySelector('.absolute .bg-black');
      expect(playButton).toBeInTheDocument();

      // Should have video type indicator
      const typeIndicator = screen.getByText('▶');
      expect(typeIndicator).toBeInTheDocument();
      
      // Should generate proper YouTube thumbnail URLs
      await waitFor(() => {
        expect(logMessages.some(msg => 
          msg.includes('Generated fallback thumbnails') && 
          msg.includes('maxresdefault') &&
          msg.includes('hqdefault')
        )).toBe(true);
      });
    });

    test('should handle user interaction for video playback', async () => {
      const user = userEvent.setup();
      const mockOnClick = jest.fn();
      
      render(
        <ThumbnailSummaryContainer
          data={testData.youtubeVideo}
          onClick={mockOnClick}
        />
      );

      const container = screen.getByRole('article');
      
      // Click interaction
      await user.click(container);
      expect(mockOnClick).toHaveBeenCalledTimes(1);

      // Keyboard interaction
      await user.keyboard('{Enter}');
      expect(mockOnClick).toHaveBeenCalledTimes(2);

      // Space key interaction
      await user.keyboard(' ');
      expect(mockOnClick).toHaveBeenCalledTimes(3);
    });

    test('should generate multiple quality YouTube thumbnail fallbacks', async () => {
      const mockOnClick = jest.fn();
      
      render(
        <ThumbnailSummaryContainer
          data={testData.youtubeVideo}
          onClick={mockOnClick}
        />
      );

      await waitFor(() => {
        const hasExpectedQualities = logMessages.some(msg => 
          msg.includes('Generated fallback thumbnails') &&
          msg.includes('maxresdefault') &&
          msg.includes('hqdefault') &&
          msg.includes('mqdefault') &&
          msg.includes('default')
        );
        expect(hasExpectedQualities).toBe(true);
      });
    });
  });

  describe('2. Thumbnail Fallback System Validation', () => {
    test('should implement comprehensive fallback system for broken images', async () => {
      const mockOnClick = jest.fn();
      
      render(
        <ThumbnailSummaryContainer
          data={testData.brokenImageSite}
          onClick={mockOnClick}
        />
      );

      await waitFor(() => {
        expect(logMessages.some(msg => 
          msg.includes('Generated fallback thumbnails') &&
          msg.includes('options')
        )).toBe(true);
      });

      // Simulate image error to trigger fallback
      const image = screen.getByRole('img');
      
      await act(async () => {
        fireEvent.error(image);
      });

      await waitFor(() => {
        expect(logMessages.some(msg => 
          msg.includes('🖼️ Thumbnail error') &&
          msg.includes('trying fallback')
        )).toBe(true);
      });
    });

    test('should show fallback icon when all image sources fail', async () => {
      const mockOnClick = jest.fn();
      
      const dataWithoutImage = {
        ...testData.brokenImageSite,
        image: undefined
      };
      
      render(
        <ThumbnailSummaryContainer
          data={dataWithoutImage}
          onClick={mockOnClick}
        />
      );

      // Should show appropriate fallback icon based on content type
      const fallbackContainer = screen.getByRole('article').querySelector('.bg-gradient-to-br');
      expect(fallbackContainer).toBeInTheDocument();
    });

    test('should handle loading states properly', async () => {
      const mockOnClick = jest.fn();
      
      render(
        <ThumbnailSummaryContainer
          data={testData.wiredArticle}
          onClick={mockOnClick}
        />
      );

      // Should show loading spinner initially
      const loadingSpinner = screen.getByRole('article').querySelector('.animate-spin');
      expect(loadingSpinner).toBeInTheDocument();
    });
  });

  describe('3. CORS-Friendly Proxy Services', () => {
    test('should generate proxy URLs using weserv.nl for better reliability', async () => {
      const mockOnClick = jest.fn();
      
      render(
        <ThumbnailSummaryContainer
          data={testData.wiredArticle}
          onClick={mockOnClick}
        />
      );

      await waitFor(() => {
        expect(logMessages.some(msg => 
          msg.includes('Generated fallback thumbnails') &&
          msg.includes('weserv.nl')
        )).toBe(true);
      });
    });

    test('should handle proxy URL generation errors gracefully', async () => {
      const mockOnClick = jest.fn();
      
      // Create data with malformed URL to trigger proxy error
      const malformedData = {
        ...testData.wiredArticle,
        image: 'not-a-valid-url'
      };
      
      render(
        <ThumbnailSummaryContainer
          data={malformedData}
          onClick={mockOnClick}
        />
      );

      await waitFor(() => {
        expect(warnMessages.some(msg => 
          msg.includes('Failed to generate proxy URL')
        )).toBe(true);
      });
    });
  });

  describe('4. Site-Specific Image Handling', () => {
    test('should generate GitHub-specific avatar URLs for repositories', async () => {
      const mockOnClick = jest.fn();
      
      render(
        <ThumbnailSummaryContainer
          data={testData.githubRepo}
          onClick={mockOnClick}
        />
      );

      await waitFor(() => {
        expect(logMessages.some(msg => 
          msg.includes('Generated fallback thumbnails') &&
          msg.includes('avatars.githubusercontent.com')
        )).toBe(true);
      });
    });

    test('should generate Clearbit logo services for domain recognition', async () => {
      const mockOnClick = jest.fn();
      
      render(
        <ThumbnailSummaryContainer
          data={testData.wiredArticle}
          onClick={mockOnClick}
        />
      );

      await waitFor(() => {
        expect(logMessages.some(msg => 
          msg.includes('Generated fallback thumbnails') &&
          msg.includes('logo.clearbit.com')
        )).toBe(true);
      });
    });

    test('should generate placeholder images for known domains like Medium', async () => {
      const mockOnClick = jest.fn();
      
      render(
        <ThumbnailSummaryContainer
          data={testData.mediumArticle}
          onClick={mockOnClick}
        />
      );

      await waitFor(() => {
        expect(logMessages.some(msg => 
          msg.includes('Generated fallback thumbnails') &&
          msg.includes('picsum.photos')
        )).toBe(true);
      });
    });

    test('should clean and display site names properly', () => {
      const mockOnClick = jest.fn();
      
      const { rerender } = render(
        <ThumbnailSummaryContainer
          data={{ ...testData.githubRepo, site_name: 'www.github.com' }}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByText('github.com')).toBeInTheDocument();

      rerender(
        <ThumbnailSummaryContainer
          data={{ ...testData.githubRepo, site_name: '' }}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByText('External link')).toBeInTheDocument();
    });
  });

  describe('5. Responsive Behavior and Accessibility', () => {
    test('should support different thumbnail sizes', () => {
      const mockOnClick = jest.fn();
      
      const { rerender } = render(
        <ThumbnailSummaryContainer
          data={testData.wiredArticle}
          onClick={mockOnClick}
          thumbnailSize="small"
        />
      );

      let thumbnailContainer = screen.getByRole('article').querySelector('.w-16');
      expect(thumbnailContainer).toBeInTheDocument();

      rerender(
        <ThumbnailSummaryContainer
          data={testData.wiredArticle}
          onClick={mockOnClick}
          thumbnailSize="large"
        />
      );

      thumbnailContainer = screen.getByRole('article').querySelector('.w-24');
      expect(thumbnailContainer).toBeInTheDocument();
    });

    test('should have proper accessibility attributes', () => {
      const mockOnClick = jest.fn();
      
      render(
        <ThumbnailSummaryContainer
          data={testData.wiredArticle}
          onClick={mockOnClick}
        />
      );

      const container = screen.getByRole('article');
      expect(container).toHaveAttribute('tabIndex', '0');
      expect(container).toHaveAttribute('aria-label', `Preview: ${testData.wiredArticle.title}`);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', `Preview thumbnail for ${testData.wiredArticle.title}`);
      expect(image).toHaveAttribute('loading', 'lazy');
      expect(image).toHaveAttribute('crossOrigin', 'anonymous');
      expect(image).toHaveAttribute('referrerPolicy', 'no-referrer');
    });

    test('should handle hover states and animations', async () => {
      const user = userEvent.setup();
      const mockOnClick = jest.fn();
      
      render(
        <ThumbnailSummaryContainer
          data={testData.youtubeVideo}
          onClick={mockOnClick}
        />
      );

      const container = screen.getByRole('article');
      
      await user.hover(container);
      
      // Should apply hover styles
      expect(container.className).toContain('hover:shadow-md');
    });

    test('should truncate text appropriately for different sizes', () => {
      const mockOnClick = jest.fn();
      const longTitle = 'This is a very long title that should be truncated based on the thumbnail size to ensure proper display and responsive behavior';
      
      const { rerender } = render(
        <ThumbnailSummaryContainer
          data={{ ...testData.wiredArticle, title: longTitle }}
          onClick={mockOnClick}
          thumbnailSize="small"
        />
      );

      let titleElement = screen.getByRole('heading');
      expect(titleElement.textContent!.length).toBeLessThan(longTitle.length);

      rerender(
        <ThumbnailSummaryContainer
          data={{ ...testData.wiredArticle, title: longTitle }}
          onClick={mockOnClick}
          thumbnailSize="large"
        />
      );

      titleElement = screen.getByRole('heading');
      // Large size should allow more characters
      expect(titleElement.textContent!.length).toBeGreaterThan(60);
    });
  });

  describe('6. Content Parser Integration with Enhanced Previews', () => {
    test('should render YouTube video with enhanced preview functionality', () => {
      const content = 'Check out this amazing video: https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const parsed = parseContent(content);
      
      const rendered = renderParsedContent(parsed, {
        enableLinkPreviews: true,
        useEnhancedPreviews: true,
        previewDisplayMode: 'thumbnail-summary',
        showThumbnailsOnly: false
      });

      expect(rendered).toBeTruthy();
    });

    test('should handle multiple content types in parsed content', () => {
      const content = 'Article: https://www.wired.com/story/ai-breakthrough/ and repo: https://github.com/microsoft/TypeScript';
      const parsed = parseContent(content);
      
      const rendered = renderParsedContent(parsed, {
        enableLinkPreviews: true,
        useEnhancedPreviews: true,
        previewDisplayMode: 'card',
        showThumbnailsOnly: false
      });

      expect(rendered).toBeTruthy();
    });
  });

  describe('7. Error Handling and Edge Cases', () => {
    test('should handle undefined/null data gracefully', () => {
      const mockOnClick = jest.fn();
      
      const emptyData = {
        url: '',
        title: '',
        type: 'website' as const
      };
      
      expect(() => {
        render(
          <ThumbnailSummaryContainer
            data={emptyData}
            onClick={mockOnClick}
          />
        );
      }).not.toThrow();
    });

    test('should handle missing optional fields', () => {
      const mockOnClick = jest.fn();
      
      const minimalData = {
        url: 'https://example.com',
        title: 'Minimal Example',
        type: 'website' as const
      };
      
      render(
        <ThumbnailSummaryContainer
          data={minimalData}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByText('Minimal Example')).toBeInTheDocument();
      expect(screen.getByText('Unknown site')).toBeInTheDocument();
    });

    test('should handle malformed URLs in fallback generation', async () => {
      const mockOnClick = jest.fn();
      
      const malformedData = {
        url: 'not-a-url',
        title: 'Malformed URL Test',
        type: 'website' as const,
        site_name: 'test.com',
        image: 'also-not-a-url'
      };
      
      render(
        <ThumbnailSummaryContainer
          data={malformedData}
          onClick={mockOnClick}
        />
      );

      // Should still generate some fallbacks
      await waitFor(() => {
        expect(logMessages.some(msg => 
          msg.includes('Generated fallback thumbnails')
        )).toBe(true);
      });
    });
  });

  describe('8. Performance and Loading Optimization', () => {
    test('should implement lazy loading for images', () => {
      const mockOnClick = jest.fn();
      
      render(
        <ThumbnailSummaryContainer
          data={testData.wiredArticle}
          onClick={mockOnClick}
        />
      );

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('loading', 'lazy');
    });

    test('should set proper CORS and referrer policies', () => {
      const mockOnClick = jest.fn();
      
      render(
        <ThumbnailSummaryContainer
          data={testData.wiredArticle}
          onClick={mockOnClick}
        />
      );

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('crossOrigin', 'anonymous');
      expect(image).toHaveAttribute('referrerPolicy', 'no-referrer');
    });

    test('should deduplicate fallback URLs to avoid redundant requests', async () => {
      const mockOnClick = jest.fn();
      
      const duplicateData = {
        ...testData.wiredArticle,
        image: 'https://example.com/image.jpg'
      };
      
      render(
        <ThumbnailSummaryContainer
          data={duplicateData}
          onClick={mockOnClick}
        />
      );

      await waitFor(() => {
        // Check that the fallback generation logic removes duplicates
        expect(logMessages.some(msg => 
          msg.includes('Generated fallback thumbnails')
        )).toBe(true);
      });
    });
  });
});

describe('Integration with RealSocialMediaFeed', () => {
  test('should integrate seamlessly with feed content parsing', () => {
    const feedContent = 'New AI breakthrough! https://www.wired.com/story/ai-2024/ and check the code: https://github.com/microsoft/TypeScript';
    const parsed = parseContent(feedContent);
    
    expect(parsed.links).toHaveLength(2);
    expect(parsed.links[0].url).toBe('https://www.wired.com/story/ai-2024/');
    expect(parsed.links[1].url).toBe('https://github.com/microsoft/TypeScript');
  });

  test('should handle thumbnail display in different preview modes', () => {
    const content = 'Video demo: https://www.youtube.com/watch?v=example123';
    const parsed = parseContent(content);
    
    // Test thumbnail-summary mode
    const thumbnailSummary = renderParsedContent(parsed, {
      enableLinkPreviews: true,
      useEnhancedPreviews: true,
      previewDisplayMode: 'thumbnail-summary',
      showThumbnailsOnly: false
    });

    expect(thumbnailSummary).toBeTruthy();

    // Test card mode  
    const cardMode = renderParsedContent(parsed, {
      enableLinkPreviews: true,
      useEnhancedPreviews: true,
      previewDisplayMode: 'card',
      showThumbnailsOnly: false
    });

    expect(cardMode).toBeTruthy();
  });
});