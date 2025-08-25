/**
 * @test Claude CLI Interaction Regression Tests
 * @description Regression tests specifically for Claude CLI commands and interactions
 * @prerequisites Claude CLI installed and accessible in PATH
 * @validation Ensures Claude CLI works without terminal echo issues
 */

import { test, expect, Page } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';

interface CLITestResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}

interface ClaudeCommand {
  command: string[];
  expectedPatterns: RegExp[];
  unexpectedPatterns: RegExp[];
  timeout: number;
  shouldSucceed: boolean;
}

class ClaudeCLITester {
  private page: Page;
  private terminalSelector = '.xterm-screen';
  private inputSelector = '.xterm-helper-textarea';

  constructor(page: Page) {
    this.page = page;
  }

  async executeNodeCommand(command: string[], timeout: number = 10000): Promise<CLITestResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const child = spawn(command[0], command.slice(1), {
        cwd: '/workspaces/agent-feed',
        env: { ...process.env },
        timeout
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        resolve({
          exitCode: code || 0,
          stdout,
          stderr,
          duration
        });
      });

      child.on('error', (error) => {
        const duration = Date.now() - startTime;
        resolve({
          exitCode: -1,
          stdout,
          stderr: stderr + error.message,
          duration
        });
      });
    });
  }

  async waitForTerminalReady(): Promise<void> {
    await this.page.waitForSelector(this.terminalSelector, { timeout: 15000 });
    await this.page.waitForTimeout(1000);
  }

  async executeTerminalCommand(command: string, timeout: number = 5000): Promise<string> {
    await this.page.click(this.inputSelector);
    await this.page.type(this.inputSelector, command, { delay: 30 });
    
    const beforeContent = await this.getTerminalContent();
    await this.page.keyboard.press('Enter');
    
    // Wait for command completion
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      await this.page.waitForTimeout(200);
      const currentContent = await this.getTerminalContent();
      
      // Check if command completed (cursor appears on new line)
      if (currentContent.length > beforeContent.length) {
        break;
      }
    }
    
    const afterContent = await this.getTerminalContent();
    return afterContent.slice(beforeContent.length);
  }

  async getTerminalContent(): Promise<string> {
    return await this.page.textContent(this.terminalSelector) || '';
  }

  async validateNoEchoDuplication(command: string): Promise<{ isValid: boolean; duplicateCount: number }> {
    const content = await this.getTerminalContent();
    const escapedCommand = command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedCommand, 'g');
    const matches = content.match(regex) || [];
    
    return {
      isValid: matches.length <= 1,
      duplicateCount: Math.max(0, matches.length - 1)
    };
  }
}

