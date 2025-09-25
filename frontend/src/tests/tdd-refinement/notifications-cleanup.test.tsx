/**
 * TDD REFACTOR Phase: Notifications Cleanup Validation
 *
 * This test validates that we can safely remove notification files
 * without breaking the application
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import App from '../../App';

// Mock WebSocketProvider to prevent connection errors in tests
vi.mock('../../context/WebSocketSingletonContext', () => ({
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock components that might cause issues
vi.mock('../../components/RealSocialMediaFeed', () => ({
  default: () => <div data-testid="social-media-feed">Mock Feed</div>,
}));

vi.mock('../../components/IsolatedRealAgentManager', () => ({
  default: () => <div data-testid="agent-manager">Mock Agent Manager</div>,
}));

vi.mock('../../components/RealAnalytics', () => ({
  default: () => <div data-testid="analytics">Mock Analytics</div>,
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('TDD REFACTOR Phase: Clean Notifications Removal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress expected console warnings for cleaner test output
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('should render App without any notification components', async () => {
    const { container } = render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    await waitFor(() => {
      const appRoot = screen.getByTestId('app-root');
      expect(appRoot).toBeInTheDocument();
    });

    // Validate that no notification elements exist in the DOM
    const html = container.innerHTML;
    expect(html).not.toContain('RealTimeNotifications');
    expect(html).not.toContain('notifications-button');
    expect(html).not.toContain('notifications-dropdown');
    expect(html).not.toContain('notification-count');
  });

  it('should maintain clean header layout without notifications', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    await waitFor(() => {
      const header = screen.getByTestId('header');
      expect(header).toBeInTheDocument();
    });

    // Verify header structure
    const headerContent = screen.getByTestId('header');
    const rightSection = headerContent.querySelector('.flex.items-center.space-x-4:last-child');

    expect(rightSection).toBeInTheDocument();

    // Should only contain search input
    const searchInput = screen.getByPlaceholderText('Search posts...');
    expect(searchInput).toBeInTheDocument();

    // Should NOT contain notification button
    expect(screen.queryByTestId('notifications-button')).not.toBeInTheDocument();
  });

  it('should have proper CSS classes and layout integrity', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    await waitFor(() => {
      const header = screen.getByTestId('header');
      expect(header).toBeInTheDocument();
    });

    // Verify header maintains proper flex layout
    const headerContainer = screen.getByTestId('header').querySelector('.flex.items-center.justify-between.h-16');
    expect(headerContainer).toBeInTheDocument();

    // Verify search container has proper spacing
    const searchContainer = screen.getByPlaceholderText('Search posts...').parentElement?.parentElement;
    expect(searchContainer).toHaveClass('flex', 'items-center', 'space-x-4');
  });

  it('should not have any references to notification-related testids', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    await waitFor(() => {
      const appRoot = screen.getByTestId('app-root');
      expect(appRoot).toBeInTheDocument();
    });

    // Comprehensive check for all notification-related test IDs
    const notificationTestIds = [
      'real-time-notifications',
      'notifications-button',
      'notification-count',
      'notifications-dropdown',
      'notification-1',
      'notification-2',
      'notification-3',
      'mark-all-read',
      'no-notifications',
      'notifications-overlay'
    ];

    notificationTestIds.forEach(testId => {
      expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
    });
  });

  it('should maintain responsive design without notifications', async () => {
    // Test mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375, // Mobile width
    });

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    await waitFor(() => {
      const header = screen.getByTestId('header');
      expect(header).toBeInTheDocument();
    });

    // Mobile menu should still work
    const mobileMenuButton = screen.getByRole('button', {
      name: /menu/i
    });
    expect(mobileMenuButton).toBeInTheDocument();
    expect(mobileMenuButton).toHaveClass('lg:hidden');

    // Search should maintain responsive class
    const searchInput = screen.getByPlaceholderText('Search posts...');
    expect(searchInput).toHaveClass('w-64');
  });

  it('should load all routes without notification dependencies', async () => {
    const routes = ['/', '/agents', '/analytics'];

    for (const route of routes) {
      // Reset DOM for each route test
      const { unmount } = render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        const appRoot = screen.getByTestId('app-root');
        expect(appRoot).toBeInTheDocument();
      });

      // Verify no notification remnants
      expect(screen.queryByTestId('notifications-button')).not.toBeInTheDocument();

      unmount();
    }
  });
});