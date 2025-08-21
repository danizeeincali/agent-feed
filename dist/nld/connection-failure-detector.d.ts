/**
 * NLD Connection Failure Pattern Detection System
 * Captures failure patterns and contexts for neural learning
 */
import { EventEmitter } from 'events';
export interface ConnectionFailureContext {
    connectionType: 'websocket' | 'http' | 'sse' | 'polling';
    endpoint: string;
    timestamp: number;
    networkConditions: NetworkConditions;
    clientInfo: ClientInfo;
    errorDetails: ErrorDetails;
    attemptHistory: ConnectionAttempt[];
    recoveryContext?: RecoveryContext;
}
export interface NetworkConditions {
    latency?: number;
    bandwidth?: number;
    connectionType: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'ethernet' | 'unknown';
    isOnline: boolean;
    effectiveType?: string;
}
export interface ClientInfo {
    userAgent: string;
    platform: string;
    isMobile: boolean;
    browserVersion?: string;
    supportedProtocols: string[];
}
export interface ErrorDetails {
    code: string | number;
    message: string;
    type: 'timeout' | 'network' | 'protocol' | 'auth' | 'server' | 'unknown';
    stack?: string;
    serverResponse?: any;
}
export interface ConnectionAttempt {
    attempt: number;
    timestamp: number;
    duration: number;
    success: boolean;
    error?: ErrorDetails;
    strategy: ConnectionStrategy;
}
export interface ConnectionStrategy {
    type: 'immediate' | 'exponential-backoff' | 'linear-backoff' | 'fibonacci' | 'custom';
    baseDelay: number;
    maxDelay: number;
    jitter: boolean;
    maxAttempts: number;
}
export interface RecoveryContext {
    recoveryStrategy: string;
    recoveryDuration: number;
    recoverySuccess: boolean;
    fallbacksUsed: string[];
}
export interface FailurePattern {
    id: string;
    pattern: string;
    frequency: number;
    contexts: ConnectionFailureContext[];
    successfulStrategies: ConnectionStrategy[];
    recommendations: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    lastSeen: number;
    trend: 'increasing' | 'stable' | 'decreasing';
}
export declare class ConnectionFailureDetector extends EventEmitter {
    private patterns;
    private activeConnections;
    private networkMonitor;
    private patternAnalyzer;
    constructor();
    /**
     * Capture connection failure event
     */
    captureFailure(context: ConnectionFailureContext): void;
    /**
     * Capture successful recovery
     */
    captureRecovery(connectionId: string, recoveryContext: RecoveryContext): void;
    /**
     * Get adaptive retry strategy based on learned patterns
     */
    getAdaptiveStrategy(context: Partial<ConnectionFailureContext>): ConnectionStrategy;
    /**
     * Get intelligent troubleshooting suggestions
     */
    getTroubleshootingSuggestions(context: ConnectionFailureContext): string[];
    /**
     * Get connection performance metrics
     */
    getPerformanceMetrics(): ConnectionMetrics;
    private setupNetworkMonitoring;
    private generatePatternKey;
    private generatePatternKeyFromAttempt;
    private generatePatternId;
    private calculateSeverity;
    private calculateTrend;
    private selectBestStrategy;
    private getDefaultStrategy;
    private generateRecommendations;
    private storeForNeuralTraining;
}
export interface ConnectionMetrics {
    totalFailures: number;
    uniquePatterns: number;
    criticalPatterns: number;
    trendsIncreasing: number;
    networkConditions: NetworkConditions;
    lastAnalysis: number;
}
//# sourceMappingURL=connection-failure-detector.d.ts.map