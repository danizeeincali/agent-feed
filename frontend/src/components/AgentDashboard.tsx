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

  // Mock agent data - In production, this would come from API
  const mockAgents: Agent[] = [
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
      id: 'documentation',
      name: 'Documentation Agent',
      type: 'documenter',
      status: 'active',
      capabilities: ['Technical Writing', 'API Documentation', 'User Guides'],
      currentTask: 'Updating API documentation',
      metrics: {
        tasksCompleted: 124,
        successRate: 95.6,
        responseTime: 4.2,
        lastActive: new Date().toISOString()
      },
      specialization: 'Technical documentation and knowledge management',
      description: 'Creates and maintains comprehensive technical documentation.'
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
    },
    {
      id: 'security',
      name: 'Security Agent',
      type: 'security',
      status: 'offline',
      capabilities: ['Vulnerability Scanning', 'Security Analysis', 'Threat Detection'],
      metrics: {
        tasksCompleted: 45,
        successRate: 99.8,
        responseTime: 6.2,
        lastActive: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      },
      specialization: 'Security analysis and vulnerability assessment',
      description: 'Monitors and analyzes security vulnerabilities and threats.'
    },
    {
      id: 'performance',
      name: 'Performance Agent',
      type: 'optimizer',
      status: 'active',
      capabilities: ['Performance Analysis', 'Optimization', 'Bottleneck Detection'],
      currentTask: 'Analyzing system performance metrics',
      metrics: {
        tasksCompleted: 78,
        successRate: 96.9,
        responseTime: 3.1,
        lastActive: new Date().toISOString()
      },
      specialization: 'System performance optimization',
      description: 'Monitors and optimizes system performance and resource usage.'
    },
    {
      id: 'database',
      name: 'Database Agent',
      type: 'specialist',
      status: 'idle',
      capabilities: ['Database Management', 'Query Optimization', 'Data Analysis'],
      metrics: {
        tasksCompleted: 112,
        successRate: 98.1,
        responseTime: 2.7,
        lastActive: new Date(Date.now() - 8 * 60 * 1000).toISOString()
      },
      specialization: 'Database administration and optimization',
      description: 'Manages database operations, optimization, and data integrity.'
    },
    {
      id: 'frontend',
      name: 'Frontend Agent',
      type: 'coder',
      status: 'busy',
      capabilities: ['UI Development', 'React', 'User Experience'],
      currentTask: 'Implementing responsive design updates',
      metrics: {
        tasksCompleted: 187,
        successRate: 95.4,
        responseTime: 4.6,
        lastActive: new Date().toISOString()
      },
      specialization: 'Frontend development and user interface',
      description: 'Develops and maintains frontend applications and user interfaces.'
    },
    {
      id: 'backend',
      name: 'Backend Agent',
      type: 'coder',
      status: 'active',
      capabilities: ['API Development', 'Microservices', 'System Architecture'],
      currentTask: 'Optimizing API endpoints',
      metrics: {
        tasksCompleted: 156,
        successRate: 97.3,
        responseTime: 3.8,
        lastActive: new Date().toISOString()
      },
      specialization: 'Backend development and API design',
      description: 'Develops backend services, APIs, and system architecture.'
    },
    {
      id: 'devops',
      name: 'DevOps Agent',
      type: 'engineer',
      status: 'active',
      capabilities: ['Infrastructure', 'CI/CD', 'Deployment'],
      currentTask: 'Monitoring deployment pipeline',
      metrics: {
        tasksCompleted: 134,
        successRate: 98.7,
        responseTime: 2.9,
        lastActive: new Date().toISOString()
      },
      specialization: 'Infrastructure and deployment automation',
      description: 'Manages infrastructure, CI/CD pipelines, and deployment processes.'
    },
    {
      id: 'analytics',
      name: 'Analytics Agent',
      type: 'analyst',
      status: 'busy',
      capabilities: ['Data Analysis', 'Metrics Tracking', 'Reporting'],
      currentTask: 'Generating weekly performance report',
      metrics: {
        tasksCompleted: 98,
        successRate: 96.5,
        responseTime: 5.1,
        lastActive: new Date().toISOString()
      },
      specialization: 'Data analytics and business intelligence',
      description: 'Analyzes data patterns and generates insights for decision making.'
    },
    {
      id: 'monitoring',
      name: 'Monitoring Agent',
      type: 'monitor',
      status: 'active',
      capabilities: ['System Monitoring', 'Alert Management', 'Health Checks'],
      currentTask: 'Monitoring system health',
      metrics: {
        tasksCompleted: 267,
        successRate: 99.2,
        responseTime: 1.5,
        lastActive: new Date().toISOString()
      },
      specialization: 'System monitoring and alerting',
      description: 'Continuously monitors system health and manages alerts.'
    },
    {
      id: 'deployment',
      name: 'Deployment Agent',
      type: 'engineer',
      status: 'idle',
      capabilities: ['Release Management', 'Deployment', 'Rollback'],
      metrics: {
        tasksCompleted: 56,
        successRate: 99.6,
        responseTime: 4.3,
        lastActive: new Date(Date.now() - 12 * 60 * 1000).toISOString()
      },
      specialization: 'Release and deployment management',
      description: 'Manages software releases and deployment processes.'
    },
    {
      id: 'integration',
      name: 'Integration Agent',
      type: 'coordinator',
      status: 'active',
      capabilities: ['Service Integration', 'API Orchestration', 'Data Flow'],
      currentTask: 'Synchronizing service integrations',
      metrics: {
        tasksCompleted: 89,
        successRate: 97.8,
        responseTime: 3.2,
        lastActive: new Date().toISOString()
      },
      specialization: 'Service integration and orchestration',
      description: 'Coordinates integrations between different services and systems.'
    },
    {
      id: 'research',
      name: 'Research Agent',
      type: 'researcher',
      status: 'busy',
      capabilities: ['Technology Research', 'Market Analysis', 'Innovation'],
      currentTask: 'Researching emerging technologies',
      metrics: {
        tasksCompleted: 73,
        successRate: 95.9,
        responseTime: 7.1,
        lastActive: new Date().toISOString()
      },
      specialization: 'Technology research and innovation',
      description: 'Researches new technologies and identifies innovation opportunities.'
    }
  ];

  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      setAgents(mockAgents);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
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
          <h1 className="text-2xl font-bold text-gray-900">Agent Dashboard</h1>
          <p className="text-gray-600">Monitor and manage your Claude Code agents</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
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
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
          </div>

          {/* Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
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
            onChange={(e) => setSortBy(e.target.value as any)}
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
            <div
              key={agent.id}
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
                    {new Date(agent.metrics.lastActive).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {/* Capabilities */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Capabilities</p>
                <div className="flex flex-wrap gap-1">
                  {agent.capabilities.slice(0, 3).map((capability, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                    >
                      {capability}
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
              <div
                key={agent.id}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
              >
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
  );
});

AgentDashboard.displayName = 'AgentDashboard';

export default AgentDashboard;