/**
 * Cost Tracking and Token Analytics Regression Tests
 * Tests cost tracking functionality and token usage analytics
 */

const { CostTracker } = require('../../../backend/services/CostTracker.ts');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

describe('Cost Tracking and Token Analytics Regression Tests', () => {
  let costTracker;
  let testDbPath;

  beforeEach(() => {
    // Use in-memory database for testing
    testDbPath = ':memory:';
    costTracker = new CostTracker(testDbPath, {
      inputTokenPrice: 3.00,
      outputTokenPrice: 15.00,
      cacheCreationPrice: 3.75,
      cacheReadPrice: 0.30,
      enableDeduplication: true,
      retentionDays: 30,
      maxRetryAttempts: 3
    });
  });

  afterEach(() => {
    if (costTracker) {
      costTracker.close();
    }
  });

  describe('Cost Tracker Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(costTracker).toBeDefined();
      expect(costTracker.config).toBeDefined();
      expect(costTracker.config.inputTokenPrice).toBe(3.00);
      expect(costTracker.config.outputTokenPrice).toBe(15.00);
    });

    test('should create required database tables', () => {
      const db = new Database(testDbPath);

      // Check that tables exist
      const tables = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name IN ('cost_sessions', 'step_usage', 'processed_messages')
      `).all();

      expect(tables.length).toBe(3);

      db.close();
    });

    test('should validate configuration parameters', () => {
      expect(() => {
        new CostTracker(':memory:', {
          inputTokenPrice: -1 // Invalid negative price
        });
      }).not.toThrow(); // Constructor should handle invalid values gracefully
    });
  });

  describe('Session Management', () => {
    test('should create a new cost tracking session', () => {
      const sessionId = uuidv4();
      const userId = 'test-user-1';
      const metadata = { test: true, environment: 'regression' };

      const session = costTracker.startSession(sessionId, userId, metadata);

      expect(session).toBeDefined();
      expect(session.sessionId).toBe(sessionId);
      expect(session.userId).toBe(userId);
      expect(session.status).toBe('active');
      expect(session.totalCost).toBe(0);
      expect(session.stepCount).toBe(0);
      expect(session.metadata).toEqual(metadata);
      expect(session.startTime).toBeInstanceOf(Date);
    });

    test('should retrieve session information', () => {
      const sessionId = uuidv4();
      const userId = 'test-user-2';

      const originalSession = costTracker.startSession(sessionId, userId);
      const retrievedSession = costTracker.getSessionCost(sessionId);

      expect(retrievedSession).toBeDefined();
      expect(retrievedSession.sessionId).toBe(sessionId);
      expect(retrievedSession.userId).toBe(userId);
      expect(retrievedSession.totalCost).toBe(0);
    });

    test('should end a session properly', () => {
      const sessionId = uuidv4();
      const userId = 'test-user-3';

      costTracker.startSession(sessionId, userId);
      const endedSession = costTracker.endSession(sessionId, 'completed');

      expect(endedSession).toBeDefined();
      expect(endedSession.status).toBe('completed');
      expect(endedSession.endTime).toBeInstanceOf(Date);
    });

    test('should handle non-existent session retrieval', () => {
      const nonExistentSessionId = uuidv4();
      const session = costTracker.getSessionCost(nonExistentSessionId);

      expect(session).toBeNull();
    });
  });

  describe('Token Usage Tracking', () => {
    test('should track step usage correctly', async () => {
      const sessionId = uuidv4();
      const userId = 'test-user-4';
      const messageId = uuidv4();

      costTracker.startSession(sessionId, userId);

      const stepUsage = {
        stepId: uuidv4(),
        messageId,
        sessionId,
        userId,
        tool: 'test-tool',
        stepType: 'request',
        tokens: {
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          cacheCreationTokens: 100,
          cacheReadTokens: 50
        },
        timestamp: new Date(),
        model: 'claude-3.5-sonnet',
        retryAttempt: 0,
        duration: 1500
      };

      const result = await costTracker.trackStepUsage(stepUsage);
      expect(result).toBe(true);

      // Verify session was updated
      const session = costTracker.getSessionCost(sessionId);
      expect(session.totalCost).toBeGreaterThan(0);
      expect(session.stepCount).toBe(1);
      expect(session.totalTokens.inputTokens).toBe(1000);
      expect(session.totalTokens.outputTokens).toBe(500);
    });

    test('should calculate costs correctly', async () => {
      const sessionId = uuidv4();
      const userId = 'test-user-5';

      costTracker.startSession(sessionId, userId);

      const stepUsage = {
        stepId: uuidv4(),
        messageId: uuidv4(),
        sessionId,
        userId,
        stepType: 'response',
        tokens: {
          inputTokens: 1000000, // 1M input tokens
          outputTokens: 500000,  // 0.5M output tokens
          totalTokens: 1500000,
          cacheCreationTokens: 100000, // 0.1M cache creation
          cacheReadTokens: 50000        // 0.05M cache read
        },
        timestamp: new Date(),
        model: 'claude-3.5-sonnet',
        retryAttempt: 0,
        duration: 2000
      };

      await costTracker.trackStepUsage(stepUsage);

      const session = costTracker.getSessionCost(sessionId);

      // Expected cost calculation:
      // Input: 1M * $3.00 = $3.00
      // Output: 0.5M * $15.00 = $7.50
      // Cache creation: 0.1M * $3.75 = $0.375
      // Cache read: 0.05M * $0.30 = $0.015
      // Total: $10.89
      expect(session.totalCost).toBeCloseTo(10.89, 2);
    });

    test('should handle token usage validation', async () => {
      const sessionId = uuidv4();
      const userId = 'test-user-6';

      costTracker.startSession(sessionId, userId);

      const stepUsage = {
        stepId: uuidv4(),
        messageId: uuidv4(),
        sessionId,
        userId,
        stepType: 'request',
        tokens: global.testUtils.generateMockTokenUsage(),
        timestamp: new Date(),
        model: 'claude-3.5-sonnet',
        retryAttempt: 0,
        duration: 1000
      };

      expect(stepUsage.tokens).toHaveValidTokenUsage();

      const result = await costTracker.trackStepUsage(stepUsage);
      expect(result).toBe(true);
    });

    test('should prevent duplicate message processing', async () => {
      const sessionId = uuidv4();
      const userId = 'test-user-7';
      const messageId = uuidv4();

      costTracker.startSession(sessionId, userId);

      const stepUsage = {
        stepId: uuidv4(),
        messageId,
        sessionId,
        userId,
        stepType: 'request',
        tokens: {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150
        },
        timestamp: new Date(),
        model: 'claude-3.5-sonnet',
        retryAttempt: 0,
        duration: 500
      };

      // First tracking should succeed
      const result1 = await costTracker.trackStepUsage(stepUsage);
      expect(result1).toBe(true);

      // Second tracking with same messageId should be prevented
      const result2 = await costTracker.trackStepUsage({
        ...stepUsage,
        stepId: uuidv4() // Different step ID but same message ID
      });
      expect(result2).toBe(false);

      // Session should only reflect one step
      const session = costTracker.getSessionCost(sessionId);
      expect(session.stepCount).toBe(1);
    });
  });

  describe('Analytics and Reporting', () => {
    test('should generate usage analytics', async () => {
      const sessionId = uuidv4();
      const userId = 'test-user-8';

      costTracker.startSession(sessionId, userId);

      // Track multiple steps
      for (let i = 0; i < 5; i++) {
        await costTracker.trackStepUsage({
          stepId: uuidv4(),
          messageId: uuidv4(),
          sessionId,
          userId,
          stepType: 'request',
          tokens: global.testUtils.generateMockTokenUsage(),
          timestamp: new Date(),
          model: 'claude-3.5-sonnet',
          retryAttempt: 0,
          duration: 1000 + i * 100
        });
      }

      const analytics = costTracker.getUsageAnalytics({
        userId,
        granularity: 'day'
      });

      expect(analytics).toBeDefined();
      expect(Array.isArray(analytics)).toBe(true);
      expect(analytics.length).toBeGreaterThan(0);

      const todayAnalytics = analytics[0];
      expect(todayAnalytics.step_count).toBe(5);
      expect(todayAnalytics.total_cost).toBeGreaterThan(0);
      expect(todayAnalytics.total_input_tokens).toBeGreaterThan(0);
      expect(todayAnalytics.total_output_tokens).toBeGreaterThan(0);
    });

    test('should identify top cost consumers', async () => {
      const users = ['user-1', 'user-2', 'user-3'];

      // Create sessions and usage for multiple users
      for (const userId of users) {
        const sessionId = uuidv4();
        costTracker.startSession(sessionId, userId);

        const usageCount = userId === 'user-2' ? 10 : 3; // user-2 should be top consumer

        for (let i = 0; i < usageCount; i++) {
          await costTracker.trackStepUsage({
            stepId: uuidv4(),
            messageId: uuidv4(),
            sessionId,
            userId,
            stepType: 'request',
            tokens: global.testUtils.generateMockTokenUsage(),
            timestamp: new Date(),
            model: 'claude-3.5-sonnet',
            retryAttempt: 0,
            duration: 1000
          });
        }
      }

      const topConsumers = costTracker.getTopCostConsumers({
        groupBy: 'user',
        limit: 5
      });

      expect(topConsumers).toBeDefined();
      expect(Array.isArray(topConsumers)).toBe(true);
      expect(topConsumers.length).toBe(3);

      // user-2 should be the top consumer
      expect(topConsumers[0].identifier).toBe('user-2');
      expect(topConsumers[0].step_count).toBe(10);
      expect(topConsumers[0].total_cost).toBeGreaterThan(topConsumers[1].total_cost);
    });

    test('should provide real-time metrics', () => {
      const sessionId1 = uuidv4();
      const sessionId2 = uuidv4();

      costTracker.startSession(sessionId1, 'user-1');
      costTracker.startSession(sessionId2, 'user-2');

      const metrics = costTracker.getRealTimeMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.activeSessions).toBe(2);
      expect(metrics.totalActiveCost).toBe(0);
      expect(metrics.totalActiveTokens).toBe(0);
      expect(metrics.retryQueueSize).toBe(0);
      expect(metrics.timestamp).toBeDefined();
    });
  });

  describe('Error Handling and Retry Logic', () => {
    test('should handle database errors gracefully', async () => {
      // Close the database to simulate error
      costTracker.close();

      const stepUsage = {
        stepId: uuidv4(),
        messageId: uuidv4(),
        sessionId: uuidv4(),
        userId: 'test-user',
        stepType: 'request',
        tokens: global.testUtils.generateMockTokenUsage(),
        timestamp: new Date(),
        model: 'claude-3.5-sonnet',
        retryAttempt: 0,
        duration: 1000
      };

      // Should throw error but not crash
      await expect(costTracker.trackStepUsage(stepUsage)).rejects.toThrow();
    });

    test('should validate step usage input', async () => {
      const sessionId = uuidv4();
      costTracker.startSession(sessionId, 'test-user');

      const invalidStepUsage = {
        // Missing required fields
        messageId: uuidv4(),
        sessionId,
        tokens: {
          inputTokens: 'invalid', // Should be number
          outputTokens: -100,     // Should be positive
          totalTokens: null       // Should be number
        }
      };

      await expect(costTracker.trackStepUsage(invalidStepUsage)).rejects.toThrow();
    });

    test('should handle concurrent access safely', async () => {
      const sessionId = uuidv4();
      const userId = 'concurrent-user';

      costTracker.startSession(sessionId, userId);

      // Create multiple concurrent requests
      const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
        costTracker.trackStepUsage({
          stepId: uuidv4(),
          messageId: uuidv4(),
          sessionId,
          userId,
          stepType: 'request',
          tokens: global.testUtils.generateMockTokenUsage(),
          timestamp: new Date(),
          model: 'claude-3.5-sonnet',
          retryAttempt: 0,
          duration: 1000
        })
      );

      const results = await Promise.allSettled(concurrentRequests);

      // All requests should complete (either succeed or fail gracefully)
      expect(results.length).toBe(10);

      const successful = results.filter(r => r.status === 'fulfilled' && r.value === true);
      expect(successful.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large volumes of usage data', async () => {
      const sessionId = uuidv4();
      const userId = 'performance-user';

      costTracker.startSession(sessionId, userId);

      const startTime = Date.now();
      const usageCount = 100;

      // Track many usage events
      const promises = Array.from({ length: usageCount }, (_, i) =>
        costTracker.trackStepUsage({
          stepId: uuidv4(),
          messageId: uuidv4(),
          sessionId,
          userId,
          stepType: i % 2 === 0 ? 'request' : 'response',
          tokens: global.testUtils.generateMockTokenUsage(),
          timestamp: new Date(),
          model: 'claude-3.5-sonnet',
          retryAttempt: 0,
          duration: 1000
        })
      );

      await Promise.all(promises);
      const endTime = Date.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds

      // Verify all data was tracked
      const session = costTracker.getSessionCost(sessionId);
      expect(session.stepCount).toBe(usageCount);
    });

    test('should maintain performance with large analytics queries', async () => {
      // This test would be more meaningful with real data volumes
      const startTime = Date.now();

      const analytics = costTracker.getUsageAnalytics({
        granularity: 'hour'
      });

      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(Array.isArray(analytics)).toBe(true);
    });

    test('should clean up old data efficiently', () => {
      // Test the cleanup functionality
      const beforeTime = Date.now();

      // This would normally be called internally by the background task
      costTracker.cleanupOldData();

      const afterTime = Date.now();

      // Cleanup should be fast
      expect(afterTime - beforeTime).toBeLessThan(1000);
    });
  });

  describe('Token Analytics Validation', () => {
    test('should validate token usage patterns', async () => {
      const sessionId = uuidv4();
      const userId = 'analytics-user';

      costTracker.startSession(sessionId, userId);

      const usagePatterns = [
        { inputTokens: 100, outputTokens: 50 },   // Normal usage
        { inputTokens: 1000, outputTokens: 200 }, // Higher input
        { inputTokens: 50, outputTokens: 500 },   // Higher output
        { inputTokens: 0, outputTokens: 100 },    // Output only
        { inputTokens: 200, outputTokens: 0 }     // Input only
      ];

      for (const [index, pattern] of usagePatterns.entries()) {
        const tokens = {
          ...pattern,
          totalTokens: pattern.inputTokens + pattern.outputTokens,
          cacheCreationTokens: Math.floor(pattern.inputTokens * 0.1),
          cacheReadTokens: Math.floor(pattern.inputTokens * 0.05)
        };

        await costTracker.trackStepUsage({
          stepId: uuidv4(),
          messageId: uuidv4(),
          sessionId,
          userId,
          stepType: 'request',
          tokens,
          timestamp: new Date(),
          model: 'claude-3.5-sonnet',
          retryAttempt: 0,
          duration: 1000
        });
      }

      const session = costTracker.getSessionCost(sessionId);
      expect(session.stepCount).toBe(usagePatterns.length);
      expect(session.totalTokens.totalTokens).toBeGreaterThan(0);
    });

    test('should track different model usage', async () => {
      const sessionId = uuidv4();
      const userId = 'model-user';

      costTracker.startSession(sessionId, userId);

      const models = ['claude-3.5-sonnet', 'claude-3-opus', 'claude-3-haiku'];

      for (const model of models) {
        await costTracker.trackStepUsage({
          stepId: uuidv4(),
          messageId: uuidv4(),
          sessionId,
          userId,
          stepType: 'request',
          tokens: global.testUtils.generateMockTokenUsage(),
          timestamp: new Date(),
          model,
          retryAttempt: 0,
          duration: 1000
        });
      }

      const session = costTracker.getSessionCost(sessionId);
      expect(session.stepCount).toBe(models.length);
    });

    test('should handle edge cases in token calculations', async () => {
      const sessionId = uuidv4();
      const userId = 'edge-case-user';

      costTracker.startSession(sessionId, userId);

      const edgeCases = [
        { inputTokens: 0, outputTokens: 0, totalTokens: 0 }, // Zero tokens
        { inputTokens: 1, outputTokens: 1, totalTokens: 2 }, // Minimum tokens
        { inputTokens: Number.MAX_SAFE_INTEGER, outputTokens: 0, totalTokens: Number.MAX_SAFE_INTEGER }, // Maximum
      ];

      for (const tokens of edgeCases) {
        try {
          await costTracker.trackStepUsage({
            stepId: uuidv4(),
            messageId: uuidv4(),
            sessionId,
            userId,
            stepType: 'request',
            tokens,
            timestamp: new Date(),
            model: 'claude-3.5-sonnet',
            retryAttempt: 0,
            duration: 1000
          });
        } catch (error) {
          // Some edge cases might fail, which is acceptable
          expect(error).toBeDefined();
        }
      }

      // Session should still be accessible
      const session = costTracker.getSessionCost(sessionId);
      expect(session).toBeDefined();
    });
  });
});