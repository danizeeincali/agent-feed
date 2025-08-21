/**
 * NLD Adaptive Connection Manager
 * Implements intelligent connection strategies based on learned patterns
 */
import { EventEmitter } from 'events';
import { ConnectionStrategy } from './connection-failure-detector';
export interface AdaptiveConnectionConfig {
    endpoints: string[];
    protocols: ('websocket' | 'sse' | 'polling' | 'http')[];
    fallbackChain: string[];
    learningEnabled: boolean;
    neuralModeEnabled: boolean;
    circuitBreakerEnabled: boolean;
}
export interface ConnectionHealth {
    isHealthy: boolean;
    latency: number;
    successRate: number;
    lastSuccess: number;
    failureCount: number;
    circuitState: 'closed' | 'open' | 'half-open';
}
export interface ConnectionAttemptResult {
    success: boolean;
    duration: number;
    error?: any;
    strategy: ConnectionStrategy;
    fallbacksUsed: string[];
    learningApplied: boolean;
}
export declare class AdaptiveConnectionManager extends EventEmitter {
    private failureDetector;
    private learningDatabase;
    private activeConnections;
    private connectionHealth;
    private circuitBreakers;
    private config;
    constructor(config: AdaptiveConnectionConfig);
    /**
     * Establish connection with adaptive strategy
     */
    connect(endpoint: string, options?: any): Promise<ConnectionAttemptResult>;
    /**
     * Get connection health status
     */
    getConnectionHealth(endpoint: string): ConnectionHealth;
    /**
     * Get intelligent troubleshooting suggestions
     */
    getTroubleshootingSuggestions(endpoint: string, error?: any): Promise<string[]>;
    /**
     * Get performance analytics
     */
    getPerformanceAnalytics(): any;
    /**
     * Train neural patterns from recent data
     */
    trainNeuralPatterns(): Promise<void>;
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<AdaptiveConnectionConfig>): void;
    private getOptimalStrategy;
    private attemptConnectionWithStrategy;
    private attemptFallback;
    private establishConnection;
    private establishWebSocketConnection;
    private establishSSEConnection;
    private establishPollingConnection;
    private establishHttpConnection;
    private establishFallbackConnection;
    private calculateDelay;
    private fibonacci;
    private sleep;
    private recordSuccess;
    private recordFailure;
    private buildConnectionContext;
    private buildFailureContext;
    private determineConnectionType;
    private getNetworkConditions;
    private getClientInfo;
    private classifyError;
    private createDefaultHealth;
    private getDefaultStrategy;
    private generateConnectionId;
    private setupEventHandlers;
    private initializeCircuitBreakers;
}
//# sourceMappingURL=adaptive-connection-manager.d.ts.map