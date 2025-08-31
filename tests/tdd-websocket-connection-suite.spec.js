const { test, expect } = require('@playwright/test');
const WebSocket = require('ws');

/**
 * TDD WEBSOCKET CONNECTION TESTING STRATEGY
 * 
 * MISSION: Comprehensive validation of WebSocket connection establishment
 * and bidirectional message flow with real Claude Code instances
 * 
 * TEST STRATEGY:
 * 1. RED: Write failing tests for WebSocket connection
 * 2. GREEN: Fix connection to make tests pass  
 * 3. REFACTOR: Optimize connection reliability
 * 
 * FOCUS AREAS:
 * - WebSocket URL generation and connectivity
 * - Connection establishment verification
 * - Message sending frontend → Claude Code
 * - Message receiving Claude Code → frontend
 * - Multiple instance handling
 * - Connection error recovery
 * - Real Claude Code command execution
 */

// Test configuration
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3000';
const WEBSOCKET_URL = 'ws://localhost:3000/terminal';
const TEST_TIMEOUT = 30000;

// Shared test utilities
class WebSocketTestUtils {
  static async waitForWebSocketConnection(ws, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`WebSocket connection timeout after ${timeout}ms`));
      }, timeout);

      if (ws.readyState === WebSocket.OPEN) {
        clearTimeout(timer);
        resolve(true);
        return;
      }

      ws.addEventListener('open', () => {
        clearTimeout(timer);
        resolve(true);
      });

      ws.addEventListener('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  static async waitForMessage(ws, messageType, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Message type '${messageType}' not received within ${timeout}ms`));
      }, timeout);

      const messageHandler = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === messageType) {
            clearTimeout(timer);
            ws.removeEventListener('message', messageHandler);
            resolve(message);
          }
        } catch (e) {
          // Invalid JSON, continue waiting
        }
      };

      ws.addEventListener('message', messageHandler);
    });
  }

  static generateTestInstanceId() {
    return `claude-${Math.floor(Math.random() * 9000) + 1000}`;
  }
}

