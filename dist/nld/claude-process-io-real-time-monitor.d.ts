/**
 * Claude Process I/O Real-Time Monitor - NLD System
 *
 * Provides real-time monitoring and alerting for Claude CLI process I/O failures
 * with automated detection, prevention, and recovery mechanisms.
 */
import { claudeProcessIODetector, ClaudeProcessIOMetrics, ClaudeProcessIOErrorPattern } from './claude-process-io-failure-detector';
export interface ClaudeProcessIOAlert {
    alertId: string;
    timestamp: number;
    severity: 'critical' | 'high' | 'medium' | 'low';
    instanceId: string;
    pattern: ClaudeProcessIOErrorPattern;
    metrics: ClaudeProcessIOMetrics;
    automatedActions: string[];
    humanActions: string[];
    resolution?: {
        strategy: string;
        implemented: boolean;
        successful: boolean;
        timestamp: number;
    };
}
export interface ClaudeProcessIOMonitorConfig {
    alertThresholds: {
        printFlagErrors: number;
        interactiveBlockTime: number;
        ptyDisconnectTime: number;
        authSilentTime: number;
    };
    automatedRecovery: boolean;
    neuralTraining: boolean;
    detectionInterval: number;
    maxAlertsPerInstance: number;
}
export declare class ClaudeProcessIORealTimeMonitor {
    private config;
    private activeAlerts;
    private alertCallbacks;
    private monitoringInterval?;
    private isMonitoring;
    constructor(config?: Partial<ClaudeProcessIOMonitorConfig>);
    private setupPatternDetectionCallbacks;
    startMonitoring(): void;
    stopMonitoring(): void;
    private performPeriodicChecks;
    private checkProcessHealth;
    private createHealthAlert;
    private handlePatternDetection;
    private generateAutomatedActions;
    private generateHumanActions;
    private executeAutomatedRecovery;
    private getPatternSeverity;
    private getResolutionSuggestions;
    private getPreventionStrategy;
    onAlert(callback: (alert: ClaudeProcessIOAlert) => void): void;
    getActiveAlerts(instanceId?: string): ClaudeProcessIOAlert[];
    clearAlerts(instanceId: string): void;
    getMonitoringStatus(): {
        isMonitoring: boolean;
        activeProcesses: number;
        totalAlerts: number;
        alertsByCategory: Record<string, number>;
        config: ClaudeProcessIOMonitorConfig;
    };
    generateSystemReport(): {
        monitoringStatus: ReturnType<ClaudeProcessIORealTimeMonitor['getMonitoringStatus']>;
        detectorReport: ReturnType<typeof claudeProcessIODetector.generateSystemReport>;
        neuralDatasetStats: {
            recordCount: number;
            patternStats: Record<string, {
                count: number;
                accuracy: number;
            }>;
        };
        recommendations: string[];
    };
}
export declare const claudeProcessIOMonitor: ClaudeProcessIORealTimeMonitor;
//# sourceMappingURL=claude-process-io-real-time-monitor.d.ts.map