test.describe('Claude CLI Regression Tests', () => {
  let tester: ClaudeCLITester;

  test.beforeEach(async ({ page }) => {
    tester = new ClaudeCLITester(page);
    await page.goto('http://localhost:5173');
    await tester.waitForTerminalReady();
  });

  test.describe('Claude CLI Command Execution', () => {
    const claudeCommands: ClaudeCommand[] = [
      {
        command: ['claude', '--version'],
        expectedPatterns: [/claude/i, /version/i],
        unexpectedPatterns: [/error/i, /not found/i],
        timeout: 5000,
        shouldSucceed: true
      },
      {
        command: ['claude', '--help'],
        expectedPatterns: [/usage/i, /options/i],
        unexpectedPatterns: [/error/i],
        timeout: 5000,
        shouldSucceed: true
      },
      {
        command: ['claude', 'auth', 'status'],
        expectedPatterns: [/authenticated|not authenticated|status/i],
        unexpectedPatterns: [/crash/i, /fatal/i],
        timeout: 8000,
        shouldSucceed: true
      }
    ];

    claudeCommands.forEach(({ command, expectedPatterns, unexpectedPatterns, timeout, shouldSucceed }) => {
      test(`should execute "${command.join(' ')}" via terminal without echo duplication`, async () => {
        const commandString = command.join(' ');
        
        // Execute in terminal
        const output = await tester.executeTerminalCommand(commandString, timeout);
        
        // Validate no echo duplication
        const echoValidation = await tester.validateNoEchoDuplication(commandString);
        expect(echoValidation.isValid).toBe(true);
        expect(echoValidation.duplicateCount).toBe(0);
        
        // Validate command behavior (if it should work)
        if (shouldSucceed) {
          // Check for expected patterns
          const hasExpectedContent = expectedPatterns.some(pattern => pattern.test(output));
          if (!hasExpectedContent) {
            console.warn(`Command "${commandString}" may not be available, but echo validation passed`);
          }
          
          // Check for unexpected patterns
          unexpectedPatterns.forEach(pattern => {
            expect(output).not.toMatch(pattern);
          });
        }
      });

      test(`should execute "${command.join(' ')}" directly without terminal echo issues`, async () => {
        // Execute directly via Node.js spawn
        const result = await tester.executeNodeCommand(command, timeout);
        
        // Validate execution
        if (shouldSucceed && result.exitCode === 0) {
          expectedPatterns.forEach(pattern => {
            expect(result.stdout + result.stderr).toMatch(pattern);
          });
        }
        
        // Even if command fails, terminal should not have echo issues when typed
        const commandString = command.join(' ');
        await tester.page.type(tester['inputSelector'], commandString, { delay: 50 });
        
        const echoValidation = await tester.validateNoEchoDuplication(commandString);
        expect(echoValidation.isValid).toBe(true);
      });
    });
  });

  test.describe('Interactive Claude Sessions', () => {
    test('should handle Claude interactive mode without echo loops', async () => {
      // Attempt to start Claude in interactive mode
      const output = await tester.executeTerminalCommand('claude', 10000);
      
      // Validate no echo duplication for the command
      const echoValidation = await tester.validateNoEchoDuplication('claude');
      expect(echoValidation.isValid).toBe(true);
      
      // If interactive mode started, exit gracefully
      if (output.includes('claude>') || output.includes('>>>')) {
        await tester.page.keyboard.press('Control+C');
        await tester.page.waitForTimeout(1000);
        
        // Validate terminal still works after exit
        const testOutput = await tester.executeTerminalCommand('echo "post-claude-test"');
        const testValidation = await tester.validateNoEchoDuplication('echo "post-claude-test"');
        expect(testValidation.isValid).toBe(true);
      }
    });

    test('should handle Claude conversation mode', async () => {
      // Test conversation initiation
      const conversationCommand = 'claude chat "Hello, can you help me?"';
      const output = await tester.executeTerminalCommand(conversationCommand, 15000);
      
      // Validate no echo duplication
      const echoValidation = await tester.validateNoEchoDuplication(conversationCommand);
      expect(echoValidation.isValid).toBe(true);
      
      // If command succeeded, should have some response
      if (output.length > conversationCommand.length) {
        expect(output.toLowerCase()).toMatch(/hello|help|assist|claude/);
      }
    });
  });

  test.describe('Claude File Operations', () => {
    test('should handle Claude file analysis without echo issues', async () => {
      // Create a test file first
      await tester.executeTerminalCommand('echo "test content" > /tmp/claude-test.txt');
      
      // Analyze file with Claude
      const analyzeCommand = 'claude analyze /tmp/claude-test.txt';
      const output = await tester.executeTerminalCommand(analyzeCommand, 10000);
      
      // Validate no echo duplication
      const echoValidation = await tester.validateNoEchoDuplication(analyzeCommand);
      expect(echoValidation.isValid).toBe(true);
      
      // Cleanup
      await tester.executeTerminalCommand('rm -f /tmp/claude-test.txt');
    });

    test('should handle Claude code generation without terminal interference', async () => {
      const codeCommand = 'claude code "create a simple hello world function"';
      const output = await tester.executeTerminalCommand(codeCommand, 15000);
      
      // Validate no echo duplication
      const echoValidation = await tester.validateNoEchoDuplication(codeCommand);
      expect(echoValidation.isValid).toBe(true);
      
      // Should not break terminal functionality
      const followupOutput = await tester.executeTerminalCommand('pwd');
      const followupValidation = await tester.validateNoEchoDuplication('pwd');
      expect(followupValidation.isValid).toBe(true);
    });
  });

  test.describe('Claude Configuration and Setup', () => {
    test('should handle Claude authentication without echo duplication', async () => {
      // Test auth status (non-interactive)
      const authCommand = 'claude auth status';
      const output = await tester.executeTerminalCommand(authCommand);
      
      const echoValidation = await tester.validateNoEchoDuplication(authCommand);
      expect(echoValidation.isValid).toBe(true);
    });

    test('should handle Claude config commands', async () => {
      const configCommands = [
        'claude config list',
        'claude config get api_url',
        'claude workspace info'
      ];

      for (const command of configCommands) {
        const output = await tester.executeTerminalCommand(command);
        
        const echoValidation = await tester.validateNoEchoDuplication(command);
        expect(echoValidation.isValid).toBe(true);
        expect(echoValidation.duplicateCount).toBe(0);
      }
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle Claude command errors gracefully', async () => {
      // Try an invalid Claude command
      const invalidCommand = 'claude invalid-subcommand-xyz';
      const output = await tester.executeTerminalCommand(invalidCommand);
      
      // Should not have echo duplication even for invalid commands
      const echoValidation = await tester.validateNoEchoDuplication(invalidCommand);
      expect(echoValidation.isValid).toBe(true);
      
      // Terminal should still be functional after error
      const recoveryOutput = await tester.executeTerminalCommand('echo "recovery test"');
      const recoveryValidation = await tester.validateNoEchoDuplication('echo "recovery test"');
      expect(recoveryValidation.isValid).toBe(true);
    });

    test('should handle Claude timeout scenarios', async () => {
      // Command that might timeout
      const timeoutCommand = 'claude chat "This is a very complex question that might take a long time to answer"';
      
      try {
        const output = await tester.executeTerminalCommand(timeoutCommand, 3000); // Short timeout
        
        // Even if it times out, should not have echo issues
        const echoValidation = await tester.validateNoEchoDuplication(timeoutCommand);
        expect(echoValidation.isValid).toBe(true);
      } catch (error) {
        // Timeout is acceptable, just verify no echo duplication
        const echoValidation = await tester.validateNoEchoDuplication(timeoutCommand);
        expect(echoValidation.isValid).toBe(true);
      }
    });

    test('should handle Claude connection issues', async () => {
      // Test behavior when Claude might not be properly configured
      const connectionTest = 'claude workspace sync';
      const output = await tester.executeTerminalCommand(connectionTest);
      
      const echoValidation = await tester.validateNoEchoDuplication(connectionTest);
      expect(echoValidation.isValid).toBe(true);
      
      // Should not cause terminal to become unresponsive
      const responsiveTest = await tester.executeTerminalCommand('date');
      expect(responsiveTest.length).toBeGreaterThan(0);
    });
  });

  test.describe('Performance Under Load', () => {
    test('should handle multiple Claude commands without accumulating echo issues', async () => {
      const commands = [
        'claude --version',
        'claude auth status', 
        'claude config list',
        'claude workspace info'
      ];

      let totalDuplicates = 0;

      for (const command of commands) {
        await tester.executeTerminalCommand(command);
        
        const echoValidation = await tester.validateNoEchoDuplication(command);
        expect(echoValidation.isValid).toBe(true);
        totalDuplicates += echoValidation.duplicateCount;
      }

      // No accumulated duplicates across commands
      expect(totalDuplicates).toBe(0);
    });

    test('should maintain terminal responsiveness during Claude operations', async () => {
      // Start a potentially long-running Claude operation
      const longCommand = 'claude analyze README.md';
      
      const startTime = Date.now();
      const output = await tester.executeTerminalCommand(longCommand, 8000);
      const executionTime = Date.now() - startTime;
      
      // Should complete within reasonable time
      expect(executionTime).toBeLessThan(15000);
      
      // Should not have echo issues
      const echoValidation = await tester.validateNoEchoDuplication(longCommand);
      expect(echoValidation.isValid).toBe(true);
      
      // Terminal should remain responsive
      const quickTest = await tester.executeTerminalCommand('echo "responsiveness test"', 1000);
      expect(quickTest).toContain('responsiveness test');
    });
  });
});

