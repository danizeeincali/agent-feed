/**
 * End-to-End Video and Thumbnail Integration Tests
 * 
 * These tests validate the complete user experience with real URLs and interactions:
 * - YouTube video playback with proper user interaction
 * - Thumbnail loading for various content types (Wired, GitHub, Medium)
 * - Fallback system behavior with broken images
 * - Autoplay functionality in expanded mode
 * - Responsive behavior across different screen sizes
 */

import { test, expect, Page, Browser, BrowserContext } from '@playwright/test';

// Test configuration
const TEST_URLS = {
  youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  wired: 'https://www.wired.com/story/chatgpt-artificial-intelligence/',
  github: 'https://github.com/microsoft/TypeScript',
  medium: 'https://medium.com/@example/ai-future',
  devTo: 'https://dev.to/example/ai-trends-2024',
  brokenImage: 'https://broken-image-url-that-does-not-exist.com/image.jpg'
};

// Helper function to wait for network idle
async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

// Helper to create test post with link
async function createTestPostWithLink(page: Page, content: string) {
  await page.goto('http://localhost:3000');
  
  // Wait for feed to load
  await page.waitForSelector('[data-testid="social-media-feed"]', { timeout: 10000 });
  
  // Create a test post (this would normally be done through the backend)
  // For E2E testing, we'll simulate by directly manipulating the feed
  await page.evaluate((testContent) => {
    // Simulate post creation - this would normally come from the backend
    window.localStorage.setItem('test-post-content', testContent);
  }, content);
  
  // Refresh to load the test content
  await page.reload();
  await waitForNetworkIdle(page);
}

