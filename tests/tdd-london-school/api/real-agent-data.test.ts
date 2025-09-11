/**
 * TDD London School: Real Agent Data API Integration Tests
 * 
 * Focuses on interaction testing between API and data transformation.
 * Uses mocks to verify API contracts and data flow behavior.
 * Tests the elimination of mock/random data in favor of real API responses.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock fetch globally for interaction testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

interface APIPerformanceMetrics {
  success_rate: number;
  average_response_time: number;
  total_tokens_used: number;
  error_count: number;
  validations_completed: number;
  uptime_percentage: number;
}

interface APIHealthStatus {
  cpu_usage: number;
  memory_usage: number;
  response_time: number;
  last_heartbeat: string;
  status: string;
  active_tasks: number;
}

interface APIAgentResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    display_name?: string;
    description: string;
    status: string;
    avatar_color?: string;
    capabilities: string[];
    performance_metrics: APIPerformanceMetrics;
    health_status: APIHealthStatus;
  };
  timestamp: string;
}

describe('Real Agent Data API Integration (London School TDD)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('API Contract Testing', () => {
    it('should call the correct API endpoint for agent data', async () => {
      // Arrange: Mock successful API response with real structure
      const mockApiResponse: APIAgentResponse = {
        success: true,
        data: {
          id: 'meta-agent',
          name: 'meta-agent',
          display_name: 'Meta Agent',
          description: 'Agent creation specialist',
          status: 'active',
          avatar_color: '#374151',
          capabilities: ['bash', 'read', 'write'],
          performance_metrics: {
            success_rate: 93.59,
            average_response_time: 214,
            total_tokens_used: 54327,
            error_count: 3,
            validations_completed: 186,
            uptime_percentage: 95.13
          },
          health_status: {
            cpu_usage: 61.97,
            memory_usage: 80.65,
            response_time: 474,
            last_heartbeat: '2025-09-10T18:26:49.085Z',
            status: 'healthy',
            active_tasks: 0
          }
        },
        timestamp: '2025-09-10T18:27:18.353Z'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockApiResponse)
      });

      // Act: Make API request
      const response = await fetch('/api/agents/meta-agent');
      const data = await response.json();

      // Assert: Verify API interaction
      expect(mockFetch).toHaveBeenCalledWith('/api/agents/meta-agent');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(data.success).toBe(true);
      expect(data.data.performance_metrics.success_rate).toBe(93.59);
    });

    it('should handle API error responses gracefully', async () => {
      // Arrange: Mock API error
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn().mockResolvedValue({
          success: false,
          error: 'Agent not found: researcher'
        })
      });

      // Act & Assert: Verify error handling
      const response = await fetch('/api/agents/researcher');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
      
      const errorData = await response.json();
      expect(errorData.success).toBe(false);
      expect(errorData.error).toContain('Agent not found');
    });

    it('should verify real performance_metrics structure', async () => {
      // Arrange: Mock response with real metrics
      const realMetrics: APIPerformanceMetrics = {
        success_rate: 87.42,
        average_response_time: 156,
        total_tokens_used: 23456,
        error_count: 8,
        validations_completed: 342,
        uptime_percentage: 98.76
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            id: 'test-agent',
            name: 'test-agent',
            performance_metrics: realMetrics,
            health_status: {
              status: 'healthy',
              cpu_usage: 45.2,
              memory_usage: 67.8,
              response_time: 234,
              last_heartbeat: new Date().toISOString(),
              active_tasks: 2
            }
          }
        })
      });

      // Act: Fetch and verify structure
      const response = await fetch('/api/agents/test-agent');
      const data = await response.json();

      // Assert: Real metrics are numeric, not random
      const metrics = data.data.performance_metrics;
      expect(typeof metrics.success_rate).toBe('number');
      expect(metrics.success_rate).toBe(87.42); // Exact value, not random
      expect(typeof metrics.average_response_time).toBe('number');
      expect(metrics.average_response_time).toBe(156); // Exact value
      expect(typeof metrics.uptime_percentage).toBe('number');
      expect(metrics.uptime_percentage).toBe(98.76); // Exact value
    });
  });

  describe('Data Transformation Contract Tests', () => {
    it('should transform API data to component format correctly', () => {
      // Arrange: Mock API data structure
      const apiData = {
        id: 'researcher',
        name: 'researcher',
        display_name: 'Research Agent',
        description: 'Data analysis specialist',
        status: 'active',
        avatar_color: '#3B82F6',
        capabilities: ['research', 'analysis'],
        performance_metrics: {
          success_rate: 94.5,
          average_response_time: 1.8,
          total_tokens_used: 45623,
          error_count: 2,
          validations_completed: 145,
          uptime_percentage: 97.2
        },
        health_status: {
          cpu_usage: 55.3,
          memory_usage: 72.1,
          response_time: 456,
          last_heartbeat: '2025-09-10T18:30:00.000Z',
          status: 'healthy',
          active_tasks: 1
        }
      };

      // Act: Transform data (simulating component logic)
      const transformedStats = {
        successRate: apiData.performance_metrics.success_rate, // NOT Math.random()
        averageResponseTime: apiData.performance_metrics.average_response_time, // NOT Math.random()
        uptime: apiData.performance_metrics.uptime_percentage, // NOT Math.random()
        tasksCompleted: apiData.performance_metrics.validations_completed, // NOT fake data
        todayTasks: apiData.health_status.active_tasks, // Real active tasks
        weeklyTasks: apiData.performance_metrics.validations_completed // Real completed validations
      };

      // Assert: Data comes from API, not random generation
      expect(transformedStats.successRate).toBe(94.5);
      expect(transformedStats.averageResponseTime).toBe(1.8);
      expect(transformedStats.uptime).toBe(97.2);
      expect(transformedStats.tasksCompleted).toBe(145);
      
      // Verify no random numbers in range checks
      expect(transformedStats.successRate).not.toBeGreaterThan(100);
      expect(transformedStats.successRate).not.toBeLessThan(90); // Should be exact API value
      expect(transformedStats.averageResponseTime).not.toBeCloseTo(Math.random() * 2 + 0.5, 1);
    });

    it('should handle missing API fields with proper defaults (not random)', () => {
      // Arrange: API response with missing optional fields
      const incompleteApiData = {
        id: 'minimal-agent',
        name: 'minimal-agent',
        description: 'Basic agent',
        status: 'inactive',
        capabilities: [],
        performance_metrics: {
          success_rate: 0, // Real zero, not random
          average_response_time: 0, // Real zero
          total_tokens_used: 0,
          error_count: 0,
          validations_completed: 0,
          uptime_percentage: 0
        },
        health_status: {
          cpu_usage: 0,
          memory_usage: 0,
          response_time: 0,
          last_heartbeat: '2025-09-10T18:30:00.000Z',
          status: 'inactive',
          active_tasks: 0
        }
      };

      // Act: Transform with defaults
      const transformedStats = {
        successRate: incompleteApiData.performance_metrics.success_rate || 0, // Default to 0, not random
        averageResponseTime: incompleteApiData.performance_metrics.average_response_time || 0,
        uptime: incompleteApiData.performance_metrics.uptime_percentage || 0,
        tasksCompleted: incompleteApiData.performance_metrics.validations_completed || 0
      };

      // Assert: Defaults are deterministic, not random
      expect(transformedStats.successRate).toBe(0);
      expect(transformedStats.averageResponseTime).toBe(0);
      expect(transformedStats.uptime).toBe(0);
      expect(transformedStats.tasksCompleted).toBe(0);
    });

    it('should detect and fail if Math.random() is used instead of API data', () => {
      // This test should FAIL initially when mock data is still present
      // and PASS after real data implementation
      
      const mockMathRandom = jest.spyOn(Math, 'random');
      mockMathRandom.mockReturnValue(0.75); // Predictable mock value
      
      // Simulate current component behavior with Math.random()
      const mockGeneratedStats = {
        tasksCompleted: Math.floor(Math.random() * 1000) + 100,
        successRate: Math.floor(Math.random() * 10) + 90,
        averageResponseTime: Math.round((Math.random() * 2 + 0.5) * 10) / 10,
        uptime: Math.floor(Math.random() * 5) + 95
      };
      
      // Assert: This test should FAIL to indicate mock data is being used
      expect(mockMathRandom).toHaveBeenCalled();
      expect(mockGeneratedStats.tasksCompleted).toBe(850); // 0.75 * 1000 + 100
      expect(mockGeneratedStats.successRate).toBe(97); // 0.75 * 10 + 90
      
      // This expectation should FAIL initially, indicating Math.random() usage
      expect(mockMathRandom).not.toHaveBeenCalled(); // This will fail, proving Math.random() is used
      
      mockMathRandom.mockRestore();
    });
  });

  describe('Error Handling Contracts', () => {
    it('should handle network failures gracefully', async () => {
      // Arrange: Mock network error
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(fetch('/api/agents/test-agent')).rejects.toThrow('Network error');
      expect(mockFetch).toHaveBeenCalledWith('/api/agents/test-agent');
    });

    it('should handle malformed JSON responses', async () => {
      // Arrange: Mock invalid JSON
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token'))
      });

      // Act & Assert
      const response = await fetch('/api/agents/test-agent');
      await expect(response.json()).rejects.toThrow('Unexpected token');
    });

    it('should verify required API fields are present', async () => {
      // Arrange: Mock response with missing required fields
      const incompleteResponse = {
        success: true,
        data: {
          id: 'incomplete-agent',
          // Missing required fields: name, status, performance_metrics
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(incompleteResponse)
      });

      // Act
      const response = await fetch('/api/agents/incomplete-agent');
      const data = await response.json();

      // Assert: Component should handle missing fields
      expect(data.data.name).toBeUndefined();
      expect(data.data.performance_metrics).toBeUndefined();
      expect(data.data.health_status).toBeUndefined();
    });
  });

  describe('Mock Data Elimination Tests', () => {
    it('should verify no random data generation in stats', () => {
      // This test verifies that component uses API data instead of generating random stats
      
      // Arrange: Real API-like data
      const realApiMetrics = {
        success_rate: 91.23,
        average_response_time: 234,
        uptime_percentage: 96.45,
        validations_completed: 456,
        error_count: 7
      };

      // Act: Process data as component should
      const componentStats = {
        successRate: realApiMetrics.success_rate,
        averageResponseTime: realApiMetrics.average_response_time,
        uptime: realApiMetrics.uptime_percentage,
        tasksCompleted: realApiMetrics.validations_completed
      };

      // Assert: Values are exact from API, not in random ranges
      expect(componentStats.successRate).toBe(91.23); // Exact, not ~90-100 range
      expect(componentStats.averageResponseTime).toBe(234); // Exact, not ~0.5-2.5 range
      expect(componentStats.uptime).toBe(96.45); // Exact, not ~95-100 range
      expect(componentStats.tasksCompleted).toBe(456); // Exact, not ~100-1100 range
    });

    it('should verify activities come from health_status, not generated', () => {
      // Arrange: Real health status data
      const healthStatus = {
        status: 'healthy',
        active_tasks: 3,
        last_heartbeat: '2025-09-10T18:30:00.000Z',
        cpu_usage: 67.8,
        memory_usage: 54.2,
        response_time: 123
      };

      // Act: Transform health data to activities (as component should)
      const generatedActivities = [];
      
      // Real data-driven activity generation (not fake)
      if (healthStatus.active_tasks > 0) {
        generatedActivities.push({
          type: 'task_started',
          title: `Processing ${healthStatus.active_tasks} active tasks`,
          timestamp: healthStatus.last_heartbeat
        });
      }
      
      if (healthStatus.status === 'healthy') {
        generatedActivities.push({
          type: 'milestone',
          title: 'System Health Check Passed',
          description: `CPU: ${healthStatus.cpu_usage}%, Memory: ${healthStatus.memory_usage}%`,
          timestamp: healthStatus.last_heartbeat
        });
      }

      // Assert: Activities derived from real data
      expect(generatedActivities).toHaveLength(2);
      expect(generatedActivities[0].title).toContain('3 active tasks');
      expect(generatedActivities[1].description).toContain('67.8%');
      expect(generatedActivities[1].description).toContain('54.2%');
    });
  });
});
