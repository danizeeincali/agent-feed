/**
 * Frontend-Backend Communication Pattern Analyzer - NLD System
 *
 * Analyzes communication patterns between frontend and backend,
 * detects anti-patterns, and provides TDD-based prevention strategies.
 */
export interface CommunicationPattern {
    id: string;
    timestamp: number;
    type: 'REQUEST_RESPONSE' | 'WEBSOCKET' | 'SSE' | 'POLLING' | 'BATCH';
    direction: 'FRONTEND_TO_BACKEND' | 'BACKEND_TO_FRONTEND' | 'BIDIRECTIONAL';
    status: 'SUCCESS' | 'FAILURE' | 'TIMEOUT' | 'PARTIAL';
    details: {
        protocol: 'HTTP' | 'WS' | 'SSE';
        url: string;
        method?: string;
        dataSize: number;
        duration: number;
        retryCount: number;
    };
    antiPattern?: {
        type: 'CHATTY_INTERFACE' | 'POLLING_STORM' | 'DATA_OVERFETCH' | 'CONNECTION_LEAK' | 'STATE_DRIFT';
        severity: 'low' | 'medium' | 'high' | 'critical';
        description: string;
        impact: string[];
    };
    performance: {
        latency: number;
        throughput: number;
        errorRate: number;
        resourceUsage: {
            memory: number;
            cpu: number;
            bandwidth: number;
        };
    };
    tddPrevention: {
        integrationTests: string[];
        contractTests: string[];
        performanceTests: string[];
        monitoringChecks: string[];
    };
}
export interface CommunicationHealth {
    overall: 'healthy' | 'degraded' | 'critical';
    metrics: {
        averageLatency: number;
        errorRate: number;
        throughputMbps: number;
        activeConnections: number;
        memoryUsageMB: number;
    };
    antiPatterns: {
        detected: number;
        critical: number;
        trending: string[];
    };
    recommendations: Array<{
        priority: 'low' | 'medium' | 'high' | 'critical';
        category: string;
        description: string;
        action: string;
        tddApproach: string;
    }>;
}
export declare class FrontendBackendCommunicationAnalyzer {
    private patterns;
    private activeConnections;
    private performanceBuffer;
    private pollingTracker;
    private memoryTracker;
    constructor();
    private initializeCommunicationMonitoring;
    private interceptHTTPCommunication;
    private interceptWebSocketCommunication;
    private interceptSSECommunication;
    private initializeResourceMonitoring;
    private initializePerformanceTracking;
    private initializeAntiPatternDetection;
    private trackRequestStart;
    private trackPollingPattern;
    private analyzeCommunicationPattern;
    private trackWebSocketConnection;
    private trackWebSocketMessage;
    private trackSSEConnection;
    private trackSSEMessage;
    private detectAntiPattern;
    private isChattyInterface;
    private isPollingStorm;
    private isDataOverfetching;
    private detectPollingAntiPatterns;
    private detectConnectionLeaks;
    private detectDataOverfetching;
    private recordAntiPattern;
    private analyzeResourcePerformance;
    private analyzeConnectionHealth;
    private updateMemoryUsage;
    private getCurrentMemoryUsage;
    private updatePerformanceBuffer;
    private cleanupPollingTracker;
    private generateRequestId;
    private estimateResponseSize;
    private estimateDataSize;
    private generateIntegrationTests;
    private generateContractTests;
    private generatePerformanceTests;
    private generateMonitoringChecks;
    private logCommunicationPattern;
    getPatterns(): CommunicationPattern[];
    getCommunicationHealth(): CommunicationHealth;
    private assessOverallHealth;
    private getTrendingAntiPatterns;
    private generateHealthRecommendations;
    private getAntiPatternAction;
    private getAntiPatternTDDApproach;
    exportForNeuralTraining(): any;
    getAntiPatternSummary(): any;
    private groupBy;
    private getMostProblematicEndpoints;
}
//# sourceMappingURL=frontend-backend-communication-analyzer.d.ts.map