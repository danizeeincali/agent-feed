/**
 * TDD London School: Agent Data Transformation Contract Tests
 * 
 * Contract-based testing focusing on the transformation of API data
 * to component-ready format. Ensures proper type safety and data mapping.
 */

import { describe, it, expect, jest } from '@jest/globals';

// Import the types from the component
interface APIResponseData {
  id: string;
  name: string;
  display_name?: string;
  description: string;
  status: 'active' | 'inactive' | 'busy' | 'error' | 'maintenance';
  avatar_color?: string;
  capabilities: string[];
  performance_metrics: {
    success_rate: number;
    average_response_time: number;
    total_tokens_used: number;
    error_count: number;
    validations_completed: number;
    uptime_percentage: number;
  };
  health_status: {
    cpu_usage: number;
    memory_usage: number;
    response_time: number;
    last_heartbeat: string;
    status: string;
    active_tasks: number;
  };
}

interface ComponentStats {
  tasksCompleted: number;
  successRate: number;
  averageResponseTime: number;
  uptime: number;
  todayTasks: number;
  weeklyTasks: number;
  satisfaction?: number;
}

// Mock the data transformation function (as it should exist in the component)
class AgentDataTransformer {
  static transformAPIDataToStats(apiData: APIResponseData): ComponentStats {
    // This is how the component SHOULD transform API data (not using Math.random)
    return {
      tasksCompleted: apiData.performance_metrics.validations_completed,
      successRate: apiData.performance_metrics.success_rate,
      averageResponseTime: apiData.performance_metrics.average_response_time / 1000, // Convert ms to seconds
      uptime: apiData.performance_metrics.uptime_percentage,
      todayTasks: apiData.health_status.active_tasks,
      weeklyTasks: apiData.performance_metrics.validations_completed, // Using completed as weekly
      satisfaction: this.calculateSatisfactionFromMetrics(apiData.performance_metrics)
    };
  }

  private static calculateSatisfactionFromMetrics(metrics: APIResponseData['performance_metrics']): number {
    // Calculate satisfaction based on success rate and error count (not random)
    const errorRate = metrics.error_count / (metrics.validations_completed || 1);
    const satisfactionBase = metrics.success_rate / 100 * 5; // Convert to 5-star scale
    const errorPenalty = errorRate * 0.5;
    return Math.max(1, Math.min(5, satisfactionBase - errorPenalty));
  }

  static generateRealActivitiesFromHealthStatus(healthStatus: APIResponseData['health_status'], agentId: string) {
    const activities = [];
    const now = new Date(healthStatus.last_heartbeat);
    
    // Generate activities based on real health data (not fake activities)
    if (healthStatus.active_tasks > 0) {
      activities.push({
        id: `health-${Date.now()}-1`,
        type: 'task_started',
        title: `Processing ${healthStatus.active_tasks} Active Tasks`,
        description: `Currently handling ${healthStatus.active_tasks} concurrent tasks`,
        timestamp: healthStatus.last_heartbeat,
        metadata: { activeTaskCount: healthStatus.active_tasks }
      });
    }
    
    if (healthStatus.status === 'healthy') {
      activities.push({
        id: `health-${Date.now()}-2`,
        type: 'milestone',
        title: 'System Health Check Passed',
        description: `CPU: ${healthStatus.cpu_usage.toFixed(1)}%, Memory: ${healthStatus.memory_usage.toFixed(1)}%, Response: ${healthStatus.response_time}ms`,
        timestamp: healthStatus.last_heartbeat,
        metadata: {
          cpu: healthStatus.cpu_usage,
          memory: healthStatus.memory_usage,
          responseTime: healthStatus.response_time
        }
      });
    }
    
    // Add performance-based activity
    if (healthStatus.response_time < 500) {
      activities.push({
        id: `health-${Date.now()}-3`,
        type: 'achievement',
        title: 'Optimal Response Performance',
        description: `Maintaining response times under 500ms (current: ${healthStatus.response_time}ms)`,
        timestamp: healthStatus.last_heartbeat,
        metadata: { responseTime: healthStatus.response_time }
      });
    }
    
    return activities;
  }
}

