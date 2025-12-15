/**
 * Advanced Performance Analyzer with Real-time Optimization
 * Bottleneck detection, trend analysis, and performance optimization
 */

import { EventEmitter } from 'events';
import { SystemMetrics } from './metrics-collector';

export interface PerformanceBottleneck {
  id: string;
  type: 'cpu' | 'memory' | 'network' | 'disk' | 'application';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: number; // 0-100 scale
  recommendation: string;
  autoFixAvailable: boolean;
  detectedAt: number;
  persistentFor: number; // milliseconds
}

export interface PerformanceTrend {
  metric: string;
  direction: 'improving' | 'degrading' | 'stable';
  rate: number; // change per minute
  confidence: number; // 0-1 scale
  prediction: {
    nextHour: number;
    nextDay: number;
    trend: 'up' | 'down' | 'stable';
  };
}

export interface OptimizationRecommendation {
  id: string;
  type: 'scaling' | 'configuration' | 'resource' | 'application';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  expectedImpact: string;
  implementation: {
    automatic: boolean;
    steps: string[];
    estimatedTime: number; // minutes
    rollbackPlan: string[];
  };
  cost: {
    computational: number; // relative scale
    financial: number; // if applicable
    risk: number; // 0-10 scale
  };
}

export class PerformanceAnalyzer extends EventEmitter {
  private metricsHistory: SystemMetrics[] = [];
  private bottlenecks: Map<string, PerformanceBottleneck> = new Map();
  private trends: Map<string, PerformanceTrend> = new Map();
  private optimizations: Map<string, OptimizationRecommendation> = new Map();
  private analysisInterval: NodeJS.Timeout | null = null;
  private isAnalyzing = false;
  private readonly maxHistorySize = 1000; // Keep last 1000 measurements
  private readonly trendWindow = 300; // 5 minutes for trend analysis

  constructor() {
    super();
  }

  public startAnalysis(intervalMs: number = 30000): void {
    if (this.isAnalyzing) {
      console.log('Performance analysis already running');
      return;
    }

    this.isAnalyzing = true;
    console.log(`Starting performance analysis with ${intervalMs}ms interval`);

    this.analysisInterval = setInterval(() => {
      this.performAnalysis();
    }, intervalMs);
  }

  public stopAnalysis(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    this.isAnalyzing = false;
    console.log('Performance analysis stopped');
  }

  public addMetrics(metrics: SystemMetrics): void {
    this.metricsHistory.push(metrics);
    
    // Maintain history size
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }

    // Trigger immediate analysis if we have enough data
    if (this.metricsHistory.length >= 10) {
      this.performAnalysis();
    }
  }

  private performAnalysis(): void {
    if (this.metricsHistory.length < 10) {
      return; // Need at least 10 data points
    }

    try {
      this.detectBottlenecks();
      this.analyzeTrends();
      this.generateOptimizations();
      this.emit('analysis-complete', {
        bottlenecks: Array.from(this.bottlenecks.values()),
        trends: Array.from(this.trends.values()),
        optimizations: Array.from(this.optimizations.values())
      });
    } catch (error) {
      console.error('Error during performance analysis:', error);
      this.emit('analysis-error', error);
    }
  }

  private detectBottlenecks(): void {
    const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];
    const recentMetrics = this.metricsHistory.slice(-10); // Last 10 measurements
    
    // Clear old bottlenecks that are no longer persistent
    const currentTime = Date.now();
    for (const [id, bottleneck] of this.bottlenecks) {
      if (currentTime - bottleneck.detectedAt > 300000) { // 5 minutes
        this.bottlenecks.delete(id);
      }
    }

    // CPU bottleneck detection
    this.detectCPUBottleneck(latestMetrics, recentMetrics);
    
    // Memory bottleneck detection
    this.detectMemoryBottleneck(latestMetrics, recentMetrics);
    
    // Network bottleneck detection
    this.detectNetworkBottleneck(latestMetrics, recentMetrics);
    
    // Disk bottleneck detection
    this.detectDiskBottleneck(latestMetrics, recentMetrics);
    
    // Application bottleneck detection
    this.detectApplicationBottleneck(latestMetrics, recentMetrics);
  }

  private detectCPUBottleneck(latest: SystemMetrics, recent: SystemMetrics[]): void {
    const avgCPU = recent.reduce((sum, m) => sum + m.cpu.usage, 0) / recent.length;
    const cpuTrend = this.calculateTrend(recent.map(m => m.cpu.usage));

    if (avgCPU > 85) {
      const bottleneck: PerformanceBottleneck = {
        id: 'cpu-high-usage',
        type: 'cpu',
        severity: avgCPU > 95 ? 'critical' : 'high',
        description: `High CPU usage: ${avgCPU.toFixed(1)}% average over recent measurements`,
        impact: Math.min(100, (avgCPU - 50) * 2),
        recommendation: 'Consider horizontal scaling or CPU optimization',
        autoFixAvailable: true,
        detectedAt: latest.timestamp,
        persistentFor: this.calculatePersistence('cpu-high-usage', latest.timestamp)
      };

      this.bottlenecks.set(bottleneck.id, bottleneck);
    }

    // Load average bottleneck
    const loadAvg = latest.cpu.loadAverage[0]; // 1-minute load average
    if (loadAvg > latest.cpu.cores * 1.5) {
      const bottleneck: PerformanceBottleneck = {
        id: 'cpu-load-high',
        type: 'cpu',
        severity: loadAvg > latest.cpu.cores * 2 ? 'critical' : 'high',
        description: `High load average: ${loadAvg.toFixed(2)} (${latest.cpu.cores} cores)`,
        impact: Math.min(100, (loadAvg / latest.cpu.cores - 1) * 50),
        recommendation: 'Scale out application instances or optimize CPU-intensive processes',
        autoFixAvailable: true,
        detectedAt: latest.timestamp,
        persistentFor: this.calculatePersistence('cpu-load-high', latest.timestamp)
      };

      this.bottlenecks.set(bottleneck.id, bottleneck);
    }
  }

  private detectMemoryBottleneck(latest: SystemMetrics, recent: SystemMetrics[]): void {
    const memoryUsagePercent = (latest.memory.used / latest.memory.total) * 100;
    const avgMemory = recent.reduce((sum, m) => (m.memory.used / m.memory.total) * 100, 0) / recent.length;
    
    if (avgMemory > 80) {
      const bottleneck: PerformanceBottleneck = {
        id: 'memory-high-usage',
        type: 'memory',
        severity: avgMemory > 95 ? 'critical' : avgMemory > 90 ? 'high' : 'medium',
        description: `High memory usage: ${avgMemory.toFixed(1)}% average`,
        impact: Math.min(100, (avgMemory - 50) * 2),
        recommendation: 'Consider memory optimization or vertical scaling',
        autoFixAvailable: true,
        detectedAt: latest.timestamp,
        persistentFor: this.calculatePersistence('memory-high-usage', latest.timestamp)
      };

      this.bottlenecks.set(bottleneck.id, bottleneck);
    }

    // Memory leak detection
    const memoryGrowth = this.calculateMemoryGrowthRate(recent);
    if (memoryGrowth > 5) { // More than 5% growth per interval
      const bottleneck: PerformanceBottleneck = {
        id: 'memory-leak-suspected',
        type: 'memory',
        severity: 'high',
        description: `Suspected memory leak: ${memoryGrowth.toFixed(2)}% growth rate`,
        impact: 75,
        recommendation: 'Investigate memory leaks in application code',
        autoFixAvailable: false,
        detectedAt: latest.timestamp,
        persistentFor: this.calculatePersistence('memory-leak-suspected', latest.timestamp)
      };

      this.bottlenecks.set(bottleneck.id, bottleneck);
    }
  }

  private detectNetworkBottleneck(latest: SystemMetrics, recent: SystemMetrics[]): void {
    const avgNetworkIn = recent.reduce((sum, m) => sum + m.network.bytesIn, 0) / recent.length;
    const avgNetworkOut = recent.reduce((sum, m) => sum + m.network.bytesOut, 0) / recent.length;
    
    // High network I/O (assuming 100MB/s as threshold)
    const networkThreshold = 100 * 1024 * 1024; // 100 MB/s
    
    if (avgNetworkOut > networkThreshold) {
      const bottleneck: PerformanceBottleneck = {
        id: 'network-high-outbound',
        type: 'network',
        severity: 'medium',
        description: `High outbound network traffic: ${(avgNetworkOut / 1024 / 1024).toFixed(2)} MB/s`,
        impact: Math.min(100, (avgNetworkOut / networkThreshold - 1) * 100),
        recommendation: 'Optimize data transfer or consider CDN implementation',
        autoFixAvailable: false,
        detectedAt: latest.timestamp,
        persistentFor: this.calculatePersistence('network-high-outbound', latest.timestamp)
      };

      this.bottlenecks.set(bottleneck.id, bottleneck);
    }

    // High connection count
    if (latest.network.connections > 1000) {
      const bottleneck: PerformanceBottleneck = {
        id: 'network-high-connections',
        type: 'network',
        severity: latest.network.connections > 5000 ? 'high' : 'medium',
        description: `High connection count: ${latest.network.connections}`,
        impact: Math.min(100, (latest.network.connections / 1000 - 1) * 20),
        recommendation: 'Implement connection pooling or load balancing',
        autoFixAvailable: true,
        detectedAt: latest.timestamp,
        persistentFor: this.calculatePersistence('network-high-connections', latest.timestamp)
      };

      this.bottlenecks.set(bottleneck.id, bottleneck);
    }
  }

  private detectDiskBottleneck(latest: SystemMetrics, recent: SystemMetrics[]): void {
    const avgReadOps = recent.reduce((sum, m) => sum + m.disk.readOps, 0) / recent.length;
    const avgWriteOps = recent.reduce((sum, m) => sum + m.disk.writeOps, 0) / recent.length;
    
    // High disk I/O operations (assuming 1000 ops/s as threshold)
    const opsThreshold = 1000;
    
    if (avgReadOps + avgWriteOps > opsThreshold) {
      const bottleneck: PerformanceBottleneck = {
        id: 'disk-high-io',
        type: 'disk',
        severity: 'medium',
        description: `High disk I/O: ${(avgReadOps + avgWriteOps).toFixed(0)} ops/s`,
        impact: Math.min(100, ((avgReadOps + avgWriteOps) / opsThreshold - 1) * 50),
        recommendation: 'Consider SSD upgrade or I/O optimization',
        autoFixAvailable: false,
        detectedAt: latest.timestamp,
        persistentFor: this.calculatePersistence('disk-high-io', latest.timestamp)
      };

      this.bottlenecks.set(bottleneck.id, bottleneck);
    }

    // High disk usage
    if (latest.disk.usage > 85) {
      const bottleneck: PerformanceBottleneck = {
        id: 'disk-high-usage',
        type: 'disk',
        severity: latest.disk.usage > 95 ? 'critical' : 'high',
        description: `High disk usage: ${latest.disk.usage}%`,
        impact: Math.min(100, (latest.disk.usage - 50) * 2),
        recommendation: 'Clean up disk space or expand storage',
        autoFixAvailable: false,
        detectedAt: latest.timestamp,
        persistentFor: this.calculatePersistence('disk-high-usage', latest.timestamp)
      };

      this.bottlenecks.set(bottleneck.id, bottleneck);
    }
  }

  private detectApplicationBottleneck(latest: SystemMetrics, recent: SystemMetrics[]): void {
    const avgResponseTime = recent.reduce((sum, m) => sum + m.application.responseTime, 0) / recent.length;
    const avgErrorRate = recent.reduce((sum, m) => sum + m.application.errorRate, 0) / recent.length;
    
    // High response time
    if (avgResponseTime > 2000) { // 2 seconds
      const bottleneck: PerformanceBottleneck = {
        id: 'app-high-response-time',
        type: 'application',
        severity: avgResponseTime > 5000 ? 'high' : 'medium',
        description: `High response time: ${avgResponseTime.toFixed(0)}ms average`,
        impact: Math.min(100, (avgResponseTime / 1000 - 1) * 25),
        recommendation: 'Optimize application code, database queries, or caching',
        autoFixAvailable: false,
        detectedAt: latest.timestamp,
        persistentFor: this.calculatePersistence('app-high-response-time', latest.timestamp)
      };

      this.bottlenecks.set(bottleneck.id, bottleneck);
    }

    // High error rate
    if (avgErrorRate > 5) { // 5% error rate
      const bottleneck: PerformanceBottleneck = {
        id: 'app-high-error-rate',
        type: 'application',
        severity: avgErrorRate > 15 ? 'critical' : avgErrorRate > 10 ? 'high' : 'medium',
        description: `High error rate: ${avgErrorRate.toFixed(2)}%`,
        impact: Math.min(100, avgErrorRate * 5),
        recommendation: 'Investigate and fix application errors',
        autoFixAvailable: false,
        detectedAt: latest.timestamp,
        persistentFor: this.calculatePersistence('app-high-error-rate', latest.timestamp)
      };

      this.bottlenecks.set(bottleneck.id, bottleneck);
    }

    // High queue length
    if (latest.application.queueLength > 100) {
      const bottleneck: PerformanceBottleneck = {
        id: 'app-high-queue-length',
        type: 'application',
        severity: latest.application.queueLength > 500 ? 'high' : 'medium',
        description: `High queue length: ${latest.application.queueLength}`,
        impact: Math.min(100, (latest.application.queueLength / 100 - 1) * 25),
        recommendation: 'Increase worker processes or optimize queue processing',
        autoFixAvailable: true,
        detectedAt: latest.timestamp,
        persistentFor: this.calculatePersistence('app-high-queue-length', latest.timestamp)
      };

      this.bottlenecks.set(bottleneck.id, bottleneck);
    }
  }

  private analyzeTrends(): void {
    if (this.metricsHistory.length < this.trendWindow) {
      return; // Need more data for trend analysis
    }

    const recentMetrics = this.metricsHistory.slice(-this.trendWindow);
    
    // Analyze CPU trend
    this.analyzeCPUTrend(recentMetrics);
    
    // Analyze memory trend
    this.analyzeMemoryTrend(recentMetrics);
    
    // Analyze application performance trend
    this.analyzeApplicationTrend(recentMetrics);
  }

  private analyzeCPUTrend(metrics: SystemMetrics[]): void {
    const cpuValues = metrics.map(m => m.cpu.usage);
    const trend = this.calculateDetailedTrend(cpuValues);
    
    this.trends.set('cpu_usage', {
      metric: 'cpu_usage',
      direction: trend.direction,
      rate: trend.rate,
      confidence: trend.confidence,
      prediction: {
        nextHour: trend.prediction.nextHour,
        nextDay: trend.prediction.nextDay,
        trend: trend.prediction.trend
      }
    });
  }

  private analyzeMemoryTrend(metrics: SystemMetrics[]): void {
    const memoryValues = metrics.map(m => (m.memory.used / m.memory.total) * 100);
    const trend = this.calculateDetailedTrend(memoryValues);
    
    this.trends.set('memory_usage', {
      metric: 'memory_usage',
      direction: trend.direction,
      rate: trend.rate,
      confidence: trend.confidence,
      prediction: {
        nextHour: trend.prediction.nextHour,
        nextDay: trend.prediction.nextDay,
        trend: trend.prediction.trend
      }
    });
  }

  private analyzeApplicationTrend(metrics: SystemMetrics[]): void {
    const responseTimeValues = metrics.map(m => m.application.responseTime);
    const errorRateValues = metrics.map(m => m.application.errorRate);
    
    const responseTimeTrend = this.calculateDetailedTrend(responseTimeValues);
    const errorRateTrend = this.calculateDetailedTrend(errorRateValues);
    
    this.trends.set('response_time', {
      metric: 'response_time',
      direction: responseTimeTrend.direction,
      rate: responseTimeTrend.rate,
      confidence: responseTimeTrend.confidence,
      prediction: responseTimeTrend.prediction
    });
    
    this.trends.set('error_rate', {
      metric: 'error_rate',
      direction: errorRateTrend.direction,
      rate: errorRateTrend.rate,
      confidence: errorRateTrend.confidence,
      prediction: errorRateTrend.prediction
    });
  }

  private calculateDetailedTrend(values: number[]): {
    direction: 'improving' | 'degrading' | 'stable';
    rate: number;
    confidence: number;
    prediction: { nextHour: number; nextDay: number; trend: 'up' | 'down' | 'stable' };
  } {
    if (values.length < 10) {
      return {
        direction: 'stable',
        rate: 0,
        confidence: 0,
        prediction: { nextHour: values[values.length - 1] || 0, nextDay: values[values.length - 1] || 0, trend: 'stable' }
      };
    }

    // Linear regression for trend calculation
    const n = values.length;
    const xSum = (n * (n - 1)) / 2; // Sum of indices
    const ySum = values.reduce((sum, val) => sum + val, 0);
    const xySum = values.reduce((sum, val, idx) => sum + val * idx, 0);
    const xSquareSum = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squared indices

    const slope = (n * xySum - xSum * ySum) / (n * xSquareSum - xSum * xSum);
    const intercept = (ySum - slope * xSum) / n;

    // Calculate correlation coefficient for confidence
    const yMean = ySum / n;
    const numerator = values.reduce((sum, val, idx) => sum + (idx - (n - 1) / 2) * (val - yMean), 0);
    const denomX = Math.sqrt(values.reduce((sum, _, idx) => sum + Math.pow(idx - (n - 1) / 2, 2), 0));
    const denomY = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0));
    const correlation = Math.abs(numerator / (denomX * denomY));

    // Determine direction
    let direction: 'improving' | 'degrading' | 'stable';
    if (Math.abs(slope) < 0.01) {
      direction = 'stable';
    } else if (slope > 0) {
      // For metrics like CPU, memory, response time - increasing is degrading
      direction = 'degrading';
    } else {
      direction = 'improving';
    }

    // Predictions
    const nextHour = intercept + slope * (n + 60); // Assuming 1-minute intervals
    const nextDay = intercept + slope * (n + 1440); // 24 hours

    return {
      direction,
      rate: Math.abs(slope),
      confidence: correlation,
      prediction: {
        nextHour: Math.max(0, nextHour),
        nextDay: Math.max(0, nextDay),
        trend: slope > 0.01 ? 'up' : slope < -0.01 ? 'down' : 'stable'
      }
    };
  }

  private generateOptimizations(): void {
    // Clear old optimizations
    this.optimizations.clear();

    // Generate optimizations based on bottlenecks
    for (const bottleneck of this.bottlenecks.values()) {
      const optimization = this.createOptimizationForBottleneck(bottleneck);
      if (optimization) {
        this.optimizations.set(optimization.id, optimization);
      }
    }

    // Generate proactive optimizations based on trends
    for (const trend of this.trends.values()) {
      if (trend.direction === 'degrading' && trend.confidence > 0.7) {
        const optimization = this.createProactiveOptimization(trend);
        if (optimization) {
          this.optimizations.set(optimization.id, optimization);
        }
      }
    }
  }

  private createOptimizationForBottleneck(bottleneck: PerformanceBottleneck): OptimizationRecommendation | null {
    switch (bottleneck.type) {
      case 'cpu':
        return {
          id: `cpu-optimization-${Date.now()}`,
          type: 'scaling',
          priority: bottleneck.severity === 'critical' ? 'urgent' : 'high',
          description: 'Scale out application instances to reduce CPU load',
          expectedImpact: `Reduce CPU usage by 30-50%`,
          implementation: {
            automatic: true,
            steps: [
              'Analyze current instance capacity',
              'Calculate optimal instance count',
              'Trigger horizontal scaling',
              'Monitor performance improvement'
            ],
            estimatedTime: 10,
            rollbackPlan: ['Scale back to original instance count', 'Monitor stability']
          },
          cost: {
            computational: 2,
            financial: 15,
            risk: 3
          }
        };

      case 'memory':
        return {
          id: `memory-optimization-${Date.now()}`,
          type: 'resource',
          priority: bottleneck.severity === 'critical' ? 'urgent' : 'high',
          description: 'Optimize memory usage or scale vertically',
          expectedImpact: `Reduce memory pressure by 20-40%`,
          implementation: {
            automatic: false,
            steps: [
              'Analyze memory usage patterns',
              'Identify memory leaks or inefficiencies',
              'Implement memory optimization',
              'Consider vertical scaling if needed'
            ],
            estimatedTime: 30,
            rollbackPlan: ['Revert code changes', 'Scale back if vertically scaled']
          },
          cost: {
            computational: 1,
            financial: 10,
            risk: 4
          }
        };

      case 'application':
        return {
          id: `app-optimization-${Date.now()}`,
          type: 'application',
          priority: bottleneck.severity === 'critical' ? 'urgent' : 'medium',
          description: 'Optimize application performance and error handling',
          expectedImpact: `Improve response time by 20-50%, reduce error rate`,
          implementation: {
            automatic: false,
            steps: [
              'Profile application performance',
              'Optimize database queries',
              'Implement caching strategies',
              'Improve error handling'
            ],
            estimatedTime: 60,
            rollbackPlan: ['Revert performance optimizations', 'Restore previous configuration']
          },
          cost: {
            computational: 0,
            financial: 0,
            risk: 5
          }
        };

      default:
        return null;
    }
  }

  private createProactiveOptimization(trend: PerformanceTrend): OptimizationRecommendation | null {
    if (trend.metric === 'cpu_usage' && trend.prediction.nextHour > 80) {
      return {
        id: `proactive-cpu-${Date.now()}`,
        type: 'scaling',
        priority: 'medium',
        description: 'Proactive scaling based on CPU usage trend',
        expectedImpact: `Prevent CPU bottleneck predicted in next hour`,
        implementation: {
          automatic: true,
          steps: [
            'Schedule additional instances',
            'Gradually increase capacity',
            'Monitor trend changes'
          ],
          estimatedTime: 15,
          rollbackPlan: ['Cancel scheduled scaling', 'Return to current capacity']
        },
        cost: {
          computational: 1,
          financial: 8,
          risk: 2
        }
      };
    }

    return null;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const first = values[0];
    const last = values[values.length - 1];
    return ((last - first) / first) * 100;
  }

  private calculateMemoryGrowthRate(metrics: SystemMetrics[]): number {
    if (metrics.length < 2) return 0;
    
    const first = (metrics[0].memory.used / metrics[0].memory.total) * 100;
    const last = (metrics[metrics.length - 1].memory.used / metrics[metrics.length - 1].memory.total) * 100;
    
    return ((last - first) / first) * 100;
  }

  private calculatePersistence(bottleneckId: string, currentTime: number): number {
    const existing = this.bottlenecks.get(bottleneckId);
    return existing ? currentTime - existing.detectedAt : 0;
  }

  public getBottlenecks(): PerformanceBottleneck[] {
    return Array.from(this.bottlenecks.values());
  }

  public getTrends(): PerformanceTrend[] {
    return Array.from(this.trends.values());
  }

  public getOptimizations(): OptimizationRecommendation[] {
    return Array.from(this.optimizations.values());
  }

  public getMetricsHistory(): SystemMetrics[] {
    return [...this.metricsHistory];
  }

  public clearHistory(): void {
    this.metricsHistory = [];
    this.bottlenecks.clear();
    this.trends.clear();
    this.optimizations.clear();
  }

  public isActive(): boolean {
    return this.isAnalyzing;
  }
}

export default PerformanceAnalyzer;