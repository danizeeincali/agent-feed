/**
 * Lazy Loading Wrapper for Token Analytics Dashboard
 * Implements dynamic import with proper error handling and fallbacks
 */

import { lazy, Suspense } from 'react';
import { ErrorBoundary, TokenAnalyticsLoadingFallback } from './ErrorBoundary';

// Dynamic import with retry logic
const TokenAnalyticsDashboard = lazy(() =>
  import('./TokenAnalyticsDashboard.tsx')
    .then(module => ({ default: module.default }))
    .catch(error => {
      console.error('Failed to load TokenAnalyticsDashboard:', error);

      // Retry logic for failed imports
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          import('./TokenAnalyticsDashboard.tsx')
            .then(module => resolve({ default: module.default }))
            .catch(retryError => {
              console.error('Retry failed for TokenAnalyticsDashboard:', retryError);

              // Fallback component for permanent failures
              const FallbackComponent = () => (
                <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h2 className="text-lg font-semibold text-yellow-800 mb-2">
                    Component Loading Failed
                  </h2>
                  <p className="text-yellow-700 mb-4">
                    The Token Analytics Dashboard could not be loaded. This might be due to:
                  </p>
                  <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1 mb-4">
                    <li>Network connectivity issues</li>
                    <li>Chart.js dependencies not loading</li>
                    <li>Browser compatibility problems</li>
                    <li>JavaScript execution errors</li>
                  </ul>
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                  >
                    Reload Page
                  </button>
                </div>
              );

              resolve({ default: FallbackComponent });
            });
        }, 1000); // 1 second retry delay
      });
    })
);

// Main lazy wrapper component
export const LazyTokenAnalyticsDashboard = () => {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('TokenAnalyticsDashboard Error Boundary:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
        });

        // You could send this to an error reporting service
        // errorReporting.captureError(error, errorInfo);
      }}
    >
      <Suspense fallback={<TokenAnalyticsLoadingFallback />}>
        <TokenAnalyticsDashboard />
      </Suspense>
    </ErrorBoundary>
  );
};

export default LazyTokenAnalyticsDashboard;