/**
 * NLD Prevention Hook: Diagnostic Mode Detection
 *
 * This hook implements early warning system for diagnostic mode switching
 * and prevents accidental activation of DiagnosticApp instead of production App
 */

import { useEffect, useCallback, useState } from 'react';
import { diagnosticModePattern } from '../nld/patterns/diagnostic-mode-failure-pattern';

interface DiagnosticModeState {
  isActive: boolean;
  reason: string;
  activatedAt: Date | null;
  warningLevel: 'info' | 'warning' | 'error';
}

interface APIHealthCheck {
  endpoint: string;
  isHealthy: boolean;
  responseType: 'json' | 'html' | 'error' | 'timeout';
  lastChecked: Date;
  errorMessage?: string;
}

/**
 * Hook to detect and prevent diagnostic mode switching
 */
export function useDiagnosticModeDetection() {
  const [diagnosticState, setDiagnosticState] = useState<DiagnosticModeState>({
    isActive: false,
    reason: '',
    activatedAt: null,
    warningLevel: 'info'
  });

  const [apiHealth, setApiHealth] = useState<APIHealthCheck[]>([]);

  /**
   * Check if we're accidentally in diagnostic mode
   */
  const detectAccidentalDiagnosticMode = useCallback(() => {
    // Check if DiagnosticApp is being imported in main.tsx
    // This would require build-time detection or runtime checks

    // Check for diagnostic mode indicators
    const indicators = {
      urlParam: new URLSearchParams(window.location.search).get('diagnostic') === 'true',
      localStorage: localStorage.getItem('diagnostic_mode') === 'true',
      envVar: process.env.VITE_DIAGNOSTIC_MODE === 'true',
      // Check if we see diagnostic UI elements
      diagnosticUI: document.querySelector('[data-testid="diagnostic"]') !== null
    };

    const isInDiagnosticMode = Object.values(indicators).some(Boolean);

    if (isInDiagnosticMode) {
      const reason = Object.entries(indicators)
        .filter(([_, value]) => value)
        .map(([key]) => key)
        .join(', ');

      setDiagnosticState({
        isActive: true,
        reason: `Diagnostic mode active via: ${reason}`,
        activatedAt: new Date(),
        warningLevel: reason.includes('diagnosticUI') ? 'error' : 'warning'
      });

      // Log pattern if accidentally activated
      if (reason.includes('diagnosticUI')) {
        console.warn('[NLD] ALERT: Diagnostic UI detected in production mode!');
        diagnosticModePattern.capturePattern();
      }
    }

    return isInDiagnosticMode;
  }, []);

  /**
   * Check API health to distinguish between API vs component issues
   */
  const checkAPIHealth = useCallback(async () => {
    const endpoints = [
      '/api/v1/agents/development',
      '/api/v1/agents/production',
      '/api/v1/dual-instance-monitor/activities',
      '/api/v1/posts'
    ];

    const healthChecks: APIHealthCheck[] = await Promise.all(
      endpoints.map(async (endpoint): Promise<APIHealthCheck> => {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            timeout: 5000
          } as any);

          const contentType = response.headers.get('content-type');
          let responseType: APIHealthCheck['responseType'] = 'error';

          if (contentType?.includes('application/json')) {
            responseType = 'json';
          } else if (contentType?.includes('text/html')) {
            responseType = 'html';
          }

          return {
            endpoint,
            isHealthy: response.ok && responseType === 'json',
            responseType,
            lastChecked: new Date(),
            errorMessage: response.ok ? undefined : `${response.status}: ${response.statusText}`
          };
        } catch (error) {
          return {
            endpoint,
            isHealthy: false,
            responseType: error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'error',
            lastChecked: new Date(),
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    setApiHealth(healthChecks);
    return healthChecks;
  }, []);

  /**
   * Detect if current issue is API-related vs component-related
   */
  const detectIssueType = useCallback(async () => {
    const healthChecks = await checkAPIHealth();

    const failedAPIs = healthChecks.filter(check => !check.isHealthy);
    const htmlResponses = healthChecks.filter(check => check.responseType === 'html');

    if (htmlResponses.length > 0) {
      console.warn('[NLD] API Issue Detected: Endpoints returning HTML instead of JSON', htmlResponses);
      return {
        type: 'api_issue',
        severity: 'high',
        message: `${htmlResponses.length} API endpoints returning HTML instead of JSON`,
        solution: 'Check backend server status and API routing'
      };
    }

    if (failedAPIs.length > 0) {
      console.warn('[NLD] API Failures Detected:', failedAPIs);
      return {
        type: 'api_connectivity',
        severity: 'medium',
        message: `${failedAPIs.length} API endpoints failing`,
        solution: 'Check backend server connectivity'
      };
    }

    return {
      type: 'no_api_issues',
      severity: 'info',
      message: 'All APIs responding correctly',
      solution: 'Look for component or client-side issues'
    };
  }, [checkAPIHealth]);

  /**
   * Provide warning to user about diagnostic mode
   */
  const showDiagnosticWarning = useCallback((state: DiagnosticModeState) => {
    if (!state.isActive) return;

    const warningMessage = `🔧 DIAGNOSTIC MODE DETECTED: ${state.reason}`;

    if (state.warningLevel === 'error') {
      console.error('[NLD]', warningMessage);
      // Show toast notification or modal if available
      if (window.confirm(`${warningMessage}\n\nThis may not be the intended interface. Switch to production mode?`)) {
        // Clear diagnostic mode flags
        localStorage.removeItem('diagnostic_mode');
        const url = new URL(window.location.href);
        url.searchParams.delete('diagnostic');
        window.location.href = url.toString();
      }
    } else {
      console.warn('[NLD]', warningMessage);
    }
  }, []);

  /**
   * Main detection effect
   */
  useEffect(() => {
    const runDetection = async () => {
      // Check for accidental diagnostic mode
      const inDiagnosticMode = detectAccidentalDiagnosticMode();

      if (inDiagnosticMode) {
        showDiagnosticWarning(diagnosticState);
      }

      // Always check API health to prevent misdiagnosis
      await detectIssueType();
    };

    runDetection();

    // Run detection every 30 seconds
    const interval = setInterval(runDetection, 30000);

    return () => clearInterval(interval);
  }, [detectAccidentalDiagnosticMode, detectIssueType, showDiagnosticWarning, diagnosticState]);

  /**
   * Manual trigger for detection
   */
  const triggerDetection = useCallback(async () => {
    detectAccidentalDiagnosticMode();
    return await detectIssueType();
  }, [detectAccidentalDiagnosticMode, detectIssueType]);

  return {
    diagnosticState,
    apiHealth,
    triggerDetection,
    checkAPIHealth,
    isInDiagnosticMode: diagnosticState.isActive,
    hasAPIIssues: apiHealth.some(check => !check.isHealthy),
    hasHTMLResponses: apiHealth.some(check => check.responseType === 'html')
  };
}

/**
 * Component to display diagnostic mode warnings
 */
export function DiagnosticModeWarning() {
  const { diagnosticState, apiHealth, hasHTMLResponses } = useDiagnosticModeDetection();

  if (!diagnosticState.isActive && !hasHTMLResponses) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      {diagnosticState.isActive && (
        <div className={`mb-2 p-3 rounded-lg border ${
          diagnosticState.warningLevel === 'error'
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-yellow-50 border-yellow-200 text-yellow-800'
        }`}>
          <div className="flex items-center space-x-2">
            <span>{diagnosticState.warningLevel === 'error' ? '🚨' : '⚠️'}</span>
            <span className="font-medium">Diagnostic Mode Detected</span>
          </div>
          <div className="text-sm mt-1">
            {diagnosticState.reason}
          </div>
          {diagnosticState.warningLevel === 'error' && (
            <button
              onClick={() => {
                localStorage.removeItem('diagnostic_mode');
                window.location.reload();
              }}
              className="text-sm underline mt-2"
            >
              Switch to Production Mode
            </button>
          )}
        </div>
      )}

      {hasHTMLResponses && (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <span>🔗</span>
            <span className="font-medium">API Issue Detected</span>
          </div>
          <div className="text-sm mt-1">
            Some APIs are returning HTML instead of JSON. This may cause empty UI states.
          </div>
          <div className="text-xs mt-2">
            Check backend server status or API routing configuration.
          </div>
        </div>
      )}
    </div>
  );
}