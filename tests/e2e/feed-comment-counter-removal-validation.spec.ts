import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * E2E Production Validation for Comment Counter Removal
 *
 * VALIDATION SCOPE:
 * - Change: Line 1078 in RealSocialMediaFeed.tsx
 * - Before: Comments ({post.engagement?.comments || 0})
 * - After: Comments
 *
 * This test suite performs REAL browser validation:
 * - Real application running at http://localhost:5173
 * - Real browser interactions (NO MOCKS)
 * - Real screenshot captures
 * - Real DOM inspection
 * - Real responsive testing
 * - Real theme testing (light/dark mode)
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots/feed-counter-removal');

// Helper function to wait for feed to load
async function waitForFeedToLoad(page: Page) {
  // Wait for the feed container
  await page.waitForSelector('[data-testid="social-feed"], .space-y-6, .max-w-3xl', {
    timeout: 30000
  });

  // Wait for posts to be rendered
  await page.waitForTimeout(2000); // Give time for posts to render
}

// Helper function to find comment section headers
async function findCommentHeaders(page: Page) {
  // Look for the comment section headers that should show "Comments" without counter
  const headers = await page.locator('h4.text-sm.font-medium').filter({ hasText: 'Comments' }).all();
  return headers;
}

// Helper function to toggle dark mode
async function toggleDarkMode(page: Page) {
  // Look for theme toggle button
  const themeButton = page.locator('button').filter({ hasText: /theme|dark|light/i }).first();
  if (await themeButton.count() > 0) {
    await themeButton.click();
    await page.waitForTimeout(500);
  } else {
    // Fallback: toggle dark class on html element
    await page.evaluate(() => {
      document.documentElement.classList.toggle('dark');
    });
    await page.waitForTimeout(500);
  }
}

