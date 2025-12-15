/**
 * Performance Metrics Hooks - London School Implementation
 *
 * These hooks provide real-time performance monitoring capabilities
 * for React applications following the contract defined in tests.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Core performance metrics hook
 * Provides FPS, memory usage, render time, and component lifecycle tracking
 */
export const usePerformanceMetrics = () => {
  const [metrics, setMetrics] = useState({
    fps: 0,
    memoryUsage: { used: 0, total: 0, percentage: 0 },
    lastRenderTime: 0,
    averageRenderTime: 0,
    componentMounts: 0,
    componentUnmounts: 0
  });

  const frameCount = useRef(0);
  const lastTime = useRef(performance?.now() || Date.now());
  const renderTimes = useRef([]);
  const animationFrameId = useRef(null);

  // Render timing methods
  const startRenderMeasurement = useCallback(() => {
    if (typeof performance !== 'undefined') {
      performance.mark('render-start');
    }
  }, []);

  const endRenderMeasurement = useCallback(() => {
    if (typeof performance !== 'undefined') {
      performance.mark('render-end');
      try {
        performance.measure('render-duration', 'render-start', 'render-end');
        const measures = performance.getEntriesByName('render-duration');
        if (measures.length > 0) {
          const renderTime = measures[measures.length - 1].duration;

          // Update render time tracking
          renderTimes.current.push(renderTime);
          if (renderTimes.current.length > 10) {
            renderTimes.current.shift(); // Keep last 10 measurements
          }

          const averageRenderTime = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length;

          setMetrics(prev => ({
            ...prev,
            lastRenderTime: renderTime,
            averageRenderTime
          }));
        }
      } catch (error) {
        // Fallback if performance.measure fails
        const endTime = performance.now();
        const startEntries = performance.getEntriesByName('render-start');
        if (startEntries.length > 0) {
          const renderTime = endTime - startEntries[startEntries.length - 1].startTime;
          renderTimes.current.push(renderTime);
          if (renderTimes.current.length > 10) {
            renderTimes.current.shift();
          }
          const averageRenderTime = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length;

          setMetrics(prev => ({
            ...prev,
            lastRenderTime: renderTime,
            averageRenderTime
          }));
        }
      }

      // Clean up performance marks
      performance.clearMarks('render-start');
      performance.clearMarks('render-end');
      performance.clearMeasures('render-duration');
    }
  }, []);

  // Component lifecycle tracking
  const incrementComponentMounts = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      componentMounts: prev.componentMounts + 1
    }));
  }, []);

  const incrementComponentUnmounts = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      componentUnmounts: prev.componentUnmounts + 1
    }));
  }, []);

  // FPS and memory monitoring
  useEffect(() => {
    if (typeof performance === 'undefined' || typeof requestAnimationFrame === 'undefined') {
      // Fallback for environments without performance API
      return;
    }

    const measurePerformance = () => {
      const now = performance.now();
      frameCount.current++;

      // Calculate FPS every second
      if (now - lastTime.current >= 1000) {
        const fps = Math.round((frameCount.current * 1000) / (now - lastTime.current));

        // Get memory usage (if available)
        let memoryUsage = { used: 0, total: 0, percentage: 0 };
        if (performance.memory) {
          const usedMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
          const totalMB = Math.round(performance.memory.totalJSHeapSize / 1048576);
          memoryUsage = {
            used: usedMB,
            total: totalMB,
            percentage: totalMB > 0 ? Math.round((usedMB / totalMB) * 100) : 0
          };
        }

        setMetrics(prev => ({
          ...prev,
          fps,
          memoryUsage
        }));

        frameCount.current = 0;
        lastTime.current = now;
      }

      animationFrameId.current = requestAnimationFrame(measurePerformance);
    };

    animationFrameId.current = requestAnimationFrame(measurePerformance);

    // Cleanup on unmount
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  return {
    ...metrics,
    startRenderMeasurement,
    endRenderMeasurement,
    incrementComponentMounts,
    incrementComponentUnmounts
  };
};

/**
 * Real-time metrics monitoring hook with configurable intervals and history
 */
export const useRealTimeMetrics = (options = {}) => {
  const {
    interval = 1000,
    autoStart = true,
    enableTrends = false,
    trendWindow = 10
  } = options;

  const [isMonitoring, setIsMonitoring] = useState(autoStart);
  const [metrics, setMetrics] = useState({
    fps: 0,
    memoryUsage: { used: 0, total: 0, percentage: 0 },
    renderTime: 0
  });
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [trends, setTrends] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const intervalRef = useRef(null);
  const baseMetrics = usePerformanceMetrics();

  // Calculate trends
  const calculateTrends = useCallback((history) => {
    if (!enableTrends || history.length < 2) return {};

    const recentData = history.slice(-trendWindow);
    if (recentData.length < 2) return {};

    const first = recentData[0];
    const last = recentData[recentData.length - 1];

    const calculateTrend = (startVal, endVal) => {
      const change = endVal - startVal;
      const magnitude = Math.abs(change / startVal) * 100;

      if (magnitude < 5) return { direction: 'stable', magnitude };
      return {
        direction: change > 0 ? 'up' : 'down',
        magnitude: Math.round(magnitude * 10) / 10
      };
    };

    return {
      fps: calculateTrend(first.fps, last.fps),
      memory: calculateTrend(first.memoryUsage.percentage, last.memoryUsage.percentage)
    };
  }, [enableTrends, trendWindow]);

  // Monitoring control functions
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    setIsLoading(true);

    // Small delay to simulate loading state
    setTimeout(() => setIsLoading(false), 100);
  }, []);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Monitoring effect
  useEffect(() => {
    if (!isMonitoring) return;

    const collectMetrics = () => {
      const currentMetrics = {
        timestamp: Date.now(),
        fps: baseMetrics.fps,
        memoryUsage: baseMetrics.memoryUsage,
        renderTime: baseMetrics.lastRenderTime
      };

      setMetrics(currentMetrics);

      setMetricsHistory(prev => {
        const updated = [...prev, currentMetrics];
        // Keep only recent history
        const maxHistory = Math.max(trendWindow * 2, 20);
        if (updated.length > maxHistory) {
          updated.shift();
        }

        // Calculate trends
        if (enableTrends) {
          const newTrends = calculateTrends(updated);
          setTrends(newTrends);
        }

        return updated;
      });
    };

    // Collect initial metrics immediately
    collectMetrics();

    intervalRef.current = setInterval(collectMetrics, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isMonitoring, interval, baseMetrics.fps, baseMetrics.memoryUsage, baseMetrics.lastRenderTime, enableTrends, calculateTrends, trendWindow]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isMonitoring,
    metrics,
    metricsHistory,
    trends: enableTrends ? trends : undefined,
    isLoading,
    startMonitoring,
    stopMonitoring
  };
};

