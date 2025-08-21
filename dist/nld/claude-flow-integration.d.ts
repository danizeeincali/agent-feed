/**
 * Claude-Flow Neural Integration for NLD Connection Learning
 * Integrates NLD connection patterns with claude-flow neural system
 */
import { EventEmitter } from 'events';
export interface ClaudeFlowConfig {
    mcpServerUrl: string;
    neuralTrainingEnabled: boolean;
    memoryNamespace: string;
    taskOrchestrationEnabled: boolean;
    performanceTrackingEnabled: boolean;
}
export interface NeuralTrainingRequest {
    pattern_type: 'connection' | 'optimization' | 'prediction';
    training_data: any;
    epochs?: number;
    metadata?: any;
}
export interface TaskOrchestrationRequest {
    task: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    strategy: 'parallel' | 'sequential' | 'adaptive' | 'balanced';
    dependencies?: string[];
}
export declare class ClaudeFlowIntegration extends EventEmitter {
    private failureDetector;
    private learningDatabase;
    private neuralTrainer;
    private adaptiveManager;
    private config;
    private memoryKeys;
    constructor(config: ClaudeFlowConfig);
    /**
     * Initialize NLD components with claude-flow integration
     */
    private initializeComponents;
    /**
     * Set up event handlers and data flow between components
     */
    private setupIntegration;
    /**
     * Store data in claude-flow memory system
     */
    storeInClaudeFlowMemory(key: string, data: any, ttl?: number): Promise<void>;
    /**
     * Retrieve data from claude-flow memory system
     */
    retrieveFromClaudeFlowMemory(key: string): Promise<any>;
    /**
     * Train claude-flow neural patterns
     */
    trainClaudeFlowNeuralPatterns(trainingData: any): Promise<void>;
    /**
     * Orchestrate neural training tasks
     */
    orchestrateNeuralTraining(data: any): Promise<void>;
    /**
     * Track performance metrics in claude-flow system
     */
    trackPerformanceMetrics(type: string, data: any): void;
    /**
     * Analyze neural patterns for connection optimization
     */
    analyzeNeuralPatterns(): Promise<any>;
    /**
     * Generate optimization recommendations based on analytics
     */
    private generateOptimizationRecommendations;
    /**
     * Export comprehensive NLD data for claude-flow
     */
    exportNLDData(): Promise<any>;
    /**
     * Import NLD data from claude-flow
     */
    importNLDData(data: any): Promise<void>;
    /**
     * Get real-time NLD status for claude-flow dashboard
     */
    getNLDStatus(): any;
    /**
     * Handle MCP responses and events
     */
    handleMCPResponse(type: string, data: any): void;
    /**
     * Shutdown and cleanup
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=claude-flow-integration.d.ts.map