import React, { useState, useEffect, memo, useCallback, useMemo, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Cpu,
  Database,
  Zap,
  Clock,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle,
  Monitor,
  Network,
  HardDrive,
  Gauge,
  RefreshCw,
  Download,
  Calendar,
  Filter,
  Maximize2,
  Minimize2,
  Loader2,
  Eye,
  EyeOff,
  Info,
  X
} from 'lucide-react';
import { cn } from '../utils/cn';
import { ErrorBoundary } from 'react-error-boundary';
import {
  safeArray,
  safeObject,
  safeString,
  safeNumber,
  safeDate,
  ErrorFallback,
  LoadingFallback,
  withSafetyWrapper,
  safeHandler
} from '../utils/safetyUtils';

interface PerformanceMetric {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  network_io: number;
  disk_io: number;
  active_agents: number;
  response_time: number;
  throughput: number;
  error_rate: number;
}

interface AgentPerformance {
  agent_id: string;
  agent_name: string;
  category: string;
  cpu_usage: number;
  memory_usage: number;
  response_time: number;
  success_rate: number;
  tasks_completed: number;
  tokens_used: number;
  uptime: number;
  last_activity: string;
}

interface SystemHealth {
  overall_score: number;
  components: {
    database: { status: 'healthy' | 'warning' | 'critical'; score: number; message: string };
    api: { status: 'healthy' | 'warning' | 'critical'; score: number; message: string };
    websocket: { status: 'healthy' | 'warning' | 'critical'; score: number; message: string };
    agents: { status: 'healthy' | 'warning' | 'critical'; score: number; message: string };
    memory: { status: 'healthy' | 'warning' | 'critical'; score: number; message: string };
    network: { status: 'healthy' | 'warning' | 'critical'; score: number; message: string };
  };
  recommendations: string[];
}

interface SystemAnalyticsProps {
  className?: string;
  onError?: (error: Error) => void;
  fallback?: React.ReactNode;
  retryable?: boolean;
}

const METRIC_COLORS = {
  cpu: 'blue',
  memory: 'green',
  network: 'purple',
  disk: 'orange',
  agents: 'pink',
  response: 'indigo'
};

// Safe data transformers
const transformToSafeMetric = (metric: any): PerformanceMetric | null => {
  try {
    if (!metric || typeof metric !== 'object') return null;
    
    return {
      timestamp: safeDate(metric.timestamp).toISOString(),
      cpu_usage: Math.min(100, Math.max(0, safeNumber(metric.cpu_usage, 0))),
      memory_usage: Math.min(100, Math.max(0, safeNumber(metric.memory_usage, 0))),
      network_io: Math.min(100, Math.max(0, safeNumber(metric.network_io, 0))),
      disk_io: Math.min(100, Math.max(0, safeNumber(metric.disk_io, 0))),
      active_agents: Math.max(0, safeNumber(metric.active_agents, 0)),
      response_time: Math.max(0, safeNumber(metric.response_time, 0)),
      throughput: Math.max(0, safeNumber(metric.throughput, 0)),
      error_rate: Math.min(100, Math.max(0, safeNumber(metric.error_rate, 0)))
    };
  } catch (error) {
    console.error('Failed to transform performance metric:', error);
    return null;
  }
};

const transformToSafeAgentPerformance = (agent: any): AgentPerformance | null => {
  try {
    if (!agent || typeof agent !== 'object') return null;
    
    return {
      agent_id: safeString(agent.agent_id, `agent-${Date.now()}`),
      agent_name: safeString(agent.agent_name, 'Unknown Agent'),
      category: safeString(agent.category, 'general'),
      cpu_usage: Math.min(100, Math.max(0, safeNumber(agent.cpu_usage, 0))),
      memory_usage: Math.min(100, Math.max(0, safeNumber(agent.memory_usage, 0))),
      response_time: Math.max(0, safeNumber(agent.response_time, 0)),
      success_rate: Math.min(1, Math.max(0, safeNumber(agent.success_rate, 0))),
      tasks_completed: Math.max(0, safeNumber(agent.tasks_completed, 0)),
      tokens_used: Math.max(0, safeNumber(agent.tokens_used, 0)),
      uptime: Math.min(100, Math.max(0, safeNumber(agent.uptime, 0))),
      last_activity: safeDate(agent.last_activity).toISOString()
    };
  } catch (error) {
    console.error('Failed to transform agent performance:', error);
    return null;
  }
};

const transformToSafeSystemHealth = (health: any): SystemHealth => {
  try {
    const components = safeObject(health?.components);
    
    const safeComponent = (comp: any) => ({
      status: ['healthy', 'warning', 'critical'].includes(comp?.status) ? comp.status : 'warning',
      score: Math.min(100, Math.max(0, safeNumber(comp?.score, 0))),
      message: safeString(comp?.message, 'No status message available')
    });
    
    return {
      overall_score: Math.min(100, Math.max(0, safeNumber(health?.overall_score, 0))),
      components: {
        database: safeComponent(components.database),
        api: safeComponent(components.api),
        websocket: safeComponent(components.websocket),
        agents: safeComponent(components.agents),
        memory: safeComponent(components.memory),
        network: safeComponent(components.network)
      },
      recommendations: safeArray(health?.recommendations).filter(rec => typeof rec === 'string')
    };
  } catch (error) {
    console.error('Failed to transform system health:', error);
    return {
      overall_score: 0,
      components: {
        database: { status: 'critical', score: 0, message: 'Status unknown' },
        api: { status: 'critical', score: 0, message: 'Status unknown' },
        websocket: { status: 'critical', score: 0, message: 'Status unknown' },
        agents: { status: 'critical', score: 0, message: 'Status unknown' },
        memory: { status: 'critical', score: 0, message: 'Status unknown' },
        network: { status: 'critical', score: 0, message: 'Status unknown' }
      },
      recommendations: ['System health check failed - please contact support']
    };
  }
};

// Safe utility functions
const getHealthColor = (status: string) => {
  switch (status) {
    case 'healthy': return 'text-green-600 bg-green-100';
    case 'warning': return 'text-yellow-600 bg-yellow-100';
    case 'critical': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

const getHealthIcon = (status: string) => {
  switch (status) {
    case 'healthy': return CheckCircle;
    case 'warning': return AlertTriangle;
    case 'critical': return AlertTriangle;
    default: return Monitor;
  }
};

// Loading skeleton
const AnalyticsSkeleton: React.FC = memo(() => (
  <div className="animate-pulse space-y-6">
    <div className="bg-gray-200 h-8 rounded w-1/3"></div>
    <div className="bg-gray-200 h-32 rounded-lg"></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
      ))}
    </div>
    <div className="bg-gray-200 h-64 rounded-lg"></div>
  </div>
));

AnalyticsSkeleton.displayName = 'AnalyticsSkeleton';

