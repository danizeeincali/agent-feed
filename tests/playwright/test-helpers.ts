import { Page, expect } from '@playwright/test';

/**
 * Test Helpers and Utilities for Claude Process Validation
 * 
 * Common utilities and helper functions for Playwright tests
 */

export interface ClaudeInstance {
  id: string;
  name: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  pid?: number;
}

export interface TestConfig {
  backendUrl: string;
  frontendUrl: string;
  timeout: {
    instanceCreation: number;
    statusChange: number;
    response: number;
    connection: number;
  };
}

export const DEFAULT_CONFIG: TestConfig = {
  backendUrl: 'http://localhost:3000',
  frontendUrl: 'http://localhost:3001',
  timeout: {
    instanceCreation: 30000,
    statusChange: 45000,
    response: 25000,
    connection: 15000
  }
};

/**
 * Claude Process Test Helper Class
 */
export class ClaudeTestHelper {
  constructor(private page: Page, private config: TestConfig = DEFAULT_CONFIG) {}

  /**
   * Wait for Claude Instance Manager to be ready
   */
  async waitForManagerReady(): Promise<void> {
    await this.page.waitForSelector('[data-testid="claude-instance-manager"]', {
      timeout: this.config.timeout.connection
    });

    // Ensure all launch buttons are visible
    const buttons = [
      'button:has-text("🚀 prod/claude")',
      'button:has-text("⚡ skip-permissions")',
      'button:has-text("⚡ skip-permissions -c")',
      'button:has-text("↻ skip-permissions --resume")'
    ];

    for (const button of buttons) {
      await expect(this.page.locator(button)).toBeVisible();
    }
  }

  /**
   * Create a Claude instance with specified button type
   */
  async createInstance(buttonType: 'prod' | 'skip-permissions' | 'skip-permissions-c' | 'skip-permissions-resume'): Promise<string> {
    const buttonSelectors = {
      'prod': 'button:has-text("🚀 prod/claude")',
      'skip-permissions': 'button:has-text("⚡ skip-permissions"):not(:has-text("-c")):not(:has-text("--resume"))',
      'skip-permissions-c': 'button:has-text("⚡ skip-permissions -c")',
      'skip-permissions-resume': 'button:has-text("↻ skip-permissions --resume")'
    };

    const buttonSelector = buttonSelectors[buttonType];
    
    // Click the button
    await this.page.click(buttonSelector);

    // Wait for button to show loading state
    await expect(this.page.locator(buttonSelector)).toBeDisabled();

    // Wait for instance to appear
    await this.page.waitForSelector('.instance-item', { 
      timeout: this.config.timeout.instanceCreation 
    });

    // Get the instance ID
    const instanceId = await this.page.locator('.instance-item .instance-id').first().textContent();
    if (!instanceId) {
      throw new Error('Failed to get instance ID');
    }

    return instanceId.replace('ID: ', '');
  }

  /**
   * Wait for instance to reach running status
   */
  async waitForRunningStatus(instanceId?: string): Promise<void> {
    const instanceSelector = instanceId 
      ? `.instance-item:has-text("${instanceId.slice(0, 8)}")`
      : '.instance-item';

    await expect(this.page.locator(`${instanceSelector} .status-text`))
      .toContainText('running', { timeout: this.config.timeout.statusChange });
  }

  /**
   * Select an instance for interaction
   */
  async selectInstance(instanceId: string): Promise<void> {
    const instanceSelector = `.instance-item:has-text("${instanceId.slice(0, 8)}")`;
    await this.page.click(instanceSelector);

    // Verify output area becomes visible
    await expect(this.page.locator('.output-area')).toBeVisible();
  }

  /**
   * Send command to selected instance
   */
  async sendCommand(command: string, waitForResponse: boolean = true): Promise<string> {
    const initialOutput = await this.page.locator('.output-area pre').textContent() || '';
    const initialLength = initialOutput.length;

    // Send the command
    await this.page.fill('.input-field', command);
    await this.page.press('.input-field', 'Enter');

    // Verify input is cleared
    await expect(this.page.locator('.input-field')).toHaveValue('');

    if (waitForResponse) {
      // Wait for output to change
      await this.page.waitForFunction((prevLength) => {
        const outputArea = document.querySelector('.output-area pre');
        return outputArea && outputArea.textContent && 
               outputArea.textContent.length > prevLength + 5;
      }, initialLength, { timeout: this.config.timeout.response });

      return await this.page.locator('.output-area pre').textContent() || '';
    }

    return initialOutput;
  }

  /**
   * Get current output content
   */
  async getOutput(): Promise<string> {
    return await this.page.locator('.output-area pre').textContent() || '';
  }

