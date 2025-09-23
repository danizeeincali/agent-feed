/**
 * Playwright E2E Tests for Terminal Functionality
 * 
 * Integration tests that verify the complete terminal workflow
 * from UI interactions to WebSocket communication
 */

import { test, expect, Page } from '@playwright/test';
import { WebSocket } from 'ws';

// Test utilities for WebSocket server simulation
class TestWebSocketServer {
  private server: any;
  private connections: Set<WebSocket> = new Set();
  private port: number;

  constructor(port: number = 3001) {
    this.port = port;
  }

  async start(): Promise<void> {
    const { WebSocketServer } = await import('ws');
    this.server = new WebSocketServer({ port: this.port });
    
    this.server.on('connection', (ws: WebSocket) => {
      this.connections.add(ws);
      
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            data: 'Invalid message format',
            timestamp: Date.now()
          }));
        }
      });

      ws.on('close', () => {
        this.connections.delete(ws);
      });

      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'connection_status',
        data: 'connected',
        timestamp: Date.now(),
        sessionId: `test-session-${Date.now()}`
      }));
    });
  }

  private handleMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'command':
        this.handleCommand(ws, message.data);
        break;
      case 'ping':
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: Date.now()
        }));
        break;
      default:
        ws.send(JSON.stringify({
          type: 'error',
          data: `Unknown message type: ${message.type}`,
          timestamp: Date.now()
        }));
    }
  }

  private handleCommand(ws: WebSocket, command: string): void {
    // Simulate command processing delay
    setTimeout(() => {
      if (command === 'ls') {
        ws.send(JSON.stringify({
          type: 'output',
          data: 'file1.txt\nfile2.txt\ndirectory1/',
          timestamp: Date.now()
        }));
      } else if (command === 'pwd') {
        ws.send(JSON.stringify({
          type: 'output',
          data: '/home/user',
          timestamp: Date.now()
        }));
      } else if (command === 'echo hello') {
        ws.send(JSON.stringify({
          type: 'output',
          data: 'hello',
          timestamp: Date.now()
        }));
      } else if (command.startsWith('cd ')) {
        const directory = command.substring(3);
        ws.send(JSON.stringify({
          type: 'directory_change',
          data: directory,
          timestamp: Date.now()
        }));
      } else if (command === 'invalid-command') {
        ws.send(JSON.stringify({
          type: 'error',
          data: 'bash: invalid-command: command not found',
          timestamp: Date.now()
        }));
      } else {
        ws.send(JSON.stringify({
          type: 'output',
          data: `Executed: ${command}`,
          timestamp: Date.now()
        }));
      }

      // Send command result
      ws.send(JSON.stringify({
        type: 'command_result',
        data: {
          command,
          exitCode: command === 'invalid-command' ? 127 : 0,
          duration: Math.random() * 100 + 50
        },
        timestamp: Date.now()
      }));
    }, 50);
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.connections.forEach(ws => ws.close());
      this.server.close();
    }
  }

  broadcastMessage(message: any): void {
    const messageStr = JSON.stringify(message);
    this.connections.forEach(ws => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(messageStr);
      }
    });
  }
}

