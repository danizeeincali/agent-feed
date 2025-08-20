import React, { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Pause,
  TrendingUp,
  Users,
  Zap,
  Search,
  Grid3X3,
  List,
  RefreshCw,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { ErrorBoundary } from './ErrorBoundary';
import {
  safeArray,
  safeObject,
  safeString,
  safeNumber,
  safeDate,
  withSafetyWrapper,
  safeHandler
} from '@/utils/safetyUtils';

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
  onError?: (error: Error) => void;
  fallback?: React.ReactNode;
  retryable?: boolean;
}

// Safe data transformer
const transformToSafeAgent = (agent: any): Agent | null => {
  try {
    if (!agent || typeof agent !== 'object') return null;
    
    const safeAgent: Agent = {
      id: safeString(agent.id, `agent-${Date.now()}-${Math.random()}`),
      name: safeString(agent.name, 'Unknown Agent'),
      type: safeString(agent.type, 'unknown'),
      status: ['active', 'idle', 'busy', 'offline'].includes(agent.status) 
        ? agent.status 
        : 'offline',
      capabilities: safeArray(agent.capabilities).filter(cap => typeof cap === 'string'),
      currentTask: agent.currentTask ? safeString(agent.currentTask) : undefined,
      metrics: {
        tasksCompleted: safeNumber(agent.metrics?.tasksCompleted, 0),
        successRate: Math.min(100, Math.max(0, safeNumber(agent.metrics?.successRate, 0))),
        responseTime: Math.max(0, safeNumber(agent.metrics?.responseTime, 0)),
        lastActive: safeDate(agent.metrics?.lastActive).toISOString()
      },
      specialization: safeString(agent.specialization, 'General purpose agent'),
      description: safeString(agent.description, 'No description available')
    };
    
    return safeAgent;
  } catch (error) {
    console.error('Failed to transform agent data:', error);
    return null;
  }
};

// Loading skeleton for agents
const AgentSkeleton: React.FC = memo(() => (
  <div className="bg-white rounded-lg border border-gray-200 p-6">
    <div className="animate-pulse">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
  </div>
));

AgentSkeleton.displayName = 'AgentSkeleton';

// Individual agent error boundary
const AgentErrorBoundary: React.FC<{ children: React.ReactNode; agentId?: string }> = ({ children, agentId }) => (
  <ErrorBoundary
    fallback={({ error, resetErrorBoundary }) => (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center text-red-700 mb-2">
          <AlertTriangle className="w-4 h-4 mr-2" />
          <span className="font-medium">Agent Error</span>
        </div>
        <p className="text-red-600 text-sm mb-3">
          Failed to load agent {agentId ? `(ID: ${agentId})` : ''}.
        </p>
        <button
          onClick={resetErrorBoundary}
          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )}
    isolate
  >
    {children}
  </ErrorBoundary>
);

