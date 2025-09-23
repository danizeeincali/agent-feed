import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Activity, 
  BarChart3, 
  Clock, 
  Cpu, 
  Database, 
  TrendingUp, 
  TrendingDown,
  Zap,
  Users,
  AlertTriangle,
  CheckCircle,
  Filter,
  RefreshCw,
  Settings,
  Monitor,
  Brain,
  GitBranch,
  Globe
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface AgentMetrics {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  cpu_usage: number;
  memory_usage: number;
  response_time: number;
  success_rate: number;
  total_tasks: number;
  last_activity: string;
  category: 'core' | 'sparc' | 'github' | 'performance' | 'neural';
}

interface SystemMetrics {
  total_agents: number;
  active_agents: number;
  total_posts: number;
  posts_today: number;
  average_response_time: number;
  cpu_usage: number;
  memory_usage: number;
  network_usage: number;
  uptime: number;
}

interface DashboardProps {
  className?: string;
}

const AGENT_CATEGORIES = {
  core: { name: 'Core Development', color: 'blue', icon: Cpu },
  sparc: { name: 'SPARC Methodology', color: 'purple', icon: Brain },
  github: { name: 'GitHub Integration', color: 'green', icon: GitBranch },
  performance: { name: 'Performance', color: 'orange', icon: TrendingUp },
  neural: { name: 'Neural & AI', color: 'pink', icon: Zap }
};

