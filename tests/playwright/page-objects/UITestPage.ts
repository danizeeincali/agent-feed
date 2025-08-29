import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for UI Test Automation
 * 
 * This class provides reusable methods for interacting with the frontend UI
 * and includes comprehensive error checking and state validation.
 */
export class UITestPage {
  readonly page: Page;
  
  // Navigation elements
  readonly socialMediaFeedLink: Locator;
  readonly agentManagerLink: Locator;
  readonly claudeInstancesLink: Locator;
  readonly analyticsLink: Locator;
  readonly settingsLink: Locator;
  
  // Claude Instance elements
  readonly createInstanceButton: Locator;
  readonly refreshInstancesButton: Locator;
  readonly instanceList: Locator;
  readonly instanceCards: Locator;
  
  // Instance type buttons
  readonly createCodingInstanceButton: Locator;
  readonly createResearchInstanceButton: Locator;
  readonly createAnalysisInstanceButton: Locator;
  readonly createCreativeInstanceButton: Locator;
  
  // Terminal elements
  readonly terminalContainer: Locator;
  readonly terminalInput: Locator;
  readonly terminalOutput: Locator;
  
  // Form elements
  readonly instanceNameInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  
  // Error and status elements
  readonly errorMessages: Locator;
  readonly successMessages: Locator;
  readonly loadingSpinners: Locator;
  readonly statusIndicators: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Navigation links
    this.socialMediaFeedLink = page.locator('text="Social Media Feed"');
    this.agentManagerLink = page.locator('text="Agent Manager"');
    this.claudeInstancesLink = page.locator('text="Claude Instances"');
    this.analyticsLink = page.locator('text="Analytics"');
    this.settingsLink = page.locator('text="Settings"');
    
    // Claude Instance buttons
    this.createInstanceButton = page.locator('button:has-text("Create New Instance"), button:has-text("Create Instance")');
    this.refreshInstancesButton = page.locator('button:has-text("Refresh Instances"), button:has-text("Refresh")');
    this.instanceList = page.locator('[data-testid="instance-list"], .instance-list, .instances-container');
    this.instanceCards = page.locator('.instance-card, .instance-item, [data-testid="instance-card"]');
    
    // Instance type buttons
    this.createCodingInstanceButton = page.locator('[data-testid="create-coding-instance"], button:has-text("Coding Assistant")');
    this.createResearchInstanceButton = page.locator('[data-testid="create-research-instance"], button:has-text("Research Helper")');
    this.createAnalysisInstanceButton = page.locator('[data-testid="create-analysis-instance"], button:has-text("Data Analyst")');
    this.createCreativeInstanceButton = page.locator('[data-testid="create-creative-instance"], button:has-text("Creative Writer")');
    
    // Terminal elements
    this.terminalContainer = page.locator('[data-testid="terminal"], .terminal-container, .xterm-viewport');
    this.terminalInput = page.locator('textarea[placeholder*="command"], input[placeholder*="terminal"], .terminal-input');
    this.terminalOutput = page.locator('.terminal-output, .xterm-rows');
    
    // Form elements
    this.instanceNameInput = page.locator('input[placeholder*="instance"], input[name*="name"], input[name="instanceName"]');
    this.submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Create")');
    this.cancelButton = page.locator('button:has-text("Cancel"), button[type="button"]:has-text("Close")');
    
