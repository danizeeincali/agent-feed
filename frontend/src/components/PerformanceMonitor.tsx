import React, { memo, useEffect, useState, useRef } from 'react';
import { Monitor, Activity, AlertTriangle, CheckCircle, Wifi, Bug, Zap, Settings } from 'lucide-react';
import WebSocketDebugPanel from './WebSocketDebugPanel';
import ErrorTesting from './ErrorTesting';
import DualInstanceMonitor from './DualInstanceMonitor';

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  componentMounts: number;
}

type TabType = 'performance' | 'websocket' | 'error-testing' | 'dual-instances';

const PerformanceMonitor: React.FC = memo(() => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memoryUsage: 0,
    renderTime: 0,
    componentMounts: 0
  });
  
  const [activeTab, setActiveTab] = useState<TabType>('performance');
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const mountCount = useRef(0);
  
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
      
      requestAnimationFrame(measurePerformance);
    };
    
    const animationFrame = requestAnimationFrame(measurePerformance);
    
    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, []);
  
  const getPerformanceStatus = () => {
    if (metrics.fps >= 55) return { status: 'good', color: 'text-green-600', bg: 'bg-green-50' };
    if (metrics.fps >= 30) return { status: 'warning', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { status: 'poor', color: 'text-red-600', bg: 'bg-red-50' };
  };
  
  const performance_status = getPerformanceStatus();

  const tabs = [
    { id: 'performance' as TabType, label: 'Performance', icon: Monitor },
    { id: 'websocket' as TabType, label: 'WebSocket Debug', icon: Wifi },
    { id: 'error-testing' as TabType, label: 'Error Testing', icon: Bug },
    { id: 'dual-instances' as TabType, label: 'Dual Instances', icon: Settings },
  ];

  const renderPerformanceContent = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <Monitor className="w-5 h-5 text-gray-600" />
        <span className="font-semibold text-gray-800">Real-time Performance Metrics</span>
        {performance_status.status === 'good' && <CheckCircle className="w-4 h-4 text-green-600" />}
        {performance_status.status === 'warning' && <Activity className="w-4 h-4 text-yellow-600" />}
        {performance_status.status === 'poor' && <AlertTriangle className="w-4 h-4 text-red-600" />}
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className={`px-3 py-2 rounded-lg ${performance_status.bg}`}>
          <div className="font-medium text-gray-700">Frame Rate</div>
          <div className={`text-lg font-bold ${performance_status.color}`}>{metrics.fps} FPS</div>
        </div>
        <div className="px-3 py-2 rounded-lg bg-gray-50">
          <div className="font-medium text-gray-700">Memory Usage</div>
          <div className="text-lg font-bold text-gray-800">{metrics.memoryUsage}MB</div>
        </div>
        <div className="px-3 py-2 rounded-lg bg-gray-50">
          <div className="font-medium text-gray-700">Render Time</div>
          <div className="text-lg font-bold text-gray-800">{metrics.renderTime}ms</div>
        </div>
        <div className="px-3 py-2 rounded-lg bg-gray-50">
          <div className="font-medium text-gray-700">Component Mounts</div>
          <div className="text-lg font-bold text-gray-800">{metrics.componentMounts}</div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2 flex items-center">
          <Settings className="w-4 h-4 mr-2" />
          Performance Insights
        </h4>
        <div className="text-sm text-blue-800 space-y-1">
          <div>Status: <span className="font-medium capitalize">{performance_status.status}</span></div>
          {metrics.fps < 30 && (
            <div className="text-red-700">⚠️ Low frame rate detected. Consider optimizing components.</div>
          )}
          {metrics.memoryUsage > 100 && (
            <div className="text-yellow-700">⚠️ High memory usage. Check for memory leaks.</div>
          )}
          {metrics.componentMounts > 20 && (
            <div className="text-orange-700">ℹ️ High component mount count. Consider memoization.</div>
          )}
        </div>
      </div>
    </div>
  );

  const renderWebSocketContent = () => (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Wifi className="w-5 h-5 mr-2" />
        WebSocket Connection Debug Panel
      </h3>
      <WebSocketDebugPanel />
    </div>
  );

  const renderErrorTestingContent = () => (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Bug className="w-5 h-5 mr-2" />
        Error Testing Tools
      </h3>
      {process.env.NODE_ENV === 'development' ? (
        <ErrorTesting />
      ) : (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">Error testing is only available in development mode.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between p-6">
            <h2 className="text-2xl font-bold text-gray-900">Performance Dashboard</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex space-x-0 border-b border-gray-200" role="tablist">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`${tab.id}-panel`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors
                    ${isActive 
                      ? 'border-blue-500 text-blue-600 bg-blue-50' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <div
            id="performance-panel"
            role="tabpanel"
            aria-labelledby="performance-tab"
            className={activeTab === 'performance' ? 'block' : 'hidden'}
          >
            {renderPerformanceContent()}
          </div>
          
          <div
            id="websocket-panel"
            role="tabpanel"
            aria-labelledby="websocket-tab"
            className={activeTab === 'websocket' ? 'block' : 'hidden'}
          >
            {renderWebSocketContent()}
          </div>
          
          <div
            id="error-testing-panel"
            role="tabpanel"
            aria-labelledby="error-testing-tab"
            className={activeTab === 'error-testing' ? 'block' : 'hidden'}
          >
            {renderErrorTestingContent()}
          </div>
          
          <div
            id="dual-instances-panel"
            role="tabpanel"
            aria-labelledby="dual-instances-tab"
            className={activeTab === 'dual-instances' ? 'block' : 'hidden'}
          >
            <DualInstanceMonitor />
          </div>
        </div>
      </div>

      {/* Always show mini performance indicator */}
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3 text-xs font-mono z-50">
        <div className="flex items-center space-x-2 mb-2">
          <Monitor className="w-4 h-4 text-gray-600" />
          <span className="font-semibold text-gray-800">Live Metrics</span>
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
    </div>
  );
});

PerformanceMonitor.displayName = 'PerformanceMonitor';

export default PerformanceMonitor;