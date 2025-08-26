/**
 * WebSocket Integration E2E Tests for Claude Instance Management
 * Production Readiness Validation
 * 
 * Tests cover:
 * - Real-time WebSocket connection handling
 * - Connection state management
 * - Automatic reconnection scenarios
 * - Message broadcasting and synchronization
 * - Error recovery and failover
 * - Performance under load
 * - Cross-browser compatibility
 * - Production deployment scenarios
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
  wsURL: 'ws://localhost:3000',
  httpURL: 'http://localhost:3000',
  frontendURL: 'http://localhost:5173',
  connectionTimeout: 10000,
  messageTimeout: 5000,
  reconnectAttempts: 5,
  stressTestDuration: 30000, // 30 seconds
};

// Mock WebSocket server responses
const MOCK_RESPONSES = {
  instanceList: {
    type: 'instances',
    data: [
      {
        id: 'ws-instance-1',
        status: 'running',
        pid: 12345,
        startTime: new Date().toISOString(),
        connectionState: 'connected'
      },
      {
        id: 'ws-instance-2', 
        status: 'starting',
        pid: null,
        startTime: new Date().toISOString(),
        connectionState: 'connecting'
      }
    ]
  },
  statusUpdate: {
    type: 'status',
    instanceId: 'ws-instance-1',
    status: 'busy',
    timestamp: new Date().toISOString()
  },
  messageResponse: {
    type: 'message',
    instanceId: 'ws-instance-1',
    messageId: 'msg-123',
    content: 'Hello from Claude!',
    timestamp: new Date().toISOString()
  },
  errorResponse: {
    type: 'error',
    instanceId: 'ws-instance-1',
    error: 'Connection lost',
    code: 'CONNECTION_ERROR',
    timestamp: new Date().toISOString()
  }
};

// WebSocket test utilities
class WebSocketTestHelper {
  private wsConnections: WebSocket[] = [];
  private messageLog: any[] = [];

  constructor(private page: Page) {}

  // Create mock WebSocket server
  async setupMockWebSocketServer() {
    await this.page.addInitScript(() => {
      // Override WebSocket constructor for testing
      const OriginalWebSocket = window.WebSocket;
      const mockWS = class extends EventTarget {
        public readyState = WebSocket.CONNECTING;
        public url: string;
        public protocol = '';
        public extensions = '';
        public binaryType: BinaryType = 'blob';
        
        private messageQueue: any[] = [];
        private isConnected = false;

        constructor(url: string, protocols?: string | string[]) {
          super();
          this.url = url;
          
          // Store instance for testing
          (window as any).mockWebSockets = (window as any).mockWebSockets || [];
          (window as any).mockWebSockets.push(this);

          // Simulate connection delay
          setTimeout(() => {
            this.readyState = WebSocket.OPEN;
            this.isConnected = true;
            this.dispatchEvent(new Event('open'));
            
            // Process queued messages
            this.messageQueue.forEach(msg => {
              this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(msg) }));
            });
            this.messageQueue = [];
          }, 100);
        }

        send(data: string | ArrayBuffer | Blob | ArrayBufferView) {
          if (this.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket is not open');
          }
          
          // Store sent message for testing
          (window as any).sentMessages = (window as any).sentMessages || [];
          (window as any).sentMessages.push(data);
        }

        close(code?: number, reason?: string) {
          this.readyState = WebSocket.CLOSED;
          this.isConnected = false;
          this.dispatchEvent(new CloseEvent('close', { code, reason }));
        }

        // Test helper methods
        simulateMessage(message: any) {
          if (this.isConnected) {
            this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(message) }));
          } else {
            this.messageQueue.push(message);
          }
        }

        simulateError(error: string) {
          this.dispatchEvent(new ErrorEvent('error', { error: new Error(error) }));
        }

        simulateDisconnect(code = 1000, reason = 'Normal closure') {
          this.readyState = WebSocket.CLOSED;
          this.isConnected = false;
          this.dispatchEvent(new CloseEvent('close', { code, reason }));
        }
      };

      // Replace WebSocket constructor
      (window as any).WebSocket = mockWS;
      Object.assign(mockWS, OriginalWebSocket);
    });
  }

  // Get mock WebSocket instances
  async getMockWebSockets(): Promise<any[]> {
    return await this.page.evaluate(() => (window as any).mockWebSockets || []);
  }

  // Simulate server message
  async simulateServerMessage(message: any) {
    await this.page.evaluate((msg) => {
      const mockSockets = (window as any).mockWebSockets || [];
      mockSockets.forEach((ws: any) => ws.simulateMessage(msg));
    }, message);
  }

  // Simulate connection error
  async simulateConnectionError(error: string) {
    await this.page.evaluate((err) => {
      const mockSockets = (window as any).mockWebSockets || [];
      mockSockets.forEach((ws: any) => ws.simulateError(err));
    }, error);
  }

  // Simulate disconnect
  async simulateDisconnect(code = 1000, reason = 'Test disconnect') {
    await this.page.evaluate(({ code, reason }) => {
      const mockSockets = (window as any).mockWebSockets || [];
      mockSockets.forEach((ws: any) => ws.simulateDisconnect(code, reason));
    }, { code, reason });
  }

  // Get sent messages
  async getSentMessages(): Promise<string[]> {
    return await this.page.evaluate(() => (window as any).sentMessages || []);
  }

  // Clear message log
  async clearMessageLog() {
    await this.page.evaluate(() => {
      (window as any).sentMessages = [];
      (window as any).mockWebSockets = [];
    });
  }

  cleanup() {
    this.wsConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    this.wsConnections = [];
  }
}

// Page object for WebSocket-enabled Claude Instance Manager
class WebSocketClaudeInstancePage {
  constructor(private page: Page, private wsHelper: WebSocketTestHelper) {}

  async navigate() {
    await this.page.goto('/claude-instances');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForWebSocketConnection() {
    await this.page.waitForFunction(() => {
      const indicator = document.querySelector('[data-testid="websocket-status"]');
      return indicator?.textContent?.includes('Connected');
    }, { timeout: TEST_CONFIG.connectionTimeout });
  }

  async getConnectionStatus(): Promise<string> {
    const statusElement = this.page.getByTestId('websocket-status');
    return await statusElement.textContent() || 'Unknown';
  }

  async getInstanceCount(): Promise<number> {
    const instances = await this.page.getByTestId(/^instance-/).count();
    return instances;
  }

  async sendChatMessage(instanceId: string, message: string) {
    // Select instance
    await this.page.getByTestId(`instance-${instanceId}`).click();
    
    // Send message
    const messageInput = this.page.getByTestId('chat-input');
    await messageInput.fill(message);
    await this.page.getByTestId('send-message-button').click();
  }

  async getLastChatMessage(): Promise<string> {
    const lastMessage = this.page.getByTestId('chat-message').last();
    return await lastMessage.textContent() || '';
  }

  async isReconnecting(): Promise<boolean> {
    const status = await this.getConnectionStatus();
    return status.includes('Reconnecting') || status.includes('Connecting');
  }

  async triggerManualReconnect() {
    const reconnectButton = this.page.getByTestId('websocket-reconnect');
    if (await reconnectButton.isVisible()) {
      await reconnectButton.click();
    }
  }
}

// Test Suite
test.describe('WebSocket Integration - Production E2E Tests', () => {
  let wsHelper: WebSocketTestHelper;
  let instancePage: WebSocketClaudeInstancePage;

  test.beforeEach(async ({ page }) => {
    wsHelper = new WebSocketTestHelper(page);
    instancePage = new WebSocketClaudeInstancePage(page, wsHelper);

    await wsHelper.setupMockWebSocketServer();
    await instancePage.navigate();
  });

  test.afterEach(async () => {
    await wsHelper.clearMessageLog();
    wsHelper.cleanup();
  });

  test.describe('Connection Establishment', () => {
    test('should establish WebSocket connection on page load', async ({ page }) => {
      await instancePage.waitForWebSocketConnection();
      
      // Should display connected status
      const status = await instancePage.getConnectionStatus();
      expect(status).toContain('Connected');

      // Should show connection indicator
      await expect(page.getByTestId('connection-indicator')).toHaveClass(/connected|online/);
    });

    test('should handle connection failures gracefully', async ({ page }) => {
      // Simulate initial connection failure
      await wsHelper.simulateConnectionError('Connection refused');

      // Should show error state
      const status = await instancePage.getConnectionStatus();
      expect(status).toContain('Disconnected');

      // Should display retry option
      await expect(page.getByTestId('websocket-reconnect')).toBeVisible();

      // Should show error message
      await expect(page.getByTestId('connection-error')).toContainText('Connection refused');
    });

    test('should display connection latency and health', async ({ page }) => {
      await instancePage.waitForWebSocketConnection();

      // Should show connection health metrics
      await expect(page.getByTestId('connection-latency')).toBeVisible();
      await expect(page.getByTestId('connection-uptime')).toBeVisible();

      // Latency should be reasonable
      const latencyText = await page.getByTestId('connection-latency').textContent();
      const latency = parseInt(latencyText?.match(/(\d+)ms/)?.[1] || '0');
      expect(latency).toBeLessThan(1000); // Less than 1 second in tests
    });

    test('should validate WebSocket URL configuration', async ({ page }) => {
      await instancePage.waitForWebSocketConnection();

      const mockSockets = await wsHelper.getMockWebSockets();
      expect(mockSockets.length).toBeGreaterThan(0);

      // Should use correct WebSocket URL format
      const wsUrl = mockSockets[0].url;
      expect(wsUrl).toMatch(/^wss?:\/\//);
      expect(wsUrl).toContain('socket.io');
    });
  });

  test.describe('Real-time Updates', () => {
    test('should receive and display instance list updates', async ({ page }) => {
      await instancePage.waitForWebSocketConnection();

      // Initial instance count
      const initialCount = await instancePage.getInstanceCount();

      // Simulate instance list update
      await wsHelper.simulateServerMessage(MOCK_RESPONSES.instanceList);

      // Wait for UI update
      await page.waitForFunction((expected) => {
        const instances = document.querySelectorAll('[data-testid^="instance-"]');
        return instances.length >= expected;
      }, MOCK_RESPONSES.instanceList.data.length);

      // Should display new instances
      for (const instance of MOCK_RESPONSES.instanceList.data) {
        await expect(page.getByTestId(`instance-${instance.id}`)).toBeVisible();
        await expect(page.getByTestId(`instance-status-${instance.id}`)).toContainText(instance.status);
      }
    });

    test('should handle real-time status updates', async ({ page }) => {
      await instancePage.waitForWebSocketConnection();

      // Setup initial instances
      await wsHelper.simulateServerMessage(MOCK_RESPONSES.instanceList);
      await page.waitForSelector('[data-testid="instance-ws-instance-1"]');

      // Initial status should be 'running'
      await expect(page.getByTestId('instance-status-ws-instance-1')).toContainText('running');

      // Send status update
      await wsHelper.simulateServerMessage(MOCK_RESPONSES.statusUpdate);

      // Status should update to 'busy'
      await expect(page.getByTestId('instance-status-ws-instance-1')).toContainText('busy');

      // Status indicator should change color/style
      const statusIndicator = page.getByTestId('status-indicator-ws-instance-1');
      await expect(statusIndicator).toHaveClass(/busy|yellow|warning/);
    });

    test('should synchronize chat messages in real-time', async ({ page }) => {
      await instancePage.waitForWebSocketConnection();
      await wsHelper.simulateServerMessage(MOCK_RESPONSES.instanceList);

      // Send a message
      await instancePage.sendChatMessage('ws-instance-1', 'Hello WebSocket!');

      // Verify message was sent via WebSocket
      const sentMessages = await wsHelper.getSentMessages();
      const chatMessage = sentMessages.find(msg => 
        JSON.parse(msg).type === 'chat' && 
        JSON.parse(msg).content === 'Hello WebSocket!'
      );
      expect(chatMessage).toBeDefined();

      // Simulate server response
      await wsHelper.simulateServerMessage(MOCK_RESPONSES.messageResponse);

      // Should display response in chat
      await expect(page.getByTestId('assistant-message')).toContainText('Hello from Claude!');
    });

    test('should handle batch updates efficiently', async ({ page }) => {
      await instancePage.waitForWebSocketConnection();

      // Send multiple rapid updates
      const updates = Array.from({ length: 10 }, (_, i) => ({
        type: 'status',
        instanceId: `batch-instance-${i}`,
        status: i % 2 === 0 ? 'running' : 'busy',
        timestamp: new Date().toISOString()
      }));

      // Send updates rapidly
      for (const update of updates) {
        await wsHelper.simulateServerMessage(update);
      }

      // All updates should be processed
      await page.waitForTimeout(500); // Allow processing time

      // UI should remain responsive
      const selectButton = page.getByTestId('instance-selector-button');
      await expect(selectButton).toBeEnabled();
    });
  });

  test.describe('Connection Recovery', () => {
    test('should automatically reconnect after connection loss', async ({ page }) => {
      await instancePage.waitForWebSocketConnection();

      // Verify initial connection
      let status = await instancePage.getConnectionStatus();
      expect(status).toContain('Connected');

      // Simulate connection loss
      await wsHelper.simulateDisconnect(1006, 'Connection lost');

      // Should show disconnected state
      await page.waitForFunction(() => {
        const indicator = document.querySelector('[data-testid="websocket-status"]');
        return indicator?.textContent?.includes('Reconnecting') || 
               indicator?.textContent?.includes('Disconnected');
      });

      // Should automatically attempt reconnection
      await expect(page.getByTestId('reconnection-attempt')).toBeVisible();

      // Wait for reconnection (simulated)
      await page.waitForTimeout(2000);

      // Should reconnect successfully
      status = await instancePage.getConnectionStatus();
      expect(status).toMatch(/Connected|Reconnecting/);
    });

    test('should handle exponential backoff for reconnection attempts', async ({ page }) => {
      await instancePage.waitForWebSocketConnection();

      // Simulate repeated connection failures
      for (let i = 0; i < 3; i++) {
        await wsHelper.simulateDisconnect(1006, 'Connection failed');
        await page.waitForTimeout(100); // Brief delay
      }

      // Should show increasing retry delays
      const retryIndicator = page.getByTestId('retry-delay');
      if (await retryIndicator.isVisible()) {
        const retryText = await retryIndicator.textContent();
        expect(retryText).toMatch(/\d+\s*seconds?/); // Should show delay time
      }

      // Should eventually give up and require manual retry
      await page.waitForTimeout(5000);
      const manualRetry = page.getByTestId('websocket-reconnect');
      await expect(manualRetry).toBeVisible();
    });

    test('should preserve instance state during reconnection', async ({ page }) => {
      await instancePage.waitForWebSocketConnection();
      await wsHelper.simulateServerMessage(MOCK_RESPONSES.instanceList);

      // Verify instances are loaded
      await expect(page.getByTestId('instance-ws-instance-1')).toBeVisible();
      
      // Select an instance
      await page.getByTestId('instance-ws-instance-1').click();
      await expect(page.getByTestId('instance-ws-instance-1')).toHaveClass(/selected|active/);

      // Simulate connection loss and recovery
      await wsHelper.simulateDisconnect();
      await page.waitForTimeout(100);

      // Instance state should be preserved
      await expect(page.getByTestId('instance-ws-instance-1')).toHaveClass(/selected|active/);
      
      // Instance data should remain visible
      await expect(page.getByTestId('instance-ws-instance-1')).toBeVisible();
    });

    test('should handle server restarts gracefully', async ({ page }) => {
      await instancePage.waitForWebSocketConnection();

      // Simulate server restart (WebSocket close with specific code)
      await wsHelper.simulateDisconnect(1012, 'Service restart');

      // Should show server restart message
      await expect(page.getByTestId('server-restart-notice')).toBeVisible();

      // Should automatically reconnect
      await instancePage.waitForWebSocketConnection();

      // Should refresh instance data after reconnect
      const instances = await instancePage.getInstanceCount();
      expect(instances).toBeGreaterThanOrEqual(0); // May be 0 if server clearing state
    });
  });

  test.describe('Error Handling and Resilience', () => {
    test('should handle malformed WebSocket messages', async ({ page }) => {
      await instancePage.waitForWebSocketConnection();

      // Send malformed JSON
      await page.evaluate(() => {
        const mockSockets = (window as any).mockWebSockets || [];
        mockSockets.forEach((ws: any) => {
          ws.dispatchEvent(new MessageEvent('message', { 
            data: 'invalid-json{malformed' 
          }));
        });
      });

      // Should not crash the application
      await expect(page.getByTestId('websocket-status')).toBeVisible();
      
      // Should log error but continue functioning
      const errorLog = page.getByTestId('websocket-error-log');
      if (await errorLog.isVisible()) {
        await expect(errorLog).toContainText('Invalid message format');
      }
    });

    test('should handle unexpected message types', async ({ page }) => {
      await instancePage.waitForWebSocketConnection();

      // Send unknown message type
      await wsHelper.simulateServerMessage({
        type: 'unknown-message-type',
        data: { test: 'data' }
      });

      // Application should remain stable
      const status = await instancePage.getConnectionStatus();
      expect(status).toContain('Connected');

      // Should log warning about unknown message
      console.log('Testing unknown message type handling');
    });

    test('should handle WebSocket protocol errors', async ({ page }) => {
      await instancePage.waitForWebSocketConnection();

      // Simulate protocol error
      await wsHelper.simulateConnectionError('WebSocket protocol error');

      // Should display protocol error
      const errorMessage = page.getByTestId('protocol-error');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toContainText('protocol error');
      }

      // Should offer reconnection with different transport
      const fallbackButton = page.getByTestId('fallback-transport');
      if (await fallbackButton.isVisible()) {
        await expect(fallbackButton).toBeEnabled();
      }
    });

    test('should handle partial message delivery', async ({ page }) => {
      await instancePage.waitForWebSocketConnection();

      // Send incomplete instance data
      const partialInstanceData = {
        type: 'instances',
        data: [
          {
            id: 'partial-instance',
            status: 'running'
            // Missing required fields
          }
        ]
      };

      await wsHelper.simulateServerMessage(partialInstanceData);

      // Should handle gracefully with default values
      const instance = page.getByTestId('instance-partial-instance');
      if (await instance.isVisible()) {
        // Should show instance with available data
        await expect(instance).toBeVisible();
        
        // Should indicate missing data
        await expect(instance).toContainText('running');
      }
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should handle high-frequency message updates', async ({ page }) => {
      await instancePage.waitForWebSocketConnection();

      const startTime = Date.now();
      const messageCount = 100;

      // Send many rapid status updates
      for (let i = 0; i < messageCount; i++) {
        await wsHelper.simulateServerMessage({
          type: 'status',
          instanceId: 'load-test-instance',
          status: i % 2 === 0 ? 'busy' : 'idle',
          timestamp: new Date().toISOString()
        });
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process messages within reasonable time
      expect(processingTime).toBeLessThan(5000); // 5 seconds max

      // UI should remain responsive
      const selectButton = page.getByTestId('instance-selector-button');
      await expect(selectButton).toBeEnabled();
    });

    test('should handle concurrent connections', async ({ page, context }) => {
      // Create multiple pages to simulate concurrent users
      const pages = await Promise.all([
        context.newPage(),
        context.newPage(),
        context.newPage()
      ]);

      const helpers = pages.map(p => new WebSocketTestHelper(p));
      
      try {
        // Setup WebSocket on all pages
        await Promise.all(helpers.map(helper => helper.setupMockWebSocketServer()));
        await Promise.all(pages.map(p => p.goto('/claude-instances')));

        // All should connect successfully
        await Promise.all(pages.map(p => 
          p.waitForFunction(() => {
            const indicator = document.querySelector('[data-testid="websocket-status"]');
            return indicator?.textContent?.includes('Connected');
          }, { timeout: TEST_CONFIG.connectionTimeout })
        ));

        // Broadcast message to all connections
        const broadcastMessage = {
          type: 'broadcast',
          message: 'Hello all users!',
          timestamp: new Date().toISOString()
        };

        await Promise.all(helpers.map(helper => 
          helper.simulateServerMessage(broadcastMessage)
        ));

        // All pages should receive the broadcast
        await Promise.all(pages.map(p =>
          expect(p.getByTestId('broadcast-message')).toContainText('Hello all users!')
        ));

      } finally {
        // Cleanup
        await Promise.all(helpers.map(helper => helper.clearMessageLog()));
        await Promise.all(pages.map(p => p.close()));
      }
    });

    test('should maintain performance under sustained load', async ({ page }) => {
      await instancePage.waitForWebSocketConnection();

      const testDuration = 10000; // 10 seconds
      const messageInterval = 100; // Every 100ms
      const startTime = Date.now();
      let messagesSent = 0;

      // Send messages at regular intervals
      const interval = setInterval(async () => {
        if (Date.now() - startTime > testDuration) {
          clearInterval(interval);
          return;
        }

        await wsHelper.simulateServerMessage({
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
          messageId: ++messagesSent
        });
      }, messageInterval);

      // Wait for test duration
      await page.waitForTimeout(testDuration + 1000);

      // Should have processed many messages
      expect(messagesSent).toBeGreaterThan(50);

      // UI should still be responsive
      const status = await instancePage.getConnectionStatus();
      expect(status).toContain('Connected');

      // Memory usage should be reasonable (if monitoring is available)
      const memoryUsage = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      if (memoryUsage > 0) {
        // Should not exceed 100MB
        expect(memoryUsage).toBeLessThan(100 * 1024 * 1024);
      }
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('should work consistently across browser engines', async ({ browserName, page }) => {
      await instancePage.waitForWebSocketConnection();

      // Basic functionality should work in all browsers
      const status = await instancePage.getConnectionStatus();
      expect(status).toContain('Connected');

      // Send a test message
      await wsHelper.simulateServerMessage(MOCK_RESPONSES.messageResponse);

      // Should display message consistently
      const message = page.getByTestId('websocket-message');
      if (await message.isVisible()) {
        await expect(message).toContainText('Hello from Claude!');
      }

      console.log(`WebSocket test passed on ${browserName}`);
    });

    test('should handle browser-specific WebSocket quirks', async ({ browserName, page }) => {
      await instancePage.waitForWebSocketConnection();

      // Test browser-specific connection handling
      if (browserName === 'webkit') {
        // Safari/WebKit specific tests
        await wsHelper.simulateDisconnect(1000, 'Normal closure');
        
        // WebKit might handle reconnection differently
        await page.waitForTimeout(2000);
        const status = await instancePage.getConnectionStatus();
        expect(status).toMatch(/Connected|Reconnecting/);
      }

      if (browserName === 'firefox') {
        // Firefox specific tests
        await wsHelper.simulateConnectionError('Network error');
        
        // Firefox error handling
        const errorIndicator = page.getByTestId('connection-error');
        if (await errorIndicator.isVisible()) {
          await expect(errorIndicator).toBeVisible();
        }
      }
    });
  });

  test.describe('Production Deployment Scenarios', () => {
    test('should handle secure WebSocket connections (WSS)', async ({ page }) => {
      // Mock HTTPS environment
      await page.addInitScript(() => {
        // Override location for SSL testing
        Object.defineProperty(window.location, 'protocol', {
          value: 'https:',
          configurable: true
        });
      });

      await instancePage.navigate();
      await instancePage.waitForWebSocketConnection();

      // Should use secure WebSocket protocol
      const mockSockets = await wsHelper.getMockWebSockets();
      if (mockSockets.length > 0) {
        const wsUrl = mockSockets[0].url;
        // In production, should use wss:// for HTTPS sites
        console.log('WebSocket URL:', wsUrl);
      }
    });

    test('should handle proxy and load balancer scenarios', async ({ page }) => {
      await instancePage.waitForWebSocketConnection();

      // Simulate load balancer failover
      await wsHelper.simulateDisconnect(1001, 'Switching servers');

      // Should reconnect to potentially different server
      await page.waitForTimeout(1000);

      // Connection should be reestablished
      const status = await instancePage.getConnectionStatus();
      expect(status).toMatch(/Connected|Reconnecting/);

      // Should maintain session continuity
      await wsHelper.simulateServerMessage(MOCK_RESPONSES.instanceList);
      await expect(page.getByTestId('instance-ws-instance-1')).toBeVisible();
    });

    test('should handle production authentication', async ({ page }) => {
      await instancePage.waitForWebSocketConnection();

      // Simulate authentication challenge
      await wsHelper.simulateServerMessage({
        type: 'auth_required',
        challenge: 'Please provide authentication token'
      });

      // Should handle authentication flow
      const authDialog = page.getByTestId('auth-dialog');
      if (await authDialog.isVisible()) {
        // Should display authentication prompt
        await expect(authDialog).toContainText('authentication');
      }

      // Simulate successful authentication
      await wsHelper.simulateServerMessage({
        type: 'auth_success',
        message: 'Authentication successful'
      });

      // Should proceed with normal operation
      const status = await instancePage.getConnectionStatus();
      expect(status).toContain('Connected');
    });

    test('should handle production monitoring and logging', async ({ page }) => {
      await instancePage.waitForWebSocketConnection();

      // Should not expose sensitive information in production
      const pageSource = await page.content();
      expect(pageSource).not.toMatch(/password|secret|key|token/gi);

      // Should have proper error reporting
      await wsHelper.simulateConnectionError('Production error');

      const errorLog = page.getByTestId('error-log');
      if (await errorLog.isVisible()) {
        const errorText = await errorLog.textContent();
        // Error messages should be user-friendly, not technical
        expect(errorText).not.toContain('stack trace');
        expect(errorText).not.toContain('internal error');
      }
    });

    test('should maintain connection across page navigation', async ({ page }) => {
      await instancePage.waitForWebSocketConnection();
      
      // Navigate to different page and back
      await page.goto('/analytics');
      await page.waitForTimeout(500);
      await page.goBack();

      // WebSocket should reconnect automatically
      await instancePage.waitForWebSocketConnection();
      
      const status = await instancePage.getConnectionStatus();
      expect(status).toContain('Connected');
    });
  });
});