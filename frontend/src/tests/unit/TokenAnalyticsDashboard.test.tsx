/**
 * TokenAnalyticsDashboard Component Tests
 *
 * This test file validates the TokenAnalyticsDashboard component and will:
 * - FAIL if chart.js or react-chartjs-2 have import issues
 * - FAIL if the component cannot render properly
 * - PASS only when the component is fully functional
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TokenAnalyticsDashboard } from '../../components/TokenAnalyticsDashboard';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

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

describe('TokenAnalyticsDashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful API responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/hourly')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: {
              labels: Array.from({length: 24}, (_, i) => `${i}:00`),
              datasets: [{
                label: 'Tokens',
                data: Array.from({length: 24}, () => 1000),
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: 'rgb(59, 130, 246)',
              }],
            },
          }),
        });
      }
      if (url.includes('/daily')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: {
              labels: Array.from({length: 30}, (_, i) => `2024-01-${String(i + 1).padStart(2, '0')}`),
              datasets: [{
                label: 'Daily Tokens',
                data: Array.from({length: 30}, () => 5000),
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: 'rgb(59, 130, 246)',
              }],
            },
          }),
        });
      }
      if (url.includes('/messages')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [{
              id: 1,
              timestamp: '2024-01-01T10:00:00Z',
              session_id: 'test-session-1',
              request_id: 'test-request-1',
              message_id: 'test-message-1',
              provider: 'anthropic',
              model: 'claude-3-sonnet',
              request_type: 'chat',
              input_tokens: 500,
              output_tokens: 500,
              total_tokens: 1000,
              cost_total: 10,
              processing_time_ms: 1500,
              message_preview: 'Test message',
              response_preview: 'Test response',
            }],
          }),
        });
      }
      if (url.includes('/summary')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: {
              summary: {
                total_requests: 100,
                total_tokens: 50000,
                total_cost: 500,
                avg_processing_time: 1200,
                unique_sessions: 25,
                providers_used: 2,
                models_used: 3,
              },
              by_provider: [],
              by_model: [],
            },
          }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  it('should render without throwing errors', async () => {
    render(
      <TestWrapper>
        <TokenAnalyticsDashboard />
      </TestWrapper>
    );

    // Should render the main dashboard container
    expect(screen.getByTestId('token-analytics-dashboard')).toBeInTheDocument();
  });

  it('should display the dashboard title', async () => {
    render(
      <TestWrapper>
        <TokenAnalyticsDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Token Analytics')).toBeInTheDocument();
    });
  });

  it('should load and display data from APIs', async () => {
    render(
      <TestWrapper>
        <TokenAnalyticsDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      // Should display summary data
      expect(screen.getByText('100')).toBeInTheDocument(); // total_requests
      expect(screen.getByText('50,000')).toBeInTheDocument(); // total_tokens
    });
  });

  it('should handle API errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(
      <TestWrapper>
        <TokenAnalyticsDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Error Loading Token Analytics')).toBeInTheDocument();
    });
  });
});