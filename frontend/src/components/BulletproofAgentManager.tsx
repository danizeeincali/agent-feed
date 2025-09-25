import React, { useState, useEffect, memo, useCallback, useMemo, Suspense } from 'react';
import { 
  Plus,
  Edit3,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Info,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Search,
  Filter,
  MoreVertical,
  Copy,
  Download,
  Upload,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import { cn } from '../utils/cn';
import { ErrorBoundary } from 'react-error-boundary';
import {
  safeArray,
  safeObject,
  safeString,
  safeNumber,
  safeDate,
  ErrorFallback,
  LoadingFallback,
  withSafetyWrapper,
  safeHandler
} from '../utils/safetyUtils';
import {
  SafeAgent,
  agentValidationSchema,
  validateComponentProps,
  isValidAgent
} from '../types/safety';

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
  performance?: {
    success_rate: number;
    average_response_time: number;
    total_tokens_used: number;
    error_count: number;
  };
}

interface AgentManagerProps {
  className?: string;
  onError?: (error: Error) => void;
  fallback?: React.ReactNode;
  retryable?: boolean;
}

interface CreateAgentForm {
  name: string;
  display_name: string;
  description: string;
  system_prompt: string;
  avatar_color: string;
  capabilities: string[];
}

// Safe data transformer
const transformToSafeAgent = (agent: any): Agent | null => {
  try {
    if (!agent || typeof agent !== 'object') return null;
    
    return {
      id: safeString(agent.id, `agent-${Date.now()}-${Date.now().toString(36).slice(-6)}`),
      name: safeString(agent.name, 'Unnamed Agent'),
      display_name: safeString(agent.display_name, agent.name || 'Unnamed Agent'),
      description: safeString(agent.description, 'No description provided'),
      system_prompt: safeString(agent.system_prompt, 'You are a helpful AI assistant.'),
      avatar_color: safeString(agent.avatar_color, '#6366f1'),
      capabilities: safeArray(agent.capabilities).filter(cap => typeof cap === 'string'),
      status: ['active', 'inactive', 'error', 'testing'].includes(agent.status) 
        ? agent.status 
        : 'inactive',
      created_at: safeDate(agent.created_at).toISOString(),
      updated_at: safeDate(agent.updated_at).toISOString(),
      last_used: agent.last_used ? safeDate(agent.last_used).toISOString() : undefined,
      usage_count: safeNumber(agent.usage_count, 0),
      performance: agent.performance ? {
        success_rate: Math.min(100, Math.max(0, safeNumber(agent.performance.success_rate, 0))),
        average_response_time: Math.max(0, safeNumber(agent.performance.average_response_time, 0)),
        total_tokens_used: Math.max(0, safeNumber(agent.performance.total_tokens_used, 0)),
        error_count: Math.max(0, safeNumber(agent.performance.error_count, 0))
      } : undefined
    };
  } catch (error) {
    console.error('Failed to transform agent data:', error);
    return null;
  }
};

// Loading skeleton
const AgentCardSkeleton: React.FC = memo(() => (
  <div className="bg-white rounded-lg border border-gray-200 p-6">
    <div className="animate-pulse">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-gray-200 rounded"></div>
        <div className="h-3 bg-gray-200 rounded w-4/5"></div>
      </div>
      <div className="flex space-x-2">
        <div className="h-8 bg-gray-200 rounded w-20"></div>
        <div className="h-8 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  </div>
));

AgentCardSkeleton.displayName = 'AgentCardSkeleton';

