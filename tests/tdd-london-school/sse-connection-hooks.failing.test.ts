/**
 * TDD LONDON SCHOOL: SSE Connection Hooks Failing Tests
 * 
 * PURPOSE: These tests are designed to FAIL and expose SSE connection hook errors
 * They should reveal:
 * - Hook initialization failures  
 * - SSE connection issues
 * - Singleton behavior problems
 * - Memory leaks
 * - Error recovery failures
 */

import { renderHook, act } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import { useAdvancedSSEConnection } from '../../frontend/src/hooks/useAdvancedSSEConnection';
import { useSSEConnectionSingleton } from '../../frontend/src/hooks/useSSEConnectionSingleton';

// Mock EventSource
const mockEventSource = vi.fn(() => ({
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: EventSource.OPEN,
}));
global.EventSource = mockEventSource as any;

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the services that hooks depend on
vi.mock('../../frontend/src/services/IncrementalMessageProcessor', () => ({
  default: vi.fn(() => ({
    processMessage: vi.fn(() => []),
    getUnprocessedMessages: vi.fn(() => []),
    clearInstance: vi.fn(),
    performMaintenance: vi.fn(),
    getMemoryUsage: vi.fn(() => 0),
  }))
}));

vi.mock('../../frontend/src/services/UIStateManager', () => ({
  default: vi.fn(() => ({
    updateOutput: vi.fn(),
    getState: vi.fn(() => null),
    getScrollState: vi.fn(() => null),
    setAutoScroll: vi.fn(),
    scrollToBottom: vi.fn(),
    clearInstance: vi.fn(),
    performMaintenance: vi.fn(),
    getMetrics: vi.fn(() => ({ totalMemoryUsage: 0 })),
    shutdown: vi.fn(),
  }))
}));

vi.mock('../../frontend/src/services/ErrorRecoveryManager', () => ({
  default: vi.fn(() => ({
    handleConnectionFailure: vi.fn(),
    handleSequenceGap: vi.fn(),
    getRecoveryState: vi.fn(() => null),
    forceRecovery: vi.fn(),
    clearInstance: vi.fn(),
    performHealthCheck: vi.fn(),
    shutdown: vi.fn(),
    onRecoveryStateChange: vi.fn(),
    addReconnectionHandler: vi.fn(),
  }))
}));

