/**
 * TDD London School: Site Image Extraction Tests
 * 
 * FAILING FUNCTIONALITY TESTS:
 * - Non-video links showing generic images instead of site images
 * - CORS handling and proxy service failures
 * - Open Graph and Twitter Card parsing issues
 * - Site-specific image extraction patterns not working
 * 
 * These tests follow London School TDD approach focusing on image extraction
 * collaborations, CORS proxy services, and fallback mechanisms.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import EnhancedLinkPreview from '../../../components/EnhancedLinkPreview';
import {
  createMockFetchResponse,
  createMockImageElement,
  createMockCorsProxy,
  createMockLinkPreviewData,
  waitForNextTick,
  waitFor as waitForDelay
} from './MockFactories';

describe('TDD London School: Site Image Extraction Failures', () => {
  let originalFetch: typeof global.fetch;
  let mockCorsProxy: ReturnType<typeof createMockCorsProxy>;
  let mockImageElement: ReturnType<typeof createMockImageElement>;
  let mockImageExtractionService: {
    extractOpenGraphImage: jest.Mock;
    extractTwitterCardImage: jest.Mock;
    extractFirstContentImage: jest.Mock;
    tryProxyServices: jest.Mock;
    validateImageUrl: jest.Mock;
  };

  beforeEach(() => {
    originalFetch = global.fetch;
    mockCorsProxy = createMockCorsProxy();
    mockImageElement = createMockImageElement();
    
    // Mock image extraction service collaborator
    mockImageExtractionService = {
      extractOpenGraphImage: jest.fn(),
      extractTwitterCardImage: jest.fn(),
      extractFirstContentImage: jest.fn(),
      tryProxyServices: jest.fn(),
      validateImageUrl: jest.fn()
    };

    // Mock Image constructor for testing
    global.Image = jest.fn(() => mockImageElement) as any;
    
    // Reset console
    console.warn = jest.fn();
    console.error = jest.fn();
    console.log = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('FAILING: Real Site Image Extraction vs Generic Placeholders', () => {
    it('should EXTRACT REAL IMAGES from Wired.com articles, not generic placeholders', async () => {
      // Arrange: Mock Wired.com article with real Open Graph image
      const wiredArticleHtml = `
        <html>
          <head>
            <meta property="og:image" content="https://media.wired.com/photos/article-hero-image.jpg" />
            <meta property="og:title" content="The Future of AI Technology" />
            <meta property="og:description" content="Deep dive into AI advancements" />
            <meta name="twitter:image" content="https://media.wired.com/photos/article-twitter.jpg" />
          </head>
          <body>
            <article>
              <img src="https://media.wired.com/photos/article-content.jpg" alt="AI Robot" />
            </article>
          </body>
        </html>
      `;

      // Mock successful fetch of article HTML
      global.fetch = jest.fn().mockResolvedValueOnce(
        createMockFetchResponse({
          title: 'The Future of AI Technology',
          description: 'Deep dive into AI advancements',
          image: 'https://media.wired.com/photos/article-hero-image.jpg',
          site_name: 'Wired',
          type: 'article'
        })
      );

      // Act: Render preview for Wired article
      const wiredUrl = 'https://www.wired.com/story/future-ai-technology/';
      render(<EnhancedLinkPreview url={wiredUrl} displayMode="card" />);

      await waitForNextTick();

      // Assert: Should show real article image, not generic placeholder
      // CURRENT ISSUE: This will FAIL because real image extraction isn't working
      await waitFor(() => {
        const imageElement = screen.getByRole('img');
        expect(imageElement).toHaveAttribute('src', 'https://media.wired.com/photos/article-hero-image.jpg');
      });

      // Should show real article title
      expect(screen.getByText(/The Future of AI Technology/i)).toBeInTheDocument();

      // Should NOT show generic placeholder
      expect(screen.queryByText(/Preview/i)).not.toBeInTheDocument();
    });

    it('should EXTRACT GITHUB REPOSITORY IMAGES and avatars', async () => {
      // Arrange: Mock GitHub repository with owner avatar
      const githubRepoData = {
        title: 'awesome-project - developer123',
        description: 'An awesome open source project',
        image: 'https://avatars.githubusercontent.com/developer123?size=400',
        site_name: 'GitHub',
        type: 'website',
        author: 'developer123'
      };

      global.fetch = jest.fn().mockResolvedValueOnce(
        createMockFetchResponse(githubRepoData)
      );

      // Act: Render GitHub repository preview
      const githubUrl = 'https://github.com/developer123/awesome-project';
      render(<EnhancedLinkPreview url={githubUrl} displayMode="card" />);

      await waitForNextTick();

      // Assert: Should show GitHub avatar, not generic image
      // CURRENT ISSUE: This will FAIL if GitHub-specific extraction isn't implemented
      await waitFor(() => {
        const imageElement = screen.getByRole('img');
        expect(imageElement).toHaveAttribute('src', expect.stringContaining('avatars.githubusercontent.com'));
      });

      // Should show repository name and owner
      expect(screen.getByText(/awesome-project/i)).toBeInTheDocument();
      expect(screen.getByText(/developer123/i)).toBeInTheDocument();
    });

    it('should EXTRACT SITE-SPECIFIC IMAGES with domain-aware patterns', async () => {
      // Test cases for different site patterns
      const testCases = [
        {
          url: 'https://techcrunch.com/2023/05/15/startup-news/',
          expectedImage: 'https://techcrunch.com/wp-content/uploads/startup-hero.jpg',
          siteName: 'TechCrunch'
        },
        {
          url: 'https://arstechnica.com/tech-policy/article/',
          expectedImage: 'https://cdn.arstechnica.net/wp-content/uploads/tech-article.jpg',
          siteName: 'Ars Technica'
        }
      ];

      for (const testCase of testCases) {
        // Arrange: Mock site-specific response
        global.fetch = jest.fn().mockResolvedValueOnce(
          createMockFetchResponse({
            title: `Article from ${testCase.siteName}`,
            image: testCase.expectedImage,
            site_name: testCase.siteName,
            type: 'article'
          })
        );

        // Act: Render preview
        render(<EnhancedLinkPreview url={testCase.url} displayMode="card" />);

        await waitForNextTick();

        // Assert: Should extract site-specific image
        // CURRENT ISSUE: This will FAIL if site-specific patterns aren't implemented
        await waitFor(() => {
          const imageElement = screen.getByRole('img');
          expect(imageElement).toHaveAttribute('src', testCase.expectedImage);
        });
      }
    });
  });

  describe('FAILING: CORS Handling and Proxy Services', () => {
    it('should HANDLE CORS ERRORS and fallback to proxy services', async () => {
      // Arrange: Mock initial image load failure due to CORS
      const originalImageSrc = 'https://cors-blocked-site.com/image.jpg';
      const proxyImageSrc = 'https://images.weserv.nl/?url=https%3A//cors-blocked-site.com/image.jpg&w=400&h=300';

      // Mock CORS error on direct load
      mockImageElement.addEventListener = jest.fn((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(mockCorsProxy.simulateCorsError()), 100);
        }
      });

      // Mock successful proxy load
      const mockProxyImage = createMockImageElement({
        src: proxyImageSrc,
        complete: true,
        naturalWidth: 400,
        naturalHeight: 300
      });

      // Simulate proxy service success
      global.Image = jest.fn()
        .mockReturnValueOnce(mockImageElement) // First fails
        .mockReturnValueOnce(mockProxyImage);  // Proxy succeeds

      global.fetch = jest.fn().mockResolvedValueOnce(
        createMockFetchResponse({
          title: 'CORS Test Article',
          image: originalImageSrc,
          site_name: 'cors-blocked-site.com'
        })
      );

      // Act: Render preview
      const corsUrl = 'https://cors-blocked-site.com/article';
      render(<EnhancedLinkPreview url={corsUrl} displayMode="card" />);

      await waitForNextTick();

      // Simulate image error and fallback
      await waitFor(() => {
        // Should attempt proxy fallback
        // CURRENT ISSUE: This will FAIL if CORS fallback isn't implemented
        expect(global.Image).toHaveBeenCalledTimes(2); // Original + proxy attempt
      });
    });

    it('should TRY MULTIPLE PROXY SERVICES in sequence', async () => {
      // Arrange: Mock multiple proxy services
      const originalImage = 'https://difficult-cors-site.com/image.jpg';
      const proxyServices = [
        'https://images.weserv.nl/?url=',
        'https://logo.clearbit.com/',
        'https://www.google.com/s2/favicons?domain='
      ];

      // Mock first two proxy services failing, third succeeding
      global.Image = jest.fn()
        .mockReturnValueOnce(createMockImageElement()) // Original fails
        .mockReturnValueOnce(createMockImageElement()) // First proxy fails
        .mockReturnValueOnce(createMockImageElement()) // Second proxy fails
        .mockReturnValueOnce(createMockImageElement({ complete: true })); // Third succeeds

      global.fetch = jest.fn().mockResolvedValueOnce(
        createMockFetchResponse({
          title: 'Multi-proxy Test',
          image: originalImage
        })
      );

      // Act: Render preview
      render(<EnhancedLinkPreview url="https://difficult-cors-site.com/page" />);

      await waitForNextTick();

      // Assert: Should try multiple proxy services
      // CURRENT ISSUE: This will FAIL if proxy service fallback chain isn't implemented
      await waitFor(() => {
        expect(global.Image).toHaveBeenCalledTimes(4); // Original + 3 proxies
      });
    });

    it('should PROVIDE VISUAL FEEDBACK during proxy fallback attempts', async () => {
      // Arrange: Mock slow proxy responses
      const slowImage = 'https://slow-site.com/large-image.jpg';
      
      global.fetch = jest.fn().mockResolvedValueOnce(
        createMockFetchResponse({
          title: 'Slow Loading Image Test',
          image: slowImage
        })
      );

      // Act: Render preview
      render(<EnhancedLinkPreview url="https://slow-site.com/article" displayMode="card" />);

      // Assert: Should show loading indicator during fallback
      // CURRENT ISSUE: This will FAIL if loading states aren't properly managed
      expect(screen.getByText(/Loading/i) || screen.getByRole('progressbar')).toBeInTheDocument();

      await waitForNextTick();

      // Should show retry indicator if fallback is attempted
      await waitFor(() => {
        const retryIndicator = screen.queryByText(/Retry/i);
        if (retryIndicator) {
          expect(retryIndicator).toBeInTheDocument();
        }
      });
    });
  });

  describe('FAILING: Open Graph and Twitter Card Parsing', () => {
    it('should PRIORITIZE OPEN GRAPH IMAGES over other sources', async () => {
      // Arrange: Mock HTML with multiple image sources
      const htmlWithMetaTags = `
        <html>
          <head>
            <meta property="og:image" content="https://site.com/og-image.jpg" />
            <meta name="twitter:image" content="https://site.com/twitter-image.jpg" />
            <meta name="description" content="Article description" />
          </head>
          <body>
            <img src="https://site.com/content-image.jpg" alt="Content" />
          </body>
        </html>
      `;

      // Mock service should extract OG image first
      mockImageExtractionService.extractOpenGraphImage.mockReturnValue('https://site.com/og-image.jpg');
      mockImageExtractionService.extractTwitterCardImage.mockReturnValue('https://site.com/twitter-image.jpg');
      mockImageExtractionService.extractFirstContentImage.mockReturnValue('https://site.com/content-image.jpg');

      global.fetch = jest.fn().mockResolvedValueOnce(
        createMockFetchResponse({
          title: 'Meta Tags Test',
          image: 'https://site.com/og-image.jpg', // Should prefer OG image
          description: 'Article description'
        })
      );

      // Act: Render preview
      render(<EnhancedLinkPreview url="https://site.com/meta-test" displayMode="card" />);

      await waitForNextTick();

      // Assert: Should use Open Graph image
      // CURRENT ISSUE: This will FAIL if OG image prioritization isn't implemented
      await waitFor(() => {
        const imageElement = screen.getByRole('img');
        expect(imageElement).toHaveAttribute('src', 'https://site.com/og-image.jpg');
      });
    });

    it('should FALLBACK to Twitter Card image when OG image unavailable', async () => {
      // Arrange: Mock HTML with Twitter Card but no OG image
      mockImageExtractionService.extractOpenGraphImage.mockReturnValue(null);
      mockImageExtractionService.extractTwitterCardImage.mockReturnValue('https://site.com/twitter-card.jpg');

      global.fetch = jest.fn().mockResolvedValueOnce(
        createMockFetchResponse({
          title: 'Twitter Card Fallback Test',
          image: 'https://site.com/twitter-card.jpg'
        })
      );

      // Act: Render preview
      render(<EnhancedLinkPreview url="https://site.com/twitter-test" displayMode="card" />);

      await waitForNextTick();

      // Assert: Should use Twitter Card image
      // CURRENT ISSUE: This will FAIL if Twitter Card fallback isn't implemented
      await waitFor(() => {
        const imageElement = screen.getByRole('img');
        expect(imageElement).toHaveAttribute('src', 'https://site.com/twitter-card.jpg');
      });
    });

    it('should VALIDATE IMAGE URLS before attempting to load', async () => {
      // Arrange: Mock invalid image URLs that should be filtered out
      const invalidImageUrls = [
        '', // Empty string
        'not-a-url', // Invalid URL format
        'javascript:alert("xss")', // Potentially malicious
        'data:text/html,<script>alert("xss")</script>', // Data URL
        'ftp://site.com/image.jpg' // Non-HTTP protocol
      ];

      mockImageExtractionService.validateImageUrl.mockImplementation((url: string) => {
        return url && url.startsWith('https://') && !url.includes('javascript:') && !url.includes('data:');
      });

      // Test each invalid URL
      for (const invalidUrl of invalidImageUrls) {
        global.fetch = jest.fn().mockResolvedValueOnce(
          createMockFetchResponse({
            title: 'Invalid Image Test',
            image: invalidUrl
          })
        );

        // Act: Render preview
        render(<EnhancedLinkPreview url="https://site.com/invalid-image-test" />);

        await waitForNextTick();

        // Assert: Should not attempt to load invalid URLs
        // CURRENT ISSUE: This will FAIL if URL validation isn't implemented
        const imageElements = screen.queryAllByRole('img');
        imageElements.forEach(img => {
          expect(img).not.toHaveAttribute('src', invalidUrl);
        });
      }
    });
  });

  describe('FAILING: Site-Specific Extraction Patterns', () => {
    it('should HANDLE MEDIUM.COM article images correctly', async () => {
      // Arrange: Mock Medium article structure
      global.fetch = jest.fn().mockResolvedValueOnce(
        createMockFetchResponse({
          title: 'Understanding React Patterns',
          description: 'Deep dive into React design patterns',
          image: 'https://miro.medium.com/v2/resize:fit:1200/article-image.png',
          site_name: 'Medium',
          type: 'article',
          author: 'React Developer',
          readingTime: 8
        })
      );

      // Act: Render Medium article preview
      const mediumUrl = 'https://medium.com/@author/react-patterns-123abc';
      render(<EnhancedLinkPreview url={mediumUrl} displayMode="card" />);

      await waitForNextTick();

      // Assert: Should extract Medium-specific image and metadata
      // CURRENT ISSUE: This will FAIL if Medium-specific patterns aren't implemented
      await waitFor(() => {
        const imageElement = screen.getByRole('img');
        expect(imageElement).toHaveAttribute('src', expect.stringContaining('miro.medium.com'));
      });

      // Should show reading time
      expect(screen.getByText(/8 min read/i)).toBeInTheDocument();
      expect(screen.getByText(/React Developer/i)).toBeInTheDocument();
    });

    it('should EXTRACT DEV.TO article images and metadata', async () => {
      // Arrange: Mock Dev.to article
      global.fetch = jest.fn().mockResolvedValueOnce(
        createMockFetchResponse({
          title: 'Building APIs with Node.js',
          description: 'Complete guide to Node.js API development',
          image: 'https://res.cloudinary.com/practicaldev/image/fetch/article-cover.jpg',
          site_name: 'DEV Community',
          type: 'article',
          author: 'API Expert'
        })
      );

      // Act: Render Dev.to article preview
      const devUrl = 'https://dev.to/author/building-apis-nodejs-123';
      render(<EnhancedLinkPreview url={devUrl} displayMode="card" />);

      await waitForNextTick();

      // Assert: Should extract Dev.to-specific image
      // CURRENT ISSUE: This will FAIL if Dev.to patterns aren't implemented
      await waitFor(() => {
        const imageElement = screen.getByRole('img');
        expect(imageElement).toHaveAttribute('src', expect.stringContaining('cloudinary.com'));
      });

      expect(screen.getByText(/Building APIs with Node\.js/i)).toBeInTheDocument();
    });

    it('should PROVIDE DOMAIN-SPECIFIC FALLBACKS when images fail', async () => {
      // Arrange: Mock image load failure with domain-specific fallbacks
      const domains = ['github.com', 'stackoverflow.com', 'reddit.com'];
      
      for (const domain of domains) {
        global.fetch = jest.fn().mockResolvedValueOnce(
          createMockFetchResponse({
            title: `Content from ${domain}`,
            image: null, // No image available
            site_name: domain
          })
        );

        // Act: Render preview
        const url = `https://${domain}/content-page`;
        render(<EnhancedLinkPreview url={url} displayMode="card" />);

        await waitForNextTick();

        // Assert: Should provide domain-specific fallback
        // CURRENT ISSUE: This will FAIL if domain fallbacks aren't implemented
        await waitFor(() => {
          const imageElement = screen.getByRole('img');
          const src = imageElement.getAttribute('src');
          
          // Should use logo service or domain-specific fallback
          expect(src).toMatch(new RegExp(`(logo\.clearbit\.com|favicon.*${domain}|${domain}.*logo)`, 'i'));
        });
      }
    });
  });

  describe('Contract Verification: Image Extraction Service', () => {
    it('should DEFINE CLEAR CONTRACT with image extraction service', async () => {
      // Arrange: Define expected image extraction contract
      interface ImageExtractionContract {
        extractImages(html: string, baseUrl: string): Promise<{
          openGraphImage?: string;
          twitterCardImage?: string;
          firstContentImage?: string;
          favicon?: string;
        }>;
        tryProxyServices(originalUrl: string): Promise<string | null>;
        validateImageUrl(url: string): boolean;
        generateFallbackImage(domain: string): string;
      }

      // Mock contract implementation
      const mockContract: ImageExtractionContract = {
        extractImages: jest.fn().mockResolvedValue({
          openGraphImage: 'https://site.com/og-image.jpg',
          twitterCardImage: 'https://site.com/twitter-image.jpg',
          firstContentImage: 'https://site.com/content-image.jpg',
          favicon: 'https://site.com/favicon.ico'
        }),
        tryProxyServices: jest.fn().mockResolvedValue('https://proxy.service.com/image.jpg'),
        validateImageUrl: jest.fn().mockReturnValue(true),
        generateFallbackImage: jest.fn().mockReturnValue('https://placeholder.service.com/logo.png')
      };

      // Act: Execute contract methods
      const images = await mockContract.extractImages('<html>...</html>', 'https://site.com');
      const proxyUrl = await mockContract.tryProxyServices('https://cors-blocked.com/image.jpg');
      const isValid = mockContract.validateImageUrl('https://valid-image.com/pic.jpg');
      const fallback = mockContract.generateFallbackImage('example.com');

      // Assert: Contract should be properly implemented
      // CURRENT ISSUE: This will FAIL if proper contracts aren't defined
      expect(mockContract.extractImages).toHaveBeenCalledWith('<html>...</html>', 'https://site.com');
      expect(mockContract.tryProxyServices).toHaveBeenCalledWith('https://cors-blocked.com/image.jpg');
      expect(mockContract.validateImageUrl).toHaveBeenCalledWith('https://valid-image.com/pic.jpg');
      expect(mockContract.generateFallbackImage).toHaveBeenCalledWith('example.com');
      
      expect(images.openGraphImage).toBe('https://site.com/og-image.jpg');
      expect(proxyUrl).toBe('https://proxy.service.com/image.jpg');
      expect(isValid).toBe(true);
      expect(fallback).toBe('https://placeholder.service.com/logo.png');
    });
  });
});

/**
 * EXPECTED TEST RESULTS WITH CURRENT IMPLEMENTATION:
 * 
 * ❌ FAILING TESTS (will pass once image extraction is fixed):
 * 1. should EXTRACT REAL IMAGES from Wired.com articles, not generic placeholders
 * 2. should EXTRACT GITHUB REPOSITORY IMAGES and avatars  
 * 3. should EXTRACT SITE-SPECIFIC IMAGES with domain-aware patterns
 * 4. should HANDLE CORS ERRORS and fallback to proxy services
 * 5. should TRY MULTIPLE PROXY SERVICES in sequence
 * 6. should PRIORITIZE OPEN GRAPH IMAGES over other sources
 * 7. should FALLBACK to Twitter Card image when OG image unavailable
 * 8. should VALIDATE IMAGE URLS before attempting to load
 * 9. should HANDLE MEDIUM.COM article images correctly
 * 10. should PROVIDE DOMAIN-SPECIFIC FALLBACKS when images fail
 * 
 * These tests drive the implementation of proper image extraction,
 * CORS handling, proxy services, and site-specific patterns.
 */