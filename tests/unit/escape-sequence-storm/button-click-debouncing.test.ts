/**
 * TDD Test Suite: Button Click Debouncing for Escape Sequence Storm Prevention
 * 
 * Root Cause: Multiple rapid clicks on launch buttons cause overlapping Claude instance
 * spawning which creates terminal escape sequence storms due to race conditions.
 * 
 * These tests SHOULD FAIL initially, demonstrating current broken behavior.
 */

import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { jest } from '@jest/globals';
import ClaudeInstanceManager from '../../../frontend/src/components/ClaudeInstanceManager';

// Mock the HTTP/SSE hook to control behavior
const mockUseHTTPSSE = {
  socket: { id: 'mock-socket', connected: true, emit: jest.fn(), on: jest.fn(), off: jest.fn() },
  isConnected: true,
  connectionError: null,
  connectSSE: jest.fn(),
  startPolling: jest.fn(),
  disconnectFromInstance: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn()
};

// Mock fetch for API calls
global.fetch = jest.fn();

jest.mock('../../../frontend/src/hooks/useHTTPSSE', () => ({
  useHTTPSSE: () => mockUseHTTPSSE
}));

describe('Button Click Debouncing - Escape Sequence Storm Prevention', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default fetch response for instance creation
    (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (url.includes('/api/claude/instances') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            instanceId: `claude-${Date.now()}`,
            instance: { id: `claude-${Date.now()}`, type: 'prod' }
          })
        });
      }
      if (url.includes('/api/claude/instances') && options?.method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            instances: []
          })
        });
      }
      return Promise.reject(new Error('Unexpected fetch call'));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Single Button Click Prevention', () => {
    test('SHOULD FAIL: Multiple rapid clicks on prod/claude button create multiple instances', async () => {
      const { container } = render(<ClaudeInstanceManager />);
      
      // Find the prod/claude launch button
      const prodButton = screen.getByTitle('Launch Claude in prod directory');
      
      // Simulate rapid multiple clicks (this should be prevented but isn't)
      fireEvent.click(prodButton);
      fireEvent.click(prodButton);
      fireEvent.click(prodButton);
      
      // Wait for async operations
      await waitFor(() => {
        // This test SHOULD FAIL because we expect only 1 API call but get 3
        expect(global.fetch).toHaveBeenCalledTimes(1); // This will FAIL - actually called 3 times
      }, { timeout: 3000 });
    });

    test('SHOULD FAIL: Skip-permissions button allows multiple overlapping spawns', async () => {
      const { container } = render(<ClaudeInstanceManager />);
      
      const skipPermsButton = screen.getByTitle('Launch with permissions skipped');
      
      // Simulate rapid double-click within debounce window
      fireEvent.click(skipPermsButton);
      setTimeout(() => fireEvent.click(skipPermsButton), 50); // 50ms later
      
      await waitFor(() => {
        // Should only create one instance, but creates two
        const createCalls = (global.fetch as jest.Mock).mock.calls.filter(
          call => call[0].includes('/api/claude/instances') && call[1]?.method === 'POST'
        );
        expect(createCalls).toHaveLength(1); // FAILS - actually 2
      });
    });

    test('SHOULD FAIL: Button remains clickable during instance creation', async () => {
      const { container } = render(<ClaudeInstanceManager />);
      
      // Mock slow API response
      (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
        if (url.includes('/api/claude/instances') && options?.method === 'POST') {
          return new Promise(resolve => {
            setTimeout(() => resolve({
              ok: true,
              json: () => Promise.resolve({
                success: true,
                instanceId: 'claude-test',
                instance: { id: 'claude-test', type: 'prod' }
              })
            }), 2000); // 2 second delay
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, instances: [] }) });
      });
      
      const prodButton = screen.getByTitle('Launch Claude in prod directory');
      
      // First click
      fireEvent.click(prodButton);
      
      // Button should be disabled immediately, but isn't
      expect(prodButton).toBeDisabled(); // FAILS - button remains enabled
      
      // Second click while first is processing
      fireEvent.click(prodButton);
      
      await waitFor(() => {
        const createCalls = (global.fetch as jest.Mock).mock.calls.filter(
          call => call[0].includes('/api/claude/instances') && call[1]?.method === 'POST'
        );
        expect(createCalls).toHaveLength(1); // FAILS - gets 2
      }, { timeout: 3000 });
    });
  });

  describe('Loading State Management', () => {
    test('SHOULD FAIL: Loading state not properly managed across buttons', async () => {
      const { container } = render(<ClaudeInstanceManager />);
      
      const prodButton = screen.getByTitle('Launch Claude in prod directory');
      const skipButton = screen.getByTitle('Launch with permissions skipped');
      
      // Click one button
      fireEvent.click(prodButton);
      
      // Other buttons should be disabled during loading, but aren't
      expect(skipButton).toBeDisabled(); // FAILS - other buttons remain enabled
    });

    test('SHOULD FAIL: Loading state persists after failed creation', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      const { container } = render(<ClaudeInstanceManager />);
      const prodButton = screen.getByTitle('Launch Claude in prod directory');
      
      fireEvent.click(prodButton);
      
      await waitFor(() => {
        // Button should be re-enabled after error, but stays disabled
        expect(prodButton).not.toBeDisabled(); // FAILS - button remains disabled
      });
    });

    test('SHOULD FAIL: No visual feedback during instance creation', async () => {
      const { container } = render(<ClaudeInstanceManager />);
      const prodButton = screen.getByTitle('Launch Claude in prod directory');
      
      fireEvent.click(prodButton);
      
      // Should show loading spinner or text, but doesn't
      expect(screen.queryByText(/creating/i)).toBeInTheDocument(); // FAILS - no loading indicator
    });
  });

  describe('Race Condition Prevention', () => {
    test('SHOULD FAIL: Simultaneous different button clicks create competing instances', async () => {
      const { container } = render(<ClaudeInstanceManager />);
      
      const prodButton = screen.getByTitle('Launch Claude in prod directory');
      const skipButton = screen.getByTitle('Launch with permissions skipped');
      
      // Simulate simultaneous clicks on different buttons
      fireEvent.click(prodButton);
      fireEvent.click(skipButton);
      
      await waitFor(() => {
        const createCalls = (global.fetch as jest.Mock).mock.calls.filter(
          call => call[0].includes('/api/claude/instances') && call[1]?.method === 'POST'
        );
        // Should only allow one instance creation at a time
        expect(createCalls).toHaveLength(1); // FAILS - both buttons create instances
      });
    });

    test('SHOULD FAIL: Instance creation while previous instance still starting', async () => {
      const { container } = render(<ClaudeInstanceManager />);
      
      // Mock initial instances response with starting instance
      (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
        if (url.includes('/api/claude/instances') && options?.method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              instances: [{ id: 'claude-existing', status: 'starting', type: 'prod' }]
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, instanceId: 'claude-new' })
        });
      });
      
      const prodButton = screen.getByTitle('Launch Claude in prod directory');
      
      // Should prevent new instance creation while existing is starting
      fireEvent.click(prodButton);
      
      await waitFor(() => {
        const createCalls = (global.fetch as jest.Mock).mock.calls.filter(
          call => call[0].includes('/api/claude/instances') && call[1]?.method === 'POST'
        );
        expect(createCalls).toHaveLength(0); // FAILS - allows creation despite starting instance
      });
    });
  });

  describe('Error Recovery', () => {
    test('SHOULD FAIL: Button state not reset after creation failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Creation failed'));
      
      const { container } = render(<ClaudeInstanceManager />);
      const prodButton = screen.getByTitle('Launch Claude in prod directory');
      
      fireEvent.click(prodButton);
      
      await waitFor(() => {
        // Button should be clickable again after error
        expect(prodButton).not.toBeDisabled(); // FAILS - button remains disabled
      });
      
      // Second click after error should work
      fireEvent.click(prodButton);
      
      // Should make another API call
      expect(global.fetch).toHaveBeenCalledTimes(3); // FAILS - no second attempt possible
    });

    test('SHOULD FAIL: No timeout protection for hanging creation requests', async () => {
      // Mock hanging request (never resolves)
      (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
      
      const { container } = render(<ClaudeInstanceManager />);
      const prodButton = screen.getByTitle('Launch Claude in prod directory');
      
      fireEvent.click(prodButton);
      
      // Should timeout and reset button state after reasonable time
      await waitFor(() => {
        expect(prodButton).not.toBeDisabled(); // FAILS - button never re-enables
      }, { timeout: 10000 });
    });
  });

  describe('Escape Sequence Storm Root Cause', () => {
    test('SHOULD FAIL: Multiple instances spawned simultaneously create output conflicts', async () => {
      const mockSSEConnect = jest.fn();
      mockUseHTTPSSE.connectSSE = mockSSEConnect;
      
      // Mock successful creation of multiple instances
      let instanceCounter = 0;
      (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
        if (url.includes('/api/claude/instances') && options?.method === 'POST') {
          instanceCounter++;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              instanceId: `claude-${instanceCounter}`,
              instance: { id: `claude-${instanceCounter}`, type: 'prod' }
            })
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, instances: [] }) });
      });
      
      const { container } = render(<ClaudeInstanceManager />);
      const prodButton = screen.getByTitle('Launch Claude in prod directory');
      
      // Rapid clicks creating multiple instances
      fireEvent.click(prodButton);
      fireEvent.click(prodButton);
      fireEvent.click(prodButton);
      
      await waitFor(() => {
        // Should only create one instance to prevent conflicts
        expect(instanceCounter).toBe(1); // FAILS - creates multiple
        
        // Should only establish one SSE connection
        expect(mockSSEConnect).toHaveBeenCalledTimes(1); // FAILS - multiple SSE connections
      });
    });

    test('SHOULD FAIL: Overlapping instance lifecycles cause PTY conflicts', async () => {
      const { container } = render(<ClaudeInstanceManager />);
      const prodButton = screen.getByTitle('Launch Claude in prod directory');
      
      // First instance creation
      fireEvent.click(prodButton);
      
      // Second click before first completes (race condition)
      setTimeout(() => fireEvent.click(prodButton), 100);
      
      await waitFor(() => {
        // Should prevent overlapping instance creation
        const createCalls = (global.fetch as jest.Mock).mock.calls.filter(
          call => call[0].includes('/api/claude/instances') && call[1]?.method === 'POST'
        );
        expect(createCalls).toHaveLength(1); // FAILS - allows overlapping creation
      });
    });
  });
});