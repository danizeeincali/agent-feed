/**
 * Claude Process Manager - Manages dedicated Claude instances
 * Provides process lifecycle management, communication via stdio/pipes,
 * resource monitoring, and cleanup
 */
import { EventEmitter } from 'events';
export interface ClaudeInstanceConfig {
    command?: string[];
    workingDirectory?: string;
    environment?: Record<string, string>;
    timeout?: number;
    maxMemory?: number;
    maxCpu?: number;
    restartOnCrash?: boolean;
}
export interface ClaudeInstanceStatus {
    id: string;
    status: 'starting' | 'running' | 'stopping' | 'stopped' | 'crashed' | 'error';
    pid?: number;
    startTime: Date;
    lastActivity: Date;
    memoryUsage?: NodeJS.MemoryUsage;
    cpuUsage?: NodeJS.CpuUsage;
    config: ClaudeInstanceConfig;
    metrics: {
        messagesProcessed: number;
        averageResponseTime: number;
        errorCount: number;
        restartCount: number;
    };
}
export interface ClaudeMessage {
    id: string;
    instanceId: string;
    type: 'input' | 'output' | 'error' | 'control';
    content: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}
export declare class ClaudeProcessManager extends EventEmitter {
    private instances;
    private logger;
    private monitoring;
    private sessionStorage;
    constructor(sessionStoragePath?: string);
    private setupLogger;
    private ensureSessionStorage;
    /**
     * Create new Claude instance with configuration
     */
    createInstance(config?: ClaudeInstanceConfig): Promise<string>;
    /**
     * Get list of all instances
     */
    getInstances(): ClaudeInstanceStatus[];
    /**
     * Get specific instance details
     */
    getInstance(instanceId: string): ClaudeInstanceStatus | null;
    /**
     * Send message to Claude instance
     */
    sendMessage(instanceId: string, content: string, metadata?: Record<string, any>): Promise<void>;
    /**
     * Terminate Claude instance
     */
    terminateInstance(instanceId: string, force?: boolean): Promise<void>;
    /**
     * Health check for instance
     */
    healthCheck(instanceId: string): Promise<boolean>;
    /**
     * Restart instance
     */
    restartInstance(instanceId: string): Promise<void>;
    /**
     * Clean shutdown of all instances
     */
    shutdown(): Promise<void>;
    private startMonitoring;
    private monitorInstances;
}
export default ClaudeProcessManager;
//# sourceMappingURL=ClaudeProcessManager.d.ts.map