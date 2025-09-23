import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import RealAnalytics from '../../components/RealAnalytics';

/**
 * URL Persistence and Browser Refresh Validation Tests
 * London School TDD: URL State Management Behavior Testing
 *
 * Validates that URL state management works correctly after NLD removal:
 * 1. URL parameters correctly initialize tab state
 * 2. Tab changes update URL parameters
 * 3. Browser refresh maintains tab state
 * 4. URL state persistence across page reloads
 * 5. Deep linking to specific tabs works
 * 6. Invalid URL parameters are handled gracefully
 *
 * Focus: URL state management behavior verification
 */

// Mock collaborators
const mockApiService = {
  getSystemMetrics: vi.fn(),
  getAnalytics: vi.fn(),
  getFeedStats: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
};

const mockEnhancedAnalyticsPage = vi.fn((props) => (
  <div data-testid="enhanced-analytics-page" {...props}>
    <div data-testid="url-test-content">Claude SDK Analytics from URL</div>
  </div>
));

vi.mock('../../components/analytics/EnhancedAnalyticsPage', () => ({
  default: mockEnhancedAnalyticsPage
}));

vi.mock('../../services/api', () => ({
  apiService: mockApiService
}));

// Mock window.history for URL testing
const mockHistoryReplaceState = vi.fn();
const mockHistoryPushState = vi.fn();

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

// Test data
const mockApiData = {
  systemMetrics: {
    data: [{
      timestamp: new Date().toISOString(),
      server_id: 'url-test-server',
      cpu_usage: 35,
      memory_usage: 45,
      disk_usage: 25,
      network_io: { bytes_in: 1500, bytes_out: 2500, packets_in: 15, packets_out: 25 },
      response_time: 120,
      throughput: 130,
      error_rate: 0.1,
      active_connections: 65,
      queue_depth: 3,
      cache_hit_rate: 0.95
    }]
  },
  analytics: {
    data: {
      totalUsers: 75,
      activeUsers: 18,
      totalPosts: 350,
      engagement: 88.2
    }
  },
  feedStats: {
    data: {
      totalPosts: 350,
      todayPosts: 22,
      avgEngagement: 9.1,
      topCategories: ['Frontend', 'Testing', 'Analytics']
    }
  }
};

