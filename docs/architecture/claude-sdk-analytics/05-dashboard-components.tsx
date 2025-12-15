/**
 * Claude Code SDK Cost Tracking Analytics - Dashboard UI Components
 * React component hierarchy for analytics dashboard with real-time updates
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { UsageAnalytics, LiveMetrics, Alert, UserAnalyticsSummary } from './01-data-models';

// =============================================
// MAIN DASHBOARD LAYOUT
// =============================================

export interface DashboardProps {
  userId?: string;
  timeRange: TimeRange;
  refreshInterval?: number;
}

export const AnalyticsDashboard: React.FC<DashboardProps> = ({
  userId,
  timeRange,
  refreshInterval = 30000
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const queryClient = useQueryClient();

  // Real-time data subscription
  useEffect(() => {
    const eventSource = new EventSource('/api/analytics/live/stream');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (event.type === 'metrics') {
        queryClient.setQueryData(['live-metrics'], data);
      } else if (event.type === 'alert') {
        setAlerts(prev => [data, ...prev.slice(0, 9)]);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [queryClient]);

  return (
    <div className="analytics-dashboard">
      <DashboardHeader
        alerts={alerts}
        onAlertDismiss={(alertId) =>
          setAlerts(prev => prev.filter(a => a.id !== alertId))
        }
      />

      <DashboardNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="dashboard-content">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <OverviewTab
              key="overview"
              userId={userId}
              timeRange={timeRange}
            />
          )}
          {activeTab === 'costs' && (
            <CostsTab
              key="costs"
              userId={userId}
              timeRange={timeRange}
            />
          )}
          {activeTab === 'performance' && (
            <PerformanceTab
              key="performance"
              userId={userId}
              timeRange={timeRange}
            />
          )}
          {activeTab === 'users' && (
            <UsersTab
              key="users"
              timeRange={timeRange}
            />
          )}
          {activeTab === 'alerts' && (
            <AlertsTab
              key="alerts"
              alerts={alerts}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

// =============================================
// DASHBOARD HEADER COMPONENTS
// =============================================

interface DashboardHeaderProps {
  alerts: Alert[];
  onAlertDismiss: (alertId: string) => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ alerts, onAlertDismiss }) => {
  const { data: liveMetrics } = useQuery({
    queryKey: ['live-metrics'],
    queryFn: () => fetch('/api/analytics/live').then(res => res.json()),
    refetchInterval: 5000
  });

  const activeAlerts = alerts.filter(a => a.status === 'active');
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');

  return (
    <header className="dashboard-header">
      <div className="header-title">
        <h1>Claude SDK Analytics</h1>
        <div className="live-indicator">
          <div className="status-dot animate-pulse" />
          <span>Live</span>
        </div>
      </div>

      <div className="header-metrics">
        <MetricCard
          title="Requests/sec"
          value={liveMetrics?.data.requestsPerSecond || 0}
          format="number"
          trend={0.05}
        />
        <MetricCard
          title="Avg Response"
          value={liveMetrics?.data.avgResponseTime || 0}
          format="duration"
          trend={-0.02}
        />
        <MetricCard
          title="Error Rate"
          value={liveMetrics?.data.errorRate || 0}
          format="percentage"
          trend={-0.15}
          alert={liveMetrics?.data.errorRate > 5}
        />
        <MetricCard
          title="Cost/hour"
          value={liveMetrics?.data.costPerSecond * 3600 || 0}
          format="currency"
          trend={0.12}
        />
      </div>

      <div className="header-alerts">
        <AlertDropdown
          alerts={activeAlerts}
          criticalCount={criticalAlerts.length}
          onDismiss={onAlertDismiss}
        />
      </div>
    </header>
  );
};

// =============================================
// NAVIGATION COMPONENTS
// =============================================

type DashboardTab = 'overview' | 'costs' | 'performance' | 'users' | 'alerts';

interface DashboardNavigationProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

const DashboardNavigation: React.FC<DashboardNavigationProps> = ({
  activeTab,
  onTabChange
}) => {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'costs', label: 'Costs', icon: '💰' },
    { id: 'performance', label: 'Performance', icon: '⚡' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'alerts', label: 'Alerts', icon: '🚨' }
  ] as const;

  return (
    <nav className="dashboard-navigation">
      <div className="nav-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="nav-actions">
        <TimeRangePicker />
        <RefreshButton />
        <ExportButton />
      </div>
    </nav>
  );
};

// =============================================
// OVERVIEW TAB COMPONENTS
// =============================================

interface OverviewTabProps {
  userId?: string;
  timeRange: TimeRange;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ userId, timeRange }) => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['usage-analytics', timeRange, userId],
    queryFn: () => fetchUsageAnalytics(timeRange, userId)
  });

  const { data: summary } = useQuery({
    queryKey: ['usage-summary', 'today'],
    queryFn: () => fetchUsageSummary('today', true)
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="overview-tab"
    >
      {/* Key Metrics Grid */}
      <div className="metrics-grid">
        <SummaryCard
          title="Total Requests"
          value={summary?.data.current.totalRequests || 0}
          change={summary?.data.change?.requests}
          icon="📝"
        />
        <SummaryCard
          title="Total Tokens"
          value={summary?.data.current.totalTokens || 0}
          change={summary?.data.change?.tokens}
          icon="🎯"
          format="number"
        />
        <SummaryCard
          title="Total Cost"
          value={summary?.data.current.totalCost || 0}
          change={summary?.data.change?.cost}
          icon="💰"
          format="currency"
        />
        <SummaryCard
          title="Active Users"
          value={summary?.data.current.uniqueUsers || 0}
          change={summary?.data.change?.users}
          icon="👥"
        />
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        <ChartCard title="Usage Trends" className="span-2">
          <UsageTrendsChart data={analytics?.data.patterns.trend || []} />
        </ChartCard>

        <ChartCard title="Cost Breakdown">
          <CostBreakdownChart data={analytics?.data.costs.byModel || {}} />
        </ChartCard>

        <ChartCard title="Performance Metrics">
          <PerformanceOverviewChart
            responseTime={analytics?.data.performance.avgResponseTime || 0}
            errorRate={analytics?.data.performance.errorRate || 0}
            tokensPerSecond={analytics?.data.performance.avgTokensPerSecond || 0}
          />
        </ChartCard>

        <ChartCard title="Top Tools" className="span-2">
          <TopToolsChart data={analytics?.data.patterns.mostUsedTools || []} />
        </ChartCard>
      </div>

      {/* Recent Activity */}
      <div className="activity-section">
        <h3>Recent Activity</h3>
        <RecentActivityFeed userId={userId} />
      </div>
    </motion.div>
  );
};

