---
name: performance-monitoring
description: Comprehensive skill performance analysis and tracking system for measuring execution metrics, detecting anomalies, and identifying optimization opportunities
version: 1.0.0
category: shared
tags:
  - monitoring
  - performance
  - analytics
  - metrics
  - tracking
primary_agent: learning-optimizer-agent
related_skills:
  - learning-patterns
  - skill-design-patterns
author: Avi System
created: 2025-10-18
last_updated: 2025-10-18
token_efficiency: high
learning_enabled: false
---

# Performance Monitoring

This skill provides comprehensive performance monitoring capabilities for tracking skill execution, analyzing trends, detecting anomalies, and generating actionable insights.

## Overview

Effective performance monitoring enables:
- Real-time execution tracking
- Baseline performance establishment
- Statistical trend analysis
- Anomaly detection
- Performance degradation alerts
- Data-driven optimization decisions

## Execution Tracking

### Logging Infrastructure

```typescript
interface ExecutionLog {
  id: string;
  skillName: string;
  skillVersion: string;
  agentId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  success: boolean;
  error?: {
    type: string;
    message: string;
    stack?: string;
  };
  context: {
    inputSize?: number;
    outputSize?: number;
    parameters?: Record<string, any>;
  };
  metadata: {
    serverInstance?: string;
    learningEnabled?: boolean;
    retryCount?: number;
  };
}

class ExecutionTracker {
  private logs: Map<string, ExecutionLog> = new Map();

  async startExecution(
    skillName: string,
    skillVersion: string,
    agentId: string,
    context?: ExecutionLog['context']
  ): Promise<string> {
    const id = this.generateExecutionId();

    const log: ExecutionLog = {
      id,
      skillName,
      skillVersion,
      agentId,
      startTime: new Date(),
      endTime: new Date(), // Will be updated
      duration: 0,
      success: false,
      context: context || {},
      metadata: {
        learningEnabled: await this.isLearningEnabled(skillName)
      }
    };

    this.logs.set(id, log);
    await this.persistLog(log);

    return id;
  }

  async endExecution(
    id: string,
    success: boolean,
    error?: ExecutionLog['error']
  ): Promise<void> {
    const log = this.logs.get(id);
    if (!log) {
      throw new Error(`Execution log not found: ${id}`);
    }

    log.endTime = new Date();
    log.duration = log.endTime.getTime() - log.startTime.getTime();
    log.success = success;
    if (error) {
      log.error = error;
    }

    await this.persistLog(log);
    await this.updateMetrics(log);

    // Clean up memory after persistence
    this.logs.delete(id);
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async isLearningEnabled(skillName: string): Promise<boolean> {
    // Check skill configuration
    const config = await this.getSkillConfig(skillName);
    return config?.learning_enabled || false;
  }

  private async persistLog(log: ExecutionLog): Promise<void> {
    // Store in database/file system
    await this.database.executionLogs.insert(log);
  }

  private async updateMetrics(log: ExecutionLog): Promise<void> {
    // Update real-time metrics
    await this.metricsAggregator.record(log);
  }
}
```

### Real-Time Metrics Collection

