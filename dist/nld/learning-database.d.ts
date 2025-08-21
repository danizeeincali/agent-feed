/**
 * NLD Learning Database for Connection Strategies
 * Stores and retrieves patterns for continuous improvement
 */
import { EventEmitter } from 'events';
import { ConnectionFailureContext, FailurePattern, ConnectionStrategy, ConnectionMetrics } from './connection-failure-detector';
export interface NLTRecord {
    record_id: string;
    timestamp: string;
    pattern_detection_summary: {
        trigger: string;
        task_type: string;
        failure_mode: string;
        tdd_factor: string;
    };
    task_context: {
        original_task: string;
        domain: string;
        complexity: string;
        requirements: string[];
    };
    claude_solution_analysis: {
        implemented_components: string[];
        confidence_level: string;
        tdd_usage: string;
        missing_test_coverage: string[];
    };
    user_feedback: {
        reported_errors: string[];
        actual_experience: string;
        corrected_solution_needed: string;
    };
    failure_analysis: {
        root_cause: string;
        failure_category: string;
        gap_analysis: string;
        missing_components: string[];
    };
    effectiveness_metrics: {
        effectiveness_score: number;
        calculation: string;
        pattern_classification: string;
        severity: string;
    };
    recommended_tdd_patterns: {
        integration_tests: string[];
        unit_tests: string[];
        e2e_tests: string[];
    };
    prevention_strategy: {
        [key: string]: string;
    };
    neural_training_impact: {
        pattern_learned: string;
        training_data_exported: boolean;
        prediction_model_updated: boolean;
        future_prevention_probability: string;
    };
}
export interface ConnectionLearningRecord {
    id: string;
    timestamp: number;
    context: ConnectionFailureContext;
    pattern: FailurePattern;
    strategy_success: boolean;
    recovery_time?: number;
    user_satisfaction?: number;
    lessons_learned: string[];
    neural_features: NeuralFeatures;
}
export interface NeuralFeatures {
    connection_vector: number[];
    error_embedding: number[];
    network_signature: number[];
    strategy_encoding: number[];
    outcome_score: number;
}
export interface StrategyPerformance {
    strategy: ConnectionStrategy;
    success_rate: number;
    avg_recovery_time: number;
    context_applicability: string[];
    performance_trend: 'improving' | 'stable' | 'degrading';
    last_evaluated: number;
}
export declare class ConnectionLearningDatabase extends EventEmitter {
    private nltRecords;
    private learningRecords;
    private strategyPerformance;
    private knowledgeBase;
    private memorySystem;
    constructor();
    /**
     * Store connection failure pattern for learning
     */
    storeFailurePattern(context: ConnectionFailureContext, pattern: FailurePattern, userFeedback?: any): Promise<string>;
    /**
     * Store successful recovery for learning
     */
    storeSuccessfulRecovery(recordId: string, strategy: ConnectionStrategy, recoveryTime: number, userSatisfaction?: number): Promise<void>;
    /**
     * Get optimal strategy based on learned patterns
     */
    getOptimalStrategy(context: Partial<ConnectionFailureContext>): Promise<ConnectionStrategy>;
    /**
     * Get intelligent recommendations based on historical data
     */
    getRecommendations(context: ConnectionFailureContext): Promise<string[]>;
    /**
     * Get performance analytics
     */
    getPerformanceAnalytics(): ConnectionMetrics & {
        totalRecords: number;
        successRate: number;
        avgRecoveryTime: number;
        topStrategies: StrategyPerformance[];
        improvementTrends: any[];
    };
    /**
     * Export neural training data
     */
    exportNeuralTrainingData(): Promise<any>;
    private initializeDatabase;
    private loadExistingRecords;
    private generateRecordId;
    private assessTDDFactor;
    private assessComplexity;
    private extractRequirements;
    private getImplementedComponents;
    private identifyMissingCoverage;
    private generateCorrectionNeeded;
    private analyzeRootCause;
    private categorizeFailure;
    private performGapAnalysis;
    private identifyMissingComponents;
    private calculateEffectivenessScore;
    private recommendIntegrationTests;
    private recommendUnitTests;
    private recommendE2ETests;
    private generatePreventionStrategy;
    private calculatePreventionProbability;
    private extractLessonsLearned;
    private extractNeuralFeatures;
    private encodeConnectionType;
    private findSimilarPatterns;
    private getBestStrategies;
    private selectOptimalStrategy;
    private getDefaultAdaptiveStrategy;
    private findSimilarLearningRecords;
    private getStrategyRecommendations;
    private getNeuralRecommendations;
    private updateStrategyPerformance;
}
//# sourceMappingURL=learning-database.d.ts.map