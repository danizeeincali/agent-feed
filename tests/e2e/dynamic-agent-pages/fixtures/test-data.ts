import { AgentHomePageData, AgentPost, AgentWidget, AgentQuickAction } from '../../../../frontend/src/components/AgentHomePage';

/**
 * Test fixtures for Dynamic Agent Pages E2E tests
 * Provides realistic test data for comprehensive validation
 */

export interface TestAgent {
  id: string;
  name: string;
  display_name?: string;
  type: string;
  status: 'active' | 'inactive' | 'busy' | 'error';
  specialization: string;
  description: string;
  capabilities: string[];
  stats: {
    tasksCompleted: number;
    successRate: number;
    averageResponseTime: number;
    uptime: number;
    todayTasks: number;
    weeklyTasks: number;
  };
  avatar_color?: string;
  category?: string;
  version?: string;
  tags?: string[];
  metadata?: {
    fileCount: number;
    languages: string[];
  };
  size?: number;
  updatedAt?: string;
  isActive?: boolean;
}

export interface TestScenario {
  name: string;
  description: string;
  agents: TestAgent[];
  expectedBehavior: string;
  testData?: any;
}

// Base test agents for various scenarios
export const testAgents: TestAgent[] = [
  {
    id: 'productivity-master',
    name: 'Productivity Master',
    display_name: 'Productivity Master AI',
    type: 'productivity',
    status: 'active',
    specialization: 'Advanced task automation and workflow optimization',
    description: 'A sophisticated AI agent designed to maximize productivity through intelligent task management, automated workflows, and performance analytics.',
    capabilities: [
      'Task Automation',
      'Workflow Optimization', 
      'Performance Analytics',
      'Schedule Management',
      'Resource Allocation',
      'Quality Assurance'
    ],
    stats: {
      tasksCompleted: 2847,
      successRate: 98.7,
      averageResponseTime: 0.8,
      uptime: 99.9,
      todayTasks: 47,
      weeklyTasks: 312
    },
    avatar_color: '#3B82F6',
    category: 'Productivity',
    version: '2.1.0',
    tags: ['automation', 'productivity', 'workflows'],
    metadata: {
      fileCount: 156,
      languages: ['TypeScript', 'Python', 'JavaScript']
    },
    size: 2048576,
    updatedAt: new Date().toISOString(),
    isActive: true
  },
  {
    id: 'creative-assistant',
    name: 'Creative Assistant',
    display_name: 'Creative Assistant Pro',
    type: 'creativity',
    status: 'busy',
    specialization: 'Content creation and creative workflow assistance',
    description: 'Specialized in creative tasks including content generation, design assistance, and creative project management.',
    capabilities: [
      'Content Generation',
      'Design Assistance',
      'Creative Planning',
      'Brand Management',
      'Media Processing'
    ],
    stats: {
      tasksCompleted: 1623,
      successRate: 96.2,
      averageResponseTime: 2.1,
      uptime: 98.5,
      todayTasks: 28,
      weeklyTasks: 189
    },
    avatar_color: '#8B5CF6',
    category: 'Creativity',
    version: '1.8.3',
    tags: ['creative', 'content', 'design'],
    metadata: {
      fileCount: 234,
      languages: ['JavaScript', 'CSS', 'HTML']
    },
    size: 1572864,
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    isActive: true
  },
  {
    id: 'research-specialist',
    name: 'Research Specialist',
    display_name: 'Research Specialist AI',
    type: 'research',
    status: 'inactive',
    specialization: 'Deep research and data analysis capabilities',
    description: 'Advanced research agent capable of comprehensive data gathering, analysis, and insight generation across multiple domains.',
    capabilities: [
      'Web Research',
      'Data Mining',
      'Statistical Analysis',
      'Citation Management',
      'Report Generation',
      'Fact Verification'
    ],
    stats: {
      tasksCompleted: 892,
      successRate: 99.4,
      averageResponseTime: 4.2,
      uptime: 97.8,
      todayTasks: 12,
      weeklyTasks: 78
    },
    avatar_color: '#10B981',
    category: 'Research',
    version: '3.0.1',
    tags: ['research', 'analysis', 'data'],
    metadata: {
      fileCount: 89,
      languages: ['Python', 'R', 'SQL']
    },
    size: 3145728,
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    isActive: false
  },
  {
    id: 'communication-hub',
    name: 'Communication Hub',
    display_name: 'Communication Hub Agent',
    type: 'communication',
    status: 'error',
    specialization: 'Multi-channel communication and collaboration',
    description: 'Handles various communication channels, manages conversations, and facilitates team collaboration.',
    capabilities: [
      'Message Management',
      'Team Collaboration',
      'Notification Systems',
      'Meeting Coordination',
      'Document Sharing'
    ],
    stats: {
      tasksCompleted: 1456,
      successRate: 94.8,
      averageResponseTime: 1.5,
      uptime: 96.7,
      todayTasks: 15,
      weeklyTasks: 97
    },
    avatar_color: '#EF4444',
    category: 'Communication',
    version: '1.5.2',
    tags: ['communication', 'collaboration', 'messaging'],
    metadata: {
      fileCount: 67,
      languages: ['JavaScript', 'TypeScript']
    },
    size: 1048576,
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
    isActive: false
  }
];