```typescript
interface RealTimeMetrics {
  skillName: string;
  timestamp: Date;
  windowSize: number; // seconds

  // Execution metrics
  executionCount: number;
  successCount: number;
  errorCount: number;
  successRate: number;

  // Performance metrics
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;

  // Resource metrics
  avgInputSize: number;
  avgOutputSize: number;
}

class MetricsAggregator {
  private windows: Map<string, TimeWindow> = new Map();

  async record(log: ExecutionLog): Promise<void> {
    const windowKey = this.getWindowKey(log.skillName, log.endTime);
    let window = this.windows.get(windowKey);

    if (!window) {
      window = new TimeWindow(log.skillName, log.endTime);
      this.windows.set(windowKey, window);
    }

    window.addExecution(log);

    // Persist metrics every minute
    if (window.shouldPersist()) {
      await this.persistMetrics(window);
    }
  }

  private getWindowKey(skillName: string, timestamp: Date): string {
    const windowStart = Math.floor(timestamp.getTime() / 60000) * 60000;
    return `${skillName}_${windowStart}`;
  }

  async getMetrics(
    skillName: string,
    startTime: Date,
    endTime: Date
  ): Promise<RealTimeMetrics[]> {
    return await this.database.metrics.find({
      skillName,
      timestamp: {
        $gte: startTime,
        $lte: endTime
      }
    });
  }

  private async persistMetrics(window: TimeWindow): Promise<void> {
    const metrics = window.calculateMetrics();
    await this.database.metrics.insert(metrics);
  }
}

class TimeWindow {
  private executions: ExecutionLog[] = [];
  private startTime: Date;

  constructor(
    public skillName: string,
    timestamp: Date
  ) {
    this.startTime = new Date(Math.floor(timestamp.getTime() / 60000) * 60000);
  }

  addExecution(log: ExecutionLog): void {
    this.executions.push(log);
  }

  shouldPersist(): boolean {
    const now = new Date();
    const elapsed = now.getTime() - this.startTime.getTime();
    return elapsed >= 60000; // 1 minute
  }

  calculateMetrics(): RealTimeMetrics {
    const durations = this.executions.map(e => e.duration);
    const successCount = this.executions.filter(e => e.success).length;

    return {
      skillName: this.skillName,
      timestamp: this.startTime,
      windowSize: 60,
      executionCount: this.executions.length,
      successCount,
      errorCount: this.executions.length - successCount,
      successRate: successCount / this.executions.length,
      avgDuration: this.calculateMean(durations),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p50Duration: this.calculatePercentile(durations, 50),
      p95Duration: this.calculatePercentile(durations, 95),
      p99Duration: this.calculatePercentile(durations, 99),
      avgInputSize: this.calculateMean(
        this.executions.map(e => e.context.inputSize || 0)
      ),
      avgOutputSize: this.calculateMean(
        this.executions.map(e => e.context.outputSize || 0)
      )
    };
  }

  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}
```

### Storage Patterns

