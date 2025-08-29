/**
 * NLD System Deployment Validation
 *
 * Comprehensive validation suite to ensure NLD terminal monitoring system
 * is properly deployed and functioning correctly
 */
interface ValidationResult {
    component: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: any;
}
interface ValidationReport {
    timestamp: string;
    overallStatus: 'healthy' | 'degraded' | 'critical';
    validationResults: ValidationResult[];
    systemStats: {
        componentsHealthy: number;
        totalComponents: number;
        criticalIssues: number;
        warnings: number;
    };
    recommendations: string[];
}
export declare class NLDDeploymentValidator {
    private validationResults;
    private logDirectory;
    constructor(logDirectory?: string);
    /**
     * Run comprehensive validation of NLD system
     */
    validateDeployment(): Promise<ValidationReport>;
    /**
     * Validate directory structure and permissions
     */
    private validateDirectoryStructure;
    /**
     * Validate component initialization
     */
    private validateComponentInitialization;
    /**
     * Validate anti-patterns database functionality
     */
    private validateAntiPatternsDatabase;
    /**
     * Validate terminal pipe failure detection
     */
    private validateTerminalPipeDetection;
    /**
     * Validate SSE event flow detection
     */
    private validateSSEEventFlowDetection;
    /**
     * Validate TDD prevention strategies
     */
    private validateTDDStrategies;
    /**
     * Validate neural training integration
     */
    private validateNeuralIntegration;
    /**
     * Validate main NLD monitor
     */
    private validateMainMonitor;
    /**
     * Validate integration flow between components
     */
    private validateIntegrationFlow;
    /**
     * Add validation result
     */
    private addResult;
    /**
     * Generate validation report
     */
    private generateValidationReport;
    /**
     * Save validation report
     */
    private saveValidationReport;
}
export {};
//# sourceMappingURL=validate-nld-deployment.d.ts.map