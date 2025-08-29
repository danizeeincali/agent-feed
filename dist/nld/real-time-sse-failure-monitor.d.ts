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
import { EventEmitter } from 'events';
interface SSEConnectionMetrics {
    instanceId: string;
    statusSSE: {
        connected: boolean;
        connectionCount: number;
        endpoint: string;
        lastActivity: Date | null;
    };
    terminalSSE: {
        connected: boolean;
        connectionCount: number;
        endpoint: string;
        instanceId: string | null;
        lastActivity: Date | null;
    };
    pollingState: {
        active: boolean;
        instanceId: string | null;
        interval: number;
    };
    uiState: {
        status: 'starting' | 'running' | 'stopped' | 'error';
        lastUpdate: Date | null;
        stuckDuration: number;
    };
    performanceMetrics: {
        connectionLatency: number;
        messageDelay: number;
        recoveryTime: number;
    };
}
interface FailureAlert {
    id: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: 'status_sse_missing' | 'status_broadcast_zero' | 'ui_stuck_starting' | 'connection_coordination' | 'terminal_input_broken';
    instanceId: string;
    description: string;
    metrics: SSEConnectionMetrics;
    recommendedActions: string[];
    autoRecoveryAttempted: boolean;
    resolved: boolean;
    resolutionTime?: number;
}
export declare class RealTimeSSEFailureMonitor extends EventEmitter {
    private isMonitoring;
    private patternDetector;
    private antiPatternsDB;
    private connectionMetrics;
    private activeAlerts;
    private monitoringInterval;
    private alertQueue;
    private readonly CHECK_INTERVAL;
    private readonly STATUS_STUCK_THRESHOLD;
    private readonly CONNECTION_TIMEOUT;
    constructor();
    /**
     * Start real-time monitoring
     */
    startMonitoring(): void;
    /**
     * Stop monitoring
     */
    stopMonitoring(): void;
    /**
     * Update connection metrics for an instance
     */
    updateConnectionMetrics(instanceId: string, metrics: Partial<SSEConnectionMetrics>): void;
    /**
     * Report SSE connection event
     */
    reportSSEEvent(instanceId: string, eventType: 'status_connected' | 'status_disconnected' | 'terminal_connected' | 'terminal_disconnected' | 'status_message' | 'terminal_message', data?: any): void;
    /**
     * Report UI state change
     */
    reportUIState(instanceId: string, status: SSEConnectionMetrics['uiState']['status']): void;
    /**
     * Perform a monitoring cycle
     */
    private performMonitoringCycle;
    /**
     * Check for SSE failure patterns
     */
    private checkForFailurePatterns;
    /**
     * Create a failure alert
     */
    private createFailureAlert;
    /**
     * Capture failure pattern for learning
     */
    private capturePatternForLearning;
    /**
     * Process alert queue and attempt auto-recovery
     */
    private processAlertQueue;
    /**
     * Attempt automatic recovery for critical alerts
     */
    private attemptAutoRecovery;
    /**
     * Resolve an alert
     */
    resolveAlert(alertId: string, resolutionTime?: number): void;
    /**
     * Get active alerts
     */
    getActiveAlerts(): FailureAlert[];
    /**
     * Get connection metrics for instance
     */
    getConnectionMetrics(instanceId: string): SSEConnectionMetrics | null;
    /**
     * Get all connection metrics
     */
    getAllConnectionMetrics(): Map<string, SSEConnectionMetrics>;
    /**
     * Generate monitoring report
     */
    generateReport(): {
        monitoringActive: boolean;
        totalInstances: number;
        activeAlerts: number;
        alertsByType: Record<string, number>;
        alertsBySeverity: Record<string, number>;
        connectionHealth: {
            instanceId: string;
            statusSSEHealth: 'good' | 'warning' | 'error';
            terminalSSEHealth: 'good' | 'warning' | 'error';
            uiStateHealth: 'good' | 'warning' | 'error';
        }[];
    };
    /**
     * Create default metrics for new instance
     */
    private createDefaultMetrics;
    /**
     * Assess SSE connection health
     */
    private assessSSEHealth;
    /**
     * Assess UI state health
     */
    private assessUIStateHealth;
}
export { SSEConnectionMetrics, FailureAlert };
//# sourceMappingURL=real-time-sse-failure-monitor.d.ts.map