import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import {
  Terminal,
  Key,
  Shield,
  Activity,
  Settings,
  CheckCircle,
  AlertTriangle,
  Clock,
  Zap,
  RefreshCw,
  ExternalLink,
  User,
  Database,
  Globe,
  Code,
  GitBranch,
  Cpu,
  Monitor,
  Wifi,
  WifiOff,
  Power,
  PlayCircle,
  StopCircle,
  Download,
  Upload,
  FileText,
  BarChart3
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { 
  safeString, 
  safeNumber, 
  safeArray, 
  safeObject, 
  isDefined,
  safeDate 
} from '@/utils/safetyUtils';

interface SafeClaudeCodeSession {
  id: string;
  user_id: string;
  status: 'active' | 'inactive' | 'expired' | 'error';
  created_at: string;
  updated_at: string;
  expires_at: string;
  last_activity: string;
  tools_used: string[];
  tokens_consumed: number;
  api_calls: number;
  success_rate: number;
  session_duration: number;
}

interface SafeIntegrationHealth {
  claude_api: {
    status: 'connected' | 'disconnected' | 'error';
    response_time: number;
    last_check: string;
    error_message?: string;
  };
  mcp_server: {
    status: 'running' | 'stopped' | 'error';
    uptime: number;
    connections: number;
    last_restart: string;
  };
  websocket: {
    status: 'connected' | 'disconnected' | 'connecting';
    connection_time: number;
    message_count: number;
    last_message: string;
  };
  tools: {
    total_tools: number;
    available_tools: number;
    failed_tools: string[];
    last_sync: string;
  };
}

interface SafeToolUsageStats {
  tool_name: string;
  category: 'file' | 'bash' | 'git' | 'search' | 'web' | 'agent';
  usage_count: number;
  success_rate: number;
  avg_response_time: number;
  last_used: string;
  error_count: number;
}

interface BulletproofClaudeCodePanelProps {
  className?: string;
  onError?: (error: Error) => void;
  retryable?: boolean;
  fallback?: React.ReactNode;
}

const SAFE_TOOL_CATEGORIES = {
  file: { name: 'File Operations', color: 'blue', icon: FileText },
  bash: { name: 'Terminal Commands', color: 'green', icon: Terminal },
  git: { name: 'Git Operations', color: 'orange', icon: GitBranch },
  search: { name: 'Search & Grep', color: 'purple', icon: BarChart3 },
  web: { name: 'Web & Network', color: 'pink', icon: Globe },
  agent: { name: 'Agent Management', color: 'indigo', icon: User }
} as const;

// Safe data transformers
const transformToSafeSession = (session: any): SafeClaudeCodeSession | null => {
  try {
    if (!session || typeof session !== 'object') return null;
    
    const validStatuses = ['active', 'inactive', 'expired', 'error'];
    const status = validStatuses.includes(session.status) ? session.status : 'inactive';
    
    return {
      id: safeString(session.id, `session-${Date.now()}`),
      user_id: safeString(session.user_id, 'unknown-user'),
      status: status as SafeClaudeCodeSession['status'],
      created_at: safeDate(session.created_at).toISOString(),
      updated_at: safeDate(session.updated_at).toISOString(),
      expires_at: safeDate(session.expires_at).toISOString(),
      last_activity: safeDate(session.last_activity).toISOString(),
      tools_used: safeArray(session.tools_used),
      tokens_consumed: safeNumber(session.tokens_consumed, 0),
      api_calls: safeNumber(session.api_calls, 0),
      success_rate: Math.max(0, Math.min(1, safeNumber(session.success_rate, 0))),
      session_duration: safeNumber(session.session_duration, 0)
    };
  } catch (error) {
    console.error('Failed to transform session data:', error);
    return null;
  }
};

const transformToSafeHealth = (health: any): SafeIntegrationHealth => {
  try {
    const safeHealth = safeObject(health);
    
    return {
      claude_api: {
        status: ['connected', 'disconnected', 'error'].includes(safeHealth.claude_api?.status) 
          ? safeHealth.claude_api.status 
          : 'disconnected',
        response_time: safeNumber(safeHealth.claude_api?.response_time, 0),
        last_check: safeDate(safeHealth.claude_api?.last_check).toISOString(),
        error_message: safeString(safeHealth.claude_api?.error_message)
      },
      mcp_server: {
        status: ['running', 'stopped', 'error'].includes(safeHealth.mcp_server?.status)
          ? safeHealth.mcp_server.status
          : 'stopped',
        uptime: safeNumber(safeHealth.mcp_server?.uptime, 0),
        connections: safeNumber(safeHealth.mcp_server?.connections, 0),
        last_restart: safeDate(safeHealth.mcp_server?.last_restart).toISOString()
      },
      websocket: {
        status: ['connected', 'disconnected', 'connecting'].includes(safeHealth.websocket?.status)
          ? safeHealth.websocket.status
          : 'disconnected',
        connection_time: safeNumber(safeHealth.websocket?.connection_time, 0),
        message_count: safeNumber(safeHealth.websocket?.message_count, 0),
        last_message: safeDate(safeHealth.websocket?.last_message).toISOString()
      },
      tools: {
        total_tools: safeNumber(safeHealth.tools?.total_tools, 0),
        available_tools: safeNumber(safeHealth.tools?.available_tools, 0),
        failed_tools: safeArray(safeHealth.tools?.failed_tools),
        last_sync: safeDate(safeHealth.tools?.last_sync).toISOString()
      }
    };
  } catch (error) {
    console.error('Failed to transform health data:', error);
    return getDefaultHealthData();
  }
};

const transformToSafeToolStats = (tool: any): SafeToolUsageStats | null => {
  try {
    if (!tool || typeof tool !== 'object') return null;
    
    const validCategories = ['file', 'bash', 'git', 'search', 'web', 'agent'];
    const category = validCategories.includes(tool.category) ? tool.category : 'file';
    
    return {
      tool_name: safeString(tool.tool_name, 'Unknown Tool'),
      category: category as SafeToolUsageStats['category'],
      usage_count: safeNumber(tool.usage_count, 0),
      success_rate: Math.max(0, Math.min(1, safeNumber(tool.success_rate, 0))),
      avg_response_time: safeNumber(tool.avg_response_time, 0),
      last_used: safeDate(tool.last_used).toISOString(),
      error_count: safeNumber(tool.error_count, 0)
    };
  } catch (error) {
    console.error('Failed to transform tool stats:', error);
    return null;
  }
};

// Default data generators
const getDefaultHealthData = (): SafeIntegrationHealth => ({
  claude_api: {
    status: 'disconnected',
    response_time: 0,
    last_check: new Date().toISOString(),
    error_message: 'No connection established'
  },
  mcp_server: {
    status: 'stopped',
    uptime: 0,
    connections: 0,
    last_restart: new Date().toISOString()
  },
  websocket: {
    status: 'disconnected',
    connection_time: 0,
    message_count: 0,
    last_message: new Date().toISOString()
  },
  tools: {
    total_tools: 0,
    available_tools: 0,
    failed_tools: [],
    last_sync: new Date().toISOString()
  }
});

const generateSafeMockSessions = (): SafeClaudeCodeSession[] => {
  try {
    const sessions: SafeClaudeCodeSession[] = [];
    const statuses: SafeClaudeCodeSession['status'][] = ['active', 'inactive', 'expired', 'error'];
    
    for (let i = 0; i < 10; i++) {
      const created = new Date(Date.now() - Math.random() * 86400000 * 7);
      sessions.push({
        id: `session-${Math.random().toString(36).substr(2, 9)}`,
        user_id: `user-${Math.random().toString(36).substr(2, 6)}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        created_at: created.toISOString(),
        updated_at: new Date(created.getTime() + Math.random() * 3600000).toISOString(),
        expires_at: new Date(created.getTime() + 86400000).toISOString(),
        last_activity: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        tools_used: ['Read', 'Write', 'Bash', 'Edit'].slice(0, Math.floor(Math.random() * 4) + 1),
        tokens_consumed: Math.floor(Math.random() * 50000) + 1000,
        api_calls: Math.floor(Math.random() * 200) + 10,
        success_rate: 0.8 + Math.random() * 0.2,
        session_duration: Math.floor(Math.random() * 7200) + 300
      });
    }
    
    return sessions;
  } catch (error) {
    console.error('Failed to generate mock sessions:', error);
    return [];
  }
};

const generateSafeMockToolStats = (): SafeToolUsageStats[] => {
  try {
    const tools = [
      { name: 'Read', category: 'file' as const },
      { name: 'Write', category: 'file' as const },
      { name: 'Edit', category: 'file' as const },
      { name: 'MultiEdit', category: 'file' as const },
      { name: 'Bash', category: 'bash' as const },
      { name: 'Glob', category: 'search' as const },
      { name: 'Grep', category: 'search' as const },
      { name: 'WebFetch', category: 'web' as const },
      { name: 'TodoWrite', category: 'agent' as const }
    ];
    
    return tools.map(tool => ({
      tool_name: tool.name,
      category: tool.category,
      usage_count: Math.floor(Math.random() * 1000) + 50,
      success_rate: 0.85 + Math.random() * 0.15,
      avg_response_time: Math.floor(Math.random() * 2000) + 100,
      last_used: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      error_count: Math.floor(Math.random() * 10)
    }));
  } catch (error) {
    console.error('Failed to generate mock tool stats:', error);
    return [];
  }
};

// Loading skeleton components
const StatusCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="h-4 w-20 bg-gray-200 rounded"></div>
        <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
        <div className="h-3 w-24 bg-gray-200 rounded"></div>
      </div>
      <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
    </div>
  </div>
);

const TableSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg border border-gray-200">
    <div className="p-6 border-b border-gray-200">
      <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
    </div>
    <div className="p-6 space-y-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4 animate-pulse">
          <div className="h-4 w-24 bg-gray-200 rounded"></div>
          <div className="h-4 w-16 bg-gray-200 rounded-full"></div>
          <div className="h-4 w-20 bg-gray-200 rounded"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
          <div className="h-4 w-16 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  </div>
);

// Error boundary fallbacks
const StatusCardError: React.FC<{ error?: Error; retry?: () => void }> = ({ retry }) => (
  <div className="bg-white rounded-lg border border-red-200 p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-red-600">Status Unavailable</p>
        <p className="text-xs text-red-500 mt-1">Failed to load status information</p>
        {retry && (
          <button
            onClick={retry}
            className="text-xs text-red-600 hover:text-red-800 mt-2 underline"
          >
            Retry
          </button>
        )}
      </div>
      <div className="p-3 bg-red-100 rounded-lg">
        <AlertTriangle className="w-6 h-6 text-red-600" />
      </div>
    </div>
  </div>
);

const TableError: React.FC<{ error?: Error; retry?: () => void }> = ({ retry }) => (
  <div className="bg-white rounded-lg border border-red-200 p-6">
    <div className="text-center py-8">
      <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
      <h3 className="text-lg font-medium text-red-900 mb-2">Data Loading Failed</h3>
      <p className="text-red-600 mb-4">Unable to load table data. Please try again.</p>
      {retry && (
        <button
          onClick={retry}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry Loading
        </button>
      )}
    </div>
  </div>
);

export const BulletproofClaudeCodePanel: React.FC<BulletproofClaudeCodePanelProps> = ({ 
  className, 
  onError,
  retryable = true,
  fallback 
}) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'sessions' | 'tools' | 'settings'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sessionFilter, setSessionFilter] = useState<string>('all');
  const [operationErrors, setOperationErrors] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();

  // Safe error handler
  const handleError = useCallback((error: Error, context: string) => {
    console.error(`Claude Code Panel Error [${context}]:`, error);
    setOperationErrors(prev => ({ ...prev, [context]: error.message }));
    onError?.(error);
  }, [onError]);

  // Clear specific error
  const clearError = useCallback((context: string) => {
    setOperationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[context];
      return newErrors;
    });
  }, []);

  // Safe API fetch function
  const safeFetch = useCallback(async (url: string, options?: RequestInit) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      throw new Error('Unknown fetch error');
    }
  }, []);

  // Fetch integration health with error handling
  const { data: integrationHealth, refetch: refetchHealth, isLoading: healthLoading } = useQuery<SafeIntegrationHealth>({
    queryKey: ['claude-integration-health'],
    queryFn: async () => {
      try {
        clearError('health');
        const data = await safeFetch('/api/v1/claude-code/health');
        return transformToSafeHealth(data);
      } catch (error) {
        handleError(error as Error, 'health');
        return getDefaultHealthData();
      }
    },
    refetchInterval: autoRefresh ? 30000 : false,
    initialData: getDefaultHealthData(),
    retry: retryable ? 3 : false,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Fetch active sessions with error handling
  const { data: sessions = [], refetch: refetchSessions, isLoading: sessionsLoading } = useQuery<SafeClaudeCodeSession[]>({
    queryKey: ['claude-sessions', sessionFilter],
    queryFn: async () => {
      try {
        clearError('sessions');
        const params = new URLSearchParams();
        if (sessionFilter !== 'all') params.append('status', sessionFilter);
        
        const data = await safeFetch(`/api/v1/claude-code/sessions?${params}`);
        const safeSessions = safeArray(data)
          .map(transformToSafeSession)
          .filter(isDefined);
        
        return safeSessions;
      } catch (error) {
        handleError(error as Error, 'sessions');
        return generateSafeMockSessions();
      }
    },
    refetchInterval: autoRefresh ? 15000 : false,
    initialData: generateSafeMockSessions(),
    retry: retryable ? 3 : false,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Fetch tool usage stats with error handling
  const { data: toolStats = [], refetch: refetchTools, isLoading: toolsLoading } = useQuery<SafeToolUsageStats[]>({
    queryKey: ['claude-tool-stats'],
    queryFn: async () => {
      try {
        clearError('tools');
        const data = await safeFetch('/api/v1/claude-code/tools/stats');
        const safeStats = safeArray(data)
          .map(transformToSafeToolStats)
          .filter(isDefined);
        
        return safeStats;
      } catch (error) {
        handleError(error as Error, 'tools');
        return generateSafeMockToolStats();
      }
    },
    refetchInterval: autoRefresh ? 60000 : false,
    initialData: generateSafeMockToolStats(),
    retry: retryable ? 3 : false,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Session control mutations with error handling
  const terminateSession = useMutation({
    mutationFn: async (sessionId: string) => {
      try {
        clearError('terminate');
        const data = await safeFetch(`/api/v1/claude-code/sessions/${sessionId}/terminate`, {
          method: 'POST'
        });
        return data;
      } catch (error) {
        handleError(error as Error, 'terminate');
        throw error;
      }
    },
    onSuccess: () => {
      refetchSessions();
    },
    onError: (error) => {
      handleError(error as Error, 'terminate');
    }
  });

  const restartMCPServer = useMutation({
    mutationFn: async () => {
      try {
        clearError('restart');
        const data = await safeFetch('/api/v1/claude-code/mcp/restart', {
          method: 'POST'
        });
        return data;
      } catch (error) {
        handleError(error as Error, 'restart');
        throw error;
      }
    },
    onSuccess: () => {
      refetchHealth();
    },
    onError: (error) => {
      handleError(error as Error, 'restart');
    }
  });

  // Safe utility functions
  const formatDuration = useCallback((seconds: number): string => {
    try {
      const safeSeconds = safeNumber(seconds, 0);
      if (safeSeconds < 60) return `${safeSeconds}s`;
      if (safeSeconds < 3600) return `${Math.floor(safeSeconds / 60)}m`;
      if (safeSeconds < 86400) return `${Math.floor(safeSeconds / 3600)}h`;
      return `${Math.floor(safeSeconds / 86400)}d`;
    } catch (error) {
      console.error('Error formatting duration:', error);
      return '0s';
    }
  }, []);

  const getStatusDisplay = useCallback((status: string) => {
    try {
      const statusConfig = {
        connected: { color: 'text-green-600 bg-green-100', icon: CheckCircle },
        running: { color: 'text-green-600 bg-green-100', icon: PlayCircle },
        active: { color: 'text-green-600 bg-green-100', icon: Activity },
        disconnected: { color: 'text-red-600 bg-red-100', icon: WifiOff },
        stopped: { color: 'text-red-600 bg-red-100', icon: StopCircle },
        inactive: { color: 'text-gray-600 bg-gray-100', icon: Clock },
        error: { color: 'text-red-600 bg-red-100', icon: AlertTriangle },
        expired: { color: 'text-orange-600 bg-orange-100', icon: Clock },
        connecting: { color: 'text-yellow-600 bg-yellow-100', icon: RefreshCw }
      };
      return statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    } catch (error) {
      console.error('Error getting status display:', error);
      return { color: 'text-gray-600 bg-gray-100', icon: Clock };
    }
  }, []);

  // Refresh all data with error handling
  const handleRefreshAll = useCallback(() => {
    try {
      setOperationErrors({});
      refetchHealth();
      refetchSessions();
      refetchTools();
    } catch (error) {
      handleError(error as Error, 'refresh');
    }
  }, [refetchHealth, refetchSessions, refetchTools, handleError]);

  // Safe tab change
  const handleTabChange = useCallback((tab: 'overview' | 'sessions' | 'tools' | 'settings') => {
    try {
      setSelectedTab(tab);
    } catch (error) {
      handleError(error as Error, 'tab-change');
    }
  }, [handleError]);

  // Memoized calculations
  const safeSessions = useMemo(() => {
    try {
      return safeArray(sessions).filter(isDefined);
    } catch (error) {
      console.error('Error processing sessions:', error);
      return [];
    }
  }, [sessions]);

  const safeToolStats = useMemo(() => {
    try {
      return safeArray(toolStats).filter(isDefined);
    } catch (error) {
      console.error('Error processing tool stats:', error);
      return [];
    }
  }, [toolStats]);

  // Render error if fallback needed
  if (fallback && Object.keys(operationErrors).length > 0) {
    return <>{fallback}</>;
  }

  return (
    <ErrorBoundary
      fallback={
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-medium text-red-900 mb-2">Claude Code Panel Error</h3>
          <p className="text-red-700">The integration panel encountered an error. Please refresh the page.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      }
      onError={(error) => handleError(error, 'boundary')}
    >
      <div className={cn('space-y-6', className)}>
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 flex items-center">
              <Code className="w-8 h-8 mr-3 text-blue-600" />
              Claude Code Integration
            </h2>
            <p className="text-gray-600 mt-1">Monitor and manage Claude Code sessions and tools</p>
          </div>
          
          <div className="mt-4 lg:mt-0 flex items-center space-x-3">
            <button
              onClick={handleRefreshAll}
              disabled={healthLoading || sessionsLoading || toolsLoading}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', (healthLoading || sessionsLoading || toolsLoading) && 'animate-spin')} />
              Refresh
            </button>
            
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                'flex items-center px-3 py-2 rounded transition-colors',
                autoRefresh 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              <Zap className="w-4 h-4 mr-2" />
              Auto-refresh: {autoRefresh ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {Object.keys(operationErrors).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <h3 className="text-sm font-medium text-red-900">Operation Errors</h3>
            </div>
            <div className="space-y-1">
              {Object.entries(operationErrors).map(([context, error]) => (
                <div key={context} className="flex items-center justify-between text-sm">
                  <span className="text-red-700">{context}: {error}</span>
                  <button
                    onClick={() => clearError(context)}
                    className="text-red-600 hover:text-red-800 underline ml-2"
                  >
                    Dismiss
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: Monitor },
              { id: 'sessions', name: 'Sessions', icon: Activity },
              { id: 'tools', name: 'Tools', icon: Terminal },
              { id: 'settings', name: 'Settings', icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as any)}
                  className={cn(
                    'flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                    selectedTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <Suspense fallback={<div className="animate-pulse bg-gray-100 h-64 rounded-lg"></div>}>
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              {/* Integration Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <ErrorBoundary fallback={<StatusCardError retry={() => refetchHealth()} />}>
                  {healthLoading ? (
                    <StatusCardSkeleton />
                  ) : (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Claude API</p>
                          <div className="flex items-center mt-2">
                            {(() => {
                              const statusDisplay = getStatusDisplay(integrationHealth?.claude_api.status || 'disconnected');
                              const StatusIcon = statusDisplay.icon;
                              return (
                                <span className={cn('inline-flex items-center px-2 py-1 rounded-full text-xs font-medium', statusDisplay.color)}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {integrationHealth?.claude_api.status || 'unknown'}
                                </span>
                              );
                            })()}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Response: {safeNumber(integrationHealth?.claude_api.response_time, 0)}ms
                          </p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <Key className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    </div>
                  )}
                </ErrorBoundary>

                <ErrorBoundary fallback={<StatusCardError retry={() => refetchHealth()} />}>
                  {healthLoading ? (
                    <StatusCardSkeleton />
                  ) : (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">MCP Server</p>
                          <div className="flex items-center mt-2">
                            {(() => {
                              const statusDisplay = getStatusDisplay(integrationHealth?.mcp_server.status || 'stopped');
                              const StatusIcon = statusDisplay.icon;
                              return (
                                <span className={cn('inline-flex items-center px-2 py-1 rounded-full text-xs font-medium', statusDisplay.color)}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {integrationHealth?.mcp_server.status || 'unknown'}
                                </span>
                              );
                            })()}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Uptime: {formatDuration(safeNumber(integrationHealth?.mcp_server.uptime, 0))}
                          </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                          <Database className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    </div>
                  )}
                </ErrorBoundary>

                <ErrorBoundary fallback={<StatusCardError retry={() => refetchHealth()} />}>
                  {healthLoading ? (
                    <StatusCardSkeleton />
                  ) : (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">WebSocket</p>
                          <div className="flex items-center mt-2">
                            {(() => {
                              const statusDisplay = getStatusDisplay(integrationHealth?.websocket.status || 'disconnected');
                              const StatusIcon = statusDisplay.icon;
                              return (
                                <span className={cn('inline-flex items-center px-2 py-1 rounded-full text-xs font-medium', statusDisplay.color)}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {integrationHealth?.websocket.status || 'unknown'}
                                </span>
                              );
                            })()}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Messages: {safeNumber(integrationHealth?.websocket.message_count, 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                          <Wifi className="w-6 h-6 text-purple-600" />
                        </div>
                      </div>
                    </div>
                  )}
                </ErrorBoundary>

                <ErrorBoundary fallback={<StatusCardError retry={() => refetchHealth()} />}>
                  {healthLoading ? (
                    <StatusCardSkeleton />
                  ) : (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Available Tools</p>
                          <p className="text-2xl font-bold text-gray-900 mt-2">
                            {safeNumber(integrationHealth?.tools.available_tools, 0)}/{safeNumber(integrationHealth?.tools.total_tools, 0)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {safeArray(integrationHealth?.tools.failed_tools).length} failed
                          </p>
                        </div>
                        <div className="p-3 bg-orange-100 rounded-lg">
                          <Terminal className="w-6 h-6 text-orange-600" />
                        </div>
                      </div>
                    </div>
                  )}
                </ErrorBoundary>
              </div>

              {/* Quick Actions */}
              <ErrorBoundary fallback={<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center text-red-700">Quick actions unavailable</div>}>
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => restartMCPServer.mutate()}
                      disabled={restartMCPServer.isPending}
                      className="flex items-center justify-center px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={cn('w-5 h-5 mr-2', restartMCPServer.isPending && 'animate-spin')} />
                      Restart MCP Server
                    </button>
                    
                    <button className="flex items-center justify-center px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
                      <Download className="w-5 h-5 mr-2" />
                      Export Session Logs
                    </button>
                    
                    <button className="flex items-center justify-center px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
                      <Shield className="w-5 h-5 mr-2" />
                      Run Health Check
                    </button>
                  </div>
                </div>
              </ErrorBoundary>

              {/* Recent Activity */}
              <ErrorBoundary fallback={<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center text-red-700">Recent activity unavailable</div>}>
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {safeSessions.slice(0, 5).map((session) => (
                      <div key={session.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">
                            Session {session.id.slice(0, 8)} - {session.tokens_consumed.toLocaleString()} tokens used
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(session.last_activity).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-sm text-gray-500">
                          {session.tools_used.length} tools
                        </div>
                      </div>
                    ))}
                    {safeSessions.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No recent sessions</p>
                      </div>
                    )}
                  </div>
                </div>
              </ErrorBoundary>
            </div>
          )}

          {selectedTab === 'sessions' && (
            <div className="space-y-6">
              {/* Session Filters */}
              <div className="flex items-center space-x-4">
                <select
                  value={sessionFilter}
                  onChange={(e) => setSessionFilter(safeString(e.target.value, 'all'))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Sessions</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="expired">Expired</option>
                  <option value="error">Error</option>
                </select>
              </div>

              {/* Sessions Table */}
              <ErrorBoundary fallback={<TableError retry={() => refetchSessions()} />}>
                {sessionsLoading ? (
                  <TableSkeleton />
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">Claude Code Sessions</h3>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Session ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Duration
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tokens Used
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              API Calls
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Success Rate
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Last Activity
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {safeSessions.map((session) => {
                            const statusDisplay = getStatusDisplay(session.status);
                            const StatusIcon = statusDisplay.icon;
                            
                            return (
                              <tr key={session.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{session.id.slice(0, 12)}</div>
                                  <div className="text-sm text-gray-500">{session.user_id}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', statusDisplay.color)}>
                                    <StatusIcon className="w-3 h-3 mr-1" />
                                    {session.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatDuration(session.session_duration)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {session.tokens_consumed.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {session.api_calls}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {(session.success_rate * 100).toFixed(1)}%
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(session.last_activity).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  {session.status === 'active' && (
                                    <button
                                      onClick={() => terminateSession.mutate(session.id)}
                                      disabled={terminateSession.isPending}
                                      className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50"
                                    >
                                      <Power className="w-4 h-4" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {safeSessions.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium text-gray-900 mb-2">No Sessions Found</p>
                          <p className="text-gray-600">No Claude Code sessions match the current filter.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </ErrorBoundary>
            </div>
          )}

          {selectedTab === 'tools' && (
            <div className="space-y-6">
              {/* Tool Categories Grid */}
              <ErrorBoundary fallback={<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center text-red-700">Tool categories unavailable</div>}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(SAFE_TOOL_CATEGORIES).map(([key, config]) => {
                    const categoryTools = safeToolStats.filter(tool => tool.category === key);
                    const Icon = config.icon;
                    
                    return (
                      <div key={key} className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 bg-${config.color}-100 rounded-lg`}>
                              <Icon className={`w-5 h-5 text-${config.color}-600`} />
                            </div>
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">{config.name}</h3>
                              <p className="text-sm text-gray-500">{categoryTools.length} tools</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total Usage</span>
                            <span className="font-medium">
                              {categoryTools.reduce((sum, tool) => sum + safeNumber(tool.usage_count, 0), 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Avg Success Rate</span>
                            <span className="font-medium">
                              {categoryTools.length > 0 
                                ? ((categoryTools.reduce((sum, tool) => sum + safeNumber(tool.success_rate, 0), 0) / categoryTools.length) * 100).toFixed(1)
                                : 0}%
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Avg Response Time</span>
                            <span className="font-medium">
                              {categoryTools.length > 0 
                                ? Math.round(categoryTools.reduce((sum, tool) => sum + safeNumber(tool.avg_response_time, 0), 0) / categoryTools.length)
                                : 0}ms
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ErrorBoundary>

              {/* Tool Usage Table */}
              <ErrorBoundary fallback={<TableError retry={() => refetchTools()} />}>
                {toolsLoading ? (
                  <TableSkeleton />
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">Tool Usage Statistics</h3>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tool Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Category
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Usage Count
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Success Rate
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Avg Response Time
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Errors
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Last Used
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {safeToolStats.map((tool) => {
                            const categoryConfig = SAFE_TOOL_CATEGORIES[tool.category];
                            
                            return (
                              <tr key={tool.tool_name} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{tool.tool_name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${categoryConfig?.color || 'gray'}-100 text-${categoryConfig?.color || 'gray'}-800`}>
                                    {categoryConfig?.name || tool.category}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {tool.usage_count.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={cn(
                                    'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                                    tool.success_rate > 0.95 ? 'bg-green-100 text-green-800' :
                                    tool.success_rate > 0.85 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  )}>
                                    {(tool.success_rate * 100).toFixed(1)}%
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {tool.avg_response_time}ms
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {tool.error_count}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(tool.last_used).toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {safeToolStats.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Terminal className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium text-gray-900 mb-2">No Tool Statistics</p>
                          <p className="text-gray-600">No tool usage data available.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </ErrorBoundary>
            </div>
          )}

          {selectedTab === 'settings' && (
            <ErrorBoundary fallback={<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center text-red-700">Settings panel unavailable</div>}>
              <div className="space-y-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Integration Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Claude API Endpoint
                      </label>
                      <input
                        type="url"
                        defaultValue="https://api.anthropic.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        MCP Server Port
                      </label>
                      <input
                        type="number"
                        defaultValue="3001"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="auto-reconnect"
                        defaultChecked
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="auto-reconnect" className="text-sm text-gray-700">
                        Enable automatic reconnection
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="debug-logging"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="debug-logging" className="text-sm text-gray-700">
                        Enable debug logging
                      </label>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      Save Settings
                    </button>
                  </div>
                </div>
              </div>
            </ErrorBoundary>
          )}
        </Suspense>
      </div>
    </ErrorBoundary>
  );
};

export default BulletproofClaudeCodePanel;