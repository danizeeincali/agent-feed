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
export interface EndpointUsageEvent {
    timestamp: string;
    type: 'sse_connection' | 'rest_request' | 'websocket_connection';
    method: string;
    path: string;
    status: 'success' | 'failure' | 'timeout';
    statusCode?: number;
    error?: string;
    responseTime?: number;
    userAgent?: string;
    sessionId?: string;
    instanceId?: string;
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
    impact: {
        usersAffected: number;
        functionalityLoss: string[];
        businessImpact: string;
    };
    recommendations: string[];
    autoFixAvailable: boolean;
}
export interface MonitoringMetrics {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    byProtocol: {
        sse: {
            success: number;
            failure: number;
        };
        rest: {
            success: number;
            failure: number;
        };
        websocket: {
            success: number;
            failure: number;
        };
    };
    byVersion: {
        versioned: {
            success: number;
            failure: number;
        };
        unversioned: {
            success: number;
            failure: number;
        };
    };
    alertsGenerated: number;
    patternsDetected: number;
    averageResponseTime: number;
    uptime: number;
}
/**
 * Real-time monitor for endpoint mismatch detection
 */
export declare class EndpointMismatchRealTimeMonitor extends EventEmitter {
    private isMonitoring;
    private usageEvents;
    private alerts;
    private metrics;
    private monitoringStartTime;
    private logPath;
    private readonly FAILURE_THRESHOLD;
    private readonly SAMPLE_SIZE;
    private readonly ALERT_COOLDOWN;
    private lastAlerts;
    constructor(logPath?: string);
    /**
     * Start real-time monitoring
     */
    startMonitoring(): void;
    /**
     * Stop monitoring
     */
    stopMonitoring(): void;
    /**
     * Record endpoint usage event
     */
    recordEndpointUsage(event: Omit<EndpointUsageEvent, 'timestamp' | 'hasVersionInPath' | 'pathPattern' | 'protocolType'>): void;
    /**
     * Check for immediate patterns requiring alerts
     */
    private checkForImmediatePatterns;
    /**
     * Start periodic pattern analysis
     */
    private startPeriodicAnalysis;
    /**
     * Perform comprehensive pattern analysis
     */
    private performPatternAnalysis;
    /**
     * Analyze version consistency across protocols
     */
    private analyzeVersionConsistency;
    /**
     * Analyze protocol-specific failure patterns
     */
    private analyzeProtocolFailures;
    /**
     * Analyze path pattern inconsistencies
     */
    private analyzePathPatterns;
    /**
     * Generate alert with cooldown management
     */
    private generateAlert;
    /**
     * Helper methods for pattern analysis
     */
    private hasVersionInPath;
    private extractPathPattern;
    private determineProtocolType;
    private pathsSimilar;
    private getBasePathPattern;
    private estimateAffectedUsers;
    private getFunctionalityLossForProtocol;
    private getProtocolFailureRecommendations;
    /**
     * Initialize metrics
     */
    private initializeMetrics;
    /**
     * Update metrics with new event
     */
    private updateMetrics;
    /**
     * Start metrics collection interval
     */
    private startMetricsCollection;
    /**
     * Get current monitoring metrics
     */
    getMetrics(): MonitoringMetrics;
    /**
     * Get recent alerts
     */
    getRecentAlerts(count?: number): EndpointMismatchAlert[];
    /**
     * Save alert to file
     */
    private saveAlert;
    /**
     * Save metrics to file
     */
    private saveMetrics;
    /**
     * Generate comprehensive monitoring report
     */
    private generateMonitoringReport;
    /**
     * Get top failure patterns
     */
    private getTopFailurePatterns;
    /**
     * Generate monitoring recommendations
     */
    private generateRecommendations;
    /**
     * Ensure log directory exists
     */
    private ensureLogDirectory;
}
export declare const endpointMismatchRealTimeMonitor: EndpointMismatchRealTimeMonitor;
//# sourceMappingURL=endpoint-mismatch-real-time-monitor.d.ts.map