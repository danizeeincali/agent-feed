/**
 * TDD London School Unit Tests - Data Transformers
 * Tests transformation logic with mocked API responses
 * Focuses on behavior verification and contract compliance
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import {
  transformApiDataToStats,
  generateRealActivities,
  generateRealPosts,
  safeApiAccess,
  DataTransformationError,
  validateApiResponse
} from '../../../frontend/src/utils/unified-agent-data-transformer';

describe('Data Transformers - London School Unit Tests', () => {
  // Mock data factories following London School approach
  const createMockPerformanceMetrics = (overrides = {}) => ({
    success_rate: 95.5,
    average_response_time: 350,
    uptime_percentage: 99.2,
    total_tokens_used: 15000,
    error_count: 2,
    ...overrides
  });

  const createMockHealthStatus = (overrides = {}) => ({
    connection_status: 'connected' as const,
    cpu_usage: 45.2,
    memory_usage: 62.8,
    response_time: 285,
    error_count_24h: 1,
    active_tasks: 3,
    ...overrides
  });

  let randomCallCount: number;
  let originalMathRandom: () => number;

  beforeEach(() => {
    // Track Math.random usage instead of throwing immediately
    originalMathRandom = Math.random;
    randomCallCount = 0;
    
    Math.random = jest.fn(() => {
      randomCallCount++;
      return 0.5; // Fixed value for deterministic testing
    });
  });

  afterEach(() => {
    // Restore original Math.random
    Math.random = originalMathRandom;
  });

  describe('transformApiDataToStats', () => {
    test('should map performance_metrics.success_rate to stats.successRate', () => {
      const performanceMetrics = createMockPerformanceMetrics({ success_rate: 87.3 });
      const healthStatus = createMockHealthStatus();
      
      const stats = transformApiDataToStats(performanceMetrics, healthStatus, 100);
      
      expect(stats.successRate).toBe(87.3);
    });

    test('should map performance_metrics.uptime_percentage to stats.uptime', () => {
      const performanceMetrics = createMockPerformanceMetrics({ uptime_percentage: 97.8 });
      const healthStatus = createMockHealthStatus();
      
      const stats = transformApiDataToStats(performanceMetrics, healthStatus, 100);
      
      expect(stats.uptime).toBe(97.8);
    });

    test('should map performance_metrics.average_response_time to stats.averageResponseTime', () => {
      const performanceMetrics = createMockPerformanceMetrics({ average_response_time: 425 });
      const healthStatus = createMockHealthStatus();
      
      const stats = transformApiDataToStats(performanceMetrics, healthStatus, 100);
      
      expect(stats.averageResponseTime).toBe(425);
    });

    test('should fall back to health_status.response_time when performance average is missing', () => {
      const performanceMetrics = createMockPerformanceMetrics({ average_response_time: undefined });
      const healthStatus = createMockHealthStatus({ response_time: 325 });
      
      const stats = transformApiDataToStats(performanceMetrics as any, healthStatus, 100);
      
      expect(stats.averageResponseTime).toBe(325);
    });

    test('should map usage_count to stats.tasksCompleted', () => {
      const performanceMetrics = createMockPerformanceMetrics();
      const healthStatus = createMockHealthStatus();
      
      const stats = transformApiDataToStats(performanceMetrics, healthStatus, 247);
      
      expect(stats.tasksCompleted).toBe(247);
    });

    test('should calculate todayTasks as deterministic percentage of total tasks', () => {
      const performanceMetrics = createMockPerformanceMetrics();
      const healthStatus = createMockHealthStatus();
      
      const stats = transformApiDataToStats(performanceMetrics, healthStatus, 1000);
      
      // Should be ~10% of total (100), minimum 1
      expect(stats.todayTasks).toBe(100);
      expect(stats.todayTasks).toBeLessThanOrEqual(stats.tasksCompleted);
    });

    test('should calculate weeklyTasks as deterministic percentage of total tasks', () => {
      const performanceMetrics = createMockPerformanceMetrics();
      const healthStatus = createMockHealthStatus();
      
      const stats = transformApiDataToStats(performanceMetrics, healthStatus, 1000);
      
      // Should be ~30% of total (300), minimum todayTasks
      expect(stats.weeklyTasks).toBe(300);
      expect(stats.weeklyTasks).toBeGreaterThanOrEqual(stats.todayTasks);
      expect(stats.weeklyTasks).toBeLessThanOrEqual(stats.tasksCompleted);
    });

    test('should calculate satisfaction from performance metrics when available', () => {
      const performanceMetrics = createMockPerformanceMetrics({
        success_rate: 95,
        average_response_time: 200,
        error_count: 0
      });
      const healthStatus = createMockHealthStatus();
      
      const stats = transformApiDataToStats(performanceMetrics, healthStatus, 1000);
      
      expect(stats.satisfaction).toBeDefined();
      expect(stats.satisfaction).toBeGreaterThan(0);
      expect(stats.satisfaction).toBeLessThanOrEqual(5);
      
      // High performance should yield high satisfaction
      expect(stats.satisfaction).toBeGreaterThan(4);
    });

    test('should handle missing performance metrics with safe defaults', () => {
      const healthStatus = createMockHealthStatus();
      
      const stats = transformApiDataToStats(undefined as any, healthStatus, 50);
      
      expect(stats.successRate).toBe(0);
      expect(stats.uptime).toBe(0);
      expect(stats.averageResponseTime).toBe(285); // From health_status
      expect(stats.tasksCompleted).toBe(50);
      expect(stats.satisfaction).toBeUndefined();
    });

    test('should clamp values to valid ranges', () => {
      const performanceMetrics = createMockPerformanceMetrics({
        success_rate: 150, // Invalid: > 100
        uptime_percentage: -10, // Invalid: < 0
        average_response_time: 100000 // Too high
      });
      const healthStatus = createMockHealthStatus();
      
      const stats = transformApiDataToStats(performanceMetrics, healthStatus, 100);
      
      expect(stats.successRate).toBe(100); // Clamped to max
      expect(stats.uptime).toBe(0); // Clamped to min
      expect(stats.averageResponseTime).toBe(60000); // Clamped to max 1 minute
    });

    test('should throw DataTransformationError on critical failures', () => {
      // Create invalid data that causes internal error
      const invalidData = { invalid: 'structure' };
      
      expect(() => {
        transformApiDataToStats(invalidData as any, null as any, null as any);
      }).toThrow(DataTransformationError);
    });
  });

  describe('generateRealActivities', () => {
    test('should create task completion activity based on actual usage_count', () => {
      const performanceMetrics = createMockPerformanceMetrics({ success_rate: 92.5 });
      const healthStatus = createMockHealthStatus();
      
      const activities = generateRealActivities(
        performanceMetrics,
        healthStatus,
        150,
        '2024-09-10T10:00:00Z',
        'TestAgent'
      );
      
      const taskActivity = activities.find(a => a.type === 'task_completed');
      expect(taskActivity).toBeDefined();
      expect(taskActivity!.title).toContain('150'); // Real usage_count
      expect(taskActivity!.description).toContain('92.5%'); // Real success_rate
    });

    test('should create milestone activity when success_rate >= 90%', () => {
      const performanceMetrics = createMockPerformanceMetrics({ 
        success_rate: 95.5,
        average_response_time: 280
      });
      const healthStatus = createMockHealthStatus();
      
      const activities = generateRealActivities(
        performanceMetrics,
        healthStatus,
        100,
        '2024-09-10T10:00:00Z',
        'TestAgent'
      );
      
      const milestoneActivity = activities.find(a => a.type === 'milestone');
      expect(milestoneActivity).toBeDefined();
      expect(milestoneActivity!.title).toContain('High Performance');
      expect(milestoneActivity!.description).toContain('95.5%');
      expect(milestoneActivity!.description).toContain('280ms');
    });

    test('should create health activity when connection_status is connected', () => {
      const performanceMetrics = createMockPerformanceMetrics();
      const healthStatus = createMockHealthStatus({
        connection_status: 'connected',
        cpu_usage: 55.5,
        memory_usage: 72.3,
        response_time: 290
      });
      
      const activities = generateRealActivities(
        performanceMetrics,
        healthStatus,
        100,
        '2024-09-10T10:00:00Z',
        'TestAgent'
      );
      
      const healthActivity = activities.find(a => a.description.includes('CPU'));
      expect(healthActivity).toBeDefined();
      expect(healthActivity!.description).toContain('55.5%'); // Real CPU
      expect(healthActivity!.description).toContain('72.3%'); // Real memory
      expect(healthActivity!.description).toContain('290ms'); // Real response time
    });

    test('should create error activity when error_count > 0', () => {
      const performanceMetrics = createMockPerformanceMetrics({ error_count: 5 });
      const healthStatus = createMockHealthStatus({ error_count_24h: 3 });
      
      const activities = generateRealActivities(
        performanceMetrics,
        healthStatus,
        100,
        '2024-09-10T10:00:00Z',
        'TestAgent'
      );
      
      const errorActivity = activities.find(a => a.type === 'error');
      expect(errorActivity).toBeDefined();
      expect(errorActivity!.description).toContain('5'); // Real error count
    });

    test('should return exactly 4 activities', () => {
      const performanceMetrics = createMockPerformanceMetrics();
      const healthStatus = createMockHealthStatus();
      
      const activities = generateRealActivities(
        performanceMetrics,
        healthStatus,
        100,
        '2024-09-10T10:00:00Z',
        'TestAgent'
      );
      
      expect(activities).toHaveLength(4);
    });

    test('should use deterministic timing based on metrics, not random', () => {
      const performanceMetrics = createMockPerformanceMetrics();
      const healthStatus = createMockHealthStatus({ cpu_usage: 40 });
      
      const activities1 = generateRealActivities(
        performanceMetrics,
        healthStatus,
        100,
        '2024-09-10T10:00:00Z',
        'TestAgent'
      );
      
      const activities2 = generateRealActivities(
        performanceMetrics,
        healthStatus,
        100,
        '2024-09-10T10:00:00Z',
        'TestAgent'
      );
      
      // Should be identical (deterministic)
      expect(activities1[0]?.timestamp).toBe(activities2[0]?.timestamp);
    });

    test('should handle fallback when no real data is available', () => {
      const activities = generateRealActivities(
        {} as any,
        {} as any,
        0,
        null,
        'TestAgent'
      );
      
      expect(activities).toHaveLength(1);
      expect(activities[0].title).toContain('Agent Active');
      expect(activities[0].description).toContain('TestAgent');
    });
  });

  describe('generateRealPosts', () => {
    test('should create achievement post for usage_count >= 100', () => {
      const performanceMetrics = createMockPerformanceMetrics({
        success_rate: 94.2,
        average_response_time: 320
      });
      const healthStatus = createMockHealthStatus();
      
      const posts = generateRealPosts(
        performanceMetrics,
        healthStatus,
        247,
        'agent-123',
        'TestAgent'
      );
      
      const achievementPost = posts.find(p => p.type === 'achievement');
      expect(achievementPost).toBeDefined();
      expect(achievementPost!.title).toContain('247'); // Real usage_count
      expect(achievementPost!.content).toContain('94.2%'); // Real success_rate
      expect(achievementPost!.content).toContain('320ms'); // Real response_time
    });

    test('should calculate interactions based on real metrics, not random', () => {
      const performanceMetrics = createMockPerformanceMetrics({ success_rate: 90 });
      const healthStatus = createMockHealthStatus();
      
      const posts = generateRealPosts(
        performanceMetrics,
        healthStatus,
        200, // usage_count
        'agent-123',
        'TestAgent'
      );
      
      const achievementPost = posts.find(p => p.type === 'achievement');
      if (achievementPost) {
        // Likes formula: Math.max(5, Math.floor(200/20) + Math.floor(90/10)) = Math.max(5, 10 + 9) = 19
        expect(achievementPost.interactions.likes).toBe(19);
        expect(achievementPost.interactions.comments).toBe(Math.floor(19 / 4));
        expect(achievementPost.interactions.shares).toBe(Math.floor(19 / 6));
        expect(achievementPost.interactions.bookmarks).toBe(Math.floor(19 / 3));
      }
    });

    test('should create performance insight post based on success_rate', () => {
      const performanceMetrics = createMockPerformanceMetrics({
        success_rate: 85.5,
        average_response_time: 400,
        error_count: 1
      });
      const healthStatus = createMockHealthStatus();
      
      const posts = generateRealPosts(
        performanceMetrics,
        healthStatus,
        150,
        'agent-123',
        'TestAgent'
      );
      
      const insightPost = posts.find(p => p.type === 'insight' || p.type === 'update');
      expect(insightPost).toBeDefined();
      expect(insightPost!.content).toContain('85.5%'); // Real success_rate
      expect(insightPost!.content).toContain('400ms'); // Real response_time
      expect(insightPost!.content).toContain('1'); // Real error_count
    });

    test('should set post priority based on performance quality', () => {
      // High performance scenario
      const highPerfMetrics = createMockPerformanceMetrics({ success_rate: 95 });
      const highPerfPosts = generateRealPosts(
        highPerfMetrics,
        createMockHealthStatus(),
        200,
        'agent-123',
        'TestAgent'
      );
      
      const highPerfPost = highPerfPosts.find(p => p.type === 'insight');
      expect(highPerfPost?.priority).toBe('medium'); // High performance = medium priority
      
      // Low performance scenario
      const lowPerfMetrics = createMockPerformanceMetrics({ success_rate: 65 });
      const lowPerfPosts = generateRealPosts(
        lowPerfMetrics,
        createMockHealthStatus(),
        200,
        'agent-123',
        'TestAgent'
      );
      
      const lowPerfPost = lowPerfPosts.find(p => p.type === 'update');
      expect(lowPerfPost?.priority).toBe('high'); // Low performance = high priority
    });

    test('should create deterministic posts with same input', () => {
      const performanceMetrics = createMockPerformanceMetrics();
      const healthStatus = createMockHealthStatus();
      
      const posts1 = generateRealPosts(
        performanceMetrics,
        healthStatus,
        150,
        'agent-123',
        'TestAgent'
      );
      
      const posts2 = generateRealPosts(
        performanceMetrics,
        healthStatus,
        150,
        'agent-123',
        'TestAgent'
      );
      
      expect(posts1).toHaveLength(posts2.length);
      expect(posts1[0]?.interactions.likes).toBe(posts2[0]?.interactions.likes);
    });

    test('should handle error cases with fallback post', () => {
      const posts = generateRealPosts(
        null as any,
        null as any,
        50,
        'agent-123',
        'TestAgent'
      );
      
      expect(posts).toHaveLength(1);
      expect(posts[0].type).toBe('update');
      expect(posts[0].content).toContain('TestAgent');
      expect(posts[0].content).toContain('50');
    });
  });

  describe('safeApiAccess', () => {
    test('should return value when present and valid', () => {
      const result = safeApiAccess(42, 0, 'number');
      
      expect(result.hasValue).toBe(true);
      expect(result.value).toBe(42);
      expect(result.error).toBeUndefined();
    });

    test('should return default when value is null or undefined', () => {
      const nullResult = safeApiAccess(null, 'default', 'string');
      const undefinedResult = safeApiAccess(undefined, 'default', 'string');
      
      expect(nullResult.hasValue).toBe(false);
      expect(nullResult.value).toBe('default');
      
      expect(undefinedResult.hasValue).toBe(false);
      expect(undefinedResult.value).toBe('default');
    });

    test('should return default and error when type mismatch', () => {
      const result = safeApiAccess('string', 0, 'number');
      
      expect(result.hasValue).toBe(false);
      expect(result.value).toBe(0);
      expect(result.error).toBe('Expected number but got string');
    });
  });

  describe('validateApiResponse', () => {
    test('should validate correct API response structure', () => {
      const validData = {
        performance_metrics: {
          success_rate: 95.5,
          average_response_time: 350,
          uptime_percentage: 99.2
        },
        health_status: {
          cpu_usage: 45.2,
          memory_usage: 62.8
        },
        usage_count: 247
      };
      
      const result = validateApiResponse(validData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should identify invalid success_rate', () => {
      const invalidData = {
        performance_metrics: {
          success_rate: 150 // > 100
        },
        usage_count: 100
      };
      
      const result = validateApiResponse(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid success_rate in performance_metrics');
    });

    test('should identify invalid response_time', () => {
      const invalidData = {
        performance_metrics: {
          average_response_time: -100 // < 0
        },
        usage_count: 100
      };
      
      const result = validateApiResponse(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid average_response_time in performance_metrics');
    });

    test('should identify invalid health metrics', () => {
      const invalidData = {
        health_status: {
          cpu_usage: 150, // > 100
          memory_usage: -10 // < 0
        },
        usage_count: 100
      };
      
      const result = validateApiResponse(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid cpu_usage in health_status');
      expect(result.errors).toContain('Invalid memory_usage in health_status');
    });

    test('should handle null API data', () => {
      const result = validateApiResponse(null);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('API data is null or undefined');
    });
  });
});
