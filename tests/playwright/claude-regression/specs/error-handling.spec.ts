import { test, expect } from '@playwright/test';
import { ClaudeInstancePage } from '../page-objects/ClaudeInstancePage';
import { TerminalComponent } from '../page-objects/TerminalComponent';
import { StatusIndicator } from '../page-objects/StatusIndicator';

test.describe('Error Handling Scenarios', () => {
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

  test.describe('Instance Creation Errors', () => {
    test('should handle server unavailable gracefully', async ({ page }) => {
      // Mock server error
      await page.route('**/api/claude**', route => route.fulfill({
        status: 500,
        body: 'Internal Server Error'
      }));

      await claudePage.clickClaudeWorkingButton();
      
      // Should show error status
      await expect(async () => {
        const hasError = await status.hasErrorStatus();
        expect(hasError).toBeTruthy();
      }).toPass({ timeout: 15000 });
      
      // Should not show the problematic error message
      const content = await terminal.getFullContent();
      expect(content).not.toContain('--print requires input');
    });

    test('should handle authentication errors', async ({ page }) => {
      // Mock authentication error
      await page.route('**/api/claude**', route => route.fulfill({
        status: 401,
        body: 'Unauthorized'
      }));

      await claudePage.clickClaudeWorkingButton();
      
      await page.waitForTimeout(5000);
      
      // Should handle auth error appropriately
      const statusText = await status.getCurrentStatus();
      expect(['error', 'unauthorized', 'failed']).toContain(statusText.toLowerCase());
    });

    test('should handle timeout during instance creation', async ({ page }) => {
      // Mock slow response
      await page.route('**/api/claude**', route => {
        setTimeout(() => route.fulfill({ status: 200, body: 'OK' }), 60000);
      });

      await claudePage.clickClaudeWorkingButton();
      
      // Should eventually timeout gracefully
      await expect(async () => {
        const statusText = await status.getCurrentStatus();
        expect(['timeout', 'error', 'failed']).toContain(statusText.toLowerCase());
      }).toPass({ timeout: 35000 });
    });

    test('should prevent --print requires input error', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      
      // Wait for any potential errors to appear
      await page.waitForTimeout(10000);
      
      const content = await terminal.getFullContent();
      
      // The specific error we're preventing
      expect(content).not.toContain('--print requires input');
      expect(content).not.toContain('Error: --print requires input');
    });
  });

  test.describe('Runtime Error Handling', () => {
    test('should handle Claude process crashes gracefully', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Simulate process crash by intercepting and failing requests
      await page.route('**/api/sse**', route => route.abort());
      await page.route('**/api/claude**', route => route.abort());
      
      await terminal.sendCommand('Hello Claude');
      
      // Should detect and handle the crash
      await expect(async () => {
        const hasError = await status.hasErrorStatus();
        const statusText = await status.getCurrentStatus();
        expect(hasError || ['disconnected', 'error', 'failed'].includes(statusText.toLowerCase())).toBeTruthy();
      }).toPass({ timeout: 15000 });
    });

    test('should recover from temporary failures', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      let requestCount = 0;
      await page.route('**/api/claude**', route => {
        requestCount++;
        if (requestCount <= 2) {
          // Fail first few requests
          route.abort();
        } else {
          // Allow subsequent requests
          route.continue();
        }
      });
      
      await terminal.sendCommand('Test recovery');
      
      // Should eventually recover
      await expect(async () => {
        const response = await terminal.getFullContent();
        expect(response).toMatch(/test|recovery|hello/i);
      }).toPass({ timeout: 30000 });
    });

    test('should handle malformed server responses', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Mock malformed JSON response
      await page.route('**/api/claude**', route => route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: '{"invalid": json malformed'
      }));
      
      await terminal.sendCommand('Test malformed response');
      
      // Should handle gracefully
      await page.waitForTimeout(5000);
      const hasError = await claudePage.hasErrorMessage();
      
      if (hasError) {
        // If error is shown, it should not be the specific problematic one
        const content = await terminal.getFullContent();
        expect(content).not.toContain('--print requires input');
      }
    });

    test('should handle unexpected response formats', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Mock HTML response instead of expected format
      await page.route('**/api/claude**', route => route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/html' },
        body: '<html><body>Unexpected HTML</body></html>'
      }));
      
      await terminal.sendCommand('Test unexpected format');
      
      await page.waitForTimeout(5000);
      
      // Should handle without crashing
      const content = await terminal.getFullContent();
      expect(content).not.toContain('--print requires input');
    });
  });

  test.describe('Input Validation and Sanitization', () => {
    test('should handle potentially dangerous input safely', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      const dangerousInputs = [
        '<script>alert("xss")</script>',
        '${process.exit(1)}',
        '../../etc/passwd',
        'rm -rf /',
        '\x00\x01\x02', // null bytes
        'eval("malicious code")'
      ];
      
      for (const input of dangerousInputs) {
        await terminal.sendCommand(input);
        await terminal.waitForNewLine(10000);
        
        // Should handle safely without execution
        const content = await terminal.getFullContent();
        expect(content).not.toContain('--print requires input');
        expect(content).not.toContain('Error');
        
        // Page should still be functional
        const isPageResponsive = await page.evaluate(() => document.readyState === 'complete');
        expect(isPageResponsive).toBeTruthy();
      }
    });

    test('should handle extremely long inputs', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Very long input
      const longInput = 'A'.repeat(100000);
      
      await terminal.sendCommand(longInput);
      
      // Should handle without errors
      await expect(async () => {
        const content = await terminal.getFullContent();
        expect(content).not.toContain('--print requires input');
        
        // Should get some response (even if truncated)
        expect(content.length).toBeGreaterThan(0);
      }).toPass({ timeout: 30000 });
    });

    test('should handle binary data input', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Binary-like input
      const binaryInput = Array.from({length: 256}, (_, i) => String.fromCharCode(i)).join('');
      
      await terminal.sendCommand(binaryInput);
      await terminal.waitForNewLine(15000);
      
      const content = await terminal.getFullContent();
      expect(content).not.toContain('--print requires input');
    });
  });

  test.describe('Resource Exhaustion Handling', () => {
    test('should handle memory pressure gracefully', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Generate memory-intensive requests
      const memoryIntensiveQueries = Array(10).fill(0).map((_, i) => 
        `Generate a very detailed analysis with lots of data ${i}: ${'data '.repeat(1000)}`
      );
      
      for (const query of memoryIntensiveQueries) {
        await terminal.sendCommand(query);
        await page.waitForTimeout(2000);
        
        // Check if system is still responsive
        const statusText = await status.getCurrentStatus();
        if (statusText.toLowerCase().includes('error')) {
          break;
        }
      }
      
      // System should still be functional
      await terminal.sendCommand('Simple test');
      await terminal.waitForNewLine(10000);
      
      const finalContent = await terminal.getFullContent();
      expect(finalContent).not.toContain('--print requires input');
    });

    test('should handle CPU-intensive operations', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Request that might be CPU intensive
      await terminal.sendCommand('Generate 1000 fibonacci numbers and explain the algorithm in detail');
      
      // Should handle without freezing
      await page.waitForTimeout(30000);
      
      // Should still be responsive
      await terminal.sendCommand('Are you still responsive?');
      
      await expect(async () => {
        const response = await terminal.getFullContent();
        expect(response).toMatch(/yes|responsive|working|here/i);
      }).toPass({ timeout: 20000 });
    });
  });

  test.describe('Error Recovery and Continuity', () => {
    test('should maintain session after recoverable errors', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Establish context
      await terminal.sendCommand('Remember that my name is ErrorTestUser');
      await terminal.waitForNewLine();
      
      // Cause an error
      await page.route('**/api/claude**', route => route.abort(), { times: 1 });
      await terminal.sendCommand('This request will fail');
      await page.waitForTimeout(3000);
      
      // Remove route to restore functionality
      await page.unroute('**/api/claude**');
      
      // Test context retention
      await terminal.sendCommand('What is my name?');
      await terminal.waitForText('ErrorTestUser', 15000);
    });

    test('should provide clear error messages to users', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      
      // Mock various error conditions
      await page.route('**/api/claude**', route => route.fulfill({
        status: 503,
        body: 'Service Unavailable'
      }));
      
      await page.waitForTimeout(10000);
      
      // Should show user-friendly error message
      const content = await terminal.getFullContent();
      const statusText = await status.getCurrentStatus();
      
      // Should indicate error without exposing technical details
      expect(['error', 'unavailable', 'failed', 'problem'].some(word => 
        statusText.toLowerCase().includes(word) || content.toLowerCase().includes(word)
      )).toBeTruthy();
      
      // Should not show raw error messages
      expect(content).not.toContain('--print requires input');
      expect(content).not.toContain('Service Unavailable');
    });

    test('should allow retry after errors', async ({ page }) => {
      let attemptCount = 0;
      
      await page.route('**/api/claude**', route => {
        attemptCount++;
        if (attemptCount <= 2) {
          route.fulfill({ status: 500, body: 'Error' });
        } else {
          route.continue();
        }
      });
      
      await claudePage.clickClaudeWorkingButton();
      
      // Should eventually succeed after retries
      await expect(async () => {
        const hasWelcome = await claudePage.hasWelcomeMessage();
        expect(hasWelcome).toBeTruthy();
      }).toPass({ timeout: 45000 });
    });
  });

  test.describe('Edge Case Error Scenarios', () => {
    test('should handle rapid button clicking during errors', async ({ page }) => {
      // Mock server errors
      await page.route('**/api/claude**', route => route.fulfill({
        status: 500,
        body: 'Server Error'
      }));
      
      // Click buttons rapidly
      for (let i = 0; i < 5; i++) {
        await claudePage.clickClaudeWorkingButton();
        await page.waitForTimeout(200);
      }
      
      // Should handle gracefully
      await page.waitForTimeout(5000);
      
      const content = await terminal.getFullContent();
      expect(content).not.toContain('--print requires input');
    });

    test('should handle page refresh during error states', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      
      // Force error state
      await page.route('**/api/claude**', route => route.abort());
      await terminal.sendCommand('This will fail');
      await page.waitForTimeout(3000);
      
      // Refresh page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Page should load normally
      const isLoaded = await page.isVisible('body');
      expect(isLoaded).toBeTruthy();
    });

    test('should handle concurrent error conditions', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Create multiple error conditions simultaneously
      await page.route('**/api/sse**', route => route.abort());
      await page.route('**/api/claude**', route => route.fulfill({
        status: 500,
        body: 'Multiple errors'
      }));
      
      // Send commands while errors are occurring
      const commands = ['Test 1', 'Test 2', 'Test 3'];
      for (const command of commands) {
        await terminal.sendCommand(command);
        await page.waitForTimeout(1000);
      }
      
      // Should handle multiple errors without breaking
      await page.waitForTimeout(5000);
      const content = await terminal.getFullContent();
      expect(content).not.toContain('--print requires input');
    });
  });
});