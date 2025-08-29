"use strict";
/**
 * Real-Time SSE Failure Monitoring System
 * Monitors SSE connections and detects failures in real-time
 * Part of NLD (Neuro-Learning Development) system
 *
 * Continuously monitors SSE connections for failure patterns, specifically:
 * - Status SSE connection not established despite terminal SSE requests
 * - Status broadcasts having 0 connections while terminal shows 1+ connections
 * - UI stuck on "starting" status when instance is actually running
 * - Connection coordination issues between status and terminal streams
 * - SSE buffer accumulation and replay loop patterns
 * - Frontend message state accumulation issues
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealTimeSSEFailureMonitor = void 0;
const events_1 = require("events");
const sse_connection_pattern_detector_1 = require("./sse-connection-pattern-detector");
const sse_anti_patterns_database_1 = require("./sse-anti-patterns-database");
class RealTimeSSEFailureMonitor extends events_1.EventEmitter {
    isMonitoring = false;
    patternDetector;
    antiPatternsDB;
    connectionMetrics = new Map();
    activeAlerts = new Map();
    monitoringInterval = null;
    alertQueue = [];
    // Configuration
    CHECK_INTERVAL = 2000; // 2 seconds
    STATUS_STUCK_THRESHOLD = 10000; // 10 seconds
    CONNECTION_TIMEOUT = 5000; // 5 seconds
    constructor() {
        super();
        this.patternDetector = new sse_connection_pattern_detector_1.SSEConnectionPatternDetector();
        this.antiPatternsDB = new sse_anti_patterns_database_1.SSEAntiPatternsDatabase();
        // Auto-start pattern detector
        this.patternDetector.startMonitoring();
    }
    /**
     * Start real-time monitoring
     */
    startMonitoring() {
        if (this.isMonitoring) {
            console.log('⚠️ SSE Failure Monitor: Already monitoring');
            return;
        }
        this.isMonitoring = true;
        console.log('🔍 NLD Real-Time SSE Failure Monitor: Started');
        // Start periodic checks
        this.monitoringInterval = setInterval(() => {
            this.performMonitoringCycle();
        }, this.CHECK_INTERVAL);
        this.emit('monitoring_started');
    }
    /**
     * Stop monitoring
     */
    stopMonitoring() {
        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        console.log('🛑 NLD Real-Time SSE Failure Monitor: Stopped');
        this.emit('monitoring_stopped');
    }
    /**
     * Update connection metrics for an instance
     */
    updateConnectionMetrics(instanceId, metrics) {
        const existing = this.connectionMetrics.get(instanceId) || this.createDefaultMetrics(instanceId);
        const updated = { ...existing, ...metrics };
        this.connectionMetrics.set(instanceId, updated);
        // Update pattern detector connection state
        this.patternDetector.updateConnectionState(instanceId, updated);
        // Emit update event
        this.emit('metrics_updated', { instanceId, metrics: updated });
    }
    /**
     * Report SSE connection event
     */
    reportSSEEvent(instanceId, eventType, data) {
        const metrics = this.connectionMetrics.get(instanceId) || this.createDefaultMetrics(instanceId);
        const now = new Date();
        switch (eventType) {
            case 'status_connected':
                metrics.statusSSE.connected = true;
                metrics.statusSSE.connectionCount++;
                metrics.statusSSE.lastActivity = now;
                break;
            case 'status_disconnected':
                metrics.statusSSE.connected = false;
                metrics.statusSSE.connectionCount = Math.max(0, metrics.statusSSE.connectionCount - 1);
                break;
            case 'terminal_connected':
                metrics.terminalSSE.connected = true;
                metrics.terminalSSE.connectionCount++;
                metrics.terminalSSE.instanceId = instanceId;
                metrics.terminalSSE.lastActivity = now;
                break;
            case 'terminal_disconnected':
                metrics.terminalSSE.connected = false;
                metrics.terminalSSE.connectionCount = Math.max(0, metrics.terminalSSE.connectionCount - 1);
                break;
            case 'status_message':
                metrics.statusSSE.lastActivity = now;
                if (data?.status) {
                    metrics.uiState.status = data.status;
                    metrics.uiState.lastUpdate = now;
                    metrics.uiState.stuckDuration = 0; // Reset stuck duration
                }
                break;
            case 'terminal_message':
                metrics.terminalSSE.lastActivity = now;
                break;
        }
        this.updateConnectionMetrics(instanceId, metrics);
    }
    /**
     * Report UI state change
     */
    reportUIState(instanceId, status) {
        const metrics = this.connectionMetrics.get(instanceId) || this.createDefaultMetrics(instanceId);
        const now = new Date();
        // If status changed, reset stuck duration
        if (metrics.uiState.status !== status) {
            metrics.uiState.stuckDuration = 0;
            metrics.uiState.lastUpdate = now;
        }
        metrics.uiState.status = status;
        this.updateConnectionMetrics(instanceId, metrics);
    }
    /**
     * Perform a monitoring cycle
     */
    performMonitoringCycle() {
        const now = new Date();
        for (const [instanceId, metrics] of this.connectionMetrics.entries()) {
            // Update stuck duration
            if (metrics.uiState.lastUpdate) {
                metrics.uiState.stuckDuration = now.getTime() - metrics.uiState.lastUpdate.getTime();
            }
            // Check for failure patterns
            this.checkForFailurePatterns(instanceId, metrics);
        }
        // Process alert queue
        this.processAlertQueue();
    }
    /**
     * Check for SSE failure patterns
     */
    checkForFailurePatterns(instanceId, metrics) {
        // Pattern 1: Status SSE Zero Connections While Terminal Connected
        if (metrics.terminalSSE.connected && metrics.terminalSSE.connectionCount > 0 &&
            metrics.statusSSE.connectionCount === 0 &&
            metrics.uiState.status === 'starting' &&
            metrics.uiState.stuckDuration > this.STATUS_STUCK_THRESHOLD) {
            this.createFailureAlert({
                type: 'status_broadcast_zero',
                severity: 'critical',
                instanceId,
                description: `Status SSE has 0 connections while terminal SSE has ${metrics.terminalSSE.connectionCount} connections. UI stuck on starting for ${metrics.uiState.stuckDuration}ms.`,
                metrics,
                recommendedActions: this.antiPatternsDB.getRecoveryActions('status broadcast zero connections')
            });
        }
        // Pattern 2: Status SSE Missing Despite Terminal Connection
        if (metrics.terminalSSE.connected && !metrics.statusSSE.connected &&
            metrics.uiState.status === 'starting' &&
            metrics.uiState.stuckDuration > this.STATUS_STUCK_THRESHOLD) {
            this.createFailureAlert({
                type: 'status_sse_missing',
                severity: 'high',
                instanceId,
                description: `Terminal SSE connected but status SSE not established. UI status stuck on starting.`,
                metrics,
                recommendedActions: this.antiPatternsDB.getRecoveryActions('status sse connection not established')
            });
        }
        // Pattern 3: UI Stuck on Starting Despite Backend Running
        if (metrics.uiState.status === 'starting' &&
            metrics.uiState.stuckDuration > this.STATUS_STUCK_THRESHOLD * 2) {
            this.createFailureAlert({
                type: 'ui_stuck_starting',
                severity: 'high',
                instanceId,
                description: `UI status stuck on "starting" for ${metrics.uiState.stuckDuration}ms. Possible status update failure.`,
                metrics,
                recommendedActions: this.antiPatternsDB.getRecoveryActions('ui stuck starting')
            });
        }
        // Pattern 4: Connection Coordination Issues
        if (metrics.statusSSE.connected !== metrics.terminalSSE.connected) {
            this.createFailureAlert({
                type: 'connection_coordination',
                severity: 'medium',
                instanceId,
                description: `Connection state mismatch: Status SSE ${metrics.statusSSE.connected ? 'connected' : 'disconnected'}, Terminal SSE ${metrics.terminalSSE.connected ? 'connected' : 'disconnected'}`,
                metrics,
                recommendedActions: this.antiPatternsDB.getRecoveryActions('connection coordination issues')
            });
        }
        // Pattern 5: Terminal Input Path Issues
        if (metrics.terminalSSE.connected &&
            metrics.terminalSSE.lastActivity &&
            (new Date().getTime() - metrics.terminalSSE.lastActivity.getTime()) > this.CONNECTION_TIMEOUT * 6) {
            this.createFailureAlert({
                type: 'terminal_input_broken',
                severity: 'medium',
                instanceId,
                description: `Terminal SSE connected but no activity for ${new Date().getTime() - metrics.terminalSSE.lastActivity.getTime()}ms. Possible input forwarding issue.`,
                metrics,
                recommendedActions: this.antiPatternsDB.getRecoveryActions('terminal input forwarding')
            });
        }
    }
    /**
     * Create a failure alert
     */
    createFailureAlert(alertData) {
        const alertId = `alert-${alertData.instanceId}-${alertData.type}-${Date.now()}`;
        // Check if similar alert already exists
        const existingAlert = Array.from(this.activeAlerts.values()).find(alert => alert.instanceId === alertData.instanceId &&
            alert.type === alertData.type &&
            !alert.resolved);
        if (existingAlert) {
            // Update existing alert instead of creating duplicate
            existingAlert.description = alertData.description;
            existingAlert.metrics = alertData.metrics;
            return;
        }
        const alert = {
            id: alertId,
            timestamp: new Date(),
            ...alertData,
            autoRecoveryAttempted: false,
            resolved: false
        };
        this.activeAlerts.set(alertId, alert);
        this.alertQueue.push(alert);
        console.log(`🚨 SSE Failure Alert [${alertData.severity.toUpperCase()}]: ${alertData.description}`);
        // Emit alert event
        this.emit('failure_alert', alert);
        // Capture pattern for learning
        this.capturePatternForLearning(alert);
    }
    /**
     * Capture failure pattern for learning
     */
    async capturePatternForLearning(alert) {
        try {
            const triggerCondition = {
                type: 'manual_trigger', // Will be enhanced based on alert type
                data: {
                    alertType: alert.type,
                    severity: alert.severity,
                    metrics: alert.metrics
                },
                source: 'RealTimeSSEFailureMonitor'
            };
            await this.patternDetector.captureFailurePattern(triggerCondition, {
                task: `SSE Connection Management for Instance ${alert.instanceId}`,
                expectedBehavior: 'Both status and terminal SSE connections active with UI status updates working',
                actualBehavior: alert.description,
                errorMessages: [alert.description]
            }, alert.metrics, alert.metrics.uiState, {
                claudeConfidence: 0.8, // Confidence in detection accuracy
                userSuccessRate: 0.1, // Low success rate when this pattern occurs
                tddUsed: false // TDD patterns not used in failure scenario
            });
        }
        catch (error) {
            console.error('Failed to capture pattern for learning:', error);
        }
    }
    /**
     * Process alert queue and attempt auto-recovery
     */
    processAlertQueue() {
        while (this.alertQueue.length > 0) {
            const alert = this.alertQueue.shift();
            // Attempt auto-recovery for critical alerts
            if (alert.severity === 'critical' && !alert.autoRecoveryAttempted) {
                this.attemptAutoRecovery(alert);
            }
        }
    }
    /**
     * Attempt automatic recovery for critical alerts
     */
    attemptAutoRecovery(alert) {
        alert.autoRecoveryAttempted = true;
        console.log(`🔧 Attempting auto-recovery for alert ${alert.id}`);
        switch (alert.type) {
            case 'status_broadcast_zero':
                // Emit recovery event for status SSE reconnection
                this.emit('auto_recovery', {
                    action: 'reconnect_status_sse',
                    instanceId: alert.instanceId,
                    alert
                });
                break;
            case 'status_sse_missing':
                // Emit recovery event for status SSE establishment
                this.emit('auto_recovery', {
                    action: 'establish_status_sse',
                    instanceId: alert.instanceId,
                    alert
                });
                break;
            case 'ui_stuck_starting':
                // Emit recovery event for forced status refresh
                this.emit('auto_recovery', {
                    action: 'force_status_refresh',
                    instanceId: alert.instanceId,
                    alert
                });
                break;
        }
    }
    /**
     * Resolve an alert
     */
    resolveAlert(alertId, resolutionTime) {
        const alert = this.activeAlerts.get(alertId);
        if (alert) {
            alert.resolved = true;
            alert.resolutionTime = resolutionTime || Date.now() - alert.timestamp.getTime();
            console.log(`✅ Resolved SSE failure alert: ${alertId} (${alert.resolutionTime}ms)`);
            this.emit('alert_resolved', alert);
        }
    }
    /**
     * Get active alerts
     */
    getActiveAlerts() {
        return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
    }
    /**
     * Get connection metrics for instance
     */
    getConnectionMetrics(instanceId) {
        return this.connectionMetrics.get(instanceId) || null;
    }
    /**
     * Get all connection metrics
     */
    getAllConnectionMetrics() {
        return this.connectionMetrics;
    }
    /**
     * Generate monitoring report
     */
    generateReport() {
        const activeAlerts = this.getActiveAlerts();
        const report = {
            monitoringActive: this.isMonitoring,
            totalInstances: this.connectionMetrics.size,
            activeAlerts: activeAlerts.length,
            alertsByType: {},
            alertsBySeverity: {},
            connectionHealth: []
        };
        // Count alerts by type and severity
        activeAlerts.forEach(alert => {
            report.alertsByType[alert.type] = (report.alertsByType[alert.type] || 0) + 1;
            report.alertsBySeverity[alert.severity] = (report.alertsBySeverity[alert.severity] || 0) + 1;
        });
        // Assess connection health for each instance
        for (const [instanceId, metrics] of this.connectionMetrics.entries()) {
            report.connectionHealth.push({
                instanceId,
                statusSSEHealth: this.assessSSEHealth(metrics.statusSSE),
                terminalSSEHealth: this.assessSSEHealth(metrics.terminalSSE),
                uiStateHealth: this.assessUIStateHealth(metrics.uiState)
            });
        }
        return report;
    }
    /**
     * Create default metrics for new instance
     */
    createDefaultMetrics(instanceId) {
        return {
            instanceId,
            statusSSE: {
                connected: false,
                connectionCount: 0,
                endpoint: '/api/status/stream',
                lastActivity: null
            },
            terminalSSE: {
                connected: false,
                connectionCount: 0,
                endpoint: `/api/claude/instances/${instanceId}/terminal/stream`,
                instanceId: null,
                lastActivity: null
            },
            pollingState: {
                active: false,
                instanceId: null,
                interval: 2000
            },
            uiState: {
                status: 'starting',
                lastUpdate: null,
                stuckDuration: 0
            },
            performanceMetrics: {
                connectionLatency: 0,
                messageDelay: 0,
                recoveryTime: 0
            }
        };
    }
    /**
     * Assess SSE connection health
     */
    assessSSEHealth(sseState) {
        if (!sseState.connected || sseState.connectionCount === 0) {
            return 'error';
        }
        if (sseState.lastActivity && (new Date().getTime() - sseState.lastActivity.getTime()) > this.CONNECTION_TIMEOUT * 2) {
            return 'warning';
        }
        return 'good';
    }
    /**
     * Assess UI state health
     */
    assessUIStateHealth(uiState) {
        if (uiState.status === 'starting' && uiState.stuckDuration > this.STATUS_STUCK_THRESHOLD) {
            return 'error';
        }
        if (uiState.status === 'error') {
            return 'error';
        }
        if (uiState.stuckDuration > this.STATUS_STUCK_THRESHOLD / 2) {
            return 'warning';
        }
        return 'good';
    }
}
exports.RealTimeSSEFailureMonitor = RealTimeSSEFailureMonitor;
//# sourceMappingURL=real-time-sse-failure-monitor.js.map