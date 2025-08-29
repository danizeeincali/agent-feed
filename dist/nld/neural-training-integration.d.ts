/**
 * Neural Training Integration for Terminal Pipe Failures
 *
 * Integrates NLD terminal pipe failure detection with claude-flow neural training system
 * Exports training data, patterns, and effectiveness metrics for ML model improvement
 * Enables predictive failure detection based on historical patterns
 */
import { EventEmitter } from 'events';
interface NeuralTrainingData {
    pattern_type: 'terminal_pipe_failure';
    session_id: string;
    timestamp: string;
    features: {
        has_real_process: boolean;
        process_pid_exists: boolean;
        stdout_handler_attached: boolean;
        stderr_handler_attached: boolean;
        output_contains_mock_patterns: boolean;
        output_length_variance: number;
        contains_process_indicators: boolean;
        working_directory_correct: boolean;
        sse_events_sent: number;
        sse_events_received: number;
        sse_delivery_ratio: number;
        connection_count: number;
        connection_drops: number;
        response_latency: number;
        event_flow_gaps: number;
        connection_duration: number;
    };
    labels: {
        failure_occurred: boolean;
        failure_type: string;
        severity: string;
        tdd_factor: number;
        prevention_possible: boolean;
    };
    effectiveness_score: number;
    context: {
        instance_type: string;
        command_executed: string;
        user_interaction: string;
        environment: string;
    };
}
interface NeuralModelPrediction {
    failure_probability: number;
    predicted_failure_type: string;
    confidence: number;
    preventive_actions: string[];
    tdd_recommendations: string[];
}
export declare class NeuralTrainingIntegration extends EventEmitter {
    private options;
    private trainingData;
    private predictionCache;
    private modelMetrics;
    constructor(options?: {
        logDirectory: string;
        neuralExportPath: string;
        claudeFlowIntegration: boolean;
        batchSize: number;
        exportInterval: number;
        enablePrediction: boolean;
    });
    private ensureDirectories;
    /**
     * Record training data from terminal pipe failure detection
     */
    recordFailurePattern(sessionId: string, failureData: {
        type: string;
        severity: string;
        instanceId: string;
        realProcessData?: any;
        frontendData?: any;
        sseEventData?: any;
        tddfactor: number;
        evidenceScore: number;
    }, context: {
        instanceType: string;
        command?: string;
        userInteraction?: string;
    }): void;
    /**
     * Record successful prevention (no failure occurred)
     */
    recordSuccessfulPrevention(sessionId: string, preventionData: {
        instanceId: string;
        tddfactor: number;
        preventionStrategy: string;
    }, context: {
        instanceType: string;
        command?: string;
    }): void;
    /**
     * Extract features from failure data
     */
    private extractFeatures;
    /**
     * Extract features for successful prevention
     */
    private extractPreventionFeatures;
    /**
     * Helper methods for feature extraction
     */
    private containsMockPatterns;
    private containsProcessIndicators;
    private isWorkingDirectoryCorrect;
    private calculateOutputVariance;
    private calculateDeliveryRatio;
    private estimateResponseLatency;
    /**
     * Export training data for claude-flow neural training
     */
    private exportForClaudeFlow;
    /**
     * Predict failure probability using trained model (placeholder for now)
     */
    predictFailure(features: Partial<NeuralTrainingData['features']>): Promise<NeuralModelPrediction>;
    /**
     * Update model metrics based on prediction accuracy
     */
    updateModelMetrics(prediction: NeuralModelPrediction, actualOutcome: {
        failure_occurred: boolean;
        failure_type: string;
    }): void;
    /**
     * Start periodic export of training data
     */
    private startPeriodicExport;
    /**
     * Get training statistics
     */
    getTrainingStats(): {
        totalSamples: number;
        failureSamples: number;
        successSamples: number;
        averageTDDFactor: number;
        byFailureType: Record<string, number>;
        modelMetrics: typeof this.modelMetrics;
        recentPredictions: number;
    };
    /**
     * Export comprehensive dataset for external ML training
     */
    exportCompleteDataset(): string;
    /**
     * Clear training data (for memory management)
     */
    clearTrainingData(): void;
    /**
     * Get prediction cache statistics
     */
    getPredictionCacheStats(): {
        size: number;
        hitRate: number;
        averageConfidence: number;
    };
}
export {};
//# sourceMappingURL=neural-training-integration.d.ts.map