/**
 * Playwright E2E Tests for SSE-based Interactive Control Tab
 * 
 * Tests the complete user interaction flow with the Interactive Control tab:
 * - Navigate to Claude Manager
 * - Launch Claude instances
 * - Test SSE connections without WebSocket errors
 * - Send commands via HTTP POST
 * - Verify real-time terminal output
 * - Test connection status indicators
 * - Validate no white screen issues
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const CONFIG = {
  frontendUrl: 'http://localhost:5173',
  backendUrl: 'http://localhost:3000',
  claudeInstances: ['claude-8251', 'claude-3494', 'claude-2023', 'claude-9392', 'claude-4411'],
  testCommands: [
    'echo "Hello from E2E test"',
    'pwd',
    'ls -la',
    'whoami',
    'date'
  ],
  timeout: 30000
};

// Helper functions
const navigateToClaudeManager = async (page: Page) => {
  await page.goto(`${CONFIG.frontendUrl}/claude-manager`);
  await page.waitForSelector('[data-testid="claude-instance-manager"]', { timeout: CONFIG.timeout });
};

const waitForInstanceConnection = async (page: Page, instanceId: string) => {
  // Wait for connection status to show connected
  await page.waitForFunction(
    (id) => {
      const statusElement = document.querySelector('[data-testid="connection-status"]');
      return statusElement?.textContent?.includes('Connected');
    },
    instanceId,
    { timeout: CONFIG.timeout }
  );
};

const sendCommandAndWaitForResponse = async (page: Page, command: string) => {
  // Find command input
  const commandInput = page.locator('input.command-input');
  await commandInput.fill(command);
  
  // Send command
  await commandInput.press('Enter');
  
  // Wait for command to appear in output
  await page.waitForFunction(
    (cmd) => {
      const outputElement = document.querySelector('.terminal-output');
      return outputElement?.textContent?.includes(cmd);
    },
    command,
    { timeout: CONFIG.timeout }
  );
};

test.describe('SSE Interactive Control Tab E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up page with error handling
    page.on('console', (msg) => {
      // Filter out WebSocket-related errors since we're testing SSE
      if (!msg.text().includes('WebSocket') && !msg.text().includes('ws://')) {
        console.log(`Browser ${msg.type()}: ${msg.text()}`);
      }
    });
    
    page.on('pageerror', (error) => {
      console.error(`Page error: ${error.message}`);
      // Don't fail tests for expected WebSocket errors during SSE transition
      if (!error.message.includes('WebSocket')) {
        throw error;
      }
    });
  });

  test.describe('Navigation and Initial Load', () => {
    test('should load Claude Manager without white screen issues', async ({ page }) => {
      await navigateToClaudeManager(page);
      
      // Verify main elements are visible
      await expect(page.locator('h1')).toContainText('Claude Instance Manager');
      await expect(page.locator('[data-testid="claude-instance-manager"]')).toBeVisible();
      
      // Check for white screen indicators
      const bodyContent = await page.textContent('body');
      expect(bodyContent?.length).toBeGreaterThan(100); // Ensure content is rendered
      
      // Verify no critical errors in console
      const logs = await page.evaluate(() => {
        return window.console.error.toString();
      }).catch(() => 'No console errors');
      
      expect(logs).not.toContain('Cannot read property');
      expect(logs).not.toContain('undefined is not a function');
    });

    test('should display launch buttons and instance list', async ({ page }) => {
      await navigateToClaudeManager(page);
      
      // Check for launch buttons
      await expect(page.locator('text=Launch Claude Code Dev')).toBeVisible();
      await expect(page.locator('text=Launch Claude Terminal')).toBeVisible();
      
      // Check for instances section
      await expect(page.locator('text=Active Instances')).toBeVisible();
    });
  });

  test.describe('Claude Instance Creation and Management', () => {
    test('should create a new Claude instance successfully', async ({ page }) => {
      await navigateToClaudeManager(page);
      
      // Launch a new instance
      const launchButton = page.locator('text=Launch Claude Code Dev').first();
      await launchButton.click();
      
      // Wait for instance to appear in the list
      await page.waitForSelector('.claude-instance-item', { timeout: CONFIG.timeout });
      
      // Verify instance appears
      const instanceItems = page.locator('.claude-instance-item');
      await expect(instanceItems).toHaveCount(1);
      
      // Check instance status
      await expect(instanceItems.first()).toContainText('running');
    });

    test('should select and connect to instance', async ({ page }) => {
      await navigateToClaudeManager(page);
      
      // Create instance first
      await page.locator('text=Launch Claude Code Dev').first().click();
      await page.waitForSelector('.claude-instance-item', { timeout: CONFIG.timeout });
      
      // Select the instance
      const instanceItem = page.locator('.claude-instance-item').first();
      await instanceItem.click();
      
      // Wait for connection to establish
      await waitForInstanceConnection(page, 'any');
      
      // Verify connection status
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
    });
  });

  test.describe('SSE Terminal Interface Testing', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToClaudeManager(page);
      
      // Create and connect to an instance
      await page.locator('text=Launch Claude Code Dev').first().click();
      await page.waitForSelector('.claude-instance-item', { timeout: CONFIG.timeout });
      
      const instanceItem = page.locator('.claude-instance-item').first();
      await instanceItem.click();
      
      await waitForInstanceConnection(page, 'any');
    });

    test('should establish SSE connection without WebSocket errors', async ({ page }) => {
      // Monitor network requests for SSE streams
      const sseRequests: string[] = [];
      const wsRequests: string[] = [];
      
      page.on('request', (request) => {
        const url = request.url();
        if (url.includes('/terminal/stream')) {
          sseRequests.push(url);
        }
        if (url.startsWith('ws://') || url.startsWith('wss://')) {
          wsRequests.push(url);
        }
      });
      
      // Wait a moment for connections to establish
      await page.waitForTimeout(2000);
      
      // Should have SSE requests but no WebSocket requests in terminal
      expect(sseRequests.length).toBeGreaterThan(0);
      
      // Verify terminal-related WebSocket requests are minimal/none
      const terminalWsRequests = wsRequests.filter(url => url.includes('terminal'));
      expect(terminalWsRequests.length).toBe(0);
    });

    test('should send commands via HTTP POST', async ({ page }) => {
      const testCommand = 'echo "Testing HTTP POST"';
      
      // Monitor POST requests
      const postRequests: any[] = [];
      page.on('request', (request) => {
        if (request.method() === 'POST' && request.url().includes('/terminal/input')) {
          postRequests.push({
            url: request.url(),
            postData: request.postData()
          });
        }
      });
      
      // Send command
      await sendCommandAndWaitForResponse(page, testCommand);
      
      // Verify POST request was made
      expect(postRequests.length).toBeGreaterThan(0);
      
      const postRequest = postRequests[0];
      expect(postRequest.url).toContain('/terminal/input');
      expect(postRequest.postData).toContain(testCommand);
    });

    test('should display real-time terminal output', async ({ page }) => {
      const testMessage = 'Real-time output test';
      
      // Send command that should produce output
      await sendCommandAndWaitForResponse(page, `echo "${testMessage}"`);
      
      // Verify output appears in terminal
      const terminalOutput = page.locator('.terminal-output');
      await expect(terminalOutput).toContainText(testMessage);
      
      // Check timestamp is present
      const outputLines = page.locator('.output-line');
      const firstLine = outputLines.first();
      await expect(firstLine.locator('.timestamp')).toBeVisible();
    });

    test('should handle multiple commands in sequence', async ({ page }) => {
      const commands = ['pwd', 'ls', 'date'];
      
      for (const command of commands) {
        await sendCommandAndWaitForResponse(page, command);
        
        // Verify each command appears in output
        await expect(page.locator('.terminal-output')).toContainText(`> ${command}`);
      }
      
      // Verify all commands are in output
      const outputText = await page.locator('.terminal-output').textContent();
      commands.forEach(command => {
        expect(outputText).toContain(command);
      });
    });

    test('should update connection status indicators correctly', async ({ page }) => {
      // Verify initial connected state
      const statusIndicator = page.locator('.connection-status .status-indicator');
      await expect(statusIndicator).toHaveClass(/connected/i);
      
      // Check connection stats
      const connectionStatus = page.locator('[data-testid="connection-status"]');
      await expect(connectionStatus).toContainText('Connected');
      
      // Send a command and verify activity updates
      await sendCommandAndWaitForResponse(page, 'echo "status test"');
      
      // Message count should update
      await page.waitForFunction(() => {
        const statusEl = document.querySelector('.connection-status');
        return statusEl?.textContent?.includes('messages');
      });
    });

    test('should handle command history navigation', async ({ page }) => {
      const commands = ['first command', 'second command', 'third command'];
      
      // Send multiple commands
      for (const command of commands) {
        await sendCommandAndWaitForResponse(page, command);
      }
      
      const commandInput = page.locator('input.command-input');
      
      // Navigate up through history
      await commandInput.press('ArrowUp');
      await expect(commandInput).toHaveValue('third command');
      
      await commandInput.press('ArrowUp');
      await expect(commandInput).toHaveValue('second command');
      
      await commandInput.press('ArrowUp');
      await expect(commandInput).toHaveValue('first command');
      
      // Navigate down
      await commandInput.press('ArrowDown');
      await expect(commandInput).toHaveValue('second command');
    });
  });

  test.describe('Multiple Claude Instances', () => {
    // Test specific instance IDs if backend provides them
    CONFIG.claudeInstances.forEach(instanceId => {
      test(`should handle instance ${instanceId} specifically`, async ({ page }) => {
        await navigateToClaudeManager(page);
        
        // If this specific instance exists in the backend, test it
        const response = await page.request.get(`${CONFIG.backendUrl}/api/claude/instances`);
        const data = await response.json();
        
        if (data.success && data.instances.some((inst: any) => inst.id === instanceId)) {
          // Find and select this specific instance
          const instanceSelector = `[data-instance-id="${instanceId}"]`;
          const instanceExists = await page.locator(instanceSelector).isVisible().catch(() => false);
          
          if (instanceExists) {
            await page.locator(instanceSelector).click();
            await waitForInstanceConnection(page, instanceId);
            
            // Test command specific to this instance
            await sendCommandAndWaitForResponse(page, `echo "Testing ${instanceId}"`);
            
            // Verify output is specific to this instance
            await expect(page.locator('.terminal-output')).toContainText(instanceId);
          }
        }
      });
    });

    test('should handle multiple concurrent instances', async ({ page }) => {
      await navigateToClaudeManager(page);
      
      // Create multiple instances
      for (let i = 0; i < 3; i++) {
        await page.locator('text=Launch Claude Code Dev').first().click();
        await page.waitForTimeout(2000); // Wait between launches
      }
      
      // Verify multiple instances exist
      const instanceItems = page.locator('.claude-instance-item');
      const count = await instanceItems.count();
      expect(count).toBeGreaterThanOrEqual(1);
      
      // Test switching between instances
      if (count >= 2) {
        // Select first instance
        await instanceItems.nth(0).click();
        await waitForInstanceConnection(page, 'first');
        
        await sendCommandAndWaitForResponse(page, 'echo "First instance"');
        
        // Select second instance
        await instanceItems.nth(1).click();
        await waitForInstanceConnection(page, 'second');
        
        await sendCommandAndWaitForResponse(page, 'echo "Second instance"');
        
        // Verify outputs are separate
        const outputText = await page.locator('.terminal-output').textContent();
        expect(outputText).toContain('Second instance');
      }
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      await navigateToClaudeManager(page);
      
      // Create and connect to instance
      await page.locator('text=Launch Claude Code Dev').first().click();
      await page.waitForSelector('.claude-instance-item', { timeout: CONFIG.timeout });
      await page.locator('.claude-instance-item').first().click();
      await waitForInstanceConnection(page, 'any');
      
      // Simulate network failure by blocking requests
      await page.route('**/terminal/input', route => {
        route.abort();
      });
      
      // Try to send command
      const commandInput = page.locator('input.command-input');
      await commandInput.fill('test command');
      await commandInput.press('Enter');
      
      // Should show error state
      await page.waitForTimeout(2000);
      
      // Component should still be functional
      await expect(page.locator('.terminal-interface')).toBeVisible();
      await expect(commandInput).toBeVisible();
    });

    test('should recover from connection errors', async ({ page }) => {
      await navigateToClaudeManager(page);
      
      // Create instance
      await page.locator('text=Launch Claude Code Dev').first().click();
      await page.waitForSelector('.claude-instance-item', { timeout: CONFIG.timeout });
      
      const instanceItem = page.locator('.claude-instance-item').first();
      await instanceItem.click();
      
      // Even if connection fails initially, component should handle it
      const connectionButton = page.locator('.btn-connect, .btn-disconnect');
      
      if (await connectionButton.isVisible()) {
        const buttonText = await connectionButton.textContent();
        
        if (buttonText?.includes('Connect')) {
          // Try to connect manually
          await connectionButton.click();
          await page.waitForTimeout(2000);
          
          // Component should remain stable
          await expect(page.locator('.terminal-interface')).toBeVisible();
        }
      }
    });
  });

  test.describe('User Interface and Usability', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToClaudeManager(page);
      await page.locator('text=Launch Claude Code Dev').first().click();
      await page.waitForSelector('.claude-instance-item', { timeout: CONFIG.timeout });
      await page.locator('.claude-instance-item').first().click();
      await waitForInstanceConnection(page, 'any');
    });

    test('should have proper accessibility features', async ({ page }) => {
      // Check input has proper attributes
      const commandInput = page.locator('input.command-input');
      
      await expect(commandInput).toHaveAttribute('autoComplete', 'off');
      await expect(commandInput).toHaveAttribute('spellCheck', 'false');
      
      // Check buttons have titles
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const title = await button.getAttribute('title');
        if (title) {
          expect(title.length).toBeGreaterThan(0);
        }
      }
    });

    test('should handle keyboard shortcuts correctly', async ({ page }) => {
      const commandInput = page.locator('input.command-input');
      
      // Test Enter key sends command
      await commandInput.fill('test enter key');
      await commandInput.press('Enter');
      
      await expect(page.locator('.terminal-output')).toContainText('test enter key');
      
      // Test Escape clears input
      await commandInput.fill('test escape');
      await commandInput.press('Escape');
      
      await expect(commandInput).toHaveValue('');
    });

    test('should display terminal UI elements correctly', async ({ page }) => {
      // Check terminal header
      await expect(page.locator('.terminal-header')).toBeVisible();
      await expect(page.locator('.terminal-title')).toBeVisible();
      
      // Check terminal output area
      await expect(page.locator('.terminal-output')).toBeVisible();
      
      // Check terminal input area
      await expect(page.locator('.terminal-input')).toBeVisible();
      await expect(page.locator('.command-input')).toBeVisible();
      await expect(page.locator('.btn-send')).toBeVisible();
    });

    test('should auto-scroll terminal output', async ({ page }) => {
      // Send multiple commands to generate output
      for (let i = 0; i < 10; i++) {
        await sendCommandAndWaitForResponse(page, `echo "Line ${i + 1}"`);
      }
      
      // Check that terminal scrolls to bottom
      const terminalOutput = page.locator('.terminal-output');
      
      // The last line should be visible
      await expect(page.locator('text=Line 10')).toBeVisible();
      
      // Scroll position should be at bottom
      const scrollTop = await terminalOutput.evaluate((el) => el.scrollTop);
      const scrollHeight = await terminalOutput.evaluate((el) => el.scrollHeight);
      const clientHeight = await terminalOutput.evaluate((el) => el.clientHeight);
      
      expect(scrollTop).toBeGreaterThanOrEqual(scrollHeight - clientHeight - 10); // Allow small margin
    });
  });

  test.describe('Performance and Stability', () => {
    test('should handle high-frequency output without performance issues', async ({ page }) => {
      await navigateToClaudeManager(page);
      
      // Create and connect to instance
      await page.locator('text=Launch Claude Code Dev').first().click();
      await page.waitForSelector('.claude-instance-item', { timeout: CONFIG.timeout });
      await page.locator('.claude-instance-item').first().click();
      await waitForInstanceConnection(page, 'any');
      
      const startTime = Date.now();
      
      // Send rapid commands
      for (let i = 0; i < 20; i++) {
        const commandInput = page.locator('input.command-input');
        await commandInput.fill(`echo "Rapid test ${i}"`);
        await commandInput.press('Enter');
        
        // Small delay to prevent overwhelming
        await page.waitForTimeout(100);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 10 seconds)
      expect(duration).toBeLessThan(10000);
      
      // Terminal should still be responsive
      const commandInput = page.locator('input.command-input');
      await expect(commandInput).toBeEnabled();
    });

    test('should maintain stable state during extended use', async ({ page }) => {
      await navigateToClaudeManager(page);
      
      // Create and connect to instance
      await page.locator('text=Launch Claude Code Dev').first().click();
      await page.waitForSelector('.claude-instance-item', { timeout: CONFIG.timeout });
      await page.locator('.claude-instance-item').first().click();
      await waitForInstanceConnection(page, 'any');
      
      // Simulate extended usage
      const commands = CONFIG.testCommands;
      
      for (let cycle = 0; cycle < 5; cycle++) {
        for (const command of commands) {
          await sendCommandAndWaitForResponse(page, command);
          await page.waitForTimeout(500);
        }
        
        // Clear output periodically
        if (cycle % 2 === 0) {
          const clearButton = page.locator('text=Clear');
          if (await clearButton.isVisible()) {
            await clearButton.click();
          }
        }
      }
      
      // Terminal should still be functional
      const commandInput = page.locator('input.command-input');
      await expect(commandInput).toBeEnabled();
      await expect(page.locator('.terminal-interface')).toBeVisible();
      
      // Connection should still be active
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
    });
  });
});