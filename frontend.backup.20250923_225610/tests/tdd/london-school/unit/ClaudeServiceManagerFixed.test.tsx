/**
 * ClaudeServiceManager London School TDD Tests - Working Version
 * Mock-driven tests focusing on behavior verification and interactions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClaudeInstanceManager from '../../../../src/components/ClaudeInstanceManager';

// Mock the HTTP/SSE hook
const mockHTTPSSEHook = {
  socket: { id: 'mock-socket' },
  isConnected: true,
  connectionError: null,
  connectSSE: vi.fn(),
  startPolling: vi.fn(),
  disconnectFromInstance: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn()
};

// Mock the hook
vi.mock('../../../../src/hooks/useHTTPSSE', () => ({
  useHTTPSSE: () => mockHTTPSSEHook
}));

// Mock NLD capture utility
vi.mock('../../../../src/utils/nld-ui-capture', () => ({
  nldCapture: {
    captureCommunicationBreakdown: vi.fn(),
    captureInstanceCreationFailure: vi.fn()
  }
}));

describe('ClaudeServiceManager - London School TDD Tests', () => {
  let mockEventHandlers: Map<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEventHandlers = new Map();
    
    // Setup event handler capture
    mockHTTPSSEHook.on.mockImplementation((event: string, handler: Function) => {
      mockEventHandlers.set(event, handler);
    });

    // Mock fetch responses
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: true,
        instances: []
      })
    });
  });

  describe('Instance Creation Workflow - London School', () => {
    it('should coordinate instance creation with proper API contract', async () => {
      // Arrange - Mock successful instance creation
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          instances: [] // Initial fetch
        })
      }).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          instanceId: 'claude-123',
          instance: {
            id: 'claude-123',
            type: 'prod',
            workingDirectory: '/prod'
          }
        })
      });

      // Act
      render(<ClaudeInstanceManager />);
      
      const prodButton = screen.getByText('🚀 prod/claude');
      await userEvent.click(prodButton);

      // Assert - Verify API contract interaction
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3333/api/v1/claude/instances',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              command: ['claude'],
              instanceType: 'prod'
            })
          })
        );
      });
    });

    it('should enforce /prod directory requirement', async () => {
      // Arrange
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          instances: []
        })
      });

      // Act
      render(<ClaudeInstanceManager />);
      const prodButton = screen.getByText('🚀 prod/claude');
      await userEvent.click(prodButton);

      // Assert - Production configuration should be sent
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: JSON.stringify({
              command: ['claude'],
              instanceType: 'prod'
            })
          })
        );
      });
    });

    it('should handle skip-permissions configuration', async () => {
      // Arrange
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true, instances: [] })
      });

      // Act
      render(<ClaudeInstanceManager />);
      const skipButton = screen.getByText('⚡ skip-permissions');
      await userEvent.click(skipButton);

      // Assert
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: JSON.stringify({
              command: ['claude', '--dangerously-skip-permissions'],
              instanceType: 'skip-permissions'
            })
          })
        );
      });
    });
  });

  describe('Instance Status and Communication - London School', () => {
    it('should handle status updates through event system', async () => {
      // Arrange
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          instances: [{
            id: 'claude-123',
            name: 'Test Instance',
            status: 'starting'
          }]
        })
      });

      render(<ClaudeInstanceManager />);

      // Act - Simulate status update event
      await waitFor(() => {
        const statusHandler = mockEventHandlers.get('instance:status');
        if (statusHandler) {
          statusHandler({
            instanceId: 'claude-123',
            status: 'running'
          });
        }
      });

      // Assert - Status should be updated in UI
      await waitFor(() => {
        expect(screen.getByTestId('status-claude-123')).toHaveTextContent('running');
      });
    });

    it('should handle terminal output streaming', async () => {
      // Arrange
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          instances: [{
            id: 'claude-456',
            name: 'Output Test',
            status: 'running'
          }]
        })
      });

      render(<ClaudeInstanceManager />);

      // Act - Simulate terminal output
      const outputHandler = mockEventHandlers.get('terminal:output');
      if (outputHandler) {
        outputHandler({
          output: 'Claude is ready for interactions\n',
          instanceId: 'claude-456',
          isReal: true
        });
      }

      // Assert - Output should be displayed
      await waitFor(() => {
        const outputArea = screen.getByTestId('terminal-output');
        expect(outputArea).toHaveTextContent('Claude is ready for interactions');
      });
    });
  });

  describe('Error Handling and Validation - London School', () => {
    it('should handle API errors gracefully', async () => {
      // Arrange - Mock API failure
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true, instances: [] })
      }).mockRejectedValueOnce(new Error('Network error'));

      // Act
      render(<ClaudeInstanceManager />);
      const prodButton = screen.getByText('🚀 prod/claude');
      await userEvent.click(prodButton);

      // Assert - Should show error message
      await waitFor(() => {
        expect(screen.getByText('Failed to create instance')).toBeInTheDocument();
      });
    });

    it('should validate instance ID format', async () => {
      // Arrange - Mock invalid instance response
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          instances: [{
            id: 'invalid-format',
            name: 'Invalid Instance',
            status: 'running'
          }]
        })
      });

      render(<ClaudeInstanceManager />);

      // Act - Try to select invalid instance
      await waitFor(() => {
        const instanceCard = screen.getByTestId('instance-card');
        fireEvent.click(instanceCard);
      });

      // Assert - Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/Invalid instance ID format/)).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Communication - London School', () => {
    it('should establish proper event handler setup', async () => {
      // Act
      render(<ClaudeInstanceManager />);

      // Assert - Should set up all required event handlers
      await waitFor(() => {
        expect(mockHTTPSSEHook.on).toHaveBeenCalledWith('connect', expect.any(Function));
        expect(mockHTTPSSEHook.on).toHaveBeenCalledWith('terminal:output', expect.any(Function));
        expect(mockHTTPSSEHook.on).toHaveBeenCalledWith('instance:create:success', expect.any(Function));
        expect(mockHTTPSSEHook.on).toHaveBeenCalledWith('instance:status', expect.any(Function));
        expect(mockHTTPSSEHook.on).toHaveBeenCalledWith('error', expect.any(Function));
      });
    });

    it('should handle connection events properly', async () => {
      // Arrange
      render(<ClaudeInstanceManager />);

      // Act - Simulate connection event
      const connectHandler = mockEventHandlers.get('connect');
      if (connectHandler) {
        connectHandler({
          connectionType: 'sse',
          instanceId: 'claude-connection-test'
        });
      }

      // Assert - Should update connection status
      await waitFor(() => {
        expect(screen.getByText(/Connected via SSE/)).toBeInTheDocument();
      });
    });
  });

  describe('Input and Command Handling - London School', () => {
    it('should validate input before sending commands', async () => {
      // Arrange
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          instances: [{
            id: 'claude-valid-123',
            name: 'Valid Instance',
            status: 'running'
          }]
        })
      });

      render(<ClaudeInstanceManager />);

      // Wait for instance to load and select it
      await waitFor(() => {
        const instanceCard = screen.getByTestId('instance-card');
        fireEvent.click(instanceCard);
      });

      // Act - Send valid command
      const commandInput = screen.getByTestId('command-input');
      const sendButton = screen.getByTestId('send-command-button');

      await userEvent.type(commandInput, 'test command');
      await userEvent.click(sendButton);

      // Assert - Should emit command
      expect(mockHTTPSSEHook.emit).toHaveBeenCalledWith(
        'terminal:input',
        expect.objectContaining({
          input: 'test command\n',
          instanceId: 'claude-valid-123'
        })
      );
    });

    it('should prevent sending commands without valid instance selection', async () => {
      // Arrange
      render(<ClaudeInstanceManager />);

      // Act - Try to send command without selecting instance
      const commandInput = screen.getByTestId('command-input');
      const sendButton = screen.getByTestId('send-command-button');

      await userEvent.type(commandInput, 'test command');
      await userEvent.click(sendButton);

      // Assert - Should not emit command
      expect(mockHTTPSSEHook.emit).not.toHaveBeenCalled();
    });
  });

  describe('Lifecycle Management - London School', () => {
    it('should handle instance termination workflow', async () => {
      // Arrange
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          instances: [{
            id: 'claude-terminate-test',
            name: 'Terminate Test',
            status: 'running'
          }]
        })
      });

      render(<ClaudeInstanceManager />);

      // Act - Terminate instance
      await waitFor(() => {
        const terminateButton = screen.getByTestId('disconnect-button-claude-terminate-test');
        fireEvent.click(terminateButton);
      });

      // Assert - Should call DELETE API
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3333/api/v1/claude/instances/claude-terminate-test',
          expect.objectContaining({
            method: 'DELETE'
          })
        );
      });
    });
  });
});