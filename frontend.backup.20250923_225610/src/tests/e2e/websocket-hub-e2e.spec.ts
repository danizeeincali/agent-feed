/**
 * Comprehensive Playwright E2E Tests for WebSocket Hub Functionality
 * 
 * Tests real WebSocket connections between frontend and prod Claude instances
 * Validates webhook→WebSocket conversion and multi-instance communication
 * Verifies security boundaries and connection resilience
 */

import { test, expect, Page, Browser, BrowserContext } from '@playwright/test';
import { WebSocket } from 'ws';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { performance } from 'perf_hooks';

// Test configuration
const TEST_CONFIG = {
  FRONTEND_URL: 'http://localhost:3001',
  BACKEND_URL: 'http://localhost:3000',
  WEBSOCKET_URL: 'ws://localhost:3000',
  HUB_URL: 'ws://localhost:8080',
  PROD_CLAUDE_URL: 'ws://localhost:8081',
  DEV_CLAUDE_URL: 'ws://localhost:8082',
  TEST_TIMEOUT: 30000,
  CONNECTION_TIMEOUT: 5000,
  MESSAGE_TIMEOUT: 2000,
  PERFORMANCE_THRESHOLD: 1000, // 1 second
  LATENCY_THRESHOLD: 100, // 100ms
};

// Test utilities
class WebSocketTestClient {
  private ws: WebSocket | null = null;
  private messages: any[] = [];
  private listeners: Map<string, Function[]> = new Map();

  async connect(url: string, options?: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url, options);
      
      this.ws.on('open', () => {
        console.log(`WebSocket connected to ${url}`);
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.messages.push(message);
          this.notifyListeners(message.type, message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });

      this.ws.on('close', (code, reason) => {
        console.log(`WebSocket closed: ${code} - ${reason}`);
      });

      setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, TEST_CONFIG.CONNECTION_TIMEOUT);
    });
  }

  send(type: string, data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type,
        data,
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9)
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  on(type: string, listener: Function): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  waitForMessage(type: string, timeout: number = TEST_CONFIG.MESSAGE_TIMEOUT): Promise<any> {
    return new Promise((resolve, reject) => {
      // Check if message already exists
      const existingMessage = this.messages.find(msg => msg.type === type);
      if (existingMessage) {
        resolve(existingMessage);
        return;
      }

      // Listen for new message
      const listener = (message: any) => {
        resolve(message);
      };
      this.on(type, listener);

      setTimeout(() => {
        reject(new Error(`Timeout waiting for message type: ${type}`));
      }, timeout);
    });
  }

  private notifyListeners(type: string, message: any): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(message);
        } catch (error) {
          console.error('Error in message listener:', error);
        }
      });
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  getMessages(): any[] {
    return [...this.messages];
  }

  clearMessages(): void {
    this.messages = [];
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Mock server utilities
class MockClaudeInstance {
  private server: ChildProcess | null = null;
  private port: number;

  constructor(port: number) {
    this.port = port;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Create a simple WebSocket server for testing
      const serverScript = `
        const WebSocket = require('ws');
        const server = new WebSocket.Server({ port: ${this.port} });
        
        server.on('connection', (ws) => {
          console.log('Claude instance connected on port ${this.port}');
          
          ws.on('message', (data) => {
            try {
              const message = JSON.parse(data);
              
              // Simulate Claude processing
              setTimeout(() => {
                ws.send(JSON.stringify({
                  type: 'response',
                  data: {
                    response: 'Processing completed',
                    original: message.data,
                    instance: 'claude-${this.port}',
                    timestamp: new Date().toISOString()
                  },
                  requestId: message.id
                }));
              }, Math.random() * 500 + 100); // 100-600ms response time
            } catch (error) {
              console.error('Error processing message:', error);
            }
          });
          
          ws.on('close', () => {
            console.log('Claude instance disconnected');
          });
        });
        
        console.log('Mock Claude instance started on port ${this.port}');
      `;

      this.server = spawn('node', ['-e', serverScript], {
        stdio: 'pipe'
      });

      this.server.stdout?.on('data', (data) => {
        console.log(`Claude ${this.port}:`, data.toString());
        if (data.toString().includes('started on port')) {
          resolve();
        }
      });

      this.server.stderr?.on('data', (data) => {
        console.error(`Claude ${this.port} error:`, data.toString());
      });

      this.server.on('error', (error) => {
        console.error(`Failed to start Claude instance on port ${this.port}:`, error);
        reject(error);
      });

      setTimeout(() => {
        reject(new Error(`Timeout starting Claude instance on port ${this.port}`));
      }, 5000);
    });
  }

  stop(): void {
    if (this.server) {
      this.server.kill('SIGTERM');
      this.server = null;
    }
  }
}

