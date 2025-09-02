/**
 * NLD Integration Hook
 * React hook for integrating NLD system with components
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { FailurePattern } from '../core/FailureDetectionEngine';
import { RecoveryResult } from '../core/AutoRecoverySystem';
import { UserFeedback } from '../core/UserFeedbackCapture';

export interface NLDIntegrationOptions {
  enabled?: boolean;
  debug?: boolean;
  autoRecovery?: boolean;
  feedbackCapture?: boolean;
  cacheManagement?: boolean;
  componentName?: string;
}

export interface NLDIntegrationState {
  isActive: boolean;
  lastFailure?: FailurePattern;
  lastRecovery?: RecoveryResult;
  lastFeedback?: UserFeedback;
  recoveryInProgress: boolean;
  stats: {
    failuresDetected: number;
    recoveriesExecuted: number;
    feedbackCaptured: number;
    cacheInvalidations: number;
  };
}

export interface NLDIntegrationMethods {
  reportFailure: (type: string, context: any) => void;
  reportSuccess: (context?: any) => void;
  reportUserInput: (input: string, context?: any) => void;
  triggerRecovery: (pattern?: FailurePattern) => Promise<RecoveryResult | null>;
  invalidateCache: (tags?: string[]) => void;
  getTrainingData: () => any;
  resetStats: () => void;
}

/**
 * Hook for integrating NLD system with React components
 */
