/**
 * Alert System for Link Preview Service
 * Comprehensive monitoring and alerting for failures, performance, and patterns
 */

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

export class AlertSystem extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      dataPath: config.dataPath || '/workspaces/agent-feed/.claude-flow/nld',
      alertThresholds: {
        failureRate: config.failureRateThreshold || 0.15, // 15%
        responseTime: config.responseTimeThreshold || 10000, // 10s
        quotaUsage: config.quotaUsageThreshold || 0.80, // 80%
        circuitBreakerTrips: config.circuitBreakerThreshold || 3,
        consecutiveFailures: config.consecutiveFailuresThreshold || 5,
        patternConfidence: config.patternConfidenceThreshold || 0.85
      },
      monitoringWindows: {
        short: config.shortWindow || 5 * 60 * 1000, // 5 minutes
        medium: config.mediumWindow || 30 * 60 * 1000, // 30 minutes
        long: config.longWindow || 2 * 60 * 60 * 1000 // 2 hours
      },
      alertCooldown: config.alertCooldown || 15 * 60 * 1000, // 15 minutes
      enableEmailAlerts: config.enableEmailAlerts || false,
      enableSlackAlerts: config.enableSlackAlerts || false,
      enableWebhookAlerts: config.enableWebhookAlerts || false,
      ...config
    };

    // Alert state tracking
    this.activeAlerts = new Map();
    this.alertHistory = [];
    this.cooldownPeriods = new Map();
    this.monitoringData = {
      requestCounts: new Map(),
      failureCounts: new Map(),
      responseTimes: new Map(),
      quotaUsage: new Map(),
      circuitBreakerStates: new Map()
    };

    // Alert counters
    this.alertMetrics = {
      totalAlerts: 0,
      criticalAlerts: 0,
      warningAlerts: 0,
      infoAlerts: 0,
      falsePositives: 0,
      suppressedAlerts: 0
    };

    this.initialize();
  }

  async initialize() {
    try {
      await this.loadAlertHistory();
      await this.startMonitoringLoop();
      
      console.log('🚨 Alert System initialized');
      this.emit('initialized');
    } catch (error) {
      console.error('❌ Alert System initialization failed:', error);
      this.emit('error', error);
    }
  }

  /**
   * Process monitoring data point
   */
  processDataPoint(type, platform, data) {
    const timestamp = Date.now();
    
    switch (type) {
      case 'request':
        this.recordRequest(platform, data, timestamp);
        break;
      case 'failure':
        this.recordFailure(platform, data, timestamp);
        break;
      case 'success':
        this.recordSuccess(platform, data, timestamp);
        break;
      case 'circuit-breaker':
        this.recordCircuitBreakerEvent(platform, data, timestamp);
        break;
      case 'quota-usage':
        this.recordQuotaUsage(platform, data, timestamp);
        break;
    }

    // Trigger alert evaluation
    this.evaluateAlerts(platform, type, data);
  }

  /**
   * Record request data
   */
  recordRequest(platform, data, timestamp) {
    if (!this.monitoringData.requestCounts.has(platform)) {
      this.monitoringData.requestCounts.set(platform, []);
    }
    
    this.monitoringData.requestCounts.get(platform).push({
      timestamp,
      duration: data.duration,
      success: data.success,
      cacheHit: data.cacheHit || false
    });

    // Keep only recent data
    this.cleanupOldData(platform, 'requestCounts');
  }

  /**
   * Record failure data
   */
  recordFailure(platform, data, timestamp) {
    if (!this.monitoringData.failureCounts.has(platform)) {
      this.monitoringData.failureCounts.set(platform, []);
    }
    
    this.monitoringData.failureCounts.get(platform).push({
      timestamp,
      errorType: data.errorType,
      errorCode: data.errorCode,
      httpStatus: data.httpStatus,
      retryAttempts: data.retryAttempts || 0
    });

    this.cleanupOldData(platform, 'failureCounts');
  }

  /**
   * Record success data
   */
  recordSuccess(platform, data, timestamp) {
    if (!this.monitoringData.responseTimes.has(platform)) {
      this.monitoringData.responseTimes.set(platform, []);
    }
    
    this.monitoringData.responseTimes.get(platform).push({
      timestamp,
      duration: data.duration,
      contentQuality: data.contentQuality,
      extractionMethod: data.extractionMethod
    });

    this.cleanupOldData(platform, 'responseTimes');
  }

  /**
   * Record circuit breaker events
   */
  recordCircuitBreakerEvent(platform, data, timestamp) {
    this.monitoringData.circuitBreakerStates.set(platform, {
      state: data.state,
      timestamp,
      failureCount: data.failureCount,
      lastFailureTime: data.lastFailureTime
    });
  }

  /**
   * Record API quota usage
   */
  recordQuotaUsage(platform, data, timestamp) {
    this.monitoringData.quotaUsage.set(platform, {
      used: data.used,
      limit: data.limit,
      remaining: data.remaining,
      resetTime: data.resetTime,
      timestamp
    });
  }

  /**
   * Evaluate alerts based on current data
   */
  evaluateAlerts(platform, triggerType, data) {
    const evaluations = [
      this.evaluateFailureRateAlert(platform),
      this.evaluateResponseTimeAlert(platform),
      this.evaluateQuotaUsageAlert(platform),
      this.evaluateCircuitBreakerAlert(platform),
      this.evaluateConsecutiveFailuresAlert(platform),
      this.evaluatePatternConfidenceAlert(platform, data)
    ];

    evaluations.forEach(alert => {
      if (alert && this.shouldSendAlert(alert)) {
        this.sendAlert(alert);
      }
    });
  }

  /**
   * Evaluate failure rate alerts
   */
  evaluateFailureRateAlert(platform) {
    const requests = this.monitoringData.requestCounts.get(platform) || [];
    const failures = this.monitoringData.failureCounts.get(platform) || [];
    
    const windowStart = Date.now() - this.config.monitoringWindows.medium;
    const recentRequests = requests.filter(r => r.timestamp > windowStart);
    const recentFailures = failures.filter(f => f.timestamp > windowStart);
    
    if (recentRequests.length < 10) return null; // Not enough data
    
    const failureRate = recentFailures.length / recentRequests.length;
    
    if (failureRate > this.config.alertThresholds.failureRate) {
      return {
        type: 'failure-rate',
        severity: failureRate > 0.3 ? 'critical' : 'warning',
        platform,
        message: `High failure rate: ${(failureRate * 100).toFixed(1)}% (${recentFailures.length}/${recentRequests.length} requests)`,
        value: failureRate,
        threshold: this.config.alertThresholds.failureRate,
        timestamp: Date.now(),
        details: {
          recentFailures: recentFailures.length,
          totalRequests: recentRequests.length,
          window: 'medium'
        }
      };
    }
    
    return null;
  }

  /**
   * Evaluate response time alerts
   */
  evaluateResponseTimeAlert(platform) {
    const responses = this.monitoringData.responseTimes.get(platform) || [];
    
    const windowStart = Date.now() - this.config.monitoringWindows.short;
    const recentResponses = responses.filter(r => r.timestamp > windowStart);
    
    if (recentResponses.length < 5) return null;
    
    const avgResponseTime = recentResponses.reduce((sum, r) => sum + r.duration, 0) / recentResponses.length;
    
    if (avgResponseTime > this.config.alertThresholds.responseTime) {
      return {
        type: 'response-time',
        severity: avgResponseTime > 20000 ? 'critical' : 'warning',
        platform,
        message: `Slow response time: ${(avgResponseTime / 1000).toFixed(1)}s average`,
        value: avgResponseTime,
        threshold: this.config.alertThresholds.responseTime,
        timestamp: Date.now(),
        details: {
          sampleSize: recentResponses.length,
          window: 'short'
        }
      };
    }
    
    return null;
  }

  /**
   * Evaluate quota usage alerts
   */
  evaluateQuotaUsageAlert(platform) {
    const quota = this.monitoringData.quotaUsage.get(platform);
    
    if (!quota) return null;
    
    const usageRatio = quota.used / quota.limit;
    
    if (usageRatio > this.config.alertThresholds.quotaUsage) {
      return {
        type: 'quota-usage',
        severity: usageRatio > 0.95 ? 'critical' : 'warning',
        platform,
        message: `High API quota usage: ${(usageRatio * 100).toFixed(1)}% (${quota.used}/${quota.limit})`,
        value: usageRatio,
        threshold: this.config.alertThresholds.quotaUsage,
        timestamp: Date.now(),
        details: {
          used: quota.used,
          limit: quota.limit,
          remaining: quota.remaining,
          resetTime: quota.resetTime
        }
      };
    }
    
    return null;
  }

  /**
   * Evaluate circuit breaker alerts
   */
  evaluateCircuitBreakerAlert(platform) {
    const circuitBreaker = this.monitoringData.circuitBreakerStates.get(platform);
    
    if (!circuitBreaker) return null;
    
    if (circuitBreaker.state === 'OPEN') {
      return {
        type: 'circuit-breaker',
        severity: 'critical',
        platform,
        message: `Circuit breaker OPEN after ${circuitBreaker.failureCount} consecutive failures`,
        value: circuitBreaker.state,
        threshold: 'CLOSED',
        timestamp: Date.now(),
        details: {
          state: circuitBreaker.state,
          failureCount: circuitBreaker.failureCount,
          lastFailureTime: circuitBreaker.lastFailureTime
        }
      };
    }
    
    return null;
  }

  /**
   * Evaluate consecutive failures alert
   */
  evaluateConsecutiveFailuresAlert(platform) {
    const failures = this.monitoringData.failureCounts.get(platform) || [];
    
    const windowStart = Date.now() - this.config.monitoringWindows.short;
    const recentFailures = failures.filter(f => f.timestamp > windowStart);
    
    if (recentFailures.length >= this.config.alertThresholds.consecutiveFailures) {
      return {
        type: 'consecutive-failures',
        severity: 'warning',
        platform,
        message: `${recentFailures.length} consecutive failures detected`,
        value: recentFailures.length,
        threshold: this.config.alertThresholds.consecutiveFailures,
        timestamp: Date.now(),
        details: {
          failureCount: recentFailures.length,
          errorTypes: [...new Set(recentFailures.map(f => f.errorType))],
          window: 'short'
        }
      };
    }
    
    return null;
  }

  /**
   * Evaluate pattern confidence alerts
   */
  evaluatePatternConfidenceAlert(platform, data) {
    if (!data || !data.patternConfidence) return null;
    
    if (data.patternConfidence > this.config.alertThresholds.patternConfidence) {
      return {
        type: 'pattern-confidence',
        severity: 'info',
        platform,
        message: `High-confidence failure pattern detected: ${(data.patternConfidence * 100).toFixed(1)}%`,
        value: data.patternConfidence,
        threshold: this.config.alertThresholds.patternConfidence,
        timestamp: Date.now(),
        details: {
          patternType: data.patternType,
          patternSignature: data.patternSignature,
          recommendations: data.recommendations || []
        }
      };
    }
    
    return null;
  }

  /**
   * Check if alert should be sent (cooldown, deduplication)
   */
  shouldSendAlert(alert) {
    const alertKey = `${alert.type}-${alert.platform}`;
    const now = Date.now();
    
    // Check cooldown
    const lastAlert = this.cooldownPeriods.get(alertKey);
    if (lastAlert && (now - lastAlert) < this.config.alertCooldown) {
      this.alertMetrics.suppressedAlerts++;
      return false;
    }
    
    // Check for duplicate active alerts
    if (this.activeAlerts.has(alertKey)) {
      const activeAlert = this.activeAlerts.get(alertKey);
      if (activeAlert.severity === alert.severity) {
        return false; // Same severity, don't spam
      }
    }
    
    return true;
  }

  /**
   * Send alert through configured channels
   */
  async sendAlert(alert) {
    try {
      const alertId = this.generateAlertId();
      const enrichedAlert = {
        ...alert,
        id: alertId,
        source: 'link-preview-nld',
        environment: process.env.NODE_ENV || 'development'
      };
      
      // Store alert
      this.activeAlerts.set(`${alert.type}-${alert.platform}`, enrichedAlert);
      this.alertHistory.push(enrichedAlert);
      this.cooldownPeriods.set(`${alert.type}-${alert.platform}`, Date.now());
      
      // Update metrics
      this.updateAlertMetrics(alert.severity);
      
      // Send through configured channels
      const sendPromises = [];
      
      if (this.config.enableEmailAlerts) {
        sendPromises.push(this.sendEmailAlert(enrichedAlert));
      }
      
      if (this.config.enableSlackAlerts) {
        sendPromises.push(this.sendSlackAlert(enrichedAlert));
      }
      
      if (this.config.enableWebhookAlerts) {
        sendPromises.push(this.sendWebhookAlert(enrichedAlert));
      }
      
      // Always log to console
      this.logAlert(enrichedAlert);
      
      await Promise.allSettled(sendPromises);
      
      this.emit('alertSent', enrichedAlert);
      
      console.log(`🚨 Alert sent: ${alert.type} for ${alert.platform} (${alert.severity})`);
      
    } catch (error) {
      console.error('❌ Failed to send alert:', error);
      this.emit('alertError', { alert, error });
    }
  }

  /**
   * Log alert to console with formatting
   */
  logAlert(alert) {
    const severity = alert.severity.toUpperCase();
    const emoji = this.getSeverityEmoji(alert.severity);
    const timestamp = new Date(alert.timestamp).toISOString();
    
    console.log(`${emoji} [${severity}] ${alert.message}`);
    console.log(`   Platform: ${alert.platform}`);
    console.log(`   Type: ${alert.type}`);
    console.log(`   Time: ${timestamp}`);
    
    if (alert.details && Object.keys(alert.details).length > 0) {
      console.log(`   Details: ${JSON.stringify(alert.details, null, 2)}`);
    }
    
    console.log(''); // Empty line for readability
  }

  /**
   * Send email alert (placeholder)
   */
  async sendEmailAlert(alert) {
    // In a real implementation, this would integrate with email service
    console.log(`📧 Email alert would be sent: ${alert.message}`);
  }

  /**
   * Send Slack alert (placeholder)
   */
  async sendSlackAlert(alert) {
    // In a real implementation, this would integrate with Slack API
    console.log(`💬 Slack alert would be sent: ${alert.message}`);
  }

  /**
   * Send webhook alert (placeholder)
   */
  async sendWebhookAlert(alert) {
    // In a real implementation, this would call configured webhook
    console.log(`🔗 Webhook alert would be sent: ${alert.message}`);
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertType, platform, reason = 'Manual resolution') {
    const alertKey = `${alertType}-${platform}`;
    const activeAlert = this.activeAlerts.get(alertKey);
    
    if (activeAlert) {
      activeAlert.resolved = true;
      activeAlert.resolvedAt = Date.now();
      activeAlert.resolutionReason = reason;
      
      this.activeAlerts.delete(alertKey);
      
      console.log(`✅ Alert resolved: ${alertType} for ${platform} - ${reason}`);
      this.emit('alertResolved', activeAlert);
    }
  }

  /**
   * Get current alert status
   */
  getAlertStatus() {
    const activeAlerts = Array.from(this.activeAlerts.values());
    const recentAlerts = this.alertHistory
      .filter(alert => Date.now() - alert.timestamp < this.config.monitoringWindows.long)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    return {
      active: activeAlerts,
      recent: recentAlerts,
      metrics: this.alertMetrics,
      healthStatus: this.calculateHealthStatus(),
      platformSummary: this.generatePlatformSummary()
    };
  }

  /**
   * Export alert data
   */
  async exportAlertData() {
    const exportData = {
      metadata: {
        exportTimestamp: new Date().toISOString(),
        totalAlerts: this.alertHistory.length
      },
      activeAlerts: Array.from(this.activeAlerts.values()),
      alertHistory: this.alertHistory,
      metrics: this.alertMetrics,
      configuration: this.config.alertThresholds
    };
    
    const exportPath = path.join(
      this.config.dataPath,
      'exports',
      `alert-data-${Date.now()}.json`
    );
    
    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
    return exportPath;
  }

  // Utility methods
  async startMonitoringLoop() {
    // Start periodic health checks
    setInterval(() => {
      this.performHealthCheck();
    }, 60000); // Every minute
  }

  performHealthCheck() {
    const platforms = ['youtube.com', 'twitter.com', 'facebook.com', 'instagram.com'];
    
    platforms.forEach(platform => {
      this.evaluateAlerts(platform, 'health-check', null);
    });
  }

  cleanupOldData(platform, dataType) {
    const data = this.monitoringData[dataType].get(platform);
    const cutoff = Date.now() - this.config.monitoringWindows.long;
    
    const filtered = data.filter(item => item.timestamp > cutoff);
    this.monitoringData[dataType].set(platform, filtered);
  }

  updateAlertMetrics(severity) {
    this.alertMetrics.totalAlerts++;
    switch (severity) {
      case 'critical':
        this.alertMetrics.criticalAlerts++;
        break;
      case 'warning':
        this.alertMetrics.warningAlerts++;
        break;
      case 'info':
        this.alertMetrics.infoAlerts++;
        break;
    }
  }

  getSeverityEmoji(severity) {
    const emojis = {
      critical: '🔥',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return emojis[severity] || '🔔';
  }

  generateAlertId() {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  calculateHealthStatus() {
    const activeCount = this.activeAlerts.size;
    const criticalCount = Array.from(this.activeAlerts.values())
      .filter(alert => alert.severity === 'critical').length;
    
    if (criticalCount > 0) return 'critical';
    if (activeCount > 3) return 'warning';
    if (activeCount > 0) return 'degraded';
    return 'healthy';
  }

  generatePlatformSummary() {
    const summary = {};
    
    this.monitoringData.requestCounts.forEach((requests, platform) => {
      const failures = this.monitoringData.failureCounts.get(platform) || [];
      const responses = this.monitoringData.responseTimes.get(platform) || [];
      
      summary[platform] = {
        totalRequests: requests.length,
        totalFailures: failures.length,
        failureRate: requests.length > 0 ? failures.length / requests.length : 0,
        avgResponseTime: responses.length > 0 
          ? responses.reduce((sum, r) => sum + r.duration, 0) / responses.length 
          : 0
      };
    });
    
    return summary;
  }

  async loadAlertHistory() {
    // Load alert history from storage
    // Implementation would read from filesystem/database
  }
}

export default AlertSystem;