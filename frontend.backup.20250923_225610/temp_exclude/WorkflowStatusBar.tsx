import React, { useState, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  Users, 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Zap,
  Brain,
  Target
} from 'lucide-react';
import { useBackgroundOrchestration } from '@/hooks/useBackgroundOrchestration';
import { Workflow } from '@/types';
import { cn } from '@/utils/cn';

interface WorkflowProgressProps {
  workflow: Workflow;
  compact?: boolean;
}

const WorkflowProgress: React.FC<WorkflowProgressProps> = ({ workflow, compact = false }) => {
  const completedTasks = workflow.tasks.filter(t => t.status === 'completed').length;
  const totalTasks = workflow.tasks.length;
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const statusColors = {
    draft: 'bg-gray-400',
    running: 'bg-blue-500',
    paused: 'bg-orange-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-16 bg-gray-200 rounded-full h-1.5">
          <div 
            className={cn("h-1.5 rounded-full transition-all duration-500", statusColors[workflow.status])}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <span className="text-xs font-medium text-gray-700">
          {progressPercentage.toFixed(0)}%
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Progress</span>
        <span className="font-medium text-gray-900">
          {completedTasks}/{totalTasks} tasks ({progressPercentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={cn("h-2 rounded-full transition-all duration-500", statusColors[workflow.status])}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
};

interface WorkflowCardProps {
  workflow: Workflow;
  onAction?: (workflowId: string, action: 'start' | 'pause' | 'resume' | 'stop') => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({ 
  workflow, 
  onAction, 
  isExpanded = false, 
  onToggleExpand 
}) => {
  const statusConfig = {
    draft: {
      icon: Clock,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      label: 'Draft'
    },
    running: {
      icon: Play,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      label: 'Running'
    },
    paused: {
      icon: Pause,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      label: 'Paused'
    },
    completed: {
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      label: 'Completed'
    },
    failed: {
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      label: 'Failed'
    }
  };

  const config = statusConfig[workflow.status];
  const StatusIcon = config.icon;

  const getActiveAgents = () => {
    const agentIds = new Set();
    workflow.tasks.forEach(task => {
      task.assignedAgents.forEach(agentId => agentIds.add(agentId));
    });
    return agentIds.size;
  };

  const getEstimatedCompletion = () => {
    if (workflow.estimatedCompletion) {
      return new Date(workflow.estimatedCompletion).toLocaleString();
    }
    return 'Unknown';
  };

  const canStart = workflow.status === 'draft' || workflow.status === 'paused';
  const canPause = workflow.status === 'running';
  const canStop = workflow.status === 'running' || workflow.status === 'paused';

  return (
    <div className={cn(
      "border rounded-lg transition-all duration-200",
      config.bgColor,
      config.borderColor,
      isExpanded && "ring-2 ring-blue-200"
    )}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start space-x-3 flex-1">
            <StatusIcon className={cn("w-5 h-5 mt-0.5", config.color)} />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">{workflow.name}</h3>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{workflow.description}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <span className={cn(
              "px-2 py-1 text-xs rounded-full uppercase tracking-wide font-medium",
              config.color
            )}>
              {config.label}
            </span>
            
            <button
              onClick={onToggleExpand}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <WorkflowProgress workflow={workflow} compact={!isExpanded} />

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Users className="w-3 h-3" />
              <span>{getActiveAgents()} agents</span>
            </div>
            <div className="flex items-center space-x-1">
              <Activity className="w-3 h-3" />
              <span>{workflow.tasks.length} tasks</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>
                {new Date(workflow.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <div className="flex space-x-1">
            {canStart && (
              <button
                onClick={() => onAction?.(workflow.id, workflow.status === 'draft' ? 'start' : 'resume')}
                className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                title={workflow.status === 'draft' ? 'Start workflow' : 'Resume workflow'}
              >
                <Play className="w-3 h-3" />
              </button>
            )}
            
            {canPause && (
              <button
                onClick={() => onAction?.(workflow.id, 'pause')}
                className="p-1.5 text-orange-600 hover:bg-orange-100 rounded transition-colors"
                title="Pause workflow"
              >
                <Pause className="w-3 h-3" />
              </button>
            )}
            
            {canStop && (
              <button
                onClick={() => onAction?.(workflow.id, 'stop')}
                className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                title="Stop workflow"
              >
                <Square className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-white/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">Details</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span className="text-gray-900">
                    {new Date(workflow.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Est. Completion:</span>
                  <span className="text-gray-900">{getEstimatedCompletion()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Agents:</span>
                  <span className="text-gray-900">{getActiveAgents()}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">Tasks</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {workflow.tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between text-xs">
                    <span className="truncate text-gray-700">{task.title}</span>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-xs font-medium",
                      task.status === 'completed' && "bg-green-100 text-green-700",
                      task.status === 'in_progress' && "bg-blue-100 text-blue-700",
                      task.status === 'pending' && "bg-yellow-100 text-yellow-700",
                      task.status === 'failed' && "bg-red-100 text-red-700"
                    )}>
                      {task.status === 'in_progress' ? 'running' : task.status}
                    </span>
                  </div>
                ))}
                {workflow.tasks.length > 5 && (
                  <div className="text-xs text-gray-500 text-center pt-1">
                    +{workflow.tasks.length - 5} more tasks...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface SystemStatusProps {
  systemLoad: number;
  queueSize: number;
  activeWorkflows: number;
  totalAgents: number;
}

const SystemStatus: React.FC<SystemStatusProps> = ({
  systemLoad,
  queueSize,
  activeWorkflows,
  totalAgents
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">System Status</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Brain className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {(systemLoad * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-600">System Load</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Activity className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-lg font-semibold text-gray-900">{activeWorkflows}</div>
          <div className="text-xs text-gray-600">Active Workflows</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-lg font-semibold text-gray-900">{totalAgents}</div>
          <div className="text-xs text-gray-600">Total Agents</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Target className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-lg font-semibold text-gray-900">{queueSize}</div>
          <div className="text-xs text-gray-600">Queue Size</div>
        </div>
      </div>
    </div>
  );
};

export const WorkflowStatusBar: React.FC = () => {
  const {
    orchestrationState,
    activeWorkflows,
    agents,
    isConnected,
    isLoading,
    pauseWorkflow,
    resumeWorkflow,
    updateCount,
  } = useBackgroundOrchestration();

  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(new Set());
  const [showAllWorkflows, setShowAllWorkflows] = useState(false);

  const systemStats = useMemo(() => ({
    systemLoad: orchestrationState?.systemLoad || 0,
    queueSize: orchestrationState?.queueSize || 0,
    activeWorkflows: activeWorkflows.length,
    totalAgents: agents.length,
  }), [orchestrationState, activeWorkflows, agents]);

  const displayWorkflows = showAllWorkflows ? activeWorkflows : activeWorkflows.slice(0, 3);

  const handleWorkflowAction = async (workflowId: string, action: 'start' | 'pause' | 'resume' | 'stop') => {
    try {
      switch (action) {
        case 'pause':
          await pauseWorkflow(workflowId);
          break;
        case 'resume':
        case 'start':
          await resumeWorkflow(workflowId);
          break;
        case 'stop':
          // Stop functionality would be implemented in the hook
          break;
      }
    } catch (error) {
      console.error(`Failed to ${action} workflow:`, error);
    }
  };

  const toggleWorkflowExpanded = (workflowId: string) => {
    setExpandedWorkflows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workflowId)) {
        newSet.delete(workflowId);
      } else {
        newSet.add(workflowId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Workflow Status</h2>
          <p className="text-sm text-gray-600">
            Monitor active workflows and system performance
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {updateCount > 0 && (
            <div className="flex items-center space-x-1 text-sm text-blue-600">
              <Zap className="w-4 h-4" />
              <span>{updateCount}</span>
            </div>
          )}
          
          <div className={cn(
            "flex items-center space-x-2 px-3 py-1 rounded-full text-sm",
            isConnected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
            )} />
            <span>{isConnected ? 'Live' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {/* System Status */}
      <SystemStatus {...systemStats} />

      {/* Active Workflows */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-md font-medium text-gray-900">
            Active Workflows ({activeWorkflows.length})
          </h3>
          
          {activeWorkflows.length > 3 && (
            <button
              onClick={() => setShowAllWorkflows(!showAllWorkflows)}
              className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              {showAllWorkflows ? 'Show Less' : `Show All (${activeWorkflows.length})`}
            </button>
          )}
        </div>

        {displayWorkflows.length > 0 ? (
          <div className="space-y-3">
            {displayWorkflows.map(workflow => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onAction={handleWorkflowAction}
                isExpanded={expandedWorkflows.has(workflow.id)}
                onToggleExpand={() => toggleWorkflowExpanded(workflow.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium mb-1">No Active Workflows</p>
            <p className="text-sm">
              Workflows will appear here when orchestration begins
            </p>
          </div>
        )}
      </div>
    </div>
  );
};