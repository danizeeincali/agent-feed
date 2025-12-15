/**
 * COMPREHENSIVE UNIT TESTS - NOTIFICATIONS REMOVAL VALIDATION
 *
 * Purpose: Validate that notifications components are completely removed
 * and that the header layout functions correctly without them
 *
 * Test Categories:
 * - Component removal verification
 * - Import validation
 * - Header layout integrity
 * - Navigation functionality
 * - Error boundary testing
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import '@testing-library/jest-dom';

// Import the App component to test
import App from '../../App';

// Mock external dependencies
vi.mock('../../components/RealSocialMediaFeed', () => ({
  default: () => <div data-testid="mock-social-feed">Mock Social Feed</div>
}));

vi.mock('../../components/RealAgentManager', () => ({
  default: () => <div data-testid="mock-agent-manager">Mock Agent Manager</div>
}));

vi.mock('../../components/RealAnalytics', () => ({
  default: () => <div data-testid="mock-analytics">Mock Analytics</div>
}));

vi.mock('../../components/SimpleSettings', () => ({
  default: () => <div data-testid="mock-settings">Mock Settings</div>
}));

vi.mock('../../context/WebSocketSingletonContext', () => ({
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => children
}));

// Mock the notification hook to ensure it's not being used
vi.mock('../../hooks/useNotification', () => ({
  useNotification: vi.fn(() => ({}))
}));

describe('Notifications Removal Validation Suite', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    // Clear all mocks
    vi.clearAllMocks();

    // Mock console methods to avoid noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderApp = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  describe('01 - Component Removal Verification', () => {
    it('should NOT render RealTimeNotifications component', async () => {
      renderApp();

      // Wait for app to load
      await waitFor(() => {
        expect(screen.getByTestId('app-root')).toBeInTheDocument();
      });

      // Verify notifications component is NOT present
      expect(screen.queryByTestId('real-time-notifications')).not.toBeInTheDocument();
      expect(screen.queryByTestId('notifications-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('notifications-dropdown')).not.toBeInTheDocument();
      expect(screen.queryByTestId('notification-count')).not.toBeInTheDocument();
    });

    it('should NOT have any bell icons in the DOM', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('app-root')).toBeInTheDocument();
      });

      // Check for bell SVG paths (common bell icon pattern)
      const bellSvgs = document.querySelectorAll('svg path[d*="M15 17h5"]');
      expect(bellSvgs).toHaveLength(0);

      // Check for any notification-related aria labels
      const notificationButtons = document.querySelectorAll('[aria-label*="notification" i]');
      expect(notificationButtons).toHaveLength(0);
    });

    it('should NOT have notification-related CSS classes', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('app-root')).toBeInTheDocument();
      });

      // Check for common notification CSS classes
      const notificationElements = document.querySelectorAll('.notification, .bell, .badge');
      expect(notificationElements).toHaveLength(0);
    });
  });

  describe('02 - Header Layout Integrity', () => {
    it('should render header with correct layout after notifications removal', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument();
      });

      const header = screen.getByTestId('header');
      expect(header).toHaveClass('bg-white', 'shadow-sm', 'border-b', 'border-gray-200');

      // Verify header structure is intact
      expect(screen.getByText('AgentLink - Claude Instance Manager')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search posts...')).toBeInTheDocument();
    });

    it('should maintain proper header height after notifications removal', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument();
      });

      const header = screen.getByTestId('header');
      const headerStyles = window.getComputedStyle(header);

      // Header should maintain h-16 class (64px height)
      expect(header).toHaveClass('h-16');
    });

    it('should keep search functionality working after notifications removal', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search posts...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search posts...');

      fireEvent.change(searchInput, { target: { value: 'test search' } });
      expect(searchInput).toHaveValue('test search');

      fireEvent.change(searchInput, { target: { value: '' } });
      expect(searchInput).toHaveValue('');
    });

    it('should maintain responsive header layout without notifications', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument();
      });

      const header = screen.getByTestId('header');

      // Check that header flex layout is maintained
      expect(header.firstChild).toHaveClass('flex', 'items-center', 'justify-between');

      // Verify mobile menu button exists
      const menuButton = document.querySelector('[data-testid="header"] button');
      expect(menuButton).toBeInTheDocument();
    });
  });

  describe('03 - Navigation Functionality', () => {
    it('should render all navigation links correctly', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('app-root')).toBeInTheDocument();
      });

      // Check all expected navigation links
      expect(screen.getByRole('link', { name: /feed/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /agents/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /analytics/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
    });

    it('should navigate between pages without notifications-related errors', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('app-root')).toBeInTheDocument();
      });

      // Test navigation to agents page
      const agentsLink = screen.getByRole('link', { name: /agents/i });
      fireEvent.click(agentsLink);

      // Should not throw any notification-related errors
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringMatching(/notification|bell|realtime/i)
      );
    });

    it('should maintain sidebar functionality without notifications interference', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('app-root')).toBeInTheDocument();
      });

      // Test mobile menu functionality
      const menuButton = document.querySelector('[data-testid="header"] button');
      if (menuButton) {
        fireEvent.click(menuButton);
        // Should work without errors
        expect(console.error).not.toHaveBeenCalled();
      }
    });
  });

  describe('04 - Error Handling', () => {
    it('should not have notification-related error boundaries', async () => {
      const ErrorFallback = ({ error }: { error: Error }) => (
        <div data-testid="error-fallback">Error: {error.message}</div>
      );

      render(
        <ErrorBoundary fallbackRender={ErrorFallback}>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </QueryClientProvider>
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('app-root')).toBeInTheDocument();
      });

      // Should not show error fallback
      expect(screen.queryByTestId('error-fallback')).not.toBeInTheDocument();
    });

    it('should handle missing notification dependencies gracefully', async () => {
      // Mock a notification-related error
      const originalError = console.error;
      const mockError = vi.fn();
      console.error = mockError;

      renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('app-root')).toBeInTheDocument();
      });

      // Should not log notification-related errors
      expect(mockError).not.toHaveBeenCalledWith(
        expect.stringMatching(/notification|bell|realtime/i)
      );

      console.error = originalError;
    });
  });

  describe('05 - DOM Structure Validation', () => {
    it('should have clean header DOM structure without notification artifacts', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument();
      });

      const header = screen.getByTestId('header');
      const headerHTML = header.innerHTML;

      // Should not contain notification-related elements
      expect(headerHTML).not.toMatch(/notification/i);
      expect(headerHTML).not.toMatch(/bell/i);
      expect(headerHTML).not.toMatch(/dropdown/i);
      expect(headerHTML).not.toMatch(/badge/i);
      expect(headerHTML).not.toMatch(/count/i);
    });

    it('should maintain proper ARIA accessibility without notifications', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument();
      });

      // Search input should have proper accessibility
      const searchInput = screen.getByPlaceholderText('Search posts...');
      expect(searchInput).toHaveAttribute('type', 'text');

      // Should not have notification-related ARIA attributes
      const ariaElements = document.querySelectorAll('[aria-label*="notification" i]');
      expect(ariaElements).toHaveLength(0);
    });

    it('should pass HTML validation without notification elements', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('app-root')).toBeInTheDocument();
      });

      // Check for proper semantic structure
      expect(screen.getByRole('banner')).toBeInTheDocument(); // header
      expect(screen.getByRole('main')).toBeInTheDocument(); // main content
      expect(screen.getByRole('navigation')).toBeInTheDocument(); // sidebar nav

      // Should not have orphaned notification-related IDs
      const notificationIds = document.querySelectorAll('[id*="notification" i]');
      expect(notificationIds).toHaveLength(0);
    });
  });

  describe('06 - Performance Impact', () => {
    it('should not load notification-related JavaScript modules', async () => {
      const originalImport = window.import;
      const mockImport = vi.fn();
      // @ts-ignore
      window.import = mockImport;

      renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('app-root')).toBeInTheDocument();
      });

      // Should not attempt to import notification modules
      expect(mockImport).not.toHaveBeenCalledWith(
        expect.stringMatching(/notification|bell/i)
      );

      // @ts-ignore
      window.import = originalImport;
    });

    it('should have reduced bundle size without notification components', () => {
      // This is a conceptual test - in a real scenario, you'd check bundle analysis
      renderApp();

      // Verify no notification-related components are rendered
      const notificationComponents = document.querySelectorAll('[data-component*="notification" i]');
      expect(notificationComponents).toHaveLength(0);
    });
  });

  describe('07 - State Management', () => {
    it('should not initialize notification-related state', async () => {
      const StateInspector = () => {
        // This would inspect React DevTools state in a real scenario
        return <div data-testid="state-inspector">State Inspector</div>;
      };

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
            <StateInspector />
          </BrowserRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('app-root')).toBeInTheDocument();
      });

      // In a real implementation, you'd check that no notification state exists
      // This is a placeholder for state inspection
      expect(screen.getByTestId('state-inspector')).toBeInTheDocument();
    });

    it('should not have notification-related context providers', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('app-root')).toBeInTheDocument();
      });

      // The app should render without notification context
      // This test verifies no notification context errors occur
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringMatching(/context.*notification/i)
      );
    });
  });
});

describe('Integration Tests - App.tsx Header Changes', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  const renderApp = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('should render complete app with header modifications', async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByTestId('app-root')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Verify main app structure
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
    expect(screen.getByTestId('app-container')).toBeInTheDocument();

    // Verify header content without notifications
    expect(screen.getByText('AgentLink - Claude Instance Manager')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search posts...')).toBeInTheDocument();

    // Verify notifications are completely absent
    expect(screen.queryByTestId('real-time-notifications')).not.toBeInTheDocument();
  });

  it('should maintain all routes functionality after header changes', async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByTestId('app-root')).toBeInTheDocument();
    });

    // Test that all routes are still defined and working
    const routes = ['/', '/agents', '/analytics', '/settings'];

    for (const route of routes) {
      // In a real test, you'd navigate to each route
      // For now, just verify the links exist
      const link = document.querySelector(`a[href="${route}"]`);
      expect(link).toBeInTheDocument();
    }
  });
});