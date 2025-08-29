import { Page, Locator, expect } from '@playwright/test';

export class ClaudeInstancePage {
  readonly page: Page;
  readonly claudeWorkingButton: Locator;
  readonly claudeProdButton: Locator;
  readonly claudeSourceButton: Locator;
  readonly claudeTestsButton: Locator;
  readonly terminalContainer: Locator;
  readonly statusIndicator: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.claudeWorkingButton = page.locator('[data-testid="claude-working-button"]').or(
      page.locator('button:has-text("Claude (Working)")'));
    this.claudeProdButton = page.locator('[data-testid="claude-prod-button"]').or(
      page.locator('button:has-text("Claude (Prod)")'));
    this.claudeSourceButton = page.locator('[data-testid="claude-source-button"]').or(
      page.locator('button:has-text("Claude (Source)")'));
    this.claudeTestsButton = page.locator('[data-testid="claude-tests-button"]').or(
      page.locator('button:has-text("Claude (Tests)")'));
    this.terminalContainer = page.locator('[data-testid="terminal-container"]').or(
      page.locator('.terminal-container, .xterm, .terminal'));
    this.statusIndicator = page.locator('[data-testid="status-indicator"]').or(
      page.locator('.status-indicator, .status'));
    this.errorMessage = page.locator('[data-testid="error-message"]').or(
      page.locator('.error-message, .error'));
  }

  async goto() {
    await this.page.goto('/');
  }

  async clickClaudeWorkingButton() {
    await this.claudeWorkingButton.click();
  }

  async clickClaudeProdButton() {
    await this.claudeProdButton.click();
  }

  async clickClaudeSourceButton() {
    await this.claudeSourceButton.click();
  }

  async clickClaudeTestsButton() {
    await this.claudeTestsButton.click();
  }

  async waitForClaudeInstance(timeout = 30000) {
    // Wait for terminal to appear
    await this.terminalContainer.waitFor({ state: 'visible', timeout });
    
    // Wait for Claude welcome message
    await this.page.waitForFunction(
      () => document.body.textContent?.includes('✻ Welcome to Claude Code!'),
      { timeout }
    );
  }

  async waitForWorkingDirectory(expectedPath: string, timeout = 15000) {
    await this.page.waitForFunction(
      (path) => document.body.textContent?.includes(`cwd: ${path}`),
      expectedPath,
      { timeout }
    );
  }

  async waitForInteractivePrompt(timeout = 15000) {
    await this.page.waitForFunction(
      () => document.body.textContent?.includes('> '),
      { timeout }
    );
  }

  async waitForStatusChange(expectedStatus: string, timeout = 30000) {
    await this.page.waitForFunction(
      (status) => document.body.textContent?.includes(status),
      expectedStatus,
      { timeout }
    );
  }

  async getTerminalContent(): Promise<string> {
    return await this.terminalContainer.textContent() || '';
  }

  async getStatusText(): Promise<string> {
    return await this.statusIndicator.textContent() || '';
  }

  async hasWelcomeMessage(): Promise<boolean> {
    const content = await this.getTerminalContent();
    return content.includes('✻ Welcome to Claude Code!');
  }

  async hasWorkingDirectory(expectedPath: string): Promise<boolean> {
    const content = await this.getTerminalContent();
    return content.includes(`cwd: ${expectedPath}`);
  }

  async hasInteractivePrompt(): Promise<boolean> {
    const content = await this.getTerminalContent();
    return content.includes('> ');
  }

  async hasErrorMessage(errorText?: string): Promise<boolean> {
    const content = await this.getTerminalContent();
    if (errorText) {
      return content.includes(errorText);
    }
    return content.includes('Error') || content.includes('error') || content.includes('--print requires input');
  }

  async typeInTerminal(text: string) {
    await this.terminalContainer.click();
    await this.page.keyboard.type(text);
  }

  async pressEnterInTerminal() {
    await this.terminalContainer.click();
    await this.page.keyboard.press('Enter');
  }

  async sendCommand(command: string) {
    await this.typeInTerminal(command);
    await this.pressEnterInTerminal();
  }

  async waitForCommandResponse(timeout = 10000) {
    // Wait for a moment to allow command processing
    await this.page.waitForTimeout(1000);
    
    // Wait for new output or prompt
    await this.page.waitForFunction(
      () => {
        const content = document.body.textContent || '';
        return content.includes('> ') || content.includes('$');
      },
      { timeout }
    );
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `screenshots/${name}.png`,
      fullPage: true 
    });
  }

  async verifyNoErrors() {
    const hasError = await this.hasErrorMessage();
    expect(hasError).toBeFalsy();
  }

  async verifyClaudeProcess() {
    await expect(async () => {
      const hasWelcome = await this.hasWelcomeMessage();
      const hasPrompt = await this.hasInteractivePrompt();
      expect(hasWelcome).toBeTruthy();
      expect(hasPrompt).toBeTruthy();
    }).toPass({ timeout: 30000 });
  }
}