"use strict";
/**
 * Health Monitor - Comprehensive monitoring and auto-recovery for Claude instances
 * Provides real-time health checks, performance metrics, and automatic recovery
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthMonitor = void 0;
const events_1 = require("events");
const perf_hooks_1 = require("perf_hooks");
const winston_1 = __importDefault(require("winston"));
class HealthMonitor extends events_1.EventEmitter {
    processManager;
    sessionManager;
    logger;
    healthMetrics = new Map();
    alerts = new Map();
    recoveryActions = [];
    monitoringInterval;
    alertInterval;
    cleanupInterval;
    // Configuration
    config = {
        checkInterval: 30000, // 30 seconds
        alertInterval: 60000, // 1 minute
        maxMetricsHistory: 100,
        healthThresholds: {
            responseTime: {
                warning: 5000, // 5 seconds
                critical: 10000 // 10 seconds
            },
            memoryUsage: {
                warning: 0.8, // 80% of max
                critical: 0.9 // 90% of max
            },
            errorRate: {
                warning: 0.1, // 10%
                critical: 0.2 // 20%
            },
            cpuUsage: {
                warning: 80, // 80%
                critical: 95 // 95%
            }
        },
        autoRecovery: {
            enabled: true,
            maxRestarts: 3,
            restartWindow: 300000, // 5 minutes
            escalationDelay: 60000 // 1 minute
        }
    };
    constructor(processManager, sessionManager) {
        super();
        this.processManager = processManager;
        this.sessionManager = sessionManager;
        this.setupLogger();
        this.startMonitoring();
    }
    setupLogger() {
        this.logger = winston_1.default.createLogger({
            level: 'info',
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
            transports: [
                new winston_1.default.transports.File({
                    filename: 'logs/health-monitor.log',
                    level: 'info'
                }),
                new winston_1.default.transports.File({
                    filename: 'logs/health-monitor-error.log',
                    level: 'error'
                }),
                new winston_1.default.transports.Console({
                    format: winston_1.default.format.simple(),
                    level: 'debug'
                })
            ]
        });
    }
    /**
     * Start monitoring routines
     */
    startMonitoring() {
        // Main health check routine
        this.monitoringInterval = setInterval(() => {
            this.performHealthChecks();
        }, this.config.checkInterval);
        // Alert processing routine
        this.alertInterval = setInterval(() => {
            this.processAlerts();
        }, this.config.alertInterval);
        // Cleanup routine
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldData();
        }, 300000); // 5 minutes
        this.logger.info('Health monitoring started');
    }
    /**
     * Perform health checks on all instances
     */
    async performHealthChecks() {
        try {
            const instances = this.processManager.getInstances();
            const healthPromises = instances.map(instance => this.checkInstanceHealth(instance));
            await Promise.all(healthPromises);
            // Generate system health status
            const systemHealth = this.generateSystemHealthStatus();
            this.emit('systemHealthUpdate', systemHealth);
        }
        catch (error) {
            this.logger.error('Error performing health checks:', error);
        }
    }
    /**
     * Check health of a specific instance
     */
    async checkInstanceHealth(instanceStatus) {
        const startTime = perf_hooks_1.performance.now();
        try {
            // Perform health check
            const isHealthy = await this.processManager.healthCheck(instanceStatus.id);
            const responseTime = perf_hooks_1.performance.now() - startTime;
            // Calculate metrics
            const metrics = await this.calculateHealthMetrics(instanceStatus, responseTime, isHealthy);
            // Store metrics
            this.storeHealthMetrics(instanceStatus.id, metrics);
            // Check thresholds and generate alerts
            await this.evaluateHealthThresholds(metrics);
            // Auto-recovery if needed
            if (this.config.autoRecovery.enabled && metrics.status === 'critical') {
                await this.attemptRecovery(instanceStatus.id, metrics);
            }
        }
        catch (error) {
            this.logger.error(`Health check failed for instance ${instanceStatus.id}:`, error);
            // Create error metrics
            const errorMetrics = {
                instanceId: instanceStatus.id,
                timestamp: new Date(),
                status: 'down',
                uptime: Date.now() - instanceStatus.startTime.getTime(),
                responseTime: -1,
                memoryUsage: instanceStatus.memoryUsage || process.memoryUsage(),
                cpuUsage: instanceStatus.cpuUsage || process.cpuUsage(),
                messageRate: 0,
                errorRate: 1,
                restartCount: instanceStatus.metrics.restartCount,
                lastError: error instanceof Error ? error.message : 'Unknown error',
                healthScore: 0
            };
            this.storeHealthMetrics(instanceStatus.id, errorMetrics);
        }
    }
    /**
     * Calculate comprehensive health metrics
     */
    async calculateHealthMetrics(instanceStatus, responseTime, isHealthy) {
        const now = new Date();
        const uptime = now.getTime() - instanceStatus.startTime.getTime();
        // Get previous metrics for rate calculations
        const previousMetrics = this.getLatestMetrics(instanceStatus.id);
        const timeDiff = previousMetrics
            ? now.getTime() - previousMetrics.timestamp.getTime()
            : this.config.checkInterval;
        // Calculate message rate (messages per second)
        const messageRate = previousMetrics
            ? Math.max(0, (instanceStatus.metrics.messagesProcessed - (previousMetrics.messageRate * timeDiff / 1000)) / (timeDiff / 1000))
            : instanceStatus.metrics.messagesProcessed / (uptime / 1000);
        // Calculate error rate
        const totalMessages = instanceStatus.metrics.messagesProcessed;
        const errorRate = totalMessages > 0 ? instanceStatus.metrics.errorCount / totalMessages : 0;
        // Determine status based on health check and thresholds
        let status = 'healthy';
        if (!isHealthy) {
            status = 'down';
        }
        else if (responseTime > this.config.healthThresholds.responseTime.critical ||
            errorRate > this.config.healthThresholds.errorRate.critical) {
            status = 'critical';
        }
        else if (responseTime > this.config.healthThresholds.responseTime.warning ||
            errorRate > this.config.healthThresholds.errorRate.warning) {
            status = 'warning';
        }
        // Calculate health score (0-100)
        const healthScore = this.calculateHealthScore(instanceStatus, responseTime, errorRate);
        return {
            instanceId: instanceStatus.id,
            timestamp: now,
            status,
            uptime,
            responseTime,
            memoryUsage: instanceStatus.memoryUsage || process.memoryUsage(),
            cpuUsage: instanceStatus.cpuUsage || process.cpuUsage(),
            messageRate,
            errorRate,
            restartCount: instanceStatus.metrics.restartCount,
            healthScore
        };
    }
    /**
     * Calculate overall health score (0-100)
     */
    calculateHealthScore(instanceStatus, responseTime, errorRate) {
        let score = 100;
        // Response time penalty
        if (responseTime > this.config.healthThresholds.responseTime.warning) {
            const penalty = Math.min(30, (responseTime - this.config.healthThresholds.responseTime.warning) / 1000 * 5);
            score -= penalty;
        }
        // Error rate penalty
        if (errorRate > 0) {
            const penalty = Math.min(40, errorRate * 200);
            score -= penalty;
        }
        // Restart penalty
        if (instanceStatus.metrics.restartCount > 0) {
            const penalty = Math.min(20, instanceStatus.metrics.restartCount * 5);
            score -= penalty;
        }
        // Status penalty
        if (instanceStatus.status !== 'running') {
            score -= 50;
        }
        return Math.max(0, Math.round(score));
    }
    /**
     * Store health metrics with history limit
     */
    storeHealthMetrics(instanceId, metrics) {
        let history = this.healthMetrics.get(instanceId) || [];
        history.push(metrics);
        // Keep only recent metrics
        if (history.length > this.config.maxMetricsHistory) {
            history = history.slice(-this.config.maxMetricsHistory);
        }
        this.healthMetrics.set(instanceId, history);
        this.emit('healthMetricsUpdate', metrics);
    }
    /**
     * Evaluate health thresholds and generate alerts
     */
    async evaluateHealthThresholds(metrics) {
        const alerts = [];
        // Response time alerts
        if (metrics.responseTime > this.config.healthThresholds.responseTime.critical) {
            alerts.push(this.createAlert('performance', 'critical', metrics.instanceId, `Critical response time: ${metrics.responseTime.toFixed(2)}ms`));
        }
        else if (metrics.responseTime > this.config.healthThresholds.responseTime.warning) {
            alerts.push(this.createAlert('performance', 'high', metrics.instanceId, `High response time: ${metrics.responseTime.toFixed(2)}ms`));
        }
        // Error rate alerts
        if (metrics.errorRate > this.config.healthThresholds.errorRate.critical) {
            alerts.push(this.createAlert('error', 'critical', metrics.instanceId, `Critical error rate: ${(metrics.errorRate * 100).toFixed(1)}%`));
        }
        else if (metrics.errorRate > this.config.healthThresholds.errorRate.warning) {
            alerts.push(this.createAlert('error', 'high', metrics.instanceId, `High error rate: ${(metrics.errorRate * 100).toFixed(1)}%`));
        }
        // Memory usage alerts
        const memoryUsagePercent = metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal;
        if (memoryUsagePercent > this.config.healthThresholds.memoryUsage.critical) {
            alerts.push(this.createAlert('memory', 'critical', metrics.instanceId, `Critical memory usage: ${(memoryUsagePercent * 100).toFixed(1)}%`));
        }
        else if (memoryUsagePercent > this.config.healthThresholds.memoryUsage.warning) {
            alerts.push(this.createAlert('memory', 'high', metrics.instanceId, `High memory usage: ${(memoryUsagePercent * 100).toFixed(1)}%`));
        }
        // Store alerts
        for (const alert of alerts) {
            this.alerts.set(alert.id, alert);
            this.emit('healthAlert', alert);
        }
    }
    /**
     * Create health alert
     */
    createAlert(type, severity, instanceId, message) {
        return {
            id: `${type}_${instanceId}_${Date.now()}`,
            type,
            severity,
            instanceId,
            message,
            timestamp: new Date(),
            resolved: false
        };
    }
    /**
     * Attempt automatic recovery
     */
    async attemptRecovery(instanceId, metrics) {
        const recentActions = this.recoveryActions.filter(action => action.instanceId === instanceId &&
            Date.now() - action.timestamp.getTime() < this.config.autoRecovery.restartWindow);
        const restartCount = recentActions.filter(action => action.type === 'restart').length;
        if (restartCount >= this.config.autoRecovery.maxRestarts) {
            this.logger.warn(`Max restart attempts reached for instance ${instanceId}, escalating`);
            await this.escalateRecovery(instanceId, metrics);
            return;
        }
        this.logger.info(`Attempting automatic recovery for instance ${instanceId}`);
        const startTime = perf_hooks_1.performance.now();
        try {
            await this.processManager.restartInstance(instanceId);
            const duration = perf_hooks_1.performance.now() - startTime;
            const action = {
                type: 'restart',
                instanceId,
                reason: `Health score: ${metrics.healthScore}, Status: ${metrics.status}`,
                timestamp: new Date(),
                success: true,
                duration
            };
            this.recoveryActions.push(action);
            this.emit('recoveryAction', action);
            this.logger.info(`Successfully restarted instance ${instanceId} in ${duration.toFixed(2)}ms`);
        }
        catch (error) {
            const duration = perf_hooks_1.performance.now() - startTime;
            const action = {
                type: 'restart',
                instanceId,
                reason: `Health score: ${metrics.healthScore}, Status: ${metrics.status}`,
                timestamp: new Date(),
                success: false,
                duration
            };
            this.recoveryActions.push(action);
            this.emit('recoveryAction', action);
            this.logger.error(`Failed to restart instance ${instanceId}:`, error);
            await this.escalateRecovery(instanceId, metrics);
        }
    }
    /**
     * Escalate recovery when automatic restart fails
     */
    async escalateRecovery(instanceId, metrics) {
        this.logger.warn(`Escalating recovery for instance ${instanceId}`);
        // Create critical alert
        const alert = this.createAlert('recovery', 'critical', instanceId, `Instance requires manual intervention - automatic recovery failed`);
        this.alerts.set(alert.id, alert);
        this.emit('healthAlert', alert);
        this.emit('recoveryEscalation', { instanceId, metrics, alert });
    }
    /**
     * Process and resolve alerts
     */
    processAlerts() {
        const now = new Date().getTime();
        const alertsToCheck = Array.from(this.alerts.values()).filter(alert => !alert.resolved);
        for (const alert of alertsToCheck) {
            // Check if alert condition is resolved
            const latestMetrics = this.getLatestMetrics(alert.instanceId);
            if (latestMetrics && this.isAlertResolved(alert, latestMetrics)) {
                alert.resolved = true;
                this.emit('alertResolved', alert);
                this.logger.info(`Alert resolved: ${alert.message}`);
            }
            // Auto-resolve old alerts
            const alertAge = now - alert.timestamp.getTime();
            if (alertAge > 3600000) { // 1 hour
                alert.resolved = true;
                this.logger.debug(`Auto-resolved old alert: ${alert.id}`);
            }
        }
    }
    /**
     * Check if alert condition is resolved
     */
    isAlertResolved(alert, metrics) {
        switch (alert.type) {
            case 'performance':
                return metrics.responseTime < this.config.healthThresholds.responseTime.warning;
            case 'error':
                return metrics.errorRate < this.config.healthThresholds.errorRate.warning;
            case 'memory':
                const memoryUsage = metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal;
                return memoryUsage < this.config.healthThresholds.memoryUsage.warning;
            case 'recovery':
                return metrics.status === 'healthy';
            default:
                return false;
        }
    }
    /**
     * Clean up old data
     */
    cleanupOldData() {
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
        // Clean up old metrics
        for (const [instanceId, history] of this.healthMetrics) {
            const filteredHistory = history.filter(metrics => metrics.timestamp.getTime() > cutoffTime);
            this.healthMetrics.set(instanceId, filteredHistory);
        }
        // Clean up resolved alerts
        const activeAlerts = Array.from(this.alerts.values()).filter(alert => !alert.resolved || alert.timestamp.getTime() > cutoffTime);
        this.alerts.clear();
        for (const alert of activeAlerts) {
            this.alerts.set(alert.id, alert);
        }
        // Clean up old recovery actions
        this.recoveryActions = this.recoveryActions.filter(action => action.timestamp.getTime() > cutoffTime);
    }
    /**
     * Get latest metrics for instance
     */
    getLatestMetrics(instanceId) {
        const history = this.healthMetrics.get(instanceId);
        return history && history.length > 0 ? history[history.length - 1] : null;
    }
    /**
     * Get metrics history for instance
     */
    getMetricsHistory(instanceId, limit = 50) {
        const history = this.healthMetrics.get(instanceId) || [];
        return history.slice(-limit);
    }
    /**
     * Generate system health status
     */
    generateSystemHealthStatus() {
        const instances = this.processManager.getInstances();
        const instanceCount = {
            total: instances.length,
            healthy: 0,
            warning: 0,
            critical: 0,
            down: 0
        };
        // Count instance statuses
        for (const instance of instances) {
            const metrics = this.getLatestMetrics(instance.id);
            if (metrics) {
                instanceCount[metrics.status]++;
            }
            else {
                instanceCount.down++;
            }
        }
        // Determine overall status
        let overall = 'healthy';
        if (instanceCount.critical > 0 || instanceCount.down > 0) {
            overall = 'critical';
        }
        else if (instanceCount.warning > 0) {
            overall = 'degraded';
        }
        // Get active alerts
        const activeAlerts = Array.from(this.alerts.values()).filter(alert => !alert.resolved);
        return {
            overall,
            timestamp: new Date(),
            instanceCount,
            systemMetrics: {
                totalMemory: process.memoryUsage().heapTotal,
                usedMemory: process.memoryUsage().heapUsed,
                cpuUsage: 0, // Would need additional calculation
                uptime: process.uptime(),
                activeConnections: instanceCount.total
            },
            alerts: activeAlerts
        };
    }
    /**
     * Get all active alerts
     */
    getActiveAlerts() {
        return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
    }
    /**
     * Get recovery action history
     */
    getRecoveryHistory(limit = 100) {
        return this.recoveryActions.slice(-limit);
    }
    /**
     * Shutdown health monitor
     */
    shutdown() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        if (this.alertInterval) {
            clearInterval(this.alertInterval);
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.logger.info('Health Monitor shutdown complete');
    }
}
exports.HealthMonitor = HealthMonitor;
exports.default = HealthMonitor;
//# sourceMappingURL=HealthMonitor.js.map