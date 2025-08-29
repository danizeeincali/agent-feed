/**
 * Real-Time Endpoint Mismatch Monitor
 * 
 * Monitors API endpoint usage in real-time to detect versioning inconsistencies
 * and endpoint path mismatches as they occur during development and runtime.
 * 
 * Integrates with the existing NLD system to provide continuous monitoring
 * and automatic alert generation for endpoint mismatch patterns.
 */

import { EventEmitter } from 'events';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface EndpointUsageEvent {
    timestamp: string;
    type: 'sse_connection' | 'rest_request' | 'websocket_connection';
    method: string;
    path: string;
    status: 'success' | 'failure' | 'timeout';
    statusCode?: number;
    error?: string;
    responseTime?: number;
    
    // Context
    userAgent?: string;
    sessionId?: string;
    instanceId?: string;
    
    // Pattern detection
    hasVersionInPath: boolean;
    pathPattern: string;
    protocolType: 'sse' | 'rest' | 'websocket';
}

export interface EndpointMismatchAlert {
    id: string;
    timestamp: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    type: 'version_mismatch' | 'path_inconsistency' | 'protocol_failure' | 'configuration_drift';
    
    description: string;
    affectedEndpoints: string[];
    evidence: EndpointUsageEvent[];
    
    // Impact assessment
    impact: {
        usersAffected: number;
        functionalityLoss: string[];
        businessImpact: string;
    };
    
    // Suggested actions
    recommendations: string[];
    autoFixAvailable: boolean;
}

export interface MonitoringMetrics {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    
    byProtocol: {
        sse: { success: number; failure: number };
        rest: { success: number; failure: number };
        websocket: { success: number; failure: number };
    };
    
    byVersion: {
        versioned: { success: number; failure: number };
        unversioned: { success: number; failure: number };
    };
    
    alertsGenerated: number;
    patternsDetected: number;
    
    averageResponseTime: number;
    uptime: number;
}

/**
 * Real-time monitor for endpoint mismatch detection
 */
export class EndpointMismatchRealTimeMonitor extends EventEmitter {
    private isMonitoring: boolean = false;
    private usageEvents: EndpointUsageEvent[] = [];
    private alerts: EndpointMismatchAlert[] = [];
    private metrics: MonitoringMetrics;
    private monitoringStartTime: number;
    private logPath: string;
    
    // Pattern detection thresholds
    private readonly FAILURE_THRESHOLD = 0.5; // 50% failure rate triggers alert
    private readonly SAMPLE_SIZE = 100; // Number of recent events to analyze
    private readonly ALERT_COOLDOWN = 5 * 60 * 1000; // 5 minutes between similar alerts
    
    private lastAlerts: Map<string, number> = new Map();
    
    constructor(logPath: string = '/workspaces/agent-feed/src/nld/monitoring') {
        super();
        this.logPath = logPath;
        this.ensureLogDirectory();
        this.initializeMetrics();
    }
    
