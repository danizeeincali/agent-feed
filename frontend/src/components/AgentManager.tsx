import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { cn } from '../utils/cn';
import LoadingSpinner from './LoadingSpinner';

// Types
interface Agent {
  id: string;
  name: string;
  display_name: string;
  description: string;
  system_prompt: string;
  avatar_color: string;
  capabilities: string[];
  status: 'active' | 'inactive' | 'error' | 'testing';
  created_at: string;
  updated_at: string;
  last_used?: string;
  usage_count: number;
  performance_metrics: {
    success_rate: number;
    average_response_time: number;
    total_tokens_used: number;
    error_count: number;
  };
  health_status: {
    cpu_usage: number;
    memory_usage: number;
    response_time: number;
    last_heartbeat: string;
  };
}

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  capabilities: string[];
  avatar_color: string;
}

interface AgentManagerProps {
  className?: string;
}

const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'researcher',
    name: 'Research Agent',
    description: 'Specialized in web research and data analysis',
    system_prompt: 'You are a research specialist focused on gathering, analyzing, and synthesizing information from various sources.',
    capabilities: ['research', 'analysis', 'data-mining', 'reporting'],
    avatar_color: '#3B82F6'
  },
  {
    id: 'content-creator',
    name: 'Content Creator',
    description: 'Creates engaging content and marketing materials',
    system_prompt: 'You are a creative content specialist focused on generating engaging, high-quality content.',
    capabilities: ['writing', 'content-creation', 'marketing', 'social-media'],
    avatar_color: '#8B5CF6'
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    description: 'Analyzes data and provides insights',
    system_prompt: 'You are a data analysis expert focused on extracting insights and patterns from data.',
    capabilities: ['data-analysis', 'statistics', 'visualization', 'reporting'],
    avatar_color: '#10B981'
  },
  {
    id: 'customer-support',
    name: 'Customer Support',
    description: 'Handles customer inquiries and support tasks',
    system_prompt: 'You are a customer support specialist focused on helping users and resolving issues.',
    capabilities: ['customer-service', 'troubleshooting', 'communication', 'problem-solving'],
    avatar_color: '#F59E0B'
  }
];

