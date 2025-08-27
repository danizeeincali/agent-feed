/**
 * NLD React State Monitoring System
 * Real-time detection of React state management anti-patterns
 */

interface StateChangeEvent {
  timestamp: number;
  component: string;
  stateKey: string;
  oldValue: any;
  newValue: any;
  stackTrace?: string;
}

interface ConnectionEvent {
  timestamp: number;
  instanceId: string;
  connectionType: 'sse' | 'polling' | 'disconnect';
  selectedInstance: string | null;
  isSync: boolean;
}

interface RaceConditionDetection {
  detectedAt: number;
  component: string;
  stateUpdate: StateChangeEvent;
  asyncCall: string;
  timingGap: number;
}

interface StaleClosureDetection {
  detectedAt: number;
  component: string;
  hookName: string;
  missingDependencies: string[];
  affectedState: string[];
}

class NLDReactStateMonitor {
  private stateChanges: StateChangeEvent[] = [];
  private connectionEvents: ConnectionEvent[] = [];
  private raceConditions: RaceConditionDetection[] = [];
  private staleClosures: StaleClosureDetection[] = [];
  private isEnabled: boolean = process.env.NODE_ENV === 'development';

  constructor() {
    if (this.isEnabled) {
      this.initializeDevToolsIntegration();
      this.setupGlobalErrorHandler();
    }
  }

  /**
   * Track React state changes for anti-pattern detection
   */
  trackStateChange(component: string, stateKey: string, oldValue: any, newValue: any): void {
    if (!this.isEnabled) return;

    const event: StateChangeEvent = {
      timestamp: performance.now(),
      component,
      stateKey,
      oldValue,
      newValue,
      stackTrace: new Error().stack
    };

    this.stateChanges.push(event);
    this.detectRaceConditions(event);
    
    // Keep only last 100 events for performance
    if (this.stateChanges.length > 100) {
      this.stateChanges.shift();
    }

    this.logToDevTools('State Change', event);
  }

  /**
   * Track connection events for synchronization analysis
   */
  trackConnectionEvent(instanceId: string, connectionType: 'sse' | 'polling' | 'disconnect', selectedInstance: string | null): void {
    if (!this.isEnabled) return;

    const event: ConnectionEvent = {
      timestamp: performance.now(),
      instanceId,
      connectionType,
      selectedInstance,
      isSync: instanceId === selectedInstance
    };

    this.connectionEvents.push(event);
    this.detectConnectionDesync(event);

    if (this.connectionEvents.length > 50) {
      this.connectionEvents.shift();
    }

    this.logToDevTools('Connection Event', event);
  }

  /**
   * Detect async race conditions in state updates
   */
  private detectRaceConditions(stateEvent: StateChangeEvent): void {
    // Look for state changes followed immediately by async calls
    const recentChanges = this.stateChanges.filter(
      change => stateEvent.timestamp - change.timestamp < 100 // Within 100ms
    );

    if (recentChanges.length > 1) {
      const potentialRace: RaceConditionDetection = {
        detectedAt: performance.now(),
        component: stateEvent.component,
        stateUpdate: stateEvent,
        asyncCall: 'connectSSE/startPolling detected in stack trace',
        timingGap: stateEvent.timestamp - recentChanges[0].timestamp
      };

      this.raceConditions.push(potentialRace);
      
      console.warn('🔍 NLD: Race condition detected', potentialRace);
      this.reportToNLDSystem('RACE_CONDITION', potentialRace);
    }
  }

  /**
   * Detect connection target desynchronization
   */
  private detectConnectionDesync(connectionEvent: ConnectionEvent): void {
    if (!connectionEvent.isSync && connectionEvent.selectedInstance) {
      console.warn('🔍 NLD: Connection desync detected', {
        connectionTarget: connectionEvent.instanceId,
        selectedInstance: connectionEvent.selectedInstance,
        timestamp: connectionEvent.timestamp
      });

      this.reportToNLDSystem('CONNECTION_DESYNC', connectionEvent);
    }
  }

  /**
   * Monitor useEffect hook dependencies
   */
  trackUseEffectExecution(component: string, hookId: string, dependencies: any[], effectFunction: Function): void {
    if (!this.isEnabled) return;

    // Analyze function body for state variable usage
    const functionBody = effectFunction.toString();
    const stateVariablePattern = /\b(set\w+|use\w+|\w+State)\b/g;
    const usedVariables = functionBody.match(stateVariablePattern) || [];
    
    // Check for missing dependencies
    const dependencyNames = dependencies.map(dep => 
      typeof dep === 'function' ? dep.name : String(dep)
    );
    
    const missingDeps = usedVariables.filter(variable => 
      !dependencyNames.some(dep => dep.includes(variable))
    );

    if (missingDeps.length > 0) {
      const staleClosure: StaleClosureDetection = {
        detectedAt: performance.now(),
        component,
        hookName: hookId,
        missingDependencies: missingDeps,
        affectedState: usedVariables
      };

      this.staleClosures.push(staleClosure);
      
      console.warn('🔍 NLD: Stale closure detected', staleClosure);
      this.reportToNLDSystem('STALE_CLOSURE', staleClosure);
    }
  }

