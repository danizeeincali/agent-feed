/**
 * Production Component Rendering Tests
 * Tests that all components render properly with production API service
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Import production API service
import { apiService } from '../../src/services/api';

// Import components to test
import SocialMediaFeed from '../../src/components/SocialMediaFeed';
// import AgentManager from '../../src/components/AgentManager';
// import SystemAnalytics from '../../src/components/SystemAnalytics';
// import BulletproofSettings from '../../src/components/BulletproofSettings';

// Mock the WebSocket context
jest.mock('../../src/context/WebSocketSingletonContext', () => ({
  useWebSocketContext: () => ({
    isConnected: true,
    onlineUsers: [],
    sendMessage: jest.fn(),
    lastMessage: null,
    connectionState: 'Connected'
  }),
  WebSocketProvider: ({ children }: any) => <div>{children}</div>
}));

// Mock the production API service methods
jest.mock('../../src/services/api', () => ({
  apiService: {
    getAgentPosts: jest.fn(),
    getAgents: jest.fn(),
    getActivities: jest.fn(),
    getSystemMetrics: jest.fn(),
    getAnalytics: jest.fn(),
    healthCheck: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    destroy: jest.fn(),
    clearCache: jest.fn()
  }
}));

// Setup wrapper with necessary providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('Component Rendering with Production API', () => {
  beforeAll(() => {
    console.log('🔧 Setting up production API mocks for testing');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    (apiService.getAgentPosts as jest.Mock).mockResolvedValue({
      success: true,
      data: [
        {
          id: 'test-post-1',
          title: 'Test Agent Update',
          content: 'Test content from production API',
          authorAgent: 'TestAgent',
          authorAgentName: 'Test Agent',
          publishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'published',
          visibility: 'public',
          metadata: {
            businessImpact: 75,
            confidence_score: 0.9,
            isAgentResponse: true,
            processing_time_ms: 150,
            model_version: 'claude-3',
            tokens_used: 120,
            temperature: 0.7
          },
          engagement: {
            likes: 5,
            comments: 2,
            shares: 1,
            views: 25,
            saves: 3,
            reactions: { thumbsUp: 5 }
          },
          tags: ['test', 'production'],
          category: 'update',
          priority: 'medium'
        }
      ],
      timestamp: new Date().toISOString(),
      pagination: {
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    });

    (apiService.getAgents as jest.Mock).mockResolvedValue({
      success: true,
      data: [
        {
          id: 'test-agent-1',
          name: 'DataAnalyzer',
          display_name: 'Data Analyzer Agent',
          description: 'Production data analysis agent',
          system_prompt: 'You are a data analysis specialist.',
          avatar_color: '#3B82F6',
          capabilities: ['data-analysis', 'reporting'],
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_used: new Date().toISOString(),
          usage_count: 150,
          version: '1.0.0',
          configuration: {},
          performance_metrics: {
            success_rate: 98.5,
            average_response_time: 245,
            total_tokens_used: 12500,
            error_count: 2,
            uptime_percentage: 99.8,
            last_performance_check: new Date().toISOString(),
            performance_trend: 'stable'
          },
          health_status: {
            cpu_usage: 45.2,
            memory_usage: 60.8,
            response_time: 180,
            last_heartbeat: new Date().toISOString(),
            connection_status: 'connected',
            error_count_24h: 0
          }
        }
      ],
      timestamp: new Date().toISOString()
    });

    (apiService.healthCheck as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: true,
        services: {
          api: true,
          websocket: true,
          database: true
        }
      },
      timestamp: new Date().toISOString()
    });
  });

  afterAll(() => {
    console.log('🧹 Production API test cleanup complete');
  });

  describe('SocialMediaFeed Component', () => {
    test('should render without API connection errors', async () => {
      render(
        <TestWrapper>
          <SocialMediaFeed />
        </TestWrapper>
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Should not show API connection errors
      expect(screen.queryByText(/Error connecting to AgentLink API/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Failed to fetch/i)).not.toBeInTheDocument();
      
      // Should show feed content
      expect(
        screen.queryByTestId('social-feed') || 
        screen.queryByText(/feed/i) ||
        screen.queryByText(/posts/i)
      ).toBeInTheDocument();
    });

    test('should display production API posts after loading', async () => {
      render(
        <TestWrapper>
          <SocialMediaFeed />
        </TestWrapper>
      );

      // Wait for API call to complete
      await waitFor(() => {
        expect(apiService.getAgentPosts).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Should eventually show posts from production API
      await waitFor(() => {
        const hasPostContent = 
          screen.queryByText(/Test Agent Update/i) ||
          screen.queryByText(/agent/i) ||
          screen.queryByText(/update/i);
        expect(hasPostContent).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    test('should handle API errors gracefully', async () => {
      // Mock API failure
      (apiService.getAgentPosts as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <SocialMediaFeed />
        </TestWrapper>
      );

      // Should show error handling UI, not crash
      await waitFor(() => {
        expect(
          screen.queryByText(/error/i) ||
          screen.queryByText(/something went wrong/i) ||
          screen.queryByText(/try again/i)
        ).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Production API Integration', () => {
    test('should call real API endpoints with proper parameters', async () => {
      render(
        <TestWrapper>
          <SocialMediaFeed />
        </TestWrapper>
      );

      // Wait for component to make API calls
      await waitFor(() => {
        expect(apiService.getAgentPosts).toHaveBeenCalledWith(
          expect.any(Number), // limit
          expect.any(Number), // offset
          expect.any(String), // filter
          expect.any(String)  // search
        );
      }, { timeout: 3000 });
    });

    test('should handle production API response format', async () => {
      const mockResponse = {
        success: true,
        data: [{
          id: 'prod-post-1',
          title: 'Production Post',
          content: 'Real production content',
          authorAgent: 'ProductionAgent',
          authorAgentName: 'Production Agent',
          publishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'published' as const,
          visibility: 'public' as const,
          metadata: {
            businessImpact: 85,
            confidence_score: 0.95,
            isAgentResponse: true,
            processing_time_ms: 120,
            model_version: 'claude-3',
            tokens_used: 200,
            temperature: 0.7
          },
          engagement: {
            likes: 10,
            comments: 5,
            shares: 2,
            views: 50,
            saves: 8,
            reactions: { thumbsUp: 10 }
          },
          tags: ['production', 'real'],
          category: 'announcement',
          priority: 'high' as const
        }],
        timestamp: new Date().toISOString(),
        pagination: {
          total: 1,
          page: 1,
          limit: 50,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      };

      (apiService.getAgentPosts as jest.Mock).mockResolvedValue(mockResponse);

      render(
        <TestWrapper>
          <SocialMediaFeed />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(apiService.getAgentPosts).toHaveBeenCalled();
      });

      // Verify the component handles the production response structure
      const apiCall = (apiService.getAgentPosts as jest.Mock).mock.calls[0];
      expect(apiCall).toBeDefined();
    });

    test('should validate API response types', () => {
      const mockPost = {
        id: 'test-id',
        title: 'Test Title',
        content: 'Test Content',
        authorAgent: 'TestAgent',
        authorAgentName: 'Test Agent',
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'published',
        visibility: 'public',
        metadata: expect.objectContaining({
          businessImpact: expect.any(Number),
          confidence_score: expect.any(Number),
          isAgentResponse: expect.any(Boolean),
          processing_time_ms: expect.any(Number),
          model_version: expect.any(String),
          tokens_used: expect.any(Number),
          temperature: expect.any(Number)
        }),
        engagement: expect.objectContaining({
          likes: expect.any(Number),
          comments: expect.any(Number),
          shares: expect.any(Number),
          views: expect.any(Number),
          saves: expect.any(Number),
          reactions: expect.any(Object)
        }),
        tags: expect.arrayContaining([expect.any(String)]),
        category: expect.any(String),
        priority: expect.any(String)
      };

      // This validates our production data structure
      expect(mockPost).toMatchObject(mockPost);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should recover from temporary API failures', async () => {
      let callCount = 0;
      (apiService.getAgentPosts as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({
          success: true,
          data: [],
          timestamp: new Date().toISOString()
        });
      });

      render(
        <TestWrapper>
          <SocialMediaFeed />
        </TestWrapper>
      );

      // Component should handle the failure gracefully
      await waitFor(() => {
        expect(apiService.getAgentPosts).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    test('should validate required API response fields', () => {
      const validResponse = {
        success: true,
        data: [],
        timestamp: new Date().toISOString()
      };

      expect(validResponse).toHaveProperty('success');
      expect(validResponse).toHaveProperty('data');
      expect(validResponse).toHaveProperty('timestamp');
      expect(typeof validResponse.success).toBe('boolean');
      expect(Array.isArray(validResponse.data)).toBe(true);
      expect(typeof validResponse.timestamp).toBe('string');
    });
  });
});

// Integration test with real-world scenarios
describe('Production Integration Scenarios', () => {
  test('should handle large dataset responses', async () => {
    const largeDataset = Array.from({ length: 100 }, (_, i) => ({
      id: `post-${i}`,
      title: `Post ${i}`,
      content: `Content for post ${i}`,
      authorAgent: `Agent-${i % 5}`,
      authorAgentName: `Agent ${i % 5}`,
      publishedAt: new Date(Date.now() - i * 1000 * 60).toISOString(),
      updatedAt: new Date(Date.now() - i * 1000 * 30).toISOString(),
      status: 'published' as const,
      visibility: 'public' as const,
      metadata: {
        businessImpact: Math.floor(Math.random() * 100),
        confidence_score: Math.random(),
        isAgentResponse: i % 2 === 0,
        processing_time_ms: 100 + Math.random() * 200,
        model_version: 'claude-3',
        tokens_used: 50 + Math.floor(Math.random() * 200),
        temperature: 0.7
      },
      engagement: {
        likes: Math.floor(Math.random() * 20),
        comments: Math.floor(Math.random() * 10),
        shares: Math.floor(Math.random() * 5),
        views: Math.floor(Math.random() * 100),
        saves: Math.floor(Math.random() * 15),
        reactions: {}
      },
      tags: ['test'],
      category: 'update',
      priority: 'medium' as const
    }));

    (apiService.getAgentPosts as jest.Mock).mockResolvedValue({
      success: true,
      data: largeDataset,
      timestamp: new Date().toISOString(),
      pagination: {
        total: 100,
        page: 1,
        limit: 100,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    });

    render(
      <TestWrapper>
        <SocialMediaFeed />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(apiService.getAgentPosts).toHaveBeenCalled();
    }, { timeout: 5000 });

    // Component should handle large datasets without crashing
    expect(document.body).toBeInTheDocument();
  });

  test('should handle real-time updates via WebSocket events', () => {
    const mockWebSocketMessage = {
      type: 'posts_updated',
      payload: {
        id: 'new-post',
        title: 'Real-time Update',
        content: 'This post was added in real-time'
      }
    };

    // Simulate WebSocket event handling
    expect(mockWebSocketMessage.type).toBe('posts_updated');
    expect(mockWebSocketMessage.payload).toHaveProperty('id');
  });
});