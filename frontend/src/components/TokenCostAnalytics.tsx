import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Activity, 
  Zap,
  RefreshCw,
  Settings,
  Download,
  Calendar,
  Cpu,
  BarChart3,
  Clock
} from 'lucide-react';
// Temporarily disabled: import { useTokenCostTracking, TokenUsage, TokenCostMetrics, BudgetStatus } from '../hooks/useTokenCostTracking';
import { nldLogger } from '../utils/nld-logger';

// Temporary mock interfaces for disabled state
interface TokenUsage {
  id: string;
  timestamp: Date;
  provider: 'claude' | 'openai' | 'mcp' | 'claude-flow';
  model: string;
  tokensUsed: number;
  estimatedCost: number;
  requestType: string;
  component?: string;
  metadata?: Record<string, any>;
}

interface TokenCostMetrics {
  totalTokensUsed: number;
  totalCost: number;
  costByProvider: Record<string, number>;
  costByModel: Record<string, number>;
  averageCostPerToken: number;
  tokensPerMinute: number;
  costTrend: 'increasing' | 'decreasing' | 'stable';
  lastUpdated: Date;
}

interface BudgetStatus {
  dailyBudget: number;
  weeklyBudget: number;
  monthlyBudget: number;
  dailyUsed: number;
  weeklyUsed: number;
  monthlyUsed: number;
  dailyPercentage: number;
  weeklyPercentage: number;
  monthlyPercentage: number;
  alertLevel: 'safe' | 'warning' | 'critical' | 'exceeded';
  projectedDailyCost: number;
  projectedMonthlyCost: number;
}

interface TokenCostAnalyticsProps {
  className?: string;
  showBudgetAlerts?: boolean;
  enableExport?: boolean;
  budgetLimits?: {
    daily?: number;
    weekly?: number;
    monthly?: number;
  };
}

interface ChartDataPoint {
  timestamp: string;
  cost: number;
  tokens: number;
  provider: string;
}

/**
 * DISABLED Token Cost Analytics Component
 * WebSocket dependencies removed - showing placeholder until reimplementation
 * SPARC Architecture: Graceful degradation without breaking UI
 */
