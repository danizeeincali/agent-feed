/**
 * CI/CD Pipeline Integration - Proactive Regression Prevention
 *
 * Integrates NLD regression prevention system with CI/CD pipelines
 * to prevent regressions before they reach production.
 */
export interface PipelineStage {
    id: string;
    name: string;
    description: string;
    type: 'validation' | 'testing' | 'prevention' | 'deployment';
    dependencies: string[];
    validations: PipelineValidation[];
    timeoutMs: number;
    required: boolean;
}
export interface PipelineValidation {
    validationId: string;
    name: string;
    description: string;
    implementation: () => Promise<ValidationResult>;
    criticalityLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    bypassAllowed: boolean;
}
export interface ValidationResult {
    passed: boolean;
    details: string;
    confidence: number;
    evidence: string[];
    recommendations: string[];
    blockingIssues: string[];
}
export interface PipelineExecution {
    executionId: string;
    startTime: Date;
    endTime?: Date;
    status: 'RUNNING' | 'PASSED' | 'FAILED' | 'BYPASSED';
    stages: StageExecution[];
    overallResult: ValidationResult;
    artifacts: PipelineArtifact[];
}
export interface StageExecution {
    stageId: string;
    startTime: Date;
    endTime?: Date;
    status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED';
    validations: ValidationExecution[];
    duration: number;
}
export interface ValidationExecution {
    validationId: string;
    startTime: Date;
    endTime?: Date;
    result?: ValidationResult;
    status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED';
    duration: number;
}
export interface PipelineArtifact {
    id: string;
    name: string;
    type: 'report' | 'evidence' | 'baseline' | 'training_data';
    content: any;
    createdAt: Date;
}
export interface CICDConfiguration {
    pipelineName: string;
    environment: 'development' | 'staging' | 'production';
    stages: string[];
    validationThreshold: number;
    failFast: boolean;
    generateArtifacts: boolean;
    notificationEndpoints: string[];
}
export declare class CICDIntegration {
    private stages;
    private executionHistory;
    private configuration;
    constructor(config?: Partial<CICDConfiguration>);
    /**
     * Initialize comprehensive pipeline stages
     */
    private initializePipelineStages;
    /**
     * Execute complete CI/CD pipeline
     */
    executePipeline(config?: Partial<CICDConfiguration>): Promise<PipelineExecution>;
    /**
     * Execute individual stage
     */
    private executeStage;
    /**
     * Calculate overall pipeline result
     */
    private calculateOverallResult;
    /**
     * Generate pipeline artifacts
     */
    private generateArtifacts;
    /**
     * Generate execution report
     */
    private generateExecutionReport;
    /**
     * Notify pipeline completion
     */
    private notifyCompletion;
    private validateNoPrintFlags;
    private validateRealClaudeProcesses;
    private validateCommandStructure;
    private testFailureScenarios;
    private validateNeuralPatterns;
    private validateBaselineConformance;
    private validatePreventionSystemReady;
    private validateMonitoringActive;
    private validateRecoverySystemsReady;
    private validateProductionReadiness;
    private validateRollbackPlanReady;
    /**
     * Get pipeline status
     */
    getStatus(): any;
    /**
     * Export pipeline data
     */
    exportPipelineData(): any;
}
export declare const cicdIntegration: CICDIntegration;
//# sourceMappingURL=cicd-integration.d.ts.map