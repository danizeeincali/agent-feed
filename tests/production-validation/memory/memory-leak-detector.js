/**
 * Memory Leak Detection System
 * Monitors memory usage patterns and detects potential leaks
 */

const { performance, PerformanceObserver } = require('perf_hooks');
const v8 = require('v8');
const process = require('process');

class MemoryLeakDetector {
  constructor(config = {}) {
    this.config = {
      samplingInterval: config.samplingInterval || 1000, // 1 second
      monitorDuration: config.monitorDuration || 300000, // 5 minutes
      memoryThreshold: config.memoryThreshold || 100 * 1024 * 1024, // 100MB
      leakThreshold: config.leakThreshold || 0.8, // 80% increase
      gcThreshold: config.gcThreshold || 10, // Force GC every 10 samples
      ...config
    };
    
    this.samples = [];
    this.monitoring = false;
    this.intervalId = null;
    this.gcCount = 0;
    this.startTime = null;
    
    // Setup performance observer
    this.perfObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.entryType === 'gc') {
          this.gcCount++;
        }
      });
    });
    
    // Enable GC performance tracking
    this.perfObserver.observe({ entryTypes: ['gc'] });
  }

  startMonitoring() {
    if (this.monitoring) {
      console.log('⚠️  Memory monitoring already in progress');
      return;
    }

    console.log('📊 Starting memory leak detection...');
    this.monitoring = true;
    this.startTime = Date.now();
    this.samples = [];
    
    // Initial sample
    this.takeSample();
    
    // Start regular sampling
    this.intervalId = setInterval(() => {
      this.takeSample();
      
      // Force garbage collection periodically to get accurate readings
      if (this.samples.length % this.config.gcThreshold === 0) {
        if (global.gc) {
          global.gc();
        }
      }
    }, this.config.samplingInterval);

    // Auto-stop after duration
    setTimeout(() => {
      this.stopMonitoring();
    }, this.config.monitorDuration);
  }

  stopMonitoring() {
    if (!this.monitoring) {
      return;
    }

    console.log('🛑 Stopping memory leak detection...');
    this.monitoring = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Final sample
    this.takeSample();
  }

  takeSample() {
    const memUsage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();
    const timestamp = Date.now();

    const sample = {
      timestamp,
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      mallocedMemory: heapStats.malloced_memory,
      peakMallocedMemory: heapStats.peak_malloced_memory,
      totalHeapSize: heapStats.total_heap_size,
      totalHeapSizeExecutable: heapStats.total_heap_size_executable,
      totalPhysicalSize: heapStats.total_physical_size,
      totalAvailableSize: heapStats.total_available_size,
      usedHeapSize: heapStats.used_heap_size,
      heapSizeLimit: heapStats.heap_size_limit,
      gcCount: this.gcCount
    };

    this.samples.push(sample);
  }

  async analyzeLeaks() {
    if (this.samples.length < 2) {
      return {
        success: false,
        error: 'Insufficient samples for analysis',
        samplesCollected: this.samples.length
      };
    }

    console.log('🔍 Analyzing memory usage patterns...');

    const firstSample = this.samples[0];
    const lastSample = this.samples[this.samples.length - 1];
    const duration = lastSample.timestamp - firstSample.timestamp;

    // Calculate memory growth
    const memoryGrowth = {
      rss: lastSample.rss - firstSample.rss,
      heapTotal: lastSample.heapTotal - firstSample.heapTotal,
      heapUsed: lastSample.heapUsed - firstSample.heapUsed,
      external: lastSample.external - firstSample.external,
      arrayBuffers: lastSample.arrayBuffers - firstSample.arrayBuffers
    };

    // Calculate growth rates (bytes per second)
    const growthRates = {
      rss: memoryGrowth.rss / (duration / 1000),
      heapTotal: memoryGrowth.heapTotal / (duration / 1000),
      heapUsed: memoryGrowth.heapUsed / (duration / 1000),
      external: memoryGrowth.external / (duration / 1000),
      arrayBuffers: memoryGrowth.arrayBuffers / (duration / 1000)
    };

    // Detect potential leaks
    const leakDetection = this.detectLeaks();
    
    // Calculate statistics
    const stats = this.calculateStatistics();

    // Memory efficiency analysis
    const efficiency = this.analyzeMemoryEfficiency();

    return {
      success: true,
      analysis: {
        duration,
        samplesAnalyzed: this.samples.length,
        samplingInterval: this.config.samplingInterval,
        memoryGrowth,
        growthRates,
        leakDetection,
        statistics: stats,
        efficiency,
        recommendations: this.generateRecommendations(leakDetection, growthRates, efficiency)
      }
    };
  }

  detectLeaks() {
    const results = {
      hasMemoryLeak: false,
      suspiciousMetrics: [],
      severity: 'low',
      details: []
    };

    // Check for consistent upward trends
    const trends = this.analyzeTrends();
    
    Object.entries(trends).forEach(([metric, trend]) => {
      if (trend.slope > 0 && trend.correlation > 0.8) {
        const growthRate = trend.slope * 1000; // per second
        
        if (growthRate > 1024 * 1024) { // 1MB/s growth
          results.hasMemoryLeak = true;
          results.suspiciousMetrics.push(metric);
          results.severity = 'high';
          results.details.push({
            metric,
            growthRate: `${(growthRate / 1024 / 1024).toFixed(2)} MB/s`,
            correlation: trend.correlation.toFixed(3)
          });
        } else if (growthRate > 100 * 1024) { // 100KB/s growth
          results.suspiciousMetrics.push(metric);
          if (results.severity === 'low') results.severity = 'medium';
          results.details.push({
            metric,
            growthRate: `${(growthRate / 1024).toFixed(2)} KB/s`,
            correlation: trend.correlation.toFixed(3)
          });
        }
      }
    });

    // Check for memory spikes
    const spikes = this.detectMemorySpikes();
    if (spikes.length > 0) {
      results.details.push({
        type: 'memory_spikes',
        count: spikes.length,
        largest: spikes[0]
      });
    }

    return results;
  }

  analyzeTrends() {
    const metrics = ['rss', 'heapTotal', 'heapUsed', 'external', 'arrayBuffers'];
    const trends = {};

    metrics.forEach(metric => {
      const values = this.samples.map(s => s[metric]);
      const times = this.samples.map(s => s.timestamp - this.samples[0].timestamp);
      
      // Calculate linear regression
      const n = values.length;
      const sumX = times.reduce((a, b) => a + b, 0);
      const sumY = values.reduce((a, b) => a + b, 0);
      const sumXY = times.reduce((sum, x, i) => sum + x * values[i], 0);
      const sumXX = times.reduce((sum, x) => sum + x * x, 0);
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      
      // Calculate correlation coefficient
      const meanX = sumX / n;
      const meanY = sumY / n;
      const numerator = times.reduce((sum, x, i) => sum + (x - meanX) * (values[i] - meanY), 0);
      const denomX = Math.sqrt(times.reduce((sum, x) => sum + Math.pow(x - meanX, 2), 0));
      const denomY = Math.sqrt(values.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0));
      const correlation = numerator / (denomX * denomY);
      
      trends[metric] = { slope, correlation };
    });

    return trends;
  }

  detectMemorySpikes() {
    const spikes = [];
    const heapUsed = this.samples.map(s => s.heapUsed);
    
    // Calculate rolling average
    const windowSize = Math.min(10, Math.floor(this.samples.length / 4));
    
    for (let i = windowSize; i < heapUsed.length - windowSize; i++) {
      const before = heapUsed.slice(i - windowSize, i);
      const after = heapUsed.slice(i + 1, i + windowSize + 1);
      const avgBefore = before.reduce((a, b) => a + b, 0) / before.length;
      const avgAfter = after.reduce((a, b) => a + b, 0) / after.length;
      
      const current = heapUsed[i];
      const spikeThreshold = Math.max(avgBefore, avgAfter) * 2;
      
      if (current > spikeThreshold) {
        spikes.push({
          index: i,
          timestamp: this.samples[i].timestamp,
          value: current,
          increase: current - Math.max(avgBefore, avgAfter),
          severity: current > spikeThreshold * 2 ? 'high' : 'medium'
        });
      }
    }

    return spikes.sort((a, b) => b.increase - a.increase);
  }

  calculateStatistics() {
    const metrics = ['rss', 'heapTotal', 'heapUsed', 'external', 'arrayBuffers'];
    const stats = {};

    metrics.forEach(metric => {
      const values = this.samples.map(s => s[metric]);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      
      // Calculate standard deviation
      const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      
      stats[metric] = {
        min: this.formatBytes(min),
        max: this.formatBytes(max),
        avg: this.formatBytes(avg),
        stdDev: this.formatBytes(stdDev),
        range: this.formatBytes(max - min),
        variability: (stdDev / avg * 100).toFixed(2) + '%'
      };
    });

    return stats;
  }

  analyzeMemoryEfficiency() {
    const lastSample = this.samples[this.samples.length - 1];
    const heapUtilization = (lastSample.usedHeapSize / lastSample.totalHeapSize) * 100;
    const physicalUtilization = (lastSample.totalPhysicalSize / lastSample.totalHeapSize) * 100;
    
    return {
      heapUtilization: heapUtilization.toFixed(2) + '%',
      physicalUtilization: physicalUtilization.toFixed(2) + '%',
      gcCount: lastSample.gcCount,
      gcEfficiency: this.calculateGCEfficiency(),
      memoryFragmentation: this.calculateFragmentation()
    };
  }

  calculateGCEfficiency() {
    if (this.samples.length < 2) return 'insufficient_data';
    
    const gcEvents = this.samples.filter((sample, i, arr) => 
      i > 0 && sample.gcCount > arr[i-1].gcCount
    );

    if (gcEvents.length === 0) return 'no_gc_events';

    // Calculate average memory freed per GC
    let totalFreed = 0;
    gcEvents.forEach((sample, i, arr) => {
      if (i > 0) {
        const memoryBefore = arr[i-1].heapUsed;
        const memoryAfter = sample.heapUsed;
        if (memoryBefore > memoryAfter) {
          totalFreed += memoryBefore - memoryAfter;
        }
      }
    });

    const avgFreedPerGC = totalFreed / gcEvents.length;
    
    return {
      gcEvents: gcEvents.length,
      totalMemoryFreed: this.formatBytes(totalFreed),
      averageFreedPerGC: this.formatBytes(avgFreedPerGC),
      efficiency: totalFreed > 0 ? 'effective' : 'ineffective'
    };
  }

  calculateFragmentation() {
    const lastSample = this.samples[this.samples.length - 1];
    const fragmentationRatio = (lastSample.totalHeapSize - lastSample.usedHeapSize) / lastSample.totalHeapSize;
    
    let level = 'low';
    if (fragmentationRatio > 0.5) level = 'high';
    else if (fragmentationRatio > 0.3) level = 'medium';
    
    return {
      ratio: (fragmentationRatio * 100).toFixed(2) + '%',
      level,
      unusedHeapSpace: this.formatBytes(lastSample.totalHeapSize - lastSample.usedHeapSize)
    };
  }

  generateRecommendations(leakDetection, growthRates, efficiency) {
    const recommendations = [];

    if (leakDetection.hasMemoryLeak) {
      recommendations.push({
        priority: 'high',
        category: 'memory_leak',
        message: 'Potential memory leak detected. Investigate suspicious metrics and consider profiling.',
        actions: [
          'Use Node.js profiler to identify leak sources',
          'Check for unclosed resources (files, connections, timers)',
          'Review event listener cleanup',
          'Monitor object retention patterns'
        ]
      });
    }

    if (growthRates.heapUsed > 50 * 1024) { // 50KB/s
      recommendations.push({
        priority: 'medium',
        category: 'heap_growth',
        message: 'Heap memory growing consistently. Consider optimization.',
        actions: [
          'Review object lifecycle management',
          'Implement object pooling where appropriate',
          'Optimize data structures',
          'Consider memory-efficient alternatives'
        ]
      });
    }

    if (efficiency.heapUtilization && parseFloat(efficiency.heapUtilization) < 50) {
      recommendations.push({
        priority: 'low',
        category: 'heap_utilization',
        message: 'Low heap utilization. Consider tuning heap size.',
        actions: [
          'Review --max-old-space-size setting',
          'Monitor actual vs allocated memory',
          'Consider heap size optimization'
        ]
      });
    }

    if (efficiency.gcEfficiency === 'ineffective') {
      recommendations.push({
        priority: 'medium',
        category: 'gc_efficiency',
        message: 'Garbage collection appears ineffective.',
        actions: [
          'Review object references and closures',
          'Check for circular references',
          'Consider manual GC hints where appropriate'
        ]
      });
    }

    return recommendations;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getSamples() {
    return this.samples.map(sample => ({
      ...sample,
      timestamp: new Date(sample.timestamp).toISOString()
    }));
  }

  exportData() {
    return {
      config: this.config,
      samples: this.getSamples(),
      analysis: this.samples.length >= 2 ? this.analyzeLeaks() : { error: 'Insufficient data' }
    };
  }
}

module.exports = { MemoryLeakDetector };