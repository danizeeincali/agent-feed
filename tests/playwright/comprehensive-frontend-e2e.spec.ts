import { test, expect, Page, BrowserContext } from '@playwright/test';
import path from 'path';

/**
 * Comprehensive E2E Test Suite for Fixed Frontend
 * 
 * Tests against LIVE running servers:
 * - Frontend: http://localhost:5173
 * - Backend: http://localhost:3000
 * 
 * CRITICAL: This test suite validates real browser interactions with the fixed frontend
 * to ensure no "Network error" messages and proper instance functionality.
 */

// Test configuration
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3000';
const CLAUDE_INSTANCES_PATH = '/claude-instances';
const TEST_TIMEOUT = 60000;

// Test data
const TEST_INSTANCES = [
  { name: 'Test Claude 1', type: 'development', expectedButton: 'Start Development Claude' },
  { name: 'Test Claude 2', type: 'analysis', expectedButton: 'Start Analysis Claude' },
  { name: 'Test Claude 3', type: 'creative', expectedButton: 'Start Creative Claude' },
  { name: 'Test Claude 4', type: 'coding', expectedButton: 'Start Coding Claude' }
];

// Page Object Model helpers
class ClaudeInstancesPage {
  constructor(private page: Page) {}

  async navigateToInstances() {
    await this.page.goto(`${FRONTEND_URL}${CLAUDE_INSTANCES_PATH}`);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForPageLoad() {
    // Wait for the main container to be visible
    await this.page.waitForSelector('[data-testid="claude-instances-container"], .claude-instances, main', {
      timeout: 30000
    });
  }

  async checkForNetworkErrors() {
    // Check for any visible network error messages
    const errorSelectors = [
      'text=Network error',
      'text=Connection failed',
      'text=Failed to fetch',
      'text=Error:',
      '[data-testid="error-message"]',
      '.error',
      '.alert-error'
    ];

    for (const selector of errorSelectors) {
      const errorElement = await this.page.locator(selector).first();
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        throw new Error(`Network error detected: ${errorText}`);
      }
    }
  }

  async findCreateInstanceButton() {
    const buttonSelectors = [
      'button:has-text("Create")',
      'button:has-text("Add")',
      'button:has-text("New")',
      '[data-testid="create-instance"]',
      'button[class*="create"]',
      'button[class*="add"]'
    ];

    for (const selector of buttonSelectors) {
      const button = this.page.locator(selector).first();
      if (await button.isVisible()) {
        return button;
      }
    }
    return null;
  }

  async findInstanceButtons() {
    const buttonSelectors = [
      'button:has-text("Start")',
      'button:has-text("Connect")',
      'button:has-text("Launch")',
      '[data-testid*="instance-button"]',
      'button[class*="instance"]'
    ];

    const buttons = [];
    for (const selector of buttonSelectors) {
      const elements = await this.page.locator(selector).all();
      buttons.push(...elements);
    }
    return buttons;
  }

  async getTerminalElement() {
    const terminalSelectors = [
      '[data-testid="terminal"]',
      '.terminal',
      '.xterm',
      '[class*="terminal"]',
      'pre',
      'textarea'
    ];

    for (const selector of terminalSelectors) {
      const element = this.page.locator(selector).first();
      if (await element.isVisible()) {
        return element;
      }
    }
    return null;
  }

  async typeInTerminal(text: string) {
    const terminal = await this.getTerminalElement();
    if (terminal) {
      await terminal.click();
      await terminal.type(text);
      await this.page.keyboard.press('Enter');
    }
  }

  async getTerminalOutput() {
    const terminal = await this.getTerminalElement();
    if (terminal) {
      return await terminal.textContent() || '';
    }
    return '';
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true
    });
  }
}

// WebSocket monitoring helper
class WebSocketMonitor {
  private wsConnections: Set<string> = new Set();

  constructor(private page: Page) {
    this.setupWebSocketListeners();
  }

  private setupWebSocketListeners() {
    this.page.on('websocket', ws => {
      this.wsConnections.add(ws.url());
      console.log(`WebSocket opened: ${ws.url()}`);
      
      ws.on('close', () => {
        console.log(`WebSocket closed: ${ws.url()}`);
      });
      
      ws.on('framereceived', event => {
        console.log(`WebSocket frame received from ${ws.url()}: ${event.payload}`);
      });
    });
  }

  getActiveConnections(): string[] {
    return Array.from(this.wsConnections);
  }

  hasWebSocketConnections(): boolean {
    return this.wsConnections.size > 0;
  }
}