    // Status and error elements
    this.errorMessages = page.locator('.error, .alert-error, .error-message, [role="alert"]');
    this.successMessages = page.locator('.success, .alert-success, .success-message');
    this.loadingSpinners = page.locator('.loading, .spinner, .loader, [data-testid="loading"]');
    this.statusIndicators = page.locator('.status, .badge, .indicator');
  }

  /**
   * Navigate to the application home page
   */
  async navigateToHome(): Promise<void> {
    await this.page.goto('/', { waitUntil: 'networkidle' });
    await this.waitForPageLoad();
  }

  /**
   * Navigate to Claude Instances page
   */
  async navigateToClaudeInstances(): Promise<void> {
    await this.claudeInstancesLink.click();
    await this.waitForPageLoad();
  }

  /**
   * Navigate to Analytics page
   */
  async navigateToAnalytics(): Promise<void> {
    await this.analyticsLink.click();
    await this.waitForPageLoad();
  }

  /**
   * Navigate to Settings page
   */
  async navigateToSettings(): Promise<void> {
    await this.settingsLink.click();
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Wait for any loading spinners to disappear
    if (await this.loadingSpinners.count() > 0) {
      await this.loadingSpinners.first().waitFor({ state: 'hidden', timeout: 10000 });
    }
  }

  /**
   * Check for JavaScript errors on the page
   */
  async getJavaScriptErrors(): Promise<string[]> {
    const errors: string[] = [];
    
    this.page.on('pageerror', (error) => {
      errors.push(`Page error: ${error.message}`);
    });
    
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(`Console error: ${msg.text()}`);
      }
    });
    
    return errors;
  }

  /**
   * Click a button safely with error handling
   */
  async clickButtonSafely(locator: Locator, timeout = 10000): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout });
      await locator.click();
      await this.page.waitForTimeout(500);
      return true;
    } catch (error) {
      console.error('Failed to click button:', error);
      return false;
    }
  }

  /**
   * Create a new Claude instance
   */
  async createNewInstance(instanceName = 'Test Instance'): Promise<boolean> {
    try {
      // Click create instance button
      const createClicked = await this.clickButtonSafely(this.createInstanceButton);
      if (!createClicked) return false;

      // Fill instance name if input is available
      if (await this.instanceNameInput.isVisible()) {
        await this.instanceNameInput.fill(instanceName);
      }

      // Submit form
      const submitClicked = await this.clickButtonSafely(this.submitButton);
      if (!submitClicked) return false;

      // Wait for instance creation to complete
      await this.page.waitForTimeout(2000);
      
      return true;
    } catch (error) {
      console.error('Failed to create instance:', error);
      return false;
    }
  }

  /**
   * Create instance of specific type
   */
  async createInstanceOfType(type: 'coding' | 'research' | 'analysis' | 'creative'): Promise<boolean> {
    const buttonMap = {
      coding: this.createCodingInstanceButton,
      research: this.createResearchInstanceButton,
      analysis: this.createAnalysisInstanceButton,
      creative: this.createCreativeInstanceButton
    };

    const button = buttonMap[type];
    return await this.clickButtonSafely(button);
  }

  /**
   * Refresh instance list
   */
  async refreshInstances(): Promise<boolean> {
    return await this.clickButtonSafely(this.refreshInstancesButton);
  }

  /**
   * Get number of instances displayed
   */
  async getInstanceCount(): Promise<number> {
    await this.instanceCards.first().waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
    return await this.instanceCards.count();
  }

  /**
   * Check if terminal is available and functional
   */
  async testTerminalFunctionality(): Promise<boolean> {
    try {
      if (await this.terminalContainer.isVisible()) {
        // Try to interact with terminal
        await this.terminalContainer.click();
        
        if (await this.terminalInput.isVisible()) {
          await this.terminalInput.fill('echo "test"');
          await this.page.keyboard.press('Enter');
          await this.page.waitForTimeout(1000);
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Terminal test failed:', error);
      return false;
    }
  }

  /**
   * Check for error messages on the page
   */
  async hasErrorMessages(): Promise<boolean> {
    const errorCount = await this.errorMessages.count();
    return errorCount > 0;
  }

  /**
   * Get all error messages
   */
  async getErrorMessages(): Promise<string[]> {
    const errors: string[] = [];
    const errorCount = await this.errorMessages.count();
    
    for (let i = 0; i < errorCount; i++) {
      const errorText = await this.errorMessages.nth(i).textContent();
      if (errorText) {
        errors.push(errorText);
      }
    }
    
    return errors;
  }

  /**
   * Check if success messages are displayed
   */
  async hasSuccessMessages(): Promise<boolean> {
    const successCount = await this.successMessages.count();
    return successCount > 0;
  }

  /**
   * Take a screenshot with a descriptive name
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}.png`,
      fullPage: true 
    });
  }

  /**
   * Wait for WebSocket connections to establish
   */
  async waitForWebSocketConnections(timeout = 10000): Promise<any[]> {
    const wsConnections: any[] = [];
    
    this.page.on('websocket', ws => {
      wsConnections.push(ws);
      console.log('WebSocket connection established:', ws.url());
    });

    // Wait for connections to establish
    await this.page.waitForTimeout(timeout);
    
    return wsConnections;
  }

  /**
   * Test rapid button clicks for debouncing
   */
  async testRapidButtonClicks(locator: Locator, clickCount = 5): Promise<boolean> {
    try {
      for (let i = 0; i < clickCount; i++) {
        await locator.click();
        await this.page.waitForTimeout(100);
      }
      return true;
    } catch (error) {
      console.error('Rapid click test failed:', error);
      return false;
    }
  }

  /**
   * Validate form submission with empty fields
   */
  async testFormValidation(): Promise<boolean> {
    try {
      // Try to submit form without filling required fields
      if (await this.submitButton.isVisible()) {
        await this.submitButton.click();
        await this.page.waitForTimeout(1000);
        
        // Check for validation messages
        return await this.hasErrorMessages();
      }
      return false;
    } catch (error) {
      console.error('Form validation test failed:', error);
      return false;
    }
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation(): Promise<boolean> {
    try {
      await this.page.keyboard.press('Tab');
      await this.page.waitForTimeout(500);
      
      // Continue tabbing through elements
      for (let i = 0; i < 5; i++) {
        await this.page.keyboard.press('Tab');
        await this.page.waitForTimeout(300);
      }
      
      return true;
    } catch (error) {
      console.error('Keyboard navigation test failed:', error);
      return false;
    }
  }

  /**
   * Check accessibility attributes
   */
  async checkAccessibilityAttributes(): Promise<number> {
    const ariaElements = await this.page.locator('[aria-label], [aria-labelledby], [role], [aria-describedby]').count();
    return ariaElements;
  }
}