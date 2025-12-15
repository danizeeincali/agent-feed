/**
 * Analytics HTTP 500 Demo Component
 * Demonstrates NLD monitoring and recovery for HTTP 500 errors in analytics
 * Shows real-time error detection, pattern analysis, and recovery strategies
 */

import React, { useState, useEffect } from 'react';
import { Activity, AlertCircle, Shield, Zap, CheckCircle, XCircle, RefreshCw, BarChart3 } from 'lucide-react';
import { Button } from '../ui/button';
import AnalyticsErrorBoundary from './AnalyticsErrorBoundary';
import { AnalyticsNLDIntegration } from '../../nld/integration/AnalyticsNLDIntegration';
import { NLDCore } from '../../nld/core/NLDCore';

interface ErrorScenario {
  id: string;
  name: string;
  description: string;
  errorType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  simulateError: () => void;
}

const ERROR_SCENARIOS: ErrorScenario[] = [
  {
    id: 'ssr_failure',
    name: 'Server-Side Rendering Failure',
    description: 'Simulates SSR component failure when switching to analytics tab',
    errorType: 'server_render_failure',
    severity: 'high',
    simulateError: () => {
      const event = new CustomEvent('simulate-analytics-error', {
        detail: {
          type: 'SSR_COMPONENT_FAILURE',
          message: 'Server render error: Component failed to hydrate properly',
          statusCode: 500
        }
      });
      window.dispatchEvent(event);
    }
  },
  {
    id: 'db_query_error',
    name: 'Database Query Timeout',
    description: 'Simulates database query timeout when loading analytics data',
    errorType: 'database_query_error',
    severity: 'critical',
    simulateError: () => {
      const event = new CustomEvent('simulate-analytics-error', {
        detail: {
          type: 'DATABASE_ANALYTICS_QUERY_ERROR',
          message: 'Database query failed: Connection timeout after 5000ms',
          statusCode: 500
        }
      });
      window.dispatchEvent(event);
    }
  },
  {
    id: 'missing_chart_lib',
    name: 'Missing Chart Library',
    description: 'Simulates missing chart dependencies causing visualization failures',
    errorType: 'missing_dependency',
    severity: 'medium',
    simulateError: () => {
      const event = new CustomEvent('simulate-analytics-error', {
        detail: {
          type: 'CHART_DEPENDENCY_MISSING',
          message: 'Chart library not found: recharts is not defined',
          statusCode: 500
        }
      });
      window.dispatchEvent(event);
    }
  },
  {
    id: 'claude_sdk_api_fail',
    name: 'Claude SDK API Failure',
    description: 'Simulates Claude SDK cost tracking API returning HTTP 500',
    errorType: 'api_endpoint_failure',
    severity: 'high',
    simulateError: () => {
      const event = new CustomEvent('simulate-analytics-error', {
        detail: {
          type: 'CLAUDE_SDK_API_FAILURE',
          message: 'Claude SDK API error: Internal server error at /api/cost-tracking',
          statusCode: 500
        }
      });
      window.dispatchEvent(event);
    }
  },
  {
    id: 'auth_token_expired',
    name: 'Authentication Token Expired',
    description: 'Simulates expired auth token when accessing analytics endpoints',
    errorType: 'auth_failure',
    severity: 'medium',
    simulateError: () => {
      const event = new CustomEvent('simulate-analytics-error', {
        detail: {
          type: 'ANALYTICS_AUTH_TOKEN_EXPIRED',
          message: 'Authentication failed: Token expired for analytics endpoint',
          statusCode: 500
        }
      });
      window.dispatchEvent(event);
    }
  },
  {
    id: 'memory_overflow',
    name: 'Memory Overflow',
    description: 'Simulates memory overflow causing analytics component crashes',
    errorType: 'memory_crash',
    severity: 'critical',
    simulateError: () => {
      const event = new CustomEvent('simulate-analytics-error', {
        detail: {
          type: 'ANALYTICS_MEMORY_OVERFLOW',
          message: 'Out of memory: Analytics component exceeded heap size limit',
          statusCode: 500
        }
      });
      window.dispatchEvent(event);
    }
  }
];

