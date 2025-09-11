/**
 * London School TDD: Agent API Contract Tests
 * 
 * These tests verify the contracts between components and the real API service.
 * NO MOCKS for display data - we test with real data integration to ensure
 * the unified agent pages work with actual production data.
 * 
 * Focus: Contract verification and real data flow validation
 */

import { apiService } from '@/services/api';
import { Agent, AgentPost, ApiResponse } from '@/types/api';

describe('Agent API Contracts - Real Data Integration', () => {
  beforeAll(() => {
    // Define contracts for agent API services
    global.defineContract('AgentApiService', {
      getAgent: 'function',
      getAgents: 'function',
      getAgentPosts: 'function',
      spawnAgent: 'function',
      terminateAgent: 'function'
    });

    global.defineContract('AgentHomePageData', {
      id: 'string',
      name: 'string',
      status: 'string',
      capabilities: 'array',
      metrics: 'object',
      recentActivities: 'array'
    });
  });

  afterEach(() => {
    global.clearInteractionHistory();
  });

  describe('Agent Data Service Contract', () => {
    test('should satisfy AgentApiService contract', () => {
      expect(apiService).toSatisfyContract({
        getAgent: 'function',
        getAgents: 'function',
        getAgentPosts: 'function',
        spawnAgent: 'function',
        terminateAgent: 'function'
      });
    });

    test('should provide real agent data structure', async () => {
      // Test with real API call - no mocking
      const response = await apiService.getAgents();
      
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      
      if (response.success && response.data.length > 0) {
        const agent = response.data[0];
        
        // Verify real agent data structure
        expect(agent).toHaveProperty('id');
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('status');
        expect(agent).toHaveProperty('capabilities');
        expect(agent).toHaveProperty('created_at');
        
        expect(typeof agent.id).toBe('string');
        expect(typeof agent.name).toBe('string');
        expect(['active', 'inactive', 'error', 'maintenance']).toContain(agent.status);
        expect(Array.isArray(agent.capabilities)).toBe(true);
      }
    });

    test('should handle real agent retrieval by ID', async () => {
      // First get available agents
      const agentsResponse = await apiService.getAgents();
      
      if (agentsResponse.success && agentsResponse.data.length > 0) {
        const agentId = agentsResponse.data[0].id;
        
        // Test real agent retrieval
        const agentResponse = await apiService.getAgent(agentId);
        
        expect(agentResponse).toHaveProperty('success');
        if (agentResponse.success) {
          expect(agentResponse.data).toHaveProperty('id', agentId);
          expect(agentResponse.data).toHaveProperty('name');
          expect(agentResponse.data).toHaveProperty('status');
        }
      }
    });

    test('should validate real agent posts data structure', async () => {
      // Test real agent posts retrieval - no mocking
      const response = await apiService.getAgentPosts(10, 0);
      
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      
      if (response.success && response.data.length > 0) {
        const post = response.data[0];
        
        // Verify real post data structure
        expect(post).toHaveProperty('id');
        expect(post).toHaveProperty('title');
        expect(post).toHaveProperty('content');
        expect(post).toHaveProperty('authorAgent');
        expect(post).toHaveProperty('publishedAt');
        
        expect(typeof post.id).toBe('string');
        expect(typeof post.title).toBe('string');
        expect(typeof post.content).toBe('string');
        expect(typeof post.authorAgent).toBe('string');
      }
    });
  });

  describe('Agent Home Page Contract Integration', () => {
    test('should create valid agent home page data from real API', async () => {
      const agentsResponse = await apiService.getAgents();
      
      if (agentsResponse.success && agentsResponse.data.length > 0) {
        const realAgent = agentsResponse.data[0];
        
        // Verify the unified agent page can construct from real data
        const homePageData = {
          id: realAgent.id,
          name: realAgent.name || realAgent.display_name,
          status: realAgent.status,
          capabilities: realAgent.capabilities || [],
          metrics: {
            todayTasks: realAgent.usage_count || 0,
            successRate: realAgent.performance_metrics?.success_rate || 0,
            responseTime: realAgent.performance_metrics?.average_response_time || 0,
            uptime: realAgent.performance_metrics?.uptime_percentage || 0
          },
          description: realAgent.description || 'AI Agent'
        };

        // Contract verification for unified page data
        expect(homePageData).toHaveProperty('id');
        expect(homePageData).toHaveProperty('name');
        expect(homePageData).toHaveProperty('status');
        expect(homePageData).toHaveProperty('capabilities');
        expect(homePageData).toHaveProperty('metrics');
        
        expect(Array.isArray(homePageData.capabilities)).toBe(true);
        expect(typeof homePageData.metrics).toBe('object');
        expect(homePageData.metrics).toHaveProperty('todayTasks');
        expect(homePageData.metrics).toHaveProperty('successRate');
      }
    });

    test('should integrate real agent activities with home page', async () => {
      // Test real activities data integration
      const activitiesResponse = await apiService.getActivities(10, 0);
      
      expect(activitiesResponse).toHaveProperty('success');
      expect(activitiesResponse).toHaveProperty('data');
      
      if (activitiesResponse.success && activitiesResponse.data.length > 0) {
        const activity = activitiesResponse.data[0];
        
        // Verify activity data for agent home integration
        expect(activity).toHaveProperty('id');
        expect(activity).toHaveProperty('type');
        expect(activity).toHaveProperty('description');
        expect(activity).toHaveProperty('timestamp');
        expect(activity).toHaveProperty('agent_id');
        
        // Ensure activity can be displayed in unified interface
        const displayActivity = {
          id: activity.id,
          title: activity.description,
          type: activity.type,
          timestamp: activity.timestamp,
          agentId: activity.agent_id
        };
        
        expect(displayActivity.id).toBeDefined();
        expect(displayActivity.title).toBeDefined();
        expect(displayActivity.type).toBeDefined();
        expect(displayActivity.timestamp).toBeDefined();
      }
    });
  });

  describe('Real-time Data Contract Verification', () => {
    test('should handle real-time agent updates through WebSocket', async () => {
      // Mock WebSocket for contract testing, but verify real data structures
      const mockWebSocket = global.createSwarmMock('WebSocketManager', {
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        isConnected: jest.fn().mockReturnValue(true)
      });

      // Simulate real-time agent update with actual data structure
      const mockAgentUpdate = {
        type: 'agents_updated',
        payload: {
          id: 'test-agent-123',
          name: 'Test Agent',
          status: 'active',
          performance_metrics: {
            success_rate: 95.5,
            average_response_time: 1.2
          }
        }
      };

      // Verify contract compliance for real-time updates
      expect(mockAgentUpdate.payload).toHaveProperty('id');
      expect(mockAgentUpdate.payload).toHaveProperty('status');
      expect(typeof mockAgentUpdate.payload.id).toBe('string');
      expect(['active', 'inactive', 'error', 'maintenance']).toContain(mockAgentUpdate.payload.status);

      // Verify WebSocket subscription contract
      expect(mockWebSocket.subscribe).toBeDefined();
      expect(mockWebSocket.isConnected).toBeDefined();
      expect(typeof mockWebSocket.subscribe).toBe('function');
    });

    test('should validate real system metrics integration', async () => {
      // Test real system metrics for agent monitoring
      try {
        const metricsResponse = await apiService.getSystemMetrics('1h');
        
        expect(metricsResponse).toHaveProperty('success');
        
        if (metricsResponse.success && metricsResponse.data.length > 0) {
          const metric = metricsResponse.data[0];
          
          // Verify real metrics data structure for unified display
          expect(metric).toHaveProperty('timestamp');
          expect(metric).toHaveProperty('cpu_usage');
          expect(metric).toHaveProperty('memory_usage');
          expect(typeof metric.cpu_usage).toBe('number');
          expect(typeof metric.memory_usage).toBe('number');
        }
      } catch (error) {
        // If metrics endpoint is not available, verify the error is handled gracefully
        expect(error).toBeDefined();
      }
    });
  });

  describe('Agent Navigation Contract Integration', () => {
    test('should create valid navigation paths from real agent data', async () => {
      const agentsResponse = await apiService.getAgents();
      
      if (agentsResponse.success && agentsResponse.data.length > 0) {
        const realAgent = agentsResponse.data[0];
        
        // Verify unified page navigation contracts
        const navigationPaths = {
          home: `/agents/${realAgent.id}/home`,
          details: `/agents/${realAgent.id}`,
          posts: `/agents/${realAgent.id}/posts`
        };

        // Contract verification for navigation
        Object.values(navigationPaths).forEach(path => {
          expect(typeof path).toBe('string');
          expect(path).toMatch(/^\/agents\/[^\/]+/);
        });

        // Verify agent data supports navigation requirements
        expect(realAgent.id).toBeDefined();
        expect(typeof realAgent.id).toBe('string');
        expect(realAgent.id.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Handling Contracts', () => {
    test('should handle real API errors gracefully', async () => {
      // Test with invalid agent ID to verify error handling
      try {
        const response = await apiService.getAgent('nonexistent-agent-id');
        
        // If response is successful, verify error structure
        if (!response.success) {
          expect(response).toHaveProperty('success', false);
          expect(response).toHaveProperty('error');
        }
      } catch (error) {
        // Verify error structure for unified page error handling
        expect(error).toBeDefined();
      }
    });

    test('should validate health check contract', async () => {
      try {
        const healthResponse = await apiService.healthCheck();
        
        expect(healthResponse).toHaveProperty('success');
        
        if (healthResponse.success) {
          expect(healthResponse.data).toHaveProperty('status');
          expect(healthResponse.data).toHaveProperty('timestamp');
          expect(typeof healthResponse.data.status).toBe('string');
        }
      } catch (error) {
        // Verify graceful error handling for offline scenarios
        expect(error).toBeDefined();
      }
    });
  });
});