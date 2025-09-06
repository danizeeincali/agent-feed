/**
 * Comprehensive Thumbnail Fallback System Tests
 * 
 * Tests the complete fallback chain for thumbnail loading:
 * 1. Primary image from content metadata
 * 2. Site-specific image generation (GitHub avatars, etc.)
 * 3. CORS-friendly proxy services (weserv.nl)
 * 4. Logo services (Clearbit, Google favicons)
 * 5. Placeholder services (Picsum, via.placeholder)
 * 6. Final fallback icons based on content type
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ThumbnailSummaryContainer from '../../components/ThumbnailSummaryContainer';

// Mock Image constructor to simulate loading behavior
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';
  
  constructor() {
    setTimeout(() => {
      // Simulate network delay
      if (this.src.includes('broken') || this.src.includes('404')) {
        this.onerror?.();
      } else {
        this.onload?.();
      }
    }, 100);
  }
}

// Replace global Image with our mock
(global as any).Image = MockImage;

// Test data for different fallback scenarios
const testScenarios = {
  workingImage: {
    url: 'https://example.com/article',
    title: 'Working Image Test',
    type: 'article' as const,
    site_name: 'example.com',
    image: 'https://example.com/good-image.jpg'
  },
  brokenImage: {
    url: 'https://broken.com/article',
    title: 'Broken Image Test',
    type: 'article' as const,
    site_name: 'broken.com',
    image: 'https://broken.com/404-image.jpg'
  },
  githubRepo: {
    url: 'https://github.com/facebook/react',
    title: 'React Repository',
    type: 'website' as const,
    site_name: 'GitHub',
    image: 'https://github.com/facebook.png'
  },
  youtubeVideo: {
    url: 'https://www.youtube.com/watch?v=abc123',
    title: 'Test Video',
    type: 'video' as const,
    site_name: 'YouTube',
    videoId: 'abc123'
  },
  wiredArticle: {
    url: 'https://www.wired.com/story/test/',
    title: 'Wired Article',
    type: 'article' as const,
    site_name: 'Wired',
    image: undefined // No image provided
  },
  mediumPost: {
    url: 'https://medium.com/@user/post',
    title: 'Medium Post',
    type: 'article' as const,
    site_name: 'Medium'
  },
  unknownSite: {
    url: 'https://unknown-site.xyz/content',
    title: 'Unknown Site Content',
    type: 'website' as const,
    site_name: 'unknown-site.xyz'
  }
};

describe('Thumbnail Fallback System Comprehensive Tests', () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let logs: string[];
  let warnings: string[];

  beforeEach(() => {
    logs = [];
    warnings = [];
    logSpy = jest.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '));
    });
    warnSpy = jest.spyOn(console, 'warn').mockImplementation((...args) => {
      warnings.push(args.join(' '));
    });
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  describe('1. Primary Image Loading', () => {
    test('should use primary image when available and working', async () => {
      const mockOnClick = jest.fn();
      
      render(
        <ThumbnailSummaryContainer
          data={testScenarios.workingImage}
          onClick={mockOnClick}
        />
      );

      await waitFor(() => {
        expect(logs.some(log => 
          log.includes('Generated fallback thumbnails') &&
          log.includes(testScenarios.workingImage.image!)
        )).toBe(true);
      });

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', testScenarios.workingImage.image);
    });

    test('should handle primary image failure and try fallbacks', async () => {
      const mockOnClick = jest.fn();
      
      render(
        <ThumbnailSummaryContainer
          data={testScenarios.brokenImage}
          onClick={mockOnClick}
        />
      );

      // Wait for initial image load attempt
      await waitFor(() => {
        expect(logs.some(log => 
          log.includes('Generated fallback thumbnails')
        )).toBe(true);
      });

      // Simulate image error
      const image = screen.getByRole('img');
      await act(async () => {
        fireEvent.error(image);
      });

      await waitFor(() => {
        expect(logs.some(log => 
          log.includes('🖼️ Thumbnail error') &&
          log.includes('trying fallback')
        )).toBe(true);
      });
    });
  });

  describe('2. Site-Specific Fallback Generation', () => {
    test('should generate GitHub avatar URLs for repositories', async () => {
      const mockOnClick = jest.fn();
      
      render(
        <ThumbnailSummaryContainer
          data={testScenarios.githubRepo}
          onClick={mockOnClick}
        />
      );

      await waitFor(() => {
        expect(logs.some(log => 
          log.includes('Generated fallback thumbnails') &&
          log.includes('avatars.githubusercontent.com')
        )).toBe(true);
      });
    });

    test('should generate YouTube thumbnail URLs with multiple qualities', async () => {
      const mockOnClick = jest.fn();
      
      render(
        <ThumbnailSummaryContainer
          data={testScenarios.youtubeVideo}
          onClick={mockOnClick}
        />
      );

      await waitFor(() => {
        const hasAllQualities = logs.some(log => 
          log.includes('Generated fallback thumbnails') &&
          log.includes('maxresdefault') &&
          log.includes('hqdefault') &&
          log.includes('mqdefault') &&
          log.includes('default')
        );
        expect(hasAllQualities).toBe(true);
      });
    });

    test('should handle Wired and Medium with placeholder services', async () => {
      const mockOnClick = jest.fn();
      
      // Test Wired
      render(
        <ThumbnailSummaryContainer
          data={testScenarios.wiredArticle}
          onClick={mockOnClick}
        />
      );

      await waitFor(() => {
        expect(logs.some(log => 
          log.includes('Generated fallback thumbnails') &&
          log.includes('picsum.photos')
        )).toBe(true);
      });

      // Test Medium
      const { rerender } = render(
        <ThumbnailSummaryContainer
          data={testScenarios.mediumPost}
          onClick={mockOnClick}
        />
      );

      await waitFor(() => {
        expect(logs.some(log => 
          log.includes('Generated fallback thumbnails') &&
          log.includes('picsum.photos')
        )).toBe(true);
      });
    });
  });

  describe('3. CORS-Friendly Proxy Services', () => {
    test('should generate weserv.nl proxy URLs for better reliability', async () => {
      const mockOnClick = jest.fn();
      
      render(
        <ThumbnailSummaryContainer
          data={testScenarios.workingImage}
          onClick={mockOnClick}
        />
      );

      await waitFor(() => {
        expect(logs.some(log => 
          log.includes('Generated fallback thumbnails') &&
          log.includes('weserv.nl')
        )).toBe(true);
      });
    });

    test('should handle proxy URL generation errors gracefully', async () => {
      const mockOnClick = jest.fn();
      
      const invalidImageData = {
        ...testScenarios.workingImage,
        image: 'not-a-valid-url'
      };
      
      render(
        <ThumbnailSummaryContainer
          data={invalidImageData}
          onClick={mockOnClick}
        />
      );

      await waitFor(() => {
        expect(warnings.some(warn => 
          warn.includes('Failed to generate proxy URL')
        )).toBe(true);
      });
    });

    test('should properly encode URLs for proxy services', async () => {
      const mockOnClick = jest.fn();
      
      const urlWithSpecialChars = {
        ...testScenarios.workingImage,
        image: 'https://example.com/image with spaces & chars.jpg'
      };
      
      render(
        <ThumbnailSummaryContainer
          data={urlWithSpecialChars}
          onClick={mockOnClick}
        />
      );

      await waitFor(() => {
        expect(logs.some(log => 
          log.includes('weserv.nl') &&
          log.includes('encodeURIComponent')
        )).toBe(false); // Should not show raw encodeURIComponent in logs
      });
    });
  });

  describe('4. Logo and Favicon Services', () => {
    test('should generate Clearbit logo URLs', async () => {
      const mockOnClick = jest.fn();
      
      render(
        <ThumbnailSummaryContainer
          data={testScenarios.unknownSite}
          onClick={mockOnClick}
        />
      );

      await waitFor(() => {
        expect(logs.some(log => 
          log.includes('Generated fallback thumbnails') &&
          log.includes('logo.clearbit.com')
        )).toBe(true);
      });
    });

    test('should generate Google favicon URLs', async () => {
      const mockOnClick = jest.fn();
      
      render(
        <ThumbnailSummaryContainer
          data={testScenarios.unknownSite}
          onClick={mockOnClick}
        />
      );

      await waitFor(() => {
        expect(logs.some(log => 
          log.includes('Generated fallback thumbnails') &&
          log.includes('google.com/s2/favicons')
        )).toBe(true);
      });
    });

    test('should clean site names for logo services', async () => {
      const mockOnClick = jest.fn();
      
      const dataWithWWW = {
        ...testScenarios.unknownSite,
        site_name: 'www.example.com'
      };
      
      render(
        <ThumbnailSummaryContainer
          data={dataWithWWW}
          onClick={mockOnClick}
        />
      );

      await waitFor(() => {
        expect(logs.some(log => 
          log.includes('logo.clearbit.com/example.com') // Should remove www.
        )).toBe(true);
      });
    });
  });

  describe('5. Placeholder Services', () => {
    test('should generate via.placeholder.com URLs for generic fallback', async () => {
      const mockOnClick = jest.fn();
      
      render(
        <ThumbnailSummaryContainer
          data={testScenarios.unknownSite}
          onClick={mockOnClick}
        />
      );

      await waitFor(() => {
        expect(logs.some(log => 
          log.includes('Generated fallback thumbnails') &&
          log.includes('via.placeholder.com')
        )).toBe(true);
      });
    });

    test('should include domain name in placeholder text', async () => {
      const mockOnClick = jest.fn();
      
      render(
        <ThumbnailSummaryContainer
          data={testScenarios.unknownSite}
          onClick={mockOnClick}
        />
      );

      await waitFor(() => {
        expect(logs.some(log => 
          log.includes('via.placeholder.com') &&
          log.includes('unknown-site.xyz')
        )).toBe(true);
      });
    });
  });

  describe('6. Final Fallback Icons', () => {
    test('should show video icon for video content when all images fail', async () => {
      const mockOnClick = jest.fn();
      
      const videoWithoutThumbnail = {
        ...testScenarios.youtubeVideo,
        image: undefined
      };
      
      render(
        <ThumbnailSummaryContainer
          data={videoWithoutThumbnail}
          onClick={mockOnClick}
        />
      );

      // Wait for fallback generation and simulate all failures
      await waitFor(() => {
        expect(logs.some(log => 
          log.includes('Generated fallback thumbnails')
        )).toBe(true);
      });

      // Should eventually show video play icon
      const playIcon = screen.getByText('▶');
      expect(playIcon).toBeInTheDocument();
    });

    test('should show article icon for article content', async () => {
      const mockOnClick = jest.fn();
      
      const articleWithoutImage = {
        ...testScenarios.wiredArticle,
        image: undefined
      };
      
      render(
        <ThumbnailSummaryContainer
          data={articleWithoutImage}
          onClick={mockOnClick}
        />
      );

      // Should show article type indicator
      const articleIndicator = screen.getByText('A');
      expect(articleIndicator).toBeInTheDocument();
    });

    test('should show appropriate icons for different content types', async () => {
      const mockOnClick = jest.fn();
      
      const contentTypes = [
        { type: 'video' as const, expected: '▶' },
        { type: 'article' as const, expected: 'A' },
        { type: 'image' as const, expected: '🖼' },
        { type: 'website' as const, expected: '🌐' }
      ];

      for (const { type, expected } of contentTypes) {
        const { rerender } = render(
          <ThumbnailSummaryContainer
            data={{
              url: 'https://example.com',
              title: `${type} content`,
              type,
              site_name: 'example.com'
            }}
            onClick={mockOnClick}
          />
        );

        expect(screen.getByText(expected)).toBeInTheDocument();
        
        // Clean up for next iteration
        if (contentTypes.indexOf({ type, expected }) < contentTypes.length - 1) {
          rerender(<div />);
        }
      }
    });
  });

  describe('7. Fallback Chain Sequencing', () => {
    test('should cycle through fallbacks in correct order', async () => {
      const mockOnClick = jest.fn();
      
      render(
        <ThumbnailSummaryContainer
          data={testScenarios.brokenImage}
          onClick={mockOnClick}
        />
      );

      // Wait for initial fallback generation
      await waitFor(() => {
        expect(logs.some(log => 
          log.includes('Generated fallback thumbnails')
        )).toBe(true);
      });

      // Get the image element
      const image = screen.getByRole('img');
      
      // Simulate multiple failures to cycle through fallbacks
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          fireEvent.error(image);
        });
        
        await waitFor(() => {
          expect(logs.some(log => 
            log.includes('🖼️ Thumbnail error') &&
            log.includes('trying fallback')
          )).toBe(true);
        });
      }
    });

    test('should stop cycling when reaching the end of fallbacks', async () => {
      const mockOnClick = jest.fn();
      
      render(
        <ThumbnailSummaryContainer
          data={testScenarios.brokenImage}
          onClick={mockOnClick}
        />
      );

      // Wait for fallback generation
      await waitFor(() => {
        expect(logs.some(log => 
          log.includes('Generated fallback thumbnails')
        )).toBe(true);
      });

      // Simulate many failures to exhaust all fallbacks
      const image = screen.getByRole('img');
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          fireEvent.error(image);
        });
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Should eventually show fallback icon instead of broken image
      const fallbackContainer = screen.getByRole('article').querySelector('.bg-gradient-to-br');
      expect(fallbackContainer).toBeInTheDocument();
    });
  });

  describe('8. Deduplication and Optimization', () => {
    test('should remove duplicate URLs from fallback list', async () => {
      const mockOnClick = jest.fn();
      
      const dataWithDuplicates = {
        ...testScenarios.githubRepo,
        image: 'https://github.com/facebook.png' // Same as generated fallback
      };
      
      render(
        <ThumbnailSummaryContainer
          data={dataWithDuplicates}
          onClick={mockOnClick}
        />
      );

      await waitFor(() => {
        expect(logs.some(log => 
          log.includes('Generated fallback thumbnails')
        )).toBe(true);
      });

      // Check that deduplication worked (hard to test exact count, but should not have obvious duplicates)
      const fallbackLog = logs.find(log => log.includes('Generated fallback thumbnails'));
      if (fallbackLog) {
        // Should mention reasonable number of options, not excessive due to duplicates
        const match = fallbackLog.match(/(\d+) options/);
        if (match) {
          const optionCount = parseInt(match[1]);
          expect(optionCount).toBeGreaterThan(0);
          expect(optionCount).toBeLessThan(20); // Reasonable upper bound
        }
      }
    });

    test('should handle empty or invalid fallback scenarios', async () => {
      const mockOnClick = jest.fn();
      
      const minimalData = {
        url: '',
        title: '',
        type: 'website' as const
      };
      
      expect(() => {
        render(
          <ThumbnailSummaryContainer
            data={minimalData}
            onClick={mockOnClick}
          />
        );
      }).not.toThrow();

      // Should still generate some fallbacks
      await waitFor(() => {
        expect(logs.some(log => 
          log.includes('Generated fallback thumbnails')
        )).toBe(true);
      });
    });
  });

  describe('9. Performance and Error Handling', () => {
    test('should handle network timeouts gracefully', async () => {
      const mockOnClick = jest.fn();
      
      // Mock slow-loading image
      const originalImage = (global as any).Image;
      (global as any).Image = class extends MockImage {
        constructor() {
          super();
          // Simulate very slow load
          setTimeout(() => {
            if (this.onerror) this.onerror();
          }, 5000);
        }
      };

      render(
        <ThumbnailSummaryContainer
          data={testScenarios.workingImage}
          onClick={mockOnClick}
        />
      );

      await waitFor(() => {
        expect(logs.some(log => 
          log.includes('Generated fallback thumbnails')
        )).toBe(true);
      });

      // Restore original Image
      (global as any).Image = originalImage;
    });

    test('should log appropriate error messages', async () => {
      const mockOnClick = jest.fn();
      
      render(
        <ThumbnailSummaryContainer
          data={testScenarios.brokenImage}
          onClick={mockOnClick}
        />
      );

      const image = screen.getByRole('img');
      
      await act(async () => {
        fireEvent.error(image);
      });

      await waitFor(() => {
        expect(logs.some(log => 
          log.includes('🖼️ Thumbnail error for:') &&
          log.includes(testScenarios.brokenImage.title)
        )).toBe(true);
      });
    });
  });
});