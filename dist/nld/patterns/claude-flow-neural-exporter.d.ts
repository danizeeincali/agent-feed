/**
 * Claude Flow Neural Exporter
 * NLD Integration Module for exporting React Hook patterns to claude-flow neural system
 *
 * Exports training data in claude-flow compatible format for neural pattern learning
 */
export interface ClaudeFlowNeuralExportConfig {
    outputDirectory: string;
    exportFormat: 'json' | 'csv' | 'binary';
    includeMetadata: boolean;
    compressOutput: boolean;
    batchSize: number;
    maxFileSize: number;
}
export interface NeuralPatternExport {
    version: string;
    exportTime: Date;
    patternType: 'react-hook-side-effect';
    trainingData: any;
    metadata: {
        totalPatterns: number;
        severityDistribution: Record<string, number>;
        preventionStrategies: any[];
        qualityMetrics: {
            dataBalance: number;
            featureCoverage: number;
            labelConsistency: number;
        };
    };
    claudeFlowConfig: {
        neuralNetworkType: 'classification' | 'regression' | 'sequence';
        inputDimensions: number;
        outputDimensions: number;
        recommendedArchitecture: string[];
        trainingParameters: Record<string, any>;
    };
}
export declare class ClaudeFlowNeuralExporter {
    private config;
    constructor(config?: Partial<ClaudeFlowNeuralExportConfig>);
    /**
     * Ensure output directory exists
     */
    private ensureOutputDirectory;
    /**
     * Export React Hook patterns for claude-flow neural system
     */
    exportReactHookPatterns(): Promise<string[]>;
    /**
     * Create neural pattern export structure
     */
    private createNeuralPatternExport;
    /**
     * Export as JSON for claude-flow neural system
     */
    private exportAsJSON;
    /**
     * Export training data as CSV
     */
    private exportAsCSV;
    /**
     * Export neural network configuration for claude-flow
     */
    private exportNeuralConfig;
    /**
     * Export pattern analysis summary
     */
    private exportPatternSummary;
    /**
     * Calculate data balance metric
     */
    private calculateDataBalance;
    /**
     * Calculate feature coverage metric
     */
    private calculateFeatureCoverage;
    /**
     * Calculate label consistency metric
     */
    private calculateLabelConsistency;
    /**
     * Get export statistics
     */
    getExportStatistics(): {
        totalPatterns: number;
        lastExportTime: Date | null;
        exportDirectory: string;
    };
}
/**
 * Global exporter instance
 */
export declare const claudeFlowNeuralExporter: ClaudeFlowNeuralExporter;
//# sourceMappingURL=claude-flow-neural-exporter.d.ts.map