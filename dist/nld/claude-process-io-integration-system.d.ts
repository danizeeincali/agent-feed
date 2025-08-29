/**
 * Claude Process I/O Integration System - NLD Deployment
 *
 * Complete integration system for deploying Claude CLI process I/O failure
 * detection, monitoring, and prevention across the entire application.
 */
import { ClaudeProcessIOMetrics } from './claude-process-io-failure-detector';
import { ClaudeProcessIOAlert } from './claude-process-io-real-time-monitor';
import { ClaudeProcessIOTDDTestCase } from './claude-process-io-tdd-prevention-strategies';
export interface ClaudeProcessIOIntegrationConfig {
    monitoring: {
        enabled: boolean;
        realTimeAlerts: boolean;
        automatedRecovery: boolean;
        neuralTraining: boolean;
    };
    detection: {
        patternCategories: ('PRINT_FLAG_INPUT_REQUIRED' | 'INTERACTIVE_MODE_BLOCKED' | 'PTY_STDIN_DISCONNECT' | 'AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT')[];
        thresholds: {
            printFlagErrors: number;
            interactiveBlockTime: number;
            ptyDisconnectTime: number;
            authSilentTime: number;
        };
    };
    prevention: {
        tddEnabled: boolean;
        preFlightChecks: boolean;
        validationStrategies: string[];
    };
    neuralTraining: {
        enabled: boolean;
        exportInterval: number;
        claudeFlowIntegration: boolean;
        trainingThreshold: number;
    };
}
export interface ClaudeProcessIOSystemReport {
    systemStatus: 'healthy' | 'degraded' | 'critical';
    activeProcesses: number;
    totalAlertsGenerated: number;
    patternsDetected: Record<string, number>;
    neuralTrainingProgress: {
        recordsCollected: number;
        modelsTraining: boolean;
        accuracyScore: number;
    };
    preventionEffectiveness: {
        testsImplemented: number;
        failuresPrevented: number;
        recoverySuccessRate: number;
    };
    recommendations: string[];
    deploymentStatus: {
        detectorDeployed: boolean;
        monitoringActive: boolean;
        tddSuitesGenerated: boolean;
        neuralExportReady: boolean;
    };
}
export declare class ClaudeProcessIOIntegrationSystem {
    private config;
    private isInitialized;
    private systemStartTime;
    private alertHistory;
    private preventionMetrics;
    constructor(config?: Partial<ClaudeProcessIOIntegrationConfig>);
    initialize(): Promise<void>;
    private setupNeuralTrainingExport;
    private exportNeuralTrainingData;
    private handleAlert;
    registerClaudeProcess(instanceId: string, command: string, args: string[], workingDirectory: string, processType?: 'pty' | 'pipe'): void;
    recordProcessOutput(instanceId: string, outputType: 'stdout' | 'stderr', data: string): void;
    recordProcessInput(instanceId: string, input: string): void;
    recordProcessError(instanceId: string, error: Error): void;
    updateProcessState(instanceId: string, state: ClaudeProcessIOMetrics['processState']): void;
    private performPreFlightChecks;
    generateTestSuite(category: ClaudeProcessIOTDDTestCase['category']): string;
    getAllTestSuites(): string[];
    getSystemReport(): ClaudeProcessIOSystemReport;
    getActiveAlerts(instanceId?: string): ClaudeProcessIOAlert[];
    clearAlerts(instanceId: string): void;
    shutdown(): void;
    validateDeployment(): {
        success: boolean;
        issues: string[];
        components: {
            detector: boolean;
            monitor: boolean;
            tddStrategies: boolean;
            neuralTraining: boolean;
        };
    };
}
export declare const claudeProcessIOIntegration: ClaudeProcessIOIntegrationSystem;
//# sourceMappingURL=claude-process-io-integration-system.d.ts.map