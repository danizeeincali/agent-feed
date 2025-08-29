/**
 * SSE Neural Training Export System
 * Exports SSE buffer accumulation patterns for neural network training
 * Part of NLD (Neuro-Learning Development) system
 */
import { EventEmitter } from 'events';
import SSEBufferAccumulationDetector from './sse-buffer-accumulation-detector';
import SSEEventHandlerDuplicationAnalyzer from './sse-event-handler-duplication-analyzer';
import OutputBufferManagementFailurePatterns from './output-buffer-management-failure-patterns';
import FrontendMessageStateAccumulationDetector from './frontend-message-state-accumulation-detector';
interface NeuralTrainingDataset {
    datasetId: string;
    name: string;
    description: string;
    version: string;
    createdAt: string;
    samples: NeuralTrainingSample[];
    metadata: {
        totalSamples: number;
        positiveExamples: number;
        negativeExamples: number;
        features: string[];
        labels: string[];
    };
}
interface NeuralTrainingSample {
    sampleId: string;
    features: {
        messageCount: number;
        repetitionCount: number;
        timeSpan: number;
        bufferSize: number;
        connectionCount: number;
        outputPosition: number;
        parserState: string;
        instanceType: string;
        severity: number;
        antiPattern: string;
    };
    label: {
        isAntiPattern: boolean;
        severity: 'low' | 'medium' | 'high' | 'critical';
        antiPatternType: string;
        preventable: boolean;
        rootCause: string;
    };
    contextualData: {
        originalPattern: any;
        timestamp: string;
        environment: string;
    };
}
interface NeuralModelConfig {
    modelType: 'classification' | 'regression' | 'anomaly_detection';
    architecture: 'feedforward' | 'lstm' | 'transformer';
    inputFeatures: string[];
    outputClasses: string[];
    trainingParams: {
        batchSize: number;
        epochs: number;
        learningRate: number;
        validationSplit: number;
    };
}
export declare class SSENeuralTrainingExport extends EventEmitter {
    private exportDir;
    private datasets;
    private bufferDetector;
    private handlerAnalyzer;
    private bufferFailureAnalyzer;
    private frontendDetector;
    constructor(exportDir: string, bufferDetector: SSEBufferAccumulationDetector, handlerAnalyzer: SSEEventHandlerDuplicationAnalyzer, bufferFailureAnalyzer: OutputBufferManagementFailurePatterns, frontendDetector: FrontendMessageStateAccumulationDetector);
    /**
     * Export SSE Buffer Replay Loop patterns for neural training
     */
    exportSSEBufferReplayLoopPatterns(): NeuralTrainingDataset;
    /**
     * Export output position tracking failure patterns
     */
    exportOutputPositionTrackingFailures(): NeuralTrainingDataset;
    /**
     * Export frontend message accumulation patterns
     */
    exportFrontendMessageAccumulationPatterns(): NeuralTrainingDataset;
    /**
     * Export ClaudeOutputParser buffer processing failure patterns
     */
    exportClaudeOutputParserFailures(): NeuralTrainingDataset;
    /**
     * Generate comprehensive combined dataset for multi-pattern detection
     */
    generateCombinedAntiPatternDataset(): NeuralTrainingDataset;
    /**
     * Generate negative examples (normal behavior) for training
     */
    private generateNegativeExamples;
    /**
     * Normalize severity to 0-1 range for neural network training
     */
    private normalizeSeverity;
    /**
     * Generate neural network model configuration
     */
    generateModelConfig(datasetId: string): NeuralModelConfig;
    /**
     * Export dataset in TensorFlow.js format
     */
    exportToTensorFlowJS(datasetId: string): void;
    /**
     * Export dataset in PyTorch format
     */
    exportToPyTorch(datasetId: string): void;
    /**
     * Generate training script for the dataset
     */
    generateTrainingScript(datasetId: string, framework: 'tensorflow' | 'pytorch'): string;
    /**
     * Ensure export directory exists
     */
    private ensureExportDirectory;
    /**
     * Persist dataset to storage
     */
    private persistDataset;
    /**
     * Get all datasets
     */
    getAllDatasets(): NeuralTrainingDataset[];
    /**
     * Get dataset statistics
     */
    getDatasetStatistics(): {
        totalDatasets: number;
        totalSamples: number;
        totalPositiveExamples: number;
        totalNegativeExamples: number;
        antiPatternBreakdown: {
            [key: string]: number;
        };
    };
    /**
     * Generate comprehensive neural training report
     */
    generateNeuralTrainingReport(): string;
}
export default SSENeuralTrainingExport;
//# sourceMappingURL=sse-neural-training-export.d.ts.map