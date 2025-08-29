"use strict";
/**
 * Real-Time Endpoint Mismatch Monitor
 *
 * Monitors API endpoint usage in real-time to detect versioning inconsistencies
 * and endpoint path mismatches as they occur during development and runtime.
 *
 * Integrates with the existing NLD system to provide continuous monitoring
 * and automatic alert generation for endpoint mismatch patterns.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.endpointMismatchRealTimeMonitor = exports.EndpointMismatchRealTimeMonitor = void 0;
const events_1 = require("events");
const fs_1 = require("fs");
const path_1 = require("path");
/**
 * Real-time monitor for endpoint mismatch detection
 */
class EndpointMismatchRealTimeMonitor extends events_1.EventEmitter {
    isMonitoring = false;
    usageEvents = [];
    alerts = [];
    metrics;
    monitoringStartTime;
    logPath;
    // Pattern detection thresholds
    FAILURE_THRESHOLD = 0.5; // 50% failure rate triggers alert
    SAMPLE_SIZE = 100; // Number of recent events to analyze
    ALERT_COOLDOWN = 5 * 60 * 1000; // 5 minutes between similar alerts
    lastAlerts = new Map();
    constructor(logPath = '/workspaces/agent-feed/src/nld/monitoring') {
        super();
        this.logPath = logPath;
        this.ensureLogDirectory();
        this.initializeMetrics();
    }
    /**
     * Start real-time monitoring
     */
    startMonitoring() {
        if (this.isMonitoring) {
            console.log('⚠️ [NLD Monitor] Already monitoring');
            return;
        }
        this.isMonitoring = true;
        this.monitoringStartTime = Date.now();
        this.initializeMetrics();
        console.log('🔍 [NLD Monitor] Starting real-time endpoint monitoring...');
        // Start monitoring intervals
        this.startPeriodicAnalysis();
        this.startMetricsCollection();
        this.emit('monitoring_started');
    }
    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (!this.isMonitoring)
            return;
        this.isMonitoring = false;
        // Save final report
        this.generateMonitoringReport();
        console.log('🛑 [NLD Monitor] Stopped endpoint monitoring');
        this.emit('monitoring_stopped');
    }
    /**
     * Record endpoint usage event
     */
    recordEndpointUsage(event) {
        if (!this.isMonitoring)
            return;
        const fullEvent = {
            ...event,
            timestamp: new Date().toISOString(),
            hasVersionInPath: this.hasVersionInPath(event.path),
            pathPattern: this.extractPathPattern(event.path),
            protocolType: this.determineProtocolType(event.type, event.path)
        };
        this.usageEvents.push(fullEvent);
        this.updateMetrics(fullEvent);
        // Keep only recent events
        if (this.usageEvents.length > this.SAMPLE_SIZE * 2) {
            this.usageEvents = this.usageEvents.slice(-this.SAMPLE_SIZE);
        }
        // Immediate pattern check for critical issues
        if (fullEvent.status === 'failure') {
            this.checkForImmediatePatterns(fullEvent);
        }
        this.emit('endpoint_usage', fullEvent);
    }
    /**
     * Check for immediate patterns requiring alerts
     */
    checkForImmediatePatterns(event) {
        // Check for SSE connection failures - high priority
        if (event.type === 'sse_connection' && event.status === 'failure') {
            // Check if there are successful REST requests to similar paths
            const recentEvents = this.usageEvents.slice(-50);
            const similarRestSuccess = recentEvents.find(e => e.type === 'rest_request' &&
                e.status === 'success' &&
                this.pathsSimilar(e.path, event.path));
            if (similarRestSuccess) {
                this.generateAlert({
                    type: 'version_mismatch',
                    severity: 'critical',
                    description: `SSE connection failing while REST requests succeed for similar paths`,
                    affectedEndpoints: [event.path],
                    evidence: [event, similarRestSuccess],
                    impact: {
                        usersAffected: 1,
                        functionalityLoss: ['Real-time terminal streaming', 'Live updates'],
                        businessImpact: 'Critical feature unavailable'
                    },
                    recommendations: [
                        'Check if SSE endpoint uses correct API version',
                        'Verify backend route registration',
                        'Test endpoint connectivity manually'
                    ],
                    autoFixAvailable: false
                });
            }
        }
    }
    /**
     * Start periodic pattern analysis
     */
    startPeriodicAnalysis() {
        const analysisInterval = setInterval(() => {
            if (!this.isMonitoring) {
                clearInterval(analysisInterval);
                return;
            }
            this.performPatternAnalysis();
        }, 30000); // Every 30 seconds
    }
    /**
     * Perform comprehensive pattern analysis
     */
    performPatternAnalysis() {
        if (this.usageEvents.length < 10)
            return; // Need minimum events
        const recentEvents = this.usageEvents.slice(-this.SAMPLE_SIZE);
        // Analyze version consistency patterns
        this.analyzeVersionConsistency(recentEvents);
        // Analyze protocol-specific failure patterns
        this.analyzeProtocolFailures(recentEvents);
        // Analyze path pattern inconsistencies
        this.analyzePathPatterns(recentEvents);
        this.emit('pattern_analysis_complete');
    }
    /**
     * Analyze version consistency across protocols
     */
    analyzeVersionConsistency(events) {
        const sseEvents = events.filter(e => e.protocolType === 'sse');
        const restEvents = events.filter(e => e.protocolType === 'rest');
        if (sseEvents.length === 0 || restEvents.length === 0)
            return;
        const sseVersioned = sseEvents.filter(e => e.hasVersionInPath).length;
        const restVersioned = restEvents.filter(e => e.hasVersionInPath).length;
        const sseVersionRate = sseVersioned / sseEvents.length;
        const restVersionRate = restVersioned / restEvents.length;
        // Alert if there's a significant difference in versioning patterns
        if (Math.abs(sseVersionRate - restVersionRate) > 0.7) {
            this.generateAlert({
                type: 'version_mismatch',
                severity: 'high',
                description: `Inconsistent versioning patterns: SSE ${(sseVersionRate * 100).toFixed(1)}% versioned, REST ${(restVersionRate * 100).toFixed(1)}% versioned`,
                affectedEndpoints: [...new Set([
                        ...sseEvents.map(e => e.path),
                        ...restEvents.map(e => e.path)
                    ])],
                evidence: [...sseEvents.slice(-3), ...restEvents.slice(-3)],
                impact: {
                    usersAffected: this.estimateAffectedUsers(sseEvents, restEvents),
                    functionalityLoss: ['Inconsistent API behavior', 'Integration complexity'],
                    businessImpact: 'Development and maintenance overhead'
                },
                recommendations: [
                    'Standardize API versioning across all protocols',
                    'Update endpoint configurations to use consistent versioning',
                    'Add automated version consistency checks'
                ],
                autoFixAvailable: true
            });
        }
    }
    /**
     * Analyze protocol-specific failure patterns
     */
    analyzeProtocolFailures(events) {
        const protocolFailures = {
            sse: events.filter(e => e.protocolType === 'sse' && e.status === 'failure'),
            rest: events.filter(e => e.protocolType === 'rest' && e.status === 'failure'),
            websocket: events.filter(e => e.protocolType === 'websocket' && e.status === 'failure')
        };
        const protocolTotals = {
            sse: events.filter(e => e.protocolType === 'sse').length,
            rest: events.filter(e => e.protocolType === 'rest').length,
            websocket: events.filter(e => e.protocolType === 'websocket').length
        };
        // Check for disproportionate failure rates
        Object.entries(protocolFailures).forEach(([protocol, failures]) => {
            const total = protocolTotals[protocol];
            if (total === 0)
                return;
            const failureRate = failures.length / total;
            if (failureRate > this.FAILURE_THRESHOLD) {
                this.generateAlert({
                    type: 'protocol_failure',
                    severity: failureRate > 0.8 ? 'critical' : 'high',
                    description: `High ${protocol.toUpperCase()} failure rate: ${(failureRate * 100).toFixed(1)}%`,
                    affectedEndpoints: [...new Set(failures.map(f => f.path))],
                    evidence: failures.slice(-5),
                    impact: {
                        usersAffected: this.estimateAffectedUsers(failures),
                        functionalityLoss: this.getFunctionalityLossForProtocol(protocol),
                        businessImpact: failureRate > 0.8 ? 'Critical service disruption' : 'Service degradation'
                    },
                    recommendations: this.getProtocolFailureRecommendations(protocol, failures),
                    autoFixAvailable: false
                });
            }
        });
    }
    /**
     * Analyze path pattern inconsistencies
     */
    analyzePathPatterns(events) {
        const pathGroups = new Map();
        // Group similar paths
        events.forEach(event => {
            const basePattern = this.getBasePathPattern(event.path);
            if (!pathGroups.has(basePattern)) {
                pathGroups.set(basePattern, []);
            }
            pathGroups.get(basePattern).push(event);
        });
        // Check for inconsistent patterns within groups
        pathGroups.forEach((groupEvents, pattern) => {
            if (groupEvents.length < 3)
                return; // Need minimum events
            const versionedCount = groupEvents.filter(e => e.hasVersionInPath).length;
            const unversionedCount = groupEvents.length - versionedCount;
            // Alert if there's a mix of versioned and unversioned in the same pattern
            if (versionedCount > 0 && unversionedCount > 0) {
                this.generateAlert({
                    type: 'path_inconsistency',
                    severity: 'medium',
                    description: `Mixed versioning in ${pattern} endpoints: ${versionedCount} versioned, ${unversionedCount} unversioned`,
                    affectedEndpoints: [...new Set(groupEvents.map(e => e.path))],
                    evidence: groupEvents.slice(-3),
                    impact: {
                        usersAffected: this.estimateAffectedUsers(groupEvents),
                        functionalityLoss: ['API consistency issues', 'Client integration confusion'],
                        businessImpact: 'Developer experience degradation'
                    },
                    recommendations: [
                        `Standardize versioning for all ${pattern} endpoints`,
                        'Review API documentation for consistency',
                        'Update client code to use consistent paths'
                    ],
                    autoFixAvailable: true
                });
            }
        });
    }
    /**
     * Generate alert with cooldown management
     */
    generateAlert(alertData) {
        const alertKey = `${alertData.type}_${alertData.description}`;
        const now = Date.now();
        const lastAlert = this.lastAlerts.get(alertKey);
        // Check cooldown
        if (lastAlert && (now - lastAlert) < this.ALERT_COOLDOWN) {
            return; // Skip duplicate alert
        }
        const alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            ...alertData
        };
        this.alerts.push(alert);
        this.lastAlerts.set(alertKey, now);
        // Update metrics
        this.metrics.alertsGenerated++;
        console.log(`🚨 [NLD Alert] ${alert.severity.toUpperCase()}: ${alert.description}`);
        // Save alert to file
        this.saveAlert(alert);
        this.emit('alert_generated', alert);
    }
    /**
     * Helper methods for pattern analysis
     */
    hasVersionInPath(path) {
        return /\/v\d+\//.test(path);
    }
    extractPathPattern(path) {
        return path
            .replace(/\/v\d+\//, '/vX/')
            .replace(/\/\d+/g, '/:id')
            .replace(/\?.*$/, '');
    }
    determineProtocolType(type, path) {
        if (type === 'sse_connection' || path.includes('stream'))
            return 'sse';
        if (type === 'websocket_connection')
            return 'websocket';
        return 'rest';
    }
    pathsSimilar(path1, path2) {
        const pattern1 = this.extractPathPattern(path1);
        const pattern2 = this.extractPathPattern(path2);
        return pattern1 === pattern2;
    }
    getBasePathPattern(path) {
        return path
            .split('/')
            .slice(0, 4) // Take first 4 segments
            .join('/')
            .replace(/\/v\d+/, '/vX')
            .replace(/\d+/, 'ID');
    }
    estimateAffectedUsers(events, ...additionalEvents) {
        const allEvents = [events, ...additionalEvents].flat();
        const sessionIds = new Set(allEvents.map(e => e.sessionId).filter(Boolean));
        return Math.max(sessionIds.size, Math.ceil(allEvents.length / 10));
    }
    getFunctionalityLossForProtocol(protocol) {
        switch (protocol) {
            case 'sse':
                return ['Real-time updates', 'Live streaming', 'Terminal output'];
            case 'websocket':
                return ['Bidirectional communication', 'Real-time chat', 'Live collaboration'];
            case 'rest':
                return ['API data access', 'CRUD operations', 'Service integration'];
            default:
                return ['Unknown functionality'];
        }
    }
    getProtocolFailureRecommendations(protocol, failures) {
        const baseRecommendations = [
            `Check ${protocol.toUpperCase()} endpoint configuration`,
            'Verify network connectivity',
            'Review server logs for errors'
        ];
        if (protocol === 'sse') {
            baseRecommendations.push('Verify SSE endpoint versioning matches REST API', 'Check CORS configuration for SSE endpoints', 'Test EventSource connection manually');
        }
        return baseRecommendations;
    }
    /**
     * Initialize metrics
     */
    initializeMetrics() {
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            byProtocol: {
                sse: { success: 0, failure: 0 },
                rest: { success: 0, failure: 0 },
                websocket: { success: 0, failure: 0 }
            },
            byVersion: {
                versioned: { success: 0, failure: 0 },
                unversioned: { success: 0, failure: 0 }
            },
            alertsGenerated: 0,
            patternsDetected: 0,
            averageResponseTime: 0,
            uptime: 0
        };
    }
    /**
     * Update metrics with new event
     */
    updateMetrics(event) {
        this.metrics.totalRequests++;
        if (event.status === 'success') {
            this.metrics.successfulRequests++;
        }
        else {
            this.metrics.failedRequests++;
        }
        // Update protocol metrics
        const protocolMetrics = this.metrics.byProtocol[event.protocolType];
        if (event.status === 'success') {
            protocolMetrics.success++;
        }
        else {
            protocolMetrics.failure++;
        }
        // Update version metrics
        const versionMetrics = event.hasVersionInPath
            ? this.metrics.byVersion.versioned
            : this.metrics.byVersion.unversioned;
        if (event.status === 'success') {
            versionMetrics.success++;
        }
        else {
            versionMetrics.failure++;
        }
        // Update average response time
        if (event.responseTime) {
            const totalResponseTime = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + event.responseTime;
            this.metrics.averageResponseTime = totalResponseTime / this.metrics.totalRequests;
        }
        // Update uptime
        this.metrics.uptime = this.monitoringStartTime ? Date.now() - this.monitoringStartTime : 0;
    }
    /**
     * Start metrics collection interval
     */
    startMetricsCollection() {
        const metricsInterval = setInterval(() => {
            if (!this.isMonitoring) {
                clearInterval(metricsInterval);
                return;
            }
            this.saveMetrics();
            this.emit('metrics_updated', this.metrics);
        }, 60000); // Every minute
    }
    /**
     * Get current monitoring metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Get recent alerts
     */
    getRecentAlerts(count = 10) {
        return this.alerts.slice(-count);
    }
    /**
     * Save alert to file
     */
    saveAlert(alert) {
        try {
            const alertFile = (0, path_1.join)(this.logPath, `alert_${alert.id}.json`);
            (0, fs_1.writeFileSync)(alertFile, JSON.stringify(alert, null, 2));
        }
        catch (error) {
            console.error('❌ [NLD Monitor] Failed to save alert:', error);
        }
    }
    /**
     * Save metrics to file
     */
    saveMetrics() {
        try {
            const metricsFile = (0, path_1.join)(this.logPath, `metrics_${new Date().toISOString().split('T')[0]}.json`);
            (0, fs_1.writeFileSync)(metricsFile, JSON.stringify(this.metrics, null, 2));
        }
        catch (error) {
            console.error('❌ [NLD Monitor] Failed to save metrics:', error);
        }
    }
    /**
     * Generate comprehensive monitoring report
     */
    generateMonitoringReport() {
        const report = {
            summary: {
                monitoringDuration: this.metrics.uptime,
                totalEvents: this.usageEvents.length,
                alertsGenerated: this.alerts.length,
                overallSuccessRate: this.metrics.successfulRequests / this.metrics.totalRequests,
                timestamp: new Date().toISOString()
            },
            metrics: this.metrics,
            topFailurePatterns: this.getTopFailurePatterns(),
            recommendations: this.generateRecommendations(),
            alerts: this.alerts.map(a => ({
                id: a.id,
                timestamp: a.timestamp,
                severity: a.severity,
                type: a.type,
                description: a.description,
                affectedEndpoints: a.affectedEndpoints.length
            }))
        };
        // Save report
        const reportFile = (0, path_1.join)(this.logPath, `monitoring_report_${Date.now()}.json`);
        (0, fs_1.writeFileSync)(reportFile, JSON.stringify(report, null, 2));
        console.log(`📊 [NLD Monitor] Monitoring report saved: ${reportFile}`);
        return report;
    }
    /**
     * Get top failure patterns
     */
    getTopFailurePatterns() {
        const failures = this.usageEvents.filter(e => e.status === 'failure');
        const pathCounts = new Map();
        failures.forEach(f => {
            const pattern = this.extractPathPattern(f.path);
            pathCounts.set(pattern, (pathCounts.get(pattern) || 0) + 1);
        });
        return Array.from(pathCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([pattern, count]) => ({ pattern, failures: count }));
    }
    /**
     * Generate monitoring recommendations
     */
    generateRecommendations() {
        const recommendations = [];
        const successRate = this.metrics.successfulRequests / this.metrics.totalRequests;
        if (successRate < 0.8) {
            recommendations.push('Critical: Overall success rate is below 80% - investigate immediate failures');
        }
        const sseFailureRate = this.metrics.byProtocol.sse.failure /
            (this.metrics.byProtocol.sse.success + this.metrics.byProtocol.sse.failure);
        if (sseFailureRate > 0.3) {
            recommendations.push('High SSE failure rate detected - check endpoint versioning consistency');
        }
        if (this.alerts.filter(a => a.type === 'version_mismatch').length > 0) {
            recommendations.push('Version mismatch patterns detected - implement unified API versioning strategy');
        }
        if (this.metrics.alertsGenerated > 5) {
            recommendations.push('Multiple alerts generated - consider implementing automated fixes');
        }
        recommendations.push('Review monitoring report regularly for pattern trends');
        return recommendations;
    }
    /**
     * Ensure log directory exists
     */
    ensureLogDirectory() {
        if (!(0, fs_1.existsSync)(this.logPath)) {
            (0, fs_1.mkdirSync)(this.logPath, { recursive: true });
            console.log(`📁 [NLD Monitor] Created log directory: ${this.logPath}`);
        }
    }
}
exports.EndpointMismatchRealTimeMonitor = EndpointMismatchRealTimeMonitor;
// Export singleton instance
exports.endpointMismatchRealTimeMonitor = new EndpointMismatchRealTimeMonitor();
//# sourceMappingURL=endpoint-mismatch-real-time-monitor.js.map