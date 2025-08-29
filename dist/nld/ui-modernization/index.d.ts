/**
 * NLD UI Modernization Regression Prevention System
 * Main integration file that coordinates all UI regression monitoring components
 */
import { uiRegressionMonitor } from './ui-regression-monitor';
import { claudeFunctionalityValidator } from './claude-functionality-validator';
import { sseStreamingGuardian } from './sse-streaming-guardian';
import { componentStateTracker } from './component-state-tracker';
import { uiPerformanceMonitor } from './ui-performance-monitor';
import { regressionTestIntegration } from './regression-test-integration';
import { neuralPatternTrainer } from './neural-pattern-trainer';
import { automatedRecoverySystem } from './automated-recovery-system';
export interface NLDSystemStatus {
    isActive: boolean;
    componentsStatus: {
        uiRegressionMonitor: boolean;
        claudeFunctionalityValidator: boolean;
        sseStreamingGuardian: boolean;
        componentStateTracker: boolean;
        uiPerformanceMonitor: boolean;
        regressionTestIntegration: boolean;
        neuralPatternTrainer: boolean;
        automatedRecoverySystem: boolean;
    };
    lastHealthCheck: number;
    overallHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'OFFLINE';
}
export interface NLDUIModernizationReport {
    systemStatus: NLDSystemStatus;
    regressionSummary: {
        totalRegressions: number;
        criticalRegressions: number;
        recoveredRegressions: number;
        activeIssues: number;
    };
    functionalityHealth: {
        processSpawning: boolean;
        buttonHandlers: boolean;
        instanceCreation: boolean;
        terminalConnection: boolean;
        sseStreaming: boolean;
    };
    performanceMetrics: {
        renderTime: number;
        memoryUsage: number;
        fps: number;
        interactionDelay: number;
    };
    recoveryStats: {
        totalAttempts: number;
        successRate: number;
        avgRecoveryTime: number;
    };
    recommendations: string[];
}
export declare class NLDUIModernizationSystem {
    private isInitialized;
    private healthCheckInterval;
    private lastHealthCheck;
    constructor();
    initialize(): Promise<boolean>;
    private setupHealthMonitoring;
    private setupCrossComponentIntegration;
    private performHealthCheck;
    getSystemStatus(): NLDSystemStatus;
    private isComponentHealthy;
    generateComprehensiveReport(): NLDUIModernizationReport;
    private generateSystemRecommendations;
    predictUIChangeRisk(plannedChanges: {
        domChanges: number;
        cssChanges: number;
        componentUpdates: number;
        styleModifications: number;
    }): Promise<any>;
    generateExecutiveSummary(): string;
    destroy(): void;
}
export declare const nldUIModernizationSystem: NLDUIModernizationSystem;
export { uiRegressionMonitor, claudeFunctionalityValidator, sseStreamingGuardian, componentStateTracker, uiPerformanceMonitor, regressionTestIntegration, neuralPatternTrainer, automatedRecoverySystem };
//# sourceMappingURL=index.d.ts.map