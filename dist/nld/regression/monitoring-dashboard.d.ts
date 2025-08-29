/**
 * Monitoring Dashboard - Real-Time Regression Monitoring Interface
 *
 * Provides comprehensive real-time monitoring dashboard for Claude process
 * regression detection with sub-200ms detection latency visualization.
 */
import { PatternDetectionResult } from './regression-pattern-detector';
export interface DashboardMetrics {
    realTimeStats: RealTimeStats;
    patternDetection: PatternDetectionStats;
    systemHealth: SystemHealthStats;
    preventionMetrics: PreventionMetrics;
    recoveryMetrics: RecoveryMetrics;
    performanceMetrics: PerformanceMetrics;
}
export interface RealTimeStats {
    timestamp: Date;
    activeProcesses: number;
    totalEvents: number;
    alertsGenerated: number;
    detectionLatency: number;
    systemStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'RECOVERY';
}
export interface PatternDetectionStats {
    patternsMonitored: number;
    detectionAccuracy: number;
    falsePositiveRate: number;
    criticalPatternsActive: string[];
    recentDetections: PatternDetectionResult[];
}
export interface SystemHealthStats {
    claudeProcesses: ProcessHealthInfo[];
    authenticationStatus: 'AUTHENTICATED' | 'FAILED' | 'DEGRADED';
    directoryResolution: 'WORKING' | 'FALLBACK' | 'FAILED';
    sseConnections: ConnectionHealthInfo;
    overallHealthScore: number;
}
export interface ProcessHealthInfo {
    instanceId: string;
    status: 'running' | 'stopped' | 'error' | 'starting';
    processType: 'pty' | 'pipe' | 'mock';
    usePty: boolean;
    hasPrintFlags: boolean;
    uptime: number;
    lastActivity: Date;
}
export interface ConnectionHealthInfo {
    totalConnections: number;
    activeConnections: number;
    connectionErrors: number;
    lastConnectionTime: Date;
}
export interface PreventionMetrics {
    actionsExecuted: number;
    successRate: number;
    averageResponseTime: number;
    preventionQueueSize: number;
    criticalPreventionsActive: number;
}
export interface RecoveryMetrics {
    recoveryPlansAvailable: number;
    activeRecoveries: number;
    recoverySuccessRate: number;
    averageRecoveryTime: number;
    rollbacksPerformed: number;
}
export interface PerformanceMetrics {
    detectionLatencyMs: number;
    preventionLatencyMs: number;
    memoryUsage: number;
    cpuUsage: number;
    throughput: number;
}
export interface DashboardAlert {
    id: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    message: string;
    timestamp: Date;
    acknowledged: boolean;
    actions: string[];
}
export declare class MonitoringDashboard {
    private metricsHistory;
    private activeAlerts;
    private subscribers;
    private updateInterval?;
    private isRunning;
    private latencyTargetMs;
    constructor();
    /**
     * Start the monitoring dashboard
     */
    startDashboard(): void;
    /**
     * Stop the dashboard
     */
    stopDashboard(): void;
    /**
     * Subscribe to system events for real-time updates
     */
    private subscribeToSystemEvents;
    /**
     * Update all dashboard metrics
     */
    private updateMetrics;
    /**
     * Collect all system metrics
     */
    private collectAllMetrics;
    /**
     * Collect real-time statistics
     */
    private collectRealTimeStats;
    /**
     * Collect pattern detection statistics
     */
    private collectPatternDetectionStats;
    /**
     * Collect system health statistics
     */
    private collectSystemHealthStats;
    /**
     * Collect prevention metrics
     */
    private collectPreventionMetrics;
    /**
     * Collect recovery metrics
     */
    private collectRecoveryMetrics;
    /**
     * Collect performance metrics
     */
    private collectPerformanceMetrics;
    /**
     * Check for new alerts based on metrics
     */
    private checkForNewAlerts;
    /**
     * Add alert to dashboard
     */
    private addAlert;
    /**
     * Acknowledge alert
     */
    acknowledgeAlert(alertId: string): boolean;
    /**
     * Get dashboard summary for external consumption
     */
    getDashboardSummary(): any;
    /**
     * Subscribe to dashboard updates
     */
    subscribe(callback: (metrics: DashboardMetrics) => void): () => void;
    /**
     * Notify all subscribers of metrics update
     */
    private notifySubscribers;
    private countActiveProcesses;
    private calculateDetectionLatency;
    private determineSystemStatus;
    private calculateDetectionAccuracy;
    private getCriticalActivePatterns;
    private getRecentDetections;
    private getProcessHealthInfo;
    private getAuthenticationStatus;
    private getDirectoryResolutionStatus;
    private getConnectionHealthInfo;
    private calculateOverallHealthScore;
    private calculateAveragePreventionTime;
    private countCriticalPreventions;
    private calculateAverageRecoveryTime;
    private countRollbacksPerformed;
    private measureDetectionLatency;
    private measurePreventionLatency;
    private getMemoryUsage;
    private getCPUUsage;
    private calculateThroughput;
    /**
     * Export dashboard data for analysis
     */
    exportDashboardData(): any;
}
export declare const monitoringDashboard: MonitoringDashboard;
//# sourceMappingURL=monitoring-dashboard.d.ts.map