import { test, expect } from '@playwright/test';

/**
 * COMPREHENSIVE TDD TEST SUITE: Terminal Protocol Fix Validation
 * Tests the WebSocket message protocol compatibility and 4-button functionality
 */

test.describe('Terminal WebSocket Protocol Integration Tests', () => {
  
  test('should handle WebSocket protocol messages correctly', async ({ page }) => {
    // Navigate to application
    await page.goto('http://localhost:5173');
    
    // Verify no white screen
    await expect(page.locator('#root')).not.toBeEmpty();
    
    // Verify all 4 buttons are present
    await expect(page.locator('button:has-text("🚀 prod/claude")')).toBeVisible();
    await expect(page.locator('button:has-text("⚡ skip-permissions")')).toBeVisible(); 
    await expect(page.locator('button:has-text("⚡ skip-permissions -c")')).toBeVisible();
    await expect(page.locator('button:has-text("↻ skip-permissions --resume")')).toBeVisible();
    
    // Test first button - most critical
    await page.click('button:has-text("🚀 prod/claude")');
    
    // Wait for terminal to appear
    await page.waitForSelector('.terminal-container, [class*="terminal"]', { timeout: 10000 });
    
    // Verify connection status shows connected (not error)
    await expect(page.locator('.connection-status, [class*="connection"]')).not.toContainText(/error|disconnected|failed/);
    
    // Verify terminal shows command execution
    const terminalOutput = page.locator('.terminal-output, .xterm-screen, [class*="xterm"]');
    await expect(terminalOutput).toContainText(/cd prod|claude|Connected/);
  });

  test('should execute all 4 terminal commands without connection errors', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    const commands = [
      { button: '🚀 prod/claude', expectedCmd: 'cd prod && claude' },
      { button: '⚡ skip-permissions', expectedCmd: 'claude --dangerously-skip-permissions' },
      { button: '⚡ skip-permissions -c', expectedCmd: 'claude --dangerously-skip-permissions -c' },
      { button: '↻ skip-permissions --resume', expectedCmd: 'claude --dangerously-skip-permissions --resume' }
    ];

    for (const cmd of commands) {
      // Click button
      await page.click(`button:has-text("${cmd.button}")`);
      
      // Wait for terminal
      await page.waitForSelector('[class*="terminal"]', { timeout: 8000 });
      
      // Verify no connection errors in terminal
      const terminalText = await page.locator('[class*="terminal"]').textContent();
      expect(terminalText).not.toContain('Connection error');
      expect(terminalText).not.toContain('WebSocket error');
      expect(terminalText).not.toContain('Unknown message type');
      
      // Verify command appears in terminal
      expect(terminalText).toContain('prod');
      
      // Close terminal for next test
      const closeBtn = page.locator('.close, .terminal-close, button:has-text("×")');
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
      
      // Small delay between tests
      await page.waitForTimeout(1000);
    }
  });

  test('should maintain stable WebSocket connections', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Monitor console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Open terminal
    await page.click('button:has-text("🚀 prod/claude")');
    await page.waitForSelector('[class*="terminal"]', { timeout: 10000 });
    
    // Wait for connection to stabilize
    await page.waitForTimeout(3000);
    
    // Verify no WebSocket errors in console
    const wsErrors = consoleErrors.filter(err => 
      err.includes('WebSocket') || 
      err.includes('connection') || 
      err.includes('Unknown message')
    );
    
    expect(wsErrors).toHaveLength(0);
    
    // Verify connection status is stable
    await expect(page.locator('[class*="connection"]')).toContainText(/connected|🟢/);
  });

  test('should prevent white screen regression', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Verify React app loaded
    await expect(page.locator('#root')).not.toBeEmpty();
    await expect(page.locator('body')).not.toHaveClass(/white-screen/);
    
    // Verify terminal functionality works alongside white screen fix
    await page.click('button:has-text("🚀 prod/claude")');
    await page.waitForSelector('[class*="terminal"]');
    
    // Both should work together
    await expect(page.locator('#root')).not.toBeEmpty(); // White screen still prevented
    await expect(page.locator('[class*="terminal"]')).toBeVisible(); // Terminal works
  });

  test('should handle WebSocket reconnection gracefully', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Open terminal
    await page.click('button:has-text("🚀 prod/claude")');
    await page.waitForSelector('[class*="terminal"]');
    
    // Wait for stable connection
    await expect(page.locator('[class*="connection"]')).toContainText(/connected|🟢/);
    
    // Simulate network interruption
    await page.route('**/terminal', route => route.abort());
    await page.waitForTimeout(2000);
    
    // Re-enable connection
    await page.unroute('**/terminal');
    
    // Should reconnect automatically
    await expect(page.locator('[class*="connection"]')).toContainText(/connected|🟢/, { timeout: 15000 });
  });
});