const fs = require('fs');
const crypto = require('crypto');

class AlertingService {
  constructor(options = {}) {
    this.rules = options.rules || [];
    this.channels = options.channels || {};
    this.deduplicationWindow = options.deduplicationWindow || 300000; // 5 minutes default
    this.maxAlertsPerMinute = options.maxAlertsPerMinute || 100;

    this.alertHistory = [];
    this.activeAlerts = new Map(); // Map of rule ID to alert
    this.lastAlertTime = new Map(); // Map of rule ID to timestamp
    this.alertCounts = []; // Array of timestamps for rate limiting
    this.maxHistorySize = options.maxHistorySize || 100;
  }

  addRule(rule) {
    // Validate rule
    if (!rule.id || !rule.name || !rule.metric || !rule.condition || rule.threshold === undefined) {
      throw new Error('Invalid rule: missing required fields');
    }

    // Remove existing rule with same ID
    this.rules = this.rules.filter(r => r.id !== rule.id);

    // Add new rule
    this.rules.push({
      duration: 0,
      ...rule
    });
  }

  removeRule(ruleId) {
    this.rules = this.rules.filter(r => r.id !== ruleId);
    this.activeAlerts.delete(ruleId);
    this.lastAlertTime.delete(ruleId);
  }

  updateRule(ruleId, updates) {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      Object.assign(rule, updates);
    }
  }

  evaluateMetrics(metrics) {
    const now = Date.now();
    const triggeredAlerts = [];

    // Clean up old alert counts for rate limiting
    this.alertCounts = this.alertCounts.filter(t => t > now - 60000);

    // Check if we've exceeded rate limit
    if (this.alertCounts.length >= this.maxAlertsPerMinute) {
      return [];
    }

    for (const rule of this.rules) {
      const currentValue = this.getNestedValue(metrics, rule.metric);

      if (currentValue === undefined) {
        continue;
      }

      const isTriggered = this.evaluateCondition(currentValue, rule.condition, rule.threshold);

      if (isTriggered) {
        // Check if we should deduplicate
        const lastAlertTime = this.lastAlertTime.get(rule.id);
        if (lastAlertTime && (now - lastAlertTime) < this.deduplicationWindow) {
          continue; // Skip - still in deduplication window
        }

        // Check rate limit
        if (this.alertCounts.length >= this.maxAlertsPerMinute) {
          break;
        }

        const alert = this.createAlert(rule, currentValue, now);
        triggeredAlerts.push(alert);

        // Update tracking
        this.activeAlerts.set(rule.id, alert);
        this.lastAlertTime.set(rule.id, now);
        this.alertCounts.push(now);

        // Add to history
        this.addToHistory(alert);

        // Send to channels
        this.sendAlert(alert);
      } else {
        // Alert recovered
        if (this.activeAlerts.has(rule.id)) {
          this.activeAlerts.delete(rule.id);
          // Reset deduplication on recovery
          this.lastAlertTime.delete(rule.id);
        }
      }
    }

    return triggeredAlerts;
  }

  getNestedValue(obj, path) {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  evaluateCondition(value, condition, threshold) {
    switch (condition) {
      case 'greater_than':
        return value > threshold;
      case 'less_than':
        return value < threshold;
      case 'equals':
        return value === threshold;
      case 'not_equals':
        return value !== threshold;
      case 'greater_or_equal':
        return value >= threshold;
      case 'less_or_equal':
        return value <= threshold;
      default:
        return false;
    }
  }

  createAlert(rule, currentValue, timestamp) {
    return {
      id: crypto.randomUUID(),
      timestamp,
      rule: { ...rule },
      currentValue,
      threshold: rule.threshold,
      severity: rule.severity,
      acknowledged: false,
      acknowledgedBy: null,
      acknowledgedAt: null
    };
  }

  addToHistory(alert) {
    this.alertHistory.unshift(alert);

    // Limit history size
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory.pop();
    }
  }

  sendAlert(alert) {
    // Console channel
    if (this.channels.console?.enabled !== false) {
      const severitySymbol = {
        critical: '🔴',
        warning: '⚠️',
        info: 'ℹ️'
      }[alert.severity] || '•';

      console.log(`${severitySymbol} ALERT [${alert.severity.toUpperCase()}] ${alert.rule.name}`);
      console.log(`   Metric: ${alert.rule.metric}`);
      console.log(`   Current: ${alert.currentValue} | Threshold: ${alert.threshold}`);
      console.log(`   Time: ${new Date(alert.timestamp).toISOString()}`);
    }

    // File channel
    if (this.channels.file?.enabled) {
      try {
        const logEntry = JSON.stringify({
          ...alert,
          timestamp: new Date(alert.timestamp).toISOString()
        }) + '\n';

        fs.appendFileSync(this.channels.file.path, logEntry);
      } catch (error) {
        console.error('Failed to write alert to file:', error);
      }
    }

    // Webhook channel
    if (this.channels.webhook?.enabled) {
      try {
        if (this.channels.webhook.handler) {
          // Use custom handler (for testing)
          this.channels.webhook.handler(alert);
        } else {
          // Would make HTTP request in production
          // fetch(this.channels.webhook.url, {
          //   method: this.channels.webhook.method || 'POST',
          //   headers: { 'Content-Type': 'application/json' },
          //   body: JSON.stringify(alert)
          // });
        }
      } catch (error) {
        console.error('Failed to send alert to webhook:', error);
      }
    }
  }

  getAlertHistory(filters = {}) {
    let history = [...this.alertHistory];

    // Filter by severity
    if (filters.severity) {
      history = history.filter(a => a.severity === filters.severity);
    }

    // Filter by time range
    if (filters.startTime || filters.endTime) {
      history = history.filter(a => {
        if (filters.startTime && a.timestamp < filters.startTime) return false;
        if (filters.endTime && a.timestamp > filters.endTime) return false;
        return true;
      });
    }

    // Filter by rule
    if (filters.ruleId) {
      history = history.filter(a => a.rule.id === filters.ruleId);
    }

    return history;
  }

  getActiveAlerts() {
    return Array.from(this.activeAlerts.values()).filter(a => !a.acknowledged);
  }

  acknowledgeAlert(alertId, acknowledgedBy) {
    const alert = this.alertHistory.find(a => a.id === alertId);

    if (!alert) {
      return false;
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = Date.now();

    // Update in active alerts if present
    for (const [ruleId, activeAlert] of this.activeAlerts.entries()) {
      if (activeAlert.id === alertId) {
        this.activeAlerts.set(ruleId, alert);
        break;
      }
    }

    return true;
  }

  getAlertStats() {
    const stats = {
      totalAlerts: this.alertHistory.length,
      activeAlerts: this.getActiveAlerts().length,
      acknowledgedAlerts: this.alertHistory.filter(a => a.acknowledged).length,
      alertsBySeverity: {
        critical: 0,
        warning: 0,
        info: 0
      },
      alertsByRule: {}
    };

    for (const alert of this.alertHistory) {
      // Count by severity
      if (stats.alertsBySeverity[alert.severity] !== undefined) {
        stats.alertsBySeverity[alert.severity]++;
      }

      // Count by rule
      const ruleId = alert.rule.id;
      if (!stats.alertsByRule[ruleId]) {
        stats.alertsByRule[ruleId] = {
          name: alert.rule.name,
          count: 0
        };
      }
      stats.alertsByRule[ruleId].count++;
    }

    return stats;
  }

  stop() {
    // Cleanup if needed
    this.activeAlerts.clear();
  }
}

module.exports = AlertingService;
