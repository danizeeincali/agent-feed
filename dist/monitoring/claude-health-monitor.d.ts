/**
 * Claude Code Health Monitoring System
 * Monitors health and performance of Claude Code integration
 */
import { EventEmitter } from 'events';
export interface HealthMetrics {
    timestamp: Date;
    overall_status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
        orchestrator: ServiceHealth;
        integration_service: ServiceHealth;
        claude_server: ServiceHealth;
        database: ServiceHealth;
        websocket: ServiceHealth;
    };
    performance: {
        response_time_ms: number;
        active_sessions: number;
        active_agents: number;
        completed_tasks: number;
        failed_tasks: number;
        success_rate: number;
        memory_usage_mb: number;
        cpu_usage_percent: number;
    };
    alerts: HealthAlert[];
}
export interface ServiceHealth {
    status: 'up' | 'down' | 'degraded';
    response_time_ms?: number;
    last_check: Date;
    error_count: number;
    uptime_seconds: number;
    details?: any;
}
export interface HealthAlert {
    id: string;
    severity: 'info' | 'warning' | 'critical';
    service: string;
    message: string;
    timestamp: Date;
    resolved: boolean;
}
export interface HealthConfig {
    check_interval_ms: number;
    alert_thresholds: {
        response_time_ms: number;
        success_rate_percent: number;
        memory_usage_mb: number;
        cpu_usage_percent: number;
        error_rate_percent: number;
    };
    retention_days: number;
    enable_auto_recovery: boolean;
}
/**
 * Claude Health Monitor
 * Continuous monitoring and alerting for Claude Code integration
 */
export declare class ClaudeHealthMonitor extends EventEmitter {
    private config;
    private isRunning;
    private checkInterval;
    private metrics;
    private alerts;
    private serviceStartTimes;
    private errorCounts;
    constructor(config?: Partial<HealthConfig>);
    /**
     * Start health monitoring
     */
    start(): void;
    /**
     * Stop health monitoring
     */
    stop(): void;
    /**
     * Get current health metrics
     */
    getMetrics(): HealthMetrics;
    /**
     * Get active alerts
     */
    getActiveAlerts(): HealthAlert[];
    /**
     * Get historical metrics (placeholder for database integration)
     */
    getHistoricalMetrics(hours?: number): Promise<HealthMetrics[]>;
    /**
     * Perform comprehensive health check
     */
    private performHealthCheck;
    /**
     * Check orchestrator health
     */
    private checkOrchestratorHealth;
    /**
     * Check integration service health
     */
    private checkIntegrationServiceHealth;
    /**
     * Check Claude server health
     */
    private checkClaudeServerHealth;
    /**
     * Check database health
     */
    private checkDatabaseHealth;
    /**
     * Check WebSocket health
     */
    private checkWebSocketHealth;
    /**
     * Update performance metrics
     */
    private updatePerformanceMetrics;
    /**
     * Update system metrics
     */
    private updateSystemMetrics;
    /**
     * Update overall status
     */
    private updateOverallStatus;
    /**
     * Check for alerts
     */
    private checkAlerts;
    /**
     * Create an alert
     */
    private createAlert;
    /**
     * Attempt auto-recovery for critical issues
     */
    private attemptAutoRecovery;
    /**
     * Restart Claude server
     */
    private restartClaudeServer;
    /**
     * Reinitialize orchestrator
     */
    private reinitializeOrchestrator;
    /**
     * Helper methods
     */
    private createInitialMetrics;
    private createInitialServiceHealth;
    private createErrorServiceHealth;
    private initializeServiceStartTimes;
    private getErrorCount;
    private incrementErrorCount;
    private getUptime;
    private calculateSuccessRate;
}
export declare const claudeHealthMonitor: ClaudeHealthMonitor;
//# sourceMappingURL=claude-health-monitor.d.ts.map