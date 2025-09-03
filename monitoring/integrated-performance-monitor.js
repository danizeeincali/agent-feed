/**
 * Integrated Performance Monitor for Claude AI System
 * 
 * Complete monitoring solution that integrates:
 * - Performance benchmarking
 * - Memory tracking
 * - Alert system
 * - Real-time metrics
 * - Dashboard data
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const PerformanceBenchmarker = require('./performance-benchmarks');
const MemoryUsageTracker = require('./memory-usage-tracking');
const PerformanceAlertSystem = require('./alerts/performance-alerts');

class IntegratedPerformanceMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      metricsDir: './monitoring/metrics',
      enableDashboard: true,
      dashboardPort: 3002,
      realTimeUpdateInterval: 1000,
      reportingInterval: 60000, // 1 minute
      ...config
    };
    
    // Initialize all monitoring components
    this.benchmarker = new PerformanceBenchmarker({
      metricsDir: this.config.metricsDir,
      ...config.benchmarking
    });
    
    this.memoryTracker = new MemoryUsageTracker({
      metricsDir: path.join(this.config.metricsDir, 'memory'),
      ...config.memoryTracking
    });
    
    this.alertSystem = new PerformanceAlertSystem({
      alertsDir: path.join(this.config.metricsDir, 'alerts'),
      ...config.alerting
    });
    
    // Real-time monitoring state
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.reportingInterval = null;
    
    // Performance baselines
    this.baselines = new Map();
    
    // Dashboard server
    this.dashboardServer = null;
    
    this.initializeMonitor();
  }

  async initializeMonitor() {
    try {
      // Create metrics directory structure
      await fs.mkdir(this.config.metricsDir, { recursive: true });
      await fs.mkdir(path.join(this.config.metricsDir, 'dashboards'), { recursive: true });
      await fs.mkdir(path.join(this.config.metricsDir, 'reports'), { recursive: true });
      
      // Initialize components
      await this.benchmarker.initializeMetrics();
      await this.memoryTracker.initializeTracker();
      await this.alertSystem.initializeAlerting();
      
      // Setup event forwarding
      this.setupEventForwarding();
      
      console.log('Integrated Performance Monitor initialized');
      
    } catch (error) {
      console.error('Failed to initialize integrated monitor:', error);
      throw error;
    }
  }

  setupEventForwarding() {
    // Forward important events from sub-components
    this.benchmarker.on('performance_alert', (alert) => {
      this.emit('performance_alert', alert);
    });
    
    this.memoryTracker.on('memory_leak_detected', (alert) => {
      this.emit('memory_leak_detected', alert);
    });
    
    this.alertSystem.on('alert_triggered', (alert) => {
      this.emit('alert_triggered', alert);
    });
    
    this.memoryTracker.on('memory_critical', (alert) => {
      this.emit('memory_critical', alert);
    });
  }

  // Start comprehensive monitoring
  async startMonitoring() {
    if (this.isMonitoring) {
      console.log('Integrated monitoring already active');
      return;
    }
    
    this.isMonitoring = true;
    console.log('Starting integrated performance monitoring...');
    
    // Start all monitoring components
    await this.benchmarker.startMonitoring();
    await this.memoryTracker.startTracking();
    this.alertSystem.startMonitoring();
    
    // Start real-time monitoring loop
    this.monitoringInterval = setInterval(() => {
      this.collectRealTimeMetrics();
    }, this.config.realTimeUpdateInterval);
    
    // Start periodic reporting
    this.reportingInterval = setInterval(() => {
      this.generatePeriodicReport();
    }, this.config.reportingInterval);
    
    // Start dashboard if enabled
    if (this.config.enableDashboard) {
      await this.startDashboardServer();
    }
    
    this.emit('monitoring_started');
    console.log('Integrated performance monitoring started');
  }

  async stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    console.log('Stopping integrated performance monitoring...');
    
    // Stop all monitoring components
    await this.benchmarker.stopMonitoring();
    await this.memoryTracker.stopTracking();
    this.alertSystem.stopMonitoring();
    
    // Stop intervals
    if (this.monitoringInterval) clearInterval(this.monitoringInterval);
    if (this.reportingInterval) clearInterval(this.reportingInterval);
    
    // Stop dashboard
    if (this.dashboardServer) {
      this.dashboardServer.close();
      this.dashboardServer = null;
    }
    
    // Generate final report
    await this.generateFinalReport();
    
    this.emit('monitoring_stopped');
    console.log('Integrated performance monitoring stopped');
  }

  // Claude AI response monitoring with full integration
  async monitorClaudeResponse(instanceId, messageData) {
    const monitoringStart = Date.now();
    
    try {
      // Start instance memory tracking if not already tracked
      if (!this.memoryTracker.instances.has(instanceId)) {
        this.memoryTracker.trackInstance(instanceId, {
          type: 'claude_instance',
          messageType: messageData.type,
          createdAt: Date.now()
        });
      }
      
      // Benchmark the Claude response with memory tracking
      const benchmark = await this.memoryTracker.trackOperation(
        instanceId,
        'claude_response',
        async () => {
          return await this.benchmarker.benchmarkClaudeResponse(instanceId, messageData);
        }
      );
      
      // Check alert thresholds
      this.alertSystem.checkMetric('claudeResponseTime', benchmark.totalLatency);
      
      // Update baselines
      this.updateBaseline('claude_response_latency', benchmark.totalLatency);
      
      // Emit monitoring event
      this.emit('claude_response_monitored', {
        instanceId,
        benchmark,
        monitoringDuration: Date.now() - monitoringStart
      });
      
      return benchmark;
      
    } catch (error) {
      // Handle errors with alerting
      this.alertSystem.checkMetric('errorRate', 1);
      this.emit('claude_response_error', {
        instanceId,
        error: error.message,
        messageData
      });
      
      throw error;
    }
  }

  // SSE delivery monitoring
  async monitorSSEDelivery(connectionId, messageData) {
    const monitoringStart = Date.now();
    
    try {
      const benchmark = await this.benchmarker.benchmarkSSEDelivery(connectionId, messageData);
      
      // Check alert thresholds
      this.alertSystem.checkMetric('sseDeliveryTime', benchmark.totalDeliveryTime);
      
      // Update baselines
      this.updateBaseline('sse_delivery_time', benchmark.totalDeliveryTime);
      
      this.emit('sse_delivery_monitored', {
        connectionId,
        benchmark,
        monitoringDuration: Date.now() - monitoringStart
      });
      
      return benchmark;
      
    } catch (error) {
      this.alertSystem.checkMetric('errorRate', 1);
      this.emit('sse_delivery_error', {
        connectionId,
        error: error.message,
        messageData
      });
      
      throw error;
    }
  }

  // Instance lifecycle monitoring
  async monitorInstanceLifecycle(operation, instanceData) {
    const monitoringStart = Date.now();
    
    try {
      let benchmark;
      
      if (operation === 'create') {
        // Start memory tracking for new instance
        this.memoryTracker.trackInstance(instanceData.id, instanceData);
        
        benchmark = await this.benchmarker.benchmarkInstanceLifecycle(operation, instanceData);
        
        // Check instance creation performance
        this.alertSystem.checkMetric('instanceCreationTime', benchmark.totalTime);
        
      } else if (operation === 'destroy') {
        benchmark = await this.benchmarker.benchmarkInstanceLifecycle(operation, instanceData);
        
        // Stop memory tracking and get final report
        const memoryReport = this.memoryTracker.stopInstanceTracking(instanceData.id);
        benchmark.memoryReport = memoryReport;
        
        // Log instance summary
        console.log(`Instance ${instanceData.id} destroyed. Memory report:`, {
          peakMemory: memoryReport?.summary?.peakMemory?.rss,
          totalOperations: memoryReport?.summary?.totalOperations,
          suspectedLeaks: memoryReport?.summary?.suspectedLeaks
        });
      }
      
      this.emit('instance_lifecycle_monitored', {
        operation,
        instanceData,
        benchmark,
        monitoringDuration: Date.now() - monitoringStart
      });
      
      return benchmark;
      
    } catch (error) {
      this.alertSystem.checkMetric('errorRate', 1);
      this.emit('instance_lifecycle_error', {
        operation,
        instanceData,
        error: error.message
      });
      
      throw error;
    }
  }

  // Concurrent load testing
  async monitorConcurrentLoad(targetUsers, testDuration = 60000) {
    console.log(`Starting concurrent load monitoring: ${targetUsers} users for ${testDuration}ms`);
    
    const loadTest = {
      targetUsers,
      testDuration,
      startTime: Date.now(),
      results: []
    };
    
    try {
      const userPromises = [];
      
      for (let userId = 0; userId < targetUsers; userId++) {
        const userPromise = this.simulateUserLoad(userId, testDuration);
        userPromises.push(userPromise);
      }
      
      const userResults = await Promise.allSettled(userPromises);
      
      // Analyze load test results
      loadTest.results = userResults.map((result, index) => ({
        userId: index,
        success: result.status === 'fulfilled',
        data: result.status === 'fulfilled' ? result.value : { error: result.reason }
      }));
      
      loadTest.endTime = Date.now();
      loadTest.actualDuration = loadTest.endTime - loadTest.startTime;
      loadTest.successRate = loadTest.results.filter(r => r.success).length / loadTest.results.length;
      
      // Check concurrent connection limits
      this.alertSystem.checkMetric('concurrentConnections', targetUsers);
      
      console.log(`Load test completed: ${loadTest.successRate * 100}% success rate`);
      
      return loadTest;
      
    } catch (error) {
      console.error('Load test failed:', error);
      throw error;
    }
  }

  async simulateUserLoad(userId, duration) {
    const user = {
      id: userId,
      instanceId: `load-test-instance-${userId}`,
      messages: [],
      startTime: Date.now()
    };
    
    const endTime = user.startTime + duration;
    let messageCount = 0;
    
    while (Date.now() < endTime) {
      try {
        const messageData = {
          id: `load-msg-${userId}-${messageCount}`,
          type: 'load_test',
          content: `Load test message ${messageCount} from user ${userId}`,
          timestamp: Date.now()
        };
        
        const benchmark = await this.monitorClaudeResponse(user.instanceId, messageData);
        user.messages.push({ messageData, benchmark, success: true });
        
        messageCount++;
        
        // Wait between messages (simulate human interaction)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
        
      } catch (error) {
        user.messages.push({ error: error.message, success: false });
        
        // Brief pause before retry
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    user.endTime = Date.now();
    user.duration = user.endTime - user.startTime;
    user.messageCount = user.messages.length;
    user.successCount = user.messages.filter(m => m.success).length;
    user.successRate = user.successCount / user.messageCount;
    
    return user;
  }

  // Real-time metrics collection
  async collectRealTimeMetrics() {
    const metrics = {
      timestamp: Date.now(),
      system: {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        cpu: process.cpuUsage()
      },
      performance: this.benchmarker.getPerformanceSummary(),
      memory: this.memoryTracker.getMemorySummary(),
      alerts: this.alertSystem.getAlertSummary()
    };
    
    // Store metrics for dashboard
    await this.storeDashboardData(metrics);
    
    // Emit real-time update
    this.emit('real_time_metrics', metrics);
    
    return metrics;
  }

  async storeDashboardData(metrics) {
    try {
      const dashboardFile = path.join(
        this.config.metricsDir, 
        'dashboards', 
        'real-time-data.json'
      );
      
      // Read existing data
      let dashboardData = { updates: [] };
      try {
        const existing = await fs.readFile(dashboardFile, 'utf8');
        dashboardData = JSON.parse(existing);
      } catch (error) {
        // File doesn't exist, use default
      }
      
      // Add new metrics
      dashboardData.updates.push(metrics);
      
      // Keep only last 1000 updates for dashboard
      if (dashboardData.updates.length > 1000) {
        dashboardData.updates = dashboardData.updates.slice(-1000);
      }
      
      dashboardData.lastUpdated = metrics.timestamp;
      
      await fs.writeFile(dashboardFile, JSON.stringify(dashboardData, null, 2));
      
    } catch (error) {
      console.error('Failed to store dashboard data:', error);
    }
  }

  async generatePeriodicReport() {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        period: 'periodic',
        performance: this.benchmarker.getPerformanceSummary(),
        memory: this.memoryTracker.getMemorySummary(),
        alerts: this.alertSystem.getAlertSummary(),
        baselines: this.getCurrentBaselines()
      };
      
      const reportFile = path.join(
        this.config.metricsDir,
        'reports',
        `periodic-report-${Date.now()}.json`
      );
      
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
      
      this.emit('periodic_report_generated', report);
      
    } catch (error) {
      console.error('Failed to generate periodic report:', error);
    }
  }

  async generateFinalReport() {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        type: 'final_monitoring_report',
        performance: this.benchmarker.getPerformanceSummary(),
        memory: this.memoryTracker.getMemorySummary(),
        alerts: this.alertSystem.getAlertSummary(),
        baselines: this.getCurrentBaselines(),
        recommendations: this.generateOptimizationRecommendations()
      };
      
      const reportFile = path.join(
        this.config.metricsDir,
        'reports',
        `final-report-${Date.now()}.json`
      );
      
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
      
      console.log(`Final monitoring report generated: ${reportFile}`);
      this.emit('final_report_generated', report);
      
      return report;
      
    } catch (error) {
      console.error('Failed to generate final report:', error);
    }
  }

  generateOptimizationRecommendations() {
    const recommendations = [];
    const perfSummary = this.benchmarker.getPerformanceSummary();
    const memorySummary = this.memoryTracker.getMemorySummary();
    const alertSummary = this.alertSystem.getAlertSummary();
    
    // Performance recommendations
    if (perfSummary.metrics.claude_response_latency?.average > 2000) {
      recommendations.push({
        category: 'performance',
        priority: 'HIGH',
        metric: 'claude_response_latency',
        issue: 'High Claude AI response times',
        suggestion: 'Consider optimizing prompt complexity or implementing request batching',
        currentValue: perfSummary.metrics.claude_response_latency.average,
        targetValue: 2000
      });
    }
    
    if (perfSummary.metrics.sse_delivery_performance?.average > 100) {
      recommendations.push({
        category: 'performance', 
        priority: 'MEDIUM',
        metric: 'sse_delivery_performance',
        issue: 'Slow SSE message delivery',
        suggestion: 'Check network conditions and consider message compression',
        currentValue: perfSummary.metrics.sse_delivery_performance.average,
        targetValue: 100
      });
    }
    
    // Memory recommendations
    if (memorySummary.trackedInstances > 0) {
      for (const [instanceId, instanceSummary] of Object.entries(memorySummary.instances)) {
        if (instanceSummary.currentRSS > 50) { // 50MB
          recommendations.push({
            category: 'memory',
            priority: 'MEDIUM',
            instanceId,
            issue: `High memory usage for instance ${instanceId}`,
            suggestion: 'Monitor for memory leaks and consider implementing periodic cleanup',
            currentValue: instanceSummary.currentRSS,
            targetValue: 50
          });
        }
        
        if (instanceSummary.leaks > 0) {
          recommendations.push({
            category: 'memory',
            priority: 'CRITICAL',
            instanceId,
            issue: `Potential memory leaks detected in instance ${instanceId}`,
            suggestion: 'Investigate memory leak sources and implement fixes immediately',
            detectedLeaks: instanceSummary.leaks
          });
        }
      }
    }
    
    // Alert-based recommendations
    if (alertSummary.critical > 0) {
      recommendations.push({
        category: 'alerts',
        priority: 'CRITICAL',
        issue: `${alertSummary.critical} critical alerts active`,
        suggestion: 'Address critical performance issues immediately',
        criticalAlerts: alertSummary.critical
      });
    }
    
    return recommendations;
  }

  updateBaseline(metricName, value) {
    if (!this.baselines.has(metricName)) {
      this.baselines.set(metricName, {
        values: [],
        average: 0,
        count: 0
      });
    }
    
    const baseline = this.baselines.get(metricName);
    baseline.values.push(value);
    baseline.count++;
    
    // Keep only last 100 values for baseline
    if (baseline.values.length > 100) {
      baseline.values = baseline.values.slice(-100);
    }
    
    // Calculate rolling average
    baseline.average = baseline.values.reduce((sum, v) => sum + v, 0) / baseline.values.length;
  }

  getCurrentBaselines() {
    const baselines = {};
    for (const [metricName, baseline] of this.baselines) {
      baselines[metricName] = {
        average: baseline.average,
        count: baseline.count,
        recentValues: baseline.values.slice(-10) // Last 10 values
      };
    }
    return baselines;
  }

  async startDashboardServer() {
    // Simple dashboard server will be implemented separately
    console.log(`Dashboard server would start on port ${this.config.dashboardPort}`);
    // Implementation would go here for a web-based dashboard
  }

  // Public API methods
  getOverallStatus() {
    return {
      monitoring: this.isMonitoring,
      performance: this.benchmarker.getPerformanceSummary(),
      memory: this.memoryTracker.getMemorySummary(),
      alerts: this.alertSystem.getAlertSummary(),
      baselines: this.getCurrentBaselines()
    };
  }

  async runHealthCheck() {
    const healthCheck = {
      timestamp: Date.now(),
      status: 'healthy',
      components: {},
      issues: []
    };
    
    try {
      // Check benchmarker health
      const perfSummary = this.benchmarker.getPerformanceSummary();
      healthCheck.components.performance = {
        status: perfSummary.monitoring ? 'active' : 'inactive',
        metrics: Object.keys(perfSummary.metrics).length
      };
      
      // Check memory tracker health
      const memSummary = this.memoryTracker.getMemorySummary();
      healthCheck.components.memory = {
        status: memSummary.tracking ? 'active' : 'inactive',
        instancesTracked: memSummary.trackedInstances
      };
      
      // Check alert system health
      const alertSummary = this.alertSystem.getAlertSummary();
      healthCheck.components.alerts = {
        status: 'active',
        activeAlerts: alertSummary.active,
        criticalAlerts: alertSummary.byLevel.critical
      };
      
      // Check for critical issues
      if (alertSummary.critical > 5) {
        healthCheck.status = 'critical';
        healthCheck.issues.push(`${alertSummary.critical} critical alerts active`);
      }
      
      if (!this.isMonitoring) {
        healthCheck.status = 'warning';
        healthCheck.issues.push('Monitoring is not active');
      }
      
    } catch (error) {
      healthCheck.status = 'error';
      healthCheck.issues.push(`Health check failed: ${error.message}`);
    }
    
    return healthCheck;
  }
}

module.exports = IntegratedPerformanceMonitor;