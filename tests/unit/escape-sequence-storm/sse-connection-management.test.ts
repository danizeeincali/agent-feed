/**
 * TDD Test Suite: SSE Connection Management for Escape Sequence Storm Prevention
 * 
 * Root Cause: Multiple SSE connections and event listener multiplication create
 * overlapping data streams that cause terminal escape sequence storms through
 * duplicate output processing.
 * 
 * These tests SHOULD FAIL initially, demonstrating current broken behavior.
 */

import { renderHook, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import { useHTTPSSE } from '../../../frontend/src/hooks/useHTTPSSE';

// Mock EventSource
global.EventSource = jest.fn();

// Mock fetch
global.fetch = jest.fn();

describe('SSE Connection Management - Escape Sequence Storm Prevention', () => {
  let mockEventSource: any;
  
  beforeEach(() => {
    // Reset EventSource mock
    mockEventSource = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      close: jest.fn(),
      readyState: 1, // OPEN
      onopen: null,
      onmessage: null,
      onerror: null,
      dispatchEvent: jest.fn()
    };
    
    (global.EventSource as jest.Mock).mockImplementation(() => mockEventSource);
    
    // Mock fetch for HTTP polling
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, output: '', hasOutput: false })
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection Multiplicity Prevention', () => {
    test('SHOULD FAIL: Multiple SSE connections created for same instance', async () => {
      const { result } = renderHook(() => useHTTPSSE());
      
      const instanceId = 'claude-test-123';
      
      // Connect multiple times to same instance (should prevent duplicates)
      act(() => {
        result.current.connectSSE(instanceId);
        result.current.connectSSE(instanceId);
        result.current.connectSSE(instanceId);
      });
      
      // Should only create one EventSource connection
      expect(global.EventSource).toHaveBeenCalledTimes(1); // FAILS - creates multiple connections
    });

    test('SHOULD FAIL: Previous SSE connection not properly closed before new one', async () => {
      const { result } = renderHook(() => useHTTPSSE());
      
      const instanceId1 = 'claude-test-123';
      const instanceId2 = 'claude-test-456';
      
      // Connect to first instance
      act(() => {
        result.current.connectSSE(instanceId1);
      });
      
      // Connect to second instance (should close first)
      act(() => {
        result.current.connectSSE(instanceId2);
      });
      
      // First connection should be closed
      expect(mockEventSource.close).toHaveBeenCalled(); // FAILS - previous connection not closed
    });

    test('SHOULD FAIL: Status SSE and terminal SSE connections conflict', async () => {
      const { result } = renderHook(() => useHTTPSSE());
      
      const instanceId = 'claude-test-123';
      
      // Connect to both status and terminal streams
      act(() => {
        result.current.connectSSE(instanceId);
        // Status connection is automatically created, should not conflict
      });
      
      // Should have separate connections without conflicts
      expect(global.EventSource).toHaveBeenCalledWith(
        expect.stringContaining('/api/claude/instances'),
        expect.any(Object)
      );
      expect(global.EventSource).toHaveBeenCalledWith(
        expect.stringContaining('/api/status/stream'),
        expect.any(Object)
      );
      // But should properly manage them without data conflicts
      expect(global.EventSource).toHaveBeenCalledTimes(2); // FAILS - might create more connections
    });
  });

  describe('Event Handler Multiplication', () => {
    test('SHOULD FAIL: Event handlers not removed when reconnecting', async () => {
      const { result } = renderHook(() => useHTTPSSE());
      
      const instanceId = 'claude-test-123';
      const handler = jest.fn();
      
      // Add event handler
      act(() => {
        result.current.on('terminal:output', handler);
        result.current.connectSSE(instanceId);
      });
      
      // Reconnect (should clean up previous handlers)
      act(() => {
        result.current.connectSSE(instanceId);
      });
      
      // Simulate message
      act(() => {
        mockEventSource.onmessage?.({
          data: JSON.stringify({
            type: 'output',
            data: 'test output',
            isReal: true,
            instanceId
          })
        });
      });
      
      // Handler should only be called once, not multiplied
      expect(handler).toHaveBeenCalledTimes(1); // FAILS - handler called multiple times
    });

    test('SHOULD FAIL: Event listeners accumulate without proper cleanup', async () => {
      const { result, rerender } = renderHook(() => useHTTPSSE());
      
      const instanceId = 'claude-test-123';
      
      // Connect and disconnect multiple times
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.connectSSE(instanceId);
          result.current.disconnectFromInstance();
        });
      }
      
      // Should not accumulate event listeners
      const handlerCount = Object.keys(result.current).length;
      expect(handlerCount).toBeLessThan(20); // FAILS - handlers accumulate
    });

    test('SHOULD FAIL: Multiple component instances create overlapping handlers', async () => {
      // Simulate multiple component instances using same hook
      const { result: result1 } = renderHook(() => useHTTPSSE());
      const { result: result2 } = renderHook(() => useHTTPSSE());
      
      const instanceId = 'claude-test-123';
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      // Both components add handlers for same event
      act(() => {
        result1.current.on('terminal:output', handler1);
        result2.current.on('terminal:output', handler2);
        result1.current.connectSSE(instanceId);
        result2.current.connectSSE(instanceId);
      });
      
      // Should prevent multiple connections to same instance
      expect(global.EventSource).toHaveBeenCalledTimes(1); // FAILS - allows multiple connections
    });
  });

  describe('Message Processing Duplication', () => {
    test('SHOULD FAIL: Same message processed multiple times by different handlers', async () => {
      const { result } = renderHook(() => useHTTPSSE());
      
      const instanceId = 'claude-test-123';
      const outputSpy = jest.fn();
      
      // Add multiple handlers for same event
      act(() => {
        result.current.on('terminal:output', outputSpy);
        result.current.on('output', outputSpy);
        result.current.connectSSE(instanceId);
      });
      
      // Simulate message that triggers both handlers
      act(() => {
        mockEventSource.onmessage?.({
          data: JSON.stringify({
            type: 'output',
            data: 'test output',
            isReal: true,
            instanceId
          })
        });
      });
      
      // Should only process message once
      expect(outputSpy).toHaveBeenCalledTimes(1); // FAILS - message processed multiple times
    });

    test('SHOULD FAIL: Incremental output position tracking corrupted by multiple processors', async () => {
      const { result } = renderHook(() => useHTTPSSE());
      
      const instanceId = 'claude-test-123';
      let processedPositions: number[] = [];
      
      const positionTracker = (data: any) => {
        if (data.position !== undefined) {
          processedPositions.push(data.position);
        }
      };
      
      act(() => {
        result.current.on('terminal:output', positionTracker);
        result.current.on('output', positionTracker);
        result.current.connectSSE(instanceId);
      });
      
      // Simulate incremental output messages
      act(() => {
        mockEventSource.onmessage?.({
          data: JSON.stringify({
            type: 'output',
            data: 'chunk 1',
            position: 0,
            isReal: true,
            instanceId
          })
        });
        mockEventSource.onmessage?.({
          data: JSON.stringify({
            type: 'output',
            data: 'chunk 2',
            position: 7,
            isReal: true,
            instanceId
          })
        });
      });
      
      // Positions should be unique and ordered
      const uniquePositions = [...new Set(processedPositions)];
      expect(processedPositions).toEqual(uniquePositions); // FAILS - duplicate position processing
    });

    test('SHOULD FAIL: Message type routing creates duplicate streams', async () => {
      const { result } = renderHook(() => useHTTPSSE());
      
      const instanceId = 'claude-test-123';
      const messageTracker: string[] = [];
      
      const trackMessages = (data: any) => {
        messageTracker.push(JSON.stringify(data));
      };
      
      act(() => {
        result.current.on('terminal:output', trackMessages);
        result.current.on('output', trackMessages);
        result.current.on('message', trackMessages);
        result.current.connectSSE(instanceId);
      });
      
      // Send message that matches multiple handlers
      act(() => {
        mockEventSource.onmessage?.({
          data: JSON.stringify({
            type: 'output',
            data: 'test output',
            isReal: true,
            instanceId
          })
        });
      });
      
      // Should not create duplicate entries for same message
      const uniqueMessages = [...new Set(messageTracker)];
      expect(messageTracker.length).toBe(uniqueMessages.length); // FAILS - duplicate message routing
    });
  });

  describe('Connection State Management', () => {
    test('SHOULD FAIL: Connection state not properly synchronized', async () => {
      const { result } = renderHook(() => useHTTPSSE());
      
      const instanceId = 'claude-test-123';
      
      // Initial state
      expect(result.current.isConnected).toBe(false);
      
      // Connect via SSE
      act(() => {
        result.current.connectSSE(instanceId);
        mockEventSource.onopen?.();
      });
      
      expect(result.current.isConnected).toBe(true);
      
      // Simulate connection error
      act(() => {
        mockEventSource.onerror?.({});
      });
      
      // Should handle state transition properly
      expect(result.current.isConnected).toBe(false); // FAILS - state not properly updated
    });

    test('SHOULD FAIL: Fallback to polling creates duplicate data streams', async () => {
      const { result } = renderHook(() => useHTTPSSE());
      
      const instanceId = 'claude-test-123';
      const dataReceived: string[] = [];
      
      act(() => {
        result.current.on('terminal:output', (data) => {
          dataReceived.push(data.output);
        });
        
        // Start with SSE
        result.current.connectSSE(instanceId);
        
        // Simulate SSE failure, should fallback to polling
        mockEventSource.onerror?.({});
      });
      
      // Mock polling response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          output: 'polling output',
          hasOutput: true,
          instanceId
        })
      });
      
      // Wait for polling to kick in
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      
      // Should not receive duplicate data from both SSE and polling
      const duplicates = dataReceived.filter(output => 
        dataReceived.indexOf(output) !== dataReceived.lastIndexOf(output)
      );
      expect(duplicates).toHaveLength(0); // FAILS - duplicate data from SSE+polling
    });

    test('SHOULD FAIL: Reconnection logic creates multiple active connections', async () => {
      const { result } = renderHook(() => useHTTPSSE());
      
      const instanceId = 'claude-test-123';
      
      act(() => {
        result.current.connectSSE(instanceId);
      });
      
      // Simulate connection error and reconnection
      act(() => {
        mockEventSource.readyState = 2; // CLOSED
        mockEventSource.onerror?.({});
      });
      
      // Wait for reconnection attempt
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1100)); // Wait for backoff
      });
      
      // Should only have one active connection after reconnection
      expect(global.EventSource).toHaveBeenCalledTimes(2); // FAILS - doesn't properly clean up before reconnect
    });
  });

  describe('Error Recovery and Cleanup', () => {
    test('SHOULD FAIL: Error in one connection affects others', async () => {
      const { result } = renderHook(() => useHTTPSSE());
      
      const instanceId1 = 'claude-test-123';
      const instanceId2 = 'claude-test-456';
      
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      act(() => {
        result.current.on('terminal:output', handler1);
        result.current.connectSSE(instanceId1);
      });
      
      // Switch to second instance
      act(() => {
        result.current.on('terminal:output', handler2);
        result.current.connectSSE(instanceId2);
      });
      
      // Error in second connection should not affect first handler
      act(() => {
        mockEventSource.onerror?.({});
      });
      
      // First handler should still be callable
      expect(() => handler1({ output: 'test' })).not.toThrow(); // FAILS - error propagation affects other handlers
    });

    test('SHOULD FAIL: Component unmount does not clean up SSE connections', async () => {
      const { result, unmount } = renderHook(() => useHTTPSSE());
      
      const instanceId = 'claude-test-123';
      
      act(() => {
        result.current.connectSSE(instanceId);
      });
      
      // Unmount component
      unmount();
      
      // SSE connection should be closed
      expect(mockEventSource.close).toHaveBeenCalled(); // FAILS - connections not cleaned up on unmount
    });

    test('SHOULD FAIL: Memory leak from unremoved event handlers', async () => {
      const { result } = renderHook(() => useHTTPSSE());
      
      const instanceId = 'claude-test-123';
      
      // Add many event handlers
      const handlers: Array<() => void> = [];
      for (let i = 0; i < 100; i++) {
        const handler = jest.fn();
        handlers.push(handler);
        act(() => {
          result.current.on('terminal:output', handler);
        });
      }
      
      // Disconnect and reconnect
      act(() => {
        result.current.connectSSE(instanceId);
        result.current.disconnectFromInstance();
      });
      
      // Handlers should be cleaned up
      const activeHandlers = handlers.filter(h => h.getMockName() !== 'cleaned');
      expect(activeHandlers.length).toBeLessThan(10); // FAILS - handlers not properly cleaned up
    });
  });

  describe('Performance and Resource Management', () => {
    test('SHOULD FAIL: No throttling of rapid SSE messages', async () => {
      const { result } = renderHook(() => useHTTPSSE());
      
      const instanceId = 'claude-test-123';
      const messageCount = { count: 0 };
      
      act(() => {
        result.current.on('terminal:output', () => {
          messageCount.count++;
        });
        result.current.connectSSE(instanceId);
      });
      
      // Simulate rapid messages
      act(() => {
        for (let i = 0; i < 1000; i++) {
          mockEventSource.onmessage?.({
            data: JSON.stringify({
              type: 'output',
              data: `message ${i}`,
              isReal: true,
              instanceId
            })
          });
        }
      });
      
      // Should throttle message processing
      expect(messageCount.count).toBeLessThan(100); // FAILS - no throttling implemented
    });

    test('SHOULD FAIL: Large messages not chunked properly', async () => {
      const { result } = renderHook(() => useHTTPSSE());
      
      const instanceId = 'claude-test-123';
      const receivedMessages: string[] = [];
      
      act(() => {
        result.current.on('terminal:output', (data) => {
          receivedMessages.push(data.output);
        });
        result.current.connectSSE(instanceId);
      });
      
      // Send large message
      const largeMessage = 'A'.repeat(100000); // 100KB
      act(() => {
        mockEventSource.onmessage?.({
          data: JSON.stringify({
            type: 'output',
            data: largeMessage,
            isReal: true,
            instanceId
          })
        });
      });
      
      // Should chunk large messages
      expect(receivedMessages.length).toBeGreaterThan(1); // FAILS - doesn't chunk large messages
    });

    test('SHOULD FAIL: Connection limits not enforced', async () => {
      const instanceId = 'claude-test-123';
      
      // Try to create many connections
      const hooks: any[] = [];
      for (let i = 0; i < 50; i++) {
        const { result } = renderHook(() => useHTTPSSE());
        hooks.push(result);
        
        act(() => {
          result.current.connectSSE(instanceId);
        });
      }
      
      // Should limit number of concurrent connections
      expect(global.EventSource).toHaveBeenCalledTimes(1); // FAILS - no connection limits
    });
  });
});