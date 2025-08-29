/**
 * Working Directory NLD Deployment System
 * Deploys comprehensive NLD pattern detection for directory spawning failures
 * Integrates monitoring, detection, and neural training for TDD improvement
 */
export declare class WorkingDirectoryNLDDeployment {
    private patternDetector;
    private antiPatternsDB;
    private monitor;
    private tddStrategies;
    private isDeployed;
    private deploymentTimestamp?;
    constructor();
    /**
     * Deploy complete NLD system for working directory pattern detection
     */
    deploy(): Promise<{
        success: boolean;
        deploymentId: string;
        components: string[];
        monitoringStatus: any;
        reportPath: string;
    }>;
    /**
     * Process user feedback about directory spawning failure
     */
    processFailureFeedback(feedback: {
        userMessage: string;
        buttonType: string;
        expectedDirectory: string;
        actualDirectory: string;
        context: string;
    }): Promise<{
        detected: boolean;
        recordId?: string;
        patterns: string[];
        recommendations: string[];
        neuralTrainingUpdated: boolean;
    }>;
    /**
     * Generate TDD prevention recommendations
     */
    getTDDPreventionRecommendations(): {
        immediate: Array<{
            strategy: string;
            testCode: string;
            implementationCode: string;
        }>;
        strategic: Array<{
            strategy: string;
            description: string;
            effectiveness: number;
        }>;
    };
    /**
     * Get real-time monitoring status
     */
    getMonitoringStatus(): any;
    /**
     * Export comprehensive analysis for external systems
     */
    exportForClaudeFlow(): Promise<{
        neuralTrainingData: any;
        antiPatternsDatabase: any;
        tddStrategies: any;
        monitoringData: any;
        exportPath: string;
    }>;
    /**
     * Generate comprehensive deployment report
     */
    private generateDeploymentReport;
    /**
     * Get deployment status
     */
    getDeploymentStatus(): {
        isDeployed: boolean;
        deploymentTimestamp?: string;
        componentsActive: string[];
        monitoringActive: boolean;
    };
}
//# sourceMappingURL=working-directory-nld-deployment.d.ts.map