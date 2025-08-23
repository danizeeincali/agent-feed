/**
 * ProcessManager Service
 *
 * Manages Claude instance lifecycle with terminal control,
 * auto-restart functionality, and WebSocket communication.
 */
import { EventEmitter } from 'events';
export interface ProcessConfig {
    autoRestartHours: number;
    workingDirectory: string;
    resumeOnRestart: boolean;
    agentLinkEnabled: boolean;
    environment?: string;
}
export interface ProcessInfo {
    pid: number | null;
    name: string;
    status: 'running' | 'stopped' | 'restarting' | 'error';
    startTime: Date | null;
    autoRestartEnabled: boolean;
    autoRestartHours: number;
}
export declare class ProcessManager extends EventEmitter {
    private currentProcess;
    private currentPid;
    private autoRestartTimer;
    private config;
    private startTime;
    private instanceName;
    constructor();
    /**
     * Load instance name from CLAUDE.md + timestamp
     */
    private loadInstanceName;
    /**
     * Launch a new Claude instance
     */
    launchInstance(config?: Partial<ProcessConfig>): Promise<ProcessInfo>;
    /**
     * Kill the current instance
     */
    killInstance(): Promise<void>;
    /**
     * Restart the instance
     */
    restartInstance(): Promise<ProcessInfo>;
    /**
     * Setup auto-restart timer
     */
    setupAutoRestart(hours: number): void;
    /**
     * Send input to the process
     */
    sendInput(input: string): void;
    /**
     * Get current process information
     */
    getProcessInfo(): ProcessInfo;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<ProcessConfig>): void;
    /**
     * Cleanup on shutdown
     */
    cleanup(): Promise<void>;
}
export declare const processManager: ProcessManager;
//# sourceMappingURL=ProcessManager.d.ts.map