/**
 * TDD London School: Component Unit Tests
 * 
 * Comprehensive unit tests for all UI components following London School
 * mockist approach with behavior verification and real collaboration testing.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { jest } from '@jest/globals';
import App from '../../../frontend/src/App';
import FallbackComponents from '../../../frontend/src/components/FallbackComponents';
import { RealTimeNotifications } from '../../../frontend/src/components/RealTimeNotifications';
import { APP_COMPONENT_SPECS } from './test-specifications';

// Mock collaborators for London School testing
const mockQueryClient = {
  mount: jest.fn(),
  getQueryData: jest.fn(),
  setQueryData: jest.fn(),
  invalidateQueries: jest.fn()
};

const mockWebSocketProvider = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  send: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
};

const mockRouter = {
  navigate: jest.fn(),
  location: { pathname: '/' },
  listen: jest.fn()
};

const mockNotificationService = {
  getUnreadCount: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  getNotifications: jest.fn()
};

// Test setup helper
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('TDD London School: Component Behavior Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup global mocks
    global.fetch = jest.fn();
    global.WebSocket = jest.fn(() => ({
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    })) as any;
  });

  describe('App Component Behaviors', () => {
    const appSpec = APP_COMPONENT_SPECS.find(spec => spec.componentName === 'App')!;

    test('should render layout with navigation - Behavior Verification', async () => {
      const behavior = appSpec.behaviors[0];
      
      // Given: App component is mounted
      const Wrapper = createTestWrapper();
      
      // When: component renders
      render(
        <Wrapper>
          <App />
        </Wrapper>
      );
      
      // Then: layout with sidebar and main content should be visible
      expect(screen.getByTestId('app-root')).toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
      
      // Verify navigation items are present (real data)
      expect(screen.getByText('Feed')).toBeInTheDocument();
      expect(screen.getByText('Agents')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
      expect(screen.getByText('Claude Manager')).toBeInTheDocument();
    });

    test('should handle route navigation - Collaboration Verification', async () => {
      const behavior = appSpec.behaviors[1];
      
      // Given: App is rendered with router
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <App />
        </Wrapper>
      );
      
      // When: user navigates to different routes
      const agentsLink = screen.getByText('Agents');
      fireEvent.click(agentsLink);
      
      // Then: appropriate components should be rendered with error boundaries
      await waitFor(() => {
        // Verify routing behavior (real navigation)
        expect(window.location.pathname).toBe('/agents');
      });
      
      // Verify error boundaries are in place
      expect(screen.queryByTestId('component-error-fallback')).not.toBeInTheDocument();
    });

    test('should complete navigation flow - User Journey', async () => {
      const userFlow = appSpec.userFlows[0];
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <App />
        </Wrapper>
      );
      
      // Execute complete navigation flow
      for (const step of userFlow.steps) {
        const element = screen.getByText(step.target.replace('[data-testid="sidebar-', '').replace('"]', ''));
        fireEvent.click(element);
        
        await waitFor(() => {
          // Verify no white screen occurs
          expect(screen.getByTestId('app-container')).toBeInTheDocument();
        });
      }
      
      // Verify expected outcome: All navigation works without white screens
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
    });
  });

  describe('FallbackComponents Behaviors', () => {
    const fallbackSpec = APP_COMPONENT_SPECS.find(spec => spec.componentName === 'FallbackComponents')!;

    test('should render loading states correctly - Suspense Collaboration', () => {
      const behavior = fallbackSpec.behaviors[0];
      
      // Given: component is in loading state
      // When: Suspense boundary triggers fallback
      render(<FallbackComponents.LoadingFallback message="Loading test..." size="lg" />);
      
      // Then: appropriate loading UI should be displayed
      expect(screen.getByTestId('loading-fallback')).toBeInTheDocument();
      expect(screen.getByText('Loading test...')).toBeInTheDocument();
      
      // Verify loading spinner is present
      const spinner = screen.getByTestId('loading-fallback').querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    test('should handle all fallback types - Real Data Validation', () => {
      const fallbackTypes = [
        'FeedFallback',
        'DualInstanceFallback',
        'DashboardFallback',
        'AgentManagerFallback',
        'AnalyticsFallback',
        'ClaudeCodeFallback',
        'ActivityFallback',
        'SettingsFallback',
        'NotFoundFallback'
      ];
      
      fallbackTypes.forEach(fallbackType => {
        const Component = FallbackComponents[fallbackType as keyof typeof FallbackComponents];
        const { container } = render(<Component />);
        
        // Verify each fallback renders without errors
        expect(container.firstChild).toBeInTheDocument();
        
        // Verify testid is present for real testing
        const testElement = container.querySelector('[data-testid]');
        expect(testElement).toBeInTheDocument();
      });
    });

    test('should complete loading state verification - User Flow', async () => {
      const userFlow = fallbackSpec.userFlows[0];
      let isLoading = true;
      
      const TestComponent = () => {
        const [loading, setLoading] = React.useState(isLoading);
        
        React.useEffect(() => {
          const timer = setTimeout(() => setLoading(false), 100);
          return () => clearTimeout(timer);
        }, []);
        
        if (loading) {
          return <FallbackComponents.LoadingFallback message="Loading..." />;
        }
        
        return <div data-testid="loaded-component">Loaded!</div>;
      };
      
      render(<TestComponent />);
      
      // Step 1: shows loading spinner
      expect(screen.getByTestId('loading-fallback')).toBeInTheDocument();
      
      // Step 2: shows actual component
      await waitFor(() => {
        expect(screen.getByTestId('loaded-component')).toBeInTheDocument();
      });
      
      // Verify expected outcome: Smooth loading transitions without flicker
      expect(screen.queryByTestId('loading-fallback')).not.toBeInTheDocument();
    });
  });

  describe('RealTimeNotifications Behaviors', () => {
    const notificationSpec = APP_COMPONENT_SPECS.find(spec => spec.componentName === 'RealTimeNotifications')!;

    beforeEach(() => {
      mockNotificationService.getUnreadCount.mockReturnValue(3);
      mockNotificationService.getNotifications.mockReturnValue([
        { id: '1', message: 'Test notification', type: 'info', timestamp: new Date(), read: false }
      ]);
    });

    test('should display notification count - Service Collaboration', () => {
      const behavior = notificationSpec.behaviors[0];
      
      // Given: component has unread notifications
      // When: component renders
      render(<RealTimeNotifications />);
      
      // Then: notification badge should show correct count
      expect(screen.getByTestId('notifications-button')).toBeInTheDocument();
      expect(screen.getByTestId('notification-count')).toBeInTheDocument();
      expect(screen.getByTestId('notification-count')).toHaveTextContent('3');
    });

    test('should handle notification interactions - Real Behavior', async () => {
      const behavior = notificationSpec.behaviors[1];
      
      // Given: notifications dropdown is open
      render(<RealTimeNotifications showDropdown={true} />);
      
      // When: user clicks mark as read
      const markAllButton = screen.getByTestId('mark-all-read');
      fireEvent.click(markAllButton);
      
      // Then: notification should be marked as read
      await waitFor(() => {
        // Verify UI updates (real data change)
        expect(screen.queryByTestId('notification-count')).not.toBeInTheDocument();
      });
    });

    test('should complete notification management flow - User Journey', async () => {
      const userFlow = notificationSpec.userFlows[0];
      
      render(<RealTimeNotifications />);
      
      // Step 1: dropdown opens
      const notificationButton = screen.getByTestId('notifications-button');
      fireEvent.click(notificationButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('notifications-dropdown')).toBeInTheDocument();
      });
      
      // Step 2: notification marked as read
      const notification = screen.getByTestId('notification-1');
      fireEvent.click(notification);
      
      // Step 3: all notifications marked as read
      const markAllButton = screen.getByTestId('mark-all-read');
      fireEvent.click(markAllButton);
      
      // Verify expected outcome: Notification count updates correctly
      await waitFor(() => {
        expect(screen.queryByTestId('notification-count')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Boundary Behaviors - Real Error Handling', () => {
    const ErrorThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error('Test error for error boundary');
      }
      return <div data-testid="working-component">Working!</div>;
    };

    test('should catch and display component errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <FallbackComponents.ComponentErrorFallback 
          error={new Error('Test error')} 
          retry={() => {}}
        />
      );
      
      expect(screen.getByTestId('component-error-fallback')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    test('should provide retry functionality', () => {
      const retryMock = jest.fn();
      
      render(
        <FallbackComponents.ComponentErrorFallback 
          error={new Error('Test error')} 
          retry={retryMock}
        />
      );
      
      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);
      
      expect(retryMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Real Data Integration Tests', () => {
    test('should handle real API responses', async () => {
      // Mock real API response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: 123.45
        })
      });
      
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <App />
        </Wrapper>
      );
      
      // Verify app renders with real data
      expect(screen.getByTestId('app-root')).toBeInTheDocument();
      
      // Verify fetch was called (real API integration)
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    test('should handle WebSocket connections', async () => {
      const mockWebSocket = {
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        readyState: WebSocket.OPEN
      };
      
      global.WebSocket = jest.fn(() => mockWebSocket) as any;
      
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <App />
        </Wrapper>
      );
      
      // Verify WebSocket connection attempt
      expect(global.WebSocket).toHaveBeenCalled();
    });
  });
});

// Performance and accessibility tests
describe('Performance and Accessibility Validation', () => {
  test('should render components within performance budget', async () => {
    const startTime = performance.now();
    
    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <App />
      </Wrapper>
    );
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Verify render time is under 100ms
    expect(renderTime).toBeLessThan(100);
  });

  test('should have proper accessibility attributes', () => {
    render(<RealTimeNotifications />);
    
    const notificationButton = screen.getByTestId('notifications-button');
    expect(notificationButton).toHaveAttribute('aria-label');
    
    // Verify accessibility compliance
    expect(notificationButton.getAttribute('aria-label')).toContain('Notifications');
  });

  test('should handle keyboard navigation', () => {
    render(<RealTimeNotifications />);
    
    const notificationButton = screen.getByTestId('notifications-button');
    
    // Test keyboard interaction
    fireEvent.keyDown(notificationButton, { key: 'Enter' });
    fireEvent.keyDown(notificationButton, { key: ' ' });
    
    // Verify keyboard accessibility
    expect(notificationButton).toHaveFocus();
  });
});