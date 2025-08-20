import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  Activity,
  Zap,
  Clock,
  Users,
  MessageSquare,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Pause,
  Play,
  RotateCcw,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { 
  safeString, 
  safeNumber, 
  safeArray, 
  safeObject, 
  isDefined,
  safeDate 
} from '@/utils/safetyUtils';

interface SafeLiveActivity {
  id: string;
  agentId: string;
  agentName: string;
  type: 'task_start' | 'task_complete' | 'task_error' | 'agent_status' | 'workflow_update' | 'coordination';
  title: string;
  description: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata?: {
    duration?: number;
    progress?: number;
    error_code?: string;
    workflow_id?: string;
    success?: boolean;
  };
}

interface SafeTaskQueue {
  agentId: string;
  agentName: string;
  tasks: SafeTask[];
}

interface SafeTask {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number;
  status: 'queued' | 'processing' | 'paused';
}

interface SafeSystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  dismissed: boolean;
}

interface BulletproofActivityPanelProps {
  className?: string;
  onError?: (error: Error) => void;
  retryable?: boolean;
  fallback?: React.ReactNode;
}

// Safe data transformers
const transformToSafeActivity = (activity: any): SafeLiveActivity | null => {
  try {
    if (!activity || typeof activity !== 'object') return null;
    
    const validTypes = ['task_start', 'task_complete', 'task_error', 'agent_status', 'workflow_update', 'coordination'];
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    
    const type = validTypes.includes(activity.type) ? activity.type : 'agent_status';
    const priority = validPriorities.includes(activity.priority) ? activity.priority : 'medium';
    
    return {
      id: safeString(activity.id, `activity-${Date.now()}-${Math.random()}`),
      agentId: safeString(activity.agentId, 'unknown-agent'),
      agentName: safeString(activity.agentName, 'Unknown Agent'),
      type: type as SafeLiveActivity['type'],
      title: safeString(activity.title, 'Untitled Activity'),
      description: safeString(activity.description, 'No description available'),
      timestamp: safeDate(activity.timestamp).toISOString(),
      priority: priority as SafeLiveActivity['priority'],
      metadata: activity.metadata ? {
        duration: safeNumber(activity.metadata.duration),
        progress: Math.max(0, Math.min(100, safeNumber(activity.metadata.progress))),
        error_code: safeString(activity.metadata.error_code),
        workflow_id: safeString(activity.metadata.workflow_id),
        success: Boolean(activity.metadata.success)
      } : undefined
    };
  } catch (error) {
    console.error('Failed to transform activity data:', error);
    return null;
  }
};

const transformToSafeTask = (task: any): SafeTask | null => {
  try {
    if (!task || typeof task !== 'object') return null;
    
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    const validStatuses = ['queued', 'processing', 'paused'];
    
    const priority = validPriorities.includes(task.priority) ? task.priority : 'medium';
    const status = validStatuses.includes(task.status) ? task.status : 'queued';
    
    return {
      id: safeString(task.id, `task-${Date.now()}`),
      title: safeString(task.title, 'Untitled Task'),
      priority: priority as SafeTask['priority'],
      estimatedDuration: Math.max(0, safeNumber(task.estimatedDuration, 30)),
      status: status as SafeTask['status']
    };
  } catch (error) {
    console.error('Failed to transform task data:', error);
    return null;
  }
};

const transformToSafeTaskQueue = (queue: any): SafeTaskQueue | null => {
  try {
    if (!queue || typeof queue !== 'object') return null;
    
    const safeTasks = safeArray(queue.tasks)
      .map(transformToSafeTask)
      .filter(isDefined);
    
    return {
      agentId: safeString(queue.agentId, 'unknown-agent'),
      agentName: safeString(queue.agentName, 'Unknown Agent'),
      tasks: safeTasks
    };
  } catch (error) {
    console.error('Failed to transform task queue data:', error);
    return null;
  }
};

const transformToSafeAlert = (alert: any): SafeSystemAlert | null => {
  try {
    if (!alert || typeof alert !== 'object') return null;
    
    const validTypes = ['info', 'warning', 'error', 'success'];
    const type = validTypes.includes(alert.type) ? alert.type : 'info';
    
    return {
      id: safeString(alert.id, `alert-${Date.now()}`),
      type: type as SafeSystemAlert['type'],
      title: safeString(alert.title, 'System Alert'),
      message: safeString(alert.message, 'No message available'),
      timestamp: safeDate(alert.timestamp).toISOString(),
      dismissed: Boolean(alert.dismissed)
    };
  } catch (error) {
    console.error('Failed to transform alert data:', error);
    return null;
  }
};

