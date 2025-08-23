/**
 * Simple Process Manager for Claude Code Launcher
 * No social features, no users - just process lifecycle management
 */
export interface ProcessStatus {
    isRunning: boolean;
    pid?: number;
    status: 'stopped' | 'running' | 'error' | 'starting';
    error?: string;
    startedAt?: Date;
    workingDirectory?: string;
}
export declare class SimpleProcessManager {
    private process;
    private status;
    private readonly prodPath;
    constructor();
    private ensureProdDirectory;
    /**
     * Launch Claude Code instance in /prod directory
     */
    launchClaude(): Promise<ProcessStatus>;
    /**
     * Stop the Claude process
     */
    stopClaude(): Promise<ProcessStatus>;
    /**
     * Get current process status
     */
    getStatus(): ProcessStatus;
    /**
     * Check if Claude Code is available on system
     */
    isClaudeAvailable(): Promise<boolean>;
    /**
     * Get process working directory
     */
    getWorkingDirectory(): string;
    /**
     * Clean up resources
     */
    destroy(): void;
}
//# sourceMappingURL=SimpleProcessManager.d.ts.map