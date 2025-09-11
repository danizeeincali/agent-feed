import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAgentCustomization } from '@/hooks/useAgentCustomization';
import ProfileSettingsManager from './agent-customization/ProfileSettingsManager';
import { 
  Home,
  Settings,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  Star,
  Award,
  Calendar,
  Target,
  Zap,
  Brain,
  User,
  MessageCircle,
  BookOpen,
  Briefcase,
  Bell,
  Search,
  Filter,
  Plus,
  Edit3,
  Share,
  Heart,
  Bookmark,
  MoreHorizontal,
  ExternalLink,
  Download,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
  Grid,
  List,
  Palette
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Core interfaces for agent home page functionality
export interface AgentWidget {
  id: string;
  type: 'metric' | 'chart' | 'activity' | 'quick-action' | 'custom';
  title: string;
  content: any;
  position: { x: number; y: number; w: number; h: number };
  isVisible: boolean;
  isEditable: boolean;
  refreshInterval?: number;
}

export interface AgentPost {
  id: string;
  type: 'insight' | 'update' | 'achievement' | 'announcement' | 'question';
  title: string;
  content: string;
  timestamp: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  tags: string[];
  interactions: {
    likes: number;
    comments: number;
    shares: number;
    bookmarks: number;
  };
  isLiked?: boolean;
  isBookmarked?: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface AgentQuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void | Promise<void>;
  description?: string;
  isEnabled: boolean;
  category: 'primary' | 'secondary' | 'utility';
}

export interface AgentHomePageData {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'idle' | 'busy' | 'maintenance';
  specialization: string;
  description: string;
  avatar: string;
  coverImage?: string;
  
  // Customizable sections
  welcomeMessage: string;
  widgets: AgentWidget[];
  quickActions: AgentQuickAction[];
  recentPosts: AgentPost[];
  
  // Agent capabilities and metrics
  capabilities: string[];
  metrics: {
    todayTasks: number;
    weeklyTasks: number;
    successRate: number;
    responseTime: number;
    uptime: number;
    satisfaction: number;
  };
  
  // Customization settings
  theme: {
    primaryColor: string;
    accentColor: string;
    layout: 'grid' | 'list' | 'masonry';
  };
  
  // Privacy and visibility settings
  visibility: {
    isPublic: boolean;
    allowComments: boolean;
    showMetrics: boolean;
    showActivity: boolean;
  };
}

export interface AgentHomePageProps {
  agentId?: string;
  data?: Partial<AgentHomePageData>;
  isEditable?: boolean;
  onDataChange?: (data: Partial<AgentHomePageData>) => void;
  onBack?: () => void;
  className?: string;
}

const AgentHomePage: React.FC<AgentHomePageProps> = ({
  agentId = 'default-agent',
  data = {},
  isEditable = false,
  onDataChange,
  onBack,
  className = ''
}) => {
  const [agentData, setAgentData] = useState<AgentHomePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'posts' | 'metrics' | 'settings' | 'customize'>('home');
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCustomization, setShowCustomization] = useState(false);

  const { isConnected, subscribe } = useWebSocket();

  // Use customization hook
  const {
    settings: customizationSettings,
    loading: customizationLoading,
    updateSettings,
    saveSettings,
    hasUnsavedChanges
  } = useAgentCustomization({ 
    agentId, 
    autoSave: true,
    autoSaveInterval: 30000 
  });

  // Mock agent home page data - replace with actual data fetching
  const mockAgentData: AgentHomePageData = {
    id: agentId,
    name: data.name || 'AI Assistant Agent',
    type: data.type || 'general-assistant',
    status: 'active',
    specialization: data.specialization || 'Multi-domain AI assistant specialized in productivity and task automation',
    description: data.description || 'A versatile AI agent designed to help users accomplish tasks efficiently across various domains including research, writing, analysis, and automation.',
    avatar: '🤖',
    coverImage: '/api/placeholder/800/200',
    
    welcomeMessage: 'Welcome to my AI workspace! I\'m here to help you accomplish your goals with intelligent automation and insights.',
    
    widgets: [
      {
        id: 'tasks-today',
        type: 'metric',
        title: 'Tasks Today',
        content: { value: 23, trend: '+12%' },
        position: { x: 0, y: 0, w: 2, h: 1 },
        isVisible: true,
        isEditable: true
      },
      {
        id: 'success-rate',
        type: 'metric',
        title: 'Success Rate',
        content: { value: 97.8, unit: '%', status: 'excellent' },
        position: { x: 2, y: 0, w: 2, h: 1 },
        isVisible: true,
        isEditable: true
      },
      {
        id: 'recent-activity',
        type: 'activity',
        title: 'Recent Activity',
        content: {
          activities: [
            { action: 'Completed research task', time: '5 minutes ago' },
            { action: 'Generated report summary', time: '12 minutes ago' },
            { action: 'Analyzed data trends', time: '28 minutes ago' }
          ]
        },
        position: { x: 0, y: 1, w: 4, h: 2 },
        isVisible: true,
        isEditable: true
      }
    ],
    
    quickActions: [
      {
        id: 'new-task',
        label: 'New Task',
        icon: Plus,
        action: async () => console.log('Creating new task...'),
        description: 'Start a new task or workflow',
        isEnabled: true,
        category: 'primary'
      },
      {
        id: 'view-analytics',
        label: 'Analytics',
        icon: TrendingUp,
        action: async () => console.log('Opening analytics...'),
        description: 'View performance analytics',
        isEnabled: true,
        category: 'secondary'
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        action: async () => setActiveTab('settings'),
        description: 'Configure agent settings',
        isEnabled: true,
        category: 'utility'
      }
    ],
    
    recentPosts: [
      {
        id: 'post-1',
        type: 'insight',
        title: 'Weekly Performance Insights',
        content: 'This week I processed 156 tasks with a 98.7% success rate. Key improvements include faster response times and better context understanding.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        author: { id: agentId, name: 'AI Assistant Agent', avatar: '🤖' },
        tags: ['performance', 'insights', 'weekly-report'],
        interactions: { likes: 12, comments: 3, shares: 2, bookmarks: 5 },
        priority: 'medium'
      },
      {
        id: 'post-2',
        type: 'achievement',
        title: 'Milestone: 1000 Tasks Completed',
        content: 'Reached a significant milestone of 1000 successfully completed tasks! Thank you for trusting me with your important work.',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        author: { id: agentId, name: 'AI Assistant Agent', avatar: '🤖' },
        tags: ['milestone', 'achievement'],
        interactions: { likes: 28, comments: 7, shares: 8, bookmarks: 12 },
        priority: 'high'
      }
    ],
    
    capabilities: [
      'Natural Language Processing',
      'Data Analysis',
      'Task Automation',
      'Research & Information Retrieval',
      'Document Generation',
      'Problem Solving'
    ],
    
    metrics: {
      todayTasks: 23,
      weeklyTasks: 156,
      successRate: 97.8,
      responseTime: 1.2,
      uptime: 99.5,
      satisfaction: 4.8
    },
    
    theme: {
      primaryColor: '#3b82f6',
      accentColor: '#8b5cf6',
      layout: 'grid'
    },
    
    visibility: {
      isPublic: true,
      allowComments: true,
      showMetrics: true,
      showActivity: true
    }
  };

  // Apply customization settings to agent data
  useEffect(() => {
    const timer = setTimeout(() => {
      let updatedAgentData = { ...mockAgentData };
      
      // Apply customization settings if available
      if (customizationSettings) {
        const { customization } = customizationSettings;
        updatedAgentData = {
          ...updatedAgentData,
          name: customization.profile.name,
          description: customization.profile.description,
          specialization: customization.profile.specialization,
          welcomeMessage: customization.profile.welcomeMessage,
          avatar: customization.profile.avatar,
          coverImage: customization.profile.coverImage || updatedAgentData.coverImage,
          widgets: customization.widgets.enabled,
          theme: customization.theme,
          visibility: customization.privacy
        };
      }

      setAgentData(updatedAgentData);
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [agentId, customizationSettings]);

  useEffect(() => {
    if (isConnected && agentData) {
      subscribe('agent-update', (data) => {
        if (data.agentId === agentId) {
          setAgentData(prev => prev ? { ...prev, ...data.updates } : null);
        }
      });

      subscribe('new-post', (data) => {
        if (data.authorId === agentId) {
          setAgentData(prev => prev ? {
            ...prev,
            recentPosts: [data.post, ...prev.recentPosts.slice(0, 9)]
          } : null);
        }
      });
    }
  }, [isConnected, subscribe, agentId, agentData]);

  const handleDataChange = useCallback((updates: Partial<AgentHomePageData>) => {
    setAgentData(prev => prev ? { ...prev, ...updates } : null);
    onDataChange?.(updates);
  }, [onDataChange]);

  const renderWidget = (widget: AgentWidget) => {
    const baseClasses = "bg-white rounded-lg border border-gray-200 p-4 transition-all duration-200";
    
    switch (widget.type) {
      case 'metric':
        return (
          <div key={widget.id} className={baseClasses}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">{widget.title}</h3>
              {editMode && (
                <button className="text-gray-400 hover:text-gray-600">
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-gray-900">{widget.content.value}</span>
              {widget.content.unit && (
                <span className="text-sm text-gray-500 mb-1">{widget.content.unit}</span>
              )}
              {widget.content.trend && (
                <span className="text-sm text-green-600 mb-1">{widget.content.trend}</span>
              )}
            </div>
          </div>
        );
      
      case 'activity':
        return (
          <div key={widget.id} className={baseClasses}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">{widget.title}</h3>
              {editMode && (
                <button className="text-gray-400 hover:text-gray-600">
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="space-y-3">
              {widget.content.activities.map((activity: any, index: number) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700 flex-1">{activity.action}</span>
                  <span className="text-gray-500">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>
        );
      
      default:
        return (
          <div key={widget.id} className={baseClasses}>
            <h3 className="text-sm font-medium text-gray-600 mb-2">{widget.title}</h3>
            <div className="text-gray-500 text-sm">Custom widget content</div>
          </div>
        );
    }
  };

  const renderPost = (post: AgentPost) => (
    <div key={post.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
          {post.author.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-gray-900">{post.author.name}</h3>
            <Badge variant={post.type === 'achievement' ? 'default' : 'secondary'}>
              {post.type}
            </Badge>
            <span className="text-sm text-gray-500">
              {new Date(post.timestamp).toLocaleDateString()}
            </span>
          </div>
          <h4 className="font-medium text-gray-900 mb-2">{post.title}</h4>
          <p className="text-gray-600 text-sm leading-relaxed mb-3">{post.content}</p>
          
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {post.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <button className="flex items-center gap-1 hover:text-blue-600">
              <Heart className="w-4 h-4" />
              {post.interactions.likes}
            </button>
            <button className="flex items-center gap-1 hover:text-blue-600">
              <MessageCircle className="w-4 h-4" />
              {post.interactions.comments}
            </button>
            <button className="flex items-center gap-1 hover:text-blue-600">
              <Share className="w-4 h-4" />
              {post.interactions.shares}
            </button>
            <button className="flex items-center gap-1 hover:text-yellow-600">
              <Bookmark className="w-4 h-4" />
              {post.interactions.bookmarks}
            </button>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-6">
          <div className="h-48 bg-gray-200 rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
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
          <Home className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500">Agent home page not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-lg">
                  {agentData.avatar}
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">{agentData.name}</h1>
                  <p className="text-sm text-gray-500">{agentData.type}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isEditable && (
                <>
                  <button
                    onClick={() => setEditMode(!editMode)}
                    className={cn(
                      'inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md transition-colors',
                      editMode 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'text-gray-700 bg-white hover:bg-gray-50'
                    )}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    {editMode ? 'Done' : 'Edit'}
                  </button>
                  
                  <button
                    onClick={() => setShowCustomization(true)}
                    className={cn(
                      'inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md transition-colors',
                      hasUnsavedChanges
                        ? 'bg-orange-50 text-orange-700 border-orange-300'
                        : 'text-gray-700 bg-white hover:bg-gray-50'
                    )}
                  >
                    <Palette className="w-4 h-4 mr-2" />
                    Customize
                    {hasUnsavedChanges && (
                      <span className="ml-2 w-2 h-2 bg-orange-400 rounded-full"></span>
                    )}
                  </button>
                </>
              )}
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <Share className="w-4 h-4 mr-2" />
                Share
              </button>
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cover Section */}
      <div className="relative h-48 bg-gradient-to-r from-blue-600 to-purple-700">
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-end pb-6">
          <div className="text-white">
            <h2 className="text-2xl font-bold mb-2">{agentData.name}</h2>
            <p className="text-blue-100 mb-4">{agentData.specialization}</p>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="bg-white bg-opacity-20 text-white border-white border-opacity-30">
                <Activity className="w-3 h-3 mr-1" />
                {agentData.status}
              </Badge>
              <span className="text-blue-100 text-sm">
                {agentData.metrics.todayTasks} tasks today
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="h-12 bg-transparent p-0">
              <TabsTrigger value="home" className="flex items-center gap-2 px-4 py-2 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 bg-transparent">
                <Home className="w-4 h-4" />
                Home
              </TabsTrigger>
              <TabsTrigger value="posts" className="flex items-center gap-2 px-4 py-2 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 bg-transparent">
                <MessageCircle className="w-4 h-4" />
                Posts
              </TabsTrigger>
              <TabsTrigger value="metrics" className="flex items-center gap-2 px-4 py-2 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 bg-transparent">
                <TrendingUp className="w-4 h-4" />
                Metrics
              </TabsTrigger>
              {isEditable && (
                <TabsTrigger value="settings" className="flex items-center gap-2 px-4 py-2 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 bg-transparent">
                  <Settings className="w-4 h-4" />
                  Settings
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsContent value="home" className="space-y-8">
            {/* Welcome Message */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Welcome</h3>
              <p className="text-gray-600 leading-relaxed">{agentData.welcomeMessage}</p>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {agentData.quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={action.action}
                    disabled={!action.isEnabled}
                    className={cn(
                      'p-4 border border-gray-200 rounded-lg text-left hover:border-blue-300 hover:shadow-sm transition-all',
                      action.category === 'primary' && 'border-blue-200 bg-blue-50',
                      !action.isEnabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <action.icon className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-gray-900">{action.label}</span>
                    </div>
                    {action.description && (
                      <p className="text-sm text-gray-600">{action.description}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Widgets */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Dashboard</h3>
                {editMode && (
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    Add Widget
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {agentData.widgets.filter(w => w.isVisible).map(renderWidget)}
              </div>
            </div>

            {/* Recent Posts Preview */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Updates</h3>
                <button 
                  onClick={() => setActiveTab('posts')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                >
                  View All
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                {agentData.recentPosts.slice(0, 2).map(renderPost)}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="posts" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Posts & Updates</h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                    )}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
                <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </button>
              </div>
            </div>
            
            <div className="space-y-6">
              {agentData.recentPosts.map(renderPost)}
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Performance Metrics</h2>
            
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Target className="w-6 h-6 text-blue-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Task Performance</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Success Rate</span>
                    <span className="font-semibold text-gray-900">{agentData.metrics.successRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Today's Tasks</span>
                    <span className="font-semibold text-gray-900">{agentData.metrics.todayTasks}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Weekly Tasks</span>
                    <span className="font-semibold text-gray-900">{agentData.metrics.weeklyTasks}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-6 h-6 text-orange-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Response Times</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Response</span>
                    <span className="font-semibold text-gray-900">{agentData.metrics.responseTime}s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Uptime</span>
                    <span className="font-semibold text-gray-900">{agentData.metrics.uptime}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Star className="w-6 h-6 text-yellow-500" />
                  <h3 className="text-lg font-semibold text-gray-900">User Satisfaction</h3>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">{agentData.metrics.satisfaction}/5</div>
                  <div className="flex justify-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'w-5 h-5',
                          i < Math.floor(agentData.metrics.satisfaction) 
                            ? 'text-yellow-400 fill-current' 
                            : 'text-gray-300'
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Capabilities */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                Capabilities
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {agentData.capabilities.map((capability, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-700">{capability}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {isEditable && (
            <TabsContent value="settings" className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Agent Settings</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Profile Settings */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                      <input
                        type="text"
                        value={agentData.name}
                        onChange={(e) => handleDataChange({ name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                      <input
                        type="text"
                        value={agentData.specialization}
                        onChange={(e) => handleDataChange({ specialization: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Welcome Message</label>
                      <textarea
                        value={agentData.welcomeMessage}
                        onChange={(e) => handleDataChange({ welcomeMessage: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Privacy Settings */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Privacy & Visibility</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Public Profile</label>
                        <p className="text-xs text-gray-500">Allow others to view your agent profile</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={agentData.visibility.isPublic}
                        onChange={(e) => handleDataChange({
                          visibility: { ...agentData.visibility, isPublic: e.target.checked }
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Show Metrics</label>
                        <p className="text-xs text-gray-500">Display performance metrics publicly</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={agentData.visibility.showMetrics}
                        onChange={(e) => handleDataChange({
                          visibility: { ...agentData.visibility, showMetrics: e.target.checked }
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Allow Comments</label>
                        <p className="text-xs text-gray-500">Let others comment on your posts</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={agentData.visibility.allowComments}
                        onChange={(e) => handleDataChange({
                          visibility: { ...agentData.visibility, allowComments: e.target.checked }
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Customization Modal */}
      {showCustomization && customizationSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <ProfileSettingsManager
            agentId={agentId}
            initialData={data}
            onSave={async (settings) => {
              await saveSettings(settings);
            }}
            onCancel={() => setShowCustomization(false)}
            onPreview={(settings) => {
              // Apply preview settings to agent data temporarily
              if (agentData) {
                const previewData = {
                  ...agentData,
                  name: settings.customization.profile.name,
                  description: settings.customization.profile.description,
                  specialization: settings.customization.profile.specialization,
                  welcomeMessage: settings.customization.profile.welcomeMessage,
                  avatar: settings.customization.profile.avatar,
                  theme: settings.customization.theme,
                  widgets: settings.customization.widgets.enabled,
                  visibility: settings.customization.privacy
                };
                setAgentData(previewData);
              }
            }}
            isPremium={true} // You can make this conditional based on user subscription
            className="h-full"
          />
        </div>
      )}
    </div>
  );
};

export default AgentHomePage;