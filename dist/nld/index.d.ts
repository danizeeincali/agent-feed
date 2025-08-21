/**
 * NLD (Neuro Learning Development) Connection Learning System
 * Main export file for all NLD components
 */
export { ConnectionFailureDetector, type ConnectionFailureContext, type NetworkConditions, type ClientInfo, type ErrorDetails, type ConnectionAttempt, type ConnectionStrategy, type RecoveryContext, type FailurePattern, type ConnectionMetrics } from './connection-failure-detector';
export { ConnectionLearningDatabase, type NLTRecord, type ConnectionLearningRecord, type NeuralFeatures, type StrategyPerformance } from './learning-database';
export { AdaptiveConnectionManager, type AdaptiveConnectionConfig, type ConnectionHealth, type ConnectionAttemptResult } from './adaptive-connection-manager';
export { NeuralConnectionTrainer, type NeuralTrainingConfig, type TrainingDataPoint, type TrainingLabels, type TrainingMetadata, type ModelPerformance, type PredictionResult } from './neural-connection-trainer';
export { ClaudeFlowIntegration, type ClaudeFlowConfig, type NeuralTrainingRequest, type TaskOrchestrationRequest } from './claude-flow-integration';
export { NLDPerformanceMonitor, type PerformanceMetric, type PerformanceThreshold, type PerformanceAlert, type PerformanceTrend, type PerformanceReport } from './performance-monitor';
export { TroubleshootingEngine, type TroubleshootingRequest, type TroubleshootingSuggestion, type TroubleshootingStep, type TroubleshootingResource, type TroubleshootingResult, type DiagnosticTest, type DiagnosticResult } from './troubleshooting-engine';
export { NLDWebSocketIntegration, createNLDWebSocketService, integrateNLDWithWebSocket, type NLDWebSocketConfig, type EnhancedWebSocketMessage } from './websocket-integration';
export declare const NLD_VERSION = "1.0.0";
export declare const DEFAULT_NLD_CONFIG: Partial<NLDWebSocketConfig>;
export declare const DEFAULT_PERFORMANCE_MONITOR_CONFIG: {
    metricsRetentionMs: number;
    monitoringIntervalMs: number;
    reportingIntervalMs: number;
    alertingEnabled: boolean;
};
export declare const DEFAULT_NEURAL_TRAINING_CONFIG: NeuralTrainingConfig;
export declare const DEFAULT_CLAUDE_FLOW_CONFIG: ClaudeFlowConfig;
/**
 * Create a complete NLD system with all components
 */
export declare function createCompleteNLDSystem(config?: {
    webSocketConfig?: Partial<NLDWebSocketConfig>;
    performanceConfig?: Partial<any>;
    neuralConfig?: Partial<NeuralTrainingConfig>;
    claudeFlowConfig?: Partial<ClaudeFlowConfig>;
}): {
    webSocketService: any;
    nldIntegration: any;
    performanceMonitor: any;
    neuralTrainer: any;
    claudeFlowIntegration: any;
    learningDatabase: any;
    troubleshootingEngine: any;
    shutdown(): Promise<void>;
    getSystemStatus(): {
        nld_integration: any;
        performance_metrics: any;
        connection_health: any;
        system_statistics: any;
    };
    exportAllData(): Promise<{
        nld_data: any;
        neural_models: any;
        performance_report: any;
        exported_at: string;
        version: string;
    }>;
};
/**
 * Quick setup function for basic NLD integration
 */
export declare function quickSetupNLD(options?: {
    enableAll?: boolean;
    learningOnly?: boolean;
    monitoringOnly?: boolean;
}): any;
/**
 * Utility function to check NLD system compatibility
 */
export declare function checkNLDCompatibility(): {
    compatible: boolean;
    issues: string[];
    recommendations: string[];
};
/**
 * Development utilities
 */
export declare const NLDDevUtils: {
    /**
     * Create mock failure context for testing
     */
    createMockFailureContext(overrides?: Partial<ConnectionFailureContext>): ConnectionFailureContext;
    /**
     * Create mock connection strategy for testing
     */
    createMockStrategy(overrides?: Partial<ConnectionStrategy>): ConnectionStrategy;
    /**
     * Simulate network conditions for testing
     */
    simulateNetworkConditions(type: "slow-2g" | "2g" | "3g" | "4g" | "wifi" | "ethernet"): NetworkConditions;
};
export declare const NLD_METADATA: {
    version: string;
    name: string;
    description: string;
    author: string;
    license: string;
    repository: string;
    documentation: string;
    components: string[];
    features: string[];
};
//# sourceMappingURL=index.d.ts.map