    /**
     * Start real-time monitoring
     */
    public startMonitoring(): void {
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
    public stopMonitoring(): void {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        
        // Save final report
        this.generateMonitoringReport();
        
        console.log('🛑 [NLD Monitor] Stopped endpoint monitoring');
        this.emit('monitoring_stopped');
    }
    
    /**
     * Record endpoint usage event
     */
    public recordEndpointUsage(event: Omit<EndpointUsageEvent, 'timestamp' | 'hasVersionInPath' | 'pathPattern' | 'protocolType'>): void {
        if (!this.isMonitoring) return;
        
        const fullEvent: EndpointUsageEvent = {
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
    private checkForImmediatePatterns(event: EndpointUsageEvent): void {
        // Check for SSE connection failures - high priority
        if (event.type === 'sse_connection' && event.status === 'failure') {
            // Check if there are successful REST requests to similar paths
            const recentEvents = this.usageEvents.slice(-50);
            const similarRestSuccess = recentEvents.find(e => 
                e.type === 'rest_request' && 
                e.status === 'success' && 
                this.pathsSimilar(e.path, event.path)
            );
            
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
    private startPeriodicAnalysis(): void {
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
    private performPatternAnalysis(): void {
        if (this.usageEvents.length < 10) return; // Need minimum events
        
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
    private analyzeVersionConsistency(events: EndpointUsageEvent[]): void {
        const sseEvents = events.filter(e => e.protocolType === 'sse');
        const restEvents = events.filter(e => e.protocolType === 'rest');
        
        if (sseEvents.length === 0 || restEvents.length === 0) return;
        
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
    private analyzeProtocolFailures(events: EndpointUsageEvent[]): void {
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
            const total = protocolTotals[protocol as keyof typeof protocolTotals];
            if (total === 0) return;
            
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
    private analyzePathPatterns(events: EndpointUsageEvent[]): void {
        const pathGroups = new Map<string, EndpointUsageEvent[]>();
        
        // Group similar paths
        events.forEach(event => {
            const basePattern = this.getBasePathPattern(event.path);
            if (!pathGroups.has(basePattern)) {
                pathGroups.set(basePattern, []);
            }
            pathGroups.get(basePattern)!.push(event);
        });
        
        // Check for inconsistent patterns within groups
        pathGroups.forEach((groupEvents, pattern) => {
            if (groupEvents.length < 3) return; // Need minimum events
            
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
    private generateAlert(alertData: Omit<EndpointMismatchAlert, 'id' | 'timestamp'>): void {
        const alertKey = `${alertData.type}_${alertData.description}`;
        const now = Date.now();
        const lastAlert = this.lastAlerts.get(alertKey);
        
        // Check cooldown
        if (lastAlert && (now - lastAlert) < this.ALERT_COOLDOWN) {
            return; // Skip duplicate alert
        }
        
        const alert: EndpointMismatchAlert = {
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
    private hasVersionInPath(path: string): boolean {
        return /\/v\d+\//.test(path);
    }
    
    private extractPathPattern(path: string): string {
        return path
            .replace(/\/v\d+\//, '/vX/')
            .replace(/\/\d+/g, '/:id')
            .replace(/\?.*$/, '');
    }
    
    private determineProtocolType(type: string, path: string): 'sse' | 'rest' | 'websocket' {
        if (type === 'sse_connection' || path.includes('stream')) return 'sse';
        if (type === 'websocket_connection') return 'websocket';
        return 'rest';
    }
    
    private pathsSimilar(path1: string, path2: string): boolean {
        const pattern1 = this.extractPathPattern(path1);
        const pattern2 = this.extractPathPattern(path2);
        return pattern1 === pattern2;
    }
    
    private getBasePathPattern(path: string): string {
        return path
            .split('/')
            .slice(0, 4) // Take first 4 segments
            .join('/')
            .replace(/\/v\d+/, '/vX')
            .replace(/\d+/, 'ID');
    }
    
    private estimateAffectedUsers(events: EndpointUsageEvent[], ...additionalEvents: EndpointUsageEvent[][]): number {
        const allEvents = [events, ...additionalEvents].flat();
        const sessionIds = new Set(allEvents.map(e => e.sessionId).filter(Boolean));
        return Math.max(sessionIds.size, Math.ceil(allEvents.length / 10));
    }
    
    private getFunctionalityLossForProtocol(protocol: string): string[] {
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
    
    private getProtocolFailureRecommendations(protocol: string, failures: EndpointUsageEvent[]): string[] {
        const baseRecommendations = [
            `Check ${protocol.toUpperCase()} endpoint configuration`,
            'Verify network connectivity',
            'Review server logs for errors'
        ];
        
        if (protocol === 'sse') {
            baseRecommendations.push(
                'Verify SSE endpoint versioning matches REST API',
                'Check CORS configuration for SSE endpoints',
                'Test EventSource connection manually'
            );
        }
        
        return baseRecommendations;
    }
    
    /**
     * Initialize metrics
     */
    private initializeMetrics(): void {
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
    private updateMetrics(event: EndpointUsageEvent): void {
        this.metrics.totalRequests++;
        
        if (event.status === 'success') {
            this.metrics.successfulRequests++;
        } else {
            this.metrics.failedRequests++;
        }
        
        // Update protocol metrics
        const protocolMetrics = this.metrics.byProtocol[event.protocolType];
        if (event.status === 'success') {
            protocolMetrics.success++;
        } else {
            protocolMetrics.failure++;
        }
        
        // Update version metrics
        const versionMetrics = event.hasVersionInPath 
            ? this.metrics.byVersion.versioned 
            : this.metrics.byVersion.unversioned;
        
        if (event.status === 'success') {
            versionMetrics.success++;
        } else {
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
    private startMetricsCollection(): void {
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
    public getMetrics(): MonitoringMetrics {
        return { ...this.metrics };
    }
    
    /**
     * Get recent alerts
     */
    public getRecentAlerts(count: number = 10): EndpointMismatchAlert[] {
        return this.alerts.slice(-count);
    }
    
    /**
     * Save alert to file
     */
    private saveAlert(alert: EndpointMismatchAlert): void {
        try {
            const alertFile = join(this.logPath, `alert_${alert.id}.json`);
            writeFileSync(alertFile, JSON.stringify(alert, null, 2));
        } catch (error) {
            console.error('❌ [NLD Monitor] Failed to save alert:', error);
        }
    }
    
    /**
     * Save metrics to file
     */
    private saveMetrics(): void {
        try {
            const metricsFile = join(this.logPath, `metrics_${new Date().toISOString().split('T')[0]}.json`);
            writeFileSync(metricsFile, JSON.stringify(this.metrics, null, 2));
        } catch (error) {
            console.error('❌ [NLD Monitor] Failed to save metrics:', error);
        }
    }
    
    /**
     * Generate comprehensive monitoring report
     */
    private generateMonitoringReport(): any {
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
        const reportFile = join(this.logPath, `monitoring_report_${Date.now()}.json`);
        writeFileSync(reportFile, JSON.stringify(report, null, 2));
        
        console.log(`📊 [NLD Monitor] Monitoring report saved: ${reportFile}`);
        
        return report;
    }
    
    /**
     * Get top failure patterns
     */
    private getTopFailurePatterns(): any[] {
        const failures = this.usageEvents.filter(e => e.status === 'failure');
        const pathCounts = new Map<string, number>();
        
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
    private generateRecommendations(): string[] {
        const recommendations: string[] = [];
        
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
    private ensureLogDirectory(): void {
        if (!existsSync(this.logPath)) {
            mkdirSync(this.logPath, { recursive: true });
            console.log(`📁 [NLD Monitor] Created log directory: ${this.logPath}`);
        }
    }
}

// Export singleton instance
export const endpointMismatchRealTimeMonitor = new EndpointMismatchRealTimeMonitor();