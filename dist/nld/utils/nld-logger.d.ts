/**
 * NLD Logger Utility
 * Centralized logging for NLD pattern detection and analysis
 */
export interface NLDLogEntry {
    timestamp: Date;
    level: 'attempt' | 'success' | 'failure';
    component: string;
    operation: string;
    message?: string;
    data?: any;
}
declare class NLDLogger {
    private logs;
    private maxLogs;
    /**
     * Log an attempt (operation starting)
     */
    renderAttempt(component: string, operation: string, data?: any): void;
    /**
     * Log a success (operation completed successfully)
     */
    renderSuccess(component: string, operation: string, data?: any): void;
    /**
     * Log a failure (operation failed)
     */
    renderFailure(component: string, error: Error, data?: any): void;
    /**
     * Add log entry
     */
    private addLog;
    /**
     * Get all logs
     */
    getLogs(): NLDLogEntry[];
    /**
     * Get logs by component
     */
    getLogsByComponent(component: string): NLDLogEntry[];
    /**
     * Get logs by level
     */
    getLogsByLevel(level: NLDLogEntry['level']): NLDLogEntry[];
    /**
     * Clear logs
     */
    clearLogs(): void;
    /**
     * Export logs for analysis
     */
    exportLogs(): string;
}
export declare const nldLogger: NLDLogger;
export {};
//# sourceMappingURL=nld-logger.d.ts.map