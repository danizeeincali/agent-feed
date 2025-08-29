import { test, expect, Page } from '@playwright/test';
import { ClaudeManagerPage } from '../page-objects/ClaudeManagerPage';
import { TerminalPage } from '../page-objects/TerminalPage';

test.describe('Claude Instance Creation Tests', () => {
  let claudeManagerPage: ClaudeManagerPage;
  let terminalPage: TerminalPage;

  test.beforeEach(async ({ page }) => {
    claudeManagerPage = new ClaudeManagerPage(page);
    terminalPage = new TerminalPage(page);
    await claudeManagerPage.goto();
  });

  test.afterEach(async ({ page }) => {
    // Cleanup any running instances
    await claudeManagerPage.cleanupInstances();
  });

  test('should create real Claude instance with prod/claude button', async ({ page }) => {
    // Click the prod/claude button
    await claudeManagerPage.clickProdClaudeButton();
    
    // Verify status progression: starting → running
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    
    // Verify instance appears in correct directory
    const instanceDirectory = await claudeManagerPage.getInstanceDirectory();
    expect(instanceDirectory).toContain('/workspaces/agent-feed/prod');
    
    // Verify Claude welcome message
    await terminalPage.waitForClaudeWelcome();
    expect(await terminalPage.getTerminalContent()).toContain('✻ Welcome to Claude Code!');
    
    // Verify working directory is correct
    expect(await terminalPage.getTerminalContent()).toContain('cwd: /workspaces/agent-feed/prod');
    
    // Verify interactive prompt appears
    await terminalPage.waitForInteractivePrompt();
    expect(await terminalPage.hasInteractivePrompt()).toBe(true);
  });

  test('should work with skip-permissions button', async ({ page }) => {
    // Click skip-permissions button
    await claudeManagerPage.clickSkipPermissionsButton();
    
    // Verify no authentication errors
    await expect(page.locator('.error-message')).not.toBeVisible();
    
    // Verify status progression
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    
    // Verify Claude starts successfully
    await terminalPage.waitForClaudeWelcome();
    expect(await terminalPage.getTerminalContent()).toContain('✻ Welcome to Claude Code!');
  });

  test('should work with skip-permissions -c button (continue flag)', async ({ page }) => {
    // Click skip-permissions -c button
    await claudeManagerPage.clickSkipPermissionsContinueButton();
    
    // Verify continue flag is applied
    const commandUsed = await claudeManagerPage.getLastCommand();
    expect(commandUsed).toContain('-c');
    
    // Verify status progression
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    
    // Verify Claude starts with continue functionality
    await terminalPage.waitForClaudeWelcome();
    expect(await terminalPage.getTerminalContent()).toContain('✻ Welcome to Claude Code!');
  });

  test('should work with skip-permissions --resume button', async ({ page }) => {
    // Click skip-permissions --resume button
    await claudeManagerPage.clickSkipPermissionsResumeButton();
    
    // Verify resume flag is applied
    const commandUsed = await claudeManagerPage.getLastCommand();
    expect(commandUsed).toContain('--resume');
    
    // Verify status progression
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    
    // Verify Claude starts with resume functionality
    await terminalPage.waitForClaudeWelcome();
    expect(await terminalPage.getTerminalContent()).toContain('✻ Welcome to Claude Code!');
  });

  test('should display all button states correctly', async ({ page }) => {
    // Test each button shows correct initial state
    const buttons = await claudeManagerPage.getAllButtons();
    
    for (const button of buttons) {
      const buttonText = await button.textContent();
      expect(buttonText).not.toContain('starting');
      expect(buttonText).not.toContain('running');
    }
    
    // Click first button and verify state change
    await claudeManagerPage.clickProdClaudeButton();
    
    // Verify button shows "starting" state
    await expect(claudeManagerPage.prodClaudeButton).toContainText('starting');
    
    // Wait for "running" state
    await expect(claudeManagerPage.prodClaudeButton).toContainText('running', { timeout: 30000 });
  });

  test('should handle multiple button clicks gracefully', async ({ page }) => {
    // Click prod/claude button
    await claudeManagerPage.clickProdClaudeButton();
    
    // Try to click it again while starting
    await expect(claudeManagerPage.prodClaudeButton).toBeDisabled();
    
    // Wait for running state
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    
    // Verify only one instance is created
    const instanceCount = await claudeManagerPage.getActiveInstanceCount();
    expect(instanceCount).toBe(1);
  });

  test('should validate Claude directory context', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    
    // Wait for Claude to initialize
    await terminalPage.waitForClaudeWelcome();
    
    // Send pwd command to verify directory
    await terminalPage.sendInput('pwd');
    await terminalPage.waitForResponse();
    
    // Verify working directory matches expected
    const terminalContent = await terminalPage.getTerminalContent();
    expect(terminalContent).toContain('/workspaces/agent-feed/prod');
  });

  test('should not show --print requires input errors', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    
    // Wait for initialization
    await terminalPage.waitForClaudeWelcome();
    
    // Check for the specific error that should not appear
    const terminalContent = await terminalPage.getTerminalContent();
    expect(terminalContent).not.toContain('--print requires input');
    expect(terminalContent).not.toContain('Error:');
    
    // Verify Claude is responsive
    await terminalPage.sendInput('hello');
    await terminalPage.waitForResponse();
    
    // Verify we get a proper response
    const responseContent = await terminalPage.getTerminalContent();
    expect(responseContent.length).toBeGreaterThan(0);
  });
});