```typescript
interface MetricsDatabase {
  // Raw execution logs (kept for 30 days)
  executionLogs: {
    insert(log: ExecutionLog): Promise<void>;
    query(filter: any): Promise<ExecutionLog[]>;
    cleanup(olderThan: Date): Promise<number>;
  };

  // Aggregated metrics (kept for 1 year)
  metrics: {
    insert(metrics: RealTimeMetrics): Promise<void>;
    find(filter: any): Promise<RealTimeMetrics[]>;
    aggregate(pipeline: any[]): Promise<any[]>;
  };

  // Performance baselines (kept indefinitely)
  baselines: {
    insert(baseline: PerformanceBaseline): Promise<void>;
    findLatest(skillName: string): Promise<PerformanceBaseline | null>;
    findByVersion(skillName: string, version: string): Promise<PerformanceBaseline | null>;
  };
}

class FileSystemMetricsStore implements MetricsDatabase {
  constructor(private basePath: string) {}

  executionLogs = {
    insert: async (log: ExecutionLog): Promise<void> => {
      const date = log.startTime.toISOString().split('T')[0];
      const path = `${this.basePath}/logs/${log.skillName}/${date}.ndjson`;

      await this.ensureDir(path);
      await this.appendLine(path, JSON.stringify(log));
    },

    query: async (filter: any): Promise<ExecutionLog[]> => {
      const files = await this.findLogFiles(filter);
      const logs: ExecutionLog[] = [];

      for (const file of files) {
        const lines = await this.readLines(file);
        for (const line of lines) {
          const log = JSON.parse(line);
          if (this.matchesFilter(log, filter)) {
            logs.push(log);
          }
        }
      }

      return logs;
    },

    cleanup: async (olderThan: Date): Promise<number> => {
      let deletedCount = 0;
      const cutoffDate = olderThan.toISOString().split('T')[0];

      const logDirs = await this.listDirs(`${this.basePath}/logs`);

      for (const dir of logDirs) {
        const files = await this.listFiles(dir);

        for (const file of files) {
          const fileDate = this.extractDateFromFilename(file);
          if (fileDate < cutoffDate) {
            await this.deleteFile(file);
            deletedCount++;
          }
        }
      }

      return deletedCount;
    }
  };

  metrics = {
    insert: async (metrics: RealTimeMetrics): Promise<void> => {
      const month = metrics.timestamp.toISOString().substring(0, 7);
      const path = `${this.basePath}/metrics/${metrics.skillName}/${month}.ndjson`;

      await this.ensureDir(path);
      await this.appendLine(path, JSON.stringify(metrics));
    },

    find: async (filter: any): Promise<RealTimeMetrics[]> => {
      const files = await this.findMetricFiles(filter);
      const metrics: RealTimeMetrics[] = [];

      for (const file of files) {
        const lines = await this.readLines(file);
        for (const line of lines) {
          const metric = JSON.parse(line);
          if (this.matchesFilter(metric, filter)) {
            metrics.push(metric);
          }
        }
      }

      return metrics;
    },

    aggregate: async (pipeline: any[]): Promise<any[]> => {
      // Simplified aggregation for file-based storage
      const allMetrics = await this.metrics.find({});
      return this.applyAggregationPipeline(allMetrics, pipeline);
    }
  };

  baselines = {
    insert: async (baseline: PerformanceBaseline): Promise<void> => {
      const path = `${this.basePath}/baselines/${baseline.skillName}.json`;
      await this.ensureDir(path);

      // Load existing baselines
      let baselines: PerformanceBaseline[] = [];
      if (await this.fileExists(path)) {
        baselines = JSON.parse(await this.readFile(path));
      }

      // Add new baseline
      baselines.push(baseline);

      // Keep only last 10 baselines
      if (baselines.length > 10) {
        baselines = baselines.slice(-10);
      }

      await this.writeFile(path, JSON.stringify(baselines, null, 2));
    },

    findLatest: async (skillName: string): Promise<PerformanceBaseline | null> => {
      const path = `${this.basePath}/baselines/${skillName}.json`;
      if (!await this.fileExists(path)) {
        return null;
      }

      const baselines: PerformanceBaseline[] = JSON.parse(await this.readFile(path));
      return baselines[baselines.length - 1] || null;
    },

    findByVersion: async (skillName: string, version: string): Promise<PerformanceBaseline | null> => {
      const path = `${this.basePath}/baselines/${skillName}.json`;
      if (!await this.fileExists(path)) {
        return null;
      }

      const baselines: PerformanceBaseline[] = JSON.parse(await this.readFile(path));
      return baselines.find(b => b.version === version) || null;
    }
  };

  // Helper methods
  private async ensureDir(filePath: string): Promise<void> {
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
    // Use fs.mkdir with recursive option
  }

  private async appendLine(path: string, line: string): Promise<void> {
    // Use fs.appendFile
  }

  private async readLines(path: string): Promise<string[]> {
    const content = await this.readFile(path);
    return content.split('\n').filter(line => line.trim());
  }

  private async readFile(path: string): Promise<string> {
    // Use fs.readFile
    return '';
  }

  private async writeFile(path: string, content: string): Promise<void> {
    // Use fs.writeFile
  }

  private async fileExists(path: string): Promise<boolean> {
    // Use fs.access
    return false;
  }

  private async listDirs(path: string): Promise<string[]> {
    // Use fs.readdir with withFileTypes
    return [];
  }

  private async listFiles(path: string): Promise<string[]> {
    // Use fs.readdir
    return [];
  }

  private async deleteFile(path: string): Promise<void> {
    // Use fs.unlink
  }

  private matchesFilter(obj: any, filter: any): boolean {
    for (const key in filter) {
      const filterValue = filter[key];
      const objValue = obj[key];

      if (typeof filterValue === 'object' && filterValue !== null) {
        // Handle operators like $gte, $lte
        for (const op in filterValue) {
          if (op === '$gte' && objValue < filterValue[op]) return false;
          if (op === '$lte' && objValue > filterValue[op]) return false;
          if (op === '$eq' && objValue !== filterValue[op]) return false;
        }
      } else {
        if (objValue !== filterValue) return false;
      }
    }
    return true;
  }

  private extractDateFromFilename(filename: string): string {
    const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
  }

  private findLogFiles(filter: any): Promise<string[]> {
    // Implementation to find relevant log files based on filter
    return Promise.resolve([]);
  }

  private findMetricFiles(filter: any): Promise<string[]> {
    // Implementation to find relevant metric files based on filter
    return Promise.resolve([]);
  }

  private applyAggregationPipeline(data: any[], pipeline: any[]): any[] {
    // Simplified aggregation logic
    return data;
  }
}
```

## Baseline Establishment

### Initial Performance Measurement