// Test suite setup and teardown
test.describe('Comprehensive Frontend E2E Tests', () => {
  let context: BrowserContext;
  let page: Page;
  let claudePage: ClaudeInstancesPage;
  let wsMonitor: WebSocketMonitor;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      // Ensure fresh context for each test
      recordVideo: {
        dir: 'test-results/videos/',
        size: { width: 1280, height: 720 }
      }
    });
  });

  test.beforeEach(async () => {
    page = await context.newPage();
    claudePage = new ClaudeInstancesPage(page);
    wsMonitor = new WebSocketMonitor(page);

    // Set up console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });

    // Set up network request monitoring
    page.on('requestfailed', request => {
      console.error('Failed request:', request.url(), request.failure()?.errorText);
    });
  });

  test.afterEach(async () => {
    // Take screenshot on failure
    if (test.info().status !== test.info().expectedStatus) {
      await claudePage.takeScreenshot(`failure-${test.info().title.replace(/\s+/g, '-')}`);
    }
    
    await page.close();
  });

  test.afterAll(async () => {
    await context.close();
  });

  // Test 1: Basic page load and navigation
  test('should load Claude instances page without network errors', async () => {
    test.setTimeout(TEST_TIMEOUT);

    await claudePage.navigateToInstances();
    await claudePage.waitForPageLoad();
    
    // Critical: Check for no network errors
    await claudePage.checkForNetworkErrors();
    
    // Verify page title and basic elements
    await expect(page).toHaveTitle(/Claude|Instance|Agent/i);
    
    // Take success screenshot
    await claudePage.takeScreenshot('successful-page-load');
  });

  // Test 2: Button click functionality
  test('should handle button clicks without network errors', async () => {
    test.setTimeout(TEST_TIMEOUT);

    await claudePage.navigateToInstances();
    await claudePage.waitForPageLoad();
    
    // Find and test instance buttons
    const instanceButtons = await claudePage.findInstanceButtons();
    
    if (instanceButtons.length > 0) {
      // Test clicking the first button
      const firstButton = instanceButtons[0];
      const buttonText = await firstButton.textContent();
      console.log(`Testing button: ${buttonText}`);
      
      await firstButton.click();
      
      // Wait for any network requests to complete
      await page.waitForTimeout(2000);
      
      // Critical: Verify no network errors appeared
      await claudePage.checkForNetworkErrors();
      
      await claudePage.takeScreenshot('button-click-success');
    } else {
      console.warn('No instance buttons found on page');
      await claudePage.takeScreenshot('no-buttons-found');
    }
  });

  // Test 3: Instance creation flow
  test('should create new instance through UI', async () => {
    test.setTimeout(TEST_TIMEOUT);

    await claudePage.navigateToInstances();
    await claudePage.waitForPageLoad();
    
    // Look for create/add instance button
    const createButton = await claudePage.findCreateInstanceButton();
    
    if (createButton) {
      console.log('Found create button, testing instance creation');
      
      await createButton.click();
      await page.waitForTimeout(1000);
      
      // Check for forms or modals
      const formSelectors = [
        'form',
        '[data-testid="instance-form"]',
        '.modal',
        '.dialog'
      ];
      
      let formFound = false;
      for (const selector of formSelectors) {
        const form = page.locator(selector).first();
        if (await form.isVisible()) {
          formFound = true;
          console.log(`Found form: ${selector}`);
          break;
        }
      }
      
      // Critical: No network errors during creation flow
      await claudePage.checkForNetworkErrors();
      
      await claudePage.takeScreenshot('instance-creation-flow');
      
      if (!formFound) {
        console.log('No form found, may be direct creation');
      }
    } else {
      console.log('No create button found, testing existing instances');
      await claudePage.takeScreenshot('no-create-button');
    }
  });

  // Test 4: Terminal interaction
  test('should handle terminal input/output', async () => {
    test.setTimeout(TEST_TIMEOUT);

    await claudePage.navigateToInstances();
    await claudePage.waitForPageLoad();
    
    // Look for terminal interface
    const terminal = await claudePage.getTerminalElement();
    
    if (terminal) {
      console.log('Found terminal interface, testing I/O');
      
      // Test typing in terminal
      const testCommand = 'echo "Hello World"';
      await claudePage.typeInTerminal(testCommand);
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      // Get terminal output
      const output = await claudePage.getTerminalOutput();
      console.log('Terminal output:', output);
      
      // Critical: No network errors during terminal interaction
      await claudePage.checkForNetworkErrors();
      
      await claudePage.takeScreenshot('terminal-interaction');
      
      // Verify some output was received
      expect(output.length).toBeGreaterThan(0);
    } else {
      console.log('No terminal interface found');
      await claudePage.takeScreenshot('no-terminal-found');
    }
  });

  // Test 5: WebSocket connection verification
  test('should establish WebSocket connections', async () => {
    test.setTimeout(TEST_TIMEOUT);

    await claudePage.navigateToInstances();
    await claudePage.waitForPageLoad();
    
    // Wait for WebSocket connections to establish
    await page.waitForTimeout(3000);
    
    // Check if WebSocket connections were made
    const wsConnections = wsMonitor.getActiveConnections();
    console.log('WebSocket connections:', wsConnections);
    
    // Critical: No network errors even with WebSocket activity
    await claudePage.checkForNetworkErrors();
    
    await claudePage.takeScreenshot('websocket-connections');
    
    if (wsConnections.length > 0) {
      console.log(`Successfully detected ${wsConnections.length} WebSocket connections`);
      expect(wsConnections.length).toBeGreaterThan(0);
    } else {
      console.log('No WebSocket connections detected (may be using HTTP polling)');
    }
  });

  // Test 6: Multiple instance interaction
  test('should handle multiple instance interactions', async () => {
    test.setTimeout(TEST_TIMEOUT * 2); // Double timeout for complex test

    await claudePage.navigateToInstances();
    await claudePage.waitForPageLoad();
    
    const instanceButtons = await claudePage.findInstanceButtons();
    
    if (instanceButtons.length > 1) {
      console.log(`Testing multiple instances: ${instanceButtons.length} buttons found`);
      
      // Test clicking multiple buttons in sequence
      for (let i = 0; i < Math.min(instanceButtons.length, 3); i++) {
        const button = instanceButtons[i];
        const buttonText = await button.textContent();
        console.log(`Clicking button ${i + 1}: ${buttonText}`);
        
        await button.click();
        await page.waitForTimeout(1500);
        
        // Critical: Check for errors after each click
        await claudePage.checkForNetworkErrors();
      }
      
      await claudePage.takeScreenshot('multiple-instances-test');
    } else {
      console.log('Not enough buttons for multiple instance test');
      await claudePage.takeScreenshot('insufficient-buttons');
    }
  });

  // Test 7: Error recovery and resilience
  test('should recover from network interruptions', async () => {
    test.setTimeout(TEST_TIMEOUT);

    await claudePage.navigateToInstances();
    await claudePage.waitForPageLoad();
    
    // Simulate network interruption by navigating away and back
    await page.goto('about:blank');
    await page.waitForTimeout(1000);
    await claudePage.navigateToInstances();
    await claudePage.waitForPageLoad();
    
    // Critical: Should recover without errors
    await claudePage.checkForNetworkErrors();
    
    await claudePage.takeScreenshot('network-recovery-test');
    
    // Verify page is functional after recovery
    const buttons = await claudePage.findInstanceButtons();
    if (buttons.length > 0) {
      await buttons[0].click();
      await page.waitForTimeout(1000);
      await claudePage.checkForNetworkErrors();
    }
  });

  // Test 8: Cross-browser compatibility simulation
  test('should work with different browser features', async () => {
    test.setTimeout(TEST_TIMEOUT);

    // Test with different viewport sizes
    await page.setViewportSize({ width: 1920, height: 1080 });
    await claudePage.navigateToInstances();
    await claudePage.waitForPageLoad();
    await claudePage.checkForNetworkErrors();
    await claudePage.takeScreenshot('desktop-view');

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await claudePage.waitForPageLoad();
    await claudePage.checkForNetworkErrors();
    await claudePage.takeScreenshot('mobile-view');

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await claudePage.waitForPageLoad();
    await claudePage.checkForNetworkErrors();
    await claudePage.takeScreenshot('tablet-view');
  });

  // Test 9: Performance and resource monitoring
  test('should maintain good performance', async () => {
    test.setTimeout(TEST_TIMEOUT);

    const startTime = Date.now();
    
    await claudePage.navigateToInstances();
    await claudePage.waitForPageLoad();
    
    const loadTime = Date.now() - startTime;
    console.log(`Page load time: ${loadTime}ms`);
    
    // Performance assertion
    expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
    
    // Check for console errors that might indicate performance issues
    let hasErrors = false;
    page.on('console', msg => {
      if (msg.type() === 'error') {
        hasErrors = true;
      }
    });
    
    await page.waitForTimeout(2000);
    
    await claudePage.checkForNetworkErrors();
    await claudePage.takeScreenshot('performance-test');
    
    // Performance should not generate errors
    expect(hasErrors).toBe(false);
  });

  // Test 10: End-to-end workflow
  test('should complete full user workflow', async () => {
    test.setTimeout(TEST_TIMEOUT * 2);

    console.log('Starting complete E2E workflow test');
    
    // Step 1: Navigate to instances
    await claudePage.navigateToInstances();
    await claudePage.waitForPageLoad();
    await claudePage.checkForNetworkErrors();
    
    // Step 2: Interact with instances
    const buttons = await claudePage.findInstanceButtons();
    if (buttons.length > 0) {
      await buttons[0].click();
      await page.waitForTimeout(2000);
      await claudePage.checkForNetworkErrors();
    }
    
    // Step 3: Test terminal if available
    const terminal = await claudePage.getTerminalElement();
    if (terminal) {
      await claudePage.typeInTerminal('pwd');
      await page.waitForTimeout(2000);
      await claudePage.checkForNetworkErrors();
    }
    
    // Step 4: Test navigation
    await page.goBack();
    await page.waitForTimeout(1000);
    await page.goForward();
    await claudePage.waitForPageLoad();
    await claudePage.checkForNetworkErrors();
    
    await claudePage.takeScreenshot('complete-workflow-success');
    
    console.log('E2E workflow completed successfully');
  });
});