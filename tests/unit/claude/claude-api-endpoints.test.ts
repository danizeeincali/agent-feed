import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { ClaudeAPIController } from '@/controllers/claude-api-controller';
import { ClaudeInstanceManager } from '@/services/claude-instance-manager';

// Mock dependencies
vi.mock('@/services/claude-instance-manager');

const mockInstanceManager = vi.mocked(ClaudeInstanceManager);

describe('Claude API Endpoints', () => {
  let app: express.Application;
  let controller: ClaudeAPIController;
  let mockManager: any;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    mockManager = {
      createInstance: vi.fn(),
      terminateInstance: vi.fn(),
      getInstances: vi.fn(),
      getInstance: vi.fn(),
      sendMessage: vi.fn(),
      getInstanceStats: vi.fn()
    };
    
    mockInstanceManager.mockImplementation(() => mockManager);
    
    controller = new ClaudeAPIController();
    app.use('/api/claude', controller.getRouter());
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/claude/instances', () => {
    test('should create new Claude instance with valid parameters', async () => {
      const instanceData = {
        mode: 'chat',
        port: 3001,
        name: 'Test Instance'
      };

      const mockInstance = {
        id: 'instance-123',
        ...instanceData,
        status: 'starting',
        createdAt: new Date().toISOString()
      };

      mockManager.createInstance.mockResolvedValue(mockInstance);

      const response = await request(app)
        .post('/api/claude/instances')
        .send(instanceData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockInstance
      });

      expect(mockManager.createInstance).toHaveBeenCalledWith(
        expect.objectContaining(instanceData)
      );
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/claude/instances')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({ field: 'mode' }),
          expect.objectContaining({ field: 'port' })
        ])
      });
    });

    test('should validate port range', async () => {
      const response = await request(app)
        .post('/api/claude/instances')
        .send({
          mode: 'chat',
          port: 99999
        })
        .expect(400);

      expect(response.body.details).toContainEqual(
        expect.objectContaining({ field: 'port' })
      );
    });

    test('should handle instance creation failures', async () => {
      mockManager.createInstance.mockRejectedValue(
        new Error('Port already in use')
      );

      const response = await request(app)
        .post('/api/claude/instances')
        .send({
          mode: 'chat',
          port: 3001
        })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to create Claude instance',
        message: 'Port already in use'
      });
    });
  });

  describe('GET /api/claude/instances', () => {
    test('should return list of all instances', async () => {
      const mockInstances = [
        {
          id: 'instance-1',
          mode: 'chat',
          port: 3001,
          status: 'running',
          name: 'Chat Instance'
        },
        {
          id: 'instance-2',
          mode: 'terminal',
          port: 3002,
          status: 'running',
          name: 'Terminal Instance'
        }
      ];

      mockManager.getInstances.mockResolvedValue(mockInstances);

      const response = await request(app)
        .get('/api/claude/instances')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockInstances
      });
    });

    test('should filter instances by status', async () => {
      const runningInstances = [
        {
          id: 'instance-1',
          mode: 'chat',
          status: 'running'
        }
      ];

      mockManager.getInstances.mockResolvedValue(runningInstances);

      await request(app)
        .get('/api/claude/instances?status=running')
        .expect(200);

      expect(mockManager.getInstances).toHaveBeenCalledWith({
        status: 'running'
      });
    });
  });

  describe('GET /api/claude/instances/:id', () => {
    test('should return specific instance details', async () => {
      const mockInstance = {
        id: 'instance-123',
        mode: 'chat',
        port: 3001,
        status: 'running',
        stats: {
          uptime: 3600,
          memoryUsage: 128,
          cpuUsage: 15
        }
      };

      mockManager.getInstance.mockResolvedValue(mockInstance);

      const response = await request(app)
        .get('/api/claude/instances/instance-123')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockInstance
      });
    });

    test('should return 404 for non-existent instance', async () => {
      mockManager.getInstance.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/claude/instances/non-existent')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Instance not found'
      });
    });
  });

  describe('DELETE /api/claude/instances/:id', () => {
    test('should terminate specific instance', async () => {
      mockManager.terminateInstance.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/claude/instances/instance-123')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Instance terminated successfully'
      });

      expect(mockManager.terminateInstance).toHaveBeenCalledWith(
        'instance-123'
      );
    });

    test('should handle termination failures', async () => {
      mockManager.terminateInstance.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/claude/instances/instance-123')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to terminate instance'
      });
    });
  });

  describe('POST /api/claude/instances/:id/messages', () => {
    test('should send message to Claude instance', async () => {
      const messageData = {
        content: 'Hello Claude',
        role: 'user'
      };

      const mockResponse = {
        id: 'msg-123',
        content: 'Hello! How can I help you?',
        role: 'assistant',
        timestamp: new Date().toISOString()
      };

      mockManager.sendMessage.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/claude/instances/instance-123/messages')
        .send(messageData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockResponse
      });

      expect(mockManager.sendMessage).toHaveBeenCalledWith(
        'instance-123',
        messageData
      );
    });

    test('should validate message content', async () => {
      const response = await request(app)
        .post('/api/claude/instances/instance-123/messages')
        .send({})
        .expect(400);

      expect(response.body.details).toContainEqual(
        expect.objectContaining({ field: 'content' })
      );
    });

    test('should handle communication errors', async () => {
      mockManager.sendMessage.mockRejectedValue(
        new Error('Instance not responding')
      );

      const response = await request(app)
        .post('/api/claude/instances/instance-123/messages')
        .send({
          content: 'Hello',
          role: 'user'
        })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to send message',
        message: 'Instance not responding'
      });
    });
  });

  describe('GET /api/claude/instances/:id/stats', () => {
    test('should return instance performance statistics', async () => {
      const mockStats = {
        uptime: 7200,
        memoryUsage: 256,
        cpuUsage: 23.5,
        messageCount: 150,
        averageResponseTime: 850,
        lastActivity: new Date().toISOString()
      };

      mockManager.getInstanceStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/claude/instances/instance-123/stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockStats
      });
    });

    test('should handle missing stats', async () => {
      mockManager.getInstanceStats.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/claude/instances/instance-123/stats')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Stats not available for this instance'
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/claude/instances')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.error).toContain('Invalid JSON');
    });

    test('should handle internal server errors gracefully', async () => {
      mockManager.getInstances.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/claude/instances')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: expect.any(String)
      });
    });

    test('should include request ID in error responses', async () => {
      mockManager.getInstances.mockRejectedValue(new Error('Test error'));

      const response = await request(app)
        .get('/api/claude/instances')
        .expect(500);

      expect(response.body).toHaveProperty('requestId');
      expect(response.body.requestId).toMatch(/^[a-f0-9-]{36}$/);
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits on instance creation', async () => {
      const instanceData = {
        mode: 'chat',
        port: 3001
      };

      // Make multiple rapid requests
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/claude/instances')
          .send(instanceData)
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});