export const AgentFeedDashboard: React.FC<DashboardProps> = memo(({ className }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000);

  // Fetch system metrics
  const { data: systemMetrics, refetch: refetchSystem } = useQuery<SystemMetrics>({
    queryKey: ['system-metrics', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/v1/metrics/system?range=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch system metrics');
      return response.json();
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
    initialData: {
      total_agents: 17,
      active_agents: 12,
      total_posts: 156,
      posts_today: 23,
      average_response_time: 1250,
      cpu_usage: 45,
      memory_usage: 68,
      network_usage: 32,
      uptime: 99.8
    }
  });

  // Fetch agent metrics
  const { data: agentMetrics = [], refetch: refetchAgents } = useQuery<AgentMetrics[]>({
    queryKey: ['agent-metrics', selectedCategory, timeRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        category: selectedCategory,
        range: timeRange
      });
      const response = await fetch(`/api/v1/metrics/agents?${params}`);
      if (!response.ok) throw new Error('Failed to fetch agent metrics');
      return response.json();
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
    initialData: [
      { id: '1', name: 'Chief of Staff', status: 'active', cpu_usage: 23, memory_usage: 45, response_time: 890, success_rate: 0.98, total_tasks: 142, last_activity: '2 min ago', category: 'core' },
      { id: '2', name: 'Research Agent', status: 'active', cpu_usage: 34, memory_usage: 52, response_time: 1240, success_rate: 0.95, total_tasks: 89, last_activity: '5 min ago', category: 'core' },
      { id: '3', name: 'SPARC Coordinator', status: 'active', cpu_usage: 18, memory_usage: 38, response_time: 670, success_rate: 0.99, total_tasks: 76, last_activity: '1 min ago', category: 'sparc' },
      { id: '4', name: 'GitHub Manager', status: 'active', cpu_usage: 42, memory_usage: 61, response_time: 1890, success_rate: 0.92, total_tasks: 124, last_activity: '8 min ago', category: 'github' },
      { id: '5', name: 'Performance Analyzer', status: 'error', cpu_usage: 78, memory_usage: 85, response_time: 3200, success_rate: 0.76, total_tasks: 45, last_activity: '15 min ago', category: 'performance' }
    ]
  });

  // Filter agents by category (memoized)
  const filteredAgents = useMemo(() => 
    selectedCategory === 'all' 
      ? agentMetrics 
      : agentMetrics.filter(agent => agent.category === selectedCategory),
    [agentMetrics, selectedCategory]
  );

  // Calculate metrics by category (memoized)
  const categoryMetrics = useMemo(() => Object.entries(AGENT_CATEGORIES).map(([key, config]) => {
    const categoryAgents = agentMetrics.filter(agent => agent.category === key);
    const activeCount = categoryAgents.filter(agent => agent.status === 'active').length;
    const avgResponseTime = categoryAgents.length > 0 
      ? categoryAgents.reduce((sum, agent) => sum + agent.response_time, 0) / categoryAgents.length
      : 0;
    const avgSuccessRate = categoryAgents.length > 0
      ? categoryAgents.reduce((sum, agent) => sum + agent.success_rate, 0) / categoryAgents.length
      : 0;
    
    return {
      key,
      name: config.name,
      color: config.color,
      icon: config.icon,
      total: categoryAgents.length,
      active: activeCount,
      avgResponseTime,
      avgSuccessRate
    };
  }), [agentMetrics]);

  // Auto-refresh handler
  const handleRefresh = useCallback(() => {
    refetchSystem();
    refetchAgents();
  }, [refetchSystem, refetchAgents]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(handleRefresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  return (
    <div className={cn('space-y-6', className)} data-testid="dashboard">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center">
            <Monitor className="w-8 h-8 mr-3 text-blue-600" />
            AgentLink Dashboard
          </h2>
          <p className="text-gray-600 mt-1">Real-time monitoring of your Claude Code agent ecosystem</p>
        </div>
        
        <div className="mt-4 lg:mt-0 flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Time Range:</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
          
          <button
            onClick={handleRefresh}
            className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
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
      
      {/* System Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Agents</p>
              <p className="text-2xl font-bold text-gray-900">{systemMetrics?.active_agents || 0}</p>
              <p className="text-xs text-gray-500">of {systemMetrics?.total_agents || 0} total</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Posts Today</p>
              <p className="text-2xl font-bold text-gray-900">{systemMetrics?.posts_today || 0}</p>
              <p className="text-xs text-gray-500">of {systemMetrics?.total_posts || 0} total</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Response</p>
              <p className="text-2xl font-bold text-gray-900">{systemMetrics?.average_response_time || 0}ms</p>
              <div className="flex items-center mt-1">
                <TrendingDown className="w-3 h-3 text-green-500 mr-1" />
                <span className="text-xs text-green-600">12% faster</span>
              </div>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">System Uptime</p>
              <p className="text-2xl font-bold text-gray-900">{systemMetrics?.uptime || 0}%</p>
              <div className="flex items-center mt-1">
                <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                <span className="text-xs text-green-600">Excellent</span>
              </div>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Globe className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* System Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">CPU Usage</h3>
            <Cpu className="w-5 h-5 text-blue-600" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Current</span>
              <span className="text-sm font-medium">{systemMetrics?.cpu_usage || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${systemMetrics?.cpu_usage || 0}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Memory Usage</h3>
            <Database className="w-5 h-5 text-green-600" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Current</span>
              <span className="text-sm font-medium">{systemMetrics?.memory_usage || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${systemMetrics?.memory_usage || 0}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Network I/O</h3>
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Current</span>
              <span className="text-sm font-medium">{systemMetrics?.network_usage || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-orange-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${systemMetrics?.network_usage || 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Categories */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Agent Categories</h3>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {Object.entries(AGENT_CATEGORIES).map(([key, config]) => (
                <option key={key} value={key}>{config.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {categoryMetrics.map((category) => {
            const Icon = category.icon;
            return (
              <div 
                key={category.key}
                className={cn(
                  'p-4 rounded-lg border-2 cursor-pointer transition-all',
                  selectedCategory === category.key
                    ? `border-${category.color}-500 bg-${category.color}-50`
                    : 'border-gray-200 hover:border-gray-300'
                )}
                onClick={() => setSelectedCategory(category.key)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 bg-${category.color}-100 rounded-lg`}>
                    <Icon className={`w-5 h-5 text-${category.color}-600`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{category.name}</p>
                    <p className="text-xs text-gray-500">{category.active}/{category.total} active</p>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Success Rate</span>
                    <span className="font-medium">{(category.avgSuccessRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Avg Response</span>
                    <span className="font-medium">{Math.round(category.avgResponseTime)}ms</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agent Performance Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Agent Performance</h3>
          <p className="text-sm text-gray-600 mt-1">Individual agent metrics and status</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CPU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Memory
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Response Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Success Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tasks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAgents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        agent.status === 'active' ? 'bg-green-500' :
                        agent.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                      }`}></div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                        <div className="text-sm text-gray-500 capitalize">{agent.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      agent.status === 'active' ? 'bg-green-100 text-green-800' :
                      agent.status === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    )}>
                      {agent.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.cpu_usage}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.memory_usage}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.response_time}ms
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <span className="mr-2">{(agent.success_rate * 100).toFixed(1)}%</span>
                      {agent.success_rate > 0.95 ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : agent.success_rate < 0.85 ? (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      ) : (
                        <div className="w-4 h-4"></div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.total_tasks}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {agent.last_activity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

AgentFeedDashboard.displayName = 'AgentFeedDashboard';