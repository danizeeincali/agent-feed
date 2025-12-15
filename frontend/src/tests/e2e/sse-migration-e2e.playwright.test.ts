/**
 * End-to-End Tests for SSE Migration
 * Full user workflow testing with Playwright
 */

import { test, expect, Page, Browser } from '@playwright/test';
import { DEFAULT_TEST_CONFIG } from '../config/sse-migration-test-config';

// Test data and utilities
interface TestSession {
  page: Page;
  sessionId: string;
  startTime: number;
}

class E2ETestHelpers {
  static async createSession(page: Page): Promise<TestSession> {
    const sessionId = `test-session-${Date.now()}`;
    const startTime = Date.now();
    
    // Navigate to application
    await page.goto('http://localhost:3000');
    
    // Wait for app to load
    await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 10000 });
    
    return { page, sessionId, startTime };
  }

  static async waitForConnection(page: Page, timeout = 10000): Promise<void> {
    await page.waitForSelector('[data-testid="connection-status"]', { 
      state: 'visible',
      timeout 
    });
    
    await expect(page.locator('[data-testid="connection-status"]'))
      .toContainText('Connected', { timeout });
  }

  static async sendCommand(page: Page, command: string): Promise<void> {
    await page.fill('[data-testid="command-input"]', command);
    await page.click('[data-testid="send-command"]');
  }

  static async waitForOutput(page: Page, expectedText: string, timeout = 5000): Promise<void> {
    await expect(page.locator('[data-testid="terminal-output"]'))
      .toContainText(expectedText, { timeout });
  }

  static async measurePerformance(page: Page, action: () => Promise<void>): Promise<number> {
    const startTime = Date.now();
    await action();
    return Date.now() - startTime;
  }

  static async simulateNetworkConditions(page: Page, condition: 'slow' | 'offline' | 'normal'): Promise<void> {
    const context = page.context();
    
    switch (condition) {
      case 'slow':
        await context.route('**/*', route => {
          setTimeout(() => route.continue(), 1000); // 1 second delay
        });
        break;
      case 'offline':
        await context.setOffline(true);
        break;
      case 'normal':
        await context.setOffline(false);
        await context.unroute('**/*');
        break;
    }
  }
}

