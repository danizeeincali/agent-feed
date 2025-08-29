import { test, expect, Page } from '@playwright/test';
import { ClaudeManagerPage } from '../page-objects/ClaudeManagerPage';
import { TerminalPage } from '../page-objects/TerminalPage';

test.describe('Real Claude Process Validation Tests', () => {
  let claudeManagerPage: ClaudeManagerPage;
  let terminalPage: TerminalPage;

  test.beforeEach(async ({ page }) => {
    claudeManagerPage = new ClaudeManagerPage(page);
    terminalPage = new TerminalPage(page);
    await claudeManagerPage.goto();
  });

  test.afterEach(async ({ page }) => {
    await claudeManagerPage.cleanupInstances();
  });

  test('should display Claude welcome message correctly', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    
    // Wait for and verify Claude welcome message
    await terminalPage.waitForClaudeWelcome();
    
    const terminalContent = await terminalPage.getTerminalContent();
    
    // Verify exact welcome message
    expect(terminalContent).toContain('✻ Welcome to Claude Code!');
    
    // Verify additional welcome elements if present
    expect(terminalContent).toMatch(/Claude.*Code/);
  });

  test('should show correct working directory', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    
    // Wait for initialization
    await terminalPage.waitForClaudeWelcome();
    
    // Verify working directory is displayed
    const terminalContent = await terminalPage.getTerminalContent();
    expect(terminalContent).toContain('cwd: /workspaces/agent-feed/prod');
    
    // Verify directory is accessible
    await terminalPage.sendInput('ls');
    await terminalPage.waitForResponse();
    
    const lsOutput = await terminalPage.getLatestResponse();
    expect(lsOutput).not.toContain('No such file or directory');
  });

  test('should display interactive prompt and accept input', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    
    // Wait for Claude to be ready
    await terminalPage.waitForClaudeWelcome();
    await terminalPage.waitForInteractivePrompt();
    
    // Verify prompt is visible and interactive
    expect(await terminalPage.hasInteractivePrompt()).toBe(true);
    expect(await terminalPage.isInputEnabled()).toBe(true);
    
    // Test input acceptance
    const testInput = 'test input';
    await terminalPage.sendInput(testInput);
    
    // Verify input was accepted
    const terminalContent = await terminalPage.getTerminalContent();
    expect(terminalContent).toContain(testInput);
  });

  test('should respond to basic queries like "hello"', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    
    // Wait for Claude to be ready
    await terminalPage.waitForClaudeWelcome();
    await terminalPage.waitForInteractivePrompt();
    
    // Send hello query
    await terminalPage.sendInput('hello');
    await terminalPage.waitForResponse();
    
    // Verify Claude responds
    const response = await terminalPage.getLatestResponse();
    expect(response.length).toBeGreaterThan(0);
    expect(response).not.toContain('Error');
    
    // Verify it's a meaningful response
    expect(response.toLowerCase()).toMatch(/(hello|hi|greet)/);
  });

  test('should validate fancy box UI displays correctly', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    
    // Wait for Claude welcome with box UI
    await terminalPage.waitForClaudeWelcome();
    
    const terminalContent = await terminalPage.getTerminalContent();
    
    // Look for box characters or fancy formatting
    const hasBoxCharacters = /[┌┐└┘│─┤├┬┴┼]/.test(terminalContent);
    const hasANSIColors = /\x1b\[[0-9;]*m/.test(terminalContent);
    const hasWelcomeBox = terminalContent.includes('✻ Welcome to Claude Code!');
    
    // At least one fancy formatting should be present
    expect(hasBoxCharacters || hasANSIColors || hasWelcomeBox).toBe(true);
  });

  test('should maintain session context across interactions', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    
    // Wait for readiness
    await terminalPage.waitForClaudeWelcome();
    await terminalPage.waitForInteractivePrompt();
    
    // Set context in first interaction
    await terminalPage.sendInput('My name is TestUser');
    await terminalPage.waitForResponse();
    
    // Reference context in second interaction
    await terminalPage.sendInput('What is my name?');
    await terminalPage.waitForResponse();
    
    const response = await terminalPage.getLatestResponse();
    expect(response.toLowerCase()).toContain('testuser');
  });

  test('should handle multi-line inputs correctly', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    
    // Wait for readiness
    await terminalPage.waitForClaudeWelcome();
    await terminalPage.waitForInteractivePrompt();
    
    // Send multi-line input
    const multiLineInput = `Please help me with:
1. First task
2. Second task
3. Third task`;
    
    await terminalPage.sendInput(multiLineInput);
    await terminalPage.waitForResponse();
    
    const response = await terminalPage.getLatestResponse();
    expect(response.length).toBeGreaterThan(0);
    expect(response).not.toContain('Error');
    
    // Verify Claude understood the structured input
    const responseText = response.toLowerCase();
    expect(responseText).toMatch(/(task|help|assist)/);
  });

  test('should handle special characters and commands', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    
    // Wait for readiness
    await terminalPage.waitForClaudeWelcome();
    await terminalPage.waitForInteractivePrompt();
    
    // Test various special characters
    const specialInputs = [
      'echo "Hello World"',
      'ls -la',
      'pwd && whoami',
      'echo $HOME'
    ];
    
    for (const input of specialInputs) {
      await terminalPage.sendInput(input);
      await terminalPage.waitForResponse();
      
      const response = await terminalPage.getLatestResponse();
      expect(response).not.toContain('command not found');
      expect(response.length).toBeGreaterThan(0);
    }
  });

  test('should validate no initialization errors occur', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    
    // Monitor for errors during startup
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait for full initialization
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    await terminalPage.waitForClaudeWelcome();
    
    // Verify no critical errors occurred
    const criticalErrors = errors.filter(error => 
      error.includes('--print requires input') ||
      error.includes('failed to start') ||
      error.includes('connection refused')
    );
    
    expect(criticalErrors).toHaveLength(0);
    
    // Verify terminal shows no error messages
    const terminalContent = await terminalPage.getTerminalContent();
    expect(terminalContent).not.toContain('Error:');
    expect(terminalContent).not.toContain('Failed:');
    expect(terminalContent).not.toContain('--print requires input');
  });
});