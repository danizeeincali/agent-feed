/**
 * TDD London School: Comprehensive Test Specifications
 * 
 * Defines test contracts and behavior expectations for all UI components
 * following London School mockist approach with real data integration.
 */

export interface ComponentTestSpec {
  componentName: string;
  behaviors: BehaviorSpec[];
  collaborators: string[];
  realDataRequirements: string[];
  userFlows: UserFlowSpec[];
}

export interface BehaviorSpec {
  description: string;
  given: string;
  when: string;
  then: string;
  mockExpectations: MockExpectation[];
}

export interface MockExpectation {
  collaborator: string;
  method: string;
  expectedCalls: number;
  expectedArgs?: any[];
  returnValue?: any;
}

export interface UserFlowSpec {
  name: string;
  steps: FlowStep[];
  expectedOutcome: string;
  realDataValidation: boolean;
}

export interface FlowStep {
  action: string;
  target: string;
  expectedResult: string;
}

// App-level component specifications
export const APP_COMPONENT_SPECS: ComponentTestSpec[] = [
  {
    componentName: 'App',
    behaviors: [
      {
        description: 'Should render layout with navigation',
        given: 'App component is mounted',
        when: 'component renders',
        then: 'layout with sidebar and main content should be visible',
        mockExpectations: [
          {
            collaborator: 'QueryClient',
            method: 'mount',
            expectedCalls: 1
          },
          {
            collaborator: 'WebSocketProvider',
            method: 'connect',
            expectedCalls: 1
          }
        ]
      },
      {
        description: 'Should handle route navigation',
        given: 'App is rendered with router',
        when: 'user navigates to different routes',
        then: 'appropriate components should be rendered with error boundaries',
        mockExpectations: [
          {
            collaborator: 'Router',
            method: 'navigate',
            expectedCalls: 1
          }
        ]
      }
    ],
    collaborators: ['QueryClient', 'WebSocketProvider', 'ErrorBoundary', 'Router'],
    realDataRequirements: ['Navigation state', 'WebSocket connection status'],
    userFlows: [
      {
        name: 'Complete navigation flow',
        steps: [
          { action: 'click', target: '[data-testid="sidebar-agents"]', expectedResult: 'navigates to agents page' },
          { action: 'click', target: '[data-testid="sidebar-feed"]', expectedResult: 'navigates to feed page' },
          { action: 'click', target: '[data-testid="sidebar-analytics"]', expectedResult: 'navigates to analytics page' }
        ],
        expectedOutcome: 'All navigation works without white screens',
        realDataValidation: true
      }
    ]
  },
  {
    componentName: 'FallbackComponents',
    behaviors: [
      {
        description: 'Should render loading states correctly',
        given: 'component is in loading state',
        when: 'Suspense boundary triggers fallback',
        then: 'appropriate loading UI should be displayed',
        mockExpectations: [
          {
            collaborator: 'Suspense',
            method: 'fallback',
            expectedCalls: 1
          }
        ]
      }
    ],
    collaborators: ['Suspense', 'ErrorBoundary'],
    realDataRequirements: ['Loading states', 'Error states'],
    userFlows: [
      {
        name: 'Loading state verification',
        steps: [
          { action: 'trigger', target: 'component-loading', expectedResult: 'shows loading spinner' },
          { action: 'wait', target: 'component-load', expectedResult: 'shows actual component' }
        ],
        expectedOutcome: 'Smooth loading transitions without flicker',
        realDataValidation: true
      }
    ]
  },
  {
    componentName: 'RealTimeNotifications',
    behaviors: [
      {
        description: 'Should display notification count',
        given: 'component has unread notifications',
        when: 'component renders',
        then: 'notification badge should show correct count',
        mockExpectations: [
          {
            collaborator: 'NotificationService',
            method: 'getUnreadCount',
            expectedCalls: 1,
            returnValue: 3
          }
        ]
      },
      {
        description: 'Should handle notification interactions',
        given: 'notifications dropdown is open',
        when: 'user clicks mark as read',
        then: 'notification should be marked as read',
        mockExpectations: [
          {
            collaborator: 'NotificationService',
            method: 'markAsRead',
            expectedCalls: 1
          }
        ]
      }
    ],
    collaborators: ['NotificationService', 'WebSocket'],
    realDataRequirements: ['Notification data', 'Real-time updates'],
    userFlows: [
      {
        name: 'Notification management flow',
        steps: [
          { action: 'click', target: '[data-testid="notifications-button"]', expectedResult: 'dropdown opens' },
          { action: 'click', target: '[data-testid="notification-1"]', expectedResult: 'notification marked as read' },
          { action: 'click', target: '[data-testid="mark-all-read"]', expectedResult: 'all notifications marked as read' }
        ],
        expectedOutcome: 'Notification count updates correctly',
        realDataValidation: true
      }
    ]
  }
];

// API endpoint specifications
export const API_ENDPOINT_SPECS = [
  {
    endpoint: '/health',
    method: 'GET',
    expectedResponse: {
      status: 'healthy',
      timestamp: expect.any(String),
      uptime: expect.any(Number)
    },
    realDataValidation: true
  },
  {
    endpoint: '/api/health',
    method: 'GET',
    expectedResponse: {
      status: 'healthy',
      database: 'connected',
      timestamp: expect.any(String),
      uptime: expect.any(Number)
    },
    realDataValidation: true
  },
  {
    endpoint: '/api/feed',
    method: 'GET',
    expectedResponse: {
      posts: expect.any(Array),
      totalCount: expect.any(Number),
      lastUpdated: expect.any(String)
    },
    realDataValidation: true
  }
];

// WebSocket specifications
export const WEBSOCKET_SPECS = [
  {
    event: 'connection',
    expectedBehavior: 'Client should connect and receive connection acknowledgment',
    realDataValidation: true
  },
  {
    event: 'notification',
    expectedBehavior: 'Client should receive real-time notifications',
    realDataValidation: true
  },
  {
    event: 'disconnect',
    expectedBehavior: 'Client should handle disconnection gracefully',
    realDataValidation: true
  }
];

// Integration workflow specifications
export const INTEGRATION_WORKFLOW_SPECS = [
  {
    name: 'Complete user journey',
    description: 'User navigates through all main features',
    steps: [
      'Load application',
      'Navigate to feed',
      'Create a post',
      'View agents',
      'Check analytics',
      'Use Claude Code interface'
    ],
    expectedOutcome: 'All features work without errors',
    realDataValidation: true
  },
  {
    name: 'Error recovery workflow',
    description: 'Application handles errors gracefully',
    steps: [
      'Trigger component error',
      'Verify error boundary catches error',
      'Click retry button',
      'Verify component recovers'
    ],
    expectedOutcome: 'Error boundaries provide graceful recovery',
    realDataValidation: true
  }
];

export default {
  APP_COMPONENT_SPECS,
  API_ENDPOINT_SPECS,
  WEBSOCKET_SPECS,
  INTEGRATION_WORKFLOW_SPECS
};