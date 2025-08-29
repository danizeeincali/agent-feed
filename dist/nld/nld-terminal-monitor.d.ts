/**
 * NLD Terminal Monitor
 *
 * Main orchestrator for terminal pipe failure detection
 * Coordinates all NLD components and provides real-time monitoring
 * Integrates with existing backend systems to monitor actual Claude processes
 */
import { EventEmitter } from 'events';
interface NLDReport {
    sessionId: string;
    timestamp: string;
    summary: {
        totalFailures: number;
        criticalFailures: number;
        preventionOpportunities: number;
        neuralPredictionAccuracy: number;
    };
    detectedPatterns: Array<{
        pattern: string;
        confidence: number;
        severity: string;
        prevention: string;
    }>;
    recommendations: {
        immediateActions: string[];
        tddStrategies: string[];
        neuralInsights: string[];
    };
    effectiveness: {
        tddFactor: number;
        preventionSuccess: number;
        patternDetectionAccuracy: number;
    };
}
export declare class NLDTerminalMonitor extends EventEmitter {
    private options;
    private pipeFailureDetector;
    private sseGapDetector;
    private antiPatternsDB;
    private tddStrategies;
    private neuralIntegration;
    private activeSessions;
    private isMonitoring;
    constructor(options?: {
        logDirectory: string;
        reportInterval: number;
        alertThreshold: number;
        enableRealTimeAlerts: boolean;
        enableNeuralPrediction: boolean;
        autoGenerateTests: boolean;
    });
    /**
     * Initialize all NLD components
     */
    private initializeComponents;
    /**
     * Setup event handlers between components
     */
    private setupEventHandlers;
    /**
     * Start monitoring a Claude instance
     */
    startMonitoring(instanceId: string, processInfo: {
        pid: number;
        command: string;
        workingDirectory: string;
    }): string;
    /**
     * Monitor real process output
     */
    monitorProcessOutput(sessionId: string, outputData: {
        instanceId: string;
        stdout?: string;
        stderr?: string;
        pid: number;
        workingDirectory: string;
        command: string;
    }): void;
    /**
     * Monitor frontend display output
     */
    monitorFrontendDisplay(sessionId: string, displayData: {
        instanceId: string;
        output: string;
        workingDirectory?: string;
        responseType: 'mock' | 'real' | 'unknown';
    }): void;
    /**
     * Monitor SSE events
     */
    monitorSSEEvent(sessionId: string, eventData: {
        instanceId: string;
        type: string;
        sent: boolean;
        received?: boolean;
        connectionId: string;
        data: any;
    }): void;
    /**
     * Generate failure prediction for instance
     */
    private generateFailurePrediction;
    /**
     * Handle critical failure
     */
    private handleCriticalFailure;
    /**
     * Handle SSE event flow gaps
     */
    private handleSSEGap;
    /**
     * Generate comprehensive NLD report
     */
    generateReport(sessionId: string): NLDReport;
    /**
     * Helper methods for report generation
     */
    private calculatePreventionOpportunities;
    private summarizeDetectedPatterns;
    private generateImmediateActions;
    private generateTDDRecommendations;
    private generateNeuralInsights;
    private calculatePreventionSuccess;
    /**
     * Save report to file
     */
    private saveReport;
    /**
     * Start periodic reporting
     */
    private startPeriodicReporting;
    /**
     * Stop monitoring a session
     */
    stopMonitoring(sessionId: string): void;
    /**
     * Get current monitoring status
     */
    getStatus(): {
        isMonitoring: boolean;
        activeSessions: number;
        totalFailures: number;
        totalPredictions: number;
        systemHealth: 'healthy' | 'warning' | 'critical';
    };
    /**
     * Export all NLD data for analysis
     */
    exportData(): string;
}
export {};
//# sourceMappingURL=nld-terminal-monitor.d.ts.map