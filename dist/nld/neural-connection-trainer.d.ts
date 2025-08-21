/**
 * NLD Neural Connection Trainer
 * Trains neural patterns for connection failure prediction and optimization
 */
import { EventEmitter } from 'events';
import { ConnectionFailureContext, ConnectionStrategy } from './connection-failure-detector';
import { NeuralFeatures, ConnectionLearningRecord } from './learning-database';
export interface NeuralTrainingConfig {
    batchSize: number;
    learningRate: number;
    epochs: number;
    validationSplit: number;
    modelType: 'classification' | 'regression' | 'reinforcement';
    featureEngineering: boolean;
    autoTuning: boolean;
}
export interface TrainingDataPoint {
    features: NeuralFeatures;
    labels: TrainingLabels;
    metadata: TrainingMetadata;
}
export interface TrainingLabels {
    success_probability: number;
    optimal_strategy: string;
    expected_recovery_time: number;
    failure_severity: number;
    recommended_action: string;
}
export interface TrainingMetadata {
    timestamp: number;
    pattern_id: string;
    context_hash: string;
    data_quality_score: number;
}
export interface ModelPerformance {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    validation_loss: number;
    training_time: number;
    model_version: string;
}
export interface PredictionResult {
    success_probability: number;
    recommended_strategy: ConnectionStrategy;
    confidence: number;
    risk_factors: string[];
    optimization_suggestions: string[];
}
export declare class NeuralConnectionTrainer extends EventEmitter {
    private trainingData;
    private models;
    private performance;
    private config;
    private featureEngineering;
    constructor(config: NeuralTrainingConfig);
    /**
     * Add training data from learning records
     */
    addTrainingData(record: ConnectionLearningRecord): void;
    /**
     * Train neural models on accumulated data
     */
    trainModels(): Promise<void>;
    /**
     * Predict connection success and optimal strategy
     */
    predict(context: ConnectionFailureContext): Promise<PredictionResult>;
    /**
     * Export trained models for claude-flow integration
     */
    exportModels(): Promise<any>;
    /**
     * Import pre-trained models
     */
    importModels(modelData: any): Promise<void>;
    /**
     * Continuously train from live data stream
     */
    startOnlineTraining(): Promise<void>;
    /**
     * Evaluate model performance
     */
    evaluateModels(): Promise<Map<string, ModelPerformance>>;
    private initializeModels;
    private createClassificationModel;
    private createRecommendationModel;
    private createRegressionModel;
    private enhanceFeatures;
    private createLabels;
    private hashContext;
    private assessDataQuality;
    private splitData;
    private trainSuccessPredictionModel;
    private trainStrategyOptimizationModel;
    private trainFailureSeverityModel;
    private predictSuccess;
    private predictOptimalStrategy;
    private predictFailureSeverity;
    private calculateConfidence;
    private identifyRiskFactors;
    private generateOptimizationSuggestions;
    private encodeStrategy;
    private encodeSeverity;
    private encodeAction;
    private updatePerformanceMetrics;
    private evaluateModel;
    private serializeModel;
    private deserializeModel;
}
//# sourceMappingURL=neural-connection-trainer.d.ts.map