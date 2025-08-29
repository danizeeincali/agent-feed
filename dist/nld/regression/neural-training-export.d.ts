/**
 * Neural Training Export System - ML Model Training Data Generation
 *
 * Exports comprehensive training datasets for machine learning models
 * to improve Claude process regression detection and prevention.
 */
export interface NeuralTrainingDataset {
    metadata: DatasetMetadata;
    features: FeatureDefinition[];
    trainingData: TrainingRecord[];
    validationData: ValidationRecord[];
    testData: TestRecord[];
    labelDefinitions: LabelDefinition[];
    modelConfiguration: ModelConfiguration;
}
export interface DatasetMetadata {
    id: string;
    name: string;
    version: string;
    description: string;
    createdAt: Date;
    author: string;
    dataSource: string;
    recordCount: number;
    featureCount: number;
    labelCount: number;
    qualityScore: number;
}
export interface FeatureDefinition {
    id: string;
    name: string;
    description: string;
    dataType: 'numeric' | 'categorical' | 'binary' | 'text' | 'temporal';
    range?: [number, number];
    categories?: string[];
    importance: number;
    engineeringMethod: string;
}
export interface TrainingRecord {
    id: string;
    features: number[];
    labels: string[];
    weight: number;
    confidence: number;
    source: string;
    timestamp: Date;
    metadata: Record<string, any>;
}
export interface ValidationRecord extends TrainingRecord {
    expectedOutcome: string;
    actualOutcome?: string;
    validationScore?: number;
}
export interface TestRecord extends TrainingRecord {
    testScenario: string;
    expectedPrediction: string;
    difficulty: 'easy' | 'medium' | 'hard' | 'expert';
}
export interface LabelDefinition {
    id: string;
    name: string;
    description: string;
    type: 'classification' | 'regression' | 'multilabel';
    classes?: string[];
    range?: [number, number];
    priority: number;
}
export interface ModelConfiguration {
    modelType: 'classification' | 'regression' | 'ensemble';
    architecture: string;
    hyperparameters: Record<string, any>;
    trainingStrategy: string;
    evaluationMetrics: string[];
    deploymentTarget: string;
}
export interface ExportConfiguration {
    includeHistoricalData: boolean;
    includeFailureScenarios: boolean;
    includeBaselineData: boolean;
    includeMonitoringMetrics: boolean;
    featureEngineering: FeatureEngineeringConfig;
    outputFormat: 'json' | 'csv' | 'parquet' | 'tfrecord';
    compressionLevel: number;
}
export interface FeatureEngineeringConfig {
    normalizeNumericFeatures: boolean;
    oneHotEncodeCategorical: boolean;
    extractTemporalFeatures: boolean;
    createInteractionFeatures: boolean;
    applyDimensionalityReduction: boolean;
}
export declare class NeuralTrainingExport {
    private exportHistory;
    private featureDefinitions;
    private labelDefinitions;
    constructor();
    /**
     * Initialize comprehensive feature definitions
     */
    private initializeFeatureDefinitions;
    /**
     * Initialize label definitions
     */
    private initializeLabelDefinitions;
    /**
     * Export comprehensive neural training dataset
     */
    exportTrainingDataset(config?: Partial<ExportConfiguration>): Promise<NeuralTrainingDataset>;
    /**
     * Generate dataset metadata
     */
    private generateMetadata;
    /**
     * Generate training data from various sources
     */
    private generateTrainingData;
    /**
     * Generate validation data
     */
    private generateValidationData;
    /**
     * Generate test data for model evaluation
     */
    private generateTestData;
    /**
     * Convert failure scenario to training records
     */
    private convertFailureScenarioToTrainingRecords;
    /**
     * Convert baseline to training records
     */
    private convertBaselineToTrainingRecords;
    /**
     * Convert monitoring data to training records
     */
    private convertMonitoringDataToTrainingRecords;
    /**
     * Convert historical events to training records
     */
    private convertHistoricalEventsToTrainingRecords;
    /**
     * Generate synthetic training data for edge cases
     */
    private generateSyntheticTrainingData;
    /**
     * Generate test records for specific difficulty level
     */
    private generateTestRecordsForDifficulty;
    /**
     * Apply feature engineering transformations
     */
    private applyFeatureEngineering;
    /**
     * Generate model configuration
     */
    private generateModelConfiguration;
    private calculateRecordWeight;
    private adjustFeaturesForOccurrence;
    private extractFeaturesFromMetrics;
    private extractLabelsFromMetrics;
    private extractFeaturesFromAlert;
    private getTestCasesForDifficulty;
    private normalizeNumericFeatures;
    private oneHotEncodeCategorical;
    private extractTemporalFeatures;
    private createInteractionFeatures;
    private calculateDataQualityScore;
    /**
     * Get export status
     */
    getExportStatus(): any;
    /**
     * Export to specific format
     */
    exportToFormat(dataset: NeuralTrainingDataset, format: 'json' | 'csv' | 'parquet'): Promise<string>;
    private convertToCSV;
}
export declare const neuralTrainingExport: NeuralTrainingExport;
//# sourceMappingURL=neural-training-export.d.ts.map