```typescript
interface PerformanceBaseline {
  skillName: string;
  version: string;
  establishedAt: Date;
  validUntil: Date;
  executionCount: number;

  // Success metrics
  successRate: number;
  successRateCI: [number, number]; // Confidence interval

  // Performance metrics
  averageResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  responseTimeStdDev: number;

  // Error metrics
  errorRate: number;
  topErrors: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;

  // Resource metrics
  averageInputSize: number;
  averageOutputSize: number;
}

class BaselineEstablisher {
  constructor(
    private tracker: ExecutionTracker,
    private database: MetricsDatabase
  ) {}

  async establishBaseline(
    skillName: string,
    version: string,
    minimumExecutions: number = 50
  ): Promise<PerformanceBaseline> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get execution logs
    const logs = await this.database.executionLogs.query({
      skillName,
      startTime: { $gte: startDate, $lte: endDate }
    });

    if (logs.length < minimumExecutions) {
      throw new Error(
        `Insufficient executions to establish baseline: ${logs.length} (need ${minimumExecutions})`
      );
    }

    // Calculate success metrics
    const successCount = logs.filter(l => l.success).length;
    const successRate = successCount / logs.length;
    const successRateCI = this.calculateWilsonScore(successCount, logs.length);

    // Calculate performance metrics
    const durations = logs.map(l => l.duration);
    const avgDuration = this.mean(durations);
    const stdDev = this.standardDeviation(durations);

    // Calculate error metrics
    const errors = logs.filter(l => !l.success);
    const errorRate = errors.length / logs.length;
    const topErrors = this.aggregateErrors(errors);

    // Calculate resource metrics
    const inputSizes = logs.map(l => l.context.inputSize || 0);
    const outputSizes = logs.map(l => l.context.outputSize || 0);

    const baseline: PerformanceBaseline = {
      skillName,
      version,
      establishedAt: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      executionCount: logs.length,
      successRate,
      successRateCI,
      averageResponseTime: avgDuration,
      p50ResponseTime: this.percentile(durations, 50),
      p95ResponseTime: this.percentile(durations, 95),
      p99ResponseTime: this.percentile(durations, 99),
      responseTimeStdDev: stdDev,
      errorRate,
      topErrors,
      averageInputSize: this.mean(inputSizes),
      averageOutputSize: this.mean(outputSizes)
    };

    await this.database.baselines.insert(baseline);

    return baseline;
  }

  private calculateWilsonScore(
    successes: number,
    total: number,
    confidence: number = 0.95
  ): [number, number] {
    const z = 1.96; // 95% confidence
    const p = successes / total;
    const denominator = 1 + (z * z) / total;
    const center = p + (z * z) / (2 * total);
    const spread = z * Math.sqrt(p * (1 - p) / total + (z * z) / (4 * total * total));

    return [
      (center - spread) / denominator,
      (center + spread) / denominator
    ];
  }

  private mean(values: number[]): number {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private standardDeviation(values: number[]): number {
    const avg = this.mean(values);
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }

  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private aggregateErrors(errors: ExecutionLog[]): Array<{
    type: string;
    count: number;
    percentage: number;
  }> {
    const errorCounts = new Map<string, number>();

    for (const error of errors) {
      const type = error.error?.type || 'Unknown';
      errorCounts.set(type, (errorCounts.get(type) || 0) + 1);
    }

    const total = errors.length;
    const aggregated = Array.from(errorCounts.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: count / total
      }))
      .sort((a, b) => b.count - a.count);

    return aggregated.slice(0, 5); // Top 5 errors
  }
}
```

## Statistical Analysis

### Trend Detection