test.describe('SSE Migration E2E Tests', () => {
  let session: TestSession;

  test.beforeEach(async ({ page }) => {
    session = await E2ETestHelpers.createSession(page);
  });

  test.describe('Basic Functionality', () => {
    test('should establish SSE connection on load', async ({ page }) => {
      await E2ETestHelpers.waitForConnection(page);
      
      // Verify connection status
      const statusElement = page.locator('[data-testid="connection-status"]');
      await expect(statusElement).toBeVisible();
      await expect(statusElement).toContainText('Connected');
    });

    test('should send HTTP commands and receive responses', async ({ page }) => {
      await E2ETestHelpers.waitForConnection(page);
      
      // Send a simple command
      await E2ETestHelpers.sendCommand(page, 'echo "Hello World"');
      
      // Wait for response
      await E2ETestHelpers.waitForOutput(page, 'Hello World');
      
      // Verify command appears in history
      await expect(page.locator('[data-testid="command-history"]'))
        .toContainText('echo "Hello World"');
    });

    test('should handle real-time output streaming', async ({ page }) => {
      await E2ETestHelpers.waitForConnection(page);
      
      // Send command that produces streaming output
      await E2ETestHelpers.sendCommand(page, 'npm install --verbose');
      
      // Wait for streaming output to appear
      await page.waitForFunction(() => {
        const output = document.querySelector('[data-testid="terminal-output"]');
        return output && output.textContent && output.textContent.split('\n').length > 5;
      }, { timeout: 30000 });
      
      // Verify multiple lines of output
      const outputLines = await page.locator('[data-testid="terminal-output"] .output-line').count();
      expect(outputLines).toBeGreaterThan(3);
    });

    test('should support multiple terminal instances', async ({ page }) => {
      await E2ETestHelpers.waitForConnection(page);
      
      // Open second terminal instance
      await page.click('[data-testid="new-instance-button"]');
      
      // Wait for second instance
      await page.waitForSelector('[data-testid="terminal-instance-2"]');
      
      // Send commands to both instances
      await page.fill('[data-testid="command-input-1"]', 'echo "Instance 1"');
      await page.click('[data-testid="send-command-1"]');
      
      await page.fill('[data-testid="command-input-2"]', 'echo "Instance 2"');
      await page.click('[data-testid="send-command-2"]');
      
      // Verify outputs appear in correct instances
      await expect(page.locator('[data-testid="terminal-output-1"]'))
        .toContainText('Instance 1');
      await expect(page.locator('[data-testid="terminal-output-2"]'))
        .toContainText('Instance 2');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle connection failures gracefully', async ({ page }) => {
      // Start with good connection
      await E2ETestHelpers.waitForConnection(page);
      
      // Simulate server disconnect
      await page.evaluate(() => {
        // Close EventSource connection
        (window as any).__testEventSource?.close();
      });
      
      // Should show reconnecting status
      await expect(page.locator('[data-testid="connection-status"]'))
        .toContainText('Reconnecting', { timeout: 5000 });
      
      // Should eventually reconnect
      await expect(page.locator('[data-testid="connection-status"]'))
        .toContainText('Connected', { timeout: 15000 });
    });

    test('should handle HTTP command errors', async ({ page }) => {
      await E2ETestHelpers.waitForConnection(page);
      
      // Send invalid command
      await E2ETestHelpers.sendCommand(page, 'invalidcommand12345');
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]'))
        .toBeVisible({ timeout: 5000 });
      
      await expect(page.locator('[data-testid="error-message"]'))
        .toContainText('command not found');
    });

    test('should recover from network interruptions', async ({ page }) => {
      await E2ETestHelpers.waitForConnection(page);
      
      // Send initial command to verify working state
      await E2ETestHelpers.sendCommand(page, 'echo "Before interruption"');
      await E2ETestHelpers.waitForOutput(page, 'Before interruption');
      
      // Simulate network interruption
      await E2ETestHelpers.simulateNetworkConditions(page, 'offline');
      
      // Try to send command during offline state
      await E2ETestHelpers.sendCommand(page, 'echo "During offline"');
      
      // Should show offline status
      await expect(page.locator('[data-testid="connection-status"]'))
        .toContainText('Disconnected', { timeout: 5000 });
      
      // Restore network
      await E2ETestHelpers.simulateNetworkConditions(page, 'normal');
      
      // Should reconnect and send queued command
      await E2ETestHelpers.waitForConnection(page);
      await E2ETestHelpers.waitForOutput(page, 'During offline');
    });

    test('should handle browser tab switching', async ({ page }) => {
      await E2ETestHelpers.waitForConnection(page);
      
      // Send command before hiding
      await E2ETestHelpers.sendCommand(page, 'echo "Before hidden"');
      await E2ETestHelpers.waitForOutput(page, 'Before hidden');
      
      // Simulate tab hidden (Page Visibility API)
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { value: true, writable: true });
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      
      // Wait a bit
      await page.waitForTimeout(2000);
      
      // Simulate tab visible again
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { value: false, writable: true });
        Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      
      // Should maintain/restore connection
      await E2ETestHelpers.waitForConnection(page);
      
      // Send command after restoration
      await E2ETestHelpers.sendCommand(page, 'echo "After visible"');
      await E2ETestHelpers.waitForOutput(page, 'After visible');
    });
  });

  test.describe('Performance', () => {
    test('should establish connection quickly', async ({ page }) => {
      const connectionTime = await E2ETestHelpers.measurePerformance(page, async () => {
        await E2ETestHelpers.waitForConnection(page);
      });
      
      expect(connectionTime).toBeLessThan(DEFAULT_TEST_CONFIG.performance.maxConnectionTime);
    });

    test('should handle rapid command execution', async ({ page }) => {
      await E2ETestHelpers.waitForConnection(page);
      
      const commands = [
        'echo "Command 1"',
        'echo "Command 2"',
        'echo "Command 3"',
        'echo "Command 4"',
        'echo "Command 5"',
      ];
      
      const executionTime = await E2ETestHelpers.measurePerformance(page, async () => {
        for (const command of commands) {
          await E2ETestHelpers.sendCommand(page, command);
        }
        
        // Wait for all outputs
        for (let i = 1; i <= commands.length; i++) {
          await E2ETestHelpers.waitForOutput(page, `Command ${i}`);
        }
      });
      
      // Should execute all commands within reasonable time
      expect(executionTime).toBeLessThan(10000); // 10 seconds
      
      // Verify all commands executed
      const outputText = await page.locator('[data-testid="terminal-output"]').textContent();
      for (let i = 1; i <= commands.length; i++) {
        expect(outputText).toContain(`Command ${i}`);
      }
    });

    test('should handle large output efficiently', async ({ page }) => {
      await E2ETestHelpers.waitForConnection(page);
      
      // Command that generates large output
      await E2ETestHelpers.sendCommand(page, 'find /usr -type f | head -1000');
      
      const processingTime = await E2ETestHelpers.measurePerformance(page, async () => {
        await page.waitForFunction(() => {
          const output = document.querySelector('[data-testid="terminal-output"]');
          return output && output.textContent && output.textContent.split('\n').length >= 100;
        }, { timeout: 30000 });
      });
      
      expect(processingTime).toBeLessThan(15000); // 15 seconds
      
      // Verify UI remains responsive
      await page.click('[data-testid="command-input"]');
      await expect(page.locator('[data-testid="command-input"]')).toBeFocused();
    });

    test('should maintain performance with slow network', async ({ page }) => {
      // Simulate slow network
      await E2ETestHelpers.simulateNetworkConditions(page, 'slow');
      
      await E2ETestHelpers.waitForConnection(page, 20000); // Extended timeout for slow network
      
      const commandTime = await E2ETestHelpers.measurePerformance(page, async () => {
        await E2ETestHelpers.sendCommand(page, 'echo "Slow network test"');
        await E2ETestHelpers.waitForOutput(page, 'Slow network test', 10000);
      });
      
      // Should still work, just slower
      expect(commandTime).toBeLessThan(8000); // 8 seconds with slow network
    });
  });

  test.describe('User Experience', () => {
    test('should provide visual feedback for all actions', async ({ page }) => {
      await E2ETestHelpers.waitForConnection(page);
      
      // Verify loading states
      await page.click('[data-testid="send-command"]');
      
      // Should show sending indicator
      await expect(page.locator('[data-testid="command-sending"]'))
        .toBeVisible({ timeout: 1000 });
      
      // Should hide sending indicator when complete
      await expect(page.locator('[data-testid="command-sending"]'))
        .toBeHidden({ timeout: 5000 });
    });

    test('should maintain command history', async ({ page }) => {
      await E2ETestHelpers.waitForConnection(page);
      
      const testCommands = [
        'echo "First command"',
        'pwd',
        'ls -la',
        'echo "Last command"',
      ];
      
      // Send multiple commands
      for (const command of testCommands) {
        await E2ETestHelpers.sendCommand(page, command);
        await page.waitForTimeout(500);
      }
      
      // Check command history
      const historyItems = page.locator('[data-testid="command-history"] .history-item');
      await expect(historyItems).toHaveCount(testCommands.length);
      
      // Verify history contents
      for (let i = 0; i < testCommands.length; i++) {
        await expect(historyItems.nth(i)).toContainText(testCommands[i]);
      }
    });

    test('should support keyboard shortcuts', async ({ page }) => {
      await E2ETestHelpers.waitForConnection(page);
      
      // Test command history navigation
      await E2ETestHelpers.sendCommand(page, 'echo "Previous command"');
      await E2ETestHelpers.waitForOutput(page, 'Previous command');
      
      // Focus input and use arrow up to recall command
      await page.click('[data-testid="command-input"]');
      await page.keyboard.press('ArrowUp');
      
      // Should populate with previous command
      await expect(page.locator('[data-testid="command-input"]'))
        .toHaveValue('echo "Previous command"');
      
      // Test Ctrl+C to cancel
      await page.keyboard.press('Control+c');
      await expect(page.locator('[data-testid="command-input"]'))
        .toHaveValue('');
    });

    test('should handle window resize gracefully', async ({ page }) => {
      await E2ETestHelpers.waitForConnection(page);
      
      // Start with normal window size
      await page.setViewportSize({ width: 1200, height: 800 });
      
      await E2ETestHelpers.sendCommand(page, 'echo "Normal size"');
      await E2ETestHelpers.waitForOutput(page, 'Normal size');
      
      // Resize to mobile size
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Should still work
      await E2ETestHelpers.sendCommand(page, 'echo "Mobile size"');
      await E2ETestHelpers.waitForOutput(page, 'Mobile size');
      
      // Verify responsive layout
      await expect(page.locator('[data-testid="terminal-container"]'))
        .toBeVisible();
      
      // Resize to very wide
      await page.setViewportSize({ width: 2560, height: 1440 });
      
      await E2ETestHelpers.sendCommand(page, 'echo "Wide screen"');
      await E2ETestHelpers.waitForOutput(page, 'Wide screen');
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle special characters in commands', async ({ page }) => {
      await E2ETestHelpers.waitForConnection(page);
      
      const specialCommands = [
        'echo "Hello $USER"',
        'echo \'Single quotes\'',
        'echo "Unicode: 🚀 ñáéíóú"',
        'echo "Backslashes: \\n \\t \\\\"',
      ];
      
      for (const command of specialCommands) {
        await E2ETestHelpers.sendCommand(page, command);
        await page.waitForTimeout(1000); // Allow processing time
      }
      
      // Verify all outputs appeared
      const outputText = await page.locator('[data-testid="terminal-output"]').textContent();
      expect(outputText).toContain('Hello');
      expect(outputText).toContain('Single quotes');
      expect(outputText).toContain('🚀');
    });

    test('should handle very long commands', async ({ page }) => {
      await E2ETestHelpers.waitForConnection(page);
      
      const longCommand = 'echo "' + 'A'.repeat(1000) + '"';
      
      await E2ETestHelpers.sendCommand(page, longCommand);
      await E2ETestHelpers.waitForOutput(page, 'A'.repeat(50), 10000); // Wait for part of output
      
      // Verify command was processed
      const outputText = await page.locator('[data-testid="terminal-output"]').textContent();
      expect(outputText?.length).toBeGreaterThan(500);
    });

    test('should handle rapid connection open/close cycles', async ({ page }) => {
      await E2ETestHelpers.waitForConnection(page);
      
      // Rapidly disconnect and reconnect
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => {
          (window as any).__testEventSource?.close();
        });
        
        await page.waitForTimeout(100);
        
        // Should attempt reconnection
        await E2ETestHelpers.waitForConnection(page, 10000);
        
        // Verify still functional
        await E2ETestHelpers.sendCommand(page, `echo "Cycle ${i}"`);
        await E2ETestHelpers.waitForOutput(page, `Cycle ${i}`);
      }
    });

    test('should handle browser back/forward navigation', async ({ page }) => {
      await E2ETestHelpers.waitForConnection(page);
      
      await E2ETestHelpers.sendCommand(page, 'echo "Before navigation"');
      await E2ETestHelpers.waitForOutput(page, 'Before navigation');
      
      // Navigate to different page and back
      await page.goto('about:blank');
      await page.waitForTimeout(1000);
      await page.goBack();
      
      // Should restore connection and state
      await E2ETestHelpers.waitForConnection(page);
      
      // Verify previous output is still there
      await expect(page.locator('[data-testid="terminal-output"]'))
        .toContainText('Before navigation');
      
      // Should still be functional
      await E2ETestHelpers.sendCommand(page, 'echo "After navigation"');
      await E2ETestHelpers.waitForOutput(page, 'After navigation');
    });
  });

  test.describe('Cross-browser Compatibility', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should work correctly in ${browserName}`, async ({ page }) => {
        // Skip if not the target browser
        if (!page.context().browser()?.browserType().name().includes(browserName.replace('webkit', 'safari'))) {
          test.skip();
        }
        
        await E2ETestHelpers.waitForConnection(page);
        
        // Basic functionality test
        await E2ETestHelpers.sendCommand(page, `echo "Testing in ${browserName}"`);
        await E2ETestHelpers.waitForOutput(page, `Testing in ${browserName}`);
        
        // Connection stability test
        for (let i = 0; i < 3; i++) {
          await E2ETestHelpers.sendCommand(page, `echo "Stability test ${i}"`);
          await E2ETestHelpers.waitForOutput(page, `Stability test ${i}`);
          await page.waitForTimeout(500);
        }
      });
    });
  });
});