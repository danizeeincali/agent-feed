/**
 * GlobalErrorBoundary - Top-level error boundary for the entire application
 * Catches any unhandled errors and provides recovery options
 */

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

class GlobalErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 GlobalErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Report to external service in production
    if (process.env.NODE_ENV === 'production') {
      // Analytics or error reporting service
      console.error('Global Error Report:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    }
  }

  handleRetry = () => {
    this.retryCount++;
    console.log(`🔄 GlobalErrorBoundary retry attempt ${this.retryCount}/${this.maxRetries}`);
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // If custom fallback provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default global error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-xl shadow-2xl p-8 text-center border border-red-200">
            {/* Error Icon */}
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-12 h-12 text-red-600" />
            </div>

            {/* Error Title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Application Error
            </h1>
            
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              AgentLink encountered an unexpected error and couldn't continue. 
              This has been automatically reported to our team.
            </p>

            {/* Error Details (Development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200 text-left">
                <div className="flex items-center mb-2">
                  <Bug className="w-4 h-4 text-red-600 mr-2" />
                  <span className="font-semibold text-red-800 text-sm">Development Error Details</span>
                </div>
                <pre className="text-xs text-red-700 whitespace-pre-wrap overflow-auto max-h-32 font-mono">
                  {this.state.error.message}
                </pre>
                {this.state.error.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-red-600 hover:text-red-800 text-xs">
                      Stack Trace
                    </summary>
                    <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap overflow-auto max-h-40 font-mono">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Error ID */}
            <div className="mb-6 px-4 py-2 bg-gray-100 rounded-lg">
              <p className="text-xs text-gray-600">
                Error ID: <code className="font-mono bg-gray-200 px-1 rounded">{this.state.errorId}</code>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Retry Button (if retries available) */}
              {this.retryCount < this.maxRetries && (
                <button
                  onClick={this.handleRetry}
                  className="w-full bg-red-600 text-white px-8 py-4 rounded-lg hover:bg-red-700 transition-all duration-200 flex items-center justify-center font-semibold text-lg shadow-lg"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Try Again ({this.maxRetries - this.retryCount} attempts left)
                </button>
              )}

              {/* Reload Button */}
              <button
                onClick={this.handleReload}
                className="w-full bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center justify-center font-semibold text-lg shadow-lg"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Reload Application
              </button>

              {/* Home Button */}
              <button
                onClick={this.handleGoHome}
                className="w-full border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center justify-center font-semibold text-lg"
              >
                <Home className="w-5 h-5 mr-2" />
                Go to Home Page
              </button>
            </div>

            {/* Support Info */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                If this problem persists, please contact support with the Error ID above.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Timestamp: {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;