/**
 * Error Tests for Connection Failures
 *
 * Tests error handling and recovery including:
 * - Network failures and timeouts
 * - Malformed data handling
 * - Connection loss scenarios
 * - Recovery mechanisms
 * - Edge cases and boundary conditions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdvancedSSEConnection } from '../../../hooks/useAdvancedSSEConnection';
import { SSEConnectionManager, ConnectionState } from '../../../services/SSEConnectionManager';
import { ClaudeOutputParser } from '../../../utils/claude-output-parser';

describe('Connection Failure Error Tests', () => {
  let mockEventSource: any;
  let mockFetch: any;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    // Mock console methods to capture error/warning logs
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock EventSource
    mockEventSource = {
      onopen: null as any,
      onmessage: null as any,
      onerror: null as any,
      readyState: EventSource.CONNECTING,
      close: vi.fn(),
      url: '',

      // Test helpers
      simulateOpen() {
        this.readyState = EventSource.OPEN;
        this.onopen?.(new Event('open'));
      },

      simulateMessage(data: any) {
        const event = new MessageEvent('message', {
          data: JSON.stringify(data)
        });
        this.onmessage?.(event);
      },

      simulateError(errorType = 'generic') {
        this.readyState = EventSource.CLOSED;
        const error = new Event('error');
        (error as any).type = errorType;
        this.onerror?.(error);
      },

      simulateNetworkError() {
        this.readyState = EventSource.CLOSED;
        const error = new Event('error');
        (error as any).code = 'NETWORK_ERROR';
        this.onerror?.(error);
      },

      simulateTimeout() {
        // Don't call onopen to simulate timeout
      }
    };

    global.EventSource = vi.fn((url) => {
      mockEventSource.url = url;
      return mockEventSource;
    });

    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Default successful responses
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        instances: [{ id: 'claude-test-123', status: 'running' }]
      })
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    vi.restoreAllMocks();
  });

  describe('Initial Connection Failures', () => {
    it('should handle connection timeout gracefully', async () => {
      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001', {
          autoReconnect: false
        })
      );

      await act(async () => {
        try {
          // Don't simulate connection opening to trigger timeout
          await result.current.connectToInstance('claude-test-123');
        } catch (error) {
          expect(error.message).toContain('timeout');
        }
      });

      expect(result.current.connectionState.isConnected).toBe(false);
      expect(result.current.connectionState.lastError).toBeTruthy();
    });

    it('should handle invalid instance ID', async () => {
      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001')
      );

      await act(async () => {
        try {
          await result.current.connectToInstance('invalid-id-format');
        } catch (error) {
          expect(error.message).toContain('Invalid instance ID format');
        }
      });

      expect(result.current.connectionState.isConnected).toBe(false);
    });

    it('should handle non-existent instance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          instances: [] // No instances
        })
      });

      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001')
      );

      await act(async () => {
        try {
          await result.current.connectToInstance('claude-nonexistent');
        } catch (error) {
          expect(error.message).toContain('does not exist');
        }
      });
    });

    it('should handle stopped instance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          instances: [{ id: 'claude-test-123', status: 'stopped' }]
        })
      });

      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001')
      );

      await act(async () => {
        try {
          await result.current.connectToInstance('claude-test-123');
        } catch (error) {
          expect(error.message).toContain('not running');
        }
      });
    });

    it('should handle instance validation API failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001')
      );

      await act(async () => {
        try {
          await result.current.connectToInstance('claude-test-123');
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Instance validation error'),
        expect.any(Error)
      );
    });
  });

  describe('Runtime Connection Failures', () => {
    let hookResult: any;

    beforeEach(async () => {
      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001', {
          autoReconnect: true,
          maxRetries: 3,
          reconnectDelay: 50
        })
      );

      hookResult = result;

      await act(async () => {
        const connectPromise = result.current.connectToInstance('claude-test-123');
        mockEventSource.simulateOpen();
        await connectPromise;
      });
    });

    it('should handle sudden connection loss', async () => {
      expect(hookResult.current.connectionState.isConnected).toBe(true);

      await act(async () => {
        mockEventSource.simulateError();
      });

      expect(hookResult.current.connectionState.connectionHealth).toBe('degraded');
      expect(hookResult.current.connectionState.isRecovering).toBe(true);
    });

    it('should attempt automatic reconnection', async () => {
      await act(async () => {
        mockEventSource.simulateNetworkError();
      });

      expect(hookResult.current.connectionState.isRecovering).toBe(true);

      // Simulate successful reconnection
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        mockEventSource.simulateOpen();
      });

      expect(hookResult.current.connectionState.isConnected).toBe(true);
      expect(hookResult.current.connectionState.isRecovering).toBe(false);
    });

    it('should handle repeated connection failures', async () => {
      const maxRetries = 3;

      // Simulate multiple failures
      for (let i = 0; i < maxRetries + 1; i++) {
        await act(async () => {
          mockEventSource.simulateError();
          await new Promise(resolve => setTimeout(resolve, 100));
        });
      }

      expect(hookResult.current.connectionState.connectionHealth).toBe('failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Max reconnection attempts reached')
      );
    });

    it('should handle server-sent error events', async () => {
      await act(async () => {
        mockEventSource.simulateMessage({
          type: 'error',
          message: 'Server error occurred',
          code: 'INTERNAL_ERROR'
        });
      });

      expect(hookResult.current.connectionState.lastError).toContain('Server error');
    });

    it('should handle heartbeat timeout', async () => {
      vi.useFakeTimers();

      // Advance time to trigger heartbeat timeout
      await act(async () => {
        vi.advanceTimersByTime(70000); // 70 seconds (past heartbeat timeout)
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Heartbeat timeout')
      );

      vi.useRealTimers();
    });
  });

  describe('Malformed Data Handling', () => {
    let hookResult: any;

    beforeEach(async () => {
      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001')
      );

      hookResult = result;

      await act(async () => {
        const connectPromise = result.current.connectToInstance('claude-test-123');
        mockEventSource.simulateOpen();
        await connectPromise;
      });
    });

    it('should handle invalid JSON messages', async () => {
      await act(async () => {
        const malformedEvent = new MessageEvent('message', {
          data: 'invalid json {'
        });
        mockEventSource.onmessage?.(malformedEvent);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Message parsing error'),
        expect.any(Error)
      );

      // Connection should remain stable
      expect(hookResult.current.connectionState.isConnected).toBe(true);
    });

    it('should handle empty messages', async () => {
      await act(async () => {
        const emptyEvent = new MessageEvent('message', { data: '' });
        mockEventSource.onmessage?.(emptyEvent);
      });

      // Should not crash
      expect(hookResult.current.connectionState.isConnected).toBe(true);
    });

    it('should handle messages with missing required fields', async () => {
      await act(async () => {
        mockEventSource.simulateMessage({
          // Missing type field
          data: 'Some data',
          timestamp: Date.now()
        });
      });

      // Should handle gracefully
      expect(hookResult.current.connectionState.isConnected).toBe(true);
    });

    it('should handle messages with invalid types', async () => {
      await act(async () => {
        mockEventSource.simulateMessage({
          type: null,
          data: 'Test data'
        });
      });

      expect(hookResult.current.connectionState.isConnected).toBe(true);
    });

    it('should handle circular reference in message data', async () => {
      await act(async () => {
        // Create circular reference
        const circularData: any = { type: 'test' };
        circularData.self = circularData;

        try {
          const event = new MessageEvent('message', {
            data: JSON.stringify(circularData)
          });
          mockEventSource.onmessage?.(event);
        } catch (error) {
          // JSON.stringify will throw on circular reference
          expect(error).toBeDefined();
        }
      });

      expect(hookResult.current.connectionState.isConnected).toBe(true);
    });
  });

  describe('Claude Output Parser Error Handling', () => {
    it('should handle null input gracefully', () => {
      expect(() => {
        ClaudeOutputParser.parseClaudeOutput(null as any);
      }).not.toThrow();

      const result = ClaudeOutputParser.parseClaudeOutput(null as any);
      expect(result).toEqual([]);
    });

    it('should handle undefined input gracefully', () => {
      expect(() => {
        ClaudeOutputParser.parseClaudeOutput(undefined as any);
      }).not.toThrow();

      const result = ClaudeOutputParser.parseClaudeOutput(undefined as any);
      expect(result).toEqual([]);
    });

    it('should handle extremely long input', () => {
      const veryLongInput = 'A'.repeat(10000000); // 10MB string

      const startTime = performance.now();
      const result = ClaudeOutputParser.parseClaudeOutput(veryLongInput);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete in reasonable time
      expect(result).toBeDefined();
    });

    it('should handle malformed ANSI sequences', () => {
      const malformedInput = '\x1B[999;999;999m\x1B[\x1B[Hello\x1BWorld';

      expect(() => {
        ClaudeOutputParser.parseClaudeOutput(malformedInput);
      }).not.toThrow();

      const result = ClaudeOutputParser.parseClaudeOutput(malformedInput);
      expect(result).toBeDefined();
    });

    it('should handle binary data in text', () => {
      const binaryData = String.fromCharCode(...Array.from({ length: 256 }, (_, i) => i));

      expect(() => {
        ClaudeOutputParser.parseClaudeOutput(binaryData);
      }).not.toThrow();

      const result = ClaudeOutputParser.parseClaudeOutput(binaryData);
      expect(result).toBeDefined();
    });
  });

  describe('SSE Connection Manager Error Handling', () => {
    it('should handle connection manager instantiation errors', () => {
      expect(() => {
        new SSEConnectionManager({
          instanceId: 'claude-test-123',
          baseUrl: 'invalid-url'
        });
      }).not.toThrow();
    });

    it('should handle command sending when disconnected', async () => {
      const manager = new SSEConnectionManager({
        instanceId: 'claude-test-123',
        baseUrl: 'http://localhost:3001'
      });

      await expect(manager.sendCommand('test command')).rejects.toThrow(
        'Not connected to instance'
      );
    });

    it('should handle empty command sending', async () => {
      const manager = new SSEConnectionManager({
        instanceId: 'claude-test-123',
        baseUrl: 'http://localhost:3001'
      });

      // Mock connection
      await act(async () => {
        const connectPromise = manager.connect();
        mockEventSource.simulateOpen();
        await connectPromise;
      });

      await expect(manager.sendCommand('')).rejects.toThrow(
        'Command cannot be empty'
      );

      await expect(manager.sendCommand('   ')).rejects.toThrow(
        'Command cannot be empty'
      );
    });

    it('should handle command API failures', async () => {
      mockFetch.mockImplementation((url) => {
        if (url.includes('/terminal/input')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error'
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            instances: [{ id: 'claude-test-123', status: 'running' }]
          })
        });
      });

      const manager = new SSEConnectionManager({
        instanceId: 'claude-test-123',
        baseUrl: 'http://localhost:3001'
      });

      await act(async () => {
        const connectPromise = manager.connect();
        mockEventSource.simulateOpen();
        await connectPromise;
      });

      await expect(manager.sendCommand('test')).rejects.toThrow(
        'HTTP 500: Internal Server Error'
      );
    });

    it('should handle listener errors gracefully', async () => {
      const manager = new SSEConnectionManager({
        instanceId: 'claude-test-123',
        baseUrl: 'http://localhost:3001'
      });

      // Add faulty listener
      manager.on('test_event', () => {
        throw new Error('Listener error');
      });

      // Should not crash when emitting events
      expect(() => {
        (manager as any).emit('test_event', { data: 'test' });
      }).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Event listener error'),
        expect.any(Error)
      );
    });

    it('should handle cleanup when already cleaned up', () => {
      const manager = new SSEConnectionManager({
        instanceId: 'claude-test-123',
        baseUrl: 'http://localhost:3001'
      });

      // Multiple cleanup calls should not crash
      expect(() => {
        manager.destroy();
        manager.destroy();
        manager.destroy();
      }).not.toThrow();
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    it('should handle memory exhaustion gracefully', async () => {
      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001', {
          maxMemoryMB: 1 // Very low memory limit
        })
      );

      await act(async () => {
        const connectPromise = result.current.connectToInstance('claude-test-123');
        mockEventSource.simulateOpen();
        await connectPromise;
      });

      // Try to overwhelm memory
      await act(async () => {
        for (let i = 0; i < 1000; i++) {
          mockEventSource.simulateMessage({
            type: 'terminal_output',
            data: 'X'.repeat(10000), // Large message
            instanceId: 'claude-test-123'
          });
        }
      });

      // Should handle memory pressure gracefully
      expect(result.current.connectionState.isConnected).toBe(true);
      expect(result.current.connectionState.memoryUsage).toBeLessThan(5); // Should enforce limits
    });

    it('should handle too many concurrent connections', async () => {
      const hooks = Array.from({ length: 100 }, () =>
        renderHook(() => useAdvancedSSEConnection('http://localhost:3001'))
      );

      // Try to connect all at once
      const connections = hooks.map(async (hook, i) => {
        try {
          await act(async () => {
            const connectPromise = hook.result.current.connectToInstance(`claude-instance-${i}`);
            mockEventSource.simulateOpen();
            await connectPromise;
          });
          return true;
        } catch (error) {
          return false;
        }
      });

      const results = await Promise.all(connections);
      const successCount = results.filter(Boolean).length;

      // Some connections should succeed, system should remain stable
      expect(successCount).toBeGreaterThan(0);
    });

    it('should handle rapid connect/disconnect cycles', async () => {
      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001')
      );

      // Rapid cycling
      for (let i = 0; i < 20; i++) {
        await act(async () => {
          try {
            const connectPromise = result.current.connectToInstance('claude-test-123');
            mockEventSource.simulateOpen();
            await connectPromise;

            result.current.disconnectFromInstance('claude-test-123');
          } catch (error) {
            // Some failures expected due to rapid cycling
          }
        });
      }

      // System should remain stable
      expect(result.current).toBeDefined();
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle zero-length messages', async () => {
      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001')
      );

      await act(async () => {
        const connectPromise = result.current.connectToInstance('claude-test-123');
        mockEventSource.simulateOpen();
        await connectPromise;
      });

      await act(async () => {
        mockEventSource.simulateMessage({
          type: 'terminal_output',
          data: '',
          instanceId: 'claude-test-123'
        });
      });

      expect(result.current.connectionState.isConnected).toBe(true);
    });

    it('should handle messages with future timestamps', async () => {
      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001')
      );

      await act(async () => {
        const connectPromise = result.current.connectToInstance('claude-test-123');
        mockEventSource.simulateOpen();
        await connectPromise;
      });

      await act(async () => {
        mockEventSource.simulateMessage({
          type: 'terminal_output',
          data: 'Future message',
          timestamp: Date.now() + 1000000, // 1000 seconds in future
          instanceId: 'claude-test-123'
        });
      });

      expect(result.current.connectionState.isConnected).toBe(true);
    });

    it('should handle negative sequence numbers', async () => {
      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001')
      );

      await act(async () => {
        const connectPromise = result.current.connectToInstance('claude-test-123');
        mockEventSource.simulateOpen();
        await connectPromise;
      });

      await act(async () => {
        mockEventSource.simulateMessage({
          type: 'terminal_output',
          data: 'Negative sequence',
          sequenceNumber: -1,
          instanceId: 'claude-test-123'
        });
      });

      expect(result.current.connectionState.isConnected).toBe(true);
    });

    it('should handle extremely large sequence numbers', async () => {
      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001')
      );

      await act(async () => {
        const connectPromise = result.current.connectToInstance('claude-test-123');
        mockEventSource.simulateOpen();
        await connectPromise;
      });

      await act(async () => {
        mockEventSource.simulateMessage({
          type: 'terminal_output',
          data: 'Large sequence',
          sequenceNumber: Number.MAX_SAFE_INTEGER,
          instanceId: 'claude-test-123'
        });
      });

      expect(result.current.connectionState.isConnected).toBe(true);
    });
  });
});