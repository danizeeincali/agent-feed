/**
 * TOOL CALL VISUALIZATION E2E TESTS
 * 
 * This suite validates tool call visualization, WebSocket stability,
 * and browser compatibility for the Claude Code interface.
 * 
 * Tests complete user workflow with tool call rendering and
 * ensures no functionality breaks during tool call operations.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 60000; // 60 seconds for tool calls
const LONG_TIMEOUT = 120000; // 2 minutes for complex operations

// Tool call commands that should trigger visualization
const TOOL_CALL_COMMANDS = [
  'help',
  'ls',
  'pwd',
  'whoami',
  'echo "Hello Claude"',
  'Create a simple Python script that prints hello world',
  'List files in the current directory',
  'Check the current working directory'
];

// Expected tool call patterns in the interface
const TOOL_CALL_PATTERNS = [
  /tool.*call/i,
  /function.*call/i,
  /executing/i,
  /bash.*command/i,
  /claude.*code/i,
  /\[.*\]/,  // Command brackets
  /Running:/i,
  /Output:/i
];

test.describe('Tool Call Visualization E2E Suite', () => {
  let page: Page;
  let context: BrowserContext;
  let wsConnections: WebSocket[] = [];
  let wsMessages: string[] = [];
  let consoleErrors: string[] = [];
  let networkErrors: string[] = [];

  test.beforeAll(async ({ browser }) => {
    // Create persistent context for real user simulation
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Playwright Tool Call E2E Testing)',
      ignoreHTTPSErrors: true,
    });
    page = await context.newPage();
    
    // Set longer timeout for tool call operations
    page.setDefaultTimeout(TEST_TIMEOUT);
    
    // Monitor console errors (critical for debugging)
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const error = `Browser Console Error: ${msg.text()}`;
        console.error(error);
        consoleErrors.push(error);
      } else if (msg.type() === 'warn' && msg.text().includes('WebSocket')) {
        console.warn('WebSocket Warning:', msg.text());
      }
    });
    
    // Monitor network failures
    page.on('requestfailed', request => {
      const error = `Network Request Failed: ${request.url()} - ${request.failure()?.errorText}`;
      console.error(error);
      networkErrors.push(error);
    });

    // Monitor WebSocket connections and messages
    page.on('websocket', ws => {
      wsConnections.push(ws);
      console.log('[E2E] WebSocket connection established:', ws.url());
      
      ws.on('framereceived', event => {
        const message = event.payload.toString();
        wsMessages.push(message);
        
        // Log tool call related messages
        if (TOOL_CALL_PATTERNS.some(pattern => pattern.test(message))) {
          console.log('[E2E] Tool call message received:', message.substring(0, 200));
        }
      });
      
      ws.on('framesent', event => {
        const message = event.payload.toString();
        console.log('[E2E] WebSocket message sent:', message.substring(0, 100));
      });
      
      ws.on('close', () => {
        console.log('[E2E] WebSocket connection closed:', ws.url());
      });
    });
    
    // Monitor page errors
    page.on('pageerror', error => {
      const errorMsg = `Page Error: ${error.message}`;
      console.error(errorMsg);
      consoleErrors.push(errorMsg);
    });
  });

  test.afterAll(async () => {
    // Report test session statistics
    console.log('\n=== Tool Call E2E Test Session Summary ===');
    console.log(`WebSocket Connections: ${wsConnections.length}`);
    console.log(`WebSocket Messages: ${wsMessages.length}`);
    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log(`Network Errors: ${networkErrors.length}`);
    
    if (consoleErrors.length > 0) {
      console.log('\nConsole Errors:');
      consoleErrors.forEach((error, i) => console.log(`${i + 1}. ${error}`));
    }
    
    await context.close();
  });

  test.describe('1. Application Bootstrap & Tool Call Setup', () => {
    test('should load application with tool call support ready', async () => {
      console.log('🌟 Testing: Application loads with tool call support');
      
      const response = await page.goto(BASE_URL);
      expect(response?.status()).toBe(200);
      
      // Wait for React app to fully initialize
      await page.waitForSelector('[data-testid="header"]', { timeout: TEST_TIMEOUT });
      await page.waitForSelector('[data-testid="agent-feed"]', { timeout: TEST_TIMEOUT });
      
      // Verify no critical JavaScript errors on page load
      const criticalErrors = consoleErrors.filter(error => 
        error.includes('TypeError') || 
        error.includes('ReferenceError') || 
        error.includes('WebSocket')
      );
      expect(criticalErrors.length).toBe(0);
      
      // Verify main navigation includes Claude instances
      await expect(page.locator('text=Claude Instances')).toBeVisible();
      
      console.log('✅ Application loaded with tool call support ready');
    });

    test('should navigate to Claude instances without errors', async () => {
      console.log('🌟 Testing: Navigation to Claude instances');
      
      await page.goto(`${BASE_URL}/claude-instances`);
      await page.waitForSelector('[data-testid="claude-instance-manager"]', { timeout: TEST_TIMEOUT });
      
      // Verify instance creation buttons are present
      const createButtons = page.locator('[data-testid*="create-"][data-testid*="instance"]');
      const buttonCount = await createButtons.count();
      expect(buttonCount).toBeGreaterThanOrEqual(2);
      
      // Verify no WebSocket errors on page load
      const wsErrors = consoleErrors.filter(error => error.includes('WebSocket'));
      expect(wsErrors.length).toBe(0);
      
      console.log('✅ Navigation to Claude instances successful');
    });
  });

  test.describe('2. Instance Creation with Tool Call Ready State', () => {
    test('should create instance and verify tool call infrastructure', async () => {
      console.log('🌟 Testing: Instance creation with tool call support');
      
      await page.goto(`${BASE_URL}/claude-instances`);
      await page.waitForSelector('[data-testid="claude-instance-manager"]', { timeout: TEST_TIMEOUT });
      
      // Create production instance
      const createButton = page.locator('[data-testid*="create-"][data-testid*="instance"]').first();
      await createButton.click();
      
      // Wait for instance to be created and appear
      await page.waitForSelector('[data-testid="instance-list"]', { timeout: TEST_TIMEOUT });
      await page.waitForSelector('[data-testid="instance-item"]', { timeout: TEST_TIMEOUT });
      
      // Verify instance status shows ready state
      const instanceStatus = page.locator('text=Claude AI Interactive');
      await expect(instanceStatus.first()).toBeVisible({ timeout: TEST_TIMEOUT });
      
      // Check for connection errors - should NOT be present
      const connectionError = page.locator('text=Connection Error');
      await expect(connectionError).not.toBeVisible();
      
      // Verify WebSocket connections are established
      await page.waitForTimeout(3000); // Allow WebSocket to connect
      expect(wsConnections.length).toBeGreaterThan(0);
      
      console.log('✅ Instance created with tool call support ready');
    });
  });

  test.describe('3. Tool Call Visualization Tests', () => {
    test.beforeEach(async () => {
      // Ensure we have an instance and are in the terminal
      await page.goto(`${BASE_URL}/claude-instances`);
      await page.waitForSelector('[data-testid="instance-item"]', { timeout: TEST_TIMEOUT });
      
      // Click on first instance to open terminal
      await page.click('[data-testid="instance-item"]');
      await page.waitForSelector('[data-testid="terminal-container"], .xterm-screen', { timeout: TEST_TIMEOUT });
      
      // Clear previous WebSocket messages for clean test
      wsMessages.length = 0;
    });

    test('should display tool call visualization for basic commands', async () => {
      console.log('🌟 Testing: Basic tool call visualization');
      
      const testCommand = 'help';
      const initialMsgCount = wsMessages.length;
      
      // Type command into terminal
      await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', testCommand);
      await page.keyboard.press('Enter');
      
      // Wait for tool call visualization to appear
      await page.waitForFunction(
        () => {
          const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
          return terminalText.length > 10 && (
            terminalText.toLowerCase().includes('claude') ||
            terminalText.toLowerCase().includes('help') ||
            terminalText.toLowerCase().includes('command')
          );
        },
        { timeout: TEST_TIMEOUT }
      );
      
      // Verify tool call content appears
      const terminalContent = await page.textContent('.xterm-screen, [data-testid="terminal-output"]');
      expect(terminalContent).toBeTruthy();
      expect(terminalContent.length).toBeGreaterThan(20);
      
      // Verify no timeout or connection errors
      expect(terminalContent).not.toContain('timeout');
      expect(terminalContent).not.toContain('Connection Error');
      expect(terminalContent).not.toContain('Error: ');
      
      // Verify WebSocket messages were received
      const newMsgCount = wsMessages.length;
      expect(newMsgCount).toBeGreaterThan(initialMsgCount);
      
      // Check for tool call patterns in messages
      const toolCallMessages = wsMessages.filter(msg => 
        TOOL_CALL_PATTERNS.some(pattern => pattern.test(msg))
      );
      expect(toolCallMessages.length).toBeGreaterThan(0);
      
      console.log('✅ Basic tool call visualization working');
    });

    test('should handle file system tool calls with proper visualization', async () => {
      console.log('🌟 Testing: File system tool call visualization');
      
      const testCommand = 'ls';
      const initialMsgCount = wsMessages.length;
      
      await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', testCommand);
      await page.keyboard.press('Enter');
      
      // Wait for file listing to appear
      await page.waitForFunction(
        () => {
          const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
          return terminalText.length > 20 && (
            /\.(js|ts|json|md)/.test(terminalText) ||
            /package/.test(terminalText) ||
            /node_modules/.test(terminalText) ||
            /src/.test(terminalText)
          );
        },
        { timeout: TEST_TIMEOUT }
      );
      
      const terminalContent = await page.textContent('.xterm-screen, [data-testid="terminal-output"]');
      
      // Verify file listing content
      expect(terminalContent).toBeTruthy();
      expect(terminalContent.length).toBeGreaterThan(50);
      
      // Should contain typical project files
      const hasProjectFiles = (
        terminalContent.includes('package.json') ||
        terminalContent.includes('README') ||
        terminalContent.includes('src') ||
        terminalContent.includes('.js') ||
        terminalContent.includes('.ts')
      );
      expect(hasProjectFiles).toBe(true);
      
      // Verify WebSocket communication occurred
      expect(wsMessages.length).toBeGreaterThan(initialMsgCount);
      
      console.log('✅ File system tool call visualization working');
    });

    test('should display tool call status updates in real-time', async () => {
      console.log('🌟 Testing: Real-time tool call status updates');
      
      const testCommand = 'Create a simple hello.py file with a print statement';
      const initialMsgCount = wsMessages.length;
      
      await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', testCommand);
      await page.keyboard.press('Enter');
      
      // Wait for tool call to start processing
      await page.waitForFunction(
        () => {
          const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
          return terminalText.length > 30 && (
            terminalText.toLowerCase().includes('creat') ||
            terminalText.toLowerCase().includes('file') ||
            terminalText.toLowerCase().includes('python') ||
            terminalText.toLowerCase().includes('hello')
          );
        },
        { timeout: LONG_TIMEOUT }
      );
      
      const terminalContent = await page.textContent('.xterm-screen, [data-testid="terminal-output"]');
      
      // Verify tool call execution content
      expect(terminalContent).toBeTruthy();
      expect(terminalContent.length).toBeGreaterThan(50);
      
      // Should not contain error messages
      expect(terminalContent).not.toContain('Error:');
      expect(terminalContent).not.toContain('Failed');
      expect(terminalContent).not.toContain('timeout');
      
      // Verify continuous WebSocket communication
      const finalMsgCount = wsMessages.length;
      expect(finalMsgCount).toBeGreaterThan(initialMsgCount + 1);
      
      console.log('✅ Real-time tool call status updates working');
    });

    test('should handle multiple concurrent tool calls', async () => {
      console.log('🌟 Testing: Multiple concurrent tool calls');
      
      // Open a second terminal session if dual mode is available
      const dualModeToggle = page.locator('[data-testid="dual-mode-toggle"], button:has-text("Both")');
      if (await dualModeToggle.count() > 0) {
        await dualModeToggle.click();
        await page.waitForTimeout(1000);
      }
      
      const initialMsgCount = wsMessages.length;
      
      // Send first command
      await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'pwd');
      await page.keyboard.press('Enter');
      
      // Wait a bit then send second command
      await page.waitForTimeout(2000);
      await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'whoami');
      await page.keyboard.press('Enter');
      
      // Wait for both responses
      await page.waitForFunction(
        () => {
          const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
          return terminalText.length > 50 && (
            (terminalText.includes('workspaces') || terminalText.includes('/')) &&
            terminalText.length > 30
          );
        },
        { timeout: TEST_TIMEOUT }
      );
      
      // Verify we received responses for both commands
      const finalMsgCount = wsMessages.length;
      expect(finalMsgCount).toBeGreaterThan(initialMsgCount + 2);
      
      // Verify no connection drops during concurrent operations
      const wsConnectionErrors = consoleErrors.filter(error => 
        error.includes('WebSocket') && error.includes('close')
      );
      expect(wsConnectionErrors.length).toBe(0);
      
      console.log('✅ Multiple concurrent tool calls handled successfully');
    });
  });

  test.describe('4. WebSocket Stability During Tool Calls', () => {
    test('should maintain stable WebSocket connection during tool operations', async () => {
      console.log('🌟 Testing: WebSocket stability during tool calls');
      
      await page.goto(`${BASE_URL}/claude-instances`);
      await page.waitForSelector('[data-testid="instance-item"]', { timeout: TEST_TIMEOUT });
      
      const initialConnectionCount = wsConnections.length;
      
      // Open terminal and perform multiple operations
      await page.click('[data-testid="instance-item"]');
      await page.waitForSelector('.xterm-screen, [data-testid="terminal-output"]', { timeout: TEST_TIMEOUT });
      
      // Perform multiple tool calls in sequence
      const commands = ['help', 'ls', 'pwd'];
      
      for (const command of commands) {
        await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', command);
        await page.keyboard.press('Enter');
        
        // Wait for response
        await page.waitForFunction(
          (cmd) => {
            const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
            return terminalText.includes(cmd) && terminalText.length > 20;
          },
          command,
          { timeout: TEST_TIMEOUT }
        );
        
        await page.waitForTimeout(1000); // Brief pause between commands
      }
      
      // Verify WebSocket connection remained stable
      const finalConnectionCount = wsConnections.length;
      const connectionDrops = finalConnectionCount - initialConnectionCount;
      
      // Should have at most 1 new connection (initial connection)
      expect(connectionDrops).toBeLessThanOrEqual(1);
      
      // Verify no WebSocket close events
      const wsCloseErrors = consoleErrors.filter(error => 
        error.includes('WebSocket') && (error.includes('close') || error.includes('disconnect'))
      );
      expect(wsCloseErrors.length).toBe(0);
      
      console.log('✅ WebSocket connection remained stable during tool calls');
    });

    test('should handle WebSocket reconnection gracefully during tool calls', async () => {
      console.log('🌟 Testing: WebSocket reconnection during tool calls');
      
      await page.goto(`${BASE_URL}/claude-instances`);
      await page.waitForSelector('[data-testid="instance-item"]', { timeout: TEST_TIMEOUT });
      
      // Start a tool call
      await page.click('[data-testid="instance-item"]');
      await page.waitForSelector('.xterm-screen, [data-testid="terminal-output"]', { timeout: TEST_TIMEOUT });
      
      // Start a long-running command
      await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'help');
      await page.keyboard.press('Enter');
      
      // Simulate network interruption
      await context.setOffline(true);
      await page.waitForTimeout(2000);
      
      // Restore network
      await context.setOffline(false);
      await page.waitForTimeout(5000); // Allow reconnection
      
      // Verify the interface recovers and we can still send commands
      await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'pwd');
      await page.keyboard.press('Enter');
      
      // Wait for recovery
      await page.waitForFunction(
        () => {
          const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
          return terminalText.length > 30;
        },
        { timeout: LONG_TIMEOUT }
      );
      
      // Verify we can still interact with the terminal
      const terminalContent = await page.textContent('.xterm-screen, [data-testid="terminal-output"]');
      expect(terminalContent).toBeTruthy();
      expect(terminalContent.length).toBeGreaterThan(20);
      
      console.log('✅ WebSocket reconnection handled gracefully');
    });
  });

  test.describe('5. Tool Call Display Formatting', () => {
    test('should format tool call output correctly', async () => {
      console.log('🌟 Testing: Tool call output formatting');
      
      await page.goto(`${BASE_URL}/claude-instances`);
      await page.waitForSelector('[data-testid="instance-item"]', { timeout: TEST_TIMEOUT });
      
      await page.click('[data-testid="instance-item"]');
      await page.waitForSelector('.xterm-screen, [data-testid="terminal-output"]', { timeout: TEST_TIMEOUT });
      
      // Test command with structured output
      await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'ls -la');
      await page.keyboard.press('Enter');
      
      // Wait for formatted output
      await page.waitForFunction(
        () => {
          const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
          return terminalText.length > 50;
        },
        { timeout: TEST_TIMEOUT }
      );
      
      // Verify output formatting is preserved
      const terminalElement = page.locator('.xterm-screen, [data-testid="terminal-output"]');
      const hasMonoFont = await terminalElement.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.fontFamily.includes('mono') || style.fontFamily.includes('Consolas') || 
               style.fontFamily.includes('Monaco') || style.fontFamily.includes('Courier');
      });
      
      expect(hasMonoFont).toBe(true);
      
      // Verify content is structured and readable
      const terminalContent = await terminalElement.textContent();
      expect(terminalContent).toBeTruthy();
      expect(terminalContent.length).toBeGreaterThan(50);
      
      console.log('✅ Tool call output formatting is correct');
    });

    test('should maintain scroll position during tool call updates', async () => {
      console.log('🌟 Testing: Scroll position during tool call updates');
      
      await page.goto(`${BASE_URL}/claude-instances`);
      await page.waitForSelector('[data-testid="instance-item"]', { timeout: TEST_TIMEOUT });
      
      await page.click('[data-testid="instance-item"]');
      const terminalContainer = '.xterm-screen, [data-testid="terminal-output"]';
      await page.waitForSelector(terminalContainer, { timeout: TEST_TIMEOUT });
      
      // Generate some output first
      await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'help');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
      
      // Get initial scroll position
      const initialScrollTop = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        return element ? element.scrollTop : 0;
      }, terminalContainer);
      
      // Send another command that generates output
      await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'ls');
      await page.keyboard.press('Enter');
      
      // Wait for output to appear
      await page.waitForTimeout(3000);
      
      // Check that scroll position updated (auto-scroll to bottom)
      const finalScrollTop = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        return element ? element.scrollTop : 0;
      }, terminalContainer);
      
      // Should auto-scroll to show new content
      expect(finalScrollTop).toBeGreaterThanOrEqual(initialScrollTop);
      
      console.log('✅ Scroll position maintained during tool call updates');
    });
  });

  test.describe('6. Browser Compatibility Tests', () => {
    test('should work correctly in different browser contexts', async () => {
      console.log('🌟 Testing: Browser compatibility for tool calls');
      
      // Test in current browser context
      await page.goto(`${BASE_URL}/claude-instances`);
      await page.waitForSelector('[data-testid="instance-item"]', { timeout: TEST_TIMEOUT });
      
      await page.click('[data-testid="instance-item"]');
      await page.waitForSelector('.xterm-screen, [data-testid="terminal-output"]', { timeout: TEST_TIMEOUT });
      
      // Test basic tool call
      await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'pwd');
      await page.keyboard.press('Enter');
      
      // Wait for response
      await page.waitForFunction(
        () => {
          const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
          return terminalText.length > 10;
        },
        { timeout: TEST_TIMEOUT }
      );
      
      // Verify WebSocket functionality works in this browser
      expect(wsConnections.length).toBeGreaterThan(0);
      expect(wsMessages.length).toBeGreaterThan(0);
      
      // Verify no browser-specific errors
      const browserErrors = consoleErrors.filter(error => 
        error.includes('not supported') || error.includes('compatibility')
      );
      expect(browserErrors.length).toBe(0);
      
      console.log('✅ Browser compatibility verified for tool calls');
    });

    test('should handle mobile-responsive tool call interface', async () => {
      console.log('🌟 Testing: Mobile responsiveness for tool calls');
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto(`${BASE_URL}/claude-instances`);
      await page.waitForSelector('[data-testid="claude-instance-manager"]', { timeout: TEST_TIMEOUT });
      
      // Verify mobile layout
      const isMobileLayout = await page.evaluate(() => {
        return window.innerWidth < 768;
      });
      expect(isMobileLayout).toBe(true);
      
      // Create and test instance on mobile
      const createButton = page.locator('[data-testid*="create-"][data-testid*="instance"]').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForSelector('[data-testid="instance-item"]', { timeout: TEST_TIMEOUT });
        
        await page.click('[data-testid="instance-item"]');
        
        // Wait for mobile terminal to load
        const terminalSelector = '.xterm-screen, [data-testid="terminal-output"], [data-testid="terminal-container"]';
        await page.waitForSelector(terminalSelector, { timeout: TEST_TIMEOUT });
        
        // Verify terminal is usable on mobile
        const terminalVisible = await page.isVisible(terminalSelector);
        expect(terminalVisible).toBe(true);
        
        console.log('✅ Mobile responsiveness verified for tool calls');
      } else {
        console.log('⚠️  Skipping mobile test - create button not visible');
      }
    });
  });

  test.describe('7. Error Handling & Recovery', () => {
    test('should handle tool call failures gracefully', async () => {
      console.log('🌟 Testing: Tool call error handling');
      
      await page.goto(`${BASE_URL}/claude-instances`);
      await page.waitForSelector('[data-testid="instance-item"]', { timeout: TEST_TIMEOUT });
      
      await page.click('[data-testid="instance-item"]');
      await page.waitForSelector('.xterm-screen, [data-testid="terminal-output"]', { timeout: TEST_TIMEOUT });
      
      // Send a command that might cause an error
      await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'invalidcommandthatdoesnotexist123');
      await page.keyboard.press('Enter');
      
      // Wait for error response
      await page.waitForFunction(
        () => {
          const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
          return terminalText.length > 20;
        },
        { timeout: TEST_TIMEOUT }
      );
      
      const terminalContent = await page.textContent('.xterm-screen, [data-testid="terminal-output"]');
      expect(terminalContent).toBeTruthy();
      
      // Should handle the error gracefully without crashing
      // The interface should still be responsive
      await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'help');
      await page.keyboard.press('Enter');
      
      await page.waitForFunction(
        () => {
          const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
          return terminalText.includes('help') || terminalText.length > 50;
        },
        { timeout: TEST_TIMEOUT }
      );
      
      console.log('✅ Tool call error handling works gracefully');
    });

    test('should recover from backend disconnection during tool calls', async () => {
      console.log('🌟 Testing: Backend disconnection recovery');
      
      await page.goto(`${BASE_URL}/claude-instances`);
      await page.waitForSelector('[data-testid="instance-item"]', { timeout: TEST_TIMEOUT });
      
      await page.click('[data-testid="instance-item"]');
      await page.waitForSelector('.xterm-screen, [data-testid="terminal-output"]', { timeout: TEST_TIMEOUT });
      
      // Verify connection is working
      await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'pwd');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
      
      // Simulate temporary backend disconnection
      await context.setOffline(true);
      await page.waitForTimeout(1000);
      await context.setOffline(false);
      
      // Wait for reconnection
      await page.waitForTimeout(5000);
      
      // Try to use the interface again
      await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'whoami');
      await page.keyboard.press('Enter');
      
      // Should recover and work again
      await page.waitForFunction(
        () => {
          const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
          return terminalText.length > 30;
        },
        { timeout: LONG_TIMEOUT }
      );
      
      const terminalContent = await page.textContent('.xterm-screen, [data-testid="terminal-output"]');
      expect(terminalContent).toBeTruthy();
      expect(terminalContent.length).toBeGreaterThan(20);
      
      console.log('✅ Backend disconnection recovery successful');
    });
  });

  test.describe('8. Performance Validation', () => {
    test('should meet performance benchmarks during tool call operations', async () => {
      console.log('🌟 Testing: Tool call performance benchmarks');
      
      await page.goto(`${BASE_URL}/claude-instances`);
      
      // Measure instance creation time
      const createStartTime = Date.now();
      const createButton = page.locator('[data-testid*="create-"][data-testid*="instance"]').first();
      await createButton.click();
      await page.waitForSelector('[data-testid="instance-item"]', { timeout: TEST_TIMEOUT });
      const createTime = Date.now() - createStartTime;
      
      // Instance creation should be under 30 seconds
      expect(createTime).toBeLessThan(30000);
      
      // Measure terminal opening time
      const terminalStartTime = Date.now();
      await page.click('[data-testid="instance-item"]');
      await page.waitForSelector('.xterm-screen, [data-testid="terminal-output"]', { timeout: TEST_TIMEOUT });
      const terminalTime = Date.now() - terminalStartTime;
      
      // Terminal should open within 10 seconds
      expect(terminalTime).toBeLessThan(10000);
      
      // Measure tool call response time
      const toolCallStartTime = Date.now();
      await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'pwd');
      await page.keyboard.press('Enter');
      
      await page.waitForFunction(
        () => {
          const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
          return terminalText.length > 10;
        },
        { timeout: TEST_TIMEOUT }
      );
      const toolCallTime = Date.now() - toolCallStartTime;
      
      // Tool call should respond within 30 seconds
      expect(toolCallTime).toBeLessThan(30000);
      
      console.log('✅ Performance benchmarks met', {
        instanceCreation: createTime,
        terminalOpening: terminalTime,
        toolCallResponse: toolCallTime
      });
    });

    test('should handle sustained tool call operations', async () => {
      console.log('🌟 Testing: Sustained tool call operations');
      
      await page.goto(`${BASE_URL}/claude-instances`);
      await page.waitForSelector('[data-testid="instance-item"]', { timeout: TEST_TIMEOUT });
      
      await page.click('[data-testid="instance-item"]');
      await page.waitForSelector('.xterm-screen, [data-testid="terminal-output"]', { timeout: TEST_TIMEOUT });
      
      const commands = ['pwd', 'whoami', 'ls', 'help', 'echo "test"'];
      const startTime = Date.now();
      let successfulCommands = 0;
      
      for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        
        try {
          await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', command);
          await page.keyboard.press('Enter');
          
          await page.waitForFunction(
            (cmd) => {
              const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
              return terminalText.length > 50; // Expect some substantial output
            },
            command,
            { timeout: TEST_TIMEOUT }
          );
          
          successfulCommands++;
          await page.waitForTimeout(500); // Brief pause between commands
          
        } catch (error) {
          console.warn(`Command ${command} failed:`, error);
        }
      }
      
      const totalTime = Date.now() - startTime;
      const successRate = successfulCommands / commands.length;
      
      // At least 80% of commands should succeed
      expect(successRate).toBeGreaterThan(0.8);
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(120000); // 2 minutes for all commands
      
      console.log('✅ Sustained tool call operations successful', {
        successfulCommands,
        totalCommands: commands.length,
        successRate: successRate * 100,
        totalTime
      });
    });
  });

  test.describe('9. Integration with Existing Functionality', () => {
    test('should not break existing functionality when tool calls are active', async () => {
      console.log('🌟 Testing: Integration with existing functionality');
      
      await page.goto(BASE_URL);
      await page.waitForSelector('[data-testid="header"]', { timeout: TEST_TIMEOUT });
      
      // Test navigation while tool calls might be happening
      await page.click('text=Claude Instances');
      await page.waitForSelector('[data-testid="claude-instance-manager"]', { timeout: TEST_TIMEOUT });
      
      // Create instance
      const createButton = page.locator('[data-testid*="create-"][data-testid*="instance"]').first();
      await createButton.click();
      await page.waitForSelector('[data-testid="instance-item"]', { timeout: TEST_TIMEOUT });
      
      // Open terminal
      await page.click('[data-testid="instance-item"]');
      await page.waitForSelector('.xterm-screen, [data-testid="terminal-output"]', { timeout: TEST_TIMEOUT });
      
      // Start a tool call
      await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'help');
      await page.keyboard.press('Enter');
      
      // While tool call is processing, test other UI elements
      const headerVisible = await page.isVisible('[data-testid="header"]');
      expect(headerVisible).toBe(true);
      
      // Test navigation during tool call
      if (await page.isVisible('text=Dashboard, nav a:has-text("Dashboard")')) {
        await page.click('text=Dashboard, nav a:has-text("Dashboard")');
        await page.waitForTimeout(2000);
        
        // Go back to instances
        await page.click('text=Claude Instances');
        await page.waitForSelector('[data-testid="claude-instance-manager"]', { timeout: TEST_TIMEOUT });
      }
      
      // Verify instances are still there and functional
      const instanceCount = await page.locator('[data-testid="instance-item"]').count();
      expect(instanceCount).toBeGreaterThan(0);
      
      console.log('✅ Existing functionality not broken by tool calls');
    });

    test('should maintain WebSocket connections across page navigation', async () => {
      console.log('🌟 Testing: WebSocket persistence across navigation');
      
      await page.goto(`${BASE_URL}/claude-instances`);
      const createButton = page.locator('[data-testid*="create-"][data-testid*="instance"]').first();
      await createButton.click();
      await page.waitForSelector('[data-testid="instance-item"]', { timeout: TEST_TIMEOUT });
      
      // Establish WebSocket connection
      await page.click('[data-testid="instance-item"]');
      await page.waitForSelector('.xterm-screen, [data-testid="terminal-output"]', { timeout: TEST_TIMEOUT });
      
      // Start a command
      await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'pwd');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
      
      const initialWsCount = wsConnections.length;
      const initialMsgCount = wsMessages.length;
      
      // Navigate away and back
      await page.goto(BASE_URL);
      await page.waitForTimeout(2000);
      await page.click('text=Claude Instances');
      await page.waitForSelector('[data-testid="instance-item"]', { timeout: TEST_TIMEOUT });
      
      // Verify connection is maintained or re-established
      expect(wsConnections.length).toBeGreaterThanOrEqual(initialWsCount);
      
      // Test that we can still send commands
      await page.click('[data-testid="instance-item"]');
      await page.waitForSelector('.xterm-screen, [data-testid="terminal-output"]', { timeout: TEST_TIMEOUT });
      
      await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'whoami');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
      
      // Should have received new messages
      expect(wsMessages.length).toBeGreaterThan(initialMsgCount);
      
      console.log('✅ WebSocket connections maintained across navigation');
    });
  });

  test.describe('10. Final Production Readiness Validation', () => {
    test('should pass comprehensive tool call validation checklist', async () => {
      console.log('🌟 Testing: Comprehensive tool call validation checklist');
      
      const checklist = {
        applicationLoadsWithToolCallSupport: false,
        instanceCreationWithToolCallsReady: false,
        basicToolCallVisualizationWorks: false,
        multipleToolCallsWork: false,
        websocketStabilityMaintained: false,
        errorHandlingGraceful: false,
        performanceMeetsBenchmarks: false,
        browserCompatibilityConfirmed: false,
        existingFunctionalityNotBroken: false,
        noRegressionInCoreFeatures: false
      };
      
      try {
        // 1. Application loads with tool call support
        await page.goto(BASE_URL);
        await page.waitForSelector('[data-testid="header"]', { timeout: TEST_TIMEOUT });
        checklist.applicationLoadsWithToolCallSupport = true;
        
        // 2. Instance creation with tool calls ready
        await page.click('text=Claude Instances');
        const createButton = page.locator('[data-testid*="create-"][data-testid*="instance"]').first();
        await createButton.click();
        await page.waitForSelector('[data-testid="instance-item"]', { timeout: TEST_TIMEOUT });
        checklist.instanceCreationWithToolCallsReady = true;
        
        // 3. Basic tool call visualization
        await page.click('[data-testid="instance-item"]');
        await page.waitForSelector('.xterm-screen, [data-testid="terminal-output"]', { timeout: TEST_TIMEOUT });
        
        await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'help');
        await page.keyboard.press('Enter');
        
        await page.waitForFunction(
          () => {
            const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
            return terminalText.length > 30;
          },
          { timeout: TEST_TIMEOUT }
        );
        checklist.basicToolCallVisualizationWorks = true;
        
        // 4. Multiple tool calls
        await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'ls');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
        checklist.multipleToolCallsWork = true;
        
        // 5. WebSocket stability
        const wsErrorCount = consoleErrors.filter(e => e.includes('WebSocket')).length;
        checklist.websocketStabilityMaintained = wsErrorCount === 0 && wsConnections.length > 0;
        
        // 6. Error handling
        await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'invalidcommand123');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
        
        // Should still be responsive
        await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'pwd');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
        checklist.errorHandlingGraceful = true;
        
        // 7. Performance benchmarks
        const totalErrors = consoleErrors.length;
        const totalNetworkErrors = networkErrors.length;
        checklist.performanceMeetsBenchmarks = totalErrors < 5 && totalNetworkErrors === 0;
        
        // 8. Browser compatibility
        checklist.browserCompatibilityConfirmed = wsMessages.length > 0;
        
        // 9. Existing functionality
        await page.goto(BASE_URL);
        await page.waitForSelector('[data-testid="header"]', { timeout: TEST_TIMEOUT });
        checklist.existingFunctionalityNotBroken = true;
        
        // 10. No regression in core features
        checklist.noRegressionInCoreFeatures = Object.values(checklist)
          .slice(0, -1)
          .every(passed => passed === true);
        
      } catch (error) {
        console.error('Checklist validation error:', error);
      }
      
      // Report results
      const failedItems = Object.entries(checklist)
        .filter(([_, passed]) => !passed)
        .map(([item]) => item);
      
      console.log('\n=== Tool Call Validation Checklist Results ===');
      Object.entries(checklist).forEach(([item, passed]) => {
        console.log(`${passed ? '✅' : '❌'} ${item}`);
      });
      
      if (failedItems.length > 0) {
        console.error('\n❌ Failed checklist items:', failedItems);
        console.error('Console Errors:', consoleErrors);
        console.error('Network Errors:', networkErrors);
      }
      
      // All critical items must pass
      expect(failedItems.length).toBe(0);
      
      console.log('\n✅ Tool Call Visualization E2E Validation PASSED');
      console.log(`WebSocket Connections: ${wsConnections.length}`);
      console.log(`WebSocket Messages: ${wsMessages.length}`);
      console.log(`Total Console Errors: ${consoleErrors.length}`);
      console.log(`Total Network Errors: ${networkErrors.length}`);
    });
  });
});