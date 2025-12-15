/**
 * Performance Monitoring Hook for Agent Dynamic Pages
 * Real-time performance tracking and optimization recommendations
 */

import { useEffect, useRef, useCallback, useState } from 'react';

export interface PerformanceThresholds {
  renderTime: { warning: number; critical: number };
  apiLatency: { warning: number; critical: number };
  memoryUsage: { warning: number; critical: number };
  componentCount: { warning: number; critical: number };
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: number;
  resolved: boolean;
}

export interface RealTimeMetrics {
  componentRenderTime: number;
  apiLatency: number;
  memoryUsage: number;
  componentCount: number;
  pageLoadTime: number;
  interactionDelay: number;
  timestamp: number;
}

export interface PerformanceInsight {
  category: 'rendering' | 'api' | 'memory' | 'interaction';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  impact: 'low' | 'medium' | 'high';
}

const defaultThresholds: PerformanceThresholds = {
  renderTime: { warning: 100, critical: 500 },
  apiLatency: { warning: 200, critical: 1000 },
  memoryUsage: { warning: 50 * 1024 * 1024, critical: 100 * 1024 * 1024 }, // 50MB / 100MB
  componentCount: { warning: 50, critical: 100 }
};

export const usePerformanceMonitor = (
  enabled: boolean = true,
  thresholds: PerformanceThresholds = defaultThresholds
) => {
  const [metrics, setMetrics] = useState<RealTimeMetrics[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [insights, setInsights] = useState<PerformanceInsight[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  const observersRef = useRef<PerformanceObserver[]>([]);
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const renderTimesRef = useRef<number[]>([]);
  const apiTimesRef = useRef<number[]>([]);
  const componentCountRef = useRef<number>(0);
  
  // Track component renders
  const trackRender = useCallback((componentName: string, renderTime: number) => {
    if (!enabled) return;
    
    renderTimesRef.current.push(renderTime);
    
    // Keep only last 10 render times
    if (renderTimesRef.current.length > 10) {
      renderTimesRef.current = renderTimesRef.current.slice(-10);
    }
    
    // Check render time thresholds
    if (renderTime > thresholds.renderTime.critical) {
      addAlert('critical', 'renderTime', renderTime, thresholds.renderTime.critical, 
        `Critical render time for ${componentName}: ${renderTime.toFixed(2)}ms`);
    } else if (renderTime > thresholds.renderTime.warning) {
      addAlert('warning', 'renderTime', renderTime, thresholds.renderTime.warning,
        `Slow render time for ${componentName}: ${renderTime.toFixed(2)}ms`);
    }
  }, [enabled, thresholds]);

  // Track API calls
  const trackApiCall = useCallback((endpoint: string, duration: number, success: boolean) => {
    if (!enabled) return;
    
    if (success) {
      apiTimesRef.current.push(duration);
      
      // Keep only last 20 API times
      if (apiTimesRef.current.length > 20) {
        apiTimesRef.current = apiTimesRef.current.slice(-20);
      }
    }
    
    // Check API latency thresholds
    if (duration > thresholds.apiLatency.critical) {
      addAlert('critical', 'apiLatency', duration, thresholds.apiLatency.critical,
        `Critical API latency for ${endpoint}: ${duration.toFixed(2)}ms`);
    } else if (duration > thresholds.apiLatency.warning) {
      addAlert('warning', 'apiLatency', duration, thresholds.apiLatency.warning,
        `High API latency for ${endpoint}: ${duration.toFixed(2)}ms`);
    }
  }, [enabled, thresholds]);

  // Add performance alert
  const addAlert = useCallback((
    type: 'warning' | 'critical',
    metric: string,
    value: number,
    threshold: number,
    message: string
  ) => {
    const alert: PerformanceAlert = {
      id: `${metric}-${Date.now()}-${Math.random()}`,
      type,
      metric,
      value,
      threshold,
      message,
      timestamp: Date.now(),
      resolved: false
    };
    
    setAlerts(prev => {
      // Remove duplicates for the same metric within 5 seconds
      const filtered = prev.filter(a => 
        !(a.metric === metric && Date.now() - a.timestamp < 5000)
      );
      return [alert, ...filtered].slice(0, 50); // Keep max 50 alerts
    });
  }, []);

  // Resolve alert
  const resolveAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
  }, []);

  // Clear old alerts
  const clearOldAlerts = useCallback(() => {
    setAlerts(prev => prev.filter(alert => 
      Date.now() - alert.timestamp < 300000 // Keep alerts for 5 minutes
    ));
  }, []);

  // Generate performance insights
  const generateInsights = useCallback(() => {
    if (!enabled || metrics.length < 5) return;
    
    const newInsights: PerformanceInsight[] = [];
    const recentMetrics = metrics.slice(-10);
    
    // Analyze render performance
    const avgRenderTime = recentMetrics.reduce((sum, m) => sum + m.componentRenderTime, 0) / recentMetrics.length;
    if (avgRenderTime > thresholds.renderTime.warning) {
      newInsights.push({
        category: 'rendering',
        severity: avgRenderTime > thresholds.renderTime.critical ? 'critical' : 'warning',
        title: 'Slow Component Rendering',
        description: `Average render time is ${avgRenderTime.toFixed(2)}ms, which exceeds optimal performance.`,
        recommendation: 'Consider implementing React.memo(), useMemo(), or component virtualization for large lists.',
        impact: avgRenderTime > thresholds.renderTime.critical ? 'high' : 'medium'
      });
    }

    // Analyze API performance
    const avgApiLatency = recentMetrics.reduce((sum, m) => sum + m.apiLatency, 0) / recentMetrics.length;
    if (avgApiLatency > thresholds.apiLatency.warning) {
      newInsights.push({
        category: 'api',
        severity: avgApiLatency > thresholds.apiLatency.critical ? 'critical' : 'warning',
        title: 'High API Latency',
        description: `Average API response time is ${avgApiLatency.toFixed(2)}ms.`,
        recommendation: 'Implement request caching, optimize database queries, or use a CDN.',
        impact: avgApiLatency > thresholds.apiLatency.critical ? 'high' : 'medium'
      });
    }

    // Analyze memory usage
    const currentMemory = recentMetrics[recentMetrics.length - 1]?.memoryUsage || 0;
    if (currentMemory > thresholds.memoryUsage.warning) {
      newInsights.push({
        category: 'memory',
        severity: currentMemory > thresholds.memoryUsage.critical ? 'critical' : 'warning',
        title: 'High Memory Usage',
        description: `Current memory usage is ${(currentMemory / 1024 / 1024).toFixed(2)}MB.`,
        recommendation: 'Check for memory leaks, implement proper component cleanup, and optimize data structures.',
        impact: currentMemory > thresholds.memoryUsage.critical ? 'high' : 'medium'
      });
    }

    // Analyze component count
    const currentComponentCount = recentMetrics[recentMetrics.length - 1]?.componentCount || 0;
    if (currentComponentCount > thresholds.componentCount.warning) {
      newInsights.push({
        category: 'rendering',
        severity: currentComponentCount > thresholds.componentCount.critical ? 'critical' : 'warning',
        title: 'High Component Count',
        description: `${currentComponentCount} components are currently mounted.`,
        recommendation: 'Implement lazy loading, component cleanup, or virtual scrolling.',
        impact: currentComponentCount > thresholds.componentCount.critical ? 'high' : 'medium'
      });
    }

    setInsights(newInsights);
  }, [enabled, metrics, thresholds]);

  // Initialize performance observers
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    setIsMonitoring(true);
    
    try {
      // Long task observer
      const longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          addAlert('warning', 'longTask', entry.duration, 50,
            `Long task detected: ${entry.duration.toFixed(2)}ms`);
        });
      });
      
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      observersRef.current.push(longTaskObserver);

      // Layout shift observer
      const layoutObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if ('value' in entry && (entry as any).value > 0.1) {
            addAlert('warning', 'layoutShift', (entry as any).value, 0.1,
              `Layout shift detected: ${((entry as any).value).toFixed(3)}`);
          }
        });
      });
      
      layoutObserver.observe({ entryTypes: ['layout-shift'] });
      observersRef.current.push(layoutObserver);

    } catch (error) {
      console.warn('Some performance observers are not supported:', error);
    }

    return () => {
      observersRef.current.forEach(observer => observer.disconnect());
      observersRef.current = [];
      setIsMonitoring(false);
    };
  }, [enabled, addAlert]);

  // Start metrics collection
  useEffect(() => {
    if (!enabled || !isMonitoring) return;

    metricsIntervalRef.current = setInterval(() => {
      // Calculate current metrics
      const avgRenderTime = renderTimesRef.current.length > 0 ?
        renderTimesRef.current.reduce((sum, time) => sum + time, 0) / renderTimesRef.current.length : 0;
      
      const avgApiLatency = apiTimesRef.current.length > 0 ?
        apiTimesRef.current.reduce((sum, time) => sum + time, 0) / apiTimesRef.current.length : 0;

      const memoryUsage = typeof window !== 'undefined' && (window as any).performance?.memory ?
        (window as any).performance.memory.usedJSHeapSize : 0;

      const componentCount = document.querySelectorAll('[class*="component"], [class*="card"], [data-testid]').length;
      componentCountRef.current = componentCount;

      const pageLoadTime = performance.now();
      const interactionDelay = 0; // Would be measured during actual interactions

      const newMetrics: RealTimeMetrics = {
        componentRenderTime: avgRenderTime,
        apiLatency: avgApiLatency,
        memoryUsage,
        componentCount,
        pageLoadTime,
        interactionDelay,
        timestamp: Date.now()
      };

      setMetrics(prev => {
        const updated = [...prev, newMetrics];
        return updated.slice(-100); // Keep last 100 metrics
      });

      // Clean up old alerts periodically
      clearOldAlerts();

    }, 1000); // Collect metrics every second

    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
    };
  }, [enabled, isMonitoring, clearOldAlerts]);

  // Generate insights when metrics change
  useEffect(() => {
    generateInsights();
  }, [metrics, generateInsights]);

  // Get current performance summary
  const getPerformanceSummary = useCallback(() => {
    if (metrics.length === 0) {
      return {
        score: 100,
        status: 'good' as 'good' | 'warning' | 'critical',
        issues: 0
      };
    }

    const recentMetrics = metrics.slice(-10);
    let score = 100;
    let issues = 0;

    // Evaluate render performance
    const avgRenderTime = recentMetrics.reduce((sum, m) => sum + m.componentRenderTime, 0) / recentMetrics.length;
    if (avgRenderTime > thresholds.renderTime.critical) {
      score -= 30;
      issues++;
    } else if (avgRenderTime > thresholds.renderTime.warning) {
      score -= 15;
      issues++;
    }

    // Evaluate API performance
    const avgApiLatency = recentMetrics.reduce((sum, m) => sum + m.apiLatency, 0) / recentMetrics.length;
    if (avgApiLatency > thresholds.apiLatency.critical) {
      score -= 25;
      issues++;
    } else if (avgApiLatency > thresholds.apiLatency.warning) {
      score -= 10;
      issues++;
    }

    // Evaluate memory usage
    const currentMemory = recentMetrics[recentMetrics.length - 1]?.memoryUsage || 0;
    if (currentMemory > thresholds.memoryUsage.critical) {
      score -= 20;
      issues++;
    } else if (currentMemory > thresholds.memoryUsage.warning) {
      score -= 10;
      issues++;
    }

    const status = score < 50 ? 'critical' : score < 75 ? 'warning' : 'good';

    return { score: Math.max(0, score), status, issues };
  }, [metrics, thresholds]);

  return {
    // State
    metrics,
    alerts: alerts.filter(alert => !alert.resolved),
    insights,
    isMonitoring,
    
    // Actions
    trackRender,
    trackApiCall,
    resolveAlert,
    clearOldAlerts,
    
    // Computed
    performanceSummary: getPerformanceSummary(),
    
    // Utilities
    formatBytes: (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    formatDuration: (ms: number) => {
      if (ms < 1000) return `${ms.toFixed(0)}ms`;
      return `${(ms / 1000).toFixed(2)}s`;
    }
  };
};