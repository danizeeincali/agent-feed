import React, { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  Activity,
  Zap,
  Clock,
  Users,
  MessageSquare,
  AlertCircle,
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

interface LiveActivity {
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

interface TaskQueue {
  agentId: string;
  agentName: string;
  tasks: {
    id: string;
    title: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    estimatedDuration: number;
    status: 'queued' | 'processing' | 'paused';
  }[];
}

interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  dismissed: boolean;
}

interface ActivityPanelProps {
  className?: string;
}

const ActivityPanel: React.FC<ActivityPanelProps> = ({ className = '' }) => {
  const [activities, setActivities] = useState<LiveActivity[]>([]);
  const [taskQueues, setTaskQueues] = useState<TaskQueue[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  // const [autoScroll, setAutoScroll] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [isMinimized, setIsMinimized] = useState(false);
  
  const { isConnected, subscribe } = useWebSocket();
  
  // Mock data for demonstration
  const mockActivities: LiveActivity[] = [
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

  const mockTaskQueues: TaskQueue[] = [
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

  const mockSystemAlerts: SystemAlert[] = [
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

  useEffect(() => {
    // Initialize with mock data
    setActivities(mockActivities);
    setTaskQueues(mockTaskQueues);
    setSystemAlerts(mockSystemAlerts);

    // Simulate real-time activity updates
    const interval = setInterval(() => {
      if (!isPaused) {
        const newActivity: LiveActivity = {
          id: `act-${Date.now()}`,
          agentId: ['chief-of-staff', 'performance', 'security', 'frontend', 'backend'][Math.floor(Math.random() * 5)],
          agentName: ['Chief of Staff Agent', 'Performance Agent', 'Security Agent', 'Frontend Agent', 'Backend Agent'][Math.floor(Math.random() * 5)],
          type: ['task_start', 'task_complete', 'coordination', 'workflow_update'][Math.floor(Math.random() * 4)] as any,
          title: ['Processing Request', 'Analyzing Data', 'Coordinating Tasks', 'Updating Workflow'][Math.floor(Math.random() * 4)],
          description: 'Real-time activity simulation',
          timestamp: new Date().toISOString(),
          priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
          metadata: { progress: Math.floor(Math.random() * 100) }
        };

        setActivities(prev => [newActivity, ...prev.slice(0, 49)]); // Keep last 50 activities
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused]);

  useEffect(() => {
    if (isConnected) {
      subscribe('live-activity', (data: LiveActivity) => {
        if (!isPaused) {
          setActivities(prev => [data, ...prev.slice(0, 49)]);
          
          // Play sound notification if enabled
          if (soundEnabled && data.priority === 'critical') {
            // In a real app, you'd play a sound here
            console.log('🔊 Critical activity notification');
          }
        }
      });

      subscribe('task-queue-update', (data: TaskQueue) => {
        setTaskQueues(prev => prev.map(queue =>
          queue.agentId === data.agentId ? data : queue
        ));
      });

      subscribe('system-alert', (data: SystemAlert) => {
        setSystemAlerts(prev => [data, ...prev]);
      });
    }
  }, [isConnected, subscribe, isPaused, soundEnabled]);

  const getActivityIcon = (type: string) => {
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
  };

  const getPriorityColor = (priority: string) => {
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
  };

  const getAlertIcon = (type: string) => {
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
  };

  const filteredActivities = activities.filter(activity => {
    if (filterType === 'all') return true;
    return activity.type === filterType;
  });

  const dismissAlert = (alertId: string) => {
    setSystemAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, dismissed: true } : alert
    ));
  };

  const activeAlerts = systemAlerts.filter(alert => !alert.dismissed);

  if (isMinimized) {
    return (
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
    );
  }

  return (
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
          {/* Filters */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
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

      {/* System Alerts */}
      {activeAlerts.length > 0 && (
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
      )}

      {/* Task Queues */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Task Queues
        </h3>
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {taskQueues.map((queue) => (
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
        </div>
      </div>

      {/* Live Activities */}
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
                            style={{ width: `${activity.metadata.progress}%` }}
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
      </div>
    </div>
  );
};

export default ActivityPanel;