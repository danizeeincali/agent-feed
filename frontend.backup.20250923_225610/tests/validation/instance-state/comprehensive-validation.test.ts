/**
 * Comprehensive Instance State Consistency Validation Tests
 * 
 * This test suite validates all fixes for instance state consistency issues:
 * 1. Stats calculation fixes
 * 2. Terminal navigation improvements
 * 3. Instance ID stability
 * 4. Timestamp consistency
 * 5. Navigation functionality
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import React from 'react';
import { DualInstanceMonitor } from '../../../src/components/DualInstanceMonitor';
import { InstanceLauncher } from '../../../src/components/InstanceLauncher';
import { WebSocketSingletonContext } from '../../../src/context/WebSocketSingletonContext';
import { mockWebSocket } from '../../setup/testSetup';

describe('Instance State Consistency Validation', () => {
  let mockWebSocketService: any;
  let mockInstances: any[];
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup consistent test instances with stable IDs
    mockInstances = [
      {
        id: 'stable-uuid-123',
        name: 'Test Instance',
        status: 'running',
        pid: 12345,
        startTime: new Date('2024-01-01T10:00:00Z'),
        port: 3001,
        logs: ['Instance started'],
        config: { name: 'Test Instance', port: 3001 }
      }
    ];
    
    mockWebSocketService = {
      isConnected: jest.fn(() => true),
      connect: jest.fn(),
      disconnect: jest.fn(),
      send: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      getInstances: jest.fn(() => mockInstances),
      getInstanceStats: jest.fn(() => ({
        running: mockInstances.filter(i => i.status === 'running').length,
        stopped: mockInstances.filter(i => i.status === 'stopped').length,
        total: mockInstances.length
      }))
    };
  });

  const renderWithContext = (component: React.ReactElement) => {
    return render(
      React.createElement(WebSocketSingletonContext.Provider, {
        value: mockWebSocketService
      }, component)
    );
  };

  describe('1. Stats Calculation Validation', () => {
    it('should correctly calculate stats using instances array', async () => {
      renderWithContext(React.createElement(DualInstanceMonitor));
      
      await waitFor(() => {
        expect(screen.getByText(/Running: 1/)).toBeInTheDocument();
        expect(screen.getByText(/Stopped: 0/)).toBeInTheDocument();
        expect(screen.getByText(/Total: 1/)).toBeInTheDocument();
      });
    });

    it('should update stats when instance status changes', async () => {
      renderWithContext(React.createElement(DualInstanceMonitor));
      
      // Simulate instance stopping
      act(() => {
        mockInstances[0].status = 'stopped';
        mockWebSocketService.getInstanceStats.mockReturnValue({
          running: 0,
          stopped: 1,
          total: 1
        });
      });
      
      // Trigger re-render
      fireEvent.click(screen.getByText('Refresh'));
      
      await waitFor(() => {
        expect(screen.getByText(/Running: 0/)).toBeInTheDocument();
        expect(screen.getByText(/Stopped: 1/)).toBeInTheDocument();
      });
    });

    it('should handle multiple instances correctly', async () => {
      mockInstances.push({
        id: 'stable-uuid-456',
        name: 'Test Instance 2',
        status: 'stopped',
        pid: null,
        startTime: new Date('2024-01-01T11:00:00Z'),
        port: 3002,
        logs: [],
        config: { name: 'Test Instance 2', port: 3002 }
      });

      mockWebSocketService.getInstanceStats.mockReturnValue({
        running: 1,
        stopped: 1,
        total: 2
      });

      renderWithContext(React.createElement(DualInstanceMonitor));
      
      await waitFor(() => {
        expect(screen.getByText(/Running: 1/)).toBeInTheDocument();
        expect(screen.getByText(/Stopped: 1/)).toBeInTheDocument();
        expect(screen.getByText(/Total: 2/)).toBeInTheDocument();
      });
    });
  });

  describe('2. Terminal Navigation Validation', () => {
    it('should find instance by stable ID for terminal navigation', async () => {
      renderWithContext(React.createElement(DualInstanceMonitor));
      
      const terminalButton = screen.getByRole('button', { name: /terminal/i });
      fireEvent.click(terminalButton);
      
      await waitFor(() => {
        expect(mockWebSocketService.send).toHaveBeenCalledWith({
          type: 'get-instance-logs',
          instanceId: 'stable-uuid-123'
        });
      });
      
      // Verify no "Instance Not Found" errors
      expect(screen.queryByText(/instance not found/i)).not.toBeInTheDocument();
    });

    it('should provide fallback navigation when primary lookup fails', async () => {
      // Mock scenario where direct ID lookup fails but fallback succeeds
      const mockGetInstanceById = jest.fn()
        .mockReturnValueOnce(null) // First call fails
        .mockReturnValueOnce(mockInstances[0]); // Fallback succeeds
      
      mockWebSocketService.getInstanceById = mockGetInstanceById;
      mockWebSocketService.findInstanceByName = jest.fn(() => mockInstances[0]);
      
      renderWithContext(React.createElement(DualInstanceMonitor));
      
      const terminalButton = screen.getByRole('button', { name: /terminal/i });
      fireEvent.click(terminalButton);
      
      await waitFor(() => {
        expect(mockGetInstanceById).toHaveBeenCalledTimes(2);
        expect(mockWebSocketService.findInstanceByName).toHaveBeenCalled();
      });
    });
  });

  describe('3. Instance ID Stability Validation', () => {
    it('should maintain stable UUID across component re-renders', () => {
      const { rerender } = renderWithContext(React.createElement(DualInstanceMonitor));
      
      const initialInstanceElement = screen.getByText('Test Instance');
      const initialId = initialInstanceElement.getAttribute('data-instance-id');
      
      // Re-render component
      rerender(
        React.createElement(WebSocketSingletonContext.Provider, {
          value: mockWebSocketService
        }, React.createElement(DualInstanceMonitor))
      );
      
      const rerenderedInstanceElement = screen.getByText('Test Instance');
      const rerenderedId = rerenderedInstanceElement.getAttribute('data-instance-id');
      
      expect(initialId).toBe('stable-uuid-123');
      expect(rerenderedId).toBe('stable-uuid-123');
      expect(initialId).toBe(rerenderedId);
    });

    it('should persist instance ID across process restart simulation', async () => {
      renderWithContext(React.createElement(DualInstanceMonitor));
      
      const originalInstance = mockInstances[0];
      expect(originalInstance.id).toBe('stable-uuid-123');
      
      // Simulate process restart - ID should remain stable
      act(() => {
        mockInstances[0] = {
          ...originalInstance,
          pid: 54321, // New PID
          startTime: new Date('2024-01-01T12:00:00Z'), // New start time
          id: 'stable-uuid-123' // Same stable ID
        };
      });
      
      fireEvent.click(screen.getByText('Refresh'));
      
      await waitFor(() => {
        const instanceElement = screen.getByText('Test Instance');
        expect(instanceElement.getAttribute('data-instance-id')).toBe('stable-uuid-123');
      });
    });
  });

  describe('4. Timestamp Consistency Validation', () => {
    it('should maintain consistent timestamps across view toggles', async () => {
      renderWithContext(React.createElement(DualInstanceMonitor));
      
      const initialTimestamp = screen.getByText(/2024-01-01T10:00:00/);
      expect(initialTimestamp).toBeInTheDocument();
      
      // Toggle to different view and back
      const settingsTab = screen.getByRole('tab', { name: /settings/i });
      fireEvent.click(settingsTab);
      
      const monitorTab = screen.getByRole('tab', { name: /monitor/i });
      fireEvent.click(monitorTab);
      
      await waitFor(() => {
        const consistentTimestamp = screen.getByText(/2024-01-01T10:00:00/);
        expect(consistentTimestamp).toBeInTheDocument();
      });
    });

    it('should not update start time on status changes', async () => {
      renderWithContext(React.createElement(DualInstanceMonitor));
      
      const originalStartTime = mockInstances[0].startTime;
      
      // Change status but preserve start time
      act(() => {
        mockInstances[0].status = 'stopped';
        // Start time should NOT change
      });
      
      fireEvent.click(screen.getByText('Refresh'));
      
      await waitFor(() => {
        expect(mockInstances[0].startTime).toBe(originalStartTime);
        expect(screen.getByText(/2024-01-01T10:00:00/)).toBeInTheDocument();
      });
    });
  });

  describe('5. Terminal Button Functionality Validation', () => {
    it('should render clickable terminal button', async () => {
      renderWithContext(React.createElement(DualInstanceMonitor));
      
      const terminalButton = screen.getByRole('button', { name: /terminal/i });
      
      expect(terminalButton).toBeInTheDocument();
      expect(terminalButton).toBeEnabled();
      expect(terminalButton).not.toHaveAttribute('disabled');
    });

    it('should handle terminal button click correctly', async () => {
      renderWithContext(React.createElement(DualInstanceMonitor));
      
      const terminalButton = screen.getByRole('button', { name: /terminal/i });
      
      fireEvent.click(terminalButton);
      
      await waitFor(() => {
        expect(mockWebSocketService.send).toHaveBeenCalledWith({
          type: 'navigate-to-terminal',
          instanceId: 'stable-uuid-123'
        });
      });
    });

    it('should disable terminal button for stopped instances', async () => {
      mockInstances[0].status = 'stopped';
      
      renderWithContext(React.createElement(DualInstanceMonitor));
      
      const terminalButton = screen.getByRole('button', { name: /terminal/i });
      
      expect(terminalButton).toBeDisabled();
    });
  });

  describe('6. Integration Test Scenarios', () => {
    it('should handle complete instance lifecycle', async () => {
      renderWithContext(React.createElement(InstanceLauncher));
      
      // Launch instance
      const launchButton = screen.getByRole('button', { name: /launch/i });
      fireEvent.click(launchButton);
      
      await waitFor(() => {
        expect(mockWebSocketService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'launch-instance'
          })
        );
      });
      
      // Verify instance appears with correct stats
      expect(screen.getByText(/Running: 1/)).toBeInTheDocument();
      
      // Navigate to terminal
      const terminalButton = screen.getByRole('button', { name: /terminal/i });
      fireEvent.click(terminalButton);
      
      await waitFor(() => {
        expect(mockWebSocketService.send).toHaveBeenCalledWith({
          type: 'get-instance-logs',
          instanceId: 'stable-uuid-123'
        });
      });
      
      // Stop instance
      const stopButton = screen.getByRole('button', { name: /stop/i });
      fireEvent.click(stopButton);
      
      await waitFor(() => {
        expect(mockWebSocketService.send).toHaveBeenCalledWith({
          type: 'stop-instance',
          instanceId: 'stable-uuid-123'
        });
      });
    });

    it('should handle error recovery scenarios', async () => {
      // Mock WebSocket disconnection
      mockWebSocketService.isConnected.mockReturnValue(false);
      
      renderWithContext(React.createElement(DualInstanceMonitor));
      
      expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
      
      // Reconnection
      act(() => {
        mockWebSocketService.isConnected.mockReturnValue(true);
      });
      
      fireEvent.click(screen.getByText('Reconnect'));
      
      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });
    });
  });

  describe('7. Performance and Memory Validation', () => {
    it('should not cause memory leaks with frequent updates', async () => {
      const { unmount } = renderWithContext(React.createElement(DualInstanceMonitor));
      
      // Simulate frequent updates
      for (let i = 0; i < 100; i++) {
        act(() => {
          mockWebSocketService.emit('instance-update', mockInstances[0]);
        });
      }
      
      // Component should handle updates gracefully
      expect(screen.getByText('Test Instance')).toBeInTheDocument();
      
      // Cleanup should work properly
      unmount();
      
      expect(mockWebSocketService.off).toHaveBeenCalled();
    });

    it('should handle large numbers of instances efficiently', async () => {
      // Generate 100 test instances
      const manyInstances = Array.from({ length: 100 }, (_, i) => ({
        id: `stable-uuid-${i}`,
        name: `Instance ${i}`,
        status: i % 2 === 0 ? 'running' : 'stopped',
        pid: i % 2 === 0 ? 1000 + i : null,
        startTime: new Date(`2024-01-01T${String(i % 24).padStart(2, '0')}:00:00Z`),
        port: 3000 + i,
        logs: [],
        config: { name: `Instance ${i}`, port: 3000 + i }
      }));
      
      mockWebSocketService.getInstances.mockReturnValue(manyInstances);
      mockWebSocketService.getInstanceStats.mockReturnValue({
        running: 50,
        stopped: 50,
        total: 100
      });
      
      const startTime = performance.now();
      renderWithContext(React.createElement(DualInstanceMonitor));
      const endTime = performance.now();
      
      // Should render within reasonable time (< 1000ms)
      expect(endTime - startTime).toBeLessThan(1000);
      
      await waitFor(() => {
        expect(screen.getByText(/Running: 50/)).toBeInTheDocument();
        expect(screen.getByText(/Stopped: 50/)).toBeInTheDocument();
        expect(screen.getByText(/Total: 100/)).toBeInTheDocument();
      });
    });
  });
});