import { test, expect } from '@playwright/test';
import { ClaudeInstancePage } from '../page-objects/ClaudeInstancePage';
import { TerminalComponent } from '../page-objects/TerminalComponent';
import { StatusIndicator } from '../page-objects/StatusIndicator';

test.describe('Claude Instance Creation', () => {
  let claudePage: ClaudeInstancePage;
  let terminal: TerminalComponent;
  let status: StatusIndicator;

  test.beforeEach(async ({ page }) => {
    claudePage = new ClaudeInstancePage(page);
    terminal = new TerminalComponent(page);
    status = new StatusIndicator(page);
    
    await claudePage.goto();
    await page.waitForLoadState('networkidle');
  });

  test.describe('Claude Working Button', () => {
    test('should create Claude instance with working directory', async ({ page }) => {
      await claudePage.takeScreenshot('claude-working-before-click');
      
      // Click Claude Working button
      await claudePage.clickClaudeWorkingButton();
      
      // Verify status progression
      await status.verifyStatusTransition(['starting', 'running']);
      
      // Wait for Claude instance to initialize
      await claudePage.waitForClaudeInstance();
      
      // Verify welcome message appears
      await expect(async () => {
        const hasWelcome = await claudePage.hasWelcomeMessage();
        expect(hasWelcome).toBeTruthy();
      }).toPass({ timeout: 30000 });
      
      // Verify working directory is correct
      await claudePage.waitForWorkingDirectory('/workspaces/agent-feed');
      
      // Verify interactive prompt appears
      await claudePage.waitForInteractivePrompt();
      
      // Verify no errors
      await claudePage.verifyNoErrors();
      
      await claudePage.takeScreenshot('claude-working-after-creation');
    });

    test('should handle rapid button clicks gracefully', async ({ page }) => {
      // Click button multiple times rapidly
      await claudePage.clickClaudeWorkingButton();
      await claudePage.clickClaudeWorkingButton();
      await claudePage.clickClaudeWorkingButton();
      
      // Should still create only one instance
      await claudePage.waitForClaudeInstance();
      
      // Verify single instance behavior
      const terminalContent = await claudePage.getTerminalContent();
      const welcomeCount = (terminalContent.match(/✻ Welcome to Claude Code!/g) || []).length;
      expect(welcomeCount).toBe(1);
    });
  });

  test.describe('Claude Prod Button', () => {
    test('should create Claude instance with prod directory', async ({ page }) => {
      await claudePage.takeScreenshot('claude-prod-before-click');
      
      // Click Claude Prod button
      await claudePage.clickClaudeProdButton();
      
      // Verify status progression
      await status.verifyStatusTransition(['starting', 'running']);
      
      // Wait for Claude instance to initialize
      await claudePage.waitForClaudeInstance();
      
      // Verify welcome message appears
      await expect(async () => {
        const hasWelcome = await claudePage.hasWelcomeMessage();
        expect(hasWelcome).toBeTruthy();
      }).toPass({ timeout: 30000 });
      
      // Verify prod working directory is correct
      await claudePage.waitForWorkingDirectory('/workspaces/agent-feed/prod');
      
      // Verify interactive prompt appears
      await claudePage.waitForInteractivePrompt();
      
      // Verify no errors
      await claudePage.verifyNoErrors();
      
      await claudePage.takeScreenshot('claude-prod-after-creation');
    });

    test('should maintain prod directory throughout session', async ({ page }) => {
      await claudePage.clickClaudeProdButton();
      await claudePage.waitForClaudeInstance();
      
      // Send pwd command to verify directory
      await terminal.sendCommand('pwd');
      await terminal.waitForText('/workspaces/agent-feed/prod');
      
      // Send ls command to verify prod contents
      await terminal.sendCommand('ls -la');
      await terminal.waitForNewLine();
      
      // Verify we're still in prod directory
      const content = await terminal.getFullContent();
      expect(content).toContain('/workspaces/agent-feed/prod');
    });
  });

  test.describe('Claude Source Button', () => {
    test('should create Claude instance with source directory', async ({ page }) => {
      await claudePage.takeScreenshot('claude-source-before-click');
      
      // Click Claude Source button
      await claudePage.clickClaudeSourceButton();
      
      // Verify status progression
      await status.verifyStatusTransition(['starting', 'running']);
      
      // Wait for Claude instance to initialize
      await claudePage.waitForClaudeInstance();
      
      // Verify welcome message appears
      await expect(async () => {
        const hasWelcome = await claudePage.hasWelcomeMessage();
        expect(hasWelcome).toBeTruthy();
      }).toPass({ timeout: 30000 });
      
      // Verify source working directory is correct
      await claudePage.waitForWorkingDirectory('/workspaces/agent-feed/src');
      
      // Verify interactive prompt appears
      await claudePage.waitForInteractivePrompt();
      
      // Verify no errors
      await claudePage.verifyNoErrors();
      
      await claudePage.takeScreenshot('claude-source-after-creation');
    });

    test('should have access to source files', async ({ page }) => {
      await claudePage.clickClaudeSourceButton();
      await claudePage.waitForClaudeInstance();
      
      // Test file system access
      await terminal.sendCommand('ls');
      await terminal.waitForNewLine();
      
      // Should see source directory contents
      const content = await terminal.getFullContent();
      expect(content).toMatch(/\.(js|ts|py|md)/); // Should contain source files
    });
  });

  test.describe('Claude Tests Button', () => {
    test('should create Claude instance with tests directory', async ({ page }) => {
      await claudePage.takeScreenshot('claude-tests-before-click');
      
      // Click Claude Tests button
      await claudePage.clickClaudeTestsButton();
      
      // Verify status progression
      await status.verifyStatusTransition(['starting', 'running']);
      
      // Wait for Claude instance to initialize
      await claudePage.waitForClaudeInstance();
      
      // Verify welcome message appears
      await expect(async () => {
        const hasWelcome = await claudePage.hasWelcomeMessage();
        expect(hasWelcome).toBeTruthy();
      }).toPass({ timeout: 30000 });
      
      // Verify tests working directory is correct
      await claudePage.waitForWorkingDirectory('/workspaces/agent-feed/tests');
      
      // Verify interactive prompt appears
      await claudePage.waitForInteractivePrompt();
      
      // Verify no errors
      await claudePage.verifyNoErrors();
      
      await claudePage.takeScreenshot('claude-tests-after-creation');
    });

    test('should have access to test files', async ({ page }) => {
      await claudePage.clickClaudeTestsButton();
      await claudePage.waitForClaudeInstance();
      
      // Test file system access
      await terminal.sendCommand('find . -name "*.test.*" -o -name "*.spec.*" | head -10');
      await terminal.waitForNewLine();
      
      // Should find test files
      const content = await terminal.getFullContent();
      expect(content).toMatch(/\.(test|spec)\.(js|ts|py)/);
    });
  });

  test.describe('Button States and Interactions', () => {
    test('should disable buttons during instance creation', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      
      // Check if other buttons are disabled during creation
      const prodButton = claudePage.claudeProdButton;
      const sourceButton = claudePage.claudeSourceButton;
      const testsButton = claudePage.claudeTestsButton;
      
      // Buttons should be disabled or show loading state
      await expect(prodButton).toBeDisabled();
      await expect(sourceButton).toBeDisabled();
      await expect(testsButton).toBeDisabled();
      
      // Wait for instance creation to complete
      await claudePage.waitForClaudeInstance();
      
      // Buttons should become enabled again (or remain disabled if one instance rule applies)
      // This depends on the UI implementation
    });

    test('should show loading indicators during creation', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      
      // Check for loading indicators
      const isProgressVisible = await status.isProgressBarVisible();
      const statusText = await status.getCurrentStatus();
      
      expect(['starting', 'loading', 'initializing']).toContain(statusText.toLowerCase());
    });
  });

  test.describe('Multiple Instance Prevention', () => {
    test('should prevent multiple instances from same button', async ({ page }) => {
      // Click button twice
      await claudePage.clickClaudeWorkingButton();
      await page.waitForTimeout(100);
      await claudePage.clickClaudeWorkingButton();
      
      await claudePage.waitForClaudeInstance();
      
      // Should only have one welcome message
      const content = await claudePage.getTerminalContent();
      const welcomeCount = (content.match(/✻ Welcome to Claude Code!/g) || []).length;
      expect(welcomeCount).toBe(1);
    });

    test('should handle switching between different buttons', async ({ page }) => {
      // Start with working
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Try to switch to prod
      await claudePage.clickClaudeProdButton();
      
      // Behavior depends on implementation:
      // - Either prevents second instance
      // - Or terminates first and starts second
      // - Or shows error message
      
      await page.waitForTimeout(2000);
      const content = await claudePage.getTerminalContent();
      
      // At minimum, should not show errors
      expect(content).not.toContain('--print requires input');
      expect(content).not.toContain('Error');
    });
  });

  test.describe('Visual Regression', () => {
    test('should match visual snapshots for each button type', async ({ page }) => {
      const buttons = [
        { name: 'working', click: () => claudePage.clickClaudeWorkingButton() },
        { name: 'prod', click: () => claudePage.clickClaudeProdButton() },
        { name: 'source', click: () => claudePage.clickClaudeSourceButton() },
        { name: 'tests', click: () => claudePage.clickClaudeTestsButton() }
      ];

      for (const button of buttons) {
        await claudePage.goto();
        await button.click();
        await claudePage.waitForClaudeInstance();
        
        // Take screenshot for visual comparison
        await expect(page).toHaveScreenshot(`claude-${button.name}-instance.png`);
        
        // Reset for next iteration
        await page.reload();
        await page.waitForLoadState('networkidle');
      }
    });
  });
});