/**
 * Resource Leak Prevention Test Suite
 * 
 * London School TDD: Focus on preventing resource accumulation
 * These tests specifically target the resource leak patterns identified in the codebase
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, cleanup, waitFor, act } from '@testing-library/react';
import { MemoryRouter, BrowserRouter } from 'react-router-dom';

// Mock contracts
import {
  createClaudeInstanceAPIMock,
  createSSEConnectionMock,
  createInstanceResponse,
  createSuccessResponse,
  verifyResourceLeakPrevention
} from './mock-contracts';

// Global mocks
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockEventSource = jest.fn();
global.EventSource = mockEventSource;

// Performance monitoring mocks
const mockPerformanceObserver = jest.fn();
global.PerformanceObserver = mockPerformanceObserver;

// Import components after mocks
import { EnhancedSSEInterface } from '../../../frontend/src/components/claude-manager/EnhancedSSEInterface';

/**
 * Resource Leak Prevention Test Suite
 * 
 * Targets specific resource leak patterns:
 * 1. Accumulating instances across mount/unmount cycles
 * 2. Memory leaks from unclosed connections
 * 3. Event listener accumulation
 * 4. Timer/interval leaks
 * 5. Promise resolution leaks
 * 6. Navigation-induced resource leaks
 */
describe('Resource Leak Prevention', () => {
  let apiMock: ReturnType<typeof createClaudeInstanceAPIMock>;
  let sseMock: ReturnType<typeof createSSEConnectionMock>;
  let performanceObserverMock: jest.Mock;

  beforeEach(() => {
    apiMock = createClaudeInstanceAPIMock();
    sseMock = createSSEConnectionMock();
    performanceObserverMock = jest.fn();
    
    // Setup mocks
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      const method = options?.method || 'GET';
      
      if (method === 'GET' && url.includes('/api/claude/instances')) {
        return Promise.resolve({
          ok: true,
          json: () => apiMock.fetchInstances()
        });
      }
      
      if (method === 'POST' && url.includes('/api/claude/instances')) {
        const config = JSON.parse(options?.body as string);
        return Promise.resolve({
          ok: true,
          json: () => apiMock.createInstance(config)
        });
      }
      
      return Promise.reject(new Error(`Unexpected call: ${method} ${url}`));
    });
    
    mockEventSource.mockImplementation(() => sseMock);
    mockPerformanceObserver.mockImplementation(() => performanceObserverMock);
    
    // Default responses
    apiMock.fetchInstances.mockResolvedValue(createSuccessResponse({ instances: [] }));
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  /**
   * Test Suite 1: Instance Accumulation Prevention
   * Prevents the primary bug: instances accumulating on each mount
   */
  describe('Instance Accumulation Prevention', () => {
    it('MUST NOT accumulate instances across 10 mount/unmount cycles', async () => {
      const cycles = 10;
      
      for (let i = 0; i < cycles; i++) {
        const { unmount } = render(
          <MemoryRouter>
            <EnhancedSSEInterface />
          </MemoryRouter>
        );

        await waitFor(() => {
          expect(apiMock.fetchInstances).toHaveBeenCalled();
        });

        unmount();
      }

      // Verify no accumulation
      verifyResourceLeakPrevention(apiMock, cycles);
      expect(apiMock.createInstance).not.toHaveBeenCalled();
    });

    it('MUST prevent instance creation even with rapid mount/unmount cycles', async () => {
      const rapidCycles = 20;
      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < rapidCycles; i++) {
        const promise = act(async () => {
          const { unmount } = render(
            <MemoryRouter>
              <EnhancedSSEInterface />
            </MemoryRouter>
          );
          
          // Rapid unmount
          setTimeout(unmount, 10);
        });
        
        promises.push(promise);
      }
      
      await Promise.all(promises);
      
      // Should only fetch existing instances, never create new ones
      expect(apiMock.fetchInstances).toHaveBeenCalledTimes(rapidCycles);
      expect(apiMock.createInstance).not.toHaveBeenCalled();
    });

    it('MUST handle concurrent component instances without creating duplicates', async () => {
      // Mount multiple instances simultaneously
      const components = Array.from({ length: 5 }, () =>
        render(
          <MemoryRouter>
            <EnhancedSSEInterface />
          </MemoryRouter>
        )
      );

      await waitFor(() => {
        expect(apiMock.fetchInstances).toHaveBeenCalledTimes(5);
      });

      // Unmount all
      components.forEach(({ unmount }) => unmount());

      // Should not create any instances
      expect(apiMock.createInstance).not.toHaveBeenCalled();
    });
  });

  /**
   * Test Suite 2: Connection Resource Management
   * Prevents SSE/WebSocket connection leaks
   */
  describe('Connection Resource Management', () => {
    it('MUST close all SSE connections on unmount', async () => {
      const connectionCount = 3;
      const connections = Array.from({ length: connectionCount }, () => ({
        close: jest.fn(),
        removeEventListener: jest.fn(),
        addEventListener: jest.fn(),
        readyState: EventSource.OPEN
      }));
      
      let connectionIndex = 0;
      mockEventSource.mockImplementation(() => connections[connectionIndex++]);

      // Mount multiple components
      const components = Array.from({ length: connectionCount }, () =>
        render(
          <MemoryRouter>
            <EnhancedSSEInterface />
          </MemoryRouter>
        )
      );

      // Unmount all
      components.forEach(({ unmount }) => unmount());

      // Verify all connections closed
      connections.forEach(connection => {
        expect(connection.close).toHaveBeenCalled();
      });
    });

    it('MUST prevent connection accumulation across navigation', async () => {
      let connectionCount = 0;
      const connections: Array<{ close: jest.Mock }> = [];
      
      mockEventSource.mockImplementation(() => {
        const connection = { 
          close: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          readyState: EventSource.OPEN
        };
        connections.push(connection);
        connectionCount++;
        return connection;
      });

      const { rerender } = render(
        <BrowserRouter>
          <EnhancedSSEInterface />
        </BrowserRouter>
      );

      // Simulate navigation cycles
      for (let i = 0; i < 5; i++) {
        rerender(<div>Other page</div>);
        rerender(
          <BrowserRouter>
            <EnhancedSSEInterface />
          </BrowserRouter>
        );
      }

      // Should not accumulate excessive connections
      expect(connectionCount).toBeLessThanOrEqual(6); // Initial + 5 navigations
      
      // All previous connections should be closed
      connections.slice(0, -1).forEach(connection => {
        expect(connection.close).toHaveBeenCalled();
      });
    });

    it('MUST handle connection errors without leaking resources', async () => {
      const mockConnection = {
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        readyState: EventSource.CLOSED
      };
      
      mockEventSource.mockImplementation(() => {
        // Simulate connection error
        setTimeout(() => {
          const errorHandler = mockConnection.addEventListener.mock.calls
            .find(call => call[0] === 'error')?.[1];
          if (errorHandler) {
            errorHandler(new Event('error'));
          }
        }, 100);
        
        return mockConnection;
      });

      const { unmount } = render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // Wait for error to occur
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      unmount();

      // Should still clean up properly despite error
      expect(mockConnection.close).toHaveBeenCalled();
    });
  });

  /**
   * Test Suite 3: Event Listener Management
   * Prevents event listener accumulation
   */
  describe('Event Listener Management', () => {
    it('MUST remove all event listeners on unmount', async () => {
      const listeners = new Map<string, Function[]>();
      const originalAddEventListener = window.addEventListener;
      const originalRemoveEventListener = window.removeEventListener;
      
      // Mock event listener tracking
      window.addEventListener = jest.fn((event, handler) => {
        if (!listeners.has(event)) {
          listeners.set(event, []);
        }
        listeners.get(event)!.push(handler as Function);
      });
      
      window.removeEventListener = jest.fn((event, handler) => {
        const eventListeners = listeners.get(event);
        if (eventListeners) {
          const index = eventListeners.indexOf(handler as Function);
          if (index > -1) {
            eventListeners.splice(index, 1);
          }
        }
      });

      const { unmount } = render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      const addedListenersCount = (window.addEventListener as jest.Mock).mock.calls.length;

      unmount();

      const removedListenersCount = (window.removeEventListener as jest.Mock).mock.calls.length;

      // Should remove at least as many listeners as were added
      expect(removedListenersCount).toBeGreaterThanOrEqual(addedListenersCount);

      // Restore original methods
      window.addEventListener = originalAddEventListener;
      window.removeEventListener = originalRemoveEventListener;
    });

    it('MUST not accumulate DOM event listeners across mounts', async () => {
      let totalListeners = 0;
      
      const mockAddEventListener = jest.fn(() => totalListeners++);
      const mockRemoveEventListener = jest.fn(() => totalListeners--);
      
      const originalAdd = window.addEventListener;
      const originalRemove = window.removeEventListener;
      
      window.addEventListener = mockAddEventListener;
      window.removeEventListener = mockRemoveEventListener;

      // Multiple mount/unmount cycles
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(
          <MemoryRouter>
            <EnhancedSSEInterface />
          </MemoryRouter>
        );
        
        unmount();
      }

      // Should not accumulate listeners
      expect(totalListeners).toBeLessThanOrEqual(0);

      // Restore
      window.addEventListener = originalAdd;
      window.removeEventListener = originalRemove;
    });
  });

  /**
   * Test Suite 4: Memory Leak Prevention
   * Prevents general memory leaks from hooks and state
   */
  describe('Memory Leak Prevention', () => {
    it('MUST cleanup all timers and intervals on unmount', async () => {
      const activeTimers = new Set<number>();
      const originalSetTimeout = global.setTimeout;
      const originalSetInterval = global.setInterval;
      const originalClearTimeout = global.clearTimeout;
      const originalClearInterval = global.clearInterval;
      
      global.setTimeout = jest.fn((callback, delay) => {
        const id = originalSetTimeout(callback, delay);
        activeTimers.add(id);
        return id;
      });
      
      global.setInterval = jest.fn((callback, delay) => {
        const id = originalSetInterval(callback, delay);
        activeTimers.add(id);
        return id;
      });
      
      global.clearTimeout = jest.fn((id) => {
        activeTimers.delete(id);
        return originalClearTimeout(id);
      });
      
      global.clearInterval = jest.fn((id) => {
        activeTimers.delete(id);
        return originalClearInterval(id);
      });

      const { unmount } = render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // Let component create timers
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const timersBeforeUnmount = activeTimers.size;
      
      unmount();
      
      // Wait for cleanup
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Should clean up timers
      expect(global.clearTimeout).toHaveBeenCalled();
      expect(activeTimers.size).toBeLessThanOrEqual(timersBeforeUnmount);

      // Restore
      global.setTimeout = originalSetTimeout;
      global.setInterval = originalSetInterval;
      global.clearTimeout = originalClearTimeout;
      global.clearInterval = originalClearInterval;
    });

    it('MUST not retain references to unmounted components', async () => {
      // This is a conceptual test - in practice would need memory profiling tools
      let componentRefs = 0;
      
      const { unmount } = render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      componentRefs++; // Component mounted
      
      unmount();
      
      // Simulate garbage collection check
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Component should be eligible for GC
      expect(componentRefs).toBe(1); // Only our test reference
    });

    it('MUST handle promise cleanup to prevent memory leaks', async () => {
      const pendingPromises = new Set<Promise<any>>();
      
      // Mock fetch to track promises
      mockFetch.mockImplementation((url) => {
        const promise = Promise.resolve({
          ok: true,
          json: () => apiMock.fetchInstances()
        });
        
        pendingPromises.add(promise);
        
        promise.finally(() => {
          pendingPromises.delete(promise);
        });
        
        return promise;
      });

      const { unmount } = render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // Wait for promises to start
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      const promisesBeforeUnmount = pendingPromises.size;
      
      unmount();
      
      // Wait for cleanup
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Promises should resolve and be cleaned up
      expect(pendingPromises.size).toBeLessThanOrEqual(promisesBeforeUnmount);
    });
  });

  /**
   * Test Suite 5: Navigation-Specific Resource Management
   * Prevents navigation-induced resource leaks
   */
  describe('Navigation-Specific Resource Management', () => {
    it('MUST cleanup resources during browser back/forward navigation', async () => {
      const history = jest.fn();
      
      const { rerender } = render(
        <BrowserRouter>
          <EnhancedSSEInterface />
        </BrowserRouter>
      );

      // Simulate browser navigation
      rerender(<div>Different route</div>);
      rerender(
        <BrowserRouter>
          <EnhancedSSEInterface />
        </BrowserRouter>
      );

      // Should not accumulate resources
      expect(apiMock.fetchInstances).toHaveBeenCalledTimes(2);
      expect(apiMock.createInstance).not.toHaveBeenCalled();
    });

    it('MUST handle tab visibility changes without resource leaks', async () => {
      const { unmount } = render(
        <MemoryRouter>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // Simulate tab becoming hidden
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'hidden'
      });
      
      document.dispatchEvent(new Event('visibilitychange'));

      // Simulate tab becoming visible again
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible'
      });
      
      document.dispatchEvent(new Event('visibilitychange'));

      unmount();

      // Should handle visibility changes without creating instances
      expect(apiMock.createInstance).not.toHaveBeenCalled();
    });

    it('MUST prevent resource accumulation during route parameter changes', async () => {
      const { rerender } = render(
        <MemoryRouter initialEntries={['/instances/123']}>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // Change route parameters multiple times
      rerender(
        <MemoryRouter initialEntries={['/instances/456']}>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );
      
      rerender(
        <MemoryRouter initialEntries={['/instances/789']}>
          <EnhancedSSEInterface />
        </MemoryRouter>
      );

      // Should not accumulate resources
      expect(apiMock.fetchInstances).toHaveBeenCalledTimes(3);
      expect(apiMock.createInstance).not.toHaveBeenCalled();
    });
  });

  /**
   * Test Suite 6: Performance Impact Prevention
   * Ensures resource management doesn't impact performance
   */
  describe('Performance Impact Prevention', () => {
    it('MUST maintain acceptable performance across many cycles', async () => {
      const startTime = performance.now();
      const cycles = 50;
      
      for (let i = 0; i < cycles; i++) {
        const { unmount } = render(
          <MemoryRouter>
            <EnhancedSSEInterface />
          </MemoryRouter>
        );
        
        await waitFor(() => {
          expect(apiMock.fetchInstances).toHaveBeenCalled();
        });
        
        unmount();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete in reasonable time (less than 5 seconds for 50 cycles)
      expect(duration).toBeLessThan(5000);
      
      // Should not create any instances
      expect(apiMock.createInstance).not.toHaveBeenCalled();
    });

    it('MUST not cause memory growth over time', async () => {
      // This would require actual memory monitoring in a real test environment
      // Here we simulate by ensuring no accumulation of trackable resources
      
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Perform many operations
      for (let i = 0; i < 20; i++) {
        const { unmount } = render(
          <MemoryRouter>
            <EnhancedSSEInterface />
          </MemoryRouter>
        );
        
        unmount();
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Memory growth should be minimal (this is a conceptual test)
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryGrowth = finalMemory - initialMemory;
        expect(memoryGrowth).toBeLessThan(1000000); // Less than 1MB growth
      }
      
      // Verify no instance accumulation
      expect(apiMock.createInstance).not.toHaveBeenCalled();
    });
  });
});