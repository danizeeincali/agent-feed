/**
 * Neural Training Data Export for Claude-Flow Integration
 *
 * Exports NLD pattern data in claude-flow neural network format
 * for training failure prediction models and TDD improvement.
 */
export interface NeuralFeature {
    name: string;
    value: number | string | boolean;
    weight: number;
    category: 'TECHNICAL' | 'CONTEXTUAL' | 'BEHAVIORAL' | 'TEMPORAL';
}
export interface NeuralTrainingRecord {
    id: string;
    timestamp: string;
    features: NeuralFeature[];
    labels: {
        effectivenessScore: number;
        failureProbability: number;
        userSatisfaction: number;
        tddGapSeverity: number;
        preventabilityScore: number;
    };
    metadata: {
        domain: string;
        complexity: string;
        claudeConfidence: number;
        actualOutcome: string;
        patternType: string;
    };
    weight: number;
}
export interface NeuralDataset {
    version: string;
    generatedAt: string;
    trainingData: NeuralTrainingRecord[];
    validationData: NeuralTrainingRecord[];
    testData: NeuralTrainingRecord[];
    featureStats: {
        totalFeatures: number;
        featureTypes: Record<string, number>;
        featureRanges: Record<string, {
            min: number;
            max: number;
            mean: number;
        }>;
    };
    modelTargets: {
        primaryTarget: 'effectiveness_prediction' | 'failure_detection' | 'tdd_gap_identification';
        objectives: string[];
        evaluationMetrics: string[];
    };
    antiPatternMappings: Record<string, number>;
    tddStrategiesMappings: Record<string, number>;
}
export declare class NeuralTrainingExporter {
    /**
     * Export complete neural training dataset
     */
    exportTrainingDataset(): NeuralDataset;
    /**
     * Convert NLT record to neural training format
     */
    private convertToNeuralFormat;
    /**
     * Calculate feature statistics for normalization
     */
    private calculateFeatureStats;
    /**
     * Helper functions for feature encoding
     */
    private encodeComplexity;
    private calculateDomainRisk;
    private calculateUserSatisfaction;
    /**
     * Create anti-pattern frequency mappings
     */
    private createAntiPatternMappings;
    /**
     * Create TDD strategy effectiveness mappings
     */
    private createTDDStrategyMappings;
    /**
     * Shuffle array for data splitting
     */
    private shuffleArray;
    /**
     * Export for claude-flow neural system integration
     */
    exportForClaudeFlow(): any;
    private getFailureTypesCovered;
    private getDomainCoverage;
    private calculateDomainDistribution;
}
export declare const neuralTrainingExporter: NeuralTrainingExporter;
/**
 * Direct integration with claude-flow neural system
 * This would be called by claude-flow to get training data
 */
export declare function getNeuralTrainingData(): any;
/**
 * Export training metrics for performance tracking
 */
export declare function getTrainingMetrics(): any;
//# sourceMappingURL=neural-training-export.d.ts.map