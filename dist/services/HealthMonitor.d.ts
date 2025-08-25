/**
 * Health Monitor - Comprehensive monitoring and auto-recovery for Claude instances
 * Provides real-time health checks, performance metrics, and automatic recovery
 */
import { EventEmitter } from 'events';
import ClaudeProcessManager from './ClaudeProcessManager';
import SessionManager from './SessionManager';
export interface HealthMetrics {
    instanceId: string;
    timestamp: Date;
    status: 'healthy' | 'warning' | 'critical' | 'down';
    uptime: number;
    responseTime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    messageRate: number;
    errorRate: number;
    restartCount: number;
    lastError?: string;
    healthScore: number;
}
export interface SystemHealthStatus {
    overall: 'healthy' | 'degraded' | 'critical';
    timestamp: Date;
    instanceCount: {
        total: number;
        healthy: number;
        warning: number;
        critical: number;
        down: number;
    };
    systemMetrics: {
        totalMemory: number;
        usedMemory: number;
        cpuUsage: number;
        uptime: number;
        activeConnections: number;
    };
    alerts: HealthAlert[];
}
export interface HealthAlert {
    id: string;
    type: 'performance' | 'memory' | 'cpu' | 'connection' | 'error' | 'recovery';
    severity: 'low' | 'medium' | 'high' | 'critical';
    instanceId: string;
    message: string;
    timestamp: Date;
    resolved: boolean;
}
export interface RecoveryAction {
    type: 'restart' | 'kill' | 'scale' | 'notify' | 'isolate';
    instanceId: string;
    reason: string;
    timestamp: Date;
    success: boolean;
    duration: number;
}
export declare class HealthMonitor extends EventEmitter {
    private processManager;
    private sessionManager;
    private logger;
    private healthMetrics;
    private alerts;
    private recoveryActions;
    private monitoringInterval;
    private alertInterval;
    private cleanupInterval;
    private config;
    constructor(processManager: ClaudeProcessManager, sessionManager: SessionManager);
    private setupLogger;
    /**
     * Start monitoring routines
     */
    private startMonitoring;
    /**
     * Perform health checks on all instances
     */
    private performHealthChecks;
    /**
     * Check health of a specific instance
     */
    private checkInstanceHealth;
    /**
     * Calculate comprehensive health metrics
     */
    private calculateHealthMetrics;
    /**
     * Calculate overall health score (0-100)
     */
    private calculateHealthScore;
    /**
     * Store health metrics with history limit
     */
    private storeHealthMetrics;
    /**
     * Evaluate health thresholds and generate alerts
     */
    private evaluateHealthThresholds;
    /**
     * Create health alert
     */
    private createAlert;
    /**
     * Attempt automatic recovery
     */
    private attemptRecovery;
    /**
     * Escalate recovery when automatic restart fails
     */
    private escalateRecovery;
    /**
     * Process and resolve alerts
     */
    private processAlerts;
    /**
     * Check if alert condition is resolved
     */
    private isAlertResolved;
    /**
     * Clean up old data
     */
    private cleanupOldData;
    /**
     * Get latest metrics for instance
     */
    getLatestMetrics(instanceId: string): HealthMetrics | null;
    /**
     * Get metrics history for instance
     */
    getMetricsHistory(instanceId: string, limit?: number): HealthMetrics[];
    /**
     * Generate system health status
     */
    generateSystemHealthStatus(): SystemHealthStatus;
    /**
     * Get all active alerts
     */
    getActiveAlerts(): HealthAlert[];
    /**
     * Get recovery action history
     */
    getRecoveryHistory(limit?: number): RecoveryAction[];
    /**
     * Shutdown health monitor
     */
    shutdown(): void;
}
export default HealthMonitor;
//# sourceMappingURL=HealthMonitor.d.ts.map