import { test, expect, Page } from '@playwright/test';

class WebSocketMonitor {
  private connections: Set<any> = new Set();
  private messages: any[] = [];
  private errors: any[] = [];

  constructor(private page: Page) {
    this.setupMonitoring();
  }

  private setupMonitoring() {
    this.page.on('websocket', (ws) => {
      console.log('🔌 WebSocket connection established:', ws.url());
      this.connections.add(ws);

      ws.on('framesent', (data) => {
        console.log('📤 WebSocket sent:', data.payload);
        this.messages.push({ type: 'sent', payload: data.payload, timestamp: Date.now() });
      });

      ws.on('framereceived', (data) => {
        console.log('📥 WebSocket received:', data.payload);
        this.messages.push({ type: 'received', payload: data.payload, timestamp: Date.now() });
      });

      ws.on('close', () => {
        console.log('❌ WebSocket connection closed');
        this.connections.delete(ws);
      });

      ws.on('socketerror', (error) => {
        console.error('🚨 WebSocket error:', error);
        this.errors.push({ error, timestamp: Date.now() });
      });
    });
  }

  getActiveConnections() {
    return this.connections.size;
  }

  getMessages() {
    return this.messages;
  }

  getErrors() {
    return this.errors;
  }

  reset() {
    this.messages = [];
    this.errors = [];
  }
}

