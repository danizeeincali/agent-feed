/**
 * NLD Component-Specific Monitoring System
 * 
 * This module provides component-level monitoring for Claude Instance Management
 * components, tracking render patterns, state changes, and component lifecycles
 * to detect failure patterns early.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { NLDPatternDetector, NLTRecord } from './nld-core-monitor';

export interface ComponentMetrics {
  componentName: string;
  mountTime: number;
  renderCount: number;
  errorCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  memoryLeakScore: number;
  stateUpdates: number;
  propChanges: number;
  isHealthy: boolean;
}

export interface RenderPerformanceData {
  component: string;
  renderTime: number;
  propsSize: number;
  stateSize: number;
  childrenCount: number;
  timestamp: number;
}

/**
 * Component Watcher for Claude Instance Components
 */
export class NLDComponentWatcher {
  private detector: NLDPatternDetector;
  private componentMetrics: Map<string, ComponentMetrics> = new Map();
  private renderObserver?: PerformanceObserver;
  private whiteScreenTimer?: number;
  private componentRenderTimes: Map<string, number[]> = new Map();

  constructor(detector: NLDPatternDetector) {
    this.detector = detector;
    this.initializeRenderObserver();
  }

  /**
   * Initialize performance observer for render monitoring
   */
  private initializeRenderObserver(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      this.renderObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.name.includes('React') || entry.name.includes('render')) {
            this.trackRenderPerformance(entry.name, entry.duration);
          }
        }
      });

      this.renderObserver.observe({ entryTypes: ['measure'] });
    } catch (error) {
      console.warn('Render performance monitoring not available:', error);
    }
  }

  /**
   * Track render performance for a component
   */
  private trackRenderPerformance(componentName: string, duration: number): void {
    const times = this.componentRenderTimes.get(componentName) || [];
    times.push(duration);
    
    // Keep only last 10 render times
    if (times.length > 10) {
      times.shift();
    }
    
    this.componentRenderTimes.set(componentName, times);

    // Detect slow renders (>16ms for 60fps)
    if (duration > 16) {
      this.detector.detectPattern('nld-005', {
        component: componentName,
        userAgent: navigator.userAgent,
        url: window.location.href,
        networkState: navigator.onLine ? 'online' : 'offline',
        performanceMetrics: {
          renderTime: duration,
          loadTime: 0,
          interactiveTime: 0
        }
      }, `Slow render detected: ${duration.toFixed(2)}ms`);
    }

    // Detect infinite render loops (>5 renders in 100ms)
    const recentRenders = times.filter(time => Date.now() - time < 100);
    if (recentRenders.length > 5) {
      this.detector.detectPattern('nld-005', {
        component: componentName,
        userAgent: navigator.userAgent,
        url: window.location.href,
        networkState: navigator.onLine ? 'online' : 'offline',
        performanceMetrics: {
          renderTime: duration,
          loadTime: 0,
          interactiveTime: 0
        }
      }, `Infinite render loop detected: ${recentRenders.length} renders`);
    }
  }

  /**
   * Register a component for monitoring
   */
  public registerComponent(componentName: string): ComponentMetrics {
    const metrics: ComponentMetrics = {
      componentName,
      mountTime: Date.now(),
      renderCount: 0,
      errorCount: 0,
      lastRenderTime: 0,
      averageRenderTime: 0,
      memoryLeakScore: 0,
      stateUpdates: 0,
      propChanges: 0,
      isHealthy: true
    };

    this.componentMetrics.set(componentName, metrics);
    return metrics;
  }

  /**
   * Update component metrics on render
   */
  public onComponentRender(
    componentName: string, 
    renderTime: number, 
    props?: Record<string, any>, 
    state?: Record<string, any>
  ): void {
    const metrics = this.componentMetrics.get(componentName);
    if (!metrics) return;

    metrics.renderCount++;
    metrics.lastRenderTime = renderTime;
    
    // Calculate average render time
    const times = this.componentRenderTimes.get(componentName) || [];
    times.push(renderTime);
    metrics.averageRenderTime = times.reduce((sum, time) => sum + time, 0) / times.length;

    // Check for white screen (no content after 5 seconds)
    if (this.whiteScreenTimer) {
      clearTimeout(this.whiteScreenTimer);
    }

    this.whiteScreenTimer = window.setTimeout(() => {
      this.checkForWhiteScreen(componentName);
    }, 5000);

    // Update prop and state change counts
    if (props) {
      metrics.propChanges++;
    }
    if (state) {
      metrics.stateUpdates++;
    }

    // Calculate memory leak score based on render frequency
    const renderFrequency = metrics.renderCount / ((Date.now() - metrics.mountTime) / 1000);
    metrics.memoryLeakScore = Math.min(100, renderFrequency * 10);

    // Update health status
    metrics.isHealthy = this.calculateComponentHealth(metrics);

    this.componentMetrics.set(componentName, metrics);
  }

  /**
   * Record component error
   */
  public onComponentError(componentName: string, error: Error): void {
    const metrics = this.componentMetrics.get(componentName);
    if (metrics) {
      metrics.errorCount++;
      metrics.isHealthy = false;
      this.componentMetrics.set(componentName, metrics);
    }

    // Detect white screen errors
    if (error.message.includes('Cannot read') || 
        error.message.includes('undefined') ||
        error.message.includes('null')) {
      this.detector.detectPattern('nld-001', {
        component: componentName,
        userAgent: navigator.userAgent,
        url: window.location.href,
        networkState: navigator.onLine ? 'online' : 'offline',
        stackTrace: error.stack
      }, `Component error: ${error.message}`);
    }
  }

  /**
   * Check for white screen by examining DOM
   */
  private checkForWhiteScreen(componentName: string): void {
    const rootElement = document.getElementById('root') || document.body;
    const hasContent = rootElement.textContent?.trim().length || 0;
    const hasVisibleElements = rootElement.querySelectorAll('*').length;

    if (hasContent < 10 && hasVisibleElements < 3) {
      this.detector.detectPattern('nld-001', {
        component: componentName,
        userAgent: navigator.userAgent,
        url: window.location.href,
        networkState: navigator.onLine ? 'online' : 'offline'
      }, `White screen detected: minimal content (${hasContent} chars, ${hasVisibleElements} elements)`);
    }
  }

  /**
   * Calculate component health score
   */
  private calculateComponentHealth(metrics: ComponentMetrics): boolean {
    if (metrics.errorCount > 0) return false;
    if (metrics.averageRenderTime > 50) return false; // Too slow
    if (metrics.memoryLeakScore > 80) return false; // Memory leak risk
    if (metrics.renderCount > 1000 && (Date.now() - metrics.mountTime) < 60000) return false; // Too many renders

    return true;
  }

  /**
   * Get metrics for a specific component
   */
  public getComponentMetrics(componentName: string): ComponentMetrics | null {
    return this.componentMetrics.get(componentName) || null;
  }

  /**
   * Get all component metrics
   */
  public getAllMetrics(): ComponentMetrics[] {
    return Array.from(this.componentMetrics.values());
  }

  /**
   * Get unhealthy components
   */
  public getUnhealthyComponents(): ComponentMetrics[] {
    return this.getAllMetrics().filter(metrics => !metrics.isHealthy);
  }

  /**
   * Cleanup component when unmounting
   */
  public unregisterComponent(componentName: string): void {
    this.componentMetrics.delete(componentName);
    this.componentRenderTimes.delete(componentName);
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    if (this.renderObserver) {
      this.renderObserver.disconnect();
      this.renderObserver = undefined;
    }

    if (this.whiteScreenTimer) {
      clearTimeout(this.whiteScreenTimer);
      this.whiteScreenTimer = undefined;
    }

    this.componentMetrics.clear();
    this.componentRenderTimes.clear();
  }
}

