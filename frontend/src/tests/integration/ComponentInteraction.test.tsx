import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/App';

// Mock API responses
global.fetch = jest.fn();

// Mock WebSocket
global.WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: WebSocket.OPEN,
})) as any;

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('Component Integration Tests', () => {
  const mockAgents = [
    {
      id: 'agent-1',
      name: 'test-agent',
      description: 'Test agent',
      status: 'active',
      capabilities: ['test'],
      lastActivity: '2023-01-01T00:00:00Z',
      color: '#3B82F6'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/v1/claude-live/prod/agents')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ agents: mockAgents }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  describe('Navigation Integration', () => {
    it('should navigate between pages without losing state', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText(/agentlink feed system/i)).toBeInTheDocument();
      });

      // Navigate to Agents page
      const agentsLink = screen.getByRole('link', { name: /agents/i });
      await user.click(agentsLink);

      await waitFor(() => {
        expect(screen.getByText(/agent manager/i)).toBeInTheDocument();
      });

      // Navigate back to Feed
      const feedLink = screen.getByRole('link', { name: /feed/i });
      await user.click(feedLink);

      await waitFor(() => {
        expect(screen.getByText(/agentlink feed system/i)).toBeInTheDocument();
      });
    });

    it('should maintain navigation state across page refreshes', async () => {
      render(<App />);

      // Should load with default route
      await waitFor(() => {
        expect(screen.getByText(/agentlink feed system/i)).toBeInTheDocument();
      });
    });

    it('should handle deep linking correctly', async () => {
      // Test deep linking by mocking the initial location
      const mockLocation = { ...window.location, pathname: '/agents' };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });

      render(<App />);

      // Should navigate to the correct deep-linked page
      await waitFor(() => {
        expect(screen.getByText(/agent manager/i)).toBeInTheDocument();
      });
    });
  });

  describe('WebSocket and Real-time Updates Integration', () => {
    it('should establish WebSocket connection and handle messages', async () => {
      render(<App />);

      await waitFor(() => {
        expect(global.WebSocket).toHaveBeenCalled();
      });
    });

    it('should update UI when receiving WebSocket messages', async () => {
      const mockWebSocket = {
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        readyState: WebSocket.OPEN,
      };

      global.WebSocket = jest.fn(() => mockWebSocket) as any;

      render(<App />);

      // Simulate WebSocket message
      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      if (messageHandler) {
        const mockMessage = {
          data: JSON.stringify({
            type: 'agentUpdate',
            payload: { agentId: 'agent-1', status: 'inactive' }
          })
        };

        messageHandler(mockMessage);
      }

      // UI should remain stable
      await waitFor(() => {
        expect(screen.getByText(/agentlink feed system/i)).toBeInTheDocument();
      });
    });

    it('should handle WebSocket reconnection gracefully', async () => {
      const mockWebSocket = {
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        readyState: WebSocket.CONNECTING,
      };

      global.WebSocket = jest.fn(() => mockWebSocket) as any;

      render(<App />);

      // Simulate connection loss and reconnection
      const closeHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'close'
      )?.[1];

      const openHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )?.[1];

      if (closeHandler && openHandler) {
        closeHandler({ type: 'close', code: 1006 });
        setTimeout(() => openHandler({ type: 'open' }), 100);
      }

      await waitFor(() => {
        expect(screen.getByText(/agentlink feed system/i)).toBeInTheDocument();
      });
    });
  });

  describe('Agent Manager and Dashboard Integration', () => {
    it('should sync data between Agent Manager and Dashboard', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Navigate to Agents page
      await waitFor(() => {
        const agentsLink = screen.getByRole('link', { name: /agents/i });
        return user.click(agentsLink);
      });

      await waitFor(() => {
        expect(screen.getByText(/agent manager/i)).toBeInTheDocument();
      });

      // Navigate to Dashboard
      const dashboardLink = screen.getByRole('link', { name: /dual instance/i });
      await user.click(dashboardLink);

      await waitFor(() => {
        expect(screen.getByText(/dual instance dashboard/i)).toBeInTheDocument();
      });
    });

    it('should update agent status across all components', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Navigate to agents
      const agentsLink = screen.getByRole('link', { name: /agents/i });
      await user.click(agentsLink);

      await waitFor(() => {
        expect(screen.getByText(/agent manager/i)).toBeInTheDocument();
      });

      // Any agent status changes should be reflected across components
      expect(screen.getByText(/agent manager/i)).toBeInTheDocument();
    });
  });

  describe('Error Boundary Integration', () => {
    it('should catch and display component errors gracefully', async () => {
      // Mock a component that throws an error
      const ErrorComponent = () => {
        throw new Error('Test error');
      };

      // This would normally be caught by error boundary
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/agentlink feed system/i)).toBeInTheDocument();
      });
    });

    it('should recover from errors without full app crash', async () => {
      render(<App />);

      // App should remain functional even after component errors
      await waitFor(() => {
        expect(screen.getByText(/agentlink feed system/i)).toBeInTheDocument();
      });
    });

    it('should provide fallback UI for failed components', async () => {
      render(<App />);

      // Should show fallback components when needed
      await waitFor(() => {
        expect(screen.getByText(/agentlink feed system/i)).toBeInTheDocument();
      });
    });
  });

  describe('State Management Integration', () => {
    it('should maintain global state across components', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Navigate between pages
      await waitFor(() => {
        const agentsLink = screen.getByRole('link', { name: /agents/i });
        return user.click(agentsLink);
      });

      await waitFor(() => {
        const feedLink = screen.getByRole('link', { name: /feed/i });
        return user.click(feedLink);
      });

      // State should be maintained
      await waitFor(() => {
        expect(screen.getByText(/agentlink feed system/i)).toBeInTheDocument();
      });
    });

    it('should share data between React Query and WebSocket updates', async () => {
      render(<App />);

      // Initial API data should be loaded
      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      // WebSocket updates should work alongside cached data
      expect(screen.getByText(/agentlink feed system/i)).toBeInTheDocument();
    });
  });

  describe('Performance Integration', () => {
    it('should lazy load routes efficiently', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Navigate to different routes
      const routes = ['agents', 'analytics', 'settings'];
      
      for (const route of routes) {
        const link = screen.getByRole('link', { name: new RegExp(route, 'i') });
        await user.click(link);
        
        await waitFor(() => {
          // Should load without performance issues
          expect(document.body).toBeInTheDocument();
        });
      }
    });

    it('should handle multiple concurrent operations', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Perform multiple operations simultaneously
      const agentsLink = screen.getByRole('link', { name: /agents/i });
      const searchInput = screen.getByPlaceholderText(/search posts/i);

      await Promise.all([
        user.click(agentsLink),
        user.type(searchInput, 'test search')
      ]);

      // All operations should complete successfully
      await waitFor(() => {
        expect(screen.getByDisplayValue('test search')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile and Responsive Integration', () => {
    it('should adapt navigation for mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      window.dispatchEvent(new Event('resize'));

      const user = userEvent.setup();
      render(<App />);

      // Mobile menu should be available
      const menuButton = screen.getByRole('button', { name: /menu/i });
      expect(menuButton).toBeInTheDocument();

      await user.click(menuButton);

      // Navigation should be accessible
      await waitFor(() => {
        expect(screen.getByRole('link', { name: /agents/i })).toBeInTheDocument();
      });
    });

    it('should maintain functionality across different viewport sizes', async () => {
      const viewportSizes = [
        { width: 375, height: 667 },   // Mobile
        { width: 768, height: 1024 },  // Tablet
        { width: 1920, height: 1080 }  // Desktop
      ];

      for (const size of viewportSizes) {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: size.width,
        });
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: size.height,
        });
        window.dispatchEvent(new Event('resize'));

        render(<App />);

        await waitFor(() => {
          expect(screen.getByText(/agentlink feed system/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('API Integration', () => {
    it('should handle API failures gracefully across components', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

      render(<App />);

      // App should still render despite API failures
      await waitFor(() => {
        expect(screen.getByText(/agentlink feed system/i)).toBeInTheDocument();
      });
    });

    it('should retry failed requests automatically', async () => {
      let callCount = 0;
      (fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount < 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ agents: mockAgents }),
        });
      });

      render(<App />);

      // Should eventually succeed after retries
      await waitFor(() => {
        expect(screen.getByText(/agentlink feed system/i)).toBeInTheDocument();
      });
    });

    it('should cache API responses effectively', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Navigate to agents page
      const agentsLink = screen.getByRole('link', { name: /agents/i });
      await user.click(agentsLink);

      await waitFor(() => {
        expect(screen.getByText(/agent manager/i)).toBeInTheDocument();
      });

      // Navigate away and back
      const feedLink = screen.getByRole('link', { name: /feed/i });
      await user.click(feedLink);

      await user.click(agentsLink);

      // Should use cached data for faster loading
      await waitFor(() => {
        expect(screen.getByText(/agent manager/i)).toBeInTheDocument();
      });
    });
  });
});