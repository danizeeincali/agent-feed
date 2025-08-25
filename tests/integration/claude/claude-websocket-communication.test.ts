import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { ClaudeWebSocketManager } from '@/services/claude-websocket-manager';
import { WebSocketTestHelper } from '@/test-utils/websocket-test-helper';
import { waitFor, timeout } from '@/test-utils/async-helpers';

describe('Claude WebSocket Communication', () => {
  let wsManager: ClaudeWebSocketManager;
  let testHelper: WebSocketTestHelper;
  let testServer: any;
  let testInstances: Array<{
    id: string;
    port: number;
    clients: WebSocket[];
  }> = [];

  beforeAll(async () => {
    // Start test WebSocket server
    testServer = new WebSocket.Server({ port: 8080 });
    
    wsManager = new ClaudeWebSocketManager();
    await wsManager.initialize();
    
    testHelper = new WebSocketTestHelper();
    await testHelper.setup();
  }, 10000);

  afterAll(async () => {
    // Clean up all test instances
    for (const instance of testInstances) {
      for (const client of instance.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.close();
        }
      }
    }
    
    await wsManager?.shutdown();
    await testHelper?.cleanup();
    testServer?.close();
  });

  beforeEach(async () => {
    await wsManager.reset();
    testInstances = [];
  });

  afterEach(async () => {
    // Clean up connections created in test
    for (const instance of testInstances) {
      for (const client of instance.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.close();
        }
      }
    }
    testInstances = [];
  });

  describe('Basic WebSocket Operations', () => {
    test('should establish WebSocket connection to Claude instance', async () => {
      const instanceConfig = {
        id: 'ws-test-instance-1',
        port: 3201,
        mode: 'chat' as const
      };

      // Create mock Claude instance
      const mockInstance = await testHelper.createMockInstance(instanceConfig);
      
      const client = new WebSocket(`ws://localhost:${instanceConfig.port}`);
      const connectionPromise = new Promise<void>((resolve, reject) => {
        client.on('open', resolve);
        client.on('error', reject);
      });

      await connectionPromise;
      expect(client.readyState).toBe(WebSocket.OPEN);
      
      testInstances.push({
        id: instanceConfig.id,
        port: instanceConfig.port,
        clients: [client]
      });
    });

    test('should handle WebSocket message exchange', async () => {
      const instanceConfig = {
        id: 'ws-test-instance-2',
        port: 3202,
        mode: 'chat' as const
      };

      const mockInstance = await testHelper.createMockInstance(instanceConfig);
      const client = new WebSocket(`ws://localhost:${instanceConfig.port}`);
      
      await new Promise<void>((resolve) => {
        client.on('open', resolve);
      });

      // Test message sending and receiving
      const messagePromise = new Promise<any>((resolve) => {
        client.on('message', (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });

      const testMessage = {
        type: 'user_message',
        content: 'Hello Claude',
        timestamp: Date.now()
      };

      client.send(JSON.stringify(testMessage));
      
      const response = await messagePromise;
      expect(response.type).toBe('assistant_message');
      expect(response.content).toBeDefined();
      expect(response.in_response_to).toBeDefined();
      
      testInstances.push({
        id: instanceConfig.id,
        port: instanceConfig.port,
        clients: [client]
      });
    });

    test('should handle malformed WebSocket messages gracefully', async () => {
      const instanceConfig = {
        id: 'ws-test-instance-3',
        port: 3203,
        mode: 'chat' as const
      };

      const mockInstance = await testHelper.createMockInstance(instanceConfig);
      const client = new WebSocket(`ws://localhost:${instanceConfig.port}`);
      
      await new Promise<void>((resolve) => {
        client.on('open', resolve);
      });

      const errorPromise = new Promise<any>((resolve) => {
        client.on('message', (data) => {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === 'error') {
            resolve(parsed);
          }
        });
      });

      // Send malformed JSON
      client.send('invalid json{');
      
      const errorResponse = await errorPromise;
      expect(errorResponse.type).toBe('error');
      expect(errorResponse.message).toContain('Invalid JSON');
      
      testInstances.push({
        id: instanceConfig.id,
        port: instanceConfig.port,
        clients: [client]
      });
    });
  });

  describe('Multi-Client WebSocket Support', () => {
    test('should support multiple concurrent WebSocket connections', async () => {
      const instanceConfig = {
        id: 'ws-multi-client-1',
        port: 3204,
        mode: 'chat' as const
      };

      const mockInstance = await testHelper.createMockInstance(instanceConfig);
      const clientCount = 5;
      const clients: WebSocket[] = [];
      
      // Create multiple clients
      for (let i = 0; i < clientCount; i++) {
        const client = new WebSocket(`ws://localhost:${instanceConfig.port}`);
        clients.push(client);
        
        await new Promise<void>((resolve) => {
          client.on('open', resolve);
        });
      }

      expect(clients).toHaveLength(clientCount);
      clients.forEach(client => {
        expect(client.readyState).toBe(WebSocket.OPEN);
      });

      // Test that each client can communicate independently
      const messagePromises = clients.map((client, index) => {
        return new Promise<any>((resolve) => {
          client.on('message', (data) => {
            resolve(JSON.parse(data.toString()));
          });
        });
      });

      // Send different messages from each client
      clients.forEach((client, index) => {
        client.send(JSON.stringify({
          type: 'user_message',
          content: `Message from client ${index + 1}`,
          clientId: index + 1
        }));
      });

      const responses = await Promise.all(messagePromises);
      expect(responses).toHaveLength(clientCount);
      
      responses.forEach((response, index) => {
        expect(response.type).toBe('assistant_message');
        expect(response.content).toContain(`client ${index + 1}`);
      });
      
      testInstances.push({
        id: instanceConfig.id,
        port: instanceConfig.port,
        clients
      });
    });

    test('should maintain separate session contexts for each client', async () => {
      const instanceConfig = {
        id: 'ws-session-isolation',
        port: 3205,
        mode: 'chat' as const
      };

      const mockInstance = await testHelper.createMockInstance(instanceConfig);
      
      const client1 = new WebSocket(`ws://localhost:${instanceConfig.port}`);
      const client2 = new WebSocket(`ws://localhost:${instanceConfig.port}`);
      
      await Promise.all([
        new Promise<void>(resolve => client1.on('open', resolve)),
        new Promise<void>(resolve => client2.on('open', resolve))
      ]);

      // Set up message listeners
      const client1Messages: any[] = [];
      const client2Messages: any[] = [];
      
      client1.on('message', (data) => {
        client1Messages.push(JSON.parse(data.toString()));
      });
      
      client2.on('message', (data) => {
        client2Messages.push(JSON.parse(data.toString()));
      });

      // Send different context information to each client
      client1.send(JSON.stringify({
        type: 'user_message',
        content: 'My name is Alice'
      }));
      
      client2.send(JSON.stringify({
        type: 'user_message',
        content: 'My name is Bob'
      }));

      await waitFor(() => client1Messages.length > 0 && client2Messages.length > 0, 5000);

      // Query each client about the name
      client1.send(JSON.stringify({
        type: 'user_message',
        content: 'What is my name?'
      }));
      
      client2.send(JSON.stringify({
        type: 'user_message', 
        content: 'What is my name?'
      }));

      await waitFor(() => client1Messages.length >= 2 && client2Messages.length >= 2, 5000);
      
      const client1NameResponse = client1Messages[1];
      const client2NameResponse = client2Messages[1];
      
      expect(client1NameResponse.content.toLowerCase()).toContain('alice');
      expect(client2NameResponse.content.toLowerCase()).toContain('bob');
      
      testInstances.push({
        id: instanceConfig.id,
        port: instanceConfig.port,
        clients: [client1, client2]
      });
    });
  });

  describe('WebSocket Streaming and Real-time Features', () => {
    test('should support streaming responses', async () => {
      const instanceConfig = {
        id: 'ws-streaming-test',
        port: 3206,
        mode: 'chat' as const
      };

      const mockInstance = await testHelper.createMockInstance(instanceConfig);
      const client = new WebSocket(`ws://localhost:${instanceConfig.port}`);
      
      await new Promise<void>(resolve => client.on('open', resolve));

      const streamChunks: any[] = [];
      let streamComplete = false;
      
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'stream_chunk') {
          streamChunks.push(message);
        } else if (message.type === 'stream_end') {
          streamComplete = true;
        }
      });

      // Request streaming response
      client.send(JSON.stringify({
        type: 'user_message',
        content: 'Tell me a story about a cat',
        options: {
          stream: true
        }
      }));

      await waitFor(() => streamComplete, 10000);
      
      expect(streamChunks.length).toBeGreaterThan(0);
      expect(streamChunks[0].chunk_id).toBe(0);
      expect(streamChunks[streamChunks.length - 1].is_final).toBe(true);
      
      // Verify chunks form complete message
      const fullContent = streamChunks.map(chunk => chunk.content).join('');
      expect(fullContent.toLowerCase()).toContain('cat');
      
      testInstances.push({
        id: instanceConfig.id,
        port: instanceConfig.port,
        clients: [client]
      });
    });

    test('should handle real-time typing indicators', async () => {
      const instanceConfig = {
        id: 'ws-typing-indicators',
        port: 3207,
        mode: 'chat' as const
      };

      const mockInstance = await testHelper.createMockInstance(instanceConfig);
      const client = new WebSocket(`ws://localhost:${instanceConfig.port}`);
      
      await new Promise<void>(resolve => client.on('open', resolve));

      const indicators: any[] = [];
      
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'typing_indicator') {
          indicators.push(message);
        }
      });

      // Send message that should trigger typing indicator
      client.send(JSON.stringify({
        type: 'user_message',
        content: 'Write a detailed explanation about quantum physics'
      }));

      // Wait for typing indicators
      await waitFor(() => indicators.length > 0, 3000);
      
      expect(indicators.length).toBeGreaterThan(0);
      expect(indicators[0].typing).toBe(true);
      
      // Should eventually receive typing stopped indicator
      await waitFor(() => indicators.some(ind => ind.typing === false), 10000);
      
      const stoppedIndicator = indicators.find(ind => ind.typing === false);
      expect(stoppedIndicator).toBeDefined();
      
      testInstances.push({
        id: instanceConfig.id,
        port: instanceConfig.port,
        clients: [client]
      });
    });
  });

  describe('WebSocket Error Handling and Recovery', () => {
    test('should handle connection drops gracefully', async () => {
      const instanceConfig = {
        id: 'ws-connection-drop',
        port: 3208,
        mode: 'chat' as const
      };

      const mockInstance = await testHelper.createMockInstance(instanceConfig);
      let client = new WebSocket(`ws://localhost:${instanceConfig.port}`);
      
      await new Promise<void>(resolve => client.on('open', resolve));

      // Send initial message
      client.send(JSON.stringify({
        type: 'user_message',
        content: 'Remember my favorite color is blue'
      }));
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force disconnect
      client.close();
      
      // Reconnect
      client = new WebSocket(`ws://localhost:${instanceConfig.port}`);
      await new Promise<void>(resolve => client.on('open', resolve));
      
      const responsePromise = new Promise<any>(resolve => {
        client.on('message', (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });
      
      // Test if context was preserved (depending on implementation)
      client.send(JSON.stringify({
        type: 'user_message',
        content: 'What is my favorite color?'
      }));
      
      const response = await responsePromise;
      expect(response.type).toBe('assistant_message');
      // Note: Context preservation depends on implementation
      
      testInstances.push({
        id: instanceConfig.id,
        port: instanceConfig.port,
        clients: [client]
      });
    });

    test('should handle WebSocket message queue overflow', async () => {
      const instanceConfig = {
        id: 'ws-queue-overflow',
        port: 3209,
        mode: 'chat' as const
      };

      const mockInstance = await testHelper.createMockInstance(instanceConfig);
      const client = new WebSocket(`ws://localhost:${instanceConfig.port}`);
      
      await new Promise<void>(resolve => client.on('open', resolve));

      const responses: any[] = [];
      client.on('message', (data) => {
        responses.push(JSON.parse(data.toString()));
      });

      // Send many messages rapidly to test queue handling
      const messageCount = 50;
      const messages = Array.from({ length: messageCount }, (_, i) => ({
        type: 'user_message',
        content: `Rapid message ${i + 1}`,
        messageId: i + 1
      }));

      // Send all messages at once
      messages.forEach(message => {
        client.send(JSON.stringify(message));
      });

      // Wait for responses (some may be dropped or queued)
      await waitFor(() => responses.length > 0, 5000);
      
      // Should receive at least some responses without crashing
      expect(responses.length).toBeGreaterThan(0);
      
      // Check for queue overflow warnings
      const queueWarnings = responses.filter(r => 
        r.type === 'warning' && r.message.includes('queue')
      );
      
      // May or may not have warnings depending on implementation
      if (queueWarnings.length > 0) {
        expect(queueWarnings[0].message).toContain('queue');
      }
      
      testInstances.push({
        id: instanceConfig.id,
        port: instanceConfig.port,
        clients: [client]
      });
    });

    test('should handle WebSocket ping/pong for connection health', async () => {
      const instanceConfig = {
        id: 'ws-ping-pong',
        port: 3210,
        mode: 'chat' as const
      };

      const mockInstance = await testHelper.createMockInstance(instanceConfig);
      const client = new WebSocket(`ws://localhost:${instanceConfig.port}`);
      
      await new Promise<void>(resolve => client.on('open', resolve));

      let pongReceived = false;
      client.on('pong', () => {
        pongReceived = true;
      });

      // Send ping
      client.ping();
      
      await waitFor(() => pongReceived, 2000);
      expect(pongReceived).toBe(true);
      
      testInstances.push({
        id: instanceConfig.id,
        port: instanceConfig.port,
        clients: [client]
      });
    });
  });

  describe('WebSocket Security and Authentication', () => {
    test('should validate authentication tokens', async () => {
      const instanceConfig = {
        id: 'ws-auth-test',
        port: 3211,
        mode: 'chat' as const,
        requireAuth: true
      };

      const mockInstance = await testHelper.createMockInstance(instanceConfig);
      
      // Try connecting without auth token
      const unauthenticatedClient = new WebSocket(`ws://localhost:${instanceConfig.port}`);
      
      const authErrorPromise = new Promise<void>((resolve) => {
        unauthenticatedClient.on('close', (code) => {
          expect(code).toBe(1008); // Policy violation
          resolve();
        });
      });
      
      await authErrorPromise;
      
      // Connect with valid auth token
      const validToken = testHelper.generateValidToken();
      const authenticatedClient = new WebSocket(
        `ws://localhost:${instanceConfig.port}`,
        { headers: { Authorization: `Bearer ${validToken}` } }
      );
      
      await new Promise<void>((resolve) => {
        authenticatedClient.on('open', resolve);
      });
      
      expect(authenticatedClient.readyState).toBe(WebSocket.OPEN);
      
      testInstances.push({
        id: instanceConfig.id,
        port: instanceConfig.port,
        clients: [authenticatedClient]
      });
    });

    test('should enforce rate limits per WebSocket connection', async () => {
      const instanceConfig = {
        id: 'ws-rate-limit',
        port: 3212,
        mode: 'chat' as const,
        rateLimits: {
          messagesPerMinute: 10,
          burstSize: 5
        }
      };

      const mockInstance = await testHelper.createMockInstance(instanceConfig);
      const client = new WebSocket(`ws://localhost:${instanceConfig.port}`);
      
      await new Promise<void>(resolve => client.on('open', resolve));

      const responses: any[] = [];
      client.on('message', (data) => {
        responses.push(JSON.parse(data.toString()));
      });

      // Send messages rapidly to trigger rate limit
      for (let i = 0; i < 12; i++) {
        client.send(JSON.stringify({
          type: 'user_message',
          content: `Rate limit test ${i + 1}`
        }));
      }

      await waitFor(() => responses.length > 0, 3000);
      
      // Should receive rate limit error
      const rateLimitError = responses.find(r => r.type === 'error' && r.code === 'RATE_LIMIT_EXCEEDED');
      expect(rateLimitError).toBeDefined();
      
      testInstances.push({
        id: instanceConfig.id,
        port: instanceConfig.port,
        clients: [client]
      });
    });
  });

  describe('WebSocket Performance and Monitoring', () => {
    test('should track WebSocket connection metrics', async () => {
      const instanceConfig = {
        id: 'ws-metrics-test',
        port: 3213,
        mode: 'chat' as const
      };

      const mockInstance = await testHelper.createMockInstance(instanceConfig);
      
      // Create multiple connections
      const clients = [];
      for (let i = 0; i < 3; i++) {
        const client = new WebSocket(`ws://localhost:${instanceConfig.port}`);
        clients.push(client);
        await new Promise<void>(resolve => client.on('open', resolve));
      }

      // Send messages from each client
      for (let i = 0; i < clients.length; i++) {
        clients[i].send(JSON.stringify({
          type: 'user_message',
          content: `Test message from client ${i + 1}`
        }));
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get connection metrics
      const metrics = await wsManager.getConnectionMetrics(instanceConfig.id);
      
      expect(metrics.activeConnections).toBe(3);
      expect(metrics.totalMessagesReceived).toBeGreaterThanOrEqual(3);
      expect(metrics.totalMessagesSent).toBeGreaterThanOrEqual(3);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
      
      testInstances.push({
        id: instanceConfig.id,
        port: instanceConfig.port,
        clients
      });
    });

    test('should handle high-frequency message throughput', async () => {
      const instanceConfig = {
        id: 'ws-throughput-test',
        port: 3214,
        mode: 'chat' as const
      };

      const mockInstance = await testHelper.createMockInstance(instanceConfig);
      const client = new WebSocket(`ws://localhost:${instanceConfig.port}`);
      
      await new Promise<void>(resolve => client.on('open', resolve));

      const startTime = Date.now();
      const messageCount = 100;
      const responses: any[] = [];
      
      client.on('message', (data) => {
        responses.push(JSON.parse(data.toString()));
      });

      // Send messages with small delays
      for (let i = 0; i < messageCount; i++) {
        client.send(JSON.stringify({
          type: 'user_message',
          content: `Throughput test ${i + 1}`,
          messageId: i + 1
        }));
        
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      await waitFor(() => responses.length >= messageCount * 0.9, 30000); // Allow 90% success
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      const messagesPerSecond = responses.length / (duration / 1000);
      
      expect(responses.length).toBeGreaterThan(messageCount * 0.8); // At least 80% success
      expect(messagesPerSecond).toBeGreaterThan(1); // At least 1 message per second
      
      testInstances.push({
        id: instanceConfig.id,
        port: instanceConfig.port,
        clients: [client]
      });
    });
  });
});
