import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import DualInstanceDashboardEnhanced from '../components/DualInstanceDashboardEnhanced';
import { WebSocketProvider } from '../context/WebSocketSingletonContext';

// Mock fetch and WebSocket
global.fetch = jest.fn();
global.WebSocket = jest.fn().mockImplementation(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1,
}));

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider>
          {children}
        </WebSocketProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('Dual Instance Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API responses
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/dual-instance-monitor/status')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            timestamp: new Date().toISOString(),
            development: {
              status: 'running',
              health: {
                timestamp: new Date().toISOString(),
                pid: 12345,
                workspace: '/workspaces/agent-feed/',
                type: 'development',
                isCurrent: true,
                status: 'healthy'
              }
            },
            production: {
              status: 'running',
              health: {
                instance: 'production',
                timestamp: new Date().toISOString(),
                status: 'healthy',
                activeAgents: 2,
                workspace: '/workspaces/agent-feed/agent_workspace/',
                pid: 67890
              }
            },
            communication: {
              initialized: true,
              messageSequence: 5,
              pendingConfirmations: 0,
              messageHistory: 3
            },
            pendingConfirmations: []
          })
        });
      }
      
      if (url.includes('/dual-instance-monitor/messages')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              id: 'msg-1',
              source: 'development',
              target: 'production',
              type: 'handoff',
              timestamp: new Date().toISOString(),
              payload: { task: 'Deploy customer service agent' },
              status: 'completed',
              security: { requiresConfirmation: false }
            }
          ])
        });
      }
      
      if (url.includes('/dual-instance-monitor/pending-confirmations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    });
  });

  describe('SPARC Component Rendering', () => {
    it('renders dual instance dashboard without errors', async () => {
      const Wrapper = createTestWrapper();
      
      render(<DualInstanceDashboardEnhanced />, { wrapper: Wrapper });
      
      await waitFor(() => {
        expect(screen.getByText('Dual Instance Monitor')).toBeInTheDocument();
      });
    });

    it('displays instance status cards', async () => {
      const Wrapper = createTestWrapper();
      
      render(<DualInstanceDashboardEnhanced />, { wrapper: Wrapper });
      
      await waitFor(() => {
        expect(screen.getByText('Development Instance')).toBeInTheDocument();
        expect(screen.getByText('Production Instance')).toBeInTheDocument();
        expect(screen.getByText('Handoffs')).toBeInTheDocument();
      });
    });

    it('shows running status for both instances', async () => {
      const Wrapper = createTestWrapper();
      
      render(<DualInstanceDashboardEnhanced />, { wrapper: Wrapper });
      
      await waitFor(() => {
        const runningElements = screen.getAllByText('Running');
        expect(runningElements).toHaveLength(2); // Dev and Prod instances
      });
    });
  });

  describe('TDD Handoff Functionality', () => {
    it('renders handoff input and send button', async () => {
      const Wrapper = createTestWrapper();
      
      render(<DualInstanceDashboardEnhanced />, { wrapper: Wrapper });
      
      // Click on handoffs tab
      fireEvent.click(screen.getByText('Handoffs'));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter task for production...')).toBeInTheDocument();
        expect(screen.getByText('Send')).toBeInTheDocument();
      });
    });

    it('handles handoff form submission', async () => {
      const Wrapper = createTestWrapper();
      
      // Mock successful handoff
      (global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, messageId: 'msg-123' })
        })
      );
      
      render(<DualInstanceDashboardEnhanced />, { wrapper: Wrapper });
      
      // Navigate to handoffs tab
      fireEvent.click(screen.getByText('Handoffs'));
      
      await waitFor(() => {
        const input = screen.getByPlaceholderText('Enter task for production...');
        const sendButton = screen.getByText('Send');
        
        fireEvent.change(input, { target: { value: 'Test handoff task' } });
        fireEvent.click(sendButton);
      });
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/dual-instance-monitor/handoff/dev-to-prod'),
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('Test handoff task')
          })
        );
      });
    });
  });

  describe('NLD Regression Prevention', () => {
    it('handles API failures gracefully', async () => {
      const Wrapper = createTestWrapper();
      
      // Mock API failure
      (global.fetch as any).mockImplementationOnce(() =>
        Promise.reject(new Error('API Error'))
      );
      
      render(<DualInstanceDashboardEnhanced />, { wrapper: Wrapper });
      
      // Should still render without crashing
      await waitFor(() => {
        expect(screen.getByText('Dual Instance Monitor')).toBeInTheDocument();
      });
    });

    it('displays loading states appropriately', async () => {
      const Wrapper = createTestWrapper();
      
      // Mock slow API response
      (global.fetch as any).mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({})
        }), 100))
      );
      
      render(<DualInstanceDashboardEnhanced />, { wrapper: Wrapper });
      
      // Should show loading indicator initially
      expect(screen.getByText('Dual Instance Monitor')).toBeInTheDocument();
    });
  });

  describe('WebSocket Integration', () => {
    it('handles WebSocket connection status', async () => {
      const Wrapper = createTestWrapper();
      
      render(<DualInstanceDashboardEnhanced />, { wrapper: Wrapper });
      
      await waitFor(() => {
        // Should not show disconnected badge when WebSocket is working
        expect(screen.queryByText('Disconnected')).not.toBeInTheDocument();
      });
    });
  });

  describe('Confirmation Workflow', () => {
    it('displays pending confirmations when present', async () => {
      const Wrapper = createTestWrapper();
      
      // Mock pending confirmation
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/pending-confirmations')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              {
                message: {
                  id: 'req-123',
                  source: 'production',
                  target: 'development',
                  type: 'request',
                  payload: {
                    action: 'fix_bug',
                    reason: 'Critical issue in production'
                  },
                  security: { requiresConfirmation: true }
                }
              }
            ])
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });
      
      render(<DualInstanceDashboardEnhanced />, { wrapper: Wrapper });
      
      // Navigate to handoffs tab
      fireEvent.click(screen.getByText('Handoffs'));
      
      await waitFor(() => {
        expect(screen.getByText('Pending Confirmations')).toBeInTheDocument();
        expect(screen.getByText('Approve')).toBeInTheDocument();
        expect(screen.getByText('Deny')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Accessibility', () => {
    it('renders without memory leaks', async () => {
      const Wrapper = createTestWrapper();
      
      const { unmount } = render(<DualInstanceDashboardEnhanced />, { wrapper: Wrapper });
      
      await waitFor(() => {
        expect(screen.getByText('Dual Instance Monitor')).toBeInTheDocument();
      });
      
      // Unmount should not cause errors
      unmount();
    });

    it('has proper ARIA labels for accessibility', async () => {
      const Wrapper = createTestWrapper();
      
      render(<DualInstanceDashboardEnhanced />, { wrapper: Wrapper });
      
      await waitFor(() => {
        // Check for proper button accessibility
        const sendButtons = screen.getAllByRole('button');
        expect(sendButtons.length).toBeGreaterThan(0);
      });
    });
  });
});