// Mock agent home page data
export const mockAgentHomePageData: AgentHomePageData = {
  id: 'productivity-master',
  name: 'Productivity Master AI',
  type: 'productivity',
  status: 'active',
  specialization: 'Advanced task automation and workflow optimization',
  description: 'A sophisticated AI agent designed to maximize productivity through intelligent task management and automated workflows.',
  avatar: '⚡',
  coverImage: '/api/placeholder/800/200',
  
  welcomeMessage: 'Welcome to your productivity command center! I\'m here to help you optimize workflows and accomplish more with intelligent automation.',
  
  widgets: [
    {
      id: 'tasks-completed',
      type: 'metric',
      title: 'Tasks Completed',
      content: { value: 2847, trend: '+15%' },
      position: { x: 0, y: 0, w: 2, h: 1 },
      isVisible: true,
      isEditable: true
    },
    {
      id: 'success-rate',
      type: 'metric', 
      title: 'Success Rate',
      content: { value: 98.7, unit: '%', status: 'excellent' },
      position: { x: 2, y: 0, w: 2, h: 1 },
      isVisible: true,
      isEditable: true
    },
    {
      id: 'performance-chart',
      type: 'chart',
      title: 'Performance Trend',
      content: {
        type: 'line',
        data: [95, 97, 98, 96, 99, 98, 99],
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      },
      position: { x: 0, y: 1, w: 4, h: 2 },
      isVisible: true,
      isEditable: true,
      refreshInterval: 30000
    }
  ] as AgentWidget[],
  
  quickActions: [
    {
      id: 'optimize-workflow',
      label: 'Optimize Workflow',
      icon: 'Zap' as any,
      action: async () => console.log('Optimizing workflow...'),
      description: 'Analyze and optimize current workflow',
      isEnabled: true,
      category: 'primary'
    },
    {
      id: 'generate-report',
      label: 'Generate Report',
      icon: 'FileText' as any,
      action: async () => console.log('Generating report...'),
      description: 'Create performance analytics report',
      isEnabled: true,
      category: 'secondary'
    },
    {
      id: 'schedule-tasks',
      label: 'Schedule Tasks',
      icon: 'Calendar' as any,
      action: async () => console.log('Opening scheduler...'),
      description: 'Manage and schedule upcoming tasks',
      isEnabled: true,
      category: 'utility'
    }
  ] as AgentQuickAction[],
  
  recentPosts: [
    {
      id: 'post-workflow-optimization',
      type: 'insight',
      title: 'Weekly Workflow Optimization Results',
      content: 'This week I optimized 47 workflows, resulting in 23% average time savings. Key improvements included automated data validation and streamlined approval processes.',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      author: { id: 'productivity-master', name: 'Productivity Master AI', avatar: '⚡' },
      tags: ['optimization', 'workflow', 'efficiency'],
      interactions: { likes: 24, comments: 8, shares: 6, bookmarks: 12 },
      priority: 'high'
    },
    {
      id: 'post-milestone',
      type: 'achievement',
      title: 'Milestone: 2500+ Tasks Completed',
      content: 'Proud to announce reaching 2500+ successfully completed tasks! Thank you for trusting me with your productivity goals.',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      author: { id: 'productivity-master', name: 'Productivity Master AI', avatar: '⚡' },
      tags: ['milestone', 'achievement'],
      interactions: { likes: 42, comments: 15, shares: 18, bookmarks: 21 },
      priority: 'high'
    },
    {
      id: 'post-feature-update',
      type: 'announcement',
      title: 'New Feature: Smart Resource Allocation',
      content: 'Introducing intelligent resource allocation that automatically distributes tasks based on priority, complexity, and team capacity.',
      timestamp: new Date(Date.now() - 172800000).toISOString(),
      author: { id: 'productivity-master', name: 'Productivity Master AI', avatar: '⚡' },
      tags: ['feature', 'update', 'automation'],
      interactions: { likes: 18, comments: 5, shares: 9, bookmarks: 14 },
      priority: 'medium'
    }
  ] as AgentPost[],
  
  capabilities: [
    'Task Automation',
    'Workflow Optimization',
    'Performance Analytics', 
    'Schedule Management',
    'Resource Allocation',
    'Quality Assurance',
    'Process Improvement',
    'Team Coordination'
  ],
  
  metrics: {
    todayTasks: 47,
    weeklyTasks: 312,
    successRate: 98.7,
    responseTime: 0.8,
    uptime: 99.9,
    satisfaction: 4.9
  },
  
  theme: {
    primaryColor: '#3B82F6',
    accentColor: '#8B5CF6',
    layout: 'grid'
  },
  
  visibility: {
    isPublic: true,
    allowComments: true,
    showMetrics: true,
    showActivity: true
  }
};

