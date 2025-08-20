/**
 * Bulletproof Fallback UI Components
 * Comprehensive set of fallback components to prevent white screens
 */

import React from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  Wifi, 
  WifiOff, 
  Loader2,
  Bot,
  BarChart3,
  Activity,
  Settings,
  Code,
  Workflow,
  Users,
  Clock,
  Monitor,
  Split,
  Shield,
  Zap
} from 'lucide-react';

// Generic loading fallback
export const LoadingFallback: React.FC<{ 
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ message = 'Loading...', size = 'md' }) => {
  const sizeClasses = {
    sm: 'p-4',
    md: 'p-8',
    lg: 'p-12'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`flex items-center justify-center ${sizeClasses[size]}`} data-testid="loading-fallback">
      <div className="flex items-center space-x-3">
        <Loader2 className={`${iconSizes[size]} animate-spin text-blue-600`} />
        <span className="text-gray-600 font-medium">{message}</span>
      </div>
    </div>
  );
};

// Component-specific error fallback
export const ComponentErrorFallback: React.FC<{
  componentName: string;
  error?: Error;
  retry?: () => void;
  minimal?: boolean;
}> = ({ componentName, error, retry, minimal = false }) => {
  if (minimal) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded text-center" data-testid="component-error-minimal">
        <AlertTriangle className="w-4 h-4 text-red-500 mx-auto mb-1" />
        <p className="text-red-600 text-xs">{componentName} unavailable</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg" data-testid="component-error-fallback">
      <div className="flex items-center text-red-700 mb-3">
        <AlertTriangle className="w-5 h-5 mr-2" />
        <h3 className="font-semibold">Component Error</h3>
      </div>
      <p className="text-red-600 text-sm mb-4">
        The {componentName} component encountered an error and couldn't render properly.
      </p>
      {retry && (
        <button
          onClick={retry}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors text-sm font-medium flex items-center"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Retry
        </button>
      )}
      {process.env.NODE_ENV === 'development' && error && (
        <details className="mt-4 text-xs">
          <summary className="cursor-pointer text-red-500 hover:text-red-700">
            Error Details (Development)
          </summary>
          <pre className="mt-2 p-2 bg-red-100 rounded overflow-auto max-h-32 text-red-800">
            {error.message}
            {error.stack && `
${error.stack}`}
          </pre>
        </details>
      )}
    </div>
  );
};

// Network error fallback
export const NetworkErrorFallback: React.FC<{
  retry?: () => void;
  isOnline?: boolean;
}> = ({ retry, isOnline = navigator.onLine }) => (
  <div className="p-6 bg-orange-50 border border-orange-200 rounded-lg text-center" data-testid="network-error-fallback">
    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
      {isOnline ? (
        <Wifi className="w-8 h-8 text-orange-600" />
      ) : (
        <WifiOff className="w-8 h-8 text-orange-600" />
      )}
    </div>
    <h3 className="text-lg font-semibold text-orange-900 mb-2">
      {isOnline ? 'Connection Problem' : 'No Internet Connection'}
    </h3>
    <p className="text-orange-700 mb-4">
      {isOnline 
        ? 'Unable to reach the server. Please check your connection and try again.'
        : 'You appear to be offline. Please check your internet connection.'
      }
    </p>
    {retry && (
      <button
        onClick={retry}
        className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium flex items-center mx-auto"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Try Again
      </button>
    )}
  </div>
);

// Empty state fallback
export const EmptyStateFallback: React.FC<{
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
}> = ({ title, description, action, icon }) => (
  <div className="p-12 text-center" data-testid="empty-state-fallback">
    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
      {icon || <Bot className="w-10 h-10 text-gray-400" />}
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
    <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
    {action && (
      <button
        onClick={action.onClick}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        {action.label}
      </button>
    )}
  </div>
);

// Route-specific fallbacks
export const DashboardFallback: React.FC = () => (
  <div className="p-6 space-y-6" data-testid="dashboard-fallback">
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    </div>
  </div>
);

export const FeedFallback: React.FC = () => (
  <div className="space-y-6" data-testid="feed-fallback">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-1/6"></div>
          </div>
        </div>
        <div className="space-y-2 mb-4">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
        <div className="flex space-x-4">
          <div className="h-8 bg-gray-200 rounded w-16"></div>
          <div className="h-8 bg-gray-200 rounded w-16"></div>
          <div className="h-8 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    ))}
  </div>
);

export const AnalyticsFallback: React.FC = () => (
  <div className="p-6 space-y-6" data-testid="analytics-fallback">
    <div className="flex items-center space-x-3 mb-6">
      <BarChart3 className="w-8 h-8 text-gray-400" />
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
        <p className="text-gray-600">Loading performance metrics...</p>
      </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-48 bg-gray-200 rounded"></div>
      </div>
      <div className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-48 bg-gray-200 rounded"></div>
      </div>
    </div>
  </div>
);

export const AgentManagerFallback: React.FC = () => (
  <div className="p-6 space-y-6" data-testid="agent-manager-fallback">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-3">
        <Users className="w-8 h-8 text-gray-400" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent Manager</h2>
          <p className="text-gray-600">Loading agent configurations...</p>
        </div>
      </div>
      <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
          <div className="flex space-x-2">
            <div className="h-6 bg-gray-200 rounded w-16"></div>
            <div className="h-6 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const WorkflowFallback: React.FC = () => (
  <div className="p-6 space-y-6" data-testid="workflow-fallback">
    <div className="flex items-center space-x-3 mb-6">
      <Workflow className="w-8 h-8 text-gray-400" />
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Workflow Visualization</h2>
        <p className="text-gray-600">Loading workflow diagrams...</p>
      </div>
    </div>
    <div className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
      <div className="h-96 bg-gray-200 rounded flex items-center justify-center">
        <div className="text-center">
          <Workflow className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Workflow visualization loading...</p>
        </div>
      </div>
    </div>
  </div>
);

