/**
 * Integration Tests for WebSocket Connections and Streaming Behavior
 * Tests real-time communication, connection management, and message handling
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/test-environment-node';
import WebSocket from 'ws';
import MockApiServer from '../mock-servers/mock-api-server';
import {
  webSocketTestData,
  streamingTickerTestData,
  performanceTestData,
  delay,
  waitForCondition
} from '../fixtures/test-data';

// WebSocket test utilities
interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: number;
  id?: string;
}

interface WebSocketConnection {
  ws: WebSocket;
  id: string;
  messages: WebSocketMessage[];
  isConnected: boolean;
  errors: Error[];
}

// Helper functions
const createWebSocketConnection = (url: string, protocols?: string[]): Promise<WebSocketConnection> => {
  return new Promise((resolve, reject) => {
    const connectionId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const connection: WebSocketConnection = {
      ws: new WebSocket(url, protocols),
      id: connectionId,
      messages: [],
      isConnected: false,
      errors: []
    };

    const timeout = setTimeout(() => {
      connection.ws.close();
      reject(new Error('WebSocket connection timeout'));
    }, webSocketTestData.connectionTimeout);

    connection.ws.on('open', () => {
      clearTimeout(timeout);
      connection.isConnected = true;
      resolve(connection);
    });

    connection.ws.on('message', (data: WebSocket.Data) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        connection.messages.push(message);
      } catch (error) {
        connection.messages.push({
          type: 'raw',
          data: data.toString(),
          timestamp: Date.now()
        });
      }
    });

    connection.ws.on('error', (error: Error) => {
      clearTimeout(timeout);
      connection.errors.push(error);
      reject(error);
    });

    connection.ws.on('close', () => {
      connection.isConnected = false;
    });
  });
};

const sendWebSocketMessage = (connection: WebSocketConnection, message: WebSocketMessage): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!connection.isConnected) {
      reject(new Error('WebSocket not connected'));
      return;
    }

    try {
      connection.ws.send(JSON.stringify(message));
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

const waitForWebSocketMessage = (connection: WebSocketConnection, predicate: (msg: WebSocketMessage) => boolean, timeout: number = 5000): Promise<WebSocketMessage> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkMessages = () => {
      const message = connection.messages.find(predicate);
      if (message) {
        resolve(message);
        return;
      }

      if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for WebSocket message'));
        return;
      }

      setTimeout(checkMessages, 100);
    };

    checkMessages();
  });
};

describe('WebSocket Connections Integration Tests', () => {
  let mockServer: MockApiServer;
  let mockWsServer: any;
  let wsPort: number;

  beforeAll(async () => {
    // Start mock API server
    mockServer = new MockApiServer({
      port: 3006,
      cors: true,
      logging: false
    });
    await mockServer.start();

    // Start mock WebSocket server
    wsPort = 8080;
    const { Server } = await import('ws');

    mockWsServer = new Server({
      port: wsPort,
      perMessageDeflate: false
    });

    // Mock WebSocket server handlers
    mockWsServer.on('connection', (ws: WebSocket, req: any) => {
      console.log(`WebSocket connection established from ${req.socket.remoteAddress}`);

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        data: {
          connectionId: `ws-${Date.now()}`,
          timestamp: Date.now()
        }
      }));

      // Handle incoming messages
      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());

          // Echo message back with acknowledgment
          ws.send(JSON.stringify({
            type: 'ack',
            data: {
              originalMessage: message,
              timestamp: Date.now()
            }
          }));

          // Handle specific message types
          switch (message.type) {
            case 'ping':
              ws.send(JSON.stringify({
                type: 'pong',
                data: { timestamp: Date.now() }
              }));
              break;

            case 'subscribe':
              ws.send(JSON.stringify({
                type: 'subscribed',
                data: { channel: message.data.channel, timestamp: Date.now() }
              }));

              // Send periodic updates for subscribed channel
              const interval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    type: 'channel_update',
                    data: {
                      channel: message.data.channel,
                      update: `Update at ${new Date().toISOString()}`,
                      timestamp: Date.now()
                    }
                  }));
                } else {
                  clearInterval(interval);
                }
              }, 2000);
              break;

            case 'broadcast':
              // Broadcast to all connected clients
              mockWsServer.clients.forEach((client: WebSocket) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'broadcast_message',
                    data: message.data
                  }));
                }
              });
              break;
          }

        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            data: { error: 'Invalid message format' }
          }));
        }
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed');
      });

      ws.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
      });
    });

    await new Promise<void>((resolve) => {
      mockWsServer.on('listening', () => {
        console.log(`Mock WebSocket server started on port ${wsPort}`);
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (mockWsServer) {
      await new Promise<void>((resolve) => {
        mockWsServer.close(() => {
          console.log('Mock WebSocket server stopped');
          resolve();
        });
      });
    }

    if (mockServer) {
      await mockServer.stop();
    }
  });

  describe('WebSocket Connection Establishment', () => {
    test('should establish WebSocket connection successfully', async () => {
      const connection = await createWebSocketConnection(`ws://localhost:${wsPort}`);

      expect(connection.isConnected).toBe(true);
      expect(connection.ws.readyState).toBe(WebSocket.OPEN);

      // Should receive welcome message
      const welcomeMessage = await waitForWebSocketMessage(
        connection,
        msg => msg.type === 'welcome'
      );

      expect(welcomeMessage.type).toBe('welcome');
      expect(welcomeMessage.data.connectionId).toBeDefined();

      connection.ws.close();
    });

    test('should handle connection timeout', async () => {
      // Try to connect to non-existent server
      await expect(
        createWebSocketConnection('ws://localhost:9999')
      ).rejects.toThrow(/timeout|ECONNREFUSED/);
    });

    test('should handle connection with subprotocols', async () => {
      const connection = await createWebSocketConnection(
        `ws://localhost:${wsPort}`,
        ['chat', 'streaming']
      );

      expect(connection.isConnected).toBe(true);
      connection.ws.close();
    });

    test('should handle connection errors gracefully', async () => {
      // Invalid URL should cause error
      await expect(
        createWebSocketConnection('invalid-url')
      ).rejects.toThrow();
    });
  });

  describe('Message Exchange and Communication', () => {
    let connection: WebSocketConnection;

    beforeEach(async () => {
      connection = await createWebSocketConnection(`ws://localhost:${wsPort}`);
      // Wait for welcome message
      await waitForWebSocketMessage(connection, msg => msg.type === 'welcome');
    });

    afterEach(() => {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.close();
      }
    });

    test('should send and receive messages', async () => {
      const testMessage: WebSocketMessage = {
        type: 'test',
        data: { content: 'Hello WebSocket!' }
      };

      await sendWebSocketMessage(connection, testMessage);

      // Should receive acknowledgment
      const ackMessage = await waitForWebSocketMessage(
        connection,
        msg => msg.type === 'ack'
      );

      expect(ackMessage.type).toBe('ack');
      expect(ackMessage.data.originalMessage).toEqual(testMessage);
    });

    test('should handle ping-pong messages', async () => {
      const pingMessage: WebSocketMessage = {
        type: 'ping',
        data: 'test-ping'
      };

      await sendWebSocketMessage(connection, pingMessage);

      // Should receive pong response
      const pongMessage = await waitForWebSocketMessage(
        connection,
        msg => msg.type === 'pong'
      );

      expect(pongMessage.type).toBe('pong');
      expect(pongMessage.data.timestamp).toBeDefined();
    });

    test('should handle subscription messages', async () => {
      const subscribeMessage: WebSocketMessage = {
        type: 'subscribe',
        data: { channel: 'test-channel' }
      };

      await sendWebSocketMessage(connection, subscribeMessage);

      // Should receive subscription confirmation
      const subscribedMessage = await waitForWebSocketMessage(
        connection,
        msg => msg.type === 'subscribed'
      );

      expect(subscribedMessage.type).toBe('subscribed');
      expect(subscribedMessage.data.channel).toBe('test-channel');

      // Should receive periodic updates
      const updateMessage = await waitForWebSocketMessage(
        connection,
        msg => msg.type === 'channel_update',
        10000
      );

      expect(updateMessage.type).toBe('channel_update');
      expect(updateMessage.data.channel).toBe('test-channel');
    });

    test('should handle large messages', async () => {
      const largeData = 'x'.repeat(10000); // 10KB message
      const largeMessage: WebSocketMessage = {
        type: 'large_test',
        data: { content: largeData }
      };

      await sendWebSocketMessage(connection, largeMessage);

      const ackMessage = await waitForWebSocketMessage(
        connection,
        msg => msg.type === 'ack'
      );

      expect(ackMessage.data.originalMessage.data.content).toBe(largeData);
    });

    test('should handle malformed messages gracefully', async () => {
      // Send malformed JSON
      connection.ws.send('invalid json {');

      // Should receive error message
      const errorMessage = await waitForWebSocketMessage(
        connection,
        msg => msg.type === 'error'
      );

      expect(errorMessage.type).toBe('error');
      expect(errorMessage.data.error).toContain('Invalid message format');
    });
  });

  describe('Multiple Connections and Broadcasting', () => {
    test('should handle multiple concurrent connections', async () => {
      const connectionCount = 5;
      const connections: WebSocketConnection[] = [];

      try {
        // Create multiple connections
        for (let i = 0; i < connectionCount; i++) {
          const connection = await createWebSocketConnection(`ws://localhost:${wsPort}`);
          connections.push(connection);

          // Wait for welcome message
          await waitForWebSocketMessage(connection, msg => msg.type === 'welcome');
        }

        expect(connections.length).toBe(connectionCount);

        // All connections should be active
        connections.forEach(conn => {
          expect(conn.isConnected).toBe(true);
        });

        // Send messages from each connection
        for (let i = 0; i < connections.length; i++) {
          await sendWebSocketMessage(connections[i], {
            type: 'test',
            data: { connectionIndex: i }
          });

          // Should receive ack
          await waitForWebSocketMessage(
            connections[i],
            msg => msg.type === 'ack'
          );
        }

      } finally {
        // Clean up all connections
        connections.forEach(conn => {
          if (conn.ws.readyState === WebSocket.OPEN) {
            conn.ws.close();
          }
        });
      }
    });

    test('should handle message broadcasting between connections', async () => {
      const connection1 = await createWebSocketConnection(`ws://localhost:${wsPort}`);
      const connection2 = await createWebSocketConnection(`ws://localhost:${wsPort}`);

      try {
        // Wait for welcome messages
        await waitForWebSocketMessage(connection1, msg => msg.type === 'welcome');
        await waitForWebSocketMessage(connection2, msg => msg.type === 'welcome');

        // Send broadcast message from connection1
        const broadcastMessage: WebSocketMessage = {
          type: 'broadcast',
          data: { message: 'Hello from connection1!' }
        };

        await sendWebSocketMessage(connection1, broadcastMessage);

        // Connection2 should receive the broadcast
        const receivedBroadcast = await waitForWebSocketMessage(
          connection2,
          msg => msg.type === 'broadcast_message'
        );

        expect(receivedBroadcast.type).toBe('broadcast_message');
        expect(receivedBroadcast.data.message).toBe('Hello from connection1!');

      } finally {
        connection1.ws.close();
        connection2.ws.close();
      }
    });
  });

  describe('Connection Management and Resilience', () => {
    test('should handle connection drops gracefully', async () => {
      const connection = await createWebSocketConnection(`ws://localhost:${wsPort}`);

      // Wait for welcome message
      await waitForWebSocketMessage(connection, msg => msg.type === 'welcome');

      expect(connection.isConnected).toBe(true);

      // Force close connection
      connection.ws.close();

      // Wait for connection to close
      await waitForCondition(() => !connection.isConnected, 3000);

      expect(connection.isConnected).toBe(false);
      expect(connection.ws.readyState).toBe(WebSocket.CLOSED);
    });

    test('should handle reconnection scenarios', async () => {
      // Initial connection
      let connection = await createWebSocketConnection(`ws://localhost:${wsPort}`);
      await waitForWebSocketMessage(connection, msg => msg.type === 'welcome');

      const originalId = connection.id;

      // Close connection
      connection.ws.close();
      await waitForCondition(() => !connection.isConnected, 3000);

      // Reconnect
      connection = await createWebSocketConnection(`ws://localhost:${wsPort}`);
      await waitForWebSocketMessage(connection, msg => msg.type === 'welcome');

      expect(connection.isConnected).toBe(true);
      expect(connection.id).not.toBe(originalId); // New connection should have new ID

      connection.ws.close();
    });

    test('should handle server-side connection termination', async () => {
      const connection = await createWebSocketConnection(`ws://localhost:${wsPort}`);
      await waitForWebSocketMessage(connection, msg => msg.type === 'welcome');

      // Simulate server closing connection by closing from server side
      // In real scenario, server would close the connection
      const originalClose = connection.ws.close;
      let serverClosed = false;

      connection.ws.on('close', (code, reason) => {
        serverClosed = true;
      });

      // Force close to simulate server termination
      connection.ws.terminate();

      await waitForCondition(() => serverClosed, 3000);

      expect(serverClosed).toBe(true);
      expect(connection.ws.readyState).toBe(WebSocket.CLOSED);
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle high-frequency message sending', async () => {
      const connection = await createWebSocketConnection(`ws://localhost:${wsPort}`);
      await waitForWebSocketMessage(connection, msg => msg.type === 'welcome');

      const messageCount = 100;
      const startTime = Date.now();

      // Send many messages rapidly
      const sendPromises = [];
      for (let i = 0; i < messageCount; i++) {
        sendPromises.push(
          sendWebSocketMessage(connection, {
            type: 'test',
            data: { messageIndex: i }
          })
        );
      }

      await Promise.all(sendPromises);

      // Wait for all acknowledgments
      const ackPromises = [];
      for (let i = 0; i < messageCount; i++) {
        ackPromises.push(
          waitForWebSocketMessage(
            connection,
            msg => msg.type === 'ack' && msg.data.originalMessage.data.messageIndex === i
          )
        );
      }

      await Promise.allSettled(ackPromises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Sent ${messageCount} messages in ${duration}ms`);

      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      connection.ws.close();
    }, 15000);

    test('should measure connection establishment performance', async () => {
      const connectionCount = 10;
      const connectionTimes: number[] = [];

      const connections: WebSocketConnection[] = [];

      try {
        for (let i = 0; i < connectionCount; i++) {
          const startTime = Date.now();
          const connection = await createWebSocketConnection(`ws://localhost:${wsPort}`);
          const endTime = Date.now();

          connections.push(connection);
          connectionTimes.push(endTime - startTime);

          await waitForWebSocketMessage(connection, msg => msg.type === 'welcome');
        }

        // All connections should be established reasonably quickly
        connectionTimes.forEach(time => {
          expect(time).toBeLessThan(3000); // 3 seconds max per connection
        });

        const avgTime = connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length;
        console.log(`Average connection time: ${avgTime}ms`);

        expect(avgTime).toBeLessThan(1000); // 1 second average

      } finally {
        connections.forEach(conn => {
          if (conn.ws.readyState === WebSocket.OPEN) {
            conn.ws.close();
          }
        });
      }
    }, 30000);
  });

  describe('Message Ordering and Reliability', () => {
    test('should maintain message order', async () => {
      const connection = await createWebSocketConnection(`ws://localhost:${wsPort}`);
      await waitForWebSocketMessage(connection, msg => msg.type === 'welcome');

      const messageCount = 20;
      const sentMessages: number[] = [];

      // Send messages with sequence numbers
      for (let i = 0; i < messageCount; i++) {
        await sendWebSocketMessage(connection, {
          type: 'sequence_test',
          data: { sequence: i }
        });
        sentMessages.push(i);
      }

      // Wait for all acknowledgments
      const ackMessages: WebSocketMessage[] = [];
      for (let i = 0; i < messageCount; i++) {
        const ack = await waitForWebSocketMessage(
          connection,
          msg => msg.type === 'ack' && msg.data.originalMessage.type === 'sequence_test'
        );
        ackMessages.push(ack);
      }

      // Check if messages were received in order
      const receivedSequences = ackMessages
        .map(msg => msg.data.originalMessage.data.sequence)
        .slice(0, messageCount); // Take only the expected count

      expect(receivedSequences).toEqual(sentMessages);

      connection.ws.close();
    }, 10000);

    test('should handle message delivery confirmation', async () => {
      const connection = await createWebSocketConnection(`ws://localhost:${wsPort}`);
      await waitForWebSocketMessage(connection, msg => msg.type === 'welcome');

      const testMessage: WebSocketMessage = {
        type: 'delivery_test',
        data: { content: 'Test delivery confirmation' },
        id: `msg-${Date.now()}`
      };

      await sendWebSocketMessage(connection, testMessage);

      // Should receive acknowledgment with message ID
      const ackMessage = await waitForWebSocketMessage(
        connection,
        msg => msg.type === 'ack' && msg.data.originalMessage.id === testMessage.id
      );

      expect(ackMessage.data.originalMessage.id).toBe(testMessage.id);

      connection.ws.close();
    });
  });
});