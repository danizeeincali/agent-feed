/**
 * Phase 5: Monitoring Service Integration for API Server
 * Bridges TypeScript monitoring components with Express.js API
 */

import { EventEmitter } from 'events';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Import TypeScript monitoring components
let MetricsCollector, HealthMonitor, AlertManager;

try {
  // Attempt to require the compiled JavaScript versions
  MetricsCollector = require('../../dist/monitoring/metrics-collector').MetricsCollector;
  HealthMonitor = require('../../dist/monitoring/health-monitor').HealthMonitor;
  AlertManager = require('../../dist/monitoring/alert-manager').AlertManager;
} catch (error) {
  console.warn('⚠️  Failed to load compiled TypeScript monitoring modules. Using fallback implementation.');
  console.warn('Run `npm run build` to compile TypeScript sources.');

  // Fallback to direct TypeScript require (requires ts-node)
  try {
    const tsNode = require('ts-node');
    tsNode.register({
      transpileOnly: true,
      compilerOptions: {
        module: 'commonjs',
        target: 'ES2020'
      }
    });

    MetricsCollector = require('../../src/monitoring/metrics-collector').MetricsCollector;
    HealthMonitor = require('../../src/monitoring/health-monitor').HealthMonitor;
    AlertManager = require('../../src/monitoring/alert-manager').AlertManager;
  } catch (tsError) {
    console.error('❌ Failed to load monitoring modules:', tsError.message);
    // Provide minimal mock implementations for development
    MetricsCollector = createMockMetricsCollector();
    HealthMonitor = createMockHealthMonitor();
    AlertManager = createMockAlertManager();
  }
}

/**
 * Monitoring Service Facade for Express.js
 * Provides unified interface to all monitoring components
 */
class MonitoringService {
  constructor() {
    this.metricsCollector = null;
    this.healthMonitor = null;
    this.alertManager = null;
    this.isInitialized = false;
    this.currentMetrics = null;
    this.metricsHistory = [];
    this.maxHistorySize = 1000; // Keep last 1000 snapshots
  }