  /**
   * Wait for connection status
   */
  async waitForConnectionStatus(expectedStatus: string | RegExp): Promise<void> {
    if (typeof expectedStatus === 'string') {
      await expect(this.page.locator('.connection-status')).toContainText(expectedStatus, {
        timeout: this.config.timeout.connection
      });
    } else {
      const statusText = await this.page.locator('.connection-status').textContent();
      expect(statusText).toMatch(expectedStatus);
    }
  }

  /**
   * Terminate an instance
   */
  async terminateInstance(instanceId: string): Promise<void> {
    const instanceSelector = `.instance-item:has-text("${instanceId.slice(0, 8)}")`;
    await this.page.click(`${instanceSelector} .btn-terminate`);

    // Wait for instance to disappear
    await expect(this.page.locator(instanceSelector)).not.toBeVisible({ timeout: 10000 });
  }

  /**
   * Get all current instances
   */
  async getInstances(): Promise<ClaudeInstance[]> {
    const instances = await this.page.evaluate(() => {
      const items = document.querySelectorAll('.instance-item');
      return Array.from(items).map(item => {
        const nameEl = item.querySelector('.instance-name');
        const statusEl = item.querySelector('.status-text');
        const idEl = item.querySelector('.instance-id');

        return {
          name: nameEl?.textContent || '',
          status: statusEl?.textContent as any || 'unknown',
          id: idEl?.textContent?.replace('ID: ', '') || ''
        };
      });
    });

    return instances;
  }

  /**
   * Clean up all instances
   */
  async cleanupInstances(): Promise<void> {
    try {
      const instances = await this.page.evaluate(async (backendUrl) => {
        const response = await fetch(`${backendUrl}/api/claude/instances`);
        const data = await response.json();
        return data.instances || [];
      }, this.config.backendUrl);

      for (const instance of instances) {
        await this.page.evaluate(async (instanceId, backendUrl) => {
          await fetch(`${backendUrl}/api/claude/instances/${instanceId}`, {
            method: 'DELETE'
          });
        }, instance.id, this.config.backendUrl);
      }

      // Wait for cleanup to complete
      await this.page.waitForTimeout(2000);
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  }

  /**
   * Verify no error messages are displayed
   */
  async verifyNoErrors(): Promise<void> {
    await expect(this.page.locator('.error')).not.toBeVisible();
  }

  /**
   * Wait for and verify error message
   */
  async verifyError(expectedError?: string | RegExp): Promise<void> {
    await expect(this.page.locator('.error')).toBeVisible({ timeout: 10000 });

    if (expectedError) {
      if (typeof expectedError === 'string') {
        await expect(this.page.locator('.error')).toContainText(expectedError);
      } else {
        const errorText = await this.page.locator('.error').textContent();
        expect(errorText).toMatch(expectedError);
      }
    }
  }

  /**
   * Mock API responses for testing error scenarios
   */
  async mockApiResponse(endpoint: string, response: any, status: number = 200): Promise<void> {
    await this.page.route(`**${endpoint}`, (route) => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Mock API failure
   */
  async mockApiFailure(endpoint: string, errorType: 'network' | 'timeout' | 'server' = 'network'): Promise<void> {
    await this.page.route(`**${endpoint}`, (route) => {
      switch (errorType) {
        case 'network':
          route.abort('failed');
          break;
        case 'timeout':
          route.abort('timedout');
          break;
        case 'server':
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, error: 'Internal server error' })
          });
          break;
      }
    });
  }

  /**
   * Remove API mocking
   */
  async clearApiMocks(endpoint?: string): Promise<void> {
    if (endpoint) {
      await this.page.unroute(`**${endpoint}`);
    } else {
      await this.page.unroute('**/*');
    }
  }

  /**
   * Take screenshot for debugging
   */
  async takeDebugScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ 
      path: `test-results/debug-${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  /**
   * Log current page state for debugging
   */
  async logPageState(): Promise<void> {
    const instances = await this.getInstances();
    const connectionStatus = await this.page.locator('.connection-status').textContent();
    const errorVisible = await this.page.locator('.error').isVisible();
    
    console.log('=== Page State ===');
    console.log('Instances:', instances);
    console.log('Connection Status:', connectionStatus);
    console.log('Error Visible:', errorVisible);
    
    if (errorVisible) {
      const errorText = await this.page.locator('.error').textContent();
      console.log('Error Text:', errorText);
    }
  }
}

/**
 * Utility functions for common test operations
 */
export class TestUtils {
  /**
   * Generate unique test command
   */
  static generateTestCommand(prefix: string = 'test'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Wait for condition with timeout
   */
  static async waitForCondition(
    condition: () => Promise<boolean>,
    timeout: number = 30000,
    interval: number = 1000
  ): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Retry operation with exponential backoff
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
}