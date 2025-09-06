/**
 * End-to-End Web Preview Functionality Validation
 * Comprehensive automated testing of YouTube embedding, article previews, and thumbnails
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');

class WebPreviewValidator {
  constructor(page) {
    this.page = page;
    this.results = {
      testStartTime: new Date().toISOString(),
      tests: [],
      issues: [],
      screenshots: [],
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  async addTestResult(testName, passed, details = {}) {
    this.results.tests.push({
      name: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
    
    if (passed) {
      this.results.summary.passed++;
    } else {
      this.results.summary.failed++;
    }
    this.results.summary.totalTests++;
  }

  async addIssue(type, description, details = {}) {
    this.results.issues.push({
      type,
      description,
      details,
      timestamp: new Date().toISOString()
    });
    this.results.summary.warnings++;
  }

  async takeScreenshot(name, description) {
    const screenshotPath = path.join(__dirname, 'screenshots', `${name}-${Date.now()}.png`);
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    
    this.results.screenshots.push({
      name,
      description,
      path: screenshotPath,
      timestamp: new Date().toISOString()
    });
    
    return screenshotPath;
  }

  async saveResults() {
    const reportPath = path.join(__dirname, `web-preview-e2e-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    return reportPath;
  }
}

test.describe('Web Preview Functionality Validation', () => {
  let validator;

  test.beforeEach(async ({ page }) => {
    validator = new WebPreviewValidator(page);
    
    // Navigate to the Agent Feed application
    await page.goto('http://localhost:5173');
    
    // Wait for application to load
    await page.waitForSelector('[data-testid="social-media-feed"]', { timeout: 10000 });
  });

  test.afterEach(async () => {
    // Save test results after each test
    const reportPath = await validator.saveResults();
    console.log(`Test results saved to: ${reportPath}`);
  });

  test('Application loads and displays feed', async ({ page }) => {
    // Test basic application loading
    const feedElement = await page.locator('[data-testid="social-media-feed"]');
    await expect(feedElement).toBeVisible();
    await validator.addTestResult('application_loads', true, { element: 'social-media-feed' });
    
    // Check for posts
    const posts = await page.locator('[data-testid="post-card"]');
    const postCount = await posts.count();
    
    if (postCount > 0) {
      await validator.addTestResult('posts_display', true, { postCount });
    } else {
      await validator.addTestResult('posts_display', false, { postCount: 0 });
      await validator.addIssue('no_posts', 'No posts found in feed');
    }

    await validator.takeScreenshot('application-loaded', 'Application loaded with feed displayed');
  });

  test('Link parsing and URL detection', async ({ page }) => {
    // Look for posts with URLs in content
    const posts = await page.locator('[data-testid="post-card"]');
    const postCount = await posts.count();
    
    let urlsFound = false;
    let linksClickable = false;
    
    for (let i = 0; i < Math.min(postCount, 5); i++) {
      const post = posts.nth(i);
      
      // Look for URLs in post content
      const urls = await post.locator('a[href*="http"]');
      const urlCount = await urls.count();
      
      if (urlCount > 0) {
        urlsFound = true;
        
        // Test if URLs are clickable
        const firstUrl = urls.first();
        const href = await firstUrl.getAttribute('href');
        const target = await firstUrl.getAttribute('target');
        
        if (href && target === '_blank') {
          linksClickable = true;
        }
        
        break;
      }
    }
    
    await validator.addTestResult('url_detection', urlsFound, { message: 'URLs detected in posts' });
    await validator.addTestResult('url_clickability', linksClickable, { message: 'URLs open in new tab' });
    
    if (urlsFound) {
      await validator.takeScreenshot('urls-detected', 'Posts with clickable URLs');
    }
  });

  test('YouTube video preview functionality', async ({ page }) => {
    let youtubeFound = false;
    let thumbnailVisible = false;
    let playButtonWorks = false;
    
    // Look for YouTube URLs or video elements
    const posts = await page.locator('[data-testid="post-card"]');
    const postCount = await posts.count();
    
    for (let i = 0; i < postCount; i++) {
      const post = posts.nth(i);
      
      // Check for YouTube URLs
      const youtubeLinks = await post.locator('a[href*="youtube.com"], a[href*="youtu.be"]');
      const youtubeLinkCount = await youtubeLinks.count();
      
      if (youtubeLinkCount > 0) {
        youtubeFound = true;
        
        // Look for video thumbnails or embed elements
        const videoThumbnails = await post.locator('img[src*="youtube"], img[src*="ytimg"]');
        const thumbnailCount = await videoThumbnails.count();
        
        if (thumbnailCount > 0) {
          thumbnailVisible = true;
          
          // Take screenshot of YouTube preview
          await validator.takeScreenshot('youtube-preview', 'YouTube video preview with thumbnail');
          
          // Try to interact with video preview
          try {
            const playButton = await post.locator('[aria-label*="play"], [title*="play"], .play-button, button:has-text("▶")');
            const playButtonCount = await playButton.count();
            
            if (playButtonCount > 0) {
              // Click play button and check for iframe or video element
              await playButton.first().click();
              await page.waitForTimeout(2000); // Wait for video to load
              
              const iframe = await post.locator('iframe[src*="youtube"]');
              const iframeCount = await iframe.count();
              
              if (iframeCount > 0) {
                playButtonWorks = true;
                await validator.takeScreenshot('youtube-embedded', 'YouTube video embedded player');
              }
            }
          } catch (error) {
            await validator.addIssue('youtube_interaction_error', 'Error interacting with YouTube preview', { error: error.message });
          }
        }
        
        break;
      }
    }
    
    await validator.addTestResult('youtube_detection', youtubeFound, { message: 'YouTube URLs found in posts' });
    await validator.addTestResult('youtube_thumbnails', thumbnailVisible, { message: 'YouTube thumbnails displayed' });
    await validator.addTestResult('youtube_embed', playButtonWorks, { message: 'YouTube embed functionality works' });
    
    if (!youtubeFound) {
      await validator.addIssue('no_youtube_content', 'No YouTube content found for testing');
    }
  });

  test('Article preview and metadata extraction', async ({ page }) => {
    let articlePreviewFound = false;
    let metadataDisplayed = false;
    let imagesLoaded = false;
    
    const posts = await page.locator('[data-testid="post-card"]');
    const postCount = await posts.count();
    
    for (let i = 0; i < postCount; i++) {
      const post = posts.nth(i);
      
      // Look for article URLs (non-YouTube)
      const articleLinks = await post.locator('a[href*="http"]:not([href*="youtube"]):not([href*="youtu.be"])');
      const articleLinkCount = await articleLinks.count();
      
      if (articleLinkCount > 0) {
        // Look for link preview elements
        const previewCards = await post.locator('.border, .rounded-lg, .preview-card, [class*="preview"], [class*="link"]');
        const previewCount = await previewCards.count();
        
        if (previewCount > 0) {
          articlePreviewFound = true;
          
          // Check for metadata elements
          const titles = await post.locator('h1, h2, h3, h4, .title, [class*="title"]');
          const descriptions = await post.locator('.description, p, [class*="description"]');
          const images = await post.locator('img:not([src*="youtube"])');
          
          const titleCount = await titles.count();
          const descriptionCount = await descriptions.count();
          const imageCount = await images.count();
          
          if (titleCount > 0 || descriptionCount > 0) {
            metadataDisplayed = true;
          }
          
          if (imageCount > 0) {
            // Check if images are actually loaded
            const firstImage = images.first();
            const naturalWidth = await firstImage.evaluate(img => img.naturalWidth);
            if (naturalWidth > 0) {
              imagesLoaded = true;
            }
          }
          
          await validator.takeScreenshot('article-preview', 'Article preview with metadata');
          break;
        }
      }
    }
    
    await validator.addTestResult('article_preview_detection', articlePreviewFound, { message: 'Article previews found' });
    await validator.addTestResult('article_metadata', metadataDisplayed, { message: 'Article metadata displayed' });
    await validator.addTestResult('article_images', imagesLoaded, { message: 'Article images loaded' });
    
    if (!articlePreviewFound) {
      await validator.addIssue('no_article_previews', 'No article previews found for testing');
    }
  });

  test('Responsive design validation', async ({ page }) => {
    // Test different viewport sizes
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(1000); // Wait for layout adjustment
      
      // Check if feed is still visible and functional
      const feedElement = await page.locator('[data-testid="social-media-feed"]');
      const isVisible = await feedElement.isVisible();
      
      await validator.addTestResult(`responsive_${viewport.name}`, isVisible, { 
        viewport: viewport.name, 
        dimensions: `${viewport.width}x${viewport.height}` 
      });
      
      // Take screenshot for each viewport
      await validator.takeScreenshot(`responsive-${viewport.name}`, `Responsive design at ${viewport.name} viewport`);
      
      // Check if images scale properly
      const images = await page.locator('img');
      const imageCount = await images.count();
      
      if (imageCount > 0) {
        let imagesWithinBounds = 0;
        
        for (let i = 0; i < Math.min(imageCount, 3); i++) {
          const image = images.nth(i);
          const box = await image.boundingBox();
          
          if (box && box.width <= viewport.width) {
            imagesWithinBounds++;
          }
        }
        
        const allImagesScaled = imagesWithinBounds === Math.min(imageCount, 3);
        await validator.addTestResult(`image_scaling_${viewport.name}`, allImagesScaled, {
          viewport: viewport.name,
          scaledImages: imagesWithinBounds,
          totalImages: Math.min(imageCount, 3)
        });
      }
    }
  });

  test('Accessibility validation', async ({ page }) => {
    // Check for ARIA labels and accessibility features
    const posts = await page.locator('[data-testid="post-card"]');
    const postCount = await posts.count();
    
    let ariaLabelsFound = false;
    let altTextPresent = false;
    let keyboardNavigable = false;
    
    if (postCount > 0) {
      const firstPost = posts.first();
      
      // Check for ARIA labels
      const ariaElements = await firstPost.locator('[aria-label], [aria-labelledby], [role]');
      const ariaCount = await ariaElements.count();
      ariaLabelsFound = ariaCount > 0;
      
      // Check for alt text on images
      const images = await firstPost.locator('img');
      const imageCount = await images.count();
      
      if (imageCount > 0) {
        let imagesWithAlt = 0;
        for (let i = 0; i < imageCount; i++) {
          const alt = await images.nth(i).getAttribute('alt');
          if (alt && alt.trim() !== '') {
            imagesWithAlt++;
          }
        }
        altTextPresent = imagesWithAlt > 0;
      }
      
      // Test keyboard navigation
      try {
        await page.keyboard.press('Tab');
        const focusedElement = await page.locator(':focus');
        const focusCount = await focusedElement.count();
        keyboardNavigable = focusCount > 0;
      } catch (error) {
        await validator.addIssue('keyboard_nav_error', 'Error testing keyboard navigation', { error: error.message });
      }
    }
    
    await validator.addTestResult('accessibility_aria', ariaLabelsFound, { message: 'ARIA labels found' });
    await validator.addTestResult('accessibility_alt_text', altTextPresent, { message: 'Alt text on images' });
    await validator.addTestResult('accessibility_keyboard', keyboardNavigable, { message: 'Keyboard navigation works' });
    
    await validator.takeScreenshot('accessibility-check', 'Accessibility validation');
  });

  test('Performance validation', async ({ page }) => {
    // Measure page load performance
    const startTime = Date.now();
    
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    const loadTimeAcceptable = loadTime < 5000; // 5 seconds
    
    await validator.addTestResult('performance_load_time', loadTimeAcceptable, { 
      loadTime: `${loadTime}ms`,
      threshold: '5000ms'
    });
    
    // Check for memory leaks by monitoring page metrics
    try {
      const metrics = await page.evaluate(() => {
        if ('memory' in performance) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          };
        }
        return null;
      });
      
      if (metrics) {
        const memoryUsage = (metrics.usedJSHeapSize / 1024 / 1024).toFixed(2);
        const memoryAcceptable = metrics.usedJSHeapSize < 50 * 1024 * 1024; // 50MB
        
        await validator.addTestResult('performance_memory', memoryAcceptable, {
          memoryUsage: `${memoryUsage}MB`,
          threshold: '50MB'
        });
      }
    } catch (error) {
      await validator.addIssue('performance_metrics_error', 'Could not measure performance metrics', { error: error.message });
    }
  });

  test('Error handling validation', async ({ page }) => {
    // Test error handling by checking console errors
    const consoleErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate and interact with the page
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(3000);
    
    // Try to click on various elements to trigger potential errors
    const posts = await page.locator('[data-testid="post-card"]');
    const postCount = await posts.count();
    
    if (postCount > 0) {
      try {
        // Expand a post
        const expandButton = await posts.first().locator('button, [role="button"]');
        const expandButtonCount = await expandButton.count();
        
        if (expandButtonCount > 0) {
          await expandButton.first().click();
          await page.waitForTimeout(1000);
        }
      } catch (error) {
        consoleErrors.push(`Interaction error: ${error.message}`);
      }
    }
    
    const noConsoleErrors = consoleErrors.length === 0;
    await validator.addTestResult('error_handling_console', noConsoleErrors, {
      errorCount: consoleErrors.length,
      errors: consoleErrors.slice(0, 5) // First 5 errors
    });
    
    if (consoleErrors.length > 0) {
      await validator.addIssue('console_errors_found', 'Console errors detected', { 
        errors: consoleErrors.slice(0, 10) 
      });
    }
    
    await validator.takeScreenshot('error-handling', 'Error handling validation');
  });
});

// Export validator for other tests
module.exports = { WebPreviewValidator };