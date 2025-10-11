const AlertingService = require('../../src/monitoring/alerting-service.js');
const fs = require('fs');
const path = require('path');

describe('AlertingService', () => {
  let alertingService;
  let testAlertLogPath;
  let webhookCalls;

  beforeEach(() => {
    testAlertLogPath = path.join(__dirname, 'test-alerts.log');
    if (fs.existsSync(testAlertLogPath)) {
      fs.unlinkSync(testAlertLogPath);
    }

    webhookCalls = [];

    alertingService = new AlertingService({
      rules: [
        {
          id: 'high_cpu',
          name: 'High CPU Usage',
          metric: 'system.cpu.usage',
          condition: 'greater_than',
          threshold: 80,
          severity: 'critical',
          duration: 0 // Trigger immediately for testing
        },
        {
          id: 'high_memory',
          name: 'High Memory Usage',
          metric: 'system.memory.usedPercentage',
          condition: 'greater_than',
          threshold: 85,
          severity: 'warning',
          duration: 0
        },
        {
          id: 'high_error_rate',
          name: 'High API Error Rate',
          metric: 'api.errorRate',
          condition: 'greater_than',
          threshold: 5,
          severity: 'critical',
          duration: 0
        },
        {
          id: 'low_disk',
          name: 'Low Disk Space',
          metric: 'system.disk.usedPercentage',
          condition: 'greater_than',
          threshold: 90,
          severity: 'warning',
          duration: 0
        }
      ],
      channels: {
        console: { enabled: true },
        file: { enabled: true, path: testAlertLogPath },
        webhook: {
          enabled: true,
          url: 'http://localhost:9999/alerts',
          method: 'POST',
          handler: (alert) => webhookCalls.push(alert) // Mock webhook
        }
      },
      deduplicationWindow: 100, // 100ms for testing
      maxAlertsPerMinute: 10
    });
  });

  afterEach(() => {
    if (alertingService) {
      alertingService.stop();
    }
    if (fs.existsSync(testAlertLogPath)) {
      fs.unlinkSync(testAlertLogPath);
    }
  });

  describe('Alert Rule Evaluation', () => {
    test('should trigger alert when threshold exceeded', () => {
      const metrics = {
        system: {
          cpu: { usage: 85 },
          memory: { usedPercentage: 70 }
        }
      };

      const alerts = alertingService.evaluateMetrics(metrics);

      expect(alerts.length).toBeGreaterThan(0);
      const cpuAlert = alerts.find(a => a.rule.id === 'high_cpu');
      expect(cpuAlert).toBeDefined();
      expect(cpuAlert.severity).toBe('critical');
      expect(cpuAlert.currentValue).toBe(85);
    });

    test('should not trigger alert when below threshold', () => {
      const metrics = {
        system: {
          cpu: { usage: 50 },
          memory: { usedPercentage: 60 }
        }
      };

      const alerts = alertingService.evaluateMetrics(metrics);

      expect(alerts.length).toBe(0);
    });

    test('should evaluate multiple rules', () => {
      const metrics = {
        system: {
          cpu: { usage: 90 },
          memory: { usedPercentage: 90 },
          disk: { usedPercentage: 95 }
        }
      };

      const alerts = alertingService.evaluateMetrics(metrics);

      expect(alerts.length).toBe(3);
      expect(alerts.some(a => a.rule.id === 'high_cpu')).toBe(true);
      expect(alerts.some(a => a.rule.id === 'high_memory')).toBe(true);
      expect(alerts.some(a => a.rule.id === 'low_disk')).toBe(true);
    });

    test('should evaluate nested metric paths', () => {
      const metrics = {
        api: {
          errorRate: 10.5
        }
      };

      const alerts = alertingService.evaluateMetrics(metrics);

      const errorAlert = alerts.find(a => a.rule.id === 'high_error_rate');
      expect(errorAlert).toBeDefined();
      expect(errorAlert.currentValue).toBe(10.5);
    });
  });

  describe('Alert Severity Levels', () => {
    test('should categorize alerts by severity', () => {
      const metrics = {
        system: {
          cpu: { usage: 85 },
          memory: { usedPercentage: 90 }
        }
      };

      const alerts = alertingService.evaluateMetrics(metrics);

      const critical = alerts.filter(a => a.severity === 'critical');
      const warning = alerts.filter(a => a.severity === 'warning');

      expect(critical.length).toBeGreaterThan(0);
      expect(warning.length).toBeGreaterThan(0);
    });

    test('should support info severity level', () => {
      alertingService.addRule({
        id: 'info_test',
        name: 'Info Alert',
        metric: 'business.totalPosts',
        condition: 'greater_than',
        threshold: 1000,
        severity: 'info',
        duration: 0
      });

      const metrics = {
        business: { totalPosts: 1500 }
      };

      const alerts = alertingService.evaluateMetrics(metrics);

      const infoAlert = alerts.find(a => a.rule.id === 'info_test');
      expect(infoAlert).toBeDefined();
      expect(infoAlert.severity).toBe('info');
    });
  });

  describe('Alert Conditions', () => {
    test('should support greater_than condition', () => {
      const metrics = {
        system: { cpu: { usage: 85 } }
      };

      const alerts = alertingService.evaluateMetrics(metrics);
      expect(alerts.some(a => a.rule.id === 'high_cpu')).toBe(true);
    });

    test('should support less_than condition', () => {
      alertingService.addRule({
        id: 'low_memory',
        name: 'Low Memory Available',
        metric: 'system.memory.free',
        condition: 'less_than',
        threshold: 1000000, // 1MB
        severity: 'warning',
        duration: 0
      });

      const metrics = {
        system: { memory: { free: 500000 } }
      };

      const alerts = alertingService.evaluateMetrics(metrics);
      expect(alerts.some(a => a.rule.id === 'low_memory')).toBe(true);
    });

    test('should support equals condition', () => {
      alertingService.addRule({
        id: 'db_disconnected',
        name: 'Database Disconnected',
        metric: 'database.connected',
        condition: 'equals',
        threshold: false,
        severity: 'critical',
        duration: 0
      });

      const metrics = {
        database: { connected: false }
      };

      const alerts = alertingService.evaluateMetrics(metrics);
      expect(alerts.some(a => a.rule.id === 'db_disconnected')).toBe(true);
    });
  });

  describe('Alert Deduplication', () => {
    test('should deduplicate repeated alerts', () => {
      const metrics = {
        system: { cpu: { usage: 90 } }
      };

      const alerts1 = alertingService.evaluateMetrics(metrics);
      const alerts2 = alertingService.evaluateMetrics(metrics);

      expect(alerts1.length).toBeGreaterThan(0);
      expect(alerts2.length).toBe(0); // Should be deduplicated
    });

    test('should allow alerts after deduplication window', (done) => {
      const metrics = {
        system: { cpu: { usage: 90 } }
      };

      const alerts1 = alertingService.evaluateMetrics(metrics);
      expect(alerts1.length).toBeGreaterThan(0);

      setTimeout(() => {
        const alerts2 = alertingService.evaluateMetrics(metrics);
        expect(alerts2.length).toBeGreaterThan(0); // Should trigger again
        done();
      }, 150); // Wait longer than deduplication window
    });

    test('should reset deduplication on recovery', () => {
      const highMetrics = {
        system: { cpu: { usage: 90 } }
      };
      const normalMetrics = {
        system: { cpu: { usage: 50 } }
      };

      alertingService.evaluateMetrics(highMetrics);
      alertingService.evaluateMetrics(normalMetrics); // Recovery
      const alerts = alertingService.evaluateMetrics(highMetrics);

      expect(alerts.length).toBeGreaterThan(0); // Should trigger again after recovery
    });
  });

  describe('Alert Rate Limiting', () => {
    test('should limit alerts per minute', () => {
      const metrics = {
        system: { cpu: { usage: 90 } }
      };

      let totalAlerts = 0;
      for (let i = 0; i < 20; i++) {
        alertingService.addRule({
          id: `test_rule_${i}`,
          name: `Test Rule ${i}`,
          metric: 'system.cpu.usage',
          condition: 'greater_than',
          threshold: 50,
          severity: 'info',
          duration: 0
        });
      }

      const alerts = alertingService.evaluateMetrics(metrics);
      totalAlerts += alerts.length;

      expect(totalAlerts).toBeLessThanOrEqual(10); // Max 10 per minute
    });
  });

  describe('Alert Channels', () => {
    test('should send alerts to console channel', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const metrics = {
        system: { cpu: { usage: 90 } }
      };

      alertingService.evaluateMetrics(metrics);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('should send alerts to file channel', () => {
      const metrics = {
        system: { cpu: { usage: 90 } }
      };

      alertingService.evaluateMetrics(metrics);

      expect(fs.existsSync(testAlertLogPath)).toBe(true);
      const logContent = fs.readFileSync(testAlertLogPath, 'utf-8');
      expect(logContent).toContain('High CPU Usage');
      expect(logContent).toContain('critical');
    });

    test('should send alerts to webhook channel', () => {
      const metrics = {
        system: { cpu: { usage: 90 } }
      };

      alertingService.evaluateMetrics(metrics);

      expect(webhookCalls.length).toBeGreaterThan(0);
      expect(webhookCalls[0].rule.name).toBe('High CPU Usage');
      expect(webhookCalls[0].severity).toBe('critical');
    });

    test('should include alert metadata in channels', () => {
      const metrics = {
        system: { cpu: { usage: 90 } }
      };

      alertingService.evaluateMetrics(metrics);

      const alert = webhookCalls[0];
      expect(alert.id).toBeDefined();
      expect(alert.timestamp).toBeDefined();
      expect(alert.rule).toBeDefined();
      expect(alert.currentValue).toBe(90);
      expect(alert.threshold).toBe(80);
    });
  });

  describe('Alert History', () => {
    test('should maintain alert history', () => {
      const metrics = {
        system: { cpu: { usage: 90 } }
      };

      alertingService.evaluateMetrics(metrics);

      const history = alertingService.getAlertHistory();

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].rule.id).toBe('high_cpu');
    });

    test('should limit alert history size', () => {
      const metrics = {
        system: { cpu: { usage: 90 } }
      };

      // Generate many unique alerts
      for (let i = 0; i < 150; i++) {
        alertingService.addRule({
          id: `test_${i}`,
          name: `Test ${i}`,
          metric: 'system.cpu.usage',
          condition: 'greater_than',
          threshold: 50,
          severity: 'info',
          duration: 0
        });
      }

      alertingService.evaluateMetrics(metrics);
      const history = alertingService.getAlertHistory();

      expect(history.length).toBeLessThanOrEqual(100); // Max 100 in history
    });

    test('should filter history by severity', () => {
      const metrics = {
        system: {
          cpu: { usage: 90 },
          memory: { usedPercentage: 90 }
        }
      };

      alertingService.evaluateMetrics(metrics);

      const criticalHistory = alertingService.getAlertHistory({ severity: 'critical' });
      const warningHistory = alertingService.getAlertHistory({ severity: 'warning' });

      expect(criticalHistory.every(a => a.severity === 'critical')).toBe(true);
      expect(warningHistory.every(a => a.severity === 'warning')).toBe(true);
    });

    test('should filter history by time range', () => {
      const now = Date.now();
      const metrics = {
        system: { cpu: { usage: 90 } }
      };

      alertingService.evaluateMetrics(metrics);

      const history = alertingService.getAlertHistory({
        startTime: now - 5000,
        endTime: now + 5000
      });

      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('Alert Acknowledgment', () => {
    test('should acknowledge alerts', () => {
      const metrics = {
        system: { cpu: { usage: 90 } }
      };

      alertingService.evaluateMetrics(metrics);
      const history = alertingService.getAlertHistory();
      const alertId = history[0].id;

      const result = alertingService.acknowledgeAlert(alertId, 'user@example.com');

      expect(result).toBe(true);

      const acknowledgedAlert = alertingService.getAlertHistory().find(a => a.id === alertId);
      expect(acknowledgedAlert.acknowledged).toBe(true);
      expect(acknowledgedAlert.acknowledgedBy).toBe('user@example.com');
      expect(acknowledgedAlert.acknowledgedAt).toBeDefined();
    });

    test('should filter out acknowledged alerts from active', () => {
      const metrics = {
        system: { cpu: { usage: 90 } }
      };

      alertingService.evaluateMetrics(metrics);
      const history = alertingService.getAlertHistory();
      const alertId = history[0].id;

      alertingService.acknowledgeAlert(alertId, 'user@example.com');

      const activeAlerts = alertingService.getActiveAlerts();
      expect(activeAlerts.every(a => !a.acknowledged)).toBe(true);
    });
  });

  describe('Active Alerts', () => {
    test('should return currently active alerts', () => {
      const metrics = {
        system: {
          cpu: { usage: 90 },
          memory: { usedPercentage: 90 }
        }
      };

      alertingService.evaluateMetrics(metrics);

      const activeAlerts = alertingService.getActiveAlerts();

      expect(Array.isArray(activeAlerts)).toBe(true);
      expect(activeAlerts.length).toBeGreaterThan(0);
      expect(activeAlerts.every(a => !a.acknowledged)).toBe(true);
    });

    test('should clear alerts on recovery', () => {
      const highMetrics = {
        system: { cpu: { usage: 90 } }
      };
      const normalMetrics = {
        system: { cpu: { usage: 50 } }
      };

      alertingService.evaluateMetrics(highMetrics);
      let activeAlerts = alertingService.getActiveAlerts();
      expect(activeAlerts.length).toBeGreaterThan(0);

      alertingService.evaluateMetrics(normalMetrics);
      activeAlerts = alertingService.getActiveAlerts();

      const cpuAlert = activeAlerts.find(a => a.rule.id === 'high_cpu');
      expect(cpuAlert).toBeUndefined();
    });
  });

  describe('Rule Management', () => {
    test('should add new rules dynamically', () => {
      alertingService.addRule({
        id: 'new_rule',
        name: 'New Rule',
        metric: 'business.activeAgents',
        condition: 'less_than',
        threshold: 1,
        severity: 'warning',
        duration: 0
      });

      const metrics = {
        business: { activeAgents: 0 }
      };

      const alerts = alertingService.evaluateMetrics(metrics);
      expect(alerts.some(a => a.rule.id === 'new_rule')).toBe(true);
    });

    test('should remove rules', () => {
      alertingService.removeRule('high_cpu');

      const metrics = {
        system: { cpu: { usage: 90 } }
      };

      const alerts = alertingService.evaluateMetrics(metrics);
      expect(alerts.some(a => a.rule.id === 'high_cpu')).toBe(false);
    });

    test('should update existing rules', () => {
      alertingService.updateRule('high_cpu', { threshold: 95 });

      const metrics = {
        system: { cpu: { usage: 90 } }
      };

      const alerts = alertingService.evaluateMetrics(metrics);
      expect(alerts.some(a => a.rule.id === 'high_cpu')).toBe(false); // Below new threshold

      metrics.system.cpu.usage = 96;
      const alerts2 = alertingService.evaluateMetrics(metrics);
      expect(alerts2.some(a => a.rule.id === 'high_cpu')).toBe(true);
    });
  });

  describe('Alert Statistics', () => {
    test('should provide alert statistics', () => {
      const metrics = {
        system: {
          cpu: { usage: 90 },
          memory: { usedPercentage: 90 }
        }
      };

      alertingService.evaluateMetrics(metrics);

      const stats = alertingService.getAlertStats();

      expect(stats.totalAlerts).toBeGreaterThan(0);
      expect(stats.activeAlerts).toBeGreaterThan(0);
      expect(stats.alertsBySeverity).toBeDefined();
      expect(stats.alertsBySeverity.critical).toBeGreaterThan(0);
      expect(stats.alertsByRule).toBeDefined();
    });
  });
});
