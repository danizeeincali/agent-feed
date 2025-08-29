import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for Claude Instance Buttons
 * Provides structured interaction with button elements and rate limiting behavior
 */
export class ClaudeButtonsPage {
  readonly page: Page;
  readonly buttonContainer: Locator;
  readonly prodButton: Locator;
  readonly skipPermissionsButton: Locator;
  readonly skipPermissionsCButton: Locator;
  readonly skipPermissionsResumeButton: Locator;
  readonly loadingIndicator: Locator;
  readonly cooldownIndicator: Locator;
  readonly rateLimitWarning: Locator;
  readonly readyIndicator: Locator;
  readonly connectionStatusIndicators: Locator;

  constructor(page: Page) {
    this.page = page;
    this.buttonContainer = page.locator('[data-testid="claude-instance-buttons"], .space-y-6').first();
    
    // Claude instance buttons by variant
    this.prodButton = page.locator('button:has-text("prod/claude")');
    this.skipPermissionsButton = page.locator('button:has-text("skip-permissions"):not(:has-text("-c")):not(:has-text("--resume"))');
    this.skipPermissionsCButton = page.locator('button:has-text("skip-permissions -c")');
    this.skipPermissionsResumeButton = page.locator('button:has-text("skip-permissions --resume")');
    
    // Status indicators
    this.loadingIndicator = page.locator('[data-testid="loading-indicator"], .animate-spin, text="Launching Claude instance..."');
    this.cooldownIndicator = page.locator('text="Waiting for cooldown...", text="(cooldown)", .animate-pulse');
    this.rateLimitWarning = page.locator('text="Rate limit reached", text="rate limit exceeded", .text-amber-600');
    this.readyIndicator = page.locator('text="Ready to launch", .bg-green-400');
    this.connectionStatusIndicators = page.locator('.w-2\\.5.h-2\\.5.rounded-full, [data-testid="connection-status"]');
  }

  /**
   * Navigate to Claude instances page
   */
  async goto() {
    await this.page.goto('/claude-instances');
    await this.page.waitForLoadState('networkidle');
    
    // Wait for buttons to be visible and interactive
    await this.buttonContainer.waitFor({ state: 'visible', timeout: 30000 });
    await this.prodButton.waitFor({ state: 'visible', timeout: 15000 });
  }

  /**
   * Get all Claude instance buttons
   */
  getAllButtons(): Locator[] {
    return [
      this.prodButton,
      this.skipPermissionsButton,
      this.skipPermissionsCButton,
      this.skipPermissionsResumeButton
    ];
  }

  /**
   * Check if a button is in disabled state
   */
  async isButtonDisabled(button: Locator): Promise<boolean> {
    const disabled = await button.getAttribute('disabled');
    const ariaDisabled = await button.getAttribute('aria-disabled');
    const classes = await button.getAttribute('class') || '';
    
    return disabled !== null || 
           ariaDisabled === 'true' || 
           classes.includes('disabled:') ||
           classes.includes('cursor-not-allowed') ||
           classes.includes('opacity-50');
  }

  /**
   * Check if a button is in loading state
   */
  async isButtonLoading(button: Locator): Promise<boolean> {
    const classes = await button.getAttribute('class') || '';
    const hasLoadingIndicator = await button.locator('.animate-pulse, .animate-bounce, .animate-spin').count() > 0;
    
    return classes.includes('cursor-wait') || 
           classes.includes('animate-pulse') ||
           hasLoadingIndicator;
  }

  /**
   * Check if button has cooldown state
   */
  async isButtonInCooldown(button: Locator): Promise<boolean> {
    const text = await button.textContent() || '';
    const titleText = await button.locator('h3').textContent() || '';
    const descriptionText = await button.locator('p').textContent() || '';
    
    return text.includes('(cooldown)') ||
           titleText.includes('(cooldown)') ||
           descriptionText.includes('Please wait before launching');
  }

  /**
   * Wait for button to be ready (not disabled, loading, or in cooldown)
   */
  async waitForButtonReady(button: Locator, timeout: number = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const isDisabled = await this.isButtonDisabled(button);
      const isLoading = await this.isButtonLoading(button);
      const inCooldown = await this.isButtonInCooldown(button);
      
      if (!isDisabled && !isLoading && !inCooldown) {
        return;
      }
      
      await this.page.waitForTimeout(500);
    }
    
