/**
 * Claude Instance Manager Service
 *
 * Comprehensive service for managing Claude instances with process lifecycle,
 * terminal sessions, auto-restart capabilities, and WebSocket integration.
 */
import { EventEmitter } from 'events';
import * as pty from 'node-pty';
export interface LaunchOptions {
    type: 'production' | 'development';
    workingDirectory?: string;
    environment?: Record<string, string>;
    arguments?: string[];
    resourceLimits?: ResourceLimits;
    autoRestart?: AutoRestartConfig;
    name?: string;
    autoConnect?: boolean;
}
export interface ResourceLimits {
    maxMemory?: number;
    maxCpu?: number;
    maxFiles?: number;
    maxProcesses?: number;
    allowedDirectories?: string[];
}
export interface AutoRestartConfig {
    enabled: boolean;
    intervalHours: number;
    maxRestarts: number;
    healthCheckEnabled: boolean;
    gracefulShutdownTimeout: number;
}
export interface Instance {
    id: string;
    name: string;
    type: string;
    pid?: number;
    status: InstanceStatus;
    createdAt: Date;
    lastSeen: Date;
    config: LaunchOptions;
    metrics?: ResourceMetrics;
    terminalSessionId?: string;
}
export interface ResourceMetrics {
    cpu: number;
    memory: number;
    uptime: number;
    terminalConnections: number;
    commandsExecuted: number;
    errorRate: number;
    responseTime: number;
}
export type InstanceStatus = 'creating' | 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
export interface TerminalSession {
    id: string;
    instanceId: string;
    pty: pty.IPty;
    clients: Set<string>;
    history: string[];
    size: {
        cols: number;
        rows: number;
    };
    lastActivity: Date;
    settings: TerminalSettings;
}
export interface TerminalSettings {
    fontSize: number;
    fontFamily: string;
    theme: TerminalTheme;
    scrollback: number;
    cursorBlink: boolean;
}
export interface TerminalTheme {
    background: string;
    foreground: string;
    cursor: string;
    selection: string;
}
export declare class ClaudeInstanceManager extends EventEmitter {
    private instances;
    private terminalSessions;
    private processes;
    private restartTimers;
    private healthCheckInterval?;
    constructor();
    /**
     * Launch a new Claude instance
     */
    launchInstance(options: LaunchOptions): Promise<string>;
    /**
     * Kill a Claude instance
     */
    killInstance(instanceId: string, graceful?: boolean): Promise<void>;
    /**
     * Restart a Claude instance
     */
    restartInstance(instanceId: string): Promise<string>;
    /**
     * Get instance status
     */
    getInstanceStatus(instanceId: string): Instance | null;
    /**
     * List all instances
     */
    listInstances(): Instance[];
    /**
     * Get terminal session
     */
    getTerminalSession(instanceId: string): TerminalSession | null;
    /**
     * Add client to terminal session
     */
    addTerminalClient(instanceId: string, clientId: string): void;
    /**
     * Remove client from terminal session
     */
    removeTerminalClient(instanceId: string, clientId: string): void;
    /**
     * Write to terminal
     */
    writeToTerminal(instanceId: string, data: string): void;
    /**
     * Resize terminal
     */
    resizeTerminal(instanceId: string, cols: number, rows: number): void;
    /**
     * Get terminal history
     */
    getTerminalHistory(instanceId: string, lines?: number): string[];
    /**
     * Private methods
     */
    private killExistingInstanceOfType;
    private generateInstanceId;
    private generateInstanceName;
    private ensureWorkingDirectory;
    private spawnClaudeProcess;
    private createTerminalSession;
    private destroyTerminalSession;
    private gracefulShutdown;
    private updateInstanceStatus;
    private persistInstance;
    private loadExistingInstances;
    private isProcessRunning;
    private handleProcessExit;
    private scheduleAutoRestart;
    private cancelAutoRestart;
    private startHealthChecks;
    private performHealthChecks;
    /**
     * Cleanup on shutdown
     */
    shutdown(): Promise<void>;
}
export declare const claudeInstanceManager: ClaudeInstanceManager;
//# sourceMappingURL=claude-instance-manager.d.ts.map