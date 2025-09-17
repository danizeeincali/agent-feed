import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { EnhancedRealAnalytics } from '../../components/RealAnalytics';

/**
 * Integration Tests for RealAnalytics White Screen Prevention
 *
 * TDD London School Approach:
 * 1. Integration contract verification between all collaborators
 * 2. End-to-end behavior testing for white screen scenarios
 * 3. Mock coordination for external dependencies
 * 4. System reliability validation under stress conditions
 */

describe('RealAnalytics White Screen Prevention - Integration Tests', () => {
  const mockApiService = {
    getSystemMetrics: vi.fn(),
    getAnalytics: vi.fn(),
    getFeedStats: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  };

  const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleError.mockClear();
    mockConsoleWarn.mockClear();

    // Default successful API responses
    mockApiService.getSystemMetrics.mockResolvedValue({
      data: [{
        id: '1',
        timestamp: new Date().toISOString(),
        active_agents: 5,
        total_posts: 100,
        cpu_usage: 45,
        memory_usage: 60,
        db_performance: 95,
        avg_response_time: 250
      }]
    });

    mockApiService.getAnalytics.mockResolvedValue({
      data: {
        agentOperations: 45,
        postCreations: 23,
        systemEvents: 12,
        userInteractions: 67
      }
    });

    mockApiService.getFeedStats.mockResolvedValue({
      data: {
        totalAgents: 5,
        totalPosts: 100,
        systemHealth: 95
      }
    });

    // Mock storage APIs
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn(() => 'integration-test-session'),
        setItem: vi.fn(),
      },
      writable: true,
    });

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => 'integration-test-user'),
        setItem: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
  });

  describe('Complete System Failure Scenarios', () => {
    it('should handle complete API failure without white screen', async () => {
      // Mock all APIs to fail
      mockApiService.getSystemMetrics.mockRejectedValue(new Error('Network Error'));
      mockApiService.getAnalytics.mockRejectedValue(new Error('Network Error'));
      mockApiService.getFeedStats.mockRejectedValue(new Error('Network Error'));

      vi.doMock('../../services/api', () => ({
        apiService: mockApiService
      }));

      render(<EnhancedRealAnalytics />);

      // Should render component structure even with API failures
      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Should show error state but not white screen
      expect(screen.getByText('System Analytics')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Network Error')).toBeInTheDocument();

      // UI should remain functional
      expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Claude SDK Cost Analytics/i })).toBeInTheDocument();
    });

    it('should handle dynamic import failures with fallback', async () => {
      // Mock EnhancedAnalyticsPage to fail completely
      vi.doMock('../../components/analytics/EnhancedAnalyticsPage', () => {
        throw new Error('Module failed to load');
      });

      render(<EnhancedRealAnalytics />);

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Switch to Claude SDK tab to trigger dynamic import
      const claudeSDKTab = screen.getByRole('button', { name: /Claude SDK Cost Analytics/i });
      fireEvent.click(claudeSDKTab);

      // Should show fallback, not white screen
      await waitFor(() => {
        expect(screen.getByTestId('analytics-fallback-error')).toBeInTheDocument();
        expect(screen.getByText('Analytics Unavailable')).toBeInTheDocument();
      });

      // Error should be logged
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to load Claude SDK Analytics:',
        expect.any(Error)
      );
    });

    it('should handle component render errors during runtime', async () => {
      // Mock component to throw during render after successful mount
      let shouldThrow = false;

      const FailingComponent = () => {
        if (shouldThrow) {
          throw new Error('Runtime render error');
        }
        return <div data-testid=\"working-component\">Working</div>;
      };

      // Mock the enhanced analytics page to be our failing component
      vi.doMock('../../components/analytics/EnhancedAnalyticsPage', () => ({
        default: FailingComponent
      }));

      render(<EnhancedRealAnalytics />);

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Initially working
      const claudeSDKTab = screen.getByRole('button', { name: /Claude SDK Cost Analytics/i });
      fireEvent.click(claudeSDKTab);

      await waitFor(() => {
        expect(screen.getByTestId('working-component')).toBeInTheDocument();
      });

      // Trigger error during runtime
      shouldThrow = true;
      fireEvent.click(claudeSDKTab); // Re-click to re-render

      // Should be caught by error boundary
      await waitFor(() => {
        expect(screen.getByTestId('analytics-enhanced-fallback')).toBeInTheDocument();
      });
    });
  });

  describe('Recovery and Resilience Testing', () => {
    it('should recover from transient API failures', async () => {
      // Initial API failure
      mockApiService.getSystemMetrics.mockRejectedValueOnce(new Error('Temporary Error'));
      mockApiService.getAnalytics.mockRejectedValueOnce(new Error('Temporary Error'));
      mockApiService.getFeedStats.mockRejectedValueOnce(new Error('Temporary Error'));

      // Then success on retry
      mockApiService.getSystemMetrics.mockResolvedValue({
        data: [{
          id: '1',
          timestamp: new Date().toISOString(),
          active_agents: 3,
          total_posts: 50,
          cpu_usage: 30,
          memory_usage: 40,
          db_performance: 98,
          avg_response_time: 200
        }]
      });

      vi.doMock('../../services/api', () => ({
        apiService: mockApiService
      }));

      render(<EnhancedRealAnalytics />);

      // Initial error state
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Temporary Error')).toBeInTheDocument();
      });

      // Click refresh to retry
      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      fireEvent.click(refreshButton);

      // Should recover and show data
      await waitFor(() => {
        expect(screen.queryByText('Error')).not.toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument(); // Active agents
        expect(screen.getByText('50')).toBeInTheDocument(); // Total posts
      });
    });

    it('should handle rapid tab switching without breaking', async () => {
      render(<EnhancedRealAnalytics />);

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      const systemTab = screen.getByRole('button', { name: /System Analytics/i });
      const claudeSDKTab = screen.getByRole('button', { name: /Claude SDK Cost Analytics/i });

      // Rapid switching simulation
      for (let i = 0; i < 10; i++) {
        fireEvent.click(claudeSDKTab);
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
        });
        fireEvent.click(systemTab);
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
        });
      }

      // Component should still be stable
      expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      expect(screen.getByText('System Analytics')).toBeInTheDocument();
    });

    it('should handle memory pressure scenarios', async () => {
      // Simulate high memory usage
      const largeDataSet = Array.from({ length: 10000 }, (_, i) => ({
        id: String(i),
        timestamp: new Date().toISOString(),
        active_agents: Math.floor(Math.random() * 100),
        total_posts: Math.floor(Math.random() * 1000),
        cpu_usage: Math.floor(Math.random() * 100),
        memory_usage: Math.floor(Math.random() * 100),
        db_performance: Math.floor(Math.random() * 100),
        avg_response_time: Math.floor(Math.random() * 1000)
      }));

      mockApiService.getSystemMetrics.mockResolvedValue({
        data: largeDataSet
      });

      vi.doMock('../../services/api', () => ({
        apiService: mockApiService
      }));

      render(<EnhancedRealAnalytics />);

      // Should handle large datasets without crashing
      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Should show the first metric (most recent)
      expect(screen.getByText(String(largeDataSet[0].active_agents))).toBeInTheDocument();
    });
  });

  describe('User Experience Continuity', () => {
    it('should maintain UI state during error recovery', async () => {
      render(<EnhancedRealAnalytics />);

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Change time range
      const timeRangeSelect = screen.getByDisplayValue('Last 24 Hours');
      fireEvent.change(timeRangeSelect, { target: { value: '7d' } });

      expect(timeRangeSelect.value).toBe('7d');

      // Simulate error and recovery
      mockApiService.getSystemMetrics.mockRejectedValueOnce(new Error('Temporary'));

      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      fireEvent.click(refreshButton);

      // Time range should be preserved
      await waitFor(() => {
        expect(screen.getByDisplayValue('Last 7 Days')).toBeInTheDocument();
      });
    });

    it('should provide meaningful loading states', async () => {
      // Mock slow API responses
      mockApiService.getSystemMetrics.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          data: [{
            id: '1',
            timestamp: new Date().toISOString(),
            active_agents: 5,
            total_posts: 100,
            cpu_usage: 45,
            memory_usage: 60,
            db_performance: 95,
            avg_response_time: 250
          }]
        }), 2000))
      );

      vi.doMock('../../services/api', () => ({
        apiService: mockApiService
      }));

      render(<EnhancedRealAnalytics />);

      // Should show loading state
      expect(screen.getByTestId('real-analytics-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading real analytics data...')).toBeInTheDocument();

      // Should show skeleton loader
      expect(screen.getAllByRole('generic').some(el =>
        el.className.includes('animate-pulse')
      )).toBe(true);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('System Analytics')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle accessibility requirements during errors', async () => {
      render(<EnhancedRealAnalytics />);

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Switch to Claude SDK tab to trigger potential error
      const claudeSDKTab = screen.getByRole('button', { name: /Claude SDK Cost Analytics/i });
      fireEvent.click(claudeSDKTab);

      // All interactive elements should remain accessible
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('disabled');
      });

      // Should have proper ARIA labels and roles
      expect(screen.getByRole('button', { name: /System Analytics/i })).toHaveAttribute('aria-label',
        expect.any(String));
    });
  });

  describe('Monitoring and Observability Integration', () => {
    it('should emit telemetry events for monitoring systems', async () => {
      const mockEventListener = vi.fn();
      window.addEventListener('analytics-white-screen-error', mockEventListener);

      // Force an error
      mockApiService.getSystemMetrics.mockRejectedValue(new Error('Monitor Test Error'));
      mockApiService.getAnalytics.mockRejectedValue(new Error('Monitor Test Error'));
      mockApiService.getFeedStats.mockRejectedValue(new Error('Monitor Test Error'));

      vi.doMock('../../services/api', () => ({
        apiService: mockApiService
      }));

      render(<EnhancedRealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
      });

      // Should emit monitoring events
      expect(mockEventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'analytics-white-screen-error',
          detail: expect.objectContaining({
            componentName: expect.any(String),
            analytics: expect.objectContaining({
              sessionId: 'integration-test-session',
              userId: 'integration-test-user'
            })
          })
        })
      );

      window.removeEventListener('analytics-white-screen-error', mockEventListener);
    });

    it('should maintain performance metrics during stress', async () => {
      const performanceMarks: string[] = [];
      const originalMark = performance.mark;
      const originalMeasure = performance.measure;

      performance.mark = vi.fn((name: string) => {
        performanceMarks.push(name);
        return originalMark.call(performance, name);
      });

      render(<EnhancedRealAnalytics />);

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Component should mark performance milestones
      expect(performanceMarks.length).toBeGreaterThan(0);

      performance.mark = originalMark;
      performance.measure = originalMeasure;
    });
  });

  describe('Cross-Browser Compatibility', () => {
    it('should handle missing modern browser features gracefully', async () => {
      // Mock missing features
      const originalCustomEvent = window.CustomEvent;
      const originalSessionStorage = window.sessionStorage;

      // @ts-ignore
      delete window.CustomEvent;
      // @ts-ignore
      delete window.sessionStorage;

      render(<EnhancedRealAnalytics />);

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Should still render without modern features
      expect(screen.getByText('System Analytics')).toBeInTheDocument();

      // Restore
      window.CustomEvent = originalCustomEvent;
      window.sessionStorage = originalSessionStorage;
    });
  });
});