// Mock data generators with safe defaults
const generateSafeMockActivities = (): SafeLiveActivity[] => {
  try {
    return [
      {
        id: 'act-001',
        agentId: 'chief-of-staff',
        agentName: 'Chief of Staff Agent',
        type: 'task_start',
        title: 'Strategic Planning Session',
        description: 'Initiating quarterly strategic planning and resource allocation review',
        timestamp: new Date().toISOString(),
        priority: 'high',
        metadata: { progress: 0 }
      },
      {
        id: 'act-002',
        agentId: 'performance',
        agentName: 'Performance Agent',
        type: 'task_complete',
        title: 'System Performance Analysis',
        description: 'Completed comprehensive performance analysis with optimization recommendations',
        timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        priority: 'medium',
        metadata: { duration: 15, success: true }
      },
      {
        id: 'act-003',
        agentId: 'security',
        agentName: 'Security Agent',
        type: 'task_error',
        title: 'Security Scan Failed',
        description: 'Vulnerability scan encountered an error during database analysis',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        priority: 'critical',
        metadata: { error_code: 'DB_CONNECTION_TIMEOUT' }
      }
    ];
  } catch (error) {
    console.error('Failed to generate mock activities:', error);
    return [];
  }
};

const generateSafeMockTaskQueues = (): SafeTaskQueue[] => {
  try {
    return [
      {
        agentId: 'frontend',
        agentName: 'Frontend Agent',
        tasks: [
          { id: 'task-001', title: 'Component Optimization', priority: 'medium', estimatedDuration: 30, status: 'processing' },
          { id: 'task-002', title: 'UI Testing', priority: 'low', estimatedDuration: 45, status: 'queued' },
          { id: 'task-003', title: 'Performance Audit', priority: 'high', estimatedDuration: 60, status: 'queued' }
        ]
      },
      {
        agentId: 'backend',
        agentName: 'Backend Agent',
        tasks: [
          { id: 'task-004', title: 'API Endpoint Creation', priority: 'high', estimatedDuration: 40, status: 'processing' },
          { id: 'task-005', title: 'Database Migration', priority: 'critical', estimatedDuration: 90, status: 'queued' }
        ]
      }
    ];
  } catch (error) {
    console.error('Failed to generate mock task queues:', error);
    return [];
  }
};

const generateSafeMockAlerts = (): SafeSystemAlert[] => {
  try {
    return [
      {
        id: 'alert-001',
        type: 'warning',
        title: 'High Memory Usage',
        message: 'System memory usage is at 87%. Consider optimizing resource allocation.',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        dismissed: false
      },
      {
        id: 'alert-002',
        type: 'success',
        title: 'Workflow Completed',
        message: 'SPARC development workflow completed successfully with 98% success rate.',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        dismissed: false
      }
    ];
  } catch (error) {
    console.error('Failed to generate mock alerts:', error);
    return [];
  }
};

// Loading skeleton components
const ActivitySkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg">
      <div className="w-4 h-4 bg-gray-200 rounded-full mt-1"></div>
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <div className="space-y-1">
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
            <div className="h-3 w-48 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-1">
            <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
            <div className="h-3 w-12 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="flex justify-between">
          <div className="h-3 w-24 bg-gray-200 rounded"></div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-8 bg-gray-200 rounded"></div>
            <div className="h-1 w-16 bg-gray-200 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const TaskQueueSkeleton: React.FC = () => (
  <div className="bg-gray-50 rounded-lg p-3 animate-pulse">
    <div className="flex items-center justify-between mb-2">
      <div className="h-4 w-24 bg-gray-200 rounded"></div>
      <div className="h-3 w-12 bg-gray-200 rounded"></div>
    </div>
    <div className="space-y-1">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-200 rounded-full"></div>
            <div className="h-3 w-20 bg-gray-200 rounded"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-12 bg-gray-200 rounded"></div>
            <div className="h-3 w-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Error boundary fallbacks
const ActivityError: React.FC<{ error?: Error; retry?: () => void }> = ({ retry }) => (
  <div className="text-center py-8 text-red-500">
    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
    <p className="text-sm font-medium">Failed to load activities</p>
    {retry && (
      <button
        onClick={retry}
        className="text-xs text-red-600 hover:text-red-800 mt-2 underline"
      >
        Retry
      </button>
    )}
  </div>
);

