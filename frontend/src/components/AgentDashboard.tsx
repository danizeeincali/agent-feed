import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Pause,
  TrendingUp,
  Users,
  Zap,
  Filter,
  Search,
  Grid3X3,
  List,
  RefreshCw
} from 'lucide-react';
// Temporarily removed cn utility import - using inline styles
// import { cn } from '../utils/cn';

interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'idle' | 'busy' | 'offline';
  capabilities: string[];
  currentTask?: string;
  metrics: {
    tasksCompleted: number;
    successRate: number;
    responseTime: number;
    lastActive: string;
  };
  specialization: string;
  description: string;
}

interface AgentDashboardProps {
  className?: string;
}

const AgentDashboard: React.FC<AgentDashboardProps> = memo(({ className = '' }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'performance'>('name');

  const { isConnected, subscribe } = useWebSocket();

  // Real agents fetched from API - no mock data

  useEffect(() => {
    // Fetch real agents from API
    const fetchAgents = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/agents');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Transform frontend proxy data to match UI expectations
        const transformAgent = (agent: any) => ({
          ...agent,
          // Map real performance metrics to UI structure
          metrics: {
            tasksCompleted: agent.usage_count || 0,
            successRate: Math.round(agent.performance_metrics?.success_rate || 0),
            responseTime: agent.performance_metrics?.average_response_time ?
              (agent.performance_metrics.average_response_time / 1000).toFixed(1) : '0.0',
            lastActive: agent.health_status?.last_heartbeat ||
              agent.last_used ||
              agent.updated_at ||
              new Date().toISOString()
          },
          // Generate currentTask from health status
          currentTask: agent.health_status?.active_tasks > 0 ?
            `Processing ${agent.health_status.active_tasks} active task${agent.health_status.active_tasks > 1 ? 's' : ''}` :
            agent.status === 'inactive' ? null :
            agent.capabilities && agent.capabilities.length > 0 ?
              `Ready to ${agent.capabilities[0]} and assist` : 'Ready for tasks',
          // Map available fields to UI expectations
          type: agent.capabilities?.[0] || 'specialist',
          specialization: agent.usage || agent.description || 'General purpose agent'
        });

        if (data.data && Array.isArray(data.data)) {
          setAgents(data.data.map(transformAgent));
        } else if (data.agents && Array.isArray(data.agents)) {
          setAgents(data.agents.map(transformAgent));
        } else if (Array.isArray(data)) {
          setAgents(data.map(transformAgent));
        } else {
          console.warn('Unexpected API response format:', data);
          setAgents([]);
        }
      } catch (err) {
        console.error('Error fetching agents:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch agents');
        setAgents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();

    // Refresh agents data every 30 seconds
    const intervalId = setInterval(fetchAgents, 30000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (isConnected) {
      subscribe('agent-status-update', (data) => {
        setAgents(prev => prev.map(agent => 
          agent.id === data.agentId 
            ? { ...agent, status: data.status, currentTask: data.currentTask }
            : agent
        ));
      });

      subscribe('agent-metrics-update', (data) => {
        setAgents(prev => prev.map(agent =>
          agent.id === data.agentId
            ? { ...agent, metrics: { ...agent.metrics, ...data.metrics } }
            : agent
        ));
      });
    }
  }, [isConnected, subscribe]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'busy':
        return <Activity className="w-4 h-4 text-blue-500" />;
      case 'idle':
        return <Pause className="w-4 h-4 text-yellow-500" />;
      case 'offline':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'busy':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'idle':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'offline':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'coordinator':
        return '👨‍💼';
      case 'specialist':
        return '🎯';
      case 'analyst':
        return '📊';
      case 'reviewer':
        return '🔍';
      case 'documenter':
        return '📝';
      case 'tester':
        return '🧪';
      case 'security':
        return '🛡️';
      case 'optimizer':
        return '⚡';
      case 'coder':
        return '👨‍💻';
      case 'engineer':
        return '⚙️';
      case 'monitor':
        return '📡';
      case 'researcher':
        return '🔬';
      default:
        return '🤖';
    }
  };

  const filteredAndSortedAgents = useMemo(() => {
    return agents
      .filter(agent => {
        const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             agent.specialization.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'all' || agent.status === filterStatus;
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'status':
            return a.status.localeCompare(b.status);
          case 'performance':
            return b.metrics.successRate - a.metrics.successRate;
          default:
            return a.name.localeCompare(b.name);
        }
      });
  }, [agents, searchTerm, filterStatus, sortBy]);

  const stats = useMemo(() => {
    const activeAgents = agents.filter(a => a.status === 'active').length;
    const busyAgents = agents.filter(a => a.status === 'busy').length;
    const totalTasks = agents.reduce((sum, a) => sum + a.metrics.tasksCompleted, 0);
    const avgSuccessRate = agents.length > 0 
      ? agents.reduce((sum, a) => sum + a.metrics.successRate, 0) / agents.length 
      : 0;

    return { activeAgents, busyAgents, totalTasks, avgSuccessRate };
  }, [agents]);

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Agent Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Monitor and manage your Claude Code agents</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-700 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Agents</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.activeAgents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Busy Agents</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.busyAgents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Tasks</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.totalTasks.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Zap className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Success Rate</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.avgSuccessRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search agents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {/* Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="busy">Busy</option>
            <option value="idle">Idle</option>
            <option value="offline">Offline</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          >
            <option value="name">Sort by Name</option>
            <option value="status">Sort by Status</option>
            <option value="performance">Sort by Performance</option>
          </select>
        </div>

        {/* View Mode */}
        <div className="flex items-center border border-gray-300 dark:border-gray-700 rounded-lg">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 text-sm font-medium rounded-l-lg ${
              viewMode === 'grid'
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 text-sm font-medium rounded-r-lg border-l border-gray-300 dark:border-gray-700 ${
              viewMode === 'list'
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Agents Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedAgents.map((agent) => (
            <div
              key={agent.id}
              className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              {/* Agent Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getTypeIcon(agent.type)}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{agent.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{agent.type}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full border text-xs font-medium flex items-center gap-1 ${getStatusColor(agent.status)}`}>
                  {getStatusIcon(agent.status)}
                  {agent.status}
                </div>
              </div>

              {/* Current Task */}
              {agent.currentTask && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Current Task:</span> {agent.currentTask}
                  </p>
                </div>
              )}

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tasks Completed</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{agent.metrics.tasksCompleted}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Success Rate</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{agent.metrics.successRate}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Response Time</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{agent.metrics.responseTime}s</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Last Active</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(agent.metrics.lastActive).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {/* Capabilities */}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Capabilities</p>
                <div className="flex flex-wrap gap-1">
                  {agent.capabilities.slice(0, 3).map((capability, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full"
                    >
                      {capability}
                    </span>
                  ))}
                  {agent.capabilities.length > 3 && (
                    <span className="px-2 py-1 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs rounded-full">
                      +{agent.capabilities.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="grid grid-cols-6 gap-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <div className="col-span-2">Agent</div>
              <div>Status</div>
              <div>Tasks</div>
              <div>Success Rate</div>
              <div>Response Time</div>
            </div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAndSortedAgents.map((agent) => (
              <div
                key={agent.id}
                className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              >
                <div className="grid grid-cols-6 gap-4 items-center">
                  <div className="col-span-2 flex items-center gap-3">
                    <span className="text-xl">{getTypeIcon(agent.type)}</span>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">{agent.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{agent.specialization}</p>
                    </div>
                  </div>
                  <div>
                    <div className={`px-2 py-1 rounded-full border text-xs font-medium flex items-center gap-1 w-fit ${getStatusColor(agent.status)}`}>
                      {getStatusIcon(agent.status)}
                      {agent.status}
                    </div>
                  </div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {agent.metrics.tasksCompleted}
                  </div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {agent.metrics.successRate}%
                  </div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {agent.metrics.responseTime}s
                  </div>
                </div>
                {agent.currentTask && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Current:</span> {agent.currentTask}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredAndSortedAgents.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No agents found matching your criteria</p>
        </div>
      )}
    </div>
  );
});

AgentDashboard.displayName = 'AgentDashboard';

export default AgentDashboard;