/**
 * Real-Time Network Monitoring System - NLD Integration
 *
 * Provides live monitoring of network failures with SSE integration
 * for immediate pattern detection and alert generation.
 */
import { NetworkFailurePattern } from './network-failure-pattern-detector';
export interface NetworkMonitorConfig {
    sseEndpoint?: string;
    alertThresholds: {
        errorRate: number;
        responseTime: number;
        failureSpike: number;
    };
    monitoring: {
        enableConsoleCapture: boolean;
        enableNetworkInterception: boolean;
        enablePerformanceTracking: boolean;
    };
    reporting: {
        realTimeAlerts: boolean;
        batchReporting: boolean;
        batchInterval: number;
    };
}
export interface NetworkAlert {
    id: string;
    timestamp: number;
    type: 'SPIKE' | 'THRESHOLD' | 'PATTERN' | 'CRITICAL';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    patterns: NetworkFailurePattern[];
    metrics: {
        errorRate: number;
        responseTime: number;
        affectedEndpoints: string[];
    };
    recommendations: string[];
}
export declare class NetworkRealTimeMonitor {
    private detector;
    private config;
    private eventSource;
    private alertHistory;
    private monitoringActive;
    private performanceBuffer;
    private batchReportTimer;
    constructor(config?: Partial<NetworkMonitorConfig>);
    private initializeMonitoring;
    private setupConsoleMonitoring;
    private setupNetworkMonitoring;
    private setupPerformanceMonitoring;
    private setupSSEConnection;
    private setupBatchReporting;
    private analyzeConsoleOutput;
    private analyzeGlobalError;
    private analyzeUnhandledRejection;
    private recordNetworkMetrics;
    private triggerNetworkFailureAlert;
    private checkErrorRate;
    private generateAlert;
    private calculateCurrentErrorRate;
    private calculateAverageResponseTime;
    private getAffectedEndpoints;
    private generateRecommendations;
    private isNetworkRelatedError;
    private calculateSeverityFromStatus;
    private generateRequestId;
    private analyzeNavigationTiming;
    private analyzeResourceTiming;
    private processSSEMessage;
    private logAlert;
    private broadcastAlert;
    private generateBatchReport;
    private generateSummary;
    private exportBatchForTraining;
    getRecentAlerts(limit?: number): NetworkAlert[];
    getMetrics(): any;
    exportForNeuralTraining(): any;
    stop(): void;
}
//# sourceMappingURL=network-real-time-monitor.d.ts.map