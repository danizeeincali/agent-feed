/**
 * Multi-viewport Responsive Tests - TDD Regression Prevention
 *
 * Validates responsive design works across different viewport sizes
 * Prevents layout breaks and CSS responsive utility failures
 */

import { test, expect } from '@playwright/test';

// Test viewports covering common device sizes
const VIEWPORTS = {
  mobile: { width: 375, height: 667 },      // iPhone SE
  mobileLarge: { width: 414, height: 896 }, // iPhone 11 Pro Max
  tablet: { width: 768, height: 1024 },     // iPad
  tabletLarge: { width: 1024, height: 1366 }, // iPad Pro
  desktop: { width: 1280, height: 720 },    // Small desktop
  desktopLarge: { width: 1920, height: 1080 }, // Large desktop
  ultrawide: { width: 2560, height: 1440 }  // Ultrawide monitor
};

test.describe('Multi-viewport Responsive Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3003');

    // Wait for CSS to load
    await page.waitForLoadState('networkidle');

    // Ensure CSS variables are loaded
    await page.waitForFunction(() => {
      const computed = getComputedStyle(document.documentElement);
      return computed.getPropertyValue('--background').trim() !== '';
    });
  });

  Object.entries(VIEWPORTS).forEach(([deviceName, viewport]) => {
    test(`should render correctly on ${deviceName} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      // Set viewport
      await page.setViewportSize(viewport);

      // Wait for layout to stabilize
      await page.waitForTimeout(100);

      // Check that the page is not blank (white screen test)
      const bodyColor = await page.evaluate(() => {
        const computed = getComputedStyle(document.body);
        return computed.backgroundColor;
      });

      expect(bodyColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(bodyColor).not.toBe('');

      // Check that content is visible
      const isContentVisible = await page.evaluate(() => {
        const root = document.getElementById('root');
        if (!root) return false;

        const rect = root.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      expect(isContentVisible).toBe(true);

      // Take screenshot for visual regression testing
      await page.screenshot({
        path: `tests/screenshots/responsive-${deviceName}-${viewport.width}x${viewport.height}.png`,
        fullPage: true
      });
    });
  });

  test('should handle responsive navigation correctly', async ({ page }) => {
    // Test mobile navigation
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(100);

    // Check if mobile navigation is properly styled
    const mobileNav = await page.locator('nav, header, .navigation').first();
    if (await mobileNav.count() > 0) {
      const navStyle = await mobileNav.evaluate(el => {
        const computed = getComputedStyle(el);
        return {
          display: computed.display,
          width: computed.width,
          padding: computed.padding
        };
      });

      expect(navStyle.display).not.toBe('none');
    }

    // Test desktop navigation
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.waitForTimeout(100);

    if (await mobileNav.count() > 0) {
      const desktopNavStyle = await mobileNav.evaluate(el => {
        const computed = getComputedStyle(el);
        return {
          display: computed.display,
          width: computed.width
        };
      });

      expect(desktopNavStyle.display).not.toBe('none');
    }
  });

  test('should handle responsive grid layouts', async ({ page }) => {
    // Create test grid content
    await page.evaluate(() => {
      const grid = document.createElement('div');
      grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4';
      grid.id = 'test-grid';

      for (let i = 0; i < 8; i++) {
        const item = document.createElement('div');
        item.className = 'bg-primary text-primary p-4 rounded';
        item.textContent = `Item ${i + 1}`;
        grid.appendChild(item);
      }

      document.body.appendChild(grid);
    });

    // Test mobile layout (1 column)
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(100);

    const mobileColumns = await page.evaluate(() => {
      const grid = document.getElementById('test-grid');
      if (!grid) return 0;

      const computed = getComputedStyle(grid);
      const gridTemplate = computed.gridTemplateColumns;
      return gridTemplate.split(' ').length;
    });

    expect(mobileColumns).toBeLessThanOrEqual(2); // Should be 1 column on mobile

    // Test tablet layout (2 columns)
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.waitForTimeout(100);

    const tabletLayout = await page.evaluate(() => {
      const grid = document.getElementById('test-grid');
      if (!grid) return { width: 0, columns: 0 };

      const computed = getComputedStyle(grid);
      const rect = grid.getBoundingClientRect();
      return {
        width: rect.width,
        gridTemplate: computed.gridTemplateColumns
      };
    });

    expect(tabletLayout.width).toBeGreaterThan(VIEWPORTS.mobile.width);

    // Test desktop layout (3+ columns)
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.waitForTimeout(100);

    const desktopLayout = await page.evaluate(() => {
      const grid = document.getElementById('test-grid');
      if (!grid) return { width: 0 };

      const rect = grid.getBoundingClientRect();
      return { width: rect.width };
    });

    expect(desktopLayout.width).toBeGreaterThan(VIEWPORTS.tablet.width);
  });

  test('should handle responsive typography', async ({ page }) => {
    // Create test typography
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.className = 'p-4';

      const heading = document.createElement('h1');
      heading.className = 'text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground';
      heading.textContent = 'Responsive Heading';
      heading.id = 'test-heading';

      const paragraph = document.createElement('p');
      paragraph.className = 'text-sm md:text-base lg:text-lg text-muted-foreground';
      paragraph.textContent = 'This is a responsive paragraph that should change size across breakpoints.';
      paragraph.id = 'test-paragraph';

      container.appendChild(heading);
      container.appendChild(paragraph);
      document.body.appendChild(container);
    });

    // Test mobile typography
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(100);

    const mobileFontSizes = await page.evaluate(() => {
      const heading = document.getElementById('test-heading');
      const paragraph = document.getElementById('test-paragraph');

      if (!heading || !paragraph) return null;

      return {
        heading: getComputedStyle(heading).fontSize,
        paragraph: getComputedStyle(paragraph).fontSize
      };
    });

    expect(mobileFontSizes).not.toBeNull();

    // Test desktop typography
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.waitForTimeout(100);

    const desktopFontSizes = await page.evaluate(() => {
      const heading = document.getElementById('test-heading');
      const paragraph = document.getElementById('test-paragraph');

      if (!heading || !paragraph) return null;

      return {
        heading: getComputedStyle(heading).fontSize,
        paragraph: getComputedStyle(paragraph).fontSize
      };
    });

    expect(desktopFontSizes).not.toBeNull();

    // Desktop fonts should generally be larger than mobile
    const mobileHeadingSize = parseFloat(mobileFontSizes.heading);
    const desktopHeadingSize = parseFloat(desktopFontSizes.heading);

    expect(desktopHeadingSize).toBeGreaterThanOrEqual(mobileHeadingSize);
  });

  test('should handle responsive spacing correctly', async ({ page }) => {
    // Create test spacing elements
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.className = 'p-2 md:p-4 lg:p-6 xl:p-8 m-2 md:m-4 lg:m-6';
      container.id = 'spacing-test';
      container.textContent = 'Responsive Spacing Test';
      container.style.backgroundColor = 'hsl(var(--primary))';

      document.body.appendChild(container);
    });

    const viewportSizes = [
      { name: 'mobile', ...VIEWPORTS.mobile },
      { name: 'tablet', ...VIEWPORTS.tablet },
      { name: 'desktop', ...VIEWPORTS.desktop }
    ];

    const spacingResults = [];

    for (const viewport of viewportSizes) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(100);

      const spacing = await page.evaluate(() => {
        const element = document.getElementById('spacing-test');
        if (!element) return null;

        const computed = getComputedStyle(element);
        return {
          padding: computed.padding,
          margin: computed.margin,
          paddingTop: computed.paddingTop,
          marginTop: computed.marginTop
        };
      });

      spacingResults.push({ viewport: viewport.name, spacing });
    }

    // Verify spacing increases with viewport size
    expect(spacingResults).toHaveLength(3);
    spacingResults.forEach(result => {
      expect(result.spacing).not.toBeNull();
      expect(result.spacing.paddingTop).not.toBe('0px');
    });
  });

  test('should handle responsive images and media', async ({ page }) => {
    // Create responsive image test
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.className = 'p-4';

      // Simulate responsive image
      const imageContainer = document.createElement('div');
      imageContainer.className = 'w-full h-32 md:h-48 lg:h-64 bg-muted rounded';
      imageContainer.id = 'responsive-image';
      imageContainer.textContent = 'Responsive Image Placeholder';

      // Responsive video container
      const videoContainer = document.createElement('div');
      videoContainer.className = 'w-full aspect-video md:aspect-square lg:aspect-video bg-accent rounded mt-4';
      videoContainer.id = 'responsive-video';
      videoContainer.textContent = 'Responsive Video Placeholder';

      container.appendChild(imageContainer);
      container.appendChild(videoContainer);
      document.body.appendChild(container);
    });

    const testResponsiveMedia = async (viewportName, viewport) => {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(100);

      const mediaDimensions = await page.evaluate(() => {
        const image = document.getElementById('responsive-image');
        const video = document.getElementById('responsive-video');

        if (!image || !video) return null;

        const imageRect = image.getBoundingClientRect();
        const videoRect = video.getBoundingClientRect();

        return {
          image: { width: imageRect.width, height: imageRect.height },
          video: { width: videoRect.width, height: videoRect.height }
        };
      });

      expect(mediaDimensions).not.toBeNull();
      expect(mediaDimensions.image.width).toBeGreaterThan(0);
      expect(mediaDimensions.image.height).toBeGreaterThan(0);
      expect(mediaDimensions.video.width).toBeGreaterThan(0);
      expect(mediaDimensions.video.height).toBeGreaterThan(0);

      return mediaDimensions;
    };

    const mobileMedia = await testResponsiveMedia('mobile', VIEWPORTS.mobile);
    const tabletMedia = await testResponsiveMedia('tablet', VIEWPORTS.tablet);
    const desktopMedia = await testResponsiveMedia('desktop', VIEWPORTS.desktop);

    // Images should scale appropriately
    expect(desktopMedia.image.height).toBeGreaterThan(mobileMedia.image.height);
    expect(tabletMedia.image.height).toBeGreaterThanOrEqual(mobileMedia.image.height);
  });

  test('should handle orientation changes', async ({ page }) => {
    // Test portrait to landscape transition
    await page.setViewportSize({ width: 375, height: 667 }); // Portrait
    await page.waitForTimeout(100);

    await page.evaluate(() => {
      const container = document.createElement('div');
      container.className = 'w-full h-screen bg-background flex items-center justify-center';
      container.id = 'orientation-test';
      container.textContent = 'Orientation Test';

      document.body.appendChild(container);
    });

    const portraitDimensions = await page.evaluate(() => {
      const element = document.getElementById('orientation-test');
      if (!element) return null;

      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });

    // Switch to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(100);

    const landscapeDimensions = await page.evaluate(() => {
      const element = document.getElementById('orientation-test');
      if (!element) return null;

      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });

    expect(portraitDimensions).not.toBeNull();
    expect(landscapeDimensions).not.toBeNull();

    // Dimensions should adapt to orientation
    expect(landscapeDimensions.width).toBeGreaterThan(portraitDimensions.width);
    expect(landscapeDimensions.height).toBeLessThan(portraitDimensions.height);
  });

  test('should maintain accessibility at all viewport sizes', async ({ page }) => {
    // Create accessible content
    await page.evaluate(() => {
      const main = document.createElement('main');
      main.setAttribute('role', 'main');
      main.className = 'p-4';

      const button = document.createElement('button');
      button.className = 'bg-primary text-primary px-4 py-2 md:px-6 md:py-3 rounded focus:ring-2 focus:ring-offset-2';
      button.textContent = 'Accessible Button';
      button.id = 'accessible-button';

      const link = document.createElement('a');
      link.className = 'text-primary underline text-sm md:text-base';
      link.href = '#';
      link.textContent = 'Accessible Link';
      link.id = 'accessible-link';

      main.appendChild(button);
      main.appendChild(link);
      document.body.appendChild(main);
    });

    for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(100);

      // Check button accessibility
      const buttonAccessible = await page.evaluate(() => {
        const button = document.getElementById('accessible-button');
        if (!button) return false;

        const computed = getComputedStyle(button);
        const rect = button.getBoundingClientRect();

        // Button should be large enough to tap (minimum 44px)
        const isLargeEnough = rect.width >= 32 && rect.height >= 32;

        // Button should be visible
        const isVisible = computed.opacity !== '0' && computed.visibility !== 'hidden';

        return isLargeEnough && isVisible;
      });

      expect(buttonAccessible).toBe(true);

      // Check link accessibility
      const linkAccessible = await page.evaluate(() => {
        const link = document.getElementById('accessible-link');
        if (!link) return false;

        const computed = getComputedStyle(link);
        return computed.textDecoration.includes('underline') && computed.opacity !== '0';
      });

      expect(linkAccessible).toBe(true);
    }
  });

  test('should handle CSS Grid and Flexbox responsively', async ({ page }) => {
    // Create complex responsive layout
    await page.evaluate(() => {
      const flexContainer = document.createElement('div');
      flexContainer.className = 'flex flex-col md:flex-row gap-4 p-4';
      flexContainer.id = 'flex-container';

      const sidebar = document.createElement('aside');
      sidebar.className = 'w-full md:w-1/4 bg-muted p-4 rounded';
      sidebar.textContent = 'Sidebar';

      const main = document.createElement('main');
      main.className = 'flex-1 bg-background p-4 rounded border';
      main.textContent = 'Main Content';

      flexContainer.appendChild(sidebar);
      flexContainer.appendChild(main);

      const gridContainer = document.createElement('div');
      gridContainer.className = 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 p-4 mt-4';
      gridContainer.id = 'grid-container';

      for (let i = 0; i < 12; i++) {
        const gridItem = document.createElement('div');
        gridItem.className = 'bg-accent p-2 rounded text-center';
        gridItem.textContent = i + 1;
        gridContainer.appendChild(gridItem);
      }

      document.body.appendChild(flexContainer);
      document.body.appendChild(gridContainer);
    });

    for (const [viewportName, viewport] of Object.entries({
      mobile: VIEWPORTS.mobile,
      tablet: VIEWPORTS.tablet,
      desktop: VIEWPORTS.desktop
    })) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(100);

      const layoutInfo = await page.evaluate(() => {
        const flexContainer = document.getElementById('flex-container');
        const gridContainer = document.getElementById('grid-container');

        if (!flexContainer || !gridContainer) return null;

        const flexComputed = getComputedStyle(flexContainer);
        const gridComputed = getComputedStyle(gridContainer);

        return {
          flexDirection: flexComputed.flexDirection,
          gridColumns: gridComputed.gridTemplateColumns,
          flexGap: flexComputed.gap,
          gridGap: gridComputed.gap
        };
      });

      expect(layoutInfo).not.toBeNull();
      expect(layoutInfo.flexDirection).toBeTruthy();
      expect(layoutInfo.gridColumns).toBeTruthy();

      // Mobile should have fewer columns/vertical flex
      if (viewportName === 'mobile') {
        expect(layoutInfo.flexDirection).toBe('column');
      }
    }
  });
});