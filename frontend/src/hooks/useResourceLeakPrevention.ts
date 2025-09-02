/**
 * React Hook for Resource Leak Prevention
 * Provides automatic cleanup and resource monitoring for React components
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { resourceLeakPrevention } from '../nld/prevention/ResourceLeakPrevention';
import { resourceLeakDetector } from '../nld/detection/ResourceLeakDetector';

export interface ResourceLeakPreventionOptions {
  componentName?: string;
  enableAutoCleanup?: boolean;
  enableResourceTracking?: boolean;
  enableNavigationCleanup?: boolean;
  customCleanupHandlers?: (() => void)[];
  alertOnLeaks?: boolean;
}

export interface ResourceTracker {
  registerEventListener: (target: EventTarget, type: string, listener: EventListener, options?: boolean | AddEventListenerOptions) => void;
  registerTimer: (timerId: number, type: 'timeout' | 'interval') => void;
  registerSubscription: (subscriptionId: string, unsubscribe: () => void) => void;
  registerCustomResource: (resourceId: string, cleanup: () => void) => void;
  cleanup: () => void;
  getResourceCount: () => number;
}

export function useResourceLeakPrevention(
  options: ResourceLeakPreventionOptions = {}
): ResourceTracker {
  const {
    componentName = 'UnknownComponent',
    enableAutoCleanup = true,
    enableResourceTracking = true,
    enableNavigationCleanup = true,
    customCleanupHandlers = [],
    alertOnLeaks = true
  } = options;

  // Track resources created by this component
  const resourcesRef = useRef<{
    eventListeners: Array<{ target: EventTarget; type: string; listener: EventListener; options?: boolean | AddEventListenerOptions }>;
    timers: Array<{ id: number; type: 'timeout' | 'interval' }>;
    subscriptions: Array<{ id: string; unsubscribe: () => void }>;
    customResources: Array<{ id: string; cleanup: () => void }>;
  }>({
    eventListeners: [],
    timers: [],
    subscriptions: [],
    customResources: []
  });

  const mountTimeRef = useRef<number>(Date.now());
  const cleanupExecutedRef = useRef<boolean>(false);

  // Register component mount
  useEffect(() => {
    if (enableResourceTracking) {
      resourceLeakDetector.recordComponentMount(componentName);
    }
  }, [componentName, enableResourceTracking]);

  // Resource registration functions
  const registerEventListener = useCallback((
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ) => {
    if (!enableResourceTracking) return;

    // Add the event listener
    target.addEventListener(type, listener, options);

    // Track it for cleanup
    resourcesRef.current.eventListeners.push({
      target,
      type,
      listener,
      options
    });

    // Register with leak prevention system
    if (enableAutoCleanup) {
      const cleanup = () => {
        try {
          target.removeEventListener(type, listener, options);
        } catch (error) {
          console.warn(`Failed to remove event listener ${type} from ${componentName}:`, error);
        }
      };
      
      resourceLeakPrevention.registerComponentCleanup(componentName, cleanup);
    }
  }, [componentName, enableResourceTracking, enableAutoCleanup]);

  const registerTimer = useCallback((timerId: number, type: 'timeout' | 'interval') => {
    if (!enableResourceTracking) return;

    resourcesRef.current.timers.push({ id: timerId, type });

    // Register cleanup
    if (enableAutoCleanup) {
      const cleanup = () => {
        try {
          if (type === 'timeout') {
            clearTimeout(timerId);
          } else {
            clearInterval(timerId);
          }
        } catch (error) {
          console.warn(`Failed to clear ${type} ${timerId} from ${componentName}:`, error);
        }
      };

      resourceLeakPrevention.registerComponentCleanup(componentName, cleanup);
    }
  }, [componentName, enableResourceTracking, enableAutoCleanup]);

  const registerSubscription = useCallback((subscriptionId: string, unsubscribe: () => void) => {
    if (!enableResourceTracking) return;

    resourcesRef.current.subscriptions.push({ id: subscriptionId, unsubscribe });

    // Register cleanup
    if (enableAutoCleanup) {
      const cleanup = () => {
        try {
          unsubscribe();
        } catch (error) {
          console.warn(`Failed to unsubscribe ${subscriptionId} from ${componentName}:`, error);
        }
      };

      resourceLeakPrevention.registerComponentCleanup(componentName, cleanup);
    }
  }, [componentName, enableResourceTracking, enableAutoCleanup]);

  const registerCustomResource = useCallback((resourceId: string, cleanup: () => void) => {
    if (!enableResourceTracking) return;

    resourcesRef.current.customResources.push({ id: resourceId, cleanup });

    // Register cleanup
    if (enableAutoCleanup) {
      resourceLeakPrevention.registerComponentCleanup(componentName, cleanup);
    }
  }, [componentName, enableResourceTracking, enableAutoCleanup]);

  // Manual cleanup function
  const cleanup = useCallback(() => {
    if (cleanupExecutedRef.current) return;
    cleanupExecutedRef.current = true;

    const resources = resourcesRef.current;
    let cleanupCount = 0;

    // Cleanup event listeners
    resources.eventListeners.forEach(({ target, type, listener, options }) => {
      try {
        target.removeEventListener(type, listener, options);
        cleanupCount++;
      } catch (error) {
        console.warn(`Failed to remove event listener ${type}:`, error);
      }
    });

    // Cleanup timers
    resources.timers.forEach(({ id, type }) => {
      try {
        if (type === 'timeout') {
          clearTimeout(id);
        } else {
          clearInterval(id);
        }
        cleanupCount++;
      } catch (error) {
        console.warn(`Failed to clear ${type} ${id}:`, error);
      }
    });

    // Cleanup subscriptions
    resources.subscriptions.forEach(({ id, unsubscribe }) => {
      try {
        unsubscribe();
        cleanupCount++;
      } catch (error) {
        console.warn(`Failed to unsubscribe ${id}:`, error);
      }
    });

    // Cleanup custom resources
    resources.customResources.forEach(({ id, cleanup: resourceCleanup }) => {
      try {
        resourceCleanup();
        cleanupCount++;
      } catch (error) {
        console.warn(`Failed to cleanup custom resource ${id}:`, error);
      }
    });

    // Execute custom cleanup handlers
    customCleanupHandlers.forEach((handler, index) => {
      try {
        handler();
        cleanupCount++;
      } catch (error) {
        console.warn(`Failed to execute custom cleanup handler ${index}:`, error);
      }
    });

    // Clear resource tracking
    resourcesRef.current = {
      eventListeners: [],
      timers: [],
      subscriptions: [],
      customResources: []
    };

    // Log cleanup summary
    if (cleanupCount > 0) {
      console.debug(`${componentName}: Cleaned up ${cleanupCount} resources`);
    }

    // Unregister from leak prevention system
    resourceLeakPrevention.unregisterComponentCleanup(componentName);

  }, [componentName, customCleanupHandlers]);

  const getResourceCount = useCallback(() => {
    const resources = resourcesRef.current;
    return resources.eventListeners.length +
           resources.timers.length +
           resources.subscriptions.length +
           resources.customResources.length;
  }, []);

  // Navigation cleanup setup
  useEffect(() => {
    if (!enableNavigationCleanup) return;

    const handleNavigationCleanup = () => {
      cleanup();
    };

    // Register for navigation cleanup
    window.addEventListener('beforeunload', handleNavigationCleanup);
    
    // Clean up navigation listeners
    return () => {
      window.removeEventListener('beforeunload', handleNavigationCleanup);
    };
  }, [cleanup, enableNavigationCleanup]);

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      // Record component unmount
      if (enableResourceTracking) {
        resourceLeakDetector.recordComponentUnmount(componentName);
      }

      // Perform cleanup
      cleanup();

      // Check for potential leaks
      if (alertOnLeaks && enableResourceTracking) {
        const resourceCount = getResourceCount();
        const componentLifetime = Date.now() - mountTimeRef.current;

        // Alert if component had many resources or lived a long time with resources
        if (resourceCount > 5 || (resourceCount > 0 && componentLifetime > 300000)) { // 5 minutes
          console.warn(`Potential resource leak in ${componentName}: ${resourceCount} resources over ${componentLifetime}ms`);
        }
      }
    };
  }, [componentName, enableResourceTracking, alertOnLeaks, cleanup, getResourceCount]);

  // Return the resource tracker API
  const resourceTracker = useMemo<ResourceTracker>(() => ({
    registerEventListener,
    registerTimer,
    registerSubscription,
    registerCustomResource,
    cleanup,
    getResourceCount
  }), [registerEventListener, registerTimer, registerSubscription, registerCustomResource, cleanup, getResourceCount]);

  return resourceTracker;
}

// Enhanced versions of common resource creation functions with automatic tracking

export function useTrackedEventListener(
  target: EventTarget | null,
  type: string,
  listener: EventListener,
  options?: boolean | AddEventListenerOptions,
  resourceTracker?: ResourceTracker
): void {
  const defaultTracker = useResourceLeakPrevention();
  const tracker = resourceTracker || defaultTracker;

  useEffect(() => {
    if (!target) return;

    tracker.registerEventListener(target, type, listener, options);

    // The cleanup is handled by the resource tracker
  }, [target, type, listener, options, tracker]);
}

export function useTrackedTimeout(
  callback: () => void,
  delay: number,
  resourceTracker?: ResourceTracker
): void {
  const defaultTracker = useResourceLeakPrevention();
  const tracker = resourceTracker || defaultTracker;

  useEffect(() => {
    const timerId = setTimeout(callback, delay);
    tracker.registerTimer(timerId, 'timeout');

    // The cleanup is handled by the resource tracker
  }, [callback, delay, tracker]);
}

export function useTrackedInterval(
  callback: () => void,
  delay: number,
  resourceTracker?: ResourceTracker
): void {
  const defaultTracker = useResourceLeakPrevention();
  const tracker = resourceTracker || defaultTracker;

  useEffect(() => {
    const timerId = setInterval(callback, delay);
    tracker.registerTimer(timerId, 'interval');

    // The cleanup is handled by the resource tracker
  }, [callback, delay, tracker]);
}

// Hook for tracking async operations and subscriptions
export function useTrackedSubscription<T>(
  subscriptionFactory: () => { unsubscribe: () => void; subscription?: T },
  dependencies: React.DependencyList,
  resourceTracker?: ResourceTracker
): T | undefined {
  const defaultTracker = useResourceLeakPrevention();
  const tracker = resourceTracker || defaultTracker;
  const subscriptionRef = useRef<T>();

  useEffect(() => {
    const { unsubscribe, subscription } = subscriptionFactory();
    subscriptionRef.current = subscription;

    const subscriptionId = `subscription_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    tracker.registerSubscription(subscriptionId, unsubscribe);

    return () => {
      subscriptionRef.current = undefined;
    };
  }, [...dependencies, tracker]);

  return subscriptionRef.current;
}

// Hook for component lifecycle monitoring with resource leak detection
export function useComponentLifecycleMonitoring(
  componentName: string,
  options: {
    alertOnLongMount?: boolean;
    maxMountTime?: number;
    alertOnManyRerenders?: boolean;
    maxRerenders?: number;
  } = {}
) {
  const {
    alertOnLongMount = true,
    maxMountTime = 60000, // 1 minute
    alertOnManyRerenders = true,
    maxRerenders = 100
  } = options;

  const mountTimeRef = useRef<number>(Date.now());
  const rerenderCountRef = useRef<number>(0);
  const tracker = useResourceLeakPrevention({ componentName });

  // Track re-renders
  useEffect(() => {
    rerenderCountRef.current++;

    if (alertOnManyRerenders && rerenderCountRef.current > maxRerenders) {
      console.warn(`${componentName}: Excessive re-renders detected (${rerenderCountRef.current})`);
    }
  });

  // Monitor mount time
  useEffect(() => {
    const checkMountTime = () => {
      const mountTime = Date.now() - mountTimeRef.current;
      if (alertOnLongMount && mountTime > maxMountTime) {
        console.warn(`${componentName}: Long-lived component detected (${mountTime}ms)`);
      }
    };

    // Check mount time periodically
    const timerId = setInterval(checkMountTime, maxMountTime / 2);
    tracker.registerTimer(timerId, 'interval');

    return () => {
      const totalMountTime = Date.now() - mountTimeRef.current;
      console.debug(`${componentName}: Total mount time: ${totalMountTime}ms, Re-renders: ${rerenderCountRef.current}`);
    };
  }, [componentName, maxMountTime, alertOnLongMount, tracker]);

  return {
    tracker,
    getMountTime: () => Date.now() - mountTimeRef.current,
    getRerenderCount: () => rerenderCountRef.current
  };
}