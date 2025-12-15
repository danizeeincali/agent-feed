import React, { useState, useEffect, memo, useCallback, useMemo, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Edit3,
  Save,
  X,
  Settings,
  Activity,
  BarChart3,
  Clock,
  Zap,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Download,
  Upload,
  RefreshCw,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  Copy,
  ExternalLink
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
    uptime_percentage: number;
    tasks_completed: number;
    conversations: number;
  };
  configuration?: {
    temperature: number;
    max_tokens: number;
    timeout: number;
    retry_attempts: number;
    rate_limit: number;
  };
  logs?: {
    id: string;
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    metadata?: any;
  }[];
}

interface ActivityLog {
  id: string;
  timestamp: string;
  type: 'task_completed' | 'error_occurred' | 'configuration_changed' | 'status_changed';
  message: string;
  metadata?: any;
  duration?: number;
  success?: boolean;
}

interface AgentProfileProps {
  className?: string;
  onError?: (error: Error) => void;
  fallback?: React.ReactNode;
  retryable?: boolean;
}

// Safe data transformer
const transformToSafeAgent = (agent: any): Agent | null => {
  try {
    if (!agent || typeof agent !== 'object') return null;
    
    return {
      id: safeString(agent.id, `agent-${Date.now()}`),
      name: safeString(agent.name, 'unknown-agent'),
      display_name: safeString(agent.display_name, agent.name || 'Unknown Agent'),
      description: safeString(agent.description, 'No description available'),
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
        error_count: Math.max(0, safeNumber(agent.performance.error_count, 0)),
        uptime_percentage: Math.min(100, Math.max(0, safeNumber(agent.performance.uptime_percentage, 0))),
        tasks_completed: Math.max(0, safeNumber(agent.performance.tasks_completed, 0)),
        conversations: Math.max(0, safeNumber(agent.performance.conversations, 0))
      } : undefined,
      configuration: agent.configuration ? {
        temperature: Math.min(2, Math.max(0, safeNumber(agent.configuration.temperature, 0.7))),
        max_tokens: Math.min(8192, Math.max(1, safeNumber(agent.configuration.max_tokens, 2048))),
        timeout: Math.min(300, Math.max(1, safeNumber(agent.configuration.timeout, 30))),
        retry_attempts: Math.min(5, Math.max(0, safeNumber(agent.configuration.retry_attempts, 3))),
        rate_limit: Math.min(1000, Math.max(1, safeNumber(agent.configuration.rate_limit, 60)))
      } : undefined,
      logs: safeArray(agent.logs).map((log: any) => ({
        id: safeString((log as any)?.id, `log-${Date.now()}`),
        timestamp: safeDate((log as any)?.timestamp).toISOString(),
        level: ['info', 'warn', 'error', 'debug'].includes((log as any)?.level) ? (log as any).level : 'info',
        message: safeString((log as any)?.message, 'No message'),
        metadata: safeObject((log as any)?.metadata)
      }))
    };
  } catch (error) {
    console.error('Failed to transform agent data:', error);
    return null;
  }
};

// Transform activity log
const transformToSafeActivity = (activity: any): ActivityLog | null => {
  try {
    if (!activity || typeof activity !== 'object') return null;
    
    return {
      id: safeString(activity.id, `activity-${Date.now()}`),
      timestamp: safeDate(activity.timestamp).toISOString(),
      type: ['task_completed', 'error_occurred', 'configuration_changed', 'status_changed'].includes(activity.type)
        ? activity.type
        : 'task_completed',
      message: safeString(activity.message, 'No message'),
      metadata: safeObject(activity.metadata),
      duration: activity.duration ? Math.max(0, safeNumber(activity.duration, 0)) : undefined,
      success: typeof activity.success === 'boolean' ? activity.success : undefined
    };
  } catch (error) {
    console.error('Failed to transform activity data:', error);
    return null;
  }
};

// Loading skeleton
const ProfileSkeleton: React.FC = memo(() => (
  <div className="animate-pulse space-y-6">
    <div className="bg-gray-200 h-48 rounded-lg"></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-gray-200 h-32 rounded-lg"></div>
      <div className="bg-gray-200 h-32 rounded-lg"></div>
      <div className="bg-gray-200 h-32 rounded-lg"></div>
    </div>
    <div className="bg-gray-200 h-96 rounded-lg"></div>
  </div>
));

ProfileSkeleton.displayName = 'ProfileSkeleton';

const BulletproofAgentProfile: React.FC<AgentProfileProps> = memo(({ 
  className = '',
  onError,
  fallback,
  retryable = true
}) => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'configuration' | 'logs' | 'activity'>('overview');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Form state for editing
  const [editForm, setEditForm] = useState({
    display_name: '',
    description: '',
    system_prompt: '',
    avatar_color: '',
    capabilities: [] as string[],
    configuration: {
      temperature: 0.7,
      max_tokens: 2048,
      timeout: 30,
      retry_attempts: 3,
      rate_limit: 60
    }
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Safe error handler
  const handleError = useCallback((err: Error, context?: string) => {
    console.error(`AgentProfile Error${context ? ` (${context})` : ''}:`, err);
    setError(err.message || 'An unexpected error occurred');
    onError?.(err);
  }, [onError]);

  // Mock data generator
  const generateMockAgent = useCallback((id: string): Agent => {
    const agents = {
      'task-coordinator': {
        id: 'task-coordinator',
        name: 'task-coordinator',
        display_name: 'Task Coordinator',
        description: 'Coordinates and manages complex multi-step tasks across different systems and teams.',
        system_prompt: 'You are a task coordination specialist. Help organize and manage complex workflows, prioritize tasks, and ensure efficient execution. You excel at breaking down complex projects into manageable steps and coordinating between different team members and systems.',
        avatar_color: '#3b82f6',
        capabilities: ['task-management', 'workflow-coordination', 'priority-assessment', 'team-communication', 'project-planning'],
        status: 'active' as const,
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        last_used: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        usage_count: 2847,
        performance: {
          success_rate: 96.5,
          average_response_time: 1.8,
          total_tokens_used: 156789,
          error_count: 12,
          uptime_percentage: 99.2,
          tasks_completed: 1456,
          conversations: 2847
        },
        configuration: {
          temperature: 0.7,
          max_tokens: 2048,
          timeout: 30,
          retry_attempts: 3,
          rate_limit: 60
        }
      },
      'code-reviewer': {
        id: 'code-reviewer',
        name: 'code-reviewer',
        display_name: 'Code Reviewer',
        description: 'Reviews code for quality, security, and best practices. Provides detailed feedback and suggestions for improvement.',
        system_prompt: 'You are an expert code reviewer with deep knowledge of software engineering best practices, security principles, and code quality standards. Review code thoroughly and provide constructive feedback.',
        avatar_color: '#10b981',
        capabilities: ['code-analysis', 'security-review', 'best-practices', 'documentation', 'performance-optimization'],
        status: 'active' as const,
        created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        last_used: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        usage_count: 1532,
        performance: {
          success_rate: 98.2,
          average_response_time: 3.2,
          total_tokens_used: 234567,
          error_count: 8,
          uptime_percentage: 98.8,
          tasks_completed: 892,
          conversations: 1532
        },
        configuration: {
          temperature: 0.3,
          max_tokens: 4096,
          timeout: 45,
          retry_attempts: 2,
          rate_limit: 30
        }
      }
    };
    
    return agents[id as keyof typeof agents] || {
      id,
      name: id,
      display_name: 'Unknown Agent',
      description: 'Agent details not found',
      system_prompt: 'You are a helpful AI assistant.',
      avatar_color: '#6366f1',
      capabilities: ['general-assistance'],
      status: 'inactive' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      usage_count: 0
    };
  }, []);

  // Generate mock activity logs
  const generateMockActivity = useCallback((agentId: string): ActivityLog[] => {
    const activities = [];
    const now = Date.now();
    
    for (let i = 0; i < 20; i++) {
      const timestamp = new Date(now - i * 2 * 60 * 60 * 1000); // Every 2 hours
      activities.push({
        id: `activity-${i}`,
        timestamp: timestamp.toISOString(),
        type: ['task_completed', 'error_occurred', 'configuration_changed', 'status_changed'][Math.floor(Math.random() * 4)] as any,
        message: [
          'Successfully completed code review task',
          'Analyzed security vulnerabilities in codebase',
          'Configuration updated: increased timeout to 45s',
          'Status changed from idle to active',
          'Error: Rate limit exceeded, retrying in 60s',
          'Completed workflow coordination task',
          'Generated project timeline and milestones'
        ][Math.floor(Math.random() * 7)],
        duration: Math.floor(Math.random() * 300) + 10,
        success: Math.random() > 0.1,
        metadata: {
          task_type: ['review', 'analysis', 'coordination'][Math.floor(Math.random() * 3)],
          complexity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
        }
      });
    }
    
    return activities;
  }, []);

  // Safe data fetching
  const loadAgentData = useCallback(async () => {
    try {
      if (!agentId) {
        throw new Error('Agent ID is required');
      }
      
      setLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      clearTimeout(timeoutId);
      
      // In a real app:
      // const [agentRes, activityRes] = await Promise.all([
      //   fetch(`/api/v1/agents/${agentId}`, { signal: controller.signal }),
      //   fetch(`/api/v1/agents/${agentId}/activity`, { signal: controller.signal })
      // ]);
      
      const mockAgent = generateMockAgent(agentId);
      const mockActivity = generateMockActivity(agentId);
      
      const safeAgent = transformToSafeAgent(mockAgent);
      const safeActivity = mockActivity.map(transformToSafeActivity).filter((a): a is ActivityLog => a !== null);
      
      if (safeAgent) {
        setAgent(safeAgent);
        setEditForm({
          display_name: safeAgent.display_name,
          description: safeAgent.description,
          system_prompt: safeAgent.system_prompt,
          avatar_color: safeAgent.avatar_color,
          capabilities: [...safeAgent.capabilities],
          configuration: safeAgent.configuration || {
            temperature: 0.7,
            max_tokens: 2048,
            timeout: 30,
            retry_attempts: 3,
            rate_limit: 60
          }
        });
      } else {
        throw new Error('Invalid agent data received');
      }
      
      setActivityLogs(safeActivity);
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
    } finally {
      setLoading(false);
    }
  }, [agentId, generateMockAgent, generateMockActivity, handleError]);

  // Initialize component
  useEffect(() => {
    if (agentId) {
      loadAgentData();
    } else {
      setError('No agent ID provided');
      setLoading(false);
    }
  }, [agentId, loadAgentData]);

  // Safe form handlers
  const handleSaveChanges = useCallback(async () => {
    try {
      setSaving(true);
      setEditErrors({});
      
      // Validate form
      const errors: Record<string, string> = {};
      if (!safeString(editForm.display_name).trim()) {
        errors.display_name = 'Display name is required';
      }
      if (!safeString(editForm.description).trim()) {
        errors.description = 'Description is required';
      }
      if (!safeString(editForm.system_prompt).trim()) {
        errors.system_prompt = 'System prompt is required';
      }
      
      if (Object.keys(errors).length > 0) {
        setEditErrors(errors);
        return;
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update agent
      if (agent) {
        const updatedAgent: Agent = {
          ...agent,
          display_name: safeString(editForm.display_name),
          description: safeString(editForm.description),
          system_prompt: safeString(editForm.system_prompt),
          avatar_color: safeString(editForm.avatar_color),
          capabilities: safeArray(editForm.capabilities),
          configuration: editForm.configuration,
          updated_at: new Date().toISOString()
        };
        
        setAgent(updatedAgent);
        setEditing(false);
      }
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to save changes'), 'save');
    } finally {
      setSaving(false);
    }
  }, [editForm, agent, handleError]);

  // Agent action handlers
  const handleAgentAction = useCallback(async (action: 'activate' | 'deactivate' | 'test' | 'restart') => {
    try {
      setActionLoading(action);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (agent) {
        let newStatus = agent.status;
        
        switch (action) {
          case 'activate':
            newStatus = 'active';
            break;
          case 'deactivate':
            newStatus = 'inactive';
            break;
          case 'test':
            newStatus = 'testing';
            // Simulate test completion
            setTimeout(() => {
              setAgent(prev => prev ? { ...prev, status: 'active' } : null);
            }, 3000);
            break;
          case 'restart':
            newStatus = 'active';
            break;
        }
        
        setAgent({ ...agent, status: newStatus });
      }
    } catch (error) {
      handleError(error instanceof Error ? error : new Error(`Failed to ${action} agent`), action);
    } finally {
      setActionLoading(null);
    }
  }, [agent, handleError]);

  // Safe utility functions
  const formatTimeAgo = useCallback((dateString: string) => {
    try {
      const now = new Date();
      const date = safeDate(dateString);
      const diffMs = Math.max(0, now.getTime() - date.getTime());
      
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 30) return `${diffDays}d ago`;
      
      return date.toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    const statusMap = {
      'active': <CheckCircle className="w-5 h-5 text-green-500" />,
      'inactive': <Pause className="w-5 h-5 text-gray-500" />,
      'error': <AlertTriangle className="w-5 h-5 text-red-500" />,
      'testing': <RotateCcw className="w-5 h-5 text-blue-500 animate-spin" />
    };
    return statusMap[status as keyof typeof statusMap] || <AlertTriangle className="w-5 h-5 text-gray-500" />;
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

  const getActivityIcon = useCallback((type: string) => {
    const typeMap = {
      'task_completed': <CheckCircle className="w-4 h-4 text-green-500" />,
      'error_occurred': <AlertTriangle className="w-4 h-4 text-red-500" />,
      'configuration_changed': <Settings className="w-4 h-4 text-blue-500" />,
      'status_changed': <Activity className="w-4 h-4 text-purple-500" />
    };
    return typeMap[type as keyof typeof typeMap] || <Activity className="w-4 h-4 text-gray-500" />;
  }, []);

  // Safe handlers
  const handleRefresh = useCallback(() => {
    setRetryCount(prev => prev + 1);
    loadAgentData();
  }, [loadAgentData]);

  const handleBack = useCallback(() => {
    try {
      navigate('/agents');
    } catch (error) {
      // Fallback navigation
      window.history.back();
    }
  }, [navigate]);

  // Validation for agent ID
  if (!agentId) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="text-gray-400 mb-4">
            <Users className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Agent Selected</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Please provide a valid agent ID to view the profile.</p>
          <button 
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Agents
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <ProfileSkeleton />
      </div>
    );
  }

  // Error state
  if (error || !agent) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="text-gray-400 mb-4">
            <AlertTriangle className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Unable to Load Agent</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{error || 'Agent not found'}</p>
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
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Back to Agents
          </button>
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
          componentName="Agent Profile" 
        />
      )}
    >
      <div className={`p-6 space-y-6 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold text-xl"
                style={{ backgroundColor: safeString(agent.avatar_color, '#6366f1') }}
              >
                {safeString(agent.display_name).charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{agent.display_name}</h1>
                <p className="text-gray-600 dark:text-gray-400">{agent.name}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={cn(
              'px-3 py-1 rounded-full border text-sm font-medium flex items-center gap-2',
              getStatusColor(agent.status)
            )}>
              {getStatusIcon(agent.status)}
              {agent.status}
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={() => setEditing(!editing)}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                editing
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              )}
            >
              {editing ? (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </>
              )}
            </button>
          </div>
        </div>

        {/* Agent Overview Card */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={editForm.display_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, display_name: safeString(e.target.value) }))}
                    className={cn(
                      'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
                      editErrors.display_name ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-700'
                    )}
                    disabled={saving}
                  />
                  {editErrors.display_name && (
                    <p className="text-red-600 text-xs mt-1">{editErrors.display_name}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Avatar Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editForm.avatar_color}
                      onChange={(e) => setEditForm(prev => ({ ...prev, avatar_color: safeString(e.target.value) }))}
                      className="w-10 h-10 border border-gray-300 dark:border-gray-700 rounded"
                      disabled={saving}
                    />
                    <input
                      type="text"
                      value={editForm.avatar_color}
                      onChange={(e) => setEditForm(prev => ({ ...prev, avatar_color: safeString(e.target.value) }))}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: safeString(e.target.value) }))}
                  rows={3}
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
                    editErrors.description ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-700'
                  )}
                  disabled={saving}
                />
                {editErrors.description && (
                  <p className="text-red-600 text-xs mt-1">{editErrors.description}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  System Prompt
                </label>
                <textarea
                  value={editForm.system_prompt}
                  onChange={(e) => setEditForm(prev => ({ ...prev, system_prompt: safeString(e.target.value) }))}
                  rows={4}
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
                    editErrors.system_prompt ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-700'
                  )}
                  disabled={saving}
                />
                {editErrors.system_prompt && (
                  <p className="text-red-600 text-xs mt-1">{editErrors.system_prompt}</p>
                )}
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditErrors({});
                  }}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-700 dark:text-gray-300 mb-4">{agent.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Created</p>
                  <p className="text-gray-900 dark:text-gray-100">{safeDate(agent.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Last Used</p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {agent.last_used ? formatTimeAgo(agent.last_used) : 'Never'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Usage Count</p>
                  <p className="text-gray-900 dark:text-gray-100">{safeNumber(agent.usage_count, 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Capabilities */}
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Capabilities</p>
                <div className="flex flex-wrap gap-2">
                  {safeArray(agent.capabilities).map((capability, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full"
                    >
                      {safeString(capability)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                {agent.status === 'active' ? (
                  <button
                    onClick={() => handleAgentAction('deactivate')}
                    disabled={actionLoading === 'deactivate'}
                    className="flex items-center px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === 'deactivate' ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Pause className="w-4 h-4 mr-2" />
                    )}
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={() => handleAgentAction('activate')}
                    disabled={actionLoading === 'activate'}
                    className="flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === 'activate' ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Activate
                  </button>
                )}
                
                <button
                  onClick={() => handleAgentAction('test')}
                  disabled={actionLoading === 'test' || agent.status === 'testing'}
                  className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {(actionLoading === 'test' || agent.status === 'testing') ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4 mr-2" />
                  )}
                  Test
                </button>
                
                <button
                  onClick={() => handleAgentAction('restart')}
                  disabled={actionLoading === 'restart'}
                  className="flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === 'restart' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Restart
                </button>
                
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(agent, null, 2));
                  }}
                  className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Config
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: Activity },
              { id: 'performance', name: 'Performance', icon: BarChart3 },
              { id: 'configuration', name: 'Configuration', icon: Settings },
              { id: 'activity', name: 'Activity', icon: Clock },
              { id: 'logs', name: 'Logs', icon: FileText }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    'flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
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
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          {activeTab === 'overview' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">System Prompt</h3>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono">
                  {safeString(agent.system_prompt)}
                </pre>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Stats</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Total Uses</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {safeNumber(agent.usage_count, 0).toLocaleString()}
                      </p>
                    </div>
                    <Activity className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                
                {agent.performance && (
                  <>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-600">Success Rate</p>
                          <p className="text-2xl font-bold text-green-900">
                            {safeNumber(agent.performance.success_rate, 0).toFixed(1)}%
                          </p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                    </div>
                    
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-600">Avg Response</p>
                          <p className="text-2xl font-bold text-purple-900">
                            {safeNumber(agent.performance.average_response_time, 0).toFixed(1)}s
                          </p>
                        </div>
                        <Zap className="w-8 h-8 text-purple-600" />
                      </div>
                    </div>
                    
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-orange-600">Uptime</p>
                          <p className="text-2xl font-bold text-orange-900">
                            {safeNumber(agent.performance.uptime_percentage, 0).toFixed(1)}%
                          </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-orange-600" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'performance' && agent.performance && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Performance Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Tasks Completed</h4>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {safeNumber(agent.performance.tasks_completed, 0).toLocaleString()}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Conversations</h4>
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {safeNumber(agent.performance.conversations, 0).toLocaleString()}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Tokens Used</h4>
                    <FileText className="w-5 h-5 text-purple-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {safeNumber(agent.performance.total_tokens_used, 0).toLocaleString()}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Error Count</h4>
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {safeNumber(agent.performance.error_count, 0)}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Success Rate</h4>
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {safeNumber(agent.performance.success_rate, 0).toFixed(2)}%
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Avg Response Time</h4>
                    <Clock className="w-5 h-5 text-orange-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {safeNumber(agent.performance.average_response_time, 0).toFixed(2)}s
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'configuration' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Configuration Settings</h3>
              
              {agent.configuration ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Temperature</h4>
                    <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {safeNumber(agent.configuration.temperature, 0.7)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Controls randomness in responses</p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max Tokens</h4>
                    <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {safeNumber(agent.configuration.max_tokens, 2048).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Maximum response length</p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Timeout</h4>
                    <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {safeNumber(agent.configuration.timeout, 30)}s
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Request timeout duration</p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Retry Attempts</h4>
                    <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {safeNumber(agent.configuration.retry_attempts, 3)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Number of retry attempts</p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rate Limit</h4>
                    <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {safeNumber(agent.configuration.rate_limit, 60)}/min
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Maximum requests per minute</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No configuration data available</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Recent Activity</h3>
              
              {activityLogs.length > 0 ? (
                <div className="space-y-4">
                  {activityLogs.slice(0, 20).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex-shrink-0 mt-1">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {safeString(activity.message)}
                          </p>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTimeAgo(activity.timestamp)}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span className="capitalize">{activity.type.replace('_', ' ')}</span>
                          {activity.duration && (
                            <span>{activity.duration}s duration</span>
                          )}
                          {activity.success !== undefined && (
                            <span className={activity.success ? 'text-green-600' : 'text-red-600'}>
                              {activity.success ? 'Success' : 'Failed'}
                            </span>
                          )}
                        </div>
                        
                        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer">Show metadata</summary>
                            <pre className="text-xs text-gray-600 dark:text-gray-400 mt-1 p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                              {JSON.stringify(activity.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">System Logs</h3>
              
              {agent.logs && agent.logs.length > 0 ? (
                <div className="space-y-2">
                  {agent.logs.slice(0, 50).map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded font-mono text-sm">
                      <span className="flex-shrink-0 text-gray-500 dark:text-gray-400">
                        {safeDate(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={cn(
                        'flex-shrink-0 px-2 py-1 rounded text-xs font-medium',
                        log.level === 'error' ? 'bg-red-100 text-red-800' :
                        log.level === 'warn' ? 'bg-yellow-100 text-yellow-800' :
                        log.level === 'info' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      )}>
                        {log.level.toUpperCase()}
                      </span>
                      <span className="flex-1 text-gray-900 dark:text-gray-100">
                        {safeString(log.message)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No logs available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
});

BulletproofAgentProfile.displayName = 'BulletproofAgentProfile';

// Export with safety wrapper
export default withSafetyWrapper(BulletproofAgentProfile, 'BulletproofAgentProfile');
export { BulletproofAgentProfile };