/**
 * Performance Profiler - London School TDD Performance Testing
 * Comprehensive performance monitoring and benchmarking utilities
 */

export class PerformanceProfiler {
  constructor() {
    this.measurements = new Map();
    this.benchmarks = new Map();
    this.alerts = [];
    this.thresholds = new Map();
  }

  /**
   * Start a performance measurement
   */
  startMeasurement(name, context = {}) {
    const measurement = {
      name,
      context,
      startTime: process.hrtime.bigint(),
      startMemory: process.memoryUsage(),
      startCpuUsage: process.cpuUsage(),
      markers: []
    };

    this.measurements.set(name, measurement);
    return measurement;
  }

  /**
   * Add a marker to an ongoing measurement
   */
  addMarker(measurementName, markerName, data = {}) {
    const measurement = this.measurements.get(measurementName);
    if (!measurement) {
      throw new Error(`Measurement ${measurementName} not found`);
    }

    const marker = {
      name: markerName,
      timestamp: process.hrtime.bigint(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      data
    };

    measurement.markers.push(marker);
    return marker;
  }

  /**
   * End a performance measurement
   */
  endMeasurement(name) {
    const measurement = this.measurements.get(name);
    if (!measurement) {
      throw new Error(`Measurement ${name} not found`);
    }

    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    const endCpuUsage = process.cpuUsage(measurement.startCpuUsage);

    const result = {
      name: measurement.name,
      context: measurement.context,
      duration: Number(endTime - measurement.startTime) / 1000000, // Convert to milliseconds
      memoryDelta: {
        heapUsed: endMemory.heapUsed - measurement.startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - measurement.startMemory.heapTotal,
        external: endMemory.external - measurement.startMemory.external,
        arrayBuffers: endMemory.arrayBuffers - measurement.startMemory.arrayBuffers
      },
      cpuUsage: {
        user: endCpuUsage.user,
        system: endCpuUsage.system
      },
      markers: measurement.markers.map(marker => ({
        ...marker,
        relativeTime: Number(marker.timestamp - measurement.startTime) / 1000000,
        memoryDelta: {
          heapUsed: marker.memoryUsage.heapUsed - measurement.startMemory.heapUsed,
          heapTotal: marker.memoryUsage.heapTotal - measurement.startMemory.heapTotal
        }
      })),
      timestamp: new Date().toISOString()
    };

    this.measurements.delete(name);
    this.storeBenchmark(result);
    this.checkThresholds(result);

    return result;
  }

  /**
   * Set performance thresholds for alerts
   */
  setThreshold(metricName, threshold) {
    this.thresholds.set(metricName, threshold);
  }

  /**
   * Check if measurement exceeds thresholds
   */
  checkThresholds(measurement) {
    const alerts = [];

    // Check duration threshold
    const durationThreshold = this.thresholds.get(`${measurement.name}.duration`);
    if (durationThreshold && measurement.duration > durationThreshold.max) {
      alerts.push({
        type: 'duration_exceeded',
        measurement: measurement.name,
        actual: measurement.duration,
        threshold: durationThreshold.max,
        severity: durationThreshold.severity || 'warning'
      });
    }

    // Check memory threshold
    const memoryThreshold = this.thresholds.get(`${measurement.name}.memory`);
    if (memoryThreshold && measurement.memoryDelta.heapUsed > memoryThreshold.max) {
      alerts.push({
        type: 'memory_exceeded',
        measurement: measurement.name,
        actual: measurement.memoryDelta.heapUsed,
        threshold: memoryThreshold.max,
        severity: memoryThreshold.severity || 'warning'
      });
    }

    // Check CPU threshold
    const cpuThreshold = this.thresholds.get(`${measurement.name}.cpu`);
    if (cpuThreshold) {
      const totalCpuTime = measurement.cpuUsage.user + measurement.cpuUsage.system;
      if (totalCpuTime > cpuThreshold.max) {
        alerts.push({
          type: 'cpu_exceeded',
          measurement: measurement.name,
          actual: totalCpuTime,
          threshold: cpuThreshold.max,
          severity: cpuThreshold.severity || 'warning'
        });
      }
    }

    this.alerts.push(...alerts);
    return alerts;
  }

  /**
   * Store benchmark results
   */
  storeBenchmark(measurement) {
    const benchmarkKey = `${measurement.name}`;
    if (!this.benchmarks.has(benchmarkKey)) {
      this.benchmarks.set(benchmarkKey, []);
    }

    this.benchmarks.get(benchmarkKey).push(measurement);

    // Keep only last 100 measurements
    const benchmarks = this.benchmarks.get(benchmarkKey);
    if (benchmarks.length > 100) {
      benchmarks.splice(0, benchmarks.length - 100);
    }
  }

  /**
   * Get benchmark statistics
   */
  getBenchmarkStats(measurementName) {
    const benchmarks = this.benchmarks.get(measurementName);
    if (!benchmarks || benchmarks.length === 0) {
      return null;
    }

    const durations = benchmarks.map(b => b.duration);
    const memoryUsages = benchmarks.map(b => b.memoryDelta.heapUsed);
    const cpuUsages = benchmarks.map(b => b.cpuUsage.user + b.cpuUsage.system);

    return {
      measurementName,
      sampleCount: benchmarks.length,
      duration: {
        min: Math.min(...durations),
        max: Math.max(...durations),
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        median: this.getMedian(durations),
        p95: this.getPercentile(durations, 95),
        p99: this.getPercentile(durations, 99)
      },
      memory: {
        min: Math.min(...memoryUsages),
        max: Math.max(...memoryUsages),
        avg: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
        median: this.getMedian(memoryUsages)
      },
      cpu: {
        min: Math.min(...cpuUsages),
        max: Math.max(...cpuUsages),
        avg: cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length,
        median: this.getMedian(cpuUsages)
      },
      trend: this.calculateTrend(durations),
      lastUpdated: benchmarks[benchmarks.length - 1].timestamp
    };
  }

  /**
   * Calculate median value
   */
  getMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      return sorted[mid];
    }
  }

  /**
   * Calculate percentile value
   */
  getPercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Calculate performance trend
   */
  calculateTrend(values) {
    if (values.length < 2) {
      return 'insufficient_data';
    }

    const recentValues = values.slice(-10); // Last 10 measurements
    const olderValues = values.slice(-20, -10); // Previous 10 measurements

    if (olderValues.length === 0) {
      return 'insufficient_historical_data';
    }

    const recentAvg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
    const olderAvg = olderValues.reduce((a, b) => a + b, 0) / olderValues.length;

    const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (Math.abs(changePercent) < 5) {
      return 'stable';
    } else if (changePercent > 5) {
      return 'degrading';
    } else {
      return 'improving';
    }
  }

  /**
   * Compare two measurement sets
   */
  compare(baselineName, currentName) {
    const baseline = this.getBenchmarkStats(baselineName);
    const current = this.getBenchmarkStats(currentName);

    if (!baseline || !current) {
      throw new Error('Both baseline and current measurements required for comparison');
    }

    return {
      durationChange: {
        absolute: current.duration.avg - baseline.duration.avg,
        percentage: ((current.duration.avg - baseline.duration.avg) / baseline.duration.avg) * 100
      },
      memoryChange: {
        absolute: current.memory.avg - baseline.memory.avg,
        percentage: ((current.memory.avg - baseline.memory.avg) / baseline.memory.avg) * 100
      },
      cpuChange: {
        absolute: current.cpu.avg - baseline.cpu.avg,
        percentage: ((current.cpu.avg - baseline.cpu.avg) / baseline.cpu.avg) * 100
      },
      regression: {
        duration: current.duration.avg > baseline.duration.avg * 1.1, // 10% threshold
        memory: current.memory.avg > baseline.memory.avg * 1.2, // 20% threshold
        cpu: current.cpu.avg > baseline.cpu.avg * 1.15 // 15% threshold
      },
      improvement: {
        duration: current.duration.avg < baseline.duration.avg * 0.9, // 10% improvement
        memory: current.memory.avg < baseline.memory.avg * 0.8, // 20% improvement
        cpu: current.cpu.avg < baseline.cpu.avg * 0.85 // 15% improvement
      }
    };
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      measurements: this.benchmarks.size,
      alerts: this.alerts.length,
      benchmarks: {},
      alertSummary: {},
      recommendations: []
    };

    // Generate benchmark summaries
    for (const [name] of this.benchmarks) {
      report.benchmarks[name] = this.getBenchmarkStats(name);
    }

    // Summarize alerts
    report.alertSummary = this.alerts.reduce((summary, alert) => {
      const key = `${alert.type}_${alert.severity}`;
      summary[key] = (summary[key] || 0) + 1;
      return summary;
    }, {});

    // Generate recommendations
    for (const [name, stats] of Object.entries(report.benchmarks)) {
      if (stats.trend === 'degrading') {
        report.recommendations.push({
          type: 'performance_degradation',
          measurement: name,
          message: `Performance degrading for ${name}. Consider optimization.`,
          priority: 'medium'
        });
      }

      if (stats.duration.p95 > stats.duration.avg * 2) {
        report.recommendations.push({
          type: 'high_variance',
          measurement: name,
          message: `High variance in ${name} duration. Investigate outliers.`,
          priority: 'low'
        });
      }
    }

    return report;
  }

  /**
   * Reset all measurements and benchmarks
   */
  reset() {
    this.measurements.clear();
    this.benchmarks.clear();
    this.alerts = [];
    this.thresholds.clear();
  }

  /**
   * Export performance data
   */
  export() {
    return {
      benchmarks: Object.fromEntries(this.benchmarks),
      alerts: this.alerts,
      thresholds: Object.fromEntries(this.thresholds)
    };
  }

  /**
   * Import performance data
   */
  import(data) {
    if (data.benchmarks) {
      this.benchmarks = new Map(Object.entries(data.benchmarks));
    }
    if (data.alerts) {
      this.alerts = data.alerts;
    }
    if (data.thresholds) {
      this.thresholds = new Map(Object.entries(data.thresholds));
    }
  }
}

export default PerformanceProfiler;