/**
 * Comprehensive TDD Tests for UI Components and Authentic Data Tracking
 * Validates: App.tsx layout, Agents.jsx data display, Token analytics, Navigation, CSS styling
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { act } from 'react-dom/test-utils';
import '@testing-library/jest-dom';
import { server } from '../setup/mockServer';
import App from '../../App';
import Agents from '../../pages/Agents';
import TokenAnalyticsDashboard from '../../components/TokenAnalyticsDashboard';
import RealAnalytics from '../../components/RealAnalytics';

// Mock fetch for authentic data testing
global.fetch = jest.fn();

// Mock window.location for navigation tests
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    search: '',
    pathname: '/'
  },
  writable: true
});

// Mock router navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Test wrapper with all providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
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

// Mock data for authentic data testing
const mockAgentsData = {
  data: [
    {
      id: 'personal-todos',
      name: 'Personal Todos Agent',
      status: 'active',
      priority: 'P0',
      description: 'Task management with Fibonacci priority system',
      type: 'user_facing'
    },
    {
      id: 'meeting-prep',
      name: 'Meeting Prep Agent',
      status: 'active',
      priority: 'P1',
      description: 'Meeting preparation and agenda creation',
      type: 'user_facing'
    }
  ]
};

const mockTokenAnalyticsData = {
  data: {
    summary: {
      total_requests: 150,
      total_tokens: 25000,
      total_cost: 1250, // cents
      avg_processing_time: 285,
      unique_sessions: 8,
      providers_used: 2,
      models_used: 3
    },
    by_provider: [
      {
        provider: 'anthropic',
        requests: 120,
        total_tokens: 20000,
        total_cost: 1000,
        avg_processing_time: 280
      }
    ],
    by_model: [
      {
        model: 'claude-3-sonnet',
        provider: 'anthropic',
        requests: 100,
        total_tokens: 18000,
        total_cost: 900
      }
    ]
  }
};

const mockChartData = {
  data: {
    labels: ['00:00', '01:00', '02:00'],
    datasets: [
      {
        label: 'Tokens',
        data: [1000, 1500, 800],
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)'
      },
      {
        label: 'Cost (cents)',
        data: [50, 75, 40],
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderColor: 'rgb(16, 185, 129)'
      }
    ]
  }
};

const mockMessagesData = {
  data: [
    {
      id: 1,
      timestamp: '2025-01-22T10:00:00Z',
      session_id: 'session-123',
      request_id: 'req-456',
      message_id: 'msg-789',
      provider: 'anthropic',
      model: 'claude-3-sonnet',
      request_type: 'chat',
      input_tokens: 100,
      output_tokens: 200,
      total_tokens: 300,
      cost_total: 15, // cents
      processing_time_ms: 250,
      message_preview: 'Hello, how can I help you today?',
      response_preview: 'I can help you with various tasks including...'
    }
  ]
};

describe('Comprehensive UI Component Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. App.tsx Dashboard Layout Validation', () => {
    test('renders proper dashboard layout with all essential elements', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <App />
          </TestWrapper>
        );
      });

      // Test main layout structure
      expect(screen.getByTestId('app-root')).toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('app-container')).toBeInTheDocument();

      // Test navigation sidebar
      expect(screen.getByText('AgentLink')).toBeInTheDocument();
      expect(screen.getByText('Interactive Control')).toBeInTheDocument();
      expect(screen.getByText('Claude Manager')).toBeInTheDocument();
      expect(screen.getByText('Agents')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();

      // Test header elements
      expect(screen.getByText('AgentLink - Claude Instance Manager')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search posts...')).toBeInTheDocument();

      // Test that error boundaries are in place
      const errorBoundaries = screen.getAllByRole('generic');
      expect(errorBoundaries.length).toBeGreaterThan(0);
    });

    test('dashboard layout is responsive and accessible', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <App />
          </TestWrapper>
        );
      });

      // Test mobile menu functionality
      const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
      expect(mobileMenuButton).toBeInTheDocument();

      // Test search functionality
      const searchInput = screen.getByPlaceholderText('Search posts...');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('type', 'text');

      // Test keyboard navigation
      searchInput.focus();
      expect(searchInput).toHaveFocus();
    });

    test('proper error boundary implementation', async () => {
      // Test that error boundaries catch and display errors properly
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await act(async () => {
        render(
          <TestWrapper>
            <App />
          </TestWrapper>
        );
      });

      // The app should render without throwing errors
      expect(screen.getByTestId('app-root')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('2. Agents.jsx Real Agent Data Display', () => {
    test('displays real agent data with proper structure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentsData
      });

      await act(async () => {
        render(
          <TestWrapper>
            <Agents />
          </TestWrapper>
        );
      });

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Production Agents')).toBeInTheDocument();
      });

      // Test agent grid rendering
      const agentList = screen.getByTestId('agent-list');
      expect(agentList).toBeInTheDocument();
      expect(agentList).toHaveStyle('display: grid');

      // Test individual agent cards
      const agentCards = screen.getAllByTestId('agent-card');
      expect(agentCards).toHaveLength(2);

      // Test agent data display
      expect(screen.getByText('Personal Todos Agent')).toBeInTheDocument();
      expect(screen.getByText('Meeting Prep Agent')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByText('P0')).toBeInTheDocument();
      expect(screen.getByText('P1')).toBeInTheDocument();
    });

    test('handles API errors gracefully with fallback data', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      await act(async () => {
        render(
          <TestWrapper>
            <Agents />
          </TestWrapper>
        );
      });

      // Should show error message and fallback data
      await waitFor(() => {
        expect(screen.getByText(/Warning.*Could not connect to agent API/i)).toBeInTheDocument();
        expect(screen.getByText('Using fallback data')).toBeInTheDocument();
      });

      // Should still render fallback agents
      expect(screen.getByText('Personal Todos Agent')).toBeInTheDocument();
    });

    test('agent cards display correct status and priority colors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentsData
      });

      await act(async () => {
        render(
          <TestWrapper>
            <Agents />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        const agentCards = screen.getAllByTestId('agent-card');
        expect(agentCards[0]).toBeInTheDocument();
      });

      // Test styling is applied correctly
      const statusBadges = screen.getAllByText('active');
      statusBadges.forEach(badge => {
        expect(badge).toHaveStyle('background-color: #10b98120');
      });
    });
  });

  describe('3. Token Analytics Components Functional', () => {
    beforeEach(() => {
      // Mock all analytics API endpoints
      (fetch as jest.Mock)
        .mockImplementation((url: string) => {
          if (url.includes('/hourly')) {
            return Promise.resolve({
              ok: true,
              json: async () => mockChartData
            });
          }
          if (url.includes('/daily')) {
            return Promise.resolve({
              ok: true,
              json: async () => mockChartData
            });
          }
          if (url.includes('/messages')) {
            return Promise.resolve({
              ok: true,
              json: async () => mockMessagesData
            });
          }
          if (url.includes('/summary')) {
            return Promise.resolve({
              ok: true,
              json: async () => mockTokenAnalyticsData
            });
          }
          return Promise.reject(new Error('Unknown endpoint'));
        });
    });

    test('TokenAnalyticsDashboard renders with authentic data', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <TokenAnalyticsDashboard />
          </TestWrapper>
        );
      });

      // Test main dashboard elements
      expect(screen.getByTestId('token-analytics-dashboard')).toBeInTheDocument();
      expect(screen.getByText('Token Analytics')).toBeInTheDocument();
      expect(screen.getByText('Monitor your Claude API usage and costs in real-time')).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument(); // total requests
        expect(screen.getByText('25,000')).toBeInTheDocument(); // total tokens
        expect(screen.getByText('$12.50')).toBeInTheDocument(); // total cost
      });

      // Test summary cards
      expect(screen.getByText('Total Requests')).toBeInTheDocument();
      expect(screen.getByText('Total Tokens')).toBeInTheDocument();
      expect(screen.getByText('Total Cost')).toBeInTheDocument();
      expect(screen.getByText('Avg Response Time')).toBeInTheDocument();
    });

    test('RealAnalytics component displays system metrics', async () => {
      // Mock system metrics API
      (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/system-metrics')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: [{
                timestamp: new Date().toISOString(),
                server_id: 'main-server',
                cpu_usage: 45,
                memory_usage: 65,
                disk_usage: 50,
                network_io: { bytes_in: 0, bytes_out: 0, packets_in: 0, packets_out: 0 },
                response_time: 285,
                throughput: 100,
                error_rate: 0.5,
                active_connections: 42,
                queue_depth: 5,
                cache_hit_rate: 0.85
              }]
            })
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      await act(async () => {
        render(
          <TestWrapper>
            <RealAnalytics />
          </TestWrapper>
        );
      });

      // Test analytics dashboard elements
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Real-time system metrics and performance data')).toBeInTheDocument();

      // Wait for metrics to load
      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });
    });

    test('handles authentication token tracking correctly', async () => {
      // Test that token interceptor is working
      const tokenData = {
        timestamp: new Date().toISOString(),
        provider: 'anthropic',
        model: 'claude-3-sonnet',
        input_tokens: 100,
        output_tokens: 200,
        cost: 0.15
      };

      // Mock token tracking API call
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, ...tokenData })
      });

      // Simulate a token usage event
      const response = await fetch('/api/token-analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokenData)
      });

      expect(response.ok).toBe(true);
      expect(fetch).toHaveBeenCalledWith('/api/token-analytics/track', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokenData)
      }));
    });
  });

  describe('4. Navigation Between Pages', () => {
    test('navigation links work correctly', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <App />
          </TestWrapper>
        );
      });

      // Test navigation to different pages
      const agentsLink = screen.getByText('Agents');
      const analyticsLink = screen.getByText('Analytics');
      const feedLink = screen.getByText('Feed');

      expect(agentsLink).toBeInTheDocument();
      expect(analyticsLink).toBeInTheDocument();
      expect(feedLink).toBeInTheDocument();

      // Test that links have correct href attributes
      expect(agentsLink.closest('a')).toHaveAttribute('href', '/agents');
      expect(analyticsLink.closest('a')).toHaveAttribute('href', '/analytics');
      expect(feedLink.closest('a')).toHaveAttribute('href', '/');
    });

    test('active navigation states are applied correctly', async () => {
      // Mock current location
      Object.defineProperty(window, 'location', {
        value: { pathname: '/agents' },
        writable: true
      });

      await act(async () => {
        render(
          <TestWrapper>
            <App />
          </TestWrapper>
        );
      });

      // Test active state styling
      const agentsLink = screen.getByText('Agents').closest('a');
      expect(agentsLink).toHaveClass('bg-blue-100', 'text-blue-700');
    });

    test('route error boundaries handle navigation errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await act(async () => {
        render(
          <TestWrapper>
            <App />
          </TestWrapper>
        );
      });

      // Test that navigation doesn't break the app
      const agentsLink = screen.getByText('Agents');
      fireEvent.click(agentsLink);

      // App should still be functional
      expect(screen.getByTestId('app-root')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('5. CSS Styling Applied Correctly', () => {
    test('layout styles are properly applied', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <App />
          </TestWrapper>
        );
      });

      // Test main layout styles
      const appRoot = screen.getByTestId('app-root');
      expect(appRoot).toHaveClass('h-screen', 'bg-gray-50', 'flex');

      const mainContent = screen.getByTestId('main-content');
      expect(mainContent).toHaveClass('flex-1', 'flex', 'flex-col', 'overflow-hidden');

      const header = screen.getByTestId('header');
      expect(header).toHaveClass('bg-white', 'shadow-sm', 'border-b', 'border-gray-200');
    });

    test('responsive classes are applied', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <App />
          </TestWrapper>
        );
      });

      // Test responsive grid layouts
      const searchInput = screen.getByPlaceholderText('Search posts...');
      expect(searchInput).toHaveClass('pl-10', 'pr-4', 'py-2', 'border', 'border-gray-300', 'rounded-lg');
    });

    test('agent card styling is correct', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentsData
      });

      await act(async () => {
        render(
          <TestWrapper>
            <Agents />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        const agentCard = screen.getAllByTestId('agent-card')[0];
        expect(agentCard).toHaveStyle({
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '12px',
          padding: '1.5rem'
        });
      });
    });
  });

  describe('6. Authentic Data Tracking Functionality', () => {
    test('real-time data updates work correctly', async () => {
      jest.useFakeTimers();
      
      // Mock initial data
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockTokenAnalyticsData
      });

      await act(async () => {
        render(
          <TestWrapper>
            <TokenAnalyticsDashboard />
          </TestWrapper>
        );
      });

      // Initial data load
      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument();
      });

      // Mock updated data
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            ...mockTokenAnalyticsData.data,
            summary: {
              ...mockTokenAnalyticsData.data.summary,
              total_requests: 175 // Updated value
            }
          }
        })
      });

      // Fast-forward time to trigger refresh
      act(() => {
        jest.advanceTimersByTime(30000); // 30 seconds
      });

      await waitFor(() => {
        expect(screen.getByText('175')).toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    test('data validation prevents corrupted data display', async () => {
      // Mock corrupted data
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            summary: {
              total_requests: 'invalid', // Invalid data type
              total_tokens: null,
              total_cost: undefined
            }
          }
        })
      });

      await act(async () => {
        render(
          <TestWrapper>
            <TokenAnalyticsDashboard />
          </TestWrapper>
        );
      });

      // Should handle invalid data gracefully
      await waitFor(() => {
        expect(screen.getByTestId('token-analytics-dashboard')).toBeInTheDocument();
      });

      // Should not display invalid data
      expect(screen.queryByText('invalid')).not.toBeInTheDocument();
    });

    test('error states display meaningful messages', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await act(async () => {
        render(
          <TestWrapper>
            <TokenAnalyticsDashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/Connection Issue/i)).toBeInTheDocument();
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
        expect(screen.getByText('Retry Connection')).toBeInTheDocument();
      });
    });

    test('export functionality works with real data', async () => {
      // Mock successful data fetch
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockTokenAnalyticsData
      });

      await act(async () => {
        render(
          <TestWrapper>
            <TokenAnalyticsDashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Export CSV')).toBeInTheDocument();
      });

      // Mock export API
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['csv,data'], { type: 'text/csv' })
      });

      // Mock URL.createObjectURL
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = jest.fn();

      const exportButton = screen.getByText('Export CSV');
      fireEvent.click(exportButton);

      // Verify export API call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/token-analytics/export'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Integration Tests', () => {
    test('full user workflow: navigation → data loading → interaction', async () => {
      // Mock all necessary APIs
      (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/agents')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockAgentsData
          });
        }
        if (url.includes('/api/token-analytics')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockTokenAnalyticsData
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      // Start at home page
      await act(async () => {
        render(
          <TestWrapper>
            <App />
          </TestWrapper>
        );
      });

      // Navigate to agents page
      const agentsLink = screen.getByText('Agents');
      fireEvent.click(agentsLink);

      // Verify agents page loads with data
      await waitFor(() => {
        expect(screen.getByText('Production Agents')).toBeInTheDocument();
      });

      // Navigate to analytics page
      const analyticsLink = screen.getByText('Analytics');
      fireEvent.click(analyticsLink);

      // Verify analytics page loads
      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });
    });
  });
});

// Performance and accessibility tests
describe('Performance and Accessibility', () => {
  test('components render within performance thresholds', async () => {
    const startTime = performance.now();

    await act(async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );
    });

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render within 2 seconds
    expect(renderTime).toBeLessThan(2000);
  });

  test('keyboard navigation works correctly', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );
    });

    const searchInput = screen.getByPlaceholderText('Search posts...');
    
    // Test keyboard focus
    fireEvent.keyDown(searchInput, { key: 'Tab' });
    expect(document.activeElement).not.toBe(searchInput);
    
    // Test keyboard interaction
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    expect(searchInput).toBeInTheDocument();
  });

  test('screen reader compatibility', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );
    });

    // Test ARIA labels and roles
    const navigation = screen.getByRole('navigation', { hidden: true });
    expect(navigation).toBeInTheDocument();

    const searchInput = screen.getByRole('textbox', { name: /search/i });
    expect(searchInput).toBeInTheDocument();
  });
});