const PanelError: React.FC<{ error?: Error; retry?: () => void }> = ({ retry }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
    <div className="text-center">
      <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
      <h3 className="text-lg font-medium text-red-900 mb-2">Activity Panel Error</h3>
      <p className="text-red-700 mb-4">Unable to load the activity panel. Please try again.</p>
      {retry && (
        <button
          onClick={retry}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  </div>
);

export const BulletproofActivityPanel: React.FC<BulletproofActivityPanelProps> = ({ 
  className = '', 
  onError,
  retryable = true,
  fallback 
}) => {
  const [activities, setActivities] = useState<SafeLiveActivity[]>([]);
  const [taskQueues, setTaskQueues] = useState<SafeTaskQueue[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SafeSystemAlert[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [isMinimized, setIsMinimized] = useState(false);
  const [operationErrors, setOperationErrors] = useState<Record<string, string>>({});
  
  const { isConnected, subscribe } = useWebSocket();

  // Safe error handler
  const handleError = useCallback((error: Error, context: string) => {
    console.error(`Activity Panel Error [${context}]:`, error);
    setOperationErrors(prev => ({ ...prev, [context]: error.message }));
    onError?.(error);
  }, [onError]);

  // Clear specific error
  const clearError = useCallback((context: string) => {
    setOperationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[context];
      return newErrors;
    });
  }, []);

  // Safe activity generation for simulation
  const generateSafeActivity = useCallback((): SafeLiveActivity => {
    try {
      const agentNames = ['Chief of Staff Agent', 'Performance Agent', 'Security Agent', 'Frontend Agent', 'Backend Agent'];
      const agentIds = ['chief-of-staff', 'performance', 'security', 'frontend', 'backend'];
      const types: SafeLiveActivity['type'][] = ['task_start', 'task_complete', 'coordination', 'workflow_update'];
      const priorities: SafeLiveActivity['priority'][] = ['low', 'medium', 'high'];
      const titles = ['Processing Request', 'Analyzing Data', 'Coordinating Tasks', 'Updating Workflow'];
      
      const randomIndex = Math.floor(Math.random() * agentNames.length);
      
      return {
        id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        agentId: agentIds[randomIndex],
        agentName: agentNames[randomIndex],
        type: types[Math.floor(Math.random() * types.length)],
        title: titles[Math.floor(Math.random() * titles.length)],
        description: 'Real-time activity simulation',
        timestamp: new Date().toISOString(),
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        metadata: { progress: Math.floor(Math.random() * 100) }
      };
    } catch (error) {
      console.error('Error generating safe activity:', error);
      return {
        id: `fallback-${Date.now()}`,
        agentId: 'system',
        agentName: 'System Agent',
        type: 'agent_status',
        title: 'System Update',
        description: 'Fallback activity',
        timestamp: new Date().toISOString(),
        priority: 'low',
        metadata: { progress: 0 }
      };
    }
  }, []);

  // Initialize component with safe data
  useEffect(() => {
    try {
      clearError('initialization');
      setActivities(generateSafeMockActivities());
      setTaskQueues(generateSafeMockTaskQueues());
      setSystemAlerts(generateSafeMockAlerts());
    } catch (error) {
      handleError(error as Error, 'initialization');
    }
  }, [handleError]);

  // Simulate real-time activity updates with error handling
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    try {
      interval = setInterval(() => {
        if (!isPaused) {
          try {
            const newActivity = generateSafeActivity();
            setActivities(prev => [newActivity, ...prev.slice(0, 49)]); // Keep last 50 activities
          } catch (error) {
            handleError(error as Error, 'activity-simulation');
          }
        }
      }, 5000);
    } catch (error) {
      handleError(error as Error, 'activity-interval');
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPaused, generateSafeActivity, handleError]);

  // WebSocket subscriptions with error handling
  useEffect(() => {
    if (isConnected) {
      try {
        clearError('websocket');
        
        subscribe('live-activity', (data: any) => {
          try {
            if (!isPaused) {
              const safeActivity = transformToSafeActivity(data);
              if (safeActivity) {
                setActivities(prev => [safeActivity, ...prev.slice(0, 49)]);
                
                // Play sound notification if enabled
                if (soundEnabled && safeActivity.priority === 'critical') {
                  console.log('🔊 Critical activity notification');
                }
              }
            }
          } catch (error) {
            handleError(error as Error, 'activity-subscription');
          }
        });

        subscribe('task-queue-update', (data: any) => {
          try {
            const safeQueue = transformToSafeTaskQueue(data);
            if (safeQueue) {
              setTaskQueues(prev => prev.map(queue =>
                queue.agentId === safeQueue.agentId ? safeQueue : queue
              ));
            }
          } catch (error) {
            handleError(error as Error, 'queue-subscription');
          }
        });

        subscribe('system-alert', (data: any) => {
          try {
            const safeAlert = transformToSafeAlert(data);
            if (safeAlert) {
              setSystemAlerts(prev => [safeAlert, ...prev]);
            }
          } catch (error) {
            handleError(error as Error, 'alert-subscription');
          }
        });
      } catch (error) {
        handleError(error as Error, 'websocket');
      }
    }
  }, [isConnected, subscribe, isPaused, soundEnabled, handleError]);

  // Safe utility functions
  const getActivityIcon = useCallback((type: string) => {
    try {
      switch (type) {
        case 'task_start':
          return <Play className="w-4 h-4 text-blue-500" />;
        case 'task_complete':
          return <CheckCircle className="w-4 h-4 text-green-500" />;
        case 'task_error':
          return <AlertCircle className="w-4 h-4 text-red-500" />;
        case 'coordination':
          return <Users className="w-4 h-4 text-purple-500" />;
        case 'workflow_update':
          return <RotateCcw className="w-4 h-4 text-orange-500" />;
        default:
          return <Activity className="w-4 h-4 text-gray-400" />;
      }
    } catch (error) {
      console.error('Error getting activity icon:', error);
      return <Activity className="w-4 h-4 text-gray-400" />;
    }
  }, []);

  const getPriorityColor = useCallback((priority: string) => {
    try {
      switch (priority) {
        case 'critical':
          return 'bg-red-100 text-red-800 border-red-200';
        case 'high':
          return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'medium':
          return 'bg-blue-100 text-blue-800 border-blue-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    } catch (error) {
      console.error('Error getting priority color:', error);
      return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);

  const getAlertIcon = useCallback((type: string) => {
    try {
      switch (type) {
        case 'error':
          return <AlertCircle className="w-5 h-5 text-red-500" />;
        case 'warning':
          return <AlertCircle className="w-5 h-5 text-yellow-500" />;
        case 'success':
          return <CheckCircle className="w-5 h-5 text-green-500" />;
        default:
          return <MessageSquare className="w-5 h-5 text-blue-500" />;
      }
    } catch (error) {
      console.error('Error getting alert icon:', error);
      return <MessageSquare className="w-5 h-5 text-blue-500" />;
    }
  }, []);

  // Safe filtering
  const filteredActivities = useMemo(() => {
    try {
      const safeActivities = safeArray(activities).filter(isDefined);
      if (filterType === 'all') return safeActivities;
      return safeActivities.filter(activity => activity.type === filterType);
    } catch (error) {
      console.error('Error filtering activities:', error);
      return [];
    }
  }, [activities, filterType]);

  // Safe alert operations
  const dismissAlert = useCallback((alertId: string) => {
    try {
      setSystemAlerts(prev => prev.map(alert =>
        alert.id === alertId ? { ...alert, dismissed: true } : alert
      ));
    } catch (error) {
      handleError(error as Error, 'dismiss-alert');
    }
  }, [handleError]);

  const activeAlerts = useMemo(() => {
    try {
      return safeArray(systemAlerts).filter(alert => !alert.dismissed);
    } catch (error) {
      console.error('Error filtering alerts:', error);
      return [];
    }
  }, [systemAlerts]);

  const safeTaskQueues = useMemo(() => {
    try {
      return safeArray(taskQueues).filter(isDefined);
    } catch (error) {
      console.error('Error processing task queues:', error);
      return [];
    }
  }, [taskQueues]);

  // Render fallback if needed
  if (fallback && Object.keys(operationErrors).length > 0) {
    return <>{fallback}</>;
  }

  // Minimized view
  if (isMinimized) {
    return (
      <ErrorBoundary fallback={<div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">Panel Error</div>}>
        <div className={`fixed bottom-4 right-4 bg-white rounded-lg border border-gray-200 shadow-lg p-3 ${className}`}>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className={cn(
                'w-2 h-2 rounded-full',
                isConnected ? 'bg-green-500' : 'bg-red-500'
              )}></div>
              <Activity className="w-4 h-4 text-gray-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Activity Panel</span>
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary
      fallback={<PanelError retry={() => window.location.reload()} />}
      onError={(error) => handleError(error, 'boundary')}
    >
      <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-2 h-2 rounded-full',
                isConnected ? 'bg-green-500' : 'bg-red-500'
              )}></div>
              <Activity className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Live Activity</h2>
            </div>
            
            <div className="flex items-center gap-1">
              {!isConnected && <WifiOff className="w-4 h-4 text-red-500" />}
              {isConnected && <Wifi className="w-4 h-4 text-green-500" />}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Error Display */}
            {Object.keys(operationErrors).length > 0 && (
              <div className="text-xs text-red-600 mr-2">
                {Object.keys(operationErrors).length} error(s)
              </div>
            )}

            {/* Filters */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(safeString(e.target.value, 'all'))}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">All Types</option>
              <option value="task_start">Task Start</option>
              <option value="task_complete">Task Complete</option>
              <option value="task_error">Errors</option>
              <option value="coordination">Coordination</option>
            </select>

            {/* Controls */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={cn(
                'p-1 rounded text-gray-400 hover:text-gray-600',
                soundEnabled ? 'text-blue-500' : ''
              )}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setIsPaused(!isPaused)}
              className={cn(
                'p-1 rounded text-gray-400 hover:text-gray-600',
                isPaused ? 'text-yellow-500' : ''
              )}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error Display */}
        {Object.keys(operationErrors).length > 0 && (
          <div className="p-3 bg-red-50 border-b border-red-200">
            <div className="text-sm text-red-700 space-y-1">
              {Object.entries(operationErrors).map(([context, error]) => (
                <div key={context} className="flex items-center justify-between">
                  <span>{context}: {error}</span>
                  <button
                    onClick={() => clearError(context)}
                    className="text-red-600 hover:text-red-800 underline ml-2 text-xs"
                  >
                    Dismiss
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Alerts */}
        {activeAlerts.length > 0 && (
          <ErrorBoundary fallback={<div className="p-4 bg-red-50 text-red-700 text-sm">Alerts unavailable</div>}>
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-700 mb-2">System Alerts</h3>
              <div className="space-y-2">
                {activeAlerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border',
                      alert.type === 'error' ? 'bg-red-50 border-red-200' :
                      alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                      alert.type === 'success' ? 'bg-green-50 border-green-200' :
                      'bg-blue-50 border-blue-200'
                    )}
                  >
                    {getAlertIcon(alert.type)}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
                      <p className="text-xs text-gray-600">{alert.message}</p>
                    </div>
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <AlertCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </ErrorBoundary>
        )}

        {/* Task Queues */}
        <ErrorBoundary fallback={<div className="p-4 text-red-700 text-sm">Task queues unavailable</div>}>
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Task Queues
            </h3>
            <Suspense fallback={<TaskQueueSkeleton />}>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {safeTaskQueues.map((queue) => (
                  <div key={queue.agentId} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">{queue.agentName}</h4>
                      <span className="text-xs text-gray-500">{queue.tasks.length} tasks</span>
                    </div>
                    <div className="space-y-1">
                      {queue.tasks.slice(0, 2).map((task) => (
                        <div key={task.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'w-2 h-2 rounded-full',
                              task.status === 'processing' ? 'bg-blue-500' :
                              task.status === 'paused' ? 'bg-yellow-500' :
                              'bg-gray-400'
                            )}></div>
                            <span className="text-gray-700">{task.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'px-1 py-0.5 rounded text-xs',
                              getPriorityColor(task.priority)
                            )}>
                              {task.priority}
                            </span>
                            <span className="text-gray-500">{task.estimatedDuration}m</span>
                          </div>
                        </div>
                      ))}
                      {queue.tasks.length > 2 && (
                        <div className="text-xs text-gray-500 pt-1">
                          +{queue.tasks.length - 2} more tasks
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {safeTaskQueues.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No active task queues</p>
                  </div>
                )}
              </div>
            </Suspense>
          </div>
        </ErrorBoundary>

        {/* Live Activities */}
        <ErrorBoundary fallback={<ActivityError />}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Live Activities ({filteredActivities.length})
              </h3>
              {isPaused && (
                <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                  Updates Paused
                </span>
              )}
            </div>
            
            <Suspense fallback={<ActivitySkeleton />}>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredActivities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No recent activities</p>
                  </div>
                ) : (
                  filteredActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-shrink-0 mt-1">
                        {getActivityIcon(activity.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{activity.title}</h4>
                            <p className="text-xs text-gray-600">{activity.description}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-xs font-medium border',
                              getPriorityColor(activity.priority)
                            )}>
                              {activity.priority}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(activity.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="font-medium">{activity.agentName}</span>
                          {activity.metadata?.progress !== undefined && (
                            <div className="flex items-center gap-2">
                              <span>{activity.metadata.progress}%</span>
                              <div className="w-16 bg-gray-200 rounded-full h-1">
                                <div
                                  className="bg-blue-500 h-1 rounded-full"
                                  style={{ width: `${Math.max(0, Math.min(100, activity.metadata.progress))}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                          {activity.metadata?.duration && (
                            <span>{activity.metadata.duration}m duration</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Suspense>
          </div>
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
};

export default BulletproofActivityPanel;