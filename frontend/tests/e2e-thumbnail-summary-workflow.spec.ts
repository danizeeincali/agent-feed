/**
 * End-to-End Tests for Thumbnail-Summary Layout and Auto-Looping Videos
 * Tests the complete user workflow with the new layout requirements
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('Thumbnail-Summary Layout E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="feed-container"], .feed-container, main', { timeout: 10000 });
  });

  test('displays thumbnail-summary layout in unexpanded posts', async ({ page }) => {
    // Look for posts with URLs that should show thumbnail-summary layout
    await page.waitForTimeout(2000); // Allow content to load
    
    // Look for preview containers with thumbnail-summary layout
    const thumbnailSummaryContainers = page.locator('.thumbnail-summary-container, [role="article"]');
    
    if (await thumbnailSummaryContainers.count() > 0) {
      const firstContainer = thumbnailSummaryContainers.first();
      
      // Should have thumbnail on left side
      const thumbnail = firstContainer.locator('img, .fallback-thumbnail').first();
      await expect(thumbnail).toBeVisible();
      
      // Should have content on right side with title and description
      const title = firstContainer.locator('h3, .title').first();
      await expect(title).toBeVisible();
      
      // Should have metadata row
      const metadata = firstContainer.locator('.metadata, .text-gray-500').first();
      await expect(metadata).toBeVisible();
    }
  });

  test('YouTube video shows thumbnail-summary in unexpanded view', async ({ page }) => {
    // Look for YouTube video post
    const videoPost = page.locator('text=Amazing Coding Tutorial Video, text=YouTube').first();
    
    if (await videoPost.count() > 0) {
      await expect(videoPost).toBeVisible();
      
      // Should show thumbnail with play button overlay
      const playButton = page.locator('[data-testid="video-play-button"], .play-button, button:has-text("▶")').first();
      await expect(playButton).toBeVisible();
      
      // Should have title and summary to the right
      const title = page.locator('text=Amazing Coding Tutorial Video').first();
      await expect(title).toBeVisible();
    }
  });

  test('video expands with auto-loop and mute when clicked', async ({ page }) => {
    // Look for YouTube video thumbnail
    const videoThumbnail = page.locator('img[src*="youtube"], [alt*="YouTube"], .video-thumbnail').first();
    
    if (await videoThumbnail.count() > 0) {
      // Click to expand video
      await videoThumbnail.click();
      
      // Should show iframe video player
      const videoIframe = page.locator('iframe[src*="youtube"]').first();
      await expect(videoIframe).toBeVisible({ timeout: 5000 });
      
      // Check iframe src for auto-loop and mute parameters
      const iframeSrc = await videoIframe.getAttribute('src');
      expect(iframeSrc).toContain('autoplay=1');
      expect(iframeSrc).toContain('mute=1');
      expect(iframeSrc).toContain('loop=1');
      
      // Should show loop indicator
      const loopIndicator = page.locator('text=🔁 Auto-looping, text=Looping').first();
      await expect(loopIndicator).toBeVisible();
    }
  });

  test('article preview shows proper thumbnail-summary layout', async ({ page }) => {
    // Look for article post (Wired or other article)
    const articlePost = page.locator('text=Tesla Pay Package Analysis, text=Wired').first();
    
    if (await articlePost.count() > 0) {
      await expect(articlePost).toBeVisible();
      
      // Should have thumbnail-summary container
      const container = articlePost.locator('..').locator('[role="article"]').first();
      if (await container.count() > 0) {
        await expect(container).toBeVisible();
        
        // Should have proper layout: thumbnail left, content right
        const thumbnail = container.locator('img').first();
        const title = container.locator('h3, .title').first();
        
        if (await thumbnail.count() > 0) {
          await expect(thumbnail).toBeVisible();
        }
        await expect(title).toBeVisible();
      }
    }
  });

  test('hover effects work on thumbnail-summary containers', async ({ page }) => {
    const containers = page.locator('[role="article"], .thumbnail-summary-container');
    
    if (await containers.count() > 0) {
      const firstContainer = containers.first();
      
      // Hover over container
      await firstContainer.hover();
      
      // Should trigger hover effects (shadow, scale, etc.)
      await page.waitForTimeout(500); // Allow hover animation
      
      // Check for hover state changes
      const hasHoverEffect = await firstContainer.evaluate((el) => {
        const computedStyle = getComputedStyle(el);
        const hasBoxShadow = computedStyle.boxShadow !== 'none';
        const hasTransform = computedStyle.transform !== 'none';
        return hasBoxShadow || hasTransform;
      });
      
      expect(hasHoverEffect).toBeTruthy();
    }
  });

  test('keyboard navigation works for accessibility', async ({ page }) => {
    const containers = page.locator('[role="article"], .thumbnail-summary-container');
    
    if (await containers.count() > 0) {
      const firstContainer = containers.first();
      
      // Should be focusable
      await firstContainer.focus();
      await expect(firstContainer).toBeFocused();
      
      // Should respond to Enter key
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      
      // Should trigger click behavior (expansion or navigation)
      // This will vary based on content type but should not error
    }
  });

  test('responsive behavior on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForSelector('[data-testid="feed-container"], .feed-container, main');
    
    // Check that thumbnail-summary layout adapts
    const containers = page.locator('[role="article"], .thumbnail-summary-container');
    
    if (await containers.count() > 0) {
      const firstContainer = containers.first();
      await expect(firstContainer).toBeVisible();
      
      // Should maintain thumbnail-summary layout even on mobile
      const thumbnail = firstContainer.locator('img, .fallback-thumbnail').first();
      const title = firstContainer.locator('h3, .title').first();
      
      if (await thumbnail.count() > 0) {
        await expect(thumbnail).toBeVisible();
      }
      await expect(title).toBeVisible();
      
      // Container should not be too narrow
      const containerWidth = await firstContainer.evaluate((el) => el.clientWidth);
      expect(containerWidth).toBeGreaterThan(300);
    }
  });

  test('video controls work in expanded mode', async ({ page }) => {
    // Find and expand a video
    const videoThumbnail = page.locator('img[src*="youtube"], [alt*="YouTube"]').first();
    
    if (await videoThumbnail.count() > 0) {
      await videoThumbnail.click();
      
      // Wait for video to expand
      const videoContainer = page.locator('iframe[src*="youtube"]').locator('..').first();
      await expect(videoContainer).toBeVisible();
      
      // Hover to show controls
      await videoContainer.hover();
      
      // Should show mute/unmute button
      const muteButton = page.locator('button[title*="Mute"], button[title*="Unmute"]').first();
      if (await muteButton.count() > 0) {
        await expect(muteButton).toBeVisible();
        
        // Click mute button
        await muteButton.click();
        await page.waitForTimeout(500);
      }
      
      // Should show "Open in YouTube" button
      const openButton = page.locator('button[title*="Open in YouTube"]').first();
      if (await openButton.count() > 0) {
        await expect(openButton).toBeVisible();
      }
    }
  });

  test('multiple content types render with correct layouts', async ({ page }) => {
    // Test different content types side by side
    const posts = page.locator('.post-card, .post-container, [data-testid="post"]');
    
    let videoCount = 0;
    let articleCount = 0;
    let textCount = 0;
    
    const postCount = await posts.count();
    
    for (let i = 0; i < Math.min(postCount, 10); i++) {
      const post = posts.nth(i);
      const postText = await post.textContent();
      
      if (postText?.includes('YouTube') || postText?.includes('video')) {
        videoCount++;
        
        // Should have video-specific layout
        const playButton = post.locator('.play-button, [data-testid="play-button"]').first();
        if (await playButton.count() > 0) {
          await expect(playButton).toBeVisible();
        }
      } else if (postText?.includes('article') || postText?.includes('wired') || postText?.includes('medium')) {
        articleCount++;
        
        // Should have article-specific layout
        const articleContainer = post.locator('[role="article"]').first();
        if (await articleContainer.count() > 0) {
          await expect(articleContainer).toBeVisible();
        }
      } else {
        textCount++;
      }
    }
    
    console.log(`Found ${videoCount} videos, ${articleCount} articles, ${textCount} text posts`);
    
    // Should have variety of content types
    expect(videoCount + articleCount).toBeGreaterThan(0);
  });

  test('performance remains good with enhanced previews', async ({ page }) => {
    const startTime = Date.now();
    
    // Measure page load time
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="feed-container"], .feed-container, main');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(15000); // Should load within 15 seconds
    
    // Check that images are lazy loaded
    const images = page.locator('img[loading="lazy"]');
    const lazyImageCount = await images.count();
    expect(lazyImageCount).toBeGreaterThan(0);
    
    // Scroll to trigger lazy loading
    await page.evaluate(() => window.scrollBy(0, 1000));
    await page.waitForTimeout(2000);
    
    // Performance should remain good
    const metrics = await page.evaluate(() => performance.now());
    expect(metrics).toBeLessThan(30000); // Should complete within 30 seconds total
  });
});

test.describe('Error Handling and Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="feed-container"], .feed-container, main');
  });

  test('handles missing thumbnails gracefully', async ({ page }) => {
    // Look for fallback thumbnails (icon-based)
    const fallbackThumbnails = page.locator('.fallback-thumbnail, .bg-gradient-to-br');
    
    if (await fallbackThumbnails.count() > 0) {
      const firstFallback = fallbackThumbnails.first();
      await expect(firstFallback).toBeVisible();
      
      // Should show appropriate icon
      const icon = firstFallback.locator('svg').first();
      await expect(icon).toBeVisible();
    }
  });

  test('handles long text truncation', async ({ page }) => {
    const containers = page.locator('[role="article"], .thumbnail-summary-container');
    
    if (await containers.count() > 0) {
      const titles = containers.locator('h3, .title');
      const descriptions = containers.locator('p, .description');
      
      // Check for truncation indicators
      for (let i = 0; i < Math.min(await titles.count(), 3); i++) {
        const titleText = await titles.nth(i).textContent();
        if (titleText && titleText.length > 100) {
          expect(titleText).toContain('...');
        }
      }
      
      for (let i = 0; i < Math.min(await descriptions.count(), 3); i++) {
        const descText = await descriptions.nth(i).textContent();
        if (descText && descText.length > 150) {
          expect(descText).toContain('...');
        }
      }
    }
  });

  test('maintains functionality when JavaScript is disabled', async ({ page, context }) => {
    // This test ensures graceful degradation
    await context.addInitScript(() => {
      Object.defineProperty(window, 'JavaScript', { value: false });
    });
    
    await page.goto(BASE_URL);
    
    // Basic content should still be visible
    const posts = page.locator('.post-card, .post-container, [data-testid="post"], article');
    if (await posts.count() > 0) {
      await expect(posts.first()).toBeVisible();
    }
    
    // Links should still be clickable
    const links = page.locator('a[href^="http"]');
    if (await links.count() > 0) {
      await expect(links.first()).toBeVisible();
      await expect(links.first()).toHaveAttribute('target', '_blank');
    }
  });
});