import React, { useState, useMemo } from 'react';
import { 
  Activity, 
  Clock, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  Loader, 
  Pause, 
  Filter,
  Search,
  ArrowUpDown,
  Eye,
  EyeOff
} from 'lucide-react';
import { useBackgroundOrchestration } from '@/hooks/useBackgroundOrchestration';
import { Task, TaskStatus, TaskPriority } from '@/types';
import { cn } from '@/utils/cn';

interface ActivityItemProps {
  task: Task;
  onTaskAction?: (taskId: string, action: 'pause' | 'resume' | 'cancel' | 'retry') => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ 
  task, 
  onTaskAction, 
  isExpanded = false, 
  onToggleExpand 
}) => {
  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      label: 'Pending'
    },
    in_progress: {
      icon: Activity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      label: 'In Progress'
    },
    completed: {
      icon: CheckCircle,
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
    },
    cancelled: {
      icon: Pause,
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      label: 'Cancelled'
    }
  };

  const priorityColors = {
    low: 'text-gray-500',
    medium: 'text-blue-600',
    high: 'text-orange-600',
    critical: 'text-red-600'
  };

  const config = statusConfig[task.status];
  const StatusIcon = config.icon;

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getTimeElapsed = () => {
    const now = new Date();
    const created = new Date(task.createdAt);
    return formatDuration(now.getTime() - created.getTime());
  };

  return (
    <div className={cn(
      "border rounded-lg transition-all duration-200 hover:shadow-sm",
      config.bgColor,
      config.borderColor,
      isExpanded && "ring-2 ring-blue-200"
    )}>
      <div 
        className="p-4 cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            <div className="flex-shrink-0 mt-0.5">
              {task.status === 'in_progress' ? (
                <Loader className={cn("w-4 h-4 animate-spin", config.color)} />
              ) : (
                <StatusIcon className={cn("w-4 h-4", config.color)} />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {task.title}
                </h4>
                <span className={cn(
                  "px-2 py-0.5 text-xs rounded-full uppercase tracking-wide font-medium",
                  priorityColors[task.priority]
                )}>
                  {task.priority}
                </span>
              </div>
              
              <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                {task.description}
              </p>
              
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>Progress: {task.progress}%</span>
                <span>Elapsed: {getTimeElapsed()}</span>
                {task.assignedAgents.length > 0 && (
                  <span>Agents: {task.assignedAgents.length}</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <div className="text-right">
              <div className="w-16 bg-gray-200 rounded-full h-1.5 mb-1">
                <div 
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    task.status === 'completed' ? 'bg-green-500' : 
                    task.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                  )}
                  style={{ width: `${task.progress}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-700">
                {task.progress}%
              </span>
            </div>
            
            <button className="p-1 text-gray-400 hover:text-gray-600">
              {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-200 bg-white/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div className="space-y-2">
              <div className="text-xs">
                <span className="font-medium text-gray-600">Created:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(task.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="text-xs">
                <span className="font-medium text-gray-600">Updated:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(task.updatedAt).toLocaleString()}
                </span>
              </div>
              {task.estimatedDuration && (
                <div className="text-xs">
                  <span className="font-medium text-gray-600">Est. Duration:</span>
                  <span className="ml-2 text-gray-900">
                    {formatDuration(task.estimatedDuration)}
                  </span>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              {task.assignedAgents.length > 0 && (
                <div className="text-xs">
                  <span className="font-medium text-gray-600">Assigned Agents:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {task.assignedAgents.map((agentId, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                      >
                        {agentId}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex space-x-2 mt-3">
                {task.status === 'in_progress' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskAction?.(task.id, 'pause');
                      }}
                      className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
                    >
                      Pause
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskAction?.(task.id, 'cancel');
                      }}
                      className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                )}
                
                {task.status === 'failed' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskAction?.(task.id, 'retry');
                    }}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    Retry
                  </button>
                )}
                
                {task.status === 'pending' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskAction?.(task.id, 'resume');
                    }}
                    className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                  >
                    Start
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface FilterControlsProps {
  statusFilter: TaskStatus | 'all';
  priorityFilter: TaskPriority | 'all';
  searchTerm: string;
  sortBy: 'created' | 'updated' | 'priority' | 'progress';
  sortOrder: 'asc' | 'desc';
  onStatusFilterChange: (status: TaskStatus | 'all') => void;
  onPriorityFilterChange: (priority: TaskPriority | 'all') => void;
  onSearchChange: (term: string) => void;
  onSortChange: (by: 'created' | 'updated' | 'priority' | 'progress') => void;
  onSortOrderChange: () => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  statusFilter,
  priorityFilter,
  searchTerm,
  sortBy,
  sortOrder,
  onStatusFilterChange,
  onPriorityFilterChange,
  onSearchChange,
  onSortChange,
  onSortOrderChange,
}) => {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <button
          onClick={onSortOrderChange}
          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
        >
          <ArrowUpDown className="w-4 h-4 text-gray-600" />
        </button>
      </div>
      
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as TaskStatus | 'all')}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Priority:</span>
          <select
            value={priorityFilter}
            onChange={(e) => onPriorityFilterChange(e.target.value as TaskPriority | 'all')}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as 'created' | 'updated' | 'priority' | 'progress')}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
          >
            <option value="created">Created</option>
            <option value="updated">Updated</option>
            <option value="priority">Priority</option>
            <option value="progress">Progress</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export const BackgroundActivityPanel: React.FC = () => {
  const {
    backgroundTasks,
    isConnected,
    isLoading,
    error,
    cancelTask,
    // lastUpdate,
    updateCount,
  } = useBackgroundOrchestration();

  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'created' | 'updated' | 'priority' | 'progress'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = backgroundTasks;

    // Apply filters
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }
    
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(term) ||
        task.description.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'created':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updated':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        case 'priority':
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          break;
        case 'progress':
          aValue = a.progress;
          bValue = b.progress;
          break;
        default:
          return 0;
      }
      
      const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortOrder === 'desc' ? -result : result;
    });

    return filtered;
  }, [backgroundTasks, statusFilter, priorityFilter, searchTerm, sortBy, sortOrder]);

  const handleTaskAction = async (taskId: string, action: 'pause' | 'resume' | 'cancel' | 'retry') => {
    try {
      if (action === 'cancel') {
        await cancelTask(taskId);
      }
      // Other actions would be implemented in the hook
    } catch (error) {
      console.error(`Failed to ${action} task:`, error);
    }
  };

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const taskStats = useMemo(() => {
    const total = backgroundTasks.length;
    const pending = backgroundTasks.filter(t => t.status === 'pending').length;
    const inProgress = backgroundTasks.filter(t => t.status === 'in_progress').length;
    const completed = backgroundTasks.filter(t => t.status === 'completed').length;
    const failed = backgroundTasks.filter(t => t.status === 'failed').length;
    
    return { total, pending, inProgress, completed, failed };
  }, [backgroundTasks]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading background activities...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Background Activity</h2>
          <p className="text-sm text-gray-600 mt-1">
            Monitor and manage background orchestration tasks
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {updateCount > 0 && (
            <div className="flex items-center space-x-2 text-sm text-blue-600">
              <Zap className="w-4 h-4" />
              <span>{updateCount} updates</span>
            </div>
          )}
          
          <div className={cn(
            "flex items-center space-x-2 px-3 py-1 rounded-full text-sm",
            isConnected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500" : "bg-red-500"
            )} />
            <span>{isConnected ? 'Live' : 'Disconnected'}</span>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gray-50 p-3 rounded-lg text-center">
          <div className="text-lg font-semibold text-gray-900">{taskStats.total}</div>
          <div className="text-xs text-gray-600">Total</div>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg text-center">
          <div className="text-lg font-semibold text-yellow-700">{taskStats.pending}</div>
          <div className="text-xs text-yellow-600">Pending</div>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <div className="text-lg font-semibold text-blue-700">{taskStats.inProgress}</div>
          <div className="text-xs text-blue-600">In Progress</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <div className="text-lg font-semibold text-green-700">{taskStats.completed}</div>
          <div className="text-xs text-green-600">Completed</div>
        </div>
        <div className="bg-red-50 p-3 rounded-lg text-center">
          <div className="text-lg font-semibold text-red-700">{taskStats.failed}</div>
          <div className="text-xs text-red-600">Failed</div>
        </div>
      </div>

      {/* Filters */}
      <FilterControls
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        searchTerm={searchTerm}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onStatusFilterChange={setStatusFilter}
        onPriorityFilterChange={setPriorityFilter}
        onSearchChange={setSearchTerm}
        onSortChange={setSortBy}
        onSortOrderChange={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
      />

      {/* Task List */}
      <div className="space-y-3">
        {filteredAndSortedTasks.map(task => (
          <ActivityItem
            key={task.id}
            task={task}
            onTaskAction={handleTaskAction}
            isExpanded={expandedTasks.has(task.id)}
            onToggleExpand={() => toggleTaskExpanded(task.id)}
          />
        ))}
        
        {filteredAndSortedTasks.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium mb-1">No background activities</p>
            <p className="text-sm">
              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'No tasks match your current filters'
                : 'Background tasks will appear here when orchestration begins'
              }
            </p>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-red-800">Error</span>
          </div>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}
    </div>
  );
};