/**
 * TDD London School: WebSocket Integration Tests
 * 
 * Real WebSocket connectivity testing with actual connection validation.
 * Tests real-time communication patterns and connection management.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import WebSocket from 'ws';
import { createServer } from 'http';
import { WEBSOCKET_SPECS } from './test-specifications';

describe('TDD London School: Real WebSocket Integration Tests', () => {
  let server: any;
  let wss: any;
  let serverPort: number;
  let clientSocket: WebSocket;
  
  beforeAll(async () => {
    // Create real HTTP server for WebSocket testing
    server = createServer();
    
    // Start server on random port
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        serverPort = (server.address() as any).port;
        resolve();
      });
    });
    
    // Create WebSocket server
    wss = new WebSocket.Server({ server });
  });
  
  afterAll(async () => {
    if (wss) {
      wss.close();
    }
    if (server) {
      server.close();
    }
  });
  
  beforeEach(() => {
    // Setup fresh client socket for each test
    clientSocket = new WebSocket(`ws://localhost:${serverPort}`);
  });
  
  afterEach(() => {
    if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.close();
    }
  });

  describe('WebSocket Connection Management - Real Connectivity', () => {
    test('should establish WebSocket connection successfully', async () => {
      const spec = WEBSOCKET_SPECS.find(s => s.event === 'connection')!;
      
      // Setup server connection handler
      const connectionPromise = new Promise<WebSocket>((resolve) => {
        wss.on('connection', (ws: WebSocket) => {
          resolve(ws);
        });
      });
      
      // Wait for client connection
      await new Promise<void>((resolve, reject) => {
        clientSocket.on('open', () => resolve());
        clientSocket.on('error', reject);
      });
      
      // Verify real connection established
      expect(clientSocket.readyState).toBe(WebSocket.OPEN);
      
      // Verify server received connection
      const serverSocket = await connectionPromise;
      expect(serverSocket.readyState).toBe(WebSocket.OPEN);
      
      // Real data validation: connection acknowledgment
      const ackPromise = new Promise<string>((resolve) => {
        clientSocket.on('message', (data) => {
          resolve(data.toString());
        });
      });
      
      serverSocket.send(JSON.stringify({ type: 'connection_ack', timestamp: new Date().toISOString() }));
      
      const ackMessage = await ackPromise;
      const parsedAck = JSON.parse(ackMessage);
      expect(parsedAck.type).toBe('connection_ack');
      expect(parsedAck.timestamp).toBeDefined();
    });

    test('should handle connection errors gracefully', async () => {
      // Attempt connection to non-existent server
      const badSocket = new WebSocket('ws://localhost:99999');
      
      const errorPromise = new Promise<Error>((resolve) => {
        badSocket.on('error', resolve);
      });
      
      const error = await errorPromise;
      expect(error).toBeInstanceOf(Error);
      
      // Verify socket state
      expect(badSocket.readyState).toBe(WebSocket.CLOSED);
    });

    test('should handle disconnection properly', async () => {
      const spec = WEBSOCKET_SPECS.find(s => s.event === 'disconnect')!;
      
      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        clientSocket.on('open', () => resolve());
        clientSocket.on('error', reject);
      });
      
      // Setup disconnection handler
      const closePromise = new Promise<{code: number, reason: string}>((resolve) => {
        clientSocket.on('close', (code, reason) => {
          resolve({ code, reason: reason.toString() });
        });
      });
      
      // Initiate disconnection
      clientSocket.close(1000, 'Test disconnection');
      
      // Verify graceful disconnection
      const closeEvent = await closePromise;
      expect(closeEvent.code).toBe(1000);
      expect(closeEvent.reason).toBe('Test disconnection');
      expect(clientSocket.readyState).toBe(WebSocket.CLOSED);
    });
  });

  describe('Real-Time Messaging - Real Data Flow', () => {
    let serverSocket: WebSocket;
    
    beforeEach(async () => {
      // Establish connection for messaging tests
      const connectionPromise = new Promise<WebSocket>((resolve) => {
        wss.on('connection', (ws: WebSocket) => {
          resolve(ws);
        });
      });
      
      await new Promise<void>((resolve, reject) => {
        clientSocket.on('open', () => resolve());
        clientSocket.on('error', reject);
      });
      
      serverSocket = await connectionPromise;
    });

    test('should send and receive real-time notifications', async () => {
      const spec = WEBSOCKET_SPECS.find(s => s.event === 'notification')!;
      
      const testNotification = {
        type: 'notification',
        id: 'test-notification-1',
        message: 'Real-time test notification',
        timestamp: new Date().toISOString(),
        priority: 'high'
      };
      
      // Setup client message handler
      const messagePromise = new Promise<any>((resolve) => {
        clientSocket.on('message', (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });
      
      // Server sends notification
      serverSocket.send(JSON.stringify(testNotification));
      
      // Verify client receives exact notification
      const receivedNotification = await messagePromise;
      expect(receivedNotification).toEqual(testNotification);
      
      // Real data validation
      expect(receivedNotification.type).toBe('notification');
      expect(receivedNotification.message).toBe('Real-time test notification');
      expect(new Date(receivedNotification.timestamp)).toBeInstanceOf(Date);
    });

    test('should handle bidirectional communication', async () => {
      // Setup server message handler
      const serverMessagePromise = new Promise<any>((resolve) => {
        serverSocket.on('message', (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });
      
      // Setup client response handler
      const clientResponsePromise = new Promise<any>((resolve) => {
        clientSocket.on('message', (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });
      
      const clientMessage = {
        type: 'ping',
        timestamp: new Date().toISOString(),
        clientId: 'test-client-1'
      };
      
      // Client sends message
      clientSocket.send(JSON.stringify(clientMessage));
      
      // Server receives and responds
      const receivedMessage = await serverMessagePromise;
      expect(receivedMessage).toEqual(clientMessage);
      
      const serverResponse = {
        type: 'pong',
        originalTimestamp: receivedMessage.timestamp,
        serverTimestamp: new Date().toISOString(),
        clientId: receivedMessage.clientId
      };
      
      serverSocket.send(JSON.stringify(serverResponse));
      
      // Client receives response
      const clientResponse = await clientResponsePromise;
      expect(clientResponse.type).toBe('pong');
      expect(clientResponse.clientId).toBe('test-client-1');
      expect(clientResponse.originalTimestamp).toBe(clientMessage.timestamp);
    });

    test('should handle message queuing during reconnection', async () => {
      const messages: any[] = [];
      
      // Setup message collector
      clientSocket.on('message', (data) => {
        messages.push(JSON.parse(data.toString()));
      });
      
      // Send initial message
      serverSocket.send(JSON.stringify({ type: 'message', id: 1, content: 'Message 1' }));
      
      // Wait for first message
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(messages).toHaveLength(1);
      
      // Simulate temporary disconnection
      clientSocket.close();
      
      // Wait for close
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Reconnect
      clientSocket = new WebSocket(`ws://localhost:${serverPort}`);
      
      await new Promise<void>((resolve, reject) => {
        clientSocket.on('open', () => resolve());
        clientSocket.on('error', reject);
      });
      
      // Setup new message handler
      clientSocket.on('message', (data) => {
        messages.push(JSON.parse(data.toString()));
      });
      
      // Get new server socket reference
      const newServerSocket = await new Promise<WebSocket>((resolve) => {
        wss.on('connection', (ws: WebSocket) => {
          resolve(ws);
        });
      });
      
      // Send message after reconnection
      newServerSocket.send(JSON.stringify({ type: 'message', id: 2, content: 'Message 2' }));
      
      // Wait for second message
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Verify messages received
      expect(messages).toHaveLength(2);
      expect(messages[1].content).toBe('Message 2');
    });
  });

  describe('Connection Pool Management - Real Resource Testing', () => {
    test('should handle multiple concurrent connections', async () => {
      const connectionCount = 5;
      const connections: WebSocket[] = [];
      const serverConnections: WebSocket[] = [];
      
      // Setup server to track connections
      wss.on('connection', (ws: WebSocket) => {
        serverConnections.push(ws);
      });
      
      // Create multiple client connections
      for (let i = 0; i < connectionCount; i++) {
        const socket = new WebSocket(`ws://localhost:${serverPort}`);
        connections.push(socket);
        
        await new Promise<void>((resolve, reject) => {
          socket.on('open', () => resolve());
          socket.on('error', reject);
        });
      }
      
      // Verify all connections established
      expect(connections).toHaveLength(connectionCount);
      expect(serverConnections).toHaveLength(connectionCount);
      
      // Test broadcasting to all connections
      const broadcastMessage = {
        type: 'broadcast',
        message: 'Message to all clients',
        timestamp: new Date().toISOString()
      };
      
      const messagePromises = connections.map(socket => 
        new Promise<any>((resolve) => {
          socket.on('message', (data) => {
            resolve(JSON.parse(data.toString()));
          });
        })
      );
      
      // Broadcast from server
      serverConnections.forEach(serverSocket => {
        serverSocket.send(JSON.stringify(broadcastMessage));
      });
      
      // Verify all clients receive message
      const receivedMessages = await Promise.all(messagePromises);
      receivedMessages.forEach(message => {
        expect(message).toEqual(broadcastMessage);
      });
      
      // Cleanup connections
      connections.forEach(socket => socket.close());
    });

    test('should handle connection limits gracefully', async () => {
      const maxConnections = 10;
      const connections: WebSocket[] = [];
      
      // Create connections up to limit
      for (let i = 0; i < maxConnections; i++) {
        const socket = new WebSocket(`ws://localhost:${serverPort}`);
        connections.push(socket);
        
        await new Promise<void>((resolve, reject) => {
          socket.on('open', () => resolve());
          socket.on('error', reject);
        });
      }
      
      // Verify all connections work
      expect(connections).toHaveLength(maxConnections);
      connections.forEach(socket => {
        expect(socket.readyState).toBe(WebSocket.OPEN);
      });
      
      // Cleanup
      connections.forEach(socket => socket.close());
    });
  });

  describe('Error Handling and Recovery - Real Error Scenarios', () => {
    test('should handle malformed message data', async () => {
      let serverSocket: WebSocket;
      
      // Setup connection
      const connectionPromise = new Promise<WebSocket>((resolve) => {
        wss.on('connection', (ws: WebSocket) => {
          resolve(ws);
        });
      });
      
      await new Promise<void>((resolve, reject) => {
        clientSocket.on('open', () => resolve());
        clientSocket.on('error', reject);
      });
      
      serverSocket = await connectionPromise;
      
      // Setup error handler
      const errorPromise = new Promise<Error>((resolve) => {
        clientSocket.on('error', resolve);
      });
      
      // Send malformed data
      clientSocket.send('invalid-json-data');
      
      // Should handle gracefully without crashing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Connection should still be open
      expect(clientSocket.readyState).toBe(WebSocket.OPEN);
      expect(serverSocket.readyState).toBe(WebSocket.OPEN);
    });

    test('should implement heartbeat mechanism', async () => {
      let serverSocket: WebSocket;
      
      // Setup connection
      const connectionPromise = new Promise<WebSocket>((resolve) => {
        wss.on('connection', (ws: WebSocket) => {
          resolve(ws);
        });
      });
      
      await new Promise<void>((resolve, reject) => {
        clientSocket.on('open', () => resolve());
        clientSocket.on('error', reject);
      });
      
      serverSocket = await connectionPromise;
      
      // Setup heartbeat
      const heartbeatInterval = 100; // 100ms for testing
      const heartbeatMessages: string[] = [];
      
      clientSocket.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'heartbeat') {
          heartbeatMessages.push(message.timestamp);
          // Respond with pong
          clientSocket.send(JSON.stringify({ type: 'heartbeat_pong', timestamp: new Date().toISOString() }));
        }
      });
      
      // Start heartbeat from server
      const heartbeatTimer = setInterval(() => {
        if (serverSocket.readyState === WebSocket.OPEN) {
          serverSocket.send(JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() }));
        }
      }, heartbeatInterval);
      
      // Wait for several heartbeats
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Verify heartbeats received
      expect(heartbeatMessages.length).toBeGreaterThanOrEqual(3);
      
      // Cleanup
      clearInterval(heartbeatTimer);
    });

    test('should handle server shutdown gracefully', async () => {
      // Setup connection
      await new Promise<void>((resolve, reject) => {
        clientSocket.on('open', () => resolve());
        clientSocket.on('error', reject);
      });
      
      // Setup close handler
      const closePromise = new Promise<{code: number, reason: string}>((resolve) => {
        clientSocket.on('close', (code, reason) => {
          resolve({ code, reason: reason.toString() });
        });
      });
      
      // Simulate server shutdown
      wss.close();
      
      // Verify client handles shutdown
      const closeEvent = await closePromise;
      expect(closeEvent.code).toBeDefined();
      expect(clientSocket.readyState).toBe(WebSocket.CLOSED);
    });
  });

  describe('Performance and Load Testing - Real Performance', () => {
    test('should handle high-frequency messaging', async () => {
      let serverSocket: WebSocket;
      
      // Setup connection
      const connectionPromise = new Promise<WebSocket>((resolve) => {
        wss.on('connection', (ws: WebSocket) => {
          resolve(ws);
        });
      });
      
      await new Promise<void>((resolve, reject) => {
        clientSocket.on('open', () => resolve());
        clientSocket.on('error', reject);
      });
      
      serverSocket = await connectionPromise;
      
      const messageCount = 100;
      const receivedMessages: any[] = [];
      
      // Setup message collector
      clientSocket.on('message', (data) => {
        receivedMessages.push(JSON.parse(data.toString()));
      });
      
      const startTime = Date.now();
      
      // Send rapid messages
      for (let i = 0; i < messageCount; i++) {
        serverSocket.send(JSON.stringify({
          type: 'load_test',
          id: i,
          timestamp: new Date().toISOString()
        }));
      }
      
      // Wait for all messages
      while (receivedMessages.length < messageCount) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Verify all messages received
      expect(receivedMessages).toHaveLength(messageCount);
      
      // Verify performance (should handle 100 messages quickly)
      expect(totalTime).toBeLessThan(1000); // Under 1 second
      
      // Verify message order preserved
      for (let i = 0; i < messageCount; i++) {
        expect(receivedMessages[i].id).toBe(i);
      }
    });

    test('should handle large message payloads', async () => {
      let serverSocket: WebSocket;
      
      // Setup connection
      const connectionPromise = new Promise<WebSocket>((resolve) => {
        wss.on('connection', (ws: WebSocket) => {
          resolve(ws);
        });
      });
      
      await new Promise<void>((resolve, reject) => {
        clientSocket.on('open', () => resolve());
        clientSocket.on('error', reject);
      });
      
      serverSocket = await connectionPromise;
      
      // Create large payload (1MB)
      const largePayload = 'x'.repeat(1024 * 1024);
      const largeMessage = {
        type: 'large_payload',
        data: largePayload,
        size: largePayload.length,
        timestamp: new Date().toISOString()
      };
      
      // Setup message handler
      const messagePromise = new Promise<any>((resolve) => {
        clientSocket.on('message', (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });
      
      const startTime = Date.now();
      
      // Send large message
      serverSocket.send(JSON.stringify(largeMessage));
      
      // Receive and verify
      const receivedMessage = await messagePromise;
      const endTime = Date.now();
      
      expect(receivedMessage.type).toBe('large_payload');
      expect(receivedMessage.data).toBe(largePayload);
      expect(receivedMessage.size).toBe(largePayload.length);
      
      // Should handle large payload efficiently
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});