/**
 * Test Helper Utilities
 * Common utilities and helpers for E2E testing
 */

import { expect } from '@playwright/test';

/**
 * Performance Testing Helpers
 */
export class PerformanceHelpers {
  constructor(page) {
    this.page = page;
  }

  /**
   * Measure page load performance
   */
  async measurePageLoad() {
    const navigationStart = await this.page.evaluate(() => performance.timing.navigationStart);
    const loadComplete = await this.page.evaluate(() => performance.timing.loadEventEnd);
    
    return {
      totalTime: loadComplete - navigationStart,
      domContentLoaded: await this.page.evaluate(() => 
        performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
      ),
      firstPaint: await this.page.evaluate(() => {
        const entry = performance.getEntriesByName('first-paint')[0];
        return entry ? entry.startTime : null;
      }),
      firstContentfulPaint: await this.page.evaluate(() => {
        const entry = performance.getEntriesByName('first-contentful-paint')[0];
        return entry ? entry.startTime : null;
      })
    };
  }

  /**
   * Measure API response times
   * @param {string} urlPattern - URL pattern to monitor
   */
  async measureApiResponseTime(urlPattern) {
    const startTime = Date.now();
    
    const response = await this.page.waitForResponse(
      response => response.url().includes(urlPattern)
    );
    
    const endTime = Date.now();
    
    return {
      duration: endTime - startTime,
      status: response.status(),
      url: response.url(),
      size: parseInt(response.headers()['content-length'] || '0')
    };
  }

  /**
   * Monitor memory usage during test
   */
  async measureMemoryUsage() {
    return await this.page.evaluate(() => {
      if ('memory' in performance) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });
  }

  /**
   * Monitor network traffic
   */
  async startNetworkMonitoring() {
    const requests = [];
    const responses = [];

    this.page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now(),
        resourceType: request.resourceType()
      });
    });

    this.page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        timestamp: Date.now(),
        size: parseInt(response.headers()['content-length'] || '0')
      });
    });

    return {
      getRequests: () => [...requests],
      getResponses: () => [...responses],
      getStats: () => ({
        totalRequests: requests.length,
        totalResponses: responses.length,
        totalSize: responses.reduce((sum, r) => sum + r.size, 0),
        errorCount: responses.filter(r => r.status >= 400).length
      })
    };
  }
}

/**
 * Visual Testing Helpers
 */
export class VisualHelpers {
  constructor(page) {
    this.page = page;
  }

  /**
   * Take screenshot with options
   * @param {string} name - Screenshot name
   * @param {Object} options - Screenshot options
   */
  async screenshot(name, options = {}) {
    const defaultOptions = {
      fullPage: true,
      path: `test-results/screenshots/${name}-${Date.now()}.png`
    };

    return await this.page.screenshot({ ...defaultOptions, ...options });
  }

  /**
   * Compare visual elements
   * @param {string} selector - Element selector
   * @param {string} name - Screenshot name
   */
  async compareElement(selector, name) {
    const element = await this.page.locator(selector);
    await expect(element).toHaveScreenshot(`${name}.png`);
  }

  /**
   * Wait for visual stability
   * @param {string} selector - Element selector to monitor
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForVisualStability(selector, timeout = 5000) {
    let lastScreenshot = null;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const element = this.page.locator(selector);
      const screenshot = await element.screenshot();
      
      if (lastScreenshot && screenshot.equals(lastScreenshot)) {
        await this.page.waitForTimeout(100); // Brief additional wait
        return true;
      }
      
      lastScreenshot = screenshot;
      await this.page.waitForTimeout(500);
    }

    throw new Error(`Visual stability not achieved within ${timeout}ms`);
  }

  /**
   * Check for visual regressions
   * @param {string} name - Test name
   * @param {Object} options - Comparison options
   */
  async checkForRegressions(name, options = {}) {
    const defaultOptions = {
      threshold: 0.3,
      maxDiffPixels: 100
    };

    await expect(this.page).toHaveScreenshot(`${name}.png`, {
      ...defaultOptions,
      ...options
    });
  }
}

/**
 * Data Validation Helpers
 */
export class ValidationHelpers {
  /**
   * Validate email format
   * @param {string} email - Email to validate
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   * @param {string} url - URL to validate
   */
  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate phone number
   * @param {string} phone - Phone number to validate
   */
  static isValidPhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  /**
   * Validate social media username
   * @param {string} username - Username to validate
   */
  static isValidUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  }

  /**
   * Validate hashtag format
   * @param {string} hashtag - Hashtag to validate
   */
  static isValidHashtag(hashtag) {
    const hashtagRegex = /^#[a-zA-Z0-9_]{1,30}$/;
    return hashtagRegex.test(hashtag);
  }

  /**
   * Validate post content length for platform
   * @param {string} content - Post content
   * @param {string} platform - Social media platform
   */
  static isValidContentLength(content, platform) {
    const limits = {
      twitter: 280,
      facebook: 63206,
      instagram: 2200,
      linkedin: 3000,
      tiktok: 150
    };

    const limit = limits[platform.toLowerCase()];
    return limit ? content.length <= limit : true;
  }
}

/**
 * Wait Helpers
 */
export class WaitHelpers {
  constructor(page) {
    this.page = page;
  }

  /**
   * Wait for element to be stable (not changing)
   * @param {string} selector - Element selector
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForElementStable(selector, timeout = 5000) {
    let lastContent = null;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const element = await this.page.locator(selector);
        const content = await element.textContent();
        
        if (lastContent === content) {
          await this.page.waitForTimeout(100);
          return true;
        }
        
        lastContent = content;
        await this.page.waitForTimeout(200);
      } catch (error) {
        await this.page.waitForTimeout(200);
      }
    }

    throw new Error(`Element ${selector} did not stabilize within ${timeout}ms`);
  }

  /**
   * Wait for loading to complete
   * @param {Array<string>} indicators - Loading indicator selectors
   */
  async waitForLoadingComplete(indicators = ['[data-testid*="loading"]', '.spinner', '.loading']) {
    for (const indicator of indicators) {
      try {
        await this.page.waitForSelector(indicator, { state: 'hidden', timeout: 30000 });
      } catch (error) {
        // Indicator might not exist, continue
      }
    }
  }

