import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Comprehensive Browser Validation Tests for Thumbnail-Summary Preview Functionality
 * 
 * Mission: Test the live application with real URLs to validate:
 * 1. YouTube videos display correctly with auto-loop functionality
 * 2. Article URLs (like Wired) show proper thumbnail-summary layout
 * 3. Thumbnail placement on left, title/summary on right
 * 4. No "www." truncation occurs
 * 5. Video auto-loop functionality works in expanded mode
 * 6. Real-time functionality with live data
 * 7. Cross-browser and responsive compatibility
 * 8. Accessibility compliance
 * 9. Performance with real content
 */

// Real test URLs - these should actually work with the live system
const TEST_URLS = {
  youtube: {
    rickroll: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    shortVideo: 'https://www.youtube.com/watch?v=fC7oUOUEEi4', // Baby Shark - short for testing
    longVideo: 'https://www.youtube.com/watch?v=9bZkp7q19f0' // Gangnam Style - longer for testing
  },
  articles: {
    wiredTesla: 'https://www.wired.com/story/elon-musk-trillion-dollar-tesla-pay-package/',
    techCrunch: 'https://techcrunch.com/2024/01/15/ai-breakthrough-2024/',
    medium: 'https://medium.com/@developer/react-performance-optimization-2024',
    github: 'https://github.com/microsoft/vscode'
  },
  images: {
    jpeg: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131',
    png: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/512px-React-icon.svg.png'
  }
};

// Helper functions for common test patterns
async function waitForApplication(page: Page) {
  // Wait for the feed to load
  await expect(page.locator('[data-testid="social-media-feed"]')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('[data-testid="post-list"]')).toBeVisible({ timeout: 10000 });
  
  // Wait for at least one post to be loaded
  await expect(page.locator('[data-testid="post-card"]').first()).toBeVisible({ timeout: 10000 });
}

async function createTestPost(page: Page, content: string) {
  // This would interact with a post creation interface if available
  // For now, we'll test with existing posts that contain the URLs
  console.log(`Creating test post with content: ${content}`);
  
  // If there's a way to create posts in the UI, implement here
  // Otherwise, we'll test with existing demo data
}

async function findPostWithUrl(page: Page, url: string) {
  // Find a post that contains the specified URL
  const posts = page.locator('[data-testid="post-card"]');
  const postCount = await posts.count();
  
  for (let i = 0; i < postCount; i++) {
    const post = posts.nth(i);
    const content = await post.textContent();
    if (content && content.includes(url)) {
      return post;
    }
  }
  
  return null;
}

