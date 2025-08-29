/**
 * NLD Process Health Monitor
 * Real-time monitoring for Claude process spawning, lifecycle management, and failure pattern detection
 */
import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
export declare enum ProcessFailurePattern {
    PROCESS_SPAWN_FAILURE_V1 = "PROCESS_SPAWN_FAILURE_V1",
    PROCESS_LIFECYCLE_DESYNC_V1 = "PROCESS_LIFECYCLE_DESYNC_V1",
    IO_PIPE_COMMUNICATION_BREAK_V1 = "IO_PIPE_COMMUNICATION_BREAK_V1",
    PROCESS_RESOURCE_LEAK_V1 = "PROCESS_RESOURCE_LEAK_V1",
    MULTI_PROCESS_RACE_CONDITION_V1 = "MULTI_PROCESS_RACE_CONDITION_V1"
}
export interface ProcessHealthMetrics {
    pid: number | null;
    status: 'spawning' | 'running' | 'stopped' | 'error' | 'zombie';
    spawnTime: number;
    lastHealthCheck: number;
    ioStats: {
        stdoutBytes: number;
        stderrBytes: number;
        stdinWrites: number;
        lastIoTime: number;
    };
    resourceStats: {
        fileDescriptors: number;
        memoryUsage: NodeJS.MemoryUsage;
    };
    errors: ProcessError[];
}
export interface ProcessError {
    pattern: ProcessFailurePattern;
    timestamp: number;
    details: any;
    resolved: boolean;
}
export interface NLDAlertData {
    pattern: ProcessFailurePattern;
    instanceId: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    context: any;
    timestamp: number;
    resolutionStrategy?: string;
}
export declare class NLDProcessHealthMonitor extends EventEmitter {
    private processMap;
    private healthCheckInterval;
    private alertHistory;
    private isMonitoring;
    constructor();
    /**
     * Deploy Process Health Monitoring
     */
    private startHealthMonitoring;
    /**
     * Real-time process health checker
     */
    private performHealthCheck;
    /**
     * Check if process actually exists in system
     */
    private checkProcessLifecycle;
    /**
     * Monitor I/O communication health
     */
    private checkIOCommunication;
    /**
     * Detect resource leaks
     */
    private checkResourceLeaks;
    /**
     * Register a new process for monitoring
     */
    registerProcess(instanceId: string, process: ChildProcess): ProcessHealthMetrics;
    /**
     * Attach real-time monitoring to process
     */
    private attachProcessMonitoring;
    /**
     * Enhanced process spawning with failure detection
     */
    spawnClaudeWithFallback(instanceId: string, command: string, args: string[], options: any): Promise<ChildProcess>;
    /**
     * Validate prerequisites for spawning
     */
    private validateSpawnPrerequisites;
    /**
     * Handle spawn failure with fallback strategies
     */
    private handleSpawnFailure;
    /**
     * Send NLD Alert
     */
    private nldAlert;
    /**
     * Determine alert severity
     */
    private determineSeverity;
    /**
     * Get resolution strategy for pattern
     */
    private getResolutionStrategy;
    /**
     * Record input for monitoring
     */
    recordInput(instanceId: string, input: string): void;
    /**
     * Get process metrics
     */
    getProcessMetrics(instanceId: string): ProcessHealthMetrics | undefined;
    /**
     * Get all monitored processes
     */
    getAllProcesses(): Map<string, ProcessHealthMetrics>;
    /**
     * Get alert history
     */
    getAlertHistory(pattern?: ProcessFailurePattern): NLDAlertData[];
    /**
     * Unregister process from monitoring
     */
    unregisterProcess(instanceId: string): void;
    /**
     * Stop monitoring
     */
    stopMonitoring(): void;
    /**
     * Generate health report
     */
    generateHealthReport(): any;
}
export declare const nldProcessMonitor: NLDProcessHealthMonitor;
//# sourceMappingURL=NLDProcessHealthMonitor.d.ts.map