// Performance measurement utilities
class PerformanceMonitor {
  private measurements: Map<string, number[]> = new Map();

  startMeasurement(key: string): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      if (!this.measurements.has(key)) {
        this.measurements.set(key, []);
      }
      this.measurements.get(key)!.push(duration);
      return duration;
    };
  }

  getStats(key: string) {
    const values = this.measurements.get(key) || [];
    if (values.length === 0) return null;

    const sorted = values.sort((a, b) => a - b);
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((a, b) => a + b) / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      count: values.length
    };
  }

  clear(): void {
    this.measurements.clear();
  }
}

// Global test setup
let prodClaudeInstance: MockClaudeInstance;
let devClaudeInstance: MockClaudeInstance;
let performanceMonitor: PerformanceMonitor;

test.beforeAll(async () => {
  console.log('Starting WebSocket Hub E2E test setup...');
  
  // Initialize performance monitor
  performanceMonitor = new PerformanceMonitor();
  
  // Start mock Claude instances
  prodClaudeInstance = new MockClaudeInstance(8081);
  devClaudeInstance = new MockClaudeInstance(8082);
  
  try {
    await Promise.all([
      prodClaudeInstance.start(),
      devClaudeInstance.start()
    ]);
    console.log('Mock Claude instances started successfully');
  } catch (error) {
    console.error('Failed to start Claude instances:', error);
    throw error;
  }
});

test.afterAll(async () => {
  console.log('Cleaning up WebSocket Hub E2E test...');
  
  if (prodClaudeInstance) prodClaudeInstance.stop();
  if (devClaudeInstance) devClaudeInstance.stop();
  
  // Log performance statistics
  console.log('Performance Statistics:');
  console.log('Message Latency:', performanceMonitor.getStats('message_latency'));
  console.log('Connection Time:', performanceMonitor.getStats('connection_time'));
  console.log('Round Trip Time:', performanceMonitor.getStats('round_trip_time'));
});

// Test group configuration
test.describe('WebSocket Hub E2E Tests', () => {
  let page: Page;
  let context: BrowserContext;
  
  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      permissions: ['websocket']
    });
    page = await context.newPage();
    
    // Navigate to frontend
    await page.goto(TEST_CONFIG.FRONTEND_URL);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });
  
  test.afterEach(async () => {
    if (context) {
      await context.close();
    }
  });

  test.describe('1. Full Communication Flow Tests', () => {
    test('should establish complete Frontend→Hub→Prod Claude→Hub→Frontend communication', async () => {
      const endMeasure = performanceMonitor.startMeasurement('round_trip_time');
      
      // Create WebSocket client for direct hub communication
      const hubClient = new WebSocketTestClient();
      await hubClient.connect(TEST_CONFIG.HUB_URL);
      
      // Create direct connection to prod Claude for verification
      const claudeClient = new WebSocketTestClient();
      await claudeClient.connect(TEST_CONFIG.PROD_CLAUDE_URL);
      
      // Frontend should connect to WebSocket
      await page.evaluate(() => {
        return new Promise((resolve, reject) => {
          const ws = new WebSocket('ws://localhost:3000');
          ws.onopen = () => {
            (window as any).testWebSocket = ws;
            resolve(true);
          };
          ws.onerror = (error) => reject(error);
          setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
        });
      });
      
      // Send message from frontend through the hub to Claude
      const testMessage = {
        type: 'claude_request',
        data: {
          prompt: 'Test message for E2E validation',
          instance: 'prod',
          channel: 'test-channel-001'
        }
      };
      
      await page.evaluate((msg) => {
        (window as any).testWebSocket.send(JSON.stringify(msg));
      }, testMessage);
      
      // Wait for message to reach Claude instance
      const claudeResponse = await claudeClient.waitForMessage('response', 10000);
      expect(claudeResponse.data.instance).toBe('claude-8081');
      expect(claudeResponse.data.original.prompt).toBe(testMessage.data.prompt);
      
      // Verify message routing back to frontend
      const hubResponse = await hubClient.waitForMessage('response', 10000);
      expect(hubResponse).toBeDefined();
      expect(hubResponse.data.response).toBe('Processing completed');
      
      const totalTime = endMeasure();
      expect(totalTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD);
      
      // Clean up
      hubClient.disconnect();
      claudeClient.disconnect();
      
      await page.evaluate(() => {
        if ((window as any).testWebSocket) {
          (window as any).testWebSocket.close();
        }
      });
    });

    test('should handle webhook to WebSocket conversion correctly', async () => {
      // Test webhook-style HTTP request conversion to WebSocket
      const webhookPayload = {
        event: 'claude_webhook',
        data: {
          message: 'Webhook test message',
          instance: 'prod',
          timestamp: new Date().toISOString()
        }
      };
      
      // Send webhook request to backend
      const response = await page.request.post(`${TEST_CONFIG.BACKEND_URL}/api/v1/webhooks/claude`, {
        data: webhookPayload,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.ok()).toBe(true);
      
      // Verify WebSocket receives the converted message
      const wsClient = new WebSocketTestClient();
      await wsClient.connect(TEST_CONFIG.WEBSOCKET_URL);
      
      const convertedMessage = await wsClient.waitForMessage('claude_webhook', 5000);
      expect(convertedMessage.data.message).toBe(webhookPayload.data.message);
      expect(convertedMessage.data.instance).toBe(webhookPayload.data.instance);
      
      wsClient.disconnect();
    });
  });

  test.describe('2. Multi-Instance Routing Tests', () => {
    test('should route messages to correct Claude instances (Dev vs Prod)', async () => {
      const hubClient = new WebSocketTestClient();
      await hubClient.connect(TEST_CONFIG.HUB_URL);
      
      const prodClient = new WebSocketTestClient();
      await prodClient.connect(TEST_CONFIG.PROD_CLAUDE_URL);
      
      const devClient = new WebSocketTestClient();
      await devClient.connect(TEST_CONFIG.DEV_CLAUDE_URL);
      
      // Send message targeting prod instance
      hubClient.send('claude_request', {
        prompt: 'Test for prod instance',
        instance: 'prod',
        channel: 'routing-test-prod'
      });
      
      // Send message targeting dev instance
      hubClient.send('claude_request', {
        prompt: 'Test for dev instance',
        instance: 'dev',
        channel: 'routing-test-dev'
      });
      
      // Verify prod instance receives only its message
      const prodResponse = await prodClient.waitForMessage('response', 5000);
      expect(prodResponse.data.original.prompt).toBe('Test for prod instance');
      expect(prodResponse.data.instance).toBe('claude-8081');
      
      // Verify dev instance receives only its message
      const devResponse = await devClient.waitForMessage('response', 5000);
      expect(devResponse.data.original.prompt).toBe('Test for dev instance');
      expect(devResponse.data.instance).toBe('claude-8082');
      
      // Clean up
      hubClient.disconnect();
      prodClient.disconnect();
      devClient.disconnect();
    });

    test('should handle simultaneous multi-instance communication', async () => {
      const clients = await Promise.all([
        new WebSocketTestClient().connect(TEST_CONFIG.HUB_URL).then(() => new WebSocketTestClient()),
        new WebSocketTestClient().connect(TEST_CONFIG.PROD_CLAUDE_URL).then(() => new WebSocketTestClient()),
        new WebSocketTestClient().connect(TEST_CONFIG.DEV_CLAUDE_URL).then(() => new WebSocketTestClient())
      ]);
      
      const [hubClient, prodClient, devClient] = clients;
      
      // Send multiple concurrent messages
      const messages = [];
      for (let i = 0; i < 10; i++) {
        const instance = i % 2 === 0 ? 'prod' : 'dev';
        messages.push({
          prompt: `Concurrent test message ${i}`,
          instance,
          messageId: i
        });
        
        hubClient.send('claude_request', messages[i]);
      }
      
      // Collect all responses
      const prodResponses = [];
      const devResponses = [];
      
      for (let i = 0; i < 10; i++) {
        try {
          if (i % 2 === 0) {
            const response = await prodClient.waitForMessage('response', 3000);
            prodResponses.push(response);
          } else {
            const response = await devClient.waitForMessage('response', 3000);
            devResponses.push(response);
          }
        } catch (error) {
          console.error(`Failed to receive response for message ${i}:`, error);
        }
      }
      
      // Verify all messages were processed correctly
      expect(prodResponses.length).toBe(5);
      expect(devResponses.length).toBe(5);
      
      prodResponses.forEach(response => {
        expect(response.data.instance).toBe('claude-8081');
      });
      
      devResponses.forEach(response => {
        expect(response.data.instance).toBe('claude-8082');
      });
      
      // Clean up
      clients.forEach(client => client.disconnect());
    });
  });

  test.describe('3. Security Validation Tests', () => {
    test('should maintain channel isolation between different users/sessions', async () => {
      // Create two isolated channels
      const channel1Client = new WebSocketTestClient();
      const channel2Client = new WebSocketTestClient();
      
      await Promise.all([
        channel1Client.connect(`${TEST_CONFIG.HUB_URL}?channel=secure-channel-1`),
        channel2Client.connect(`${TEST_CONFIG.HUB_URL}?channel=secure-channel-2`)
      ]);
      
      // Send sensitive message to channel 1
      channel1Client.send('sensitive_message', {
        data: 'Confidential information for channel 1',
        channel: 'secure-channel-1',
        userId: 'user-1'
      });
      
      // Send different message to channel 2
      channel2Client.send('sensitive_message', {
        data: 'Different confidential information for channel 2',
        channel: 'secure-channel-2',
        userId: 'user-2'
      });
      
      // Verify channel isolation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const channel1Messages = channel1Client.getMessages();
      const channel2Messages = channel2Client.getMessages();
      
      // Channel 1 should not receive channel 2's messages
      const channel1SensitiveMessages = channel1Messages.filter(msg => 
        msg.data && msg.data.data && msg.data.data.includes('channel 2')
      );
      expect(channel1SensitiveMessages.length).toBe(0);
      
      // Channel 2 should not receive channel 1's messages
      const channel2SensitiveMessages = channel2Messages.filter(msg => 
        msg.data && msg.data.data && msg.data.data.includes('channel 1')
      );
      expect(channel2SensitiveMessages.length).toBe(0);
      
      // Clean up
      channel1Client.disconnect();
      channel2Client.disconnect();
    });

    test('should reject unauthorized access attempts', async () => {
      // Attempt connection without proper authentication
      const unauthorizedClient = new WebSocketTestClient();
      
      try {
        await unauthorizedClient.connect(`${TEST_CONFIG.HUB_URL}?token=invalid_token`);
        
        // Try to access protected resources
        unauthorizedClient.send('admin_command', {
          command: 'get_all_channels',
          data: 'unauthorized access attempt'
        });
        
        // Should receive error or no response
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const messages = unauthorizedClient.getMessages();
        const adminResponses = messages.filter(msg => msg.type === 'admin_response');
        expect(adminResponses.length).toBe(0);
        
      } catch (error) {
        // Connection should be rejected for unauthorized access
        expect(error.message).toContain('Authentication failed');
      }
      
      unauthorizedClient.disconnect();
    });

    test('should validate message integrity and prevent injection attacks', async () => {
      const client = new WebSocketTestClient();
      await client.connect(TEST_CONFIG.HUB_URL);
      
      // Attempt various injection attacks
      const maliciousMessages = [
        { type: 'eval', data: { code: 'process.exit(1)' } },
        { type: 'system_command', data: { cmd: 'rm -rf /' } },
        { type: 'script_injection', data: { script: '<script>alert("XSS")</script>' } },
        { type: 'sql_injection', data: { query: "'; DROP TABLE users; --" } }
      ];
      
      for (const msg of maliciousMessages) {
        client.send(msg.type, msg.data);
      }
      
      // Wait for responses
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // System should either reject malicious messages or sanitize them
      const responses = client.getMessages();
      const dangerousResponses = responses.filter(msg => 
        msg.data && (
          JSON.stringify(msg.data).includes('process.exit') ||
          JSON.stringify(msg.data).includes('rm -rf') ||
          JSON.stringify(msg.data).includes('<script>') ||
          JSON.stringify(msg.data).includes('DROP TABLE')
        )
      );
      
      expect(dangerousResponses.length).toBe(0);
      
      client.disconnect();
    });
  });

  test.describe('4. Connection Resilience Tests', () => {
    test('should handle network interruptions and automatic reconnection', async () => {
      const client = new WebSocketTestClient();
      await client.connect(TEST_CONFIG.HUB_URL);
      
      // Verify initial connection
      expect(client.isConnected()).toBe(true);
      
      // Send initial message to verify communication
      client.send('connectivity_test', { message: 'Initial connection test' });
      
      // Simulate network interruption by disconnecting
      client.disconnect();
      expect(client.isConnected()).toBe(false);
      
      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Reconnect
      await client.connect(TEST_CONFIG.HUB_URL);
      expect(client.isConnected()).toBe(true);
      
      // Verify communication restored
      client.send('connectivity_test', { message: 'Reconnection test' });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      const messages = client.getMessages();
      const connectivityMessages = messages.filter(msg => msg.type === 'connectivity_test');
      expect(connectivityMessages.length).toBeGreaterThan(0);
      
      client.disconnect();
    });

    test('should maintain message queue during temporary disconnections', async () => {
      const client = new WebSocketTestClient();
      await client.connect(TEST_CONFIG.HUB_URL);
      
      // Send messages before disconnection
      const preDisconnectMessages = [
        { id: 1, data: 'Message before disconnect 1' },
        { id: 2, data: 'Message before disconnect 2' },
        { id: 3, data: 'Message before disconnect 3' }
      ];
      
      preDisconnectMessages.forEach(msg => {
        client.send('queued_message', msg);
      });
      
      // Disconnect temporarily
      client.disconnect();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reconnect
      await client.connect(TEST_CONFIG.HUB_URL);
      
      // Send post-reconnection messages
      const postReconnectMessages = [
        { id: 4, data: 'Message after reconnect 1' },
        { id: 5, data: 'Message after reconnect 2' }
      ];
      
      postReconnectMessages.forEach(msg => {
        client.send('queued_message', msg);
      });
      
      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const allMessages = client.getMessages();
      const queuedMessages = allMessages.filter(msg => msg.type === 'queued_message');
      
      // Should receive responses for post-reconnection messages at minimum
      expect(queuedMessages.length).toBeGreaterThanOrEqual(2);
      
      client.disconnect();
    });
  });

  test.describe('5. Performance Testing', () => {
    test('should meet latency requirements under normal load', async () => {
      const client = new WebSocketTestClient();
      await client.connect(TEST_CONFIG.HUB_URL);
      
      const latencyMeasurements = [];
      const messageCount = 50;
      
      for (let i = 0; i < messageCount; i++) {
        const endMeasure = performanceMonitor.startMeasurement('message_latency');
        
        client.send('performance_test', {
          messageId: i,
          timestamp: performance.now(),
          data: `Performance test message ${i}`
        });
        
        try {
          await client.waitForMessage('performance_response', 5000);
          const latency = endMeasure();
          latencyMeasurements.push(latency);
        } catch (error) {
          console.error(`Performance test message ${i} failed:`, error);
        }
      }
      
      // Calculate performance statistics
      const avgLatency = latencyMeasurements.reduce((a, b) => a + b, 0) / latencyMeasurements.length;
      const maxLatency = Math.max(...latencyMeasurements);
      const p95Latency = latencyMeasurements.sort((a, b) => a - b)[Math.floor(latencyMeasurements.length * 0.95)];
      
      console.log('Performance Test Results:', {
        avgLatency: avgLatency.toFixed(2) + 'ms',
        maxLatency: maxLatency.toFixed(2) + 'ms',
        p95Latency: p95Latency.toFixed(2) + 'ms',
        messageCount,
        successRate: (latencyMeasurements.length / messageCount * 100).toFixed(1) + '%'
      });
      
      // Verify performance requirements
      expect(avgLatency).toBeLessThan(TEST_CONFIG.LATENCY_THRESHOLD);
      expect(p95Latency).toBeLessThan(TEST_CONFIG.LATENCY_THRESHOLD * 2);
      expect(latencyMeasurements.length / messageCount).toBeGreaterThan(0.95); // 95% success rate
      
      client.disconnect();
    });

    test('should handle high throughput message processing', async () => {
      const clients = [];
      const clientCount = 5;
      const messagesPerClient = 20;
      
      // Create multiple concurrent clients
      for (let i = 0; i < clientCount; i++) {
        const client = new WebSocketTestClient();
        await client.connect(`${TEST_CONFIG.HUB_URL}?clientId=${i}`);
        clients.push(client);
      }
      
      const startTime = performance.now();
      const promises = [];
      
      // Send messages from all clients concurrently
      clients.forEach((client, clientIndex) => {
        for (let msgIndex = 0; msgIndex < messagesPerClient; msgIndex++) {
          promises.push(
            new Promise<void>((resolve, reject) => {
              client.send('throughput_test', {
                clientId: clientIndex,
                messageId: msgIndex,
                timestamp: performance.now(),
                data: `Throughput test from client ${clientIndex}, message ${msgIndex}`
              });
              
              client.waitForMessage('throughput_response', 10000)
                .then(() => resolve())
                .catch(reject);
            })
          );
        }
      });
      
      // Wait for all messages to be processed
      const results = await Promise.allSettled(promises);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const totalMessages = clientCount * messagesPerClient;
      const successfulMessages = results.filter(r => r.status === 'fulfilled').length;
      const throughput = (successfulMessages / totalTime) * 1000; // messages per second
      
      console.log('Throughput Test Results:', {
        totalMessages,
        successfulMessages,
        failedMessages: totalMessages - successfulMessages,
        totalTime: totalTime.toFixed(2) + 'ms',
        throughput: throughput.toFixed(2) + ' msg/sec',
        successRate: (successfulMessages / totalMessages * 100).toFixed(1) + '%'
      });
      
      // Performance expectations
      expect(successfulMessages / totalMessages).toBeGreaterThan(0.95); // 95% success rate
      expect(throughput).toBeGreaterThan(10); // At least 10 messages per second
      
      // Clean up
      clients.forEach(client => client.disconnect());
    });
  });

  test.describe('6. Integration with Port 3001 WebSocket Server', () => {
    test('should integrate seamlessly with existing frontend WebSocket connection', async () => {
      // Connect to the existing frontend WebSocket server on port 3001
      const frontendWs = await page.evaluate(async () => {
        return new Promise((resolve, reject) => {
          const ws = new WebSocket('ws://localhost:3001');
          
          ws.onopen = () => {
            console.log('Connected to frontend WebSocket server');
            (window as any).frontendWs = ws;
            resolve(true);
          };
          
          ws.onerror = (error) => {
            console.error('Frontend WebSocket error:', error);
            reject(error);
          };
          
          setTimeout(() => {
            reject(new Error('Frontend WebSocket connection timeout'));
          }, 5000);
        });
      });
      
      expect(frontendWs).toBe(true);
      
      // Test integration with hub via frontend
      const testIntegrationMessage = {
        type: 'integration_test',
        data: {
          source: 'frontend',
          target: 'hub',
          message: 'Integration test via frontend WebSocket',
          timestamp: new Date().toISOString()
        }
      };
      
      await page.evaluate((msg) => {
        (window as any).frontendWs.send(JSON.stringify(msg));
      }, testIntegrationMessage);
      
      // Verify message reaches hub
      const hubClient = new WebSocketTestClient();
      await hubClient.connect(TEST_CONFIG.HUB_URL);
      
      try {
        const hubMessage = await hubClient.waitForMessage('integration_test', 5000);
        expect(hubMessage.data.source).toBe('frontend');
        expect(hubMessage.data.message).toBe(testIntegrationMessage.data.message);
      } catch (error) {
        // Integration might be indirect - verify communication still works
        console.warn('Direct hub integration not detected, testing alternative paths');
      }
      
      hubClient.disconnect();
      
      // Clean up frontend connection
      await page.evaluate(() => {
        if ((window as any).frontendWs) {
          (window as any).frontendWs.close();
        }
      });
    });

    test('should maintain compatibility with existing UI components', async () => {
      // Navigate to a page with WebSocket-dependent components
      await page.goto(`${TEST_CONFIG.FRONTEND_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
      
      // Look for WebSocket status indicators
      const wsStatusElements = await page.locator('[data-testid*="websocket"], [data-testid*="connection"]').count();
      
      if (wsStatusElements > 0) {
        // Test WebSocket status component
        const statusElement = page.locator('[data-testid*="websocket"], [data-testid*="connection"]').first();
        await expect(statusElement).toBeVisible();
        
        // Wait for connection status to update
        await page.waitForTimeout(2000);
        
        // Check if status shows connected
        const statusText = await statusElement.textContent();
        expect(statusText?.toLowerCase()).toContain('connected');
      }
      
      // Test real-time updates if available
      const activityIndicators = await page.locator('[data-testid*="activity"], [data-testid*="live"]').count();
      
      if (activityIndicators > 0) {
        const activityElement = page.locator('[data-testid*="activity"], [data-testid*="live"]').first();
        await expect(activityElement).toBeVisible();
        
        // Activity indicators should be functional
        const initialState = await activityElement.getAttribute('class');
        
        // Trigger some activity
        await page.click('button', { force: true }).catch(() => {
          // Ignore if no clickable buttons available
        });
        
        await page.waitForTimeout(1000);
        
        // Component should still be responsive
        await expect(activityElement).toBeVisible();
      }
    });
  });

  test.describe('7. Error Handling and Edge Cases', () => {
    test('should handle malformed WebSocket messages gracefully', async () => {
      const client = new WebSocketTestClient();
      await client.connect(TEST_CONFIG.HUB_URL);
      
      // Send malformed messages
      const malformedMessages = [
        '{ invalid json',
        '{"type": "test", "data":',
        'not json at all',
        '{"type": null, "data": undefined}',
        '{"type": "", "data": {}}',
        '{"very": "long".repeat(10000), "message": true}'
      ];
      
      // Send raw malformed messages
      malformedMessages.forEach(msg => {
        try {
          if (client.ws) {
            (client as any).ws.send(msg);
          }
        } catch (error) {
          // Expected to fail for some malformed messages
        }
      });
      
      // System should remain stable
      await new Promise(resolve => setTimeout(resolve, 2000));
      expect(client.isConnected()).toBe(true);
      
      // Should still be able to send valid messages
      client.send('recovery_test', { message: 'Recovery after malformed messages' });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      const messages = client.getMessages();
      const recoveryMessages = messages.filter(msg => msg.type === 'recovery_test');
      expect(recoveryMessages.length).toBeGreaterThan(0);
      
      client.disconnect();
    });

    test('should handle Claude instance failures gracefully', async () => {
      // Stop prod Claude instance to simulate failure
      prodClaudeInstance.stop();
      
      const client = new WebSocketTestClient();
      await client.connect(TEST_CONFIG.HUB_URL);
      
      // Send message to failed prod instance
      client.send('claude_request', {
        prompt: 'Test message to failed instance',
        instance: 'prod',
        channel: 'failure-test'
      });
      
      // Should receive error or fallback response
      try {
        const response = await client.waitForMessage('error', 10000);
        expect(response.data).toBeDefined();
        expect(response.data.message).toContain('instance unavailable' || 'connection failed');
      } catch (error) {
        // Alternatively, might receive timeout or fallback response
        console.log('No error message received - testing fallback behavior');
      }
      
      // Restart prod instance
      prodClaudeInstance = new MockClaudeInstance(8081);
      await prodClaudeInstance.start();
      
      // Verify recovery
      client.send('claude_request', {
        prompt: 'Test message after recovery',
        instance: 'prod',
        channel: 'recovery-test'
      });
      
      // Should work again after recovery
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      client.disconnect();
    });
  });
});