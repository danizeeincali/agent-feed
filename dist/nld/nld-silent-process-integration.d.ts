/**
 * NLD Silent Process Integration System
 *
 * Integrates silent process failure detection with the existing NLD system
 * Provides unified interface for monitoring and preventing silent process failures
 * across the entire Claude process management system.
 */
export interface NLDSilentProcessConfig {
    enableMonitoring: boolean;
    silentDetectionThreshold: number;
    enableTTYDetection: boolean;
    enableAuthDetection: boolean;
    enablePermissionValidation: boolean;
    enableEnvironmentValidation: boolean;
    enableNeuralExport: boolean;
    alertThresholds: {
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
}
export interface NLDSilentProcessReport {
    timestamp: string;
    systemStatus: 'healthy' | 'warning' | 'critical';
    totalProcesses: number;
    silentProcesses: number;
    detectedPatterns: string[];
    criticalAlerts: number;
    preventionSuccessRate: number;
    tddCoverage: number;
    neuralExportStatus: {
        recordCount: number;
        lastExport?: string;
        nextScheduledExport?: string;
    };
    recommendations: string[];
}
export declare class NLDSilentProcessIntegrationSystem {
    private config;
    private isInitialized;
    private monitoringStartTime?;
    private integrationMetrics;
    constructor(config?: Partial<NLDSilentProcessConfig>);
    /**
     * Initialize the integrated silent process monitoring system
     */
    initialize(): Promise<void>;
    /**
     * Setup event handlers for the silent process detector
     */
    private setupDetectorEventHandlers;
    /**
     * Handle silent process alerts and trigger appropriate responses
     */
    private handleSilentProcessAlert;
    /**
     * Attempt automated prevention/recovery for detected patterns
     */
    private attemptAutomatedPrevention;
    /**
     * Handle TTY requirement issues
     */
    private handleTTYRequirement;
    /**
     * Handle authentication issues
     */
    private handleAuthenticationIssue;
    /**
     * Handle permission issues
     */
    private handlePermissionIssue;
    /**
     * Handle environment variable issues
     */
    private handleEnvironmentIssue;
    /**
     * Handle binary/executable issues
     */
    private handleBinaryIssue;
    /**
     * Check if alert thresholds have been exceeded
     */
    private checkAlertThresholds;
    /**
     * Export alert to neural training system
     */
    private exportAlertToNeuralTraining;
    /**
     * Setup automated neural export scheduling
     */
    private setupNeuralExportScheduling;
    /**
     * Register a process with the integrated monitoring system
     */
    registerProcess(instanceId: string, processId: number, command: string, workingDirectory: string, environment?: Record<string, string>): void;
    /**
     * Record process output (integrates with existing output handling)
     */
    recordProcessOutput(instanceId: string, outputType: 'stdout' | 'stderr', data: string): void;
    /**
     * Record process input (integrates with existing input handling)
     */
    recordProcessInput(instanceId: string, input: string): void;
    /**
     * Record process termination (integrates with existing process management)
     */
    recordProcessEnd(instanceId: string, exitCode?: number): void;
    /**
     * Generate comprehensive system report
     */
    generateSystemReport(): NLDSilentProcessReport;
    /**
     * Get next scheduled neural export time
     */
    private getNextScheduledExport;
    /**
     * Generate system recommendations based on current state
     */
    private generateRecommendations;
    /**
     * Get integration metrics
     */
    getIntegrationMetrics(): typeof this.integrationMetrics & {
        uptime: number;
        averageProcessesPerHour: number;
    };
    /**
     * Run TDD test suite for silent process prevention
     */
    runTDDTestSuite(): Promise<{
        totalTests: number;
        passedTests: number;
        failedTests: number;
        patternsCovered: string[];
        testResults: Record<string, boolean>;
    }>;
    /**
     * Shutdown the integration system
     */
    shutdown(): void;
}
export declare const nldSilentProcessIntegration: NLDSilentProcessIntegrationSystem;
//# sourceMappingURL=nld-silent-process-integration.d.ts.map