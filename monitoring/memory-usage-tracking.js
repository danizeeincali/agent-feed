/**
 * Memory Usage Tracking System
 * 
 * Comprehensive memory monitoring for Claude AI instances:
 * - Per-instance memory tracking
 * - Memory leak detection
 * - Memory growth pattern analysis
 * - Memory pressure monitoring
 * - GC impact analysis
 * - Memory optimization recommendations
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');

class MemoryUsageTracker extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      samplingInterval: 1000, // 1 second
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      memoryThresholds: {
        warning: 50 * 1024 * 1024, // 50MB
        critical: 100 * 1024 * 1024, // 100MB
        leak: {
          growthRate: 0.05, // 5% growth per minute
          duration: 10 * 60 * 1000 // 10 minutes
        }
      },
      gcThresholds: {
        frequency: 5000, // GC more than once per 5 seconds is concerning
        duration: 100 // GC taking more than 100ms is concerning
      },
      metricsDir: config.metricsDir || './monitoring/memory-metrics',
      ...config
    };
    
    this.instances = new Map(); // instanceId -> memory data
    this.systemMemory = [];
    this.gcMetrics = [];
    this.alerts = [];
    this.isTracking = false;
    this.trackingInterval = null;
    
    // Memory baseline
    this.baseline = null;
    
    this.initializeTracker();
  }

  async initializeTracker() {
    try {
      await fs.mkdir(this.config.metricsDir, { recursive: true });
      
      // Establish memory baseline
      this.baseline = this.captureMemorySnapshot();
      
      // Set up GC monitoring if available
      this.setupGCMonitoring();
      
      console.log('Memory usage tracker initialized');
      
    } catch (error) {
      console.error('Failed to initialize memory tracker:', error);
      throw error;
    }
  }

  setupGCMonitoring() {
    // Monitor garbage collection if available
    if (global.gc && typeof global.gc === 'function') {
      const originalGC = global.gc;
      let gcStartTime;
      
      // Wrap gc function to track calls
      global.gc = (...args) => {
        gcStartTime = performance.now();
        const result = originalGC.apply(this, args);
        const gcDuration = performance.now() - gcStartTime;
        
        this.recordGCEvent({
          timestamp: Date.now(),
          duration: gcDuration,
          memoryBefore: this.captureMemorySnapshot(),
          memoryAfter: process.memoryUsage()
        });
        
        return result;
      };
    }
    
    // Monitor heap statistics if available
    if (process.memoryUsage.rss) {
      this.heapStatsAvailable = true;
    }
  }

  async startTracking() {
    if (this.isTracking) {
      console.log('Memory tracking already active');
      return;
    }
    
    this.isTracking = true;
    console.log('Starting memory usage tracking...');
    
    // Start periodic sampling
    this.trackingInterval = setInterval(() => {
      this.collectMemoryMetrics();
    }, this.config.samplingInterval);
    
    // Initial collection
    this.collectMemoryMetrics();
    
    this.emit('tracking_started');
  }

  async stopTracking() {
    if (!this.isTracking) return;
    
    this.isTracking = false;
    
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    
    // Final data persistence
    await this.persistMemoryData();
    
    console.log('Memory tracking stopped');
    this.emit('tracking_stopped');
  }

  // Track memory for a specific Claude instance
  trackInstance(instanceId, initialData = {}) {
    if (!this.instances.has(instanceId)) {
      const instanceTracker = {
        instanceId,
        createdAt: Date.now(),
        memoryHistory: [],
        currentMemory: null,
        peakMemory: { rss: 0, heapUsed: 0, heapTotal: 0, external: 0, arrayBuffers: 0 },
        memoryGrowth: {
          shortTerm: [], // Last 10 measurements
          longTerm: [], // Hourly averages
          growthRate: 0
        },
        leakDetection: {
          suspectedLeaks: [],
          lastLeakCheck: Date.now(),
          growthTrend: 'stable' // stable, growing, declining
        },
        operations: [], // Memory snapshots during operations
        gcImpact: [],
        alerts: [],
        metadata: { ...initialData }
      };
      
      this.instances.set(instanceId, instanceTracker);
      console.log(`Started tracking memory for instance: ${instanceId}`);
      
      this.emit('instance_tracking_started', { instanceId, tracker: instanceTracker });
    }
    
    return this.instances.get(instanceId);
  }

  // Stop tracking a specific instance
  stopInstanceTracking(instanceId) {
    const tracker = this.instances.get(instanceId);
    if (!tracker) {
      console.warn(`No memory tracker found for instance: ${instanceId}`);
      return null;
    }
    
    // Generate final report for instance
    const report = this.generateInstanceReport(instanceId);
    
    // Clean up
    this.instances.delete(instanceId);
    
    console.log(`Stopped tracking memory for instance: ${instanceId}`);
    this.emit('instance_tracking_stopped', { instanceId, report });
    
    return report;
  }

  // Record memory usage during a specific operation
  async trackOperation(instanceId, operationType, operation) {
    const tracker = this.instances.get(instanceId);
    if (!tracker) {
      console.warn(`No memory tracker for instance ${instanceId}`);
      return await operation();
    }
    
    // Memory before operation
    const memoryBefore = this.captureMemorySnapshot();
    const operationStart = performance.now();
    
    try {
      // Execute operation
      const result = await operation();
      
      // Memory after operation
      const memoryAfter = this.captureMemorySnapshot();
      const operationDuration = performance.now() - operationStart;
      
      // Calculate memory delta
      const memoryDelta = {
        rss: memoryAfter.rss - memoryBefore.rss,
        heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
        heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
        external: memoryAfter.external - memoryBefore.external,
        arrayBuffers: memoryAfter.arrayBuffers - memoryBefore.arrayBuffers
      };
      
      // Record operation memory impact
      const operationRecord = {
        operationType,
        timestamp: Date.now(),
        duration: operationDuration,
        memoryBefore,
        memoryAfter,
        memoryDelta,
        memoryEfficiency: this.calculateMemoryEfficiency(memoryDelta, operationDuration)
      };
      
      tracker.operations.push(operationRecord);
      
      // Update current memory
      tracker.currentMemory = memoryAfter;
      
      // Update peak memory
      this.updatePeakMemory(tracker, memoryAfter);
      
      // Check for memory issues
      this.checkMemoryThresholds(instanceId, memoryAfter);
      
      this.emit('operation_tracked', { instanceId, operation: operationRecord });
      
      return result;
      
    } catch (error) {
      // Record failed operation
      const memoryAfter = this.captureMemorySnapshot();
      const operationDuration = performance.now() - operationStart;
      
      tracker.operations.push({
        operationType,
        timestamp: Date.now(),
        duration: operationDuration,
        memoryBefore,
        memoryAfter,
        error: error.message,
        failed: true
      });
      
      throw error;
    }
  }

  // Collect system-wide memory metrics
  collectMemoryMetrics() {
    const timestamp = Date.now();
    const systemMemory = this.captureMemorySnapshot();
    
    // Store system memory
    this.systemMemory.push({ timestamp, ...systemMemory });
    
    // Clean old system memory data
    const cutoff = timestamp - this.config.retentionPeriod;
    this.systemMemory = this.systemMemory.filter(m => m.timestamp > cutoff);
    
    // Update all tracked instances
    for (const [instanceId, tracker] of this.instances) {
      this.updateInstanceMemory(instanceId, systemMemory, timestamp);
    }
  }

  updateInstanceMemory(instanceId, memoryData, timestamp) {
    const tracker = this.instances.get(instanceId);
    if (!tracker) return;
    
    // Add to memory history
    tracker.memoryHistory.push({ timestamp, ...memoryData });
    
    // Update current memory
    tracker.currentMemory = memoryData;
    
    // Update peak memory
    this.updatePeakMemory(tracker, memoryData);
    
    // Update memory growth tracking
    this.updateMemoryGrowth(tracker, memoryData, timestamp);
    
    // Clean old history
    const cutoff = timestamp - this.config.retentionPeriod;
    tracker.memoryHistory = tracker.memoryHistory.filter(m => m.timestamp > cutoff);
    
    // Check for memory issues
    this.checkMemoryThresholds(instanceId, memoryData);
    
    // Perform leak detection
    this.performLeakDetection(instanceId, timestamp);
  }

  updatePeakMemory(tracker, memoryData) {
    if (memoryData.rss > tracker.peakMemory.rss) tracker.peakMemory.rss = memoryData.rss;
    if (memoryData.heapUsed > tracker.peakMemory.heapUsed) tracker.peakMemory.heapUsed = memoryData.heapUsed;
    if (memoryData.heapTotal > tracker.peakMemory.heapTotal) tracker.peakMemory.heapTotal = memoryData.heapTotal;
    if (memoryData.external > tracker.peakMemory.external) tracker.peakMemory.external = memoryData.external;
    if (memoryData.arrayBuffers > tracker.peakMemory.arrayBuffers) tracker.peakMemory.arrayBuffers = memoryData.arrayBuffers;
  }

  updateMemoryGrowth(tracker, memoryData, timestamp) {
    // Update short-term growth (last 10 measurements)
    tracker.memoryGrowth.shortTerm.push({ timestamp, rss: memoryData.rss });
    if (tracker.memoryGrowth.shortTerm.length > 10) {
      tracker.memoryGrowth.shortTerm = tracker.memoryGrowth.shortTerm.slice(-10);
    }
    
    // Calculate growth rate if we have enough data
    if (tracker.memoryGrowth.shortTerm.length >= 3) {
      const oldest = tracker.memoryGrowth.shortTerm[0];
      const newest = tracker.memoryGrowth.shortTerm[tracker.memoryGrowth.shortTerm.length - 1];
      
      const timeDiff = newest.timestamp - oldest.timestamp;
      const memoryDiff = newest.rss - oldest.rss;
      
      if (timeDiff > 0) {
        tracker.memoryGrowth.growthRate = memoryDiff / timeDiff; // bytes per ms
      }
    }
    
    // Update long-term averages (hourly)
    const hourAgo = timestamp - (60 * 60 * 1000);
    const recentHistory = tracker.memoryHistory.filter(m => m.timestamp > hourAgo);
    
    if (recentHistory.length > 0) {
      const avgMemory = recentHistory.reduce((sum, m) => sum + m.rss, 0) / recentHistory.length;
      
      // Add hourly average if it's been an hour
      const lastLongTerm = tracker.memoryGrowth.longTerm[tracker.memoryGrowth.longTerm.length - 1];
      if (!lastLongTerm || timestamp - lastLongTerm.timestamp >= 60 * 60 * 1000) {
        tracker.memoryGrowth.longTerm.push({ timestamp, avgRss: avgMemory });
        
        // Keep only last 24 hours of long-term data
        if (tracker.memoryGrowth.longTerm.length > 24) {
          tracker.memoryGrowth.longTerm = tracker.memoryGrowth.longTerm.slice(-24);
        }
      }
    }
  }

  checkMemoryThresholds(instanceId, memoryData) {
    const tracker = this.instances.get(instanceId);
    if (!tracker) return;
    
    // Check warning threshold
    if (memoryData.rss > this.config.memoryThresholds.warning && 
        memoryData.rss <= this.config.memoryThresholds.critical) {
      
      const alert = {
        instanceId,
        timestamp: Date.now(),
        type: 'memory_warning',
        severity: 'WARNING',
        value: memoryData.rss,
        threshold: this.config.memoryThresholds.warning,
        message: `Memory usage warning for instance ${instanceId}: ${(memoryData.rss / 1024 / 1024).toFixed(2)}MB`
      };
      
      tracker.alerts.push(alert);
      this.alerts.push(alert);
      this.emit('memory_warning', alert);
    }
    
    // Check critical threshold
    if (memoryData.rss > this.config.memoryThresholds.critical) {
      const alert = {
        instanceId,
        timestamp: Date.now(),
        type: 'memory_critical',
        severity: 'CRITICAL',
        value: memoryData.rss,
        threshold: this.config.memoryThresholds.critical,
        message: `Memory usage critical for instance ${instanceId}: ${(memoryData.rss / 1024 / 1024).toFixed(2)}MB`
      };
      
      tracker.alerts.push(alert);
      this.alerts.push(alert);
      this.emit('memory_critical', alert);
    }
  }

  performLeakDetection(instanceId, timestamp) {
    const tracker = this.instances.get(instanceId);
    if (!tracker || tracker.memoryHistory.length < 10) return;
    
    // Only check for leaks every 5 minutes
    if (timestamp - tracker.leakDetection.lastLeakCheck < 5 * 60 * 1000) return;
    
    tracker.leakDetection.lastLeakCheck = timestamp;
    
    // Analyze memory growth pattern
    const recentHistory = tracker.memoryHistory.slice(-20); // Last 20 measurements
    const oldHistory = tracker.memoryHistory.slice(-40, -20); // Previous 20 measurements
    
    if (recentHistory.length < 10 || oldHistory.length < 10) return;
    
    const recentAvg = recentHistory.reduce((sum, m) => sum + m.rss, 0) / recentHistory.length;
    const oldAvg = oldHistory.reduce((sum, m) => sum + m.rss, 0) / oldHistory.length;
    
    const growthRate = (recentAvg - oldAvg) / oldAvg;
    const timeDiff = recentHistory[recentHistory.length - 1].timestamp - oldHistory[0].timestamp;
    
    // Update growth trend
    if (growthRate > 0.02) { // 2% growth
      tracker.leakDetection.growthTrend = 'growing';
    } else if (growthRate < -0.02) {
      tracker.leakDetection.growthTrend = 'declining';
    } else {
      tracker.leakDetection.growthTrend = 'stable';
    }
    
    // Check for potential leak
    if (growthRate > this.config.memoryThresholds.leak.growthRate && 
        timeDiff > this.config.memoryThresholds.leak.duration) {
      
      const leak = {
        instanceId,
        timestamp,
        type: 'potential_memory_leak',
        growthRate: growthRate * 100, // as percentage
        timePeriod: timeDiff,
        memoryGrowth: recentAvg - oldAvg,
        confidence: this.calculateLeakConfidence(growthRate, timeDiff, tracker)
      };
      
      tracker.leakDetection.suspectedLeaks.push(leak);
      
      const alert = {
        instanceId,
        timestamp,
        type: 'memory_leak',
        severity: leak.confidence > 0.8 ? 'CRITICAL' : 'WARNING',
        leak,
        message: `Potential memory leak detected for instance ${instanceId}: ${(growthRate * 100).toFixed(2)}% growth over ${(timeDiff / 1000 / 60).toFixed(1)} minutes`
      };
      
      tracker.alerts.push(alert);
      this.alerts.push(alert);
      this.emit('memory_leak_detected', alert);
    }
  }

  calculateLeakConfidence(growthRate, timePeriod, tracker) {
    let confidence = 0;
    
    // Higher growth rate increases confidence
    confidence += Math.min(growthRate * 10, 0.4); // Max 0.4 from growth rate
    
    // Longer time period increases confidence
    confidence += Math.min(timePeriod / (60 * 60 * 1000), 0.3); // Max 0.3 from time period
    
    // Consistent growth pattern increases confidence
    const consistentGrowth = tracker.memoryGrowth.longTerm.filter(lt => {
      const next = tracker.memoryGrowth.longTerm[tracker.memoryGrowth.longTerm.indexOf(lt) + 1];
      return next && next.avgRss > lt.avgRss;
    }).length;
    
    confidence += Math.min(consistentGrowth / tracker.memoryGrowth.longTerm.length, 0.3); // Max 0.3 from consistency
    
    return Math.min(confidence, 1.0);
  }

  recordGCEvent(gcData) {
    this.gcMetrics.push(gcData);
    
    // Clean old GC data
    const cutoff = Date.now() - this.config.retentionPeriod;
    this.gcMetrics = this.gcMetrics.filter(gc => gc.timestamp > cutoff);
    
    // Check GC thresholds
    if (gcData.duration > this.config.gcThresholds.duration) {
      const alert = {
        timestamp: Date.now(),
        type: 'gc_duration',
        severity: 'WARNING',
        duration: gcData.duration,
        threshold: this.config.gcThresholds.duration,
        message: `Long garbage collection detected: ${gcData.duration.toFixed(2)}ms`
      };
      
      this.alerts.push(alert);
      this.emit('gc_warning', alert);
    }
  }

  calculateMemoryEfficiency(memoryDelta, duration) {
    // Memory efficiency metric: bytes per millisecond
    const totalMemoryChange = Math.abs(memoryDelta.rss) + Math.abs(memoryDelta.heapUsed);
    return duration > 0 ? totalMemoryChange / duration : 0;
  }

  captureMemorySnapshot() {
    const memUsage = process.memoryUsage();
    
    return {
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      timestamp: Date.now()
    };
  }

  generateInstanceReport(instanceId) {
    const tracker = this.instances.get(instanceId);
    if (!tracker) return null;
    
    const currentTime = Date.now();
    const instanceAge = currentTime - tracker.createdAt;
    
    const report = {
      instanceId,
      generatedAt: currentTime,
      instanceAge,
      summary: {
        currentMemory: tracker.currentMemory,
        peakMemory: tracker.peakMemory,
        memoryGrowthRate: tracker.memoryGrowth.growthRate,
        totalOperations: tracker.operations.length,
        totalAlerts: tracker.alerts.length,
        suspectedLeaks: tracker.leakDetection.suspectedLeaks.length
      },
      memoryTrend: tracker.leakDetection.growthTrend,
      operationAnalysis: this.analyzeOperations(tracker.operations),
      recommendations: this.generateMemoryRecommendations(tracker),
      rawData: {
        memoryHistorySize: tracker.memoryHistory.length,
        operationsCount: tracker.operations.length,
        alertsCount: tracker.alerts.length
      }
    };
    
    return report;
  }

  analyzeOperations(operations) {
    if (operations.length === 0) return null;
    
    const successful = operations.filter(op => !op.failed);
    const failed = operations.filter(op => op.failed);
    
    const memoryImpactByType = {};
    
    successful.forEach(op => {
      if (!memoryImpactByType[op.operationType]) {
        memoryImpactByType[op.operationType] = {
          count: 0,
          totalMemoryDelta: 0,
          avgMemoryDelta: 0,
          maxMemoryDelta: 0,
          minMemoryDelta: Infinity
        };
      }
      
      const type = memoryImpactByType[op.operationType];
      const memoryDelta = op.memoryDelta.rss;
      
      type.count++;
      type.totalMemoryDelta += memoryDelta;
      type.avgMemoryDelta = type.totalMemoryDelta / type.count;
      
      if (memoryDelta > type.maxMemoryDelta) type.maxMemoryDelta = memoryDelta;
      if (memoryDelta < type.minMemoryDelta) type.minMemoryDelta = memoryDelta;
    });
    
    return {
      totalOperations: operations.length,
      successfulOperations: successful.length,
      failedOperations: failed.length,
      successRate: successful.length / operations.length,
      memoryImpactByType,
      highestMemoryOperation: successful.reduce((max, op) => 
        op.memoryDelta.rss > (max?.memoryDelta.rss || 0) ? op : max, null)
    };
  }

  generateMemoryRecommendations(tracker) {
    const recommendations = [];
    
    // High memory usage recommendation
    if (tracker.currentMemory && tracker.currentMemory.rss > this.config.memoryThresholds.warning) {
      recommendations.push({
        type: 'high_memory_usage',
        priority: 'HIGH',
        description: 'Instance is using significant memory',
        suggestion: 'Consider implementing memory optimization strategies or reducing data retention'
      });
    }
    
    // Memory leak recommendation
    if (tracker.leakDetection.suspectedLeaks.length > 0) {
      recommendations.push({
        type: 'memory_leak',
        priority: 'CRITICAL',
        description: 'Potential memory leaks detected',
        suggestion: 'Review code for unreleased resources, event listeners, or accumulating data structures'
      });
    }
    
    // GC pressure recommendation
    if (tracker.gcImpact.length > 10) {
      const avgGCDuration = tracker.gcImpact.reduce((sum, gc) => sum + gc.duration, 0) / tracker.gcImpact.length;
      if (avgGCDuration > 50) {
        recommendations.push({
          type: 'gc_pressure',
          priority: 'MEDIUM',
          description: 'High garbage collection pressure detected',
          suggestion: 'Consider reducing object allocation or implementing object pooling'
        });
      }
    }
    
    // Memory growth recommendation
    if (tracker.memoryGrowth.growthRate > 1024) { // 1KB per ms growth
      recommendations.push({
        type: 'memory_growth',
        priority: 'MEDIUM',
        description: 'Rapid memory growth detected',
        suggestion: 'Monitor data accumulation and implement periodic cleanup'
      });
    }
    
    return recommendations;
  }

  async persistMemoryData() {
    try {
      const timestamp = new Date().toISOString();
      const data = {
        timestamp,
        systemMemory: this.systemMemory.slice(-100), // Last 100 system measurements
        instances: {},
        gcMetrics: this.gcMetrics.slice(-50), // Last 50 GC events
        alerts: this.alerts.slice(-100), // Last 100 alerts
        summary: this.getMemorySummary()
      };
      
      // Include instance data
      for (const [instanceId, tracker] of this.instances) {
        data.instances[instanceId] = {
          createdAt: tracker.createdAt,
          currentMemory: tracker.currentMemory,
          peakMemory: tracker.peakMemory,
          memoryHistorySize: tracker.memoryHistory.length,
          operationsCount: tracker.operations.length,
          alertsCount: tracker.alerts.length,
          growthTrend: tracker.leakDetection.growthTrend,
          suspectedLeaks: tracker.leakDetection.suspectedLeaks.length
        };
      }
      
      const filename = path.join(this.config.metricsDir, `memory-usage-${timestamp.split('T')[0]}.json`);
      await fs.writeFile(filename, JSON.stringify(data, null, 2));
      
      console.log(`Memory data persisted to ${filename}`);
      
    } catch (error) {
      console.error('Failed to persist memory data:', error);
    }
  }

  getMemorySummary() {
    const summary = {
      timestamp: Date.now(),
      tracking: this.isTracking,
      trackedInstances: this.instances.size,
      totalAlerts: this.alerts.length,
      systemMemory: this.systemMemory.length > 0 ? this.systemMemory[this.systemMemory.length - 1] : null,
      instances: {}
    };
    
    // Instance summaries
    for (const [instanceId, tracker] of this.instances) {
      summary.instances[instanceId] = {
        currentRSS: tracker.currentMemory ? Math.round(tracker.currentMemory.rss / 1024 / 1024 * 100) / 100 : 0, // MB
        peakRSS: Math.round(tracker.peakMemory.rss / 1024 / 1024 * 100) / 100, // MB
        growthRate: Math.round(tracker.memoryGrowth.growthRate * 1000 * 100) / 100, // bytes per second
        operations: tracker.operations.length,
        alerts: tracker.alerts.length,
        trend: tracker.leakDetection.growthTrend,
        leaks: tracker.leakDetection.suspectedLeaks.length
      };
    }
    
    return summary;
  }
}

module.exports = MemoryUsageTracker;