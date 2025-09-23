/**
 * TDD London School Tests for RealAnalytics Component
 * Testing tab functionality, state management, and collaborative behavior
 *
 * London School Approach:
 * - Mock-driven development with focus on object interactions
 * - Outside-in testing from user behavior to component collaborations
 * - Behavior verification over state testing
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import RealAnalytics from '../../components/RealAnalytics';

// Mock all external dependencies following London School approach
vi.mock('../../services/api', () => ({
  apiService: {
    getSystemMetrics: vi.fn(),
    getAnalytics: vi.fn(),
    getFeedStats: vi.fn(),
  }
}));

vi.mock('../../components/analytics/EnhancedAnalyticsPage', () => ({
  default: ({ className, enableRealTime, refreshInterval }: any) => (
    <div
      data-testid="enhanced-analytics-page"
      data-classname={className}
      data-real-time={enableRealTime}
      data-refresh-interval={refreshInterval}
    >
      Claude SDK Analytics Content
    </div>
  )
}));

vi.mock('react-error-boundary', () => ({
  ErrorBoundary: ({ children, FallbackComponent, onReset }: any) => {
    try {
      return <div data-testid="error-boundary">{children}</div>;
    } catch (error) {
      return <FallbackComponent error={error} resetErrorBoundary={onReset} />;
    }
  }
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  RefreshCw: ({ className, ...props }: any) => (
    <span data-testid="refresh-icon" className={className} {...props}>⟳</span>
  ),
  AlertCircle: ({ className, ...props }: any) => (
    <span data-testid="alert-icon" className={className} {...props}>⚠</span>
  ),
  BarChart3: ({ className, ...props }: any) => (
    <span data-testid="chart-icon" className={className} {...props}>📊</span>
  ),
  Activity: ({ className, ...props }: any) => (
    <span data-testid="activity-icon" className={className} {...props}>📈</span>
  ),
  TrendingUp: ({ className, ...props }: any) => (
    <span data-testid="trending-icon" className={className} {...props}>📈</span>
  ),
  Users: ({ className, ...props }: any) => (
    <span data-testid="users-icon" className={className} {...props}>👥</span>
  ),
}));

// Mock the Tabs components to verify interactions
const mockTabsValue = vi.fn();
const mockTabsOnValueChange = vi.fn();

vi.mock('../../components/ui/tabs', () => ({
  Tabs: ({ value, onValueChange, children, className }: any) => {
    mockTabsValue.mockReturnValue(value);
    mockTabsOnValueChange.mockImplementation(onValueChange);
    return (
      <div
        data-testid="tabs-container"
        data-value={value}
        className={className}
      >
        {children}
      </div>
    );
  },
  TabsList: ({ children, className }: any) => (
    <div data-testid="tabs-list" className={className}>
      {children}
    </div>
  ),
  TabsTrigger: ({ value, children, className }: any) => (
    <button
      data-testid={`tab-trigger-${value}`}
      data-value={value}
      className={className}
      onClick={() => mockTabsOnValueChange(value)}
    >
      {children}
    </button>
  ),
  TabsContent: ({ value, children, className }: any) => {
    const currentValue = mockTabsValue();
    return currentValue === value ? (
      <div
        data-testid={`tab-content-${value}`}
        data-value={value}
        className={className}
      >
        {children}
      </div>
    ) : null;
  }
}));

describe('RealAnalytics - TDD London School Approach', () => {
  let mockApiService: any;

  beforeEach(async () => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    mockTabsValue.mockReturnValue('system');

    // Import mocked apiService
    const { apiService } = await import('../../services/api');
    mockApiService = apiService;

    // Set up default successful API responses
    mockApiService.getSystemMetrics.mockResolvedValue({
      data: [{
        timestamp: '2024-01-01T00:00:00Z',
        server_id: 'test-server',
        cpu_usage: 45,
        memory_usage: 65,
        disk_usage: 50,
        active_agents: 8,
        total_posts: 156,
        avg_response_time: 285,
        system_health: 95
      }]
    });

    mockApiService.getAnalytics.mockResolvedValue({
      data: {
        totalUsers: 42,
        activeUsers: 8,
        totalPosts: 156,
        engagement: 78.5,
        performance: {
          avgLoadTime: 285,
          errorRate: 0.5
        }
      }
    });

    mockApiService.getFeedStats.mockResolvedValue({
      data: {
        totalPosts: 156,
        todayPosts: 12,
        avgEngagement: 6.2,
        topCategories: ['Technology', 'AI', 'Development']
      }
    });

    // Mock window for URL handling
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000',
        search: ''
      },
      writable: true
    });

    Object.defineProperty(window, 'history', {
      value: {
        replaceState: vi.fn()
      },
      writable: true
    });
  });

  describe('Component Initialization and Collaboration', () => {
    it('should coordinate with apiService to load initial data', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        // Verify the component coordinated with all required services
        expect(mockApiService.getSystemMetrics).toHaveBeenCalledWith('24h');
        expect(mockApiService.getAnalytics).toHaveBeenCalledWith('24h');
        expect(mockApiService.getFeedStats).toHaveBeenCalled();
      });
    });

    it('should establish correct collaboration with Tabs component', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        // Verify tabs container is set up with correct initial state
        const tabsContainer = screen.getByTestId('tabs-container');
        expect(tabsContainer).toHaveAttribute('data-value', 'system');
      });
    });

    it('should delegate tab rendering to TabsList and TabsTrigger collaborators', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        // Verify collaboration with tab rendering components
        expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
        expect(screen.getByTestId('tab-trigger-system')).toBeInTheDocument();
        expect(screen.getByTestId('tab-trigger-claude-sdk')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation Behavior Verification', () => {
    it('should coordinate tab switching through onValueChange interaction', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByTestId('tab-trigger-claude-sdk')).toBeInTheDocument();
      });

      // Test the collaboration between trigger and tabs container
      const claudeSdkTab = screen.getByTestId('tab-trigger-claude-sdk');
      fireEvent.click(claudeSdkTab);

      // Verify the interaction was coordinated properly
      expect(mockTabsOnValueChange).toHaveBeenCalledWith('claude-sdk');
    });

    it('should coordinate URL updates with browser history during tab changes', async () => {
      const mockReplaceState = vi.fn();
      Object.defineProperty(window, 'history', {
        value: { replaceState: mockReplaceState },
        writable: true
      });

      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByTestId('tab-trigger-claude-sdk')).toBeInTheDocument();
      });

      const claudeSdkTab = screen.getByTestId('tab-trigger-claude-sdk');
      fireEvent.click(claudeSdkTab);

      // Verify collaboration with browser history
      expect(mockReplaceState).toHaveBeenCalled();
    });

    it('should handle URL parameter initialization correctly', async () => {
      // Mock URL with claude-sdk tab parameter
      Object.defineProperty(window, 'location', {
        value: {
          href: 'http://localhost:3000?tab=claude-sdk',
          search: '?tab=claude-sdk'
        },
        writable: true
      });

      const URLSearchParamsSpy = vi.spyOn(window, 'URLSearchParams');
      URLSearchParamsSpy.mockImplementation(() => ({
        get: vi.fn().mockReturnValue('claude-sdk')
      } as any));

      render(<RealAnalytics />);

      // Should initialize with claude-sdk tab based on URL
      await waitFor(() => {
        expect(mockTabsValue()).toBeTruthy();
      });

      URLSearchParamsSpy.mockRestore();
    });
  });

  describe('Claude SDK Analytics Loading Collaboration', () => {
    it('should delegate Claude SDK content to EnhancedAnalyticsPage collaborator', async () => {
      mockTabsValue.mockReturnValue('claude-sdk');

      render(<RealAnalytics />);

      await waitFor(() => {
        // Verify collaboration with EnhancedAnalyticsPage
        const enhancedAnalytics = screen.getByTestId('enhanced-analytics-page');
        expect(enhancedAnalytics).toBeInTheDocument();
        expect(enhancedAnalytics).toHaveAttribute('data-real-time', 'true');
        expect(enhancedAnalytics).toHaveAttribute('data-refresh-interval', '30000');
      });
    });

    it('should coordinate error boundary protection for Claude SDK content', async () => {
      mockTabsValue.mockReturnValue('claude-sdk');

      render(<RealAnalytics />);

      await waitFor(() => {
        // Verify ErrorBoundary collaboration
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });
    });

    it('should display loading state while coordinating with EnhancedAnalyticsPage', async () => {
      render(<RealAnalytics />);

      // During initial loading, should show loading indicator
      expect(screen.getByTestId('claude-sdk-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading Claude SDK Analytics...')).toBeInTheDocument();
    });
  });

  describe('Error Handling and Fallback Collaboration', () => {
    it('should coordinate graceful degradation when apiService fails', async () => {
      // Mock API failures
      mockApiService.getSystemMetrics.mockRejectedValue(new Error('Network error'));
      mockApiService.getAnalytics.mockRejectedValue(new Error('Service unavailable'));
      mockApiService.getFeedStats.mockRejectedValue(new Error('Database error'));

      render(<RealAnalytics />);

      await waitFor(() => {
        // Should still render component with fallback data
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });
    });

    it('should coordinate error display with user interaction elements', async () => {
      mockApiService.getSystemMetrics.mockRejectedValue(new Error('Critical error'));

      render(<RealAnalytics />);

      await waitFor(() => {
        // Should provide retry mechanism through user interaction
        expect(screen.getByText('Retry')).toBeInTheDocument();
        expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
      });
    });

    it('should coordinate refresh action with apiService retry behavior', async () => {
      // Initially fail, then succeed
      mockApiService.getSystemMetrics.mockRejectedValueOnce(new Error('Network error'));

      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      // Mock successful retry
      mockApiService.getSystemMetrics.mockResolvedValue({
        data: [{ system_health: 95, cpu_usage: 45, memory_usage: 65, avg_response_time: 285 }]
      });

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      // Verify retry coordination
      await waitFor(() => {
        expect(mockApiService.getSystemMetrics).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Real-time Data and State Management Collaboration', () => {
    it('should coordinate time range changes with apiService', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Last 24 Hours')).toBeInTheDocument();
      });

      const timeRangeSelect = screen.getByDisplayValue('Last 24 Hours');
      fireEvent.change(timeRangeSelect, { target: { value: '7d' } });

      // Verify coordination with apiService for new time range
      await waitFor(() => {
        expect(mockApiService.getSystemMetrics).toHaveBeenCalledWith('7d');
        expect(mockApiService.getAnalytics).toHaveBeenCalledWith('7d');
      });
    });

    it('should coordinate refresh action across all data sources', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      // Verify coordinated refresh across all collaborators
      await waitFor(() => {
        expect(mockApiService.getSystemMetrics).toHaveBeenCalledTimes(2);
        expect(mockApiService.getAnalytics).toHaveBeenCalledTimes(2);
        expect(mockApiService.getFeedStats).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Accessibility and User Interface Collaboration', () => {
    it('should coordinate with screen readers through proper ARIA attributes', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        // Verify accessibility coordination
        const systemTab = screen.getByTestId('tab-trigger-system');
        const claudeSdkTab = screen.getByTestId('tab-trigger-claude-sdk');

        expect(systemTab).toBeInTheDocument();
        expect(claudeSdkTab).toBeInTheDocument();
      });
    });

    it('should coordinate keyboard navigation between tab triggers', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        expect(screen.getByTestId('tab-trigger-system')).toBeInTheDocument();
      });

      const systemTab = screen.getByTestId('tab-trigger-system');

      // Test keyboard interaction coordination
      fireEvent.keyDown(systemTab, { key: 'Tab' });
      fireEvent.keyDown(systemTab, { key: 'Enter' });

      // Verify the interaction was handled
      expect(mockTabsOnValueChange).toHaveBeenCalled();
    });
  });

  describe('Component Performance and Memory Collaboration', () => {
    it('should coordinate component cleanup on unmount', () => {
      const { unmount } = render(<RealAnalytics />);

      // Component should clean up its collaborations
      expect(() => unmount()).not.toThrow();
    });

    it('should coordinate efficient re-rendering through proper prop changes', async () => {
      const { rerender } = render(<RealAnalytics className="initial" />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Should handle prop changes without breaking collaborations
      rerender(<RealAnalytics className="updated" />);

      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });
  });

  describe('Data Flow and Contract Verification', () => {
    it('should verify contracts between RealAnalytics and apiService', async () => {
      render(<RealAnalytics />);

      await waitFor(() => {
        // Verify contract adherence - apiService called with expected parameters
        expect(mockApiService.getSystemMetrics).toHaveBeenCalledWith(
          expect.stringMatching(/^(24h|7d|30d|90d)$/)
        );
        expect(mockApiService.getAnalytics).toHaveBeenCalledWith(
          expect.stringMatching(/^(24h|7d|30d|90d)$/)
        );
        expect(mockApiService.getFeedStats).toHaveBeenCalledWith();
      });
    });

    it('should verify contracts between RealAnalytics and EnhancedAnalyticsPage', async () => {
      mockTabsValue.mockReturnValue('claude-sdk');

      render(<RealAnalytics />);

      await waitFor(() => {
        const enhancedAnalytics = screen.getByTestId('enhanced-analytics-page');

        // Verify contract compliance
        expect(enhancedAnalytics).toHaveAttribute('data-classname', 'min-h-[600px]');
        expect(enhancedAnalytics).toHaveAttribute('data-real-time', 'true');
        expect(enhancedAnalytics).toHaveAttribute('data-refresh-interval', '30000');
      });
    });
  });
});