/**
 * AVI DM API Endpoint Tests - TDD London School
 *
 * API Endpoint Focus:
 * - POST /api/avi/chat - Direct messaging
 * - GET /api/avi/status - Session status
 * - DELETE /api/avi/session - Force cleanup
 * - GET /api/avi/metrics - Usage metrics
 *
 * London School Approach:
 * - Mock AVI session manager interactions
 * - Verify HTTP contract fulfillment
 * - Test API response structures
 * - Validate error handling patterns
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

describe('AVI DM API Endpoint Tests', () => {
  let app;
  let mockAviSession;

  beforeAll(() => {
    // Create Express app with AVI endpoints
    app = express();
    app.use(express.json());

    // Mock AVI session manager
    mockAviSession = {
      chat: vi.fn(),
      getStatus: vi.fn(),
      cleanup: vi.fn(),
      sessionActive: false,
      sessionId: null,
      interactionCount: 0,
      totalTokensUsed: 0
    };

    // Mock getAviSession factory
    const getAviSession = vi.fn(() => mockAviSession);

    // Define API endpoints
    app.post('/api/avi/chat', async (req, res) => {
      try {
        const { message } = req.body;

        if (!message || !message.trim()) {
          return res.status(400).json({
            success: false,
            error: 'Message is required'
          });
        }

        const aviSession = getAviSession();
        const result = await aviSession.chat(message.trim(), {
          includeSystemPrompt: !aviSession.sessionActive,
          maxTokens: 2000
        });

        res.json({
          success: true,
          data: {
            response: result.response,
            tokensUsed: result.tokensUsed,
            sessionId: result.sessionId,
            sessionStatus: aviSession.getStatus()
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to process AVI chat',
          details: error.message
        });
      }
    });

    app.get('/api/avi/status', (req, res) => {
      const aviSession = getAviSession();
      const status = aviSession.getStatus();

      res.json({
        success: true,
        data: status
      });
    });

    app.delete('/api/avi/session', (req, res) => {
      const aviSession = getAviSession();
      const statusBefore = aviSession.getStatus();

      aviSession.cleanup();

      res.json({
        success: true,
        message: 'AVI session cleaned up',
        previousSession: statusBefore
      });
    });

    app.get('/api/avi/metrics', (req, res) => {
      const aviSession = getAviSession();
      const status = aviSession.getStatus();

      const metrics = {
        session: {
          active: status.active,
          sessionId: status.sessionId,
          uptime: status.lastActivity ? Date.now() - (status.lastActivity - status.idleTime) : 0
        },
        usage: {
          totalInteractions: status.interactionCount,
          totalTokens: status.totalTokensUsed,
          averageTokensPerInteraction: status.averageTokensPerInteraction
        },
        cost: {
          estimatedCost: (status.totalTokensUsed / 1000000) * 3,
          averageCostPerInteraction: (status.averageTokensPerInteraction / 1000000) * 3
        },
        efficiency: {
          savingsVsSpawnPerQuestion: status.interactionCount > 0
            ? Math.round((1 - (status.totalTokensUsed / (status.interactionCount * 30000))) * 100)
            : 0
        }
      };

      res.json({
        success: true,
        data: metrics
      });
    });
  });

  beforeEach(() => {
    // Reset mock state
    vi.clearAllMocks();

    // Default mock behaviors
    mockAviSession.chat.mockResolvedValue({
      success: true,
      response: 'AVI response content',
      tokensUsed: 1700,
      sessionId: 'avi-session-12345',
      totalTokens: 1700,
      interactionCount: 1
    });

    mockAviSession.getStatus.mockReturnValue({
      active: true,
      sessionId: 'avi-session-12345',
      lastActivity: Date.now(),
      idleTime: 1000,
      idleTimeout: 3600000,
      interactionCount: 1,
      totalTokensUsed: 1700,
      averageTokensPerInteraction: 1700
    });
  });

  describe('POST /api/avi/chat - Contract Definition', () => {
    it('TDMAPI-001: should accept message and return AVI response', async () => {
      const response = await request(app)
        .post('/api/avi/chat')
        .send({ message: 'What is my working directory?' })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toEqual({
        success: true,
        data: {
          response: expect.any(String),
          tokensUsed: expect.any(Number),
          sessionId: expect.any(String),
          sessionStatus: expect.objectContaining({
            active: expect.any(Boolean),
            sessionId: expect.any(String)
          })
        }
      });
    });

    it('TDMAPI-002: should reject empty message', async () => {
      const response = await request(app)
        .post('/api/avi/chat')
        .send({ message: '' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Message is required'
      });
    });

    it('TDMAPI-003: should reject missing message field', async () => {
      const response = await request(app)
        .post('/api/avi/chat')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Message is required'
      });
    });

    it('TDMAPI-004: should trim whitespace from message', async () => {
      await request(app)
        .post('/api/avi/chat')
        .send({ message: '  What is happening?  ' })
        .expect(200);

      expect(mockAviSession.chat).toHaveBeenCalledWith(
        'What is happening?',
        expect.any(Object)
      );
    });

    it('TDMAPI-005: should reject whitespace-only message', async () => {
      await request(app)
        .post('/api/avi/chat')
        .send({ message: '   ' })
        .expect(400);

      expect(mockAviSession.chat).not.toHaveBeenCalled();
    });
  });

  describe('Interaction Verification - Chat Processing', () => {
    it('TDMAPI-006: should call AVI session chat method', async () => {
      await request(app)
        .post('/api/avi/chat')
        .send({ message: 'Test message' });

      expect(mockAviSession.chat).toHaveBeenCalledOnce();
      expect(mockAviSession.chat).toHaveBeenCalledWith(
        'Test message',
        expect.objectContaining({
          maxTokens: 2000
        })
      );
    });

    it('TDMAPI-007: should include system prompt on first interaction', async () => {
      mockAviSession.sessionActive = false;

      await request(app)
        .post('/api/avi/chat')
        .send({ message: 'Hello AVI' });

      expect(mockAviSession.chat).toHaveBeenCalledWith(
        'Hello AVI',
        expect.objectContaining({
          includeSystemPrompt: true
        })
      );
    });

    it('TDMAPI-008: should not include system prompt on subsequent interactions', async () => {
      mockAviSession.sessionActive = true;

      await request(app)
        .post('/api/avi/chat')
        .send({ message: 'Follow-up question' });

      expect(mockAviSession.chat).toHaveBeenCalledWith(
        'Follow-up question',
        expect.objectContaining({
          includeSystemPrompt: false
        })
      );
    });

    it('TDMAPI-009: should enforce 2000 token limit', async () => {
      await request(app)
        .post('/api/avi/chat')
        .send({ message: 'Test' });

      expect(mockAviSession.chat).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          maxTokens: 2000
        })
      );
    });

    it('TDMAPI-010: should fetch session status after chat', async () => {
      await request(app)
        .post('/api/avi/chat')
        .send({ message: 'Test' });

      expect(mockAviSession.getStatus).toHaveBeenCalled();
    });
  });

  describe('Response Structure Validation', () => {
    it('TDMAPI-011: should return response content', async () => {
      const response = await request(app)
        .post('/api/avi/chat')
        .send({ message: 'Test' });

      expect(response.body.data.response).toBe('AVI response content');
    });

    it('TDMAPI-012: should return token usage metrics', async () => {
      const response = await request(app)
        .post('/api/avi/chat')
        .send({ message: 'Test' });

      expect(response.body.data.tokensUsed).toBe(1700);
    });

    it('TDMAPI-013: should return session ID', async () => {
      const response = await request(app)
        .post('/api/avi/chat')
        .send({ message: 'Test' });

      expect(response.body.data.sessionId).toBe('avi-session-12345');
    });

    it('TDMAPI-014: should include full session status', async () => {
      const response = await request(app)
        .post('/api/avi/chat')
        .send({ message: 'Test' });

      expect(response.body.data.sessionStatus).toEqual(
        expect.objectContaining({
          active: true,
          sessionId: 'avi-session-12345',
          interactionCount: expect.any(Number),
          totalTokensUsed: expect.any(Number)
        })
      );
    });
  });

  describe('Error Handling - Chat Failures', () => {
    it('TDMAPI-015: should handle AVI chat errors', async () => {
      mockAviSession.chat.mockRejectedValue(new Error('SDK connection failed'));

      const response = await request(app)
        .post('/api/avi/chat')
        .send({ message: 'Test' })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to process AVI chat',
        details: 'SDK connection failed'
      });
    });

    it('TDMAPI-016: should handle session initialization failures', async () => {
      mockAviSession.chat.mockRejectedValue(new Error('Failed to initialize session'));

      await request(app)
        .post('/api/avi/chat')
        .send({ message: 'Test' })
        .expect(500);
    });

    it('TDMAPI-017: should handle timeout errors', async () => {
      mockAviSession.chat.mockRejectedValue(new Error('Request timeout'));

      const response = await request(app)
        .post('/api/avi/chat')
        .send({ message: 'Test' })
        .expect(500);

      expect(response.body.details).toContain('timeout');
    });
  });

  describe('GET /api/avi/status - Contract Definition', () => {
    it('TDMAPI-018: should return session status', async () => {
      const response = await request(app)
        .get('/api/avi/status')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          active: expect.any(Boolean),
          sessionId: expect.any(String),
          interactionCount: expect.any(Number),
          totalTokensUsed: expect.any(Number)
        })
      });
    });

    it('TDMAPI-019: should call getStatus on session manager', async () => {
      await request(app).get('/api/avi/status');

      expect(mockAviSession.getStatus).toHaveBeenCalledOnce();
    });

    it('TDMAPI-020: should return idle time information', async () => {
      const response = await request(app).get('/api/avi/status');

      expect(response.body.data).toHaveProperty('idleTime');
      expect(response.body.data).toHaveProperty('idleTimeout');
    });

    it('TDMAPI-021: should return token averages', async () => {
      const response = await request(app).get('/api/avi/status');

      expect(response.body.data).toHaveProperty('averageTokensPerInteraction');
    });

    it('TDMAPI-022: should work when session is inactive', async () => {
      mockAviSession.getStatus.mockReturnValue({
        active: false,
        sessionId: null,
        lastActivity: null,
        idleTime: null,
        idleTimeout: 3600000,
        interactionCount: 0,
        totalTokensUsed: 0,
        averageTokensPerInteraction: 0
      });

      const response = await request(app).get('/api/avi/status');

      expect(response.body.success).toBe(true);
      expect(response.body.data.active).toBe(false);
    });
  });

  describe('DELETE /api/avi/session - Contract Definition', () => {
    it('TDMAPI-023: should cleanup session and return confirmation', async () => {
      const response = await request(app)
        .delete('/api/avi/session')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'AVI session cleaned up',
        previousSession: expect.any(Object)
      });
    });

    it('TDMAPI-024: should call cleanup on session manager', async () => {
      await request(app).delete('/api/avi/session');

      expect(mockAviSession.cleanup).toHaveBeenCalledOnce();
    });

    it('TDMAPI-025: should return previous session statistics', async () => {
      mockAviSession.getStatus.mockReturnValue({
        active: true,
        sessionId: 'avi-session-12345',
        interactionCount: 5,
        totalTokensUsed: 8500
      });

      const response = await request(app).delete('/api/avi/session');

      expect(response.body.previousSession).toEqual(
        expect.objectContaining({
          sessionId: 'avi-session-12345',
          interactionCount: 5,
          totalTokensUsed: 8500
        })
      );
    });

    it('TDMAPI-026: should work when no session is active', async () => {
      mockAviSession.getStatus.mockReturnValue({
        active: false,
        sessionId: null,
        interactionCount: 0,
        totalTokensUsed: 0
      });

      const response = await request(app)
        .delete('/api/avi/session')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockAviSession.cleanup).toHaveBeenCalled();
    });
  });

  describe('GET /api/avi/metrics - Contract Definition', () => {
    beforeEach(() => {
      mockAviSession.getStatus.mockReturnValue({
        active: true,
        sessionId: 'avi-session-12345',
        lastActivity: Date.now(),
        idleTime: 5000,
        idleTimeout: 3600000,
        interactionCount: 10,
        totalTokensUsed: 17000,
        averageTokensPerInteraction: 1700
      });
    });

    it('TDMAPI-027: should return comprehensive metrics', async () => {
      const response = await request(app)
        .get('/api/avi/metrics')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          session: expect.any(Object),
          usage: expect.any(Object),
          cost: expect.any(Object),
          efficiency: expect.any(Object)
        })
      });
    });

    it('TDMAPI-028: should calculate session uptime', async () => {
      const response = await request(app).get('/api/avi/metrics');

      expect(response.body.data.session).toHaveProperty('uptime');
      expect(response.body.data.session.uptime).toBeGreaterThanOrEqual(0);
    });

    it('TDMAPI-029: should include usage statistics', async () => {
      const response = await request(app).get('/api/avi/metrics');

      expect(response.body.data.usage).toEqual({
        totalInteractions: 10,
        totalTokens: 17000,
        averageTokensPerInteraction: 1700
      });
    });

    it('TDMAPI-030: should calculate estimated cost', async () => {
      const response = await request(app).get('/api/avi/metrics');

      // 17000 tokens / 1M * $3 = $0.051
      expect(response.body.data.cost.estimatedCost).toBeCloseTo(0.051, 3);
    });

    it('TDMAPI-031: should calculate average cost per interaction', async () => {
      const response = await request(app).get('/api/avi/metrics');

      // 1700 tokens / 1M * $3 = $0.0051
      expect(response.body.data.cost.averageCostPerInteraction).toBeCloseTo(0.0051, 4);
    });

    it('TDMAPI-032: should calculate token efficiency savings', async () => {
      const response = await request(app).get('/api/avi/metrics');

      // Without session: 10 * 30000 = 300000
      // With session: 17000
      // Savings: (300000 - 17000) / 300000 = 94%
      expect(response.body.data.efficiency.savingsVsSpawnPerQuestion).toBeCloseTo(94, 0);
    });

    it('TDMAPI-033: should handle zero interactions gracefully', async () => {
      mockAviSession.getStatus.mockReturnValue({
        active: false,
        sessionId: null,
        lastActivity: null,
        idleTime: null,
        idleTimeout: 3600000,
        interactionCount: 0,
        totalTokensUsed: 0,
        averageTokensPerInteraction: 0
      });

      const response = await request(app).get('/api/avi/metrics');

      expect(response.body.data.efficiency.savingsVsSpawnPerQuestion).toBe(0);
      expect(response.body.data.cost.estimatedCost).toBe(0);
    });
  });

  describe('Integration: Multi-Interaction Session', () => {
    it('TDMAPI-034: should track state across multiple API calls', async () => {
      // First interaction
      mockAviSession.sessionActive = false;
      mockAviSession.getStatus.mockReturnValue({
        active: true,
        sessionId: 'avi-session-12345',
        interactionCount: 1,
        totalTokensUsed: 1700,
        averageTokensPerInteraction: 1700
      });

      await request(app)
        .post('/api/avi/chat')
        .send({ message: 'First message' })
        .expect(200);

      // Second interaction
      mockAviSession.sessionActive = true;
      mockAviSession.getStatus.mockReturnValue({
        active: true,
        sessionId: 'avi-session-12345',
        interactionCount: 2,
        totalTokensUsed: 3400,
        averageTokensPerInteraction: 1700
      });

      await request(app)
        .post('/api/avi/chat')
        .send({ message: 'Second message' })
        .expect(200);

      // Check status
      const statusResponse = await request(app).get('/api/avi/status');
      expect(statusResponse.body.data.interactionCount).toBe(2);
      expect(statusResponse.body.data.totalTokensUsed).toBe(3400);
    });

    it('TDMAPI-035: should demonstrate token savings over time', async () => {
      // Simulate 10 interactions
      const interactions = 10;
      const tokensPerInteraction = 1700;

      mockAviSession.getStatus.mockReturnValue({
        active: true,
        sessionId: 'avi-session-12345',
        interactionCount: interactions,
        totalTokensUsed: interactions * tokensPerInteraction,
        averageTokensPerInteraction: tokensPerInteraction
      });

      const metricsResponse = await request(app).get('/api/avi/metrics');

      const savings = metricsResponse.body.data.efficiency.savingsVsSpawnPerQuestion;
      expect(savings).toBeGreaterThan(90); // Should be ~94% savings
    });
  });
});
