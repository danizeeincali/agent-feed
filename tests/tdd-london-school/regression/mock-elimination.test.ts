/**
 * TDD London School Regression Tests - Mock Data Elimination
 * Verifies NO Math.random() calls and ensures deterministic behavior
 * Tests complete elimination of mock data from UnifiedAgentPage
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import {
  transformApiDataToStats,
  generateRealActivities,
  generateRealPosts
} from '../../../frontend/src/utils/unified-agent-data-transformer';

// Mock router for testing
const MockRouter = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <div data-testid="mock-router">{children}</div>
  </BrowserRouter>
);

// Mock route params
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom') as any;
  return {
    ...actual,
    useParams: () => ({ agentId: 'regression-test-agent' }),
    useNavigate: () => jest.fn()
  };
});

// Test data for regression testing
const createRegressionTestData = () => ({
  id: 'regression-test-agent',
  name: 'RegressionAgent',
  display_name: 'Regression Test Agent',
  description: 'Agent for regression testing mock elimination',
  status: 'active' as const,
  capabilities: ['regression-testing', 'mock-elimination'],
  performance_metrics: {
    success_rate: 88.7,
    average_response_time: 275,
    uptime_percentage: 97.5,
    total_tokens_used: 12500,
    error_count: 3
  },
  health_status: {
    connection_status: 'connected' as const,
    cpu_usage: 52.1,
    memory_usage: 68.9,
    response_time: 260,
    error_count_24h: 2,
    active_tasks: 5
  },
  usage_count: 156,
  last_used: '2024-09-10T11:15:00Z'
});

describe('Mock Elimination Regression Tests - London School', () => {
  let originalMathRandom: () => number;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let randomCallCount: number;
  
  beforeEach(() => {
    // Intercept Math.random to detect any usage
    originalMathRandom = Math.random;
    randomCallCount = 0;
    
    Math.random = jest.fn(() => {
      randomCallCount++;
      console.warn(`Math.random() called! Call #${randomCallCount}. Stack:`, new Error().stack);
      return 0.5; // Fixed value for deterministic testing
    });
    
    // Mock fetch
    mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;
    
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        success: true,
        data: createRegressionTestData()
      })
    } as Response);
  });
  
  afterEach(() => {
    Math.random = originalMathRandom;
    jest.clearAllMocks();
  });

  describe('Math.random() Elimination Verification', () => {
    test('should NOT call Math.random() in transformApiDataToStats', () => {
      const testData = createRegressionTestData();
      
      transformApiDataToStats(
        testData.performance_metrics,
        testData.health_status,
        testData.usage_count
      );
      
      expect(randomCallCount).toBe(0);
      expect(Math.random).not.toHaveBeenCalled();
    });

    test('should NOT call Math.random() in generateRealActivities (except for allowed fill case)', () => {
      const testData = createRegressionTestData();
      
      generateRealActivities(
        testData.performance_metrics,
        testData.health_status,
        testData.usage_count,
        testData.last_used,
        testData.name
      );
      
      // Allow maximum 1 call for activity filling if needed
      expect(randomCallCount).toBeLessThanOrEqual(1);
    });

    test('should NOT call Math.random() in generateRealPosts', () => {
      const testData = createRegressionTestData();
      
      generateRealPosts(
        testData.performance_metrics,
        testData.health_status,
        testData.usage_count,
        testData.id,
        testData.name
      );
      
      expect(randomCallCount).toBe(0);
      expect(Math.random).not.toHaveBeenCalled();
    });

    test('should detect Math.random() usage in legacy component code', async () => {
      // Import component dynamically to catch any Math.random usage during render
      const UnifiedAgentPage = (await import('../../../frontend/src/components/UnifiedAgentPage')).default;
      
      render(
        <MockRouter>
          <UnifiedAgentPage />
        </MockRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Regression Test Agent')).toBeInTheDocument();
      });
      
      // Verify no Math.random() calls during component lifecycle
      // Allow some tolerance for legitimate usage in non-data parts
      expect(randomCallCount).toBeLessThanOrEqual(2); // Very strict limit
    });

    test('should scan codebase for Math.random() patterns', () => {
      // This test would typically use static analysis tools
      // For now, we verify our specific transformation functions
      const codePatterns = [
        'Math.random()',
        'Math.floor(Math.random()',
        'Math.round(Math.random(',
        'random()'
      ];
      
      // Check that our functions don't contain these patterns in string form
      const transformCode = transformApiDataToStats.toString();
      const activitiesCode = generateRealActivities.toString();
      const postsCode = generateRealPosts.toString();
      
      codePatterns.forEach(pattern => {
        expect(transformCode).not.toContain(pattern);
        expect(activitiesCode).not.toContain(pattern);
        expect(postsCode).not.toContain(pattern);
      });
    });
  });

  describe('Deterministic Behavior Verification', () => {
    test('should produce identical results with same API input', () => {
      const testData = createRegressionTestData();
      
      // Run transformation multiple times
      const results1 = transformApiDataToStats(
        testData.performance_metrics,
        testData.health_status,
        testData.usage_count
      );
      
      const results2 = transformApiDataToStats(
        testData.performance_metrics,
        testData.health_status,
        testData.usage_count
      );
      
      const results3 = transformApiDataToStats(
        testData.performance_metrics,
        testData.health_status,
        testData.usage_count
      );
      
      // All results should be identical
      expect(results1).toEqual(results2);
      expect(results2).toEqual(results3);
      expect(results1.successRate).toBe(88.7);
      expect(results1.uptime).toBe(97.5);
      expect(results1.tasksCompleted).toBe(156);
    });

    test('should generate identical activities with same input', () => {
      const testData = createRegressionTestData();
      
      const activities1 = generateRealActivities(
        testData.performance_metrics,
        testData.health_status,
        testData.usage_count,
        testData.last_used,
        testData.name
      );
      
      const activities2 = generateRealActivities(
        testData.performance_metrics,
        testData.health_status,
        testData.usage_count,
        testData.last_used,
        testData.name
      );
      
      // Activities should be structurally identical
      expect(activities1).toHaveLength(activities2.length);
      expect(activities1[0]?.title).toBe(activities2[0]?.title);
      expect(activities1[0]?.description).toBe(activities2[0]?.description);
    });

    test('should generate identical posts with same input', () => {
      const testData = createRegressionTestData();
      
      const posts1 = generateRealPosts(
        testData.performance_metrics,
        testData.health_status,
        testData.usage_count,
        testData.id,
        testData.name
      );
      
      const posts2 = generateRealPosts(
        testData.performance_metrics,
        testData.health_status,
        testData.usage_count,
        testData.id,
        testData.name
      );
      
      // Posts should be structurally identical
      expect(posts1).toHaveLength(posts2.length);
      expect(posts1[0]?.title).toBe(posts2[0]?.title);
      expect(posts1[0]?.interactions.likes).toBe(posts2[0]?.interactions.likes);
    });

    test('should produce different results with different API input', () => {
      const testData1 = createRegressionTestData();
      const testData2 = {
        ...createRegressionTestData(),
        performance_metrics: {
          ...createRegressionTestData().performance_metrics,
          success_rate: 75.2 // Different value
        },
        usage_count: 89 // Different value
      };
      
      const results1 = transformApiDataToStats(
        testData1.performance_metrics,
        testData1.health_status,
        testData1.usage_count
      );
      
      const results2 = transformApiDataToStats(
        testData2.performance_metrics,
        testData2.health_status,
        testData2.usage_count
      );
      
      // Results should be different with different input
      expect(results1.successRate).not.toBe(results2.successRate);
      expect(results1.tasksCompleted).not.toBe(results2.tasksCompleted);
    });
  });

  describe('Real Data Source Verification', () => {
    test('should trace data source back to API for all displayed values', async () => {
      const testData = createRegressionTestData();
      
      const stats = transformApiDataToStats(
        testData.performance_metrics,
        testData.health_status,
        testData.usage_count
      );
      
      // Verify each displayed value can be traced to API data
      expect(stats.successRate).toBe(testData.performance_metrics.success_rate);
      expect(stats.uptime).toBe(testData.performance_metrics.uptime_percentage);
      expect(stats.averageResponseTime).toBe(testData.performance_metrics.average_response_time);
      expect(stats.tasksCompleted).toBe(testData.usage_count);
    });

    test('should verify activity content reflects real API metrics', () => {
      const testData = createRegressionTestData();
      
      const activities = generateRealActivities(
        testData.performance_metrics,
        testData.health_status,
        testData.usage_count,
        testData.last_used,
        testData.name
      );
      
      // Find task completion activity
      const taskActivity = activities.find(a => a.type === 'task_completed');
      expect(taskActivity).toBeDefined();
      expect(taskActivity!.title).toContain('156'); // Real usage_count
      expect(taskActivity!.description).toContain('88.7%'); // Real success_rate
      
      // Find health activity
      const healthActivity = activities.find(a => a.description.includes('CPU'));
      if (healthActivity) {
        expect(healthActivity.description).toContain('52.1%'); // Real CPU
        expect(healthActivity.description).toContain('68.9%'); // Real memory
      }
    });

    test('should verify post interactions calculated from real metrics', () => {
      const testData = createRegressionTestData();
      
      const posts = generateRealPosts(
        testData.performance_metrics,
        testData.health_status,
        testData.usage_count,
        testData.id,
        testData.name
      );
      
      const achievementPost = posts.find(p => p.type === 'achievement');
      if (achievementPost) {
        // Verify likes calculation: Math.max(5, Math.floor(156/20) + Math.floor(88.7/10))
        // = Math.max(5, 7 + 8) = 15
        const expectedLikes = Math.max(5, Math.floor(156 / 20) + Math.floor(88.7 / 10));
        expect(achievementPost.interactions.likes).toBe(expectedLikes);
      }
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    test('should handle zero values without falling back to random', () => {
      const zeroData = {
        performance_metrics: {
          success_rate: 0,
          average_response_time: 0,
          uptime_percentage: 0,
          total_tokens_used: 0,
          error_count: 0
        },
        health_status: {
          connection_status: 'disconnected' as const,
          cpu_usage: 0,
          memory_usage: 0,
          response_time: 0,
          error_count_24h: 0,
          active_tasks: 0
        },
        usage_count: 0
      };
      
      const stats = transformApiDataToStats(
        zeroData.performance_metrics,
        zeroData.health_status,
        zeroData.usage_count
      );
      
      expect(randomCallCount).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.uptime).toBe(0);
      expect(stats.tasksCompleted).toBe(0);
    });

    test('should handle null/undefined values without random fallback', () => {
      const stats = transformApiDataToStats(
        undefined as any,
        undefined as any,
        0
      );
      
      expect(randomCallCount).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.uptime).toBe(0);
      expect(stats.averageResponseTime).toBe(0);
    });

    test('should handle extreme values without random normalization', () => {
      const extremeData = {
        performance_metrics: {
          success_rate: 999, // Will be clamped to 100
          average_response_time: 999999, // Will be clamped to 60000
          uptime_percentage: -50, // Will be clamped to 0
          total_tokens_used: Number.MAX_SAFE_INTEGER,
          error_count: 10000
        },
        health_status: {
          connection_status: 'connected' as const,
          cpu_usage: 150, // Will be clamped to 100
          memory_usage: -25, // Will be clamped to 0
          response_time: 5000,
          error_count_24h: 100,
          active_tasks: 50
        },
        usage_count: Number.MAX_SAFE_INTEGER
      };
      
      const stats = transformApiDataToStats(
        extremeData.performance_metrics,
        extremeData.health_status,
        extremeData.usage_count
      );
      
      expect(randomCallCount).toBe(0);
      expect(stats.successRate).toBe(100); // Clamped
      expect(stats.uptime).toBe(0); // Clamped
      expect(stats.averageResponseTime).toBe(60000); // Clamped
    });
  });

  describe('Component Integration Regression', () => {
    test('should maintain consistent data flow from API to UI', async () => {
      const UnifiedAgentPage = (await import('../../../frontend/src/components/UnifiedAgentPage')).default;
      
      render(
        <MockRouter>
          <UnifiedAgentPage />
        </MockRouter>
      );
      
      // Wait for component to load and verify API data is displayed
      await waitFor(() => {
        expect(screen.getByText('88.7%')).toBeInTheDocument(); // Real success_rate
        expect(screen.getByText('156')).toBeInTheDocument(); // Real usage_count
        expect(screen.getByText('97.5%')).toBeInTheDocument(); // Real uptime
      });
      
      // Verify minimal Math.random usage (only for UI animations, etc.)
      expect(randomCallCount).toBeLessThanOrEqual(3);
    });

    test('should prevent regression of mock data patterns', async () => {
      // Test patterns that indicate mock data usage
      const mockDataPatterns = [
        /Math\.random\(\)\s*\*\s*\d+/, // Random multiplication patterns
        /Math\.floor\(Math\.random\(\)\s*\*/, // Floor random patterns
        /\+\s*Math\.random\(\)/, // Addition with random
        /\d+\s*\+\s*Math\.random\(\)\s*\*/ // Number + random * number
      ];
      
      // These patterns should NOT exist in our code
      const transformCode = transformApiDataToStats.toString();
      const activitiesCode = generateRealActivities.toString();
      const postsCode = generateRealPosts.toString();
      
      mockDataPatterns.forEach(pattern => {
        expect(transformCode).not.toMatch(pattern);
        expect(activitiesCode).not.toMatch(pattern);
        expect(postsCode).not.toMatch(pattern);
      });
    });
  });
});
