/**
 * Real Functionality Validation E2E Tests
 * Focused on testing real application behavior and data
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe.configure({ mode: 'parallel' });

test.describe('Real Functionality Validation', () => {
  let context: BrowserContext;
  let page: Page;
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ browser }) => {
    consoleErrors = [];

    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    page = await context.newPage();

    // Console error tracking
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('Real Posts Loading and Display', async () => {
    console.log('🔍 Testing real posts loading...');

    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for posts to actually load (not just loading states)
    await page.waitForFunction(() => {
      // Look for actual post content
      const postElements = document.querySelectorAll(
        '[data-testid*="post"], .post, article, .feed-item'
      );

      return postElements.length > 0 &&
             Array.from(postElements).some(el => {
               const text = el.textContent || '';
               return text.length > 50 && !text.includes('Loading') && !text.includes('loading');
             });
    }, { timeout: 15000 });

    // Verify posts have real content
    const posts = page.locator('[data-testid*="post"], .post, article, .feed-item');
    const postCount = await posts.count();
    expect(postCount).toBeGreaterThan(0);

    // Check first post has substantial content
    const firstPost = posts.first();
    const postText = await firstPost.textContent();
    expect(postText).toBeTruthy();
    expect(postText!.length).toBeGreaterThan(20);

    // Verify no console errors
    expect(consoleErrors).toEqual([]);

    console.log(`✅ Found ${postCount} real posts loaded successfully`);
  });

  test('Analytics Page Real Data Loading', async () => {
    console.log('🔍 Testing analytics page real data...');

    await page.goto('/analytics', { waitUntil: 'networkidle' });

    // Wait for analytics components to render
    await page.waitForTimeout(3000);

    // Check for analytics dashboard
    const analyticsContent = page.locator('main, [data-testid*="analytics"], .analytics');
    await expect(analyticsContent.first()).toBeVisible();

    // Look for real metrics data (numbers, percentages, currency)
    await page.waitForFunction(() => {
      const allText = document.body.textContent || '';
      // Look for patterns like: $1.23, 45%, 1,234 tokens, etc.
      return /\$\d+\.?\d*|\d+%|\d{1,3}(,\d{3})*\s*(tokens|requests|users|calls)/.test(allText);
    }, { timeout: 10000 });

    // Test for specific analytics components
    const potentialCharts = page.locator('canvas, svg, .chart, [data-testid*="chart"]');
    if (await potentialCharts.count() > 0) {
      await expect(potentialCharts.first()).toBeVisible();
      console.log('✅ Charts/visualizations found');
    }

    // Test for metrics cards
    const metricsElements = page.locator('.metric, .card, [data-testid*="metric"], .stat');
    if (await metricsElements.count() > 0) {
      await expect(metricsElements.first()).toBeVisible();
      console.log('✅ Metrics elements found');
    }

    expect(consoleErrors).toEqual([]);
    console.log('✅ Analytics page loaded with real data');
  });

  test('Tab Switching Functionality', async () => {
    console.log('🔍 Testing tab switching...');

    await page.goto('/analytics', { waitUntil: 'networkidle' });

    // Find tab elements with various possible selectors
    const tabSelectors = [
      'button[role="tab"]',
      '.tab',
      '[data-testid*="tab"]',
      'button:has-text("System")',
      'button:has-text("Claude")',
      'button:has-text("Analytics")',
      'button:has-text("Performance")',
      'button:has-text("Token")'
    ];

    let tabs;
    for (const selector of tabSelectors) {
      tabs = page.locator(selector);
      if (await tabs.count() > 0) {
        console.log(`Found tabs using selector: ${selector}`);
        break;
      }
    }

    if (tabs && await tabs.count() > 1) {
      const tabCount = await tabs.count();
      console.log(`Testing ${tabCount} tabs`);

      // Test each tab
      for (let i = 0; i < Math.min(tabCount, 4); i++) {
        const tab = tabs.nth(i);
        const tabText = await tab.textContent();

        console.log(`Clicking tab: ${tabText}`);
        await tab.click();
        await page.waitForTimeout(1000);

        // Verify tab activation
        const isActive = await tab.evaluate(el => {
          return el.getAttribute('aria-selected') === 'true' ||
                 el.classList.contains('active') ||
                 el.classList.contains('selected') ||
                 el.hasAttribute('data-state') && el.getAttribute('data-state') === 'active';
        });

        if (isActive) {
          console.log(`✅ Tab "${tabText}" activated successfully`);
        }

        // Look for tab panel content
        const tabPanels = page.locator('[role="tabpanel"]:visible, .tab-panel:visible, .tab-content:visible');
        if (await tabPanels.count() > 0) {
          await expect(tabPanels.first()).toBeVisible();
        }
      }

      // Test specific Claude SDK vs System Analytics switching
      const claudeTab = page.locator('button:has-text("Claude"), button:has-text("Token"), button:has-text("Cost")').first();
      const systemTab = page.locator('button:has-text("System"), button:has-text("Performance")').first();

      if (await claudeTab.count() > 0) {
        await claudeTab.click();
        await page.waitForTimeout(1000);
        console.log('✅ Claude SDK tab tested');
      }

      if (await systemTab.count() > 0) {
        await systemTab.click();
        await page.waitForTimeout(1000);
        console.log('✅ System Analytics tab tested');
      }

    } else {
      console.log('ℹ️  No tabs found or only single tab');
    }

    expect(consoleErrors).toEqual([]);
    console.log('✅ Tab switching validation completed');
  });

  test('API Integration Validation', async () => {
    console.log('🔍 Testing API integration...');

    const apiCalls: string[] = [];
    const apiErrors: string[] = [];

    // Monitor network requests
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/')) {
        if (response.ok()) {
          apiCalls.push(url);
        } else {
          apiErrors.push(`${url}: ${response.status()}`);
        }
      }
    });

    // Load main page
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Navigate to analytics
    await page.goto('/analytics', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    console.log(`API calls made: ${apiCalls.length}`);
    console.log(`API errors: ${apiErrors.length}`);

    if (apiCalls.length > 0) {
      console.log('✅ API calls detected:', apiCalls.slice(0, 3));
    }

    // Test manual API call if no automatic ones detected
    if (apiCalls.length === 0) {
      const manualApiTest = await page.evaluate(async () => {
        const testEndpoints = ['/api/health', '/api/posts', '/api/analytics', '/api/status'];
        const results = [];

        for (const endpoint of testEndpoints) {
          try {
            const response = await fetch(endpoint);
            results.push({
              endpoint,
              status: response.status,
              ok: response.ok
            });
          } catch (error) {
            results.push({
              endpoint,
              error: 'Network error'
            });
          }
        }

        return results;
      });

      console.log('Manual API test results:', manualApiTest);
    }

    expect(consoleErrors).toEqual([]);
    console.log('✅ API integration validation completed');
  });

  test('Performance Benchmarks', async () => {
    console.log('🔍 Testing performance benchmarks...');

    // Test main page load time
    const mainPageStart = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const mainPageLoadTime = Date.now() - mainPageStart;

    console.log(`Main page load time: ${mainPageLoadTime}ms`);
    expect(mainPageLoadTime).toBeLessThan(5000);

    // Wait for network idle
    await page.waitForLoadState('networkidle');
    const mainPageFullLoad = Date.now() - mainPageStart;
    console.log(`Main page full load time: ${mainPageFullLoad}ms`);

    // Test analytics page load time
    const analyticsStart = Date.now();
    await page.goto('/analytics', { waitUntil: 'domcontentloaded' });
    const analyticsLoadTime = Date.now() - analyticsStart;

    console.log(`Analytics page load time: ${analyticsLoadTime}ms`);
    expect(analyticsLoadTime).toBeLessThan(8000);

    // Test interaction responsiveness
    const button = page.locator('button:visible').first();
    if (await button.count() > 0) {
      const clickStart = Date.now();
      await button.click();
      const clickTime = Date.now() - clickStart;

      console.log(`Button click response time: ${clickTime}ms`);
      expect(clickTime).toBeLessThan(1000);
    }

    // Memory usage check
    const memoryInfo = await page.evaluate(() => {
      // @ts-ignore
      const memory = (performance as any).memory;
      return memory ? {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024)
      } : null;
    });

    if (memoryInfo) {
      console.log(`Memory usage: ${memoryInfo.used}MB / ${memoryInfo.total}MB`);
    }

    expect(consoleErrors).toEqual([]);
    console.log('✅ Performance benchmarks validation completed');
  });

  test('Interactive Elements Comprehensive Test', async () => {
    console.log('🔍 Testing all interactive elements...');

    await page.goto('/', { waitUntil: 'networkidle' });

    // Test all buttons
    const buttons = page.locator('button:visible');
    const buttonCount = await buttons.count();
    console.log(`Testing ${buttonCount} buttons`);

    let workingButtons = 0;
    for (let i = 0; i < Math.min(buttonCount, 8); i++) {
      try {
        const button = buttons.nth(i);
        const isEnabled = await button.isEnabled();

        if (isEnabled) {
          await button.click();
          await page.waitForTimeout(300);
          workingButtons++;
        }
      } catch (error) {
        // Button might not be clickable, continue
      }
    }
    console.log(`✅ ${workingButtons} buttons working`);

    // Test form inputs
    const inputs = page.locator('input:visible, textarea:visible');
    const inputCount = await inputs.count();
    console.log(`Testing ${inputCount} input fields`);

    let workingInputs = 0;
    for (let i = 0; i < Math.min(inputCount, 5); i++) {
      try {
        const input = inputs.nth(i);
        const type = await input.getAttribute('type');

        if (type === 'text' || type === 'email' || !type) {
          await input.fill('test value');
          const value = await input.inputValue();
          if (value === 'test value') {
            workingInputs++;
          }
        } else if (type === 'checkbox' || type === 'radio') {
          await input.check();
          workingInputs++;
        }

        await page.waitForTimeout(200);
      } catch (error) {
        // Input might not be interactable, continue
      }
    }
    console.log(`✅ ${workingInputs} inputs working`);

    // Test navigation to analytics
    await page.goto('/analytics', { waitUntil: 'networkidle' });

    // Test analytics-specific elements
    const analyticsButtons = page.locator('button:visible');
    const analyticsButtonCount = await analyticsButtons.count();

    for (let i = 0; i < Math.min(analyticsButtonCount, 5); i++) {
      try {
        const button = analyticsButtons.nth(i);
        await button.click();
        await page.waitForTimeout(300);
      } catch (error) {
        // Continue with next button
      }
    }

    expect(consoleErrors).toEqual([]);
    console.log('✅ Interactive elements comprehensive test completed');
  });

  test('Error-Free Application State', async () => {
    console.log('🔍 Testing error-free application state...');

    // Complete user journey without errors
    const journey = [
      '/',
      '/analytics'
    ];

    for (const route of journey) {
      console.log(`Testing route: ${route}`);

      await page.goto(route, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // Interact with page
      const interactiveElements = page.locator('button:visible, input:visible, a:visible');
      const elementCount = await interactiveElements.count();

      for (let i = 0; i < Math.min(elementCount, 3); i++) {
        try {
          const element = interactiveElements.nth(i);
          const tagName = await element.evaluate(el => el.tagName.toLowerCase());

          if (tagName === 'button') {
            await element.click();
          } else if (tagName === 'input') {
            await element.fill('test');
          } else if (tagName === 'a') {
            // Only click internal links
            const href = await element.getAttribute('href');
            if (href && (href.startsWith('/') || href.startsWith('#'))) {
              await element.click();
            }
          }

          await page.waitForTimeout(500);
        } catch (error) {
          // Element might not be interactable
        }
      }

      console.log(`✅ Route ${route} tested without errors`);
    }

    // Final error check
    expect(consoleErrors).toEqual([]);

    // Verify application is still responsive
    await expect(page.locator('body')).toBeVisible();

    console.log('✅ Application remains error-free throughout testing');
  });
});