export function useNLDIntegration(options: NLDIntegrationOptions = {}): {
  state: NLDIntegrationState;
  methods: NLDIntegrationMethods;
  isReady: boolean;
} {
  const {
    enabled = true,
    debug = false,
    autoRecovery = true,
    feedbackCapture = true,
    cacheManagement = true,
    componentName = 'unknown'
  } = options;

  const [state, setState] = useState<NLDIntegrationState>({
    isActive: false,
    recoveryInProgress: false,
    stats: {
      failuresDetected: 0,
      recoveriesExecuted: 0,
      feedbackCaptured: 0,
      cacheInvalidations: 0
    }
  });

  const [isReady, setIsReady] = useState(false);
  const nldSystemRef = useRef<any>(null);

  /**
   * Initialize NLD integration
   */
  useEffect(() => {
    if (!enabled) return;

    // Wait for NLD system to be available
    const checkNLDSystem = () => {
      // Look for NLD system in global context or via event
      const event = new CustomEvent('nld:request_system');
      window.dispatchEvent(event);
    };

    // Listen for NLD system availability
    const handleNLDSystemAvailable = (event: any) => {
      nldSystemRef.current = event.detail.system;
      setIsReady(true);
      setState(prev => ({ ...prev, isActive: true }));
      
      if (debug) {
        console.log(`NLD Integration: ${componentName} connected to NLD system`);
      }
    };

    window.addEventListener('nld:system_available', handleNLDSystemAvailable);
    checkNLDSystem();

    return () => {
      window.removeEventListener('nld:system_available', handleNLDSystemAvailable);
    };
  }, [enabled, debug, componentName]);

  /**
   * Setup event listeners for NLD events
   */
  useEffect(() => {
    if (!isReady || !enabled) return;

    const handleFailureDetected = (event: any) => {
      const pattern = event.detail;
      setState(prev => ({
        ...prev,
        lastFailure: pattern,
        stats: {
          ...prev.stats,
          failuresDetected: prev.stats.failuresDetected + 1
        }
      }));

      if (debug) {
        console.log(`NLD Integration: ${componentName} detected failure`, pattern);
      }
    };

    const handleRecoveryExecuted = (event: any) => {
      const result = event.detail.result;
      setState(prev => ({
        ...prev,
        lastRecovery: result,
        recoveryInProgress: false,
        stats: {
          ...prev.stats,
          recoveriesExecuted: prev.stats.recoveriesExecuted + 1
        }
      }));

      if (debug) {
        console.log(`NLD Integration: ${componentName} recovery executed`, result);
      }
    };

    const handleUserFeedback = (event: any) => {
      const feedback = event.detail;
      setState(prev => ({
        ...prev,
        lastFeedback: feedback,
        stats: {
          ...prev.stats,
          feedbackCaptured: prev.stats.feedbackCaptured + 1
        }
      }));

      if (debug) {
        console.log(`NLD Integration: ${componentName} captured feedback`, feedback);
      }
    };

    const handleCacheInvalidated = (event: any) => {
      setState(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          cacheInvalidations: prev.stats.cacheInvalidations + 1
        }
      }));

      if (debug) {
        console.log(`NLD Integration: ${componentName} cache invalidated`, event.detail);
      }
    };

    window.addEventListener('nld:failure_detected', handleFailureDetected);
    window.addEventListener('nld:recovery_result', handleRecoveryExecuted);
    window.addEventListener('nld:user_feedback', handleUserFeedback);
    window.addEventListener('nld:cache_invalidated', handleCacheInvalidated);

    return () => {
      window.removeEventListener('nld:failure_detected', handleFailureDetected);
      window.removeEventListener('nld:recovery_result', handleRecoveryExecuted);
      window.removeEventListener('nld:user_feedback', handleUserFeedback);
      window.removeEventListener('nld:cache_invalidated', handleCacheInvalidated);
    };
  }, [isReady, enabled, debug, componentName]);

  /**
   * Report failure to NLD system
   */
  const reportFailure = useCallback((type: string, context: any) => {
    if (!isReady || !nldSystemRef.current) return;

    const enhancedContext = {
      ...context,
      component: componentName,
      timestamp: Date.now()
    };

    try {
      const pattern = nldSystemRef.current.detectFailure(type, enhancedContext);
      
      if (pattern && debug) {
        console.log(`NLD Integration: ${componentName} reported failure`, { type, context: enhancedContext, pattern });
      }

      // Trigger auto-recovery if enabled
      if (pattern && autoRecovery) {
        setState(prev => ({ ...prev, recoveryInProgress: true }));
        nldSystemRef.current.executeRecovery(pattern);
      }

    } catch (error) {
      console.error(`NLD Integration: ${componentName} failed to report failure`, error);
    }
  }, [isReady, componentName, debug, autoRecovery]);

  /**
   * Report success to NLD system
   */
  const reportSuccess = useCallback((context: any = {}) => {
    if (!isReady || !feedbackCapture) return;

    const successMessage = `${componentName} operation successful`;
    const enhancedContext = {
      ...context,
      component: componentName,
      timestamp: Date.now(),
      result: 'success'
    };

    try {
      if (nldSystemRef.current) {
        nldSystemRef.current.captureUserFeedback(successMessage, enhancedContext);
      }

      if (debug) {
        console.log(`NLD Integration: ${componentName} reported success`, enhancedContext);
      }
    } catch (error) {
      console.error(`NLD Integration: ${componentName} failed to report success`, error);
    }
  }, [isReady, feedbackCapture, componentName, debug]);

  /**
   * Report user input to NLD system
   */
  const reportUserInput = useCallback((input: string, context: any = {}) => {
    if (!isReady || !feedbackCapture || !nldSystemRef.current) return;

    const enhancedContext = {
      ...context,
      component: componentName,
      timestamp: Date.now()
    };

    try {
      nldSystemRef.current.captureUserFeedback(input, enhancedContext);

      if (debug) {
        console.log(`NLD Integration: ${componentName} captured user input`, { input, context: enhancedContext });
      }
    } catch (error) {
      console.error(`NLD Integration: ${componentName} failed to capture user input`, error);
    }
  }, [isReady, feedbackCapture, componentName, debug]);

  /**
   * Trigger recovery manually
   */
  const triggerRecovery = useCallback(async (pattern?: FailurePattern): Promise<RecoveryResult | null> => {
    if (!isReady || !nldSystemRef.current) {
      return { success: false, message: 'NLD system not ready' };
    }

    if (!pattern && !state.lastFailure) {
      return { success: false, message: 'No failure pattern to recover from' };
    }

    try {
      setState(prev => ({ ...prev, recoveryInProgress: true }));

      const result = await nldSystemRef.current.executeRecovery(pattern || state.lastFailure);

      if (debug) {
        console.log(`NLD Integration: ${componentName} manual recovery executed`, result);
      }

      return result;

    } catch (error) {
      console.error(`NLD Integration: ${componentName} manual recovery failed`, error);
      
      setState(prev => ({ ...prev, recoveryInProgress: false }));
      
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }, [isReady, componentName, debug, state.lastFailure]);

  /**
   * Invalidate cache
   */
  const invalidateCache = useCallback((tags?: string[]) => {
    if (!isReady || !cacheManagement || !nldSystemRef.current) return;

    const context = {
      trigger: 'manual',
      component: componentName,
      tags: tags || [`component:${componentName}`],
      timestamp: Date.now()
    };

    try {
      nldSystemRef.current.invalidateCache(context);

      if (debug) {
        console.log(`NLD Integration: ${componentName} invalidated cache`, context);
      }
    } catch (error) {
      console.error(`NLD Integration: ${componentName} failed to invalidate cache`, error);
    }
  }, [isReady, cacheManagement, componentName, debug]);

  /**
   * Get training data
   */
  const getTrainingData = useCallback(() => {
    if (!isReady || !nldSystemRef.current) return null;

    try {
      const data = nldSystemRef.current.exportTrainingData();
      
      return {
        ...data,
        component: componentName,
        integrationStats: state.stats
      };
    } catch (error) {
      console.error(`NLD Integration: ${componentName} failed to export training data`, error);
      return null;
    }
  }, [isReady, componentName, state.stats]);

  /**
   * Reset statistics
   */
  const resetStats = useCallback(() => {
    setState(prev => ({
      ...prev,
      stats: {
        failuresDetected: 0,
        recoveriesExecuted: 0,
        feedbackCaptured: 0,
        cacheInvalidations: 0
      }
    }));

    if (debug) {
      console.log(`NLD Integration: ${componentName} reset statistics`);
    }
  }, [componentName, debug]);

  const methods: NLDIntegrationMethods = {
    reportFailure,
    reportSuccess,
    reportUserInput,
    triggerRecovery,
    invalidateCache,
    getTrainingData,
    resetStats
  };

  return {
    state,
    methods,
    isReady
  };
}

