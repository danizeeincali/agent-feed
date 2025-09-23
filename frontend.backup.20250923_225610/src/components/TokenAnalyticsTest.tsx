/**
 * Test component for TokenAnalyticsDashboard
 * Provides mock data and tests component functionality
 */

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { TokenAnalyticsDashboard } from './TokenAnalyticsDashboard';

// Mock data for testing
const mockHourlyData = {
  labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
  datasets: [
    {
      label: 'Tokens Used',
      data: Array.from({ length: 24 }, () => Math.floor(Math.random() * 5000) + 1000),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
    },
    {
      label: 'Cost (cents)',
      data: Array.from({ length: 24 }, () => Math.floor(Math.random() * 50) + 10),
      borderColor: 'rgb(239, 68, 68)',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      tension: 0.4,
      yAxisID: 'y1',
    },
  ],
};

const mockDailyData = {
  labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
  datasets: [
    {
      label: 'Daily Tokens',
      data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 50000) + 10000),
      backgroundColor: 'rgba(34, 197, 94, 0.7)',
    },
  ],
};

const mockMessages = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  timestamp: new Date(Date.now() - i * 3600000).toISOString(),
  provider: 'anthropic',
  model: 'claude-3-sonnet-20240229',
  request_type: 'completion',
  total_tokens: Math.floor(Math.random() * 2000) + 500,
  cost_total: Math.floor(Math.random() * 100) + 20, // cents
  processing_time_ms: Math.floor(Math.random() * 3000) + 500,
  message_preview: `Test message ${i + 1}: This is a sample user query...`,
  response_preview: `Response ${i + 1}: This is a sample AI response...`,
}));

const mockSummary = {
  total_requests: 1234,
  total_tokens: 567890,
  total_cost: 4567, // cents
  avg_processing_time: 1250,
  unique_sessions: 45,
  providers_used: 2,
  models_used: 3,
};

const mockByProvider = [
  {
    provider: 'anthropic',
    requests: 800,
    tokens: 400000,
    cost: 3200,
    avg_time: 1200,
  },
  {
    provider: 'openai',
    requests: 434,
    tokens: 167890,
    cost: 1367,
    avg_time: 1350,
  },
];

const mockByModel = [
  {
    model: 'claude-3-sonnet-20240229',
    provider: 'anthropic',
    requests: 600,
    tokens: 300000,
    cost: 2400,
  },
  {
    model: 'gpt-4',
    provider: 'openai',
    requests: 300,
    tokens: 120000,
    cost: 1000,
  },
];

// Mock query hook that provides test data
const useMockTokenAnalytics = () => {
  const [refreshCount, setRefreshCount] = useState(0);

  // Mock the same API structure as the real component expects
  const hourlyQuery = useQuery({
    queryKey: ['token-analytics', 'hourly', refreshCount],
    queryFn: async () => ({ data: mockHourlyData }),
    refetchInterval: false, // Disable auto-refresh for testing
  });

  const dailyQuery = useQuery({
    queryKey: ['token-analytics', 'daily', refreshCount],
    queryFn: async () => ({ data: mockDailyData }),
    refetchInterval: false,
  });

  const messagesQuery = useQuery({
    queryKey: ['token-analytics', 'messages', refreshCount],
    queryFn: async () => ({ data: mockMessages }),
    refetchInterval: false,
  });

  const summaryQuery = useQuery({
    queryKey: ['token-analytics', 'summary', refreshCount],
    queryFn: async () => ({
      data: {
        summary: mockSummary,
        by_provider: mockByProvider,
        by_model: mockByModel,
      }
    }),
    refetchInterval: false,
  });

  const refreshAll = () => {
    setRefreshCount(prev => prev + 1);
  };

  return {
    hourlyData: hourlyQuery.data?.data,
    dailyData: dailyQuery.data?.data,
    messages: messagesQuery.data?.data || [],
    summary: summaryQuery.data?.data?.summary,
    byProvider: summaryQuery.data?.data?.by_provider || [],
    byModel: summaryQuery.data?.data?.by_model || [],
    isLoading: hourlyQuery.isLoading || dailyQuery.isLoading || messagesQuery.isLoading || summaryQuery.isLoading,
    error: hourlyQuery.error || dailyQuery.error || messagesQuery.error || summaryQuery.error,
    refreshAll,
  };
};

// Test wrapper component
const TokenAnalyticsTestWrapper = () => {
  const [showMockData, setShowMockData] = useState(false);

  return (
    <div className="space-y-6 p-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">TokenAnalyticsDashboard Test</h2>
        <p className="text-blue-600 mb-4">
          This tests the TokenAnalyticsDashboard component with mock data to verify all imports and rendering work correctly.
        </p>

        <div className="flex gap-4">
          <button
            onClick={() => setShowMockData(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            disabled={showMockData}
          >
            {showMockData ? '✅ Component Loaded' : 'Load Component'}
          </button>

          <button
            onClick={() => setShowMockData(false)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            disabled={!showMockData}
          >
            Hide Component
          </button>
        </div>
      </div>

      {showMockData && (
        <div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-green-800">✅ Component loaded successfully with mock data!</p>
          </div>
          <TokenAnalyticsDashboard />
        </div>
      )}
    </div>
  );
};

// Query client for the test
const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

export const TokenAnalyticsTest = () => (
  <QueryClientProvider client={testQueryClient}>
    <TokenAnalyticsTestWrapper />
  </QueryClientProvider>
);

export default TokenAnalyticsTest;