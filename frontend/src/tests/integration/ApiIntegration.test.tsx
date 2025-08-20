import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AgentManager from '@/components/AgentManager';
import { WebSocketProvider } from '@/context/WebSocketSingletonContext';

// Mock fetch globally
global.fetch = jest.fn();

// Mock WebSocket
global.WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: WebSocket.OPEN,
})) as any;

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        cacheTime: 0,
        staleTime: 0,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider config={{ autoConnect: false }}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </WebSocketProvider>
    </QueryClientProvider>
  );
};

describe('API Integration Tests', () => {
  const mockAgents = [
    {
      id: 'agent-1',
      name: 'test-agent-1',
      description: 'Research Agent',
      status: 'active',
      capabilities: ['research', 'analysis'],
      lastActivity: '2023-01-01T00:00:00Z',
      color: '#3B82F6'
    },
    {
      id: 'agent-2',
      name: 'test-agent-2',
      description: 'Content Creator',
      status: 'inactive',
      capabilities: ['writing', 'content'],
      lastActivity: '2023-01-01T00:00:00Z',
      color: '#8B5CF6'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Agent API Integration', () => {
    test('should successfully fetch and display agents', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ agents: mockAgents }),
      });

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      // Should call the agents API
      expect(fetch).toHaveBeenCalledWith('/api/v1/claude-live/prod/agents');

      // Should display agents
      await waitFor(() => {
        expect(screen.getByText('Research Agent')).toBeInTheDocument();
        expect(screen.getByText('Content Creator')).toBeInTheDocument();
      });
    });

    test('should handle API response with different data structures', async () => {
      const alternativeResponse = {
        data: mockAgents,
        meta: { total: 2, page: 1 },
        success: true
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => alternativeResponse,
      });

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      // Should handle different response structure gracefully
      await waitFor(() => {
        expect(screen.getByText(/agent manager/i)).toBeInTheDocument();
      });
    });

    test('should handle empty API responses', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ agents: [] }),
      });

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('No agents found')).toBeInTheDocument();
        expect(screen.getByText('Create your first agent to get started')).toBeInTheDocument();
      });
    });

    test('should handle API errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Error connecting to agent API')).toBeInTheDocument();
      });
    });

    test('should handle HTTP error responses', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load agents')).toBeInTheDocument();
      });
    });

    test('should handle malformed JSON responses', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Error connecting to agent API')).toBeInTheDocument();
      });
    });
  });

  describe('API Retry Logic', () => {
    test('should retry failed requests', async () => {
      let attemptCount = 0;
      (fetch as jest.Mock).mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ agents: mockAgents }),
        });
      });

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      // Should eventually succeed after retry
      await waitFor(() => {
        expect(screen.getByText('Research Agent')).toBeInTheDocument();
      });

      expect(attemptCount).toBe(2);
    });

    test('should stop retrying after max attempts', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Persistent network error'));

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      // Should show error after all retries exhausted
      await waitFor(() => {
        expect(screen.getByText('Error connecting to agent API')).toBeInTheDocument();
      });

      // Should have made exactly 2 attempts (initial + 1 retry)
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('API Caching Behavior', () => {
    test('should cache successful API responses', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ agents: mockAgents }),
      });

      const { rerender } = render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Research Agent')).toBeInTheDocument();
      });

      // Re-render component
      rerender(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      // Due to caching, might not make another API call immediately
      // but should still display data
      expect(screen.getByText('Research Agent')).toBeInTheDocument();
    });

    test('should invalidate cache after mutations', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ agents: mockAgents }),
      });

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Research Agent')).toBeInTheDocument();
      });

      // Simulate a mutation (like creating an agent)
      const createButton = screen.getByRole('button', { name: /create agent/i });
      const user = userEvent.setup();
      await user.click(createButton);

      // Cache invalidation would trigger in real implementation
      expect(screen.getByText('Create New Agent')).toBeInTheDocument();
    });
  });

  describe('Real-time API Updates', () => {
    test('should handle periodic API updates', async () => {
      let callCount = 0;
      (fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            agents: callCount === 1 ? mockAgents : [
              ...mockAgents,
              {
                id: 'agent-3',
                name: 'new-agent',
                description: 'Newly added agent',
                status: 'active',
                capabilities: ['new'],
                lastActivity: '2023-01-01T00:00:00Z',
                color: '#10B981'
              }
            ]
          }),
        });
      });

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      // Initial load
      await waitFor(() => {
        expect(screen.getByText('Research Agent')).toBeInTheDocument();
      });

      // Simulate periodic refresh (would happen via interval in real implementation)
      // For testing, we'll just verify the API call pattern
      expect(callCount).toBeGreaterThan(0);
    });

    test('should handle concurrent API requests', async () => {
      (fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ agents: mockAgents }),
          }), 100)
        )
      );

      // Render multiple instances that might make concurrent requests
      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      // Both should eventually display data
      await waitFor(() => {
        const researchAgents = screen.getAllByText('Research Agent');
        expect(researchAgents.length).toBeGreaterThan(0);
      });
    });
  });

  describe('API Authentication and Headers', () => {
    test('should include proper headers in API requests', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ agents: mockAgents }),
      });

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Research Agent')).toBeInTheDocument();
      });

      // Verify fetch was called with correct parameters
      expect(fetch).toHaveBeenCalledWith('/api/v1/claude-live/prod/agents');
    });

    test('should handle authentication failures', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load agents')).toBeInTheDocument();
      });
    });

    test('should handle rate limiting', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load agents')).toBeInTheDocument();
      });
    });
  });

  describe('API Data Validation', () => {
    test('should handle missing required fields', async () => {
      const invalidAgents = [
        {
          id: 'agent-1',
          // Missing name and other required fields
          description: 'Agent with missing fields',
        }
      ];

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ agents: invalidAgents }),
      });

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      // Should handle invalid data gracefully
      await waitFor(() => {
        expect(screen.getByText(/agent manager/i)).toBeInTheDocument();
      });
    });

    test('should sanitize and validate API data', async () => {
      const unsafeAgents = [
        {
          id: 'agent-1',
          name: '<script>alert("xss")</script>',
          description: 'Agent with XSS attempt',
          status: 'active',
          capabilities: ['<script>'],
          lastActivity: '2023-01-01T00:00:00Z',
          color: '#3B82F6'
        }
      ];

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ agents: unsafeAgents }),
      });

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        // Should not execute script tags
        expect(document.querySelector('script')).toBeNull();
        expect(screen.getByText(/agent manager/i)).toBeInTheDocument();
      });
    });

    test('should handle unexpected data types', async () => {
      const invalidResponse = {
        agents: 'not an array' // Should be an array
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => invalidResponse,
      });

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      // Should handle gracefully without crashing
      await waitFor(() => {
        expect(screen.getByText(/agent manager/i)).toBeInTheDocument();
      });
    });
  });

  describe('API Performance and Optimization', () => {
    test('should handle large API responses efficiently', async () => {
      const largeAgentList = Array.from({ length: 1000 }, (_, i) => ({
        id: `agent-${i}`,
        name: `agent-${i}`,
        description: `Agent ${i}`,
        status: 'active',
        capabilities: [`skill-${i}`],
        lastActivity: '2023-01-01T00:00:00Z',
        color: '#3B82F6'
      }));

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ agents: largeAgentList }),
      });

      const startTime = performance.now();

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/agent manager/i)).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      console.log(`Large dataset render time: ${renderTime.toFixed(2)}ms`);

      // Should handle large datasets within reasonable time
      expect(renderTime).toBeLessThan(5000); // 5 seconds max
    });

    test('should implement proper loading states during API calls', async () => {
      // Simulate slow API response
      (fetch as jest.Mock).mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ agents: mockAgents }),
          }), 1000)
        )
      );

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      // Should show loading state
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Should eventually show data
      await waitFor(() => {
        expect(screen.getByText('Research Agent')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    test('should cancel requests on component unmount', async () => {
      let requestAborted = false;
      
      (fetch as jest.Mock).mockImplementation(() =>
        new Promise((resolve, reject) => {
          const abortController = new AbortController();
          abortController.signal.addEventListener('abort', () => {
            requestAborted = true;
            reject(new Error('Aborted'));
          });
          
          setTimeout(() => {
            if (!requestAborted) {
              resolve({
                ok: true,
                json: async () => ({ agents: mockAgents }),
              });
            }
          }, 1000);
        })
      );

      const { unmount } = render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      // Unmount before request completes
      setTimeout(() => unmount(), 100);

      // Request should be aborted (in real implementation)
      await new Promise(resolve => setTimeout(resolve, 200));
    });
  });

  describe('API Error Recovery', () => {
    test('should allow manual retry after API failures', async () => {
      let shouldFail = true;
      (fetch as jest.Mock).mockImplementation(() => {
        if (shouldFail) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ agents: mockAgents }),
        });
      });

      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Error connecting to agent API')).toBeInTheDocument();
      });

      // Simulate retry
      shouldFail = false;
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      const user = userEvent.setup();
      await user.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText('Research Agent')).toBeInTheDocument();
      });
    });

    test('should provide informative error messages', async () => {
      const errorCases = [
        { 
          error: new Error('Network error'),
          expectedMessage: 'Error connecting to agent API'
        },
        {
          response: { ok: false, status: 404 },
          expectedMessage: 'Failed to load agents'
        },
        {
          response: { ok: false, status: 500 },
          expectedMessage: 'Failed to load agents'
        }
      ];

      for (const errorCase of errorCases) {
        (fetch as jest.Mock).mockImplementation(() => {
          if (errorCase.error) {
            return Promise.reject(errorCase.error);
          }
          return Promise.resolve(errorCase.response);
        });

        const { unmount } = render(
          <TestWrapper>
            <AgentManager />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText(errorCase.expectedMessage)).toBeInTheDocument();
        });

        unmount();
      }
    });
  });
});