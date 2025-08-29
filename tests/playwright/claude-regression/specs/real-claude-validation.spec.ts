import { test, expect } from '@playwright/test';
import { ClaudeInstancePage } from '../page-objects/ClaudeInstancePage';
import { TerminalComponent } from '../page-objects/TerminalComponent';
import { StatusIndicator } from '../page-objects/StatusIndicator';

test.describe('Real Claude Process Validation', () => {
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

  test.describe('Claude Process Verification', () => {
    test('should spawn genuine Claude process', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Verify genuine Claude welcome message
      await expect(async () => {
        const content = await terminal.getFullContent();
        expect(content).toContain('✻ Welcome to Claude Code!');
      }).toPass({ timeout: 30000 });
      
      // Verify Claude model information
      await terminal.sendCommand('model');
      await terminal.waitForNewLine();
      
      const response = await terminal.getFullContent();
      expect(response).toMatch(/(claude|sonnet|haiku|opus)/i);
    });

    test('should have correct Claude Code environment', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Test Claude Code specific features
      await terminal.sendCommand('help');
      await terminal.waitForNewLine();
      
      const helpOutput = await terminal.getFullContent();
      expect(helpOutput).toMatch(/(command|tool|function)/i);
      
      // Test version command
      await terminal.sendCommand('version');
      await terminal.waitForNewLine();
      
      const versionOutput = await terminal.getFullContent();
      expect(versionOutput).toMatch(/claude.{0,10}code/i);
    });

    test('should respond to Claude-specific queries', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Test basic Claude functionality
      await terminal.sendCommand('What is the current working directory?');
      await terminal.waitForTextPattern(/workspaces.*agent-feed/);
      
      // Test file system awareness
      await terminal.sendCommand('List the files in this directory');
      await terminal.waitForNewLine(10000);
      
      const response = await terminal.getFullContent();
      expect(response).toMatch(/\.(js|ts|json|md|py)/);
    });

    test('should maintain conversation context', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Establish context
      await terminal.sendCommand('Remember that my name is TestUser');
      await terminal.waitForNewLine();
      
      // Test context retention
      await terminal.sendCommand('What is my name?');
      await terminal.waitForTextPattern(/TestUser/);
      
      const response = await terminal.getFullContent();
      expect(response).toContain('TestUser');
    });
  });

  test.describe('Claude Tools and Capabilities', () => {
    test('should have access to file system tools', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Test file reading capability
      await terminal.sendCommand('Read the package.json file');
      await terminal.waitForNewLine(15000);
      
      const response = await terminal.getFullContent();
      expect(response).toMatch(/(name|version|dependencies)/);
    });

    test('should have bash command capabilities', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Test bash command execution
      await terminal.sendCommand('Run the command: echo "Hello from Claude"');
      await terminal.waitForText('Hello from Claude');
      
      const response = await terminal.getFullContent();
      expect(response).toContain('Hello from Claude');
    });

    test('should have code analysis capabilities', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Test code analysis
      await terminal.sendCommand('Analyze the structure of this project');
      await terminal.waitForNewLine(20000);
      
      const response = await terminal.getFullContent();
      expect(response).toMatch(/(project|structure|file|directory)/i);
    });
  });

  test.describe('Interactive Session Validation', () => {
    test('should handle multi-turn conversations', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Multi-turn conversation
      const exchanges = [
        { input: 'Hello Claude!', expectedPattern: /hello|hi|greetings/i },
        { input: 'What can you help me with?', expectedPattern: /help|assist|can/i },
        { input: 'Thank you', expectedPattern: /welcome|glad|happy/i }
      ];
      
      for (const exchange of exchanges) {
        await terminal.sendCommand(exchange.input);
        await terminal.waitForTextPattern(exchange.expectedPattern, 15000);
      }
    });

    test('should handle complex technical queries', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Complex technical query
      await terminal.sendCommand('Explain the test architecture of this project and suggest improvements');
      await terminal.waitForNewLine(30000);
      
      const response = await terminal.getFullContent();
      expect(response.length).toBeGreaterThan(200); // Should provide substantial response
      expect(response).toMatch(/(test|architecture|improve)/i);
    });

    test('should handle code generation requests', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Code generation request
      await terminal.sendCommand('Write a simple JavaScript function to add two numbers');
      await terminal.waitForTextPattern(/function|const|=>/, 15000);
      
      const response = await terminal.getFullContent();
      expect(response).toMatch(/(function|const|let|=>)/);
      expect(response).toMatch(/\+/);
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle invalid commands gracefully', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Send invalid command
      await terminal.sendCommand('invalidcommandxyz123');
      await terminal.waitForNewLine();
      
      const response = await terminal.getFullContent();
      expect(response).not.toContain('--print requires input');
      
      // Should still be responsive after invalid command
      await terminal.sendCommand('Hello again');
      await terminal.waitForNewLine();
      
      const newResponse = await terminal.getFullContent();
      expect(newResponse).toMatch(/hello|hi/i);
    });

    test('should recover from processing errors', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Potentially problematic request
      await terminal.sendCommand('Process this extremely long text: ' + 'a'.repeat(10000));
      await terminal.waitForNewLine(20000);
      
      // Should still be responsive
      await terminal.sendCommand('Are you still working?');
      await terminal.waitForTextPattern(/yes|working|here/i, 15000);
    });

    test('should maintain session after errors', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Establish context
      await terminal.sendCommand('My favorite color is blue');
      await terminal.waitForNewLine();
      
      // Cause potential error
      await terminal.sendCommand('undefined_function_call()');
      await terminal.waitForNewLine();
      
      // Test context retention after error
      await terminal.sendCommand('What is my favorite color?');
      await terminal.waitForText('blue');
    });
  });

  test.describe('Performance and Responsiveness', () => {
    test('should respond to queries within reasonable time', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      const queries = [
        'Hello',
        'What is 2 + 2?',
        'List the files in the current directory',
        'Thank you'
      ];
      
      for (const query of queries) {
        const startTime = Date.now();
        await terminal.sendCommand(query);
        await terminal.waitForNewLine();
        const responseTime = Date.now() - startTime;
        
        // Should respond within 10 seconds for simple queries
        expect(responseTime).toBeLessThan(10000);
      }
    });

    test('should handle concurrent input gracefully', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Send multiple commands in quick succession
      const commands = ['Hi', 'How are you?', 'What time is it?'];
      
      for (const command of commands) {
        await terminal.sendCommand(command);
        await page.waitForTimeout(500); // Small delay between commands
      }
      
      // Wait for all responses
      await page.waitForTimeout(15000);
      
      const response = await terminal.getFullContent();
      
      // Should handle all commands without errors
      expect(response).not.toContain('--print requires input');
      expect(response).not.toContain('Error');
    });
  });

  test.describe('Session Persistence', () => {
    test('should maintain working directory context', async ({ page }) => {
      await claudePage.clickClaudeProdButton();
      await claudePage.waitForClaudeInstance();
      
      // Verify initial directory
      await terminal.sendCommand('What is the current working directory?');
      await terminal.waitForText('/workspaces/agent-feed/prod');
      
      // Perform some operations
      await terminal.sendCommand('List the files here');
      await terminal.waitForNewLine();
      
      // Verify directory context is maintained
      await terminal.sendCommand('Where am I working now?');
      await terminal.waitForText('/workspaces/agent-feed/prod');
    });

    test('should remember conversation history', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Build conversation history
      await terminal.sendCommand('I am working on a testing project');
      await terminal.waitForNewLine();
      
      await terminal.sendCommand('The project uses Playwright');
      await terminal.waitForNewLine();
      
      // Test history recall
      await terminal.sendCommand('What am I working on?');
      await terminal.waitForTextPattern(/(test|testing|playwright)/i);
    });
  });
});