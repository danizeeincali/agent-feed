/**
 * AsyncErrorBoundary - Specialized error boundary for async/lazy-loaded components
 * Handles loading errors, chunk failures, and async component issues
 */

import React, { Component, ReactNode } from 'react';
import { Loader2, AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import FallbackComponents from '@/components/FallbackComponents';

interface Props {
  children: ReactNode;
  componentName: string;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  onRetry?: () => void;
  maxRetries?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  isLoading: boolean;
  retryCount: number;
  errorType: 'chunk' | 'async' | 'network' | 'component' | 'unknown';
}

class AsyncErrorBoundary extends Component<Props, State> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isLoading: false,
      retryCount: 0,
      errorType: 'unknown'
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Determine error type based on error message/name
    let errorType: State['errorType'] = 'unknown';
    
    if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
      errorType = 'chunk';
    } else if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
      errorType = 'network';
    } else if (error.name === 'TypeError' && error.message.includes('Cannot read')) {
      errorType = 'component';
    } else if (error.message.includes('Promise') || error.message.includes('async')) {
      errorType = 'async';
    }

    return {
      hasError: true,
      errorType
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`⚡ AsyncErrorBoundary [${this.props.componentName}] caught an error:`, error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Enhanced logging for async errors
    if (process.env.NODE_ENV === 'development') {
      console.group(`Async Component Error: ${this.props.componentName}`);
      console.error('Error Type:', this.state.errorType);
      console.error('Error:', error.message);
      console.error('Error Name:', error.name);
      console.error('Component Stack:', errorInfo.componentStack);
      console.error('Is Online:', navigator.onLine);
      console.groupEnd();
    }
  }

  getErrorMessage = (): string => {
    switch (this.state.errorType) {
      case 'chunk':
        return 'Failed to load application resources. This usually happens after an update.';
      case 'network':
        return 'Network connection issue. Please check your internet connection.';
      case 'component':
        return `The ${this.props.componentName} component failed to load properly.`;
      case 'async':
        return 'An asynchronous operation failed to complete.';
      default:
        return `The ${this.props.componentName} component encountered an unexpected error.`;
    }
  };

  getErrorSolution = (): string => {
    switch (this.state.errorType) {
      case 'chunk':
        return 'Try refreshing the page to download the latest version.';
      case 'network':
        return 'Check your internet connection and try again.';
      case 'component':
        return 'This component may be temporarily unavailable.';
      case 'async':
        return 'Try again in a moment or refresh the page.';
      default:
        return 'You can try reloading the component or refresh the page.';
    }
  };

  handleRetry = async () => {
    const maxRetries = this.props.maxRetries || 3;
    const newRetryCount = this.state.retryCount + 1;

    console.log(`🔄 AsyncErrorBoundary [${this.props.componentName}] retry attempt ${newRetryCount}/${maxRetries}`);

    this.setState({
      isLoading: true,
      retryCount: newRetryCount
    });

    // For chunk errors, add a delay to allow for cache clearing
    const delay = this.state.errorType === 'chunk' ? 2000 : 1000;
    
    this.retryTimeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isLoading: false
      });

      // Call custom retry handler if provided
      if (this.props.onRetry) {
        this.props.onRetry();
      }
    }, delay);
  };

  handleHardRefresh = () => {
    // Force a hard refresh to clear cache
    window.location.reload();
  };

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  render() {
    const maxRetries = this.props.maxRetries || 3;

    // Show loading state during retry
    if (this.state.isLoading) {
      return (
        this.props.loadingFallback || (
          <FallbackComponents.LoadingFallback 
            message={`Reloading ${this.props.componentName}...`}
            size="lg"
          />
        )
      );
    }

    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Chunk error gets special treatment
      if (this.state.errorType === 'chunk') {
        return <FallbackComponents.ChunkErrorFallback onRetry={this.handleHardRefresh} />;
      }

      // Default async error UI
      const isOnline = navigator.onLine;
      const canRetry = this.state.retryCount < maxRetries;

      return (
        <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg" data-testid="async-error-fallback">
          <div className="flex items-start space-x-4">
            {/* Error Icon */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                {this.state.errorType === 'network' ? (
                  isOnline ? <Wifi className="w-6 h-6 text-blue-600" /> : <WifiOff className="w-6 h-6 text-blue-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-blue-600" />
                )}
              </div>
            </div>

            {/* Error Content */}
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">
                Component Loading Issue
              </h3>
              
              <p className="text-blue-800 text-sm mb-1">
                <strong>{this.props.componentName}</strong>
              </p>
              
              <p className="text-blue-700 text-sm mb-3">
                {this.getErrorMessage()}
              </p>
              
              <p className="text-blue-600 text-xs mb-4">
                {this.getErrorSolution()}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {canRetry && (
                  <button
                    onClick={this.handleRetry}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors flex items-center font-medium"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Retry ({maxRetries - this.state.retryCount} left)
                  </button>
                )}

                <button
                  onClick={this.handleHardRefresh}
                  className="border border-blue-300 text-blue-700 px-4 py-2 rounded text-sm hover:bg-blue-100 transition-colors flex items-center font-medium"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh Page
                </button>
              </div>

              {/* Error Details (Development) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-blue-600 hover:text-blue-800 text-xs font-medium">
                    Error Details (Development)
                  </summary>
                  <div className="mt-2 p-2 bg-blue-100 rounded text-xs">
                    <div className="mb-1">
                      <strong>Type:</strong> {this.state.errorType}
                    </div>
                    <div className="mb-1">
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    <div className="mb-1">
                      <strong>Retries:</strong> {this.state.retryCount}/{maxRetries}
                    </div>
                    <div>
                      <strong>Online:</strong> {isOnline ? 'Yes' : 'No'}
                    </div>
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AsyncErrorBoundary;