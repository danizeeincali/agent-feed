/**
 * End-to-End Validation Tests for Instance State Consistency
 * 
 * These tests simulate real user workflows to ensure all fixes work together
 * in actual usage scenarios.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import { DualInstanceMonitor } from '../../../src/components/DualInstanceMonitor';
import { InstanceLauncher } from '../../../src/components/InstanceLauncher';
import { WebSocketSingletonContext } from '../../../src/context/WebSocketSingletonContext';
import userEvent from '@testing-library/user-event';

describe('End-to-End Instance State Validation', () => {
  let mockWebSocketService: any;
  let user: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    user = userEvent.setup();
    
    mockWebSocketService = {
      isConnected: jest.fn(() => true),
      connect: jest.fn(),
      disconnect: jest.fn(),
      send: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      getInstances: jest.fn(() => []),
      getInstanceStats: jest.fn(() => ({ running: 0, stopped: 0, total: 0 })),
      getInstanceById: jest.fn(),
      findInstanceByName: jest.fn(),
      launchInstance: jest.fn(),
      stopInstance: jest.fn(),
      restartInstance: jest.fn()
    };
  });

  const renderWithContext = (component: React.ReactElement) => {
    return render(
      <WebSocketSingletonContext.Provider value={mockWebSocketService}>
        {component}
      </WebSocketSingletonContext.Provider>
    );
  };

  describe('Complete User Workflow: Launch → Monitor → Terminal → Stop', () => {
    it('should handle complete instance lifecycle without errors', async () => {
      // Step 1: Initial state - no instances
      renderWithContext(<DualInstanceMonitor />);
      
      await waitFor(() => {
        expect(screen.getByText(/Running: 0/)).toBeInTheDocument();
        expect(screen.getByText(/Stopped: 0/)).toBeInTheDocument();
        expect(screen.getByText(/Total: 0/)).toBeInTheDocument();
      });
      
      // Step 2: Launch instance
      const launchButton = screen.getByRole('button', { name: /launch/i });
      await user.click(launchButton);
      
      // Simulate successful launch
      const newInstance = {
        id: 'e2e-test-instance',
        name: 'E2E Test Instance',
        status: 'running',
        pid: 12345,
        startTime: new Date('2024-01-01T10:00:00Z'),
        port: 3001,
        logs: ['Instance launched successfully'],
        config: { name: 'E2E Test Instance', port: 3001 }
      };
      
      act(() => {
        mockWebSocketService.getInstances.mockReturnValue([newInstance]);
        mockWebSocketService.getInstanceStats.mockReturnValue({
          running: 1,
          stopped: 0,
          total: 1
        });
        mockWebSocketService.getInstanceById.mockReturnValue(newInstance);
        mockWebSocketService.emit('instance-launched', newInstance);
      });
      
      // Step 3: Verify stats update correctly
      await waitFor(() => {
        expect(screen.getByText(/Running: 1/)).toBeInTheDocument();
        expect(screen.getByText(/Stopped: 0/)).toBeInTheDocument();
        expect(screen.getByText(/Total: 1/)).toBeInTheDocument();
        expect(screen.getByText('E2E Test Instance')).toBeInTheDocument();
      });
      
      // Step 4: Navigate to terminal
      const terminalButton = screen.getByRole('button', { name: /terminal/i });
      expect(terminalButton).toBeEnabled();
      
      await user.click(terminalButton);
      
      await waitFor(() => {
        expect(mockWebSocketService.send).toHaveBeenCalledWith({
          type: 'navigate-to-terminal',
          instanceId: 'e2e-test-instance'
        });
      });
      
      // Step 5: Verify instance details remain consistent
      expect(screen.getByText(/2024-01-01T10:00:00/)).toBeInTheDocument();
      expect(screen.getByText(/PID: 12345/)).toBeInTheDocument();
      expect(screen.getByText(/Port: 3001/)).toBeInTheDocument();
      
      // Step 6: Stop instance
      const stopButton = screen.getByRole('button', { name: /stop/i });
      await user.click(stopButton);
      
      // Simulate instance stopping
      act(() => {
        const stoppedInstance = { ...newInstance, status: 'stopped', pid: null };
        mockWebSocketService.getInstances.mockReturnValue([stoppedInstance]);
        mockWebSocketService.getInstanceStats.mockReturnValue({
          running: 0,
          stopped: 1,
          total: 1
        });
        mockWebSocketService.emit('instance-stopped', stoppedInstance);
      });
      
      // Step 7: Verify final state
      await waitFor(() => {
        expect(screen.getByText(/Running: 0/)).toBeInTheDocument();
        expect(screen.getByText(/Stopped: 1/)).toBeInTheDocument();
        expect(screen.getByText(/Total: 1/)).toBeInTheDocument();
      });
      
      // Verify start time is preserved (doesn't change when stopped)
      expect(screen.getByText(/2024-01-01T10:00:00/)).toBeInTheDocument();
    });
  });

  describe('Multi-Instance Management Workflow', () => {
    it('should handle multiple instances with consistent state', async () => {
      renderWithContext(<DualInstanceMonitor />);
      
      const instances = [
        {
          id: 'instance-1',
          name: 'Production Instance',
          status: 'running',
          pid: 11111,
          startTime: new Date('2024-01-01T09:00:00Z'),
          port: 3001
        },
        {
          id: 'instance-2',
          name: 'Development Instance',
          status: 'running',
          pid: 22222,
          startTime: new Date('2024-01-01T10:00:00Z'),
          port: 3002
        },
        {
          id: 'instance-3',
          name: 'Testing Instance',
          status: 'stopped',
          pid: null,
          startTime: new Date('2024-01-01T08:00:00Z'),
          port: 3003
        }
      ];
      
      act(() => {
        mockWebSocketService.getInstances.mockReturnValue(instances);
        mockWebSocketService.getInstanceStats.mockReturnValue({
          running: 2,
          stopped: 1,
          total: 3
        });
      });
      
      // Refresh to show instances
      await user.click(screen.getByText('Refresh'));
      
      await waitFor(() => {
        expect(screen.getByText(/Running: 2/)).toBeInTheDocument();
        expect(screen.getByText(/Stopped: 1/)).toBeInTheDocument();
        expect(screen.getByText(/Total: 3/)).toBeInTheDocument();
      });
      
      // Verify all instances are displayed
      expect(screen.getByText('Production Instance')).toBeInTheDocument();
      expect(screen.getByText('Development Instance')).toBeInTheDocument();
      expect(screen.getByText('Testing Instance')).toBeInTheDocument();
      
      // Test navigation to each running instance
      const runningInstances = instances.filter(i => i.status === 'running');
      
      for (const instance of runningInstances) {
        mockWebSocketService.getInstanceById.mockReturnValue(instance);
        
        const instanceRow = screen.getByText(instance.name).closest('[data-testid="instance-row"]');
        const terminalButton = instanceRow?.querySelector('button[aria-label*="terminal"]');
        
        if (terminalButton) {
          await user.click(terminalButton);
          
          await waitFor(() => {
            expect(mockWebSocketService.send).toHaveBeenCalledWith({
              type: 'navigate-to-terminal',
              instanceId: instance.id
            });
          });
        }
      }
      
      // Verify stopped instance has disabled terminal button
      const stoppedInstanceRow = screen.getByText('Testing Instance').closest('[data-testid="instance-row"]');
      const stoppedTerminalButton = stoppedInstanceRow?.querySelector('button[aria-label*="terminal"]');
      
      if (stoppedTerminalButton) {
        expect(stoppedTerminalButton).toBeDisabled();
      }
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should recover from WebSocket disconnection', async () => {
      // Start connected
      renderWithContext(<DualInstanceMonitor />);
      
      expect(screen.getByText(/connected/i)).toBeInTheDocument();
      
      // Simulate disconnection
      act(() => {
        mockWebSocketService.isConnected.mockReturnValue(false);
        mockWebSocketService.emit('disconnect');
      });
      
      await waitFor(() => {
        expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
      });
      
      // Attempt to reconnect
      const reconnectButton = screen.getByRole('button', { name: /reconnect/i });
      await user.click(reconnectButton);
      
      // Simulate successful reconnection
      act(() => {
        mockWebSocketService.isConnected.mockReturnValue(true);
        mockWebSocketService.emit('connect');
      });
      
      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });
      
      // Verify functionality is restored
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);
      
      expect(mockWebSocketService.send).toHaveBeenCalledWith({
        type: 'get-instances'
      });
    });

    it('should handle instance crash and recovery', async () => {
      renderWithContext(<DualInstanceMonitor />);
      
      const instance = {
        id: 'crash-test-instance',
        name: 'Crash Test Instance',
        status: 'running',
        pid: 55555,
        startTime: new Date('2024-01-01T10:00:00Z'),
        port: 3001
      };
      
      // Initial running state
      act(() => {
        mockWebSocketService.getInstances.mockReturnValue([instance]);
        mockWebSocketService.getInstanceStats.mockReturnValue({
          running: 1,
          stopped: 0,
          total: 1
        });
      });
      
      await user.click(screen.getByText('Refresh'));
      
      await waitFor(() => {
        expect(screen.getByText(/Running: 1/)).toBeInTheDocument();
        expect(screen.getByText('Crash Test Instance')).toBeInTheDocument();
      });
      
      // Simulate instance crash
      act(() => {
        const crashedInstance = { 
          ...instance, 
          status: 'crashed', 
          pid: null,
          exitCode: 1,
          crashReason: 'Unexpected error'
        };
        mockWebSocketService.getInstances.mockReturnValue([crashedInstance]);
        mockWebSocketService.getInstanceStats.mockReturnValue({
          running: 0,
          stopped: 0,
          crashed: 1,
          total: 1
        });
        mockWebSocketService.emit('instance-crashed', crashedInstance);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/crashed/i)).toBeInTheDocument();
        // Start time should be preserved even after crash
        expect(screen.getByText(/2024-01-01T10:00:00/)).toBeInTheDocument();
      });
      
      // Attempt restart
      const restartButton = screen.getByRole('button', { name: /restart/i });
      await user.click(restartButton);
      
      // Simulate successful restart
      act(() => {
        const restartedInstance = {
          ...instance,
          status: 'running',
          pid: 66666,
          // Start time changes on restart
          startTime: new Date('2024-01-01T11:00:00Z')
        };
        mockWebSocketService.getInstances.mockReturnValue([restartedInstance]);
        mockWebSocketService.getInstanceStats.mockReturnValue({
          running: 1,
          stopped: 0,
          total: 1
        });
        mockWebSocketService.emit('instance-restarted', restartedInstance);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Running: 1/)).toBeInTheDocument();
        // New start time after restart
        expect(screen.getByText(/2024-01-01T11:00:00/)).toBeInTheDocument();
        expect(screen.getByText(/PID: 66666/)).toBeInTheDocument();
      });
    });
  });

  describe('Performance Under Load Workflow', () => {
    it('should maintain responsiveness with frequent updates', async () => {
      renderWithContext(<DualInstanceMonitor />);
      
      const instances = Array.from({ length: 10 }, (_, i) => ({
        id: `perf-instance-${i}`,
        name: `Performance Test ${i}`,
        status: i % 3 === 0 ? 'running' : 'stopped',
        pid: i % 3 === 0 ? 10000 + i : null,
        startTime: new Date(`2024-01-01T${String(10 + i).padStart(2, '0')}:00:00Z`),
        port: 3000 + i
      }));
      
      mockWebSocketService.getInstances.mockReturnValue(instances);
      const runningCount = instances.filter(i => i.status === 'running').length;
      const stoppedCount = instances.filter(i => i.status === 'stopped').length;
      
      mockWebSocketService.getInstanceStats.mockReturnValue({
        running: runningCount,
        stopped: stoppedCount,
        total: instances.length
      });
      
      const startTime = performance.now();
      
      // Simulate rapid updates
      for (let i = 0; i < 50; i++) {
        act(() => {
          // Randomly change instance statuses
          const randomInstance = instances[i % instances.length];
          randomInstance.status = randomInstance.status === 'running' ? 'stopped' : 'running';
          mockWebSocketService.emit('instance-update', randomInstance);
        });
        
        // Small delay to prevent overwhelming the test
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should handle updates within reasonable time (< 2 seconds for 50 updates)
      expect(duration).toBeLessThan(2000);
      
      // UI should still be responsive
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeEnabled();
      
      await user.click(refreshButton);
      
      // Should respond to user interaction quickly
      const clickTime = performance.now();
      await waitFor(() => {
        expect(mockWebSocketService.send).toHaveBeenCalledWith({
          type: 'get-instances'
        });
      }, { timeout: 1000 });
      
      const responseTime = performance.now() - clickTime;
      expect(responseTime).toBeLessThan(500); // Should respond within 500ms
    });
  });

  describe('Data Persistence Workflow', () => {
    it('should maintain instance data across component unmount/remount', async () => {
      const { unmount } = renderWithContext(<DualInstanceMonitor />);
      
      const instance = {
        id: 'persistent-instance',
        name: 'Persistent Test',
        status: 'running',
        pid: 77777,
        startTime: new Date('2024-01-01T10:00:00Z'),
        port: 3001
      };
      
      mockWebSocketService.getInstances.mockReturnValue([instance]);
      mockWebSocketService.getInstanceStats.mockReturnValue({
        running: 1,
        stopped: 0,
        total: 1
      });
      
      // Unmount component
      unmount();
      
      // Verify cleanup
      expect(mockWebSocketService.off).toHaveBeenCalled();
      
      // Remount component
      const { } = renderWithContext(<DualInstanceMonitor />);
      
      await waitFor(() => {
        // Data should be restored
        expect(screen.getByText('Persistent Test')).toBeInTheDocument();
        expect(screen.getByText(/Running: 1/)).toBeInTheDocument();
        expect(screen.getByText(/2024-01-01T10:00:00/)).toBeInTheDocument();
      });
      
      // Verify event listeners are re-established
      expect(mockWebSocketService.on).toHaveBeenCalled();
    });
  });
});