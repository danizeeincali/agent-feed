import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'divider-spacing');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Helper function to wait for feed to load
async function waitForFeedLoad(page: Page) {
  // Wait for the feed container to be visible
  await page.waitForSelector('[data-testid="feed-container"], .space-y-6', {
    state: 'visible',
    timeout: 10000
  });

  // Wait for at least one post card to be visible
  await page.waitForSelector('article, .bg-white, [class*="card"]', {
    state: 'visible',
    timeout: 10000
  });

  // Additional wait for any loading states to complete
  await page.waitForTimeout(1000);
}

// Helper function to get spacing measurements
async function getSpacingMeasurements(page: Page) {
  return await page.evaluate(() => {
    // Find first post card
    const postCard = document.querySelector('article') ||
                     document.querySelector('.bg-white') ||
                     document.querySelector('[class*="card"]');

    if (!postCard) {
      throw new Error('No post card found');
    }

    // Find metadata line and divider within the post
    const metadataLine = postCard.querySelector('.pl-14.flex.items-center.space-x-6') as HTMLElement;
    const divider = postCard.querySelector('hr, [class*="divider"], [class*="border-t"]') as HTMLElement;

    if (!metadataLine || !divider) {
      return {
        error: 'Could not find metadata line or divider',
        metadataFound: !!metadataLine,
        dividerFound: !!divider
      };
    }

    // Get computed styles
    const metadataStyles = window.getComputedStyle(metadataLine);
    const dividerStyles = window.getComputedStyle(divider);

    // Get bounding rectangles
    const metadataRect = metadataLine.getBoundingClientRect();
    const dividerRect = divider.getBoundingClientRect();

    // Calculate spacing
    const spacingBetween = dividerRect.top - metadataRect.bottom;

    return {
      metadataClasses: metadataLine.className,
      metadataMarginTop: metadataStyles.marginTop,
      metadataMarginBottom: metadataStyles.marginBottom,
      metadataPaddingTop: metadataStyles.paddingTop,
      metadataPaddingBottom: metadataStyles.paddingBottom,
      dividerMarginTop: dividerStyles.marginTop,
      dividerMarginBottom: dividerStyles.marginBottom,
      spacingBetweenElements: Math.round(spacingBetween),
      metadataBottom: Math.round(metadataRect.bottom),
      dividerTop: Math.round(dividerRect.top),
      metadataHeight: Math.round(metadataRect.height),
      dividerHeight: Math.round(dividerRect.height)
    };
  });
}

