/**
 * ClaudeManager Coordination Integration Tests - London School TDD
 * Tests interactions between ClaudeInstanceManager and useClaudeInstances
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ClaudeInstanceManager from '../../../../src/components/ClaudeInstanceManager';
import { useHTTPSSE } from '../../../../src/hooks/useHTTPSSE';
import { createMockContracts, expectInteractionPattern } from '../test-setup';

// Mock dependencies with contracts
vi.mock('../../../../src/hooks/useHTTPSSE');
vi.mock('../../../../src/utils/nld-ui-capture', () => ({
  nldCapture: {
    captureCommunicationBreakdown: vi.fn(),
    captureInstanceCreationFailure: vi.fn()
  }
}));

const mockUseHTTPSSE = useHTTPSSE as any;

describe('ClaudeManager Coordination Integration Tests', () => {
  let mockContracts: ReturnType<typeof createMockContracts>;
  let mockHTTPSSEReturn: ReturnType<typeof useHTTPSSE>;
  let eventHandlers: Map<string, Function>;

  beforeEach(() => {
    mockContracts = createMockContracts();
    eventHandlers = new Map();
    
    mockHTTPSSEReturn = {
      socket: { id: 'integration-socket' } as any,
      isConnected: true,
      connectionError: null,
      connectSSE: vi.fn(),
      startPolling: vi.fn(),
      disconnectFromInstance: vi.fn(),
      on: vi.fn().mockImplementation((event: string, handler: Function) => {
        eventHandlers.set(event, handler);
      }),
      off: vi.fn(),
      emit: vi.fn()
    };

    vi.mocked(mockUseHTTPSSE).mockReturnValue(mockHTTPSSEReturn);
    global.fetch = mockContracts.APIContract.fetch;
  });

  describe('Feed Integration Workflow', () => {
    it('should coordinate Feed component with worker instance for job submission', async () => {
      // Arrange - Mock worker instance ready for feed processing
      const workerInstance = {
        id: 'claude-worker-feed-001',
        name: 'Feed Processing Worker',
        status: 'running',
        type: 'worker',
        capabilities: ['feed-processing'],
        workingDirectory: '/workspaces/agent-feed/prod'
      };

      mockContracts.APIContract.response.json
        .mockResolvedValueOnce({ success: true, instances: [] })
        .mockResolvedValueOnce({ 
          success: true, 
          instanceId: workerInstance.id,
          instance: workerInstance 
        })
        .mockResolvedValueOnce({ success: true, instances: [workerInstance] });

      render(<ClaudeInstanceManager />);

      // Act - Create worker instance for feed processing
      const prodButton = screen.getByText('🚀 prod/claude');
      await userEvent.click(prodButton);

      // Simulate instance creation success
      const createSuccessHandler = eventHandlers.get('instance:create:success');
      if (createSuccessHandler) {
        createSuccessHandler({ instanceId: workerInstance.id });
      }

      // Wait for instance to be selected and connected
      await waitFor(() => {
        expect(mockHTTPSSEReturn.connectSSE).toHaveBeenCalledWith(workerInstance.id);
      });

      // Simulate feed job submission
      const feedJob = {
        type: 'feed-analysis',
        feedUrl: 'https://example.com/rss.xml',
        processingType: 'real-time'
      };

      // Wait for instance selection
      await waitFor(() => {
        const instanceCard = screen.getByTestId('instance-card');
        fireEvent.click(instanceCard);
      });

      const commandInput = screen.getByTestId('command-input');
      const sendButton = screen.getByTestId('send-command-button');

      await userEvent.type(commandInput, JSON.stringify(feedJob));
      await userEvent.click(sendButton);

      // Assert - Verify feed job coordination
      expect(mockHTTPSSEReturn.emit).toHaveBeenCalledWith(
        'terminal:input',
        expect.objectContaining({
          input: expect.stringContaining('feed-analysis'),
          instanceId: workerInstance.id
        })
      );

      // Verify worker instance readiness
      expectInteractionPattern(mockHTTPSSEReturn as any, [
        { mock: 'connectSSE', args: [workerInstance.id] },
        { mock: 'emit', args: ['terminal:input', expect.objectContaining({
          instanceId: workerInstance.id
        })]}
      ]);
    });

    it('should handle Feed component job result polling coordination', async () => {
      // Arrange - Mock ongoing feed processing
      const workerInstanceId = 'claude-feed-worker-002';
      
      mockContracts.APIContract.response.json.mockResolvedValue({
        success: true,
        instances: [{
          id: workerInstanceId,
          name: 'Feed Worker',
          status: 'running'
        }]
      });

      render(<ClaudeInstanceManager />);

      // Act - Simulate real-time feed output
      const outputHandler = eventHandlers.get('terminal:output');
      if (outputHandler) {
        // Simulate feed processing output
        outputHandler({
          output: 'Feed processing: 50% complete\n',
          instanceId: workerInstanceId,
          isReal: true
        });

        outputHandler({
          output: 'Feed analysis complete: 15 new items processed\n',
          instanceId: workerInstanceId,
          isReal: true
        });
      }

      // Assert - Output should be displayed in terminal
      await waitFor(() => {
        const outputArea = screen.getByTestId('terminal-output');
        expect(outputArea).toHaveTextContent('Feed processing: 50% complete');
        expect(outputArea).toHaveTextContent('Feed analysis complete: 15 new items processed');
      });
    });
  });

  describe('Backend API Integration', () => {
    it('should coordinate with backend API for instance lifecycle', async () => {
      // Arrange
      const instanceId = 'claude-backend-test';
      
      // Mock API responses for complete lifecycle
      mockContracts.APIContract.response.json
        .mockResolvedValueOnce({ success: true, instances: [] }) // Initial fetch
        .mockResolvedValueOnce({ 
          success: true, 
          instanceId,
          instance: { id: instanceId, status: 'starting' } 
        }) // Create
        .mockResolvedValueOnce({ 
          success: true, 
          instances: [{ id: instanceId, status: 'running' }] 
        }) // Refresh after create
        .mockResolvedValueOnce({ success: true }); // Terminate

      render(<ClaudeInstanceManager />);

      // Act - Complete instance lifecycle
      
      // 1. Create instance
      const createButton = screen.getByText('🚀 prod/claude');
      await userEvent.click(createButton);

      // Simulate successful creation
      const createHandler = eventHandlers.get('instance:create:success');
      if (createHandler) {
        createHandler({ instanceId });
      }

      await waitFor(() => {
        expect(mockContracts.APIContract.fetch).toHaveBeenCalledWith(
          'http://localhost:3333/api/v1/claude/instances',
          expect.objectContaining({ method: 'POST' })
        );
      });

      // 2. Terminate instance
      await waitFor(() => {
        const terminateButton = screen.getByTestId(`disconnect-button-${instanceId}`);
        fireEvent.click(terminateButton);
      });

      // Assert - Verify API coordination sequence
      expect(mockContracts.APIContract.fetch).toHaveBeenCalledWith(
        `http://localhost:3333/api/v1/claude/instances/${instanceId}`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should handle API rate limiting and backoff', async () => {
      // Arrange - Mock rate limit error
      mockContracts.APIContract.fetch
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValueOnce(mockContracts.APIContract.response);

      render(<ClaudeInstanceManager />);

      // Act - Rapid button clicks (simulate rate limiting scenario)
      const prodButton = screen.getByText('🚀 prod/claude');
      
      await userEvent.click(prodButton);
      await userEvent.click(prodButton); // Second click should be handled gracefully

      // Assert - Should show error but not crash
      await waitFor(() => {
        expect(screen.getByText('Failed to create instance')).toBeInTheDocument();
      });
    });
  });

  describe('Directory Path Validation', () => {
    it('should enforce /prod directory requirement for production instances', async () => {
      // Arrange
      const prodConfig = {
        command: ['claude'],
        instanceType: 'prod'
      };

      mockContracts.APIContract.response.json.mockResolvedValue({
        success: true,
        instanceId: 'claude-prod-001',
        instance: {
          id: 'claude-prod-001',
          workingDirectory: '/workspaces/agent-feed/prod',
          type: 'prod'
        }
      });

      render(<ClaudeInstanceManager />);

      // Act - Click production button
      const prodButton = screen.getByText('🚀 prod/claude');
      await userEvent.click(prodButton);

      // Assert - Should send correct production configuration
      await waitFor(() => {
        expect(mockContracts.APIContract.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: JSON.stringify(prodConfig)
          })
        );
      });
    });

    it('should validate working directory constraints', async () => {
      // Arrange - Mock backend response with invalid directory
      mockContracts.APIContract.response.json.mockResolvedValue({
        success: false,
        error: 'Invalid working directory: /prod directory not found'
      });

      render(<ClaudeInstanceManager />);

      // Act
      const prodButton = screen.getByText('🚀 prod/claude');
      await userEvent.click(prodButton);

      // Assert - Should display directory validation error
      await waitFor(() => {
        expect(screen.getByText(/Invalid working directory/)).toBeInTheDocument();
      });
    });
  });

  describe('Multi-Component State Synchronization', () => {
    it('should synchronize state between ClaudeInstanceManager and ClaudeInstanceSelector', async () => {
      // Arrange
      const instances = [
        {
          id: 'claude-sync-1',
          name: 'Sync Test 1',
          status: 'running'
        },
        {
          id: 'claude-sync-2', 
          name: 'Sync Test 2',
          status: 'starting'
        }
      ];

      mockContracts.APIContract.response.json.mockResolvedValue({
        success: true,
        instances
      });

      render(<ClaudeInstanceManager />);

      // Act - Simulate status updates for multiple instances
      const statusHandler = eventHandlers.get('instance:status');
      if (statusHandler) {
        statusHandler({
          instanceId: 'claude-sync-1',
          status: 'stopping'
        });

        statusHandler({
          instanceId: 'claude-sync-2',
          status: 'running'
        });
      }

      // Assert - Both instances should reflect updated status
      await waitFor(() => {
        expect(screen.getByTestId('status-claude-sync-1')).toHaveTextContent('stopping');
        expect(screen.getByTestId('status-claude-sync-2')).toHaveTextContent('running');
      });
    });

    it('should maintain connection state consistency across components', async () => {
      // Arrange
      mockHTTPSSEReturn.isConnected = false;
      mockHTTPSSEReturn.connectionError = 'WebSocket connection lost';

      render(<ClaudeInstanceManager />);

      // Assert - Should show disconnected state
      await waitFor(() => {
        expect(screen.getByText('Connection Error')).toBeInTheDocument();
        expect(screen.getByText('WebSocket connection lost')).toBeInTheDocument();
      });

      // Act - Simulate reconnection
      mockHTTPSSEReturn.isConnected = true;
      mockHTTPSSEReturn.connectionError = null;

      const connectHandler = eventHandlers.get('connect');
      if (connectHandler) {
        connectHandler({
          connectionType: 'sse',
          instanceId: 'claude-reconnect-test'
        });
      }

      // Assert - Should show connected state
      await waitFor(() => {
        expect(screen.getByText(/Connected via SSE/)).toBeInTheDocument();
      });
    });
  });

  describe('Performance Under Load', () => {
    it('should handle multiple simultaneous instance operations', async () => {
      // Arrange
      const instanceIds = ['claude-load-1', 'claude-load-2', 'claude-load-3'];
      
      // Mock successful responses for all operations
      mockContracts.APIContract.response.json.mockResolvedValue({
        success: true,
        instances: instanceIds.map(id => ({
          id,
          name: `Load Test ${id}`,
          status: 'running'
        }))
      });

      render(<ClaudeInstanceManager />);

      // Act - Simulate rapid operations
      const buttons = [
        screen.getByText('🚀 prod/claude'),
        screen.getByText('⚡ skip-permissions'),
        screen.getByText('⚡ skip-permissions -c')
      ];

      // Rapid-fire button clicks
      await Promise.all(
        buttons.map(button => userEvent.click(button))
      );

      // Assert - All requests should be handled
      expect(mockContracts.APIContract.fetch).toHaveBeenCalledTimes(
        4 // 1 initial fetch + 3 create requests
      );
    });

    it('should prevent API spam with proper debouncing', async () => {
      // Arrange
      jest.useFakeTimers();
      
      render(<ClaudeInstanceManager />);
      const prodButton = screen.getByText('🚀 prod/claude');

      // Act - Rapid button clicks within debounce period
      await userEvent.click(prodButton);
      await userEvent.click(prodButton);
      await userEvent.click(prodButton);

      // Fast-forward timers
      jest.advanceTimersByTime(1000);

      // Assert - Should handle gracefully (loading state prevents multiple calls)
      await waitFor(() => {
        expect(prodButton).toBeDisabled();
      });

      jest.useRealTimers();
    });
  });

  describe('Connection Resilience and Recovery', () => {
    it('should recover from WebSocket connection failures', async () => {
      // Arrange - Start with failed connection
      mockHTTPSSEReturn.isConnected = false;
      mockHTTPSSEReturn.connectionError = 'Connection timeout';

      render(<ClaudeInstanceManager />);

      // Verify error state
      await waitFor(() => {
        expect(screen.getByText('Connection Error')).toBeInTheDocument();
      });

      // Act - Simulate connection recovery
      mockHTTPSSEReturn.isConnected = true;
      mockHTTPSSEReturn.connectionError = null;

      const connectHandler = eventHandlers.get('connect');
      if (connectHandler) {
        connectHandler({
          connectionType: 'sse',
          instanceId: null
        });
      }

      // Assert - Should recover and show connected state
      await waitFor(() => {
        expect(screen.getByText(/Connected via SSE/)).toBeInTheDocument();
        expect(screen.queryByText('Connection Error')).not.toBeInTheDocument();
      });
    });

    it('should fallback from SSE to polling when SSE fails', async () => {
      // Arrange
      const instanceId = 'claude-fallback-test';
      mockHTTPSSEReturn.connectSSE.mockImplementation(() => {
        throw new Error('SSE connection failed');
      });

      mockContracts.APIContract.response.json.mockResolvedValue({
        success: true,
        instanceId,
        instance: { id: instanceId, status: 'running' }
      });

      render(<ClaudeInstanceManager />);

      // Act - Create instance (should trigger connection)
      const prodButton = screen.getByText('🚀 prod/claude');
      await userEvent.click(prodButton);

      // Simulate creation success
      const createHandler = eventHandlers.get('instance:create:success');
      if (createHandler) {
        createHandler({ instanceId });
      }

      // Assert - Should fallback to polling
      await waitFor(() => {
        expect(mockHTTPSSEReturn.connectSSE).toHaveBeenCalledWith(instanceId);
        expect(mockHTTPSSEReturn.startPolling).toHaveBeenCalledWith(instanceId);
      });
    });
  });

  describe('Data Consistency and State Management', () => {
    it('should maintain consistent state across component re-renders', async () => {
      // Arrange
      const persistentInstance = {
        id: 'claude-persistent-001',
        name: 'Persistent Instance',
        status: 'running'
      };

      mockContracts.APIContract.response.json.mockResolvedValue({
        success: true,
        instances: [persistentInstance]
      });

      const { rerender } = render(<ClaudeInstanceManager />);

      // Act - Multiple re-renders
      rerender(<ClaudeInstanceManager apiUrl="http://localhost:3333" />);
      rerender(<ClaudeInstanceManager apiUrl="http://localhost:3334" />);

      // Assert - Instance data should remain consistent
      await waitFor(() => {
        expect(screen.getByText('Persistent Instance')).toBeInTheDocument();
        expect(screen.getByTestId('status-claude-persistent-001')).toHaveTextContent('running');
      });
    });

    it('should handle concurrent instance operations without race conditions', async () => {
      // Arrange
      const instances = [
        { id: 'claude-race-1', name: 'Race Test 1', status: 'running' },
        { id: 'claude-race-2', name: 'Race Test 2', status: 'running' }
      ];

      mockContracts.APIContract.response.json.mockResolvedValue({
        success: true,
        instances
      });

      render(<ClaudeInstanceManager />);

      // Act - Simulate concurrent status updates
      const statusHandler = eventHandlers.get('instance:status');
      if (statusHandler) {
        // Fire multiple status updates rapidly
        statusHandler({ instanceId: 'claude-race-1', status: 'stopping' });
        statusHandler({ instanceId: 'claude-race-2', status: 'error' });
        statusHandler({ instanceId: 'claude-race-1', status: 'stopped' });
      }

      // Assert - Final state should be consistent
      await waitFor(() => {
        expect(screen.getByTestId('status-claude-race-1')).toHaveTextContent('stopped');
        expect(screen.getByTestId('status-claude-race-2')).toHaveTextContent('error');
      });
    });
  });

  describe('Error Boundary and Recovery', () => {
    it('should handle component errors without breaking parent application', async () => {
      // Arrange - Mock console.error to capture error boundary activation
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock a failing fetch that throws
      mockContracts.APIContract.fetch.mockImplementation(() => {
        throw new Error('Catastrophic API failure');
      });

      // Act - Component should handle error gracefully
      render(<ClaudeInstanceManager />);

      // Assert - Should not crash, should show error state
      await waitFor(() => {
        expect(screen.getByText('Failed to fetch instances')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });
});