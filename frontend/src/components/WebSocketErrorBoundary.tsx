/**
 * SPARC IMPLEMENTATION: WebSocket Error Boundary
 * ARCHITECTURE: Error boundary with graceful degradation for WebSocket failures
 * REFINEMENT: Comprehensive error handling and user feedback
 * COMPLETION: Production-ready error recovery system
 */

import React, { Component, ReactNode } from 'react';

interface WebSocketErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  isRecovering: boolean;
  recoveryAttempts: number;
}

interface WebSocketErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  maxRecoveryAttempts?: number;
  onError?: (error: Error, errorInfo: any) => void;
  onRecover?: () => void;
}

export class WebSocketErrorBoundary extends Component<
  WebSocketErrorBoundaryProps,
  WebSocketErrorBoundaryState
> {
  private recoveryTimer: NodeJS.Timeout | null = null;

  constructor(props: WebSocketErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
      recoveryAttempts: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<WebSocketErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('WebSocketErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      errorInfo
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Attempt automatic recovery for WebSocket-related errors
    this.attemptRecovery();
  }

  componentWillUnmount() {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }
  }

  attemptRecovery = () => {
    const maxAttempts = this.props.maxRecoveryAttempts || 3;
    
    if (this.state.recoveryAttempts >= maxAttempts) {
      console.log('WebSocketErrorBoundary: Max recovery attempts reached');
      return;
    }

    this.setState({ isRecovering: true });

    // Wait before attempting recovery (exponential backoff)
    const delay = Math.min(1000 * Math.pow(2, this.state.recoveryAttempts), 10000);
    
    this.recoveryTimer = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        isRecovering: false,
        recoveryAttempts: prevState.recoveryAttempts + 1
      }));

      this.props.onRecover?.();
      console.log(`WebSocketErrorBoundary: Recovery attempt ${this.state.recoveryAttempts + 1}`);
    }, delay);
  };

  handleManualRecovery = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
      recoveryAttempts: 0
    });

    this.props.onRecover?.();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="mb-4">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Connection Error
              </h2>
              <p className="text-gray-600 mb-4">
                {this.state.isRecovering 
                  ? 'Attempting to reconnect...'
                  : 'There was a problem with the WebSocket connection.'
                }
              </p>
            </div>

            {!this.state.isRecovering && (
              <div className="space-y-3">
                <button
                  onClick={this.handleManualRecovery}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                  disabled={this.state.isRecovering}
                >
                  Try Again
                </button>
                
                <button
                  onClick={this.handleReload}
                  className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Reload Page
                </button>
              </div>
            )}

            {this.state.isRecovering && (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                <span className="text-sm text-gray-600">
                  Recovering... (Attempt {this.state.recoveryAttempts + 1})
                </span>
              </div>
            )}

            {/* Error details (in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error Details (Development)
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs text-gray-700 overflow-auto max-h-32">
                  <div className="font-semibold mb-1">Error:</div>
                  <div className="mb-2">{this.state.error.message}</div>
                  {this.state.errorInfo?.componentStack && (
                    <>
                      <div className="font-semibold mb-1">Component Stack:</div>
                      <pre className="whitespace-pre-wrap text-xs">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              </details>
            )}

            <div className="mt-4 text-xs text-gray-500">
              If this problem persists, please check your internet connection
              or contact support.
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components
export function useWebSocketErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);
  const [isRecovering, setIsRecovering] = React.useState(false);

  const handleError = React.useCallback((error: Error) => {
    console.error('WebSocket error handled:', error);
    setError(error);
  }, []);

  const recover = React.useCallback(() => {
    setIsRecovering(true);
    setError(null);
    
    // Reset recovery state after a delay
    setTimeout(() => {
      setIsRecovering(false);
    }, 2000);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
    setIsRecovering(false);
  }, []);

  return {
    error,
    isRecovering,
    handleError,
    recover,
    clearError
  };
}

export default WebSocketErrorBoundary;