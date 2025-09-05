/**
 * Base Page Object Model
 * Foundation class for all page objects with common functionality
 */

export class BasePage {
  constructor(page) {
    this.page = page;
    this.timeout = 10000;
  }

  /**
   * Navigate to a specific path
   * @param {string} path - The path to navigate to
   */
  async navigateTo(path) {
    await this.page.goto(path, { waitUntil: 'networkidle' });
  }

  /**
   * Wait for element to be visible
   * @param {string} selector - Element selector
   * @param {number} timeout - Optional timeout override
   */
  async waitForElement(selector, timeout = this.timeout) {
    return await this.page.waitForSelector(selector, { 
      state: 'visible', 
      timeout 
    });
  }

  /**
   * Wait for element to be hidden
   * @param {string} selector - Element selector
   */
  async waitForElementHidden(selector) {
    return await this.page.waitForSelector(selector, { 
      state: 'hidden', 
      timeout: this.timeout 
    });
  }

  /**
   * Click element with retry logic
   * @param {string} selector - Element selector
   * @param {Object} options - Click options
   */
  async click(selector, options = {}) {
    await this.waitForElement(selector);
    await this.page.click(selector, {
      timeout: this.timeout,
      ...options
    });
  }

  /**
   * Fill input field
   * @param {string} selector - Input selector
   * @param {string} value - Value to fill
   */
  async fill(selector, value) {
    await this.waitForElement(selector);
    await this.page.fill(selector, value);
  }

  /**
   * Select option from dropdown
   * @param {string} selector - Select selector
   * @param {string} value - Value to select
   */
  async selectOption(selector, value) {
    await this.waitForElement(selector);
    await this.page.selectOption(selector, value);
  }

  /**
   * Get text content of element
   * @param {string} selector - Element selector
   */
  async getTextContent(selector) {
    await this.waitForElement(selector);
    return await this.page.textContent(selector);
  }

  /**
   * Get attribute value
   * @param {string} selector - Element selector
   * @param {string} attribute - Attribute name
   */
  async getAttribute(selector, attribute) {
    await this.waitForElement(selector);
    return await this.page.getAttribute(selector, attribute);
  }

  /**
   * Check if element is visible
   * @param {string} selector - Element selector
   */
  async isVisible(selector) {
    try {
      await this.waitForElement(selector, 2000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for page load complete
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Wait for API response
   * @param {string} urlPattern - URL pattern to match
   */
  async waitForApiResponse(urlPattern) {
    return await this.page.waitForResponse(
      response => response.url().includes(urlPattern) && response.status() === 200
    );
  }

  /**
   * Take screenshot for debugging
   * @param {string} name - Screenshot name
   */
  async takeScreenshot(name) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true
    });
  }

  /**
   * Scroll element into view
   * @param {string} selector - Element selector
   */
  async scrollIntoView(selector) {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Hover over element
   * @param {string} selector - Element selector
   */
  async hover(selector) {
    await this.waitForElement(selector);
    await this.page.hover(selector);
  }

  /**
   * Press key combination
   * @param {string} key - Key combination
   */
  async pressKey(key) {
    await this.page.keyboard.press(key);
  }

  /**
   * Wait for specific time
   * @param {number} ms - Milliseconds to wait
   */
  async wait(ms) {
    await this.page.waitForTimeout(ms);
  }

  /**
   * Reload current page
   */
  async reload() {
    await this.page.reload({ waitUntil: 'networkidle' });
  }

  /**
   * Get current URL
   */
  getCurrentUrl() {
    return this.page.url();
  }

  /**
   * Get page title
   */
  async getTitle() {
    return await this.page.title();
  }

  /**
   * Execute JavaScript in page context
   * @param {Function|string} script - Script to execute
   * @param {...any} args - Script arguments
   */
  async evaluateScript(script, ...args) {
    return await this.page.evaluate(script, ...args);
  }

  /**
   * Check element count
   * @param {string} selector - Element selector
   */
  async getElementCount(selector) {
    return await this.page.locator(selector).count();
  }
}