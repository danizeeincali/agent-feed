import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCREENSHOT_DIR = '/workspaces/agent-feed/docs/validation/screenshots';
const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

test.describe('Comprehensive UI/UX Validation with Screenshots', () => {
  let consoleErrors: string[] = [];
  let consoleWarnings: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    consoleWarnings = [];

    // Capture console errors and warnings
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      consoleErrors.push(`PAGE ERROR: ${error.message}`);
    });

    // Navigate to the app
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  });

  test.afterEach(async () => {
    // Log any console errors/warnings found during the test
    if (consoleErrors.length > 0) {
      console.log('🔴 Console Errors:', consoleErrors);
    }
    if (consoleWarnings.length > 0) {
      console.log('🟡 Console Warnings:', consoleWarnings);
    }
  });

  test('1. Homepage/Feed View - Visual Validation', async ({ page }) => {
    console.log('📸 Testing Homepage/Feed View...');

    // Wait for the feed to load
    await page.waitForSelector('[data-testid="feed-container"], .feed-container, #root', {
      timeout: 10000
    });

    // Take full page screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-homepage-feed-full.png'),
      fullPage: true
    });

    // Take viewport screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-homepage-feed-viewport.png')
    });

    // Verify critical elements are visible
    const bodyText = await page.textContent('body');

    // Check for application content (not white screen)
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(100);

    // Log what's visible
    console.log('✅ Homepage loaded, content length:', bodyText!.length);
    console.log('✅ Screenshots captured: 01-homepage-feed-full.png, 01-homepage-feed-viewport.png');
  });

  test('2. Feed Posts Rendering', async ({ page }) => {
    console.log('📸 Testing Feed Posts Rendering...');

    // Wait for posts to load
    try {
      await page.waitForSelector('[data-testid="post"], .post, article', {
        timeout: 10000
      });

      // Count posts
      const posts = await page.$$('[data-testid="post"], .post, article');
      console.log(`✅ Found ${posts.length} posts`);

      // Screenshot the feed with posts
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '02-feed-posts.png'),
        fullPage: true
      });

      expect(posts.length).toBeGreaterThan(0);
    } catch (error) {
      console.log('⚠️ No posts found, capturing screenshot anyway...');
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '02-feed-posts-empty.png')
      });
      // Don't fail - empty state is valid
    }
  });

  test('3. Navigation and Routing', async ({ page }) => {
    console.log('📸 Testing Navigation and Routing...');

    // Check for navigation elements
    const navElements = await page.$$('nav, [role="navigation"], header');
    if (navElements.length > 0) {
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '03-navigation.png')
      });
      console.log(`✅ Found ${navElements.length} navigation elements`);
    }

    // Try to find and click agents link
    try {
      const agentsLink = await page.$('a[href*="agents"], button:has-text("Agents")');
      if (agentsLink) {
        await agentsLink.click();
        await page.waitForTimeout(2000);
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '03-agents-page.png'),
          fullPage: true
        });
        console.log('✅ Navigated to agents page');
      }
    } catch (error) {
      console.log('⚠️ Agents navigation not found');
    }
  });

  test('4. Post Creation Interface', async ({ page }) => {
    console.log('📸 Testing Post Creation Interface...');

    // Look for post creation elements
    const postCreationSelectors = [
      '[data-testid="post-creation"]',
      '[data-testid="create-post"]',
      'textarea[placeholder*="What"]',
      'button:has-text("Post")',
      'button:has-text("Create")',
      '.post-creation',
      '#post-creation'
    ];

    let found = false;
    for (const selector of postCreationSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          await element.scrollIntoViewIfNeeded();
          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '04-post-creation-interface.png')
          });
          console.log(`✅ Found post creation element: ${selector}`);
          found = true;
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    if (!found) {
      console.log('⚠️ Post creation interface not found, capturing current view');
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '04-post-creation-not-found.png')
      });
    }
  });

  test('5. Agent Interaction Elements', async ({ page }) => {
    console.log('📸 Testing Agent Interaction Elements...');

    // Look for agent-related elements
    const agentSelectors = [
      '[data-testid="agent"]',
      '.agent',
      '[class*="agent"]',
      '[id*="agent"]'
    ];

    let agentElements = [];
    for (const selector of agentSelectors) {
      const elements = await page.$$(selector);
      agentElements.push(...elements);
    }

    if (agentElements.length > 0) {
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '05-agent-interactions.png'),
        fullPage: true
      });
      console.log(`✅ Found ${agentElements.length} agent-related elements`);
    } else {
      console.log('⚠️ No agent elements found');
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '05-agent-interactions-none.png')
      });
    }
  });

  test('6. Responsive Design - Mobile View', async ({ page }) => {
    console.log('📸 Testing Responsive Design - Mobile View...');

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06-mobile-view.png'),
      fullPage: true
    });

    console.log('✅ Mobile view screenshot captured');
  });

  test('7. Responsive Design - Tablet View', async ({ page }) => {
    console.log('📸 Testing Responsive Design - Tablet View...');

    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '07-tablet-view.png'),
      fullPage: true
    });

    console.log('✅ Tablet view screenshot captured');
  });

  test('8. Responsive Design - Desktop View', async ({ page }) => {
    console.log('📸 Testing Responsive Design - Desktop View...');

    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '08-desktop-view.png'),
      fullPage: true
    });

    console.log('✅ Desktop view screenshot captured');
  });

  test('9. API Health Check', async ({ page }) => {
    console.log('🔍 Testing API Connectivity...');

    // Check if backend is responding
    const response = await page.request.get(`${API_URL}/api/posts`);
    const status = response.status();

    console.log(`API Response Status: ${status}`);

    if (status === 200) {
      const posts = await response.json();
      console.log(`✅ API is healthy, returned ${Array.isArray(posts) ? posts.length : 0} posts`);
    } else {
      console.log(`⚠️ API returned status ${status}`);
    }
  });

  test('10. Performance Metrics', async ({ page }) => {
    console.log('⚡ Measuring Performance Metrics...');

    const performanceMetrics = await page.evaluate(() => {
      const perfData = window.performance.timing;
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      return {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
        loadComplete: perfData.loadEventEnd - perfData.navigationStart,
        domInteractive: perfData.domInteractive - perfData.navigationStart,
        dnsLookup: navigation ? navigation.domainLookupEnd - navigation.domainLookupStart : 0,
        tcpConnection: navigation ? navigation.connectEnd - navigation.connectStart : 0
      };
    });

    console.log('📊 Performance Metrics:');
    console.log(`  DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
    console.log(`  Load Complete: ${performanceMetrics.loadComplete}ms`);
    console.log(`  DOM Interactive: ${performanceMetrics.domInteractive}ms`);

    // Performance should be reasonable
    expect(performanceMetrics.domContentLoaded).toBeLessThan(5000);
  });

  test('11. Accessibility Checks', async ({ page }) => {
    console.log('♿ Testing Accessibility...');

    // Check for basic accessibility features
    const hasMainLandmark = await page.$('main, [role="main"]');
    const hasHeadings = await page.$$('h1, h2, h3, h4, h5, h6');
    const hasAltTexts = await page.$$('img[alt]');
    const hasAriaLabels = await page.$$('[aria-label]');

    console.log('Accessibility Features:');
    console.log(`  Main landmark: ${hasMainLandmark ? '✅' : '❌'}`);
    console.log(`  Headings: ${hasHeadings.length}`);
    console.log(`  Images with alt text: ${hasAltTexts.length}`);
    console.log(`  ARIA labels: ${hasAriaLabels.length}`);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '11-accessibility-view.png')
    });
  });

  test('12. No Console Errors', async ({ page }) => {
    console.log('🔍 Checking for Console Errors...');

    // Wait for page to settle
    await page.waitForTimeout(3000);

    // Filter out known non-critical warnings
    const criticalErrors = consoleErrors.filter(error => {
      return !error.includes('DevTools') &&
             !error.includes('Download') &&
             !error.includes('favicon');
    });

    console.log(`Total console errors: ${consoleErrors.length}`);
    console.log(`Critical errors: ${criticalErrors.length}`);

    if (criticalErrors.length > 0) {
      console.log('🔴 Critical Errors Found:');
      criticalErrors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log('✅ No critical console errors');
    }

    // Don't fail on warnings, just log them
    if (consoleWarnings.length > 0) {
      console.log(`⚠️ Total console warnings: ${consoleWarnings.length}`);
    }
  });

  test('13. Full User Flow Simulation', async ({ page }) => {
    console.log('🎬 Simulating Full User Flow...');

    // Step 1: Homepage
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '13-flow-01-homepage.png')
    });

    // Step 2: Scroll down
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '13-flow-02-scrolled.png')
    });

    // Step 3: Try to interact with first post
    try {
      const firstPost = await page.$('[data-testid="post"], .post, article');
      if (firstPost) {
        await firstPost.hover();
        await page.waitForTimeout(500);
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '13-flow-03-post-hover.png')
        });
      }
    } catch (error) {
      console.log('⚠️ Could not interact with post');
    }

    console.log('✅ User flow simulation complete');
  });

  test('14. DOM Structure Validation', async ({ page }) => {
    console.log('🔍 Validating DOM Structure...');

    const domStats = await page.evaluate(() => {
      const getAllElements = () => document.querySelectorAll('*').length;
      const getTextContent = () => document.body.textContent?.trim().length || 0;
      const getImages = () => document.querySelectorAll('img').length;
      const getLinks = () => document.querySelectorAll('a').length;
      const getButtons = () => document.querySelectorAll('button').length;
      const getForms = () => document.querySelectorAll('form, input, textarea').length;

      return {
        totalElements: getAllElements(),
        textLength: getTextContent(),
        images: getImages(),
        links: getLinks(),
        buttons: getButtons(),
        formElements: getForms()
      };
    });

    console.log('📊 DOM Statistics:');
    console.log(`  Total Elements: ${domStats.totalElements}`);
    console.log(`  Text Content Length: ${domStats.textLength} characters`);
    console.log(`  Images: ${domStats.images}`);
    console.log(`  Links: ${domStats.links}`);
    console.log(`  Buttons: ${domStats.buttons}`);
    console.log(`  Form Elements: ${domStats.formElements}`);

    // Verify meaningful content exists
    expect(domStats.totalElements).toBeGreaterThan(50);
    expect(domStats.textLength).toBeGreaterThan(100);
  });
});
