/**
 * NLD Hook Validator - Development Runtime Hook Validation
 * Prevents "rendered more hooks than during the previous render" errors
 */

import React, { useRef, useLayoutEffect } from 'react';

interface HookViolation {
  component: string;
  expected: number;
  actual: number;
  render: number;
  timestamp: number;
  stackTrace?: string;
}

interface NLDHookSystem {
  violations: HookViolation[];
  recordViolation: (violation: HookViolation) => void;
  getViolationReport: () => string;
  clearViolations: () => void;
}

// Global NLD Hook System for pattern learning
const createNLDHookSystem = (): NLDHookSystem => {
  const violations: HookViolation[] = [];

  return {
    violations,
    recordViolation: (violation: HookViolation) => {
      violations.push(violation);

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.group(`🚨 NLD Hook Violation Detected`);
        console.error(`Component: ${violation.component}`);
        console.error(`Expected hooks: ${violation.expected}`);
        console.error(`Actual hooks: ${violation.actual}`);
        console.error(`Render count: ${violation.render}`);
        if (violation.stackTrace) {
          console.error('Stack trace:', violation.stackTrace);
        }
        console.groupEnd();
      }

      // Send to monitoring system if available
      if (typeof window !== 'undefined' && (window as any).nldMonitoring) {
        (window as any).nldMonitoring.recordHookViolation(violation);
      }
    },

    getViolationReport: () => {
      const report = violations.map(v =>
        `${v.component}: Expected ${v.expected}, got ${v.actual} (render ${v.render})`
      ).join('\n');

      return `Hook Violations Report (${violations.length} total):\n${report}`;
    },

    clearViolations: () => {
      violations.length = 0;
    }
  };
};

// Global system instance
const nldHookSystem = createNLDHookSystem();

// Export for development tools
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).nldHookSystem = nldHookSystem;
}

/**
 * Hook to validate consistent hook count across renders
 * Use this at the TOP of any component that has had hook violations
 */
export const useNLDHookValidator = (componentName: string, options: {
  enabled?: boolean;
  threshold?: number;
  onViolation?: (violation: HookViolation) => void;
} = {}) => {
  const {
    enabled = process.env.NODE_ENV === 'development',
    threshold = 0,
    onViolation
  } = options;

  const renderCountRef = useRef(0);
  const hookCountRef = useRef(0);
  const expectedHooksRef = useRef<number | null>(null);
  const violationCountRef = useRef(0);

  if (!enabled) return;

  renderCountRef.current++;
  hookCountRef.current++;

  useLayoutEffect(() => {
    const currentHookCount = hookCountRef.current;

    if (expectedHooksRef.current === null) {
      // First render - establish expected hook count
      expectedHooksRef.current = currentHookCount;
    } else if (currentHookCount !== expectedHooksRef.current) {
      // Hook count mismatch detected
      violationCountRef.current++;

      const violation: HookViolation = {
        component: componentName,
        expected: expectedHooksRef.current,
        actual: currentHookCount,
        render: renderCountRef.current,
        timestamp: Date.now(),
        stackTrace: new Error().stack
      };

      // Record violation
      nldHookSystem.recordViolation(violation);

      // Call custom handler if provided
      if (onViolation) {
        onViolation(violation);
      }

      // If violations exceed threshold, throw error to prevent further issues
      if (violationCountRef.current > threshold) {
        throw new Error(
          `Critical hook violation in ${componentName}: ` +
          `Expected ${expectedHooksRef.current} hooks, got ${currentHookCount}. ` +
          `This will cause "rendered more hooks than during the previous render" error.`
        );
      }
    }

    // Reset hook counter for next render
    hookCountRef.current = 0;
  });

  // Development helper to check hook order
  const checkHookOrder = (hookName: string) => {
    if (!enabled) return;

    const currentOrder = hookCountRef.current;
    console.debug(`${componentName} - Hook ${currentOrder}: ${hookName}`);
  };

  return { checkHookOrder };
};

/**
 * Higher-order component to automatically add hook validation
 */
export const withNLDHookValidation = <P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) => {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => {
    const name = componentName || Component.displayName || Component.name || 'UnknownComponent';
    useNLDHookValidator(name);

    return <Component {...props} ref={ref} />;
  });

  WrappedComponent.displayName = `withNLDHookValidation(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

/**
 * Hook to track individual hook calls for debugging
 */
export const useHookTracker = (hookName: string, componentName: string) => {
  if (process.env.NODE_ENV !== 'development') return;

  const callOrderRef = useRef(0);
  callOrderRef.current++;

  useLayoutEffect(() => {
    console.debug(`🪝 ${componentName} - ${hookName} called (order: ${callOrderRef.current})`);
    callOrderRef.current = 0;
  });
};

/**
 * Component wrapper that catches hook violations and provides recovery
 */
export const NLDHookErrorBoundary: React.FC<{
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}> = ({ children, fallback: Fallback, onError }) => {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (hasError) {
      // Check if this is a hook-related error
      const isHookError = error?.message?.includes('hook') ||
                         error?.message?.includes('rendered more');

      if (isHookError) {
        console.error('🚨 Hook violation detected by error boundary:', error);

        // Record in NLD system
        nldHookSystem.recordViolation({
          component: 'ErrorBoundary',
          expected: 0,
          actual: 0,
          render: 0,
          timestamp: Date.now(),
          stackTrace: error?.stack
        });
      }
    }
  }, [hasError, error]);

  if (hasError && error) {
    if (Fallback) {
      return <Fallback error={error} reset={() => setHasError(false)} />;
    }

    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Hook Violation Detected</h3>
        <p className="text-red-700 mb-3">{error.message}</p>
        <button
          onClick={() => setHasError(false)}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reset Component
        </button>
      </div>
    );
  }

  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      {children}
    </React.Suspense>
  );
};

/**
 * Hook to analyze component hook patterns and suggest improvements
 */
export const useHookPatternAnalysis = (componentName: string) => {
  const analysisRef = useRef<{
    hookCalls: string[];
    renderCount: number;
    patterns: string[];
  }>({
    hookCalls: [],
    renderCount: 0,
    patterns: []
  });

  if (process.env.NODE_ENV !== 'development') return;

  analysisRef.current.renderCount++;

  useLayoutEffect(() => {
    const analysis = analysisRef.current;

    if (analysis.renderCount > 5) {
      // Analyze patterns after multiple renders
      const patterns = [];

      if (analysis.hookCalls.includes('useState') && analysis.hookCalls.includes('useEffect')) {
        patterns.push('state-effect-pattern');
      }

      if (analysis.hookCalls.filter(call => call === 'useState').length > 3) {
        patterns.push('multiple-state-pattern');
      }

      console.debug(`🔍 Hook pattern analysis for ${componentName}:`, {
        hooks: analysis.hookCalls,
        renders: analysis.renderCount,
        patterns
      });
    }
  });

  return {
    recordHookCall: (hookName: string) => {
      analysisRef.current.hookCalls.push(hookName);
    }
  };
};

// Export the global system for testing and monitoring
export { nldHookSystem };

// Type definitions for external integrations
export type { HookViolation, NLDHookSystem };