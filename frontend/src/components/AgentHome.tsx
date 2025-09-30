/**
 * AgentHome - Dynamic agent home page component
 * Phase 3: Agent home page with comprehensive information and navigation
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Bot, 
  Activity, 
  Settings, 
  FileText, 
  Star, 
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
  TrendingUp,
  Zap,
  Calendar,
  Target,
  Award,
  Users
} from 'lucide-react';
import { cn } from '../utils/cn';

interface AgentHomeProps {
  className?: string;
}

interface AgentStats {
  tasksCompleted: number;
  successRate: number;
  averageResponseTime: number;
  uptime: number;
  todayTasks: number;
  weeklyTasks: number;
}

interface AgentActivity {
  id: string;
  type: 'task_completed' | 'task_started' | 'error' | 'milestone';
  title: string;
  description: string;
  timestamp: string;
  metadata?: {
    duration?: number;
    success?: boolean;
  };
}

interface AgentData {
  id: string;
  name: string;
  display_name?: string;
  description: string;
  status: 'active' | 'inactive' | 'busy' | 'error';
  capabilities: string[];
  stats: AgentStats;
  recentActivities: AgentActivity[];
  avatar_color?: string;
}

const AgentHome: React.FC<AgentHomeProps> = ({ className = '' }) => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data for demonstration (in production, this would come from API)
  const mockAgentData: AgentData = {
    id: agentId || 'unknown',
    name: agentId ? agentId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown Agent',
    display_name: agentId ? `${agentId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Agent` : 'Unknown Agent',
    description: 'Advanced AI agent specialized in task automation and intelligent workflow management.',
    status: 'active',
    capabilities: ['Task Automation', 'Data Analysis', 'Report Generation', 'Workflow Management', 'Quality Assurance'],
    stats: {
      tasksCompleted: 1247,
      successRate: 97.8,
      averageResponseTime: 1.3,
      uptime: 99.2,
      todayTasks: 23,
      weeklyTasks: 156
    },
    recentActivities: [
      {
        id: '1',
        type: 'task_completed',
        title: 'Data Analysis Complete',
        description: 'Successfully analyzed quarterly performance metrics',
        timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
        metadata: { duration: 15, success: true }
      },
      {
        id: '2',
        type: 'task_started',
        title: 'Report Generation Started',
        description: 'Generating comprehensive monthly report',
        timestamp: new Date(Date.now() - 60 * 60000).toISOString()
      },
      {
        id: '3',
        type: 'milestone',
        title: '1000 Tasks Completed',
        description: 'Reached milestone of 1000 successful task completions',
        timestamp: new Date(Date.now() - 2 * 60 * 60000).toISOString()
      }
    ],
    avatar_color: '#3B82F6'
  };

  useEffect(() => {
    const fetchAgentData = async () => {
      setLoading(true);
      try {
        // In production, this would fetch from actual API
        // const response = await fetch(`/api/agents/${agentId}/home`);
        // const data = await response.json();
        
        // For now, use mock data
        setTimeout(() => {
          setAgent(mockAgentData);
          setLoading(false);
        }, 1000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agent data');
        setAgent(mockAgentData); // Fallback to mock data
        setLoading(false);
      }
    };

    if (agentId) {
      fetchAgentData();
    }
  }, [agentId]);

  const handleBack = () => {
    navigate('/agents');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'busy':
        return <Activity className="w-5 h-5 text-blue-500" />;
      case 'inactive':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'busy':
        return 'bg-blue-100 text-blue-800';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'task_started':
        return <Play className="w-4 h-4 text-blue-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'milestone':
        return <Award className="w-4 h-4 text-purple-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-gray-600">Loading agent home...</span>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center py-12">
          <Bot className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500">Agent not found</p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Agents
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
              style={{ backgroundColor: agent.avatar_color || '#6B7280' }}
            >
              <Bot className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{agent.display_name || agent.name}</h1>
              <p className="text-gray-600">{agent.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn('inline-flex items-center px-2 py-1 rounded-full text-xs font-medium', getStatusColor(agent.status))}>
                  {getStatusIcon(agent.status)}
                  <span className="ml-1">{agent.status}</span>
                </span>
                <span className="text-xs text-gray-500">ID: {agent.id}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/agents/${agent.slug}`}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <FileText className="w-4 h-4 mr-2" />
            View Details
          </Link>
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-600">Total Tasks</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{agent.stats.tasksCompleted.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-gray-600">Success Rate</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{agent.stats.successRate}%</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-gray-600">Response Time</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{agent.stats.averageResponseTime}s</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-600">Uptime</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{agent.stats.uptime}%</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-medium text-gray-600">Today</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{agent.stats.todayTasks}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-teal-500" />
            <span className="text-sm font-medium text-gray-600">This Week</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{agent.stats.weeklyTasks}</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Capabilities */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Capabilities
          </h3>
          <div className="space-y-3">
            {agent.capabilities.map((capability, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">{capability}</span>
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${80 + (index * 5) % 20}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Recent Activities
          </h3>
          <div className="space-y-4">
            {agent.recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</p>
                  </div>
                  <p className="text-sm text-gray-600">{activity.description}</p>
                  {activity.metadata?.duration && (
                    <p className="text-xs text-gray-500 mt-1">
                      Duration: {activity.metadata.duration}m
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Play className="w-5 h-5 text-green-500 mr-2" />
            <span className="font-medium">Start Task</span>
          </button>
          <button className="flex items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Pause className="w-5 h-5 text-yellow-500 mr-2" />
            <span className="font-medium">Pause Agent</span>
          </button>
          <button className="flex items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <RotateCcw className="w-5 h-5 text-blue-500 mr-2" />
            <span className="font-medium">Restart</span>
          </button>
          <button className="flex items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <ExternalLink className="w-5 h-5 text-purple-500 mr-2" />
            <span className="font-medium">View Logs</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentHome;