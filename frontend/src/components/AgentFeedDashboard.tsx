import React, { useState, useMemo } from 'react';
import { 
  Activity, 
  Users, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Play, 
  Pause,
  RotateCcw,
  TrendingUp,
  Brain,
  Layers
} from 'lucide-react';
import { useBackgroundOrchestration } from '@/hooks/useBackgroundOrchestration';
import { Agent, Task, Workflow } from '@/types';
import { cn } from '@/utils/cn';
import AgentPostsFeed from './AgentPostsFeed';

interface AgentCardProps {
  agent: Agent;
  onAgentSelect?: (agent: Agent) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onAgentSelect }) => {
  const statusColors = {
    idle: 'bg-gray-100 text-gray-700 border-gray-200',
    active: 'bg-blue-100 text-blue-700 border-blue-200',
    busy: 'bg-orange-100 text-orange-700 border-orange-200',
    error: 'bg-red-100 text-red-700 border-red-200',
    offline: 'bg-gray-50 text-gray-500 border-gray-100',
  };

  const StatusIcon = {
    idle: Clock,
    active: Play,
    busy: Activity,
    error: AlertCircle,
    offline: Pause,
  }[agent.status];

  return (
    <div 
      className={cn(
        "p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:shadow-md",
        statusColors[agent.status],
        agent.status === 'active' && "animate-pulse-slow"
      )}
      onClick={() => onAgentSelect?.(agent)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <StatusIcon className="w-4 h-4" />
          <span className="font-medium text-sm">{agent.name}</span>
        </div>
        <span className="text-xs uppercase tracking-wide opacity-75">
          {agent.type}
        </span>
      </div>
      
      <div className="text-xs space-y-1">
        <div className="flex justify-between">
          <span>Tasks:</span>
          <span className="font-medium">{agent.performance.tasksCompleted}</span>
        </div>
        <div className="flex justify-between">
          <span>Success Rate:</span>
          <span className="font-medium">{(agent.performance.successRate * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span>Efficiency:</span>
          <span className="font-medium">{(agent.performance.efficiency * 100).toFixed(1)}%</span>
        </div>
      </div>
      
      <div className="mt-2 flex flex-wrap gap-1">
        {agent.capabilities.slice(0, 3).map((capability, index) => (
          <span 
            key={index}
            className="px-2 py-1 text-xs rounded-full bg-white/50 backdrop-blur-sm"
          >
            {capability}
          </span>
        ))}
        {agent.capabilities.length > 3 && (
          <span className="px-2 py-1 text-xs rounded-full bg-white/50 backdrop-blur-sm">
            +{agent.capabilities.length - 3}
          </span>
        )}
      </div>
    </div>
  );
};

interface TaskItemProps {
  task: Task;
  onTaskAction?: (taskId: string, action: 'cancel' | 'retry') => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onTaskAction }) => {
  const statusColors = {
    pending: 'text-gray-600',
    in_progress: 'text-blue-600',
    completed: 'text-green-600',
    failed: 'text-red-600',
    cancelled: 'text-gray-400',
  };

  const StatusIcon = {
    pending: Clock,
    in_progress: Activity,
    completed: CheckCircle2,
    failed: AlertCircle,
    cancelled: Pause,
  }[task.status];

  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="flex items-center space-x-3 flex-1">
        <StatusIcon className={cn("w-4 h-4", statusColors[task.status])} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
          <p className="text-xs text-gray-500 truncate">{task.description}</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <div className="text-right">
          <div className="text-xs text-gray-500">Progress</div>
          <div className="flex items-center space-x-2">
            <div className="w-16 bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${task.progress}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-700">{task.progress}%</span>
          </div>
        </div>
        
        {(task.status === 'in_progress' || task.status === 'failed') && (
          <div className="flex space-x-1">
            {task.status === 'in_progress' && (
              <button
                onClick={() => onTaskAction?.(task.id, 'cancel')}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="Cancel task"
              >
                <Pause className="w-3 h-3" />
              </button>
            )}
            {task.status === 'failed' && (
              <button
                onClick={() => onTaskAction?.(task.id, 'retry')}
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="Retry task"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface WorkflowCardProps {
  workflow: Workflow;
  onWorkflowAction?: (workflowId: string, action: 'pause' | 'resume' | 'stop') => void;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({ workflow, onWorkflowAction }) => {
  const statusColors = {
    draft: 'border-gray-300 bg-gray-50',
    running: 'border-blue-300 bg-blue-50',
    paused: 'border-orange-300 bg-orange-50',
    completed: 'border-green-300 bg-green-50',
    failed: 'border-red-300 bg-red-50',
  };

  return (
    <div className={cn("p-4 rounded-lg border-2", statusColors[workflow.status])}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">{workflow.name}</h3>
        <span className={cn(
          "px-2 py-1 text-xs rounded-full uppercase tracking-wide",
          workflow.status === 'running' && "bg-blue-100 text-blue-700",
          workflow.status === 'paused' && "bg-orange-100 text-orange-700",
          workflow.status === 'completed' && "bg-green-100 text-green-700",
          workflow.status === 'failed' && "bg-red-100 text-red-700",
          workflow.status === 'draft' && "bg-gray-100 text-gray-700"
        )}>
          {workflow.status}
        </span>
      </div>
      
      <p className="text-sm text-gray-600 mb-3">{workflow.description}</p>
      
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Progress</span>
          <span>{workflow.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${workflow.progress}%` }}
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          {workflow.tasks.length} tasks • {workflow.tasks.filter(t => t.status === 'completed').length} completed
        </div>
        
        {workflow.status === 'running' && (
          <div className="flex space-x-1">
            <button
              onClick={() => onWorkflowAction?.(workflow.id, 'pause')}
              className="p-1 text-gray-400 hover:text-orange-600 transition-colors"
              title="Pause workflow"
            >
              <Pause className="w-3 h-3" />
            </button>
          </div>
        )}
        
        {workflow.status === 'paused' && (
          <button
            onClick={() => onWorkflowAction?.(workflow.id, 'resume')}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="Resume workflow"
          >
            <Play className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export const AgentFeedDashboard: React.FC = () => {
  const {
    orchestrationState,
    agents,
    activeWorkflows,
    backgroundTasks,
    isConnected,
    isLoading,
    error,
    pauseWorkflow,
    resumeWorkflow,
    cancelTask,
    updateCount,
  } = useBackgroundOrchestration();

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const dashboardStats = useMemo(() => {
    const activeAgents = agents.filter(a => a.status === 'active' || a.status === 'busy').length;
    const totalTasks = backgroundTasks.length;
    const completedTasks = backgroundTasks.filter(t => t.status === 'completed').length;
    const averageProgress = activeWorkflows.length > 0 
      ? activeWorkflows.reduce((sum, w) => sum + w.progress, 0) / activeWorkflows.length 
      : 0;

    return {
      activeAgents,
      totalTasks,
      completedTasks,
      averageProgress,
      systemLoad: orchestrationState?.systemLoad || 0,
    };
  }, [agents, backgroundTasks, activeWorkflows, orchestrationState]);

  const handleTaskAction = async (taskId: string, action: 'cancel' | 'retry') => {
    try {
      if (action === 'cancel') {
        await cancelTask(taskId);
      }
      // Retry logic would be implemented in the hook
    } catch (error) {
      console.error(`Failed to ${action} task:`, error);
    }
  };

  const handleWorkflowAction = async (workflowId: string, action: 'pause' | 'resume' | 'stop') => {
    try {
      if (action === 'pause') {
        await pauseWorkflow(workflowId);
      } else if (action === 'resume') {
        await resumeWorkflow(workflowId);
      }
    } catch (error) {
      console.error(`Failed to ${action} workflow:`, error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading orchestration state...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center space-x-3">
          <div className={cn(
            "w-3 h-3 rounded-full",
            isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
          )} />
          <span className="text-sm font-medium text-gray-900">
            {isConnected ? 'Connected to Orchestration Service' : 'Disconnected'}
          </span>
          {updateCount > 0 && (
            <span className="text-xs text-gray-500">
              {updateCount} real-time updates
            </span>
          )}
        </div>
        
        {error && (
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Active Agents</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {dashboardStats.activeAgents}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600">Background Tasks</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {dashboardStats.totalTasks}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-600">Completed</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {dashboardStats.completedTasks}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-gray-600">Avg Progress</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {dashboardStats.averageProgress.toFixed(1)}%
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-gray-600">System Load</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {(dashboardStats.systemLoad * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Agent Pool & Workflows */}
        <div className="space-y-6">
          {/* Agent Pool */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Agent Pool</h2>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {agents.map(agent => (
                <AgentCard 
                  key={agent.id} 
                  agent={agent} 
                  onAgentSelect={setSelectedAgent}
                />
              ))}
              {agents.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No agents available
                </div>
              )}
            </div>
          </div>

          {/* Active Workflows */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Workflows</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {activeWorkflows.map(workflow => (
                <WorkflowCard 
                  key={workflow.id} 
                  workflow={workflow} 
                  onWorkflowAction={handleWorkflowAction}
                />
              ))}
              {activeWorkflows.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No active workflows
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Agent Posts Feed */}
        <div>
          <AgentPostsFeed className="bg-gray-50 rounded-lg border" />
        </div>
      </div>

      {/* Background Tasks - Full Width Below */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Background Tasks</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {backgroundTasks.map(task => (
              <TaskItem 
                key={task.id} 
                task={task} 
                onTaskAction={handleTaskAction}
              />
            ))}
            {backgroundTasks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No background tasks
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected Agent Detail Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Agent Details</h3>
              <button 
                onClick={() => setSelectedAgent(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-600">Name:</span>
                <span className="ml-2 text-sm text-gray-900">{selectedAgent.name}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Type:</span>
                <span className="ml-2 text-sm text-gray-900">{selectedAgent.type}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Status:</span>
                <span className="ml-2 text-sm text-gray-900">{selectedAgent.status}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Capabilities:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedAgent.capabilities.map((capability, index) => (
                    <span 
                      key={index}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
                    >
                      {capability}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};