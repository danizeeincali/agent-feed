/**
 * Claude Process I/O Deployment Demo - NLD System
 *
 * Comprehensive demonstration and validation of the Claude CLI process I/O
 * failure detection and prevention system deployment.
 */
import { ClaudeProcessIOSystemReport } from './claude-process-io-integration-system';
export interface ClaudeProcessIODeploymentResult {
    deploymentId: string;
    timestamp: number;
    success: boolean;
    systemReport: ClaudeProcessIOSystemReport;
    validationResults: {
        patternDetection: boolean;
        realTimeMonitoring: boolean;
        preventionStrategies: boolean;
        neuralTraining: boolean;
    };
    demonstrationResults: {
        printFlagErrorPrevented: boolean;
        interactiveModeRecovered: boolean;
        ptyFallbackExecuted: boolean;
        authActivationSent: boolean;
    };
    performanceMetrics: {
        detectionLatency: number;
        alertResponseTime: number;
        recoverySuccessRate: number;
        falsePositiveRate: number;
    };
    recommendations: string[];
    nextActions: string[];
}
export declare class ClaudeProcessIODeploymentDemo {
    private deploymentId;
    private startTime;
    private testResults;
    constructor();
    deployAndDemonstrate(): Promise<ClaudeProcessIODeploymentResult>;
    private initializeSystem;
    private validateComponents;
    private runDemonstrationScenarios;
    private measurePerformance;
    private generateRecommendations;
    generateDeploymentReport(result: ClaudeProcessIODeploymentResult): Promise<string>;
}
export declare const claudeProcessIODeployment: ClaudeProcessIODeploymentDemo;
//# sourceMappingURL=claude-process-io-deployment-demo.d.ts.map