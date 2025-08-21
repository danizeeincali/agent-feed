/**
 * NLD WebSocket Integration
 * Integrates NLD connection learning with existing WebSocket systems
 */
import { EventEmitter } from 'events';
import { WebSocketService } from '../../frontend/src/services/websocket';
import { ConnectionFailureContext } from './connection-failure-detector';
export interface NLDWebSocketConfig {
    enableLearning: boolean;
    enableAdaptiveRetry: boolean;
    enablePerformanceMonitoring: boolean;
    enableTroubleshooting: boolean;
    fallbackTransports: string[];
    circuitBreakerThreshold: number;
    neuralTrainingEnabled: boolean;
}
export interface EnhancedWebSocketMessage {
    type: string;
    data: any;
    timestamp: string;
    nld_metadata?: {
        connection_attempt: number;
        strategy_used: string;
        learning_applied: boolean;
        performance_metrics: any;
    };
}
export declare class NLDWebSocketIntegration extends EventEmitter {
    private originalWebSocketService;
    private failureDetector;
    private adaptiveManager;
    private claudeFlowIntegration;
    private performanceMonitor;
    private troubleshootingEngine;
    private config;
    private connectionAttempts;
    private lastConnectionContext;
    constructor(webSocketService: WebSocketService, config: NLDWebSocketConfig);
    /**
     * Initialize NLD components
     */
    private initializeNLDComponents;
    /**
     * Enhance the existing WebSocket service with NLD capabilities
     */
    private enhanceWebSocketService;
    /**
     * Set up event handlers for NLD components
     */
    private setupEventHandlers;
    /**
     * Get real-time connection metrics
     */
    getRealtimeMetrics(): any;
    /**
     * Get connection health status
     */
    getConnectionHealth(): any;
    /**
     * Generate troubleshooting suggestions for current issues
     */
    generateTroubleshootingSuggestions(context?: ConnectionFailureContext): Promise<any>;
    /**
     * Train neural patterns from recent connection data
     */
    trainNeuralPatterns(): Promise<void>;
    /**
     * Export NLD data for analysis
     */
    exportNLDData(): Promise<any>;
    /**
     * Update NLD configuration
     */
    updateConfig(newConfig: Partial<NLDWebSocketConfig>): void;
    /**
     * Get WebSocket integration statistics
     */
    getStatistics(): any;
    /**
     * Shutdown NLD integration
     */
    shutdown(): Promise<void>;
    private recordConnectionSuccess;
    private handleConnectionFailure;
    private classifyError;
    private generateConnectionId;
}
/**
 * Factory function to create enhanced WebSocket service with NLD integration
 */
export declare function createNLDWebSocketService(config?: Partial<NLDWebSocketConfig>): {
    service: WebSocketService;
    nldIntegration: NLDWebSocketIntegration;
};
/**
 * Utility function to integrate NLD with existing WebSocket service
 */
export declare function integrateNLDWithWebSocket(existingService: WebSocketService, config?: Partial<NLDWebSocketConfig>): Promise<NLDWebSocketIntegration>;
//# sourceMappingURL=websocket-integration.d.ts.map