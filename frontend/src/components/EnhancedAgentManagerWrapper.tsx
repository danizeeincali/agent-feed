import React from 'react';
import EnhancedAgentManager from './EnhancedAgentManager';
import { nldLogger } from '../utils/nld-logger';

interface Props {
  className?: string;
  agents?: any;
  onActivateAgent?: (id: string) => void;
  onDeactivateAgent?: (id: string) => void;
}

// Error boundary for Enhanced Agent Manager
class EnhancedAgentManagerErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    nldLogger.renderFailure('EnhancedAgentManager', error, null, errorInfo);
    console.error('Enhanced Agent Manager Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-4">
              Enhanced Agent Manager Failed to Load
            </h2>
            <p className="text-red-700 mb-4">
              The Enhanced Agent Manager encountered an error during initialization.
            </p>
            <details className="bg-red-100 p-4 rounded border">
              <summary className="cursor-pointer font-medium text-red-800">
                Error Details
              </summary>
              <pre className="mt-2 text-sm text-red-700 whitespace-pre-wrap">
                {this.state.error?.message}
                {this.state.error?.stack && '\n\nStack Trace:\n' + this.state.error.stack}
              </pre>
            </details>
            <div className="mt-4 space-x-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Reload Page
              </button>
              <button
                onClick={() => window.location.href = '/agents'}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Use Basic Agent Manager
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Simple fallback component without WebSocket
const SimpleEnhancedAgentManager: React.FC<Props> = ({ className, agents, onActivateAgent, onDeactivateAgent }) => {
  const [loading, setLoading] = React.useState(false);

  return (
    <div className={`max-w-7xl mx-auto p-6 ${className || ''}`}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              🤖 Agents
            </h1>
            <p className="text-gray-600 mt-2">
              Manage agents across Production and Development environments
            </p>
            <p className="text-sm text-yellow-600 mt-1">
              ⚠️ Running in fallback mode (WebSocket disabled)
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setLoading(!loading)}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {['Production', 'Development', 'Unified'].map(tab => (
            <button
              key={tab}
              className="py-2 px-1 border-b-2 font-medium text-sm flex items-center transition-colors border-blue-500 text-blue-600"
              role="tab"
            >
              <span className="ml-2">{tab}</span>
              <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                0
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Loading placeholder */}
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="text-6xl mb-4">🚧</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Enhanced Agent Manager</h3>
        <p className="text-gray-500 mb-6">
          Component is loading in safe mode. WebSocket integration is disabled to prevent errors.
        </p>
        <div className="space-y-4">
          <div className="flex justify-center space-x-4">
            <button className="px-4 py-2 bg-green-100 text-green-800 rounded">
              Production (0 agents)
            </button>
            <button className="px-4 py-2 bg-blue-100 text-blue-800 rounded">
              Development (0 agents)
            </button>
          </div>
          <div className="text-sm text-gray-500">
            The component structure is working. API integration and real-time features will be restored in the next fix iteration.
          </div>
        </div>
      </div>
    </div>
  );
};

// Main wrapper component
const EnhancedAgentManagerWrapper: React.FC<Props> = (props) => {
  const [useFallback, setUseFallback] = React.useState(false);

  // Try to render full component first
  if (useFallback) {
    return <SimpleEnhancedAgentManager {...props} />;
  }

  return (
    <EnhancedAgentManagerErrorBoundary>
      <React.Suspense fallback={
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading Enhanced Agent Manager...</span>
          </div>
        </div>
      }>
        <EnhancedAgentManager {...props} />
      </React.Suspense>
    </EnhancedAgentManagerErrorBoundary>
  );
};

export default EnhancedAgentManagerWrapper;