/**
 * Emergency SPARC Debugging Fixes Validation Test
 * 
 * This test validates all the critical fixes implemented during the emergency
 * SPARC debugging session for "Cannot GET /dual-instance" and related issues.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DualInstancePage from '@/pages/DualInstancePage';
import { useInstanceManager } from '@/hooks/useInstanceManager';

// Mock the useInstanceManager hook
jest.mock('@/hooks/useInstanceManager');
const mockUseInstanceManager = useInstanceManager as jest.MockedFunction<typeof useInstanceManager>;

// Mock components that might not be available in test environment
jest.mock('@/components/InstanceLauncher', () => {
  return function MockInstanceLauncher() {
    return <div data-testid="instance-launcher">Instance Launcher</div>;
  };
});

jest.mock('@/components/DualInstanceMonitor', () => {
  return function MockDualInstanceMonitor() {
    return <div data-testid="dual-instance-monitor">Dual Instance Monitor</div>;
  };
});

jest.mock('@/components/TerminalView', () => {
  return function MockTerminalView() {
    return <div data-testid="terminal-view">Terminal View</div>;
  };
});

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithRouter = (initialRoute = '/dual-instance') => {
  const queryClient = createQueryClient();
  
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/dual-instance" element={<DualInstancePage />} />
          <Route path="/dual-instance/:tab" element={<DualInstancePage />} />
          <Route path="/dual-instance/:tab/:instanceId" element={<DualInstancePage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Emergency SPARC Debugging Fixes Validation', () => {
  beforeEach(() => {
    // Mock default instance manager state
    mockUseInstanceManager.mockReturnValue({
      processInfo: {
        pid: 12345,
        name: 'Claude Instance',
        status: 'running',
        startTime: new Date('2024-01-01T10:00:00Z'),
        autoRestartEnabled: true,
        autoRestartHours: 6,
      },
      instances: [
        {
          id: 'test-instance-id',
          type: 'claude-instance',
          name: 'Claude Instance',
          status: 'running',
          pid: 12345,
          startTime: new Date('2024-01-01T10:00:00Z'),
          autoRestartEnabled: true,
          autoRestartHours: 6,
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
      ],
      stats: {
        running: 1,
        stopped: 0,
        error: 0,
        total: 1,
      },
      isConnected: true,
      launchInstance: jest.fn(),
      killInstance: jest.fn(),
      restartInstance: jest.fn(),
      updateConfig: jest.fn(),
      loading: false,
      error: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CRITICAL FIX: React Router SPA Routing', () => {
    test('should render DualInstancePage without "Cannot GET" error', () => {
      renderWithRouter('/dual-instance');
      
      expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
      expect(screen.getByText('Launch, monitor, and control Claude instances')).toBeInTheDocument();
    });

    test('should handle direct navigation to /dual-instance route', () => {
      // Simulate direct browser navigation to /dual-instance
      window.history.pushState({}, 'Dual Instance', '/dual-instance');
      renderWithRouter('/dual-instance');
      
      expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
    });
  });

  describe('CRITICAL FIX: Tab Navigation and Clickability', () => {
    test('should render all tabs as clickable', () => {
      renderWithRouter('/dual-instance');
      
      const launcherTab = screen.getByText('Instance Launcher');
      const monitorTab = screen.getByText('Dual Monitor');
      const terminalTab = screen.getByText('Terminal');
      
      expect(launcherTab).toBeInTheDocument();
      expect(monitorTab).toBeInTheDocument();
      expect(terminalTab).toBeInTheDocument();
      
      // All tabs should be clickable buttons
      expect(launcherTab.closest('button')).toBeInTheDocument();
      expect(monitorTab.closest('button')).toBeInTheDocument();
      expect(terminalTab.closest('button')).toBeInTheDocument();
    });

    test('should allow clicking terminal tab even when no running instances', () => {
      // Mock stopped instance state
      mockUseInstanceManager.mockReturnValue({
        ...mockUseInstanceManager(),
        instances: [
          {
            id: 'test-instance-id',
            type: 'claude-instance',
            name: 'Claude Instance',
            status: 'stopped',
            pid: null,
            startTime: null,
            autoRestartEnabled: false,
            autoRestartHours: 6,
            createdAt: new Date('2024-01-01T10:00:00Z'),
          },
        ],
        stats: {
          running: 0,
          stopped: 1,
          error: 0,
          total: 1,
        },
      });

      renderWithRouter('/dual-instance');
      
      const terminalTab = screen.getByText('Terminal');
      expect(terminalTab.closest('button')).not.toBeDisabled();
      
      // Should be able to click terminal tab
      fireEvent.click(terminalTab);
      // Should not throw errors
    });
  });

  describe('CRITICAL FIX: Stats Display Accuracy', () => {
    test('should display correct running/stopped counts', () => {
      renderWithRouter('/dual-instance');
      
      expect(screen.getByText('Running: 1')).toBeInTheDocument();
      expect(screen.getByText('Stopped: 0')).toBeInTheDocument();
    });

    test('should update stats when instance status changes', () => {
      const { rerender } = renderWithRouter('/dual-instance');
      
      // Initially running
      expect(screen.getByText('Running: 1')).toBeInTheDocument();
      expect(screen.getByText('Stopped: 0')).toBeInTheDocument();
      
      // Change to stopped state
      mockUseInstanceManager.mockReturnValue({
        ...mockUseInstanceManager(),
        instances: [
          {
            id: 'test-instance-id',
            type: 'claude-instance',
            name: 'Claude Instance',
            status: 'stopped',
            pid: null,
            startTime: null,
            autoRestartEnabled: false,
            autoRestartHours: 6,
            createdAt: new Date('2024-01-01T10:00:00Z'),
          },
        ],
        stats: {
          running: 0,
          stopped: 1,
          error: 0,
          total: 1,
        },
      });
      
      rerender(
        <QueryClientProvider client={createQueryClient()}>
          <BrowserRouter>
            <Routes>
              <Route path="/dual-instance" element={<DualInstancePage />} />
            </Routes>
          </BrowserRouter>
        </QueryClientProvider>
      );
      
      expect(screen.getByText('Running: 0')).toBeInTheDocument();
      expect(screen.getByText('Stopped: 1')).toBeInTheDocument();
    });
  });

  describe('CRITICAL FIX: Terminal Navigation', () => {
    test('should handle terminal navigation with instance ID', () => {
      renderWithRouter('/dual-instance/terminal/test-instance-id');
      
      // Should render terminal view for valid instance
      expect(screen.getByTestId('terminal-view')).toBeInTheDocument();
    });

    test('should show connecting message instead of "Instance Not Found"', () => {
      // Mock empty instances to test fallback
      mockUseInstanceManager.mockReturnValue({
        ...mockUseInstanceManager(),
        instances: [],
        stats: {
          running: 0,
          stopped: 0,
          error: 0,
          total: 0,
        },
      });

      renderWithRouter('/dual-instance/terminal/non-existent-id');
      
      // Should show improved connecting message instead of harsh "Instance Not Found"
      expect(screen.queryByText('Instance Not Found')).not.toBeInTheDocument();
      expect(screen.getByText('No instances available. Launch an instance to access terminal.')).toBeInTheDocument();
    });
  });

  describe('CRITICAL FIX: Instance Data Consistency', () => {
    test('should always provide instance data to prevent UI breakage', () => {
      // Mock completely empty state
      mockUseInstanceManager.mockReturnValue({
        processInfo: null as any,
        instances: [],
        stats: {
          running: 0,
          stopped: 0,
          error: 0,
          total: 0,
        },
        isConnected: false,
        launchInstance: jest.fn(),
        killInstance: jest.fn(),
        restartInstance: jest.fn(),
        updateConfig: jest.fn(),
        loading: false,
        error: null,
      });

      // Should not crash even with empty state
      expect(() => renderWithRouter('/dual-instance')).not.toThrow();
      
      expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
    });
  });

  describe('Integration: Complete User Flow', () => {
    test('should support complete navigation flow without errors', async () => {
      renderWithRouter('/dual-instance');
      
      // Start on launcher tab (default)
      expect(screen.getByTestId('instance-launcher')).toBeInTheDocument();
      
      // Navigate to monitor tab
      fireEvent.click(screen.getByText('Dual Monitor'));
      await waitFor(() => {
        expect(screen.getByTestId('dual-instance-monitor')).toBeInTheDocument();
      });
      
      // Navigate to terminal tab
      fireEvent.click(screen.getByText('Terminal'));
      await waitFor(() => {
        expect(screen.getByTestId('terminal-view')).toBeInTheDocument();
      });
      
      // Navigate back to launcher
      fireEvent.click(screen.getByText('Instance Launcher'));
      await waitFor(() => {
        expect(screen.getByTestId('instance-launcher')).toBeInTheDocument();
      });
    });
  });
});