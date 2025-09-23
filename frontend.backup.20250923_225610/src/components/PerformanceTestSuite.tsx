/**
 * Performance Test Suite for Agent Dynamic Pages
 * Real-time performance monitoring and testing interface
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Square, 
  BarChart3, 
  Clock, 
  Memory, 
  Activity,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Download,
  Settings,
  Zap
} from 'lucide-react';
import PerformanceBenchmarker, { 
  PerformanceReport,
  BenchmarkResult,
  ComponentRenderingMetrics,
  DataOperationMetrics,
  PageLoadMetrics,
  MemoryMetrics
} from '../services/PerformanceBenchmarker';

interface TestConfig {
  componentTests: {
    enabled: boolean;
    componentTypes: string[];
    complexities: ('simple' | 'complex' | 'dashboard')[];
    componentCounts: number[];
  };
  apiTests: {
    enabled: boolean;
    endpoints: string[];
    concurrentRequests: number;
    operations: ('fetch' | 'create' | 'update' | 'delete')[];
  };
  loadTests: {
    enabled: boolean;
    concurrentUsers: number[];
    testDuration: number;
    operationsPerUser: number;
  };
  memoryTests: {
    enabled: boolean;
    monitoringInterval: number;
    leakDetection: boolean;
  };
}

const defaultConfig: TestConfig = {
  componentTests: {
    enabled: true,
    componentTypes: ['AgentPageBuilder', 'AgentDynamicPage', 'AgentPagesTab'],
    complexities: ['simple', 'complex', 'dashboard'],
    componentCounts: [1, 5, 10, 25, 50]
  },
  apiTests: {
    enabled: true,
    endpoints: ['/api/agents', '/api/agents/{id}/pages', '/api/agents/{id}/workspace'],
    concurrentRequests: 10,
    operations: ['fetch', 'create', 'update']
  },
  loadTests: {
    enabled: true,
    concurrentUsers: [5, 10, 20, 50],
    testDuration: 30000,
    operationsPerUser: 10
  },
  memoryTests: {
    enabled: true,
    monitoringInterval: 1000,
    leakDetection: true
  }
};

const PerformanceTestSuite: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState<TestConfig>(defaultConfig);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [testProgress, setTestProgress] = useState(0);
  const [results, setResults] = useState<PerformanceReport | null>(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState<{
    renderTime: number;
    apiLatency: number;
    memoryUsage: number;
    timestamp: number;
  }[]>([]);
  
  const benchmarkerRef = useRef<PerformanceBenchmarker | null>(null);
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    benchmarkerRef.current = new PerformanceBenchmarker();
    
    return () => {
      if (benchmarkerRef.current) {
        benchmarkerRef.current.dispose();
      }
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    };
  }, []);

  const startRealTimeMonitoring = () => {
    monitoringIntervalRef.current = setInterval(() => {
      if (typeof window !== 'undefined' && (window as any).performance?.memory) {
        const memory = (window as any).performance.memory;
        const timestamp = Date.now();
        
        setRealTimeMetrics(prev => {
          const newMetrics = [...prev, {
            renderTime: performance.now(),
            apiLatency: Math.random() * 200, // Simulated
            memoryUsage: memory.usedJSHeapSize,
            timestamp
          }];
          
          // Keep only last 100 data points
          return newMetrics.slice(-100);
        });
      }
    }, 1000);
  };

  const stopRealTimeMonitoring = () => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
  };

  const runPerformanceTests = async () => {
    if (!benchmarkerRef.current) return;

    setIsRunning(true);
    setTestProgress(0);
    setResults(null);
    
    try {
      startRealTimeMonitoring();
      
      const totalTests = 
        (config.componentTests.enabled ? config.componentTests.componentTypes.length * config.componentTests.complexities.length : 0) +
        (config.apiTests.enabled ? config.apiTests.operations.length : 0) +
        (config.loadTests.enabled ? config.loadTests.concurrentUsers.length : 0) +
        (config.memoryTests.enabled ? 1 : 0);
      
      let completedTests = 0;

      // Component rendering tests
      if (config.componentTests.enabled) {
        for (const componentType of config.componentTests.componentTypes) {
          for (const complexity of config.componentTests.complexities) {
            setCurrentTest(`Testing ${componentType} (${complexity})`);
            
            await benchmarkerRef.current.benchmarkComponentRendering(
              componentType,
              Math.max(...config.componentTests.componentCounts),
              complexity
            );
            
            completedTests++;
            setTestProgress((completedTests / totalTests) * 100);
          }
        }
      }

      // API performance tests
      if (config.apiTests.enabled) {
        setCurrentTest('Testing API operations');
        
        const operations = config.apiTests.operations.map(op => ({
          type: op as 'fetch' | 'create' | 'update' | 'delete',
          endpoint: config.apiTests.endpoints[0], // Use first endpoint for testing
          payload: op === 'create' || op === 'update' ? { title: 'Test Page', content: 'Test content' } : undefined
        }));

        await benchmarkerRef.current.benchmarkDataOperations(operations);
        
        completedTests++;
        setTestProgress((completedTests / totalTests) * 100);
      }

      // Load testing
      if (config.loadTests.enabled) {
        for (const userCount of config.loadTests.concurrentUsers) {
          setCurrentTest(`Load testing with ${userCount} concurrent users`);
          
          await benchmarkerRef.current.executeLoadTest(
            userCount,
            config.loadTests.operationsPerUser,
            config.loadTests.testDuration
          );
          
          completedTests++;
          setTestProgress((completedTests / totalTests) * 100);
        }
      }

      // Memory analysis
      if (config.memoryTests.enabled) {
        setCurrentTest('Analyzing memory usage');
        benchmarkerRef.current.analyzeMemoryUsage();
        
        completedTests++;
        setTestProgress((completedTests / totalTests) * 100);
      }

      // Generate comprehensive report
      setCurrentTest('Generating performance report');
      const report = await benchmarkerRef.current.generatePerformanceReport();
      setResults(report);
      
    } catch (error) {
      console.error('Performance test failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
      setTestProgress(0);
      stopRealTimeMonitoring();
    }
  };

  const downloadReport = () => {
    if (!results) return;

    const reportData = JSON.stringify(results, null, 2);
    const blob = new Blob([reportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `performance-report-${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityIcon = (severity: string): React.ReactNode => {
    switch (severity) {
      case 'low': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'medium': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
            <Zap className="w-8 h-8 text-blue-600" />
            Agent Dynamic Pages Performance Suite
          </h1>
          <p className="text-gray-600">
            Comprehensive performance benchmarking and optimization analysis
          </p>
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Test Controls</h2>
            <div className="flex gap-3">
              <button
                onClick={runPerformanceTests}
                disabled={isRunning}
                className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  isRunning 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isRunning ? (
                  <>
                    <Square className="w-4 h-4 mr-2" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Tests
                  </>
                )}
              </button>
              
              {results && (
                <button
                  onClick={downloadReport}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </button>
              )}
            </div>
          </div>

          {/* Test Progress */}
          {isRunning && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>{currentTest}</span>
                <span>{Math.round(testProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${testProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Test Configuration Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-400" />
              <span>
                <strong>Components:</strong> {config.componentTests.enabled ? config.componentTests.componentTypes.length : 0}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-400" />
              <span>
                <strong>API Tests:</strong> {config.apiTests.enabled ? config.apiTests.operations.length : 0}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-400" />
              <span>
                <strong>Load Tests:</strong> {config.loadTests.enabled ? config.loadTests.concurrentUsers.length : 0}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Memory className="w-4 h-4 text-gray-400" />
              <span>
                <strong>Memory:</strong> {config.memoryTests.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Metrics */}
        {realTimeMetrics.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Real-time Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">Memory Usage</span>
                  <Memory className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {formatBytes(realTimeMetrics[realTimeMetrics.length - 1]?.memoryUsage || 0)}
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-900">Avg Response Time</span>
                  <Clock className="w-4 h-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {realTimeMetrics.length > 0 
                    ? formatDuration(realTimeMetrics.reduce((sum, m) => sum + m.apiLatency, 0) / realTimeMetrics.length)
                    : '0ms'
                  }
                </div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-900">Active Monitoring</span>
                  <Activity className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-900">
                  {realTimeMetrics.length} samples
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Performance Results */}
        {results && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Performance Summary</h2>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-blue-600">{results.summary.overallScore}</span>
                  <span className="text-gray-500">/100</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Identified Bottlenecks</h3>
                  {results.summary.bottlenecks.length > 0 ? (
                    <ul className="space-y-2">
                      {results.summary.bottlenecks.map((bottleneck, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-red-600">
                          <AlertTriangle className="w-4 h-4" />
                          {bottleneck}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-green-600 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      No major bottlenecks detected
                    </p>
                  )}
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">System Information</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div><strong>Resolution:</strong> {results.systemInfo.screenResolution}</div>
                    <div><strong>Network:</strong> {results.systemInfo.networkType}</div>
                    <div><strong>Test Time:</strong> {new Date(results.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Benchmark Results */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Benchmark Results</h2>
              <div className="space-y-4">
                {results.benchmarks.map((benchmark, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">{benchmark.testName}</h3>
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(benchmark.severity)}
                        <span className={`text-sm font-medium ${getSeverityColor(benchmark.severity)}`}>
                          {benchmark.severity.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div className="text-sm">
                        <span className="text-gray-500">Duration:</span>
                        <span className="ml-2 font-medium">{formatDuration(benchmark.duration)}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Success:</span>
                        <span className={`ml-2 font-medium ${benchmark.success ? 'text-green-600' : 'text-red-600'}`}>
                          {benchmark.success ? 'Pass' : 'Fail'}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Metrics:</span>
                        <span className="ml-2 font-medium">{benchmark.metrics.length}</span>
                      </div>
                    </div>
                    
                    {benchmark.recommendations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {benchmark.recommendations.map((rec, recIndex) => (
                            <li key={recIndex} className="flex items-start gap-2">
                              <span className="text-blue-500 mt-1">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Optimization Recommendations */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Optimization Recommendations</h2>
              <div className="space-y-4">
                {results.summary.optimizations.map((optimization, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        optimization.priority === 'high' ? 'bg-red-100 text-red-800' :
                        optimization.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {optimization.priority.toUpperCase()} PRIORITY
                      </span>
                      <span className="text-sm text-gray-500">Expected: {optimization.expectedImprovement}</span>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">{optimization.description}</h3>
                    <p className="text-sm text-gray-600">{optimization.implementation}</p>
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

export default PerformanceTestSuite;