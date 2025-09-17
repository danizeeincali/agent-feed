/**
 * Analytics Monitoring Integration - Production Error Pattern Capture
 * Integrates AnalyticsHTTP500Monitor and AnalyticsNLDIntegration with RealAnalytics
 * Provides real-time monitoring for HTTP 500 errors, tab switching failures, and API endpoint failures
 */

import React, { useEffect, useRef, useState } from 'react';
import { NLDCore } from '../../nld/core/NLDCore';
import { AnalyticsHTTP500Monitor, AnalyticsHTTP500Metrics, AnalyticsTabFailure } from '../../nld/monitors/AnalyticsHTTP500Monitor';
import { AnalyticsNLDIntegration, AnalyticsSystemHealth, AnalyticsFailureReport } from '../../nld/integration/AnalyticsNLDIntegration';
import { AlertCircle, Activity, Zap, Shield, TrendingDown, RefreshCw } from 'lucide-react';

export interface AnalyticsMonitoringProps {
  activeTab: string;
  onTabSwitch: (tab: string) => void;
  onErrorDetected: (error: any) => void;
  onRecoveryTriggered: (recovery: any) => void;
}

interface MonitoringState {
  isInitialized: boolean;
  systemHealth: AnalyticsSystemHealth | null;
  recentFailures: AnalyticsFailureReport[];
  tabFailures: { [tabId: string]: AnalyticsTabFailure[] };
  metrics: AnalyticsHTTP500Metrics | null;
  recoveryActive: boolean;
  monitoringActive: boolean;
}

