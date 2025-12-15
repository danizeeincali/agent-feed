/**
 * TDD Tests for App.tsx Refactor
 * Testing removal of WebSocket Debug Panel from main App component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Mock functions and setup for Jest
import App from '@/App';
import { WebSocketProvider } from '@/context/WebSocketSingletonContext';

// Mock all components to focus on structure
jest.mock('@/components/SocialMediaFeed', () => ({
  default: () => <div data-testid="social-media-feed">Social Media Feed</div>
}));

jest.mock('@/components/PerformanceMonitor', () => ({
  default: () => <div data-testid="performance-monitor">Performance Monitor</div>
}));

jest.mock('@/components/ErrorTesting', () => ({
  default: () => <div data-testid="error-testing">Error Testing</div>
}));

jest.mock('@/components/WebSocketDebugPanel', () => ({
  default: () => <div data-testid="websocket-debug-panel">WebSocket Debug Panel</div>
}));

// Mock other components
jest.mock('@/components/SimpleAgentManager', () => ({
  default: () => <div>Agent Manager</div>
}));

jest.mock('@/components/SimpleAnalytics', () => ({
  default: () => <div>Analytics</div>
}));

jest.mock('@/components/SimpleSettings', () => ({
  default: () => <div>Settings</div>
}));

jest.mock('@/components/RealTimeNotifications', () => ({
  RealTimeNotifications: () => <div>Notifications</div>
}));

jest.mock('@/components/ConnectionStatus', () => ({
  ConnectionStatus: () => <div>Connection Status</div>
}));

// Mock all other components that might be imported
const mockComponents = [
  'EnhancedAgentManagerWrapper',
  'BulletproofClaudeCodePanel',
  'AgentDashboard',
  'WorkflowVisualizationFixed',
  'BulletproofAgentProfile',
  'BulletproofActivityPanel',
  'DualInstanceDashboardEnhanced'
];

mockComponents.forEach(component => {
  jest.mock(`@/components/${component}`, () => ({
    default: () => <div>{component}</div>
  }));
});

describe('App.tsx Refactor Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
    
    // Mock environment variables
    process.env.DEV = 'false';
  });

  it('should not render WebSocket Debug Panel in main App component', () => {
    const { container } = render(<App />);

    // WebSocket Debug Panel should not be present in main app structure
    expect(container.querySelector('[data-testid="websocket-debug-panel"]')).toBeNull();
  });

  it('should have navigation link for Performance Monitor', () => {
    render(<App />);

    // Should have Performance Monitor in navigation
    expect(screen.getByText('Performance Monitor')).toBeInTheDocument();
  });

  it('should not have separate Error Testing navigation link', () => {
    render(<App />);

    // Error Testing should not be a separate navigation item
    // It should be integrated into Performance Monitor
    expect(screen.queryByText('Error Testing')).toBeNull();
  });

  it('should render Performance Monitor route correctly', () => {
    // Mock the current location to be /performance-monitor
    const mockLocation = {
      pathname: '/performance-monitor',
      search: '',
      hash: '',
      state: null,
      key: 'test'
    };

    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useLocation: () => mockLocation
    }));

    render(<App />);

    // Should render the performance monitor route
    expect(screen.getByTestId('performance-monitor')).toBeInTheDocument();
  });

  it('should not have DEV-only WebSocket debug panel in production mode', () => {
    // Ensure DEV is false
    process.env.DEV = 'false';
    
    const { container } = render(<App />);

    // Should not render debug panel in production
    expect(container.querySelector('[data-testid="websocket-debug-panel"]')).toBeNull();
  });

  it('should maintain WebSocket provider configuration', () => {
    render(<App />);

    // WebSocket provider should still be present
    // This is tested by ensuring the app renders without WebSocket-related errors
    expect(screen.getByText('AgentLink Feed System')).toBeInTheDocument();
  });

  it('should preserve all other navigation items', () => {
    render(<App />);

    const expectedNavItems = [
      'Feed',
      'Dual Instance',
      'Agents',
      'Workflows',
      'Live Activity',
      'Analytics',
      'Claude Code',
      'Performance Monitor',
      'Settings'
    ];

    expectedNavItems.forEach(item => {
      expect(screen.getByText(item)).toBeInTheDocument();
    });
  });

  it('should not have error testing as separate route', () => {
    const { container } = render(<App />);

    // Error testing should not be accessible as /error-testing route
    // It should be part of performance monitor
    const navigation = container.querySelector('nav');
    expect(navigation).not.toHaveTextContent('Error Testing');
  });

  it('should maintain error boundaries and suspense structure', () => {
    render(<App />);

    // Should still have proper error boundary structure
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('agent-feed')).toBeInTheDocument();
  });

  it('should consolidate debug tools into performance section only', () => {
    const { container } = render(<App />);

    // Debug panels should only be accessible through performance monitor
    const debugPanels = container.querySelectorAll('[data-testid*="debug"]');
    expect(debugPanels).toHaveLength(0); // No debug panels in main app
  });
});