// Error boundary for individual metric cards
const MetricCardErrorBoundary: React.FC<{ children: React.ReactNode; metricName?: string }> = ({ children, metricName }) => (
  <ErrorBoundary
    FallbackComponent={({ error, resetErrorBoundary }) => (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center text-red-700 mb-2">
          <AlertTriangle className="w-4 h-4 mr-2" />
          <span className="font-medium">Metric Error</span>
        </div>
        <p className="text-red-600 text-sm mb-2">
          Failed to load {metricName ? metricName : 'metric'} data.
        </p>
        <button
          onClick={resetErrorBoundary}
          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

const BulletproofSystemAnalytics: React.FC<SystemAnalyticsProps> = memo(({ 
  className = '',
  onError,
  fallback,
  retryable = true
}) => {
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [selectedMetric, setSelectedMetric] = useState<string>('cpu');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Safe error handler
  const handleError = useCallback((err: Error, context?: string) => {
    console.error(`SystemAnalytics Error${context ? ` (${context})` : ''}:`, err);
    setError(err.message || 'An unexpected error occurred');
    onError?.(err);
  }, [onError]);

  // Safe query configurations with comprehensive error handling
  const { data: performanceMetrics = [], refetch: refetchMetrics, isLoading: metricsLoading, error: metricsError } = useQuery<PerformanceMetric[]>({
    queryKey: ['performance-metrics', timeRange],
    queryFn: async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`/api/v1/analytics/performance?range=${encodeURIComponent(timeRange)}`, {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response format');
        }
        
        const rawMetrics = safeArray(data.metrics || data);
        return rawMetrics
          .map(transformToSafeMetric)
          .filter((metric): metric is PerformanceMetric => metric !== null);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout - please try again');
        }
        throw error;
      }
    },
    refetchInterval: autoRefresh ? 30000 : false,
    initialData: generateMockMetrics(),
    retry: (failureCount, error) => {
      if (failureCount >= 3) return false;
      if (error instanceof Error && error.message.includes('timeout')) return true;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  const { data: agentPerformance = [], refetch: refetchAgentPerf, isLoading: agentsLoading, error: agentsError } = useQuery<AgentPerformance[]>({
    queryKey: ['agent-performance', timeRange],
    queryFn: async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`/api/v1/analytics/agents?range=${encodeURIComponent(timeRange)}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const rawAgents = safeArray(data.agents || data);
        
        return rawAgents
          .map(transformToSafeAgentPerformance)
          .filter((agent): agent is AgentPerformance => agent !== null);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout - please try again');
        }
        throw error;
      }
    },
    refetchInterval: autoRefresh ? 30000 : false,
    initialData: generateMockAgentPerformance(),
    retry: (failureCount, error) => {
      if (failureCount >= 3) return false;
      return failureCount < 2;
    }
  });

  const { data: systemHealth, refetch: refetchHealth, isLoading: healthLoading, error: healthError } = useQuery<SystemHealth>({
    queryKey: ['system-health'],
    queryFn: async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch('/api/v1/analytics/health', {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return transformToSafeSystemHealth(data);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout - please try again');
        }
        throw error;
      }
    },
    refetchInterval: autoRefresh ? 60000 : false,
    initialData: {
      overall_score: 92,
      components: {
        database: { status: 'healthy', score: 98, message: 'All database connections healthy' },
        api: { status: 'healthy', score: 95, message: 'API response times optimal' },
        websocket: { status: 'healthy', score: 90, message: 'WebSocket connections stable' },
        agents: { status: 'warning', score: 85, message: '1 agent experiencing high memory usage' },
        memory: { status: 'healthy', score: 88, message: 'Memory usage within normal range' },
        network: { status: 'healthy', score: 96, message: 'Network latency optimal' }
      },
      recommendations: [
        'Consider scaling down Memory Coordinator agent',
        'Monitor GitHub Manager agent performance',
        'Schedule maintenance window for system updates'
      ]
    },
    retry: (failureCount) => failureCount < 2
  });

  // Handle query errors
  useEffect(() => {
    if (metricsError) {
      handleError(metricsError instanceof Error ? metricsError : new Error('Failed to fetch metrics'), 'metrics');
    }
    if (agentsError) {
      handleError(agentsError instanceof Error ? agentsError : new Error('Failed to fetch agent data'), 'agents');
    }
    if (healthError) {
      handleError(healthError instanceof Error ? healthError : new Error('Failed to fetch health data'), 'health');
    }
  }, [metricsError, agentsError, healthError, handleError]);

  // Safe metric calculations
  const currentMetrics = useMemo(() => {
    try {
      return safeArray(performanceMetrics).length > 0 
        ? performanceMetrics[performanceMetrics.length - 1]
        : null;
    } catch (error) {
      console.error('Error getting current metrics:', error);
      return null;
    }
  }, [performanceMetrics]);

  const calculateTrend = useCallback((metricKey: keyof PerformanceMetric) => {
    try {
      const metrics = safeArray(performanceMetrics);
      if (metrics.length < 2) return 0;
      
      const recent = metrics.slice(-5);
      if (recent.length < 2) return 0;
      
      const firstValue = safeNumber(recent[0][metricKey] as number, 0);
      const lastValue = safeNumber(recent[recent.length - 1][metricKey] as number, 0);
      
      if (firstValue === 0) return 0;
      
      return ((lastValue - firstValue) / firstValue * 100);
    } catch (error) {
      console.error('Error calculating trend:', error);
      return 0;
    }
  }, [performanceMetrics]);

  // Safe handlers
  const handleRefreshAll = useCallback(() => {
    try {
      setRetryCount(prev => prev + 1);
      setError(null);
      
      refetchMetrics();
      refetchAgentPerf();
      refetchHealth();
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to refresh data'), 'refresh');
    }
  }, [refetchMetrics, refetchAgentPerf, refetchHealth, handleError]);

  const handleExportData = useCallback(() => {
    try {
      const data = {
        performance: performanceMetrics,
        agents: agentPerformance,
        health: systemHealth,
        exported_at: new Date().toISOString(),
        time_range: timeRange
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to export data'), 'export');
    }
  }, [performanceMetrics, agentPerformance, systemHealth, timeRange, handleError]);

  // Loading state
  const isLoading = metricsLoading && agentsLoading && healthLoading;
  
  if (isLoading && !performanceMetrics.length && !agentPerformance.length && !systemHealth) {
    return (
      <div className={`space-y-6 ${className}`}>
        <AnalyticsSkeleton />
      </div>
    );
  }

  // Error state
  if (error && !performanceMetrics.length && !agentPerformance.length) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="text-gray-400 mb-4">
            <BarChart3 className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Analytics</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          {retryable && (
            <div className="space-y-2">
              <button 
                onClick={handleRefreshAll}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                    Retrying...
                  </>
                ) : (
                  'Try again'
                )}
              </button>
              {retryCount > 0 && (
                <p className="text-xs text-gray-500">
                  Retry attempt: {retryCount}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <ErrorFallback 
          error={error} 
          resetErrorBoundary={resetErrorBoundary} 
          componentName="System Analytics" 
        />
      )}
    >
      <div className={cn('space-y-6', className)}>
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="w-8 h-8 mr-3 text-blue-600" />
              System Analytics
            </h2>
            <p className="text-gray-600 mt-1">Real-time performance monitoring and system insights</p>
          </div>
          
          <div className="mt-4 lg:mt-0 flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(safeString(e.target.value, '24h'))}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
            
            <button
              onClick={handleExportData}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            
            <button
              onClick={handleRefreshAll}
              disabled={isLoading}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                'flex items-center px-3 py-2 rounded transition-colors',
                autoRefresh 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              <Zap className="w-4 h-4 mr-2" />
              Auto-refresh: {autoRefresh ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        {/* Error notifications */}
        {error && (performanceMetrics.length > 0 || agentPerformance.length > 0) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
              <div>
                <p className="text-yellow-800 text-sm font-medium">Partial data loaded</p>
                <p className="text-yellow-700 text-sm">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-yellow-600 hover:text-yellow-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* System Health Overview */}
        {systemHealth && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">System Health Overview</h3>
              <div className="flex items-center space-x-2">
                <Gauge className="w-5 h-5 text-gray-400" />
                <span className="text-2xl font-bold text-gray-900">
                  {safeNumber(systemHealth.overall_score, 0)}%
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {systemHealth && Object.entries(systemHealth.components).map(([key, component]) => {
                const Icon = getHealthIcon(component.status);
                return (
                  <MetricCardErrorBoundary key={key} metricName={key}>
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Icon className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900 capitalize">{key}</span>
                        </div>
                        <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getHealthColor(component.status))}>
                          {component.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        {safeString(component.message, 'No status message')}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div 
                          className={cn(
                            'h-1 rounded-full transition-all duration-300',
                            component.status === 'healthy' ? 'bg-green-500' :
                            component.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                          )}
                          style={{ width: `${Math.min(100, Math.max(0, safeNumber(component.score, 0)))}%` }}
                        ></div>
                      </div>
                    </div>
                  </MetricCardErrorBoundary>
                );
              })}
            </div>
            
            {/* Recommendations */}
            {systemHealth.recommendations && systemHealth.recommendations.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-blue-900">Recommendations</h4>
                  <button
                    onClick={() => setShowRecommendations(!showRecommendations)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {showRecommendations ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                {showRecommendations && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <ul className="text-sm text-blue-800 space-y-1">
                      {safeArray(systemHealth.recommendations).map((rec, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>{safeString(rec, 'Invalid recommendation')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Performance Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentMetrics && [
            { key: 'cpu_usage', label: 'CPU Usage', icon: Cpu, color: 'blue', unit: '%' },
            { key: 'memory_usage', label: 'Memory Usage', icon: Database, color: 'green', unit: '%' },
            { key: 'network_io', label: 'Network I/O', icon: Network, color: 'purple', unit: '%' },
            { key: 'response_time', label: 'Response Time', icon: Clock, color: 'orange', unit: 'ms' },
            { key: 'active_agents', label: 'Active Agents', icon: Users, color: 'pink', unit: '' },
            { key: 'throughput', label: 'Throughput', icon: Activity, color: 'indigo', unit: '/min' }
          ].map(({ key, label, icon: Icon, color, unit }) => {
            const value = safeNumber(currentMetrics[key as keyof PerformanceMetric] as number, 0);
            const trend = calculateTrend(key as keyof PerformanceMetric);
            const TrendIcon = trend > 0 ? TrendingUp : TrendingDown;
            
            // For CPU and memory, upward trend is bad. For others, it's generally good.
            const trendColor = (['cpu_usage', 'memory_usage', 'error_rate'].includes(key))
              ? (trend > 0 ? 'text-red-500' : 'text-green-500')
              : (trend > 0 ? 'text-green-500' : 'text-red-500');
            
            return (
              <MetricCardErrorBoundary key={key} metricName={label}>
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{label}</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {typeof value === 'number' ? value.toLocaleString() : safeString(value)}{unit}
                      </p>
                      {Math.abs(trend) > 0.1 && (
                        <div className="flex items-center mt-1">
                          <TrendIcon className={cn('w-3 h-3 mr-1', trendColor)} />
                          <span className={cn('text-xs', trendColor)}>
                            {Math.abs(trend).toFixed(1)}% vs last period
                          </span>
                        </div>
                      )}
                    </div>
                    <div className={`p-3 bg-${color}-100 rounded-lg`}>
                      <Icon className={`w-6 h-6 text-${color}-600`} />
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setExpandedChart(expandedChart === key ? null : key)}
                    className="mt-4 w-full flex items-center justify-center px-3 py-2 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                  >
                    {expandedChart === key ? <Minimize2 className="w-3 h-3 mr-1" /> : <Maximize2 className="w-3 h-3 mr-1" />}
                    {expandedChart === key ? 'Collapse' : 'Expand'} Chart
                  </button>
                </div>
              </MetricCardErrorBoundary>
            );
          })}
        </div>

        {/* Agent Performance Table */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Agent Performance Details</h3>
            <p className="text-sm text-gray-600 mt-1">Individual agent resource usage and performance metrics</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CPU %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Memory %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Response Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Success Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tasks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tokens
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uptime
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {safeArray(agentPerformance).map((agent) => (
                  <tr key={agent.agent_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {safeString(agent.agent_name, 'Unknown Agent')}
                        </div>
                        <div className="text-sm text-gray-500 capitalize">
                          {safeString(agent.category, 'general')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm text-gray-900">
                          {safeNumber(agent.cpu_usage, 0)}%
                        </div>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={cn(
                              'h-2 rounded-full',
                              agent.cpu_usage > 80 ? 'bg-red-500' :
                              agent.cpu_usage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                            )}
                            style={{ width: `${Math.min(100, Math.max(0, safeNumber(agent.cpu_usage, 0)))}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm text-gray-900">
                          {safeNumber(agent.memory_usage, 0)}%
                        </div>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={cn(
                              'h-2 rounded-full',
                              agent.memory_usage > 80 ? 'bg-red-500' :
                              agent.memory_usage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                            )}
                            style={{ width: `${Math.min(100, Math.max(0, safeNumber(agent.memory_usage, 0)))}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {safeNumber(agent.response_time, 0)}ms
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                        agent.success_rate > 0.95 ? 'bg-green-100 text-green-800' :
                        agent.success_rate > 0.85 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      )}>
                        {(safeNumber(agent.success_rate, 0) * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {safeNumber(agent.tasks_completed, 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {safeNumber(agent.tokens_used, 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {safeNumber(agent.uptime, 0).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {agentPerformance.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No agent performance data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
});

// Mock data generators with comprehensive safety
function generateMockMetrics(): PerformanceMetric[] {
  try {
    const metrics: PerformanceMetric[] = [];
    const now = new Date();
    
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      const metric = transformToSafeMetric({
        timestamp: timestamp.toISOString(),
        cpu_usage: Math.floor(Math.random() * 40) + 30,
        memory_usage: Math.floor(Math.random() * 30) + 50,
        network_io: Math.floor(Math.random() * 50) + 20,
        disk_io: Math.floor(Math.random() * 20) + 10,
        active_agents: Math.floor(Math.random() * 5) + 12,
        response_time: Math.floor(Math.random() * 500) + 800,
        throughput: Math.floor(Math.random() * 100) + 150,
        error_rate: Math.random() * 2
      });
      
      if (metric) metrics.push(metric);
    }
    
    return metrics;
  } catch (error) {
    console.error('Error generating mock metrics:', error);
    return [];
  }
}

function generateMockAgentPerformance(): AgentPerformance[] {
  try {
    const agents = [
      { id: '1', name: 'Chief of Staff', category: 'core' },
      { id: '2', name: 'Research Agent', category: 'core' },
      { id: '3', name: 'SPARC Coordinator', category: 'sparc' },
      { id: '4', name: 'GitHub Manager', category: 'github' },
      { id: '5', name: 'Performance Analyzer', category: 'performance' },
      { id: '6', name: 'Neural Coordinator', category: 'neural' }
    ];
    
    return agents.map(agent => {
      const agentData = transformToSafeAgentPerformance({
        agent_id: agent.id,
        agent_name: agent.name,
        category: agent.category,
        cpu_usage: Math.floor(Math.random() * 60) + 20,
        memory_usage: Math.floor(Math.random() * 50) + 30,
        response_time: Math.floor(Math.random() * 1000) + 500,
        success_rate: 0.85 + Math.random() * 0.15,
        tasks_completed: Math.floor(Math.random() * 200) + 50,
        tokens_used: Math.floor(Math.random() * 50000) + 10000,
        uptime: 95 + Math.random() * 5,
        last_activity: new Date(Date.now() - Math.random() * 3600000).toISOString()
      });
      
      return agentData;
    }).filter((agent): agent is AgentPerformance => agent !== null);
  } catch (error) {
    console.error('Error generating mock agent performance:', error);
    return [];
  }
}

BulletproofSystemAnalytics.displayName = 'BulletproofSystemAnalytics';

// Export with safety wrapper
export default withSafetyWrapper(BulletproofSystemAnalytics, 'BulletproofSystemAnalytics');
export { BulletproofSystemAnalytics };