// =============================================
// COSTS TAB COMPONENTS
// =============================================

interface CostsTabProps {
  userId?: string;
  timeRange: TimeRange;
}

const CostsTab: React.FC<CostsTabProps> = ({ userId, timeRange }) => {
  const [selectedBreakdown, setSelectedBreakdown] = useState<'model' | 'user' | 'feature'>('model');

  const { data: costAnalytics } = useQuery({
    queryKey: ['cost-analytics', timeRange, selectedBreakdown, userId],
    queryFn: () => fetchCostAnalytics(timeRange, selectedBreakdown, userId)
  });

  const { data: projections } = useQuery({
    queryKey: ['cost-projections', '1month'],
    queryFn: () => fetchCostProjections('1month')
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="costs-tab"
    >
      {/* Cost Summary */}
      <div className="cost-summary">
        <div className="summary-cards">
          <CostSummaryCard
            title="This Month"
            amount={costAnalytics?.data.totalCost || 0}
            trend={0.15}
            projection={projections?.data.baselineProjection.amount}
          />
          <CostSummaryCard
            title="This Week"
            amount={costAnalytics?.data.weeklyCost || 0}
            trend={-0.05}
          />
          <CostSummaryCard
            title="Today"
            amount={costAnalytics?.data.dailyCost || 0}
            trend={0.08}
          />
        </div>

        <div className="cost-controls">
          <BreakdownSelector
            value={selectedBreakdown}
            onChange={setSelectedBreakdown}
            options={[
              { value: 'model', label: 'By Model' },
              { value: 'user', label: 'By User' },
              { value: 'feature', label: 'By Feature' }
            ]}
          />
        </div>
      </div>

      {/* Cost Charts */}
      <div className="cost-charts">
        <ChartCard title="Cost Trends" className="span-2">
          <CostTrendsChart data={costAnalytics?.data.trends || []} />
        </ChartCard>

        <ChartCard title="Cost Distribution">
          <CostDistributionChart
            data={costAnalytics?.data.breakdown || []}
            breakdown={selectedBreakdown}
          />
        </ChartCard>

        <ChartCard title="Cost Projections">
          <CostProjectionsChart data={projections?.data} />
        </ChartCard>
      </div>

      {/* Cost Optimization */}
      <div className="cost-optimization">
        <h3>Cost Optimization Recommendations</h3>
        <OptimizationRecommendations
          recommendations={projections?.data.recommendations || []}
        />
      </div>
    </motion.div>
  );
};

// =============================================
// CHART COMPONENTS
// =============================================

interface UsageTrendsChartProps {
  data: TrendPoint[];
}

const UsageTrendsChart: React.FC<UsageTrendsChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis />
        <Tooltip
          labelFormatter={(value) => new Date(value).toLocaleDateString()}
          formatter={(value: number) => [value.toLocaleString(), 'Requests']}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#8884d8"
          fill="#8884d8"
          fillOpacity={0.3}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

interface CostBreakdownChartProps {
  data: Record<string, number>;
}

const CostBreakdownChart: React.FC<CostBreakdownChartProps> = ({ data }) => {
  const chartData = Object.entries(data).map(([name, value]) => ({ name, value }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          fill="#8884d8"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        />
        <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']} />
      </PieChart>
    </ResponsiveContainer>
  );
};

interface TopToolsChartProps {
  data: ToolUsageStats[];
}

const TopToolsChart: React.FC<TopToolsChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="horizontal">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="toolName" type="category" width={80} />
        <Tooltip
          formatter={(value: number) => [value.toLocaleString(), 'Uses']}
        />
        <Bar dataKey="usageCount" fill="#82ca9d" />
      </BarChart>
    </ResponsiveContainer>
  );
};

