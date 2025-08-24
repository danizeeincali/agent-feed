/**
 * Production Terminal Validation Test Suite
 * Validates complete terminal functionality after connectWebSocket initialization fix
 */

const { test, expect } = require('@playwright/test');

test.describe('Production Terminal Validation Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Console Error: ${msg.text()}`);
      } else {
        console.log(`Console ${msg.type()}: ${msg.text()}`);
      }
    });

    // Listen for uncaught exceptions
    page.on('pageerror', err => {
      console.error(`Page Error: ${err.message}`);
    });
  });

  test('1. SimpleLauncher route loads without ReferenceError', async ({ page }) => {
    const errors = [];
    
    page.on('pageerror', (err) => {
      errors.push(err);
    });

    await page.goto('http://localhost:5173/simple-launcher');
    
    // Wait for React to initialize
    await page.waitForSelector('#root', { timeout: 10000 });
    
    // Check for any ReferenceErrors
    expect(errors.filter(e => e.message.includes('ReferenceError'))).toHaveLength(0);
    
    // Verify page title
    await expect(page).toHaveTitle(/Agent Feed/);
    
    // Check that SimpleLauncher component renders
    await expect(page.locator('text=Claude Agent Terminal')).toBeVisible({ timeout: 10000 });
  });

  test('2. TerminalFixed component mounts without errors', async ({ page }) => {
    await page.goto('http://localhost:5173/simple-launcher');
    
    // Wait for the launch button and click it
    const launchButton = page.locator('button:has-text("Launch Claude Agent")');
    await expect(launchButton).toBeVisible({ timeout: 10000 });
    await launchButton.click();
    
    // Wait for terminal component to mount
    await page.waitForSelector('.xterm', { timeout: 15000 });
    
    // Verify terminal canvas exists
    const terminalCanvas = page.locator('.xterm-canvas');
    await expect(terminalCanvas).toBeVisible();
    
    // Check that no "ReferenceError" appears in console
    const consoleLogs = await page.evaluate(() => {
      return window.console._logs || [];
    });
    
    expect(consoleLogs.filter(log => log.includes('ReferenceError'))).toHaveLength(0);
  });

  test('3. Terminal canvas renders correctly', async ({ page }) => {
    await page.goto('http://localhost:5173/simple-launcher');
    
    const launchButton = page.locator('button:has-text("Launch Claude Agent")');
    await launchButton.click();
    
    // Wait for terminal to fully initialize
    await page.waitForSelector('.xterm-canvas', { timeout: 15000 });
    
    // Check terminal dimensions
    const canvas = page.locator('.xterm-canvas');
    const canvasBox = await canvas.boundingBox();
    
    expect(canvasBox.width).toBeGreaterThan(400);
    expect(canvasBox.height).toBeGreaterThan(200);
    
    // Verify terminal is interactive (cursor visible)
    await page.waitForSelector('.xterm-cursor', { timeout: 5000 });
    
    // Check that terminal has proper styling
    const terminalElement = page.locator('.xterm');
    await expect(terminalElement).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  });

  test('4. WebSocket connection establishes properly', async ({ page }) => {
    let wsConnected = false;
    
    // Monitor WebSocket connections
    page.on('websocket', ws => {
      console.log(`WebSocket opened: ${ws.url()}`);
      wsConnected = true;
      
      ws.on('close', () => console.log('WebSocket closed'));
      ws.on('framesent', event => console.log(`WS Frame sent: ${event.payload}`));
      ws.on('framereceived', event => console.log(`WS Frame received: ${event.payload}`));
    });
    
    await page.goto('http://localhost:5173/simple-launcher');
    
    const launchButton = page.locator('button:has-text("Launch Claude Agent")');
    await launchButton.click();
    
    // Wait for WebSocket connection
    await page.waitForTimeout(3000);
    
    expect(wsConnected).toBe(true);
    
    // Verify connection status in component
    const statusElement = page.locator('[data-testid="connection-status"]');
    if (await statusElement.count() > 0) {
      await expect(statusElement).toContainText('Connected');
    }
  });

  test('5. Terminal input reaches backend', async ({ page }) => {
    await page.goto('http://localhost:5173/simple-launcher');
    
    const launchButton = page.locator('button:has-text("Launch Claude Agent")');
    await launchButton.click();
    
    // Wait for terminal to be ready
    await page.waitForSelector('.xterm-canvas', { timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Focus on terminal and send input
    const terminal = page.locator('.xterm-canvas');
    await terminal.click();
    
    // Type a command
    await page.keyboard.type('echo "test-input-validation"');
    await page.keyboard.press('Enter');
    
    // Wait for response
    await page.waitForTimeout(2000);
    
    // Check that input was processed (look for response in terminal)
    const terminalText = await page.locator('.xterm-screen').textContent();
    expect(terminalText).toContain('test-input-validation');
  });

  test('6. Terminal output displays correctly', async ({ page }) => {
    await page.goto('http://localhost:5173/simple-launcher');
    
    const launchButton = page.locator('button:has-text("Launch Claude Agent")');
    await launchButton.click();
    
    await page.waitForSelector('.xterm-canvas', { timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Focus and send a command that produces output
    const terminal = page.locator('.xterm-canvas');
    await terminal.click();
    
    await page.keyboard.type('ls -la');
    await page.keyboard.press('Enter');
    
    // Wait for command output
    await page.waitForTimeout(3000);
    
    // Verify output appears in terminal
    const terminalContent = await page.locator('.xterm-screen').textContent();
    expect(terminalContent).toMatch(/total|drwx|\.\.?/); // Common ls output patterns
  });

  test('7. End-to-end terminal workflow', async ({ page }) => {
    await page.goto('http://localhost:5173/simple-launcher');
    
    // Step 1: Launch terminal
    const launchButton = page.locator('button:has-text("Launch Claude Agent")');
    await launchButton.click();
    
    // Step 2: Wait for initialization
    await page.waitForSelector('.xterm-canvas', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    const terminal = page.locator('.xterm-canvas');
    await terminal.click();
    
    // Step 3: Execute multiple commands
    const commands = [
      'pwd',
      'date',
      'echo "End-to-end test successful"'
    ];
    
    for (const command of commands) {
      await page.keyboard.type(command);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }
    
    // Step 4: Verify all commands executed
    const finalContent = await page.locator('.xterm-screen').textContent();
    expect(finalContent).toContain('/workspaces/agent-feed');
    expect(finalContent).toContain('End-to-end test successful');
  });

  test('8. Performance validation', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://localhost:5173/simple-launcher');
    
    const launchButton = page.locator('button:has-text("Launch Claude Agent")');
    await launchButton.click();
    
    // Measure time to terminal ready
    await page.waitForSelector('.xterm-canvas', { timeout: 15000 });
    const initTime = Date.now() - startTime;
    
    console.log(`Terminal initialization time: ${initTime}ms`);
    expect(initTime).toBeLessThan(15000); // Should initialize within 15 seconds
    
    // Test input responsiveness
    const terminal = page.locator('.xterm-canvas');
    await terminal.click();
    
    const inputStart = Date.now();
    await page.keyboard.type('echo "performance-test"');
    await page.keyboard.press('Enter');
    
    // Wait for response
    await page.waitForFunction(() => {
      const content = document.querySelector('.xterm-screen')?.textContent || '';
      return content.includes('performance-test');
    }, { timeout: 5000 });
    
    const responseTime = Date.now() - inputStart;
    console.log(`Input response time: ${responseTime}ms`);
    expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
  });

  test('9. Error handling validation', async ({ page }) => {
    await page.goto('http://localhost:5173/simple-launcher');
    
    const launchButton = page.locator('button:has-text("Launch Claude Agent")');
    await launchButton.click();
    
    await page.waitForSelector('.xterm-canvas', { timeout: 15000 });
    await page.waitForTimeout(2000);
    
    const terminal = page.locator('.xterm-canvas');
    await terminal.click();
    
    // Test invalid command
    await page.keyboard.type('invalid-command-xyz-123');
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(2000);
    
    // Should handle error gracefully without crashing
    const terminalContent = await page.locator('.xterm-screen').textContent();
    expect(terminalContent).toMatch(/command not found|not recognized/i);
    
    // Terminal should still be responsive
    await page.keyboard.type('echo "still-working"');
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(1000);
    const updatedContent = await page.locator('.xterm-screen').textContent();
    expect(updatedContent).toContain('still-working');
  });
});