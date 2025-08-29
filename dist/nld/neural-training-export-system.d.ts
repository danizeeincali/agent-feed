/**
 * Neural Training Export System for SSE Connection Patterns
 *
 * Exports failure pattern data in claude-flow neural network format
 * Provides training datasets for failure prediction models
 * Integrates with claude-flow neural capabilities for continuous learning
 */
interface NeuralTrainingDataset {
    version: string;
    exportTimestamp: string;
    metadata: {
        totalPatterns: number;
        patternTypes: string[];
        coverageMetrics: {
            antiPatternsCovered: number;
            testCasesCovered: number;
            realWorldExamples: number;
        };
        qualityMetrics: {
            avgEffectivenessScore: number;
            patternDiversity: number;
            temporalRange: string;
        };
    };
    trainingData: NeuralTrainingRecord[];
    validationData: NeuralTrainingRecord[];
    testData: NeuralTrainingRecord[];
    neuralArchitecture: NeuralArchitectureSpec;
}
interface NeuralTrainingRecord {
    id: string;
    input: {
        connectionState: {
            statusSSE: {
                connected: boolean;
                connections: number;
            };
            terminalSSE: {
                connected: boolean;
                connections: number;
            };
            pollingActive: boolean;
        };
        uiState: {
            status: string;
            stuckDuration: number;
            lastUpdate: string | null;
        };
        contextualFeatures: {
            instanceAge: number;
            networkLatency: number;
            errorHistory: string[];
            userActions: string[];
        };
        temporalFeatures: {
            timeOfDay: number;
            dayOfWeek: number;
            systemLoad: number;
            concurrentInstances: number;
        };
    };
    output: {
        failurePrediction: {
            willFail: boolean;
            failureType: string;
            probability: number;
            confidenceLevel: number;
        };
        preventionActions: {
            recommended: string[];
            priority: number[];
            effectivenessScore: number[];
        };
        recoveryStrategy: {
            actions: string[];
            estimatedTime: number;
            successProbability: number;
        };
        tddRecommendations: {
            testCases: string[];
            mockingStrategy: string[];
            assertionPatterns: string[];
        };
    };
    groundTruth: {
        actualOutcome: 'success' | 'failure';
        actualFailureType: string | null;
        resolutionTime: number | null;
        effectiveActions: string[];
        userSatisfaction: number;
    };
}
interface NeuralArchitectureSpec {
    name: 'SSE_Connection_Pattern_Predictor';
    type: 'transformer' | 'lstm' | 'hybrid';
    layers: Array<{
        type: 'input' | 'embedding' | 'attention' | 'dense' | 'dropout' | 'output';
        size: number;
        activation?: string;
        dropout?: number;
    }>;
    hyperparameters: {
        learningRate: number;
        batchSize: number;
        epochs: number;
        validationSplit: number;
        earlyStopping: boolean;
    };
    features: {
        inputDimensions: number;
        outputDimensions: number;
        sequenceLength: number;
        embeddingSize: number;
    };
}
export declare class NeuralTrainingExportSystem {
    private patternDetector;
    private antiPatternsDB;
    private tddStrategies;
    private exportDir;
    private readonly TRAIN_SPLIT;
    private readonly VALIDATION_SPLIT;
    private readonly TEST_SPLIT;
    constructor(exportDir?: string);
    private ensureExportDirectory;
    /**
     * Export complete neural training dataset
     */
    exportTrainingDataset(): Promise<string>;
    /**
     * Generate training records from captured patterns
     */
    private generateTrainingRecords;
    /**
     * Convert captured pattern to neural training record
     */
    private convertPatternToTrainingRecord;
    /**
     * Generate synthetic training data for rare failure modes
     */
    private generateSyntheticTrainingData;
    /**
     * Generate positive examples (successful connections)
     */
    private generatePositiveExamples;
    /**
     * Split dataset into train/validation/test sets
     */
    private splitDataset;
    /**
     * Generate metadata for the dataset
     */
    private generateMetadata;
    /**
     * Generate neural architecture specification
     */
    private generateNeuralArchitecture;
    /**
     * Save dataset to file
     */
    private saveDataset;
    /**
     * Convert to claude-flow neural format
     */
    private convertToClaudeFlowFormat;
    private getStoredPatterns;
    private estimateInstanceAge;
    private extractUserActions;
    private getPreventionActions;
    private getRecoveryActions;
    private estimateRecoveryTime;
    private getTDDTestCases;
    private getTDDMockingStrategy;
    private getTDDAssertionPatterns;
    private generateSyntheticInput;
    private generateSyntheticOutput;
}
export { NeuralTrainingDataset, NeuralTrainingRecord, NeuralArchitectureSpec };
//# sourceMappingURL=neural-training-export-system.d.ts.map