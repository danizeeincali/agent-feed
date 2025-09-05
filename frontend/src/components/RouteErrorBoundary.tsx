/**
 * RouteErrorBoundary - Route-specific error boundary with fallback support
 * Provides more granular error handling for individual routes
 */

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, Home } from 'lucide-react';
import FallbackComponents from '@/components/FallbackComponents';

interface Props {
  children: ReactNode;
  routeName: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

class RouteErrorBoundary extends Component<Props, State> {
  private maxRetries = 2;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`🛑 RouteErrorBoundary [${this.props.routeName}] caught an error:`, error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report route-specific error
    if (process.env.NODE_ENV === 'development') {
      console.group(`Route Error: ${this.props.routeName}`);
      console.error('Error:', error.message);
      console.error('Component Stack:', errorInfo.componentStack);
      console.error('Full Stack:', error.stack);
      console.groupEnd();
    }
  }

  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;
    console.log(`🔄 RouteErrorBoundary [${this.props.routeName}] retry attempt ${newRetryCount}/${this.maxRetries}`);
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: newRetryCount
    });
  };

  handleGoBack = () => {
    window.history.back();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // If custom fallback provided, use it
      if (this.props.fallback) {
        return (
          <div className="min-h-screen flex flex-col">
            <div className="p-4 bg-yellow-50 border-b border-yellow-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800 font-medium">
                    {this.props.routeName} Route Error - Using Fallback
                  </span>
                </div>
                {this.state.retryCount < this.maxRetries && (
                  <button
                    onClick={this.handleRetry}
                    className="text-sm text-yellow-700 hover:text-yellow-900 font-medium"
                  >
                    Retry Original
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1">
              {this.props.fallback}
            </div>
          </div>
        );
      }

      // Default route error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-8 text-center border border-orange-200">
            {/* Error Icon */}
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>

            {/* Error Title */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Page Error
            </h2>
            
            <h3 className="text-lg font-semibold text-orange-700 mb-4">
              {this.props.routeName}
            </h3>

            <p className="text-gray-600 leading-relaxed mb-6">
              This page encountered an error and couldn't load properly. 
              You can try refreshing or go back to continue using the app.
            </p>

            {/* Error Details (Development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-3 bg-orange-50 rounded border border-orange-200 text-left">
                <p className="font-semibold text-orange-800 text-sm mb-1">Development Error:</p>
                <pre className="text-xs text-orange-700 whitespace-pre-wrap overflow-auto max-h-20 font-mono">
                  {this.state.error.message}
                </pre>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Retry Button (if retries available) */}
              {this.state.retryCount < this.maxRetries && (
                <button
                  onClick={this.handleRetry}
                  className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center font-medium"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                </button>
              )}

              {/* Go Back Button */}
              <button
                onClick={this.handleGoBack}
                className="w-full border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center font-medium"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </button>

              {/* Home Button */}
              <button
                onClick={this.handleGoHome}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center font-medium"
              >
                <Home className="w-4 h-4 mr-2" />
                Home Page
              </button>
            </div>

            {/* Retry Count Info */}
            {this.state.retryCount > 0 && (
              <div className="mt-6 p-2 bg-gray-100 rounded text-xs text-gray-600">
                Retry attempts: {this.state.retryCount}/{this.maxRetries}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;