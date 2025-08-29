/**
 * Real-time Working Directory Configuration Monitor
 * Monitors simple-backend.js for hardcoded working directory patterns
 * and provides live detection of directory spawning failures
 */
export declare class WorkingDirectoryMonitor {
    private patternDetector;
    private antiPatternsDB;
    private isMonitoring;
    private monitoringInterval?;
    private lastKnownContent;
    private readonly BACKEND_FILE;
    private readonly MONITOR_INTERVAL;
    constructor();
    /**
     * Start real-time monitoring of createRealClaudeInstance function
     */
    startMonitoring(): Promise<void>;
    /**
     * Stop monitoring
     */
    stopMonitoring(): void;
    /**
     * Scan backend file for working directory anti-patterns
     */
    private scanForPatterns;
    /**
     * Detect hardcoded working directory pattern
     */
    private detectHardcodedWorkingDir;
    /**
     * Detect missing button type to directory mapping
     */
    private detectMissingButtonMapping;
    /**
     * Detect missing working directory validation
     */
    private detectMissingDirectoryValidation;
    /**
     * Read backend file content
     */
    private readBackendFile;
    /**
     * Process user feedback about directory spawning issues
     */
    processUserFeedback(feedback: {
        message: string;
        buttonType: string;
        expectedDirectory: string;
        actualDirectory: string;
        context: string;
    }): Promise<{
        detected: boolean;
        recordId?: string;
        patterns: string[];
        recommendations: string[];
    }>;
    /**
     * Get monitoring status and statistics
     */
    getMonitoringStatus(): {
        isRunning: boolean;
        monitoredFile: string;
        lastScan: string;
        detectedPatterns: any[];
        recommendations: string[];
    };
    /**
     * Export comprehensive NLD report
     */
    exportNLDReport(): Promise<{
        reportPath: string;
        patterns: any[];
        antiPatterns: any[];
        neuralTrainingData: any[];
        summary: any;
    }>;
}
//# sourceMappingURL=working-directory-monitor.d.ts.map