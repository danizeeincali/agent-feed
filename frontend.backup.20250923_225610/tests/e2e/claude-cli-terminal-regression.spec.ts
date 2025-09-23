// Playwright E2E Tests for Claude CLI Terminal Regression Prevention
// Validates carriage return handling and cascade prevention in browser

import { test, expect } from '@playwright/test';
import { getPortConfig } from '../config/ports.config';

const ports = getPortConfig('test');

test.describe('Claude CLI Terminal Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`http://localhost:${ports.frontend}`);
    await page.waitForLoadState('networkidle');
  });

  test('should launch terminal without carriage return issues', async ({ page }) => {
    // Click a terminal launch button
    await page.click('button:has-text("Launch Claude CLI")');
    
    // Wait for terminal to appear
    await expect(page.locator('.terminal-container')).toBeVisible();
    
    // Check terminal shows proper connection without cascading
    const terminalText = await page.locator('.xterm-screen').textContent();
    expect(terminalText).toMatch(/Terminal Size: 120x\d+/);
    expect(terminalText).not.toMatch(/Terminal.*Terminal.*Terminal/); // No cascading
  });

  test('should handle Claude CLI spinner animations correctly', async ({ page }) => {
    // Launch terminal
    await page.click('button:has-text("Launch Claude CLI")');
    await expect(page.locator('.terminal-container')).toBeVisible();
    
    // Simulate Claude CLI command that shows spinner
    await page.keyboard.type('claude --help');
    await page.keyboard.press('Enter');
    
    // Wait for command to process
    await page.waitForTimeout(2000);
    
    // Check that spinner doesn't cascade
    const terminalContent = await page.locator('.xterm-screen').textContent();
    expect(terminalContent).not.toMatch(/\|\|\||\/\/\/|---|\\\\\\/); // No cascaded spinner frames
  });

  test('should display terminal width expansion message', async ({ page }) => {
    await page.click('button:has-text("Launch Claude CLI")');
    
    // Wait for and verify width expansion message
    await expect(page.locator('.xterm-screen')).toContainText('Width Expansion: ACTIVE');
    await expect(page.locator('.xterm-screen')).toContainText('No More Cascading!');
  });

  test('should maintain connection to WebSocket terminal server', async ({ page }) => {
    // Monitor console for connection errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.click('button:has-text("Launch Claude CLI")');
    await page.waitForTimeout(3000);
    
    // Should not have WebSocket connection errors
    const wsErrors = consoleErrors.filter(err => 
      err.includes('Connection lost') || 
      err.includes('WebSocket') ||
      err.includes('ECONNREFUSED')
    );
    expect(wsErrors).toHaveLength(0);
  });

  test('should handle multiple terminal instances without port conflicts', async ({ page }) => {
    // Launch multiple terminals
    const buttons = await page.locator('button:has-text("Launch")').all();
    
    for (let i = 0; i < Math.min(2, buttons.length); i++) {
      await buttons[i].click();
      await page.waitForTimeout(1000);
    }
    
    // Check all terminals are working
    const terminals = await page.locator('.terminal-container').all();
    expect(terminals.length).toBeGreaterThan(0);
    
    // Each should show proper initialization
    for (const terminal of terminals) {
      await expect(terminal).toContainText('Claude Code Terminal');
    }
  });

  test('should preserve carriage return functionality in terminal input', async ({ page }) => {
    await page.click('button:has-text("Launch Claude CLI")');
    await expect(page.locator('.terminal-container')).toBeVisible();
    
    // Type command with carriage return behavior
    await page.keyboard.type('echo -e "Line 1\\rOverwritten"');
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(1500);
    
    // Should show overwritten text, not both lines
    const terminalContent = await page.locator('.xterm-screen').textContent();
    expect(terminalContent).toContain('Overwritten');
    expect(terminalContent).not.toContain('Line 1Overwritten'); // No concatenation
  });

  test('should handle ANSI escape sequences without breaking layout', async ({ page }) => {
    await page.click('button:has-text("Launch Claude CLI")');
    await expect(page.locator('.terminal-container')).toBeVisible();
    
    // Type command that produces ANSI sequences
    await page.keyboard.type('ls --color=always');
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(2000);
    
    // Terminal should still be properly sized and functional
    const terminal = page.locator('.terminal-container');
    await expect(terminal).toBeVisible();
    
    // Should not have layout corruption from ANSI processing
    const terminalRect = await terminal.boundingBox();
    expect(terminalRect?.width).toBeGreaterThan(800); // Maintains expanded width
  });
});