```typescript
interface TrendAnalysis {
  metric: string;
  timespan: string;
  direction: 'improving' | 'degrading' | 'stable';
  slope: number;
  rSquared: number;
  pValue: number;
  confidence: number;
  dataPoints: number;
}

class TrendAnalyzer {
  async analyzeTrend(
    skillName: string,
    metric: 'successRate' | 'responseTime' | 'errorRate',
    days: number = 30
  ): Promise<TrendAnalysis> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Get daily metrics
    const metrics = await this.database.metrics.find({
      skillName,
      timestamp: { $gte: startDate, $lte: endDate }
    });

    // Aggregate by day
    const dailyValues = this.aggregateByDay(metrics, metric);

    // Perform linear regression
    const regression = this.linearRegression(dailyValues);

    // Determine direction
    let direction: 'improving' | 'degrading' | 'stable';
    const threshold = 0.01; // 1% change

    if (metric === 'errorRate' || metric === 'responseTime') {
      // Lower is better
      if (regression.slope < -threshold && regression.pValue < 0.05) {
        direction = 'improving';
      } else if (regression.slope > threshold && regression.pValue < 0.05) {
        direction = 'degrading';
      } else {
        direction = 'stable';
      }
    } else {
      // Higher is better (successRate)
      if (regression.slope > threshold && regression.pValue < 0.05) {
        direction = 'improving';
      } else if (regression.slope < -threshold && regression.pValue < 0.05) {
        direction = 'degrading';
      } else {
        direction = 'stable';
      }
    }

    return {
      metric,
      timespan: `${days}d`,
      direction,
      slope: regression.slope,
      rSquared: regression.rSquared,
      pValue: regression.pValue,
      confidence: 1 - regression.pValue,
      dataPoints: dailyValues.length
    };
  }

  private aggregateByDay(
    metrics: RealTimeMetrics[],
    metric: string
  ): Array<{ day: number; value: number }> {
    const dailyMap = new Map<string, number[]>();

    for (const m of metrics) {
      const day = m.timestamp.toISOString().split('T')[0];
      if (!dailyMap.has(day)) {
        dailyMap.set(day, []);
      }

      let value: number;
      switch (metric) {
        case 'successRate':
          value = m.successRate;
          break;
        case 'responseTime':
          value = m.avgDuration;
          break;
        case 'errorRate':
          value = m.errorRate;
          break;
        default:
          value = 0;
      }

      dailyMap.get(day)!.push(value);
    }

    // Calculate daily averages
    const dailyValues: Array<{ day: number; value: number }> = [];
    let dayIndex = 0;

    for (const [day, values] of dailyMap) {
      const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;
      dailyValues.push({ day: dayIndex++, value: avgValue });
    }

    return dailyValues;
  }

  private linearRegression(points: Array<{ day: number; value: number }>): {
    slope: number;
    intercept: number;
    rSquared: number;
    pValue: number;
  } {
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.day, 0);
    const sumY = points.reduce((sum, p) => sum + p.value, 0);
    const sumXY = points.reduce((sum, p) => sum + p.day * p.value, 0);
    const sumX2 = points.reduce((sum, p) => sum + p.day * p.day, 0);
    const sumY2 = points.reduce((sum, p) => sum + p.value * p.value, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = sumY2 - n * yMean * yMean;
    const ssResidual = points.reduce((sum, p) => {
      const predicted = slope * p.day + intercept;
      return sum + Math.pow(p.value - predicted, 2);
    }, 0);
    const rSquared = 1 - (ssResidual / ssTotal);

    // Calculate p-value
    const seSlope = Math.sqrt(ssResidual / (n - 2)) / Math.sqrt(sumX2 - (sumX * sumX) / n);
    const tStatistic = Math.abs(slope / seSlope);
    const pValue = this.tDistribution(tStatistic, n - 2);

    return { slope, intercept, rSquared, pValue };
  }

  private tDistribution(t: number, df: number): number {
    // Simplified p-value calculation
    // In production, use a proper statistical library
    const x = df / (df + t * t);
    return 2 * (1 - this.betaIncomplete(df / 2, 0.5, x));
  }

  private betaIncomplete(a: number, b: number, x: number): number {
    // Simplified incomplete beta function
    // In production, use a proper statistical library
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return 0.5; // Placeholder
  }
}
```

## Anomaly Detection

### Statistical Outlier Detection

