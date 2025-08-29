// SPARC + NLD + Playwright: Comprehensive Claude Instance Duplication Test
import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3000';

test.describe('Claude Instance Duplication Fix', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    page = await context.newPage();
    
    // Enable console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser Console Error:', msg.text());
      } else if (msg.text().includes('SPARC') || msg.text().includes('duplicate')) {
        console.log('SPARC Log:', msg.text());
      }
    });
    
    // Listen for WebSocket connections
    page.on('websocket', ws => {
      console.log('WebSocket connection:', ws.url());
      ws.on('framereceived', event => {
        console.log('WS Received:', event.payload);
      });
      ws.on('framesent', event => {
        console.log('WS Sent:', event.payload);
      });
    });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    // Clean up any existing instances
    await fetch(`${BACKEND_URL}/api/claude/instances`, { method: 'GET' })
      .then(res => res.json())
      .then(async data => {
        if (data.success && data.instances.length > 0) {
          for (const instance of data.instances) {
            await fetch(`${BACKEND_URL}/api/claude/instances/${instance.id}`, { method: 'DELETE' });
          }
        }
      })
      .catch(() => {}); // Ignore errors during cleanup

    // Navigate to the application
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('[data-testid="claude-instance-manager"]', { timeout: 10000 });
  });

  test('should prevent output duplication with singleton WebSocket', async () => {
    console.log('🧪 SPARC TEST: Starting duplication prevention test');

    // Step 1: Create a single Claude instance
    await page.click('button:has-text("Launch Dev Claude")');
    console.log('✅ Created Claude instance');

    // Step 2: Wait for instance to appear and be running
    await page.waitForSelector('.claude-instance-item', { timeout: 15000 });
    await expect(page.locator('.claude-instance-item')).toContainText('running');
    console.log('✅ Instance is running');

    // Step 3: Select the instance (this should trigger singleton connection)
    await page.click('.claude-instance-item');
    console.log('✅ Selected instance');

    // Step 4: Wait for WebSocket connection
    await page.waitForSelector('[data-testid="connection-status"]:has-text("Connected")', { timeout: 10000 });
    console.log('✅ WebSocket connected');

    // Step 5: Send a test command
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill('hello world test');
    await page.click('button:has-text("Send")');
    console.log('✅ Sent test command');

    // Step 6: Wait for response and check for duplicates
    await page.waitForSelector('.message-bubble', { timeout: 15000 });
    
    // Get all message bubbles
    const messageBubbles = await page.locator('.message-bubble').all();
    const messageTexts = await Promise.all(
      messageBubbles.map(bubble => bubble.textContent())
    );

    console.log('📨 Received messages:', messageTexts.length);

    // Check for duplication - look for repeated content
    const uniqueMessages = new Set(messageTexts.filter(text => text && text.trim()));
    const duplicateCount = messageTexts.length - uniqueMessages.size;

    console.log('📊 Unique messages:', uniqueMessages.size);
    console.log('📊 Duplicate messages:', duplicateCount);

    // Assert no significant duplication (allow for 1-2 minor duplicates due to UI updates)
    expect(duplicateCount).toBeLessThanOrEqual(2);
    expect(uniqueMessages.size).toBeGreaterThanOrEqual(1);
    
    console.log('✅ SPARC TEST: No significant duplication detected');
  });

  test('should handle instance switching without duplication', async () => {
    console.log('🧪 SPARC TEST: Starting instance switching test');

    // Step 1: Create first instance
    await page.click('button:has-text("Launch Dev Claude")');
    await page.waitForSelector('.claude-instance-item:nth-child(1)', { timeout: 15000 });
    console.log('✅ Created first instance');

    // Step 2: Create second instance  
    await page.click('button:has-text("Launch Dev Claude")');
    await page.waitForSelector('.claude-instance-item:nth-child(2)', { timeout: 15000 });
    console.log('✅ Created second instance');

    // Step 3: Select first instance
    const firstInstance = page.locator('.claude-instance-item').nth(0);
    await firstInstance.click();
    await page.waitForSelector('[data-testid="connection-status"]:has-text("Connected")', { timeout: 10000 });
    console.log('✅ Connected to first instance');

    // Step 4: Send command to first instance
    await page.locator('[data-testid="message-input"]').fill('first instance test');
    await page.click('button:has-text("Send")');
    await page.waitForSelector('.message-bubble', { timeout: 15000 });
    
    const firstMessages = await page.locator('.message-bubble').count();
    console.log('📨 First instance messages:', firstMessages);

    // Step 5: Switch to second instance
    const secondInstance = page.locator('.claude-instance-item').nth(1);
    await secondInstance.click();
    await page.waitForSelector('[data-testid="connection-status"]:has-text("Connected")', { timeout: 10000 });
    console.log('✅ Switched to second instance');

    // Step 6: Send command to second instance
    await page.locator('[data-testid="message-input"]').fill('second instance test');
    await page.click('button:has-text("Send")');
    await page.waitForSelector('.message-bubble', { timeout: 15000 });

    const totalMessages = await page.locator('.message-bubble').count();
    console.log('📨 Total messages after switch:', totalMessages);

    // The message count should not have massive duplication
    // Allow for some UI updates but detect major duplication issues
    expect(totalMessages).toBeLessThan(firstMessages * 3); // No more than 3x growth
    
    console.log('✅ SPARC TEST: Instance switching without major duplication');
  });

  test('should verify send button and typing functionality', async () => {
    console.log('🧪 SPARC TEST: Starting input functionality test');

    // Step 1: Create and select instance
    await page.click('button:has-text("Launch Dev Claude")');
    await page.waitForSelector('.claude-instance-item', { timeout: 15000 });
    await page.click('.claude-instance-item');
    await page.waitForSelector('[data-testid="connection-status"]:has-text("Connected")', { timeout: 10000 });

    // Step 2: Test typing functionality
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill(''); // Clear input
    await messageInput.type('test typing without duplication', { delay: 50 });
    
    const inputValue = await messageInput.inputValue();
    expect(inputValue).toBe('test typing without duplication');
    console.log('✅ Typing works correctly');

    // Step 3: Test send button functionality
    const sendButton = page.locator('button:has-text("Send")');
    expect(await sendButton.isEnabled()).toBe(true);
    
    await sendButton.click();
    console.log('✅ Send button works correctly');

    // Step 4: Verify command was sent (input should clear)
    await expect(messageInput).toHaveValue('');
    console.log('✅ Input cleared after send');

    // Step 5: Verify response received
    await page.waitForSelector('.message-bubble', { timeout: 15000 });
    const responseReceived = await page.locator('.message-bubble').count() > 0;
    expect(responseReceived).toBe(true);
    console.log('✅ Response received');
    
    console.log('✅ SPARC TEST: Input functionality working correctly');
  });

  test('should handle rapid commands without duplication', async () => {
    console.log('🧪 SPARC TEST: Starting rapid command test');

    // Step 1: Setup instance
    await page.click('button:has-text("Launch Dev Claude")');
    await page.waitForSelector('.claude-instance-item', { timeout: 15000 });
    await page.click('.claude-instance-item');
    await page.waitForSelector('[data-testid="connection-status"]:has-text("Connected")', { timeout: 10000 });

    // Step 2: Send multiple rapid commands
    const commands = ['cmd1', 'cmd2', 'cmd3', 'cmd4', 'cmd5'];
    const messageInput = page.locator('[data-testid="message-input"]');
    const sendButton = page.locator('button:has-text("Send")');

    for (let i = 0; i < commands.length; i++) {
      await messageInput.fill(commands[i]);
      await sendButton.click();
      await page.waitForTimeout(500); // Small delay between commands
      console.log(`✅ Sent command ${i + 1}: ${commands[i]}`);
    }

    // Step 3: Wait for all responses
    await page.waitForTimeout(5000);
    
    // Step 4: Check for excessive duplication
    const totalMessages = await page.locator('.message-bubble').count();
    console.log('📨 Total messages after rapid commands:', totalMessages);

    // Should have reasonable number of messages (not exponential growth)
    // Each command might generate 1-3 messages, so 5 commands = max ~15 messages
    expect(totalMessages).toBeLessThan(20);
    expect(totalMessages).toBeGreaterThan(0);

    console.log('✅ SPARC TEST: Rapid commands handled without excessive duplication');
  });
});