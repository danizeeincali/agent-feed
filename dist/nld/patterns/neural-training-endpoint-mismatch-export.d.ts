/**
 * Neural Training Data Export for SSE Endpoint Mismatch Patterns
 *
 * Exports comprehensive training datasets from endpoint mismatch patterns
 * for claude-flow neural network training to prevent similar API versioning
 * inconsistencies in future development.
 */
export interface NeuralTrainingDataset {
    metadata: {
        datasetId: string;
        version: string;
        createdAt: string;
        patternType: string;
        totalSamples: number;
        featureCount: number;
    };
    trainingData: TrainingSample[];
    features: FeatureDefinition[];
    modelConfig: ModelConfiguration;
    validationSamples: ValidationSample[];
    claudeFlowConfig: ClaudeFlowIntegrationConfig;
}
export interface TrainingSample {
    id: string;
    patternId: string;
    features: {
        [key: string]: number;
    };
    labels: {
        willFail: number;
        severity: number;
        failureType: string;
        preventionNeeded: number;
    };
    context: {
        endpointType: 'sse' | 'rest' | 'websocket';
        versioningPattern: string;
        applicationDomain: string;
    };
    quality: {
        confidence: number;
        reliability: number;
        completeness: number;
    };
}
export interface FeatureDefinition {
    name: string;
    type: 'numeric' | 'categorical' | 'boolean';
    description: string;
    importance: number;
    normalizationRange?: [number, number];
    categories?: string[];
}
export interface ModelConfiguration {
    architecture: 'feedforward' | 'lstm' | 'transformer';
    layers: LayerConfig[];
    optimizer: OptimizerConfig;
    lossFunction: string;
    metrics: string[];
    hyperparameters: {
        [key: string]: any;
    };
}
export interface LayerConfig {
    type: string;
    units?: number;
    activation?: string;
    dropout?: number;
    regularization?: string;
}
export interface OptimizerConfig {
    type: 'adam' | 'sgd' | 'rmsprop';
    learningRate: number;
    decay?: number;
    momentum?: number;
}
export interface ValidationSample {
    input: {
        [key: string]: number;
    };
    expectedOutput: any;
    actualOutput?: any;
    accuracy?: number;
}
export interface ClaudeFlowIntegrationConfig {
    modelType: 'pattern-detection' | 'failure-prediction' | 'prevention-strategy';
    integrationEndpoint: string;
    trainingMode: 'supervised' | 'unsupervised' | 'reinforcement';
    neuralPatterns: {
        patternType: string;
        confidence: number;
        applicability: string[];
    }[];
    hooks: {
        preTrain: string[];
        postTrain: string[];
        onFailure: string[];
    };
}
/**
 * Main neural training data exporter
 */
export declare class NeuralTrainingEndpointMismatchExporter {
    private exportPath;
    constructor(exportPath?: string);
    /**
     * Export comprehensive training dataset
     */
    exportTrainingDataset(): Promise<NeuralTrainingDataset>;
    /**
     * Create comprehensive dataset from patterns
     */
    private createDatasetFromPatterns;
    /**
     * Generate training samples from patterns
     */
    private generateTrainingSamples;
    /**
     * Extract features from versioning inconsistency
     */
    private extractFeaturesFromInconsistency;
    /**
     * Extract features from working endpoint
     */
    private extractFeaturesFromEndpoint;
    /**
     * Get versioning pattern description
     */
    private getVersioningPattern;
    /**
     * Define neural network features
     */
    private defineFeatures;
    /**
     * Create model configuration for neural network
     */
    private createModelConfiguration;
    /**
     * Generate validation samples
     */
    private generateValidationSamples;
    /**
     * Create claude-flow integration configuration
     */
    private createClaudeFlowConfig;
    /**
     * Save dataset to file system
     */
    private saveDataset;
    /**
     * Convert to claude-flow neural format
     */
    private convertToClaudeFlowFormat;
    /**
     * Generate training script
     */
    private generateTrainingScript;
    /**
     * Ensure export directory exists
     */
    private ensureExportDirectory;
    /**
     * Generate summary report
     */
    generateExportSummary(dataset: NeuralTrainingDataset): any;
    /**
     * Calculate positive/negative sample ratio
     */
    private calculatePositiveNegativeRatio;
    /**
     * Calculate feature completeness
     */
    private calculateFeatureCompleteness;
}
export declare const neuralTrainingEndpointMismatchExporter: NeuralTrainingEndpointMismatchExporter;
//# sourceMappingURL=neural-training-endpoint-mismatch-export.d.ts.map