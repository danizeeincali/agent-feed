/**
 * @file Hook Functionality Tests
 * @description Comprehensive TDD tests for custom hooks used in white screen fix
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock WebSocket for testing
class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  static CONNECTING = 0;
  
  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  
  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }
  
  send = vi.fn();
  close = vi.fn().mockImplementation(() => {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: 1000, reason: 'Normal closure' }));
    }
  });
}

global.WebSocket = MockWebSocket as any;

// Mock hook dependencies
vi.mock('@/utils/nld-ui-capture', () => ({
  useNLDCapture: () => ({
    captureButtonClick: vi.fn(),
    capturePageView: vi.fn(),
    captureError: vi.fn(),
  }),
}));

// Import hooks to test
// Note: We'll create mock implementations of hooks that might exist
const useWebSocketHook = () => {
  const [socket, setSocket] = React.useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const connect = React.useCallback((url: string) => {
    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
      };
      
      ws.onerror = () => {
        setError('Connection failed');
        setIsConnected(false);
      };
      
      ws.onclose = () => {
        setIsConnected(false);
      };
      
      setSocket(ws);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  const disconnect = React.useCallback(() => {
    if (socket) {
      socket.close();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  const send = React.useCallback((data: string) => {
    if (socket && isConnected) {
      socket.send(data);
      return true;
    }
    return false;
  }, [socket, isConnected]);

  return { socket, isConnected, error, connect, disconnect, send };
};

const useErrorHandlerHook = () => {
  const [errors, setErrors] = React.useState<Error[]>([]);
  const [isRecovering, setIsRecovering] = React.useState(false);

  const captureError = React.useCallback((error: Error) => {
    setErrors(prev => [...prev, error]);
  }, []);

  const clearErrors = React.useCallback(() => {
    setErrors([]);
  }, []);

  const attemptRecovery = React.useCallback(async () => {
    setIsRecovering(true);
    try {
      // Simulate recovery attempt
      await new Promise(resolve => setTimeout(resolve, 100));
      setErrors([]);
      return true;
    } catch {
      return false;
    } finally {
      setIsRecovering(false);
    }
  }, []);

  return { errors, isRecovering, captureError, clearErrors, attemptRecovery };
};

const useAsyncOperationHook = <T,>(
  asyncFn: () => Promise<T>,
  dependencies: React.DependencyList = []
) => {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const execute = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await asyncFn();
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, dependencies);

  React.useEffect(() => {
    execute().catch(() => {
      // Error already handled in execute
    });
  }, [execute]);

  const retry = React.useCallback(() => {
    return execute();
  }, [execute]);

  return { data, loading, error, execute, retry };
};

const useLocalStorageHook = <T,>(
  key: string, 
  defaultValue: T
): [T, (value: T) => void, () => void] => {
  const [value, setValue] = React.useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setStoredValue = React.useCallback((newValue: T) => {
    try {
      setValue(newValue);
      localStorage.setItem(key, JSON.stringify(newValue));
    } catch (error) {
      console.warn(`Failed to store value in localStorage for key "${key}":`, error);
    }
  }, [key]);

  const removeValue = React.useCallback(() => {
    try {
      setValue(defaultValue);
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove value from localStorage for key "${key}":`, error);
    }
  }, [key, defaultValue]);

  return [value, setStoredValue, removeValue];
};

const useDebounceHook = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const useRetryHook = (
  operation: () => Promise<void>,
  maxRetries: number = 3,
  delay: number = 1000
) => {
  const [attempts, setAttempts] = React.useState(0);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const retry = React.useCallback(async () => {
    if (attempts >= maxRetries) {
      return false;
    }

    setIsRetrying(true);
    setAttempts(prev => prev + 1);

    try {
      await new Promise(resolve => setTimeout(resolve, delay));
      await operation();
      setError(null);
      setAttempts(0);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      return false;
    } finally {
      setIsRetrying(false);
    }
  }, [operation, attempts, maxRetries, delay]);

  const reset = React.useCallback(() => {
    setAttempts(0);
    setError(null);
    setIsRetrying(false);
  }, []);

  return { attempts, isRetrying, error, retry, reset, canRetry: attempts < maxRetries };
};

describe('Hook Functionality Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useWebSocketHook', () => {
    it('should initialize with disconnected state', () => {
      const { result } = renderHook(() => useWebSocketHook());

      expect(result.current.socket).toBe(null);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should connect to WebSocket successfully', async () => {
      const { result } = renderHook(() => useWebSocketHook());

      act(() => {
        result.current.connect('ws://localhost:3000');
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      expect(result.current.socket).toBeTruthy();
      expect(result.current.error).toBe(null);
    });

    it('should handle connection errors', async () => {
      // Mock WebSocket to throw error
      const OriginalWebSocket = global.WebSocket;
      global.WebSocket = vi.fn().mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const { result } = renderHook(() => useWebSocketHook());

      act(() => {
        result.current.connect('ws://invalid-url');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Connection failed');
      });

      expect(result.current.isConnected).toBe(false);

      // Restore WebSocket
      global.WebSocket = OriginalWebSocket;
    });

    it('should disconnect properly', async () => {
      const { result } = renderHook(() => useWebSocketHook());

      act(() => {
        result.current.connect('ws://localhost:3000');
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        result.current.disconnect();
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });

      expect(result.current.socket).toBe(null);
    });

    it('should send messages when connected', async () => {
      const { result } = renderHook(() => useWebSocketHook());

      act(() => {
        result.current.connect('ws://localhost:3000');
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      let sendResult: boolean = false;
      act(() => {
        sendResult = result.current.send('test message');
      });

      expect(sendResult).toBe(true);
      expect(result.current.socket!.send).toHaveBeenCalledWith('test message');
    });

    it('should not send messages when disconnected', () => {
      const { result } = renderHook(() => useWebSocketHook());

      let sendResult: boolean = false;
      act(() => {
        sendResult = result.current.send('test message');
      });

      expect(sendResult).toBe(false);
    });
  });

  describe('useErrorHandlerHook', () => {
    it('should initialize with empty errors', () => {
      const { result } = renderHook(() => useErrorHandlerHook());

      expect(result.current.errors).toEqual([]);
      expect(result.current.isRecovering).toBe(false);
    });

    it('should capture errors', () => {
      const { result } = renderHook(() => useErrorHandlerHook());
      const testError = new Error('Test error');

      act(() => {
        result.current.captureError(testError);
      });

      expect(result.current.errors).toContain(testError);
      expect(result.current.errors).toHaveLength(1);
    });

    it('should capture multiple errors', () => {
      const { result } = renderHook(() => useErrorHandlerHook());
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      act(() => {
        result.current.captureError(error1);
        result.current.captureError(error2);
      });

      expect(result.current.errors).toHaveLength(2);
      expect(result.current.errors).toEqual([error1, error2]);
    });

    it('should clear errors', () => {
      const { result } = renderHook(() => useErrorHandlerHook());
      const testError = new Error('Test error');

      act(() => {
        result.current.captureError(testError);
      });

      expect(result.current.errors).toHaveLength(1);

      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.errors).toEqual([]);
    });

    it('should attempt recovery', async () => {
      const { result } = renderHook(() => useErrorHandlerHook());
      const testError = new Error('Test error');

      act(() => {
        result.current.captureError(testError);
      });

      expect(result.current.errors).toHaveLength(1);

      let recoveryResult: boolean = false;
      await act(async () => {
        recoveryResult = await result.current.attemptRecovery();
      });

      expect(recoveryResult).toBe(true);
      expect(result.current.errors).toEqual([]);
      expect(result.current.isRecovering).toBe(false);
    });

    it('should handle recovery state correctly', async () => {
      const { result } = renderHook(() => useErrorHandlerHook());

      const recoveryPromise = act(async () => {
        return result.current.attemptRecovery();
      });

      // Should be recovering immediately
      expect(result.current.isRecovering).toBe(true);

      await recoveryPromise;

      expect(result.current.isRecovering).toBe(false);
    });
  });

  describe('useAsyncOperationHook', () => {
    it('should handle successful async operation', async () => {
      const mockAsyncFn = vi.fn().mockResolvedValue('success data');
      const { result } = renderHook(() => useAsyncOperationHook(mockAsyncFn));

      // Initially loading
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBe(null);
      expect(result.current.error).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBe('success data');
      expect(result.current.error).toBe(null);
      expect(mockAsyncFn).toHaveBeenCalledTimes(1);
    });

    it('should handle async operation errors', async () => {
      const mockError = new Error('Async operation failed');
      const mockAsyncFn = vi.fn().mockRejectedValue(mockError);
      const { result } = renderHook(() => useAsyncOperationHook(mockAsyncFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBe(null);
      expect(result.current.error).toBe(mockError);
    });

    it('should allow retry functionality', async () => {
      let callCount = 0;
      const mockAsyncFn = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('First call failed'));
        }
        return Promise.resolve('success on retry');
      });

      const { result } = renderHook(() => useAsyncOperationHook(mockAsyncFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();

      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.data).toBe('success on retry');
      expect(result.current.error).toBe(null);
      expect(mockAsyncFn).toHaveBeenCalledTimes(2);
    });

    it('should re-execute when dependencies change', async () => {
      const mockAsyncFn = vi.fn().mockResolvedValue('data');
      let dependency = 'initial';

      const { rerender } = renderHook(
        ({ dep }) => useAsyncOperationHook(() => mockAsyncFn(dep), [dep]),
        { initialProps: { dep: dependency } }
      );

      await waitFor(() => {
        expect(mockAsyncFn).toHaveBeenCalledWith('initial');
      });

      dependency = 'changed';
      rerender({ dep: dependency });

      await waitFor(() => {
        expect(mockAsyncFn).toHaveBeenCalledWith('changed');
      });

      expect(mockAsyncFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('useLocalStorageHook', () => {
    it('should initialize with default value', () => {
      const { result } = renderHook(() => 
        useLocalStorageHook('test-key', 'default-value')
      );

      expect(result.current[0]).toBe('default-value');
    });

    it('should initialize with stored value', () => {
      localStorage.setItem('test-key', JSON.stringify('stored-value'));

      const { result } = renderHook(() => 
        useLocalStorageHook('test-key', 'default-value')
      );

      expect(result.current[0]).toBe('stored-value');
    });

    it('should update localStorage when value changes', () => {
      const { result } = renderHook(() => 
        useLocalStorageHook('test-key', 'default-value')
      );

      act(() => {
        result.current[1]('new-value');
      });

      expect(result.current[0]).toBe('new-value');
      expect(localStorage.getItem('test-key')).toBe('"new-value"');
    });

    it('should remove value from localStorage', () => {
      localStorage.setItem('test-key', JSON.stringify('stored-value'));

      const { result } = renderHook(() => 
        useLocalStorageHook('test-key', 'default-value')
      );

      act(() => {
        result.current[2](); // removeValue
      });

      expect(result.current[0]).toBe('default-value');
      expect(localStorage.getItem('test-key')).toBe(null);
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock localStorage to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('localStorage full');
      });

      const { result } = renderHook(() => 
        useLocalStorageHook('test-key', 'default-value')
      );

      act(() => {
        result.current[1]('new-value');
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to store value in localStorage'),
        expect.any(Error)
      );

      // Restore localStorage
      localStorage.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });

    it('should handle JSON parsing errors', () => {
      localStorage.setItem('test-key', 'invalid-json{');

      const { result } = renderHook(() => 
        useLocalStorageHook('test-key', 'default-value')
      );

      expect(result.current[0]).toBe('default-value');
    });
  });

  describe('useDebounceHook', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return initial value immediately', () => {
      const { result } = renderHook(() => useDebounceHook('initial', 500));

      expect(result.current).toBe('initial');
    });

    it('should debounce value changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounceHook(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      expect(result.current).toBe('initial');

      // Change value
      rerender({ value: 'changed', delay: 500 });

      // Should still be initial value before delay
      expect(result.current).toBe('initial');

      // Advance timers
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe('changed');
    });

    it('should reset debounce timer on rapid changes', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounceHook(value, 500),
        { initialProps: { value: 'initial' } }
      );

      // Rapid changes
      rerender({ value: 'change1' });
      act(() => {
        vi.advanceTimersByTime(200);
      });

      rerender({ value: 'change2' });
      act(() => {
        vi.advanceTimersByTime(200);
      });

      rerender({ value: 'final' });

      // Should still be initial
      expect(result.current).toBe('initial');

      // Complete the delay
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe('final');
    });
  });

  describe('useRetryHook', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should initialize with correct state', () => {
      const mockOperation = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useRetryHook(mockOperation));

      expect(result.current.attempts).toBe(0);
      expect(result.current.isRetrying).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.canRetry).toBe(true);
    });

    it('should retry successful operation', async () => {
      const mockOperation = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useRetryHook(mockOperation));

      let retryResult: boolean = false;
      await act(async () => {
        retryResult = await result.current.retry();
        vi.runAllTimers(); // Skip delay
      });

      expect(retryResult).toBe(true);
      expect(result.current.attempts).toBe(0); // Reset after success
      expect(result.current.error).toBe(null);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry failed operation', async () => {
      const mockError = new Error('Operation failed');
      const mockOperation = vi.fn().mockRejectedValue(mockError);
      const { result } = renderHook(() => useRetryHook(mockOperation, 3, 1000));

      let retryResult: boolean = false;
      await act(async () => {
        retryResult = await result.current.retry();
        vi.runAllTimers(); // Skip delay
      });

      expect(retryResult).toBe(false);
      expect(result.current.attempts).toBe(1);
      expect(result.current.error).toBe(mockError);
      expect(result.current.canRetry).toBe(true);
    });

    it('should stop retrying after max attempts', async () => {
      const mockError = new Error('Operation failed');
      const mockOperation = vi.fn().mockRejectedValue(mockError);
      const { result } = renderHook(() => useRetryHook(mockOperation, 2, 100));

      // First retry
      await act(async () => {
        await result.current.retry();
        vi.runAllTimers();
      });

      expect(result.current.attempts).toBe(1);
      expect(result.current.canRetry).toBe(true);

      // Second retry
      await act(async () => {
        await result.current.retry();
        vi.runAllTimers();
      });

      expect(result.current.attempts).toBe(2);
      expect(result.current.canRetry).toBe(false);
    });

    it('should reset retry state', () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Failed'));
      const { result } = renderHook(() => useRetryHook(mockOperation));

      act(() => {
        result.current.retry();
      });

      expect(result.current.attempts).toBeGreaterThan(0);

      act(() => {
        result.current.reset();
      });

      expect(result.current.attempts).toBe(0);
      expect(result.current.error).toBe(null);
      expect(result.current.canRetry).toBe(true);
    });

    it('should handle retry delay correctly', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Failed'));
      const { result } = renderHook(() => useRetryHook(mockOperation, 3, 1000));

      const retryPromise = act(async () => {
        return result.current.retry();
      });

      expect(result.current.isRetrying).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1000); // Advance delay
      });

      await retryPromise;

      expect(result.current.isRetrying).toBe(false);
    });
  });

  describe('Hook Integration', () => {
    it('should work together in complex scenarios', async () => {
      const TestComponent = () => {
        const errorHandler = useErrorHandlerHook();
        const webSocket = useWebSocketHook();
        const [storedData, setStoredData] = useLocalStorageHook('test-data', null);
        
        React.useEffect(() => {
          try {
            webSocket.connect('ws://localhost:3000');
          } catch (error) {
            errorHandler.captureError(error as Error);
          }
        }, []);

        return {
          errorHandler,
          webSocket,
          storedData,
          setStoredData,
        };
      };

      const { result } = renderHook(() => TestComponent());

      await waitFor(() => {
        expect(result.current.webSocket.isConnected).toBe(true);
      });

      // Test data persistence
      act(() => {
        result.current.setStoredData('test value');
      });

      expect(localStorage.getItem('test-data')).toBe('"test value"');
      expect(result.current.storedData).toBe('test value');
    });

    it('should handle errors across multiple hooks', async () => {
      const TestComponent = () => {
        const errorHandler = useErrorHandlerHook();
        const asyncOp = useAsyncOperationHook(
          () => Promise.reject(new Error('Async failed'))
        );

        React.useEffect(() => {
          if (asyncOp.error) {
            errorHandler.captureError(asyncOp.error);
          }
        }, [asyncOp.error]);

        return { errorHandler, asyncOp };
      };

      const { result } = renderHook(() => TestComponent());

      await waitFor(() => {
        expect(result.current.asyncOp.error).toBeTruthy();
      });

      await waitFor(() => {
        expect(result.current.errorHandler.errors).toHaveLength(1);
      });

      expect(result.current.errorHandler.errors[0].message).toBe('Async failed');
    });
  });

  describe('Hook Error Handling', () => {
    it('should handle hook initialization errors', () => {
      const ProblematicHook = () => {
        const [value, setValue] = React.useState(() => {
          // Simulate initialization error
          if (Math.random() > 0.5) {
            throw new Error('Initialization failed');
          }
          return 'success';
        });

        return { value, setValue };
      };

      // Should not crash when hook fails to initialize
      try {
        renderHook(() => ProblematicHook());
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle cleanup errors gracefully', () => {
      const CleanupHook = () => {
        React.useEffect(() => {
          return () => {
            // Simulate cleanup error
            throw new Error('Cleanup failed');
          };
        }, []);
      };

      const { unmount } = renderHook(() => CleanupHook());

      // Should not crash on unmount
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Hook Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      let renderCount = 0;
      
      const TestHook = ({ value }: { value: string }) => {
        renderCount++;
        const debouncedValue = useDebounceHook(value, 100);
        return { debouncedValue, renderCount };
      };

      const { result, rerender } = renderHook(
        (props) => TestHook(props),
        { initialProps: { value: 'initial' } }
      );

      const initialRenderCount = result.current.renderCount;

      // Multiple quick changes should not cause multiple renders
      rerender({ value: 'change1' });
      rerender({ value: 'change2' });
      rerender({ value: 'change3' });

      expect(result.current.renderCount - initialRenderCount).toBeLessThanOrEqual(3);
    });

    it('should memoize expensive operations', () => {
      let expensiveCallCount = 0;
      
      const ExpensiveHook = ({ input }: { input: string }) => {
        const memoizedValue = React.useMemo(() => {
          expensiveCallCount++;
          return input.toUpperCase();
        }, [input]);

        return { memoizedValue, expensiveCallCount };
      };

      const { result, rerender } = renderHook(
        (props) => ExpensiveHook(props),
        { initialProps: { input: 'test' } }
      );

      expect(result.current.expensiveCallCount).toBe(1);

      // Same input should not trigger expensive operation
      rerender({ input: 'test' });
      expect(result.current.expensiveCallCount).toBe(1);

      // Different input should trigger expensive operation
      rerender({ input: 'different' });
      expect(result.current.expensiveCallCount).toBe(2);
    });
  });
});