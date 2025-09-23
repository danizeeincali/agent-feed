/**
 * Token Analytics Dashboard
 * Comprehensive token usage tracking and analytics with real-time updates
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import {
  Clock,
  Calendar,
  MessageSquare,
  DollarSign,
  TrendingUp,
  Download,
  RefreshCw,
  Filter,
  Search,
  BarChart3,
  Activity,
  Zap
} from 'lucide-react';
import { cn } from '../utils/cn';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface TokenUsageRecord {
  id: number;
  timestamp: string;
  session_id: string;
  request_id: string;
  message_id?: string;
  provider: string;
  model: string;
  request_type: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_total: number; // cents
  processing_time_ms: number;
  message_preview: string;
  response_preview: string;
  component?: string;
}

interface UsageSummary {
  total_requests: number;
  total_tokens: number;
  total_cost: number; // cents
  avg_processing_time: number | null;
  unique_sessions: number;
  providers_used: number;
  models_used: number;
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor?: string;
    borderWidth?: number;
    yAxisID?: string;
  }>;
}

interface HourlyDataPoint {
  hour: string;
  total_tokens: number;
  total_requests: number;
  total_cost: number;
  avg_processing_time: number;
}

interface DailyDataPoint {
  date: string;
  total_tokens: number;
  total_requests: number;
  total_cost: number;
  avg_processing_time: number;
}

interface ProviderStats {
  provider: string;
  requests: number;
  tokens: number;
  cost: number;
  avg_time: number;
}

interface ModelStats {
  model: string;
  provider: string;
  requests: number;
  tokens: number;
  cost: number;
  avg_time: number;
}

const API_BASE = '/api/token-analytics';

// Data validation functions
const validateTokenUsageRecord = (record: any): record is TokenUsageRecord => {
  return (
    typeof record === 'object' &&
    typeof record.id === 'number' &&
    typeof record.timestamp === 'string' &&
    typeof record.session_id === 'string' &&
    typeof record.request_id === 'string' &&
    typeof record.provider === 'string' &&
    typeof record.model === 'string' &&
    typeof record.request_type === 'string' &&
    typeof record.input_tokens === 'number' &&
    typeof record.output_tokens === 'number' &&
    typeof record.total_tokens === 'number' &&
    typeof record.cost_total === 'number' &&
    typeof record.processing_time_ms === 'number' &&
    typeof record.message_preview === 'string' &&
    typeof record.response_preview === 'string'
  );
};

const validateUsageSummary = (summary: any): summary is UsageSummary => {
  return (
    typeof summary === 'object' &&
    typeof summary.total_requests === 'number' &&
    typeof summary.total_tokens === 'number' &&
    typeof summary.total_cost === 'number' &&
    (typeof summary.avg_processing_time === 'number' || summary.avg_processing_time === null) &&
    typeof summary.unique_sessions === 'number' &&
    typeof summary.providers_used === 'number' &&
    typeof summary.models_used === 'number'
  );
};

const validateChartData = (data: any): data is ChartData => {
  return (
    typeof data === 'object' &&
    Array.isArray(data.labels) &&
    Array.isArray(data.datasets) &&
    data.datasets.every((dataset: any) =>
      typeof dataset === 'object' &&
      typeof dataset.label === 'string' &&
      Array.isArray(dataset.data) &&
      dataset.data.every((value: any) => typeof value === 'number') &&
      typeof dataset.backgroundColor === 'string'
    )
  );
};

// Custom hooks for data fetching
const useTokenAnalytics = () => {
  const queryClient = useQueryClient();

  const hourlyQuery = useQuery({
    queryKey: ['token-analytics', 'hourly'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/hourly`);
      if (!response.ok) throw new Error('Failed to fetch hourly data');
      const data = await response.json();

      // Validate the chart data structure
      if (data.data && !validateChartData(data.data)) {
        console.warn('Invalid hourly chart data structure received');
        throw new Error('Invalid hourly data format');
      }

      return data;
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  const dailyQuery = useQuery({
    queryKey: ['token-analytics', 'daily'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/daily`);
      if (!response.ok) throw new Error('Failed to fetch daily data');
      const data = await response.json();

      // Validate the chart data structure
      if (data.data && !validateChartData(data.data)) {
        console.warn('Invalid daily chart data structure received');
        throw new Error('Invalid daily data format');
      }

      return data;
    },
    refetchInterval: 300000, // Refresh every 5 minutes
    staleTime: 60000, // Consider data stale after 1 minute
  });

  const messagesQuery = useQuery({
    queryKey: ['token-analytics', 'messages'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/messages?limit=50`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();

      // Validate message data structure
      if (data.data && Array.isArray(data.data)) {
        const invalidRecords = data.data.filter((record: any) => !validateTokenUsageRecord(record));
        if (invalidRecords.length > 0) {
          console.warn(`Found ${invalidRecords.length} invalid message records`);
        }
        // Filter out invalid records to prevent render errors
        data.data = data.data.filter((record: any) => validateTokenUsageRecord(record));
      }

      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const summaryQuery = useQuery({
    queryKey: ['token-analytics', 'summary'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/summary`);
      if (!response.ok) throw new Error('Failed to fetch summary');
      const data = await response.json();

      // Validate summary data structure
      if (data.data?.summary && !validateUsageSummary(data.data.summary)) {
        console.warn('Invalid summary data structure received');
        throw new Error('Invalid summary data format');
      }

      return data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['token-analytics'] });
  }, [queryClient]);

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

// Chart configuration for hourly bar chart (24 hours of individual bars)
const hourlyChartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'top' as const,
    },
    title: {
      display: false,
    },
    tooltip: {
      mode: 'index',
      intersect: false,
    },
  },
  scales: {
    x: {
      display: true,
      title: {
        display: true,
        text: 'Hour',
      },
    },
    y: {
      type: 'linear' as const,
      display: true,
      position: 'left' as const,
      title: {
        display: true,
        text: 'Tokens',
      },
      beginAtZero: true,
    },
    y1: {
      type: 'linear' as const,
      display: true,
      position: 'right' as const,
      title: {
        display: true,
        text: 'Requests',
      },
      grid: {
        drawOnChartArea: false,
      },
      beginAtZero: true,
    },
  },
};

// Chart configuration for daily bar chart (30 days of individual bars)
const dailyChartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'top' as const,
    },
    title: {
      display: false,
    },
    tooltip: {
      mode: 'index',
      intersect: false,
    },
  },
  scales: {
    x: {
      title: {
        display: true,
        text: 'Date',
      },
    },
    y: {
      type: 'linear' as const,
      title: {
        display: true,
        text: 'Tokens',
      },
      beginAtZero: true,
    },
    y1: {
      type: 'linear' as const,
      display: true,
      position: 'right' as const,
      title: {
        display: true,
        text: 'Requests',
      },
      grid: {
        drawOnChartArea: false,
      },
      beginAtZero: true,
    },
  },
};

// Summary card component
interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color: string;
}

const SummaryCard = ({ title, value, icon, trend, color }: SummaryCardProps) => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {trend && (
          <p className="text-sm text-green-600 flex items-center mt-1">
            <TrendingUp className="w-4 h-4 mr-1" />
            {trend}
          </p>
        )}
      </div>
      <div className={cn("p-3 rounded-full", color)}>
        {icon}
      </div>
    </div>
  </div>
);

// Message list component
interface MessageListProps {
  messages: TokenUsageRecord[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

const MessageList = ({ messages, searchTerm, onSearchChange }: MessageListProps) => {
  const filteredMessages = useMemo(() => {
    if (!searchTerm) return messages;
    return messages.filter(msg =>
      (msg.message_preview || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (msg.response_preview || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (msg.component || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [messages, searchTerm]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Recent Messages</h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {filteredMessages.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? 'No messages match your search.' : 'No messages found.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredMessages.map((message) => (
              <div key={message.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {message.provider}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {message.model}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {message.request_type}
                      </span>
                      {message.component && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {message.component}
                        </span>
                      )}
                      {message.message_id && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800" title="Unique Message ID">
                          ID: {message.message_id.split('-').pop()?.substring(0, 6)}...
                        </span>
                      )}
                    </div>

                    {message.message_preview && message.message_preview.trim() && (
                      <p className="text-sm text-gray-900 mb-1">
                        <strong>Input:</strong> <span className="font-mono text-xs">{message.message_preview.substring(0, 200)}{message.message_preview.length > 200 ? '...' : ''}</span>
                      </p>
                    )}
                    {message.response_preview && message.response_preview.trim() && (
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Response:</strong> <span className="font-mono text-xs">{message.response_preview.substring(0, 200)}{message.response_preview.length > 200 ? '...' : ''}</span>
                      </p>
                    )}

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span title={message.timestamp}>{new Date(message.timestamp).toLocaleString()}</span>
                      <span title={`Input: ${message.input_tokens?.toLocaleString() || 0}, Output: ${message.output_tokens?.toLocaleString() || 0}`}>
                        {(message.total_tokens || 0).toLocaleString()} tokens
                      </span>
                      <span>${((message.cost_total || 0) / 100).toFixed(4)}</span>
                      {message.processing_time_ms && (
                        <span>{message.processing_time_ms}ms</span>
                      )}
                      {message.session_id && (
                        <span className="text-blue-600" title="Session ID">
                          Session: {message.session_id.split('-').pop()?.substring(0, 6)}...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Export functionality
const exportData = async (format: 'csv' | 'json' = 'csv', days: number = 30) => {
  try {
    const response = await fetch(`${API_BASE}/export?format=${format}&days=${days}`);
    if (!response.ok) throw new Error('Export failed');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `token-analytics-${days}d.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Export failed:', error);
    alert('Export failed. Please try again.');
  }
};

// Main component
export const TokenAnalyticsDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'hourly' | 'daily'>('hourly');
  const {
    hourlyData,
    dailyData,
    messages,
    summary,
    byProvider,
    byModel,
    isLoading,
    error,
    refreshAll,
  } = useTokenAnalytics();

  // Format currency
  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(4)}`;

  // Format numbers
  const formatNumber = (num: number) => num?.toLocaleString() || '0';

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Token Analytics</h2>
        <p className="text-red-600 mb-4">{error.message}</p>
        <button
          onClick={refreshAll}
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="token-analytics-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Token Analytics</h1>
          <p className="text-gray-600">Monitor your Claude API usage and costs in real-time</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => exportData('csv', 30)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>

          <button
            onClick={refreshAll}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
            title="Total Requests"
            value={formatNumber(summary.total_requests)}
            icon={<Activity className="w-6 h-6 text-white" />}
            color="bg-blue-500"
          />
          <SummaryCard
            title="Total Tokens"
            value={formatNumber(summary.total_tokens)}
            icon={<Zap className="w-6 h-6 text-white" />}
            color="bg-green-500"
          />
          <SummaryCard
            title="Total Cost"
            value={formatCurrency(summary.total_cost)}
            icon={<DollarSign className="w-6 h-6 text-white" />}
            color="bg-purple-500"
          />
          <SummaryCard
            title="Avg Response Time"
            value={summary.avg_processing_time ? `${Math.round(summary.avg_processing_time)}ms` : 'N/A'}
            icon={<Clock className="w-6 h-6 text-white" />}
            color="bg-orange-500"
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Chart */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Hourly Usage (Last 24 Hours)
            </h3>
          </div>
          <div className="p-4">
            <div className="h-80">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : hourlyData ? (
                <Bar data={hourlyData} options={hourlyChartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No hourly data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Daily Chart */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Daily Usage (Last 30 Days)
            </h3>
          </div>
          <div className="p-4">
            <div className="h-80">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : dailyData ? (
                <Bar data={dailyData} options={dailyChartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No daily data available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Usage by Provider and Model */}
      {(byProvider.length > 0 || byModel.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Provider */}
          {byProvider.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Usage by Provider</h3>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {byProvider.map((provider: ProviderStats, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">{provider.provider}</h4>
                        <p className="text-sm text-gray-600">
                          {formatNumber(provider.requests)} requests • {formatNumber(provider.tokens)} tokens
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCurrency(provider.cost)}</p>
                        <p className="text-sm text-gray-600">{Math.round(provider.avg_time)}ms avg</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* By Model */}
          {byModel.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Usage by Model</h3>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {byModel.slice(0, 5).map((model: ModelStats, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">{model.model}</h4>
                        <p className="text-sm text-gray-600">
                          {model.provider} • {formatNumber(model.requests)} requests
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCurrency(model.cost)}</p>
                        <p className="text-sm text-gray-600">{formatNumber(model.tokens)} tokens</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Messages */}
      <MessageList
        messages={messages}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />
    </div>
  );
};

export default TokenAnalyticsDashboard;