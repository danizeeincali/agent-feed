/**
 * NLD Pattern Analysis: DiagnosticApp vs App.tsx Issue
 *
 * This pattern analyzes the failure mode that leads to switching between
 * production App.tsx and emergency DiagnosticApp component.
 */

interface DiagnosticModePattern {
  type: 'diagnostic_mode_activation';
  trigger: string;
  rootCause: string;
  switchingMechanism: string;
  userExperience: string;
  preventionStrategy: string;
  timestamp: Date;
  context: {
    userReport: string;
    technicalCause: string;
    componentState: string;
    apiState: string;
  };
}

interface DiagnosticSwitchAnalysis {
  currentState: 'production_app' | 'diagnostic_mode';
  switchLocation: string;
  switchCondition: string;
  fallbackReason: string;
  userImpact: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * NLD Analysis: DiagnosticApp Switching Pattern
 *
 * CRITICAL DISCOVERY: Based on analysis, the switching mechanism is:
 * 1. main.tsx line 11: `import App from './DiagnosticApp'` (commented out)
 * 2. main.tsx line 10: `import App from './App'` (currently active)
 *
 * The user experienced diagnostic mode because someone manually switched
 * the import in main.tsx during debugging white screen issues.
 */
export class DiagnosticModeFailurePattern {
  private patterns: DiagnosticModePattern[] = [];

  /**
   * Analyze the current situation based on discovered evidence
   */
  analyzeCurrent(): DiagnosticSwitchAnalysis {
    return {
      currentState: 'production_app', // App.tsx is currently imported
      switchLocation: '/workspaces/agent-feed/frontend/src/main.tsx:11',
      switchCondition: 'Manual import switch during white screen debugging',
      fallbackReason: 'White screen issue misdiagnosed as component failure',
      userImpact: 'high' // User sees wrong interface entirely
    };
  }

  /**
   * Capture the specific pattern that occurred
   */
  capturePattern(): void {
    const pattern: DiagnosticModePattern = {
      type: 'diagnostic_mode_activation',
      trigger: 'User reported "interface looks nothing like original"',
      rootCause: 'Manual import switch in main.tsx during debugging session',
      switchingMechanism: 'Developer changed import from App to DiagnosticApp',
      userExperience: 'Complete interface change from production to diagnostic mock UI',
      preventionStrategy: 'Implement automatic diagnostic detection without manual switching',
      timestamp: new Date(),
      context: {
        userReport: 'interface looks nothing like original - it was showing diagnostic mode instead of the real multi-page interface with sidebar',
        technicalCause: 'main.tsx line 11 import switch from ./App to ./DiagnosticApp',
        componentState: 'Both App.tsx and DiagnosticApp.tsx exist and are functional',
        apiState: 'Original issue was API connectivity, not React component failure'
      }
    };

    this.patterns.push(pattern);
    console.log('[NLD] Captured diagnostic mode switching pattern:', pattern);
  }

  /**
   * Root cause analysis of the white screen issue
   */
  analyzeWhiteScreenRootCause(): {
    actualIssue: string;
    misdiagnosis: string;
    correctSolution: string;
    incorrectSolution: string;
  } {
    return {
      actualIssue: 'API endpoints returning 404 HTML instead of JSON data',
      misdiagnosis: 'React component rendering failure causing white screen',
      correctSolution: 'Fix backend API server or improve API fallback handling',
      incorrectSolution: 'Switch to DiagnosticApp with mock components'
    };
  }

  /**
   * Generate prevention strategy
   */
  generatePreventionStrategy(): {
    immediateActions: string[];
    longTermSolutions: string[];
    detectionMechanisms: string[];
  } {
    return {
      immediateActions: [
        'Remove manual import switching in main.tsx',
        'Add environment-based diagnostic mode detection',
        'Implement automatic API fallback without UI switching',
        'Add clear differentiation between diagnostic and production modes'
      ],
      longTermSolutions: [
        'Implement smart diagnostic mode that overlays on production UI',
        'Add API health monitoring with automatic fallback',
        'Create component-level error boundaries instead of app-level switching',
        'Add visual indicators when in diagnostic mode'
      ],
      detectionMechanisms: [
        'Monitor API response types (HTML vs JSON)',
        'Track component render failures vs API failures',
        'Detect when diagnostic mode is accidentally activated',
        'Alert when production interface is replaced'
      ]
    };
  }

  /**
   * Learning outcomes for future similar issues
   */
  getLearnings(): {
    diagnosticRules: string[];
    preventionRules: string[];
    debuggingBestPractices: string[];
  } {
    return {
      diagnosticRules: [
        'White screen ≠ Component failure (check API responses first)',
        'Empty UI states ≠ React rendering issues (check data loading)',
        'Diagnostic mode should enhance, not replace production UI',
        'Always verify root cause before implementing solution'
      ],
      preventionRules: [
        'Never manually switch app imports in main.tsx for debugging',
        'Use feature flags for diagnostic mode activation',
        'Implement progressive degradation, not complete UI replacement',
        'Add automatic API health checking with graceful fallbacks'
      ],
      debuggingBestPractices: [
        'Check network requests before assuming component failures',
        'Verify API responses contain expected JSON format',
        'Use browser dev tools to inspect actual vs expected responses',
        'Test API endpoints directly before debugging React components'
      ]
    };
  }
}

/**
 * Smart Diagnostic Mode Implementation
 * This replaces manual switching with intelligent detection
 */
export class SmartDiagnosticMode {
  /**
   * Detect if diagnostic mode should be activated
   */
  static shouldActivateDiagnostic(): boolean {
    // Check environment variables
    if (process.env.NODE_ENV === 'development' && process.env.VITE_DIAGNOSTIC_MODE === 'true') {
      return true;
    }

    // Check URL parameters
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('diagnostic') === 'true') {
        return true;
      }
    }

    // Check localStorage flag
    if (typeof localStorage !== 'undefined') {
      const diagnosticFlag = localStorage.getItem('diagnostic_mode');
      if (diagnosticFlag === 'true') {
        return true;
      }
    }

    return false;
  }

  /**
   * Create diagnostic overlay component instead of full replacement
   */
  static createDiagnosticOverlay(): React.ComponentType {
    return () => (
      <div className="fixed top-4 right-4 z-50 bg-yellow-100 border border-yellow-300 rounded-lg p-3 max-w-sm">
        <div className="flex items-center space-x-2">
          <span className="text-yellow-600">🔧</span>
          <span className="text-sm font-medium">Diagnostic Mode Active</span>
        </div>
        <div className="text-xs text-yellow-700 mt-1">
          API fallbacks enabled. Check network tab for API issues.
        </div>
        <button
          onClick={() => localStorage.removeItem('diagnostic_mode')}
          className="text-xs text-yellow-600 underline mt-2"
        >
          Disable
        </button>
      </div>
    );
  }
}

// Export singleton instance for pattern tracking
export const diagnosticModePattern = new DiagnosticModeFailurePattern();

// Capture the current incident
diagnosticModePattern.capturePattern();

// Export analysis results
export const currentAnalysis = diagnosticModePattern.analyzeCurrent();
export const preventionStrategy = diagnosticModePattern.generatePreventionStrategy();
export const learnings = diagnosticModePattern.getLearnings();
export const rootCauseAnalysis = diagnosticModePattern.analyzeWhiteScreenRootCause();