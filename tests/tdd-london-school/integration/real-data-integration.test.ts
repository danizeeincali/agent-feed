/**
 * TDD London School Integration Tests - Real Data Integration
 * Tests UnifiedAgentPage fetches and transforms real API data correctly
 * Follows outside-in TDD approach with behavior verification
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import UnifiedAgentPage from '../../../frontend/src/components/UnifiedAgentPage';
import {
  transformApiDataToStats,
  generateRealActivities,
  generateRealPosts,
  validateApiResponse
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
    useParams: () => ({ agentId: 'test-agent-123' }),
    useNavigate: () => jest.fn()
  };
});

describe('Real Data Integration - London School TDD', () => {
  const mockApiResponse = {
    success: true,
    data: {
      id: 'test-agent-123',
      name: 'TestAgent',
      display_name: 'Test Agent',
      description: 'A test agent for integration testing',
      status: 'active',
      capabilities: ['analysis', 'processing'],
      performance_metrics: {
        success_rate: 95.5,
        average_response_time: 350,
        uptime_percentage: 99.2,
        total_tokens_used: 15000,
        error_count: 2
      },
      health_status: {
        connection_status: 'connected',
        cpu_usage: 45.2,
        memory_usage: 62.8,
        response_time: 285,
        error_count_24h: 1,
        active_tasks: 3
      },
      usage_count: 247,
      last_used: '2024-09-10T10:30:00Z'
    }
  };

  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    // Mock fetch with London School approach - mock the external dependency
    mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;
    
    // Default successful response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => mockApiResponse
    } as Response);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('API Data Fetching Behavior', () => {
    test('should fetch real API data on component mount', async () => {
      render(
        <MockRouter>
          <UnifiedAgentPage />
        </MockRouter>
      );

      // Verify API call was made with correct endpoint
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/agents/test-agent-123');
      });

      // Verify component displays API data
      await waitFor(() => {
        expect(screen.getByText('Test Agent')).toBeInTheDocument();
        expect(screen.getByText('A test agent for integration testing')).toBeInTheDocument();
      });
    });

    test('should handle API error states correctly', async () => {
      // Mock API failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ success: false, error: 'Agent not found' })
      } as Response);

      render(
        <MockRouter>
          <UnifiedAgentPage />
        </MockRouter>
      );

      // Verify error handling behavior
      await waitFor(() => {
        expect(screen.getByText(/Error Loading Agent/)).toBeInTheDocument();
        expect(screen.getByText(/Agent not found/)).toBeInTheDocument();
      });
    });

    test('should retry API call when refresh button is clicked', async () => {
      render(
        <MockRouter>
          <UnifiedAgentPage />
        </MockRouter>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Click refresh button
      const refreshButton = await screen.findByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      // Verify second API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Performance Metrics Transformation', () => {
    test('should transform performance_metrics to stats interface correctly', () => {
      const { performance_metrics, health_status, usage_count } = mockApiResponse.data;
      
      const stats = transformApiDataToStats(
        performance_metrics,
        health_status,
        usage_count
      );

      // Verify exact mappings - London School focuses on behavior verification
      expect(stats.successRate).toBe(95.5); // performance_metrics.success_rate
      expect(stats.uptime).toBe(99.2); // performance_metrics.uptime_percentage
      expect(stats.averageResponseTime).toBe(350); // performance_metrics.average_response_time
      expect(stats.tasksCompleted).toBe(247); // usage_count
      
      // Verify calculated values
      expect(stats.todayTasks).toBeGreaterThan(0);
      expect(stats.weeklyTasks).toBeGreaterThan(stats.todayTasks);
      expect(stats.satisfaction).toBeGreaterThan(0);
      expect(stats.satisfaction).toBeLessThanOrEqual(5);
    });

    test('should handle missing performance metrics gracefully', () => {
      const stats = transformApiDataToStats(
        {} as any, // Empty performance metrics
        mockApiResponse.data.health_status,
        mockApiResponse.data.usage_count
      );

      // Verify safe defaults are used
      expect(stats.successRate).toBe(0);
      expect(stats.uptime).toBe(0);
      expect(stats.averageResponseTime).toBe(285); // Falls back to health_status.response_time
      expect(stats.tasksCompleted).toBe(247);
    });
  });

  describe('Health Status Activity Generation', () => {
    test('should generate real activities from health_status.active_tasks', () => {
      const { performance_metrics, health_status, usage_count, last_used, name } = mockApiResponse.data;
      
      const activities = generateRealActivities(
        performance_metrics,
        health_status,
        usage_count,
        last_used,
        name
      );

      // Verify activities are generated from real data, not random
      expect(activities).toHaveLength(4);
      
      // Verify task completion activity uses real usage_count
      const taskActivity = activities.find(a => a.type === 'task_completed');
      expect(taskActivity).toBeDefined();
      expect(taskActivity!.title).toContain('247'); // Real usage_count
      expect(taskActivity!.description).toContain('95.5%'); // Real success_rate

      // Verify health activity uses real health metrics
      const healthActivity = activities.find(a => a.description.includes('CPU'));
      if (healthActivity) {
        expect(healthActivity.description).toContain('45.2%'); // Real CPU usage
        expect(healthActivity.description).toContain('62.8%'); // Real memory usage
      }
    });

    test('should not use Math.random() in activity generation', () => {
      // Mock Math.random to detect usage
      const originalRandom = Math.random;
      const mockRandom = jest.fn(() => 0.5);
      Math.random = mockRandom;

      try {
        generateRealActivities(
          mockApiResponse.data.performance_metrics,
          mockApiResponse.data.health_status,
          mockApiResponse.data.usage_count,
          mockApiResponse.data.last_used,
          mockApiResponse.data.name
        );

        // Verify Math.random was not called (except for the one allowed case in filling activities)
        expect(mockRandom).toHaveBeenCalledTimes(0);
      } finally {
        Math.random = originalRandom;
      }
    });
  });

  describe('Usage Pattern Post Generation', () => {
    test('should generate posts from usage_count and last_used data', () => {
      const { performance_metrics, health_status, usage_count, id, name } = mockApiResponse.data;
      
      const posts = generateRealPosts(
        performance_metrics,
        health_status,
        usage_count,
        id,
        name
      );

      // Verify posts reflect real usage data
      expect(posts.length).toBeGreaterThan(0);
      
      // Find achievement post
      const achievementPost = posts.find(p => p.type === 'achievement');
      expect(achievementPost).toBeDefined();
      expect(achievementPost!.title).toContain('247'); // Real usage_count
      expect(achievementPost!.content).toContain('95.5%'); // Real success_rate
      expect(achievementPost!.content).toContain('350ms'); // Real response time

      // Verify interaction counts are calculated from real metrics, not random
      expect(achievementPost!.interactions.likes).toBeGreaterThan(0);
      // Likes should be based on usage_count formula: Math.floor(247/20) + Math.floor(95.5/10)
      const expectedLikes = Math.max(5, Math.floor(247 / 20) + Math.floor(95.5 / 10));
      expect(achievementPost!.interactions.likes).toBe(expectedLikes);
    });

    test('should create deterministic posts with same API input', () => {
      const { performance_metrics, health_status, usage_count, id, name } = mockApiResponse.data;
      
      const posts1 = generateRealPosts(performance_metrics, health_status, usage_count, id, name);
      const posts2 = generateRealPosts(performance_metrics, health_status, usage_count, id, name);

      // Posts should be identical with same input (deterministic behavior)
      expect(posts1).toHaveLength(posts2.length);
      expect(posts1[0]?.title).toBe(posts2[0]?.title);
      expect(posts1[0]?.interactions.likes).toBe(posts2[0]?.interactions.likes);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed API response structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ success: true, data: null })
      } as Response);

      render(
        <MockRouter>
          <UnifiedAgentPage />
        </MockRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Agent Not Found/)).toBeInTheDocument();
      });
    });

    test('should validate API response data integrity', () => {
      const validationResult = validateApiResponse(mockApiResponse.data);
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);

      // Test with invalid data
      const invalidData = {
        ...mockApiResponse.data,
        performance_metrics: {
          ...mockApiResponse.data.performance_metrics,
          success_rate: 150 // Invalid: > 100
        }
      };

      const invalidResult = validateApiResponse(invalidData);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Invalid success_rate in performance_metrics');
    });

    test('should handle missing required API fields gracefully', () => {
      const incompleteData = {
        id: 'test-agent',
        name: 'Test Agent'
        // Missing performance_metrics, health_status, usage_count
      };

      const stats = transformApiDataToStats(
        undefined as any,
        undefined as any,
        0
      );

      // Should provide safe defaults
      expect(stats.successRate).toBe(0);
      expect(stats.uptime).toBe(0);
      expect(stats.tasksCompleted).toBe(0);
    });
  });

  describe('Component Integration with Real Data', () => {
    test('should display transformed real data in UI components', async () => {
      render(
        <MockRouter>
          <UnifiedAgentPage />
        </MockRouter>
      );

      // Wait for data to load and verify UI displays real API values
      await waitFor(() => {
        // Check that success rate from API (95.5%) is displayed
        expect(screen.getByText('95.5%')).toBeInTheDocument();
        
        // Check that task count from API (247) is displayed
        expect(screen.getByText('247')).toBeInTheDocument();
        
        // Check that uptime from API (99.2%) is displayed
        expect(screen.getByText('99.2%')).toBeInTheDocument();
      });
    });

    test('should refresh data when API response changes', async () => {
      const { rerender } = render(
        <MockRouter>
          <UnifiedAgentPage />
        </MockRouter>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('247')).toBeInTheDocument();
      });

      // Update mock API response
      const updatedResponse = {
        ...mockApiResponse,
        data: {
          ...mockApiResponse.data,
          usage_count: 300,
          performance_metrics: {
            ...mockApiResponse.data.performance_metrics,
            success_rate: 97.8
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => updatedResponse
      } as Response);

      // Trigger refresh
      const refreshButton = await screen.findByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      // Verify UI updates with new real data
      await waitFor(() => {
        expect(screen.getByText('300')).toBeInTheDocument();
        expect(screen.getByText('97.8%')).toBeInTheDocument();
      });
    });
  });
});
