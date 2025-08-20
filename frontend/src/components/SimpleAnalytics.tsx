import React, { useState, useEffect } from 'react';
import { BarChart3, Activity, Cpu, Zap, Users, TrendingUp, RefreshCw } from 'lucide-react';

interface SystemMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
}

interface PerformanceData {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  active_agents: number;
  tasks_completed: number;
}

const SimpleAnalytics: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data
  const mockMetrics: SystemMetric[] = [
    {
      id: 'cpu',
      name: 'CPU Usage',
      value: 45,
      unit: '%',
      trend: 'stable',
      status: 'good'
    },
    {
      id: 'memory',
      name: 'Memory Usage',
      value: 62,
      unit: '%',
      trend: 'up',
      status: 'warning'
    },
    {
      id: 'agents',
      name: 'Active Agents',
      value: 8,
      unit: 'agents',
      trend: 'up',
      status: 'good'
    },
    {
      id: 'tasks',
      name: 'Tasks Completed',
      value: 1247,
      unit: 'tasks',
      trend: 'up',
      status: 'good'
    }
  ];

  const mockPerformanceData: PerformanceData[] = [
    { timestamp: '10:00', cpu_usage: 35, memory_usage: 45, active_agents: 6, tasks_completed: 890 },
    { timestamp: '11:00', cpu_usage: 42, memory_usage: 52, active_agents: 7, tasks_completed: 1034 },
    { timestamp: '12:00', cpu_usage: 45, memory_usage: 62, active_agents: 8, tasks_completed: 1247 }
  ];

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setMetrics(mockMetrics);
      setPerformanceData(mockPerformanceData);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getMetricIcon = (id: string) => {
    switch (id) {
      case 'cpu': return <Cpu className="w-6 h-6" />;
      case 'memory': return <BarChart3 className="w-6 h-6" />;
      case 'agents': return <Users className="w-6 h-6" />;
      case 'tasks': return <Zap className="w-6 h-6" />;
      default: return <Activity className="w-6 h-6" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border p-6">
                <div className="h-6 bg-gray-200 rounded mb-3"></div>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Analytics</h1>
          <p className="text-gray-600">Monitor performance metrics and system health</p>
        </div>
        
        <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Data
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <div key={metric.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${getStatusColor(metric.status)}`}>
                {getMetricIcon(metric.id)}
              </div>
              {getTrendIcon(metric.trend)}
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500">{metric.name}</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">{metric.value}</span>
                <span className="text-sm text-gray-500">{metric.unit}</span>
              </div>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(metric.status)}`}>
                {metric.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPU %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Memory %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agents</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasks</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {performanceData.map((data, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{data.timestamp}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.cpu_usage}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.memory_usage}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.active_agents}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.tasks_completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-green-800">All Systems Operational</span>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-800">Database Connected</span>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-green-800">WebSocket Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleAnalytics;