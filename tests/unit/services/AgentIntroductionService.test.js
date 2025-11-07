/**
 * Unit Tests for AgentIntroductionService
 * Tests agent visibility control and phased introduction system
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AgentIntroductionService } from '../../../api-server/services/agents/agent-introduction-service.js';
import { nanoid } from 'nanoid';
import fs from 'fs/promises';

// Mock nanoid
jest.mock('nanoid');
jest.mock('fs/promises');

describe('AgentIntroductionService - Unit Tests', () => {
  let service;
  let mockDb;
  let mockPreparedStatements;

  beforeEach(() => {
    // Create mock prepared statements
    mockPreparedStatements = {
      markIntroduced: { run: jest.fn() },
      checkIntroduced: { get: jest.fn() },
      getIntroduced: { all: jest.fn() },
      incrementInteraction: { run: jest.fn() }
    };

    // Create mock database
    mockDb = {
      prepare: jest.fn((sql) => {
        if (sql.includes('INSERT OR IGNORE INTO agent_introductions')) {
          return mockPreparedStatements.markIntroduced;
        }
        if (sql.includes('SELECT id, agent_id, introduced_at')) {
          if (sql.includes('WHERE user_id = ?')) {
            return mockPreparedStatements.getIntroduced;
          }
          return mockPreparedStatements.checkIntroduced;
        }
        if (sql.includes('UPDATE agent_introductions')) {
          return mockPreparedStatements.incrementInteraction;
        }
        return { run: jest.fn(), get: jest.fn(), all: jest.fn() };
      })
    };

    // Mock nanoid
    nanoid.mockReturnValue('test-id-123');

    // Initialize service
    service = new AgentIntroductionService(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should require database instance', () => {
      expect(() => new AgentIntroductionService(null)).toThrow('Database instance is required');
    });

    test('should initialize prepared statements', () => {
      expect(mockDb.prepare).toHaveBeenCalled();
      expect(service.markIntroducedStmt).toBeDefined();
      expect(service.checkIntroducedStmt).toBeDefined();
      expect(service.getIntroducedStmt).toBeDefined();
      expect(service.incrementInteractionStmt).toBeDefined();
    });
  });

  describe('markAgentIntroduced', () => {
    test('should mark agent as introduced successfully', () => {
      const userId = 'user-123';
      const agentId = 'test-agent';
      const postId = 'post-123';

      const result = service.markAgentIntroduced(userId, agentId, postId);

      expect(mockPreparedStatements.markIntroduced.run).toHaveBeenCalledWith(
        'test-id-123',
        userId,
        agentId,
        expect.any(Number),
        postId
      );
      expect(result.success).toBe(true);
      expect(result.id).toBe('test-id-123');
      expect(result.userId).toBe(userId);
      expect(result.agentId).toBe(agentId);
      expect(result.postId).toBe(postId);
      expect(result.introducedAt).toBeDefined();
    });

    test('should generate unique ID for each introduction', () => {
      nanoid.mockReturnValueOnce('id-1').mockReturnValueOnce('id-2');

      const result1 = service.markAgentIntroduced('user-1', 'agent-1', 'post-1');
      const result2 = service.markAgentIntroduced('user-2', 'agent-2', 'post-2');

      expect(result1.id).toBe('id-1');
      expect(result2.id).toBe('id-2');
    });

    test('should use current timestamp', () => {
      const beforeTime = Math.floor(Date.now() / 1000);
      const result = service.markAgentIntroduced('user-1', 'agent-1', 'post-1');
      const afterTime = Math.floor(Date.now() / 1000);

      expect(result.introducedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(result.introducedAt).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('isAgentIntroduced', () => {
    test('should return true when agent is introduced', () => {
      mockPreparedStatements.checkIntroduced.get.mockReturnValue({
        id: 'intro-123',
        agent_id: 'test-agent'
      });

      const result = service.isAgentIntroduced('user-123', 'test-agent');

      expect(result).toBe(true);
      expect(mockPreparedStatements.checkIntroduced.get).toHaveBeenCalledWith('user-123', 'test-agent');
    });

    test('should return false when agent is not introduced', () => {
      mockPreparedStatements.checkIntroduced.get.mockReturnValue(null);

      const result = service.isAgentIntroduced('user-123', 'test-agent');

      expect(result).toBe(false);
    });

    test('should return false on database error', () => {
      mockPreparedStatements.checkIntroduced.get.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = service.isAgentIntroduced('user-123', 'test-agent');

      expect(result).toBe(false);
    });
  });

  describe('getIntroducedAgents', () => {
    test('should return list of introduced agents', () => {
      const mockIntroductions = [
        {
          id: 'intro-1',
          user_id: 'user-123',
          agent_id: 'agent-1',
          introduced_at: 1234567890,
          post_id: 'post-1',
          interaction_count: 5
        },
        {
          id: 'intro-2',
          user_id: 'user-123',
          agent_id: 'agent-2',
          introduced_at: 1234567900,
          post_id: 'post-2',
          interaction_count: 3
        }
      ];
      mockPreparedStatements.getIntroduced.all.mockReturnValue(mockIntroductions);

      const result = service.getIntroducedAgents('user-123');

      expect(result).toEqual(mockIntroductions);
      expect(mockPreparedStatements.getIntroduced.all).toHaveBeenCalledWith('user-123');
    });

    test('should return empty array when no agents introduced', () => {
      mockPreparedStatements.getIntroduced.all.mockReturnValue([]);

      const result = service.getIntroducedAgents('user-123');

      expect(result).toEqual([]);
    });

    test('should return empty array on database error', () => {
      mockPreparedStatements.getIntroduced.all.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = service.getIntroducedAgents('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('incrementInteractionCount', () => {
    test('should increment interaction count successfully', () => {
      mockPreparedStatements.incrementInteraction.run.mockReturnValue({ changes: 1 });

      const result = service.incrementInteractionCount('user-123', 'test-agent');

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(result.agentId).toBe('test-agent');
      expect(mockPreparedStatements.incrementInteraction.run).toHaveBeenCalledWith('user-123', 'test-agent');
    });

    test('should return failure when no rows updated', () => {
      mockPreparedStatements.incrementInteraction.run.mockReturnValue({ changes: 0 });

      const result = service.incrementInteractionCount('user-123', 'test-agent');

      expect(result.success).toBe(false);
    });
  });

  describe('getIntroductionStats', () => {
    test('should calculate introduction statistics correctly', () => {
      const mockIntroductions = [
        { agent_id: 'agent-1', interaction_count: 10 },
        { agent_id: 'agent-2', interaction_count: 5 },
        { agent_id: 'agent-3', interaction_count: 15 }
      ];
      mockPreparedStatements.getIntroduced.all.mockReturnValue(mockIntroductions);

      const stats = service.getIntroductionStats('user-123');

      expect(stats.totalIntroduced).toBe(3);
      expect(stats.totalInteractions).toBe(30);
      expect(stats.mostInteractedAgent.agent_id).toBe('agent-3');
      expect(stats.mostInteractedAgent.interaction_count).toBe(15);
    });

    test('should handle empty introduction list', () => {
      mockPreparedStatements.getIntroduced.all.mockReturnValue([]);

      const stats = service.getIntroductionStats('user-123');

      expect(stats.totalIntroduced).toBe(0);
      expect(stats.totalInteractions).toBe(0);
      expect(stats.mostInteractedAgent).toBeNull();
    });

    test('should handle single agent', () => {
      mockPreparedStatements.getIntroduced.all.mockReturnValue([
        { agent_id: 'agent-1', interaction_count: 7 }
      ]);

      const stats = service.getIntroductionStats('user-123');

      expect(stats.totalIntroduced).toBe(1);
      expect(stats.totalInteractions).toBe(7);
      expect(stats.mostInteractedAgent.agent_id).toBe('agent-1');
    });
  });

  describe('introduceAgent', () => {
    let mockDbSelector;

    beforeEach(() => {
      mockDbSelector = {
        createPost: jest.fn().mockResolvedValue({ id: 'post-123' })
      };

      // Mock fs.readFile for config
      fs.readFile.mockResolvedValue(JSON.stringify({
        agentId: 'test-agent',
        displayName: 'Test Agent',
        description: 'A test agent for testing',
        capabilities: ['capability 1', 'capability 2'],
        examples: ['example 1', 'example 2'],
        cta: 'Try me out!'
      }));

      mockPreparedStatements.checkIntroduced.get.mockReturnValue(null);
    });

    test('should introduce agent successfully', async () => {
      const result = await service.introduceAgent('user-123', 'test-agent', mockDbSelector);

      expect(result.success).toBe(true);
      expect(result.postId).toBe('post-123');
      expect(result.agentId).toBe('test-agent');
      expect(mockDbSelector.createPost).toHaveBeenCalled();
      expect(mockPreparedStatements.markIntroduced.run).toHaveBeenCalled();
    });

    test('should skip if agent already introduced', async () => {
      mockPreparedStatements.checkIntroduced.get.mockReturnValue({
        id: 'existing-intro'
      });

      const result = await service.introduceAgent('user-123', 'test-agent', mockDbSelector);

      expect(result.alreadyIntroduced).toBe(true);
      expect(mockDbSelector.createPost).not.toHaveBeenCalled();
    });

    test('should generate correct introduction content', async () => {
      await service.introduceAgent('user-123', 'test-agent', mockDbSelector);

      const createPostCall = mockDbSelector.createPost.mock.calls[0];
      const postData = createPostCall[1];

      expect(postData.title).toBe('Hi! I\'m Test Agent');
      expect(postData.content).toContain('Test Agent');
      expect(postData.content).toContain('capability 1');
      expect(postData.content).toContain('example 1');
      expect(postData.content).toContain('Try me out!');
      expect(postData.tags).toContain('AgentIntroduction');
      expect(postData.metadata.isAgentIntroduction).toBe(true);
    });

    test('should handle agent config file not found', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(service.introduceAgent('user-123', 'missing-agent', mockDbSelector))
        .rejects.toThrow('Agent configuration not found');
    });

    test('should remove -agent suffix when looking up config', async () => {
      await service.introduceAgent('user-123', 'test-agent', mockDbSelector);

      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('test-intro.json'),
        'utf-8'
      );
    });
  });

  describe('checkAndIntroduceAgents', () => {
    let mockDbSelector;

    beforeEach(() => {
      mockDbSelector = {
        createPost: jest.fn().mockResolvedValue({ id: 'post-123' })
      };

      fs.readFile.mockResolvedValue(JSON.stringify({
        agentId: 'test-agent',
        displayName: 'Test Agent',
        description: 'Test',
        capabilities: [],
        examples: [],
        cta: ''
      }));

      mockPreparedStatements.checkIntroduced.get.mockReturnValue(null);
    });

    test('should introduce link-logger-agent when context has URL', async () => {
      const context = { containsURL: true, hasLink: true };

      const results = await service.checkAndIntroduceAgents('user-123', context, mockDbSelector);

      expect(results.length).toBeGreaterThan(0);
      // Would check for link-logger-agent introduction
    });

    test('should introduce meeting-prep-agent when context mentions meeting', async () => {
      const context = { mentionsMeeting: true, hasMeetingKeywords: true };

      const results = await service.checkAndIntroduceAgents('user-123', context, mockDbSelector);

      expect(results.length).toBeGreaterThan(0);
    });

    test('should introduce multiple agents when multiple triggers', async () => {
      const context = {
        containsURL: true,
        mentionsMeeting: true,
        mentionsTodos: true
      };

      const results = await service.checkAndIntroduceAgents('user-123', context, mockDbSelector);

      expect(results.length).toBeGreaterThan(0);
    });

    test('should not introduce when no triggers', async () => {
      const context = {};

      const results = await service.checkAndIntroduceAgents('user-123', context, mockDbSelector);

      expect(results.length).toBe(0);
    });

    test('should handle introduction errors gracefully', async () => {
      const context = { containsURL: true };
      fs.readFile.mockRejectedValue(new Error('Config error'));

      const results = await service.checkAndIntroduceAgents('user-123', context, mockDbSelector);

      expect(results.some(r => !r.success)).toBe(true);
      expect(results.some(r => r.error)).toBe(true);
    });
  });
});
