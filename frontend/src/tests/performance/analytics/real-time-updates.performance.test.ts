/**
 * Performance Tests for Real-time Analytics Updates
 * Tests performance under various load conditions and real-time scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performance } from 'perf_hooks';
import { CostTrackingService } from '@/services/cost-tracking/CostTrackingService';

describe('Real-time Analytics Performance Tests', () => {
  let costTrackingService: CostTrackingService;

  beforeEach(() => {
    costTrackingService = new CostTrackingService({
      budgetLimits: {
        daily: 10.0,
        weekly: 50.0,
        monthly: 200.0
      },
      alertThresholds: {
        warning: 80,
        critical: 95
      },
      enableRealTimeTracking: true,
      enableAuditing: false,
      storageKey: 'perf-test-cost-tracking'
    });
  });

  afterEach(() => {
    costTrackingService.destroy();
  });

  describe('Token Usage Tracking Performance', () => {
    it('should track individual token usage within performance threshold', async () => {
      const startTime = performance.now();

      await costTrackingService.trackTokenUsage({
        provider: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        tokensUsed: 100,
        requestType: 'chat',
        component: 'PerformanceTest'
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within 10ms for single tracking
      expect(duration).toBeLessThan(10);
    });

    it('should handle burst token tracking efficiently', async () => {
      const batchSize = 100;
      const startTime = performance.now();

      const trackingPromises = Array.from({ length: batchSize }, (_, i) =>
        costTrackingService.trackTokenUsage({
          provider: 'claude',
          model: 'claude-3-5-sonnet-20241022',
          tokensUsed: 50 + (i % 100),
          requestType: 'chat',
          component: 'BurstTest',
          metadata: { batchIndex: i }
        })
      );

      await Promise.all(trackingPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete batch within 100ms
      expect(duration).toBeLessThan(100);

      // Verify all items were tracked
      const usage = costTrackingService.getUsageData({ component: 'BurstTest' });
      expect(usage).toHaveLength(batchSize);
    });

    it('should maintain performance under sustained load', async () => {
      const testDuration = 1000; // 1 second
      const targetRate = 50; // 50 events per second
      const interval = 1000 / targetRate; // 20ms intervals

      let eventCount = 0;
      const startTime = performance.now();

      const sustainedTest = new Promise<void>((resolve) => {
        const intervalId = setInterval(async () => {
          if (performance.now() - startTime >= testDuration) {
            clearInterval(intervalId);
            resolve();
            return;
          }

          await costTrackingService.trackTokenUsage({
            provider: 'claude',
            model: 'claude-3-5-sonnet-20241022',
            tokensUsed: 75,
            requestType: 'chat',
            component: 'SustainedTest',
            metadata: { eventNumber: eventCount++ }
          });
        }, interval);
      });

      await sustainedTest;

      const endTime = performance.now();
      const actualDuration = endTime - startTime;

      // Should complete within expected time + 10% tolerance
      expect(actualDuration).toBeLessThan(testDuration * 1.1);

      // Should have tracked expected number of events
      const usage = costTrackingService.getUsageData({ component: 'SustainedTest' });
      expect(usage.length).toBeGreaterThanOrEqual(targetRate * 0.9); // 90% of target rate
    });

    it('should handle concurrent tracking without data corruption', async () => {
      const concurrentUsers = 10;
      const eventsPerUser = 20;

      const startTime = performance.now();

      const userPromises = Array.from({ length: concurrentUsers }, (_, userId) =>
        Promise.all(Array.from({ length: eventsPerUser }, (_, eventId) =>
          costTrackingService.trackTokenUsage({
            provider: 'claude',
            model: 'claude-3-5-sonnet-20241022',
            tokensUsed: 100,
            requestType: 'chat',
            component: 'ConcurrentTest',
            sessionId: `user-${userId}`,
            metadata: { userId, eventId }
          })
        ))
      );

      await Promise.all(userPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time for concurrent load
      expect(duration).toBeLessThan(500);

      // Verify data integrity
      const allUsage = costTrackingService.getUsageData({ component: 'ConcurrentTest' });
      expect(allUsage).toHaveLength(concurrentUsers * eventsPerUser);

      // Verify no data corruption - each user should have correct event count
      for (let userId = 0; userId < concurrentUsers; userId++) {
        const userUsage = costTrackingService.getUsageData({ sessionId: `user-${userId}` });
        expect(userUsage).toHaveLength(eventsPerUser);
      }
    });
  });

  describe('Metrics Calculation Performance', () => {
    beforeEach(async () => {
      // Pre-populate with test data
      const testDataSize = 1000;
      for (let i = 0; i < testDataSize; i++) {
        await costTrackingService.trackTokenUsage({
          provider: i % 2 === 0 ? 'claude' : 'openai',
          model: i % 3 === 0 ? 'claude-3-5-sonnet-20241022' : 'gpt-4-turbo',
          tokensUsed: 50 + (i % 200),
          requestType: 'chat',
          component: 'MetricsTestData',
          metadata: { index: i }
        });
      }
    });

    it('should calculate metrics quickly for large datasets', () => {
      const iterations = 10;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const metrics = costTrackingService.getCostMetrics();
        expect(metrics.totalTokensUsed).toBeGreaterThan(0);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgDuration = duration / iterations;

      // Average calculation should be under 50ms
      expect(avgDuration).toBeLessThan(50);
    });

    it('should handle time-range filtering efficiently', () => {
      const now = new Date();
      const timeRanges = [
        { start: new Date(now.getTime() - 3600000), end: now }, // 1 hour
        { start: new Date(now.getTime() - 86400000), end: now }, // 1 day
        { start: new Date(now.getTime() - 604800000), end: now }, // 1 week
        { start: new Date(now.getTime() - 2592000000), end: now } // 1 month
      ];

      const startTime = performance.now();

      timeRanges.forEach(range => {
        const metrics = costTrackingService.getCostMetrics(range);
        expect(metrics).toBeDefined();
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // All time range calculations should complete quickly
      expect(duration).toBeLessThan(100);
    });

    it('should filter usage data efficiently', () => {
      const filters = [
        { provider: 'claude' },
        { model: 'claude-3-5-sonnet-20241022' },
        { component: 'MetricsTestData' },
        { provider: 'claude', model: 'claude-3-5-sonnet-20241022' },
        { limit: 100 }
      ];

      const startTime = performance.now();

      filters.forEach(filter => {
        const data = costTrackingService.getUsageData(filter);
        expect(data).toBeDefined();
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // All filtering operations should be fast
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should maintain reasonable memory usage with large datasets', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Add a large amount of data
      const largeDataSize = 5000;
      for (let i = 0; i < largeDataSize; i++) {
        await costTrackingService.trackTokenUsage({
          provider: 'claude',
          model: 'claude-3-5-sonnet-20241022',
          tokensUsed: 100,
          requestType: 'chat',
          component: 'MemoryTest',
          metadata: { index: i, data: 'x'.repeat(100) } // Add some bulk
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB for 5k records)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

      // Service should still be responsive
      const startTime = performance.now();
      const metrics = costTrackingService.getCostMetrics();
      const endTime = performance.now();

      expect(metrics.totalTokensUsed).toBe(largeDataSize * 100);
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should cleanup memory when data is cleared', async () => {
      // Add test data
      for (let i = 0; i < 1000; i++) {
        await costTrackingService.trackTokenUsage({
          provider: 'claude',
          model: 'claude-3-5-sonnet-20241022',
          tokensUsed: 100,
          requestType: 'chat',
          component: 'CleanupTest',
          metadata: { index: i }
        });
      }

      const memoryAfterData = process.memoryUsage().heapUsed;

      // Clear data
      costTrackingService.clearData();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const memoryAfterCleanup = process.memoryUsage().heapUsed;

      // Memory should be reduced after cleanup
      expect(memoryAfterCleanup).toBeLessThan(memoryAfterData);

      // Service should still work
      const metrics = costTrackingService.getCostMetrics();
      expect(metrics.totalTokensUsed).toBe(0);
    });
  });

  describe('Event System Performance', () => {
    it('should handle multiple event listeners efficiently', async () => {
      const listenerCount = 100;
      const eventCallbacks: Array<() => void> = [];

      // Add multiple listeners
      for (let i = 0; i < listenerCount; i++) {
        const callback = vi.fn();
        eventCallbacks.push(callback);
        costTrackingService.on('usage-tracked', callback);
      }

      const startTime = performance.now();

      // Track usage (should trigger all listeners)
      await costTrackingService.trackTokenUsage({
        provider: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        tokensUsed: 100,
        requestType: 'chat',
        component: 'EventTest'
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete quickly even with many listeners
      expect(duration).toBeLessThan(100);

      // All listeners should have been called
      eventCallbacks.forEach(callback => {
        expect(callback).toHaveBeenCalledOnce();
      });
    });

    it('should handle rapid event emissions', async () => {
      const callback = vi.fn();
      costTrackingService.on('usage-tracked', callback);

      const rapidEvents = 200;
      const startTime = performance.now();

      // Fire events rapidly
      const promises = Array.from({ length: rapidEvents }, (_, i) =>
        costTrackingService.trackTokenUsage({
          provider: 'claude',
          model: 'claude-3-5-sonnet-20241022',
          tokensUsed: 50,
          requestType: 'chat',
          component: 'RapidEventTest',
          metadata: { eventIndex: i }
        })
      );

      await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle rapid events efficiently
      expect(duration).toBeLessThan(200);
      expect(callback).toHaveBeenCalledTimes(rapidEvents);
    });
  });

  describe('Storage Performance', () => {
    it('should save to storage efficiently', async () => {
      // Mock localStorage to measure performance
      let saveCount = 0;
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn().mockImplementation((key, value) => {
        saveCount++;
        const startTime = performance.now();
        originalSetItem.call(localStorage, key, value);
        const endTime = performance.now();

        // Each save should be fast
        expect(endTime - startTime).toBeLessThan(10);
      });

      // Add data that triggers saves
      for (let i = 0; i < 10; i++) {
        await costTrackingService.trackTokenUsage({
          provider: 'claude',
          model: 'claude-3-5-sonnet-20241022',
          tokensUsed: 100,
          requestType: 'chat',
          component: 'StorageTest'
        });
      }

      // Should have saved data
      expect(saveCount).toBeGreaterThan(0);

      // Restore original function
      localStorage.setItem = originalSetItem;
    });

    it('should load from storage quickly', () => {
      const startTime = performance.now();

      // Create new service instance (triggers load from storage)
      const newService = new CostTrackingService({
        budgetLimits: { daily: 10, weekly: 50, monthly: 200 },
        alertThresholds: { warning: 80, critical: 95 },
        enableRealTimeTracking: true,
        enableAuditing: false,
        storageKey: 'perf-test-cost-tracking'
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should load quickly
      expect(duration).toBeLessThan(50);

      newService.destroy();
    });
  });

  describe('Real-world Scenario Performance', () => {
    it('should handle typical usage patterns efficiently', async () => {
      // Simulate real-world usage: periodic bursts of activity
      const sessionCount = 5;
      const messagesPerSession = 20;
      const sessionInterval = 100; // ms between sessions

      const startTime = performance.now();

      for (let session = 0; session < sessionCount; session++) {
        // Burst of messages in a session
        const sessionPromises = Array.from({ length: messagesPerSession }, (_, messageIndex) =>
          costTrackingService.trackTokenUsage({
            provider: 'claude',
            model: 'claude-3-5-sonnet-20241022',
            tokensUsed: 80 + (messageIndex * 10),
            requestType: 'chat',
            component: 'AviDirectChatSDK',
            sessionId: `session-${session}`,
            metadata: { messageIndex }
          })
        );

        await Promise.all(sessionPromises);

        // Pause between sessions (simulating user thinking time)
        if (session < sessionCount - 1) {
          await new Promise(resolve => setTimeout(resolve, sessionInterval));
        }
      }

      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      // Should complete realistic scenario efficiently
      expect(totalDuration).toBeLessThan(1000);

      // Verify all data was tracked correctly
      const totalUsage = costTrackingService.getUsageData();
      expect(totalUsage).toHaveLength(sessionCount * messagesPerSession);

      // Verify metrics calculation is still fast
      const metricsStartTime = performance.now();
      const metrics = costTrackingService.getCostMetrics();
      const metricsEndTime = performance.now();

      expect(metricsEndTime - metricsStartTime).toBeLessThan(20);
      expect(metrics.totalTokensUsed).toBeGreaterThan(0);
    });

    it('should maintain performance during budget alert checking', async () => {
      // Add data that will trigger budget alerts
      const startTime = performance.now();

      await costTrackingService.trackTokenUsage({
        provider: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        tokensUsed: 2500000, // High usage to trigger alerts
        requestType: 'chat',
        component: 'BudgetAlertTest'
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete quickly even with budget checking
      expect(duration).toBeLessThan(50);
    });
  });
});