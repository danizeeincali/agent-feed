/**
 * AgentWorker Unit Tests
 * Phase 3B: TDD Implementation
 *
 * Tests work ticket execution and response generation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AgentWorker } from '../../../src/worker/agent-worker';
import type { WorkTicket } from '../../../src/types/work-ticket';
import type { DatabaseManager } from '../../../src/types/database-manager';

describe('AgentWorker', () => {
  let worker: AgentWorker;
  let mockDb: DatabaseManager;
  let mockResponseGenerator: any;

  const mockTicket: WorkTicket = {
    id: 'ticket-123',
    type: 'post_response',
    priority: 5,
    agentName: 'tech-guru',
    userId: 'test-user',
    payload: {
      feedId: 'feed-456',
      feedItemId: 'item-789',
      itemGuid: 'guid-abc',
    },
    status: 'pending',
    createdAt: new Date(),
  };

  beforeEach(() => {
    // Mock database
    mockDb = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
    } as unknown as DatabaseManager;

    // Mock ResponseGenerator
    mockResponseGenerator = {
      generate: jest.fn(),
      validateResponse: jest.fn(),
    };

    worker = new AgentWorker(mockDb, mockResponseGenerator);
  });

  describe('executeTicket()', () => {
    it('should execute work ticket successfully', async () => {
      // Mock context loading
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          // System template
          rows: [{
            name: 'tech-guru',
            model: 'claude-sonnet-4-5-20250929',
            default_personality: 'You are a helpful tech expert',
            posting_rules: JSON.stringify({ max_length: 500, min_length: 50 }),
            safety_constraints: JSON.stringify({}),
            api_schema: JSON.stringify({}),
            default_response_style: JSON.stringify({ tone: 'friendly', temperature: 0.7 }),
          }],
        })
        .mockResolvedValueOnce({
          // User customization
          rows: [],
        })
        .mockResolvedValueOnce({
          // Feed item
          rows: [{
            id: 'item-789',
            feed_id: 'feed-456',
            title: 'TypeScript 5.0 Released',
            content: 'New features include...',
            link: 'https://example.com/ts5',
            published_at: new Date(),
          }],
        })
        .mockResolvedValueOnce({
          // Insert response
          rows: [{ id: 'response-123' }],
        })
        .mockResolvedValueOnce({
          // Update feed item
          rows: [],
        });

      // Mock response generation
      mockResponseGenerator.generate.mockResolvedValue({
        content: 'Great news about TypeScript 5.0! Very exciting features.',
        tokensUsed: 150,
        durationMs: 1200,
        metadata: {
          model: 'claude-sonnet-4-5-20250929',
          stopReason: 'end_turn',
          temperature: 0.7,
        },
      });

      mockResponseGenerator.validateResponse.mockReturnValue({
        valid: true,
        errors: [],
        warnings: [],
      });

      const result = await worker.executeTicket(mockTicket);

      expect(result.success).toBe(true);
      expect(result.responseId).toBe('response-123');
      expect(result.tokensUsed).toBe(150);
      expect(result.durationMs).toBeGreaterThan(0);
    });

    it('should fail when feed item not found', async () => {
      // Mock context loading
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{
            name: 'tech-guru',
            model: 'claude-sonnet-4-5-20250929',
            default_personality: 'You are a helpful tech expert',
            posting_rules: JSON.stringify({ max_length: 500, min_length: 50 }),
            safety_constraints: JSON.stringify({}),
            api_schema: JSON.stringify({}),
            default_response_style: JSON.stringify({ tone: 'friendly', temperature: 0.7 }),
          }],
        })
        .mockResolvedValueOnce({
          rows: [],
        })
        .mockResolvedValueOnce({
          // Feed item not found
          rows: [],
        });

      const result = await worker.executeTicket(mockTicket);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Feed item not found');
    });

    it('should fail when validation fails', async () => {
      // Mock context loading
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{
            name: 'tech-guru',
            model: 'claude-sonnet-4-5-20250929',
            default_personality: 'You are a helpful tech expert',
            posting_rules: JSON.stringify({ max_length: 500, min_length: 50 }),
            safety_constraints: JSON.stringify({}),
            api_schema: JSON.stringify({}),
            default_response_style: JSON.stringify({ tone: 'friendly', temperature: 0.7 }),
          }],
        })
        .mockResolvedValueOnce({
          rows: [],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 'item-789',
            title: 'Test',
            content: 'Test content',
          }],
        });

      mockResponseGenerator.generate.mockResolvedValue({
        content: 'Too short',
        tokensUsed: 50,
        durationMs: 500,
        metadata: {},
      });

      mockResponseGenerator.validateResponse.mockReturnValue({
        valid: false,
        errors: ['Response too short'],
      });

      const result = await worker.executeTicket(mockTicket);

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation failed');
    });

    it('should handle errors gracefully', async () => {
      // Mock database error
      (mockDb.query as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const result = await worker.executeTicket(mockTicket);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
