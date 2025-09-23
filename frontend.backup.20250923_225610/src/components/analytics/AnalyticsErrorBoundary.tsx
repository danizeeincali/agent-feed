import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Shield } from 'lucide-react';

interface AnalyticsErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  className?: string;
  enableNLDIntegration?: boolean;
}

interface AnalyticsErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  lastErrorTime: number;
  fallbackMode: boolean;
}

class AnalyticsErrorBoundary extends Component<AnalyticsErrorBoundaryProps, AnalyticsErrorBoundaryState> {
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor(props: AnalyticsErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      lastErrorTime: 0,
      fallbackMode: false
    };
  }


  static getDerivedStateFromError(error: Error): Partial<AnalyticsErrorBoundaryState> {
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Enhanced error logging
    console.error('Analytics Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });
  }


  handleRetry = () => {
    const { retryCount, lastErrorTime } = this.state;
    const now = Date.now();

    // Reset retry count if enough time has passed
    const resetRetryCount = now - lastErrorTime > 60000; // 1 minute

    if (resetRetryCount || retryCount < this.maxRetries) {
      setTimeout(() => {
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          retryCount: resetRetryCount ? 1 : retryCount + 1,
          lastErrorTime: now,
          fallbackMode: false
        });
      }, this.retryDelay);
    }
  };

  handleFallbackMode = () => {
    this.setState({ fallbackMode: true });

    // Trigger graceful degradation
    const event = new CustomEvent('analytics-graceful-degradation', {
      detail: {
        source: 'error-boundary',
        errorType: this.state.error?.name,
        fallbackMode: 'minimal'
      }
    });
    window.dispatchEvent(event);
  };

  canRetry = (): boolean => {
    const { retryCount, lastErrorTime } = this.state;
    const now = Date.now();

    return (now - lastErrorTime > 60000) || retryCount < this.maxRetries;
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }


      // Default error UI with NLD enhancements
      return (
        <div className="min-h-96 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-center p-8 max-w-md mx-auto">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Analytics Component Error
            </h2>
            <p className="text-gray-600 mb-6">
              There was an error loading the analytics dashboard.
              This might be due to a temporary issue.
            </p>

            {this.props.showDetails && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                <h3 className="text-sm font-semibold text-red-800 mb-2 flex items-center">
                  <Bug className="w-4 h-4 mr-2" />
                  Error Details
                </h3>
                <p className="text-sm text-red-700 font-mono break-all">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-sm font-medium text-red-800 cursor-pointer">
                      Component Stack
                    </summary>
                    <pre className="text-xs text-red-600 mt-2 whitespace-pre-wrap overflow-auto max-h-32">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}


            <div className="space-y-3">
              {this.canRetry() && (
                <button
                  onClick={this.handleRetry}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                  {this.state.retryCount > 0 && (
                    <span className="text-xs opacity-75 ml-2">
                      ({this.state.retryCount}/{this.maxRetries})
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={this.handleFallbackMode}
                className="inline-flex items-center px-4 py-2 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
              >
                <Shield className="w-4 h-4 mr-2" />
                Safe Mode
              </button>

              <div className="text-center">
                <button
                  onClick={() => window.location.href = '/'}
                  className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </button>
              </div>
            </div>

            {!this.canRetry() && (
              <p className="text-sm text-gray-500 mt-4">
                Maximum retry attempts reached. Please refresh the page or contact support.
              </p>
            )}

            {(process.env.NODE_ENV === 'development' || this.props.showDetails) && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                  Error Details {process.env.NODE_ENV === 'development' && '(Development Only)'}
                </summary>
                <div className="mt-2 p-3 bg-red-50 rounded border text-xs text-red-800">
                  <div className="font-semibold mb-2">Error:</div>
                  <div className="mb-2">{this.state.error.toString()}</div>
                  {this.state.errorInfo && (
                    <>
                      <div className="font-semibold mb-2">Component Stack:</div>
                      <pre className="whitespace-pre-wrap text-xs">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }

  componentWillUnmount() {
    // Component cleanup
  }
}

export default AnalyticsErrorBoundary;

// Functional wrapper for easier usage
export const withAnalyticsErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorFallback?: ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <AnalyticsErrorBoundary fallback={errorFallback}>
      <Component {...props} />
    </AnalyticsErrorBoundary>
  );
  
  WrappedComponent.displayName = `withAnalyticsErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Enhanced loading fallback
export const AnalyticsLoadingFallback: React.FC<{
  message?: string;
  className?: string;
}> = ({
  message = "Loading analytics...",
  className
}) => {

  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-4 bg-gray-200 rounded w-64"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded w-32"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="space-y-3">
              <div className="h-12 bg-gray-200 rounded w-12"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-8 bg-gray-200 rounded w-20"></div>
              <div className="h-2 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>

      <div className="text-center text-gray-500 text-sm mt-4">
        {message}
      </div>
    </div>
  );
};
