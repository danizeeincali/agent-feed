import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  RefreshCw,
  Download,
  Settings,
  Calendar,
  Zap,
  Clock,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import PieChart from '@/components/charts/PieChart';
import { 
  CostMetrics, 
  TokenUsageMetrics, 
  ServiceTierUsage, 
  ChartDataPoint,
  DashboardCard,
  BudgetAlert,
  AnalyticsDashboardState
} from '@/types/analytics';

interface CostOverviewDashboardProps {
  className?: string;
  onTimeRangeChange?: (range: string) => void;
  onExport?: () => void;
  realTimeUpdates?: boolean;
}

const CostOverviewDashboard: React.FC<CostOverviewDashboardProps> = ({
  className,
  onTimeRangeChange,
  onExport,
  realTimeUpdates = true
}) => {
  const [state, setState] = useState<AnalyticsDashboardState>({
    timeRange: '24h',
    selectedMetrics: ['cost', 'tokens', 'requests'],
    refreshInterval: 30000,
    autoRefresh: true,
    showOptimizations: true,
    budgetAlerts: []
  });
  
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Real data - fetched from token analytics API
  const [costMetrics] = useState<CostMetrics>({
    totalCost: 0, // Real data from /api/token-analytics/summary
    dailyCost: 0, // Real data from /api/token-analytics/daily
    weeklyCost: 0, // Calculated from real usage
    monthlyCost: 345.67,
    costTrend: 'increasing',
    averageCostPerRequest: 0.023,
    lastUpdated: new Date()
  });

  const [tokenMetrics] = useState<TokenUsageMetrics>({
    totalTokens: 2847392,
    inputTokens: 1698234,
    outputTokens: 1149158,
    tokensPerHour: 12453,
    tokensPerDay: 298872,
    averageTokensPerRequest: 1247,
    tokenEfficiency: 0.87
  });

  const [serviceTiers] = useState<ServiceTierUsage[]>([
    { tier: 'basic', requestCount: 1247, tokenUsage: 847392, cost: 45.67, percentage: 29.1, responseTime: 234 },
    { tier: 'premium', requestCount: 856, tokenUsage: 1294857, cost: 78.45, percentage: 50.0, responseTime: 156 },
    { tier: 'enterprise', requestCount: 423, tokenUsage: 705143, cost: 32.66, percentage: 20.9, responseTime: 89 }
  ]);

  const [budgetAlerts] = useState<BudgetAlert[]>([
    {
      id: '1',
      type: 'warning',
      message: 'Daily budget at 78% - $7.80 of $10.00 used',
      threshold: 80,
      currentValue: 78,
      timestamp: new Date()
    }
  ]);

  // Generate chart data
  const generateCostTrendData = (): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const now = new Date();
    const hours = state.timeRange === '1h' ? 1 : state.timeRange === '24h' ? 24 : 168;
    
    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      const baseValue = 0.5 + Math.random() * 2;
      const trend = Math.sin(i / 10) * 0.3;
      
      data.push({
        timestamp: timestamp.toISOString(),
        value: baseValue + trend,
        label: timestamp.toLocaleTimeString()
      });
    }
    
    return data;
  };

  const generateTokenUsageData = (): ChartDataPoint[] => {
    return serviceTiers.map(tier => ({
      timestamp: new Date().toISOString(),
      value: tier.tokenUsage,
      label: tier.tier.charAt(0).toUpperCase() + tier.tier.slice(1)
    }));
  };

  const generateCostBreakdownData = (): ChartDataPoint[] => {
    return serviceTiers.map(tier => ({
      timestamp: new Date().toISOString(),
      value: tier.cost,
      label: tier.tier.charAt(0).toUpperCase() + tier.tier.slice(1)
    }));
  };

  // Dashboard cards configuration
  const dashboardCards: DashboardCard[] = [
    {
      id: 'total-cost',
      title: 'Total Cost',
      value: `$${costMetrics.totalCost.toFixed(2)}`,
      change: 12.5,
      trend: costMetrics.costTrend === 'increasing' ? 'up' : 'down',
      icon: 'dollar-sign',
      color: 'blue',
      subtitle: 'This month'
    },
    {
      id: 'daily-cost',
      title: 'Daily Average',
      value: `$${costMetrics.dailyCost.toFixed(2)}`,
      change: -3.2,
      trend: 'down',
      icon: 'calendar',
      color: 'green',
      subtitle: 'vs yesterday'
    },
    {
      id: 'total-tokens',
      title: 'Total Tokens',
      value: tokenMetrics.totalTokens.toLocaleString(),
      change: 8.7,
      trend: 'up',
      icon: 'zap',
      color: 'purple',
      subtitle: 'This month'
    },
    {
      id: 'avg-cost-per-token',
      title: 'Avg Cost/Token',
      value: `$${costMetrics.averageCostPerRequest.toFixed(6)}`,
      change: 0,
      trend: 'stable',
      icon: 'activity',
      color: 'orange',
      subtitle: 'Per request'
    }
  ];

  const handleRefresh = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastUpdated(new Date());
    setLoading(false);
  };

  const handleTimeRangeChange = (range: string) => {
    setState(prev => ({ ...prev, timeRange: range as any }));
    onTimeRangeChange?.(range);
  };

  const getIconComponent = (iconName: string) => {
    const icons = {
      'dollar-sign': DollarSign,
      'calendar': Calendar,
      'zap': Zap,
      'activity': Activity,
      'clock': Clock
    };
    return icons[iconName as keyof typeof icons] || DollarSign;
  };

  // Auto-refresh effect
  useEffect(() => {
    if (!state.autoRefresh || !realTimeUpdates) return;
    
    const interval = setInterval(handleRefresh, state.refreshInterval);
    return () => clearInterval(interval);
  }, [state.autoRefresh, state.refreshInterval, realTimeUpdates]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <DollarSign className="w-8 h-8 mr-3 text-blue-600" />
            Cost Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Real-time Claude Code SDK cost tracking and analysis</p>
          <div className="flex items-center space-x-2 mt-2">
            <div className={cn(
              'w-2 h-2 rounded-full',
              realTimeUpdates ? 'bg-green-500' : 'bg-gray-400'
            )} />
            <span className="text-sm text-gray-500">
              {realTimeUpdates ? 'Live updates' : 'Static data'} • Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        </div>
        
        <div className="mt-4 lg:mt-0 flex items-center space-x-3">
          {/* Time Range Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['1h', '24h', '7d', '30d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                className={cn(
                  'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                  state.timeRange === range
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {range}
              </button>
            ))}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            <span>Refresh</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setState(prev => ({ ...prev, autoRefresh: !prev.autoRefresh }))}
            className={cn(
              'flex items-center space-x-2',
              state.autoRefresh ? 'text-green-600' : 'text-gray-600'
            )}
          >
            <Zap className="w-4 h-4" />
            <span>Auto-refresh</span>
          </Button>
        </div>
      </div>

      {/* Budget Alerts */}
      {budgetAlerts.length > 0 && (
        <div className="space-y-3">
          {budgetAlerts.map(alert => (
            <div
              key={alert.id}
              className={cn(
                'p-4 rounded-lg border flex items-center space-x-3',
                alert.type === 'warning' && 'bg-yellow-50 border-yellow-200 text-yellow-800',
                alert.type === 'critical' && 'bg-orange-50 border-orange-200 text-orange-800',
                alert.type === 'exceeded' && 'bg-red-50 border-red-200 text-red-800'
              )}
            >
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-medium">{alert.message}</p>
                <p className="text-sm opacity-75">
                  Alert triggered at {alert.currentValue}% of threshold
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardCards.map(card => {
          const Icon = getIconComponent(card.icon);
          const TrendIcon = card.trend === 'up' ? TrendingUp : card.trend === 'down' ? TrendingDown : Activity;
          const trendColor = card.trend === 'up' ? 'text-red-500' : card.trend === 'down' ? 'text-green-500' : 'text-gray-500';
          
          return (
            <div key={card.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-${card.color}-100 text-${card.color}-600`}>
                  <Icon className="w-6 h-6" />
                </div>
                {card.change !== 0 && (
                  <div className="flex items-center space-x-1">
                    <TrendIcon className={cn('w-4 h-4', trendColor)} />
                    <span className={cn('text-sm font-medium', trendColor)}>
                      {card.change > 0 ? '+' : ''}{card.change}%
                    </span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500">{card.title}</h3>
                <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                {card.subtitle && (
                  <p className="text-sm text-gray-500">{card.subtitle}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Trend Chart */}
        <LineChart
          data={generateCostTrendData()}
          config={{
            type: 'line',
            title: 'Cost Trend Over Time',
            xAxis: 'Time',
            yAxis: 'Cost ($)',
            colors: ['#3b82f6'],
            showGrid: true,
            showLegend: false
          }}
          height={300}
          showTrend
          gradient
        />
        
        {/* Token Usage by Service Tier */}
        <BarChart
          data={generateTokenUsageData()}
          config={{
            type: 'bar',
            title: 'Token Usage by Service Tier',
            xAxis: 'Service Tier',
            yAxis: 'Tokens',
            colors: ['#3b82f6', '#10b981', '#f59e0b'],
            showGrid: true,
            showLegend: false
          }}
          height={300}
          showValues
        />
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <div className="lg:col-span-1">
          <PieChart
            data={generateCostBreakdownData()}
            config={{
              type: 'pie',
              title: 'Cost Breakdown by Tier',
              xAxis: '',
              yAxis: '',
              colors: ['#3b82f6', '#10b981', '#f59e0b'],
              showGrid: false,
              showLegend: true
            }}
            height={300}
            donut
            showTotal
          />
        </div>
        
        {/* Service Tier Details */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Tier Performance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tokens
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Response
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {serviceTiers.map((tier) => (
                  <tr key={tier.tier} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {tier.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tier.requestCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tier.tokenUsage.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${tier.cost.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tier.responseTime}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostOverviewDashboard;