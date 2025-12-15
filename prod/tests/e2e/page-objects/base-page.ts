import { Page, Locator, expect } from '@playwright/test';

/**
 * Base Page Object Model
 * Provides common functionality for all page objects
 */
export abstract class BasePage {
  protected page: Page;
  protected baseURL: string;

  constructor(page: Page) {
    this.page = page;
    this.baseURL = process.env.BASE_URL || 'http://localhost:3001';
  }

  // Common navigation methods
  async goto(path: string = '') {
    const url = path.startsWith('http') ? path : `${this.baseURL}${path}`;
    await this.page.goto(url, { waitUntil: 'networkidle' });
    await this.waitForPageLoad();
  }

  async reload() {
    await this.page.reload({ waitUntil: 'networkidle' });
    await this.waitForPageLoad();
  }

  // Common wait methods
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async waitForSelector(selector: string, timeout?: number) {
    return await this.page.waitForSelector(selector, { timeout });
  }

  async waitForText(text: string, timeout?: number) {
    return await this.page.waitForSelector(`text=${text}`, { timeout });
  }

  async waitForElementVisible(locator: Locator, timeout?: number) {
    await expect(locator).toBeVisible({ timeout });
  }

  async waitForElementHidden(locator: Locator, timeout?: number) {
    await expect(locator).toBeHidden({ timeout });
  }

  // Common interaction methods
  async clickElement(selector: string) {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible' });
    await element.click();
  }

  async fillInput(selector: string, value: string) {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible' });
    await element.fill(value);
  }

  async selectOption(selector: string, value: string) {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible' });
    await element.selectOption(value);
  }

  // Common assertion methods
  async expectElementVisible(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  async expectElementHidden(selector: string) {
    await expect(this.page.locator(selector)).toBeHidden();
  }

  async expectTextContent(selector: string, text: string) {
    await expect(this.page.locator(selector)).toContainText(text);
  }

  async expectElementCount(selector: string, count: number) {
    await expect(this.page.locator(selector)).toHaveCount(count);
  }

  // Common utility methods
  async getElementText(selector: string): Promise<string> {
    return await this.page.locator(selector).textContent() || '';
  }

  async getElementAttribute(selector: string, attribute: string): Promise<string> {
    return await this.page.locator(selector).getAttribute(attribute) || '';
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `screenshots/${name}-${Date.now()}.png`,
      fullPage: true
    });
  }

  // Performance monitoring
  async measurePerformance(action: () => Promise<void>): Promise<number> {
    const start = Date.now();
    await action();
    return Date.now() - start;
  }

  async collectNetworkActivity(): Promise<any[]> {
    const networkRequests: any[] = [];
    
    this.page.on('request', request => {
      networkRequests.push({
        type: 'request',
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      });
    });

    this.page.on('response', response => {
      networkRequests.push({
        type: 'response',
        url: response.url(),
        status: response.status(),
        timestamp: Date.now()
      });
    });

    return networkRequests;
  }

  // Error handling
  async handlePopup(action: () => Promise<void>) {
    this.page.on('dialog', async dialog => {
      await dialog.accept();
    });
    await action();
  }

  async interceptAPICall(url: string, mockResponse: any) {
    await this.page.route(url, async route => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(mockResponse)
      });
    });
  }

  // Mobile and responsive testing
  async setViewport(width: number, height: number) {
    await this.page.setViewportSize({ width, height });
  }

  async simulateNetworkCondition(condition: 'slow3G' | 'fast3G' | 'offline') {
    const conditions = {
      slow3G: { downloadThroughput: 500 * 1024 / 8, uploadThroughput: 500 * 1024 / 8, latency: 400 },
      fast3G: { downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8, latency: 150 },
      offline: { downloadThroughput: 0, uploadThroughput: 0, latency: 0 }
    };

    const cdpSession = await this.page.context().newCDPSession(this.page);
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: condition === 'offline',
      ...conditions[condition]
    });
  }
}