describe('SSE Connection Hooks - FAILING TESTS (TDD London School)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockRejectedValue(new Error('Network error'));
    console.error = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useAdvancedSSEConnection Failures', () => {
    test('SHOULD FAIL: Hook initializes with correct default state', () => {
      const { result } = renderHook(() => 
        useAdvancedSSEConnection('http://localhost:3002')
      );

      // Should initialize with proper state - will fail if initialization is broken
      expect(result.current.connectionState).toEqual({
        isConnected: false,
        isConnecting: false,
        isRecovering: false,
        instanceId: null,
        lastError: null,
        connectionHealth: 'failed',
        sequenceNumber: 0,
        messagesPerSecond: 0,
        memoryUsage: 0,
      });

      expect(result.current.metrics).toEqual({
        totalMessages: 0,
        messagesPerSecond: 0,
        averageLatency: 0,
        connectionUptime: 0,
        recoveryCount: 0,
        lastRecoveryTime: 0,
      });
    });

    test('SHOULD FAIL: connectToInstance establishes SSE connection', async () => {
      const { result } = renderHook(() => 
        useAdvancedSSEConnection('http://localhost:3002')
      );

      await act(async () => {
        await result.current.connectToInstance('claude-test-123');
      });

      // Should create EventSource - will fail if connection setup is broken
      expect(mockEventSource).toHaveBeenCalledWith(
        'http://localhost:3002/api/v1/claude/instances/claude-test-123/terminal/stream'
      );

      // Should update connection state - will fail if state management is broken
      expect(result.current.connectionState.isConnected).toBe(true);
      expect(result.current.connectionState.instanceId).toBe('claude-test-123');
    });

    test('SHOULD FAIL: disconnectFromInstance cleans up properly', async () => {
      const mockESInstance = {
        close: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        readyState: EventSource.OPEN,
      };
      mockEventSource.mockReturnValue(mockESInstance);

      const { result } = renderHook(() => 
        useAdvancedSSEConnection('http://localhost:3002')
      );

      await act(async () => {
        await result.current.connectToInstance('claude-test-123');
      });

      act(() => {
        result.current.disconnectFromInstance('claude-test-123');
      });

      // Should close EventSource - will fail if cleanup is broken
      expect(mockESInstance.close).toHaveBeenCalled();

      // Should reset state - will fail if state cleanup is broken
      expect(result.current.connectionState.isConnected).toBe(false);
      expect(result.current.connectionState.instanceId).toBe(null);
    });

    test('SHOULD FAIL: handles SSE messages correctly', async () => {
      const mockESInstance = {
        close: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        readyState: EventSource.OPEN,
      };
      mockEventSource.mockReturnValue(mockESInstance);

      const { result } = renderHook(() => 
        useAdvancedSSEConnection('http://localhost:3002')
      );

      await act(async () => {
        await result.current.connectToInstance('claude-test-123');
      });

      // Get message handler
      const messageHandler = mockESInstance.addEventListener.mock.calls
        .find(([event]) => event === 'message')?.[1];

      expect(messageHandler).toBeDefined();

      // Simulate message - should fail if message handling is broken
      act(() => {
        messageHandler({
          data: JSON.stringify({
            type: 'terminal_output',
            instanceId: 'claude-test-123',
            output: 'Hello from terminal',
            sequenceNumber: 1,
            timestamp: Date.now()
          })
        });
      });

      // Should process message - will fail if message processing is broken
      expect(result.current.connectionState.sequenceNumber).toBe(1);
    });

    test('SHOULD FAIL: error recovery works correctly', async () => {
      const mockESInstance = {
        close: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        readyState: EventSource.CLOSED,
      };
      mockEventSource.mockReturnValue(mockESInstance);

      const { result } = renderHook(() => 
        useAdvancedSSEConnection('http://localhost:3002', { autoReconnect: true })
      );

      await act(async () => {
        await result.current.connectToInstance('claude-test-123');
      });

      // Simulate error
      const errorHandler = mockESInstance.addEventListener.mock.calls
        .find(([event]) => event === 'error')?.[1];

      expect(errorHandler).toBeDefined();

      act(() => {
        errorHandler(new Error('Connection lost'));
      });

      // Should trigger recovery - will fail if error recovery is broken
      expect(result.current.connectionState.connectionHealth).toBe('degraded');
    });

    test('SHOULD FAIL: memory management works properly', async () => {
      const { result } = renderHook(() => 
        useAdvancedSSEConnection('http://localhost:3002', { maxMemoryMB: 10 })
      );

      // Should track memory usage - will fail if memory tracking is broken
      expect(result.current.connectionState.memoryUsage).toBeGreaterThanOrEqual(0);

      // Memory should be cleaned up - will fail if cleanup is broken
      act(() => {
        result.current.cleanup();
      });

      expect(result.current.connectionState.memoryUsage).toBe(0);
    });

    test('SHOULD FAIL: performance metrics are updated', async () => {
      const { result, rerender } = renderHook(() => 
        useAdvancedSSEConnection('http://localhost:3002')
      );

      // Should have initial metrics - will fail if metrics initialization is broken
      expect(result.current.metrics.totalMessages).toBe(0);
      expect(result.current.metrics.messagesPerSecond).toBe(0);

      // Simulate time passing and messages
      await act(async () => {
        // Force metrics update
        rerender();
      });

      // Metrics should be updated - will fail if metrics calculation is broken
      expect(result.current.getMetrics()).toEqual(expect.objectContaining({
        totalMessages: expect.any(Number),
        messagesPerSecond: expect.any(Number),
        averageLatency: expect.any(Number),
        connectionUptime: expect.any(Number)
      }));
    });
  });

  describe('useSSEConnectionSingleton Failures', () => {
    test('SHOULD FAIL: singleton prevents duplicate connections', async () => {
      const { result: result1 } = renderHook(() => 
        useSSEConnectionSingleton('http://localhost:3002')
      );

      const { result: result2 } = renderHook(() => 
        useSSEConnectionSingleton('http://localhost:3002')
      );

      await act(async () => {
        await result1.current.connectToInstance('claude-test-123');
        await result2.current.connectToInstance('claude-test-123');
      });

      // Should only create one EventSource - will fail if singleton is broken
      expect(mockEventSource).toHaveBeenCalledTimes(1);
    });

    test('SHOULD FAIL: connection state is shared across instances', async () => {
      const { result: result1 } = renderHook(() => 
        useSSEConnectionSingleton('http://localhost:3002')
      );

      const { result: result2 } = renderHook(() => 
        useSSEConnectionSingleton('http://localhost:3002')
      );

      await act(async () => {
        await result1.current.connectToInstance('claude-test-123');
      });

      // Both should see connected state - will fail if state sharing is broken
      expect(result1.current.isConnected).toBe(true);
      expect(result2.current.isConnected).toBe(true);
    });

    test('SHOULD FAIL: sendCommand uses correct API endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      const { result } = renderHook(() => 
        useSSEConnectionSingleton('http://localhost:3002')
      );

      await act(async () => {
        await result.current.connectToInstance('claude-test-123');
        await result.current.sendCommand('claude-test-123', 'hello');
      });

      // Should make API call - will fail if API integration is broken
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/claude/instances/claude-test-123/terminal/input'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ input: 'hello\n' })
        })
      );
    });

    test('SHOULD FAIL: connection health monitoring works', async () => {
      const { result } = renderHook(() => 
        useSSEConnectionSingleton('http://localhost:3002')
      );

      // Should provide health status - will fail if health monitoring is broken
      const health = result.current.getConnectionHealth();

      expect(health).toEqual(expect.objectContaining({
        isConnected: expect.any(Boolean),
        connectionType: expect.any(String),
        uptime: expect.any(Number),
        activeConnections: expect.any(Number),
        totalHandlers: expect.any(Number)
      }));
    });

    test('SHOULD FAIL: testConnection validates endpoints', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy' })
      });

      const { result } = renderHook(() => 
        useSSEConnectionSingleton('http://localhost:3002')
      );

      let testResult;
      await act(async () => {
        testResult = await result.current.testConnection('claude-test-123');
      });

      // Should test connection - will fail if connection testing is broken
      expect(testResult).toEqual({
        success: true,
        status: { status: 'healthy' }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/v1/claude/instances/claude-test-123/sse/status'
      );
    });

    test('SHOULD FAIL: retry logic works on connection failure', async () => {
      mockEventSource.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const { result } = renderHook(() => 
        useSSEConnectionSingleton('http://localhost:3002', {
          enableRetry: true,
          maxRetryAttempts: 3,
          retryDelay: 100
        })
      );

      await act(async () => {
        await result.current.connectToInstance('claude-test-123');
      });

      // Should attempt multiple connections - will fail if retry logic is broken
      expect(mockEventSource).toHaveBeenCalledTimes(3);
      expect(result.current.connectionState.lastError).toContain('3 attempts');
    });

    test('SHOULD FAIL: fallback to polling works', async () => {
      mockEventSource.mockImplementation(() => {
        throw new Error('SSE not supported');
      });

      const { result } = renderHook(() => 
        useSSEConnectionSingleton('http://localhost:3002', {
          enableFallback: true
        })
      );

      await act(async () => {
        await result.current.connectToInstance('claude-test-123');
      });

      // Should fallback to polling - will fail if fallback is broken
      expect(result.current.connectionState.connectionType).toBe('polling');
      expect(result.current.connectionState.lastError).toContain('polling fallback');
    });

    test('SHOULD FAIL: cleanup removes all handlers', async () => {
      const { result, unmount } = renderHook(() => 
        useSSEConnectionSingleton('http://localhost:3002')
      );

      const handler = vi.fn();

      act(() => {
        result.current.addHandler('test-event', handler);
      });

      const stats = result.current.getAllConnections();
      expect(stats.totalHandlers).toBeGreaterThan(0);

      // Unmount should clean up handlers - will fail if cleanup is broken
      unmount();

      const finalStats = result.current.getAllConnections();
      expect(finalStats.totalHandlers).toBe(0);
    });
  });

  describe('Hook Integration Failures', () => {
    test('SHOULD FAIL: hooks work together without conflicts', async () => {
      const { result: advancedResult } = renderHook(() => 
        useAdvancedSSEConnection('http://localhost:3002')
      );

      const { result: singletonResult } = renderHook(() => 
        useSSEConnectionSingleton('http://localhost:3002')
      );

      await act(async () => {
        await advancedResult.current.connectToInstance('claude-test-123');
        await singletonResult.current.connectToInstance('claude-test-456');
      });

      // Should not interfere with each other - will fail if there are conflicts
      expect(advancedResult.current.connectionState.instanceId).toBe('claude-test-123');
      expect(singletonResult.current.connectionState.instanceId).toBe('claude-test-456');
    });

    test('SHOULD FAIL: error recovery works across hook types', async () => {
      const mockESInstance = {
        close: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        readyState: EventSource.CLOSED,
      };
      mockEventSource.mockReturnValue(mockESInstance);

      const { result } = renderHook(() => 
        useAdvancedSSEConnection('http://localhost:3002', { autoReconnect: true })
      );

      await act(async () => {
        await result.current.connectToInstance('claude-test-123');
      });

      // Force recovery should work - will fail if recovery is broken
      await act(async () => {
        await result.current.forceRecovery('claude-test-123');
      });

      const recoveryState = result.current.getRecoveryState('claude-test-123');
      expect(recoveryState).toBeDefined();
    });
  });
});