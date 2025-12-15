/**
 * Enhanced Performance Tab Component - London School Implementation
 *
 * Provides comprehensive performance monitoring and analytics
 * integrated into the Analytics dashboard as a tab.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Monitor, Activity, AlertTriangle, CheckCircle, Play, Pause,
  Settings, TrendingUp, TrendingDown, Minus, Download,
  FileText, Zap, BarChart3, Cpu, Clock
} from 'lucide-react';

import {
  usePerformanceMetrics,
  useRealTimeMetrics,
  usePerformanceAlerts
} from '../hooks/usePerformanceMetrics';

const EnhancedPerformanceTab = () => {
  const [updateInterval, setUpdateInterval] = useState(1000);
  const [showHistory, setShowHistory] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Initialize performance hooks
  const baseMetrics = usePerformanceMetrics();

  const realTimeMetrics = useRealTimeMetrics({
    interval: updateInterval,
    autoStart: true,
    enableTrends: true,
    trendWindow: 10
  });

  const performanceAlerts = usePerformanceAlerts({
    fpsThreshold: 30,
    memoryThreshold: 80,
    renderTimeThreshold: 100,
    onAlert: (alert) => {
      console.log('Performance Alert:', alert);
    }
  });

  // Update alerts with current metrics
  useEffect(() => {
    performanceAlerts.updateMetrics(realTimeMetrics.metrics);
  }, [realTimeMetrics.metrics, performanceAlerts]);

  // Performance status calculation
  const performanceStatus = useMemo(() => {
    const { fps } = realTimeMetrics.metrics;
    if (fps >= 55) return { status: 'good', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800' };
    if (fps >= 30) return { status: 'warning', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800' };
    return { status: 'poor', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' };
  }, [realTimeMetrics.metrics.fps]);

  // Performance score calculation
  const performanceScore = useMemo(() => {
    const { fps, memoryUsage } = realTimeMetrics.metrics;
    let score = 0;

    // FPS scoring (40% weight)
    if (fps >= 55) score += 40;
    else if (fps >= 30) score += 30;
    else if (fps >= 20) score += 20;
    else score += 10;

    // Memory scoring (30% weight)
    const memoryPercent = memoryUsage.percentage;
    if (memoryPercent <= 50) score += 30;
    else if (memoryPercent <= 70) score += 25;
    else if (memoryPercent <= 85) score += 15;
    else score += 5;

    // Render time scoring (30% weight)
    const renderTime = baseMetrics.averageRenderTime;
    if (renderTime <= 16.67) score += 30; // 60 FPS equivalent
    else if (renderTime <= 33.33) score += 25; // 30 FPS equivalent
    else if (renderTime <= 50) score += 15;
    else score += 5;

    const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
    return { score, grade };
  }, [realTimeMetrics.metrics, baseMetrics.averageRenderTime]);

  // Performance recommendations
  const recommendations = useMemo(() => {
    const recs = [];
    const { fps, memoryUsage } = realTimeMetrics.metrics;

    if (fps < 30) {
      recs.push('Consider implementing React.memo for frequently re-rendering components');
      recs.push('Use useCallback and useMemo to prevent unnecessary re-renders');
    }

    if (memoryUsage.percentage > 80) {
      recs.push('Check for memory leaks in event listeners and subscriptions');
      recs.push('Consider lazy loading components to reduce initial memory usage');
    }

    if (baseMetrics.componentMounts > 20) {
      recs.push('High component mount count detected - consider component memoization');
    }

    if (recs.length === 0) {
      recs.push('Performance is optimal! Keep monitoring for any degradation.');
    }

    return recs;
  }, [realTimeMetrics.metrics, baseMetrics.componentMounts]);

  // Event handlers
  const handleMonitoringToggle = useCallback(() => {
    if (realTimeMetrics.isMonitoring) {
      realTimeMetrics.stopMonitoring();
    } else {
      realTimeMetrics.startMonitoring();
    }
  }, [realTimeMetrics]);

  const handleIntervalChange = useCallback((event) => {
    setUpdateInterval(parseInt(event.target.value, 10));
  }, []);

  const handleExportData = useCallback(() => {
    setIsExporting(true);

    const exportData = {
      timestamp: new Date().toISOString(),
      currentMetrics: realTimeMetrics.metrics,
      history: realTimeMetrics.metricsHistory,
      alerts: performanceAlerts.activeAlerts,
      score: performanceScore
    };

    // Simulate export delay
    setTimeout(() => {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-data-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsExporting(false);
    }, 1000);
  }, [realTimeMetrics, performanceAlerts.activeAlerts, performanceScore]);

  const handleGenerateReport = useCallback(() => {
    // This would trigger report generation
    alert('Report generation functionality would be implemented here');
  }, []);

  const getTrendIcon = (trend) => {
    if (!trend) return <Minus className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
    if (trend.direction === 'up') return <TrendingUp className="w-4 h-4 text-green-500 dark:text-green-400" />;
    if (trend.direction === 'down') return <TrendingDown className="w-4 h-4 text-red-500 dark:text-red-400" />;
    return <Minus className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
  };

  const getTrendText = (trend) => {
    if (!trend) return 'Stable';
    if (trend.direction === 'up') return 'Increasing';
    if (trend.direction === 'down') return 'Decreasing';
    return 'Stable';
  };

  if (realTimeMetrics.isLoading) {
    return (
      <div className="p-6 text-center" data-testid="loading-spinner">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading performance data...</p>
      </div>
    );
  }

  return (
    <div role="tabpanel" aria-label="Performance Metrics" className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Real-time Performance Metrics</h2>
          <p className="text-gray-600 dark:text-gray-400">Monitor application performance and system health</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Monitoring Status */}
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${realTimeMetrics.isMonitoring ? 'bg-green-500' : 'bg-gray-400'}`}
              data-testid="monitoring-status-dot"
            ></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {realTimeMetrics.isMonitoring ? 'Monitoring Active' : 'Monitoring Stopped'}
            </span>
          </div>

          {/* Update Interval Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="interval-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Update Interval:
            </label>
            <select
              id="interval-select"
              aria-label="Update Interval"
              value={updateInterval}
              onChange={handleIntervalChange}
              className="text-sm border border-gray-300 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            >
              <option value={500}>500ms</option>
              <option value={1000}>1s</option>
              <option value={2000}>2s</option>
              <option value={5000}>5s</option>
            </select>
          </div>

          {/* Monitor Control */}
          <button
            onClick={handleMonitoringToggle}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {realTimeMetrics.isMonitoring ? (
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
        </div>
      </div>

      {/* System Performance Overview */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">System Performance Overview</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* FPS Metric */}
          <div className={`p-4 rounded-lg border ${performanceStatus.bg} ${performanceStatus.border}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Frame Rate</span>
              </div>
              <div
                className={`w-3 h-3 rounded-full ${performanceStatus.status === 'good' ? 'bg-green-500' : performanceStatus.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`}
                data-testid="fps-status-indicator"
              ></div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100" aria-label="Current FPS value">
                {realTimeMetrics.metrics.fps}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">FPS</span>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Memory Usage</span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {realTimeMetrics.metrics.memoryUsage.used} MB / {realTimeMetrics.metrics.memoryUsage.total} MB
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2"
                data-testid="memory-usage-bar"
              >
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(realTimeMetrics.metrics.memoryUsage.percentage, 100)}%` }}
                  aria-label="Memory usage percentage"
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {realTimeMetrics.metrics.memoryUsage.percentage}%
              </span>
            </div>
          </div>

          {/* Render Time */}
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Average Render Time</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {baseMetrics.averageRenderTime.toFixed(1)}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">ms</span>
            </div>
          </div>

          {/* Component Lifecycle */}
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Components</span>
            </div>
            <div className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
              <div>Component Mounts: {baseMetrics.componentMounts}</div>
              <div>Component Unmounts: {baseMetrics.componentUnmounts}</div>
              <div>Active Components: {baseMetrics.componentMounts - baseMetrics.componentUnmounts}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Trends */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Performance Trends</h3>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            {showHistory ? 'Hide History' : 'Show History'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* FPS Trend */}
          <div className="space-y-3">
            <div
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
              data-testid="fps-trend-chart"
            >
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">FPS Trend</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {realTimeMetrics.trends?.fps ? getTrendText(realTimeMetrics.trends.fps) : 'Stable'}
                </div>
              </div>
              {getTrendIcon(realTimeMetrics.trends?.fps)}
            </div>
          </div>

          {/* Memory Trend */}
          <div className="space-y-3">
            <div
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
              data-testid="memory-trend-chart"
            >
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Memory Trend</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {realTimeMetrics.trends?.memory ? getTrendText(realTimeMetrics.trends.memory) : 'Stable'}
                </div>
              </div>
              {getTrendIcon(realTimeMetrics.trends?.memory)}
            </div>
          </div>
        </div>

        {/* Performance History Table */}
        {showHistory && (
          <div className="mt-6">
            <div className="overflow-x-auto" data-testid="performance-history-table">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Performance History</h4>
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">FPS</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Memory %</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Render Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {realTimeMetrics.metricsHistory.slice(-10).map((entry, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {entry.fps} FPS
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {entry.memoryUsage.percentage}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {entry.renderTime?.toFixed(1) || 'N/A'} ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Performance Alerts */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Performance Alerts</h3>

        {performanceAlerts.activeAlerts.length === 0 ? (
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" data-testid="no-alerts-checkmark" />
            <span className="text-green-800 dark:text-green-300 font-medium">No performance issues detected</span>
          </div>
        ) : (
          <div className="space-y-3">
            {performanceAlerts.activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-4 rounded-lg border ${
                  alert.severity === 'critical' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                }`}
              >
                <AlertTriangle
                  className={`w-5 h-5 mt-0.5 ${
                    alert.severity === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                  }`}
                  data-testid={`alert-${alert.severity}-icon`}
                />
                <div className="flex-1">
                  <p className={`font-medium ${
                    alert.severity === 'critical' ? 'text-red-800 dark:text-red-300' : 'text-yellow-800 dark:text-yellow-300'
                  }`}>
                    {alert.message}
                  </p>
                </div>
                <button
                  onClick={() => performanceAlerts.dismissAlert(alert.id)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  data-testid="dismiss-alert-button"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Performance Score and Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Score */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Performance Score</h3>
          <div className="text-center">
            <div
              className="text-6xl font-bold text-gray-900 dark:text-gray-100 mb-2"
              data-testid="performance-score"
            >
              {performanceScore.score}
            </div>
            <div className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-4">
              Grade: {performanceScore.grade}
            </div>
            <div className="space-y-2" data-testid="performance-radar-chart">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Performance Breakdown:</div>
              <div className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                <div>Frame Rate: {realTimeMetrics.metrics.fps >= 55 ? 'Excellent' : realTimeMetrics.metrics.fps >= 30 ? 'Good' : 'Poor'}</div>
                <div>Memory Usage: {realTimeMetrics.metrics.memoryUsage.percentage <= 50 ? 'Excellent' : realTimeMetrics.metrics.memoryUsage.percentage <= 70 ? 'Good' : 'Poor'}</div>
                <div>Render Performance: {baseMetrics.averageRenderTime <= 16.67 ? 'Excellent' : baseMetrics.averageRenderTime <= 33.33 ? 'Good' : 'Poor'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Performance Recommendations</h3>
          <div className="space-y-3" data-testid="recommendations-list">
            {recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                <p className="text-sm text-gray-700 dark:text-gray-300">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export and Actions */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Export and Reporting</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportData}
            disabled={isExporting}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export Data'}
          </button>

          <button
            onClick={handleGenerateReport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <FileText className="w-4 h-4 mr-2" />
            Generate Report
          </button>
        </div>

        {isExporting && (
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Generating Performance Report...
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedPerformanceTab;