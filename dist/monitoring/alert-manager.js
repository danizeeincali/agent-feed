"use strict";
/**
 * Advanced Alert Manager with Multi-channel Notifications
 * Real-time alerting, escalation, and notification management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertManager = void 0;
const events_1 = require("events");
class AlertManager extends events_1.EventEmitter {
    alerts = new Map();
    alertRules = new Map();
    notificationChannels = new Map();
    suppressedAlerts = new Set();
    escalationInterval = null;
    isRunning = false;
    escalationCheckInterval = 60000; // 1 minute
    constructor() {
        super();
        this.setupDefaultAlertRules();
        this.setupDefaultNotificationChannels();
    }
    setupDefaultAlertRules() {
        const defaultRules = [
            {
                id: 'high-cpu-usage',
                name: 'High CPU Usage',
                condition: 'cpu_usage > 80',
                severity: 'warning',
                category: 'performance',
                enabled: true,
                suppressionTime: 300, // 5 minutes
                escalationRules: [
                    {
                        level: 1,
                        delayMinutes: 5,
                        channels: ['slack'],
                        recipients: ['devops-team']
                    },
                    {
                        level: 2,
                        delayMinutes: 15,
                        channels: ['email', 'slack'],
                        recipients: ['devops-team', 'engineering-team'],
                        action: 'auto-scale'
                    }
                ],
                notificationChannels: ['slack', 'email'],
                metadata: {}
            },
            {
                id: 'critical-cpu-usage',
                name: 'Critical CPU Usage',
                condition: 'cpu_usage > 95',
                severity: 'critical',
                category: 'performance',
                enabled: true,
                suppressionTime: 60, // 1 minute
                escalationRules: [
                    {
                        level: 1,
                        delayMinutes: 0,
                        channels: ['slack', 'email', 'pagerduty'],
                        recipients: ['devops-team', 'on-call-engineer'],
                        action: 'auto-scale'
                    },
                    {
                        level: 2,
                        delayMinutes: 10,
                        channels: ['sms', 'pagerduty'],
                        recipients: ['engineering-manager', 'site-reliability-team']
                    }
                ],
                notificationChannels: ['slack', 'email', 'pagerduty', 'sms'],
                metadata: {}
            },
            {
                id: 'high-memory-usage',
                name: 'High Memory Usage',
                condition: 'memory_usage > 85',
                severity: 'warning',
                category: 'performance',
                enabled: true,
                suppressionTime: 300,
                escalationRules: [
                    {
                        level: 1,
                        delayMinutes: 10,
                        channels: ['slack'],
                        recipients: ['devops-team']
                    }
                ],
                notificationChannels: ['slack'],
                metadata: {}
            },
            {
                id: 'service-down',
                name: 'Service Down',
                condition: 'health_status == critical',
                severity: 'critical',
                category: 'health',
                enabled: true,
                suppressionTime: 0,
                escalationRules: [
                    {
                        level: 1,
                        delayMinutes: 0,
                        channels: ['slack', 'pagerduty'],
                        recipients: ['devops-team', 'on-call-engineer'],
                        action: 'restart-service'
                    },
                    {
                        level: 2,
                        delayMinutes: 5,
                        channels: ['sms', 'email'],
                        recipients: ['engineering-manager']
                    }
                ],
                notificationChannels: ['slack', 'pagerduty', 'sms', 'email'],
                metadata: {}
            },
            {
                id: 'high-error-rate',
                name: 'High Error Rate',
                condition: 'error_rate > 5',
                severity: 'error',
                category: 'application',
                enabled: true,
                suppressionTime: 180, // 3 minutes
                escalationRules: [
                    {
                        level: 1,
                        delayMinutes: 2,
                        channels: ['slack'],
                        recipients: ['development-team']
                    },
                    {
                        level: 2,
                        delayMinutes: 10,
                        channels: ['email'],
                        recipients: ['product-team', 'engineering-team']
                    }
                ],
                notificationChannels: ['slack', 'email'],
                metadata: {}
            }
        ];
        defaultRules.forEach(rule => {
            this.alertRules.set(rule.id, rule);
        });
    }
    setupDefaultNotificationChannels() {
        const defaultChannels = [
            {
                id: 'slack',
                name: 'Slack Notifications',
                type: 'slack',
                config: {
                    webhook: 'https://hooks.slack.com/services/...',
                    channel: '#alerts',
                    username: 'AlertBot'
                },
                enabled: true,
                rateLimits: {
                    maxPerHour: 50,
                    maxPerDay: 200,
                    currentHour: 0,
                    currentDay: 0,
                    lastReset: Date.now()
                }
            },
            {
                id: 'email',
                name: 'Email Notifications',
                type: 'email',
                config: {
                    smtp: {
                        host: 'smtp.company.com',
                        port: 587,
                        secure: false,
                        auth: {
                            user: 'alerts@company.com',
                            pass: 'password'
                        }
                    },
                    from: 'alerts@company.com'
                },
                enabled: true,
                rateLimits: {
                    maxPerHour: 100,
                    maxPerDay: 500,
                    currentHour: 0,
                    currentDay: 0,
                    lastReset: Date.now()
                }
            },
            {
                id: 'webhook',
                name: 'Webhook Notifications',
                type: 'webhook',
                config: {
                    url: 'https://api.company.com/alerts',
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer token',
                        'Content-Type': 'application/json'
                    }
                },
                enabled: true,
                rateLimits: {
                    maxPerHour: 1000,
                    maxPerDay: 5000,
                    currentHour: 0,
                    currentDay: 0,
                    lastReset: Date.now()
                }
            },
            {
                id: 'pagerduty',
                name: 'PagerDuty',
                type: 'pagerduty',
                config: {
                    integrationKey: 'your-integration-key',
                    apiUrl: 'https://events.pagerduty.com/v2/enqueue'
                },
                enabled: true,
                rateLimits: {
                    maxPerHour: 200,
                    maxPerDay: 1000,
                    currentHour: 0,
                    currentDay: 0,
                    lastReset: Date.now()
                }
            },
            {
                id: 'sms',
                name: 'SMS Notifications',
                type: 'sms',
                config: {
                    provider: 'twilio',
                    accountSid: 'your-account-sid',
                    authToken: 'your-auth-token',
                    fromNumber: '+1234567890'
                },
                enabled: false, // Disabled by default due to cost
                rateLimits: {
                    maxPerHour: 10,
                    maxPerDay: 50,
                    currentHour: 0,
                    currentDay: 0,
                    lastReset: Date.now()
                }
            }
        ];
        defaultChannels.forEach(channel => {
            this.notificationChannels.set(channel.id, channel);
        });
    }
    startAlertManager() {
        if (this.isRunning) {
            console.log('Alert manager already running');
            return;
        }
        this.isRunning = true;
        console.log('Starting alert manager');
        // Start escalation checker
        this.escalationInterval = setInterval(() => {
            this.checkEscalations();
        }, this.escalationCheckInterval);
        this.emit('alert-manager-started');
    }
    stopAlertManager() {
        if (this.escalationInterval) {
            clearInterval(this.escalationInterval);
            this.escalationInterval = null;
        }
        this.isRunning = false;
        console.log('Alert manager stopped');
        this.emit('alert-manager-stopped');
    }
    processBottlenecks(bottlenecks) {
        for (const bottleneck of bottlenecks) {
            this.createAlertFromBottleneck(bottleneck);
        }
    }
    processHealthChecks(healthChecks) {
        for (const healthCheck of healthChecks) {
            if (healthCheck.status === 'critical' || healthCheck.status === 'warning') {
                this.createAlertFromHealthCheck(healthCheck);
            }
        }
    }
    createAlertFromBottleneck(bottleneck) {
        const alertId = `bottleneck-${bottleneck.id}-${bottleneck.detectedAt}`;
        // Check if alert already exists and is not resolved
        const existingAlert = this.alerts.get(alertId);
        if (existingAlert && existingAlert.status === 'active') {
            return; // Don't create duplicate alerts
        }
        const severity = this.mapBottleneckSeverityToAlertSeverity(bottleneck.severity);
        const alert = {
            id: alertId,
            title: `Performance Bottleneck: ${bottleneck.type.toUpperCase()}`,
            message: bottleneck.description,
            severity,
            category: 'performance',
            timestamp: bottleneck.detectedAt,
            source: 'performance-analyzer',
            status: 'active',
            metadata: {
                bottleneckType: bottleneck.type,
                impact: bottleneck.impact,
                recommendation: bottleneck.recommendation,
                autoFixAvailable: bottleneck.autoFixAvailable,
                persistentFor: bottleneck.persistentFor
            },
            escalationLevel: 0,
            lastNotified: 0,
            notificationChannels: this.getChannelsForSeverity(severity)
        };
        this.alerts.set(alertId, alert);
        this.processAlert(alert);
    }
    createAlertFromHealthCheck(healthCheck) {
        const alertId = `health-${healthCheck.id}-${healthCheck.lastChecked}`;
        // Check for existing active alert
        const existingAlert = Array.from(this.alerts.values()).find(alert => alert.source === 'health-monitor' &&
            alert.metadata.healthCheckId === healthCheck.id &&
            alert.status === 'active');
        if (existingAlert) {
            return; // Don't create duplicate alerts
        }
        const severity = healthCheck.status === 'critical' ? 'critical' : 'warning';
        const alert = {
            id: alertId,
            title: `Health Check Failed: ${healthCheck.name}`,
            message: healthCheck.message,
            severity,
            category: 'health',
            timestamp: healthCheck.lastChecked,
            source: 'health-monitor',
            status: 'active',
            metadata: {
                healthCheckId: healthCheck.id,
                healthCheckType: healthCheck.type,
                responseTime: healthCheck.responseTime,
                details: healthCheck.details
            },
            escalationLevel: 0,
            lastNotified: 0,
            notificationChannels: this.getChannelsForSeverity(severity)
        };
        this.alerts.set(alertId, alert);
        this.processAlert(alert);
    }
    mapBottleneckSeverityToAlertSeverity(bottleneckSeverity) {
        switch (bottleneckSeverity) {
            case 'critical': return 'critical';
            case 'high': return 'error';
            case 'medium': return 'warning';
            case 'low': return 'info';
            default: return 'warning';
        }
    }
    getChannelsForSeverity(severity) {
        switch (severity) {
            case 'critical':
                return ['slack', 'email', 'pagerduty', 'webhook'];
            case 'error':
                return ['slack', 'email', 'webhook'];
            case 'warning':
                return ['slack', 'webhook'];
            case 'info':
                return ['webhook'];
            default:
                return ['slack'];
        }
    }
    async processAlert(alert) {
        console.log(`Processing alert: ${alert.title} (${alert.severity})`);
        // Check if alert should be suppressed
        if (this.shouldSuppressAlert(alert)) {
            console.log(`Alert suppressed: ${alert.id}`);
            this.suppressedAlerts.add(alert.id);
            return;
        }
        // Send initial notifications
        await this.sendNotifications(alert);
        // Update last notified time
        alert.lastNotified = Date.now();
        this.alerts.set(alert.id, alert);
        this.emit('alert-created', alert);
    }
    shouldSuppressAlert(alert) {
        // Find matching alert rule
        const rule = Array.from(this.alertRules.values()).find(r => r.category === alert.category && r.severity === alert.severity);
        if (!rule || rule.suppressionTime === 0) {
            return false;
        }
        // Check for recent similar alerts
        const recentSimilarAlerts = Array.from(this.alerts.values()).filter(existingAlert => existingAlert.category === alert.category &&
            existingAlert.severity === alert.severity &&
            existingAlert.source === alert.source &&
            Date.now() - existingAlert.timestamp < (rule.suppressionTime * 1000));
        return recentSimilarAlerts.length > 0;
    }
    async sendNotifications(alert, escalationLevel = 0) {
        // Get escalation rule for current level
        const rule = this.getAlertRule(alert);
        if (!rule)
            return;
        const escalationRule = rule.escalationRules.find(er => er.level === escalationLevel);
        const channels = escalationRule?.channels || alert.notificationChannels;
        for (const channelId of channels) {
            const channel = this.notificationChannels.get(channelId);
            if (!channel || !channel.enabled)
                continue;
            // Check rate limits
            if (!this.checkRateLimit(channel)) {
                console.log(`Rate limit exceeded for channel: ${channelId}`);
                continue;
            }
            try {
                await this.sendNotificationToChannel(alert, channel, escalationLevel);
                this.updateRateLimit(channel);
            }
            catch (error) {
                console.error(`Failed to send notification to ${channelId}:`, error);
            }
        }
    }
    getAlertRule(alert) {
        return Array.from(this.alertRules.values()).find(rule => rule.category === alert.category &&
            rule.severity === alert.severity);
    }
    checkRateLimit(channel) {
        const now = Date.now();
        const hoursSinceReset = (now - channel.rateLimits.lastReset) / (1000 * 60 * 60);
        const daysSinceReset = hoursSinceReset / 24;
        // Reset counters if needed
        if (hoursSinceReset >= 1) {
            channel.rateLimits.currentHour = 0;
            channel.rateLimits.lastReset = now;
        }
        if (daysSinceReset >= 1) {
            channel.rateLimits.currentDay = 0;
        }
        return channel.rateLimits.currentHour < channel.rateLimits.maxPerHour &&
            channel.rateLimits.currentDay < channel.rateLimits.maxPerDay;
    }
    updateRateLimit(channel) {
        channel.rateLimits.currentHour++;
        channel.rateLimits.currentDay++;
        this.notificationChannels.set(channel.id, channel);
    }
    async sendNotificationToChannel(alert, channel, escalationLevel) {
        const message = this.formatNotificationMessage(alert, escalationLevel);
        switch (channel.type) {
            case 'slack':
                await this.sendSlackNotification(channel, message, alert);
                break;
            case 'email':
                await this.sendEmailNotification(channel, message, alert);
                break;
            case 'webhook':
                await this.sendWebhookNotification(channel, message, alert);
                break;
            case 'pagerduty':
                await this.sendPagerDutyNotification(channel, message, alert);
                break;
            case 'sms':
                await this.sendSMSNotification(channel, message, alert);
                break;
            default:
                console.log(`Unknown notification channel type: ${channel.type}`);
        }
    }
    formatNotificationMessage(alert, escalationLevel) {
        const escalationText = escalationLevel > 0 ? ` [ESCALATION LEVEL ${escalationLevel}]` : '';
        return `🚨 ${alert.severity.toUpperCase()} ALERT${escalationText}
    
📋 **${alert.title}**
📝 ${alert.message}
📊 Category: ${alert.category}
🕐 Time: ${new Date(alert.timestamp).toISOString()}
🔍 Source: ${alert.source}

${alert.metadata.recommendation ? `💡 Recommendation: ${alert.metadata.recommendation}` : ''}
${alert.metadata.autoFixAvailable ? '🔧 Auto-fix available' : ''}

Alert ID: ${alert.id}`;
    }
    async sendSlackNotification(channel, message, alert) {
        // Mock Slack notification
        console.log(`[SLACK] ${channel.config.channel}: ${message}`);
        // In a real implementation, you would use the Slack Web API
        /*
        const response = await fetch(channel.config.webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: channel.config.channel,
            username: channel.config.username,
            text: message,
            attachments: [{
              color: this.getColorForSeverity(alert.severity),
              fields: [
                { title: 'Severity', value: alert.severity, short: true },
                { title: 'Category', value: alert.category, short: true }
              ]
            }]
          })
        });
        */
    }
    async sendEmailNotification(channel, message, alert) {
        // Mock email notification
        console.log(`[EMAIL] To: devops-team@company.com, Subject: ${alert.title}`);
        console.log(`Body: ${message}`);
        // In a real implementation, you would use nodemailer or similar
    }
    async sendWebhookNotification(channel, message, alert) {
        // Mock webhook notification
        console.log(`[WEBHOOK] ${channel.config.url}: Alert ${alert.id}`);
        // In a real implementation:
        /*
        await fetch(channel.config.url, {
          method: channel.config.method,
          headers: channel.config.headers,
          body: JSON.stringify({
            alert: alert,
            message: message,
            timestamp: Date.now()
          })
        });
        */
    }
    async sendPagerDutyNotification(channel, message, alert) {
        // Mock PagerDuty notification
        console.log(`[PAGERDUTY] Incident created for alert: ${alert.id}`);
        // In a real implementation:
        /*
        await fetch(channel.config.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            routing_key: channel.config.integrationKey,
            event_action: 'trigger',
            dedup_key: alert.id,
            payload: {
              summary: alert.title,
              source: alert.source,
              severity: alert.severity,
              custom_details: alert.metadata
            }
          })
        });
        */
    }
    async sendSMSNotification(channel, message, alert) {
        // Mock SMS notification
        const shortMessage = `${alert.severity.toUpperCase()}: ${alert.title}`;
        console.log(`[SMS] ${channel.config.fromNumber}: ${shortMessage}`);
        // In a real implementation, you would use Twilio or similar service
    }
    checkEscalations() {
        const now = Date.now();
        for (const alert of this.alerts.values()) {
            if (alert.status !== 'active')
                continue;
            const rule = this.getAlertRule(alert);
            if (!rule)
                continue;
            // Check if alert should be escalated
            for (const escalationRule of rule.escalationRules) {
                const escalationTime = alert.timestamp + (escalationRule.delayMinutes * 60 * 1000);
                if (now >= escalationTime && alert.escalationLevel < escalationRule.level) {
                    this.escalateAlert(alert, escalationRule);
                    break;
                }
            }
        }
    }
    async escalateAlert(alert, escalationRule) {
        console.log(`Escalating alert ${alert.id} to level ${escalationRule.level}`);
        alert.escalationLevel = escalationRule.level;
        this.alerts.set(alert.id, alert);
        // Send escalation notifications
        await this.sendNotifications(alert, escalationRule.level);
        // Execute escalation action if specified
        if (escalationRule.action) {
            await this.executeEscalationAction(alert, escalationRule.action);
        }
        this.emit('alert-escalated', { alert, escalationRule });
    }
    async executeEscalationAction(alert, action) {
        console.log(`Executing escalation action: ${action} for alert ${alert.id}`);
        switch (action) {
            case 'auto-scale':
                this.emit('escalation-action', { alert, action: 'auto-scale' });
                break;
            case 'restart-service':
                this.emit('escalation-action', { alert, action: 'restart-service' });
                break;
            case 'rollback':
                this.emit('escalation-action', { alert, action: 'rollback' });
                break;
            case 'failover':
                this.emit('escalation-action', { alert, action: 'failover' });
                break;
            default:
                console.log(`Unknown escalation action: ${action}`);
        }
    }
    acknowledgeAlert(alertId, acknowledgedBy) {
        const alert = this.alerts.get(alertId);
        if (!alert || alert.status !== 'active') {
            return false;
        }
        alert.status = 'acknowledged';
        alert.acknowledgedBy = acknowledgedBy;
        alert.acknowledgedAt = Date.now();
        this.alerts.set(alertId, alert);
        console.log(`Alert acknowledged: ${alertId} by ${acknowledgedBy}`);
        this.emit('alert-acknowledged', alert);
        return true;
    }
    resolveAlert(alertId) {
        const alert = this.alerts.get(alertId);
        if (!alert) {
            return false;
        }
        alert.status = 'resolved';
        alert.resolvedAt = Date.now();
        this.alerts.set(alertId, alert);
        console.log(`Alert resolved: ${alertId}`);
        this.emit('alert-resolved', alert);
        return true;
    }
    suppressAlert(alertId) {
        const alert = this.alerts.get(alertId);
        if (!alert) {
            return false;
        }
        alert.status = 'suppressed';
        this.suppressedAlerts.add(alertId);
        this.alerts.set(alertId, alert);
        console.log(`Alert suppressed: ${alertId}`);
        this.emit('alert-suppressed', alert);
        return true;
    }
    getActiveAlerts() {
        return Array.from(this.alerts.values()).filter(alert => alert.status === 'active');
    }
    getAlertsByCategory(category) {
        return Array.from(this.alerts.values()).filter(alert => alert.category === category);
    }
    getAlertsBySeverity(severity) {
        return Array.from(this.alerts.values()).filter(alert => alert.severity === severity);
    }
    getAlertMetrics() {
        const allAlerts = Array.from(this.alerts.values());
        const activeAlerts = allAlerts.filter(alert => alert.status === 'active');
        const alertsByCategory = {};
        const alertsBySeverity = {};
        for (const alert of allAlerts) {
            alertsByCategory[alert.category] = (alertsByCategory[alert.category] || 0) + 1;
            alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
        }
        const resolvedAlerts = allAlerts.filter(alert => alert.status === 'resolved' && alert.resolvedAt);
        const averageResolutionTime = resolvedAlerts.length > 0
            ? resolvedAlerts.reduce((sum, alert) => sum + (alert.resolvedAt - alert.timestamp), 0) / resolvedAlerts.length
            : 0;
        const escalatedAlerts = allAlerts.filter(alert => alert.escalationLevel > 0);
        const escalationRate = allAlerts.length > 0 ? escalatedAlerts.length / allAlerts.length : 0;
        return {
            totalAlerts: allAlerts.length,
            activeAlerts: activeAlerts.length,
            alertsByCategory,
            alertsBySeverity,
            averageResolutionTime,
            escalationRate,
            falsePositiveRate: 0 // Would need additional tracking to calculate
        };
    }
    isActive() {
        return this.isRunning;
    }
    addNotificationChannel(channel) {
        this.notificationChannels.set(channel.id, channel);
        console.log(`Added notification channel: ${channel.name}`);
    }
    removeNotificationChannel(channelId) {
        return this.notificationChannels.delete(channelId);
    }
    addAlertRule(rule) {
        this.alertRules.set(rule.id, rule);
        console.log(`Added alert rule: ${rule.name}`);
    }
    removeAlertRule(ruleId) {
        return this.alertRules.delete(ruleId);
    }
    getColorForSeverity(severity) {
        switch (severity) {
            case 'critical': return '#FF0000';
            case 'error': return '#FF8C00';
            case 'warning': return '#FFD700';
            case 'info': return '#00BFFF';
            default: return '#808080';
        }
    }
}
exports.AlertManager = AlertManager;
exports.default = AlertManager;
//# sourceMappingURL=alert-manager.js.map