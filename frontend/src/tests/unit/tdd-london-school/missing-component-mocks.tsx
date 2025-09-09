/**
 * TDD London School: Missing Component Mock Implementations
 * 
 * These are the minimal implementations needed to resolve the white screen
 * by providing the missing @/ imports with London School mock behavior verification.
 */

import React from 'react';

// ========================================
// FALLBACK COMPONENTS MOCK
// ========================================
export const FallbackComponents = {
  LoadingFallback: ({ message = 'Loading...', size = 'md' }: { 
    message?: string; 
    size?: 'sm' | 'md' | 'lg'; 
  }) => (
    <div 
      data-testid="loading-fallback" 
      className={`flex items-center justify-center p-4 loading-${size}`}
      role="status"
      aria-live="polite"
    >
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
      <span className="text-gray-600">{message}</span>
    </div>
  ),
  
  FeedFallback: () => (
    <div data-testid="feed-fallback" className="p-6 bg-gray-50 rounded-lg">
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
      <p className="text-gray-500 mt-4">Loading social media feed...</p>
    </div>
  ),

  DualInstanceFallback: () => (
    <div data-testid="dual-instance-fallback" className="p-6 bg-blue-50 rounded-lg">
      <div className="flex items-center space-x-2 mb-4">
        <div className="w-4 h-4 bg-blue-500 rounded animate-pulse"></div>
        <span className="text-blue-700">Initializing Claude instances...</span>
      </div>
      <div className="space-y-2">
        <div className="h-2 bg-blue-200 rounded w-full animate-pulse"></div>
        <div className="h-2 bg-blue-200 rounded w-3/4 animate-pulse"></div>
      </div>
    </div>
  ),

  DashboardFallback: () => (
    <div data-testid="dashboard-fallback" className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="p-4 bg-white rounded-lg shadow">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  ),

  AgentManagerFallback: () => (
    <div data-testid="agent-manager-fallback" className="p-6">
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
  ),

  AgentProfileFallback: () => (
    <div data-testid="agent-profile-fallback" className="p-6">
      <div className="animate-pulse">
        <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4"></div>
        <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
      </div>
    </div>
  ),

  WorkflowFallback: () => (
    <div data-testid="workflow-fallback" className="p-6">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading workflow visualization...</p>
        </div>
      </div>
    </div>
  ),

  AnalyticsFallback: () => (
    <div data-testid="analytics-fallback" className="p-6">
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
        ))}
      </div>
    </div>
  ),

  ClaudeCodeFallback: () => (
    <div data-testid="claude-code-fallback" className="p-6 bg-gray-900 text-green-400 rounded-lg font-mono">
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
  ),

  ActivityFallback: () => (
    <div data-testid="activity-fallback" className="p-6">
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
  ),

  SettingsFallback: () => (
    <div data-testid="settings-fallback" className="p-6">
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-2">
            <div className="h-5 bg-gray-200 rounded w-1/4 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  ),

  NotFoundFallback: () => (
    <div data-testid="not-found-fallback" className="flex flex-col items-center justify-center h-64">
      <div className="text-6xl mb-4">🔍</div>
      <h2 className="text-2xl font-semibold text-gray-700 mb-2">Page Not Found</h2>
      <p className="text-gray-500 mb-4">The page you're looking for doesn't exist.</p>
      <a href="/" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
        Go Home
      </a>
    </div>
  )
};

// ========================================
// REAL-TIME NOTIFICATIONS MOCK
// ========================================
export const RealTimeNotifications = () => {
  const [notifications] = React.useState([
    { id: 1, message: 'System ready', type: 'success' },
    { id: 2, message: 'Mock notifications active', type: 'info' }
  ]);

  return (
    <div data-testid="real-time-notifications" className="relative">
      <button className="relative p-2 text-gray-400 hover:text-gray-600">
        <span className="text-lg">🔔</span>
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>
    </div>
  );
};