const BulletproofAgentDashboard: React.FC<AgentDashboardProps> = memo(({ 
  className = '',
  onError,
  retryable = true
}) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'performance'>('name');
  const [retryCount, setRetryCount] = useState(0);

  // Safe WebSocket hook usage
  const webSocketHook = useWebSocket();
  const { isConnected = false, subscribe = () => {} } = safeObject(webSocketHook);

  // Safe error handler
  const handleError = useCallback((err: Error, context?: string) => {
    console.error(`AgentDashboard Error${context ? ` (${context})` : ''}:`, err);
    setError(err.message || 'An unexpected error occurred');
    onError?.(err);
  }, [onError]);

  // Mock data with comprehensive safety
  const mockAgents: Agent[] = useMemo(() => {
    try {
      return [
        {
          id: 'chief-of-staff',
          name: 'Chief of Staff Agent',
          type: 'coordinator',
          status: 'active',
          capabilities: ['Strategic Planning', 'Task Coordination', 'Priority Assessment'],
          currentTask: 'Coordinating morning workflow review',
          metrics: {
            tasksCompleted: 156,
            successRate: 98.5,
            responseTime: 1.2,
            lastActive: new Date().toISOString()
          },
          specialization: 'Strategic coordination and executive assistance',
          description: 'Manages high-level strategic initiatives and coordinates between other agents.'
        },
        {
          id: 'personal-todos',
          name: 'Personal Todos Agent',
          type: 'specialist',
          status: 'busy',
          capabilities: ['Task Management', 'Priority Sorting', 'Deadline Tracking'],
          currentTask: 'Processing weekly task priorities',
          metrics: {
            tasksCompleted: 342,
            successRate: 96.8,
            responseTime: 0.8,
            lastActive: new Date(Date.now() - 5 * 60 * 1000).toISOString()
          },
          specialization: 'Personal productivity and task organization',
          description: 'Organizes and prioritizes personal and professional tasks.'
        },
        {
          id: 'impact-filter',
          name: 'Impact Filter Agent',
          type: 'analyst',
          status: 'active',
          capabilities: ['Impact Analysis', 'Priority Assessment', 'Business Value Calculation'],
          currentTask: 'Analyzing project impact scores',
          metrics: {
            tasksCompleted: 89,
            successRate: 99.1,
            responseTime: 2.1,
            lastActive: new Date(Date.now() - 2 * 60 * 1000).toISOString()
          },
          specialization: 'Business impact and priority analysis',
          description: 'Evaluates and filters initiatives based on business impact potential.'
        },
        // Additional safe mock agents...
        {
          id: 'code-review',
          name: 'Code Review Agent',
          type: 'reviewer',
          status: 'idle',
          capabilities: ['Code Analysis', 'Quality Assurance', 'Security Review'],
          metrics: {
            tasksCompleted: 67,
            successRate: 97.2,
            responseTime: 3.4,
            lastActive: new Date(Date.now() - 15 * 60 * 1000).toISOString()
          },
          specialization: 'Code quality and security analysis',
          description: 'Reviews code for quality, security vulnerabilities, and best practices.'
        },
        {
          id: 'testing',
          name: 'Testing Agent',
          type: 'tester',
          status: 'busy',
          capabilities: ['Automated Testing', 'Test Case Generation', 'Quality Validation'],
          currentTask: 'Running integration test suite',
          metrics: {
            tasksCompleted: 203,
            successRate: 94.3,
            responseTime: 5.8,
            lastActive: new Date(Date.now() - 1 * 60 * 1000).toISOString()
          },
          specialization: 'Automated testing and quality assurance',
          description: 'Develops and executes comprehensive test suites for quality validation.'
        }
      ].map(transformToSafeAgent).filter((agent): agent is Agent => agent !== null);
    } catch (error) {
      console.error('Error creating mock agents:', error);
      return [];
    }
  }, []);

  // Safe data fetching with comprehensive error handling
  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real application, this would be an actual API call
      // const response = await fetch('/api/v1/agents');
      // if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      // const data = await response.json();
      
      // For now, use mock data
      setAgents(mockAgents);
      setRetryCount(0);
    } catch (err) {
      if (err instanceof Error) {
        handleError(err, 'load');
      } else {
        handleError(new Error('Unknown error occurred while loading agents'), 'load');
      }
      
      // Set fallback data on error
      if (agents.length === 0) {
        setAgents(mockAgents);
      }
    } finally {
      setLoading(false);
    }
  }, [mockAgents, handleError, agents.length]);

  // Initialize component
  useEffect(() => {
    let mounted = true;
    
    const initialize = async () => {
      try {
        await loadAgents();
      } catch (error) {
        if (mounted) {
          handleError(error instanceof Error ? error : new Error('Initialization failed'), 'init');
        }
      }
    };
    
    initialize();
    
    return () => {
      mounted = false;
    };
  }, [loadAgents, handleError]);

  // WebSocket event handlers with safety
  useEffect(() => {
    if (isConnected) {
      const safeHandlers = {
        handleAgentStatusUpdate: safeHandler((data: any) => {
          const agentId = safeString(data?.agentId);
          const status = data?.status;
          const currentTask = data?.currentTask;
          
          if (agentId && ['active', 'idle', 'busy', 'offline'].includes(status)) {
            setAgents(prev => prev.map(agent => 
              agent.id === agentId 
                ? { 
                    ...agent, 
                    status, 
                    currentTask: currentTask ? safeString(currentTask) : agent.currentTask 
                  }
                : agent
            ));
          }
        }),
        
        handleAgentMetricsUpdate: safeHandler((data: any) => {
          const agentId = safeString(data?.agentId);
          const metrics = safeObject(data?.metrics);
          
          if (agentId && Object.keys(metrics).length > 0) {
            setAgents(prev => prev.map(agent =>
              agent.id === agentId
                ? { 
                    ...agent, 
                    metrics: { 
                      ...agent.metrics, 
                      tasksCompleted: safeNumber(metrics.tasksCompleted, agent.metrics.tasksCompleted),
                      successRate: Math.min(100, Math.max(0, safeNumber(metrics.successRate, agent.metrics.successRate))),
                      responseTime: Math.max(0, safeNumber(metrics.responseTime, agent.metrics.responseTime)),
                      lastActive: safeDate(metrics.lastActive || agent.metrics.lastActive).toISOString()
                    }
                  }
                : agent
            ));
          }
        })
      };
      
      subscribe('agent-status-update', safeHandlers.handleAgentStatusUpdate);
      subscribe('agent-metrics-update', safeHandlers.handleAgentMetricsUpdate);
      
      return () => {
        // Cleanup would be handled by the hook
      };
    }
  }, [isConnected, subscribe]);

  // Safe utility functions
  const getStatusIcon = useCallback((status: string) => {
    const statusMap = {
      'active': <CheckCircle className="w-4 h-4 text-green-500" />,
      'busy': <Activity className="w-4 h-4 text-blue-500" />,
      'idle': <Pause className="w-4 h-4 text-yellow-500" />,
      'offline': <AlertCircle className="w-4 h-4 text-red-500" />
    };
    return statusMap[status as keyof typeof statusMap] || <AlertCircle className="w-4 h-4 text-gray-500" />;
  }, []);

  const getStatusColor = useCallback((status: string) => {
    const colorMap = {
      'active': 'bg-green-100 text-green-800 border-green-200',
      'busy': 'bg-blue-100 text-blue-800 border-blue-200',
      'idle': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'offline': 'bg-red-100 text-red-800 border-red-200'
    };
    return colorMap[status as keyof typeof colorMap] || 'bg-gray-100 text-gray-800 border-gray-200';
  }, []);

  const getTypeIcon = useCallback((type: string) => {
    const typeMap: Record<string, string> = {
      'coordinator': '👨‍💼',
      'specialist': '🎯',
      'analyst': '📊',
      'reviewer': '🔍',
      'documenter': '📝',
      'tester': '🧪',
      'security': '🛡️',
      'optimizer': '⚡',
      'coder': '👨‍💻',
      'engineer': '⚙️',
      'monitor': '📡',
      'researcher': '🔬'
    };
    return typeMap[safeString(type)] || '🤖';
  }, []);

  // Safe filtering and sorting
  const filteredAndSortedAgents = useMemo(() => {
    try {
      return safeArray(agents)
        .filter(agent => {
          if (!agent || !agent.id) return false;
          
          const matchesSearch = 
            safeString(agent.name).toLowerCase().includes(safeString(searchTerm).toLowerCase()) ||
            safeString(agent.specialization).toLowerCase().includes(safeString(searchTerm).toLowerCase());
          
          const matchesFilter = filterStatus === 'all' || agent.status === filterStatus;
          
          return matchesSearch && matchesFilter;
        })
        .sort((a, b) => {
          try {
            switch (sortBy) {
              case 'status':
                return safeString(a.status).localeCompare(safeString(b.status));
              case 'performance':
                return safeNumber(b.metrics?.successRate, 0) - safeNumber(a.metrics?.successRate, 0);
              default:
                return safeString(a.name).localeCompare(safeString(b.name));
            }
          } catch (error) {
            console.error('Error sorting agents:', error);
            return 0;
          }
        });
    } catch (error) {
      console.error('Error filtering/sorting agents:', error);
      return [];
    }
  }, [agents, searchTerm, filterStatus, sortBy]);

  // Safe statistics calculation
  const stats = useMemo(() => {
    try {
      const validAgents = safeArray(agents).filter(a => a && a.id);
      
      return {
        activeAgents: validAgents.filter(a => a.status === 'active').length,
        busyAgents: validAgents.filter(a => a.status === 'busy').length,
        totalTasks: validAgents.reduce((sum, a) => sum + safeNumber(a.metrics?.tasksCompleted, 0), 0),
        avgSuccessRate: validAgents.length > 0 
          ? validAgents.reduce((sum, a) => sum + safeNumber(a.metrics?.successRate, 0), 0) / validAgents.length 
          : 0
      };
    } catch (error) {
      console.error('Error calculating stats:', error);
      return {
        activeAgents: 0,
        busyAgents: 0,
        totalTasks: 0,
        avgSuccessRate: 0
      };
    }
  }, [agents]);

  // Safe handlers
  const handleRefresh = useCallback(() => {
    setRetryCount(prev => prev + 1);
    loadAgents();
  }, [loadAgents]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(safeString(e.target.value));
  }, []);

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(safeString(e.target.value, 'all'));
  }, []);

  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(safeString(e.target.value, 'name') as 'name' | 'status' | 'performance');
  }, []);

  // Loading state
  if (loading && agents.length === 0) {
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
              <AgentSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && agents.length === 0) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="text-gray-400 mb-4">
            <Users className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load agents</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          {retryable && (
            <div className="space-y-2">
              <button 
                onClick={handleRefresh}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                    Retrying...
                  </>
                ) : (
                  'Try again'
                )}
              </button>
              {retryCount > 0 && (
                <p className="text-xs text-gray-500">
                  Retry attempt: {retryCount}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={({ error, resetErrorBoundary }) => (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Agent Dashboard Error</h2>
            <p className="text-gray-600 mb-4">{error?.message || 'Something went wrong'}</p>
            <button 
              onClick={resetErrorBoundary}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    >
      <div className={`p-6 space-y-6 ${className}`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agent Dashboard</h1>
            <p className="text-gray-600">Monitor and manage your Claude Code agents</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Agents</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.activeAgents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Busy Agents</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.busyAgents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Tasks</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalTasks.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Zap className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Success Rate</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.avgSuccessRate.toFixed(1)}%</p>
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
                onChange={handleSearchChange}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>

            {/* Filter */}
            <select
              value={filterStatus}
              onChange={handleFilterChange}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              onChange={handleSortChange}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="name">Sort by Name</option>
              <option value="status">Sort by Status</option>
              <option value="performance">Sort by Performance</option>
            </select>
          </div>

          {/* View Mode */}
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-l-lg',
                viewMode === 'grid'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              )}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-r-lg border-l border-gray-300',
                viewMode === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Agents Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedAgents.map((agent) => (
              <AgentErrorBoundary key={agent.id} agentId={agent.id}>
                <div
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                >
                  {/* Agent Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getTypeIcon(agent.type)}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                        <p className="text-sm text-gray-500 capitalize">{agent.type}</p>
                      </div>
                    </div>
                    <div className={cn(
                      'px-2 py-1 rounded-full border text-xs font-medium flex items-center gap-1',
                      getStatusColor(agent.status)
                    )}>
                      {getStatusIcon(agent.status)}
                      {agent.status}
                    </div>
                  </div>

                  {/* Current Task */}
                  {agent.currentTask && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Current Task:</span> {agent.currentTask}
                      </p>
                    </div>
                  )}

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Tasks Completed</p>
                      <p className="text-lg font-semibold text-gray-900">{agent.metrics.tasksCompleted}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Success Rate</p>
                      <p className="text-lg font-semibold text-gray-900">{agent.metrics.successRate}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Response Time</p>
                      <p className="text-lg font-semibold text-gray-900">{agent.metrics.responseTime}s</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Last Active</p>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {safeDate(agent.metrics.lastActive).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  {/* Capabilities */}
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Capabilities</p>
                    <div className="flex flex-wrap gap-1">
                      {safeArray(agent.capabilities).slice(0, 3).map((capability, index) => (
                        <span
                          key={`${agent.id}-cap-${index}`}
                          className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                        >
                          {safeString(capability)}
                        </span>
                      ))}
                      {agent.capabilities.length > 3 && (
                        <span className="px-2 py-1 bg-gray-50 text-gray-500 text-xs rounded-full">
                          +{agent.capabilities.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </AgentErrorBoundary>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-6 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="col-span-2">Agent</div>
                <div>Status</div>
                <div>Tasks</div>
                <div>Success Rate</div>
                <div>Response Time</div>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {filteredAndSortedAgents.map((agent) => (
                <AgentErrorBoundary key={agent.id} agentId={agent.id}>
                  <div className="px-6 py-4 hover:bg-gray-50 cursor-pointer">
                    <div className="grid grid-cols-6 gap-4 items-center">
                      <div className="col-span-2 flex items-center gap-3">
                        <span className="text-xl">{getTypeIcon(agent.type)}</span>
                        <div>
                          <h3 className="font-medium text-gray-900">{agent.name}</h3>
                          <p className="text-sm text-gray-500">{agent.specialization}</p>
                        </div>
                      </div>
                      <div>
                        <div className={cn(
                          'px-2 py-1 rounded-full border text-xs font-medium flex items-center gap-1 w-fit',
                          getStatusColor(agent.status)
                        )}>
                          {getStatusIcon(agent.status)}
                          {agent.status}
                        </div>
                      </div>
                      <div className="text-sm text-gray-900">
                        {agent.metrics.tasksCompleted}
                      </div>
                      <div className="text-sm text-gray-900">
                        {agent.metrics.successRate}%
                      </div>
                      <div className="text-sm text-gray-900">
                        {agent.metrics.responseTime}s
                      </div>
                    </div>
                    {agent.currentTask && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Current:</span> {agent.currentTask}
                      </div>
                    )}
                  </div>
                </AgentErrorBoundary>
              ))}
            </div>
          </div>
        )}

        {filteredAndSortedAgents.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">No agents found matching your criteria</p>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
});

BulletproofAgentDashboard.displayName = 'BulletproofAgentDashboard';

// Export with safety wrapper
export default withSafetyWrapper(BulletproofAgentDashboard, 'BulletproofAgentDashboard');
export { BulletproofAgentDashboard };