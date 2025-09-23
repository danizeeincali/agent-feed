/**
 * SPARC Hook Error Boundary
 * Emergency error boundary specifically for React hook violations
 * Provides automatic recovery and debugging information
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Bug, Activity } from 'lucide-react';

interface SPARCErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  hookViolationDetected: boolean;
  resetCount: number;
}

interface SPARCErrorBoundaryProps {
  children: ReactNode;
  componentName: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  fallback?: ReactNode;
}

export class SPARCHookErrorBoundary extends Component<SPARCErrorBoundaryProps, SPARCErrorBoundaryState> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: SPARCErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      hookViolationDetected: false,
      resetCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<SPARCErrorBoundaryState> {
    // Check if this is a React hooks violation
    const isHookViolation = error.message.includes('hooks') || 
                           error.message.includes('Rendered more hooks') ||
                           error.message.includes('hook') ||
                           error.stack?.includes('hooks');

    console.error('[SPARC] Error boundary caught error:', error.message);
    
    if (isHookViolation) {
      console.error('[SPARC] HOOK VIOLATION DETECTED:', error.message);
    }

    return {
      hasError: true,
      error,
      hookViolationDetected: isHookViolation
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SPARC] Component error details:', {
      component: this.props.componentName,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    this.setState({ errorInfo });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-recovery for hook violations
    if (this.state.hookViolationDetected && this.state.resetCount < 3) {
      console.warn('[SPARC] Attempting auto-recovery from hook violation...');
      
      this.resetTimeoutId = setTimeout(() => {
        this.handleReset();
      }, 1000);
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  handleReset = () => {
    console.log('[SPARC] Resetting error boundary...');
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      hookViolationDetected: false,
      resetCount: prevState.resetCount + 1
    }));

    // Clear caches if hook violation
    if (this.state.hookViolationDetected && typeof window !== 'undefined') {
      this.clearBrowserCache();
    }
  };

  handleEmergencyReset = () => {
    console.error('[SPARC] Emergency reset triggered by user');
    
    if (typeof window !== 'undefined') {
      // Clear all caches and force hard refresh
      localStorage.clear();
      sessionStorage.clear();
      
      // Force reload with cache bust
      window.location.href = window.location.href + '?sparc-emergency=' + Date.now();
    }
  };

  private clearBrowserCache = async () => {
    try {
      // Clear Cache API
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Clear storage
      localStorage.clear();
      sessionStorage.clear();
      
      console.log('[SPARC] Browser cache cleared');
    } catch (error) {
      console.error('[SPARC] Failed to clear cache:', error);
    }
  };

  render() {
    if (this.state.hasError && this.props.fallback) {
      return this.props.fallback;
    }

    if (this.state.hasError) {
      const { error, hookViolationDetected, resetCount } = this.state;
      
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full">
                {hookViolationDetected ? (
                  <Bug className="w-6 h-6 text-red-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {hookViolationDetected ? 'React Hooks Violation Detected' : 'Component Error'}
                </h1>
                <p className="text-sm text-gray-600">
                  Component: {this.props.componentName} • Reset attempts: {resetCount}
                </p>
              </div>
            </div>

            {/* Hook violation specific message */}
            {hookViolationDetected && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-red-600" />
                  <h3 className="font-semibold text-red-800">SPARC Hook Violation Analysis</h3>
                </div>
                <p className="text-sm text-red-700 mb-2">
                  The component rendered more hooks than during the previous render. 
                  This usually means hooks are being called conditionally.
                </p>
                <ul className="text-xs text-red-600 list-disc list-inside space-y-1">
                  <li>Check for conditional hook calls (if statements around hooks)</li>
                  <li>Ensure all hooks are called in the same order every render</li>
                  <li>Verify useEffect dependencies are stable</li>
                  <li>Look for dynamic hook calls or loops containing hooks</li>
                </ul>
              </div>
            )}

            {/* Error details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Error Details</h3>
              <p className="text-sm text-gray-700 mb-2 font-mono bg-gray-100 p-2 rounded">
                {error?.message || 'Unknown error'}
              </p>
              
              {this.state.errorInfo && (
                <details className="text-xs text-gray-600">
                  <summary className="cursor-pointer hover:text-gray-800">Component Stack</summary>
                  <pre className="mt-2 text-xs overflow-x-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reset Component
              </button>
              
              <button
                onClick={this.handleEmergencyReset}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <AlertCircle className="w-4 h-4" />
                Emergency Reset (Reload Page)
              </button>
              
              <button
                onClick={() => window.history.back()}
                className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Go Back
              </button>
            </div>

            {/* Debug info in development */}
            {process.env.NODE_ENV === 'development' && error && (
              <details className="mt-6 text-xs">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                  Debug Information (Development Only)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap components with SPARC error boundary
 */
export function withSPARCErrorBoundary<T extends {}>(
  WrappedComponent: React.ComponentType<T>,
  componentName?: string
) {
  const ComponentWithErrorBoundary = (props: T) => {
    return (
      <SPARCHookErrorBoundary componentName={componentName || WrappedComponent.name || 'Unknown'}>
        <WrappedComponent {...props} />
      </SPARCHookErrorBoundary>
    );
  };

  ComponentWithErrorBoundary.displayName = `withSPARCErrorBoundary(${componentName || WrappedComponent.name || 'Component'})`;
  
  return ComponentWithErrorBoundary;
}