// Individual agent error boundary
const AgentCardErrorBoundary: React.FC<{ children: React.ReactNode; agentId?: string }> = ({ children, agentId }) => (
  <ErrorBoundary
    FallbackComponent={({ error, resetErrorBoundary }) => (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center text-red-700 mb-2">
          <AlertTriangle className="w-4 h-4 mr-2" />
          <span className="font-medium">Agent Card Error</span>
        </div>
        <p className="text-red-600 text-sm mb-3">
          Failed to render agent {agentId ? `(${agentId})` : ''}.
        </p>
        <button
          onClick={resetErrorBoundary}
          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

const BulletproofAgentManager: React.FC<AgentManagerProps> = memo(({ 
  className = '',
  onError,
  fallback,
  retryable = true
}) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [showPerformance, setShowPerformance] = useState(false);

  // Form state for creating/editing agents
  const [formData, setFormData] = useState<CreateAgentForm>({
    name: '',
    display_name: '',
    description: '',
    system_prompt: '',
    avatar_color: '#6366f1',
    capabilities: []
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Safe error handler
  const handleError = useCallback((err: Error, context?: string) => {
    console.error(`AgentManager Error${context ? ` (${context})` : ''}:`, err);
    setError(err.message || 'An unexpected error occurred');
    onError?.(err);
  }, [onError]);

  // Mock data with comprehensive safety
  const mockAgents: Agent[] = useMemo(() => {
    try {
      return [
        {
          id: 'agent-1',
          name: 'task-coordinator',
          display_name: 'Task Coordinator',
          description: 'Coordinates and manages complex multi-step tasks',
          system_prompt: 'You are a task coordination specialist. Help organize and manage complex workflows.',
          avatar_color: '#3b82f6',
          capabilities: ['task-management', 'workflow-coordination', 'priority-assessment'],
          status: 'active',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          last_used: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          usage_count: 157,
          performance: {
            success_rate: 96.5,
            average_response_time: 1.8,
            total_tokens_used: 45230,
            error_count: 3
          }
        },
        {
          id: 'agent-2',
          name: 'code-reviewer',
          display_name: 'Code Reviewer',
          description: 'Reviews code for quality, security, and best practices',
          system_prompt: 'You are an expert code reviewer. Analyze code for quality, security issues, and best practices.',
          avatar_color: '#10b981',
          capabilities: ['code-analysis', 'security-review', 'best-practices', 'documentation'],
          status: 'active',
          created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          last_used: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          usage_count: 89,
          performance: {
            success_rate: 98.2,
            average_response_time: 3.2,
            total_tokens_used: 67891,
            error_count: 1
          }
        },
        {
          id: 'agent-3',
          name: 'documentation-writer',
          display_name: 'Documentation Writer',
          description: 'Creates comprehensive documentation for projects and APIs',
          system_prompt: 'You are a technical writer specializing in clear, comprehensive documentation.',
          avatar_color: '#f59e0b',
          capabilities: ['technical-writing', 'api-documentation', 'user-guides', 'tutorials'],
          status: 'inactive',
          created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          last_used: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          usage_count: 34,
          performance: {
            success_rate: 94.1,
            average_response_time: 4.5,
            total_tokens_used: 23456,
            error_count: 2
          }
        }
      ].map(transformToSafeAgent).filter((agent): agent is Agent => agent !== null);
    } catch (error) {
      console.error('Error creating mock agents:', error);
      return [];
    }
  }, []);

  // Safe data fetching
  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      clearTimeout(timeoutId);
      
      // In a real app, this would be:
      // const response = await fetch('/api/v1/agents', { signal: controller.signal });
      // if (!response.ok) throw new Error(`HTTP ${response.status}`);
      // const data = await response.json();
      
      setAgents(mockAgents);
      setRetryCount(0);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          handleError(new Error('Request timeout - please try again'), 'load');
        } else {
          handleError(err, 'load');
        }
      } else {
        handleError(new Error('Unknown error occurred'), 'load');
      }
      
      // Set fallback data on error - use mockAgents directly to avoid dependency loop
      setAgents(mockAgents);
    } finally {
      setLoading(false);
    }
  }, [mockAgents, handleError]);

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

  // Form validation
  const validateForm = useCallback((data: CreateAgentForm): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    try {
      if (!safeString(data.name).trim()) {
        errors.name = 'Agent name is required';
      } else if (!/^[a-z0-9-]+$/.test(data.name)) {
        errors.name = 'Agent name must be lowercase letters, numbers, and hyphens only';
      }
      
      if (!safeString(data.display_name).trim()) {
        errors.display_name = 'Display name is required';
      }
      
      if (!safeString(data.description).trim()) {
        errors.description = 'Description is required';
      }
      
      if (!safeString(data.system_prompt).trim()) {
        errors.system_prompt = 'System prompt is required';
      }
      
      if (safeArray(data.capabilities).length === 0) {
        errors.capabilities = 'At least one capability is required';
      }
    } catch (error) {
      console.error('Form validation error:', error);
      errors.general = 'Validation error occurred';
    }
    
    return errors;
  }, []);

  // Safe form handlers
  const handleFormSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setFormSubmitting(true);
      setFormErrors({});
      
      const errors = validateForm(formData);
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newAgent: Agent = {
        id: `agent-${Date.now()}`,
        name: safeString(formData.name),
        display_name: safeString(formData.display_name),
        description: safeString(formData.description),
        system_prompt: safeString(formData.system_prompt),
        avatar_color: safeString(formData.avatar_color, '#6366f1'),
        capabilities: safeArray(formData.capabilities),
        status: 'inactive',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        usage_count: 0
      };
      
      if (editingAgent) {
        setAgents(prev => prev.map(agent => 
          agent.id === editingAgent.id ? { ...newAgent, id: editingAgent.id } : agent
        ));
        setEditingAgent(null);
      } else {
        setAgents(prev => [newAgent, ...prev]);
      }
      
      // Reset form
      setFormData({
        name: '',
        display_name: '',
        description: '',
        system_prompt: '',
        avatar_color: '#6366f1',
        capabilities: []
      });
      setShowCreateForm(false);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to save agent'), 'save');
    } finally {
      setFormSubmitting(false);
    }
  }, [formData, validateForm, editingAgent, handleError]);

  // Agent action handlers
  const handleAgentAction = useCallback(async (agentId: string, action: 'activate' | 'deactivate' | 'delete' | 'test') => {
    try {
      setActionLoading(agentId);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      switch (action) {
        case 'activate':
          setAgents(prev => prev.map(agent => 
            agent.id === agentId ? { ...agent, status: 'active' as const } : agent
          ));
          break;
        case 'deactivate':
          setAgents(prev => prev.map(agent => 
            agent.id === agentId ? { ...agent, status: 'inactive' as const } : agent
          ));
          break;
        case 'delete':
          if (window.confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
            setAgents(prev => prev.filter(agent => agent.id !== agentId));
          }
          break;
        case 'test':
          setAgents(prev => prev.map(agent => 
            agent.id === agentId ? { ...agent, status: 'testing' as const } : agent
          ));
          
          // Simulate test completion
          setTimeout(() => {
            setAgents(prev => prev.map(agent => 
              agent.id === agentId ? { ...agent, status: 'active' as const } : agent
            ));
          }, 3000);
          break;
      }
    } catch (error) {
      handleError(error instanceof Error ? error : new Error(`Failed to ${action} agent`), action);
    } finally {
      setActionLoading(null);
    }
  }, [handleError]);

  const handleEditAgent = useCallback((agent: Agent) => {
    try {
      setEditingAgent(agent);
      setFormData({
        name: safeString(agent.name),
        display_name: safeString(agent.display_name),
        description: safeString(agent.description),
        system_prompt: safeString(agent.system_prompt),
        avatar_color: safeString(agent.avatar_color, '#6366f1'),
        capabilities: safeArray(agent.capabilities)
      });
      setShowCreateForm(true);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to load agent for editing'), 'edit');
    }
  }, [handleError]);

  // Safe utility functions
  const getStatusIcon = useCallback((status: string) => {
    const statusMap = {
      'active': <CheckCircle className="w-4 h-4 text-green-500" />,
      'inactive': <Pause className="w-4 h-4 text-gray-500" />,
      'error': <AlertTriangle className="w-4 h-4 text-red-500" />,
      'testing': <RotateCcw className="w-4 h-4 text-blue-500 animate-spin" />
    };
    return statusMap[status as keyof typeof statusMap] || <AlertTriangle className="w-4 h-4 text-gray-500" />;
  }, []);

  const getStatusColor = useCallback((status: string) => {
    const colorMap = {
      'active': 'bg-green-100 text-green-800 border-green-200',
      'inactive': 'bg-gray-100 text-gray-800 border-gray-200',
      'error': 'bg-red-100 text-red-800 border-red-200',
      'testing': 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return colorMap[status as keyof typeof colorMap] || 'bg-gray-100 text-gray-800 border-gray-200';
  }, []);

  // Safe filtering
  const filteredAgents = useMemo(() => {
    try {
      return safeArray(agents).filter(agent => {
        if (!agent || !agent.id) return false;
        
        const matchesSearch = 
          safeString(agent.name).toLowerCase().includes(safeString(searchTerm).toLowerCase()) ||
          safeString(agent.display_name).toLowerCase().includes(safeString(searchTerm).toLowerCase()) ||
          safeString(agent.description).toLowerCase().includes(safeString(searchTerm).toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
        
        return matchesSearch && matchesStatus;
      });
    } catch (error) {
      console.error('Error filtering agents:', error);
      return [];
    }
  }, [agents, searchTerm, statusFilter]);

  // Safe handlers
  const handleRefresh = useCallback(() => {
    setRetryCount(prev => prev + 1);
    loadAgents();
  }, [loadAgents]);

  const handleBulkAction = useCallback(async (action: 'activate' | 'deactivate' | 'delete') => {
    try {
      if (selectedAgents.size === 0) return;
      
      if (action === 'delete' && !window.confirm(`Are you sure you want to delete ${selectedAgents.size} agent(s)?`)) {
        return;
      }
      
      for (const agentId of selectedAgents) {
        await handleAgentAction(agentId, action);
      }
      
      setSelectedAgents(new Set());
    } catch (error) {
      handleError(error instanceof Error ? error : new Error(`Failed to ${action} agents`), 'bulk');
    }
  }, [selectedAgents, handleAgentAction, handleError]);

  // Loading state
  if (loading && agents.length === 0) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <AgentCardSkeleton key={i} />
          ))}
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
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <ErrorFallback 
          error={error} 
          resetErrorBoundary={resetErrorBoundary} 
          componentName="Agent Manager" 
        />
      )}
    >
      <div className={`p-6 space-y-6 ${className}`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agent Manager</h1>
            <p className="text-gray-600">Create, configure, and manage your Claude Code agents</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPerformance(!showPerformance)}
              className={cn(
                'inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md transition-colors',
                showPerformance 
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'text-gray-700 bg-white hover:bg-gray-50'
              )}
            >
              {showPerformance ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              Performance
            </button>
            
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            <button
              onClick={() => {
                setEditingAgent(null);
                setFormData({
                  name: '',
                  display_name: '',
                  description: '',
                  system_prompt: '',
                  avatar_color: '#6366f1',
                  capabilities: []
                });
                setShowCreateForm(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Agent
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search agents by name, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(safeString(e.target.value))}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(safeString(e.target.value, 'all'))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="testing">Testing</option>
            <option value="error">Error</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedAgents.size > 0 && (
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700">
              {selectedAgents.size} agent{selectedAgents.size > 1 ? 's' : ''} selected
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkAction('activate')}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Activate
              </button>
              <button
                onClick={() => handleBulkAction('deactivate')}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
              >
                Deactivate
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedAgents(new Set())}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingAgent ? 'Edit Agent' : 'Create New Agent'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingAgent(null);
                  setFormErrors({});
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agent Name (ID)
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: safeString(e.target.value) }))}
                    className={cn(
                      'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                      formErrors.name ? 'border-red-300' : 'border-gray-300'
                    )}
                    placeholder="task-coordinator"
                    disabled={formSubmitting}
                  />
                  {formErrors.name && (
                    <p className="text-red-600 text-xs mt-1">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_name: safeString(e.target.value) }))}
                    className={cn(
                      'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                      formErrors.display_name ? 'border-red-300' : 'border-gray-300'
                    )}
                    placeholder="Task Coordinator"
                    disabled={formSubmitting}
                  />
                  {formErrors.display_name && (
                    <p className="text-red-600 text-xs mt-1">{formErrors.display_name}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: safeString(e.target.value) }))}
                  rows={3}
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                    formErrors.description ? 'border-red-300' : 'border-gray-300'
                  )}
                  placeholder="Describe what this agent does..."
                  disabled={formSubmitting}
                />
                {formErrors.description && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.description}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System Prompt
                </label>
                <textarea
                  value={formData.system_prompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, system_prompt: safeString(e.target.value) }))}
                  rows={4}
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                    formErrors.system_prompt ? 'border-red-300' : 'border-gray-300'
                  )}
                  placeholder="You are a helpful assistant that..."
                  disabled={formSubmitting}
                />
                {formErrors.system_prompt && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.system_prompt}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Avatar Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.avatar_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, avatar_color: safeString(e.target.value, '#6366f1') }))}
                      className="w-10 h-10 border border-gray-300 rounded"
                      disabled={formSubmitting}
                    />
                    <input
                      type="text"
                      value={formData.avatar_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, avatar_color: safeString(e.target.value, '#6366f1') }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="#6366f1"
                      disabled={formSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capabilities
                  </label>
                  <input
                    type="text"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const value = safeString((e.target as HTMLInputElement).value).trim();
                        if (value && !formData.capabilities.includes(value)) {
                          setFormData(prev => ({ 
                            ...prev, 
                            capabilities: [...prev.capabilities, value] 
                          }));
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Type capability and press Enter"
                    disabled={formSubmitting}
                  />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {safeArray(formData.capabilities).map((capability, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                      >
                        {safeString(capability)}
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            capabilities: prev.capabilities.filter((_, i) => i !== index)
                          }))}
                          className="ml-1 text-blue-500 hover:text-blue-700"
                          disabled={formSubmitting}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  {formErrors.capabilities && (
                    <p className="text-red-600 text-xs mt-1">{formErrors.capabilities}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingAgent(null);
                    setFormErrors({});
                  }}
                  disabled={formSubmitting}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {formSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingAgent ? 'Update Agent' : 'Create Agent'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <AgentCardErrorBoundary key={agent.id} agentId={agent.id}>
              <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                {/* Agent Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedAgents.has(agent.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedAgents);
                        if (e.target.checked) {
                          newSelected.add(agent.id);
                        } else {
                          newSelected.delete(agent.id);
                        }
                        setSelectedAgents(newSelected);
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold text-lg"
                      style={{ backgroundColor: safeString(agent.avatar_color, '#6366f1') }}
                    >
                      {safeString(agent.display_name).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{agent.display_name}</h3>
                      <p className="text-sm text-gray-500">{agent.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'px-2 py-1 rounded-full border text-xs font-medium flex items-center gap-1',
                      getStatusColor(agent.status)
                    )}>
                      {getStatusIcon(agent.status)}
                      {agent.status}
                    </div>
                    
                    <div className="relative">
                      <button
                        className="p-1 text-gray-400 hover:text-gray-600"
                        onClick={() => {
                          // Toggle dropdown menu
                        }}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Agent Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {safeString(agent.description)}
                </p>

                {/* Performance Metrics */}
                {showPerformance && agent.performance && (
                  <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500">Success Rate</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {safeNumber(agent.performance.success_rate, 0).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Avg Response</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {safeNumber(agent.performance.average_response_time, 0).toFixed(1)}s
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Tokens Used</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {safeNumber(agent.performance.total_tokens_used, 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Errors</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {safeNumber(agent.performance.error_count, 0)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Capabilities */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Capabilities</p>
                  <div className="flex flex-wrap gap-1">
                    {safeArray(agent.capabilities).slice(0, 3).map((capability, index) => (
                      <span
                        key={index}
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

                {/* Agent Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    {agent.status === 'active' ? (
                      <button
                        onClick={() => handleAgentAction(agent.id, 'deactivate')}
                        disabled={actionLoading === agent.id}
                        className="flex items-center px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading === agent.id ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Pause className="w-3 h-3 mr-1" />
                        )}
                        Pause
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAgentAction(agent.id, 'activate')}
                        disabled={actionLoading === agent.id}
                        className="flex items-center px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading === agent.id ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Play className="w-3 h-3 mr-1" />
                        )}
                        Activate
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleAgentAction(agent.id, 'test')}
                      disabled={actionLoading === agent.id || agent.status === 'testing'}
                      className="flex items-center px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {(actionLoading === agent.id && agent.status !== 'testing') ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <RotateCcw className={`w-3 h-3 mr-1 ${agent.status === 'testing' ? 'animate-spin' : ''}`} />
                      )}
                      Test
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditAgent(agent)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit agent"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(agent, null, 2));
                      }}
                      className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                      title="Copy configuration"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleAgentAction(agent.id, 'delete')}
                      disabled={actionLoading === agent.id}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete agent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Usage Stats */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>
                      {agent.last_used 
                        ? `Used ${safeDate(agent.last_used).toLocaleDateString()}`
                        : 'Never used'
                      }
                    </span>
                  </div>
                  <span>{safeNumber(agent.usage_count, 0)} uses</span>
                </div>
              </div>
            </AgentCardErrorBoundary>
          ))}
        </div>

        {filteredAgents.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">No agents found matching your criteria</p>
            <button
              onClick={() => {
                setEditingAgent(null);
                setFormData({
                  name: '',
                  display_name: '',
                  description: '',
                  system_prompt: '',
                  avatar_color: '#6366f1',
                  capabilities: []
                });
                setShowCreateForm(true);
              }}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Agent
            </button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
});

BulletproofAgentManager.displayName = 'BulletproofAgentManager';

// Export with safety wrapper
export default withSafetyWrapper(BulletproofAgentManager, 'BulletproofAgentManager');
export { BulletproofAgentManager };