// =============================================
// UTILITY COMPONENTS
// =============================================

interface MetricCardProps {
  title: string;
  value: number;
  format?: 'number' | 'currency' | 'percentage' | 'duration';
  trend?: number;
  alert?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  format = 'number',
  trend,
  alert
}) => {
  const formatValue = (val: number, fmt: string) => {
    switch (fmt) {
      case 'currency': return `$${val.toFixed(2)}`;
      case 'percentage': return `${val.toFixed(1)}%`;
      case 'duration': return `${val.toFixed(0)}ms`;
      default: return val.toLocaleString();
    }
  };

  const trendColor = trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-gray-500';
  const trendIcon = trend > 0 ? '↗' : trend < 0 ? '↘' : '→';

  return (
    <div className={`metric-card ${alert ? 'alert' : ''}`}>
      <div className="metric-title">{title}</div>
      <div className="metric-value">{formatValue(value, format)}</div>
      {trend !== undefined && (
        <div className={`metric-trend ${trendColor}`}>
          <span className="trend-icon">{trendIcon}</span>
          <span>{Math.abs(trend * 100).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
};

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, children, className }) => {
  return (
    <div className={`chart-card ${className || ''}`}>
      <div className="chart-header">
        <h3>{title}</h3>
      </div>
      <div className="chart-content">
        {children}
      </div>
    </div>
  );
};

const DashboardSkeleton: React.FC = () => {
  return (
    <div className="dashboard-skeleton">
      <div className="skeleton-metrics">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton-card animate-pulse" />
        ))}
      </div>
      <div className="skeleton-charts">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton-chart animate-pulse" />
        ))}
      </div>
    </div>
  );
};

// =============================================
// CUSTOM HOOKS
// =============================================

const useRealTimeMetrics = (refreshInterval: number = 5000) => {
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource('/api/analytics/live/stream');

    eventSource.onopen = () => setIsConnected(true);
    eventSource.onerror = () => setIsConnected(false);

    eventSource.addEventListener('metrics', (event) => {
      const data = JSON.parse(event.data);
      setMetrics(data);
    });

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, []);

  return { metrics, isConnected };
};

const useAnalyticsQuery = <T>(
  endpoint: string,
  params: Record<string, any> = {},
  options: { enabled?: boolean; refetchInterval?: number } = {}
) => {
  return useQuery({
    queryKey: [endpoint, params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });

      return fetch(`/api/analytics/${endpoint}?${searchParams}`)
        .then(res => res.json());
    },
    ...options
  });
};

// =============================================
// API HELPER FUNCTIONS
// =============================================

const fetchUsageAnalytics = async (
  timeRange: TimeRange,
  userId?: string
): Promise<{ data: UsageAnalytics }> => {
  const params = new URLSearchParams({
    startDate: timeRange.startDate.toISOString(),
    endDate: timeRange.endDate.toISOString(),
    granularity: 'day'
  });

  if (userId) {
    params.append('filters', JSON.stringify({ userId }));
  }

  const response = await fetch(`/api/analytics/usage?${params}`);
  return response.json();
};

const fetchUsageSummary = async (
  period: string,
  compare: boolean = false
): Promise<{ data: { current: any; previous?: any; change?: any } }> => {
  const params = new URLSearchParams({ period });
  if (compare) params.append('compare', 'true');

  const response = await fetch(`/api/analytics/usage/summary?${params}`);
  return response.json();
};

const fetchCostAnalytics = async (
  timeRange: TimeRange,
  breakdown: string,
  userId?: string
) => {
  const params = new URLSearchParams({
    startDate: timeRange.startDate.toISOString(),
    endDate: timeRange.endDate.toISOString(),
    breakdown
  });

  if (userId) {
    params.append('userId', userId);
  }

  const response = await fetch(`/api/analytics/costs?${params}`);
  return response.json();
};

const fetchCostProjections = async (horizon: string) => {
  const response = await fetch(`/api/analytics/costs/projections?horizon=${horizon}`);
  return response.json();
};

// =============================================
// EXPORT TYPES AND COMPONENTS
// =============================================

export type { DashboardProps, DashboardTab, MetricCardProps, ChartCardProps };

export {
  AnalyticsDashboard,
  DashboardHeader,
  DashboardNavigation,
  OverviewTab,
  CostsTab,
  MetricCard,
  ChartCard,
  UsageTrendsChart,
  CostBreakdownChart,
  TopToolsChart,
  useRealTimeMetrics,
  useAnalyticsQuery
};

// Supporting interfaces
interface TimeRange {
  startDate: Date;
  endDate: Date;
}

interface TrendPoint {
  timestamp: string;
  value: number;
  label?: string;
}

interface ToolUsageStats {
  toolName: string;
  usageCount: number;
  totalCost: number;
  avgExecutionTime: number;
  successRate: number;
  errorCount: number;
}