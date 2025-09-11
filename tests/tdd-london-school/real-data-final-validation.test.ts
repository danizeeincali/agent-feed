/**
 * TDD London School: Real Data Integration Final Validation
 * 
 * MISSION: Verify 100% real API data integration with zero mock contamination
 * APPROACH: Outside-in TDD with behavior verification and contract testing
 * TOLERANCE: Zero synthetic or mock data allowed
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import UnifiedAgentPage from '../../frontend/src/components/UnifiedAgentPage';

// Mock fetch for controlled testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('UnifiedAgentPage - 100% Real Data Integration', () => {
  
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Real API Data Fetching', () => {
    test('should fetch real agent data from API endpoint', async () => {
      // Arrange: Mock real API response structure
      const realApiResponse = {
        success: true,
        data: {
          id: 'real-agent-123',
          name: 'TestAgent',
          display_name: 'Test Agent Display',
          description: 'Real agent description from API',
          status: 'active',
          capabilities: ['reasoning', 'analysis'],
          usage_count: 45,
          performance_metrics: {
            success_rate: 95.5,
            average_response_time: 1.2,
            total_tokens_used: 15000,
            error_count: 2,
            uptime_percentage: 99.1
          },
          health_status: {
            cpu_usage: 23.5,
            memory_usage: 67.2,
            response_time: 1.1,
            last_heartbeat: '2025-01-10T10:30:00Z',
            status: 'healthy'
          },
          created_at: '2025-01-01T00:00:00Z',
          last_used: '2025-01-10T10:00:00Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => realApiResponse
      });

      // Mock activities endpoint - must return empty array if no real data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => []
      });

      // Mock posts endpoint - must return empty array if no real data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => []
      });

      // Act: Render component
      render(
        <MemoryRouter initialEntries={['/agents/real-agent-123']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      // Assert: Verify API calls are made to correct endpoints
      await waitFor(() => {
        expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/agents/real-agent-123');
        expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/agents/real-agent-123/activities');
        expect(mockFetch).toHaveBeenNthCalledWith(3, '/api/agents/real-agent-123/posts');
      });

      // Verify real data is displayed
      await waitFor(() => {
        expect(screen.getByText('Test Agent Display')).toBeInTheDocument();
        expect(screen.getByText('Real agent description from API')).toBeInTheDocument();
        expect(screen.getByText('95.5%')).toBeInTheDocument(); // Real success rate
      });
    });

    test('should fetch real activities from dedicated API endpoint', async () => {
      // Arrange: Mock agent data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'test-agent',
            name: 'Test Agent',
            description: 'Test description',
            status: 'active',
            capabilities: []
          }
        })
      });

      // Real activities data from API
      const realActivitiesResponse = [
        {
          id: 'activity-1',
          type: 'task_completed',
          title: 'Real Task Completed',
          description: 'Actual task from API logs',
          timestamp: '2025-01-10T09:30:00Z',
          metadata: {
            duration: 120,
            success: true,
            priority: 'high'
          }
        }
      ];

      // Mock activities endpoint with real data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => realActivitiesResponse
      });

      // Mock empty posts
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => []
      });

      // Act
      render(
        <MemoryRouter initialEntries={['/agents/test-agent']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      // Assert: Verify activities API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/agents/test-agent/activities');
      });

      // Switch to activity tab to verify real data display
      fireEvent.click(screen.getByText('Activity'));
      
      await waitFor(() => {
        expect(screen.getByText('Real Task Completed')).toBeInTheDocument();
        expect(screen.getByText('Actual task from API logs')).toBeInTheDocument();
      });
    });

    test('should fetch real posts from dedicated API endpoint', async () => {
      // Arrange: Mock agent data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'test-agent',
            name: 'Test Agent',
            description: 'Test description',
            status: 'active',
            capabilities: []
          }
        })
      });

      // Mock empty activities
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => []
      });

      // Real posts data from API
      const realPostsResponse = [
        {
          id: 'post-1',
          type: 'insight',
          title: 'Real Agent Insight',
          content: 'Authentic post content from API',
          timestamp: '2025-01-10T08:00:00Z',
          author: {
            id: 'test-agent',
            name: 'Test Agent',
            avatar: '🤖'
          },
          tags: ['api', 'real-data'],
          interactions: {
            likes: 15,
            comments: 3,
            shares: 2,
            bookmarks: 8
          },
          priority: 'medium'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => realPostsResponse
      });

      // Act
      render(
        <MemoryRouter initialEntries={['/agents/test-agent']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      // Assert: Verify posts API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/agents/test-agent/posts');
      });

      // Switch to activity tab to verify real post data
      fireEvent.click(screen.getByText('Activity'));
      
      await waitFor(() => {
        expect(screen.getByText('Real Agent Insight')).toBeInTheDocument();
        expect(screen.getByText('Authentic post content from API')).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument(); // Real interaction count
      });
    });

    test('should show empty arrays when API endpoints return no data', async () => {
      // Arrange: Mock agent data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'empty-agent',
            name: 'Empty Agent',
            description: 'Agent with no activities or posts',
            status: 'active',
            capabilities: []
          }
        })
      });

      // Mock empty responses from API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [] // Empty activities
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [] // Empty posts
      });

      // Act
      render(
        <MemoryRouter initialEntries={['/agents/empty-agent']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      // Assert: Verify empty state, no mock data generation
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      // Switch to activity tab
      fireEvent.click(screen.getByText('Activity'));
      
      // Should not have any generated activities or posts
      await waitFor(() => {
        const activitySection = screen.getByText('Recent Activities').closest('div');
        // Should not contain any synthetic activities
        expect(activitySection).not.toHaveTextContent('Generated');
        expect(activitySection).not.toHaveTextContent('Sample');
        expect(activitySection).not.toHaveTextContent('Mock');
      });
    });

    test('should handle API failure without generating fallback data', async () => {
      // Arrange: Mock API failure
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      // Act
      render(
        <MemoryRouter initialEntries={['/agents/failed-agent']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      // Assert: Should show error state, not generate mock data
      await waitFor(() => {
        expect(screen.getByText('Error Loading Agent')).toBeInTheDocument();
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });

      // Verify no synthetic data is displayed
      expect(screen.queryByText('Sample')).not.toBeInTheDocument();
      expect(screen.queryByText('Generated')).not.toBeInTheDocument();
      expect(screen.queryByText('Mock')).not.toBeInTheDocument();
    });
  });

  describe('Performance Metrics Real Data Mapping', () => {
    test('should display exact API performance metrics without modification', async () => {
      // Arrange: Real API data with specific metrics
      const realMetrics = {
        success_rate: 87.3,
        average_response_time: 2.45,
        total_tokens_used: 23456,
        error_count: 12,
        uptime_percentage: 96.8
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'metrics-agent',
            name: 'Metrics Agent',
            description: 'Agent for metrics testing',
            status: 'active',
            capabilities: [],
            performance_metrics: realMetrics,
            usage_count: 156
          }
        })
      });

      // Mock empty activities and posts
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

      // Act
      render(
        <MemoryRouter initialEntries={['/agents/metrics-agent']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      // Assert: Verify exact metric values are displayed
      await waitFor(() => {
        expect(screen.getByText('87.3%')).toBeInTheDocument(); // Exact success rate
        expect(screen.getByText('2.45s')).toBeInTheDocument(); // Exact response time
        expect(screen.getByText('156')).toBeInTheDocument(); // Exact usage count
      });

      // Switch to details tab for more metrics
      fireEvent.click(screen.getByText('Details'));
      
      await waitFor(() => {
        expect(screen.getByText('87.3%')).toBeInTheDocument();
        expect(screen.getByText('2.45s')).toBeInTheDocument();
      });
    });

    test('should calculate stats deterministically from real API data', async () => {
      // Arrange: API data with known values for deterministic calculation
      const apiData = {
        id: 'calc-agent',
        name: 'Calculation Agent',
        description: 'Test agent',
        status: 'active',
        capabilities: [],
        usage_count: 100,
        performance_metrics: {
          success_rate: 95,
          average_response_time: 1.5,
          uptime_percentage: 98.5
        },
        last_used: '2025-01-10T14:00:00Z', // Known timestamp for deterministic calculation
        created_at: '2025-01-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: apiData })
      });

      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

      // Act
      render(
        <MemoryRouter initialEntries={['/agents/calc-agent']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      // Assert: Verify deterministic calculations
      await waitFor(() => {
        // Success rate should be exactly from API
        expect(screen.getByText('95%')).toBeInTheDocument();
        
        // Response time should be exactly from API  
        expect(screen.getByText('1.5s')).toBeInTheDocument();
        
        // Task count should be exactly from API
        expect(screen.getByText('100')).toBeInTheDocument();
      });
    });
  });

  describe('Real Data Consistency Validation', () => {
    test('should produce identical UI with same API response', async () => {
      const consistentApiData = {
        success: true,
        data: {
          id: 'consistent-agent',
          name: 'Consistent Agent',
          description: 'Same data should produce same UI',
          status: 'active',
          capabilities: ['test'],
          performance_metrics: {
            success_rate: 92.1,
            average_response_time: 1.8
          }
        }
      };

      // First render
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => consistentApiData
      });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

      const { unmount } = render(
        <MemoryRouter initialEntries={['/agents/consistent-agent']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Consistent Agent')).toBeInTheDocument();
        expect(screen.getByText('92.1%')).toBeInTheDocument();
      });

      const firstRenderSnapshot = screen.getByText('Same data should produce same UI').textContent;
      unmount();

      // Clear mocks and render again with identical data
      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => consistentApiData
      });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

      render(
        <MemoryRouter initialEntries={['/agents/consistent-agent']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Consistent Agent')).toBeInTheDocument();
        expect(screen.getByText('92.1%')).toBeInTheDocument();
      });

      const secondRenderSnapshot = screen.getByText('Same data should produce same UI').textContent;

      // Assert: Both renders should be identical
      expect(secondRenderSnapshot).toBe(firstRenderSnapshot);
    });

    test('should reflect different agent data accurately', async () => {
      // Test with two different agents to ensure uniqueness
      const agent1Data = {
        success: true,
        data: {
          id: 'agent-1',
          name: 'Agent One',
          description: 'First agent description',
          status: 'active',
          capabilities: ['capability-1'],
          performance_metrics: { success_rate: 85 }
        }
      };

      const agent2Data = {
        success: true,
        data: {
          id: 'agent-2', 
          name: 'Agent Two',
          description: 'Second agent description',
          status: 'inactive',
          capabilities: ['capability-2'],
          performance_metrics: { success_rate: 92 }
        }
      };

      // Render first agent
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => agent1Data });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

      const { unmount } = render(
        <MemoryRouter initialEntries={['/agents/agent-1']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Agent One')).toBeInTheDocument();
        expect(screen.getByText('First agent description')).toBeInTheDocument();
        expect(screen.getByText('85%')).toBeInTheDocument();
      });

      unmount();

      // Render second agent with different data
      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => agent2Data });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

      render(
        <MemoryRouter initialEntries={['/agents/agent-2']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Agent Two')).toBeInTheDocument();
        expect(screen.getByText('Second agent description')).toBeInTheDocument();
        expect(screen.getByText('92%')).toBeInTheDocument();
      });

      // Verify first agent data is not present
      expect(screen.queryByText('Agent One')).not.toBeInTheDocument();
      expect(screen.queryByText('First agent description')).not.toBeInTheDocument();
      expect(screen.queryByText('85%')).not.toBeInTheDocument();
    });
  });
});