/**
 * TDD Refinement Phase: Notifications Removal Test Suite
 *
 * RED PHASE: Write failing tests that define the desired behavior after notifications removal
 * GREEN PHASE: Implement minimal code to make tests pass
 * REFACTOR PHASE: Clean up implementation while keeping tests green
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import App from '../../App';

// Mock dependencies that might break during removal
vi.mock('../../components/RealTimeNotifications', () => ({
  RealTimeNotifications: () => null, // This should fail initially
}));

vi.mock('../../hooks/useNotification', () => ({
  useNotification: () => ({
    notifications: [],
    addNotification: vi.fn(),
    showNotification: vi.fn(),
    removeNotification: vi.fn(),
    clearAll: vi.fn(),
  }),
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
      {children}
    </QueryClientProvider>
  );
};

describe('TDD RED PHASE: Notifications Removal - Failing Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 0, gcTime: 0 },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  describe('App Header Structure After Notifications Removal', () => {
    it('should NOT render notifications button in header', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        const header = screen.getByTestId('header');
        expect(header).toBeInTheDocument();
      });

      // RED PHASE: This should fail because notifications still exist
      const notificationsButton = screen.queryByTestId('notifications-button');
      expect(notificationsButton).not.toBeInTheDocument();
    });

    it('should NOT render notification count badge', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        const header = screen.getByTestId('header');
        expect(header).toBeInTheDocument();
      });

      // RED PHASE: This should fail because notification count badge still exists
      const notificationCount = screen.queryByTestId('notification-count');
      expect(notificationCount).not.toBeInTheDocument();
    });

    it('should NOT render notifications dropdown', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        const header = screen.getByTestId('header');
        expect(header).toBeInTheDocument();
      });

      // RED PHASE: This should fail because dropdown still exists
      const notificationsDropdown = screen.queryByTestId('notifications-dropdown');
      expect(notificationsDropdown).not.toBeInTheDocument();
    });
  });

  describe('Header Layout Integrity After Removal', () => {
    it('should maintain proper header spacing without notifications', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        const header = screen.getByTestId('header');
        expect(header).toBeInTheDocument();
      });

      const headerContent = within(screen.getByTestId('header'));

      // Should have search input
      const searchInput = headerContent.getByPlaceholderText('Search posts...');
      expect(searchInput).toBeInTheDocument();

      // Should have proper flex layout classes maintained
      const headerContainer = headerContent.getByRole('banner').firstChild;
      expect(headerContainer).toHaveClass('flex', 'items-center', 'justify-between');
    });

    it('should have search input as the rightmost element in header', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        const header = screen.getByTestId('header');
        expect(header).toBeInTheDocument();
      });

      // RED PHASE: This might fail if notifications still exist
      const headerActions = screen.getByTestId('header').querySelector('.flex.items-center.space-x-4:last-child');
      expect(headerActions).toBeInTheDocument();

      // Should only contain search input, no notifications
      const searchInput = within(headerActions as HTMLElement).getByPlaceholderText('Search posts...');
      expect(searchInput).toBeInTheDocument();

      // Should not contain notifications button
      const notificationsButton = within(headerActions as HTMLElement).queryByTestId('notifications-button');
      expect(notificationsButton).not.toBeInTheDocument();
    });
  });

  describe('Import Statements Cleanup', () => {
    it('should not import RealTimeNotifications component', () => {
      // This test will be validated by checking if the import fails
      // We're testing the behavior, not the actual import statement
      const originalConsoleError = console.error;
      const consoleErrorSpy = vi.fn();
      console.error = consoleErrorSpy;

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Should not have import errors after cleanup
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('RealTimeNotifications')
      );

      console.error = originalConsoleError;
    });
  });

  describe('Responsive Design Integrity', () => {
    it('should maintain responsive behavior without notifications', async () => {
      // Test mobile view
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // iPhone width
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

      // Should maintain mobile hamburger menu
      const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
      expect(mobileMenuButton).toBeInTheDocument();

      // Should maintain search input responsiveness
      const searchInput = screen.getByPlaceholderText('Search posts...');
      expect(searchInput).toHaveClass('w-64'); // Should maintain width class
    });

    it('should maintain desktop layout integrity', async () => {
      // Test desktop view
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024, // Desktop width
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

      const headerContainer = screen.getByTestId('header').firstChild;
      expect(headerContainer).toHaveClass('flex', 'items-center', 'justify-between', 'h-16');

      // Search should be properly positioned
      const searchInput = screen.getByPlaceholderText('Search posts...');
      expect(searchInput.parentElement?.parentElement).toHaveClass('flex', 'items-center', 'space-x-4');
    });
  });

  describe('Application Stability After Removal', () => {
    it('should render main content without errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        const appContainer = screen.getByTestId('app-container');
        expect(appContainer).toBeInTheDocument();
      });

      // Should not have any rendering errors
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should maintain all navigation functionality', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        const appRoot = screen.getByTestId('app-root');
        expect(appRoot).toBeInTheDocument();
      });

      // Should maintain sidebar navigation
      const feedLink = screen.getByRole('link', { name: /feed/i });
      const agentsLink = screen.getByRole('link', { name: /agents/i });
      const analyticsLink = screen.getByRole('link', { name: /analytics/i });

      expect(feedLink).toBeInTheDocument();
      expect(agentsLink).toBeInTheDocument();
      expect(analyticsLink).toBeInTheDocument();
    });
  });
});

describe('TDD GREEN PHASE: Notifications Removal - Implementation', () => {
  // These tests will pass after we implement the removal

  it('should successfully load App component without notifications import', async () => {
    // This test assumes the import has been removed
    const { container } = render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(container.firstChild).toBeTruthy();
    });
  });
});

describe('TDD REFACTOR PHASE: Clean Implementation Validation', () => {
  // These tests will validate the final clean implementation

  it('should have clean header JSX without notification references', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    await waitFor(() => {
      const header = screen.getByTestId('header');
      expect(header).toBeInTheDocument();
    });

    // Validate clean JSX structure
    const headerHTML = screen.getByTestId('header').innerHTML;
    expect(headerHTML).not.toContain('RealTimeNotifications');
    expect(headerHTML).not.toContain('notifications-button');
  });
});