/**
 * Performance alerts hook for monitoring thresholds and triggering notifications
 */
export const usePerformanceAlerts = (options = {}) => {
  const {
    fpsThreshold = 30,
    memoryThreshold = 80,
    renderTimeThreshold = 100,
    onAlert = () => {}
  } = options;

  const [activeAlerts, setActiveAlerts] = useState([]);
  const alertHistory = useRef(new Set());

  const updateMetrics = useCallback((metrics) => {
    const newAlerts = [];
    const alertsToRemove = [];

    // Check FPS threshold
    if (metrics.fps && metrics.fps < fpsThreshold) {
      const alertId = 'fps';
      if (!alertHistory.current.has(alertId)) {
        const alert = {
          id: alertId,
          type: 'fps',
          severity: metrics.fps < fpsThreshold * 0.5 ? 'critical' : 'warning',
          value: metrics.fps,
          threshold: fpsThreshold,
          message: `Frame rate below optimal threshold (${metrics.fps} FPS < ${fpsThreshold} FPS)`
        };
        newAlerts.push(alert);
        alertHistory.current.add(alertId);
        onAlert(alert);
      }
    } else if (metrics.fps && metrics.fps >= fpsThreshold) {
      // Clear FPS alert
      const alertId = 'fps';
      if (alertHistory.current.has(alertId)) {
        alertsToRemove.push(alertId);
        alertHistory.current.delete(alertId);
        onAlert({
          type: 'fps',
          severity: 'cleared',
          message: 'Frame rate performance restored'
        });
      }
    }

    // Check Memory threshold
    if (metrics.memoryUsage?.percentage && metrics.memoryUsage.percentage > memoryThreshold) {
      const alertId = 'memory';
      if (!alertHistory.current.has(alertId)) {
        const alert = {
          id: alertId,
          type: 'memory',
          severity: metrics.memoryUsage.percentage > memoryThreshold * 1.2 ? 'critical' : 'warning',
          value: metrics.memoryUsage.percentage,
          threshold: memoryThreshold,
          message: `Memory usage above threshold (${metrics.memoryUsage.percentage}% > ${memoryThreshold}%)`
        };
        newAlerts.push(alert);
        alertHistory.current.add(alertId);
        onAlert(alert);
      }
    } else if (metrics.memoryUsage?.percentage && metrics.memoryUsage.percentage <= memoryThreshold) {
      // Clear memory alert
      const alertId = 'memory';
      if (alertHistory.current.has(alertId)) {
        alertsToRemove.push(alertId);
        alertHistory.current.delete(alertId);
        onAlert({
          type: 'memory',
          severity: 'cleared',
          message: 'Memory usage returned to normal levels'
        });
      }
    }

    // Check Render time threshold
    if (metrics.renderTime && metrics.renderTime > renderTimeThreshold) {
      const alertId = 'renderTime';
      if (!alertHistory.current.has(alertId)) {
        const alert = {
          id: alertId,
          type: 'renderTime',
          severity: metrics.renderTime > renderTimeThreshold * 2 ? 'critical' : 'warning',
          value: metrics.renderTime,
          threshold: renderTimeThreshold,
          message: `Render time above threshold (${metrics.renderTime.toFixed(1)}ms > ${renderTimeThreshold}ms)`
        };
        newAlerts.push(alert);
        alertHistory.current.add(alertId);
        onAlert(alert);
      }
    } else if (metrics.renderTime && metrics.renderTime <= renderTimeThreshold) {
      // Clear render time alert
      const alertId = 'renderTime';
      if (alertHistory.current.has(alertId)) {
        alertsToRemove.push(alertId);
        alertHistory.current.delete(alertId);
        onAlert({
          type: 'renderTime',
          severity: 'cleared',
          message: 'Render time performance improved'
        });
      }
    }

    // Update active alerts
    setActiveAlerts(prev => {
      const filtered = prev.filter(alert => !alertsToRemove.includes(alert.id));
      return [...filtered, ...newAlerts];
    });
  }, [fpsThreshold, memoryThreshold, renderTimeThreshold, onAlert]);

  const dismissAlert = useCallback((alertId) => {
    setActiveAlerts(prev => prev.filter(alert => alert.id !== alertId));
    alertHistory.current.delete(alertId);
  }, []);

  return {
    activeAlerts,
    updateMetrics,
    dismissAlert
  };
};