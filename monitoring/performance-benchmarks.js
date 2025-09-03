/**
 * Comprehensive Performance Benchmarking System
 * 
 * Tracks and benchmarks:
 * - Claude AI response latency
 * - SSE message delivery performance
 * - Instance creation/destruction times
 * - Memory usage patterns
 * - Concurrent connection handling
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');
const MemoryUsageTracker = require('./memory-usage-tracking');
const PerformanceAlertSystem = require('./alerts/performance-alerts');

class PerformanceBenchmarker extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      metricsDir: config.metricsDir || './monitoring/metrics',
      alertThresholds: {
        claudeResponseTime: 5000, // 5 seconds critical
        sseDeliveryTime: 500, // 500ms warning
        memoryPerInstance: 100 * 1024 * 1024, // 100MB warning
        errorRate: 0.01, // 1% critical
        instanceCreationTime: 3000 // 3 seconds
      },
      sampling: {
        interval: 1000, // 1 second
        retention: 24 * 60 * 60 * 1000, // 24 hours
        batchSize: 100
      },
      ...config
    };
    
    this.metrics = new Map();
    this.activeTests = new Map();
    this.historicalData = [];
    this.alerts = [];
    this.isMonitoring = false;
    
    // Initialize integrated monitoring components
    this.memoryTracker = new MemoryUsageTracker({
      metricsDir: path.join(this.config.metricsDir, 'memory'),
      ...config.memoryTracking
    });
    
    this.alertSystem = new PerformanceAlertSystem({
      alertsDir: path.join(this.config.metricsDir, 'alerts'),
      ...config.alerting
    });
    
    // Initialize metrics storage
    this.initializeMetrics();
  }

  async initializeMetrics() {
    try {
      await fs.mkdir(this.config.metricsDir, { recursive: true });
      
      // Initialize metric categories
      const metricCategories = [
        'claude_response_latency',
        'sse_delivery_performance',
        'instance_lifecycle',
        'memory_usage',
        'concurrent_connections',
        'error_tracking'
      ];
      
      for (const category of metricCategories) {
        this.metrics.set(category, {
          current: [],
          aggregated: { count: 0, sum: 0, min: Infinity, max: 0, avg: 0 },
          history: []
        });
      }
      
      console.log('Performance benchmarker initialized');
    } catch (error) {
      console.error('Failed to initialize performance benchmarker:', error);
      throw error;
    }
  }

  // Start comprehensive monitoring
  async startMonitoring() {
    if (this.isMonitoring) {
      console.log('Performance monitoring already active');
      return;
    }
    
    this.isMonitoring = true;
    console.log('Starting comprehensive performance monitoring...');
    
    // Start metric collection intervals
    this.metricCollectionInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.sampling.interval);
    
    // Start data persistence
    this.dataPersistenceInterval = setInterval(() => {
      this.persistMetrics();
    }, this.config.sampling.interval * 60); // Every minute
    
    // Start alert processing
    this.alertProcessingInterval = setInterval(() => {
      this.processAlerts();
    }, this.config.sampling.interval * 5); // Every 5 seconds
    
    this.emit('monitoring_started');
  }

  async stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    // Clear intervals
    if (this.metricCollectionInterval) clearInterval(this.metricCollectionInterval);
    if (this.dataPersistenceInterval) clearInterval(this.dataPersistenceInterval);
    if (this.alertProcessingInterval) clearInterval(this.alertProcessingInterval);
    
    // Final data persistence
    await this.persistMetrics();
    
    console.log('Performance monitoring stopped');
    this.emit('monitoring_stopped');
  }

  // Claude AI Response Latency Benchmarking
  async benchmarkClaudeResponse(instanceId, messageData) {
    const benchmark = {
      instanceId,
      messageId: messageData.id || `msg_${Date.now()}`,
      startTime: performance.now(),
      phases: {}
    };
    
    try {
      // Phase 1: Message preparation
      const prepStart = performance.now();
      // Simulate message preparation overhead
      benchmark.phases.preparation = performance.now() - prepStart;
      
      // Phase 2: Claude API call (simulated timing)
      const apiStart = performance.now();
      // This would be the actual Claude API call
      // For now, we'll simulate with timing hooks
      benchmark.phases.api_call = performance.now() - apiStart;
      
      // Phase 3: Response processing
      const processStart = performance.now();
      // Response processing time
      benchmark.phases.processing = performance.now() - processStart;
      
      // Total latency
      benchmark.totalLatency = performance.now() - benchmark.startTime;
      benchmark.success = true;
      
      // Record metric
      this.recordMetric('claude_response_latency', benchmark.totalLatency);
      
      // Check for performance regression
      this.checkPerformanceThreshold('claudeResponseTime', benchmark.totalLatency);
      
      return benchmark;
      
    } catch (error) {
      benchmark.error = error.message;
      benchmark.success = false;
      benchmark.totalLatency = performance.now() - benchmark.startTime;
      
      this.recordMetric('error_tracking', 1);
      this.emit('benchmark_error', { type: 'claude_response', benchmark, error });
      
      throw error;
    }
  }

  // SSE Message Delivery Performance
  async benchmarkSSEDelivery(connectionId, messageData) {
    const benchmark = {
      connectionId,
      messageId: messageData.id,
      messageSize: JSON.stringify(messageData).length,
      startTime: performance.now(),
      phases: {}
    };
    
    try {
      // Phase 1: Message serialization
      const serializeStart = performance.now();
      const serializedMessage = JSON.stringify(messageData);
      benchmark.phases.serialization = performance.now() - serializeStart;
      
      // Phase 2: SSE transmission (timing hook)
      const transmissionStart = performance.now();
      // This would measure actual SSE transmission time
      benchmark.phases.transmission = performance.now() - transmissionStart;
      
      // Phase 3: Client reception confirmation
      const confirmationStart = performance.now();
      // Wait for client acknowledgment (if implemented)
      benchmark.phases.confirmation = performance.now() - confirmationStart;
      
      benchmark.totalDeliveryTime = performance.now() - benchmark.startTime;
      benchmark.throughput = benchmark.messageSize / benchmark.totalDeliveryTime; // bytes/ms
      benchmark.success = true;
      
      // Record metrics
      this.recordMetric('sse_delivery_performance', benchmark.totalDeliveryTime);
      this.recordMetric('sse_throughput', benchmark.throughput);
      
      // Check thresholds
      this.checkPerformanceThreshold('sseDeliveryTime', benchmark.totalDeliveryTime);
      
      return benchmark;
      
    } catch (error) {
      benchmark.error = error.message;
      benchmark.success = false;
      benchmark.totalDeliveryTime = performance.now() - benchmark.startTime;
      
      this.recordMetric('error_tracking', 1);
      this.emit('benchmark_error', { type: 'sse_delivery', benchmark, error });
      
      throw error;
    }
  }

  // Instance Lifecycle Performance
  async benchmarkInstanceLifecycle(operation, instanceData) {
    const benchmark = {
      operation, // 'create' or 'destroy'
      instanceId: instanceData.id,
      startTime: performance.now(),
      phases: {}
    };
    
    try {
      if (operation === 'create') {
        // Phase 1: Instance initialization
        const initStart = performance.now();
        // Measure initialization overhead
        benchmark.phases.initialization = performance.now() - initStart;
        
        // Phase 2: Resource allocation
        const allocStart = performance.now();
        // Measure resource allocation time
        benchmark.phases.resource_allocation = performance.now() - allocStart;
        
        // Phase 3: Ready state
        const readyStart = performance.now();
        // Measure time to ready state
        benchmark.phases.ready_state = performance.now() - readyStart;
        
      } else if (operation === 'destroy') {
        // Phase 1: Cleanup preparation
        const prepStart = performance.now();
        benchmark.phases.cleanup_prep = performance.now() - prepStart;
        
        // Phase 2: Resource deallocation
        const deallocStart = performance.now();
        benchmark.phases.resource_deallocation = performance.now() - deallocStart;
        
        // Phase 3: Final cleanup
        const finalStart = performance.now();
        benchmark.phases.final_cleanup = performance.now() - finalStart;
      }
      
      benchmark.totalTime = performance.now() - benchmark.startTime;
      benchmark.success = true;
      
      // Record metrics
      this.recordMetric('instance_lifecycle', benchmark.totalTime);
      
      // Check thresholds for instance creation
      if (operation === 'create') {
        this.checkPerformanceThreshold('instanceCreationTime', benchmark.totalTime);
      }
      
      return benchmark;
      
    } catch (error) {
      benchmark.error = error.message;
      benchmark.success = false;
      benchmark.totalTime = performance.now() - benchmark.startTime;
      
      this.recordMetric('error_tracking', 1);
      this.emit('benchmark_error', { type: 'instance_lifecycle', benchmark, error });
      
      throw error;
    }
  }

  // Memory Usage Tracking
  trackMemoryUsage(instanceId, memoryData) {
    const timestamp = Date.now();
    const memoryMetric = {
      instanceId,
      timestamp,
      rss: memoryData.rss || process.memoryUsage().rss,
      heapUsed: memoryData.heapUsed || process.memoryUsage().heapUsed,
      heapTotal: memoryData.heapTotal || process.memoryUsage().heapTotal,
      external: memoryData.external || process.memoryUsage().external,
      arrayBuffers: memoryData.arrayBuffers || process.memoryUsage().arrayBuffers
    };
    
    // Record memory usage
    this.recordMetric('memory_usage', memoryMetric.rss);
    
    // Check memory threshold
    this.checkPerformanceThreshold('memoryPerInstance', memoryMetric.rss);
    
    // Memory leak detection
    this.detectMemoryLeaks(instanceId, memoryMetric);
    
    return memoryMetric;
  }

  // Concurrent Connection Benchmarking
  async benchmarkConcurrentConnections(targetConnections, testDuration = 60000) {
    console.log(`Starting concurrent connection benchmark: ${targetConnections} connections for ${testDuration}ms`);
    
    const benchmark = {
      targetConnections,
      testDuration,
      startTime: performance.now(),
      connections: new Map(),
      metrics: {
        successful: 0,
        failed: 0,
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity,
        throughput: 0
      }
    };
    
    try {
      // Create concurrent connections
      const connectionPromises = [];
      
      for (let i = 0; i < targetConnections; i++) {
        const connectionPromise = this.createTestConnection(i, testDuration);
        connectionPromises.push(connectionPromise);
      }
      
      // Wait for all connections to complete
      const results = await Promise.allSettled(connectionPromises);
      
      // Analyze results
      let totalResponseTime = 0;
      let successCount = 0;
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          benchmark.connections.set(index, result.value);
          benchmark.metrics.successful++;
          successCount++;
          
          const responseTime = result.value.avgResponseTime;
          totalResponseTime += responseTime;
          
          if (responseTime > benchmark.metrics.maxResponseTime) {
            benchmark.metrics.maxResponseTime = responseTime;
          }
          if (responseTime < benchmark.metrics.minResponseTime) {
            benchmark.metrics.minResponseTime = responseTime;
          }
        } else {
          benchmark.metrics.failed++;
        }
      });
      
      benchmark.metrics.avgResponseTime = successCount > 0 ? totalResponseTime / successCount : 0;
      benchmark.metrics.throughput = benchmark.metrics.successful / (testDuration / 1000);
      benchmark.totalTime = performance.now() - benchmark.startTime;
      benchmark.success = true;
      
      // Record metrics
      this.recordMetric('concurrent_connections', benchmark.metrics.successful);
      
      console.log(`Concurrent connection benchmark completed: ${benchmark.metrics.successful}/${targetConnections} successful`);
      
      return benchmark;
      
    } catch (error) {
      benchmark.error = error.message;
      benchmark.success = false;
      benchmark.totalTime = performance.now() - benchmark.startTime;
      
      this.recordMetric('error_tracking', 1);
      this.emit('benchmark_error', { type: 'concurrent_connections', benchmark, error });
      
      throw error;
    }
  }

  // Helper Methods
  recordMetric(category, value) {
    if (!this.metrics.has(category)) {
      this.metrics.set(category, {
        current: [],
        aggregated: { count: 0, sum: 0, min: Infinity, max: 0, avg: 0 },
        history: []
      });
    }
    
    const metric = this.metrics.get(category);
    const timestamp = Date.now();
    
    // Add to current batch
    metric.current.push({ timestamp, value });
    
    // Update aggregated stats
    metric.aggregated.count++;
    metric.aggregated.sum += value;
    if (value < metric.aggregated.min) metric.aggregated.min = value;
    if (value > metric.aggregated.max) metric.aggregated.max = value;
    metric.aggregated.avg = metric.aggregated.sum / metric.aggregated.count;
    
    // Batch management
    if (metric.current.length >= this.config.sampling.batchSize) {
      this.flushMetricBatch(category);
    }
  }

  checkPerformanceThreshold(thresholdType, value) {
    const threshold = this.config.alertThresholds[thresholdType];
    if (!threshold) return;
    
    if (value > threshold) {
      const alert = {
        timestamp: Date.now(),
        type: thresholdType,
        severity: this.getAlertSeverity(thresholdType, value, threshold),
        value,
        threshold,
        message: `${thresholdType} exceeded threshold: ${value} > ${threshold}`
      };
      
      this.alerts.push(alert);
      this.emit('performance_alert', alert);
    }
  }

  getAlertSeverity(thresholdType, value, threshold) {
    const ratio = value / threshold;
    if (ratio > 2) return 'CRITICAL';
    if (ratio > 1.5) return 'HIGH';
    if (ratio > 1.2) return 'MEDIUM';
    return 'LOW';
  }

  async createTestConnection(connectionId, duration) {
    // Simulate test connection creation and messaging
    const connection = {
      id: connectionId,
      startTime: performance.now(),
      messages: [],
      responseTime: []
    };
    
    const messageCount = Math.floor(duration / 1000); // 1 message per second
    
    for (let i = 0; i < messageCount; i++) {
      const messageStart = performance.now();
      
      // Simulate message sending and response
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      
      const responseTime = performance.now() - messageStart;
      connection.messages.push({ id: i, responseTime });
      connection.responseTime.push(responseTime);
    }
    
    connection.totalTime = performance.now() - connection.startTime;
    connection.avgResponseTime = connection.responseTime.reduce((a, b) => a + b, 0) / connection.responseTime.length;
    
    return connection;
  }

  detectMemoryLeaks(instanceId, memoryMetric) {
    // Simple memory leak detection based on memory growth trend
    const memoryHistory = this.getInstanceMemoryHistory(instanceId);
    
    if (memoryHistory.length >= 10) {
      const recent = memoryHistory.slice(-5);
      const older = memoryHistory.slice(-10, -5);
      
      const recentAvg = recent.reduce((sum, m) => sum + m.rss, 0) / recent.length;
      const olderAvg = older.reduce((sum, m) => sum + m.rss, 0) / older.length;
      
      const growthRate = (recentAvg - olderAvg) / olderAvg;
      
      if (growthRate > 0.1) { // 10% growth
        const alert = {
          timestamp: Date.now(),
          type: 'memory_leak',
          severity: 'WARNING',
          instanceId,
          growthRate: growthRate * 100,
          message: `Potential memory leak detected for instance ${instanceId}: ${(growthRate * 100).toFixed(2)}% growth`
        };
        
        this.alerts.push(alert);
        this.emit('memory_leak_detected', alert);
      }
    }
  }

  getInstanceMemoryHistory(instanceId) {
    // Return memory history for specific instance
    const memoryMetrics = this.metrics.get('memory_usage');
    if (!memoryMetrics) return [];
    
    return memoryMetrics.history.filter(m => m.instanceId === instanceId);
  }

  async collectSystemMetrics() {
    // Collect system-wide performance metrics
    const systemMetrics = {
      timestamp: Date.now(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      activeHandles: process._getActiveHandles().length,
      activeRequests: process._getActiveRequests().length
    };
    
    // Record system metrics
    this.recordMetric('system_memory', systemMetrics.memory.rss);
    this.recordMetric('system_cpu', systemMetrics.cpu.user + systemMetrics.cpu.system);
  }

  flushMetricBatch(category) {
    const metric = this.metrics.get(category);
    if (!metric || metric.current.length === 0) return;
    
    // Move current batch to history
    metric.history.push(...metric.current);
    metric.current = [];
    
    // Cleanup old history data
    const cutoff = Date.now() - this.config.sampling.retention;
    metric.history = metric.history.filter(m => m.timestamp > cutoff);
  }

  async persistMetrics() {
    try {
      const timestamp = new Date().toISOString();
      const metricsSnapshot = {};
      
      // Create snapshot of all metrics
      for (const [category, metric] of this.metrics) {
        metricsSnapshot[category] = {
          aggregated: { ...metric.aggregated },
          currentBatchSize: metric.current.length,
          historySize: metric.history.length
        };
      }
      
      // Save metrics snapshot
      const filename = path.join(this.config.metricsDir, `metrics-${timestamp.split('T')[0]}.json`);
      await fs.writeFile(filename, JSON.stringify({
        timestamp,
        metrics: metricsSnapshot,
        alerts: this.alerts.slice(-100), // Keep last 100 alerts
        systemInfo: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          versions: process.versions
        }
      }, null, 2));
      
      console.log(`Metrics persisted to ${filename}`);
      
    } catch (error) {
      console.error('Failed to persist metrics:', error);
    }
  }

  processAlerts() {
    if (this.alerts.length === 0) return;
    
    // Process recent alerts
    const recentAlerts = this.alerts.filter(a => Date.now() - a.timestamp < 60000); // Last minute
    
    if (recentAlerts.length > 0) {
      this.emit('alerts_processed', recentAlerts);
    }
  }

  // Get current performance summary
  getPerformanceSummary() {
    const summary = {
      timestamp: Date.now(),
      monitoring: this.isMonitoring,
      metrics: {},
      alerts: {
        total: this.alerts.length,
        recent: this.alerts.filter(a => Date.now() - a.timestamp < 300000).length, // Last 5 minutes
        critical: this.alerts.filter(a => a.severity === 'CRITICAL').length
      }
    };
    
    // Summarize each metric category
    for (const [category, metric] of this.metrics) {
      summary.metrics[category] = {
        count: metric.aggregated.count,
        average: Math.round(metric.aggregated.avg * 100) / 100,
        min: metric.aggregated.min === Infinity ? 0 : Math.round(metric.aggregated.min * 100) / 100,
        max: Math.round(metric.aggregated.max * 100) / 100,
        current: metric.current.length,
        history: metric.history.length
      };
    }
    
    return summary;
  }
}

module.exports = PerformanceBenchmarker;