import React, { memo, useEffect, useState, useRef } from 'react';
import { Monitor, Activity, AlertTriangle, CheckCircle, Zap, Settings, TrendingUp, Cpu, HardDrive, MemoryStick } from 'lucide-react';

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  componentMounts: number;
}

interface EnhancedPerformanceMetricsProps {
  showMiniIndicator?: boolean;
  className?: string;
}

const EnhancedPerformanceMetrics: React.FC<EnhancedPerformanceMetricsProps> = memo(({
  showMiniIndicator = true,
  className = ''
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memoryUsage: 0,
    renderTime: 0,
    componentMounts: 0
  });

  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const mountCount = useRef(0);
  const animationFrameId = useRef<number>();

  useEffect(() => {
    mountCount.current++;

    const measurePerformance = () => {
      const now = performance.now();
      frameCount.current++;

      // Calculate FPS every second
      if (now - lastTime.current >= 1000) {
        const fps = Math.round((frameCount.current * 1000) / (now - lastTime.current));

        // Get memory usage (if available)
        const memory = (performance as any).memory;
        const memoryUsage = memory ? Math.round(memory.usedJSHeapSize / 1048576) : 0;

        setMetrics({
          fps,
          memoryUsage,
          renderTime: Math.round(now - lastTime.current),
          componentMounts: mountCount.current
        });

        frameCount.current = 0;
        lastTime.current = now;
      }

      animationFrameId.current = requestAnimationFrame(measurePerformance);
    };

    animationFrameId.current = requestAnimationFrame(measurePerformance);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  const getPerformanceStatus = () => {
    if (metrics.fps >= 55) return { status: 'good', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
    if (metrics.fps >= 30) return { status: 'warning', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' };
    return { status: 'poor', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
  };

  const performance_status = getPerformanceStatus();

  const getMemoryStatusColor = () => {
    if (metrics.memoryUsage <= 50) return 'text-green-600';
    if (metrics.memoryUsage <= 100) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRenderTimeStatusColor = () => {
    if (metrics.renderTime <= 16) return 'text-green-600'; // 60fps = 16ms per frame
    if (metrics.renderTime <= 33) return 'text-yellow-600'; // 30fps = 33ms per frame
    return 'text-red-600';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* FPS Card */}
        <div className={`p-4 rounded-lg border ${performance_status.bg} ${performance_status.border}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Monitor className="w-5 h-5 text-gray-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">Frame Rate</span>
            </div>
            {performance_status.status === 'good' && <CheckCircle className="w-4 h-4 text-green-600" />}
            {performance_status.status === 'warning' && <Activity className="w-4 h-4 text-yellow-600" />}
            {performance_status.status === 'poor' && <AlertTriangle className="w-4 h-4 text-red-600" />}
          </div>
          <div className={`text-2xl font-bold ${performance_status.color}`}>{metrics.fps} FPS</div>
          <div className="text-xs text-gray-500 mt-1">
            Status: <span className="capitalize font-medium">{performance_status.status}</span>
          </div>
        </div>

        {/* Memory Usage Card */}
        <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
          <div className="flex items-center mb-2">
            <MemoryStick className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-gray-700">Memory Usage</span>
          </div>
          <div className={`text-2xl font-bold ${getMemoryStatusColor()}`}>{metrics.memoryUsage}MB</div>
          <div className="text-xs text-gray-500 mt-1">
            Heap Size: {metrics.memoryUsage > 0 ? 'Active' : 'Unknown'}
          </div>
        </div>

        {/* Render Time Card */}
        <div className="p-4 rounded-lg border bg-purple-50 border-purple-200">
          <div className="flex items-center mb-2">
            <Zap className="w-5 h-5 text-purple-600 mr-2" />
            <span className="text-sm font-medium text-gray-700">Render Time</span>
          </div>
          <div className={`text-2xl font-bold ${getRenderTimeStatusColor()}`}>{metrics.renderTime}ms</div>
          <div className="text-xs text-gray-500 mt-1">
            Target: &lt;16ms (60fps)
          </div>
        </div>

        {/* Component Mounts Card */}
        <div className="p-4 rounded-lg border bg-orange-50 border-orange-200">
          <div className="flex items-center mb-2">
            <TrendingUp className="w-5 h-5 text-orange-600 mr-2" />
            <span className="text-sm font-medium text-gray-700">Component Mounts</span>
          </div>
          <div className="text-2xl font-bold text-orange-600">{metrics.componentMounts}</div>
          <div className="text-xs text-gray-500 mt-1">
            Session Total
          </div>
        </div>
      </div>

      {/* Performance Insights Panel */}
      <div className={`p-4 rounded-lg border ${performance_status.bg} ${performance_status.border}`}>
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Real-time Performance Insights
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status Overview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Overall Status:</span>
              <span className={`text-sm font-medium capitalize ${performance_status.color}`}>
                {performance_status.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Memory Health:</span>
              <span className={`text-sm font-medium ${getMemoryStatusColor()}`}>
                {metrics.memoryUsage <= 50 ? 'Optimal' : metrics.memoryUsage <= 100 ? 'Moderate' : 'High'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Render Performance:</span>
              <span className={`text-sm font-medium ${getRenderTimeStatusColor()}`}>
                {metrics.renderTime <= 16 ? 'Excellent' : metrics.renderTime <= 33 ? 'Good' : 'Needs Attention'}
              </span>
            </div>
          </div>

          {/* Performance Recommendations */}
          <div className="space-y-2">
            {metrics.fps < 30 && (
              <div className="flex items-start space-x-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <span className="text-red-700">Low FPS detected. Consider component optimization.</span>
              </div>
            )}
            {metrics.memoryUsage > 100 && (
              <div className="flex items-start space-x-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <span className="text-yellow-700">High memory usage. Check for memory leaks.</span>
              </div>
            )}
            {metrics.componentMounts > 20 && (
              <div className="flex items-start space-x-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <span className="text-orange-700">Consider memoization to reduce re-mounts.</span>
              </div>
            )}
            {metrics.fps >= 55 && metrics.memoryUsage <= 50 && metrics.renderTime <= 16 && (
              <div className="flex items-start space-x-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-green-700">Performance is optimal!</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Metrics Table */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Monitor className="w-5 h-5 mr-2" />
          Detailed Performance Metrics
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Metric</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Current Value</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Target</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 font-medium">Frames Per Second</td>
                <td className={`py-3 px-4 font-bold ${performance_status.color}`}>{metrics.fps} FPS</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${performance_status.bg} ${performance_status.color} border ${performance_status.border}`}>
                    {performance_status.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-600">&ge; 30 FPS</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 font-medium">Memory Usage</td>
                <td className={`py-3 px-4 font-bold ${getMemoryStatusColor()}`}>{metrics.memoryUsage} MB</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    metrics.memoryUsage <= 50 ? 'bg-green-50 text-green-600 border border-green-200' :
                    metrics.memoryUsage <= 100 ? 'bg-yellow-50 text-yellow-600 border border-yellow-200' :
                    'bg-red-50 text-red-600 border border-red-200'
                  }`}>
                    {metrics.memoryUsage <= 50 ? 'optimal' : metrics.memoryUsage <= 100 ? 'moderate' : 'high'}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-600">&lt; 100 MB</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 font-medium">Render Time</td>
                <td className={`py-3 px-4 font-bold ${getRenderTimeStatusColor()}`}>{metrics.renderTime} ms</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    metrics.renderTime <= 16 ? 'bg-green-50 text-green-600 border border-green-200' :
                    metrics.renderTime <= 33 ? 'bg-yellow-50 text-yellow-600 border border-yellow-200' :
                    'bg-red-50 text-red-600 border border-red-200'
                  }`}>
                    {metrics.renderTime <= 16 ? 'excellent' : metrics.renderTime <= 33 ? 'good' : 'poor'}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-600">&lt; 16 ms</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Component Mounts</td>
                <td className="py-3 px-4 font-bold text-orange-600">{metrics.componentMounts}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    metrics.componentMounts <= 10 ? 'bg-green-50 text-green-600 border border-green-200' :
                    metrics.componentMounts <= 20 ? 'bg-yellow-50 text-yellow-600 border border-yellow-200' :
                    'bg-orange-50 text-orange-600 border border-orange-200'
                  }`}>
                    {metrics.componentMounts <= 10 ? 'low' : metrics.componentMounts <= 20 ? 'moderate' : 'high'}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-600">Minimize re-mounts</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Mini Performance Indicator - Only show if enabled */}
      {showMiniIndicator && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3 text-xs font-mono z-50">
          <div className="flex items-center space-x-2 mb-2">
            <Monitor className="w-4 h-4 text-gray-600" />
            <span className="font-semibold text-gray-800">Live Performance</span>
            {performance_status.status === 'good' && <CheckCircle className="w-3 h-3 text-green-600" />}
            {performance_status.status === 'warning' && <Activity className="w-3 h-3 text-yellow-600" />}
            {performance_status.status === 'poor' && <AlertTriangle className="w-3 h-3 text-red-600" />}
          </div>

          <div className="grid grid-cols-2 gap-2 text-gray-600">
            <div className={`px-2 py-1 rounded ${performance_status.bg}`}>
              <span className={performance_status.color}>FPS: {metrics.fps}</span>
            </div>
            <div className="px-2 py-1 rounded bg-gray-50">
              <span>Memory: {metrics.memoryUsage}MB</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

EnhancedPerformanceMetrics.displayName = 'EnhancedPerformanceMetrics';

export default EnhancedPerformanceMetrics;