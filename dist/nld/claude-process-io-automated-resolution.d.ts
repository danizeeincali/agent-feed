/**
 * Claude Process I/O Automated Resolution System - NLD
 *
 * Provides automated resolution suggestions and execution for Claude CLI
 * process I/O failures with intelligent decision-making and recovery.
 */
import { ClaudeProcessIOErrorPattern } from './claude-process-io-failure-detector';
import { ClaudeProcessIOAlert } from './claude-process-io-real-time-monitor';
export interface ResolutionStrategy {
    strategyId: string;
    category: ClaudeProcessIOErrorPattern['category'];
    name: string;
    description: string;
    automatable: boolean;
    successProbability: number;
    executionSteps: ResolutionStep[];
    prerequisites: string[];
    risks: string[];
    fallbackStrategies: string[];
}
export interface ResolutionStep {
    stepId: string;
    description: string;
    action: 'restart_process' | 'modify_args' | 'check_environment' | 'send_input' | 'validate_cli' | 'update_permissions';
    parameters: Record<string, any>;
    timeout: number;
    retryCount: number;
    successCriteria: string[];
    failureCriteria: string[];
}
export interface ResolutionExecution {
    executionId: string;
    alert: ClaudeProcessIOAlert;
    strategy: ResolutionStrategy;
    startTime: number;
    endTime?: number;
    status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
    stepsExecuted: {
        step: ResolutionStep;
        status: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';
        startTime: number;
        endTime?: number;
        result?: any;
        error?: string;
    }[];
    finalResult: {
        success: boolean;
        message: string;
        newProcessState?: string;
        recoveryActions: string[];
    } | null;
}
export declare class ClaudeProcessIOAutomatedResolution {
    private resolutionStrategies;
    private activeExecutions;
    private executionHistory;
    constructor();
    private initializeResolutionStrategies;
    private setupPrintFlagStrategies;
    private setupInteractiveModeStrategies;
    private setupPTYDisconnectStrategies;
    private setupAuthSilentStrategies;
    getResolutionStrategies(category: ClaudeProcessIOErrorPattern['category']): ResolutionStrategy[];
    selectBestStrategy(alert: ClaudeProcessIOAlert): ResolutionStrategy | null;
    executeResolution(alert: ClaudeProcessIOAlert): Promise<ResolutionExecution>;
    private executeStep;
    getExecutionHistory(category?: ClaudeProcessIOErrorPattern['category']): ResolutionExecution[];
    getActiveExecutions(): ResolutionExecution[];
    generateResolutionReport(): {
        totalExecutions: number;
        successRate: number;
        executionsByCategory: Record<string, number>;
        averageExecutionTime: number;
        mostSuccessfulStrategies: {
            strategy: string;
            successRate: number;
            executions: number;
        }[];
        recommendations: string[];
    };
}
export declare const claudeProcessIOResolution: ClaudeProcessIOAutomatedResolution;
//# sourceMappingURL=claude-process-io-automated-resolution.d.ts.map