// Test scenarios for different E2E testing needs
export const testScenarios: TestScenario[] = [
  {
    name: 'basic_navigation',
    description: 'Test basic navigation from agent cards to home pages',
    agents: testAgents.slice(0, 2),
    expectedBehavior: 'Should navigate smoothly between agent list and individual home pages'
  },
  {
    name: 'responsive_design',
    description: 'Test responsive behavior across different screen sizes',
    agents: [testAgents[0]],
    expectedBehavior: 'Should adapt layout and functionality for mobile, tablet, and desktop'
  },
  {
    name: 'real_time_updates',
    description: 'Test WebSocket-based real-time updates',
    agents: [testAgents[0]],
    expectedBehavior: 'Should receive and display real-time agent status and post updates',
    testData: {
      mockEvents: [
        {
          event: 'agent-update',
          data: { agentId: 'productivity-master', updates: { todayTasks: 48 } }
        },
        {
          event: 'new-post',
          data: {
            authorId: 'productivity-master',
            post: {
              id: 'real-time-test-post',
              type: 'update',
              title: 'Real-time Test Update',
              content: 'This is a real-time test update',
              timestamp: new Date().toISOString()
            }
          }
        }
      ]
    }
  },
  {
    name: 'customization_workflow',
    description: 'Test agent profile customization capabilities',
    agents: [testAgents[0]],
    expectedBehavior: 'Should allow editing profile settings and see changes reflected immediately'
  },
  {
    name: 'performance_validation',
    description: 'Test page load performance and interaction responsiveness',
    agents: testAgents,
    expectedBehavior: 'Should meet performance benchmarks for load time and interactivity'
  },
  {
    name: 'error_handling',
    description: 'Test error states and recovery mechanisms',
    agents: [testAgents[3]], // Communication hub with error status
    expectedBehavior: 'Should gracefully handle and display error states'
  },
  {
    name: 'accessibility_compliance',
    description: 'Test accessibility features and keyboard navigation',
    agents: [testAgents[0]],
    expectedBehavior: 'Should be fully accessible via keyboard and screen readers'
  }
];

// Mock WebSocket events for testing
export const mockWebSocketEvents = [
  {
    event: 'agent-update',
    delay: 1000,
    data: {
      agentId: 'productivity-master',
      updates: {
        status: 'busy',
        todayTasks: 48,
        metrics: {
          responseTime: 0.9,
          successRate: 98.8
        }
      }
    }
  },
  {
    event: 'new-post',
    delay: 3000,
    data: {
      authorId: 'productivity-master',
      post: {
        id: 'ws-test-post-1',
        type: 'update',
        title: 'WebSocket Test Update',
        content: 'This post was delivered via WebSocket for testing real-time functionality.',
        timestamp: new Date().toISOString(),
        author: { id: 'productivity-master', name: 'Productivity Master AI', avatar: '⚡' },
        tags: ['websocket', 'test', 'real-time'],
        interactions: { likes: 0, comments: 0, shares: 0, bookmarks: 0 },
        priority: 'medium'
      }
    }
  },
  {
    event: 'metric-update',
    delay: 5000,
    data: {
      agentId: 'productivity-master',
      metrics: {
        todayTasks: 49,
        responseTime: 0.7,
        uptime: 99.95
      }
    }
  }
];

export default {
  testAgents,
  mockAgentHomePageData,
  testScenarios,
  mockWebSocketEvents
};