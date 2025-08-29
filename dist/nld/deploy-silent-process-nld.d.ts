/**
 * Silent Process NLD Deployment Script
 *
 * Demonstrates the complete silent process failure detection and prevention system
 * Shows integration with existing NLD infrastructure and provides validation
 * of pattern detection capabilities.
 */
/**
 * Silent Process NLD Deployment and Validation
 */
export declare class SilentProcessNLDDeployment {
    private deploymentId;
    private deploymentStartTime;
    private validationResults;
    constructor();
    /**
     * Deploy complete silent process NLD system
     */
    deployComplete(): Promise<{
        deploymentId: string;
        deploymentTime: number;
        validationResults: typeof this.validationResults;
        systemReport: any;
        recommendations: string[];
    }>;
    /**
     * Initialize all system components
     */
    private initializeSystemComponents;
    /**
     * Validate pattern detection capabilities
     */
    private validatePatternDetection;
    /**
     * Wait for pattern detection (simulated for testing)
     */
    private waitForPatternDetection;
    /**
     * Test TDD integration
     */
    private testTDDIntegration;
    /**
     * Validate neural export functionality
     */
    private validateNeuralExport;
    /**
     * Run comprehensive integration validation
     */
    private runIntegrationValidation;
    /**
     * Simulate full process lifecycle for testing
     */
    private simulateProcessLifecycle;
    /**
     * Generate comprehensive deployment report
     */
    private generateDeploymentReport;
    /**
     * Get validation success rate
     */
    private getValidationSuccessRate;
    /**
     * Generate deployment recommendations
     */
    private generateDeploymentRecommendations;
    /**
     * Cleanup deployment resources
     */
    cleanup(): void;
}
/**
 * Main deployment function
 */
export declare function deploySilentProcessNLD(): Promise<any>;
//# sourceMappingURL=deploy-silent-process-nld.d.ts.map