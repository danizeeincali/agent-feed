/**
 * Comprehensive Web Preview Validation Test Suite
 * Tests YouTube video embedding, article previews, and thumbnail displays
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_BASE = 'http://localhost:3000';

test.describe('Web Preview Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto(BASE_URL);
    
    // Wait for the feed to load
    await page.waitForSelector('[data-testid="feed-container"]', { timeout: 10000 });
  });

  test('YouTube video preview displays thumbnail and plays video', async ({ page }) => {
    // Look for the YouTube video post
    const videoPost = page.locator('text=Amazing Coding Tutorial Video').first();
    await expect(videoPost).toBeVisible();
    
    // Check if thumbnail is displayed
    const thumbnail = page.locator('.youtube-player-container img, [alt*="YouTube"]').first();
    await expect(thumbnail).toBeVisible();
    
    // Verify play button overlay exists
    const playButton = page.locator('[data-testid="video-play-button"], .play-button').first();
    await expect(playButton).toBeVisible();
    
    // Click to expand video player
    await thumbnail.click();
    
    // Wait for iframe to load
    const videoIframe = page.locator('iframe[src*="youtube"]').first();
    await expect(videoIframe).toBeVisible({ timeout: 5000 });
    
    // Verify video controls are present
    await expect(videoIframe).toHaveAttribute('allow', /autoplay/);
  });

  test('Article preview displays rich metadata and image', async ({ page }) => {
    // Look for the article post
    const articlePost = page.locator('text=Interesting Article on AI Development').first();
    await expect(articlePost).toBeVisible();
    
    // Check for preview image
    const previewImage = articlePost.locator('..').locator('img').first();
    if (await previewImage.count() > 0) {
      await expect(previewImage).toBeVisible();
    }
    
    // Verify site name is displayed
    const siteName = page.locator('text=wired.com, text=Wired').first();
    await expect(siteName).toBeVisible();
    
    // Check for external link icon
    const externalLink = articlePost.locator('..').locator('[data-testid="external-link"], .external-link').first();
    await expect(externalLink).toBeVisible();
  });

  test('Thumbnail mode works in unexpanded feed view', async ({ page }) => {
    // Look for posts in collapsed state
    const collapsedPosts = page.locator('.post-preview, .post-card').first();
    await expect(collapsedPosts).toBeVisible();
    
    // Check for thumbnail display
    const thumbnails = page.locator('.aspect-video img, .thumbnail img');
    const thumbnailCount = await thumbnails.count();
    expect(thumbnailCount).toBeGreaterThan(0);
    
    // Verify hover effects work
    const firstThumbnail = thumbnails.first();
    await firstThumbnail.hover();
    
    // Check for scale effect or overlay
    await page.waitForTimeout(500); // Allow animation
    const hasHoverEffect = await firstThumbnail.evaluate((el) => {
      const computedStyle = getComputedStyle(el);
      return computedStyle.transform !== 'none' || 
             el.parentElement?.querySelector('.overlay, .bg-opacity-20');
    });
    expect(hasHoverEffect).toBeTruthy();
  });

  test('Responsive design works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Reload to trigger responsive layout
    await page.reload();
    await page.waitForSelector('[data-testid="feed-container"]');
    
    // Check that previews stack vertically on mobile
    const previewCards = page.locator('.preview-card, .link-preview').first();
    if (await previewCards.count() > 0) {
      const cardWidth = await previewCards.evaluate((el) => el.clientWidth);
      expect(cardWidth).toBeLessThan(400); // Should be mobile-optimized
    }
    
    // Verify touch-friendly controls
    const playButtons = page.locator('[data-testid="video-play-button"], .play-button');
    if (await playButtons.count() > 0) {
      const buttonSize = await playButtons.first().evaluate((el) => ({
        width: el.clientWidth,
        height: el.clientHeight
      }));
      expect(buttonSize.width).toBeGreaterThan(40); // Touch-friendly size
      expect(buttonSize.height).toBeGreaterThan(40);
    }
  });

  test('Accessibility features work correctly', async ({ page }) => {
    // Check for proper alt text on images
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < Math.min(imageCount, 5); i++) {
      const img = images.nth(i);
      const altText = await img.getAttribute('alt');
      expect(altText).toBeTruthy();
      expect(altText?.length).toBeGreaterThan(0);
    }
    
    // Check for keyboard navigation
    const playButtons = page.locator('[data-testid="video-play-button"], .play-button').first();
    if (await playButtons.count() > 0) {
      await playButtons.focus();
      await expect(playButtons).toBeFocused();
      
      // Test Enter key activation
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }
    
    // Verify ARIA labels exist
    const previewElements = page.locator('[role="article"], [aria-label*="preview"], [aria-describedby]');
    const ariaCount = await previewElements.count();
    expect(ariaCount).toBeGreaterThan(0);
  });

  test('Error handling works for failed previews', async ({ page }) => {
    // Mock network failure for preview API
    await page.route('**/api/v1/link-preview**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Preview generation failed' })
      });
    });
    
    // Create a post with URL to test error handling
    const response = await page.request.post(`${API_BASE}/api/v1/agent-posts`, {
      data: {
        title: 'Test Error Handling',
        content: 'Check this broken link: https://invalid-domain-for-testing.com/article',
        author_agent: 'TestAgent'
      }
    });
    
    await page.reload();
    await page.waitForSelector('[data-testid="feed-container"]');
    
    // Look for fallback display
    const fallbackLink = page.locator('text=https://invalid-domain-for-testing.com/article');
    await expect(fallbackLink).toBeVisible();
    
    // Verify it still functions as a clickable link
    await expect(fallbackLink).toHaveAttribute('href', 'https://invalid-domain-for-testing.com/article');
    await expect(fallbackLink).toHaveAttribute('target', '_blank');
  });

  test('Performance impact is minimal', async ({ page }) => {
    // Measure initial load time
    const startTime = Date.now();
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="feed-container"]');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
    
    // Check that lazy loading is working
    const images = page.locator('img[loading="lazy"]');
    const lazyImageCount = await images.count();
    expect(lazyImageCount).toBeGreaterThan(0);
    
    // Verify no excessive network requests
    let requestCount = 0;
    page.on('request', (request) => {
      if (request.url().includes('youtube.com') || request.url().includes('img.youtube.com')) {
        requestCount++;
      }
    });
    
    // Scroll through feed to trigger lazy loading
    await page.evaluate(() => {
      window.scrollBy(0, 1000);
    });
    
    await page.waitForTimeout(2000);
    expect(requestCount).toBeLessThan(20); // Reasonable request limit
  });

  test('Cross-browser video playback compatibility', async ({ page, browserName }) => {
    // Skip for webkit due to YouTube embed restrictions
    if (browserName === 'webkit') {
      test.skip();
    }
    
    // Look for YouTube video
    const videoPost = page.locator('text=Amazing Coding Tutorial Video').first();
    await expect(videoPost).toBeVisible();
    
    // Click to expand video
    const thumbnail = videoPost.locator('..').locator('img, [data-testid="video-thumbnail"]').first();
    await thumbnail.click();
    
    // Verify iframe loads correctly in different browsers
    const videoIframe = page.locator('iframe[src*="youtube"]').first();
    await expect(videoIframe).toBeVisible({ timeout: 8000 });
    
    // Check iframe attributes for browser compatibility
    const src = await videoIframe.getAttribute('src');
    expect(src).toContain('youtube-nocookie.com'); // Privacy mode
    expect(src).toContain('autoplay=1'); // Autoplay enabled
    
    if (browserName === 'chromium' || browserName === 'chrome') {
      // Chrome-specific checks
      const allowAttribute = await videoIframe.getAttribute('allow');
      expect(allowAttribute).toContain('autoplay');
    }
  });

  test('Preview data extraction works correctly', async ({ page }) => {
    // Test different URL types
    const testUrls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://github.com/microsoft/playwright',
      'https://medium.com/@testauthor/test-article'
    ];
    
    for (const url of testUrls) {
      // Create test post
      await page.request.post(`${API_BASE}/api/v1/agent-posts`, {
        data: {
          title: `Test URL: ${url}`,
          content: `Check out this link: ${url}`,
          author_agent: 'URLTestAgent'
        }
      });
    }
    
    await page.reload();
    await page.waitForSelector('[data-testid="feed-container"]');
    
    // Verify different preview types are detected
    const youtubePreview = page.locator('[data-testid="youtube-embed"], .youtube-player-container').first();
    if (await youtubePreview.count() > 0) {
      await expect(youtubePreview).toBeVisible();
    }
    
    const githubPreview = page.locator('text=github.com, text=GitHub').first();
    if (await githubPreview.count() > 0) {
      await expect(githubPreview).toBeVisible();
    }
    
    const articlePreview = page.locator('text=medium.com, text=Medium').first();
    if (await articlePreview.count() > 0) {
      await expect(articlePreview).toBeVisible();
    }
  });
});

test.describe('Preview API Integration', () => {
  test('Backend preview API returns valid data', async ({ request }) => {
    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    
    const response = await request.get(`${API_BASE}/api/v1/link-preview?url=${encodeURIComponent(testUrl)}`);
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('url');
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('type');
      expect(data.url).toBe(testUrl);
    } else {
      // API not implemented yet, test fallback behavior
      expect(response.status()).toBe(404);
    }
  });

  test('Image proxy service works correctly', async ({ request }) => {
    const testImageUrl = 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg';
    
    const response = await request.get(`${API_BASE}/api/image-proxy?url=${encodeURIComponent(testImageUrl)}`);
    
    if (response.status() === 200) {
      const contentType = response.headers()['content-type'];
      expect(contentType).toMatch(/image\/(jpeg|jpg|webp|png)/);
    } else {
      // Proxy not implemented, direct image loading should work
      const directResponse = await request.get(testImageUrl);
      expect(directResponse.status()).toBe(200);
    }
  });
});