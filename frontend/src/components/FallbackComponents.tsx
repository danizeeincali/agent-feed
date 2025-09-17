/**
 * TDD London School: Fallback Components Mock Implementation
 * 
 * Provides all the fallback components required by App.tsx Suspense boundaries.
 * This is the critical missing piece causing the white screen.
 */

import React from 'react';

interface FallbackProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

// Loading fallback with customizable message and size
export const LoadingFallback: React.FC<FallbackProps> = ({ 
  message = 'Loading...', 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  };

  return (
    <div className="flex items-center justify-center p-4" data-testid="loading-fallback">
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 mr-2 ${sizeClasses[size]}`}></div>
      <span className="text-gray-600">{message}</span>
    </div>
  );
};

// Feed-specific loading fallback
export const FeedFallback: React.FC = () => (
  <div className="p-6 bg-gray-50 rounded-lg" data-testid="feed-fallback">
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>
    <p className="text-gray-500 mt-4">Loading social media feed...</p>
  </div>
);

// Dual instance fallback for Claude managers  
export const DualInstanceFallback: React.FC = () => (
  <div className="p-6 bg-blue-50 rounded-lg" data-testid="dual-instance-fallback">
    <div className="flex items-center space-x-2 mb-4">
      <div className="w-4 h-4 bg-blue-500 rounded animate-pulse"></div>
      <span className="text-blue-700">Initializing Claude instances...</span>
    </div>
    <div className="space-y-2">
      <div className="h-2 bg-blue-200 rounded w-full animate-pulse"></div>
      <div className="h-2 bg-blue-200 rounded w-3/4 animate-pulse"></div>
    </div>
  </div>
);

// Dashboard loading fallback
export const DashboardFallback: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6" data-testid="dashboard-fallback">
    {[1, 2, 3].map(i => (
      <div key={i} className="p-4 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    ))}
  </div>
);

// Agent manager loading fallback
export const AgentManagerFallback: React.FC = () => (
  <div className="p-6" data-testid="agent-manager-fallback">
    <div className="animate-pulse space-y-4">
      <div className="flex space-x-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  </div>
);

// Agent profile fallback
export const AgentProfileFallback: React.FC = () => (
  <div className="p-6" data-testid="agent-profile-fallback">
    <div className="animate-pulse">
      <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4"></div>
      <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
    </div>
  </div>
);

// Workflow visualization fallback
export const WorkflowFallback: React.FC = () => (
  <div className="p-6" data-testid="workflow-fallback">
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading workflow visualization...</p>
      </div>
    </div>
  </div>
);

// Analytics fallback
export const AnalyticsFallback: React.FC = () => (
  <div className="p-6" data-testid="analytics-fallback">
    <div className="grid grid-cols-2 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
      ))}
    </div>
  </div>
);

// Claude Code terminal fallback
export const ClaudeCodeFallback: React.FC = () => (
  <div className="p-6 bg-gray-900 text-green-400 rounded-lg font-mono" data-testid="claude-code-fallback">
    <div className="animate-pulse">
      <div className="flex items-center mb-4">
        <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
        <span>Claude Code Terminal Loading...</span>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-700 rounded w-full"></div>
        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
        <div className="h-4 bg-gray-700 rounded w-1/2"></div>
      </div>
    </div>
  </div>
);

// Activity feed fallback
export const ActivityFallback: React.FC = () => (
  <div className="p-6" data-testid="activity-fallback">
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Settings fallback
export const SettingsFallback: React.FC = () => (
  <div className="p-6" data-testid="settings-fallback">
    <div className="space-y-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="space-y-2">
          <div className="h-5 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
        </div>
      ))}
    </div>
  </div>
);

// 404 Not Found fallback
export const NotFoundFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-64" data-testid="not-found-fallback">
    <div className="text-6xl mb-4">🔍</div>
    <h2 className="text-2xl font-semibold text-gray-700 mb-2">Page Not Found</h2>
    <p className="text-gray-500 mb-4">The page you're looking for doesn't exist.</p>
    <a href="/" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">
      Go Home
    </a>
  </div>
);

// Component error fallback for bulletproof components
export const ComponentErrorFallback: React.FC<{ error?: Error; retry?: () => void }> = ({
  error,
  retry
}) => (
  <div className="p-6 bg-red-50 border border-red-200 rounded-lg" data-testid="component-error-fallback">
    <div className="flex items-center mb-4">
      <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-3">
        <span className="text-white text-sm">!</span>
      </div>
      <h3 className="text-red-800 font-semibold">Component Error</h3>
    </div>
    <p className="text-red-700 mb-4">
      {error?.message || 'Something went wrong rendering this component.'}
    </p>
    {retry && (
      <button
        onClick={retry}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
      >
        Try Again
      </button>
    )}
  </div>
);

// Chunk error fallback for code splitting errors
export const ChunkErrorFallback: React.FC<{ retry?: () => void }> = ({ retry }) => (
  <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg" data-testid="chunk-error-fallback">
    <div className="flex items-center mb-4">
      <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center mr-3">
        <span className="text-white text-sm">⚠</span>
      </div>
      <h3 className="text-yellow-800 font-semibold">Loading Error</h3>
    </div>
    <p className="text-yellow-700 mb-4">
      Failed to load application resources. This might be due to a network issue or an outdated cached version.
    </p>
    {retry && (
      <button
        onClick={retry}
        className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition-colors"
      >
        Reload Page
      </button>
    )}
  </div>
);

// Main export - object with all fallback components
const FallbackComponents = {
  LoadingFallback,
  FeedFallback,
  DualInstanceFallback,
  DashboardFallback,
  AgentManagerFallback,
  AgentProfileFallback,
  WorkflowFallback,
  AnalyticsFallback,
  ClaudeCodeFallback,
  ActivityFallback,
  SettingsFallback,
  NotFoundFallback,
  ComponentErrorFallback,
  ChunkErrorFallback
};

export default FallbackComponents;

// Named exports for easier imports
export {
  FallbackComponents
};