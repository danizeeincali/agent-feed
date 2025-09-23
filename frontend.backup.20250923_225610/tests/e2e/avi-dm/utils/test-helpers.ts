import { Page, Browser, BrowserContext, expect } from '@playwright/test';
import { testMessages, mockResponses, performanceThresholds } from '../fixtures/test-data';

/**
 * Enhanced test utilities for Avi DM E2E testing
 */
export class TestHelpers {
  static async setupMockAPI(page: Page, responseType: 'success' | 'error' | 'slow' = 'success') {
    switch (responseType) {
      case 'success':
        await page.route('**/api/claude-code/streaming-chat', route => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockResponses.success.simple)
          });
        });
        break;

      case 'error':
        await page.route('**/api/claude-code/streaming-chat', route => {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify(mockResponses.error.apiError)
          });
        });
        break;

      case 'slow':
        await page.route('**/api/claude-code/streaming-chat', route => {
          setTimeout(() => {
            route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(mockResponses.success.simple)
            });
          }, 5000);
        });
        break;
    }
  }

  static async clearMockAPI(page: Page) {
    await page.unroute('**/api/claude-code/streaming-chat');
  }

  static async measurePerformance(page: Page, action: () => Promise<void>) {
    const startTime = Date.now();
    await action();
    const endTime = Date.now();
    return endTime - startTime;
  }

  static async waitForStableDOM(page: Page, timeout = 5000) {
    await page.waitForFunction(
      () => {
        const elements = document.querySelectorAll('*');
        return Array.from(elements).every(el =>
          !el.classList.contains('animate-bounce') &&
          !el.classList.contains('animate-spin') &&
          !el.classList.contains('animate-pulse')
        );
      },
      { timeout }
    );
  }

  static async captureNetworkActivity(page: Page) {
    const requests: any[] = [];
    const responses: any[] = [];

    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: Date.now()
      });
    });

    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
        timestamp: Date.now()
      });
    });

    return { requests, responses };
  }

  static async simulateNetworkConditions(page: Page, condition: 'offline' | 'slow' | 'unstable') {
    switch (condition) {
      case 'offline':
        await page.context().setOffline(true);
        break;

      case 'slow':
        await page.route('**/*', route => {
          setTimeout(() => route.continue(), 2000);
        });
        break;

      case 'unstable':
        await page.route('**/*', route => {
          if (Math.random() < 0.3) {
            route.abort('failed');
          } else {
            route.continue();
          }
        });
        break;
    }
  }

  static async restoreNetworkConditions(page: Page) {
    await page.context().setOffline(false);
    await page.unroute('**/*');
  }

  static async getConsoleErrors(page: Page) {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    return errors;
  }

  static async createMultipleContexts(browser: Browser, count: number) {
    const contexts: BrowserContext[] = [];

    for (let i = 0; i < count; i++) {
      const context = await browser.newContext();
      contexts.push(context);
    }

    return contexts;
  }

  static async runConcurrentActions(actions: (() => Promise<any>)[]) {
    return Promise.all(actions.map(action => action()));
  }

  static async waitForAnimation(page: Page, selector: string) {
    await page.waitForSelector(selector);
    await page.waitForFunction(
      (sel) => {
        const element = document.querySelector(sel);
        if (!element) return true;

        const computedStyle = window.getComputedStyle(element);
        return computedStyle.animationName === 'none' &&
               computedStyle.transitionProperty === 'none';
      },
      selector
    );
  }

  static async verifyAccessibility(page: Page) {
    // Check for basic accessibility requirements
    const missingAltTexts = await page.locator('img:not([alt])').count();
    const missingLabels = await page.locator('input:not([aria-label]):not([aria-labelledby]):not([title])').count();
    const missingHeadings = await page.locator('h1, h2, h3, h4, h5, h6').count();

    return {
      missingAltTexts,
      missingLabels,
      hasHeadings: missingHeadings > 0,
      isAccessible: missingAltTexts === 0 && missingLabels === 0
    };
  }

  static async testKeyboardNavigation(page: Page) {
    const focusableElements = await page.locator(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ).count();

    let currentIndex = 0;
    while (currentIndex < focusableElements) {
      await page.keyboard.press('Tab');
      currentIndex++;
    }

    return focusableElements;
  }

  static async generateTestReport(testName: string, results: any) {
    const report = {
      testName,
      timestamp: new Date().toISOString(),
      results,
      performance: {
        duration: results.duration || 0,
        threshold: performanceThresholds.messageResponse
      },
      status: results.success ? 'PASS' : 'FAIL'
    };

    console.log(`\n=== Test Report: ${testName} ===`);
    console.log(JSON.stringify(report, null, 2));

    return report;
  }

  static async createTestImage(width = 100, height = 100, format = 'png') {
    // Create a simple test image buffer
    const canvas = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#007bff"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white">TEST</text>
      </svg>
    `;

    return Buffer.from(canvas);
  }

  static async waitForStreamingComplete(page: Page, timeout = 60000) {
    await page.waitForFunction(
      () => {
        const streamingElements = document.querySelectorAll('[class*="streaming"], [class*="loading"], .animate-bounce');
        return streamingElements.length === 0;
      },
      { timeout }
    );
  }

  static async validateMessageFormat(page: Page, messageSelector: string) {
    const message = page.locator(messageSelector);
    await expect(message).toBeVisible();

    const messageText = await message.textContent();
    const timestamp = message.locator('.text-xs');
    const status = message.locator('[class*="rounded-full"]');

    return {
      hasText: !!messageText && messageText.length > 0,
      hasTimestamp: await timestamp.isVisible(),
      hasStatus: await status.isVisible(),
      messageText
    };
  }
}