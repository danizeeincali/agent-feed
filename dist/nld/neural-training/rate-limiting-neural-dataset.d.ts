/**
 * NLD Neural Training Dataset for Rate Limiting Patterns
 * Generates comprehensive training data for claude-flow neural system
 */
import { RateLimitingValidationSystem } from '../patterns/rate-limiting-validation-system';
export interface NeuralTrainingEntry {
    id: string;
    timestamp: Date;
    category: 'pattern-recognition' | 'failure-prevention' | 'performance-optimization' | 'error-reduction';
    inputPattern: {
        problemDescription: string;
        codeContext: string;
        errorSignatures: string[];
        performanceMetrics: {
            errorRate: number;
            performanceImpact: number;
            memoryUsage: number;
            cpuUsage: number;
        };
    };
    expectedOutput: {
        solutionCategory: string;
        implementationStrategy: string;
        preventionTechniques: string[];
        expectedResults: {
            errorReduction: number;
            performanceImprovement: number;
            reliabilityScore: number;
        };
    };
    trainingWeight: number;
    confidence: number;
    metadata: Record<string, any>;
}
export interface NeuralDatasetConfig {
    includePositivePatterns: boolean;
    includeFailurePatterns: boolean;
    includeValidationData: boolean;
    minTrainingWeight: number;
    maxDatasetSize: number;
    balanceCategories: boolean;
}
export declare class RateLimitingNeuralDataset {
    private validationSystem;
    private trainingEntries;
    private config;
    constructor(validationSystem: RateLimitingValidationSystem, config?: Partial<NeuralDatasetConfig>);
    /**
     * Generate comprehensive neural training dataset
     */
    generateTrainingDataset(): Promise<NeuralTrainingEntry[]>;
    /**
     * Generate training entries from positive patterns
     */
    private generatePositivePatternEntries;
    /**
     * Generate training entries from failure patterns
     */
    private generateFailurePatternEntries;
    /**
     * Generate training entries from validation results
     */
    private generateValidationEntries;
    /**
     * Generate scenario-specific training entry
     */
    private generateScenarioSpecificEntry;
    /**
     * Helper methods for data generation
     */
    private extractCodeContext;
    private estimateMemoryUsage;
    private estimateCpuUsage;
    private generateFailureCodeContext;
    private categorizeSolution;
    private extractPreventionTechniques;
    /**
     * Balance categories in dataset
     */
    private balanceCategories;
    /**
     * Calculate category distribution
     */
    private getCategoryDistribution;
    /**
     * Calculate average training weight
     */
    private calculateAverageWeight;
    /**
     * Export dataset for claude-flow neural system
     */
    exportForClaudeFlow(workingDirectory: string): Promise<{
        metadata: {
            exportTime: Date;
            entryCount: number;
            categories: Record<string, number>;
            averageWeight: number;
            averageConfidence: number;
            datasetVersion: string;
        };
        trainingData: NeuralTrainingEntry[];
    }>;
    /**
     * Get current training entries
     */
    getTrainingEntries(): NeuralTrainingEntry[];
}
//# sourceMappingURL=rate-limiting-neural-dataset.d.ts.map