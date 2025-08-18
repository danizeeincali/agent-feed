/**
 * Comprehensive Production Monitoring Validation Tests
 * End-to-end testing of all Phase 4 monitoring systems
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/test-globals';
import ProductionOrchestrator from '../src/monitoring/production-orchestrator';
import MetricsCollector from '../src/monitoring/metrics-collector';
import PerformanceAnalyzer from '../src/monitoring/performance-analyzer';
import HealthMonitor from '../src/monitoring/health-monitor';
import AlertManager from '../src/monitoring/alert-manager';
import SecurityManager from '../src/security/security-manager';
import ErrorRecoverySystem from '../src/security/error-recovery';

describe('Phase 4 Production Monitoring Validation', () => {
  let orchestrator: ProductionOrchestrator;
  
  beforeAll(() => {
    orchestrator = new ProductionOrchestrator({
      metricsCollection: { enabled: true, interval: 1000, retentionDays: 1 },
      performanceAnalysis: { enabled: true, analysisInterval: 2000, trendWindow: 60 },
      healthMonitoring: { enabled: true, checkInterval: 3000, autoScaling: true },
      alerting: { enabled: true, escalationEnabled: true, channels: ['webhook'] },
      security: { enabled: true, threatDetection: true, complianceChecking: true },
      errorRecovery: { enabled: true, automaticRecovery: true, incidentManagement: true }
    });
  });

  afterAll(async () => {
    if (orchestrator.isActive()) {
      await orchestrator.stopProduction();
    }
  });

  describe('System Integration Tests', () => {
    test('should start all monitoring components successfully', async () => {
      await orchestrator.startProduction();
      
      const status = orchestrator.getProductionStatus();
      expect(status.metrics.active).toBe(true);
      expect(status.performance.active).toBe(true);
      expect(status.health.active).toBe(true);
      expect(status.alerts.active).toBe(true);
      expect(status.security.active).toBe(true);
      expect(status.recovery.active).toBe(true);
    });

    test('should maintain overall system health score', () => {
      const status = orchestrator.getProductionStatus();
      expect(status.overall.score).toBeGreaterThanOrEqual(0);
      expect(status.overall.score).toBeLessThanOrEqual(100);
      expect(['healthy', 'warning', 'critical']).toContain(status.overall.status);
    });

    test('should handle component failures gracefully', async () => {
      // Stop individual components to test fault tolerance
      orchestrator.getMetricsCollector().stopCollection();
      
      const status = orchestrator.getProductionStatus();
      expect(status.metrics.active).toBe(false);
      
      // Other components should still be active
      expect(status.health.active).toBe(true);
      expect(status.alerts.active).toBe(true);
    });
  });

  describe('Metrics Collection Validation', () => {
    let metricsCollector: MetricsCollector;

    beforeEach(() => {
      metricsCollector = new MetricsCollector();
    });

    test('should collect system metrics successfully', async () => {
      const metricsPromise = new Promise((resolve) => {
        metricsCollector.once('metrics', resolve);
      });

      await metricsCollector.startCollection(500);
      
      const metrics = await metricsPromise;
      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('cpu');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('network');
      expect(metrics).toHaveProperty('disk');
      expect(metrics).toHaveProperty('application');
      
      metricsCollector.stopCollection();
    });

    test('should generate Prometheus-compatible metrics', () => {
      const prometheusMetrics = metricsCollector.getMetrics();
      expect(typeof prometheusMetrics).toBe('string');
      expect(prometheusMetrics).toMatch(/# HELP/);
      expect(prometheusMetrics).toMatch(/# TYPE/);
    });

    test('should detect threshold violations', async () => {
      const alertPromise = new Promise((resolve) => {
        metricsCollector.once('alert', resolve);
      });

      // Add a low threshold to trigger alerts
      metricsCollector.addThreshold({
        name: 'test-cpu-high',
        value: 1, // Very low threshold to trigger
        operator: 'gt',
        severity: 'high',
        description: 'Test threshold for validation'
      });

      await metricsCollector.startCollection(100);
      
      const alert = await alertPromise;
      expect(alert).toBeDefined();
      
      metricsCollector.stopCollection();
    });
  });

  describe('Performance Analysis Validation', () => {
    let performanceAnalyzer: PerformanceAnalyzer;

    beforeEach(() => {
      performanceAnalyzer = new PerformanceAnalyzer();
    });

    test('should detect performance bottlenecks', () => {
      // Add mock metrics with high CPU usage
      const highCPUMetrics = {
        timestamp: Date.now(),
        cpu: { usage: 95, cores: 4, loadAverage: [3.0, 3.2, 3.1] },
        memory: { total: 8000000000, used: 7000000000, free: 1000000000, heapUsed: 2000000000, heapTotal: 2500000000 },
        network: { bytesIn: 1000000, bytesOut: 1000000, packetsIn: 1000, packetsOut: 1000, connections: 100 },
        disk: { usage: 60, readOps: 100, writeOps: 50, readBytes: 1000000, writeBytes: 500000 },
        application: { requestsPerSecond: 100, responseTime: 200, errorRate: 1, activeUsers: 500, queueLength: 10 }
      };

      for (let i = 0; i < 15; i++) {
        performanceAnalyzer.addMetrics(highCPUMetrics);
      }

      const bottlenecks = performanceAnalyzer.getBottlenecks();
      expect(bottlenecks.length).toBeGreaterThan(0);
      
      const cpuBottleneck = bottlenecks.find(b => b.type === 'cpu');
      expect(cpuBottleneck).toBeDefined();
      expect(cpuBottleneck?.severity).toBe('critical');
    });

    test('should analyze performance trends', () => {
      // Add series of metrics showing increasing CPU usage
      for (let i = 0; i < 20; i++) {
        const metrics = {
          timestamp: Date.now() + i * 1000,
          cpu: { usage: 50 + i * 2, cores: 4, loadAverage: [1.0, 1.2, 1.1] },
          memory: { total: 8000000000, used: 4000000000, free: 4000000000, heapUsed: 1000000000, heapTotal: 2000000000 },
          network: { bytesIn: 1000000, bytesOut: 1000000, packetsIn: 1000, packetsOut: 1000, connections: 100 },
          disk: { usage: 60, readOps: 100, writeOps: 50, readBytes: 1000000, writeBytes: 500000 },
          application: { requestsPerSecond: 100, responseTime: 200, errorRate: 1, activeUsers: 500, queueLength: 10 }
        };
        performanceAnalyzer.addMetrics(metrics);
      }

      const trends = performanceAnalyzer.getTrends();
      expect(trends.length).toBeGreaterThan(0);
      
      const cpuTrend = trends.find(t => t.metric === 'cpu_usage');
      expect(cpuTrend).toBeDefined();
      expect(cpuTrend?.direction).toBe('degrading');
    });

    test('should generate optimization recommendations', () => {
      // Add metrics that should trigger optimizations
      const problematicMetrics = {
        timestamp: Date.now(),
        cpu: { usage: 85, cores: 4, loadAverage: [2.5, 2.7, 2.6] },
        memory: { total: 8000000000, used: 7200000000, free: 800000000, heapUsed: 2200000000, heapTotal: 2500000000 },
        network: { bytesIn: 1000000, bytesOut: 1000000, packetsIn: 1000, packetsOut: 1000, connections: 100 },
        disk: { usage: 90, readOps: 1000, writeOps: 500, readBytes: 10000000, writeBytes: 5000000 },
        application: { requestsPerSecond: 500, responseTime: 3000, errorRate: 8, activeUsers: 1000, queueLength: 50 }
      };

      for (let i = 0; i < 15; i++) {
        performanceAnalyzer.addMetrics(problematicMetrics);
      }

      const optimizations = performanceAnalyzer.getOptimizations();
      expect(optimizations.length).toBeGreaterThan(0);
      
      const optimization = optimizations[0];
      expect(optimization).toHaveProperty('type');
      expect(optimization).toHaveProperty('priority');
      expect(optimization).toHaveProperty('expectedImpact');
    });
  });

  describe('Health Monitoring Validation', () => {
    let healthMonitor: HealthMonitor;

    beforeEach(() => {
      healthMonitor = new HealthMonitor();
    });

    test('should perform health checks', async () => {
      const healthPromise = new Promise((resolve) => {
        healthMonitor.once('health-check-complete', resolve);
      });

      healthMonitor.startMonitoring();
      
      const healthData = await healthPromise;
      expect(healthData).toBeDefined();
      expect(healthData).toHaveProperty('healthChecks');
      expect(Array.isArray(healthData.healthChecks)).toBe(true);
      
      healthMonitor.stopMonitoring();
    });

    test('should trigger auto-scaling based on metrics', () => {
      const scalingPromise = new Promise((resolve) => {
        healthMonitor.once('scaling-triggered', resolve);
      });

      // Simulate high CPU load
      const highLoadMetrics = {
        timestamp: Date.now(),
        cpu: { usage: 80, cores: 4, loadAverage: [3.0, 3.2, 3.1] },
        memory: { total: 8000000000, used: 6000000000, free: 2000000000, heapUsed: 1500000000, heapTotal: 2000000000 },
        network: { bytesIn: 1000000, bytesOut: 1000000, packetsIn: 1000, packetsOut: 1000, connections: 100 },
        disk: { usage: 60, readOps: 100, writeOps: 50, readBytes: 1000000, writeBytes: 500000 },
        application: { requestsPerSecond: 500, responseTime: 1500, errorRate: 3, activeUsers: 800, queueLength: 30 }
      };

      healthMonitor.processMetrics(highLoadMetrics);
      
      return scalingPromise.then((scalingAction) => {
        expect(scalingAction).toBeDefined();
        expect(scalingAction).toHaveProperty('action');
        expect(scalingAction).toHaveProperty('reason');
      });
    });

    test('should calculate overall health score', () => {
      const health = healthMonitor.getOverallHealth();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('score');
      expect(health).toHaveProperty('summary');
      expect(health.score).toBeGreaterThanOrEqual(0);
      expect(health.score).toBeLessThanOrEqual(100);
    });
  });

  describe('Alert Management Validation', () => {
    let alertManager: AlertManager;

    beforeEach(() => {
      alertManager = new AlertManager();
    });

    test('should create and manage alerts', () => {
      alertManager.startAlertManager();
      
      const mockBottleneck = {
        id: 'test-bottleneck',
        type: 'cpu' as const,
        severity: 'high' as const,
        description: 'Test CPU bottleneck',
        impact: 80,
        recommendation: 'Scale out',
        autoFixAvailable: true,
        detectedAt: Date.now(),
        persistentFor: 5000
      };

      alertManager.processBottlenecks([mockBottleneck]);
      
      const alerts = alertManager.getActiveAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      
      const testAlert = alerts.find(a => a.source === 'performance-analyzer');
      expect(testAlert).toBeDefined();
      
      alertManager.stopAlertManager();
    });

    test('should escalate alerts based on rules', (done) => {
      alertManager.startAlertManager();
      
      alertManager.once('alert-escalated', (data) => {
        expect(data).toHaveProperty('alert');
        expect(data).toHaveProperty('escalationRule');
        alertManager.stopAlertManager();
        done();
      });

      // Create a critical alert that should escalate quickly
      const criticalBottleneck = {
        id: 'critical-test',
        type: 'system' as const,
        severity: 'critical' as const,
        description: 'Critical system failure',
        impact: 100,
        recommendation: 'Immediate action required',
        autoFixAvailable: false,
        detectedAt: Date.now() - 10000, // 10 seconds ago
        persistentFor: 10000
      };

      alertManager.processBottlenecks([criticalBottleneck]);
    }, 10000);

    test('should calculate alert metrics', () => {
      alertManager.startAlertManager();
      
      // Create some test alerts
      const bottlenecks = [
        {
          id: 'test1',
          type: 'cpu' as const,
          severity: 'high' as const,
          description: 'Test 1',
          impact: 70,
          recommendation: 'Fix 1',
          autoFixAvailable: true,
          detectedAt: Date.now(),
          persistentFor: 1000
        },
        {
          id: 'test2',
          type: 'memory' as const,
          severity: 'medium' as const,
          description: 'Test 2',
          impact: 50,
          recommendation: 'Fix 2',
          autoFixAvailable: false,
          detectedAt: Date.now(),
          persistentFor: 2000
        }
      ];

      alertManager.processBottlenecks(bottlenecks);
      
      const metrics = alertManager.getAlertMetrics();
      expect(metrics).toHaveProperty('totalAlerts');
      expect(metrics).toHaveProperty('activeAlerts');
      expect(metrics).toHaveProperty('alertsByCategory');
      expect(metrics).toHaveProperty('alertsBySeverity');
      
      alertManager.stopAlertManager();
    });
  });

  describe('Security Monitoring Validation', () => {
    let securityManager: SecurityManager;

    beforeEach(() => {
      securityManager = new SecurityManager();
    });

    test('should log and analyze security events', () => {
      securityManager.startSecurityMonitoring();
      
      const eventId = securityManager.logSecurityEvent({
        type: 'authentication',
        severity: 'high',
        source: 'login-service',
        user: 'testuser',
        ip: '192.168.1.100',
        action: 'failed_login',
        outcome: 'failure',
        details: { attempts: 5 }
      });

      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');
      
      const events = securityManager.getSecurityEvents({
        type: 'authentication',
        timeRange: 60000 // Last minute
      });
      
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].action).toBe('failed_login');
      
      securityManager.stopSecurityMonitoring();
    });

    test('should detect security threats', (done) => {
      securityManager.startSecurityMonitoring();
      
      securityManager.once('threat-detected', (threat) => {
        expect(threat).toHaveProperty('name');
        expect(threat).toHaveProperty('severity');
        expect(threat).toHaveProperty('confidence');
        expect(threat).toHaveProperty('indicators');
        securityManager.stopSecurityMonitoring();
        done();
      });

      // Generate multiple suspicious events to trigger threat detection
      for (let i = 0; i < 60; i++) {
        securityManager.logSecurityEvent({
          type: 'authentication',
          severity: 'medium',
          source: 'api',
          ip: '192.168.1.100', // Same IP for pattern detection
          action: 'api_request',
          outcome: 'success'
        });
      }
    }, 10000);

    test('should track compliance status', () => {
      const complianceStatus = securityManager.getComplianceStatus();
      expect(Array.isArray(complianceStatus)).toBe(true);
      expect(complianceStatus.length).toBeGreaterThan(0);
      
      const check = complianceStatus[0];
      expect(check).toHaveProperty('id');
      expect(check).toHaveProperty('name');
      expect(check).toHaveProperty('standard');
      expect(check).toHaveProperty('status');
    });

    test('should calculate security metrics', () => {
      securityManager.startSecurityMonitoring();
      
      // Generate some security events
      securityManager.logSecurityEvent({
        type: 'intrusion',
        severity: 'critical',
        source: 'firewall',
        action: 'blocked_ip',
        outcome: 'blocked'
      });

      const metrics = securityManager.getSecurityMetrics();
      expect(metrics).toHaveProperty('totalEvents');
      expect(metrics).toHaveProperty('riskScore');
      expect(metrics).toHaveProperty('complianceScore');
      expect(metrics).toHaveProperty('threatsDetected');
      
      securityManager.stopSecurityMonitoring();
    });
  });

  describe('Error Recovery Validation', () => {
    let errorRecovery: ErrorRecoverySystem;

    beforeEach(() => {
      errorRecovery = new ErrorRecoverySystem();
    });

    test('should report and process errors', () => {
      errorRecovery.startErrorRecovery();
      
      const errorId = errorRecovery.reportError({
        type: 'application',
        severity: 'high',
        source: 'api-server',
        component: 'payment-service',
        message: 'Database connection timeout',
        context: { database: 'payments', timeout: 30000 }
      });

      expect(errorId).toBeDefined();
      expect(typeof errorId).toBe('string');
      
      const errors = errorRecovery.getErrorEvents({
        type: 'application',
        timeRange: 60000
      });
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].component).toBe('payment-service');
      
      errorRecovery.stopErrorRecovery();
    });

    test('should attempt automatic recovery', (done) => {
      errorRecovery.startErrorRecovery();
      
      errorRecovery.once('recovery-successful', (data) => {
        expect(data).toHaveProperty('errorEvent');
        expect(data).toHaveProperty('strategy');
        errorRecovery.stopErrorRecovery();
        done();
      });

      // Report an auto-recoverable error
      errorRecovery.reportError({
        type: 'system',
        severity: 'medium',
        source: 'health-check',
        component: 'api-gateway',
        message: 'service unavailable - temporary failure',
        context: { retryable: true }
      });
    }, 10000);

    test('should create incidents for critical errors', () => {
      errorRecovery.startErrorRecovery();
      
      errorRecovery.reportError({
        type: 'system',
        severity: 'critical',
        source: 'database',
        component: 'primary-db',
        message: 'Primary database offline',
        impact: {
          usersFaced: 1000,
          servicesAffected: ['payment', 'user-auth'],
          dataLoss: false,
          securityBreach: false
        }
      });

      const incidents = errorRecovery.getIncidents('open');
      expect(incidents.length).toBeGreaterThan(0);
      
      const incident = incidents[0];
      expect(incident.severity).toBe('critical');
      expect(incident.affectedServices).toContain('primary-db');
      
      errorRecovery.stopErrorRecovery();
    });

    test('should calculate recovery metrics', () => {
      errorRecovery.startErrorRecovery();
      
      // Report several errors to generate metrics
      for (let i = 0; i < 5; i++) {
        errorRecovery.reportError({
          type: 'application',
          severity: 'medium',
          source: 'test',
          component: 'test-service',
          message: `Test error ${i}`,
          context: { iteration: i }
        });
      }

      const metrics = errorRecovery.getRecoveryMetrics();
      expect(metrics).toHaveProperty('totalErrors');
      expect(metrics).toHaveProperty('recoverySuccessRate');
      expect(metrics).toHaveProperty('meanTimeToRecovery');
      expect(metrics).toHaveProperty('incidentsCreated');
      
      errorRecovery.stopErrorRecovery();
    });
  });

  describe('End-to-End Integration Tests', () => {
    test('should handle complete monitoring workflow', async () => {
      const events: string[] = [];
      
      // Set up event listeners
      orchestrator.on('metrics-collected', () => events.push('metrics'));
      orchestrator.on('performance-analyzed', () => events.push('performance'));
      orchestrator.on('health-checked', () => events.push('health'));
      orchestrator.on('alert-generated', () => events.push('alert'));
      orchestrator.on('security-event', () => events.push('security'));
      orchestrator.on('error-reported', () => events.push('error'));

      // Wait for several cycles
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Verify that all systems are working
      expect(events).toContain('metrics');
      expect(events).toContain('health');
    }, 15000);

    test('should maintain system resilience under load', async () => {
      // Simulate high load conditions
      const securityManager = orchestrator.getSecurityManager();
      const errorRecovery = orchestrator.getErrorRecovery();
      
      // Generate multiple events rapidly
      for (let i = 0; i < 100; i++) {
        securityManager.logSecurityEvent({
          type: 'authentication',
          severity: 'medium',
          source: 'load-test',
          action: `request_${i}`,
          outcome: 'success'
        });
        
        if (i % 10 === 0) {
          errorRecovery.reportError({
            type: 'application',
            severity: 'low',
            source: 'load-test',
            component: 'test-service',
            message: `Load test error ${i}`
          });
        }
      }
      
      // System should remain stable
      const status = orchestrator.getProductionStatus();
      expect(status.overall.status).not.toBe('critical');
      expect(status.security.active).toBe(true);
      expect(status.recovery.active).toBe(true);
    });

    test('should provide comprehensive status reporting', () => {
      const status = orchestrator.getProductionStatus();
      
      // Verify all status components are present
      expect(status).toHaveProperty('timestamp');
      expect(status).toHaveProperty('overall');
      expect(status).toHaveProperty('metrics');
      expect(status).toHaveProperty('performance');
      expect(status).toHaveProperty('health');
      expect(status).toHaveProperty('alerts');
      expect(status).toHaveProperty('security');
      expect(status).toHaveProperty('recovery');
      
      // Verify overall status structure
      expect(status.overall).toHaveProperty('status');
      expect(status.overall).toHaveProperty('score');
      expect(status.overall).toHaveProperty('uptime');
      
      // Verify scores are within valid ranges
      expect(status.overall.score).toBeGreaterThanOrEqual(0);
      expect(status.overall.score).toBeLessThanOrEqual(100);
      expect(status.security.riskScore).toBeGreaterThanOrEqual(0);
      expect(status.security.riskScore).toBeLessThanOrEqual(100);
      expect(status.security.complianceScore).toBeGreaterThanOrEqual(0);
      expect(status.security.complianceScore).toBeLessThanOrEqual(100);
    });
  });
});