test.describe('Claude CLI Integration Validation', () => {
  test('should validate Claude CLI installation and basic functionality', async ({ page }) => {
    const tester = new ClaudeCLITester(page);
    
    // Test if Claude CLI is available
    const versionResult = await tester.executeNodeCommand(['claude', '--version'], 5000);
    
    if (versionResult.exitCode === 0) {
      console.log('Claude CLI is available:', versionResult.stdout);
      
      // If available, all terminal interactions should work without echo issues
      await page.goto('http://localhost:5173');
      await tester.waitForTerminalReady();
      
      const terminalTest = await tester.executeTerminalCommand('claude --version');
      const echoValidation = await tester.validateNoEchoDuplication('claude --version');
      
      expect(echoValidation.isValid).toBe(true);
      expect(echoValidation.duplicateCount).toBe(0);
    } else {
      console.warn('Claude CLI not available, testing terminal behavior with claude commands');
      
      // Even if Claude isn't installed, terminal should handle the commands gracefully
      await page.goto('http://localhost:5173');
      await tester.waitForTerminalReady();
      
      const terminalTest = await tester.executeTerminalCommand('claude --version');
      const echoValidation = await tester.validateNoEchoDuplication('claude --version');
      
      expect(echoValidation.isValid).toBe(true);
    }
  });
});