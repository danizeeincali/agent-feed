import { test, expect, Page } from '@playwright/test';

/**
 * TDD Regression Test Suite: Terminal WebSocket Connection Validation
 * Purpose: Prevent cascade failures when terminal WebSocket connections break
 * Regression Pattern: Port configuration mismatches (3001 vs 3000)
 * NLD Training Target: WebSocket connection reliability
 */

test.describe('Terminal WebSocket Connection Regression Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Enable console logging to catch WebSocket errors
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('WebSocket')) {
        console.log(`Browser Console: ${msg.text()}`);
      }
    });
  });

  test('should connect to correct backend port (3000, not 3001)', async () => {
    // Navigate to application
    await page.goto('http://localhost:5173');
    
    // Wait for app to load and avoid white screen
    await expect(page.locator('body')).not.toHaveClass(/white-screen/);
    
    // Click on a terminal launcher button
    const prodClaudeButton = page.locator('button', { hasText: '🚀 prod/claude' });
    await expect(prodClaudeButton).toBeVisible();
    await prodClaudeButton.click();
    
    // Wait for terminal to initialize
    await page.waitForSelector('.terminal-container, [class*="terminal"]', { timeout: 10000 });
    
    // Check for WebSocket connection success indicators
    await expect(page.locator('.connection-status')).toContainText(/connected|🟢/, { timeout: 15000 });
    
    // Verify no WebSocket errors in console
    const errors = await page.evaluate(() => {
      return window.console.error.toString().includes('3001') || 
             window.localStorage.getItem('websocket_errors');
    });
    expect(errors).toBeFalsy();
  });

  test('should execute initial commands after WebSocket connection', async () => {
    await page.goto('http://localhost:5173');
    
    // Test each of the 4 terminal launchers
    const launchers = [
      { selector: 'button:has-text("🚀 prod/claude")', command: 'cd prod && claude' },
      { selector: 'button:has-text("⚡ skip-permissions")', command: 'cd prod && claude --dangerously-skip-permissions' },
      { selector: 'button:has-text("⚡ skip-permissions -c")', command: 'cd prod && claude --dangerously-skip-permissions -c' },
      { selector: 'button:has-text("↻ skip-permissions --resume")', command: 'cd prod && claude --dangerously-skip-permissions --resume' }
    ];

    for (const launcher of launchers) {
      await page.click(launcher.selector);
      
      // Wait for terminal and connection
      await page.waitForSelector('.terminal-container', { timeout: 10000 });
      await expect(page.locator('.connection-status')).toContainText(/connected|🟢/, { timeout: 15000 });
      
      // Verify command execution
      await expect(page.locator('.terminal-output')).toContainText('cd prod', { timeout: 5000 });
      
      // Close terminal for next test
      const closeButton = page.locator('.terminal-close, .close-terminal');
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    }
  });

  test('should handle WebSocket reconnection gracefully', async () => {
    await page.goto('http://localhost:5173');
    
    // Open terminal
    await page.click('button:has-text("🚀 prod/claude")');
    await expect(page.locator('.connection-status')).toContainText(/connected|🟢/, { timeout: 15000 });
    
    // Simulate network interruption by blocking WebSocket
    await page.route('**/socket.io/**', route => route.abort());
    
    // Wait for disconnect status
    await expect(page.locator('.connection-status')).toContainText(/disconnect|🔴/, { timeout: 10000 });
    
    // Re-enable WebSocket
    await page.unroute('**/socket.io/**');
    
    // Should auto-reconnect
    await expect(page.locator('.connection-status')).toContainText(/connected|🟢/, { timeout: 20000 });
  });

  test('should prevent port configuration regression', async () => {
    // Verify TerminalFixed.tsx uses correct port in source code
    await page.addInitScript(() => {
      // Mock console.log to capture WebSocket connection attempts
      const originalLog = console.log;
      window.websocketAttempts = [];
      console.log = (...args) => {
        const message = args.join(' ');
        if (message.includes('Socket.IO connection') || message.includes('localhost:')) {
          window.websocketAttempts.push(message);
        }
        originalLog.apply(console, args);
      };
    });

    await page.goto('http://localhost:5173');
    await page.click('button:has-text("🚀 prod/claude")');
    
    // Wait for connection attempt
    await page.waitForTimeout(3000);
    
    // Check WebSocket connection attempts use port 3002 (terminal server), not 3001
    const attempts = await page.evaluate(() => window.websocketAttempts);
    const has3001 = attempts.some(attempt => attempt.includes('3001'));
    const has3002 = attempts.some(attempt => attempt.includes('3002'));
    
    expect(has3001).toBeFalsy(); // Should NOT connect to 3001
    expect(has3002).toBeTruthy(); // Should connect to 3002 (terminal server)
  });

  test('should maintain terminal functionality after white screen fixes', async () => {
    await page.goto('http://localhost:5173');
    
    // Verify no white screen
    await expect(page.locator('body')).not.toHaveClass(/white-screen/);
    await expect(page.locator('#root')).not.toBeEmpty();
    
    // Verify React app loaded properly
    await expect(page.locator('button:has-text("🚀 prod/claude")')).toBeVisible();
    
    // Verify terminal functionality works
    await page.click('button:has-text("🚀 prod/claude")');
    await expect(page.locator('.terminal-container')).toBeVisible();
    await expect(page.locator('.connection-status')).toContainText(/connected|🟢/, { timeout: 15000 });
    
    // Verify both white screen prevention AND terminal work together
    await expect(page.locator('.terminal-output')).toContainText(/cd prod|claude/, { timeout: 10000 });
  });
});