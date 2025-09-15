import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';
import streamingTickerRouter from '../../src/api/routes/streaming-ticker.js';

// Mock StreamingTickerManager
const mockStreamingTickerManager = {
  createConnection: jest.fn(),
  sendToConnection: jest.fn(),
  broadcast: jest.fn(),
  streamClaudeExecution: jest.fn(),
  getStats: jest.fn(),
  closeConnection: jest.fn(),
  cleanup: jest.fn(),
  connections: new Map()
};

jest.unstable_mockModule('../../src/services/StreamingTickerManager.js', () => ({
  default: mockStreamingTickerManager
}));

describe('Streaming Ticker Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/streaming-ticker', streamingTickerRouter);
    jest.clearAllMocks();
  });

  describe('GET /stream', () => {
    test('should establish SSE connection', (done) => {
      mockStreamingTickerManager.createConnection.mockReturnValue('test-connection-id');

      const req = request(app)
        .get('/api/streaming-ticker/stream')
        .query({ userId: 'testuser' })
        .expect(200);

      req.end((err, res) => {
        if (err) return done(err);

        expect(mockStreamingTickerManager.createConnection).toHaveBeenCalled();
        expect(res.headers['content-type']).toContain('text/event-stream');
        done();
      });
    });

    test('should handle demo mode', (done) => {
      mockStreamingTickerManager.createConnection.mockReturnValue('demo-connection-id');

      request(app)
        .get('/api/streaming-ticker/stream')
        .query({ demo: 'true' })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);

          // Should call streamClaudeExecution for demo
          setTimeout(() => {
            expect(mockStreamingTickerManager.streamClaudeExecution).toHaveBeenCalledWith(
              'demo-connection-id',
              'Demo execution for testing'
            );
            done();
          }, 1100);
        });
    });

    test('should handle connection errors', (done) => {
      mockStreamingTickerManager.createConnection.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      request(app)
        .get('/api/streaming-ticker/stream')
        .expect(500)
        .expect({ error: 'Failed to establish streaming connection' })
        .end(done);
    });
  });

  describe('POST /execute', () => {
    test('should start execution with connectionId', () => {
      mockStreamingTickerManager.connections.has = jest.fn().mockReturnValue(true);

      return request(app)
        .post('/api/streaming-ticker/execute')
        .send({
          prompt: 'Test execution prompt',
          connectionId: 'test-connection-id'
        })
        .expect(200)
        .expect({
          message: 'Execution started with streaming',
          connectionId: 'test-connection-id'
        })
        .then(() => {
          expect(mockStreamingTickerManager.streamClaudeExecution).toHaveBeenCalledWith(
            'test-connection-id',
            'Test execution prompt'
          );
        });
    });

    test('should broadcast when no connectionId provided', () => {
      return request(app)
        .post('/api/streaming-ticker/execute')
        .send({ prompt: 'Broadcast prompt' })
        .expect(200)
        .expect({ message: 'Execution started with broadcast' })
        .then(() => {
          expect(mockStreamingTickerManager.broadcast).toHaveBeenCalledWith({
            type: 'execution_start',
            data: {
              prompt: 'Broadcast prompt...',
              timestamp: expect.any(Number)
            }
          });
        });
    });

    test('should return 400 for missing prompt', () => {
      return request(app)
        .post('/api/streaming-ticker/execute')
        .send({})
        .expect(400)
        .expect({ error: 'Prompt is required' });
    });

    test('should handle execution errors', () => {
      mockStreamingTickerManager.broadcast.mockImplementation(() => {
        throw new Error('Broadcast failed');
      });

      return request(app)
        .post('/api/streaming-ticker/execute')
        .send({ prompt: 'Test prompt' })
        .expect(500)
        .expect({ error: 'Failed to start execution' });
    });
  });

  describe('POST /message', () => {
    test('should send message to specific connection', () => {
      mockStreamingTickerManager.sendToConnection.mockReturnValue(true);

      return request(app)
        .post('/api/streaming-ticker/message')
        .send({
          message: 'Test message',
          connectionId: 'test-connection-id',
          priority: 'high'
        })
        .expect(200)
        .expect({
          sent: true,
          connectionId: 'test-connection-id'
        })
        .then(() => {
          expect(mockStreamingTickerManager.sendToConnection).toHaveBeenCalledWith(
            'test-connection-id',
            {
              type: 'custom',
              data: {
                message: 'Test message',
                timestamp: expect.any(Number),
                priority: 'high'
              }
            }
          );
        });
    });

    test('should broadcast when no connectionId provided', () => {
      mockStreamingTickerManager.broadcast.mockReturnValue(3);

      return request(app)
        .post('/api/streaming-ticker/message')
        .send({ message: 'Broadcast message' })
        .expect(200)
        .expect({ sentCount: 3 });
    });

    test('should return 400 for missing message', () => {
      return request(app)
        .post('/api/streaming-ticker/message')
        .send({})
        .expect(400)
        .expect({ error: 'Message is required' });
    });
  });

  describe('GET /stats', () => {
    test('should return streaming statistics', () => {
      const mockStats = {
        activeConnections: 2,
        connections: [
          { id: 'conn1', userId: 'user1' },
          { id: 'conn2', userId: 'user2' }
        ]
      };

      mockStreamingTickerManager.getStats.mockReturnValue(mockStats);

      return request(app)
        .get('/api/streaming-ticker/stats')
        .expect(200)
        .expect(mockStats);
    });

    test('should handle stats errors', () => {
      mockStreamingTickerManager.getStats.mockImplementation(() => {
        throw new Error('Stats failed');
      });

      return request(app)
        .get('/api/streaming-ticker/stats')
        .expect(500)
        .expect({ error: 'Failed to get statistics' });
    });
  });

  describe('DELETE /connection/:connectionId', () => {
    test('should close specific connection', () => {
      return request(app)
        .delete('/api/streaming-ticker/connection/test-connection-id')
        .expect(200)
        .expect({
          message: 'Connection closed',
          connectionId: 'test-connection-id'
        })
        .then(() => {
          expect(mockStreamingTickerManager.closeConnection).toHaveBeenCalledWith(
            'test-connection-id'
          );
        });
    });

    test('should handle close errors', () => {
      mockStreamingTickerManager.closeConnection.mockImplementation(() => {
        throw new Error('Close failed');
      });

      return request(app)
        .delete('/api/streaming-ticker/connection/test-connection-id')
        .expect(500)
        .expect({ error: 'Failed to close connection' });
    });
  });

  describe('POST /cleanup', () => {
    test('should perform cleanup and return stats', () => {
      const mockStats = { activeConnections: 1, connections: [] };
      mockStreamingTickerManager.getStats.mockReturnValue(mockStats);

      return request(app)
        .post('/api/streaming-ticker/cleanup')
        .expect(200)
        .expect({
          message: 'Cleanup completed',
          stats: mockStats
        })
        .then(() => {
          expect(mockStreamingTickerManager.cleanup).toHaveBeenCalled();
        });
    });

    test('should handle cleanup errors', () => {
      mockStreamingTickerManager.cleanup.mockImplementation(() => {
        throw new Error('Cleanup failed');
      });

      return request(app)
        .post('/api/streaming-ticker/cleanup')
        .expect(500)
        .expect({ error: 'Cleanup failed' });
    });
  });
});