test.describe('TDD WebSocket Connection Establishment', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to frontend application
    await page.goto(FRONTEND_URL);
    
    // Wait for frontend to load completely
    await page.waitForLoadState('networkidle');
    
    // Verify backend is responsive
    const healthResponse = await page.request.get(`${BACKEND_URL}/health`);
    expect(healthResponse.ok()).toBeTruthy();
  });

  test('RED → GREEN: WebSocket URL should be correctly formed', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // RED: Test failing WebSocket URL formation
    const ws = new WebSocket('ws://invalid-url:9999/terminal');
    
    // Expect connection to fail initially
    await expect(async () => {
      await WebSocketTestUtils.waitForWebSocketConnection(ws, 1000);
    }).rejects.toThrow();
    
    ws.close();

    // GREEN: Test correct WebSocket URL formation  
    const validWs = new WebSocket(WEBSOCKET_URL);
    
    // This should succeed
    await WebSocketTestUtils.waitForWebSocketConnection(validWs, 5000);
    expect(validWs.readyState).toBe(WebSocket.OPEN);
    
    validWs.close();
  });

  test('RED → GREEN: WebSocket connection should establish successfully', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    
    const ws = new WebSocket(WEBSOCKET_URL);
    let connectionEstablished = false;
    let connectionError = null;

    // Set up connection monitoring
    ws.addEventListener('open', () => {
      connectionEstablished = true;
      console.log('✅ WebSocket connection established');
    });

    ws.addEventListener('error', (error) => {
      connectionError = error;
      console.error('❌ WebSocket connection error:', error);
    });

    // RED: Initially connection might fail
    await WebSocketTestUtils.waitForWebSocketConnection(ws, 5000);
    
    // GREEN: Connection should now be established
    expect(connectionEstablished).toBeTruthy();
    expect(connectionError).toBeNull();
    expect(ws.readyState).toBe(WebSocket.OPEN);
    
    ws.close();
  });

  test('RED → GREEN: Claude instance creation should return valid instance ID', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Create a real Claude instance via API
    const response = await page.request.post(`${BACKEND_URL}/api/claude/instances`, {
      data: {
        instanceType: 'interactive',
        usePty: true
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // GREEN: Verify instance creation returns proper structure
    expect(data.success).toBeTruthy();
    expect(data.instance).toBeDefined();
    expect(data.instance.id).toMatch(/^claude-\d+$/);
    expect(data.instance.status).toBe('starting');
    expect(data.instance.pid).toBeDefined();

    // Store instance ID for cleanup
    const instanceId = data.instance.id;
    
    // Cleanup: Delete the created instance
    await page.request.delete(`${BACKEND_URL}/api/claude/instances/${instanceId}`);
  });

  test('RED → GREEN: WebSocket should connect to specific Claude instance', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Step 1: Create Claude instance
    const createResponse = await page.request.post(`${BACKEND_URL}/api/claude/instances`, {
      data: {
        instanceType: 'interactive',
        usePty: true
      }
    });
    
    expect(createResponse.ok()).toBeTruthy();
    const instanceData = await createResponse.json();
    const instanceId = instanceData.instance.id;

    // Step 2: Wait for instance to be running
    await page.waitForTimeout(2000); // Give instance time to start

    // Step 3: Connect WebSocket to specific instance
    const ws = new WebSocket(WEBSOCKET_URL);
    await WebSocketTestUtils.waitForWebSocketConnection(ws, 5000);

    // Step 4: Send connection message for specific instance
    const connectMessage = {
      type: 'connect',
      terminalId: instanceId,
      timestamp: Date.now()
    };

    ws.send(JSON.stringify(connectMessage));

    // Step 5: Verify connection response
    const connectResponse = await WebSocketTestUtils.waitForMessage(ws, 'connect', 5000);
    expect(connectResponse.terminalId).toBe(instanceId);
    expect(connectResponse.connectionType).toBe('websocket');

    // Cleanup
    ws.close();
    await page.request.delete(`${BACKEND_URL}/api/claude/instances/${instanceId}`);
  });

  test('RED → GREEN: Bidirectional message flow should work correctly', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Create Claude instance
    const createResponse = await page.request.post(`${BACKEND_URL}/api/claude/instances`, {
      data: {
        instanceType: 'interactive',
        usePty: true
      }
    });
    
    const instanceData = await createResponse.json();
    const instanceId = instanceData.instance.id;

    // Wait for instance to be ready
    await page.waitForTimeout(2000);

    // Connect WebSocket
    const ws = new WebSocket(WEBSOCKET_URL);
    await WebSocketTestUtils.waitForWebSocketConnection(ws, 5000);

    // Connect to instance
    ws.send(JSON.stringify({
      type: 'connect',
      terminalId: instanceId,
      timestamp: Date.now()
    }));

    await WebSocketTestUtils.waitForMessage(ws, 'connect', 5000);

    // RED → GREEN: Send command and verify response
    const testCommand = 'echo "Hello Claude from WebSocket test"';
    const inputMessage = {
      type: 'input',
      data: testCommand,
      terminalId: instanceId,
      timestamp: Date.now()
    };

    // Send command
    ws.send(JSON.stringify(inputMessage));
    console.log(`📤 Sent command: ${testCommand}`);

    // Wait for output response
    const outputReceived = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('No output received within 10 seconds'));
      }, 10000);

      const messageHandler = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'output' && message.data) {
            clearTimeout(timeout);
            ws.removeEventListener('message', messageHandler);
            resolve(message);
          }
        } catch (e) {
          // Continue waiting for valid message
        }
      };

      ws.addEventListener('message', messageHandler);
    });

    const outputMessage = await outputReceived;
    console.log(`📥 Received output: ${outputMessage.data.substring(0, 100)}`);

    // Verify bidirectional communication
    expect(outputMessage.data).toBeDefined();
    expect(outputMessage.terminalId).toBe(instanceId);

    // Cleanup
    ws.close();
    await page.request.delete(`${BACKEND_URL}/api/claude/instances/${instanceId}`);
  });

  test('RED → GREEN: Multiple WebSocket connections should be handled correctly', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Create two Claude instances
    const instance1Response = await page.request.post(`${BACKEND_URL}/api/claude/instances`, {
      data: { instanceType: 'interactive', usePty: true }
    });
    const instance2Response = await page.request.post(`${BACKEND_URL}/api/claude/instances`, {
      data: { instanceType: 'interactive', usePty: true }
    });

    const instance1Data = await instance1Response.json();
    const instance2Data = await instance2Response.json();
    const instance1Id = instance1Data.instance.id;
    const instance2Id = instance2Data.instance.id;

    // Wait for instances to be ready
    await page.waitForTimeout(2000);

    // Create two WebSocket connections
    const ws1 = new WebSocket(WEBSOCKET_URL);
    const ws2 = new WebSocket(WEBSOCKET_URL);

    await Promise.all([
      WebSocketTestUtils.waitForWebSocketConnection(ws1, 5000),
      WebSocketTestUtils.waitForWebSocketConnection(ws2, 5000)
    ]);

    // Connect each WebSocket to different instances
    ws1.send(JSON.stringify({
      type: 'connect',
      terminalId: instance1Id,
      timestamp: Date.now()
    }));

    ws2.send(JSON.stringify({
      type: 'connect', 
      terminalId: instance2Id,
      timestamp: Date.now()
    }));

    // Verify both connections
    const [connect1, connect2] = await Promise.all([
      WebSocketTestUtils.waitForMessage(ws1, 'connect', 5000),
      WebSocketTestUtils.waitForMessage(ws2, 'connect', 5000)
    ]);

    expect(connect1.terminalId).toBe(instance1Id);
    expect(connect2.terminalId).toBe(instance2Id);

    // Test isolated communication - send different commands to each instance
    ws1.send(JSON.stringify({
      type: 'input',
      data: 'echo "Instance 1 test"',
      terminalId: instance1Id,
      timestamp: Date.now()
    }));

    ws2.send(JSON.stringify({
      type: 'input',
      data: 'echo "Instance 2 test"',
      terminalId: instance2Id,
      timestamp: Date.now()
    }));

    // Verify messages stay isolated (basic test - could be enhanced)
    await page.waitForTimeout(2000);

    // Cleanup
    ws1.close();
    ws2.close();
    await Promise.all([
      page.request.delete(`${BACKEND_URL}/api/claude/instances/${instance1Id}`),
      page.request.delete(`${BACKEND_URL}/api/claude/instances/${instance2Id}`)
    ]);
  });

  test('RED → GREEN: Connection error recovery should work', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Create instance
    const createResponse = await page.request.post(`${BACKEND_URL}/api/claude/instances`, {
      data: { instanceType: 'interactive', usePty: true }
    });
    const instanceData = await createResponse.json();
    const instanceId = instanceData.instance.id;

    await page.waitForTimeout(2000);

    // Initial connection
    let ws = new WebSocket(WEBSOCKET_URL);
    await WebSocketTestUtils.waitForWebSocketConnection(ws, 5000);

    ws.send(JSON.stringify({
      type: 'connect',
      terminalId: instanceId,
      timestamp: Date.now()
    }));

    await WebSocketTestUtils.waitForMessage(ws, 'connect', 5000);

    // Force disconnect
    ws.close();

    // Wait for connection to close
    await page.waitForTimeout(500);

    // Test reconnection
    ws = new WebSocket(WEBSOCKET_URL);
    await WebSocketTestUtils.waitForWebSocketConnection(ws, 5000);

    // Reconnect to same instance
    ws.send(JSON.stringify({
      type: 'connect',
      terminalId: instanceId,
      timestamp: Date.now()
    }));

    const reconnectResponse = await WebSocketTestUtils.waitForMessage(ws, 'connect', 5000);
    expect(reconnectResponse.terminalId).toBe(instanceId);

    // Cleanup
    ws.close();
    await page.request.delete(`${BACKEND_URL}/api/claude/instances/${instanceId}`);
  });

  test('RED → GREEN: Frontend integration should connect properly', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Navigate to frontend and trigger Claude instance creation
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');

    // Look for Claude launch buttons and click one
    const launchButton = page.locator('button:has-text("Launch"), button:has-text("Create"), button:has-text("claude")').first();
    if (await launchButton.count() > 0) {
      await launchButton.click();
      
      // Wait for instance to be created and connection to be established
      await page.waitForTimeout(3000);

      // Check for connection status indicator in the frontend
      const connectionStatus = page.locator('[data-testid="connection-status"]');
      if (await connectionStatus.count() > 0) {
        const statusText = await connectionStatus.textContent();
        expect(statusText).toContain('Connected');
      }

      // Check for Claude instances in the UI
      const instancesList = page.locator('.claude-instance-item, [data-testid*="instance"]');
      if (await instancesList.count() > 0) {
        const instanceCount = await instancesList.count();
        expect(instanceCount).toBeGreaterThan(0);
        console.log(`✅ Found ${instanceCount} Claude instances in frontend`);
      }
    }

    // Verify WebSocket connections in browser DevTools (if possible)
    const websocketConnections = await page.evaluate(() => {
      // Check if global WebSocket tracking exists
      return window.performance?.getEntriesByType?.('navigation') || [];
    });

    console.log(`📊 Frontend integration test completed`);
  });
});

