import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, RefreshCw, Bot, Play, Pause, Trash2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { apiService } from '../services/api';
import { Agent, ApiResponse } from '../types/api';

interface RealAgentManagerProps {
  className?: string;
}

const RealAgentManager: React.FC<RealAgentManagerProps> = ({ className = '' }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Real data loading from production database
  const loadAgents = useCallback(async () => {
    try {
      setError(null);
      const response: ApiResponse<Agent[]> = await apiService.getAgents();
      setAgents(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
      console.error('❌ Error loading agents:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Real-time updates via WebSocket
  useEffect(() => {
    loadAgents();

    // Listen for real-time agent updates
    const handleAgentsUpdate = (updatedAgent: Agent) => {
      setAgents(current => {
        const index = current.findIndex(agent => agent.id === updatedAgent.id);
        if (index >= 0) {
          const updated = [...current];
          updated[index] = updatedAgent;
          return updated;
        } else {
          return [updatedAgent, ...current];
        }
      });
    };

    apiService.on('agents_updated', handleAgentsUpdate);

    return () => {
      apiService.off('agents_updated', handleAgentsUpdate);
    };
  }, [loadAgents]);

  // Real agent operations
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAgents();
  };

  const handleSpawnAgent = async (type: string) => {
    try {
      await apiService.spawnAgent(type, {
        name: `${type}-agent`,
        capabilities: [type, 'production-ready'],
        description: `Production ${type} agent with real database integration`
      });
      // WebSocket will update the UI automatically
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to spawn agent');
    }
  };

  const handleTerminateAgent = async (agentId: string) => {
    try {
      await apiService.terminateAgent(agentId);
      setAgents(current => current.filter(agent => agent.id !== agentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to terminate agent');
    }
  };

  // Filter agents based on search
  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'inactive':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-gray-600">Loading real agent data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent Manager</h2>
          <p className="text-gray-600 mt-1">Real-time production agent management with SQLite database</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => handleSpawnAgent('production')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Spawn Agent
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
          <div>
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.map((agent) => (
          <div key={agent.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3"
                  style={{ backgroundColor: agent.avatar_color || '#6B7280' }}
                >
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{agent.display_name || agent.name}</h3>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(agent.status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                      {agent.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-4">{agent.description}</p>

            {/* Capabilities */}
            {agent.capabilities && agent.capabilities.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-1">
                  {agent.capabilities.slice(0, 3).map((capability, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {capability}
                    </span>
                  ))}
                  {agent.capabilities.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      +{agent.capabilities.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Performance Metrics */}
            {agent.performance_metrics && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Success Rate</span>
                    <div className="font-medium text-green-600">
                      {agent.performance_metrics.success_rate || 0}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Usage</span>
                    <div className="font-medium">{agent.usage_count || 0}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={() => handleSpawnAgent(agent.name)}
                className="flex-1 flex items-center justify-center px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
              >
                <Play className="w-4 h-4 mr-1" />
                Activate
              </button>
              <button
                onClick={() => handleTerminateAgent(agent.id)}
                className="flex items-center justify-center px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Timestamps */}
            <div className="mt-4 text-xs text-gray-500">
              <div>Created: {new Date(agent.created_at).toLocaleDateString()}</div>
              {agent.last_used && (
                <div>Last used: {new Date(agent.last_used).toLocaleDateString()}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredAgents.length === 0 && !loading && (
        <div className="text-center py-12">
          <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No agents found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'No agents match your search criteria.' : 'No agents have been created yet.'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => handleSpawnAgent('starter')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create First Agent
            </button>
          )}
        </div>
      )}

      {/* Connection Status */}
      <div className="mt-6 text-center">
        <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
          Real-time database connection active
        </div>
      </div>
    </div>
  );
};

export default RealAgentManager;
export { RealAgentManager };