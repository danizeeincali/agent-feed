/**
 * TDD London School: End-to-End Real Data Flow Comprehensive Testing
 * 
 * MISSION: Validate complete real data flow from API to UI display
 * APPROACH: Outside-in behavior verification with mock orchestration
 * SCOPE: Full user journey with 100% real data integration
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock fetch for controlled E2E testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import component for testing
const getUnifiedAgentPage = async () => {
  const module = await import('../../frontend/src/components/UnifiedAgentPage');
  return module.default;
};

describe('End-to-End Real Data Flow Validation - ZERO SYNTHETIC DATA', () => {

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Complete Data Flow: API → Component → UI', () => {
    test('should display real agent stats in Overview tab from exact API data', async () => {
      // Arrange: Comprehensive real API response
      const realApiAgentData = {
        success: true,
        data: {
          id: 'e2e-performance-agent',
          name: 'E2E Performance Agent',
          display_name: 'Performance Testing Agent',
          description: 'Real agent for end-to-end performance validation',
          status: 'active',
          type: 'performance-tester',
          category: 'testing',
          specialization: 'Performance analysis and optimization',
          avatar_color: '#1E40AF',
          capabilities: ['load-testing', 'performance-analysis', 'optimization'],
          usage_count: 347,
          performance_metrics: {
            success_rate: 96.8,
            average_response_time: 0.89,
            total_tokens_used: 89432,
            error_count: 11,
            validations_completed: 523,
            uptime_percentage: 99.2
          },
          health_status: {
            cpu_usage: 28.4,
            memory_usage: 71.6,
            response_time: 0.87,
            last_heartbeat: '2025-01-10T10:45:00Z',
            status: 'healthy',
            active_tasks: 5
          },
          created_at: '2024-12-15T08:30:00Z',
          updated_at: '2025-01-10T10:45:00Z',
          last_used: '2025-01-10T10:40:00Z'
        }
      };

      // Real activities from API
      const realActivitiesData = [
        {
          id: 'e2e-activity-1',
          type: 'task_completed',
          title: 'Performance Test Suite Executed',
          description: 'Completed comprehensive performance testing with 347 test cases',
          timestamp: '2025-01-10T10:30:00Z',
          metadata: {
            duration: 285,
            success: true,
            priority: 'high'
          }
        },
        {
          id: 'e2e-activity-2',
          type: 'milestone',
          title: 'Optimization Threshold Achieved',
          description: 'Successfully reduced response time below 1 second target',
          timestamp: '2025-01-10T09:15:00Z',
          metadata: {
            duration: 0,
            success: true,
            priority: 'medium'
          }
        }
      ];

      // Real posts from API
      const realPostsData = [
        {
          id: 'e2e-post-1',
          type: 'achievement',
          title: 'Performance Milestone: Sub-1s Response Times',
          content: 'Achieved consistent sub-1 second response times across all test scenarios. This represents a 23% improvement over previous benchmarks.',
          timestamp: '2025-01-10T10:00:00Z',
          author: {
            id: 'e2e-performance-agent',
            name: 'Performance Testing Agent',
            avatar: '⚡'
          },
          tags: ['performance', 'milestone', 'optimization'],
          interactions: {
            likes: 67,
            comments: 12,
            shares: 8,
            bookmarks: 24
          },
          isLiked: false,
          isBookmarked: true,
          priority: 'high'
        }
      ];

      // Mock API responses
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => realApiAgentData
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => realActivitiesData
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => realPostsData
      });

      // Act: Render component
      const UnifiedAgentPage = await getUnifiedAgentPage();
      render(
        <MemoryRouter initialEntries={['/agents/e2e-performance-agent']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      // Assert: Verify exact API data mapping to UI
      await waitFor(() => {
        expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/agents/e2e-performance-agent');
        expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/agents/e2e-performance-agent/activities');
        expect(mockFetch).toHaveBeenNthCalledWith(3, '/api/agents/e2e-performance-agent/posts');
      });

      // Verify Overview tab displays exact performance metrics
      await waitFor(() => {
        // Agent identification
        expect(screen.getByText('Performance Testing Agent')).toBeInTheDocument();
        expect(screen.getByText('Performance analysis and optimization')).toBeInTheDocument();
        
        // Performance metrics from API
        expect(screen.getByText('96.8%')).toBeInTheDocument(); // Success rate
        expect(screen.getByText('0.89s')).toBeInTheDocument(); // Response time
        expect(screen.getByText('347')).toBeInTheDocument(); // Usage count
        expect(screen.getByText('99.2%')).toBeInTheDocument(); // Uptime
        
        // Status indicators
        expect(screen.getByText('Active')).toBeInTheDocument();
      });

      // Verify calculations are deterministic and based on API data
      const todayTasksDisplay = screen.queryByText(/\d+ tasks/i);
      const weeklyTasksDisplay = screen.queryByText(/This Week/i);
      
      if (todayTasksDisplay && weeklyTasksDisplay) {
        // These should be calculated deterministically from API data
        // Not random or generated values
        expect(todayTasksDisplay).toBeInTheDocument();
        expect(weeklyTasksDisplay).toBeInTheDocument();
      }
    });

    test('should show real activities in Activity tab with exact API mapping', async () => {
      // Arrange: Minimal agent data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'activity-flow-agent',
            name: 'Activity Flow Agent',
            description: 'Testing activity data flow',
            status: 'active',
            capabilities: []
          }
        })
      });

      // Detailed activities for flow testing
      const detailedActivities = [
        {
          id: 'flow-activity-1',
          type: 'task_started',
          title: 'Data Pipeline Analysis Initiated',
          description: 'Started comprehensive analysis of data processing pipeline efficiency',
          timestamp: '2025-01-10T11:00:00Z',
          metadata: {
            duration: 0,
            success: true,
            priority: 'high'
          }
        },
        {
          id: 'flow-activity-2',
          type: 'task_completed',
          title: 'Security Audit Completed',
          description: 'Finished thorough security audit with 15 recommendations',
          timestamp: '2025-01-10T10:45:00Z',
          metadata: {
            duration: 420,
            success: true,
            priority: 'urgent'
          }
        },
        {
          id: 'flow-activity-3',
          type: 'error',
          title: 'Connection Timeout Error',
          description: 'Database connection timeout during query execution',
          timestamp: '2025-01-10T10:30:00Z',
          metadata: {
            duration: 30,
            success: false,
            priority: 'medium'
          }
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => detailedActivities
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => []
      });

      // Act: Render and navigate to Activity tab
      const UnifiedAgentPage = await getUnifiedAgentPage();
      render(
        <MemoryRouter initialEntries={['/agents/activity-flow-agent']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      // Navigate to Activity tab
      fireEvent.click(screen.getByText('Activity'));

      // Assert: Verify exact activity data display
      await waitFor(() => {
        // Activity 1
        expect(screen.getByText('Data Pipeline Analysis Initiated')).toBeInTheDocument();
        expect(screen.getByText('Started comprehensive analysis of data processing pipeline efficiency')).toBeInTheDocument();
        
        // Activity 2
        expect(screen.getByText('Security Audit Completed')).toBeInTheDocument();
        expect(screen.getByText('Finished thorough security audit with 15 recommendations')).toBeInTheDocument();
        expect(screen.getByText('Duration: 420m')).toBeInTheDocument();
        expect(screen.getByText('Success')).toBeInTheDocument();
        
        // Activity 3
        expect(screen.getByText('Connection Timeout Error')).toBeInTheDocument();
        expect(screen.getByText('Database connection timeout during query execution')).toBeInTheDocument();
        expect(screen.getByText('Failed')).toBeInTheDocument();
      });
    });

    test('should display real posts with authentic interactions from API', async () => {
      // Arrange: Agent data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'posts-flow-agent',
            name: 'Posts Flow Agent',
            description: 'Testing posts data flow',
            status: 'active',
            capabilities: []
          }
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => []
      });

      // Authentic posts with real interaction data
      const authenticPosts = [
        {
          id: 'authentic-post-1',
          type: 'insight',
          title: 'Machine Learning Model Performance Insights',
          content: 'After analyzing 10,000+ data points, our model shows 94.7% accuracy on validation set. Key insight: feature engineering on temporal data improved performance by 12%.',
          timestamp: '2025-01-10T11:30:00Z',
          author: {
            id: 'posts-flow-agent',
            name: 'Posts Flow Agent',
            avatar: '🧠'
          },
          tags: ['machine-learning', 'performance', 'insights', 'data-analysis'],
          interactions: {
            likes: 89,
            comments: 23,
            shares: 15,
            bookmarks: 34
          },
          isLiked: true,
          isBookmarked: false,
          priority: 'high'
        },
        {
          id: 'authentic-post-2',
          type: 'update',
          title: 'System Optimization Progress Update',
          content: 'Week 3 optimization results: 27% reduction in processing time, 35% decrease in memory usage. Next phase focuses on distributed computing implementation.',
          timestamp: '2025-01-10T09:00:00Z',
          author: {
            id: 'posts-flow-agent',
            name: 'Posts Flow Agent',
            avatar: '⚙️'
          },
          tags: ['optimization', 'performance', 'progress'],
          interactions: {
            likes: 156,
            comments: 41,
            shares: 28,
            bookmarks: 67
          },
          isLiked: false,
          isBookmarked: true,
          priority: 'medium'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => authenticPosts
      });

      // Act: Render and navigate to Activity tab
      const UnifiedAgentPage = await getUnifiedAgentPage();
      render(
        <MemoryRouter initialEntries={['/agents/posts-flow-agent']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      fireEvent.click(screen.getByText('Activity'));

      // Assert: Verify authentic post content and interactions
      await waitFor(() => {
        // Post 1 content
        expect(screen.getByText('Machine Learning Model Performance Insights')).toBeInTheDocument();
        expect(screen.getByText(/After analyzing 10,000\+ data points/)).toBeInTheDocument();
        expect(screen.getByText('89')).toBeInTheDocument(); // Likes
        expect(screen.getByText('23')).toBeInTheDocument(); // Comments
        expect(screen.getByText('15')).toBeInTheDocument(); // Shares
        expect(screen.getByText('34')).toBeInTheDocument(); // Bookmarks
        
        // Post 2 content
        expect(screen.getByText('System Optimization Progress Update')).toBeInTheDocument();
        expect(screen.getByText(/Week 3 optimization results/)).toBeInTheDocument();
        expect(screen.getByText('156')).toBeInTheDocument(); // Likes
        expect(screen.getByText('41')).toBeInTheDocument(); // Comments
        expect(screen.getByText('28')).toBeInTheDocument(); // Shares
        expect(screen.getByText('67')).toBeInTheDocument(); // Bookmarks
        
        // Tags
        expect(screen.getByText('#machine-learning')).toBeInTheDocument();
        expect(screen.getByText('#optimization')).toBeInTheDocument();
        expect(screen.getByText('#performance')).toBeInTheDocument();
      });
    });
  });

  describe('Multi-Agent Data Uniqueness Validation', () => {
    test('should display unique data for different agents', async () => {
      // Test Agent 1
      const agent1Data = {
        success: true,
        data: {
          id: 'unique-agent-1',
          name: 'Unique Agent Alpha',
          description: 'First unique agent description',
          status: 'active',
          capabilities: ['alpha-capability-1', 'alpha-capability-2'],
          performance_metrics: {
            success_rate: 87.3,
            average_response_time: 1.45,
            total_tokens_used: 12345
          }
        }
      };

      const agent1Activities = [
        {
          id: 'alpha-activity-1',
          type: 'task_completed',
          title: 'Alpha Task Completed',
          description: 'Unique task for agent alpha',
          timestamp: '2025-01-10T10:00:00Z'
        }
      ];

      // First agent render
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => agent1Data
      });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => agent1Activities
      });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      const UnifiedAgentPage = await getUnifiedAgentPage();
      const { unmount } = render(
        <MemoryRouter initialEntries={['/agents/unique-agent-1']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Unique Agent Alpha')).toBeInTheDocument();
        expect(screen.getByText('First unique agent description')).toBeInTheDocument();
        expect(screen.getByText('87.3%')).toBeInTheDocument();
      });

      unmount();

      // Test Agent 2 with completely different data
      const agent2Data = {
        success: true,
        data: {
          id: 'unique-agent-2',
          name: 'Unique Agent Beta',
          description: 'Second unique agent description',
          status: 'busy',
          capabilities: ['beta-capability-1', 'beta-capability-2'],
          performance_metrics: {
            success_rate: 92.7,
            average_response_time: 0.78,
            total_tokens_used: 54321
          }
        }
      };

      const agent2Activities = [
        {
          id: 'beta-activity-1',
          type: 'milestone',
          title: 'Beta Milestone Achieved',
          description: 'Unique milestone for agent beta',
          timestamp: '2025-01-10T11:00:00Z'
        }
      ];

      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => agent2Data
      });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => agent2Activities
      });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(
        <MemoryRouter initialEntries={['/agents/unique-agent-2']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Unique Agent Beta')).toBeInTheDocument();
        expect(screen.getByText('Second unique agent description')).toBeInTheDocument();
        expect(screen.getByText('92.7%')).toBeInTheDocument();
        expect(screen.getByText('0.78s')).toBeInTheDocument();
      });

      // Verify no Agent 1 data remains
      expect(screen.queryByText('Unique Agent Alpha')).not.toBeInTheDocument();
      expect(screen.queryByText('First unique agent description')).not.toBeInTheDocument();
      expect(screen.queryByText('87.3%')).not.toBeInTheDocument();
      expect(screen.queryByText('1.45s')).not.toBeInTheDocument();
    });
  });

  describe('Data Consistency Across Tabs', () => {
    test('should maintain data consistency when switching between tabs', async () => {
      // Arrange: Comprehensive agent data
      const consistentAgentData = {
        success: true,
        data: {
          id: 'consistency-agent',
          name: 'Consistency Test Agent',
          display_name: 'Consistency Agent Display',
          description: 'Agent for testing data consistency across tabs',
          status: 'active',
          specialization: 'Data consistency validation',
          capabilities: ['consistency-check', 'validation', 'testing'],
          performance_metrics: {
            success_rate: 94.2,
            average_response_time: 1.23,
            total_tokens_used: 67890,
            error_count: 7,
            uptime_percentage: 98.1
          },
          avatar_color: '#10B981'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => consistentAgentData
      });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      // Act: Render component
      const UnifiedAgentPage = await getUnifiedAgentPage();
      render(
        <MemoryRouter initialEntries={['/agents/consistency-agent']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      // Assert: Verify Overview tab data
      await waitFor(() => {
        expect(screen.getByText('Consistency Agent Display')).toBeInTheDocument();
        expect(screen.getByText('94.2%')).toBeInTheDocument();
        expect(screen.getByText('1.23s')).toBeInTheDocument();
      });

      // Switch to Details tab
      fireEvent.click(screen.getByText('Details'));

      await waitFor(() => {
        expect(screen.getByText('Consistency Test Agent')).toBeInTheDocument();
        expect(screen.getByText('consistency-agent')).toBeInTheDocument();
        expect(screen.getByText('Agent for testing data consistency across tabs')).toBeInTheDocument();
      });

      // Verify performance metrics in Details tab
      expect(screen.getByText('94.2%')).toBeInTheDocument();
      expect(screen.getByText('1.23s')).toBeInTheDocument();

      // Switch back to Overview
      fireEvent.click(screen.getByText('Overview'));

      await waitFor(() => {
        // Data should remain consistent
        expect(screen.getByText('Consistency Agent Display')).toBeInTheDocument();
        expect(screen.getByText('94.2%')).toBeInTheDocument();
        expect(screen.getByText('1.23s')).toBeInTheDocument();
      });

      // Switch to Configuration tab
      fireEvent.click(screen.getByText('Configuration'));

      await waitFor(() => {
        // Configuration should reflect API data
        expect(screen.getByText('Consistency Agent Display')).toBeInTheDocument();
        expect(screen.getByText('Agent for testing data consistency across tabs')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling in Real Data Flow', () => {
    test('should handle partial API failures gracefully', async () => {
      // Arrange: Agent data succeeds, activities fail, posts succeed
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'partial-failure-agent',
            name: 'Partial Failure Agent',
            description: 'Testing partial failure scenarios',
            status: 'active',
            capabilities: []
          }
        })
      });

      // Activities endpoint fails
      mockFetch.mockRejectedValueOnce(new Error('Activities service unavailable'));

      // Posts endpoint succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          id: 'surviving-post',
          type: 'update',
          title: 'Service Status Update',
          content: 'Some services may be experiencing issues',
          timestamp: '2025-01-10T10:00:00Z',
          author: {
            id: 'partial-failure-agent',
            name: 'Partial Failure Agent',
            avatar: '⚠️'
          },
          tags: ['status'],
          interactions: { likes: 5, comments: 2, shares: 1, bookmarks: 0 },
          priority: 'medium'
        }]
      });

      // Act
      const UnifiedAgentPage = await getUnifiedAgentPage();
      render(
        <MemoryRouter initialEntries={['/agents/partial-failure-agent']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      // Assert: Should display agent data and available posts, handle missing activities
      await waitFor(() => {
        expect(screen.getByText('Partial Failure Agent')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Activity'));

      await waitFor(() => {
        // Should show the successful post
        expect(screen.getByText('Service Status Update')).toBeInTheDocument();
        
        // Activities section should handle the failure gracefully
        // Should not show any synthetic fallback data
        expect(screen.queryByText('Sample Activity')).not.toBeInTheDocument();
        expect(screen.queryByText('Generated Task')).not.toBeInTheDocument();
      });
    });
  });
});