export const AnalyticsMonitoringIntegration: React.FC<AnalyticsMonitoringProps> = ({
  activeTab,
  onTabSwitch,
  onErrorDetected,
  onRecoveryTriggered
}) => {
  const nldCoreRef = useRef<NLDCore | null>(null);
  const http500MonitorRef = useRef<AnalyticsHTTP500Monitor | null>(null);
  const nldIntegrationRef = useRef<AnalyticsNLDIntegration | null>(null);

  const [monitoringState, setMonitoringState] = useState<MonitoringState>({
    isInitialized: false,
    systemHealth: null,
    recentFailures: [],
    tabFailures: {},
    metrics: null,
    recoveryActive: false,
    monitoringActive: false
  });

  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    initializeMonitoring();
    return () => cleanup();
  }, []);

  useEffect(() => {
    // Handle tab switches
    if (http500MonitorRef.current && monitoringState.isInitialized) {
      // The monitor will automatically detect tab switches via DOM observation
      // But we can also notify it directly for immediate response
      http500MonitorRef.current.emit('analytics:manual-tab-switch', {
        previousTab: http500MonitorRef.current.getActiveTab(),
        currentTab: activeTab,
        timestamp: new Date()
      });
    }
  }, [activeTab, monitoringState.isInitialized]);

  const initializeMonitoring = async () => {
    try {
      console.log('🛡️ Initializing Analytics HTTP 500 Monitoring...');

      // Initialize NLD Core
      nldCoreRef.current = new NLDCore({
        enableRealTimeMonitoring: true,
        patternDetectionThreshold: 0.85,
        performanceBaseline: 1000,
        neuralTrainingEnabled: true,
        recoveryMechanismsEnabled: true
      });

      // Initialize AnalyticsHTTP500Monitor
      http500MonitorRef.current = new AnalyticsHTTP500Monitor(nldCoreRef.current);

      // Initialize AnalyticsNLDIntegration
      nldIntegrationRef.current = new AnalyticsNLDIntegration(nldCoreRef.current, {
        enableRealTimeMonitoring: true,
        enableRecoveryStrategies: true,
        enablePreventiveMeasures: true,
        enableCircuitBreakers: true,
        monitoringInterval: 5000,
        recoveryTimeout: 60000,
        failureThreshold: 3,
        tabSpecificMonitoring: true,
        debugMode: debugMode
      });

      setupEventHandlers();

      setMonitoringState(prev => ({
        ...prev,
        isInitialized: true,
        monitoringActive: true
      }));

      console.log('✅ Analytics monitoring fully initialized');

    } catch (error) {
      console.error('❌ Failed to initialize analytics monitoring:', error);
      onErrorDetected({
        type: 'monitoring_initialization_failure',
        error: error.message,
        timestamp: new Date()
      });
    }
  };

  const setupEventHandlers = () => {
    if (!http500MonitorRef.current || !nldIntegrationRef.current) return;

    // HTTP 500 Monitor Events
    http500MonitorRef.current.on('analytics:http500-detected', (event) => {
      handleHTTP500Detected(event);
    });

    http500MonitorRef.current.on('analytics:recovery-triggered', (event) => {
      handleRecoveryTriggered(event);
    });

    http500MonitorRef.current.on('analytics:tab-switched', (event) => {
      handleTabSwitched(event);
    });

    http500MonitorRef.current.on('analytics:recovery-success', (event) => {
      handleRecoverySuccess(event);
    });

    http500MonitorRef.current.on('analytics:recovery-failed', (event) => {
      handleRecoveryFailed(event);
    });

    // NLD Integration Events
    nldIntegrationRef.current.on('analytics:failure-detected', (event) => {
      handleFailureDetected(event);
    });

    nldIntegrationRef.current.on('analytics:recovery-completed', (event) => {
      handleRecoveryCompleted(event);
    });

    nldIntegrationRef.current.on('analytics:circuit-breaker-opened', (event) => {
      handleCircuitBreakerOpened(event);
    });

    nldIntegrationRef.current.on('analytics:health-check', (event) => {
      handleHealthCheck(event);
    });

    nldIntegrationRef.current.on('analytics:metrics-collected', (event) => {
      handleMetricsCollected(event);
    });

    // Setup custom event listeners for recovery actions
    setupCustomEventListeners();
  };

  const setupCustomEventListeners = () => {
    // Listen for analytics recovery events
    window.addEventListener('analytics-fallback-render', handleFallbackRender);
    window.addEventListener('analytics-reload-tab', handleReloadTab);
    window.addEventListener('analytics-refresh-content', handleRefreshContent);
    window.addEventListener('analytics-use-cache', handleUseCache);
    window.addEventListener('analytics-memory-cleanup', handleMemoryCleanup);
  };

  const handleHTTP500Detected = (event: any) => {
    console.error('🚨 HTTP 500 Error Detected:', event);

    setMonitoringState(prev => ({
      ...prev,
      recentFailures: [
        ...prev.recentFailures.slice(-9), // Keep last 10 failures
        {
          id: `failure-${Date.now()}`,
          timestamp: new Date(),
          tabId: event.tabFailure.tabId,
          errorType: event.pattern.type,
          patternId: event.pattern.id,
          severity: event.severity,
          recoveryAttempted: false,
          recoverySuccess: false,
          fallbackUsed: false,
          userImpact: calculateUserImpact(event.severity),
          additionalContext: event
        }
      ]
    }));

    onErrorDetected({
      type: 'http_500_analytics',
      pattern: event.pattern,
      tabFailure: event.tabFailure,
      severity: event.severity,
      timestamp: new Date()
    });
  };

  const handleRecoveryTriggered = (event: any) => {
    console.log('🔄 Recovery Triggered:', event);

    setMonitoringState(prev => ({
      ...prev,
      recoveryActive: true
    }));

    onRecoveryTriggered({
      type: 'analytics_recovery',
      pattern: event.pattern,
      tab: event.tab,
      strategies: event.strategies,
      timestamp: new Date()
    });
  };

  const handleTabSwitched = (event: any) => {
    if (debugMode) {
      console.log('📋 Tab Switched:', event);
    }

    onTabSwitch(event.currentTab);
  };

  const handleRecoverySuccess = (event: any) => {
    console.log('✅ Recovery Success:', event);

    setMonitoringState(prev => ({
      ...prev,
      recoveryActive: false
    }));

    // Update failure report if exists
    updateFailureReportRecovery(event.pattern.id, true, event.recoveryTime);
  };

  const handleRecoveryFailed = (event: any) => {
    console.error('❌ Recovery Failed:', event);

    setMonitoringState(prev => ({
      ...prev,
      recoveryActive: false
    }));

    // Update failure report if exists
    updateFailureReportRecovery(event.pattern.id, false);
  };

  const handleFailureDetected = (event: any) => {
    console.log('📊 NLD Failure Detected:', event);

    setMonitoringState(prev => ({
      ...prev,
      systemHealth: event.systemHealth,
      recentFailures: prev.recentFailures.map(failure =>
        failure.id === event.report.id ? event.report : failure
      )
    }));
  };

  const handleRecoveryCompleted = (event: any) => {
    console.log('🎯 Recovery Completed:', event);

    setMonitoringState(prev => ({
      ...prev,
      systemHealth: event.systemHealth,
      recoveryActive: false
    }));
  };

  const handleCircuitBreakerOpened = (event: any) => {
    console.warn('⚡ Circuit Breaker Opened:', event.key);

    // This indicates a tab or service is having repeated failures
    onErrorDetected({
      type: 'circuit_breaker_opened',
      key: event.key,
      systemHealth: event.systemHealth,
      timestamp: new Date()
    });
  };

  const handleHealthCheck = (event: any) => {
    setMonitoringState(prev => ({
      ...prev,
      systemHealth: event.systemHealth
    }));
  };

  const handleMetricsCollected = (event: any) => {
    setMonitoringState(prev => ({
      ...prev,
      metrics: event.http500Metrics,
      systemHealth: event.systemHealth
    }));
  };

  // Custom event handlers for recovery actions
  const handleFallbackRender = (event: CustomEvent) => {
    console.log('🔄 Fallback render triggered:', event.detail);
    // Component should switch to client-side rendering mode
  };

  const handleReloadTab = (event: CustomEvent) => {
    console.log('🔄 Tab reload triggered:', event.detail);
    // Component should reload the specific tab content
  };

  const handleRefreshContent = (event: CustomEvent) => {
    console.log('🔄 Content refresh triggered:', event.detail);
    // Component should refresh the tab content without full reload
  };

  const handleUseCache = (event: CustomEvent) => {
    console.log('💾 Cache fallback triggered:', event.detail);
    // Component should use cached data instead of live data
  };

  const handleMemoryCleanup = (event: CustomEvent) => {
    console.log('🧹 Memory cleanup triggered:', event.detail);
    // Component should clean up unused resources
  };

  const updateFailureReportRecovery = (patternId: string, success: boolean, duration?: number) => {
    setMonitoringState(prev => ({
      ...prev,
      recentFailures: prev.recentFailures.map(failure =>
        failure.patternId === patternId ? {
          ...failure,
          recoveryAttempted: true,
          recoverySuccess: success,
          recoveryDuration: duration
        } : failure
      )
    }));
  };

  const calculateUserImpact = (severity: string): 'none' | 'minimal' | 'moderate' | 'severe' => {
    switch (severity) {
      case 'critical': return 'severe';
      case 'high': return 'moderate';
      case 'medium': return 'minimal';
      default: return 'none';
    }
  };

  const forceHealthCheck = () => {
    if (nldIntegrationRef.current) {
      nldIntegrationRef.current.forceHealthCheck();
    }
  };

  const resetCircuitBreaker = (key: string) => {
    if (nldIntegrationRef.current) {
      nldIntegrationRef.current.resetCircuitBreaker(key);
    }
  };

  const getHealthStatusColor = (health: number): string => {
    if (health >= 90) return 'text-green-600';
    if (health >= 75) return 'text-yellow-600';
    if (health >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getHealthStatusIcon = (health: number) => {
    if (health >= 90) return <Shield className="w-4 h-4 text-green-600" />;
    if (health >= 75) return <Activity className="w-4 h-4 text-yellow-600" />;
    if (health >= 50) return <TrendingDown className="w-4 h-4 text-orange-600" />;
    return <AlertCircle className="w-4 h-4 text-red-600" />;
  };

  const cleanup = () => {
    // Remove event listeners
    window.removeEventListener('analytics-fallback-render', handleFallbackRender);
    window.removeEventListener('analytics-reload-tab', handleReloadTab);
    window.removeEventListener('analytics-refresh-content', handleRefreshContent);
    window.removeEventListener('analytics-use-cache', handleUseCache);
    window.removeEventListener('analytics-memory-cleanup', handleMemoryCleanup);

    // Stop monitoring
    if (http500MonitorRef.current) {
      http500MonitorRef.current.stopMonitoring();
    }

    if (nldIntegrationRef.current) {
      nldIntegrationRef.current.destroy();
    }

    if (nldCoreRef.current) {
      nldCoreRef.current.stopMonitoring();
    }
  };

  // Don't render anything if not initialized
  if (!monitoringState.isInitialized) {
    return null;
  }

  // Only show monitoring panel in debug mode or when there are issues
  const shouldShowPanel = debugMode ||
                         monitoringState.systemHealth?.overallHealth < 90 ||
                         monitoringState.recentFailures.length > 0 ||
                         monitoringState.recoveryActive;

  if (!shouldShowPanel) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Zap className="w-5 h-5 text-blue-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Analytics Monitoring</h3>
          {monitoringState.monitoringActive && (
            <div className="ml-3 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              <span className="text-sm text-green-600">Active</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setDebugMode(!debugMode)}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
          >
            {debugMode ? 'Hide Debug' : 'Show Debug'}
          </button>
          <button
            onClick={forceHealthCheck}
            className="flex items-center px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Health Check
          </button>
        </div>
      </div>

      {/* System Health */}
      {monitoringState.systemHealth && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">System Health</span>
            <div className="flex items-center">
              {getHealthStatusIcon(monitoringState.systemHealth.overallHealth)}
              <span className={`ml-1 text-sm font-medium ${getHealthStatusColor(monitoringState.systemHealth.overallHealth)}`}>
                {monitoringState.systemHealth.overallHealth.toFixed(1)}%
              </span>
            </div>
          </div>

          {monitoringState.systemHealth.criticalIssues.length > 0 && (
            <div className="mt-2">
              <span className="text-xs text-red-600 font-medium">Critical Issues:</span>
              <ul className="text-xs text-red-600 mt-1">
                {monitoringState.systemHealth.criticalIssues.map((issue, index) => (
                  <li key={index}>• {issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Recovery Status */}
      {monitoringState.recoveryActive && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-sm text-blue-700 font-medium">Recovery in progress...</span>
          </div>
        </div>
      )}

      {/* Recent Failures */}
      {monitoringState.recentFailures.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Failures</h4>
          <div className="space-y-2">
            {monitoringState.recentFailures.slice(-3).map((failure) => (
              <div key={failure.id} className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-red-700">
                    {failure.errorType} - Tab: {failure.tabId}
                  </span>
                  <span className="text-red-600">
                    {failure.severity}
                  </span>
                </div>
                <div className="text-red-600 mt-1">
                  Pattern: {failure.patternId}
                </div>
                {failure.recoveryAttempted && (
                  <div className={`mt-1 ${failure.recoverySuccess ? 'text-green-600' : 'text-red-600'}`}>
                    Recovery: {failure.recoverySuccess ? 'Success' : 'Failed'}
                    {failure.recoveryDuration && ` (${failure.recoveryDuration}ms)`}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Health */}
      {monitoringState.systemHealth?.tabHealth && Object.keys(monitoringState.systemHealth.tabHealth).length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Tab Health</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(monitoringState.systemHealth.tabHealth).map(([tabId, health]) => (
              <div key={tabId} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                <span className="text-gray-700">{tabId}</span>
                <span className={getHealthStatusColor(health)}>
                  {health.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Circuit Breaker Status */}
      {monitoringState.systemHealth?.circuitBreakerStatus &&
       Object.values(monitoringState.systemHealth.circuitBreakerStatus).some(status => status === 'open') && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Circuit Breakers</h4>
          <div className="space-y-1">
            {Object.entries(monitoringState.systemHealth.circuitBreakerStatus).map(([key, status]) => (
              status === 'open' && (
                <div key={key} className="flex items-center justify-between p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                  <span className="text-yellow-700">{key}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-600">OPEN</span>
                    <button
                      onClick={() => resetCircuitBreaker(key)}
                      className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Debug Information */}
      {debugMode && monitoringState.metrics && (
        <div className="mt-4 p-3 bg-gray-100 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Debug Metrics</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Total Errors: {monitoringState.metrics.totalErrors}</div>
            <div>Error Rate: {(monitoringState.metrics.errorRate * 100).toFixed(2)}%</div>
            <div>Recovery Attempts: {monitoringState.metrics.recoveryAttempts}</div>
            <div>Successful Recoveries: {monitoringState.metrics.successfulRecoveries}</div>
            <div>Avg Recovery Time: {monitoringState.metrics.averageRecoveryTime.toFixed(0)}ms</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsMonitoringIntegration;