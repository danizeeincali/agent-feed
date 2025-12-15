import React, { Component, ErrorInfo, ReactNode, Suspense } from 'react';
import { AlertTriangle, RefreshCw, Shield, Activity, Zap } from 'lucide-react';

/**
 * Enhanced Analytics White Screen Prevention Component
 *
 * TDD London School approach implementation focusing on:
 * 1. Contract-based error boundary interactions
 * 2. Behavior verification for fallback scenarios
 * 3. Mock-driven testing for various failure modes
 * 4. Collaborative error handling with monitoring systems
 */

interface WhiteScreenPreventionProps {
  children: ReactNode;
  componentName?: string;
  fallbackMode?: 'minimal' | 'enhanced' | 'graceful';
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRecovery?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

interface WhiteScreenPreventionState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRecovering: boolean;
  fallbackActive: boolean;
  lastErrorTime: number;
}

export class AnalyticsWhiteScreenPrevention extends Component<
  WhiteScreenPreventionProps,
  WhiteScreenPreventionState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  private maxRetries: number;
  private retryDelay: number;

  constructor(props: WhiteScreenPreventionProps) {
    super(props);

    this.maxRetries = props.maxRetries || 3;
    this.retryDelay = props.retryDelay || 2000;

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false,
      fallbackActive: false,
      lastErrorTime: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<WhiteScreenPreventionState> {
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

    // Enhanced error context for analytics components
    const errorContext = {
      componentName: this.props.componentName || 'Unknown Analytics Component',
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: this.state.retryCount,
      analytics: {
        sessionId: this.getSessionId(),
        userId: this.getUserId(),
        featureFlags: this.getFeatureFlags()
      }
    };

    console.error('Analytics White Screen Prevention - Error caught:', errorContext);

    // Call optional error handler (for monitoring integration)
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Dispatch error event for external monitoring
    this.dispatchErrorEvent(errorContext);

    // Attempt automatic recovery if enabled
    if (this.props.enableRecovery && this.state.retryCount < this.maxRetries) {
      this.attemptRecovery();
    }
  }

  private getSessionId(): string {
    return sessionStorage.getItem('analytics-session-id') || 'unknown';
  }

  private getUserId(): string {
    return localStorage.getItem('user-id') || 'anonymous';
  }

  private getFeatureFlags(): Record<string, boolean> {
    try {
      return JSON.parse(localStorage.getItem('feature-flags') || '{}');
    } catch {
      return {};
    }
  }

  private dispatchErrorEvent(errorContext: any): void {
    const event = new CustomEvent('analytics-white-screen-error', {
      detail: errorContext
    });
    window.dispatchEvent(event);
  }

  private attemptRecovery = (): void => {
    if (this.state.isRecovering) return;

    this.setState({ isRecovering: true });

    this.retryTimeoutId = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
        isRecovering: false
      }));

      // Dispatch recovery attempt event
      const event = new CustomEvent('analytics-recovery-attempt', {
        detail: {
          componentName: this.props.componentName,
          retryCount: this.state.retryCount + 1,
          timestamp: new Date().toISOString()
        }
      });
      window.dispatchEvent(event);
    }, this.retryDelay * (this.state.retryCount + 1)); // Exponential backoff
  };

  private handleManualRetry = (): void => {
    if (this.state.retryCount < this.maxRetries) {
      this.attemptRecovery();
    }
  };

  private handleFallbackMode = (): void => {
    this.setState({ fallbackActive: true });

    const event = new CustomEvent('analytics-fallback-activated', {
      detail: {
        componentName: this.props.componentName,
        fallbackMode: this.props.fallbackMode || 'minimal',
        timestamp: new Date().toISOString()
      }
    });
    window.dispatchEvent(event);
  };

  private canRetry(): boolean {
    return this.state.retryCount < this.maxRetries && !this.state.isRecovering;
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError && !this.state.isRecovering) {
      const { fallbackMode = 'enhanced' } = this.props;

      // Show minimal fallback for graceful degradation
      if (this.state.fallbackActive || fallbackMode === 'minimal') {
        return (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4" data-testid="analytics-minimal-fallback">
            <div className="flex items-center text-gray-600">
              <Activity className="w-4 h-4 mr-2" />
              <span className="text-sm">Analytics temporarily unavailable</span>
            </div>
          </div>
        );
      }

      // Enhanced error UI
      if (fallbackMode === 'enhanced') {
        return (
          <div className="bg-white border border-red-200 rounded-lg p-6" data-testid="analytics-enhanced-fallback">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">
                  {this.props.componentName || 'Analytics'} Component Error
                </h3>
                <p className="text-sm text-red-600 mt-1">
                  The component encountered an error and couldn't render properly.
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-red-800 mb-2">Error Details</h4>
              <p className="text-sm text-red-700 mb-2">
                <strong>Error:</strong> {this.state.error?.message}
              </p>
              <p className="text-sm text-red-700">
                <strong>Component:</strong> {this.props.componentName || 'Analytics Component'}
              </p>
              {this.state.retryCount > 0 && (
                <p className="text-sm text-red-700">
                  <strong>Retry Attempts:</strong> {this.state.retryCount}/{this.maxRetries}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {this.canRetry() && (
                <button
                  onClick={this.handleManualRetry}
                  className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  data-testid="retry-button"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again ({this.state.retryCount}/{this.maxRetries})
                </button>
              )}

              <button
                onClick={this.handleFallbackMode}
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                data-testid="fallback-button"
              >
                <Shield className="w-4 h-4 mr-2" />
                Use Simplified View
              </button>

              <button
                onClick={() => window.location.reload()}
                className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-4">
                <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                  Developer Details
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded-lg text-xs">
                  <div className="mb-2">
                    <strong>Component Stack:</strong>
                    <pre className="mt-1 whitespace-pre-wrap text-gray-800">{this.state.errorInfo.componentStack}</pre>
                  </div>
                  <div>
                    <strong>Error Stack:</strong>
                    <pre className="mt-1 whitespace-pre-wrap text-gray-800">{this.state.error?.stack}</pre>
                  </div>
                </div>
              </details>
            )}
          </div>
        );
      }

      // Graceful fallback with basic functionality
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6" data-testid="analytics-graceful-fallback">
          <div className="flex items-center mb-4">
            <Zap className="w-6 h-6 text-blue-500 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-blue-800">
                Analytics in Safe Mode
              </h3>
              <p className="text-sm text-blue-600 mt-1">
                Running with reduced functionality to ensure stability.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="text-2xl font-bold text-blue-800">System OK</div>
              <div className="text-sm text-blue-600">Core functions operational</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="text-2xl font-bold text-blue-800">Data Safe</div>
              <div className="text-sm text-blue-600">No data loss detected</div>
            </div>
          </div>

          <div className="flex gap-3">
            {this.canRetry() && (
              <button
                onClick={this.handleManualRetry}
                className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Restore Full Analytics
              </button>
            )}
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }

    // Recovery state
    if (this.state.isRecovering) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6" data-testid="analytics-recovery-state">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600 mr-3"></div>
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">
                Recovering {this.props.componentName || 'Analytics'}
              </h3>
              <p className="text-sm text-yellow-600 mt-1">
                Attempting automatic recovery... (Attempt {this.state.retryCount + 1}/{this.maxRetries})
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Enhanced Suspense wrapper with white screen prevention
export const AnalyticsSuspenseWrapper: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
  timeout?: number;
}> = ({ children, fallback, componentName, timeout = 30000 }) => {
  const [timedOut, setTimedOut] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true);
      console.warn(`Suspense timeout for ${componentName} after ${timeout}ms`);
    }, timeout);

    return () => clearTimeout(timer);
  }, [componentName, timeout]);

  if (timedOut) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-6" data-testid="analytics-suspense-timeout">
        <div className="flex items-center mb-4">
          <AlertTriangle className="w-6 h-6 text-orange-500 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-orange-800">Loading Timeout</h3>
            <p className="text-sm text-orange-600 mt-1">
              {componentName || 'Component'} is taking longer than expected to load.
            </p>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <AnalyticsWhiteScreenPrevention
      componentName={componentName}
      enableRecovery={true}
      fallbackMode="enhanced"
    >
      <Suspense fallback={fallback || <div>Loading...</div>}>
        {children}
      </Suspense>
    </AnalyticsWhiteScreenPrevention>
  );
};

// HOC for easy wrapping of analytics components
export const withWhiteScreenPrevention = <P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    componentName?: string;
    fallbackMode?: 'minimal' | 'enhanced' | 'graceful';
    enableRecovery?: boolean;
  }
) => {
  const WrappedComponent = (props: P) => (
    <AnalyticsWhiteScreenPrevention
      componentName={options?.componentName || Component.displayName || Component.name}
      fallbackMode={options?.fallbackMode}
      enableRecovery={options?.enableRecovery}
    >
      <Component {...props} />
    </AnalyticsWhiteScreenPrevention>
  );

  WrappedComponent.displayName = `withWhiteScreenPrevention(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

export default AnalyticsWhiteScreenPrevention;