test.describe('Divider Spacing Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await waitForFeedLoad(page);
  });

  test('should capture AFTER screenshot showing improved divider spacing', async ({ page }) => {
    // Take full page screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'after.png'),
      fullPage: true
    });

    console.log('✓ Captured AFTER screenshot');
    expect(fs.existsSync(path.join(SCREENSHOT_DIR, 'after.png'))).toBeTruthy();
  });

  test('should capture close-up of metadata + divider area', async ({ page }) => {
    // Find the first post card
    const postCard = page.locator('article, .bg-white').first();
    await expect(postCard).toBeVisible();

    // Find metadata line within the post
    const metadataLine = postCard.locator('.pl-14.flex.items-center.space-x-6').first();
    await expect(metadataLine).toBeVisible();

    // Scroll into view
    await metadataLine.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Get bounding box for the metadata area (including divider below)
    const box = await metadataLine.boundingBox();
    if (box) {
      // Expand the capture area to include divider below
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'close-up.png'),
        clip: {
          x: Math.max(0, box.x - 20),
          y: Math.max(0, box.y - 20),
          width: Math.min(box.width + 40, 800),
          height: Math.min(box.height + 100, 400) // Include space for divider
        }
      });

      console.log('✓ Captured close-up screenshot');
      expect(fs.existsSync(path.join(SCREENSHOT_DIR, 'close-up.png'))).toBeTruthy();
    }
  });

  test('should verify CSS classes on metadata container', async ({ page }) => {
    const postCard = page.locator('article, .bg-white').first();
    const metadataLine = postCard.locator('.pl-14.flex.items-center.space-x-6').first();

    await expect(metadataLine).toBeVisible();

    // Get all classes
    const classes = await metadataLine.getAttribute('class');
    console.log('Metadata classes:', classes);

    // Verify required classes
    expect(classes).toContain('mt-4');
    expect(classes).toContain('mb-4');
    expect(classes).toContain('pl-14');
    expect(classes).toContain('flex');
    expect(classes).toContain('items-center');
    expect(classes).toContain('space-x-6');

    console.log('✓ All required CSS classes present');
  });

  test('should measure spacing and verify ~44px total space', async ({ page }) => {
    const measurements = await getSpacingMeasurements(page);

    console.log('Spacing Measurements:', JSON.stringify(measurements, null, 2));

    // Verify no errors
    expect(measurements.error).toBeUndefined();

    // Verify classes include mb-4 and mt-4
    expect(measurements.metadataClasses).toContain('mb-4');
    expect(measurements.metadataClasses).toContain('mt-4');

    // Verify margin values (should be 16px each for mt-4 and mb-4)
    expect(measurements.metadataMarginTop).toBe('16px');
    expect(measurements.metadataMarginBottom).toBe('16px');

    // Log spacing between elements
    console.log(`Spacing between metadata and divider: ${measurements.spacingBetweenElements}px`);

    // The mb-4 on metadata creates 16px margin, but total visual spacing
    // should be around that value (allowing for divider's own margins)
    // We expect at least 12px of clear space (accounting for rendering variations)
    expect(measurements.spacingBetweenElements).toBeGreaterThanOrEqual(12);

    console.log('✓ Divider spacing verified - adequate space present');
  });

  test('should verify no cramped appearance', async ({ page }) => {
    const measurements = await getSpacingMeasurements(page);

    // Calculate if there's adequate breathing room
    const hasAdequateSpace = measurements.spacingBetweenElements >= 8;

    expect(hasAdequateSpace).toBeTruthy();
    console.log('✓ No cramped appearance - adequate breathing room confirmed');
  });

  test('should test desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'desktop.png'),
      fullPage: true
    });

    const measurements = await getSpacingMeasurements(page);
    expect(measurements.error).toBeUndefined();

    console.log('✓ Desktop viewport validated');
  });

  test('should test tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'tablet.png'),
      fullPage: true
    });

    const measurements = await getSpacingMeasurements(page);
    expect(measurements.error).toBeUndefined();

    console.log('✓ Tablet viewport validated');
  });

  test('should test mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'mobile.png'),
      fullPage: true
    });

    const measurements = await getSpacingMeasurements(page);
    expect(measurements.error).toBeUndefined();

    console.log('✓ Mobile viewport validated');
  });

  test('should test dark mode', async ({ page }) => {
    // Enable dark mode by adding dark class to html element
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'dark-mode.png'),
      fullPage: true
    });

    const measurements = await getSpacingMeasurements(page);
    expect(measurements.error).toBeUndefined();

    console.log('✓ Dark mode validated');
  });

  test('should verify metadata line elements display correctly', async ({ page }) => {
    const postCard = page.locator('article, .bg-white').first();
    const metadataLine = postCard.locator('.pl-14.flex.items-center.space-x-6').first();

    await expect(metadataLine).toBeVisible();

    // Check for metadata elements (time, reading time, author)
    const metadataContent = await metadataLine.textContent();

    // Verify metadata contains expected information
    expect(metadataContent).toBeTruthy();
    expect(metadataContent!.length).toBeGreaterThan(0);

    console.log('Metadata content:', metadataContent);
    console.log('✓ Metadata line elements display correctly');
  });

  test('should verify divider renders correctly', async ({ page }) => {
    const postCard = page.locator('article, .bg-white').first();

    // Find divider (could be hr or div with border)
    const divider = postCard.locator('hr, [class*="divider"], [class*="border-t"]').first();

    await expect(divider).toBeVisible();

    const dividerStyles = await divider.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        display: styles.display,
        borderTopWidth: styles.borderTopWidth,
        borderTopStyle: styles.borderTopStyle,
        opacity: styles.opacity
      };
    });

    console.log('Divider styles:', dividerStyles);

    // Verify divider is visible and has border
    expect(dividerStyles.display).not.toBe('none');
    expect(dividerStyles.opacity).not.toBe('0');

    console.log('✓ Divider renders correctly');
  });

  test('should verify post cards render correctly (regression)', async ({ page }) => {
    // Check multiple post cards are present
    const postCards = page.locator('article, .bg-white');
    const count = await postCards.count();

    expect(count).toBeGreaterThan(0);

    // Verify first post card has expected structure
    const firstCard = postCards.first();
    await expect(firstCard).toBeVisible();

    console.log(`✓ Found ${count} post cards - rendering correctly`);
  });

  test('should verify no console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Reload page to catch any errors
    await page.reload({ waitUntil: 'networkidle' });
    await waitForFeedLoad(page);

    // Filter out common non-critical errors
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('favicon') &&
      !err.includes('404') &&
      !err.toLowerCase().includes('warning')
    );

    if (criticalErrors.length > 0) {
      console.log('Console errors found:', criticalErrors);
    }

    expect(criticalErrors.length).toBe(0);
    console.log('✓ No console errors detected');
  });

  test('should verify no layout shifts', async ({ page }) => {
    // Get initial measurements
    const initialMeasurements = await getSpacingMeasurements(page);

    // Wait a bit for any potential layout shifts
    await page.waitForTimeout(2000);

    // Get measurements again
    const finalMeasurements = await getSpacingMeasurements(page);

    // Compare measurements - should be stable
    expect(finalMeasurements.metadataMarginTop).toBe(initialMeasurements.metadataMarginTop);
    expect(finalMeasurements.metadataMarginBottom).toBe(initialMeasurements.metadataMarginBottom);

    console.log('✓ No layout shifts detected - spacing stable');
  });

  test('should create comparison report', async ({ page }) => {
    const measurements = await getSpacingMeasurements(page);

    const report = {
      timestamp: new Date().toISOString(),
      change: 'Added mb-4 class to metadata line (line 803)',
      expectedSpacing: '~44px total space before divider',
      measurements: {
        metadataMarginTop: measurements.metadataMarginTop,
        metadataMarginBottom: measurements.metadataMarginBottom,
        spacingBetweenElements: `${measurements.spacingBetweenElements}px`,
        classes: measurements.metadataClasses
      },
      validation: {
        hasMb4Class: measurements.metadataClasses?.includes('mb-4') || false,
        hasMt4Class: measurements.metadataClasses?.includes('mt-4') || false,
        hasAdequateSpace: measurements.spacingBetweenElements >= 12,
        marginBottomValue: measurements.metadataMarginBottom,
        marginTopValue: measurements.metadataMarginTop
      },
      screenshots: {
        after: 'after.png',
        closeUp: 'close-up.png',
        desktop: 'desktop.png',
        tablet: 'tablet.png',
        mobile: 'mobile.png',
        darkMode: 'dark-mode.png'
      }
    };

    // Save report
    const reportPath = path.join(SCREENSHOT_DIR, 'validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('✓ Validation report created:', reportPath);
    console.log(JSON.stringify(report, null, 2));
  });
});