const AgentManager: React.FC<AgentManagerProps> = ({ className }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [bulkSelection, setBulkSelection] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    display_name: string;
    description: string;
    system_prompt: string;
    avatar_color: string;
    capabilities: string[];
    status: 'active' | 'inactive' | 'error' | 'testing';
  }>({
    name: '',
    display_name: '',
    description: '',
    system_prompt: '',
    avatar_color: '#3B82F6',
    capabilities: [],
    status: 'active'
  });

  // Load agents
  const loadAgents = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    
    try {
      const response = await fetch('/api/v1/claude-live/prod/agents');
      if (response.ok) {
        const data = await response.json();
        // Transform the API response to match expected agent structure
        const transformedAgents = (data.agents || []).map((agent: any) => ({
          id: agent.id,
          name: agent.name,
          display_name: agent.name,
          description: agent.description || 'No description available',
          system_prompt: `You are ${agent.name}, ${agent.description}`,
          avatar_color: agent.color || '#3B82F6',
          capabilities: agent.capabilities || [],
          status: agent.status === 'active' ? 'active' : 'inactive',
          created_at: new Date().toISOString(),
          updated_at: agent.lastActivity || new Date().toISOString(),
          last_used: agent.lastActivity,
          usage_count: agent.posts?.length || 50,
          performance_metrics: {
            success_rate: 0.95,
            average_response_time: 1200,
            total_tokens_used: agent.usage_count ? agent.usage_count * 100 : 5000,
            error_count: agent.status === 'error' ? 3 : 0
          },
          health_status: {
            cpu_usage: agent.status === 'active' ? 35 : 15,
            memory_usage: agent.capabilities?.length ? agent.capabilities.length * 10 : 50,
            response_time: agent.performance_metrics?.average_response_time || 1000,
            last_heartbeat: new Date().toISOString()
          }
        }));
        setAgents(transformedAgents);
        setError(null);
      } else {
        setError('Failed to load agents');
      }
    } catch (err) {
      setError('Error connecting to agent API');
      console.error('Failed to load agents:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => loadAgents(), 30000);
    return () => clearInterval(interval);
  }, [loadAgents]);

  // Filter and search agents
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.capabilities.some(cap => cap.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Paginate agents
  const totalPages = Math.ceil(filteredAgents.length / pageSize);
  const paginatedAgents = filteredAgents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Mock implementation - in real app, this would call the API
      const newAgent: Agent = {
        id: selectedAgent ? selectedAgent.id : `agent-${Date.now()}`,
        name: formData.name,
        display_name: formData.display_name,
        description: formData.description,
        system_prompt: formData.system_prompt,
        avatar_color: formData.avatar_color,
        capabilities: formData.capabilities,
        status: formData.status,
        created_at: selectedAgent ? selectedAgent.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_used: selectedAgent?.last_used,
        usage_count: selectedAgent?.usage_count || 0,
        performance_metrics: selectedAgent?.performance_metrics || {
          success_rate: 0.95,
          average_response_time: 1200,
          total_tokens_used: 0,
          error_count: 0
        },
        health_status: selectedAgent?.health_status || {
          cpu_usage: 20,
          memory_usage: 30,
          response_time: 500,
          last_heartbeat: new Date().toISOString()
        }
      };

      if (selectedAgent) {
        // Update existing agent
        setAgents(prev => prev.map(a => a.id === selectedAgent.id ? newAgent : a));
      } else {
        // Add new agent
        setAgents(prev => [...prev, newAgent]);
      }
      
      handleCloseModal();
      setError(null);
    } catch (err) {
      setError('Error saving agent');
      console.error('Failed to save agent:', err);
    }
  };

  // Handle agent deletion
  const handleDelete = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    
    try {
      // Mock implementation - remove agent from state
      setAgents(prev => prev.filter(a => a.id !== agentId));
      setError(null);
    } catch (err) {
      setError('Error deleting agent');
      console.error('Failed to delete agent:', err);
    }
  };

  // Handle status toggle
  const handleStatusToggle = async (agentId: string, newStatus: 'active' | 'inactive') => {
    try {
      // Mock implementation - update agent status in state
      setAgents(prev => prev.map(agent => 
        agent.id === agentId 
          ? { ...agent, status: newStatus, updated_at: new Date().toISOString() }
          : agent
      ));
      setError(null);
    } catch (err) {
      setError('Error updating agent status');
      console.error('Failed to update agent status:', err);
    }
  };

  // Handle bulk operations
  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (bulkSelection.size === 0) return;
    
    if (action === 'delete' && !confirm(`Are you sure you want to delete ${bulkSelection.size} agents?`)) {
      return;
    }
    
    try {
      const selectedIds = Array.from(bulkSelection);
      
      if (action === 'delete') {
        // Remove selected agents
        setAgents(prev => prev.filter(a => !selectedIds.includes(a.id)));
      } else {
        // Update status of selected agents
        const newStatus = action === 'activate' ? 'active' : 'inactive';
        setAgents(prev => prev.map(agent => 
          selectedIds.includes(agent.id)
            ? { ...agent, status: newStatus as Agent['status'], updated_at: new Date().toISOString() }
            : agent
        ));
      }
      
      setBulkSelection(new Set());
      setShowBulkActions(false);
      setError(null);
    } catch (err) {
      setError(`Error ${action}ing agents`);
      console.error(`Failed to ${action} agents:`, err);
    }
  };

  // Handle test agent
  const handleTestAgent = async (agentId: string, testPrompt: string) => {
    try {
      // Mock implementation - simulate agent test
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      
      const agent = agents.find(a => a.id === agentId);
      const mockResponse = {
        success: true,
        response: `Hello! I'm ${agent?.display_name || 'an AI agent'}. You asked: "${testPrompt}". This is a test response to verify I'm working correctly.`,
        responseTime: agent?.performance_metrics?.average_response_time || 1000,
        timestamp: new Date().toISOString()
      };
      
      return mockResponse;
    } catch (err) {
      console.error('Agent test failed:', err);
      throw err;
    }
  };

  // Modal handlers
  const handleCreateAgent = () => {
    setSelectedAgent(null);
    setFormData({
      name: '',
      display_name: '',
      description: '',
      system_prompt: '',
      avatar_color: '#3B82F6',
      capabilities: [],
      status: 'active'
    });
    setShowCreateModal(true);
  };

  const handleEditAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setFormData({
      name: agent.name,
      display_name: agent.display_name,
      description: agent.description,
      system_prompt: agent.system_prompt,
      avatar_color: agent.avatar_color,
      capabilities: agent.capabilities,
      status: agent.status
    });
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowTestModal(false);
    setSelectedAgent(null);
    setError(null);
  };

  const handleTemplateSelect = (template: AgentTemplate) => {
    setFormData({
      name: template.name.toLowerCase().replace(/\s+/g, '-'),
      display_name: template.name,
      description: template.description,
      system_prompt: template.system_prompt,
      avatar_color: template.avatar_color,
      capabilities: template.capabilities,
      status: 'active'
    });
  };

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (bulkSelection.size === paginatedAgents.length) {
      setBulkSelection(new Set());
    } else {
      setBulkSelection(new Set(paginatedAgents.map(agent => agent.id)));
    }
  };

  const handleSelectAgent = (agentId: string) => {
    const newSelection = new Set(bulkSelection);
    if (newSelection.has(agentId)) {
      newSelection.delete(agentId);
    } else {
      newSelection.add(agentId);
    }
    setBulkSelection(newSelection);
  };

  // Status badge component
  const StatusBadge: React.FC<{ status: Agent['status'] }> = ({ status }) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      inactive: { color: 'bg-gray-100 text-gray-800', icon: Pause },
      error: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
      testing: { color: 'bg-yellow-100 text-yellow-800', icon: TestTube }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span className={cn('inline-flex items-center px-2 py-1 rounded-full text-xs font-medium', config.color)}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Performance metrics component
  const PerformanceMetrics: React.FC<{ metrics: Agent['performance_metrics'] }> = ({ metrics }) => (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="flex items-center space-x-1">
        <TrendingUp className="w-3 h-3 text-green-600" />
        <span>{(metrics.success_rate * 100).toFixed(1)}%</span>
      </div>
      <div className="flex items-center space-x-1">
        <Clock className="w-3 h-3 text-blue-600" />
        <span>{metrics.average_response_time}ms</span>
      </div>
      <div className="flex items-center space-x-1">
        <Database className="w-3 h-3 text-purple-600" />
        <span>{metrics.total_tokens_used.toLocaleString()}</span>
      </div>
      <div className="flex items-center space-x-1">
        <AlertCircle className="w-3 h-3 text-red-600" />
        <span>{metrics.error_count}</span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={cn('max-w-7xl mx-auto p-6', className)}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
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
          ))}
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
              Agent Manager
            </h1>
            <p className="text-gray-600 mt-2">Manage your AI agents and their configurations</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => loadAgents(true)}
              disabled={refreshing}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', refreshing && 'animate-spin')} />
              Refresh
            </button>
            
            <button
              onClick={handleCreateAgent}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Agent
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
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
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="error">Error</option>
            <option value="testing">Testing</option>
          </select>

          {bulkSelection.size > 0 && (
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Users className="w-4 h-4 mr-2" />
              {bulkSelection.size} Selected
            </button>
          )}
        </div>

        {/* Bulk Actions */}
        {showBulkActions && bulkSelection.size > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">Bulk Actions:</span>
              <button
                onClick={() => handleBulkAction('activate')}
                className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors"
              >
                Activate
              </button>
              <button
                onClick={() => handleBulkAction('deactivate')}
                className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm hover:bg-yellow-200 transition-colors"
              >
                Deactivate
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        )}
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

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bot className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Agents</p>
              <p className="text-2xl font-bold text-gray-900">{agents.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">
                {agents.filter(a => a.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Errors</p>
              <p className="text-2xl font-bold text-gray-900">
                {agents.filter(a => a.status === 'error').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {agents.length > 0 
                  ? (agents.reduce((acc, a) => acc + a.performance_metrics.success_rate, 0) / agents.length * 100).toFixed(1)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Grid */}
      {filteredAgents.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No agents found</h3>
          <p className="text-gray-500 mb-6">
            {searchQuery || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Create your first agent to get started'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <button
              onClick={handleCreateAgent}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Agent
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedAgents.map((agent) => (
              <div
                key={agent.id}
                className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200"
              >
                {/* Card Header */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={bulkSelection.has(agent.id)}
                        onChange={() => handleSelectAgent(agent.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold"
                        style={{ backgroundColor: agent.avatar_color }}
                      >
                        {agent.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {agent.display_name}
                        </h3>
                        <StatusBadge status={agent.status} />
                      </div>
                    </div>
                    
                    <div className="relative">
                      <button
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        onClick={() => {/* Implement dropdown menu */}}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4">
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {agent.description}
                  </p>
                  
                  {/* Capabilities */}
                  <div className="mb-4">
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
                          +{agent.capabilities.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <PerformanceMetrics metrics={agent.performance_metrics} />
                  
                  {/* Usage Stats */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Used {agent.usage_count} times</span>
                      {agent.last_used && (
                        <span>Last used {new Date(agent.last_used).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleStatusToggle(
                          agent.id, 
                          agent.status === 'active' ? 'inactive' : 'active'
                        )}
                        className={cn(
                          'p-1 rounded transition-colors',
                          agent.status === 'active'
                            ? 'text-green-600 hover:bg-green-100'
                            : 'text-gray-400 hover:bg-gray-100'
                        )}
                        title={agent.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        {agent.status === 'active' ? <Power className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      
                      <button
                        onClick={() => setSelectedAgent(agent)}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                        title="Test Agent"
                      >
                        <TestTube className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditAgent(agent)}
                        className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(agent.id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredAgents.length)} of {filteredAgents.length} agents
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      'px-3 py-2 text-sm rounded transition-colors',
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedAgent ? 'Edit Agent' : 'Create New Agent'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Templates (only for create) */}
              {!selectedAgent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Start with a template (optional)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {AGENT_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => handleTemplateSelect(template)}
                        className="p-3 border border-gray-200 rounded-lg text-left hover:border-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: template.avatar_color }}
                          >
                            {template.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{template.name}</p>
                            <p className="text-xs text-gray-500">{template.capabilities.join(', ')}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agent Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="agent-name"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Lowercase, hyphens only</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Agent Display Name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe what this agent does..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  System Prompt
                </label>
                <textarea
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="You are an AI assistant that..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Avatar Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={formData.avatar_color}
                      onChange={(e) => setFormData({ ...formData, avatar_color: e.target.value })}
                      className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.avatar_color}
                      onChange={(e) => setFormData({ ...formData, avatar_color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'error' | 'testing' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Capabilities
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.capabilities.map((capability, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {capability}
                      <button
                        type="button"
                        onClick={() => {
                          const newCapabilities = [...formData.capabilities];
                          newCapabilities.splice(index, 1);
                          setFormData({ ...formData, capabilities: newCapabilities });
                        }}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Add capability and press Enter"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const value = (e.target as HTMLInputElement).value.trim();
                      if (value && !formData.capabilities.includes(value)) {
                        setFormData({
                          ...formData,
                          capabilities: [...formData.capabilities, value]
                        });
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {selectedAgent ? 'Update Agent' : 'Create Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentManager;