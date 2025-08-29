"use strict";
/**
 * NLD Logger Utility
 * Centralized logging for NLD pattern detection and analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.nldLogger = void 0;
class NLDLogger {
    logs = [];
    maxLogs = 10000;
    /**
     * Log an attempt (operation starting)
     */
    renderAttempt(component, operation, data) {
        this.addLog('attempt', component, operation, 'Operation started', data);
    }
    /**
     * Log a success (operation completed successfully)
     */
    renderSuccess(component, operation, data) {
        this.addLog('success', component, operation, 'Operation completed successfully', data);
    }
    /**
     * Log a failure (operation failed)
     */
    renderFailure(component, error, data) {
        this.addLog('failure', component, 'error', error.message, { error: error.stack, ...data });
    }
    /**
     * Add log entry
     */
    addLog(level, component, operation, message, data) {
        const entry = {
            timestamp: new Date(),
            level,
            component,
            operation,
            message,
            data
        };
        this.logs.push(entry);
        // Maintain log size limit
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
        // Console output for debugging
        if (process.env.NODE_ENV !== 'production') {
            const prefix = level === 'attempt' ? '🔄' : level === 'success' ? '✅' : '❌';
            console.log(`${prefix} [${component}] ${operation}: ${message}`);
            if (data) {
                console.log('  Data:', data);
            }
        }
    }
    /**
     * Get all logs
     */
    getLogs() {
        return [...this.logs];
    }
    /**
     * Get logs by component
     */
    getLogsByComponent(component) {
        return this.logs.filter(log => log.component === component);
    }
    /**
     * Get logs by level
     */
    getLogsByLevel(level) {
        return this.logs.filter(log => log.level === level);
    }
    /**
     * Clear logs
     */
    clearLogs() {
        this.logs = [];
    }
    /**
     * Export logs for analysis
     */
    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }
}
// Global logger instance
exports.nldLogger = new NLDLogger();
//# sourceMappingURL=nld-logger.js.map