// Main test suite
test.describe('Thumbnail-Summary Browser Validation', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the live application
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await waitForApplication(page);
  });

  test.describe('Real YouTube URL Testing', () => {
    
    test('should display YouTube Rick Roll video with proper thumbnail-summary layout', async ({ page }) => {
      const testUrl = TEST_URLS.youtube.rickroll;
      
      // Check if a post with this URL already exists, or create one
      let post = await findPostWithUrl(page, testUrl);
      
      if (!post) {
        // Skip if no post with this URL exists
        test.skip('No post found with YouTube URL. Create a post manually with: ' + testUrl);
      }
      
      // Verify thumbnail-summary layout
      const thumbnailContainer = post.locator('.thumbnail-summary, [role="article"]').first();
      await expect(thumbnailContainer).toBeVisible();
      
      // Check left-side thumbnail
      const thumbnail = thumbnailContainer.locator('img, [role="img"]').first();
      await expect(thumbnail).toBeVisible();
      
      // Verify thumbnail is on the left side (using flex layout)
      const containerBox = await thumbnailContainer.boundingBox();
      const thumbnailBox = await thumbnail.boundingBox();
      
      if (containerBox && thumbnailBox) {
        // Thumbnail should be on the left side of the container
        expect(thumbnailBox.x).toBeLessThan(containerBox.x + containerBox.width / 2);
      }
      
      // Check right-side content (title and summary)
      const title = thumbnailContainer.locator('h3, h4, [role="heading"]').first();
      await expect(title).toBeVisible();
      await expect(title).toContainText(/YouTube|Video|Rick/, { ignoreCase: true });
      
      // Check for video play indicator
      const playButton = thumbnailContainer.locator('[data-testid="play-button"], .play-icon, svg[class*="play"]');
      await expect(playButton.first()).toBeVisible();
      
      // Verify no "www." truncation in site name
      const siteName = thumbnailContainer.locator('text=youtube.com, text=YouTube').first();
      await expect(siteName).toBeVisible();
      const siteText = await siteName.textContent();
      expect(siteText).not.toMatch(/^www\./);
    });

    test('should expand YouTube video with auto-loop functionality', async ({ page }) => {
      const testUrl = TEST_URLS.youtube.rickroll;
      
      let post = await findPostWithUrl(page, testUrl);
      if (!post) {
        test.skip('No post found with YouTube URL');
      }
      
      // Click on the thumbnail to expand
      const thumbnailContainer = post.locator('.thumbnail-summary, [role="article"]').first();
      await thumbnailContainer.click();
      
      // Wait for expanded video player
      const videoPlayer = page.locator('iframe[src*="youtube"], video, [data-testid="youtube-embed"]').first();
      await expect(videoPlayer).toBeVisible({ timeout: 10000 });
      
      // Check for auto-loop and muted attributes if using custom player
      // For YouTube iframe, these would be in the src URL parameters
      const iframeSrc = await videoPlayer.getAttribute('src');
      if (iframeSrc) {
        expect(iframeSrc).toMatch(/autoplay=1/);
        expect(iframeSrc).toMatch(/mute=1/);
        expect(iframeSrc).toMatch(/loop=1/);
      }
      
      // Verify video controls are accessible
      await expect(videoPlayer).toBeVisible();
      await expect(videoPlayer).not.toHaveAttribute('tabindex', '-1');
    });

    test('should handle multiple video formats and qualities', async ({ page }) => {
      const videos = [TEST_URLS.youtube.rickroll, TEST_URLS.youtube.shortVideo];
      
      for (const videoUrl of videos) {
        let post = await findPostWithUrl(page, videoUrl);
        if (!post) continue;
        
        const thumbnailContainer = post.locator('.thumbnail-summary, [role="article"]').first();
        
        // Check thumbnail quality
        const thumbnail = thumbnailContainer.locator('img').first();
        const thumbnailSrc = await thumbnail.getAttribute('src');
        
        if (thumbnailSrc) {
          // YouTube thumbnails should be high quality (mqdefault or better)
          expect(thumbnailSrc).toMatch(/(mqdefault|hqdefault|maxresdefault)\.jpg/);
        }
        
        // Verify video type indicator
        const typeIndicator = thumbnailContainer.locator('[data-testid="type-indicator"], .type-badge');
        if (await typeIndicator.count() > 0) {
          await expect(typeIndicator.first()).toContainText(/video|▶/i);
        }
      }
    });
  });

  test.describe('Real Article URL Testing', () => {
    
    test('should display Wired article with proper thumbnail-summary layout', async ({ page }) => {
      const testUrl = TEST_URLS.articles.wiredTesla;
      
      let post = await findPostWithUrl(page, testUrl);
      if (!post) {
        test.skip('No post found with Wired article URL. Create a post manually with: ' + testUrl);
      }
      
      // Verify thumbnail-summary layout for articles
      const thumbnailContainer = post.locator('.thumbnail-summary, [role="article"]').first();
      await expect(thumbnailContainer).toBeVisible();
      
      // Check article thumbnail (left side)
      const thumbnail = thumbnailContainer.locator('img, [data-testid="fallback-thumbnail"]').first();
      await expect(thumbnail).toBeVisible();
      
      // Check article title (right side)
      const title = thumbnailContainer.locator('h3, h4').first();
      await expect(title).toBeVisible();
      
      // Verify it contains article-related text
      const titleText = await title.textContent();
      expect(titleText).toBeTruthy();
      expect(titleText!.length).toBeGreaterThan(5);
      
      // Check for reading time indicator
      const readingTime = thumbnailContainer.locator('text=/\\d+ min/', '[data-testid="reading-time"]');
      if (await readingTime.count() > 0) {
        await expect(readingTime.first()).toBeVisible();
      }
      
      // Verify site name shows correctly (no www. truncation)
      const siteName = thumbnailContainer.locator('text=wired.com, text=Wired').first();
      await expect(siteName).toBeVisible();
      const siteText = await siteName.textContent();
      expect(siteText).not.toMatch(/^www\./);
    });

    test('should display article metadata correctly', async ({ page }) => {
      const testUrl = TEST_URLS.articles.wiredTesla;
      
      let post = await findPostWithUrl(page, testUrl);
      if (!post) {
        test.skip('No post found with article URL');
      }
      
      const thumbnailContainer = post.locator('.thumbnail-summary, [role="article"]').first();
      
      // Check for author information
      const author = thumbnailContainer.locator('[data-testid="author"], .author, text=/by /i');
      if (await author.count() > 0) {
        await expect(author.first()).toBeVisible();
      }
      
      // Check for article type indicator
      const typeIndicator = thumbnailContainer.locator('.type-badge, [data-testid="type-indicator"]');
      if (await typeIndicator.count() > 0) {
        const indicatorText = await typeIndicator.first().textContent();
        expect(indicatorText).toMatch(/article|A|📄/i);
      }
      
      // Verify description/summary is present and not truncated improperly
      const description = thumbnailContainer.locator('p, .description, [data-testid="description"]').first();
      if (await description.isVisible()) {
        const descText = await description.textContent();
        expect(descText).toBeTruthy();
        expect(descText!.length).toBeGreaterThan(10);
      }
    });

    test('should handle different article sources correctly', async ({ page }) => {
      const articles = [
        TEST_URLS.articles.wiredTesla,
        TEST_URLS.articles.techCrunch,
        TEST_URLS.articles.medium
      ];
      
      for (const articleUrl of articles) {
        let post = await findPostWithUrl(page, articleUrl);
        if (!post) continue;
        
        const thumbnailContainer = post.locator('.thumbnail-summary, [role="article"]').first();
        
        // Verify basic layout structure
        await expect(thumbnailContainer).toBeVisible();
        
        // Check that layout is consistent across different sources
        const thumbnail = thumbnailContainer.locator('img, [data-testid="fallback-thumbnail"]').first();
        const title = thumbnailContainer.locator('h3, h4').first();
        
        await expect(thumbnail).toBeVisible();
        await expect(title).toBeVisible();
        
        // Verify responsive behavior
        const containerBox = await thumbnailContainer.boundingBox();
        if (containerBox) {
          expect(containerBox.width).toBeGreaterThan(200);
        }
      }
    });
  });

  test.describe('Layout and Responsive Testing', () => {
    
    test('should maintain thumbnail-left, content-right layout on desktop', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1200, height: 800 });
      
      const posts = page.locator('[data-testid="post-card"]');
      const firstPost = posts.first();
      await expect(firstPost).toBeVisible();
      
      // Find thumbnail-summary container
      const thumbnailContainer = firstPost.locator('.thumbnail-summary, [role="article"]').first();
      if (await thumbnailContainer.count() === 0) {
        test.skip('No thumbnail-summary layout found in posts');
      }
      
      await expect(thumbnailContainer).toBeVisible();
      
      // Check layout structure
      const thumbnail = thumbnailContainer.locator('img, [data-testid="thumbnail"]').first();
      const content = thumbnailContainer.locator('.flex-1, [data-testid="content"]').first();
      
      await expect(thumbnail).toBeVisible();
      await expect(content).toBeVisible();
      
      // Verify positioning
      const thumbnailBox = await thumbnail.boundingBox();
      const contentBox = await content.boundingBox();
      
      if (thumbnailBox && contentBox) {
        // Thumbnail should be to the left of content
        expect(thumbnailBox.x).toBeLessThan(contentBox.x);
        // They should be roughly aligned vertically
        expect(Math.abs(thumbnailBox.y - contentBox.y)).toBeLessThan(50);
      }
    });

    test('should stack vertically on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      const posts = page.locator('[data-testid="post-card"]');
      const firstPost = posts.first();
      await expect(firstPost).toBeVisible();
      
      const thumbnailContainer = firstPost.locator('.thumbnail-summary, [role="article"]').first();
      if (await thumbnailContainer.count() === 0) {
        test.skip('No thumbnail-summary layout found in posts');
      }
      
      // Check if layout adapts to mobile (should stack vertically)
      const thumbnail = thumbnailContainer.locator('img, [data-testid="thumbnail"]').first();
      const content = thumbnailContainer.locator('.flex-1, [data-testid="content"]').first();
      
      await expect(thumbnail).toBeVisible();
      await expect(content).toBeVisible();
      
      const thumbnailBox = await thumbnail.boundingBox();
      const contentBox = await content.boundingBox();
      
      if (thumbnailBox && contentBox) {
        // On mobile, content should be below thumbnail (or at least not significantly to the right)
        const horizontalOffset = contentBox.x - thumbnailBox.x;
        expect(Math.abs(horizontalOffset)).toBeLessThan(100);
      }
    });

    test('should handle various viewport sizes correctly', async ({ page }) => {
      const viewportSizes = [
        { width: 320, height: 568 }, // iPhone SE
        { width: 768, height: 1024 }, // iPad
        { width: 1024, height: 768 }, // iPad Landscape
        { width: 1440, height: 900 }, // Desktop
        { width: 1920, height: 1080 } // Large Desktop
      ];
      
      for (const size of viewportSizes) {
        await page.setViewportSize(size);
        
        const thumbnailContainer = page.locator('.thumbnail-summary, [role="article"]').first();
        if (await thumbnailContainer.count() === 0) continue;
        
        await expect(thumbnailContainer).toBeVisible();
        
        // Verify container adapts to viewport
        const containerBox = await thumbnailContainer.boundingBox();
        if (containerBox) {
          expect(containerBox.width).toBeLessThanOrEqual(size.width);
          expect(containerBox.width).toBeGreaterThan(size.width * 0.1); // At least 10% of viewport
        }
      }
    });
  });

  test.describe('Accessibility and Performance Testing', () => {
    
    test('should meet accessibility standards for thumbnail-summary components', async ({ page }) => {
      const thumbnailContainer = page.locator('.thumbnail-summary, [role="article"]').first();
      if (await thumbnailContainer.count() === 0) {
        test.skip('No thumbnail-summary components found');
      }
      
      // Check ARIA labels and roles
      await expect(thumbnailContainer).toHaveAttribute('role', 'article');
      
      const thumbnailImg = thumbnailContainer.locator('img').first();
      if (await thumbnailImg.count() > 0) {
        // Images should have alt text
        const altText = await thumbnailImg.getAttribute('alt');
        expect(altText).toBeTruthy();
        expect(altText!.length).toBeGreaterThan(0);
      }
      
      // Check keyboard navigation
      await thumbnailContainer.focus();
      await expect(thumbnailContainer).toBeFocused();
      
      // Test keyboard activation
      await page.keyboard.press('Enter');
      // Should trigger click behavior
      
      // Check color contrast (basic test)
      const titleElement = thumbnailContainer.locator('h3, h4').first();
      if (await titleElement.isVisible()) {
        const titleStyles = await titleElement.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor
          };
        });
        
        // Basic check that text has sufficient contrast (not light gray on white)
        expect(titleStyles.color).not.toBe('rgb(211, 211, 211)'); // Light gray
      }
    });

    test('should load and render previews within performance budgets', async ({ page }) => {
      // Start performance monitoring
      const startTime = Date.now();
      
      // Navigate and wait for content
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
      await waitForApplication(page);
      
      // Wait for thumbnail-summary components to load
      const thumbnailContainers = page.locator('.thumbnail-summary, [role="article"]');
      await thumbnailContainers.first().waitFor({ state: 'visible', timeout: 10000 });
      
      const loadTime = Date.now() - startTime;
      
      // Performance budget: Page should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
      
      // Check that images are lazy-loaded
      const images = thumbnailContainers.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < Math.min(3, imageCount); i++) {
        const img = images.nth(i);
        const loading = await img.getAttribute('loading');
        expect(loading).toBe('lazy');
      }
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Test with slow network
      await page.route('**/*.jpg', route => {
        setTimeout(() => route.continue(), 2000);
      });
      
      await page.goto('http://localhost:5173');
      await waitForApplication(page);
      
      const thumbnailContainer = page.locator('.thumbnail-summary, [role="article"]').first();
      if (await thumbnailContainer.count() === 0) {
        test.skip('No thumbnail-summary components found');
      }
      
      // Should show fallback or placeholder while loading
      const fallback = thumbnailContainer.locator('[data-testid="fallback-thumbnail"], .fallback, svg').first();
      if (await fallback.count() > 0) {
        await expect(fallback).toBeVisible();
      }
      
      // Test image error handling
      await page.route('**/*.jpg', route => route.abort('failed'));
      
      await page.reload({ waitUntil: 'networkidle' });
      await waitForApplication(page);
      
      // Should gracefully handle failed image loads
      const postContainer = page.locator('[data-testid="post-card"]').first();
      await expect(postContainer).toBeVisible();
    });
  });

  test.describe('Real-time and Interaction Testing', () => {
    
    test('should update thumbnails when posts are refreshed', async ({ page }) => {
      await waitForApplication(page);
      
      // Get initial state
      const initialPostCount = await page.locator('[data-testid="post-card"]').count();
      
      // Trigger refresh
      const refreshButton = page.locator('button:has-text("Refresh"), [data-testid="refresh-button"]');
      if (await refreshButton.count() > 0) {
        await refreshButton.click();
        
        // Wait for refresh to complete
        await page.waitForTimeout(2000);
        
        // Verify posts are still present
        const postCount = await page.locator('[data-testid="post-card"]').count();
        expect(postCount).toBeGreaterThan(0);
      }
    });

    test('should maintain state when switching between collapsed and expanded views', async ({ page }) => {
      const posts = page.locator('[data-testid="post-card"]');
      const firstPost = posts.first();
      await expect(firstPost).toBeVisible();
      
      // Check for expand/collapse functionality
      const expandButton = firstPost.locator('button[aria-label*="Expand"], .expand-button, [data-testid="expand-button"]').first();
      
      if (await expandButton.count() > 0) {
        // Test expand
        await expandButton.click();
        await page.waitForTimeout(500);
        
        // Verify expanded state
        const expandedContent = firstPost.locator('.expanded, [data-expanded="true"]');
        if (await expandedContent.count() > 0) {
          await expect(expandedContent.first()).toBeVisible();
        }
        
        // Test collapse
        const collapseButton = firstPost.locator('button[aria-label*="Collapse"], .collapse-button').first();
        if (await collapseButton.count() > 0) {
          await collapseButton.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test('should handle clicks and navigation correctly', async ({ page }) => {
      const thumbnailContainer = page.locator('.thumbnail-summary, [role="article"]').first();
      if (await thumbnailContainer.count() === 0) {
        test.skip('No thumbnail-summary components found');
      }
      
      // Test clicking on thumbnail container
      const initialUrl = page.url();
      
      // Click should either expand the preview or open external link
      await thumbnailContainer.click();
      await page.waitForTimeout(1000);
      
      // Check if it opened a new tab/window or expanded inline
      const currentUrl = page.url();
      const hasExpandedVideo = await page.locator('iframe[src*="youtube"], video').count() > 0;
      
      // Either URL changed (external navigation) or video expanded inline
      expect(currentUrl !== initialUrl || hasExpandedVideo).toBeTruthy();
    });
  });
});

// Cross-browser compatibility tests
test.describe('Cross-Browser Compatibility', () => {
  
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`should work correctly in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
      test.skip(currentBrowser !== browserName, `Skipping ${browserName} test in ${currentBrowser}`);
      
      await page.goto('http://localhost:5173');
      await waitForApplication(page);
      
      const thumbnailContainer = page.locator('.thumbnail-summary, [role="article"]').first();
      if (await thumbnailContainer.count() === 0) {
        test.skip(`No thumbnail-summary components found in ${browserName}`);
      }
      
      // Basic functionality should work across all browsers
      await expect(thumbnailContainer).toBeVisible();
      
      const thumbnail = thumbnailContainer.locator('img, [data-testid="thumbnail"]').first();
      const title = thumbnailContainer.locator('h3, h4').first();
      
      await expect(thumbnail).toBeVisible();
      await expect(title).toBeVisible();
      
      // Test interaction
      await thumbnailContainer.click();
      await page.waitForTimeout(1000);
      
      // Should not crash or show errors
      const errors = page.locator('.error, [data-testid="error"]');
      expect(await errors.count()).toBe(0);
    });
  });
});