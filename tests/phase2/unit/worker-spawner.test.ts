/**
 * Worker Spawner Unit Tests
 * London School TDD: Mock all external dependencies
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { WorkerConfig, WorkerResult, WorkerContext } from '../../../src/types/worker';

// Mock dependencies
const mockComposeAgentContext = jest.fn();
const mockClaudeApi = jest.fn();

// Mock the database context composer
jest.mock('../../../src/database/context-composer', () => ({
  composeAgentContext: mockComposeAgentContext,
}));

// Import after mocking
import { WorkerSpawner } from '../../../src/workers/worker-spawner';

describe('WorkerSpawner', () => {
  let spawner: WorkerSpawner;
  let validConfig: WorkerConfig;
  let mockContext: WorkerContext;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup valid test data
    validConfig = {
      userId: 'user-123',
      agentName: 'TestAgent',
      taskType: 'post_response',
      payload: { postId: 'post-456', content: 'Test post' },
    };

    mockContext = {
      userId: 'user-123',
      agentName: 'TestAgent',
      agentMemory: { knowledge: 'test knowledge' },
      userPreferences: { theme: 'dark' },
      recentInteractions: [{ type: 'response', timestamp: Date.now() }],
    };

    // Default mock implementations with small delay to ensure duration > 0
    mockComposeAgentContext.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve(mockContext), 1))
    );
    mockClaudeApi.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({
        content: [{ type: 'text', text: 'Agent response' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      }), 1))
    );

    // Create fresh spawner instance with mock task executor
    spawner = new WorkerSpawner(mockClaudeApi);
  });

  describe('spawn', () => {
    it('should spawn worker with valid config', async () => {
      const result = await spawner.spawn(validConfig);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.tokensUsed).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should load context from database', async () => {
      await spawner.spawn(validConfig);

      expect(mockComposeAgentContext).toHaveBeenCalledTimes(1);
      expect(mockComposeAgentContext).toHaveBeenCalledWith(
        validConfig.userId,
        validConfig.agentName
      );
    });

    it('should execute worker task with loaded context', async () => {
      const result = await spawner.spawn(validConfig);

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
    });

    it('should return worker result with metrics', async () => {
      const result = await spawner.spawn(validConfig);

      expect(result).toMatchObject({
        success: expect.any(Boolean),
        tokensUsed: expect.any(Number),
        duration: expect.any(Number),
      });

      if (result.success) {
        expect(result.output).toBeDefined();
        expect(result.error).toBeUndefined();
      }
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockComposeAgentContext.mockRejectedValue(dbError);

      const result = await spawner.spawn(validConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Database connection failed');
      expect(result.tokensUsed).toBe(0);
    });

    it('should handle worker execution errors gracefully', async () => {
      mockClaudeApi.mockRejectedValue(new Error('API timeout'));

      const result = await spawner.spawn(validConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.tokensUsed).toBe(0);
    });

    it('should track active workers during execution', async () => {
      const spawnPromise = spawner.spawn(validConfig);

      // Check during execution
      expect(spawner.getActiveCount()).toBe(1);

      await spawnPromise;

      // Check after completion
      expect(spawner.getActiveCount()).toBe(0);
    });

    it('should assign unique worker IDs', async () => {
      const promises = [
        spawner.spawn(validConfig),
        spawner.spawn({ ...validConfig, userId: 'user-456' }),
      ];

      // During execution, should have 2 active
      expect(spawner.getActiveCount()).toBe(2);

      await Promise.all(promises);

      // After completion, should have 0 active
      expect(spawner.getActiveCount()).toBe(0);
    });
  });

  describe('concurrency limits', () => {
    it('should respect max concurrent workers limit', async () => {
      const maxWorkers = 10;
      const attempts = 15;

      // Slow down mock to test concurrency
      mockClaudeApi.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          content: [{ type: 'text', text: 'Response' }],
          usage: { input_tokens: 10, output_tokens: 5 },
        }), 50))
      );

      // Spawn more workers than the limit
      const promises = Array(attempts).fill(null).map((_, i) =>
        spawner.spawn({ ...validConfig, userId: `user-${i}` })
      );

      // Check that we never exceed max workers
      expect(spawner.getActiveCount()).toBeLessThanOrEqual(maxWorkers);

      await Promise.all(promises);

      // All should complete
      expect(spawner.getActiveCount()).toBe(0);
    });

    it('should queue workers when at capacity', async () => {
      const maxWorkers = 10;

      // Create slow workers
      mockClaudeApi.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          content: [{ type: 'text', text: 'Response' }],
          usage: { input_tokens: 10, output_tokens: 5 },
        }), 100))
      );

      // Spawn max + 5 workers
      const promises = Array(15).fill(null).map((_, i) =>
        spawner.spawn({ ...validConfig, userId: `user-${i}` })
      );

      // Should not exceed limit
      expect(spawner.getActiveCount()).toBeLessThanOrEqual(maxWorkers);

      const results = await Promise.all(promises);

      // All should complete successfully
      expect(results).toHaveLength(15);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should report when spawner is at capacity', async () => {
      // Fill to capacity with slow workers
      mockClaudeApi.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          content: [{ type: 'text', text: 'Response' }],
          usage: { input_tokens: 10, output_tokens: 5 },
        }), 200))
      );

      // Spawn exactly max workers
      const promises = Array(10).fill(null).map((_, i) =>
        spawner.spawn({ ...validConfig, userId: `user-${i}` })
      );

      // Wait a bit for workers to start
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should report unable to spawn
      expect(spawner.canSpawn()).toBe(false);

      await Promise.all(promises);

      // Should be able to spawn again
      expect(spawner.canSpawn()).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should cleanup after worker completion', async () => {
      const result = await spawner.spawn(validConfig);

      expect(result.success).toBe(true);
      expect(spawner.getActiveCount()).toBe(0);
    });

    it('should cleanup even on worker failure', async () => {
      mockComposeAgentContext.mockRejectedValue(new Error('Context load failed'));

      const result = await spawner.spawn(validConfig);

      expect(result.success).toBe(false);
      expect(spawner.getActiveCount()).toBe(0);
    });

    it('should cleanup multiple workers independently', async () => {
      // Make one worker fast, one slow
      let callCount = 0;
      mockClaudeApi.mockImplementation(() => {
        const delay = callCount++ === 0 ? 10 : 100;
        return new Promise(resolve => setTimeout(() => resolve({
          content: [{ type: 'text', text: 'Response' }],
          usage: { input_tokens: 10, output_tokens: 5 },
        }), delay));
      });

      const promise1 = spawner.spawn(validConfig);
      const promise2 = spawner.spawn({ ...validConfig, userId: 'user-2' });

      // Both should be active
      expect(spawner.getActiveCount()).toBe(2);

      // Wait for first to complete
      await promise1;
      expect(spawner.getActiveCount()).toBe(1);

      // Wait for second to complete
      await promise2;
      expect(spawner.getActiveCount()).toBe(0);
    });
  });

  describe('task types', () => {
    it('should handle post_response task type', async () => {
      const config: WorkerConfig = {
        userId: 'user-123',
        agentName: 'TestAgent',
        taskType: 'post_response',
        payload: { postId: 'post-789', content: 'Test content' },
      };

      const result = await spawner.spawn(config);

      expect(result.success).toBe(true);
      expect(mockComposeAgentContext).toHaveBeenCalledWith('user-123', 'TestAgent');
    });

    it('should handle memory_update task type', async () => {
      const config: WorkerConfig = {
        userId: 'user-123',
        agentName: 'TestAgent',
        taskType: 'memory_update',
        payload: { memory: 'new knowledge' },
      };

      const result = await spawner.spawn(config);

      expect(result.success).toBe(true);
      expect(mockComposeAgentContext).toHaveBeenCalledWith('user-123', 'TestAgent');
    });
  });

  describe('metrics', () => {
    it('should track token usage from API response', async () => {
      mockClaudeApi.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 250, output_tokens: 150 },
      });

      const result = await spawner.spawn(validConfig);

      expect(result.tokensUsed).toBe(400); // 250 + 150
    });

    it('should measure execution duration', async () => {
      const startTime = Date.now();

      const result = await spawner.spawn(validConfig);

      const actualDuration = Date.now() - startTime;

      expect(result.duration).toBeGreaterThan(0);
      expect(result.duration).toBeLessThanOrEqual(actualDuration + 10); // Small buffer
    });

    it('should track duration even on failure', async () => {
      mockComposeAgentContext.mockImplementation(() =>
        new Promise((_, reject) => setTimeout(() => reject(new Error('Failed')), 1))
      );

      const result = await spawner.spawn(validConfig);

      expect(result.success).toBe(false);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.tokensUsed).toBe(0);
    });
  });

  describe('getActiveCount', () => {
    it('should return 0 when no workers active', () => {
      expect(spawner.getActiveCount()).toBe(0);
    });

    it('should return correct count during execution', async () => {
      mockClaudeApi.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          content: [{ type: 'text', text: 'Response' }],
          usage: { input_tokens: 10, output_tokens: 5 },
        }), 50))
      );

      const promise1 = spawner.spawn(validConfig);
      const promise2 = spawner.spawn({ ...validConfig, userId: 'user-2' });
      const promise3 = spawner.spawn({ ...validConfig, userId: 'user-3' });

      expect(spawner.getActiveCount()).toBe(3);

      await Promise.all([promise1, promise2, promise3]);

      expect(spawner.getActiveCount()).toBe(0);
    });
  });

  describe('canSpawn', () => {
    it('should return true when under capacity', () => {
      expect(spawner.canSpawn()).toBe(true);
    });

    it('should return false when at capacity', async () => {
      mockClaudeApi.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          content: [{ type: 'text', text: 'Response' }],
          usage: { input_tokens: 10, output_tokens: 5 },
        }), 100))
      );

      // Fill to capacity
      const promises = Array(10).fill(null).map((_, i) =>
        spawner.spawn({ ...validConfig, userId: `user-${i}` })
      );

      // Wait for workers to start
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(spawner.canSpawn()).toBe(false);

      await Promise.all(promises);

      expect(spawner.canSpawn()).toBe(true);
    });
  });
});
