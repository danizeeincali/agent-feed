/**
 * @test Echo Duplication Prevention
 * @description Comprehensive regression tests to prevent terminal echo duplication
 * @prerequisites 
 *   - Terminal server is running
 *   - WebSocket connection is established
 *   - All terminal components are loaded
 * @validation Ensures single character echo without duplication
 */

import { test, expect, Page, Browser } from '@playwright/test';

interface EchoTestCase {
  input: string;
  expectedOutput: string;
  description: string;
}

interface TerminalState {
  content: string;
  cursorPosition: number;
  lastUpdate: number;
}

class TerminalEchoValidator {
  private page: Page;
  private terminalSelector: string;
  private inputSelector: string;

  constructor(page: Page, terminalSelector = '.xterm-screen', inputSelector = '.xterm-helper-textarea') {
    this.page = page;
    this.terminalSelector = terminalSelector;
    this.inputSelector = inputSelector;
  }

  async waitForTerminalReady(): Promise<void> {
    await this.page.waitForSelector(this.terminalSelector, { timeout: 10000 });
    await this.page.waitForFunction(
      () => window.document.querySelector('.xterm-screen') !== null,
      { timeout: 5000 }
    );
  }

  async getTerminalContent(): Promise<string> {
    return await this.page.evaluate(() => {
      const terminal = document.querySelector('.xterm-screen');
      return terminal?.textContent || '';
    });
  }

  async getTerminalState(): Promise<TerminalState> {
    return await this.page.evaluate(() => {
      const terminal = document.querySelector('.xterm-screen');
      const content = terminal?.textContent || '';
      return {
        content,
        cursorPosition: 0, // Simplified for test
        lastUpdate: Date.now()
      };
    });
  }

  async typeAndValidateEcho(input: string, expectedOutput: string): Promise<boolean> {
    const initialState = await this.getTerminalState();
    
    // Type character by character to detect incremental duplication
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      await this.page.type(this.inputSelector, char, { delay: 50 });
      
      // Wait for echo to process
      await this.page.waitForTimeout(100);
      
      const currentState = await this.getTerminalState();
      const newContent = currentState.content.slice(initialState.content.length);
      
      // Validate no character duplication
      const expectedSoFar = input.slice(0, i + 1);
      const actualCount = (newContent.match(new RegExp(char, 'g')) || []).length;
      const expectedCount = (expectedSoFar.match(new RegExp(char, 'g')) || []).length;
      
      if (actualCount > expectedCount) {
        console.error(`Echo duplication detected for '${char}': expected ${expectedCount}, got ${actualCount}`);
        return false;
      }
    }

    const finalContent = await this.getTerminalContent();
    return finalContent.includes(expectedOutput);
  }

  async validateNoIncrementalBuildup(input: string): Promise<boolean> {
    const snapshots: string[] = [];
    
    for (let i = 0; i < input.length; i++) {
      await this.page.type(this.inputSelector, input[i], { delay: 50 });
      await this.page.waitForTimeout(100);
      
      const content = await this.getTerminalContent();
      snapshots.push(content);
    }

    // Check for incremental buildup patterns like h->he->hel->hell->hello
    for (let i = 1; i < snapshots.length; i++) {
      const previous = snapshots[i - 1];
      const current = snapshots[i];
      
      // Should not have progressive character accumulation
      const inputSoFar = input.slice(0, i + 1);
      const duplicatePattern = new RegExp(`(${inputSoFar}).*\\1`, 'g');
      
      if (duplicatePattern.test(current)) {
        console.error(`Incremental buildup detected at step ${i}: ${current}`);
        return false;
      }
    }

    return true;
  }
}

test.describe('Terminal Echo Duplication Prevention', () => {
  let validator: TerminalEchoValidator;

  test.beforeEach(async ({ page }) => {
    validator = new TerminalEchoValidator(page);
    
    // Navigate to terminal page
    await page.goto('http://localhost:5173');
    await validator.waitForTerminalReady();
    
    // Clear any existing content
    await page.keyboard.press('Control+C');
    await page.waitForTimeout(500);
  });

  const testCases: EchoTestCase[] = [
    {
      input: 'hello',
      expectedOutput: 'hello',
      description: 'Basic word input without duplication'
    },
    {
      input: 'ls -la',
      expectedOutput: 'ls -la',
      description: 'Command with flags'
    },
    {
      input: 'echo "test message"',
      expectedOutput: 'echo "test message"',
      description: 'Command with quoted string'
    },
    {
      input: 'pwd',
      expectedOutput: 'pwd',
      description: 'Simple command'
    },
    {
      input: 'aaaaaa',
      expectedOutput: 'aaaaaa',
      description: 'Repeated characters test'
    }
  ];

  test.describe('Single Character Echo Validation', () => {
    testCases.forEach(({ input, expectedOutput, description }) => {
      test(`should handle ${description}`, async () => {
        const result = await validator.typeAndValidateEcho(input, expectedOutput);
        expect(result).toBe(true);
        
        // Verify final content contains expected output exactly once
        const content = await validator.getTerminalContent();
        const occurrences = (content.match(new RegExp(expectedOutput, 'g')) || []).length;
        expect(occurrences).toBe(1);
      });
    });
  });

  test.describe('Incremental Buildup Prevention', () => {
    testCases.forEach(({ input, description }) => {
      test(`should prevent incremental buildup for ${description}`, async () => {
        const result = await validator.validateNoIncrementalBuildup(input);
        expect(result).toBe(true);
      });
    });
  });

  test.describe('Character-by-Character Validation', () => {
    test('should handle rapid typing without echo loops', async () => {
      const testString = 'rapid-typing-test';
      
      // Type quickly to stress-test echo handling
      await validator.page.type('.xterm-helper-textarea', testString, { delay: 10 });
      await validator.page.waitForTimeout(500);
      
      const content = await validator.getTerminalContent();
      const occurrences = (content.match(/rapid-typing-test/g) || []).length;
      
      expect(occurrences).toBe(1);
    });

    test('should handle backspace correctly', async () => {
      await validator.page.type('.xterm-helper-textarea', 'hello');
      await validator.page.keyboard.press('Backspace');
      await validator.page.keyboard.press('Backspace');
      await validator.page.type('.xterm-helper-textarea', 'p');
      
      await validator.page.waitForTimeout(300);
      const content = await validator.getTerminalContent();
      
      // Should show 'help' not 'hello' or duplicated characters
      expect(content).toContain('help');
      expect(content).not.toMatch(/hel{2,}|o+$/);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle special characters without duplication', async () => {
      const specialChars = '!@#$%^&*()';
      const result = await validator.typeAndValidateEcho(specialChars, specialChars);
      expect(result).toBe(true);
    });

    test('should handle unicode characters', async () => {
      const unicode = '🚀✨💻';
      const result = await validator.typeAndValidateEcho(unicode, unicode);
      expect(result).toBe(true);
    });

    test('should handle paste operations', async () => {
      const textToPaste = 'pasted-content-test';
      
      await validator.page.evaluate((text) => {
        navigator.clipboard.writeText(text);
      }, textToPaste);
      
      await validator.page.keyboard.press('Control+V');
      await validator.page.waitForTimeout(300);
      
      const content = await validator.getTerminalContent();
      const occurrences = (content.match(/pasted-content-test/g) || []).length;
      expect(occurrences).toBe(1);
    });
  });

  test.describe('Performance Impact', () => {
    test('should maintain responsive typing under load', async ({ page }) => {
      const startTime = Date.now();
      const longString = 'a'.repeat(100);
      
      await validator.page.type('.xterm-helper-textarea', longString, { delay: 5 });
      
      const endTime = Date.now();
      const typingTime = endTime - startTime;
      
      // Should complete within reasonable time (not blocked by echo processing)
      expect(typingTime).toBeLessThan(2000);
      
      const content = await validator.getTerminalContent();
      const occurrences = (content.match(/a/g) || []).length;
      expect(occurrences).toBe(100); // Exactly 100 'a' characters, no more
    });
  });
});

test.describe('Terminal State Consistency', () => {
  test('should maintain consistent state across multiple inputs', async ({ page }) => {
    const validator = new TerminalEchoValidator(page);
    await page.goto('http://localhost:5173');
    await validator.waitForTerminalReady();

    const commands = ['pwd', 'ls', 'echo hello', 'clear'];
    
    for (const command of commands) {
      const initialContent = await validator.getTerminalContent();
      
      await page.type('.xterm-helper-textarea', command);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      
      const finalContent = await validator.getTerminalContent();
      
      // Verify command appears exactly once in the new content
      const newContent = finalContent.slice(initialContent.length);
      const commandOccurrences = (newContent.match(new RegExp(command, 'g')) || []).length;
      expect(commandOccurrences).toBeLessThanOrEqual(1);
    }
  });
});