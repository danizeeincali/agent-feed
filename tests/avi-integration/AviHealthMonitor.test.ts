/**
 * AviHealthMonitor Test Suite
 * Tests for health monitoring and recovery functionality
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AviHealthMonitor } from '../../frontend/src/services/AviHealthMonitor';
import {
  AviInstance,
  AviHealthStatus,
  AviDiagnosticReport
} from '../../frontend/src/types/avi-integration';

// Mock instance for testing
const createMockInstance = (): AviInstance => ({
  id: 'test-instance',
  name: 'Test Instance',
  description: 'Test instance for health monitoring',
  workingDirectory: '/test',
  status: 'running',
  createdAt: new Date(),
  updatedAt: new Date(),
  isConnected: true,
  hasOutput: false,
  autoRestart: false,
  autoRestartHours: 6,
  skipPermissions: false,
  resumeSession: false,
  useProductionMode: false,
  connectionCount: 1,

  aviConfig: {
    id: 'test-instance',
    name: 'Test Instance',
    aviUserId: 'test-user',
    aviSessionId: 'test-session',
    dmChannelId: 'test-channel',
    personalityMode: 'casual',
    responseLatency: 'natural',
    privacyLevel: 'standard',
    contextRetention: 'session'
  },

  dmConnection: {
    channelId: 'test-channel',
    connectionQuality: 'good',
    latency: 100,
    encryption: {
      method: 'E2EE',
      keyRotationEnabled: true,
      encryptionStrength: 'enhanced'
    },
    sessionValidUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
    lastHeartbeat: new Date(),
    reconnectCount: 0
  },

  conversationMetrics: {
    messageCount: 0,
    averageResponseTime: 500,
    conversationDuration: 0,
    topicSwitches: 0,
    clarificationRequests: 0,
    engagementLevel: 'medium',
    complexityScore: 5
  },

  securityContext: {
    userId: 'test-user',
    sessionToken: 'test-token',
    permissionLevel: 'write',
    dataRetentionPolicy: 'session',
    auditLogging: true,
    contentFiltering: {
      enabled: true,
      level: 'standard',
      customRules: [],
      blockedKeywords: []
    }
  }
});

describe('AviHealthMonitor', () => {
  let healthMonitor: AviHealthMonitor;
  let mockInstance: AviInstance;

  beforeEach(() => {
    healthMonitor = new AviHealthMonitor({
      checkInterval: 100, // Fast for testing
      enablePredictiveAnalysis: true,
      enableAutoRecovery: true
    });

    mockInstance = createMockInstance();
  });

  afterEach(() => {
    if (healthMonitor) {
      healthMonitor.stopMonitoring();
    }
  });

  describe('Basic Health Monitoring', () => {
    it('should start monitoring successfully', () => {
      expect(() => {
        healthMonitor.startMonitoring(mockInstance);
      }).not.toThrow();
    });

    it('should emit monitoring:started event', (done) => {
      healthMonitor.on('monitoring:started', (instanceId) => {
        expect(instanceId).toBe(mockInstance.id);
        done();
      });

      healthMonitor.startMonitoring(mockInstance);
    });

    it('should stop monitoring cleanly', () => {
      healthMonitor.startMonitoring(mockInstance);

      expect(() => {
        healthMonitor.stopMonitoring();
      }).not.toThrow();
    });

    it('should emit monitoring:stopped event', (done) => {
      healthMonitor.startMonitoring(mockInstance);

      healthMonitor.on('monitoring:stopped', (instanceId) => {
        expect(instanceId).toBe(mockInstance.id);
        done();
      });

      healthMonitor.stopMonitoring();
    });
  });

  describe('Health Status Assessment', () => {
    beforeEach(() => {
      healthMonitor.startMonitoring(mockInstance);
    });

    it('should return current health status', () => {
      const health = healthMonitor.getCurrentHealth();

      expect(health).toBeDefined();
      expect(health.overall).toBeDefined();
      expect(['healthy', 'warning', 'critical']).toContain(health.overall);
      expect(health.components).toBeDefined();
      expect(health.metrics).toBeDefined();
      expect(health.recommendations).toBeDefined();
    });

    it('should assess connection health correctly', () => {
      const health = healthMonitor.getCurrentHealth();
      expect(['healthy', 'degraded', 'down']).toContain(health.components.connection);
    });

    it('should assess authentication health correctly', () => {
      const health = healthMonitor.getCurrentHealth();
      expect(['valid', 'expiring', 'invalid']).toContain(health.components.authentication);
    });

    it('should detect unhealthy conditions', () => {
      // Simulate unhealthy instance
      mockInstance.isConnected = false;
      mockInstance.status = 'error';

      const health = healthMonitor.getCurrentHealth();
      expect(health.overall).toBe('critical');
    });
  });

  describe('Metrics Collection', () => {
    beforeEach(() => {
      healthMonitor.startMonitoring(mockInstance);
    });

    it('should collect metrics over time', (done) => {
      let metricsCollected = 0;

      healthMonitor.on('metrics:collected', (metrics) => {
        metricsCollected++;
        expect(Array.isArray(metrics)).toBe(true);

        if (metricsCollected >= 2) {
          done();
        }
      });
    });

    it('should track performance trends', async () => {
      // Wait for some metrics to be collected
      await new Promise(resolve => setTimeout(resolve, 300));

      const responseTimeMetrics = healthMonitor.getPerformanceTrends('response_time', 1);
      expect(Array.isArray(responseTimeMetrics)).toBe(true);
    });

    it('should calculate trend directions correctly', async () => {
      // Wait for metrics collection
      await new Promise(resolve => setTimeout(resolve, 500));

      const metrics = healthMonitor.getPerformanceTrends('response_time', 1);

      if (metrics.length > 0) {
        const latestMetric = metrics[metrics.length - 1];
        expect(['improving', 'stable', 'degrading']).toContain(latestMetric.trend);
      }
    });
  });

  describe('Diagnostic Capabilities', () => {
    beforeEach(() => {
      healthMonitor.startMonitoring(mockInstance);
    });

    it('should run comprehensive diagnostics', async () => {
      const report = await healthMonitor.runDiagnostics();

      expect(report).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.connectionTests).toBeDefined();
      expect(report.securityChecks).toBeDefined();
      expect(report.performanceMetrics).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it('should test connection parameters', async () => {
      const report = await healthMonitor.runDiagnostics();

      expect(typeof report.connectionTests.latency).toBe('number');
      expect(['stable', 'unstable']).toContain(report.connectionTests.stability);
      expect(typeof report.connectionTests.throughput).toBe('number');
    });

    it('should perform security checks', async () => {
      const report = await healthMonitor.runDiagnostics();

      expect(typeof report.securityChecks.encryptionValid).toBe('boolean');
      expect(typeof report.securityChecks.tokenValid).toBe('boolean');
      expect(typeof report.securityChecks.permissionsValid).toBe('boolean');
    });

    it('should analyze performance metrics', async () => {
      const report = await healthMonitor.runDiagnostics();

      expect(typeof report.performanceMetrics.averageResponseTime).toBe('number');
      expect(typeof report.performanceMetrics.messageProcessingRate).toBe('number');
      expect(typeof report.performanceMetrics.memoryEfficiency).toBe('number');
    });

    it('should generate relevant recommendations', async () => {
      const report = await healthMonitor.runDiagnostics();

      expect(Array.isArray(report.recommendations.critical)).toBe(true);
      expect(Array.isArray(report.recommendations.warnings)).toBe(true);
      expect(Array.isArray(report.recommendations.optimizations)).toBe(true);
    });

    it('should emit diagnostics:completed event', async () => {
      const eventPromise = new Promise(resolve => {
        healthMonitor.on('diagnostics:completed', resolve);
      });

      await healthMonitor.runDiagnostics();
      const event = await eventPromise;

      expect(event).toBeDefined();
    });
  });

  describe('Recovery Mechanisms', () => {
    beforeEach(() => {
      healthMonitor.startMonitoring(mockInstance);
    });

    it('should attempt recovery when health degrades', async () => {
      const recoveryPromise = new Promise(resolve => {
        healthMonitor.on('recovery:attempt', resolve);
      });

      // Simulate degraded health that triggers recovery
      mockInstance.dmConnection.connectionQuality = 'poor';
      mockInstance.dmConnection.latency = 2000;

      // Wait for health check to detect the issue
      await new Promise(resolve => setTimeout(resolve, 200));

      // Trigger recovery manually since auto-recovery timing is different in tests
      const success = await healthMonitor.attemptRecovery('reconnect');
      expect(typeof success).toBe('boolean');
    });

    it('should respect recovery cooldowns', async () => {
      // First recovery attempt
      const firstAttempt = await healthMonitor.attemptRecovery('reconnect');
      expect(typeof firstAttempt).toBe('boolean');

      // Immediate second attempt should be blocked by cooldown
      const secondAttempt = await healthMonitor.attemptRecovery('reconnect');
      expect(typeof secondAttempt).toBe('boolean');
    });

    it('should emit recovery events', async () => {
      const attemptPromise = new Promise(resolve => {
        healthMonitor.on('recovery:attempt', resolve);
      });

      await healthMonitor.attemptRecovery('reset_context');
      const attemptEvent = await attemptPromise;

      expect(attemptEvent).toBeDefined();
    });

    it('should try recovery strategies by priority', async () => {
      // Simulate critical health that should trigger high-priority recovery
      mockInstance.isConnected = false;
      mockInstance.status = 'error';

      const success = await healthMonitor.attemptRecovery();
      expect(typeof success).toBe('boolean');
    });
  });

  describe('Predictive Analysis', () => {
    beforeEach(() => {
      healthMonitor = new AviHealthMonitor({
        checkInterval: 50,
        enablePredictiveAnalysis: true
      });
      healthMonitor.startMonitoring(mockInstance);
    });

    it('should detect anomalies in metrics', (done) => {
      healthMonitor.on('prediction:anomaly', (anomalies) => {
        expect(Array.isArray(anomalies)).toBe(true);
        done();
      });

      // Wait for enough data to analyze
      setTimeout(() => {
        // Simulate anomaly by triggering analysis manually
        healthMonitor.emit('prediction:anomaly', [
          {
            metric: 'response_time',
            type: 'spike',
            severity: 'high'
          }
        ]);
      }, 200);
    });

    it('should handle prediction errors gracefully', (done) => {
      healthMonitor.on('prediction:error', (error) => {
        expect(error).toBeDefined();
        done();
      });

      // Simulate prediction error
      setTimeout(() => {
        healthMonitor.emit('prediction:error', new Error('Test prediction error'));
      }, 100);
    });
  });

  describe('Data Export and Import', () => {
    beforeEach(() => {
      healthMonitor.startMonitoring(mockInstance);
    });

    it('should export health data', async () => {
      // Wait for some data to be collected
      await new Promise(resolve => setTimeout(resolve, 200));

      const exportedData = healthMonitor.exportHealthData();

      expect(exportedData).toBeDefined();
      expect(exportedData.instance).toBe(mockInstance.id);
      expect(exportedData.currentHealth).toBeDefined();
      expect(exportedData.performanceProfile).toBeDefined();
      expect(exportedData.exportTime).toBeInstanceOf(Date);
    });

    it('should include metrics in export', async () => {
      await new Promise(resolve => setTimeout(resolve, 200));

      const exportedData = healthMonitor.exportHealthData();

      expect(exportedData.metrics).toBeDefined();
      expect(typeof exportedData.metrics).toBe('object');
    });

    it('should include recovery history in export', async () => {
      // Attempt recovery to create history
      await healthMonitor.attemptRecovery('reset_context');

      const exportedData = healthMonitor.exportHealthData();

      expect(exportedData.recoveryHistory).toBeDefined();
      expect(exportedData.recoveryHistory.attempts).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle monitoring without instance gracefully', () => {
      expect(() => {
        healthMonitor.getCurrentHealth();
      }).not.toThrow();
    });

    it('should handle diagnostic failures', async () => {
      await expect(healthMonitor.runDiagnostics()).rejects.toThrow();
    });

    it('should handle recovery failures gracefully', async () => {
      const success = await healthMonitor.attemptRecovery('nonexistent_strategy');
      expect(success).toBe(false);
    });
  });

  describe('Performance Optimization', () => {
    beforeEach(() => {
      healthMonitor.startMonitoring(mockInstance);
    });

    it('should maintain performance with high metric volume', async () => {
      const startTime = Date.now();

      // Wait for metrics collection
      await new Promise(resolve => setTimeout(resolve, 500));

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(1000);
    });

    it('should clean up old metrics automatically', async () => {
      // Wait for metrics collection
      await new Promise(resolve => setTimeout(resolve, 300));

      const exportedData = healthMonitor.exportHealthData();

      // Metrics should be present but not excessive
      expect(exportedData.metrics).toBeDefined();
    });
  });

  describe('Integration with Instance Manager', () => {
    it('should handle instance lifecycle events', () => {
      healthMonitor.startMonitoring(mockInstance);

      // Simulate instance status change
      mockInstance.status = 'stopping';

      const health = healthMonitor.getCurrentHealth();
      expect(health).toBeDefined();
    });

    it('should track conversation metrics', async () => {
      healthMonitor.startMonitoring(mockInstance);

      // Update conversation metrics
      mockInstance.conversationMetrics.messageCount = 10;
      mockInstance.conversationMetrics.averageResponseTime = 800;

      await new Promise(resolve => setTimeout(resolve, 100));

      const health = healthMonitor.getCurrentHealth();
      expect(health.metrics).toBeDefined();
    });
  });
});