// ========================================
// SOCIAL MEDIA FEED MOCK
// ========================================
export const SocialMediaFeed = () => {
  const mockPosts = [
    { id: 1, author: 'AI Agent', content: 'Successfully initialized mock social media feed!', timestamp: '2 min ago' },
    { id: 2, author: 'System', content: 'London School TDD approach working correctly', timestamp: '5 min ago' },
    { id: 3, author: 'Debug Mode', content: 'Component mocking strategy active', timestamp: '10 min ago' }
  ];

  return (
    <div data-testid="social-media-feed" className="space-y-4">
      <h2 className="text-2xl font-semibold mb-6">Social Media Feed (Mock)</h2>
      {mockPosts.map(post => (
        <div key={post.id} className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
              {post.author[0]}
            </div>
            <div>
              <div className="font-medium text-gray-900">{post.author}</div>
              <div className="text-sm text-gray-500">{post.timestamp}</div>
            </div>
          </div>
          <p className="text-gray-700">{post.content}</p>
        </div>
      ))}
    </div>
  );
};

// ========================================
// SIMPLE AGENT MANAGER MOCK
// ========================================
export const SimpleAgentManager = () => {
  const mockAgents = [
    { id: 1, name: 'Research Agent', status: 'active', tasks: 3 },
    { id: 2, name: 'Code Agent', status: 'idle', tasks: 0 },
    { id: 3, name: 'Test Agent', status: 'active', tasks: 1 }
  ];

  return (
    <div data-testid="simple-agent-manager" className="p-6">
      <h2 className="text-2xl font-semibold mb-6">Agent Manager (Mock)</h2>
      <div className="grid gap-4">
        {mockAgents.map(agent => (
          <div key={agent.id} className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  agent.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
                <span className="font-medium">{agent.name}</span>
              </div>
              <span className="text-sm text-gray-500">{agent.tasks} tasks</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ========================================
// ENHANCED AGENT MANAGER WRAPPER MOCK
// ========================================
export const EnhancedAgentManagerWrapper = () => (
  <div data-testid="enhanced-agent-manager" className="p-6">
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg mb-6">
      <h2 className="text-2xl font-semibold">Enhanced Agent Manager (Mock)</h2>
      <p className="opacity-90">Advanced agent orchestration interface</p>
    </div>
    <SimpleAgentManager />
  </div>
);

// ========================================
// OTHER COMPONENT MOCKS
// ========================================
export const Agents = () => (
  <div data-testid="agents-page" className="p-6">
    <h1 className="text-3xl font-bold mb-6">Agents (Mock)</h1>
    <EnhancedAgentManagerWrapper />
  </div>
);

export const SimpleAnalytics = () => (
  <div data-testid="simple-analytics" className="p-6">
    <h2 className="text-2xl font-semibold mb-6">Analytics Dashboard (Mock)</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {['Total Agents', 'Active Tasks', 'Success Rate', 'Uptime'].map((metric, i) => (
        <div key={metric} className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">{metric}</div>
          <div className="text-2xl font-bold text-blue-600">{[12, 8, '98%', '99.9%'][i]}</div>
        </div>
      ))}
    </div>
  </div>
);

// Continue with other component mocks...
export const BulletproofClaudeCodePanel = () => (
  <div data-testid="bulletproof-claude-code" className="p-6 bg-gray-900 text-green-400 rounded-lg font-mono">
    <h2 className="text-xl mb-4">Claude Code Terminal (Mock)</h2>
    <div className="space-y-2">
      <div>$ claude-flow status</div>
      <div className="text-green-300">✅ All systems operational</div>
      <div className="text-green-300">✅ Mock mode active</div>
      <div>$ _</div>
    </div>
  </div>
);

// Export all component mocks for easy import
export default {
  FallbackComponents,
  RealTimeNotifications,
  SocialMediaFeed,
  SimpleAgentManager,
  EnhancedAgentManagerWrapper,
  Agents,
  SimpleAnalytics,
  BulletproofClaudeCodePanel,
  // Add other component mocks as needed
};