/**
 * NLD Rate Limiting Validation Orchestrator
 * Coordinates validation, pattern recognition, neural training, and exports
 * for the claude-flow neural system
 */
export interface OrchestrationResult {
    validationResults: any;
    positivePatterns: any[];
    neuralTrainingData: any;
    preventionStrategies: any[];
    claudeFlowExport: any;
    summary: {
        timestamp: Date;
        validationPassed: boolean;
        patternsRecognized: number;
        trainingEntriesGenerated: number;
        preventionStrategiesCreated: number;
        effectiveness: {
            errorReduction: number;
            performanceImprovement: number;
            preventionScore: number;
        };
    };
}
export declare class NLDRateLimitingValidationOrchestrator {
    private workingDirectory;
    private validationSystem;
    private neuralDataset;
    constructor(workingDirectory?: string);
    /**
     * Execute complete NLD validation and training pipeline
     */
    executeValidationPipeline(): Promise<OrchestrationResult>;
    /**
     * Export consolidated data for claude-flow neural system
     */
    private exportForClaudeFlow;
    /**
     * Calculate overall effectiveness metrics
     */
    private calculateEffectiveness;
    /**
     * Generate recommendations for claude-flow neural system
     */
    private generateClaudeFlowRecommendations;
    /**
     * Save comprehensive orchestration results
     */
    private saveOrchestrationResults;
    /**
     * Generate NLD pattern detection summary
     */
    generatePatternDetectionSummary(result: OrchestrationResult): {
        trigger: string;
        taskType: string;
        failureMode: string;
        tddFactor: string;
        recordCreated: {
            recordId: string;
            effectivenessScore: number;
            patternClassification: string;
            neuralTrainingStatus: string;
        };
        recommendations: {
            tddPatterns: string[];
            preventionStrategy: string[];
            trainingImpact: string[];
        };
    };
}
/**
 * Global orchestrator instance
 */
export declare const nldRateLimitingValidationOrchestrator: NLDRateLimitingValidationOrchestrator;
//# sourceMappingURL=nld-rate-limiting-validation-orchestrator.d.ts.map