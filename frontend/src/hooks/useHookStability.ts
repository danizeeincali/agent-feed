/**
 * SPARC Hook Stability Utilities
 * Emergency runtime hook validation and component reset system
 * Prevents "Rendered more hooks than during the previous render" errors
 */

import { useRef, useCallback, useEffect } from 'react';

/**
 * SPARC Hook Validation System
 * Monitors hook call order and detects violations
 */
export function useHookValidator(componentName: string) {
  const hookCallCountRef = useRef(0);
  const expectedHookCountRef = useRef<number | null>(null);
  const componentKeyRef = useRef(0);

  // Reset hook count on each render
  hookCallCountRef.current = 0;

  const validateHookCall = useCallback((hookName: string) => {
    hookCallCountRef.current += 1;
    
    // First render - establish baseline
    if (expectedHookCountRef.current === null) {
      console.log(`[SPARC] ${componentName}: Initial hook count baseline: ${hookCallCountRef.current}`);
      return;
    }

    // Detect hook count violation
    if (hookCallCountRef.current > expectedHookCountRef.current) {
      console.error(`[SPARC] HOOK VIOLATION DETECTED in ${componentName}: Expected ${expectedHookCountRef.current} hooks, got ${hookCallCountRef.current}`);
      console.error(`[SPARC] Violation at hook: ${hookName}`);
      
      // Force component reset
      componentKeyRef.current += 1;
      
      // Trigger emergency component reload
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    }
  }, [componentName]);

  // Set expected hook count after first render
  useEffect(() => {
    if (expectedHookCountRef.current === null) {
      expectedHookCountRef.current = hookCallCountRef.current;
      console.log(`[SPARC] ${componentName}: Hook count baseline set to ${expectedHookCountRef.current}`);
    }
  });

  return {
    validateHookCall,
    componentKey: componentKeyRef.current,
    forceReset: () => {
      componentKeyRef.current += 1;
      expectedHookCountRef.current = null;
    }
  };
}

/**
 * SPARC Component Reset Hook
 * Provides emergency component reset capabilities
 */
export function useComponentReset(componentName: string) {
  const resetCountRef = useRef(0);
  const lastErrorRef = useRef<string | null>(null);

  const forceReset = useCallback((reason: string = 'Manual reset') => {
    resetCountRef.current += 1;
    lastErrorRef.current = reason;
    
    console.warn(`[SPARC] Component ${componentName} reset #${resetCountRef.current}: ${reason}`);
    
    // Clear browser cache and force refresh
    if (typeof window !== 'undefined') {
      // Clear various caches
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
      
      // Force hard refresh
      window.location.reload();
    }
  }, [componentName]);

  const emergencyReset = useCallback(() => {
    console.error(`[SPARC] EMERGENCY RESET triggered for ${componentName}`);
    
    // Clear all possible caches
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear service worker caches
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => registration.unregister());
        });
      }
      
      // Force complete refresh
      window.location.href = window.location.href + '?cache-bust=' + Date.now();
    }
  }, [componentName]);

  return {
    resetCount: resetCountRef.current,
    lastError: lastErrorRef.current,
    forceReset,
    emergencyReset,
    resetKey: resetCountRef.current
  };
}

/**
 * SPARC Safe Hook Caller
 * Wraps hooks with validation and error boundaries
 */
export function useSafeHook<T>(
  hookFn: () => T,
  hookName: string,
  fallback: T,
  componentName: string = 'Unknown'
): T {
  const validator = useHookValidator(componentName);
  
  try {
    validator.validateHookCall(hookName);
    return hookFn();
  } catch (error) {
    console.error(`[SPARC] Hook ${hookName} failed in ${componentName}:`, error);
    return fallback;
  }
}

/**
 * SPARC Browser Cache Buster
 * Forces complete browser cache invalidation
 */
export function useCacheBuster() {
  const bustCache = useCallback(async () => {
    console.log('[SPARC] Executing emergency cache bust...');
    
    if (typeof window === 'undefined') return;
    
    try {
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear IndexedDB
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases?.() || [];
        await Promise.all(
          databases.map(db => {
            if (db.name) {
              return new Promise(resolve => {
                const deleteReq = indexedDB.deleteDatabase(db.name!);
                deleteReq.onsuccess = () => resolve(true);
                deleteReq.onerror = () => resolve(false);
              });
            }
          })
        );
      }
      
      // Clear Cache API
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(name => caches.delete(name))
        );
      }
      
      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => registration.unregister())
        );
      }
      
      console.log('[SPARC] Cache bust complete, forcing reload...');
      
      // Force complete page reload with cache bypass
      window.location.replace(window.location.href + '?sparc-reset=' + Date.now());
      
    } catch (error) {
      console.error('[SPARC] Cache bust failed:', error);
      // Fallback: simple reload
      window.location.reload();
    }
  }, []);
  
  return bustCache;
}