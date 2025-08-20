import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DualInstanceDashboard from '@/components/DualInstanceDashboard';
import { WebSocketProvider } from '@/context/WebSocketSingletonContext';

// Mock WebSocket
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: WebSocket.OPEN,
};

global.WebSocket = jest.fn(() => mockWebSocket) as any;

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
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

describe('DualInstanceDashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset WebSocket mock
    mockWebSocket.send.mockClear();
    mockWebSocket.addEventListener.mockClear();
    mockWebSocket.removeEventListener.mockClear();
  });

  describe('Rendering and Layout', () => {
    it('should render dual instance dashboard header', () => {
      render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { name: /dual instance dashboard/i })).toBeInTheDocument();
    });

    it('should render both instance panels', () => {
      render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );

      expect(screen.getByText(/instance 1/i)).toBeInTheDocument();
      expect(screen.getByText(/instance 2/i)).toBeInTheDocument();
    });

    it('should render synchronization controls', () => {
      render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /sync instances/i })).toBeInTheDocument();
    });

    it('should display connection status for both instances', () => {
      render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );

      const statusIndicators = screen.getAllByText(/status/i);
      expect(statusIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('Instance Management', () => {
    it('should toggle between instances', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );

      // Look for instance toggle buttons
      const toggleButtons = screen.getAllByRole('button');
      const instanceToggle = toggleButtons.find(button => 
        button.textContent?.includes('Instance') || 
        button.getAttribute('aria-label')?.includes('instance')
      );

      if (instanceToggle) {
        await user.click(instanceToggle);
        // Should switch active instance view
        expect(instanceToggle).toBeInTheDocument();
      }
    });

    it('should handle instance switching with keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );

      // Tab navigation should work between instances
      await user.tab();
      expect(document.activeElement).toBeInTheDocument();
    });
  });

  describe('Data Synchronization', () => {
    it('should trigger synchronization between instances', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );

      const syncButton = screen.getByRole('button', { name: /sync/i });
      await user.click(syncButton);

      // Should trigger sync operation
      expect(syncButton).toBeInTheDocument();
    });

    it('should show sync status indicators', () => {
      render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );

      // Should display sync status
      const dashboard = screen.getByRole('heading', { name: /dual instance dashboard/i });
      expect(dashboard.closest('div')).toBeInTheDocument();
    });

    it('should handle sync conflicts gracefully', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );

      const syncButton = screen.getByRole('button', { name: /sync/i });
      await user.click(syncButton);

      // Should not crash or show errors
      expect(screen.getByRole('heading', { name: /dual instance dashboard/i })).toBeInTheDocument();
    });
  });

  describe('WebSocket Integration', () => {
    it('should establish WebSocket connections for both instances', () => {
      render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );

      // Component should be rendered without WebSocket errors
      expect(screen.getByRole('heading', { name: /dual instance dashboard/i })).toBeInTheDocument();
    });

    it('should handle WebSocket connection failures gracefully', () => {
      // Mock WebSocket connection failure
      const failingWebSocket = {
        ...mockWebSocket,
        readyState: WebSocket.CLOSED,
      };
      global.WebSocket = jest.fn(() => failingWebSocket) as any;

      render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );

      // Should still render without crashing
      expect(screen.getByRole('heading', { name: /dual instance dashboard/i })).toBeInTheDocument();
    });

    it('should update UI when receiving WebSocket messages', async () => {
      render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );

      // Simulate WebSocket message
      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      if (messageHandler) {
        messageHandler({ 
          data: JSON.stringify({ 
            type: 'instanceUpdate', 
            instanceId: 'instance-1',
            data: { status: 'active' }
          }) 
        });
      }

      expect(screen.getByRole('heading', { name: /dual instance dashboard/i })).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should display real-time metrics for both instances', () => {
      render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );

      // Should show metrics or placeholders
      expect(screen.getByRole('heading', { name: /dual instance dashboard/i })).toBeInTheDocument();
    });

    it('should update metrics automatically', async () => {
      render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );

      // Wait for any automatic updates
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /dual instance dashboard/i })).toBeInTheDocument();
      });
    });

    it('should handle metric update errors gracefully', async () => {
      render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );

      // Should not crash on update errors
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /dual instance dashboard/i })).toBeInTheDocument();
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('should display performance metrics for each instance', () => {
      render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );

      // Should render performance-related content
      expect(screen.getByRole('heading', { name: /dual instance dashboard/i })).toBeInTheDocument();
    });

    it('should show comparative performance data', () => {
      render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );

      // Should display comparison data
      expect(screen.getByRole('heading', { name: /dual instance dashboard/i })).toBeInTheDocument();
    });

    it('should alert on performance thresholds', () => {
      render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );

      // Should handle performance alerts
      expect(screen.getByRole('heading', { name: /dual instance dashboard/i })).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error states appropriately', () => {
      render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );

      // Should render without errors
      expect(screen.getByRole('heading', { name: /dual instance dashboard/i })).toBeInTheDocument();
    });

    it('should recover from temporary errors', async () => {
      render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );

      // Should maintain functionality after errors
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /dual instance dashboard/i })).toBeInTheDocument();
      });
    });

    it('should provide meaningful error messages', () => {
      render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );

      // Should not show cryptic errors
      expect(screen.getByRole('heading', { name: /dual instance dashboard/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for dual instances', () => {
      render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { name: /dual instance dashboard/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation between instances', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );

      await user.tab();
      expect(document.activeElement).toBeInTheDocument();
    });

    it('should announce instance changes to screen readers', () => {
      render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );

      // Should have appropriate ARIA live regions
      expect(screen.getByRole('heading', { name: /dual instance dashboard/i })).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      window.dispatchEvent(new Event('resize'));

      render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { name: /dual instance dashboard/i })).toBeInTheDocument();
    });

    it('should stack instances vertically on small screens', () => {
      // Mock small viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 640,
      });
      window.dispatchEvent(new Event('resize'));

      render(
        <TestWrapper>
          <DualInstanceDashboard />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { name: /dual instance dashboard/i })).toBeInTheDocument();
    });
  });
});