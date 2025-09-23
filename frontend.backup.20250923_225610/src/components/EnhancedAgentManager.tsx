import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bot,
  Plus,
  Search,
  Power,
  Edit3,
  Trash2,
  Play,
  Pause,
  MoreHorizontal,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  Users,
  X,
  TestTube,
  TrendingUp,
  Database,
  RefreshCw,
  Server,
  Code,
  Layers,
  Shield,
  Zap,
  Info
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useWebSocketSingleton } from '@/hooks/useWebSocketSingleton';
import LoadingSpinner from './LoadingSpinner';
import { nldLogger } from '@/utils/nld-logger';
import { getWebSocketUrl } from '../utils/websocket-url.ts';

// Types
interface Agent {
  id: string;
  name: string;
  display_name: string;
  description: string;
  system: 'production' | 'development';
  system_prompt?: string;
  avatar_color: string;
  capabilities: string[];
  status: 'active' | 'inactive' | 'error' | 'testing';
  created_at: string;
  updated_at: string;
  last_used?: string;
  usage_count: number;
  performance_metrics?: {
    success_rate: number;
    average_response_time: number;
    total_tokens_used: number;
    error_count: number;
  };
  health_status?: {
    cpu_usage: number;
    memory_usage: number;
    response_time: number;
    last_heartbeat: string;
  };
}

interface AgentGroup {
  active: Agent[];
  inactive: Agent[];
}

interface AgentsBySystem {
  production: AgentGroup;
  development: AgentGroup;
}

interface EnhancedAgentManagerProps {
  className?: string;
  agents?: any;
  onActivateAgent?: (id: string) => void;
  onDeactivateAgent?: (id: string) => void;
}

type TabType = 'production' | 'development' | 'unified';

