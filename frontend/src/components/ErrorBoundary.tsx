import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';
import { AlertTriangle, RefreshCw, Home, Bug, Mail, Shield, Download, Copy } from 'lucide-react';
import { 
  errorHandler, 
  captureComponentError, 
  ErrorDetails,
  createErrorBoundaryConfig,
  logErrorBoundaryRender 
} from '@/utils/errorHandling';

// Re-export types from errorHandling utility
export type { ErrorDetails } from '@/utils/errorHandling';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

// Enhanced fallback component with better UX and 2024 best practices
const ErrorFallback: React.FC<FallbackProps & { 
  errorBoundaryProps?: any;
  componentName?: string;
}> = ({ 
  error, 
  resetErrorBoundary,
  errorBoundaryProps,
  componentName = 'Component'
}) => {
  const [errorId, setErrorId] = React.useState<string>('');
  const [reportSent, setReportSent] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    // Capture error with enhanced context
    const id = captureComponentError(
      error, 
      componentName,
      errorBoundaryProps?.props,
      errorBoundaryProps?.state
    );
    setErrorId(id);
  }, [error, componentName, errorBoundaryProps]);

  const handleReportError = async () => {
    try {
      setReportSent(true);
      
      // Additional user feedback could be collected here
      const feedback = prompt('Optional: Describe what you were doing when this error occurred:');
      
      if (feedback) {
        console.log('User feedback:', feedback, 'Error ID:', errorId);
        // Send feedback to monitoring service
      }
      
      // Show success message
      setTimeout(() => setReportSent(false), 3000);
    } catch (err) {
      console.error('Failed to send error report:', err);
      setReportSent(false);
    }
  };

  const handleCopyErrorId = async () => {
    try {
      await navigator.clipboard.writeText(errorId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy error ID:', err);
    }
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4" 
         data-testid="error-boundary-fallback"
         role="alert"
         aria-live="polite">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-xl p-8 text-center border border-gray-200">
        <div className="mb-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10 text-red-600" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Oops! Something went wrong
          </h1>
          <p className="text-gray-600 leading-relaxed">
            Don't worry, this is just a temporary hiccup. Your data is safe and the issue has been logged.
            You can try refreshing the page or return to the home page.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <button
            onClick={resetErrorBoundary}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center justify-center font-medium shadow-md hover:shadow-lg"
            aria-label="Try to recover from the error"
          >
            <RefreshCw className="w-5 h-5 mr-2" aria-hidden="true" />
            Try Again
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleReload}
              className="border-2 border-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center justify-center font-medium text-sm"
              aria-label="Reload the page"
            >
              <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
              Reload
            </button>
            
            <button
              onClick={handleGoHome}
              className="border-2 border-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center justify-center font-medium text-sm"
              aria-label="Go back to the home page"
            >
              <Home className="w-4 h-4 mr-2" aria-hidden="true" />
              Home
            </button>
          </div>
        </div>

        {/* Error ID Section */}
        {errorId && (
          <div className="mb-4 p-3 bg-gray-100 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Error Reference ID:</p>
                <p className="text-sm font-mono text-gray-700">{errorId}</p>
              </div>
              <button
                onClick={handleCopyErrorId}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Copy error ID"
              >
                {copied ? (
                  <Shield className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}

        <details className="text-left mb-4">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center">
            <Bug className="w-4 h-4 mr-1" aria-hidden="true" />
            Report this issue
          </summary>
          <div className="mt-3 p-4 bg-gray-50 rounded-lg border">
            <p className="text-sm text-gray-600 mb-3">
              Help us improve by reporting this error. Your report helps us fix issues faster.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={handleReportError}
                disabled={reportSent}
                className={`text-sm px-4 py-2 rounded transition-colors flex items-center ${
                  reportSent 
                    ? 'bg-green-600 text-white cursor-not-allowed' 
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                {reportSent ? (
                  <>
                    <Shield className="w-4 h-4 mr-1" aria-hidden="true" />
                    Report Sent
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-1" aria-hidden="true" />
                    Send Report
                  </>
                )}
              </button>
              
              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={() => {
                    const errorLog = errorHandler.exportErrorLog();
                    const blob = new Blob([errorLog], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `error-log-${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Download className="w-4 h-4 mr-1" aria-hidden="true" />
                  Export Log
                </button>
              )}
            </div>
          </div>
        </details>

        {process.env.NODE_ENV === 'development' && (
          <details className="text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              🔧 Developer Info
            </summary>
            <div className="mt-3 p-4 bg-red-50 rounded-lg border border-red-200 text-left">
              <div className="text-xs text-red-800 space-y-2">
                <div>
                  <strong>Error:</strong> {error.name}
                </div>
                <div>
                  <strong>Message:</strong> {error.message}
                </div>
                <div>
                  <strong>Component:</strong> {componentName}
                </div>
                <div>
                  <strong>Error ID:</strong> {errorId}
                </div>
                <div>
                  <strong>Timestamp:</strong> {new Date().toISOString()}
                </div>
                <div>
                  <strong>URL:</strong> {window.location.href}
                </div>
                {errorBoundaryProps?.props && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium">Component Props</summary>
                    <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto max-h-32 whitespace-pre-wrap border">
                      {JSON.stringify(errorBoundaryProps.props, null, 2)}
                    </pre>
                  </details>
                )}
                {error.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium">Stack Trace</summary>
                    <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto max-h-40 whitespace-pre-wrap border">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

export class LegacyErrorBoundary extends Component<Props, State> {
  private componentName: string;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
    this.componentName = props.children?.toString() || 'LegacyErrorBoundary';
  }

  static getDerivedStateFromError(error: Error): State {
    const errorId = `legacy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return { hasError: true, error, errorId };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Enhanced error logging with context
    const errorId = captureComponentError(
      error,
      this.componentName,
      this.props,
      this.state
    );
    
    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Log boundary render state
    logErrorBoundaryRender(this.componentName, true);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    logErrorBoundaryRender(this.componentName, this.state.hasError);
    
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <ErrorFallback 
          error={this.state.error!} 
          resetErrorBoundary={this.handleReset}
          componentName={this.componentName}
          errorBoundaryProps={{ props: this.props, state: this.state }}
        />
      );
    }
    return this.props.children;
  }
}

// Main ErrorBoundary component using react-error-boundary with 2024 enhancements
export const ErrorBoundary: React.FC<Props & { componentName?: string }> = ({ 
  children, 
  fallback, 
  onError,
  isolate = false,
  resetOnPropsChange = true,
  resetKeys = [],
  componentName = 'ErrorBoundary'
}) => {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    // Enhanced error capture with all context
    const errorId = captureComponentError(
      error,
      componentName,
      { children, fallback, resetKeys },
      { hasError: true }
    );
    
    // Call custom error handler if provided
    onError?.(error, errorInfo);

    // Log boundary render state
    logErrorBoundaryRender(componentName, true);
  };

  if (isolate) {
    // Use legacy class-based error boundary for isolation
    return (
      <LegacyErrorBoundary fallback={fallback} onError={onError}>
        {children}
      </LegacyErrorBoundary>
    );
  }

  // Custom fallback component with enhanced context
  const FallbackComponent: React.FC<FallbackProps> = (props) => {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <ErrorFallback 
        {...props}
        componentName={componentName}
        errorBoundaryProps={{ children, fallback, resetKeys }}
      />
    );
  };

  return (
    <ReactErrorBoundary
      FallbackComponent={FallbackComponent}
      onError={handleError}
      resetKeys={resetKeys}
    >
      {children}
    </ReactErrorBoundary>
  );
};

// Enhanced RouteErrorBoundary with route-specific handling
export const RouteErrorBoundary: React.FC<{ 
  children: ReactNode; 
  routeName: string;
  fallback?: ReactNode;
}> = ({ 
  children, 
  routeName,
  fallback 
}) => {
  return (
    <ErrorBoundary
      componentName={`Route-${routeName}`}
      fallback={fallback}
      onError={(error, errorInfo) => {
        captureComponentError(error, `Route-${routeName}`, { routeName }, { hasError: true });
      }}
      resetKeys={[routeName, window.location.pathname]}
    >
      {children}
    </ErrorBoundary>
  );
};

export const ComponentErrorBoundary: React.FC<{ 
  children: ReactNode; 
  componentName: string;
  fallback?: ReactNode;
  minimal?: boolean;
  isolate?: boolean;
}> = ({ 
  children, 
  componentName, 
  fallback, 
  minimal = false,
  isolate = true 
}) => {
  const defaultFallback = minimal ? (
    <div className="p-2 bg-red-50 border border-red-200 rounded text-center" data-testid={`${componentName}-error-minimal`}>
      <AlertTriangle className="w-4 h-4 text-red-500 mx-auto mb-1" />
      <p className="text-red-600 text-xs">{componentName} Error</p>
    </div>
  ) : (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg" data-testid={`${componentName}-error`}>
      <div className="flex items-center text-red-700">
        <AlertTriangle className="w-5 h-5 mr-2" />
        <span className="font-medium">Component Error</span>
      </div>
      <p className="text-red-600 text-sm mt-1">
        The {componentName} component encountered an error and couldn't render properly.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-3 text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
      >
        Reload Page
      </button>
    </div>
  );

  return (
    <ErrorBoundary
      componentName={componentName}
      fallback={fallback || defaultFallback}
      onError={(error, errorInfo) => {
        captureComponentError(error, componentName, { minimal, isolate }, { hasError: true });
      }}
      isolate={isolate}
      resetKeys={[componentName]}
    >
      {children}
    </ErrorBoundary>
  );
};

// Async ErrorBoundary for handling lazy-loaded components
export const AsyncErrorBoundary: React.FC<{
  children: ReactNode;
  componentName: string;
  fallback?: ReactNode;
  onChunkError?: () => void;
}> = ({ children, componentName, fallback, onChunkError }) => {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
      onChunkError?.();
      // Auto-reload on chunk errors
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <ErrorBoundary
      componentName={`Async-${componentName}`}
      fallback={fallback}
      onError={handleError}
      resetKeys={[componentName]}
    >
      {children}
    </ErrorBoundary>
  );
};

// Global ErrorBoundary for the entire app
export const GlobalErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      componentName="GlobalErrorBoundary"
      onError={(error, errorInfo) => {
        // Log critical app-level errors
        captureComponentError(error, 'GlobalErrorBoundary', { global: true }, { hasError: true });
      }}
      resetKeys={[window.location.pathname]}
    >
      {children}
    </ErrorBoundary>
  );
};