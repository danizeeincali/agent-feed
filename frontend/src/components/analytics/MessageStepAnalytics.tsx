import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Activity,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import LineChart from '../charts/LineChart';
import BarChart from '../charts/BarChart';
import PieChart from '../charts/PieChart';
import { 
  MessageAnalytics, 
  StepAnalytics, 
  ChartDataPoint
} from '../types/analytics';

interface MessageStepAnalyticsProps {
  className?: string;
  timeRange?: string;
  realTimeUpdates?: boolean;
}

const MessageStepAnalytics: React.FC<MessageStepAnalyticsProps> = ({
  className,
  timeRange = '24h',
  realTimeUpdates = true
}) => {
  const [selectedView, setSelectedView] = useState<'messages' | 'steps' | 'combined'>('combined');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Mock message analytics data
  const [messageAnalytics] = useState<MessageAnalytics>({
    totalMessages: 1247,
    successfulMessages: 1198,
    failedMessages: 49,
    averageResponseTime: 1234,
    messageTypes: {
      'text-generation': 567,
      'code-analysis': 234,
      'data-processing': 189,
      'image-generation': 123,
      'document-parsing': 89,
      'other': 45
    },
    errorRate: 0.039
  });

  // Mock step analytics data
  const [stepAnalytics] = useState<StepAnalytics>({
    totalSteps: 3456,
    completedSteps: 3298,
    failedSteps: 158,
    averageStepDuration: 2340,
    stepTypes: {
      'prompt-generation': 1234,
      'api-call': 987,
      'response-parsing': 654,
      'data-validation': 321,
      'error-handling': 158,
      'caching': 102
    },
    stepSuccessRate: 0.954
  });

  // Generate time series data
  const generateMessageTrendData = (): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const now = new Date();
    const hours = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : 168;
    
    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      const baseValue = 45 + Math.random() * 30;
      const trend = Math.sin(i / 10) * 5;
      
      data.push({
        timestamp: timestamp.toISOString(),
        value: Math.round(baseValue + trend),
        label: timestamp.toLocaleTimeString()
      });
    }
    
    return data;
  };

  const generateStepTrendData = (): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const now = new Date();
    const hours = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : 168;
    
    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      const baseValue = 120 + Math.random() * 80;
      const trend = Math.cos(i / 12) * 10;
      
      data.push({
        timestamp: timestamp.toISOString(),
        value: Math.round(baseValue + trend),
        label: timestamp.toLocaleTimeString()
      });
    }
    
    return data;
  };

  const generateResponseTimeData = (): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const now = new Date();
    const hours = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : 168;
    
    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      const baseValue = 1200 + Math.random() * 600;
      const spike = Math.random() > 0.9 ? 1000 : 0; // Occasional spikes
      
      data.push({
        timestamp: timestamp.toISOString(),
        value: Math.round(baseValue + spike),
        label: timestamp.toLocaleTimeString()
      });
    }
    
    return data;
  };

  const messageTypeData = Object.entries(messageAnalytics.messageTypes).map(([type, count]) => ({
    timestamp: new Date().toISOString(),
    value: count,
    label: type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }));

  const stepTypeData = Object.entries(stepAnalytics.stepTypes).map(([type, count]) => ({
    timestamp: new Date().toISOString(),
    value: count,
    label: type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }));

  const successRate = messageAnalytics.successfulMessages / messageAnalytics.totalMessages * 100;
  const stepSuccessRate = stepAnalytics.stepSuccessRate * 100;
  const errorRate = messageAnalytics.errorRate * 100;

  // Auto-refresh effect
  useEffect(() => {
    if (!realTimeUpdates) return;
    
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000);
    
    return () => clearInterval(interval);
  }, [realTimeUpdates]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <MessageSquare className="w-7 h-7 mr-3 text-blue-600" />
            Message & Step Analytics
          </h2>
          <p className="text-gray-600 mt-1">
            Detailed analysis of message processing and step execution
          </p>
          <div className="flex items-center space-x-2 mt-2">
            <div className={cn(
              'w-2 h-2 rounded-full',
              realTimeUpdates ? 'bg-green-500' : 'bg-gray-400'
            )} />
            <span className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        </div>
        
        {/* View Toggle */}
        <div className="mt-4 lg:mt-0 flex bg-gray-100 rounded-lg p-1">
          {([{value: 'messages', label: 'Messages'}, {value: 'steps', label: 'Steps'}, {value: 'combined', label: 'Combined'}] as const).map((view) => (
            <button
              key={view.value}
              onClick={() => setSelectedView(view.value)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                selectedView === view.value
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Messages */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
              <MessageSquare className="w-6 h-6" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-500">Total Messages</h3>
            <div className="text-2xl font-bold text-gray-900">
              {messageAnalytics.totalMessages.toLocaleString()}
            </div>
            <div className="text-sm text-green-600">+12.5% vs yesterday</div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-green-100 text-green-600">
              <CheckCircle className="w-6 h-6" />
            </div>
            <Activity className="w-4 h-4 text-gray-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-500">Success Rate</h3>
            <div className="text-2xl font-bold text-gray-900">
              {successRate.toFixed(1)}%
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full" 
                style={{ width: `${successRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Average Response Time */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-yellow-100 text-yellow-600">
              <Clock className="w-6 h-6" />
            </div>
            <TrendingDown className="w-4 h-4 text-green-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-500">Avg Response Time</h3>
            <div className="text-2xl font-bold text-gray-900">
              {messageAnalytics.averageResponseTime}ms
            </div>
            <div className="text-sm text-green-600">-8.2% improvement</div>
          </div>
        </div>

        {/* Error Rate */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={cn(
              'p-3 rounded-lg',
              errorRate < 1 ? 'bg-green-100 text-green-600' : 
              errorRate < 5 ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'
            )}>
              {errorRate < 1 ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-sm text-gray-500">Target: &lt;1%</span>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-500">Error Rate</h3>
            <div className="text-2xl font-bold text-gray-900">
              {errorRate.toFixed(2)}%
            </div>
            <div className="text-sm text-gray-600">
              {messageAnalytics.failedMessages} failed messages
            </div>
          </div>
        </div>
      </div>

      {/* Step Analytics Cards */}
      {(selectedView === 'steps' || selectedView === 'combined') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Steps */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                <Play className="w-6 h-6" />
              </div>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500">Total Steps</h3>
              <div className="text-2xl font-bold text-gray-900">
                {stepAnalytics.totalSteps.toLocaleString()}
              </div>
              <div className="text-sm text-green-600">+18.3% vs yesterday</div>
            </div>
          </div>

          {/* Step Success Rate */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-green-100 text-green-600">
                <CheckCircle className="w-6 h-6" />
              </div>
              <Activity className="w-4 h-4 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500">Step Success Rate</h3>
              <div className="text-2xl font-bold text-gray-900">
                {stepSuccessRate.toFixed(1)}%
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${stepSuccessRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Average Step Duration */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-orange-100 text-orange-600">
                <Clock className="w-6 h-6" />
              </div>
              <TrendingDown className="w-4 h-4 text-green-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500">Avg Step Duration</h3>
              <div className="text-2xl font-bold text-gray-900">
                {stepAnalytics.averageStepDuration}ms
              </div>
              <div className="text-sm text-green-600">-12.1% improvement</div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Trend */}
        {(selectedView === 'messages' || selectedView === 'combined') && (
          <LineChart
            data={generateMessageTrendData()}
            config={{
              type: 'line',
              title: 'Message Volume Over Time',
              xAxis: 'Time',
              yAxis: 'Messages',
              colors: ['#3b82f6'],
              showGrid: true,
              showLegend: false
            }}
            height={300}
            showTrend
            gradient
          />
        )}

        {/* Step Trend */}
        {(selectedView === 'steps' || selectedView === 'combined') && (
          <LineChart
            data={generateStepTrendData()}
            config={{
              type: 'line',
              title: 'Step Execution Over Time',
              xAxis: 'Time',
              yAxis: 'Steps',
              colors: ['#8b5cf6'],
              showGrid: true,
              showLegend: false
            }}
            height={300}
            showTrend
            gradient
          />
        )}

        {/* Response Time Trend */}
        <LineChart
          data={generateResponseTimeData()}
          config={{
            type: 'line',
            title: 'Response Time Trends',
            xAxis: 'Time',
            yAxis: 'Response Time (ms)',
            colors: ['#f59e0b'],
            showGrid: true,
            showLegend: false
          }}
          height={300}
          showTrend
        />

        {/* Combined Performance */}
        {selectedView === 'combined' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Messages/Steps Ratio</span>
                <span className="text-sm font-bold text-gray-900">
                  1:{(stepAnalytics.totalSteps / messageAnalytics.totalMessages).toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Avg Steps per Message</span>
                <span className="text-sm font-bold text-gray-900">
                  {(stepAnalytics.totalSteps / messageAnalytics.totalMessages).toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Overall Efficiency</span>
                <span className="text-sm font-bold text-green-600">
                  {((successRate + stepSuccessRate) / 2).toFixed(1)}%
                </span>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600 mb-2">System Health</div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={cn(
                      'h-3 rounded-full',
                      ((successRate + stepSuccessRate) / 2) > 95 ? 'bg-green-500' :
                      ((successRate + stepSuccessRate) / 2) > 85 ? 'bg-yellow-500' : 'bg-red-500'
                    )}
                    style={{ width: `${(successRate + stepSuccessRate) / 2}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Type Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Types */}
        {(selectedView === 'messages' || selectedView === 'combined') && (
          <PieChart
            data={messageTypeData}
            config={{
              type: 'pie',
              title: 'Message Types Distribution',
              xAxis: '',
              yAxis: '',
              colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'],
              showGrid: false,
              showLegend: true
            }}
            height={300}
            donut
            showTotal
          />
        )}

        {/* Step Types */}
        {(selectedView === 'steps' || selectedView === 'combined') && (
          <BarChart
            data={stepTypeData}
            config={{
              type: 'bar',
              title: 'Step Types Execution Count',
              xAxis: 'Step Type',
              yAxis: 'Count',
              colors: ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6b7280'],
              showGrid: true,
              showLegend: false
            }}
            height={300}
            showValues
          />
        )}
      </div>
    </div>
  );
};

export default MessageStepAnalytics;