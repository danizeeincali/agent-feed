/**
 * TDD London School: Real API Dependency Verification Tests
 * 
 * Tests that UnifiedAgentPage ONLY displays data from real API responses
 * and gracefully handles missing data with empty states.
 * 
 * London School Focus:
 * - Mock API collaborator to control data flow
 * - Verify component behavior with different API responses
 * - Test interaction contracts between component and API
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock router collaborator
const mockNavigate = jest.fn();
const mockParams = { agentId: 'api-dependency-test-agent' };

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockParams,
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>
}));

// Import component after mocks
import UnifiedAgentPage from '../../frontend/src/components/UnifiedAgentPage';

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

// API Response Contracts
interface ApiSuccessResponse {
  success: true;
  data: RealAgentApiData;
  timestamp?: string;
}

interface ApiErrorResponse {
  success: false;
  error: string;
  code?: number;
}

interface RealAgentApiData {
  id: string;
  name: string;
  display_name?: string;
  description: string;
  status: string;
  capabilities: string[];
  performance_metrics?: {
    success_rate: number;
    average_response_time: number;
    total_tokens_used: number;
    error_count: number;
    validations_completed?: number;
    uptime_percentage?: number;
  };
  health_status?: {
    cpu_usage: number;
    memory_usage: number;
    response_time: number;
    last_heartbeat: string;
    status: string;
    active_tasks?: number;
  };
  usage_count?: number;
  last_used?: string;
  created_at?: string;
}

describe('Real API Dependency Verification - London School TDD', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    // Mock fetch collaborator
    mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Empty State Verification - No Activities', () => {
    test('shows empty state when no activities API data', async () => {
      // Arrange: API response with no activity-generating data
      const noActivityApiData: RealAgentApiData = {
        id: 'no-activity-agent',
        name: 'NoActivityAgent',
        description: 'Agent without activity data',
        status: 'inactive',
        capabilities: ['basic']
        // Deliberately NO performance_metrics, health_status, or usage data
      };

      const apiResponse: ApiSuccessResponse = {
        success: true,
        data: noActivityApiData
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(apiResponse)
      } as Response);

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Assert: Verify API was called
      expect(mockFetch).toHaveBeenCalledWith('/api/agents/api-dependency-test-agent');

      await waitFor(() => {
        expect(screen.getByText('NoActivityAgent')).toBeInTheDocument();
      });

      // Navigate to Activity tab
      const activityTab = screen.getByRole('button', { name: /activity/i });
      fireEvent.click(activityTab);

      await waitFor(() => {
        expect(screen.getByText('Recent Activities')).toBeInTheDocument();
      });

      // Critical: Should show "No recent activities" not generated activities
      expect(screen.getByText(/No recent activities|No activities available/)).toBeInTheDocument();
      
      // Should NOT show any of these fake activities
      const fakeActivities = [
        'System Health Check Complete',
        'Processing Active Tasks',
        'High Performance Achievement',
        'Error Events Logged',
        'Recent Task Completion',
        'Agent Ready for Tasks'
      ];

      const pageContent = document.body.textContent || '';
      fakeActivities.forEach(fakeActivity => {
        expect(pageContent).not.toContain(fakeActivity);
      });
    });

    test('shows empty state with minimal performance metrics', async () => {
      // Arrange: API with minimal metrics that shouldn't generate activities
      const minimalMetricsData: RealAgentApiData = {
        id: 'minimal-metrics-agent',
        name: 'MinimalMetricsAgent',
        description: 'Agent with minimal metrics',
        status: 'active',
        capabilities: ['minimal'],
        performance_metrics: {
          success_rate: 0, // No successful tasks
          average_response_time: 0,
          total_tokens_used: 0,
          error_count: 0
        }
        // No health_status or usage_count
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: minimalMetricsData
        })
      } as Response);

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('MinimalMetricsAgent')).toBeInTheDocument();
      });

      // Navigate to Activity tab
      fireEvent.click(screen.getByRole('button', { name: /activity/i }));

      await waitFor(() => {
        expect(screen.getByText('Recent Activities')).toBeInTheDocument();
      });

      // With zero metrics, should not generate achievement activities
      const pageContent = document.body.textContent || '';
      expect(pageContent).not.toContain('High Performance Achievement');
      expect(pageContent).not.toContain('Achievement');
      expect(pageContent).not.toContain('Milestone');
    });
  });

  describe('Empty State Verification - No Posts', () => {
    test('shows empty state when no posts API data', async () => {
      // Arrange: API response with no post-generating data
      const noPostsApiData: RealAgentApiData = {
        id: 'no-posts-agent',
        name: 'NoPostsAgent',
        description: 'Agent without post capability',
        status: 'active',
        capabilities: ['read-only'],
        usage_count: 0, // No usage = no milestone posts
        // No last_used = no activity posts
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: noPostsApiData
        })
      } as Response);

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('NoPostsAgent')).toBeInTheDocument();
      });

      // Navigate to Activity tab to check posts section
      fireEvent.click(screen.getByRole('button', { name: /activity/i }));

      await waitFor(() => {
        expect(screen.getByText('Posts & Updates')).toBeInTheDocument();
      });

      // Critical: Should show "No recent posts" not fabricated content
      expect(screen.getByText(/No recent posts|No posts available/)).toBeInTheDocument();
      
      // Should NOT show any fabricated posts
      const fabricatedPosts = [
        'Milestone: 100 Tasks Completed',
        'Milestone: 500 Tasks Completed', 
        'Milestone: 1,000 Tasks Completed',
        'Recent Activity Update',
        'Performance Insights & Capabilities'
      ];

      const pageContent = document.body.textContent || '';
      fabricatedPosts.forEach(fabricatedPost => {
        expect(pageContent).not.toContain(fabricatedPost);
      });
    });

    test('shows empty state when usage_count too low for milestones', async () => {
      // Arrange: API with usage below milestone thresholds
      const lowUsageData: RealAgentApiData = {
        id: 'low-usage-agent',
        name: 'LowUsageAgent',
        description: 'Agent with low usage',
        status: 'active',
        capabilities: ['testing'],
        usage_count: 50, // Below 100 milestone threshold
        last_used: '2024-09-01T12:00:00Z' // Old date
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: lowUsageData
        })
      } as Response);

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('LowUsageAgent')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /activity/i }));

      await waitFor(() => {
        expect(screen.getByText('Posts & Updates')).toBeInTheDocument();
      });

      // Should not generate milestone posts for low usage
      const pageContent = document.body.textContent || '';
      expect(pageContent).not.toContain('Milestone:');
      expect(pageContent).not.toContain('50 Tasks Completed'); // Below threshold
    });
  });

  describe('API Failure Handling', () => {
    test('handles API 404 error gracefully', async () => {
      // Arrange: Mock 404 API response
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Agent not found: api-dependency-test-agent',
        code: 404
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn().mockResolvedValue(errorResponse)
      } as Response);

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Assert: Should show error state, not generate mock data
      await waitFor(() => {
        expect(screen.getByText('Error Loading Agent')).toBeInTheDocument();
        expect(screen.getByText(/Agent "api-dependency-test-agent" could not be found/)).toBeInTheDocument();
      });

      // Should provide recovery options
      expect(screen.getByRole('button', { name: /back to agents/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

      // Should NOT show any generated content
      const pageContent = document.body.textContent || '';
      expect(pageContent).not.toContain('Recent Activities');
      expect(pageContent).not.toContain('Posts & Updates');
    });

    test('handles API 500 error gracefully', async () => {
      // Arrange: Mock server error
      mockFetch.mockRejectedValue(new Error('Server Error'));

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Assert: Should handle network errors
      await waitFor(() => {
        expect(screen.getByText(/Error Loading Agent|Failed to load agent data/)).toBeInTheDocument();
      });

      // Should not attempt to show data when API fails
      const pageContent = document.body.textContent || '';
      expect(pageContent).not.toContain('System Health Check');
      expect(pageContent).not.toContain('Performance Achievement');
    });

    test('retries API call on user action', async () => {
      // Arrange: First call fails, second succeeds
      const successData: RealAgentApiData = {
        id: 'retry-agent',
        name: 'RetryAgent',
        description: 'Agent for retry testing',
        status: 'active',
        capabilities: ['resilient']
      };

      mockFetch
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: successData
          })
        } as Response);

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/Error Loading Agent/)).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      // Assert: Should make second API call and succeed
      await waitFor(() => {
        expect(screen.getByText('RetryAgent')).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Data Source Verification', () => {
    test('every displayed metric traces back to API response', async () => {
      // Arrange: API with specific trackable values
      const trackedApiData: RealAgentApiData = {
        id: 'tracked-agent',
        name: 'TrackedAgent', 
        description: 'TRACKED_DESCRIPTION_12345',
        status: 'active',
        capabilities: ['TRACKED_CAP_A', 'TRACKED_CAP_B'],
        performance_metrics: {
          success_rate: 83.47, // Specific decimal
          average_response_time: 276, // Specific number
          total_tokens_used: 8765,
          error_count: 3,
          uptime_percentage: 91.23
        },
        usage_count: 234 // Specific count
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: trackedApiData
        })
      } as Response);

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Assert: Wait for data and verify tracking
      await waitFor(() => {
        expect(screen.getByText('TrackedAgent')).toBeInTheDocument();
        expect(screen.getByText('TRACKED_DESCRIPTION_12345')).toBeInTheDocument();
      });

      // Verify every metric can be traced to API
      expect(screen.getByText('83%')).toBeInTheDocument(); // success_rate: 83.47
      expect(screen.getByText('276s')).toBeInTheDocument(); // average_response_time: 276  
      expect(screen.getByText('91%')).toBeInTheDocument(); // uptime_percentage: 91.23
      expect(screen.getByText('234')).toBeInTheDocument(); // usage_count: 234

      // Verify capabilities from API
      expect(screen.getByText('TRACKED_CAP_A')).toBeInTheDocument();
      expect(screen.getByText('TRACKED_CAP_B')).toBeInTheDocument();

      // Verify no additional data appears
      const pageContent = document.body.textContent || '';
      expect(pageContent).not.toContain('UNTRACKED');
      expect(pageContent).not.toContain('GENERATED');
      expect(pageContent).not.toContain('MOCK');
    });

    test('activity content reflects real API metrics only', async () => {
      // Arrange: API with specific health status
      const healthStatusData: RealAgentApiData = {
        id: 'health-agent',
        name: 'HealthAgent',
        description: 'Health status testing',
        status: 'active',
        capabilities: ['health-monitoring'],
        performance_metrics: {
          success_rate: 96.12,
          average_response_time: 189,
          total_tokens_used: 5678,
          error_count: 1
        },
        health_status: {
          cpu_usage: 42.7,
          memory_usage: 67.3,
          response_time: 234,
          last_heartbeat: '2024-09-10T15:30:00Z',
          status: 'healthy',
          active_tasks: 2
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: healthStatusData
        })
      } as Response);

      // Act: Render component and check activities
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('HealthAgent')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /activity/i }));

      await waitFor(() => {
        expect(screen.getByText('Recent Activities')).toBeInTheDocument();
      });

      // If activities are generated, they must use real API data
      const pageContent = document.body.textContent || '';
      if (pageContent.includes('CPU')) {
        expect(pageContent).toContain('42.7%'); // Real CPU usage
        expect(pageContent).toContain('67.3%'); // Real memory usage
      }
      if (pageContent.includes('success rate')) {
        expect(pageContent).toContain('96.12%'); // Real success rate
      }
      if (pageContent.includes('tasks')) {
        // Should reference real active_tasks: 2, not random numbers
        expect(pageContent).toContain('2'); 
      }
    });

    test('post interactions calculated from real metrics only', async () => {
      // Arrange: API with milestone-worthy usage
      const milestoneData: RealAgentApiData = {
        id: 'milestone-agent',
        name: 'MilestoneAgent',
        description: 'Milestone testing agent',
        status: 'active',
        capabilities: ['milestone-tracking'],
        usage_count: 1337, // Above 1000 milestone threshold
        performance_metrics: {
          success_rate: 88.9,
          average_response_time: 155,
          total_tokens_used: 9999,
          error_count: 2
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: milestoneData
        })
      } as Response);

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('MilestoneAgent')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /activity/i }));

      await waitFor(() => {
        expect(screen.getByText('Posts & Updates')).toBeInTheDocument();
      });

      // If milestone post is generated, interactions must be calculated from real data
      const pageContent = document.body.textContent || '';
      if (pageContent.includes('Milestone')) {
        // Verify the milestone references real usage_count: 1337
        expect(pageContent).toContain('1,337') || expect(pageContent).toContain('1337');
        
        // Interaction calculations should be deterministic based on real metrics
        // If likes = Math.floor(usage_count / 50), then likes = Math.floor(1337/50) = 26
        if (pageContent.includes('likes') || pageContent.includes('❤')) {
          // Should have calculated likes, not random
          expect(pageContent).toMatch(/\b26\b/); // Expected calculated value
        }
      }
    });
  });

  describe('Null/Undefined Data Handling', () => {
    test('handles null API response gracefully', async () => {
      // Arrange: API returns null data
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: null
        })
      } as Response);

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Assert: Should show error state, not try to process null
      await waitFor(() => {
        expect(screen.getByText(/Error Loading Agent|Agent Not Found/)).toBeInTheDocument();
      });
    });

    test('handles undefined optional fields gracefully', async () => {
      // Arrange: API with only required fields
      const minimalApiData: RealAgentApiData = {
        id: 'minimal-agent',
        name: 'MinimalAgent',
        description: 'Minimal API data',
        status: 'active',
        capabilities: []
        // All optional fields undefined
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: minimalApiData
        })
      } as Response);

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Assert: Should handle undefined fields gracefully
      await waitFor(() => {
        expect(screen.getByText('MinimalAgent')).toBeInTheDocument();
      });

      // Should show default/fallback values, not crash
      expect(screen.getByText('0%')).toBeInTheDocument(); // Default success rate
      expect(screen.getByText('0')).toBeInTheDocument(); // Default task count
    });
  });

  describe('API Contract Verification', () => {
    test('sends correct API request format', async () => {
      // Arrange: Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            id: 'contract-agent',
            name: 'ContractAgent',
            description: 'Contract verification',
            status: 'active',
            capabilities: []
          }
        })
      } as Response);

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Assert: Verify API contract
      expect(mockFetch).toHaveBeenCalledWith('/api/agents/api-dependency-test-agent');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Should be GET request (default fetch behavior)
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[1]).toBeUndefined(); // No options = GET request
    });

    test('handles malformed API response', async () => {
      // Arrange: Mock malformed JSON response
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      } as Response);

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Assert: Should handle JSON parsing errors
      await waitFor(() => {
        expect(screen.getByText(/Error Loading Agent|Failed to load agent data/)).toBeInTheDocument();
      });
    });
  });
});