/**
 * TDD London School - Deterministic Behavior Tests
 * Critical Test: Eliminate Math.random() and Non-Deterministic Mock Data
 * 
 * London School Approach:
 * - Mock external dependencies completely
 * - Verify identical outputs for identical inputs
 * - Test behavior contracts for determinism
 */

import { transformApiDataToUnified } from '../../../../frontend/src/utils/unified-agent-data-transformer';
import { calculateMetrics } from '../../../../frontend/src/utils/real-data-transformers';

// Mock Math.random to detect any usage
const originalMathRandom = Math.random;
const mockMathRandom = jest.fn();

describe('Deterministic Behavior Verification', () => {
  const consistentApiData = {
    id: 'test-agent-deterministic',
    name: 'Deterministic Test Agent',
    description: 'Agent for testing deterministic behavior',
    usage_count: 100,
    performance_metrics: {
      success_rate: 85.5,
      error_count: 5,
      avg_response_time: 1000
    },
    created_at: '2024-01-01T00:00:00Z',
    last_active: '2024-01-15T12:00:00Z'
  };

  const consistentMetricsData = {
    daily_tasks: 25,
    weekly_tasks: 175,
    monthly_tasks: 700,
    satisfaction_score: 4.0,
    response_time_avg: 1000,
    uptime_percentage: 98.5
  };

  const consistentActivitiesData = [
    {
      id: 1,
      type: 'task',
      timestamp: '2024-01-15T12:00:00Z',
      description: 'Completed task A',
      duration: 500,
      success: true
    },
    {
      id: 2,
      type: 'query',
      timestamp: '2024-01-15T11:30:00Z',
      description: 'Processed query B',
      duration: 750,
      success: true
    }
  ];

  beforeAll(() => {
    // Replace Math.random with mock to detect usage
    Math.random = mockMathRandom;
  });

  afterAll(() => {
    // Restore original Math.random
    Math.random = originalMathRandom;
  });

  beforeEach(() => {
    mockMathRandom.mockClear();
  });

  describe('CRITICAL: No Math.random() Usage Detection', () => {
    test('should not use Math.random() in data transformation', () => {
      const result1 = transformApiDataToUnified(
        consistentApiData, 
        consistentMetricsData, 
        consistentActivitiesData
      );

      const result2 = transformApiDataToUnified(
        consistentApiData, 
        consistentMetricsData, 
        consistentActivitiesData
      );

      // Verify Math.random was never called
      expect(mockMathRandom).not.toHaveBeenCalled();

      // Verify results are identical
      expect(result1).toEqual(result2);
    });

    test('should not use Math.random() in metrics calculations', () => {
      if (calculateMetrics) {
        const result1 = calculateMetrics(consistentApiData);
        const result2 = calculateMetrics(consistentApiData);

        // Verify Math.random was never called
        expect(mockMathRandom).not.toHaveBeenCalled();

        // Verify results are identical
        expect(result1).toEqual(result2);
      }
    });

    test('should produce identical satisfaction scores', () => {
      const result1 = transformApiDataToUnified(
        consistentApiData, 
        consistentMetricsData, 
        consistentActivitiesData
      );

      const result2 = transformApiDataToUnified(
        consistentApiData, 
        consistentMetricsData, 
        consistentActivitiesData
      );

      // Satisfaction should be identical, not randomized
      expect(result1.metrics.satisfaction_score).toBe(result2.metrics.satisfaction_score);
      expect(result1.metrics.satisfaction_score).toBe(4.0); // Should use provided value
    });
  });

  describe('Deterministic Output Verification', () => {
    test('should produce identical results with same API input', () => {
      const iterations = 10;
      const results = [];

      for (let i = 0; i < iterations; i++) {
        const result = transformApiDataToUnified(
          consistentApiData, 
          consistentMetricsData, 
          consistentActivitiesData
        );
        results.push(result);
      }

      // All results should be identical
      const firstResult = results[0];
      results.forEach((result, index) => {
        expect(result).toEqual(firstResult);
      });

      // Verify no random calls were made
      expect(mockMathRandom).not.toHaveBeenCalled();
    });

    test('should produce identical derived metrics calculations', () => {
      const data = {
        ...consistentApiData,
        performance_metrics: {
          success_rate: 90.0,
          error_count: 10,
          avg_response_time: 500
        }
      };

      const result1 = transformApiDataToUnified(data, consistentMetricsData, consistentActivitiesData);
      const result2 = transformApiDataToUnified(data, consistentMetricsData, consistentActivitiesData);

      // All derived metrics should be identical
      expect(result1.metrics.success_rate).toBe(result2.metrics.success_rate);
      expect(result1.metrics.error_count).toBe(result2.metrics.error_count);
      expect(result1.metrics.avg_response_time).toBe(result2.metrics.avg_response_time);
    });

    test('should handle edge cases deterministically', () => {
      const edgeCaseData = {
        ...consistentApiData,
        performance_metrics: {
          success_rate: 0,
          error_count: 0,
          avg_response_time: 0
        }
      };

      const edgeMetrics = {
        ...consistentMetricsData,
        daily_tasks: 0,
        satisfaction_score: 0
      };

      const result1 = transformApiDataToUnified(edgeCaseData, edgeMetrics, []);
      const result2 = transformApiDataToUnified(edgeCaseData, edgeMetrics, []);

      // Even edge cases should be deterministic
      expect(result1).toEqual(result2);
      expect(mockMathRandom).not.toHaveBeenCalled();
    });
  });

  describe('Time-Based Determinism', () => {
    test('should handle timestamps deterministically', () => {
      // Mock Date.now to ensure time-based calculations are deterministic
      const mockDate = new Date('2024-01-15T12:00:00Z');
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => mockDate.getTime());

      try {
        const result1 = transformApiDataToUnified(
          consistentApiData, 
          consistentMetricsData, 
          consistentActivitiesData
        );

        const result2 = transformApiDataToUnified(
          consistentApiData, 
          consistentMetricsData, 
          consistentActivitiesData
        );

        // Time-based calculations should be identical
        expect(result1).toEqual(result2);
      } finally {
        Date.now = originalDateNow;
      }
    });

    test('should not generate random activity patterns', () => {
      const multipleResults = [];

      for (let i = 0; i < 5; i++) {
        const result = transformApiDataToUnified(
          consistentApiData, 
          consistentMetricsData, 
          consistentActivitiesData
        );
        multipleResults.push(result.activities);
      }

      // Activity processing should be identical
      const firstActivities = multipleResults[0];
      multipleResults.forEach(activities => {
        expect(activities).toEqual(firstActivities);
      });
    });
  });

  describe('Input Variation Response', () => {
    test('should respond predictably to input changes', () => {
      const baseData = { ...consistentApiData };
      const modifiedData = { 
        ...consistentApiData, 
        usage_count: 200 // Double the usage
      };

      const baseResult = transformApiDataToUnified(baseData, consistentMetricsData, consistentActivitiesData);
      const modifiedResult = transformApiDataToUnified(modifiedData, consistentMetricsData, consistentActivitiesData);

      // Changes should be predictable, not random
      expect(baseResult.metrics.usage_count).toBe(100);
      expect(modifiedResult.metrics.usage_count).toBe(200);

      // Other metrics should remain the same
      expect(baseResult.metrics.satisfaction_score).toBe(modifiedResult.metrics.satisfaction_score);
    });

    test('should maintain deterministic behavior with different satisfaction scores', () => {
      const metrics1 = { ...consistentMetricsData, satisfaction_score: 3.5 };
      const metrics2 = { ...consistentMetricsData, satisfaction_score: 4.5 };

      const result1a = transformApiDataToUnified(consistentApiData, metrics1, consistentActivitiesData);
      const result1b = transformApiDataToUnified(consistentApiData, metrics1, consistentActivitiesData);
      
      const result2a = transformApiDataToUnified(consistentApiData, metrics2, consistentActivitiesData);
      const result2b = transformApiDataToUnified(consistentApiData, metrics2, consistentActivitiesData);

      // Same inputs should produce identical outputs
      expect(result1a).toEqual(result1b);
      expect(result2a).toEqual(result2b);

      // Different inputs should produce different but predictable outputs
      expect(result1a.metrics.satisfaction_score).toBe(3.5);
      expect(result2a.metrics.satisfaction_score).toBe(4.5);
    });
  });
});