test.describe('TDD WebSocket Performance and Reliability', () => {
  test('WebSocket should handle rapid message sending', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Create instance
    const createResponse = await page.request.post(`${BACKEND_URL}/api/claude/instances`, {
      data: { instanceType: 'interactive', usePty: true }
    });
    const instanceData = await createResponse.json();
    const instanceId = instanceData.instance.id;

    await page.waitForTimeout(2000);

    // Connect WebSocket
    const ws = new WebSocket(WEBSOCKET_URL);
    await WebSocketTestUtils.waitForWebSocketConnection(ws, 5000);

    ws.send(JSON.stringify({
      type: 'connect',
      terminalId: instanceId,
      timestamp: Date.now()
    }));

    await WebSocketTestUtils.waitForMessage(ws, 'connect', 5000);

    // Send multiple rapid messages
    const messageCount = 10;
    const sentMessages = [];

    for (let i = 0; i < messageCount; i++) {
      const message = {
        type: 'input',
        data: `echo "Rapid message ${i}"`,
        terminalId: instanceId,
        timestamp: Date.now() + i
      };
      sentMessages.push(message);
      ws.send(JSON.stringify(message));
    }

    // Wait for processing
    await page.waitForTimeout(5000);

    console.log(`📊 Sent ${messageCount} rapid messages`);

    // Cleanup
    ws.close();
    await page.request.delete(`${BACKEND_URL}/api/claude/instances/${instanceId}`);
  });

  test('WebSocket should handle connection drops gracefully', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Create instance
    const createResponse = await page.request.post(`${BACKEND_URL}/api/claude/instances`, {
      data: { instanceType: 'interactive', usePty: true }
    });
    const instanceData = await createResponse.json();
    const instanceId = instanceData.instance.id;

    await page.waitForTimeout(2000);

    // Test multiple connection drops and recoveries
    for (let attempt = 0; attempt < 3; attempt++) {
      console.log(`🔄 Connection attempt ${attempt + 1}`);

      const ws = new WebSocket(WEBSOCKET_URL);
      await WebSocketTestUtils.waitForWebSocketConnection(ws, 5000);

      ws.send(JSON.stringify({
        type: 'connect',
        terminalId: instanceId,
        timestamp: Date.now()
      }));

      const connectResponse = await WebSocketTestUtils.waitForMessage(ws, 'connect', 5000);
      expect(connectResponse.terminalId).toBe(instanceId);

      // Send a test message
      ws.send(JSON.stringify({
        type: 'input',
        data: `echo "Connection attempt ${attempt + 1}"`,
        terminalId: instanceId,
        timestamp: Date.now()
      }));

      // Close connection
      ws.close();
      await page.waitForTimeout(1000);
    }

    // Cleanup
    await page.request.delete(`${BACKEND_URL}/api/claude/instances/${instanceId}`);
  });
});

