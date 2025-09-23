/**
 * TDD London School: Mock-Driven Component Contract Validation
 *
 * This module provides mock implementations for all components
 * to isolate and identify import/dependency failures causing white screen
 */

import React from 'react';

// Mock component interface for contract validation
export interface ComponentMock {
  name: string;
  dependencies: string[];
  isImportable: boolean;
  hasValidContract: boolean;
  lastError?: Error;
}

// Component contract mocks - these should always work
export const MockComponents = {
  // Core Layout Components
  FallbackComponents: {
    LoadingFallback: jest.fn().mockImplementation(({ message, size = "md" }) => (
      React.createElement('div', {
        'data-testid': 'loading-fallback',
        className: `loading-fallback ${size}`
      }, message || 'Loading...')
    )),
    FeedFallback: jest.fn().mockImplementation(() => (
      React.createElement('div', {
        'data-testid': 'feed-fallback'
      }, 'Feed Loading...')
    )),
    AgentManagerFallback: jest.fn().mockImplementation(() => (
      React.createElement('div', {
        'data-testid': 'agent-manager-fallback'
      }, 'Agent Manager Loading...')
    )),
    DashboardFallback: jest.fn().mockImplementation(() => (
      React.createElement('div', {
        'data-testid': 'dashboard-fallback'
      }, 'Dashboard Loading...')
    )),
    NotFoundFallback: jest.fn().mockImplementation(() => (
      React.createElement('div', {
        'data-testid': 'not-found-fallback'
      }, '404 - Page Not Found')
    ))
  },

  // Error Boundary Mocks
  GlobalErrorBoundary: jest.fn().mockImplementation(({ children }) => children),
  RouteErrorBoundary: jest.fn().mockImplementation(({ children }) => children),
  AsyncErrorBoundary: jest.fn().mockImplementation(({ children }) => children),

  // Real-time Components
  RealTimeNotifications: jest.fn().mockImplementation(() => (
    React.createElement('div', {
      'data-testid': 'real-time-notifications'
    }, 'Notifications')
  )),

  // Context Providers
  VideoPlaybackProvider: jest.fn().mockImplementation(({ children }) => children),
  WebSocketProvider: jest.fn().mockImplementation(({ children }) => children),

  // Main Components
  SocialMediaFeed: jest.fn().mockImplementation(() => (
    React.createElement('div', {
      'data-testid': 'social-media-feed'
    }, 'Social Media Feed')
  )),

  SafeFeedWrapper: jest.fn().mockImplementation(({ children }) =>
    React.createElement('div', {
      'data-testid': 'safe-feed-wrapper'
    }, children)
  ),

  RealAgentManager: jest.fn().mockImplementation(() => (
    React.createElement('div', {
      'data-testid': 'real-agent-manager'
    }, 'Agent Manager')
  )),

  IsolatedRealAgentManager: jest.fn().mockImplementation(() => (
    React.createElement('div', {
      'data-testid': 'isolated-real-agent-manager'
    }, 'Isolated Agent Manager')
  )),

  ConnectionStatus: jest.fn().mockImplementation(() => (
    React.createElement('div', {
      'data-testid': 'connection-status'
    }, 'Connected')
  ))
};

// Contract validation functions
export const validateComponentContract = (componentName: string, component: any): ComponentMock => {
  try {
    // Check if component is a valid React component
    const isValidReactComponent = typeof component === 'function' ||
      (typeof component === 'object' && component !== null);

    return {
      name: componentName,
      dependencies: [], // Would be filled by static analysis
      isImportable: true,
      hasValidContract: isValidReactComponent,
    };
  } catch (error) {
    return {
      name: componentName,
      dependencies: [],
      isImportable: false,
      hasValidContract: false,
      lastError: error as Error,
    };
  }
};

// Mock factory for creating isolated component tests
export const createComponentMock = (name: string, mockImplementation?: any) => {
  const defaultMock = () => React.createElement('div', {
    'data-testid': `mock-${name.toLowerCase().replace(/([A-Z])/g, '-$1').slice(1)}`
  }, `Mock ${name}`);

  return jest.fn().mockImplementation(mockImplementation || defaultMock);
};

// Component dependency graph for isolation testing
export const ComponentDependencies = {
  'App': [
    'Router', 'QueryClientProvider', 'VideoPlaybackProvider',
    'WebSocketProvider', 'Layout', 'Routes'
  ],
  'Layout': [
    'useState', 'memo', 'useLocation', 'Link', 'ConnectionStatus'
  ],
  'SocialMediaFeed': [
    'RealSocialMediaFeed' // potential import failure point
  ],
  'RealAgentManager': [
    // Dependencies would be analyzed from actual component
  ]
};

export default MockComponents;