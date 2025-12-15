/**
 * React Performance Analyzer Hook
 * Comprehensive performance monitoring for React hooks execution timing
 * Identifies state update issues, re-render timing, and batching behavior
 */

import { useRef, useEffect, useCallback, useState } from 'react';

interface HookPerformanceMetrics {
  hookName: string;
  executionTime: number;
  timestamp: number;
  renderCycle: number;
  dependencies?: any[];
  dependencyChanges?: { [key: string]: { old: any; new: any } };
}

interface StateUpdateMetrics {
  stateVariable: string;
  updateTime: number;
  renderTime: number | null;
  batchingDelay: number | null;
  callStack: string;
  successful: boolean;
}

interface ComponentLifecycleMetrics {
  componentName: string;
  mountTime: number;
  firstRenderTime: number;
  rerenderTimes: number[];
  totalRerenders: number;
  memoryUsage?: number;
}

interface PerformanceReport {
  component: string;
  totalAnalysisTime: number;
  hookMetrics: HookPerformanceMetrics[];
  stateMetrics: StateUpdateMetrics[];
  lifecycleMetrics: ComponentLifecycleMetrics;
  issues: PerformanceIssue[];
  recommendations: string[];
}

interface PerformanceIssue {
  type: 'STATE_UPDATE_FAILURE' | 'INFINITE_LOOP' | 'SLOW_HOOKS' | 'MEMORY_LEAK' | 'BATCHING_ISSUE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  evidence: any;
  impact: string;
}

