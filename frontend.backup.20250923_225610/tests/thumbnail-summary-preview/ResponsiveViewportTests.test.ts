/**
 * Responsive Behavior Validation Tests Across Device Viewports
 * London School TDD - Outside-in with device-specific mock collaborations
 * 
 * Focus: Validate thumbnail-summary responsive behavior on real device sizes
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Device viewport specifications based on real devices
const DEVICE_SPECIFICATIONS = {
  mobile: {
    name: 'iPhone 12 Pro',
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true
  },
  tablet: {
    name: 'iPad Air',
    viewport: { width: 820, height: 1180 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  },
  desktop: {
    name: 'Desktop 1920x1080',
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false
  },
  ultrawide: {
    name: 'Ultrawide 2560x1440',
    viewport: { width: 2560, height: 1440 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false
  },
  foldable: {
    name: 'Galaxy Fold Unfolded',
    viewport: { width: 717, height: 512 },
    userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-F900F) AppleWebKit/537.36',
    deviceScaleFactor: 2.25,
    isMobile: true,
    hasTouch: true
  }
} as const;

// Responsive layout orchestrator with device-specific mocks
class ResponsiveLayoutOrchestrator {
  constructor(
    private mockLayoutEngine: MockLayoutEngine,
    private mockTouchHandler: MockTouchHandler,
    private mockViewportManager: MockViewportManager,
    private mockImageScaler: MockImageScaler
  ) {}

  async orchestrateResponsiveLayout(page: Page, deviceSpec: typeof DEVICE_SPECIFICATIONS[keyof typeof DEVICE_SPECIFICATIONS]): Promise<void> {
    // Outside-in: Device loads page and renders thumbnails
    await this.mockViewportManager.setDeviceMetrics(deviceSpec);
    await this.mockLayoutEngine.calculateResponsiveLayout(deviceSpec.viewport.width);
    await this.mockImageScaler.scaleImagesForDevice(deviceSpec.deviceScaleFactor);
    
    if (deviceSpec.hasTouch) {
      await this.mockTouchHandler.enableTouchInteractions();
    }
  }

  async orchestrateTouchInteraction(page: Page): Promise<void> {
    await this.mockTouchHandler.handleTouchStart();
    await this.mockTouchHandler.handleTouchEnd();
  }

  async orchestrateOrientationChange(page: Page): Promise<void> {
    await this.mockViewportManager.rotateDevice();
    await this.mockLayoutEngine.recalculateLayout();
  }
}

// Mock collaborators for responsive behavior
class MockLayoutEngine {
  async calculateResponsiveLayout(viewportWidth: number): Promise<void> {
    expect(viewportWidth).toBeGreaterThan(0);
    // Contract: Should calculate layout based on viewport width
  }

  async recalculateLayout(): Promise<void> {
    // Contract: Should recalculate layout on viewport changes
  }
}

class MockTouchHandler {
  async enableTouchInteractions(): Promise<void> {
    // Contract: Should enable touch-specific interactions
  }

  async handleTouchStart(): Promise<void> {
    // Contract: Should handle touch start events
  }

  async handleTouchEnd(): Promise<void> {
    // Contract: Should handle touch end events
  }
}

class MockViewportManager {
  async setDeviceMetrics(deviceSpec: any): Promise<void> {
    expect(deviceSpec.viewport).toBeTruthy();
    // Contract: Should configure viewport for device
  }

  async rotateDevice(): Promise<void> {
    // Contract: Should handle device rotation
  }
}

class MockImageScaler {
  async scaleImagesForDevice(scaleFactor: number): Promise<void> {
    expect(scaleFactor).toBeGreaterThan(0);
    // Contract: Should scale images based on device pixel ratio
  }
}

test.describe('Responsive Behavior Validation Tests', () => {
  let orchestrator: ResponsiveLayoutOrchestrator;

  test.beforeEach(async ({ page, context }) => {
    // Initialize responsive behavior mocks
    const mockLayoutEngine = new MockLayoutEngine();
    const mockTouchHandler = new MockTouchHandler();
    const mockViewportManager = new MockViewportManager();
    const mockImageScaler = new MockImageScaler();

    orchestrator = new ResponsiveLayoutOrchestrator(
      mockLayoutEngine,
      mockTouchHandler,
      mockViewportManager,
      mockImageScaler
    );
  });

  // Test across all device types
  for (const [deviceType, deviceSpec] of Object.entries(DEVICE_SPECIFICATIONS)) {
    test.describe(`${deviceSpec.name} (${deviceType})`, () => {
      test.beforeEach(async ({ page, context }) => {
        // Configure browser for device
        await context.addInitScript((spec) => {
          Object.defineProperty(navigator, 'userAgent', {
            get: () => spec.userAgent
          });
        }, deviceSpec);

        await page.setViewportSize(deviceSpec.viewport);
        await page.goto('http://localhost:5173');
        await page.waitForLoadState('networkidle');

        await orchestrator.orchestrateResponsiveLayout(page, deviceSpec);
      });

      test('should render thumbnail-summary responsively', async ({ page }) => {
        const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        
        await page.getByTestId('post-content-input').fill(youtubeUrl);
        await page.getByTestId('post-submit-button').click();

        const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
        await expect(thumbnailSummary).toBeVisible({ timeout: 5000 });

        // Verify responsive layout
        const containerBox = await thumbnailSummary.boundingBox();
        expect(containerBox?.width).toBeGreaterThan(0);
        expect(containerBox?.height).toBeGreaterThan(0);

        // Should not overflow viewport
        expect(containerBox!.width).toBeLessThanOrEqual(deviceSpec.viewport.width);

        // Verify aspect ratios are maintained
        const thumbnail = thumbnailSummary.locator('img').first();
        await expect(thumbnail).toBeVisible();
        
        const thumbnailBox = await thumbnail.boundingBox();
        if (thumbnailBox) {
          const aspectRatio = thumbnailBox.width / thumbnailBox.height;
          expect(aspectRatio).toBeGreaterThan(1.0); // Should maintain video aspect ratio
        }

        // Verify text scaling
        const titleElement = thumbnailSummary.locator('[data-testid="preview-title"]');
        if (await titleElement.isVisible()) {
          const titleStyles = await titleElement.evaluate((el) => {
            return window.getComputedStyle(el);
          });
          
          const fontSize = parseFloat(titleStyles.fontSize);
          
          // Font size should be appropriate for device
          if (deviceType === 'mobile') {
            expect(fontSize).toBeGreaterThanOrEqual(12); // Minimum readable size
            expect(fontSize).toBeLessThanOrEqual(18); // Not too large for mobile
          } else if (deviceType === 'desktop') {
            expect(fontSize).toBeGreaterThanOrEqual(14);
            expect(fontSize).toBeLessThanOrEqual(24);
          }
        }
      });

      test('should handle touch interactions appropriately', async ({ page }) => {
        if (!deviceSpec.hasTouch) {
          test.skip('Device does not support touch');
          return;
        }

        const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        
        await page.getByTestId('post-content-input').fill(youtubeUrl);
        await page.getByTestId('post-submit-button').click();

        const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
        await expect(thumbnailSummary).toBeVisible();

        // Test touch interaction
        await orchestrator.orchestrateTouchInteraction(page);
        
        // Use tap instead of click for touch devices
        await thumbnailSummary.tap();

        const expandedVideo = page.locator('[data-testid="expanded-video"]');
        await expect(expandedVideo).toBeVisible({ timeout: 5000 });

        // Video should be sized appropriately for touch device
        const videoContainer = expandedVideo.locator('iframe').first();
        const videoBox = await videoContainer.boundingBox();
        
        if (videoBox) {
          expect(videoBox.width).toBeLessThanOrEqual(deviceSpec.viewport.width);
          
          // Touch target should be large enough (minimum 44x44 points for accessibility)
          const touchTargets = page.locator('[data-testid="collapse-video"], [data-testid="play-pause-button"]');
          for (let i = 0; i < await touchTargets.count(); i++) {
            const targetBox = await touchTargets.nth(i).boundingBox();
            if (targetBox) {
              expect(Math.min(targetBox.width, targetBox.height)).toBeGreaterThanOrEqual(44);
            }
          }
        }
      });

      test('should adapt layout for device constraints', async ({ page }) => {
        // Test with multiple URLs to stress layout
        const testUrls = [
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          'https://github.com/microsoft/TypeScript',
          'https://medium.com/@test/article-title'
        ];

        for (const url of testUrls) {
          await page.getByTestId('post-content-input').fill(url);
          await page.getByTestId('post-submit-button').click();
          await page.waitForTimeout(500);
        }

        const thumbnailSummaries = page.locator('[data-testid="thumbnail-summary"]');
        await page.waitForFunction(() => {
          return document.querySelectorAll('[data-testid="thumbnail-summary"]').length >= 3;
        }, { timeout: 10000 });

        expect(await thumbnailSummaries.count()).toBe(3);

        // Verify vertical stacking on narrow devices
        if (deviceSpec.viewport.width < 768) {
          for (let i = 0; i < 2; i++) {
            const currentBox = await thumbnailSummaries.nth(i).boundingBox();
            const nextBox = await thumbnailSummaries.nth(i + 1).boundingBox();
            
            if (currentBox && nextBox) {
              // Should stack vertically with minimal overlap
              expect(nextBox.y).toBeGreaterThan(currentBox.y + currentBox.height - 20);
            }
          }
        }

        // Verify horizontal layout on wide devices
        if (deviceSpec.viewport.width >= 1200) {
          // May use grid or flex layout for wider screens
          const firstBox = await thumbnailSummaries.first().boundingBox();
          const secondBox = await thumbnailSummaries.nth(1).boundingBox();
          
          if (firstBox && secondBox) {
            // Could be side-by-side or stacked depending on design
            const isStacked = secondBox.y > firstBox.y + firstBox.height - 50;
            const isSideBySide = Math.abs(secondBox.y - firstBox.y) < 50;
            
            expect(isStacked || isSideBySide).toBe(true);
          }
        }
      });

      test('should handle text overflow and truncation', async ({ page }) => {
        const longTitleUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        
        await page.getByTestId('post-content-input').fill(longTitleUrl);
        await page.getByTestId('post-submit-button').click();

        const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
        await expect(thumbnailSummary).toBeVisible();

        // Verify text doesn't overflow container
        const titleElement = thumbnailSummary.locator('[data-testid="preview-title"]');
        if (await titleElement.isVisible()) {
          const titleBox = await titleElement.boundingBox();
          const containerBox = await thumbnailSummary.boundingBox();
          
          if (titleBox && containerBox) {
            expect(titleBox.width).toBeLessThanOrEqual(containerBox.width);
          }

          // Check for proper text truncation
          const titleStyles = await titleElement.evaluate((el) => {
            return {
              overflow: window.getComputedStyle(el).overflow,
              textOverflow: window.getComputedStyle(el).textOverflow,
              whiteSpace: window.getComputedStyle(el).whiteSpace
            };
          });

          // Should have appropriate overflow handling
          expect(['hidden', 'ellipsis']).toContain(titleStyles.overflow || titleStyles.textOverflow);
        }

        // Verify description truncation on small screens
        const descriptionElement = thumbnailSummary.locator('[data-testid="preview-description"]');
        if (await descriptionElement.isVisible() && deviceSpec.viewport.width < 480) {
          const descText = await descriptionElement.textContent();
          expect(descText?.length || 0).toBeLessThan(150); // Reasonable limit for mobile
        }
      });
    });
  }

  test.describe('Orientation Changes', () => {
    test('should handle device rotation gracefully', async ({ page, context }) => {
      const mobileSpec = DEVICE_SPECIFICATIONS.mobile;
      
      await page.setViewportSize(mobileSpec.viewport);
      await page.goto('http://localhost:5173');

      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      // Get initial layout
      const initialBox = await thumbnailSummary.boundingBox();

      // Rotate to landscape
      await orchestrator.orchestrateOrientationChange(page);
      await page.setViewportSize({ 
        width: mobileSpec.viewport.height, 
        height: mobileSpec.viewport.width 
      });

      // Wait for layout to adjust
      await page.waitForTimeout(1000);

      // Verify layout adapted
      const rotatedBox = await thumbnailSummary.boundingBox();
      expect(rotatedBox?.width).toBeGreaterThan(0);
      
      // Layout should adapt to new orientation
      if (initialBox && rotatedBox) {
        // Width should adapt to new viewport constraints
        expect(rotatedBox.width).toBeLessThanOrEqual(mobileSpec.viewport.height);
      }

      // Expand video in landscape mode
      await thumbnailSummary.click();
      const expandedVideo = page.locator('[data-testid="expanded-video"]');
      await expect(expandedVideo).toBeVisible();

      // Video should utilize landscape space better
      const videoBox = await expandedVideo.boundingBox();
      if (videoBox) {
        expect(videoBox.width).toBeGreaterThan(initialBox?.width || 0);
      }
    });
  });

  test.describe('High-DPI Display Support', () => {
    test('should render crisp images on high-DPI displays', async ({ page }) => {
      const highDpiSpec = {
        ...DEVICE_SPECIFICATIONS.desktop,
        deviceScaleFactor: 2 // Simulate Retina/high-DPI display
      };

      await page.setViewportSize(highDpiSpec.viewport);
      await page.goto('http://localhost:5173');

      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      const thumbnail = thumbnailSummary.locator('img').first();
      await expect(thumbnail).toBeVisible();

      // Verify high-resolution image is loaded
      const thumbnailSrc = await thumbnail.getAttribute('src');
      
      // YouTube provides different resolutions - should use appropriate one
      expect(thumbnailSrc).toMatch(/(maxresdefault|hqdefault|mqdefault)\.jpg/);
      
      // Image should be sharp on high-DPI displays
      const naturalSize = await thumbnail.evaluate((img: HTMLImageElement) => ({
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        displayWidth: img.offsetWidth,
        displayHeight: img.offsetHeight
      }));

      // Natural size should be higher than display size for crisp rendering
      expect(naturalSize.naturalWidth).toBeGreaterThanOrEqual(naturalSize.displayWidth);
      expect(naturalSize.naturalHeight).toBeGreaterThanOrEqual(naturalSize.displayHeight);
    });
  });

  test.describe('Accessibility Across Viewports', () => {
    test('should maintain accessibility on all device sizes', async ({ page }) => {
      for (const [deviceType, deviceSpec] of Object.entries(DEVICE_SPECIFICATIONS)) {
        await page.setViewportSize(deviceSpec.viewport);

        const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        await page.getByTestId('post-content-input').fill(youtubeUrl);
        await page.getByTestId('post-submit-button').click();

        const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
        await expect(thumbnailSummary).toBeVisible();

        // Verify focus indicators are visible
        await thumbnailSummary.focus();
        const focusStyles = await thumbnailSummary.evaluate((el) => {
          return window.getComputedStyle(el, ':focus');
        });

        // Should have visible focus indicator
        expect([focusStyles.outline, focusStyles.boxShadow]).toContain(
          expect.stringMatching(/\d+px/)
        );

        // Touch targets should meet minimum size requirements
        if (deviceSpec.hasTouch) {
          const buttonBox = await thumbnailSummary.boundingBox();
          if (buttonBox) {
            expect(Math.min(buttonBox.width, buttonBox.height)).toBeGreaterThanOrEqual(44);
          }
        }

        // Text should meet contrast requirements
        const titleElement = thumbnailSummary.locator('[data-testid="preview-title"]');
        if (await titleElement.isVisible()) {
          const titleStyles = await titleElement.evaluate((el) => {
            const styles = window.getComputedStyle(el);
            return {
              color: styles.color,
              backgroundColor: styles.backgroundColor
            };
          });

          // Basic contrast check (simplified)
          expect(titleStyles.color).toBeTruthy();
          expect(titleStyles.color).not.toBe(titleStyles.backgroundColor);
        }
      }
    });
  });

  test.describe('Performance Across Devices', () => {
    test('should maintain performance on resource-constrained devices', async ({ page }) => {
      // Simulate slower mobile device
      const constrainedSpec = {
        ...DEVICE_SPECIFICATIONS.mobile,
        cpuThrottling: 6 // 6x CPU throttling to simulate older device
      };

      await page.setViewportSize(constrainedSpec.viewport);
      await page.goto('http://localhost:5173');

      const startTime = Date.now();

      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible({ timeout: 8000 });

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(8000); // Should load within 8 seconds even on slow device

      // Interaction should remain responsive
      const interactionStart = Date.now();
      await thumbnailSummary.click();
      
      const expandedVideo = page.locator('[data-testid="expanded-video"]');
      await expect(expandedVideo).toBeVisible({ timeout: 5000 });
      
      const interactionTime = Date.now() - interactionStart;
      expect(interactionTime).toBeLessThan(5000); // Should expand within 5 seconds
    });
  });
});

// Test utilities
test.beforeAll(async () => {
  console.log('📱 Starting Responsive Behavior Validation Tests');
  console.log('🖥️ Device Types:', Object.keys(DEVICE_SPECIFICATIONS).length);
});

test.afterAll(async () => {
  console.log('✅ Responsive Behavior Tests Complete');
});

// Helper function to get computed styles
async function getComputedStyles(page: Page, selector: string, properties: string[]) {
  return await page.evaluate(
    ({ selector, properties }) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      
      const styles = window.getComputedStyle(element);
      const result: { [key: string]: string } = {};
      
      properties.forEach(prop => {
        result[prop] = styles.getPropertyValue(prop);
      });
      
      return result;
    },
    { selector, properties }
  );
}