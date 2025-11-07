import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { TrendingDown, TrendingUp, AlertTriangle, DollarSign, Zap, Target } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface CostMetrics {
  daily_cost_usd: number;
  cache_write_tokens: number;
  cache_read_tokens: number;
  cache_hit_ratio: number;
  cost_trend: Array<{ date: string; cost_usd: number }>;
}

const COST_THRESHOLD = 5.0; // Alert threshold in USD
const BASELINE_COST = 14.67; // Pre-optimization cost

export function CostDashboard() {
  const [metrics, setMetrics] = useState<CostMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/cost-metrics/summary');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();

        // Transform API response to match component interface
        const data = {
          daily_cost_usd: result.data.today.total_cost_usd,
          cache_write_tokens: result.data.today.total_cache_write_tokens,
          cache_read_tokens: result.data.today.total_cache_read_tokens,
          cache_hit_ratio: result.data.today.cache_hit_ratio * 100,
          cost_trend: result.data.trend.map((item: any) => ({
            date: item.date,
            cost_usd: item.total_cost_usd
          }))
        };

        setMetrics(data);
        setError(null);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch cost metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load metrics');
        setLoading(false);
      }
    };

    // Initial fetch
    fetchMetrics();

    // Poll every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading cost metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded shadow-lg max-w-md">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-6 w-6 text-red-500 mr-2" />
            <h3 className="text-lg font-semibold text-red-800">Error Loading Metrics</h3>
          </div>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">No metrics available</p>
      </div>
    );
  }

  const isHighCost = metrics.daily_cost_usd > COST_THRESHOLD;
  const savingsAmount = BASELINE_COST - metrics.daily_cost_usd;
  const savingsPercent = ((savingsAmount / BASELINE_COST) * 100).toFixed(0);
  const monthlySavings = (savingsAmount * 30).toFixed(2);

  // Chart configuration
  const chartData = {
    labels: metrics.cost_trend.map((d) => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Daily Cost (USD)',
        data: metrics.cost_trend.map((d) => d.cost_usd),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => `Cost: $${context.parsed.y.toFixed(2)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `$${value}`,
        },
      },
    },
  };

  return (
    <div className="cost-dashboard p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-green-600" />
            Cache Cost Monitoring
          </h2>
          <p className="text-gray-600 mt-2">
            Real-time tracking of prompt caching costs and optimization results
          </p>
        </div>

        {/* Cost Alert */}
        {isHighCost && (
          <div
            className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r shadow-sm"
            data-testid="cost-alert"
          >
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-semibold">Cost threshold exceeded!</p>
                <p className="text-red-700 text-sm mt-1">
                  Daily cost: ${metrics.daily_cost_usd.toFixed(2)} (threshold: ${COST_THRESHOLD.toFixed(2)})
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Daily Cost */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Daily Cost</h3>
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900" data-testid="daily-cost">
              ${metrics.daily_cost_usd.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Current 24-hour period</p>
          </div>

          {/* Cache Write Tokens */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Cache Write Tokens</h3>
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-semibold text-gray-900" data-testid="cache-write-tokens">
              {metrics.cache_write_tokens.toLocaleString()} tokens
            </p>
            <p className="text-xs text-gray-500 mt-1">Tokens written to cache</p>
          </div>

          {/* Cache Read Tokens */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Cache Read Tokens</h3>
              <Target className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-2xl font-semibold text-gray-900" data-testid="cache-read-tokens">
              {metrics.cache_read_tokens.toLocaleString()} tokens
            </p>
            <p className="text-xs text-gray-500 mt-1">Tokens read from cache</p>
          </div>
        </div>

        {/* Cache Hit Ratio */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Cache Hit Ratio</h3>
            <span
              className="text-3xl font-bold text-green-600"
              data-testid="cache-hit-ratio"
            >
              {metrics.cache_hit_ratio.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="bg-green-500 h-4 transition-all duration-500 rounded-full"
              style={{ width: `${metrics.cache_hit_ratio}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {metrics.cache_hit_ratio >= 90
              ? 'Excellent cache performance!'
              : metrics.cache_hit_ratio >= 70
              ? 'Good cache utilization'
              : 'Cache optimization recommended'}
          </p>
        </div>

        {/* Cost Trend Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">7-Day Cost Trend</h3>
          <div className="h-64 md:h-80" data-testid="cost-trend-chart">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Before/After Comparison */}
        <div
          className="bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-lg shadow-sm border border-green-200"
          data-testid="cost-comparison"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingDown className="h-6 w-6 text-green-600" />
            Optimization Results
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Before */}
            <div className="bg-white p-4 rounded shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Before</p>
              <p className="text-2xl font-bold text-red-600">${BASELINE_COST.toFixed(2)}/day</p>
              <p className="text-xs text-gray-500 mt-1">Baseline cost</p>
            </div>

            {/* After */}
            <div className="bg-white p-4 rounded shadow-sm">
              <p className="text-sm text-gray-600 mb-1">After</p>
              <p className="text-2xl font-bold text-green-600">
                ${metrics.daily_cost_usd.toFixed(2)}/day
              </p>
              <p className="text-xs text-gray-500 mt-1">Current cost</p>
            </div>

            {/* Daily Savings */}
            <div className="bg-white p-4 rounded shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Daily Savings</p>
              <p className="text-2xl font-bold text-blue-600">${savingsAmount.toFixed(2)}</p>
              <p className="text-sm text-green-600 font-medium mt-1">
                {savingsPercent}% reduction
              </p>
            </div>

            {/* Monthly Projection */}
            <div className="bg-white p-4 rounded shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Monthly Savings</p>
              <p className="text-2xl font-bold text-purple-600">${monthlySavings}</p>
              <p className="text-xs text-gray-500 mt-1">Projected (30 days)</p>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-4 p-4 bg-white rounded shadow-sm">
            <p className="text-gray-700">
              <span className="font-semibold text-green-600">Great news!</span> Your cache
              optimization has reduced costs by{' '}
              <span className="font-bold">{savingsPercent}%</span>, saving{' '}
              <span className="font-bold">${savingsAmount.toFixed(2)}</span> per day. At this
              rate, you'll save approximately{' '}
              <span className="font-bold">${monthlySavings}</span> per month!
            </p>
          </div>
        </div>

        {/* Last Updated */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Metrics update automatically every 30 seconds</p>
        </div>
      </div>
    </div>
  );
}

export default CostDashboard;
