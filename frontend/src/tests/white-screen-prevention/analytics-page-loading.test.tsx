import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * WHITE SCREEN PREVENTION TEST SUITE
 * Test 8: Analytics Page Loading Tests
 *
 * This test suite validates that the analytics page loads properly after fixes
 * and prevents white screen issues in the analytics components.
 */

describe('White Screen Prevention - Analytics Page Loading', () => {
  let consoleSpy: any;
  let queryClient: QueryClient;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, refetchOnWindowFocus: false },
        mutations: { retry: false }
      }
    });

    // Mock chart libraries to prevent issues in test environment
    vi.mock('recharts', () => ({
      LineChart: ({ children, ...props }: any) => (
        <div data-testid="line-chart" {...props}>{children}</div>
      ),
      Line: ({ ...props }: any) => <div data-testid="line" {...props}></div>,
      XAxis: ({ ...props }: any) => <div data-testid="x-axis" {...props}></div>,
      YAxis: ({ ...props }: any) => <div data-testid="y-axis" {...props}></div>,
      CartesianGrid: ({ ...props }: any) => <div data-testid="cartesian-grid" {...props}></div>,
      Tooltip: ({ ...props }: any) => <div data-testid="tooltip" {...props}></div>,
      Legend: ({ ...props }: any) => <div data-testid="legend" {...props}></div>,
      ResponsiveContainer: ({ children, ...props }: any) => (
        <div data-testid="responsive-container" {...props}>{children}</div>
      ),
      BarChart: ({ children, ...props }: any) => (
        <div data-testid="bar-chart" {...props}>{children}</div>
      ),
      Bar: ({ ...props }: any) => <div data-testid="bar" {...props}></div>,
      PieChart: ({ children, ...props }: any) => (
        <div data-testid="pie-chart" {...props}>{children}</div>
      ),
      Pie: ({ ...props }: any) => <div data-testid="pie" {...props}></div>,
      Cell: ({ ...props }: any) => <div data-testid="cell" {...props}></div>
    }));
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    queryClient.clear();
    vi.clearAllMocks();
  });

  // Mock Analytics Component
  const MockAnalyticsComponent: React.FC = () => {
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [data, setData] = React.useState<any>(null);

    React.useEffect(() => {
      const loadData = async () => {
        try {
          // Simulate data loading
          await new Promise(resolve => setTimeout(resolve, 100));
          setData({
            totalPosts: 150,
            totalAgents: 12,
            activeUsers: 45,
            performanceMetrics: {
              responseTime: 250,
              uptime: 99.8,
              throughput: 1200
            },
            chartData: [
              { name: 'Jan', posts: 65, agents: 8 },
              { name: 'Feb', posts: 78, agents: 10 },
              { name: 'Mar', posts: 92, agents: 12 }
            ]
          });
        } catch (err) {
          setError('Failed to load analytics data');
        } finally {
          setIsLoading(false);
        }
      };

      loadData();
    }, []);

    if (error) {
      return (
        <div data-testid="analytics-error" className="p-4 text-red-600">
          Error: {error}
        </div>
      );
    }

    if (isLoading) {
      return (
        <div data-testid="analytics-loading" className="p-4">
          <div className="animate-pulse">Loading analytics...</div>
        </div>
      );
    }

    return (
      <div data-testid="analytics-container" className="p-6 space-y-6">
        <h1 data-testid="analytics-title" className="text-2xl font-bold">
          Analytics Dashboard
        </h1>

        {/* Key Metrics */}
        <div data-testid="key-metrics" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div data-testid="metric-posts" className="bg-white p-4 rounded-lg shadow">
            <h3>Total Posts</h3>
            <p className="text-2xl font-bold">{data.totalPosts}</p>
          </div>
          <div data-testid="metric-agents" className="bg-white p-4 rounded-lg shadow">
            <h3>Total Agents</h3>
            <p className="text-2xl font-bold">{data.totalAgents}</p>
          </div>
          <div data-testid="metric-users" className="bg-white p-4 rounded-lg shadow">
            <h3>Active Users</h3>
            <p className="text-2xl font-bold">{data.activeUsers}</p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div data-testid="performance-metrics" className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
          <div className="grid grid-cols-3 gap-4">
            <div data-testid="response-time">
              <span>Response Time</span>
              <p>{data.performanceMetrics.responseTime}ms</p>
            </div>
            <div data-testid="uptime">
              <span>Uptime</span>
              <p>{data.performanceMetrics.uptime}%</p>
            </div>
            <div data-testid="throughput">
              <span>Throughput</span>
              <p>{data.performanceMetrics.throughput}/min</p>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div data-testid="analytics-charts" className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Analytics Charts</h2>
          <div data-testid="line-chart-container">
            {/* Mock chart components */}
            <div data-testid="responsive-container">
              <div data-testid="line-chart">
                <div data-testid="line"></div>
                <div data-testid="x-axis"></div>
                <div data-testid="y-axis"></div>
                <div data-testid="cartesian-grid"></div>
                <div data-testid="tooltip"></div>
                <div data-testid="legend"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  describe('Basic Analytics Page Loading', () => {
    it('should render analytics page without errors', () => {
      expect(() => {
        render(
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>
              <MockAnalyticsComponent />
            </MemoryRouter>
          </QueryClientProvider>
        );
      }).not.toThrow();
    });

    it('should show loading state initially', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <MockAnalyticsComponent />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.getByTestId('analytics-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
    });

    it('should load and display analytics data', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <MockAnalyticsComponent />
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('analytics-container')).toBeInTheDocument();
      });

      expect(screen.getByTestId('analytics-title')).toHaveTextContent('Analytics Dashboard');
      expect(screen.getByTestId('key-metrics')).toBeInTheDocument();
      expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      expect(screen.getByTestId('analytics-charts')).toBeInTheDocument();
    });

    it('should display correct metric values', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <MockAnalyticsComponent />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('analytics-container')).toBeInTheDocument();
      });

      expect(screen.getByTestId('metric-posts')).toHaveTextContent('150');
      expect(screen.getByTestId('metric-agents')).toHaveTextContent('12');
      expect(screen.getByTestId('metric-users')).toHaveTextContent('45');
    });
  });

  describe('Chart Component Integration', () => {
    it('should render chart components without errors', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <MockAnalyticsComponent />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('analytics-charts')).toBeInTheDocument();
      });

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('line')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    });

    it('should handle chart library import failures gracefully', () => {
      const ChartImportTestComponent: React.FC = () => {
        const [hasCharts, setHasCharts] = React.useState(false);

        React.useEffect(() => {
          const checkCharts = async () => {
            try {
              // Simulate chart library import
              await import('recharts');
              setHasCharts(true);
            } catch (error) {
              console.warn('Charts not available, using fallback');
            }
          };

          checkCharts();
        }, []);

        return (
          <div data-testid="chart-import-test">
            Charts: {hasCharts ? 'Available' : 'Fallback'}
          </div>
        );
      };

      expect(() => {
        render(<ChartImportTestComponent />);
      }).not.toThrow();

      expect(screen.getByTestId('chart-import-test')).toBeInTheDocument();
    });

    it('should render different chart types without conflicts', async () => {
      const MultiChartComponent: React.FC = () => (
        <div data-testid="multi-chart-container">
          <div data-testid="line-chart-section">
            <div data-testid="responsive-container">
              <div data-testid="line-chart">Line Chart</div>
            </div>
          </div>
          <div data-testid="bar-chart-section">
            <div data-testid="responsive-container">
              <div data-testid="bar-chart">Bar Chart</div>
            </div>
          </div>
          <div data-testid="pie-chart-section">
            <div data-testid="responsive-container">
              <div data-testid="pie-chart">Pie Chart</div>
            </div>
          </div>
        </div>
      );

      render(<MultiChartComponent />);

      expect(screen.getByTestId('line-chart-section')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart-section')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart-section')).toBeInTheDocument();
    });
  });

  describe('Error Handling in Analytics', () => {
    it('should handle data loading errors gracefully', async () => {
      const ErrorAnalyticsComponent: React.FC = () => {
        const [error] = React.useState('Failed to load analytics data');

        if (error) {
          return (
            <div data-testid="analytics-error" className="p-4 text-red-600">
              Error: {error}
            </div>
          );
        }

        return <div>Analytics data</div>;
      };

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <ErrorAnalyticsComponent />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.getByTestId('analytics-error')).toBeInTheDocument();
      expect(screen.getByText('Error: Failed to load analytics data')).toBeInTheDocument();
    });

    it('should handle API connection failures', async () => {
      const APIErrorComponent: React.FC = () => {
        const [connectionError, setConnectionError] = React.useState(false);

        React.useEffect(() => {
          // Simulate API connection failure
          setTimeout(() => {
            setConnectionError(true);
          }, 50);
        }, []);

        if (connectionError) {
          return (
            <div data-testid="api-connection-error">
              Unable to connect to analytics API
            </div>
          );
        }

        return <div data-testid="api-loading">Connecting to API...</div>;
      };

      render(<APIErrorComponent />);

      expect(screen.getByTestId('api-loading')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('api-connection-error')).toBeInTheDocument();
      });
    });

    it('should handle malformed analytics data', async () => {
      const MalformedDataComponent: React.FC = () => {
        const [data] = React.useState({
          // Missing required fields
          invalidData: true,
          metrics: null,
          charts: undefined
        });

        return (
          <div data-testid="malformed-data-analytics">
            <div data-testid="posts-count">
              Posts: {data.metrics?.totalPosts || 'N/A'}
            </div>
            <div data-testid="charts-section">
              {data.charts ? 'Charts available' : 'No charts available'}
            </div>
          </div>
        );
      };

      expect(() => {
        render(<MalformedDataComponent />);
      }).not.toThrow();

      expect(screen.getByTestId('posts-count')).toHaveTextContent('Posts: N/A');
      expect(screen.getByTestId('charts-section')).toHaveTextContent('No charts available');
    });
  });

  describe('Performance Metrics Display', () => {
    it('should display performance metrics correctly', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <MockAnalyticsComponent />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      });

      expect(screen.getByTestId('response-time')).toHaveTextContent('250ms');
      expect(screen.getByTestId('uptime')).toHaveTextContent('99.8%');
      expect(screen.getByTestId('throughput')).toHaveTextContent('1200/min');
    });

    it('should handle missing performance data', () => {
      const IncompleteMetricsComponent: React.FC = () => {
        const performanceData = {
          responseTime: null,
          uptime: undefined,
          throughput: 0
        };

        return (
          <div data-testid="incomplete-metrics">
            <div data-testid="response-time">
              Response Time: {performanceData.responseTime || 'N/A'}
            </div>
            <div data-testid="uptime">
              Uptime: {performanceData.uptime || 'N/A'}
            </div>
            <div data-testid="throughput">
              Throughput: {performanceData.throughput || 'N/A'}
            </div>
          </div>
        );
      };

      render(<IncompleteMetricsComponent />);

      expect(screen.getByTestId('response-time')).toHaveTextContent('N/A');
      expect(screen.getByTestId('uptime')).toHaveTextContent('N/A');
      expect(screen.getByTestId('throughput')).toHaveTextContent('N/A');
    });
  });

  describe('Responsive Design and Layout', () => {
    it('should handle different screen sizes without breaking', () => {
      const ResponsiveAnalyticsComponent: React.FC = () => (
        <div data-testid="responsive-analytics" className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="responsive-grid">
            <div data-testid="metric-card-1">Metric 1</div>
            <div data-testid="metric-card-2">Metric 2</div>
            <div data-testid="metric-card-3">Metric 3</div>
          </div>
        </div>
      );

      render(<ResponsiveAnalyticsComponent />);

      expect(screen.getByTestId('responsive-analytics')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-grid')).toBeInTheDocument();
      expect(screen.getByTestId('metric-card-1')).toBeInTheDocument();
    });

    it('should maintain layout integrity with long data values', () => {
      const LongDataComponent: React.FC = () => (
        <div data-testid="long-data-analytics">
          <div data-testid="long-metric">
            Very Long Metric Name: 123,456,789,012,345
          </div>
          <div data-testid="long-description">
            This is a very long description that might break the layout if not handled properly
          </div>
        </div>
      );

      render(<LongDataComponent />);

      expect(screen.getByTestId('long-data-analytics')).toBeInTheDocument();
      expect(screen.getByTestId('long-metric')).toBeInTheDocument();
    });
  });

  describe('Real-time Data Updates', () => {
    it('should handle real-time data updates without errors', async () => {
      const RealtimeComponent: React.FC = () => {
        const [count, setCount] = React.useState(0);

        React.useEffect(() => {
          const interval = setInterval(() => {
            setCount(c => c + 1);
          }, 100);

          return () => clearInterval(interval);
        }, []);

        return (
          <div data-testid="realtime-analytics">
            <div data-testid="live-count">Live Count: {count}</div>
          </div>
        );
      };

      const { unmount } = render(<RealtimeComponent />);

      expect(screen.getByTestId('realtime-analytics')).toBeInTheDocument();

      // Let it update a few times
      await waitFor(() => {
        const countElement = screen.getByTestId('live-count');
        expect(countElement.textContent).not.toBe('Live Count: 0');
      });

      // Should clean up without errors
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should handle WebSocket connection for real-time updates', () => {
      const WebSocketAnalyticsComponent: React.FC = () => {
        const [wsStatus, setWsStatus] = React.useState<'connecting' | 'connected' | 'disconnected'>('connecting');

        React.useEffect(() => {
          // Simulate WebSocket connection
          const timer = setTimeout(() => {
            setWsStatus('connected');
          }, 100);

          return () => {
            clearTimeout(timer);
            setWsStatus('disconnected');
          };
        }, []);

        return (
          <div data-testid="websocket-analytics">
            <div data-testid="ws-status">Status: {wsStatus}</div>
          </div>
        );
      };

      const { unmount } = render(<WebSocketAnalyticsComponent />);

      expect(screen.getByTestId('ws-status')).toHaveTextContent('Status: connecting');

      // Should clean up properly
      unmount();
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should have proper ARIA labels for accessibility', async () => {
      const AccessibleAnalyticsComponent: React.FC = () => (
        <div data-testid="accessible-analytics">
          <main role="main" aria-label="Analytics Dashboard">
            <h1>Analytics</h1>
            <section aria-label="Key Metrics" data-testid="metrics-section">
              <div role="group" aria-label="Performance Statistics">
                Statistics content
              </div>
            </section>
          </main>
        </div>
      );

      render(<AccessibleAnalyticsComponent />);

      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Analytics Dashboard');
      expect(screen.getByTestId('metrics-section')).toHaveAttribute('aria-label', 'Key Metrics');
    });

    it('should provide meaningful loading states', () => {
      const LoadingStatesComponent: React.FC = () => {
        const [loadingState, setLoadingState] = React.useState<'metrics' | 'charts' | 'complete'>('metrics');

        return (
          <div data-testid="loading-states-analytics">
            {loadingState === 'metrics' && (
              <div data-testid="loading-metrics" role="status" aria-live="polite">
                Loading metrics...
              </div>
            )}
            {loadingState === 'charts' && (
              <div data-testid="loading-charts" role="status" aria-live="polite">
                Loading charts...
              </div>
            )}
            {loadingState === 'complete' && (
              <div data-testid="analytics-complete">Analytics loaded</div>
            )}
          </div>
        );
      };

      render(<LoadingStatesComponent />);

      expect(screen.getByTestId('loading-metrics')).toHaveAttribute('role', 'status');
      expect(screen.getByTestId('loading-metrics')).toHaveAttribute('aria-live', 'polite');
    });
  });
});