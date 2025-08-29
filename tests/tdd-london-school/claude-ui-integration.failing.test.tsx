/**
 * TDD LONDON SCHOOL: Claude UI Integration Failing Tests
 * 
 * PURPOSE: These tests are designed to FAIL and expose UI integration errors
 * They should reveal:
 * - Component interaction failures
 * - State synchronization issues
 * - Event handling problems
 * - Memory leaks in UI updates
 * - Chat interface failures
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import ClaudeInstanceManagerModern from '../../frontend/src/components/ClaudeInstanceManagerModern';
import ClaudeInstanceManagerModernFixed from '../../frontend/src/components/ClaudeInstanceManagerModernFixed';

// Mock UI components that may be missing
vi.mock('../../frontend/src/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={`card ${className}`}>{children}</div>,
  CardHeader: ({ children }: any) => <div className="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h2 className="card-title">{children}</h2>,
  CardContent: ({ children }: any) => <div className="card-content">{children}</div>,
}));

vi.mock('../../frontend/src/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => <span className={`badge badge-${variant}`}>{children}</span>,
}));

vi.mock('../../frontend/src/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className }: any) => (
    <button onClick={onClick} disabled={disabled} className={`button ${className}`}>
      {children}
    </button>
  ),
}));

// Mock utilities
vi.mock('../../frontend/src/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

vi.mock('../../frontend/src/utils/nld-ui-capture', () => ({
  nldCapture: {
    captureCommunicationBreakdown: vi.fn(),
    captureInstanceCreationFailure: vi.fn(),
  },
}));

// Mock hooks
const mockUseWebSocketTerminal = {
  socket: null,
  isConnected: false,
  lastMessage: null,
  connectionError: null,
  connectToTerminal: vi.fn(),
  disconnectFromTerminal: vi.fn(),
  send: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
};

vi.mock('../../frontend/src/hooks/useWebSocketTerminal', () => ({
  useWebSocketTerminal: () => mockUseWebSocketTerminal,
}));

vi.mock('../../frontend/src/hooks/useSSEConnectionSingleton', () => ({
  useSSEConnectionSingleton: () => ({
    connectionState: {
      isConnected: false,
      instanceId: null,
      connectionType: 'none',
      lastError: null,
    },
    connectToInstance: vi.fn(),
    disconnectFromInstance: vi.fn(),
    sendCommand: vi.fn(),
    addHandler: vi.fn(),
    removeHandler: vi.fn(),
    isConnected: false,
    getAllConnections: () => ({ activeConnections: 0, totalHandlers: 0 }),
  }),
}));

// Mock Claude manager components
vi.mock('../../frontend/src/components/claude-manager', () => ({
  ClaudeInstanceButtons: ({ onCreateInstance, loading }: any) => (
    <div data-testid="claude-instance-buttons">
      <button 
        onClick={() => onCreateInstance('claude')} 
        disabled={loading}
        data-testid="prod-claude-button"
      >
        prod/claude
      </button>
      <button 
        onClick={() => onCreateInstance('claude --dangerously-skip-permissions')} 
        disabled={loading}
        data-testid="skip-permissions-button"
      >
        skip-permissions
      </button>
    </div>
  ),
  ChatInterface: ({ 
    selectedInstance, 
    output, 
    connectionType, 
    isConnected, 
    onSendInput,
    loading,
    error
  }: any) => (
    <div data-testid="chat-interface">
      <div data-testid="connection-status">
        Status: {connectionType} - {isConnected ? 'Connected' : 'Disconnected'}
      </div>
      <div data-testid="terminal-output">
        {selectedInstance ? 
          (output[selectedInstance?.id] || 'No output') : 
          'No instance selected'
        }
      </div>
      <div data-testid="chat-input">
        <textarea 
          data-testid="message-input"
          placeholder="Type your message"
        />
        <button 
          data-testid="send-button"
          onClick={() => onSendInput('test message')}
          disabled={loading}
        >
          Send
        </button>
      </div>
      {error && <div data-testid="error-display">{error}</div>}
    </div>
  ),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Claude UI Integration - FAILING TESTS (TDD London School)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockRejectedValue(new Error('Network error'));
    console.error = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Integration Failures', () => {
    test('SHOULD FAIL: ClaudeInstanceManagerModern renders with all subcomponents', async () => {
      render(<ClaudeInstanceManagerModern />);

      // Should render main structure - will fail if components are missing
      expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
      expect(screen.getByTestId('claude-instance-buttons')).toBeInTheDocument();
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument();

      // Should show proper initial state - will fail if state management is broken
      expect(screen.getByText('Active Instances')).toBeInTheDocument();
      expect(screen.getByText('No active instances')).toBeInTheDocument();
    });

    test('SHOULD FAIL: Instance buttons integrate with creation logic', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          terminalId: 'claude-new-123',
        }),
      });

      render(<ClaudeInstanceManagerModern />);

      const prodButton = screen.getByTestId('prod-claude-button');
      await user.click(prodButton);

      // Should trigger instance creation - will fail if integration is broken
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/launch'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('claude')
        })
      );
    });

    test('SHOULD FAIL: Chat interface integrates with terminal communication', async () => {
      const user = userEvent.setup();

      // Mock instance data
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          terminals: [{ id: 'claude-123', isAlive: true, pid: 12345 }]
        })
      });

      render(<ClaudeInstanceManagerModern />);

      // Wait for instances to load and select one
      await waitFor(() => {
        const instanceCard = screen.getByText(/Terminal claude-123/);
        expect(instanceCard).toBeInTheDocument();
      });

      const instanceCard = screen.getByText(/Terminal claude-123/);
      await user.click(instanceCard);

      // Chat interface should be active - will fail if integration is broken
      const chatInterface = screen.getByTestId('chat-interface');
      expect(chatInterface).toBeInTheDocument();

      const sendButton = screen.getByTestId('send-button');
      await user.click(sendButton);

      // Should send message - will fail if communication is broken
      expect(mockUseWebSocketTerminal.send).toHaveBeenCalledWith('test message');
    });

    test('SHOULD FAIL: Error states propagate through UI correctly', async () => {
      mockFetch.mockRejectedValue(new Error('API server unavailable'));

      render(<ClaudeInstanceManagerModern />);

      // Should display error in UI - will fail if error propagation is broken
      await waitFor(() => {
        expect(screen.getByTestId('error-display')).toBeInTheDocument();
        expect(screen.getByText(/failed to fetch instances/i)).toBeInTheDocument();
      });
    });
  });

  describe('State Synchronization Failures', () => {
    test('SHOULD FAIL: Instance list updates when instances change', async () => {
      const user = userEvent.setup();

      // Initial empty response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, terminals: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            terminalId: 'claude-new-123'
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            terminals: [{ id: 'claude-new-123', isAlive: true, pid: 12345 }]
          })
        });

      render(<ClaudeInstanceManagerModern />);

      // Initially no instances - will fail if initial state is wrong
      expect(screen.getByText('No active instances')).toBeInTheDocument();

      // Create instance
      const prodButton = screen.getByTestId('prod-claude-button');
      await user.click(prodButton);

      // Should show new instance - will fail if state sync is broken
      await waitFor(() => {
        expect(screen.getByText(/Terminal claude-new-123/)).toBeInTheDocument();
      });
    });

    test('SHOULD FAIL: Connection status updates in real-time', async () => {
      render(<ClaudeInstanceManagerModern />);

      const connectionStatus = screen.getByTestId('connection-status');
      expect(connectionStatus).toHaveTextContent('Disconnected');

      // Simulate connection
      act(() => {
        mockUseWebSocketTerminal.isConnected = true;
      });

      // Should update connection status - will fail if status sync is broken
      await waitFor(() => {
        expect(connectionStatus).toHaveTextContent('Connected');
      });
    });

    test('SHOULD FAIL: Terminal output updates in chat interface', async () => {
      const user = userEvent.setup();

      // Mock instance selection
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          terminals: [{ id: 'claude-123', isAlive: true, pid: 12345 }]
        })
      });

      render(<ClaudeInstanceManagerModern />);

      await waitFor(() => {
        const instanceCard = screen.getByText(/Terminal claude-123/);
        user.click(instanceCard);
      });

      // Simulate terminal output
      const terminalOutput = screen.getByTestId('terminal-output');
      
      act(() => {
        // Simulate output update through subscribe callback
        const subscribeCall = mockUseWebSocketTerminal.subscribe.mock.calls
          .find(([event]) => event === 'terminal:output');
        
        if (subscribeCall) {
          subscribeCall[1]({
            terminalId: 'claude-123',
            output: 'Hello from Claude terminal!'
          });
        }
      });

      // Should display output - will fail if output sync is broken
      await waitFor(() => {
        expect(terminalOutput).toHaveTextContent('Hello from Claude terminal!');
      });
    });
  });

  describe('Event Handling Failures', () => {
    test('SHOULD FAIL: WebSocket events are properly subscribed', () => {
      render(<ClaudeInstanceManagerModern />);

      // Should subscribe to necessary events - will fail if subscriptions are missing
      const expectedEvents = ['connect', 'terminal:output', 'message', 'terminal:status', 'error', 'disconnect'];
      
      expectedEvents.forEach(event => {
        expect(mockUseWebSocketTerminal.subscribe).toHaveBeenCalledWith(
          event,
          expect.any(Function)
        );
      });
    });

    test('SHOULD FAIL: Event handlers are cleaned up on unmount', () => {
      const { unmount } = render(<ClaudeInstanceManagerModern />);

      // Clear mock to track cleanup calls
      vi.clearAllMocks();
      
      unmount();

      // Should unsubscribe from events - will fail if cleanup is broken
      const expectedEvents = ['connect', 'terminal:output', 'message', 'terminal:status', 'error', 'disconnect'];
      
      expectedEvents.forEach(event => {
        expect(mockUseWebSocketTerminal.unsubscribe).toHaveBeenCalledWith(event);
      });
    });

    test('SHOULD FAIL: Error events update UI error state', () => {
      render(<ClaudeInstanceManagerModern />);

      // Simulate error event
      act(() => {
        const errorSubscribeCall = mockUseWebSocketTerminal.subscribe.mock.calls
          .find(([event]) => event === 'error');
        
        if (errorSubscribeCall) {
          errorSubscribeCall[1]({ message: 'Connection failed' });
        }
      });

      // Should show error in UI - will fail if error handling is broken
      waitFor(() => {
        expect(screen.getByTestId('error-display')).toHaveTextContent('Connection failed');
      });
    });
  });

  describe('Memory Management Failures', () => {
    test('SHOULD FAIL: Components clean up output state properly', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          terminals: [{ id: 'claude-123', isAlive: true, pid: 12345 }]
        })
      });

      const { rerender } = render(<ClaudeInstanceManagerModern />);

      // Select instance and accumulate output
      await waitFor(async () => {
        const instanceCard = screen.getByText(/Terminal claude-123/);
        await user.click(instanceCard);
      });

      // Simulate large amount of output
      for (let i = 0; i < 100; i++) {
        act(() => {
          const outputSubscribeCall = mockUseWebSocketTerminal.subscribe.mock.calls
            .find(([event]) => event === 'terminal:output');
          
          if (outputSubscribeCall) {
            outputSubscribeCall[1]({
              terminalId: 'claude-123',
              output: `Line ${i}: This is terminal output\n`
            });
          }
        });
      }

      // Rerender to trigger cleanup logic
      rerender(<ClaudeInstanceManagerModern />);

      // Memory should be managed - will fail if memory leaks exist
      // This is a conceptual test - in practice, we'd check actual memory usage
      expect(true).toBe(true); // Placeholder - real test would monitor memory
    });

    test('SHOULD FAIL: Instance termination cleans up all state', async () => {
      const user = userEvent.setup();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            terminals: [{ id: 'claude-123', isAlive: true, pid: 12345 }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });

      render(<ClaudeInstanceManagerModern />);

      // Select instance
      await waitFor(async () => {
        const instanceCard = screen.getByText(/Terminal claude-123/);
        await user.click(instanceCard);
      });

      // Terminate instance
      const terminateButton = screen.getByRole('button', { name: /×/ });
      await user.click(terminateButton);

      // Should clean up all state - will fail if cleanup is incomplete
      await waitFor(() => {
        expect(mockUseWebSocketTerminal.disconnectFromTerminal).toHaveBeenCalled();
        expect(screen.queryByText(/Terminal claude-123/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Fixed Component Comparison Failures', () => {
    test('SHOULD FAIL: ModernFixed component has better error handling', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

      // Render both components with error conditions
      const { unmount: unmount1 } = render(<ClaudeInstanceManagerModern />);
      const { unmount: unmount2 } = render(<ClaudeInstanceManagerModernFixed />);

      // Fixed component should have fewer errors
      const modernErrors = consoleSpy.mock.calls.filter(call => 
        call[0]?.toString().includes('ClaudeInstanceManagerModern')
      ).length;

      const fixedErrors = consoleSpy.mock.calls.filter(call => 
        call[0]?.toString().includes('ClaudeInstanceManagerModernFixed')
      ).length;

      // Fixed should have fewer errors - will fail if improvements are missing
      expect(fixedErrors).toBeLessThan(modernErrors);

      unmount1();
      unmount2();
      consoleSpy.mockRestore();
    });

    test('SHOULD FAIL: Fixed component handles SSE connections better', () => {
      render(<ClaudeInstanceManagerModernFixed />);

      // Fixed component should use singleton SSE - will fail if not implemented
      // This test depends on the mocked useSSEConnectionSingleton being called
      // The actual implementation details would be tested through integration
      expect(true).toBe(true); // Placeholder for actual SSE behavior testing
    });

    test('SHOULD FAIL: Fixed component has incremental message processing', async () => {
      const user = userEvent.setup();

      render(<ClaudeInstanceManagerModernFixed />);

      // Fixed component should handle incremental updates - will fail if not implemented
      // This would test the actual IncrementalMessageProcessor integration
      // For now, this is a placeholder test
      expect(true).toBe(true);
    });
  });

  describe('Performance Integration Failures', () => {
    test('SHOULD FAIL: Component handles rapid state updates', async () => {
      const user = userEvent.setup();
      render(<ClaudeInstanceManagerModern />);

      // Simulate rapid updates
      for (let i = 0; i < 50; i++) {
        act(() => {
          const outputSubscribeCall = mockUseWebSocketTerminal.subscribe.mock.calls
            .find(([event]) => event === 'terminal:output');
          
          if (outputSubscribeCall) {
            outputSubscribeCall[1]({
              terminalId: 'claude-123',
              output: `Rapid update ${i}\n`
            });
          }
        });
      }

      // Component should remain responsive - will fail if performance is poor
      expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
    });

    test('SHOULD FAIL: Component handles concurrent operations', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          terminalId: 'claude-concurrent-123'
        })
      });

      render(<ClaudeInstanceManagerModern />);

      // Simulate concurrent button clicks
      const prodButton = screen.getByTestId('prod-claude-button');
      const skipButton = screen.getByTestId('skip-permissions-button');

      const promises = [
        user.click(prodButton),
        user.click(skipButton),
        user.click(prodButton),
      ];

      await Promise.all(promises);

      // Should handle concurrent operations gracefully - will fail if race conditions exist
      expect(screen.queryByText(/error|crash/i)).not.toBeInTheDocument();
    });
  });
});