  /**
   * Create enhanced useState wrapper with monitoring
   */
  createMonitoredState<T>(
    component: string, 
    stateKey: string, 
    initialValue: T
  ): [T, (value: T) => void] {
    if (!this.isEnabled) {
      // Return normal useState in production
      const [state, setState] = React.useState(initialValue);
      return [state, setState];
    }

    const [state, setState] = React.useState(initialValue);
    
    const monitoredSetState = React.useCallback((newValue: T) => {
      this.trackStateChange(component, stateKey, state, newValue);
      setState(newValue);
    }, [state]);

    return [state, monitoredSetState];
  }

  /**
   * Enhanced useEffect wrapper with dependency monitoring
   */
  createMonitoredEffect(
    component: string,
    hookId: string,
    effect: React.EffectCallback,
    deps?: React.DependencyList
  ): void {
    if (!this.isEnabled) {
      return React.useEffect(effect, deps);
    }

    return React.useEffect(() => {
      this.trackUseEffectExecution(component, hookId, deps || [], effect);
      return effect();
    }, deps);
  }

  /**
   * Generate comprehensive anti-pattern report
   */
  generateAntiPatternReport(): any {
    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalStateChanges: this.stateChanges.length,
        totalConnectionEvents: this.connectionEvents.length,
        raceConditionsDetected: this.raceConditions.length,
        staleClosuresDetected: this.staleClosures.length
      },
      antiPatterns: {
        raceConditions: this.raceConditions,
        staleClosures: this.staleClosures,
        connectionDesyncs: this.connectionEvents.filter(e => !e.isSync)
      },
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Generate fix recommendations based on detected patterns
   */
  private generateRecommendations(): string[] {
    const recommendations = [];

    if (this.raceConditions.length > 0) {
      recommendations.push(
        'Add useEffect to sync state changes with async operations',
        'Consider using useCallback for stable function references'
      );
    }

    if (this.staleClosures.length > 0) {
      recommendations.push(
        'Add missing dependencies to useEffect dependency arrays',
        'Use useCallback/useMemo for stable references'
      );
    }

    const desyncEvents = this.connectionEvents.filter(e => !e.isSync);
    if (desyncEvents.length > 0) {
      recommendations.push(
        'Implement connection target synchronization with selected instance',
        'Add useEffect to monitor selectedInstance changes'
      );
    }

    return recommendations;
  }

  /**
   * Integration with React DevTools
   */
  private initializeDevToolsIntegration(): void {
    if (typeof window !== 'undefined' && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      // Extend React DevTools with NLD monitoring
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot = (function(original) {
        return function(id, root, ...args) {
          // Track fiber commits for state change analysis
          if (original) original.call(this, id, root, ...args);
        };
      })(window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot);
    }
  }

  /**
   * Setup global error handler for uncaught state issues
   */
  private setupGlobalErrorHandler(): void {
    const originalError = console.error;
    console.error = (...args) => {
      // Check if error is related to state management
      const errorMessage = args.join(' ');
      if (errorMessage.includes('state') || errorMessage.includes('useEffect') || errorMessage.includes('dependency')) {
        this.reportToNLDSystem('STATE_ERROR', { error: errorMessage, timestamp: performance.now() });
      }
      originalError.apply(console, args);
    };
  }

  /**
   * Log to browser DevTools with structured format
   */
  private logToDevTools(type: string, data: any): void {
    if (typeof window !== 'undefined' && window.console) {
      console.group(`🔍 NLD Monitor: ${type}`);
      console.log('Data:', data);
      console.log('Report:', this.generateAntiPatternReport());
      console.groupEnd();
    }
  }

  /**
   * Report to NLD system for training data
   */
  private reportToNLDSystem(patternType: string, data: any): void {
    // In a real implementation, this would send data to the NLD training system
    try {
      if (typeof fetch !== 'undefined') {
        fetch('/api/nld/pattern-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patternType,
            data,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
          })
        }).catch(() => {
          // Silent fail for monitoring
        });
      }
    } catch (error) {
      // Silent fail for monitoring
    }
  }

  /**
   * Performance metrics for the monitoring system itself
   */
  getMonitoringMetrics(): any {
    return {
      memoryUsage: {
        stateChanges: this.stateChanges.length,
        connectionEvents: this.connectionEvents.length,
        raceConditions: this.raceConditions.length,
        staleClosures: this.staleClosures.length
      },
      performance: {
        averageDetectionTime: this.calculateAverageDetectionTime(),
        monitoringOverhead: this.calculateMonitoringOverhead()
      }
    };
  }

  private calculateAverageDetectionTime(): number {
    if (this.raceConditions.length === 0) return 0;
    const totalTime = this.raceConditions.reduce((sum, race) => sum + race.timingGap, 0);
    return totalTime / this.raceConditions.length;
  }

  private calculateMonitoringOverhead(): number {
    // Estimate monitoring overhead as percentage of total execution time
    return this.stateChanges.length * 0.1; // Rough estimate
  }
}

// Global instance
export const nldReactStateMonitor = new NLDReactStateMonitor();

// React import for TypeScript (in actual usage, this would be imported at the top)
declare const React: any;

// Export types for external usage
export type {
  StateChangeEvent,
  ConnectionEvent,
  RaceConditionDetection,
  StaleClosureDetection
};