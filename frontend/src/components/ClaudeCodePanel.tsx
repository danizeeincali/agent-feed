import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

interface ClaudeCodeSession {
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

interface IntegrationHealth {
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

interface ToolUsageStats {
  tool_name: string;
  category: 'file' | 'bash' | 'git' | 'search' | 'web' | 'agent';
  usage_count: number;
  success_rate: number;
  avg_response_time: number;
  last_used: string;
  error_count: number;
}

interface ClaudeCodePanelProps {
  className?: string;
}

const TOOL_CATEGORIES = {
  file: { name: 'File Operations', color: 'blue', icon: FileText },
  bash: { name: 'Terminal Commands', color: 'green', icon: Terminal },
  git: { name: 'Git Operations', color: 'orange', icon: GitBranch },
  search: { name: 'Search & Grep', color: 'purple', icon: BarChart3 },
  web: { name: 'Web & Network', color: 'pink', icon: Globe },
  agent: { name: 'Agent Management', color: 'indigo', icon: User }
};

export const ClaudeCodePanel: React.FC<ClaudeCodePanelProps> = ({ className }) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'sessions' | 'tools' | 'settings'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sessionFilter, setSessionFilter] = useState<string>('all');

  const queryClient = useQueryClient();

  // Fetch integration health
  const { data: integrationHealth, refetch: refetchHealth } = useQuery<IntegrationHealth>({
    queryKey: ['claude-integration-health'],
    queryFn: async () => {
      const response = await fetch('/api/v1/claude-code/health');
      if (!response.ok) throw new Error('Failed to fetch integration health');
      return response.json();
    },
    refetchInterval: autoRefresh ? 30000 : false,
    initialData: {
      claude_api: {
        status: 'connected',
        response_time: 1250,
        last_check: new Date().toISOString()
      },
      mcp_server: {
        status: 'running',
        uptime: 86400,
        connections: 3,
        last_restart: new Date(Date.now() - 86400000).toISOString()
      },
      websocket: {
        status: 'connected',
        connection_time: 3600,
        message_count: 1847,
        last_message: new Date(Date.now() - 30000).toISOString()
      },
      tools: {
        total_tools: 25,
        available_tools: 24,
        failed_tools: ['deprecated-tool'],
        last_sync: new Date(Date.now() - 300000).toISOString()
      }
    }
  });

  // Fetch active sessions
  const { data: sessions = [], refetch: refetchSessions } = useQuery<ClaudeCodeSession[]>({
    queryKey: ['claude-sessions', sessionFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sessionFilter !== 'all') params.append('status', sessionFilter);
      
      const response = await fetch(`/api/v1/claude-code/sessions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return response.json();
    },
    refetchInterval: autoRefresh ? 15000 : false,
    initialData: []
  });

  // Fetch tool usage stats
  const { data: toolStats = [], refetch: refetchTools } = useQuery<ToolUsageStats[]>({
    queryKey: ['claude-tool-stats'],
    queryFn: async () => {
      const response = await fetch('/api/v1/claude-code/tools/stats');
      if (!response.ok) throw new Error('Failed to fetch tool stats');
      return response.json();
    },
    refetchInterval: autoRefresh ? 60000 : false,
    initialData: []
  });

  // Session control mutations
  const terminateSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/v1/claude-code/sessions/${sessionId}/terminate`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to terminate session');
      return response.json();
    },
    onSuccess: () => {
      refetchSessions();
    }
  });

  const restartMCPServer = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/v1/claude-code/mcp/restart', {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to restart MCP server');
      return response.json();
    },
    onSuccess: () => {
      refetchHealth();
    }
  });

  // Format duration
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  // Get status display
  const getStatusDisplay = (status: string) => {
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
  };

  // Refresh all data
  const handleRefreshAll = () => {
    refetchHealth();
    refetchSessions();
    refetchTools();
  };

  return (
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
            className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
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
                onClick={() => setSelectedTab(tab.id as any)}
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
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Integration Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Claude API</p>
                  <div className="flex items-center mt-2">
                    {(() => {
                      const statusDisplay = getStatusDisplay(integrationHealth?.claude_api.status || 'disconnected');
                      const StatusIcon = statusDisplay.icon;
                      return (
                        <>
                          <span className={cn('inline-flex items-center px-2 py-1 rounded-full text-xs font-medium', statusDisplay.color)}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {integrationHealth?.claude_api.status || 'unknown'}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Response: {integrationHealth?.claude_api.response_time || 0}ms
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Key className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">MCP Server</p>
                  <div className="flex items-center mt-2">
                    {(() => {
                      const statusDisplay = getStatusDisplay(integrationHealth?.mcp_server.status || 'stopped');
                      const StatusIcon = statusDisplay.icon;
                      return (
                        <>
                          <span className={cn('inline-flex items-center px-2 py-1 rounded-full text-xs font-medium', statusDisplay.color)}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {integrationHealth?.mcp_server.status || 'unknown'}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Uptime: {formatDuration(integrationHealth?.mcp_server.uptime || 0)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Database className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">WebSocket</p>
                  <div className="flex items-center mt-2">
                    {(() => {
                      const statusDisplay = getStatusDisplay(integrationHealth?.websocket.status || 'disconnected');
                      const StatusIcon = statusDisplay.icon;
                      return (
                        <>
                          <span className={cn('inline-flex items-center px-2 py-1 rounded-full text-xs font-medium', statusDisplay.color)}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {integrationHealth?.websocket.status || 'unknown'}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Messages: {integrationHealth?.websocket.message_count || 0}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Wifi className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Available Tools</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {integrationHealth?.tools.available_tools || 0}/{integrationHealth?.tools.total_tools || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {integrationHealth?.tools.failed_tools?.length || 0} failed
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Terminal className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => restartMCPServer.mutate()}
                disabled={restartMCPServer.isPending}
                className="flex items-center justify-center px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
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

          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {sessions.slice(0, 5).map((session) => (
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
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'sessions' && (
        <div className="space-y-6">
          {/* Session Filters */}
          <div className="flex items-center space-x-4">
            <select
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
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
                  {sessions.map((session) => {
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
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'tools' && (
        <div className="space-y-6">
          {/* Tool Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(TOOL_CATEGORIES).map(([key, config]) => {
              const categoryTools = toolStats.filter(tool => tool.category === key);
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
                        {categoryTools.reduce((sum, tool) => sum + tool.usage_count, 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Avg Success Rate</span>
                      <span className="font-medium">
                        {categoryTools.length > 0 
                          ? ((categoryTools.reduce((sum, tool) => sum + tool.success_rate, 0) / categoryTools.length) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Avg Response Time</span>
                      <span className="font-medium">
                        {categoryTools.length > 0 
                          ? Math.round(categoryTools.reduce((sum, tool) => sum + tool.avg_response_time, 0) / categoryTools.length)
                          : 0}ms
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tool Usage Table */}
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
                  {toolStats.map((tool) => {
                    const categoryConfig = TOOL_CATEGORIES[tool.category];
                    
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
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'settings' && (
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
      )}
    </div>
  );
};

// Real data fetched from backend API endpoints:
// - /api/v1/claude-code/sessions
// - /api/v1/claude-code/tools/stats

export default ClaudeCodePanel;