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

class NLDLogger {
  private logs: NLDLogEntry[] = [];
  private maxLogs = 10000;

  /**
   * Log an attempt (operation starting)
   */
  public renderAttempt(component: string, operation: string, data?: any): void {
    this.addLog('attempt', component, operation, 'Operation started', data);
  }

  /**
   * Log a success (operation completed successfully)
   */
  public renderSuccess(component: string, operation: string, data?: any): void {
    this.addLog('success', component, operation, 'Operation completed successfully', data);
  }

  /**
   * Log a failure (operation failed)
   */
  public renderFailure(component: string, error: Error, data?: any): void {
    this.addLog('failure', component, 'error', error.message, { error: error.stack, ...data });
  }

  /**
   * Add log entry
   */
  private addLog(level: NLDLogEntry['level'], component: string, operation: string, message: string, data?: any): void {
    const entry: NLDLogEntry = {
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
  public getLogs(): NLDLogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs by component
   */
  public getLogsByComponent(component: string): NLDLogEntry[] {
    return this.logs.filter(log => log.component === component);
  }

  /**
   * Get logs by level
   */
  public getLogsByLevel(level: NLDLogEntry['level']): NLDLogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Clear logs
   */
  public clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs for analysis
   */
  public exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Global logger instance
export const nldLogger = new NLDLogger();