/**
 * Enhanced PTY Process Manager with Escape Sequence Filtering
 *
 * This service replaces or enhances existing PTY process management with:
 * - Terminal escape sequence detection and filtering
 * - Process spawning controls to prevent concurrent instances
 * - Resource monitoring and automatic cleanup
 * - Integration with existing codebase architecture
 *
 * Addresses TDD test requirements and NLD analysis root causes.
 */
import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';
import * as pty from 'node-pty';
export interface ProcessConfig {
    command: string;
    args: string[];
    cwd?: string;
    env?: Record<string, string>;
    maxMemoryMB?: number;
    maxCpuPercent?: number;
    maxRuntimeMs?: number;
    autoRestart?: boolean;
    escapeSequenceFiltering?: boolean;
    cols?: number;
    rows?: number;
}
export interface ProcessInfo {
    pid: number | null;
    status: 'starting' | 'running' | 'stopped' | 'error';
    command: string;
    startTime: Date | null;
    uptime: number;
    memoryUsage?: number;
    cpuUsage?: number;
    instanceId: string;
}
export interface ProcessMetrics {
    totalProcesses: number;
    activeProcesses: number;
    failedProcesses: number;
    memoryUsage: number;
    cpuUsage: number;
    averageUptime: number;
}
/**
 * Terminal escape sequence filter for problematic sequences
 */
export declare class EscapeSequenceFilter {
    private static readonly PROBLEMATIC_SEQUENCES;
    private static readonly SAFE_SEQUENCES;
    /**
     * Filter problematic escape sequences while preserving safe ones
     */
    static filterEscapeSequences(input: string): string;
    /**
     * Check if input contains problematic escape sequences
     */
    static containsProblematicSequences(input: string): boolean;
    /**
     * Sanitize input for safe terminal display
     */
    static sanitizeInput(input: string): string;
    /**
     * Extract safe formatting sequences
     */
    static extractSafeSequences(input: string): string[];
}
/**
 * Process instance manager with resource monitoring
 */
export declare class ProcessInstance {
    readonly instanceId: string;
    readonly config: ProcessConfig;
    process: ChildProcess | pty.IPty | null;
    startTime: Date | null;
    lastActivity: Date;
    status: ProcessInfo['status'];
    outputBuffer: string;
    outputPosition: number;
    memoryUsage: number;
    cpuUsage: number;
    private activityTimer?;
    private resourceMonitor?;
    private healthCheck?;
    constructor(instanceId: string, config: ProcessConfig);
    /**
     * Update activity timestamp
     */
    updateActivity(): void;
    /**
     * Check if process is alive
     */
    isAlive(): boolean;
    /**
     * Get process uptime in milliseconds
     */
    getUptime(): number;
    /**
     * Get process info
     */
    getInfo(): ProcessInfo;
    /**
     * Cleanup instance resources
     */
    cleanup(): void;
}
/**
 * Output buffer manager with position tracking
 */
export declare class OutputBufferManager {
    private buffers;
    /**
     * Append output to buffer
     */
    appendOutput(instanceId: string, data: string): void;
    /**
     * Get incremental output since position
     */
    getIncrementalOutput(instanceId: string, fromPosition: number): {
        output: string;
        newPosition: number;
        totalLength: number;
    };
    /**
     * Clear buffer for instance
     */
    clearBuffer(instanceId: string): void;
    /**
     * Get buffer info
     */
    getBufferInfo(instanceId: string): any;
}
/**
 * Enhanced PTY Process Manager
 */
export declare class EnhancedProcessManager extends EventEmitter {
    private processes;
    private outputBuffers;
    private resourceMonitor?;
    private healthMonitor?;
    private maxProcesses;
    private metrics;
    constructor(options?: {
        maxProcesses?: number;
    });
    /**
     * Create a new process instance
     */
    createInstance(instanceId: string, config: ProcessConfig): Promise<ProcessInfo>;
    /**
     * Spawn the actual process
     */
    private spawnProcess;
    /**
     * Setup event handlers for process
     */
    private setupProcessHandlers;
    /**
     * Handle process output with escape sequence filtering
     */
    private handleProcessOutput;
    /**
     * Handle process exit
     */
    private handleProcessExit;
    /**
     * Handle process error
     */
    private handleProcessError;
    /**
     * Send input to process
     */
    sendInput(instanceId: string, input: string): Promise<boolean>;
    /**
     * Resize terminal (PTY processes only)
     */
    resizeTerminal(instanceId: string, cols: number, rows: number): Promise<boolean>;
    /**
     * Get incremental output for instance
     */
    getIncrementalOutput(instanceId: string, fromPosition?: number): {
        output: string;
        newPosition: number;
        totalLength: number;
    };
    /**
     * Get instance info
     */
    getInstanceInfo(instanceId: string): ProcessInfo | null;
    /**
     * Get all instances
     */
    getAllInstances(): ProcessInfo[];
    /**
     * Terminate instance
     */
    terminateInstance(instanceId: string, signal?: NodeJS.Signals): Promise<boolean>;
    /**
     * Start monitoring processes
     */
    private startMonitoring;
    /**
     * Update resource usage for all processes
     */
    private updateResourceUsage;
    /**
     * Get resource usage for a process
     */
    private getProcessResourceUsage;
    /**
     * Perform health check on all processes
     */
    private performHealthCheck;
    /**
     * Update performance metrics
     */
    private updateMetrics;
    /**
     * Get performance metrics
     */
    getMetrics(): ProcessMetrics;
    /**
     * Cleanup all resources
     */
    shutdown(): Promise<void>;
}
export declare const enhancedProcessManager: EnhancedProcessManager;
export default EnhancedProcessManager;
//# sourceMappingURL=EnhancedProcessManager.d.ts.map