export const useReactPerformanceAnalyzer = (componentName: string = 'Unknown') => {
  const renderCycleRef = useRef(0);
  const startTimeRef = useRef(performance.now());
  const hookMetricsRef = useRef<HookPerformanceMetrics[]>([]);
  const stateMetricsRef = useRef<StateUpdateMetrics[]>([]);
  const lifecycleMetricsRef = useRef<ComponentLifecycleMetrics>({
    componentName,
    mountTime: performance.now(),
    firstRenderTime: 0,
    rerenderTimes: [],
    totalRerenders: 0
  });
  const previousDepsRef = useRef<Map<string, any[]>>(new Map());
  const analysisActiveRef = useRef(true);

  // Increment render cycle on each render
  renderCycleRef.current += 1;
  lifecycleMetricsRef.current.totalRerenders = renderCycleRef.current - 1;
  
  if (renderCycleRef.current === 1) {
    lifecycleMetricsRef.current.firstRenderTime = performance.now() - lifecycleMetricsRef.current.mountTime;
  } else {
    lifecycleMetricsRef.current.rerenderTimes.push(performance.now());
  }

  /**
   * Track hook execution timing and performance
   */
  const trackHookExecution = useCallback(<T>(
    hookFn: () => T,
    hookName: string,
    dependencies?: any[]
  ): T => {
    const startTime = performance.now();
    
    // Analyze dependency changes
    let dependencyChanges: { [key: string]: { old: any; new: any } } = {};
    if (dependencies) {
      const prevDeps = previousDepsRef.current.get(hookName);
      if (prevDeps && prevDeps.length === dependencies.length) {
        dependencies.forEach((dep, index) => {
          if (prevDeps[index] !== dep) {
            dependencyChanges[`dep_${index}`] = {
              old: prevDeps[index],
              new: dep
            };
          }
        });
      }
      previousDepsRef.current.set(hookName, [...dependencies]);
    }

    try {
      const result = hookFn();
      const executionTime = performance.now() - startTime;

      // Record hook metrics
      const metric: HookPerformanceMetrics = {
        hookName,
        executionTime,
        timestamp: performance.now(),
        renderCycle: renderCycleRef.current,
        dependencies: dependencies ? [...dependencies] : undefined,
        dependencyChanges: Object.keys(dependencyChanges).length > 0 ? dependencyChanges : undefined
      };

      hookMetricsRef.current.push(metric);

      // Log detailed hook execution info
      console.log(`🔍 HOOK PERF: ${hookName} executed in ${executionTime.toFixed(3)}ms`, {
        renderCycle: renderCycleRef.current,
        dependencies,
        dependencyChanges,
        component: componentName,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      console.error(`🔍 HOOK ERROR: ${hookName} failed after ${executionTime.toFixed(3)}ms`, {
        error,
        component: componentName,
        renderCycle: renderCycleRef.current
      });
      throw error;
    }
  }, [componentName]);

  /**
   * Track useState updates with timing analysis
   */
  const trackStateUpdate = useCallback(<T>(
    stateVariable: string,
    updateFn: () => void,
    getCurrentValue: () => T
  ): Promise<void> => {
    return new Promise((resolve) => {
      const updateStartTime = performance.now();
      const callStack = new Error().stack?.split('\n').slice(2, 8).join('\n') || 'No stack trace';
      const valueBeforeUpdate = getCurrentValue();

      console.log(`🔍 STATE UPDATE START: ${stateVariable}`, {
        currentValue: valueBeforeUpdate,
        timestamp: new Date().toISOString(),
        renderCycle: renderCycleRef.current,
        callStack
      });

      // Execute the state update
      updateFn();

      // Use setTimeout to check if re-render occurred
      setTimeout(() => {
        const renderTime = performance.now();
        const valueAfterUpdate = getCurrentValue();
        const batchingDelay = renderTime - updateStartTime;
        const successful = valueBeforeUpdate !== valueAfterUpdate;

        console.log(`🔍 STATE UPDATE RESULT: ${stateVariable}`, {
          successful,
          valueBeforeUpdate,
          valueAfterUpdate,
          batchingDelay: batchingDelay.toFixed(3) + 'ms',
          renderTime: renderTime.toFixed(3),
          callStack
        });

        const metric: StateUpdateMetrics = {
          stateVariable,
          updateTime: updateStartTime,
          renderTime: successful ? renderTime : null,
          batchingDelay: successful ? batchingDelay : null,
          callStack,
          successful
        };

        stateMetricsRef.current.push(metric);
        resolve();
      }, 0);
    });
  }, []);

  /**
   * Generate comprehensive performance report
   */
  const generateReport = useCallback((): PerformanceReport => {
    const totalAnalysisTime = performance.now() - startTimeRef.current;
    const issues: PerformanceIssue[] = [];
    const recommendations: string[] = [];

    // Analyze hook performance
    const slowHooks = hookMetricsRef.current.filter(h => h.executionTime > 10);
    if (slowHooks.length > 0) {
      issues.push({
        type: 'SLOW_HOOKS',
        severity: 'MEDIUM',
        description: `Found ${slowHooks.length} slow hook executions (>10ms)`,
        evidence: slowHooks,
        impact: 'May cause UI lag and poor user experience'
      });
      recommendations.push('Optimize slow hooks with useMemo or useCallback');
    }

    // Analyze state update issues
    const failedStateUpdates = stateMetricsRef.current.filter(s => !s.successful);
    if (failedStateUpdates.length > 0) {
      issues.push({
        type: 'STATE_UPDATE_FAILURE',
        severity: 'CRITICAL',
        description: `${failedStateUpdates.length} state updates failed to trigger re-renders`,
        evidence: failedStateUpdates,
        impact: 'UI not updating when state changes, causing stale UI and user confusion'
      });
      recommendations.push('Check for stale closures, React batching issues, or incorrect state update patterns');
    }

    // Analyze infinite loops
    const excessiveRerenders = lifecycleMetricsRef.current.totalRerenders;
    if (excessiveRerenders > 20) {
      issues.push({
        type: 'INFINITE_LOOP',
        severity: 'HIGH',
        description: `Excessive re-renders detected: ${excessiveRerenders}`,
        evidence: { totalRerenders: excessiveRerenders, rerenderTimes: lifecycleMetricsRef.current.rerenderTimes },
        impact: 'Performance degradation and potential browser crashes'
      });
      recommendations.push('Check useEffect dependencies and state update patterns to prevent infinite loops');
    }

    // Analyze batching behavior
    const batchingIssues = stateMetricsRef.current.filter(s => s.batchingDelay && s.batchingDelay > 100);
    if (batchingIssues.length > 0) {
      issues.push({
        type: 'BATCHING_ISSUE',
        severity: 'MEDIUM',
        description: `React batching delays detected: ${batchingIssues.length} updates took >100ms`,
        evidence: batchingIssues,
        impact: 'Delayed UI updates and poor perceived performance'
      });
      recommendations.push('Consider using React 18 automatic batching or optimize state update patterns');
    }

    // Memory analysis if available
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      const usedMB = memInfo.usedJSHeapSize / 1024 / 1024;
      lifecycleMetricsRef.current.memoryUsage = usedMB;
      
      if (usedMB > 100) {
        issues.push({
          type: 'MEMORY_LEAK',
          severity: 'HIGH',
          description: `High memory usage detected: ${usedMB.toFixed(1)}MB`,
          evidence: { memoryUsage: usedMB, memoryInfo: memInfo },
          impact: 'Potential memory leaks causing performance degradation'
        });
        recommendations.push('Check for memory leaks in event listeners, timers, or large object references');
      }
    }

    return {
      component: componentName,
      totalAnalysisTime,
      hookMetrics: [...hookMetricsRef.current],
      stateMetrics: [...stateMetricsRef.current],
      lifecycleMetrics: { ...lifecycleMetricsRef.current },
      issues,
      recommendations
    };
  }, [componentName]);

  /**
   * Real-time monitoring effect
   */
  useEffect(() => {
    if (!analysisActiveRef.current) return;

    const monitoringInterval = setInterval(() => {
      // Check for suspicious patterns
      const recentStateUpdates = stateMetricsRef.current.filter(
        s => performance.now() - s.updateTime < 5000 // Last 5 seconds
      );

      const failedUpdates = recentStateUpdates.filter(s => !s.successful);
      if (failedUpdates.length > 0) {
        console.warn(`🔍 PERFORMANCE WARNING: ${failedUpdates.length} failed state updates in last 5 seconds`, {
          component: componentName,
          failedUpdates,
          timestamp: new Date().toISOString()
        });
      }

      // Monitor excessive re-renders
      if (renderCycleRef.current > 50) {
        console.error(`🔍 PERFORMANCE CRITICAL: Excessive re-renders detected (${renderCycleRef.current})`, {
          component: componentName,
          timestamp: new Date().toISOString()
        });
        analysisActiveRef.current = false; // Stop monitoring to prevent further issues
      }
    }, 5000);

    return () => {
      clearInterval(monitoringInterval);
    };
  }, [componentName]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      analysisActiveRef.current = false;
      
      // Generate final report
      if (hookMetricsRef.current.length > 0 || stateMetricsRef.current.length > 0) {
        const finalReport = generateReport();
        console.group(`🔍 FINAL PERFORMANCE REPORT: ${componentName}`);
        console.log('Report:', finalReport);
        console.groupEnd();
      }
    };
  }, [componentName, generateReport]);

  return {
    trackHookExecution,
    trackStateUpdate,
    generateReport,
    getCurrentMetrics: () => ({
      renderCycle: renderCycleRef.current,
      hookCount: hookMetricsRef.current.length,
      stateUpdateCount: stateMetricsRef.current.length,
      analysisTime: performance.now() - startTimeRef.current
    }),
    isAnalyzing: analysisActiveRef.current
  };
};

/**
 * Enhanced useState with performance tracking
 */
export const useTrackedState = <T>(
  initialValue: T,
  stateName: string,
  componentName: string = 'Unknown'
): [T, (value: T | ((prev: T) => T)) => void] => {
  const analyzer = useReactPerformanceAnalyzer(componentName);
  const [state, setState] = useState(initialValue);

  const trackedSetState = useCallback((value: T | ((prev: T) => T)) => {
    analyzer.trackStateUpdate(
      stateName,
      () => setState(value),
      () => state
    );
  }, [analyzer, stateName, state]);

  return [state, trackedSetState];
};

/**
 * Enhanced useEffect with performance tracking
 */
export const useTrackedEffect = (
  effect: React.EffectCallback,
  deps: React.DependencyList | undefined,
  effectName: string,
  componentName: string = 'Unknown'
) => {
  const analyzer = useReactPerformanceAnalyzer(componentName);

  return useEffect(() => {
    return analyzer.trackHookExecution(() => {
      const cleanup = effect();
      return cleanup;
    }, `useEffect_${effectName}`, deps);
  }, deps);
};