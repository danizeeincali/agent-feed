/**
 * Error Testing Component - For Development Only
 * This component provides buttons to test different error scenarios
 */

import React, { useState } from 'react';
import { Bug, AlertTriangle, Wifi, Zap } from 'lucide-react';
import ErrorBoundary from './ErrorBoundary';
const ComponentErrorBoundary = ErrorBoundary;
// import { simulateError } from '../utils/errorHandling';

// Component that throws an error
const ErrorComponent: React.FC<{ errorType: string }> = ({ errorType }) => {
  switch (errorType) {
    case 'render':
      throw new Error('Render Error: Component failed to render');
    case 'async':
      setTimeout(() => {
        throw new Error('Async Error: Delayed error occurred');
      }, 1000);
      return <div>Component will error in 1 second...</div>;
    case 'network':
      throw new Error('Network Error: Failed to fetch data');
    case 'chunk':
      throw new Error('ChunkLoadError: Failed to load module');
    default:
      return <div>Normal component rendering</div>;
  }
};

const ErrorTesting: React.FC = () => {
  const [errorType, setErrorType] = useState<string | null>(null);
  const [testKey, setTestKey] = useState(0);

  const triggerError = (type: string) => {
    setErrorType(type);
    setTestKey(prev => prev + 1); // Force re-render
  };

  const clearErrors = () => {
    setErrorType(null);
    setTestKey(prev => prev + 1);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => triggerError('render')}
          className="text-left px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-200 flex items-center transition-colors"
        >
          <AlertTriangle className="w-5 h-5 mr-3" />
          <div>
            <div className="font-medium">Render Error</div>
            <div className="text-sm opacity-75">Test component render failure</div>
          </div>
        </button>
        
        <button
          onClick={() => triggerError('async')}
          className="text-left px-4 py-3 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg border border-orange-200 flex items-center transition-colors"
        >
          <Zap className="w-5 h-5 mr-3" />
          <div>
            <div className="font-medium">Async Error</div>
            <div className="text-sm opacity-75">Test delayed error handling</div>
          </div>
        </button>
        
        <button
          onClick={() => triggerError('network')}
          className="text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 flex items-center transition-colors"
        >
          <Wifi className="w-5 h-5 mr-3" />
          <div>
            <div className="font-medium">Network Error</div>
            <div className="text-sm opacity-75">Simulate network failure</div>
          </div>
        </button>
        
        <button
          onClick={() => simulateError('Manual test error')}
          className="text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg border border-purple-200 flex items-center transition-colors"
        >
          <Bug className="w-5 h-5 mr-3" />
          <div>
            <div className="font-medium">Global Error</div>
            <div className="text-sm opacity-75">Test global error handler</div>
          </div>
        </button>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={clearErrors}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-300 transition-colors"
        >
          Clear All Errors
        </button>
        
        {errorType && (
          <div className="text-sm text-gray-600">
            Currently testing: <span className="font-medium text-gray-900">{errorType} error</span>
          </div>
        )}
      </div>
      
      {errorType && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="mb-3">
            <h4 className="font-medium text-gray-900 mb-1">Error Test Results</h4>
            <p className="text-sm text-gray-600">Testing: {errorType} error scenario</p>
          </div>
          <ComponentErrorBoundary 
            componentName="TestErrorComponent"
            key={testKey}
          >
            <ErrorComponent errorType={errorType} />
          </ComponentErrorBoundary>
        </div>
      )}
    </div>
  );
};

export default ErrorTesting;