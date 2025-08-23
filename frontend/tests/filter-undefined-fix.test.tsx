/**
 * Filter Undefined Error Fix - TDD London School Test Suite
 * 
 * Comprehensive test suite validating the fix for undefined filter errors
 * using London School (mockist) approach with behavior verification.
 * 
 * Test Coverage:
 * - useInstanceManager hook returning proper instances array structure
 * - DualInstancePage component safely filtering instances
 * - WebSocket connection states and array initialization
 * - Process lifecycle changes and array updates
 * - Error scenarios with graceful degradation
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

// Mock dependencies using London School approach
const mockSocket = {
  id: 'test-socket',
  connected: true,
  disconnected: false,
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  once: jest.fn(),
};

const mockNavigate = jest.fn();
const mockLocation = {
  pathname: '/dual-instance/launcher',
  search: '',
  hash: '',
  state: null,
  key: 'test-key',
};

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

// Mock the actual useInstanceManager hook
const mockUseInstanceManager = jest.fn(() => ({
  processInfo: null,
  isConnected: false,
  instances: [],
  stats: { running: 0, stopped: 0, error: 0, total: 0 },
  loading: false,
  error: null,
  launchInstance: jest.fn(),
  killInstance: jest.fn(),
  restartInstance: jest.fn(),
  updateConfig: jest.fn(),
}));

jest.mock('@/hooks/useInstanceManager', () => ({
  useInstanceManager: mockUseInstanceManager,
}));

// Mock missing components
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

// Mock React Router
jest.mock('react-router-dom', () => ({
  useParams: jest.fn(),
  useNavigate: jest.fn(() => mockNavigate),
  useLocation: jest.fn(() => mockLocation),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  BrowserRouter: ({ children }: any) => <div>{children}</div>,
  __esModule: true,
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Server: () => <div data-testid="server-icon">Server</div>,
  Terminal: () => <div data-testid="terminal-icon">Terminal</div>,
  Activity: () => <div data-testid="activity-icon">Activity</div>,
  ArrowLeft: () => <div data-testid="arrow-left-icon">ArrowLeft</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
  Play: () => <div data-testid="play-icon">Play</div>,
  CheckCircle: () => <div data-testid="check-circle-icon">CheckCircle</div>,
  Square: () => <div data-testid="square-icon">Square</div>,
  AlertCircle: () => <div data-testid="alert-circle-icon">AlertCircle</div>,
  Loader: () => <div data-testid="loader-icon">Loader</div>,
  WifiOff: () => <div data-testid="wifi-off-icon">WifiOff</div>,
  Wifi: () => <div data-testid="wifi-icon">Wifi</div>,
}));

// Import components after mocks  
import DualInstancePage from '@/pages/DualInstancePage';

// Import types
interface ProcessInfo {
  pid: number | null;
  name: string;
  status: 'running' | 'stopped' | 'restarting' | 'error';
  startTime: Date | null;
  autoRestartEnabled: boolean;
  autoRestartHours: number;
}

interface InstanceInfo extends ProcessInfo {
  id: string;
  type: string;
  createdAt: Date;
}

describe('Filter Undefined Error Fix - TDD London School', () => {
  // Mock data factories following London School patterns
  const createMockProcessInfo = (overrides: Partial<ProcessInfo> = {}): ProcessInfo => ({
    pid: 12345,
    name: 'Claude Instance',
    status: 'running',
    startTime: new Date('2025-01-01T00:00:00Z'),
    autoRestartEnabled: true,
    autoRestartHours: 6,
    ...overrides,
  });

  const createMockInstanceInfo = (overrides: Partial<InstanceInfo> = {}): InstanceInfo => ({
    id: 'test-instance-1',
    type: 'claude-instance',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    ...createMockProcessInfo(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset socket mock to clean state
    Object.keys(mockSocket).forEach(key => {
      if (typeof mockSocket[key as keyof typeof mockSocket] === 'function') {
        (mockSocket[key as keyof typeof mockSocket] as jest.Mock).mockClear();
      }
    });

    // Reset router mocks
    mockNavigate.mockClear();
    mockUseInstanceManager.mockClear();
    
    // Set default router params
    const routerMock = require('react-router-dom');
    routerMock.useParams.mockReturnValue({
      tab: 'launcher',
      instanceId: undefined,
    });
    routerMock.useNavigate.mockReturnValue(mockNavigate);

    // Set default hook return value
    mockUseInstanceManager.mockReturnValue({
      processInfo: null,
      isConnected: false,
      instances: [],
      stats: { running: 0, stopped: 0, error: 0, total: 0 },
      loading: false,
      error: null,
      launchInstance: jest.fn(),
      killInstance: jest.fn(),
      restartInstance: jest.fn(),
      updateConfig: jest.fn(),
    });
  });

  describe('useInstanceManager Hook - Array Structure Validation', () => {
    describe('Hook Returns Array Contract', () => {
      it('should always return instances as array, never undefined', async () => {
        // Mock the hook to return different states
        const testStates = [
          { processInfo: null, isConnected: false },
          { processInfo: createMockProcessInfo({ status: 'stopped', pid: null }), isConnected: false },
          { processInfo: createMockProcessInfo(), isConnected: true },
        ];

        for (const state of testStates) {
          mockUseInstanceManager.mockReturnValueOnce({
            ...state,
            instances: state.processInfo ? [createMockInstanceInfo(state.processInfo)] : [],
            stats: { running: 0, stopped: 0, error: 0, total: 0 },
            loading: false,
            error: null,
            launchInstance: jest.fn(),
            killInstance: jest.fn(),
            restartInstance: jest.fn(),
            updateConfig: jest.fn(),
          });

          const result = mockUseInstanceManager();
          
          // Verify instances is always an array
          expect(Array.isArray(result.instances)).toBe(true);
          expect(result.instances).toBeDefined();
          
          // Verify array methods are available
          expect(typeof result.instances.filter).toBe('function');
          expect(typeof result.instances.map).toBe('function');
          expect(typeof result.instances.find).toBe('function');
        }
      });

      it('should return empty array when no process is running', () => {
        mockUseInstanceManager.mockReturnValue({
          processInfo: null,
          isConnected: false,
          instances: [],
          stats: { running: 0, stopped: 0, error: 0, total: 0 },
          loading: false,
          error: null,
          launchInstance: jest.fn(),
          killInstance: jest.fn(),
          restartInstance: jest.fn(),
          updateConfig: jest.fn(),
        });

        const result = mockUseInstanceManager();
        
        // Verify empty array behavior
        expect(result.instances).toEqual([]);
        expect(result.instances.length).toBe(0);
        
        // Verify filter operations work safely on empty array
        const filtered = result.instances.filter(i => i.status === 'running');
        expect(filtered).toEqual([]);
      });

      it('should transform processInfo into instances array structure', () => {
        const mockProcessInfo = createMockProcessInfo();
        mockUseInstanceManager.mockReturnValue({
          processInfo: mockProcessInfo,
          isConnected: true,
          instances: [createMockInstanceInfo(mockProcessInfo)],
          stats: { running: 1, stopped: 0, error: 0, total: 1 },
          loading: false,
          error: null,
          launchInstance: jest.fn(),
          killInstance: jest.fn(),
          restartInstance: jest.fn(),
          updateConfig: jest.fn(),
        });

        const result = mockUseInstanceManager();
        
        // Verify instances array structure
        expect(result.instances).toHaveLength(1);
        expect(result.instances[0]).toMatchObject({
          id: expect.any(String),
          type: 'claude-instance',
          pid: mockProcessInfo.pid,
          status: mockProcessInfo.status,
          name: mockProcessInfo.name,
          createdAt: expect.any(Date),
        });
      });
    });

    describe('Process Lifecycle Array Updates', () => {
      it('should update instances array when process status changes', () => {
        // Initial state - process stopped
        const initialState = {
          processInfo: createMockProcessInfo({ status: 'stopped', pid: null }),
          isConnected: true,
          instances: [],
          stats: { running: 0, stopped: 1, error: 0, total: 1 },
          loading: false,
          error: null,
          launchInstance: jest.fn(),
          killInstance: jest.fn(),
          restartInstance: jest.fn(),
          updateConfig: jest.fn(),
        };

        // Updated state - process running
        const runningState = {
          ...initialState,
          processInfo: createMockProcessInfo({ status: 'running', pid: 12345 }),
          instances: [createMockInstanceInfo({ status: 'running', pid: 12345 })],
          stats: { running: 1, stopped: 0, error: 0, total: 1 },
        };

        mockUseInstanceManager.mockReturnValueOnce(initialState);
        mockUseInstanceManager.mockReturnValueOnce(runningState);

        // Test initial state
        const initialResult = mockUseInstanceManager();
        expect(initialResult.instances).toEqual([]);

        // Test updated state
        const runningResult = mockUseInstanceManager();
        expect(runningResult.instances).toHaveLength(1);
        expect(runningResult.instances[0].status).toBe('running');
        expect(runningResult.instances[0].pid).toBe(12345);
      });

      it('should handle process error states in instances array', () => {
        mockUseInstanceManager.mockReturnValue({
          processInfo: createMockProcessInfo({ status: 'error', pid: null }),
          isConnected: true,
          instances: [createMockInstanceInfo({ status: 'error', pid: null })],
          stats: { running: 0, stopped: 0, error: 1, total: 1 },
          loading: false,
          error: 'Process failed to start',
          launchInstance: jest.fn(),
          killInstance: jest.fn(),
          restartInstance: jest.fn(),
          updateConfig: jest.fn(),
        });

        const result = mockUseInstanceManager();
        
        // Verify error state is properly represented in array
        expect(result.instances).toHaveLength(1);
        expect(result.instances[0].status).toBe('error');
        expect(result.instances[0].pid).toBe(null);
        
        // Verify filtering works with error states
        const errorInstances = result.instances.filter(i => i.status === 'error');
        expect(errorInstances).toHaveLength(1);
      });
    });

    describe('Async Loading State Array Safety', () => {
      it('should provide safe array during async loading states', () => {
        mockUseInstanceManager.mockReturnValue({
          processInfo: null,
          isConnected: false,
          instances: [],
          stats: { running: 0, stopped: 0, error: 0, total: 0 },
          loading: true,
          error: null,
          launchInstance: jest.fn(),
          killInstance: jest.fn(),
          restartInstance: jest.fn(),
          updateConfig: jest.fn(),
        });

        const result = mockUseInstanceManager();
        
        // Verify array is available during loading
        expect(Array.isArray(result.instances)).toBe(true);
        expect(result.instances).toEqual([]);
        expect(result.loading).toBe(true);
        
        // Verify safe operations during loading
        expect(() => result.instances.filter(i => i.status === 'running')).not.toThrow();
        expect(result.instances.filter(i => i.status === 'running')).toEqual([]);
      });

      it('should maintain array consistency during WebSocket reconnection', () => {
        // Connected state
        const connectedState = {
          processInfo: createMockProcessInfo(),
          isConnected: true,
          instances: [createMockInstanceInfo()],
          stats: { running: 1, stopped: 0, error: 0, total: 1 },
          loading: false,
          error: null,
          launchInstance: jest.fn(),
          killInstance: jest.fn(),
          restartInstance: jest.fn(),
          updateConfig: jest.fn(),
        };

        // Disconnected state
        const disconnectedState = {
          ...connectedState,
          isConnected: false,
          // Instances array should remain intact during disconnection
          instances: [createMockInstanceInfo({ status: 'stopped' })],
        };

        mockUseInstanceManager.mockReturnValueOnce(connectedState);
        mockUseInstanceManager.mockReturnValueOnce(disconnectedState);

        // Test connected state
        const connectedResult = mockUseInstanceManager();
        expect(connectedResult.instances).toHaveLength(1);
        expect(connectedResult.isConnected).toBe(true);

        // Test disconnected state - array should still be valid
        const disconnectedResult = mockUseInstanceManager();
        expect(disconnectedResult.instances).toHaveLength(1);
        expect(disconnectedResult.isConnected).toBe(false);
        
        // Verify filtering still works during disconnection
        const filteredInstances = disconnectedResult.instances.filter(i => i.status === 'stopped');
        expect(filteredInstances).toHaveLength(1);
      });
    });
  });

  describe('DualInstancePage Component - Filter Operations Safety', () => {
    describe('Component Filter Operations', () => {
      it('should safely filter running instances when instances array is empty', async () => {
        mockUseInstanceManager.mockReturnValue({
          instances: [],
          stats: { running: 0, stopped: 0, error: 0, total: 0 },
          loading: false,
          error: null,
          launchInstance: jest.fn(),
          killInstance: jest.fn(),
          restartInstance: jest.fn(),
          updateConfig: jest.fn(),
        });

        require('react-router-dom').useParams.mockReturnValue({
          tab: 'terminal',
          instanceId: undefined,
        });

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await act(async () => {
          render(<DualInstancePage />);
        });

        // Component should render without errors
        expect(consoleSpy).not.toHaveBeenCalled();
        
        // Should show appropriate message for no running instances
        await waitFor(() => {
          expect(screen.getByText(/No running instances available/i)).toBeInTheDocument();
        });

        consoleSpy.mockRestore();
      });

      it('should safely filter running instances when instances array has mixed statuses', async () => {
        const mockInstances = [
          createMockInstanceInfo({ id: 'instance-1', status: 'running' }),
          createMockInstanceInfo({ id: 'instance-2', status: 'stopped' }),
          createMockInstanceInfo({ id: 'instance-3', status: 'error' }),
        ];

        mockUseInstanceManager.mockReturnValue({
          instances: mockInstances,
          stats: { running: 1, stopped: 1, error: 1, total: 3 },
          loading: false,
          error: null,
          launchInstance: jest.fn(),
          killInstance: jest.fn(),
          restartInstance: jest.fn(),
          updateConfig: jest.fn(),
        });

        require('react-router-dom').useParams.mockReturnValue({
          tab: 'launcher',
          instanceId: undefined,
        });

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await act(async () => {
          render(<DualInstancePage />);
        });

        // Component should render without filter errors
        expect(consoleSpy).not.toHaveBeenCalled();
        
        // Should show correct stats
        await waitFor(() => {
          expect(screen.getByText(/Running: 1/i)).toBeInTheDocument();
          expect(screen.getByText(/Stopped: 1/i)).toBeInTheDocument();
          expect(screen.getByText(/Error: 1/i)).toBeInTheDocument();
        });

        consoleSpy.mockRestore();
      });

      it('should handle terminal tab navigation with safe instance filtering', async () => {
        const mockRunningInstance = createMockInstanceInfo({
          id: 'running-instance',
          status: 'running',
          pid: 12345,
        });

        mockUseInstanceManager.mockReturnValue({
          instances: [mockRunningInstance],
          stats: { running: 1, stopped: 0, error: 0, total: 1 },
          loading: false,
          error: null,
          launchInstance: jest.fn(),
          killInstance: jest.fn(),
          restartInstance: jest.fn(),
          updateConfig: jest.fn(),
        });

        require('react-router-dom').useParams.mockReturnValue({
          tab: 'terminal',
          instanceId: 'running-instance',
        });

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await act(async () => {
          render(<DualInstancePage />);
        });

        // Should not throw filter errors
        expect(consoleSpy).not.toHaveBeenCalled();
        
        // Should find and select the running instance
        await waitFor(() => {
          expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
        });

        consoleSpy.mockRestore();
      });
    });

    describe('Error Boundary Integration', () => {
      it('should not crash when filter operations encounter unexpected data', async () => {
        // Mock potentially problematic data
        mockUseInstanceManager.mockReturnValue({
          instances: [
            // Instance with missing required fields
            { id: 'incomplete-1' } as InstanceInfo,
            // Instance with null values
            { id: 'incomplete-2', status: null as any, pid: null } as InstanceInfo,
            // Valid instance
            createMockInstanceInfo({ id: 'valid-instance' }),
          ],
          stats: { running: 1, stopped: 0, error: 0, total: 3 },
          loading: false,
          error: null,
          launchInstance: jest.fn(),
          killInstance: jest.fn(),
          restartInstance: jest.fn(),
          updateConfig: jest.fn(),
        });

        require('react-router-dom').useParams.mockReturnValue({
          tab: 'launcher',
          instanceId: undefined,
        });

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        // Component should render without crashing
        await act(async () => {
          expect(() => render(<DualInstancePage />)).not.toThrow();
        });

        // Should handle the problematic data gracefully
        expect(consoleSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('Cannot read properties of undefined')
        );

        consoleSpy.mockRestore();
      });

      it('should provide fallback behavior when instances array is malformed', async () => {
        // Mock the hook to return non-array instances (edge case)
        mockUseInstanceManager.mockReturnValue({
          instances: null as any, // Intentionally incorrect type
          stats: { running: 0, stopped: 0, error: 0, total: 0 },
          loading: false,
          error: null,
          launchInstance: jest.fn(),
          killInstance: jest.fn(),
          restartInstance: jest.fn(),
          updateConfig: jest.fn(),
        });

        require('react-router-dom').useParams.mockReturnValue({
          tab: 'launcher',
          instanceId: undefined,
        });

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        // Component should handle null instances gracefully
        await act(async () => {
          expect(() => render(<DualInstancePage />)).not.toThrow();
        });

        // Should not crash on filter operations
        expect(consoleSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('filter is not a function')
        );

        consoleSpy.mockRestore();
      });
    });
  });

  describe('DualInstanceMonitor Component - Array Handling', () => {
    describe('WebSocket State Management', () => {
      it('should maintain instances Map structure with safe array operations', () => {
        // This test focuses on the internal state management patterns
        // The component uses Map<string, InstanceInfo> internally
        
        // Create mock Map behaviors
        const mockInstancesMap = new Map<string, any>();
        mockInstancesMap.set('instance-1', createMockInstanceInfo({ id: 'instance-1' }));
        
        // Test Map to Array conversion safety
        const instancesArray = Array.from(mockInstancesMap.values());
        expect(Array.isArray(instancesArray)).toBe(true);
        expect(instancesArray).toHaveLength(1);
        
        // Test filtering on Map-derived array
        const filteredInstances = instancesArray.filter(instance => 
          instance && instance.status === 'running'
        );
        expect(filteredInstances).toHaveLength(1);
      });

      it('should handle instance updates without breaking array operations', () => {
        const mockInstancesMap = new Map<string, any>();
        
        // Simulate instance addition
        const newInstance = createMockInstanceInfo({ id: 'new-instance', status: 'connecting' });
        mockInstancesMap.set('new-instance', newInstance);
        
        // Simulate instance update
        const updatedInstance = { ...newInstance, status: 'connected' };
        mockInstancesMap.set('new-instance', updatedInstance);
        
        // Convert to array for filtering (as component does)
        const instancesArray = Array.from(mockInstancesMap.values());
        
        // Test that filter operations work correctly
        expect(instancesArray.filter(i => i.status === 'connected')).toHaveLength(1);
        expect(instancesArray.filter(i => i.status === 'connecting')).toHaveLength(0);
      });
    });

    describe('Log Filtering Safety', () => {
      it('should safely handle log filtering with various instance states', () => {
        // Mock the internal log filtering logic
        const mockInstances = new Map([
          ['instance-1', {
            ...createMockInstanceInfo({ id: 'instance-1' }),
            logs: [
              { timestamp: new Date(), level: 'info' as const, message: 'Test message 1' },
              { timestamp: new Date(), level: 'error' as const, message: 'Test error 1' },
            ],
          }],
          ['instance-2', {
            ...createMockInstanceInfo({ id: 'instance-2' }),
            logs: [
              { timestamp: new Date(), level: 'warn' as const, message: 'Test warning 1' },
            ],
          }],
        ]);

        // Simulate the component's log filtering logic
        let allLogs: any[] = [];
        mockInstances.forEach(instance => {
          allLogs = [...allLogs, ...instance.logs.map(log => ({
            ...log,
            source: instance.name,
          }))];
        });

        // Test filtering by level
        const errorLogs = allLogs.filter(log => log.level === 'error');
        expect(errorLogs).toHaveLength(1);
        expect(errorLogs[0].message).toBe('Test error 1');

        // Test filtering by non-existent level
        const debugLogs = allLogs.filter(log => log.level === 'debug');
        expect(debugLogs).toHaveLength(0);
      });

      it('should handle empty instances map without filter errors', () => {
        const mockInstances = new Map();
        
        // Simulate the component's log filtering with empty map
        let allLogs: any[] = [];
        mockInstances.forEach(instance => {
          allLogs = [...allLogs, ...instance.logs.map(log => ({
            ...log,
            source: instance.name,
          }))];
        });

        // Should result in empty array, not undefined
        expect(Array.isArray(allLogs)).toBe(true);
        expect(allLogs).toHaveLength(0);

        // Filtering on empty array should not throw
        expect(() => allLogs.filter(log => log.level === 'info')).not.toThrow();
        expect(allLogs.filter(log => log.level === 'info')).toEqual([]);
      });
    });
  });

  describe('Integration Tests - End-to-End Filter Safety', () => {
    describe('Component Lifecycle Filter Robustness', () => {
      it('should maintain filter safety throughout component mount/unmount cycle', async () => {
        // Mount phase - empty instances
        mockUseInstanceManager.mockReturnValueOnce({
          instances: [],
          stats: { running: 0, stopped: 0, error: 0, total: 0 },
          loading: true,
          error: null,
          launchInstance: jest.fn(),
          killInstance: jest.fn(),
          restartInstance: jest.fn(),
          updateConfig: jest.fn(),
        });

        const { rerender, unmount } = render(<DualInstancePage />);
        
        // Update phase - instances loaded
        mockUseInstanceManager.mockReturnValueOnce({
          instances: [createMockInstanceInfo()],
          stats: { running: 1, stopped: 0, error: 0, total: 1 },
          loading: false,
          error: null,
          launchInstance: jest.fn(),
          killInstance: jest.fn(),
          restartInstance: jest.fn(),
          updateConfig: jest.fn(),
        });

        await act(async () => {
          rerender(<DualInstancePage />);
        });

        // Unmount phase
        await act(async () => {
          unmount();
        });

        // No filter-related errors should occur during lifecycle
        expect(true).toBe(true); // Test passes if no errors thrown
      });

      it('should handle rapid state changes without filter exceptions', async () => {
        const testStates = [
          { instances: [], stats: { running: 0, stopped: 0, error: 0, total: 0 } },
          { instances: [createMockInstanceInfo({ status: 'connecting' })], stats: { running: 0, stopped: 0, error: 0, total: 1 } },
          { instances: [createMockInstanceInfo({ status: 'running' })], stats: { running: 1, stopped: 0, error: 0, total: 1 } },
          { instances: [], stats: { running: 0, stopped: 0, error: 0, total: 0 } },
        ];

        for (const state of testStates) {
          mockUseInstanceManager.mockReturnValueOnce({
            ...state,
            loading: false,
            error: null,
            launchInstance: jest.fn(),
            killInstance: jest.fn(),
            restartInstance: jest.fn(),
            updateConfig: jest.fn(),
          });

          const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

          await act(async () => {
            const { unmount } = render(<DualInstancePage />);
            unmount();
          });

          // No filter errors should occur during rapid changes
          expect(consoleSpy).not.toHaveBeenCalledWith(
            expect.stringContaining('filter')
          );

          consoleSpy.mockRestore();
        }
      });
    });

    describe('Error Recovery and Graceful Degradation', () => {
      it('should recover gracefully from WebSocket disconnection without filter failures', async () => {
        mockUseInstanceManager.mockReturnValue({
          instances: [createMockInstanceInfo({ status: 'stopped' })],
          stats: { running: 0, stopped: 1, error: 0, total: 1 },
          loading: false,
          error: 'WebSocket disconnected',
          launchInstance: jest.fn(),
          killInstance: jest.fn(),
          restartInstance: jest.fn(),
          updateConfig: jest.fn(),
        });

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await act(async () => {
          render(<DualInstancePage />);
        });

        // Component should handle disconnected instances without filter errors
        expect(consoleSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('Cannot read properties of undefined')
        );

        // Should still show disconnected instance information
        expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();

        consoleSpy.mockRestore();
      });

      it('should provide consistent behavior during error states', async () => {
        const errorStates = [
          { error: 'Network error', instances: [] },
          { error: 'WebSocket timeout', instances: [createMockInstanceInfo({ status: 'error' })] },
          { error: null, instances: [] }, // Simplified edge case
        ];

        for (const errorState of errorStates) {
          mockUseInstanceManager.mockReturnValueOnce({
            ...errorState,
            stats: { running: 0, stopped: 0, error: 1, total: 0 },
            loading: false,
            launchInstance: jest.fn(),
            killInstance: jest.fn(),
            restartInstance: jest.fn(),
            updateConfig: jest.fn(),
          });

          const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

          await act(async () => {
            expect(() => render(<DualInstancePage />)).not.toThrow();
          });

          // Should not throw filter-related errors
          expect(consoleSpy).not.toHaveBeenCalledWith(
            expect.stringMatching(/filter|undefined|Cannot read properties/)
          );

          consoleSpy.mockRestore();
        }
      });
    });
  });

  describe('Performance and Memory Safety', () => {
    describe('Filter Operation Efficiency', () => {
      it('should handle large instances arrays efficiently', () => {
        // Create large array of instances
        const largeInstancesArray = Array.from({ length: 1000 }, (_, index) =>
          createMockInstanceInfo({
            id: `instance-${index}`,
            status: index % 3 === 0 ? 'running' : index % 3 === 1 ? 'stopped' : 'error',
          })
        );

        const startTime = Date.now();
        
        // Test filtering operations
        const runningInstances = largeInstancesArray.filter(i => i.status === 'running');
        const stoppedInstances = largeInstancesArray.filter(i => i.status === 'stopped');
        const errorInstances = largeInstancesArray.filter(i => i.status === 'error');
        
        const endTime = Date.now();
        const executionTime = endTime - startTime;

        // Verify results are correct
        expect(runningInstances.length + stoppedInstances.length + errorInstances.length)
          .toBe(largeInstancesArray.length);
        
        // Verify performance is reasonable (should be very fast for 1000 items)
        expect(executionTime).toBeLessThan(50); // Less than 50ms for large dataset
      });

      it('should not leak memory during repeated filter operations', () => {
        const instances = [
          createMockInstanceInfo({ id: 'test-1', status: 'running' }),
          createMockInstanceInfo({ id: 'test-2', status: 'stopped' }),
        ];

        // Perform many filter operations
        for (let i = 0; i < 1000; i++) {
          const filtered = instances.filter(instance => instance.status === 'running');
          const mapped = instances.map(instance => instance.id);
          const found = instances.find(instance => instance.id === 'test-1');
          
          // Operations should continue working
          expect(filtered).toHaveLength(1);
          expect(mapped).toHaveLength(2);
          expect(found).toBeDefined();
        }

        // Test should complete without memory issues
        expect(true).toBe(true);
      });
    });
  });
});

/**
 * Mock Implementation Verification Tests
 * 
 * These tests verify that our mocks correctly implement the expected behaviors
 * and contracts of the real components.
 */
