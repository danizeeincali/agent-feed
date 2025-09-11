/**
 * TDD London School Test Suite - UnifiedAgentPage Data Transformation
 * Tests for eliminating mock data and using real API data
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  transformApiDataToStats,
  generateRealActivities,
  generateRealPosts,
  safeApiAccess,
  DataTransformationError
} from '../../../frontend/src/utils/unified-agent-data-transformer';
import { AgentPerformanceMetrics, AgentHealthStatus, Agent } from '../../../frontend/src/types/api';

describe('UnifiedAgentPage Data Transformation - TDD London School', () => {
  describe('transformApiDataToStats', () => {
    describe('when API data is complete and valid', () => {
      it('should transform performance metrics to stats correctly', () => {
        // Arrange
        const performanceMetrics: AgentPerformanceMetrics = {
          success_rate: 91.58647866794777,
          average_response_time: 303,
          total_tokens_used: 39607,
          error_count: 0,
          uptime_percentage: 95.4805690897904,
          last_performance_check: '2025-09-10T18:20:09.023Z',
          performance_trend: 'improving'
        };
        
        const healthStatus: AgentHealthStatus = {
          cpu_usage: 32.246620083405034,
          memory_usage: 55.61611648401096,
          response_time: 212,
          last_heartbeat: '2025-09-10T18:20:09.023Z',
          connection_status: 'connected',
          error_count_24h: 0
        };
        
        const usageCount = 48;
        
        // Act
        const result = transformApiDataToStats(performanceMetrics, healthStatus, usageCount);
        
        // Assert
        expect(result.successRate).toBe(91.59); // Rounded to 2 decimals
        expect(result.averageResponseTime).toBe(303);
        expect(result.uptime).toBe(95.48); // Rounded to 2 decimals
        expect(result.tasksCompleted).toBeGreaterThan(0);
        expect(result.todayTasks).toBeGreaterThan(0);
        expect(result.weeklyTasks).toBeGreaterThan(result.todayTasks);
        expect(result.satisfaction).toBeGreaterThanOrEqual(3);
        expect(result.satisfaction).toBeLessThanOrEqual(5);
      });

      it('should calculate tasks completed from usage count and performance metrics', () => {
        // Arrange
        const performanceMetrics: AgentPerformanceMetrics = {
          success_rate: 85,
          average_response_time: 250,
          total_tokens_used: 50000,
          error_count: 15,
          uptime_percentage: 98,
          last_performance_check: '2025-09-10T18:20:09.023Z',
          performance_trend: 'stable'
        };
        
        const healthStatus: AgentHealthStatus = {
          cpu_usage: 40,
          memory_usage: 60,
          response_time: 250,
          last_heartbeat: '2025-09-10T18:20:09.023Z',
          connection_status: 'connected',
          error_count_24h: 2
        };
        
        const usageCount = 100;
        
        // Act
        const result = transformApiDataToStats(performanceMetrics, healthStatus, usageCount);
        
        // Assert
        expect(result.tasksCompleted).toBe(100); // Should equal usage count
        expect(result.todayTasks).toBeLessThanOrEqual(usageCount);
        expect(result.weeklyTasks).toBeGreaterThanOrEqual(result.todayTasks);
      });
    });

    describe('when API data has missing or invalid values', () => {
      it('should provide safe defaults for missing performance metrics', () => {
        // Arrange
        const performanceMetrics: Partial<AgentPerformanceMetrics> = {
          success_rate: undefined as any,
          average_response_time: null as any,
          total_tokens_used: 0,
          error_count: undefined as any,
          uptime_percentage: null as any
        };
        
        const healthStatus: AgentHealthStatus = {
          cpu_usage: 25,
          memory_usage: 45,
          response_time: 200,
          last_heartbeat: '2025-09-10T18:20:09.023Z',
          connection_status: 'connected',
          error_count_24h: 0
        };
        
        const usageCount = 0;
        
        // Act
        const result = transformApiDataToStats(
          performanceMetrics as AgentPerformanceMetrics,
          healthStatus,
          usageCount
        );
        
        // Assert
        expect(result.successRate).toBe(0); // Default for missing success rate
        expect(result.averageResponseTime).toBe(200); // Should use health status response time
        expect(result.uptime).toBe(0); // Default for missing uptime
        expect(result.tasksCompleted).toBe(0); // No usage
        expect(result.todayTasks).toBe(0);
        expect(result.weeklyTasks).toBe(0);
        expect(result.satisfaction).toBeUndefined(); // Should be undefined for no data
      });

      it('should handle negative or extreme values gracefully', () => {
        // Arrange
        const performanceMetrics: AgentPerformanceMetrics = {
          success_rate: -10, // Invalid negative
          average_response_time: -50, // Invalid negative
          total_tokens_used: 1000000000, // Extreme value
          error_count: -5, // Invalid negative
          uptime_percentage: 150, // Invalid > 100%
          last_performance_check: '2025-09-10T18:20:09.023Z',
          performance_trend: 'declining'
        };
        
        const healthStatus: AgentHealthStatus = {
          cpu_usage: -10, // Invalid negative
          memory_usage: 150, // Invalid > 100%
          response_time: -100, // Invalid negative
          last_heartbeat: '2025-09-10T18:20:09.023Z',
          connection_status: 'disconnected',
          error_count_24h: -1 // Invalid negative
        };
        
        const usageCount = -10; // Invalid negative
        
        // Act
        const result = transformApiDataToStats(performanceMetrics, healthStatus, usageCount);
        
        // Assert
        expect(result.successRate).toBeGreaterThanOrEqual(0);
        expect(result.successRate).toBeLessThanOrEqual(100);
        expect(result.averageResponseTime).toBeGreaterThanOrEqual(0);
        expect(result.uptime).toBeGreaterThanOrEqual(0);
        expect(result.uptime).toBeLessThanOrEqual(100);
        expect(result.tasksCompleted).toBeGreaterThanOrEqual(0);
        expect(result.todayTasks).toBeGreaterThanOrEqual(0);
        expect(result.weeklyTasks).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('generateRealActivities', () => {
    describe('when agent has real performance and health data', () => {
      it('should generate activities based on recent performance metrics', () => {
        // Arrange
        const performanceMetrics: AgentPerformanceMetrics = {
          success_rate: 95,
          average_response_time: 250,
          total_tokens_used: 50000,
          error_count: 2,
          uptime_percentage: 98,
          last_performance_check: '2025-09-10T18:00:00.000Z',
          performance_trend: 'improving'
        };
        
        const healthStatus: AgentHealthStatus = {
          cpu_usage: 35,
          memory_usage: 55,
          response_time: 250,
          last_heartbeat: '2025-09-10T18:20:09.023Z',
          connection_status: 'connected',
          error_count_24h: 2
        };
        
        const usageCount = 150;
        const lastUsed = '2025-09-10T18:15:00.000Z';
        const agentName = 'Test Agent';
        
        // Act
        const activities = generateRealActivities(performanceMetrics, healthStatus, usageCount, lastUsed, agentName);
        
        // Assert
        expect(activities).toHaveLength(4); // Should generate exactly 4 activities
        expect(activities[0].type).toBe('task_completed'); // Most recent should be task completion
        expect(activities[0].title).toContain('Tasks Completed');
        expect(activities[0].description).toContain('150');
        
        // Check that timestamps are realistic and in descending order
        const timestamps = activities.map(a => new Date(a.timestamp).getTime());
        for (let i = 1; i < timestamps.length; i++) {
          expect(timestamps[i-1]).toBeGreaterThanOrEqual(timestamps[i]);
        }
        
        // Verify activity reflects real metrics
        const performanceActivity = activities.find(a => a.type === 'milestone');
        expect(performanceActivity?.description).toContain('95%');
        expect(performanceActivity?.description).toContain('success rate');
      });

      it('should generate error activities when error count is high', () => {
        // Arrange
        const performanceMetrics: AgentPerformanceMetrics = {
          success_rate: 75, // Lower success rate
          average_response_time: 500,
          total_tokens_used: 30000,
          error_count: 25, // High error count
          uptime_percentage: 85,
          last_performance_check: '2025-09-10T18:00:00.000Z',
          performance_trend: 'declining'
        };
        
        const healthStatus: AgentHealthStatus = {
          cpu_usage: 80, // High CPU
          memory_usage: 90, // High memory
          response_time: 500,
          last_heartbeat: '2025-09-10T18:20:09.023Z',
          connection_status: 'unstable',
          error_count_24h: 15
        };
        
        // Act
        const activities = generateRealActivities(performanceMetrics, healthStatus, 100, '2025-09-10T18:15:00.000Z', 'Error-Prone Agent');
        
        // Assert
        expect(activities.some(a => a.type === 'error')).toBe(true);
        
        const errorActivity = activities.find(a => a.type === 'error');
        expect(errorActivity?.description).toContain('errors');
        expect(errorActivity?.metadata?.success).toBe(false);
      });
    });

    describe('when agent has no recent activity', () => {
      it('should generate minimal activities for inactive agent', () => {
        // Arrange
        const performanceMetrics: AgentPerformanceMetrics = {
          success_rate: 0,
          average_response_time: 0,
          total_tokens_used: 0,
          error_count: 0,
          uptime_percentage: 0,
          last_performance_check: '2025-09-09T18:00:00.000Z', // Yesterday
          performance_trend: 'stable'
        };
        
        const healthStatus: AgentHealthStatus = {
          cpu_usage: 0,
          memory_usage: 10,
          response_time: 0,
          last_heartbeat: '2025-09-09T18:20:09.023Z', // Yesterday
          connection_status: 'disconnected',
          error_count_24h: 0
        };
        
        // Act
        const activities = generateRealActivities(performanceMetrics, healthStatus, 0, null, 'Inactive Agent');
        
        // Assert
        expect(activities).toHaveLength(1); // Should generate minimal activity
        expect(activities[0].type).toBe('task_started'); // Should indicate waiting for tasks
        expect(activities[0].description).toContain('Ready for new tasks');
      });
    });
  });

  describe('generateRealPosts', () => {
    describe('when agent has achievements and high performance', () => {
      it('should generate achievement posts based on real metrics', () => {
        // Arrange
        const performanceMetrics: AgentPerformanceMetrics = {
          success_rate: 96,
          average_response_time: 200,
          total_tokens_used: 75000,
          error_count: 1,
          uptime_percentage: 99,
          last_performance_check: '2025-09-10T18:00:00.000Z',
          performance_trend: 'improving'
        };
        
        const healthStatus: AgentHealthStatus = {
          cpu_usage: 25,
          memory_usage: 40,
          response_time: 200,
          last_heartbeat: '2025-09-10T18:20:09.023Z',
          connection_status: 'connected',
          error_count_24h: 0
        };
        
        const usageCount = 500;
        const agentId = 'high-performer-agent';
        const agentName = 'High Performer Agent';
        
        // Act
        const posts = generateRealPosts(performanceMetrics, healthStatus, usageCount, agentId, agentName);
        
        // Assert
        expect(posts.length).toBeGreaterThan(0);
        
        const achievementPost = posts.find(p => p.type === 'achievement');
        expect(achievementPost).toBeDefined();
        expect(achievementPost?.title).toContain('Milestone');
        expect(achievementPost?.content).toContain('500');
        expect(achievementPost?.content).toContain('96%');
        expect(achievementPost?.author.id).toBe(agentId);
        expect(achievementPost?.author.name).toBe(agentName);
        expect(achievementPost?.tags).toContain('performance');
        expect(achievementPost?.interactions.likes).toBeGreaterThan(0);
      });

      it('should generate insight posts with performance analysis', () => {
        // Arrange
        const performanceMetrics: AgentPerformanceMetrics = {
          success_rate: 88,
          average_response_time: 350,
          total_tokens_used: 45000,
          error_count: 8,
          uptime_percentage: 94,
          last_performance_check: '2025-09-10T18:00:00.000Z',
          performance_trend: 'stable'
        };
        
        const healthStatus: AgentHealthStatus = {
          cpu_usage: 50,
          memory_usage: 65,
          response_time: 350,
          last_heartbeat: '2025-09-10T18:20:09.023Z',
          connection_status: 'connected',
          error_count_24h: 3
        };
        
        // Act
        const posts = generateRealPosts(performanceMetrics, healthStatus, 200, 'insight-agent', 'Insight Agent');
        
        // Assert
        const insightPost = posts.find(p => p.type === 'insight');
        expect(insightPost).toBeDefined();
        expect(insightPost?.title).toContain('Performance');
        expect(insightPost?.content).toContain('88%');
        expect(insightPost?.content).toContain('350ms');
        expect(insightPost?.tags).toContain('insights');
        expect(insightPost?.priority).toBe('medium');
      });
    });

    describe('when agent has poor performance', () => {
      it('should generate update posts about improvements needed', () => {
        // Arrange
        const performanceMetrics: AgentPerformanceMetrics = {
          success_rate: 65, // Poor performance
          average_response_time: 800, // Slow response
          total_tokens_used: 20000,
          error_count: 35, // Many errors
          uptime_percentage: 75, // Low uptime
          last_performance_check: '2025-09-10T18:00:00.000Z',
          performance_trend: 'declining'
        };
        
        const healthStatus: AgentHealthStatus = {
          cpu_usage: 85, // High CPU usage
          memory_usage: 95, // High memory usage
          response_time: 800,
          last_heartbeat: '2025-09-10T18:20:09.023Z',
          connection_status: 'unstable',
          error_count_24h: 20
        };
        
        // Act
        const posts = generateRealPosts(performanceMetrics, healthStatus, 50, 'struggling-agent', 'Struggling Agent');
        
        // Assert
        const updatePost = posts.find(p => p.type === 'update');
        expect(updatePost).toBeDefined();
        expect(updatePost?.content).toMatch(/improv|optim|enhanc/i);
        expect(updatePost?.priority).toBe('high');
        expect(updatePost?.tags).toContain('optimization');
      });
    });
  });

  describe('safeApiAccess', () => {
    it('should return value and hasValue true when data exists', () => {
      // Arrange
      const data = { success_rate: 95 };
      
      // Act
      const result = safeApiAccess(data.success_rate, 0);
      
      // Assert
      expect(result.value).toBe(95);
      expect(result.hasValue).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return default value and hasValue false when data is missing', () => {
      // Arrange
      const data: any = {};
      
      // Act
      const result = safeApiAccess(data.success_rate, 85);
      
      // Assert
      expect(result.value).toBe(85);
      expect(result.hasValue).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('should return default value and error when data is invalid', () => {
      // Arrange
      const invalidData = 'not-a-number';
      
      // Act
      const result = safeApiAccess(invalidData as any, 90, 'number');
      
      // Assert
      expect(result.value).toBe(90);
      expect(result.hasValue).toBe(false);
      expect(result.error).toContain('Expected number');
    });
  });

  describe('DataTransformationError', () => {
    it('should create error with proper message and cause', () => {
      // Arrange
      const originalError = new Error('API connection failed');
      
      // Act
      const error = new DataTransformationError('Failed to transform agent data', originalError);
      
      // Assert
      expect(error.name).toBe('DataTransformationError');
      expect(error.message).toBe('Failed to transform agent data');
      expect(error.cause).toBe(originalError);
      expect(error.stack).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete agent transformation workflow', () => {
      // Arrange
      const mockApiResponse = {
        success: true,
        data: {
          id: 'integration-test-agent',
          name: 'Integration Test Agent',
          display_name: 'Integration Test Agent',
          description: 'Agent for integration testing',
          status: 'active' as const,
          capabilities: ['analysis', 'reporting'],
          performance_metrics: {
            success_rate: 92.5,
            average_response_time: 275,
            total_tokens_used: 62000,
            error_count: 5,
            uptime_percentage: 97.2,
            last_performance_check: '2025-09-10T18:00:00.000Z',
            performance_trend: 'improving' as const
          },
          health_status: {
            cpu_usage: 42.5,
            memory_usage: 58.3,
            response_time: 275,
            last_heartbeat: '2025-09-10T18:20:09.023Z',
            connection_status: 'connected' as const,
            error_count_24h: 3
          },
          usage_count: 250,
          last_used: '2025-09-10T18:15:00.000Z'
        }
      };
      
      // Act
      const stats = transformApiDataToStats(
        mockApiResponse.data.performance_metrics,
        mockApiResponse.data.health_status,
        mockApiResponse.data.usage_count
      );
      
      const activities = generateRealActivities(
        mockApiResponse.data.performance_metrics,
        mockApiResponse.data.health_status,
        mockApiResponse.data.usage_count,
        mockApiResponse.data.last_used,
        mockApiResponse.data.name
      );
      
      const posts = generateRealPosts(
        mockApiResponse.data.performance_metrics,
        mockApiResponse.data.health_status,
        mockApiResponse.data.usage_count,
        mockApiResponse.data.id,
        mockApiResponse.data.name
      );
      
      // Assert
      expect(stats.successRate).toBe(92.5);
      expect(stats.tasksCompleted).toBe(250);
      expect(activities.length).toBe(4);
      expect(posts.length).toBeGreaterThan(0);
      
      // Verify no mock data patterns exist
      expect(activities.every(a => !a.description.includes('Math.random'))).toBe(true);
      expect(posts.every(p => !p.content.includes('mock'))).toBe(true);
    });
  });
});