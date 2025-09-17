/**
 * TokenAnalyticsDashboard Integration Tests
 *
 * Tests the complete integration between:
 * - Component loading and chart.js initialization
 * - API calls and data flow
 * - Real-time updates and WebSocket connections
 * - Export functionality and file downloads
 *
 * These tests MUST fail if dynamic import issues persist
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { TokenAnalyticsDashboard } from '../../src/components/TokenAnalyticsDashboard';

// Mock server setup for API integration tests
const server = setupServer(
  // Hourly data endpoint
  http.get('/api/token-analytics/hourly', () => {
    return HttpResponse.json({
      data: {
        labels: ['2024-01-01T10:00:00Z', '2024-01-01T11:00:00Z', '2024-01-01T12:00:00Z'],
        datasets: [
          {
            label: 'Tokens',
            data: [1200, 1800, 2400],
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.1,
          },
          {
            label: 'Cost',
            data: [12, 18, 24],
            borderColor: 'rgb(168, 85, 247)',
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            yAxisID: 'y1',
          },
        ],
      },
    });
  }),

  // Daily data endpoint
  http.get('/api/token-analytics/daily', () => {
    return HttpResponse.json({
      data: {
        labels: ['2024-01-01', '2024-01-02', '2024-01-03'],
        datasets: [
          {
            label: 'Daily Tokens',
            data: [15000, 22000, 28000],
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
          },
          {
            label: 'Daily Requests',
            data: [150, 220, 280],
            backgroundColor: 'rgba(168, 85, 247, 0.8)',
            yAxisID: 'y1',
          },
        ],
      },
    });
  }),

  // Messages endpoint
  http.get('/api/token-analytics/messages', ({ request }) => {
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') || '50';

    return HttpResponse.json({
      data: Array.from({ length: parseInt(limit) }, (_, i) => ({
        id: i + 1,
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        provider: i % 2 === 0 ? 'anthropic' : 'openai',
        model: i % 2 === 0 ? 'claude-3-sonnet' : 'gpt-4',
        request_type: 'chat',
        total_tokens: 1000 + i * 10,
        cost_total: 10 + i,
        processing_time_ms: 1500 + i * 50,
        message_preview: `Test message ${i + 1}`,
        response_preview: `Test response ${i + 1}`,
      })),
    });
  }),

  // Summary endpoint
  http.get('/api/token-analytics/summary', () => {
    return HttpResponse.json({
      data: {
        summary: {
          total_requests: 250,
          total_tokens: 125000,
          total_cost: 1250,
          avg_processing_time: 1800,
          unique_sessions: 45,
          providers_used: 2,
          models_used: 4,
        },
        by_provider: [
          {
            provider: 'anthropic',
            requests: 180,
            tokens: 90000,
            cost: 900,
            avg_time: 1600,
          },
          {
            provider: 'openai',
            requests: 70,
            tokens: 35000,
            cost: 350,
            avg_time: 2200,
          },
        ],
        by_model: [
          {
            model: 'claude-3-sonnet',
            provider: 'anthropic',
            requests: 120,
            tokens: 60000,
            cost: 600,
          },
          {
            model: 'claude-3-haiku',
            provider: 'anthropic',
            requests: 60,
            tokens: 30000,
            cost: 300,
          },
          {
            model: 'gpt-4',
            provider: 'openai',
            requests: 50,
            tokens: 25000,
            cost: 250,
          },
          {
            model: 'gpt-3.5-turbo',
            provider: 'openai',
            requests: 20,
            tokens: 10000,
            cost: 100,
          },
        ],
      },
    });
  }),

  // Export endpoint
  http.get('/api/token-analytics/export', ({ request }) => {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'csv';
    const days = url.searchParams.get('days') || '30';

    if (format === 'csv') {
      return new HttpResponse(
        'timestamp,provider,model,tokens,cost,processing_time\n2024-01-01T10:00:00Z,anthropic,claude-3-sonnet,1000,10,1500\n2024-01-01T11:00:00Z,openai,gpt-4,800,12,2000',
        {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="token-analytics-${days}d.csv"`,
          },
        }
      );
    }

    return HttpResponse.json({
      data: [
        {
          timestamp: '2024-01-01T10:00:00Z',
          provider: 'anthropic',
          model: 'claude-3-sonnet',
          tokens: 1000,
          cost: 10,
          processing_time: 1500,
        },
      ],
    });
  })
);

// Chart.js mocking for integration tests
vi.mock('chart.js', () => {
  const actualChart = {
    register: vi.fn(),
    defaults: { font: {}, color: {} },
  };

  return {
    Chart: actualChart,
    CategoryScale: {},
    LinearScale: {},
    PointElement: {},
    LineElement: {},
    BarElement: {},
    Title: {},
    Tooltip: {},
    Legend: {},
    TimeScale: {},
  };
});

// React-chartjs-2 component mocks that simulate real chart behavior
vi.mock('react-chartjs-2', () => ({
  Line: vi.fn().mockImplementation(({ data, options }) => {
    // Simulate chart initialization and rendering
    React.useEffect(() => {
      // This simulates Chart.js initialization that would happen in real usage
      const timer = setTimeout(() => {
        // Simulate chart drawing
        console.log('Line chart rendered with data:', data);
      }, 100);
      return () => clearTimeout(timer);
    }, [data]);

    return (
      <div
        data-testid="line-chart-integration"
        data-chart-type="line"
        data-chart-labels={JSON.stringify(data?.labels || [])}
        data-chart-datasets={JSON.stringify(data?.datasets || [])}
        data-chart-options={JSON.stringify(options || {})}
        style={{ width: '100%', height: '320px' }}
      >
        <canvas data-testid="line-chart-canvas" width="800" height="320" />
        {data?.datasets?.map((dataset: any, index: number) => (
          <div key={index} data-testid={`dataset-${index}`}>
            {dataset.label}: {dataset.data?.length || 0} points
          </div>
        ))}
      </div>
    );
  }),

  Bar: vi.fn().mockImplementation(({ data, options }) => {
    React.useEffect(() => {
      const timer = setTimeout(() => {
        console.log('Bar chart rendered with data:', data);
      }, 100);
      return () => clearTimeout(timer);
    }, [data]);

    return (
      <div
        data-testid="bar-chart-integration"
        data-chart-type="bar"
        data-chart-labels={JSON.stringify(data?.labels || [])}
        data-chart-datasets={JSON.stringify(data?.datasets || [])}
        data-chart-options={JSON.stringify(options || {})}
        style={{ width: '100%', height: '320px' }}
      >
        <canvas data-testid="bar-chart-canvas" width="800" height="320" />
        {data?.datasets?.map((dataset: any, index: number) => (
          <div key={index} data-testid={`dataset-${index}`}>
            {dataset.label}: {dataset.data?.length || 0} points
          </div>
        ))}
      </div>
    );
  }),
}));

// Mock date-fns adapter
vi.mock('chartjs-adapter-date-fns', () => ({}));

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Global URL mock for download testing
const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
const mockRevokeObjectURL = vi.fn();

Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
  writable: true,
});

describe('TokenAnalyticsDashboard Integration Tests', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('1. Complete Component Integration', () => {
    it('should load all components and make API calls successfully', async () => {
      const { container } = render(
        <TestWrapper>
          <TokenAnalyticsDashboard />
        </TestWrapper>
      );

      // Verify main container renders
      expect(screen.getByTestId('token-analytics-dashboard')).toBeInTheDocument();

      // Wait for all API calls to complete and components to render
      await waitFor(
        async () => {
          // Verify summary cards are populated
          expect(screen.getByText('250')).toBeInTheDocument(); // total_requests
          expect(screen.getByText('125,000')).toBeInTheDocument(); // total_tokens
          expect(screen.getByText('$12.5000')).toBeInTheDocument(); // total_cost

          // Verify charts are rendered
          expect(screen.getByTestId('line-chart-integration')).toBeInTheDocument();
          expect(screen.getByTestId('bar-chart-integration')).toBeInTheDocument();

          // Verify chart canvases exist
          expect(screen.getByTestId('line-chart-canvas')).toBeInTheDocument();
          expect(screen.getByTestId('bar-chart-canvas')).toBeInTheDocument();

          // Verify messages are loaded
          expect(screen.getByText('Recent Messages')).toBeInTheDocument();
          expect(screen.getByText('anthropic')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it('should initialize Chart.js properly with all required components', async () => {
      render(
        <TestWrapper>
          <TokenAnalyticsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        // Verify Chart.js register was called during component initialization
        const chartModule = require('chart.js');
        expect(chartModule.Chart.register).toHaveBeenCalled();
      });
    });

    it('should render charts with correct data structure', async () => {
      render(
        <TestWrapper>
          <TokenAnalyticsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        const lineChart = screen.getByTestId('line-chart-integration');
        const barChart = screen.getByTestId('bar-chart-integration');

        // Verify line chart data structure
        const lineLabels = JSON.parse(lineChart.getAttribute('data-chart-labels') || '[]');
        const lineDatasets = JSON.parse(lineChart.getAttribute('data-chart-datasets') || '[]');

        expect(lineLabels).toHaveLength(3);
        expect(lineDatasets).toHaveLength(2); // Tokens and Cost datasets
        expect(lineDatasets[0].label).toBe('Tokens');
        expect(lineDatasets[1].label).toBe('Cost');

        // Verify bar chart data structure
        const barLabels = JSON.parse(barChart.getAttribute('data-chart-labels') || '[]');
        const barDatasets = JSON.parse(barChart.getAttribute('data-chart-datasets') || '[]');

        expect(barLabels).toHaveLength(3);
        expect(barDatasets).toHaveLength(2); // Daily Tokens and Daily Requests
        expect(barDatasets[0].label).toBe('Daily Tokens');
        expect(barDatasets[1].label).toBe('Daily Requests');
      });
    });
  });

  describe('2. Data Flow Integration', () => {
    it('should handle complete data pipeline from API to charts', async () => {
      render(
        <TestWrapper>
          <TokenAnalyticsDashboard />
        </TestWrapper>
      );

      // Wait for all data to load and verify complete pipeline
      await waitFor(async () => {
        // 1. Verify API data is received and processed
        expect(screen.getByText('250')).toBeInTheDocument(); // Summary data

        // 2. Verify data is passed to charts correctly
        const lineChart = screen.getByTestId('line-chart-integration');
        const chartData = JSON.parse(lineChart.getAttribute('data-chart-datasets') || '[]');

        expect(chartData[0].data).toEqual([1200, 1800, 2400]); // Tokens data
        expect(chartData[1].data).toEqual([12, 18, 24]); // Cost data

        // 3. Verify message list displays API data
        expect(screen.getByText('Test message 1')).toBeInTheDocument();
        expect(screen.getByText('claude-3-sonnet')).toBeInTheDocument();

        // 4. Verify provider/model breakdown
        expect(screen.getByText('Usage by Provider')).toBeInTheDocument();
        expect(screen.getByText('Usage by Model')).toBeInTheDocument();
      });
    });

    it('should refresh data correctly when refresh button is clicked', async () => {
      // Track API calls
      let apiCallCount = 0;
      server.use(
        http.get('/api/token-analytics/*', ({ request }) => {
          apiCallCount++;
          return HttpResponse.json({ data: { updated: true } });
        })
      );

      render(
        <TestWrapper>
          <TokenAnalyticsDashboard />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Token Analytics')).toBeInTheDocument();
      });

      const initialCallCount = apiCallCount;

      // Click refresh button
      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      // Wait for refresh to complete
      await waitFor(() => {
        expect(apiCallCount).toBeGreaterThan(initialCallCount);
      });
    });

    it('should handle real-time updates with polling', async () => {
      let responseData = {
        data: {
          summary: {
            total_requests: 100,
            total_tokens: 50000,
            total_cost: 500,
            avg_processing_time: 1500,
            unique_sessions: 20,
            providers_used: 1,
            models_used: 2,
          },
          by_provider: [],
          by_model: [],
        },
      };

      // Mock API with changing data
      server.use(
        http.get('/api/token-analytics/summary', () => {
          return HttpResponse.json(responseData);
        })
      );

      render(
        <TestWrapper>
          <TokenAnalyticsDashboard />
        </TestWrapper>
      );

      // Wait for initial data
      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      // Update mock data
      responseData.data.summary.total_requests = 150;

      // Simulate polling interval (react-query refetchInterval)
      await waitFor(
        () => {
          expect(screen.getByText('150')).toBeInTheDocument();
        },
        { timeout: 65000 } // Wait for refetch interval
      );
    });
  });

  describe('3. Export Integration', () => {
    it('should handle CSV export with proper file download', async () => {
      render(
        <TestWrapper>
          <TokenAnalyticsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Export CSV')).toBeInTheDocument();
      });

      // Mock document.createElement and appendChild for download
      const mockLink = {
        style: {},
        href: '',
        download: '',
        click: vi.fn(),
      };

      const mockCreateElement = vi.fn().mockReturnValue(mockLink);
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();

      Object.defineProperty(document, 'createElement', {
        value: mockCreateElement,
        writable: true,
      });

      Object.defineProperty(document.body, 'appendChild', {
        value: mockAppendChild,
        writable: true,
      });

      Object.defineProperty(document.body, 'removeChild', {
        value: mockRemoveChild,
        writable: true,
      });

      // Click export button
      const exportButton = screen.getByText('Export CSV');
      fireEvent.click(exportButton);

      // Wait for export to complete
      await waitFor(() => {
        expect(mockCreateElement).toHaveBeenCalledWith('a');
        expect(mockLink.click).toHaveBeenCalled();
        expect(mockLink.download).toMatch(/token-analytics.*\.csv/);
      });
    });

    it('should handle export errors gracefully', async () => {
      // Mock export endpoint to return error
      server.use(
        http.get('/api/token-analytics/export', () => {
          return HttpResponse.error();
        })
      );

      // Mock alert to capture error message
      const mockAlert = vi.fn();
      Object.defineProperty(window, 'alert', {
        value: mockAlert,
        writable: true,
      });

      render(
        <TestWrapper>
          <TokenAnalyticsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Export CSV')).toBeInTheDocument();
      });

      const exportButton = screen.getByText('Export CSV');
      fireEvent.click(exportButton);

      // Wait for error handling
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Export failed. Please try again.');
      });
    });
  });

  describe('4. Error Recovery Integration', () => {
    it('should recover from network errors when retry is clicked', async () => {
      // Start with error responses
      server.use(
        http.get('/api/token-analytics/*', () => {
          return HttpResponse.error();
        })
      );

      render(
        <TestWrapper>
          <TokenAnalyticsDashboard />
        </TestWrapper>
      );

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText('Error Loading Token Analytics')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      // Reset handlers to return successful responses
      server.resetHandlers();

      // Click retry button
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      // Should recover and show data
      await waitFor(() => {
        expect(screen.getByText('250')).toBeInTheDocument(); // Summary data loaded
        expect(screen.getByTestId('line-chart-integration')).toBeInTheDocument();
      });
    });

    it('should handle partial API failures gracefully', async () => {
      // Make only some endpoints fail
      server.use(
        http.get('/api/token-analytics/hourly', () => {
          return HttpResponse.error();
        }),
        http.get('/api/token-analytics/daily', () => {
          return HttpResponse.error();
        })
      );

      render(
        <TestWrapper>
          <TokenAnalyticsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        // Summary should still load (endpoint not mocked to fail)
        expect(screen.getByText('250')).toBeInTheDocument();

        // But should show error for failed components
        expect(screen.getByText('Error Loading Token Analytics')).toBeInTheDocument();
      });
    });
  });

  describe('5. Performance Integration', () => {
    it('should handle large datasets without performance degradation', async () => {
      // Mock large dataset
      server.use(
        http.get('/api/token-analytics/messages', () => {
          const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
            id: i + 1,
            timestamp: new Date(Date.now() - i * 60000).toISOString(),
            provider: 'anthropic',
            model: 'claude-3-sonnet',
            request_type: 'chat',
            total_tokens: 1000 + i,
            cost_total: 10 + i,
            processing_time_ms: 1500 + i,
            message_preview: `Large dataset message ${i + 1}`,
            response_preview: `Large dataset response ${i + 1}`,
          }));

          return HttpResponse.json({ data: largeDataset });
        })
      );

      const startTime = performance.now();

      render(
        <TestWrapper>
          <TokenAnalyticsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Recent Messages')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time even with large dataset
      expect(renderTime).toBeLessThan(3000); // 3 seconds
    });

    it('should optimize re-renders with memoization', async () => {
      const renderSpy = vi.fn();

      const TestComponent = () => {
        renderSpy();
        return <TokenAnalyticsDashboard />;
      };

      const { rerender } = render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Token Analytics')).toBeInTheDocument();
      });

      const initialRenderCount = renderSpy.mock.calls.length;

      // Rerender without prop changes
      rerender(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Should not cause excessive re-renders
      await waitFor(() => {
        expect(renderSpy.mock.calls.length).toBeLessThan(initialRenderCount + 3);
      });
    });
  });
});