test.describe('Comment Counter Removal Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    console.log('Navigating to:', APP_URL);
    await page.goto(APP_URL, { waitUntil: 'networkidle' });

    // Wait for the feed to load
    await waitForFeedToLoad(page);
  });

  test('should verify application is running with updated code', async ({ page }) => {
    console.log('Verifying application is running...');

    // Verify page loaded
    await expect(page).toHaveTitle(/Agent Feed|Social Feed/i);

    // Verify feed container exists
    const feedExists = await page.locator('.max-w-3xl, [data-testid="social-feed"]').count() > 0;
    expect(feedExists).toBeTruthy();

    console.log('Application verified running');
  });

  test('should display "Comments" without counter in expanded comment sections', async ({ page }) => {
    console.log('Testing comment section headers...');

    // Find posts with comment buttons
    const commentButtons = await page.locator('button').filter({
      has: page.locator('svg') // MessageCircle icon
    }).filter({
      hasText: /^\d+$/ // Button with just numbers
    }).all();

    console.log(`Found ${commentButtons.length} comment toggle buttons`);

    if (commentButtons.length > 0) {
      // Click the first comment button to expand comments
      await commentButtons[0].click();
      await page.waitForTimeout(1000);

      // Take screenshot after expansion
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'after-expanded-comments.png'),
        fullPage: true
      });

      // Find the comment section header
      const commentHeaders = await findCommentHeaders(page);
      expect(commentHeaders.length).toBeGreaterThan(0);

      // Verify the header text is exactly "Comments" without any numbers
      for (const header of commentHeaders) {
        const text = await header.textContent();
        console.log(`Comment header text: "${text}"`);

        // Should be exactly "Comments" or "Comments " (with trailing space)
        expect(text?.trim()).toBe('Comments');

        // Should NOT contain parentheses or numbers
        expect(text).not.toMatch(/\(\d+\)/);
        expect(text).not.toMatch(/\d+/);
      }

      console.log('Comment section headers validated successfully');
    } else {
      console.warn('No comment buttons found to test');
    }
  });

  test('should capture AFTER screenshot showing Comments without counter', async ({ page }) => {
    console.log('Capturing AFTER screenshot...');

    // Take full page screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'after.png'),
      fullPage: true
    });

    // Try to expand comments section if available
    const commentButtons = await page.locator('button').filter({
      has: page.locator('svg')
    }).filter({
      hasText: /^\d+$/
    }).all();

    if (commentButtons.length > 0) {
      await commentButtons[0].click();
      await page.waitForTimeout(1000);

      // Take screenshot with expanded comments
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'after-with-expanded-section.png'),
        fullPage: true
      });
    }

    console.log('AFTER screenshots captured');
  });

  test('should verify clicking Comments still navigates/toggles comment view', async ({ page }) => {
    console.log('Testing comment interaction...');

    // Find comment toggle buttons
    const commentButtons = await page.locator('button').filter({
      has: page.locator('svg')
    }).filter({
      hasText: /^\d+$/
    }).all();

    if (commentButtons.length > 0) {
      // Click to expand comments
      await commentButtons[0].click();
      await page.waitForTimeout(1000);

      // Verify comment section is visible
      const commentSection = page.locator('.border-t').filter({ hasText: 'Comments' });
      await expect(commentSection).toBeVisible();

      // Verify "Add Comment" button exists
      const addCommentButton = page.locator('button').filter({ hasText: /Add Comment|Cancel/i });
      await expect(addCommentButton.first()).toBeVisible();

      console.log('Comment interaction verified');
    } else {
      console.warn('No comment buttons found to test interaction');
    }
  });

  test('should verify other engagement metrics still display', async ({ page }) => {
    console.log('Verifying engagement metrics...');

    // Check for like/heart icons with counts
    const likeButtons = await page.locator('button').filter({
      has: page.locator('svg')
    }).filter({
      hasText: /^\d+$/
    }).all();

    console.log(`Found ${likeButtons.length} engagement metric buttons`);
    expect(likeButtons.length).toBeGreaterThan(0);

    // Verify at least one numeric metric is displayed
    let hasNumericMetric = false;
    for (const button of likeButtons) {
      const text = await button.textContent();
      if (text && /\d+/.test(text)) {
        hasNumericMetric = true;
        console.log(`Found numeric metric: "${text}"`);
      }
    }

    expect(hasNumericMetric).toBeTruthy();
    console.log('Engagement metrics verified');
  });

  test('should verify no console errors', async ({ page }) => {
    console.log('Monitoring console for errors...');

    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Interact with the page
    await page.waitForTimeout(2000);

    // Try to expand comments
    const commentButtons = await page.locator('button').filter({
      has: page.locator('svg')
    }).filter({
      hasText: /^\d+$/
    }).all();

    if (commentButtons.length > 0) {
      await commentButtons[0].click();
      await page.waitForTimeout(1000);
    }

    // Check for errors
    if (consoleErrors.length > 0) {
      console.error('Console errors found:', consoleErrors);
    }

    expect(consoleErrors.length).toBe(0);
    console.log('No console errors detected');
  });
});

test.describe('Responsive Design Validation', () => {
  test('should display correctly on desktop (1920x1080)', async ({ page }) => {
    console.log('Testing desktop view...');

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await waitForFeedToLoad(page);

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'desktop.png'),
      fullPage: true
    });

    // Verify feed is visible
    const feed = page.locator('.max-w-3xl, [data-testid="social-feed"]');
    await expect(feed).toBeVisible();

    // Try to expand comments and verify
    const commentButtons = await page.locator('button').filter({
      has: page.locator('svg')
    }).filter({
      hasText: /^\d+$/
    }).all();

    if (commentButtons.length > 0) {
      await commentButtons[0].click();
      await page.waitForTimeout(1000);

      const commentHeaders = await findCommentHeaders(page);
      if (commentHeaders.length > 0) {
        const text = await commentHeaders[0].textContent();
        expect(text?.trim()).toBe('Comments');
      }
    }

    console.log('Desktop view validated');
  });

  test('should display correctly on tablet (768x1024)', async ({ page }) => {
    console.log('Testing tablet view...');

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await waitForFeedToLoad(page);

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'tablet.png'),
      fullPage: true
    });

    // Verify feed is visible
    const feed = page.locator('.max-w-3xl, [data-testid="social-feed"]');
    await expect(feed).toBeVisible();

    console.log('Tablet view validated');
  });

  test('should display correctly on mobile (375x667)', async ({ page }) => {
    console.log('Testing mobile view...');

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await waitForFeedToLoad(page);

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'mobile.png'),
      fullPage: true
    });

    // Verify feed is visible
    const feed = page.locator('.max-w-3xl, [data-testid="social-feed"]');
    await expect(feed).toBeVisible();

    // Try to expand comments and verify on mobile
    const commentButtons = await page.locator('button').filter({
      has: page.locator('svg')
    }).filter({
      hasText: /^\d+$/
    }).all();

    if (commentButtons.length > 0) {
      await commentButtons[0].click();
      await page.waitForTimeout(1000);

      const commentHeaders = await findCommentHeaders(page);
      if (commentHeaders.length > 0) {
        const text = await commentHeaders[0].textContent();
        expect(text?.trim()).toBe('Comments');
      }
    }

    console.log('Mobile view validated');
  });
});

