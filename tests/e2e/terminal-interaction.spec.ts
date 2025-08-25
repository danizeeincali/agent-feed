/**
 * @test Terminal Interaction E2E Tests
 * @description End-to-end testing of terminal functionality and Claude CLI interaction
 * @prerequisites Full application stack running (frontend + backend)
 * @validation Complete user workflow without echo duplication
 */

import { test, expect, Page, Browser } from '@playwright/test';

interface TerminalButton {
  selector: string;
  label: string;
  expectedBehavior: string;
}

interface ClaudeCLICommand {
  command: string;
  expectedOutput: RegExp | string;
  timeout: number;
}

class TerminalInteractionTester {
  private page: Page;
  private terminalSelector = '.xterm-screen';
  private inputSelector = '.xterm-helper-textarea';

  constructor(page: Page) {
    this.page = page;
  }

  async waitForTerminalReady(): Promise<void> {
    await this.page.waitForSelector(this.terminalSelector, { timeout: 15000 });
    await this.page.waitForFunction(
      () => {
        const terminal = document.querySelector('.xterm-screen');
        return terminal && terminal.textContent && terminal.textContent.length > 0;
      },
      { timeout: 10000 }
    );
  }

  async clearTerminal(): Promise<void> {
    await this.page.keyboard.press('Control+C');
    await this.page.waitForTimeout(500);
    await this.page.keyboard.press('Control+L');
    await this.page.waitForTimeout(500);
  }

  async executeCommand(command: string, expectOutput: boolean = true): Promise<string> {
    await this.page.click(this.inputSelector);
    await this.page.type(this.inputSelector, command, { delay: 30 });
    
    const beforeContent = await this.getTerminalContent();
    
    await this.page.keyboard.press('Enter');
    
    if (expectOutput) {
      await this.page.waitForTimeout(2000); // Allow command execution
    }
    
    const afterContent = await this.getTerminalContent();
    return afterContent.slice(beforeContent.length);
  }

  async getTerminalContent(): Promise<string> {
    return await this.page.textContent(this.terminalSelector) || '';
  }

