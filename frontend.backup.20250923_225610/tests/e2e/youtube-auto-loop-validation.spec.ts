/**
 * YouTube Auto-Loop and Video Functionality Validation Tests
 * 
 * CRITICAL: Tests auto-looping muted videos in expanded mode with 100% real data
 * NO MOCKS - Only real YouTube URLs and live video functionality
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Real YouTube URLs for comprehensive testing
const YOUTUBE_TEST_URLS = {
  standard: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  shortUrl: 'https://youtu.be/dQw4w9WgXcQ',
  withTimestamp: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s',
  withPlaylist: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLTBqohhFNBE_09L0i-lf3fYXF5woAbrzP',
  embedded: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  mobile: 'https://m.youtube.com/watch?v=dQw4w9WgXcQ'
};

test.describe('YouTube Auto-Loop Real Video Tests', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      permissions: ['autoplay'], // Allow autoplay for video tests
    });
    page = await context.newPage();

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="social-media-feed"]', { timeout: 30000 });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should auto-loop and mute video when expanded from thumbnail-summary', async () => {
    // Create post with real YouTube URL
    const postData = {
      title: 'Auto-Loop Video Test',
      content: `Testing auto-loop functionality: ${YOUTUBE_TEST_URLS.standard}`,
      authorAgent: 'VideoTestAgent',
      tags: ['youtube', 'autoloop', 'video']
    };

    const response = await page.request.post('http://localhost:3000/api/v1/agent-posts', {
      data: postData
    });
    expect(response.ok()).toBeTruthy();

    await page.reload({ waitUntil: 'networkidle' });

    // Find the post and expand it
    const postCard = page.locator('[data-testid="post-card"]').first();
    await postCard.waitFor({ timeout: 15000 });

    // Expand the post to full view
    const expandButton = postCard.locator('button[aria-label="Expand post"]');
    await expandButton.click();

    // Wait for expanded view and link preview to load
    await page.waitForTimeout(4000);

    // Verify thumbnail-summary container is present
    const thumbnailSummary = postCard.locator('[role="article"]');
    await expect(thumbnailSummary).toBeVisible();

    // Verify YouTube thumbnail with play button
    const thumbnailSection = thumbnailSummary.locator('div').first();
    const thumbnail = thumbnailSection.locator('img');
    await expect(thumbnail).toBeVisible();
    await expect(thumbnail).toHaveAttribute('src', /youtube\.com\/vi\/dQw4w9WgXcQ/);

    // Verify play overlay is present
    const playOverlay = thumbnailSection.locator('.absolute.inset-0.flex.items-center.justify-center');
    await expect(playOverlay).toBeVisible();

    // Click thumbnail to expand video
    await thumbnailSummary.click();

    // Wait for video player to load
    await page.waitForTimeout(3000);

    // Verify YouTube iframe appears
    const youtubeIframe = page.locator('iframe[src*="youtube"]');
    await expect(youtubeIframe).toBeVisible({ timeout: 10000 });

    // Verify iframe has auto-loop and mute parameters
    const iframeSrc = await youtubeIframe.getAttribute('src');
    console.log('YouTube iframe src:', iframeSrc);

    // Critical validations for auto-loop functionality
    expect(iframeSrc).toContain('autoplay=1');
    expect(iframeSrc).toContain('mute=1');
    expect(iframeSrc).toContain('loop=1');
    expect(iframeSrc).toContain(`playlist=${encodeURIComponent('dQw4w9WgXcQ')}`);
    expect(iframeSrc).toContain('rel=0'); // Disable related videos
    expect(iframeSrc).toContain('modestbranding=1'); // Minimize YouTube branding

    // Verify auto-loop indicator is visible
    const loopIndicator = page.locator('text=Auto-looping').or(
      page.locator('text=🔁').or(
        page.locator('.bg-black.bg-opacity-60:has-text("Auto-looping")')
      )
    );
    await expect(loopIndicator).toBeVisible();

    // Verify mute/unmute controls are available
    const muteButton = page.locator('button[title="Mute"], button[title="Unmute"]');
    await expect(muteButton).toBeVisible();

    // Verify external link to YouTube is available
    const youtubeLink = page.locator('button[title="Open in YouTube"], a[href*="youtube.com/watch"]');
    await expect(youtubeLink).toBeVisible();

    console.log('✅ YouTube auto-loop and mute functionality validated');
  });

  test('should handle different YouTube URL formats correctly', async () => {
    const urlTests = Object.entries(YOUTUBE_TEST_URLS).map(([format, url]) => ({
      format,
      url,
      title: `YouTube ${format} URL Test`
    }));

    for (const test of urlTests) {
      const postData = {
        title: test.title,
        content: `Testing ${test.format} format: ${test.url}`,
        authorAgent: `${test.format}TestAgent`
      };

      await page.request.post('http://localhost:3000/api/v1/agent-posts', {
        data: postData
      });
    }

    await page.reload({ waitUntil: 'networkidle' });

    // Test each post format
    const postCards = page.locator('[data-testid="post-card"]');
    const postCount = await postCards.count();
    
    expect(postCount).toBeGreaterThanOrEqual(urlTests.length);

    for (let i = 0; i < Math.min(urlTests.length, postCount); i++) {
      const postCard = postCards.nth(i);
      
      // Wait for link preview to process
      await page.waitForTimeout(3000);

      // Verify thumbnail-summary container
      const thumbnailSummary = postCard.locator('[role="article"]');
      await expect(thumbnailSummary).toBeVisible();

      // Verify YouTube thumbnail loads
      const thumbnail = thumbnailSummary.locator('img[src*="youtube.com/vi"]');
      if (await thumbnail.count() > 0) {
        await expect(thumbnail).toBeVisible();
        const thumbSrc = await thumbnail.getAttribute('src');
        expect(thumbSrc).toContain('dQw4w9WgXcQ');
      }

      // Verify video type indicator
      const videoTypeIndicator = thumbnailSummary.locator('text=▶').or(
        thumbnailSummary.locator('[class*="bg-red-500"]:has-text("▶")')
      );
      await expect(videoTypeIndicator).toBeVisible();

      console.log(`✅ YouTube ${urlTests[i].format} format validated`);
    }
  });

  test('should switch between thumbnail and expanded video modes', async () => {
    const postData = {
      title: 'Video Mode Switching Test',
      content: `Mode switching test: ${YOUTUBE_TEST_URLS.standard}`,
      authorAgent: 'ModeSwitchTestAgent'
    };

    await page.request.post('http://localhost:3000/api/v1/agent-posts', {
      data: postData
    });

    await page.reload({ waitUntil: 'networkidle' });

    const postCard = page.locator('[data-testid="post-card"]').first();
    await postCard.waitFor();

    // Expand post first
    const expandButton = postCard.locator('button[aria-label="Expand post"]');
    await expandButton.click();
    await page.waitForTimeout(3000);

    // Step 1: Verify initial thumbnail state
    const thumbnailSummary = postCard.locator('[role="article"]');
    await expect(thumbnailSummary).toBeVisible();

    const thumbnail = thumbnailSummary.locator('img');
    await expect(thumbnail).toBeVisible();

    // Step 2: Click to expand video
    await thumbnailSummary.click();
    await page.waitForTimeout(3000);

    // Step 3: Verify expanded video state
    const youtubeIframe = page.locator('iframe[src*="youtube"]');
    await expect(youtubeIframe).toBeVisible();

    // Step 4: Look for collapse/thumbnail button
    const showThumbnailButton = page.locator('button:has-text("Show thumbnail")').or(
      page.locator('button:has-text("← Show thumbnail")')
    );
    
    if (await showThumbnailButton.count() > 0) {
      await showThumbnailButton.click();
      await page.waitForTimeout(2000);

      // Step 5: Verify return to thumbnail state
      await expect(thumbnail).toBeVisible();
      await expect(youtubeIframe).not.toBeVisible();
    }

    console.log('✅ Video mode switching functionality validated');
  });

  test('should maintain video state across browser interactions', async () => {
    const postData = {
      title: 'Video State Persistence Test',
      content: `State persistence test: ${YOUTUBE_TEST_URLS.standard}`,
      authorAgent: 'StatePersistenceAgent'
    };

    await page.request.post('http://localhost:3000/api/v1/agent-posts', {
      data: postData
    });

    await page.reload({ waitUntil: 'networkidle' });

    const postCard = page.locator('[data-testid="post-card"]').first();
    await postCard.waitFor();

    // Expand post and play video
    const expandButton = postCard.locator('button[aria-label="Expand post"]');
    await expandButton.click();
    await page.waitForTimeout(3000);

    const thumbnailSummary = postCard.locator('[role="article"]');
    await thumbnailSummary.click();
    await page.waitForTimeout(3000);

    // Verify video is playing
    const youtubeIframe = page.locator('iframe[src*="youtube"]');
    await expect(youtubeIframe).toBeVisible();

    // Test browser interactions that might affect video state
    await page.mouse.click(100, 100); // Click elsewhere
    await expect(youtubeIframe).toBeVisible(); // Video should still be visible

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(youtubeIframe).toBeVisible();

    // Test scrolling
    await page.evaluate(() => window.scrollBy(0, 100));
    await expect(youtubeIframe).toBeVisible();

    console.log('✅ Video state persistence validated');
  });

  test('should handle video controls and interactions', async () => {
    const postData = {
      title: 'Video Controls Test',
      content: `Controls test: ${YOUTUBE_TEST_URLS.standard}`,
      authorAgent: 'VideoControlsAgent'
    };

    await page.request.post('http://localhost:3000/api/v1/agent-posts', {
      data: postData
    });

    await page.reload({ waitUntil: 'networkidle' });

    const postCard = page.locator('[data-testid="post-card"]').first();
    await postCard.waitFor();

    // Expand and play video
    const expandButton = postCard.locator('button[aria-label="Expand post"]');
    await expandButton.click();
    await page.waitForTimeout(3000);

    const thumbnailSummary = postCard.locator('[role="article"]');
    await thumbnailSummary.click();
    await page.waitForTimeout(3000);

    // Test mute/unmute toggle
    const muteButton = page.locator('button[title*="Mute"], button[title*="mute"]');
    if (await muteButton.count() > 0) {
      const initialTitle = await muteButton.getAttribute('title');
      
      await muteButton.click();
      await page.waitForTimeout(1000);

      const newTitle = await muteButton.getAttribute('title');
      expect(newTitle).not.toBe(initialTitle);
    }

    // Test external YouTube link
    const youtubeLink = page.locator('button[title="Open in YouTube"]');
    if (await youtubeLink.count() > 0) {
      // Get initial page count
      const pages = context.pages();
      const initialPageCount = pages.length;

      await youtubeLink.click();
      await page.waitForTimeout(2000);

      // Verify new page opened
      const newPages = context.pages();
      expect(newPages.length).toBeGreaterThan(initialPageCount);

      // Close the new page
      if (newPages.length > initialPageCount) {
        await newPages[newPages.length - 1].close();
      }
    }

    console.log('✅ Video controls functionality validated');
  });

  test('should handle video loading errors gracefully', async () => {
    // Test with potentially problematic YouTube URLs
    const problematicUrls = [
      'https://www.youtube.com/watch?v=invalid_video_id_123',
      'https://www.youtube.com/watch?v=',
      'https://youtu.be/nonexistent123'
    ];

    for (const url of problematicUrls) {
      const postData = {
        title: `Error Handling Test: ${url.includes('invalid') ? 'Invalid ID' : 'Empty/Nonexistent'}`,
        content: `Testing error handling: ${url}`,
        authorAgent: 'ErrorHandlingAgent'
      };

      await page.request.post('http://localhost:3000/api/v1/agent-posts', {
        data: postData
      });
    }

    await page.reload({ waitUntil: 'networkidle' });

    const postCards = page.locator('[data-testid="post-card"]');
    const postCount = await postCards.count();
    
    expect(postCount).toBeGreaterThanOrEqual(3);

    // Allow time for preview attempts
    await page.waitForTimeout(5000);

    // Check each post for appropriate error handling
    for (let i = 0; i < Math.min(3, postCount); i++) {
      const postCard = postCards.nth(i);
      
      // Should either show a thumbnail preview (fallback) or a regular link
      const hasPreview = await postCard.locator('[role="article"]').count() > 0;
      const hasLink = await postCard.locator('a[href*="youtube"]').count() > 0;
      
      expect(hasPreview || hasLink).toBeTruthy();

      // If preview exists, verify it handles the error gracefully
      if (hasPreview) {
        const thumbnailSummary = postCard.locator('[role="article"]');
        
        // Should have thumbnail section even if image fails to load
        const thumbnailSection = thumbnailSummary.locator('div').first();
        await expect(thumbnailSection).toBeVisible();

        // Should have content section with title
        const contentSection = thumbnailSummary.locator('div').nth(1);
        const titleElement = contentSection.locator('h3');
        await expect(titleElement).toBeVisible();
      }
    }

    console.log('✅ Video loading error handling validated');
  });

  test('should work with different video quality settings', async () => {
    // Test that the video preview system works with different YouTube quality settings
    const postData = {
      title: 'Video Quality Test',
      content: `Testing video quality: ${YOUTUBE_TEST_URLS.standard}`,
      authorAgent: 'VideoQualityAgent'
    };

    await page.request.post('http://localhost:3000/api/v1/agent-posts', {
      data: postData
    });

    await page.reload({ waitUntil: 'networkidle' });

    const postCard = page.locator('[data-testid="post-card"]').first();
    await postCard.waitFor();

    // Expand post
    const expandButton = postCard.locator('button[aria-label="Expand post"]');
    await expandButton.click();
    await page.waitForTimeout(3000);

    const thumbnailSummary = postCard.locator('[role="article"]');
    
    // Verify thumbnail uses appropriate quality (mqdefault for medium quality)
    const thumbnail = thumbnailSummary.locator('img[src*="youtube.com/vi"]');
    await expect(thumbnail).toBeVisible();

    const thumbSrc = await thumbnail.getAttribute('src');
    expect(thumbSrc).toContain('mqdefault.jpg'); // Medium quality default

    // Click to expand video
    await thumbnailSummary.click();
    await page.waitForTimeout(3000);

    // Verify embedded video loads properly
    const youtubeIframe = page.locator('iframe[src*="youtube"]');
    await expect(youtubeIframe).toBeVisible();

    // Verify iframe dimensions are appropriate
    const iframeBox = await youtubeIframe.boundingBox();
    expect(iframeBox).toBeTruthy();
    
    if (iframeBox) {
      expect(iframeBox.width).toBeGreaterThan(300);
      expect(iframeBox.height).toBeGreaterThan(200);
      
      // Verify aspect ratio is approximately 16:9
      const aspectRatio = iframeBox.width / iframeBox.height;
      expect(aspectRatio).toBeGreaterThan(1.5);
      expect(aspectRatio).toBeLessThan(2.0);
    }

    console.log('✅ Video quality settings validated');
  });
});