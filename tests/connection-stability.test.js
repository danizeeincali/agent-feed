/**
 * TDD Connection Stability Test Suite
 * Tests for Redis-free operation and WebSocket resilience
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { io as ClientIO } from 'socket.io-client';

describe('Connection Stability Tests', () => {
  let server;
  let httpServer;
  let socketServer;
  let clientSocket;
  let serverSocket;

  beforeAll(async () => {
    // Create test server without Redis dependency
    httpServer = createServer();
    socketServer = new Server(httpServer, {
      cors: {
        origin: "http://localhost:3001",
        methods: ["GET", "POST"]
      },
      transports: ['polling', 'websocket'],
      upgrade: true,
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Listen on test port
    await new Promise((resolve) => {
      httpServer.listen(0, resolve);
    });

    const port = httpServer.address().port;
    const serverUrl = `http://localhost:${port}`;

    // Setup server socket handler
    socketServer.on('connection', (socket) => {
      serverSocket = socket;
      
      // Echo back all events for testing
      socket.onAny((event, data) => {
        socket.emit(`${event}:response`, { success: true, data });
      });
      
      // Simulate agent status responses
      socket.on('agent:status:request', () => {
        socket.emit('agent:status:response', {
          agents: [
            { id: 'test-agent-1', status: 'active', name: 'Test Agent 1' },
            { id: 'test-agent-2', status: 'idle', name: 'Test Agent 2' }
          ]
        });
      });
      
      // System stats simulation
      socket.emit('system:stats', {
        connectedUsers: 1,
        activeRooms: 2,
        totalSockets: 1,
        timestamp: new Date().toISOString()
      });
    });

    // Create client socket
    clientSocket = ClientIO(serverUrl, {
      transports: ['polling', 'websocket'],
      upgrade: true,
      timeout: 5000,
      forceNew: true
    });

    // Wait for connection
    await new Promise((resolve, reject) => {
      clientSocket.on('connect', resolve);
      clientSocket.on('connect_error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  });

  afterAll(async () => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    if (socketServer) {
      socketServer.close();
    }
    if (httpServer) {
      httpServer.close();
    }
  });

  beforeEach(() => {
    // Clear any event listeners before each test
    if (clientSocket) {
      clientSocket.removeAllListeners();
    }
  });

  describe('WebSocket Connection Resilience', () => {
    test('should establish connection without Redis', (done) => {
      expect(clientSocket.connected).toBe(true);
      expect(clientSocket.id).toBeDefined();
      done();
    });

    test('should handle polling transport fallback', (done) => {
      const testSocket = ClientIO(httpServer.address().port, {
        transports: ['polling'], // Force polling only
        timeout: 3000
      });

      testSocket.on('connect', () => {
        expect(testSocket.connected).toBe(true);
        testSocket.disconnect();
        done();
      });

      testSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    test('should emit and receive events correctly', (done) => {
      const testData = { message: 'test', timestamp: Date.now() };
      
      clientSocket.on('test:response', (response) => {
        expect(response.success).toBe(true);
        expect(response.data).toEqual(testData);
        done();
      });

      clientSocket.emit('test', testData);
    });

    test('should handle agent status requests', (done) => {
      clientSocket.on('agent:status:response', (data) => {
        expect(data.agents).toHaveLength(2);
        expect(data.agents[0]).toHaveProperty('id');
        expect(data.agents[0]).toHaveProperty('status');
        expect(data.agents[0]).toHaveProperty('name');
        done();
      });

      clientSocket.emit('agent:status:request');
    });

    test('should receive system stats', (done) => {
      clientSocket.on('system:stats', (stats) => {
        expect(stats).toHaveProperty('connectedUsers');
        expect(stats).toHaveProperty('activeRooms');
        expect(stats).toHaveProperty('totalSockets');
        expect(stats).toHaveProperty('timestamp');
        done();
      });
    });

    test('should handle disconnection gracefully', (done) => {
      const testSocket = ClientIO(`http://localhost:${httpServer.address().port}`, {
        transports: ['polling', 'websocket']
      });

      testSocket.on('connect', () => {
        testSocket.on('disconnect', (reason) => {
          expect(reason).toBeDefined();
          done();
        });
        
        testSocket.disconnect();
      });
    });

    test('should support subscription patterns', (done) => {
      clientSocket.on('subscribe:feed:response', (response) => {
        expect(response.success).toBe(true);
        expect(response.data.feedId).toBe('test-feed-123');
        done();
      });

      clientSocket.emit('subscribe:feed', { feedId: 'test-feed-123' });
    });
  });

  describe('Error Handling', () => {
    test('should handle connection timeout gracefully', (done) => {
      const timeoutSocket = ClientIO('http://localhost:9999', {
        timeout: 1000,
        transports: ['polling']
      });

      timeoutSocket.on('connect_error', (error) => {
        expect(error).toBeDefined();
        timeoutSocket.disconnect();
        done();
      });
    });

    test('should reconnect after temporary disconnection', (done) => {
      let reconnectCount = 0;
      
      const reconnectSocket = ClientIO(`http://localhost:${httpServer.address().port}`, {
        transports: ['polling'],
        reconnection: true,
        reconnectionAttempts: 2,
        reconnectionDelay: 100
      });

      reconnectSocket.on('connect', () => {
        if (reconnectCount === 0) {
          reconnectCount++;
          // Simulate temporary disconnection
          reconnectSocket.disconnect();
        } else {
          // Successful reconnection
          expect(reconnectCount).toBe(1);
          reconnectSocket.disconnect();
          done();
        }
      });

      reconnectSocket.on('disconnect', () => {
        if (reconnectCount === 1) {
          // Auto-reconnect should trigger
          setTimeout(() => {
            reconnectSocket.connect();
          }, 200);
        }
      });
    }, 10000);
  });

  describe('Performance Tests', () => {
    test('should handle multiple rapid events', (done) => {
      let responseCount = 0;
      const expectedCount = 10;

      clientSocket.on('rapid:response', () => {
        responseCount++;
        if (responseCount === expectedCount) {
          done();
        }
      });

      // Send multiple events rapidly
      for (let i = 0; i < expectedCount; i++) {
        clientSocket.emit('rapid', { index: i });
      }
    });

    test('should maintain connection under load', async () => {
      const promises = [];
      
      for (let i = 0; i < 50; i++) {
        promises.push(new Promise((resolve) => {
          clientSocket.emit('load-test', { iteration: i });
          clientSocket.once('load-test:response', resolve);
        }));
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(50);
    });
  });
});