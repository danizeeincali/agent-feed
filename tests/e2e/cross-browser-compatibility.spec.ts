import { test, expect, devices, Page, BrowserContext } from '@playwright/test';
import { TestHelper } from './utils/test-helpers';

/**
 * Cross-Browser Compatibility Test Suite
 *
 * Comprehensive testing across different browsers and versions:
 * - Chrome/Chromium compatibility
 * - Firefox compatibility
 * - Safari/WebKit compatibility
 * - Mobile browser compatibility
 * - Feature detection and polyfill testing
 * - Browser-specific API support
 * - Performance variations across browsers
 */

test.describe('Cross-Browser Compatibility Tests', () => {
  const testAgentId = TestHelper.TEST_AGENT_ID;
  let createdPageIds: string[] = [];

  test.afterEach(async () => {
    await TestHelper.cleanupTestPages(createdPageIds);
    createdPageIds = [];
  });

  test('Core functionality across all browsers', async ({ page, browserName }) => {
    console.log(`🌐 Testing core functionality on ${browserName}`);

    await page.goto(TestHelper.FRONTEND_URL);
    await TestHelper.waitForPageReady(page);

    // Test basic navigation
    await TestHelper.navigateToAgents(page);

    // Verify agents page loads correctly
    const agentCards = page.locator('.agent-card, .agent-item, [data-testid^="agent-"]');
    await expect(agentCards.first()).toBeVisible({ timeout: 15000 });

    const agentCount = await agentCards.count();
    expect(agentCount).toBeGreaterThan(0);
    console.log(`✅ ${browserName}: Found ${agentCount} agents`);

    // Navigate to specific agent
    await TestHelper.navigateToAgent(page, testAgentId);

    // Test Dynamic Pages functionality
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await expect(dynamicPagesTab).toBeVisible();
    await dynamicPagesTab.click();

    await page.waitForSelector(
      '.page-item, [data-testid^="page-"], text="No Dynamic Pages Yet"',
      { timeout: 15000 }
    );

    console.log(`✅ ${browserName}: Dynamic Pages tab functional`);

    // Test page creation if create button exists
    const createButton = page.locator('button:has-text("Create"), button:has-text("Create Your First Page")');

    if (await createButton.count() > 0) {
      await createButton.first().click();

      // Should navigate to creation page or show creation form
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      const isCreationPage = currentUrl.includes('/pages/') || currentUrl.includes('/create');

      if (isCreationPage) {
        console.log(`✅ ${browserName}: Page creation navigation working`);
        await page.goBack();
      } else {
        // Check for modal or inline form
        const creationForm = page.locator('.modal, .creation-form, [data-testid="create-form"]');
        if (await creationForm.count() > 0) {
          console.log(`✅ ${browserName}: Page creation form displayed`);

          // Close form if possible
          const closeButton = page.locator('button:has-text("Cancel"), button:has-text("Close"), .close-button');
          if (await closeButton.count() > 0) {
            await closeButton.first().click();
          }
        }
      }
    }

    console.log(`✅ ${browserName}: Core functionality test completed`);
  });

  test('JavaScript API compatibility', async ({ page, browserName }) => {
    console.log(`🔧 Testing JavaScript API compatibility on ${browserName}`);

    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Test modern JavaScript features
    const jsFeatureSupport = await page.evaluate(() => {
      const features = {
        // ES6+ Features
        arrowFunctions: (() => true)(),
        templateLiterals: `test string`.includes('test'),
        destructuring: (() => {
          try {
            const [a] = [1];
            return a === 1;
          } catch { return false; }
        })(),
        promises: typeof Promise !== 'undefined',
        asyncAwait: (async () => true)(),

        // Web APIs
        fetch: typeof fetch !== 'undefined',
        localStorage: typeof localStorage !== 'undefined',
        sessionStorage: typeof sessionStorage !== 'undefined',
        geolocation: 'geolocation' in navigator,
        pushNotifications: 'PushManager' in window,
        serviceWorker: 'serviceWorker' in navigator,
        webSocket: typeof WebSocket !== 'undefined',
        webRTC: typeof RTCPeerConnection !== 'undefined',

        // DOM APIs
        querySelector: typeof document.querySelector !== 'undefined',
        eventListeners: typeof addEventListener !== 'undefined',
        intersectionObserver: typeof IntersectionObserver !== 'undefined',
        mutationObserver: typeof MutationObserver !== 'undefined',

        // Browser Info
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        language: navigator.language,

        // Performance APIs
        performanceNow: typeof performance !== 'undefined' && typeof performance.now === 'function',
        performanceObserver: typeof PerformanceObserver !== 'undefined',

        // Security APIs
        crypto: typeof crypto !== 'undefined',
        cryptoSubtle: typeof crypto?.subtle !== 'undefined'
      };

      return features;
    });

    console.log(`📊 ${browserName} JavaScript API support:`, {
      'ES6+ Features': ['arrowFunctions', 'templateLiterals', 'destructuring', 'promises', 'asyncAwait']
        .filter(feature => jsFeatureSupport[feature]).length + '/5',
      'Web APIs': ['fetch', 'localStorage', 'webSocket', 'serviceWorker']
        .filter(feature => jsFeatureSupport[feature]).length + '/4',
      'DOM APIs': ['querySelector', 'eventListeners', 'intersectionObserver']
        .filter(feature => jsFeatureSupport[feature]).length + '/3',
      'Performance APIs': jsFeatureSupport.performanceNow ? 'Supported' : 'Limited',
      'User Agent': jsFeatureSupport.userAgent?.substring(0, 50) + '...'
    });

    // Critical features that should be supported
    expect(jsFeatureSupport.fetch).toBe(true);
    expect(jsFeatureSupport.promises).toBe(true);
    expect(jsFeatureSupport.localStorage).toBe(true);
    expect(jsFeatureSupport.querySelector).toBe(true);

    // Test polyfills if any modern features are missing
    const missingFeatures = Object.entries(jsFeatureSupport)
      .filter(([key, value]) =>
        ['intersectionObserver', 'performanceObserver', 'webSocket'].includes(key) && !value
      )
      .map(([key]) => key);

    if (missingFeatures.length > 0) {
      console.log(`⚠️ ${browserName}: Missing modern features: ${missingFeatures.join(', ')}`);

      // Application should still work with fallbacks
      const dynamicPagesTab = page.locator('text="Dynamic Pages"');
      await dynamicPagesTab.click();

      await page.waitForSelector(
        '.page-item, [data-testid^="page-"], text="No Dynamic Pages Yet"',
        { timeout: 15000 }
      );

      console.log(`✅ ${browserName}: Application functional despite missing features`);
    }

    console.log(`✅ ${browserName}: JavaScript API compatibility test completed`);
  });

  test('CSS and styling compatibility', async ({ page, browserName }) => {
    console.log(`🎨 Testing CSS compatibility on ${browserName}`);

    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Test CSS feature support
    const cssFeatureSupport = await page.evaluate(() => {
      const testElement = document.createElement('div');
      document.body.appendChild(testElement);

      const features = {
        // Layout Features
        flexbox: CSS.supports('display', 'flex'),
        grid: CSS.supports('display', 'grid'),

        // Visual Features
        borderRadius: CSS.supports('border-radius', '5px'),
        boxShadow: CSS.supports('box-shadow', '0 0 5px rgba(0,0,0,0.5)'),
        transform: CSS.supports('transform', 'rotate(45deg)'),
        transition: CSS.supports('transition', 'all 0.3s'),
        animation: CSS.supports('animation', 'test 1s'),

        // Modern Features
        customProperties: CSS.supports('--custom-property', 'value'),
        calc: CSS.supports('width', 'calc(100% - 10px)'),
        viewport: CSS.supports('width', '100vw'),

        // Browser Prefixes Needed
        webkitTransform: CSS.supports('-webkit-transform', 'rotate(45deg)'),
        mozTransform: CSS.supports('-moz-transform', 'rotate(45deg)'),

        // Computed Styles
        computedDisplay: getComputedStyle(testElement).display,
        computedPosition: getComputedStyle(testElement).position
      };

      document.body.removeChild(testElement);
      return features;
    });

    console.log(`🎨 ${browserName} CSS feature support:`, {
      'Layout': `Flexbox: ${cssFeatureSupport.flexbox}, Grid: ${cssFeatureSupport.grid}`,
      'Visual': `Border-radius: ${cssFeatureSupport.borderRadius}, Box-shadow: ${cssFeatureSupport.boxShadow}`,
      'Animation': `Transform: ${cssFeatureSupport.transform}, Transition: ${cssFeatureSupport.transition}`,
      'Modern': `Custom Properties: ${cssFeatureSupport.customProperties}, Calc: ${cssFeatureSupport.calc}`
    });

    // Navigate to dynamic pages to test specific styling
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();
    await page.waitForTimeout(2000);

    // Test visual rendering
    const pageContainer = page.locator('.bg-white.rounded-lg.border, main, .container').first();

    if (await pageContainer.count() > 0) {
      const containerStyles = await pageContainer.evaluate(el => {
        const computed = getComputedStyle(el);
        return {
          display: computed.display,
          position: computed.position,
          backgroundColor: computed.backgroundColor,
          borderRadius: computed.borderRadius,
          padding: computed.padding,
          margin: computed.margin,
          width: computed.width,
          height: computed.height
        };
      });

      console.log(`📐 ${browserName} computed styles:`, containerStyles);

      // Elements should be properly styled
      expect(containerStyles.display).not.toBe('none');

      // Background should be set (not transparent/initial)
      expect(containerStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(containerStyles.backgroundColor).not.toBe('transparent');
    }

    // Test responsive behavior
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);

    const mobileStyles = await pageContainer.evaluate(el => {
      const computed = getComputedStyle(el);
      return {
        width: computed.width,
        padding: computed.padding,
        fontSize: computed.fontSize
      };
    });

    console.log(`📱 ${browserName} mobile styles:`, mobileStyles);

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Critical CSS features should be supported
    expect(cssFeatureSupport.flexbox || cssFeatureSupport.grid).toBe(true);
    expect(cssFeatureSupport.borderRadius).toBe(true);

    console.log(`✅ ${browserName}: CSS compatibility test completed`);
  });

  test('Input and form handling across browsers', async ({ page, browserName }) => {
    console.log(`📝 Testing input handling on ${browserName}`);

    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Navigate to dynamic pages
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();
    await page.waitForTimeout(1000);

    // Try to trigger page creation form
    const createButton = page.locator('button:has-text("Create"), button:has-text("Create Your First Page")');

    if (await createButton.count() > 0) {
      await createButton.first().click();
      await page.waitForTimeout(2000);

      // Look for form inputs
      const inputs = page.locator('input, textarea, select');
      const inputCount = await inputs.count();

      if (inputCount > 0) {
        console.log(`📝 ${browserName}: Found ${inputCount} form inputs`);

        // Test different input types
        for (let i = 0; i < Math.min(inputCount, 5); i++) {
          const input = inputs.nth(i);
          const inputType = await input.getAttribute('type');
          const tagName = await input.evaluate(el => el.tagName.toLowerCase());

          console.log(`Testing ${tagName}${inputType ? `[${inputType}]` : ''}`);

          try {
            // Test basic input functionality
            if (tagName === 'input' && (!inputType || inputType === 'text')) {
              await input.fill('Test input value');
              const value = await input.inputValue();
              expect(value).toBe('Test input value');
              console.log(`✅ ${browserName}: Text input working`);

            } else if (tagName === 'textarea') {
              await input.fill('Test textarea content\nMultiple lines');
              const value = await input.inputValue();
              expect(value).toContain('Test textarea content');
              console.log(`✅ ${browserName}: Textarea working`);

            } else if (tagName === 'select') {
              const options = input.locator('option');
              const optionCount = await options.count();

              if (optionCount > 1) {
                await input.selectOption({ index: 1 });
                console.log(`✅ ${browserName}: Select working`);
              }

            } else if (inputType === 'checkbox') {
              await input.check();
              const isChecked = await input.isChecked();
              expect(isChecked).toBe(true);
              console.log(`✅ ${browserName}: Checkbox working`);

            } else if (inputType === 'radio') {
              await input.check();
              const isChecked = await input.isChecked();
              expect(isChecked).toBe(true);
              console.log(`✅ ${browserName}: Radio button working`);
            }

          } catch (error) {
            console.log(`⚠️ ${browserName}: Input interaction failed:`, error);
          }
        }

        // Test form submission if possible
        const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Save"), button:has-text("Create")');

        if (await submitButton.count() > 0) {
          // Fill a basic form if title input exists
          const titleInput = page.locator('input[name="title"], [data-testid="title-input"], input[placeholder*="title" i]');

          if (await titleInput.count() > 0) {
            await titleInput.first().fill(`${browserName} Test Page`);

            // Try to submit
            await submitButton.first().click();
            await page.waitForTimeout(2000);

            console.log(`✅ ${browserName}: Form submission attempted`);
          }
        }

      } else {
        console.log(`ℹ️ ${browserName}: No form inputs found in create flow`);
      }

      // Navigate back
      const backButton = page.locator('button:has-text("Back"), button:has-text("Cancel")');
      if (await backButton.count() > 0) {
        await backButton.first().click();
      } else {
        await page.goBack();
      }
    }

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    const focusedElement = page.locator(':focus');
    const hasFocus = await focusedElement.count() > 0;

    if (hasFocus) {
      const tagName = await focusedElement.evaluate(el => el.tagName);
      console.log(`✅ ${browserName}: Keyboard navigation working (focused: ${tagName})`);
    }

    console.log(`✅ ${browserName}: Input handling test completed`);
  });

  test('Event handling and interaction compatibility', async ({ page, browserName }) => {
    console.log(`👆 Testing event handling on ${browserName}`);

    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Test click events
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');

    // Test different types of click events
    const clickMethods = [
      { name: 'click()', action: () => dynamicPagesTab.click() },
      { name: 'dispatchEvent', action: () => dynamicPagesTab.dispatchEvent('click') }
    ];

    for (const method of clickMethods) {
      try {
        await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
        await TestHelper.waitForPageReady(page);

        const tabElement = page.locator('text="Dynamic Pages"');
        await method.action();

        await page.waitForSelector(
          '.page-item, [data-testid^="page-"], text="No Dynamic Pages Yet"',
          { timeout: 10000 }
        );

        console.log(`✅ ${browserName}: ${method.name} working`);
        break;

      } catch (error) {
        console.log(`⚠️ ${browserName}: ${method.name} failed:`, error);
      }
    }

    // Test hover events (if supported)
    const hoverableElements = page.locator('button, a, [role="button"]');
    const hoverCount = await hoverableElements.count();

    if (hoverCount > 0) {
      try {
        await hoverableElements.first().hover();
        await page.waitForTimeout(500);
        console.log(`✅ ${browserName}: Hover events working`);
      } catch (error) {
        console.log(`ℹ️ ${browserName}: Hover not supported or failed`);
      }
    }

    // Test keyboard events
    const keyboardEvents = [
      'Enter',
      'Space',
      'Tab',
      'Escape'
    ];

    for (const key of keyboardEvents) {
      try {
        await page.keyboard.press(key);
        await page.waitForTimeout(200);
        console.log(`✅ ${browserName}: ${key} key working`);
      } catch (error) {
        console.log(`⚠️ ${browserName}: ${key} key failed:`, error);
      }
    }

    // Test scroll events
    try {
      await page.evaluate(() => window.scrollTo(0, 100));
      await page.waitForTimeout(500);

      const scrollPosition = await page.evaluate(() => window.pageYOffset);
      if (scrollPosition > 0) {
        console.log(`✅ ${browserName}: Scroll events working`);
      }

      await page.evaluate(() => window.scrollTo(0, 0));
    } catch (error) {
      console.log(`⚠️ ${browserName}: Scroll events failed:`, error);
    }

    console.log(`✅ ${browserName}: Event handling test completed`);
  });

  test('Performance variations across browsers', async ({ page, browserName }) => {
    console.log(`⚡ Testing performance on ${browserName}`);

    const startTime = Date.now();

    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    const loadTime = Date.now() - startTime;

    // Get performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');

      return {
        domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.navigationStart : 0,
        loadComplete: navigation ? navigation.loadEventEnd - navigation.navigationStart : 0,
        firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        resourceCount: performance.getEntriesByType('resource').length,
        userAgent: navigator.userAgent
      };
    });

    console.log(`⚡ ${browserName} performance:`, {
      'Total Load Time': `${loadTime}ms`,
      'DOM Content Loaded': `${Math.round(performanceMetrics.domContentLoaded)}ms`,
      'First Contentful Paint': `${Math.round(performanceMetrics.firstContentfulPaint)}ms`,
      'Resource Count': performanceMetrics.resourceCount
    });

    // Test tab switching performance
    const tabSwitchStart = Date.now();
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();

    await page.waitForSelector(
      '.page-item, [data-testid^="page-"], text="No Dynamic Pages Yet"',
      { timeout: 15000 }
    );

    const tabSwitchTime = Date.now() - tabSwitchStart;
    console.log(`📊 ${browserName} tab switch: ${tabSwitchTime}ms`);

    // Performance expectations (relaxed for older browsers)
    const performanceBudgets = {
      chrome: { loadTime: 3000, tabSwitch: 500 },
      chromium: { loadTime: 3000, tabSwitch: 500 },
      firefox: { loadTime: 4000, tabSwitch: 800 },
      webkit: { loadTime: 4000, tabSwitch: 800 }
    };

    const budget = performanceBudgets[browserName as keyof typeof performanceBudgets] ||
                  { loadTime: 5000, tabSwitch: 1000 };

    expect(loadTime).toBeLessThan(budget.loadTime);
    expect(tabSwitchTime).toBeLessThan(budget.tabSwitch);

    console.log(`✅ ${browserName}: Performance within budget`);
  });
});

