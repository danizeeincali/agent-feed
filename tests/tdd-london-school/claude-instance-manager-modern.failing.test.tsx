/**
 * TDD LONDON SCHOOL: ClaudeInstanceManagerModern Failing Tests
 * 
 * PURPOSE: These tests are designed to FAIL and expose all component errors
 * They should reveal:
 * - Rendering errors
 * - Missing imports
 * - Broken hooks
 * - Component crashes
 * - State management issues
 * 
 * DO NOT FIX THESE TESTS UNTIL ALL FAILURES ARE DOCUMENTED
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import ClaudeInstanceManagerModern from '../../frontend/src/components/ClaudeInstanceManagerModern';

// Mock WebSocket to prevent actual connections
const mockWebSocket = vi.fn(() => ({
  close: vi.fn(),
  send: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.OPEN,
}));
global.WebSocket = mockWebSocket as any;

// Mock EventSource for SSE
const mockEventSource = vi.fn(() => ({
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: EventSource.OPEN,
}));
global.EventSource = mockEventSource as any;

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ClaudeInstanceManagerModern - FAILING TESTS (TDD London School)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mocks to default failing state
    mockFetch.mockRejectedValue(new Error('Network error'));
    console.error = vi.fn(); // Suppress expected errors
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering Failures', () => {
    test('SHOULD FAIL: Component renders without crashing', async () => {
      // This test should FAIL if there are import errors, missing dependencies, or render crashes
      const user = userEvent.setup();

      expect(() => {
        render(<ClaudeInstanceManagerModern />);
      }).not.toThrow();

      // Should find basic UI elements - will fail if component doesn't render
      expect(screen.getByText('Claude Instance Manager')).toBeInTheDocument();
      expect(screen.getByText('Launch and manage Claude instances')).toBeInTheDocument();
    });

    test('SHOULD FAIL: Missing required UI components render', async () => {
      render(<ClaudeInstanceManagerModern />);

      // These should fail if UI components are missing or not imported properly
      expect(screen.getByText('Active Instances')).toBeInTheDocument();
      expect(screen.getByText('No active instances')).toBeInTheDocument();
      
      // Look for Claude instance buttons - will fail if ClaudeInstanceButtons is broken
      const buttonContainer = screen.getByRole('region', { name: /launch buttons/i });
      expect(buttonContainer).toBeInTheDocument();
    });

    test('SHOULD FAIL: Error boundary renders correctly', async () => {
      // This should fail if error boundary is not implemented
      const ThrowError = () => {
        throw new Error('Test error');
      };

      expect(() => {
        render(
          <ClaudeInstanceManagerModern>
            <ThrowError />
          </ClaudeInstanceManagerModern>
        );
      }).not.toThrow();

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  describe('Button Click Handler Failures', () => {
    test('SHOULD FAIL: Claude launch buttons exist and are clickable', async () => {
      const user = userEvent.setup();
      render(<ClaudeInstanceManagerModern />);

      // These should fail if buttons are not properly rendered
      const prodButton = screen.getByRole('button', { name: /prod\/claude/i });
      const skipPermissionsButton = screen.getByRole('button', { name: /skip-permissions/i });

      expect(prodButton).toBeEnabled();
      expect(skipPermissionsButton).toBeEnabled();

      // Click should not throw JavaScript errors
      await expect(user.click(prodButton)).resolves.not.toThrow();
    });

    test('SHOULD FAIL: Button clicks trigger API calls', async () => {
      const user = userEvent.setup();
      
      // Mock successful API response to test the flow
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          terminalId: 'claude-test-123',
          terminals: [{ id: 'claude-test-123', isAlive: true, pid: 12345 }]
        })
      });

      render(<ClaudeInstanceManagerModern />);

      const prodButton = screen.getByRole('button', { name: /prod\/claude/i });
      await user.click(prodButton);

      // Should have made API call - will fail if createInstance is broken
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/launch'),
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('claude')
          })
        );
      });
    });

    test('SHOULD FAIL: Instance termination button works', async () => {
      const user = userEvent.setup();
      
      // Mock instances response
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

      // Wait for instances to load
      await waitFor(() => {
        expect(screen.getByText(/Terminal claude-123/)).toBeInTheDocument();
      });

      // Find and click termination button
      const terminateButton = screen.getByRole('button', { name: /×/ });
      await user.click(terminateButton);

      // Should make DELETE request - will fail if terminateInstance is broken
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/terminals/claude-123'),
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });
  });

  describe('WebSocket Connection Failures', () => {
    test('SHOULD FAIL: WebSocket terminal hook initializes', async () => {
      const user = userEvent.setup();
      render(<ClaudeInstanceManagerModern />);

      // Should have WebSocket hook initialized - will fail if useWebSocketTerminal is broken
      await waitFor(() => {
        expect(mockWebSocket).toHaveBeenCalledWith(
          expect.stringContaining('ws://localhost:3002')
        );
      });
    });

    test('SHOULD FAIL: WebSocket connects when instance is selected', async () => {
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

      // Wait for instances and click one
      await waitFor(() => {
        const instanceCard = screen.getByText(/Terminal claude-123/);
        user.click(instanceCard);
      });

      // Should establish WebSocket connection - will fail if handleInstanceSelect is broken
      await waitFor(() => {
        expect(mockWebSocket).toHaveBeenCalled();
      });
    });

    test('SHOULD FAIL: WebSocket handles connection errors gracefully', async () => {
      const mockWSInstance = {
        close: vi.fn(),
        send: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        readyState: WebSocket.CLOSED,
      };
      mockWebSocket.mockReturnValue(mockWSInstance);

      render(<ClaudeInstanceManagerModern />);

      // Simulate connection error
      const errorHandler = mockWSInstance.addEventListener.mock.calls
        .find(([event]) => event === 'error')?.[1];
      
      if (errorHandler) {
        act(() => {
          errorHandler(new Error('Connection failed'));
        });
      }

      // Should display connection error - will fail if error handling is broken
      await waitFor(() => {
        expect(screen.getByText(/connection error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Terminal I/O Failures', () => {
    test('SHOULD FAIL: Terminal output is displayed correctly', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          terminals: [{ id: 'claude-123', isAlive: true, pid: 12345 }]
        })
      });

      render(<ClaudeInstanceManagerModern />);

      // Select an instance
      await waitFor(async () => {
        const instanceCard = screen.getByText(/Terminal claude-123/);
        await user.click(instanceCard);
      });

      // Simulate terminal output via WebSocket
      const mockWSInstance = mockWebSocket.mock.results[0].value;
      const messageHandler = mockWSInstance.addEventListener.mock.calls
        .find(([event]) => event === 'message')?.[1];

      if (messageHandler) {
        act(() => {
          messageHandler({
            data: JSON.stringify({
              type: 'terminal:output',
              terminalId: 'claude-123',
              output: 'Hello from Claude terminal!'
            })
          });
        });
      }

      // Should display output in chat interface - will fail if output handling is broken
      await waitFor(() => {
        expect(screen.getByText(/Hello from Claude terminal!/)).toBeInTheDocument();
      });
    });

    test('SHOULD FAIL: Terminal input can be sent', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          terminals: [{ id: 'claude-123', isAlive: true, pid: 12345 }]
        })
      });

      render(<ClaudeInstanceManagerModern />);

      // Select instance and wait for chat interface
      await waitFor(async () => {
        const instanceCard = screen.getByText(/Terminal claude-123/);
        await user.click(instanceCard);
      });

      // Find and use input field
      const inputField = screen.getByPlaceholderText(/type your message/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(inputField, 'hello claude');
      await user.click(sendButton);

      // Should send via WebSocket - will fail if sendInput is broken
      const mockWSInstance = mockWebSocket.mock.results[0].value;
      expect(mockWSInstance.send).toHaveBeenCalledWith('hello claude');
    });

    test('SHOULD FAIL: Input validation prevents empty messages', async () => {
      const user = userEvent.setup();
      
      render(<ClaudeInstanceManagerModern />);

      const inputField = screen.getByPlaceholderText(/type your message/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Send button should be disabled with empty input - will fail if validation is broken
      expect(sendButton).toBeDisabled();

      await user.type(inputField, '   '); // Only whitespace
      expect(sendButton).toBeDisabled();
    });
  });

  describe('Error Handling Failures', () => {
    test('SHOULD FAIL: API errors are displayed to user', async () => {
      mockFetch.mockRejectedValue(new Error('API server unavailable'));

      render(<ClaudeInstanceManagerModern />);

      // Should show error message - will fail if error display is broken
      await waitFor(() => {
        expect(screen.getByText(/failed to fetch instances/i)).toBeInTheDocument();
      });
    });

    test('SHOULD FAIL: Network errors are handled gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock network failure
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      render(<ClaudeInstanceManagerModern />);

      const prodButton = screen.getByRole('button', { name: /prod\/claude/i });
      await user.click(prodButton);

      // Should display network error - will fail if error handling is broken
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    test('SHOULD FAIL: Invalid instance IDs are rejected', async () => {
      const user = userEvent.setup();
      
      render(<ClaudeInstanceManagerModern apiUrl="http://localhost:3002" />);

      // Mock invalid instance selection
      const component = screen.getByTestId('claude-instance-manager');
      
      // This should fail if validation is not implemented
      act(() => {
        // Simulate selecting invalid instance ID
        component.dispatchEvent(new CustomEvent('instanceSelect', {
          detail: { instanceId: 'invalid-id-format' }
        }));
      });

      await waitFor(() => {
        expect(screen.getByText(/invalid instance id/i)).toBeInTheDocument();
      });
    });

    test('SHOULD FAIL: Connection timeouts are handled', async () => {
      // Mock timeout scenario
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 1000)
        )
      );

      render(<ClaudeInstanceManagerModern />);

      // Should handle timeout gracefully - will fail if timeout handling is broken
      await waitFor(() => {
        expect(screen.getByText(/timeout|failed/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Integration Failures', () => {
    test('SHOULD FAIL: Component integrates with backend API correctly', async () => {
      const mockApiResponses = [
        // /api/terminals
        {
          ok: true,
          json: () => Promise.resolve({
            success: true,
            terminals: []
          })
        },
        // /api/launch
        {
          ok: true,
          json: () => Promise.resolve({
            success: true,
            terminalId: 'claude-new-123'
          })
        }
      ];

      mockFetch.mockImplementation(() => Promise.resolve(mockApiResponses.shift()));

      const user = userEvent.setup();
      render(<ClaudeInstanceManagerModern />);

      // Should load instances on mount - will fail if fetchInstances is broken
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/terminals')
        );
      });

      // Should create instance on button click - will fail if createInstance is broken
      const prodButton = screen.getByRole('button', { name: /prod\/claude/i });
      await user.click(prodButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/launch'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    test('SHOULD FAIL: Real-time updates work via WebSocket', async () => {
      render(<ClaudeInstanceManagerModern />);

      // Should establish WebSocket connection - will fail if WebSocket setup is broken
      await waitFor(() => {
        expect(mockWebSocket).toHaveBeenCalled();
      });

      // Mock message reception
      const mockWSInstance = mockWebSocket.mock.results[0].value;
      const messageHandler = mockWSInstance.addEventListener.mock.calls
        .find(([event]) => event === 'message')?.[1];

      // Should handle real-time updates - will fail if message handling is broken
      expect(messageHandler).toBeDefined();
    });
  });

  describe('Memory and Performance Failures', () => {
    test('SHOULD FAIL: Component cleans up WebSocket connections', async () => {
      const { unmount } = render(<ClaudeInstanceManagerModern />);
      
      const mockWSInstance = mockWebSocket.mock.results[0]?.value;
      
      // Unmount component
      unmount();

      // Should clean up connections - will fail if cleanup is not implemented
      await waitFor(() => {
        expect(mockWSInstance?.close).toHaveBeenCalled();
      });
    });

    test('SHOULD FAIL: Component handles rapid instance creation/deletion', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          terminalId: 'claude-rapid-123'
        })
      });

      render(<ClaudeInstanceManagerModern />);

      const prodButton = screen.getByRole('button', { name: /prod\/claude/i });

      // Rapid clicks should not break the component - will fail if state management is broken
      for (let i = 0; i < 5; i++) {
        await user.click(prodButton);
      }

      // Should handle rapid interactions gracefully
      expect(screen.queryByText(/error|crash/i)).not.toBeInTheDocument();
    });
  });
});