/**
 * Silent Process Neural Training Export System
 *
 * Exports silent process failure patterns, detection data, and TDD strategies
 * for neural network training to improve future silent process detection
 * and prevention capabilities.
 */
import { SilentProcessAntiPattern } from './silent-process-anti-patterns-database';
export interface SilentProcessNeuralRecord {
    recordId: string;
    timestamp: string;
    recordType: 'pattern_detection' | 'prevention_success' | 'prevention_failure' | 'tdd_test_result';
    instanceId: string;
    processInfo: {
        command: string;
        processId?: number;
        workingDirectory: string;
        environment: Record<string, string>;
        spawnTime: string;
        endTime?: string;
    };
    detectionResults: {
        patternsDetected: string[];
        confidenceScores: Record<string, number>;
        silentDuration: number;
        outputReceived: boolean;
        errorReceived: boolean;
    };
    preventionActions: {
        actionsAttempted: string[];
        actionsSuccessful: string[];
        tddTestsRun: string[];
        tddTestResults: Record<string, boolean>;
    };
    outcome: {
        successful: boolean;
        patternsPrevented: string[];
        userExperience: 'excellent' | 'good' | 'poor' | 'failure';
        resolutionMethod?: string;
    };
    neuralFeatures: {
        command_category: string;
        environment_complexity: number;
        auth_required: boolean;
        tty_required: boolean;
        permission_issues: boolean;
        env_var_missing: boolean;
        detection_accuracy: number;
        prevention_effectiveness: number;
    };
}
export interface SilentProcessNeuralDataset {
    datasetId: string;
    generationTime: string;
    version: string;
    metadata: {
        totalRecords: number;
        recordTypes: Record<string, number>;
        patternDistribution: Record<string, number>;
        tddCoverage: number;
        preventionSuccessRate: number;
    };
    patterns: SilentProcessAntiPattern[];
    trainingRecords: SilentProcessNeuralRecord[];
    tddStrategies: {
        testSuites: any[];
        criticalTests: any[];
        preventionMetrics: any;
    };
    validationMetrics: {
        detectionAccuracy: number;
        falsePositiveRate: number;
        falseNegativeRate: number;
        preventionEffectiveness: number;
        userSatisfactionScore: number;
    };
}
export declare class SilentProcessNeuralTrainingExport {
    private trainingRecords;
    private exportHistory;
    constructor();
    /**
     * Setup event listeners to capture training data automatically
     */
    private setupEventListeners;
    /**
     * Record a pattern detection event for neural training
     */
    recordPatternDetection(alert: any): void;
    /**
     * Record a successful prevention event
     */
    recordPreventionSuccess(instanceId: string, command: string, preventionActions: string[], patternsPrevented: string[]): void;
    /**
     * Record TDD test results
     */
    recordTDDTestResults(testId: string, testResults: Record<string, boolean>, preventedPatterns: string[]): void;
    /**
     * Extract neural features from alert and metrics
     */
    private extractNeuralFeatures;
    /**
     * Extract neural features from command analysis
     */
    private extractNeuralFeaturesFromCommand;
    /**
     * Categorize command for neural features
     */
    private categorizeCommand;
    /**
     * Calculate environment complexity score
     */
    private calculateEnvironmentComplexity;
    /**
     * Check if command requires authentication
     */
    private commandRequiresAuth;
    /**
     * Check if command requires TTY
     */
    private commandRequiresTTY;
    /**
     * Check if command has permission risks
     */
    private commandHasPermissionRisk;
    /**
     * Check if command has environment dependencies
     */
    private commandHasEnvDependencies;
    /**
     * Generate complete neural training dataset
     */
    generateNeuralDataset(): SilentProcessNeuralDataset;
    /**
     * Calculate validation metrics for the dataset
     */
    private calculateValidationMetrics;
    /**
     * Export dataset to file system for neural network training
     */
    exportDatasetToFile(dataset?: SilentProcessNeuralDataset): Promise<string>;
    /**
     * Get export statistics
     */
    getExportStatistics(): {
        totalExports: number;
        totalRecords: number;
        averageRecordsPerExport: number;
        latestExport?: {
            timestamp: Date;
            datasetId: string;
            recordCount: number;
        };
        exportFrequency: {
            last24Hours: number;
            last7Days: number;
            last30Days: number;
        };
    };
    /**
     * Clear training records (for testing or reset)
     */
    clearTrainingRecords(): void;
    /**
     * Get current training record count
     */
    getTrainingRecordCount(): number;
}
export declare const silentProcessNeuralExport: SilentProcessNeuralTrainingExport;
//# sourceMappingURL=silent-process-neural-training-export.d.ts.map