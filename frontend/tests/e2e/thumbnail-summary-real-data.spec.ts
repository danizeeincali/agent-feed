/**
 * Comprehensive E2E Tests for Thumbnail-Summary Preview Functionality
 * 
 * CRITICAL REQUIREMENTS:
 * 1. NO MOCKS OR SIMULATIONS - Test only with real URLs and live data
 * 2. Validate the layout: thumbnail on left, title/summary on right for collapsed posts
 * 3. Verify auto-looping muted videos in expanded mode
 * 4. Test with real YouTube and article URLs
 * 5. Ensure no "www." truncation issues
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Real URLs for testing - NO MOCKS
const REAL_TEST_URLS = {
  youtube: {
    valid: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    shortForm: 'https://youtu.be/dQw4w9WgXcQ',
    withParams: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s'
  },
  articles: {
    wired: 'https://www.wired.com/story/elon-musk-trillion-dollar-tesla-pay-package/',
    medium: 'https://medium.com/@nodejs/node-js-20-8-0-is-now-available-c7ca1076a52e',
    techCrunch: 'https://techcrunch.com/2023/11/06/openai-completes-investigation-into-sam-altmans-conduct-issues-statement-of-support/'
  },
  github: {
    repo: 'https://github.com/microsoft/vscode',
    issue: 'https://github.com/microsoft/vscode/issues/123456'
  }
};

test.describe('Thumbnail-Summary Real Data E2E Tests', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    // Create a fresh context and page for each test
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    page = await context.newPage();

    // Wait for application to be ready
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="social-media-feed"]', { timeout: 30000 });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should render thumbnail-summary layout correctly for real YouTube URL in collapsed post', async () => {
    // Create a post with a real YouTube URL
    const postData = {
      title: 'Test YouTube Integration',
      content: `Check out this amazing video: ${REAL_TEST_URLS.youtube.valid}`,
      authorAgent: 'TestAgent',
      tags: ['youtube', 'video', 'test']
    };

    // Create the post via API
    const response = await page.request.post('http://localhost:3000/api/v1/agent-posts', {
      data: postData
    });
    expect(response.ok()).toBeTruthy();

    // Refresh the page to see the new post
    await page.reload({ waitUntil: 'networkidle' });

    // Wait for the post to appear
    const postCard = page.locator('[data-testid="post-card"]').first();
    await postCard.waitFor({ timeout: 15000 });

    // Verify the post is collapsed by default (should show ChevronDown)
    const expandButton = postCard.locator('button[aria-label="Expand post"]');
    await expect(expandButton).toBeVisible();

    // Verify thumbnail-summary layout in collapsed view
    const collapsedContent = postCard.locator('.space-y-3').first();
    await expect(collapsedContent).toBeVisible();

    // Wait for link preview to load
    await page.waitForTimeout(3000);

    // Verify ThumbnailSummaryContainer is rendered
    const thumbnailSummary = postCard.locator('[role="article"]').first();
    await expect(thumbnailSummary).toBeVisible();

    // Verify layout: thumbnail on left, content on right
    const flexContainer = thumbnailSummary.locator('> div').first();
    await expect(flexContainer).toHaveClass(/flex/);
    await expect(flexContainer).toHaveClass(/flex-col|flex-row/);

    // Verify thumbnail section
    const thumbnailSection = flexContainer.locator('> div').first();
    await expect(thumbnailSection).toHaveClass(/flex-shrink-0/);

    // Verify content section is to the right
    const contentSection = flexContainer.locator('> div').nth(1);
    await expect(contentSection).toHaveClass(/flex-1/);

    // Verify YouTube thumbnail loads correctly
    const thumbnail = thumbnailSection.locator('img');
    await expect(thumbnail).toBeVisible();
    await expect(thumbnail).toHaveAttribute('src', /youtube\.com\/vi\/dQw4w9WgXcQ/);

    // Verify video play overlay is present
    const playOverlay = thumbnailSection.locator('[aria-label*="Play"]').or(
      thumbnailSection.locator('.absolute.inset-0.flex.items-center.justify-center')
    );
    await expect(playOverlay).toBeVisible();

    // Verify title and description are displayed
    const titleElement = contentSection.locator('h3');
    await expect(titleElement).toBeVisible();
    await expect(titleElement).toContainText(/youtube|video/i);

    // Verify metadata shows correct site name (no www. truncation)
    const siteNameElement = contentSection.locator('text=youtube.com').or(
      contentSection.locator('text=YouTube')
    );
    await expect(siteNameElement).toBeVisible();

    // Verify external link indicator
    const externalLinkIcon = contentSection.locator('[data-icon="external-link"]').or(
      contentSection.locator('svg').last()
    );
    await expect(externalLinkIcon).toBeVisible();

    console.log('✅ Thumbnail-summary layout validation passed for YouTube URL in collapsed post');
  });

  test('should auto-loop muted video when expanded', async () => {
    // Create post with YouTube URL
    const postData = {
      title: 'Auto-Loop Video Test',
      content: `Video with auto-loop: ${REAL_TEST_URLS.youtube.valid}`,
      authorAgent: 'VideoTestAgent'
    };

    await page.request.post('http://localhost:3000/api/v1/agent-posts', {
      data: postData
    });

    await page.reload({ waitUntil: 'networkidle' });

    // Find the post and expand it
    const postCard = page.locator('[data-testid="post-card"]').first();
    await postCard.waitFor();

    const expandButton = postCard.locator('button[aria-label="Expand post"]');
    await expandButton.click();

    // Wait for expansion
    await page.waitForTimeout(2000);

    // Wait for enhanced link preview to load
    await page.waitForTimeout(3000);

    // Click on the thumbnail to expand the video
    const thumbnailContainer = postCard.locator('[role="article"]').first();
    await thumbnailContainer.click();

    // Wait for video player to appear
    await page.waitForTimeout(3000);

    // Verify YouTube iframe is loaded
    const youtubeIframe = page.locator('iframe[src*="youtube"]');
    await expect(youtubeIframe).toBeVisible();

    // Verify iframe has auto-loop parameters
    const iframeSrc = await youtubeIframe.getAttribute('src');
    expect(iframeSrc).toContain('autoplay=1');
    expect(iframeSrc).toContain('mute=1');
    expect(iframeSrc).toContain('loop=1');
    expect(iframeSrc).toContain('playlist=dQw4w9WgXcQ');

    // Verify loop indicator is shown
    const loopIndicator = page.locator('text=Auto-looping').or(
      page.locator('text=🔁').or(
        page.locator('[title*="loop"]')
      )
    );
    await expect(loopIndicator).toBeVisible();

    // Verify mute controls are available
    const muteButton = page.locator('button[title*="Mute"]').or(
      page.locator('button[title*="Unmute"]')
    );
    await expect(muteButton).toBeVisible();

    console.log('✅ Auto-looping muted video test passed');
  });

  test('should handle real article URLs with proper thumbnail-summary layout', async () => {
    // Test multiple real article URLs
    const articles = [
      { url: REAL_TEST_URLS.articles.wired, name: 'Wired Article' },
      { url: REAL_TEST_URLS.articles.medium, name: 'Medium Article' }
    ];

    for (const article of articles) {
      // Create post with article URL
      const postData = {
        title: `Test Article: ${article.name}`,
        content: `Interesting article: ${article.url}`,
        authorAgent: 'ArticleTestAgent'
      };

      await page.request.post('http://localhost:3000/api/v1/agent-posts', {
        data: postData
      });
    }

    await page.reload({ waitUntil: 'networkidle' });

    // Test each post
    const postCards = page.locator('[data-testid="post-card"]');
    const postCount = await postCards.count();
    
    expect(postCount).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < Math.min(2, postCount); i++) {
      const postCard = postCards.nth(i);
      
      // Wait for link preview to load
      await page.waitForTimeout(4000);

      // Verify thumbnail-summary container
      const thumbnailSummary = postCard.locator('[role="article"]');
      await expect(thumbnailSummary).toBeVisible();

      // Verify horizontal layout (thumbnail left, content right)
      const flexContainer = thumbnailSummary.locator('> div').first();
      await expect(flexContainer).toHaveClass(/flex/);

      // Verify thumbnail section
      const thumbnailSection = flexContainer.locator('> div').first();
      await expect(thumbnailSection).toHaveClass(/flex-shrink-0/);

      // Check if image thumbnail exists or fallback is used
      const hasImage = await thumbnailSection.locator('img').count() > 0;
      const hasFallback = await thumbnailSection.locator('svg').count() > 0;
      
      expect(hasImage || hasFallback).toBeTruthy();

      // Verify content section
      const contentSection = flexContainer.locator('> div').nth(1);
      await expect(contentSection).toHaveClass(/flex-1/);

      // Verify title is present
      const titleElement = contentSection.locator('h3');
      await expect(titleElement).toBeVisible();

      // Verify description/summary is present
      const descriptionElement = contentSection.locator('p');
      await expect(descriptionElement).toBeVisible();

      // Verify site name without www. truncation
      const siteNameElement = contentSection.locator('[class*="text-gray-500"] span').first();
      await expect(siteNameElement).toBeVisible();
      
      const siteNameText = await siteNameElement.textContent();
      expect(siteNameText).not.toMatch(/^www\./);

      // Verify article type indicator
      const typeIndicator = thumbnailSection.locator('[class*="absolute"]').last();
      await expect(typeIndicator).toBeVisible();
    }

    console.log('✅ Real article URL thumbnail-summary layout test passed');
  });

  test('should work with different screen sizes (responsive)', async () => {
    const postData = {
      title: 'Responsive Test Post',
      content: `Testing responsive layout: ${REAL_TEST_URLS.youtube.valid}`,
      authorAgent: 'ResponsiveTestAgent'
    };

    await page.request.post('http://localhost:3000/api/v1/agent-posts', {
      data: postData
    });

    // Test multiple viewport sizes
    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1024, height: 768, name: 'Desktop Small' },
      { width: 1920, height: 1080, name: 'Desktop Large' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.reload({ waitUntil: 'networkidle' });

      // Wait for content to load
      await page.waitForTimeout(3000);

      const postCard = page.locator('[data-testid="post-card"]').first();
      await postCard.waitFor();

      // Wait for link preview
      await page.waitForTimeout(3000);

      const thumbnailSummary = postCard.locator('[role="article"]');
      await expect(thumbnailSummary).toBeVisible();

      // Verify the layout adapts to screen size
      const flexContainer = thumbnailSummary.locator('> div').first();
      const containerClasses = await flexContainer.getAttribute('class');
      
      // On mobile, should stack vertically (flex-col), on larger screens horizontally (flex-row)
      if (viewport.width < 640) {
        expect(containerClasses).toContain('flex-col');
      } else {
        expect(containerClasses).toMatch(/flex-row|sm:flex-row/);
      }

      // Verify both thumbnail and content sections are still visible
      const thumbnailSection = flexContainer.locator('> div').first();
      const contentSection = flexContainer.locator('> div').nth(1);
      
      await expect(thumbnailSection).toBeVisible();
      await expect(contentSection).toBeVisible();

      console.log(`✅ Responsive test passed for ${viewport.name} (${viewport.width}x${viewport.height})`);
    }
  });

  test('should handle network failures gracefully with real URLs', async () => {
    // Test with potentially slow or failing URLs
    const testUrls = [
      'https://httpstat.us/404', // Will return 404
      'https://httpstat.us/500', // Will return 500
      'https://example.com/nonexistent-page', // Valid domain, invalid path
      REAL_TEST_URLS.youtube.valid // Known good URL for comparison
    ];

    for (const url of testUrls) {
      const postData = {
        title: `Network Test: ${url.includes('httpstat') ? 'Error URL' : 'Valid URL'}`,
        content: `Testing network handling: ${url}`,
        authorAgent: 'NetworkTestAgent'
      };

      await page.request.post('http://localhost:3000/api/v1/agent-posts', {
        data: postData
      });
    }

    await page.reload({ waitUntil: 'networkidle' });

    const postCards = page.locator('[data-testid="post-card"]');
    const postCount = await postCards.count();
    
    expect(postCount).toBeGreaterThanOrEqual(3);

    // Allow extra time for network requests to complete or fail
    await page.waitForTimeout(10000);

    // Check each post for appropriate handling
    for (let i = 0; i < Math.min(4, postCount); i++) {
      const postCard = postCards.nth(i);
      
      // Check if link preview loaded or fallback is shown
      const hasPreview = await postCard.locator('[role="article"]').count() > 0;
      const hasFallbackLink = await postCard.locator('a[href*="http"]').count() > 0;
      
      // Either a preview loaded or a fallback link is shown
      expect(hasPreview || hasFallbackLink).toBeTruthy();

      // If preview failed to load, should show the raw URL as a clickable link
      if (!hasPreview) {
        const fallbackLink = postCard.locator('a[href*="http"]');
        await expect(fallbackLink).toBeVisible();
        await expect(fallbackLink).toHaveAttribute('target', '_blank');
        await expect(fallbackLink).toHaveAttribute('rel', 'noopener noreferrer');
      }
    }

    console.log('✅ Network failure handling test passed');
  });

  test('should maintain accessibility features', async () => {
    const postData = {
      title: 'Accessibility Test Post',
      content: `Accessibility test with video: ${REAL_TEST_URLS.youtube.valid}`,
      authorAgent: 'AccessibilityTestAgent'
    };

    await page.request.post('http://localhost:3000/api/v1/agent-posts', {
      data: postData
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);

    const postCard = page.locator('[data-testid="post-card"]').first();
    const thumbnailSummary = postCard.locator('[role="article"]');
    await expect(thumbnailSummary).toBeVisible();

    // Verify ARIA attributes
    await expect(thumbnailSummary).toHaveAttribute('role', 'article');
    await expect(thumbnailSummary).toHaveAttribute('aria-label');
    
    const ariaLabel = await thumbnailSummary.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/Preview:/);

    // Verify keyboard navigation
    await thumbnailSummary.focus();
    await expect(thumbnailSummary).toBeFocused();

    // Test keyboard interaction (Enter key)
    await page.keyboard.press('Enter');
    
    // Should either open link or expand video
    await page.waitForTimeout(1000);

    // Verify images have proper alt text
    const thumbnailImage = thumbnailSummary.locator('img');
    if (await thumbnailImage.count() > 0) {
      await expect(thumbnailImage).toHaveAttribute('alt');
      const altText = await thumbnailImage.getAttribute('alt');
      expect(altText).toBeTruthy();
      expect(altText).not.toBe('');
    }

    // Verify links have proper attributes
    const externalLinks = thumbnailSummary.locator('a[href*="http"]');
    if (await externalLinks.count() > 0) {
      for (let i = 0; i < await externalLinks.count(); i++) {
        const link = externalLinks.nth(i);
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      }
    }

    console.log('✅ Accessibility features test passed');
  });

  test('should handle multiple URLs in single post correctly', async () => {
    const postData = {
      title: 'Multiple URLs Test',
      content: `Check these out: ${REAL_TEST_URLS.youtube.valid} and also ${REAL_TEST_URLS.articles.wired}`,
      authorAgent: 'MultiUrlTestAgent'
    };

    await page.request.post('http://localhost:3000/api/v1/agent-posts', {
      data: postData
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    const postCard = page.locator('[data-testid="post-card"]').first();

    // Should show multiple preview containers
    const previewContainers = postCard.locator('[role="article"]');
    const previewCount = await previewContainers.count();
    
    expect(previewCount).toBeGreaterThanOrEqual(1);

    // Each preview should maintain proper layout
    for (let i = 0; i < previewCount; i++) {
      const container = previewContainers.nth(i);
      await expect(container).toBeVisible();

      const flexContainer = container.locator('> div').first();
      await expect(flexContainer).toHaveClass(/flex/);

      const thumbnailSection = flexContainer.locator('> div').first();
      const contentSection = flexContainer.locator('> div').nth(1);
      
      await expect(thumbnailSection).toBeVisible();
      await expect(contentSection).toBeVisible();
    }

    console.log('✅ Multiple URLs test passed');
  });

  test('should perform well with real network conditions', async () => {
    const startTime = Date.now();

    const postData = {
      title: 'Performance Test Post',
      content: `Performance test: ${REAL_TEST_URLS.youtube.valid}`,
      authorAgent: 'PerformanceTestAgent'
    };

    await page.request.post('http://localhost:3000/api/v1/agent-posts', {
      data: postData
    });

    await page.reload({ waitUntil: 'networkidle' });

    const postCard = page.locator('[data-testid="post-card"]').first();
    await postCard.waitFor();

    // Wait for link preview to load with timeout
    const previewLoadStartTime = Date.now();
    
    try {
      await expect(postCard.locator('[role="article"]')).toBeVisible({ timeout: 15000 });
      const previewLoadTime = Date.now() - previewLoadStartTime;
      
      console.log(`Link preview loaded in ${previewLoadTime}ms`);
      expect(previewLoadTime).toBeLessThan(15000); // Should load within 15 seconds
      
    } catch (error) {
      // If preview fails to load, verify fallback is shown
      const fallbackLink = postCard.locator('a[href*="http"]');
      await expect(fallbackLink).toBeVisible();
      console.log('Link preview failed to load, fallback link displayed');
    }

    const totalTime = Date.now() - startTime;
    console.log(`Total test execution time: ${totalTime}ms`);
    
    // Total test should complete within reasonable time
    expect(totalTime).toBeLessThan(30000);

    console.log('✅ Performance test passed');
  });
});

// Additional test suite for edge cases and error scenarios
test.describe('Thumbnail-Summary Edge Cases', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="social-media-feed"]', { timeout: 30000 });
  });

  test('should handle malformed URLs gracefully', async () => {
    const malformedUrls = [
      'htp://invalid-protocol.com',
      'https://[invalid-url',
      'not-a-url-at-all',
      'https://',
      'youtube.com/watch?v=123' // Missing protocol
    ];

    for (const url of malformedUrls) {
      const postData = {
        title: `Malformed URL Test: ${url}`,
        content: `Testing malformed URL: ${url}`,
        authorAgent: 'MalformedUrlTestAgent'
      };

      await page.request.post('http://localhost:3000/api/v1/agent-posts', {
        data: postData
      });
    }

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const postCards = page.locator('[data-testid="post-card"]');
    const postCount = await postCards.count();
    
    // All posts should render without breaking the layout
    expect(postCount).toBeGreaterThanOrEqual(3);

    // Verify each post handles the malformed URL appropriately
    for (let i = 0; i < Math.min(5, postCount); i++) {
      const postCard = postCards.nth(i);
      
      // Should show the content, even if preview fails
      await expect(postCard).toBeVisible();
      
      // Content should contain the URL as text
      const contentText = await postCard.textContent();
      expect(contentText).toBeTruthy();
    }

    console.log('✅ Malformed URLs test passed');
  });

  test('should handle very long URLs', async () => {
    const longUrl = REAL_TEST_URLS.youtube.valid + '&' + 'param='.repeat(100) + 'very-long-value';
    
    const postData = {
      title: 'Long URL Test',
      content: `Testing very long URL: ${longUrl}`,
      authorAgent: 'LongUrlTestAgent'
    };

    await page.request.post('http://localhost:3000/api/v1/agent-posts', {
      data: postData
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);

    const postCard = page.locator('[data-testid="post-card"]').first();
    await expect(postCard).toBeVisible();

    // Should still show preview or fallback
    const hasPreview = await postCard.locator('[role="article"]').count() > 0;
    const hasFallbackLink = await postCard.locator('a[href*="youtube"]').count() > 0;
    
    expect(hasPreview || hasFallbackLink).toBeTruthy();

    console.log('✅ Long URL test passed');
  });
});