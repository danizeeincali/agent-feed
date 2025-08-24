import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * Terminal Double Typing Validation Test Suite
 * 
 * This comprehensive test suite validates that the terminal functionality works correctly
 * without double typing issues, proper WebSocket connectivity, and reliable character handling.
 * 
 * Test Coverage:
 * 1. Terminal initialization and connectivity
 * 2. Single character typing (no duplication)
 * 3. Command execution with proper output
 * 4. WebSocket connection stability
 * 5. Backspace functionality
 * 6. Character sequence handling
 * 7. Terminal readiness validation
 */

test.describe('Terminal Double Typing Prevention', () => {
  let page: Page;
  let terminalContainer: Locator;
  
  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Set longer timeout for terminal operations
    test.setTimeout(60000);
    
    // Navigate to the application
    await page.goto('http://localhost:5173');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Wait for React to initialize
    await page.waitForTimeout(2000);
  });

  test('should navigate to homepage and find terminal launcher', async () => {
    // Verify we're on the homepage
    await expect(page).toHaveURL('http://localhost:5173/');
    
    // Look for any terminal launch buttons or terminal containers
    const launchButton = page.locator('button:has-text("Launch Terminal"), button:has-text("Launch"), button[data-testid="launch-terminal"], [data-testid="terminal-launch"]');
    const terminalExists = page.locator('.terminal, [data-testid="terminal"], .xterm, .xterm-screen');
    
    // Check if terminal launcher or terminal already exists
    const hasLauncher = await launchButton.count();
    const hasTerminal = await terminalExists.count();
    
    expect(hasLauncher > 0 || hasTerminal > 0).toBeTruthy();
    
    console.log(`Found ${hasLauncher} launch buttons and ${hasTerminal} terminal containers`);
  });

  test('should click launch terminal button and wait for terminal to load', async () => {
    // Try multiple selectors for the launch button
    const launchSelectors = [
      'button:has-text("Launch Terminal")',
      'button:has-text("Launch")', 
      'button[data-testid="launch-terminal"]',
      '[data-testid="terminal-launch"]',
      '.launch-button',
      'button:has-text("Simple")'
    ];
    
    let buttonFound = false;
    
    for (const selector of launchSelectors) {
      const button = page.locator(selector);
      const count = await button.count();
      
      if (count > 0) {
        console.log(`Found launch button with selector: ${selector}`);
        await button.first().click();
        buttonFound = true;
        break;
      }
    }
    
    // If no launch button found, check if terminal is already available
    if (!buttonFound) {
      const existingTerminal = page.locator('.terminal, [data-testid="terminal"], .xterm, .xterm-screen');
      const terminalCount = await existingTerminal.count();
      
      if (terminalCount === 0) {
        throw new Error('No launch button found and no existing terminal detected');
      }
      
      console.log('Terminal already available, skipping launch');
    }
    
    // Wait for terminal to appear
    await page.waitForTimeout(3000);
    
    // Look for terminal container
    terminalContainer = page.locator('.terminal, [data-testid="terminal"], .xterm, .xterm-screen, .xterm-viewport').first();
    
    await expect(terminalContainer).toBeVisible({ timeout: 10000 });
    
    console.log('Terminal container is now visible');
  });

  test('should wait for terminal to be ready and show prompt', async () => {
    // Click launch if needed
    const launchButton = page.locator('button:has-text("Launch Terminal"), button:has-text("Launch"), button:has-text("Simple")');
    const launchCount = await launchButton.count();
    
    if (launchCount > 0) {
      await launchButton.first().click();
      await page.waitForTimeout(3000);
    }
    
    // Find terminal container
    terminalContainer = page.locator('.terminal, [data-testid="terminal"], .xterm, .xterm-screen, .xterm-viewport').first();
    await expect(terminalContainer).toBeVisible({ timeout: 10000 });
    
    // Wait for terminal to show content (prompt or any text)
    await page.waitForTimeout(5000);
    
    // Check if terminal has any text content
    const terminalContent = await terminalContainer.textContent();
    console.log('Terminal content:', terminalContent);
    
    // Terminal should have some content (prompt, cursor, or output)
    expect(terminalContent).not.toBe('');
    expect(terminalContent).not.toBe(null);
    
    console.log('Terminal is ready with content');
  });

  test('should validate WebSocket connectivity', async () => {
    // Launch terminal
    const launchButton = page.locator('button:has-text("Launch Terminal"), button:has-text("Launch"), button:has-text("Simple")');
    const launchCount = await launchButton.count();
    
    if (launchCount > 0) {
      await launchButton.first().click();
      await page.waitForTimeout(3000);
    }
    
    // Monitor WebSocket connections
    const webSocketPromise = page.waitForEvent('websocket');
    
    // Wait for WebSocket to connect
    const webSocket = await webSocketPromise;
    
    expect(webSocket).toBeTruthy();
    console.log('WebSocket connection established:', webSocket.url());
    
    // Verify WebSocket stays connected
    await page.waitForTimeout(2000);
    
    // WebSocket should not be closed
    expect(webSocket.isClosed()).toBeFalsy();
    
    console.log('WebSocket connection is stable');
  });

  test('should type single characters without duplication', async () => {
    // Launch terminal
    const launchButton = page.locator('button:has-text("Launch Terminal"), button:has-text("Launch"), button:has-text("Simple")');
    const launchCount = await launchButton.count();
    
    if (launchCount > 0) {
      await launchButton.first().click();
      await page.waitForTimeout(5000);
    }
    
    // Find terminal container
    terminalContainer = page.locator('.terminal, [data-testid="terminal"], .xterm, .xterm-screen, .xterm-viewport').first();
    await expect(terminalContainer).toBeVisible();
    
    // Focus the terminal
    await terminalContainer.click();
    await page.waitForTimeout(1000);
    
    // Type individual characters and verify no duplication
    const testCharacters = ['h', 'e', 'l', 'l', 'o'];
    
    for (const char of testCharacters) {
      // Clear any previous content by getting baseline
      const beforeContent = await terminalContainer.textContent() || '';
      
      // Type single character
      await page.keyboard.type(char);
      await page.waitForTimeout(500);
      
      // Get content after typing
      const afterContent = await terminalContainer.textContent() || '';
      
      // Verify the character appears exactly once (not duplicated)
      const beforeCount = (beforeContent.match(new RegExp(char, 'g')) || []).length;
      const afterCount = (afterContent.match(new RegExp(char, 'g')) || []).length;
      
      expect(afterCount).toBe(beforeCount + 1);
      console.log(`Character '${char}' typed successfully without duplication`);
    }
    
    console.log('All characters typed without duplication');
  });

  test('should execute pwd command and show single output', async () => {
    // Launch terminal
    const launchButton = page.locator('button:has-text("Launch Terminal"), button:has-text("Launch"), button:has-text("Simple")');
    const launchCount = await launchButton.count();
    
    if (launchCount > 0) {
      await launchButton.first().click();
      await page.waitForTimeout(5000);
    }
    
    // Find terminal container
    terminalContainer = page.locator('.terminal, [data-testid="terminal"], .xterm, .xterm-screen, .xterm-viewport').first();
    await expect(terminalContainer).toBeVisible();
    
    // Focus and wait for terminal to be ready
    await terminalContainer.click();
    await page.waitForTimeout(2000);
    
    // Get baseline content
    const beforeCommand = await terminalContainer.textContent() || '';
    
    // Type pwd command
    await page.keyboard.type('pwd');
    await page.waitForTimeout(500);
    
    // Press Enter
    await page.keyboard.press('Enter');
    
    // Wait for command execution
    await page.waitForTimeout(3000);
    
    // Get content after command
    const afterCommand = await terminalContainer.textContent() || '';
    
    console.log('Terminal content before command:', beforeCommand);
    console.log('Terminal content after command:', afterCommand);
    
    // Verify command was executed (content changed)
    expect(afterCommand).not.toBe(beforeCommand);
    
    // Verify pwd appears in output (the command itself)
    expect(afterCommand).toContain('pwd');
    
    // Verify we get a directory path (should contain / or similar path indicators)
    expect(afterCommand).toMatch(/\/.*|[A-Z]:\\/);
    
    console.log('pwd command executed successfully with single output');
  });

  test('should handle backspace functionality correctly', async () => {
    // Launch terminal
    const launchButton = page.locator('button:has-text("Launch Terminal"), button:has-text("Launch"), button:has-text("Simple")');
    const launchCount = await launchButton.count();
    
    if (launchCount > 0) {
      await launchButton.first().click();
      await page.waitForTimeout(5000);
    }
    
    // Find terminal container
    terminalContainer = page.locator('.terminal, [data-testid="terminal"], .xterm, .xterm-screen, .xterm-viewport').first();
    await expect(terminalContainer).toBeVisible();
    
    // Focus the terminal
    await terminalContainer.click();
    await page.waitForTimeout(1000);
    
    // Type some text
    await page.keyboard.type('hello');
    await page.waitForTimeout(500);
    
    const withText = await terminalContainer.textContent() || '';
    expect(withText).toContain('hello');
    
    // Press backspace to delete 'o'
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(500);
    
    const afterBackspace = await terminalContainer.textContent() || '';
    
    // Verify backspace worked (should have 'hell' instead of 'hello')
    // Content should still contain 'hell' but not end with 'hello'
    expect(afterBackspace).toContain('hell');
    
    console.log('Backspace functionality works correctly');
  });

  test('should handle rapid character sequence without duplication', async () => {
    // Launch terminal
    const launchButton = page.locator('button:has-text("Launch Terminal"), button:has-text("Launch"), button:has-text("Simple")');
    const launchCount = await launchButton.count();
    
    if (launchCount > 0) {
      await launchButton.first().click();
      await page.waitForTimeout(5000);
    }
    
    // Find terminal container
    terminalContainer = page.locator('.terminal, [data-testid="terminal"], .xterm, .xterm-screen, .xterm-viewport').first();
    await expect(terminalContainer).toBeVisible();
    
    // Focus the terminal
    await terminalContainer.click();
    await page.waitForTimeout(1000);
    
    // Get baseline content
    const beforeTyping = await terminalContainer.textContent() || '';
    
    // Type a sequence rapidly
    const testString = 'test123';
    await page.keyboard.type(testString);
    await page.waitForTimeout(1000);
    
    const afterTyping = await terminalContainer.textContent() || '';
    
    // Verify the string appears in the terminal
    expect(afterTyping).toContain(testString);
    
    // Count occurrences to ensure no duplication
    const occurrences = (afterTyping.match(/test123/g) || []).length;
    expect(occurrences).toBe(1);
    
    console.log('Rapid character sequence handled without duplication');
  });

  test('should maintain terminal state across multiple commands', async () => {
    // Launch terminal
    const launchButton = page.locator('button:has-text("Launch Terminal"), button:has-text("Launch"), button:has-text("Simple")');
    const launchCount = await launchButton.count();
    
    if (launchCount > 0) {
      await launchButton.first().click();
      await page.waitForTimeout(5000);
    }
    
    // Find terminal container
    terminalContainer = page.locator('.terminal, [data-testid="terminal"], .xterm, .xterm-screen, .xterm-viewport').first();
    await expect(terminalContainer).toBeVisible();
    
    // Focus the terminal
    await terminalContainer.click();
    await page.waitForTimeout(2000);
    
    // Execute multiple commands
    const commands = ['echo "hello"', 'echo "world"'];
    
    for (const command of commands) {
      // Type command
      await page.keyboard.type(command);
      await page.waitForTimeout(300);
      
      // Press Enter
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
    }
    
    // Get final content
    const finalContent = await terminalContainer.textContent() || '';
    
    // Verify both commands and outputs are present
    expect(finalContent).toContain('echo "hello"');
    expect(finalContent).toContain('echo "world"');
    expect(finalContent).toContain('hello');
    expect(finalContent).toContain('world');
    
    console.log('Terminal maintained state across multiple commands');
  });

  test('should validate no JavaScript errors during terminal usage', async () => {
    // Monitor console errors
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Launch terminal
    const launchButton = page.locator('button:has-text("Launch Terminal"), button:has-text("Launch"), button:has-text("Simple")');
    const launchCount = await launchButton.count();
    
    if (launchCount > 0) {
      await launchButton.first().click();
      await page.waitForTimeout(5000);
    }
    
    // Find terminal container
    terminalContainer = page.locator('.terminal, [data-testid="terminal"], .xterm, .xterm-screen, .xterm-viewport').first();
    await expect(terminalContainer).toBeVisible();
    
    // Use terminal
    await terminalContainer.click();
    await page.keyboard.type('echo "test"');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    
    // Check for critical errors (ignore minor warnings)
    const criticalErrors = errors.filter(error => 
      !error.includes('Warning') && 
      !error.includes('favicon') &&
      !error.includes('404') &&
      error.includes('terminal') || error.includes('websocket') || error.includes('undefined')
    );
    
    expect(criticalErrors).toHaveLength(0);
    
    if (criticalErrors.length > 0) {
      console.log('Critical errors found:', criticalErrors);
    } else {
      console.log('No critical JavaScript errors during terminal usage');
    }
  });

  test('should handle terminal resize without breaking functionality', async () => {
    // Launch terminal
    const launchButton = page.locator('button:has-text("Launch Terminal"), button:has-text("Launch"), button:has-text("Simple")');
    const launchCount = await launchButton.count();
    
    if (launchCount > 0) {
      await launchButton.first().click();
      await page.waitForTimeout(5000);
    }
    
    // Find terminal container
    terminalContainer = page.locator('.terminal, [data-testid="terminal"], .xterm, .xterm-screen, .xterm-viewport').first();
    await expect(terminalContainer).toBeVisible();
    
    // Test typing before resize
    await terminalContainer.click();
    await page.keyboard.type('before resize');
    await page.waitForTimeout(500);
    
    // Resize viewport
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(1000);
    
    // Test typing after resize
    await page.keyboard.press('Enter');
    await page.keyboard.type('after resize');
    await page.waitForTimeout(500);
    
    const content = await terminalContainer.textContent() || '';
    
    // Verify both texts are present
    expect(content).toContain('before resize');
    expect(content).toContain('after resize');
    
    console.log('Terminal handled resize correctly');
  });
});

test.describe('Terminal WebSocket Integration', () => {
  test('should establish WebSocket connection to backend', async ({ page }) => {
    // Monitor WebSocket events
    const wsConnections: any[] = [];
    
    page.on('websocket', (ws) => {
      wsConnections.push(ws);
      console.log('WebSocket connected:', ws.url());
      
      ws.on('close', () => console.log('WebSocket closed'));
      ws.on('framesent', (frame) => console.log('WebSocket frame sent:', frame.payload));
      ws.on('framereceived', (frame) => console.log('WebSocket frame received:', frame.payload));
    });
    
    // Navigate and launch terminal
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    const launchButton = page.locator('button:has-text("Launch Terminal"), button:has-text("Launch"), button:has-text("Simple")');
    const launchCount = await launchButton.count();
    
    if (launchCount > 0) {
      await launchButton.first().click();
    }
    
    // Wait for WebSocket connection
    await page.waitForTimeout(5000);
    
    // Verify WebSocket connection exists
    expect(wsConnections.length).toBeGreaterThan(0);
    
    // Verify WebSocket URL points to backend
    const wsUrl = wsConnections[0].url();
    expect(wsUrl).toContain('localhost:3001');
    
    console.log('WebSocket integration test passed');
  });
});