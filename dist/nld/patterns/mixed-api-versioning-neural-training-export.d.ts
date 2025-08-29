import { MixedVersioningPattern } from './mixed-api-versioning-anti-pattern-detector';
/**
 * Neural Training Export System for Mixed API Versioning Prevention
 *
 * NEURAL LEARNING APPROACH:
 * - Export real failure patterns as training data
 * - Train neural models to recognize mixed versioning early
 * - Provide prevention recommendations based on learned patterns
 * - Integrate with Claude-Flow neural system for comprehensive TDD improvement
 */
export interface NeuralTrainingRecord {
    id: string;
    timestamp: Date;
    patternType: 'mixed_api_versioning';
    failureContext: {
        originalEndpoints: string[];
        failureSymptoms: string[];
        userImpact: string;
        detectedBy: string;
    };
    preventionData: {
        tddApproach: string;
        testPatterns: string[];
        codePatterns: string[];
        preventionScore: number;
    };
    neuralFeatures: {
        endpointPairCount: number;
        versioningInconsistency: number;
        userWorkflowImpact: boolean;
        silentFailureRisk: number;
    };
    expectedPrevention: {
        unifiedConfig: boolean;
        contractTesting: boolean;
        workflowTesting: boolean;
        neuralDetection: boolean;
    };
}
export interface ClaudeFlowNeuralDataset {
    version: string;
    description: string;
    timestamp: string;
    trainingRecords: NeuralTrainingRecord[];
    patternMetrics: {
        totalPatterns: number;
        averagePreventionScore: number;
        mostCommonFailureMode: string;
        preventionEffectiveness: Record<string, number>;
    };
    integrationInstructions: {
        claudeFlowIntegration: string[];
        tddEnhancement: string[];
        neuralTrainingPipeline: string[];
    };
}
export declare class MixedAPIVersioningNeuralTrainingExport {
    private readonly exportPath;
    private readonly claudeFlowPath;
    private detector;
    constructor();
    /**
     * Export comprehensive neural training dataset
     */
    exportTrainingDataset(patterns: MixedVersioningPattern[]): Promise<ClaudeFlowNeuralDataset>;
    /**
     * Convert detected patterns to neural training records
     */
    private convertPatternsToTrainingRecords;
    /**
     * Calculate pattern metrics for training optimization
     */
    private calculatePatternMetrics;
    /**
     * Calculate prevention score based on pattern characteristics
     */
    private calculatePreventionScore;
    /**
     * Calculate versioning inconsistency metric
     */
    private calculateVersioningInconsistency;
    /**
     * Export TDD test patterns for integration
     */
    private exportTDDTestPatterns;
    /**
     * Export prevention code templates
     */
    private exportPreventionCodeTemplates;
    /**
     * Export Claude-Flow integration instructions
     */
    private exportIntegrationInstructions;
    /**
     * Generate real-time pattern detection deployment script
     */
    generateDeploymentScript(): Promise<void>;
    /**
     * Generate comprehensive validation report
     */
    generateValidationReport(dataset: ClaudeFlowNeuralDataset): Promise<void>;
}
export default MixedAPIVersioningNeuralTrainingExport;
//# sourceMappingURL=mixed-api-versioning-neural-training-export.d.ts.map