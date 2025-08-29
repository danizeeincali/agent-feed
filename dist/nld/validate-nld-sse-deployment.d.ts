/**
 * NLD SSE Pattern Detection Deployment Validator
 * Validates that all NLD components are properly deployed and functioning
 * Part of NLD (Neuro-Learning Development) system
 */
interface ValidationResult {
    component: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: any;
    recommendations?: string[];
}
interface DeploymentValidationReport {
    validationId: string;
    timestamp: string;
    overallStatus: 'pass' | 'fail' | 'warning';
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warningChecks: number;
    results: ValidationResult[];
    summary: {
        deploymentHealth: 'excellent' | 'good' | 'fair' | 'poor';
        criticalIssues: string[];
        recommendations: string[];
        nextSteps: string[];
    };
}
export declare class NLDSSEDeploymentValidator {
    private validationDir;
    private bufferDetector?;
    private handlerAnalyzer?;
    private bufferFailureAnalyzer?;
    private frontendDetector?;
    private tddStrategies?;
    private neuralExporter?;
    private antiPatternsDB?;
    private failureMonitor?;
    constructor(validationDir: string);
    /**
     * Initialize and validate all NLD components
     */
    initializeAndValidateComponents(): Promise<DeploymentValidationReport>;
    /**
     * Run functional tests on NLD components
     */
    private runFunctionalTests;
    /**
     * Generate validation report
     */
    private generateValidationReport;
    /**
     * Generate next steps based on validation results
     */
    private generateNextSteps;
    /**
     * Persist validation report
     */
    private persistValidationReport;
    /**
     * Generate human-readable validation summary
     */
    generateValidationSummary(report: DeploymentValidationReport): string;
    /**
     * Start production monitoring if validation passes
     */
    startProductionMonitoringIfValid(): Promise<boolean>;
    /**
     * Get latest validation report
     */
    getLatestValidationReport(): DeploymentValidationReport | null;
    /**
     * Clean shutdown of all components
     */
    shutdown(): void;
}
export default NLDSSEDeploymentValidator;
export { ValidationResult, DeploymentValidationReport };
//# sourceMappingURL=validate-nld-sse-deployment.d.ts.map