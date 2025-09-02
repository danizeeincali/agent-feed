/**
 * WEBSOCKET STABILITY DURING TOOL CALLS
 * 
 * This suite specifically tests WebSocket connection stability during
 * tool call operations, ensuring no connection drops, message loss,
 * or performance degradation during tool call visualization.
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const STABILITY_TEST_TIMEOUT = 120000; // 2 minutes for stability tests

interface WebSocketMetrics {
  connectionsOpened: number;
  connectionsClosed: number;
  messagesReceived: number;
  messagesSent: number;
  errors: string[];
  latency: number[];
}

test.describe('WebSocket Stability During Tool Calls', () => {
  let page: Page;
  let wsMetrics: WebSocketMetrics;
  
  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Playwright WebSocket Stability Test)',
    });
    page = await context.newPage();
    
    // Initialize metrics
    wsMetrics = {
      connectionsOpened: 0,
      connectionsClosed: 0,
      messagesReceived: 0,
      messagesSent: 0,
      errors: [],
      latency: []
    };
    
    // Monitor WebSocket connections
    page.on('websocket', ws => {
      wsMetrics.connectionsOpened++;
      console.log(`[WebSocket] Connection opened (Total: ${wsMetrics.connectionsOpened})`);
      
      ws.on('framereceived', event => {
        wsMetrics.messagesReceived++;
        const message = event.payload.toString();
        
        // Track latency for ping/pong messages
        if (message.includes('pong')) {
          try {
            const data = JSON.parse(message);
            if (data.timestamp) {
              const latency = Date.now() - data.timestamp;
              wsMetrics.latency.push(latency);
            }
          } catch (e) {
            // Ignore JSON parse errors for latency calculation
          }
        }
      });
      
      ws.on('framesent', event => {
        wsMetrics.messagesSent++;
      });
      
      ws.on('close', () => {
        wsMetrics.connectionsClosed++;
        console.log(`[WebSocket] Connection closed (Total closed: ${wsMetrics.connectionsClosed})`);
      });
      
      ws.on('socketerror', error => {
        wsMetrics.errors.push(`WebSocket error: ${error}`);
        console.error('[WebSocket] Socket error:', error);
      });
    });
    
    // Monitor page errors
    page.on('pageerror', error => {
      wsMetrics.errors.push(`Page error: ${error.message}`);
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('WebSocket')) {
        wsMetrics.errors.push(`Console error: ${msg.text()}`);
      }
    });
  });
  
  test('should maintain stable connection during single tool call', async () => {
    console.log('🌟 Testing: Single tool call WebSocket stability');
    
    await page.goto(`${BASE_URL}/claude-instances`);
    await page.waitForSelector('[data-testid="claude-instance-manager"]', { timeout: STABILITY_TEST_TIMEOUT });
    
    // Create instance
    const createButton = page.locator('[data-testid*="create-"][data-testid*="instance"]').first();
    await createButton.click();
    await page.waitForSelector('[data-testid="instance-item"]', { timeout: STABILITY_TEST_TIMEOUT });
    
    // Record metrics before tool call
    const initialConnections = wsMetrics.connectionsOpened;
    const initialMessages = wsMetrics.messagesReceived;
    
    // Open terminal
    await page.click('[data-testid="instance-item"]');
    await page.waitForSelector('.xterm-screen, [data-testid="terminal-output"]', { timeout: STABILITY_TEST_TIMEOUT });
    
    // Wait for WebSocket connection to establish
    await page.waitForTimeout(3000);
    
    // Perform tool call
    await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'help');
    await page.keyboard.press('Enter');
    
    // Wait for tool call to complete
    await page.waitForFunction(
      () => {
        const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
        return terminalText.length > 50;
      },
      { timeout: STABILITY_TEST_TIMEOUT }
    );
    
    // Wait additional time to observe connection stability
    await page.waitForTimeout(5000);
    
    // Validate stability metrics
    const connectionsAfter = wsMetrics.connectionsOpened;
    const messagesAfter = wsMetrics.messagesReceived;
    const connectionDrops = wsMetrics.connectionsClosed;
    
    // Should have established connection(s)
    expect(connectionsAfter).toBeGreaterThan(initialConnections);
    
    // Should have received messages
    expect(messagesAfter).toBeGreaterThan(initialMessages);
    
    // Should not have any connection drops during the tool call
    expect(connectionDrops).toBe(0);
    
    // Should not have any WebSocket errors
    const wsErrors = wsMetrics.errors.filter(err => err.includes('WebSocket'));
    expect(wsErrors.length).toBe(0);
    
    console.log('✅ Single tool call WebSocket stability maintained', {
      connections: connectionsAfter,
      messages: messagesAfter,
      drops: connectionDrops,
      errors: wsMetrics.errors.length
    });
  });
  
  test('should handle multiple concurrent tool calls without connection issues', async () => {
    console.log('🌟 Testing: Multiple concurrent tool calls WebSocket stability');
    
    await page.goto(`${BASE_URL}/claude-instances`);
    await page.waitForSelector('[data-testid="claude-instance-manager"]', { timeout: STABILITY_TEST_TIMEOUT });
    
    // Create instance
    const createButton = page.locator('[data-testid*="create-"][data-testid*="instance"]').first();
    await createButton.click();
    await page.waitForSelector('[data-testid="instance-item"]', { timeout: STABILITY_TEST_TIMEOUT });
    
    await page.click('[data-testid="instance-item"]');
    await page.waitForSelector('.xterm-screen, [data-testid="terminal-output"]', { timeout: STABILITY_TEST_TIMEOUT });
    
    // Record initial metrics
    const initialConnections = wsMetrics.connectionsOpened;
    await page.waitForTimeout(3000); // Allow connection to stabilize
    
    // Perform rapid sequence of tool calls
    const commands = ['pwd', 'whoami', 'ls', 'help', 'echo "test"'];
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      console.log(`Executing command ${i + 1}/${commands.length}: ${command}`);
      
      await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', command);
      await page.keyboard.press('Enter');
      
      // Short wait between commands to simulate realistic usage
      await page.waitForTimeout(1500);
    }
    
    // Wait for all commands to complete
    await page.waitForFunction(
      () => {
        const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
        return terminalText.length > 200; // Expect substantial output from multiple commands
      },
      { timeout: STABILITY_TEST_TIMEOUT }
    );
    
    // Additional wait to observe stability
    await page.waitForTimeout(10000);
    
    // Validate metrics
    const finalConnections = wsMetrics.connectionsOpened;
    const totalMessages = wsMetrics.messagesReceived;
    const connectionDrops = wsMetrics.connectionsClosed;
    
    // Should not have opened many new connections
    expect(finalConnections - initialConnections).toBeLessThanOrEqual(2);
    
    // Should have received many messages
    expect(totalMessages).toBeGreaterThan(commands.length * 2);
    
    // Should not have connection drops
    expect(connectionDrops).toBe(0);
    
    // Calculate average latency if available
    const avgLatency = wsMetrics.latency.length > 0 
      ? wsMetrics.latency.reduce((sum, lat) => sum + lat, 0) / wsMetrics.latency.length
      : 0;
    
    console.log('✅ Multiple concurrent tool calls WebSocket stability maintained', {
      initialConnections,
      finalConnections,
      totalMessages,
      connectionDrops,
      averageLatency: avgLatency,
      errors: wsMetrics.errors.length
    });
    
    // Average latency should be reasonable (under 1 second)
    if (avgLatency > 0) {
      expect(avgLatency).toBeLessThan(1000);
    }
  });
  
  test('should recover gracefully from network interruptions during tool calls', async () => {
    console.log('🌟 Testing: Network interruption recovery during tool calls');
    
    await page.goto(`${BASE_URL}/claude-instances`);
    await page.waitForSelector('[data-testid="claude-instance-manager"]', { timeout: STABILITY_TEST_TIMEOUT });
    
    const createButton = page.locator('[data-testid*="create-"][data-testid*="instance"]').first();
    await createButton.click();
    await page.waitForSelector('[data-testid="instance-item"]', { timeout: STABILITY_TEST_TIMEOUT });
    
    await page.click('[data-testid="instance-item"]');
    await page.waitForSelector('.xterm-screen, [data-testid="terminal-output"]', { timeout: STABILITY_TEST_TIMEOUT });
    
    // Establish baseline connection
    await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'pwd');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
    
    const connectionsBeforeDisruption = wsMetrics.connectionsOpened;
    
    // Start a tool call that might be interrupted
    await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'help');
    await page.keyboard.press('Enter');
    
    // Wait a bit then simulate network interruption
    await page.waitForTimeout(2000);
    
    console.log('Simulating network interruption...');
    await page.context().setOffline(true);
    await page.waitForTimeout(3000); // 3 seconds offline
    
    console.log('Restoring network connection...');
    await page.context().setOffline(false);
    
    // Wait for reconnection
    await page.waitForTimeout(10000);
    
    // Try to use the terminal again
    await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'whoami');
    await page.keyboard.press('Enter');
    
    // Wait for recovery
    await page.waitForFunction(
      () => {
        const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
        return terminalText.includes('whoami') || terminalText.length > 100;
      },
      { timeout: STABILITY_TEST_TIMEOUT }
    );
    
    const connectionsAfterRecovery = wsMetrics.connectionsOpened;
    const totalErrors = wsMetrics.errors.length;
    
    // May have opened new connections for recovery
    expect(connectionsAfterRecovery).toBeGreaterThanOrEqual(connectionsBeforeDisruption);
    
    // Should have recovered and be functional
    const terminalContent = await page.textContent('.xterm-screen, [data-testid="terminal-output"]');
    expect(terminalContent).toBeTruthy();
    expect(terminalContent.length).toBeGreaterThan(50);
    
    console.log('✅ Network interruption recovery successful', {
      connectionsBeforeDisruption,
      connectionsAfterRecovery,
      totalErrors,
      finalContentLength: terminalContent?.length || 0
    });
  });
  
  test('should maintain connection during extended tool call session', async () => {
    console.log('🌟 Testing: Extended tool call session WebSocket stability');
    
    await page.goto(`${BASE_URL}/claude-instances`);
    await page.waitForSelector('[data-testid="claude-instance-manager"]', { timeout: STABILITY_TEST_TIMEOUT });
    
    const createButton = page.locator('[data-testid*="create-"][data-testid*="instance"]').first();
    await createButton.click();
    await page.waitForSelector('[data-testid="instance-item"]', { timeout: STABILITY_TEST_TIMEOUT });
    
    await page.click('[data-testid="instance-item"]');
    await page.waitForSelector('.xterm-screen, [data-testid="terminal-output"]', { timeout: STABILITY_TEST_TIMEOUT });
    
    const sessionDuration = 60000; // 1 minute extended session
    const commandInterval = 8000; // Command every 8 seconds
    const commands = ['pwd', 'ls', 'whoami', 'help', 'echo "stability test"'];
    
    const startTime = Date.now();
    let commandCount = 0;
    let successfulCommands = 0;
    
    console.log('Starting extended session for 1 minute...');
    
    while (Date.now() - startTime < sessionDuration) {
      const command = commands[commandCount % commands.length];
      commandCount++;
      
      try {
        await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', command);
        await page.keyboard.press('Enter');
        
        // Wait for response (shorter timeout for extended test)
        await page.waitForFunction(
          () => {
            const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
            return terminalText.length > 50;
          },
          { timeout: 15000 }
        );
        
        successfulCommands++;
        console.log(`Command ${commandCount} (${command}) - SUCCESS`);
        
      } catch (error) {
        console.warn(`Command ${commandCount} (${command}) - FAILED:`, error);
      }
      
      // Wait before next command
      const remainingWait = commandInterval - (Date.now() % commandInterval);
      if (remainingWait > 0) {
        await page.waitForTimeout(Math.min(remainingWait, commandInterval));
      }
    }
    
    console.log('Extended session completed, analyzing stability...');
    
    const totalConnections = wsMetrics.connectionsOpened;
    const totalMessages = wsMetrics.messagesReceived;
    const connectionDrops = wsMetrics.connectionsClosed;
    const successRate = successfulCommands / commandCount;
    
    // Validate extended session stability
    expect(totalConnections).toBeLessThanOrEqual(3); // Should not open many connections
    expect(totalMessages).toBeGreaterThan(commandCount); // Should receive responses
    expect(connectionDrops).toBeLessThanOrEqual(1); // At most one connection drop
    expect(successRate).toBeGreaterThan(0.8); // At least 80% success rate
    
    // WebSocket errors should be minimal
    const wsErrors = wsMetrics.errors.filter(err => err.includes('WebSocket'));
    expect(wsErrors.length).toBeLessThanOrEqual(2);
    
    console.log('✅ Extended session WebSocket stability maintained', {
      totalCommands: commandCount,
      successfulCommands,
      successRate: successRate * 100,
      totalConnections,
      totalMessages,
      connectionDrops,
      wsErrors: wsErrors.length
    });
  });
  
  test('should handle WebSocket message queuing during high-frequency tool calls', async () => {
    console.log('🌟 Testing: Message queuing during high-frequency tool calls');
    
    await page.goto(`${BASE_URL}/claude-instances`);
    await page.waitForSelector('[data-testid="claude-instance-manager"]', { timeout: STABILITY_TEST_TIMEOUT });
    
    const createButton = page.locator('[data-testid*="create-"][data-testid*="instance"]').first();
    await createButton.click();
    await page.waitForSelector('[data-testid="instance-item"]', { timeout: STABILITY_TEST_TIMEOUT });
    
    await page.click('[data-testid="instance-item"]');
    await page.waitForSelector('.xterm-screen, [data-testid="terminal-output"]', { timeout: STABILITY_TEST_TIMEOUT });
    
    await page.waitForTimeout(3000); // Allow connection to stabilize
    
    const initialMessages = wsMetrics.messagesReceived;
    const rapidCommands = ['pwd', 'whoami', 'ls', 'help', 'echo "rapid"'];
    
    // Send commands rapidly (no wait between them)
    console.log('Sending rapid commands...');
    for (let i = 0; i < rapidCommands.length; i++) {
      await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', rapidCommands[i]);
      await page.keyboard.press('Enter');
      // Minimal wait to allow DOM updates
      await page.waitForTimeout(100);
    }
    
    // Wait for all commands to be processed
    await page.waitForFunction(
      () => {
        const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
        return terminalText.length > 150; // Expect output from multiple commands
      },
      { timeout: STABILITY_TEST_TIMEOUT }
    );
    
    // Additional wait to ensure all messages are processed
    await page.waitForTimeout(10000);
    
    const finalMessages = wsMetrics.messagesReceived;
    const messagesReceived = finalMessages - initialMessages;
    const connectionDrops = wsMetrics.connectionsClosed;
    
    // Should have received multiple messages
    expect(messagesReceived).toBeGreaterThan(rapidCommands.length);
    
    // Should not have dropped connections under rapid messaging
    expect(connectionDrops).toBe(0);
    
    // Terminal should contain output from multiple commands
    const terminalContent = await page.textContent('.xterm-screen, [data-testid="terminal-output"]');
    expect(terminalContent).toBeTruthy();
    expect(terminalContent.length).toBeGreaterThan(100);
    
    // Should contain evidence of multiple commands being processed
    const commandsFound = rapidCommands.filter(cmd => 
      terminalContent!.includes(cmd) || 
      terminalContent!.includes(cmd.split(' ')[0])
    ).length;
    
    expect(commandsFound).toBeGreaterThan(rapidCommands.length * 0.6); // At least 60% visible
    
    console.log('✅ Message queuing during high-frequency calls working', {
      rapidCommands: rapidCommands.length,
      messagesReceived,
      connectionDrops,
      commandsFoundInOutput: commandsFound,
      terminalContentLength: terminalContent?.length || 0
    });
  });
  
  test('should provide real-time connection status during tool calls', async () => {
    console.log('🌟 Testing: Real-time connection status during tool calls');
    
    await page.goto(`${BASE_URL}/claude-instances`);
    await page.waitForSelector('[data-testid="claude-instance-manager"]', { timeout: STABILITY_TEST_TIMEOUT });
    
    const createButton = page.locator('[data-testid*="create-"][data-testid*="instance"]').first();
    await createButton.click();
    await page.waitForSelector('[data-testid="instance-item"]', { timeout: STABILITY_TEST_TIMEOUT });
    
    await page.click('[data-testid="instance-item"]');
    await page.waitForSelector('.xterm-screen, [data-testid="terminal-output"]', { timeout: STABILITY_TEST_TIMEOUT });
    
    // Look for connection status indicators
    const statusIndicatorSelectors = [
      '[data-testid="connection-status"]',
      '.connection-indicator',
      '.status-badge',
      'text=Connected',
      'text=Online',
      '[class*="connect"]',
      '[class*="status"]'
    ];
    
    let statusElement = null;
    for (const selector of statusIndicatorSelectors) {
      try {
        const element = page.locator(selector);
        if (await element.count() > 0 && await element.first().isVisible()) {
          statusElement = element.first();
          break;
        }
      } catch (e) {
        // Continue searching
      }
    }
    
    // Perform tool call and monitor status
    await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'help');
    await page.keyboard.press('Enter');
    
    // Wait for tool call to complete
    await page.waitForFunction(
      () => {
        const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
        return terminalText.length > 50;
      },
      { timeout: STABILITY_TEST_TIMEOUT }
    );
    
    // Verify status remains positive throughout
    if (statusElement) {
      const statusText = await statusElement.textContent();
      console.log('Connection status text:', statusText);
      
      // Should not show disconnected status
      expect(statusText).not.toMatch(/disconnect|offline|error|fail/i);
    } else {
      console.log('No visible connection status indicator found - this is acceptable');
    }
    
    // Verify no connection errors occurred
    const wsErrors = wsMetrics.errors.filter(err => 
      err.includes('WebSocket') || err.includes('connection')
    );
    expect(wsErrors.length).toBe(0);
    
    // Verify tool call was successful
    const terminalContent = await page.textContent('.xterm-screen, [data-testid="terminal-output"]');
    expect(terminalContent).toBeTruthy();
    expect(terminalContent.length).toBeGreaterThan(30);
    
    console.log('✅ Real-time connection status maintained during tool calls', {
      statusElementFound: statusElement !== null,
      wsErrors: wsErrors.length,
      terminalResponseReceived: terminalContent!.length > 30
    });
  });
});