const EnhancedAgentManager: React.FC<EnhancedAgentManagerProps> = ({ 
  className,
  agents: propAgents,
  onActivateAgent,
  onDeactivateAgent
}) => {
  // NLD logging for component lifecycle
  React.useEffect(() => {
    nldLogger.renderAttempt('EnhancedAgentManager', { className, hasPropAgents: !!propAgents });
    
    // Success timeout
    const successTimer = setTimeout(() => {
      nldLogger.renderSuccess('EnhancedAgentManager');
    }, 1000);
    
    return () => {
      clearTimeout(successTimer);
      nldLogger.debug('EnhancedAgentManager', 'Component unmounting');
    };
  }, []);
  
  const [activeTab, setActiveTab] = useState<TabType>('production');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showAgentDetails, setShowAgentDetails] = useState(false);

  // WebSocket integration - wrapped in try-catch during render
  let ws: any = null;
  let isConnected = false;
  
  try {
    const wsResult = useWebSocketSingleton({
      url: getWebSocketUrl(),
      autoConnect: false, // Don't auto-connect to avoid errors
      maxReconnectAttempts: 3,
      reconnectionDelay: 2000
    });
    ws = wsResult.socket;
    isConnected = wsResult.isConnected;
  } catch (error) {
    nldLogger.warning('EnhancedAgentManager', 'WebSocket hook failed, continuing without real-time updates', error);
    ws = null;
    isConnected = false;
  }

  // Transform prop agents if provided (for testing)
  useEffect(() => {
    if (propAgents) {
      const transformedAgents: Agent[] = [];
      
      if (propAgents.production) {
        if (propAgents.production.active) {
          transformedAgents.push(...propAgents.production.active);
        }
        if (propAgents.production.inactive) {
          transformedAgents.push(...propAgents.production.inactive);
        }
      }
      
      if (propAgents.development) {
        if (propAgents.development.active) {
          transformedAgents.push(...propAgents.development.active);
        }
        if (propAgents.development.inactive) {
          transformedAgents.push(...propAgents.development.inactive);
        }
      }
      
      setAgents(transformedAgents);
      setLoading(false);
    }
  }, [propAgents]);

  // Load agents from API
  const loadAgents = useCallback(async (showRefreshing = false) => {
    if (propAgents) return; // Skip if using prop agents for testing
    
    if (showRefreshing) setRefreshing(true);
    
    try {
      // Load from both production and development endpoints
      const [prodResponse, devResponse] = await Promise.all([
        fetch('/api/v1/claude-live/prod/agents'),
        fetch('/api/v1/claude-live/dev/agents')
      ]);

      const prodData = prodResponse.ok ? await prodResponse.json() : { agents: [] };
      const devData = devResponse.ok ? await devResponse.json() : { agents: [] };

      // Transform and tag agents with their system
      const prodAgents = (prodData.agents || []).map((agent: any) => ({
        ...transformAgent(agent),
        system: 'production' as const
      }));

      const devAgents = (devData.agents || []).map((agent: any) => ({
        ...transformAgent(agent),
        system: 'development' as const
      }));

      setAgents([...prodAgents, ...devAgents]);
      setError(null);
    } catch (err) {
      setError('Error loading agents');
      console.error('Failed to load agents:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [propAgents]);

  // Transform agent data from API
  const transformAgent = (agent: any): Omit<Agent, 'system'> => ({
    id: agent.id,
    name: agent.name,
    display_name: agent.display_name || agent.name,
    description: agent.description || 'No description available',
    system_prompt: agent.system_prompt || `You are ${agent.name}`,
    avatar_color: agent.avatar_color || agent.color || '#3B82F6',
    capabilities: agent.capabilities || [],
    status: agent.status || 'inactive',
    created_at: agent.created_at || new Date().toISOString(),
    updated_at: agent.updated_at || agent.lastActivity || new Date().toISOString(),
    last_used: agent.last_used || agent.lastActivity,
    usage_count: agent.usage_count || 0,
    performance_metrics: agent.performance_metrics || {
      success_rate: 0.95,
      average_response_time: 1200,
      total_tokens_used: 0,
      error_count: 0
    },
    health_status: agent.health_status || {
      cpu_usage: 0,
      memory_usage: 0,
      response_time: 500,
      last_heartbeat: new Date().toISOString()
    }
  });

  // WebSocket message handler
  useEffect(() => {
    if (!ws || !isConnected) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'agent_update') {
          // Update agent status in real-time
          setAgents(prev => prev.map(agent => 
            agent.id === data.agentId 
              ? { ...agent, ...data.updates }
              : agent
          ));
        } else if (data.type === 'agent_added') {
          // Add new agent
          const newAgent = {
            ...transformAgent(data.agent),
            system: data.system as 'production' | 'development'
          };
          setAgents(prev => [...prev, newAgent]);
        } else if (data.type === 'agent_removed') {
          // Remove agent
          setAgents(prev => prev.filter(a => a.id !== data.agentId));
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err);
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws, isConnected]);

  // Initial load
  useEffect(() => {
    if (!propAgents) {
      loadAgents();
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(() => loadAgents(), 30000);
      return () => clearInterval(interval);
    }
  }, [loadAgents, propAgents]);

  // Organize agents by system and status
  const agentsBySystem = useMemo<AgentsBySystem>(() => {
    const organized: AgentsBySystem = {
      production: { active: [], inactive: [] },
      development: { active: [], inactive: [] }
    };

    agents.forEach(agent => {
      const system = agent.system || 'development';
      const statusGroup = agent.status === 'active' ? 'active' : 'inactive';
      organized[system][statusGroup].push(agent);
    });

    return organized;
  }, [agents]);

  // Get filtered agents based on active tab
  const filteredAgents = useMemo(() => {
    let tabAgents: Agent[] = [];

    if (activeTab === 'unified') {
      tabAgents = agents;
    } else {
      tabAgents = agents.filter(agent => agent.system === activeTab);
    }

    // Apply search filter
    if (searchQuery) {
      tabAgents = tabAgents.filter(agent =>
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.capabilities.some(cap => cap.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return tabAgents;
  }, [agents, activeTab, searchQuery]);

  // Separate active and inactive agents
  const { activeAgents, inactiveAgents } = useMemo(() => {
    const active = filteredAgents.filter(a => a.status === 'active');
    const inactive = filteredAgents.filter(a => a.status !== 'active');
    return { activeAgents: active, inactiveAgents: inactive };
  }, [filteredAgents]);

  // Get agent counts for tab badges
  const getTabCounts = useCallback((tab: TabType) => {
    if (tab === 'unified') {
      return agents.length;
    }
    return agents.filter(a => a.system === tab).length;
  }, [agents]);

  // Handle agent activation/deactivation
  const handleToggleAgentStatus = async (agent: Agent) => {
    const newStatus = agent.status === 'active' ? 'inactive' : 'active';
    
    try {
      // Update local state immediately
      setAgents(prev => prev.map(a => 
        a.id === agent.id 
          ? { ...a, status: newStatus, updated_at: new Date().toISOString() }
          : a
      ));

      // Call appropriate callback
      if (newStatus === 'active' && onActivateAgent) {
        onActivateAgent(agent.id);
      } else if (newStatus === 'inactive' && onDeactivateAgent) {
        onDeactivateAgent(agent.id);
      }

      // Send WebSocket message
      if (ws && isConnected) {
        ws.send(JSON.stringify({
          type: 'agent_status_change',
          agentId: agent.id,
          status: newStatus,
          system: agent.system
        }));
      }
    } catch (err) {
      setError(`Failed to ${newStatus === 'active' ? 'activate' : 'deactivate'} agent`);
      console.error('Error toggling agent status:', err);
    }
  };

  // Tab configuration
  const tabs: { id: TabType; label: string; icon: React.ReactNode; color: string }[] = [
    { 
      id: 'production', 
      label: 'Production',
      icon: <Server className="w-4 h-4" />,
      color: 'text-green-600'
    },
    { 
      id: 'development', 
      label: 'Development',
      icon: <Code className="w-4 h-4" />,
      color: 'text-blue-600'
    },
    { 
      id: 'unified', 
      label: 'Unified',
      icon: <Layers className="w-4 h-4" />,
      color: 'text-purple-600'
    }
  ];

  // Agent card component
  const AgentCard: React.FC<{ agent: Agent }> = ({ agent }) => (
    <div
      className={cn(
        'bg-white rounded-lg border hover:shadow-md transition-all duration-200',
        agent.status === 'active' ? 'border-green-200' : 'border-gray-200'
      )}
      data-status={agent.status}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: agent.avatar_color }}
            >
              {agent.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 flex items-center">
                {agent.display_name}
                {agent.system === 'production' && (
                  <Shield className="w-4 h-4 ml-2 text-green-600" />
                )}
                {agent.system === 'development' && (
                  <Code className="w-4 h-4 ml-2 text-blue-600" />
                )}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                  agent.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                )}>
                  {agent.status === 'active' ? (
                    <CheckCircle className="w-3 h-3 mr-1" />
                  ) : (
                    <Pause className="w-3 h-3 mr-1" />
                  )}
                  {agent.status}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleToggleAgentStatus(agent)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              agent.status === 'active'
                ? 'text-green-600 hover:bg-green-50'
                : 'text-gray-400 hover:bg-gray-100'
            )}
            aria-label={agent.status === 'active' ? `Deactivate ${agent.id}` : `Activate ${agent.id}`}
          >
            {agent.status === 'active' ? <Power className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {agent.description}
        </p>

        <div className="flex flex-wrap gap-1 mb-3">
          {agent.capabilities.slice(0, 3).map((cap, idx) => (
            <span
              key={idx}
              className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
            >
              {cap}
            </span>
          ))}
          {agent.capabilities.length > 3 && (
            <span className="px-2 py-1 bg-gray-50 text-gray-500 text-xs rounded-full">
              +{agent.capabilities.length - 3}
            </span>
          )}
        </div>

        {agent.performance_metrics && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-1">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span>{(agent.performance_metrics.success_rate * 100).toFixed(0)}%</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3 text-blue-600" />
              <span>{agent.performance_metrics.average_response_time}ms</span>
            </div>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {agent.usage_count} uses
          </div>
          <button
            onClick={() => {
              setSelectedAgent(agent);
              setShowAgentDetails(true);
            }}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );

  // Agent section component
  const AgentSection: React.FC<{ 
    title: string; 
    agents: Agent[]; 
    icon: React.ReactNode;
    emptyMessage: string;
  }> = ({ title, agents: sectionAgents, icon, emptyMessage }) => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          {icon}
          <span className="ml-2">{title}</span>
          <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
            {sectionAgents.length}
          </span>
        </h3>
      </div>

      {sectionAgents.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Info className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sectionAgents.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className={cn('max-w-7xl mx-auto p-6', className)}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('max-w-7xl mx-auto p-6', className)}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Bot className="w-8 h-8 mr-3 text-blue-600" />
              Agents
            </h1>
            <p className="text-gray-600 mt-2">
              Manage agents across Production and Development environments
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {isConnected && (
              <span className="flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                <Zap className="w-3 h-3 mr-1" />
                Live
              </span>
            )}
            
            <button
              onClick={() => loadAgents(true)}
              disabled={refreshing}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', refreshing && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'py-2 px-1 border-b-2 font-medium text-sm flex items-center transition-colors',
                activeTab === tab.id
                  ? `border-blue-500 ${tab.color}`
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-label={tab.label}
            >
              {tab.icon}
              <span className="ml-2">{tab.label}</span>
              <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                {getTabCounts(tab.id)}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
          <span className="text-red-700">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Content */}
      {filteredAgents.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No agents found</h3>
          <p className="text-gray-500">
            {searchQuery 
              ? 'Try adjusting your search query' 
              : `No agents in ${activeTab} environment`}
          </p>
        </div>
      ) : (
        <>
          {/* Active Agents Section */}
          <AgentSection
            title="Active Agents"
            agents={activeAgents}
            icon={<Activity className="w-5 h-5 text-green-600" />}
            emptyMessage="No active agents in this environment"
          />

          {/* Inactive Agents Section */}
          <AgentSection
            title="Inactive Agents"
            agents={inactiveAgents}
            icon={<Pause className="w-5 h-5 text-gray-600" />}
            emptyMessage="All agents are currently active"
          />
        </>
      )}

      {/* Agent Details Modal */}
      {showAgentDetails && selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Agent Details: {selectedAgent.display_name}
                </h2>
                <button
                  onClick={() => {
                    setShowAgentDetails(false);
                    setSelectedAgent(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-medium text-gray-700 mb-2">System</h3>
                <p className="text-gray-600 capitalize">{selectedAgent.system}</p>
              </div>

              <div>
                <h3 className="font-medium text-gray-700 mb-2">Description</h3>
                <p className="text-gray-600">{selectedAgent.description}</p>
              </div>

              <div>
                <h3 className="font-medium text-gray-700 mb-2">Capabilities</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedAgent.capabilities.map((cap, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              {selectedAgent.performance_metrics && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Performance Metrics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Success Rate</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {(selectedAgent.performance_metrics.success_rate * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Avg Response Time</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {selectedAgent.performance_metrics.average_response_time}ms
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Tokens Used</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {selectedAgent.performance_metrics.total_tokens_used.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Error Count</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {selectedAgent.performance_metrics.error_count}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Created: {new Date(selectedAgent.created_at).toLocaleDateString()}</span>
                  <span>Updated: {new Date(selectedAgent.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedAgentManager;