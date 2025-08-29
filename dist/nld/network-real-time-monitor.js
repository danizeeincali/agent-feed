"use strict";
/**
 * Real-Time Network Monitoring System - NLD Integration
 *
 * Provides live monitoring of network failures with SSE integration
 * for immediate pattern detection and alert generation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkRealTimeMonitor = void 0;
const network_failure_pattern_detector_1 = require("./network-failure-pattern-detector");
class NetworkRealTimeMonitor {
    detector;
    config;
    eventSource = null;
    alertHistory = [];
    monitoringActive = false;
    performanceBuffer = [];
    batchReportTimer = null;
    constructor(config = {}) {
        this.config = {
            sseEndpoint: config.sseEndpoint || '/api/events',
            alertThresholds: {
                errorRate: 0.1, // 10% error rate
                responseTime: 5000, // 5 seconds
                failureSpike: 5, // 5 failures in short period
                ...config.alertThresholds
            },
            monitoring: {
                enableConsoleCapture: true,
                enableNetworkInterception: true,
                enablePerformanceTracking: true,
                ...config.monitoring
            },
            reporting: {
                realTimeAlerts: true,
                batchReporting: true,
                batchInterval: 60000, // 1 minute
                ...config.reporting
            }
        };
        this.detector = new network_failure_pattern_detector_1.NetworkFailurePatternDetector();
        this.initializeMonitoring();
    }
    initializeMonitoring() {
        if (this.config.monitoring.enableConsoleCapture) {
            this.setupConsoleMonitoring();
        }
        if (this.config.monitoring.enableNetworkInterception) {
            this.setupNetworkMonitoring();
        }
        if (this.config.monitoring.enablePerformanceTracking) {
            this.setupPerformanceMonitoring();
        }
        if (this.config.reporting.realTimeAlerts) {
            this.setupSSEConnection();
        }
        if (this.config.reporting.batchReporting) {
            this.setupBatchReporting();
        }
        this.monitoringActive = true;
        console.log('🔍 [NLD] Real-time network monitoring started');
    }
    setupConsoleMonitoring() {
        // Enhanced console monitoring with pattern analysis
        const originalConsole = {
            error: console.error,
            warn: console.warn,
            log: console.log
        };
        console.error = (...args) => {
            originalConsole.error.apply(console, args);
            this.analyzeConsoleOutput('error', args);
        };
        console.warn = (...args) => {
            originalConsole.warn.apply(console, args);
            this.analyzeConsoleOutput('warn', args);
        };
        // Monitor uncaught errors
        window.addEventListener('error', (event) => {
            this.analyzeGlobalError(event);
        });
        window.addEventListener('unhandledrejection', (event) => {
            this.analyzeUnhandledRejection(event);
        });
    }
    setupNetworkMonitoring() {
        // Enhanced fetch monitoring with performance tracking
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const startTime = performance.now();
            const requestId = this.generateRequestId();
            const url = typeof args[0] === 'string' ? args[0] : args[0].url;
            try {
                const response = await originalFetch(...args);
                const responseTime = performance.now() - startTime;
                this.recordNetworkMetrics({
                    requestId,
                    url,
                    method: args[1]?.method || 'GET',
                    statusCode: response.status,
                    responseTime,
                    success: response.ok,
                    timestamp: Date.now()
                });
                if (!response.ok) {
                    this.triggerNetworkFailureAlert(url, response.status, responseTime, 'HTTP_ERROR');
                }
                return response;
            }
            catch (error) {
                const responseTime = performance.now() - startTime;
                this.recordNetworkMetrics({
                    requestId,
                    url,
                    method: args[1]?.method || 'GET',
                    responseTime,
                    success: false,
                    timestamp: Date.now(),
                    error: error.message
                });
                this.triggerNetworkFailureAlert(url, 0, responseTime, 'NETWORK_ERROR', error);
                throw error;
            }
        };
    }
    setupPerformanceMonitoring() {
        // Monitor page performance metrics
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'navigation') {
                        this.analyzeNavigationTiming(entry);
                    }
                    if (entry.entryType === 'resource') {
                        this.analyzeResourceTiming(entry);
                    }
                }
            });
            try {
                observer.observe({ entryTypes: ['navigation', 'resource'] });
            }
            catch (e) {
                console.warn('[NLD] PerformanceObserver not fully supported');
            }
        }
    }
    setupSSEConnection() {
        if (typeof EventSource === 'undefined')
            return;
        try {
            this.eventSource = new EventSource(this.config.sseEndpoint);
            this.eventSource.onopen = () => {
                console.log('🔗 [NLD] SSE connection established');
            };
            this.eventSource.onerror = (error) => {
                console.error('🚨 [NLD] SSE connection error:', error);
                this.triggerNetworkFailureAlert(this.config.sseEndpoint, 0, 0, 'SSE_CONNECTION_ERROR');
            };
            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.processSSEMessage(data);
                }
                catch (e) {
                    console.warn('[NLD] Invalid SSE message format');
                }
            };
        }
        catch (error) {
            console.error('[NLD] Failed to establish SSE connection:', error);
        }
    }
    setupBatchReporting() {
        this.batchReportTimer = setInterval(() => {
            this.generateBatchReport();
        }, this.config.reporting.batchInterval);
    }
    analyzeConsoleOutput(level, args) {
        const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)).join(' ');
        // Check for network-related patterns
        const networkPatterns = [
            /failed to fetch/i,
            /network error/i,
            /cors.*error/i,
            /timeout/i,
            /connection.*refused/i,
            /api.*(?:error|failed)/i,
            /websocket.*(?:error|closed)/i,
            /xhr.*error/i
        ];
        if (networkPatterns.some(pattern => pattern.test(message))) {
            this.generateAlert({
                type: 'PATTERN',
                severity: level === 'error' ? 'high' : 'medium',
                message: `Console ${level}: ${message}`,
                source: 'CONSOLE',
                timestamp: Date.now()
            });
        }
    }
    analyzeGlobalError(event) {
        if (this.isNetworkRelatedError(event.error || event.message)) {
            this.generateAlert({
                type: 'CRITICAL',
                severity: 'critical',
                message: `Global error: ${event.message}`,
                source: 'GLOBAL_ERROR',
                timestamp: Date.now(),
                details: {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    stack: event.error?.stack
                }
            });
        }
    }
    analyzeUnhandledRejection(event) {
        const reason = event.reason;
        if (this.isNetworkRelatedError(reason)) {
            this.generateAlert({
                type: 'CRITICAL',
                severity: 'critical',
                message: `Unhandled rejection: ${reason?.message || reason}`,
                source: 'UNHANDLED_REJECTION',
                timestamp: Date.now(),
                details: {
                    reason: reason,
                    stack: reason?.stack
                }
            });
        }
    }
    recordNetworkMetrics(metrics) {
        this.performanceBuffer.push({
            timestamp: metrics.timestamp,
            responseTime: metrics.responseTime,
            success: metrics.success
        });
        // Keep buffer size manageable
        if (this.performanceBuffer.length > 1000) {
            this.performanceBuffer = this.performanceBuffer.slice(-500);
        }
        // Check for performance thresholds
        if (metrics.responseTime > this.config.alertThresholds.responseTime) {
            this.generateAlert({
                type: 'THRESHOLD',
                severity: 'medium',
                message: `Slow response detected: ${metrics.responseTime}ms for ${metrics.url}`,
                source: 'PERFORMANCE',
                timestamp: Date.now(),
                metrics: metrics
            });
        }
        // Check error rate
        this.checkErrorRate();
    }
    triggerNetworkFailureAlert(url, statusCode, responseTime, errorType, error) {
        this.generateAlert({
            type: 'CRITICAL',
            severity: this.calculateSeverityFromStatus(statusCode),
            message: `Network failure: ${errorType} for ${url} (${statusCode})`,
            source: 'NETWORK',
            timestamp: Date.now(),
            details: {
                url,
                statusCode,
                responseTime,
                errorType,
                error: error?.message,
                stack: error?.stack
            }
        });
    }
    checkErrorRate() {
        const recentMetrics = this.performanceBuffer.filter(m => m.timestamp > Date.now() - 60000 // Last minute
        );
        if (recentMetrics.length === 0)
            return;
        const errorRate = recentMetrics.filter(m => !m.success).length / recentMetrics.length;
        if (errorRate > this.config.alertThresholds.errorRate) {
            this.generateAlert({
                type: 'SPIKE',
                severity: 'high',
                message: `High error rate detected: ${(errorRate * 100).toFixed(1)}%`,
                source: 'METRICS',
                timestamp: Date.now(),
                metrics: {
                    errorRate,
                    totalRequests: recentMetrics.length,
                    timeWindow: '1 minute'
                }
            });
        }
    }
    generateAlert(alertData) {
        const alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: alertData.timestamp,
            type: alertData.type,
            severity: alertData.severity,
            message: alertData.message,
            patterns: this.detector.getPatterns().slice(-5), // Last 5 patterns
            metrics: {
                errorRate: this.calculateCurrentErrorRate(),
                responseTime: this.calculateAverageResponseTime(),
                affectedEndpoints: this.getAffectedEndpoints()
            },
            recommendations: this.generateRecommendations(alertData)
        };
        this.alertHistory.push(alert);
        this.logAlert(alert);
        if (this.config.reporting.realTimeAlerts) {
            this.broadcastAlert(alert);
        }
    }
    calculateCurrentErrorRate() {
        const recentMetrics = this.performanceBuffer.filter(m => m.timestamp > Date.now() - 300000 // Last 5 minutes
        );
        if (recentMetrics.length === 0)
            return 0;
        return recentMetrics.filter(m => !m.success).length / recentMetrics.length;
    }
    calculateAverageResponseTime() {
        const recentMetrics = this.performanceBuffer.filter(m => m.timestamp > Date.now() - 300000 // Last 5 minutes
        );
        if (recentMetrics.length === 0)
            return 0;
        const totalTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0);
        return totalTime / recentMetrics.length;
    }
    getAffectedEndpoints() {
        const patterns = this.detector.getPatterns();
        const recentPatterns = patterns.filter(p => p.timestamp > Date.now() - 300000);
        const endpoints = new Set();
        recentPatterns.forEach(p => {
            if (p.context.url)
                endpoints.add(p.context.url);
        });
        return Array.from(endpoints).slice(0, 10);
    }
    generateRecommendations(alertData) {
        const recommendations = [];
        switch (alertData.type) {
            case 'SPIKE':
                recommendations.push('Investigate recent deployments or infrastructure changes');
                recommendations.push('Check server logs for errors');
                recommendations.push('Monitor resource usage and scaling');
                break;
            case 'THRESHOLD':
                recommendations.push('Optimize slow endpoints');
                recommendations.push('Implement request caching');
                recommendations.push('Consider CDN for static resources');
                break;
            case 'CRITICAL':
                recommendations.push('Immediate investigation required');
                recommendations.push('Check network connectivity');
                recommendations.push('Verify API endpoint availability');
                break;
            case 'PATTERN':
                recommendations.push('Analyze recurring patterns');
                recommendations.push('Implement error handling improvements');
                recommendations.push('Consider circuit breaker pattern');
                break;
        }
        return recommendations;
    }
    isNetworkRelatedError(error) {
        if (!error)
            return false;
        const message = (typeof error === 'string' ? error : error.message || '').toLowerCase();
        const networkKeywords = [
            'network', 'fetch', 'cors', 'timeout', 'connection',
            'endpoint', 'api', 'http', 'websocket', 'xhr', 'refused'
        ];
        return networkKeywords.some(keyword => message.includes(keyword));
    }
    calculateSeverityFromStatus(statusCode) {
        if (statusCode >= 500)
            return 'critical';
        if (statusCode >= 400)
            return 'high';
        if (statusCode >= 300)
            return 'medium';
        return 'low';
    }
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    analyzeNavigationTiming(entry) {
        const totalTime = entry.loadEventEnd - entry.fetchStart;
        if (totalTime > 10000) { // 10 seconds
            this.generateAlert({
                type: 'THRESHOLD',
                severity: 'medium',
                message: `Slow page load detected: ${totalTime}ms`,
                source: 'NAVIGATION',
                timestamp: Date.now(),
                details: {
                    dnsTime: entry.domainLookupEnd - entry.domainLookupStart,
                    connectTime: entry.connectEnd - entry.connectStart,
                    responseTime: entry.responseEnd - entry.responseStart,
                    renderTime: entry.loadEventEnd - entry.responseEnd
                }
            });
        }
    }
    analyzeResourceTiming(entry) {
        const resourceTime = entry.responseEnd - entry.fetchStart;
        if (resourceTime > 5000) { // 5 seconds for resource load
            this.generateAlert({
                type: 'THRESHOLD',
                severity: 'low',
                message: `Slow resource load: ${entry.name} took ${resourceTime}ms`,
                source: 'RESOURCE',
                timestamp: Date.now(),
                details: {
                    name: entry.name,
                    size: entry.transferSize,
                    type: entry.initiatorType
                }
            });
        }
    }
    processSSEMessage(data) {
        // Process incoming SSE messages for network status updates
        if (data.type === 'network_status' && data.status === 'degraded') {
            this.generateAlert({
                type: 'PATTERN',
                severity: 'medium',
                message: 'Network degradation reported via SSE',
                source: 'SSE',
                timestamp: Date.now(),
                details: data
            });
        }
    }
    logAlert(alert) {
        const icon = {
            'SPIKE': '📈',
            'THRESHOLD': '⏱️',
            'PATTERN': '🔍',
            'CRITICAL': '🚨'
        }[alert.type] || '⚠️';
        console.log(`${icon} [NLD Alert] ${alert.message}`, {
            severity: alert.severity,
            errorRate: `${(alert.metrics.errorRate * 100).toFixed(1)}%`,
            avgResponseTime: `${alert.metrics.responseTime.toFixed(0)}ms`,
            affectedEndpoints: alert.metrics.affectedEndpoints.length
        });
    }
    broadcastAlert(alert) {
        // Broadcast alert via custom event for other components
        window.dispatchEvent(new CustomEvent('nld-network-alert', {
            detail: alert
        }));
        // Send to parent window if in iframe
        if (window.parent !== window) {
            window.parent.postMessage({
                type: 'NLD_NETWORK_ALERT',
                alert: alert
            }, '*');
        }
    }
    generateBatchReport() {
        const now = Date.now();
        const intervalStart = now - this.config.reporting.batchInterval;
        const recentAlerts = this.alertHistory.filter(alert => alert.timestamp >= intervalStart);
        const recentPatterns = this.detector.getPatterns().filter(pattern => pattern.timestamp >= intervalStart);
        const batchReport = {
            timestamp: now,
            interval: this.config.reporting.batchInterval,
            alerts: recentAlerts.length,
            patterns: recentPatterns.length,
            metrics: this.detector.getMetrics(),
            summary: this.generateSummary(recentAlerts, recentPatterns)
        };
        console.log('📊 [NLD Batch Report]', batchReport);
        // Export for neural training
        if (recentPatterns.length > 0) {
            this.exportBatchForTraining(batchReport);
        }
    }
    generateSummary(alerts, patterns) {
        const alertsByType = alerts.reduce((acc, alert) => {
            acc[alert.type] = (acc[alert.type] || 0) + 1;
            return acc;
        }, {});
        const patternsByType = patterns.reduce((acc, pattern) => {
            acc[pattern.errorType] = (acc[pattern.errorType] || 0) + 1;
            return acc;
        }, {});
        return {
            alertDistribution: alertsByType,
            patternDistribution: patternsByType,
            criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
            recurringPatterns: patterns.filter(p => p.patterns.isRecurring).length,
            topFailedEndpoints: this.getAffectedEndpoints().slice(0, 5)
        };
    }
    exportBatchForTraining(report) {
        // Export data for neural training
        const trainingData = {
            type: 'NETWORK_MONITORING_BATCH',
            timestamp: Date.now(),
            data: report,
            patterns: this.detector.getPatterns(),
            version: '1.0.0'
        };
        // Store in local storage for later neural training export
        try {
            const existing = JSON.parse(localStorage.getItem('nld_training_data') || '[]');
            existing.push(trainingData);
            // Keep only last 100 entries
            const trimmed = existing.slice(-100);
            localStorage.setItem('nld_training_data', JSON.stringify(trimmed));
        }
        catch (e) {
            console.warn('[NLD] Failed to store training data:', e);
        }
    }
    // Public API
    getRecentAlerts(limit = 50) {
        return this.alertHistory.slice(-limit);
    }
    getMetrics() {
        return {
            detector: this.detector.getMetrics(),
            monitor: {
                activeMonitoring: this.monitoringActive,
                alertsGenerated: this.alertHistory.length,
                currentErrorRate: this.calculateCurrentErrorRate(),
                averageResponseTime: this.calculateAverageResponseTime()
            }
        };
    }
    exportForNeuralTraining() {
        return {
            alerts: this.alertHistory,
            patterns: this.detector.getPatterns(),
            metrics: this.getMetrics(),
            timestamp: Date.now()
        };
    }
    stop() {
        this.monitoringActive = false;
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        if (this.batchReportTimer) {
            clearInterval(this.batchReportTimer);
            this.batchReportTimer = null;
        }
        console.log('🛑 [NLD] Real-time network monitoring stopped');
    }
}
exports.NetworkRealTimeMonitor = NetworkRealTimeMonitor;
// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
    window.NLD_NetworkMonitor = new NetworkRealTimeMonitor();
}
//# sourceMappingURL=network-real-time-monitor.js.map