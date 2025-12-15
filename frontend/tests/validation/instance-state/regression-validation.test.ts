/**
 * Regression Validation Tests for Instance State Consistency
 * 
 * These tests specifically validate that previous bugs do not reappear:
 * - Stats showing incorrect counts
 * - "Instance Not Found" errors
 * - Instance IDs changing unexpectedly
 * - Timestamps updating incorrectly
 * - Navigation failures
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import { DualInstanceMonitor } from '../../../src/components/DualInstanceMonitor';
import { InstanceLauncher } from '../../../src/components/InstanceLauncher';
import { WebSocketSingletonContext } from '../../../src/context/WebSocketSingletonContext';

describe('Regression Tests - Instance State Consistency', () => {
  let mockWebSocketService: any;
  let consoleErrorSpy: jest.SpyInstance;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Spy on console.error to catch any errors
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
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
      findInstanceByName: jest.fn()
    };
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  const renderWithContext = (component: React.ReactElement) => {
    return render(
      <WebSocketSingletonContext.Provider value={mockWebSocketService}>
        {component}
      </WebSocketSingletonContext.Provider>
    );
  };

  describe('Regression: Stats Mismatch Bug', () => {
    it('should NOT use processInfo for stats calculation', async () => {
      // Setup scenario that previously caused the bug
      const mockInstances = [
        { id: 'inst-1', status: 'running', name: 'Instance 1' },
        { id: 'inst-2', status: 'stopped', name: 'Instance 2' }
      ];
      
      const mockProcessInfo = [
        { pid: 123, status: 'running' },
        { pid: 456, status: 'running' },
        { pid: 789, status: 'running' }
      ];
      
      mockWebSocketService.getInstances.mockReturnValue(mockInstances);
      mockWebSocketService.getProcessInfo = jest.fn(() => mockProcessInfo);
      
      // Stats should be calculated from instances, not processInfo
      mockWebSocketService.getInstanceStats.mockReturnValue({
        running: mockInstances.filter(i => i.status === 'running').length,
        stopped: mockInstances.filter(i => i.status === 'stopped').length,
        total: mockInstances.length
      });
      
      renderWithContext(<DualInstanceMonitor />);
      
      await waitFor(() => {
        // Should show correct stats from instances (1 running, 1 stopped)
        // NOT from processInfo (3 running)
        expect(screen.getByText(/Running: 1/)).toBeInTheDocument();
        expect(screen.getByText(/Stopped: 1/)).toBeInTheDocument();
        expect(screen.queryByText(/Running: 3/)).not.toBeInTheDocument();
      });
      
      // Verify processInfo was not used for stats
      expect(mockWebSocketService.getProcessInfo).not.toHaveBeenCalled();
    });
  });

  describe('Regression: Instance Not Found Error', () => {
    it('should NOT show "Instance Not Found" for valid instances', async () => {
      const mockInstance = {
        id: 'stable-test-id',
        name: 'Test Instance',
        status: 'running',
        pid: 12345
      };
      
      mockWebSocketService.getInstances.mockReturnValue([mockInstance]);
      mockWebSocketService.getInstanceById.mockReturnValue(mockInstance);
      
      renderWithContext(<DualInstanceMonitor />);
      
      const terminalButton = screen.getByRole('button', { name: /terminal/i });
      fireEvent.click(terminalButton);
      
      await waitFor(() => {
        // Should NOT show any "Instance Not Found" errors
        expect(screen.queryByText(/instance not found/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/error.*instance/i)).not.toBeInTheDocument();
      });
      
      // Should not log any errors
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/instance not found/i)
      );
    });

    it('should use fallback lookup when primary ID fails', async () => {
      const mockInstance = {
        id: 'stable-test-id',
        name: 'Test Instance',
        status: 'running',
        pid: 12345
      };
      
      mockWebSocketService.getInstances.mockReturnValue([mockInstance]);
      // Primary lookup fails
      mockWebSocketService.getInstanceById.mockReturnValue(null);
      // Fallback by name succeeds
      mockWebSocketService.findInstanceByName.mockReturnValue(mockInstance);
      
      renderWithContext(<DualInstanceMonitor />);
      
      const terminalButton = screen.getByRole('button', { name: /terminal/i });
      fireEvent.click(terminalButton);
      
      await waitFor(() => {
        // Should successfully navigate without errors
        expect(mockWebSocketService.findInstanceByName).toHaveBeenCalledWith('Test Instance');
        expect(screen.queryByText(/instance not found/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Regression: Instance ID Instability', () => {
    it('should NOT generate new IDs on re-renders', () => {
      const mockInstance = {
        id: 'original-stable-id',
        name: 'Test Instance',
        status: 'running'
      };
      
      mockWebSocketService.getInstances.mockReturnValue([mockInstance]);
      
      const { rerender } = renderWithContext(<DualInstanceMonitor />);
      
      // Capture original ID
      const originalElement = screen.getByText('Test Instance');
      const originalId = originalElement.closest('[data-instance-id]')?.getAttribute('data-instance-id');
      
      // Force multiple re-renders
      for (let i = 0; i < 5; i++) {
        rerender(
          <WebSocketSingletonContext.Provider value={mockWebSocketService}>
            <DualInstanceMonitor />
          </WebSocketSingletonContext.Provider>
        );
      }
      
      // ID should remain stable
      const finalElement = screen.getByText('Test Instance');
      const finalId = finalElement.closest('[data-instance-id]')?.getAttribute('data-instance-id');
      
      expect(originalId).toBe('original-stable-id');
      expect(finalId).toBe('original-stable-id');
      expect(originalId).toBe(finalId);
    });
  });

  describe('Regression: Timestamp Changes', () => {
    it('should NOT update start time on status changes', async () => {
      const fixedStartTime = new Date('2024-01-01T10:00:00Z');
      const mockInstance = {
        id: 'test-id',
        name: 'Test Instance',
        status: 'running',
        startTime: fixedStartTime
      };
      
      mockWebSocketService.getInstances.mockReturnValue([mockInstance]);
      
      renderWithContext(<DualInstanceMonitor />);
      
      // Initial render shows start time
      await waitFor(() => {
        expect(screen.getByText(/2024-01-01T10:00:00/)).toBeInTheDocument();
      });
      
      // Change status but keep same start time
      act(() => {
        mockInstance.status = 'stopped';
        // startTime should NOT change
        mockWebSocketService.emit('instance-update', mockInstance);
      });
      
      await waitFor(() => {
        // Start time should remain the same
        expect(screen.getByText(/2024-01-01T10:00:00/)).toBeInTheDocument();
        // Should not show any new timestamps
        expect(screen.queryByText(/2024-01-01T1[1-9]:/)).not.toBeInTheDocument();
      });
    });

    it('should maintain timestamp consistency across tab switches', async () => {
      const mockInstance = {
        id: 'test-id',
        name: 'Test Instance',
        status: 'running',
        startTime: new Date('2024-01-01T10:00:00Z')
      };
      
      mockWebSocketService.getInstances.mockReturnValue([mockInstance]);
      
      renderWithContext(<DualInstanceMonitor />);
      
      // Verify initial timestamp
      const initialTimestamp = screen.getByText(/2024-01-01T10:00:00/);
      expect(initialTimestamp).toBeInTheDocument();
      
      // Switch tabs multiple times
      const tabs = ['Settings', 'Analytics', 'Monitor'];
      for (const tabName of tabs) {
        const tab = screen.queryByRole('tab', { name: new RegExp(tabName, 'i') });
        if (tab) {
          fireEvent.click(tab);
          await waitFor(() => {
            // Tab should be active
            expect(tab).toHaveAttribute('aria-selected', 'true');
          });
        }
      }
      
      // Return to monitor tab
      const monitorTab = screen.getByRole('tab', { name: /monitor/i });
      fireEvent.click(monitorTab);
      
      await waitFor(() => {
        // Timestamp should be exactly the same
        const finalTimestamp = screen.getByText(/2024-01-01T10:00:00/);
        expect(finalTimestamp).toBeInTheDocument();
      });
    });
  });

  describe('Regression: Navigation Failures', () => {
    it('should NOT fail navigation due to missing instance data', async () => {
      const mockInstance = {
        id: 'nav-test-id',
        name: 'Navigation Test',
        status: 'running',
        port: 3001
      };
      
      mockWebSocketService.getInstances.mockReturnValue([mockInstance]);
      mockWebSocketService.getInstanceById.mockReturnValue(mockInstance);
      
      renderWithContext(<DualInstanceMonitor />);
      
      // Test all navigation buttons
      const navigationButtons = [
        { name: /terminal/i, action: 'navigate-to-terminal' },
        { name: /logs/i, action: 'view-logs' },
        { name: /details/i, action: 'view-details' }
      ];
      
      for (const { name, action } of navigationButtons) {
        const button = screen.queryByRole('button', { name });
        if (button) {
          fireEvent.click(button);
          
          await waitFor(() => {
            expect(mockWebSocketService.send).toHaveBeenCalledWith(
              expect.objectContaining({
                type: action,
                instanceId: 'nav-test-id'
              })
            );
          });
          
          // Should not show navigation errors
          expect(screen.queryByText(/navigation.*failed/i)).not.toBeInTheDocument();
          expect(screen.queryByText(/cannot.*navigate/i)).not.toBeInTheDocument();
        }
      }
    });
  });

  describe('Regression: Component Error Boundaries', () => {
    it('should NOT crash on invalid instance data', async () => {
      // Test with malformed instance data that previously caused crashes
      const malformedInstances = [
        null,
        undefined,
        { /* missing required fields */ },
        { id: null, name: '', status: 'invalid' },
        { id: 'test', name: null, status: undefined }
      ];
      
      for (const badInstance of malformedInstances) {
        mockWebSocketService.getInstances.mockReturnValue([badInstance].filter(Boolean));
        
        expect(() => {
          renderWithContext(<DualInstanceMonitor />);
        }).not.toThrow();
        
        // Should not log React errors
        expect(consoleErrorSpy).not.toHaveBeenCalledWith(
          expect.stringMatching(/react.*error|component.*error/i)
        );
      }
    });

    it('should handle WebSocket disconnections gracefully', async () => {
      mockWebSocketService.isConnected.mockReturnValue(false);
      
      expect(() => {
        renderWithContext(<DualInstanceMonitor />);
      }).not.toThrow();
      
      // Should show disconnected state, not crash
      expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
      
      // Should not log connection errors as React errors
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/component.*error/i)
      );
    });
  });

  describe('Regression: Memory Leaks', () => {
    it('should properly cleanup event listeners', () => {
      const { unmount } = renderWithContext(<DualInstanceMonitor />);
      
      // Verify listeners were registered
      expect(mockWebSocketService.on).toHaveBeenCalled();
      
      // Unmount component
      unmount();
      
      // Verify cleanup occurred
      expect(mockWebSocketService.off).toHaveBeenCalled();
      
      // Should remove the same number of listeners that were added
      const onCalls = mockWebSocketService.on.mock.calls.length;
      const offCalls = mockWebSocketService.off.mock.calls.length;
      
      expect(offCalls).toBeGreaterThanOrEqual(onCalls);
    });
  });
});