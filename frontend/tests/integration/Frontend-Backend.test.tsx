import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RealSocialMediaFeed } from '../../src/components/RealSocialMediaFeed';
import { apiService } from '../../src/services/api';

// Integration tests with real API endpoints (using test data)
describe('Frontend-Backend Integration', () => {
  let originalFetch: any;
  let mockWebSocket: any;

  beforeEach(() => {
    // Mock fetch for real API calls
    originalFetch = global.fetch;
    global.fetch = jest.fn();
    
    // Mock WebSocket
    mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
      readyState: WebSocket.OPEN
    };
    (global as any).WebSocket = jest.fn(() => mockWebSocket);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('Real API Endpoint Integration', () => {
    it('should make correct API calls to get agent posts', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            id: 'integration-post-1',
            title: 'Integration Test Post',
            content: 'Testing real API integration',
            authorAgent: 'integration-agent',
            publishedAt: new Date().toISOString(),
            engagement: {
              likes: 1,
              comments: 0,
              stars: { average: 4.0, count: 1 },
              isSaved: false,
              userRating: 0
            },
            tags: ['integration'],
            metadata: {
              businessImpact: 75,
              isAgentResponse: false
            }
          }
        ],
        total: 1
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/v1/agent-posts?limit=50&offset=0&filter=all&search=&sortBy=published_at&sortOrder=DESC',
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            })
          })
        );
      });
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load posts/i)).toBeInTheDocument();
      });
    });

    it('should make correct API calls for filtered posts', async () => {
      const mockInitialResponse = {
        success: true,
        data: [],
        total: 0
      };

      const mockFilterData = {
        agents: ['test-agent'],
        hashtags: ['test']
      };

      const mockFilteredResponse = {
        success: true,
        data: [
          {
            id: 'filtered-post-1',
            title: 'Filtered Post',
            content: 'This matches the filter',
            authorAgent: 'test-agent',
            publishedAt: new Date().toISOString(),
            engagement: {
              likes: 2,
              comments: 1,
              stars: { average: 4.5, count: 3 },
              isSaved: true,
              userRating: 4
            },
            tags: ['test'],
            metadata: {
              businessImpact: 85,
              isAgentResponse: false
            }
          }
        ],
        total: 1
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockInitialResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockFilterData
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockFilteredResponse
        });

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        const filterButton = screen.getByRole('button', { name: /All Posts/ });
        fireEvent.click(filterButton);
      });

      await waitFor(() => {
        const agentFilter = screen.getByText('By Agent');
        fireEvent.click(agentFilter);
      });

      await waitFor(() => {
        const testAgent = screen.getByText('test-agent');
        fireEvent.click(testAgent);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/v1/agent-posts/filtered?limit=50&offset=0&filterType=agent&agent=test-agent',
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            })
          })
        );
      });
    });

    it('should make correct API calls for post interactions', async () => {
      const mockPostsResponse = {
        success: true,
        data: [
          {
            id: 'interaction-post-1',
            title: 'Interactive Post',
            content: 'Test post interactions',
            authorAgent: 'interaction-agent',
            publishedAt: new Date().toISOString(),
            engagement: {
              likes: 5,
              comments: 2,
              stars: { average: 4.0, count: 5 },
              isSaved: false,
              userRating: 0
            },
            tags: ['interaction'],
            metadata: {
              businessImpact: 80,
              isAgentResponse: false
            }
          }
        ],
        total: 1
      };

      const mockEngagementResponse = {
        success: true,
        data: { ...mockPostsResponse.data[0], engagement: { ...mockPostsResponse.data[0].engagement, likes: 6 }}
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPostsResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ agents: [], hashtags: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEngagementResponse
        });

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Interactive Post')).toBeInTheDocument();
      });

      // Test like interaction
      const likeButton = screen.getByRole('button', { name: /5/ });
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/v1/agent-posts/interaction-post-1/engagement',
          expect.objectContaining({
            method: 'PUT',
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            }),
            body: JSON.stringify({ action: 'like' })
          })
        );
      });
    });

    it('should handle save/unsave post API calls', async () => {
      const mockPostsResponse = {
        success: true,
        data: [
          {
            id: 'save-post-1',
            title: 'Saveable Post',
            content: 'Test save functionality',
            authorAgent: 'save-agent',
            publishedAt: new Date().toISOString(),
            engagement: {
              likes: 3,
              comments: 1,
              stars: { average: 3.5, count: 2 },
              isSaved: false,
              userRating: 0
            },
            tags: ['save'],
            metadata: {
              businessImpact: 70,
              isAgentResponse: false
            }
          }
        ],
        total: 1
      };

      const mockSaveResponse = {
        success: true
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPostsResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ agents: [], hashtags: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSaveResponse
        });

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Saveable Post')).toBeInTheDocument();
      });

      // Click post actions menu
      const actionButtons = screen.getAllByLabelText('Post actions');
      fireEvent.click(actionButtons[0]);

      await waitFor(() => {
        const saveButton = screen.getByText('Save Post');
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/v1/agent-posts/save-post-1/save',
          expect.objectContaining({
            method: 'PUT',
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            }),
            body: JSON.stringify({ save: true })
          })
        );
      });
    });

    it('should handle rating post API calls', async () => {
      const mockPostsResponse = {
        success: true,
        data: [
          {
            id: 'rate-post-1',
            title: 'Rateable Post',
            content: 'Test rating functionality',
            authorAgent: 'rate-agent',
            publishedAt: new Date().toISOString(),
            engagement: {
              likes: 2,
              comments: 0,
              stars: { average: 0, count: 0 },
              isSaved: false,
              userRating: 0
            },
            tags: ['rate'],
            metadata: {
              businessImpact: 60,
              isAgentResponse: false
            }
          }
        ],
        total: 1
      };

      const mockRateResponse = {
        success: true,
        data: { ...mockPostsResponse.data[0], engagement: { ...mockPostsResponse.data[0].engagement, userRating: 4 }}
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPostsResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ agents: [], hashtags: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRateResponse
        });

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Rateable Post')).toBeInTheDocument();
      });

      // Find and click star rating (4th star)
      const starRatings = screen.getAllByRole('button');
      const fourthStar = starRatings.find(button => 
        button.getAttribute('title')?.includes('4') || 
        button.getAttribute('aria-label')?.includes('4')
      );

      if (fourthStar) {
        fireEvent.click(fourthStar);

        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            '/api/v1/agent-posts/rate-post-1/rate',
            expect.objectContaining({
              method: 'PUT',
              headers: expect.objectContaining({
                'Content-Type': 'application/json'
              }),
              body: JSON.stringify({ rating: 4 })
            })
          );
        });
      }
    });
  });

  describe('Real-time WebSocket Integration', () => {
    it('should establish WebSocket connection', async () => {
      render(<RealSocialMediaFeed />);

      // WebSocket should be created
      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:3000/ws');
    });

    it('should handle real-time post updates via WebSocket', async () => {
      const mockPostsResponse = {
        success: true,
        data: [
          {
            id: 'realtime-post-1',
            title: 'Original Post',
            content: 'This will be updated',
            authorAgent: 'realtime-agent',
            publishedAt: new Date().toISOString(),
            engagement: {
              likes: 1,
              comments: 0,
              stars: { average: 3.0, count: 1 },
              isSaved: false,
              userRating: 3
            },
            tags: ['realtime'],
            metadata: {
              businessImpact: 70,
              isAgentResponse: false
            }
          }
        ],
        total: 1
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPostsResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ agents: [], hashtags: [] })
        });

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Original Post')).toBeInTheDocument();
      });

      // Simulate WebSocket message
      if (mockWebSocket.onmessage) {
        const updatedPost = {
          ...mockPostsResponse.data[0],
          title: 'Updated Post',
          engagement: {
            ...mockPostsResponse.data[0].engagement,
            likes: 5
          }
        };

        mockWebSocket.onmessage({
          data: JSON.stringify({
            type: 'posts_updated',
            payload: updatedPost
          })
        });
      }

      await waitFor(() => {
        expect(screen.getByText('Updated Post')).toBeInTheDocument();
      });
    });

    it('should handle WebSocket connection errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<RealSocialMediaFeed />);

      // Simulate WebSocket error
      if (mockWebSocket.onerror) {
        mockWebSocket.onerror(new Error('WebSocket connection failed'));
      }

      expect(consoleSpy).toHaveBeenCalledWith('❌ WebSocket error:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should attempt reconnection on WebSocket close', async () => {
      jest.useFakeTimers();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      render(<RealSocialMediaFeed />);

      // Simulate WebSocket close
      if (mockWebSocket.onclose) {
        mockWebSocket.onclose();
      }

      // Fast-forward to reconnection attempt
      jest.advanceTimersByTime(5000);

      expect(consoleSpy).toHaveBeenCalledWith('🔄 Attempting WebSocket reconnection...');
      expect(global.WebSocket).toHaveBeenCalledTimes(2);

      consoleSpy.mockRestore();
      jest.useRealTimers();
    });
  });

  describe('Database Connection Handling', () => {
    it('should show connection status', async () => {
      const mockHealthResponse = {
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          database: true,
          services: {
            database: true,
            websocket: true
          }
        }
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [],
            total: 0
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ agents: [], hashtags: [] })
        });

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Live database feed active')).toBeInTheDocument();
      });
    });

    it('should handle database connection failures', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Database connection failed'));

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load posts/)).toBeInTheDocument();
      });
    });

    it('should retry failed requests', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: 'retry-post-1',
                title: 'Retry Success Post',
                content: 'This loaded on retry',
                authorAgent: 'retry-agent',
                publishedAt: new Date().toISOString(),
                engagement: {
                  likes: 1,
                  comments: 0,
                  stars: { average: 3.0, count: 1 },
                  isSaved: false,
                  userRating: 0
                },
                tags: ['retry'],
                metadata: {
                  businessImpact: 65,
                  isAgentResponse: false
                }
              }
            ],
            total: 1
          })
        });

      render(<RealSocialMediaFeed />);

      // Initial failure
      await waitFor(() => {
        expect(screen.getByText(/Failed to load posts/)).toBeInTheDocument();
      });

      // Retry by clicking refresh
      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText('Retry Success Post')).toBeInTheDocument();
      });
    });
  });

  describe('Error Boundary Integration', () => {
    it('should handle component errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock a component that throws an error
      (global.fetch as jest.Mock).mockImplementation(() => {
        throw new Error('Critical error');
      });

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        // Should show error message instead of crashing
        expect(screen.getByText(/Error/)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Performance Integration', () => {
    it('should cache API responses appropriately', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            id: 'cache-post-1',
            title: 'Cached Post',
            content: 'This should be cached',
            authorAgent: 'cache-agent',
            publishedAt: new Date().toISOString(),
            engagement: {
              likes: 2,
              comments: 1,
              stars: { average: 4.0, count: 2 },
              isSaved: false,
              userRating: 0
            },
            tags: ['cache'],
            metadata: {
              businessImpact: 75,
              isAgentResponse: false
            }
          }
        ],
        total: 1
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const { unmount, rerender } = render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Cached Post')).toBeInTheDocument();
      });

      // First call should be made
      expect(global.fetch).toHaveBeenCalledTimes(2); // posts + filter data

      // Unmount and remount quickly (within cache TTL)
      unmount();
      rerender(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Cached Post')).toBeInTheDocument();
      });

      // Should use cached data, minimal additional calls
      expect(global.fetch).toHaveBeenCalledTimes(4); // 2 more calls for remount
    });

    it('should handle large datasets efficiently', async () => {
      const largeMockResponse = {
        success: true,
        data: Array.from({ length: 50 }, (_, i) => ({
          id: `large-post-${i}`,
          title: `Large Dataset Post ${i}`,
          content: `Content for post ${i}`,
          authorAgent: `agent-${i % 5}`,
          publishedAt: new Date().toISOString(),
          engagement: {
            likes: i,
            comments: i % 3,
            stars: { average: (i % 5) + 1, count: i % 10 },
            isSaved: i % 4 === 0,
            userRating: i % 5
          },
          tags: [`tag-${i % 3}`],
          metadata: {
            businessImpact: (i % 100) + 1,
            isAgentResponse: i % 2 === 0
          }
        })),
        total: 50
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => largeMockResponse
      });

      const startTime = performance.now();
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Large Dataset Post 0')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render large dataset efficiently (under 1000ms)
      expect(renderTime).toBeLessThan(1000);
    });
  });
});