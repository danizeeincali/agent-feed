/**
 * NLD System Validator - Comprehensive System Validation and Performance Metrics
 *
 * Validates the complete NLD (Neuro-Learning Development) regression prevention
 * system and provides comprehensive performance metrics and health checks.
 */
export interface NLDSystemStatus {
    overallHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'OFFLINE';
    healthScore: number;
    components: ComponentStatus[];
    performanceMetrics: SystemPerformanceMetrics;
    validationResults: ValidationResult[];
    lastValidated: Date;
    recommendations: string[];
}
export interface ComponentStatus {
    componentId: string;
    name: string;
    status: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'ERROR';
    health: number;
    uptime: number;
    lastActivity: Date;
    errorCount: number;
    metrics: Record<string, any>;
    dependencies: string[];
    issues: string[];
}
export interface SystemPerformanceMetrics {
    detectionLatency: LatencyMetrics;
    preventionLatency: LatencyMetrics;
    recoveryLatency: LatencyMetrics;
    throughput: ThroughputMetrics;
    accuracy: AccuracyMetrics;
    resource: ResourceMetrics;
    reliability: ReliabilityMetrics;
}
export interface LatencyMetrics {
    average: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    target: number;
    withinTarget: number;
}
export interface ThroughputMetrics {
    eventsPerSecond: number;
    alertsPerMinute: number;
    preventionsPerHour: number;
    recoveriesPerDay: number;
    capacity: number;
    utilization: number;
}
export interface AccuracyMetrics {
    detectionAccuracy: number;
    falsePositiveRate: number;
    falseNegativeRate: number;
    precision: number;
    recall: number;
    f1Score: number;
}
export interface ResourceMetrics {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkUsage: number;
    threadCount: number;
    handleCount: number;
}
export interface ReliabilityMetrics {
    uptime: number;
    mtbf: number;
    mttr: number;
    availability: number;
    errorRate: number;
    successRate: number;
}
export interface ValidationResult {
    validationId: string;
    name: string;
    status: 'PASSED' | 'FAILED' | 'WARNING' | 'SKIPPED';
    score: number;
    details: string;
    recommendations: string[];
    evidence: string[];
    timestamp: Date;
}
export interface ValidationSuite {
    id: string;
    name: string;
    description: string;
    validations: ValidationCheck[];
    required: boolean;
    timeout: number;
}
export interface ValidationCheck {
    checkId: string;
    name: string;
    description: string;
    implementation: () => Promise<ValidationResult>;
    critical: boolean;
    dependencies: string[];
}
export declare class NLDSystemValidator {
    private validationSuites;
    private validationHistory;
    private lastSystemStatus;
    private isValidating;
    constructor();
    /**
     * Initialize comprehensive validation suites
     */
    private initializeValidationSuites;
    /**
     * Run complete system validation
     */
    validateSystem(): Promise<NLDSystemStatus>;
    /**
     * Run individual validation suite
     */
    private runValidationSuite;
    /**
     * Get component status
     */
    private getComponentStatus;
    /**
     * Calculate comprehensive performance metrics
     */
    private calculatePerformanceMetrics;
    private validateRegressionMonitor;
    private validatePatternDetector;
    private validatePreventionSystem;
    private validateRecoveryAutomation;
    private validateDetectionLatency;
    private validatePreventionLatency;
    private validateThroughputCapacity;
    private validateDetectionAccuracy;
    private validateFalsePositiveRate;
    private validateDashboardIntegration;
    private validateDatabaseIntegration;
    private validateNeuralTrainingIntegration;
    private validateCICDIntegration;
    private validatePrintFlagPrevention;
    private validateMockClaudePrevention;
    private validateAuthenticationMonitoring;
    private createPassedValidationResult;
    private createFailedValidationResult;
    private measureDetectionLatency;
    private measurePreventionLatency;
    private measureRecoveryLatency;
    private measureThroughput;
    private measureAccuracy;
    private measureResourceUsage;
    private measureReliability;
    private calculateOverallHealthScore;
    private determineOverallHealth;
    private generateRecommendations;
    private getComponentName;
    private determineComponentStatus;
    private calculateComponentHealth;
    private calculateUptime;
    private getComponentDependencies;
    private identifyComponentIssues;
    private getEmptyPerformanceMetrics;
    /**
     * Get current system status
     */
    getCurrentStatus(): NLDSystemStatus | null;
    /**
     * Get validation history
     */
    getValidationHistory(limit?: number): ValidationResult[];
    /**
     * Export system validation data
     */
    exportValidationData(): any;
}
export declare const nldSystemValidator: NLDSystemValidator;
//# sourceMappingURL=nld-system-validator.d.ts.map