import { useEffect, useRef, useCallback } from 'react';

// Hook to manage memory usage and prevent memory leaks
export const useMemoryOptimization = () => {
  const timers = useRef<Set<NodeJS.Timeout>>(new Set());
  const intervals = useRef<Set<NodeJS.Timeout>>(new Set());
  const eventListeners = useRef<Map<Element | Window, { event: string; handler: EventListener }[]>>(new Map());
  const abortControllers = useRef<Set<AbortController>>(new Set());
  
  // Create a memory-safe timeout
  const createTimeout = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      callback();
    }, delay);
    timers.current.add(timer);
    return timer;
  }, []);
  
  // Create a memory-safe interval
  const createInterval = useCallback((callback: () => void, delay: number) => {
    const interval = setInterval(callback, delay);
    intervals.current.add(interval);
    return interval;
  }, []);
  
  // Add event listener with automatic cleanup
  const addEventListener = useCallback((
    element: Element | Window,
    event: string,
    handler: EventListener,
    options?: boolean | AddEventListenerOptions
  ) => {
    element.addEventListener(event, handler, options);
    
    const listeners = eventListeners.current.get(element) || [];
    listeners.push({ event, handler });
    eventListeners.current.set(element, listeners);
  }, []);
  
  // Create AbortController for fetch requests
  const createAbortController = useCallback(() => {
    const controller = new AbortController();
    abortControllers.current.add(controller);
    return controller;
  }, []);
  
  // Force garbage collection (if available)
  const forceGC = useCallback(() => {
    if ('gc' in window && typeof window.gc === 'function') {
      window.gc();
    }
  }, []);
  
  // Get memory usage info
  const getMemoryInfo = useCallback(() => {
    const memory = (performance as any).memory;
    if (memory) {
      return {
        used: Math.round(memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
        percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
      };
    }
    return null;
  }, []);
  
  // Cleanup all resources
  const cleanup = useCallback(() => {
    // Clear all timers
    timers.current.forEach(timer => clearTimeout(timer));
    timers.current.clear();
    
    // Clear all intervals
    intervals.current.forEach(interval => clearInterval(interval));
    intervals.current.clear();
    
    // Remove all event listeners
    eventListeners.current.forEach((listeners, element) => {
      listeners.forEach(({ event, handler }) => {
        element.removeEventListener(event, handler);
      });
    });
    eventListeners.current.clear();
    
    // Abort all controllers
    abortControllers.current.forEach(controller => {
      controller.abort();
    });
    abortControllers.current.clear();
    
    // Force garbage collection
    forceGC();
  }, [forceGC]);
  
  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);
  
  return {
    createTimeout,
    createInterval,
    addEventListener,
    createAbortController,
    forceGC,
    getMemoryInfo,
    cleanup
  };
};