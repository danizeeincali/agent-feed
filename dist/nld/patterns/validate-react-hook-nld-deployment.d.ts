/**
 * React Hook NLD Deployment Validator
 * Validates the deployment and functionality of React Hook Side Effect pattern detection
 */
export interface ValidationResult {
    testName: string;
    passed: boolean;
    message: string;
    details?: any;
    timestamp: Date;
}
export interface DeploymentValidationReport {
    validationTime: Date;
    overallStatus: 'passed' | 'failed' | 'warning';
    totalTests: number;
    passedTests: number;
    failedTests: number;
    results: ValidationResult[];
    performance: {
        detectionLatency: number;
        trainingDataGeneration: number;
        exportTime: number;
    };
    recommendations: string[];
}
export declare class ReactHookNLDDeploymentValidator {
    private results;
    constructor();
    /**
     * Run comprehensive validation of NLD deployment
     */
    validateDeployment(): Promise<DeploymentValidationReport>;
    /**
     * Validate pattern detector functionality
     */
    private validatePatternDetector;
    /**
     * Validate training dataset generation
     */
    private validateTrainingDataset;
    /**
     * Validate neural exporter functionality
     */
    private validateNeuralExporter;
    /**
     * Validate end-to-end workflow
     */
    private validateEndToEndWorkflow;
    /**
     * Validate performance characteristics
     */
    private validatePerformance;
    /**
     * Validate real-world pattern scenarios
     */
    private validateRealWorldPatterns;
    /**
     * Add validation result
     */
    private addResult;
    /**
     * Generate comprehensive validation report
     */
    private generateValidationReport;
    /**
     * Generate recommendations based on validation results
     */
    private generateRecommendations;
}
/**
 * Run validation and export results
 */
export declare function runNLDValidation(): Promise<DeploymentValidationReport>;
/**
 * Export validation report for review
 */
export declare function exportValidationReport(report: DeploymentValidationReport): Promise<string>;
//# sourceMappingURL=validate-react-hook-nld-deployment.d.ts.map