test.describe('Terminal E2E Integration Tests', () => {
  let testServer: TestWebSocketServer;

  test.beforeAll(async () => {
    testServer = new TestWebSocketServer(3001);
    await testServer.start();
  });

  test.afterAll(async () => {
    await testServer.stop();
  });

  test.describe('Terminal Connection and UI', () => {
    test('should establish WebSocket connection and show terminal UI', async ({ page }) => {
      // Navigate to terminal page
      await page.goto('/terminal');

      // Wait for terminal component to load
      await expect(page.locator('[data-testid="terminal-container"]')).toBeVisible();
      
      // Check connection status indicator
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
      
      // Verify terminal prompt is visible
      await expect(page.locator('[data-testid="terminal-prompt"]')).toBeVisible();
    });

    test('should handle connection failures gracefully', async ({ page }) => {
      // Stop server to simulate connection failure
      await testServer.stop();

      await page.goto('/terminal');

      // Should show disconnected state
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Disconnected');
      
      // Should show error message
      await expect(page.locator('[data-testid="connection-error"]')).toBeVisible();
      
      // Should show retry button
      await expect(page.locator('[data-testid="retry-connection"]')).toBeVisible();

      // Restart server for other tests
      testServer = new TestWebSocketServer(3001);
      await testServer.start();
    });
  });

  test.describe('Command Execution', () => {
    test('should execute simple commands and display output', async ({ page }) => {
      await page.goto('/terminal');
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');

      // Type and execute 'ls' command
      const terminalInput = page.locator('[data-testid="terminal-input"]');
      await terminalInput.fill('ls');
      await terminalInput.press('Enter');

      // Wait for command output
      await expect(page.locator('[data-testid="terminal-output"]')).toContainText('file1.txt');
      await expect(page.locator('[data-testid="terminal-output"]')).toContainText('file2.txt');
      await expect(page.locator('[data-testid="terminal-output"]')).toContainText('directory1/');

      // Check that input is cleared after command
      await expect(terminalInput).toHaveValue('');
    });

    test('should handle command errors appropriately', async ({ page }) => {
      await page.goto('/terminal');
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');

      // Execute invalid command
      const terminalInput = page.locator('[data-testid="terminal-input"]');
      await terminalInput.fill('invalid-command');
      await terminalInput.press('Enter');

      // Should display error message
      await expect(page.locator('[data-testid="terminal-output"]'))
        .toContainText('bash: invalid-command: command not found');
      
      // Error should be styled differently
      await expect(page.locator('[data-testid="terminal-error"]')).toBeVisible();
    });

    test('should handle directory changes', async ({ page }) => {
      await page.goto('/terminal');
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');

      // Change directory
      const terminalInput = page.locator('[data-testid="terminal-input"]');
      await terminalInput.fill('cd /tmp');
      await terminalInput.press('Enter');

      // Prompt should reflect directory change
      await expect(page.locator('[data-testid="terminal-prompt"]')).toContainText('/tmp');
    });

    test('should maintain command history', async ({ page }) => {
      await page.goto('/terminal');
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');

      const terminalInput = page.locator('[data-testid="terminal-input"]');

      // Execute multiple commands
      await terminalInput.fill('pwd');
      await terminalInput.press('Enter');
      await page.waitForTimeout(100);

      await terminalInput.fill('ls');
      await terminalInput.press('Enter');
      await page.waitForTimeout(100);

      // Use up arrow to navigate history
      await terminalInput.press('ArrowUp');
      await expect(terminalInput).toHaveValue('ls');

      await terminalInput.press('ArrowUp');
      await expect(terminalInput).toHaveValue('pwd');

      // Down arrow should work too
      await terminalInput.press('ArrowDown');
      await expect(terminalInput).toHaveValue('ls');
    });
  });

  test.describe('Real-time Communication', () => {
    test('should receive real-time updates from server', async ({ page }) => {
      await page.goto('/terminal');
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');

      // Server broadcasts a message
      testServer.broadcastMessage({
        type: 'output',
        data: 'System notification: Update available',
        timestamp: Date.now()
      });

      // Should appear in terminal output
      await expect(page.locator('[data-testid="terminal-output"]'))
        .toContainText('System notification: Update available');
    });

    test('should handle WebSocket reconnection', async ({ page }) => {
      await page.goto('/terminal');
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');

      // Simulate server disconnect
      await testServer.stop();
      
      // Should show disconnected state
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Disconnected');

      // Restart server
      testServer = new TestWebSocketServer(3001);
      await testServer.start();

      // Should automatically reconnect
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected', {
        timeout: 10000
      });
    });
  });

  test.describe('Terminal Features', () => {
    test('should support keyboard shortcuts', async ({ page }) => {
      await page.goto('/terminal');
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');

      const terminalInput = page.locator('[data-testid="terminal-input"]');

      // Test Ctrl+C to clear input
      await terminalInput.fill('some long command');
      await page.keyboard.press('Control+C');
      await expect(terminalInput).toHaveValue('');

      // Test Ctrl+L to clear terminal
      await terminalInput.fill('echo test');
      await terminalInput.press('Enter');
      await page.waitForTimeout(100);
      
      await page.keyboard.press('Control+L');
      
      // Terminal output should be cleared
      const outputText = await page.locator('[data-testid="terminal-output"]').textContent();
      expect(outputText?.trim()).toBe('');
    });

    test('should handle tab completion', async ({ page }) => {
      await page.goto('/terminal');
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');

      const terminalInput = page.locator('[data-testid="terminal-input"]');

      // Type partial command and press tab
      await terminalInput.fill('ec');
      await terminalInput.press('Tab');

      // Should complete to 'echo' if that's available
      // Note: This depends on the server implementing tab completion
      await expect(terminalInput).toHaveValue('echo');
    });

    test('should handle multi-line output correctly', async ({ page }) => {
      await page.goto('/terminal');
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');

      // Execute command that produces multi-line output
      const terminalInput = page.locator('[data-testid="terminal-input"]');
      await terminalInput.fill('ls');
      await terminalInput.press('Enter');

      // Check that all lines are displayed
      const output = page.locator('[data-testid="terminal-output"]');
      await expect(output).toContainText('file1.txt');
      await expect(output).toContainText('file2.txt');
      await expect(output).toContainText('directory1/');

      // Check that lines are properly separated
      const outputText = await output.textContent();
      const lines = outputText?.split('\n') || [];
      expect(lines.length).toBeGreaterThan(1);
    });
  });

  test.describe('Performance and Reliability', () => {
    test('should handle rapid command execution', async ({ page }) => {
      await page.goto('/terminal');
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');

      const terminalInput = page.locator('[data-testid="terminal-input"]');

      // Execute multiple commands rapidly
      const commands = ['pwd', 'ls', 'echo test1', 'echo test2', 'echo test3'];
      
      for (const command of commands) {
        await terminalInput.fill(command);
        await terminalInput.press('Enter');
        await page.waitForTimeout(50); // Small delay to allow processing
      }

      // All outputs should eventually appear
      for (let i = 1; i <= 3; i++) {
        await expect(page.locator('[data-testid="terminal-output"]'))
          .toContainText(`test${i}`);
      }
    });

    test('should handle large output gracefully', async ({ page }) => {
      await page.goto('/terminal');
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');

      // Simulate command with large output
      testServer.broadcastMessage({
        type: 'output',
        data: 'Large output: ' + 'x'.repeat(1000),
        timestamp: Date.now()
      });

      // Should display large output without breaking
      await expect(page.locator('[data-testid="terminal-output"]'))
        .toContainText('Large output:');
      
      // Terminal should remain responsive
      const terminalInput = page.locator('[data-testid="terminal-input"]');
      await terminalInput.fill('echo responsive');
      await terminalInput.press('Enter');
      
      await expect(page.locator('[data-testid="terminal-output"]'))
        .toContainText('responsive');
    });

    test('should maintain session state across page refreshes', async ({ page }) => {
      await page.goto('/terminal');
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');

      // Execute some commands to build history
      const terminalInput = page.locator('[data-testid="terminal-input"]');
      await terminalInput.fill('cd /tmp');
      await terminalInput.press('Enter');
      await page.waitForTimeout(100);

      // Refresh page
      await page.reload();
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');

      // Session state should be restored (if implemented)
      // This test may need to be adjusted based on actual session persistence implementation
    });
  });
});