test.describe('Production WebSocket Validation', () => {
  let wsMonitor: WebSocketMonitor;

  test.beforeEach(async ({ page }) => {
    wsMonitor = new WebSocketMonitor(page);
    
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({
      path: 'screenshots/01-initial-page-load.png',
      fullPage: true
    });
  });

  test('Complete user workflow without connection errors - Production Instance', async ({ page }) => {
    console.log('🧪 Testing Production Instance workflow...');
    
    // Take screenshot before clicking button
    await page.screenshot({
      path: 'screenshots/02-before-production-button.png',
      fullPage: true
    });

    // Click Production Instance button
    const productionButton = page.getByRole('button', { name: /production instance/i });
    await expect(productionButton).toBeVisible();
    await productionButton.click();

    // Wait for instance creation
    await page.waitForTimeout(2000);
    
    // Take screenshot after instance creation
    await page.screenshot({
      path: 'screenshots/03-after-production-instance.png',
      fullPage: true
    });

    // Verify no connection errors
    const connectionErrors = await page.locator('text=Connection Error').count();
    expect(connectionErrors).toBe(0);

    // Verify WebSocket connection is active
    expect(wsMonitor.getActiveConnections()).toBeGreaterThan(0);
    expect(wsMonitor.getErrors()).toHaveLength(0);

    // Type command
    const commandInput = page.locator('input[type="text"], textarea').first();
    await expect(commandInput).toBeVisible({ timeout: 10000 });
    
    await commandInput.fill('what directory are you in');
    
    // Take screenshot showing typed command
    await page.screenshot({
      path: 'screenshots/04-typed-command.png',
      fullPage: true
    });

    // Send command
    await page.keyboard.press('Enter');
    
    // Wait for response
    await page.waitForTimeout(3000);
    
    // Verify response appears
    const responseContainer = page.locator('[data-testid="chat-messages"], .message-container, .response').first();
    await expect(responseContainer).toBeVisible({ timeout: 15000 });
    
    // Take screenshot showing Claude response
    await page.screenshot({
      path: 'screenshots/05-claude-response.png',
      fullPage: true
    });

    // Verify no connection errors after command
    const postCommandErrors = await page.locator('text=Connection Error').count();
    expect(postCommandErrors).toBe(0);

    // Verify WebSocket messages were exchanged
    const messages = wsMonitor.getMessages();
    expect(messages.length).toBeGreaterThan(0);
    
    console.log('✅ Production Instance workflow completed successfully');
  });

  test('All instance creation buttons validation', async ({ page }) => {
    const buttons = [
      { name: /production instance/i, screenshot: 'production' },
      { name: /interactive instance/i, screenshot: 'interactive' },
      { name: /skip permissions instance/i, screenshot: 'skip-permissions' },
      { name: /skip permissions.*interactive/i, screenshot: 'skip-permissions-interactive' }
    ];

    for (const button of buttons) {
      console.log(`🧪 Testing ${button.screenshot} button...`);
      
      // Reset WebSocket monitor
      wsMonitor.reset();
      
      // Navigate fresh for each test
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Screenshot before clicking
      await page.screenshot({
        path: `screenshots/before-${button.screenshot}-button.png`,
        fullPage: true
      });

      // Click the button
      const buttonElement = page.getByRole('button', { name: button.name });
      await expect(buttonElement).toBeVisible();
      await buttonElement.click();

      // Wait for instance creation
      await page.waitForTimeout(3000);
      
      // Screenshot after clicking
      await page.screenshot({
        path: `screenshots/after-${button.screenshot}-instance.png`,
        fullPage: true
      });

      // Verify no connection errors
      const connectionErrors = await page.locator('text=Connection Error').count();
      expect(connectionErrors).toBe(0);

      // Verify WebSocket connection
      expect(wsMonitor.getActiveConnections()).toBeGreaterThan(0);
      expect(wsMonitor.getErrors()).toHaveLength(0);

      console.log(`✅ ${button.screenshot} button validation completed`);
    }
  });

  test('Real command execution validation', async ({ page }) => {
    const commands = [
      { cmd: 'Hello', expected: 'Hello' },
      { cmd: 'What directory are you in?', expected: 'directory' },
      { cmd: 'pwd', expected: '/' },
      { cmd: 'ls', expected: 'workspaces' }
    ];

    // Set up instance first
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const productionButton = page.getByRole('button', { name: /production instance/i });
    await productionButton.click();
    await page.waitForTimeout(2000);

    // Test each command
    for (let i = 0; i < commands.length; i++) {
      const { cmd, expected } = commands[i];
      console.log(`🧪 Testing command: ${cmd}`);
      
      wsMonitor.reset();

      // Find input field
      const commandInput = page.locator('input[type="text"], textarea').first();
      await expect(commandInput).toBeVisible();
      
      // Clear and type command
      await commandInput.fill('');
      await commandInput.fill(cmd);
      
      // Screenshot with command
      await page.screenshot({
        path: `screenshots/command-${i + 1}-typed.png`,
        fullPage: true
      });

      // Send command
      await page.keyboard.press('Enter');
      
      // Wait for response
      await page.waitForTimeout(5000);
      
      // Screenshot with response
      await page.screenshot({
        path: `screenshots/command-${i + 1}-response.png`,
        fullPage: true
      });

      // Verify response contains expected content
      const responseText = await page.locator('body').textContent();
      expect(responseText).toContain(expected);

      // Verify no connection errors
      const connectionErrors = await page.locator('text=Connection Error').count();
      expect(connectionErrors).toBe(0);

      // Verify WebSocket activity
      const messages = wsMonitor.getMessages();
      expect(messages.length).toBeGreaterThan(0);

      console.log(`✅ Command "${cmd}" executed successfully`);
    }
  });

  test('Load testing - multiple instances', async ({ page, context }) => {
    console.log('🧪 Starting load testing with multiple instances...');
    
    const numberOfInstances = 3;
    const pages: Page[] = [];
    
    try {
      // Create multiple pages
      for (let i = 0; i < numberOfInstances; i++) {
        const newPage = await context.newPage();
        const monitor = new WebSocketMonitor(newPage);
        pages.push(newPage);
        
        // Navigate and create instance
        await newPage.goto('/');
        await newPage.waitForLoadState('networkidle');
        
        const button = newPage.getByRole('button', { name: /production instance/i });
        await button.click();
        await newPage.waitForTimeout(2000);
        
        // Verify instance created without errors
        const errors = await newPage.locator('text=Connection Error').count();
        expect(errors).toBe(0);
      }

      // Send commands to all instances simultaneously
      const commandPromises = pages.map(async (instancePage, index) => {
        const input = instancePage.locator('input[type="text"], textarea').first();
        await input.fill(`Hello from instance ${index + 1}`);
        await instancePage.keyboard.press('Enter');
        return instancePage.waitForTimeout(3000);
      });

      await Promise.all(commandPromises);

      // Take final screenshot
      await page.screenshot({
        path: 'screenshots/load-test-complete.png',
        fullPage: true
      });

      // Verify all instances still functioning
      for (let i = 0; i < pages.length; i++) {
        const errors = await pages[i].locator('text=Connection Error').count();
        expect(errors).toBe(0);
      }

      console.log('✅ Load testing completed successfully');
      
    } finally {
      // Cleanup
      for (const instancePage of pages) {
        await instancePage.close();
      }
    }
  });

  test.afterEach(async ({ page }) => {
    // Generate test summary
    const summary = {
      activeConnections: wsMonitor.getActiveConnections(),
      totalMessages: wsMonitor.getMessages().length,
      errors: wsMonitor.getErrors().length,
      timestamp: new Date().toISOString()
    };
    
    console.log('📊 Test Summary:', JSON.stringify(summary, null, 2));
  });
});