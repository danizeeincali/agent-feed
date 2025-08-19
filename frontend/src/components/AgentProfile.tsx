import React, { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  User,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  Award,
  Calendar,
  Target,
  Zap,
  Brain,
  Settings,
  ArrowLeft,
  Download,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface AgentActivity {
  id: string;
  type: 'task_completed' | 'task_started' | 'error' | 'milestone';
  title: string;
  description: string;
  timestamp: string;
  metadata?: {
    duration?: number;
    success?: boolean;
    impact_score?: number;
  };
}

interface AgentCapability {
  name: string;
  level: number; // 1-10
  description: string;
  experience_hours: number;
}

interface AgentProfileData {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'idle' | 'busy' | 'offline';
  specialization: string;
  description: string;
  avatar: string;
  capabilities: AgentCapability[];
  metrics: {
    tasksCompleted: number;
    successRate: number;
    averageResponseTime: number;
    totalUptime: number;
    lastActive: string;
    todayTasks: number;
    weeklyTasks: number;
    monthlyTasks: number;
  };
  performance: {
    efficiency: number;
    reliability: number;
    quality: number;
    collaboration: number;
  };
  recentActivities: AgentActivity[];
  achievements: string[];
  currentWorkload: {
    activeTasks: number;
    queuedTasks: number;
    estimatedCompletion: string;
  };
}

interface AgentProfileProps {
  agentId?: string;
  onBack?: () => void;
  className?: string;
}

const AgentProfile: React.FC<AgentProfileProps> = ({ 
  agentId = 'chief-of-staff', 
  onBack,
  className = '' 
}) => {
  const [agentData, setAgentData] = useState<AgentProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'activities' | 'performance' | 'capabilities'>('overview');

  const { isConnected, subscribe } = useWebSocket();

  // Mock agent profile data
  const mockAgentData: AgentProfileData = {
    id: 'chief-of-staff',
    name: 'Chief of Staff Agent',
    type: 'coordinator',
    status: 'active',
    specialization: 'Strategic coordination and executive assistance',
    description: 'An advanced AI agent specialized in strategic planning, task coordination, and executive-level decision support. Manages complex workflows and ensures optimal resource allocation across all operational areas.',
    avatar: '👨‍💼',
    capabilities: [
      {
        name: 'Strategic Planning',
        level: 9,
        description: 'Long-term strategic planning and roadmap development',
        experience_hours: 1250
      },
      {
        name: 'Task Coordination',
        level: 10,
        description: 'Multi-agent task coordination and workflow optimization',
        experience_hours: 2100
      },
      {
        name: 'Priority Assessment',
        level: 8,
        description: 'Business impact analysis and priority scoring',
        experience_hours: 890
      },
      {
        name: 'Resource Management',
        level: 9,
        description: 'Optimal allocation of resources and capacity planning',
        experience_hours: 1560
      },
      {
        name: 'Decision Support',
        level: 8,
        description: 'Data-driven decision making and recommendation systems',
        experience_hours: 970
      }
    ],
    metrics: {
      tasksCompleted: 1847,
      successRate: 98.7,
      averageResponseTime: 1.2,
      totalUptime: 99.3,
      lastActive: new Date().toISOString(),
      todayTasks: 23,
      weeklyTasks: 156,
      monthlyTasks: 687
    },
    performance: {
      efficiency: 96,
      reliability: 99,
      quality: 94,
      collaboration: 97
    },
    recentActivities: [
      {
        id: 'act-001',
        type: 'task_completed',
        title: 'Workflow Optimization Review',
        description: 'Completed comprehensive analysis of multi-agent workflow efficiency',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        metadata: { duration: 45, success: true, impact_score: 8.5 }
      },
      {
        id: 'act-002',
        type: 'milestone',
        title: '1000th Task Completion',
        description: 'Reached milestone of 1000 successfully completed strategic tasks',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        metadata: { impact_score: 9.0 }
      },
      {
        id: 'act-003',
        type: 'task_started',
        title: 'Quarterly Planning Session',
        description: 'Initiated Q1 2024 strategic planning and resource allocation',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'act-004',
        type: 'task_completed',
        title: 'Agent Performance Analysis',
        description: 'Generated comprehensive performance report for all active agents',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        metadata: { duration: 30, success: true, impact_score: 7.2 }
      }
    ],
    achievements: [
      'Strategic Planning Master',
      'Workflow Efficiency Expert',
      'High Performance Coordinator',
      '99% Uptime Champion',
      'Task Completion Specialist'
    ],
    currentWorkload: {
      activeTasks: 3,
      queuedTasks: 7,
      estimatedCompletion: '2 hours'
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setAgentData(mockAgentData);
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [agentId]);

  useEffect(() => {
    if (isConnected) {
      subscribe('agent-activity', (data) => {
        if (data.agentId === agentId) {
          setAgentData(prev => prev ? {
            ...prev,
            recentActivities: [data.activity, ...prev.recentActivities.slice(0, 9)]
          } : null);
        }
      });

      subscribe('agent-metrics-update', (data) => {
        if (data.agentId === agentId) {
          setAgentData(prev => prev ? {
            ...prev,
            metrics: { ...prev.metrics, ...data.metrics }
          } : null);
        }
      });
    }
  }, [isConnected, subscribe, agentId]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'task_started':
        return <Activity className="w-4 h-4 text-blue-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'milestone':
        return <Award className="w-4 h-4 text-purple-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getCapabilityColor = (level: number) => {
    if (level >= 9) return 'bg-green-500';
    if (level >= 7) return 'bg-blue-500';
    if (level >= 5) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const formatUptime = (percentage: number) => {
    const days = Math.floor(percentage * 30 / 100);
    const hours = Math.floor((percentage * 30 % 100) * 24 / 100);
    return `${days}d ${hours}h`;
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 rounded w-48"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!agentData) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500">Agent profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-2xl">
              {agentData.avatar}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{agentData.name}</h1>
              <p className="text-gray-600">{agentData.specialization}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                  agentData.status === 'active' ? 'bg-green-100 text-green-800' :
                  agentData.status === 'busy' ? 'bg-blue-100 text-blue-800' :
                  agentData.status === 'idle' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                )}>
                  <Activity className="w-3 h-3 mr-1" />
                  {agentData.status}
                </span>
                <span className="text-xs text-gray-500">ID: {agentData.id}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </button>
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-600">Total Tasks</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{agentData.metrics.tasksCompleted.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-gray-600">Success Rate</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{agentData.metrics.successRate}%</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-gray-600">Response Time</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{agentData.metrics.averageResponseTime}s</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-600">Uptime</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{agentData.metrics.totalUptime}%</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-medium text-gray-600">Today</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{agentData.metrics.todayTasks}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-teal-500" />
            <span className="text-sm font-medium text-gray-600">This Week</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{agentData.metrics.weeklyTasks}</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: User },
            { id: 'activities', name: 'Activities', icon: Activity },
            { id: 'performance', name: 'Performance', icon: TrendingUp },
            { id: 'capabilities', name: 'Capabilities', icon: Brain }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Description */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">About</h3>
              <p className="text-gray-600 leading-relaxed">{agentData.description}</p>
            </div>

            {/* Current Workload */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Workload</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Active Tasks</span>
                  <span className="font-semibold text-gray-900">{agentData.currentWorkload.activeTasks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Queued Tasks</span>
                  <span className="font-semibold text-gray-900">{agentData.currentWorkload.queuedTasks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Est. Completion</span>
                  <span className="font-semibold text-gray-900">{agentData.currentWorkload.estimatedCompletion}</span>
                </div>
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                Achievements
              </h3>
              <div className="flex flex-wrap gap-2">
                {agentData.achievements.map((achievement, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-50 text-yellow-800 border border-yellow-200"
                  >
                    <Star className="w-3 h-3 mr-1" />
                    {achievement}
                  </span>
                ))}
              </div>
            </div>

            {/* Performance Overview */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
              <div className="space-y-4">
                {Object.entries(agentData.performance).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 capitalize">{key}</span>
                      <span className="font-medium text-gray-900">{value}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${value}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activities' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
            <div className="space-y-4">
              {agentData.recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-4 border border-gray-100 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{activity.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </p>
                        {activity.metadata?.impact_score && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs text-gray-600">
                              {activity.metadata.impact_score}/10
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {activity.metadata?.duration && (
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {activity.metadata.duration}m
                        </span>
                        {activity.metadata.success && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            Success
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
              <div className="space-y-6">
                {Object.entries(agentData.performance).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700 capitalize">{key}</span>
                      <span className="text-lg font-bold text-gray-900">{value}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={cn(
                          'h-3 rounded-full transition-all duration-300',
                          value >= 90 ? 'bg-green-500' :
                          value >= 70 ? 'bg-blue-500' :
                          value >= 50 ? 'bg-yellow-500' :
                          'bg-red-500'
                        )}
                        style={{ width: `${value}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Statistics</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{agentData.metrics.todayTasks}</p>
                    <p className="text-sm text-gray-600">Today</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{agentData.metrics.weeklyTasks}</p>
                    <p className="text-sm text-gray-600">This Week</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{agentData.metrics.monthlyTasks}</p>
                    <p className="text-sm text-gray-600">This Month</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{agentData.metrics.tasksCompleted}</p>
                    <p className="text-sm text-gray-600">Total</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'capabilities' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Capabilities & Skills</h3>
            <div className="space-y-6">
              {agentData.capabilities.map((capability) => (
                <div key={capability.name} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{capability.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Level {capability.level}/10</span>
                      <div className={cn(
                        'w-3 h-3 rounded-full',
                        getCapabilityColor(capability.level)
                      )}></div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{capability.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Experience: {capability.experience_hours.toLocaleString()} hours</span>
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className={cn('h-2 rounded-full', getCapabilityColor(capability.level))}
                        style={{ width: `${capability.level * 10}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentProfile;