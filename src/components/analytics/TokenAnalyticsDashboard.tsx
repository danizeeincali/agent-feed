/**
 * Real Token Analytics Dashboard - SPARC Implementation
 *
 * SPECIFICATION:
 * - Hourly chart showing last 24 hours of real token usage
 * - Daily chart showing last 30 rolling days of real usage
 * - List of last 50 messages with actual tokens and costs
 * - Remove all fake data like "$12.45" daily cost
 *
 * ARCHITECTURE:
 * - Real-time data fetching from CostTracker service
 * - Chart.js integration for visualizations
 * - WebSocket connection for live updates
 * - Responsive design with TypeScript safety
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TokenUsageEntry {
  id: string;
  timestamp: string;
  provider: 'claude' | 'openai' | 'mcp' | 'claude-flow';
  model: string;
  tokensUsed: number;
  estimatedCost: number;
  requestType: string;
  component?: string;
  inputTokens: number;
  outputTokens: number;
  cacheTokens?: number;
}

interface ChartDataPoint {
  x: string;
  y: number;
  tokens: number;
  cost: number;
}

interface TokenAnalyticsDashboardProps {
  userId?: string;
  sessionId?: string;
  refreshInterval?: number;
}

export const TokenAnalyticsDashboard: React.FC<TokenAnalyticsDashboardProps> = ({
  userId,
  sessionId,
  refreshInterval = 10000
}) => {
  const [hourlyData, setHourlyData] = useState<any>({ labels: [], datasets: [] });
  const [dailyData, setDailyData] = useState<any>({ labels: [], datasets: [] });
  const [recentMessages, setRecentMessages] = useState<TokenUsageEntry[]>([]);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [totalTokens, setTotalTokens] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const chartRefs = useRef<{ hourly: any; daily: any }>({ hourly: null, daily: null });

  // WebSocket connection for real-time updates
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const wsUrl = `ws://${window.location.host}/api/ws/token-analytics`;
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          console.log('Token analytics WebSocket connected');
          setIsConnected(true);
          setError(null);

          // Subscribe to updates
          if (sessionId) {
            wsRef.current?.send(JSON.stringify({
              type: 'subscribe',
              sessionId,
              userId
            }));
          }
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'token-usage-update') {
              handleRealTimeUpdate(data.payload);
            }
          } catch (error) {
            console.error('WebSocket message parse error:', error);
          }
        };

        wsRef.current.onclose = () => {
          console.log('Token analytics WebSocket disconnected');
          setIsConnected(false);

          // Attempt to reconnect after 5 seconds
          setTimeout(connectWebSocket, 5000);
        };

        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setError('WebSocket connection failed');
          setIsConnected(false);
        };

      } catch (error) {
        console.error('WebSocket connection error:', error);
        setError('Failed to establish WebSocket connection');
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [sessionId, userId]);

  // Fetch initial data
  useEffect(() => {
    fetchAnalyticsData();
    const interval = setInterval(fetchAnalyticsData, refreshInterval);

    return () => clearInterval(interval);
  }, [userId, sessionId, refreshInterval]);

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);

      const [hourlyResponse, dailyResponse, messagesResponse] = await Promise.all([
        fetch('/api/token-analytics/hourly'),
        fetch('/api/token-analytics/daily'),
        fetch('/api/token-analytics/messages?limit=50')
      ]);

      if (!hourlyResponse.ok || !dailyResponse.ok || !messagesResponse.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const [hourlyResult, dailyResult, messagesResult] = await Promise.all([
        hourlyResponse.json(),
        dailyResponse.json(),
        messagesResponse.json()
      ]);

      // Use the chart data directly from API for bar charts
      setHourlyData(hourlyResult.data || { labels: [], datasets: [] });
      setDailyData(dailyResult.data || { labels: [], datasets: [] });

      // Set recent messages
      setRecentMessages(messagesResult.data || []);

      // Calculate totals from raw data
      const todayTotalCost = dailyResult.raw?.[dailyResult.raw.length - 1]?.total_cost || 0;
      const todayTotalTokens = dailyResult.raw?.[dailyResult.raw.length - 1]?.total_tokens || 0;
      setTotalCost(todayTotalCost / 100); // Convert cents to dollars
      setTotalTokens(todayTotalTokens);

      setError(null);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  // Remove the processing functions since we're using Chart.js format directly from API

  const handleRealTimeUpdate = (tokenUsage: TokenUsageEntry) => {
    // Update recent messages
    setRecentMessages(prev => [tokenUsage, ...prev.slice(0, 49)]);

    // Update totals
    setTotalCost(prev => prev + tokenUsage.estimatedCost);
    setTotalTokens(prev => prev + tokenUsage.tokensUsed);

    // Refresh data to get updated charts
    fetchAnalyticsData();
  };

  const hourlyChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Token Usage - Last 24 Hours',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Tokens'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Cost (cents)'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
      x: {
        title: {
          display: true,
          text: 'Hour'
        }
      }
    },
  };

  const dailyChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Token Usage - Last 30 Days',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Tokens'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Cost (cents)'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
      y2: {
        type: 'linear' as const,
        display: false,
        position: 'right' as const,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Requests'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      }
    },
  };

  // Use chart data directly from API (already formatted for Chart.js)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Token Analytics Dashboard</h1>
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Today's Cost</h3>
          <p className="text-3xl font-bold text-blue-600">
            ${totalCost.toFixed(4)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Today's Tokens</h3>
          <p className="text-3xl font-bold text-green-600">
            {totalTokens.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Messages</h3>
          <p className="text-3xl font-bold text-purple-600">
            {recentMessages.length}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-80">
            <Bar
              ref={(ref) => { chartRefs.current.hourly = ref; }}
              data={hourlyData}
              options={hourlyChartOptions}
            />
          </div>
        </div>

        {/* Daily Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-80">
            <Bar
              ref={(ref) => { chartRefs.current.daily = ref; }}
              data={dailyData}
              options={dailyChartOptions}
            />
          </div>
        </div>
      </div>

      {/* Recent Messages Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Messages (Last 50)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tokens
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentMessages.map((message) => (
                <tr key={message.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(message.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      message.provider === 'claude' ? 'bg-blue-100 text-blue-800' :
                      message.provider === 'openai' ? 'bg-green-100 text-green-800' :
                      message.provider === 'mcp' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {message.provider}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {message.model}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex flex-col">
                      <span>{message.tokensUsed.toLocaleString()}</span>
                      <span className="text-xs text-gray-500">
                        In: {message.inputTokens} • Out: {message.outputTokens}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    ${message.estimatedCost.toFixed(4)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {message.requestType}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TokenAnalyticsDashboard;