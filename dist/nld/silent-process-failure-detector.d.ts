/**
 * NLD Silent Process Failure Detector
 *
 * Detects and analyzes processes that spawn successfully but produce no output
 * Specialized for identifying authentication prompts, TTY requirements, and environment issues
 *
 * Key Detection Areas:
 * - Processes with valid PID but zero stdout/stderr
 * - TTY requirement failures in piped mode
 * - Authentication prompts not visible in non-interactive mode
 * - Working directory permission issues
 * - Environment variable dependencies
 * - Silent failure modes in CLI tools
 */
import { EventEmitter } from 'events';
export interface SilentProcessPattern {
    patternId: string;
    patternName: string;
    description: string;
    detectionCriteria: {
        processPidExists: boolean;
        stdoutSilentDuration: number;
        stderrSilentDuration: number;
        inputForwardingWorks: boolean;
        processStillRunning: boolean;
    };
    commonCauses: string[];
    detectionSignatures: string[];
    diagnosisSteps: string[];
    preventionStrategy: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    tddFactor: number;
    neuralFeatures: Record<string, any>;
}
export interface SilentProcessMetrics {
    instanceId: string;
    processId: number;
    spawnTime: Date;
    lastOutputTime?: Date;
    lastErrorTime?: Date;
    inputCommandsSent: number;
    outputEventsReceived: number;
    errorEventsReceived: number;
    silentDuration: number;
    processStatus: 'spawning' | 'silent' | 'responsive' | 'terminated';
    detectedPatterns: string[];
    environmentChecks: {
        workingDirectoryExists: boolean;
        workingDirectoryWritable: boolean;
        ttyRequired: boolean;
        authenticationRequired: boolean;
        missingEnvironmentVars: string[];
    };
}
export interface SilentProcessAlert {
    timestamp: Date;
    instanceId: string;
    alertType: 'silent_process_detected' | 'tty_required' | 'auth_prompt_detected' | 'permission_denied' | 'env_var_missing';
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    detectedPattern: string;
    diagnostics: Record<string, any>;
    recommendedActions: string[];
}
export declare class SilentProcessFailureDetector extends EventEmitter {
    private monitoredProcesses;
    private detectedPatterns;
    private alertHistory;
    private isMonitoring;
    private readonly SILENT_DETECTION_THRESHOLD;
    private readonly TTY_CHECK_COMMANDS;
    private readonly AUTH_DETECTION_KEYWORDS;
    private readonly PERMISSION_ERROR_KEYWORDS;
    constructor();
    /**
     * Initialize the pattern database with known silent process failure patterns
     */
    private initializePatternDatabase;
    /**
     * Start monitoring for silent process failures
     */
    startMonitoring(): void;
    /**
     * Stop monitoring
     */
    stopMonitoring(): void;
    /**
     * Register a new process for silent failure monitoring
     */
    registerProcess(instanceId: string, processId: number, command: string, workingDirectory: string): void;
    /**
     * Record output received from process
     */
    recordOutput(instanceId: string, outputType: 'stdout' | 'stderr', data: string): void;
    /**
     * Record input sent to process
     */
    recordInput(instanceId: string, input: string): void;
    /**
     * Record process termination
     */
    recordProcessEnd(instanceId: string, exitCode?: number): void;
    /**
     * Setup periodic checks for silent processes
     */
    private setupPeriodicChecks;
    /**
     * Perform periodic checks for silent processes
     */
    private performSilentProcessChecks;
    /**
     * Detect which pattern matches the silent process
     */
    private detectSilentProcessPattern;
    /**
     * Check if metrics match a specific pattern
     */
    private matchesPattern;
    /**
     * Check if command requires TTY
     */
    private requiresTTY;
    /**
     * Check if command requires authentication
     */
    private requiresAuthentication;
    /**
     * Perform environment checks for a process
     */
    private performEnvironmentChecks;
    /**
     * Start monitoring timer for specific process
     */
    private startProcessMonitoring;
    /**
     * Analyze stderr output for error patterns
     */
    private analyzeErrorOutput;
    /**
     * Check if exit code indicates permission error
     */
    private isPermissionExitCode;
    /**
     * Trigger an alert for detected failure pattern
     */
    private triggerAlert;
    /**
     * Clear silent process alert for instance that became responsive
     */
    private clearSilentProcessAlert;
    /**
     * Get metrics for specific instance
     */
    getInstanceMetrics(instanceId: string): SilentProcessMetrics | undefined;
    /**
     * Get all monitoring metrics
     */
    getAllMetrics(): Map<string, SilentProcessMetrics>;
    /**
     * Get alert history
     */
    getAlertHistory(instanceId?: string): SilentProcessAlert[];
    /**
     * Get pattern database
     */
    getPatternDatabase(): Map<string, SilentProcessPattern>;
    /**
     * Generate monitoring report
     */
    generateReport(): {
        totalProcesses: number;
        silentProcesses: number;
        responsiveProcesses: number;
        terminatedProcesses: number;
        detectedPatterns: string[];
        criticalAlerts: number;
        recommendations: string[];
    };
    /**
     * Export data for neural training
     */
    exportNeuralTrainingData(): any;
}
export declare const silentProcessDetector: SilentProcessFailureDetector;
//# sourceMappingURL=silent-process-failure-detector.d.ts.map