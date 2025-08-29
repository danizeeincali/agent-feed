/**
 * CORS and Timeout Pattern Detector - NLD System
 *
 * Specialized detector for CORS issues and timeout patterns
 * with advanced pattern recognition and TDD prevention strategies.
 */
export interface CORSPattern {
    id: string;
    timestamp: number;
    type: 'PREFLIGHT_FAILED' | 'SIMPLE_REQUEST_BLOCKED' | 'CREDENTIALS_ISSUE' | 'METHOD_NOT_ALLOWED' | 'HEADER_BLOCKED';
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: {
        origin: string;
        destination: string;
        method: string;
        headers: string[];
        credentials: boolean;
        blockedReason: string;
    };
    browserInfo: {
        userAgent: string;
        version: string;
        corsSupport: boolean;
    };
    tddPrevention: {
        testCases: string[];
        mockStrategies: string[];
        configFixes: string[];
    };
}
export interface TimeoutPattern {
    id: string;
    timestamp: number;
    type: 'REQUEST_TIMEOUT' | 'CONNECTION_TIMEOUT' | 'READ_TIMEOUT' | 'WRITE_TIMEOUT' | 'CUSTOM_TIMEOUT';
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: {
        url: string;
        method: string;
        timeoutValue: number;
        actualDuration: number;
        stage: 'connection' | 'request' | 'response' | 'custom';
        retryAttempts: number;
    };
    networkConditions: {
        connectionSpeed: 'fast' | 'slow' | 'unknown';
        latency: number;
        packetLoss: boolean;
    };
    tddPrevention: {
        testCases: string[];
        retryStrategies: string[];
        fallbackApproaches: string[];
    };
}
export declare class NetworkCORSTimeoutDetector {
    private corsPatterns;
    private timeoutPatterns;
    private connectionMetrics;
    private preflight;
    Cache: Map<string, any>;
    constructor();
    private initializeCORSDetection;
    private initializeTimeoutDetection;
    private setupNetworkConditionMonitoring;
    private analyzePotentialCORSIssue;
    private captureCORSPattern;
    private captureTimeoutPattern;
    private isCORSError;
    private isTimeoutError;
    private classifyCORSError;
    private classifyTimeoutError;
    private calculateCORSSeverity;
    private calculateTimeoutSeverity;
    private hasCustomHeaders;
    private requiresPreflight;
    private trackPreflightRequest;
    private isPreflightCached;
    private updatePreflightCache;
    private setupTimeoutDetection;
    private extractTimeoutValue;
    private extractHeaders;
    private getBrowserVersion;
    private checkCORSSupport;
    private determineTimeoutStage;
    private getRetryAttempts;
    private assessConnectionSpeed;
    private detectPacketLoss;
    private generateCORSTestCases;
    private generateCORSMockStrategies;
    private generateCORSConfigFixes;
    private generateTimeoutTestCases;
    private generateRetryStrategies;
    private generateTimeoutFallbacks;
    private logCORSPattern;
    private logTimeoutPattern;
    getCORSPatterns(): CORSPattern[];
    getTimeoutPatterns(): TimeoutPattern[];
    getCORSMetrics(): any;
    getTimeoutMetrics(): any;
    private groupBy;
    private getMostProblematicOrigins;
    private calculatePreventionCoverage;
    private calculateAverageDuration;
    private getSlowestEndpoints;
    private calculateTimeoutPreventionCoverage;
    exportForNeuralTraining(): any;
}
//# sourceMappingURL=network-cors-timeout-detector.d.ts.map