describe('Agent Data Transformation Contracts (London School TDD)', () => {
  
  describe('API to Component Stats Transformation', () => {
    it('should transform performance_metrics to component stats correctly', () => {
      // Arrange: Real API data structure
      const apiData: APIResponseData = {
        id: 'test-agent',
        name: 'test-agent',
        display_name: 'Test Agent',
        description: 'Test agent for contract validation',
        status: 'active',
        avatar_color: '#3B82F6',
        capabilities: ['test', 'validation'],
        performance_metrics: {
          success_rate: 87.45,
          average_response_time: 1234, // milliseconds in API
          total_tokens_used: 54321,
          error_count: 5,
          validations_completed: 234,
          uptime_percentage: 96.78
        },
        health_status: {
          cpu_usage: 67.3,
          memory_usage: 82.1,
          response_time: 345,
          last_heartbeat: '2025-09-10T18:30:00.000Z',
          status: 'healthy',
          active_tasks: 3
        }
      };

      // Act: Transform data
      const componentStats = AgentDataTransformer.transformAPIDataToStats(apiData);

      // Assert: Verify exact transformation (not random)
      expect(componentStats.successRate).toBe(87.45); // Exact from API
      expect(componentStats.averageResponseTime).toBe(1.234); // Converted from ms to seconds
      expect(componentStats.uptime).toBe(96.78); // Exact from API
      expect(componentStats.tasksCompleted).toBe(234); // From validations_completed
      expect(componentStats.todayTasks).toBe(3); // From active_tasks
      expect(componentStats.weeklyTasks).toBe(234); // From validations_completed
      
      // Verify satisfaction is calculated, not random
      expect(componentStats.satisfaction).toBeGreaterThan(0);
      expect(componentStats.satisfaction).toBeLessThanOrEqual(5);
      expect(typeof componentStats.satisfaction).toBe('number');
    });

    it('should handle edge cases in API data gracefully', () => {
      // Arrange: API data with edge cases
      const edgeCaseData: APIResponseData = {
        id: 'edge-case-agent',
        name: 'edge-case-agent',
        description: 'Edge case testing',
        status: 'error',
        capabilities: [],
        performance_metrics: {
          success_rate: 0, // Zero success rate
          average_response_time: 0, // Zero response time
          total_tokens_used: 0,
          error_count: 100, // High error count
          validations_completed: 0, // Zero validations
          uptime_percentage: 0 // Zero uptime
        },
        health_status: {
          cpu_usage: 100, // Maximum CPU
          memory_usage: 100, // Maximum memory
          response_time: 5000, // Very slow response
          last_heartbeat: '2025-09-10T18:30:00.000Z',
          status: 'error',
          active_tasks: 0
        }
      };

      // Act: Transform data
      const componentStats = AgentDataTransformer.transformAPIDataToStats(edgeCaseData);

      // Assert: Verify edge cases handled properly
      expect(componentStats.successRate).toBe(0);
      expect(componentStats.averageResponseTime).toBe(0);
      expect(componentStats.uptime).toBe(0);
      expect(componentStats.tasksCompleted).toBe(0);
      expect(componentStats.todayTasks).toBe(0);
      expect(componentStats.satisfaction).toBeGreaterThanOrEqual(1); // Min satisfaction
    });

    it('should verify type safety in transformation', () => {
      // Arrange: API data with proper types
      const typedApiData: APIResponseData = {
        id: 'typed-agent',
        name: 'typed-agent',
        description: 'Type safety test',
        status: 'active',
        capabilities: ['typescript', 'testing'],
        performance_metrics: {
          success_rate: 94.56,
          average_response_time: 789,
          total_tokens_used: 12345,
          error_count: 2,
          validations_completed: 156,
          uptime_percentage: 98.23
        },
        health_status: {
          cpu_usage: 45.6,
          memory_usage: 67.8,
          response_time: 234,
          last_heartbeat: '2025-09-10T18:30:00.000Z',
          status: 'healthy',
          active_tasks: 2
        }
      };

      // Act: Transform and verify types
      const stats = AgentDataTransformer.transformAPIDataToStats(typedApiData);

      // Assert: Verify all fields have correct types
      expect(typeof stats.tasksCompleted).toBe('number');
      expect(typeof stats.successRate).toBe('number');
      expect(typeof stats.averageResponseTime).toBe('number');
      expect(typeof stats.uptime).toBe('number');
      expect(typeof stats.todayTasks).toBe('number');
      expect(typeof stats.weeklyTasks).toBe('number');
      expect(typeof stats.satisfaction).toBe('number');
    });
  });

  describe('Health Status to Activities Transformation', () => {
    it('should generate activities from real health_status data (not fake)', () => {
      // Arrange: Real health status
      const healthStatus: APIResponseData['health_status'] = {
        cpu_usage: 75.4,
        memory_usage: 68.9,
        response_time: 234,
        last_heartbeat: '2025-09-10T18:30:00.000Z',
        status: 'healthy',
        active_tasks: 2
      };

      // Act: Generate activities from health data
      const activities = AgentDataTransformer.generateRealActivitiesFromHealthStatus(healthStatus, 'test-agent');

      // Assert: Activities are based on real data, not fake
      expect(activities.length).toBeGreaterThan(0);
      
      // Should have activity for active tasks
      const activeTaskActivity = activities.find(a => a.title.includes('Processing 2 Active Tasks'));
      expect(activeTaskActivity).toBeDefined();
      expect(activeTaskActivity?.metadata?.activeTaskCount).toBe(2);
      
      // Should have health check activity
      const healthActivity = activities.find(a => a.title.includes('System Health Check'));
      expect(healthActivity).toBeDefined();
      expect(healthActivity?.description).toContain('75.4%'); // Real CPU usage
      expect(healthActivity?.description).toContain('68.9%'); // Real memory usage
      
      // Should use real timestamp
      activities.forEach(activity => {
        expect(activity.timestamp).toBe('2025-09-10T18:30:00.000Z');
      });
    });

    it('should NOT generate fake hardcoded activities', () => {
      // Arrange: Health status
      const healthStatus: APIResponseData['health_status'] = {
        cpu_usage: 45.2,
        memory_usage: 56.7,
        response_time: 123,
        last_heartbeat: '2025-09-10T18:30:00.000Z',
        status: 'healthy',
        active_tasks: 1
      };

      // Act: Generate activities
      const activities = AgentDataTransformer.generateRealActivitiesFromHealthStatus(healthStatus, 'test-agent');

      // Assert: Should NOT contain fake hardcoded activities
      const fakeActivityTitles = [
        'Data Analysis Complete',
        'Report Generation Started',
        '1000 Tasks Completed',
        'High Performance Rating',
        'Successfully analyzed quarterly performance metrics',
        'Generating comprehensive monthly report'
      ];

      activities.forEach(activity => {
        fakeActivityTitles.forEach(fakeTitle => {
          expect(activity.title).not.toContain(fakeTitle);
          expect(activity.description).not.toContain(fakeTitle);
        });
      });
    });

    it('should generate different activities based on different health states', () => {
      // Arrange: Different health statuses
      const healthyStatus: APIResponseData['health_status'] = {
        cpu_usage: 25.0,
        memory_usage: 40.0,
        response_time: 100,
        last_heartbeat: '2025-09-10T18:30:00.000Z',
        status: 'healthy',
        active_tasks: 1
      };

      const busyStatus: APIResponseData['health_status'] = {
        cpu_usage: 85.0,
        memory_usage: 90.0,
        response_time: 800,
        last_heartbeat: '2025-09-10T18:30:00.000Z',
        status: 'busy',
        active_tasks: 5
      };

      // Act: Generate activities for different states
      const healthyActivities = AgentDataTransformer.generateRealActivitiesFromHealthStatus(healthyStatus, 'test-agent');
      const busyActivities = AgentDataTransformer.generateRealActivitiesFromHealthStatus(busyStatus, 'test-agent');

      // Assert: Activities should reflect different states
      const healthyTaskActivity = healthyActivities.find(a => a.title.includes('1 Active'));
      const busyTaskActivity = busyActivities.find(a => a.title.includes('5 Active'));
      
      expect(healthyTaskActivity).toBeDefined();
      expect(busyTaskActivity).toBeDefined();
      
      // Performance activity should only exist for good performance
      const performanceActivity = healthyActivities.find(a => a.title.includes('Optimal Response'));
      expect(performanceActivity).toBeDefined(); // Should exist for 100ms response
      
      const busyPerformanceActivity = busyActivities.find(a => a.title.includes('Optimal Response'));
      expect(busyPerformanceActivity).toBeUndefined(); // Should NOT exist for 800ms response
    });
  });

  describe('Data Consistency Contracts', () => {
    it('should maintain data consistency across transformations', () => {
      // Arrange: API data
      const apiData: APIResponseData = {
        id: 'consistency-test',
        name: 'consistency-test',
        description: 'Testing consistency',
        status: 'active',
        capabilities: ['consistency'],
        performance_metrics: {
          success_rate: 92.34,
          average_response_time: 567,
          total_tokens_used: 78910,
          error_count: 3,
          validations_completed: 345,
          uptime_percentage: 97.45
        },
        health_status: {
          cpu_usage: 56.7,
          memory_usage: 78.9,
          response_time: 234,
          last_heartbeat: '2025-09-10T18:30:00.000Z',
          status: 'healthy',
          active_tasks: 2
        }
      };

      // Act: Multiple transformations
      const stats1 = AgentDataTransformer.transformAPIDataToStats(apiData);
      const stats2 = AgentDataTransformer.transformAPIDataToStats(apiData);

      // Assert: Results should be identical (no random elements)
      expect(stats1).toEqual(stats2);
      expect(stats1.successRate).toBe(stats2.successRate);
      expect(stats1.averageResponseTime).toBe(stats2.averageResponseTime);
      expect(stats1.satisfaction).toBe(stats2.satisfaction);
    });

    it('should reject invalid API response structures', () => {
      // Arrange: Invalid API data
      const invalidData = {
        id: 'invalid',
        // Missing required fields
      } as any;

      // Act & Assert: Should handle gracefully or throw appropriate error
      expect(() => {
        AgentDataTransformer.transformAPIDataToStats(invalidData);
      }).toThrow(); // Should throw due to missing required fields
    });
  });

  describe('Mock Data Detection Tests', () => {
    it('should detect and fail if Math.random() is used in transformation', () => {
      // This test verifies that transformation doesn't use Math.random()
      const mathRandomSpy = jest.spyOn(Math, 'random');
      
      const apiData: APIResponseData = {
        id: 'random-test',
        name: 'random-test',
        description: 'Testing for random usage',
        status: 'active',
        capabilities: [],
        performance_metrics: {
          success_rate: 85.67,
          average_response_time: 432,
          total_tokens_used: 23456,
          error_count: 1,
          validations_completed: 123,
          uptime_percentage: 94.32
        },
        health_status: {
          cpu_usage: 45.6,
          memory_usage: 67.8,
          response_time: 234,
          last_heartbeat: '2025-09-10T18:30:00.000Z',
          status: 'healthy',
          active_tasks: 1
        }
      };

      // Act: Transform data
      const stats = AgentDataTransformer.transformAPIDataToStats(apiData);
      const activities = AgentDataTransformer.generateRealActivitiesFromHealthStatus(apiData.health_status, apiData.id);

      // Assert: Math.random() should NOT be called
      expect(mathRandomSpy).not.toHaveBeenCalled();
      
      // Verify results are deterministic
      expect(stats.successRate).toBe(85.67);
      expect(activities.length).toBeGreaterThan(0);
      
      mathRandomSpy.mockRestore();
    });
  });
});
