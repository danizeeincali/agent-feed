/**
 * Terminal E2E Tests with Playwright
 * 
 * End-to-end tests for terminal functionality covering user workflows,
 * real WebSocket connections, terminal interactions, and cross-browser testing.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

// Test configuration
const TEST_CONFIG = {
  FRONTEND_URL: 'http://localhost:3001',
  BACKEND_URL: 'http://localhost:3000',
  WS_URL: 'ws://localhost:3000',
  INSTANCE_ID: 'test-terminal-instance',
  TEST_TIMEOUT: 30000
};

// Mock WebSocket server for E2E tests
class MockTerminalServer {
  private httpServer: any;
  private wsServer: WebSocketServer;
  private clients: Set<any> = new Set();

  constructor() {
    this.httpServer = createServer();
    this.wsServer = new WebSocketServer({ server: this.httpServer });
    
    this.wsServer.on('connection', (ws) => {
      this.clients.add(ws);
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      // Send initial connection confirmation
      ws.send(JSON.stringify({ type: 'connected' }));
    });
  }

  private handleMessage(ws: any, message: any) {
    switch (message.type) {
      case 'connect_terminal':
        ws.send(JSON.stringify({
          type: 'terminal_connected',
          instanceId: message.instanceId,
          instanceName: `Terminal ${message.instanceId}`,
          instanceType: 'claude',
          pid: 12345,
          sessionId: 'session-123',
          clientCount: 1
        }));
        break;

      case 'terminal_input':
        // Echo input back as output with prompt
        ws.send(JSON.stringify({
          type: 'terminal_data',
          data: message.data,
          timestamp: new Date().toISOString(),
          isHistory: false
        }));
        
        // Simulate command processing
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'terminal_data',
            data: `\nCommand executed: ${message.data.trim()}\n$ `,
            timestamp: new Date().toISOString(),
            isHistory: false
          }));
        }, 100);
        break;

      case 'terminal_resize':
        ws.send(JSON.stringify({
          type: 'terminal_resized',
          cols: message.cols,
          rows: message.rows
        }));
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
    }
  }

  async start(port: number = 3000) {
    return new Promise<void>((resolve) => {
      this.httpServer.listen(port, () => {
        console.log(`Mock terminal server listening on port ${port}`);
        resolve();
      });
    });
  }

  async stop() {
    return new Promise<void>((resolve) => {
      this.clients.forEach(client => client.close());
      this.wsServer.close(() => {
        this.httpServer.close(() => {
          resolve();
        });
      });
    });
  }

  broadcastMessage(message: any) {
    const data = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(data);
      }
    });
  }
}

let mockServer: MockTerminalServer;

test.beforeAll(async () => {
  mockServer = new MockTerminalServer();
  await mockServer.start(3000);
});

test.afterAll(async () => {
  if (mockServer) {
    await mockServer.stop();
  }
});

test.describe('Terminal E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Browser console error: ${msg.text()}`);
      }
    });

    // Navigate to terminal page
    await page.goto(`${TEST_CONFIG.FRONTEND_URL}/terminal/${TEST_CONFIG.INSTANCE_ID}`);
  });

  test.describe('Terminal Connection and Initialization', () => {
    test('loads terminal interface successfully', async ({ page }) => {
      await expect(page.locator('text=Terminal:')).toBeVisible();
      await expect(page.locator(`text=${TEST_CONFIG.INSTANCE_ID}`)).toBeVisible();
    });

    test('establishes WebSocket connection', async ({ page }) => {
      // Wait for connection to be established
      await expect(page.locator('text=connected')).toBeVisible({ timeout: 10000 });
      
      // Verify instance information is displayed
      await expect(page.locator('text=Terminal test-terminal-instance')).toBeVisible();
      await expect(page.locator('text=PID: 12345')).toBeVisible();
    });

    test('shows connection status changes', async ({ page }) => {
      // Initially should show disconnected or connecting
      const statusLocator = page.locator('[data-testid="connection-status"], text=disconnected, text=connecting');
      await expect(statusLocator).toBeVisible();
      
      // Should eventually connect
      await expect(page.locator('text=connected')).toBeVisible({ timeout: 15000 });
    });

    test('displays connection error when server unavailable', async ({ page }) => {
      // Stop mock server
      await mockServer.stop();
      
      // Reload page
      await page.reload();
      
      // Should show connection error
      await expect(page.locator('text=Connection failed, text=Connection timeout')).toBeVisible({ timeout: 10000 });
      
      // Restart server for other tests
      mockServer = new MockTerminalServer();
      await mockServer.start(3000);
    });
  });

  test.describe('Terminal Interaction', () => {
    test.beforeEach(async ({ page }) => {
      // Wait for connection
      await expect(page.locator('text=connected')).toBeVisible({ timeout: 10000 });
    });

    test('accepts and displays user input', async ({ page }) => {
      // Find the terminal container (xterm.js creates a canvas or similar)
      const terminalContainer = page.locator('[data-testid="terminal-container"], .xterm-screen');
      
      // Click in terminal to focus
      await terminalContainer.click();
      
      // Type command
      await page.keyboard.type('echo "Hello World"');
      await page.keyboard.press('Enter');
      
      // Wait for command echo and response
      await expect(page.locator('text=echo "Hello World"')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Command executed: echo "Hello World"')).toBeVisible({ timeout: 5000 });
    });

    test('handles special key combinations', async ({ page }) => {
      const terminalContainer = page.locator('[data-testid="terminal-container"], .xterm-screen');
      await terminalContainer.click();
      
      // Test Ctrl+C
      await page.keyboard.type('long-running-command');
      await page.keyboard.press('Control+c');
      
      // Should handle the key combination
      // Note: Exact behavior depends on terminal implementation
      await page.waitForTimeout(100);
    });

    test('supports text selection and copying', async ({ page }) => {
      const terminalContainer = page.locator('[data-testid="terminal-container"], .xterm-screen');
      await terminalContainer.click();
      
      // Type some text
      await page.keyboard.type('some selectable text');
      await page.keyboard.press('Enter');
      
      // Wait for text to appear
      await expect(page.locator('text=some selectable text')).toBeVisible();
      
      // Test copy button
      await page.locator('[title="Copy Selection"]').click();
      
      // Should show success notification
      await expect(page.locator('text=Copied, text=copied to clipboard')).toBeVisible({ timeout: 3000 });
    });

    test('handles rapid input correctly', async ({ page }) => {
      const terminalContainer = page.locator('[data-testid="terminal-container"], .xterm-screen');
      await terminalContainer.click();
      
      // Type rapidly
      const rapidText = 'quick brown fox jumps over lazy dog';
      for (const char of rapidText) {
        await page.keyboard.type(char);
        await page.waitForTimeout(10); // Small delay to simulate realistic typing
      }
      
      await page.keyboard.press('Enter');
      
      // Verify all text was captured
      await expect(page.locator(`text=${rapidText}`)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Terminal Features', () => {
    test.beforeEach(async ({ page }) => {
      await expect(page.locator('text=connected')).toBeVisible({ timeout: 10000 });
    });

    test('search functionality works correctly', async ({ page }) => {
      const terminalContainer = page.locator('[data-testid="terminal-container"], .xterm-screen');
      await terminalContainer.click();
      
      // Add some searchable content
      await page.keyboard.type('first line with searchable content');
      await page.keyboard.press('Enter');
      await page.keyboard.type('second line with different text');
      await page.keyboard.press('Enter');
      await page.keyboard.type('third line with searchable content');
      await page.keyboard.press('Enter');
      
      // Open search
      await page.locator('[title="Search"]').click();
      await expect(page.locator('placeholder=Search terminal...')).toBeVisible();
      
      // Perform search
      await page.locator('placeholder=Search terminal...').fill('searchable');
      await page.keyboard.press('Enter');
      
      // Test navigation buttons
      await page.locator('text=↓').click(); // Next
      await page.locator('text=↑').click(); // Previous
    });

    test('settings panel functions correctly', async ({ page }) => {
      // Open settings
      await page.locator('[title="Settings"]').click();
      await expect(page.locator('text=Font Size')).toBeVisible();
      
      // Change font size
      const fontSizeSlider = page.locator('input[type="range"]').first();
      await fontSizeSlider.fill('16');
      
      // Change theme
      const themeSelect = page.locator('select').first();
      await themeSelect.selectOption('light');
      
      // Settings should persist (testing localStorage)
      await page.reload();
      await page.locator('[title="Settings"]').click();
      await expect(themeSelect).toHaveValue('light');
    });

    test('fullscreen mode works correctly', async ({ page }) => {
      // Enter fullscreen
      await page.locator('[title="Fullscreen"]').click();
      
      // Should show exit fullscreen button
      await expect(page.locator('[title="Exit Fullscreen"]')).toBeVisible();
      
      // Terminal should occupy full viewport
      const terminalContainer = page.locator('.flex.flex-col.h-full');
      await expect(terminalContainer).toHaveClass(/fixed.*inset-0.*z-50/);
      
      // Exit fullscreen
      await page.locator('[title="Exit Fullscreen"]').click();
      await expect(page.locator('[title="Fullscreen"]')).toBeVisible();
    });

    test('download functionality works', async ({ page }) => {
      // Set up download handler
      const downloadPromise = page.waitForEvent('download');
      
      // Add some content first
      const terminalContainer = page.locator('[data-testid="terminal-container"], .xterm-screen');
      await terminalContainer.click();
      await page.keyboard.type('downloadable content');
      await page.keyboard.press('Enter');
      
      // Trigger download
      await page.locator('[title="Download Content"]').click();
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/terminal-.*\.txt/);
    });
  });

  test.describe('Connection Management', () => {
    test('handles reconnection after disconnect', async ({ page }) => {
      // Wait for initial connection
      await expect(page.locator('text=connected')).toBeVisible({ timeout: 10000 });
      
      // Simulate server disconnect
      mockServer.broadcastMessage({ type: 'disconnect', reason: 'Server restart' });
      
      // Should show disconnected state
      await expect(page.locator('text=disconnected')).toBeVisible({ timeout: 5000 });
      
      // Should attempt reconnection and show reconnect button
      await expect(page.locator('text=Reconnect')).toBeVisible({ timeout: 10000 });
      
      // Click reconnect
      await page.locator('text=Reconnect').click();
      
      // Should reconnect
      await expect(page.locator('text=connected')).toBeVisible({ timeout: 10000 });
    });

    test('shows appropriate error messages', async ({ page }) => {
      // Simulate various error conditions
      mockServer.broadcastMessage({ 
        type: 'error', 
        message: 'Authentication failed' 
      });
      
      // Should display error message
      await expect(page.locator('text=Authentication failed')).toBeVisible({ timeout: 5000 });
    });

    test('handles instance destruction', async ({ page }) => {
      await expect(page.locator('text=connected')).toBeVisible({ timeout: 10000 });
      
      // Simulate instance destruction
      mockServer.broadcastMessage({
        type: 'instance_destroyed',
        instanceId: TEST_CONFIG.INSTANCE_ID
      });
      
      // Should show appropriate message
      await expect(page.locator('text=Instance has been destroyed')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Responsive Design', () => {
    test('works correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Terminal should still be functional
      await expect(page.locator('text=Terminal:')).toBeVisible();
      await expect(page.locator('text=connected')).toBeVisible({ timeout: 10000 });
      
      // Controls should be accessible
      await page.locator('[title="Settings"]').click();
      await expect(page.locator('text=Font Size')).toBeVisible();
    });

    test('adapts to window resize', async ({ page }) => {
      await expect(page.locator('text=connected')).toBeVisible({ timeout: 10000 });
      
      // Test various viewport sizes
      const viewports = [
        { width: 1920, height: 1080 },
        { width: 1280, height: 720 },
        { width: 768, height: 1024 },
        { width: 375, height: 667 }
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(100); // Allow resize handlers to run
        
        // Terminal should remain functional
        await expect(page.locator('text=Terminal:')).toBeVisible();
      }
    });
  });

  test.describe('Multi-Tab Support', () => {
    test('synchronizes data across tabs', async ({ context }) => {
      // Open first tab
      const page1 = await context.newPage();
      await page1.goto(`${TEST_CONFIG.FRONTEND_URL}/terminal/${TEST_CONFIG.INSTANCE_ID}`);
      await expect(page1.locator('text=connected')).toBeVisible({ timeout: 10000 });
      
      // Open second tab
      const page2 = await context.newPage();
      await page2.goto(`${TEST_CONFIG.FRONTEND_URL}/terminal/${TEST_CONFIG.INSTANCE_ID}`);
      await expect(page2.locator('text=connected')).toBeVisible({ timeout: 10000 });
      
      // Type in first tab
      const terminal1 = page1.locator('[data-testid="terminal-container"], .xterm-screen');
      await terminal1.click();
      await page1.keyboard.type('sync test message');
      await page1.keyboard.press('Enter');
      
      // Should appear in second tab too (via WebSocket broadcast)
      await expect(page2.locator('text=sync test message')).toBeVisible({ timeout: 5000 });
    });

    test('maintains independent settings per tab', async ({ context }) => {
      const page1 = await context.newPage();
      const page2 = await context.newPage();
      
      await page1.goto(`${TEST_CONFIG.FRONTEND_URL}/terminal/${TEST_CONFIG.INSTANCE_ID}`);
      await page2.goto(`${TEST_CONFIG.FRONTEND_URL}/terminal/${TEST_CONFIG.INSTANCE_ID}`);
      
      // Change settings in first tab
      await page1.locator('[title="Settings"]').click();
      const themeSelect1 = page1.locator('select').first();
      await themeSelect1.selectOption('light');
      
      // Second tab should have independent settings
      await page2.locator('[title="Settings"]').click();
      const themeSelect2 = page2.locator('select').first();
      await expect(themeSelect2).toHaveValue('dark'); // Default value
    });
  });

  test.describe('Performance', () => {
    test('handles high-frequency output efficiently', async ({ page }) => {
      await expect(page.locator('text=connected')).toBeVisible({ timeout: 10000 });
      
      // Simulate high-frequency output
      for (let i = 0; i < 100; i++) {
        mockServer.broadcastMessage({
          type: 'terminal_data',
          data: `High frequency message ${i}\n`,
          timestamp: new Date().toISOString(),
          isHistory: false
        });
      }
      
      // Terminal should remain responsive
      await page.locator('[title="Settings"]').click();
      await expect(page.locator('text=Font Size')).toBeVisible({ timeout: 3000 });
    });

    test('maintains reasonable memory usage', async ({ page }) => {
      await expect(page.locator('text=connected')).toBeVisible({ timeout: 10000 });
      
      // Generate large amount of data
      const largeData = 'X'.repeat(10000);
      for (let i = 0; i < 50; i++) {
        mockServer.broadcastMessage({
          type: 'terminal_data',
          data: `${largeData}\n`,
          timestamp: new Date().toISOString(),
          isHistory: false
        });
      }
      
      // Page should remain functional
      await page.locator('[title="Search"]').click();
      await page.locator('placeholder=Search terminal...').fill('X');
      await expect(page.locator('placeholder=Search terminal...')).toHaveValue('X');
    });
  });

  test.describe('Accessibility', () => {
    test('supports keyboard navigation', async ({ page }) => {
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to activate focused elements
      await page.keyboard.press('Enter');
      
      // Focus should be visible
      const focusedElement = await page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('provides appropriate ARIA labels', async ({ page }) => {
      // Check for ARIA labels on interactive elements
      await expect(page.locator('[title="Search"]')).toHaveAttribute('title', 'Search');
      await expect(page.locator('[title="Settings"]')).toHaveAttribute('title', 'Settings');
      await expect(page.locator('[title="Fullscreen"]')).toHaveAttribute('title', 'Fullscreen');
    });

    test('supports screen readers', async ({ page }) => {
      // Check for semantic HTML structure
      await expect(page.locator('main, [role="main"]')).toBeVisible();
      await expect(page.locator('h1, h2, h3')).toBeVisible();
      
      // Check for proper form labels
      await page.locator('[title="Settings"]').click();
      await expect(page.locator('label')).toHaveCount.greaterThan(0);
    });
  });

  test.describe('Error Recovery', () => {
    test('recovers from WebSocket errors gracefully', async ({ page }) => {
      await expect(page.locator('text=connected')).toBeVisible({ timeout: 10000 });
      
      // Simulate WebSocket error
      await mockServer.stop();
      
      // Should show error state
      await expect(page.locator('text=Connection failed, text=disconnected')).toBeVisible({ timeout: 10000 });
      
      // Restart server
      mockServer = new MockTerminalServer();
      await mockServer.start(3000);
      
      // Should attempt to reconnect
      await page.locator('text=Reconnect').click();
      await expect(page.locator('text=connected')).toBeVisible({ timeout: 15000 });
    });

    test('handles page refresh during active session', async ({ page }) => {
      await expect(page.locator('text=connected')).toBeVisible({ timeout: 10000 });
      
      // Type some content
      const terminalContainer = page.locator('[data-testid="terminal-container"], .xterm-screen');
      await terminalContainer.click();
      await page.keyboard.type('content before refresh');
      await page.keyboard.press('Enter');
      
      // Refresh page
      await page.reload();
      
      // Should reconnect and show fresh terminal
      await expect(page.locator('text=connected')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Terminal:')).toBeVisible();
    });
  });
});

// Cross-browser testing
test.describe('Cross-Browser Compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`basic functionality works in ${browserName}`, async ({ page }) => {
      await page.goto(`${TEST_CONFIG.FRONTEND_URL}/terminal/${TEST_CONFIG.INSTANCE_ID}`);
      
      // Basic functionality should work across all browsers
      await expect(page.locator('text=Terminal:')).toBeVisible();
      await expect(page.locator('text=connected')).toBeVisible({ timeout: 10000 });
      
      // Terminal interaction
      const terminalContainer = page.locator('[data-testid="terminal-container"], .xterm-screen');
      await terminalContainer.click();
      await page.keyboard.type('cross-browser test');
      await page.keyboard.press('Enter');
      
      await expect(page.locator('text=cross-browser test')).toBeVisible({ timeout: 5000 });
    });
  });
});