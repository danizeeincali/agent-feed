/**
 * Agent Dynamic Pages Performance Dashboard
 * Real-time performance monitoring, benchmarking, and optimization insights
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, 
  Clock, 
  Memory, 
  Activity,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Play,
  Pause,
  Download,
  RefreshCw,
  Settings,
  Zap,
  Target,
  Layers,
  Database,
  Monitor
} from 'lucide-react';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import AgentPagesBenchmarkRunner, { ComprehensiveBenchmarkReport } from '../services/AgentPagesBenchmarkRunner';

interface DashboardProps {
  agentId?: string;
  autoStart?: boolean;
}

const AgentPerformanceDashboard: React.FC<DashboardProps> = ({ 
  agentId = 'test-agent', 
  autoStart = false 
}) => {
  const [isMonitoring, setIsMonitoring] = useState(autoStart);
  const [benchmarkReport, setBenchmarkReport] = useState<ComprehensiveBenchmarkReport | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [activeTab, setActiveTab] = useState<'monitor' | 'benchmark' | 'insights'>('monitor');
  
  const benchmarkRunnerRef = useRef<AgentPagesBenchmarkRunner | null>(null);
  
  const {
    metrics,
    alerts,
    insights,
    isMonitoring: hookMonitoring,
    trackRender,
    trackApiCall,
    resolveAlert,
    performanceSummary,
    formatBytes,
    formatDuration
  } = usePerformanceMonitor(isMonitoring);

  useEffect(() => {
    benchmarkRunnerRef.current = new AgentPagesBenchmarkRunner();
    
    return () => {
      if (benchmarkRunnerRef.current) {
        benchmarkRunnerRef.current.dispose();
      }
    };
  }, []);

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
  };

  const runBenchmarks = async () => {
    if (!benchmarkRunnerRef.current) return;
    
    setIsBenchmarking(true);
    try {
      const report = await benchmarkRunnerRef.current.runComprehensiveBenchmarks();
      setBenchmarkReport(report);
      setActiveTab('benchmark');
    } catch (error) {
      console.error('Benchmark failed:', error);
    } finally {
      setIsBenchmarking(false);
    }
  };

  const downloadReport = () => {
    if (!benchmarkReport) return;

    const reportData = {
      ...benchmarkReport,
      exportedAt: new Date().toISOString(),
      agentId
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agent-performance-report-${agentId}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPerformanceIcon = (performance: string) => {
    switch (performance) {
      case 'excellent': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'good': return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Monitor className="w-8 h-8 text-blue-600" />
                Agent Performance Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Real-time monitoring and optimization for Agent {agentId}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={toggleMonitoring}
                className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  isMonitoring 
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {isMonitoring ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Stop Monitoring
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Monitoring
                  </>
                )}
              </button>
              
              <button
                onClick={runBenchmarks}
                disabled={isBenchmarking}
                className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  isBenchmarking 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isBenchmarking ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Run Benchmarks
                  </>
                )}
              </button>

              {benchmarkReport && (
                <button
                  onClick={downloadReport}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </button>
              )}
            </div>
          </div>

          {/* Performance Summary */}
          <div className={`p-4 rounded-lg border ${getStatusColor(performanceSummary.status)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold">
                  {performanceSummary.score}
                  <span className="text-lg font-normal">/100</span>
                </div>
                <div>
                  <div className="font-medium">Overall Performance</div>
                  <div className="text-sm opacity-75">
                    {performanceSummary.issues} active issues
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  Status: {performanceSummary.status.toUpperCase()}
                </span>
                {performanceSummary.status === 'good' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'monitor', label: 'Real-time Monitor', icon: Activity },
              { id: 'benchmark', label: 'Benchmarks', icon: BarChart3 },
              { id: 'insights', label: 'Insights', icon: Target }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'monitor' && (
          <div className="space-y-6">
            {/* Real-time Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {metrics.length > 0 && (
                <>
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Render Time</span>
                      <Clock className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatDuration(metrics[metrics.length - 1]?.componentRenderTime || 0)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Avg: {formatDuration(metrics.reduce((sum, m) => sum + m.componentRenderTime, 0) / metrics.length)}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">API Latency</span>
                      <Database className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatDuration(metrics[metrics.length - 1]?.apiLatency || 0)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Avg: {formatDuration(metrics.reduce((sum, m) => sum + m.apiLatency, 0) / metrics.length)}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Memory Usage</span>
                      <Memory className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatBytes(metrics[metrics.length - 1]?.memoryUsage || 0)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Components: {metrics[metrics.length - 1]?.componentCount || 0}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Page Load</span>
                      <Layers className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatDuration(metrics[metrics.length - 1]?.pageLoadTime || 0)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Time to Interactive
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Active Alerts */}
            {alerts.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Alerts</h2>
                <div className="space-y-3">
                  {alerts.slice(0, 5).map(alert => (
                    <div key={alert.id} className={`p-3 rounded-lg border ${
                      alert.type === 'critical' 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-yellow-50 border-yellow-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={`w-4 h-4 ${
                            alert.type === 'critical' ? 'text-red-600' : 'text-yellow-600'
                          }`} />
                          <span className="font-medium text-gray-900">
                            {alert.message}
                          </span>
                        </div>
                        <button
                          onClick={() => resolveAlert(alert.id)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Resolve
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Insights */}
            {insights.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Insights</h2>
                <div className="space-y-4">
                  {insights.slice(0, 3).map((insight, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          insight.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          insight.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {insight.impact.toUpperCase()} IMPACT
                        </span>
                        <span className="text-sm text-gray-500">{insight.category}</span>
                      </div>
                      <h3 className="font-medium text-gray-900 mb-1">{insight.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                      <p className="text-sm text-blue-600">{insight.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'benchmark' && benchmarkReport && (
          <div className="space-y-6">
            {/* Benchmark Summary */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Benchmark Results</h2>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-blue-600">
                    {benchmarkReport.summary.overallScore}
                  </span>
                  <span className="text-gray-500">/100</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {benchmarkReport.summary.passRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Pass Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {benchmarkReport.summary.criticalIssuesCount}
                  </div>
                  <div className="text-sm text-gray-600">Critical Issues</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {Object.keys(benchmarkReport.results).length}
                  </div>
                  <div className="text-sm text-gray-600">Test Scenarios</div>
                </div>
              </div>

              {/* Test Results */}
              {Object.entries(benchmarkReport.results).map(([scenarioName, result]) => (
                result && (
                  <div key={scenarioName} className="border rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">{result.scenarioName}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-blue-600">
                          {result.overallScore}
                        </span>
                        <span className="text-gray-500">/100</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {result.testCases.map((testCase, index) => (
                        <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            {getPerformanceIcon(testCase.performance)}
                            <span className="text-sm font-medium">{testCase.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-600">
                              {testCase.actualValue.toFixed(1)}ms
                            </span>
                            <span className="text-gray-400">/</span>
                            <span className="text-gray-500">
                              {testCase.targetValue}ms target
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {result.criticalIssues.length > 0 && (
                      <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
                        <div className="font-medium text-red-800 mb-2">Critical Issues:</div>
                        <ul className="text-sm text-red-700 space-y-1">
                          {result.criticalIssues.map((issue, index) => (
                            <li key={index}>• {issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {activeTab === 'insights' && benchmarkReport && (
          <div className="space-y-6">
            {/* Optimization Priority */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Optimization Priority</h2>
              <div className="space-y-4">
                {benchmarkReport.summary.optimizationPriority.map((opt, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{opt.area}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        opt.priority === 'high' ? 'bg-red-100 text-red-800' :
                        opt.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {opt.priority.toUpperCase()} PRIORITY
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div className="text-sm">
                        <span className="text-gray-600">Impact:</span>
                        <span className="ml-2 font-medium">{opt.impact}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Effort:</span>
                        <span className="ml-2 font-medium">{opt.effort}</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">Recommendations:</div>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {opt.recommendations.map((rec, recIndex) => (
                          <li key={recIndex} className="flex items-start gap-2">
                            <span className="text-blue-500 mt-1">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentPerformanceDashboard;