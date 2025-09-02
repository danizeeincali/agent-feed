/**
 * NLD System Integration Component
 * Main integration point for Neuro-Learning Development system
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import FailureDetectionEngine, { FailurePattern } from './core/FailureDetectionEngine';
import AutoRecoverySystem, { RecoveryResult } from './core/AutoRecoverySystem';
import UserFeedbackCapture, { UserFeedback } from './core/UserFeedbackCapture';
import CacheInvalidationSystem from './core/CacheInvalidationSystem';

export interface NLDSystemProps {
  claudeInstanceManager?: any;
  webSocketManager?: any;
  stateManager?: any;
  notificationSystem?: any;
  onFailureDetected?: (pattern: FailurePattern) => void;
  onRecoveryExecuted?: (result: RecoveryResult) => void;
  onUserFeedback?: (feedback: UserFeedback) => void;
  enabled?: boolean;
  debug?: boolean;
}

export interface NLDSystemRef {
  detectFailure: (type: string, context: any) => FailurePattern | null;
  executeRecovery: (pattern: FailurePattern) => Promise<RecoveryResult>;
  captureUserFeedback: (input: string, context?: any) => UserFeedback | null;
  invalidateCache: (context: any) => string[];
  exportTrainingData: () => any;
  getSystemStats: () => any;
}

const NLDSystem = React.forwardRef<NLDSystemRef, NLDSystemProps>(({
  claudeInstanceManager,
  webSocketManager,
  stateManager,
  notificationSystem,
  onFailureDetected,
  onRecoveryExecuted,
  onUserFeedback,
  enabled = true,
  debug = false
}, ref) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [systemStats, setSystemStats] = useState<any>({});
  
  const detectionEngineRef = useRef<FailureDetectionEngine>();
  const recoverySystemRef = useRef<AutoRecoverySystem>();
  const feedbackCaptureRef = useRef<UserFeedbackCapture>();
  const cacheSystemRef = useRef<CacheInvalidationSystem>();

  /**
   * Initialize NLD system
   */
  useEffect(() => {
    if (!enabled) return;

    console.log('NLD: Initializing Neuro-Learning Development system');

    // Initialize core systems
    detectionEngineRef.current = new FailureDetectionEngine();
    cacheSystemRef.current = new CacheInvalidationSystem();
    feedbackCaptureRef.current = new UserFeedbackCapture();
    
    // Initialize recovery system with context
    recoverySystemRef.current = new AutoRecoverySystem({
      claudeInstanceManager,
      webSocketManager,
      stateManager,
      notificationSystem
    });

    // Setup system integrations
    setupFailureDetectionIntegration();
    setupRecoveryIntegration();
    setupFeedbackIntegration();
    setupCacheIntegration();
    setupEventListeners();

    // Start monitoring
    feedbackCaptureRef.current.startListening();

    setIsInitialized(true);
    console.log('NLD: System initialization complete');

    return () => {
      cleanup();
    };
  }, [enabled, claudeInstanceManager, webSocketManager, stateManager, notificationSystem]);

  /**
   * Setup failure detection integration
   */
  const setupFailureDetectionIntegration = useCallback(() => {
    if (!detectionEngineRef.current) return;

    detectionEngineRef.current.addListener((pattern) => {
      if (debug) {
        console.log('NLD: Failure pattern detected', pattern);
      }

      // Trigger automatic recovery
      if (recoverySystemRef.current && pattern.confidence > 0.6) {
        recoverySystemRef.current.executeRecovery(pattern).then(result => {
          if (debug) {
            console.log('NLD: Auto-recovery result', result);
          }
          
          if (onRecoveryExecuted) {
            onRecoveryExecuted(result);
          }
        });
      }

      // Trigger cache invalidation
      if (cacheSystemRef.current) {
        cacheSystemRef.current.invalidate({
          failurePattern: pattern,
          trigger: 'failure_detected'
        });
      }

      if (onFailureDetected) {
        onFailureDetected(pattern);
      }
    });
  }, [debug, onFailureDetected, onRecoveryExecuted]);

  /**
   * Setup recovery system integration
   */
  const setupRecoveryIntegration = useCallback(() => {
    if (!recoverySystemRef.current) return;

    // Update context when managers change
    recoverySystemRef.current.updateContext({
      claudeInstanceManager,
      webSocketManager,
      stateManager,
      notificationSystem
    });
  }, [claudeInstanceManager, webSocketManager, stateManager, notificationSystem]);

  /**
   * Setup feedback capture integration
   */
  const setupFeedbackIntegration = useCallback(() => {
    if (!feedbackCaptureRef.current) return;

    feedbackCaptureRef.current.addListener((feedback) => {
      if (debug) {
        console.log('NLD: User feedback captured', feedback);
      }

      // Update failure detection with feedback
      if (detectionEngineRef.current) {
        detectionEngineRef.current.captureUserFeedback(
          feedback.rawInput,
          feedback.feedback,
          feedback.context
        );
      }

      // Trigger cache invalidation based on negative feedback
      if (feedback.sentiment === 'negative' && cacheSystemRef.current) {
        cacheSystemRef.current.invalidate({
          userFeedback: feedback,
          trigger: 'user_feedback'
        });
      }

      if (onUserFeedback) {
        onUserFeedback(feedback);
      }
    });
  }, [debug, onUserFeedback]);

  /**
   * Setup cache invalidation integration
   */
  const setupCacheIntegration = useCallback(() => {
    if (!cacheSystemRef.current) return;

    // Pre-populate cache with common patterns
    cacheSystemRef.current.set('claude_instances', null, {
      tags: ['instance', 'critical'],
      ttl: 5 * 60 * 1000 // 5 minutes
    });

    cacheSystemRef.current.set('connection_states', null, {
      tags: ['connection', 'critical'],
      ttl: 2 * 60 * 1000, // 2 minutes
      dependsOn: ['claude_instances']
    });

    cacheSystemRef.current.set('component_states', null, {
      tags: ['component'],
      ttl: 10 * 60 * 1000, // 10 minutes
      dependsOn: ['connection_states']
    });
  }, []);

  /**
   * Setup global event listeners for system monitoring
   */
  const setupEventListeners = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Listen for WebSocket connection errors
    const handleWebSocketError = (event: any) => {
      if (detectionEngineRef.current) {
        const pattern = detectionEngineRef.current.detectConnectionMismatch(
          event.detail?.instanceId || 'unknown',
          event.detail?.availableInstances || [],
          'websocket_error'
        );
        
        if (pattern && debug) {
          console.log('NLD: WebSocket error pattern detected', pattern);
        }
      }
    };

    // Listen for Claude instance errors
    const handleClaudeInstanceError = (event: any) => {
      if (detectionEngineRef.current) {
        const pattern = detectionEngineRef.current.detectStaleInstancePattern(
          event.detail?.frontendInstanceId || '',
          event.detail?.backendInstances || [],
          event.detail?.errorMessage
        );
        
        if (pattern && debug) {
          console.log('NLD: Claude instance error pattern detected', pattern);
        }
      }
    };

    // Listen for manual recovery triggers
    const handleManualRecovery = (event: any) => {
      if (recoverySystemRef.current) {
        const { pattern, strategy } = event.detail;
        recoverySystemRef.current.executeRecovery(pattern).then(result => {
          if (debug) {
            console.log('NLD: Manual recovery executed', result);
          }
        });
      }
    };

    // Listen for cache refresh requests
    const handleCacheRefresh = (event: any) => {
      if (cacheSystemRef.current) {
        const context = event.detail || {};
        cacheSystemRef.current.smartRefresh({
          trigger: 'manual',
          ...context
        });
      }
    };

    // Add event listeners
    window.addEventListener('websocket:error', handleWebSocketError);
    window.addEventListener('claude:instance_error', handleClaudeInstanceError);
    window.addEventListener('nld:manual_recovery', handleManualRecovery);
    window.addEventListener('nld:cache_refresh', handleCacheRefresh);

    return () => {
      window.removeEventListener('websocket:error', handleWebSocketError);
      window.removeEventListener('claude:instance_error', handleClaudeInstanceError);
      window.removeEventListener('nld:manual_recovery', handleManualRecovery);
      window.removeEventListener('nld:cache_refresh', handleCacheRefresh);
    };
  }, [debug]);

  /**
   * Cleanup system resources
   */
  const cleanup = useCallback(() => {
    if (feedbackCaptureRef.current) {
      feedbackCaptureRef.current.stopListening();
    }

    console.log('NLD: System cleanup complete');
  }, []);

  /**
   * Update system statistics
   */
  useEffect(() => {
    if (!isInitialized) return;

    const updateStats = () => {
      const stats = {
        detection: {
          patterns: detectionEngineRef.current?.getPatterns().length || 0,
          neuralPatterns: detectionEngineRef.current?.getNeuralPatterns().size || 0
        },
        recovery: {
          history: recoverySystemRef.current?.getRecoveryHistory().length || 0,
          successRate: recoverySystemRef.current?.getSuccessRate() || 0
        },
        feedback: feedbackCaptureRef.current?.getStats() || {},
        cache: cacheSystemRef.current?.getStats() || {}
      };

      setSystemStats(stats);
    };

    updateStats();
    const interval = setInterval(updateStats, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [isInitialized]);

  /**
   * Expose system methods via ref
   */
  React.useImperativeHandle(ref, () => ({
    detectFailure: (type: string, context: any) => {
      if (!detectionEngineRef.current) return null;
      
      switch (type) {
        case 'stale_instance':
          return detectionEngineRef.current.detectStaleInstancePattern(
            context.frontendInstanceId,
            context.backendInstances,
            context.errorMessage
          );
        case 'connection_mismatch':
          return detectionEngineRef.current.detectConnectionMismatch(
            context.attemptedConnection,
            context.availableConnections,
            context.userAction
          );
        default:
          return null;
      }
    },

    executeRecovery: async (pattern: FailurePattern) => {
      if (!recoverySystemRef.current) {
        return { success: false, message: 'Recovery system not initialized' };
      }
      return recoverySystemRef.current.executeRecovery(pattern);
    },

    captureUserFeedback: (input: string, context: any = {}) => {
      if (!feedbackCaptureRef.current) return null;
      return feedbackCaptureRef.current.captureInput(input, context);
    },

    invalidateCache: (context: any) => {
      if (!cacheSystemRef.current) return [];
      return cacheSystemRef.current.invalidate(context);
    },

    exportTrainingData: () => {
      return {
        detection: detectionEngineRef.current?.exportTrainingData(),
        feedback: feedbackCaptureRef.current?.exportForTraining(),
        recovery: recoverySystemRef.current?.getRecoveryHistory(),
        cache: cacheSystemRef.current?.exportData(),
        stats: systemStats,
        exportTime: Date.now()
      };
    },

    getSystemStats: () => systemStats
  }), [systemStats]);

  // Debug UI (only shown when debug is enabled)
  if (debug && isInitialized) {
    return (
      <div 
        style={{ 
          position: 'fixed', 
          top: 10, 
          right: 10, 
          background: 'rgba(0,0,0,0.8)', 
          color: 'white', 
          padding: '10px', 
          borderRadius: '5px',
          fontSize: '12px',
          maxWidth: '300px',
          zIndex: 9999
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>NLD System Debug</div>
        <div>Patterns: {systemStats.detection?.patterns || 0}</div>
        <div>Neural Patterns: {systemStats.detection?.neuralPatterns || 0}</div>
        <div>Recovery Success Rate: {((systemStats.recovery?.successRate || 0) * 100).toFixed(1)}%</div>
        <div>Feedback Items: {systemStats.feedback?.total || 0}</div>
        <div>Cache Size: {systemStats.cache?.size || 0}</div>
      </div>
    );
  }

  return null; // System runs invisibly when not in debug mode
});

NLDSystem.displayName = 'NLDSystem';

export default NLDSystem;