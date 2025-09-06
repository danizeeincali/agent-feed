/**
 * Playwright E2E Tests for Link Preview Frontend Rendering
 * Focus: Visual rendering, user interactions, and responsive behavior
 */

import { test, expect } from '@playwright/test';

test.describe('Link Preview Rendering', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    await expect(page).toHaveTitle(/Agent Feed/);
  });

  test.describe('Basic Preview Rendering', () => {
    test('should render generic website previews correctly', async ({ page }) => {
      // Arrange - Enter a generic URL
      const testUrl = 'https://httpbin.org/html';
      
      // Act - Submit URL for preview
      await page.locator('[data-testid="url-input"]').fill(testUrl);
      await page.locator('[data-testid="submit-button"]').click();

      // Wait for preview to load
      await page.waitForSelector('[data-testid="link-preview"]', { timeout: 10000 });

      // Assert - Verify preview elements
      const preview = page.locator('[data-testid="link-preview"]');
      await expect(preview).toBeVisible();
      
      // Check for title
      const title = preview.locator('[data-testid="preview-title"]');
      await expect(title).toBeVisible();
      await expect(title).toHaveText(/httpbin/i);

      // Check for description
      const description = preview.locator('[data-testid="preview-description"]');
      await expect(description).toBeVisible();

      // Check for type indicator
      const typeIndicator = preview.locator('[data-testid="preview-type"]');
      await expect(typeIndicator).toHaveText('website');
    });

    test('should render YouTube video previews with video player', async ({ page }) => {
      // Arrange
      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      // Act
      await page.locator('[data-testid="url-input"]').fill(youtubeUrl);
      await page.locator('[data-testid="submit-button"]').click();

      // Wait for video preview
      await page.waitForSelector('[data-testid="video-preview"]', { timeout: 10000 });

      // Assert
      const videoPreview = page.locator('[data-testid="video-preview"]');
      await expect(videoPreview).toBeVisible();

      // Check video thumbnail
      const thumbnail = videoPreview.locator('[data-testid="video-thumbnail"]');
      await expect(thumbnail).toBeVisible();
      await expect(thumbnail).toHaveAttribute('src', /img\.youtube\.com/);

      // Check play button
      const playButton = videoPreview.locator('[data-testid="play-button"]');
      await expect(playButton).toBeVisible();

      // Check video title
      const videoTitle = videoPreview.locator('[data-testid="video-title"]');
      await expect(videoTitle).toBeVisible();

      // Check video metadata
      const videoAuthor = videoPreview.locator('[data-testid="video-author"]');
      await expect(videoAuthor).toBeVisible();
    });

    test('should render social media previews with platform indicators', async ({ page }) => {
      // Test data for different social platforms
      const socialUrls = [
        { 
          url: 'https://twitter.com/example/status/123',
          platform: 'twitter',
          icon: 'twitter-icon'
        },
        {
          url: 'https://linkedin.com/posts/example_post',
          platform: 'linkedin', 
          icon: 'linkedin-icon'
        }
      ];

      for (const { url, platform, icon } of socialUrls) {
        // Act
        await page.locator('[data-testid="url-input"]').clear();
        await page.locator('[data-testid="url-input"]').fill(url);
        await page.locator('[data-testid="submit-button"]').click();

        await page.waitForSelector('[data-testid="social-preview"]', { timeout: 10000 });

        // Assert
        const socialPreview = page.locator('[data-testid="social-preview"]');
        await expect(socialPreview).toBeVisible();

        // Check platform indicator
        const platformIcon = socialPreview.locator(`[data-testid="${icon}"]`);
        await expect(platformIcon).toBeVisible();

        // Check social preview styling
        await expect(socialPreview).toHaveClass(/social-preview/);
      }
    });
  });

  test.describe('Loading States and Animations', () => {
    test('should show loading skeleton while fetching previews', async ({ page }) => {
      // Arrange
      const testUrl = 'https://httpbin.org/delay/3'; // 3 second delay

      // Act
      await page.locator('[data-testid="url-input"]').fill(testUrl);
      await page.locator('[data-testid="submit-button"]').click();

      // Assert - Loading state should appear immediately
      const loadingSkeleton = page.locator('[data-testid="preview-loading"]');
      await expect(loadingSkeleton).toBeVisible();

      // Check loading animation
      await expect(loadingSkeleton).toHaveClass(/loading|skeleton/);

      // Verify loading elements
      const loadingTitle = loadingSkeleton.locator('[data-testid="loading-title"]');
      const loadingDescription = loadingSkeleton.locator('[data-testid="loading-description"]');
      
      await expect(loadingTitle).toBeVisible();
      await expect(loadingDescription).toBeVisible();

      // Wait for actual preview to replace loading state
      await page.waitForSelector('[data-testid="link-preview"]', { timeout: 10000 });
      await expect(loadingSkeleton).not.toBeVisible();
    });

    test('should animate preview appearance smoothly', async ({ page }) => {
      // Arrange
      const testUrl = 'https://httpbin.org/html';

      // Act
      await page.locator('[data-testid="url-input"]').fill(testUrl);
      await page.locator('[data-testid="submit-button"]').click();

      // Wait for loading to complete
      await page.waitForSelector('[data-testid="link-preview"]', { timeout: 10000 });

      // Assert - Check animation classes
      const preview = page.locator('[data-testid="link-preview"]');
      await expect(preview).toHaveClass(/fade-in|slide-in|animate/);

      // Verify smooth transition timing
      const animationDuration = await preview.evaluate(el => {
        const styles = getComputedStyle(el);
        return styles.transitionDuration || styles.animationDuration;
      });
      
      expect(animationDuration).toBeTruthy();
    });

    test('should show error states with retry options', async ({ page }) => {
      // Arrange - URL that will cause an error
      const errorUrl = 'https://this-domain-does-not-exist-12345.invalid';

      // Act
      await page.locator('[data-testid="url-input"]').fill(errorUrl);
      await page.locator('[data-testid="submit-button"]').click();

      // Wait for error state
      await page.waitForSelector('[data-testid="preview-error"]', { timeout: 10000 });

      // Assert
      const errorPreview = page.locator('[data-testid="preview-error"]');
      await expect(errorPreview).toBeVisible();

      // Check error message
      const errorMessage = errorPreview.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/Unable to fetch preview/);

      // Check retry button
      const retryButton = errorPreview.locator('[data-testid="retry-button"]');
      await expect(retryButton).toBeVisible();
      await expect(retryButton).toBeEnabled();

      // Test retry functionality
      await retryButton.click();
      
      // Should show loading state again
      await expect(page.locator('[data-testid="preview-loading"]')).toBeVisible();
    });
  });

  test.describe('Interactive Elements', () => {
    test('should handle video preview interactions', async ({ page }) => {
      // Arrange
      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      await page.locator('[data-testid="url-input"]').fill(youtubeUrl);
      await page.locator('[data-testid="submit-button"]').click();
      await page.waitForSelector('[data-testid="video-preview"]', { timeout: 10000 });

      // Act - Click play button
      const playButton = page.locator('[data-testid="play-button"]');
      await playButton.click();

      // Assert - Video player should appear
      const videoPlayer = page.locator('[data-testid="video-player"]');
      await expect(videoPlayer).toBeVisible();

      // Check video controls
      const pauseButton = page.locator('[data-testid="pause-button"]');
      await expect(pauseButton).toBeVisible();

      // Check volume control
      const volumeSlider = page.locator('[data-testid="volume-slider"]');
      await expect(volumeSlider).toBeVisible();

      // Check fullscreen button
      const fullscreenButton = page.locator('[data-testid="fullscreen-button"]');
      await expect(fullscreenButton).toBeVisible();
    });

    test('should handle preview sharing functionality', async ({ page }) => {
      // Arrange
      const testUrl = 'https://httpbin.org/html';
      
      await page.locator('[data-testid="url-input"]').fill(testUrl);
      await page.locator('[data-testid="submit-button"]').click();
      await page.waitForSelector('[data-testid="link-preview"]', { timeout: 10000 });

      // Act - Click share button
      const shareButton = page.locator('[data-testid="share-button"]');
      await shareButton.click();

      // Assert - Share modal should appear
      const shareModal = page.locator('[data-testid="share-modal"]');
      await expect(shareModal).toBeVisible();

      // Check share options
      const copyLinkButton = shareModal.locator('[data-testid="copy-link"]');
      await expect(copyLinkButton).toBeVisible();

      // Test copy functionality
      await copyLinkButton.click();
      
      // Check for success feedback
      const copyFeedback = shareModal.locator('[data-testid="copy-success"]');
      await expect(copyFeedback).toBeVisible();
      await expect(copyFeedback).toContainText(/Copied/);
    });

    test('should handle preview expansion/collapse', async ({ page }) => {
      // Arrange
      const testUrl = 'https://httpbin.org/html';
      
      await page.locator('[data-testid="url-input"]').fill(testUrl);
      await page.locator('[data-testid="submit-button"]').click();
      await page.waitForSelector('[data-testid="link-preview"]', { timeout: 10000 });

      const preview = page.locator('[data-testid="link-preview"]');
      const expandButton = preview.locator('[data-testid="expand-button"]');

      // Act - Expand preview
      await expandButton.click();

      // Assert - Preview should expand
      await expect(preview).toHaveClass(/expanded/);
      
      // Check for additional details
      const fullDescription = preview.locator('[data-testid="full-description"]');
      await expect(fullDescription).toBeVisible();

      // Act - Collapse preview
      const collapseButton = preview.locator('[data-testid="collapse-button"]');
      await collapseButton.click();

      // Assert - Preview should collapse
      await expect(preview).not.toHaveClass(/expanded/);
      await expect(fullDescription).not.toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt preview layout for mobile devices', async ({ page }) => {
      // Arrange - Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      const testUrl = 'https://httpbin.org/html';
      await page.locator('[data-testid="url-input"]').fill(testUrl);
      await page.locator('[data-testid="submit-button"]').click();
      await page.waitForSelector('[data-testid="link-preview"]', { timeout: 10000 });

      // Assert - Mobile layout
      const preview = page.locator('[data-testid="link-preview"]');
      await expect(preview).toHaveClass(/mobile|responsive/);

      // Check mobile-specific elements
      const mobileLayout = preview.locator('[data-testid="mobile-layout"]');
      await expect(mobileLayout).toBeVisible();

      // Verify touch-friendly controls
      const touchControls = preview.locator('[data-testid="touch-controls"]');
      await expect(touchControls).toBeVisible();
    });

    test('should adapt preview layout for tablet devices', async ({ page }) => {
      // Arrange - Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      const testUrl = 'https://httpbin.org/html';
      await page.locator('[data-testid="url-input"]').fill(testUrl);
      await page.locator('[data-testid="submit-button"]').click();
      await page.waitForSelector('[data-testid="link-preview"]', { timeout: 10000 });

      // Assert - Tablet layout
      const preview = page.locator('[data-testid="link-preview"]');
      await expect(preview).toHaveClass(/tablet|responsive/);

      // Check tablet-specific elements
      const tabletLayout = preview.locator('[data-testid="tablet-layout"]');
      await expect(tabletLayout).toBeVisible();
    });

    test('should maintain preview functionality across different screen sizes', async ({ page }) => {
      const screenSizes = [
        { width: 320, height: 568, name: 'mobile-small' },
        { width: 375, height: 667, name: 'mobile-medium' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1024, height: 768, name: 'desktop-small' },
        { width: 1920, height: 1080, name: 'desktop-large' }
      ];

      const testUrl = 'https://httpbin.org/html';

      for (const { width, height, name } of screenSizes) {
        // Arrange
        await page.setViewportSize({ width, height });

        // Act
        await page.locator('[data-testid="url-input"]').clear();
        await page.locator('[data-testid="url-input"]').fill(testUrl);
        await page.locator('[data-testid="submit-button"]').click();
        await page.waitForSelector('[data-testid="link-preview"]', { timeout: 10000 });

        // Assert - Core functionality should work on all sizes
        const preview = page.locator('[data-testid="link-preview"]');
        await expect(preview).toBeVisible();

        const title = preview.locator('[data-testid="preview-title"]');
        await expect(title).toBeVisible();

        // Take screenshot for visual regression testing
        await page.screenshot({ 
          path: `tests/link-preview/e2e/reports/screenshots/${name}-preview.png`,
          fullPage: true 
        });
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should be accessible with keyboard navigation', async ({ page }) => {
      // Arrange
      const testUrl = 'https://httpbin.org/html';

      // Act - Navigate using keyboard
      await page.locator('[data-testid="url-input"]').focus();
      await page.keyboard.type(testUrl);
      await page.keyboard.press('Tab'); // Move to submit button
      await page.keyboard.press('Enter'); // Submit

      await page.waitForSelector('[data-testid="link-preview"]', { timeout: 10000 });

      // Assert - Check focus management
      const preview = page.locator('[data-testid="link-preview"]');
      await expect(preview).toBeVisible();

      // Tab through interactive elements
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement.getAttribute('data-testid'));
      expect(['share-button', 'expand-button']).toContain(focusedElement);
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Arrange
      const testUrl = 'https://httpbin.org/html';
      
      await page.locator('[data-testid="url-input"]').fill(testUrl);
      await page.locator('[data-testid="submit-button"]').click();
      await page.waitForSelector('[data-testid="link-preview"]', { timeout: 10000 });

      // Assert - Check ARIA attributes
      const preview = page.locator('[data-testid="link-preview"]');
      await expect(preview).toHaveAttribute('role', 'article');
      await expect(preview).toHaveAttribute('aria-label', /Link preview/);

      // Check heading structure
      const title = preview.locator('[data-testid="preview-title"]');
      await expect(title).toHaveAttribute('role', 'heading');
      await expect(title).toHaveAttribute('aria-level', '2');

      // Check button accessibility
      const shareButton = preview.locator('[data-testid="share-button"]');
      await expect(shareButton).toHaveAttribute('aria-label', /Share link/);
    });

    test('should work with screen readers', async ({ page }) => {
      // Arrange
      const testUrl = 'https://httpbin.org/html';
      
      await page.locator('[data-testid="url-input"]').fill(testUrl);
      await page.locator('[data-testid="submit-button"]').click();
      await page.waitForSelector('[data-testid="link-preview"]', { timeout: 10000 });

      // Assert - Check screen reader announcements
      const preview = page.locator('[data-testid="link-preview"]');
      
      // Check for live region updates
      const liveRegion = page.locator('[data-testid="sr-announcements"]');
      await expect(liveRegion).toHaveAttribute('aria-live', 'polite');

      // Check for descriptive text
      const description = preview.locator('[data-testid="preview-description"]');
      await expect(description).toHaveAttribute('aria-describedby');
    });
  });

  test.describe('Performance', () => {
    test('should render previews within performance thresholds', async ({ page }) => {
      // Arrange
      const testUrl = 'https://httpbin.org/html';

      // Measure performance
      await page.goto('/', { waitUntil: 'networkidle' });
      const startTime = Date.now();

      // Act
      await page.locator('[data-testid="url-input"]').fill(testUrl);
      await page.locator('[data-testid="submit-button"]').click();
      await page.waitForSelector('[data-testid="link-preview"]', { timeout: 10000 });

      const endTime = Date.now();
      const renderTime = endTime - startTime;

      // Assert
      expect(renderTime).toBeLessThan(5000); // Should render within 5 seconds

      // Check for performance metrics
      const metrics = await page.evaluate(() => performance.getEntriesByType('navigation')[0]);
      expect(metrics.loadEventEnd - metrics.navigationStart).toBeLessThan(3000);
    });

    test('should handle multiple previews efficiently', async ({ page }) => {
      // Arrange
      const urls = [
        'https://httpbin.org/html',
        'https://httpbin.org/json',
        'https://httpbin.org/xml'
      ];

      const startTime = Date.now();

      // Act - Create multiple previews
      for (const [index, url] of urls.entries()) {
        await page.locator('[data-testid="url-input"]').clear();
        await page.locator('[data-testid="url-input"]').fill(url);
        await page.locator('[data-testid="submit-button"]').click();
        await page.waitForSelector(`[data-testid="link-preview-${index}"]`, { timeout: 10000 });
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Assert
      expect(totalTime).toBeLessThan(15000); // All previews within 15 seconds

      // Verify all previews are visible
      for (let i = 0; i < urls.length; i++) {
        const preview = page.locator(`[data-testid="link-preview-${i}"]`);
        await expect(preview).toBeVisible();
      }
    });
  });
});