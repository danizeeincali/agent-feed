import { test, expect, Page } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

// Test configuration and utilities
const TEST_TIMEOUT = 30000;
const PERFORMANCE_THRESHOLD = 5000; // 5 seconds max load time
const ERROR_SCREENSHOT_DIR = 'frontend/test-results/white-screen-errors';

interface WhiteScreenDetectionResult {
  hasWhiteScreen: boolean;
  consoleErrors: string[];
  domElements: number;
  renderingTime: number;
  interactiveElements: number;
  screenshot?: string;
  networkErrors: string[];
  performanceMetrics: any;
}

class WhiteScreenDetector {
  private page: Page;
  private consoleErrors: string[] = [];
  private networkErrors: string[] = [];

  constructor(page: Page) {
    this.page = page;
    this.setupErrorTracking();
  }

  private setupErrorTracking() {
    // Track console errors
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.consoleErrors.push(`Console Error: ${msg.text()}`);
      }
    });

    // Track page errors
    this.page.on('pageerror', (error) => {
      this.consoleErrors.push(`Page Error: ${error.message}`);
    });

    // Track network failures
    this.page.on('response', (response) => {
      if (!response.ok() && response.status() >= 400) {
        this.networkErrors.push(`Network Error: ${response.status()} - ${response.url()}`);
      }
    });

    // Track request failures
    this.page.on('requestfailed', (request) => {
      this.networkErrors.push(`Request Failed: ${request.url()} - ${request.failure()?.errorText}`);
    });
  }

  async detectWhiteScreen(url: string): Promise<WhiteScreenDetectionResult> {
    const startTime = Date.now();
    
    try {
      // Navigate with extended timeout for slow loading
      await this.page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: TEST_TIMEOUT 
      });

      // Wait for React to mount (check for React root)
      await this.page.waitForFunction(() => {
        return document.querySelector('#root') !== null;
      }, { timeout: 10000 });

      const renderingTime = Date.now() - startTime;

      // Get performance metrics
      const performanceMetrics = await this.page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
        };
      });

      // Check for white screen indicators
      const whiteScreenAnalysis = await this.page.evaluate(() => {
        const body = document.body;
        const root = document.querySelector('#root');
        
        // Check if body/root is empty or minimal
        const bodyText = body.textContent?.trim() || '';
        const bodyHtml = body.innerHTML.trim();
        const rootChildren = root?.children.length || 0;
        
        // Count actual visible elements
        const visibleElements = Array.from(document.querySelectorAll('*')).filter(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && 
                 style.visibility !== 'hidden' && 
                 style.opacity !== '0' &&
                 el.offsetWidth > 0 && 
                 el.offsetHeight > 0;
        }).length;

        // Count interactive elements
        const interactiveElements = document.querySelectorAll(
          'button, input, select, textarea, a[href], [onclick], [role="button"], [tabindex]:not([tabindex="-1"])'
        ).length;

        return {
          bodyText,
          bodyHtml,
          rootChildren,
          visibleElements,
          interactiveElements,
          hasReactRoot: !!root,
          bodyBackgroundColor: window.getComputedStyle(body).backgroundColor,
          rootBackgroundColor: root ? window.getComputedStyle(root).backgroundColor : null
        };
      });

      // Take screenshot for visual verification
      const screenshotPath = await this.takeScreenshot('white-screen-check');

      // Determine if white screen exists
      const hasWhiteScreen = this.isWhiteScreen(whiteScreenAnalysis);

      return {
        hasWhiteScreen,
        consoleErrors: [...this.consoleErrors],
        domElements: whiteScreenAnalysis.visibleElements,
        renderingTime,
        interactiveElements: whiteScreenAnalysis.interactiveElements,
        screenshot: screenshotPath,
        networkErrors: [...this.networkErrors],
        performanceMetrics
      };

    } catch (error) {
      const screenshotPath = await this.takeScreenshot('navigation-error');
      
      return {
        hasWhiteScreen: true,
        consoleErrors: [...this.consoleErrors, `Navigation Error: ${error.message}`],
        domElements: 0,
        renderingTime: Date.now() - startTime,
        interactiveElements: 0,
        screenshot: screenshotPath,
        networkErrors: [...this.networkErrors],
        performanceMetrics: null
      };
    }
  }

  private isWhiteScreen(analysis: any): boolean {
    // Multiple indicators of white screen
    const indicators = [
      analysis.visibleElements < 5, // Very few visible elements
      analysis.interactiveElements === 0, // No interactive elements
      analysis.bodyText.length < 50, // Minimal text content
      !analysis.hasReactRoot, // No React root found
      analysis.rootChildren === 0 // Empty React root
    ];

    // White screen if multiple indicators are true
    const trueIndicators = indicators.filter(Boolean).length;
    return trueIndicators >= 2;
  }

  private async takeScreenshot(name: string): Promise<string> {
    try {
      await fs.mkdir(ERROR_SCREENSHOT_DIR, { recursive: true });
      const timestamp = Date.now();
      const screenshotPath = path.join(ERROR_SCREENSHOT_DIR, `${name}-${timestamp}.png`);
      await this.page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
      });
      return screenshotPath;
    } catch (error) {
      console.warn('Failed to take screenshot:', error.message);
      return null;
    }
  }

  async checkComponentMounting(selectors: string[]): Promise<{mounted: string[], failed: string[]}> {
    const mounted = [];
    const failed = [];

    for (const selector of selectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        mounted.push(selector);
      } catch {
        failed.push(selector);
      }
    }

    return { mounted, failed };
  }

  async detectInfiniteLoops(): Promise<boolean> {
    // Monitor CPU usage and React updates
    const loopDetection = await this.page.evaluate(() => {
      let updateCount = 0;
      const originalSetState = React.Component.prototype.setState;
      
      // Monitor React updates
      React.Component.prototype.setState = function(...args) {
        updateCount++;
        return originalSetState.apply(this, args);
      };

      // Monitor for excessive updates in short time
      return new Promise((resolve) => {
        const startCount = updateCount;
        setTimeout(() => {
          const updatesInSecond = updateCount - startCount;
          resolve(updatesInSecond > 100); // More than 100 updates per second indicates loop
        }, 1000);
      });
    });

    return loopDetection as boolean;
  }

  getErrorSummary(): string {
    const errors = [...this.consoleErrors, ...this.networkErrors];
    return errors.length > 0 ? errors.join('\n') : 'No errors detected';
  }
}

