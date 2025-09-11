/**
 * TDD London School: Real Data Transformers Test Suite
 * SPARC METHODOLOGY - REFINEMENT PHASE
 * 
 * Testing the elimination of mock data and integration of real API data
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  transformPerformanceMetricsToStats,
  generateRealActivities,
  generateRealPosts,
  transformApiDataToUnified,
  RealApiAgentData
} from '../../../frontend/src/utils/real-data-transformers';
import { AgentStats, AgentActivity, AgentPost } from '../../../frontend/src/components/UnifiedAgentPage';

describe('Real Data Transformers - Phase 1: Mock Data Elimination', () => {
  let mockApiData: RealApiAgentData;

  beforeEach(() => {
    mockApiData = {
      id: 'test-agent-123',
      name: 'TestAgent',
      display_name: 'Test Agent Pro',
      description: 'A test agent for validation',
      status: 'active',
      performance_metrics: {
        success_rate: 91.58647866794777,
        average_response_time: 303,
        total_tokens_used: 39607,
        error_count: 0,
        validations_completed: 194,
        uptime_percentage: 95.4805690897904
      },
      health_status: {
        cpu_usage: 32.246620083405034,
        memory_usage: 55.61611648401096,
        response_time: 212,
        last_heartbeat: '2025-09-10T18:20:09.023Z',
        status: 'healthy',
        active_tasks: 0
      },
      usage_count: 48,
      last_used: '2025-09-10T18:20:09.023Z'
    };
  });

  describe('transformPerformanceMetricsToStats', () => {
    it('should transform real performance metrics to AgentStats format', () => {
      const result: AgentStats = transformPerformanceMetricsToStats(mockApiData);

      expect(result.tasksCompleted).toBe(194); // From validations_completed
      expect(result.successRate).toBe(91.6); // Rounded success_rate
      expect(result.averageResponseTime).toBe(0.3); // 303ms converted to 0.3s
      expect(result.uptime).toBe(95.5); // Rounded uptime_percentage
      expect(result.todayTasks).toBe(6); // Estimated from validations_completed/30
      expect(result.weeklyTasks).toBe(48); // validations_completed/4
      expect(result.satisfaction).toBe(4.8); // Perfect score for 0 errors
    });

    it('should handle missing performance_metrics gracefully', () => {
      const dataWithoutMetrics: RealApiAgentData = {
        ...mockApiData,
        performance_metrics: undefined
      };

      const result = transformPerformanceMetricsToStats(dataWithoutMetrics);

      expect(result.tasksCompleted).toBe(48); // From usage_count
      expect(result.successRate).toBe(95); // Default for healthy status
      expect(result.averageResponseTime).toBe(0.2); // 212ms/1000 from health.response_time
      expect(result.uptime).toBe(95); // Default for healthy status
    });

    it('should calculate satisfaction based on error count', () => {
      const dataWithErrors = {
        ...mockApiData,
        performance_metrics: {
          ...mockApiData.performance_metrics!,
          error_count: 5
        }
      };

      const result = transformPerformanceMetricsToStats(dataWithErrors);
      
      expect(result.satisfaction).toBe(4.5); // 5 - (5 * 0.1) = 4.5
    });
  });

  describe('generateRealActivities', () => {
    it('should generate activities based on real API data', () => {
      const activities: AgentActivity[] = generateRealActivities(mockApiData);

      expect(activities).toHaveLength(4);
      expect(activities[0].id).toBe('activity-test-agent-123-validation');
      expect(activities[0].type).toBe('task_completed');
      expect(activities[0].title).toContain('194 Validations');
      expect(activities[0].description).toContain('91.6% success rate');
    });

    it('should include health status activity', () => {
      const activities = generateRealActivities(mockApiData);
      
      const healthActivity = activities.find(a => a.id.includes('heartbeat'));
      expect(healthActivity).toBeDefined();
      expect(healthActivity?.title).toBe('Health Status: healthy');
      expect(healthActivity?.description).toContain('CPU: 32.2%');
      expect(healthActivity?.description).toContain('Memory: 55.6%');
    });

    it('should create token milestone activity for high usage', () => {
      const activities = generateRealActivities(mockApiData);
      
      const tokenActivity = activities.find(a => a.id.includes('tokens'));
      expect(tokenActivity).toBeDefined();
      expect(tokenActivity?.title).toBe('39,607 Tokens Processed');
      expect(tokenActivity?.type).toBe('milestone');
    });

    it('should sort activities by timestamp descending', () => {
      const activities = generateRealActivities(mockApiData);
      
      for (let i = 0; i < activities.length - 1; i++) {
        const current = new Date(activities[i].timestamp).getTime();
        const next = new Date(activities[i + 1].timestamp).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });

  describe('generateRealPosts', () => {
    it('should generate posts based on performance metrics', () => {
      const posts: AgentPost[] = generateRealPosts(mockApiData);

      expect(posts).toHaveLength(3);
      
      const performancePost = posts.find(p => p.type === 'insight');
      expect(performancePost).toBeDefined();
      expect(performancePost?.title).toBe('Performance Metrics Update');
      expect(performancePost?.content).toContain('194 tasks completed');
      expect(performancePost?.content).toContain('91.6% success rate');
    });

    it('should generate health status post', () => {
      const posts = generateRealPosts(mockApiData);
      
      const healthPost = posts.find(p => p.title.includes('System Health'));
      expect(healthPost).toBeDefined();
      expect(healthPost?.content).toContain('status: healthy');
      expect(healthPost?.content).toContain('CPU: 32.2%');
      expect(healthPost?.tags).toContain('health');
    });

    it('should generate milestone posts for significant usage', () => {
      const posts = generateRealPosts(mockApiData);
      
      const milestonePost = posts.find(p => p.type === 'achievement');
      expect(milestonePost).toBeDefined();
      expect(milestonePost?.title).toContain('Usage Sessions Milestone');
      expect(milestonePost?.content).toContain('48 total usage sessions');
    });

    it('should calculate realistic interaction counts', () => {
      const posts = generateRealPosts(mockApiData);
      
      const performancePost = posts.find(p => p.type === 'insight');
      expect(performancePost?.interactions.likes).toBe(19); // 194/10
      expect(performancePost?.interactions.comments).toBe(3); // 194/50
      expect(performancePost?.interactions.shares).toBe(1); // 194/100
      expect(performancePost?.interactions.bookmarks).toBe(9); // 194/20
    });

    it('should sort posts by timestamp descending', () => {
      const posts = generateRealPosts(mockApiData);
      
      for (let i = 0; i < posts.length - 1; i++) {
        const current = new Date(posts[i].timestamp).getTime();
        const next = new Date(posts[i + 1].timestamp).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });

  describe('transformApiDataToUnified', () => {
    it('should orchestrate all transformations successfully', () => {
      const result = transformApiDataToUnified(mockApiData);

      expect(result.stats).toBeDefined();
      expect(result.stats.tasksCompleted).toBe(194);
      expect(result.recentActivities).toHaveLength(4);
      expect(result.recentPosts).toHaveLength(3);
    });

    it('should handle errors gracefully with safe defaults', () => {
      const invalidData = {} as RealApiAgentData;
      
      const result = transformApiDataToUnified(invalidData);

      expect(result.stats).toBeDefined();
      expect(result.stats.tasksCompleted).toBe(0);
      expect(result.stats.successRate).toBe(75);
      expect(result.recentActivities).toEqual([]);
      expect(result.recentPosts).toEqual([]);
    });

    it('should preserve agent usage count in fallback stats', () => {
      const dataWithUsageOnly: RealApiAgentData = {
        id: 'test',
        name: 'test',
        usage_count: 42
      };

      const result = transformApiDataToUnified(dataWithUsageOnly);

      expect(result.stats.tasksCompleted).toBe(42);
    });
  });

  describe('Data Quality and Elimination of Mock Values', () => {
    it('should never use Math.random() in generated data', () => {
      // Spy on Math.random to ensure it's never called
      const randomSpy = jest.spyOn(Math, 'random');
      
      const result = transformApiDataToUnified(mockApiData);
      
      // Verify transformations produce deterministic results
      expect(result.stats.successRate).toBe(91.6);
      expect(result.stats.averageResponseTime).toBe(0.3); // 303ms -> 0.3s
      expect(result.stats.uptime).toBe(95.5);
      
      // Ensure Math.random was never called during data transformation
      expect(randomSpy).not.toHaveBeenCalled();
      
      randomSpy.mockRestore();
    });

    it('should produce consistent results for same input data', () => {
      // Fix timestamps to be deterministic for testing
      const fixedTimestamp = '2025-09-10T18:20:09.023Z';
      const testData = { ...mockApiData, last_used: fixedTimestamp };
      
      const result1 = transformApiDataToUnified(testData);
      const result2 = transformApiDataToUnified(testData);

      expect(result1.stats).toEqual(result2.stats);
      // Skip timestamp comparison as it's based on Date.now()
      expect(result1.recentActivities.length).toBe(result2.recentActivities.length);
      expect(result1.recentPosts.length).toBe(result2.recentPosts.length);
    });

    it('should derive all numerical values from real API data', () => {
      const result = transformApiDataToUnified(mockApiData);

      // Verify stats are derived from performance_metrics
      expect(result.stats.tasksCompleted).toBe(mockApiData.performance_metrics?.validations_completed);
      expect(result.stats.successRate).toBe(Math.round(mockApiData.performance_metrics?.success_rate! * 10) / 10);
      expect(result.stats.uptime).toBe(Math.round(mockApiData.performance_metrics?.uptime_percentage! * 10) / 10);

      // Verify activities contain real metric references
      const validationActivity = result.recentActivities.find(a => a.title.includes('Validations'));
      expect(validationActivity?.description).toContain('194');
      expect(validationActivity?.description).toContain('91.6%');

      // Verify posts reference actual data
      const performancePost = result.recentPosts.find(p => p.type === 'insight');
      expect(performancePost?.content).toContain('194 tasks');
      expect(performancePost?.content).toContain('303ms');
    });
  });
});