const AnalyticsHTTP500Demo: React.FC = () => {
  const [nldIntegration, setNldIntegration] = useState<AnalyticsNLDIntegration | null>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [recentFailures, setRecentFailures] = useState<any[]>([]);
  const [recoveryHistory, setRecoveryHistory] = useState<any[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastTriggeredScenario, setLastTriggeredScenario] = useState<string | null>(null);
  const [demoError, setDemoError] = useState<Error | null>(null);

  useEffect(() => {
    // Initialize NLD system
    const initializeNLD = async () => {
      try {
        const nldCore = new NLDCore();
        const integration = new AnalyticsNLDIntegration(nldCore, {
          enableRealTimeMonitoring: true,
          enableRecoveryStrategies: true,
          enablePreventiveMeasures: true,
          debugMode: true
        });

        // Set up event listeners
        integration.on('analytics:failure-detected', (event) => {
          console.log('📊 Demo: Failure detected', event);
          setRecentFailures(prev => [event.report, ...prev.slice(0, 4)]);
          updateSystemHealth(integration);
        });

        integration.on('analytics:recovery-completed', (event) => {
          console.log('🔄 Demo: Recovery completed', event);
          setRecoveryHistory(prev => [event, ...prev.slice(0, 4)]);
          updateSystemHealth(integration);
        });

        integration.on('analytics:health-check', () => {
          updateSystemHealth(integration);
        });

        setNldIntegration(integration);
        setIsMonitoring(true);
        updateSystemHealth(integration);

      } catch (error) {
        console.error('Failed to initialize NLD demo:', error);
      }
    };

    initializeNLD();

    // Set up error simulation listener
    const handleSimulatedError = (event: CustomEvent) => {
      const { type, message, statusCode } = event.detail;
      
      // Create a simulated error for demonstration
      const simulatedError = new Error(message);
      simulatedError.name = type;
      
      // Trigger the error boundary for demonstration
      setDemoError(simulatedError);
      
      // Reset after a delay to show recovery
      setTimeout(() => {
        setDemoError(null);
      }, 10000);
    };

    window.addEventListener('simulate-analytics-error', handleSimulatedError as EventListener);

    return () => {
      window.removeEventListener('simulate-analytics-error', handleSimulatedError as EventListener);
      nldIntegration?.destroy();
    };
  }, []);

  const updateSystemHealth = (integration: AnalyticsNLDIntegration) => {
    const health = integration.getSystemHealth();
    setSystemHealth(health);
  };

  const triggerScenario = (scenario: ErrorScenario) => {
    setLastTriggeredScenario(scenario.id);
    scenario.simulateError();
    
    // Reset indicator after delay
    setTimeout(() => {
      setLastTriggeredScenario(null);
    }, 5000);
  };

  const resetDemo = () => {
    if (nldIntegration) {
      nldIntegration.clearFailureReports();
      // Reset circuit breakers
      const circuitBreakers = nldIntegration.getCircuitBreakerStates();
      for (const [key] of circuitBreakers) {
        nldIntegration.resetCircuitBreaker(key);
      }
      updateSystemHealth(nldIntegration);
    }
    setRecentFailures([]);
    setRecoveryHistory([]);
    setDemoError(null);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getHealthColor = (health: number) => {
    if (health >= 90) return 'text-green-600';
    if (health >= 70) return 'text-yellow-600';
    if (health >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  // Error component for demonstration
  const DemoErrorComponent: React.FC = () => {
    if (demoError) {
      throw demoError;
    }
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center text-green-800">
          <CheckCircle className="w-5 h-5 mr-2" />
          <span className="font-medium">Analytics Component Running Normally</span>
        </div>
        <p className="text-green-700 text-sm mt-2">
          All analytics features are functioning correctly. NLD monitoring is active.
        </p>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center">
          <Shield className="w-8 h-8 mr-3 text-blue-600" />
          Analytics HTTP 500 NLD Monitoring Demo
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          This demo showcases the Neural Learning Database (NLD) system monitoring and recovering from
          HTTP 500 errors in analytics components. Trigger different error scenarios to see automatic
          detection, pattern analysis, and recovery strategies in action.
        </p>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Activity className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="font-semibold text-gray-900">System Health</h3>
          </div>
          {systemHealth ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Overall Health:</span>
                <span className={`text-sm font-medium ${getHealthColor(systemHealth.overallHealth)}`}>
                  {systemHealth.overallHealth}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Active Recoveries:</span>
                <span className="text-sm font-medium">{systemHealth.activeRecoveries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">24h Failures:</span>
                <span className="text-sm font-medium">{systemHealth.totalFailures24h}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Success Rate:</span>
                <span className="text-sm font-medium text-green-600">{systemHealth.successRate24h.toFixed(1)}%</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Initializing...</p>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <AlertCircle className="w-5 h-5 text-orange-600 mr-2" />
            <h3 className="font-semibold text-gray-900">Recent Failures</h3>
          </div>
          {recentFailures.length > 0 ? (
            <div className="space-y-2">
              {recentFailures.slice(0, 3).map((failure, index) => (
                <div key={index} className="text-xs">
                  <div className={`px-2 py-1 rounded ${getSeverityColor(failure.severity)}`}>
                    <div className="font-medium">{failure.errorType}</div>
                    <div className="text-xs opacity-80">Tab: {failure.tabId}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No recent failures</p>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <RefreshCw className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="font-semibold text-gray-900">Recovery Status</h3>
          </div>
          {recoveryHistory.length > 0 ? (
            <div className="space-y-2">
              {recoveryHistory.slice(0, 3).map((recovery, index) => (
                <div key={index} className="text-xs">
                  <div className={`px-2 py-1 rounded ${
                    recovery.result.success 
                      ? 'text-green-700 bg-green-50 border-green-200'
                      : 'text-red-700 bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center">
                      {recovery.result.success ? (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      ) : (
                        <XCircle className="w-3 h-3 mr-1" />
                      )}
                      <span className="font-medium">{recovery.result.strategy}</span>
                    </div>
                    <div className="text-xs opacity-80">
                      {recovery.result.duration}ms
                      {recovery.result.fallbackUsed && ' (fallback)'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No recoveries yet</p>
          )}
        </div>
      </div>

      {/* Error Scenarios */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Zap className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="font-semibold text-gray-900">Error Simulation Scenarios</h3>
          </div>
          <Button
            onClick={resetDemo}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reset Demo
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ERROR_SCENARIOS.map((scenario) => (
            <div key={scenario.id} className="border border-gray-200 rounded-lg p-4">
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 text-sm">{scenario.name}</h4>
                  <span className={`text-xs px-2 py-1 rounded ${getSeverityColor(scenario.severity)}`}>
                    {scenario.severity}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{scenario.description}</p>
              </div>
              
              <Button
                onClick={() => triggerScenario(scenario)}
                size="sm"
                variant={lastTriggeredScenario === scenario.id ? "default" : "outline"}
                className="w-full text-xs"
                disabled={lastTriggeredScenario === scenario.id}
              >
                {lastTriggeredScenario === scenario.id ? (
                  <>
                    <Zap className="w-3 h-3 mr-1 animate-pulse" />
                    Triggered
                  </>
                ) : (
                  'Trigger Error'
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Demo Component with Error Boundary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <BarChart3 className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="font-semibold text-gray-900">Analytics Component Demo</h3>
          <div className="ml-auto flex items-center text-sm text-gray-500">
            <Shield className="w-4 h-4 mr-1" />
            NLD Protected
          </div>
        </div>
        
        <AnalyticsErrorBoundary
          enableNLDIntegration={true}
          showDetails={true}
          className="border-2 border-dashed border-gray-300 rounded-lg p-4"
        >
          <DemoErrorComponent />
        </AnalyticsErrorBoundary>
      </div>

      {/* Monitoring Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center text-blue-800">
          <Shield className="w-5 h-5 mr-2" />
          <span className="font-medium">NLD Monitoring Status: </span>
          <span className={`ml-2 ${isMonitoring ? 'text-green-600' : 'text-red-600'}`}>
            {isMonitoring ? 'Active' : 'Inactive'}
          </span>
        </div>
        <p className="text-blue-700 text-sm mt-2">
          Neural Learning Database is actively monitoring analytics components for HTTP 500 errors,
          analyzing failure patterns, and implementing automatic recovery strategies.
        </p>
      </div>
    </div>
  );
};

export default AnalyticsHTTP500Demo;