```typescript
interface Anomaly {
  timestamp: Date;
  metric: string;
  value: number;
  expected: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
}

class AnomalyDetector {
  async detectAnomalies(
    skillName: string,
    lookbackDays: number = 7
  ): Promise<Anomaly[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

    const metrics = await this.database.metrics.find({
      skillName,
      timestamp: { $gte: startDate, $lte: endDate }
    });

    const anomalies: Anomaly[] = [];

    // Check success rate anomalies
    anomalies.push(...await this.detectMetricAnomalies(
      metrics,
      'successRate',
      m => m.successRate
    ));

    // Check response time anomalies
    anomalies.push(...await this.detectMetricAnomalies(
      metrics,
      'responseTime',
      m => m.avgDuration
    ));

    // Check error rate anomalies
    anomalies.push(...await this.detectMetricAnomalies(
      metrics,
      'errorRate',
      m => m.errorRate
    ));

    return anomalies.sort((a, b) =>
      this.severityScore(b.severity) - this.severityScore(a.severity)
    );
  }

  private async detectMetricAnomalies(
    metrics: RealTimeMetrics[],
    metricName: string,
    valueExtractor: (m: RealTimeMetrics) => number
  ): Promise<Anomaly[]> {
    const values = metrics.map(valueExtractor);
    const mean = this.mean(values);
    const stdDev = this.standardDeviation(values);

    const anomalies: Anomaly[] = [];

    for (let i = 0; i < metrics.length; i++) {
      const value = values[i];
      const zScore = Math.abs((value - mean) / stdDev);

      // Z-score > 3 is an outlier (99.7% confidence)
      if (zScore > 3) {
        const deviation = (value - mean) / mean;

        anomalies.push({
          timestamp: metrics[i].timestamp,
          metric: metricName,
          value,
          expected: mean,
          deviation,
          severity: this.calculateSeverity(zScore, deviation),
          confidence: this.zScoreToConfidence(zScore)
        });
      }
    }

    return anomalies;
  }

  private calculateSeverity(
    zScore: number,
    deviation: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    const absDeviation = Math.abs(deviation);

    if (zScore > 5 || absDeviation > 0.5) return 'critical';
    if (zScore > 4 || absDeviation > 0.3) return 'high';
    if (zScore > 3.5 || absDeviation > 0.15) return 'medium';
    return 'low';
  }

  private zScoreToConfidence(zScore: number): number {
    // Simplified normal distribution CDF
    return 1 - (1 / (1 + Math.exp(1.702 * zScore)));
  }

  private severityScore(severity: string): number {
    const scores = { critical: 4, high: 3, medium: 2, low: 1 };
    return scores[severity] || 0;
  }

  private mean(values: number[]): number {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private standardDeviation(values: number[]): number {
    const avg = this.mean(values);
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }
}
```

### Moving Average Detection

```typescript
class MovingAverageDetector {
  async detectAnomalies(
    skillName: string,
    windowSize: number = 10
  ): Promise<Anomaly[]> {
    const metrics = await this.database.metrics.find({
      skillName,
      timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    const anomalies: Anomaly[] = [];
    const successRates = metrics.map(m => m.successRate);

    for (let i = windowSize; i < successRates.length; i++) {
      const window = successRates.slice(i - windowSize, i);
      const movingAvg = this.mean(window);
      const movingStdDev = this.standardDeviation(window);

      const currentValue = successRates[i];
      const deviation = (currentValue - movingAvg) / movingStdDev;

      if (Math.abs(deviation) > 2) {
        anomalies.push({
          timestamp: metrics[i].timestamp,
          metric: 'successRate',
          value: currentValue,
          expected: movingAvg,
          deviation: (currentValue - movingAvg) / movingAvg,
          severity: Math.abs(deviation) > 3 ? 'high' : 'medium',
          confidence: 0.95
        });
      }
    }

    return anomalies;
  }

  private mean(values: number[]): number {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private standardDeviation(values: number[]): number {
    const avg = this.mean(values);
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }
}
```

## Dashboard and Reporting

### Performance Dashboard

