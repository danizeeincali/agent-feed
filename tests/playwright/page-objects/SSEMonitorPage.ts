import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for SSE Monitoring and Claude Instance Interaction
 * Provides high-level methods for testing SSE behavior and detecting buffer storms
 */
export class SSEMonitorPage {
  readonly page: Page;
  readonly instanceManager: Locator;
  readonly createProdButton: Locator;
  readonly createSkipPermissionsButton: Locator;
  readonly createSkipPermissionsCButton: Locator;
  readonly createSkipPermissionsResumeButton: Locator;
  readonly instancesList: Locator;
  readonly outputArea: Locator;
  readonly inputField: Locator;
  readonly sendButton: Locator;
  readonly connectionStatus: Locator;

  constructor(page: Page) {
    this.page = page;
    this.instanceManager = page.locator('[data-testid="claude-instance-manager"]');
    this.createProdButton = page.locator('button:has-text("prod/claude")');
    this.createSkipPermissionsButton = page.locator('button:has-text("skip-permissions")');
    this.createSkipPermissionsCButton = page.locator('button:has-text("skip-permissions -c")');
    this.createSkipPermissionsResumeButton = page.locator('button:has-text("skip-permissions --resume")');
    this.instancesList = page.locator('.instances-list');
    this.outputArea = page.locator('.output-area pre');
    this.inputField = page.locator('.input-field');
    this.sendButton = page.locator('.btn-send');
    this.connectionStatus = page.locator('.connection-status');
  }

  async navigateToManager(): Promise<void> {
    await this.page.goto('/claude-instances');
    await this.page.waitForLoadState('networkidle');
    await expect(this.instanceManager).toBeVisible();
  }

  async createInstance(type: 'prod' | 'skip-permissions' | 'skip-permissions-c' | 'skip-permissions-resume'): Promise<string> {
    let button: Locator;
    
    switch (type) {
      case 'prod':
        button = this.createProdButton;
        break;
      case 'skip-permissions':
        button = this.createSkipPermissionsButton;
        break;
      case 'skip-permissions-c':
        button = this.createSkipPermissionsCButton;
        break;
      case 'skip-permissions-resume':
        button = this.createSkipPermissionsResumeButton;
        break;
    }

    await button.click();
    
    // Wait for instance to appear
    await expect(this.page.locator('.instance-item')).toBeVisible({ timeout: 15000 });
    
    // Extract instance ID
    const instanceElement = await this.page.locator('.instance-item').first();
    const instanceText = await instanceElement.textContent();
    const instanceId = instanceText?.match(/ID: ([a-zA-Z0-9-]+)/)?.[1];
    
    if (!instanceId) {
      throw new Error('Failed to extract instance ID from UI');
    }
    
    console.log(`✅ Created Claude instance: ${instanceId} (type: ${type})`);
    return instanceId;
  }

  async selectInstance(instanceId: string): Promise<void> {
    const instanceElement = this.page.locator(`.instance-item:has-text("${instanceId.slice(0, 8)}")`);
    await instanceElement.click();
    
    // Wait for status to be running
    await expect(this.page.locator('.status-running')).toBeVisible({ timeout: 30000 });
    console.log(`✅ Selected and activated instance: ${instanceId}`);
  }

  async sendCommand(command: string): Promise<void> {
    await this.inputField.fill(command);
    await this.inputField.press('Enter');
    console.log(`⌨️ Sent command: ${command}`);
  }

  async waitForOutput(timeout: number = 5000): Promise<string> {
    await this.page.waitForTimeout(timeout);
    const output = await this.outputArea.textContent();
    return output || '';
  }

  async getConnectionStatus(): Promise<string> {
    const status = await this.connectionStatus.textContent();
    return status || 'Unknown';
  }

  async waitForConnection(): Promise<void> {
    await expect(this.connectionStatus).toContainText('Connected', { timeout: 10000 });
    console.log('✅ SSE connection established');
  }

  async terminateInstance(instanceId: string): Promise<void> {
    const terminateButton = this.page.locator(`.instance-item:has-text("${instanceId.slice(0, 8)}") .btn-terminate`);
    await terminateButton.click();
    
    // Wait for instance to disappear
    await expect(this.page.locator(`.instance-item:has-text("${instanceId.slice(0, 8)}")`)).not.toBeVisible({ timeout: 10000 });
    console.log(`✅ Terminated instance: ${instanceId}`);
  }

  async getActiveInstanceCount(): Promise<number> {
    const instances = await this.page.locator('.instance-item').count();
    return instances;
  }

  async getRunningInstanceCount(): Promise<number> {
    const runningInstances = await this.page.locator('.instance-item.status-running').count();
    return runningInstances;
  }

  async isSSEConnected(): Promise<boolean> {
    const status = await this.getConnectionStatus();
    return status.includes('Connected via SSE') || status.includes('Connected');
  }

  async captureNetworkEvents(): Promise<void> {
    // Enable request interception for monitoring SSE calls
    await this.page.route('**/terminal/stream', (route) => {
      console.log(`🌐 SSE stream request: ${route.request().url()}`);
      route.continue();
    });
    
    await this.page.route('**/api/claude/instances/**', (route) => {
      console.log(`🌐 API request: ${route.request().method()} ${route.request().url()}`);
      route.continue();
    });
  }

  async enableConsoleLogging(): Promise<void> {
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`❌ Browser console error: ${msg.text()}`);
      } else if (msg.text().includes('Claude output') || msg.text().includes('SSE')) {
        console.log(`📊 Browser: ${msg.text()}`);
      }
    });
  }

  async checkForErrors(): Promise<string[]> {
    const errors: string[] = [];
    
    // Check for error messages in UI
    const errorElements = await this.page.locator('.error').all();
    for (const element of errorElements) {
      const errorText = await element.textContent();
      if (errorText) {
        errors.push(errorText);
      }
    }
    
    return errors;
  }

  async measurePageMemory(): Promise<{ usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } | null> {
    try {
      const memoryInfo = await this.page.evaluate(() => {
        if ('memory' in performance) {
          return {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
            jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
          };
        }
        return null;
      });
      return memoryInfo;
    } catch (error) {
      console.warn('Memory measurement not available in this browser');
      return null;
    }
  }
}
