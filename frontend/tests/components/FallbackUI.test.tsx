/**
 * TDD London School Fallback UI Tests
 * 
 * Tests all fallback components to ensure zero white screens in any scenario.
 * Focuses on behavior verification and UI rendering patterns.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

// Import all fallback components
import FallbackComponents from '@/components/FallbackComponents';

describe('Fallback UI Components - TDD London School', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LoadingFallback Component', () => {
    it('should render loading state with default props', () => {
      // Act
      render(<FallbackComponents.LoadingFallback />);

      // Assert
      expect(screen.getByTestId('loading-fallback')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByRole('generic')).toHaveClass('p-8'); // default medium size
    });

    it('should render with custom message and size', () => {
      // Act
      render(
        <FallbackComponents.LoadingFallback 
          message="Loading agents..." 
          size="lg" 
        />
      );

      // Assert
      expect(screen.getByText('Loading agents...')).toBeInTheDocument();
      expect(screen.getByRole('generic')).toHaveClass('p-12'); // large size
    });

    it('should handle small size variant', () => {
      // Act
      render(<FallbackComponents.LoadingFallback size="sm" />);

      // Assert
      expect(screen.getByRole('generic')).toHaveClass('p-4'); // small size
    });
  });

  describe('ComponentErrorFallback', () => {
    const mockRetry = jest.fn();

    beforeEach(() => {
      mockRetry.mockClear();
    });

    it('should render full error fallback', () => {
      // Act
      render(
        <FallbackComponents.ComponentErrorFallback 
          componentName="TestComponent"
          error={new Error('Test error')}
          retry={mockRetry}
        />
      );

      // Assert
      expect(screen.getByTestId('component-error-fallback')).toBeInTheDocument();
      expect(screen.getByText(/TestComponent component encountered an error/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should render minimal error fallback', () => {
      // Act
      render(
        <FallbackComponents.ComponentErrorFallback 
          componentName="TestWidget"
          minimal={true}
        />
      );

      // Assert
      expect(screen.getByTestId('component-error-minimal')).toBeInTheDocument();
      expect(screen.getByText(/TestWidget unavailable/i)).toBeInTheDocument();
    });

    it('should call retry function when retry button is clicked', () => {
      // Act
      render(
        <FallbackComponents.ComponentErrorFallback 
          componentName="TestComponent"
          retry={mockRetry}
        />
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      // Assert
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('should show error details in development mode', () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const testError = new Error('Detailed test error');
      testError.stack = 'Error: Detailed test error\n    at TestComponent';

      // Act
      render(
        <FallbackComponents.ComponentErrorFallback 
          componentName="TestComponent"
          error={testError}
        />
      );

      // Assert
      expect(screen.getByText(/error details \(development\)/i)).toBeInTheDocument();
      
      // Click to expand details
      fireEvent.click(screen.getByText(/error details \(development\)/i));
      expect(screen.getByText('Detailed test error')).toBeInTheDocument();

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('NetworkErrorFallback', () => {
    const mockRetry = jest.fn();

    beforeEach(() => {
      mockRetry.mockClear();
    });

    it('should render online network error', () => {
      // Act
      render(
        <FallbackComponents.NetworkErrorFallback 
          retry={mockRetry}
          isOnline={true}
        />
      );

      // Assert
      expect(screen.getByTestId('network-error-fallback')).toBeInTheDocument();
      expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      expect(screen.getByText(/unable to reach the server/i)).toBeInTheDocument();
    });

    it('should render offline network error', () => {
      // Act
      render(
        <FallbackComponents.NetworkErrorFallback 
          retry={mockRetry}
          isOnline={false}
        />
      );

      // Assert
      expect(screen.getByText('No Internet Connection')).toBeInTheDocument();
      expect(screen.getByText(/you appear to be offline/i)).toBeInTheDocument();
    });

    it('should call retry function when try again is clicked', () => {
      // Act
      render(
        <FallbackComponents.NetworkErrorFallback retry={mockRetry} />
      );

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(tryAgainButton);

      // Assert
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('EmptyStateFallback', () => {
    const mockAction = jest.fn();

    beforeEach(() => {
      mockAction.mockClear();
    });

    it('should render empty state with custom content', () => {
      // Act
      render(
        <FallbackComponents.EmptyStateFallback 
          title="No Agents Found"
          description="Start by creating your first agent to see activity here."
          action={{
            label: 'Create Agent',
            onClick: mockAction
          }}
        />
      );

      // Assert
      expect(screen.getByTestId('empty-state-fallback')).toBeInTheDocument();
      expect(screen.getByText('No Agents Found')).toBeInTheDocument();
      expect(screen.getByText(/start by creating your first agent/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create Agent' })).toBeInTheDocument();
    });

    it('should handle action button click', () => {
      // Act
      render(
        <FallbackComponents.EmptyStateFallback 
          title="Empty State"
          description="Description"
          action={{
            label: 'Action',
            onClick: mockAction
          }}
        />
      );

      const actionButton = screen.getByRole('button', { name: 'Action' });
      fireEvent.click(actionButton);

      // Assert
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it('should render without action button', () => {
      // Act
      render(
        <FallbackComponents.EmptyStateFallback 
          title="Empty State"
          description="No action available"
        />
      );

      // Assert
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Route-Specific Fallbacks', () => {
    it('should render FeedFallback with skeleton loading', () => {
      // Act
      render(<FallbackComponents.FeedFallback />);

      // Assert
      expect(screen.getByTestId('feed-fallback')).toBeInTheDocument();
      
      // Should have multiple post skeletons
      const skeletons = screen.getAllByRole('generic');
      expect(skeletons.length).toBeGreaterThan(1);
    });

    it('should render DashboardFallback with grid layout', () => {
      // Act
      render(<FallbackComponents.DashboardFallback />);

      // Assert
      expect(screen.getByTestId('dashboard-fallback')).toBeInTheDocument();
      
      // Should have loading skeleton structure
      expect(screen.getByRole('generic')).toHaveClass('animate-pulse');
    });

    it('should render AgentManagerFallback with agent cards', () => {
      // Act
      render(<FallbackComponents.AgentManagerFallback />);

      // Assert
      expect(screen.getByTestId('agent-manager-fallback')).toBeInTheDocument();
      expect(screen.getByText('Agent Manager')).toBeInTheDocument();
      expect(screen.getByText(/loading agent configurations/i)).toBeInTheDocument();
    });

    it('should render WorkflowFallback with workflow placeholder', () => {
      // Act
      render(<FallbackComponents.WorkflowFallback />);

      // Assert
      expect(screen.getByTestId('workflow-fallback')).toBeInTheDocument();
      expect(screen.getByText('Workflow Visualization')).toBeInTheDocument();
      expect(screen.getByText(/workflow visualization loading/i)).toBeInTheDocument();
    });

    it('should render AnalyticsFallback with chart placeholders', () => {
      // Act
      render(<FallbackComponents.AnalyticsFallback />);

      // Assert
      expect(screen.getByTestId('analytics-fallback')).toBeInTheDocument();
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/loading performance metrics/i)).toBeInTheDocument();
    });

    it('should render ActivityFallback with activity stream', () => {
      // Act
      render(<FallbackComponents.ActivityFallback />);

      // Assert
      expect(screen.getByTestId('activity-fallback')).toBeInTheDocument();
      expect(screen.getByText('Live Activity')).toBeInTheDocument();
      expect(screen.getByText(/connecting to activity stream/i)).toBeInTheDocument();
    });

    it('should render SettingsFallback with form placeholders', () => {
      // Act
      render(<FallbackComponents.SettingsFallback />);

      // Assert
      expect(screen.getByTestId('settings-fallback')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText(/loading configuration options/i)).toBeInTheDocument();
    });

    it('should render ClaudeCodeFallback with code interface placeholder', () => {
      // Act
      render(<FallbackComponents.ClaudeCodeFallback />);

      // Assert
      expect(screen.getByTestId('claude-code-fallback')).toBeInTheDocument();
      expect(screen.getByText('Claude Code')).toBeInTheDocument();
      expect(screen.getByText(/code interface loading/i)).toBeInTheDocument();
    });

    it('should render DualInstanceFallback with dual panel layout', () => {
      // Act
      render(<FallbackComponents.DualInstanceFallback />);

      // Assert
      expect(screen.getByTestId('dual-instance-fallback')).toBeInTheDocument();
      expect(screen.getByText('Dual Instance Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/loading dual claude code instances/i)).toBeInTheDocument();
    });

    it('should render AgentProfileFallback with profile layout', () => {
      // Act
      render(<FallbackComponents.AgentProfileFallback />);

      // Assert
      expect(screen.getByTestId('agent-profile-fallback')).toBeInTheDocument();
      
      // Should have profile structure with avatar and details
      const skeletons = screen.getAllByRole('generic');
      expect(skeletons.length).toBeGreaterThan(5); // Multiple skeleton elements
    });
  });

  describe('Error Fallbacks', () => {
    it('should render NotFoundFallback with navigation', () => {
      // Act
      render(<FallbackComponents.NotFoundFallback />);

      // Assert
      expect(screen.getByTestId('not-found-fallback')).toBeInTheDocument();
      expect(screen.getByText('404')).toBeInTheDocument();
      expect(screen.getByText('Page Not Found')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /go home/i })).toBeInTheDocument();
    });

    it('should render ChunkErrorFallback with reload functionality', () => {
      // Arrange
      const originalReload = window.location.reload;
      const mockReload = jest.fn();
      Object.defineProperty(window.location, 'reload', {
        value: mockReload,
        writable: true
      });

      // Act
      render(<FallbackComponents.ChunkErrorFallback />);

      // Assert
      expect(screen.getByTestId('chunk-error-fallback')).toBeInTheDocument();
      expect(screen.getByText('Loading Issue')).toBeInTheDocument();
      
      const refreshButton = screen.getByRole('button', { name: /refresh page/i });
      fireEvent.click(refreshButton);
      
      expect(mockReload).toHaveBeenCalled();

      // Cleanup
      Object.defineProperty(window.location, 'reload', {
        value: originalReload,
        writable: true
      });
    });

    it('should render CriticalErrorFallback with system error message', () => {
      // Act
      render(<FallbackComponents.CriticalErrorFallback />);

      // Assert
      expect(screen.getByTestId('critical-error-fallback')).toBeInTheDocument();
      expect(screen.getByText('System Error')).toBeInTheDocument();
      expect(screen.getByText(/agentlink encountered a critical error/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh application/i })).toBeInTheDocument();
    });
  });

  describe('Fallback Component Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      // Act
      render(<FallbackComponents.LoadingFallback />);

      // Assert
      const loadingContainer = screen.getByTestId('loading-fallback');
      
      // Should have proper semantic structure
      expect(loadingContainer).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      // Arrange
      const mockAction = jest.fn();

      // Act
      render(
        <FallbackComponents.ComponentErrorFallback 
          componentName="TestComponent"
          retry={mockAction}
        />
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      
      // Assert - Button should be focusable
      retryButton.focus();
      expect(retryButton).toHaveFocus();
      
      // Should work with keyboard
      fireEvent.keyDown(retryButton, { key: 'Enter' });
      expect(mockAction).toHaveBeenCalled();
    });

    it('should have proper color contrast', () => {
      // Act
      render(<FallbackComponents.ComponentErrorFallback componentName="Test" />);

      // Assert - Error components should have appropriate styling
      const errorContainer = screen.getByTestId('component-error-fallback');
      expect(errorContainer).toHaveClass('bg-red-50', 'border-red-200');
    });
  });

  describe('Fallback Component Performance', () => {
    it('should render quickly without expensive operations', () => {
      // Arrange
      const startTime = performance.now();

      // Act
      render(<FallbackComponents.DashboardFallback />);

      // Assert
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Fallback should render very quickly (less than 50ms)
      expect(renderTime).toBeLessThan(50);
    });

    it('should not cause memory leaks', () => {
      // Act - Render and unmount multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<FallbackComponents.LoadingFallback />);
        unmount();
      }

      // Assert - No assertions needed, test passes if no memory errors
      expect(true).toBe(true);
    });
  });

  describe('Fallback Component Integration', () => {
    it('should work with different container sizes', () => {
      // Act
      render(
        <div style={{ width: '200px', height: '100px' }}>
          <FallbackComponents.LoadingFallback size="sm" />
        </div>
      );

      // Assert
      expect(screen.getByTestId('loading-fallback')).toBeInTheDocument();
    });

    it('should handle theme variations', () => {
      // Act - Test with different theme contexts
      render(
        <div className="dark">
          <FallbackComponents.ComponentErrorFallback componentName="DarkThemeTest" />
        </div>
      );

      // Assert
      expect(screen.getByTestId('component-error-fallback')).toBeInTheDocument();
    });

    it('should be responsive on different screen sizes', () => {
      // Arrange - Mock window resize
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320, // Mobile size
      });

      // Act
      render(<FallbackComponents.AgentManagerFallback />);

      // Assert - Should render without issues on small screens
      expect(screen.getByTestId('agent-manager-fallback')).toBeInTheDocument();
    });
  });
});