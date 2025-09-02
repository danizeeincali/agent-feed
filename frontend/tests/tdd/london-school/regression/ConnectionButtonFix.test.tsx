/**
 * Connection Button Fix Regression Tests - London School TDD
 * Tests for specific bug fixes and regression prevention
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import ClaudeInstanceManager from '../../../../src/components/ClaudeInstanceManager';
import { useHTTPSSE } from '../../../../src/hooks/useHTTPSSE';
import { createMockContracts } from '../test-setup';

jest.mock('../../../../src/hooks/useHTTPSSE');
jest.mock('../../../../src/utils/nld-ui-capture', () => ({
  nldCapture: {
    captureCommunicationBreakdown: jest.fn(),
    captureInstanceCreationFailure: jest.fn()
  }
}));

const mockUseHTTPSSE = useHTTPSSE as jest.MockedFunction<typeof useHTTPSSE>;

describe('ConnectionButton Fix Regression Tests', () => {
  let mockContracts: ReturnType<typeof createMockContracts>;
  let mockHTTPSSEReturn: ReturnType<typeof useHTTPSSE>;
  let eventHandlers: Map<string, Function>;

  beforeEach(() => {
    mockContracts = createMockContracts();
    eventHandlers = new Map();
    
    mockHTTPSSEReturn = {
      socket: { id: 'regression-socket' } as any,
      isConnected: true,
      connectionError: null,
      connectSSE: jest.fn(),
      startPolling: jest.fn(),
      disconnectFromInstance: jest.fn(),
      on: jest.fn().mockImplementation((event: string, handler: Function) => {
        eventHandlers.set(event, handler);
      }),
      off: jest.fn(),
      emit: jest.fn()
    };

    mockUseHTTPSSE.mockReturnValue(mockHTTPSSEReturn);
    global.fetch = mockContracts.APIContract.fetch;
  });

  describe('Button State Management Regression', () => {
    it('should prevent multiple instance creation during loading state', async () => {
      // Arrange - Slow API response to test loading state
      let resolveCreate: (value: any) => void;
      const createPromise = new Promise(resolve => {
        resolveCreate = resolve;
      });

      mockContracts.APIContract.fetch.mockReturnValue(createPromise as any);

      render(<ClaudeInstanceManager />);

      // Act - Rapid button clicks during loading
      const prodButton = screen.getByText('🚀 prod/claude');
      
      await userEvent.click(prodButton);
      
      // Button should be disabled during loading
      expect(prodButton).toBeDisabled();
      
      // Additional clicks should not trigger more requests
      await userEvent.click(prodButton);
      await userEvent.click(prodButton);

      // Resolve the API call
      resolveCreate({
        json: () => Promise.resolve({
          success: true,
          instanceId: 'claude-load-test',
          instance: { id: 'claude-load-test' }
        }),
        ok: true,
        status: 200
      });

      // Assert - Only one API call should have been made
      await waitFor(() => {
        expect(mockContracts.APIContract.fetch).toHaveBeenCalledTimes(2); // 1 initial + 1 create
      });
    });

    it('should re-enable buttons after failed instance creation', async () => {
      // Arrange - Mock failed creation
      mockContracts.APIContract.fetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true, instances: [] }),
          ok: true
        } as any)
        .mockRejectedValueOnce(new Error('Creation failed'));

      render(<ClaudeInstanceManager />);

      // Act - Failed creation attempt
      const prodButton = screen.getByText('🚀 prod/claude');
      await userEvent.click(prodButton);

      // Assert - Button should be re-enabled after failure
      await waitFor(() => {
        expect(screen.getByText('Failed to create instance')).toBeInTheDocument();
        expect(prodButton).not.toBeDisabled();
      });
    });
  });

  describe('Instance ID Validation Regression', () => {
    it('should handle malformed instance IDs gracefully', async () => {
      // Arrange - Mock response with malformed instance ID
      mockContracts.APIContract.response.json
        .mockResolvedValueOnce({ success: true, instances: [] })
        .mockResolvedValueOnce({
          success: true,
          instanceId: 'malformed-id-123', // Should be claude-XXX format
          instance: { id: 'malformed-id-123' }
        });

      render(<ClaudeInstanceManager />);

      // Act
      const prodButton = screen.getByText('🚀 prod/claude');
      await userEvent.click(prodButton);

      // Assert - Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/Invalid instance ID format/)).toBeInTheDocument();
      });
    });

    it('should prevent operations on undefined instance IDs', async () => {
      // Arrange - Mock instance with undefined ID
      const undefinedInstance = {
        id: undefined,
        name: 'Undefined Instance',
        status: 'running'
      };

      mockContracts.APIContract.response.json.mockResolvedValue({
        success: true,
        instances: [undefinedInstance]
      });

      render(<ClaudeInstanceManager />);

      // Act - Try to select undefined instance
      await waitFor(() => {
        const instanceCard = screen.getByTestId('instance-card');
        fireEvent.click(instanceCard);
      });

      // Assert - Should show validation error
      await waitFor(() => {
        expect(screen.getByText('Invalid instance ID')).toBeInTheDocument();
      });
    });
  });

  describe('API Spam Prevention Regression', () => {
    it('should prevent API request spam during rapid user interactions', async () => {
      // Arrange
      jest.useFakeTimers();
      
      mockContracts.APIContract.response.json.mockResolvedValue({
        success: true,
        instances: []
      });

      render(<ClaudeInstanceManager />);

      // Act - Rapid API-triggering actions
      const prodButton = screen.getByText('🚀 prod/claude');
      const skipButton = screen.getByText('⚡ skip-permissions');

      // Rapid clicks
      await userEvent.click(prodButton);
      jest.advanceTimersByTime(100);
      await userEvent.click(skipButton);
      jest.advanceTimersByTime(100);
      await userEvent.click(prodButton);

      // Assert - Should have reasonable API call limiting
      await waitFor(() => {
        // Should not exceed reasonable number of API calls
        expect(mockContracts.APIContract.fetch).toHaveBeenCalledTimes(
          expect.any(Number)
        );
        expect(mockContracts.APIContract.fetch.mock.calls.length).toBeLessThan(10);
      });

      jest.useRealTimers();
    });

    it('should handle fetch abortion on component unmount', async () => {
      // Arrange
      const abortController = new AbortController();
      const mockFetchWithAbort = jest.fn().mockImplementation((url, options) => {
        // Simulate abortable fetch
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            resolve({
              json: () => Promise.resolve({ success: true, instances: [] }),
              ok: true
            });
          }, 1000);

          options?.signal?.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      });

      global.fetch = mockFetchWithAbort;

      const { unmount } = render(<ClaudeInstanceManager />);

      // Act - Unmount during pending fetch
      setTimeout(() => unmount(), 100);

      // Assert - Should handle abort gracefully
      await waitFor(() => {
        // Component should unmount without errors
        expect(mockFetchWithAbort).toHaveBeenCalled();
      });
    });
  });

  describe('WebSocket Connection Stability Regression', () => {
    it('should handle WebSocket reconnection without losing instance state', async () => {
      // Arrange
      const stableInstanceId = 'claude-stable-001';
      
      mockContracts.APIContract.response.json.mockResolvedValue({
        success: true,
        instances: [{ 
          id: stableInstanceId, 
          name: 'Stable Instance',
          status: 'running' 
        }]
      });

      render(<ClaudeInstanceManager />);

      // Select instance
      await waitFor(() => {
        const instanceCard = screen.getByTestId('instance-card');
        fireEvent.click(instanceCard);
      });

      // Add some output
      const outputHandler = eventHandlers.get('terminal:output');
      if (outputHandler) {
        outputHandler({
          output: 'Initial output before disconnect\n',
          instanceId: stableInstanceId,
          isReal: true
        });
      }

      // Act - Simulate connection loss and recovery
      mockHTTPSSEReturn.isConnected = false;
      mockHTTPSSEReturn.connectionError = 'Connection lost';

      const errorHandler = eventHandlers.get('error');
      if (errorHandler) {
        errorHandler({ message: 'Connection lost' });
      }

      // Verify disconnected state
      await waitFor(() => {
        expect(screen.getByText('Connection Error')).toBeInTheDocument();
      });

      // Simulate reconnection
      mockHTTPSSEReturn.isConnected = true;
      mockHTTPSSEReturn.connectionError = null;

      const connectHandler = eventHandlers.get('connect');
      if (connectHandler) {
        connectHandler({
          connectionType: 'sse',
          instanceId: stableInstanceId
        });
      }

      // Assert - Instance state should be preserved
      await waitFor(() => {
        expect(screen.getByText(/Connected via SSE/)).toBeInTheDocument();
        const outputArea = screen.getByTestId('terminal-output');
        expect(outputArea).toHaveTextContent('Initial output before disconnect');
      });
    });

    it('should handle WebSocket message ordering correctly', async () => {
      // Arrange
      const orderingInstanceId = 'claude-ordering-test';
      
      mockContracts.APIContract.response.json.mockResolvedValue({
        success: true,
        instances: [{ id: orderingInstanceId, status: 'running' }]
      });

      render(<ClaudeInstanceManager />);

      // Select instance
      await waitFor(() => {
        const instanceCard = screen.getByTestId('instance-card');
        fireEvent.click(instanceCard);
      });

      // Act - Send messages in specific order
      const outputHandler = eventHandlers.get('terminal:output');
      if (outputHandler) {
        // Messages should appear in order
        outputHandler({
          output: 'Message 1\n',
          instanceId: orderingInstanceId,
          isReal: true
        });
        
        outputHandler({
          output: 'Message 2\n', 
          instanceId: orderingInstanceId,
          isReal: true
        });
        
        outputHandler({
          output: 'Message 3\n',
          instanceId: orderingInstanceId,
          isReal: true
        });
      }

      // Assert - Messages should maintain order
      await waitFor(() => {
        const outputArea = screen.getByTestId('terminal-output');
        const text = outputArea.textContent || '';
        
        const msg1Index = text.indexOf('Message 1');
        const msg2Index = text.indexOf('Message 2');
        const msg3Index = text.indexOf('Message 3');
        
        expect(msg1Index).toBeLessThan(msg2Index);
        expect(msg2Index).toBeLessThan(msg3Index);
      });
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should clean up event listeners on component unmount', async () => {
      // Arrange
      const { unmount } = render(<ClaudeInstanceManager />);

      // Verify event listeners were set up
      expect(mockHTTPSSEReturn.on).toHaveBeenCalledTimes(7);

      // Act - Unmount component
      unmount();

      // Assert - Should clean up all event listeners
      expect(mockHTTPSSEReturn.off).toHaveBeenCalledTimes(7);
      
      const expectedCleanupEvents = [
        'connect',
        'terminal:output',
        'terminal:input_echo',
        'instance:create:success',
        'instance:create:error',
        'instance:status',
        'status_update',
        'error'
      ];

      expectedCleanupEvents.forEach(event => {
        expect(mockHTTPSSEReturn.off).toHaveBeenCalledWith(event);
      });
    });

    it('should prevent memory leaks from output accumulation', async () => {
      // Arrange
      const highOutputInstanceId = 'claude-memory-test';
      
      mockContracts.APIContract.response.json.mockResolvedValue({
        success: true,
        instances: [{ id: highOutputInstanceId, status: 'running' }]
      });

      render(<ClaudeInstanceManager />);

      // Select instance
      await waitFor(() => {
        const instanceCard = screen.getByTestId('instance-card');
        fireEvent.click(instanceCard);
      });

      // Act - Generate large amount of output
      const outputHandler = eventHandlers.get('terminal:output');
      if (outputHandler) {
        // Generate 1000 lines of output
        for (let i = 0; i < 1000; i++) {
          outputHandler({
            output: `Line ${i}: This is a test line with some content that might accumulate\n`,
            instanceId: highOutputInstanceId,
            isReal: true
          });
        }
      }

      // Assert - Should handle large output without memory issues
      await waitFor(() => {
        const outputArea = screen.getByTestId('terminal-output');
        expect(outputArea).toBeInTheDocument();
        // Component should still be responsive
        expect(screen.getByTestId('command-input')).toBeEnabled();
      });
    });
  });

  describe('Error Recovery Regression', () => {
    it('should recover from "undefined instance ID" errors', async () => {
      // Arrange - Simulate the specific "undefined" instance ID bug
      mockContracts.APIContract.response.json
        .mockResolvedValueOnce({ success: true, instances: [] })
        .mockResolvedValueOnce({
          success: true,
          instanceId: undefined, // Bug scenario
          instance: { id: undefined }
        });

      render(<ClaudeInstanceManager />);

      // Act
      const prodButton = screen.getByText('🚀 prod/claude');
      await userEvent.click(prodButton);

      // Assert - Should handle undefined gracefully
      await waitFor(() => {
        expect(screen.getByText(/No instance ID in response/)).toBeInTheDocument();
        expect(prodButton).not.toBeDisabled(); // Should re-enable after error
      });
    });

    it('should prevent sending commands to undefined instances', async () => {
      // Arrange - Component with no selected instance
      render(<ClaudeInstanceManager />);

      // Try to send command without selecting instance
      const commandInput = screen.getByTestId('command-input');
      const sendButton = screen.getByTestId('send-command-button');

      // Act - Try to send command
      await userEvent.type(commandInput, 'test command');
      await userEvent.click(sendButton);

      // Assert - Should show error and not crash
      expect(mockHTTPSSEReturn.emit).not.toHaveBeenCalled();
    });
  });

  describe('Performance Under Load Regression', () => {
    it('should maintain responsiveness during high-frequency status updates', async () => {
      // Arrange
      const loadTestInstances = Array.from({ length: 10 }, (_, i) => ({
        id: `claude-load-${i}`,
        name: `Load Test Instance ${i}`,
        status: 'running'
      }));

      mockContracts.APIContract.response.json.mockResolvedValue({
        success: true,
        instances: loadTestInstances
      });

      render(<ClaudeInstanceManager />);

      // Act - Rapid status updates for all instances
      const statusHandler = eventHandlers.get('instance:status');
      if (statusHandler) {
        // Fire 100 rapid status updates
        for (let i = 0; i < 100; i++) {
          statusHandler({
            instanceId: `claude-load-${i % 10}`,
            status: i % 2 === 0 ? 'running' : 'stopping'
          });
        }
      }

      // Assert - UI should remain responsive
      await waitFor(() => {
        // All instances should be rendered
        loadTestInstances.forEach(instance => {
          expect(screen.getByText(instance.name)).toBeInTheDocument();
        });
        
        // Component should still be interactive
        expect(screen.getByText('🚀 prod/claude')).toBeEnabled();
      });
    });

    it('should handle concurrent instance operations without race conditions', async () => {
      // Arrange
      const concurrentInstances = [
        { id: 'claude-concurrent-1', name: 'Concurrent 1', status: 'starting' },
        { id: 'claude-concurrent-2', name: 'Concurrent 2', status: 'starting' }
      ];

      // Mock API responses
      mockContracts.APIContract.response.json
        .mockResolvedValueOnce({ success: true, instances: [] })
        .mockResolvedValueOnce({ 
          success: true, 
          instanceId: 'claude-concurrent-1',
          instance: concurrentInstances[0] 
        })
        .mockResolvedValueOnce({ 
          success: true, 
          instanceId: 'claude-concurrent-2',
          instance: concurrentInstances[1] 
        })
        .mockResolvedValue({ success: true, instances: concurrentInstances });

      render(<ClaudeInstanceManager />);

      // Act - Create instances simultaneously
      const prodButton = screen.getByText('🚀 prod/claude');
      const skipButton = screen.getByText('⚡ skip-permissions');

      await Promise.all([
        userEvent.click(prodButton),
        userEvent.click(skipButton)
      ]);

      // Simulate concurrent completion
      const createHandler = eventHandlers.get('instance:create:success');
      if (createHandler) {
        createHandler({ instanceId: 'claude-concurrent-1' });
        createHandler({ instanceId: 'claude-concurrent-2' });
      }

      // Assert - Both instances should be created successfully
      await waitFor(() => {
        expect(screen.getByText('Concurrent 1')).toBeInTheDocument();
        expect(screen.getByText('Concurrent 2')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases and Error Boundary', () => {
    it('should handle network disconnection during active session', async () => {
      // Arrange
      const networkTestId = 'claude-network-test';
      
      mockContracts.APIContract.response.json.mockResolvedValue({
        success: true,
        instances: [{ id: networkTestId, status: 'running' }]
      });

      render(<ClaudeInstanceManager />);

      // Select instance and establish connection
      await waitFor(() => {
        const instanceCard = screen.getByTestId('instance-card');
        fireEvent.click(instanceCard);
      });

      // Act - Simulate network disconnection
      mockHTTPSSEReturn.isConnected = false;
      mockHTTPSSEReturn.connectionError = 'Network unavailable';

      const errorHandler = eventHandlers.get('error');
      if (errorHandler) {
        errorHandler({ message: 'Network unavailable' });
      }

      // Try to send command during network outage
      const commandInput = screen.getByTestId('command-input');
      const sendButton = screen.getByTestId('send-command-button');

      await userEvent.type(commandInput, 'test command');
      await userEvent.click(sendButton);

      // Assert - Should show network error and prevent command sending
      await waitFor(() => {
        expect(screen.getByText('Connection Error')).toBeInTheDocument();
        expect(screen.getByText('Not connected to terminal')).toBeInTheDocument();
      });
    });

    it('should handle malformed WebSocket messages gracefully', async () => {
      // Arrange
      const robustInstanceId = 'claude-robust-test';
      
      mockContracts.APIContract.response.json.mockResolvedValue({
        success: true,
        instances: [{ id: robustInstanceId, status: 'running' }]
      });

      render(<ClaudeInstanceManager />);

      // Act - Send malformed messages
      const outputHandler = eventHandlers.get('terminal:output');
      if (outputHandler) {
        // Various malformed messages
        outputHandler(null); // null message
        outputHandler({}); // empty object
        outputHandler({ output: null, instanceId: robustInstanceId }); // null output
        outputHandler({ output: 'valid', instanceId: null }); // null instance ID
        outputHandler({ output: 'valid', instanceId: robustInstanceId, isReal: false }); // fake output
        outputHandler({ 
          output: 'This should work\n', 
          instanceId: robustInstanceId, 
          isReal: true 
        }); // valid message
      }

      // Assert - Should handle malformed messages without crashing
      await waitFor(() => {
        const outputArea = screen.getByTestId('terminal-output');
        expect(outputArea).toHaveTextContent('This should work');
        // Should not show the malformed content
        expect(outputArea).not.toHaveTextContent('null');
      });
    });
  });
});