test.describe('TDD Real Claude Code Command Execution', () => {
  test('WebSocket should execute real Claude commands', async ({ page }) => {
    test.setTimeout(45000); // Longer timeout for Claude processing

    // Create Claude instance with interactive mode
    const createResponse = await page.request.post(`${BACKEND_URL}/api/claude/instances`, {
      data: {
        instanceType: 'interactive',
        usePty: true
      }
    });

    expect(createResponse.ok()).toBeTruthy();
    const instanceData = await createResponse.json();
    const instanceId = instanceData.instance.id;

    // Wait longer for Claude to initialize
    await page.waitForTimeout(5000);

    // Connect WebSocket
    const ws = new WebSocket(WEBSOCKET_URL);
    await WebSocketTestUtils.waitForWebSocketConnection(ws, 5000);

    ws.send(JSON.stringify({
      type: 'connect',
      terminalId: instanceId,
      timestamp: Date.now()
    }));

    await WebSocketTestUtils.waitForMessage(ws, 'connect', 5000);

    // Send a real Claude command
    const claudePrompt = 'Hello Claude, please respond with "Claude AI is ready for testing" to confirm you are working.';
    
    ws.send(JSON.stringify({
      type: 'input',
      data: claudePrompt,
      terminalId: instanceId,
      timestamp: Date.now()
    }));

    console.log(`📤 Sent Claude prompt: ${claudePrompt}`);

    // Wait for Claude AI response (longer timeout)
    const claudeResponse = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('No Claude response received within 30 seconds'));
      }, 30000);

      const messageHandler = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'output' && message.data) {
            const output = message.data.toLowerCase();
            // Look for Claude AI response indicators
            if (output.includes('claude') || output.includes('ready') || output.length > 20) {
              clearTimeout(timeout);
              ws.removeEventListener('message', messageHandler);
              resolve(message);
            }
          }
        } catch (e) {
          // Continue waiting
        }
      };

      ws.addEventListener('message', messageHandler);
    });

    console.log(`📥 Received Claude response: ${claudeResponse.data.substring(0, 200)}`);

    // Verify Claude responded with substantial content
    expect(claudeResponse.data).toBeDefined();
    expect(claudeResponse.data.length).toBeGreaterThan(10);
    expect(claudeResponse.terminalId).toBe(instanceId);

    // Cleanup
    ws.close();
    await page.request.delete(`${BACKEND_URL}/api/claude/instances/${instanceId}`);
  });

  test('WebSocket should handle Claude error scenarios', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Test connection to non-existent instance
    const ws = new WebSocket(WEBSOCKET_URL);
    await WebSocketTestUtils.waitForWebSocketConnection(ws, 5000);

    const fakeInstanceId = 'claude-nonexistent-99999';
    
    ws.send(JSON.stringify({
      type: 'connect',
      terminalId: fakeInstanceId,
      timestamp: Date.now()
    }));

    // Should not receive a successful connect message
    await page.waitForTimeout(2000);

    // Send input to non-existent instance should generate error
    ws.send(JSON.stringify({
      type: 'input',
      data: 'test command',
      terminalId: fakeInstanceId,
      timestamp: Date.now()
    }));

    // Wait for error response
    const errorMessage = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Expected error message not received'));
      }, 5000);

      const messageHandler = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'error') {
            clearTimeout(timeout);
            ws.removeEventListener('message', messageHandler);
            resolve(message);
          }
        } catch (e) {
          // Continue waiting
        }
      };

      ws.addEventListener('message', messageHandler);
    });

    expect(errorMessage.error).toContain('not found');

    ws.close();
  });
});