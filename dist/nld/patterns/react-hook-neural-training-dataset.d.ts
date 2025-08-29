/**
 * React Hook Neural Training Dataset
 * NLD Neural Training Module for React Hook Side Effect patterns
 *
 * Exports training data for claude-flow neural system to learn and prevent
 * React Hook side effect bugs in render cycles
 */
import { ReactHookSideEffectPattern } from './react-hook-side-effect-detector';
export interface NeuralTrainingDataPoint {
    id: string;
    timestamp: Date;
    inputFeatures: {
        componentName: string;
        hookName: string;
        renderCycleCount: number;
        userActionCount: number;
        renderToActionRatio: number;
        sideEffectType: string;
        sourceFileType: string;
        hookComplexityScore: number;
        componentSize: number;
        dependencyCount: number;
    };
    outputLabels: {
        isPattern: boolean;
        severity: 'low' | 'medium' | 'high' | 'critical';
        patternType: string;
        preventionStrategy: string;
        tddTestRequired: boolean;
    };
    contextFeatures: {
        symptom: string;
        rootCause: string;
        stackTrace?: string;
        sourceLocation: {
            file: string;
            line: number;
            column: number;
        };
    };
    metadata: Record<string, any>;
}
export interface TrainingDatasetConfig {
    maxSamples: number;
    balanceDataset: boolean;
    includeNegativeSamples: boolean;
    featureNormalization: boolean;
    crossValidationSplit: number;
}
export interface PreventionStrategy {
    name: string;
    description: string;
    implementation: string;
    tddTestPattern: string;
    effectiveness: number;
}
export declare class ReactHookNeuralTrainingDataset {
    private trainingData;
    private config;
    private preventionStrategies;
    constructor(config?: Partial<TrainingDatasetConfig>);
    /**
     * Initialize prevention strategies based on observed patterns
     */
    private initializePreventionStrategies;
    /**
     * Convert pattern to neural training data point
     */
    createTrainingDataPoint(pattern: ReactHookSideEffectPattern, additionalContext?: {
        componentSize?: number;
        dependencyCount?: number;
        hookComplexityScore?: number;
    }): NeuralTrainingDataPoint;
    /**
     * Select appropriate prevention strategy based on pattern
     */
    private selectPreventionStrategy;
    /**
     * Calculate hook complexity score
     */
    private calculateComplexityScore;
    /**
     * Extract file type from path
     */
    private extractFileType;
    /**
     * Determine if TDD test is required
     */
    private shouldRequireTDDTest;
    /**
     * Generate negative samples for balanced training
     */
    generateNegativeSamples(count: number): NeuralTrainingDataPoint[];
    /**
     * Process all detected patterns into training data
     */
    processAllPatterns(): void;
    /**
     * Export training dataset in claude-flow neural format
     */
    exportForClaudeFlowNeural(): {
        metadata: {
            exportTime: Date;
            version: string;
            sampleCount: number;
            config: TrainingDatasetConfig;
            preventionStrategies: PreventionStrategy[];
        };
        trainingData: {
            inputs: any[];
            outputs: any[];
            features: string[];
            labels: string[];
        };
        crossValidation: {
            trainingSplit: any[];
            validationSplit: any[];
        };
    };
    /**
     * Normalize feature values for better neural network training
     */
    private normalizeFeatures;
    /**
     * Get training data statistics
     */
    getStatistics(): {
        totalSamples: number;
        patternDistribution: Record<string, number>;
        severityDistribution: Record<string, number>;
        preventionStrategyDistribution: Record<string, number>;
    };
    /**
     * Clear training data for memory management
     */
    clearTrainingData(): void;
}
/**
 * Global training dataset instance
 */
export declare const reactHookNeuralTrainingDataset: ReactHookNeuralTrainingDataset;
//# sourceMappingURL=react-hook-neural-training-dataset.d.ts.map