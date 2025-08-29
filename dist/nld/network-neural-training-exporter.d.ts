/**
 * Network Neural Training Dataset Exporter - NLD System
 *
 * Exports comprehensive network failure patterns and communication
 * data for claude-flow neural network training and pattern learning.
 */
import { NetworkFailurePattern } from './network-failure-pattern-detector';
import { CORSPattern, TimeoutPattern } from './network-cors-timeout-detector';
import { EndpointMismatch } from './api-endpoint-mismatch-analyzer';
import { CommunicationPattern } from './frontend-backend-communication-analyzer';
export interface NeuralTrainingDataset {
    metadata: {
        version: string;
        timestamp: number;
        sessionId: string;
        totalPatterns: number;
        confidenceScore: number;
    };
    patterns: {
        networkFailures: NetworkFailurePattern[];
        corsIssues: CORSPattern[];
        timeouts: TimeoutPattern[];
        endpointMismatches: EndpointMismatch[];
        communicationPatterns: CommunicationPattern[];
    };
    features: {
        errorFrequencies: Record<string, number>;
        severityDistribution: Record<string, number>;
        temporalPatterns: Array<{
            hour: number;
            errorCount: number;
            errorTypes: string[];
        }>;
        endpointHealth: Record<string, {
            successRate: number;
            avgLatency: number;
            errorTypes: string[];
        }>;
        correlations: Array<{
            pattern1: string;
            pattern2: string;
            correlation: number;
        }>;
    };
    prevention: {
        tddCoverage: number;
        preventablePatterns: number;
        testGaps: string[];
        recommendedTests: string[];
        mockingStrategies: string[];
    };
    neuralWeights: {
        patternRecognition: Record<string, number>;
        severityClassification: Record<string, number>;
        preventionEffectiveness: Record<string, number>;
        temporalFactors: Record<string, number>;
    };
}
export interface ExportOptions {
    includeRawData: boolean;
    includePersonalData: boolean;
    timeWindow: number;
    minConfidenceScore: number;
    formatType: 'CLAUDE_FLOW' | 'STANDARD' | 'RESEARCH';
    compressionLevel: 'none' | 'basic' | 'high';
}
export declare class NetworkNeuralTrainingExporter {
    private sessionId;
    private exportHistory;
    private confidenceCalculator;
    constructor();
    exportTrainingDataset(options?: Partial<ExportOptions>): Promise<NeuralTrainingDataset>;
    private collectRawData;
    private processData;
    private generateFeatures;
    private calculateErrorFrequencies;
    private calculateSeverityDistribution;
    private calculateTemporalPatterns;
    private calculateEndpointHealth;
    private calculateCorrelations;
    private calculateTimeBasedCorrelation;
    private generatePreventionData;
    private calculateNeuralWeights;
    private calculatePatternWeight;
    private calculateSeverityWeights;
    private calculatePreventionWeights;
    private calculateTemporalWeights;
    private countTotalPatterns;
    private formatDataset;
    private formatForClaudeFlow;
    private compressDataset;
    private sanitizeNetworkFailures;
    private sanitizeCORSPatterns;
    private sanitizeEndpointMismatches;
    private sanitizeCommunicationPatterns;
    private sanitizeURL;
    private enrichNetworkFailures;
    private enrichCORSPatterns;
    private enrichTimeoutPatterns;
    private calculatePatternClustering;
    private assessBrowserCompatibility;
    private assessNetworkImpact;
    private recordExport;
    exportForClaudeFlow(): Promise<any>;
    getExportHistory(): any[];
    getExportMetrics(): any;
    private calculateExportTrend;
}
//# sourceMappingURL=network-neural-training-exporter.d.ts.map