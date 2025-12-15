/**
 * useActivityStream Hook Tests (TDD - London School)
 * Tests for the activity stream hook that subscribes to SSE events
 */

import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useActivityStream } from '../../../hooks/useActivityStream';

describe('useActivityStream', () => {
  let eventSourceInstance: any;
  let eventHandlers: Map<string, Function>;

  beforeEach(() => {
    eventHandlers = new Map();

    // Create a mock EventSource instance
    eventSourceInstance = {
      addEventListener: vi.fn((event: string, handler: Function) => {
        eventHandlers.set(event, handler);
      }),
      removeEventListener: vi.fn(),
      close: vi.fn(),
      readyState: 1,
      url: '',
      withCredentials: false,
      CONNECTING: 0,
      OPEN: 1,
      CLOSED: 2,
      onopen: null,
      onmessage: null,
      onerror: null
    };

    // Mock EventSource constructor
    global.EventSource = vi.fn(() => eventSourceInstance) as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
    eventHandlers.clear();
  });

  describe('Connection Management', () => {
    it('should connect to SSE when enabled', () => {
      renderHook(() => useActivityStream(true));

      expect(global.EventSource).toHaveBeenCalledWith(
        expect.stringContaining('/api/streaming-ticker/stream')
      );
      expect(global.EventSource).toHaveBeenCalledWith(
        expect.stringContaining('userId=avi-chat')
      );
    });

    it('should not connect when disabled', () => {
      renderHook(() => useActivityStream(false));

      expect(global.EventSource).not.toHaveBeenCalled();
    });

    it('should use custom userId when provided', () => {
      renderHook(() => useActivityStream(true, 'custom-user-123'));

      expect(global.EventSource).toHaveBeenCalledWith(
        expect.stringContaining('userId=custom-user-123')
      );
    });

    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useActivityStream(true));

      unmount();

      expect(eventSourceInstance.close).toHaveBeenCalled();
    });

    it('should reconnect when enabled changes from false to true', () => {
      const { rerender } = renderHook(
        ({ enabled }) => useActivityStream(enabled),
        { initialProps: { enabled: false } }
      );

      expect(global.EventSource).not.toHaveBeenCalled();

      rerender({ enabled: true });

      expect(global.EventSource).toHaveBeenCalled();
    });

    it('should disconnect when enabled changes from true to false', () => {
      const { rerender } = renderHook(
        ({ enabled }) => useActivityStream(enabled),
        { initialProps: { enabled: true } }
      );

      expect(global.EventSource).toHaveBeenCalled();

      rerender({ enabled: false });

      expect(eventSourceInstance.close).toHaveBeenCalled();
    });
  });

  describe('Connection Status', () => {
    it('should start with disconnected status', () => {
      const { result } = renderHook(() => useActivityStream(false));

      expect(result.current.connectionStatus).toBe('disconnected');
    });

    it('should update to connected when connection opens', async () => {
      const { result } = renderHook(() => useActivityStream(true));

      // Simulate connection open
      if (eventSourceInstance.onopen) {
        eventSourceInstance.onopen();
      }

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });
    });

    it('should update to error on connection error', async () => {
      const { result } = renderHook(() => useActivityStream(true));

      // Simulate error
      if (eventSourceInstance.onerror) {
        eventSourceInstance.onerror(new Error('Connection failed'));
      }

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('error');
      });
    });

    it('should reset to disconnected when disabled', async () => {
      const { result, rerender } = renderHook(
        ({ enabled }) => useActivityStream(enabled),
        { initialProps: { enabled: true } }
      );

      // Open connection
      if (eventSourceInstance.onopen) {
        eventSourceInstance.onopen();
      }

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Disable
      rerender({ enabled: false });

      expect(result.current.connectionStatus).toBe('disconnected');
    });
  });

  describe('High Priority Filtering', () => {
    it('should display high-priority activities (priority: high)', async () => {
      const { result } = renderHook(() => useActivityStream(true));

      const message = {
        type: 'tool_activity',
        data: {
          priority: 'high',
          message: 'Test high priority message'
        }
      };

      // Simulate SSE message
      if (eventSourceInstance.onmessage) {
        eventSourceInstance.onmessage({ data: JSON.stringify(message) });
      }

      await waitFor(() => {
        expect(result.current.currentActivity).toBe('Test high priority message');
      });
    });

    it('should ignore low-priority activities', async () => {
      const { result } = renderHook(() => useActivityStream(true));

      const lowPriorityMsg = {
        type: 'tool_activity',
        data: {
          priority: 'low',
          message: 'Low priority message'
        }
      };

      // Simulate SSE message
      if (eventSourceInstance.onmessage) {
        eventSourceInstance.onmessage({ data: JSON.stringify(lowPriorityMsg) });
      }

      // Activity should remain null
      expect(result.current.currentActivity).toBeNull();
    });

    it('should display activities with high-priority tools', async () => {
      const { result } = renderHook(() => useActivityStream(true));

      const highPriorityTools = ['Task', 'Bash', 'Read', 'Write', 'Edit', 'Agent'];

      for (const tool of highPriorityTools) {
        const message = {
          type: 'tool_activity',
          data: {
            tool,
            action: 'test action',
            priority: 'medium' // Even with medium priority, high-priority tools are shown
          }
        };

        if (eventSourceInstance.onmessage) {
          eventSourceInstance.onmessage({ data: JSON.stringify(message) });
        }

        await waitFor(() => {
          expect(result.current.currentActivity).toBe(`${tool}(test action)`);
        });
      }
    });

    it('should display messages starting with "Phase"', async () => {
      const { result } = renderHook(() => useActivityStream(true));

      const phaseMessage = {
        type: 'tool_activity',
        data: {
          message: 'Phase 1: Initialize system',
          priority: 'medium'
        }
      };

      if (eventSourceInstance.onmessage) {
        eventSourceInstance.onmessage({ data: JSON.stringify(phaseMessage) });
      }

      await waitFor(() => {
        expect(result.current.currentActivity).toBe('Phase 1: Initialize system');
      });
    });

    it('should ignore non-Phase messages without high priority', async () => {
      const { result } = renderHook(() => useActivityStream(true));

      const lowPriorityMsg = {
        type: 'tool_activity',
        data: {
          message: 'Regular message',
          priority: 'medium'
        }
      };

      if (eventSourceInstance.onmessage) {
        eventSourceInstance.onmessage({ data: JSON.stringify(lowPriorityMsg) });
      }

      expect(result.current.currentActivity).toBeNull();
    });
  });

  describe('Activity Formatting', () => {
    it('should format tool with action as "Tool(action)"', async () => {
      const { result } = renderHook(() => useActivityStream(true));

      const message = {
        type: 'tool_activity',
        data: {
          tool: 'Bash',
          action: 'git status',
          priority: 'high'
        }
      };

      if (eventSourceInstance.onmessage) {
        eventSourceInstance.onmessage({ data: JSON.stringify(message) });
      }

      await waitFor(() => {
        expect(result.current.currentActivity).toBe('Bash(git status)');
      });
    });

    it('should display message when tool and action are not present', async () => {
      const { result } = renderHook(() => useActivityStream(true));

      const message = {
        type: 'tool_activity',
        data: {
          message: 'System processing...',
          priority: 'high'
        }
      };

      if (eventSourceInstance.onmessage) {
        eventSourceInstance.onmessage({ data: JSON.stringify(message) });
      }

      await waitFor(() => {
        expect(result.current.currentActivity).toBe('System processing...');
      });
    });

    it('should prefer tool/action format over message when both present', async () => {
      const { result } = renderHook(() => useActivityStream(true));

      const message = {
        type: 'tool_activity',
        data: {
          tool: 'Read',
          action: 'config.json',
          message: 'Reading configuration',
          priority: 'high'
        }
      };

      if (eventSourceInstance.onmessage) {
        eventSourceInstance.onmessage({ data: JSON.stringify(message) });
      }

      await waitFor(() => {
        expect(result.current.currentActivity).toBe('Read(config.json)');
      });
    });

    it('should ignore empty activities', async () => {
      const { result } = renderHook(() => useActivityStream(true));

      const emptyMessage = {
        type: 'tool_activity',
        data: {
          priority: 'high'
          // No tool, action, or message
        }
      };

      if (eventSourceInstance.onmessage) {
        eventSourceInstance.onmessage({ data: JSON.stringify(emptyMessage) });
      }

      // Should remain null
      expect(result.current.currentActivity).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const { result } = renderHook(() => useActivityStream(true));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Send invalid JSON
      if (eventSourceInstance.onmessage) {
        eventSourceInstance.onmessage({ data: 'invalid json {' });
      }

      // Should not crash, activity remains null
      expect(result.current.currentActivity).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle missing data property gracefully', async () => {
      const { result } = renderHook(() => useActivityStream(true));

      const messageWithoutData = {
        type: 'tool_activity'
        // No data property
      };

      if (eventSourceInstance.onmessage) {
        eventSourceInstance.onmessage({ data: JSON.stringify(messageWithoutData) });
      }

      // Should not crash
      expect(result.current.currentActivity).toBeNull();
    });
  });

  describe('Multiple Messages', () => {
    it('should update activity with latest high-priority message', async () => {
      const { result } = renderHook(() => useActivityStream(true));

      const message1 = {
        type: 'tool_activity',
        data: { tool: 'Bash', action: 'ls', priority: 'high' }
      };

      const message2 = {
        type: 'tool_activity',
        data: { tool: 'Read', action: 'file.txt', priority: 'high' }
      };

      if (eventSourceInstance.onmessage) {
        eventSourceInstance.onmessage({ data: JSON.stringify(message1) });
      }

      await waitFor(() => {
        expect(result.current.currentActivity).toBe('Bash(ls)');
      });

      if (eventSourceInstance.onmessage) {
        eventSourceInstance.onmessage({ data: JSON.stringify(message2) });
      }

      await waitFor(() => {
        expect(result.current.currentActivity).toBe('Read(file.txt)');
      });
    });

    it('should maintain previous high-priority activity when low-priority message arrives', async () => {
      const { result } = renderHook(() => useActivityStream(true));

      const highPriorityMsg = {
        type: 'tool_activity',
        data: { tool: 'Task', action: 'validation', priority: 'high' }
      };

      const lowPriorityMsg = {
        type: 'tool_activity',
        data: { message: 'heartbeat', priority: 'low' }
      };

      if (eventSourceInstance.onmessage) {
        eventSourceInstance.onmessage({ data: JSON.stringify(highPriorityMsg) });
      }

      await waitFor(() => {
        expect(result.current.currentActivity).toBe('Task(validation)');
      });

      if (eventSourceInstance.onmessage) {
        eventSourceInstance.onmessage({ data: JSON.stringify(lowPriorityMsg) });
      }

      // Should still show high-priority activity
      expect(result.current.currentActivity).toBe('Task(validation)');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete workflow: connect -> message -> disconnect', async () => {
      const { result, rerender } = renderHook(
        ({ enabled }) => useActivityStream(enabled),
        { initialProps: { enabled: true } }
      );

      // Connect
      if (eventSourceInstance.onopen) {
        eventSourceInstance.onopen();
      }

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Receive message
      const message = {
        type: 'tool_activity',
        data: { tool: 'Agent', action: 'spawn tester', priority: 'high' }
      };

      if (eventSourceInstance.onmessage) {
        eventSourceInstance.onmessage({ data: JSON.stringify(message) });
      }

      await waitFor(() => {
        expect(result.current.currentActivity).toBe('Agent(spawn tester)');
      });

      // Disconnect
      rerender({ enabled: false });

      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.currentActivity).toBeNull();
    });
  });
});
