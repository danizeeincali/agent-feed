/**
 * NLD Pattern Detection: SSE Connection Reset Failures
 * Automatically captures failure patterns when SSE connections drop immediately after establishment
 */
interface SSEConnectionResetPattern {
    id: string;
    timestamp: string;
    failureSignature: {
        connectionEstablished: boolean;
        immediateDisconnect: boolean;
        errorCode: string;
        connectionDuration: number;
        repeatCycle: boolean;
    };
    environmentContext: {
        userAgent: string;
        networkConditions: string;
        serverLoad: number;
        concurrentConnections: number;
    };
    analysisMetrics: {
        successRate: number;
        averageConnectionLifetime: number;
        reconnectionAttempts: number;
        tddUsage: boolean;
    };
}
interface AntiPatternSignature {
    pattern: string;
    frequency: number;
    impactLevel: 'low' | 'medium' | 'high' | 'critical';
    rootCause: string;
    preventionStrategy: string;
}
export declare class SSEConnectionResetDetector {
    private patterns;
    private antiPatterns;
    private monitoringActive;
    constructor();
    private initializeKnownAntiPatterns;
    /**
     * Detects SSE connection reset failure patterns from real-time events
     */
    detectFailurePattern(eventData: {
        type: 'connection_established' | 'connection_error' | 'connection_closed';
        instanceId: string;
        connectionId: string;
        timestamp: string;
        errorCode?: string;
        connectionDuration?: number;
        additionalData?: any;
    }): SSEConnectionResetPattern | null;
    /**
     * Analyzes connection logs for reset patterns
     */
    analyzeConnectionLogs(logs: string[]): {
        patternsDetected: string[];
        failureRate: number;
        recommendations: string[];
    };
    private generateRecommendations;
    private isRepeatingPattern;
    private captureEnvironmentContext;
    private calculateSuccessRate;
    private getReconnectionAttempts;
    private detectTDDUsage;
    private updateAntiPatternFrequency;
    /**
     * Generates NLT (Neuro-Learning Testing) record for training
     */
    generateNLTRecord(patternId: string): any;
    private generatePreventionStrategy;
    /**
     * Export patterns for neural network training
     */
    exportForTraining(): {
        patterns: SSEConnectionResetPattern[];
        antiPatterns: AntiPatternSignature[];
        trainingMetrics: any;
    };
    private calculateOverallSuccessRate;
    private calculateTDDUsageRate;
}
export {};
//# sourceMappingURL=sse-connection-reset-patterns.d.ts.map