const TokenCostAnalytics: React.FC<TokenCostAnalyticsProps> = ({
  className = '',
  showBudgetAlerts = true,
  enableExport = true,
  budgetLimits = {
    daily: 10,
    weekly: 50,
    monthly: 200
  }
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '1d' | '7d' | '30d'>('1d');
  const [showSettings, setShowSettings] = useState(false);
  
  // DISABLED: WebSocket-dependent hook replaced with mock data
  // const { tokenUsages, metrics, budgetStatus, loading, error, isConnected, trackTokenUsage, refetch } = useTokenCostTracking({ enableRealTime: true, budgetLimits });
  
  // Mock data for disabled state
  const tokenUsages: TokenUsage[] = [];
  const metrics: TokenCostMetrics | null = null;
  const budgetStatus: BudgetStatus | null = null;
  const loading = false;
  const error = null;
  const isConnected = false;
  const trackTokenUsage = () => {};
  const refetch = () => {};

  // Log component lifecycle for NLD analysis
  useEffect(() => {
    nldLogger.renderAttempt('TokenCostAnalytics', 'component-mount', { budgetLimits, showBudgetAlerts });
    return () => {
      nldLogger.renderSuccess('TokenCostAnalytics', 'component-unmount');
    };
  }, [budgetLimits, showBudgetAlerts]);

  /**
   * Filter token usages based on selected time range
   * Memoized for performance optimization
   */
  const filteredTokenUsages = useMemo(() => {
    const now = new Date();
    let cutoffTime: Date;

    switch (selectedTimeRange) {
      case '1h':
        cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '1d':
        cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    return tokenUsages.filter(usage => usage.timestamp >= cutoffTime);
  }, [tokenUsages, selectedTimeRange]);

  /**
   * Prepare chart data with aggregation for performance
   * Groups data points to prevent UI overload
   */
  const chartData = useMemo(() => {
    if (filteredTokenUsages.length === 0) return [];

    const groupingInterval = selectedTimeRange === '1h' ? 5 * 60 * 1000 : // 5 minutes
                            selectedTimeRange === '1d' ? 60 * 60 * 1000 : // 1 hour
                            selectedTimeRange === '7d' ? 6 * 60 * 60 * 1000 : // 6 hours
                            24 * 60 * 60 * 1000; // 1 day

    const groupedData = new Map<string, ChartDataPoint>();

    filteredTokenUsages.forEach(usage => {
      const groupKey = new Date(Math.floor(usage.timestamp.getTime() / groupingInterval) * groupingInterval).toISOString();
      
      if (!groupedData.has(groupKey)) {
        groupedData.set(groupKey, {
          timestamp: groupKey,
          cost: 0,
          tokens: 0,
          provider: usage.provider
        });
      }

      const existing = groupedData.get(groupKey)!;
      existing.cost += usage.estimatedCost;
      existing.tokens += usage.tokensUsed;
    });

    return Array.from(groupedData.values()).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [filteredTokenUsages, selectedTimeRange]);

  /**
   * Export token usage data
   */
  const handleExport = () => {
    try {
      nldLogger.renderAttempt('TokenCostAnalytics', 'export-data', { usageCount: tokenUsages.length });

      const exportData = {
        exportDate: new Date().toISOString(),
        timeRange: selectedTimeRange,
        summary: metrics,
        budgetStatus,
        tokenUsages: filteredTokenUsages
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `token-cost-analytics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      nldLogger.renderSuccess('TokenCostAnalytics', 'export-data');
    } catch (error) {
      nldLogger.renderFailure('TokenCostAnalytics', error as Error, { action: 'export' });
    }
  };

  /**
   * Get status color based on alert level
   */
  const getAlertLevelColor = (level: string) => {
    switch (level) {
      case 'safe': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-orange-600 bg-orange-100';
      case 'exceeded': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  /**
   * Format currency values
   */
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 6
    }).format(value);
  };

  /**
   * Format large numbers
   */
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  if (error) {
    return (
      <div className={`p-6 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          <h3 className="text-lg font-semibold text-red-800">Token Cost Analytics Error</h3>
        </div>
        <p className="text-red-700 mb-4">{error.message}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // SPARC Architecture: Return disabled placeholder with clear messaging
  return (
    <div className={`space-y-6 ${className}`} data-testid="token-cost-analytics-disabled">
      {/* Disabled State Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Clock className="w-6 h-6 text-amber-600" />
          <h3 className="text-lg font-semibold text-amber-800">Token Cost Analytics - Coming Soon</h3>
        </div>
        <p className="text-amber-700 mb-4">
          Token cost tracking is temporarily disabled while we remove WebSocket dependencies. 
          This feature will be reimplemented with improved performance and reliability.
        </p>
        <div className="bg-amber-100 rounded-md p-3">
          <p className="text-sm text-amber-800">
            <strong>SPARC Implementation:</strong> Graceful degradation ensures the UI remains functional 
            while maintaining tab switching behavior and preventing WebSocket connection errors.
          </p>
        </div>
      </div>

      {/* Placeholder Analytics Layout */}
      <div className={`space-y-6 opacity-50 ${className}`} data-testid="token-cost-analytics-placeholder">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-blue-600" />
            Token Cost Analytics
          </h2>
          <p className="text-gray-600">Real-time token usage and cost tracking</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
            <span className="text-sm text-gray-500">Feature Disabled</span>
            <span className="text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
              Placeholder Mode
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['1h', '1d', '7d', '30d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setSelectedTimeRange(range)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  selectedTimeRange === range
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {enableExport && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          )}

          <button
            onClick={refetch}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Budget Alert Banner */}
      {showBudgetAlerts && budgetStatus && budgetStatus.alertLevel !== 'safe' && (
        <div className={`p-4 rounded-lg border ${getAlertLevelColor(budgetStatus.alertLevel)} border-current border-opacity-20`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <h4 className="font-semibold">
                Budget Alert: {budgetStatus.alertLevel.charAt(0).toUpperCase() + budgetStatus.alertLevel.slice(1)}
              </h4>
              <p className="text-sm opacity-90">
                {budgetStatus.alertLevel === 'exceeded' 
                  ? 'Budget limits have been exceeded'
                  : `Budget utilization is at ${Math.max(budgetStatus.dailyPercentage, budgetStatus.weeklyPercentage, budgetStatus.monthlyPercentage).toFixed(1)}%`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Cost */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
              <DollarSign className="w-6 h-6" />
            </div>
            {metrics?.costTrend === 'increasing' ? (
              <TrendingUp className="w-4 h-4 text-red-500" />
            ) : metrics?.costTrend === 'decreasing' ? (
              <TrendingDown className="w-4 h-4 text-green-500" />
            ) : (
              <Activity className="w-4 h-4 text-gray-500" />
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-500">Total Cost</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {metrics ? formatCurrency(metrics.totalCost) : loading ? '...' : '$0.0000'}
              </span>
              <span className="text-sm text-gray-500">USD</span>
            </div>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              metrics?.costTrend === 'increasing' ? 'bg-red-100 text-red-800' :
              metrics?.costTrend === 'decreasing' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {metrics?.costTrend || 'stable'}
            </span>
          </div>
        </div>

        {/* Total Tokens */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-green-100 text-green-600">
              <Zap className="w-6 h-6" />
            </div>
            <Activity className="w-4 h-4 text-gray-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-500">Total Tokens</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {metrics ? formatNumber(metrics.totalTokensUsed) : loading ? '...' : '0'}
              </span>
              <span className="text-sm text-gray-500">tokens</span>
            </div>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {metrics ? `${metrics.tokensPerMinute.toFixed(1)}/min` : '0/min'}
            </span>
          </div>
        </div>

        {/* Average Cost Per Token */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
              <BarChart3 className="w-6 h-6" />
            </div>
            <Activity className="w-4 h-4 text-gray-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-500">Avg Cost/Token</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {metrics ? formatCurrency(metrics.averageCostPerToken) : loading ? '...' : '$0.000000'}
              </span>
            </div>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              per token
            </span>
          </div>
        </div>

        {/* Budget Status */}
        {budgetStatus && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${getAlertLevelColor(budgetStatus.alertLevel)}`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <Activity className="w-4 h-4 text-gray-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500">Daily Budget</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">
                  {formatCurrency(budgetStatus.dailyUsed)}
                </span>
                <span className="text-sm text-gray-500">
                  / {formatCurrency(budgetStatus.dailyBudget)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    budgetStatus.dailyPercentage >= 100 ? 'bg-red-500' :
                    budgetStatus.dailyPercentage >= 80 ? 'bg-orange-500' :
                    budgetStatus.dailyPercentage >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(budgetStatus.dailyPercentage, 100)}%` }}
                ></div>
              </div>
              <span className="text-xs text-gray-600">
                {budgetStatus.dailyPercentage.toFixed(1)}% used
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Cost Breakdown by Provider */}
      {metrics && Object.keys(metrics.costByProvider).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown by Provider</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(metrics.costByProvider).map(([provider, cost]) => (
              <div key={provider} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 capitalize">{provider}</div>
                  <div className="text-lg font-bold text-blue-600">{formatCurrency(cost)}</div>
                  <div className="text-xs text-gray-500">
                    {((cost / metrics.totalCost) * 100).toFixed(1)}% of total
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage Timeline */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Timeline</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tokens
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {chartData.slice(-10).map((dataPoint, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(dataPoint.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatNumber(dataPoint.tokens)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(dataPoint.cost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                        {dataPoint.provider}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading token cost data...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && tokenUsages.length === 0 && (
        <div className="text-center py-12">
          <Cpu className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No token usage data</h3>
          <p className="text-gray-600 mb-4">
            Start using AI features to see token cost analytics here.
          </p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Check Again
          </button>
        </div>
      )}
      </div>
    </div>
  );
};

export default TokenCostAnalytics;