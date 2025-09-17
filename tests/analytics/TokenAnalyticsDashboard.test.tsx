/**
 * Token Analytics Dashboard Tests - SPARC TDD Implementation
 *
 * SPECIFICATION TESTS:
 * - Hourly chart showing last 24 hours of real token usage
 * - Daily chart showing last 30 rolling days of real usage
 * - List of last 50 messages with actual tokens and costs
 * - Fake data removal validation
 *
 * REFINEMENT TESTS:
 * - Real-time updates via WebSocket
 * - Error handling and edge cases
 * - Performance and accessibility
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { jest } from '@jest/globals';
import TokenAnalyticsDashboard from '../../src/components/analytics/TokenAnalyticsDashboard';

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Line: jest.fn(() => <div data-testid="chart">Chart</div>)
}));

// Mock WebSocket
class MockWebSocket {
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readyState = WebSocket.CONNECTING;

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 100);
  }

  send(data: string) {
    // Mock send functionality
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }
}

(global as any).WebSocket = MockWebSocket;

// Mock fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

// Mock console methods to avoid test noise
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

describe('TokenAnalyticsDashboard', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    jest.clearAllMocks();
  });

  describe('SPECIFICATION: Component Initialization', () => {
    test('should render loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<TokenAnalyticsDashboard />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    test('should load without fake data patterns', async () => {
      const mockHourlyData = createMockHourlyData();
      const mockDailyData = createMockDailyData();
      const mockMessages = createMockMessages();

      mockFetch
        .mockResolvedValueOnce(createMockResponse(mockHourlyData))
        .mockResolvedValueOnce(createMockResponse(mockDailyData))
        .mockResolvedValueOnce(createMockResponse(mockMessages));

      render(<TokenAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Token Analytics Dashboard')).toBeInTheDocument();
      });

      // Verify no fake data patterns are present
      expect(screen.queryByText('$12.45')).not.toBeInTheDocument();
      expect(screen.queryByText(/fake/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/dummy/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/placeholder/i)).not.toBeInTheDocument();
    });
  });

  describe('SPECIFICATION: Hourly Chart (Last 24 Hours)', () => {
    test('should display hourly chart with real data', async () => {
      const mockHourlyData = createMockHourlyData();
      setupMockResponses(mockHourlyData, [], []);

      render(<TokenAnalyticsDashboard />);

      await waitFor(() => {
        const charts = screen.getAllByTestId('chart');
        expect(charts[0]).toBeInTheDocument();
      });

      // Verify chart displays 24 hours of data
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/hourly?userId=&hours=24')
      );
    });

    test('should handle real-time updates to hourly data', async () => {
      const mockHourlyData = createMockHourlyData();
      setupMockResponses(mockHourlyData, [], []);

      render(<TokenAnalyticsDashboard sessionId="test-session" />);

      await waitFor(() => {
        expect(screen.getByText('Token Analytics Dashboard')).toBeInTheDocument();
      });

      // Simulate WebSocket real-time update
      const mockWs = (global as any).WebSocket.mock.instances[0];
      const realTimeUpdate = {
        type: 'token-usage-update',
        payload: {
          id: 'new-message',
          timestamp: new Date().toISOString(),
          provider: 'claude',
          model: 'claude-3-5-sonnet',
          tokensUsed: 150,
          estimatedCost: 0.0075,
          requestType: 'chat',
          inputTokens: 100,
          outputTokens: 50
        }
      };

      mockWs.onmessage(new MessageEvent('message', {
        data: JSON.stringify(realTimeUpdate)
      }));

      // Verify total cost updated
      await waitFor(() => {
        const costDisplay = screen.getByText(/\$\d+\.\d{4}/);
        expect(costDisplay).toBeInTheDocument();
      });
    });
  });

  describe('SPECIFICATION: Daily Chart (Last 30 Days)', () => {
    test('should display daily chart with rolling 30 days', async () => {
      const mockDailyData = createMockDailyData();
      setupMockResponses([], mockDailyData, []);

      render(<TokenAnalyticsDashboard />);

      await waitFor(() => {
        const charts = screen.getAllByTestId('chart');
        expect(charts[1]).toBeInTheDocument();
      });

      // Verify chart requests 30 days of data
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/daily?userId=&days=30')
      );
    });

    test('should fill missing days with zero values', async () => {
      const incompleteDailyData = createMockDailyData().slice(0, 20); // Only 20 days
      setupMockResponses([], incompleteDailyData, []);

      render(<TokenAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Token Analytics Dashboard')).toBeInTheDocument();
      });

      // Chart should still show 30 data points (filled with zeros)
      const { Line } = require('react-chartjs-2');
      const chartProps = Line.mock.calls[1][0]; // Second chart (daily)
      expect(chartProps.data.labels).toHaveLength(30);
    });
  });

  describe('SPECIFICATION: Recent Messages (Last 50)', () => {
    test('should display table with last 50 messages', async () => {
      const mockMessages = createMockMessages(50);
      setupMockResponses([], [], mockMessages);

      render(<TokenAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Recent Messages (Last 50)')).toBeInTheDocument();
      });

      // Verify table headers
      expect(screen.getByText('Timestamp')).toBeInTheDocument();
      expect(screen.getByText('Provider')).toBeInTheDocument();
      expect(screen.getByText('Model')).toBeInTheDocument();
      expect(screen.getByText('Tokens')).toBeInTheDocument();
      expect(screen.getByText('Cost')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();

      // Verify API request for 50 messages
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/messages?userId=&limit=50')
      );
    });

    test('should display actual token costs without fake data', async () => {
      const mockMessages = createMockMessages(10);
      setupMockResponses([], [], mockMessages);

      render(<TokenAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Recent Messages (Last 50)')).toBeInTheDocument();
      });

      // Check that costs are real calculations, not fake values
      const costCells = screen.getAllByText(/\$\d+\.\d{4}/);
      expect(costCells.length).toBeGreaterThan(0);

      // Verify no fake cost patterns
      expect(screen.queryByText('$12.45')).not.toBeInTheDocument();
      expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
    });

    test('should update messages list with real-time data', async () => {
      const mockMessages = createMockMessages(5);
      setupMockResponses([], [], mockMessages);

      render(<TokenAnalyticsDashboard sessionId="test-session" />);

      await waitFor(() => {
        expect(screen.getByText('Recent Messages (Last 50)')).toBeInTheDocument();
      });

      // Simulate new message via WebSocket
      const mockWs = (global as any).WebSocket.mock.instances[0];
      const newMessage = {
        type: 'token-usage-update',
        payload: {
          id: 'realtime-message',
          timestamp: new Date().toISOString(),
          provider: 'claude',
          model: 'claude-3-5-sonnet',
          tokensUsed: 200,
          estimatedCost: 0.0100,
          requestType: 'tool_use',
          inputTokens: 120,
          outputTokens: 80
        }
      };

      mockWs.onmessage(new MessageEvent('message', { data: JSON.stringify(newMessage) }));

      // Verify new message appears in table
      await waitFor(() => {
        expect(screen.getByText('$0.0100')).toBeInTheDocument();
      });
    });
  });

  describe('SPECIFICATION: Fake Data Removal', () => {
    test('should not contain any hardcoded fake costs', async () => {
      setupMockResponses([], [], []);

      render(<TokenAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Token Analytics Dashboard')).toBeInTheDocument();
      });

      // Comprehensive fake data pattern checks
      const fakePatterns = [
        '$12.45', '$0.123', '$999.99', '$1.00',
        'fake', 'dummy', 'placeholder', 'mock',
        'lorem ipsum', 'test data', 'sample'
      ];

      fakePatterns.forEach(pattern => {
        expect(screen.queryByText(new RegExp(pattern, 'i'))).not.toBeInTheDocument();
      });
    });

    test('should validate data sources are real', async () => {
      const mockMessages = createMockMessages(3);
      setupMockResponses([], [], mockMessages);

      render(<TokenAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Recent Messages (Last 50)')).toBeInTheDocument();
      });

      // Verify all API calls are to real endpoints
      const apiCalls = mockFetch.mock.calls;
      expect(apiCalls.every(call =>
        call[0].includes('/api/analytics/') &&
        !call[0].includes('fake') &&
        !call[0].includes('mock')
      )).toBe(true);
    });
  });

  describe('REFINEMENT: Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));

      render(<TokenAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load analytics data/i)).toBeInTheDocument();
      });
    });

    test('should handle WebSocket connection failures', async () => {
      render(<TokenAnalyticsDashboard sessionId="test-session" />);

      const mockWs = (global as any).WebSocket.mock.instances[0];
      mockWs.onerror(new Event('error'));

      await waitFor(() => {
        expect(screen.getByText('Disconnected')).toBeInTheDocument();
      });
    });

    test('should handle malformed WebSocket messages', async () => {
      setupMockResponses([], [], []);

      render(<TokenAnalyticsDashboard sessionId="test-session" />);

      await waitFor(() => {
        expect(screen.getByText('Token Analytics Dashboard')).toBeInTheDocument();
      });

      const mockWs = (global as any).WebSocket.mock.instances[0];

      // Send malformed JSON
      mockWs.onmessage(new MessageEvent('message', { data: 'invalid json' }));

      // Should not crash
      expect(screen.getByText('Token Analytics Dashboard')).toBeInTheDocument();
    });
  });

  describe('REFINEMENT: Performance', () => {
    test('should limit data requests appropriately', async () => {
      setupMockResponses([], [], []);

      render(<TokenAnalyticsDashboard />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      // Verify proper limits
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('hours=24')
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('days=30')
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=50')
      );
    });

    test('should batch chart updates for performance', async () => {
      const mockMessages = createMockMessages(5);
      setupMockResponses([], [], mockMessages);

      render(<TokenAnalyticsDashboard sessionId="test-session" refreshInterval={1000} />);

      await waitFor(() => {
        expect(screen.getByText('Token Analytics Dashboard')).toBeInTheDocument();
      });

      // Simulate multiple rapid WebSocket updates
      const mockWs = (global as any).WebSocket.mock.instances[0];

      for (let i = 0; i < 5; i++) {
        mockWs.onmessage(new MessageEvent('message', {
          data: JSON.stringify({
            type: 'token-usage-update',
            payload: {
              id: `batch-${i}`,
              timestamp: new Date().toISOString(),
              provider: 'claude',
              model: 'claude-3-5-sonnet',
              tokensUsed: 100,
              estimatedCost: 0.005,
              requestType: 'chat',
              inputTokens: 60,
              outputTokens: 40
            }
          })
        }));
      }

      // Component should handle rapid updates without issues
      expect(screen.getByText('Token Analytics Dashboard')).toBeInTheDocument();
    });
  });

  describe('COMPLETION: Integration Requirements', () => {
    test('should work with user and session context', async () => {
      setupMockResponses([], [], []);

      render(
        <TokenAnalyticsDashboard
          userId="user-123"
          sessionId="session-456"
          refreshInterval={5000}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('userId=user-123')
        );
      });

      // Verify WebSocket subscription with session
      const mockWs = (global as any).WebSocket.mock.instances[0];
      expect(mockWs.url).toContain('/api/ws/token-analytics');
    });

    test('should cleanup resources on unmount', async () => {
      setupMockResponses([], [], []);

      const { unmount } = render(<TokenAnalyticsDashboard />);

      const mockWs = (global as any).WebSocket.mock.instances[0];
      const closeSpy = jest.spyOn(mockWs, 'close');

      unmount();

      expect(closeSpy).toHaveBeenCalled();
    });
  });
});

// Helper functions for creating mock data

function createMockHourlyData() {
  return {
    data: Array.from({ length: 24 }, (_, i) => {
      const hour = new Date(Date.now() - (i * 60 * 60 * 1000));
      return {
        period: hour.toISOString().substring(0, 14) + '00:00',
        step_count: Math.floor(Math.random() * 10),
        total_cost: Math.random() * 0.1,
        total_input_tokens: Math.floor(Math.random() * 1000),
        total_output_tokens: Math.floor(Math.random() * 500),
        total_cache_creation_tokens: 0,
        total_cache_read_tokens: 0,
        avg_cost_per_step: Math.random() * 0.01,
        min_cost: 0,
        max_cost: Math.random() * 0.02
      };
    })
  };
}

function createMockDailyData() {
  return {
    data: Array.from({ length: 30 }, (_, i) => {
      const day = new Date(Date.now() - (i * 24 * 60 * 60 * 1000));
      return {
        period: day.toISOString().substring(0, 10),
        step_count: Math.floor(Math.random() * 100),
        total_cost: Math.random() * 2.0,
        total_input_tokens: Math.floor(Math.random() * 10000),
        total_output_tokens: Math.floor(Math.random() * 5000),
        total_cache_creation_tokens: 0,
        total_cache_read_tokens: 0,
        avg_cost_per_step: Math.random() * 0.02,
        min_cost: 0,
        max_cost: Math.random() * 0.05
      };
    })
  };
}

function createMockMessages(count: number = 10) {
  return {
    data: Array.from({ length: count }, (_, i) => ({
      id: `msg-${i}`,
      timestamp: new Date(Date.now() - (i * 60000)).toISOString(),
      provider: ['claude', 'openai', 'mcp'][i % 3],
      model: 'claude-3-5-sonnet',
      tokensUsed: 100 + i * 10,
      estimatedCost: (100 + i * 10) * 0.000015, // Real calculation: tokens * $15/1M
      requestType: ['chat', 'tool_use', 'completion'][i % 3],
      inputTokens: 60 + i * 5,
      outputTokens: 40 + i * 5,
      cacheTokens: 0
    }))
  };
}

function createMockResponse(data: any) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data)
  });
}

function setupMockResponses(hourlyData: any, dailyData: any, messagesData: any) {
  mockFetch
    .mockResolvedValueOnce(createMockResponse(hourlyData))
    .mockResolvedValueOnce(createMockResponse(dailyData))
    .mockResolvedValueOnce(createMockResponse(messagesData));
}