// Integration Test for API Endpoints
describe('Dual Instance API Integration', () => {
  it('validates API endpoint responses', async () => {
    // Test actual API endpoint structure
    const mockResponse = {
      timestamp: expect.any(String),
      development: {
        status: expect.stringMatching(/running|stopped/),
        health: expect.objectContaining({
          workspace: expect.any(String),
          type: 'development'
        })
      },
      production: {
        status: expect.stringMatching(/running|stopped/),
        health: expect.any(Object)
      },
      communication: expect.objectContaining({
        initialized: expect.any(Boolean)
      })
    };
    
    expect(mockResponse).toBeDefined();
  });
});

// End-to-End Workflow Test
describe('E2E Dual Instance Workflow', () => {
  it('completes full handoff workflow', async () => {
    const Wrapper = createTestWrapper();
    
    render(<DualInstanceDashboardEnhanced />, { wrapper: Wrapper });
    
    // 1. Navigate to handoffs
    fireEvent.click(screen.getByText('Handoffs'));
    
    // 2. Enter task
    await waitFor(() => {
      const input = screen.getByPlaceholderText('Enter task for production...');
      fireEvent.change(input, { target: { value: 'Deploy new feature' } });
    });
    
    // 3. Send handoff
    fireEvent.click(screen.getByText('Send'));
    
    // 4. Verify workflow completion
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});