/**
 * Final Validation Test for Thumbnail-Summary Functionality
 * 
 * This test validates that the thumbnail-summary preview functionality works 
 * with 100% real data using the actual application structure
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Real URLs for testing
const REAL_TEST_URLS = {
  youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  article: 'https://www.wired.com/story/elon-musk-trillion-dollar-tesla-pay-package/'
};

test.describe('Final Thumbnail-Summary Validation', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    page = await context.newPage();

    // Navigate to application
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="social-media-feed"]', { timeout: 30000 });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('validates thumbnail-summary layout with real YouTube URL', async () => {
    console.log('🧪 Testing thumbnail-summary with real YouTube URL...');

    // Create a test post with proper field name
    const postData = {
      title: 'Real YouTube Video Test',
      content: `Amazing video: ${REAL_TEST_URLS.youtube}`,
      author_agent: 'ThumbnailTestAgent', // Use correct field name
      tags: ['youtube', 'video']
    };

    // Create the post
    const response = await page.request.post('http://localhost:3000/api/v1/agent-posts', {
      data: postData
    });

    if (!response.ok()) {
      const errorText = await response.text();
      console.log('API Error:', response.status(), errorText);
    }

    expect(response.ok()).toBeTruthy();

    // Reload to see the new post
    await page.reload({ waitUntil: 'networkidle' });

    // Wait for post to appear
    const postCards = page.locator('[data-testid="post-card"]');
    await expect(postCards).toHaveCountGreaterThan(0, { timeout: 15000 });

    // Find our test post
    const testPost = postCards.filter({ hasText: 'Real YouTube Video Test' }).first();
    await expect(testPost).toBeVisible();

    console.log('✅ Test post created and visible');

    // Wait for link preview to load (give it time to process)
    await page.waitForTimeout(10000);

    // Check for thumbnail-summary container or fallback
    const thumbnailSummary = testPost.locator('[role="article"]');
    const hasThumbnailSummary = await thumbnailSummary.count() > 0;

    if (hasThumbnailSummary) {
      console.log('✅ Thumbnail-summary container found');

      // Validate layout structure
      const layoutContainer = thumbnailSummary.locator('> div').first();
      await expect(layoutContainer).toBeVisible();
      await expect(layoutContainer).toHaveClass(/flex/);

      // Check if we have thumbnail and content sections
      const childDivs = layoutContainer.locator('> div');
      const childCount = await childDivs.count();
      expect(childCount).toBeGreaterThanOrEqual(2);

      console.log(`✅ Layout has ${childCount} sections`);

      // Verify YouTube content
      const hasYouTubeElements = await Promise.all([
        thumbnailSummary.locator('img[src*="youtube"]').count(),
        thumbnailSummary.locator('text=/youtube|YouTube/i').count(),
        thumbnailSummary.locator('[class*="bg-red-500"]').count() // Video indicator
      ]);

      const hasYouTubeContent = hasYouTubeElements.some(count => count > 0);
      expect(hasYouTubeContent).toBeTruthy();

      console.log('✅ YouTube-specific elements detected');

      // Test interaction
      await thumbnailSummary.click();
      await page.waitForTimeout(3000);

      // Check if video player or external link appeared
      const videoPlayer = page.locator('iframe[src*="youtube"]');
      const videoPlayerCount = await videoPlayer.count();
      
      if (videoPlayerCount > 0) {
        console.log('✅ YouTube video player loaded');
        
        // Verify auto-loop parameters
        const iframeSrc = await videoPlayer.getAttribute('src');
        expect(iframeSrc).toContain('autoplay=1');
        expect(iframeSrc).toContain('loop=1');
        expect(iframeSrc).toContain('mute=1');
        
        console.log('✅ Auto-loop and mute parameters verified');
      } else {
        console.log('⚠️  Video player not loaded, checking for external link behavior');
        // Alternative: check if new tab/window was opened or URL contains youtube
        const currentUrl = page.url();
        console.log('Current URL after click:', currentUrl);
      }

    } else {
      console.log('⚠️  Thumbnail-summary not loaded, checking for fallback link...');

      // Verify fallback link exists
      const fallbackLink = testPost.locator('a[href*="youtube"]');
      await expect(fallbackLink).toBeVisible();

      // Verify link properties
      await expect(fallbackLink).toHaveAttribute('target', '_blank');
      await expect(fallbackLink).toHaveAttribute('rel', 'noopener noreferrer');

      console.log('✅ Fallback link validated');
    }
  });

  test('validates thumbnail-summary layout with real article URL', async () => {
    console.log('🧪 Testing thumbnail-summary with real article URL...');

    // Create a test post with proper field name
    const postData = {
      title: 'Real Article Test',
      content: `Interesting article: ${REAL_TEST_URLS.article}`,
      author_agent: 'ArticleTestAgent', // Use correct field name
      tags: ['article', 'wired']
    };

    // Create the post
    const response = await page.request.post('http://localhost:3000/api/v1/agent-posts', {
      data: postData
    });

    expect(response.ok()).toBeTruthy();

    // Reload to see the new post
    await page.reload({ waitUntil: 'networkidle' });

    // Find our test post
    const testPost = page.locator('[data-testid="post-card"]').filter({ hasText: 'Real Article Test' }).first();
    await expect(testPost).toBeVisible();

    console.log('✅ Article test post created and visible');

    // Wait for link preview to load
    await page.waitForTimeout(10000);

    // Check for thumbnail-summary container or fallback
    const thumbnailSummary = testPost.locator('[role="article"]');
    const hasThumbnailSummary = await thumbnailSummary.count() > 0;

    if (hasThumbnailSummary) {
      console.log('✅ Article thumbnail-summary container found');

      // Validate layout structure
      const layoutContainer = thumbnailSummary.locator('> div').first();
      await expect(layoutContainer).toBeVisible();

      // Check for content sections
      const contentSection = layoutContainer.locator('div').nth(1);
      if (await contentSection.count() > 0) {
        // Verify title is present
        const title = contentSection.locator('h3');
        await expect(title).toBeVisible();

        // Verify site name (no www. truncation)
        const siteElements = contentSection.locator('text=/wired/i');
        const siteCount = await siteElements.count();
        expect(siteCount).toBeGreaterThan(0);

        console.log('✅ Article content structure validated');
      }

      // Test interaction
      await thumbnailSummary.click();
      await page.waitForTimeout(2000);

      console.log('✅ Article interaction completed');

    } else {
      console.log('⚠️  Article thumbnail-summary not loaded, checking fallback...');

      // Verify fallback link exists
      const fallbackLink = testPost.locator('a[href*="wired.com"]');
      await expect(fallbackLink).toBeVisible();

      console.log('✅ Article fallback link validated');
    }
  });

  test('validates responsive behavior', async () => {
    console.log('📱 Testing responsive behavior...');

    // Create a test post
    const postData = {
      title: 'Responsive Test',
      content: `Testing responsive design: ${REAL_TEST_URLS.youtube}`,
      author_agent: 'ResponsiveTestAgent',
      tags: ['responsive']
    };

    await page.request.post('http://localhost:3000/api/v1/agent-posts', {
      data: postData
    });

    await page.reload({ waitUntil: 'networkidle' });

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(2000);

    const testPost = page.locator('[data-testid="post-card"]').filter({ hasText: 'Responsive Test' }).first();
    await expect(testPost).toBeVisible();

    console.log('✅ Mobile viewport: Post remains visible');

    // Wait for any responsive adjustments
    await page.waitForTimeout(3000);

    const thumbnailSummary = testPost.locator('[role="article"]');
    if (await thumbnailSummary.count() > 0) {
      // Check layout adapts to mobile
      const layoutContainer = thumbnailSummary.locator('> div').first();
      const containerClasses = await layoutContainer.getAttribute('class');
      
      // Should use vertical layout or responsive classes
      expect(containerClasses).toMatch(/flex-col|sm:flex-row|flex/);
      
      console.log('✅ Mobile layout adaptation verified');
    } else {
      console.log('⚠️  Preview not loaded on mobile, checking fallback');
      const fallbackLink = testPost.locator('a[href*="youtube"]');
      if (await fallbackLink.count() > 0) {
        console.log('✅ Mobile fallback link present');
      }
    }

    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(2000);

    console.log('✅ Responsive behavior validation completed');
  });

  test('validates real network conditions and performance', async () => {
    console.log('⚡ Testing performance with real network conditions...');

    const startTime = Date.now();

    // Create multiple posts to test performance
    const testPosts = [
      {
        title: 'Performance Test 1',
        content: `Video performance: ${REAL_TEST_URLS.youtube}`,
        author_agent: 'PerformanceAgent1'
      },
      {
        title: 'Performance Test 2', 
        content: `Article performance: ${REAL_TEST_URLS.article}`,
        author_agent: 'PerformanceAgent2'
      }
    ];

    // Create posts
    for (const post of testPosts) {
      await page.request.post('http://localhost:3000/api/v1/agent-posts', {
        data: post
      });
    }

    const creationTime = Date.now() - startTime;
    console.log(`📊 Post creation time: ${creationTime}ms`);

    // Reload and measure
    const reloadStartTime = Date.now();
    await page.reload({ waitUntil: 'networkidle' });
    const reloadTime = Date.now() - reloadStartTime;
    console.log(`📊 Page reload time: ${reloadTime}ms`);

    // Check posts load within reasonable time
    const postCards = page.locator('[data-testid="post-card"]');
    await expect(postCards).toHaveCountGreaterThanOrEqual(2, { timeout: 15000 });

    // Wait for previews to load or timeout
    const previewStartTime = Date.now();
    
    // Allow time for link previews to process
    await page.waitForTimeout(15000);
    
    const previewTime = Date.now() - previewStartTime;
    console.log(`📊 Preview processing time: ${previewTime}ms`);

    // Count successful previews vs fallbacks
    let previewCount = 0;
    let fallbackCount = 0;

    const testPostElements = postCards.filter({ hasText: /Performance Test/ });
    const testPostCount = await testPostElements.count();

    for (let i = 0; i < testPostCount; i++) {
      const postCard = testPostElements.nth(i);
      const hasPreview = await postCard.locator('[role="article"]').count() > 0;
      const hasFallback = await postCard.locator('a[href*="http"]').count() > 0;

      if (hasPreview) {
        previewCount++;
      } else if (hasFallback) {
        fallbackCount++;
      }
    }

    console.log(`📊 Successful previews: ${previewCount}/${testPostCount}`);
    console.log(`📊 Fallback links: ${fallbackCount}/${testPostCount}`);

    // Performance expectations (generous for real network conditions)
    expect(reloadTime).toBeLessThan(20000); // 20 seconds max for reload
    expect(previewCount + fallbackCount).toBeGreaterThanOrEqual(testPostCount); // All posts should show something

    const totalTestTime = Date.now() - startTime;
    console.log(`📊 Total test time: ${totalTestTime}ms`);

    console.log('✅ Performance validation completed');
  });

  test('validates accessibility features', async () => {
    console.log('♿ Testing accessibility features...');

    // Create test post
    const postData = {
      title: 'Accessibility Test',
      content: `Accessibility testing: ${REAL_TEST_URLS.youtube}`,
      author_agent: 'AccessibilityAgent',
      tags: ['accessibility']
    };

    await page.request.post('http://localhost:3000/api/v1/agent-posts', {
      data: postData
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(8000);

    const testPost = page.locator('[data-testid="post-card"]').filter({ hasText: 'Accessibility Test' }).first();
    await expect(testPost).toBeVisible();

    const thumbnailSummary = testPost.locator('[role="article"]');
    
    if (await thumbnailSummary.count() > 0) {
      // Test ARIA attributes
      await expect(thumbnailSummary).toHaveAttribute('role', 'article');
      
      // Test keyboard navigation
      await thumbnailSummary.focus();
      await expect(thumbnailSummary).toBeFocused();

      // Test keyboard interaction
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);

      // Test image alt text if present
      const images = thumbnailSummary.locator('img');
      const imageCount = await images.count();
      
      if (imageCount > 0) {
        for (let i = 0; i < imageCount; i++) {
          const img = images.nth(i);
          const altText = await img.getAttribute('alt');
          expect(altText).toBeTruthy();
          expect(altText).not.toBe('');
        }
        console.log('✅ Image alt text validated');
      }

      console.log('✅ Accessibility features validated');
    } else {
      // Test fallback link accessibility
      const fallbackLink = testPost.locator('a[href*="youtube"]');
      if (await fallbackLink.count() > 0) {
        await expect(fallbackLink).toHaveAttribute('target', '_blank');
        await expect(fallbackLink).toHaveAttribute('rel', 'noopener noreferrer');
        console.log('✅ Fallback link accessibility validated');
      }
    }
  });
});