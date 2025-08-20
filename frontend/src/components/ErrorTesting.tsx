/**
 * Error Testing Component - For Development Only
 * This component provides buttons to test different error scenarios
 */

import React, { useState } from 'react';
import { Bug, AlertTriangle, Wifi, Zap } from 'lucide-react';
import { ComponentErrorBoundary } from './ErrorBoundary';
import { simulateError } from '@/utils/errorHandling';

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

  if (process.env.NODE_ENV !== 'development') {
    return null; // Only show in development
  }

  const triggerError = (type: string) => {
    setErrorType(type);
    setTestKey(prev => prev + 1); // Force re-render
  };

  const clearErrors = () => {
    setErrorType(null);
    setTestKey(prev => prev + 1);
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm z-50">
      <div className="flex items-center mb-3">
        <Bug className="w-5 h-5 text-orange-600 mr-2" />
        <h3 className="font-semibold text-gray-900">Error Testing</h3>
      </div>
      
      <div className="space-y-2 mb-4">
        <button
          onClick={() => triggerError('render')}
          className="w-full text-left px-3 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded border border-red-200 flex items-center"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Render Error
        </button>
        
        <button
          onClick={() => triggerError('async')}
          className="w-full text-left px-3 py-2 text-sm bg-orange-50 hover:bg-orange-100 text-orange-700 rounded border border-orange-200 flex items-center"
        >
          <Zap className="w-4 h-4 mr-2" />
          Async Error
        </button>
        
        <button
          onClick={() => triggerError('network')}
          className="w-full text-left px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 flex items-center"
        >
          <Wifi className="w-4 h-4 mr-2" />
          Network Error
        </button>
        
        <button
          onClick={() => simulateError('Manual test error')}
          className="w-full text-left px-3 py-2 text-sm bg-purple-50 hover:bg-purple-100 text-purple-700 rounded border border-purple-200 flex items-center"
        >
          <Bug className="w-4 h-4 mr-2" />
          Global Error
        </button>
      </div>
      
      <button
        onClick={clearErrors}
        className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300"
      >
        Clear Errors
      </button>
      
      {errorType && (
        <div className="mt-4 p-3 bg-gray-50 rounded border">
          <p className="text-xs text-gray-600 mb-2">Testing: {errorType} error</p>
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