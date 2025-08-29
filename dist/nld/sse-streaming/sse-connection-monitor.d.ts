/**
 * SSE Connection Monitor - NLD Pattern Detection System
 * Detects and prevents SSE connection duplication and cascade failures
 */
export interface SSEConnectionState {
    endpoint: string;
    connectionId: string;
    eventSource: EventSource | null;
    lastActivity: number;
    messageCount: number;
    status: 'connecting' | 'connected' | 'disconnected' | 'error';
    duplicateConnections: number;
    memoryLeakRisk: boolean;
}
export interface SSEFailurePattern {
    patternId: string;
    patternType: 'SSE_CONNECTION_DUPLICATION' | 'CASCADE_FAILURE' | 'MEMORY_LEAK' | 'CONNECTION_STORM';
    endpoint: string;
    detectedAt: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: {
        duplicateCount: number;
        rapidReconnections: number;
        unclosedConnections: number;
        memoryUsage: number;
    };
    preventionAction: string;
}
declare class SSEConnectionMonitor {
    private connections;
    private failurePatterns;
    private connectionHistory;
    private cleanupTimers;
    private readonly DUPLICATE_THRESHOLD;
    private readonly RECONNECTION_STORM_THRESHOLD;
    private readonly CONNECTION_TIMEOUT;
    private readonly MEMORY_LEAK_THRESHOLD;
    /**
     * Monitor SSE connection creation and detect duplicates
     */
    monitorConnection(endpoint: string, eventSource: EventSource): string;
    /**
     * Detect SSE connection duplication pattern
     */
    private detectDuplicateConnection;
    /**
     * Clean up duplicate connections automatically
     */
    private cleanupDuplicateConnections;
    /**
     * Monitor for connection cascade failures
     */
    private detectCascadeFailure;
    /**
     * Attach event listeners to monitor connection health
     */
    private attachEventListeners;
    /**
     * Monitor individual connection health
     */
    private monitorConnectionHealth;
    /**
     * Detect stale connection pattern
     */
    private detectStaleConnection;
    /**
     * Close SSE connection with cleanup
     */
    closeConnection(connectionId: string, reason: string): void;
    /**
     * Get rapid reconnection count for endpoint
     */
    private getRapidReconnectionCount;
    /**
     * Track connection history for pattern analysis
     */
    private trackConnectionHistory;
    /**
     * Setup connection timeout monitoring
     */
    private setupConnectionTimeout;
    /**
     * Validate message integrity
     */
    private validateMessageIntegrity;
    /**
     * Detect connection error patterns
     */
    private detectConnectionError;
    /**
     * Schedule reconnection with backoff
     */
    private scheduleReconnection;
    /**
     * Activate circuit breaker for endpoint
     */
    private activateCircuitBreaker;
    /**
     * Handle connection close event
     */
    private handleConnectionClose;
    /**
     * Detect memory leak patterns
     */
    private detectMemoryLeak;
    /**
     * Get unclosed connection count
     */
    private getUnclosedConnectionCount;
    /**
     * Estimate memory usage for connections
     */
    private estimateMemoryUsage;
    /**
     * Generate unique connection ID
     */
    private generateConnectionId;
    /**
     * Export neural training data for pattern learning
     */
    private exportNeuralTrainingData;
    /**
     * Get connection status summary
     */
    getConnectionStatus(): {
        totalConnections: number;
        activeConnections: number;
        failurePatterns: SSEFailurePattern[];
        memoryUsage: number;
    };
    /**
     * Cleanup all connections
     */
    cleanup(): void;
}
export default SSEConnectionMonitor;
//# sourceMappingURL=sse-connection-monitor.d.ts.map