/**
 * Network Failure Pattern Detector - NLD System
 *
 * Captures and analyzes network error patterns from frontend console logs,
 * failed requests, CORS issues, timeouts, and endpoint mismatches.
 *
 * This system builds a comprehensive database of network failure patterns
 * for neural training and future prevention.
 */
export interface NetworkFailurePattern {
    id: string;
    timestamp: number;
    errorType: 'NETWORK_ERROR' | 'CORS' | 'TIMEOUT' | 'ENDPOINT_MISMATCH' | 'AUTH_FAILURE' | 'SERVER_ERROR';
    severity: 'low' | 'medium' | 'high' | 'critical';
    context: {
        url?: string;
        method?: string;
        statusCode?: number;
        responseTime?: number;
        userAgent?: string;
        referer?: string;
    };
    errorDetails: {
        message: string;
        stack?: string;
        consoleErrors: string[];
        networkLogs: string[];
    };
    patterns: {
        isRecurring: boolean;
        frequency: number;
        relatedErrors: string[];
        preventionStrategies: string[];
    };
    tddImpact: {
        wouldTddPrevent: boolean;
        testingGap: string;
        recommendedTests: string[];
    };
}
export interface NetworkPatternMetrics {
    totalFailures: number;
    failuresByType: Record<string, number>;
    averageResponseTime: number;
    peakFailureHours: number[];
    mostFailedEndpoints: Array<{
        endpoint: string;
        count: number;
    }>;
    corsFailureRate: number;
    timeoutRate: number;
}
export declare class NetworkFailurePatternDetector {
    private patterns;
    private metrics;
    private consoleObserver;
    private networkInterceptor;
    constructor();
    private initializeMonitoring;
    private interceptConsoleErrors;
    private interceptNetworkRequests;
    private interceptWebSocketConnections;
    private interceptPromiseRejections;
    private analyzeConsoleError;
    private captureNetworkFailure;
    private classifyStatusCode;
    private classifyNetworkError;
    private classifyConsoleError;
    private calculateSeverity;
    private checkIfRecurring;
    private calculateFrequency;
    private findRelatedErrors;
    private generatePreventionStrategies;
    private assessTddPrevention;
    private identifyTestingGap;
    private generateTestRecommendations;
    private isNetworkError;
    private getRecentConsoleErrors;
    private getRecentNetworkLogs;
    private updateMetrics;
    private logPattern;
    getPatterns(): NetworkFailurePattern[];
    getMetrics(): NetworkPatternMetrics;
    exportForNeuralTraining(): any;
    getPatternsForTDD(): Array<{
        pattern: NetworkFailurePattern;
        testSuggestions: string[];
        preventionStrategy: string;
    }>;
}
//# sourceMappingURL=network-failure-pattern-detector.d.ts.map