  /**
   * Wait for animation to complete
   * @param {string} selector - Animated element selector
   */
  async waitForAnimationComplete(selector) {
    await this.page.waitForFunction(
      (sel) => {
        const element = document.querySelector(sel);
        if (!element) return true;
        
        const style = getComputedStyle(element);
        return style.animationName === 'none' && style.transitionDuration === '0s';
      },
      selector,
      { timeout: 10000 }
    );
  }

  /**
   * Wait for multiple conditions
   * @param {Array<Function>} conditions - Array of condition functions
   */
  async waitForMultipleConditions(conditions, timeout = 10000) {
    const promises = conditions.map(condition => condition());
    
    try {
      await Promise.all(promises);
    } catch (error) {
      throw new Error(`Not all conditions met within ${timeout}ms: ${error.message}`);
    }
  }
}

/**
 * Error Handling Helpers
 */
export class ErrorHelpers {
  constructor(page) {
    this.page = page;
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Start monitoring console errors
   */
  startErrorMonitoring() {
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.errors.push({
          message: msg.text(),
          timestamp: new Date().toISOString(),
          location: msg.location()
        });
      } else if (msg.type() === 'warning') {
        this.warnings.push({
          message: msg.text(),
          timestamp: new Date().toISOString(),
          location: msg.location()
        });
      }
    });

    this.page.on('pageerror', error => {
      this.errors.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        type: 'javascript'
      });
    });
  }

  /**
   * Get collected errors
   */
  getErrors() {
    return [...this.errors];
  }

  /**
   * Get collected warnings
   */
  getWarnings() {
    return [...this.warnings];
  }

  /**
   * Clear error log
   */
  clearErrors() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Check for critical errors
   */
  hasCriticalErrors() {
    const criticalKeywords = ['uncaught', 'unhandled', 'crash', 'fatal'];
    return this.errors.some(error => 
      criticalKeywords.some(keyword => 
        error.message.toLowerCase().includes(keyword)
      )
    );
  }
}

/**
 * API Testing Helpers
 */
export class ApiHelpers {
  constructor(page) {
    this.page = page;
  }

  /**
   * Intercept and modify API responses
   * @param {string} urlPattern - URL pattern to intercept
   * @param {Object} mockResponse - Mock response data
   */
  async mockApiResponse(urlPattern, mockResponse) {
    await this.page.route(urlPattern, route => {
      route.fulfill({
        status: mockResponse.status || 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse.data || {})
      });
    });
  }

  /**
   * Intercept API requests for monitoring
   * @param {string} urlPattern - URL pattern to monitor
   */
  async interceptApiRequests(urlPattern) {
    const requests = [];
    
    await this.page.route(urlPattern, route => {
      const request = route.request();
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData(),
        timestamp: Date.now()
      });
      
      route.continue();
    });

    return {
      getRequests: () => [...requests],
      getCount: () => requests.length
    };
  }

  /**
   * Simulate network conditions
   * @param {Object} conditions - Network conditions
   */
  async simulateNetworkConditions(conditions) {
    const client = await this.page.context().newCDPSession(this.page);
    
    await client.send('Network.emulateNetworkConditions', {
      offline: conditions.offline || false,
      downloadThroughput: conditions.downloadThroughput || -1,
      uploadThroughput: conditions.uploadThroughput || -1,
      latency: conditions.latency || 0
    });
  }
}

/**
 * Accessibility Testing Helpers
 */
export class AccessibilityHelpers {
  constructor(page) {
    this.page = page;
  }

  /**
   * Check for accessibility violations
   * @param {string} selector - Element selector to check
   */
  async checkAccessibility(selector = 'body') {
    // This would integrate with tools like axe-playwright
    const violations = await this.page.evaluate(async (sel) => {
      // Placeholder for axe-core integration
      const element = document.querySelector(sel);
      if (!element) return [];
      
      // Basic checks
      const violations = [];
      
      // Check for alt text on images
      const images = element.querySelectorAll('img');
      images.forEach((img, index) => {
        if (!img.alt) {
          violations.push({
            type: 'missing-alt-text',
            element: `img[${index}]`,
            message: 'Image missing alt text'
          });
        }
      });
      
      // Check for form labels
      const inputs = element.querySelectorAll('input, textarea, select');
      inputs.forEach((input, index) => {
        if (!input.labels?.length && !input.getAttribute('aria-label')) {
          violations.push({
            type: 'missing-label',
            element: `${input.tagName.toLowerCase()}[${index}]`,
            message: 'Form element missing label'
          });
        }
      });
      
      return violations;
    }, selector);

    return violations;
  }

  /**
   * Check keyboard navigation
   * @param {Array<string>} selectors - Elements to navigate through
   */
  async checkKeyboardNavigation(selectors) {
    const results = [];
    
    for (const selector of selectors) {
      await this.page.focus(selector);
      const focused = await this.page.evaluate(() => document.activeElement?.tagName);
      
      results.push({
        selector,
        focusable: !!focused,
        focused: focused
      });
    }
    
    return results;
  }
}

/**
 * Test Utilities Export
 */
export default {
  PerformanceHelpers,
  VisualHelpers,
  ValidationHelpers,
  WaitHelpers,
  ErrorHelpers,
  ApiHelpers,
  AccessibilityHelpers
};