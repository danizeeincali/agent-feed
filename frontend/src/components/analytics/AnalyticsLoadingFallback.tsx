import React from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

interface AnalyticsLoadingFallbackProps {
  message?: string;
  showError?: boolean;
  error?: string;
  onRetry?: () => void;
  retryable?: boolean;
}

export const AnalyticsLoadingFallback: React.FC<AnalyticsLoadingFallbackProps> = ({
  message = "Loading analytics...",
  showError = false,
  error,
  onRetry,
  retryable = false
}) => {
  if (showError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[400px] bg-white border border-red-200 rounded-lg">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-700 mb-2">Failed to Load Analytics</h3>
        <p className="text-sm text-red-600 text-center mb-4 max-w-md">
          {error || "There was an error loading the analytics component. This might be due to a network issue or component failure."}
        </p>
        {retryable && onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-[400px] bg-white border border-gray-200 rounded-lg">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
      <p className="text-gray-600 text-center">{message}</p>
      <div className="mt-4 text-xs text-gray-500">
        Loading Claude SDK Analytics components...
      </div>
    </div>
  );
};

export default AnalyticsLoadingFallback;