export const ActivityFallback: React.FC = () => (
  <div className="p-6 space-y-6" data-testid="activity-fallback">
    <div className="flex items-center space-x-3 mb-6">
      <Activity className="w-8 h-8 text-gray-400" />
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Live Activity</h2>
        <p className="text-gray-600">Connecting to activity stream...</p>
      </div>
    </div>
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3 animate-pulse">
            <div className="w-2 h-2 bg-gray-200 rounded-full"></div>
            <Clock className="w-4 h-4 text-gray-300" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const SettingsFallback: React.FC = () => (
  <div className="p-6 space-y-6" data-testid="settings-fallback">
    <div className="flex items-center space-x-3 mb-6">
      <Settings className="w-8 h-8 text-gray-400" />
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600">Loading configuration options...</p>
      </div>
    </div>
    <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
      <div className="space-y-6">
        <div>
          <div className="h-5 bg-gray-200 rounded w-1/4 mb-3"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
        <div>
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
        <div className="flex space-x-3">
          <div className="h-10 bg-gray-200 rounded w-24"></div>
          <div className="h-10 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    </div>
  </div>
);

export const ClaudeCodeFallback: React.FC = () => (
  <div className="p-6 space-y-6" data-testid="claude-code-fallback">
    <div className="flex items-center space-x-3 mb-6">
      <Code className="w-8 h-8 text-gray-400" />
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Claude Code</h2>
        <p className="text-gray-600">Initializing code interface...</p>
      </div>
    </div>
    <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
      <div className="h-96 bg-gray-200 rounded flex items-center justify-center">
        <div className="text-center">
          <Code className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Code interface loading...</p>
        </div>
      </div>
    </div>
  </div>
);

// Fallback router for unknown routes
export const NotFoundFallback: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" data-testid="not-found-fallback">
    <div className="text-center">
      <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
        <Home className="w-12 h-12 text-gray-400" />
      </div>
      <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">Page Not Found</h2>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <a
        href="/"
        className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        <Home className="w-5 h-5 mr-2" />
        Go Home
      </a>
    </div>
  </div>
);

// Additional route-specific fallbacks for complete coverage
export const DualInstanceFallback: React.FC = () => (
  <div className="p-6 space-y-6" data-testid="dual-instance-fallback">
    <div className="flex items-center space-x-3 mb-6">
      <Split className="w-8 h-8 text-gray-400" />
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dual Instance Dashboard</h2>
        <p className="text-gray-600">Loading dual Claude Code instances...</p>
      </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded flex items-center justify-center">
          <Monitor className="w-12 h-12 text-gray-400" />
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded flex items-center justify-center">
          <Monitor className="w-12 h-12 text-gray-400" />
        </div>
      </div>
    </div>
  </div>
);

export const AgentProfileFallback: React.FC = () => (
  <div className="p-6 space-y-6" data-testid="agent-profile-fallback">
    <div className="bg-white rounded-lg border border-gray-200 animate-pulse">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-1"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="text-center">
              <div className="h-12 bg-gray-200 rounded w-16 mx-auto mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Chunk Error Fallback for lazy-loaded components
export const ChunkErrorFallback: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4" data-testid="chunk-error-fallback">
    <div className="max-w-lg w-full bg-white rounded-xl shadow-xl p-8 text-center border border-orange-200">
      <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Zap className="w-10 h-10 text-orange-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">
        Loading Issue
      </h1>
      <p className="text-gray-600 leading-relaxed mb-6">
        We're having trouble loading this part of the application. This usually resolves itself with a quick refresh.
      </p>
      <div className="space-y-3">
        <button
          onClick={onRetry || (() => window.location.reload())}
          className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-all duration-200 flex items-center justify-center font-medium"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Refresh Page
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="w-full border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center justify-center font-medium"
        >
          <Home className="w-5 h-5 mr-2" />
          Go Home
        </button>
      </div>
    </div>
  </div>
);

// Critical Error Fallback for app-breaking errors
export const CriticalErrorFallback: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4" data-testid="critical-error-fallback">
    <div className="max-w-lg w-full bg-white rounded-xl shadow-xl p-8 text-center border border-red-200">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Shield className="w-10 h-10 text-red-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">
        System Error
      </h1>
      <p className="text-gray-600 leading-relaxed mb-6">
        AgentLink encountered a critical error. The system has been automatically reported this issue.
        Please try refreshing the page or contact support if the problem persists.
      </p>
      <div className="space-y-3">
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-all duration-200 flex items-center justify-center font-medium"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Refresh Application
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="w-full border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center justify-center font-medium"
        >
          <Home className="w-5 h-5 mr-2" />
          Start Fresh
        </button>
      </div>
      <div className="mt-6 text-xs text-gray-500">
        Error ID: {Date.now().toString(36)}
      </div>
    </div>
  </div>
);

export default {
  LoadingFallback,
  ComponentErrorFallback,
  NetworkErrorFallback,
  EmptyStateFallback,
  DashboardFallback,
  FeedFallback,
  AnalyticsFallback,
  AgentManagerFallback,
  WorkflowFallback,
  ActivityFallback,
  SettingsFallback,
  ClaudeCodeFallback,
  DualInstanceFallback,
  AgentProfileFallback,
  NotFoundFallback,
  ChunkErrorFallback,
  CriticalErrorFallback
};