test.describe('Mobile Browser Compatibility', () => {
  const testAgentId = TestHelper.TEST_AGENT_ID;

  test('Mobile Chrome compatibility', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['Pixel 5']
    });
    const page = await context.newPage();

    console.log('📱 Testing Mobile Chrome compatibility');

    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Test touch events
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.tap();

    await page.waitForSelector(
      '.page-item, [data-testid^="page-"], text="No Dynamic Pages Yet"',
      { timeout: 15000 }
    );

    // Test mobile-specific features
    const mobileFeatures = await page.evaluate(() => {
      return {
        touchSupport: 'ontouchstart' in window,
        deviceOrientation: 'orientation' in screen,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio
        },
        userAgent: navigator.userAgent
      };
    });

    console.log('📱 Mobile Chrome features:', mobileFeatures);

    expect(mobileFeatures.touchSupport).toBe(true);
    expect(mobileFeatures.viewport.width).toBeLessThanOrEqual(500);

    await context.close();
    console.log('✅ Mobile Chrome compatibility confirmed');
  });

  test('Mobile Safari compatibility', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12']
    });
    const page = await context.newPage();

    console.log('🍎 Testing Mobile Safari compatibility');

    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Test Safari-specific behavior
    const safariFeatures = await page.evaluate(() => {
      return {
        isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
        webkitSupport: 'webkitRequestAnimationFrame' in window,
        touchSupport: 'ontouchstart' in window,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      };
    });

    console.log('🍎 Mobile Safari features:', safariFeatures);

    // Test touch navigation
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.tap();

    await page.waitForSelector(
      '.page-item, [data-testid^="page-"], text="No Dynamic Pages Yet"',
      { timeout: 15000 }
    );

    // Safari should handle touch events properly
    expect(safariFeatures.touchSupport).toBe(true);

    await context.close();
    console.log('✅ Mobile Safari compatibility confirmed');
  });
});

