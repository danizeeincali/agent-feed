import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import streamingRouter from '../../../src/api/routes/streaming-ticker.js';
import StreamingTickerManager from '../../../src/services/StreamingTickerManager.js';

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/streaming-ticker', streamingRouter);
  return app;
};

describe('Streaming Ticker Routes Integration', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    // Clear all connections before each test
    StreamingTickerManager.connections.clear();
  });

  afterEach(() => {
    StreamingTickerManager.connections.clear();
    vi.clearAllMocks();
  });

  describe('GET /stream', () => {
    it('should establish SSE connection with proper headers', (done) => {
      const req = request(app)
        .get('/api/streaming-ticker/stream')
        .query({ userId: 'testuser' })
        .expect(200)
        .expect('Content-Type', 'text/event-stream; charset=utf-8')
        .expect('Cache-Control', 'no-cache')
        .expect('Connection', 'keep-alive');

      let connectionEventReceived = false;

      req.on('data', (chunk) => {
        const data = chunk.toString();

        if (data.includes('"type":"connection"')) {
          connectionEventReceived = true;
          req.abort();
        }
      });

      req.on('close', () => {
        expect(connectionEventReceived).toBe(true);
        done();
      });

      req.on('error', (err) => {
        if (err.code !== 'ECONNRESET') {
          done(err);
        } else {
          done();
        }
      });
    });

    it('should use anonymous user when no userId provided', (done) => {
      const req = request(app)
        .get('/api/streaming-ticker/stream')
        .expect(200);

      req.on('data', (chunk) => {
        const data = chunk.toString();

        if (data.includes('"type":"connection"')) {
          expect(data).toMatch(/anonymous_\d+_[a-z0-9]+/);
          req.abort();
        }
      });

      req.on('close', () => done());
      req.on('error', (err) => {
        if (err.code !== 'ECONNRESET') {
          done(err);
        } else {
          done();
        }
      });
    });

    it('should start demo stream when demo=true', (done) => {
      const req = request(app)
        .get('/api/streaming-ticker/stream')
        .query({ demo: 'true' })
        .expect(200);

      let executionStartReceived = false;

      req.on('data', (chunk) => {
        const data = chunk.toString();

        if (data.includes('"type":"execution_start"')) {
          executionStartReceived = true;
          req.abort();
        }
      });

      req.on('close', () => {
        expect(executionStartReceived).toBe(true);
        done();
      });

      req.on('error', (err) => {
        if (err.code !== 'ECONNRESET') {
          done(err);
        } else {
          done();
        }
      });
    });

    it('should handle connection errors gracefully', async () => {
      // Mock StreamingTickerManager to throw error
      const originalCreateConnection = StreamingTickerManager.createConnection;
      StreamingTickerManager.createConnection = vi.fn().mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const response = await request(app)
        .get('/api/streaming-ticker/stream')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to establish streaming connection'
      });

      // Restore original method
      StreamingTickerManager.createConnection = originalCreateConnection;
    });
  });

  describe('POST /execute', () => {
    it('should start execution with broadcast when no connectionId', async () => {
      const spy = vi.spyOn(StreamingTickerManager, 'broadcast');

      const response = await request(app)
        .post('/api/streaming-ticker/execute')
        .send({ prompt: 'test prompt' })
        .expect(200);

      expect(response.body).toEqual({
        message: 'Execution started with broadcast'
      });

      expect(spy).toHaveBeenCalledWith({
        type: 'execution_start',
        data: {
          prompt: 'test prompt...',
          timestamp: expect.any(Number)
        }
      });

      spy.mockRestore();
    });

    it('should stream to specific connection when connectionId provided', async () => {
      // Create a mock connection
      const mockConnection = {
        response: { write: vi.fn() },
        userId: 'testuser',
        createdAt: Date.now(),
        lastActivity: Date.now()
      };
      const connectionId = 'test-connection-id';
      StreamingTickerManager.connections.set(connectionId, mockConnection);

      const spy = vi.spyOn(StreamingTickerManager, 'streamClaudeExecution');

      const response = await request(app)
        .post('/api/streaming-ticker/execute')
        .send({
          prompt: 'test prompt',
          connectionId: connectionId
        })
        .expect(200);

      expect(response.body).toEqual({
        message: 'Execution started with streaming',
        connectionId: connectionId
      });

      expect(spy).toHaveBeenCalledWith(connectionId, 'test prompt');

      spy.mockRestore();
    });

    it('should return 400 when prompt is missing', async () => {
      const response = await request(app)
        .post('/api/streaming-ticker/execute')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'Prompt is required'
      });
    });

    it('should broadcast when connectionId does not exist', async () => {
      const spy = vi.spyOn(StreamingTickerManager, 'broadcast');

      const response = await request(app)
        .post('/api/streaming-ticker/execute')
        .send({
          prompt: 'test prompt',
          connectionId: 'nonexistent'
        })
        .expect(200);

      expect(response.body).toEqual({
        message: 'Execution started with broadcast'
      });

      expect(spy).toHaveBeenCalled();

      spy.mockRestore();
    });

    it('should handle execution errors', async () => {
      const originalBroadcast = StreamingTickerManager.broadcast;
      StreamingTickerManager.broadcast = vi.fn().mockImplementation(() => {
        throw new Error('Broadcast failed');
      });

      const response = await request(app)
        .post('/api/streaming-ticker/execute')
        .send({ prompt: 'test prompt' })
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to start execution'
      });

      StreamingTickerManager.broadcast = originalBroadcast;
    });
  });

  describe('POST /message', () => {
    it('should send message to specific connection', async () => {
      const mockConnection = {
        response: { write: vi.fn() },
        userId: 'testuser',
        createdAt: Date.now(),
        lastActivity: Date.now()
      };
      const connectionId = 'test-connection-id';
      StreamingTickerManager.connections.set(connectionId, mockConnection);

      const spy = vi.spyOn(StreamingTickerManager, 'sendToConnection').mockReturnValue(true);

      const response = await request(app)
        .post('/api/streaming-ticker/message')
        .send({
          message: 'test message',
          connectionId: connectionId,
          type: 'info',
          priority: 'high'
        })
        .expect(200);

      expect(response.body).toEqual({
        sent: true,
        connectionId: connectionId
      });

      expect(spy).toHaveBeenCalledWith(connectionId, {
        type: 'info',
        data: {
          message: 'test message',
          timestamp: expect.any(Number),
          priority: 'high'
        }
      });

      spy.mockRestore();
    });

    it('should broadcast message when no connectionId', async () => {
      const spy = vi.spyOn(StreamingTickerManager, 'broadcast').mockReturnValue(3);

      const response = await request(app)
        .post('/api/streaming-ticker/message')
        .send({
          message: 'broadcast message'
        })
        .expect(200);

      expect(response.body).toEqual({
        sentCount: 3
      });

      expect(spy).toHaveBeenCalledWith({
        type: 'custom',
        data: {
          message: 'broadcast message',
          timestamp: expect.any(Number),
          priority: 'medium'
        }
      });

      spy.mockRestore();
    });

    it('should return 400 when message is missing', async () => {
      const response = await request(app)
        .post('/api/streaming-ticker/message')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'Message is required'
      });
    });

    it('should handle message sending errors', async () => {
      const originalSendToConnection = StreamingTickerManager.sendToConnection;
      StreamingTickerManager.sendToConnection = vi.fn().mockImplementation(() => {
        throw new Error('Send failed');
      });

      const response = await request(app)
        .post('/api/streaming-ticker/message')
        .send({
          message: 'test message',
          connectionId: 'test-id'
        })
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to send message'
      });

      StreamingTickerManager.sendToConnection = originalSendToConnection;
    });
  });

  describe('GET /stats', () => {
    it('should return connection statistics', async () => {
      // Add some mock connections
      const mockConnections = [
        {
          response: { write: vi.fn() },
          userId: 'user1',
          createdAt: Date.now() - 5000,
          lastActivity: Date.now() - 1000
        },
        {
          response: { write: vi.fn() },
          userId: 'user2',
          createdAt: Date.now() - 10000,
          lastActivity: Date.now() - 2000
        }
      ];

      StreamingTickerManager.connections.set('conn1', mockConnections[0]);
      StreamingTickerManager.connections.set('conn2', mockConnections[1]);

      const response = await request(app)
        .get('/api/streaming-ticker/stats')
        .expect(200);

      expect(response.body).toMatchObject({
        activeConnections: 2,
        connections: expect.arrayContaining([
          expect.objectContaining({
            id: 'conn1',
            userId: 'user1'
          }),
          expect.objectContaining({
            id: 'conn2',
            userId: 'user2'
          })
        ])
      });
    });

    it('should handle stats errors', async () => {
      const originalGetStats = StreamingTickerManager.getStats;
      StreamingTickerManager.getStats = vi.fn().mockImplementation(() => {
        throw new Error('Stats failed');
      });

      const response = await request(app)
        .get('/api/streaming-ticker/stats')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to get statistics'
      });

      StreamingTickerManager.getStats = originalGetStats;
    });
  });

  describe('DELETE /connection/:connectionId', () => {
    it('should close specific connection', async () => {
      const connectionId = 'test-connection-id';
      const spy = vi.spyOn(StreamingTickerManager, 'closeConnection');

      const response = await request(app)
        .delete(`/api/streaming-ticker/connection/${connectionId}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Connection closed',
        connectionId: connectionId
      });

      expect(spy).toHaveBeenCalledWith(connectionId);

      spy.mockRestore();
    });

    it('should handle connection close errors', async () => {
      const originalCloseConnection = StreamingTickerManager.closeConnection;
      StreamingTickerManager.closeConnection = vi.fn().mockImplementation(() => {
        throw new Error('Close failed');
      });

      const response = await request(app)
        .delete('/api/streaming-ticker/connection/test-id')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to close connection'
      });

      StreamingTickerManager.closeConnection = originalCloseConnection;
    });
  });

  describe('POST /cleanup', () => {
    it('should cleanup inactive connections', async () => {
      const spy = vi.spyOn(StreamingTickerManager, 'cleanup');
      const statsSpy = vi.spyOn(StreamingTickerManager, 'getStats').mockReturnValue({
        activeConnections: 2,
        connections: []
      });

      const response = await request(app)
        .post('/api/streaming-ticker/cleanup')
        .expect(200);

      expect(response.body).toEqual({
        message: 'Cleanup completed',
        stats: {
          activeConnections: 2,
          connections: []
        }
      });

      expect(spy).toHaveBeenCalled();

      spy.mockRestore();
      statsSpy.mockRestore();
    });

    it('should handle cleanup errors', async () => {
      const originalCleanup = StreamingTickerManager.cleanup;
      StreamingTickerManager.cleanup = vi.fn().mockImplementation(() => {
        throw new Error('Cleanup failed');
      });

      const response = await request(app)
        .post('/api/streaming-ticker/cleanup')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Cleanup failed'
      });

      StreamingTickerManager.cleanup = originalCleanup;
    });
  });

  describe('End-to-End SSE Flow', () => {
    it('should complete full SSE communication cycle', (done) => {
      const userId = 'e2e-test-user';
      let connectionId = null;
      let messagesReceived = [];

      // Establish SSE connection
      const req = request(app)
        .get('/api/streaming-ticker/stream')
        .query({ userId })
        .expect(200);

      req.on('data', (chunk) => {
        const data = chunk.toString();
        const lines = data.split('\n').filter(line => line.startsWith('data: '));

        lines.forEach(line => {
          try {
            const message = JSON.parse(line.replace('data: ', ''));
            messagesReceived.push(message);

            if (message.type === 'connection') {
              connectionId = message.data.connectionId;

              // Send a custom message to this connection
              request(app)
                .post('/api/streaming-ticker/message')
                .send({
                  message: 'E2E test message',
                  connectionId: connectionId,
                  type: 'test'
                })
                .end(() => {
                  // Message sent, continue listening
                });
            } else if (message.type === 'test') {
              // Received our custom message, test is complete
              req.abort();
            }
          } catch (error) {
            // Ignore parsing errors for malformed chunks
          }
        });
      });

      req.on('close', () => {
        expect(connectionId).toBeTruthy();
        expect(messagesReceived.some(msg => msg.type === 'connection')).toBe(true);
        expect(messagesReceived.some(msg => msg.type === 'test')).toBe(true);
        done();
      });

      req.on('error', (err) => {
        if (err.code !== 'ECONNRESET') {
          done(err);
        }
      });

      // Safety timeout
      setTimeout(() => {
        req.abort();
        done(new Error('Test timeout'));
      }, 5000);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent connections', async () => {
      const connectionPromises = [];
      const numConnections = 10;

      for (let i = 0; i < numConnections; i++) {
        const promise = new Promise((resolve, reject) => {
          const req = request(app)
            .get('/api/streaming-ticker/stream')
            .query({ userId: `user${i}` });

          req.on('data', (chunk) => {
            const data = chunk.toString();
            if (data.includes('"type":"connection"')) {
              req.abort();
              resolve(i);
            }
          });

          req.on('error', (err) => {
            if (err.code === 'ECONNRESET') {
              resolve(i);
            } else {
              reject(err);
            }
          });

          setTimeout(() => {
            req.abort();
            reject(new Error(`Connection ${i} timeout`));
          }, 2000);
        });

        connectionPromises.push(promise);
      }

      const results = await Promise.allSettled(connectionPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      // Should establish most connections successfully
      expect(successful).toBeGreaterThanOrEqual(numConnections * 0.8);
    });

    it('should handle rapid message broadcasting', async () => {
      // Create some connections first
      const mockConnections = [];
      for (let i = 0; i < 5; i++) {
        const mockConnection = {
          response: { write: vi.fn() },
          userId: `user${i}`,
          createdAt: Date.now(),
          lastActivity: Date.now()
        };
        StreamingTickerManager.connections.set(`conn${i}`, mockConnection);
        mockConnections.push(mockConnection);
      }

      // Send multiple messages rapidly
      const messagePromises = [];
      for (let i = 0; i < 20; i++) {
        const promise = request(app)
          .post('/api/streaming-ticker/message')
          .send({
            message: `Rapid message ${i}`,
            type: 'load-test'
          })
          .expect(200);

        messagePromises.push(promise);
      }

      const results = await Promise.allSettled(messagePromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      expect(successful).toBe(20);

      // Verify messages were sent to connections
      mockConnections.forEach(conn => {
        expect(conn.response.write).toHaveBeenCalled();
      });
    });
  });
});