/**
 * React Hook for Component-Level NLD Monitoring
 * Use this in components you want to monitor for failure patterns
 */
export function useNLDComponentMonitoring(
  componentName: string,
  detector?: NLDPatternDetector
): {
  metrics: ComponentMetrics | null;
  recordRender: (renderTime?: number) => void;
  recordError: (error: Error) => void;
  isHealthy: boolean;
} {
  const [metrics, setMetrics] = useState<ComponentMetrics | null>(null);
  const watcherRef = useRef<NLDComponentWatcher | null>(null);
  const renderStartTime = useRef<number>(0);

  // Initialize watcher
  useEffect(() => {
    if (!detector) return;

    watcherRef.current = new NLDComponentWatcher(detector);
    const initialMetrics = watcherRef.current.registerComponent(componentName);
    setMetrics(initialMetrics);

    return () => {
      watcherRef.current?.unregisterComponent(componentName);
      watcherRef.current?.dispose();
      watcherRef.current = null;
    };
  }, [componentName, detector]);

  // Record render start time
  useEffect(() => {
    renderStartTime.current = performance.now();
  });

  // Record render completion
  const recordRender = useCallback((renderTime?: number) => {
    if (!watcherRef.current) return;

    const actualRenderTime = renderTime || (performance.now() - renderStartTime.current);
    watcherRef.current.onComponentRender(componentName, actualRenderTime);
    
    const updatedMetrics = watcherRef.current.getComponentMetrics(componentName);
    setMetrics(updatedMetrics);
  }, [componentName]);

  // Record component error
  const recordError = useCallback((error: Error) => {
    if (!watcherRef.current) return;

    watcherRef.current.onComponentError(componentName, error);
    
    const updatedMetrics = watcherRef.current.getComponentMetrics(componentName);
    setMetrics(updatedMetrics);
  }, [componentName]);

  return {
    metrics,
    recordRender,
    recordError,
    isHealthy: metrics?.isHealthy ?? true
  };
}

/**
 * Higher-Order Component for automatic NLD monitoring
 */
export function withNLDMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  return React.forwardRef<any, P>((props, ref) => {
    const actualComponentName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'UnknownComponent';
    const { recordRender, recordError } = useNLDComponentMonitoring(actualComponentName);

    // Wrap component in error boundary
    useEffect(() => {
      recordRender();
    });

    try {
      return React.createElement(WrappedComponent, { ...props, ref });
    } catch (error) {
      recordError(error as Error);
      throw error; // Re-throw to maintain normal error handling
    }
  });
}

export default NLDComponentWatcher;