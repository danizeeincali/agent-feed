/**
 * Performance Alerting System
 * 
 * Monitors performance metrics and triggers alerts based on configurable thresholds:
 * - Real-time threshold monitoring
 * - Alert escalation and de-escalation
 * - Multiple notification channels
 * - Alert correlation and suppression
 * - Performance regression detection
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');

class PerformanceAlertSystem extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      alertThresholds: {
        claudeResponseTime: {
          warning: 2000,  // 2 seconds
          critical: 5000, // 5 seconds
          sustained: 30000 // Alert if threshold exceeded for 30 seconds
        },
        sseDeliveryTime: {
          warning: 100,   // 100ms
          critical: 500,  // 500ms
          sustained: 10000 // 10 seconds
        },
        memoryPerInstance: {
          warning: 50 * 1024 * 1024,  // 50MB
          critical: 100 * 1024 * 1024, // 100MB
          sustained: 60000 // 1 minute
        },
        errorRate: {
          warning: 0.01,  // 1%
          critical: 0.05, // 5%
          sustained: 20000 // 20 seconds
        },
        concurrentConnections: {
          warning: 50,
          critical: 100,
          sustained: 30000 // 30 seconds
        },
        memoryLeakGrowthRate: {
          warning: 0.05,  // 5% growth per check
          critical: 0.15, // 15% growth per check
          sustained: 300000 // 5 minutes
        }
      },
      notificationChannels: {
        console: true,
        email: config.email || null,
        webhook: config.webhook || null,
        file: config.alertLogFile || './monitoring/alerts/alert-log.json'
      },
      alertSuppressionTime: 300000, // 5 minutes - don't repeat same alert
      maxAlertsPerHour: 20,
      regressionDetection: {
        enabled: true,
        baselineWindow: 3600000, // 1 hour baseline
        deviationThreshold: 0.3 // 30% deviation from baseline
      },
      alertsDir: config.alertsDir || './monitoring/alerts',
      ...config
    };
    
    this.activeAlerts = new Map(); // alertId -> alert details
    this.alertHistory = [];
    this.suppressedAlerts = new Map(); // alertType -> timestamp
    this.alertCounts = new Map(); // hour -> count
    this.baselines = new Map(); // metric -> baseline data
    this.metricHistory = new Map(); // metric -> recent values
    
    this.emailTransporter = null;
    this.isMonitoring = false;
    
    this.initializeAlerting();
  }

  async initializeAlerting() {
    try {
      await fs.mkdir(this.config.alertsDir, { recursive: true });
      
      // Setup email transporter if configured
      if (this.config.notificationChannels.email) {
        this.setupEmailNotifications();
      }
      
      // Load existing alert history
      await this.loadAlertHistory();
      
      console.log('Performance alert system initialized');
      
    } catch (error) {
      console.error('Failed to initialize alert system:', error);
      throw error;
    }
  }

  setupEmailNotifications() {
    if (!this.config.notificationChannels.email) return;
    
    const emailConfig = this.config.notificationChannels.email;
    
    this.emailTransporter = nodemailer.createTransporter({
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port,
      secure: emailConfig.smtp.secure,
      auth: {
        user: emailConfig.smtp.user,
        pass: emailConfig.smtp.password
      }
    });
    
    console.log('Email notifications configured');
  }

  startMonitoring() {
    if (this.isMonitoring) {
      console.log('Alert monitoring already active');
      return;
    }
    
    this.isMonitoring = true;
    console.log('Starting performance alert monitoring...');
    
    // Start baseline calculation for regression detection
    if (this.config.regressionDetection.enabled) {
      this.startBaselineCalculation();
    }
    
    this.emit('alert_monitoring_started');
  }

  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    // Save alert history
    this.saveAlertHistory();
    
    console.log('Alert monitoring stopped');
    this.emit('alert_monitoring_stopped');
  }

  // Main metric checking function
  checkMetric(metricName, value, timestamp = Date.now()) {
    if (!this.isMonitoring) return;
    
    const threshold = this.config.alertThresholds[metricName];
    if (!threshold) {
      console.warn(`No threshold configured for metric: ${metricName}`);
      return;
    }
    
    // Store metric for history tracking
    this.storeMetricValue(metricName, value, timestamp);
    
    // Check immediate thresholds
    this.checkImmediateThresholds(metricName, value, threshold, timestamp);
    
    // Check sustained thresholds
    this.checkSustainedThresholds(metricName, value, threshold, timestamp);
    
    // Check for performance regression
    if (this.config.regressionDetection.enabled) {
      this.checkPerformanceRegression(metricName, value, timestamp);
    }
  }

  checkImmediateThresholds(metricName, value, threshold, timestamp) {
    let alertLevel = null;
    
    if (value >= threshold.critical) {
      alertLevel = 'critical';
    } else if (value >= threshold.warning) {
      alertLevel = 'warning';
    }
    
    if (alertLevel) {
      const alertId = `${metricName}_${alertLevel}_immediate`;
      
      if (!this.isAlertSuppressed(alertId)) {
        this.triggerAlert({
          id: alertId,
          type: 'threshold',
          level: alertLevel,
          metric: metricName,
          value: value,
          threshold: threshold[alertLevel],
          message: `${metricName} ${alertLevel}: ${value} exceeds threshold of ${threshold[alertLevel]}`,
          timestamp: timestamp,
          sustained: false
        });
      }
    }
  }

  checkSustainedThresholds(metricName, value, threshold, timestamp) {
    const history = this.metricHistory.get(metricName) || [];
    
    // Check for sustained threshold violations
    const sustainedPeriod = threshold.sustained;
    const cutoffTime = timestamp - sustainedPeriod;
    
    const recentValues = history.filter(h => h.timestamp > cutoffTime);
    
    if (recentValues.length === 0) return;
    
    // Check if all recent values exceed thresholds
    const allCritical = recentValues.every(h => h.value >= threshold.critical);
    const allWarning = recentValues.every(h => h.value >= threshold.warning);
    
    let sustainedLevel = null;
    if (allCritical && recentValues.length >= 3) {
      sustainedLevel = 'critical';
    } else if (allWarning && recentValues.length >= 5) {
      sustainedLevel = 'warning';
    }
    
    if (sustainedLevel) {
      const alertId = `${metricName}_${sustainedLevel}_sustained`;
      
      if (!this.isAlertSuppressed(alertId)) {
        const avgValue = recentValues.reduce((sum, h) => sum + h.value, 0) / recentValues.length;
        
        this.triggerAlert({
          id: alertId,
          type: 'sustained_threshold',
          level: sustainedLevel,
          metric: metricName,
          value: avgValue,
          threshold: threshold[sustainedLevel],
          message: `${metricName} sustained ${sustainedLevel}: Average ${avgValue.toFixed(2)} exceeds threshold of ${threshold[sustainedLevel]} for ${sustainedPeriod/1000}s`,
          timestamp: timestamp,
          sustained: true,
          duration: sustainedPeriod,
          sampleCount: recentValues.length
        });
      }
    }
  }

  checkPerformanceRegression(metricName, value, timestamp) {
    const baseline = this.baselines.get(metricName);
    if (!baseline) return;
    
    const deviationThreshold = this.config.regressionDetection.deviationThreshold;
    const expectedRange = {
      min: baseline.average * (1 - deviationThreshold),
      max: baseline.average * (1 + deviationThreshold)
    };
    
    if (value > expectedRange.max) {
      const deviation = ((value - baseline.average) / baseline.average) * 100;
      const alertId = `${metricName}_regression_performance`;
      
      if (!this.isAlertSuppressed(alertId)) {
        this.triggerAlert({
          id: alertId,
          type: 'performance_regression',
          level: deviation > 50 ? 'critical' : 'warning',
          metric: metricName,
          value: value,
          baseline: baseline.average,
          deviation: deviation,
          message: `${metricName} performance regression: ${value.toFixed(2)} is ${deviation.toFixed(1)}% above baseline (${baseline.average.toFixed(2)})`,
          timestamp: timestamp,
          regression: true
        });
      }
    }
  }

  storeMetricValue(metricName, value, timestamp) {
    if (!this.metricHistory.has(metricName)) {
      this.metricHistory.set(metricName, []);
    }
    
    const history = this.metricHistory.get(metricName);
    history.push({ value, timestamp });
    
    // Keep only recent history (last 2 hours)
    const cutoff = timestamp - (2 * 60 * 60 * 1000);
    this.metricHistory.set(metricName, history.filter(h => h.timestamp > cutoff));
  }

  triggerAlert(alert) {
    // Check rate limiting
    if (!this.checkRateLimit()) {
      console.warn('Alert rate limit exceeded, suppressing alert:', alert.id);
      return;
    }
    
    // Add to active alerts
    this.activeAlerts.set(alert.id, {
      ...alert,
      createdAt: alert.timestamp,
      acknowledged: false,
      escalated: false,
      notificationsSent: 0
    });
    
    // Add to history
    this.alertHistory.push(alert);
    
    // Suppress similar alerts
    this.suppressAlert(alert.id);
    
    // Send notifications
    this.sendNotifications(alert);
    
    // Emit event
    this.emit('alert_triggered', alert);
    
    console.log(`ALERT [${alert.level.toUpperCase()}]: ${alert.message}`);
  }

  async sendNotifications(alert) {
    const notifications = [];
    
    // Console notification
    if (this.config.notificationChannels.console) {
      notifications.push(this.sendConsoleNotification(alert));
    }
    
    // Email notification
    if (this.config.notificationChannels.email && ['critical', 'warning'].includes(alert.level)) {
      notifications.push(this.sendEmailNotification(alert));
    }
    
    // Webhook notification
    if (this.config.notificationChannels.webhook) {
      notifications.push(this.sendWebhookNotification(alert));
    }
    
    // File logging
    if (this.config.notificationChannels.file) {
      notifications.push(this.logAlertToFile(alert));
    }
    
    try {
      await Promise.allSettled(notifications);
      
      // Update notification count
      const activeAlert = this.activeAlerts.get(alert.id);
      if (activeAlert) {
        activeAlert.notificationsSent++;
      }
      
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }

  sendConsoleNotification(alert) {
    const emoji = this.getAlertEmoji(alert.level);
    const timestamp = new Date(alert.timestamp).toISOString();
    
    console.log(`\n${emoji} PERFORMANCE ALERT ${emoji}`);
    console.log(`Level: ${alert.level.toUpperCase()}`);
    console.log(`Metric: ${alert.metric}`);
    console.log(`Message: ${alert.message}`);
    console.log(`Timestamp: ${timestamp}`);
    console.log(`Alert ID: ${alert.id}`);
    
    if (alert.sustained) {
      console.log(`Duration: ${alert.duration}ms`);
      console.log(`Sample Count: ${alert.sampleCount}`);
    }
    
    if (alert.regression) {
      console.log(`Baseline: ${alert.baseline}`);
      console.log(`Deviation: ${alert.deviation.toFixed(1)}%`);
    }
    
    console.log('─'.repeat(60));
    
    return Promise.resolve();
  }

  async sendEmailNotification(alert) {
    if (!this.emailTransporter) return;
    
    const emailConfig = this.config.notificationChannels.email;
    const subject = `[${alert.level.toUpperCase()}] Claude AI Performance Alert - ${alert.metric}`;
    
    const htmlContent = this.generateAlertEmailHTML(alert);
    const textContent = this.generateAlertEmailText(alert);
    
    const mailOptions = {
      from: emailConfig.from,
      to: emailConfig.to,
      subject: subject,
      text: textContent,
      html: htmlContent
    };
    
    try {
      await this.emailTransporter.sendMail(mailOptions);
      console.log(`Email notification sent for alert: ${alert.id}`);
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  async sendWebhookNotification(alert) {
    const webhookConfig = this.config.notificationChannels.webhook;
    
    const payload = {
      alert: alert,
      timestamp: new Date().toISOString(),
      system: 'claude-ai-performance-monitor'
    };
    
    try {
      const response = await fetch(webhookConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...webhookConfig.headers
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Webhook responded with status: ${response.status}`);
      }
      
      console.log(`Webhook notification sent for alert: ${alert.id}`);
      
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
    }
  }

  async logAlertToFile(alert) {
    try {
      const logEntry = {
        ...alert,
        loggedAt: new Date().toISOString()
      };
      
      const logFile = this.config.notificationChannels.file;
      
      // Read existing log
      let existingLog = [];
      try {
        const existingData = await fs.readFile(logFile, 'utf8');
        existingLog = JSON.parse(existingData);
      } catch (error) {
        // File doesn't exist or is empty, start with empty array
      }
      
      // Add new entry
      existingLog.push(logEntry);
      
      // Keep only last 1000 entries
      if (existingLog.length > 1000) {
        existingLog = existingLog.slice(-1000);
      }
      
      // Write back to file
      await fs.writeFile(logFile, JSON.stringify(existingLog, null, 2));
      
    } catch (error) {
      console.error('Failed to log alert to file:', error);
    }
  }

  // Utility functions
  isAlertSuppressed(alertId) {
    const suppressedUntil = this.suppressedAlerts.get(alertId);
    if (!suppressedUntil) return false;
    
    return Date.now() < suppressedUntil;
  }

  suppressAlert(alertId) {
    const suppressUntil = Date.now() + this.config.alertSuppressionTime;
    this.suppressedAlerts.set(alertId, suppressUntil);
  }

  checkRateLimit() {
    const currentHour = Math.floor(Date.now() / (60 * 60 * 1000));
    const currentCount = this.alertCounts.get(currentHour) || 0;
    
    if (currentCount >= this.config.maxAlertsPerHour) {
      return false;
    }
    
    this.alertCounts.set(currentHour, currentCount + 1);
    
    // Clean old hour counts
    const cutoffHour = currentHour - 24; // Keep last 24 hours
    for (const [hour, count] of this.alertCounts) {
      if (hour < cutoffHour) {
        this.alertCounts.delete(hour);
      }
    }
    
    return true;
  }

  getAlertEmoji(level) {
    switch (level) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📊';
    }
  }

  startBaselineCalculation() {
    // Calculate baselines periodically
    setInterval(() => {
      this.calculateBaselines();
    }, 60000); // Every minute
  }

  calculateBaselines() {
    const baselineWindow = this.config.regressionDetection.baselineWindow;
    const cutoffTime = Date.now() - baselineWindow;
    
    for (const [metricName, history] of this.metricHistory) {
      const baselineData = history.filter(h => h.timestamp > cutoffTime);
      
      if (baselineData.length < 10) continue; // Need at least 10 data points
      
      const values = baselineData.map(h => h.value);
      const average = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) / values.length;
      const standardDeviation = Math.sqrt(variance);
      
      this.baselines.set(metricName, {
        average,
        standardDeviation,
        min: Math.min(...values),
        max: Math.max(...values),
        sampleSize: values.length,
        calculatedAt: Date.now()
      });
    }
  }

  generateAlertEmailHTML(alert) {
    const timestamp = new Date(alert.timestamp).toLocaleString();
    
    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">Claude AI Performance Alert</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Level: ${alert.level.toUpperCase()}</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6;">
            <h2 style="color: #495057; margin-top: 0;">Alert Details</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #dee2e6;">Metric:</td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${alert.metric}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #dee2e6;">Current Value:</td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${alert.value}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #dee2e6;">Threshold:</td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${alert.threshold}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #dee2e6;">Timestamp:</td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${timestamp}</td>
              </tr>
              ${alert.sustained ? `
              <tr>
                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #dee2e6;">Duration:</td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${alert.duration/1000}s</td>
              </tr>
              ` : ''}
            </table>
            
            <div style="margin: 20px 0; padding: 15px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px;">
              <strong>Message:</strong> ${alert.message}
            </div>
            
            ${alert.regression ? `
            <div style="margin: 20px 0; padding: 15px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px;">
              <strong>Performance Regression Detected:</strong><br>
              Baseline: ${alert.baseline}<br>
              Deviation: ${alert.deviation.toFixed(1)}%
            </div>
            ` : ''}
          </div>
          
          <div style="background: #6c757d; color: white; padding: 10px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px;">
            Claude AI Performance Monitoring System
          </div>
        </body>
      </html>
    `;
  }

  generateAlertEmailText(alert) {
    const timestamp = new Date(alert.timestamp).toLocaleString();
    
    let text = `
CLAUDE AI PERFORMANCE ALERT

Level: ${alert.level.toUpperCase()}
Metric: ${alert.metric}
Current Value: ${alert.value}
Threshold: ${alert.threshold}
Timestamp: ${timestamp}
`;
    
    if (alert.sustained) {
      text += `Duration: ${alert.duration/1000}s\n`;
    }
    
    text += `\nMessage: ${alert.message}\n`;
    
    if (alert.regression) {
      text += `\nPerformance Regression Detected:
Baseline: ${alert.baseline}
Deviation: ${alert.deviation.toFixed(1)}%\n`;
    }
    
    text += '\n---\nClaude AI Performance Monitoring System';
    
    return text;
  }

  async loadAlertHistory() {
    try {
      const historyFile = path.join(this.config.alertsDir, 'alert-history.json');
      const data = await fs.readFile(historyFile, 'utf8');
      this.alertHistory = JSON.parse(data);
      console.log(`Loaded ${this.alertHistory.length} alerts from history`);
    } catch (error) {
      // File doesn't exist or error reading, start with empty history
      this.alertHistory = [];
    }
  }

  async saveAlertHistory() {
    try {
      const historyFile = path.join(this.config.alertsDir, 'alert-history.json');
      
      // Keep only last 1000 alerts in history
      const historyToSave = this.alertHistory.slice(-1000);
      
      await fs.writeFile(historyFile, JSON.stringify(historyToSave, null, 2));
      console.log(`Saved ${historyToSave.length} alerts to history`);
    } catch (error) {
      console.error('Failed to save alert history:', error);
    }
  }

  // Alert management functions
  acknowledgeAlert(alertId) {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = Date.now();
      this.emit('alert_acknowledged', alert);
      return true;
    }
    return false;
  }

  resolveAlert(alertId) {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      this.activeAlerts.delete(alertId);
      this.emit('alert_resolved', alert);
      return true;
    }
    return false;
  }

  getActiveAlerts() {
    return Array.from(this.activeAlerts.values());
  }

  getAlertHistory(hours = 24) {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.alertHistory.filter(alert => alert.timestamp > cutoff);
  }

  getAlertSummary() {
    const activeCount = this.activeAlerts.size;
    const recentHistory = this.getAlertHistory(24);
    
    const summary = {
      active: activeCount,
      last24Hours: recentHistory.length,
      byLevel: {
        critical: recentHistory.filter(a => a.level === 'critical').length,
        warning: recentHistory.filter(a => a.level === 'warning').length,
        info: recentHistory.filter(a => a.level === 'info').length
      },
      topMetrics: this.getTopAlertingMetrics(recentHistory)
    };
    
    return summary;
  }

  getTopAlertingMetrics(alerts, limit = 5) {
    const metricCounts = {};
    
    alerts.forEach(alert => {
      metricCounts[alert.metric] = (metricCounts[alert.metric] || 0) + 1;
    });
    
    return Object.entries(metricCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([metric, count]) => ({ metric, count }));
  }
}

module.exports = PerformanceAlertSystem;