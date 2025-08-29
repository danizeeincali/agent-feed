/**
 * Connection Lifecycle Tracker - NLD Pattern Detection System
 * Prevents SSE connection cascade failures and manages connection lifecycle
 */
export interface ConnectionLifecycleEvent {
    eventId: string;
    connectionId: string;
    eventType: 'CREATED' | 'CONNECTING' | 'CONNECTED' | 'MESSAGE_RECEIVED' | 'ERROR' | 'DISCONNECTED' | 'CLOSED' | 'TIMEOUT';
    timestamp: number;
    details: {
        endpoint?: string;
        errorCode?: string;
        errorMessage?: string;
        messageCount?: number;
        duration?: number;
        retryAttempt?: number;
    };
}
export interface ConnectionCascadeFailure {
    failureId: string;
    failureType: 'SSE_CONNECTION_CASCADE_FAILURE' | 'RAPID_RECONNECTION_STORM' | 'CIRCUIT_BREAKER_TRIGGERED' | 'CONNECTION_POOL_EXHAUSTION';
    affectedEndpoint: string;
    cascadeStartTime: number;
    detectedAt: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    impactMetrics: {
        affectedConnections: number;
        failedConnections: number;
        reconnectionAttempts: number;
        errorRate: number;
        cascadeDuration: number;
    };
    rootCause: {
        triggerId: string;
        triggerType: string;
        triggerTimestamp: number;
    };
}
export interface ConnectionHealth {
    connectionId: string;
    endpoint: string;
    status: 'healthy' | 'degraded' | 'failing' | 'circuit_broken';
    uptime: number;
    errorCount: number;
    reconnectionCount: number;
    lastError?: string;
    lastErrorTime?: number;
    messageRate: number;
    healthScore: number;
}
export interface CircuitBreakerState {
    endpoint: string;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
    lastFailureTime: number;
    nextAttemptTime: number;
    successCount: number;
    openTime?: number;
}
declare class ConnectionLifecycleTracker {
    private connections;
    private lifecycleEvents;
    private cascadeFailures;
    private circuitBreakers;
    private readonly FAILURE_THRESHOLD;
    private readonly SUCCESS_THRESHOLD;
    private readonly CIRCUIT_OPEN_DURATION;
    private readonly CASCADE_DETECTION_WINDOW;
    private readonly RAPID_RECONNECTION_THRESHOLD;
    private readonly ERROR_RATE_THRESHOLD;
    private readonly HEALTH_CHECK_INTERVAL;
    constructor();
    /**
     * Track connection creation
     */
    trackConnectionCreated(connectionId: string, endpoint: string): void;
    /**
     * Track connection state changes
     */
    trackConnectionEvent(connectionId: string, eventType: ConnectionLifecycleEvent['eventType'], details?: ConnectionLifecycleEvent['details']): void;
    /**
     * Record lifecycle event
     */
    private recordEvent;
    /**
     * Update connection health based on events
     */
    private updateConnectionHealth;
    /**
     * Initialize circuit breaker for endpoint
     */
    private initializeCircuitBreaker;
    /**
     * Update circuit breaker state
     */
    private updateCircuitBreaker;
    /**
     * Handle circuit breaker failure
     */
    private handleCircuitBreakerFailure;
    /**
     * Handle circuit breaker success
     */
    private handleCircuitBreakerSuccess;
    /**
     * Open circuit breaker
     */
    private openCircuitBreaker;
    /**
     * Close circuit breaker
     */
    private closeCircuitBreaker;
    /**
     * Check if circuit breaker should transition to HALF_OPEN
     */
    private checkCircuitBreakerTransition;
    /**
     * Close all connections to endpoint
     */
    private closeEndpointConnections;
    /**
     * Check if event type can trigger cascades
     */
    private isCascadeTriggerEvent;
    /**
     * Detect potential cascade failures
     */
    private detectPotentialCascade;
    /**
     * Get recent failures for endpoint
     */
    private getRecentFailures;
    /**
     * Get recent reconnection attempts for endpoint
     */
    private getRecentReconnections;
    /**
     * Record cascade failure
     */
    private recordCascadeFailure;
    /**
     * Calculate cascade severity
     */
    private calculateCascadeSeverity;
    /**
     * Find cascade start time
     */
    private findCascadeStartTime;
    /**
     * Calculate endpoint error rate
     */
    private calculateEndpointErrorRate;
    /**
     * Calculate message rate for connection
     */
    private calculateMessageRate;
    /**
     * Start health monitoring
     */
    private startHealthMonitoring;
    /**
     * Start cascade detection monitoring
     */
    private startCascadeDetection;
    /**
     * Perform health checks
     */
    private performHealthChecks;
    /**
     * Update connection health score
     */
    private updateHealthScore;
    /**
     * Check for connection timeouts
     */
    private checkConnectionTimeout;
    /**
     * Monitor for new cascades
     */
    private monitorForCascades;
    /**
     * Clean up old data
     */
    private cleanupOldData;
    /**
     * Export neural training data
     */
    private exportNeuralTrainingData;
    /**
     * Get connection health summary
     */
    getHealthSummary(): {
        totalConnections: number;
        healthyConnections: number;
        degradedConnections: number;
        failingConnections: number;
        circuitBrokenConnections: number;
        cascadeFailures: number;
        circuitBreakers: {
            [endpoint: string]: CircuitBreakerState;
        };
    };
    /**
     * Remove connection from tracking
     */
    removeConnection(connectionId: string): void;
    /**
     * Cleanup all tracking data
     */
    cleanup(): void;
}
export default ConnectionLifecycleTracker;
//# sourceMappingURL=connection-lifecycle-tracker.d.ts.map