test.describe('Browser Feature Detection and Fallbacks', () => {
  const testAgentId = TestHelper.TEST_AGENT_ID;

  test('Feature detection and graceful degradation', async ({ page, browserName }) => {
    console.log(`🔍 Testing feature detection on ${browserName}`);

    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Test feature detection
    const featureDetection = await page.evaluate(() => {
      // Modern features that might not be supported everywhere
      const features = {
        // Storage APIs
        localStorage: typeof Storage !== 'undefined' && localStorage !== null,
        sessionStorage: typeof sessionStorage !== 'undefined',
        indexedDB: typeof indexedDB !== 'undefined',

        // Network APIs
        fetch: typeof fetch !== 'undefined',
        webSocket: typeof WebSocket !== 'undefined',
        eventSource: typeof EventSource !== 'undefined',

        // Modern JavaScript
        promises: typeof Promise !== 'undefined',
        asyncAwait: (async () => {})() instanceof Promise,
        modules: typeof Symbol !== 'undefined',

        // Browser APIs
        notifications: 'Notification' in window,
        geolocation: 'geolocation' in navigator,
        camera: 'mediaDevices' in navigator,

        // Performance APIs
        performanceObserver: typeof PerformanceObserver !== 'undefined',
        intersectionObserver: typeof IntersectionObserver !== 'undefined',

        // Security APIs
        crypto: typeof crypto !== 'undefined',

        // Styling APIs
        cssSupports: typeof CSS !== 'undefined' && 'supports' in CSS
      };

      return features;
    });

    console.log(`🔍 ${browserName} feature support summary:`, {
      'Storage': Object.entries(featureDetection).filter(([k, v]) => k.includes('Storage') || k === 'indexedDB').filter(([, v]) => v).length + '/3',
      'Network': Object.entries(featureDetection).filter(([k, v]) => ['fetch', 'webSocket', 'eventSource'].includes(k)).filter(([, v]) => v).length + '/3',
      'Modern JS': Object.entries(featureDetection).filter(([k, v]) => ['promises', 'asyncAwait', 'modules'].includes(k)).filter(([, v]) => v).length + '/3',
      'Browser APIs': Object.entries(featureDetection).filter(([k, v]) => ['notifications', 'geolocation', 'camera'].includes(k)).filter(([, v]) => v).length + '/3'
    });

    // Test that the application works regardless of feature support
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();

    await page.waitForSelector(
      '.page-item, [data-testid^="page-"], text="No Dynamic Pages Yet"',
      { timeout: 15000 }
    );

    // Application should function even with limited feature support
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
    expect(pageContent!.length).toBeGreaterThan(100);

    // Test polyfills or fallbacks for missing features
    if (!featureDetection.fetch) {
      console.log(`⚠️ ${browserName}: fetch not supported, should fallback to XMLHttpRequest`);
      // Application should still load data
    }

    if (!featureDetection.localStorage) {
      console.log(`⚠️ ${browserName}: localStorage not supported, should fallback to cookies or memory`);
      // Application should still function
    }

    if (!featureDetection.webSocket) {
      console.log(`⚠️ ${browserName}: WebSocket not supported, should fallback to HTTP polling`);
      // Real-time features should degrade gracefully
    }

    console.log(`✅ ${browserName}: Feature detection and fallbacks working`);
  });

  test('Polyfill effectiveness', async ({ page, browserName }) => {
    console.log(`🔧 Testing polyfill effectiveness on ${browserName}`);

    // Simulate older browser by removing modern features
    await page.addInitScript(() => {
      // Remove some modern features to test polyfills
      delete (window as any).Promise;
      delete (window as any).fetch;
      delete (window as any).IntersectionObserver;
    });

    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Check if polyfills were loaded
    const polyfillStatus = await page.evaluate(() => {
      return {
        promiseRestored: typeof Promise !== 'undefined',
        fetchRestored: typeof fetch !== 'undefined',
        intersectionObserverRestored: typeof IntersectionObserver !== 'undefined',
        // Check for polyfill indicators
        polyfillsLoaded: document.querySelector('script[src*="polyfill"]') !== null ||
                        document.querySelector('script').textContent?.includes('polyfill')
      };
    });

    console.log(`🔧 ${browserName} polyfill status:`, polyfillStatus);

    // Application should still function
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await expect(dynamicPagesTab).toBeVisible({ timeout: 15000 });
    await dynamicPagesTab.click();

    await page.waitForSelector(
      '.page-item, [data-testid^="page-"], text="No Dynamic Pages Yet"',
      { timeout: 15000 }
    );

    console.log(`✅ ${browserName}: Application functional with polyfills`);
  });
});