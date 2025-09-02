import { Page, Locator, expect } from '@playwright/test';

export class AgentFeedPage {
  readonly page: Page;
  readonly createInstanceButton: Locator;
  readonly instancesList: Locator;
  readonly commandInput: Locator;
  readonly sendButton: Locator;
  readonly terminalOutput: Locator;
  readonly loadingAnimations: Locator;
  readonly toolCallBullets: Locator;
  readonly permissionDialog: Locator;
  readonly websocketStatus: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createInstanceButton = page.getByRole('button', { name: /create instance/i });
    this.instancesList = page.locator('[data-testid="instances-list"]');
    this.commandInput = page.locator('[data-testid="command-input"]');
    this.sendButton = page.getByRole('button', { name: /send/i });
    this.terminalOutput = page.locator('[data-testid="terminal-output"]');
    this.loadingAnimations = page.locator('.loading-animation');
    this.toolCallBullets = page.locator('[data-testid="tool-call-bullet"]');
    this.permissionDialog = page.locator('[data-testid="permission-dialog"]');
    this.websocketStatus = page.locator('[data-testid="websocket-status"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async createNewInstance() {
    await this.createInstanceButton.click();
    
    // Wait for loading animation to appear
    await expect(this.loadingAnimations.first()).toBeVisible();
    
    // Wait for instance to be created (loading animation disappears)
    await expect(this.loadingAnimations.first()).toBeHidden({ timeout: 30000 });
    
    // Verify instance appears in list
    await expect(this.instancesList.locator('.instance-item').first()).toBeVisible();
  }

  async executeCommand(command: string) {
    await this.commandInput.fill(command);
    await this.sendButton.click();
    
    // Wait for command to be processed
    await this.page.waitForTimeout(1000);
  }

  async executeComplexCommand(command: string, expectPermissionDialog = false) {
    await this.commandInput.fill(command);
    await this.sendButton.click();
    
    if (expectPermissionDialog) {
      await expect(this.permissionDialog).toBeVisible();
      // Handle permission dialog
      await this.page.getByRole('button', { name: /allow/i }).click();
    }
    
    // Wait for tool call bullets to appear
    await expect(this.toolCallBullets.first()).toBeVisible({ timeout: 15000 });
  }

  async waitForWebSocketConnection() {
    await expect(this.websocketStatus).toHaveText(/connected/i, { timeout: 10000 });
  }

  async verifyToolCallVisualization() {
    // Verify tool call bullets are visible
    await expect(this.toolCallBullets.first()).toBeVisible();
    
    // Verify bullet has proper styling
    const bullet = this.toolCallBullets.first();
    await expect(bullet).toHaveClass(/tool-call-bullet/);
    
    // Verify bullet contains expected content
    await expect(bullet).toContainText(/•/);
  }

  async verifyLoadingAnimation() {
    const animation = this.loadingAnimations.first();
    await expect(animation).toBeVisible();
    
    // Verify animation has proper CSS classes
    await expect(animation).toHaveClass(/loading-animation/);
    
    // Verify animation eventually disappears
    await expect(animation).toBeHidden({ timeout: 30000 });
  }

  async verifyErrorHandling() {
    // Check if error message is displayed
    if (await this.errorMessage.isVisible()) {
      const errorText = await this.errorMessage.textContent();
      console.log('Error detected:', errorText);
      
      // Verify error message is user-friendly
      expect(errorText).not.toContain('undefined');
      expect(errorText).not.toContain('null');
    }
  }

  async getInstancePID(): Promise<string | null> {
    const pidElement = this.page.locator('[data-testid="instance-pid"]').first();
    if (await pidElement.isVisible()) {
      return await pidElement.textContent();
    }
    return null;
  }

  async waitForCommandCompletion(timeout = 30000) {
    // Wait for command execution to complete
    await this.page.waitForFunction(
      () => {
        const loadingElements = document.querySelectorAll('.loading-animation:not([style*="display: none"])');
        return loadingElements.length === 0;
      },
      { timeout }
    );
  }

  async captureScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `tests/e2e/screenshots/${name}.png`,
      fullPage: true 
    });
  }

  async simulateNetworkFailure() {
    // Simulate network failure for WebSocket testing
    await this.page.route('ws://localhost:*', route => route.abort());
    await this.page.route('wss://localhost:*', route => route.abort());
  }

  async restoreNetwork() {
    // Restore network connections
    await this.page.unroute('ws://localhost:*');
    await this.page.unroute('wss://localhost:*');
  }
}