    throw new Error(`Button did not become ready within ${timeout}ms`);
  }

  /**
   * Wait for button to enter disabled state
   */
  async waitForButtonDisabled(button: Locator, timeout: number = 10000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const isDisabled = await this.isButtonDisabled(button);
      if (isDisabled) return;
      
      await this.page.waitForTimeout(100);
    }
    
    throw new Error(`Button did not become disabled within ${timeout}ms`);
  }

  /**
   * Wait for button to enter cooldown state
   */
  async waitForButtonCooldown(button: Locator, timeout: number = 5000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const inCooldown = await this.isButtonInCooldown(button);
      if (inCooldown) return;
      
      await this.page.waitForTimeout(100);
    }
    
    throw new Error(`Button did not enter cooldown within ${timeout}ms`);
  }

  /**
   * Wait for rate limiting warning to appear
   */
  async waitForRateLimitWarning(timeout: number = 10000): Promise<void> {
    await this.rateLimitWarning.waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for rate limiting warning to disappear
   */
  async waitForRateLimitWarningGone(timeout: number = 65000): Promise<void> {
    await this.rateLimitWarning.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Click button and measure response time
   */
  async clickButtonWithTiming(button: Locator): Promise<{ success: boolean; responseTime: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      await button.click();
      const responseTime = Date.now() - startTime;
      return { success: true, responseTime };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return { success: false, responseTime, error: error.message };
    }
  }

  /**
   * Perform rapid clicking test
   */
  async performRapidClicking(button: Locator, clickCount: number, intervalMs: number = 100): Promise<{
    clicks: Array<{ timestamp: number; success: boolean; responseTime: number; error?: string }>;
    totalTime: number;
  }> {
    const clicks: Array<{ timestamp: number; success: boolean; responseTime: number; error?: string }> = [];
    const startTime = Date.now();
    
    for (let i = 0; i < clickCount; i++) {
      const clickStart = Date.now();
      const result = await this.clickButtonWithTiming(button);
      
      clicks.push({
        timestamp: clickStart - startTime,
        success: result.success,
        responseTime: result.responseTime,
        error: result.error
      });
      
      if (i < clickCount - 1) {
        await this.page.waitForTimeout(intervalMs);
      }
    }
    
    return {
      clicks,
      totalTime: Date.now() - startTime
    };
  }

  /**
   * Check visual state of button
   */
  async getButtonVisualState(button: Locator): Promise<{
    backgroundColor: string;
    opacity: string;
    cursor: string;
    transform: string;
    disabled: boolean;
    classes: string;
  }> {
    const classes = await button.getAttribute('class') || '';
    const disabled = await this.isButtonDisabled(button);
    
    // Get computed styles
    const styles = await button.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        opacity: computed.opacity,
        cursor: computed.cursor,
        transform: computed.transform
      };
    });
    
    return {
      ...styles,
      disabled,
      classes
    };
  }

  /**
   * Take screenshot of button for visual regression
   */
  async screenshotButton(button: Locator, name: string): Promise<Buffer> {
    return await button.screenshot({ path: `test-results/screenshots/${name}.png` });
  }

  /**
   * Force component re-render by triggering React state updates
   */
  async triggerComponentRerender(): Promise<void> {
    // Trigger re-render by changing viewport size
    await this.page.setViewportSize({ width: 1281, height: 721 });
    await this.page.waitForTimeout(100);
    await this.page.setViewportSize({ width: 1280, height: 720 });
    await this.page.waitForTimeout(100);
    
    // Trigger re-render by focusing/blurring elements
    await this.page.keyboard.press('Tab');
    await this.page.waitForTimeout(50);
    await this.page.keyboard.press('Shift+Tab');
    await this.page.waitForTimeout(50);
  }

  /**
   * Monitor console logs for rate limiting messages
   */
  async monitorRateLimitingLogs(): Promise<string[]> {
    const logs: string[] = [];
    
    this.page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('rate limit') || 
          text.includes('debounce') || 
          text.includes('cooldown') ||
          text.includes('Button click')) {
        logs.push(text);
      }
    });
    
    return logs;
  }

  /**
   * Verify button accessibility
   */
  async verifyButtonAccessibility(button: Locator): Promise<{
    hasAriaLabel: boolean;
    hasFocusIndicator: boolean;
    hasKeyboardSupport: boolean;
    hasProperRole: boolean;
  }> {
    const ariaLabel = await button.getAttribute('aria-label');
    const role = await button.getAttribute('role');
    
    // Test focus indicator
    await button.focus();
    await this.page.waitForTimeout(100);
    const focusedStyles = await button.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        outline: computed.outline,
        boxShadow: computed.boxShadow,
        borderColor: computed.borderColor
      };
    });
    
    // Test keyboard interaction
    let keyboardSupport = false;
    try {
      await button.press('Enter');
      keyboardSupport = true;
    } catch (error) {
      try {
        await button.press('Space');
        keyboardSupport = true;
      } catch (error) {
        // Keyboard support not detected
      }
    }
    
    return {
      hasAriaLabel: ariaLabel !== null && ariaLabel.trim() !== '',
      hasFocusIndicator: focusedStyles.outline !== 'none' || focusedStyles.boxShadow !== 'none',
      hasKeyboardSupport: keyboardSupport,
      hasProperRole: role === null || role === 'button' // null is acceptable for button elements
    };
  }
}