// Main test suite
test.describe('Comprehensive White Screen Detection', () => {
  let detector: WhiteScreenDetector;

  test.beforeEach(async ({ page }) => {
    detector = new WhiteScreenDetector(page);
    
    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Enable JavaScript
    await page.addInitScript(() => {
      // Expose React for testing if available
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || {
        isDisabled: false,
        supportsFiber: true,
        renderers: new Map(),
        onScheduleFiberRoot() {},
        onCommitFiberRoot() {},
        onCommitFiberUnmount() {},
      };
    });
  });

  test('should detect white screen on homepage', async () => {
    const result = await detector.detectWhiteScreen('http://localhost:5173');
    
    // Log detailed results for debugging
    console.log('White Screen Detection Result:', JSON.stringify(result, null, 2));
    
    // Assertions
    expect(result.hasWhiteScreen).toBe(false);
    expect(result.domElements).toBeGreaterThan(5);
    expect(result.interactiveElements).toBeGreaterThan(0);
    expect(result.renderingTime).toBeLessThan(PERFORMANCE_THRESHOLD);
    expect(result.consoleErrors.length).toBe(0);
    
    // If white screen detected, provide detailed error info
    if (result.hasWhiteScreen) {
      console.error('WHITE SCREEN DETECTED!');
      console.error('Console Errors:', result.consoleErrors);
      console.error('Network Errors:', result.networkErrors);
      console.error('DOM Elements:', result.domElements);
      console.error('Interactive Elements:', result.interactiveElements);
      console.error('Screenshot saved to:', result.screenshot);
      
      // Attach screenshot to test report
      if (result.screenshot) {
        await test.info().attach('white-screen-screenshot', {
          path: result.screenshot,
          contentType: 'image/png'
        });
      }
    }
  });

  test('should verify React component mounting', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    const criticalComponents = [
      '#root',
      '[data-testid="app-container"]',
      'nav, header, main',
      'button, input, a[href]'
    ];

    const mountingResult = await detector.checkComponentMounting(criticalComponents);
    
    console.log('Component Mounting Result:', mountingResult);
    
    expect(mountingResult.mounted.length).toBeGreaterThan(0);
    expect(mountingResult.failed.length).toBeLessThan(criticalComponents.length);
    
    // Critical components must mount
    const criticalMounted = mountingResult.mounted.filter(selector => 
      selector.includes('#root') || selector.includes('main')
    );
    expect(criticalMounted.length).toBeGreaterThan(0);
  });

  test('should detect infinite loops and blocking operations', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for initial render
    await page.waitForTimeout(2000);
    
    const hasInfiniteLoop = await detector.detectInfiniteLoops();
    expect(hasInfiniteLoop).toBe(false);
    
    // Monitor performance for blocking operations
    const performanceMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const longTasks = entries.filter(entry => entry.duration > 50);
          resolve({ longTasks: longTasks.length, totalDuration: longTasks.reduce((sum, task) => sum + task.duration, 0) });
        });
        
        observer.observe({ entryTypes: ['longtask'] });
        
        // Timeout after 5 seconds
        setTimeout(() => {
          observer.disconnect();
          resolve({ longTasks: 0, totalDuration: 0 });
        }, 5000);
      });
    });
    
    console.log('Performance Metrics:', performanceMetrics);
    expect((performanceMetrics as any).totalDuration).toBeLessThan(1000);
  });

  test('should verify interactive elements and user interactions', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for page to be interactive
    await page.waitForLoadState('networkidle');
    
    // Find interactive elements
    const interactiveElements = await page.$$eval(
      'button, input, select, textarea, a[href], [onclick], [role="button"]',
      elements => elements.map(el => ({
        tagName: el.tagName,
        textContent: el.textContent?.trim() || '',
        href: (el as HTMLAnchorElement).href || null,
        disabled: (el as HTMLButtonElement).disabled || false,
        visible: el.offsetWidth > 0 && el.offsetHeight > 0
      }))
    );
    
    console.log('Interactive Elements Found:', interactiveElements.length);
    console.log('Elements:', interactiveElements.slice(0, 5)); // Log first 5
    
    expect(interactiveElements.length).toBeGreaterThan(0);
    
    // Verify at least some elements are visible and enabled
    const visibleElements = interactiveElements.filter(el => el.visible && !el.disabled);
    expect(visibleElements.length).toBeGreaterThan(0);
    
    // Try to interact with first clickable element
    const firstClickable = await page.$('button:not([disabled]), a[href], [role="button"]:not([disabled])');
    if (firstClickable) {
      // Verify element is clickable
      await expect(firstClickable).toBeVisible();
      await expect(firstClickable).toBeEnabled();
      
      // Test hover interaction
      await firstClickable.hover();
      await page.waitForTimeout(100); // Allow for hover effects
    }
  });

  test('should capture and analyze all JavaScript errors', async ({ page }) => {
    const allErrors: string[] = [];
    const errorDetails: any[] = [];
    
    // Comprehensive error tracking
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warn') {
        allErrors.push(`${msg.type().toUpperCase()}: ${msg.text()}`);
      }
    });
    
    page.on('pageerror', (error) => {
      allErrors.push(`UNCAUGHT EXCEPTION: ${error.message}`);
      errorDetails.push({
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    });
    
    page.on('requestfailed', (request) => {
      allErrors.push(`REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`);
    });
    
    await page.goto('http://localhost:5173');
    
    // Wait for all async operations
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    console.log('All Errors Captured:', allErrors);
    console.log('Error Details:', errorDetails);
    
    // No critical errors should exist
    const criticalErrors = allErrors.filter(error => 
      error.includes('UNCAUGHT EXCEPTION') || 
      error.includes('TypeError') ||
      error.includes('ReferenceError') ||
      error.includes('SyntaxError')
    );
    
    expect(criticalErrors.length).toBe(0);
    
    // Log warnings but don't fail test
    const warnings = allErrors.filter(error => error.includes('WARN'));
    if (warnings.length > 0) {
      console.warn('Warnings found (not failing test):', warnings);
    }
  });

  test('should perform visual regression check with DOM analysis', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Full page screenshot for visual regression
    const screenshot = await page.screenshot({ 
      fullPage: true,
      animations: 'disabled'
    });
    
    // DOM analysis
    const domAnalysis = await page.evaluate(() => {
      const getAllElements = () => document.querySelectorAll('*').length;
      const getVisibleElements = () => {
        return Array.from(document.querySelectorAll('*')).filter(el => {
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style.display !== 'none' && 
                 style.visibility !== 'hidden' && 
                 style.opacity !== '0' &&
                 rect.width > 0 && 
                 rect.height > 0;
        }).length;
      };
      
      const getTextContent = () => document.body.textContent?.trim().length || 0;
      const getImages = () => document.querySelectorAll('img').length;
      const getLinks = () => document.querySelectorAll('a[href]').length;
      const getButtons = () => document.querySelectorAll('button').length;
      
      return {
        totalElements: getAllElements(),
        visibleElements: getVisibleElements(),
        textLength: getTextContent(),
        images: getImages(),
        links: getLinks(),
        buttons: getButtons(),
        title: document.title,
        url: window.location.href
      };
    });
    
    console.log('DOM Analysis:', domAnalysis);
    
    // Assertions for healthy page
    expect(domAnalysis.totalElements).toBeGreaterThan(20);
    expect(domAnalysis.visibleElements).toBeGreaterThan(10);
    expect(domAnalysis.textLength).toBeGreaterThan(50);
    expect(domAnalysis.title).toBeTruthy();
    
    // Attach screenshot to test results
    await test.info().attach('dom-analysis-screenshot', {
      body: screenshot,
      contentType: 'image/png'
    });
    
    // Save DOM analysis to file
    const analysisPath = path.join(ERROR_SCREENSHOT_DIR, `dom-analysis-${Date.now()}.json`);
    await fs.mkdir(path.dirname(analysisPath), { recursive: true });
    await fs.writeFile(analysisPath, JSON.stringify(domAnalysis, null, 2));
  });

  test('should monitor page performance and loading time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://localhost:5173');
    
    // Wait for critical resources
    await page.waitForLoadState('domcontentloaded');
    
    const domLoadTime = Date.now() - startTime;
    
    // Wait for full load
    await page.waitForLoadState('networkidle');
    
    const fullLoadTime = Date.now() - startTime;
    
    // Get detailed performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      
      return {
        domInteractive: navigation.domInteractive - navigation.fetchStart,
        domComplete: navigation.domComplete - navigation.fetchStart,
        loadEventEnd: navigation.loadEventEnd - navigation.fetchStart,
        firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        resourceCount: performance.getEntriesByType('resource').length
      };
    });
    
    console.log('Performance Metrics:', {
      domLoadTime,
      fullLoadTime,
      ...performanceMetrics
    });
    
    // Performance assertions
    expect(domLoadTime).toBeLessThan(PERFORMANCE_THRESHOLD);
    expect(fullLoadTime).toBeLessThan(PERFORMANCE_THRESHOLD * 2);
    expect(performanceMetrics.firstContentfulPaint).toBeGreaterThan(0);
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(3000);
  });
});

// Mobile-specific white screen tests
test.describe('Mobile White Screen Detection', () => {
  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const detector = new WhiteScreenDetector(page);
    const result = await detector.detectWhiteScreen('http://localhost:5173');
    
    expect(result.hasWhiteScreen).toBe(false);
    expect(result.domElements).toBeGreaterThan(3); // Lower threshold for mobile
    
    // Mobile-specific screenshot
    await page.screenshot({ 
      path: path.join(ERROR_SCREENSHOT_DIR, `mobile-test-${Date.now()}.png`),
      fullPage: true 
    });
  });
});