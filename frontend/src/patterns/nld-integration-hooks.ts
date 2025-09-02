/**
 * NLD Integration Hooks
 * 
 * React hooks for seamless integration of NLD pattern detection
 * with existing Claude instance management components.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { 
  captureInstanceSyncFailure, 
  validateInstanceOperation, 
  getNLDMetrics,
  nldInstanceSync 
} from './nld-instance-sync-patterns';

// ==================== TYPES ====================

interface NLDHookState {
  isMonitoring: boolean;
  lastFailureId: string | null;
  validationResults: ValidationResult | null;
  metrics: any;
}

interface ValidationResult {
  valid: boolean;
  issues: string[];
  recommendations: string[];
  confidence: number;
}

// ==================== MAIN NLD HOOK ====================

/**
 * Primary hook for NLD integration in Claude instance components
 */
export function useNLDInstanceSync(componentName: string) {
  const [state, setState] = useState<NLDHookState>({
    isMonitoring: true,
    lastFailureId: null,
    validationResults: null,
    metrics: null
  });

  const userActionsRef = useRef<string[]>([]);

  // Track user actions
  const trackUserAction = useCallback((action: string) => {
    userActionsRef.current.push(`${new Date().toISOString()}: ${action}`);
    
    // Keep only last 10 actions
    if (userActionsRef.current.length > 10) {
      userActionsRef.current = userActionsRef.current.slice(-10);
    }
  }, []);

  // Capture instance sync failure
  const captureFailure = useCallback(async (
    errorMessage: string,
    frontendState: any,
    backendResponse?: any
  ) => {
    if (!state.isMonitoring) return null;

    try {
      const failureId = await captureInstanceSyncFailure(
        errorMessage,
        frontendState,
        backendResponse,
        componentName,
        userActionsRef.current
      );

      setState(prev => ({
        ...prev,
        lastFailureId: failureId
      }));

      return failureId;
    } catch (error) {
      console.warn('Failed to capture NLD failure:', error);
      return null;
    }
  }, [componentName, state.isMonitoring]);

  // Validate operation before execution
  const validateOperation = useCallback(async (
    operation: 'select' | 'create' | 'connect' | 'send_command',
    instanceId?: string,
    currentState?: any
  ): Promise<ValidationResult> => {
    try {
      const result = await validateInstanceOperation(operation, instanceId, currentState);
      
      setState(prev => ({
        ...prev,
        validationResults: result
      }));

      return result;
    } catch (error) {
      console.warn('Failed to validate operation:', error);
      return {
        valid: false,
        issues: ['Validation system error'],
        recommendations: ['Check NLD system status'],
        confidence: 0
      };
    }
  }, []);

  // Update metrics periodically
  useEffect(() => {
    const updateMetrics = () => {
      try {
        const metrics = getNLDMetrics();
        setState(prev => ({
          ...prev,
          metrics
        }));
      } catch (error) {
        console.warn('Failed to update NLD metrics:', error);
      }
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    ...state,
    trackUserAction,
    captureFailure,
    validateOperation,
    toggleMonitoring: () => setState(prev => ({ ...prev, isMonitoring: !prev.isMonitoring }))
  };
}

// ==================== SPECIFIC COMPONENT HOOKS ====================

/**
 * Specialized hook for Claude Instance Manager components
 */
export function useNLDClaudeInstanceManager() {
  const nld = useNLDInstanceSync('ClaudeInstanceManager');

  // Enhanced instance selection with NLD validation
  const selectInstanceWithValidation = useCallback(async (
    instanceId: string,
    currentInstances: any[]
  ) => {
    nld.trackUserAction(`Selecting instance: ${instanceId}`);

    const validation = await nld.validateOperation('select', instanceId, {
      instances: currentInstances
    });

    if (!validation.valid) {
      console.warn('NLD Validation failed for instance selection:', validation.issues);
      // Still allow selection but log the issues
    }

    return validation;
  }, [nld]);

  // Enhanced instance creation with tracking
  const createInstanceWithTracking = useCallback(async (command: string) => {
    nld.trackUserAction(`Creating instance with command: ${command}`);

    const validation = await nld.validateOperation('create', undefined, {
      command
    });

    return validation;
  }, [nld]);

  // Enhanced error handling
  const handleInstanceError = useCallback(async (
    error: string,
    frontendState: any,
    backendResponse?: any
  ) => {
    // Capture the failure
    const failureId = await nld.captureFailure(error, frontendState, backendResponse);
    
    // Track the error as a user action
    nld.trackUserAction(`Error occurred: ${error}`);

    return failureId;
  }, [nld]);

  return {
    ...nld,
    selectInstanceWithValidation,
    createInstanceWithTracking,
    handleInstanceError
  };
}

/**
 * Hook for terminal/communication components
 */
export function useNLDTerminalIntegration() {
  const nld = useNLDInstanceSync('Terminal');

  const sendCommandWithValidation = useCallback(async (
    instanceId: string,
    command: string,
    connectionState: any
  ) => {
    nld.trackUserAction(`Sending command to ${instanceId}: ${command}`);

    const validation = await nld.validateOperation('send_command', instanceId, {
      websocketConnected: connectionState.connected,
      connectionType: connectionState.type
    });

    return validation;
  }, [nld]);

  const handleConnectionFailure = useCallback(async (
    error: string,
    instanceId: string,
    connectionState: any
  ) => {
    return await nld.captureFailure(error, {
      selectedInstance: instanceId,
      connectionStatus: connectionState.type
    });
  }, [nld]);

  return {
    ...nld,
    sendCommandWithValidation,
    handleConnectionFailure
  };
}

// ==================== NLD MONITORING HOOKS ====================

/**
 * Hook for NLD system monitoring and analytics
 */
export function useNLDMonitoring() {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const refreshAnalytics = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const metrics = getNLDMetrics();
      const patterns = nldInstanceSync.getPatterns();
      
      const analytics = {
        metrics,
        patterns: patterns.slice(-50), // Last 50 patterns
        trends: calculateTrends(patterns),
        recommendations: generateRecommendations(patterns, metrics)
      };

      setAnalyticsData(analytics);
    } catch (error) {
      console.error('Failed to refresh NLD analytics:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    refreshAnalytics();
    const interval = setInterval(refreshAnalytics, 60000); // Every minute
    return () => clearInterval(interval);
  }, [refreshAnalytics]);

  return {
    analyticsData,
    isAnalyzing,
    refreshAnalytics
  };
}

// ==================== UTILITY FUNCTIONS ====================

function calculateTrends(patterns: any[]) {
  const now = Date.now();
  const hourAgo = now - 3600000;
  const dayAgo = now - 86400000;

  const recentPatterns = patterns.filter(p => p.timestamp > hourAgo);
  const todayPatterns = patterns.filter(p => p.timestamp > dayAgo);

  return {
    lastHour: recentPatterns.length,
    lastDay: todayPatterns.length,
    recoveryRate: patterns.length > 0 
      ? patterns.filter(p => p.recoverySuccessful).length / patterns.length 
      : 0,
    commonFailureTypes: getTopFailureTypes(patterns)
  };
}

function getTopFailureTypes(patterns: any[]) {
  const counts = patterns.reduce((acc, pattern) => {
    acc[pattern.failureType] = (acc[pattern.failureType] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, count]) => ({ type, count }));
}

function generateRecommendations(patterns: any[], metrics: any) {
  const recommendations = [];

  if (metrics.recoveryRate < 0.7) {
    recommendations.push({
      priority: 'high',
      message: 'Recovery rate is below 70%. Consider improving error handling.',
      action: 'Review and enhance recovery strategies'
    });
  }

  const recentFailures = patterns.filter(p => 
    Date.now() - p.timestamp < 3600000
  ).length;

  if (recentFailures > 5) {
    recommendations.push({
      priority: 'critical',
      message: `${recentFailures} failures in the last hour indicates a systemic issue.`,
      action: 'Investigate backend health and connection stability'
    });
  }

  if (patterns.length > 100) {
    recommendations.push({
      priority: 'medium',
      message: 'Large pattern database detected.',
      action: 'Consider archiving old patterns and optimizing neural models'
    });
  }

  return recommendations;
}