  /**
   * Initialize all monitoring components
   */
  async initialize() {
    try {
      console.log('🔍 Initializing Phase 5 monitoring services...');

      // Initialize MetricsCollector
      this.metricsCollector = new MetricsCollector();
      this.metricsCollector.on('metrics', (metrics) => {
        this.currentMetrics = metrics;
        this.addToHistory(metrics);
        this.emit('metrics-update', metrics);
      });
      this.metricsCollector.on('alert', (alerts) => {
        this.handleMetricAlerts(alerts);
      });

      // Start metrics collection (5 second intervals)
      await this.metricsCollector.startCollection(5000);
      console.log('✅ MetricsCollector started (5s intervals)');

      // Initialize HealthMonitor
      this.healthMonitor = new HealthMonitor();
      this.healthMonitor.on('health-change', (health) => {
        console.log(`🏥 Health status changed: ${health.status}`);
      });
      this.healthMonitor.startMonitoring();
      console.log('✅ HealthMonitor started');

      // Initialize AlertManager
      this.alertManager = new AlertManager();
      this.alertManager.on('alert', (alert) => {
        console.log(`🚨 Alert: [${alert.severity}] ${alert.title}`);
      });
      this.alertManager.start();
      console.log('✅ AlertManager started');

      this.isInitialized = true;
      console.log('✅ Phase 5 monitoring fully initialized');

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize monitoring:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Stop all monitoring services
   */
  async shutdown() {
    console.log('🛑 Shutting down monitoring services...');

    if (this.metricsCollector) {
      this.metricsCollector.stopCollection();
    }
    if (this.healthMonitor) {
      this.healthMonitor.stopMonitoring();
    }
    if (this.alertManager) {
      this.alertManager.stop();
    }

    this.isInitialized = false;
    console.log('✅ Monitoring services stopped');
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics() {
    if (!this.isInitialized) {
      throw new Error('Monitoring service not initialized');
    }

    return this.currentMetrics || {
      timestamp: Date.now(),
      cpu: { usage: 0, cores: 0, loadAverage: [0, 0, 0] },
      memory: { total: 0, used: 0, free: 0, heapUsed: 0, heapTotal: 0 },
      network: { bytesIn: 0, bytesOut: 0, packetsIn: 0, packetsOut: 0, connections: 0 },
      disk: { usage: 0, readOps: 0, writeOps: 0, readBytes: 0, writeBytes: 0 },
      application: { requestsPerSecond: 0, responseTime: 0, errorRate: 0, activeUsers: 0, queueLength: 0 }
    };
  }

  /**
   * Get Prometheus-formatted metrics
   */
  getPrometheusMetrics() {
    if (!this.isInitialized || !this.metricsCollector) {
      return '# Monitoring not initialized\n';
    }

    return this.metricsCollector.getMetrics();
  }

  /**
   * Get system health status
   */
  getHealth() {
    if (!this.isInitialized || !this.healthMonitor) {
      return {
        status: 'unhealthy',
        message: 'Monitoring not initialized',
        timestamp: Date.now()
      };
    }

    return this.healthMonitor.getOverallHealth();
  }

  /**
   * Get historical statistics
   */
  getHistoricalStats() {
    const history = this.metricsHistory;

    if (history.length === 0) {
      return {
        dataPoints: 0,
        timeRange: { start: null, end: null },
        cpuHistory: [],
        memoryHistory: [],
        diskHistory: [],
        trends: {}
      };
    }

    const timeRange = {
      start: history[0].timestamp,
      end: history[history.length - 1].timestamp
    };

    return {
      dataPoints: history.length,
      timeRange,
      cpuHistory: history.map(m => ({
        timestamp: m.timestamp,
        value: m.cpu.usage
      })),
      memoryHistory: history.map(m => ({
        timestamp: m.timestamp,
        value: (m.memory.used / m.memory.total) * 100
      })),
      diskHistory: history.map(m => ({
        timestamp: m.timestamp,
        value: m.disk.usage
      })),
      requestHistory: history.map(m => ({
        timestamp: m.timestamp,
        value: m.application.requestsPerSecond
      })),
      errorHistory: history.map(m => ({
        timestamp: m.timestamp,
        value: m.application.errorRate
      })),
      trends: this.calculateTrends(history)
    };
  }

  /**
   * Record HTTP request metrics
   */
  recordRequest(method, route, statusCode, duration) {
    if (this.metricsCollector) {
      this.metricsCollector.recordRequest(method, route, statusCode, duration);
    }
  }

  /**
   * Record error occurrence
   */
  recordError(type, severity) {
    if (this.metricsCollector) {
      this.metricsCollector.recordError(type, severity);
    }
  }

  /**
   * Add metrics to history buffer
   */
  addToHistory(metrics) {
    this.metricsHistory.push(metrics);

    // Maintain maximum history size
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }
  }

  /**
   * Calculate trends from historical data
   */
  calculateTrends(history) {
    if (history.length < 2) {
      return {};
    }

    const recent = history.slice(-10); // Last 10 data points

    return {
      cpuTrend: this.calculateTrend(recent.map(m => m.cpu.usage)),
      memoryTrend: this.calculateTrend(recent.map(m => (m.memory.used / m.memory.total) * 100)),
      errorTrend: this.calculateTrend(recent.map(m => m.application.errorRate))
    };
  }

  /**
   * Calculate simple linear trend (positive = increasing, negative = decreasing)
   */
  calculateTrend(values) {
    if (values.length < 2) return 0;

    const first = values[0];
    const last = values[values.length - 1];

    return ((last - first) / first) * 100;
  }

  /**
   * Handle metric threshold alerts
   */
  handleMetricAlerts(alerts) {
    for (const alert of alerts) {
      const { threshold, value } = alert;

      if (this.alertManager) {
        this.alertManager.createAlert({
          title: threshold.name,
          message: `${threshold.description}: ${value.toFixed(2)}`,
          severity: this.mapSeverity(threshold.severity),
          category: 'performance',
          source: 'metrics-collector',
          metadata: { threshold, value }
        });
      }
    }
  }

  /**
   * Map threshold severity to alert severity
   */
  mapSeverity(thresholdSeverity) {
    const map = {
      'low': 'info',
      'medium': 'warning',
      'high': 'error',
      'critical': 'critical'
    };
    return map[thresholdSeverity] || 'warning';
  }
}

// Extend EventEmitter for event support
Object.setPrototypeOf(MonitoringService.prototype, EventEmitter.prototype);

/**
 * Alerting Service Facade
 */
class AlertingService {
  constructor(alertManager) {
    this.alertManager = alertManager;
  }

  getActiveAlerts() {
    if (!this.alertManager) return [];
    return this.alertManager.getActiveAlerts() || [];
  }

  getAlertHistory(filters = {}) {
    if (!this.alertManager) return [];
    return this.alertManager.getAlertHistory(filters) || [];
  }

  acknowledgeAlert(alertId, userId) {
    if (!this.alertManager) return false;
    return this.alertManager.acknowledgeAlert(alertId, userId);
  }

  getAlertStats() {
    if (!this.alertManager) {
      return {
        totalAlerts: 0,
        activeAlerts: 0,
        alertsBySeverity: {}
      };
    }
    return this.alertManager.getMetrics();
  }

  addRule(rule) {
    if (!this.alertManager) return false;
    return this.alertManager.addAlertRule(rule);
  }

  removeRule(ruleId) {
    if (!this.alertManager) return false;
    return this.alertManager.removeAlertRule(ruleId);
  }

  updateRule(ruleId, updates) {
    if (!this.alertManager) return false;
    return this.alertManager.updateAlertRule(ruleId, updates);
  }

  get rules() {
    if (!this.alertManager) return [];
    return this.alertManager.getAlertRules() || [];
  }
}

/**
 * Mock implementations for development when TypeScript modules aren't available
 */
function createMockMetricsCollector() {
  return class MockMetricsCollector extends EventEmitter {
    async startCollection() {
      console.warn('⚠️  Using mock MetricsCollector');
    }
    stopCollection() {}
    getMetrics() { return '# Mock metrics\n'; }
    recordRequest() {}
    recordError() {}
  };
}

function createMockHealthMonitor() {
  return class MockHealthMonitor extends EventEmitter {
    startMonitoring() {
      console.warn('⚠️  Using mock HealthMonitor');
    }
    stopMonitoring() {}
    getOverallHealth() {
      return {
        status: 'healthy',
        message: 'Mock health monitor',
        timestamp: Date.now()
      };
    }
  };
}

function createMockAlertManager() {
  return class MockAlertManager extends EventEmitter {
    start() {
      console.warn('⚠️  Using mock AlertManager');
    }
    stop() {}
    getActiveAlerts() { return []; }
    getAlertHistory() { return []; }
    acknowledgeAlert() { return false; }
    getMetrics() {
      return {
        totalAlerts: 0,
        activeAlerts: 0,
        alertsBySeverity: {}
      };
    }
    addAlertRule() { return false; }
    removeAlertRule() { return false; }
    updateAlertRule() { return false; }
    getAlertRules() { return []; }
    createAlert() {}
  };
}

// Support both CommonJS and ES modules
export { MonitoringService, AlertingService };
export default { MonitoringService, AlertingService };