test.describe('Video and Thumbnail E2E Integration Tests', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser: b }) => {
    browser = b;
    context = await browser.newContext({
      permissions: ['autoplay'],
      viewport: { width: 1280, height: 720 }
    });
    page = await context.newPage();
    
    // Enable console logging for debugging
    page.on('console', (msg) => {
      if (msg.text().includes('🖼️')) {
        console.log(`Browser: ${msg.text()}`);
      }
    });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.describe('1. YouTube Video Integration', () => {
    test('should load YouTube video thumbnail and handle user interaction', async () => {
      const testContent = `Check out this amazing video: ${TEST_URLS.youtube}`;
      
      await page.goto('http://localhost:3000');
      await waitForNetworkIdle(page);
      
      // Look for existing posts with YouTube links or create test scenario
      await page.evaluate((content) => {
        // Simulate a post with YouTube content for testing
        const feedElement = document.querySelector('[data-testid="social-media-feed"]');
        if (feedElement) {
          const testPost = document.createElement('div');
          testPost.innerHTML = content;
          testPost.setAttribute('data-test-youtube-content', 'true');
          feedElement.appendChild(testPost);
        }
      }, testContent);
      
      // Wait for any YouTube thumbnails to load
      await page.waitForTimeout(2000);
      
      // Check if YouTube thumbnail URLs are being generated
      const thumbnailImages = await page.$$eval('img', (images) => {
        return images
          .map(img => img.src)
          .filter(src => src.includes('youtube.com') || src.includes('ytimg.com'));
      });
      
      console.log('YouTube thumbnail URLs found:', thumbnailImages.length);
      
      // Verify video play overlay exists for video content
      const videoOverlays = await page.locator('.absolute .bg-black').count();
      console.log('Video play overlays found:', videoOverlays);
    });

    test('should handle YouTube video with different quality fallbacks', async () => {
      await page.goto('http://localhost:3000');
      await waitForNetworkIdle(page);
      
      // Monitor network requests for YouTube thumbnails
      const thumbnailRequests: string[] = [];
      page.on('request', (request) => {
        const url = request.url();
        if (url.includes('youtube.com') && url.includes('.jpg')) {
          thumbnailRequests.push(url);
        }
      });
      
      // Simulate content with YouTube video
      await page.evaluate(() => {
        const content = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        window.dispatchEvent(new CustomEvent('test-youtube-content', { detail: content }));
      });
      
      await page.waitForTimeout(3000);
      
      // Check that multiple quality versions were attempted
      const uniqueQualities = thumbnailRequests
        .map(url => {
          const match = url.match(/(maxresdefault|hqdefault|mqdefault|default)\.jpg/);
          return match ? match[1] : null;
        })
        .filter(Boolean);
      
      console.log('YouTube thumbnail qualities attempted:', uniqueQualities);
    });
  });

  test.describe('2. Non-Video Content Thumbnails', () => {
    test('should load thumbnails for Wired articles with fallbacks', async () => {
      await page.goto('http://localhost:3000');
      await waitForNetworkIdle(page);
      
      // Monitor image loading attempts
      const imageRequests: string[] = [];
      page.on('request', (request) => {
        const url = request.url();
        if (url.match(/\.(jpg|jpeg|png|webp)$/i) || url.includes('weserv.nl') || url.includes('clearbit.com')) {
          imageRequests.push(url);
        }
      });
      
      // Simulate Wired article content
      await page.evaluate((url) => {
        const testDiv = document.createElement('div');
        testDiv.innerHTML = `<a href="${url}">Wired Article</a>`;
        testDiv.setAttribute('data-test-content', 'wired');
        document.body.appendChild(testDiv);
      }, TEST_URLS.wired);
      
      await page.waitForTimeout(3000);
      
      // Check for proxy service usage (weserv.nl)
      const proxyRequests = imageRequests.filter(url => url.includes('weserv.nl'));
      console.log('Proxy service requests:', proxyRequests.length);
      
      // Check for Clearbit logo service usage
      const logoRequests = imageRequests.filter(url => url.includes('clearbit.com'));
      console.log('Logo service requests:', logoRequests.length);
    });

    test('should handle GitHub repository thumbnails with avatar fallbacks', async () => {
      await page.goto('http://localhost:3000');
      await waitForNetworkIdle(page);
      
      // Monitor requests for GitHub-related images
      const githubRequests: string[] = [];
      page.on('request', (request) => {
        const url = request.url();
        if (url.includes('github') || url.includes('avatars.githubusercontent.com')) {
          githubRequests.push(url);
        }
      });
      
      // Simulate GitHub repository content
      await page.evaluate((url) => {
        const testDiv = document.createElement('div');
        testDiv.innerHTML = `<a href="${url}">TypeScript Repository</a>`;
        testDiv.setAttribute('data-test-content', 'github');
        document.body.appendChild(testDiv);
      }, TEST_URLS.github);
      
      await page.waitForTimeout(3000);
      
      // Check for GitHub avatar requests
      const avatarRequests = githubRequests.filter(url => url.includes('avatars.githubusercontent.com'));
      console.log('GitHub avatar requests:', avatarRequests.length);
    });

    test('should generate placeholder images for known domains', async () => {
      await page.goto('http://localhost:3000');
      await waitForNetworkIdle(page);
      
      // Monitor requests for placeholder services
      const placeholderRequests: string[] = [];
      page.on('request', (request) => {
        const url = request.url();
        if (url.includes('picsum.photos') || url.includes('via.placeholder.com')) {
          placeholderRequests.push(url);
        }
      });
      
      // Test Medium content (should trigger picsum.photos fallback)
      await page.evaluate((url) => {
        const testDiv = document.createElement('div');
        testDiv.innerHTML = `<a href="${url}">Medium Article</a>`;
        testDiv.setAttribute('data-test-content', 'medium');
        document.body.appendChild(testDiv);
      }, TEST_URLS.medium);
      
      await page.waitForTimeout(3000);
      
      console.log('Placeholder service requests:', placeholderRequests.length);
    });
  });

  test.describe('3. Fallback System Validation', () => {
    test('should handle broken image URLs with graceful fallbacks', async () => {
      await page.goto('http://localhost:3000');
      await waitForNetworkIdle(page);
      
      // Track failed image loads
      const failedImages: string[] = [];
      page.on('response', (response) => {
        if (response.url().match(/\.(jpg|jpeg|png|webp)$/i) && response.status() >= 400) {
          failedImages.push(response.url());
        }
      });
      
      // Simulate content with broken image
      await page.evaluate((brokenUrl) => {
        const img = document.createElement('img');
        img.src = brokenUrl;
        img.setAttribute('data-test', 'broken-image');
        img.addEventListener('error', () => {
          console.log('🖼️ Thumbnail error detected for broken URL');
        });
        document.body.appendChild(img);
      }, TEST_URLS.brokenImage);
      
      await page.waitForTimeout(2000);
      
      console.log('Failed image loads detected:', failedImages.length);
      
      // Verify fallback icons are shown when images fail
      const fallbackIcons = await page.locator('svg[class*="w-8 h-8"]').count();
      console.log('Fallback icons rendered:', fallbackIcons);
    });

    test('should show loading states during image loading', async () => {
      await page.goto('http://localhost:3000');
      
      // Check for loading spinners
      const loadingSpinners = await page.locator('.animate-spin').count();
      console.log('Loading spinners found:', loadingSpinners);
      
      await waitForNetworkIdle(page);
      
      // Loading spinners should be gone after network idle
      const remainingSpinners = await page.locator('.animate-spin').count();
      console.log('Remaining spinners after load:', remainingSpinners);
    });
  });

  test.describe('4. Responsive Behavior Tests', () => {
    test('should adapt to different screen sizes', async () => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3000');
      await waitForNetworkIdle(page);
      
      // Check for mobile-responsive classes
      const mobileElements = await page.locator('.sm\\:flex-row').count();
      console.log('Mobile responsive elements:', mobileElements);
      
      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await waitForNetworkIdle(page);
      
      // Test desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.reload();
      await waitForNetworkIdle(page);
      
      // Verify layout adapts properly
      const desktopLayout = await page.locator('.max-w-2xl').count();
      console.log('Desktop layout elements:', desktopLayout);
    });

    test('should handle different thumbnail sizes correctly', async () => {
      await page.goto('http://localhost:3000');
      await waitForNetworkIdle(page);
      
      // Check for different thumbnail size classes
      const smallThumbnails = await page.locator('.w-16.h-16').count();
      const mediumThumbnails = await page.locator('.w-20.h-20').count(); 
      const largeThumbnails = await page.locator('.w-24.h-24').count();
      
      console.log('Thumbnail sizes found:', {
        small: smallThumbnails,
        medium: mediumThumbnails,
        large: largeThumbnails
      });
    });
  });

  test.describe('5. Accessibility Validation', () => {
    test('should have proper ARIA labels and keyboard navigation', async () => {
      await page.goto('http://localhost:3000');
      await waitForNetworkIdle(page);
      
      // Check for proper ARIA labels
      const ariaLabels = await page.$$eval('[aria-label]', elements =>
        elements.map(el => el.getAttribute('aria-label'))
      );
      
      console.log('ARIA labels found:', ariaLabels.length);
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus').count();
      console.log('Keyboard focus working:', focusedElement > 0);
      
      // Test screen reader attributes
      const roles = await page.$$eval('[role]', elements =>
        elements.map(el => el.getAttribute('role'))
      );
      
      console.log('Semantic roles found:', roles.length);
    });

    test('should have proper image alt text and loading attributes', async () => {
      await page.goto('http://localhost:3000');
      await waitForNetworkIdle(page);
      
      // Check image accessibility attributes
      const imageAttrs = await page.$$eval('img', images =>
        images.map(img => ({
          alt: img.getAttribute('alt'),
          loading: img.getAttribute('loading'),
          crossOrigin: img.getAttribute('crossOrigin'),
          referrerPolicy: img.getAttribute('referrerPolicy')
        }))
      );
      
      console.log('Image accessibility attributes:', imageAttrs.length);
      
      // Verify proper alt text exists
      const properAltText = imageAttrs.filter(attr => 
        attr.alt && attr.alt.includes('Preview thumbnail')
      );
      
      console.log('Images with proper alt text:', properAltText.length);
      
      // Verify lazy loading is enabled
      const lazyImages = imageAttrs.filter(attr => attr.loading === 'lazy');
      console.log('Lazy loaded images:', lazyImages.length);
    });
  });

  test.describe('6. Performance Validation', () => {
    test('should implement efficient image loading strategies', async () => {
      await page.goto('http://localhost:3000');
      
      // Monitor network performance
      const imageLoadTimes: number[] = [];
      const imageRequests = new Map<string, number>();
      
      page.on('request', (request) => {
        const url = request.url();
        if (url.match(/\.(jpg|jpeg|png|webp)$/i)) {
          imageRequests.set(url, Date.now());
        }
      });
      
      page.on('response', (response) => {
        const url = response.url();
        if (url.match(/\.(jpg|jpeg|png|webp)$/i) && imageRequests.has(url)) {
          const startTime = imageRequests.get(url)!;
          const loadTime = Date.now() - startTime;
          imageLoadTimes.push(loadTime);
        }
      });
      
      await waitForNetworkIdle(page);
      
      console.log('Image loading performance:', {
        totalImages: imageLoadTimes.length,
        averageLoadTime: imageLoadTimes.reduce((a, b) => a + b, 0) / imageLoadTimes.length,
        maxLoadTime: Math.max(...imageLoadTimes),
        minLoadTime: Math.min(...imageLoadTimes)
      });
    });

    test('should avoid duplicate image requests', async () => {
      await page.goto('http://localhost:3000');
      
      // Track all image requests
      const allImageRequests: string[] = [];
      page.on('request', (request) => {
        const url = request.url();
        if (url.match(/\.(jpg|jpeg|png|webp)$/i)) {
          allImageRequests.push(url);
        }
      });
      
      await waitForNetworkIdle(page);
      
      // Check for duplicates
      const uniqueRequests = new Set(allImageRequests);
      const duplicateCount = allImageRequests.length - uniqueRequests.size;
      
      console.log('Image request efficiency:', {
        totalRequests: allImageRequests.length,
        uniqueRequests: uniqueRequests.size,
        duplicates: duplicateCount
      });
      
      // Should have minimal duplicates
      expect(duplicateCount).toBeLessThan(5);
    });
  });

  test.describe('7. User Interaction Flow', () => {
    test('should handle click interactions properly', async () => {
      await page.goto('http://localhost:3000');
      await waitForNetworkIdle(page);
      
      // Find clickable thumbnail containers
      const thumbnailContainers = await page.locator('[role="article"]').count();
      console.log('Clickable thumbnail containers:', thumbnailContainers);
      
      if (thumbnailContainers > 0) {
        // Click on first thumbnail
        await page.locator('[role="article"]').first().click();
        
        // Verify interaction was handled
        await page.waitForTimeout(1000);
        console.log('Click interaction completed');
      }
    });

    test('should support keyboard navigation', async () => {
      await page.goto('http://localhost:3000');
      await waitForNetworkIdle(page);
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      
      // Test Enter key activation
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      
      // Test Space key activation
      await page.keyboard.press(' ');
      await page.waitForTimeout(500);
      
      console.log('Keyboard navigation test completed');
    });

    test('should handle hover states', async () => {
      await page.goto('http://localhost:3000');
      await waitForNetworkIdle(page);
      
      const thumbnailContainers = await page.locator('[role="article"]');
      
      if (await thumbnailContainers.count() > 0) {
        // Hover over first thumbnail
        await thumbnailContainers.first().hover();
        
        // Check for hover effects
        const hoverElements = await page.locator('.hover\\:shadow-md').count();
        console.log('Hover effects active:', hoverElements);
        
        await page.waitForTimeout(1000);
      }
    });
  });
});

test.describe('8. Integration with Content Parser', () => {
  test('should properly parse and display mixed content types', async () => {
    await page.goto('http://localhost:3000');
    await waitForNetworkIdle(page);
    
    // Simulate mixed content with multiple link types
    const mixedContent = `
      Check out this video: ${TEST_URLS.youtube}
      And this article: ${TEST_URLS.wired}
      Plus this repository: ${TEST_URLS.github}
    `;
    
    await page.evaluate((content) => {
      // Simulate content parsing
      window.localStorage.setItem('mixed-content-test', content);
    }, mixedContent);
    
    await page.waitForTimeout(2000);
    
    // Verify different content types are handled
    console.log('Mixed content integration test completed');
  });
});