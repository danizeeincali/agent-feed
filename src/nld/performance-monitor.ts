/**
 * NLD Performance Monitor
 * Tracks and analyzes performance metrics for connection learning system
 */

import { EventEmitter } from 'events';

export interface PerformanceMetric {
  id: string;
  timestamp: number;
  type: 'connection' | 'learning' | 'neural' | 'system';
  category: string;
  value: number;
  metadata: any;
  tags: string[];
}

export interface PerformanceThreshold {
  metric: string;
  warning: number;
  critical: number;
  direction: 'above' | 'below'; // Trigger when value is above/below threshold
}

export interface PerformanceAlert {
  id: string;
  timestamp: number;
  severity: 'warning' | 'critical';
  metric: string;
  current_value: number;
  threshold: number;
  message: string;
  recommendations: string[];
}

export interface PerformanceTrend {
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  rate: number; // Change rate per time unit
  confidence: number; // Statistical confidence in trend
  prediction: number; // Predicted value for next time period
}

export interface PerformanceReport {
  timestamp: number;
  duration: number; // Report period in milliseconds
  summary: {
    total_metrics: number;
    alerts_generated: number;
    trends_identified: number;
    overall_health: number; // 0-1 scale
  };
  key_metrics: { [key: string]: number };
  trends: PerformanceTrend[];
  alerts: PerformanceAlert[];
  recommendations: string[];
}

export class NLDPerformanceMonitor extends EventEmitter {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private thresholds: Map<string, PerformanceThreshold> = new Map();
  private alerts: PerformanceAlert[] = [];
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private reportingInterval: NodeJS.Timeout | null = null;

  constructor(private config: {
    metricsRetentionMs: number;
    monitoringIntervalMs: number;
    reportingIntervalMs: number;
    alertingEnabled: boolean;
  }) {
    super();
    this.setupDefaultThresholds();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    
    // Monitor metrics collection
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.analyzeThresholds();
      this.cleanupOldMetrics();
    }, this.config.monitoringIntervalMs);

    // Generate periodic reports
    this.reportingInterval = setInterval(() => {
      this.generatePerformanceReport();
    }, this.config.reportingIntervalMs);

    this.emit('monitoringStarted', { timestamp: Date.now() });
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = null;
    }

    this.emit('monitoringStopped', { timestamp: Date.now() });
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    type: 'connection' | 'learning' | 'neural' | 'system',
    category: string,
    value: number,
    metadata: any = {},
    tags: string[] = []
  ): void {
    const metric: PerformanceMetric = {
      id: this.generateMetricId(),
      timestamp: Date.now(),
      type,
      category,
      value,
      metadata,
      tags
    };

    const key = `${type}_${category}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    this.metrics.get(key)!.push(metric);
    this.emit('metricRecorded', metric);

    // Check thresholds immediately for critical metrics
    if (this.config.alertingEnabled) {
      this.checkThreshold(key, value);
    }
  }

  /**
   * Set performance threshold
   */
  setThreshold(metric: string, threshold: PerformanceThreshold): void {
    this.thresholds.set(metric, threshold);
    this.emit('thresholdSet', { metric, threshold });
  }

  /**
   * Get current metrics for a category
   */
  getMetrics(type?: string, category?: string, timeRange?: number): PerformanceMetric[] {
    const now = Date.now();
    const cutoff = timeRange ? now - timeRange : 0;
    
    let allMetrics: PerformanceMetric[] = [];
    
    for (const [key, metrics] of this.metrics) {
      const [metricType, metricCategory] = key.split('_');
      
      if (type && metricType !== type) continue;
      if (category && metricCategory !== category) continue;
      
      const filteredMetrics = metrics.filter(m => m.timestamp >= cutoff);
      allMetrics.push(...filteredMetrics);
    }
    
    return allMetrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get performance trends
   */
  getTrends(timeRange: number = 3600000): PerformanceTrend[] {
    const trends: PerformanceTrend[] = [];
    
    for (const [key, metrics] of this.metrics) {
      if (metrics.length < 3) continue; // Need at least 3 points for trend
      
      const recentMetrics = this.getRecentMetrics(metrics, timeRange);
      if (recentMetrics.length < 3) continue;
      
      const trend = this.calculateTrend(recentMetrics);
      if (trend) {
        trends.push({
          metric: key,
          ...trend
        });
      }
    }
    
    return trends;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    
    return this.alerts.filter(alert => now - alert.timestamp < maxAge);
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport(duration: number = 3600000): PerformanceReport {
    const now = Date.now();
    const metrics = this.getMetrics(undefined, undefined, duration);
    const trends = this.getTrends(duration);
    const activeAlerts = this.getActiveAlerts();
    
    const keyMetrics = this.calculateKeyMetrics(metrics);
    const overallHealth = this.calculateOverallHealth(keyMetrics, activeAlerts);
    const recommendations = this.generateRecommendations(keyMetrics, trends, activeAlerts);
    
    const report: PerformanceReport = {
      timestamp: now,
      duration,
      summary: {
        total_metrics: metrics.length,
        alerts_generated: activeAlerts.length,
        trends_identified: trends.length,
        overall_health: overallHealth
      },
      key_metrics: keyMetrics,
      trends,
      alerts: activeAlerts,
      recommendations
    };
    
    this.emit('reportGenerated', report);
    return report;
  }

  /**
   * Get real-time dashboard data
   */
  getDashboardData(): any {
    const now = Date.now();
    const last5Minutes = 5 * 60 * 1000;
    const last1Hour = 60 * 60 * 1000;
    
    const recentMetrics = this.getMetrics(undefined, undefined, last5Minutes);
    const hourlyMetrics = this.getMetrics(undefined, undefined, last1Hour);
    const trends = this.getTrends(last1Hour);
    const alerts = this.getActiveAlerts();
    
    return {
      timestamp: now,
      realtime: {
        connection_success_rate: this.calculateSuccessRate(recentMetrics, 'connection'),
        learning_efficiency: this.calculateLearningEfficiency(recentMetrics),
        neural_training_progress: this.getNeuralTrainingProgress(recentMetrics),
        system_health: this.calculateSystemHealth(recentMetrics)
      },
      hourly_summary: {
        total_connections: this.countMetricsByCategory(hourlyMetrics, 'connection'),
        patterns_learned: this.countMetricsByCategory(hourlyMetrics, 'pattern_learned'),
        neural_epochs: this.countMetricsByCategory(hourlyMetrics, 'neural_epoch'),
        alerts_triggered: alerts.length
      },
      trends: trends.slice(0, 5), // Top 5 trends
      critical_alerts: alerts.filter(a => a.severity === 'critical'),
      performance_score: this.calculateOverallHealth(
        this.calculateKeyMetrics(hourlyMetrics),
        alerts
      )
    };
  }

  private setupDefaultThresholds(): void {
    // Connection performance thresholds
    this.setThreshold('connection_success_rate', {
      metric: 'connection_success_rate',
      warning: 0.8,
      critical: 0.6,
      direction: 'below'
    });

    this.setThreshold('connection_response_time', {
      metric: 'connection_response_time',
      warning: 5000,
      critical: 10000,
      direction: 'above'
    });

    // Learning system thresholds
    this.setThreshold('learning_accuracy', {
      metric: 'learning_accuracy',
      warning: 0.7,
      critical: 0.5,
      direction: 'below'
    });

    // Neural training thresholds
    this.setThreshold('neural_training_loss', {
      metric: 'neural_training_loss',
      warning: 0.5,
      critical: 1.0,
      direction: 'above'
    });

    // System resource thresholds
    this.setThreshold('system_memory_usage', {
      metric: 'system_memory_usage',
      warning: 0.8,
      critical: 0.9,
      direction: 'above'
    });
  }

  private collectSystemMetrics(): void {
    // System performance metrics
    const memoryUsage = process.memoryUsage();
    this.recordMetric('system', 'memory_usage', memoryUsage.heapUsed / memoryUsage.heapTotal);
    this.recordMetric('system', 'memory_heap_used', memoryUsage.heapUsed);
    this.recordMetric('system', 'memory_heap_total', memoryUsage.heapTotal);

    // Event loop lag (simplified)
    const start = process.hrtime();
    setImmediate(() => {
      const delta = process.hrtime(start);
      const lag = delta[0] * 1000 + delta[1] * 1e-6;
      this.recordMetric('system', 'event_loop_lag', lag);
    });

    // Active connections and patterns
    this.recordMetric('system', 'active_metrics', this.metrics.size);
    this.recordMetric('system', 'active_alerts', this.alerts.length);
  }

  private analyzeThresholds(): void {
    if (!this.config.alertingEnabled) return;

    for (const [key, threshold] of this.thresholds) {
      const recentMetrics = this.getRecentMetrics(
        this.metrics.get(threshold.metric) || [],
        60000 // Last minute
      );
      
      if (recentMetrics.length === 0) continue;
      
      const latestValue = recentMetrics[recentMetrics.length - 1].value;
      this.checkThreshold(key, latestValue);
    }
  }

  private checkThreshold(metricKey: string, value: number): void {
    const threshold = this.thresholds.get(metricKey);
    if (!threshold) return;

    const isViolation = threshold.direction === 'above' 
      ? value > threshold.critical || value > threshold.warning
      : value < threshold.critical || value < threshold.warning;

    if (!isViolation) return;

    const severity = threshold.direction === 'above'
      ? value > threshold.critical ? 'critical' : 'warning'
      : value < threshold.critical ? 'critical' : 'warning';

    const thresholdValue = severity === 'critical' ? threshold.critical : threshold.warning;

    const alert: PerformanceAlert = {
      id: this.generateAlertId(),
      timestamp: Date.now(),
      severity,
      metric: metricKey,
      current_value: value,
      threshold: thresholdValue,
      message: `${metricKey} is ${threshold.direction} threshold (${value} vs ${thresholdValue})`,
      recommendations: this.getThresholdRecommendations(metricKey, severity)
    };

    this.alerts.push(alert);
    this.emit('alertGenerated', alert);
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.config.metricsRetentionMs;
    
    for (const [key, metrics] of this.metrics) {
      const filteredMetrics = metrics.filter(m => m.timestamp >= cutoff);
      this.metrics.set(key, filteredMetrics);
    }

    // Clean up old alerts
    this.alerts = this.alerts.filter(a => Date.now() - a.timestamp < this.config.metricsRetentionMs);
  }

  private getRecentMetrics(metrics: PerformanceMetric[], timeRange: number): PerformanceMetric[] {
    const cutoff = Date.now() - timeRange;
    return metrics.filter(m => m.timestamp >= cutoff);
  }

  private calculateTrend(metrics: PerformanceMetric[]): Omit<PerformanceTrend, 'metric'> | null {
    if (metrics.length < 3) return null;

    const values = metrics.map(m => m.value);
    const times = metrics.map(m => m.timestamp);
    
    // Simple linear regression
    const n = values.length;
    const sumX = times.reduce((sum, t) => sum + t, 0);
    const sumY = values.reduce((sum, v) => sum + v, 0);
    const sumXY = times.reduce((sum, t, i) => sum + t * values[i], 0);
    const sumX2 = times.reduce((sum, t) => sum + t * t, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared for confidence
    const meanY = sumY / n;
    const totalSumSquares = values.reduce((sum, v) => sum + Math.pow(v - meanY, 2), 0);
    const residualSumSquares = values.reduce((sum, v, i) => {
      const predicted = slope * times[i] + intercept;
      return sum + Math.pow(v - predicted, 2);
    }, 0);
    
    const rSquared = 1 - (residualSumSquares / totalSumSquares);
    
    // Predict next value
    const lastTime = times[times.length - 1];
    const nextTime = lastTime + (times[1] - times[0]); // Assume same interval
    const prediction = slope * nextTime + intercept;
    
    const direction = Math.abs(slope) < 0.001 ? 'stable' : 
                     slope > 0 ? 'increasing' : 'decreasing';
    
    return {
      direction,
      rate: slope,
      confidence: Math.max(0, Math.min(1, rSquared)),
      prediction
    };
  }

  private calculateKeyMetrics(metrics: PerformanceMetric[]): { [key: string]: number } {
    const keyMetrics: { [key: string]: number } = {};
    
    // Group metrics by category
    const grouped = new Map<string, PerformanceMetric[]>();
    for (const metric of metrics) {
      const key = `${metric.type}_${metric.category}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(metric);
    }
    
    // Calculate aggregated values
    for (const [key, metricList] of grouped) {
      if (metricList.length === 0) continue;
      
      const values = metricList.map(m => m.value);
      keyMetrics[`${key}_avg`] = values.reduce((sum, v) => sum + v, 0) / values.length;
      keyMetrics[`${key}_min`] = Math.min(...values);
      keyMetrics[`${key}_max`] = Math.max(...values);
      keyMetrics[`${key}_count`] = values.length;
    }
    
    return keyMetrics;
  }

  private calculateOverallHealth(keyMetrics: { [key: string]: number }, alerts: PerformanceAlert[]): number {
    let health = 1.0;
    
    // Deduct for alerts
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const warningAlerts = alerts.filter(a => a.severity === 'warning').length;
    
    health -= criticalAlerts * 0.2;
    health -= warningAlerts * 0.1;
    
    // Deduct for poor key metrics
    if (keyMetrics['connection_success_rate_avg'] && keyMetrics['connection_success_rate_avg'] < 0.8) {
      health -= 0.2;
    }
    
    if (keyMetrics['connection_response_time_avg'] && keyMetrics['connection_response_time_avg'] > 5000) {
      health -= 0.1;
    }
    
    return Math.max(0, Math.min(1, health));
  }

  private generateRecommendations(
    keyMetrics: { [key: string]: number },
    trends: PerformanceTrend[],
    alerts: PerformanceAlert[]
  ): string[] {
    const recommendations: string[] = [];
    
    // Alert-based recommendations
    for (const alert of alerts) {
      recommendations.push(...alert.recommendations);
    }
    
    // Trend-based recommendations
    for (const trend of trends) {
      if (trend.direction === 'increasing' && trend.metric.includes('error')) {
        recommendations.push(`${trend.metric} is increasing. Investigate root cause.`);
      }
      if (trend.direction === 'decreasing' && trend.metric.includes('success')) {
        recommendations.push(`${trend.metric} is decreasing. Check system health.`);
      }
    }
    
    // Metric-based recommendations
    if (keyMetrics['connection_response_time_avg'] > 3000) {
      recommendations.push('High response times detected. Consider connection optimization.');
    }
    
    if (keyMetrics['system_memory_usage_avg'] > 0.8) {
      recommendations.push('High memory usage. Consider cleanup or scaling.');
    }
    
    return [...new Set(recommendations)]; // Remove duplicates
  }

  private getThresholdRecommendations(metric: string, severity: string): string[] {
    const recommendations: string[] = [];
    
    switch (metric) {
      case 'connection_success_rate':
        recommendations.push('Check network connectivity');
        recommendations.push('Review connection strategies');
        if (severity === 'critical') {
          recommendations.push('Enable fallback mechanisms');
        }
        break;
      case 'connection_response_time':
        recommendations.push('Increase timeout values');
        recommendations.push('Optimize connection pooling');
        break;
      case 'learning_accuracy':
        recommendations.push('Review training data quality');
        recommendations.push('Adjust learning parameters');
        break;
      case 'neural_training_loss':
        recommendations.push('Reduce learning rate');
        recommendations.push('Increase training epochs');
        break;
      case 'system_memory_usage':
        recommendations.push('Clean up old metrics');
        recommendations.push('Implement memory optimization');
        break;
    }
    
    return recommendations;
  }

  private calculateSuccessRate(metrics: PerformanceMetric[], type: string): number {
    const connectionMetrics = metrics.filter(m => m.type === type);
    if (connectionMetrics.length === 0) return 0;
    
    const successCount = connectionMetrics.filter(m => 
      m.category === 'success' || m.value === 1
    ).length;
    
    return successCount / connectionMetrics.length;
  }

  private calculateLearningEfficiency(metrics: PerformanceMetric[]): number {
    const learningMetrics = metrics.filter(m => m.type === 'learning');
    if (learningMetrics.length === 0) return 0;
    
    return learningMetrics.reduce((sum, m) => sum + m.value, 0) / learningMetrics.length;
  }

  private getNeuralTrainingProgress(metrics: PerformanceMetric[]): number {
    const neuralMetrics = metrics.filter(m => m.type === 'neural');
    if (neuralMetrics.length === 0) return 0;
    
    const latestProgress = neuralMetrics
      .filter(m => m.category === 'training_progress')
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    
    return latestProgress ? latestProgress.value : 0;
  }

  private calculateSystemHealth(metrics: PerformanceMetric[]): number {
    const systemMetrics = metrics.filter(m => m.type === 'system');
    if (systemMetrics.length === 0) return 1;
    
    const memoryUsage = systemMetrics
      .filter(m => m.category === 'memory_usage')
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    
    const eventLoopLag = systemMetrics
      .filter(m => m.category === 'event_loop_lag')
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    
    let health = 1.0;
    if (memoryUsage && memoryUsage.value > 0.8) health -= 0.3;
    if (eventLoopLag && eventLoopLag.value > 100) health -= 0.2;
    
    return Math.max(0, health);
  }

  private countMetricsByCategory(metrics: PerformanceMetric[], category: string): number {
    return metrics.filter(m => m.category === category).length;
  }

  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}