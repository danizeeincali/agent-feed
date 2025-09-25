import React, { useState, useEffect } from 'react';
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
  Maximize2
} from 'lucide-react';
import { cn } from '../utils/cn';

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
}

const METRIC_COLORS = {
  cpu: 'blue',
  memory: 'green',
  network: 'purple',
  disk: 'orange',
  agents: 'pink',
  response: 'indigo'
};

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

export const SystemAnalytics: React.FC<SystemAnalyticsProps> = ({ className }) => {
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [selectedMetric, setSelectedMetric] = useState<string>('cpu');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  // Fetch performance metrics
  const { data: performanceMetrics = [], refetch: refetchMetrics } = useQuery<PerformanceMetric[]>({
    queryKey: ['performance-metrics', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/v1/analytics/performance?range=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch performance metrics');
      return response.json();
    },
    refetchInterval: autoRefresh ? 30000 : false,
    initialData: generateMockMetrics()
  });

  // Fetch agent performance
  const { data: agentPerformance = [], refetch: refetchAgentPerf } = useQuery<AgentPerformance[]>({
    queryKey: ['agent-performance', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/v1/analytics/agents?range=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch agent performance');
      return response.json();
    },
    refetchInterval: autoRefresh ? 30000 : false,
    initialData: generateMockAgentPerformance()
  });

  // Fetch system health
  const { data: systemHealth, refetch: refetchHealth } = useQuery<SystemHealth>({
    queryKey: ['system-health'],
    queryFn: async () => {
      const response = await fetch('/api/v1/analytics/health');
      if (!response.ok) throw new Error('Failed to fetch system health');
      return response.json();
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
    }
  });

  // Calculate current metrics
  const currentMetrics = performanceMetrics.length > 0 
    ? performanceMetrics[performanceMetrics.length - 1]
    : null;

  // Calculate trends
  const calculateTrend = (metricKey: keyof PerformanceMetric) => {
    if (performanceMetrics.length < 2) return 0;
    const recent = performanceMetrics.slice(-5);
    const firstValue = recent[0][metricKey] as number;
    const lastValue = recent[recent.length - 1][metricKey] as number;
    return ((lastValue - firstValue) / firstValue * 100);
  };

  // Refresh all data
  const handleRefreshAll = () => {
    refetchMetrics();
    refetchAgentPerf();
    refetchHealth();
  };

  // Export data
  const handleExportData = () => {
    const data = {
      performance: performanceMetrics,
      agents: agentPerformance,
      health: systemHealth,
      exported_at: new Date().toISOString()
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
  };

  return (
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
              onChange={(e) => setTimeRange(e.target.value)}
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
            className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
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

      {/* System Health Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">System Health Overview</h3>
          <div className="flex items-center space-x-2">
            <Gauge className="w-5 h-5 text-gray-400" />
            <span className="text-2xl font-bold text-gray-900">{systemHealth?.overall_score}%</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {systemHealth && Object.entries(systemHealth.components).map(([key, component]) => {
            const Icon = getHealthIcon(component.status);
            return (
              <div key={key} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900 capitalize">{key}</span>
                  </div>
                  <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getHealthColor(component.status))}>
                    {component.status}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mb-2">{component.message}</div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div 
                    className={cn(
                      'h-1 rounded-full transition-all duration-300',
                      component.status === 'healthy' ? 'bg-green-500' :
                      component.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    )}
                    style={{ width: `${component.score}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
        
        {systemHealth?.recommendations && systemHealth.recommendations.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Recommendations</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              {systemHealth.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

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
          const value = currentMetrics[key as keyof PerformanceMetric] as number;
          const trend = calculateTrend(key as keyof PerformanceMetric);
          const TrendIcon = trend > 0 ? TrendingUp : TrendingDown;
          const trendColor = trend > 0 ? 'text-red-500' : 'text-green-500';
          
          return (
            <div key={key} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{label}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {typeof value === 'number' ? value.toLocaleString() : value}{unit}
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
                <Maximize2 className="w-3 h-3 mr-1" />
                {expandedChart === key ? 'Collapse' : 'Expand'} Chart
              </button>
            </div>
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
              {agentPerformance.map((agent) => (
                <tr key={agent.agent_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{agent.agent_name}</div>
                      <div className="text-sm text-gray-500 capitalize">{agent.category}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm text-gray-900">{agent.cpu_usage}%</div>
                      <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className={cn(
                            'h-2 rounded-full',
                            agent.cpu_usage > 80 ? 'bg-red-500' :
                            agent.cpu_usage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                          )}
                          style={{ width: `${agent.cpu_usage}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm text-gray-900">{agent.memory_usage}%</div>
                      <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className={cn(
                            'h-2 rounded-full',
                            agent.memory_usage > 80 ? 'bg-red-500' :
                            agent.memory_usage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                          )}
                          style={{ width: `${agent.memory_usage}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.response_time}ms
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                      agent.success_rate > 0.95 ? 'bg-green-100 text-green-800' :
                      agent.success_rate > 0.85 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    )}>
                      {(agent.success_rate * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.tasks_completed.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.tokens_used.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.uptime.toFixed(1)}%
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

// Mock data generators for development
function generateMockMetrics(): PerformanceMetric[] {
  const metrics: PerformanceMetric[] = [];
  const now = new Date();
  
  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    metrics.push({
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
  }
  
  return metrics;
}

function generateMockAgentPerformance(): AgentPerformance[] {
  const agents = [
    { id: '1', name: 'Chief of Staff', category: 'core' },
    { id: '2', name: 'Research Agent', category: 'core' },
    { id: '3', name: 'SPARC Coordinator', category: 'sparc' },
    { id: '4', name: 'GitHub Manager', category: 'github' },
    { id: '5', name: 'Performance Analyzer', category: 'performance' },
    { id: '6', name: 'Neural Coordinator', category: 'neural' }
  ];
  
  return agents.map(agent => ({
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
  }));
}

export default SystemAnalytics;