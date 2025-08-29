/**
 * Neural Training Export System for Process I/O Patterns
 * Exports failure patterns and prevention strategies for claude-flow neural training
 * Generated: 2025-08-27
 */
import { StdoutCaptureMetrics } from './stdout-capture-failure-monitor';
export interface NeuralTrainingPattern {
    patternId: string;
    patternType: 'failure' | 'prevention' | 'success';
    domain: 'process-io' | 'sse-streaming' | 'terminal-integration';
    complexity: 'simple' | 'medium' | 'complex';
    confidence: number;
    trainingData: {
        inputs: Record<string, any>;
        expectedOutputs: Record<string, any>;
        contextFeatures: string[];
    };
    metadata: {
        severity: string;
        frequency: number;
        lastSeen: string;
        preventionStrategy?: string;
    };
}
export interface ClaudeFlowNeuralExport {
    exportId: string;
    timestamp: string;
    version: string;
    domain: 'process-io-capture';
    totalPatterns: number;
    patterns: NeuralTrainingPattern[];
    trainingRecommendations: string[];
    successMetrics: {
        preventedFailures: number;
        improvementScore: number;
        tddCoverage: number;
    };
}
export declare class NeuralTrainingProcessIOPatterns {
    private antiPatternsDB;
    private preventionStrategies;
    private exportHistory;
    constructor();
    generateNeuralExport(instanceMetrics?: Map<string, StdoutCaptureMetrics>): ClaudeFlowNeuralExport;
    private convertFailurePatternsToNeural;
    private convertPreventionPatternsToNeural;
    private generateSuccessPatterns;
    private determineComplexity;
    private calculateConfidence;
    private mapToDomain;
    private mapTestComplexity;
    private estimateFrequency;
    private calculateOutputLatency;
    private generateTrainingRecommendations;
    private calculateSuccessMetrics;
    exportToClaudeFlow(neuralExport: ClaudeFlowNeuralExport): void;
    private saveNeuralExport;
    getExportHistory(): ClaudeFlowNeuralExport[];
    generateClaudeFlowIntegration(): string;
}
export declare const neuralTrainingProcessIO: NeuralTrainingProcessIOPatterns;
//# sourceMappingURL=neural-training-process-io-patterns.d.ts.map