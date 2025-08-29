/**
 * Claude Process Regression Monitor - Real-Time Pattern Detection System
 *
 * Monitors Claude process functionality to prevent regressions in:
 * - PRINT_FLAG_REINTRODUCTION: Detection if --print flags get added back
 * - MOCK_CLAUDE_FALLBACK_ACTIVATION: Alert if system switches back to Mock Claude
 * - AUTHENTICATION_REGRESSION: Monitor for auth detection failures
 * - WORKING_DIRECTORY_ERRORS: Track directory resolution failures
 * - PROCESS_SPAWNING_FAILURES: Detect spawn command regressions
 */
export interface ClaudeProcessRegressionPattern {
    id: string;
    name: string;
    description: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    detectionLatency: number;
    patternSignature: RegExp[];
    preventionStrategy: string;
    recoveryAction: string;
}
export interface ClaudeProcessEvent {
    timestamp: Date;
    instanceId: string;
    eventType: 'SPAWN' | 'COMMAND_ARGS' | 'AUTH_CHECK' | 'WORKING_DIR' | 'OUTPUT' | 'ERROR';
    command?: string[];
    workingDirectory?: string;
    processType?: string;
    usePty?: boolean;
    output?: string;
    error?: string;
    metadata: Record<string, any>;
}
export interface RegressionAlert {
    id: string;
    pattern: ClaudeProcessRegressionPattern;
    triggeredAt: Date;
    instanceId: string;
    event: ClaudeProcessEvent;
    confidence: number;
    recoveryRecommendation: string;
    preventionAction: string;
}
export declare class ClaudeProcessRegressionMonitor {
    private patterns;
    private events;
    private alerts;
    private isMonitoring;
    private detectionInterval?;
    private baselineConfiguration;
    constructor();
    /**
     * Initialize critical regression patterns based on known failure modes
     */
    private initializeCriticalPatterns;
    /**
     * Load baseline configuration from current working system
     */
    private loadBaseline;
    /**
     * Start real-time monitoring with sub-200ms detection latency
     */
    startMonitoring(): void;
    /**
     * Stop monitoring system
     */
    stopMonitoring(): void;
    /**
     * Record Claude process event for analysis
     */
    recordEvent(event: ClaudeProcessEvent): void;
    /**
     * Immediate event-based regression check
     */
    private checkEventForRegressions;
    /**
     * Periodic pattern detection across recent events
     */
    private performPatternDetection;
    /**
     * Check if a specific pattern is triggered by an event
     */
    private isPatternTriggered;
    /**
     * Generate regression alert
     */
    private generateAlert;
    /**
     * Calculate confidence level for regression detection
     */
    private calculateConfidence;
    /**
     * Trigger immediate response to critical regression
     */
    private triggerImmediateResponse;
    /**
     * Execute automated recovery action
     */
    private executeRecoveryAction;
    /**
     * Fix print flag regression
     */
    private fixPrintFlagRegression;
    /**
     * Fix mock Claude regression
     */
    private fixMockClaudeRegression;
    /**
     * Fix authentication regression
     */
    private fixAuthenticationRegression;
    /**
     * Fix working directory regression
     */
    private fixWorkingDirectoryRegression;
    /**
     * Fix process spawning regression
     */
    private fixProcessSpawningRegression;
    /**
     * Notify monitoring dashboard of alert
     */
    private notifyDashboard;
    /**
     * Get current monitoring status
     */
    getStatus(): any;
    /**
     * Export neural training data
     */
    exportNeuralTrainingData(): any;
}
export declare const claudeProcessRegressionMonitor: ClaudeProcessRegressionMonitor;
//# sourceMappingURL=claude-process-regression-monitor.d.ts.map