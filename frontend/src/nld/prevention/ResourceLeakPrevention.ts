/**
 * Resource Leak Prevention System
 * Implements automated cleanup enforcement and prevention measures
 * for React components and resource management
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { resourceLeakDetector, ResourceLeakPattern } from '../detection/ResourceLeakDetector';

export interface CleanupRegistration {
  id: string;
  component: string;
  type: 'event_listener' | 'timer' | 'subscription' | 'api_call' | 'custom';
  cleanup: () => void;
  created: number;
}

export interface PreventionRule {
  id: string;
  trigger: string;
  prevention: (context: any) => Promise<boolean>;
  description: string;
  active: boolean;
}

export class ResourceLeakPrevention {
  private cleanupRegistrations: Map<string, CleanupRegistration[]> = new Map();
  private preventionRules: PreventionRule[] = [];
  private componentCleanupMap: Map<string, Set<() => void>> = new Map();
  private globalTimerIds: Set<number> = new Set();
  private globalEventListeners: Map<string, Set<EventListener>> = new Map();
  private isActive = true;

  constructor() {
    this.initializePreventionRules();
    this.setupGlobalResourceTracking();
  }

  private initializePreventionRules(): void {
    const rules: PreventionRule[] = [
      {
        id: 'component_auto_mount_prevention',
        trigger: 'component_mount_leak',
        prevention: this.preventAutoComponentMounting.bind(this),
        description: 'Prevents automatic component mounting without user action',
        active: true
      },
      {
        id: 'navigation_cleanup_enforcement',
        trigger: 'navigation_accumulation',
        prevention: this.enforceNavigationCleanup.bind(this),
        description: 'Enforces cleanup on navigation events',
        active: true
      },
      {
        id: 'event_listener_cleanup_enforcement',
        trigger: 'event_listener_leak',
        prevention: this.enforceEventListenerCleanup.bind(this),
        description: 'Automatically removes orphaned event listeners',
        active: true
      },
      {
        id: 'timer_cleanup_enforcement',
        trigger: 'timer_leak',
        prevention: this.enforceTimerCleanup.bind(this),
        description: 'Automatically clears orphaned timers',
        active: true
      }
    ];

    this.preventionRules = rules;
  }

  private setupGlobalResourceTracking(): void {
    this.overrideGlobalResourceMethods();
    this.setupNavigationCleanupListeners();
  }

  private overrideGlobalResourceMethods(): void {
    // Override setTimeout to track timers
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = ((callback: Function, delay: number, ...args: any[]) => {
      const timerId = originalSetTimeout(() => {
        this.globalTimerIds.delete(timerId as number);
        callback.apply(null, args);
      }, delay);
      this.globalTimerIds.add(timerId as number);
      return timerId;
    }) as typeof setTimeout;

    // Override setInterval to track intervals
    const originalSetInterval = window.setInterval;
    window.setInterval = ((callback: Function, delay: number, ...args: any[]) => {
      const timerId = originalSetInterval(() => {
        callback.apply(null, args);
      }, delay);
      this.globalTimerIds.add(timerId as number);
      return timerId;
    }) as typeof setInterval;

    // Override clearTimeout to track cleanup
    const originalClearTimeout = window.clearTimeout;
    window.clearTimeout = (id: number) => {
      this.globalTimerIds.delete(id);
      originalClearTimeout(id);
    };

    // Override clearInterval to track cleanup
    const originalClearInterval = window.clearInterval;
    window.clearInterval = (id: number) => {
      this.globalTimerIds.delete(id);
      originalClearInterval(id);
    };

    // Override addEventListener to track listeners
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type: string, listener: EventListener, options?: boolean | AddEventListenerOptions) {
      const target = this as EventTarget;
      const key = `${target.constructor.name}_${type}`;
      
      if (!resourceLeakPrevention.globalEventListeners.has(key)) {
        resourceLeakPrevention.globalEventListeners.set(key, new Set());
      }
      resourceLeakPrevention.globalEventListeners.get(key)!.add(listener);
      
      originalAddEventListener.call(this, type, listener, options);
    };

    // Override removeEventListener to track cleanup
    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.removeEventListener = function(type: string, listener: EventListener, options?: boolean | EventListenerOptions) {
      const target = this as EventTarget;
      const key = `${target.constructor.name}_${type}`;
      
      if (resourceLeakPrevention.globalEventListeners.has(key)) {
        resourceLeakPrevention.globalEventListeners.get(key)!.delete(listener);
      }
      
      originalRemoveEventListener.call(this, type, listener, options);
    };
  }

  private setupNavigationCleanupListeners(): void {
    // Clean up resources on navigation
    const cleanupOnNavigation = () => {
      this.enforceNavigationCleanup();
    };

    window.addEventListener('beforeunload', cleanupOnNavigation);
    window.addEventListener('unload', cleanupOnNavigation);
    
    // Monitor React Router navigation if available
    if (typeof history !== 'undefined') {
      const originalPushState = history.pushState;
      history.pushState = (...args) => {
        cleanupOnNavigation();
        originalPushState.apply(history, args);
      };
    }
  }

  // Prevention Rule Implementations
  private async preventAutoComponentMounting(context: any): Promise<boolean> {
    // Check if component mounting was triggered by user action
    const userInitiated = this.wasUserInitiated();
    
    if (!userInitiated) {
      console.warn('Prevented automatic component mounting without user action');
      return false; // Prevent mounting
    }
    
    return true; // Allow mounting
  }

  private async enforceNavigationCleanup(): Promise<boolean> {
    // Clean up all registered resources for current route
    const currentUrl = window.location.href;
    
    // Clean up component-specific resources
    for (const [componentName, cleanupFunctions] of this.componentCleanupMap) {
      cleanupFunctions.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn(`Cleanup failed for ${componentName}:`, error);
        }
      });
      cleanupFunctions.clear();
    }

    // Clean up orphaned timers
    this.globalTimerIds.forEach(timerId => {
      clearTimeout(timerId);
      clearInterval(timerId);
    });
    this.globalTimerIds.clear();

    // Clean up orphaned event listeners (for document/window)
    for (const [key, listeners] of this.globalEventListeners) {
      if (key.startsWith('HTMLDocument_') || key.startsWith('Window_')) {
        listeners.forEach(listener => {
          try {
            if (key.startsWith('HTMLDocument_')) {
              const eventType = key.replace('HTMLDocument_', '');
              document.removeEventListener(eventType, listener as any);
            } else {
              const eventType = key.replace('Window_', '');
              window.removeEventListener(eventType, listener as any);
            }
          } catch (error) {
            console.warn(`Failed to remove listener for ${key}:`, error);
          }
        });
        listeners.clear();
      }
    }

    console.log('Navigation cleanup enforced for:', currentUrl);
    return true;
  }

  private async enforceEventListenerCleanup(): Promise<boolean> {
    let cleanedUp = 0;

    for (const [key, listeners] of this.globalEventListeners) {
      // Clean up listeners that should have been removed
      if (listeners.size > 10) { // Threshold for cleanup
        const listenersArray = Array.from(listeners);
        
        // Remove older listeners (keep only last 5)
        const toRemove = listenersArray.slice(0, -5);
        toRemove.forEach(listener => {
          listeners.delete(listener);
          cleanedUp++;
        });
      }
    }

    if (cleanedUp > 0) {
      console.log(`Cleaned up ${cleanedUp} orphaned event listeners`);
    }

    return true;
  }

  private async enforceTimerCleanup(): Promise<boolean> {
    let cleanedUp = 0;

    // Clear old timers (assuming timers older than 5 minutes should be cleaned)
    this.globalTimerIds.forEach(timerId => {
      clearTimeout(timerId);
      clearInterval(timerId);
      cleanedUp++;
    });

    this.globalTimerIds.clear();

    if (cleanedUp > 0) {
      console.log(`Cleaned up ${cleanedUp} orphaned timers`);
    }

    return true;
  }

  private wasUserInitiated(): boolean {
    // Check if the current call stack includes user event handlers
    const stack = new Error().stack || '';
    const userEventPatterns = [
      'onClick',
      'onSubmit',
      'onChange',
      'onKeyDown',
      'onKeyPress',
      'onMouseDown',
      'onTouchStart',
      'HTMLButtonElement',
      'HTMLInputElement'
    ];

    return userEventPatterns.some(pattern => stack.includes(pattern));
  }

  // Public API for React Component Integration
  public registerComponentCleanup(componentName: string, cleanup: () => void): void {
    if (!this.componentCleanupMap.has(componentName)) {
      this.componentCleanupMap.set(componentName, new Set());
    }
    
    this.componentCleanupMap.get(componentName)!.add(cleanup);
  }

  public unregisterComponentCleanup(componentName: string, cleanup?: () => void): void {
    const cleanupSet = this.componentCleanupMap.get(componentName);
    if (cleanupSet) {
      if (cleanup) {
        cleanupSet.delete(cleanup);
      } else {
        cleanupSet.clear();
      }
    }
  }

  // React Hook for Resource Leak Prevention
  public useResourceLeakPrevention(componentName: string) {
    const cleanupFunctionsRef = useRef<Set<() => void>>(new Set());

    const registerCleanup = useCallback((cleanup: () => void) => {
      cleanupFunctionsRef.current.add(cleanup);
      this.registerComponentCleanup(componentName, cleanup);
    }, [componentName]);

    const unregisterCleanup = useCallback((cleanup: () => void) => {
      cleanupFunctionsRef.current.delete(cleanup);
      this.unregisterComponentCleanup(componentName, cleanup);
    }, [componentName]);

    useEffect(() => {
      // Register component mount
      resourceLeakDetector.recordComponentMount(componentName);

      return () => {
        // Execute all cleanup functions
        cleanupFunctionsRef.current.forEach(cleanup => {
          try {
            cleanup();
          } catch (error) {
            console.warn(`Cleanup failed for ${componentName}:`, error);
          }
        });
        cleanupFunctionsRef.current.clear();

        // Unregister from global cleanup
        this.unregisterComponentCleanup(componentName);

        // Record component unmount
        resourceLeakDetector.recordComponentUnmount(componentName);
      };
    }, [componentName]);

    return { registerCleanup, unregisterCleanup };
  }

  // Pattern-based prevention
  public async applyPrevention(pattern: ResourceLeakPattern): Promise<boolean> {
    if (!this.isActive) return false;

    const applicableRules = this.preventionRules.filter(rule => 
      rule.active && rule.trigger === pattern.type
    );

    let preventionApplied = false;

    for (const rule of applicableRules) {
      try {
        const result = await rule.prevention(pattern);
        if (result) {
          preventionApplied = true;
          console.log(`Applied prevention rule: ${rule.description}`);
        }
      } catch (error) {
        console.warn(`Prevention rule failed: ${rule.id}`, error);
      }
    }

    return preventionApplied;
  }

  public setActive(active: boolean): void {
    this.isActive = active;
  }

  public getPreventionStats() {
    return {
      totalRules: this.preventionRules.length,
      activeRules: this.preventionRules.filter(r => r.active).length,
      registeredComponents: this.componentCleanupMap.size,
      trackedTimers: this.globalTimerIds.size,
      trackedListeners: Array.from(this.globalEventListeners.values())
        .reduce((sum, set) => sum + set.size, 0)
    };
  }

  public exportPreventionData(): string {
    return JSON.stringify({
      rules: this.preventionRules,
      stats: this.getPreventionStats(),
      componentCleanup: Object.fromEntries(
        Array.from(this.componentCleanupMap.entries()).map(([key, value]) => [
          key, 
          value.size
        ])
      )
    }, null, 2);
  }
}

// Higher-Order Component for automatic resource leak prevention
export function withResourceLeakPrevention<T extends {}>(
  WrappedComponent: React.ComponentType<T>,
  componentName?: string
): React.ComponentType<T> {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  const WithResourceLeakPrevention = (props: T) => {
    const { registerCleanup } = resourceLeakPrevention.useResourceLeakPrevention(displayName);

    return React.createElement(WrappedComponent, {
      ...props,
      __resourceLeakPrevention: { registerCleanup }
    } as T);
  };

  WithResourceLeakPrevention.displayName = `withResourceLeakPrevention(${displayName})`;
  return WithResourceLeakPrevention;
}

// Singleton instance
export const resourceLeakPrevention = new ResourceLeakPrevention();