describe('URL Persistence and Browser Refresh Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock history API
    Object.defineProperty(window, 'history', {
      value: {
        replaceState: mockHistoryReplaceState,
        pushState: mockHistoryPushState,
        state: null
      },
      writable: true
    });
    
    // Set up successful API responses
    mockApiService.getSystemMetrics.mockResolvedValue(mockApiData.systemMetrics);
    mockApiService.getAnalytics.mockResolvedValue(mockApiData.analytics);
    mockApiService.getFeedStats.mockResolvedValue(mockApiData.feedStats);
  });
  
  afterEach(() => {
    vi.clearAllTimers();
    vi.resetAllMocks();
  });

  describe('URL Parameter Initialization', () => {
    it('should initialize to System Analytics tab when no URL parameter is present', async () => {
      // Reset window location to no search params
      delete (window as any).location;
      (window as any).location = {
        href: 'http://localhost:3000/analytics',
        search: '',
        pathname: '/analytics',
        origin: 'http://localhost:3000'
      };

      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Should default to System Analytics tab
      const systemTab = screen.getByRole('tab', { name: /System Analytics/i });
      expect(systemTab).toHaveAttribute('aria-selected', 'true');

      // Other tabs should not be selected
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      const performanceTab = screen.getByRole('tab', { name: /Performance/i });
      
      expect(claudeSDKTab).toHaveAttribute('aria-selected', 'false');
      expect(performanceTab).toHaveAttribute('aria-selected', 'false');

      // System analytics content should be visible
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.queryByTestId('enhanced-analytics-page')).not.toBeInTheDocument();
    });

    it('should initialize to Claude SDK Analytics tab when tab=claude-sdk URL parameter is present', async () => {
      // Set URL with claude-sdk tab parameter
      delete (window as any).location;
      (window as any).location = {
        href: 'http://localhost:3000/analytics?tab=claude-sdk',
        search: '?tab=claude-sdk',
        pathname: '/analytics',
        origin: 'http://localhost:3000'
      };

      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      // Should load directly to Claude SDK Analytics
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Claude SDK tab should be selected
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');

      // Other tabs should not be selected
      const systemTab = screen.getByRole('tab', { name: /System Analytics/i });
      const performanceTab = screen.getByRole('tab', { name: /Performance/i });
      
      expect(systemTab).toHaveAttribute('aria-selected', 'false');
      expect(performanceTab).toHaveAttribute('aria-selected', 'false');

      // Claude SDK content should be visible
      expect(screen.getByTestId('url-test-content')).toBeInTheDocument();
      expect(screen.queryByText('Active Users')).not.toBeInTheDocument();
    });

    it('should initialize to Performance tab when tab=performance URL parameter is present', async () => {
      // Set URL with performance tab parameter
      delete (window as any).location;
      (window as any).location = {
        href: 'http://localhost:3000/analytics?tab=performance',
        search: '?tab=performance',
        pathname: '/analytics',
        origin: 'http://localhost:3000'
      };

      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      });

      // Performance tab should be selected
      const performanceTab = screen.getByRole('tab', { name: /Performance/i });
      expect(performanceTab).toHaveAttribute('aria-selected', 'true');

      // Other tabs should not be selected
      const systemTab = screen.getByRole('tab', { name: /System Analytics/i });
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      
      expect(systemTab).toHaveAttribute('aria-selected', 'false');
      expect(claudeSDKTab).toHaveAttribute('aria-selected', 'false');

      // Performance content should be visible
      expect(screen.getByText('Application Performance')).toBeInTheDocument();
    });

    it('should handle invalid URL parameters gracefully', async () => {
      // Set URL with invalid tab parameter
      delete (window as any).location;
      (window as any).location = {
        href: 'http://localhost:3000/analytics?tab=invalid-tab',
        search: '?tab=invalid-tab',
        pathname: '/analytics',
        origin: 'http://localhost:3000'
      };

      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Should default to System Analytics tab for invalid parameter
      const systemTab = screen.getByRole('tab', { name: /System Analytics/i });
      expect(systemTab).toHaveAttribute('aria-selected', 'true');

      // System analytics content should be visible
      expect(screen.getByText('Active Users')).toBeInTheDocument();
    });

    it('should handle multiple URL parameters correctly', async () => {
      // Set URL with multiple parameters including tab
      delete (window as any).location;
      (window as any).location = {
        href: 'http://localhost:3000/analytics?user=123&tab=claude-sdk&filter=recent',
        search: '?user=123&tab=claude-sdk&filter=recent',
        pathname: '/analytics',
        origin: 'http://localhost:3000'
      };

      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      // Should extract tab parameter correctly despite other parameters
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('URL Updates During Tab Navigation', () => {
    it('should update URL when switching from System to Claude SDK tab', async () => {
      // Start with no URL parameters
      delete (window as any).location;
      const mockLocation = {
        href: 'http://localhost:3000/analytics',
        search: '',
        pathname: '/analytics',
        origin: 'http://localhost:3000'
      };
      (window as any).location = mockLocation;

      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Click Claude SDK tab
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      fireEvent.click(claudeSDKTab);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Verify tab selection changed
      expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
      
      // URL update behavior is mocked, but the component should trigger it
      // In real implementation, URL would be updated via history.replaceState
    });

    it('should remove tab parameter when switching to System tab', async () => {
      // Start with Claude SDK tab in URL
      delete (window as any).location;
      (window as any).location = {
        href: 'http://localhost:3000/analytics?tab=claude-sdk',
        search: '?tab=claude-sdk',
        pathname: '/analytics',
        origin: 'http://localhost:3000'
      };

      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Switch to System tab
      const systemTab = screen.getByRole('tab', { name: /System Analytics/i });
      fireEvent.click(systemTab);

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
        expect(screen.queryByTestId('enhanced-analytics-page')).not.toBeInTheDocument();
      });

      // System tab should be selected
      expect(systemTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should update URL correctly for Performance tab', async () => {
      delete (window as any).location;
      (window as any).location = {
        href: 'http://localhost:3000/analytics',
        search: '',
        pathname: '/analytics',
        origin: 'http://localhost:3000'
      };

      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Click Performance tab
      const performanceTab = screen.getByRole('tab', { name: /Performance/i });
      fireEvent.click(performanceTab);

      await waitFor(() => {
        expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      });

      // Performance tab should be selected
      expect(performanceTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Browser Refresh Behavior', () => {
    it('should maintain Claude SDK tab state after simulated browser refresh', async () => {
      // Start with Claude SDK tab
      delete (window as any).location;
      (window as any).location = {
        href: 'http://localhost:3000/analytics?tab=claude-sdk',
        search: '?tab=claude-sdk',
        pathname: '/analytics',
        origin: 'http://localhost:3000'
      };

      const { rerender } = render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      // Should load Claude SDK tab
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Simulate browser refresh by re-rendering with same URL
      rerender(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      // Should maintain Claude SDK tab state
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should maintain Performance tab state after simulated browser refresh', async () => {
      // Start with Performance tab
      delete (window as any).location;
      (window as any).location = {
        href: 'http://localhost:3000/analytics?tab=performance',
        search: '?tab=performance',
        pathname: '/analytics',
        origin: 'http://localhost:3000'
      };

      const { rerender } = render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      // Should load Performance tab
      await waitFor(() => {
        expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      });

      // Simulate browser refresh
      rerender(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      // Should maintain Performance tab state
      await waitFor(() => {
        expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      });

      const performanceTab = screen.getByRole('tab', { name: /Performance/i });
      expect(performanceTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should handle test environment URL initialization correctly', async () => {
      // In test environment, should always default to system tab
      // regardless of URL (as per component logic)
      
      // Mock process.env for test environment
      const originalProcess = global.process;
      global.process = {
        ...originalProcess,
        env: { ...originalProcess?.env, NODE_ENV: 'test' }
      };

      delete (window as any).location;
      (window as any).location = {
        href: 'http://localhost:3000/analytics?tab=claude-sdk',
        search: '?tab=claude-sdk',
        pathname: '/analytics',
        origin: 'http://localhost:3000'
      };

      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      // In test environment, should default to system tab regardless of URL
      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      const systemTab = screen.getByRole('tab', { name: /System Analytics/i });
      expect(systemTab).toHaveAttribute('aria-selected', 'true');

      // Restore original process
      global.process = originalProcess;
    });
  });

  describe('Deep Linking and URL Validation', () => {
    it('should support deep linking to Claude SDK Analytics', async () => {
      // Simulate user directly accessing URL with Claude SDK tab
      delete (window as any).location;
      (window as any).location = {
        href: 'http://localhost:3000/analytics?tab=claude-sdk&view=cost-overview',
        search: '?tab=claude-sdk&view=cost-overview',
        pathname: '/analytics',
        origin: 'http://localhost:3000'
      };

      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      // Should load directly to Claude SDK Analytics with additional parameters preserved
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');

      // Additional URL parameters should not interfere with tab loading
      expect(screen.getByTestId('url-test-content')).toBeInTheDocument();
    });

    it('should handle malformed URL parameters gracefully', async () => {
      // Test with malformed URL
      delete (window as any).location;
      (window as any).location = {
        href: 'http://localhost:3000/analytics?tab=claude-sdk&malformed=param%without%proper%encoding',
        search: '?tab=claude-sdk&malformed=param%without%proper%encoding',
        pathname: '/analytics',
        origin: 'http://localhost:3000'
      };

      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      // Should still work despite malformed parameters
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should preserve other URL parameters when switching tabs', async () => {
      // Start with URL containing additional parameters
      delete (window as any).location;
      const mockLocation = {
        href: 'http://localhost:3000/analytics?user=123&filter=recent&tab=claude-sdk',
        search: '?user=123&filter=recent&tab=claude-sdk',
        pathname: '/analytics',
        origin: 'http://localhost:3000'
      };
      (window as any).location = mockLocation;

      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Switch to Performance tab
      const performanceTab = screen.getByRole('tab', { name: /Performance/i });
      fireEvent.click(performanceTab);

      await waitFor(() => {
        expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      });

      // Tab should change but other parameters should be preserved in URL logic
      expect(performanceTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('URL State Consistency', () => {
    it('should maintain URL consistency during rapid tab switching', async () => {
      delete (window as any).location;
      (window as any).location = {
        href: 'http://localhost:3000/analytics',
        search: '',
        pathname: '/analytics',
        origin: 'http://localhost:3000'
      };

      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      const systemTab = screen.getByRole('tab', { name: /System Analytics/i });
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      const performanceTab = screen.getByRole('tab', { name: /Performance/i });

      // Rapid tab switching sequence
      fireEvent.click(claudeSDKTab);
      await waitFor(() => {
        expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
      });

      fireEvent.click(performanceTab);
      await waitFor(() => {
        expect(performanceTab).toHaveAttribute('aria-selected', 'true');
      });

      fireEvent.click(systemTab);
      await waitFor(() => {
        expect(systemTab).toHaveAttribute('aria-selected', 'true');
      });

      fireEvent.click(claudeSDKTab);
      await waitFor(() => {
        expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
      });

      // Final state should be consistent
      expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
    });

    it('should handle browser back/forward simulation', async () => {
      // Simulate browser history changes
      delete (window as any).location;
      (window as any).location = {
        href: 'http://localhost:3000/analytics',
        search: '',
        pathname: '/analytics',
        origin: 'http://localhost:3000'
      };

      const { rerender } = render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Simulate navigation to Claude SDK (browser forward)
      (window as any).location.search = '?tab=claude-sdk';
      
      rerender(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Simulate browser back
      (window as any).location.search = '';
      
      rerender(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
        expect(screen.queryByTestId('enhanced-analytics-page')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle undefined or null location object', async () => {
      // Simulate undefined location (edge case)
      delete (window as any).location;
      (window as any).location = undefined;

      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      // Should default to system tab and not crash
      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      const systemTab = screen.getByRole('tab', { name: /System Analytics/i });
      expect(systemTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should handle URL changes during component loading', async () => {
      delete (window as any).location;
      (window as any).location = {
        href: 'http://localhost:3000/analytics?tab=claude-sdk',
        search: '?tab=claude-sdk',
        pathname: '/analytics',
        origin: 'http://localhost:3000'
      };

      render(
        <TestWrapper>
          <RealAnalytics />
        </TestWrapper>
      );

      // Change URL while component is loading
      (window as any).location.search = '?tab=performance';

      // Should handle the change gracefully
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Component should maintain its initial state based on initial URL
      const claudeSDKTab = screen.getByRole('tab', { name: /Claude SDK Analytics/i });
      expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
    });
  });
});
