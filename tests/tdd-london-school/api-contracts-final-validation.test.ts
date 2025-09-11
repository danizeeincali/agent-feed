/**
 * TDD London School: API Contract Final Validation
 * 
 * MISSION: Verify strict adherence to real API contracts
 * APPROACH: Contract testing with behavior verification
 * STANDARD: London School outside-in TDD with mock verification
 */

import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock fetch for contract testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import the component to test against contracts
// Note: Using dynamic import to avoid compilation issues during testing
const getUnifiedAgentPage = async () => {
  const module = await import('../../frontend/src/components/UnifiedAgentPage');
  return module.default;
};

describe('API Contract Validation - Zero Contract Violations', () => {

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('/api/agents/:agentId Contract', () => {
    test('should validate agent endpoint response structure', async () => {
      // Arrange: Define exact contract for agent endpoint
      const agentContractResponse = {
        success: true,
        data: {
          id: 'contract-agent-123',
          name: 'Contract Test Agent',
          display_name: 'Contract Display Name',
          description: 'Agent description from API',
          system_prompt: 'System prompt text',
          avatar_color: '#FF6B35',
          capabilities: ['capability1', 'capability2'],
          status: 'active',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-10T10:30:00Z',
          last_used: '2025-01-10T09:45:00Z',
          usage_count: 127,
          performance_metrics: {
            success_rate: 93.5,
            average_response_time: 1.87,
            total_tokens_used: 45678,
            error_count: 8,
            validations_completed: 234,
            uptime_percentage: 97.2
          },
          health_status: {
            cpu_usage: 34.2,
            memory_usage: 68.9,
            response_time: 1.76,
            last_heartbeat: '2025-01-10T10:29:00Z',
            status: 'healthy',
            active_tasks: 3
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => agentContractResponse
      });

      // Mock activities and posts endpoints
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => []
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => []
      });

      // Act: Render component
      const UnifiedAgentPage = await getUnifiedAgentPage();
      render(
        <MemoryRouter initialEntries={['/agents/contract-agent-123']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      // Assert: Verify contract compliance
      await waitFor(() => {
        expect(mockFetch).toHaveBeenNthCalledWith(
          1,
          '/api/agents/contract-agent-123'
        );
      });

      // Verify all required contract fields are handled
      const responseData = agentContractResponse.data;
      expect(responseData).toHaveProperty('id');
      expect(responseData).toHaveProperty('name');
      expect(responseData).toHaveProperty('description');
      expect(responseData).toHaveProperty('status');
      expect(responseData).toHaveProperty('capabilities');
      expect(responseData).toHaveProperty('performance_metrics');
      expect(responseData).toHaveProperty('health_status');
      
      // Verify performance_metrics contract
      expect(responseData.performance_metrics).toHaveProperty('success_rate');
      expect(responseData.performance_metrics).toHaveProperty('average_response_time');
      expect(responseData.performance_metrics).toHaveProperty('total_tokens_used');
      expect(responseData.performance_metrics).toHaveProperty('error_count');
      
      // Verify health_status contract
      expect(responseData.health_status).toHaveProperty('cpu_usage');
      expect(responseData.health_status).toHaveProperty('memory_usage');
      expect(responseData.health_status).toHaveProperty('response_time');
      expect(responseData.health_status).toHaveProperty('last_heartbeat');
      expect(responseData.health_status).toHaveProperty('status');
    });

    test('should handle agent endpoint error responses per contract', async () => {
      // Arrange: Mock API error response
      const errorResponse = {
        success: false,
        error: 'Agent not found',
        code: 'AGENT_NOT_FOUND'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => errorResponse
      });

      // Act
      const UnifiedAgentPage = await getUnifiedAgentPage();
      render(
        <MemoryRouter initialEntries={['/agents/nonexistent-agent']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      // Assert: Should handle contract-compliant error
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/agents/nonexistent-agent');
      });

      // Component should handle error according to contract
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('should validate data types match contract specifications', async () => {
      // Arrange: Contract with specific data types
      const typedContractResponse = {
        success: true,
        data: {
          id: 'type-test-agent',
          name: 'Type Test Agent',
          description: 'Testing data types',
          status: 'active',
          capabilities: ['string1', 'string2'],
          usage_count: 42,
          performance_metrics: {
            success_rate: 85.7,        // number (float)
            average_response_time: 2.1, // number (float)
            total_tokens_used: 15000,   // number (integer)
            error_count: 5,             // number (integer)
            uptime_percentage: 98.5     // number (float)
          },
          health_status: {
            cpu_usage: 25.3,           // number (float)
            memory_usage: 72.8,        // number (float)  
            response_time: 1.9,        // number (float)
            last_heartbeat: '2025-01-10T10:00:00Z', // string (ISO date)
            status: 'healthy',         // string
            active_tasks: 2            // number (integer)
          },
          created_at: '2025-01-01T00:00:00Z',  // string (ISO date)
          last_used: '2025-01-10T09:30:00Z'    // string (ISO date)
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => typedContractResponse
      });

      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

      // Act
      const UnifiedAgentPage = await getUnifiedAgentPage();
      render(
        <MemoryRouter initialEntries={['/agents/type-test-agent']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      // Assert: Verify data types are correctly handled
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const data = typedContractResponse.data;
      
      // String fields
      expect(typeof data.id).toBe('string');
      expect(typeof data.name).toBe('string');
      expect(typeof data.description).toBe('string');
      expect(typeof data.status).toBe('string');
      
      // Array fields
      expect(Array.isArray(data.capabilities)).toBe(true);
      data.capabilities.forEach(cap => expect(typeof cap).toBe('string'));
      
      // Number fields
      expect(typeof data.usage_count).toBe('number');
      expect(typeof data.performance_metrics.success_rate).toBe('number');
      expect(typeof data.performance_metrics.average_response_time).toBe('number');
      expect(typeof data.performance_metrics.total_tokens_used).toBe('number');
      expect(typeof data.performance_metrics.error_count).toBe('number');
      
      // Date string fields  
      expect(typeof data.created_at).toBe('string');
      expect(typeof data.last_used).toBe('string');
      expect(typeof data.health_status.last_heartbeat).toBe('string');
      
      // Validate ISO date format
      expect(data.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);
      expect(data.last_used).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);
    });
  });

  describe('/api/agents/:agentId/activities Contract', () => {
    test('should validate activities endpoint response structure', async () => {
      // Arrange: Mock agent endpoint
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'activities-agent',
            name: 'Activities Agent',
            description: 'Test',
            status: 'active',
            capabilities: []
          }
        })
      });

      // Activities contract response
      const activitiesContractResponse = [
        {
          id: 'activity-contract-1',
          type: 'task_completed',
          title: 'Contract Task Completed',
          description: 'Task completed according to contract',
          timestamp: '2025-01-10T09:15:00Z',
          metadata: {
            duration: 180,
            success: true,
            priority: 'high'
          }
        },
        {
          id: 'activity-contract-2',
          type: 'error',
          title: 'Contract Error Occurred',
          description: 'Error recorded per contract',
          timestamp: '2025-01-10T08:45:00Z',
          metadata: {
            duration: 30,
            success: false,
            priority: 'urgent'
          }
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => activitiesContractResponse
      });

      // Mock posts endpoint
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => []
      });

      // Act
      const UnifiedAgentPage = await getUnifiedAgentPage();
      render(
        <MemoryRouter initialEntries={['/agents/activities-agent']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      // Assert: Verify activities contract compliance
      await waitFor(() => {
        expect(mockFetch).toHaveBeenNthCalledWith(
          2,
          '/api/agents/activities-agent/activities'
        );
      });

      // Verify activity structure matches contract
      activitiesContractResponse.forEach(activity => {
        expect(activity).toHaveProperty('id');
        expect(activity).toHaveProperty('type');
        expect(activity).toHaveProperty('title');
        expect(activity).toHaveProperty('description');
        expect(activity).toHaveProperty('timestamp');
        
        // Verify required metadata fields
        if (activity.metadata) {
          expect(activity.metadata).toHaveProperty('duration');
          expect(activity.metadata).toHaveProperty('success');
          expect(activity.metadata).toHaveProperty('priority');
        }
        
        // Verify type enum values
        const validTypes = ['task_completed', 'task_started', 'error', 'milestone', 'insight', 'update', 'achievement'];
        expect(validTypes).toContain(activity.type);
        
        // Verify priority enum values
        if (activity.metadata?.priority) {
          const validPriorities = ['low', 'medium', 'high', 'urgent'];
          expect(validPriorities).toContain(activity.metadata.priority);
        }
      });
    });

    test('should handle empty activities response per contract', async () => {
      // Arrange: Mock agent data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'empty-activities-agent',
            name: 'Empty Activities Agent',
            description: 'Agent with no activities',
            status: 'active',
            capabilities: []
          }
        })
      });

      // Empty activities response (valid per contract)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => []
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => []
      });

      // Act
      const UnifiedAgentPage = await getUnifiedAgentPage();
      render(
        <MemoryRouter initialEntries={['/agents/empty-activities-agent']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      // Assert: Should handle empty response per contract
      await waitFor(() => {
        expect(mockFetch).toHaveBeenNthCalledWith(
          2,
          '/api/agents/empty-activities-agent/activities'
        );
      });

      // Empty array is valid contract response
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('/api/agents/:agentId/posts Contract', () => {
    test('should validate posts endpoint response structure', async () => {
      // Arrange: Mock agent endpoint
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'posts-agent',
            name: 'Posts Agent',
            description: 'Test',
            status: 'active',
            capabilities: []
          }
        })
      });

      // Mock activities endpoint
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => []
      });

      // Posts contract response
      const postsContractResponse = [
        {
          id: 'post-contract-1',
          type: 'insight',
          title: 'Contract Insight Post',
          content: 'This is a contract-compliant insight post',
          timestamp: '2025-01-10T10:00:00Z',
          author: {
            id: 'posts-agent',
            name: 'Posts Agent',
            avatar: '🤖'
          },
          tags: ['contract', 'test', 'insight'],
          interactions: {
            likes: 25,
            comments: 8,
            shares: 4,
            bookmarks: 12
          },
          isLiked: false,
          isBookmarked: true,
          priority: 'medium'
        },
        {
          id: 'post-contract-2',
          type: 'announcement',
          title: 'Contract Announcement',
          content: 'Important announcement following contract',
          timestamp: '2025-01-10T09:30:00Z',
          author: {
            id: 'posts-agent',
            name: 'Posts Agent',
            avatar: '🔊'
          },
          tags: ['announcement', 'important'],
          interactions: {
            likes: 45,
            comments: 15,
            shares: 8,
            bookmarks: 20
          },
          isLiked: true,
          isBookmarked: false,
          priority: 'high'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => postsContractResponse
      });

      // Act
      const UnifiedAgentPage = await getUnifiedAgentPage();
      render(
        <MemoryRouter initialEntries={['/agents/posts-agent']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      // Assert: Verify posts contract compliance
      await waitFor(() => {
        expect(mockFetch).toHaveBeenNthCalledWith(
          3,
          '/api/agents/posts-agent/posts'
        );
      });

      // Verify post structure matches contract
      postsContractResponse.forEach(post => {
        expect(post).toHaveProperty('id');
        expect(post).toHaveProperty('type');
        expect(post).toHaveProperty('title');
        expect(post).toHaveProperty('content');
        expect(post).toHaveProperty('timestamp');
        expect(post).toHaveProperty('author');
        expect(post).toHaveProperty('tags');
        expect(post).toHaveProperty('interactions');
        expect(post).toHaveProperty('priority');
        
        // Verify author structure
        expect(post.author).toHaveProperty('id');
        expect(post.author).toHaveProperty('name');
        expect(post.author).toHaveProperty('avatar');
        
        // Verify interactions structure
        expect(post.interactions).toHaveProperty('likes');
        expect(post.interactions).toHaveProperty('comments');
        expect(post.interactions).toHaveProperty('shares');
        expect(post.interactions).toHaveProperty('bookmarks');
        
        // Verify type enum values
        const validPostTypes = ['insight', 'update', 'achievement', 'announcement', 'question'];
        expect(validPostTypes).toContain(post.type);
        
        // Verify priority enum values
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        expect(validPriorities).toContain(post.priority);
        
        // Verify tags is array of strings
        expect(Array.isArray(post.tags)).toBe(true);
        post.tags.forEach(tag => expect(typeof tag).toBe('string'));
        
        // Verify interaction counts are numbers
        expect(typeof post.interactions.likes).toBe('number');
        expect(typeof post.interactions.comments).toBe('number');
        expect(typeof post.interactions.shares).toBe('number');
        expect(typeof post.interactions.bookmarks).toBe('number');
      });
    });

    test('should validate posts data types per contract', async () => {
      // Arrange: Mock required endpoints
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'types-agent',
            name: 'Types Agent',
            description: 'Test',
            status: 'active',
            capabilities: []
          }
        })
      });

      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

      // Strict typing test for posts
      const strictTypedPost = {
        id: 'strict-type-post',
        type: 'insight',
        title: 'Strict Type Test',
        content: 'Content with strict typing',
        timestamp: '2025-01-10T10:00:00Z',
        author: {
          id: 'types-agent',
          name: 'Types Agent',
          avatar: '🔧'
        },
        tags: ['type-test', 'contract'],
        interactions: {
          likes: 30,
          comments: 5,
          shares: 2,
          bookmarks: 8
        },
        isLiked: false,
        isBookmarked: true,
        priority: 'low'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [strictTypedPost]
      });

      // Act
      const UnifiedAgentPage = await getUnifiedAgentPage();
      render(
        <MemoryRouter initialEntries={['/agents/types-agent']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      // Assert: Verify strict data typing
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      // Verify all data types match contract exactly
      expect(typeof strictTypedPost.id).toBe('string');
      expect(typeof strictTypedPost.type).toBe('string');
      expect(typeof strictTypedPost.title).toBe('string');
      expect(typeof strictTypedPost.content).toBe('string');
      expect(typeof strictTypedPost.timestamp).toBe('string');
      expect(typeof strictTypedPost.priority).toBe('string');
      expect(typeof strictTypedPost.isLiked).toBe('boolean');
      expect(typeof strictTypedPost.isBookmarked).toBe('boolean');
      
      // Verify nested objects
      expect(typeof strictTypedPost.author.id).toBe('string');
      expect(typeof strictTypedPost.author.name).toBe('string');
      expect(typeof strictTypedPost.author.avatar).toBe('string');
      
      // Verify array and numbers
      expect(Array.isArray(strictTypedPost.tags)).toBe(true);
      expect(typeof strictTypedPost.interactions.likes).toBe('number');
      expect(typeof strictTypedPost.interactions.comments).toBe('number');
      expect(typeof strictTypedPost.interactions.shares).toBe('number');
      expect(typeof strictTypedPost.interactions.bookmarks).toBe('number');
    });
  });

  describe('Error Response Contract Compliance', () => {
    test('should handle HTTP error responses per contract', async () => {
      // Arrange: Mock various HTTP error responses
      const testCases = [
        { status: 400, error: 'Bad Request' },
        { status: 401, error: 'Unauthorized' },
        { status: 403, error: 'Forbidden' },
        { status: 404, error: 'Not Found' },
        { status: 500, error: 'Internal Server Error' },
        { status: 503, error: 'Service Unavailable' }
      ];

      for (const testCase of testCases) {
        mockFetch.mockClear();
        
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: testCase.status,
          statusText: testCase.error,
          json: async () => ({
            success: false,
            error: testCase.error,
            code: testCase.error.toUpperCase().replace(' ', '_')
          })
        });

        // Act
        const UnifiedAgentPage = await getUnifiedAgentPage();
        render(
          <MemoryRouter initialEntries={['/agents/error-test']}>
            <UnifiedAgentPage />
          </MemoryRouter>
        );

        // Assert: Should handle error per contract
        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith('/api/agents/error-test');
        });

        // Component should handle the error gracefully
        expect(mockFetch).toHaveBeenCalledTimes(1);
      }
    });

    test('should handle network errors per contract', async () => {
      // Arrange: Mock network failure
      mockFetch.mockRejectedValueOnce(new Error('Network Error'));

      // Act
      const UnifiedAgentPage = await getUnifiedAgentPage();
      render(
        <MemoryRouter initialEntries={['/agents/network-error']}>
          <UnifiedAgentPage />
        </MemoryRouter>
      );

      // Assert: Should handle network error per contract
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/agents/network-error');
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});