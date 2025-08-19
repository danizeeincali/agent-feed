import React, { memo, useEffect, useState, useRef } from 'react';
import { Monitor, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  componentMounts: number;
}

const PerformanceMonitor: React.FC = memo(() => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memoryUsage: 0,
    renderTime: 0,
    componentMounts: 0
  });
  
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
  
  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3 text-xs font-mono z-50">
      <div className="flex items-center space-x-2 mb-2">
        <Monitor className="w-4 h-4 text-gray-600" />
        <span className="font-semibold text-gray-800">Performance</span>
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
        <div className="px-2 py-1 rounded bg-gray-50">
          <span>Render: {metrics.renderTime}ms</span>
        </div>
        <div className="px-2 py-1 rounded bg-gray-50">
          <span>Mounts: {metrics.componentMounts}</span>
        </div>
      </div>
    </div>
  );
});

PerformanceMonitor.displayName = 'PerformanceMonitor';

export default PerformanceMonitor;