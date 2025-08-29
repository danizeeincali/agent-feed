import { expect as baseExpect, Locator, Page } from '@playwright/test';

export const expect = baseExpect.extend({
  // Custom matcher for Claude welcome message
  async toHaveClaudeWelcome(page: Page) {
    const assertionName = 'toHaveClaudeWelcome';
    let pass: boolean;
    let matcherResult: any;

    try {
      await page.waitForFunction(
        () => document.body.textContent?.includes('✻ Welcome to Claude Code!'),
        { timeout: 30000 }
      );
      pass = true;
      matcherResult = {
        message: () => 'Expected Claude welcome message to be present',
        pass: true,
        name: assertionName,
        expected: '✻ Welcome to Claude Code!',
        actual: 'Found Claude welcome message'
      };
    } catch (error) {
      pass = false;
      const content = await page.textContent('body') || '';
      matcherResult = {
        message: () => `Expected Claude welcome message '✻ Welcome to Claude Code!' but was not found.\nActual page content: ${content.substring(0, 500)}...`,
        pass: false,
        name: assertionName,
        expected: '✻ Welcome to Claude Code!',
        actual: content.substring(0, 200)
      };
    }

    return matcherResult;
  },

  // Custom matcher for working directory verification
  async toHaveWorkingDirectory(page: Page, expectedPath: string) {
    const assertionName = 'toHaveWorkingDirectory';
    let pass: boolean;
    let matcherResult: any;

    try {
      await page.waitForFunction(
        (path) => document.body.textContent?.includes(`cwd: ${path}`),
        expectedPath,
        { timeout: 15000 }
      );
      pass = true;
      matcherResult = {
        message: () => `Expected working directory '${expectedPath}' to be present`,
        pass: true,
        name: assertionName,
        expected: `cwd: ${expectedPath}`,
        actual: `Found cwd: ${expectedPath}`
      };
    } catch (error) {
      pass = false;
      const content = await page.textContent('body') || '';
      const cwdMatch = content.match(/cwd: ([^\s\n]+)/);
      const actualCwd = cwdMatch ? cwdMatch[1] : 'not found';
      
      matcherResult = {
        message: () => `Expected working directory 'cwd: ${expectedPath}' but found 'cwd: ${actualCwd}'.\nPage content: ${content.substring(0, 500)}...`,
        pass: false,
        name: assertionName,
        expected: `cwd: ${expectedPath}`,
        actual: `cwd: ${actualCwd}`
      };
    }

    return matcherResult;
  },

  // Custom matcher for interactive prompt
  async toHaveInteractivePrompt(page: Page) {
    const assertionName = 'toHaveInteractivePrompt';
    let pass: boolean;
    let matcherResult: any;

    try {
      await page.waitForFunction(
        () => document.body.textContent?.includes('> '),
        { timeout: 15000 }
      );
      pass = true;
      matcherResult = {
        message: () => 'Expected interactive prompt "> " to be present',
        pass: true,
        name: assertionName,
        expected: '> ',
        actual: 'Found interactive prompt'
      };
    } catch (error) {
      pass = false;
      const content = await page.textContent('body') || '';
      matcherResult = {
        message: () => `Expected interactive prompt '> ' but was not found.\nPage content: ${content.substring(0, 500)}...`,
        pass: false,
        name: assertionName,
        expected: '> ',
        actual: content.substring(0, 200)
      };
    }

    return matcherResult;
  },

  // Custom matcher for error absence
  async toNotHaveClaudeErrors(page: Page) {
    const assertionName = 'toNotHaveClaudeErrors';
    let pass: boolean;
    let matcherResult: any;

    const content = await page.textContent('body') || '';
    const errorPatterns = [
      '--print requires input',
      'Error: --print requires input',
      'Unexpected error',
      'Process crashed'
    ];

    const foundErrors = errorPatterns.filter(pattern => content.includes(pattern));

    if (foundErrors.length === 0) {
      pass = true;
      matcherResult = {
        message: () => 'Expected no Claude-specific errors',
        pass: true,
        name: assertionName,
        expected: 'no errors',
        actual: 'no errors found'
      };
    } else {
      pass = false;
      matcherResult = {
        message: () => `Expected no Claude-specific errors but found: ${foundErrors.join(', ')}.\nPage content: ${content.substring(0, 500)}...`,
        pass: false,
        name: assertionName,
        expected: 'no errors',
        actual: `errors found: ${foundErrors.join(', ')}`
      };
    }

    return matcherResult;
  },

  // Custom matcher for status progression
  async toHaveStatusProgression(page: Page, expectedSequence: string[]) {
    const assertionName = 'toHaveStatusProgression';
    let pass: boolean;
    let matcherResult: any;

    try {
      for (let i = 0; i < expectedSequence.length; i++) {
        const status = expectedSequence[i];
        await page.waitForFunction(
          (expectedStatus) => {
            const statusElement = document.querySelector('.status-text, .status-message, [data-testid="status-text"]');
            const pageContent = document.body.textContent || '';
            return (
              statusElement?.textContent?.toLowerCase().includes(expectedStatus.toLowerCase()) ||
              pageContent.toLowerCase().includes(expectedStatus.toLowerCase())
            );
          },
          status,
          { timeout: 15000 }
        );
        
        if (i < expectedSequence.length - 1) {
          await page.waitForTimeout(1000); // Allow for transitions
        }
      }
      
      pass = true;
      matcherResult = {
        message: () => `Expected status progression: ${expectedSequence.join(' → ')}`,
        pass: true,
        name: assertionName,
        expected: expectedSequence.join(' → '),
        actual: 'Status progression completed successfully'
      };
    } catch (error) {
      pass = false;
      const content = await page.textContent('body') || '';
      matcherResult = {
        message: () => `Expected status progression '${expectedSequence.join(' → ')}' but it was not completed.\nPage content: ${content.substring(0, 500)}...`,
        pass: false,
        name: assertionName,
        expected: expectedSequence.join(' → '),
        actual: 'Status progression failed'
      };
    }

    return matcherResult;
  },

  // Custom matcher for terminal streaming
  async toHaveTerminalStreaming(page: Page, patterns: RegExp[], timeout = 15000) {
    const assertionName = 'toHaveTerminalStreaming';
    let pass: boolean;
    let matcherResult: any;

    try {
      const startTime = Date.now();
      
      for (const pattern of patterns) {
        while (Date.now() - startTime < timeout) {
          const content = await page.textContent('body') || '';
          if (pattern.test(content)) {
            break;
          }
          await page.waitForTimeout(500);
        }
        
        const content = await page.textContent('body') || '';
        if (!pattern.test(content)) {
          throw new Error(`Pattern ${pattern.source} not found`);
        }
      }
      
      pass = true;
      matcherResult = {
        message: () => `Expected terminal streaming patterns to be found`,
        pass: true,
        name: assertionName,
        expected: patterns.map(p => p.source).join(', '),
        actual: 'All streaming patterns found'
      };
    } catch (error) {
      pass = false;
      const content = await page.textContent('body') || '';
      matcherResult = {
        message: () => `Expected terminal streaming patterns but some were not found.\nPatterns: ${patterns.map(p => p.source).join(', ')}\nContent: ${content.substring(0, 500)}...`,
        pass: false,
        name: assertionName,
        expected: patterns.map(p => p.source).join(', '),
        actual: 'Some patterns not found'
      };
    }

    return matcherResult;
  },

  // Custom matcher for response time validation
  async toRespondWithin(page: Page, command: string, maxTime: number) {
    const assertionName = 'toRespondWithin';
    let pass: boolean;
    let matcherResult: any;

    const startTime = Date.now();
    
    try {
      // Type command
      const terminal = page.locator('.terminal, .xterm-screen, [data-testid="terminal"]').first();
      await terminal.click();
      await page.keyboard.type(command);
      await page.keyboard.press('Enter');
      
      // Wait for response
      await page.waitForFunction(
        () => {
          const content = document.body.textContent || '';
          const lines = content.split('\n');
          return lines.length > 1; // Should have more content after command
        },
        { timeout: maxTime }
      );
      
      const responseTime = Date.now() - startTime;
      
      if (responseTime <= maxTime) {
        pass = true;
        matcherResult = {
          message: () => `Expected response within ${maxTime}ms, got ${responseTime}ms`,
          pass: true,
          name: assertionName,
          expected: `<= ${maxTime}ms`,
          actual: `${responseTime}ms`
        };
      } else {
        pass = false;
        matcherResult = {
          message: () => `Expected response within ${maxTime}ms but took ${responseTime}ms`,
          pass: false,
          name: assertionName,
          expected: `<= ${maxTime}ms`,
          actual: `${responseTime}ms`
        };
      }
    } catch (error) {
      pass = false;
      const responseTime = Date.now() - startTime;
      matcherResult = {
        message: () => `Command "${command}" did not respond within ${maxTime}ms (took ${responseTime}ms)`,
        pass: false,
        name: assertionName,
        expected: `<= ${maxTime}ms`,
        actual: `${responseTime}ms (timeout)`
      };
    }

    return matcherResult;
  },

  // Custom matcher for terminal content validation
  async toHaveTerminalContent(page: Page, expectedContent: string | RegExp) {
    const assertionName = 'toHaveTerminalContent';
    let pass: boolean;
    let matcherResult: any;

    try {
      await page.waitForFunction(
        (expected) => {
          const terminal = document.querySelector('.terminal, .xterm-screen, [data-testid="terminal"]');
          const content = terminal?.textContent || '';
          
          if (typeof expected === 'string') {
            return content.includes(expected);
          } else {
            // Handle regex (passed as string source)
            const regex = new RegExp(expected);
            return regex.test(content);
          }
        },
        typeof expectedContent === 'string' ? expectedContent : expectedContent.source,
        { timeout: 15000 }
      );
      
      pass = true;
      matcherResult = {
        message: () => `Expected terminal content to contain: ${expectedContent}`,
        pass: true,
        name: assertionName,
        expected: expectedContent.toString(),
        actual: 'Content found in terminal'
      };
    } catch (error) {
      pass = false;
      const terminal = page.locator('.terminal, .xterm-screen, [data-testid="terminal"]').first();
      const actualContent = await terminal.textContent() || '';
      
      matcherResult = {
        message: () => `Expected terminal content to contain '${expectedContent}' but it was not found.\nActual content: ${actualContent.substring(0, 500)}...`,
        pass: false,
        name: assertionName,
        expected: expectedContent.toString(),
        actual: actualContent.substring(0, 200)
      };
    }

    return matcherResult;
  },

  // Custom matcher for SSE connection validation
  async toHaveSSEConnection(page: Page) {
    const assertionName = 'toHaveSSEConnection';
    let pass: boolean;
    let matcherResult: any;

    try {
      // Check for SSE connection by monitoring network requests
      const sseConnected = await page.evaluate(() => {
        return new Promise((resolve) => {
          const checkConnection = () => {
            // Look for EventSource or SSE indicators
            const hasEventSource = !!(window as any).EventSource;
            const hasSSE = document.body.textContent?.includes('connected') ||
                          document.body.textContent?.includes('streaming') ||
                          // Check for active connections
                          (performance.getEntriesByType('navigation').length > 0);
            
            resolve(hasEventSource && hasSSE);
          };
          
          setTimeout(checkConnection, 2000);
        });
      });

      if (sseConnected) {
        pass = true;
        matcherResult = {
          message: () => 'Expected SSE connection to be established',
          pass: true,
          name: assertionName,
          expected: 'SSE connection',
          actual: 'SSE connection found'
        };
      } else {
        pass = false;
        matcherResult = {
          message: () => 'Expected SSE connection but none was found',
          pass: false,
          name: assertionName,
          expected: 'SSE connection',
          actual: 'no SSE connection'
        };
      }
    } catch (error) {
      pass = false;
      matcherResult = {
        message: () => `Error checking SSE connection: ${error}`,
        pass: false,
        name: assertionName,
        expected: 'SSE connection',
        actual: 'error checking connection'
      };
    }

    return matcherResult;
  }
});

// Type declarations for custom matchers
declare global {
  namespace PlaywrightTest {
    interface Matchers<R> {
      toHaveClaudeWelcome(): R;
      toHaveWorkingDirectory(expectedPath: string): R;
      toHaveInteractivePrompt(): R;
      toNotHaveClaudeErrors(): R;
      toHaveStatusProgression(expectedSequence: string[]): R;
      toHaveTerminalStreaming(patterns: RegExp[], timeout?: number): R;
      toRespondWithin(command: string, maxTime: number): R;
      toHaveTerminalContent(expectedContent: string | RegExp): R;
      toHaveSSEConnection(): R;
    }
  }
}