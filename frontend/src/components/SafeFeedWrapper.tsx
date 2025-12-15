import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface SafeFeedWrapperState {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

interface SafeFeedWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

class SafeFeedWrapper extends Component<SafeFeedWrapperProps, SafeFeedWrapperState> {
  constructor(props: SafeFeedWrapperProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): SafeFeedWrapperState {
    console.error('SafeFeedWrapper caught error:', error);
    return {
      hasError: true,
      error,
      errorInfo: error.message
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('SafeFeedWrapper componentDidCatch:', error, errorInfo);
    // Log to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // window.errorTracker?.captureException(error, { extra: errorInfo });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    // Force a refresh of the component
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="max-w-2xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-red-900 mb-2">
              Feed Error Detected
            </h2>
            <p className="text-red-700 mb-4">
              {this.state.errorInfo || 'An error occurred while loading the feed.'}
            </p>
            <div className="text-sm text-red-600 mb-4 font-mono bg-red-100 p-3 rounded">
              Error: {this.state.error?.name || 'Unknown'}<br/>
              Message: {this.state.error?.message || 'No details available'}
            </div>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Loading Feed
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SafeFeedWrapper;