/**
 * Hook specifically for Claude instance management integration
 */
export function useNLDClaudeInstance(instanceManager?: any) {
  const nld = useNLDIntegration({
    componentName: 'ClaudeInstanceManager',
    enabled: true,
    debug: true // Enable debug for development
  });

  /**
   * Report stale instance detection
   */
  const reportStaleInstance = useCallback((frontendId: string, backendInstances: string[], errorMessage?: string) => {
    nld.methods.reportFailure('stale_instance', {
      frontendInstanceId: frontendId,
      backendInstances,
      errorMessage,
      instanceManager: !!instanceManager
    });
  }, [nld.methods, instanceManager]);

  /**
   * Report connection success
   */
  const reportConnectionSuccess = useCallback((instanceId: string) => {
    nld.methods.reportSuccess({
      instanceId,
      action: 'connection_established'
    });
  }, [nld.methods]);

  /**
   * Report connection failure
   */
  const reportConnectionFailure = useCallback((instanceId: string, error: string) => {
    nld.methods.reportFailure('connection_mismatch', {
      attemptedConnection: instanceId,
      errorMessage: error,
      action: 'connection_attempt'
    });
  }, [nld.methods]);

  return {
    ...nld,
    reportStaleInstance,
    reportConnectionSuccess,
    reportConnectionFailure
  };
}

export default useNLDIntegration;