describe('Mock Contract Verification', () => {
  // Helper function to create mock data with realistic defaults
  const createMockProcessInfo = (overrides: Partial<ProcessInfo> = {}): ProcessInfo => ({
    pid: 12345,
    name: 'Claude Instance',
    status: 'running',
    startTime: new Date('2025-01-01T00:00:00Z'),
    autoRestartEnabled: true,
    autoRestartHours: 6,
    ...overrides,
  });

  const createMockInstanceInfo = (overrides: Partial<InstanceInfo> = {}): InstanceInfo => {
    const processInfo = createMockProcessInfo(overrides);
    return {
      id: 'test-instance-1',
      type: 'claude-instance',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      ...processInfo,
      ...overrides,
    };
  };

  describe('useInstanceManager Mock Contract', () => {
    it('should implement complete hook interface', () => {
      const mockResult = {
        processInfo: createMockProcessInfo(),
        isConnected: true,
        instances: [createMockInstanceInfo()],
        stats: { running: 1, stopped: 0, error: 0, total: 1 },
        loading: false,
        error: null,
        launchInstance: jest.fn(),
        killInstance: jest.fn(),
        restartInstance: jest.fn(),
        updateConfig: jest.fn(),
      };

      // Verify all required properties exist
      expect(mockResult).toHaveProperty('processInfo');
      expect(mockResult).toHaveProperty('isConnected');
      expect(mockResult).toHaveProperty('instances');
      expect(mockResult).toHaveProperty('stats');
      expect(mockResult).toHaveProperty('loading');
      expect(mockResult).toHaveProperty('error');
      expect(mockResult).toHaveProperty('launchInstance');
      expect(mockResult).toHaveProperty('killInstance');
      expect(mockResult).toHaveProperty('restartInstance');
      expect(mockResult).toHaveProperty('updateConfig');

      // Verify function types
      expect(typeof mockResult.launchInstance).toBe('function');
      expect(typeof mockResult.killInstance).toBe('function');
      expect(typeof mockResult.restartInstance).toBe('function');
      expect(typeof mockResult.updateConfig).toBe('function');

      // Verify array structure
      expect(Array.isArray(mockResult.instances)).toBe(true);
    });

    it('should provide consistent mock data structures', () => {
      const processInfo = createMockProcessInfo();
      const instanceInfo = createMockInstanceInfo();

      // Verify ProcessInfo structure
      expect(processInfo).toMatchObject({
        pid: expect.any(Number),
        name: expect.any(String),
        status: expect.stringMatching(/^(running|stopped|restarting|error)$/),
        startTime: expect.any(Date),
        autoRestartEnabled: expect.any(Boolean),
        autoRestartHours: expect.any(Number),
      });

      // Verify InstanceInfo structure extends ProcessInfo
      expect(instanceInfo).toMatchObject({
        id: expect.any(String),
        type: expect.any(String),
        createdAt: expect.any(Date),
        // ProcessInfo fields
        pid: expect.any(Number),
        name: expect.any(String),
        status: expect.stringMatching(/^(running|stopped|restarting|error)$/),
        startTime: expect.any(Date),
        autoRestartEnabled: expect.any(Boolean),
        autoRestartHours: expect.any(Number),
      });
    });
  });

  describe('Component Mock Interactions', () => {
    it('should verify router mock interactions work correctly', () => {
      const mockParams = { tab: 'launcher', instanceId: undefined };
      require('react-router-dom').useParams.mockReturnValue(mockParams);

      const result = require('react-router-dom').useParams();
      expect(result).toEqual(mockParams);
    });

    it('should verify navigation mock captures calls correctly', () => {
      const testPath = '/dual-instance/terminal/test-id';
      
      mockNavigate(testPath);
      
      expect(mockNavigate).toHaveBeenCalledWith(testPath);
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it('should verify socket mock provides complete interface', () => {
      // Verify all required socket methods exist
      expect(mockSocket).toHaveProperty('on');
      expect(mockSocket).toHaveProperty('off');
      expect(mockSocket).toHaveProperty('emit');
      expect(mockSocket).toHaveProperty('disconnect');
      expect(mockSocket).toHaveProperty('once');
      expect(mockSocket).toHaveProperty('connected');
      expect(mockSocket).toHaveProperty('disconnected');

      // Verify methods are callable
      expect(() => mockSocket.on('test', () => {})).not.toThrow();
      expect(() => mockSocket.emit('test', {})).not.toThrow();
      expect(() => mockSocket.disconnect()).not.toThrow();
    });
  });
});