test.describe('Theme Testing', () => {
  test('should display correctly in light mode', async ({ page }) => {
    console.log('Testing light mode...');

    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await waitForFeedToLoad(page);

    // Ensure light mode
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
    });
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'light-mode.png'),
      fullPage: true
    });

    // Expand comments and verify
    const commentButtons = await page.locator('button').filter({
      has: page.locator('svg')
    }).filter({
      hasText: /^\d+$/
    }).all();

    if (commentButtons.length > 0) {
      await commentButtons[0].click();
      await page.waitForTimeout(1000);

      const commentHeaders = await findCommentHeaders(page);
      if (commentHeaders.length > 0) {
        const text = await commentHeaders[0].textContent();
        expect(text?.trim()).toBe('Comments');
      }
    }

    console.log('Light mode validated');
  });

  test('should display correctly in dark mode', async ({ page }) => {
    console.log('Testing dark mode...');

    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await waitForFeedToLoad(page);

    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'dark-mode.png'),
      fullPage: true
    });

    // Expand comments and verify
    const commentButtons = await page.locator('button').filter({
      has: page.locator('svg')
    }).filter({
      hasText: /^\d+$/
    }).all();

    if (commentButtons.length > 0) {
      await commentButtons[0].click();
      await page.waitForTimeout(1000);

      const commentHeaders = await findCommentHeaders(page);
      if (commentHeaders.length > 0) {
        const text = await commentHeaders[0].textContent();
        expect(text?.trim()).toBe('Comments');
      }

      // Take additional screenshot with expanded comments in dark mode
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'dark-mode-expanded.png'),
        fullPage: true
      });
    }

    console.log('Dark mode validated');
  });
});

test.describe('Visual Regression Prevention', () => {
  test('should verify no visual regressions in post card layout', async ({ page }) => {
    console.log('Checking for visual regressions...');

    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await waitForFeedToLoad(page);

    // Take baseline screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'visual-baseline.png'),
      fullPage: true
    });

    // Verify post cards are properly structured
    const posts = await page.locator('.bg-white, .dark\\:bg-gray-900').filter({
      has: page.locator('button')
    }).all();

    console.log(`Found ${posts.length} post cards`);
    expect(posts.length).toBeGreaterThan(0);

    // Verify engagement section exists
    const engagementSections = await page.locator('.flex.items-center.justify-between, .flex.items-center.space-x-4').all();
    expect(engagementSections.length).toBeGreaterThan(0);

    console.log('Visual structure validated');
  });

  test('should verify comment section styling is preserved', async ({ page }) => {
    console.log('Verifying comment section styling...');

    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await waitForFeedToLoad(page);

    // Expand comments
    const commentButtons = await page.locator('button').filter({
      has: page.locator('svg')
    }).filter({
      hasText: /^\d+$/
    }).all();

    if (commentButtons.length > 0) {
      await commentButtons[0].click();
      await page.waitForTimeout(1000);

      // Verify comment section styling
      const commentSection = page.locator('.border-t.border-gray-100').first();
      await expect(commentSection).toBeVisible();

      // Verify header styling
      const header = page.locator('h4.text-sm.font-medium').filter({ hasText: 'Comments' }).first();
      await expect(header).toBeVisible();

      // Check text color classes
      const classes = await header.getAttribute('class');
      expect(classes).toContain('text-gray-700');
      expect(classes).toContain('dark:text-gray-300');

      // Take styled screenshot
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'comment-section-styling.png'),
        fullPage: true
      });

      console.log('Comment section styling verified');
    }
  });
});