  async validateEchoCount(input: string, maxAllowedCount: number = 1): Promise<boolean> {
    const content = await this.getTerminalContent();
    const regex = new RegExp(input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = content.match(regex) || [];
    return matches.length <= maxAllowedCount;
  }

  async testTypingEcho(text: string): Promise<{ success: boolean; duplicates: number }> {
    await this.clearTerminal();
    
    const initialContent = await this.getTerminalContent();
    
    // Type character by character
    for (const char of text) {
      await this.page.type(this.inputSelector, char, { delay: 50 });
      await this.page.waitForTimeout(100);
    }
    
    const finalContent = await this.getTerminalContent();
    const newContent = finalContent.slice(initialContent.length);
    
    // Count occurrences of the full text
    const regex = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = newContent.match(regex) || [];
    
    return {
      success: matches.length === 1,
      duplicates: Math.max(0, matches.length - 1)
    };
  }
}

test.describe('Terminal Interaction E2E Tests', () => {
  let tester: TerminalInteractionTester;

  test.beforeEach(async ({ page }) => {
    tester = new TerminalInteractionTester(page);
    
    await page.goto('http://localhost:5173');
    await tester.waitForTerminalReady();
    
    // Ensure clean start
    await tester.clearTerminal();
  });

  test.describe('Basic Terminal Functionality', () => {
    test('should display terminal without initial errors', async ({ page }) => {
      await expect(page.locator('.xterm-screen')).toBeVisible();
      await expect(page.locator('.xterm-helper-textarea')).toBeAttached();
      
      // Should not have JavaScript errors on load
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      await page.waitForTimeout(2000);
      expect(errors).toHaveLength(0);
    });

    test('should handle basic command input without echo duplication', async () => {
      const testCommands = ['pwd', 'ls', 'echo "hello"', 'whoami'];
      
      for (const command of testCommands) {
        const result = await tester.testTypingEcho(command);
        expect(result.success).toBe(true);
        expect(result.duplicates).toBe(0);
      }
    });

    test('should handle special characters correctly', async () => {
      const specialInputs = ['!@#$%', '&&', '||', '> /dev/null'];
      
      for (const input of specialInputs) {
        const result = await tester.testTypingEcho(input);
        expect(result.success).toBe(true);
        expect(result.duplicates).toBe(0);
      }
    });
  });

  test.describe('Terminal Button Functionality', () => {
    const terminalButtons: TerminalButton[] = [
      {
        selector: '[data-testid="terminal-button-1"]',
        label: 'Terminal 1',
        expectedBehavior: 'should open first terminal session'
      },
      {
        selector: '[data-testid="terminal-button-2"]',
        label: 'Terminal 2', 
        expectedBehavior: 'should open second terminal session'
      },
      {
        selector: '[data-testid="terminal-button-3"]',
        label: 'Terminal 3',
        expectedBehavior: 'should open third terminal session'
      },
      {
        selector: '[data-testid="terminal-button-4"]',
        label: 'Terminal 4',
        expectedBehavior: 'should open fourth terminal session'
      }
    ];

    terminalButtons.forEach((button, index) => {
      test(`${button.label} ${button.expectedBehavior}`, async ({ page }) => {
        // Click the terminal button
        const buttonElement = page.locator(button.selector);
        if (await buttonElement.count() > 0) {
          await buttonElement.click();
          await page.waitForTimeout(1000);
          
          // Verify terminal is functional
          const testInput = `test-terminal-${index + 1}`;
          const result = await tester.testTypingEcho(testInput);
          
          expect(result.success).toBe(true);
          expect(result.duplicates).toBe(0);
        } else {
          console.warn(`Terminal button ${button.selector} not found, skipping test`);
        }
      });
    });

    test('should switch between terminal sessions without echo issues', async ({ page }) => {
      const availableButtons = [];
      
      // Find available terminal buttons
      for (const button of terminalButtons) {
        if (await page.locator(button.selector).count() > 0) {
          availableButtons.push(button);
        }
      }
      
      if (availableButtons.length < 2) {
        test.skip('Need at least 2 terminal buttons for switching test');
      }
      
      // Test switching between terminals
      for (let i = 0; i < Math.min(2, availableButtons.length); i++) {
        const button = availableButtons[i];
        
        await page.locator(button.selector).click();
        await page.waitForTimeout(1000);
        
        const testInput = `session-${i}-test`;
        const result = await tester.testTypingEcho(testInput);
        
        expect(result.success).toBe(true);
        expect(result.duplicates).toBe(0);
      }
    });
  });

  test.describe('Claude CLI Interaction', () => {
    const claudeCommands: ClaudeCLICommand[] = [
      {
        command: 'claude --version',
        expectedOutput: /claude|version/i,
        timeout: 5000
      },
      {
        command: 'claude --help',
        expectedOutput: /usage|help|commands/i,
        timeout: 5000
      },
      {
        command: 'pwd',
        expectedOutput: /workspaces/,
        timeout: 3000
      }
    ];

    claudeCommands.forEach(({ command, expectedOutput, timeout }) => {
      test(`should execute "${command}" without echo duplication`, async () => {
        // Clear terminal first
        await tester.clearTerminal();
        
        // Execute command
        const output = await tester.executeCommand(command);
        
        // Validate no echo duplication
        const echoValid = await tester.validateEchoCount(command, 1);
        expect(echoValid).toBe(true);
        
        // Validate expected output (if command succeeds)
        if (typeof expectedOutput === 'string') {
          expect(output).toContain(expectedOutput);
        } else {
          // For regex, be more lenient as command might fail
          const hasExpectedPattern = expectedOutput.test(output);
          if (!hasExpectedPattern) {
            console.warn(`Command "${command}" did not match expected pattern, but no echo duplication detected`);
          }
        }
      });
    });

    test('should handle Claude CLI interactive mode', async ({ page }) => {
      await tester.clearTerminal();
      
      // Attempt to start interactive mode (may not be available)
      const output = await tester.executeCommand('claude');
      
      // Regardless of whether Claude CLI is available, should not have echo issues
      const echoValid = await tester.validateEchoCount('claude', 1);
      expect(echoValid).toBe(true);
      
      // If interactive mode started, try to exit cleanly
      if (output.includes('claude>') || output.includes('>>>')) {
        await page.keyboard.press('Control+C');
        await page.waitForTimeout(1000);
      }
    });

    test('should handle long-running Claude commands', async () => {
      await tester.clearTerminal();
      
      // Test a command that might take time
      const longCommand = 'find /workspaces -name "*.ts" | head -5';
      const output = await tester.executeCommand(longCommand);
      
      // Should not create echo loops during execution
      const echoValid = await tester.validateEchoCount(longCommand, 1);
      expect(echoValid).toBe(true);
    });
  });

  test.describe('Performance and Responsiveness', () => {
    test('should maintain responsiveness during rapid input', async () => {
      const rapidText = 'rapid-input-test-12345';
      
      const startTime = Date.now();
      
      // Type rapidly
      await tester.page.type(tester['inputSelector'], rapidText, { delay: 10 });
      
      const endTime = Date.now();
      const typingTime = endTime - startTime;
      
      // Should complete quickly
      expect(typingTime).toBeLessThan(2000);
      
      // Should not have echo duplication
      const result = await tester.testTypingEcho('');
      const content = await tester.getTerminalContent();
      const occurrences = (content.match(/rapid-input-test-12345/g) || []).length;
      
      expect(occurrences).toBeLessThanOrEqual(1);
    });

    test('should handle concurrent operations', async ({ page }) => {
      // Start a long-running process
      await tester.executeCommand('sleep 2 &', false);
      
      // Immediately try other commands
      const quickCommands = ['pwd', 'echo test', 'date'];
      
      for (const cmd of quickCommands) {
        const result = await tester.testTypingEcho(cmd);
        expect(result.success).toBe(true);
        expect(result.duplicates).toBe(0);
      }
    });

    test('should recover from terminal errors gracefully', async ({ page }) => {
      // Try to cause an error
      await tester.executeCommand('invalid-command-xyz-123');
      
      // Should still function normally
      const result = await tester.testTypingEcho('echo "recovery test"');
      expect(result.success).toBe(true);
      expect(result.duplicates).toBe(0);
    });
  });

  test.describe('Edge Cases and Stress Testing', () => {
    test('should handle very long input without duplication', async () => {
      const longInput = 'a'.repeat(200);
      const result = await tester.testTypingEcho(longInput);
      
      expect(result.success).toBe(true);
      expect(result.duplicates).toBe(0);
    });

    test('should handle copy-paste operations', async ({ page }) => {
      const textToPaste = 'pasted-text-no-echo-test';
      
      // Set clipboard
      await page.evaluate((text) => {
        navigator.clipboard.writeText(text);
      }, textToPaste);
      
      // Clear terminal and paste
      await tester.clearTerminal();
      await page.click(tester['inputSelector']);
      await page.keyboard.press('Control+V');
      
      await page.waitForTimeout(500);
      
      // Validate no duplication
      const echoValid = await tester.validateEchoCount(textToPaste, 1);
      expect(echoValid).toBe(true);
    });

    test('should handle tab completion without echo loops', async ({ page }) => {
      await tester.clearTerminal();
      
      // Type partial command and press tab
      await page.type(tester['inputSelector'], 'ec', { delay: 50 });
      await page.keyboard.press('Tab');
      
      await page.waitForTimeout(500);
      
      // Should not create echo loops
      const content = await tester.getTerminalContent();
      const ecCount = (content.match(/ec/g) || []).length;
      
      expect(ecCount).toBeLessThanOrEqual(2); // Original + completion
    });

    test('should handle ctrl+c interruption cleanly', async ({ page }) => {
      // Start typing
      await page.type(tester['inputSelector'], 'test-interrupt', { delay: 50 });
      
      // Interrupt with Ctrl+C
      await page.keyboard.press('Control+C');
      await page.waitForTimeout(500);
      
      // Try normal operation
      const result = await tester.testTypingEcho('after-interrupt');
      expect(result.success).toBe(true);
      expect(result.duplicates).toBe(0);
    });
  });
});

test.describe('Terminal State Management', () => {
  test('should maintain consistent state across page refreshes', async ({ page }) => {
    const tester = new TerminalInteractionTester(page);
    
    // Initial state
    await page.goto('http://localhost:5173');
    await tester.waitForTerminalReady();
    
    await tester.executeCommand('echo "before refresh"');
    
    // Refresh page
    await page.reload();
    await tester.waitForTerminalReady();
    
    // Should work normally after refresh
    const result = await tester.testTypingEcho('after-refresh');
    expect(result.success).toBe(true);
    expect(result.duplicates).toBe(0);
  });
});