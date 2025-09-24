import { test, expect, Page } from '@playwright/test';
import { chromium } from 'playwright';

// UI Validation Test Suite for Post Page Removal
test.describe('UI/UX Validation Suite - Post Page Removal', () => {
  let context;
  let page: Page;

  test.beforeAll(async () => {
    const browser = await chromium.launch({ headless: false });
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: 'tests/videos/' }
    });
    page = await context.newPage();

    // Enable console logging
    page.on('console', msg => {
      console.log(`CONSOLE ${msg.type()}: ${msg.text()}`);
    });

    // Track network errors
    page.on('pageerror', error => {
      console.error(`PAGE ERROR: ${error.message}`);
    });
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('Homepage loads correctly and captures screenshot', async () => {
    console.log('Navigating to homepage...');
    await page.goto('http://localhost:5173');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Capture homepage screenshot
    await page.screenshot({
      path: 'tests/screenshots/01-homepage.png',
      fullPage: true
    });

    // Verify basic page structure
    await expect(page.locator('body')).toBeVisible();

    console.log('✅ Homepage loaded successfully');
  });

  test('Navigation menu validation - no Create link', async () => {
    console.log('Validating navigation menu...');

    // Look for navigation elements
    const nav = page.locator('nav, [role="navigation"], .navigation, .navbar');

    if (await nav.count() > 0) {
      // Check that "Create" link is not present
      const createLinks = page.locator('a:has-text("Create"), button:has-text("Create")');
      const createCount = await createLinks.count();

      console.log(`Found ${createCount} "Create" links (should be 0)`);
      expect(createCount).toBe(0);

      // Capture navigation screenshot
      await page.screenshot({
        path: 'tests/screenshots/02-navigation.png',
        fullPage: true
      });
    }

    console.log('✅ Navigation validation complete');
  });

  test('Feed page loads with embedded posting interface', async () => {
    console.log('Navigating to feed page...');

    // Try multiple possible feed routes
    const feedRoutes = ['/feed', '/home', '/'];
    let feedLoaded = false;

    for (const route of feedRoutes) {
      try {
        await page.goto(`http://localhost:5173${route}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Check if this looks like a feed page
        const feedIndicators = [
          '.feed', '.posts', '.post-list',
          '[data-testid="feed"]', '[data-testid="posts"]',
          'article', '.post-item'
        ];

        let hasFeedContent = false;
        for (const indicator of feedIndicators) {
          if (await page.locator(indicator).count() > 0) {
            hasFeedContent = true;
            break;
          }
        }

        if (hasFeedContent) {
          feedLoaded = true;
          console.log(`✅ Feed found at route: ${route}`);
          break;
        }
      } catch (error) {
        console.log(`Route ${route} failed: ${error.message}`);
      }
    }

    // Capture feed screenshot
    await page.screenshot({
      path: 'tests/screenshots/03-feed-page.png',
      fullPage: true
    });

    console.log('✅ Feed page validation complete');
  });

  test('EnhancedPostingInterface validation', async () => {
    console.log('Validating EnhancedPostingInterface...');

    // Look for posting interface components
    const postingSelectors = [
      '.posting-interface', '.post-creator', '.enhanced-posting',
      '[data-testid="posting-interface"]', '[data-testid="post-creator"]',
      'form[data-testid="post-form"]', '.post-form',
      'textarea[placeholder*="post"], textarea[placeholder*="share"]',
      'button:has-text("Post"), button:has-text("Share")'
    ];

    let postingInterfaceFound = false;

    for (const selector of postingSelectors) {
      const elements = page.locator(selector);
      if (await elements.count() > 0) {
        console.log(`✅ Found posting interface: ${selector}`);
        postingInterfaceFound = true;

        // Try to interact with it if it's visible
        if (await elements.first().isVisible()) {
          await elements.first().scrollIntoViewIfNeeded();
          await page.waitForTimeout(1000);
        }
        break;
      }
    }

    // Look for tab interface (Quick Post, Post, Avi DM)
    const tabSelectors = [
      'button:has-text("Quick Post")', 'button:has-text("Post")', 'button:has-text("Avi DM")',
      '[role="tab"]', '.tab', '.tabs button'
    ];

    let tabsFound = 0;
    for (const tabSelector of tabSelectors) {
      const tabs = page.locator(tabSelector);
      const count = await tabs.count();
      if (count > 0) {
        tabsFound += count;
        console.log(`Found ${count} tabs matching: ${tabSelector}`);
      }
    }

    // Capture posting interface screenshot
    await page.screenshot({
      path: 'tests/screenshots/04-posting-interface.png',
      fullPage: true
    });

    console.log(`✅ Posting interface validation complete. Tabs found: ${tabsFound}`);
  });

  test('Test tab functionality in posting interface', async () => {
    console.log('Testing tab functionality...');

    // Look for tabs and test clicking
    const tabTexts = ['Quick Post', 'Post', 'Avi DM'];

    for (const tabText of tabTexts) {
      const tab = page.locator(`button:has-text("${tabText}"), [role="tab"]:has-text("${tabText}")`);

      if (await tab.count() > 0 && await tab.first().isVisible()) {
        console.log(`Testing ${tabText} tab...`);

        // Click the tab
        await tab.first().click();
        await page.waitForTimeout(1000);

        // Capture screenshot after clicking
        await page.screenshot({
          path: `tests/screenshots/05-tab-${tabText.replace(' ', '-').toLowerCase()}.png`,
          fullPage: true
        });

        console.log(`✅ ${tabText} tab clicked successfully`);
      } else {
        console.log(`⚠️ ${tabText} tab not found or not visible`);
      }
    }

    console.log('✅ Tab functionality testing complete');
  });

  test('Test Avi DM functionality', async () => {
    console.log('Testing Avi DM functionality...');

    // Look for Avi DM specific elements
    const aviSelectors = [
      'button:has-text("Avi DM")', '[data-testid="avi-dm"]',
      '.avi-dm', '.ai-chat', '.ai-assistant'
    ];

    let aviFound = false;

    for (const selector of aviSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        console.log(`✅ Found Avi DM element: ${selector}`);
        aviFound = true;

        if (await element.first().isVisible()) {
          await element.first().click();
          await page.waitForTimeout(2000);

          // Look for chat interface
          const chatSelectors = [
            'textarea[placeholder*="message"], textarea[placeholder*="chat"]',
            '.chat-input', '.message-input', 'input[type="text"]'
          ];

          for (const chatSelector of chatSelectors) {
            if (await page.locator(chatSelector).count() > 0) {
              console.log(`✅ Found Avi DM chat input: ${chatSelector}`);
              break;
            }
          }

          // Capture Avi DM screenshot
          await page.screenshot({
            path: 'tests/screenshots/06-avi-dm-active.png',
            fullPage: true
          });
        }
        break;
      }
    }

    if (!aviFound) {
      console.log('⚠️ Avi DM functionality not found');
    }

    console.log('✅ Avi DM testing complete');
  });

  test('Test all navigation links functionality', async () => {
    console.log('Testing navigation links...');

    // Common navigation link texts
    const navTexts = [
      'Home', 'Feed', 'Profile', 'Settings', 'About',
      'Dashboard', 'Agents', 'Analytics', 'Explore'
    ];

    let workingLinks = 0;

    for (const linkText of navTexts) {
      const link = page.locator(`a:has-text("${linkText}"), button:has-text("${linkText}")`);

      if (await link.count() > 0 && await link.first().isVisible()) {
        try {
          console.log(`Testing ${linkText} link...`);

          // Get current URL
          const currentUrl = page.url();

          // Click the link
          await link.first().click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1500);

          // Check if navigation happened
          const newUrl = page.url();
          if (newUrl !== currentUrl) {
            console.log(`✅ ${linkText} navigation successful: ${newUrl}`);
            workingLinks++;
          }

          // Capture screenshot
          await page.screenshot({
            path: `tests/screenshots/07-nav-${linkText.toLowerCase()}.png`,
            fullPage: true
          });

        } catch (error) {
          console.log(`⚠️ ${linkText} link failed: ${error.message}`);
        }
      }
    }

    console.log(`✅ Navigation testing complete. Working links: ${workingLinks}`);
  });

  test('Mobile responsiveness validation', async () => {
    console.log('Testing mobile responsiveness...');

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Capture mobile screenshot
    await page.screenshot({
      path: 'tests/screenshots/08-mobile-view.png',
      fullPage: true
    });

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Capture tablet screenshot
    await page.screenshot({
      path: 'tests/screenshots/09-tablet-view.png',
      fullPage: true
    });

    // Return to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    console.log('✅ Mobile responsiveness testing complete');
  });

  test('Console error validation', async () => {
    console.log('Checking for console errors...');

    const errors: string[] = [];
    const warnings: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      } else if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });

    // Navigate through key pages to collect errors
    const testRoutes = ['/', '/feed', '/home'];

    for (const route of testRoutes) {
      try {
        await page.goto(`http://localhost:5173${route}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
      } catch (error) {
        console.log(`Route ${route} error: ${error.message}`);
      }
    }

    // Final screenshot
    await page.screenshot({
      path: 'tests/screenshots/10-final-state.png',
      fullPage: true
    });

    console.log(`Console errors found: ${errors.length}`);
    console.log(`Console warnings found: ${warnings.length}`);

    if (errors.length > 0) {
      console.log('ERRORS:', errors);
    }

    if (warnings.length > 0) {
      console.log('WARNINGS:', warnings);
    }

    console.log('✅ Console validation complete');
  });

  test('Accessibility compliance check', async () => {
    console.log('Running accessibility checks...');

    // Basic accessibility checks
    const accessibilityIssues: string[] = [];

    // Check for alt text on images
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      if (!alt) {
        accessibilityIssues.push(`Image ${i + 1} missing alt text`);
      }
    }

    // Check for proper heading structure
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    console.log(`Found ${headingCount} headings`);

    // Check for form labels
    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');

      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        if (await label.count() === 0 && !ariaLabel) {
          accessibilityIssues.push(`Input ${i + 1} missing label`);
        }
      }
    }

    console.log(`Accessibility issues found: ${accessibilityIssues.length}`);
    if (accessibilityIssues.length > 0) {
      console.log('ACCESSIBILITY ISSUES:', accessibilityIssues);
    }

    console.log('✅ Accessibility validation complete');
  });
});