```typescript
interface PerformanceDashboard {
  skillName: string;
  generatedAt: Date;
  timeRange: string;

  summary: {
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    message: string;
  };

  metrics: {
    current: PerformanceBaseline;
    baseline: PerformanceBaseline;
    change: {
      successRate: number;
      responseTime: number;
      errorRate: number;
    };
  };

  trends: {
    successRate: TrendAnalysis;
    responseTime: TrendAnalysis;
    errorRate: TrendAnalysis;
  };

  anomalies: Anomaly[];

  recommendations: string[];
}

class DashboardGenerator {
  async generateDashboard(
    skillName: string,
    timeRange: string = '7d'
  ): Promise<PerformanceDashboard> {
    // Get current metrics
    const current = await this.baselineEstablisher.establishBaseline(
      skillName,
      await this.getSkillVersion(skillName)
    );

    // Get baseline
    const baseline = await this.database.baselines.findLatest(skillName);

    // Analyze trends
    const trendAnalyzer = new TrendAnalyzer();
    const trends = {
      successRate: await trendAnalyzer.analyzeTrend(skillName, 'successRate'),
      responseTime: await trendAnalyzer.analyzeTrend(skillName, 'responseTime'),
      errorRate: await trendAnalyzer.analyzeTrend(skillName, 'errorRate')
    };

    // Detect anomalies
    const anomalyDetector = new AnomalyDetector();
    const anomalies = await anomalyDetector.detectAnomalies(skillName);

    // Calculate changes
    const change = baseline ? {
      successRate: (current.successRate - baseline.successRate) / baseline.successRate,
      responseTime: (current.averageResponseTime - baseline.averageResponseTime) / baseline.averageResponseTime,
      errorRate: (current.errorRate - baseline.errorRate) / baseline.errorRate
    } : { successRate: 0, responseTime: 0, errorRate: 0 };

    // Generate status
    const summary = this.generateSummary(current, trends, anomalies);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      current,
      trends,
      anomalies,
      change
    );

    return {
      skillName,
      generatedAt: new Date(),
      timeRange,
      summary,
      metrics: { current, baseline: baseline!, change },
      trends,
      anomalies,
      recommendations
    };
  }

  private generateSummary(
    current: PerformanceBaseline,
    trends: any,
    anomalies: Anomaly[]
  ): { status: string; score: number; message: string } {
    let score = 100;
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check success rate
    if (current.successRate < 0.85) score -= 30;
    if (current.successRate < 0.70) score -= 20;

    // Check trends
    if (trends.successRate.direction === 'degrading') score -= 15;
    if (trends.responseTime.direction === 'degrading') score -= 10;

    // Check anomalies
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
    const highAnomalies = anomalies.filter(a => a.severity === 'high');
    score -= criticalAnomalies.length * 10;
    score -= highAnomalies.length * 5;

    // Determine status
    if (score >= 80) status = 'healthy';
    else if (score >= 60) status = 'warning';
    else status = 'critical';

    const message = this.generateStatusMessage(status, current, trends);

    return { status, score: Math.max(0, score), message };
  }

  private generateStatusMessage(
    status: string,
    current: PerformanceBaseline,
    trends: any
  ): string {
    if (status === 'healthy') {
      return `Skill is performing well with ${(current.successRate * 100).toFixed(1)}% success rate`;
    }

    if (status === 'warning') {
      if (trends.successRate.direction === 'degrading') {
        return `Success rate trending downward - monitoring required`;
      }
      return `Performance below optimal levels`;
    }

    return `Critical performance issues detected - immediate attention required`;
  }

  private generateRecommendations(
    current: PerformanceBaseline,
    trends: any,
    anomalies: Anomaly[],
    change: any
  ): string[] {
    const recommendations: string[] = [];

    if (current.successRate < 0.85) {
      recommendations.push('Enable learning to improve success rate');
    }

    if (trends.successRate.direction === 'degrading') {
      recommendations.push('Investigate recent changes causing performance degradation');
    }

    if (current.p95ResponseTime > 5000) {
      recommendations.push('Optimize response time - P95 exceeds 5 seconds');
    }

    if (anomalies.filter(a => a.severity === 'critical').length > 0) {
      recommendations.push('Review critical anomalies and investigate root causes');
    }

    if (current.topErrors.length > 0) {
      recommendations.push(`Address top error: ${current.topErrors[0].type}`);
    }

    if (change.errorRate > 0.2) {
      recommendations.push('Error rate increased by >20% - rollback or fix required');
    }

    return recommendations;
  }
}
```

## Best Practices

1. **Track all skill executions** with structured logging
2. **Establish baselines** before making any changes
3. **Use statistical methods** for trend detection
4. **Set up automated anomaly detection**
5. **Monitor multiple metrics**, not just success rate
6. **Keep historical data** for long-term analysis
7. **Generate regular reports** for visibility
8. **Alert on critical issues** immediately
9. **Use percentiles** (P95, P99) for performance metrics
10. **Validate statistical significance** before making decisions

## Summary

This skill provides comprehensive performance monitoring capabilities, enabling data-driven optimization decisions through execution tracking, baseline establishment, statistical analysis, and anomaly detection.
