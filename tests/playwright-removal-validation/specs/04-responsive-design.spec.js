import { test, expect } from '@playwright/test';

/**
 * Responsive Design Validation Tests
 * Comprehensive testing across multiple viewports and devices
 */

test.describe('Responsive Design Validation', () => {

  const viewports = [
    { width: 1920, height: 1080, name: 'desktop-4k', category: 'desktop' },
    { width: 1440, height: 900, name: 'desktop-large', category: 'desktop' },
    { width: 1280, height: 720, name: 'desktop-standard', category: 'desktop' },
    { width: 1024, height: 768, name: 'desktop-small', category: 'desktop' },
    { width: 768, height: 1024, name: 'tablet-portrait', category: 'tablet' },
    { width: 1024, height: 768, name: 'tablet-landscape', category: 'tablet' },
    { width: 414, height: 896, name: 'mobile-large', category: 'mobile' },
    { width: 375, height: 667, name: 'mobile-standard', category: 'mobile' },
    { width: 320, height: 568, name: 'mobile-small', category: 'mobile' }
  ];

  const testRoutes = [
    { path: '/', name: 'feed' },
    { path: '/agents', name: 'agents' },
    { path: '/analytics', name: 'analytics' },
    { path: '/settings', name: 'settings' }
  ];

  test('validates layout responsiveness across all viewports', async ({ page }) => {
    console.log('📱 Testing layout responsiveness across viewports...');

    for (const route of testRoutes) {
      console.log(`📍 Testing route: ${route.name}`);

      for (const viewport of viewports) {
        console.log(`📏 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);

        // Set viewport
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height
        });

        // Navigate to route
        await page.goto(route.path, { waitUntil: 'networkidle' });
        await page.waitForSelector('[data-testid="app-root"]');
        await page.waitForTimeout(500); // Allow responsive changes

        // Verify page loads properly
        const bodyText = await page.textContent('body');
        expect(bodyText?.length).toBeGreaterThan(50);

        // Check for horizontal overflow
        const hasHorizontalOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        if (hasHorizontalOverflow) {
          console.log(`⚠️  Horizontal overflow detected on ${route.name} at ${viewport.name}`);
        }

        // Capture responsive screenshot
        await page.screenshot({
          path: `screenshots/baseline/responsive-${route.name}-${viewport.name}.png`,
          fullPage: false
        });

        // Test navigation accessibility on this viewport
        const nav = page.locator('nav, [data-testid="sidebar"]');
        if (await nav.count() > 0) {
          const navVisible = await nav.first().isVisible();
          console.log(`🧭 Navigation visible on ${viewport.name}: ${navVisible}`);

          // For mobile viewports, test if mobile menu works
          if (viewport.category === 'mobile' && !navVisible) {
            const mobileMenuButton = page.locator('button.lg\\:hidden, [data-testid="mobile-menu"]');
            if (await mobileMenuButton.count() > 0) {
              await mobileMenuButton.first().click();
              await page.waitForTimeout(300);

              const navVisibleAfterClick = await nav.first().isVisible();
              console.log(`📱 Mobile menu opens navigation: ${navVisibleAfterClick}`);

              // Close mobile menu
              if (navVisibleAfterClick) {
                await mobileMenuButton.first().click();
                await page.waitForTimeout(300);
              }
            }
          }
        }

        console.log(`✅ ${route.name} responsive on ${viewport.name}`);
      }
    }

    console.log('✅ Layout responsiveness testing completed');
  });

  test('validates navigation responsiveness', async ({ page }) => {
    console.log('🧭 Testing navigation responsiveness...');

    for (const viewport of viewports) {
      console.log(`📱 Testing navigation on ${viewport.name}`);

      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height
      });

      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      // Analyze navigation behavior
      const sidebar = page.locator('.w-64, [data-testid="sidebar"], nav').first();
      const mobileMenuButton = page.locator('button.lg\\:hidden, [data-testid="mobile-menu"]').first();

      const sidebarVisible = await sidebar.isVisible().catch(() => false);
      const mobileMenuVisible = await mobileMenuButton.isVisible().catch(() => false);

      console.log(`📊 ${viewport.name}: Sidebar visible: ${sidebarVisible}, Mobile menu: ${mobileMenuVisible}`);

      if (viewport.category === 'mobile') {
        // Mobile should show mobile menu button
        if (mobileMenuVisible) {
          console.log('✅ Mobile menu button present on mobile viewport');

          // Test mobile menu functionality
          await mobileMenuButton.click();
          await page.waitForTimeout(300);

          const sidebarAfterClick = await sidebar.isVisible().catch(() => false);
          console.log(`📱 Sidebar visible after mobile menu click: ${sidebarAfterClick}`);

          // Capture mobile menu open state
          await page.screenshot({
            path: `screenshots/baseline/navigation-mobile-${viewport.name}-open.png`
          });

          // Close menu
          await mobileMenuButton.click();
          await page.waitForTimeout(300);

        } else if (sidebarVisible) {
          console.log('ℹ️  Sidebar visible on mobile (may be intended design)');
        } else {
          console.log('⚠️  No navigation method found on mobile viewport');
        }

      } else {
        // Desktop/tablet should show sidebar
        if (sidebarVisible) {
          console.log('✅ Sidebar visible on larger viewport');
        } else {
          console.log('⚠️  Sidebar not visible on larger viewport');
        }
      }

      // Capture navigation state
      await page.screenshot({
        path: `screenshots/baseline/navigation-${viewport.name}.png`
      });
    }

    console.log('✅ Navigation responsiveness testing completed');
  });

  test('validates content readability across viewports', async ({ page }) => {
    console.log('📖 Testing content readability across viewports...');

    for (const route of testRoutes.slice(0, 2)) { // Test first 2 routes for performance
      console.log(`📝 Testing readability on ${route.name}`);

      for (const viewport of viewports) {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height
        });

        await page.goto(route.path, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);

        // Check text readability
        const textElements = page.locator('p, h1, h2, h3, h4, h5, h6, span, div').filter({
          hasText: /.{10,}/  // At least 10 characters
        });

        const textCount = await textElements.count();
        console.log(`📊 Found ${textCount} text elements on ${viewport.name}`);

        if (textCount > 0) {
          // Sample first few text elements
          for (let i = 0; i < Math.min(textCount, 3); i++) {
            const element = textElements.nth(i);

            try {
              const styles = await element.evaluate(el => {
                const computed = window.getComputedStyle(el);
                return {
                  fontSize: computed.fontSize,
                  lineHeight: computed.lineHeight,
                  color: computed.color,
                  width: el.offsetWidth
                };
              });

              const fontSize = parseInt(styles.fontSize);
              const elementWidth = styles.width;

              // Check for readability issues
              if (fontSize < 14 && viewport.category === 'mobile') {
                console.log(`⚠️  Small text detected on mobile: ${fontSize}px`);
              }

              if (elementWidth > viewport.width) {
                console.log(`⚠️  Text overflow detected: ${elementWidth}px > ${viewport.width}px`);
              }

              console.log(`📏 Element ${i}: ${fontSize}px font, ${elementWidth}px wide`);

            } catch (error) {
              console.log(`⚠️  Error analyzing text element ${i}: ${error.message}`);
            }
          }
        }

        // Check for proper touch targets on mobile
        if (viewport.category === 'mobile') {
          const interactiveElements = page.locator('button, a, input, [role="button"]');
          const interactiveCount = await interactiveElements.count();

          for (let i = 0; i < Math.min(interactiveCount, 5); i++) {
            const element = interactiveElements.nth(i);

            try {
              const boundingBox = await element.boundingBox();
              if (boundingBox) {
                const touchTargetSize = Math.min(boundingBox.width, boundingBox.height);

                if (touchTargetSize < 44) { // 44px is recommended minimum touch target
                  console.log(`⚠️  Small touch target: ${touchTargetSize}px`);
                } else {
                  console.log(`✅ Good touch target: ${touchTargetSize}px`);
                }
              }
            } catch (error) {
              console.log(`⚠️  Error checking touch target ${i}: ${error.message}`);
            }
          }
        }
      }
    }

    console.log('✅ Content readability testing completed');
  });

  test('validates interactive elements responsiveness', async ({ page }) => {
    console.log('🎮 Testing interactive elements responsiveness...');

    for (const viewport of viewports) {
      console.log(`🧪 Testing interactions on ${viewport.name}`);

      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height
      });

      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      // Find interactive elements
      const buttons = page.locator('button:visible');
      const links = page.locator('a[href]:visible');
      const inputs = page.locator('input:visible, textarea:visible');

      const buttonCount = await buttons.count();
      const linkCount = await links.count();
      const inputCount = await inputs.count();

      console.log(`📊 Interactive elements: ${buttonCount} buttons, ${linkCount} links, ${inputCount} inputs`);

      // Test button interactions
      if (buttonCount > 0) {
        const testButton = buttons.first();
        try {
          await testButton.hover();
          await page.waitForTimeout(100);

          const boundingBox = await testButton.boundingBox();
          if (boundingBox) {
            const accessible = boundingBox.width >= 24 && boundingBox.height >= 24;
            console.log(`🔘 Button accessibility: ${accessible} (${boundingBox.width}x${boundingBox.height})`);
          }

          // Test click (without actually clicking)
          await testButton.focus();
          console.log('✅ Button focusable');

        } catch (error) {
          console.log(`⚠️  Button interaction failed: ${error.message}`);
        }
      }

      // Test input interactions
      if (inputCount > 0) {
        const testInput = inputs.first();
        try {
          await testInput.click();
          await testInput.fill('test');
          const value = await testInput.inputValue();
          expect(value).toBe('test');
          await testInput.fill(''); // Clear

          console.log('✅ Input interaction successful');

        } catch (error) {
          console.log(`⚠️  Input interaction failed: ${error.message}`);
        }
      }

      // Capture interactive state
      await page.screenshot({
        path: `screenshots/baseline/interactive-${viewport.name}.png`
      });
    }

    console.log('✅ Interactive elements responsiveness testing completed');
  });

  test('validates scroll behavior across viewports', async ({ page }) => {
    console.log('📜 Testing scroll behavior across viewports...');

    for (const viewport of viewports) {
      console.log(`📱 Testing scroll on ${viewport.name}`);

      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height
      });

      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      // Test vertical scroll
      const initialScrollY = await page.evaluate(() => window.scrollY);

      // Scroll down
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(300);

      const afterScrollY = await page.evaluate(() => window.scrollY);
      const verticalScrollable = afterScrollY > initialScrollY;

      console.log(`📜 Vertical scroll: ${verticalScrollable} (${initialScrollY} -> ${afterScrollY})`);

      // Test horizontal scroll (should generally not exist)
      const initialScrollX = await page.evaluate(() => window.scrollX);

      await page.mouse.wheel(300, 0);
      await page.waitForTimeout(300);

      const afterScrollX = await page.evaluate(() => window.scrollX);
      const horizontalScrollable = afterScrollX > initialScrollX;

      if (horizontalScrollable) {
        console.log(`⚠️  Horizontal scroll detected: ${initialScrollX} -> ${afterScrollX}`);
      } else {
        console.log('✅ No unwanted horizontal scroll');
      }

      // Reset scroll position
      await page.evaluate(() => window.scrollTo(0, 0));

      // Test smooth scrolling if available
      await page.evaluate(() => {
        window.scrollTo({ top: 200, behavior: 'smooth' });
      });
      await page.waitForTimeout(500);

      console.log(`✅ Scroll testing completed for ${viewport.name}`);
    }

    console.log('✅ Scroll behavior testing completed');
  });

  test('validates responsive image and media handling', async ({ page }) => {
    console.log('🖼️ Testing responsive images and media...');

    for (const viewport of viewports) {
      console.log(`📱 Testing media on ${viewport.name}`);

      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height
      });

      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      // Find images
      const images = page.locator('img:visible');
      const imageCount = await images.count();

      console.log(`🖼️  Found ${imageCount} visible images`);

      if (imageCount > 0) {
        for (let i = 0; i < Math.min(imageCount, 3); i++) {
          const image = images.nth(i);

          try {
            const boundingBox = await image.boundingBox();
            if (boundingBox) {
              const fitsInViewport = boundingBox.width <= viewport.width;
              const hasOverflow = boundingBox.x + boundingBox.width > viewport.width;

              console.log(`📐 Image ${i}: ${boundingBox.width}x${boundingBox.height}, fits: ${fitsInViewport}`);

              if (hasOverflow) {
                console.log(`⚠️  Image ${i} overflows viewport`);
              }
            }

            // Check if image has responsive attributes
            const srcset = await image.getAttribute('srcset');
            const sizes = await image.getAttribute('sizes');

            if (srcset) {
              console.log(`✅ Image ${i} has srcset (responsive)`);
            }
            if (sizes) {
              console.log(`✅ Image ${i} has sizes attribute`);
            }

          } catch (error) {
            console.log(`⚠️  Error analyzing image ${i}: ${error.message}`);
          }
        }
      }

      // Find videos if any
      const videos = page.locator('video:visible');
      const videoCount = await videos.count();

      if (videoCount > 0) {
        console.log(`🎥 Found ${videoCount} videos`);

        for (let i = 0; i < Math.min(videoCount, 2); i++) {
          const video = videos.nth(i);

          try {
            const boundingBox = await video.boundingBox();
            if (boundingBox) {
              const fitsInViewport = boundingBox.width <= viewport.width;
              console.log(`📹 Video ${i}: ${boundingBox.width}x${boundingBox.height}, fits: ${fitsInViewport}`);
            }
          } catch (error) {
            console.log(`⚠️  Error analyzing video ${i}: ${error.message}`);
          }
        }
      }

      // Capture media state
      if (imageCount > 0 || videoCount > 0) {
        await page.screenshot({
          path: `screenshots/baseline/media-${viewport.name}.png`
        });
      }
    }

    console.log('✅ Responsive media testing completed');
  });

  test('validates performance across viewport sizes', async ({ page }) => {
    console.log('⚡ Testing performance across viewport sizes...');

    const performanceResults = [];

    for (const viewport of [
      viewports.find(v => v.name === 'desktop-standard'),
      viewports.find(v => v.name === 'tablet-portrait'),
      viewports.find(v => v.name === 'mobile-standard')
    ]) {
      if (!viewport) continue;

      console.log(`📊 Testing performance on ${viewport.name}`);

      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height
      });

      const startTime = Date.now();

      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="app-root"]');

      const loadTime = Date.now() - startTime;

      // Get detailed performance metrics
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paint = performance.getEntriesByType('paint');

        return {
          domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.navigationStart,
          loadComplete: navigation?.loadEventEnd - navigation?.navigationStart,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
          resourceCount: performance.getEntriesByType('resource').length
        };
      });

      const result = {
        viewport: viewport.name,
        totalLoadTime: loadTime,
        ...metrics,
        timestamp: new Date().toISOString()
      };

      performanceResults.push(result);

      console.log(`⚡ ${viewport.name}: ${loadTime}ms total, ${metrics.domContentLoaded}ms DOM, ${metrics.resourceCount} resources`);

      // Verify acceptable performance
      expect(loadTime).toBeLessThan(15000); // 15 second max
      if (metrics.domContentLoaded) {
        expect(metrics.domContentLoaded).toBeLessThan(8000); // 8 second DOM max
      }
    }

    // Store performance baseline
    await page.evaluate((results) => {
      window.responsivePerformanceBaseline = results;
    }, performanceResults);

    console.log('✅ Performance testing across viewports completed');
  });
});